import type { LocalFileRef } from './types';

const DB_NAME = 'gaon-local-library';
const STORE = 'files';
const HEADER_BYTES = 8 * 1024 * 1024;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = run(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }).finally(() => db.close());
}

const urls = new Map<string, string>();

async function blobUrl(key: string): Promise<string | undefined> {
  const cached = urls.get(key);
  if (cached) return cached;
  const blob = await withStore<Blob | undefined>('readonly', (s) => s.get(key));
  if (!blob) return undefined;
  const url = URL.createObjectURL(blob);
  urls.set(key, url);
  return url;
}

export async function readHeader(ref: LocalFileRef): Promise<Uint8Array> {
  if (!ref.file) throw new Error('파일을 읽을 수 없습니다.');
  return new Uint8Array(await ref.file.slice(0, HEADER_BYTES).arrayBuffer());
}

/** 브라우저와 PC 앱에서는 IndexedDB에 넣어 앱을 다시 켜도 남게 합니다. */
export async function saveLocalFile(id: string, ref: LocalFileRef, art?: { mime: string; data: Uint8Array }): Promise<void> {
  if (!ref.file) throw new Error('파일을 읽을 수 없습니다.');
  const audio = ref.file.slice(0, ref.file.size, 'audio/flac');
  await withStore('readwrite', (s) => s.put(audio, `audio:${id}`));
  if (art) {
    const blob = new Blob([art.data.slice()], { type: art.mime });
    await withStore('readwrite', (s) => s.put(blob, `art:${id}`));
  }
}

export async function resolveAudioUri(id: string): Promise<string> {
  const url = await blobUrl(`audio:${id}`);
  if (!url) throw new Error('저장된 파일을 찾을 수 없습니다.');
  return url;
}

export async function resolveArtUri(id: string): Promise<string | undefined> {
  return blobUrl(`art:${id}`);
}

export async function deleteLocalFile(id: string): Promise<void> {
  for (const key of [`audio:${id}`, `art:${id}`]) {
    const url = urls.get(key);
    if (url) URL.revokeObjectURL(url);
    urls.delete(key);
    await withStore('readwrite', (s) => s.delete(key));
  }
}
