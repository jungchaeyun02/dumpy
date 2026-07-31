/**
 * 임시 테스트 로그인 (토스 인증 붙이기 전 단계)
 *
 * 미니앱 화면을 tossmini.com 에 띄워놓고 API 연결을 확인하려면 토큰이
 * 필요한데 토스 인증 연동은 아직이다. 그 사이를 메우는 임시 통로다.
 *
 * 이 파일은 인증을 우회하는 문이 맞다. 그래서 두 겹으로 잠가둔다:
 *   1. ALLOW_TOSS_TEST 가 없으면 아예 동작하지 않는다 (401)
 *   2. 켜져 있어도 Vercel Production 이면 거부한다 - 실수로 Production 에
 *      변수를 넣는 날을 위한 두 번째 잠금
 *
 * 발급되는 계정은 TOSS_TEST_USER_ID 하나로 고정이다. 요청 본문으로 아무
 * 사용자나 지정할 수 없다.
 *
 * 토스 인증이 붙으면 이 파일과 두 환경변수를 함께 지운다.
 */

import { findOrCreateUser } from '@/lib/db/users';
import { createToken } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';

// 빈 문자열은 없는 것으로 친다. ALLOW_TOSS_TEST="" 로 꺼둔 줄 알았는데
// 켜져 있는 상황을 막는다.
const ALLOW_TOSS_TEST = process.env.ALLOW_TOSS_TEST?.trim() || undefined;
const TOSS_TEST_USER_ID = process.env.TOSS_TEST_USER_ID?.trim() || undefined;

// 꺼져 있을 때의 응답. 이 통로가 있다는 사실을 굳이 알려주지 않는다.
function denied() {
  return Response.json(
    { success: false, error: '로그인이 필요해' },
    { status: 401 }
  );
}

/**
 * POST /api/auth/toss/test
 * 고정 테스트 사용자의 JWT 발급
 */
export async function POST() {
  if (!ALLOW_TOSS_TEST) return denied();

  // Preview 배포도 NODE_ENV 는 production 이라 NODE_ENV 로는 구분이 안 된다.
  // Vercel 이 넣어주는 VERCEL_ENV 를 본다 (로컬에서는 값이 없어서 통과).
  if (process.env.VERCEL_ENV === 'production') return denied();

  if (!TOSS_TEST_USER_ID) {
    return Response.json(
      { success: false, error: 'TOSS_TEST_USER_ID 가 설정되지 않았어' },
      { status: 500 }
    );
  }

  try {
    const user = await findOrCreateUser('toss', TOSS_TEST_USER_ID);

    // 관리자에게는 이 통로로 토큰을 내주지 않는다. ADMIN_USER_ID 를 이렇게
    // 만들어진 사용자로 잘못 지정해두면 임시 로그인이 곧 관리자 로그인이 된다.
    if (isAdmin(user.id)) return denied();

    const token = createToken(user.id, 'toss');

    return Response.json({
      success: true,
      data: { token, userId: user.id },
    });
  } catch (error) {
    console.error('테스트 로그인 실패:', error);
    return Response.json(
      { success: false, error: '로그인 실패' },
      { status: 500 }
    );
  }
}
