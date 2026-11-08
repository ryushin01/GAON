import type { ReactNode } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { WIDE_LAYOUT_MIN_WIDTH } from '../config';

/** 좁은 화면에서는 가로로 밀어 보고, 마우스를 쓰는 넓은 화면에서는 줄을 바꿔 모두 보여 줍니다. */
export function Rail({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  if (width >= WIDE_LAYOUT_MIN_WIDTH) return <View style={styles.wrap}>{children}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.lg, paddingHorizontal: theme.spacing.lg },
  row: { gap: theme.spacing.lg, paddingHorizontal: theme.spacing.lg },
}));
