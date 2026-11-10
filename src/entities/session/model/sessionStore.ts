import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { supabase } from '@/shared/api';

/**
 * - supabase: 실제 소셜 로그인 (키가 있는 빌드)
 * - demo: 서버에 가지 않는 데모 로그인 (키가 없는 빌드)
 * - owner: 소유자 GitHub 토큰 로그인. 보관함을 비공개 Gist에 저장합니다.
 */
export type SessionKind = 'supabase' | 'demo' | 'owner';
export type AppSession = { kind: SessionKind; userId: string; name: string; provider: string };

type SessionState = {
  session: AppSession | null;
  /** 저장된 로그인 정보를 다 읽었는지입니다. */
  ready: boolean;
};

export const useSessionStore = create<SessionState>(() => ({ session: null, ready: false }));

type LocalAuth = {
  demo: { provider: string } | null;
  owner: { login: string; token: string } | null;
};

/** 데모와 소유자 로그인은 이 기기에만 저장합니다. */
const useLocalAuth = create<LocalAuth>()(
  persist((): LocalAuth => ({ demo: null, owner: null }), { name: 'gaon-local-auth', storage: createJSONStorage(() => AsyncStorage) }),
);

let supabaseSession: Session | null = null;
let supabaseReady = !supabase;

function fromSupabase(session: Session): AppSession {
  const meta = session.user.user_metadata as Record<string, unknown>;
  const name = [meta.name, meta.full_name, meta.user_name, meta.preferred_username, session.user.email].find(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
  return { kind: 'supabase', userId: session.user.id, name: name ?? '이름 없음', provider: String(session.user.app_metadata.provider ?? '') };
}

/** 소유자, 실제 로그인, 데모 순으로 지금 로그인을 정합니다. */
function resolve() {
  const { demo, owner } = useLocalAuth.getState();
  const session: AppSession | null = owner
    ? { kind: 'owner', userId: `github:${owner.login}`, name: owner.login, provider: 'github' }
    : supabaseSession
      ? fromSupabase(supabaseSession)
      : demo
        ? { kind: 'demo', userId: 'demo', name: '데모 사용자', provider: demo.provider }
        : null;
  const ready = supabaseReady && useLocalAuth.persist.hasHydrated();
  useSessionStore.setState({ session, ready });
}

let started = false;

/** 앱을 켤 때 한 번 부릅니다. 저장된 로그인을 읽고 바뀔 때마다 따라갑니다. */
export function startSession() {
  if (started) return;
  started = true;
  useLocalAuth.subscribe(resolve);
  if (useLocalAuth.persist.hasHydrated()) resolve();
  else useLocalAuth.persist.onFinishHydration(resolve);
  if (!supabase) return;
  const client = supabase;
  void client.auth.getSession().then(({ data }) => {
    supabaseSession = data.session;
    supabaseReady = true;
    resolve();
  });
  client.auth.onAuthStateChange((_event, session) => {
    supabaseSession = session;
    supabaseReady = true;
    resolve();
  });
  // 앱이 화면에 있을 때만 로그인을 갱신합니다.
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    });
  }
}

export function setDemoSession(provider: string | null) {
  useLocalAuth.setState({ demo: provider ? { provider } : null });
}

export function setOwnerSession(owner: { login: string; token: string } | null) {
  useLocalAuth.setState({ owner });
}

/** 소유자 로그인의 GitHub 토큰입니다. 소유자가 아니면 null입니다. */
export function getOwnerToken() {
  return useLocalAuth.getState().owner?.token ?? null;
}
