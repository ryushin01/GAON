import { nearby, withNearby } from './loadedDiscs';

describe('홈 디스크 이미지 받기', () => {
  it('처음에는 첫 순위와 그 뒤 두 장을 받습니다', () => {
    expect(nearby(0, 11)).toEqual([0, 1, 2]);
  });

  it('멀리 건너뛰면 건너뛴 디스크는 더하지 않습니다', () => {
    const loaded = withNearby(new Set(nearby(0, 11)), 9, 11);
    expect([...loaded].sort((a, b) => a - b)).toEqual([0, 1, 2, 8, 9, 10, 11]);
  });

  it('더할 것이 없으면 같은 집합을 돌려줍니다', () => {
    const loaded = new Set([0, 1, 2]);
    expect(withNearby(loaded, 1, 11)).not.toBe(loaded);
    const after = withNearby(new Set([0, 1, 2, 3]), 1, 11);
    expect(withNearby(after, 1, 11)).toBe(after);
  });
});
