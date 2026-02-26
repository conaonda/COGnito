# Design: 뷰어 강화 (viewer-enhancement)

## 참조
- Plan: `docs/01-plan/features/viewer-enhancement.plan.md`

---

## 1. 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│ index.html  (.viewer-controls 패널)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ 밴드 선택 │ │ 컬러맵   │ │ Min/Max  │ │ 투영모드 토글 │  │
│  │ R/G/B    │ │ select   │ │ slider   │ │ affine/reproj │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │ CustomEvent('viewer-style-change')
                      ▼
┌──────────────────────────────────────────┐
│ src/viewerControls.js (신규)             │
│  - initViewerControls(onStyleChange)     │
│  - updateControlsForCog(bandCount, stats)│
│  - getCurrentStyle()                     │
└──────────────────────┬───────────────────┘
                       │ { bands, colormap, min, max, projectionMode }
                       ▼
┌──────────────────────────────────────────┐
│ src/main.js                              │
│  - loadCOG에서 initViewerControls 호출   │
│  - onStyleChange → applyStyle() 또는     │
│    loadCOG() 재호출 (투영/밴드 변경 시)  │
└──────────┬──────────────────┬────────────┘
           │                  │
     ┌─────▼─────┐     ┌─────▼──────────┐
     │ cogLayer   │     │ cogImageLayer  │
     │ setStyle() │     │ fillPixelData  │
     │ (WebGL)    │     │ (Canvas)       │
     └────────────┘     └────────────────┘
```

## 2. 신규 모듈: `src/viewerControls.js`

### 2.1 역할
- 뷰어 컨트롤 패널의 DOM 생성 및 이벤트 관리
- COG 로드 시 밴드 수/통계에 따라 UI 동적 갱신
- 스타일 변경 시 콜백 호출

### 2.2 API

```js
/**
 * 컨트롤 패널 초기화. COG 로드 전 1회 호출.
 * @param {Function} onStyleChange - ({ bands, colormap, min, max }) => void
 * @param {Function} onProjectionChange - (mode: 'affine'|'reproject') => void
 */
export function initViewerControls(onStyleChange, onProjectionChange)

/**
 * COG 로드 후 호출. 밴드 수와 통계에 맞게 UI 갱신.
 * @param {number} totalBands - 총 밴드 수 (알파 제외)
 * @param {object} bandInfo - { type: 'rgb'|'gray', bands: number[] }
 * @param {Array<{min,max}>} stats - 밴드별 통계
 * @param {string} projectionMode - 현재 투영 모드
 */
export function updateControlsForCog(totalBands, bandInfo, stats, projectionMode)
```

### 2.3 UI 상태 흐름

```
COG 로드 → updateControlsForCog(bandCount, bandInfo, stats, mode)
  → 밴드 드롭다운 옵션 생성 (1 ~ bandCount)
  → 현재 밴드 설정 반영 (RGB: R=1,G=2,B=3 / Gray: Band=1)
  → Min/Max 슬라이더 범위 설정 (stats[0].min ~ stats[0].max)
  → 투영 모드 버튼 상태 설정

사용자 조작 → onStyleChange({ bands, colormap, min, max })
  → main.js에서 파이프라인별 처리
```

## 3. 기능별 상세 설계

### 3.1 F3. Min/Max 스트레치 슬라이더 (우선순위 1)

**UI:** 2개 range input (min, max) + 현재 값 표시 + "자동" 리셋 버튼

**WebGL 파이프라인 적용:**
```js
// cogLayer.js — buildStyle을 외부에서 호출 가능하게 export
export const buildStyle = (bandInfo, stats) => { ... }  // 기존 그대로

