// 메모 제한
export const MEMO_MAX_LENGTH = 5000;

// 요청 제한 (분당)
export const RATE_LIMIT_PER_MINUTE = 60;

// 세션/토큰 설정
export const TOKEN_EXPIRY_DAYS = 30;
export const SESSION_EXPIRY_DAYS = 30;

// 삭제된 메모 보관 기간 (일)
export const SOFT_DELETE_RETENTION_DAYS = 30;

// 완료된 할 일 되돌리기 가능 시간 (시간)
export const UNDO_COMPLETE_HOURS = 24;

// 저장 후 칸 변경 안내 표시 시간 (초)
export const SAVE_TOAST_DURATION_SECONDS = 5;

// 카테고리 목록
export const CATEGORIES = ['할일', '일기', '모아둔것', '그외'] as const;

// 브랜드 색상
export const BRAND_COLORS = {
  orange: '#FF6B1A',
  yellow: '#FFC53D',
  cream: '#FFF6E5',
  paper: '#FFFFFF',
  ink: '#241C14',
  pop: '#6C4CF1',
} as const;
