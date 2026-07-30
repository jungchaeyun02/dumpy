/**
 * 관리자 통계 화면
 *
 * 서버 컴포넌트다. 관문(requireAdminPage)이 렌더 전에 통과해야 하므로
 * 권한 없는 사람에게는 집계 쿼리가 아예 돌지 않고, 잠깐 화면이 비쳤다
 * 사라지는 일도 없다. 관리자가 아니면 404 - 화면에서 숨기는 게 아니라
 * 서버가 없는 주소로 응답한다.
 *
 * 쿠키를 읽으므로 이 라우트는 항상 요청 시점에 렌더된다. 집계를 캐시하면
 * 관리자가 방금 바뀐 수를 못 보므로 그게 맞다.
 *
 * 메모 본문은 이 파일에 들어올 수가 없다. 집계 함수가 개수와 비율만
 * 돌려주므로(lib/db/admin.ts) 서버에서 클라이언트로 넘어가는 값에도 없다.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminPage } from '@/lib/auth/admin';
import { getAdminStats, getAdminUsers } from '@/lib/db/admin';
import type { AdminStats, AdminUserRow, CategoryKey } from '@/types';

export const metadata: Metadata = {
  title: '덤피 관리자',
  // 관리자 화면이 검색에 걸릴 이유가 없다
  robots: { index: false, follow: false },
};

const CATEGORY_LABEL: Record<CategoryKey, string> = {
  todo: '할일',
  diary: '일기',
  collected: '모아둔것',
  etc: '그외',
};

const PROVIDER_LABEL: Record<string, string> = {
  local: '아이디',
  web: '카카오',
  toss: '토스',
};

const number = (n: number) => n.toLocaleString('ko-KR');

// 비율은 집계 쪽에서 이미 null 로 구분해서 내려온다.
// 분모가 0이면 0% 가 아니라 낼 수 없는 값이므로 — 로 쓴다.
const pct = (rate: number | null) =>
  rate === null ? '—' : `${(rate * 100).toFixed(1)}%`;

// 서버 시간대는 배포 환경에 따라 UTC 다. 보이는 시각은 한국 시간으로 고정한다
const SEOUL = 'Asia/Seoul';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', {
    timeZone: SEOUL,
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ko-KR', {
    timeZone: SEOUL,
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });

/* ---------- 껍데기 ---------- */

