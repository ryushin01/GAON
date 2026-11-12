import { useEffect, useRef, type ComponentRef } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { LyricLine } from '@/entities/music';
import { usePlayerStore } from '@/features/player';
import { AppText } from '@/shared/ui';

const LYRIC_TOP_MARGIN = 80;

export function activeLyricIndex(lines: LyricLine[], time: number): number {
  let active = -1;
  lines.forEach((line, i) => {
    if (line.t >= 0 && line.t <= time) active = i;
  });
  return active;
}

export function LyricsPanel({ lines }: { lines: LyricLine[] }) {
  const active = usePlayerStore((s) => activeLyricIndex(lines, s.currentTime));
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const offsets = useRef<number[]>([]);

  const scrollToLine = (y: number) => scroller.current?.scrollTo({ y: Math.max(0, y - LYRIC_TOP_MARGIN), animated: true });

  // 곡이 바뀌면 처음부터 보여 줍니다.
  useEffect(() => {
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, [lines]);

  // 지금 부르는 줄이 늘 보이도록 따라갑니다.
  useEffect(() => {
    const y = offsets.current[active];
    if (y != null) scroller.current?.scrollTo({ y: Math.max(0, y - LYRIC_TOP_MARGIN), animated: true });
  }, [active]);

  if (!lines.length) {
    return (
      <View style={styles.empty}>
        <AppText tone="onStageMuted">가사 정보가 없는 곡입니다.</AppText>
      </View>
    );
  }
  return (
    <ScrollView ref={scroller} contentContainerStyle={styles.content}>
      {lines.map((line, i) => (
        <AppText
          key={`${i}-${line.text}`}
          variant="subheading"
          tone={i === active ? 'onStage' : 'onStageMuted'}
          aria-current={i === active || undefined}
          onLayout={(e: LayoutChangeEvent) => {
            const { y } = e.nativeEvent.layout;
            offsets.current[i] = y;
            // 현재 줄의 위치가 뒤늦게 측정되면 그때 맞춥니다.
            if (i === active) scrollToLine(y);
          }}
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
  lineActive: { fontWeight: '700' },
}));
