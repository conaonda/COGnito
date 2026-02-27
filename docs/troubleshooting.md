# Troubleshooting Guide

COGnito 개발 중 발견된 이슈와 해결 방법을 기록합니다.

---

## #56: 줌 아웃 시 COG 영상 내용이 비정상적으로 변하는 현상

**증상**: 특정 COG 영상을 줌 아웃하면 어느 시점에서 영상 내용이 비정상적으로 변경됨.

**원인 분석**:
- `cogLayer.js`의 `applyAffineBypass`에서 extra coarse resolution 레벨 추가 시, `sourceTileSizes`가 `MAX_SOURCE_TILE_DIM(2048)`까지 증가
- coarsest overview 이미지 크기(예: 86x86)를 초과하는 source tile 크기로 인해 GeoTIFF에서 out-of-bounds 읽기 발생
- `sourceMasks_` 패딩 시 `undefined`를 넣어 마스크 정보 손실

**해결**:
1. extra 레벨의 `sourceTileSizes`를 coarsest overview 실제 크기로 클램핑
2. `sourceMasks_` 패딩 시 coarsest mask를 복사하여 마스크 정보 유지

**관련 코드**: `src/cogLayer.js` — `applyAffineBypass()`

---

## #68: 장면 변경 중 COG 이미지 업데이트 디바운싱

**증상**: 팬/줌/창 크기 변경 시 COG 타일이 즉시 업데이트되어 연속 조작 시 불필요한 렌더링 반복.

**해결**:
1. **cogImageLayer (Canvas 파이프라인)**: debounce 150ms → 200ms 조정. 이미 abort 패턴 적용.
2. **cogLayer (WebGL 파이프라인)**: `preload: 0` (인접 줌 레벨 미리로드 방지), `transition: 250` (타일 전환 부드럽게)
3. **main.js**: `movestart`/`moveend` 이벤트로 연속 조작 중 불필요한 렌더링 억제

**관련 코드**: `src/cogLayer.js`, `src/cogImageLayer.js`, `src/main.js`

---

## #55: 영상 영역 공유 기능

**구현**: URL 파라미터에 `center` (경위도), `zoom` 을 포함하여 현재 뷰 상태를 공유.

**동작**:
1. 공유 버튼 클릭 → 현재 COG URL + center + zoom 을 URL 파라미터로 생성
2. 클립보드에 자동 복사 (실패 시 prompt 대체)
3. 공유 URL 접속 시 COG 로드 후 해당 위치/줌으로 자동 이동
4. 공유 URL이 로그인 복원보다 우선

**URL 형식**: `?url=<COG_URL>&center=<lon>,<lat>&zoom=<level>`

**관련 코드**: `src/main.js`

---

## #70: STAC AOI 설정 기능

**구현**: `ol/interaction/Draw`를 사용하여 맵에서 사각형 AOI를 그리고, STAC `intersects` 파라미터로 검색.

**동작**:
1. STAC 패널의 "영역 그리기" 버튼 → 맵에서 사각형 드래그
2. 그려진 영역이 벡터 레이어로 맵에 표시 (파선, 연한 파란색)
3. 검색 시 AOI가 설정되어 있으면 `intersects` 파라미터 사용 (bbox보다 우선)
4. "초기화" 버튼으로 AOI 삭제

**주의**: `createBox()`는 `ol/interaction/Draw`에서 named export. `import { createBox } from 'ol/interaction/Draw'` 로 import.

**관련 코드**: `src/stacUI.js`, `src/stac.js`

---

## #53: 테스트 그룹화 및 변경 기반 선택적 테스트 실행

**배경**: push마다 모든 Playwright 테스트가 일괄 실행되어 CI 시간이 길어짐.

**해결**:
1. Playwright config에 4개 프로젝트로 테스트 그룹화:
   - `core`: 페이지 로드 (01-page-load)
   - `map-interaction`: 팬/줌 (02-map-pan, 03-map-zoom)
   - `cog-rendering`: COG 렌더링 (05~08)
   - `state`: 상태 스냅샷 (04-detailed-state)
2. CI에서 `dorny/paths-filter`로 변경 경로 감지:
   - `src/main.js`, `index.html` 변경 → 전체 테스트
   - `src/cogLayer.js` 등 변경 → `cog-rendering` 그룹만
   - `src/auth*.js` 변경 → auth 테스트만
3. auth 테스트는 별도 config(`playwright.auth.config.js`)로 유지

**관련 코드**: `playwright.config.js`, `.github/workflows/deploy.yml`

---

## #33: OAuth/인증 메일에 Supabase 도메인 노출

**증상**: OAuth 로그인 시 `xxx.supabase.co`가 표시되고, 인증 메일 발신자가 Supabase로 표시됨.

**해결**: 코드 변경 아님. Supabase Dashboard 설정으로 해결:
1. **Settings → General**: 프로젝트 이름을 `COGnito`로 변경
2. **Authentication → Email Templates**: 이메일 내용 커스터마이징
3. **(선택) Settings → Auth → SMTP**: 커스텀 SMTP로 자체 발신 주소 사용
4. **(유료) Settings → Custom Domains**: 커스텀 도메인 설정

자세한 가이드는 `docs/SETUP.md` 6번 참조.

**관련 코드**: 없음 (인프라 설정)

---

## #109: 줌 아웃 시 영상 늘어남/잘림 (zoom < 10)

**증상**: 특정 COG 영상(예: SkySat Harvey)을 줌 레벨 10 미만으로 줌 아웃하면 영상이 늘어나고 바깥 부분이 잘림.

**원인 분석**:
- `applyAffineBypass`의 extra 레벨에서 `renderTileSize`가 고정([256, 256])
- `dstResolutions`는 `scaleX`만 사용하여 계산되지만, UTM→EPSG:3857 등 투영 변환에서 X/Y 스케일이 다름
- 결과: 타일의 지리적 영역이 실제 영상 extent보다 크게 잡히고, overview 텍스처가 큰 타일 영역으로 늘어나 매핑
- `layer.extent`가 영상 범위로 클리핑하면서 늘어난 부분이 잘려 보임

**해결**:
cap된 extra 레벨에서 `renderTileSize`를 extent와 resolution으로부터 역산:
```js
const renderW = Math.max(1, Math.ceil(extW / r))
const renderH = Math.max(1, Math.ceil(extH / r))
```
이렇게 하면 1개 타일이 정확히 영상 extent를 덮어, X/Y 스케일 차이와 무관하게 왜곡이 발생하지 않음.

**관련 코드**: `src/cogLayer.js` — `applyAffineBypass()` extra 레벨 생성부

---

## v1.0.0 릴리스 전 보안 점검

**수정된 보안 이슈**:

1. **viewerMeta.js XSS**: `innerHTML`로 메타데이터(파일명, CRS)를 직접 삽입하던 코드를 `textContent` + `createTextNode` 기반 DOM 구성으로 교체
2. **catalog.js 검색 인젝션**: PostgREST 필터 연산자 주입 방지를 위해 검색어에서 특수문자(`%_,().*`) 제거
3. **stacUI.js 썸네일 URL XSS**: `<img src>` 속성에 `escapeHtml()` 적용
4. **registerUI.js null guard**: `meta.bands`가 없을 때 `join()` 오류 방지
5. **프로덕션 로그 제거**: `cogLayer.js`, `cogImageLayer.js`의 `console.log` 제거
6. **중복 import 정리**: `main.js`에서 `registerUI.js` import 통합
