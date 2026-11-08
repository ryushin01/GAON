import { Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { displayTitle, type Track } from '@/entities/music';

type Props = { tracks: Track[]; current: number; wide: boolean; onSelect: (index: number) => void; onClose: () => void };

/** 순위 목록을 펼친 패널입니다. 바깥을 누르거나 Esc를 누르면 닫습니다. */
export function TrackIndex({ tracks, current, wide, onSelect, onClose }: Props) {
  return (
    <>
      <Pressable accessible={false} focusable={false} aria-hidden onPress={onClose} style={styles.scrim} />
      <View aria-label="순위 목록" role="region" style={[styles.panel, wide ? styles.panelWide : styles.panelNarrow]}>
        <ScrollView style={styles.list}>
          {tracks.map((track, i) => {
            const selected = i === current;
            return (
              <Pressable key={track.id} role="button" aria-current={selected || undefined} onPress={() => onSelect(i)} style={[styles.row, selected && styles.rowSelected]}>
                <Text numberOfLines={1} style={[styles.title, selected && styles.textSelected]}>{displayTitle(track)}</Text>
                <Text style={[styles.year, selected && styles.textSelected]}>{track.released?.slice(0, 4)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 10, backgroundColor: 'rgba(10, 10, 10, 0.3)' },
  panel: { position: 'absolute', zIndex: 11, backgroundColor: theme.colors.panel, paddingBottom: theme.spacing.lg },
  panelWide: { top: 0, left: '50%', width: 560, marginLeft: -280, paddingTop: 64, paddingHorizontal: 72 },
  panelNarrow: { top: 0, left: 0, right: 0, paddingTop: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
  list: { maxHeight: 248 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.lg, minHeight: 44, paddingHorizontal: theme.spacing.xs },
  rowSelected: { backgroundColor: theme.colors.primary },
  title: { flexShrink: 1, color: theme.colors.text, fontSize: 15, letterSpacing: -0.3 },
  year: { color: theme.colors.textMuted, fontSize: 14 },
  textSelected: { color: theme.colors.onPrimary },
}));
