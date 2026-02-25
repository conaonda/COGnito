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

**주의**: `createBox()`는 ol/interaction/Draw의 static 메서드. `Draw.createBox()` 형식으로 호출.

**관련 코드**: `src/stacUI.js`, `src/stac.js`
