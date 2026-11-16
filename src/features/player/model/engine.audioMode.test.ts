import type { Track } from '@/entities/music';

import { playTracks } from './engine';
import { usePlayerStore } from './playerStore';

const mockSetAudioMode = jest.fn();
const mockList = {
  playing: false,
  loop: 'none',
  trackCount: 0,
  addListener: jest.fn(),
  clear: jest.fn(),
  add: jest.fn(),
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
  setAudioModeAsync: (...args: unknown[]) => mockSetAudioMode(...args),
}));
jest.mock('expo-file-system', () => ({ Directory: jest.fn(), File: jest.fn(), Paths: {} }));

const track: Track = {
  id: 'a', source: 'stream', title: 'a', artists: ['유신'], featuring: [], albumTitle: '앨범', lyricists: [], composers: [], arrangers: [],
  durationSec: 30, format: { sampleRate: 96000, bitDepth: 24, channels: 2 }, uri: 'https://m/a.flac', lyrics: [],
};

describe('오디오 모드 설정', () => {
  it('한 번 실패해도 다음 재생에서 다시 설정하고 재생합니다', async () => {
    mockSetAudioMode.mockRejectedValueOnce(new Error('오디오 세션을 설정하지 못했습니다.')).mockResolvedValue(undefined);
    await playTracks([track]);
    expect(usePlayerStore.getState().error).toBe('오디오 세션을 설정하지 못했습니다.');
    expect(mockList.play).not.toHaveBeenCalled();

    await playTracks([track]);
    expect(mockSetAudioMode).toHaveBeenCalledTimes(2);
    expect(mockList.play).toHaveBeenCalledTimes(1);
    expect(usePlayerStore.getState().error).toBeNull();

    // 성공한 설정은 기억해 다시 하지 않습니다.
    await playTracks([track]);
    expect(mockSetAudioMode).toHaveBeenCalledTimes(2);
  });
});
