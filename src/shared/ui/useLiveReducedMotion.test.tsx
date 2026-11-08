import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useLiveReducedMotion } from './useLiveReducedMotion';

let notify: (enabled: boolean) => void = () => undefined;
let addListener: jest.SpyInstance;

beforeAll(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  addListener = jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_event: string, handler: (enabled: boolean) => void) => {
    notify = handler;
    return { remove: jest.fn() };
  }) as never);
});

describe('useLiveReducedMotion', () => {
  it('여러 곳에서 써도 한 번만 구독하고, 하나가 사라져도 나머지는 설정을 따릅니다', async () => {
    const first = await renderHook(() => useLiveReducedMotion());
    const second = await renderHook(() => useLiveReducedMotion());
    expect(addListener).toHaveBeenCalledTimes(1);

    await first.unmount();
    await act(async () => notify(true));
    expect(second.result.current).toBe(true);
  });
});
