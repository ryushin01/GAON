import { useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Track } from '@/entities/music/@x/library';

import { pruneStamps, stamp, unstamp, type Stamps } from '../lib/stamps';

const RECENT_LIMIT = 50;

export type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  /** 이름이나 곡을 마지막으로 바꾼 시각입니다. 다른 기기에서 지운 것보다 나중이면 플레이리스트를 남깁니다. */
  updatedAt?: number;
  /** 이름을 바꾼 시각입니다. 기기마다 이름이 다르면 나중에 바꾼 이름을 씁니다. */
  renamedAt?: number;
  /** 곡을 담은 시각입니다. */
  trackAddedAt?: Stamps;
  /** 뺀 곡과 뺀 시각입니다(삭제 기록). */
  trackRemovedAt?: Stamps;
};

type LibraryState = {
  likedIds: string[];
  /** 좋아요를 누른 시각입니다. */
  likedAt: Stamps;
  /** 좋아요를 취소한 시각입니다(삭제 기록). 다른 기기와 합칠 때 취소한 좋아요가 되살아나지 않게 합니다. */
  unlikedAt: Stamps;
  recentIds: string[];
  playlists: Playlist[];
  /** 지운 플레이리스트와 지운 시각입니다(삭제 기록). */
  deletedPlaylistAt: Stamps;
  /** 메타데이터만 저장합니다. 실제 파일 주소는 재생 직전에 구합니다. */
  localTracks: Track[];
  /** 인터넷 없이 듣도록 기기에 저장한 스트리밍 곡입니다(오프라인 저장). 곡 정보만 두고, 파일은 내 FLAC과 같은 저장소에 둡니다. */
  offlineTracks: Track[];
  /** 기기에 저장한 앨범 아트(내 FLAC, 오프라인 저장)의 주소입니다. 앱을 켤 때마다 새로 만들어 저장하지 않습니다. */
  localArt: Record<string, string>;
  toggleLike: (id: string) => void;
  addRecent: (id: string) => void;
  createPlaylist: (name: string, trackIds?: string[]) => string;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (id: string, trackIds: string[]) => void;
  removeFromPlaylist: (id: string, trackId: string) => void;
  addLocalTracks: (tracks: Track[]) => void;
  removeLocalTrack: (id: string) => void;
  setLocalArt: (art: Record<string, string>) => void;
  addOfflineTrack: (track: Track) => void;
  removeOfflineTracks: (ids: string[]) => void;
};

