// 덤피 메모 분류 카테고리
export type Category = '할일' | '일기' | '모아둔것' | '그외';

// 분류 주체
export type ClassifiedBy = 'auto' | 'manual';

// 인증 제공자
// 'toss' 미니앱, 'web' 카카오, 'local' 아이디·비밀번호 자체 로그인
export type Provider = 'toss' | 'web' | 'local';

// 사용자 타입
// passwordHash 는 서버 안에서만 다루는 값이라 여기에 넣지 않는다.
// 필요한 곳에서는 Prisma 가 만든 타입을 직접 쓴다.
export interface User {
  id: string;
  provider: Provider;
  providerUserId: string;
  agreedAt: Date;
  ageConfirmedAt: Date;
  createdAt: Date;
}

// 메모 타입
export interface Memo {
  id: string;
  userId: string;
  content: string;
  category: Category;
  classifiedBy: ClassifiedBy;
  autoCategory: Category | null;
  confidence: number;
  hasDeadline: boolean;
  isDone: boolean;
  doneAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// API 요청 타입
export interface CreateMemoRequest {
  content: string;
  category?: Category; // 선택적 - 없으면 자동 분류
}

export interface UpdateMemoRequest {
  content?: string;
  category?: Category;
  isDone?: boolean;
}

// API 응답 타입
export interface MemoResponse {
  success: boolean;
  data?: Memo;
  error?: string;
}

export interface MemosListResponse {
  success: boolean;
  data?: {
    할일: Memo[];
    일기: Memo[];
    모아둔것: Memo[];
    그외: Memo[];
  };
  error?: string;
}

// 자동 분류 결과
export interface ClassificationResult {
  category: Category;
  confidence: number;
  hasDeadline: boolean;
}

// 세션 정보
export interface SessionPayload {
  userId: string;
  provider: Provider;
  iat: number;
  exp: number;
}

// 화면 문구 타입
export interface UIMessages {
  inputPlaceholder: string;
  saveButton: string;
  saveSuccess: (category: Category) => string;
  changeCategory: string;
  emptyState: Record<Category, string>;
  completeTask: string;
  viewCompleted: string;
  undoComplete: string;
  moreItems: (count: number) => string;
  deleteConfirm: string;
  saveFailed: string;
  contentTooLong: string;
  rateLimited: string;
  withdrawConfirm: string;
}
