# 📦 수파베이스 월간 백업 시스템

수파베이스 데이터베이스의 스키마와 데이터를 매월 자동으로 백업하는 시스템입니다.

## 🚀 주요 기능

- **자동 백업**: 매월 1일 오전 2시(UTC) 자동 실행
- **완전 백업**: 스키마(DDL) + 데이터(INSERT 문) 모두 포함
- **압축 저장**: ZIP 형태로 압축하여 저장 공간 절약
- **자동 정리**: 6개월 이상 된 백업 파일 자동 삭제
- **GitHub Releases**: 백업 파일을 GitHub Releases로 저장
- **알림 기능**: Slack을 통한 백업 성공/실패 알림
- **복원 기능**: 백업 파일로부터 데이터베이스 복원

## 📁 파일 구조

```
scripts/
├── backup-supabase.js      # 백업 스크립트
├── restore-supabase.js     # 복원 스크립트
└── README-backup.md        # 환경 설정 가이드

.github/workflows/
└── supabase-backup.yml     # GitHub Actions 워크플로우

backups/                    # 백업 파일 저장소 (gitignore)
└── supabase-backup-*.zip   # 압축된 백업 파일들
```

## ⚙️ 환경 설정

### 1. GitHub Secrets 설정

GitHub 저장소 → Settings → Secrets and variables → Actions에서 다음 시크릿 추가:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ACCESS_TOKEN=your-access-token
SUPABASE_PROJECT_ID=your-project-id
SLACK_WEBHOOK_URL=https://hooks.slack.com/... (선택사항)
```

### 2. Supabase 액세스 토큰 생성

1. Supabase 대시보드 → Settings → API
2. "Generate new token" 클릭
3. 적절한 권한 설정 (최소한 데이터 읽기 권한 필요)
4. 생성된 토큰을 GitHub Secrets에 설정

### 3. 로컬 환경 변수 (테스트용)

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ACCESS_TOKEN="your-access-token"
export SUPABASE_PROJECT_ID="your-project-id"
```

## 🛠️ 사용법

### 자동 백업 (GitHub Actions)

- **스케줄**: 매월 1일 오전 2시(UTC) 자동 실행
- **수동 실행**: GitHub Actions 탭에서 "Run workflow" 클릭
- **테스트 모드**: 수동 실행 시 "test_mode" 체크박스로 테스트

### 로컬 백업

```bash
# 백업 실행
npm run backup

# 테스트 모드 (실제 백업 없이 로그만 출력)
npm run backup:test
```

### 복원

```bash
# 복원 (확인 후 실행)
npm run restore backups/supabase-backup-2024-01-01T00-00-00.zip

# 테스트 모드 (실제 복원 없이 계획만 출력)
npm run restore:test backups/supabase-backup-2024-01-01T00-00-00.zip

# 강제 복원 (확인 없이 실행)
npm run restore backups/supabase-backup-2024-01-01T00-00-00.zip --force
```

## 📋 백업 내용

### 스키마 백업 (`schema-*.sql`)
- 모든 테이블의 CREATE TABLE 문
- 컬럼 정의, 데이터 타입, 제약조건
- 테이블 구조 완전 복원 가능

### 데이터 백업 (`data-*.sql`)
- 모든 테이블의 INSERT 문
- 데이터 타입별 적절한 포맷팅
- 외래키 관계 고려한 순서

### 백업 로그 (`backup-log-*.json`)
```json
{
  "timestamp": "2024-01-01T00-00-00",
  "created_at": "2024-01-01T00:00:00.000Z",
  "project_id": "your-project-id",
  "backup_file": "supabase-backup-2024-01-01T00-00-00.zip",
  "tables_backed_up": ["members", "attendances", "attendance_guests"],
  "table_count": 3,
  "backup_size_bytes": 1024000
}
```

## 🔧 복원 과정

1. **백업 파일 압축 해제**
2. **현재 데이터베이스 상태 확인**
3. **복원 계획 생성 및 표시**
4. **사용자 확인** (--force 옵션으로 생략 가능)
5. **스키마 복원** (CREATE TABLE 문 실행)
6. **데이터 복원** (INSERT 문 실행)
7. **임시 파일 정리**

## 📊 백업 파일 관리

- **저장 위치**: GitHub Releases (자동) + 로컬 `backups/` 디렉토리
- **보관 기간**: 6개월 (180일)
- **자동 정리**: 오래된 백업 파일 자동 삭제
- **압축**: ZIP 형태로 저장 공간 절약

## 🚨 주의사항

### 백업 시
- 백업 중에는 데이터베이스 작업을 최소화하세요
- 대용량 테이블이 있는 경우 백업 시간이 길어질 수 있습니다
- 네트워크 연결이 안정적인 환경에서 실행하세요

### 복원 시
- **복원은 되돌릴 수 없는 작업입니다**
- 복원 전 반드시 현재 데이터를 백업하세요
- 테스트 환경에서 먼저 검증하세요
- 프로덕션 환경 복원 시 서비스 중단을 고려하세요

## 🔍 문제 해결

### 백업 실패
1. 환경 변수 확인 (URL, 토큰, 프로젝트 ID)
2. Supabase 토큰 권한 확인
3. 네트워크 연결 상태 확인
4. GitHub Actions 로그 확인

### 복원 실패
1. 백업 파일 무결성 확인
2. 현재 데이터베이스 상태 확인
3. 권한 및 제약조건 확인
4. SQL 문법 오류 확인

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. GitHub Actions 로그
2. 백업 로그 파일 (`backup-log-*.json`)
3. 환경 변수 설정
4. Supabase 프로젝트 상태

---

**🎉 백업 시스템이 성공적으로 설정되었습니다!**

매월 자동으로 데이터베이스가 백업되며, 필요시 언제든지 복원할 수 있습니다.
