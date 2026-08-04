'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CategoryChips } from '@/components/ui/CategoryChip';
import { MiniAppMemoSection } from '@/components/memo/MiniAppMemoSection';
import { dumpyEmoji, messages } from '@/lib/utils/messages';
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

        // 토스트 표시 - 생애 첫 메모이면서 덤피가 알아서 분류한 경우에만 다른 문구
        const isFirstMemo = data.totalCount === 1 && data.data.classifiedBy === 'auto';
        setToast(
          isFirstMemo
            ? messages.firstSaveSuccess(memoCategory as Category)
            : messages.saveSuccess(memoCategory as Category)
        );
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

  // 할 일 완료 토글 — 성공 여부를 돌려줘야 실패 시 항목을 되살릴 수 있다
  const handleToggleDone = async (id: string, isDone: boolean): Promise<boolean> => {
    if (!authToken) return false;

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

      return res.ok;
    } catch (error) {
      console.error('상태 변경 실패:', error);
      return false;
    }
  };

  // 로그아웃 — 미니앱은 쿠키가 아니라 localStorage의 토큰으로 인증하므로
  // 서버를 부를 필요 없이 토큰만 지우면 된다
  const handleLogout = () => {
    localStorage.removeItem('dumpy_token');
    setAuthToken(null);
    setMemos({ 할일: [], 일기: [], 모아둔것: [], 그외: [] });
    setContent('');
    setSelectedCategory(null);
  };

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-body text-muted">불러오는 중...</div>
      </div>
    );
  }

  // 비로그인 상태
  if (!authToken) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-[56px] leading-none" aria-hidden="true">{dumpyEmoji}</span>
            <div className="text-left">
              <h1 className="text-3xl font-bold tracking-tight text-ink">덤피</h1>
              <p className="text-meta text-muted">{messages.tagline}</p>
            </div>
          </div>
          <p className="text-body text-muted mb-8">{messages.onboarding}</p>
          {/*
            로그인 버튼이 없는 이유:
            이 페이지는 토스 앱 안이 아니라 일반 브라우저에서 열리는 화면이다.
            토스 로그인은 미니앱(dumpy_toss)이 getAnonymousKey() 로 받은 hash 를
            POST /api/auth/toss/verify 로 보내는 방식인데, 그 브릿지는 토스 앱
            웹뷰에만 있어서 여기서는 부를 수가 없다.

            예전에는 /api/auth/toss 로 보내는 버튼이 있었지만, 그 경로가
            리다이렉트하던 주소는 실제 토스 인증 주소가 아니라 자리표시자였다.
            눌러도 되는 일이 없어서 경로와 함께 걷어냈다.

            이 화면에 로그인을 붙이려면 수단을 먼저 정해야 한다
            (카카오 로그인으로 보내기 / 자체 로그인 / 이 페이지를 내리기).
          */}
        </div>

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

  const isOverLimit = content.length > MEMO_MAX_LENGTH;

  // 로그인 상태 - 메인 화면
  return (
    <div className="min-h-screen flex flex-col">
      {/* 입력 영역 (상단 고정) */}
      <div className="sticky top-0 z-10 bg-canvas px-4 py-4 border-b border-line">
        {/* 로고 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[32px] leading-none" aria-hidden="true">{dumpyEmoji}</span>
          <div>
            <h1 className="text-title font-bold tracking-tight text-ink">덤피</h1>
            <p className="text-meta text-muted">{messages.tagline}</p>
          </div>
        </div>

        {/* 분류 칩 */}
        <div className="mb-4">
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
            className="field p-4 pb-16"
            rows={2}
            disabled={isSubmitting}
          />

          {/* 덤프 버튼 */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!content.trim() || isSubmitting || isOverLimit}
            className="absolute bottom-4 right-4 btn-primary text-meta py-2 px-4
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {messages.saveButton}
          </button>
        </div>

        {/* 글자 수 초과 경고 */}
        {isOverLimit && (
          <p className="text-meta text-ink font-medium mt-2">{messages.contentTooLong}</p>
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
          <a href="/mini/done" className="link-quiet text-meta">
            {messages.viewCompleted}
          </a>
        </div>
      </div>

      {/* 푸터 */}
      <footer className="px-4 py-4 text-center text-meta text-muted border-t border-line">
        <div className="flex justify-center gap-4">
          <a href="/privacy" className="link-quiet">개인정보 처리방침</a>
          <a href="/terms" className="link-quiet">이용약관</a>
          <button type="button" onClick={handleLogout} className="link-quiet">
            {messages.logout}
          </button>
          <button className="link-quiet">탈퇴</button>
        </div>
      </footer>

      {/* 토스트 */}
      {toast && (
        <div className="toast fixed bottom-24 left-1/2 -translate-x-1/2
                        px-6 py-4 text-meta animate-pop-out z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
