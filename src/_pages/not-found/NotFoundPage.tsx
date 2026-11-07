import { router } from 'expo-router';

import { Screen, ScreenHeader, StateView } from '@/shared/ui';

export function NotFoundPage() {
  return (
    <Screen>
      <ScreenHeader title="페이지 없음" />
      <StateView title="찾을 수 없는 페이지입니다" actionLabel="홈으로" onAction={() => router.replace('/')} />
    </Screen>
  );
}
