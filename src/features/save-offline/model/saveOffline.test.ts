import { act, renderHook } from '@testing-library/react-native';

import { useLibraryStore } from '@/entities/library';
import type { Track } from '@/entities/music';

import { useOfflineMenuItem } from './menuItem';
import { cancelOffline, removeOffline, restoreOffline, saveOffline, useOfflineSave } from './saveOffline';

type Pending = { resolve: () => void; reject: (error: Error) => void; signal?: AbortSignal };
const mockDownloads = new Map<string, Pending>();
const mockDelete = jest.fn(async (_id: string, _options?: { release?: boolean }) => true);

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
  useLibraryStore.setState({ offlineTracks: [], fileTrash: [], localArt: {} });
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

  it('받지 못한 곡은 까닭과 함께 실패로 남기고 받다 만 파일을 지운 뒤 다음 곡을 받습니다', async () => {
    saveOffline([track('a'), track('b'), track('c')]);
    await finish('a', new TypeError('Failed to fetch'));
    expect(useOfflineSave.getState().failed).toEqual([{ id: 'a', reason: 'network' }]);
    expect(mockDelete).toHaveBeenCalledWith('a', { release: false });
    // 지운 파일은 지울 목록에서 뺍니다(다음 곡 b는 받는 동안 지울 목록에 있음).
    expect(useLibraryStore.getState().fileTrash).toEqual(['b']);
    // 저장 공간이 모자라 쓰지 못하면 까닭이 다릅니다.
    const quota = Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' });
    await finish('b', quota);
    expect(useOfflineSave.getState().failed).toEqual([{ id: 'a', reason: 'network' }, { id: 'b', reason: 'storage' }]);
    await finish('c');
    expect(savedIds()).toEqual(['c']);
    // 다시 저장하면 실패 기록을 지웁니다.
    saveOffline([track('a')]);
    expect(useOfflineSave.getState().failed).toEqual([{ id: 'b', reason: 'storage' }]);
    await finish('a');
    expect(savedIds()).toEqual(['a', 'c']);
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

  it('저장한 곡을 지우면 재생 중일 수 있는 파일은 미루고, 미룬 파일은 앱을 다시 켤 때 지웁니다', async () => {
    useLibraryStore.setState({ offlineTracks: [track('a'), track('b'), track('c')], localArt: { a: 'blob:art-a' } });
    // a는 재생 목록에 있어 지우기를 미뤘고(false), b는 바로 지웠습니다.
    mockDelete.mockImplementation(async (id) => id !== 'a');
    await removeOffline(['a', 'b']);
    expect(savedIds()).toEqual(['c']);
    expect(useLibraryStore.getState().localArt).toEqual({});
    expect(mockDelete).toHaveBeenCalledWith('a', { release: false });
    expect(useLibraryStore.getState().fileTrash).toEqual(['a']);

    mockDelete.mockImplementation(async () => true);
    await restoreOffline();
    expect(mockDelete).toHaveBeenLastCalledWith('a', { release: true });
    expect(useLibraryStore.getState().fileTrash).toEqual([]);
  });

  it('지운 뒤 다시 저장한 곡의 새 파일은 앱을 다시 켜도 지우지 않습니다', async () => {
    useLibraryStore.setState({ fileTrash: ['a'] });
    saveOffline([track('a')]);
    await finish('a');
    expect(useLibraryStore.getState().fileTrash).toEqual([]);
    mockDelete.mockClear();
    await restoreOffline();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('앱을 켤 때 받는 중이거나 받을 차례인 곡의 파일은 지우지 않습니다', async () => {
    // 지운 곡을 앱을 켜자마자 다시 저장했습니다. a는 받는 중, b는 받을 차례입니다.
    useLibraryStore.setState({ fileTrash: ['a', 'b', 'c'] });
    saveOffline([track('a'), track('b')]);
    await settle();
    await restoreOffline();
    expect(mockDelete.mock.calls.map(([id]) => id)).toEqual(['c']);
    await finish('a');
    await finish('b');
    expect(savedIds()).toEqual(['b', 'a']);
    expect(useLibraryStore.getState().fileTrash).toEqual([]);
  });

  it('받는 곡의 파일은 지울 목록에 두어, 받다가 앱이 꺼지면 다음에 켤 때 지웁니다', async () => {
    saveOffline([track('a')]);
    await settle();
    expect(useLibraryStore.getState().fileTrash).toEqual(['a']);
    // 앱을 다시 켜면 저장 큐는 비고 지울 목록만 남습니다.
    useOfflineSave.setState({ queue: [], current: null });
    await restoreOffline();
    expect(mockDelete).toHaveBeenCalledWith('a', { release: true });
    expect(useLibraryStore.getState().fileTrash).toEqual([]);
    // 앞 세션의 받기를 끝냅니다.
    await finish('a', new Error('cancelled'));
  });

  it('내 FLAC의 id 앞머리를 쓰는 스트리밍 곡은 내 FLAC 파일과 겹치지 않게 저장하지 않습니다', async () => {
    const clash = track('local-abc-30-96000');
    saveOffline([clash, track('a')]);
    expect(useOfflineSave.getState().queue.map((t) => t.id)).toEqual(['a']);
    expect((await renderHook(() => useOfflineMenuItem(clash))).result.current).toBeNull();
    await finish('a');
  });

  it('곡 메뉴는 저장 상태를 따라 항목을 바꿉니다(메뉴를 연 동안 저장이 끝나도)', async () => {
    expect((await renderHook(() => useOfflineMenuItem(track('mine', 'local')))).result.current).toBeNull();
    const { result } = await renderHook(() => useOfflineMenuItem(track('a')));
    expect(result.current?.label).toBe('오프라인 저장');
    await act(async () => result.current?.onPress());
    expect(result.current?.label).toBe('오프라인 저장 멈추기');
    await act(() => finish('a'));
    expect(result.current?.label).toBe('오프라인 저장 삭제');
  });
});
