import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../config';

import './urlPolyfill';

/** 앱과 PC 앱이 로그인 뒤 돌아오는 주소입니다. */
export const AUTH_CALLBACK_URL = 'gaon://auth-callback';

/** PC 앱은 웹 화면을 쓰지만, 로그인은 시스템 브라우저에서 하고 앱 주소로 돌아옵니다. */
export function isDesktopApp() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && 'gaonAuth' in window;
}

function create(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'pkce',
      // 웹은 돌아온 주소의 코드를 바로 처리하고, 앱과 PC 앱은 직접 처리합니다.
      detectSessionInUrl: Platform.OS === 'web' && !isDesktopApp(),
    },
  });
}

/** 로그인을 설정하지 않은 빌드에서는 null입니다. */
export const supabase = create();
