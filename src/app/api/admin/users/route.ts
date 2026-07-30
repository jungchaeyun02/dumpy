/**
 * 관리자 사용자 목록 API
 *
 * GET /api/admin/users?limit=50 - 가입 최신순
 *
 * 관리자가 아니면 404. requireAdmin 참고.
 * 메모는 개수만 나간다 - 본문은 관리자도 못 본다.
 */

import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getAdminUsers, USERS_DEFAULT_LIMIT, USERS_MAX_LIMIT } from '@/lib/db/admin';

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) return authResult.error;

  // 이상한 limit 은 거부하지 않고 기본값으로 되돌린다.
  // 관리자 혼자 쓰는 화면이라 400 을 띄워봐야 알려줄 사람이 없다.
  const raw = request.nextUrl.searchParams.get('limit');
  const parsed = raw === null ? NaN : Number(raw);
  const limit =
    Number.isInteger(parsed) && parsed > 0
      ? Math.min(parsed, USERS_MAX_LIMIT)
      : USERS_DEFAULT_LIMIT;

  try {
    const { users, total } = await getAdminUsers(limit);

    return Response.json(
      { success: true, data: users, total, limit },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('관리자 사용자 목록 조회 실패:', error);
    return Response.json(
      { success: false, error: '사용자 목록을 불러오는데 실패했어' },
      { status: 500 }
    );
  }
}
