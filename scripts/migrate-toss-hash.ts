/**
 * 기존 toss 계정의 providerUserId 를 HMAC 으로 옮긴다
 *
 * 언제 쓰나:
 *   HMAC 저장(= deriveProviderUserId 변경)을 배포하기 전에 한 번 돌린다.
 *   배포부터 하면 기존 사용자가 접속하는 순간 계산값이 달라져서, 자기 메모가
 *   붙어 있는 원래 행 대신 빈 계정이 새로 만들어진다. 그 뒤에 이 스크립트를
 *   돌리면 같은 사람 앞으로 행이 두 개가 되고, 어느 쪽이 원본인지 구분할
 *   방법이 사라진다. 순서가 곧 안전장치다.
 *
 * 무엇을 하나:
 *   provider='toss' 인 행의 providerUserId 를 HMAC-SHA256 hex 로 바꾼다.
 *   메모는 User.id 를 보고 붙어 있으므로 건드리지 않는다. id 는 그대로다.
 *
 * 쓰는 법:
 *   1. 먼저 DB 를 백업한다 (Supabase 대시보드 > Database > Backups).
 *   2. TOSS_HASH_SECRET 을 정해서 .env 에 넣는다. openssl rand -hex 32
 *      이 값은 나중에 Vercel Production 에 넣을 값과 반드시 같아야 한다.
 *   3. 미리보기 (아무것도 바꾸지 않는다):
 *        npx tsx scripts/migrate-toss-hash.ts
 *   4. 실제 반영:
 *        npx tsx scripts/migrate-toss-hash.ts --commit
 *
 *   tsx 는 이 저장소의 의존성이 아니라 npx 가 그때 받아온다. 저장소의 다른
 *   스크립트는 ts-node 를 쓰지만, ts-node 는 이 프로젝트의 ESM 설정에서
 *   추가 설정 없이 돌지 않아 tsx 로 적어둔다.
 *   5. 그 다음에 코드를 배포한다.
 *
 * 두 번 돌려도 되나:
 *   된다. 이미 옮긴 행(64자리 hex)은 건너뛴다. 다만 원래 hash 가 우연히
 *   64자리 hex 인 경우까지 구분하지는 못한다 - 그래서 --commit 은 한 번만
 *   돌리는 게 맞고, 돌리기 전 백업이 진짜 안전장치다.
 */

import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';

const prisma = new PrismaClient();

// 이미 옮겨진 값의 모양. HMAC-SHA256 hex 는 언제나 64자리다.
const MIGRATED = /^[a-f0-9]{64}$/;

function derive(hash: string, secret: string): string {
  return createHmac('sha256', secret).update(hash).digest('hex');
}

async function main() {
  const commit = process.argv.includes('--commit');

  const secret = process.env.TOSS_HASH_SECRET?.trim();
  if (!secret) {
    console.error('TOSS_HASH_SECRET 이 없다. .env 에 넣고 다시 돌린다.');
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: { provider: 'toss' },
    select: { id: true, providerUserId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  if (users.length === 0) {
    console.log('toss 계정이 없다. 할 일 없음.');
    return;
  }

  const todo = users.filter((u) => !MIGRATED.test(u.providerUserId));
  const done = users.length - todo.length;

  console.log(`toss 계정 ${users.length}개 (이미 옮겨진 것으로 보이는 행 ${done}개)`);
  console.log(commit ? '--- 실제 반영 ---' : '--- 미리보기 (--commit 없으면 안 바꾼다) ---');

  // 옮긴 값이 서로 부딪히는지 먼저 본다. 서로 다른 hash 가 같은 HMAC 이 될 일은
  // 없지만, 같은 hash 를 가진 행이 이미 둘이라면 여기서 걸린다.
  const seen = new Map<string, string>();
  for (const user of todo) {
    const next = derive(user.providerUserId, secret);
    const clash = seen.get(next);
    if (clash) {
      console.error(`충돌: ${user.id} 와 ${clash} 가 같은 값이 된다. 멈춘다.`);
      process.exit(1);
    }
    seen.set(next, user.id);
  }

  let changed = 0;
  for (const user of todo) {
    const next = derive(user.providerUserId, secret);

    // 원본 hash 는 로그에 남기지 않는다. 그 자체로 로그인 수단이다.
    console.log(`  ${user.id}  →  ${next.slice(0, 12)}…`);

    if (commit) {
      await prisma.user.update({
        where: { id: user.id },
        data: { providerUserId: next },
      });
    }
    changed += 1;
  }

  console.log(
    commit
      ? `\n${changed}개 반영 완료. 이제 코드를 배포한다.`
      : `\n${changed}개가 바뀔 예정. 반영하려면 --commit 을 붙인다.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
