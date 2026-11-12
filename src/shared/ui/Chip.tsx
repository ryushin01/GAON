import { Pressable, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { MONO_FONT } from '../config';

import { Icon } from './Icon';

type Props = { label: string; selected: boolean; onPress: () => void };

export function Chip({ label, selected, onPress }: Props) {
  const { theme } = useUnistyles();
  return (
    <Pressable
      role="button"
      aria-pressed={selected}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {/* 색만으로 구분하지 않도록 선택 표시를 함께 보여 줍니다. */}
      {selected && <Icon aria-hidden name="checkmark" size={14} color={theme.colors.onPrimary} />}
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.rule,
  },
  chipSelected: { backgroundColor: theme.colors.primary },
  label: { color: theme.colors.text, fontFamily: MONO_FONT, fontSize: 13, fontWeight: '600', letterSpacing: 0.4 },
  labelSelected: { color: theme.colors.onPrimary },
}));
