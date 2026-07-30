/**
 * 자체 로그인(아이디·비밀번호) 공통 처리
 *
 * 가입과 로그인이 앞부분을 똑같이 처리해야 해서 한곳에 모았다.
 * 요청 제한 → 본문 파싱 → 형식 검증 순서이고, 어느 단계든 걸리면
 * 그대로 돌려줄 Response 를 만들어 준다.
 */

import { NextRequest } from 'next/server';
import { checkAuthRateLimit } from './rateLimit';
import { validateUsername, validatePassword, isRequestBodySizeValid } from '../utils/validation';

// 아이디·비밀번호만 담긴 본문이므로 넉넉히 잡아도 이 정도면 충분하다
const MAX_BODY_BYTES = 2000;

/**
 * 요청 IP 추출
 *
 * Vercel 같은 프록시 뒤에서는 실제 IP 가 x-forwarded-for 에 담겨 오고,
 * 맨 앞 항목이 원래 클라이언트다. 알 수 없으면 'unknown' 으로 묶는다
 * (묶이는 쪽이 제한을 못 걸어 통과시키는 것보다 안전하다).
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}

type CredentialsResult =
  | { ok: true; username: string; password: string }
  | { ok: false; response: Response };

/**
 * 가입·로그인 요청에서 아이디와 비밀번호를 꺼낸다
 *
 * @param validateFormat 비밀번호 형식(길이 등)까지 볼지 여부.
 *   가입은 true. 로그인은 false 로 둔다 — 기존 계정의 비밀번호가
 *   지금 규칙보다 짧을 수 있고, 무엇보다 "비밀번호가 8자 이상이어야 해" 같은
 *   응답은 입력한 값의 성질을 알려주는 힌트가 된다.
 */
export async function readCredentials(
  request: NextRequest,
  validateFormat: boolean
): Promise<CredentialsResult> {
  // 1. 요청 제한 (로그인 전이라 IP 기준)
  const ip = getClientIp(request);
  const rateLimit = checkAuthRateLimit(ip);

  if (!rateLimit.allowed) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: `너무 빨라! ${rateLimit.resetIn}초 뒤에 다시 해줘` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetIn) } }
      ),
    };
  }

  // 2. 본문 읽기 — 크기를 먼저 재려면 텍스트로 받아야 한다
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, response: badRequest('요청을 읽지 못했어') };
  }

  if (!isRequestBodySizeValid(raw, MAX_BODY_BYTES)) {
    return { ok: false, response: badRequest('요청이 너무 커') };
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, response: badRequest('올바르지 않은 형식이야') };
  }

  if (typeof body !== 'object' || body === null) {
    return { ok: false, response: badRequest('올바르지 않은 형식이야') };
  }

  const { username, password } = body as Record<string, unknown>;

  // 3. 아이디 형식 검증 — 정규화된 값을 받아 쓴다
  const usernameCheck = validateUsername(username);
  if (!usernameCheck.valid || !usernameCheck.sanitized) {
    return { ok: false, response: badRequest(usernameCheck.error ?? '올바르지 않은 아이디야') };
  }

  if (typeof password !== 'string') {
    return { ok: false, response: badRequest('올바르지 않은 형식이야') };
  }

  // 4. 비밀번호 형식 검증 (가입만)
  if (validateFormat) {
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return { ok: false, response: badRequest(passwordCheck.error ?? '올바르지 않은 비밀번호야') };
    }
  }

  return { ok: true, username: usernameCheck.sanitized, password };
}

function badRequest(error: string): Response {
  return Response.json({ success: false, error }, { status: 400 });
}
