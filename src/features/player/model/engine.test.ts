import type { Track } from '@/entities/music';
import { useLibraryStore } from '@/entities/library';

import { addToQueue, cycleRepeat, next, playTracks, previous, removeFromQueue, setExclusiveOutput, skipToIndex, togglePlay, toggleShuffle } from './engine';
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

describe('player engine 경쟁과 복원', () => {
  it('곡 주소를 구하는 사이에 다른 곡을 고르면 마지막에 고른 곡만 재생합니다', async () => {
    // 두 요청 모두 오디오 모드와 곡 주소를 기다리는 동안 겹칩니다.
    await Promise.all([playTracks(tracks, 'a'), playTracks(tracks, 'c')]);
    expect(usePlayerStore.getState().index).toBe(2);
    expect(mockList.clear).toHaveBeenCalledTimes(1);
  });
});

describe('복원한 큐', () => {
  beforeEach(() => {
    // 재생기를 버려 앱을 막 켠 상태로 만듭니다.
    setExclusiveOutput(true);
    setExclusiveOutput(false);
    jest.clearAllMocks();
    usePlayerStore.setState({ queue: tracks, index: 1, shuffle: false });
  });

  it('재생기 없이 곡을 옮기고, 목록에서 고르면 그 곡부터 재생합니다', async () => {
    next();
    expect(usePlayerStore.getState().index).toBe(2);
    expect(mockList.next).not.toHaveBeenCalled();
    skipToIndex(3);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockList.items).toHaveLength(4);
    expect(mockList.skipTo).toHaveBeenCalledWith(3);
    expect(mockList.play).toHaveBeenCalled();
  });

  it('곡을 더하거나 빼도 큐를 새로 만들지 않습니다', async () => {
    await addToQueue([track('e')]);
    removeFromQueue('a');
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(['b', 'c', 'd', 'e']);
    expect(usePlayerStore.getState().index).toBe(0);
    expect(mockList.clear).not.toHaveBeenCalled();
  });

  it('셔플을 켰다 끄면 복원한 큐의 원래 순서로 돌아옵니다', async () => {
    await toggleShuffle();
    expect(usePlayerStore.getState().queue[0].id).toBe('b');
    await toggleShuffle();
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(usePlayerStore.getState().index).toBe(1);
  });

  it('재생기에 올리는 사이에 더한 곡도 재생 목록에 들어갑니다', async () => {
    togglePlay();
    await addToQueue([track('e')]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(mockList.items).toHaveLength(5);
    expect(mockList.play).toHaveBeenCalled();
  });
});

describe('재생 오류와 멈춤', () => {
  const statusListener = () =>
    mockList.addListener.mock.calls.find(([name]) => name === 'playlistStatusUpdate')?.[1] as (status: object) => void;

  beforeEach(() => {
    setExclusiveOutput(true);
    setExclusiveOutput(false);
    jest.clearAllMocks();
    usePlayerStore.setState({ error: null, shuffle: false });
  });

  it('앞 곡이 계속 재생돼도 새로 고른 곡의 오류는 남고, 다시 재생을 누르면 지웁니다', async () => {
    await playTracks(tracks, 'a');
    usePlayerStore.setState({ error: '저장된 파일을 찾을 수 없습니다.' });
    statusListener()({ playing: true, isBuffering: false, currentTime: 3, duration: 30 });
    expect(usePlayerStore.getState().error).toBe('저장된 파일을 찾을 수 없습니다.');
    mockList.playing = false;
    togglePlay();
    expect(usePlayerStore.getState().error).toBeNull();
  });

  it('곡을 더하는 사이에 재생을 멈추면 다시 재생하지 않습니다', async () => {
    await playTracks([tracks[0]]);
    jest.clearAllMocks();
    const adding = addToQueue([tracks[1]]);
    removeFromQueue('a');
    await adding;
    expect(usePlayerStore.getState().queue).toEqual([]);
    expect(mockList.play).not.toHaveBeenCalled();
  });
});
