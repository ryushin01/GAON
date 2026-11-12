import { useQuery } from '@tanstack/react-query';

import { MEDIA_BASE_URL } from '@/shared/config';

import type { Album, Artist, Catalog, LyricLine, Track } from '../model/types';

type RawTrack = Omit<Track, 'source' | 'format' | 'uri' | 'artUri' | 'discUri'> & {
  sampleRate: number;
  bitDepth: number;
  channels: number;
  audioPath: string;
  artPath: string;
  discPath?: string;
  lyrics: LyricLine[];
};
type RawAlbum = Omit<Album, 'artUri' | 'discUri'> & { artPath: string; discPath?: string };
export type RawCatalog = { artists: Artist[]; albums: RawAlbum[]; tracks: RawTrack[] };

export function toCatalog(raw: RawCatalog, baseUrl: string = MEDIA_BASE_URL): Catalog {
  const tracks: Track[] = raw.tracks.map(({ sampleRate, bitDepth, channels, audioPath, artPath, discPath, ...rest }) => ({
    ...rest,
    source: 'stream',
    format: { sampleRate, bitDepth, channels },
    uri: `${baseUrl}/${audioPath}`,
    artUri: `${baseUrl}/${artPath}`,
    discUri: discPath ? `${baseUrl}/${discPath}` : undefined,
  }));
  const albums: Album[] = raw.albums.map(({ artPath, discPath, ...rest }) => ({
    ...rest,
    artUri: `${baseUrl}/${artPath}`,
    discUri: discPath ? `${baseUrl}/${discPath}` : undefined,
  }));
  return {
    artists: raw.artists,
    albums,
    tracks,
    tracksById: new Map(tracks.map((t) => [t.id, t])),
    albumsById: new Map(albums.map((a) => [a.id, a])),
  };
}

export async function fetchCatalog(): Promise<Catalog> {
  const response = await fetch(`${MEDIA_BASE_URL}/catalog.json`);
  if (!response.ok) throw new Error(`카탈로그를 불러오지 못했습니다. (${response.status})`);
  const raw = (await response.json()) as Partial<RawCatalog> | null;
  // 형식이 어긋나면 화면을 그리다 깨지는 대신 불러오기 실패로 안내합니다.
  if (!raw || !Array.isArray(raw.artists) || !Array.isArray(raw.albums) || !Array.isArray(raw.tracks)) {
    throw new Error('카탈로그 형식이 올바르지 않습니다.');
  }
  return toCatalog(raw as RawCatalog);
}

let early: Promise<Catalog> | null = null;

/** 앱을 켜자마자 카탈로그를 받기 시작합니다. 화면이 처음 찾을 때 이 결과를 이어받습니다. */
export function prefetchCatalog() {
  early ??= fetchCatalog();
  // 실패는 화면이 다시 요청할 때 처리합니다.
  early.catch(() => undefined);
}

function loadCatalog() {
  const pending = early;
  early = null;
  return pending ?? fetchCatalog();
}

export function useCatalog() {
  return useQuery({ queryKey: ['catalog'], queryFn: loadCatalog, staleTime: 60 * 60 * 1000 });
}

/** 발매일이 최근인 순서로 앨범을 돌려줍니다. */
export function latestAlbums(catalog: Catalog): Album[] {
  return [...catalog.albums].sort((a, b) => b.released.localeCompare(a.released));
}

export function chartTracks(catalog: Catalog, limit = 100): Track[] {
  return catalog.tracks.filter((t) => t.rank != null).slice(0, limit);
}

export function genresOf(tracks: Track[]): string[] {
  return [...new Set(tracks.map((t) => t.genre).filter((g): g is string => Boolean(g)))];
}

/** 제목, 가수, 피처링, 앨범, 장르, 크레딧에서 찾습니다. */
export function matchesQuery(track: Track, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return [track.title, track.albumTitle, track.genre ?? '', ...track.artists, ...track.featuring, ...track.lyricists, ...track.composers]
    .some((v) => v.toLowerCase().includes(q));
}
