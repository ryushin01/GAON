import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { isActive, NAV_ITEMS } from './nav';

export function Sidebar() {
  const { theme } = useUnistyles();
  const pathname = usePathname();
  return (
    <View role="navigation" aria-label="주요 메뉴" style={styles.root}>
      <Text style={styles.logo}>GAON</Text>
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Pressable
            key={item.name}
            role="link"
            aria-current={active ? 'page' : undefined}
            onPress={() => router.navigate(item.href)}
            style={[styles.item, active && styles.itemActive]}
          >
            <Ionicons aria-hidden name={active ? item.iconActive : item.icon} size={22} color={active ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { width: 220, gap: theme.spacing.xs, padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderRightWidth: 1, borderRightColor: theme.colors.border },
  logo: { color: theme.colors.primary, fontSize: 26, fontWeight: '900', letterSpacing: 2, padding: theme.spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 44, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.md },
  itemActive: { backgroundColor: theme.colors.primaryMuted },
  label: { color: theme.colors.text, fontSize: 15, fontWeight: '500' },
  labelActive: { color: theme.colors.primary, fontWeight: '700' },
}));
