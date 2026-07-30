'use client';

import { Fragment, useState, useEffect, useCallback } from 'react';
import { MemoInput } from '@/components/memo/MemoInput';
import { MemoSection } from '@/components/memo/MemoCard';
import { LoginPreview } from '@/components/ui/LoginPreview';
import { LocalAuthForm } from '@/components/ui/LocalAuthForm';
import { dumpyEmoji, messages } from '@/lib/utils/messages';
import type { Category } from '@/types';
import type { Memo } from '@prisma/client';

interface GroupedMemos {
  할일: Memo[];
  일기: Memo[];
  모아둔것: Memo[];
  그외: Memo[];
}

// 빌드 시점에 값이 박히므로 프로덕션 번들에서는 아래 분기가 통째로 사라진다.
// (/api/auth/dev 라우트도 프로덕션에서 403을 돌려준다)
const IS_DEV = process.env.NODE_ENV !== 'production';

// 소개 - 세 단계
const STEPS = [
  { number: 1, word: '던지기', description: '칸 안 골라도 돼' },
  { number: 2, word: '나뉘기', description: '저장한 뒤에 덤피가 나눠' },
  { number: 3, word: '찾기', description: '칸마다 생긴 게 달라' },
] as const;

// 단계 사이 화살표. 가로 배치일 땐 오른쪽, 세로로 쌓이면 아래를 향한다.
// 글자 하나를 회전시켜 쓰므로 화살표 문자를 둘로 나눠 관리할 필요가 없다.
function StepArrow() {
  return (
    <span
      aria-hidden="true"
      className="self-center sm:self-start sm:mt-2 shrink-0 text-[20px] leading-none
                 text-muted rotate-90 sm:rotate-0"
    >
      →
    </span>
  );
}

// 카카오 심볼 (말풍선). 버튼 글자색을 그대로 따른다.
function KakaoIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3C6.477 3 2 6.463 2 10.735c0 2.764 1.874 5.19 4.69 6.56-.207.72-.75 2.612-.86 3.018-.134.504.185.497.39.362.16-.106 2.55-1.73 3.585-2.434.71.104 1.44.159 2.195.159 5.523 0 10-3.463 10-7.735S17.523 3 12 3z" />
    </svg>
  );
}

