/**
 * 지금 DATABASE_URL 이 가리키는 DB 의 사용자·메모를 JSON 으로 빼둔다
 *
 * 쓰는 때: 로컬 SQLite 에서 Postgres 로 옮기기 전, 또는 그냥 백업.
 *
 * 실행 방법:
 *   node scripts/export-backup.js
 *
 * 결과 파일에는 메모 본문과 비밀번호 해시가 들어간다.
 * .gitignore 에 넣어뒀으니 절대 커밋하지 말 것.
 */

const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const OUT_PATH = path.join(__dirname, '..', 'prisma', 'dev-db-backup.json');
const prisma = new PrismaClient();

(async () => {
  const users = await prisma.user.findMany({
    include: { memos: true },
    orderBy: { createdAt: 'asc' },
  });

  fs.writeFileSync(OUT_PATH, JSON.stringify(users, null, 2), 'utf8');

  const memoCount = users.reduce((sum, u) => sum + u.memos.length, 0);
  console.log(`사용자 ${users.length}명, 메모 ${memoCount}개 저장.`);
  console.log(`-> ${OUT_PATH}`);

  await prisma.$disconnect();
})();
