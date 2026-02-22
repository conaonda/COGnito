#!/usr/bin/env bash
set -euo pipefail

# ============================================
# COGnito v0.2.0 Supabase 설정 스크립트
# ============================================
#
# 사용법: ./scripts/setup-supabase.sh
#
# 이 스크립트가 자동으로 처리하는 것:
#   1. Supabase CLI 설치 확인
#   2. Supabase 프로젝트 연결
#   3. DB 마이그레이션 실행
#   4. .env 파일 생성
#   5. GitHub Secrets 등록 (gh CLI 있을 때)
#
# 이 스크립트가 처리하지 않는 것 (웹 UI에서 수동):
#   - Supabase 프로젝트 생성 (https://supabase.com)
#   - Google OAuth App 생성
#   - Supabase에서 OAuth Provider 활성화

cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── 1. Supabase CLI 확인 ──
check_supabase_cli() {
  if command -v supabase &>/dev/null; then
    ok "Supabase CLI 설치됨: $(supabase --version 2>/dev/null || echo 'unknown')"
    return 0
  fi

  warn "Supabase CLI가 설치되어 있지 않습니다."
  echo ""
  echo "  설치 방법:"
  echo "    brew install supabase/tap/supabase   # macOS"
  echo "    npx supabase --version               # npx로 실행"
  echo ""

  read -rp "npx supabase를 대신 사용할까요? (Y/n) " answer
  if [[ "${answer:-Y}" =~ ^[Yy]$ ]]; then
    SUPABASE_CMD="npx supabase"
    ok "npx supabase 사용"
    return 0
  fi

  error "Supabase CLI가 필요합니다. 설치 후 다시 실행해주세요."
  exit 1
}

SUPABASE_CMD="supabase"

# ── 2. Supabase 프로젝트 정보 수집 ──
collect_credentials() {
  echo ""
  info "Supabase 프로젝트 정보를 입력해주세요."
  echo "  (Dashboard → Settings → API 에서 확인)"
  echo ""

  # 기존 .env에서 값 읽기
  local existing_url="" existing_key=""
  if [[ -f "$PROJECT_ROOT/.env" ]]; then
    existing_url=$(grep -oP 'VITE_SUPABASE_URL=\K.*' "$PROJECT_ROOT/.env" 2>/dev/null || true)
    existing_key=$(grep -oP 'VITE_SUPABASE_ANON_KEY=\K.*' "$PROJECT_ROOT/.env" 2>/dev/null || true)
  fi

  if [[ -n "$existing_url" ]]; then
    read -rp "Project URL [$existing_url]: " SUPABASE_URL
    SUPABASE_URL="${SUPABASE_URL:-$existing_url}"
  else
    read -rp "Project URL (https://xxx.supabase.co): " SUPABASE_URL
  fi

  if [[ -n "$existing_key" ]]; then
    read -rp "Anon Key [기존값 유지]: " SUPABASE_ANON_KEY
    SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-$existing_key}"
  else
    read -rp "Anon Key: " SUPABASE_ANON_KEY
  fi

  if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" ]]; then
    error "Project URL과 Anon Key 모두 필요합니다."
    exit 1
  fi

  # URL 형식 검증
  if [[ ! "$SUPABASE_URL" =~ ^https://.*\.supabase\.co$ ]]; then
    warn "URL 형식이 예상과 다릅니다: $SUPABASE_URL"
    read -rp "계속 진행할까요? (y/N) " answer
    [[ "${answer:-N}" =~ ^[Yy]$ ]] || exit 1
  fi

  ok "프로젝트 정보 확인 완료"
}

# ── 3. .env 파일 생성 ──
create_env_file() {
  echo ""
  info ".env 파일 생성 중..."

  if [[ -f "$PROJECT_ROOT/.env" ]]; then
    warn ".env 파일이 이미 존재합니다."
    read -rp "덮어쓸까요? (y/N) " answer
    [[ "${answer:-N}" =~ ^[Yy]$ ]] || { info ".env 파일 유지"; return; }
  fi

  cat > "$PROJECT_ROOT/.env" <<EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
EOF

  ok ".env 파일 생성 완료"
}

# ── 4. DB 마이그레이션 ──
run_migration() {
  echo ""
  info "DB 마이그레이션 실행 여부 확인..."

  local migration_file="$PROJECT_ROOT/supabase/migrations/00001_initial_schema.sql"
  if [[ ! -f "$migration_file" ]]; then
    error "마이그레이션 파일을 찾을 수 없습니다: $migration_file"
    exit 1
  fi

  echo ""
  echo "  마이그레이션 실행 방법을 선택하세요:"
  echo ""
  echo "  1) Supabase CLI로 자동 실행 (supabase db push)"
  echo "  2) SQL을 클립보드에 복사 (Dashboard에서 수동 실행)"
  echo "  3) 건너뛰기"
  echo ""

  read -rp "선택 (1/2/3): " choice

  case "$choice" in
    1)
      # 프로젝트 ID 추출 (URL에서)
      local project_id
      project_id=$(echo "$SUPABASE_URL" | sed 's|https://||; s|\.supabase\.co||')

      info "Supabase 프로젝트 연결 중... (로그인이 필요할 수 있습니다)"

      # supabase init (이미 있으면 건너뜀)
      if [[ ! -f "$PROJECT_ROOT/supabase/config.toml" ]]; then
        $SUPABASE_CMD init 2>/dev/null || true
      fi

      $SUPABASE_CMD link --project-ref "$project_id"
      $SUPABASE_CMD db push

      ok "마이그레이션 완료"
      ;;
    2)
      if command -v pbcopy &>/dev/null; then
        cat "$migration_file" | pbcopy
        ok "SQL이 클립보드에 복사되었습니다."
      elif command -v xclip &>/dev/null; then
        cat "$migration_file" | xclip -selection clipboard
        ok "SQL이 클립보드에 복사되었습니다."
      else
        warn "클립보드 복사를 지원하지 않는 환경입니다."
        echo ""
        echo "  아래 파일의 내용을 Supabase Dashboard → SQL Editor에 붙여넣으세요:"
        echo "  $migration_file"
      fi
      echo ""
      echo "  Supabase Dashboard → SQL Editor → New query → 붙여넣기 → Run"
      ;;
    3)
      info "마이그레이션 건너뜀"
      ;;
  esac
}

