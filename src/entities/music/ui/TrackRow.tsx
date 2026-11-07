import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AlbumArt, AppText, VisuallyHidden } from '@/shared/ui';

import { artistLine, displayTitle } from '../model/format';
import type { Track } from '../model/types';
import { QualityBadge } from './QualityBadge';
import { RankChange } from './RankChange';

type Props = {
  track: Track;
  rank?: number;
  active?: boolean;
  onPress: () => void;
  /** 앞쪽 슬롯(선택 체크박스)과 뒤쪽 슬롯(좋아요, 더보기)입니다. */
  leading?: ReactNode;
  trailing?: ReactNode;
  showArt?: boolean;
  /** 부모가 role="list"일 때만 켭니다. */
  listItem?: boolean;
};

export function TrackRow({ track, rank, active = false, onPress, leading, trailing, showArt = true, listItem = false }: Props) {
  const title = displayTitle(track);
  const artists = artistLine(track);
  return (
    <View role={listItem ? 'listitem' : undefined} style={[styles.row, active && styles.rowActive]}>
      {leading}
      {rank != null && (
        <View style={styles.rankBox}>
          <AppText variant="subheading" style={styles.rank}>{rank}</AppText>
          <RankChange change={track.rankChange} isNew={track.isNew} />
        </View>
      )}
      <Pressable
        role="button"
        aria-current={active || undefined}
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        {showArt && <AlbumArt uri={track.artUri} size={52} />}
        <View style={styles.text}>
          <AppText variant="subheading" tone={active ? 'primary' : 'default'} numberOfLines={1}>{title}</AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>{artists} · {track.albumTitle}</AppText>
          <QualityBadge format={track.format} compact />
          <VisuallyHidden>재생</VisuallyHidden>
        </View>
      </Pressable>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 72, paddingHorizontal: theme.spacing.sm, gap: theme.spacing.xs },
  rowActive: { backgroundColor: theme.colors.primaryMuted },
  rankBox: { width: 34, alignItems: 'center' },
  rank: { textAlign: 'center' },
  main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.xs },
  text: { flex: 1, minWidth: 0, gap: 2 },
  pressed: { opacity: 0.6 },
}));
