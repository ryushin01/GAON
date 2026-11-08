import { snapIndex, wheelPixels } from './wheel';

describe('wheelPixels', () => {
  it('큰 쪽 축을 씁니다', () => expect(wheelPixels({ deltaX: 5, deltaY: -120, deltaMode: 0 }, 800)).toBe(-120));
  it('줄 단위를 픽셀로 바꿉니다', () => expect(wheelPixels({ deltaX: 0, deltaY: 3, deltaMode: 1 }, 800)).toBe(120));
  it('페이지 단위를 픽셀로 바꿉니다', () => expect(wheelPixels({ deltaX: 0, deltaY: 1, deltaMode: 2 }, 800)).toBe(800));
});

describe('snapIndex', () => {
  it('한 칸만 굴려도 다음 곡으로 넘어갑니다', () => expect(snapIndex(3, 3.2, 11)).toBe(4));
  it('뒤로 굴리면 이전 곡으로 갑니다', () => expect(snapIndex(3, 2.8, 11)).toBe(2));
  it('많이 굴리면 그만큼 넘어갑니다', () => expect(snapIndex(0, 2.6, 11)).toBe(3));
  it('거의 움직이지 않았으면 그대로입니다', () => expect(snapIndex(3, 3.01, 11)).toBe(3));
  it('끝을 넘지 않습니다', () => expect(snapIndex(11, 11.2, 11)).toBe(11));
});
