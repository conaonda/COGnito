# v2-roadmap Planning Document

> **Summary**: v1.0 → v2.0 큐레이션 카탈로그 플랫폼으로의 진화 로드맵
>
> **Project**: COGnito
> **Version**: 1.0.0
> **Author**: conaonda
> **Date**: 2026-02-26
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

COGnito를 단순 COG 뷰어/카탈로그에서 **의미 있는 위성영상을 자동으로 선별·설명·큐레이션하는 플랫폼**으로 진화시킨다. 사용자가 STAC에서 직접 검색하는 것보다 COGnito 카탈로그가 더 유용하도록 만든다.

### 1.2 Background

현재 STAC 검색으로 수집되는 영상의 대부분은 사용자에게 의미가 없다:
- 타일링된 영상의 모서리 (빈 영역이 대부분)
- 과노출/백색 영상
- 바다 한가운데 구름만 보이는 영상

로드맵의 "콘텐츠 철학"에 명시된 대로, *"포맷이 맞으면 수집"이 아니라 "사람들과 나눌 가치가 있는 영상"*을 수집해야 한다. 이를 자동화하려면 영상을 이해하고 설명할 수 있는 하위 서비스가 필요하다.

### 1.3 Related Documents

- 로드맵: `docs/ROADMAP.md`
- 사용자 가이드: `docs/USER_GUIDE.md`
- 뷰어 강화 Plan: `docs/01-plan/features/viewer-enhancement.plan.md`

---

## 2. Scope

### 2.1 In Scope

- [ ] v1.1: 뷰어 강화 + 안정화 (밴드/컬러맵 UI, HTTP 캐싱, 테스트 커버리지)
- [ ] v1.2: 영상 설명 서비스 (Image Descriptor) — 독립 백엔드
- [ ] v1.3: 영상 큐레이션 서비스 (Image Curator) — 자동 수집 파이프라인
- [ ] v1.4: 큐레이션 카탈로그 UI
- [ ] v2.0: 큐레이션 플랫폼 완성 + 자동화 + 피드백 루프

### 2.2 Out of Scope

- 자체 위성영상 호스팅 (COG 원본은 외부 소스 유지)
- 유료 AI API 사용 (Google AI Studio Pro 구독 범위 내에서 운영)
- 실시간 영상 처리 (배치 처리 기반)
- 모바일 앱

---

## 3. Milestones

### 3.1 v1.1.0 — 뷰어 강화 + 안정화

현재 진행 중인 이슈들을 정리하고 v2.0 기반을 다진다.

| ID | 항목 | 관련 이슈 | Priority |
|----|------|-----------|----------|
| v1.1-01 | 밴드 선택 / 컬러맵 / Min-Max 스트레치 UI | PR #91 | High |
| v1.1-02 | COG HTTP 요청 캐싱 (URL + Range 키) | #94 | Medium |
| v1.1-03 | 카탈로그 목록 썸네일 표시 | #95 | Medium |
| v1.1-04 | v1.0.0 GitHub Release 생성 | #96 | High |
| v1.1-05 | 테스트 커버리지 수치 제공 | #97 | Medium |

**검증 기준:**
- 뷰어 컨트롤 (밴드/컬러맵/스트레치) E2E 테스트 통과
- 카탈로그 목록에 썸네일 표시
- 테스트 커버리지 리포트 생성 확인

---

### 3.2 v1.2.0 — 영상 설명 서비스 (Image Descriptor)

독립 백엔드 서비스로 영상에 대한 풍부한 설명을 자동 생성한다.

| ID | 항목 | Priority |
|----|------|----------|
| v1.2-01 | 독립 백엔드 서비스 프로젝트 구성 (Python) | High |
| v1.2-02 | 역지오코딩 모듈 (좌표 → 국가/지역/행정구역) | High |
| v1.2-03 | 피복분류 모듈 (좌표 → OSM/VersaTiles 벡터지도 조회) | High |
| v1.2-04 | Gemini Vision 영상 설명 생성 (썸네일 + 좌표 + 촬영일자 입력) | High |
| v1.2-05 | 웹 검색 기반 시기별 맥락 조사 모듈 | Medium |
| v1.2-06 | API 엔드포인트 설계 (REST) | High |
| v1.2-07 | COGnito 프론트엔드 연동 (설명 표시) | Medium |

