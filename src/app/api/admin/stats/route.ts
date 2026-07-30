/**
 * 관리자 집계 API
 *
 * GET /api/admin/stats - 전체 집계 (사용자·메모·자동 분류 성적)
 *
 * 관리자가 아니면 404. requireAdmin 참고.
 */

import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getAdminStats } from '@/lib/db/admin';

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) return authResult.error;

  try {
    const stats = await getAdminStats();

    return Response.json(
      { success: true, data: stats },
      // 집계는 잠깐만 지나도 틀린 값이 된다. 중간 캐시에 남지 않게 못 박는다
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('관리자 집계 조회 실패:', error);
    return Response.json(
      { success: false, error: '집계를 불러오는데 실패했어' },
      { status: 500 }
    );
  }
}
