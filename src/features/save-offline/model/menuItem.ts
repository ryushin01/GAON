import { isStoredOffline } from '@/entities/library';
import type { Track } from '@/entities/music';

import { cancelOffline, removeOffline, saveOffline, useOfflineSave } from './saveOffline';

/**
 * 곡 메뉴의 오프라인 저장 항목입니다. 메뉴를 열 때 한 번 구해, 곡 목록의 행마다 저장 상태를 구독하지 않습니다.
 * 내 FLAC은 이미 기기에 있어 항목이 없습니다.
 */
export function offlineMenuItem(track: Track): { label: string; onPress: () => void } | null {
  if (track.source !== 'stream') return null;
  if (isStoredOffline(track.id)) return { label: '오프라인 저장 삭제', onPress: () => void removeOffline([track.id]) };
  if (useOfflineSave.getState().queue.some((t) => t.id === track.id)) {
    return { label: '오프라인 저장 멈추기', onPress: () => cancelOffline([track.id]) };
  }
  return { label: '오프라인 저장', onPress: () => saveOffline([track]) };
}
