import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Cursor } from './Cursor';

type Props = {
  loading?: boolean;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** 불러오는 중, 비어 있음, 오류 안내를 명령줄 기록처럼 같은 모양으로 보여 줍니다. */
export function StateView({ loading, title, description, actionLabel, onAction }: Props) {
  return (
    <View style={styles.root} role={loading ? 'progressbar' : undefined} aria-label={loading ? '불러오는 중' : undefined}>
      {loading && (
        <View style={styles.line}>
          <AppText variant="mono" tone="muted" aria-hidden>{'> 불러오는 중'}</AppText>
          <Cursor shape="block" />
        </View>
      )}
      {title && <AppText variant="heading" style={styles.center}>{title}</AppText>}
      {description && <AppText tone="muted" style={styles.center}>{description}</AppText>}
      {actionLabel && onAction && <AppButton label={actionLabel} onPress={onAction} />}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, padding: theme.spacing.xxl, minHeight: 200 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  center: { textAlign: 'center' },
}));
