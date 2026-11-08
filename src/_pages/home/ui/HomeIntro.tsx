import { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { scheduleOnRN } from 'react-native-worklets';

import { SERIF_FONT, WIDE_LAYOUT_MIN_WIDTH } from '@/shared/config';
import { AppText, Disc } from '@/shared/ui';

type Props = {
  uri?: string;
  /** 카탈로그를 받기 전에는 숫자가 끝까지 오르지 않습니다. */
  ready: boolean;
  onDone: () => void;
};

const TICK_MS = 28;
const EASE = Easing.bezier(0.625, 0.05, 0, 1);
const FIRST_YEAR = 2016;

/** 앱을 처음 열 때 한 번 보여 주는 인트로입니다. 꾸밈이라 보조 기술에서 숨기고 누르기도 막지 않습니다. */
export function HomeIntro({ uri, ready, onDone }: Props) {
  const { theme } = useUnistyles();
  const { width, height } = useWindowDimensions();
  const [count, setCount] = useState(0);
  const flip = useSharedValue(0);
  const logo = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    flip.set(withTiming(1, { duration: 900, easing: EASE }));
    logo.set(withSequence(withTiming(0, { duration: 520, easing: EASE }), withDelay(620, withTiming(-1, { duration: 420, easing: EASE }))));
  }, [flip, logo]);

  useEffect(() => {
    const limit = ready ? 100 : 88;
    if (count >= limit) return;
    const id = setTimeout(() => setCount(Math.min(limit, count + 2)), TICK_MS);
    return () => clearTimeout(id);
  }, [count, ready]);

  useEffect(() => {
    if (count < 100) return;
    opacity.set(
      withTiming(0, { duration: 380, easing: EASE }, (finished) => {
        if (finished) scheduleOnRN(onDone);
      }),
    );
  }, [count, opacity, onDone]);

  const overlay = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const disc = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1400 },
      { rotateY: `${interpolate(flip.get(), [0, 1], [84, 0])}deg` },
      { scale: interpolate(flip.get(), [0, 1], [0.55, 1]) },
    ],
  }));
  const letters = useAnimatedStyle(() => ({ transform: [{ translateY: logo.get() * LOGO_HEIGHT }] }));

  const size = Math.min(height * 0.46, width * 0.5);
  const year = FIRST_YEAR + Math.round((count / 100) * (new Date().getFullYear() - FIRST_YEAR));

  return (
    <Animated.View aria-hidden pointerEvents="none" style={[overlayBase, { backgroundColor: theme.colors.bg }, overlay]}>
      {/* 넓은 화면은 상단 메뉴 자리에 같은 내용을 보여 줍니다. */}
      {width < WIDE_LAYOUT_MIN_WIDTH && (
        <View style={styles.top}>
          <AppText variant="heading">GAON</AppText>
          <AppText variant="caption">재생 준비 중</AppText>
        </View>
      )}
      <AppText variant="caption" style={styles.left}>GAON</AppText>
      <AppText variant="caption" style={styles.right}>{year}</AppText>
      <AppText style={[styles.count, { left: Math.max(16, width / 2 - size / 2 - 180) }]}>{count}</AppText>
      <Animated.View style={[{ width: size }, disc]}>
        <Disc uri={ready ? uri : undefined} size={size} tilted />
      </Animated.View>
      <View style={styles.logoMask}>
        <Animated.View style={letters}>
          <AppText style={styles.logo}>GAON</AppText>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const LOGO_HEIGHT = 92;

// Animated.View는 React Native 기본 컴포넌트가 아니라 고정 값을 직접 넘깁니다.
const overlayBase = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 30, alignItems: 'center', justifyContent: 'center' } as const;

const styles = StyleSheet.create((theme) => ({
  top: { position: 'absolute', top: theme.spacing.xs, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg },
  left: { position: 'absolute', left: theme.spacing.sm, top: '50%' },
  right: { position: 'absolute', right: theme.spacing.sm, top: '50%' },
  count: { position: 'absolute', top: '46%', fontFamily: SERIF_FONT, fontSize: 72, lineHeight: 84, letterSpacing: -2, color: theme.colors.text },
  logoMask: { position: 'absolute', bottom: 40, height: LOGO_HEIGHT, overflow: 'hidden' },
  logo: { fontFamily: SERIF_FONT, fontSize: 76, lineHeight: LOGO_HEIGHT, letterSpacing: -2, color: theme.colors.text },
}));
