import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/** 화면에는 보이지 않고 스크린 리더만 읽는 글자입니다. 보이는 글자 뒤에 동작이나 부가 정보를 덧붙일 때 씁니다. */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <Text style={styles.hidden}>{children}</Text>;
}

const styles = StyleSheet.create({
  // Android 스크린 리더는 opacity 0인 요소를 건너뛰므로 글자색만 투명하게 합니다.
  hidden: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', color: 'transparent' },
});
