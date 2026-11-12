import { Platform } from 'react-native';

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
/** 관제 화면처럼 모서리를 굴리지 않습니다. 원형이 필요한 곳만 pill을 씁니다. */
const radius = { sm: 0, md: 0, lg: 0, pill: 999 } as const;

/**
 * 기본 글꼴입니다. 관제 화면처럼 가늘고 반듯한 운영체제 산세리프를 씁니다.
 * 한글 웹 글꼴을 따로 받지 않아 첫 화면이 빠릅니다. 앱은 운영체제 기본 글꼴을 씁니다.
 */
export const SANS_FONT = Platform.select({
  web: 'system-ui, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", "Segoe UI", sans-serif',
  default: undefined,
});

/** 라벨, 수치, 명령줄에 쓰는 고정폭 글꼴(Nanum Gothic Coding)입니다. */
export const MONO_FONT = Platform.select({
  web: 'GaonMono, ui-monospace, "SF Mono", Menlo, Consolas, D2Coding, monospace',
  default: 'GaonMono',
});

const lightColors = {
  bg: '#F4F4F5',
  panel: '#FFFFFF',
  surface: '#FAFAFA',
  surfaceStrong: '#E4E4E7',
  text: '#09090B',
  textMuted: '#52525B',
  /** 패널을 나누는 가는 선입니다. */
  border: '#D4D4D8',
  /** 입력칸과 버튼처럼 눌러야 하는 것의 테두리입니다. 바탕과 3:1 이상입니다. */
  rule: '#71717A',
  primary: '#09090B',
  onPrimary: '#FAFAFA',
  primaryMuted: '#E4E4E7',
  /** 준비됨, Hi-Res처럼 좋은 상태를 알리는 신호색입니다. */
  signal: '#03664A',
  /** 재생 중을 알리는 표시등 색입니다. */
  live: '#B91C1C',
  rankUp: '#B91C1C',
  rankDown: '#1D4ED8',
  danger: '#B91C1C',
  discRim: '#A9A8A3',
  discHub: 'rgba(150, 155, 165, 0.9)',
} as const;

const darkColors = {
  bg: '#09090B',
  panel: '#0F0F12',
  surface: '#141417',
  surfaceStrong: '#1F1F23',
  text: '#FAFAFA',
  textMuted: '#A1A1AA',
  border: '#27272A',
  rule: '#71717A',
  primary: '#FAFAFA',
  onPrimary: '#09090B',
  primaryMuted: '#1F1F23',
  signal: '#10B981',
  live: '#EF4444',
  rankUp: '#F87171',
  rankDown: '#60A5FA',
  danger: '#F87171',
  discRim: '#6E6D68',
  discHub: 'rgba(120, 124, 132, 0.9)',
} as const;

export const lightTheme = {
  name: 'light',
  colors: {
    ...lightColors,
    /** 플레이어와 하단 재생 바의 색입니다. 본문과 같은 바탕 위에 놓입니다. */
    stage: { bg: lightColors.bg, surface: lightColors.surfaceStrong, text: lightColors.text, textMuted: lightColors.textMuted, accent: lightColors.text },
  },
  spacing,
  radius,
} as const;

export const darkTheme = {
  name: 'dark',
  colors: {
    ...darkColors,
    stage: { bg: darkColors.bg, surface: darkColors.surfaceStrong, text: darkColors.text, textMuted: darkColors.textMuted, accent: darkColors.text },
  },
  spacing,
  radius,
} as const;

export const breakpoints = { xs: 0, sm: 600, md: 900, lg: 1200 } as const;

/** 이 너비부터 상단 메뉴와 하단 플레이어 바를 씁니다. */
export const WIDE_LAYOUT_MIN_WIDTH = breakpoints.md;

export type AppTheme = typeof lightTheme | typeof darkTheme;
