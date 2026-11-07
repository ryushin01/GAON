const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
const radius = { sm: 4, md: 8, lg: 12, pill: 999 } as const;

/** 플레이어처럼 테마와 상관없이 어두운 코발트로 고정하는 영역의 색입니다. */
const stage = {
  bg: '#06214F',
  surface: '#0D3372',
  text: '#FFFFFF',
  textMuted: '#C5D5F0',
  accent: '#9CC2FF',
} as const;

export const lightTheme = {
  name: 'light',
  colors: {
    bg: '#FFFFFF',
    surface: '#F3F6FC',
    surfaceStrong: '#E4EBF8',
    text: '#0B1B33',
    textMuted: '#4A5B75',
    border: '#D5DFEF',
    primary: '#0047AB',
    onPrimary: '#FFFFFF',
    primaryMuted: '#DCE8FB',
    rankUp: '#C62828',
    rankDown: '#0047AB',
    danger: '#B3261E',
    stage,
  },
  spacing,
  radius,
} as const;

export const darkTheme = {
  name: 'dark',
  colors: {
    bg: '#081223',
    surface: '#101D33',
    surfaceStrong: '#1A2B4A',
    text: '#EDF3FF',
    textMuted: '#A9B8D0',
    border: '#2A3C5E',
    primary: '#8AB6FF',
    onPrimary: '#06214F',
    primaryMuted: '#1A3160',
    rankUp: '#FF9A90',
    rankDown: '#8AB6FF',
    danger: '#FFB4AB',
    stage,
  },
  spacing,
  radius,
} as const;

export const breakpoints = { xs: 0, sm: 600, md: 900, lg: 1200 } as const;

/** 이 너비부터 사이드바와 하단 플레이어 바를 씁니다. */
export const WIDE_LAYOUT_MIN_WIDTH = breakpoints.md;

export type AppTheme = typeof lightTheme | typeof darkTheme;
