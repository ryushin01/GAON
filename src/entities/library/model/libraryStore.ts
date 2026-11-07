import { useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Track } from '@/entities/music/@x/library';

const RECENT_LIMIT = 50;

export type Playlist = { id: string; name: string; trackIds: string[]; createdAt: number };

type LibraryState = {
  likedIds: string[];
  recentIds: string[];
  playlists: Playlist[];
  /** 메타데이터만 저장합니다. 실제 파일 주소는 재생 직전에 구합니다. */
  localTracks: Track[];
  /** 저장하지 않는 앨범 아트 주소입니다. */
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
};

function newId() {
  return `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      likedIds: [],
      recentIds: [],
      playlists: [],
      localTracks: [],
      localArt: {},
      toggleLike: (id) =>
        set((s) => ({ likedIds: s.likedIds.includes(id) ? s.likedIds.filter((x) => x !== id) : [id, ...s.likedIds] })),
      addRecent: (id) =>
        set((s) => ({ recentIds: [id, ...s.recentIds.filter((x) => x !== id)].slice(0, RECENT_LIMIT) })),
      createPlaylist: (name, trackIds = []) => {
        const id = newId();
        set((s) => ({ playlists: [{ id, name, trackIds: [...new Set(trackIds)], createdAt: Date.now() }, ...s.playlists] }));
        return id;
      },
      renamePlaylist: (id, name) =>
        set((s) => ({ playlists: s.playlists.map((p) => (p.id === id ? { ...p, name } : p)) })),
      deletePlaylist: (id) => set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) })),
      addToPlaylist: (id, trackIds) =>
        set((s) => ({
          playlists: s.playlists.map((p) => (p.id === id ? { ...p, trackIds: [...new Set([...p.trackIds, ...trackIds])] } : p)),
        })),
      removeFromPlaylist: (id, trackId) =>
        set((s) => ({
          playlists: s.playlists.map((p) => (p.id === id ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p)),
        })),
      addLocalTracks: (tracks) =>
        set((s) => {
          const ids = new Set(tracks.map((t) => t.id));
          return { localTracks: [...tracks, ...s.localTracks.filter((t) => !ids.has(t.id))] };
        }),
      removeLocalTrack: (id) =>
        set((s) => {
          const { [id]: _removed, ...localArt } = s.localArt;
          return {
            localTracks: s.localTracks.filter((t) => t.id !== id),
            localArt,
            likedIds: s.likedIds.filter((x) => x !== id),
            recentIds: s.recentIds.filter((x) => x !== id),
            playlists: s.playlists.map((p) => ({ ...p, trackIds: p.trackIds.filter((t) => t !== id) })),
          };
        }),
      setLocalArt: (art) => set((s) => ({ localArt: { ...s.localArt, ...art } })),
    }),
    {
      name: 'gaon-library',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ likedIds, recentIds, playlists, localTracks }) => ({ likedIds, recentIds, playlists, localTracks }),
    },
  ),
);

/** 저장된 로컬 곡에 앨범 아트 주소를 붙여 돌려줍니다. */
export function useLocalTracks(): Track[] {
  const tracks = useLibraryStore((s) => s.localTracks);
  const art = useLibraryStore((s) => s.localArt);
  return useMemo(() => tracks.map((t) => ({ ...t, artUri: art[t.id] })), [tracks, art]);
}
