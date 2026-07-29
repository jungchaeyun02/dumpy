'use client';

import { useState, useEffect, useCallback } from 'react';
import { MemoInput } from '@/components/memo/MemoInput';
import { MemoSection } from '@/components/memo/MemoCard';
import { messages } from '@/lib/utils/messages';
import type { Category } from '@/types';
import type { Memo } from '@prisma/client';

interface GroupedMemos {
  할일: Memo[];
  일기: Memo[];
  모아둔것: Memo[];
  그외: Memo[];
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
        };
      }

      return { success: false };
    } catch (error) {
      console.error('메모 저장 실패:', error);
      return { success: false };
    }
  };

  // 할 일 완료 토글
  const handleToggleDone = async (id: string, isDone: boolean) => {
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
    } catch (error) {
      console.error('상태 변경 실패:', error);
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
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-ink/60">불러오는 중...</div>
      </div>
    );
  }

  // 비로그인 상태
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col bg-cream">
        {/* 헤더 */}
        <header className="p-6 text-center">
          <h1 className="text-4xl font-bold text-dumpy-orange">DUMPY</h1>
          <p className="text-xl mt-1">덤피</p>
          <p className="text-ink/60 mt-4">{messages.onboarding}</p>
        </header>

        {/* 로그인 버튼 */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-ink/60 mb-6">시작하려면 로그인해줘</p>
            <div className="space-y-3">
              <a
                href="/api/auth/kakao"
                className="btn-primary inline-block w-full"
              >
                카카오로 시작하기
              </a>
              {/* 개발용 로그인 */}
              <a
                href="/api/auth/dev"
                className="block w-full py-3 px-6 rounded-full border-2 border-ink/20
                         text-ink/60 hover:border-dumpy-orange hover:text-dumpy-orange transition"
              >
                개발용 로그인
              </a>
            </div>
          </div>
        </main>

        {/* 푸터 */}
        <footer className="p-4 text-center text-sm text-ink/40">
          <p>{messages.privacyNotice}</p>
          <div className="mt-2 flex justify-center gap-4">
            <a href="/privacy" className="hover:underline">개인정보 처리방침</a>
            <a href="/terms" className="hover:underline">이용약관</a>
          </div>
        </footer>
      </div>
    );
  }

  // 로그인 상태 - 메인 화면
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/* 헤더 */}
      <header className="p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-dumpy-orange">DUMPY</h1>
            <p className="text-lg">덤피</p>
          </div>
          <p className="text-ink/60 hidden sm:block">생각날 땐 그냥 덤프해!</p>
        </div>
      </header>

      {/* 메인 */}
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* 입력 영역 */}
          <div className="mb-8">
            <MemoInput onSave={handleSave} />
          </div>

          {/* 4칸 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="mt-6 text-center">
            <a href="/done" className="text-dumpy-orange hover:underline">
              {messages.viewCompleted}
            </a>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="p-4 text-center text-sm text-ink/40 border-t border-ink/10">
        <p>{messages.privacyNotice}</p>
        <div className="mt-2 flex justify-center gap-4">
          <a href="/privacy" className="hover:underline">개인정보 처리방침</a>
          <a href="/terms" className="hover:underline">이용약관</a>
          <button className="hover:underline text-red-400">탈퇴</button>
        </div>
      </footer>
    </div>
  );
}