// main.js — 스타일 재적용
const newStats = [{ min: userMin, max: userMax }]
cogLayer.setStyle(buildStyle(bandInfo, newStats))
```

**Canvas 파이프라인 적용:**
- `createCOGImageLayer`에 `statsOverride` 파라미터 추가
- 또는 반환 객체에 `updateStats(newStats)` 메서드 추가 → `source.changed()` 트리거

**설계 결정:** Canvas 파이프라인은 `stats`를 클로저로 보유 중. 외부에서 변경하려면:
- 옵션 A: stats를 mutable 객체로 참조 → 직접 수정 후 `source.changed()`
- 옵션 B: 반환 객체에 `setStats()` 메서드 추가
- **선택: 옵션 B** — 명시적 API가 더 안전

```js
// cogImageLayer.js 반환값 확장
return {
  layer, source, extent, center, tiff,
  setStats(newStats) { stats.splice(0, stats.length, ...newStats); source.changed() },
  setBands(newBands) { /* source 재생성 필요 */ },
  getStats() { return stats },
  getBandInfo() { return bandInfo }
}
```

### 3.2 F1. 밴드 선택 UI (우선순위 2)

**UI:**
- RGB 모드: 3개 select (R채널, G채널, B채널) — 각각 1~N 밴드
- 단일 밴드 모드: 1개 select — 밴드 번호 선택
- 모드 전환 토글: "RGB" / "단일 밴드"

**밴드 변경 시 처리:**
- 밴드가 바뀌면 source를 재생성해야 함 (GeoTIFFSource의 bands는 생성 시 고정)
- WebGL: `createCOGSource(url, newBands)` → 새 source로 layer 교체 → `buildStyle` 재적용
- Canvas: `tiff.readRasters({ samples: newSamples })` — samples만 변경하면 됨 (source 재생성 불필요)

**설계 결정:** WebGL은 layer 전체 교체가 아닌 source만 교체.
```js
// main.js
const newSource = createCOGSource(url, newBands)
cogLayer.setSource(newSource)  // WebGLTileLayer.setSource() 지원 확인 필요
// → 미지원 시 layer 제거 + 재생성
```

**totalBands 감지:**
```js
// cogLayer.js에 추가
export const getTotalBands = async (tiff) => {
  const image = await tiff.getImage(0)
  const extraSamples = image.fileDirectory.ExtraSamples
  const alphaCount = extraSamples ? extraSamples.filter(v => v === 1 || v === 2).length : 0
  return image.getSamplesPerPixel() - alphaCount
}
```

### 3.3 F4. 투영 모드 토글 (우선순위 3)

**UI:** 2개 버튼 그룹 (Affine / Reproject), 현재 모드 하이라이트

**동작:** 모드 변경 시 `onProjectionChange(newMode)` 콜백 → `loadCOG()` 재호출
- `PROJECTION_MODE`를 `let`으로 변경 (현재 `const`)
- loadCOG에 `projectionMode` 파라미터 추가 (기본값: 현재 모드)

### 3.4 F2. 컬러맵 적용 (우선순위 4)

**지원 컬러맵:** Grayscale(기본), Viridis, Inferno, Plasma

**`src/colormap.js` (신규):**
```js
// 256-entry LUT, 각 항목 [r, g, b] (0-255)
export const COLORMAPS = {
  grayscale: null,  // null = 기본 그레이스케일 로직 사용
  viridis: [[68,1,84], [72,35,116], ...],   // 256 entries
  inferno: [[0,0,4], [22,11,57], ...],
  plasma:  [[13,8,135], [75,3,161], ...]
}
```

**Canvas 파이프라인 (간단):**
```js
// fillPixelData gray 분기에서
if (colormap) {
  const idx = Math.min(255, Math.max(0, v))
  px[j] = colormap[idx][0]; px[j+1] = colormap[idx][1]; px[j+2] = colormap[idx][2]
} else {
  px[j] = v; px[j+1] = v; px[j+2] = v
}
```

**WebGL 파이프라인:**
- OpenLayers `color` 표현식에서 LUT 참조 불가
- 옵션 A: `['interpolate', ['linear'], norm, stop1, color1, stop2, color2, ...]` — 10~20개 stop으로 근사
- 옵션 B: `palette` 인터폴레이션 (OL 10.x 지원 확인 필요)
- **선택: 옵션 A** — 16개 stop으로 컬러맵 근사, 검증된 방식

```js
// buildStyle 확장
const buildStyleWithColormap = (bandInfo, stats, colormapName) => {
  if (bandInfo.type === 'rgb' || !colormapName || colormapName === 'grayscale') {
    return buildStyle(bandInfo, stats)  // 기존 로직
  }
  const lut = COLORMAPS[colormapName]
  const norm = ['/', ['-', ['band', 1], stats[0].min], stats[0].max - stats[0].min]
  const stops = []
  for (let i = 0; i <= 15; i++) {
    const t = i / 15
    const idx = Math.round(t * 255)
    const [r, g, b] = lut[idx]
    stops.push(t, [r/255, g/255, b/255, 1])
  }
  return {
    color: ['interpolate', ['linear'], norm, ...stops]
  }
}
```

## 4. 파일 수정 목록

| 순서 | 파일 | 변경 | 기능 |
|------|------|------|------|
| 1 | `src/viewerControls.js` | 신규 | 컨트롤 패널 DOM + 이벤트 |
| 2 | `src/cogLayer.js` | 수정 | `buildStyle` export, `getTotalBands` 추가 |
| 3 | `src/cogImageLayer.js` | 수정 | `setStats`/`setBands` 메서드, colormap 파라미터 |
| 4 | `src/colormap.js` | 신규 | LUT 데이터 (viridis, inferno, plasma) |
| 5 | `src/main.js` | 수정 | initViewerControls, onStyleChange 핸들러, PROJECTION_MODE let |
| 6 | `index.html` | 수정 | 컨트롤 패널 HTML + CSS |

## 5. 구현 순서

```
Phase 1: Min/Max 스트레치
  1. cogLayer.js — buildStyle export
  2. cogImageLayer.js — setStats() 메서드
  3. viewerControls.js — Min/Max 슬라이더 UI
  4. main.js — onStyleChange 핸들러 (min/max)
  5. index.html — 슬라이더 CSS

Phase 2: 밴드 선택
  6. cogLayer.js — getTotalBands, createCOGSource export
  7. cogImageLayer.js — setBands() 메서드
  8. viewerControls.js — 밴드 드롭다운 UI
  9. main.js — 밴드 변경 핸들러

Phase 3: 투영 모드 토글
  10. viewerControls.js — 투영 모드 버튼
  11. main.js — PROJECTION_MODE let + loadCOG 재호출

Phase 4: 컬러맵
  12. colormap.js — LUT 데이터
  13. cogLayer.js — buildStyleWithColormap
  14. cogImageLayer.js — fillPixelData colormap 분기
  15. viewerControls.js — 컬러맵 드롭다운
```

## 6. 검증 기준 (Design → Do 게이트)

- [ ] Min/Max 슬라이더 조작 → WebGL/Canvas 모두 실시간 반영
- [ ] 다중 밴드 COG → 밴드 드롭다운에 N개 옵션 표시
- [ ] R=4, G=3, B=2 밴드 선택 → 영상 색상 변경
- [ ] 단일 밴드 + Viridis → 컬러 영상 표시
- [ ] Affine ↔ Reproject 토글 → 정상 전환
- [ ] 비 COG 상태에서 컨트롤 비활성화
