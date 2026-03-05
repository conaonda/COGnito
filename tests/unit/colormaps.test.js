import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockColormaps = {}

vi.mock('@conaonda/ol-cog-layers', () => ({
  COLORMAPS: mockColormaps,
}))

describe('colormaps', () => {
  beforeEach(async () => {
    vi.resetModules()
    Object.keys(mockColormaps).forEach((k) => delete mockColormaps[k])
    await import('../../src/colormaps.js')
  })

  it('COLORMAPS에 magma가 등록된다', () => {
    expect(mockColormaps.magma).toBeDefined()
  })

  it('magma LUT는 256개의 항목을 가진다', () => {
    expect(mockColormaps.magma).toHaveLength(256)
  })

  it('각 LUT 항목은 [R, G, B] 배열이다', () => {
    for (const entry of mockColormaps.magma) {
      expect(entry).toHaveLength(3)
      for (const channel of entry) {
        expect(channel).toBeGreaterThanOrEqual(0)
        expect(channel).toBeLessThanOrEqual(255)
      }
    }
  })

  it('LUT 첫 항목은 거의 검정(어두운 보라)', () => {
    const [r, g, b] = mockColormaps.magma[0]
    expect(r).toBe(0)
    expect(g).toBe(0)
    expect(b).toBe(4)
  })

  it('LUT 마지막 항목은 밝은 크림 계열', () => {
    const last = mockColormaps.magma[255]
    expect(last[0]).toBeGreaterThan(200)
    expect(last[1]).toBeGreaterThan(200)
  })
})
