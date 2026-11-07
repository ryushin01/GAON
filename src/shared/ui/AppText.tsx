import { Text, type TextProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

type Props = TextProps & {
  variant?: 'title' | 'heading' | 'subheading' | 'body' | 'caption';
  tone?: 'default' | 'muted' | 'primary' | 'onStage' | 'onStageMuted' | 'danger';
};

export function AppText({ variant = 'body', tone = 'default', style, ...rest }: Props) {
  return <Text {...rest} style={[styles[variant], tones[tone], style]} />;
}

const styles = StyleSheet.create({
  title: { fontSize: 26, lineHeight: 34, fontWeight: '800' },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21 },
  caption: { fontSize: 13, lineHeight: 18 },
});

const tones = StyleSheet.create((theme) => ({
  default: { color: theme.colors.text },
  muted: { color: theme.colors.textMuted },
  primary: { color: theme.colors.primary },
  onStage: { color: theme.colors.stage.text },
  onStageMuted: { color: theme.colors.stage.textMuted },
  danger: { color: theme.colors.danger },
}));
