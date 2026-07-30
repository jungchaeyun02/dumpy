/**
 * 입력값 검증 유틸리티
 *
 * 보안 원칙:
 * - 화면에서 막는 건 예의, 서버에서 막는 게 보안
 * - 화면을 거치지 않고 API를 직접 부를 수 있음
 */

import {
  MEMO_MAX_LENGTH,
  CATEGORIES,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from './constants';
import type { Category } from '@/types';

/**
 * 메모 본문 검증
 */
export function validateMemoContent(content: unknown): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  // 타입 검증
  if (typeof content !== 'string') {
    return { valid: false, error: '올바르지 않은 형식이야' };
  }

  const trimmed = content.trim();

  // 빈 값 검증
  if (trimmed.length === 0) {
    return { valid: false, error: '빈 메모는 저장할 수 없어' };
  }

  // 길이 검증
  if (trimmed.length > MEMO_MAX_LENGTH) {
    return { valid: false, error: `너무 길어! ${MEMO_MAX_LENGTH.toLocaleString()}자까지만 담을 수 있어` };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * 자체 로그인 아이디 검증
 *
 * 영문 소문자·숫자·밑줄만 받고 소문자로 정규화해서 돌려준다.
 * 대소문자를 구분하면 'dumpy' 와 'Dumpy' 가 서로 다른 계정이 되어,
 * 본인이 어느 쪽으로 가입했는지 못 찾거나 남이 헷갈리게 흉내낼 수 있다.
 */
export function validateUsername(username: unknown): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  if (typeof username !== 'string') {
    return { valid: false, error: '올바르지 않은 형식이야' };
  }

  const normalized = username.trim().toLowerCase();

  if (normalized.length < USERNAME_MIN_LENGTH) {
    return { valid: false, error: `아이디는 ${USERNAME_MIN_LENGTH}자 이상이어야 해` };
  }

  if (normalized.length > USERNAME_MAX_LENGTH) {
    return { valid: false, error: `아이디는 ${USERNAME_MAX_LENGTH}자까지만 쓸 수 있어` };
  }

  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return { valid: false, error: '아이디는 영문 소문자, 숫자, 밑줄(_)만 쓸 수 있어' };
  }

  return { valid: true, sanitized: normalized };
}

/**
 * 자체 로그인 비밀번호 검증
 *
 * 앞뒤 공백을 지우지 않는다. 비밀번호의 공백도 사용자가 정한 글자다.
 */
export function validatePassword(password: unknown): {
  valid: boolean;
  error?: string;
} {
  if (typeof password !== 'string') {
    return { valid: false, error: '올바르지 않은 형식이야' };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, error: `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 해` };
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return { valid: false, error: `비밀번호는 ${PASSWORD_MAX_LENGTH}자까지만 쓸 수 있어` };
  }

  return { valid: true };
}

/**
 * 카테고리 검증
 */
export function validateCategory(category: unknown): category is Category {
  return typeof category === 'string' && CATEGORIES.includes(category as Category);
}

/**
 * URL 안전성 검증
 * - javascript: 스킴 차단 (XSS 방지)
 * - data: 스킴 차단
 */
export function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();

  // 위험한 스킴 차단
  const dangerousSchemes = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
  ];

  for (const scheme of dangerousSchemes) {
    if (trimmed.startsWith(scheme)) {
      return false;
    }
  }

  // http:// 또는 https://로 시작하는지 확인
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // 상대 경로는 허용
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return true;
  }

  return false;
}

/**
 * URL 추출 및 안전한 것만 반환
 */
export function extractSafeUrls(content: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const matches = content.match(urlRegex) || [];

  return matches.filter(isSafeUrl);
}

/**
 * 요청 본문 크기 검증
 */
export function isRequestBodySizeValid(body: string, maxBytes: number = 100000): boolean {
  // UTF-8 바이트 크기 계산
  const bytes = new TextEncoder().encode(body).length;
  return bytes <= maxBytes;
}