**아키텍처:**
```
[COGnito Frontend]
       │
       ▼
[Image Descriptor API]  (Python, 독립 서비스)
       │
       ├── Reverse Geocoder (Nominatim / 자체 캐시)
       ├── Land Cover Lookup (OSM Overpass / VersaTiles)
       ├── Image Describer (Google AI Studio — Gemini Vision)
       └── Context Researcher (웹 검색 API)
```

**입력/출력:**
```
입력:
  - thumbnail: 최하위 피라미드 이미지 (base64 or URL)
  - coordinates: [lon, lat] 또는 bbox
  - captured_at: 촬영일자 (ISO 8601)

출력:
  - description: 자연어 설명문
  - location:
      country: 국가
      region: 지역/행정구역
      place_name: 지명
  - land_cover:
      classes: [{type, percentage}]  # OSM/VersaTiles 벡터 기반
  - context:
      events: [{title, date, source_url}]  # 시기별 맥락
```

**검증 기준:**
- 좌표 입력 → 국가/지역 반환 정확도 95%+
- 피복분류 벡터 조회 응답 시간 < 2초
- Gemini Vision 설명 생성 성공률 90%+
- API 엔드포인트 호출 → 전체 설명 JSON 반환

---

### 3.3 v1.3.0 — 영상 큐레이션 서비스 (Image Curator)

설명 서비스의 출력을 기반으로 영상의 의미도를 판정하고 자동 수집한다.

| ID | 항목 | Priority |
|----|------|----------|
| v1.3-01 | 영상 품질 필터 (모서리/백색/해양구름 탐지) | High |
| v1.3-02 | 의미도 점수 산정 로직 설계 | High |
| v1.3-03 | 자동 수집 파이프라인 (STAC → Descriptor → Curator → DB) | High |
| v1.3-04 | 수집 스케줄러 (배치 처리) | Medium |
| v1.3-05 | 수집 로그/모니터링 | Medium |

**품질 필터 (reject 기준):**
- 유효 픽셀 비율 < 70% (타일 모서리)
- 평균 밝기 > 임계값 (과노출/백색)
- 피복분류 결과가 "해양" 95%+ 이고 구름 커버리지 높음

**의미도 점수 (0–100):**
```
score = w1 * location_interest      # 인구밀집/관광지/주요시설 근접도
      + w2 * event_relevance        # 해당 시기 이벤트 존재 여부
      + w3 * visual_diversity       # 피복분류 다양성
      + w4 * image_quality          # 해상도, 구름 커버리지
      + w5 * temporal_uniqueness    # 동일 지역 기존 영상과의 시간 차이
```

**검증 기준:**
- 모서리/백색/해양구름 영상 필터링 정확도 90%+
- 수집 파이프라인 end-to-end 동작 (STAC 검색 → 설명 생성 → 점수 산정 → DB 저장)
- 점수 50 미만 영상 자동 reject

---

### 3.4 v1.4.0 — 큐레이션 카탈로그 UI

큐레이션된 영상의 풍부한 정보를 사용자에게 제공하는 UI.

| ID | 항목 | Priority |
|----|------|----------|
| v1.4-01 | 영상 설명문/맥락 표시 UI (카드 확장 또는 상세 페이지) | High |
| v1.4-02 | 피복분류/지역 정보 시각화 | Medium |
| v1.4-03 | 의미도 점수 기반 정렬/필터 | High |
| v1.4-04 | "이 영상이 흥미로운 이유" 섹션 | Medium |
| v1.4-05 | 큐레이션 카탈로그 vs STAC 검색 탭 분리 | Medium |

