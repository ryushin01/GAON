import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

type Props = Omit<PressableProps, 'children' | 'aria-label'> & {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  size?: number;
  color?: string;
  filled?: boolean;
};

/** 터치 영역은 아이콘 크기와 상관없이 44px 이상입니다. */
export function IconButton({ icon, label, size = 24, color, filled = false, disabled, ...rest }: Props) {
  const { theme } = useUnistyles();
  const iconColor = color ?? (filled ? theme.colors.onPrimary : theme.colors.text);
  return (
    <Pressable
      {...rest}
      role="button"
      aria-label={label}
      aria-disabled={disabled ?? undefined}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [styles.button, filled && styles.filled, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Ionicons aria-hidden name={icon} size={size} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.pill },
  filled: { backgroundColor: theme.colors.primary },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
}));
