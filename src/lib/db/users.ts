/**
 * 사용자 데이터베이스 접근 함수
 */

import { prisma } from './prisma';

// 사용자 찾기 또는 생성
// 인증 서버가 신원을 보증하는 provider(toss·web)용. local 은 비밀번호를
// 확인해야 하므로 아래 findLocalUser / createLocalUser 를 쓴다.
export async function findOrCreateUser(
  provider: 'toss' | 'web',
  providerUserId: string
) {
  // 기존 사용자 찾기
  let user = await prisma.user.findUnique({
    where: {
      provider_providerUserId: {
        provider,
        providerUserId,
      },
    },
  });

  if (!user) {
    // 새 사용자 생성 (동의 시각은 가입 시점으로)
    const now = new Date();
    user = await prisma.user.create({
      data: {
        provider,
        providerUserId,
        agreedAt: now,
        ageConfirmedAt: now,
      },
    });
  }

  return user;
}

// 자체 로그인 사용자 찾기 (아이디로)
// 비밀번호 확인이 필요하므로 passwordHash 까지 함께 돌려준다.
// 이 값은 절대 응답 본문에 담지 않는다.
export async function findLocalUser(username: string) {
  return prisma.user.findUnique({
    where: {
      provider_providerUserId: {
        provider: 'local',
        providerUserId: username,
      },
    },
  });
}

// 자체 로그인 사용자 생성
//
// 아이디가 이미 있으면 Prisma 가 P2002(고유 제약 위반)를 던진다.
// 먼저 조회해서 없으면 만드는 방식은 두 요청이 같은 순간에 들어올 때
// 둘 다 '없음'을 보고 통과하므로, DB 제약을 최종 판단으로 삼는다.
export async function createLocalUser(username: string, passwordHash: string) {
  const now = new Date();

  return prisma.user.create({
    data: {
      provider: 'local',
      providerUserId: username,
      passwordHash,
      agreedAt: now,
      ageConfirmedAt: now,
    },
  });
}

// ID로 사용자 찾기
export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

// 사용자 삭제 (회원 탈퇴)
export async function deleteUser(userId: string) {
  // memos.ts의 deleteAllUserData를 사용하는 것이 권장됨
  // 여기서는 단순 삭제만 제공 (Cascade로 메모도 함께 삭제됨)
  return prisma.user.delete({
    where: { id: userId },
  });
}