// .card 를 안 쓰고 테두리만 두른다. .card 는 hover 에 떠오르는 효과가 붙어
// 있는데, 읽기만 하는 표에는 장식이다.
function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-paper p-6">
      <h2 className="text-title font-bold text-ink">{title}</h2>
      {hint && <p className="mt-1 text-meta text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

// 표는 전부 같은 꼴로. 숫자 칸은 오른쪽 정렬 + tabular-nums 로 자리를 맞춘다
function Table({
  head,
  children,
}: {
  head: { label: string; numeric?: boolean }[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-meta">
        <thead>
          <tr className="border-b border-line text-muted">
            {head.map((h) => (
              <th
                key={h.label}
                className={`pb-2 font-medium whitespace-nowrap ${
                  h.numeric ? 'text-right pl-4' : 'text-left pr-4'
                }`}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return (
    <td className="py-2 pl-4 text-right text-ink tabular-nums whitespace-nowrap">
      {children}
    </td>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <td className="py-2 pr-4 text-ink whitespace-nowrap">{children}</td>;
}

/* ---------- 1) 기본 현황 ---------- */

function Basics({ basics }: { basics: AdminStats['basics'] }) {
  const items = [
    { label: '이용자', value: number(basics.users) },
    { label: '메모', value: number(basics.memosTotal) },
    { label: '오늘 저장', value: number(basics.memosToday) },
  ];

  return (
    <section className="rounded-card border border-line bg-paper p-6">
      <dl className="grid grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-meta text-muted">{item.label}</dt>
            <dd className="mt-1 text-[32px] font-bold leading-none text-ink">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-meta text-muted">
        메모 {number(basics.memosTotal)}개 중 지우지 않은 것{' '}
        {number(basics.memosLive)}개. 오늘은 한국 시간 기준이야
      </p>
    </section>
  );
}

/* ---------- 2) 자동 분류 정확도 ---------- */

function AutoClassify({
  auto,
  correctedAfter,
}: {
  auto: AdminStats['autoClassify'];
  correctedAfter: number;
}) {
  if (auto.judged === 0) {
    return (
      <Panel title="자동 분류 정확도">
        <p className="text-body text-muted">
          덤피가 칸을 정한 메모가 아직 없어서 정확도를 낼 수 없어
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="자동 분류 정확도"
      hint={`덤피가 칸을 정한 메모 ${number(auto.judged)}개 중 아직 그 칸에 있는 것이 ${number(auto.kept)}개`}
    >
      <p className="text-[32px] font-bold leading-none text-ink">
        {pct(auto.accuracy)}
      </p>

      <div className="mt-5">
        <Table
          head={[
            { label: '덤피가 보낸 칸' },
            { label: '배정', numeric: true },
            { label: '유지', numeric: true },
            { label: '유지율', numeric: true },
          ]}
        >
          {auto.byCategory.map((row) => (
            <tr key={row.category} className="border-b border-line last:border-0">
              <Label>{CATEGORY_LABEL[row.category]}</Label>
              <Num>{number(row.assigned)}</Num>
              <Num>{number(row.kept)}</Num>
              <Num>{pct(row.rate)}</Num>
            </tr>
          ))}
        </Table>
      </div>

      {/* 왜 classifiedBy 로 세지 않았는지. 이 값을 안 보여주면 나중에
          "auto 인 것만 세야 하는 게 아닌가" 하고 같은 자리로 돌아온다 */}
      <p className="mt-4 text-meta text-muted leading-[1.7]">
        모집단은 <code>autoCategory</code> 가 채워진 메모야.{' '}
        <code>classifiedBy = &apos;auto&apos;</code> 로 세면{' '}
        {number(auto.stillMarkedAuto)}개가 잡히고 유지율은 항상 100% 로 나와 —
        사람이 칸을 바꾸면 <code>classifiedBy</code> 가{' '}
        <code>manual</code> 로 넘어가서 모집단에서 빠져나가기 때문이야.
      </p>

      {/* 고친 기록이 0건이면 이 숫자는 '분류가 정확하다'가 아니라
          '틀렸다고 말한 사람이 없다'는 뜻이다. 둘을 구별해 주지 않으면
          100% 를 성적으로 읽게 된다 */}
      {correctedAfter === 0 && (
        <p className="mt-2 text-meta text-muted leading-[1.7]">
          단, 칸을 옮긴 기록이 아직 0건이야. 그래서 이 유지율은 &quot;덤피가
          맞혔다&quot;가 아니라 &quot;틀렸다고 한 사람이 없다&quot;로 읽어야 해.
        </p>
      )}
    </Panel>
  );
}

/* ---------- 3) 오분류 방향 ---------- */

function Misclassifications({
  rows,
  judged,
}: {
  rows: AdminStats['misclassifications'];
  judged: number;
}) {
  // 비어 있는 게 기본값인 상태다. 지금 앱에는 저장한 뒤 칸을 바꾸는 길이
  // 없어서(MemoInput.tsx 의 칸 변경이 TODO 로 비어 있고, PATCH 를 부르는
  // 코드가 전부 isDone 만 보낸다) category 가 autoCategory 와 어긋날 수가
  // 없다. 그게 연결되면 이 표는 손댈 것 없이 채워진다.
  if (rows.length === 0) {
    return (
      <Panel title="오분류 방향">
        <p className="text-body text-muted leading-[1.7]">
          덤피가 보낸 칸을 사람이 옮긴 기록이 아직 없어.
          <br />
          저장한 뒤 칸을 바꾸는 화면이 연결되면 여기가 채워져.
        </p>
      </Panel>
    );
  }

  const corrected = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <Panel
      title="오분류 방향"
      hint={`사람이 칸을 옮긴 ${number(corrected)}건을 많은 순으로`}
    >
      <Table
        head={[
          { label: '덤피가 보낸 칸' },
          { label: '사람이 옮긴 칸' },
          { label: '건수', numeric: true },
          { label: '배정 대비', numeric: true },
        ]}
      >
        {rows.map((row) => (
          <tr
            key={`${row.from}-${row.to}`}
            className="border-b border-line last:border-0"
          >
            <Label>{CATEGORY_LABEL[row.from]}</Label>
            <Label>{CATEGORY_LABEL[row.to]}</Label>
            <Num>{number(row.count)}</Num>
            <Num>{pct(judged === 0 ? null : row.count / judged)}</Num>
          </tr>
        ))}
      </Table>
    </Panel>
  );
}

/* ---------- 4) 이용 패턴 ---------- */

function Usage({ usage }: { usage: AdminStats['usage'] }) {
  const { total, liveTotal, manualAtWrite, autoAtWrite, correctedAfter } = usage;

  return (
    <Panel title="이용 패턴" hint={`칸이 어떻게 정해졌나 - 메모 ${number(total)}개 기준`}>
      <Table
        head={[
          { label: '칸을 정한 방식' },
          { label: '건수', numeric: true },
          { label: '비율', numeric: true },
        ]}
      >
        <tr className="border-b border-line">
          <Label>쓸 때 칩을 직접 누름</Label>
          <Num>{number(manualAtWrite)}</Num>
          <Num>{pct(usage.manualRate)}</Num>
        </tr>
        <tr className="border-b border-line">
          <Label>덤피에게 맡김</Label>
          <Num>{number(autoAtWrite)}</Num>
          <Num>{pct(total === 0 ? null : autoAtWrite / total)}</Num>
        </tr>
        <tr>
          {/* 맡긴 것의 일부라서 위 두 줄과 더하면 안 된다 - 들여쓰기로 표시 */}
          <Label>
            <span className="text-muted">└ 맡긴 뒤 사람이 고침</span>
          </Label>
          <Num>{number(correctedAfter)}</Num>
          <Num>{pct(autoAtWrite === 0 ? null : correctedAfter / autoAtWrite)}</Num>
        </tr>
      </Table>

      <h3 className="mt-6 text-body font-bold text-ink">칸별 분포</h3>
      <p className="mt-1 text-meta text-muted">
        지우지 않은 메모 {number(liveTotal)}개
      </p>

      <div className="mt-3">
        <Table
          head={[
            { label: '칸' },
            { label: '메모', numeric: true },
            { label: '비율', numeric: true },
          ]}
        >
          {usage.byCategory.map((row) => (
            <tr key={row.category} className="border-b border-line last:border-0">
              <Label>{CATEGORY_LABEL[row.category]}</Label>
              <Num>{number(row.count)}</Num>
              <Num>{pct(row.rate)}</Num>
            </tr>
          ))}
        </Table>
      </div>
    </Panel>
  );
}

/* ---------- 사용자 목록 ---------- */

function UserTable({ users, total }: { users: AdminUserRow[]; total: number }) {
  if (users.length === 0) {
    return <p className="text-body text-muted">아직 가입한 사람이 없어</p>;
  }

  return (
    <>
      <Table
        head={[
          { label: '가입' },
          { label: '방법' },
          { label: '아이디' },
          { label: '메모', numeric: true },
          { label: 'User.id' },
        ]}
      >
        {users.map((u) => (
          <tr key={u.id} className="border-b border-line last:border-0">
            <td className="py-2 pr-4 text-muted tabular-nums whitespace-nowrap">
              {formatDate(u.createdAt)}
            </td>
            <Label>{PROVIDER_LABEL[u.provider] ?? u.provider}</Label>
            <Label>{u.providerUserId}</Label>
            <Num>{number(u.memoCount)}</Num>
            <td className="py-2 pr-4 text-muted font-mono text-[12px]">{u.id}</td>
          </tr>
        ))}
      </Table>

      {total > users.length && (
        <p className="mt-3 text-meta text-muted">
          {number(total)}명 중 최근 {number(users.length)}명. 더 보려면{' '}
          <code>/api/admin/users?limit=200</code>
        </p>
      )}
    </>
  );
}

/* ---------- 화면 ---------- */

export default async function AdminPage() {
  // 관문. 통과 못 하면 여기서 404 로 끝나고 아래 쿼리는 돌지 않는다
  await requireAdminPage();

  const [stats, userList] = await Promise.all([getAdminStats(), getAdminUsers()]);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="link-quiet text-title leading-none">
            ←
          </Link>
          <div>
            <h1 className="text-title font-bold text-ink">관리자</h1>
            <p className="text-meta text-muted">
              {formatDateTime(stats.generatedAt)} 기준
            </p>
          </div>
        </div>
      </header>

      <main className="px-6 py-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <Basics basics={stats.basics} />
          <AutoClassify
            auto={stats.autoClassify}
            correctedAfter={stats.usage.correctedAfter}
          />
          <Misclassifications
            rows={stats.misclassifications}
            judged={stats.autoClassify.judged}
          />
          <Usage usage={stats.usage} />

          <Panel title="가입한 사람" hint="메모는 개수만 - 본문은 관리자도 못 본다">
            <UserTable users={userList.users} total={userList.total} />
          </Panel>
        </div>
      </main>
    </div>
  );
}
