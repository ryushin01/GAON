import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { SUPABASE_ENABLED, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../config';

import './urlPolyfill';

/** 앱과 PC 앱이 로그인 뒤 돌아오는 주소입니다. */
export const AUTH_CALLBACK_URL = 'gaon://auth-callback';

/** PC 앱은 웹 화면을 쓰지만, 로그인은 시스템 브라우저에서 하고 앱 주소로 돌아옵니다. */
export function isDesktopApp() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && 'gaonAuth' in window;
}

let client: Promise<SupabaseClient> | null = null;

/**
 * 로그인 서버 클라이언트입니다. 키가 없는 빌드(공개 데모)에서는 null이고,
 * SDK를 처음 필요할 때 따로 받아 첫 화면에 싣지 않습니다.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!SUPABASE_ENABLED) return Promise.resolve(null);
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'pkce',
        // 웹은 돌아온 주소의 코드를 바로 처리하고, 앱과 PC 앱은 직접 처리합니다.
        detectSessionInUrl: Platform.OS === 'web' && !isDesktopApp(),
      },
    }),
  );
  return client;
}
