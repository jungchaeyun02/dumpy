/**
 * 자체 로그인 - 로그인
 *
 * 실패 이유는 항상 같은 문구로 돌려준다. "그 아이디는 없어" 와
 * "비밀번호가 틀렸어" 를 나눠 주면 어떤 아이디가 존재하는지 훑어볼 수 있다.
 */

import { NextRequest } from 'next/server';
import { readCredentials } from '@/lib/auth/localAuth';
import { verifyPassword } from '@/lib/auth/password';
import { setSessionCookie } from '@/lib/auth/session';
import { findLocalUser } from '@/lib/db/users';

// 아이디가 없을 때도 비교를 한 번 돌리기 위한 값.
// 없는 아이디는 즉시 실패하고 있는 아이디는 해싱만큼 걸리면,
// 응답 시간 차이로 계정 존재를 알 수 있다. 이 해시와 맞는 비밀번호는 없다.
const DUMMY_HASH =
  'scrypt$16384$00000000000000000000000000000000$' + '0'.repeat(128);

export async function POST(request: NextRequest) {
  // 로그인은 비밀번호 형식을 따지지 않는다 (localAuth.ts 주석 참고)
  const credentials = await readCredentials(request, false);
  if (!credentials.ok) return credentials.response;

  const { username, password } = credentials;

  try {
    const user = await findLocalUser(username);

    // 아이디가 없어도 같은 비용을 치른다
    const matched = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !matched) {
      return Response.json(
        { success: false, error: '아이디나 비밀번호가 맞지 않아' },
        { status: 401 }
      );
    }

    await setSessionCookie(user.id, 'local');

    return Response.json({ success: true });
  } catch (error) {
    console.error('로그인 실패:', error instanceof Error ? error.message : error);

    return Response.json(
      { success: false, error: '로그인에 실패했어. 잠시 뒤에 다시 해줘' },
      { status: 500 }
    );
  }
}
