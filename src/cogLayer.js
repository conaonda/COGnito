import WebGLTileLayer from 'ol/layer/WebGLTile'
import GeoTIFFSource from 'ol/source/GeoTIFF'
import TileGrid from 'ol/tilegrid/TileGrid.js'
import { transformExtent, transform, get as getProjection } from 'ol/proj'
import { create as createTransform, set as setTransform, setFromArray, invert as invertTransform, apply as applyTransformPt } from 'ol/transform.js'
import { createOrUpdate as createOrUpdateTileRange } from 'ol/TileRange.js'
import { fromUrl as tiffFromUrl } from 'geotiff'
import { patchRendererWithAffine } from './AffineTileLayer.js'

const GEOTIFF_BLOCK_SIZE = 524288
const GEOTIFF_CACHE_SIZE = 500

/**
 * 회전된 GeoTIFF의 4 꼭짓점을 변환하여 정확한 AABB를 소스 CRS에서 계산.
 * ModelTransformation에 비대각선 항(회전)이 없으면 null 반환.
 */
async function computeRotatedSourceExtent(tiff) {
  const image = await tiff.getImage(0)
  const mt = image.fileDirectory.getValue('ModelTransformation')

  if (!mt || (mt[1] === 0 && mt[4] === 0)) return null

  const w = image.getWidth()
  const h = image.getHeight()

  const corners = [[0, 0], [w, 0], [w, h], [0, h]]
  const transformed = corners.map(([px, py]) => [
    mt[0] * px + mt[1] * py + mt[3],
    mt[4] * px + mt[5] * py + mt[7]
  ])

  const xs = transformed.map(p => p[0])
  const ys = transformed.map(p => p[1])

  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

async function computePixelToViewAffine(tiff, cogProjection, viewProjection) {
  const image = await tiff.getImage(0)
  const mt = image.fileDirectory.getValue('ModelTransformation')

  if (!mt || (mt[1] === 0 && mt[4] === 0)) return null

  // Approximate pixel→view CRS as affine via 3 sample points
  const srcCode = typeof cogProjection === 'string' ? cogProjection : cogProjection.getCode()
  const w = image.getWidth()
  const h = image.getHeight()

  // Sample 3 corner pixels → source CRS → view CRS
  const pixels = [[0, 0], [w, 0], [0, h]]
  const viewPts = pixels.map(([px, py]) => {
    const sx = mt[0] * px + mt[1] * py + mt[3]
    const sy = mt[4] * px + mt[5] * py + mt[7]
    return transform([sx, sy], srcCode, viewProjection)
  })

  // Solve pixel→view affine from 3 points at (0,0), (w,0), (0,h)
  const [vx0, vy0] = viewPts[0]
  const [vx1, vy1] = viewPts[1]
  const [vx2, vy2] = viewPts[2]

  const pixelToView = createTransform()
  setTransform(pixelToView,
    (vx1 - vx0) / w, (vy1 - vy0) / w,
    (vx2 - vx0) / h, (vy2 - vy0) / h,
    vx0, vy0
  )

  return pixelToView
}

const applyAffineBypass = (cogSource, cogView, viewProjection, targetTileSize) => {
  const srcExtent = cogView.extent
  const srcProj = cogView.projection
  const srcTileGrid = cogSource.tileGrid

  const dstExtent = transformExtent(srcExtent, srcProj, viewProjection)

  const scaleX = (dstExtent[2] - dstExtent[0]) / (srcExtent[2] - srcExtent[0])
  const srcResolutions = srcTileGrid.getResolutions()
  let dstResolutions = srcResolutions.map(r => r * scaleX)

  const tileSizes = srcResolutions.map((_, z) => {
    const src = srcTileGrid.getTileSize(z)
    const srcW = Array.isArray(src) ? src[0] : src
    const srcH = Array.isArray(src) ? src[1] : src
    const factor = Math.max(1, Math.round(targetTileSize / srcW))
    // OL GeoTIFF 소스의 타일 그리드가 비정수 타일 사이즈를 반환할 수 있음.
    // 비정수 사이즈는 TileTexture의 bandCount 계산(Math.floor)에서 밴드 수가
    // 줄어들어 알파 채널이 누락되고 타일이 투명하게 렌더링됨. 반드시 정수로 반올림.
    return [Math.round(srcW * factor), Math.round(srcH * factor)]
  })

  // 뷰 해상도가 타일 그리드 최저 해상도를 초과해도 렌더링되도록
  // 더 거친 해상도 레벨을 추가
  const MAX_SOURCE_TILE_DIM = 2048
  const MIN_SCREEN_PX = 100
  const extW = dstExtent[2] - dstExtent[0]
  const extH = dstExtent[3] - dstExtent[1]
  const maxViewRes = Math.min(extW, extH) / MIN_SCREEN_PX

  let renderTileSizes
  let sourceTileSizes
  let extraCount = 0

  // extra 레벨 source tile 크기를 coarsest overview 크기로 제한
  const imagery = cogSource.sourceImagery_[0]
  const coarsestImage = imagery[0]
  const coarsestW = coarsestImage.getWidth()
  const coarsestH = coarsestImage.getHeight()

  if (dstResolutions[0] < maxViewRes) {
    const baseTile = tileSizes[0]
    const extraResolutions = []
    const extraRenderTileSizes = []
    const extraSourceTileSizes = []

    let r = dstResolutions[0] * 2
    let factor = 2
    while (true) {
      extraResolutions.push(r)
      // coarsest overview 크기를 초과하지 않도록 제한하여
      // out-of-bounds 읽기로 인한 영상 왜곡 방지
      const uncappedW = baseTile[0] * factor
      const uncappedH = baseTile[1] * factor
      const cappedW = Math.min(uncappedW, MAX_SOURCE_TILE_DIM, coarsestW)
      const cappedH = Math.min(uncappedH, MAX_SOURCE_TILE_DIM, coarsestH)
      extraSourceTileSizes.push([cappedW, cappedH])

      const isCapped = cappedW < uncappedW || cappedH < uncappedH
      if (!isCapped) {
        extraRenderTileSizes.push([baseTile[0], baseTile[1]])
      } else {
        // cap된 레벨: 1개 타일이 정확히 extent를 덮도록 renderTileSize 역산.
        // 해상도 r은 scaleX 기반이므로, extW/r과 extH/r을 직접 사용해야
        // X/Y 스케일 차이(UTM→3857 등)로 인한 왜곡을 방지할 수 있음.
        const renderW = Math.max(1, Math.ceil(extW / r))
        const renderH = Math.max(1, Math.ceil(extH / r))
        extraRenderTileSizes.push([renderW, renderH])
      }
      if (r >= maxViewRes) break
      r *= 2
      factor *= 2
    }
    extraCount = extraResolutions.length

    // coarsest가 index 0이 되도록 역순 정렬
    extraResolutions.reverse()
    extraRenderTileSizes.reverse()
    extraSourceTileSizes.reverse()

    dstResolutions = [...extraResolutions, ...dstResolutions]
    renderTileSizes = [...extraRenderTileSizes, ...tileSizes]
    sourceTileSizes = [...extraSourceTileSizes, ...tileSizes]
  } else {
    renderTileSizes = tileSizes
    sourceTileSizes = tileSizes
  }

  const dstTileGrid = new TileGrid({
    extent: dstExtent,
    minZoom: srcTileGrid.getMinZoom(),
    resolutions: dstResolutions,
    tileSizes: renderTileSizes
  })

  cogSource.projection = getProjection(viewProjection)
  cogSource.tileGrid = dstTileGrid
  cogSource.tileGridForProjection_ = {}
  cogSource.transformMatrix = null
  cogSource.setTileSizes(sourceTileSizes)

  // 추가 레벨에 대응하는 sourceImagery_ / sourceMasks_ 패딩
  if (extraCount > 0) {
    for (let i = 0; i < extraCount; i++) {
      imagery.unshift(coarsestImage)
    }
    const masks = cogSource.sourceMasks_[0]
    const coarsestMask = masks[0]
    for (let i = 0; i < extraCount; i++) {
      masks.unshift(coarsestMask)
    }
  }

  const allImagery = cogSource.sourceImagery_[0]
  const mainImg = allImagery[allImagery.length - 1]
  const mainW = mainImg.getWidth()
  const mainH = mainImg.getHeight()
  const overviewScales = allImagery.map(img => [
    mainW / img.getWidth(),
    mainH / img.getHeight()
  ])

  return { sourceTileSizes, overviewScales }
}

export const getMinMaxFromOverview = async (tiff, bands) => {
  const count = await tiff.getImageCount()
  const image = await tiff.getImage(count - 1)
  const rasters = await image.readRasters({ samples: bands.map(b => b - 1) })

  const stats = []
  for (const band of rasters) {
    let min = Infinity, max = -Infinity
    for (let i = 0; i < band.length; i++) {
      const v = band[i]
      if (v === 0) continue
      if (v < min) min = v
      if (v > max) max = v
    }
    if (!isFinite(min) || !isFinite(max)) {
      min = 0
      max = 1
    }
    stats.push({ min, max })
  }
  return { stats, rasters, width: image.getWidth(), height: image.getHeight() }
}

export const getTotalBands = async (tiff) => {
  const image = await tiff.getImage(0)
  const extraSamples = image.fileDirectory.ExtraSamples
  const alphaCount = extraSamples
    ? extraSamples.filter(v => v === 1 || v === 2).length
    : 0
  return image.getSamplesPerPixel() - alphaCount
}

export const detectBands = async (tiff) => {
  const image = await tiff.getImage(0)
  const samplesPerPixel = image.getSamplesPerPixel()
  const photometric = image.fileDirectory.PhotometricInterpretation
  const extraSamples = image.fileDirectory.ExtraSamples

  const alphaCount = extraSamples
    ? extraSamples.filter(v => v === 1 || v === 2).length
    : 0
  const dataBands = samplesPerPixel - alphaCount

  if (photometric === 2 && dataBands >= 3) {
    return { type: 'rgb', bands: [1, 2, 3] }
  }
  if (dataBands >= 3) {
    return { type: 'rgb', bands: [1, 2, 3] }
  }
  return { type: 'gray', bands: [1] }
}

export const buildStyle = (bandInfo, stats) => {
  if (bandInfo.type === 'rgb') {
    return {
      color: [
        'array',
        ['/', ['-', ['band', 1], stats[0].min], stats[0].max - stats[0].min],
        ['/', ['-', ['band', 2], stats[1].min], stats[1].max - stats[1].min],
        ['/', ['-', ['band', 3], stats[2].min], stats[2].max - stats[2].min],
        ['/', ['band', 4], 255]
      ]
    }
  }
  const norm = ['/', ['-', ['band', 1], stats[0].min], stats[0].max - stats[0].min]
  return {
    color: ['array', norm, norm, norm, ['/', ['band', 2], 255]]
  }
}

export const createCOGSource = (url, bands) => {
  return new GeoTIFFSource({
    sources: [{
      url: url,
      bands: bands,
      nodata: 0
    }],
    normalize: false,
    convertToRGB: false,
    opaque: false,
    sourceOptions: {
      allowFullFile: false
    }
  })
}

/**
 * 회전된 이미지의 타일 선택 보정.
 *
 * 아핀 바이패스에서 타일 그리드는 축 정렬(axis-aligned)이지만 실제 렌더링은
 * 회전된 위치에 그려진다. OL은 타일의 그리드 위치로 가시성을 판단하므로,
 * 줌인 시 그리드 위치가 뷰 밖인 타일이 로드되지 않는 문제가 발생한다.
 *
 * 해결: pixelToView의 역변환으로 뷰 영역 → 픽셀 영역을 구하고,
 * 해당 픽셀을 덮는 타일 좌표를 반환하도록 getTileRangeForExtentAndZ를 교체.
 */
function patchTileGridForAffine(tileGrid, pixelToView, sourceTileSizes, overviewScales) {
  const viewToPixel = createTransform()
  setFromArray(viewToPixel, pixelToView)
  invertTransform(viewToPixel)

  tileGrid.getTileRangeForExtentAndZ = function (extent, z, opt_tileRange) {
    // 뷰 영역 4꼭짓점 → 픽셀 좌표로 역변환
    const c0 = applyTransformPt(viewToPixel, [extent[0], extent[1]])
    const c1 = applyTransformPt(viewToPixel, [extent[2], extent[1]])
    const c2 = applyTransformPt(viewToPixel, [extent[2], extent[3]])
    const c3 = applyTransformPt(viewToPixel, [extent[0], extent[3]])

    const pxMinX = Math.min(c0[0], c1[0], c2[0], c3[0])
    const pxMinY = Math.min(c0[1], c1[1], c2[1], c3[1])
    const pxMaxX = Math.max(c0[0], c1[0], c2[0], c3[0])
    const pxMaxY = Math.max(c0[1], c1[1], c2[1], c3[1])

    // 줌 레벨별 타일 1개가 덮는 full-res 픽셀 크기
    const sts = sourceTileSizes[z]
    const srcW = Array.isArray(sts) ? sts[0] : sts
    const srcH = Array.isArray(sts) ? sts[1] : sts
    const [scX, scY] = overviewScales[z]
    const effW = srcW * scX
    const effH = srcH * scY

    const minX = Math.max(0, Math.floor(pxMinX / effW))
    const minY = Math.max(0, Math.floor(pxMinY / effH))
    const maxX = Math.max(0, Math.ceil(pxMaxX / effW) - 1)
    const maxY = Math.max(0, Math.ceil(pxMaxY / effH) - 1)

    return createOrUpdateTileRange(minX, maxX, minY, maxY, opt_tileRange)
  }

  // 회전된 뷰에서 OL이 타일 그리드 위치 기반으로 타일을 건너뛰지 않도록
  tileGrid.tileCoordIntersectsViewport = function () { return true }
}

export async function createCOGLayer({ url, bandInfo: overrideBandInfo, projectionMode, viewProjection, targetTileSize = 256, opacity = 1 }) {
  const tiff = await tiffFromUrl(url, { blockSize: GEOTIFF_BLOCK_SIZE, cacheSize: GEOTIFF_CACHE_SIZE })

  const bandInfo = overrideBandInfo || await detectBands(tiff)
  const resolvedBands = bandInfo.bands

  const source = createCOGSource(url, resolvedBands)
  const [cogView, { stats }] = await Promise.all([
    source.getView(),
    getMinMaxFromOverview(tiff, resolvedBands)
  ])
  const cogProjection = cogView.projection
  const cogExtent = cogView.extent

  // 회전된 이미지의 실제 AABB 계산 (view.fit 및 layer extent용)
  const rotatedSrcExtent = await computeRotatedSourceExtent(tiff)

  let sourceTileSizes, overviewScales
  if (projectionMode === 'affine') {
    // 타일 그리드는 비회전 extent 사용 (타일 좌표 생성에 필요)
    const result = applyAffineBypass(source, cogView, viewProjection, targetTileSize)
    sourceTileSizes = result.sourceTileSizes
    overviewScales = result.overviewScales
  }

  // view.fit / layer extent: 회전 AABB가 있으면 사용, 없으면 원본 사용
  const displayExtentSrc = rotatedSrcExtent || cogExtent
  const extent = displayExtentSrc ? transformExtent(displayExtentSrc, cogProjection, viewProjection) : undefined
  const center = cogView.center ? transform(cogView.center, cogProjection, viewProjection) : undefined

  const layer = new WebGLTileLayer({
    source: source,
    style: buildStyle(bandInfo, stats),
    extent: extent,
    opacity,
    preload: 0,
    transition: 250
  })

  if (projectionMode === 'affine' && sourceTileSizes) {
    const pixelToView = await computePixelToViewAffine(tiff, cogProjection, viewProjection)
    if (pixelToView) {
      patchRendererWithAffine(layer, pixelToView, sourceTileSizes, overviewScales)
      patchTileGridForAffine(source.tileGrid, pixelToView, sourceTileSizes, overviewScales)
    }
  }

  return { layer, source, extent, center, zoom: cogView.zoom, tiff }
}
