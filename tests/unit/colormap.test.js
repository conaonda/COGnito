import { describe, it, expect } from 'vitest'
import { COLORMAPS } from '../../src/colormap.js'

describe('COLORMAPS', () => {
  it('grayscale is null', () => {
    expect(COLORMAPS.grayscale).toBeNull()
  })

  for (const name of ['viridis', 'inferno', 'plasma']) {
    describe(name, () => {
      const lut = COLORMAPS[name]

      it('has 256 entries', () => {
        expect(lut).toHaveLength(256)
      })

      it('each entry is [r, g, b] with values 0-255', () => {
        for (const entry of lut) {
          expect(entry).toHaveLength(3)
          for (const v of entry) {
            expect(v).toBeGreaterThanOrEqual(0)
            expect(v).toBeLessThanOrEqual(255)
            expect(Number.isInteger(v)).toBe(true)
          }
        }
      })
    })
  }
})