**검증 기준:**
- 카탈로그에서 영상 설명/맥락/피복분류 정보 표시
- 의미도 점수 순 정렬 동작
- 큐레이션 카탈로그의 영상이 STAC 원시 결과보다 체감 품질 우수

---

### 3.5 v2.0.0 — 큐레이션 플랫폼 완성

| ID | 항목 | Priority |
|----|------|----------|
| v2.0-01 | 수집 파이프라인 자동화 + 모니터링 대시보드 | High |
| v2.0-02 | 사용자 피드백 루프 (좋아요/신고 → 점수 보정) | High |
| v2.0-03 | 큐레이션 통계 (수집률, reject률, 인기 지역 등) | Medium |
| v2.0-04 | 전체 안정화 + 문서화 + 릴리스 | High |

**검증 기준:**
- 자동 수집 파이프라인이 일정 주기로 무인 동작
- 사용자 좋아요/신고가 향후 수집 점수에 반영
- 큐레이션 카탈로그 영상 100건+ 확보
- v2.0 릴리스 완료

---

## 4. Requirements

### 4.1 Functional Requirements

| ID | Requirement | Milestone | Priority |
|----|-------------|-----------|----------|
| FR-01 | 좌표+촬영일자 입력 → 역지오코딩 결과 반환 | v1.2 | High |
| FR-02 | 좌표 기반 피복분류 조회 (OSM/VersaTiles) | v1.2 | High |
| FR-03 | 썸네일+메타데이터 → Gemini Vision 자연어 설명 생성 | v1.2 | High |
| FR-04 | 시기+지역 기반 웹 검색 맥락 조사 | v1.2 | Medium |
| FR-05 | 영상 품질 자동 필터링 (모서리/백색/구름) | v1.3 | High |
| FR-06 | 의미도 점수 산정 및 수집 판정 | v1.3 | High |
| FR-07 | STAC → Descriptor → Curator → DB 파이프라인 | v1.3 | High |
| FR-08 | 큐레이션 정보 UI 표시 | v1.4 | High |
| FR-09 | 사용자 피드백 기반 점수 보정 | v2.0 | High |

### 4.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| 비용 | Gemini Vision — Google AI Studio Pro 구독 범위 내 | 월별 API 호출량 모니터링 |
| 비용 | 역지오코딩/피복분류 — 무료 서비스 활용 | OSM Nominatim, Overpass API |
| 성능 | 단일 영상 설명 생성 < 30초 | API 응답 시간 측정 |
| 가용성 | 수집 파이프라인 실패 시 재시도 + 알림 | 로그 모니터링 |
| 확장성 | 일 1000건 이상 영상 처리 가능 | 배치 처리 벤치마크 |

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Google AI Studio API 할당량 초과 | High | Medium | 배치 처리 속도 제한, 캐싱, 일일 할당량 모니터링 |
| OSM Nominatim 사용 정책 위반 (과다 요청) | Medium | Medium | 자체 캐시 구축, 요청 속도 제한 (1 req/sec) |
| 의미도 점수의 주관성 | Medium | High | 사용자 피드백 루프로 지속 보정, 초기에는 보수적 기준 |
| 독립 백엔드 인프라 비용 | Medium | Low | 초기 최소 인프라 (단일 서버), 트래픽에 따라 스케일 |
| Gemini Vision 설명 품질 불안정 | Medium | Medium | 프롬프트 최적화, 설명 품질 샘플링 검증 |

---

## 6. Architecture Considerations

### 6.1 Project Level

| Level | Selected |
|-------|:--------:|
| **Starter** (COGnito Frontend — 기존) | ✅ |
| **Dynamic** (Image Descriptor Backend — 신규) | ✅ |

