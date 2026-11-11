/**
 * 앱 번들에 넣는 전체 글꼴입니다. 내려받기 비용이 없어 모든 한글 음절을 담은 원본을 씁니다.
 * 키는 `shared/config/theme.ts`의 글꼴 이름입니다.
 */
export const FONT_SOURCES: Record<string, number> = {
  /** 본문: Nanum Myeongjo */
  GaonSerif: require('../../assets/fonts/NanumMyeongjo-Regular.ttf'),
  /** 제목: Diphylleia */
  Diphylleia: require('../../assets/fonts/Diphylleia-Regular.ttf'),
  /** 음질 표시: Nanum Gothic Coding */
  GaonMono: require('../../assets/fonts/NanumGothicCoding-Regular.ttf'),
};
