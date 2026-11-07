import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Chip } from '@/shared/ui';

import { useThemeStore, type ThemePreference } from '../model/themeStore';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: '시스템 설정' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

export function ThemeSelector() {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  return (
    <View role="group" aria-label="화면 테마" style={styles.row}>
      {OPTIONS.map((option) => (
        <Chip key={option.value} label={option.label} selected={preference === option.value} onPress={() => setPreference(option.value)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
}));
