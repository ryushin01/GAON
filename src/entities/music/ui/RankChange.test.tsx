import { rankChangeLabel } from './RankChange';

describe('rankChangeLabel', () => {
  it('변동을 글로 설명합니다', () => {
    expect(rankChangeLabel(3)).toBe('3계단 상승');
    expect(rankChangeLabel(-7)).toBe('7계단 하락');
    expect(rankChangeLabel(0)).toBe('순위 변동 없음');
    expect(rankChangeLabel(0, true)).toBe('신규 진입');
  });
});
