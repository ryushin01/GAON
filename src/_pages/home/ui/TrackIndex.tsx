import { Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { displayTitle, type Track } from '@/entities/music';
import { MONO_FONT, SANS_FONT } from '@/shared/config';
import { Corners } from '@/shared/ui';

type Props = { tracks: Track[]; current: number; wide: boolean; onSelect: (index: number) => void; onClose: () => void };

/** 순위 목록을 펼친 패널입니다. 바깥을 누르거나 Esc를 누르면 닫습니다. */
export function TrackIndex({ tracks, current, wide, onSelect, onClose }: Props) {
  return (
    <>
      <Pressable accessible={false} focusable={false} aria-hidden onPress={onClose} style={styles.scrim} />
      <View aria-label="순위 목록" role="region" style={[styles.panel, wide ? styles.panelWide : styles.panelNarrow]}>
        <Corners />
        <ScrollView style={styles.list}>
          {tracks.map((track, i) => {
            const selected = i === current;
            return (
              <Pressable key={track.id} role="button" aria-current={selected || undefined} onPress={() => onSelect(i)} style={[styles.row, selected && styles.rowSelected]}>
                <Text aria-hidden style={[styles.rank, selected && styles.textSelected]}>{String(i + 1).padStart(2, '0')}</Text>
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
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 10, backgroundColor: 'rgba(9, 9, 11, 0.5)' },
  panel: { position: 'absolute', zIndex: 11, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, paddingBottom: theme.spacing.md },
  panelWide: { top: theme.spacing.lg, left: '50%', width: 520, marginLeft: -260, paddingTop: theme.spacing.md, paddingHorizontal: theme.spacing.md },
  panelNarrow: { top: 0, left: theme.spacing.sm, right: theme.spacing.sm, paddingTop: theme.spacing.sm, paddingHorizontal: theme.spacing.sm },
  list: { maxHeight: 264 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 44, paddingHorizontal: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowSelected: { backgroundColor: theme.colors.primary },
  rank: { color: theme.colors.textMuted, fontFamily: MONO_FONT, fontSize: 12, letterSpacing: 0.6 },
  title: { flex: 1, color: theme.colors.text, fontFamily: SANS_FONT, fontSize: 15, letterSpacing: -0.3 },
  year: { color: theme.colors.textMuted, fontFamily: MONO_FONT, fontSize: 12 },
  textSelected: { color: theme.colors.onPrimary },
}));
