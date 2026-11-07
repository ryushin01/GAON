import type { FlacInfo } from '@/shared/lib';

import { toLocalTrack } from './importFlac';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({ Directory: jest.fn(), File: jest.fn(), Paths: {} }));

const info: FlacInfo = { sampleRate: 96000, bitDepth: 24, channels: 2, durationSec: 240, tags: {} };

describe('toLocalTrack', () => {
  it('태그가 없으면 파일 이름을 제목으로 씁니다', () => {
    const track = toLocalTrack('내 노래.flac', info);
    expect(track).toMatchObject({ title: '내 노래', source: 'local', albumTitle: '내 FLAC', artists: ['알 수 없는 가수'] });
    expect(track.format).toEqual({ sampleRate: 96000, bitDepth: 24, channels: 2 });
  });
  it('태그와 여러 가수를 읽습니다', () => {
    const track = toLocalTrack('a.flac', { ...info, tags: { title: '빛 (The Light)', artist: '유신, 윤슬', album: '빛 (The Light)' } });
    expect(track).toMatchObject({ title: '빛 (The Light)', artists: ['유신', '윤슬'], albumTitle: '빛 (The Light)' });
  });
  it('같은 파일은 같은 id, 다른 파일은 다른 id입니다', () => {
    expect(toLocalTrack('a.flac', info).id).toBe(toLocalTrack('a.flac', info).id);
    expect(toLocalTrack('a.flac', info).id).not.toBe(toLocalTrack('b.flac', info).id);
  });
});
