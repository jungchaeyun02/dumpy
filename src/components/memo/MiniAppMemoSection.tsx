'use client';

import { useState } from 'react';
import type { Category } from '@/types';
import type { Memo } from '@prisma/client';
import { categoryEmoji, categoryLabel, messages } from '@/lib/utils/messages';

// 완료 처리는 성공 여부를 돌려준다. false면 사라지던 항목을 되살린다.
type ToggleDone = (id: string, isDone: boolean) => void | Promise<boolean | void>;

interface MiniAppMemoSectionProps {
  category: Category;
  memos: Memo[];
  onToggleDone?: ToggleDone;
  onMemoClick?: (memo: Memo) => void;
  onViewMore?: () => void;
  previewCount?: number;
}

// 날짜 포맷
function formatDate(date: Date): string {
  const d = new Date(date);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
}

// 완료 표시 후 목록에서 빠지기까지의 시간
const LEAVE_DELAY_MS = 300;

// 클릭 시점에 확인한다 (렌더 중에 읽으면 SSR 결과와 어긋난다)
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * 미니앱용 메모 섹션
 * - 각 칸에 최근 2개만 미리보기
 * - 세로 스택 레이아웃에 최적화
 */
export function MiniAppMemoSection({
  category,
  memos,
  onToggleDone,
  onMemoClick,
  onViewMore,
  previewCount = 2,
}: MiniAppMemoSectionProps) {
  const displayMemos = memos.slice(0, previewCount);
  const totalCount = memos.length;

  return (
    <div className="card p-4">
      {/* 헤더 */}
      <div
        className="flex items-baseline justify-between gap-2 mb-4 cursor-pointer"
        onClick={onViewMore}
      >
        <h3 className="text-title font-bold text-ink flex items-center gap-2">
          <span className="text-[20px] leading-none" aria-hidden="true">
            {categoryEmoji[category]}
          </span>
          {categoryLabel[category]}
        </h3>
        <div className="flex items-baseline gap-2 text-meta text-muted">
          <span className="tabular-nums">{totalCount}개</span>
          <span aria-hidden="true">›</span>
        </div>
      </div>

      {/* 내용 */}
      {displayMemos.length === 0 ? (
        <p className="text-meta text-muted py-2">{messages.emptyState[category]}</p>
      ) : (
        <div className="space-y-2">
          {displayMemos.map((memo) => (
            <MiniAppMemoItem
              key={memo.id}
              category={category}
              memo={memo}
              onToggleDone={onToggleDone}
              onClick={onMemoClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface MiniAppMemoItemProps {
  category: Category;
  memo: Memo;
  onToggleDone?: ToggleDone;
  onClick?: (memo: Memo) => void;
}

function MiniAppMemoItem({ category, memo, onToggleDone, onClick }: MiniAppMemoItemProps) {
  // 훅은 switch 앞에서 항상 호출한다
  const [isLeaving, setIsLeaving] = useState(false);
  const isStruck = memo.isDone || isLeaving;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLeaving) return;

    // 되돌리는 방향은 기다릴 이유가 없다
    if (memo.isDone) {
      onToggleDone?.(memo.id, false);
      return;
    }

    setIsLeaving(true);
    const delay = prefersReducedMotion() ? 0 : LEAVE_DELAY_MS;
    window.setTimeout(async () => {
      const ok = await onToggleDone?.(memo.id, true);
      // 저장이 실패하면 사라진 채로 자리만 차지하게 두지 않는다
      if (ok === false) setIsLeaving(false);
    }, delay);
  };

  switch (category) {
    case '할일':
      return (
        <div
          className={`memo-in flex items-start gap-2 py-2 ${isLeaving ? 'memo-leaving' : ''}`}
          onClick={() => onClick?.(memo)}
        >
          <button
            type="button"
            onClick={handleToggle}
            className={`checkbox translate-y-[2px] ${isStruck ? 'checkbox-checked' : ''}`}
          >
            {isStruck && (
              <svg className="w-full h-full" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <span
            className={`flex-1 text-body line-clamp-1 transition-colors duration-200
                        ${isStruck ? 'line-through text-muted' : 'text-ink'}`}
          >
            {memo.content}
          </span>
        </div>
      );

    case '일기':
      return (
        <div className="memo-in py-2" onClick={() => onClick?.(memo)}>
          <div className="flex items-baseline gap-2">
            <span className="text-meta text-muted font-medium shrink-0">
              {formatDate(memo.createdAt)}
            </span>
            <span className="text-body text-ink line-clamp-1 flex-1">
              {memo.content}
            </span>
          </div>
        </div>
      );

    case '모아둔것':
      return (
        <div
          className="tile memo-in p-2 text-meta text-ink line-clamp-1"
          onClick={() => onClick?.(memo)}
        >
          {memo.content}
        </div>
      );

    default: // 그외
      return (
        <div className="memo-in flex items-start gap-2 py-2" onClick={() => onClick?.(memo)}>
          <span className="text-muted" aria-hidden="true">·</span>
          <span className="text-body text-ink line-clamp-1 flex-1">{memo.content}</span>
        </div>
      );
  }
}
