/** 앱에 든 데모 카탈로그와, 그 안의 상대 경로를 주소로 바꿀 기준입니다. */
export type Snapshot = {
  raw: unknown;
  /** 앨범 아트·디스크 라벨의 기준 주소입니다. */
  baseUrl: string;
  /** 곡마다 음원 주소의 기준입니다. */
  audioBaseFor: (audioPath: string) => string;
};
