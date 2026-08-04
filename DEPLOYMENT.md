# 덤피(Dumpy) 배포 가이드

## 배포 전 체크리스트

### 1. 환경변수 설정

`.env` 파일을 생성하고 다음 값들을 설정하세요:

```bash
# 필수 - DB 연결 2개 (같은 DB, 다른 경로)
#   DATABASE_URL : 앱용. 풀러 주소 (호스트에 -pooler)
#   DIRECT_URL   : 마이그레이션용. 직결 주소 (-pooler 없음)
DATABASE_URL="postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="최소 32자 이상의 랜덤 문자열"
SESSION_SECRET="최소 32자 이상의 랜덤 문자열"
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# 웹 (카카오 로그인)
KAKAO_CLIENT_ID="카카오 개발자 콘솔에서 발급"
KAKAO_CLIENT_SECRET="카카오 개발자 콘솔에서 발급"
KAKAO_REDIRECT_URI="https://your-domain.com/api/auth/kakao/callback"

# 미니앱 (토스) - 아래 "TOSS_HASH_SECRET" 항목을 먼저 읽으세요. 한 번 정하면 못 바꿉니다.
TOSS_HASH_SECRET="openssl rand -hex 32 로 만든 64자리 hex"
```

> `TOSS_MTLS_CERT` / `TOSS_MTLS_KEY` / `TOSS_APP_ID` / `TOSS_API_SECRET` 은
> 더 이상 쓰지 않습니다. 그 값들을 읽던 `/api/auth/toss` 와
> `/api/auth/toss/callback` 을 지웠습니다. Vercel 에 남아 있다면 지워도 됩니다.
> 지금 미니앱 로그인은 `POST /api/auth/toss/verify` 하나뿐이고, 클라이언트
> 인증서 없이 미니앱이 보낸 hash 만 받습니다.

### 2. 데이터베이스 설정

배포는 **PostgreSQL만** 지원합니다. Vercel은 파일시스템이 휘발성이라
SQLite로 배포하면 배포마다 데이터가 사라집니다.

```bash
# 스키마를 DB에 반영 (기존 마이그레이션을 그대로 적용)
npm run db:deploy

# 스키마를 고쳐서 새 마이그레이션을 만들 때만
npm run db:migrate
```

#### 로컬은 SQLite, 배포는 PostgreSQL

Prisma는 `provider`를 환경변수로 받지 못합니다 (반드시 리터럴). 그래서
로컬에서 Postgres를 띄우지 않고 개발하려면 `schema.prisma`를 갈아끼워야 합니다.

**손으로 고치지 마세요.** datasource만 되돌리려다 model에 있는 필드까지
같이 날아갑니다. `git checkout prisma/schema.prisma`가 특히 위험합니다 —
그동안 추가한 필드(`passwordHash` 등)가 전부 사라집니다.

```bash
# 로컬 개발용 (SQLite). DATABASE_URL="file:./dev.db"
npm run db:local

# 배포용 (PostgreSQL). 커밋 전에 반드시 이 상태로
npm run db:cloud
```

`scripts/use-datasource.js`가 datasource 블록 하나만 교체하므로 model은
건드리지 않습니다. `npm run db:local`은 개발 서버를 끄고 실행하세요 —
서버가 Prisma 엔진 파일을 잡고 있으면 클라이언트 재생성이 `EPERM`으로 실패합니다.

배포 전 확인:

```bash
grep 'provider = ' prisma/schema.prisma   # postgresql 이어야 한다
```

### 3. 빌드 및 실행

```bash
npm run build
npm run start
```

Vercel에서는 `vercel-build` 스크립트가 대신 실행되어
`prisma migrate deploy`로 마이그레이션을 먼저 적용한 뒤 빌드합니다.
`postinstall`의 `prisma generate`는 Vercel이 의존성을 캐시해도
Prisma Client가 항상 생성되도록 보장합니다. 이 두 줄이 없으면
빌드가 실패하거나 낡은 클라이언트로 배포됩니다.

---

## 보안 체크리스트 (개발 명세서 기준)

### 인증 (반드시 확인)

