/**
 * 메모 데이터베이스 접근 함수
 *
 * 보안 규칙:
 * 1. 모든 함수는 userId를 필수로 받음 - 컴파일 타임에 강제
 * 2. PATCH/DELETE는 소유권 검증 후 처리
 * 3. 권한 없는 접근은 "없는 메모"로 응답 (메모 존재 여부 노출 방지)
 */

import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import { SOFT_DELETE_RETENTION_DAYS } from '../utils/constants';

// 타입 정의
type CategoryInput = '할일' | '일기' | '모아둔것' | '그외';
type CategoryDb = 'todo' | 'diary' | 'collected' | 'etc';
type ClassifiedBy = 'auto' | 'manual';

const categoryMap: Record<CategoryInput, CategoryDb> = {
  '할일': 'todo',
  '일기': 'diary',
  '모아둔것': 'collected',
  '그외': 'etc',
};

export function toPrismaCategory(input: CategoryInput): CategoryDb {
  return categoryMap[input];
}

// 메모 생성
//
// 저장 직후의 전체 메모 개수를 함께 돌려준다. '생애 첫 메모'인지 판정하는 데 쓴다.
// 삭제·완료된 것까지 전부 센다 - 한 번 쓰고 지운 사람에게 다시 "첫 메모"라고
// 하면 안 되므로 deletedAt/isDone으로 거르지 않는다.
//
// 한 트랜잭션으로 묶는 이유: create와 count가 떨어져 있으면 동시에 두 건이
// 저장될 때 둘 다 2를 보고 아무도 첫 메모가 되지 못한다.
export async function createMemo(
  userId: string, // 필수!
  data: {
    content: string;
    category: CategoryInput;
    classifiedBy: ClassifiedBy;
    autoCategory: CategoryInput | null;
    confidence: number;
    hasDeadline: boolean;
  }
) {
  const [memo, totalCount] = await prisma.$transaction([
    prisma.memo.create({
      data: {
        userId,
        content: data.content,
        category: toPrismaCategory(data.category),
        classifiedBy: data.classifiedBy,
        autoCategory: data.autoCategory ? toPrismaCategory(data.autoCategory) : null,
        confidence: data.confidence,
        hasDeadline: data.hasDeadline,
      },
    }),
    prisma.memo.count({ where: { userId } }),
  ]);

  return { memo, totalCount };
}

// 사용자의 모든 메모 조회 (삭제되지 않은 것만)
export async function getMemosByUser(userId: string) {
  const memos = await prisma.memo.findMany({
    where: {
      userId, // 반드시 userId로 필터
      deletedAt: null,
      isDone: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // 카테고리별로 그룹화
  const grouped = {
    todo: memos.filter((m) => m.category === 'todo'),
    diary: memos.filter((m) => m.category === 'diary'),
    collected: memos.filter((m) => m.category === 'collected'),
    etc: memos.filter((m) => m.category === 'etc'),
  };

  return grouped;
}

// 완료된 메모 조회
export async function getDoneMemos(userId: string) {
  return prisma.memo.findMany({
    where: {
      userId,
      deletedAt: null,
      isDone: true,
    },
    orderBy: {
      doneAt: 'desc',
    },
  });
}

// 특정 메모 조회 (소유권 검증 포함)
// 소유하지 않은 메모는 null 반환 (존재 여부 노출 방지)
export async function getMemoByIdAndUser(
  memoId: string,
  userId: string // 필수!
) {
  return prisma.memo.findFirst({
    where: {
      id: memoId,
      userId, // 반드시 소유자 검증
      deletedAt: null,
    },
  });
}

// 메모 업데이트 (소유권 검증 포함)
export async function updateMemo(
  memoId: string,
  userId: string, // 필수!
  data: {
    content?: string;
    category?: CategoryInput;
    isDone?: boolean;
  }
) {
  // 먼저 소유권 확인
  const existing = await getMemoByIdAndUser(memoId, userId);
  if (!existing) {
    return null; // 없는 메모로 응답
  }

  const updateData: Prisma.MemoUpdateInput = {};

  if (data.content !== undefined) {
    updateData.content = data.content;
  }

  if (data.category !== undefined) {
    updateData.category = toPrismaCategory(data.category);
    updateData.classifiedBy = 'manual'; // 수동 분류로 변경
  }

  if (data.isDone !== undefined) {
    updateData.isDone = data.isDone;
    updateData.doneAt = data.isDone ? new Date() : null;
  }

  return prisma.memo.update({
    where: { id: memoId },
    data: updateData,
  });
}

// 메모 삭제 (soft delete, 소유권 검증 포함)
export async function deleteMemo(
  memoId: string,
  userId: string // 필수!
) {
  // 먼저 소유권 확인
  const existing = await getMemoByIdAndUser(memoId, userId);
  if (!existing) {
    return null; // 없는 메모로 응답
  }

  return prisma.memo.update({
    where: { id: memoId },
    data: { deletedAt: new Date() },
  });
}

// 30일 지난 삭제 메모 완전 삭제 (정기 작업용)
export async function purgeDeletedMemos() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SOFT_DELETE_RETENTION_DAYS);

  return prisma.memo.deleteMany({
    where: {
      deletedAt: {
        lt: cutoff,
      },
    },
  });
}

// 회원 탈퇴 시 모든 데이터 즉시 삭제
export async function deleteAllUserData(userId: string) {
  // 트랜잭션으로 메모와 사용자 모두 삭제
  return prisma.$transaction([
    prisma.memo.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
}
