import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

type Props = { checked: boolean; label: string; onChange: (checked: boolean) => void };

export function Checkbox({ checked, label, onChange }: Props) {
  const { theme } = useUnistyles();
  return (
    <Pressable
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onPress={() => onChange(!checked)}
      style={styles.hit}
    >
      <Ionicons
        aria-hidden
        name={checked ? 'checkbox' : 'square-outline'}
        size={24}
        color={checked ? theme.colors.primary : theme.colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
