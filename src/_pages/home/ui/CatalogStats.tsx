import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { formatQuality, genresOf, isHiRes, type Catalog } from '@/entities/music';
import { AppText, Panel, SegmentMeter } from '@/shared/ui';

/** 카탈로그의 규모와 음질을 관제 화면의 수치판처럼 보여 줍니다. */
export function CatalogStats({ catalog }: { catalog: Catalog }) {
  const { theme } = useUnistyles();
  const { tracks } = catalog;
  const hiRes = tracks.filter((track) => isHiRes(track.format)).length;
  const share = tracks.length ? hiRes / tracks.length : 0;
  const best = tracks.reduce<Catalog['tracks'][number] | undefined>(
    (top, track) => (!top || track.format.sampleRate * track.format.bitDepth > top.format.sampleRate * top.format.bitDepth ? track : top),
    undefined,
  );
  const cards = [
    { label: '곡', value: tracks.length.toLocaleString('ko-KR') },
    { label: '앨범', value: catalog.albums.length.toLocaleString('ko-KR') },
    { label: '가수', value: catalog.artists.length.toLocaleString('ko-KR') },
    { label: '장르', value: genresOf(tracks).length.toLocaleString('ko-KR') },
  ];

  return (
    <Panel style={styles.panel}>
      <View style={styles.meterHead}>
        <AppText variant="label" tone="muted">Hi-Res 비율</AppText>
        <AppText variant="mono" style={styles.big}>{`${Math.round(share * 100)}%`}</AppText>
      </View>
      <SegmentMeter value={share} color={theme.colors.signal} />
      {best && (
        <View style={styles.meterHead}>
          <AppText variant="label" tone="muted">최고 음질</AppText>
          <AppText variant="mono">{formatQuality(best.format)}</AppText>
        </View>
      )}
      <View role="list" style={styles.grid}>
        {cards.map((card) => (
          <View role="listitem" key={card.label} style={styles.card}>
            <AppText variant="label" tone="muted">{card.label}</AppText>
            <AppText variant="heading" style={styles.value}>{card.value}</AppText>
          </View>
        ))}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create((theme) => ({
  panel: { marginHorizontal: theme.spacing.lg, padding: { xs: theme.spacing.lg, md: theme.spacing.xl }, gap: theme.spacing.md },
  meterHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: theme.spacing.md },
  big: { fontSize: { xs: 22, md: 28 }, lineHeight: { xs: 28, md: 34 } },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  card: { flexGrow: 1, flexBasis: { xs: '45%', md: '22%' }, gap: 4, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.bg },
  value: { fontVariant: ['tabular-nums'] },
}));
