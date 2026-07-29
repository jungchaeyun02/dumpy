'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CategoryChips } from '@/components/ui/CategoryChip';
import { messages } from '@/lib/utils/messages';
import { MEMO_MAX_LENGTH } from '@/lib/utils/constants';
import type { Category } from '@/types';

interface MemoInputProps {
  onSave: (content: string, category: Category | null) => Promise<{ success: boolean; category?: Category }>;
}

export function MemoInput({ onSave }: MemoInputProps) {
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; category: Category } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 진입 시 커서 포커스
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // N 키로 입력창 포커스
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 이미 입력 중이면 무시
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Ctrl/Cmd + Enter로 저장
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [content, selectedCategory]
  );

  const handleSubmit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const result = await onSave(trimmedContent, selectedCategory);

      if (result.success && result.category) {
        // 저장 성공 - 입력창 비우기 (서버 응답 기다리지 않는 원칙이지만, 실패 시 복구를 위해 await)
        setContent('');
        setSelectedCategory(null);

        // 토스트 표시
        setToast({
          message: messages.saveSuccess(result.category),
          category: result.category,
        });

        // 5초 후 토스트 숨기기
        setTimeout(() => setToast(null), 5000);

        // 다시 포커스
        textareaRef.current?.focus();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeCategory = (newCategory: Category) => {
    // TODO: 칸 변경 API 호출
    setToast(null);
  };

  const isOverLimit = content.length > MEMO_MAX_LENGTH;

  return (
    <div className="w-full">
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
          onKeyDown={handleKeyDown}
          placeholder={messages.inputPlaceholder}
          className="w-full p-4 rounded-2xl bg-paper border-2 border-transparent
                     focus:border-dumpy-orange focus:outline-none resize-none
                     text-ink placeholder:text-ink/40 min-h-[100px]"
          rows={3}
          disabled={isSubmitting}
        />

        {/* 글자 수 표시 */}
        <div className={`absolute bottom-3 left-4 text-sm ${isOverLimit ? 'text-red-500' : 'text-ink/40'}`}>
          {content.length > 0 && `${content.length.toLocaleString()} / ${MEMO_MAX_LENGTH.toLocaleString()}`}
        </div>

        {/* 저장 버튼 */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting || isOverLimit}
          className="absolute bottom-3 right-3 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {messages.saveButton}
        </button>
      </div>

      {/* 단축키 안내 */}
      <p className="text-sm text-ink/40 mt-2 text-right">
        Ctrl+Enter로 덤프
      </p>

      {/* 저장 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-paper
                        px-6 py-3 rounded-full shadow-lg flex items-center gap-4 animate-pop-out z-50">
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => handleChangeCategory(toast.category)}
            className="text-dumpy-yellow hover:underline font-medium"
          >
            {messages.changeCategory}
          </button>
        </div>
      )}
    </div>
  );
}
