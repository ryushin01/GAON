/* eslint-disable @typescript-eslint/no-require-imports -- Metro 자산은 require로 불러옵니다. */
/**
 * 웹과 PC 앱은 라틴 문자만 남긴 고정폭 WOFF2를 받습니다(`scripts/subset-fonts.py`).
 * 라벨의 한글은 글꼴 목록의 다음 글꼴(운영체제 고정폭·산세리프)로 나옵니다. 본문과 제목은 public/fonts의 Lexend·함렛입니다.
 */
export const FONT_SOURCES: Record<string, string> = {
  /** 라벨과 수치: Nanum Gothic Coding의 라틴 문자 */
  GaonMono: require('../../assets/fonts/GaonMono-subset.woff2'),
};
