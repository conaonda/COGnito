// Magma 16-step keypoints (matplotlib 기준)
const MAGMA_KEYS = [
  [0, 0, 4], [10, 7, 46], [28, 12, 84], [53, 13, 106],
  [80, 18, 123], [105, 28, 128], [131, 37, 129], [159, 48, 120],
  [187, 55, 105], [212, 72, 89], [233, 100, 78], [248, 142, 83],
  [253, 187, 110], [253, 222, 148], [251, 252, 191], [252, 253, 191]
]

// Viridis 16-step keypoints (matplotlib 기준)
const VIRIDIS_KEYS = [
  [68, 1, 84], [72, 20, 103], [72, 38, 119], [69, 55, 129],
  [63, 71, 136], [56, 87, 140], [49, 104, 142], [42, 120, 142],
  [35, 136, 142], [31, 152, 139], [34, 168, 132], [53, 183, 121],
  [94, 201, 98], [144, 215, 67], [200, 225, 32], [253, 231, 37]
]

// Inferno 16-step keypoints (matplotlib 기준)
const INFERNO_KEYS = [
  [0, 0, 4], [11, 7, 42], [32, 12, 74], [56, 12, 101],
  [81, 9, 113], [106, 13, 118], [132, 22, 113], [157, 37, 99],
  [181, 54, 79], [202, 75, 56], [221, 100, 34], [237, 132, 14],
  [247, 169, 9], [250, 209, 35], [245, 243, 96], [252, 255, 164]
]

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

export async function registerColormaps() {
  const { COLORMAPS } = await import('@conaonda/ol-cog-layers')
  COLORMAPS.magma = interpolateLUT(MAGMA_KEYS)
  COLORMAPS.viridis = interpolateLUT(VIRIDIS_KEYS)
  COLORMAPS.inferno = interpolateLUT(INFERNO_KEYS)
}
