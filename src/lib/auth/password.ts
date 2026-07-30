/**
 * 비밀번호 해싱 (자체 로그인용)
 *
 * 카카오·토스는 인증 서버가 신원을 보증하지만, 자체 로그인은 비밀번호를
 * 우리가 직접 보관해야 한다. 그래서 두 가지를 지킨다:
 *
 * - 평문은 어디에도 저장하지 않고 로그로도 남기지 않는다.
 * - 비교는 timingSafeEqual 로 한다. `===` 는 앞에서부터 다른 글자를 만나면
 *   바로 끝나서, 걸린 시간으로 몇 글자가 맞았는지 유추할 수 있다.
 *
 * Node 내장 scrypt 를 쓴다. 의존성이 하나도 늘지 않고, C++ 로 구현돼 있어
 * 순수 JS 해시 구현보다 같은 시간에 더 많은 일을 시킬 수 있다.
 *
 * package.json 에 bcryptjs 가 들어 있지만 아직 아무 곳에서도 쓰이지 않는다.
 * (순수 JS 라 Vercel 에서도 돌아간다 — 네이티브 빌드가 필요한 쪽은 bcrypt·argon2 다)
 * 굳이 갈아탈 이유가 없어서 내장 scrypt 로 두고, bcryptjs 는 정리 대상으로 남긴다.
 */

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number }
) => Promise<Buffer>;

// scrypt 작업량. N 을 올리면 대입 공격이 느려지는 대신 로그인도 같이 느려진다.
// 16384 은 Node 기본값으로, 요즘 기기에서 한 번에 100ms 안쪽이다.
const COST_N = 16384;
const BLOCK_SIZE_R = 8;
const PARALLEL_P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

// 저장 형식: scrypt$N$salt(hex)$key(hex)
// N 을 같이 적어두면 나중에 작업량을 올려도 기존 해시를 그대로 검증할 수 있다.
const ALGORITHM = 'scrypt';

/**
 * 비밀번호를 해시로 바꾼다. 같은 비밀번호도 매번 다른 값이 나온다(솔트).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scrypt(password, salt, KEY_LENGTH, {
    N: COST_N,
    r: BLOCK_SIZE_R,
    p: PARALLEL_P,
  });

  return `${ALGORITHM}$${COST_N}$${salt.toString('hex')}$${key.toString('hex')}`;
}

/**
 * 비밀번호가 해시와 맞는지 확인한다.
 *
 * 해시가 깨져 있거나 형식이 다르면 조용히 false 를 돌려준다.
 * 여기서 예외를 던지면 오류 화면 내용으로 계정 상태를 짐작할 수 있다.
 */
export async function verifyPassword(
  password: string,
  storedHash: string | null
): Promise<boolean> {
  if (!storedHash) return false;

  const parts = storedHash.split('$');
  if (parts.length !== 4) return false;

  const [algorithm, costText, saltHex, keyHex] = parts;
  if (algorithm !== ALGORITHM) return false;

  const cost = Number(costText);
  if (!Number.isInteger(cost) || cost <= 0) return false;

  let salt: Buffer;
  let expectedKey: Buffer;
  try {
    salt = Buffer.from(saltHex, 'hex');
    expectedKey = Buffer.from(keyHex, 'hex');
  } catch {
    return false;
  }

  if (salt.length === 0 || expectedKey.length === 0) return false;

  const actualKey = await scrypt(password, salt, expectedKey.length, {
    N: cost,
    r: BLOCK_SIZE_R,
    p: PARALLEL_P,
  });

  // 길이가 다르면 timingSafeEqual 이 예외를 던지므로 먼저 확인한다
  if (actualKey.length !== expectedKey.length) return false;

  return timingSafeEqual(actualKey, expectedKey);
}
