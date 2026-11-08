import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

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
};

const SPIN_MS = 9000;

/** Reanimated의 값은 앱을 켤 때 정해져, 재생 중에 바꾼 동작 줄이기 설정도 따르도록 구독합니다. */
function useLiveReducedMotion() {
  const initial = useReducedMotion();
  const [reduced, setReduced] = useState(initial);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}

/** 앨범 아트를 입힌 디스크입니다. */
export function Disc({ uri, size, label, spinning = false, tilted = false }: Props) {
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
      <Animated.View style={[spinLayer, spin]}>
        <View style={styles.face}>
          {uri ? (
            <Image accessible={Boolean(label)} accessibilityLabel={label} source={{ uri }} style={imageStyle} contentFit="cover" transition={120} recyclingKey={uri} />
          ) : (
            <Ionicons aria-hidden name="musical-notes" size={size ? Math.max(16, size * 0.3) : 48} color={theme.colors.textMuted} />
          )}
        </View>
      </Animated.View>
      <View style={styles.hub}>
        <View style={styles.hole} />
      </View>
    </View>
  );
}

// Animated.View와 expo-image는 React Native 기본 컴포넌트가 아니라 고정 값을 직접 넘깁니다.
const spinLayer = { width: '100%', height: '100%' } as const;
const imageStyle = { width: '100%', height: '100%' } as const;
const tiltTransform = { transform: [{ perspective: 1400 }, { rotateX: '30deg' }, { rotateY: '-16deg' }, { rotate: '-14deg' }] };

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
  hub: {
    position: 'absolute',
    width: '24%',
    aspectRatio: 1,
    borderRadius: 9999,
    backgroundColor: theme.colors.discHub,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 가운데 구멍으로 배경이 비쳐 보이게 합니다.
  hole: { width: '62%', aspectRatio: 1, borderRadius: 9999, backgroundColor: theme.colors.bg },
}));
