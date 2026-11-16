import { useMemo } from 'react';
import { create } from 'zustand';

import { deleteLocalFile, downloadArt, downloadAudio, keepStoredFiles, resolveArtUri, useLibraryStore } from '@/entities/library';
import type { Track } from '@/entities/music';

type SaveState = {
  /** 받을 곡입니다. 받는 중인 곡도 받을 때까지 맨 앞에 남습니다. */
  queue: Track[];
  /** 받는 중인 곡 id입니다. */
  current: string | null;
  /** 받지 못한 곡 id입니다. 다시 저장하면 지웁니다. */
  failed: string[];
};

/** 오프라인 저장의 진행 상태입니다. 앱을 다시 켜면 남지 않습니다(받던 곡은 다시 저장해야 함). */
export const useOfflineSave = create<SaveState>(() => ({ queue: [], current: null, failed: [] }));

let running = false;
let controller: AbortController | null = null;

const savedIds = () => new Set(useLibraryStore.getState().offlineTracks.map((t) => t.id));

/** 스트리밍 곡만 저장합니다. 이미 저장했거나 받을 차례를 기다리는 곡은 건너뜁니다. */
export function saveOffline(tracks: Track[]) {
  const saved = savedIds();
  const { queue, failed } = useOfflineSave.getState();
  const waiting = new Set(queue.map((t) => t.id));
  const fresh = tracks.filter((t) => t.source === 'stream' && !saved.has(t.id) && !waiting.has(t.id));
  if (!fresh.length) return;
  const retried = new Set(fresh.map((t) => t.id));
  useOfflineSave.setState({ queue: [...queue, ...fresh], failed: failed.filter((id) => !retried.has(id)) });
  void keepStoredFiles();
  void work();
}

/** 저장을 멈춥니다. ids를 주면 그 곡만 빼고, 받는 중이던 곡은 받다 만 파일을 지웁니다. */
export function cancelOffline(ids?: string[]) {
  const drop = ids ? new Set(ids) : null;
  const { queue, current } = useOfflineSave.getState();
  useOfflineSave.setState({ queue: drop ? queue.filter((t) => t.id === current || !drop.has(t.id)) : queue.filter((t) => t.id === current) });
  if (current && (!drop || drop.has(current))) controller?.abort();
}

/** 저장한 곡을 지웁니다. 재생 중일 수 있어 재생 주소는 놓지 않고, 곡이 큐에서 빠질 때 엔진이 놓습니다. */
export async function removeOffline(ids: string[]) {
  cancelOffline(ids);
  useLibraryStore.getState().removeOfflineTracks(ids);
  await Promise.all(ids.map((id) => deleteLocalFile(id, { release: false }).catch(() => undefined)));
}

/** 곡을 하나씩 받습니다. 한꺼번에 받으면 재생 중인 스트리밍이 끊길 수 있습니다. */
async function work() {
  if (running) return;
  running = true;
  try {
    for (let track = useOfflineSave.getState().queue[0]; track; track = useOfflineSave.getState().queue[0]) {
      const job = new AbortController();
      controller = job;
      useOfflineSave.setState({ current: track.id });
      try {
        await downloadAudio(track.id, track.uri, job.signal);
        // 앨범 아트는 받지 못해도 곡은 들을 수 있습니다.
        if (track.artUri) await downloadArt(track.id, track.artUri, job.signal).catch(() => undefined);
        // 앱의 내려받기는 도중에 멈출 수 없어, 받은 뒤에 멈췄는지 봅니다.
        if (job.signal.aborted) throw new Error('cancelled');
        useLibraryStore.getState().addOfflineTrack(track);
        const art = await resolveArtUri(track.id).catch(() => undefined);
        if (art) useLibraryStore.getState().setLocalArt({ [track.id]: art });
      } catch {
        if (!job.signal.aborted) useOfflineSave.setState((s) => ({ failed: [...s.failed, track.id] }));
        // 받다 만 파일은 남기지 않습니다.
        await deleteLocalFile(track.id, { release: false }).catch(() => undefined);
      }
      const done = track.id;
      useOfflineSave.setState((s) => ({ queue: s.queue.filter((t) => t.id !== done), current: null }));
    }
  } finally {
    running = false;
    controller = null;
  }
}

/** 앱을 켤 때 오프라인 저장한 곡의 앨범 아트 주소를 다시 구합니다. */
export async function restoreOfflineArt(): Promise<void> {
  const { offlineTracks, setLocalArt } = useLibraryStore.getState();
  const entries = await Promise.all(offlineTracks.map(async (t) => [t.id, await resolveArtUri(t.id).catch(() => undefined)] as const));
  setLocalArt(Object.fromEntries(entries.filter((e): e is readonly [string, string] => Boolean(e[1]))));
}

export type OfflineStatus = {
  /** 목록의 스트리밍 곡 수입니다. 내 FLAC은 이미 기기에 있어 세지 않습니다. */
  total: number;
  saved: number;
  /** 받을 차례를 기다리거나 받는 중인 곡 수입니다. */
  saving: number;
  failed: number;
  /** 아직 저장하지 않았고 받고 있지도 않은 곡입니다. */
  missing: Track[];
  /** 저장한 곡의 크기(바이트)입니다. */
  savedBytes: number;
  /** 남은 곡의 크기(바이트)입니다. */
  missingBytes: number;
};

/** 곡 목록의 오프라인 저장 상태입니다. */
export function useOfflineStatus(tracks: Track[]): OfflineStatus {
  const offline = useLibraryStore((s) => s.offlineTracks);
  const queue = useOfflineSave((s) => s.queue);
  const failed = useOfflineSave((s) => s.failed);
  return useMemo(() => {
    const saved = new Set(offline.map((t) => t.id));
    const waiting = new Set(queue.map((t) => t.id));
    const failedIds = new Set(failed);
    const stream = tracks.filter((t) => t.source === 'stream');
    const done = stream.filter((t) => saved.has(t.id));
    const missing = stream.filter((t) => !saved.has(t.id) && !waiting.has(t.id));
    const size = (list: Track[]) => list.reduce((sum, t) => sum + (t.fileSize ?? 0), 0);
    return {
      total: stream.length,
      saved: done.length,
      saving: stream.filter((t) => waiting.has(t.id)).length,
      failed: stream.filter((t) => failedIds.has(t.id)).length,
      missing,
      savedBytes: size(done),
      missingBytes: size(missing),
    };
  }, [tracks, offline, queue, failed]);
}
