import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon } from './Icon';
import { useLiveReducedMotion } from './useLiveReducedMotion';

type Props = {
  uri?: string;
  /** 지정하지 않으면 부모 너비를 채웁니다. */
  size?: number;
  /** 옆에 곡 정보가 있어 꾸밈 이미지일 때는 비워 둡니다. */
  label?: string;
  /** 재생 중일 때만 켭니다. 일시정지하면 멈추고, 동작 줄이기 설정에서는 돌지 않습니다. */
  spinning?: boolean;
  /** 공중에 놓인 듯 비스듬히 보여 줍니다. */
  tilted?: boolean;
  /** 첫 화면의 가장 중요한 이미지면 high로 먼저 받습니다. */
  priority?: 'low' | 'normal' | 'high';
};

const SPIN_MS = 9000;

/** 앨범 아트를 입힌 디스크입니다. */
export function Disc({ uri, size, label, spinning = false, tilted = false, priority = 'normal' }: Props) {
  const { theme } = useUnistyles();
  const reduceMotion = useLiveReducedMotion();
  const angle = useSharedValue(0);

  useEffect(() => {
    if (!spinning || reduceMotion) {
      cancelAnimation(angle);
      return;
    }
    // 멈춘 각도에서 이어서 돕니다.
    const from = angle.get() % 360;
    angle.set(from);
    angle.set(withRepeat(withTiming(from + 360, { duration: SPIN_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(angle);
  }, [angle, spinning, reduceMotion]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.get()}deg` }] }));

  return (
    <View
      style={[styles.frame, size ? { width: size } : styles.fill, tilted && tiltTransform]}
      role={label && !uri ? 'img' : undefined}
      aria-label={uri ? undefined : label}
      aria-hidden={label ? undefined : true}
      // 비스듬한 디스크는 화면에 놓인 상자가 정사각형이 아니어서 따로 구분합니다.
      testID={tilted ? 'disc-tilted' : 'disc'}
    >
      {tilted && <View style={styles.edge} />}
      <Animated.View style={[spinLayer, spin]}>
        <View style={styles.face}>
          {uri ? (
            <Image accessible={Boolean(label)} accessibilityLabel={label} source={{ uri }} priority={priority} style={imageStyle} contentFit="cover" transition={120} recyclingKey={uri} />
          ) : (
            <Icon aria-hidden name="musical-notes" size={size ? Math.max(16, size * 0.3) : 48} color={theme.colors.textMuted} />
          )}
        </View>
      </Animated.View>
      {Platform.OS === 'web' && <View style={[styles.sheen, sheenStyle]} />}
      <View style={styles.hub}>
        <View style={styles.hubRing} />
        <View style={styles.hole} />
      </View>
    </View>
  );
}

// Animated.View와 expo-image는 React Native 기본 컴포넌트가 아니라 고정 값을 직접 넘깁니다.
const spinLayer = { width: '100%', height: '100%' } as const;
const imageStyle = { width: '100%', height: '100%' } as const;
const tiltTransform = { transform: [{ perspective: 1400 }, { rotateX: '30deg' }, { rotateY: '-16deg' }, { rotate: '-14deg' }] };

// 웹에서만 디스크 표면의 빛 반사를 그립니다.
const sheenStyle = {
  backgroundImage:
    'conic-gradient(from 20deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,.2) 28deg, rgba(255,255,255,0) 70deg, rgba(255,255,255,0) 190deg, rgba(255,255,255,.16) 226deg, rgba(255,255,255,0) 262deg, rgba(255,255,255,0) 360deg)',
} as unknown as ViewStyle;

const styles = StyleSheet.create((theme) => ({
  frame: { aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%' },
  face: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: theme.colors.discRim,
    backgroundColor: theme.colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 기울어진 디스크의 두께입니다.
  edge: { position: 'absolute', top: 3, left: 1, right: -1, bottom: -3, borderRadius: 9999, backgroundColor: theme.colors.discRim },
  sheen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 9999, pointerEvents: 'none' },
  hub: {
    position: 'absolute',
    width: '24%',
    aspectRatio: 1,
    borderRadius: 9999,
    backgroundColor: theme.colors.discHub,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubRing: { position: 'absolute', width: '84%', aspectRatio: 1, borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.55)' },
  // 가운데 구멍으로 배경이 비쳐 보이게 합니다.
  hole: { width: '62%', aspectRatio: 1, borderRadius: 9999, backgroundColor: theme.colors.bg },
}));
