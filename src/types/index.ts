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

// ===== 관리자 화면 =====
//
// DB 에 저장되는 값. 화면에 보이는 한글 Category 와 달리 영문 키다
export type CategoryKey = 'todo' | 'diary' | 'collected' | 'etc';
export type ProviderKey = Provider;

// 비율은 전부 number | null 이다. null 은 '분모가 0이라 낼 수 없음'이고
// 0 과 다른 얘기다 - 화면에서 0% 가 아니라 — 로 나온다.

// 칸별 자동 분류 성적 한 줄
export interface AutoCategoryRow {
  category: CategoryKey;
  // 덤피가 이 칸으로 보낸 메모
  assigned: number;
  // 그중 아직 이 칸에 있는 것
  kept: number;
  rate: number | null;
}

// 오분류 방향 한 줄. from(덤피가 보낸 칸) -> to(사람이 옮긴 칸)
export interface MisclassRow {
  from: CategoryKey;
  to: CategoryKey;
  count: number;
}

// 칸별 분포 한 줄
export interface CategoryShareRow {
  category: CategoryKey;
  count: number;
  rate: number | null;
}

// 전체 집계. 메모 본문은 어떤 필드에도 담기지 않는다
export interface AdminStats {
  generatedAt: string;

  // 1) 기본 현황
  basics: {
    users: number;
    memosTotal: number;
    // 안 지운 것 (완료 포함)
    memosLive: number;
    // 한국 시간 오늘 자정 이후 저장된 것
    memosToday: number;
  };

  // 2) 자동 분류 정확도.
  //    모집단은 autoCategory 가 채워진 메모 = 덤피가 칸을 정한 메모다.
  //    classifiedBy 로 모집단을 잡으면 사람이 고친 건이 빠져나가서
  //    늘 100% 가 나온다 (stillMarkedAuto 주석 참고)
  autoClassify: {
    judged: number;
    kept: number;
    accuracy: number | null;
    // classifiedBy 가 아직 auto 인 것. 구조상 이 안에서는 category 와
    // autoCategory 가 어긋날 수 없어서 늘 kept 와 같다. 비교용으로만 둔다
    stillMarkedAuto: number;
    byCategory: AutoCategoryRow[];
  };

  // 3) 오분류 방향. 많은 순
  misclassifications: MisclassRow[];

  // 4) 이용 패턴
  usage: {
    total: number;
    liveTotal: number;
    // 쓸 때 칩을 눌러 칸을 직접 고른 것 (autoCategory 가 비어 있다)
    manualAtWrite: number;
    // 덤피에게 맡긴 것
    autoAtWrite: number;
    // 맡긴 뒤 사람이 고친 것
    correctedAfter: number;
    manualRate: number | null;
    byCategory: CategoryShareRow[];
  };
}

// 사용자 목록 한 줄. providerUserId 는 외부 식별자면 뒷자리만 남긴 값이다
export interface AdminUserRow {
  id: string;
  provider: string;
  providerUserId: string;
  createdAt: string;
  memoCount: number;
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
