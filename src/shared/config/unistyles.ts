import { StyleSheet } from 'react-native-unistyles';

import { breakpoints, darkTheme, lightTheme } from './theme';

type AppThemes = { light: typeof lightTheme; dark: typeof darkTheme };
type AppBreakpoints = typeof breakpoints;

declare module 'react-native-unistyles' {
  /* eslint-disable @typescript-eslint/no-empty-object-type -- 모듈 확장은 interface로만 할 수 있습니다. */
  export interface UnistylesThemes extends AppThemes {}
  export interface UnistylesBreakpoints extends AppBreakpoints {}
  /* eslint-enable @typescript-eslint/no-empty-object-type */
}

StyleSheet.configure({
  themes: { light: lightTheme, dark: darkTheme },
  breakpoints,
  settings: { adaptiveThemes: true },
});
