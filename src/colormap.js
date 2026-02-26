/**
 * 컬러맵 LUT 데이터 — 각 맵은 256개 [r, g, b] 항목 (0-255)
 * viridis, inferno, plasma 데이터는 matplotlib 기준 16-step 샘플링 후 보간
 */

// 16개 키포인트에서 256 엔트리 생성
function interpolateLUT(keypoints) {
  const lut = new Array(256)
  for (let i = 0; i < 256; i++) {
    const t = i / 255 * (keypoints.length - 1)
    const idx = Math.min(Math.floor(t), keypoints.length - 2)
    const frac = t - idx
    const a = keypoints[idx], b = keypoints[idx + 1]
    lut[i] = [
      Math.round(a[0] + (b[0] - a[0]) * frac),
      Math.round(a[1] + (b[1] - a[1]) * frac),
      Math.round(a[2] + (b[2] - a[2]) * frac)
    ]
  }
  return lut
}

const VIRIDIS_KEYS = [
  [68,1,84],[72,35,116],[64,67,135],[52,94,141],
  [41,120,142],[32,144,140],[34,167,132],[53,183,121],
  [94,201,97],[143,215,68],[194,223,35],[227,228,24],
  [253,231,37],[253,231,37],[253,231,37],[253,231,37]
]

const INFERNO_KEYS = [
  [0,0,4],[14,11,53],[40,11,95],[73,10,117],
  [106,14,121],[137,26,109],[165,44,85],[192,64,56],
  [213,90,30],[231,120,10],[244,154,5],[252,190,22],
  [248,225,72],[237,251,130],[237,251,130],[237,251,130]
]

const PLASMA_KEYS = [
  [13,8,135],[56,4,150],[94,2,153],[126,3,148],
  [153,14,138],[177,33,121],[196,56,100],[213,80,78],
  [226,105,56],[237,132,35],[244,161,15],[249,192,6],
  [250,222,25],[244,248,72],[244,248,72],[244,248,72]
]

export const COLORMAPS = {
  grayscale: null,
  viridis: interpolateLUT(VIRIDIS_KEYS),
  inferno: interpolateLUT(INFERNO_KEYS),
  plasma: interpolateLUT(PLASMA_KEYS)
}

/**
 * WebGL용 buildStyle 확장 — 컬러맵 적용
 * 단일 밴드 + 컬러맵일 때 16-stop interpolate 표현식 생성
 */
export function buildStyleWithColormap(bandInfo, stats, colormapName) {
  if (bandInfo.type === 'rgb' || !colormapName || colormapName === 'grayscale') {
    // 기존 buildStyle과 동일 (import 없이 인라인)
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
    return { color: ['array', norm, norm, norm, ['/', ['band', 2], 255]] }
  }

  const lut = COLORMAPS[colormapName]
  if (!lut) {
    const norm = ['/', ['-', ['band', 1], stats[0].min], stats[0].max - stats[0].min]
    return { color: ['array', norm, norm, norm, ['/', ['band', 2], 255]] }
  }

  // 16 stops로 컬러맵 근사
  const norm = ['/', ['-', ['band', 1], stats[0].min], stats[0].max - stats[0].min]
  const stops = []
  for (let i = 0; i <= 15; i++) {
    const t = i / 15
    const idx = Math.round(t * 255)
    const [r, g, b] = lut[idx]
    stops.push(t, ['color', r, g, b, 255])
  }

  return { color: ['interpolate', ['linear'], norm, ...stops] }
}

/**
 * Canvas 파이프라인용 — 정규화된 값(0-255)에 컬러맵 LUT 적용
 */
export function applyColormapToPixel(normalizedValue, colormapName) {
  const lut = COLORMAPS[colormapName]
  if (!lut) return [normalizedValue, normalizedValue, normalizedValue]
  const idx = Math.min(255, Math.max(0, normalizedValue))
  return lut[idx]
}
