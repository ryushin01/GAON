import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { WIDE_LAYOUT_MIN_WIDTH } from '@/shared/config';

import { isActive, NAV_ITEMS } from './nav';
import { NowPlayingBar } from './NowPlayingBar';

export function BottomDock() {
  const { theme } = useUnistyles();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const wide = width >= WIDE_LAYOUT_MIN_WIDTH;

  return (
    <View>
      <NowPlayingBar />
      {!wide && (
        <View role="navigation" aria-label="주요 메뉴" style={styles.tabs}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Pressable
                key={item.name}
                role="link"
                aria-current={active ? 'page' : undefined}
                onPress={() => router.navigate(item.href)}
                style={styles.tab}
              >
                <Ionicons
        aria-hidden
                  name={active ? item.iconActive : item.icon}
                  size={22}
                  color={active ? theme.colors.primary : theme.colors.textMuted}
                />
                <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
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
    borderTopColor: theme.colors.border,
    paddingBottom: rt.insets.bottom,
  },
  tab: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '500' },
  labelActive: { color: theme.colors.primary, fontWeight: '700' },
}));
