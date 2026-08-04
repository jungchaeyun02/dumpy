/**
 * 토스 인증 검증 - POST /api/auth/toss/verify
 *
 * 미니앱이 SDK 의 getAnonymousKey() 로 받은 hash 를 이 경로로 보낸다.
 * 그 값으로 사용자를 찾거나 만들고 우리 JWT 를 돌려준다.
 *
 * ┌─ 이 경로의 성격을 먼저 적어둔다 ────────────────────────────────────┐
 * │ hash 는 미니앱 안에서 발급된다. 우리가 토스에 "이 값 진짜냐"고       │
 * │ 물어볼 곳이 없다. 그래서 이 경로는 검증(verify)이 아니라 실질적으로  │
 * │ "hash 를 비밀번호로 쓰는 로그인"이다.                                │
 * │                                                                      │
 * │ 남의 hash 를 손에 넣은 사람은 그 계정의 일기를 그대로 읽는다.        │
 * │ 아래 방어들은 그 사실을 없애지 못한다. 추측 비용을 올리고 새는       │
 * │ 경로를 줄일 뿐이다. 이름을 verify 로 둔 건 미니앱이 이미 그 주소를   │
 * │ 부르고 있어서이고, 하는 일은 로그인이다.                             │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * CORS 헤더는 proxy.ts 가 /api/auth/toss/:path* 로 붙인다. 다만 CORS 는
 * 브라우저에게 응답을 넘겨줄지 정할 뿐이라 요청 자체는 막지 못해서,
 * Origin 은 이 안에서 한 번 더 본다.
 */

import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';
import { findOrCreateUser } from '@/lib/db/users';
import { createToken } from '@/lib/auth/session';
import { checkAuthRateLimit } from '@/lib/auth/rateLimit';
import { getClientIp } from '@/lib/auth/localAuth';
import { isRequestBodySizeValid } from '@/lib/utils/validation';
import { isAllowedOrigin } from '@/lib/cors';

// prisma·jsonwebtoken 이 Node 런타임을 요구한다. 나중에 누가 런타임을 바꾸면
// 빌드가 아니라 실행 중에 터지므로 명시해둔다.
export const runtime = 'nodejs';

// hash 하나만 담긴 본문이다. 이보다 클 이유가 없다.
const MAX_BODY_BYTES = 1024;

// 미니앱이 보내는 필드 이름
const HASH_FIELD = 'hash';

/**
 * hash 형식
 *
 * TODO(확정 필요): getAnonymousKey() 가 실제로 어떤 길이·문자셋을 주는지
 * 아직 실기기에서 못 봤다. 지금은 "해시처럼 생긴 문자열"까지만 좁혀두고,
 * 아래 logHashShape() 가 실제 모양을 로그로 남긴다. 값을 확인하면 이 정규식을
 * 정확한 형태(예: /^[a-f0-9]{64}$/)로 조인다.
 *
 * 이 검사가 사실상 유일한 추측 방어라서, 좁힐수록 직접 이득이다.
 * 16진수·base64·base64url 을 모두 통과시키는 범위로 두었다.
 */
const HASH_PATTERN = /^[A-Za-z0-9_=+/.-]{16,256}$/;

/**
 * 관측된 hash 의 모양만 로그로 남긴다
 *
 * hash 자체는 절대 로그에 넣지 않는다. 로그는 우리 말고도 여러 사람이 보고,
 * 이 값은 그 자체로 로그인 수단이다. 길이와 문자 종류만 남겨서 나중에
 * HASH_PATTERN 을 조일 근거로 쓴다.
 */
function logHashShape(hash: string): void {
  const shape = /^[a-f0-9]+$/.test(hash)
    ? 'lower-hex'
    : /^[A-F0-9]+$/.test(hash)
      ? 'upper-hex'
      : /^[A-Za-z0-9_-]+$/.test(hash)
        ? 'base64url'
        : 'mixed';

  console.info('[toss/verify] hash shape', { length: hash.length, shape });
}

function fail(error: string, status: number, extraHeaders?: HeadersInit): Response {
  return Response.json({ success: false, error }, { status, headers: extraHeaders });
}

