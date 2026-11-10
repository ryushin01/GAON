import type { Playlist } from '@/entities/library';

const RECENT_LIMIT = 50;

export type LibrarySnapshot = { likedIds: string[]; recentIds: string[]; playlists: Playlist[] };

const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');

function isPlaylist(value: unknown): value is Playlist {
  const p = value as Playlist;
  return typeof p === 'object' && p !== null && typeof p.id === 'string' && typeof p.name === 'string' && isStrings(p.trackIds) && typeof p.createdAt === 'number';
}

/** 서버에서 받은 값이 보관함 모양인지 확인합니다. 아니면 null입니다. */
export function parseSnapshot(data: unknown): LibrarySnapshot | null {
  const d = data as Partial<LibrarySnapshot> | null;
  if (!d || !isStrings(d.likedIds) || !isStrings(d.recentIds) || !Array.isArray(d.playlists) || !d.playlists.every(isPlaylist)) return null;
  return { likedIds: d.likedIds, recentIds: d.recentIds, playlists: d.playlists };
}

/** 처음 로그인한 기기의 보관함과 서버 보관함을 잃는 것 없이 합칩니다. 이 기기의 순서가 앞섭니다. */
export function mergeLibraries(local: LibrarySnapshot, remote: LibrarySnapshot): LibrarySnapshot {
  const byId = new Map<string, Playlist>();
  for (const playlist of [...local.playlists, ...remote.playlists]) {
    const seen = byId.get(playlist.id);
    byId.set(
      playlist.id,
      seen
        ? { ...seen, trackIds: [...new Set([...seen.trackIds, ...playlist.trackIds])], createdAt: Math.min(seen.createdAt, playlist.createdAt) }
        : playlist,
    );
  }
  return {
    likedIds: [...new Set([...local.likedIds, ...remote.likedIds])],
    recentIds: [...new Set([...local.recentIds, ...remote.recentIds])].slice(0, RECENT_LIMIT),
    playlists: [...byId.values()].sort((a, b) => b.createdAt - a.createdAt),
  };
}

export type SyncMeta = { userId: string | null; syncedAt: string | null; dirty: boolean };
export type SyncAction = 'push' | 'merge' | 'pull' | 'none';

/**
 * 서버 보관함과 이 기기의 상태를 보고 할 일을 정합니다.
 * - 이 기기에서 처음 동기화하는 계정이면 합칩니다.
 * - 서버가 더 새로우면 받습니다. 이 기기에도 올리지 않은 변경이 있으면 합칩니다.
 * - 이 기기만 바뀌었으면 올립니다.
 */
export function decideSync(meta: SyncMeta, userId: string, remoteUpdatedAt: string | null): SyncAction {
  if (remoteUpdatedAt == null) return 'push';
  if (meta.userId !== userId) return 'merge';
  const remoteNewer = meta.syncedAt == null || Date.parse(remoteUpdatedAt) > Date.parse(meta.syncedAt);
  if (remoteNewer) return meta.dirty ? 'merge' : 'pull';
  return meta.dirty ? 'push' : 'none';
}
