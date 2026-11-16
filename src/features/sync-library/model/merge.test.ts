import type { Playlist } from '@/entities/library';

import { decideSync, mergeLibraries, parseSnapshot, type LibrarySnapshot } from './merge';

const empty: LibrarySnapshot = { likedIds: [], likedAt: {}, unlikedAt: {}, recentIds: [], playlists: [], deletedPlaylistAt: {} };
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

describe('mergeLibraries', () => {
  it('좋아요와 최근 재생을 겹치지 않게 합치고 이 기기 순서를 앞에 둡니다', () => {
    const merged = mergeLibraries({ ...empty, likedIds: ['a', 'b'], recentIds: ['x'] }, { ...empty, likedIds: ['b', 'c'], recentIds: ['y', 'x'] });
    expect(merged.likedIds).toEqual(['a', 'b', 'c']);
    expect(merged.recentIds).toEqual(['x', 'y']);
  });

  it('같은 플레이리스트는 곡을 합치고, 다른 플레이리스트는 모두 남깁니다', () => {
    const merged = mergeLibraries(
      { ...empty, playlists: [{ id: 'p1', name: '출근', trackIds: ['a'], createdAt: 2 }] },
      { ...empty, playlists: [{ id: 'p1', name: '출근길', trackIds: ['b'], createdAt: 1 }, { id: 'p2', name: '밤', trackIds: [], createdAt: 3 }] },
    );
    expect(merged.playlists.map((p) => [p.id, p.name, p.trackIds, p.createdAt])).toEqual([
      ['p2', '밤', [], 3],
      ['p1', '출근', ['a', 'b'], 1],
    ]);
  });

  it('다른 기기에서 취소한 좋아요는 이 기기에 남아 있어도 되살리지 않습니다', () => {
    // 이 기기: 예전에 누른 좋아요가 남아 있고, 다른 곡에 좋아요를 더 눌렀습니다.
    const local = { ...empty, likedIds: ['new', 'old'], likedAt: { new: now - 1000, old: now - 10 * DAY } };
    // 서버: 다른 기기에서 old를 취소했습니다.
    const remote = { ...empty, unlikedAt: { old: now - 5000 } };
    const merged = mergeLibraries(local, remote);
    expect(merged.likedIds).toEqual(['new']);
    expect(merged.unlikedAt).toEqual({ old: now - 5000 });
  });

  it('취소한 뒤에 다시 누른 좋아요는 남깁니다', () => {
    const merged = mergeLibraries({ ...empty, likedIds: ['a'], likedAt: { a: now } }, { ...empty, unlikedAt: { a: now - 1000 } });
    expect(merged.likedIds).toEqual(['a']);
    expect(merged.likedAt).toEqual({ a: now });
    // 이긴 좋아요의 삭제 기록은 지웁니다.
    expect(merged.unlikedAt).toEqual({});
  });

  it('이전 버전이 저장한 좋아요(시각 없음)는 삭제 기록보다 오래된 것으로 봅니다', () => {
    const merged = mergeLibraries({ ...empty, unlikedAt: { a: 1 } }, { ...empty, likedIds: ['a', 'b'] });
    expect(merged.likedIds).toEqual(['b']);
  });

  it('지운 플레이리스트는 다른 기기에 남아 있어도 되살리지 않습니다', () => {
    const playlist: Playlist = { id: 'p1', name: '출근', trackIds: ['a'], createdAt: now - DAY, updatedAt: now - DAY };
    const merged = mergeLibraries({ ...empty, deletedPlaylistAt: { p1: now - 1000 } }, { ...empty, playlists: [playlist] });
    expect(merged.playlists).toEqual([]);
    expect(merged.deletedPlaylistAt).toEqual({ p1: now - 1000 });
  });

  it('지운 뒤에 다른 기기에서 고친 플레이리스트는 남깁니다', () => {
    const playlist: Playlist = { id: 'p1', name: '출근', trackIds: ['a', 'b'], createdAt: now - DAY, updatedAt: now };
    const merged = mergeLibraries({ ...empty, deletedPlaylistAt: { p1: now - 1000 } }, { ...empty, playlists: [playlist] });
    expect(merged.playlists.map((p) => p.id)).toEqual(['p1']);
    expect(merged.deletedPlaylistAt).toEqual({});
  });

  it('플레이리스트에서 뺀 곡은 되살리지 않고, 나중에 담은 곡은 남깁니다', () => {
    const local: Playlist = { id: 'p1', name: '출근', trackIds: ['b'], createdAt: 1, trackRemovedAt: { a: now - 500 } };
    const remote: Playlist = { id: 'p1', name: '출근', trackIds: ['a', 'b', 'c'], createdAt: 1, trackAddedAt: { a: now - DAY, c: now } };
    const [merged] = mergeLibraries({ ...empty, playlists: [local] }, { ...empty, playlists: [remote] }).playlists;
    expect(merged.trackIds).toEqual(['b', 'c']);
    expect(merged.trackRemovedAt).toEqual({ a: now - 500 });
  });

  it('플레이리스트 이름은 나중에 바꾼 쪽을 씁니다', () => {
    const local: Playlist = { id: 'p1', name: '출근', trackIds: [], createdAt: 1, renamedAt: 1, updatedAt: now };
    const remote: Playlist = { id: 'p1', name: '퇴근', trackIds: [], createdAt: 1, renamedAt: now - 1000, updatedAt: now - 1000 };
    // 이 기기는 곡만 바꿨고(updatedAt), 이름은 서버 쪽이 나중에 바꿨습니다.
    expect(mergeLibraries({ ...empty, playlists: [local] }, { ...empty, playlists: [remote] }).playlists[0].name).toBe('퇴근');
  });

  it('객체의 기본 속성 이름(__proto__, constructor)을 가진 항목도 시각으로 비교합니다', () => {
    // Gist를 손으로 고치면 어떤 키든 올 수 있습니다. JSON.parse는 __proto__도 자기 속성으로 만듭니다.
    const remote = parseSnapshot(JSON.parse('{"likedIds":[],"recentIds":[],"playlists":[],"unlikedAt":{"__proto__":' + now + ',"constructor":' + now + '}}'));
    const merged = mergeLibraries({ ...empty, likedIds: ['__proto__', 'constructor', 'a'] }, remote!);
    expect(merged.likedIds).toEqual(['a']);
    expect(Object.keys(merged.unlikedAt).sort()).toEqual(['__proto__', 'constructor']);
  });

  it('오래된 삭제 기록은 지웁니다', () => {
    const merged = mergeLibraries({ ...empty, unlikedAt: { old: now - 200 * DAY, recent: now - DAY } }, empty);
    expect(merged.unlikedAt).toEqual({ recent: now - DAY });
  });
});

