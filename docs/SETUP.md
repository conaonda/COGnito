# COGnito 설정 가이드

저장소를 clone한 후 로컬 개발부터 GitHub Pages 배포까지의 전체 과정을 안내합니다.

## 1. 사전 준비

- **Node.js** 22+ ([다운로드](https://nodejs.org/))
- **npm** (Node.js와 함께 설치됨)
- **Git**

## 2. 저장소 clone 및 의존성 설치

```bash
git clone https://github.com/conaonda/COGnito.git
cd COGnito
npm install
```

## 3. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com)에서 계정 생성
2. **New project** 클릭 → 프로젝트 이름, 비밀번호, 리전 설정
3. 생성 완료 후 **Settings → API**에서 다음 값을 확인:
   - **Project URL** (`https://xxx.supabase.co`)
   - **anon public** 키

## 4. 설정 스크립트 실행

```bash
./scripts/setup-supabase.sh
```

스크립트가 처리하는 작업:
- Supabase CLI 설치 확인
- Project URL / Anon Key 입력받아 `.env` 파일 생성
- DB 마이그레이션 실행 (CLI 자동 또는 클립보드 복사)
- GitHub Secrets 등록 (`gh` CLI가 있을 때)
- OAuth 설정 안내 출력

> **마이그레이션 옵션 2 (클립보드 복사)** 를 선택하면 `supabase/migrations/` 아래의 모든 SQL 파일이 순서대로 합쳐져서 복사됩니다. Supabase Dashboard → **SQL Editor** → New query → 붙여넣기 → Run으로 실행하세요.

## 5. OAuth 설정 (Google)

### 5-1. Google OAuth Client 생성

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**
2. **Create Credentials → OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Authorized redirect URIs에 추가:
   ```
   https://<your-project-id>.supabase.co/auth/v1/callback
   ```
5. **Client ID**와 **Client Secret** 복사

### 5-2. Supabase에서 Provider 활성화

1. Supabase Dashboard → **Authentication → Providers → Google**
2. **Enable** 토글 켜기
3. Client ID, Client Secret 붙여넣기
4. **Save**

### 5-3. Redirect URL 설정

Supabase Dashboard → **Authentication → URL Configuration**:

| 항목 | 값 |
|------|-----|
| Site URL | `https://<your-username>.github.io/COGnito/` |
| Redirect URLs | `https://<your-username>.github.io/COGnito/` |
| | `http://localhost:5173/COGnito/` |

## 6. CORS 프록시 설정 (선택사항)

외부 COG 서버가 CORS를 허용하지 않을 때 Cloudflare Worker 프록시를 사용합니다.

### 배포

```bash
cd proxy/cog-cors-proxy
npm install
npx wrangler deploy
```

배포 후 출력된 Worker URL을 `.env`에 설정:

```
VITE_CORS_PROXY_URL=https://your-worker-name.workers.dev
```

> 프록시 없이도 CORS를 허용하는 COG 서버의 영상은 정상 로드됩니다.

## 7. 로컬 개발 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173/COGnito/` 로 접속합니다.

## 8. GitHub Pages 배포

### 8-1. GitHub Secrets 등록

Repository → **Settings → Secrets and variables → Actions**에서 추가:

| Secret | 값 |
|--------|-----|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key |

> `setup-supabase.sh` 실행 시 `gh` CLI가 있으면 자동 등록할 수 있습니다.

### 8-2. GitHub Pages 활성화

Repository → **Settings → Pages**:
- Source: **GitHub Actions**

`main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 자동으로 빌드 및 배포합니다.

## 9. 트러블슈팅

### `.env` 파일이 없다는 에러

```bash
cp .env.example .env
# 값을 채워넣은 후 다시 실행
```

### 마이그레이션 실행 실패 (Supabase CLI)

- `supabase login`으로 먼저 로그인했는지 확인
- `supabase link --project-ref <project-id>`로 프로젝트 연결 확인
- CLI 대신 옵션 2 (클립보드 복사 → Dashboard SQL Editor)를 사용

### OAuth 로그인이 동작하지 않음

- Supabase Dashboard에서 Google Provider가 **Enable** 상태인지 확인
- Google Cloud Console의 redirect URI가 정확한지 확인:
  `https://<project-id>.supabase.co/auth/v1/callback`
- Supabase URL Configuration의 Site URL과 Redirect URLs 확인

### COG 영상 로드 실패 (CORS 에러)

- 브라우저 개발자 도구 → Network 탭에서 CORS 에러 확인
- CORS 프록시가 설정되어 있는지 확인 (6번 참조)
- 프록시 Worker가 정상 배포되었는지 `curl` 등으로 확인

### 빌드 실패

```bash
# 의존성 재설치
rm -rf node_modules
npm install

# 빌드 재시도
npm run build
```
