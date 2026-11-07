import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

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
      {selected && <Ionicons aria-hidden name="checkmark" size={16} color={theme.colors.onPrimary} />}
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
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceStrong,
  },
  chipSelected: { backgroundColor: theme.colors.primary },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  labelSelected: { color: theme.colors.onPrimary },
}));
