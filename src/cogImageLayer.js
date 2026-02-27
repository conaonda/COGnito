import ImageLayer from 'ol/layer/Image'
import ImageCanvasSource from 'ol/source/ImageCanvas'
import { transformExtent } from 'ol/proj'
import { intersects, getIntersection } from 'ol/extent'
import { fromUrl as tiffFromUrl, Pool } from 'geotiff'
import { detectBands, getMinMaxFromOverview } from './cogLayer.js'
import { COLORMAPS } from './colormap.js'

const GEOTIFF_BLOCK_SIZE = 524288
const GEOTIFF_CACHE_SIZE = 500

let pool
try { pool = new Pool(4) } catch { /* worker unavailable – decode on main thread */ }

function fillPixelData(px, rasters, bandInfo, stats, pixelCount, colormapName) {
  if (bandInfo.type === 'rgb') {
    const r = rasters[0], g = rasters[1], b = rasters[2]
    const rMin = stats[0].min, rScale = 255 / (stats[0].max - stats[0].min)
    const gMin = stats[1].min, gScale = 255 / (stats[1].max - stats[1].min)
    const bMin = stats[2].min, bScale = 255 / (stats[2].max - stats[2].min)
    for (let i = 0; i < pixelCount; i++) {
      const j = i * 4
      if (r[i] === 0 && g[i] === 0 && b[i] === 0) {
        px[j + 3] = 0
      } else {
        px[j]     = ((r[i] - rMin) * rScale + 0.5) | 0
        px[j + 1] = ((g[i] - gMin) * gScale + 0.5) | 0
        px[j + 2] = ((b[i] - bMin) * bScale + 0.5) | 0
        px[j + 3] = 255
      }
    }
  } else {
    const band = rasters[0]
    const bMin = stats[0].min, bScale = 255 / (stats[0].max - stats[0].min)
    const lut = colormapName ? COLORMAPS[colormapName] : null
    for (let i = 0; i < pixelCount; i++) {
      const j = i * 4
      if (band[i] === 0) {
        px[j + 3] = 0
      } else {
        const v = ((band[i] - bMin) * bScale + 0.5) | 0
        if (lut) {
          const idx = Math.min(255, Math.max(0, v))
          px[j] = lut[idx][0]; px[j + 1] = lut[idx][1]; px[j + 2] = lut[idx][2]; px[j + 3] = 255
        } else {
          px[j] = v; px[j + 1] = v; px[j + 2] = v; px[j + 3] = 255
        }
      }
    }
  }
}

