/**
 * 사용자 데이터베이스 접근 함수
 */

import { prisma } from './prisma';

// 사용자 찾기 또는 생성
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
