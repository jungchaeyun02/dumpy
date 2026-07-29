# 덤피 (Dumpy)

> 생각날 땐 고민 없이 그냥 덤프(Dump)해!

기록 시점에는 아무것도 묻지 않고, 저장된 내용을 자동 분류해주는 메모 서비스입니다.

## 특징

- **자동 분류**: 메모를 저장하면 할 일, 일기, 모아둔 것, 그 외로 자동 분류
- **수동 분류 가능**: 원하면 분류 칩을 선택해서 직접 지정
- **분류 수정**: 잘못 분류됐으면 한 번의 동작으로 수정
- **두 가지 플랫폼**: 토스 미니앱 + 웹

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL + Prisma
- **Auth**: JWT (미니앱) / Cookie (웹)

## 시작하기

### 1. 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env
# .env 파일 수정
```

### 3. 데이터베이스 설정

```bash
npm run db:push
```

### 4. 개발 서버 실행

```bash
npm run dev
```

- 웹: http://localhost:3000
- 미니앱: http://localhost:3000/mini

## 프로젝트 구조

```
src/
├── app/
│   ├── (miniapp)/         # 토스 미니앱
│   │   └── mini/
│   ├── api/               # API 라우트
│   │   ├── auth/          # 인증 (카카오, 토스)
│   │   ├── memos/         # 메모 CRUD
│   │   └── me/            # 회원 관리
│   ├── done/              # 완료함
│   ├── privacy/           # 개인정보 처리방침
│   └── terms/             # 이용약관
├── components/
│   ├── memo/              # 메모 관련 컴포넌트
│   └── ui/                # 공통 UI 컴포넌트
├── lib/
│   ├── auth/              # 인증/세션 관리
│   ├── classify/          # 자동 분류 엔진
│   ├── db/                # 데이터베이스 접근
│   └── utils/             # 유틸리티
└── types/                 # TypeScript 타입
```

## 분류 규칙

1. **할 일**: `~하기`, `~해야`, 행동 명사(제출, 예약 등)
2. **모아둔 것**: URL, `추천`, `보고 싶은` 등
3. **일기**: 과거형 종결(`~했다`), 감정어(`기분`, `좋았`)
4. **그 외**: 위 규칙에 안 걸리면 기본값

## 스크립트

```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 실행
npm run lint         # 린트 검사
npm run db:generate  # Prisma 클라이언트 생성
npm run db:push      # DB 스키마 반영
npm run db:migrate   # 마이그레이션
npm run db:studio    # Prisma Studio
```

## 배포

자세한 배포 가이드는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참조하세요.

## 라이선스

MIT