function newId() {
  return `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      likedIds: [],
      likedAt: {},
      unlikedAt: {},
      recentIds: [],
      playlists: [],
      deletedPlaylistAt: {},
      localTracks: [],
      offlineTracks: [],
      localArt: {},
      toggleLike: (id) =>
        set((s) => {
          const now = Date.now();
          if (s.likedIds.includes(id)) {
            return {
              likedIds: s.likedIds.filter((x) => x !== id),
              likedAt: unstamp(s.likedAt, [id]),
              unlikedAt: pruneStamps(stamp(s.unlikedAt, [id], now), now),
            };
          }
          return { likedIds: [id, ...s.likedIds], likedAt: stamp(s.likedAt, [id], now), unlikedAt: unstamp(s.unlikedAt, [id]) };
        }),
      addRecent: (id) =>
        set((s) => ({ recentIds: [id, ...s.recentIds.filter((x) => x !== id)].slice(0, RECENT_LIMIT) })),
      createPlaylist: (name, trackIds = []) => {
        const id = newId();
        const now = Date.now();
        const ids = [...new Set(trackIds)];
        const playlist: Playlist = { id, name, trackIds: ids, createdAt: now, updatedAt: now, renamedAt: now, trackAddedAt: stamp({}, ids, now) };
        set((s) => ({ playlists: [playlist, ...s.playlists] }));
        return id;
      },
      renamePlaylist: (id, name) =>
        set((s) => {
          const now = Date.now();
          return { playlists: s.playlists.map((p) => (p.id === id ? { ...p, name, updatedAt: now, renamedAt: now } : p)) };
        }),
      deletePlaylist: (id) =>
        set((s) => {
          const now = Date.now();
          return {
            playlists: s.playlists.filter((p) => p.id !== id),
            deletedPlaylistAt: pruneStamps(stamp(s.deletedPlaylistAt, [id], now), now),
          };
        }),
      addToPlaylist: (id, trackIds) =>
        set((s) => {
          const now = Date.now();
          return {
            playlists: s.playlists.map((p) => {
              if (p.id !== id) return p;
              const fresh = [...new Set(trackIds)].filter((t) => !p.trackIds.includes(t));
              if (!fresh.length) return p;
              return {
                ...p,
                trackIds: [...p.trackIds, ...fresh],
                updatedAt: now,
                trackAddedAt: stamp(p.trackAddedAt, fresh, now),
                trackRemovedAt: unstamp(p.trackRemovedAt, fresh),
              };
            }),
          };
        }),
      removeFromPlaylist: (id, trackId) =>
        set((s) => {
          const now = Date.now();
          return {
            playlists: s.playlists.map((p) =>
              p.id === id && p.trackIds.includes(trackId)
                ? {
                    ...p,
                    trackIds: p.trackIds.filter((t) => t !== trackId),
                    updatedAt: now,
                    trackAddedAt: unstamp(p.trackAddedAt, [trackId]),
                    trackRemovedAt: pruneStamps(stamp(p.trackRemovedAt, [trackId], now), now),
                  }
                : p,
            ),
          };
        }),
      addLocalTracks: (tracks) =>
        set((s) => {
          const ids = new Set(tracks.map((t) => t.id));
          return { localTracks: [...tracks, ...s.localTracks.filter((t) => !ids.has(t.id))] };
        }),
      // 내 FLAC은 이 기기의 파일이라, 지워도 다른 기기의 좋아요·플레이리스트에 삭제 기록을 남기지 않습니다.
      removeLocalTrack: (id) =>
        set((s) => {
          const { [id]: _removed, ...localArt } = s.localArt;
          return {
            localTracks: s.localTracks.filter((t) => t.id !== id),
            localArt,
            likedIds: s.likedIds.filter((x) => x !== id),
            likedAt: unstamp(s.likedAt, [id]),
            recentIds: s.recentIds.filter((x) => x !== id),
            playlists: s.playlists.map((p) =>
              p.trackIds.includes(id) ? { ...p, trackIds: p.trackIds.filter((t) => t !== id), trackAddedAt: unstamp(p.trackAddedAt, [id]) } : p,
            ),
          };
        }),
      setLocalArt: (art) => set((s) => ({ localArt: { ...s.localArt, ...art } })),
      addOfflineTrack: (track) =>
        set((s) => ({ offlineTracks: [track, ...s.offlineTracks.filter((t) => t.id !== track.id)] })),
      removeOfflineTracks: (ids) =>
        set((s) => {
          const gone = new Set(ids);
          const localArt = Object.fromEntries(Object.entries(s.localArt).filter(([id]) => !gone.has(id)));
          return { offlineTracks: s.offlineTracks.filter((t) => !gone.has(t.id)), localArt };
        }),
    }),
    {
      name: 'gaon-library',
      // 시각 기록은 없어도 되는 값이라 버전을 올리지 않습니다. 이전 버전에서 저장한 보관함은 기록 없이 불러옵니다.
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ likedIds, likedAt, unlikedAt, recentIds, playlists, deletedPlaylistAt, localTracks, offlineTracks }) => ({
        likedIds,
        likedAt,
        unlikedAt,
        recentIds,
        playlists,
        deletedPlaylistAt,
        localTracks,
        offlineTracks,
      }),
    },
  ),
);

/** 저장된 로컬 곡에 앨범 아트 주소를 붙여 돌려줍니다. */
export function useLocalTracks(): Track[] {
  const tracks = useLibraryStore((s) => s.localTracks);
  const art = useLibraryStore((s) => s.localArt);
  return useMemo(() => tracks.map((t) => ({ ...t, artUri: art[t.id] })), [tracks, art]);
}

/**
 * 오프라인 저장한 곡입니다. 인터넷 없이도 보이도록 기기에 저장한 앨범 아트를 쓰고, CD 라벨은 받지 않아 커버로 대신합니다.
 * 카탈로그를 받으면 화면은 카탈로그의 곡 정보를 먼저 씁니다.
 */
export function useOfflineTracks(): Track[] {
  const tracks = useLibraryStore((s) => s.offlineTracks);
  const art = useLibraryStore((s) => s.localArt);
  return useMemo(() => tracks.map((t) => ({ ...t, artUri: art[t.id] ?? t.artUri, discUri: undefined })), [tracks, art]);
}

/** 오프라인 저장한 곡인지 봅니다. 재생할 때 스트리밍 대신 기기의 파일을 씁니다. */
export function isStoredOffline(id: string): boolean {
  return useLibraryStore.getState().offlineTracks.some((t) => t.id === id);
}
