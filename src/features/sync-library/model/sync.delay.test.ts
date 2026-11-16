import { useLibraryStore } from '@/entities/library';
import { setOwnerSession, startSession } from '@/entities/session';

import { startLibrarySync, stopLibrarySync, syncNow } from './sync';

const mockWrite = jest.fn(async () => '2026-11-16T00:00:00Z');

jest.mock('@/shared/api', () => ({
  getSupabase: async () => null,
  forgetLibraryGist: jest.fn(),
  readLibraryGist: async () => null,
  writeLibraryGist: (...args: unknown[]) => mockWrite(...(args as [])),
}));

const settle = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

describe('보관함 동기화 지연', () => {
  beforeAll(async () => {
    startSession();
    startLibrarySync();
    // 저장된 로그인을 다 읽은 뒤에 로그인해야, 늦게 끝난 읽기가 새 로그인을 덮지 않습니다.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await setOwnerSession({ login: 'ryushin01', token: 't' });
    await syncNow();
  });
  afterAll(() => stopLibrarySync());

  beforeEach(() => {
    jest.useFakeTimers();
    mockWrite.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('최근 재생만 바뀌면 곡마다 올리지 않고 30초 모아 올립니다', async () => {
    useLibraryStore.getState().addRecent('a');
    await jest.advanceTimersByTimeAsync(2000);
    useLibraryStore.getState().addRecent('b');
    await jest.advanceTimersByTimeAsync(2000);
    await settle();
    expect(mockWrite).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(30_000);
    await settle();
    expect(mockWrite).toHaveBeenCalledTimes(1);
  });

  it('좋아요는 기다리던 최근 재생 업로드를 앞당겨 바로 올립니다', async () => {
    useLibraryStore.getState().addRecent('c');
    useLibraryStore.getState().toggleLike('c');
    await jest.advanceTimersByTimeAsync(1500);
    await settle();
    expect(mockWrite).toHaveBeenCalledTimes(1);
  });
});
