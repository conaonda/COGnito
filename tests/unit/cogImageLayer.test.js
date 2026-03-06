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
vi.mock('geotiff', () => ({ fromUrl: vi.fn(), Pool: vi.fn() }))
vi.mock('ol/layer/Image', () => ({ default: vi.fn() }))
vi.mock('ol/source/ImageCanvas', () => ({ default: vi.fn() }))
vi.mock('ol/extent', () => ({
  intersects: vi.fn(),
  getIntersection: vi.fn()
}))

const { buildStyleWithColormap, applyColormapToPixel, COLORMAPS } = await import('@conaonda/ol-cog-layers')

describe('buildStyleWithColormap', () => {
  it('RGB 밴드이면 컬러맵 무시하고 RGB 스타일 반환', () => {
    const stats = [{ min: 0, max: 255 }, { min: 0, max: 255 }, { min: 0, max: 255 }]
    const style = buildStyleWithColormap({ type: 'rgb', bands: [1, 2, 3] }, stats, 'viridis')

    expect(style.color[0]).toBe('array')
    expect(style.color.length).toBe(5)
  })

  it('단일 밴드 + grayscale이면 그레이스케일 스타일 반환', () => {
    const stats = [{ min: 0, max: 1000 }]
    const style = buildStyleWithColormap({ type: 'gray', bands: [1] }, stats, 'grayscale')

    expect(style.color[0]).toBe('array')
  })

  it('단일 밴드 + viridis이면 interpolate 표현식 반환', () => {
    const stats = [{ min: 0, max: 1000 }]
    const style = buildStyleWithColormap({ type: 'gray', bands: [1] }, stats, 'viridis')

    expect(style.color[0]).toBe('case')
  })

  it('존재하지 않는 컬러맵이면 그레이스케일 폴백', () => {
    const stats = [{ min: 0, max: 1000 }]
    const style = buildStyleWithColormap({ type: 'gray', bands: [1] }, stats, 'nonexistent')

    expect(style.color[0]).toBe('array')
  })
})

describe('applyColormapToPixel', () => {
  it('컬러맵이 있으면 RGB 배열 반환', () => {
    const result = applyColormapToPixel(128, 'viridis')
    expect(result).toHaveLength(3)
    result.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(255)
    })
  })

  it('존재하지 않는 컬러맵이면 그레이스케일 반환', () => {
    const result = applyColormapToPixel(128, 'nonexistent')
    expect(result).toEqual([128, 128, 128])
  })

  it('경계값(0, 255) 처리', () => {
    expect(applyColormapToPixel(0, 'viridis')).toHaveLength(3)
    expect(applyColormapToPixel(255, 'viridis')).toHaveLength(3)
  })
})

describe('COLORMAPS', () => {
  it('기본 컬러맵이 등록되어 있음', () => {
    expect(COLORMAPS.grayscale).toBeNull()
    expect(COLORMAPS.viridis).toHaveLength(256)
    expect(COLORMAPS.inferno).toHaveLength(256)
    expect(COLORMAPS.plasma).toHaveLength(256)
  })

  it('각 LUT 항목은 [r, g, b] 형태', () => {
    const entry = COLORMAPS.viridis[0]
    expect(entry).toHaveLength(3)
    entry.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(255)
    })
  })
})
