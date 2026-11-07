import { useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { formatTime } from '@/shared/lib';
import { AppText, Slider } from '@/shared/ui';

import { seekTo } from '../model/engine';
import { usePlayerStore, useCurrentTrack } from '../model/playerStore';

export function SeekBar() {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const reported = usePlayerStore((s) => s.duration);
  const track = useCurrentTrack();
  const [preview, setPreview] = useState<number | null>(null);
  const duration = reported > 0 ? reported : (track?.durationSec ?? 0);
  const shown = preview ?? currentTime;

  return (
    <View>
      <Slider
        label="재생 위치"
        value={currentTime}
        max={duration}
        valueText={`${formatTime(shown)} / ${formatTime(duration)}`}
        onPreview={setPreview}
        onCommit={seekTo}
        disabled={!track}
      />
      <View style={styles.times}>
        <AppText variant="caption" tone="onStage">{formatTime(shown)}</AppText>
        <AppText variant="caption" tone="onStageMuted">{formatTime(duration)}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  times: { flexDirection: 'row', justifyContent: 'space-between' },
});
