import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

type Props = {
  /** 0에서 1 사이의 값입니다. */
  value: number;
  segments?: number;
  /** 켜진 칸의 색입니다. 지정하지 않으면 글자색입니다. */
  color?: string;
};

/** 칸을 나눠 켜는 막대 계기입니다. 같은 값을 글자로도 보여 주는 곳에 꾸밈으로 둡니다. */
export function SegmentMeter({ value, segments = 32, color }: Props) {
  const { theme } = useUnistyles();
  const lit = Math.round(Math.max(0, Math.min(1, value)) * segments);
  return (
    <View aria-hidden style={styles.row} testID="segment-meter">
      {Array.from({ length: segments }, (_, i) => (
        <View key={i} style={[styles.cell, i < lit && { backgroundColor: color ?? theme.colors.text }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', gap: 2, height: 12, width: '100%' },
  cell: { flex: 1, backgroundColor: theme.colors.surfaceStrong },
}));
