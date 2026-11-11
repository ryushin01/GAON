import { Text, type TextProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { DISPLAY_FONT, SERIF_FONT } from '../config';

type Props = TextProps & {
  variant?: 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'caption' | 'label';
  tone?: 'default' | 'muted' | 'primary' | 'onStage' | 'onStageMuted' | 'danger';
};

export function AppText({ variant = 'body', tone = 'default', style, ...rest }: Props) {
  return <Text {...rest} style={[styles[variant], tones[tone], style]} />;
}

const styles = StyleSheet.create({
  display: {
    fontFamily: DISPLAY_FONT,
    fontWeight: '400',
    fontSize: { xs: 40, md: 64 },
    lineHeight: { xs: 48, md: 74 },
    letterSpacing: { xs: -1, md: -2 },
    textTransform: 'uppercase',
  },
  title: { fontFamily: DISPLAY_FONT, fontWeight: '400', fontSize: 32, lineHeight: 40, letterSpacing: -0.6 },
  heading: { fontFamily: DISPLAY_FONT, fontWeight: '400', fontSize: 24, lineHeight: 32, letterSpacing: -0.4 },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontFamily: SERIF_FONT, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: SERIF_FONT, fontSize: 13, lineHeight: 18 },
  /** 표의 항목 이름처럼 작게 띄워 쓰는 글자입니다. */
  label: { fontSize: 12, lineHeight: 17, fontWeight: '500', letterSpacing: 1.2, textTransform: 'uppercase' },
});

const tones = StyleSheet.create((theme) => ({
  default: { color: theme.colors.text },
  muted: { color: theme.colors.textMuted },
  primary: { color: theme.colors.primary },
  onStage: { color: theme.colors.stage.text },
  onStageMuted: { color: theme.colors.stage.textMuted },
  danger: { color: theme.colors.danger },
}));
