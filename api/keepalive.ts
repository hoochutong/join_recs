// api/keepalive.ts
// Supabase DB 휴지 상태 방지를 위한 keepalive API
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // 환경변수에서 Supabase 클라이언트 생성
    // Vercel Serverless Functions에서는 VITE_ 접두사 변수도 접근 가능하지만,
    // 더 안전하게 둘 다 확인 (VITE_ 접두사 있으면 우선 사용, 없으면 일반 이름 사용)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      const missing = [];
      if (!supabaseUrl) missing.push('VITE_SUPABASE_URL 또는 SUPABASE_URL');
      if (!supabaseKey) missing.push('VITE_SUPABASE_ANON_KEY 또는 SUPABASE_ANON_KEY');
      throw new Error(`Supabase credentials are not configured. Missing: ${missing.join(', ')}`);
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 가장 가벼운 쿼리로 DB 연결 유지 (id만 선택하여 최소한의 데이터만 조회)
    const { data, error } = await supabase
      .from('members')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }
    
    // 쿼리 성공 여부 확인 (데이터가 없어도 쿼리 자체는 성공)
    // 이 쿼리의 목적은 DB 연결을 유지하는 것이므로, 결과 데이터는 중요하지 않음
    
    return res.status(200).json({ 
      success: true, 
      message: 'Database keepalive successful',
      timestamp: new Date().toISOString(),
      timezone: 'KST'
    });
    
  } catch (error: any) {
    // 에러 로깅 (디버깅용)
    console.error('Keepalive error:', error);
    
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString(),
      timezone: 'KST'
    });
  }
}
