import { useLibraryStore } from '@/entities/library';
import type { Track } from '@/entities/music';

import { offlineMenuItem } from './menuItem';
import { cancelOffline, removeOffline, saveOffline, useOfflineSave } from './saveOffline';

type Pending = { resolve: () => void; reject: (error: Error) => void; signal?: AbortSignal };
const mockDownloads = new Map<string, Pending>();
const mockDelete = jest.fn(async (_id: string, _options?: { release?: boolean }) => {});

jest.mock('@/entities/library', () => ({
  ...jest.requireActual('@/entities/library'),
  downloadAudio: (id: string, _url: string, signal?: AbortSignal) =>
    new Promise<void>((resolve, reject) => mockDownloads.set(id, { resolve, reject, signal })),
  downloadArt: async () => {},
  resolveArtUri: async (id: string) => `blob:art-${id}`,
  deleteLocalFile: (id: string, options?: { release?: boolean }) => mockDelete(id, options),
  keepStoredFiles: async () => {},
}));
jest.mock('expo-file-system', () => ({ Directory: jest.fn(), File: jest.fn(), Paths: {} }));

const track = (id: string, source: Track['source'] = 'stream'): Track => ({
  id, source, title: id, artists: ['유신'], featuring: [], albumTitle: '앨범', lyricists: [], composers: [], arrangers: [],
  durationSec: 30, format: { sampleRate: 96000, bitDepth: 24, channels: 2 }, uri: `https://m/${id}.flac`, artUri: `https://m/${id}.webp`, lyrics: [],
  fileSize: 20_000_000,
});
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
/** 받는 중인 곡의 내려받기를 끝냅니다. */
async function finish(id: string, error?: Error) {
  await settle();
  const pending = mockDownloads.get(id);
  if (!pending) throw new Error(`${id}을(를) 받고 있지 않습니다.`);
  mockDownloads.delete(id);
  if (error) pending.reject(error);
  else pending.resolve();
  await settle();
}
const savedIds = () => useLibraryStore.getState().offlineTracks.map((t) => t.id);

beforeEach(() => {
  mockDownloads.clear();
  mockDelete.mockClear();
  useLibraryStore.setState({ offlineTracks: [], localArt: {} });
  useOfflineSave.setState({ queue: [], current: null, failed: [] });
});

describe('오프라인 저장', () => {
  it('스트리밍 곡을 하나씩 받아 저장하고, 내 FLAC과 이미 저장한 곡은 건너뜁니다', async () => {
    useLibraryStore.setState({ offlineTracks: [track('done')] });
    saveOffline([track('a'), track('mine', 'local'), track('done'), track('b')]);
    expect(useOfflineSave.getState().queue.map((t) => t.id)).toEqual(['a', 'b']);
    await settle();
    // 한 번에 한 곡만 받습니다.
    expect([...mockDownloads.keys()]).toEqual(['a']);
    await finish('a');
    expect(savedIds()).toEqual(['a', 'done']);
    expect(useLibraryStore.getState().localArt.a).toBe('blob:art-a');
    await finish('b');
    expect(savedIds()).toEqual(['b', 'a', 'done']);
    expect(useOfflineSave.getState()).toMatchObject({ queue: [], current: null, failed: [] });
  });

  it('받지 못한 곡은 실패로 남기고 받다 만 파일을 지운 뒤 다음 곡을 받습니다', async () => {
    saveOffline([track('a'), track('b')]);
    await finish('a', new Error('network'));
    expect(useOfflineSave.getState().failed).toEqual(['a']);
    expect(mockDelete).toHaveBeenCalledWith('a', { release: false });
    await finish('b');
    expect(savedIds()).toEqual(['b']);
    // 다시 저장하면 실패 기록을 지웁니다.
    saveOffline([track('a')]);
    expect(useOfflineSave.getState().failed).toEqual([]);
    await finish('a');
    expect(savedIds()).toEqual(['a', 'b']);
  });

  it('멈추면 받는 중인 곡을 취소하고 남은 곡도 받지 않습니다', async () => {
    saveOffline([track('a'), track('b')]);
    await settle();
    const { signal } = mockDownloads.get('a')!;
    cancelOffline();
    expect(signal?.aborted).toBe(true);
    // 앱의 내려받기는 멈출 수 없어 끝까지 받더라도 저장하지 않습니다.
    await finish('a');
    expect(savedIds()).toEqual([]);
    expect(useOfflineSave.getState()).toMatchObject({ queue: [], current: null, failed: [] });
    expect(mockDownloads.size).toBe(0);
  });

  it('저장한 곡을 지우면 재생 주소는 놓지 않고 파일만 지웁니다', async () => {
    useLibraryStore.setState({ offlineTracks: [track('a'), track('b')], localArt: { a: 'blob:art-a' } });
    await removeOffline(['a']);
    expect(savedIds()).toEqual(['b']);
    expect(useLibraryStore.getState().localArt).toEqual({});
    expect(mockDelete).toHaveBeenCalledWith('a', { release: false });
  });

  it('곡 메뉴는 저장 상태에 맞는 항목을 보여 줍니다', async () => {
    expect(offlineMenuItem(track('mine', 'local'))).toBeNull();
    expect(offlineMenuItem(track('a'))?.label).toBe('오프라인 저장');
    saveOffline([track('a')]);
    expect(offlineMenuItem(track('a'))?.label).toBe('오프라인 저장 멈추기');
    await finish('a');
    expect(offlineMenuItem(track('a'))?.label).toBe('오프라인 저장 삭제');
  });
});
