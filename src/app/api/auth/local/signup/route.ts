/**
 * 자체 로그인 - 가입
 *
 * 카카오 없이 아이디·비밀번호만으로 계정을 만든다.
 * 이메일·전화번호를 받지 않으므로 비밀번호를 잊으면 복구할 방법이 없다.
 */

import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { readCredentials } from '@/lib/auth/localAuth';
import { hashPassword } from '@/lib/auth/password';
import { setSessionCookie } from '@/lib/auth/session';
import { createLocalUser } from '@/lib/db/users';

export async function POST(request: NextRequest) {
  // 가입은 비밀번호 형식(길이)까지 확인한다
  const credentials = await readCredentials(request, true);
  if (!credentials.ok) return credentials.response;

  const { username, password } = credentials;

  try {
    const passwordHash = await hashPassword(password);
    const user = await createLocalUser(username, passwordHash);

    // 가입하면 바로 로그인 상태로 만든다
    await setSessionCookie(user.id, 'local');

    return Response.json({ success: true });
  } catch (error) {
    // 아이디 중복. 가입은 "이 아이디를 쓸 수 있는지"를 알려주는 게 목적이라
    // 여기서만은 계정 존재를 드러내는 응답이 불가피하다.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return Response.json(
        { success: false, error: '이미 있는 아이디야. 다른 걸로 해줘' },
        { status: 409 }
      );
    }

    // 비밀번호가 로그에 섞이지 않게 메시지만 남긴다
    console.error('가입 실패:', error instanceof Error ? error.message : error);

    return Response.json(
      { success: false, error: '가입에 실패했어. 잠시 뒤에 다시 해줘' },
      { status: 500 }
    );
  }
}
