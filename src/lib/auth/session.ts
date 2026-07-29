/**
 * 세션 관리
 *
 * - 토스 미니앱: JWT 토큰 (쿠키 사용 불가 - iOS 차단)
 * - 웹: HttpOnly 쿠키
 */

import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { SessionPayload, Provider } from '@/types';
import { TOKEN_EXPIRY_DAYS } from '../utils/constants';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const SESSION_COOKIE_NAME = 'dumpy_session';

/**
 * JWT 토큰 생성 (토스 미니앱용)
 */
export function createToken(userId: string, provider: Provider): string {
  const payload: Omit<SessionPayload, 'iat' | 'exp'> = {
    userId,
    provider,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: `${TOKEN_EXPIRY_DAYS}d`,
  });
}

/**
 * JWT 토큰 검증 (토스 미니앱용)
 */
export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * 세션 쿠키 설정 (웹용)
 */
export async function setSessionCookie(userId: string, provider: Provider) {
  const token = createToken(userId, provider);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
    path: '/',
  });
}

/**
 * 세션 쿠키 가져오기 (웹용)
 */
export async function getSessionFromCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  return verifyToken(token);
}

/**
 * 세션 쿠키 삭제 (웹용 로그아웃)
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Authorization 헤더에서 토큰 추출
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}
