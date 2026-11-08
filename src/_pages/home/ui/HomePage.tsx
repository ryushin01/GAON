import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { chartTracks, useCatalog } from '@/entities/music';
import { playTracks, useCurrentTrack, usePlayerStore } from '@/features/player';
import { WIDE_LAYOUT_MIN_WIDTH } from '@/shared/config';
import { AppText, IconButton, Screen, StateView, useLiveReducedMotion, useNavSlot, VisuallyHidden } from '@/shared/ui';

import { DiscStage } from './DiscStage';
import { HomeIntro } from './HomeIntro';

/** 첫 화면에서 넘겨 보는 순위 수입니다. */
const STAGE_TRACKS = 12;

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
  const wide = width >= WIDE_LAYOUT_MIN_WIDTH;

  const navigation = useNavigation();
  const [intro, setIntro] = useState(() => !introPlayed && !reduced && !navigation.canGoBack());
  const finishIntro = useCallback(() => {
    introPlayed = true;
    setIntro(false);
  }, []);

  const setBooting = useNavSlot((s) => s.setBooting);
  // 카탈로그를 받지 못하면 인트로가 사라지므로 메뉴도 바로 보여 줍니다.
  useEffect(() => setBooting(intro && !isError), [intro, isError, setBooting]);

  const [active, setActive] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => setActive(false);
    }, []),
  );

  const [measured, setMeasured] = useState(0);
  const viewport = measured || height;

  const header = (
    <View style={styles.brand}>
      <View style={styles.brandText}>
        {/* 넓은 화면에서는 상단 메뉴에 로고와 설정이 있습니다. */}
        {!wide && <AppText variant="heading" style={styles.logo}>GAON</AppText>}
        <VisuallyHidden><AppText role="heading" aria-level={1}>Hi-Res FLAC 전용 스트리밍</AppText></VisuallyHidden>
      </View>
      {!wide && <IconButton icon="settings-outline" label="설정" onPress={() => router.push('/settings')} />}
    </View>
  );

  return (
    <Screen scroll={false} fullBleed>
      <View style={styles.fill} onLayout={(event) => setMeasured(event.nativeEvent.layout.height)}>
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
          <DiscStage
            tracks={stageTracks}
            viewport={viewport}
            active={active}
            playingId={playing ? current?.id : undefined}
            onPlay={(track) => void playTracks(top, track.id)}
            onOpen={(track) => router.push(`/track/${track.id}`)}
            header={header}
          />
        )}
      </View>
      {intro && !isError && <HomeIntro uri={stageTracks[0]?.artUri} ready={Boolean(catalog)} onDone={finishIntro} />}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  fill: { flex: 1, minHeight: 0 },
  brand: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.xs },
  brandText: { flex: 1, minWidth: 0 },
  logo: { letterSpacing: -0.4 },
}));
