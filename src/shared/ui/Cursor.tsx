import { useEffect } from 'react';
import type { TextStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useUnistyles } from 'react-native-unistyles';

import { useLiveReducedMotion } from './useLiveReducedMotion';

type Props = {
  /** block은 명령줄의 네모 커서, line은 제목 뒤의 밑줄 커서입니다. */
  shape?: 'block' | 'line';
  color?: string;
  /** line 커서의 글자 모양입니다. 제목과 같은 크기로 맞출 때 씁니다. */
  textStyle?: TextStyle;
};

const HALF_MS = 530;
/** 깜빡임은 이 횟수만 하고 멈춥니다. 오래 움직이는 꾸밈이 읽기를 방해하지 않게 합니다. */
const BLINKS = 4;

/** 명령줄처럼 깜빡이는 커서입니다. 꾸밈이라 보조 기술에서 숨기고, 동작 줄이기에서는 깜빡이지 않습니다. */
export function Cursor({ shape = 'line', color, textStyle }: Props) {
  const { theme } = useUnistyles();
  const reduced = useLiveReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(opacity);
    opacity.set(1);
    if (reduced) return;
    const off = withDelay(HALF_MS, withTiming(0, { duration: 0 }));
    const on = withDelay(HALF_MS, withTiming(1, { duration: 0 }));
    opacity.set(withRepeat(withSequence(off, on), BLINKS, false));
    return () => cancelAnimation(opacity);
  }, [opacity, reduced]);

  const blink = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  // Animated 컴포넌트는 React Native 기본 컴포넌트가 아니라 고정 값을 직접 넘깁니다.
  if (shape === 'block') {
    return <Animated.View aria-hidden testID="cursor" style={[{ width: 8, height: 16, backgroundColor: color ?? theme.colors.signal }, blink]} />;
  }
  return (
    <Animated.Text aria-hidden testID="cursor" style={[{ color: color ?? theme.colors.textMuted }, textStyle, blink]}>
      _
    </Animated.Text>
  );
}