- [ ] 클라이언트가 보낸 식별자로 메모를 조회하는 코드가 **한 줄도 없음**
- [ ] 식별자는 서버가 인증 서버에 직접 물어 받은 값만 사용
      (자체 로그인은 서버가 비밀번호를 검증한 뒤 발급한 JWT에서만 꺼냄)
- [ ] 미니앱은 토큰, 웹은 쿠키로 세션 관리

### 자체 로그인 (아이디·비밀번호)

- [ ] 비밀번호가 평문으로 저장되거나 로그에 남는 곳이 없음 (scrypt 해시만)
- [ ] 비밀번호 비교가 `timingSafeEqual` — `===` 는 걸린 시간으로 앞자리를 유추할 수 있음
- [ ] 로그인 실패 문구가 "없는 아이디"와 "틀린 비밀번호"를 구분하지 않음
- [ ] 없는 아이디로 시도해도 응답 시간이 비슷함 (더미 해시로 같은 비용을 치름)
- [ ] 로그인·가입에 IP 기준 요청 제한이 걸려 있음

### 인가

- [ ] 계정 A로 로그인한 상태에서 계정 B의 메모 ID를 지목해도 아무것도 안 나옴
- [ ] 모든 DB 조회에 userId 필터 적용됨

### 입력 검증

- [ ] 5,000자 넘는 본문을 API로 직접 보내면 거부됨
- [ ] 빈 본문 거부됨
- [ ] 유효하지 않은 카테고리 거부됨

### 요청 제한

- [ ] 분당 60회 초과 시 차단됨

### 비밀값 관리

- [ ] `.env` 파일이 Git에 없음
- [ ] mTLS 인증서가 Git에 없음
- [ ] 데이터베이스 연결에 SSL 적용됨

---

## 토스 미니앱 검수 체크리스트

### 필수 항목

- [ ] 번들 크기 100MB 이하
- [ ] HTTPS 통신만 사용
- [ ] 라이트 모드만 지원

### 화면/UX

- [ ] 토스 내비게이션 바 사용 (직접 만들지 않음)
- [ ] 자체 뒤로가기와 토스 뒤로가기 동시 노출 안 됨
- [ ] Safe Area 준수 (상하단 여백)
- [ ] 제스처 확대/축소 비활성화
- [ ] 바텀시트 자동 띄우기 없음
- [ ] 모든 조작 2초 이내 응답

### 콘텐츠

- [ ] 웹 버전 언급 없음 (코드에도 없음)
- [ ] 외부 유도 링크 없음
- [ ] 비속어/은어/과도한 유행어 없음

### 법적 요구사항

- [ ] 개인정보 처리방침 링크 있음
- [ ] 이용약관 링크 있음
- [ ] 탈퇴 기능 있음 (찾기 쉬운 위치)

---

## 정기 작업 설정

### 삭제된 메모 정리 (30일 후 완전 삭제)

cron job으로 매일 실행:

```bash
# crontab -e
0 3 * * * cd /path/to/dumpy && npx ts-node scripts/cleanup-deleted-memos.ts
```

---

## 웹 배포 옵션

### Vercel (권장)

배포 주소가 정해져야 카카오 Redirect URI를 등록할 수 있으므로,
**한 번 배포해서 주소를 받은 뒤 로그인을 붙이는** 순서로 진행합니다.

**1) PostgreSQL 준비**

Neon / Supabase / Vercel Postgres 중 아무거나 (무료 티어로 충분).
받은 연결 문자열이 `DATABASE_URL`이 됩니다.

**2) 비밀키 생성**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

두 번 실행해서 `JWT_SECRET`, `SESSION_SECRET`에 각각 넣습니다.

**3) Vercel에 저장소 연결**

vercel.com → Add New Project → GitHub 저장소 import.
비공개 저장소는 Vercel에 접근 권한을 한 번 허용해야 합니다.

**4) 환경변수 입력 후 첫 배포**

이 시점에 넣을 것 (카카오는 아직 없어도 됩니다):

```
DATABASE_URL, JWT_SECRET, SESSION_SECRET
```

배포가 끝나면 `https://<프로젝트>.vercel.app` 주소가 나옵니다.
마이그레이션은 `vercel-build`가 자동으로 적용합니다.

**5) 카카오 로그인 연결**

카카오 개발자 콘솔에서 받은 주소로 등록합니다.

