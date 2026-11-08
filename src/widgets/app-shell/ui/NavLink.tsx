import { Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

type Props = { label: string; active: boolean; onPress: () => void; fill?: boolean };

/** 글자 메뉴 하나입니다. 색만으로 구분하지 않도록 현재 화면에는 점을 함께 찍습니다. */
export function NavLink({ label, active, onPress, fill = false }: Props) {
  return (
    <Pressable role="link" aria-current={active ? 'page' : undefined} onPress={onPress} style={[styles.link, fill && styles.fill]}>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      {active && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  link: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.sm },
  fill: { flex: 1, minHeight: 54 },
  label: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '500', letterSpacing: -0.2 },
  labelActive: { color: theme.colors.text },
  dot: { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.text },
}));
