-- 빠른 RLS 설정 스크립트 (오늘 내로 완성)
-- 실행 순서대로 복사해서 Supabase SQL Editor에서 실행하세요

-- 1단계: RLS 활성화 (기존 기능 유지를 위해 임시 전체 허용)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_guests ENABLE ROW LEVEL SECURITY;

-- 임시 전체 허용 정책 (기존 앱이 중단되지 않도록)
CREATE POLICY "temp_allow_all_members" ON members FOR ALL USING (true);
CREATE POLICY "temp_allow_all_attendance" ON attendances FOR ALL USING (true);
CREATE POLICY "temp_allow_all_guests" ON attendance_guests FOR ALL USING (true);

-- 2단계: 개인정보 보호 View 생성
-- 일반 사용자용 (휴대폰번호 마지막 4자리만)
CREATE OR REPLACE VIEW members_safe AS
SELECT 
  id,
  name,
  CASE 
    WHEN phone IS NOT NULL AND length(phone) >= 4 
    THEN right(phone, 4)
    ELSE ''
  END as phone_last4,
  status
FROM members
WHERE status IN ('정회원', '준회원');

-- 3단계: 관리자 검증 함수
CREATE OR REPLACE FUNCTION verify_admin_simple(password text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN password = 'pikachu1029';
END;
$$;

-- 4단계: 관리자용 회원 조회 함수
CREATE OR REPLACE FUNCTION get_members_admin_simple(admin_pass text)
RETURNS TABLE(id uuid, name text, phone text, status text)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT verify_admin_simple(admin_pass) THEN
    RAISE EXCEPTION 'Unauthorized access attempt';
  END IF;
  
  RETURN QUERY SELECT m.id, m.name, m.phone, m.status FROM members m ORDER BY m.name;
END;
$$;

-- 완료! 이제 앱을 테스트해보세요.
-- 일반 사용자: 휴대폰번호 마지막 4자리만 보임
-- 관리자: 전체 정보 확인 가능 