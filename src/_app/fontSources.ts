/**
 * 앱 번들에 넣는 글꼴입니다. 본문과 제목은 운영체제 글꼴을 쓰고, 고정폭 글꼴만 넣습니다.
 * 키는 `shared/config/theme.ts`의 글꼴 이름입니다.
 */
export const FONT_SOURCES: Record<string, number> = {
  /** 라벨과 수치: Nanum Gothic Coding */
  GaonMono: require('../../assets/fonts/NanumGothicCoding-Regular.ttf'),
};
