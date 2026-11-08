import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

let current: boolean | null = null;
let started = false;
const consumers = new Set<() => void>();

function publish(value: boolean) {
  current = value;
  consumers.forEach((notify) => notify());
}

// react-native-web은 리스너를 함수의 소스 문자열로 구분해, 같은 코드를 여러 곳에서 구독하면
// 하나를 해제할 때 다른 구독까지 사라집니다. 그래서 앱 전체에서 한 번만 구독합니다.
function subscribe(notify: () => void) {
  consumers.add(notify);
  if (!started) {
    started = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(publish);
    AccessibilityInfo.addEventListener('reduceMotionChanged', publish);
  }
  return () => {
    consumers.delete(notify);
  };
}

/** Reanimated의 값은 앱을 켤 때 정해집니다. 사용 중에 바꾼 동작 줄이기 설정도 따릅니다. */
export function useLiveReducedMotion() {
  const initial = useReducedMotion();
  const live = useSyncExternalStore(subscribe, () => current);
  return live ?? initial;
}
