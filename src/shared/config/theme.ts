import { Platform } from 'react-native';

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
/** 종이에 인쇄한 느낌을 내려고 모서리를 굴리지 않습니다. 원형 버튼만 pill을 씁니다. */
const radius = { sm: 0, md: 0, lg: 0, pill: 999 } as const;

/**
 * 제목 글꼴입니다. 가늘고 섬세한 Diphylleia(한글)에, 웹은 숫자가 아름다운 Cormorant(영문·숫자)를 앞에 둡니다.
 * 앱은 글꼴을 이어 쓸 수 없어 라틴 문자까지 든 Diphylleia 한 벌을 씁니다.
 */
export const DISPLAY_FONT = Platform.select({
  // 대체 글꼴: 섬세한 명조 분위기를 잇도록 영문은 운영체제 올드스타일 세리프(Baskerville, Garamond), 한글은 운영체제 명조
  web: 'Cormorant, Diphylleia, GaonSerif, Baskerville, Garamond, AppleMyungjo, "Noto Serif CJK KR", Batang, serif',
  default: 'Diphylleia',
});

/** 본문 세리프입니다. Nanum Myeongjo 한 벌에 라틴 문자와 한글이 함께 있습니다. */
export const SERIF_FONT = Platform.select({
  web: 'GaonSerif, AppleMyungjo, "Noto Serif CJK KR", Batang, Baskerville, serif',
  default: 'GaonSerif',
});

/** 비트·샘플레이트 같은 음질 수치를 기기 표시창처럼 보여 주는 고정폭 글꼴(Nanum Gothic Coding)입니다. */
export const MONO_FONT = Platform.select({
  web: 'GaonMono, ui-monospace, "SF Mono", Menlo, Consolas, D2Coding, monospace',
  default: 'GaonMono',
});

const lightColors = {
  bg: '#F2F2F0',
  panel: '#FFFFFF',
  surface: '#E9E8E4',
  surfaceStrong: '#DDDBD6',
  text: '#0A0A0A',
  textMuted: '#55534E',
  border: '#BDBBB5',
  /** 표와 구역을 나누는 먹선입니다. */
  rule: '#0A0A0A',
  primary: '#0A0A0A',
  onPrimary: '#F2F2F0',
  primaryMuted: '#E0DED9',
  rankUp: '#C62828',
  rankDown: '#0047AB',
  danger: '#B3261E',
  discRim: '#A9A8A3',
  discHub: 'rgba(150, 155, 165, 0.9)',
} as const;

const darkColors = {
  bg: '#0C0C0B',
  panel: '#181816',
  surface: '#181816',
  surfaceStrong: '#262521',
  text: '#EFEEE9',
  textMuted: '#ABA9A3',
  border: '#46443F',
  rule: '#EFEEE9',
  primary: '#EFEEE9',
  onPrimary: '#0C0C0B',
  primaryMuted: '#262521',
  rankUp: '#FF9A90',
  rankDown: '#8AB6FF',
  danger: '#FFB4AB',
  discRim: '#6E6D68',
  discHub: 'rgba(120, 124, 132, 0.9)',
} as const;

export const lightTheme = {
  name: 'light',
  colors: {
    ...lightColors,
    /** 플레이어와 하단 재생 바의 색입니다. 본문과 같은 종이 위에 놓입니다. */
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
