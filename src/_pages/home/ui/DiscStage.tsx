import type { ReactNode } from 'react';
import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';
import { scheduleOnRN } from 'react-native-worklets';

import { displayTitle, formatQuality, type Track } from '@/entities/music';
import { SERIF_FONT, WIDE_LAYOUT_MIN_WIDTH } from '@/shared/config';
import { formatDate } from '@/shared/lib';
import { AppButton, AppText, Disc, IconButton, MetaRow, useLiveReducedMotion } from '@/shared/ui';

type Props = {
  tracks: Track[];
  /** 화면 스크롤 위치입니다. 이 값으로 디스크를 넘깁니다. */
  scrollY: SharedValue<number>;
  /** 스크롤 영역의 높이입니다. */
  viewport: number;
  scrollTo: (y: number) => void;
  onPlay: (track: Track) => void;
  header: ReactNode;
};

/** 디스크 하나를 넘기는 데 드는 스크롤 거리(화면 높이 기준)입니다. */
const PIN_STEP = 0.8;
/** 이보다 낮은 창은 고정할 자리가 모자라 일반 스크롤로 보여 줍니다. */
const MIN_PIN_HEIGHT = 520;

type DiscProps = { track: Track; position: number; progress: SharedValue<number>; size: number; spacing: number; lift: number };

function StageDisc({ track, position, progress, size, spacing, lift }: DiscProps) {
  const style = useAnimatedStyle(() => {
    const offset = position - progress.get();
    const distance = Math.abs(offset);
    return {
      opacity: distance > 1.6 ? 0 : 1,
      transform: [
        { translateX: offset * spacing },
        { translateY: -offset * lift },
        { scale: interpolate(distance, [0, 1], [1, 0.84], Extrapolation.CLAMP) },
        { rotate: `${offset * 16}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[stageDiscStyle, style]}>
      <Disc uri={track.artUri} size={size} tilted />
    </Animated.View>
  );
}

/** 첫 화면에 고정한 채 스크롤에 따라 순위별 디스크를 옆으로 넘깁니다. */
export function DiscStage({ tracks, scrollY, viewport, scrollTo, onPlay, header }: Props) {
  const { width } = useWindowDimensions();
  const reduced = useLiveReducedMotion();
  const tall = viewport >= MIN_PIN_HEIGHT;
  const pinned = !reduced && tall;
  const wide = width >= WIDE_LAYOUT_MIN_WIDTH && tall;

  const last = tracks.length - 1;
  const distance = viewport * PIN_STEP;
  const pinMax = distance * last;

  const [index, setIndex] = useState(0);
  const selected = useSharedValue(0);
  const progress = useDerivedValue(() =>
    pinned ? interpolate(scrollY.get(), [0, Math.max(pinMax, 1)], [0, last], Extrapolation.CLAMP) : selected.get(),
  );

  useAnimatedReaction(
    () => Math.round(progress.get()),
    (current, previous) => {
      if (current !== previous) scheduleOnRN(setIndex, current);
    },
  );

  const pinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pinned ? Math.max(0, Math.min(scrollY.get(), pinMax)) : 0 }],
  }));

  // 스크롤을 쓸 수 없는 사람도 키보드와 버튼으로 같은 내용을 볼 수 있어야 합니다.
  const go = (next: number) => {
    if (pinned) {
      scrollTo(next * distance);
      return;
    }
    selected.set(next);
    setIndex(next);
  };

  const size = wide ? Math.min(viewport * 0.62, 520, width * 0.5) : Math.min(width - 96, Math.max(180, viewport * 0.34));
  const spacing = size * 1.12;
  const lift = size * (wide ? 0.38 : 0.16);

  const position = Math.min(index, last);
  const track = tracks[position];
  const title = displayTitle(track);
  const rank = track.rank ?? position + 1;

  const info = (
    <View aria-live="polite" style={wide ? styles.infoWide : styles.info}>
      <AppText variant="title" role="heading" aria-level={2} numberOfLines={2} style={[styles.title, !wide && styles.centered]}>
        {title}
      </AppText>
      <MetaRow label="가수">{track.artists.join(', ')}</MetaRow>
      <MetaRow label="발매일">{formatDate(track.released)}</MetaRow>
      <MetaRow label="음질">{formatQuality(track.format)}</MetaRow>
    </View>
  );

  const rankLabel = <AppText variant="label">오늘의 {rank}위</AppText>;
  const counter = <AppText variant="caption" tone="muted">{position + 1} / {tracks.length}</AppText>;

  const controls = (
    <View style={wide ? styles.controlsWide : styles.controls}>
      <IconButton icon="chevron-back" label="이전 순위" disabled={position === 0} onPress={() => go(position - 1)} />
      <AppButton variant="rule" label="듣기" aria-label={`${title} 듣기`} onPress={() => onPlay(track)} />
      <IconButton icon="chevron-forward" label="다음 순위" disabled={position === last} onPress={() => go(position + 1)} />
    </View>
  );

  const discs = (
    <View pointerEvents="none" aria-hidden style={wide ? styles.discsWide : [styles.discs, { minHeight: size + 24 }]}>
      {tracks.map((item, i) => (
        <StageDisc key={item.id} track={item} position={i} progress={progress} size={size} spacing={spacing} lift={lift} />
      ))}
    </View>
  );

  return (
    <View style={[styles.root, { minHeight: viewport }, pinned && { height: viewport + pinMax }]}>
      <Animated.View style={[{ minHeight: viewport }, pinned && { height: viewport }, pinStyle]}>
        {wide ? (
          <View style={styles.stageWide}>
            {discs}
            <View style={styles.leftWide}>
              {header}
              {info}
            </View>
            <View style={styles.rankWide}>
              <AppText aria-hidden style={styles.rankNumber}>{rank}</AppText>
              {rankLabel}
              {counter}
            </View>
            {controls}
          </View>
        ) : (
          <View style={styles.stage}>
            {header}
            <View style={styles.rankNarrow}>
              {rankLabel}
              {counter}
            </View>
            {discs}
            {info}
            {controls}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

// Animated.View는 React Native 기본 컴포넌트가 아니라 고정 값을 직접 넘깁니다.
const stageDiscStyle = { position: 'absolute' } as const;

const styles = StyleSheet.create((theme) => ({
  root: { overflow: 'hidden' },
  stage: { flex: 1, paddingBottom: theme.spacing.md, gap: theme.spacing.xs },
  stageWide: { flex: 1 },
  discs: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  discsWide: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  leftWide: { position: 'absolute', top: 0, left: 0, width: 300 },
  info: { paddingHorizontal: theme.spacing.lg },
  infoWide: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xs },
  title: { paddingBottom: theme.spacing.xs },
  centered: { textAlign: 'center' },
  rankNarrow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: theme.spacing.md },
  rankWide: { position: 'absolute', right: theme.spacing.lg, bottom: theme.spacing.lg, alignItems: 'flex-end', gap: 2 },
  rankNumber: { fontFamily: SERIF_FONT, fontSize: 96, lineHeight: 108, letterSpacing: -3, color: theme.colors.text },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg, paddingTop: theme.spacing.xs },
  controlsWide: { position: 'absolute', left: '50%', bottom: theme.spacing.lg, transform: [{ translateX: '-50%' }], flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg },
}));
