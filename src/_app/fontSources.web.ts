/* eslint-disable @typescript-eslint/no-require-imports -- Metro 자산은 require로 불러옵니다. */
/**
 * 웹과 PC 앱은 라틴 문자만 남긴 고정폭 WOFF2를 받습니다(`scripts/subset-fonts.py`).
 * 한글은 운영체제 글꼴로 나옵니다.
 */
export const FONT_SOURCES: Record<string, string> = {
  /** 라벨과 수치: Nanum Gothic Coding의 라틴 문자 */
  GaonMono: require('../../assets/fonts/GaonMono-subset.woff2'),
};
