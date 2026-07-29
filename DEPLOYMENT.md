# 덤피(Dumpy) 배포 가이드

## 배포 전 체크리스트

### 1. 환경변수 설정

`.env` 파일을 생성하고 다음 값들을 설정하세요:

```bash
# 필수
DATABASE_URL="postgresql://user:password@host:5432/dumpy?sslmode=require"
JWT_SECRET="최소 32자 이상의 랜덤 문자열"
SESSION_SECRET="최소 32자 이상의 랜덤 문자열"
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# 웹 (카카오 로그인)
KAKAO_CLIENT_ID="카카오 개발자 콘솔에서 발급"
KAKAO_CLIENT_SECRET="카카오 개발자 콘솔에서 발급"
KAKAO_REDIRECT_URI="https://your-domain.com/api/auth/kakao/callback"

# 미니앱 (토스)
TOSS_APP_ID="앱인토스 콘솔에서 발급"
TOSS_API_SECRET="앱인토스 콘솔에서 발급"
TOSS_MTLS_CERT_PATH="/path/to/cert.pem"
TOSS_MTLS_KEY_PATH="/path/to/key.pem"
```

### 2. 데이터베이스 설정

```bash
# Prisma 마이그레이션 실행
npm run db:migrate

# 또는 개발 환경에서
npm run db:push
```

### 3. 빌드 및 실행

```bash
# 빌드
npm run build

# 프로덕션 실행
npm run start
```

---

## 보안 체크리스트 (개발 명세서 기준)

### 인증 (반드시 확인)

- [ ] 클라이언트가 보낸 식별자로 메모를 조회하는 코드가 **한 줄도 없음**
- [ ] 식별자는 서버가 인증 서버에 직접 물어 받은 값만 사용
- [ ] 미니앱은 토큰, 웹은 쿠키로 세션 관리

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

- [ ] `granite.config.ts`의 `appName`이 콘솔 등록값과 일치
- [ ] `granite.config.ts`의 아이콘 URL이 콘솔 등록값과 일치
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

1. GitHub 저장소 연결
2. 환경변수 설정
3. 자동 배포

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
