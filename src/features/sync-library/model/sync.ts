import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { useLibraryStore } from '@/entities/library';
import { useSessionStore } from '@/entities/session';
import { supabase } from '@/shared/api';

import { decideSync, mergeLibraries, parseSnapshot, type LibrarySnapshot, type SyncMeta } from './merge';

/** 마지막 변경 뒤 이만큼 기다렸다가 한 번에 올립니다. */
const PUSH_DELAY_MS = 1500;

/** 이 기기가 어느 계정과 언제 맞췄는지 기억합니다. */
const useSyncMeta = create<SyncMeta>()(
  persist((): SyncMeta => ({ userId: null, syncedAt: null, dirty: false }), {
    name: 'gaon-library-sync',
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

type SyncStatus = { state: 'idle' | 'syncing' | 'synced' | 'error'; at: number | null; error: string | null };

export const useSyncStatus = create<SyncStatus>(() => ({ state: 'idle', at: null, error: null }));

let applying = false;

function snapshot(): LibrarySnapshot {
  const { likedIds, recentIds, playlists } = useLibraryStore.getState();
  return { likedIds, recentIds, playlists };
}

function apply(next: LibrarySnapshot) {
  applying = true;
  useLibraryStore.setState(next);
  applying = false;
}

async function push(userId: string, data: LibrarySnapshot) {
  if (!supabase) return;
  const { data: row, error } = await supabase.from('libraries').upsert({ user_id: userId, data }).select('updated_at').single();
  if (error) throw error;
  useSyncMeta.setState({ userId, syncedAt: row.updated_at as string, dirty: false });
}

let running: Promise<void> | null = null;

/** 서버와 이 기기의 보관함을 맞춥니다. 이미 맞추는 중이면 그 작업을 기다립니다. */
export function syncNow(): Promise<void> {
  running ??= (async () => {
    const userId = useSessionStore.getState().session?.user.id;
    if (!supabase || !userId) return;
    useSyncStatus.setState({ state: 'syncing', error: null });
    try {
      const { data: row, error } = await supabase.from('libraries').select('data, updated_at').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      const remote = row ? parseSnapshot(row.data) : null;
      const action = decideSync(useSyncMeta.getState(), userId, remote ? (row?.updated_at as string) : null);
      if (action === 'push') await push(userId, snapshot());
      if (action === 'merge' && remote) {
        const merged = mergeLibraries(snapshot(), remote);
        apply(merged);
        await push(userId, merged);
      }
      if (action === 'pull' && remote) {
        apply(remote);
        useSyncMeta.setState({ userId, syncedAt: row?.updated_at as string, dirty: false });
      }
      useSyncStatus.setState({ state: 'synced', at: Date.now() });
    } catch (cause) {
      useSyncStatus.setState({ state: 'error', error: cause instanceof Error ? cause.message : '동기화하지 못했습니다.' });
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

/** 로그아웃하거나 계정을 지우면 다음 로그인 때 다시 합치도록 기록을 지웁니다. */
export function forgetSync() {
  useSyncMeta.setState({ userId: null, syncedAt: null, dirty: false });
  useSyncStatus.setState({ state: 'idle', at: null, error: null });
}

function whenHydrated(store: { persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } }) {
  return new Promise<void>((resolve) => {
    if (store.persist.hasHydrated()) resolve();
    else store.persist.onFinishHydration(() => resolve());
  });
}

let started = false;

/** 앱을 켤 때 한 번 부릅니다. 로그인하면 맞추고, 보관함이 바뀌면 잠시 뒤 올립니다. */
export function startLibrarySync() {
  if (!supabase || started) return;
  started = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ready = Promise.all([whenHydrated(useLibraryStore), whenHydrated(useSyncMeta)]);

  let lastUser: string | undefined;
  useSessionStore.subscribe(({ session }) => {
    const userId = session?.user.id;
    if (userId === lastUser) return;
    lastUser = userId;
    if (userId) void ready.then(syncNow);
    else useSyncStatus.setState({ state: 'idle', at: null, error: null });
  });

  useLibraryStore.subscribe((state, previous) => {
    if (applying) return;
    if (state.likedIds === previous.likedIds && state.recentIds === previous.recentIds && state.playlists === previous.playlists) return;
    useSyncMeta.setState({ dirty: true });
    if (!useSessionStore.getState().session) return;
    clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), PUSH_DELAY_MS);
  });

  // 다른 기기에서 바꾼 내용을 다시 화면에 돌아왔을 때 받습니다.
  if (Platform.OS === 'web') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && useSessionStore.getState().session) void syncNow();
    });
  } else {
    AppState.addEventListener('change', (state) => {
      if (state === 'active' && useSessionStore.getState().session) void syncNow();
    });
  }
}
