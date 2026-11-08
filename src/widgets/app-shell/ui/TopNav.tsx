import { router, usePathname } from 'expo-router';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { SERIF_FONT } from '@/shared/config';

import { NavLink } from './NavLink';
import { isActive, NAV_ITEMS } from '../config/nav';

/** 넓은 화면의 상단 메뉴입니다. 로고와 메뉴를 가운데에 모아 본문을 가리지 않습니다. */
export function TopNav() {
  const pathname = usePathname();
  return (
    <View role="navigation" aria-label="주요 메뉴" style={styles.root}>
      <Text style={styles.logo}>GAON</Text>
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.name} label={item.label} active={isActive(pathname, item.href)} onPress={() => router.navigate(item.href)} />
      ))}
      <NavLink label="설정" active={pathname.startsWith('/settings')} onPress={() => router.navigate('/settings')} />
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, minHeight: 56, paddingTop: rt.insets.top, backgroundColor: theme.colors.bg },
  logo: { color: theme.colors.text, fontFamily: SERIF_FONT, fontSize: 22, letterSpacing: -0.4, marginRight: theme.spacing.md },
}));
