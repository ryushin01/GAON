import { useLibraryStore } from '@/entities/library';
import type { Track } from '@/entities/music';

import { canSaveOffline, cancelOffline, removeOffline, saveOffline, useOfflineSave } from './saveOffline';

/**
 * 곡 메뉴의 오프라인 저장 항목입니다. 메뉴를 연 동안만 그리는 곳에서 불러, 곡 목록의 행마다 저장 상태를 구독하지 않으면서도
 * 메뉴를 연 사이에 저장이 끝나면 항목이 바뀌게 합니다. 내 FLAC은 이미 기기에 있어 항목이 없습니다.
 */
export function useOfflineMenuItem(track: Track): { label: string; onPress: () => void } | null {
  const saved = useLibraryStore((s) => s.offlineTracks.some((t) => t.id === track.id));
  const queued = useOfflineSave((s) => s.queue.some((t) => t.id === track.id));
  if (!canSaveOffline(track)) return null;
  if (saved) return { label: '오프라인 저장 삭제', onPress: () => void removeOffline([track.id]) };
  if (queued) return { label: '오프라인 저장 멈추기', onPress: () => cancelOffline([track.id]) };
  return { label: '오프라인 저장', onPress: () => saveOffline([track]) };
}
