import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

type Props = Omit<PressableProps, 'children' | 'aria-label'> & {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  size?: number;
  color?: string;
  filled?: boolean;
  /** 색만으로 구분하지 않도록 켜짐 상태를 나타내는 작은 표시입니다. */
  badge?: string;
};

/** 터치 영역은 아이콘 크기와 상관없이 44px 이상입니다. */
export function IconButton({ icon, label, size = 24, color, filled = false, badge, disabled, ...rest }: Props) {
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
      {badge ? <Text aria-hidden style={[styles.badge, { color: iconColor }]}>{badge}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.pill },
  filled: { backgroundColor: theme.colors.primary },
  badge: { position: 'absolute', bottom: 0, fontSize: 11, lineHeight: 13, fontWeight: '800' },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
}));
