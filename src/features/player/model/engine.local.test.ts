import type { Track } from '@/entities/music';

import { addToQueue, forgetTrack, playTracks, removeFromQueue, setExclusiveOutput, togglePlay, toggleShuffle } from './engine';
import { usePlayerStore } from './playerStore';

/** 내 FLAC 주소를 테스트가 정한 때에 돌려주거나 실패시킵니다. */
const mockPending = new Map<string, { resolve: (uri: string) => void; reject: (error: Error) => void }>();
const mockRelease = jest.fn();

jest.mock('@/entities/library', () => ({
  ...jest.requireActual('@/entities/library'),
  resolveAudioUri: (id: string) => new Promise((resolve, reject) => mockPending.set(id, { resolve, reject })),
  releaseAudioUris: (...args: unknown[]) => mockRelease(...args),
}));

const mockList = {
  playing: false,
  loop: 'none',
  trackCount: 0,
  items: [] as string[],
  addListener: jest.fn(),
  clear: jest.fn(() => { mockList.items = []; mockList.trackCount = 0; }),
  add: jest.fn(({ uri }: { uri: string }) => { mockList.items.push(uri); mockList.trackCount += 1; }),
  insert: jest.fn(),
  remove: jest.fn(),
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

const track = (id: string, source: Track['source'] = 'stream'): Track => ({
  id, source, title: id, artists: ['유신'], featuring: [], albumTitle: '앨범', lyricists: [], composers: [], arrangers: [],
  durationSec: 30, format: { sampleRate: 96000, bitDepth: 24, channels: 2 }, uri: `https://m/${id}.flac`, lyrics: [],
});
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  setExclusiveOutput(true);
  setExclusiveOutput(false);
  mockPending.clear();
  jest.clearAllMocks();
  mockList.items = [];
  usePlayerStore.setState({ queue: [], index: 0, shuffle: false, error: null });
});

describe('내 FLAC 재생 요청', () => {
  it('낡은 요청이 끝나도 아직 주소를 구하는 새 요청의 주소는 놓지 않습니다', async () => {
    const first = playTracks([track('x', 'local')]);
    const second = playTracks([track('y', 'local')]);
    await settle();
    mockPending.get('x')?.resolve('blob:x');
    await first;
    // 새 요청(y)이 끝나기 전이라 놓지 않습니다.
    expect(mockRelease).not.toHaveBeenCalled();
    mockPending.get('y')?.resolve('blob:y');
    await second;
    // 새 요청이 끝나면 지금 큐(y)만 남기고 놓습니다.
    expect(mockRelease).toHaveBeenLastCalledWith(['y']);
    expect(mockList.items).toEqual(['blob:y']);
  });

  it('실패한 요청의 곡 순서가 복원한 큐의 셔플에 섞이지 않습니다', async () => {
    const restored = [track('a'), track('b'), track('c')];
    usePlayerStore.setState({ queue: restored, index: 0 });
    const failing = playTracks([track('a'), track('x', 'local')]);
    await settle();
    mockPending.get('x')?.reject(new Error('저장된 파일을 찾을 수 없습니다.'));
    await failing;
    expect(usePlayerStore.getState().error).toBe('저장된 파일을 찾을 수 없습니다.');
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(['a', 'b', 'c']);

    togglePlay();
    await settle();
    await toggleShuffle();
    await toggleShuffle();
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('재생기가 있을 때 내 FLAC을 올리는 사이에 셔플을 바꿔도 요청을 버리지 않고 주소를 정리합니다', async () => {
    await playTracks([track('a')]);
    jest.clearAllMocks();
    const picking = playTracks([track('x', 'local'), track('b')]);
    const shuffling = toggleShuffle();
    await settle();
    mockPending.get('x')?.resolve('blob:x');
    await Promise.all([picking, shuffling]);
    await settle();
    expect(mockList.items).toContain('blob:x');
    expect(mockList.play).toHaveBeenCalled();
    // 새 큐가 올라간 뒤 지금 큐에 있는 내 FLAC(x)만 남기고 정리합니다.
    expect(mockRelease).toHaveBeenCalledWith(['x']);
    expect(usePlayerStore.getState().shuffle).toBe(true);
  });

  it('큐가 빈 채로 차례가 온 곡 더하기는 나중에 고른 곡을 막지 않습니다', async () => {
    const loading = playTracks([track('x', 'local')]);
    await settle();
    const adding = addToQueue([track('b')]);
    const picking = playTracks([track('c')]);
    mockPending.get('x')?.resolve('blob:x');
    await Promise.all([loading, adding, picking]);
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(['c']);
    expect(mockList.items).toEqual(['https://m/c.flac']);
  });

  it('보관함에서 지운 곡은 그사이 새 큐가 올라와도 큐에서 뺍니다', async () => {
    const loading = playTracks([track('a', 'local'), track('x', 'local')]);
    await settle();
    mockPending.get('a')?.resolve('blob:a');
    // 목록에서 고른 빼기는 새 큐가 올라오면 버리지만, 보관함 삭제는 올라온 큐에서도 뺍니다.
    const removing = removeFromQueue('a');
    const forgetting = forgetTrack('a');
    mockPending.get('x')?.resolve('blob:x');
    await Promise.all([loading, removing, forgetting]);
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(['x']);
    expect(mockList.remove).toHaveBeenCalledWith(0);
  });
});
