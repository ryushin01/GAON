import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { PanResponder, Platform, View, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

type Props = {
  value: number;
  max: number;
  label: string;
  valueText: string;
  /** 드래그를 놓았을 때 한 번만 호출합니다. */
  onCommit: (value: number) => void;
  /** 드래그 중 표시용 값입니다. */
  onPreview?: (value: number | null) => void;
  step?: number;
  disabled?: boolean;
};

type Live = Pick<Props, 'max' | 'disabled' | 'onCommit' | 'onPreview'>;

/** 드래그 처리기를 한 번만 만들고, 최신 값은 update로 받습니다. */
function createSliderPan(initial: Live, setDrag: Dispatch<SetStateAction<number | null>>) {
  let live = initial;
  let width = 0;
  let startX = 0;
  let latest = 0;
  const fromX = (x: number) => Math.min(live.max, Math.max(0, width ? (x / width) * live.max : 0));
  const show = (value: number | null) => {
    setDrag(value);
    live.onPreview?.(value);
  };
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => !live.disabled,
    onMoveShouldSetPanResponder: () => !live.disabled,
    onPanResponderGrant: (e) => {
      startX = e.nativeEvent.locationX;
      latest = fromX(startX);
      show(latest);
    },
    onPanResponderMove: (_, g) => {
      latest = fromX(startX + g.dx);
      show(latest);
    },
    // 손을 떼야 위치가 바뀝니다. 다른 곳으로 뺏기면 취소합니다.
    onPanResponderRelease: () => {
      show(null);
      live.onCommit(latest);
    },
    onPanResponderTerminate: () => show(null),
  });
  return {
    handlers: responder.panHandlers,
    update: (next: Live) => {
      live = next;
    },
    setWidth: (value: number) => {
      width = value;
    },
  };
}

/** 포인터와 키보드, 스크린 리더로 모두 조작할 수 있는 재생 위치 슬라이더입니다. */
export function Slider({ value, max, label, valueText, onCommit, onPreview, step = 5, disabled = false }: Props) {
  const [drag, setDrag] = useState<number | null>(null);
  const [pan] = useState(() => createSliderPan({ max, disabled, onCommit, onPreview }, setDrag));
  useEffect(() => {
    pan.update({ max, disabled, onCommit, onPreview });
  });
  const clamp = (v: number) => Math.min(max, Math.max(0, v));

  const shown = drag ?? value;
  const percent = max > 0 ? `${Math.min(100, (shown / max) * 100)}%` : '0%';
  const nudge = (delta: number) => !disabled && onCommit(clamp(value + delta));

  // 웹에서만 받는 키보드 속성이라 React Native 타입에는 없습니다.
  const webProps: Record<string, unknown> =
    Platform.OS === 'web'
      ? {
          tabIndex: disabled ? -1 : 0,
          onKeyDown: (e: { key: string; preventDefault: () => void }) => {
            const actions: Record<string, () => void> = {
              ArrowRight: () => nudge(step),
              ArrowUp: () => nudge(step),
              ArrowLeft: () => nudge(-step),
              ArrowDown: () => nudge(-step),
              Home: () => !disabled && onCommit(0),
              End: () => !disabled && onCommit(max),
            };
            if (actions[e.key]) {
              e.preventDefault();
              actions[e.key]();
            }
          },
        }
      : {};

  return (
    <View
      {...pan.handlers}
      {...webProps}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={valueText}
      aria-disabled={disabled || undefined}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e: AccessibilityActionEvent) => nudge(e.nativeEvent.actionName === 'increment' ? step : -step)}
      onLayout={(e: LayoutChangeEvent) => pan.setWidth(e.nativeEvent.layout.width)}
      style={styles.hit}
    >
      <View style={styles.track} pointerEvents="none">
        <View style={[styles.fill, { width: percent as `${number}%` }]} />
      </View>
      <View style={[styles.thumb, { left: percent as `${number}%` }]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  hit: { height: 44, justifyContent: 'center' },
  track: { height: 4, backgroundColor: theme.colors.stage.surface, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: theme.colors.stage.accent },
  thumb: {
    position: 'absolute',
    width: 4,
    height: 18,
    marginLeft: -2,
    backgroundColor: theme.colors.stage.text,
  },
}));
