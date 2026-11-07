import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

type Props = { checked: boolean; label: string; onChange: (checked: boolean) => void };

export function Checkbox({ checked, label, onChange }: Props) {
  const { theme } = useUnistyles();
  // React Native Web은 button 역할에서만 Space를 처리합니다. 체크박스는 Space로 켜고 끌 수 있어야 합니다.
  const webProps: Record<string, unknown> =
    Platform.OS === 'web'
      ? {
          onKeyDown: (e: { key: string; preventDefault: () => void }) => {
            if (e.key === ' ') {
              e.preventDefault();
              onChange(!checked);
            }
          },
        }
      : {};
  return (
    <Pressable
      {...webProps}
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
