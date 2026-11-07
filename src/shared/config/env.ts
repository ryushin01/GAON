/** 설치한 앱도 접속할 수 있는 공개 주소가 기본값입니다. 개발 중에는 .env로 바꿉니다. */
const DEFAULT_MEDIA_BASE_URL = 'https://ryushin01.github.io/GAON/media';

export const MEDIA_BASE_URL = (process.env.EXPO_PUBLIC_MEDIA_BASE_URL ?? DEFAULT_MEDIA_BASE_URL).replace(/\/$/, '');
