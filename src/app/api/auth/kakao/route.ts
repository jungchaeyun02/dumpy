/**
 * 카카오 로그인 시작 (웹용)
 */

import { NextRequest } from 'next/server';

/**
 * GET /api/auth/kakao
 * 카카오 로그인 페이지로 리다이렉트
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.KAKAO_CLIENT_ID;
  const redirectUri = process.env.KAKAO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return Response.json(
      { success: false, error: '카카오 로그인 설정이 필요해' },
      { status: 500 }
    );
  }

  const authUrl = new URL('https://kauth.kakao.com/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');

  return Response.redirect(authUrl.toString());
}
