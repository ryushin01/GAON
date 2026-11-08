import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { PageFade } from './PageFade';
import { useMainRegion } from './useMainRegion';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  /** scroll이 false일 때 본문 너비를 제한하지 않습니다. */
  fullBleed?: boolean;
};

/** 화면의 본문 영역입니다. 상태 표시줄을 피하고 넓은 화면에서는 너비를 제한합니다. */
export function Screen({ children, scroll = true, fullBleed = false }: Props) {
  const { ref, nativeID } = useMainRegion();
  return (
    <View ref={ref} role="main" nativeID={nativeID} tabIndex={-1} style={styles.root}>
      <PageFade>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
        ) : (
          <View style={fullBleed ? styles.fullBleed : styles.inner}>{children}</View>
        )}
      </PageFade>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { flex: 1, backgroundColor: theme.colors.bg, paddingTop: rt.insets.top },
  inner: { flex: 1, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  fullBleed: { flex: 1, width: '100%' },
  content: { width: '100%', maxWidth: 1100, alignSelf: 'center', paddingBottom: theme.spacing.xxl },
}));
