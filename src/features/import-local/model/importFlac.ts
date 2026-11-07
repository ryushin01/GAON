import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

import { readHeader, resolveArtUri, saveLocalFile, useLibraryStore, type LocalFileRef } from '@/entities/library';
import type { Track } from '@/entities/music';
import { NotFlacError, parseFlac } from '@/shared/lib';

export type ImportResult = { added: number; rejected: string[] };

const PICKER_TYPES = Platform.select<string[]>({
  ios: ['org.xiph.flac'],
  // 기기에 따라 FLAC의 형식이 audio/flac이 아니어서 넓게 받고 내용으로 확인합니다.
  android: ['audio/*', 'application/octet-stream'],
  default: ['.flac', 'audio/flac', 'audio/x-flac'],
});

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, '');
}

/** 같은 파일을 다시 가져와도 중복되지 않는 id입니다. */
function localId(name: string, durationSec: number, sampleRate: number) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return `local-${(hash >>> 0).toString(36)}-${Math.round(durationSec)}-${sampleRate}`;
}

export function toLocalTrack(name: string, info: ReturnType<typeof parseFlac>): Track {
  const { tags } = info;
  return {
    id: localId(name, info.durationSec, info.sampleRate),
    source: 'local',
    title: tags.title || baseName(name),
    artists: tags.artist ? tags.artist.split(/\s*[,;]\s*/) : ['알 수 없는 가수'],
    featuring: [],
    albumTitle: tags.album || '내 FLAC',
    genre: tags.genre,
    released: tags.date,
    trackNumber: tags.tracknumber ? Number.parseInt(tags.tracknumber, 10) || undefined : undefined,
    lyricists: [],
    composers: [],
    arrangers: [],
    durationSec: info.durationSec,
    format: { sampleRate: info.sampleRate, bitDepth: info.bitDepth, channels: info.channels },
    uri: '',
    lyrics: tags.lyrics ? tags.lyrics.split(/\r?\n/).filter(Boolean).map((text) => ({ t: -1, text })) : [],
  };
}

export async function importRefs(refs: LocalFileRef[]): Promise<ImportResult> {
  const result: ImportResult = { added: 0, rejected: [] };
  const tracks: Track[] = [];
  const art: Record<string, string> = {};

  for (const ref of refs) {
    try {
      const info = parseFlac(await readHeader(ref));
      const track = toLocalTrack(ref.name, info);
      await saveLocalFile(track.id, ref, info.picture);
      const artUri = await resolveArtUri(track.id);
      if (artUri) art[track.id] = artUri;
      tracks.push(track);
      result.added += 1;
    } catch (error) {
      if (!(error instanceof NotFlacError)) console.warn('FLAC 가져오기 실패', error);
      result.rejected.push(ref.name);
    }
  }
  const store = useLibraryStore.getState();
  if (tracks.length) store.addLocalTracks(tracks);
  if (Object.keys(art).length) store.setLocalArt(art);
  return result;
}

/** 파일 선택 창을 띄웁니다. 취소하면 null을 돌려줍니다. */
export async function pickAndImportFlac(): Promise<ImportResult | null> {
  const picked = await DocumentPicker.getDocumentAsync({ type: PICKER_TYPES, multiple: true, copyToCacheDirectory: true });
  if (picked.canceled) return null;
  return importRefs(picked.assets.map((a) => ({ uri: a.uri, name: a.name, file: a.file })));
}

/** 저장된 곡의 앨범 아트 주소를 앱을 켤 때 다시 구합니다. */
export async function restoreLocalArt(): Promise<void> {
  const { localTracks, setLocalArt } = useLibraryStore.getState();
  const entries = await Promise.all(localTracks.map(async (t) => [t.id, await resolveArtUri(t.id)] as const));
  setLocalArt(Object.fromEntries(entries.filter((e): e is readonly [string, string] => Boolean(e[1]))));
}
