'use client';

import { useState } from 'react';
import type { Category } from '@/types';
import type { Memo } from '@prisma/client';
import { categoryEmoji, categoryLabel, messages, todoSubLabel } from '@/lib/utils/messages';

// 완료 처리는 성공 여부를 돌려준다. false면 사라지던 항목을 되살린다.
type ToggleDone = (id: string, isDone: boolean) => void | Promise<boolean | void>;

interface MemoCardProps {
  memo: Memo;
  onToggleDone?: ToggleDone;
  onDelete?: (id: string) => void;
  onClick?: (memo: Memo) => void;
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
 * 할 일 메모 아이템
 */
function TodoMemoItem({ memo, onToggleDone, onClick }: MemoCardProps) {
  // 완료를 누르면 줄이 그어진 채로 잠깐 남았다가 목록에서 빠진다
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

  return (
    <div
      className={`row memo-in flex items-start gap-2 px-2 -mx-2 py-2 cursor-pointer
                  ${isLeaving ? 'memo-leaving' : ''}`}
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
        className={`flex-1 text-body transition-colors duration-200
                    ${isStruck ? 'line-through text-muted' : 'text-ink'}`}
      >
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
      className="row memo-in px-2 -mx-2 py-2 cursor-pointer"
      onClick={() => onClick?.(memo)}
    >
      <div className="text-meta text-muted font-medium">
        {formatDate(memo.createdAt)}
      </div>
      <div className="text-body text-ink line-clamp-2">
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
      className="tile memo-in p-2 cursor-pointer"
      onClick={() => onClick?.(memo)}
    >
      <div className="text-meta text-ink font-medium line-clamp-2">
        {title}
      </div>
      {url && (
        <div className="text-meta text-muted truncate">
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
      className="row memo-in flex items-start gap-2 px-2 -mx-2 py-2 cursor-pointer"
      onClick={() => onClick?.(memo)}
    >
      <span className="text-muted" aria-hidden="true">·</span>
      <span className="flex-1 text-body text-ink line-clamp-1">{memo.content}</span>
    </div>
  );
}

/**
 * 카테고리별 메모 섹션
 */
interface MemoSectionProps {
  category: Category;
  memos: Memo[];
  onToggleDone?: ToggleDone;
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
    <div className="card p-6 h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-baseline justify-between gap-2 mb-4">
        <h2 className="text-title font-bold text-ink flex items-center gap-2">
          <span className="text-[20px] leading-none" aria-hidden="true">
            {categoryEmoji[category]}
          </span>
          {categoryLabel[category]}
        </h2>
        {memos.length > 0 && (
          <span className="text-meta text-muted tabular-nums">{memos.length}개</span>
        )}
      </div>

      {/* 내용 */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <p className="text-meta text-muted">{messages.emptyState[category]}</p>
        ) : category === '할일' ? (
          // 할 일: 기한 있음/없음 분류
          <div className="space-y-4">
            {todosWithDeadline.length > 0 && (
              <div>
                <div className="text-meta text-muted font-medium mb-2">
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
                <div className="text-meta text-muted font-medium mb-2">
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
          className="link-quiet mt-4 text-meta text-left"
        >
          {messages.moreItems(remainingCount)}
        </button>
      )}
    </div>
  );
}
