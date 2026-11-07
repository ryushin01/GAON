import { activeLyricIndex } from './LyricsPanel';

jest.mock('@/features/player', () => ({ usePlayerStore: jest.fn() }));

const lines = [{ t: 2, text: '첫 줄' }, { t: 5, text: '둘째 줄' }, { t: 9, text: '셋째 줄' }];

describe('activeLyricIndex', () => {
  it('재생 위치에 맞는 줄을 찾습니다', () => {
    expect(activeLyricIndex(lines, 0)).toBe(-1);
    expect(activeLyricIndex(lines, 5)).toBe(1);
    expect(activeLyricIndex(lines, 100)).toBe(2);
  });
  it('시간 정보가 없는 가사는 강조하지 않습니다', () => {
    expect(activeLyricIndex([{ t: -1, text: '가사' }], 10)).toBe(-1);
  });
});
