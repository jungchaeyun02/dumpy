import type { Category } from '@/types';

/**
 * '로' / '으로' 조사 선택
 *
 * 받침이 없거나 ㄹ 받침이면 '로', 그 외에는 '으로'.
 * 칸 이름 네 개가 둘 다 필요하다:
 *   '할 일'로, '일기'로, '그 외'로  /  '모아둔 것'으로
 */
function ro(word: string): string {
  const code = word.charCodeAt(word.length - 1);

  // 한글 음절이 아니면 (숫자·영문 등) 기본값
  if (code < 0xac00 || code > 0xd7a3) return '로';

  const jongseong = (code - 0xac00) % 28;
  const NONE = 0;
  const RIEUL = 8;

  return jongseong === NONE || jongseong === RIEUL ? '로' : '으로';
}

/**
 * 덤피 화면 문구
 * - 두 서비스(미니앱/웹)가 같은 문구를 사용
 * - 미니앱 검수 기준(비속어/은어/과도한 유행어 금지)에 맞춤
 * - 말하는 사람은 덤피(햄스터)
 */
export const messages = {
  // 입력
  inputPlaceholder: '여기다 쏙 던져! 덤피가 볼에 넣어둘게',
  saveButton: '덤프!',

  // 저장 직후
  saveSuccess: (category: Category) => `🐹 '${categoryLabel[category]}'에 쏙 넣었어!`,

  // 생애 첫 메모일 때만. 자동 분류된 경우에만 쓴다 -
  // 사용자가 칩을 직접 골랐다면 '안 골랐는데'가 거짓말이 된다.
  firstSaveSuccess: (category: Category) => {
    const label = categoryLabel[category];
    return `🐹 아무것도 안 골랐는데 '${label}'${ro(label)} 갔지?`;
  },

  changeCategory: '아니야, 딴 칸',

  // 서비스 한 줄 설명 — 로고 옆에 붙어서 '이게 메모장이구나'를 알린다
  tagline: '던져두면 알아서 나눠주는 메모장',

  // 로그인 화면 대표 문구 — 두 줄로 나눠 쓴다 (둘째 줄만 주황)
  loginHeadline: {
    first: '쓸 땐 아무것도 안 골라도,',
    second: '나중엔 나뉘어 있어',
  },

  // 온보딩
  onboarding: '분류는 신경 쓰지 말고 그냥 던져. 덤피가 알아서 나눠줄게',

  // 빈 상태
  emptyState: {
    '할일': '할 일이 하나도 없네! 개운하다',
    '일기': '오늘 어땠어? 한 줄만 써봐',
    '모아둔것': '나중에 볼 거 여기다 모아둬',
    '그외': '어디에도 안 들어가는 건 덤피가 맡아둘게',
  } as Record<Category, string>,

  // 할 일 완료
  completeTask: '하나 끝냈다!',
  viewCompleted: '끝낸 것 보기',
  undoComplete: '앗, 아직이야',

  // 목록
  moreItems: (count: number) => `${count}개 더 있어`,

  // 삭제
  deleteConfirm: '진짜 버릴까? 되돌릴 수 없어',

  // 오류
  saveFailed: '앗, 저장이 안 됐어. 한 번만 다시 눌러줘',
  contentTooLong: '너무 길어! 5,000자까지만 담을 수 있어',
  rateLimited: '잠깐만, 조금 천천히 던져줘',

  // 로그아웃 — 메모는 그대로 두고 세션만 끊는다
  logout: '로그아웃',
  logoutDone: '다음에 또 보자!',
  logoutFailed: '로그아웃이 안 됐어. 한 번만 다시 눌러줘',

  // 탈퇴
  withdrawConfirm: '정말 나갈까? 메모가 전부 사라지고 되돌릴 수 없어',

  // 개인정보 관련
  privacyNotice: '메모를 분류하려고 다른 회사에 보내지 않아. 분류는 덤피가 직접 해.',
} as const;

// 카테고리 한글 라벨
export const categoryLabel: Record<Category, string> = {
  '할일': '할 일',
  '일기': '일기',
  '모아둔것': '모아둔 것',
  '그외': '그 외',
};

// 칸 아이콘 — 제목 왼쪽에 붙는 이모지 (장식용, 읽어주지 않음)
export const categoryEmoji: Record<Category, string> = {
  '할일': '🥕',
  '일기': '📔',
  '모아둔것': '🌰',
  '그외': '🧺',
};

// 덤피 본체 — 빈 칸 표시에 쓰는 이모지
export const dumpyEmoji = '🐹';

// 할 일 하위 분류 라벨
export const todoSubLabel = {
  withDeadline: '기한 있음',
  someday: '언젠가',
} as const;
