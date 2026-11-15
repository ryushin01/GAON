/**
 * 앱 번들에 넣는 글꼴입니다. 모바일 앱의 본문과 제목은 LINE Seed(굵기마다 따로), 라벨은 고정폭 글꼴입니다.
 * 웹·PC 앱의 본문과 제목은 public/fonts의 Lexend·함렛을 씁니다.
 * 키는 `shared/config/theme.ts`의 글꼴 이름입니다.
 */
export const FONT_SOURCES: Record<string, number> = {
  /** 라벨과 수치: Nanum Gothic Coding */
  GaonMono: require('../../assets/fonts/NanumGothicCoding-Regular.ttf'),
  /** 모바일 앱 본문과 제목: LINE Seed */
  'GaonSans-Thin': require('../../assets/fonts/LINESeedKR-Thin.ttf'),
  'GaonSans-Regular': require('../../assets/fonts/LINESeedKR-Regular.ttf'),
  'GaonSans-Bold': require('../../assets/fonts/LINESeedKR-Bold.ttf'),
};
