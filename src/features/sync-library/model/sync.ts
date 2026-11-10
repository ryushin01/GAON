import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { useLibraryStore } from '@/entities/library';
import { getOwnerToken, useSessionStore, type AppSession } from '@/entities/session';
import { forgetLibraryGist, readLibraryGist, supabase, writeLibraryGist } from '@/shared/api';

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
/** 이 기기의 보관함이 바뀔 때마다 늘어납니다. 동기화 도중에 바뀌었는지 가립니다. */
let localVersion = 0;

function snapshot(): LibrarySnapshot {
  const { likedIds, recentIds, playlists } = useLibraryStore.getState();
  return { likedIds, recentIds, playlists };
}

function apply(next: LibrarySnapshot) {
  applying = true;
  useLibraryStore.setState(next);
  applying = false;
}

type Remote = {
  pull: () => Promise<{ data: unknown; updatedAt: string } | null>;
  push: (data: LibrarySnapshot) => Promise<string>;
};

/** 로그인 종류에 맞는 저장소입니다. 데모 로그인은 서버가 없어 null입니다. */
function remoteFor(session: AppSession): Remote | null {
  if (session.kind === 'supabase' && supabase) {
    const client = supabase;
    return {
      pull: async () => {
        const { data: row, error } = await client.from('libraries').select('data, updated_at').eq('user_id', session.userId).maybeSingle();
        if (error) throw error;
        return row ? { data: row.data as unknown, updatedAt: row.updated_at as string } : null;
      },
      push: async (data) => {
        const { data: row, error } = await client.from('libraries').upsert({ user_id: session.userId, data }).select('updated_at').single();
        if (error) throw error;
        return row.updated_at as string;
      },
    };
  }
  const token = session.kind === 'owner' ? getOwnerToken() : null;
  if (token) return { pull: () => readLibraryGist(token), push: (data) => writeLibraryGist(token, data) };
  return null;
}

/** 서버에 저장하는 로그인인지입니다. */
function canSync() {
  const session = useSessionStore.getState().session;
  return Boolean(session && session.kind !== 'demo');
}

/** 올리는 사이에 이 기기가 또 바뀌었으면 바뀐 표시를 남겨 다시 올립니다. */
async function push(remote: Remote, userId: string, data: LibrarySnapshot, version: number) {
  const syncedAt = await remote.push(data);
  useSyncMeta.setState({ userId, syncedAt, dirty: localVersion !== version });
}

let running: Promise<void> | null = null;

/** 서버와 이 기기의 보관함을 맞춥니다. 이미 맞추는 중이면 그 작업을 기다립니다. */
export function syncNow(): Promise<void> {
  running ??= (async () => {
    const session = useSessionStore.getState().session;
    const store = session ? remoteFor(session) : null;
    if (!session || !store) return;
    const { userId } = session;
    useSyncStatus.setState({ state: 'syncing', error: null });
    try {
      const startVersion = localVersion;
      const row = await store.pull();
      const remote = row ? parseSnapshot(row.data) : null;
      // 서버 보관함을 읽지 못하면 덮어쓰지 않습니다. 새 버전 앱이 저장한 형식일 수 있습니다.
      if (row && !remote) throw new Error('서버 보관함의 형식을 읽지 못했습니다. 앱을 최신 버전으로 업데이트해 주세요.');
      let action = decideSync(useSyncMeta.getState(), userId, row?.updatedAt ?? null);
      // 받아 오는 사이에 이 기기가 바뀌었으면 덮어쓰지 않고 합칩니다.
      if (action === 'pull' && localVersion !== startVersion) action = 'merge';
      if (action === 'push') await push(store, userId, snapshot(), localVersion);
      if (action === 'merge' && remote) {
        const merged = mergeLibraries(snapshot(), remote);
        apply(merged);
        await push(store, userId, merged, localVersion);
      }
      if (action === 'pull' && remote && row) {
        apply(remote);
        useSyncMeta.setState({ userId, syncedAt: row.updatedAt, dirty: false });
      }
      useSyncStatus.setState({ state: 'synced', at: Date.now() });
    } catch (cause) {
      useSyncStatus.setState({ state: 'error', error: cause instanceof Error ? cause.message : '동기화하지 못했습니다.' });
    }
  })().finally(() => {
    running = null;
    // 동기화하는 동안 생긴 변경은 한 번 더 올립니다.
    if (useSyncMeta.getState().dirty && canSync() && useSyncStatus.getState().state !== 'error') void syncNow();
  });
  return running;
}

/** 로그아웃하거나 계정을 지우면 다음 로그인 때 다시 합치도록 기록을 지웁니다. */
export function forgetSync() {
  forgetLibraryGist();
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
  if (started) return;
  started = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ready = Promise.all([whenHydrated(useLibraryStore), whenHydrated(useSyncMeta)]);

  let lastUser: string | undefined;
  const follow = () => {
    const session = useSessionStore.getState().session;
    const userId = session && session.kind !== 'demo' ? session.userId : undefined;
    if (userId === lastUser) return;
    lastUser = userId;
    if (userId) void ready.then(syncNow);
    else useSyncStatus.setState({ state: 'idle', at: null, error: null });
  };
  useSessionStore.subscribe(follow);
  follow();

  // 저장된 보관함을 불러오는 것은 사용자의 변경이 아니어서, 다 불러온 뒤부터 지켜봅니다.
  void ready.then(() =>
    useLibraryStore.subscribe((state, previous) => {
      if (applying) return;
      if (state.likedIds === previous.likedIds && state.recentIds === previous.recentIds && state.playlists === previous.playlists) return;
      localVersion += 1;
      useSyncMeta.setState({ dirty: true });
      if (!canSync()) return;
      clearTimeout(timer);
      timer = setTimeout(() => void syncNow(), PUSH_DELAY_MS);
    }),
  );

  // 다른 기기에서 바꾼 내용을 다시 화면에 돌아왔을 때 받습니다.
  if (Platform.OS === 'web') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && canSync()) void syncNow();
    });
  } else {
    AppState.addEventListener('change', (state) => {
      if (state === 'active' && canSync()) void syncNow();
    });
  }
}
