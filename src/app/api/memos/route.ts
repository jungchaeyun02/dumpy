/**
 * 메모 API
 *
 * POST /api/memos - 메모 저장 (자동 분류)
 * GET /api/memos - 전체 목록 (칸별로 그룹화)
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { createMemo, getMemosByUser } from '@/lib/db/memos';
import { classify } from '@/lib/classify/rules';
import { MEMO_MAX_LENGTH, CATEGORIES } from '@/lib/utils/constants';
import { messages } from '@/lib/utils/messages';
import type { Category } from '@/types';

/**
 * POST /api/memos
 * 메모 저장 + 자동 분류
 */
export async function POST(request: NextRequest) {
  // 인증 확인
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;

  const { session } = authResult;

  // 요청 횟수 제한 확인
  const rateLimit = checkRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return Response.json(
      { success: false, error: messages.rateLimited },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimit.resetIn),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { content, category } = body as {
      content?: string;
      category?: Category;
    };

    // 본문 검증
    if (!content || typeof content !== 'string') {
      return Response.json(
        { success: false, error: '메모 내용이 필요해' },
        { status: 400 }
      );
    }

    const trimmedContent = content.trim();

    // 빈 값 거부
    if (trimmedContent.length === 0) {
      return Response.json(
        { success: false, error: '빈 메모는 저장할 수 없어' },
        { status: 400 }
      );
    }

    // 글자 수 제한
    if (trimmedContent.length > MEMO_MAX_LENGTH) {
      return Response.json(
        { success: false, error: messages.contentTooLong },
        { status: 400 }
      );
    }

    // 카테고리 검증 (선택적)
    if (category && !CATEGORIES.includes(category as typeof CATEGORIES[number])) {
      return Response.json(
        { success: false, error: '올바르지 않은 분류야' },
        { status: 400 }
      );
    }

    // 분류 결정
    let finalCategory: Category;
    let classifiedBy: 'auto' | 'manual';
    let autoCategory: Category | null;
    let confidence: number;
    let hasDeadline: boolean;

    if (category) {
      // 사용자가 분류를 지정한 경우
      finalCategory = category;
      classifiedBy = 'manual';
      autoCategory = null;
      confidence = 1;
      hasDeadline = false;
    } else {
      // 자동 분류
      const classification = classify(trimmedContent);
      finalCategory = classification.category;
      classifiedBy = 'auto';
      autoCategory = classification.category;
      confidence = classification.confidence;
      hasDeadline = classification.hasDeadline;
    }

    // 메모 저장
    const memo = await createMemo(session.userId, {
      content: trimmedContent,
      category: finalCategory,
      classifiedBy,
      autoCategory,
      confidence,
      hasDeadline,
    });

    return Response.json(
      { success: true, data: memo },
      {
        status: 201,
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch (error) {
    console.error('메모 저장 실패:', error);
    return Response.json(
      { success: false, error: messages.saveFailed },
      { status: 500 }
    );
  }
}

/**
 * GET /api/memos
 * 전체 목록 (칸별로 그룹화)
 */
export async function GET(request: NextRequest) {
  // 인증 확인
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;

  const { session } = authResult;

  try {
    const memos = await getMemosByUser(session.userId);

    return Response.json({
      success: true,
      data: memos,
    });
  } catch (error) {
    console.error('메모 조회 실패:', error);
    return Response.json(
      { success: false, error: '메모를 불러오는데 실패했어' },
      { status: 500 }
    );
  }
}
