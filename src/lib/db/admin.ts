/**
 * 관리자 화면용 집계 조회
 *
 * 이 파일은 userId 로 범위를 좁히지 않는 유일한 예외다. 그래서 규칙을 하나 더 둔다:
 * 어떤 함수도 메모 본문(content)을 돌려주지 않는다. select 에 content 가 없고,
 * 나가는 건 전부 개수·비율뿐이다. 일기가 들어가는 앱이라 관리자도 남의 글을
 * 읽을 수 없어야 한다.
 * (memos.ts 의 함수들은 전부 userId 를 필수로 받으므로 여기 쓸 수 없다)
 */

import { prisma } from './prisma';
import type {
  AdminStats,
  AdminUserRow,
  AutoCategoryRow,
  CategoryKey,
  CategoryShareRow,
  MisclassRow,
} from '@/types';

// 사용자 목록 한 번에 가져올 최대 인원
export const USERS_DEFAULT_LIMIT = 50;
export const USERS_MAX_LIMIT = 200;

const CATEGORY_KEYS: readonly CategoryKey[] = ['todo', 'diary', 'collected', 'etc'];

function isCategoryKey(value: string | null): value is CategoryKey {
  return value !== null && (CATEGORY_KEYS as readonly string[]).includes(value);
}

// 분모가 0이면 null. 0으로 나눠서 NaN 이나 Infinity 가 화면까지 가면
// "0%" 로 보이는데, 자료가 없는 것과 0% 인 것은 다른 얘기다.
function ratio(part: number, whole: number): number | null {
  return whole === 0 ? null : part / whole;
}

/**
 * 한국 시간으로 오늘 자정에 해당하는 시각
 *
 * 서버 시간대는 배포 환경에 따라 UTC 다. Date 의 지역 시간 메서드를 쓰면
 * "오늘"이 서버 시간대의 오늘이 되어버려서, 한국에서 새벽 1시에 저장한 메모가
 * 어제로 잡힌다. 그래서 한국 시각으로 옮겨 날짜를 자른 뒤 다시 되돌린다.
 */
function seoulTodayStart(now: Date): Date {
  const offsetMs = 9 * 60 * 60 * 1000;
  const seoul = new Date(now.getTime() + offsetMs);
  const midnight = Date.UTC(
    seoul.getUTCFullYear(),
    seoul.getUTCMonth(),
    seoul.getUTCDate()
  );

  return new Date(midnight - offsetMs);
}

/**
 * 관리자 화면이 쓰는 집계 전부
 *
 * 두 번에 나눠 받는다:
 *   1. 단순 개수들 - 한 트랜잭션. 칸별 합이 전체와 안 맞는 화면이 나오면 안 된다
 *   2. (autoCategory, category) 조합별 개수 - groupBy 한 방
 *
 * 2번을 따로 두는 이유는 이 한 번의 조회에서 '자동 분류 정확도'와 '오분류 방향'이
 * 둘 다 나오기 때문이다. 두 항목이 같은 조회에서 나오므로 서로 어긋날 수 없고,
 * 칸마다 count 를 12번 더 쏠 필요도 없다.
 */