export async function createCOGImageLayer({ url, projectionMode = 'reproject', viewProjection, opacity = 1, resolutionMultiplier = 1 }) {
  const tiff = await tiffFromUrl(url, { blockSize: GEOTIFF_BLOCK_SIZE, cacheSize: GEOTIFF_CACHE_SIZE })

  const [bandInfo, image] = await Promise.all([
    detectBands(tiff),
    tiff.getImage(0)
  ])

  const overview = await getMinMaxFromOverview(tiff, bandInfo.bands)
  const stats = overview.stats
  const samples = bandInfo.bands.map(b => b - 1)
  let currentColormap = null

  // COG native CRS
  const geoKeys = image.getGeoKeys()
  const epsgCode = geoKeys.ProjectedCSTypeGeoKey || geoKeys.GeographicTypeGeoKey || 4326
  const cogCRS = `EPSG:${epsgCode}`

  // COG native extent
  const bbox = image.getBoundingBox()
  const cogExtent = [bbox[0], bbox[1], bbox[2], bbox[3]]
  const viewExtent = transformExtent(cogExtent, cogCRS, viewProjection)

  const affineViewToCog = (ext) => {
    const sx = (cogExtent[2] - cogExtent[0]) / (viewExtent[2] - viewExtent[0])
    const sy = (cogExtent[3] - cogExtent[1]) / (viewExtent[3] - viewExtent[1])
    return [
      cogExtent[0] + (ext[0] - viewExtent[0]) * sx,
      cogExtent[1] + (ext[1] - viewExtent[1]) * sy,
      cogExtent[0] + (ext[2] - viewExtent[0]) * sx,
      cogExtent[1] + (ext[3] - viewExtent[1]) * sy
    ]
  }

  // Cache & async state
  let cachedCanvas = null
  let cachedExtent = null
  let cachedKey = null
  let debounceTimer = null
  let abortCtrl = null

  // Render overview as low-res preview so the first frame is not blank
  const pvW = overview.width, pvH = overview.height
  const previewCanvas = document.createElement('canvas')
  previewCanvas.width = pvW
  previewCanvas.height = pvH
  const previewCtx = previewCanvas.getContext('2d')
  const previewImgData = previewCtx.createImageData(pvW, pvH)
  fillPixelData(previewImgData.data, overview.rasters, bandInfo, stats, pvW * pvH, currentColormap)
  previewCtx.putImageData(previewImgData, 0, 0)
  cachedCanvas = previewCanvas
  cachedExtent = viewExtent.slice()

  const extentKey = (ext, w, h) => `${ext.map(v => v.toFixed(1)).join(',')}_${w}x${h}`

  const loadAndRender = async (extent, size, canvas) => {
    // Abort previous in-flight request
    if (abortCtrl) abortCtrl.abort()
    abortCtrl = new AbortController()
    const { signal } = abortCtrl

    try {
      const reqExtent = projectionMode === 'affine'
        ? affineViewToCog(extent)
        : transformExtent(extent, viewProjection, cogCRS)

      // Clip to COG bounds
      if (!intersects(reqExtent, cogExtent)) return
      const clipped = getIntersection(reqExtent, cogExtent)

      // Compute pixel dimensions proportional to clipped area
      const fullW = reqExtent[2] - reqExtent[0]
      const fullH = reqExtent[3] - reqExtent[1]
      const clipW = clipped[2] - clipped[0]
      const clipH = clipped[3] - clipped[1]
      const resX = (fullW / size[0]) * resolutionMultiplier
      const resY = (fullH / size[1]) * resolutionMultiplier

      const readParams = {
        bbox: [clipped[0], clipped[1], clipped[2], clipped[3]],
        resX, resY,
        samples
      }
      const rasters = await tiff.readRasters({ ...readParams, signal, pool })

      if (signal.aborted) return

      const natW = rasters.width
      const natH = rasters.height
      if (natW === 0 || natH === 0) return

      // Render to native-resolution temp canvas
      const tmpCanvas = document.createElement('canvas')
      tmpCanvas.width = natW
      tmpCanvas.height = natH
      const tmpCtx = tmpCanvas.getContext('2d')
      const imgData = tmpCtx.createImageData(natW, natH)
      fillPixelData(imgData.data, rasters, bandInfo, stats, natW * natH, currentColormap)
      tmpCtx.putImageData(imgData, 0, 0)

      // GPU-accelerated scaling to viewport
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const drawW = Math.round(size[0] * (clipW / fullW))
      const drawH = Math.round(size[1] * (clipH / fullH))
      const offsetX = Math.round(size[0] * ((clipped[0] - reqExtent[0]) / fullW))
      const offsetY = Math.round(size[1] * ((reqExtent[3] - clipped[3]) / fullH))
      ctx.drawImage(tmpCanvas, 0, 0, natW, natH, offsetX, offsetY, drawW, drawH)

      // Update cache and trigger re-render
      cachedKey = extentKey(extent, size[0], size[1])
      cachedExtent = extent.slice()
      cachedCanvas = canvas
      source.changed()
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('COG image load error:', err)
    }
  }

  const source = new ImageCanvasSource({
    canvasFunction(extent, resolution, pixelRatio, size, projection) {
      const key = extentKey(extent, size[0], size[1])
      if (cachedKey === key && cachedCanvas) {
        return cachedCanvas
      }

      // Create new canvas, draw cached image at correct position/scale
      const canvas = document.createElement('canvas')
      canvas.width = size[0]
      canvas.height = size[1]

      if (cachedCanvas && cachedExtent) {
        const ctx = canvas.getContext('2d')
        const newW = extent[2] - extent[0]
        const newH = extent[3] - extent[1]
        const dx = (cachedExtent[0] - extent[0]) / newW * size[0]
        const dy = (extent[3] - cachedExtent[3]) / newH * size[1]
        const dw = (cachedExtent[2] - cachedExtent[0]) / newW * size[0]
        const dh = (cachedExtent[3] - cachedExtent[1]) / newH * size[1]
        ctx.drawImage(cachedCanvas, dx, dy, dw, dh)
      }

      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => loadAndRender(extent, size, canvas), 200)

      return canvas
    },
    ratio: 1
  })

  const layer = new ImageLayer({
    source,
    extent: viewExtent,
    opacity
  })

  return {
    layer, source, extent: viewExtent, tiff,
    center: [(viewExtent[0] + viewExtent[2]) / 2, (viewExtent[1] + viewExtent[3]) / 2],
    getStats() { return stats },
    getBandInfo() { return bandInfo },
    setStats(newStats) {
      stats.length = 0
      newStats.forEach(s => stats.push(s))
      cachedKey = null
      source.changed()
    },
    setColormap(name) {
      currentColormap = name || null
      cachedKey = null
      source.changed()
    }
  }
}
