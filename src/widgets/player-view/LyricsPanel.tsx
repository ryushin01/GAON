import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { LyricLine } from '@/entities/music';
import { usePlayerStore } from '@/features/player';
import { AppText } from '@/shared/ui';

export function activeLyricIndex(lines: LyricLine[], time: number): number {
  let active = -1;
  lines.forEach((line, i) => {
    if (line.t >= 0 && line.t <= time) active = i;
  });
  return active;
}

export function LyricsPanel({ lines }: { lines: LyricLine[] }) {
  const active = usePlayerStore((s) => activeLyricIndex(lines, s.currentTime));
  if (!lines.length) {
    return (
      <View style={styles.empty}>
        <AppText tone="onStageMuted">가사 정보가 없는 곡입니다.</AppText>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.content}>
      {lines.map((line, i) => (
        <AppText
          key={`${i}-${line.text}`}
          variant="subheading"
          tone={i === active ? 'onStage' : 'onStageMuted'}
          aria-current={i === active || undefined}
          style={[styles.line, i === active && styles.lineActive]}
        >
          {line.text}
        </AppText>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  content: { gap: theme.spacing.md, paddingVertical: theme.spacing.lg },
  line: { textAlign: 'center' },
  lineActive: { fontWeight: '800' },
}));
