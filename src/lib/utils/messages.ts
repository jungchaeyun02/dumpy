import type { Category } from '@/types';

/**
 * 덤피 화면 문구
 * - 두 서비스(미니앱/웹)가 같은 문구를 사용
 * - 미니앱 검수 기준(비속어/은어/과도한 유행어 금지)에 맞춤
 * - 말하는 사람은 덤피(햄스터)
 */
export const messages = {
  // 입력
  inputPlaceholder: '여기다 쏙 던져!',
  saveButton: '덤프!',

  // 저장 직후
  saveSuccess: (category: Category) => `'${categoryLabel[category]}'에 쏙 넣었어!`,
  changeCategory: '아니야, 딴 칸',

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

// 할 일 하위 분류 라벨
export const todoSubLabel = {
  withDeadline: '기한 있음',
  someday: '언젠가',
} as const;
