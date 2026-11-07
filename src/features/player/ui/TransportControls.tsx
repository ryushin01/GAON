import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { IconButton } from '@/shared/ui';

import { cycleRepeat, next, previous, toggleShuffle } from '../model/engine';
import { usePlayerStore } from '../model/playerStore';
import { PlayPauseButton } from './PlayPauseButton';

const REPEAT_LABEL = { off: '반복 꺼짐', all: '전체 반복', one: '한 곡 반복' } as const;

export function TransportControls() {
  const { theme } = useUnistyles();
  const { text, textMuted, accent } = theme.colors.stage;
  const repeat = usePlayerStore((s) => s.repeat);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const index = usePlayerStore((s) => s.index);
  const count = usePlayerStore((s) => s.queue.length);
  const atEnd = repeat === 'off' && index >= count - 1;

  return (
    <View style={styles.row}>
      <IconButton
        icon={shuffle ? 'shuffle' : 'shuffle-outline'}
        label={shuffle ? '셔플 끄기' : '셔플 켜기'}
        color={shuffle ? accent : textMuted}
        onPress={() => void toggleShuffle()}
      />
      <IconButton icon="play-skip-back" label="이전 곡" size={30} color={text} onPress={previous} />
      <View style={styles.play}>
        <PlayPauseButton size={38} color={text} />
      </View>
      <IconButton icon="play-skip-forward" label="다음 곡" size={30} color={text} onPress={next} disabled={atEnd} />
      <IconButton
        icon={repeat === 'one' ? 'repeat' : 'repeat-outline'}
        label={`${REPEAT_LABEL[repeat]}, 눌러서 바꾸기`}
        color={repeat === 'off' ? textMuted : accent}
        onPress={cycleRepeat}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  play: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.stage.surface },
}));