- 플랫폼 → Web → 사이트 도메인: `https://<프로젝트>.vercel.app`
- 카카오 로그인 → 활성화 ON
- Redirect URI: `https://<프로젝트>.vercel.app/api/auth/kakao/callback`

Redirect URI는 글자 하나까지 같아야 합니다 (http/https, 끝 슬래시 포함).
다르면 `KOE006` 오류가 납니다.

**6) 나머지 환경변수 추가 후 재배포**

```
NEXT_PUBLIC_APP_URL   = https://<프로젝트>.vercel.app
KAKAO_CLIENT_ID       = REST API 키 (JavaScript 키 아님)
KAKAO_CLIENT_SECRET   = 콘솔에서 "사용함"으로 켠 경우에만
KAKAO_REDIRECT_URI    = https://<프로젝트>.vercel.app/api/auth/kakao/callback
```

> 개발용 로그인(`/api/auth/dev`)은 프로덕션 빌드에서 화면과 번들 양쪽 모두
> 제거되고 라우트도 403을 반환합니다. 배포본에서는 카카오가 유일한
> 로그인 수단이므로 5~6단계를 마쳐야 로그인할 수 있습니다.

**7) 관리자 화면 열기 (선택)**

```
ADMIN_USER_ID = 관리자로 쓸 계정의 User.id
```

`/admin` 통계 화면과 `/api/admin/*` 은 이 id 로 로그인한 사람에게만 열립니다.
넣지 않으면 관리자가 없는 상태이고 모두에게 404 입니다 (권한 없음을 403 이 아니라
404 로 알리는 이유는 관리자 화면의 존재 자체를 감추기 위함입니다).

값은 카카오로 한 번 로그인한 뒤 `/api/me` 를 열면 `userId` 로 확인할 수 있습니다.
넣은 뒤에는 **재배포해야 적용됩니다** — 모듈이 처음 로드될 때 한 번만 읽습니다.

적용되면 로그인 상태에서 푸터에 `관리자` 링크가 생깁니다.

> 로컬에서는 카카오 키가 없으면 카카오 계정으로 로그인할 수 없습니다. 그때는
> `.env`(gitignore 됨)의 `ADMIN_USER_ID` 를 개발용 로그인 계정 id 로 두면
> `개발용 로그인` 만으로 `/admin` 을 확인할 수 있습니다. 배포 환경변수는
> 별개이므로 영향이 없습니다.

**8) 토스 미니앱에서 API 부르게 하기**

미니앱은 `tossmini.com` 쪽 도메인에서 뜨고 이 서버의 `/api` 를 부릅니다.
브라우저에게는 교차 출처 요청이라 허용 목록이 필요합니다.

```
TOSS_ALLOWED_ORIGINS = https://memoindumpy.apps.tossmini.com,https://memoindumpy.private-apps.tossmini.com
```

쉼표로 구분하고 **끝 슬래시는 붙이지 않습니다**. 목록에 정확히 같은 문자열로
있는 Origin 만 그대로 되돌려주고, 나머지는 CORS 헤더 없이 나갑니다.
`ADMIN_USER_ID` 와 마찬가지로 모듈 로드 시점에 한 번 읽으므로 **바꾸면
재배포해야 적용됩니다**.

여는 경로는 `src/proxy.ts` 의 `matcher` 에 적힌 것뿐입니다 — `/api/memos/*`,
`/api/me/*`, `/api/auth/toss/*`. `/api/admin/*` 과 카카오·자체 로그인 경로는
일부러 빠져 있습니다. matcher 를 `/api/:path*` 로 넓히지 마세요.

> CORS 는 인증이 아닙니다. 브라우저가 응답을 스크립트에 넘겨줄지만 정할 뿐,
> 요청이 서버에 닿는 것은 못 막습니다 (curl 은 목록과 무관하게 들어옵니다).
> 누가 무엇을 볼 수 있는지는 여전히 각 라우트의 `requireAuth` 가 정합니다.

**9) TOSS_HASH_SECRET — 잃어버리면 복구할 수 없는 값**

```
TOSS_HASH_SECRET = <openssl rand -hex 32 로 만든 64자리 hex>   (Production)
```

