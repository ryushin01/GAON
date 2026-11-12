import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

type Props = { tone?: 'live' | 'signal' | 'idle' };

/** 상태를 알리는 작은 표시등입니다. 색만으로 구분하지 않도록 늘 글자와 함께 씁니다. */
export function StatusDot({ tone = 'idle' }: Props) {
  return <View aria-hidden style={[styles.dot, styles[tone]]} />;
}

const styles = StyleSheet.create((theme) => ({
  dot: { width: 6, height: 6, borderRadius: theme.radius.pill },
  live: { backgroundColor: theme.colors.live, boxShadow: `0 0 8px ${theme.colors.live}` },
  signal: { backgroundColor: theme.colors.signal, boxShadow: `0 0 8px ${theme.colors.signal}` },
  idle: { backgroundColor: theme.colors.textMuted },
}));
