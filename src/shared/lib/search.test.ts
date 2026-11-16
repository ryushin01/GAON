import { matchesSearch, normalizeSearch } from './search';

describe('matchesSearch', () => {
  it('대소문자와 띄어쓰기를 무시합니다', () => {
    expect(normalizeSearch(' The  Light ')).toBe('thelight');
    expect(matchesSearch('빛 (The Light)', 'thelight')).toBe(true);
    expect(matchesSearch('유리 도시', '유리도시')).toBe(true);
    expect(matchesSearch('글래스시티', '글래스 시티')).toBe(true);
  });

  it('한글은 초성으로도 찾고, 초성과 글자를 섞어도 됩니다', () => {
    expect(matchesSearch('유신', 'ㅇㅅ')).toBe(true);
    expect(matchesSearch('유신', '유ㅅ')).toBe(true);
    expect(matchesSearch('따뜻한 여름', 'ㄸㄸㅎ')).toBe(true);
    expect(matchesSearch('따뜻한 여름', 'ㄷㄷㅎ')).toBe(false);
    expect(matchesSearch('윤슬', 'ㅇㅅ')).toBe(true);
    expect(matchesSearch('빛', 'ㅇ')).toBe(false);
  });

  it('빈 검색어는 아무것도 찾지 않습니다', () => {
    expect(matchesSearch('유신', '   ')).toBe(false);
  });
});
