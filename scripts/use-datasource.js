/**
 * schema.prisma 의 datasource 블록만 바꿔주는 스크립트
 *
 * 왜 필요한가:
 * Prisma 는 provider 를 환경변수로 받지 못한다 (반드시 리터럴이어야 한다).
 * 그래서 로컬에서 SQLite 로 개발하고 Postgres 로 배포하려면 파일을 직접
 * 고쳐야 하는데, 손으로 하다 보면 datasource 만 되돌리려다 model 에 있는
 * 필드까지 같이 날린다. (`git checkout prisma/schema.prisma` 가 특히 위험하다 —
 * 그동안 추가한 필드가 전부 사라진다)
 *
 * 이 스크립트는 datasource 블록 하나만 갈아끼우므로 model 은 절대 건드리지 않는다.
 *
 * 실행 방법:
 *   npm run db:local   -> SQLite 로 바꾸고 로컬 DB에 반영
 *   npm run db:cloud   -> Postgres 로 바꾸고 클라이언트 재생성
 *
 * 배포 전에는 반드시 db:cloud 상태여야 한다. SQLite 로 배포하면 Vercel 은
 * 파일시스템이 휘발성이라 배포마다 데이터가 사라진다.
 */

const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_PATH = path.join(__dirname, '..', 'prisma', 'schema.prisma');

const BLOCKS = {
  sqlite: `datasource db {
  // 로컬 개발용 (SQLite). 이 상태로 배포하면 안 된다 — 바꾸려면:
  //   npm run db:cloud
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`,

  postgresql: `datasource db {
  provider = "postgresql"

  // 앱이 쓰는 연결. Neon 등에서는 풀러(-pooler) 주소를 넣는다.
  // 서버리스는 요청마다 연결이 늘어나므로 풀링이 없으면 연결 한도에 걸린다.
  url = env("DATABASE_URL")

  // 마이그레이션 전용 연결. 풀러를 거치지 않는 직결 주소를 넣는다.
  // PgBouncer 같은 풀러는 트랜잭션·advisory lock 을 제대로 못 넘겨서
  // migrate deploy 가 실패한다.
  directUrl = env("DIRECT_URL")
}`,
};

const target = process.argv[2];

if (!BLOCKS[target]) {
  console.error(`사용법: node scripts/use-datasource.js <${Object.keys(BLOCKS).join('|')}>`);
  process.exit(1);
}

const original = fs.readFileSync(SCHEMA_PATH, 'utf8');

// datasource 블록 한 개를 통째로 찾는다. 안에 중괄호가 없는 형태라
// 여는 줄부터 첫 닫는 중괄호까지로 충분하다.
const blockPattern = /datasource\s+db\s*\{[^}]*\}/;

if (!blockPattern.test(original)) {
  console.error('datasource 블록을 찾지 못했어. prisma/schema.prisma 를 확인해줘.');
  process.exit(1);
}

const updated = original.replace(blockPattern, BLOCKS[target]);

if (updated === original) {
  console.log(`이미 ${target} 이야. 바꿀 게 없어.`);
  process.exit(0);
}

fs.writeFileSync(SCHEMA_PATH, updated);
console.log(`datasource 를 ${target} 로 바꿨어.`);
