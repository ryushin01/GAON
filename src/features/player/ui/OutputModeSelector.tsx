import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AppText, Chip } from '@/shared/ui';

import { setExclusiveOutput } from '../model/engine';
import { getAudioBridge } from '../model/nativePlaylist';
import { usePlayerStore } from '../model/playerStore';

/** 독점 출력은 재생기가 들어 있는 PC 앱에서만 고를 수 있습니다. */
export function OutputModeSelector() {
  const exclusive = usePlayerStore((s) => s.exclusive);
  if (!getAudioBridge()) return null;
  return (
    <View style={styles.root}>
      <View role="group" aria-label="오디오 출력" style={styles.row}>
        <Chip label="기본" selected={!exclusive} onPress={() => setExclusiveOutput(false)} />
        <Chip label="비트 퍼펙트 (독점)" selected={exclusive} onPress={() => setExclusiveOutput(true)} />
      </View>
      <AppText variant="caption" tone="muted">
        운영체제 믹서를 거치지 않고 장치로 바로 보냅니다. 재생 중에는 다른 앱의 소리가 나오지 않고, 일시정지하면 장치를 놓아 줍니다. 곡을 바꿀 때 잠깐 끊길 수 있고, 키보드 미디어 키와 잠금 화면 조작은 쓸 수 없습니다.
      </AppText>
      <AppText variant="caption" tone="muted">
        실제 상태는 플레이어 화면에 표시됩니다. 외장 DAC를 쓰면 장치 볼륨을 최대로 두는 것을 권합니다.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { gap: theme.spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
}));
