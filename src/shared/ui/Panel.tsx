import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

type Props = {
  children: ReactNode;
  /** 바탕을 깔지 않고 테두리만 그립니다. */
  bare?: boolean;
  /** 네 귀퉁이의 꺾쇠를 그립니다. */
  corners?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** 가는 테두리에 네 귀퉁이 꺾쇠를 단 관제 패널입니다. 꺾쇠는 꾸밈이라 보조 기술에서 숨깁니다. */
export function Panel({ children, bare = false, corners = true, style }: Props) {
  return (
    <View style={[styles.panel, !bare && styles.filled, style]}>
      {corners && <Corners />}
      {children}
    </View>
  );
}

export function Corners() {
  return (
    <>
      <View aria-hidden style={[styles.corner, styles.tl]} />
      <View aria-hidden style={[styles.corner, styles.tr]} />
      <View aria-hidden style={[styles.corner, styles.bl]} />
      <View aria-hidden style={[styles.corner, styles.br]} />
    </>
  );
}

const SIZE = 8;
const OUT = -1;

const styles = StyleSheet.create((theme) => ({
  panel: { position: 'relative', borderWidth: 1, borderColor: theme.colors.border },
  filled: { backgroundColor: theme.colors.panel },
  corner: { position: 'absolute', width: SIZE, height: SIZE, borderColor: theme.colors.text, pointerEvents: 'none' },
  tl: { top: OUT, left: OUT, borderTopWidth: 1, borderLeftWidth: 1 },
  tr: { top: OUT, right: OUT, borderTopWidth: 1, borderRightWidth: 1 },
  bl: { bottom: OUT, left: OUT, borderBottomWidth: 1, borderLeftWidth: 1 },
  br: { bottom: OUT, right: OUT, borderBottomWidth: 1, borderRightWidth: 1 },
}));
