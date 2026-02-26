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
  [68,1,84],[72,36,117],[65,68,135],[53,95,141],
  [42,120,142],[33,145,140],[34,168,132],[53,183,121],
  [94,201,98],[142,214,68],[194,224,35],[229,228,25],
  [246,230,34],[252,231,37],[253,231,37],[253,231,37]
]

const INFERNO_KEYS = [
  [0,0,4],[12,8,38],[35,12,76],[64,10,103],
  [92,18,110],[122,27,109],[152,39,93],[184,55,59],
  [213,72,27],[232,113,10],[244,155,6],[252,191,23],
  [250,221,55],[242,244,130],[252,255,164],[252,255,164]
]

const PLASMA_KEYS = [
  [13,8,135],[56,5,150],[95,3,153],[128,4,148],
  [156,23,136],[181,44,117],[201,72,93],[218,100,70],
  [232,131,43],[242,163,21],[247,195,7],[249,222,25],
  [239,248,72],[227,248,97],[217,250,123],[240,249,33]
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

  // 16 stops로 컬러맵 근사 — nodata(alpha=0) 투명 유지
  const norm = ['/', ['-', ['band', 1], stats[0].min], stats[0].max - stats[0].min]
  const stops = []
  for (let i = 0; i <= 15; i++) {
    const t = i / 15
    const idx = Math.round(t * 255)
    const [r, g, b] = lut[idx]
    stops.push(t, ['color', r, g, b, 1])
  }

  const colormapColor = ['interpolate', ['linear'], norm, ...stops]
  return {
    color: ['case',
      ['==', ['band', 2], 0], ['color', 0, 0, 0, 0],
      colormapColor
    ]
  }
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
