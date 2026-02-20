# 테스트 가이드

## 1. 개요

Playwright 기반 성능 테스트로 페이지 로딩, 지도 인터랙션, COG 렌더링 성능을 측정하고 회귀를 감지한다.

### 테스트 파일

| 파일 | 측정 내용 |
|------|-----------|
| `01-page-load.spec.js` | FCP, LCP, TTFB, COG Ready, 첫 타일 렌더링, 로딩 상태 전환 |
| `02-map-pan.spec.js` | 방향별 팬 속도, FPS, 일관성 (CV < 0.3) |
| `03-map-zoom.spec.js` | 줌 인/아웃, 연속/급속 줌, 더블클릭 줌 |
| `04-detailed-state.spec.js` | HTTP 요청 기록, COG Range 요청, OpenLayers 전체 상태 스냅샷 |
| `05-tile-count.spec.js` | FHD 뷰포트 타일 개수 검증 |
| `06-tile-size-compare.spec.js` | 타일 사이즈 256 vs 512 성능 비교 |
| `07-umbra-sar-diag.spec.js` | Umbra SAR GEC 초기 뷰 진단 |
| `08-umbra-zoom-in.spec.js` | Umbra SAR GEC 줌인 타일 표시 검증 |

---

## 2. 테스트 실행

### 사전 준비

```bash
npm install
npx playwright install
npm run build
```

### 스크립트

| 스크립트 | 설명 |
|----------|------|
| `npm run test:performance` | 전체 성능 테스트 (headless) |
| `npm run test:performance:report` | HTML 리포트 생성 |
| `npm run test:performance:ui` | Playwright UI 모드 |
| `npm run test:performance:headed` | 브라우저 표시 모드 |
| `npm run test:state` | 상태 기록 테스트만 실행 |
| `npm run test:state:headed` | 상태 기록 (브라우저 표시) |

모든 스크립트는 내부적으로 `vite preview` (포트 4173)를 시작하고 테스트 후 종료한다.

### 개별 테스트 실행

```bash
# 특정 파일만
npx playwright test tests/performance/01-page-load.spec.js

# 디버그 모드 (Playwright Inspector)
npx playwright test tests/performance/01-page-load.spec.js --debug

# 슬로우 모션
npx playwright test tests/performance --headed --slowmo=1000
```

> **주의:** 개별 실행 시 `vite preview --port 4173`이 별도로 실행 중이어야 한다.

---

## 3. 성능 메트릭 및 기준값

### 메트릭 정의

| 메트릭 | 정의 | 측정 API |
|--------|------|----------|
| TTFB | 첫 바이트 수신 시점 | Navigation Timing API |
| FCP | 첫 콘텐츠 렌더링 시점 | PerformanceObserver (`paint`) |
| LCP | 최대 콘텐츠 렌더링 시점 | PerformanceObserver (`largest-contentful-paint`) |
| COG Ready | `cogSource.getState() === 'ready'` 도달 시점 | OpenLayers `change` 이벤트 |
| First Tile | 타일 캐시에 첫 타일 등장 시점 | `getTileCache().getCount() > 0` |
| FPS | 인터랙션 중 프레임 레이트 | `requestAnimationFrame` 카운터 |

### 기준값

**페이지 로드:**

| 메트릭 | 통과 기준 | 목표 | 우수 |
|--------|-----------|------|------|
| FCP | < 3s | < 1.5s | < 1s |
| LCP | < 4s | < 2.5s | < 1.5s |
| TTFB | < 500ms | < 200ms | < 100ms |
| COG Ready | < 10s | < 5s | < 3s |
| Total Load | < 15s | < 5s | < 3s |

**팬 (Pan):**

| 메트릭 | 통과 기준 |
|--------|-----------|
| Total Duration | < 2,000ms (대각선: < 2,500ms) |
| Avg FPS | > 30fps |
| 일관성 (CV) | < 0.3 |

