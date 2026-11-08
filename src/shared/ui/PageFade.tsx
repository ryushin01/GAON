import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useLiveReducedMotion } from './useLiveReducedMotion';

const ENTER_MS = 260;

/** 웹과 PC 앱에서 화면이 바뀔 때 본문을 부드럽게 나타냅니다. 앱은 화면 스택이 전환을 맡습니다. */
export function PageFade({ children }: { children: ReactNode }) {
  const reduceMotion = useLiveReducedMotion();
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(ENTER_MS)} style={fill}>
      {children}
    </Animated.View>
  );
}

// Animated.View는 React Native 기본 컴포넌트가 아니라 고정 값을 직접 넘깁니다.
const fill = { flex: 1, minHeight: 0 } as const;