export async function getAdminStats(): Promise<AdminStats> {
  const now = new Date();
  const todayStart = seoulTodayStart(now);

  const [
    users,
    memosTotal,
    memosLive,
    memosToday,

    manualAtWrite,
    correctedAfter,
    stillMarkedAuto,

    liveTodo,
    liveDiary,
    liveCollected,
    liveEtc,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.memo.count(),
    prisma.memo.count({ where: { deletedAt: null } }),
    prisma.memo.count({ where: { createdAt: { gte: todayStart } } }),

    // 쓸 때 칩을 눌러 칸을 직접 고른 것. 그때는 덤피가 판단하지 않으므로
    // autoCategory 가 비어 있다 - 이게 곧 '직접 고름'의 표시다
    prisma.memo.count({ where: { autoCategory: null } }),
    // 덤피가 칸을 정한 뒤 사람이 고친 것
    prisma.memo.count({ where: { autoCategory: { not: null }, classifiedBy: 'manual' } }),
    // classifiedBy 가 아직 auto 로 남아 있는 것.
    // 사람이 칸을 바꾸면 manual 로 넘어가므로 이 모집단 안에서는
    // category 와 autoCategory 가 어긋날 수 없다 (항상 100%).
    // 정확도를 이 수로 재면 늘 100% 가 나오는 이유이고, 그래서 화면에는
    // 아래 byCategory 쪽 수치를 쓰고 이 값은 비교용으로만 보여준다
    prisma.memo.count({ where: { autoCategory: { not: null }, classifiedBy: 'auto' } }),

    // 칸별 분포는 살아 있는 메모만. 지운 걸 섞으면 지금 뭐가 쌓여 있는지 안 보인다
    prisma.memo.count({ where: { deletedAt: null, category: 'todo' } }),
    prisma.memo.count({ where: { deletedAt: null, category: 'diary' } }),
    prisma.memo.count({ where: { deletedAt: null, category: 'collected' } }),
    prisma.memo.count({ where: { deletedAt: null, category: 'etc' } }),
  ]);

  // 덤피가 칸을 정한 메모를 (보낸 칸, 지금 있는 칸) 조합으로 센다.
  // 지운 메모도 포함한다 - 지웠다는 게 분류가 틀렸다는 뜻은 아니고,
  // 덤피가 내린 판단은 그대로 남아 있으므로 성적에서 뺄 이유가 없다.
  const pairs = await prisma.memo.groupBy({
    by: ['autoCategory', 'category'],
    where: { autoCategory: { not: null } },
    _count: { _all: true },
    orderBy: [{ autoCategory: 'asc' }, { category: 'asc' }],
  });

  // 조합을 두 갈래로 푼다: 대각선(유지)과 그 밖(오분류)
  const assigned = new Map<CategoryKey, number>();
  const kept = new Map<CategoryKey, number>();
  const misclassifications: MisclassRow[] = [];

  for (const row of pairs) {
    const from = row.autoCategory;
    const to = row.category;
    const count = row._count._all;

    // where 로 걸렀어도 autoCategory 는 스키마상 nullable 이고 category 는
    // String 이다. 아는 칸이 아니면 버리는 대신 합이 안 맞는 걸로 드러난다
    if (!isCategoryKey(from) || !isCategoryKey(to)) continue;

    assigned.set(from, (assigned.get(from) ?? 0) + count);

    if (from === to) {
      kept.set(from, (kept.get(from) ?? 0) + count);
    } else {
      misclassifications.push({ from, to, count });
    }
  }

  const byCategory: AutoCategoryRow[] = CATEGORY_KEYS.map((category) => {
    const a = assigned.get(category) ?? 0;
    const k = kept.get(category) ?? 0;

    return { category, assigned: a, kept: k, rate: ratio(k, a) };
  });

  const judged = byCategory.reduce((sum, r) => sum + r.assigned, 0);
  const keptTotal = byCategory.reduce((sum, r) => sum + r.kept, 0);

  const liveByCategory: Record<CategoryKey, number> = {
    todo: liveTodo,
    diary: liveDiary,
    collected: liveCollected,
    etc: liveEtc,
  };

  const usageByCategory: CategoryShareRow[] = CATEGORY_KEYS.map((category) => ({
    category,
    count: liveByCategory[category],
    rate: ratio(liveByCategory[category], memosLive),
  }));

  return {
    generatedAt: now.toISOString(),

    basics: { users, memosTotal, memosLive, memosToday },

    autoClassify: {
      judged,
      kept: keptTotal,
      accuracy: ratio(keptTotal, judged),
      stillMarkedAuto,
      byCategory,
    },

    // 많은 순. 같은 건수면 보낸 칸 순서로 묶여 보이게 둔다
    misclassifications: misclassifications.sort(
      (a, b) =>
        b.count - a.count ||
        CATEGORY_KEYS.indexOf(a.from) - CATEGORY_KEYS.indexOf(b.from) ||
        CATEGORY_KEYS.indexOf(a.to) - CATEGORY_KEYS.indexOf(b.to)
    ),

    usage: {
      total: memosTotal,
      manualAtWrite,
      autoAtWrite: memosTotal - manualAtWrite,
      correctedAfter,
      manualRate: ratio(manualAtWrite, memosTotal),
      liveTotal: memosLive,
      byCategory: usageByCategory,
    },
  };
}

// 카카오·토스가 준 외부 식별자는 관리자가 사람을 구분할 만큼만 남긴다.
// 전부 그대로 뿌리면 화면 캡처나 로그에 남는데, 그래서 얻는 게 없다.
//
// 뒷자리를 남기는 이유: 카카오가 주는 번호는 앞자리가 서로 같다. 앞 네 자리만
// 남기면 모든 사용자가 '5014…' 로 똑같이 보여서 마스킹이 아니라 지우기가 된다.
// local 은 사용자가 정한 아이디이고 그게 곧 그 사람을 부르는 이름이라 그대로 둔다.
function maskProviderUserId(provider: string, providerUserId: string): string {
  if (provider === 'local') return providerUserId;
  if (providerUserId.length <= 4) return '…';
  return `…${providerUserId.slice(-4)}`;
}

/**
 * 사용자 목록 (가입 최신순)
 *
 * 메모는 개수만 센다. 본문은 여기서도 안 꺼낸다.
 */
export async function getAdminUsers(
  limit: number = USERS_DEFAULT_LIMIT
): Promise<{ users: AdminUserRow[]; total: number }> {
  const take = Math.min(Math.max(1, Math.trunc(limit)), USERS_MAX_LIMIT);

  const [rows, total] = await prisma.$transaction([
    prisma.user.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        providerUserId: true,
        createdAt: true,
        _count: { select: { memos: { where: { deletedAt: null } } } },
      },
    }),
    prisma.user.count(),
  ]);

  return {
    total,
    users: rows.map((u) => ({
      id: u.id,
      provider: u.provider,
      providerUserId: maskProviderUserId(u.provider, u.providerUserId),
      createdAt: u.createdAt.toISOString(),
      memoCount: u._count.memos,
    })),
  };
}
