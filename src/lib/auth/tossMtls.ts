/**
 * 토스 서버와의 mTLS 통신
 *
 * mTLS(상호 TLS)는 평소 TLS 와 방향이 하나 더 있다. 우리가 토스 서버 인증서를
 * 확인하는 건 늘 하던 것이고, 여기에 더해 토스 서버도 우리 인증서를 보고
 * "이 요청이 정말 덤피 서버에서 온 것"인지 확인한다. 그래서 우리 쪽 인증서와
 * 개인키가 요청마다 함께 나가야 한다.
 *
 * 왜 fetch 를 안 쓰나:
 *   Node 의 전역 fetch 에는 클라이언트 인증서를 붙일 자리가 없다. undici 의
 *   dispatcher 옵션이 그 자리인데 undici 는 이 프로젝트의 의존성이 아니다.
 *   node:https 는 런타임에 이미 있고 cert/key 를 그대로 받는다.
 *   (기존 callback/route.ts 가 fetch 에 `agent` 를 넘기고 @ts-ignore 로 덮어둔
 *    부분은 사실 아무 효과가 없다 — 전역 fetch 는 그 옵션을 그냥 버린다.)
 *
 * 인증서는 파일이 아니라 환경변수에서 읽는다. Vercel 은 배포마다 파일시스템이
 * 새로 뜨는 데다, 개인키를 저장소나 디스크에 남기지 않는 편이 낫다.
 */

import https from 'node:https';

export interface MtlsCredentials {
  cert: string;
  key: string;
  passphrase?: string;
}

/**
 * 환경변수에 담긴 PEM 을 Node 가 읽을 수 있는 형태로 정리한다
 *
 * PEM 은 줄바꿈이 의미를 갖는 형식인데, 환경변수를 거치면 그 줄바꿈이 여러
 * 모습으로 망가져서 온다. 실제로 자주 보는 것들:
 *   - 줄바꿈이 역슬래시+n 두 글자로 들어옴 (한 줄짜리 문자열로 붙여넣은 경우)
 *   - CRLF (윈도우에서 복사한 경우)
 *   - 값 전체가 따옴표에 감싸인 채로 들어옴 (.env 문법이 그대로 딸려온 경우)
 * 셋 다 눈으로는 멀쩡해 보이는데 Node 는 "PEM 을 못 읽겠다"고만 한다.
 *
 * 형태가 PEM 이 아니면 null 을 돌려준다. 값이 있긴 한데 깨진 경우와 아예 없는
 * 경우를 부르는 쪽에서 똑같이 "미설정"으로 다루게 하려는 것이다 — 어느 쪽이든
 * 사람이 환경변수를 고쳐야 풀리는 문제다.
 */
function normalizePem(raw: string | undefined): string | null {
  if (!raw) return null;

  let value = raw.trim();

  // 값을 감싼 따옴표 벗기기
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  value = value
    // 두 글자짜리 이스케이프 먼저 (\r\n 을 \n 보다 앞에 둬야 \r 이 안 남는다)
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    // 진짜 CRLF
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '')
    .trim();

  // BEGIN/END 표시가 없으면 PEM 이 아니다
  if (!/-----BEGIN [^-]+-----/.test(value) || !/-----END [^-]+-----/.test(value)) {
    return null;
  }

  // PEM 은 마지막 줄 뒤에 줄바꿈이 있어야 한다
  return `${value}\n`;
}

/**
 * 환경변수에서 mTLS 인증서를 읽는다
 *
 * 하나라도 없거나 PEM 형태가 아니면 null. 부르는 쪽은 이걸 503 으로 돌려준다.
 *
 * 매 요청마다 읽는다. 정규식 몇 번이라 비용이 없고, 값을 모듈 로드 시점에
 * 붙잡아두면 인증서를 교체했을 때 왜 안 바뀌는지 헤매게 된다.
 */
export function loadMtlsCredentials(): MtlsCredentials | null {
  const cert = normalizePem(process.env.TOSS_MTLS_CERT);
  const key = normalizePem(process.env.TOSS_MTLS_KEY);

  if (!cert || !key) return null;

  // 개인키에 암호가 걸려 있는 경우에만 쓴다. 안 걸려 있으면 없어도 된다.
  const passphrase = process.env.TOSS_MTLS_KEY_PASSPHRASE?.trim() || undefined;

  return { cert, key, passphrase };
}

export interface MtlsResponse {
  status: number;
  body: string;
}

// 인증 응답은 짧다. 상대가 무한정 보내는 상황에서 메모리를 지키는 상한이다.
const MAX_RESPONSE_BYTES = 64 * 1024;

// 로그인 요청이 여기서 오래 붙잡히면 사용자 화면이 멈춘 것처럼 보인다.
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * 클라이언트 인증서를 붙여 HTTPS 요청을 보낸다
 *
 * 응답 본문을 해석하지 않고 상태 코드와 문자열 그대로 돌려준다. 토스가 어떤
 * 형식으로 답하는지 아직 확정되지 않았으므로, 해석은 그걸 아는 쪽에서 한다.
 */
export function mtlsRequest(
  url: string,
  init: {
    method: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  },
  credentials: MtlsCredentials
): Promise<MtlsResponse> {
  return new Promise((resolve, reject) => {
    let target: URL;
    try {
      target = new URL(url);
    } catch {
      reject(new Error('토스 검증 주소가 올바른 URL 이 아니다'));
      return;
    }

    // http 로 보내면 인증서가 붙지 않는다. 조용히 평문으로 나가느니 여기서 막는다.
    if (target.protocol !== 'https:') {
      reject(new Error('mTLS 요청은 https 로만 보낸다'));
      return;
    }

    const body = init.body;
    const headers: Record<string, string> = { ...init.headers };
    if (body !== undefined) {
      headers['Content-Length'] = String(Buffer.byteLength(body));
    }

    const request = https.request(
      {
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        method: init.method,
        headers,

        // 우리를 증명하는 쪽
        cert: credentials.cert,
        key: credentials.key,
        passphrase: credentials.passphrase,

        // 상대를 확인하는 쪽. 절대 끄지 않는다 — 이걸 끄면 중간에 누가 끼어들어도
        // 알 수 없고, 그 상대에게 우리 인증서를 그대로 내주게 된다.
        rejectUnauthorized: true,
        servername: target.hostname,
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;

        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_RESPONSE_BYTES) {
            request.destroy(new Error('토스 서버 응답이 너무 크다'));
            return;
          }
          chunks.push(chunk);
        });

        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });

        response.on('error', reject);
      }
    );

    request.setTimeout(init.timeoutMs ?? DEFAULT_TIMEOUT_MS, () => {
      request.destroy(new Error('토스 서버 응답 시간 초과'));
    });

    request.on('error', reject);

    if (body !== undefined) request.write(body);
    request.end();
  });
}
