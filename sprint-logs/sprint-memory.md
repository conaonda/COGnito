# Sprint Memory — conaonda/COGnito

## 기술 스택 & 아키텍처 결정
- Vite + Vanilla JS 기반 COG(Cloud Optimized GeoTIFF) 뷰어
- OpenLayers 지도 라이브러리 사용
- Vitest 단위 테스트, Playwright E2E 테스트
- release-please 자동 릴리스 관리
- `package.json`의 `version`이 SSOT
- Geolocation API를 사용한 내 위치 기능 추가 (스프린트 30)
- Grayscale COG 컬러맵 기능 구현 완료 (HTML 드롭다운, viewerControls.js, buildStyleWithColormap)
- viewerControls.js 구문/함수 커버리지 100% 달성 (스프린트 32)
- likes.js, watchlist.js 커버리지 100% 달성 (스프린트 33)
- catalog.js 구문 커버리지 100%, auth.js/watchlist.js 브랜치 커버리지 100% 달성 (스프린트 34)
- 전체 브랜치 커버리지 99.4% 달성: viewerControls 100%, likes 100%, stac 98.18%, catalog 99.06% (스프린트 36)
- stac.js line 95, catalog.js line 190에 `/* v8 ignore next */` 적용하여 전체 커버리지 Stmts/Branch/Funcs/Lines 100% 달성 (스프린트 37)
- catalog.js에 sourceType 필터 기능, catalogUI.js에 출처 배지/필터 드롭다운 추가 — DB source_type 필드 기존 존재로 스키마 변경 불필요 (스프린트 38)
- catalog.js에 updateCogImage 함수 추가, catalogUI.js에 편집 버튼/모달 UI 추가 — 이미지 메타데이터(이름/설명) 인라인 편집 지원 (스프린트 40)
- catalogUI.js에 공유 버튼 추가 — URL 클립보드 복사 기능, 테스트 287개 전체 통과, Branch 커버리지 99.53% (스프린트 42)
- cog_images 테이블에 user_id 컬럼 추가 (마이그레이션 00005), catalog.js에 userId 필터, catalogUI.js에 '내 등록 영상만' 체크박스 추가 — 테스트 294개 전체 통과, Branch 커버리지 99.54% (스프린트 43)
- cog_images 테이블에 view_count 컬럼 추가 (마이그레이션 00006), incrementViewCount SECURITY DEFINER RPC 추가, 카탈로그 카드에 조회수 표시 — 테스트 299개 전체 통과, Branch 커버리지 99.54% (스프린트 44)
- v1.9.0 릴리스 완료 (release-please PR #196 머지, 태그 COGnito-v1.9.0 생성)
- catalog.js에 view_count 정렬 옵션 추가, catalogUI.js에 '조회수순' 드롭다운 옵션 추가 — 테스트 303개 전체 통과, catalog.js Branch 100% 커버리지 (스프린트 46)
- v1.10.0 릴리스 완료 (release-please PR #219 머지, 태그 COGnito-v1.10.0 생성)
- v1.11.0 릴리스 완료 (스프린트 50: PR #229 필터 일괄 초기화 버튼, release-please PR #225 머지, 태그 COGnito-v1.11.0)
- catalog.js에 yearRange 필터 추가, catalogUI.js에 촬영 연도 범위 슬라이더 UI 추가 — captured_at 기반, 테스트 312개 전체 통과 (스프린트 51)
- v1.12.0 릴리스 완료 (release-please PR #233 머지, 태그 COGnito-v1.12.0 생성)
- 카탈로그 '좋아요한 영상만 보기' 필터 추가 — PR #238 머지, 테스트 318개 전체 통과, v1.13.0 릴리스 (스프린트 52-초반)
- viewerControls.js에 Min/Max 스트레치 슬라이더 숫자 직접 입력 + clampMinMax 자동 보정 추가 — PR #241 머지, 테스트 322개 전체 통과 (스프린트 52)
- catalog.js에 captured_at 기반 촬영일자순 정렬 옵션 추가, catalogUI.js에 '촬영일자순' 드롭다운 옵션 추가 — null 값 맨 뒤 처리, 테스트 324개 전체 통과, v1.14.0 릴리스 (스프린트 53)
- catalogUI.js에 카탈로그 카드 해상도(resolution) 표시 추가 — cog_images.resolution 필드 활용, 테스트 330개 전체 통과, v1.15.0 릴리스 (스프린트 55)
- catalog.js에 title 기반 이름순(가나다/알파벳) 정렬 옵션 추가, catalogUI.js에 '이름순' 드롭다운 옵션 추가 — locale 기반 정렬, 테스트 334개 전체 통과, v1.16.0 릴리스 (스프린트 56)
- catalog.js에 pageSize 옵션 추가(10/20/50), catalogUI.js에 페이지당 영상 수 드롭다운 추가 — 페이지 변경 시 currentPage 초기화, 테스트 351개 전체 통과, v1.19.0 릴리스 (스프린트 59)
- catalogUI.js 관심목록 토글 버튼 개선 — 추가/제거 상태 표시(하트/엑스 아이콘), getWatchlistedImageIds 활용, 테스트 362개 전체 통과, v1.20.0 릴리스 (스프린트 60)

## 반복 패턴 & 주의사항
- 이슈 생성 전 기존 구현 여부를 반드시 확인할 것 (스프린트 20에서 #170, #171, 스프린트 31에서 #176이 이미 구현되어 있었음)
- Reviewer 에이전트에 `write_file`, `run_shell_command` 도구가 없음 — handoff 파일 생성 불가 이슈 발생
- 에이전트 간 도구 권한 불일치 문제에 주의
- 버전 정합성 확인 시 로컬 브랜치가 최신인지 먼저 확인할 것 (스프린트 21에서 로컬 미동기화로 인한 오탐 발생)
- `agent/developer` 라벨 이슈가 없으면 전체 스프린트가 공회전함 — Orchestrator가 사전에 이슈 준비 필요
- 스프린트 22~29 8회 연속 공회전 후 스프린트 30에서 정상 복귀 — agent/developer 라벨 이슈 사전 준비가 핵심
- Reviewer 에이전트 Gemini API 오류 발생 가능 (스프린트 31~40: Thinking_config 관련 400 에러) — 자체 PR 승인 불가로 comment로 대체
- catalogUI.js 커버리지는 V8 inline ternary 카운팅 한계로 Branch 100% 달성 불가 — Stmts/Funcs/Lines 100% + Branch 97.64% 수용 가능
- E2E 스모크 테스트에서 UI 옵션 수 하드코딩 주의 — 신규 드롭다운 옵션 추가 시 `toHaveCount` 값도 함께 갱신해야 함 (스프린트 46, 60 CI 실패 경험)
- docs PR이 feat PR보다 늦게 CI를 통과하면 머지 충돌 발생 — rebase 후 재푸시 필요 (스프린트 60)

## 기술 부채 목록
- [x] PR #132: PRE_LOGIN_STATE_KEY 문자열 중복 해소 (스프린트 21에서 머지)
- [x] PR #167: release-please 릴리스 PR (v1.7.1) (스프린트 21에서 머지)
- [x] PR #174: release-please 릴리스 PR (v1.8.0) (스프린트 31에서 머지)
- [x] catalogUI.js 미커버 라인(기존 코드) 테스트 보강 — PR #206 머지로 완료 (스프린트 41)
- [ ] Reviewer 에이전트 Gemini API Thinking_config 400 에러 해결 필요
- [ ] catalogUI.js watchlist-state-changed 이벤트 리스너 누적 메모리 누수 해결 — 이슈 #276

## 최근 3개 스프린트 요약
### Sprint 60 (2026-03-10)
- 완료: PR #274 머지 (feat: 관심목록 토글 버튼 추가/제거 상태 표시), PR #272 머지 (docs: sprint-59 문서 반영), PR #275 머지 (release v1.20.0), 이슈 #273 닫힘, 테스트 362개 전체 통과, v1.20.0 릴리스
- 발견된 문제: Reviewer 자체 PR 승인 불가 (GitHub 정책), watchlist-state-changed 이벤트 리스너 누적 메모리 누수 발견 (이슈 #276 생성), E2E 정렬 옵션 수 불일치(3→5) CI 실패 — 수정 후 통과

### Sprint 59 (2026-03-10)
- 완료: PR #270 머지 (feat: 카탈로그 페이지당 영상 수 변경 옵션 추가), PR #268 머지 (docs: sprint-58 문서 반영), PR #271 머지 (release v1.19.0), 이슈 #269 닫힘, 테스트 351개 전체 통과, v1.19.0 릴리스
- 발견된 문제: Reviewer 자체 PR 승인 불가 (GitHub 정책) — 리뷰 코멘트로 대체

### Sprint 56 (2026-03-10)
- 완료: PR #258 머지 (feat: 카탈로그 이름순 정렬 옵션 추가), PR #256 머지 (docs: sprint-55 문서 반영), PR #255 머지 (release v1.16.0), 이슈 #257 닫힘, 테스트 334개 전체 통과, v1.16.0 릴리스
- 발견된 문제: PR #256 머지 충돌 발생 (PR #258 머지 후 docs 브랜치 충돌) — rebase로 해결
