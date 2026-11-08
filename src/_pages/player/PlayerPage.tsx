import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { artistLine, displayTitle, QualityBadge } from '@/entities/music';
import { OutputBadge, SeekBar, TransportControls, useCurrentTrack, usePlayerStore } from '@/features/player';
import { LikeButton } from '@/features/toggle-like';
import { WIDE_LAYOUT_MIN_WIDTH } from '@/shared/config';
import { AppText, Disc, IconButton, useMainRegion } from '@/shared/ui';
import { LyricsPanel, QueuePanel } from '@/widgets/player-view';

type Panel = 'art' | 'lyrics' | 'queue';

/** 낮은 창에서도 조작 버튼이 보이도록 넓은 화면의 앨범 아트 크기를 창 높이에 맞춥니다. */
const WIDE_CONTROLS_HEIGHT = 380;
const MIN_WIDE_ART = 160;

export function PlayerPage() {
  const { theme } = useUnistyles();
  const { ref, nativeID } = useMainRegion();
  const { width, height } = useWindowDimensions();
  const track = useCurrentTrack();
  const playing = usePlayerStore((s) => s.playing);
  const [panel, setPanel] = useState<Panel>('art');
  const wide = width >= WIDE_LAYOUT_MIN_WIDTH;
  const { text, textMuted, accent } = theme.colors.stage;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // 마지막 곡을 지워 재생할 곡이 없어지면 플레이어를 닫습니다.
  useEffect(() => {
    if (!track) close();
  }, [track]);

  if (!track) return <View style={styles.root} />;

  const title = displayTitle(track);
  const art = <Disc uri={track.artUri} label={`${track.albumTitle} 앨범 아트`} spinning={playing} />;
  const artAndControls = (
    <View style={styles.column}>
      {/* 좁은 화면에서는 앨범 아트 자리에 가사와 재생 목록을 바꿔 가며 보여 줍니다. */}
      {(wide || panel === 'art') && (
        <View style={[styles.artFrame, wide && { maxWidth: Math.max(MIN_WIDE_ART, height - WIDE_CONTROLS_HEIGHT) }]}>
          {/* 넓은 화면은 가사가 늘 옆에 보여 누를 필요가 없습니다. */}
          {wide ? art : <Pressable role="button" aria-label="가사 보기" onPress={() => setPanel('lyrics')}>{art}</Pressable>}
        </View>
      )}
      {!wide && panel === 'lyrics' && (
        <Pressable accessible={false} style={styles.panel} onPress={() => setPanel('art')}>
          <LyricsPanel lines={track.lyrics} />
        </Pressable>
      )}
      {!wide && panel === 'queue' && <View style={styles.panel}><QueuePanel /></View>}

      <View style={styles.meta}>
        <View style={styles.metaText}>
          <AppText variant="title" tone="onStage" numberOfLines={2} role="heading" aria-level={1}>{title}</AppText>
          <AppText tone="onStageMuted" numberOfLines={1}>{artistLine(track)} · {track.albumTitle}</AppText>
          <QualityBadge format={track.format} onStage />
          <OutputBadge />
        </View>
        <LikeButton trackId={track.id} title={title} color={text} size={26} />
      </View>
      <SeekBar />
      <TransportControls />
      {!wide && (
        <View style={styles.tools}>
          <IconButton
            icon="reader-outline"
            label={panel === 'lyrics' ? '가사 닫기' : '가사 보기'}
            aria-pressed={panel === 'lyrics'}
            color={panel === 'lyrics' ? accent : textMuted}
            onPress={() => setPanel(panel === 'lyrics' ? 'art' : 'lyrics')}
          />
          <IconButton
            icon="list"
            label={panel === 'queue' ? '재생 목록 닫기' : '재생 목록 보기'}
            aria-pressed={panel === 'queue'}
            color={panel === 'queue' ? accent : textMuted}
            onPress={() => setPanel(panel === 'queue' ? 'art' : 'queue')}
          />
          {track.source === 'stream' || track.lyricists.length > 0 ? (
            <IconButton
              icon="information-circle-outline"
              label="곡 정보"
              color={textMuted}
              onPress={() => {
                close();
                router.push(`/track/${track.id}`);
              }}
            />
          ) : null}
        </View>
      )}
    </View>
  );

  return (
    <View ref={ref} role="main" nativeID={nativeID} tabIndex={-1} style={styles.root}>
      <View style={styles.header}>
        <IconButton icon="chevron-down" label="플레이어 닫기" color={text} onPress={close} />
      </View>
      {wide ? (
        <View style={styles.wide}>
          <ScrollView style={styles.wideLeft} contentContainerStyle={styles.wideLeftContent}>{artAndControls}</ScrollView>
          <View style={styles.wideRight}>
            <AppText variant="label" tone="onStage" role="heading" aria-level={2} style={styles.panelTitle}>가사</AppText>
            <View style={styles.flex}><LyricsPanel lines={track.lyrics} /></View>
            <AppText variant="label" tone="onStage" role="heading" aria-level={2} style={styles.panelTitle}>재생 목록</AppText>
            <View style={styles.flex}><QueuePanel /></View>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.narrow}>{artAndControls}</ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { flex: 1, backgroundColor: theme.colors.stage.bg, paddingTop: rt.insets.top, paddingBottom: rt.insets.bottom },
  header: { flexDirection: 'row', paddingHorizontal: theme.spacing.sm },
  flex: { flex: 1, minHeight: 0 },
  panelTitle: { paddingTop: theme.spacing.xs, borderTopWidth: 1, borderTopColor: theme.colors.rule },
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: theme.spacing.md },
  artFrame: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  panel: { height: 340 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  metaText: { flex: 1, minWidth: 0, gap: 4 },
  tools: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.xl },
  narrow: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.xl, paddingTop: 0 },
  wide: { flex: 1, minHeight: 0, flexDirection: 'row', gap: theme.spacing.xxl, padding: theme.spacing.xl, paddingTop: 0 },
  wideLeft: { flex: 1, minWidth: 0 },
  wideLeftContent: { flexGrow: 1, justifyContent: 'center' },
  wideRight: { flex: 1, minWidth: 0, gap: theme.spacing.sm },
}));
