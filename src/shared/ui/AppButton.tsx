import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  variant?: 'primary' | 'secondary';
};

export function AppButton({ label, icon, variant = 'primary', disabled, ...rest }: Props) {
  const { theme } = useUnistyles();
  const primary = variant === 'primary';
  return (
    <Pressable
      {...rest}
      role="button"
      disabled={disabled}
      aria-disabled={disabled ?? undefined}
      style={({ pressed }) => [styles.base, primary ? styles.primary : styles.secondary, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {icon && <Ionicons aria-hidden name={icon} size={18} color={primary ? theme.colors.onPrimary : theme.colors.text} />}
      <Text style={primary ? styles.primaryLabel : styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  base: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.pill,
  },
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.surfaceStrong },
  primaryLabel: { color: theme.colors.onPrimary, fontSize: 15, fontWeight: '700' },
  secondaryLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
}));
