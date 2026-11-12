import { act, renderHook } from '@testing-library/react-native';

import { markFirstImage, useFirstImage } from './firstImage';

const WAIT_MS = 60_000;

/** 이 훅이 만든 시간 제한 타이머를 찾습니다. React와 테스트 도구의 타이머와 구분하려고 대기 시간으로 고릅니다. */
function waitTimer(spy: jest.SpyInstance) {
  const index = spy.mock.calls.findIndex(([, delay]) => delay === WAIT_MS);
  return index >= 0 ? spy.mock.results[index].value : undefined;
}

// 신호는 앱 전체에서 한 번만 열리므로, 신호를 보내는 검사를 마지막에 둡니다.
describe('첫 이미지 신호', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('신호가 오기 전에는 시간 제한이 지나야 true가 됩니다', async () => {
    const { result } = await renderHook(() => useFirstImage(4000));
    expect(result.current).toBe(false);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(4000);
    });
    expect(result.current).toBe(true);
  });

  it('기다리는 중에 화면이 사라지면 타이머를 지웁니다', async () => {
    const set = jest.spyOn(global, 'setTimeout');
    const clear = jest.spyOn(global, 'clearTimeout');
    const { unmount } = await renderHook(() => useFirstImage(WAIT_MS));
    const timer = waitTimer(set);
    expect(timer).toBeDefined();
    await unmount();
    expect(clear).toHaveBeenCalledWith(timer);
  });

  it('신호가 오면 바로 true가 되고 타이머를 지우며, 그 뒤로는 타이머를 만들지 않습니다', async () => {
    const set = jest.spyOn(global, 'setTimeout');
    const clear = jest.spyOn(global, 'clearTimeout');
    const { result } = await renderHook(() => useFirstImage(WAIT_MS));
    const timer = waitTimer(set);
    await act(async () => {
      markFirstImage();
      await Promise.resolve();
    });
    expect(result.current).toBe(true);
    expect(clear).toHaveBeenCalledWith(timer);

    set.mockClear();
    const later = await renderHook(() => useFirstImage(WAIT_MS));
    expect(later.result.current).toBe(true);
    expect(waitTimer(set)).toBeUndefined();
  });
});
