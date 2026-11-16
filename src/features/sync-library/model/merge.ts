import { hasStamp, pruneStamps, type Playlist, type Stamps } from '@/entities/library';

const RECENT_LIMIT = 50;

/**
 * 서버에 저장하는 보관함입니다. 시각 기록(likedAt, unlikedAt, deletedPlaylistAt, 플레이리스트의 시각)은
 * 이전 버전 앱이 저장한 보관함에는 없어서 빈 기록으로 읽습니다.
 */
export type LibrarySnapshot = {
  likedIds: string[];
  likedAt: Stamps;
  unlikedAt: Stamps;
  recentIds: string[];
  playlists: Playlist[];
  deletedPlaylistAt: Stamps;
};

const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');
const isTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function isStamps(value: unknown): value is Stamps {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every(isTime);
}

/** Gist는 사용자가 직접 고칠 수 있어, 모양이 어긋난 시각 기록은 없는 것으로 봅니다. */
const stampsOf = (value: unknown): Stamps => (isStamps(value) ? value : {});

function isPlaylist(value: unknown): value is Playlist {
  const p = value as Playlist;
  return typeof p === 'object' && p !== null && typeof p.id === 'string' && typeof p.name === 'string' && isStrings(p.trackIds) && isTime(p.createdAt);
}

function toPlaylist(p: Playlist): Playlist {
  return {
    id: p.id,
    name: p.name,
    trackIds: p.trackIds,
    createdAt: p.createdAt,
    ...(isTime(p.updatedAt) ? { updatedAt: p.updatedAt } : {}),
    ...(isTime(p.renamedAt) ? { renamedAt: p.renamedAt } : {}),
    trackAddedAt: stampsOf(p.trackAddedAt),
    trackRemovedAt: stampsOf(p.trackRemovedAt),
  };
}

/** 서버에서 받은 값이 보관함 모양인지 확인합니다. 아니면 null입니다. */
export function parseSnapshot(data: unknown): LibrarySnapshot | null {
  const d = data as Partial<Record<keyof LibrarySnapshot, unknown>> | null;
  if (!d || !isStrings(d.likedIds) || !isStrings(d.recentIds) || !Array.isArray(d.playlists) || !d.playlists.every(isPlaylist)) return null;
  return {
    likedIds: d.likedIds,
    likedAt: stampsOf(d.likedAt),
    unlikedAt: stampsOf(d.unlikedAt),
    recentIds: d.recentIds,
    playlists: d.playlists.map(toPlaylist),
    deletedPlaylistAt: stampsOf(d.deletedPlaylistAt),
  };
}

/** 두 기록에서 키마다 나중 시각을 고릅니다. */
function latest(a: Stamps, b: Stamps): Stamps {
  const merged = { ...a };
  for (const [key, at] of Object.entries(b)) {
    if (!hasStamp(merged, key) || at > merged[key]) merged[key] = at;
  }
  return merged;
}

type Members = { ids: string[]; addedAt: Stamps; removedAt: Stamps };

/**
 * 두 기기의 목록(좋아요, 플레이리스트의 곡)을 합칩니다. 항목은 더한 시각이 뺀 시각(삭제 기록)보다 나중일 때만 남아,
 * 한 기기에서 뺀 항목이 다른 기기의 옛 목록 때문에 되살아나지 않습니다. 시각이 없는 항목(이전 버전에서 더함)은
 * 가장 오래된 것으로 봅니다. 이 기기의 순서가 앞섭니다.
 */
function mergeMembers(a: Members, b: Members): Members {
  const removedAt = latest(a.removedAt, b.removedAt);
  const inA = new Set(a.ids);
  const inB = new Set(b.ids);
  const addedAt: Stamps = {};
  const ids: string[] = [];
  for (const id of new Set([...a.ids, ...b.ids])) {
    const at = Math.max(inA.has(id) ? (a.addedAt[id] ?? 0) : -1, inB.has(id) ? (b.addedAt[id] ?? 0) : -1);
    if (hasStamp(removedAt, id) && removedAt[id] >= at) continue;
    ids.push(id);
    if (at > 0) addedAt[id] = at;
    delete removedAt[id];
  }
  return { ids, addedAt, removedAt: pruneStamps(removedAt) };
}

/** 플레이리스트를 마지막으로 바꾼 시각입니다. 이전 버전의 플레이리스트는 만든 시각입니다. */
const touchedAt = (p: Playlist) => p.updatedAt ?? p.createdAt;
const renamedAt = (p: Playlist) => p.renamedAt ?? p.createdAt;

function mergePlaylist(a: Playlist, b: Playlist): Playlist {
  const tracks = mergeMembers(
    { ids: a.trackIds, addedAt: a.trackAddedAt ?? {}, removedAt: a.trackRemovedAt ?? {} },
    { ids: b.trackIds, addedAt: b.trackAddedAt ?? {}, removedAt: b.trackRemovedAt ?? {} },
  );
  return {
    id: a.id,
    // 이름은 나중에 바꾼 쪽을 씁니다. 같으면 이 기기의 이름입니다.
    name: renamedAt(b) > renamedAt(a) ? b.name : a.name,
    createdAt: Math.min(a.createdAt, b.createdAt),
    updatedAt: Math.max(touchedAt(a), touchedAt(b)),
    renamedAt: Math.max(renamedAt(a), renamedAt(b)),
    trackIds: tracks.ids,
    trackAddedAt: tracks.addedAt,
    trackRemovedAt: tracks.removedAt,
  };
}

/**
 * 이 기기와 서버의 보관함을 합칩니다. 더한 것은 잃지 않고, 지운 것(좋아요 취소, 플레이리스트 삭제, 곡 빼기)은
 * 삭제 기록의 시각이 더 나중이면 다른 쪽에 남아 있어도 지운 채로 둡니다. 이 기기의 순서가 앞섭니다.
 */
export function mergeLibraries(local: LibrarySnapshot, remote: LibrarySnapshot): LibrarySnapshot {
  const likes = mergeMembers(
    { ids: local.likedIds, addedAt: local.likedAt, removedAt: local.unlikedAt },
    { ids: remote.likedIds, addedAt: remote.likedAt, removedAt: remote.unlikedAt },
  );

  const deletedPlaylistAt = latest(local.deletedPlaylistAt, remote.deletedPlaylistAt);
  const byId = new Map<string, Playlist>();
  for (const playlist of [...local.playlists, ...remote.playlists]) {
    const seen = byId.get(playlist.id);
    byId.set(playlist.id, seen ? mergePlaylist(seen, playlist) : playlist);
  }
  // 지운 뒤에 다른 기기에서 고친 플레이리스트는 남깁니다. 나중에 한 일이 이깁니다.
  const playlists = [...byId.values()].filter((p) => {
    if (hasStamp(deletedPlaylistAt, p.id) && deletedPlaylistAt[p.id] >= touchedAt(p)) return false;
    delete deletedPlaylistAt[p.id];
    return true;
  });

  return {
    likedIds: likes.ids,
    likedAt: likes.addedAt,
    unlikedAt: likes.removedAt,
    recentIds: [...new Set([...local.recentIds, ...remote.recentIds])].slice(0, RECENT_LIMIT),
    playlists: playlists.sort((a, b) => b.createdAt - a.createdAt),
    deletedPlaylistAt: pruneStamps(deletedPlaylistAt),
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
