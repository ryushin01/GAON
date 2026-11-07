import { ActivityIndicator, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { AppButton } from './AppButton';
import { AppText } from './AppText';

type Props = {
  loading?: boolean;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** 불러오는 중, 비어 있음, 오류 안내를 같은 모양으로 보여 줍니다. */
export function StateView({ loading, title, description, actionLabel, onAction }: Props) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.root} role={loading ? 'progressbar' : undefined} aria-label={loading ? '불러오는 중' : undefined}>
      {loading && <ActivityIndicator color={theme.colors.primary} size="large" />}
      {title && <AppText variant="subheading" style={styles.center}>{title}</AppText>}
      {description && <AppText tone="muted" style={styles.center}>{description}</AppText>}
      {actionLabel && onAction && <AppButton label={actionLabel} onPress={onAction} />}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, padding: theme.spacing.xxl, minHeight: 200 },
  center: { textAlign: 'center' },
}));
