import { router, usePathname } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { WIDE_LAYOUT_MIN_WIDTH } from '@/shared/config';

import { NavLink } from './NavLink';
import { isActive, NAV_ITEMS } from './nav';
import { NowPlayingBar } from './NowPlayingBar';

export function BottomDock() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const wide = width >= WIDE_LAYOUT_MIN_WIDTH;

  return (
    <View>
      <NowPlayingBar />
      {!wide && (
        <View role="navigation" aria-label="주요 메뉴" style={styles.tabs}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.name} fill label={item.label} active={isActive(pathname, item.href)} onPress={() => router.navigate(item.href)} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.rule,
    paddingBottom: rt.insets.bottom,
  },
}));
