# 수파베이스 백업 시스템 환경 설정

## 필수 환경 변수

다음 환경 변수들을 설정해야 합니다:

```bash
# Supabase 프로젝트 정보
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ACCESS_TOKEN=your-access-token
SUPABASE_PROJECT_ID=your-project-id
```

## GitHub Secrets 설정

GitHub Actions에서 사용할 시크릿을 설정하세요:

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. 다음 시크릿 추가:
   - `SUPABASE_URL`: Supabase 프로젝트 URL
   - `SUPABASE_ACCESS_TOKEN`: Supabase 액세스 토큰
   - `SUPABASE_PROJECT_ID`: Supabase 프로젝트 ID
   - `SLACK_WEBHOOK_URL`: (선택사항) Slack 알림용 웹훅 URL

## Supabase 액세스 토큰 생성

1. Supabase 대시보드 → Settings → API
2. "Generate new token" 클릭
3. 적절한 권한 설정 (최소한 데이터 읽기 권한 필요)
4. 생성된 토큰을 환경 변수에 설정

## 로컬 테스트

```bash
# 환경 변수 설정
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ACCESS_TOKEN="your-access-token"
export SUPABASE_PROJECT_ID="your-project-id"

# 백업 실행
node scripts/backup-supabase.js

# 복원 테스트 (dry-run)
node scripts/restore-supabase.js backups/supabase-backup-2024-01-01T00-00-00.zip --dry-run
```

## GitHub Actions 수동 실행

1. GitHub 저장소 → Actions 탭
2. "Supabase Monthly Backup" 워크플로우 선택
3. "Run workflow" 클릭
4. "test_mode" 체크박스로 테스트 실행 가능
