import { Pressable, Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

type Props = { label: string; selected: boolean; onPress: () => void };

export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      role="button"
      aria-pressed={selected}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceStrong,
  },
  chipSelected: { backgroundColor: theme.colors.primary },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  labelSelected: { color: theme.colors.onPrimary },
}));
