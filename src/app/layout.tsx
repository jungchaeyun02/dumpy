import type { Metadata, Viewport } from 'next';
import './globals.css';

// 탭 제목과 링크 미리보기에 같은 값이 세 번(기본·openGraph·twitter) 들어간다.
// 한 곳에서 꺼내 쓰지 않으면 나중에 하나만 고치고 나머지를 놓친다.
const TITLE = '덤피 — 자동 분류 메모장';
const DESCRIPTION = '쓸 땐 아무것도 안 골라도, 나중엔 나뉘어 있어';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['메모', '자동분류', '할일', '일기', '덤피', 'dumpy'],
  authors: [{ name: 'Dumpy Team' }],
  manifest: '/manifest.json',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: '덤피',
    type: 'website',
    locale: 'ko_KR',
    // images 는 넣지 않았다. public 에 덤피 캐릭터 이미지가 없고,
    // 덤피는 이모지(🐹)라서 쓸 파일이 없다. 캐릭터 PNG 가 생기면
    // images: ['/og.png'] 한 줄만 추가하면 된다
  },
  twitter: {
    // 이미지가 없으므로 summary. 이미지를 넣게 되면
    // summary_large_image 로 바꿔야 카드가 크게 나온다
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '덤피',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FF6B1A',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        {children}
      </body>
    </html>
  );
}
