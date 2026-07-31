/**
 * 미니앱 CORS
 *
 * 토스 미니앱은 tossmini.com 쪽 도메인에서 화면이 뜨고, 거기서 이 서버의
 * /api 를 부른다. 브라우저 눈에는 교차 출처 요청이라, 서버가 "이 출처는
 * 응답을 읽어도 된다"고 답해주지 않으면 응답이 스크립트까지 오지 않는다.
 *
 * CORS 는 인증이 아니다. 여기서 정하는 건 브라우저가 응답을 스크립트에
 * 넘겨줄지 여부뿐이고, 요청이 서버에 닿는 것 자체는 못 막는다 (curl 한 줄이면
 * 허용 목록과 상관없이 그냥 들어온다). 누가 무엇을 볼 수 있는지는 여전히
 * requireAuth 가 정한다.
 *
 * 허용 목록은 TOSS_ALLOWED_ORIGINS 에 쉼표로 구분해 넣는다.
 * admin.ts 와 마찬가지로 모듈 로드 시점에 한 번만 읽으므로, 값을 바꾸면
 * 재배포해야 반영된다.
 */

/**
 * 출처는 scheme://host[:port] 형태로 경로가 없다. 그래서 끝 슬래시와
 * 대소문자만 정리하면 문자열 비교로 충분하다.
 *
 * 콘솔에 주소를 붙여넣다 보면 끝에 / 가 딸려오는 일이 잦은데, 브라우저가
 * 보내는 Origin 헤더에는 / 가 없어서 그대로 두면 조용히 안 맞는다.
 */
function normalize(origin: string): string {
  return origin.trim().replace(/\/+$/, '').toLowerCase();
}

const ALLOWED_ORIGINS: readonly string[] = (process.env.TOSS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map(normalize)
  .filter(Boolean);

/**
 * 이 Origin 이 허용 목록에 있는지
 *
 * 반드시 완전히 같은지로 본다. startsWith/endsWith 로 비교하면
 * `https://memoindumpy.apps.tossmini.com.evil.com` 이나
 * `https://evil-memoindumpy.apps.tossmini.com` 같은 주소가 통과한다.
 */
export function isAllowedOrigin(origin: string | null | undefined): origin is string {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(normalize(origin));
}

// 미니앱이 실제로 쓰는 메서드와 헤더만 연다.
// 메모 API 가 PATCH(완료 토글)·DELETE(삭제)까지 쓴다.
const ALLOW_METHODS = 'GET, POST, PATCH, DELETE, OPTIONS';
const ALLOW_HEADERS = 'Content-Type, Authorization';

// 교차 출처에서는 기본으로 몇 개 헤더밖에 못 읽는다. 메모 저장이 돌려주는
// 남은 횟수는 클라이언트가 봐야 의미가 있어서 따로 열어준다.
const EXPOSE_HEADERS = 'X-RateLimit-Remaining, X-RateLimit-Reset';

// 사전 요청 결과를 브라우저가 캐시해도 되는 시간(초). 24시간.
const MAX_AGE = '86400';

/**
 * 실제 요청(GET·POST·…) 응답에 붙일 헤더
 *
 * Vary 는 허용되지 않은 출처에도 붙인다. 같은 주소라도 Origin 에 따라 응답
 * 헤더가 달라지므로, 이게 없으면 중간 캐시가 A 출처용 응답을 B 출처에게
 * 그대로 내줄 수 있다.
 */
export function applyCorsHeaders(headers: Headers, origin: string | null): void {
  headers.append('Vary', 'Origin');

  if (!isAllowedOrigin(origin)) return;

  // 허용 목록에 있을 때만, 받은 값을 그대로 되돌려준다.
  // `*` 는 쓰지 않는다 - 되돌려주는 방식이어야 목록 밖 출처가 걸러진다.
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Expose-Headers', EXPOSE_HEADERS);

  // Access-Control-Allow-Credentials 는 일부러 넣지 않는다.
  // 미니앱은 Authorization 헤더의 토큰으로 인증하므로 쿠키가 필요 없고,
  // 이걸 켜면 웹(카카오) 세션 쿠키가 교차 출처 요청에 실려 갈 길이 열린다.
}

/**
 * OPTIONS 사전 요청에 돌려줄 헤더
 *
 * 허용되지 않은 출처면 CORS 헤더 없이 Vary 만 붙는다. 브라우저는 허가를
 * 못 받았으니 본 요청을 보내지 않는다.
 */
export function preflightHeaders(origin: string | null): Headers {
  const headers = new Headers();
  applyCorsHeaders(headers, origin);

  if (isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Methods', ALLOW_METHODS);
    headers.set('Access-Control-Allow-Headers', ALLOW_HEADERS);
    headers.set('Access-Control-Max-Age', MAX_AGE);
  }

  return headers;
}
