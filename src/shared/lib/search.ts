const SYLLABLE_START = 0xac00;
const SYLLABLE_END = 0xd7a3;
/** 초성 19자(한글 호환 자모). 음절 = 0xAC00 + (초성 × 21 + 중성) × 28 + 종성 */
const INITIALS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const INITIAL_SET = new Set(INITIALS);

/** 검색에서 비교할 모양으로 바꿉니다. 대소문자와 띄어쓰기를 무시합니다. */
export function normalizeSearch(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(/\s+/g, '');
}

function initialOf(char: string): string | null {
  const code = char.charCodeAt(0);
  if (code < SYLLABLE_START || code > SYLLABLE_END) return null;
  return INITIALS[Math.floor((code - SYLLABLE_START) / 588)];
}

/** 검색어의 글자가 같거나, 검색어가 초성(ㅇ)이고 대상 글자의 초성이 같으면 맞습니다. */
const sameChar = (target: string, query: string) => target === query || (INITIAL_SET.has(query) && initialOf(target) === query);

/**
 * 대상 글에 검색어가 들어 있는지 봅니다. 띄어쓰기와 대소문자를 무시하고,
 * 한글은 초성으로도 찾습니다(예: 'ㅇㅅ' → 유신, '유ㅅ' → 유신).
 */
export function matchesSearch(target: string, query: string): boolean {
  const q = [...normalizeSearch(query)];
  if (!q.length) return false;
  const t = [...normalizeSearch(target)];
  if (!q.some((char) => INITIAL_SET.has(char))) return t.join('').includes(q.join(''));
  for (let start = 0; start + q.length <= t.length; start += 1) {
    if (q.every((char, i) => sameChar(t[start + i], char))) return true;
  }
  return false;
}