export default function Home() {
  const [memos, setMemos] = useState<GroupedMemos>({
    할일: [],
    일기: [],
    모아둔것: [],
    그외: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 메모 목록 불러오기
  const fetchMemos = useCallback(async () => {
    try {
      const res = await fetch('/api/memos');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Prisma Category enum을 한글로 매핑
          const categoryMap: Record<string, keyof GroupedMemos> = {
            todo: '할일',
            diary: '일기',
            collected: '모아둔것',
            etc: '그외',
          };

          const grouped: GroupedMemos = {
            할일: [],
            일기: [],
            모아둔것: [],
            그외: [],
          };

          // data.data가 이미 그룹화되어 있을 수 있음
          if (data.data) {
            for (const [key, value] of Object.entries(data.data)) {
              const mappedKey = categoryMap[key] || key;
              if (mappedKey in grouped) {
                grouped[mappedKey as keyof GroupedMemos] = value as Memo[];
              }
            }
          }

          setMemos(grouped);
          setIsLoggedIn(true);
        }
      } else if (res.status === 401) {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('메모 불러오기 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemos();
  }, [fetchMemos]);

  // 메모 저장
  const handleSave = async (content: string, category: Category | null) => {
    try {
      const res = await fetch('/api/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, category }),
      });

      const data = await res.json();

      if (data.success && data.data) {
        // 새 메모를 목록에 추가
        const categoryMap: Record<string, keyof GroupedMemos> = {
          todo: '할일',
          diary: '일기',
          collected: '모아둔것',
          etc: '그외',
        };
        const memoCategory = categoryMap[data.data.category] || '그외';

        setMemos((prev) => ({
          ...prev,
          [memoCategory]: [data.data, ...prev[memoCategory]],
        }));

        return {
          success: true,
          category: memoCategory as Category,
          // 생애 첫 메모이면서 덤피가 알아서 분류한 경우에만.
          // 개수는 서버가 세서 내려준 값을 그대로 쓴다.
          isFirstMemo: data.totalCount === 1 && data.data.classifiedBy === 'auto',
        };
      }

      return { success: false };
    } catch (error) {
      console.error('메모 저장 실패:', error);
      return { success: false };
    }
  };

  // 할 일 완료 토글 — 성공 여부를 돌려줘야 실패 시 항목을 되살릴 수 있다
  const handleToggleDone = async (id: string, isDone: boolean): Promise<boolean> => {
    try {
      const res = await fetch(`/api/memos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDone }),
      });

      if (res.ok) {
        // 완료되면 목록에서 제거 (완료함으로 이동)
        if (isDone) {
          setMemos((prev) => ({
            ...prev,
            할일: prev.할일.filter((m) => m.id !== id),
          }));
        }
      }

      return res.ok;
    } catch (error) {
      console.error('상태 변경 실패:', error);
      return false;
    }
  };

  // 로그아웃 — 쿠키를 지우고 새로고침해서 클라이언트 상태까지 비운다
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) return;
      window.location.reload();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  // 메모 클릭 (상세/수정)
  const handleMemoClick = (memo: Memo) => {
    // TODO: 모달 열기
    console.log('메모 클릭:', memo);
  };

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-body text-muted">불러오는 중...</div>
      </div>
    );
  }

  // 비로그인 상태
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col bg-canvas">
        {/* 히어로 — 로고 · 카피 · 로그인을 한 덩어리로 묶어 첫 화면 세로 중앙에 */}
        <main className="min-h-dvh flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-[400px] flex flex-col items-center gap-8">
            {/* 로고 */}
            <div className="flex items-center gap-2">
              <span className="text-[56px] leading-none" aria-hidden="true">{dumpyEmoji}</span>
              <h1 className="text-3xl font-bold tracking-tight text-ink">덤피</h1>
            </div>

            {/* 대표 문구 — 둘째 줄만 주황 */}
            <p className="text-[24px] font-bold leading-[1.4] text-center text-ink">
              {messages.loginHeadline.first}
              <br />
              <span className="text-dumpy-orange">{messages.loginHeadline.second}</span>
            </p>

            {/* 4칸 미리보기 — 정지 화면 */}
            <LoginPreview />

            {/* 로그인 */}
            <div className="w-full">
              <a href="/api/auth/kakao" className="btn-kakao w-full">
                <KakaoIcon />
                카카오로 시작하기
              </a>

              {/* 카카오 없이 들어오는 길 — 아이디·비밀번호.
                  기본은 접혀 있고 눌러야 펴진다 */}
              <LocalAuthForm />

              {/* 개발용 로그인 — 프로덕션 빌드에서는 통째로 제거된다 */}
              {IS_DEV && (
                <p className="mt-4 text-center">
                  <a href="/api/auth/dev" className="link-quiet text-meta">
                    개발용 로그인
                  </a>
                </p>
              )}
            </div>
          </div>
        </main>

        {/* 소개 — 히어로 아래 두 덩어리. 로그인 버튼은 위에 있는 하나로 충분하다 */}
        <div className="px-6 pb-16">
          <div className="mx-auto max-w-[480px] flex flex-col gap-16">
            {/* 왜 안 나누게 되는지 */}
            <section className="text-center">
              <h2 className="text-title font-bold text-ink">나누기 싫어서가 아니야</h2>
              <p className="mt-4 text-body text-muted leading-[1.7]">
                나누려면 쓰는 순간에 결정을 해야 하잖아.
                <br />
                급하면 그 한 번도 귀찮아서 결국 아무 데나 쓰게 돼.
              </p>
            </section>

            {/* 세 단계 — 좁아지면 세로로 쌓이고 화살표도 아래를 향한다 */}
            <section className="flex flex-col sm:flex-row sm:items-start justify-center gap-4">
              {STEPS.map((step, i) => (
                <Fragment key={step.number}>
                  {i > 0 && <StepArrow />}
                  <div className="flex flex-col items-center gap-2 text-center sm:flex-1">
                    <span
                      className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full
                                 bg-dumpy-orange text-white text-[24px] font-bold leading-none"
                    >
                      {step.number}
                    </span>
                    <span className="text-body font-bold text-ink">{step.word}</span>
                    <span className="text-meta text-muted">{step.description}</span>
                  </div>
                </Fragment>
              ))}
            </section>
          </div>
        </div>

        {/* 푸터 */}
        <footer className="px-6 py-8 text-center text-meta text-muted">
          <p>{messages.privacyNotice}</p>
          <div className="mt-4 flex justify-center gap-4">
            <a href="/privacy" className="link-quiet">개인정보 처리방침</a>
            <a href="/terms" className="link-quiet">이용약관</a>
          </div>
        </footer>
      </div>
    );
  }

  // 로그인 상태 - 메인 화면
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* 헤더 */}
      <header className="border-b border-line">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-2">
          <span className="text-[40px] leading-none" aria-hidden="true">{dumpyEmoji}</span>
          <div>
            <h1 className="text-title font-bold tracking-tight text-ink">덤피</h1>
            <p className="text-meta text-muted">{messages.tagline}</p>
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* 입력 영역 */}
          <div className="mb-8">
            <MemoInput onSave={handleSave} />
          </div>

          {/* 4칸 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MemoSection
              category="할일"
              memos={memos.할일}
              onToggleDone={handleToggleDone}
              onMemoClick={handleMemoClick}
            />
            <MemoSection
              category="일기"
              memos={memos.일기}
              onMemoClick={handleMemoClick}
            />
            <MemoSection
              category="모아둔것"
              memos={memos.모아둔것}
              onMemoClick={handleMemoClick}
            />
            <MemoSection
              category="그외"
              memos={memos.그외}
              onMemoClick={handleMemoClick}
            />
          </div>

          {/* 완료함 링크 */}
          <div className="mt-8 text-center">
            <a href="/done" className="link-quiet text-meta">
              {messages.viewCompleted}
            </a>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="border-t border-line px-6 py-8 text-center text-meta text-muted">
        <p>{messages.privacyNotice}</p>
        <div className="mt-4 flex justify-center gap-4">
          <a href="/privacy" className="link-quiet">개인정보 처리방침</a>
          <a href="/terms" className="link-quiet">이용약관</a>
          <button type="button" onClick={handleLogout} className="link-quiet">
            {messages.logout}
          </button>
          <button className="link-quiet">탈퇴</button>
        </div>
      </footer>
    </div>
  );
}
