import { useCallback, useMemo } from 'react';

import { useLocalTracks, useOfflineTracks } from '@/entities/library';
import { useCatalog, type Track } from '@/entities/music';

/**
 * 카탈로그 곡과 로컬 곡을 id로 찾습니다. 지워진 곡은 건너뜁니다.
 * 카탈로그를 받지 못하면(인터넷 없음) 오프라인 저장한 곡의 정보로 찾아, 저장한 곡은 보관함에 그대로 보입니다.
 */
export function useTrackLookup() {
  const { data: catalog } = useCatalog();
  const local = useLocalTracks();
  const offline = useOfflineTracks();
  const localById = useMemo(() => new Map(local.map((t) => [t.id, t])), [local]);
  const offlineById = useMemo(() => new Map(offline.map((t) => [t.id, t])), [offline]);
  const find = useCallback(
    (id: string) => localById.get(id) ?? catalog?.tracksById.get(id) ?? offlineById.get(id),
    [catalog, localById, offlineById],
  );
  const resolve = useCallback(
    (ids: string[]) => ids.map(find).filter((t): t is Track => Boolean(t)),
    [find],
  );
  return { find, resolve };
}
