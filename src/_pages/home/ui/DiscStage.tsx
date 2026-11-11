import type { ComponentRef, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { displayTitle, formatQualityShort, type Track } from '@/entities/music';
import { SERIF_FONT, WIDE_LAYOUT_MIN_WIDTH } from '@/shared/config';
import { formatCount } from '@/shared/lib';
import { AppText, Disc, Icon, MetaRow, useLiveReducedMotion, useNavSlot, VisuallyHidden } from '@/shared/ui';

import { snapIndex, wheelPixels } from '../lib/wheel';
import { TrackIndex } from './TrackIndex';

type Props = {
  tracks: Track[];
  /** 스테이지의 높이입니다. */
  viewport: number;
  /** 다른 화면이 위에 있으면 꺼서 키보드 입력을 가로채지 않습니다. */
  active: boolean;
  playingId?: string;
  onPlay: (track: Track) => void;
  onOpen: (track: Track) => void;
  header: ReactNode;
  /** 휠로 디스크를 넘겨도 되는지 묻습니다. 페이지가 아래로 스크롤된 동안에는 페이지가 휠을 씁니다. */
  canCapture?: () => boolean;
  /** 아래의 최신 앨범과 TOP 100으로 내려갑니다. */
  onMore?: () => void;
};

/** 디스크 하나를 넘기는 데 드는 휠 거리입니다. */
const WHEEL_STEP = 560;
/** 동작 줄이기에서는 이만큼 굴리면 한 칸만 넘어갑니다. */
const REDUCED_WHEEL_STEP = 100;
const SNAP_DELAY_MS = 160;
/** 지금 순위에서 이만큼 앞의 디스크까지 이미지를 미리 받습니다. */
const PRELOAD_AHEAD = 2;
const SPRING = { damping: 26, stiffness: 130, mass: 1 };
/** 이보다 낮은 창은 한 화면에 담기 어려워 세로로 스크롤합니다. */
const MIN_STAGE_HEIGHT = 560;

/** 디스크가 놓이는 대각선입니다. 왼쪽은 멀고 작게, 오른쪽은 가깝고 크게 보입니다. */
const OFFSETS = [-3, -2, -1, 0, 1, 2];
const X = [-2.6, -1.78, -0.9, 0, 1.08, 2.2];
const Y = [0.3, 0.29, 0.21, 0, -0.34, -0.6];
const SCALE = [0.45, 0.6, 0.8, 1, 1.06, 1.1];
const OPACITY = [0, 1, 1, 1, 1, 0];

type DiscProps = { track: Track; position: number; progress: SharedValue<number>; size: number; spinning: boolean; load: boolean; important: boolean };

function StageDisc({ track, position, progress, size, spinning, load, important }: DiscProps) {
  const style = useAnimatedStyle(() => {
    const offset = position - progress.get();
    return {
      opacity: interpolate(offset, OFFSETS, OPACITY, Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(offset, OFFSETS, X, Extrapolation.CLAMP) * size },
        { translateY: interpolate(offset, OFFSETS, Y, Extrapolation.CLAMP) * size },
        { scale: interpolate(offset, OFFSETS, SCALE, Extrapolation.CLAMP) },
        { rotate: `${offset * 7}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[stageDiscStyle, style]}>
      <Disc uri={load ? track.artUri : undefined} size={size} tilted spinning={spinning} priority={important ? 'high' : 'normal'} />
    </Animated.View>
  );
}

/** 긴 크레딧을 사람마다 한 줄로 보여 줍니다. */
function credits(track: Track) {
  return [...new Set([...track.lyricists, ...track.composers, ...track.arrangers])];
}

/** 곡마다 다른 인용구 두 개입니다. 가사가 있는 곡만 보여 줍니다. */
function quotesOf(track: Track) {
  const lines = track.lyrics.map((line) => line.text).filter(Boolean);
  if (lines.length === 0) return [];
  const first = { stat: formatQualityShort(track.format), source: track.lyricists[0] ?? track.artists[0], text: lines[0] };
  const last = lines[lines.length - 1];
  return last === lines[0]
    ? [first]
    : [first, { stat: track.likes != null ? `좋아요 ${formatCount(track.likes)}` : track.albumTitle, source: track.artists[0], text: last }];
}

/** 순위별 디스크를 대각선으로 늘어놓고 휠, 끌기, 방향키, 양옆 디스크로 넘기는 한 화면입니다. */
export function DiscStage({ tracks, viewport, active, playingId, onPlay, onOpen, header, canCapture, onMore }: Props) {
  const { theme } = useUnistyles();
  const { width } = useWindowDimensions();
  const reduced = useLiveReducedMotion();
  const fits = viewport >= MIN_STAGE_HEIGHT;
  const wide = width >= WIDE_LAYOUT_MIN_WIDTH && fits;
  const last = tracks.length - 1;

  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const progress = useSharedValue(0);
  const target = useSharedValue(0);
  const panStart = useSharedValue(0);
  const wheelRest = useRef(0);
  const wheelStart = useRef<number | null>(null);
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const toggleRef = useRef<ComponentRef<typeof View>>(null);
  const setNavNode = useNavSlot((s) => s.setNode);

  useAnimatedReaction(
    () => Math.round(progress.get()),
    (current, previous) => {
      if (current !== previous) scheduleOnRN(setIndex, current);
    },
  );

  const moveTo = useCallback(
    (value: number) => {
      const next = Math.max(0, Math.min(last, value));
      target.set(next);
      progress.set(reduced ? Math.round(next) : withSpring(next, SPRING));
    },
    [last, progress, reduced, target],
  );

  /**
   * 지금 목표에서 한 칸씩 옮깁니다. 앱에서는 목표 값이 애니메이션 스레드에 있어,
   * 빠르게 두 번 누를 때 같은 값을 읽지 않도록 그 스레드에서 읽고 바꾸기를 한 번에 합니다.
   */
  const moveBy = useCallback(
    (step: number) => {
      scheduleOnUI(() => {
        'worklet';
        const next = Math.max(0, Math.min(last, Math.round(target.get()) + step));
        target.set(next);
        progress.set(reduced ? next : withSpring(next, SPRING));
      });
    },
    [last, progress, reduced, target],
  );

  const closeIndex = useCallback(() => {
    setOpen(false);
    (toggleRef.current as unknown as HTMLElement | null)?.focus?.();
  }, []);

  // 휠은 디스크를 넘깁니다. 첫 곡이나 마지막 곡에 닿으면 페이지를 스크롤합니다.
  useEffect(() => {
    if (Platform.OS !== 'web' || !fits) return;
    const element = rootRef.current as unknown as HTMLElement | null;
    if (!element) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (event: WheelEvent) => {
      // Ctrl+휠과 핀치는 브라우저의 화면 확대에 맡깁니다.
      if (open || event.ctrlKey) return;
      if (canCapture && !canCapture()) return;
      const delta = wheelPixels(event, viewport);
      const position = target.get();
      // 끝에 닿은 뒤 같은 방향의 휠은 관성이 남아 있어도 바로 페이지에 넘깁니다.
      if ((delta > 0 && position >= last - 0.001) || (delta < 0 && position <= 0.001)) {
        clearTimeout(timer);
        wheelStart.current = null;
        wheelRest.current = 0;
        return;
      }
      event.preventDefault();
      if (reduced) {
        wheelRest.current += delta;
        if (Math.abs(wheelRest.current) >= REDUCED_WHEEL_STEP) {
          moveTo(Math.round(target.get()) + Math.sign(wheelRest.current));
          wheelRest.current = 0;
        }
        return;
      }
      wheelStart.current ??= Math.round(target.get());
      moveTo(target.get() + delta / WHEEL_STEP);
      clearTimeout(timer);
      timer = setTimeout(() => {
        moveTo(snapIndex(wheelStart.current ?? Math.round(target.get()), target.get(), last));
        wheelStart.current = null;
      }, SNAP_DELAY_MS);
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      clearTimeout(timer);
      element.removeEventListener('wheel', onWheel);
      // 멈추기 전에 끊긴 휠은 바로 제자리를 찾아, 다음 휠에 옛 시작점이 남지 않게 합니다.
      if (wheelStart.current != null) {
        moveTo(snapIndex(wheelStart.current, target.get(), last));
        wheelStart.current = null;
      }
    };
  }, [canCapture, fits, last, moveTo, open, reduced, target, viewport]);

  // 방향키로 넘기고, 목록은 Esc로 닫습니다.
  useEffect(() => {
    if (Platform.OS !== 'web' || !active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (open) {
        if (event.key === 'Escape') closeIndex();
        return;
      }
      const element = event.target as HTMLElement;
      if (element.closest?.('input, textarea, select, [role="slider"]')) return;
      const current = Math.round(target.get());
      // 낮은 창은 세로로 스크롤하므로 세로 이동 키를 남겨 둡니다.
      const sideways: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1 };
      const keys: Record<string, number> = fits ? { ...sideways, ArrowDown: current + 1, PageDown: current + 1, ArrowUp: current - 1, PageUp: current - 1, Home: 0, End: last } : sideways;
      const next = keys[event.key];
      if (next == null) return;
      event.preventDefault();
      moveTo(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, closeIndex, fits, last, moveTo, open, target]);

  const size = wide ? Math.min(viewport * 0.6, width * 0.42, 640) : Math.min(width * 0.68, Math.max(170, viewport * 0.36));

  // 가로로 끌어서 넘깁니다. 세로로 밀면 페이지를 스크롤합니다.
  const pan = useMemo(() => {
    const gesture = Gesture.Pan()
      .enabled(!open)
      .minDistance(12)
      .onStart(() => {
        panStart.set(progress.get());
      })
      .onUpdate((event) => {
        const travel = event.translationX / (size * 1.2);
        progress.set(Math.max(0, Math.min(last, panStart.get() - travel)));
      })
      .onEnd((event) => {
        const landed = Math.max(0, Math.min(last, Math.round(progress.get() - event.velocityX / 2600)));
        progress.set(reduced ? landed : withSpring(landed, SPRING));
        target.set(landed);
      });
    return gesture.activeOffsetX([-14, 14]).failOffsetY([-14, 14]);
  }, [last, open, panStart, progress, reduced, size, target]);

  const position = Math.min(index, last);
  // 화면에 보이는 가까운 디스크만 이미지를 받고, 넘기면서 다음 것을 받습니다. 한 번 받은 것은 그대로 둡니다.
  const [loadedUntil, setLoadedUntil] = useState(PRELOAD_AHEAD);
  if (position + PRELOAD_AHEAD > loadedUntil) setLoadedUntil(position + PRELOAD_AHEAD);
  const track = tracks[position];
  const title = displayTitle(track);
  const names = credits(track);
  const quotes = quotesOf(track).slice(0, wide ? 2 : 1);
  const enter = reduced ? undefined : FadeInDown.duration(360);

  const toggle = useMemo(
    () => (
      <Pressable ref={toggleRef} role="button" aria-expanded={open} onPress={() => (open ? closeIndex() : setOpen(true))} style={styles.toggle}>
        <Text style={styles.toggleLabel}>목록</Text>
        <Icon aria-hidden name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.text} />
      </Pressable>
    ),
    [closeIndex, open, theme.colors.text],
  );

  useEffect(() => {
    setNavNode(wide && active ? toggle : null);
    return () => setNavNode(null);
  }, [active, setNavNode, toggle, wide]);

  const info = (
    <View aria-live="polite" style={wide ? styles.infoWide : styles.info}>
      <Animated.View key={track.id} entering={enter}>
        <Pressable role="link" onPress={() => onOpen(track)}>
          <Text role="heading" aria-level={2} numberOfLines={2} style={styles.title}>{title}</Text>
        </Pressable>
        <MetaRow label="가수">{track.artists.join(', ')}</MetaRow>
        <MetaRow label="발매">{track.released?.slice(0, 4) ?? '-'}</MetaRow>
        <MetaRow label="순위">{`${track.rank ?? position + 1}위`}</MetaRow>
        {names.length > 0 && (
          <MetaRow label="참여">
            <AppText numberOfLines={wide ? 4 : 1} style={styles.credits}>{names.join(wide ? '\n' : ', ')}</AppText>
          </MetaRow>
        )}
      </Animated.View>
    </View>
  );

  const quoteRow = quotes.length > 0 && (
    <View style={wide ? styles.quotesWide : styles.quotes}>
      {quotes.map((quote) => (
        <Animated.View key={`${track.id}-${quote.stat}`} entering={enter} style={styles.quote}>
          <AppText variant="caption" style={styles.center}>{quote.stat}</AppText>
          <AppText variant="label" style={styles.quoteSource}>{quote.source}</AppText>
          <Text numberOfLines={2} style={styles.quoteText}>“{quote.text}”</Text>
        </Animated.View>
      ))}
    </View>
  );

  // 디스크를 하나씩 넘기지 않고 아래의 최신 앨범과 TOP 100으로 바로 갑니다.
  const skip = onMore && (
    <Pressable role="button" onPress={onMore} style={styles.skip}>
      <Text style={styles.skipLabel}>건너뛰기</Text>
      <VisuallyHidden> 최신 앨범과 TOP 100으로</VisuallyHidden>
      <Icon aria-hidden name="arrow-down" size={14} color={theme.colors.text} />
    </Pressable>
  );

  const stageHeight = fits ? viewport : undefined;
  const discBand = wide ? styles.discsWide : [styles.discs, { minHeight: size * 1.04 }];

  // 가운데 디스크를 누르면 재생하고, 양옆 디스크를 누르면 그쪽으로 넘어갑니다.
  // 넘어가는 중에 또 눌러도 한 칸씩 더 가도록 화면의 순위가 아니라 목표 순위를 기준으로 합니다.
  const zone = (center: number, zoneSize: number) => {
    const left = Math.max(0, center - zoneSize / 2);
    return { left, width: Math.min(width, center + zoneSize / 2) - left };
  };
  const discs = (
    <View style={discBand}>
      <View pointerEvents="none" aria-hidden style={styles.discLayer}>
        {tracks.map((item, i) => (
          <StageDisc
            key={item.id}
            track={item}
            position={i}
            progress={progress}
            size={size}
            spinning={playingId === item.id && i === position}
            load={i <= loadedUntil}
            important={i === position}
          />
        ))}
      </View>
      <View style={[styles.hitRow, { height: size }]}>
        {position > 0 && (
          <Pressable role="button" aria-label="이전 순위" onPress={() => moveBy(-1)} style={[styles.hit, zone(width / 2 - 0.9 * size, size * 0.8)]} />
        )}
        <Pressable role="button" aria-label={`${title} 듣기`} onPress={() => onPlay(track)} style={[styles.hit, styles.hitRound, zone(width / 2, size)]} />
        {position < last && (
          <Pressable role="button" aria-label="다음 순위" onPress={() => moveBy(1)} style={[styles.hit, zone(width / 2 + 1.08 * size, size)]} />
        )}
      </View>
    </View>
  );

  const body = wide ? (
    <View style={styles.flex}>
      {discs}
      <View style={styles.leftWide}>
        {header}
        {info}
      </View>
      {skip && <View style={styles.skipWide}>{skip}</View>}
      {quoteRow}
    </View>
  ) : (
    <View style={[styles.column, fits && styles.flex]}>
      <View style={styles.headerRow}>
        <View style={styles.flex}>{header}</View>
        {skip}
        {toggle}
      </View>
      {info}
      <View style={[styles.flexMin, !fits && { minHeight: size * 1.1 }]}>{discs}</View>
      {quoteRow}
    </View>
  );

  return (
    <GestureDetector gesture={pan}>
      <View ref={rootRef} style={[styles.root, stageHeight ? { height: stageHeight } : undefined]}>
        {open && <TrackIndex tracks={tracks} current={position} wide={wide} onSelect={(i) => { moveTo(i); closeIndex(); }} onClose={closeIndex} />}
        {body}
      </View>
    </GestureDetector>
  );
}

// Animated.View는 React Native 기본 컴포넌트가 아니라 고정 값을 직접 넘깁니다.
const stageDiscStyle = { position: 'absolute' } as const;

const styles = StyleSheet.create((theme) => ({
  root: { overflow: 'hidden', width: '100%' },
  flex: { flex: 1, minWidth: 0 },
  flexMin: { flex: 1, minHeight: 0 },
  column: { gap: theme.spacing.xs, paddingBottom: theme.spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingRight: theme.spacing.sm },
  discs: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  discsWide: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  discLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  hitRow: { width: '100%' },
  hit: { position: 'absolute', top: 0, bottom: 0 },
  hitRound: { borderRadius: 9999 },
  leftWide: { position: 'absolute', top: 0, left: 0, width: 312 },
  info: { paddingHorizontal: theme.spacing.lg },
  infoWide: { paddingHorizontal: theme.spacing.sm },
  title: { fontFamily: SERIF_FONT, fontWeight: '400', color: theme.colors.text, textTransform: 'uppercase', fontSize: { xs: 30, md: 38 }, lineHeight: { xs: 38, md: 46 }, letterSpacing: { xs: -0.8, md: -1.4 }, paddingBottom: theme.spacing.xs },
  credits: { textAlign: 'right' },
  center: { textAlign: 'center' },
  quotes: { alignItems: 'center', paddingHorizontal: theme.spacing.lg },
  quotesWide: { position: 'absolute', left: 0, right: 0, bottom: theme.spacing.xl, flexDirection: 'row', justifyContent: 'center', gap: 56, pointerEvents: 'none' },
  quote: { width: 300, maxWidth: '100%', alignItems: 'center', gap: 2 },
  quoteSource: { textAlign: 'center', fontSize: 11 },
  quoteText: { fontFamily: SERIF_FONT, fontWeight: '400', color: theme.colors.text, textAlign: 'center', fontSize: 22, lineHeight: 27, letterSpacing: -0.6 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: theme.spacing.sm },
  skip: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: theme.spacing.sm },
  skipWide: { position: 'absolute', right: theme.spacing.sm, bottom: 112 },
  skipLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '500', letterSpacing: -0.2, textDecorationLine: 'underline' },
  toggleLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '500', letterSpacing: -0.2 },
}));
