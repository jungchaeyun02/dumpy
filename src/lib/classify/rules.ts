/**
 * 덤피 자동 분류 규칙
 *
 * 규칙 기반 분류: AI 모델 없이 미리 정의된 조건표대로 판단
 * - 만들기 쉽고
 * - 왜 그 칸에 갔는지 설명 가능
 * - 틀렸을 때 어디를 고칠지 바로 보임
 *
 * 판정 순서: 위에서부터, 걸리면 멈춤
 * 1) 할 일 신호 → 할일
 * 2) URL 또는 수집 신호 → 모아둔것
 * 3) 과거형 + 감정/서술 신호 → 일기
 * 4) 아무것도 안 걸리면 → 그외
 */

import type { Category, ClassificationResult } from '@/types';

// ========== 신호 정의 ==========

// 할 일 신호
const TODO_ACTION_ENDINGS = [
  '하기', '사기', '보내기', '챙기기', '해야', '가야', '할 것', '할것',
  '해야지', '가야지', '해야함', '해야함', '할거', '할게',
];

const TODO_ACTION_NOUNS = [
  '제출', '마감', '신청', '예약', '결제', '전화', '확인', '준비', '등록', '반납',
  '구매', '송금', '입금', '출금', '예매', '취소', '연락', '문의', '방문',
];

// 기한 표현 (hasDeadline 판정에도 사용)
const DEADLINE_PATTERNS = [
  '오늘', '내일', '모레', '글피',
  '이번 주', '이번주', '다음 주', '다음주', '주말',
  '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일',
  '까지',
];

// 날짜 패턴 정규식
const DATE_REGEX = /\d{1,2}월\s*\d{1,2}일|\d{1,2}\/\d{1,2}|\d{1,2}\.\d{1,2}/;
const TIME_REGEX = /\d{1,2}시|\d{1,2}:\d{2}/;
const DDAY_REGEX = /\d+일\s*(까지|안에|내로|후)/;

// 모아둔것 신호
const URL_REGEX = /https?:\/\//i;
const COLLECTION_SIGNALS = [
  '추천', '보고 싶은', '보고싶은', '읽을', '읽고 싶은', '읽고싶은',
  '듣고 싶은', '듣고싶은', '가보고 싶은', '가보고싶은', '가고 싶은', '가고싶은',
  '위시', '리스트', '모음', '나중에', '담아', '찜',
  '보러', '들으러', '먹으러',
];

// 일기 신호 - 과거형 종결
const PAST_ENDINGS = [
  '했다', '였다', '았다', '었다', '더라', '네', '군', '구나',
  '했음', '였음', '았음', '었음', '했네', '였네',
  '했어', '였어', '았어', '었어',
];

// 일기 신호 - 감정어
const EMOTION_WORDS = [
  '기분', '좋았', '짜증', '슬펐', '행복', '피곤', '설렜', '힘들',
  '기뻤', '화났', '우울', '신났', '지쳤', '뿌듯', '아쉬웠', '속상',
  '걱정', '불안', '편했', '즐거웠', '재밌었', '재미있었', '심심',
  '외로', '감사', '고마', '미안', '후회',
];

// ========== 판정 함수 ==========

/**
 * 할 일 신호 감지
 */
function detectTodoSignals(content: string): number {
  let signalCount = 0;

  // 행동 어미 체크
  for (const ending of TODO_ACTION_ENDINGS) {
    if (content.includes(ending)) {
      signalCount++;
      break; // 하나만 세기
    }
  }

  // 행동 명사 체크
  for (const noun of TODO_ACTION_NOUNS) {
    if (content.includes(noun)) {
      signalCount++;
      break;
    }
  }

  return signalCount;
}

/**
 * 기한 표현 감지
 */
function detectDeadline(content: string): boolean {
  // 기한 키워드 체크
  for (const pattern of DEADLINE_PATTERNS) {
    if (content.includes(pattern)) {
      return true;
    }
  }

  // 날짜 패턴 체크
  if (DATE_REGEX.test(content)) {
    return true;
  }

  // 시간 패턴 체크
  if (TIME_REGEX.test(content)) {
    return true;
  }

  // D-day 패턴 체크
  if (DDAY_REGEX.test(content)) {
    return true;
  }

  return false;
}

/**
 * 모아둔것 신호 감지
 */
function detectCollectionSignals(content: string): number {
  let signalCount = 0;

  // URL 체크
  if (URL_REGEX.test(content)) {
    signalCount++;
  }

  // 수집 신호 체크
  for (const signal of COLLECTION_SIGNALS) {
    if (content.includes(signal)) {
      signalCount++;
      break;
    }
  }

  return signalCount;
}

/**
 * 일기 신호 감지
 */
function detectDiarySignals(content: string): number {
  let signalCount = 0;

  // 과거형 종결 체크
  for (const ending of PAST_ENDINGS) {
    if (content.includes(ending)) {
      signalCount++;
      break;
    }
  }

  // 감정어 체크
  for (const emotion of EMOTION_WORDS) {
    if (content.includes(emotion)) {
      signalCount++;
      break;
    }
  }

  return signalCount;
}

/**
 * 확신도 계산
 * - 신호 2개 이상: 0.9
 * - 신호 1개: 0.6
 * - 신호 없음: 0.2
 */
function calculateConfidence(signalCount: number): number {
  if (signalCount >= 2) return 0.9;
  if (signalCount === 1) return 0.6;
  return 0.2;
}

// ========== 메인 분류 함수 ==========

/**
 * 메모 내용을 분석하여 카테고리를 결정
 *
 * @param content 메모 본문
 * @returns 분류 결과 (카테고리, 확신도, 기한 여부)
 */
export function classify(content: string): ClassificationResult {
  const normalizedContent = content.trim();

  // 기한 여부는 별도로 먼저 판정
  const hasDeadline = detectDeadline(normalizedContent);

  // 1) 할 일 신호 체크
  const todoSignals = detectTodoSignals(normalizedContent);
  if (todoSignals > 0) {
    // 기한 표현이 있으면서 서술형이 아닌 경우도 할 일로
    const extraSignal = hasDeadline && !detectDiarySignals(normalizedContent) ? 1 : 0;
    const totalSignals = todoSignals + extraSignal;

    return {
      category: '할일',
      confidence: calculateConfidence(totalSignals),
      hasDeadline,
    };
  }

  // 기한만 있고 서술형 아니면 할 일로
  if (hasDeadline && detectDiarySignals(normalizedContent) === 0) {
    return {
      category: '할일',
      confidence: 0.6,
      hasDeadline,
    };
  }

  // 2) 모아둔것 신호 체크
  const collectionSignals = detectCollectionSignals(normalizedContent);
  if (collectionSignals > 0) {
    return {
      category: '모아둔것',
      confidence: calculateConfidence(collectionSignals),
      hasDeadline,
    };
  }

  // 3) 일기 신호 체크
  const diarySignals = detectDiarySignals(normalizedContent);
  if (diarySignals > 0) {
    return {
      category: '일기',
      confidence: calculateConfidence(diarySignals),
      hasDeadline,
    };
  }

  // 4) 아무것도 안 걸리면 그외
  return {
    category: '그외',
    confidence: 0.2,
    hasDeadline,
  };
}

// 테스트용 내보내기
export const _testExports = {
  detectTodoSignals,
  detectDeadline,
  detectCollectionSignals,
  detectDiarySignals,
  calculateConfidence,
};
