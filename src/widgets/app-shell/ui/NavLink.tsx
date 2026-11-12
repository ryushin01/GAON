import { Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { MONO_FONT } from '@/shared/config';

type Props = { label: string; active: boolean; onPress: () => void; fill?: boolean };

/** 고정폭 글자 메뉴 하나입니다. 색만으로 구분하지 않도록 현재 화면에는 네모 표시를 함께 둡니다. */
export function NavLink({ label, active, onPress, fill = false }: Props) {
  return (
    <Pressable role="link" aria-current={active ? 'page' : undefined} onPress={onPress} style={({ pressed }) => [styles.link, fill && styles.fill, pressed && styles.pressed]}>
      <View aria-hidden style={[styles.mark, active && styles.markActive]} />
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  link: { flexDirection: 'row', minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: theme.spacing.sm },
  fill: { flex: 1, minHeight: 54, flexDirection: 'column', gap: 4 },
  pressed: { opacity: 0.7 },
  mark: { width: 5, height: 5, borderWidth: 1, borderColor: theme.colors.textMuted },
  markActive: { borderColor: theme.colors.text, backgroundColor: theme.colors.text },
  label: { color: theme.colors.textMuted, fontFamily: MONO_FONT, fontSize: 12, fontWeight: '500', letterSpacing: 1.2, textTransform: 'uppercase' },
  labelActive: { color: theme.colors.text },
}));
