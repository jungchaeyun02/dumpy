/**
 * 요청 횟수 제한 (Rate Limiting)
 *
 * 메모 저장/수정 API에 이용자당 분당 60회 제한
 * 메모리 기반 구현 (프로덕션에서는 Redis 권장)
 */

import { RATE_LIMIT_PER_MINUTE } from '../utils/constants';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// 메모리 저장소 (서버 재시작 시 초기화됨)
const store = new Map<string, RateLimitEntry>();

// 오래된 엔트리 정리 (메모리 누수 방지)
const CLEANUP_INTERVAL = 60 * 1000; // 1분
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

/**
 * 요청 횟수 확인 및 증가
 *
 * @param userId 사용자 ID
 * @returns { allowed: boolean, remaining: number, resetIn: number }
 */
export function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  cleanup();

  const now = Date.now();
  const windowMs = 60 * 1000; // 1분

  let entry = store.get(userId);

  // 새 윈도우 시작 또는 첫 요청
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(userId, entry);

    return {
      allowed: true,
      remaining: RATE_LIMIT_PER_MINUTE - 1,
      resetIn: Math.ceil(windowMs / 1000),
    };
  }

  // 기존 윈도우 내 요청
  if (entry.count >= RATE_LIMIT_PER_MINUTE) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  store.set(userId, entry);

  return {
    allowed: true,
    remaining: RATE_LIMIT_PER_MINUTE - entry.count,
    resetIn: Math.ceil((entry.resetAt - now) / 1000),
  };
}
