/**
 * 카카오 로그인 콜백 (웹용)
 *
 * 보안 원칙:
 * - 클라이언트가 보낸 코드를 받음
 * - 서버가 카카오 서버에 직접 검증 요청
 * - 카카오 서버에서 검증된 식별자를 받음
 * - 이 식별자로만 사용자를 찾거나 생성
 */

import { NextRequest } from 'next/server';
import { findOrCreateUser } from '@/lib/db/users';
import { setSessionCookie } from '@/lib/auth/session';

/**
 * GET /api/auth/kakao/callback
 * 카카오 인증 후 콜백
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('카카오 인증 오류:', error);
    return Response.redirect(new URL('/?error=auth_failed', request.nextUrl.origin));
  }

  if (!code) {
    return Response.redirect(new URL('/?error=no_code', request.nextUrl.origin));
  }

  try {
    // 카카오 서버에 토큰 요청
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID!,
        client_secret: process.env.KAKAO_CLIENT_SECRET || '',
        redirect_uri: process.env.KAKAO_REDIRECT_URI!,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('카카오 토큰 요청 실패:', tokenResponse.status);
      return Response.redirect(new URL('/?error=token_failed', request.nextUrl.origin));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 카카오 서버에 사용자 정보 요청
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      console.error('카카오 사용자 정보 요청 실패:', userResponse.status);
      return Response.redirect(new URL('/?error=user_info_failed', request.nextUrl.origin));
    }

    const userData = await userResponse.json();

    // 카카오 서버에서 검증된 사용자 ID
    const kakaoUserId = String(userData.id);

    // 사용자 찾거나 생성
    const user = await findOrCreateUser('web', kakaoUserId);

    // 세션 쿠키 설정 (웹은 쿠키 사용)
    await setSessionCookie(user.id, 'web');

    // 메인 페이지로 리다이렉트
    return Response.redirect(new URL('/', request.nextUrl.origin));
  } catch (error) {
    console.error('카카오 인증 처리 실패:', error);
    return Response.redirect(new URL('/?error=auth_error', request.nextUrl.origin));
  }
}
