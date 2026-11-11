import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useLiveReducedMotion } from './useLiveReducedMotion';

// 이 파일은 모듈을 새로 불러와, 첫 구독이 이 테스트 안에서 일어납니다.
let notify: (enabled: boolean) => void = () => undefined;
let finishLookup: (enabled: boolean) => void = () => undefined;

beforeAll(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(new Promise((resolve) => (finishLookup = resolve)));
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_event: string, handler: (enabled: boolean) => void) => {
    notify = handler;
    return { remove: jest.fn() };
  }) as never);
});

describe('useLiveReducedMotion', () => {
  it('조회하는 사이에 바뀐 설정을 늦게 온 조회 결과가 덮어쓰지 않습니다', async () => {
    const { result } = await renderHook(() => useLiveReducedMotion());
    await act(async () => notify(true));
    expect(result.current).toBe(true);
    await act(async () => finishLookup(false));
    expect(result.current).toBe(true);
  });
});
