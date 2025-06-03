// /src/lib/supabase.ts
// supabase-js 라이브러리를 사용하여 Supabase 클라이언트를 생성합니다.
import { createClient } from '@supabase/supabase-js';

// 환경변수에서 Supabase 프로젝트 URL을 불러옵니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
// 환경변수에서 Supabase 익명 키(anon key)를 불러옵니다.
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Supabase 클라이언트 객체를 생성하여 내보냅니다.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
