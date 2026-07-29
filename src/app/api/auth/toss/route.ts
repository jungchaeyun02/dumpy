/**
 * 토스 인증 시작
 *
 * 보안 원칙:
 * - 클라이언트가 보낸 식별자를 믿지 않음
 * - 서버가 토스 서버에 직접 물어 검증한 값만 사용
 */

import { NextRequest } from 'next/server';

/**
 * GET /api/auth/toss
 * 토스 로그인 시작 - 토스 인증 페이지로 리다이렉트
 */
export async function GET(request: NextRequest) {
  const appId = process.env.TOSS_APP_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/toss/callback`;

  if (!appId) {
    return Response.json(
      { success: false, error: '토스 설정이 필요해' },
      { status: 500 }
    );
  }

  // 토스 인증 페이지로 리다이렉트
  // 실제 구현에서는 토스 앱인토스 SDK의 인증 방식을 따름
  // 여기서는 예시 URL 형태
  const authUrl = new URL('https://auth.toss.im/authorize');
  authUrl.searchParams.set('app_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');

  return Response.redirect(authUrl.toString());
}
