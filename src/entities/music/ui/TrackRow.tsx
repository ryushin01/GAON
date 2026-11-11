import type { ReactNode } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { WIDE_LAYOUT_MIN_WIDTH } from '@/shared/config';
import { AlbumArt, AppText, Icon, VisuallyHidden } from '@/shared/ui';

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
  /** false면 이미지를 아직 받지 않습니다. 첫 화면의 중요한 이미지를 먼저 받을 때 씁니다. */
  artReady?: boolean;
  /** 부모가 role="list"일 때만 켭니다. */
  listItem?: boolean;
};

export function TrackRow({ track, rank, active = false, onPress, leading, trailing, showArt = true, listItem = false, artReady = true }: Props) {
  const { theme } = useUnistyles();
  const { width } = useWindowDimensions();
  const title = displayTitle(track);
  const artists = artistLine(track);
  return (
    <View role={listItem ? 'listitem' : undefined} style={[styles.row, active && styles.rowActive]}>
      {leading}
      {rank != null && (
        <View style={styles.rankBox}>
          <AppText variant="heading" style={styles.rank}>{rank}</AppText>
          <RankChange change={track.rankChange} isNew={track.isNew} />
        </View>
      )}
      <Pressable
        role="button"
        aria-current={active || undefined}
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        {showArt && <AlbumArt uri={artReady ? track.artUri : undefined} size={width < WIDE_LAYOUT_MIN_WIDTH ? 44 : 52} />}
        <View style={styles.text}>
          <View style={styles.titleRow}>
            {/* 색만으로 구분하지 않도록 재생 중 표시를 함께 보여 줍니다. */}
            {active && <Icon aria-hidden name="volume-high" size={16} color={theme.colors.primary} />}
            <AppText variant="subheading" tone={active ? 'primary' : 'default'} numberOfLines={1} style={styles.title}>{title}</AppText>
          </View>
          <AppText variant="caption" tone="muted" numberOfLines={1}>{artists} · {track.albumTitle}</AppText>
          <QualityBadge format={track.format} compact raised={active} />
          <VisuallyHidden>재생</VisuallyHidden>
        </View>
      </Pressable>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 72, marginHorizontal: theme.spacing.lg, gap: theme.spacing.xs, borderBottomWidth: 1, borderBottomColor: theme.colors.rule },
  rowActive: { backgroundColor: theme.colors.primaryMuted },
  rankBox: { width: { xs: 34, md: 44 }, alignItems: 'center' },
  // 좁은 칸에서도 세 자리 순위가 넘치지 않게 합니다.
  rank: { textAlign: 'center', fontSize: { xs: 20, md: 24 } },
  main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: { xs: theme.spacing.sm, md: theme.spacing.md }, paddingVertical: theme.spacing.sm, paddingHorizontal: { xs: 0, md: theme.spacing.xs } },
  text: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  title: { flexShrink: 1 },
  pressed: { opacity: 0.6 },
}));
