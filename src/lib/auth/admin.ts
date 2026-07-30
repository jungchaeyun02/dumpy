/**
 * 관리자 권한 확인
 *
 * 권한을 User 테이블의 컬럼으로 두지 않고 환경변수 하나로 지정한다.
 * 관리자가 한 명이고, DB 안에 권한이 있으면 DB 쓰기가 한 번 뚫리는 것만으로
 * 권한 상승까지 이어지기 때문. 관리자를 바꾸려면 ADMIN_USER_ID 를 바꾸고
 * 다시 배포한다 (모듈 로드 시점에 한 번 읽으므로 재시작 전에는 안 바뀐다).
 *
 * 권한이 없을 때 403 대신 404 를 돌려준다. 관리자 화면이 있다는 사실 자체를
 * 로그인한 남에게 알려줄 이유가 없다. 메모 소유권 검증이 "없는 메모"로
 * 응답하는 것과 같은 방식이다.
 */

import { NextRequest } from 'next/server';
import { notFound } from 'next/navigation';
import { getSession } from './middleware';
import { getSessionFromCookie } from './session';
import type { SessionPayload } from '@/types';

// 빈 문자열을 undefined 로 정규화한다. 이게 없으면 ADMIN_USER_ID="" 인 환경에서
// 세션 userId 도 빈 문자열일 때 비교가 통과할 여지가 생긴다.
const ADMIN_USER_ID = process.env.ADMIN_USER_ID?.trim() || undefined;

/**
 * 이 userId 가 관리자인지
 *
 * ADMIN_USER_ID 가 비어 있으면 관리자가 없는 상태로 둔다 - 아무도 통과 못 한다.
 */
export function isAdmin(userId: string | null | undefined): boolean {
  if (!ADMIN_USER_ID || !userId) return false;
  return userId === ADMIN_USER_ID;
}

/**
 * 관리자 전용 API용 래퍼
 * 관리자가 아니면(비로그인 포함) 404 응답
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ session: SessionPayload } | { error: Response }> {
  const session = await getSession(request);

  if (!isAdmin(session?.userId)) {
    return {
      error: Response.json(
        { success: false, error: '없는 주소야' },
        { status: 404 }
      ),
    };
  }

  // isAdmin 이 통과했으면 session 은 반드시 있다 (userId 없이는 통과 못 함)
  return { session: session! };
}

/**
 * 관리자 전용 페이지용 관문 (서버 컴포넌트에서 호출)
 *
 * 쿠키만 본다. 관리자 화면은 웹 전용이고, 미니앱은 Authorization 헤더를
 * 붙일 수 없는 문서 요청으로 페이지를 받기 때문에 헤더 경로가 의미가 없다.
 */
export async function requireAdminPage(): Promise<SessionPayload> {
  const session = await getSessionFromCookie();

  if (!isAdmin(session?.userId)) {
    notFound();
  }

  return session!;
}
