// 메모 제한
export const MEMO_MAX_LENGTH = 5000;

// 요청 제한 (분당)
export const RATE_LIMIT_PER_MINUTE = 60;

// 로그인·가입 요청 제한 (IP당 분당)
//
// 메모 저장(60회)보다 낮게 잡는다. 비밀번호를 바꿔가며 찔러보는
// 대입 공격을 막는 게 목적이다. 분당 20회면 하루 3만 번인데, 8자 이상
// 비밀번호를 맞히기엔 턱없이 부족하므로 이 정도로 충분하다.
//
// 더 낮추지 않는 이유: 아이디 오타나 짧은 비밀번호처럼 형식에서 걸린
// 요청도 횟수를 깎기 때문에, 한도가 너무 촘촘하면 몇 번 헛손질한
// 정상 사용자가 1분간 막힌다.
export const AUTH_RATE_LIMIT_PER_MINUTE = 20;

// 자체 로그인 아이디·비밀번호 제한
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const PASSWORD_MIN_LENGTH = 8;
// 위쪽 한도가 없으면 아주 긴 비밀번호로 해싱 부하를 걸 수 있다
export const PASSWORD_MAX_LENGTH = 72;

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
