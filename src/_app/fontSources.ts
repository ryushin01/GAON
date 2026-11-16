/**
 * 앱 번들에 넣는 글꼴입니다. 모바일 앱의 본문과 제목은 LINE Seed(굵기마다 따로), 라벨은 고정폭 글꼴입니다.
 * 모두 KS X 1001 한글 2,350자와 라틴·문장 부호만 남긴 파일입니다(`scripts/subset-fonts.py`, 원본 대비 약 12.5MB → 3MB).
 * 드문 한글은 운영체제가 시스템 글꼴로 대신 그립니다.
 * 웹·PC 앱의 본문과 제목은 public/fonts의 Lexend·함렛을 씁니다.
 * 키는 `shared/config/theme.ts`의 글꼴 이름입니다.
 */
export const FONT_SOURCES: Record<string, number> = {
  /** 라벨과 수치: Nanum Gothic Coding (OFL 예약 이름이라 GaonMono로 바꿈) */
  GaonMono: require('../../assets/fonts/GaonMono-app.ttf'),
  /** 모바일 앱 본문과 제목: LINE Seed */
  'GaonSans-Thin': require('../../assets/fonts/LINESeedKR-Thin-subset.ttf'),
  'GaonSans-Regular': require('../../assets/fonts/LINESeedKR-Regular-subset.ttf'),
  'GaonSans-Bold': require('../../assets/fonts/LINESeedKR-Bold-subset.ttf'),
};
