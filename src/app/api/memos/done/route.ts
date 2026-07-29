/**
 * 완료된 메모 API
 *
 * GET /api/memos/done - 완료된 할 일 목록
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getDoneMemos } from '@/lib/db/memos';

/**
 * GET /api/memos/done
 * 완료된 메모 목록
 */
export async function GET(request: NextRequest) {
  // 인증 확인
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;

  const { session } = authResult;

  try {
    const memos = await getDoneMemos(session.userId);

    return Response.json({
      success: true,
      data: memos,
    });
  } catch (error) {
    console.error('완료 메모 조회 실패:', error);
    return Response.json(
      { success: false, error: '완료된 메모를 불러오는데 실패했어' },
      { status: 500 }
    );
  }
}
