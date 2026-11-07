import { Modal, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AppButton } from './AppButton';
import { AppText } from './AppText';

type Props = {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** 되돌릴 수 없는 동작 전에 한 번 더 묻습니다. */
export function ConfirmDialog({ visible, title, description, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <Modal aria-label={title} visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <AppText variant="subheading" role="heading" aria-level={2}>{title}</AppText>
          {description ? <AppText tone="muted">{description}</AppText> : null}
          <View style={styles.actions}>
            <AppButton label="취소" variant="secondary" onPress={onCancel} />
            <AppButton label={confirmLabel} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, backgroundColor: 'rgba(3, 12, 30, 0.6)' },
  sheet: { width: '100%', maxWidth: 360, gap: theme.spacing.md, padding: theme.spacing.lg, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm },
}));