COGnito 프론트엔드는 기존 Vite + OpenLayers 유지. 신규 백엔드 서비스는 별도 프로젝트로 구성.

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 백엔드 언어 | Python / Node.js | Python | Gemini SDK, 지리공간 라이브러리 풍부 |
| 역지오코딩 | Nominatim / Google Geocoding / Photon | Nominatim (자체 캐시) | 무료, OSM 기반, 셀프호스팅 가능 |
| 피복분류 | OSM Overpass / VersaTiles / CORINE | OSM + VersaTiles | 무료, 글로벌 커버리지, 벡터 기반 |
| 영상 설명 LLM | Gemini Vision / Claude / GPT-4V | Gemini Vision | Google AI Studio Pro 구독 중, 비용 무료 |
| 웹 검색 | Google Search API / SerpAPI / DuckDuckGo | 검토 필요 | 무료/저비용 옵션 우선 |
| 프론트↔백엔드 | REST / GraphQL | REST | 단순, 기존 패턴과 일관 |

### 6.3 서비스 아키텍처

```
┌──────────────────────────────────────────────────────┐
│ COGnito Frontend (Vite + OpenLayers)                 │
│   ├── 카탈로그 UI (큐레이션 정보 표시)                    │
│   ├── 뷰어 (밴드/컬러맵 컨트롤)                         │
│   └── Supabase Client (Auth, DB)                     │
└──────────────┬───────────────────────────────────────┘
               │ REST API
┌──────────────▼───────────────────────────────────────┐
│ Image Descriptor Service (Python)                     │
│   ├── /describe  — 영상 설명 생성                       │
│   ├── /geocode   — 역지오코딩                           │
│   ├── /landcover — 피복분류 조회                        │
│   └── /context   — 시기별 맥락 조사                     │
├───────────────────────────────────────────────────────┤
│ Image Curator Service (Python, 동일 서비스 또는 모듈)    │
│   ├── /evaluate  — 의미도 점수 산정                     │
│   ├── /filter    — 품질 필터                            │
│   └── /pipeline  — 수집 파이프라인 트리거                 │
├───────────────────────────────────────────────────────┤
│ External Dependencies                                 │
│   ├── Google AI Studio (Gemini Vision)                │
│   ├── OSM Nominatim (역지오코딩)                       │
│   ├── OSM Overpass / VersaTiles (피복분류)             │
│   ├── Web Search API (맥락 조사)                       │
│   └── STAC APIs (Earth Search, Planetary Computer)    │
└───────────────────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────┐
│ Supabase (DB + Auth + Storage)                        │
│   ├── cog_images (+ description, score 컬럼 추가)      │
│   ├── image_descriptions (설명 상세)                    │
│   └── curation_logs (수집/필터 이력)                    │
└───────────────────────────────────────────────────────┘
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` 코딩 컨벤션 존재
- [ ] 백엔드 서비스 컨벤션 미정 (Python 프로젝트 신규)
- [x] Playwright 테스트 구성
- [ ] 백엔드 테스트 프레임워크 미정

### 7.2 신규 결정 필요 사항

| Category | 결정 필요 사항 | Priority |
|----------|---------------|:--------:|
| 백엔드 프레임워크 | FastAPI / Flask / Django | High |
| 패키지 관리 | pip / poetry / uv | Medium |
| 백엔드 배포 | Docker / 클라우드 서비스 | High |
| 모노레포 vs 멀티레포 | 프론트/백엔드 분리 방식 | High |

### 7.3 Environment Variables (신규)

| Variable | Purpose | Scope |
|----------|---------|-------|
| `GOOGLE_AI_API_KEY` | Gemini Vision API 키 | Backend |
| `SUPABASE_SERVICE_KEY` | Supabase 서비스 키 (백엔드 DB 접근) | Backend |
| `NOMINATIM_URL` | Nominatim 엔드포인트 (셀프호스팅 시) | Backend |

---

## 8. Next Steps

1. [ ] v1.1 마일스톤 이슈 정리 및 진행 (현재 PR #91 포함)
2. [ ] v1.2 영상 설명 서비스 Design 문서 작성 (`/pdca design image-descriptor`)
3. [ ] 백엔드 기술 스택 최종 결정 (프레임워크, 배포 방식)
4. [ ] ROADMAP.md 업데이트 (v2.0 마일스톤 반영)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-26 | Initial draft | conaonda |
