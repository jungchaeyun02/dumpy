/**
 * dev-db-backup.json 을 현재 DATABASE_URL 이 가리키는 DB 에 되넣는다
 *
 * 쓰는 때: 로컬 SQLite 로 개발하다가 Postgres 로 옮길 때.
 * SQLite 파일은 Postgres 가 읽을 수 없어서, JSON 으로 한 번 빼서 넣는다.
 *
 * 실행 방법:
 *   node scripts/export-backup.js    # 지금 DB -> prisma/dev-db-backup.json
 *   (DATABASE_URL 을 새 DB 로 바꾸고 npm run db:deploy 로 표를 만든 뒤)
 *   node scripts/restore-backup.js   # JSON -> 새 DB
 *
 * 이미 있는 사용자는 건너뛴다. 여러 번 실행해도 메모가 복제되지 않는다.
 */

const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const BACKUP_PATH = path.join(__dirname, '..', 'prisma', 'dev-db-backup.json');
const prisma = new PrismaClient();

(async () => {
  if (!fs.existsSync(BACKUP_PATH)) {
    console.error(`백업 파일이 없어: ${BACKUP_PATH}`);
    console.error('먼저 node scripts/export-backup.js 를 실행해줘.');
    process.exit(1);
  }

  const users = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));

  let created = 0;
  let skipped = 0;
  let memoCount = 0;

  for (const user of users) {
    const exists = await prisma.user.findUnique({
      where: {
        provider_providerUserId: {
          provider: user.provider,
          providerUserId: user.providerUserId,
        },
      },
    });

    if (exists) {
      console.log(`건너뜀 (이미 있음): ${user.provider}/${user.providerUserId}`);
      skipped++;
      continue;
    }

    // id 를 그대로 살려서 만든다. 메모가 userId 로 사용자를 가리키므로
    // 새 id 를 받으면 관계를 다시 엮어야 한다.
    await prisma.user.create({
      data: {
        id: user.id,
        provider: user.provider,
        providerUserId: user.providerUserId,
        passwordHash: user.passwordHash ?? null,
        agreedAt: new Date(user.agreedAt),
        ageConfirmedAt: new Date(user.ageConfirmedAt),
        createdAt: new Date(user.createdAt),
        memos: {
          create: user.memos.map((m) => ({
            id: m.id,
            content: m.content,
            category: m.category,
            classifiedBy: m.classifiedBy,
            autoCategory: m.autoCategory,
            confidence: m.confidence,
            hasDeadline: m.hasDeadline,
            isDone: m.isDone,
            doneAt: m.doneAt ? new Date(m.doneAt) : null,
            createdAt: new Date(m.createdAt),
            updatedAt: new Date(m.updatedAt),
            deletedAt: m.deletedAt ? new Date(m.deletedAt) : null,
          })),
        },
      },
    });

    console.log(`복원: ${user.provider}/${user.providerUserId} (메모 ${user.memos.length}개)`);
    created++;
    memoCount += user.memos.length;
  }

  console.log(`\n사용자 ${created}명, 메모 ${memoCount}개 복원. 건너뜀 ${skipped}명.`);

  await prisma.$disconnect();
})();
