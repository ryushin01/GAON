import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { useLibraryStore } from '@/entities/library';
import type { Track } from '@/entities/music';

import { useOfflineSave } from '../model/saveOffline';
import { SaveOfflineButton } from './SaveOfflineButton';

const mockFinish = new Map<string, (error?: Error) => void>();

jest.mock('@/entities/library', () => ({
  ...jest.requireActual('@/entities/library'),
  downloadAudio: (id: string) => new Promise<void>((resolve, reject) => mockFinish.set(id, (error) => (error ? reject(error) : resolve()))),
  downloadArt: async () => {},
  resolveArtUri: async () => undefined,
  deleteLocalFile: async () => {},
  keepStoredFiles: async () => {},
}));
jest.mock('expo-file-system', () => ({ Directory: jest.fn(), File: jest.fn(), Paths: {} }));

const track = (id: string): Track => ({
  id, source: 'stream', title: id, artists: ['유신'], featuring: [], albumTitle: '앨범', lyricists: [], composers: [], arrangers: [],
  durationSec: 30, format: { sampleRate: 96000, bitDepth: 24, channels: 2 }, uri: `https://m/${id}.flac`, lyrics: [], fileSize: 20_000_000,
});
const tracks = [track('a'), track('b')];
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));
async function finish(id: string, error?: Error) {
  await settle();
  mockFinish.get(id)?.(error);
  mockFinish.delete(id);
  await settle();
}

beforeEach(() => {
  mockFinish.clear();
  useLibraryStore.setState({ offlineTracks: [], localArt: {} });
  useOfflineSave.setState({ queue: [], current: null, failed: [] });
});

describe('SaveOfflineButton', () => {
  it('목록의 곡을 저장하고 진행과 끝을 알립니다', async () => {
    await render(<SaveOfflineButton tracks={tracks} />);
    expect(screen.getByText('2곡 · 40.0 MB')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /오프라인 저장$/ }));
    expect(screen.getByText('오프라인 저장 중 · 0/2곡')).toBeTruthy();
    expect(screen.getByText('오프라인 저장을 시작했습니다.')).toBeTruthy();
    await finish('a');
    expect(screen.getByText('오프라인 저장 중 · 1/2곡')).toBeTruthy();
    await finish('b');
    expect(screen.getByText('2곡 모두 오프라인 저장됨 · 40.0 MB')).toBeTruthy();
    expect(screen.getByText('2곡을 모두 오프라인으로 저장했습니다.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('받지 못한 곡이 있으면 원인과 다시 하는 방법을 알리고, 남은 곡만 다시 저장합니다', async () => {
    await render(<SaveOfflineButton tracks={tracks} />);
    await fireEvent.press(screen.getByRole('button', { name: /오프라인 저장$/ }));
    await finish('a');
    await finish('b', new Error('network'));
    expect(screen.getByText(/1곡을 저장하지 못했습니다. 인터넷 연결을 확인하고/)).toBeTruthy();
    expect(screen.getByText('2곡 중 1곡 저장됨 · 남은 곡 20.0 MB')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /남은 1곡 저장$/ }));
    expect(useOfflineSave.getState().queue.map((t) => t.id)).toEqual(['b']);
    await finish('b');
  });

  it('저장하는 동안 멈출 수 있습니다', async () => {
    await render(<SaveOfflineButton tracks={tracks} />);
    await fireEvent.press(screen.getByRole('button', { name: /오프라인 저장$/ }));
    await fireEvent.press(screen.getByRole('button', { name: '저장 멈추기' }));
    await finish('a');
    expect(useLibraryStore.getState().offlineTracks).toEqual([]);
    expect(screen.getByRole('button', { name: /오프라인 저장$/ })).toBeTruthy();
  });

  it('스트리밍 곡이 없으면 그리지 않습니다', async () => {
    await render(<SaveOfflineButton tracks={[]} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
