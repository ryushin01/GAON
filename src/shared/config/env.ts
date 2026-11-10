/** 설치한 앱도 접속할 수 있는 공개 주소가 기본값입니다. 개발 중에는 .env로 바꿉니다. */
const DEFAULT_MEDIA_BASE_URL = 'https://ryushin01.github.io/GAON/media';

export const MEDIA_BASE_URL = (process.env.EXPO_PUBLIC_MEDIA_BASE_URL ?? DEFAULT_MEDIA_BASE_URL).replace(/\/$/, '');

/** 둘 다 있어야 로그인과 보관함 동기화를 켭니다. 없으면 로그인 화면을 보여 주지 않습니다. */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** 개인정보 처리방침은 어느 플랫폼에서나 같은 공개 주소로 엽니다. */
export const PRIVACY_POLICY_URL = 'https://ryushin01.github.io/GAON/privacy.html';
