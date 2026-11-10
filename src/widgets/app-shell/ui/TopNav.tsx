import { router, usePathname } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { SERIF_FONT } from '@/shared/config';
import { useNavSlot } from '@/shared/ui';

import { NavLink } from './NavLink';
import { isActive, NAV_ITEMS } from '../config/nav';

/** 넓은 화면의 상단 메뉴입니다. 로고와 메뉴를 가운데에 모아 본문을 가리지 않습니다. */
export function TopNav({ overlay = false }: { overlay?: boolean }) {
  const pathname = usePathname();
  const slot: ReactNode = useNavSlot((s) => s.node);
  const booting = useNavSlot((s) => s.booting) && pathname === '/';
  return (
    <View role="navigation" aria-label="주요 메뉴" style={[styles.root, overlay && styles.overlay]}>
      <Text style={styles.logo}>GAON</Text>
      {booting && <Text style={styles.booting}>재생 준비 중</Text>}
      {!booting && NAV_ITEMS.map((item) => (
        <NavLink key={item.name} label={item.label} active={isActive(pathname, item.href)} onPress={() => router.navigate(item.href)} />
      ))}
      {!booting && <NavLink label="설정" active={pathname.startsWith('/settings')} onPress={() => router.navigate('/settings')} />}
      {!booting && slot}
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, minHeight: 56, paddingTop: rt.insets.top, backgroundColor: theme.colors.bg },
  // 홈에서는 디스크 위에 떠 있습니다. 가운데만 차지해 왼쪽 정보표를 가리지 않고, 아래로 스크롤한 내용 위에서도 읽히게 바탕을 깝니다.
  overlay: { position: 'absolute', top: 0, alignSelf: 'center', zIndex: 20, paddingHorizontal: theme.spacing.lg },
  booting: { color: theme.colors.text, fontSize: 14, fontWeight: '500', letterSpacing: -0.2 },
  logo: { color: theme.colors.text, fontFamily: SERIF_FONT, fontSize: 22, letterSpacing: -0.4, marginRight: theme.spacing.md },
}));
