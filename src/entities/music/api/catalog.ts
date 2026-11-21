import { useQuery } from '@tanstack/react-query';

import { MEDIA_BASE_URL } from '@/shared/config';
import { matchesSearch } from '@/shared/lib';

import type { Album, Artist, Catalog, LyricLine, Track } from '../model/types';

import { readSnapshot } from './snapshot';

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

/**
 * 받은 카탈로그의 상대 경로를 주소로 바꿉니다.
 * audioBaseFor는 곡마다 음원 주소의 앞부분을 정합니다(오프라인 데모는 앱에 든 곡만 앱 안의 주소를 씁니다).
 */
export function toCatalog(
  raw: RawCatalog,
  baseUrl: string = MEDIA_BASE_URL,
  audioBaseFor: (audioPath: string) => string = () => baseUrl,
): Catalog {
  const tracks: Track[] = raw.tracks.map(({ sampleRate, bitDepth, channels, audioPath, artPath, discPath, ...rest }) => ({
    ...rest,
    source: 'stream',
    format: { sampleRate, bitDepth, channels },
    uri: `${audioBaseFor(audioPath)}/${audioPath}`,
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

/** 형식이 어긋나면 화면을 그리다 깨지는 대신 불러오기 실패로 안내합니다. */
export function parseRawCatalog(value: unknown): RawCatalog {
  const raw = value as Partial<RawCatalog> | null;
  if (!raw || !Array.isArray(raw.artists) || !Array.isArray(raw.albums) || !Array.isArray(raw.tracks)) {
    throw new Error('카탈로그 형식이 올바르지 않습니다.');
  }
  return raw as RawCatalog;
}

/** 공개 미디어 서버가 이 시간 안에 답하지 않으면 앱에 든 데모 카탈로그로 넘어갑니다. */
const REMOTE_TIMEOUT_MS = 8000;

async function fetchRemoteCatalog(): Promise<Catalog> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
  try {
    const response = await fetch(`${MEDIA_BASE_URL}/catalog.json`, { signal: controller.signal });
    if (!response.ok) throw new Error(`카탈로그를 불러오지 못했습니다. (${response.status})`);
    return toCatalog(parseRawCatalog(await response.json()));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 공개 미디어를 먼저 받고, 연결이 끊겼거나 서버가 답하지 않으면 앱에 든 데모 카탈로그(스냅숏)를 씁니다.
 * 스냅숏도 못 읽으면 처음 오류로 실패합니다.
 */
export async function fetchCatalog(): Promise<Catalog> {
  try {
    return await fetchRemoteCatalog();
  } catch (error) {
    try {
      const { raw, baseUrl, audioBaseFor } = await readSnapshot();
      return { ...toCatalog(parseRawCatalog(raw), baseUrl, audioBaseFor), snapshot: true };
    } catch {
      throw error;
    }
  }
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
  return useQuery({
    queryKey: ['catalog'],
    queryFn: loadCatalog,
    // 데모 카탈로그를 보여 주는 중이면 화면을 옮길 때마다 공개 미디어에 다시 붙어 봅니다.
    staleTime: (query) => (query.state.data?.snapshot ? 60 * 1000 : 60 * 60 * 1000),
  });
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

/** 제목, 가수, 피처링, 앨범, 장르, 크레딧에서 찾습니다. 띄어쓰기를 무시하고 한글은 초성으로도 찾습니다. */
export function matchesQuery(track: Track, query: string): boolean {
  if (!query.trim()) return false;
  return [track.title, track.albumTitle, track.genre ?? '', ...track.artists, ...track.featuring, ...track.lyricists, ...track.composers]
    .some((v) => matchesSearch(v, query));
}
