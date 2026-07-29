/**
 * 개별 메모 API
 *
 * PATCH /api/memos/:id - 칸 바꾸기 / 본문 수정 / 완료 처리
 * DELETE /api/memos/:id - 삭제 (soft delete)
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { updateMemo, deleteMemo, getMemoByIdAndUser } from '@/lib/db/memos';
import { MEMO_MAX_LENGTH, CATEGORIES } from '@/lib/utils/constants';
import { messages } from '@/lib/utils/messages';
import type { Category } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/memos/:id
 * 메모 수정 (칸 변경, 본문 수정, 완료 처리)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // 인증 확인
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;

  const { session } = authResult;
  const { id } = await params;

  // 요청 횟수 제한 확인
  const rateLimit = checkRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return Response.json(
      { success: false, error: messages.rateLimited },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { content, category, isDone } = body as {
      content?: string;
      category?: Category;
      isDone?: boolean;
    };

    // 최소 하나의 변경 사항 필요
    if (content === undefined && category === undefined && isDone === undefined) {
      return Response.json(
        { success: false, error: '변경할 내용이 없어' },
        { status: 400 }
      );
    }

    // 본문 검증
    if (content !== undefined) {
      if (typeof content !== 'string') {
        return Response.json(
          { success: false, error: '올바르지 않은 형식이야' },
          { status: 400 }
        );
      }

      const trimmedContent = content.trim();
      if (trimmedContent.length === 0) {
        return Response.json(
          { success: false, error: '빈 메모로는 바꿀 수 없어' },
          { status: 400 }
        );
      }

      if (trimmedContent.length > MEMO_MAX_LENGTH) {
        return Response.json(
          { success: false, error: messages.contentTooLong },
          { status: 400 }
        );
      }
    }

    // 카테고리 검증
    if (category !== undefined && !CATEGORIES.includes(category as typeof CATEGORIES[number])) {
      return Response.json(
        { success: false, error: '올바르지 않은 분류야' },
        { status: 400 }
      );
    }

    // 메모 업데이트 (소유권 검증 포함)
    const updatedMemo = await updateMemo(id, session.userId, {
      content: content?.trim(),
      category,
      isDone,
    });

    // 소유하지 않은 메모 또는 존재하지 않는 메모
    if (!updatedMemo) {
      return Response.json(
        { success: false, error: '메모를 찾을 수 없어' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: updatedMemo,
    });
  } catch (error) {
    console.error('메모 수정 실패:', error);
    return Response.json(
      { success: false, error: '메모 수정에 실패했어' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/memos/:id
 * 메모 삭제 (soft delete - 30일 후 완전 삭제)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // 인증 확인
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;

  const { session } = authResult;
  const { id } = await params;

  try {
    // 메모 삭제 (소유권 검증 포함)
    const deletedMemo = await deleteMemo(id, session.userId);

    // 소유하지 않은 메모 또는 존재하지 않는 메모
    if (!deletedMemo) {
      return Response.json(
        { success: false, error: '메모를 찾을 수 없어' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error('메모 삭제 실패:', error);
    return Response.json(
      { success: false, error: '메모 삭제에 실패했어' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/memos/:id
 * 개별 메모 조회 (선택적)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  // 인증 확인
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;

  const { session } = authResult;
  const { id } = await params;

  try {
    const memo = await getMemoByIdAndUser(id, session.userId);

    if (!memo) {
      return Response.json(
        { success: false, error: '메모를 찾을 수 없어' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: memo,
    });
  } catch (error) {
    console.error('메모 조회 실패:', error);
    return Response.json(
      { success: false, error: '메모를 불러오는데 실패했어' },
      { status: 500 }
    );
  }
}
