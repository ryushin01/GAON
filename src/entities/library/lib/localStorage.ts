import { Directory, File, Paths } from 'expo-file-system';

import type { LocalFileRef } from './types';

const root = () => new Directory(Paths.document, 'local-library');
const HEADER_BYTES = 8 * 1024 * 1024;

function ensureRoot() {
  const dir = root();
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

const EXT: Record<string, string> = { 'image/png': 'png', 'image/webp': 'webp' };

export async function readHeader(ref: LocalFileRef): Promise<Uint8Array> {
  const file = new File(ref.uri);
  const handle = file.open();
  try {
    return handle.readBytes(Math.min(HEADER_BYTES, handle.size ?? HEADER_BYTES));
  } finally {
    handle.close();
  }
}

/** 앱을 다시 켜도 남도록 문서 폴더로 옮깁니다. 절대 경로는 앱 업데이트 때 바뀔 수 있어 저장하지 않습니다. */
export async function saveLocalFile(id: string, ref: LocalFileRef, art?: { mime: string; data: Uint8Array }): Promise<void> {
  const dir = ensureRoot();
  new File(ref.uri).copy(new File(dir, `${id}.flac`));
  if (art) {
    const target = new File(dir, `${id}.${EXT[art.mime] ?? 'jpg'}`);
    target.create({ overwrite: true });
    target.write(art.data);
  }
}

/** 받다 실패하면 반쯤 쓴 파일(Android)을 지웁니다. */
async function download(url: string, target: File): Promise<void> {
  try {
    await File.downloadFileAsync(url, target, { idempotent: true });
  } catch (error) {
    if (target.exists) target.delete();
    throw error;
  }
}

/**
 * 스트리밍 곡을 받아 문서 폴더에 넣습니다(오프라인 저장). 내 FLAC과 같은 자리에 두어 같은 방법으로 재생합니다.
 * 앱의 내려받기는 도중에 멈출 수 없어, 취소는 받은 뒤에 부르는 쪽이 지웁니다.
 */
export async function downloadAudio(id: string, url: string, _signal?: AbortSignal): Promise<void> {
  await download(url, new File(ensureRoot(), `${id}.flac`));
}

export async function downloadArt(id: string, url: string, _signal?: AbortSignal): Promise<void> {
  const ext = /\.(png|webp)(?:$|\?)/i.exec(url)?.[1]?.toLowerCase() ?? 'jpg';
  await download(url, new File(ensureRoot(), `${id}.${ext}`));
}

/** 앱의 문서 폴더는 운영체제가 지우지 않습니다. 웹과 모양을 맞춥니다. */
export async function keepStoredFiles(): Promise<void> {}

export async function resolveAudioUri(id: string): Promise<string> {
  const file = new File(root(), `${id}.flac`);
  if (!file.exists) throw new Error('저장된 파일을 찾을 수 없습니다.');
  return file.uri;
}

/** 앱은 파일 경로로 재생해 놓을 것이 없습니다. 웹과 모양을 맞춥니다. */
export function releaseAudioUris(_keep: string[]): void {}

export async function resolveArtUri(id: string): Promise<string | undefined> {
  for (const ext of ['jpg', 'png', 'webp']) {
    const file = new File(root(), `${id}.${ext}`);
    if (file.exists) return file.uri;
  }
  return undefined;
}

/** 앱은 파일 경로로 재생해, 재생 중인 파일을 지워도 운영체제가 연 파일은 끝까지 읽습니다. */
export async function deleteLocalFile(id: string, _options?: { release?: boolean }): Promise<void> {
  for (const ext of ['flac', 'jpg', 'png', 'webp']) {
    const file = new File(root(), `${id}.${ext}`);
    if (file.exists) file.delete();
  }
}
