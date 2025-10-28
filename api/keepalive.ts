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
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials are not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 가장 가벼운 쿼리로 DB 연결 유지 (COUNT 쿼리가 가장 효율적)
    const { error } = await supabase
      .from('members')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    
    return res.status(200).json({ 
      success: true, 
      message: 'Database keepalive successful',
      timestamp: new Date().toISOString(),
      timezone: 'KST'
    });
    
  } catch (error: any) {
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
