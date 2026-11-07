import type { Track } from '@/entities/music';
import { useLibraryStore } from '@/entities/library';

import { addToQueue, cycleRepeat, next, playTracks, previous, removeFromQueue, toggleShuffle } from './engine';
import { usePlayerStore } from './playerStore';

const mockList = {
  playing: false,
  loop: 'none',
  trackCount: 0,
  items: [] as string[],
  addListener: jest.fn(),
  clear: jest.fn(() => { mockList.items = []; mockList.trackCount = 0; }),
  add: jest.fn(({ uri }: { uri: string }) => { mockList.items.push(uri); mockList.trackCount += 1; }),
  insert: jest.fn(({ uri }: { uri: string }, i: number) => { mockList.items.splice(i, 0, uri); mockList.trackCount += 1; }),
  remove: jest.fn((i: number) => { mockList.items.splice(i, 1); mockList.trackCount -= 1; }),
  skipTo: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  next: jest.fn(),
  previous: jest.fn(),
  seekTo: jest.fn(async () => {}),
  setActiveForLockScreen: jest.fn(),
  updateLockScreenMetadata: jest.fn(),
  clearLockScreenControls: jest.fn(),
};

jest.mock('expo-audio', () => ({
  createAudioPlaylist: () => mockList,
  setAudioModeAsync: jest.fn(async () => {}),
}));
jest.mock('expo-file-system', () => ({ Directory: jest.fn(), File: jest.fn(), Paths: {} }));

const track = (id: string): Track => ({
  id, source: 'stream', title: id, artists: ['유신'], featuring: [], albumTitle: '앨범', lyricists: [], composers: [], arrangers: [],
  durationSec: 30, format: { sampleRate: 96000, bitDepth: 24, channels: 2 }, uri: `https://m/${id}.flac`, lyrics: [],
});
const tracks = ['a', 'b', 'c', 'd'].map(track);

beforeEach(() => {
  jest.clearAllMocks();
  mockList.items = [];
  mockList.trackCount = 0;
  usePlayerStore.setState({ queue: [], index: 0, repeat: 'off', shuffle: false, currentTime: 0 });
  useLibraryStore.setState({ recentIds: [] });
});

describe('player engine', () => {
  it('고른 곡부터 재생하고 잠금 화면에 곡 정보를 보냅니다', async () => {
    await playTracks(tracks, 'c');
    expect(mockList.items).toHaveLength(4);
    expect(mockList.skipTo).toHaveBeenCalledWith(2);
    expect(mockList.play).toHaveBeenCalled();
    expect(usePlayerStore.getState().index).toBe(2);
    expect(useLibraryStore.getState().recentIds).toEqual(['c']);
    expect(mockList.setActiveForLockScreen.mock.calls.at(-1) ?? mockList.updateLockScreenMetadata.mock.calls.at(-1)).toBeTruthy();
  });

  it('3초가 지나면 이전 버튼은 곡의 처음으로 돌아갑니다', async () => {
    await playTracks(tracks, 'b');
    usePlayerStore.setState({ currentTime: 10 });
    previous();
    expect(mockList.seekTo).toHaveBeenCalledWith(0);
    expect(mockList.previous).not.toHaveBeenCalled();
    usePlayerStore.setState({ currentTime: 1 });
    previous();
    expect(mockList.previous).toHaveBeenCalled();
  });

  it('반복이 꺼져 있으면 마지막 곡에서 다음으로 넘어가지 않습니다', async () => {
    await playTracks(tracks, 'd');
    next();
    expect(mockList.next).not.toHaveBeenCalled();
    cycleRepeat();
    expect(mockList.loop).toBe('all');
    next();
    expect(mockList.skipTo).toHaveBeenLastCalledWith(0);
  });

  it('셔플을 켜도 듣는 곡은 맨 앞에 남고, 끄면 원래 순서로 돌아옵니다', async () => {
    await playTracks(tracks, 'c');
    await toggleShuffle();
    let state = usePlayerStore.getState();
    expect(state.index).toBe(0);
    expect(state.queue[0].id).toBe('c');
    expect(mockList.items[0]).toContain('c.flac');
    await toggleShuffle();
    state = usePlayerStore.getState();
    expect(state.queue.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(mockList.items.map((u) => u.slice(-6, -5))).toEqual(['a', 'b', 'c', 'd']);
    expect(state.index).toBe(2);
  });

  it('큐에 이미 있는 곡은 다시 넣지 않고, 앞쪽 곡을 지우면 현재 위치를 맞춥니다', async () => {
    await playTracks(tracks.slice(0, 3), 'c');
    await addToQueue([tracks[0], tracks[3]]);
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']);
    removeFromQueue('a');
    expect(usePlayerStore.getState().index).toBe(1);
    expect(usePlayerStore.getState().queue[1].id).toBe('c');
  });
});
