import { router, useFocusEffect, useNavigation } from 'expo-router';
import type { ComponentRef } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AlbumCard, chartTracks, latestAlbums, TrackRow, useCatalog } from '@/entities/music';
import { playTracks, useCurrentTrack, usePlayerStore } from '@/features/player';
import { WIDE_LAYOUT_MIN_WIDTH } from '@/shared/config';
import { useFirstImage } from '@/shared/lib';
import { AppButton, AppText, IconButton, Rail, Screen, Section, StateView, useLiveReducedMotion, useNavSlot, VisuallyHidden } from '@/shared/ui';
import { TrackActions } from '@/widgets/track-list';

import { CatalogStats } from './CatalogStats';
import { DiscStage } from './DiscStage';
import { HomeIntro } from './HomeIntro';

/** 첫 디스크가 오지 않아도 이 시간이 지나면 아래 구역의 이미지를 받습니다. */
const FIRST_IMAGE_WAIT_MS = 4000;

/** 첫 화면에서 넘겨 보는 순위 수입니다. */
const STAGE_TRACKS = 12;
/** 페이지 스크롤이 멈춘 뒤 이만큼 지나야 휠이 다시 디스크를 넘깁니다. 관성 스크롤이 디스크로 넘어가지 않게 합니다. */
const SCROLL_SETTLE_MS = 250;

/** 앱을 켜고 홈으로 바로 들어왔을 때 한 번만 보여 줍니다. */
let introPlayed = false;

export function HomePage() {
  const { data: catalog, isPending, isError, refetch } = useCatalog();
  const current = useCurrentTrack();
  const playing = usePlayerStore((s) => s.playing);
  const { width, height } = useWindowDimensions();
  const reduced = useLiveReducedMotion();
  const top = useMemo(() => (catalog ? chartTracks(catalog) : []), [catalog]);
  const stageTracks = useMemo(() => top.slice(0, STAGE_TRACKS), [top]);
  const albums = useMemo(() => (catalog ? latestAlbums(catalog).slice(0, 12) : []), [catalog]);
  const wide = width >= WIDE_LAYOUT_MIN_WIDTH;
  // 아래 구역의 이미지는 첫 디스크를 먼저 받은 뒤에 받습니다.
  const firstImageReady = useFirstImage(FIRST_IMAGE_WAIT_MS);

  const navigation = useNavigation();
  const [intro, setIntro] = useState(() => !introPlayed && !reduced && !navigation.canGoBack());
  const finishIntro = useCallback(() => {
    introPlayed = true;
    setIntro(false);
  }, []);

  const setBooting = useNavSlot((s) => s.setBooting);
  // 카탈로그를 받지 못하면 인트로를 끝냅니다. 다시 시도하는 동안에도 메뉴를 쓸 수 있어야 합니다.
  if (isError && intro) setIntro(false);
  useEffect(() => setBooting(intro), [intro, setBooting]);

  const [active, setActive] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => setActive(false);
    }, []),
  );

  const [measured, setMeasured] = useState(0);
  const viewport = measured || height;

  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const moreRef = useRef<ComponentRef<typeof View>>(null);
  const pageY = useRef(0);
  /** 아래 구역의 실제 위치입니다. 낮은 창에서는 무대 높이가 화면 높이와 다릅니다. */
  const moreY = useRef(0);
  const scrolledAt = useRef(0);
  const canCapture = useCallback(() => pageY.current < 4 && Date.now() - scrolledAt.current > SCROLL_SETTLE_MS, []);
  const showMore = useCallback(() => {
    scrollRef.current?.scrollTo({ y: moreY.current, animated: !reduced });
    // 키보드 사용자도 이어서 읽도록 초점을 옮깁니다. 초점 이동이 스크롤을 다시 옮기지 않게 합니다.
    (moreRef.current as unknown as HTMLElement | null)?.focus?.({ preventScroll: true });
  }, [reduced]);

  const header = (
    <View style={styles.brand}>
      <View style={styles.brandText}>
        {/* 넓은 화면에서는 상단 메뉴에 로고와 설정이 있습니다. */}
        {!wide && (
          <View style={styles.logoRow}>
            <View aria-hidden style={styles.logoMark} />
            <AppText variant="label" style={styles.logo}>GAON</AppText>
          </View>
        )}
        <VisuallyHidden><AppText role="heading" aria-level={1}>Hi-Res FLAC 전용 스트리밍</AppText></VisuallyHidden>
      </View>
      {!wide && <IconButton icon="settings-outline" label="설정" onPress={() => router.push('/settings')} />}
    </View>
  );

  return (
    <Screen scroll={false} fullBleed>
      <ScrollView
        ref={scrollRef}
        style={styles.fill}
        scrollEventThrottle={16}
        onScroll={(event) => {
          pageY.current = event.nativeEvent.contentOffset.y;
          scrolledAt.current = Date.now();
        }}
        onLayout={(event) => setMeasured(event.nativeEvent.layout.height)}
      >
        {!catalog && header}
        {isPending && !intro && <StateView loading />}
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
              viewport={viewport}
              active={active}
              playingId={playing ? current?.id : undefined}
              onPlay={(track) => void playTracks(top, track.id)}
              onOpen={(track) => router.push(`/track/${track.id}`)}
              header={header}
              canCapture={canCapture}
              onMore={showMore}
            />

            <View ref={moreRef} tabIndex={-1} style={styles.rest} onLayout={(event) => (moreY.current = event.nativeEvent.layout.y)}>
              <Section eyebrow="01 / LATEST" title="최신 앨범">
                <Rail>
                  {albums.map((album) => (
                    <AlbumCard key={album.id} album={album} artReady={firstImageReady} onPress={() => router.push(`/album/${album.id}`)} />
                  ))}
                </Rail>
              </Section>

              <Section eyebrow="02 / CHART" title="TOP 100" actionLabel="전체 보기" actionHint="TOP 100 전체 보기" onAction={() => router.navigate('/chart')}>
                <View role="list">
                  {top.slice(0, 5).map((track) => (
                    <TrackRow
                      artReady={firstImageReady}
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
                <View style={styles.playAll}>
                  <AppButton variant="command" hint="Command Input" label="TOP 100 전체 재생" onPress={() => void playTracks(top)} />
                </View>
              </Section>

              <Section eyebrow="03 / STATUS" title="카탈로그 현황">
                <CatalogStats catalog={catalog} />
              </Section>
            </View>
          </>
        )}
        {/* 순위 곡이 없어도 카탈로그 현황은 보여 줍니다. */}
        {catalog && stageTracks.length === 0 && (
          <View style={styles.rest}>
            <Section eyebrow="STATUS" title="카탈로그 현황">
              <CatalogStats catalog={catalog} />
            </Section>
          </View>
        )}
      </ScrollView>
      {intro && <HomeIntro uri={stageTracks[0]?.discUri ?? stageTracks[0]?.artUri} ready={Boolean(catalog)} onDone={finishIntro} />}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  fill: { flex: 1, minHeight: 0 },
  brand: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.xs },
  brandText: { flex: 1, minWidth: 0 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  logoMark: { width: 8, height: 8, backgroundColor: theme.colors.text },
  logo: { fontWeight: '700', letterSpacing: 3 },
  rest: { width: '100%', maxWidth: 1100, alignSelf: 'center', paddingBottom: theme.spacing.xxl },
  playAll: { alignItems: 'stretch', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
}));
