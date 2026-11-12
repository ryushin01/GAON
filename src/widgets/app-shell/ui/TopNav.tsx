import { router, usePathname } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useCurrentTrack, usePlayerStore } from '@/features/player';
import { MONO_FONT } from '@/shared/config';
import { StatusDot, useNavSlot } from '@/shared/ui';

import { NavLink } from './NavLink';
import { isActive, NAV_ITEMS } from '../config/nav';

/** 넓은 화면의 상단 관제 막대입니다. 왼쪽에 로고와 메뉴, 오른쪽에 재생 상태를 둡니다. */
export function TopNav() {
  const pathname = usePathname();
  const slot: ReactNode = useNavSlot((s) => s.node);
  const booting = useNavSlot((s) => s.booting) && pathname === '/';
  const track = useCurrentTrack();
  const playing = usePlayerStore((s) => s.playing);
  return (
    <View role="banner" style={styles.root}>
      <View role="navigation" aria-label="주요 메뉴" style={styles.left}>
        <View style={styles.logo}>
          <View aria-hidden style={styles.logoMark} />
          <Text style={styles.logoText}>GAON</Text>
        </View>
        <View aria-hidden style={styles.divider} />
        {booting && <Text style={styles.status}>{'> 재생 준비 중'}</Text>}
        {!booting && NAV_ITEMS.map((item) => (
          <NavLink key={item.name} label={item.label} active={isActive(pathname, item.href)} onPress={() => router.navigate(item.href)} />
        ))}
        {!booting && <NavLink label="설정" active={pathname.startsWith('/settings')} onPress={() => router.navigate('/settings')} />}
      </View>
      <View style={styles.right}>
        {!booting && slot}
        <View aria-hidden style={styles.divider} />
        <View style={styles.state}>
          <StatusDot tone={playing ? 'live' : track ? 'signal' : 'idle'} />
          <Text style={[styles.status, playing && styles.live]}>{playing ? '재생 중' : track ? '일시정지' : '대기'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    minHeight: 52,
    paddingTop: rt.insets.top,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    zIndex: 20,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingRight: theme.spacing.sm },
  logoMark: { width: 8, height: 8, backgroundColor: theme.colors.text },
  logoText: { color: theme.colors.text, fontFamily: MONO_FONT, fontSize: 13, fontWeight: '700', letterSpacing: 3 },
  divider: { width: 1, height: 16, backgroundColor: theme.colors.border, marginHorizontal: theme.spacing.xs },
  state: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  status: { color: theme.colors.textMuted, fontFamily: MONO_FONT, fontSize: 12, letterSpacing: 1.2 },
  live: { color: theme.colors.live },
}));
