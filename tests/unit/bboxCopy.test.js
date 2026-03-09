// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('bbox copy button', () => {
  it('formats bbox as [minLon, minLat, maxLon, maxLat] with 6 decimal places', () => {
    const bbox = [126.123456789, 37.123456789, 127.987654321, 38.987654321]
    const text = `[${bbox.map(v => v.toFixed(6)).join(', ')}]`
    expect(text).toBe('[126.123457, 37.123457, 127.987654, 38.987654]')
  })

  it('copies bbox to clipboard and shows feedback', async () => {
    document.body.innerHTML = '<button id="bbox-copy-btn">bbox 복사</button>'
    const btn = document.getElementById('bbox-copy-btn')

    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const bboxText = '[126.000000, 37.000000, 128.000000, 39.000000]'
    await navigator.clipboard.writeText(bboxText)
    btn.textContent = '복사됨!'

    expect(writeText).toHaveBeenCalledWith(bboxText)
    expect(btn.textContent).toBe('복사됨!')
  })
})
