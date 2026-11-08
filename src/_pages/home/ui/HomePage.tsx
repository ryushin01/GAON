import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedRef, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { AlbumCard, chartTracks, latestAlbums, TrackRow, useCatalog } from '@/entities/music';
import { playTracks, useCurrentTrack } from '@/features/player';
import { WIDE_LAYOUT_MIN_WIDTH } from '@/shared/config';
import { AppButton, AppText, IconButton, Rail, Screen, Section, StateView } from '@/shared/ui';
import { TrackActions } from '@/widgets/track-list';

import { DiscStage } from './DiscStage';

/** 첫 화면에서 스크롤로 넘겨 보는 순위 수입니다. */
const STAGE_TRACKS = 5;

export function HomePage() {
  const { data: catalog, isPending, isError, refetch } = useCatalog();
  const current = useCurrentTrack();
  const { width, height } = useWindowDimensions();
  const top = useMemo(() => (catalog ? chartTracks(catalog) : []), [catalog]);
  const albums = useMemo(() => (catalog ? latestAlbums(catalog).slice(0, 12) : []), [catalog]);
  const stageTracks = useMemo(() => top.slice(0, STAGE_TRACKS), [top]);
  const wide = width >= WIDE_LAYOUT_MIN_WIDTH;

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  const [measured, setMeasured] = useState(0);
  const viewport = measured || height;

  const header = (
    <View style={styles.brand}>
      <View style={styles.brandText}>
        {/* 넓은 화면에서는 상단 메뉴에 로고와 설정이 있습니다. */}
        {!wide && <AppText variant="heading" style={styles.logo}>GAON</AppText>}
        <AppText variant="label" tone="muted" role="heading" aria-level={1}>Hi-Res FLAC 전용 스트리밍</AppText>
      </View>
      {!wide && <IconButton icon="settings-outline" label="설정" onPress={() => router.push('/settings')} />}
    </View>
  );

  return (
    <Screen scroll={false} fullBleed>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(event) => setMeasured(event.nativeEvent.layout.height)}
      >
        {!catalog && header}
        {isPending && <StateView loading />}
        {isError && (
          <StateView
            title="카탈로그를 불러오지 못했습니다"
            description="인터넷 연결을 확인해 주세요. 보관함의 내 FLAC은 그대로 들을 수 있습니다."
            actionLabel="다시 시도"
            onAction={() => void refetch()}
          />
        )}

        {catalog && stageTracks.length > 0 && (
          <>
            <DiscStage
              tracks={stageTracks}
              scrollY={scrollY}
              viewport={viewport}
              scrollTo={(y) => scrollRef.current?.scrollTo({ y, animated: true })}
              onPlay={(track) => void playTracks([track])}
              header={header}
            />

            <View style={styles.rest}>
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
            </View>
          </>
        )}
      </Animated.ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  brand: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm },
  brandText: { flex: 1, minWidth: 0 },
  logo: { letterSpacing: -0.4 },
  rest: { width: '100%', maxWidth: 1100, alignSelf: 'center', paddingBottom: theme.spacing.xxl },
  more: { alignItems: 'center', paddingVertical: theme.spacing.md },
}));
