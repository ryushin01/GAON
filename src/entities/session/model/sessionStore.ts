import type { Session } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';

import { supabase } from '@/shared/api';

type SessionState = {
  session: Session | null;
  /** 저장된 로그인 정보를 다 읽었는지입니다. */
  ready: boolean;
};

export const useSessionStore = create<SessionState>(() => ({ session: null, ready: !supabase }));

let started = false;

/** 앱을 켤 때 한 번 부릅니다. 저장된 로그인을 읽고 바뀔 때마다 따라갑니다. */
export function startSession() {
  if (!supabase || started) return;
  started = true;
  void supabase.auth.getSession().then(({ data }) => useSessionStore.setState({ session: data.session, ready: true }));
  supabase.auth.onAuthStateChange((_event, session) => useSessionStore.setState({ session, ready: true }));
  // 앱이 화면에 있을 때만 로그인을 갱신합니다.
  if (Platform.OS !== 'web') {
    const client = supabase;
    AppState.addEventListener('change', (state) => {
      if (state === 'active') void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    });
  }
}

/** 로그인한 사람의 화면 표시용 정보입니다. */
export function describeUser(session: Session) {
  const meta = session.user.user_metadata as Record<string, unknown>;
  const name = [meta.name, meta.full_name, meta.user_name, meta.preferred_username, session.user.email].find(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
  const provider = String(session.user.app_metadata.provider ?? '');
  return { name: name ?? '이름 없음', provider };
}
