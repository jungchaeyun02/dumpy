/**
 * 토스 인증 콜백
 *
 * 핵심 보안 로직:
 * 1. 클라이언트가 보낸 코드를 받음
 * 2. 서버가 토스 서버에 mTLS로 직접 검증 요청
 * 3. 토스 서버에서 검증된 식별자를 받음
 * 4. 이 식별자로만 사용자를 찾거나 생성
 *
 * 절대 하면 안 되는 것:
 * - 클라이언트가 보낸 식별자를 그대로 사용
 */

import { NextRequest } from 'next/server';
import { findOrCreateUser } from '@/lib/db/users';
import { createToken } from '@/lib/auth/session';
import https from 'https';
import fs from 'fs';

/**
 * GET /api/auth/toss/callback
 * 토스 인증 후 콜백
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return Response.json(
      { success: false, error: '인증 코드가 없어' },
      { status: 400 }
    );
  }

  try {
    // 토스 서버에 검증 요청 (mTLS)
    const verifiedUserId = await verifyWithTossServer(code);

    if (!verifiedUserId) {
      return Response.json(
        { success: false, error: '인증에 실패했어' },
        { status: 401 }
      );
    }

    // 검증된 식별자로 사용자 찾거나 생성
    const user = await findOrCreateUser('toss', verifiedUserId);

    // JWT 토큰 발급 (미니앱은 쿠키가 아닌 토큰 사용)
    const token = createToken(user.id, 'toss');

    // 토큰을 프론트엔드에 전달하기 위해 리다이렉트
    // 실제 구현에서는 더 안전한 방법 사용 (postMessage 등)
    const redirectUrl = new URL('/mini', request.nextUrl.origin);
    redirectUrl.searchParams.set('token', token);

    return Response.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('토스 인증 실패:', error);
    return Response.json(
      { success: false, error: '인증 처리 중 오류가 발생했어' },
      { status: 500 }
    );
  }
}

/**
 * 토스 서버에 mTLS로 인증 코드 검증 요청
 *
 * 이 함수가 핵심!
 * - 클라이언트가 보낸 코드만 받고
 * - 식별자는 토스 서버에서 직접 받아옴
 */
async function verifyWithTossServer(code: string): Promise<string | null> {
  // 개발 환경에서는 목업
  if (process.env.NODE_ENV === 'development') {
    // 개발용 임시 식별자
    return `dev_user_${code.slice(0, 8)}`;
  }

  const certPath = process.env.TOSS_MTLS_CERT_PATH;
  const keyPath = process.env.TOSS_MTLS_KEY_PATH;
  const appSecret = process.env.TOSS_API_SECRET;

  if (!certPath || !keyPath || !appSecret) {
    console.error('토스 mTLS 인증서 또는 시크릿이 설정되지 않음');
    return null;
  }

  try {
    // mTLS 인증서 로드
    const cert = fs.readFileSync(certPath);
    const key = fs.readFileSync(keyPath);

    // 토스 API 호출 (예시 - 실제 엔드포인트는 토스 문서 참조)
    const response = await fetch('https://api.toss.im/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${process.env.TOSS_APP_ID}:${appSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/toss/callback`,
      }),
      // @ts-ignore - Node.js fetch의 agent 옵션
      agent: new https.Agent({
        cert,
        key,
        rejectUnauthorized: true,
      }),
    });

    if (!response.ok) {
      console.error('토스 API 응답 오류:', response.status);
      return null;
    }

    const data = await response.json();

    // 토스 서버에서 반환한 사용자 식별자
    // 실제 필드명은 토스 API 문서 참조
    return data.user_id || data.sub || null;
  } catch (error) {
    console.error('토스 서버 검증 실패:', error);
    return null;
  }
}
