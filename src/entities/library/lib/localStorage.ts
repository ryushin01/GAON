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

export async function resolveAudioUri(id: string): Promise<string> {
  return new File(root(), `${id}.flac`).uri;
}

export async function resolveArtUri(id: string): Promise<string | undefined> {
  for (const ext of ['jpg', 'png', 'webp']) {
    const file = new File(root(), `${id}.${ext}`);
    if (file.exists) return file.uri;
  }
  return undefined;
}

export async function deleteLocalFile(id: string): Promise<void> {
  for (const ext of ['flac', 'jpg', 'png', 'webp']) {
    const file = new File(root(), `${id}.${ext}`);
    if (file.exists) file.delete();
  }
}
