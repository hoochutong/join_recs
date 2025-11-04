# 피클볼 참여기록 (Pickleball Participation Records)

피클볼클럽 회원 참여 체크 및 기록 관리 시스템

## 🚀 기술 스택

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (Database + Auth)
- **Deployment**: Vercel
- **Icons**: Heroicons

## 📋 주요 기능

### 1. 참여 체크 (Check-in)
- 회원 자동완성 검색
- 게스트 동반 기능 (최대 2명)
- 단독 게스트 참여 기능
- 하루 1회 중복 참여 방지

### 2. 회원 관리 (Admin)
- 회원 추가/수정/삭제
- 회원 상태 관리 (정회원/준회원/임시)
- 페이지네이션 (5명씩)
- 최근 등록순 정렬

### 3. 참여기록 출력
- 날짜별 필터링
- PDF 출력
- 참여 기록 삭제

## 🔧 데이터베이스 휴지 방지 (Database Keepalive)

Supabase 무료 플랜의 DB 휴지 상태를 방지하기 위한 자동화 시스템이 구성되어 있습니다.

### 구성 요소

1. **Vercel Cron Jobs**
   - 경로: `/api/keepalive`
   - 주기: 매일 새벽 2시 (한국 시간 기준)
   - 역할: 주기적으로 DB에 간단한 쿼리 실행하여 휴지 상태 방지

2. **GitHub Actions**
   - 경로: `.github/workflows/keepalive.yml`
   - 주기: 매일 새벽 3시 (한국 시간 기준)
   - 역할: Vercel keepalive API 호출 (백업)

### 환경 변수 설정

#### Vercel 배포 시
환경변수가 이미 설정되어 있어야 합니다:
- `VITE_SUPABASE_URL` (또는 `SUPABASE_URL`)
- `VITE_SUPABASE_ANON_KEY` (또는 `SUPABASE_ANON_KEY`)

**참고:** Vercel Serverless Functions에서는 `VITE_` 접두사가 있는 환경 변수도 접근 가능하지만, 더 안전하게는 일반 이름(`SUPABASE_URL`, `SUPABASE_ANON_KEY`)으로도 설정 가능합니다.

#### GitHub Actions 사용 시
GitHub Secrets에 추가 필요:
- `VERCEL_URL`: Vercel 배포 URL (예: `your-project.vercel.app`)

**GitHub Secrets 설정 방법:**
1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. Name: `VERCEL_URL`, Value: `[your-vercel-deployment-url]`
4. Add secret 클릭

### 테스트

```bash
# 로컬에서 테스트
curl http://localhost:5173/api/keepalive

# 배포 후 테스트
curl https://[your-vercel-url]/api/keepalive
```

### 모니터링

- **Vercel Dashboard**: Deployments → Functions → `/api/keepalive`
- **GitHub Actions**: Actions 탭에서 워크플로우 실행 로그 확인

## 🔍 모니터링 및 점검 가이드

### 매주 점검 (약 5분)

1. **Vercel Keepalive 확인**
   - https://vercel.com → 프로젝트 선택 → Deployments
   - Functions 탭에서 `/api/keepalive` 실행 로그 확인
   - 매일 새벽 2시에 실행되어야 함

2. **GitHub Actions 확인**
   - https://github.com/hoochutong/join_recs/actions
   - "Database Keepalive" 워크플로우 클릭
   - 최근 실행 로그 확인 (매일 새벽 3시에 실행되어야 함)

### 매월 점검 (약 10분)

1. **Supabase 프로젝트 상태**
   - https://supabase.com/dashboard → 프로젝트 선택
   - Settings → General
   - Project 상태가 **Active** 인지 확인
   - Idle 상태면 Restore 클릭

2. **Vercel 환경 변수 확인**
   - https://vercel.com → 프로젝트 선택 → Settings → Environment Variables
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 존재 확인

### 3개월마다 점검 (약 10분)

1. **GitHub Personal Access Token 만료 확인**
   - https://github.com/settings/tokens
   - 토큰 목록에서 만료일 확인
   - 만료 예정 시 새 토큰 생성

2. **GitHub Secrets 확인**
   - https://github.com/hoochutong/join_recs/settings/secrets/actions
   - `VERCEL_URL` 존재 확인

3. **Keepalive 수동 테스트**
   ```bash
   curl https://[your-vercel-url]/api/keepalive
   ```
   정상 응답: `{"success":true,"message":"Database keepalive successful"...}`

### 문제 발생 시

- **Supabase가 휴지 상태**: Dashboard → Settings → Restore
- **Keepalive 동작 안 함**: 환경 변수 재확인, Vercel 재배포
- **GitHub Actions 실패**: Secrets 재설정

## 📁 프로젝트 구조

```
join_recs/
├── api/
│   └── keepalive.ts           # Supabase DB keepalive API
├── .github/workflows/
│   └── keepalive.yml           # GitHub Actions keepalive
├── src/
│   ├── components/
│   │   ├── AttendanceForm.tsx # 참여 체크 폼
│   │   ├── MemberAdmin.tsx     # 회원 관리
│   │   └── ParticipationLog.tsx # 참여기록 출력
│   ├── pages/
│   │   ├── CheckinPage.tsx     # 메인 체크인 페이지
│   │   └── AdminPage.tsx        # 관리자 페이지
│   └── lib/
│       └── supabase.ts         # Supabase 클라이언트
└── vercel.json                 # Vercel 배포 설정
```

## 🚀 배포

```bash
# 로컬 개발
npm run dev

# 프로덕션 빌드
npm run build

# Vercel 배포 (자동)
git push origin main
```

## 🔐 관리자 기능

- **관리자 비밀번호**: 환경별로 다름 (별도 문의)
- **회원 관리**: 회원 추가, 상태 변경, 삭제
- **참여기록 관리**: PDF 출력, 기록 삭제

## 📝 라이선스

Private project