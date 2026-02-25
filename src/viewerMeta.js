/**
 * 뷰어 헤더 subtitle과 controls 패널을 메타데이터 기반으로 업데이트
 */
export function updateViewerMeta(meta) {
  const subtitle = document.getElementById('viewer-subtitle')
  const controlsTitle = document.getElementById('controls-title')
  const controlsInfo = document.getElementById('controls-info')

  if (subtitle) {
    subtitle.textContent = meta.title
      ? `${meta.title} | OpenLayers 10.x + Vite`
      : 'OpenLayers 10.x + Vite'
  }

  if (controlsTitle) {
    controlsTitle.textContent = meta.title || '영상 정보'
  }

  if (controlsInfo) {
    controlsInfo.textContent = ''
    const lines = []
    if (meta.filename) lines.push(meta.filename)
    if (meta.description) lines.push(meta.description)
    if (meta.crs) lines.push(`CRS: ${meta.crs}`)
    if (meta.bands) lines.push(`Bands: ${meta.bands.join(',')}`)
    if (lines.length === 0) {
      controlsInfo.textContent = '-'
    } else {
      lines.forEach((line, i) => {
        if (i > 0) controlsInfo.appendChild(document.createElement('br'))
        controlsInfo.appendChild(document.createTextNode(line))
      })
    }
  }
}
