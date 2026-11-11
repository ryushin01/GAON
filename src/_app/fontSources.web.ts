/* eslint-disable @typescript-eslint/no-require-imports -- Metro 자산은 require로 불러옵니다. */
/**
 * 웹과 PC 앱은 KS X 1001 한글과 라틴 문자만 남긴 WOFF2를 받습니다(`scripts/subset-fonts.py`).
 * 없는 글자는 시스템 글꼴로 나옵니다.
 */
export const FONT_SOURCES: Record<string, string> = {
  /** 본문: Nanum Myeongjo */
  GaonSerif: require('../../assets/fonts/GaonSerif-subset.woff2'),
  /** 제목(한글): Diphylleia */
  Diphylleia: require('../../assets/fonts/Diphylleia-subset.woff2'),
  /** 제목(영문·숫자): Cormorant 라틴 문자 */
  Cormorant: require('../../assets/fonts/Cormorant-latin.woff2'),
  /** 음질 표시: Nanum Gothic Coding의 라틴 문자 */
  GaonMono: require('../../assets/fonts/GaonMono-subset.woff2'),
};
