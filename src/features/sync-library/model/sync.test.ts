import { useLibraryStore } from '@/entities/library';
import { setOwnerSession, startSession } from '@/entities/session';

import { startLibrarySync, stopLibrarySync, syncNow, useSyncStatus } from './sync';

const mockRead = jest.fn();
const mockWrite = jest.fn();

jest.mock('@/shared/api', () => ({
  getSupabase: async () => null,
  forgetLibraryGist: jest.fn(),
  readLibraryGist: (...args: unknown[]) => mockRead(...args),
  writeLibraryGist: (...args: unknown[]) => mockWrite(...args),
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('보관함 동기화 (소유자 Gist)', () => {
  beforeAll(async () => {
    startSession();
    startLibrarySync();
    await flush();
  });

  // 좋아요를 바꿔 걸어 둔 업로드 타이머와 구독이 테스트 뒤에 남지 않게 합니다.
  afterAll(() => stopLibrarySync());

  beforeEach(() => {
    mockRead.mockReset();
    mockWrite.mockReset();
  });

  it('서버 보관함의 형식을 읽지 못하면 덮어쓰지 않고 오류를 알립니다', async () => {
    mockRead.mockResolvedValue({ data: { likedIds: 'broken' }, updatedAt: '2026-11-10T00:00:00Z' });
    await setOwnerSession({ login: 'ryushin01', token: 't' });
    await syncNow();
    expect(mockWrite).not.toHaveBeenCalled();
    expect(useSyncStatus.getState().state).toBe('error');
    await setOwnerSession(null);
  });

  it('올리는 사이에 바꾼 내용도 다시 올립니다', async () => {
    mockRead.mockResolvedValue(null);
    let release: (value: string) => void = () => undefined;
    mockWrite.mockImplementationOnce(() => new Promise((resolve) => (release = resolve))).mockResolvedValue('2026-11-10T02:00:00Z');
    await setOwnerSession({ login: 'ryushin01', token: 't' });
    const first = syncNow();
    await flush();
    useLibraryStore.getState().toggleLike('during-sync');
    release('2026-11-10T01:00:00Z');
    await first;
    await flush();
    await flush();
    const lastData = mockWrite.mock.calls.at(-1)?.[1] as { likedIds: string[] };
    expect(mockWrite.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(lastData.likedIds).toContain('during-sync');
    await setOwnerSession(null);
  });

  it('양쪽이 모두 바뀌어 합칠 때 이 기기에서 취소한 좋아요를 되살리지 않습니다', async () => {
    mockRead.mockResolvedValue(null);
    mockWrite.mockResolvedValue('2026-11-10T03:00:00Z');
    await setOwnerSession({ login: 'ryushin01', token: 't' });
    await syncNow();
    // 이 기기에서 좋아요를 취소하는 사이에, 다른 기기는 예전 좋아요가 남은 채로 새 곡에 좋아요를 눌러 올렸습니다.
    useLibraryStore.setState({ likedIds: ['kept'], likedAt: {}, unlikedAt: { gone: Date.now() } });
    mockRead.mockResolvedValue({ data: { likedIds: ['other', 'gone'], likedAt: { other: Date.now() - 1000 }, recentIds: [], playlists: [] }, updatedAt: '2026-11-10T04:00:00Z' });
    mockWrite.mockClear();
    await syncNow();
    const pushed = mockWrite.mock.calls.at(-1)?.[1] as { likedIds: string[]; unlikedAt: Record<string, number> };
    expect(pushed.likedIds).toEqual(['kept', 'other']);
    expect(Object.keys(pushed.unlikedAt)).toEqual(['gone']);
    expect(useLibraryStore.getState().likedIds).toEqual(['kept', 'other']);
    await setOwnerSession(null);
  });
});
