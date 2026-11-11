import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { artistLine, displayTitle, QualityBadge } from '@/entities/music';
import { next, PlayPauseButton, useCurrentTrack, usePlayerStore } from '@/features/player';
import { AppText, Disc, IconButton, VisuallyHidden } from '@/shared/ui';

function Progress() {
  const percent = usePlayerStore((s) => (s.duration > 0 ? Math.min(100, (s.currentTime / s.duration) * 100) : 0));
  return (
    <View style={styles.progress} aria-hidden>
      <View style={[styles.progressFill, { width: `${percent}%` }]} />
    </View>
  );
}

/** 탭 위에 늘 떠 있는 미니 플레이어입니다. 넓은 화면에서는 하단 플레이어 바가 됩니다. */
export function NowPlayingBar() {
  const { theme } = useUnistyles();
  const track = useCurrentTrack();
  const error = usePlayerStore((s) => s.error);
  const index = usePlayerStore((s) => s.index);
  const count = usePlayerStore((s) => s.queue.length);
  const repeat = usePlayerStore((s) => s.repeat);
  const playing = usePlayerStore((s) => s.playing);

  if (!track) {
    return error ? <AppText tone="danger" role="alert" style={styles.error}>{error}</AppText> : null;
  }
  const title = displayTitle(track);
  const artists = artistLine(track);
  const { text } = theme.colors.stage;

  return (
    <View style={styles.root} role="region" aria-label="지금 재생 중">
      <Progress />
      <View style={styles.row}>
        <Pressable
          role="button"
          onPress={() => router.push('/player')}
          style={styles.info}
        >
          <Disc uri={track.discUri ?? track.artUri} size={44} spinning={playing} />
          <View style={styles.text}>
            <AppText variant="subheading" tone="onStage" numberOfLines={1}>{title}</AppText>
            <View style={styles.sub}>
              <AppText variant="caption" tone="onStageMuted" numberOfLines={1} style={styles.artist}>{artists}</AppText>
              <QualityBadge format={track.format} onStage compact />
            </View>
            <VisuallyHidden>플레이어 열기</VisuallyHidden>
          </View>
        </Pressable>
        <PlayPauseButton color={text} />
        <IconButton icon="play-skip-forward" label="다음 곡" color={text} disabled={repeat === 'off' && index >= count - 1} onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { backgroundColor: theme.colors.stage.bg },
  error: { padding: theme.spacing.md },
  progress: { height: 2, backgroundColor: theme.colors.border },
  progressFill: { height: '100%', backgroundColor: theme.colors.stage.accent },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: theme.spacing.sm },
  info: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 44 },
  text: { flex: 1, minWidth: 0 },
  sub: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  artist: { flexShrink: 1 },
}));
