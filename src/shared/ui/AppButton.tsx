import { Pressable, Text, type PressableProps } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { SERIF_FONT } from '../config';

import { Icon, type IconName } from './Icon';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  icon?: IconName;
  /** rule은 위아래 굵은 선 사이에 큰 세리프 글자를 놓는 대표 동작입니다. */
  variant?: 'primary' | 'secondary' | 'rule';
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
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, disabled && styles.disabled]}
    >
      {icon && <Icon aria-hidden name={icon} size={18} color={primary ? theme.colors.onPrimary : theme.colors.text} />}
      <Text style={labelStyles[variant]}>{label}</Text>
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
  },
  primary: { backgroundColor: theme.colors.primary },
  secondary: { borderWidth: 1, borderColor: theme.colors.rule },
  rule: { paddingHorizontal: theme.spacing.xs, paddingVertical: theme.spacing.xs, borderTopWidth: 5, borderBottomWidth: 5, borderColor: theme.colors.rule },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
}));

const labelStyles = StyleSheet.create((theme) => ({
  primary: { color: theme.colors.onPrimary, fontSize: 15, fontWeight: '600' },
  secondary: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  rule: { color: theme.colors.text, fontFamily: SERIF_FONT, fontWeight: '400', fontSize: 32, lineHeight: 42, letterSpacing: -0.8, textTransform: 'uppercase' },
}));
