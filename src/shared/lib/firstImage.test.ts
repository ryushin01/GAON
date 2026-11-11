import { markFirstImage, whenFirstImage } from './firstImage';

describe('첫 이미지 신호', () => {
  it('신호가 오기 전에는 시간 제한이 지나야 끝납니다', async () => {
    jest.useFakeTimers();
    let done = false;
    void whenFirstImage(4000).then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);
    await jest.advanceTimersByTimeAsync(4000);
    expect(done).toBe(true);
    jest.useRealTimers();
  });

  it('신호가 오면 바로 끝나고 기다리던 타이머를 남기지 않습니다', async () => {
    jest.useFakeTimers();
    const waiting = whenFirstImage(60_000);
    markFirstImage();
    await expect(waiting).resolves.toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
    await expect(whenFirstImage(60_000)).resolves.toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });
});
