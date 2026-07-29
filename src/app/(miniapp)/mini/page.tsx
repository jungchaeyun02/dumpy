'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CategoryChips } from '@/components/ui/CategoryChip';
import { MiniAppMemoSection } from '@/components/memo/MiniAppMemoSection';
import { messages } from '@/lib/utils/messages';
import { MEMO_MAX_LENGTH } from '@/lib/utils/constants';
import type { Category } from '@/types';
import type { Memo } from '@prisma/client';

interface GroupedMemos {
  할일: Memo[];
  일기: Memo[];
  모아둔것: Memo[];
  그외: Memo[];
}

/**
 * 토스 미니앱 메인 페이지
 *
 * 특징:
 * - 세로 스택 레이아웃 (탭 없음)
 * - 입력창 상단 고정
 * - 4칸 세로 배치, 각 칸 최근 2개 미리보기
 * - 토큰 기반 인증
 */
export default function MiniAppHome() {
  const [memos, setMemos] = useState<GroupedMemos>({
    할일: [],
    일기: [],
    모아둔것: [],
    그외: [],
  });
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 토스 인증 확인
  useEffect(() => {
    const token = localStorage.getItem('dumpy_token');
    if (token) {
      setAuthToken(token);
    } else {
      // 토스 로그인 필요
      // 실제 구현에서는 토스 SDK를 통해 인증
      setIsLoading(false);
    }
  }, []);

  // 메모 불러오기
  const fetchMemos = useCallback(async () => {
    if (!authToken) return;

    try {
      const res = await fetch('/api/memos', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
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

          if (data.data) {
            for (const [key, value] of Object.entries(data.data)) {
              const mappedKey = categoryMap[key] || key;
              if (mappedKey in grouped) {
                grouped[mappedKey as keyof GroupedMemos] = value as Memo[];
              }
            }
          }

          setMemos(grouped);
        }
      } else if (res.status === 401) {
        // 토큰 만료
        localStorage.removeItem('dumpy_token');
        setAuthToken(null);
      }
    } catch (error) {
      console.error('메모 불러오기 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (authToken) {
      fetchMemos();
    }
  }, [authToken, fetchMemos]);

  // 메모 저장
  const handleSave = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSubmitting || !authToken) return;

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/memos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          content: trimmedContent,
          category: selectedCategory,
        }),
      });

      const data = await res.json();

      if (data.success && data.data) {
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

        setContent('');
        setSelectedCategory(null);

        // 토스트 표시
        setToast(messages.saveSuccess(memoCategory as Category));
        setTimeout(() => setToast(null), 5000);

        textareaRef.current?.focus();
      } else {
        setToast(data.error || messages.saveFailed);
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('저장 실패:', error);
      setToast(messages.saveFailed);
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 할 일 완료 토글
  const handleToggleDone = async (id: string, isDone: boolean) => {
    if (!authToken) return;

    try {
      const res = await fetch(`/api/memos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ isDone }),
      });

      if (res.ok) {
        if (isDone) {
          setMemos((prev) => ({
            ...prev,
            할일: prev.할일.filter((m) => m.id !== id),
          }));
          setToast(messages.completeTask);
          setTimeout(() => setToast(null), 3000);
        }
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
    }
  };

  // 토스 로그인
  const handleTossLogin = () => {
    // 실제 구현: 토스 SDK의 로그인 API 호출
    window.location.href = '/api/auth/toss';
  };

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-ink/60">불러오는 중...</div>
      </div>
    );
  }

  // 비로그인 상태
  if (!authToken) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-3xl font-bold text-dumpy-orange mb-2">덤피</h1>
          <p className="text-ink/60 mb-8">{messages.onboarding}</p>
          <button onClick={handleTossLogin} className="btn-primary">
            시작하기
          </button>
        </div>

        <footer className="p-4 text-center text-xs text-ink/40">
          <p>{messages.privacyNotice}</p>
          <div className="mt-2 flex justify-center gap-4">
            <a href="/privacy" className="hover:underline">개인정보 처리방침</a>
            <a href="/terms" className="hover:underline">이용약관</a>
          </div>
        </footer>
      </div>
    );
  }

  const isOverLimit = content.length > MEMO_MAX_LENGTH;

  // 로그인 상태 - 메인 화면
  return (
    <div className="min-h-screen flex flex-col">
      {/* 입력 영역 (상단 고정) */}
      <div className="sticky top-0 z-10 bg-cream p-4 border-b border-ink/10">
        {/* 분류 칩 */}
        <div className="mb-3">
          <CategoryChips
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>

        {/* 입력창 */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={messages.inputPlaceholder}
            className="w-full p-3 pr-20 rounded-xl bg-paper border-2 border-transparent
                       focus:border-dumpy-orange focus:outline-none resize-none
                       text-ink placeholder:text-ink/40 text-sm"
            rows={2}
            disabled={isSubmitting}
          />

          {/* 덤프 버튼 */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!content.trim() || isSubmitting || isOverLimit}
            className="absolute bottom-2 right-2 btn-primary text-sm py-2 px-4
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {messages.saveButton}
          </button>
        </div>

        {/* 글자 수 초과 경고 */}
        {isOverLimit && (
          <p className="text-xs text-red-500 mt-1">{messages.contentTooLong}</p>
        )}
      </div>

      {/* 4칸 세로 스택 */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <MiniAppMemoSection
          category="할일"
          memos={memos.할일}
          onToggleDone={handleToggleDone}
        />
        <MiniAppMemoSection
          category="일기"
          memos={memos.일기}
        />
        <MiniAppMemoSection
          category="모아둔것"
          memos={memos.모아둔것}
        />
        <MiniAppMemoSection
          category="그외"
          memos={memos.그외}
        />

        {/* 완료함 링크 */}
        <div className="text-center py-2">
          <a href="/mini/done" className="text-sm text-dumpy-orange">
            {messages.viewCompleted}
          </a>
        </div>
      </div>

      {/* 푸터 */}
      <footer className="p-3 text-center text-xs text-ink/40 border-t border-ink/10">
        <div className="flex justify-center gap-4">
          <a href="/privacy" className="hover:underline">개인정보 처리방침</a>
          <a href="/terms" className="hover:underline">이용약관</a>
          <button className="hover:underline text-red-400">탈퇴</button>
        </div>
      </footer>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-ink text-paper
                        px-4 py-2 rounded-full shadow-lg text-sm animate-pop-out z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
