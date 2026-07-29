'use client';

import type { Category } from '@/types';
import type { Memo } from '@prisma/client';
import { categoryLabel, messages, todoSubLabel } from '@/lib/utils/messages';

interface MemoCardProps {
  memo: Memo;
  onToggleDone?: (id: string, isDone: boolean) => void;
  onDelete?: (id: string) => void;
  onClick?: (memo: Memo) => void;
}

// 날짜 포맷
function formatDate(date: Date): string {
  const d = new Date(date);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
}

/**
 * 할 일 메모 아이템
 */
function TodoMemoItem({ memo, onToggleDone, onClick }: MemoCardProps) {
  return (
    <div
      className="flex items-start gap-3 py-2 cursor-pointer hover:bg-cream/50 rounded-lg px-2 -mx-2"
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
      <span className={`flex-1 ${memo.isDone ? 'line-through text-ink/40' : ''}`}>
        {memo.content}
      </span>
    </div>
  );
}

/**
 * 일기 메모 아이템
 */
function DiaryMemoItem({ memo, onClick }: MemoCardProps) {
  return (
    <div
      className="py-2 cursor-pointer hover:bg-cream/50 rounded-lg px-2 -mx-2"
      onClick={() => onClick?.(memo)}
    >
      <div className="text-sm text-dumpy-orange font-medium mb-1">
        {formatDate(memo.createdAt)}
      </div>
      <div className="text-ink line-clamp-2">
        {memo.content}
      </div>
    </div>
  );
}

/**
 * 모아둔 것 메모 아이템 (카드 형태)
 */
function CollectedMemoItem({ memo, onClick }: MemoCardProps) {
  // URL 추출
  const urlMatch = memo.content.match(/https?:\/\/[^\s]+/);
  const url = urlMatch ? urlMatch[0] : null;
  const title = memo.content.replace(/https?:\/\/[^\s]+/g, '').trim() || url;

  return (
    <div
      className="bg-cream rounded-xl p-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(memo)}
    >
      <div className="text-sm line-clamp-2 font-medium">
        {title}
      </div>
      {url && (
        <div className="text-xs text-ink/40 mt-1 truncate">
          {new URL(url).hostname}
        </div>
      )}
    </div>
  );
}

/**
 * 그 외 메모 아이템
 */
function EtcMemoItem({ memo, onClick }: MemoCardProps) {
  return (
    <div
      className="flex items-start gap-2 py-2 cursor-pointer hover:bg-cream/50 rounded-lg px-2 -mx-2"
      onClick={() => onClick?.(memo)}
    >
      <span className="text-ink/40">·</span>
      <span className="flex-1 line-clamp-1">{memo.content}</span>
    </div>
  );
}

/**
 * 카테고리별 메모 섹션
 */
interface MemoSectionProps {
  category: Category;
  memos: Memo[];
  onToggleDone?: (id: string, isDone: boolean) => void;
  onDelete?: (id: string) => void;
  onMemoClick?: (memo: Memo) => void;
  maxDisplay?: number;
}

export function MemoSection({
  category,
  memos,
  onToggleDone,
  onDelete,
  onMemoClick,
  maxDisplay = 8,
}: MemoSectionProps) {
  const displayMemos = memos.slice(0, maxDisplay);
  const remainingCount = memos.length - maxDisplay;

  // 할 일은 기한 있음/없음으로 분류
  const todosWithDeadline = category === '할일' ? displayMemos.filter((m) => m.hasDeadline) : [];
  const todosWithoutDeadline = category === '할일' ? displayMemos.filter((m) => !m.hasDeadline) : [];

  const isEmpty = memos.length === 0;

  return (
    <div className="card p-5 h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{categoryLabel[category]}</h2>
        {memos.length > 0 && (
          <span className="text-sm text-ink/60">{memos.length}개</span>
        )}
      </div>

      {/* 내용 */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <p className="text-ink/40 text-sm">{messages.emptyState[category]}</p>
        ) : category === '할일' ? (
          // 할 일: 기한 있음/없음 분류
          <div className="space-y-4">
            {todosWithDeadline.length > 0 && (
              <div>
                <div className="text-xs text-dumpy-orange font-medium mb-2">
                  {todoSubLabel.withDeadline}
                </div>
                {todosWithDeadline.map((memo) => (
                  <TodoMemoItem
                    key={memo.id}
                    memo={memo}
                    onToggleDone={onToggleDone}
                    onClick={onMemoClick}
                  />
                ))}
              </div>
            )}
            {todosWithoutDeadline.length > 0 && (
              <div>
                <div className="text-xs text-ink/40 font-medium mb-2">
                  {todoSubLabel.someday}
                </div>
                {todosWithoutDeadline.map((memo) => (
                  <TodoMemoItem
                    key={memo.id}
                    memo={memo}
                    onToggleDone={onToggleDone}
                    onClick={onMemoClick}
                  />
                ))}
              </div>
            )}
          </div>
        ) : category === '일기' ? (
          // 일기
          <div className="space-y-2">
            {displayMemos.map((memo) => (
              <DiaryMemoItem key={memo.id} memo={memo} onClick={onMemoClick} />
            ))}
          </div>
        ) : category === '모아둔것' ? (
          // 모아둔 것: 그리드
          <div className="grid grid-cols-2 gap-2">
            {displayMemos.map((memo) => (
              <CollectedMemoItem key={memo.id} memo={memo} onClick={onMemoClick} />
            ))}
          </div>
        ) : (
          // 그 외
          <div>
            {displayMemos.map((memo) => (
              <EtcMemoItem key={memo.id} memo={memo} onClick={onMemoClick} />
            ))}
          </div>
        )}
      </div>

      {/* 더 있을 때 */}
      {remainingCount > 0 && (
        <button
          type="button"
          className="mt-4 text-sm text-dumpy-orange hover:underline text-left"
        >
          {messages.moreItems(remainingCount)}
        </button>
      )}
    </div>
  );
}
