import { decideSync, mergeLibraries, parseSnapshot } from './merge';

const empty = { likedIds: [], recentIds: [], playlists: [] };

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
    expect(merged.playlists).toEqual([
      { id: 'p2', name: '밤', trackIds: [], createdAt: 3 },
      { id: 'p1', name: '출근', trackIds: ['a', 'b'], createdAt: 1 },
    ]);
  });
});

describe('parseSnapshot', () => {
  it('모양이 다르면 받지 않습니다', () => {
    expect(parseSnapshot({ likedIds: 'a' })).toBeNull();
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot(empty)).toEqual(empty);
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
