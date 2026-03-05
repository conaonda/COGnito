/**
 * 해시태그 문자열을 파싱하여 태그 배열로 변환
 * "#sentinel, #landsat sar" → ["sentinel", "landsat", "sar"]
 */
export function parseTags(input) {
  if (!input) return []
  return input
    .split(/[\s,]+/)
    .map(t => t.replace(/^#/, '').trim())
    .filter(Boolean)
}
