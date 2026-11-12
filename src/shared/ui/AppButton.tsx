import { Pressable, Text, View, type PressableProps } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { MONO_FONT } from '../config';

import { Cursor } from './Cursor';
import { Icon, type IconName } from './Icon';
import { Corners } from './Panel';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  icon?: IconName;
  /** command는 명령줄 입력처럼 `> 라벨`을 크게 쓰는 대표 동작입니다. */
  variant?: 'primary' | 'secondary' | 'command';
  /** command 위에 작게 붙는 설명입니다. */
  hint?: string;
};

export function AppButton({ label, icon, variant = 'primary', hint, disabled, ...rest }: Props) {
  const { theme } = useUnistyles();
  const filled = variant !== 'secondary';
  const content =
    variant === 'command' ? (
      <View style={styles.commandBody}>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        <View style={styles.commandLine}>
          <Text style={labelStyles.command}>{`> ${label}`}</Text>
          <Cursor shape="block" color={theme.colors.onPrimary} />
        </View>
      </View>
    ) : (
      <>
        {icon && <Icon aria-hidden name={icon} size={16} color={filled ? theme.colors.onPrimary : theme.colors.text} />}
        <Text style={labelStyles[variant]}>{label}</Text>
      </>
    );
  return (
    <Pressable
      {...rest}
      role="button"
      // command는 설명을 붙여도 화면에 보이는 라벨이 이름이 되게 합니다. 부르는 쪽이 이름을 주면 그 이름을 씁니다.
      aria-label={rest['aria-label'] ?? (variant === 'command' ? label : undefined)}
      disabled={disabled}
      aria-disabled={disabled ?? undefined}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, disabled && styles.disabled]}
    >
      {variant === 'command' && <Corners />}
      {content}
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
  command: { justifyContent: 'flex-start', minHeight: 72, paddingHorizontal: theme.spacing.xl, backgroundColor: theme.colors.primary },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  commandBody: { gap: 2 },
  commandLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hint: { color: theme.colors.onPrimary, opacity: 0.7, fontFamily: MONO_FONT, fontSize: 11, lineHeight: 15, letterSpacing: 2, fontWeight: '700', textTransform: 'uppercase' },
}));

const labelStyles = StyleSheet.create((theme) => ({
  primary: { color: theme.colors.onPrimary, fontFamily: MONO_FONT, fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  secondary: { color: theme.colors.text, fontFamily: MONO_FONT, fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  command: { color: theme.colors.onPrimary, fontFamily: MONO_FONT, fontSize: 20, lineHeight: 26, fontWeight: '700' },
}));
