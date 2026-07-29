'use client';

import { useState, useEffect, useCallback } from 'react';
import { messages } from '@/lib/utils/messages';
import type { Memo } from '@prisma/client';

/**
 * 완료함 페이지
 * 완료된 할 일 목록 표시
 */
export default function DonePage() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDoneMemos = useCallback(async () => {
    try {
      const res = await fetch('/api/memos/done');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMemos(data.data || []);
        }
      }
    } catch (error) {
      console.error('완료 메모 불러오기 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoneMemos();
  }, [fetchDoneMemos]);

  // 되돌리기
  const handleUndo = async (id: string) => {
    try {
      const res = await fetch(`/api/memos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDone: false }),
      });

      if (res.ok) {
        setMemos((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (error) {
      console.error('되돌리기 실패:', error);
    }
  };

  // 날짜 포맷
  const formatDate = (date: Date) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-body text-muted">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* 헤더 */}
      <header className="border-b border-line">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <a href="/" className="link-quiet text-title leading-none">←</a>
          <h1 className="text-title font-bold text-ink">끝낸 것</h1>
        </div>
      </header>

      {/* 내용 */}
      <main className="px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {memos.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-body text-muted">아직 끝낸 게 없어</p>
              <p className="text-meta text-muted mt-2">할 일을 완료하면 여기 나타나</p>
            </div>
          ) : (
            <div className="space-y-2">
              {memos.map((memo) => (
                <div
                  key={memo.id}
                  className="card p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <p className="text-body text-muted line-through">{memo.content}</p>
                    <p className="text-meta text-muted mt-2">
                      {memo.doneAt && formatDate(memo.doneAt)} 완료
                    </p>
                  </div>
                  <button
                    onClick={() => handleUndo(memo.id)}
                    className="link-quiet text-meta flex-shrink-0"
                  >
                    {messages.undoComplete}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
