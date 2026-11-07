import { Stack } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { WIDE_LAYOUT_MIN_WIDTH } from '@/shared/config';

import { BottomDock } from './BottomDock';
import { Sidebar } from './Sidebar';

/** 어느 화면에서든 탭과 미니 플레이어가 보이도록 화면 스택을 감쌉니다. */
export function TabsLayout() {
  const { theme } = useUnistyles();
  const { width } = useWindowDimensions();
  return (
    <View style={styles.root}>
      {width >= WIDE_LAYOUT_MIN_WIDTH && <Sidebar />}
      <View style={styles.main}>
        <View style={styles.main}>
          <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: theme.colors.bg } }} />
        </View>
        <BottomDock />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, flexDirection: 'row', backgroundColor: theme.colors.bg },
  main: { flex: 1, minWidth: 0 },
}));