**줌 (Zoom):**

| 메트릭 | 통과 기준 |
|--------|-----------|
| 단일 줌 | < 3,000ms |
| 타일 로드 | < 2,000ms |
| 급속 줌 (5단계) | < 5,000ms |
| 연속 줌 평균 | < 2,000ms |

### 결과 해석

- **정상:** 모든 메트릭이 통과 기준 이내
- **주의:** 통과하지만 목표 미달 — 네트워크/환경 확인 필요
- **이상:** 통과 기준 초과 — 코드 변경 또는 환경 문제 조사 필요

---

## 4. 상태 기록 테스트 (04-detailed-state)

### 기록 항목

`04-detailed-state.spec.js`는 페이지 로드 후 다음을 JSON 파일로 저장한다:

1. **HTTP 요청/응답** — URL, 메서드, 헤더 (`Range` 포함), 상태 코드, 타임스탬프
2. **COG Range 요청** — `.tif` URL + `Range` 헤더 (예: `bytes=0-65535`)
3. **OpenLayers View** — projection, center, zoom, resolution, extent, rotation
4. **레이어 목록** — 타입 (`TileLayer`/`WebGLTileLayer`), 소스 타입, 상태, opacity
5. **타일 캐시** — 캐시된 타일 수, 타일 좌표 (z/x/y)
6. **COG 소스 설정** — state, url, bands, normalize, convertToRGB, opaque

결과 파일: `test-results/initial-load-state-{timestamp}.json`

### 베이스라인 비교

1. 테스트를 실행하여 상태 JSON 생성
2. 결과를 `baseline-state.json`으로 복사
3. 이후 실행 결과와 비교

**비교 허용 오차:**

| 필드 | 허용 오차 |
|------|-----------|
| projectionCode | 정확히 일치 |
| center | +/-0.01 |
| zoom | +/-0.1 |
| tileCount | +/-5 |
| cogSourceState | 정확히 일치 ("ready") |
| cogRangeRequests | > 0 |

### 핵심 검증 포인트

- `cogSource.state === 'ready'`
- center 좌표가 2개 요소 배열
- zoom이 5~25 범위
- layerCount > 0
- projection이 존재

---

## 5. 문제 해결

### 증상별 진단

| 증상 | 원인 및 조치 |
|------|-------------|
| COG Ready > 30s | 네트워크 확인, COG URL 접근성 확인, GCS 상태 확인, CORS 설정 확인 |
| 팬 > 2s | 타일 네트워크 지연 확인, WebGL 컨텍스트 확인, 메모리 압박 확인 |
| 줌 > 3s | 줌 레벨별 타일 로드 시간 확인, 캐시 히트 비율 확인, GPU 메모리 확인 |
| FPS < 30 | 백그라운드 프로세스 종료, GPU 가속 확인, headed/headless 모드 차이 확인 |
| HTTP 요청 미기록 | `page.route()`를 `page.goto()` 전에 설정했는지 확인 |
| 타일 캐시 0 | `source.getTileCache()` vs `source.tileCache_` 접근자 확인 (OL 버전 차이) |
| COG Range 요청 미감지 | `.tif` 경로에 `Cache-Control: no-cache` 헤더 오버라이드 시도 |
| 결과 불일치 | 백그라운드 앱 종료, 네트워크 안정 확인, 5회+ 실행 후 평균값 사용 |

### 결과 파일 위치

| 경로 | 내용 |
|------|------|
| `test-results/` | JSON 결과, 스크린샷, 상태 스냅샷 |
| `playwright-report/` | HTML 리포트 (`npx playwright show-report`로 열기) |

### 환경 요구사항

- Chromium 120+, WebGL 2.0 지원
- 네트워크: WiFi 100Mbps+ 권장 (4G/3G 환경은 임계값 증가 필요)
- 하드웨어: 4코어+, RAM 8GB+
- `workers: 1` (순차 실행)으로 안정적인 측정 보장
