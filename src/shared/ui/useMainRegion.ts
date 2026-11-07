import { useIsFocused } from 'expo-router';
import { useEffect, useRef, type ComponentRef } from 'react';
import { Platform, type View } from 'react-native';

let firstScreen = true;

/**
 * 현재 화면의 본문 영역을 표시합니다. 이전 화면도 숨겨진 채 남아 있으므로 현재 화면에만 바로가기 대상 id를 답니다.
 * 웹에서 화면을 옮기면 초점을 새 본문으로 옮깁니다. 처음 연 화면은 본문 바로가기부터 지나도록 그대로 둡니다.
 */
export function useMainRegion() {
  const focused = useIsFocused();
  const ref = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || !focused) return;
    if (firstScreen) {
      firstScreen = false;
      return;
    }
    (ref.current as unknown as HTMLElement | null)?.focus?.({ preventScroll: true });
  }, [focused]);
  return { ref, nativeID: focused ? 'main' : undefined };
}
