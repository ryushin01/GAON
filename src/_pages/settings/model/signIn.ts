import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { setDemoSession, setOwnerSession, type SessionKind } from '@/entities/session';
import { AUTH_CALLBACK_URL, fetchGitHubLogin, forgetLibraryGist, isDesktopApp, supabase } from '@/shared/api';
import { OWNER_GITHUB_LOGIN } from '@/shared/config';

export type SocialProvider = 'kakao' | 'google' | 'github';

type DesktopAuth = { signIn: (url: string) => Promise<string> };

function client() {
  if (!supabase) throw new Error('로그인을 쓸 수 없는 빌드입니다.');
  return supabase;
}

/** 돌아온 주소에서 코드를 꺼내 로그인을 끝냅니다. */
export async function completeSignIn(callbackUrl: string, flowId?: string | null) {
  const url = new URL(callbackUrl);
  const params = new URLSearchParams(url.search);
  const failure = params.get('error_description') ?? params.get('error');
  if (failure) throw new Error(failure);
  const code = params.get('code');
  if (!code) throw new Error('로그인 응답에 코드가 없습니다.');
  const { error } = await client().auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
  if (error) throw error;
}

/**
 * 소셜 로그인을 시작합니다. 웹은 이 페이지로 돌아오고, PC 앱과 모바일 앱은
 * 시스템 브라우저에서 로그인한 뒤 앱 주소로 돌아옵니다. 사용자가 창을 닫으면 false를 돌려줍니다.
 */
export async function signIn(provider: SocialProvider): Promise<boolean> {
  // 로그인 서버가 없는 빌드는 서버에 가지 않고 데모 사용자로 들어갑니다.
  if (!supabase) {
    setDemoSession(provider);
    return true;
  }
  const auth = client().auth;
  if (Platform.OS === 'web' && !isDesktopApp()) {
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) throw error;
    return true;
  }
  const { data, error } = await auth.signInWithOAuth({ provider, options: { redirectTo: AUTH_CALLBACK_URL, skipBrowserRedirect: true } });
  if (error) throw error;
  if (isDesktopApp()) {
    const callback = await (window as unknown as { gaonAuth: DesktopAuth }).gaonAuth.signIn(data.url);
    await completeSignIn(callback, data.flowId);
    return true;
  }
  const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_CALLBACK_URL);
  if (result.type !== 'success') return false;
  await completeSignIn(result.url, data.flowId);
  return true;
}

/** 소유자의 GitHub 토큰으로 로그인합니다. 토큰 주인이 소유자 계정이 아니면 거절합니다. */
export async function signInOwner(token: string) {
  const trimmed = token.trim();
  if (!trimmed) throw new Error('토큰을 입력해 주세요.');
  const login = await fetchGitHubLogin(trimmed);
  if (login.toLowerCase() !== OWNER_GITHUB_LOGIN.toLowerCase()) throw new Error('이 앱의 소유자 계정이 아닙니다.');
  setOwnerSession({ login, token: trimmed });
}

export async function signOut(kind: SessionKind) {
  if (kind === 'owner') {
    setOwnerSession(null);
    forgetLibraryGist();
    return;
  }
  if (kind === 'demo') {
    setDemoSession(null);
    return;
  }
  const { error } = await client().auth.signOut();
  if (error) throw error;
}

/** 계정과 서버의 보관함을 지웁니다. 이 기기의 보관함은 그대로 둡니다. */
export async function deleteAccount() {
  const { error } = await client().rpc('delete_my_account');
  if (error) throw error;
  await client().auth.signOut({ scope: 'local' });
}
