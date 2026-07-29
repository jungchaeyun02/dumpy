/**
 * 로그아웃 API
 *
 * POST /api/auth/logout - 세션 쿠키 삭제
 */

import { clearSessionCookie } from '@/lib/auth/session';
import { messages } from '@/lib/utils/messages';

/**
 * POST /api/auth/logout
 *
 * 세션 쿠키만 지운다. 메모는 그대로 남는다.
 * (데이터까지 지우는 건 탈퇴 - DELETE /api/me)
 *
 * GET이 아니라 POST인 이유:
 * 링크 프리페치나 <img> 태그만으로 남을 로그아웃시킬 수 없게 하려고.
 *
 * 인증을 요구하지 않는 이유:
 * 이미 로그아웃된 상태에서 또 눌러도 그냥 성공이어야 한다.
 * 세션이 만료됐을 때 쿠키를 못 지우고 갇히는 상황을 막는다.
 */
export async function POST() {
  try {
    await clearSessionCookie();

    return Response.json({
      success: true,
      message: messages.logoutDone,
    });
  } catch (error) {
    console.error('로그아웃 실패:', error);
    return Response.json(
      { success: false, error: messages.logoutFailed },
      { status: 500 }
    );
  }
}
