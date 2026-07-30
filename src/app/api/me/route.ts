/**
 * 사용자 API
 *
 * DELETE /api/me - 회원 탈퇴 (즉시 완전 삭제)
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { isAdmin } from '@/lib/auth/admin';
import { clearSessionCookie } from '@/lib/auth/session';
import { deleteAllUserData } from '@/lib/db/memos';

/**
 * DELETE /api/me
 * 회원 탈퇴 - 모든 데이터 즉시 완전 삭제
 *
 * 주의: 개별 메모 삭제(30일 유예)와 다름!
 * 탈퇴는 처리 목적이 끝난 경우이므로 즉시 파기
 */
export async function DELETE(request: NextRequest) {
  // 인증 확인
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;

  const { session } = authResult;

  try {
    // 모든 사용자 데이터 즉시 삭제
    await deleteAllUserData(session.userId);

    // 세션 쿠키 삭제 (웹용)
    await clearSessionCookie();

    return Response.json({
      success: true,
      message: '탈퇴가 완료됐어. 그동안 덤피를 써줘서 고마워!',
    });
  } catch (error) {
    console.error('회원 탈퇴 실패:', error);
    return Response.json(
      { success: false, error: '탈퇴 처리에 실패했어. 다시 시도해줘' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/me
 * 현재 사용자 정보 조회
 */
export async function GET(request: NextRequest) {
  // 인증 확인
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;

  const { session } = authResult;

  return Response.json({
    success: true,
    data: {
      userId: session.userId,
      provider: session.provider,
      // 관리자 화면 링크를 보여줄지 판단하는 데만 쓴다.
      // 이 값이 true 라고 뭐가 열리는 게 아니라, 관리자 라우트가 각자
      // 다시 확인한다 (/admin 은 404, /api/admin/* 도 404)
      isAdmin: isAdmin(session.userId),
    },
  });
}
