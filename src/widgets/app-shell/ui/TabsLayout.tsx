import { Stack, usePathname } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { View, useWindowDimensions } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { WIDE_LAYOUT_MIN_WIDTH } from '@/shared/config';

import { BottomDock } from './BottomDock';
import { TopNav } from './TopNav';

/** 홈 왼쪽 위 정보표와 가운데 메뉴가 겹치지 않는 너비부터 메뉴를 디스크 위에 띄웁니다. */
const OVERLAY_NAV_MIN_WIDTH = 1180;

/** 어느 화면에서든 메뉴와 미니 플레이어가 보이도록 화면 스택을 감쌉니다. */
export function TabsLayout() {
  const { theme } = useUnistyles();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  return (
    <View style={styles.root}>
      {width >= WIDE_LAYOUT_MIN_WIDTH && <TopNav overlay={pathname === '/' && width >= OVERLAY_NAV_MIN_WIDTH} />}
      <View style={styles.main}>
        <Stack screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'fade', contentStyle: { backgroundColor: theme.colors.bg } }} />
      </View>
      <BottomDock />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  main: { flex: 1, minHeight: 0 },
}));
