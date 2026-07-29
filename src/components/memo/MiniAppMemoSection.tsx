'use client';

import type { Category } from '@/types';
import type { Memo } from '@prisma/client';
import { categoryLabel, messages, todoSubLabel } from '@/lib/utils/messages';

interface MiniAppMemoSectionProps {
  category: Category;
  memos: Memo[];
  onToggleDone?: (id: string, isDone: boolean) => void;
  onMemoClick?: (memo: Memo) => void;
  onViewMore?: () => void;
  previewCount?: number;
}

// 날짜 포맷
function formatDate(date: Date): string {
  const d = new Date(date);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
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
        className="flex items-center justify-between mb-3 cursor-pointer"
        onClick={onViewMore}
      >
        <h3 className="text-base font-bold">{categoryLabel[category]}</h3>
        <div className="flex items-center gap-2 text-sm text-ink/60">
          <span>{totalCount}개</span>
          <span className="text-dumpy-orange">›</span>
        </div>
      </div>

      {/* 내용 */}
      {displayMemos.length === 0 ? (
        <p className="text-ink/40 text-sm py-2">{messages.emptyState[category]}</p>
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
  onToggleDone?: (id: string, isDone: boolean) => void;
  onClick?: (memo: Memo) => void;
}

function MiniAppMemoItem({ category, memo, onToggleDone, onClick }: MiniAppMemoItemProps) {
  switch (category) {
    case '할일':
      return (
        <div
          className="flex items-start gap-3 py-1"
          onClick={() => onClick?.(memo)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleDone?.(memo.id, !memo.isDone);
            }}
            className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5
                        ${memo.isDone ? 'bg-dumpy-orange border-dumpy-orange' : 'border-ink/30'}`}
          >
            {memo.isDone && (
              <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <span className={`flex-1 text-sm line-clamp-1 ${memo.isDone ? 'line-through text-ink/40' : ''}`}>
            {memo.content}
          </span>
        </div>
      );

    case '일기':
      return (
        <div className="py-1" onClick={() => onClick?.(memo)}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-dumpy-orange font-medium">
              {formatDate(memo.createdAt)}
            </span>
            <span className="text-sm text-ink line-clamp-1 flex-1">
              {memo.content}
            </span>
          </div>
        </div>
      );

    case '모아둔것':
      return (
        <div
          className="bg-cream rounded-lg p-2 text-sm line-clamp-1"
          onClick={() => onClick?.(memo)}
        >
          {memo.content}
        </div>
      );

    default: // 그외
      return (
        <div className="flex items-start gap-2 py-1" onClick={() => onClick?.(memo)}>
          <span className="text-ink/40">·</span>
          <span className="text-sm line-clamp-1 flex-1">{memo.content}</span>
        </div>
      );
  }
}
