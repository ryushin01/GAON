import { useIsFocused } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

type Props = { children: ReactNode; scroll?: boolean };

/** 화면의 본문 영역입니다. 상태 표시줄을 피하고 넓은 화면에서는 너비를 제한합니다. */
export function Screen({ children, scroll = true }: Props) {
  // 이전 화면도 숨겨진 채 남아 있으므로 현재 화면에만 본문 바로가기 대상 id를 답니다.
  const nativeID = useIsFocused() ? 'main' : undefined;
  if (!scroll) {
    return (
      <View role="main" nativeID={nativeID} tabIndex={-1} style={styles.root}>
        <View style={styles.inner}>{children}</View>
      </View>
    );
  }
  return (
    <View role="main" nativeID={nativeID} tabIndex={-1} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { flex: 1, backgroundColor: theme.colors.bg, paddingTop: rt.insets.top },
  inner: { flex: 1, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  content: { width: '100%', maxWidth: 1100, alignSelf: 'center', paddingBottom: theme.spacing.xxl },
}));
