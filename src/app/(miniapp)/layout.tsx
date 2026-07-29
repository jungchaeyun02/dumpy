import type { Metadata, Viewport } from 'next';
import '../globals.css';

/**
 * 토스 미니앱 레이아웃
 *
 * 웹과 다른 점:
 * - Safe Area 준수 (iOS Dynamic Island, 하단 홈 인디케이터)
 * - 확대/축소 비활성화
 * - 세로 방향 고정
 * - 라이트 모드만
 */

export const metadata: Metadata = {
  title: '덤피',
  description: '생각날 땐 그냥 덤프해!',
  // 웹 버전 언급 금지 (외부 유도 금지)
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // 확대/축소 비활성화
  viewportFit: 'cover', // Safe Area 지원
  themeColor: '#FF6B1A',
};

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full">
      <head>
        {/* 토스 앱인토스 SDK */}
        <script src="https://static.toss.im/apps/sdk/1.0/sdk.min.js" defer />
      </head>
      <body
        className="min-h-full flex flex-col bg-cream text-ink"
        style={{
          // Safe Area 패딩
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        {children}
      </body>
    </html>
  );
}