미니앱 로그인은 토스가 준 `hash` 를 `POST /api/auth/toss/verify` 로 받습니다.
그 값을 DB 에 그대로 넣지 않고 `HMAC-SHA256(TOSS_HASH_SECRET, hash)` 를
`users.providerUserId` 에 저장합니다. DB 가 통째로 새더라도 어느 값을 보내야
그 계정이 되는지 알 수 없게 하려는 것입니다.

> ### ⚠️ 이 값을 잃거나 바꾸면 모든 토스 계정이 영구히 끊깁니다
>
> 같은 사람이 같은 `hash` 를 보내도 계산 결과가 달라져, 자기 메모가 붙어 있는
> 행 대신 **빈 계정으로 새로 가입됩니다.** 예전 메모는 DB 에 남아 있지만 어느
> 계정의 것인지 이어붙일 방법이 없습니다.
>
> `hash` 는 토스가 사용자마다 고정으로 주는 값이라, 원래 시크릿을 되찾는 것
> 말고는 복구 수단이 없습니다. 비밀번호 재설정 같은 우회로가 존재하지 않습니다.
>
> 그래서:
> - **비밀번호 관리자에 따로 보관하세요.** Vercel 대시보드는 한 번 저장한 값을
>   다시 보여주지 않습니다. Vercel 에만 있는 상태 = 백업이 없는 상태입니다.
> - **`JWT_SECRET` 과 같은 값을 쓰지 마세요.** JWT 시크릿은 유출되면 갈아끼워야
>   하는 값인데, 이건 갈아끼울 수 없습니다. 수명이 다릅니다.
> - **Production 스코프에만 넣으세요.** Preview 가 같은 DB 를 쓰는데 시크릿이
>   다르면, 같은 사람이 환경마다 다른 계정으로 갈립니다.
> - 값을 안 넣으면 verify 는 503 을 돌려줍니다. 조용히 예전 방식으로 저장하느니
>   로그인이 막히는 쪽이 낫다고 보고 그렇게 두었습니다.

**기존 토스 계정 이전**

이미 `hash` 를 그대로 저장한 계정이 있다면, **코드를 배포하기 전에** 옮겨야
합니다. 배포부터 하면 기존 사용자가 접속하는 순간 빈 계정이 새로 만들어지고,
그 뒤에는 어느 행이 원본인지 구분할 수 없게 됩니다.

```bash
# 0. DB 백업 (Supabase 대시보드 > Database > Backups)

# 1. 시크릿을 정해 .env 에 넣는다. Vercel 에 넣을 값과 반드시 같아야 한다
openssl rand -hex 32

# 2. 미리보기 — 아무것도 바꾸지 않는다
npx tsx scripts/migrate-toss-hash.ts

# 3. 실제 반영
npx tsx scripts/migrate-toss-hash.ts --commit

# 4. 그 다음에 Vercel 에 TOSS_HASH_SECRET 을 넣고 배포한다
```

메모는 `User.id` 를 보고 붙어 있고 `id` 는 바뀌지 않으므로, 이전 후에도 메모는
그대로 따라옵니다. 바뀌는 것은 `providerUserId` 뿐입니다.

토스 계정이 아직 없다면(테스트만 했다면) 이전 없이 시크릿만 넣고 배포하면
됩니다. 스크립트는 대상이 없으면 아무것도 하지 않습니다.

### 자체 서버

```bash
# PM2 사용
npm install -g pm2
npm run build
pm2 start npm --name "dumpy" -- start
```

---

## 미니앱 배포

1. 앱인토스 콘솔 가입 (만 19세 이상, 본인 명의 토스앱 필요)
2. 워크스페이스 생성 → 앱 등록
3. mTLS 인증서 발급
4. 앱 정보 입력
5. 피처 등록 (1~3개)
6. QR 코드로 테스트
7. 검토 요청 (영업일 1~2일)

---

## 문제 해결

### mTLS 오류

- 인증서 경로 확인
- 인증서 유효기간 확인
- 서버리스 환경에서는 mTLS 설정이 어려울 수 있음 → 일반 Node 서버 권장

### 세션 유지 안 됨 (미니앱)

- iOS에서는 서드파티 쿠키 차단됨
- 반드시 토큰 방식 사용

### 빌드 오류

```bash
# node_modules 재설치
rm -rf node_modules package-lock.json
npm install
```
