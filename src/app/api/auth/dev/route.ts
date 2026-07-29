/**
 * 개발용 로그인 API
 * 프로덕션에서는 비활성화해야 함!
 */

import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateUser } from '@/lib/db/users';
import { createToken } from '@/lib/auth/session';
import { TOKEN_EXPIRY_DAYS } from '@/lib/utils/constants';

const SESSION_COOKIE_NAME = 'dumpy_session';

export async function GET(request: NextRequest) {
  // 개발 환경에서만 허용
  if (process.env.NODE_ENV === 'production') {
    return Response.json(
      { success: false, error: '프로덕션에서는 사용할 수 없어' },
      { status: 403 }
    );
  }

  try {
    // 개발용 사용자 생성
    const user = await findOrCreateUser('web', 'dev_user_123');

    // JWT 토큰 생성
    const token = createToken(user.id, 'web');

    // 메인 페이지로 리다이렉트하면서 쿠키 설정
    const response = NextResponse.redirect(new URL('/', request.nextUrl.origin));

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: false, // 개발 환경에서는 false
      sameSite: 'lax',
      maxAge: TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('개발 로그인 실패:', error);
    // 디버그용: 에러 상세 정보 반환
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      { success: false, error: '로그인 실패', debug: errorMessage },
      { status: 500 }
    );
  }
}
