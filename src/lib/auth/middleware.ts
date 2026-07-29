/**
 * API 인증 미들웨어
 *
 * 모든 API 요청에서 세션을 확인하고 userId를 추출
 * 클라이언트가 보낸 userId는 절대 사용하지 않음!
 */

import { NextRequest } from 'next/server';
import { verifyToken, extractTokenFromHeader, getSessionFromCookie } from './session';
import type { SessionPayload } from '@/types';

/**
 * 요청에서 세션 정보 추출
 *
 * 1. Authorization 헤더 확인 (토스 미니앱)
 * 2. 쿠키 확인 (웹)
 */
export async function getSession(request: NextRequest): Promise<SessionPayload | null> {
  // 1. Authorization 헤더 확인 (Bearer 토큰)
  const authHeader = request.headers.get('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    const session = verifyToken(token);
    if (session) return session;
  }

  // 2. 쿠키 확인
  const cookieSession = await getSessionFromCookie();
  if (cookieSession) return cookieSession;

  return null;
}

/**
 * 인증 필수 API용 래퍼
 * 인증되지 않으면 401 응답
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ session: SessionPayload } | { error: Response }> {
  const session = await getSession(request);

  if (!session) {
    return {
      error: Response.json(
        { success: false, error: '로그인이 필요해' },
        { status: 401 }
      ),
    };
  }

  return { session };
}
