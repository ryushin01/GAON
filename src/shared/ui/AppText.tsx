import { Text, type TextProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { MONO_FONT, SANS_FONT } from '../config';

type Props = TextProps & {
  variant?: 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'caption' | 'label' | 'mono';
  tone?: 'default' | 'muted' | 'primary' | 'onStage' | 'onStageMuted' | 'danger' | 'signal';
};

export function AppText({ variant = 'body', tone = 'default', style, ...rest }: Props) {
  return <Text {...rest} style={[styles[variant], tones[tone], style]} />;
}

const styles = StyleSheet.create({
  /** 가늘고 촘촘한 큰 제목입니다. */
  display: { fontFamily: SANS_FONT, fontWeight: '300', fontSize: { xs: 40, md: 60 }, lineHeight: { xs: 46, md: 66 }, letterSpacing: { xs: -1.6, md: -3 } },
  title: { fontFamily: SANS_FONT, fontWeight: '300', fontSize: 30, lineHeight: 36, letterSpacing: -1.2 },
  heading: { fontFamily: SANS_FONT, fontWeight: '300', fontSize: 22, lineHeight: 28, letterSpacing: -0.6 },
  subheading: { fontFamily: SANS_FONT, fontSize: 15, lineHeight: 21, fontWeight: '500', letterSpacing: -0.2 },
  body: { fontFamily: SANS_FONT, fontSize: 15, lineHeight: 22, fontWeight: '300' },
  caption: { fontFamily: SANS_FONT, fontSize: 13, lineHeight: 18 },
  /** 관제 화면의 항목 이름처럼 고정폭으로 넓게 띄워 쓰는 작은 글자입니다. */
  label: { fontFamily: MONO_FONT, fontSize: 11, lineHeight: 16, fontWeight: '500', letterSpacing: 1.5, textTransform: 'uppercase' },
  /** 수치와 명령줄 글자입니다. */
  mono: { fontFamily: MONO_FONT, fontSize: 13, lineHeight: 18, letterSpacing: 0.4 },
});

const tones = StyleSheet.create((theme) => ({
  default: { color: theme.colors.text },
  muted: { color: theme.colors.textMuted },
  primary: { color: theme.colors.primary },
  onStage: { color: theme.colors.stage.text },
  onStageMuted: { color: theme.colors.stage.textMuted },
  danger: { color: theme.colors.danger },
  signal: { color: theme.colors.signal },
}));
