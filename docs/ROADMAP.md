# COGnito v1.0 로드맵

## 비전

COG URL을 직접 입력하는 단순 뷰어에서, **공개 COG 영상을 자동 수집·탐색·공유할 수 있는 플랫폼**으로 진화한다.

## 현재 상태 (v0.1.0)

순수 클라이언트 COG 뷰어. 백엔드·DB·사용자 관리 없음.

- WebGLTile + ImageCanvas 이중 렌더링 파이프라인
- Affine + Reproject 이중 투영 모드
- 밴드 자동 감지 (RGB/Grayscale)
- 모바일 최적화 (품질 토글)
- Playwright 성능 테스트 8종
- CI/CD (GitHub Pages 자동 배포, PR 프리뷰)

---

## 아키텍처 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| 백엔드 | Supabase (BaaS) | 서버 코드 최소화. Auth/DB/Storage 통합. 오픈소스. |
| 인증 | GitHub·Google OAuth | 별도 회원가입 불필요. Supabase Auth 기본 지원. |
| COG 수집 | STAC 자동 + 수동 등록 | STAC은 표준 API로 확장성 확보, 수동 등록은 유연성 확보. |
| 프론트엔드 | 기존 Vite + OpenLayers 유지 | 안정적인 기존 뷰어 위에 기능 확장. |

---

## 마일스톤

### v0.2.0 — BaaS 인프라 + 인증

Supabase 연동과 소셜 로그인으로 사용자 기능의 토대를 놓는다.

**스코프:**

- Supabase 프로젝트 설정 (DB, Auth, Storage)
- GitHub/Google OAuth 소셜 로그인
- 로그인/로그아웃 UI (헤더 영역)
- DB 스키마 설계 및 마이그레이션

**DB 스키마 (초안):**

```
users
  id, provider, display_name, avatar_url, created_at

cog_images
  id, url, title, description, source_type (stac|manual),
  crs, bands, bbox, thumbnail_url, metadata_json, created_at

likes
  user_id, cog_image_id, created_at

watchlists
  id, user_id, name, created_at

watchlist_items
  watchlist_id, cog_image_id, added_at
```

**검증 기준:**
- GitHub/Google 로그인 → 사용자 프로필 표시 → 로그아웃 흐름 동작
- Supabase 대시보드에서 테이블 생성 확인

---

### v0.3.0 — COG 카탈로그

공개 COG 영상을 수집·저장·탐색하는 카탈로그 시스템을 구축한다.

**스코프:**

- STAC API 클라이언트 구현 (Element84 Earth Search, Planetary Computer 등)
- STAC 검색 결과에서 COG 메타데이터 자동 추출 (CRS, 밴드, 해상도, bbox)
- 수동 COG URL 등록 폼 (URL 입력 → 메타데이터 자동 파싱 → DB 저장)
- 카탈로그 브라우징 UI (그리드 뷰, 검색, 필터)
- 썸네일 자동 생성 (overview 이미지 활용)

**검증 기준:**
- STAC 검색 → 결과 목록 표시 → COG 선택 → 뷰어에서 렌더링
- 수동 URL 등록 → DB 저장 → 카탈로그에 표시
- 카탈로그에서 키워드 검색 및 필터링 동작

---

### v0.4.0 — 소셜 기능 + 공유

좋아요·관심 목록·공유로 사용자 참여와 재방문을 유도한다.

**스코프:**

- 좋아요(Like) 토글 (로그인 필수)
- 관심 목록(Watchlist) CRUD (생성, 이미지 추가/제거, 삭제)
- 인기순/최신순 정렬
- 공유 URL 생성 (뷰 상태 인코딩: COG URL, 중심 좌표, 줌 레벨)
- 딥 링크 지원 (공유 URL로 접근 시 동일 뷰 복원)

**검증 기준:**
- 로그인 → COG 좋아요 → 좋아요 수 반영 → 인기순 정렬 반영
- 관심 목록 생성 → 이미지 추가 → 목록에서 조회 → 클릭으로 뷰어 이동
- 공유 URL 복사 → 새 탭에서 열기 → 동일 뷰 상태 복원

---

### v0.5.0 — 뷰어 강화

시각화 제어 옵션을 추가하여 뷰어의 실용성을 높인다.

**스코프:**

- 밴드 선택 UI (R/G/B 채널에 임의 밴드 매핑)
- 컬러맵 적용 (Grayscale, Viridis, Inferno 등)
- Min/Max 스트레치 슬라이더
- 투영 모드 UI 토글 (Affine ↔ Reproject)

**검증 기준:**
- 다중 밴드 COG에서 밴드 조합 변경 → 렌더링 반영
- Grayscale COG에 컬러맵 적용 → 시각적 변화 확인
- Min/Max 슬라이더 조작 → 실시간 렌더링 업데이트

---

### v0.6.0 — 오프라인/캐싱 + 안정화

Service Worker를 통한 오프라인 지원과 전반적인 품질 안정화.

**스코프:**

- Service Worker 구현 (앱 셸 캐싱, 타일 캐싱 전략)
- 오프라인 상태 감지 및 폴백 UI
- 에러 처리 개선 (CORS 안내, 네트워크 재시도, 로딩 프로그레스)
- 유닛 테스트 추가 (핵심 모듈: cogLayer, cogImageLayer, STAC 클라이언트)
- 신규 기능 E2E 테스트 (카탈로그, 소셜 기능, 공유)

**검증 기준:**
- 한 번 방문한 COG → 네트워크 끊김 → 캐시된 타일 표시
- 오프라인 상태에서 적절한 안내 메시지 표시
- 유닛 테스트 + E2E 테스트 전체 통과

---

### v1.0.0 — 정식 릴리스

안정화·최적화·문서화를 거쳐 정식 릴리스한다.

**스코프:**

- 성능 프로파일링 및 최적화 (번들 크기, 초기 로딩 속도)
- 접근성(A11y) 기본 대응 (키보드 내비게이션, ARIA 레이블)
- 사용자 가이드 문서 작성
- 베타 테스트 피드백 반영
- 최종 버그 수정 및 릴리스

**검증 기준:**
- Lighthouse 성능 점수 80 이상
- 핵심 사용자 플로우 전체 E2E 테스트 통과
- 주요 브라우저 (Chrome, Firefox, Safari) 호환성 확인

---

## 요약

```
v0.1.0  현재 ─ 순수 클라이언트 COG 뷰어
  │
v0.2.0  BaaS 인프라 + 소셜 로그인
  │
v0.3.0  COG 카탈로그 (STAC + 수동 등록)
  │
v0.4.0  소셜 기능 (좋아요/관심목록) + 공유
  │
v0.5.0  뷰어 강화 (밴드/컬러맵 컨트롤)
  │
v0.6.0  오프라인/캐싱 + 안정화
  │
v1.0.0  정식 릴리스
```
