# Image Descriptor Service Design Document

> **Summary**: COG 영상의 좌표/촬영일자/썸네일로부터 자연어 설명, 위치정보, 피복분류, 시기별 맥락을 생성하는 독립 백엔드 서비스
>
> **Project**: COGnito
> **Version**: 1.0.0 → v1.2.0 target
> **Author**: conaonda
> **Date**: 2026-02-26
> **Status**: Draft
> **Planning Doc**: [v2-roadmap.plan.md](../01-plan/features/v2-roadmap.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- COG 영상에 대한 풍부한 메타데이터를 자동 생성하는 독립 백엔드 서비스 구축
- 무료/저비용 외부 서비스 활용으로 운영 비용 최소화
- COGnito 프론트엔드와 REST API로 연동
- 향후 큐레이션 서비스(v1.3)의 기반이 되는 설명 데이터 제공

### 1.2 Design Principles

- **비용 효율**: 무료 서비스 우선 (Nominatim, Overpass), 유료는 기존 구독(Google AI Studio) 범위 내
- **모듈화**: 역지오코딩, 피복분류, 영상설명, 맥락조사를 독립 모듈로 분리
- **캐싱 우선**: 동일 좌표/지역에 대한 반복 요청 최소화
- **점진적 실패**: 개별 모듈 실패 시 나머지 결과는 정상 반환

---

## 2. Architecture

### 2.1 Component Diagram

```
┌───────────────────────────────────────────────────┐
│ COGnito Frontend (Vite + OpenLayers)              │
│   catalog.js / catalogUI.js                       │
└──────────────┬────────────────────────────────────┘
               │ POST /api/describe
               ▼
┌───────────────────────────────────────────────────┐
│ Image Descriptor Service (Python / FastAPI)        │
│                                                    │
│  ┌─────────────┐  ┌──────────────┐                │
│  │  Geocoder    │  │ LandCover    │                │
│  │  Module      │  │ Module       │                │
│  │ (Nominatim)  │  │ (Overpass)   │                │
│  └──────┬───────┘  └──────┬───────┘                │
│         │                 │                        │
│  ┌──────▼─────────────────▼──────┐                 │
│  │       Response Composer       │                 │
│  └──────▲─────────────────▲──────┘                 │
│         │                 │                        │
│  ┌──────┴───────┐  ┌──────┴───────┐                │
│  │  Describer   │  │  Context     │                │
│  │  Module      │  │  Researcher  │                │
│  │ (Gemini)     │  │ (Web Search) │                │
│  └──────────────┘  └──────────────┘                │
│                                                    │
│  ┌─────────────────────────────────┐               │
│  │  Cache Layer (SQLite / Redis)   │               │
│  └─────────────────────────────────┘               │
└──────────────┬────────────────────────────────────┘
               │ Supabase Service Key
               ▼
┌───────────────────────────────────────────────────┐
│ Supabase DB                                        │
│   cog_images (기존) + image_descriptions (신규)    │
└───────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
1. 프론트엔드 → POST /api/describe {thumbnail, coordinates, captured_at}
2. Geocoder: coordinates → Nominatim reverse → {country, region, place_name}
3. LandCover: coordinates → Overpass is_in query → {landuse classes}
4. Describer: thumbnail + geocode + landcover → Gemini Vision → {description}
5. Context: place_name + captured_at → Web Search → {events}
6. Composer: 모든 결과 조합 → JSON 응답
7. DB 저장: image_descriptions 테이블에 캐시
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| Geocoder | Nominatim API (public) | 좌표 → 주소 변환 |
| LandCover | Overpass API (public) | 좌표 주변 토지이용 조회 |
| Describer | Google AI Studio (Gemini) | 영상 자연어 설명 생성 |
| Context Researcher | 웹 검색 API (TBD) | 시기별 지역 이벤트 조사 |
| DB Client | Supabase (Service Key) | 설명 결과 저장/조회 |

---

## 3. Data Model

### 3.1 API Request/Response

```python
# Request
class DescribeRequest:
    thumbnail: str          # base64 PNG 또는 URL (최하위 피라미드)
    coordinates: list[float]  # [longitude, latitude]
    bbox: list[float] | None  # [west, south, east, north] (optional)
    captured_at: str        # ISO 8601 촬영일자

# Response
class DescribeResponse:
    description: str        # Gemini 생성 자연어 설명문
    location: Location
    land_cover: LandCover
    context: Context

class Location:
    country: str            # 국가명
    country_code: str       # ISO 3166-1 alpha-2
    region: str             # 광역 행정구역 (state/province)
    city: str | None        # 도시/군/구
    place_name: str         # display_name (전체 주소)
    lat: float
    lon: float

class LandCover:
    classes: list[LandCoverClass]  # 면적 비율 순 정렬
    summary: str                   # "주거지역 45%, 농경지 30%, 산림 25%"

class LandCoverClass:
    type: str               # OSM landuse/natural tag 값 (residential, farmland, forest 등)
    label: str              # 한국어 레이블
    percentage: float | None  # bbox 내 추정 비율 (가능한 경우)

class Context:
    events: list[Event]     # 시기별 이벤트 (최대 5건)
    summary: str            # 이벤트 요약문

class Event:
    title: str
    date: str
    source_url: str
    relevance: str          # "high" | "medium" | "low"
```

### 3.2 DB Schema (신규 테이블)

```sql
-- 영상 설명 캐시 테이블
CREATE TABLE public.image_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cog_image_id UUID REFERENCES public.cog_images(id) ON DELETE CASCADE,
  coordinates DOUBLE PRECISION[2] NOT NULL,  -- [lon, lat]
  captured_at TIMESTAMPTZ,

  -- Geocoding 결과
  country TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  place_name TEXT,

  -- 피복분류 결과
  land_cover_json JSONB,     -- [{type, label, percentage}]
  land_cover_summary TEXT,

  -- Gemini 설명
  description TEXT,

  -- 맥락 조사 결과
  context_json JSONB,        -- [{title, date, source_url, relevance}]
  context_summary TEXT,

  -- 메타
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스
CREATE INDEX idx_image_desc_cog_id ON public.image_descriptions(cog_image_id);
CREATE INDEX idx_image_desc_coords ON public.image_descriptions USING gist (
  point(coordinates[1], coordinates[2])
);
```

### 3.3 cog_images 테이블 확장

```sql
-- 기존 cog_images에 설명 서비스 연동 컬럼 추가
ALTER TABLE public.cog_images
  ADD COLUMN IF NOT EXISTS description_id UUID REFERENCES public.image_descriptions(id),
  ADD COLUMN IF NOT EXISTS significance_score SMALLINT;  -- 0-100, v1.3에서 활용
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/describe` | 영상 설명 생성 (전체) | API Key |
| POST | `/api/geocode` | 역지오코딩만 | API Key |
| POST | `/api/landcover` | 피복분류만 | API Key |
| POST | `/api/context` | 맥락 조사만 | API Key |
| GET | `/api/descriptions/{cog_image_id}` | 캐시된 설명 조회 | None |
| GET | `/api/health` | 헬스체크 | None |

### 4.2 Detailed Specification

#### `POST /api/describe`

통합 엔드포인트. 모든 모듈을 병렬 실행 후 조합하여 반환.

**Request:**
```json
{
  "thumbnail": "data:image/png;base64,iVBOR...",
  "coordinates": [126.978, 37.566],
  "bbox": [126.97, 37.56, 126.99, 37.57],
  "captured_at": "2025-06-15T00:00:00Z",
  "cog_image_id": "uuid-optional"
}
```

**Response (200 OK):**
```json
{
  "description": "서울특별시 중구 일대를 촬영한 위성영상입니다. 도심 중심부로 고층 건물과 도로망이 밀집되어 있으며, 남산과 녹지대가 확인됩니다.",
  "location": {
    "country": "대한민국",
    "country_code": "KR",
    "region": "서울특별시",
    "city": "중구",
    "place_name": "중구, 서울특별시, 대한민국",
    "lat": 37.566,
    "lon": 126.978
  },
  "land_cover": {
    "classes": [
      {"type": "commercial", "label": "상업지역", "percentage": 40},
      {"type": "residential", "label": "주거지역", "percentage": 30},
      {"type": "forest", "label": "산림", "percentage": 20},
      {"type": "road", "label": "도로", "percentage": 10}
    ],
    "summary": "상업지역 40%, 주거지역 30%, 산림 20%, 도로 10%"
  },
  "context": {
    "events": [
      {
        "title": "서울 도심 재개발 사업 본격화",
        "date": "2025-06-10",
        "source_url": "https://example.com/article",
        "relevance": "medium"
      }
    ],
    "summary": "2025년 6월 서울 중구 일대에서 도심 재개발 사업이 진행 중이었습니다."
  },
  "cached": false
}
```

**Error Responses:**
- `400`: 필수 필드 누락 또는 잘못된 좌표
- `422`: 썸네일 디코딩 실패
- `429`: Rate limit 초과
- `500`: 내부 서버 오류
- `503`: 외부 서비스 장애 (Nominatim, Overpass, Gemini)

#### 점진적 실패 (Partial Response)

개별 모듈 실패 시 해당 필드만 null로 반환하고 `warnings` 배열에 실패 사유 포함:

```json
{
  "description": null,
  "location": { "country": "대한민국", ... },
  "land_cover": { ... },
  "context": null,
  "warnings": [
    {"module": "describer", "error": "Gemini API timeout"},
    {"module": "context", "error": "Web search rate limited"}
  ],
  "cached": false
}
```

---

## 5. Module Design

### 5.1 Geocoder Module

**외부 API**: [Nominatim Reverse Geocoding](https://nominatim.org/release-docs/latest/api/Reverse/)

```
GET https://nominatim.openstreetmap.org/reverse
  ?lat=37.566&lon=126.978
  &format=jsonv2
  &accept-language=ko
  &zoom=14
```

**사용 정책 준수:**
- 1 request/sec 속도 제한
- User-Agent 헤더 필수 (`COGnito/1.2`)
- 결과 캐싱 (동일 좌표 ±0.001도 범위는 캐시 히트)

**캐시 전략:**
- 좌표를 소수점 3자리(~111m)로 반올림하여 캐시 키 생성
- TTL: 30일 (지명은 자주 바뀌지 않음)

### 5.2 LandCover Module

**외부 API**: [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)

```
[out:json][timeout:10];
(
  way["landuse"](around:500, 37.566, 126.978);
  way["natural"](around:500, 37.566, 126.978);
  way["leisure"](around:500, 37.566, 126.978);
  relation["landuse"](around:500, 37.566, 126.978);
);
out tags;
```

좌표 중심 반경 500m 내의 landuse/natural/leisure 태그를 조회하여 피복분류 구성.

**OSM 태그 → 한국어 매핑 (주요):**

| OSM tag | 한국어 |
|---------|--------|
| residential | 주거지역 |
| commercial | 상업지역 |
| industrial | 산업지역 |
| farmland | 농경지 |
| forest | 산림 |
| grass/meadow | 초지 |
| water | 수역 |
| wetland | 습지 |
| bare_rock | 나지 |
| road (highway) | 도로 |

**캐시 전략:**
- 좌표를 소수점 2자리(~1.1km)로 반올림하여 캐시 키 생성
- TTL: 90일 (토지이용은 느리게 변화)

### 5.3 Describer Module (Gemini Vision)

**외부 API**: [Google Gemini API](https://ai.google.dev/gemini-api/docs/image-understanding)

```python
import google.generativeai as genai

genai.configure(api_key=os.environ["GOOGLE_AI_API_KEY"])
model = genai.GenerativeModel("gemini-2.0-flash")

response = model.generate_content([
    image_data,  # 썸네일 이미지
    f"""이 위성영상을 분석해주세요.
위치: {place_name} ({country})
촬영일자: {captured_at}
피복분류: {land_cover_summary}

다음을 포함하여 2-3문장으로 설명해주세요:
1. 영상에서 관찰되는 주요 지형/지물
2. 영상의 특이사항이나 주목할 점
3. 이 영상이 흥미로운 이유

한국어로 작성해주세요."""
])
```

**비용 관리:**
- Google AI Studio Pro 구독 범위 내 사용
- gemini-2.0-flash 모델 (빠르고 저렴)
- 배치 처리 시 분당 15 요청 제한
- 캐시: cog_image_id 기준, TTL 없음 (영구 캐시)

### 5.4 Context Researcher Module

**외부 API**: 검토 필요 (DuckDuckGo Instant Answer / Google Custom Search / SerpAPI)

```python
query = f"{place_name} {captured_at[:7]}"  # "서울특별시 중구 2025-06"
# → 웹 검색 → 상위 5개 결과에서 이벤트 추출
```

**초기 구현 (MVP):**
- DuckDuckGo Instant Answer API (무료, 제한적)
- 검색 결과에서 제목/날짜/URL만 추출
- Gemini로 관련성 판단 (relevance scoring)

**캐시 전략:**
- 지역명 + 월 단위 캐시 키
- TTL: 7일 (뉴스성 정보는 빠르게 변화)

---

## 6. Error Handling

### 6.1 Error Response Format

```json
{
  "error": {
    "code": "GEOCODE_FAILED",
    "message": "역지오코딩에 실패했습니다",
    "details": {"service": "nominatim", "status": 503}
  }
}
```

### 6.2 Rate Limiting

| Service | Limit | 대응 |
|---------|-------|------|
| Nominatim | 1 req/sec | asyncio.Semaphore + sleep |
| Overpass | ~10,000 req/day | 캐시 적극 활용 |
| Gemini (AI Studio Pro) | RPM 제한 | 배치 큐 + 재시도 |

### 6.3 Circuit Breaker

외부 서비스 연속 5회 실패 시 해당 모듈 30초간 비활성화 후 재시도.

---

## 7. Security Considerations

- [x] API Key 인증 (COGnito 프론트엔드 ↔ Descriptor 서비스 간)
- [x] 환경변수로 모든 시크릿 관리 (GOOGLE_AI_API_KEY, SUPABASE_SERVICE_KEY)
- [x] Rate limiting (클라이언트당 10 req/min)
- [x] 입력 검증 (좌표 범위 -180~180, -90~90)
- [x] base64 이미지 크기 제한 (max 5MB)
- [x] CORS 설정 (COGnito 도메인만 허용)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| Unit Test | 각 모듈 (Geocoder, LandCover, Describer, Context) | pytest |
| Integration Test | API 엔드포인트 | pytest + httpx |
| E2E Test | 프론트엔드 → 서비스 → DB 저장 | Playwright |

### 8.2 Test Cases

- [ ] 서울 좌표 입력 → 역지오코딩 결과에 "대한민국", "서울" 포함
- [ ] 해양 좌표 (태평양) 입력 → location은 반환, land_cover는 빈 배열
- [ ] 잘못된 좌표 입력 → 400 에러
- [ ] Nominatim 장애 시 → description/land_cover/context는 정상, location만 null + warning
- [ ] 동일 좌표 2회 요청 → 2번째는 캐시에서 반환 (cached: true)
- [ ] 대용량 이미지 (>5MB) → 422 에러

---

## 9. Project Structure

### 9.1 File Structure

```
cognito-descriptor/              # 별도 레포지토리 또는 서브디렉토리
├── pyproject.toml               # uv / poetry 프로젝트 설정
├── Dockerfile
├── .env.example
├── README.md
│
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app, 라우터 등록
│   ├── config.py                # 환경변수, 설정
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py            # 엔드포인트 정의
│   │   └── schemas.py           # Pydantic 모델 (Request/Response)
│   │
│   ├── modules/
│   │   ├── __init__.py
│   │   ├── geocoder.py          # Nominatim 역지오코딩
│   │   ├── landcover.py         # Overpass 피복분류
│   │   ├── describer.py         # Gemini Vision 영상설명
│   │   └── context.py           # 웹 검색 맥락조사
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   └── composer.py          # 모듈 오케스트레이션, 병렬 실행
│   │
│   ├── cache/
│   │   ├── __init__.py
│   │   └── store.py             # 캐시 레이어 (SQLite 기본)
│   │
│   └── db/
│       ├── __init__.py
│       └── supabase.py          # Supabase 클라이언트
│
└── tests/
    ├── test_geocoder.py
    ├── test_landcover.py
    ├── test_describer.py
    ├── test_context.py
    ├── test_composer.py
    └── test_api.py
```

### 9.2 Implementation Order

1. [ ] 프로젝트 초기화 (FastAPI + pyproject.toml + Docker)
2. [ ] Pydantic 스키마 정의 (Request/Response 모델)
3. [ ] Geocoder 모듈 구현 (Nominatim + 캐시)
4. [ ] LandCover 모듈 구현 (Overpass + OSM 태그 매핑 + 캐시)
5. [ ] Describer 모듈 구현 (Gemini Vision + 프롬프트)
6. [ ] Context Researcher 모듈 구현 (웹 검색 + 이벤트 추출)
7. [ ] Composer 서비스 구현 (병렬 실행 + 점진적 실패)
8. [ ] API 라우터 구현 (POST /api/describe 등)
9. [ ] Supabase 연동 (image_descriptions 테이블 + 저장)
10. [ ] 프론트엔드 연동 (catalogUI에서 설명 표시)
11. [ ] 테스트 작성 및 검증
12. [ ] Docker 배포 설정

---

## 10. Coding Conventions (Python)

| Item | Convention |
|------|-----------|
| 패키지 관리 | uv (빠른 설치, lockfile 지원) |
| 코드 포매터 | ruff format |
| 린터 | ruff check |
| 타입 힌트 | 모든 함수에 타입 힌트 적용 |
| 비동기 | asyncio + httpx (비동기 HTTP 클라이언트) |
| 환경변수 | pydantic-settings |
| 로깅 | structlog (JSON 구조화 로깅) |

---

## 11. Environment Variables

| Variable | Purpose | Required |
|----------|---------|:--------:|
| `GOOGLE_AI_API_KEY` | Gemini Vision API 키 | Yes |
| `SUPABASE_URL` | Supabase 프로젝트 URL | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase 서비스 키 (서버 전용) | Yes |
| `API_KEY` | COGnito → Descriptor 인증 키 | Yes |
| `NOMINATIM_URL` | Nominatim 엔드포인트 (기본: public) | No |
| `OVERPASS_URL` | Overpass 엔드포인트 (기본: public) | No |
| `CACHE_DB_PATH` | SQLite 캐시 DB 경로 (기본: ./cache.db) | No |
| `LOG_LEVEL` | 로그 레벨 (기본: INFO) | No |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-26 | Initial draft | conaonda |
