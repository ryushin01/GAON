import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useMainRegion } from './useMainRegion';

type Props = { children: ReactNode; scroll?: boolean };

/** 화면의 본문 영역입니다. 상태 표시줄을 피하고 넓은 화면에서는 너비를 제한합니다. */
export function Screen({ children, scroll = true }: Props) {
  const { ref, nativeID } = useMainRegion();
  if (!scroll) {
    return (
      <View ref={ref} role="main" nativeID={nativeID} tabIndex={-1} style={styles.root}>
        <View style={styles.inner}>{children}</View>
      </View>
    );
  }
  return (
    <View ref={ref} role="main" nativeID={nativeID} tabIndex={-1} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { flex: 1, backgroundColor: theme.colors.bg, paddingTop: rt.insets.top },
  inner: { flex: 1, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  content: { width: '100%', maxWidth: 1100, alignSelf: 'center', paddingBottom: theme.spacing.xxl },
}));