# ── 5. GitHub Secrets 등록 ──
setup_github_secrets() {
  echo ""

  if ! command -v gh &>/dev/null; then
    warn "gh CLI가 없어 GitHub Secrets 자동 등록을 건너뜁니다."
    echo ""
    echo "  수동 등록: GitHub repo → Settings → Secrets and variables → Actions"
    echo "    VITE_SUPABASE_URL=$SUPABASE_URL"
    echo "    VITE_SUPABASE_ANON_KEY=(입력한 값)"
    return
  fi

  read -rp "GitHub Repository Secrets를 등록할까요? (Y/n) " answer
  if [[ ! "${answer:-Y}" =~ ^[Yy]$ ]]; then
    info "GitHub Secrets 등록 건너뜀"
    return
  fi

  echo "$SUPABASE_URL" | gh secret set VITE_SUPABASE_URL
  echo "$SUPABASE_ANON_KEY" | gh secret set VITE_SUPABASE_ANON_KEY

  ok "GitHub Secrets 등록 완료"
}

# ── 6. OAuth 설정 안내 ──
print_oauth_guide() {
  local project_id
  project_id=$(echo "$SUPABASE_URL" | sed 's|https://||; s|\.supabase\.co||')
  local callback_url="https://${project_id}.supabase.co/auth/v1/callback"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " 남은 수동 작업 (웹 UI에서만 가능)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo " [A] Supabase 리다이렉트 URL 설정"
  echo "     Authentication → URL Configuration"
  echo "     Site URL: https://conaonda.github.io/COGnito/"
  echo "     Redirect URLs 추가:"
  echo "       - https://conaonda.github.io/COGnito/"
  echo "       - http://localhost:5173/COGnito/"
  echo ""
  echo " [B] Google OAuth"
  echo "     1. console.cloud.google.com → APIs & Services → Credentials"
  echo "        - OAuth 2.0 Client → Redirect URI: $callback_url"
  echo "     2. Client ID/Secret 복사"
  echo "     3. Supabase → Authentication → Providers → Google 활성화 → 붙여넣기"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ── 검증 ──
verify() {
  echo ""
  info "설정 검증 중..."

  local ok_count=0 total=3

  # .env 확인
  if [[ -f "$PROJECT_ROOT/.env" ]] && grep -q "VITE_SUPABASE_URL=" "$PROJECT_ROOT/.env"; then
    ok ".env 파일 존재"
    ((ok_count++))
  else
    error ".env 파일 없음 또는 불완전"
  fi

  # .gitignore에 .env 포함 확인
  if grep -q "^\.env$" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
    ok ".gitignore에 .env 포함됨"
    ((ok_count++))
  else
    error ".gitignore에 .env가 없습니다 — 시크릿 노출 위험!"
  fi

  # 빌드 테스트
  if npm run build --silent 2>/dev/null; then
    ok "빌드 성공"
    ((ok_count++))
  else
    error "빌드 실패"
  fi

  echo ""
  if [[ $ok_count -eq $total ]]; then
    ok "모든 검증 통과 ($ok_count/$total)"
    echo ""
    echo "  로컬 테스트: npm run dev"
    echo "  브라우저: http://localhost:5173/COGnito/"
  else
    warn "일부 검증 실패 ($ok_count/$total)"
  fi
}

# ── 메인 실행 ──
main() {
  echo ""
  echo "🛰️  COGnito v0.2.0 Supabase 설정"
  echo ""

  check_supabase_cli
  collect_credentials
  create_env_file
  run_migration
  setup_github_secrets
  print_oauth_guide
  verify
}

main
