import { router } from 'expo-router';
import { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AlbumCard, chartTracks, displayTitle, formatQuality, latestAlbums, TrackRow, useCatalog } from '@/entities/music';
import { playTracks, useCurrentTrack } from '@/features/player';
import { SERIF_FONT, WIDE_LAYOUT_MIN_WIDTH } from '@/shared/config';
import { formatDate } from '@/shared/lib';
import { AppButton, AppText, Disc, IconButton, MetaRow, Rail, Screen, Section, StateView } from '@/shared/ui';
import { TrackActions } from '@/widgets/track-list';

export function HomePage() {
  const { data: catalog, isPending, isError, refetch } = useCatalog();
  const current = useCurrentTrack();
  const { width, height } = useWindowDimensions();
  const top = useMemo(() => (catalog ? chartTracks(catalog) : []), [catalog]);
  const albums = useMemo(() => (catalog ? latestAlbums(catalog).slice(0, 12) : []), [catalog]);
  const wide = width >= WIDE_LAYOUT_MIN_WIDTH;
  const featured = top[0];

  // 메뉴와 듣기 버튼을 뺀 첫 화면 높이 안에 디스크가 들어오게 합니다.
  const discSize = wide ? Math.max(280, Math.min(460, height - 300)) : Math.min(320, width - 72);

  return (
    <Screen>
      <View style={styles.brand}>
        <View style={styles.brandText}>
          {/* 넓은 화면에서는 상단 메뉴에 로고와 설정이 있습니다. */}
          {!wide && <AppText variant="heading" style={styles.logo}>GAON</AppText>}
          <AppText variant="label" tone="muted" role="heading" aria-level={1}>Hi-Res FLAC 전용 스트리밍</AppText>
        </View>
        {!wide && <IconButton icon="settings-outline" label="설정" onPress={() => router.push('/settings')} />}
      </View>

      {isPending && <StateView loading />}
      {isError && (
        <StateView
          title="카탈로그를 불러오지 못했습니다"
          description="인터넷 연결을 확인해 주세요. 보관함의 내 FLAC은 그대로 들을 수 있습니다."
          actionLabel="다시 시도"
          onAction={() => void refetch()}
        />
      )}

      {catalog && featured && (
        <>
          <View style={[styles.hero, wide && styles.heroWide]}>
            <View style={wide && styles.heroInfoWide}>
              <AppText variant={wide ? 'title' : 'display'} role="heading" aria-level={2} numberOfLines={3} style={[styles.heroTitle, !wide && styles.centered]}>
                {displayTitle(featured)}
              </AppText>
              <MetaRow label="가수">{featured.artists.join(', ')}</MetaRow>
              <MetaRow label="발매일">{formatDate(featured.released)}</MetaRow>
              <MetaRow label="음질">{formatQuality(featured.format)}</MetaRow>
            </View>
            <View style={[styles.heroDisc, wide && styles.heroDiscWide]}>
              <Disc uri={featured.artUri} size={discSize} tilted />
            </View>
            {wide ? (
              <View style={styles.heroRank}>
                <AppText style={styles.rankNumber} aria-hidden>1</AppText>
                <AppText variant="label">오늘의 1위</AppText>
              </View>
            ) : (
              <AppText variant="label" style={styles.centered}>오늘의 1위</AppText>
            )}
          </View>

          <View style={styles.listen}>
            <AppButton variant="rule" label="듣기" aria-label={`${displayTitle(featured)} 듣기`} onPress={() => void playTracks([featured])} />
          </View>

          <Section title="최신 앨범">
            <Rail>
              {albums.map((album) => (
                <AlbumCard key={album.id} album={album} onPress={() => router.push(`/album/${album.id}`)} />
              ))}
            </Rail>
          </Section>

          <Section title="TOP 100" actionLabel="전체 보기" actionHint="TOP 100 전체 보기" onAction={() => router.navigate('/chart')}>
            <View role="list">
              {top.slice(0, 5).map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  listItem
                  rank={track.rank ?? undefined}
                  active={current?.id === track.id}
                  onPress={() => void playTracks(top, track.id)}
                  trailing={<TrackActions track={track} />}
                />
              ))}
            </View>
            <View style={styles.more}>
              <AppButton variant="secondary" label="TOP 100 전체 재생" icon="play" onPress={() => void playTracks(top)} />
            </View>
          </Section>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  brand: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm },
  brandText: { flex: 1, minWidth: 0 },
  logo: { letterSpacing: -0.4 },
  // 읽는 순서는 제목이 먼저이고, 좁은 화면에서는 디스크를 위에 보여 줍니다.
  hero: { flexDirection: 'column-reverse', paddingHorizontal: theme.spacing.lg, gap: theme.spacing.lg },
  heroWide: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xl },
  heroInfoWide: { width: 280, flexShrink: 0 },
  heroTitle: { paddingBottom: theme.spacing.sm },
  centered: { textAlign: 'center' },
  heroDisc: { alignItems: 'center', justifyContent: 'center' },
  heroDiscWide: { flex: 1, minWidth: 0 },
  heroRank: { width: 120, flexShrink: 0, alignItems: 'flex-end', gap: theme.spacing.xs },
  rankNumber: { fontFamily: SERIF_FONT, fontSize: 96, lineHeight: 108, letterSpacing: -3, color: theme.colors.text },
  listen: { alignItems: 'center', marginTop: theme.spacing.xl },
  more: { alignItems: 'center', paddingVertical: theme.spacing.md },
}));
