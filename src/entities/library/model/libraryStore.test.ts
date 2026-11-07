import type { Track } from '@/entities/music/@x/library';

import { useLibraryStore } from './libraryStore';

const local = { id: 'local-1', title: '내 파일', source: 'local' } as Track;

describe('libraryStore', () => {
  beforeEach(() => {
    useLibraryStore.setState({ likedIds: [], recentIds: [], playlists: [], localTracks: [], localArt: {} });
  });

  it('좋아요를 켜고 끕니다', () => {
    const { toggleLike } = useLibraryStore.getState();
    toggleLike('a');
    expect(useLibraryStore.getState().likedIds).toEqual(['a']);
    toggleLike('a');
    expect(useLibraryStore.getState().likedIds).toEqual([]);
  });

  it('최근 재생은 중복 없이 맨 앞으로 옵니다', () => {
    const { addRecent } = useLibraryStore.getState();
    ['a', 'b', 'a'].forEach(addRecent);
    expect(useLibraryStore.getState().recentIds).toEqual(['a', 'b']);
  });

  it('플레이리스트에 같은 곡을 두 번 넣지 않습니다', () => {
    const { createPlaylist, addToPlaylist } = useLibraryStore.getState();
    const id = createPlaylist('출근길', ['a']);
    addToPlaylist(id, ['a', 'b']);
    expect(useLibraryStore.getState().playlists[0].trackIds).toEqual(['a', 'b']);
  });

  it('로컬 곡을 지우면 모든 목록에서 빠집니다', () => {
    const state = useLibraryStore.getState();
    state.addLocalTracks([local]);
    state.toggleLike('local-1');
    state.addRecent('local-1');
    const id = state.createPlaylist('내 곡', ['local-1']);
    state.removeLocalTrack('local-1');
    const after = useLibraryStore.getState();
    expect(after.localTracks).toEqual([]);
    expect(after.likedIds).toEqual([]);
    expect(after.recentIds).toEqual([]);
    expect(after.playlists.find((p) => p.id === id)?.trackIds).toEqual([]);
  });
});
