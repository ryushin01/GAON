import type { StyleProp, ViewStyle } from 'react-native';

import { AppText, LiveRegion } from '@/shared/ui';

import { usePlayerStore } from '../model/playerStore';

/** 재생 오류를 알립니다. 알림 영역은 처음부터 두고 문구만 바꿉니다. */
export function PlaybackError({ style }: { style?: StyleProp<ViewStyle> }) {
  const error = usePlayerStore((s) => s.error);
  return (
    <LiveRegion role="alert" style={style}>
      {error ? <AppText tone="danger">{error}</AppText> : null}
    </LiveRegion>
  );
}