describe('parseSnapshot', () => {
  it('모양이 다르면 받지 않습니다', () => {
    expect(parseSnapshot({ likedIds: 'a' })).toBeNull();
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot(empty)).toEqual(empty);
  });

  it('이전 버전이 저장한 보관함(시각 기록 없음)도 읽습니다', () => {
    const parsed = parseSnapshot({ likedIds: ['a'], recentIds: [], playlists: [{ id: 'p1', name: '출근', trackIds: ['a'], createdAt: 1 }] });
    expect(parsed?.likedAt).toEqual({});
    expect(parsed?.unlikedAt).toEqual({});
    expect(parsed?.playlists[0]).toEqual({ id: 'p1', name: '출근', trackIds: ['a'], createdAt: 1, trackAddedAt: {}, trackRemovedAt: {} });
  });

  it('모양이 어긋난 시각 기록은 없는 것으로 봅니다', () => {
    const parsed = parseSnapshot({ ...empty, unlikedAt: { a: 'yesterday' }, deletedPlaylistAt: ['p1'] });
    expect(parsed?.unlikedAt).toEqual({});
    expect(parsed?.deletedPlaylistAt).toEqual({});
  });
});

describe('decideSync', () => {
  const meta = { userId: 'u1', syncedAt: '2026-11-10T00:00:00Z', dirty: false };
  it('서버에 없으면 올립니다', () => expect(decideSync(meta, 'u1', null)).toBe('push'));
  it('이 기기에서 처음 동기화하는 계정이면 합칩니다', () => expect(decideSync({ ...meta, userId: null }, 'u1', '2026-11-09T00:00:00Z')).toBe('merge'));
  it('서버가 더 새로우면 받습니다', () => expect(decideSync(meta, 'u1', '2026-11-10T01:00:00Z')).toBe('pull'));
  it('양쪽 모두 바뀌었으면 합칩니다', () => expect(decideSync({ ...meta, dirty: true }, 'u1', '2026-11-10T01:00:00Z')).toBe('merge'));
  it('이 기기만 바뀌었으면 올립니다', () => expect(decideSync({ ...meta, dirty: true }, 'u1', '2026-11-10T00:00:00Z')).toBe('push'));
  it('바뀐 것이 없으면 그대로 둡니다', () => expect(decideSync(meta, 'u1', '2026-11-10T00:00:00Z')).toBe('none'));
});
