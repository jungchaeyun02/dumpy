/**
 * 삭제된 메모 정리 스크립트
 *
 * 30일 지난 삭제 메모를 완전히 삭제합니다.
 * cron job이나 스케줄러로 매일 실행하세요.
 *
 * 실행 방법:
 * npx ts-node scripts/cleanup-deleted-memos.ts
 *
 * 또는 package.json에 추가:
 * "scripts": {
 *   "cleanup": "ts-node scripts/cleanup-deleted-memos.ts"
 * }
 */

import { PrismaClient } from '@prisma/client';

const SOFT_DELETE_RETENTION_DAYS = 30;

async function cleanupDeletedMemos() {
  const prisma = new PrismaClient();

  try {
    console.log('삭제된 메모 정리 시작...');

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - SOFT_DELETE_RETENTION_DAYS);

    console.log(`기준일: ${cutoff.toISOString()} 이전에 삭제된 메모`);

    // 삭제 대상 조회
    const targetMemos = await prisma.memo.findMany({
      where: {
        deletedAt: {
          lt: cutoff,
        },
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    console.log(`삭제 대상: ${targetMemos.length}개`);

    if (targetMemos.length === 0) {
      console.log('삭제할 메모가 없습니다.');
      return;
    }

    // 완전 삭제
    const result = await prisma.memo.deleteMany({
      where: {
        deletedAt: {
          lt: cutoff,
        },
      },
    });

    console.log(`완전 삭제 완료: ${result.count}개`);
  } catch (error) {
    console.error('정리 중 오류 발생:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 직접 실행 시
cleanupDeletedMemos()
  .then(() => {
    console.log('정리 작업 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('정리 작업 실패:', error);
    process.exit(1);
  });
