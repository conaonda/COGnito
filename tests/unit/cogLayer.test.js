import { describe, it, expect, vi } from 'vitest'

// OL과 geotiff 의존성을 mock (확장자 유무 모두 처리)
vi.mock('ol/layer/WebGLTile', () => ({ default: vi.fn() }))
vi.mock('ol/layer/WebGLTile.js', () => ({ default: vi.fn() }))
vi.mock('ol/source/GeoTIFF', () => ({ default: vi.fn() }))
vi.mock('ol/source/GeoTIFF.js', () => ({ default: vi.fn() }))
vi.mock('ol/tilegrid/TileGrid.js', () => ({ default: vi.fn() }))
vi.mock('ol/proj', () => ({
  transformExtent: vi.fn(),
  transform: vi.fn(),
  get: vi.fn()
}))
vi.mock('ol/transform.js', () => ({
  create: vi.fn(),
  set: vi.fn(),
  setFromArray: vi.fn(),
  invert: vi.fn(),
  apply: vi.fn()
}))
vi.mock('ol/TileRange.js', () => ({ createOrUpdate: vi.fn() }))
vi.mock('geotiff', () => ({ fromUrl: vi.fn() }))
vi.mock('ol/layer/Image', () => ({ default: vi.fn() }))
vi.mock('ol/source/ImageCanvas', () => ({ default: vi.fn() }))
vi.mock('ol/extent', () => ({
  intersects: vi.fn(),
  getIntersection: vi.fn()
}))

const { buildStyle, detectBands, getTotalBands, getMinMaxFromOverview } = await import('@conaonda/ol-cog-layers')

function mockTiff({ samplesPerPixel = 1, photometric = 1, extraSamples, imageCount = 1, width = 4, height = 4, rasterData }) {
  const fileDirectory = { PhotometricInterpretation: photometric }
  if (extraSamples !== undefined) fileDirectory.ExtraSamples = extraSamples

  const image = {
    getSamplesPerPixel: () => samplesPerPixel,
    getWidth: () => width,
    getHeight: () => height,
    fileDirectory,
    readRasters: vi.fn(({ samples }) => {
      if (rasterData) return Promise.resolve(rasterData)
      return Promise.resolve(
        Object.assign(
          samples.map(() => new Float32Array(width * height).fill(100)),
          { width, height }
        )
      )
    })
  }

  return {
    getImage: vi.fn(() => Promise.resolve(image)),
    getImageCount: vi.fn(() => Promise.resolve(imageCount))
  }
}

describe('buildStyle', () => {
  it('RGB 밴드에 대해 올바른 스타일을 생성', () => {
    const stats = [{ min: 0, max: 255 }, { min: 0, max: 255 }, { min: 0, max: 255 }]
    const style = buildStyle({ type: 'rgb', bands: [1, 2, 3] }, stats)

    expect(style.color).toBeDefined()
    expect(style.color[0]).toBe('array')
    expect(style.color.length).toBe(5)
  })

  it('단일 밴드(gray)에 대해 올바른 스타일을 생성', () => {
    const stats = [{ min: 0, max: 1000 }]
    const style = buildStyle({ type: 'gray', bands: [1] }, stats)

    expect(style.color[0]).toBe('array')
    expect(style.color.length).toBe(5)
  })
})

describe('detectBands', () => {
  it('RGB photometric(2)이면 rgb 반환', async () => {
    const tiff = mockTiff({ samplesPerPixel: 4, photometric: 2, extraSamples: [1] })
    const result = await detectBands(tiff)

    expect(result.type).toBe('rgb')
    expect(result.bands).toEqual([1, 2, 3])
  })

  it('단일 밴드이면 gray 반환', async () => {
    const tiff = mockTiff({ samplesPerPixel: 1, photometric: 1 })
    const result = await detectBands(tiff)

    expect(result.type).toBe('gray')
    expect(result.bands).toEqual([1])
  })

  it('3밴드 이상이면 rgb로 판정', async () => {
    const tiff = mockTiff({ samplesPerPixel: 3, photometric: 1 })
    const result = await detectBands(tiff)

    expect(result.type).toBe('rgb')
    expect(result.bands).toEqual([1, 2, 3])
  })
})

describe('getTotalBands', () => {
  it('알파 채널 제외한 밴드 수 반환', async () => {
    const tiff = mockTiff({ samplesPerPixel: 4, extraSamples: [1] })
    expect(await getTotalBands(tiff)).toBe(3)
  })

  it('ExtraSamples 없으면 전체 밴드 반환', async () => {
    const tiff = mockTiff({ samplesPerPixel: 3 })
    expect(await getTotalBands(tiff)).toBe(3)
  })

  it('단일 밴드', async () => {
    const tiff = mockTiff({ samplesPerPixel: 1 })
    expect(await getTotalBands(tiff)).toBe(1)
  })
})

describe('getMinMaxFromOverview', () => {
  it('밴드별 min/max 통계를 반환', async () => {
    const data = new Float32Array([10, 20, 30, 0])
    const tiff = mockTiff({
      imageCount: 2,
      width: 2,
      height: 2,
      rasterData: Object.assign([data], { width: 2, height: 2 })
    })

    const result = await getMinMaxFromOverview(tiff, [1])
    expect(result.stats).toHaveLength(1)
    expect(result.stats[0].min).toBe(10)
    expect(result.stats[0].max).toBe(30)
  })

  it('모두 0이면 기본값 반환', async () => {
    const data = new Float32Array([0, 0, 0, 0])
    const tiff = mockTiff({
      imageCount: 2,
      width: 2,
      height: 2,
      rasterData: Object.assign([data], { width: 2, height: 2 })
    })

    const result = await getMinMaxFromOverview(tiff, [1])
    expect(result.stats[0].min).toBe(0)
    expect(result.stats[0].max).toBe(1)
  })
})
