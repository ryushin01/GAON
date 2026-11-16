import { router, type ErrorBoundaryProps } from 'expo-router';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AppButton, StateView } from '@/shared/ui';

/** 화면을 그리다 오류가 나면 빈 화면 대신 다시 시도하거나 홈으로 갈 수 있게 합니다. */
export function RouteError({ error, retry }: ErrorBoundaryProps) {
  if (__DEV__) console.error(error);
  return (
    <View role="alert" style={styles.root}>
      <StateView
        title="화면을 보여 주지 못했습니다"
        description="잠시 뒤 다시 시도해 주세요. 계속되면 앱을 다시 켜 주세요."
        actionLabel="다시 시도"
        onAction={() => void retry()}
      />
      <AppButton variant="secondary" label="홈으로" onPress={() => router.replace('/')} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.bg, padding: theme.spacing.lg },
}));
