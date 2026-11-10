import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useSessionStore } from '@/entities/session';
import { AppButton, AppText } from '@/shared/ui';

import { syncNow, useSyncStatus } from '../model/sync';

const LABEL = { idle: '아직 동기화하지 않았습니다.', syncing: '보관함을 맞추는 중입니다.', synced: '보관함이 이 계정과 맞춰져 있습니다.', error: '' } as const;

/** 보관함 동기화 상태를 보여 주고, 실패하면 다시 시도하게 합니다. */
export function SyncStatus() {
  const { state, error } = useSyncStatus();
  const kind = useSessionStore((s) => s.session?.kind);
  if (kind === 'demo') return <AppText variant="caption" tone="muted">데모 로그인은 동기화하지 않고, 보관함은 이 기기에만 저장됩니다.</AppText>;
  return (
    <View style={styles.root} aria-live="polite">
      {state === 'error' ? (
        <>
          <AppText tone="danger" role="alert">보관함을 동기화하지 못했습니다. {error}</AppText>
          <View style={styles.action}>
            <AppButton variant="secondary" label="다시 동기화" onPress={() => void syncNow()} />
          </View>
        </>
      ) : (
        <AppText variant="caption" tone="muted">{LABEL[state]}</AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { gap: theme.spacing.sm },
  action: { alignItems: 'flex-start' },
}));