export async function POST(request: NextRequest) {
  // 1. 요청 제한. 로그인 전이라 IP 로 센다.
  const rateLimit = checkAuthRateLimit(getClientIp(request));
  if (!rateLimit.allowed) {
    return fail(`너무 빨라! ${rateLimit.resetIn}초 뒤에 다시 해줘`, 429, {
      'Retry-After': String(rateLimit.resetIn),
    });
  }

  // 2. Origin 확인
  //
  //    Origin 이 붙어 있는데 허용 목록 밖이면 거부한다. 이건 다른 웹페이지가
  //    사용자 브라우저를 시켜 이 경로를 부르는 경우를 막는다.
  //
  //    Origin 이 아예 없으면 통과시킨다. 헤더는 브라우저가 붙이는 것이고
  //    미니앱 웹뷰가 이 요청에 Origin 을 붙이는지 아직 확인하지 못했다.
  //    여기서 막으면 로그인이 통째로 죽을 수 있어서 로그만 남긴다.
  //    실기기 로그에서 Origin 이 항상 온다는 게 확인되면, 아래 `if (!origin)`
  //    가지를 거부로 바꾸는 게 맞다.
  //
  //    어느 쪽이든 curl 은 못 막는다. Origin 은 요청을 보내는 쪽이 적는 값이라
  //    브라우저 밖에서는 아무 값이나 넣을 수 있다. 인증 수단이 아니다.
  const origin = request.headers.get('origin');
  if (!origin) {
    console.info('[toss/verify] Origin 헤더 없음');
  } else if (!isAllowedOrigin(origin)) {
    console.warn('[toss/verify] 허용되지 않은 Origin:', origin);
    return fail('허용되지 않은 요청이야', 403);
  }

  // 3. 본문에서 hash 꺼내기
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return fail('요청을 읽지 못했어', 400);
  }

  if (!isRequestBodySizeValid(raw, MAX_BODY_BYTES)) {
    return fail('요청이 너무 커', 400);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail('올바르지 않은 형식이야', 400);
  }

  if (typeof body !== 'object' || body === null) {
    return fail('올바르지 않은 형식이야', 400);
  }

  const value = (body as Record<string, unknown>)[HASH_FIELD];

  if (typeof value !== 'string') {
    return fail('인증 정보가 없어', 400);
  }

  const hash = value.trim();

  // 4. 형식 검사
  //
  //    "그럴듯한 문자열이면 통과"가 아니라 "이 모양이 아니면 거부"다.
  //    hash 가 실제로 긴 난수 해시라면 이 한 줄이 임의 문자열을 넣어보는
  //    시도를 사실상 전부 걷어낸다. 반대로 hash 가 짧거나 예측 가능한
  //    값이면 이 검사도 별 소용이 없다 — 그래서 실제 형식 확인이 중요하다.
  if (!HASH_PATTERN.test(hash)) {
    return fail('인증 정보가 올바르지 않아', 400);
  }

  logHashShape(hash);

  // 5. 사용자 찾거나 만들고 토큰 발급
  //
  //    응답은 신규든 기존이든 똑같다. 여기서 "이 계정 있음/없음"이 갈리면
  //    hash 를 넣어보며 존재 여부를 훑는 창구가 된다.
  try {
    const user = await findOrCreateUser('toss', deriveProviderUserId(hash));
    const token = createToken(user.id, 'toss');

    return Response.json({
      success: true,
      data: { token, userId: user.id },
    });
  } catch (error) {
    // 시크릿이 없으면 아무도 로그인할 수 없다. 다시 시도해도 소용없는 상태라
    // 500 이 아니라 503 으로 내보내고, 로그에서 바로 눈에 띄게 남긴다.
    if (error instanceof MissingSecretError) {
      console.error(
        '[toss/verify] TOSS_HASH_SECRET 이 설정되지 않았다. ' +
          '이 값이 없으면 토스 로그인이 전부 막힌다.'
      );
      return fail('로그인을 잠시 쓸 수 없어. 잠시 뒤에 다시 해줘', 503);
    }

    console.error(
      '토스 로그인 처리 실패:',
      error instanceof Error ? error.message : error
    );
    return fail('로그인에 실패했어. 잠시 뒤에 다시 해줘', 500);
  }
}

/**
 * hash 를 DB 에 저장할 providerUserId 로 바꾼다
 *
 * HMAC-SHA256(TOSS_HASH_SECRET, hash) 의 hex 를 저장한다. 단방향이라 저장된
 * 값에서 hash 를 되돌릴 수 없고, 시크릿 없이는 어느 값을 보내야 그 계정이
 * 되는지도 알 수 없다. DB 를 통째로 들고 나가도 로그인 수단은 따라가지 않는다.
 *
 * 평범한 해시(SHA-256) 가 아니라 HMAC 인 이유: hash 의 후보 공간이 좁으면
 * 그냥 해시는 미리 계산해둔 표로 뒤집힌다. 시크릿이 그 표를 못 만들게 한다.
 *
 * ⚠️ TOSS_HASH_SECRET 은 한 번 정하면 못 바꾸는 값이다. 바꾸는 순간 기존
 *    사용자 전원이 다른 providerUserId 로 계산되어 빈 계정으로 새로 가입된다.
 *    JWT_SECRET 과 같은 값을 쓰지 말 것 — JWT 시크릿은 갈아끼울 수 있어야
 *    하는데 이건 그럴 수 없어서 수명이 다르다.
 *
 * 시크릿이 없으면 던진다. 없는 채로 넘어가면 hash 를 그대로 저장하던 예전
 * 동작으로 조용히 돌아가는 셈이라, 그 쪽이 훨씬 나쁘다.
 */
function deriveProviderUserId(hash: string): string {
  const secret = process.env.TOSS_HASH_SECRET?.trim();
  if (!secret) throw new MissingSecretError();

  return createHmac('sha256', secret).update(hash).digest('hex');
}

/**
 * TOSS_HASH_SECRET 미설정.
 *
 * 사용자 잘못이 아니라 배포 설정 문제라서, POST 의 catch 에서 500 이 아니라
 * 503 으로 갈라 내보내려고 따로 둔다.
 */
class MissingSecretError extends Error {
  constructor() {
    super('TOSS_HASH_SECRET 미설정');
    this.name = 'MissingSecretError';
  }
}
