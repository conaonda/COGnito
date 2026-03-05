# 번들 분석 보고서

## 측정일: 2026-03-06

### 최적화 전 (기준선)

| 청크 | 크기 | gzip |
|------|------|------|
| index.js | 724 kB | 236 kB |
| vendor.js (OL) | 292 kB | 84 kB |
| **초기 로드 합계** | **1,016 kB** | **320 kB** |

### 최적화 후

| 청크 | 크기 | gzip | 로드 시점 |
|------|------|------|----------|
| index.js (앱 코어) | 207 kB | 59 kB | 즉시 |
| vendor.js (OL) | 292 kB | 84 kB | 즉시 |
| ol-mapbox-style 청크 | 484 kB | 168 kB | 비동기 |
| stacUI 청크 | 24 kB | 8 kB | 비동기 |
| registerUI 청크 | 7.5 kB | 3 kB | 비동기 |
| catalog 청크 | 3 kB | 2 kB | 비동기 |
| **초기 로드 합계** | **499 kB** | **143 kB** |

### 개선 효과

- 초기 로드 JS: 1,016 kB → **499 kB** (**51% 감소**)
- 초기 gzip: 320 kB → **143 kB** (**55% 감소**)
- Vite 500 kB 경고 해소 (index.js 207 kB)

### 주요 변경사항

1. **`ol-mapbox-style` 동적 import**: 베이스맵 스타일 라이브러리를 비동기 로드로 전환. 484 kB를 초기 로드에서 제거.
2. **UI 모듈 코드 스플리팅**: authUI, catalogUI, stacUI, watchlistUI, registerUI를 동적 import로 전환. 초기 렌더링에 불필요한 코드 지연 로드.
3. **`consumePreLoginState` 인라인**: auth.js 의존성 제거로 supabase 모듈 체인 분리.

### 참고사항

- `@supabase/supabase-js`: 환경변수(`VITE_SUPABASE_URL`) 미설정 시 트리쉐이킹으로 완전 제거됨. 프로덕션 배포 시 환경변수 설정 후 재측정 필요.
- OpenLayers: 이미 ESM 트리쉐이킹 적용됨. vendor 292 kB는 실제 사용 모듈만 포함.
- `@conaonda/ol-cog-layers` + geotiff: 핵심 COG 렌더링 로직으로 분리 불가.

### 향후 개선 가능 항목

| 항목 | 예상 효과 | 난이도 |
|------|----------|--------|
| geotiff decoder lazy loading | ~100 kB 절감 | 높음 (라이브러리 수정 필요) |
| Lighthouse CI 자동 측정 | 성능 회귀 감지 | 중간 |
| HTTP/2 서버 푸시 설정 | 체감 로딩 속도 개선 | 낮음 |
