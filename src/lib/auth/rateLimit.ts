/**
 * 요청 횟수 제한 (Rate Limiting)
 *
 * - 메모 저장/수정 API: 이용자당 분당 60회
 * - 로그인/가입 API: IP당 분당 10회 (대입 공격 방지)
 *
 * 메모리 기반 구현 (프로덕션에서는 Redis 권장)
 */

import { RATE_LIMIT_PER_MINUTE, AUTH_RATE_LIMIT_PER_MINUTE } from '../utils/constants';

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

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

/**
 * 키 하나에 대해 요청 횟수를 확인하고 증가
 *
 * 메모용과 로그인용이 같은 저장소를 쓰므로 키에 용도를 접두어로 붙인다.
 * 그러지 않으면 아이디가 사용자 ID와 겹칠 때 서로의 횟수를 깎는다.
 */
function check(key: string, limit: number): RateLimitResult {
  cleanup();

  const now = Date.now();
  const windowMs = 60 * 1000; // 1분

  let entry = store.get(key);

  // 새 윈도우 시작 또는 첫 요청
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(key, entry);

    return {
      allowed: true,
      remaining: limit - 1,
      resetIn: Math.ceil(windowMs / 1000),
    };
  }

  // 기존 윈도우 내 요청
  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  store.set(key, entry);

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetIn: Math.ceil((entry.resetAt - now) / 1000),
  };
}

/**
 * 메모 API 요청 횟수 확인 및 증가
 *
 * @param userId 사용자 ID
 */
export function checkRateLimit(userId: string): RateLimitResult {
  return check(`memo:${userId}`, RATE_LIMIT_PER_MINUTE);
}

/**
 * 로그인·가입 요청 횟수 확인 및 증가
 *
 * 로그인 전이라 사용자 ID가 없으므로 IP로 센다.
 *
 * @param ip 요청 IP (알 수 없으면 'unknown')
 */
export function checkAuthRateLimit(ip: string): RateLimitResult {
  return check(`auth:${ip}`, AUTH_RATE_LIMIT_PER_MINUTE);
}
