/**
 * 앱인토스 설정 파일
 *
 * 주의사항:
 * - appName, brand.icon 등의 값이 콘솔 등록값과 글자 하나까지 같아야 함
 * - 다르면 검수에서 반려됨 (반려 단골 항목)
 * - appName은 소문자, 숫자, 대시만 사용 (딥링크에 사용됨: intoss://dumpy)
 */

interface GraniteConfig {
  appName: string;
  brand: {
    displayName: string;
    primaryColor: string;
    icon: string;
  };
  navigation: {
    type: 'non-game' | 'game';
    header: {
      visible: boolean;
      backButton: boolean;
    };
  };
  theme: {
    mode: 'light' | 'dark';
  };
  features: {
    autoBottomSheet: boolean;
    gestureZoom: boolean;
  };
}

const config: GraniteConfig = {
  // 앱 식별자 (콘솔 등록값과 일치해야 함)
  appName: 'dumpy',

  // 브랜드 설정
  brand: {
    // 화면에 표시될 한글 이름
    displayName: '덤피',

    // 주 색상 - 콘솔과 일치해야 함
    primaryColor: '#FF6B1A',

    // 앱 아이콘 URL - 콘솔에 업로드한 것과 같은 URL 사용
    // 다르면 반려됨!
    icon: 'https://your-cdn.com/dumpy-icon-600x600.png',
  },

  // 내비게이션 설정
  navigation: {
    // 비게임 앱은 반드시 'non-game' 사용
    type: 'non-game',

    // 상단바 설정
    header: {
      // 토스가 그려주는 내비게이션 바 사용
      // 직접 만들지 않음!
      visible: true,

      // 뒤로가기 버튼
      // 토스 뒤로가기와 자체 뒤로가기가 동시에 보이면 안 됨
      backButton: true,
    },
  },

  // 테마 설정
  theme: {
    // 라이트 모드만 (미니앱 요구사항)
    mode: 'light',
  },

  // 기능 설정
  features: {
    // 바텀시트 자동 띄우기 금지
    autoBottomSheet: false,

    // 제스처 확대/축소 비활성화
    gestureZoom: false,
  },
};

export default config;
