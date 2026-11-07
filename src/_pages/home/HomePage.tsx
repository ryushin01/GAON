import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AlbumCard, chartTracks, displayTitle, formatQuality, latestAlbums, TrackRow, useCatalog } from '@/entities/music';
import { playTracks, useCurrentTrack } from '@/features/player';
import { WIDE_LAYOUT_MIN_WIDTH } from '@/shared/config';
import { formatDate } from '@/shared/lib';
import { AlbumArt, AppButton, AppText, Screen, Section, StateView } from '@/shared/ui';
import { TrackActions } from '@/widgets/track-list';

export function HomePage() {
  const { data: catalog, isPending, isError, refetch } = useCatalog();
  const current = useCurrentTrack();
  const { width } = useWindowDimensions();
  const top = useMemo(() => (catalog ? chartTracks(catalog) : []), [catalog]);
  const albums = useMemo(() => (catalog ? latestAlbums(catalog).slice(0, 12) : []), [catalog]);

  return (
    <Screen>
      <View style={styles.brand}>
        {/* 넓은 화면에서는 사이드바에 로고가 있습니다. */}
        {width < WIDE_LAYOUT_MIN_WIDTH && <AppText variant="title" tone="primary" style={styles.logo}>GAON</AppText>}
        <AppText variant="caption" tone="muted" role="heading" aria-level={1}>Hi-Res FLAC 전용 스트리밍</AppText>
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

      {catalog && top[0] && (
        <>
          <View style={styles.hero}>
            <View style={styles.heroArt}>
              <AlbumArt uri={top[0].artUri} />
            </View>
            <View style={styles.heroText}>
              <AppText variant="caption" tone="onStageMuted">오늘의 1위</AppText>
              <AppText variant="heading" tone="onStage" numberOfLines={2}>{displayTitle(top[0])}</AppText>
              <AppText tone="onStageMuted" numberOfLines={1}>{top[0].artists.join(', ')} · {formatDate(top[0].released)}</AppText>
              <AppText variant="caption" tone="onStageMuted">{formatQuality(top[0].format)}</AppText>
              <Pressable
                role="button"
                aria-label={`${displayTitle(top[0])} 듣기`}
                onPress={() => void playTracks([top[0]])}
                style={styles.heroButton}
              >
                <AppText variant="subheading" style={styles.heroButtonLabel}>듣기</AppText>
              </Pressable>
            </View>
          </View>

          <Section title="최신 앨범">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.albums}>
              {albums.map((album) => (
                <AlbumCard key={album.id} album={album} onPress={() => router.push(`/album/${album.id}`)} />
              ))}
            </ScrollView>
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
              <AppButton label="TOP 100 전체 재생" icon="play" onPress={() => void playTracks(top)} />
            </View>
          </Section>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  brand: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  logo: { letterSpacing: 2, fontWeight: '900' },
  hero: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.stage.bg,
  },
  heroArt: { width: 128, flexShrink: 0 },
  heroText: { flex: 1, minWidth: 0, gap: 2, justifyContent: 'center' },
  heroButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    minWidth: 72,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.stage.text,
  },
  heroButtonLabel: { color: theme.colors.stage.bg },
  albums: { gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg },
  more: { alignItems: 'center', paddingVertical: theme.spacing.md },
}));
