import { useCallback, useMemo } from 'react';

import { useLocalTracks } from '@/entities/library';
import { useCatalog, type Track } from '@/entities/music';

/** 카탈로그 곡과 로컬 곡을 id로 찾습니다. 지워진 곡은 건너뜁니다. */
export function useTrackLookup() {
  const { data: catalog } = useCatalog();
  const local = useLocalTracks();
  const localById = useMemo(() => new Map(local.map((t) => [t.id, t])), [local]);
  const find = useCallback(
    (id: string) => localById.get(id) ?? catalog?.tracksById.get(id),
    [catalog, localById],
  );
  const resolve = useCallback(
    (ids: string[]) => ids.map(find).filter((t): t is Track => Boolean(t)),
    [find],
  );
  return { find, resolve };
}
