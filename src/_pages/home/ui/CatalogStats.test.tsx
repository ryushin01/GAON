import { render, screen } from '@testing-library/react-native';

import type { Catalog, Track } from '@/entities/music';

import { CatalogStats } from './CatalogStats';

const track = (id: string, sampleRate: number, bitDepth: number, genre: string): Track => ({
  id, source: 'stream', title: id, artists: ['유신'], featuring: [], albumTitle: id, released: '2026-10-24', genre,
  lyricists: [], composers: [], arrangers: [], durationSec: 30, format: { sampleRate, bitDepth, channels: 2 }, uri: '', lyrics: [],
});

const tracks = [track('a', 96000, 24, '발라드'), track('b', 192000, 24, '재즈'), track('c', 44100, 16, '재즈'), track('d', 48000, 24, '록')];
const catalog = { artists: [{ name: '유신', role: '가수' }], albums: [], tracks, tracksById: new Map(), albumsById: new Map() } as unknown as Catalog;

describe('CatalogStats', () => {
  it('Hi-Res 비율과 최고 음질, 규모를 글자로 보여 줍니다', async () => {
    await render(<CatalogStats catalog={catalog} />);
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText(/192/)).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });
});
