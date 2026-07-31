/**
 * 미니앱용 CORS 관문
 *
 * Next 16 부터 middleware 는 proxy 로 이름이 바뀌었다. 파일은 app 과 같은
 * 높이(src/)에 하나만 둘 수 있다.
 *
 * 여기서 하는 일은 두 가지뿐이다.
 *   1. OPTIONS 사전 요청을 204 로 끝낸다 (라우트에 OPTIONS 핸들러가 없어서
 *      여기서 안 받으면 405 가 나가고 본 요청은 시작도 못 한다)
 *   2. 허용 목록에 있는 Origin 이면 응답에 CORS 헤더를 붙인다
 *
 * 인증은 건드리지 않는다. 통과시킨 요청도 라우트의 requireAuth 를 그대로 만난다.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applyCorsHeaders, preflightHeaders } from '@/lib/cors';

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin');

  // 사전 요청은 여기서 끝낸다. 본문 없는 204.
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: preflightHeaders(origin),
    });
  }

  const response = NextResponse.next();
  applyCorsHeaders(response.headers, origin);
  return response;
}

/**
 * 미니앱이 실제로 부르는 경로만 연다.
 *
 * 허용할 것을 적는 방식이다. `/api/:path*` 로 전부 열고 예외를 빼는 방식은
 * 라우트가 하나 늘 때마다 조용히 노출되므로 쓰지 않는다.
 *
 * 여기 없는 것들은 의도적으로 뺐다:
 *   - /api/admin/*        관리자 전용. 교차 출처로 부를 일이 없다
 *   - /api/auth/kakao/*   웹 전용 로그인 흐름. 리다이렉트로 도는 길이라
 *                         CORS 와 무관하고, 손대면 기존 로그인이 깨진다
 *   - /api/auth/local/*, /api/auth/dev, /api/auth/logout
 *                         전부 웹 전용. 쿠키로 도는 길이다
 *
 * `:path*` 는 하위 경로가 없는 경우도 포함한다 (/api/me 자체도 걸린다).
 */
export const config = {
  matcher: ['/api/memos/:path*', '/api/me/:path*', '/api/auth/toss/:path*'],
};
