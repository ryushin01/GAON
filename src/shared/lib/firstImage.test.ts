import { markFirstImage, whenFirstImage } from './firstImage';

describe('첫 이미지 신호', () => {
  it('신호가 오기 전에는 시간 제한이 지나야 끝납니다', async () => {
    jest.useFakeTimers();
    let done = false;
    void whenFirstImage(4000).then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);
    jest.advanceTimersByTime(4000);
    await Promise.resolve();
    await Promise.resolve();
    expect(done).toBe(true);
    jest.useRealTimers();
  });

  it('신호가 오면 바로 끝납니다', async () => {
    markFirstImage();
    await expect(whenFirstImage(60_000)).resolves.toBeUndefined();
  });
});
