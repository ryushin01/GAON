/** 지금 순위에서 이만큼 앞의 디스크까지 이미지를 미리 받습니다. */
export const PRELOAD_AHEAD = 2;

/** 지금 순위의 바로 앞 한 장과 뒤 두 장입니다. 화면에 보이는 디스크입니다. */
export function nearby(position: number, last: number) {
  const indices: number[] = [];
  for (let i = Math.max(0, position - 1); i <= Math.min(last, position + PRELOAD_AHEAD); i += 1) indices.push(i);
  return indices;
}

/**
 * 지금까지 이미지를 받은 디스크에 지금 가까이 있는 디스크를 더합니다. 더할 것이 없으면 같은 집합을 돌려줍니다.
 * 목록에서 멀리 건너뛰어도 건너뛴 디스크는 더하지 않습니다.
 */
export function withNearby(loaded: ReadonlySet<number>, position: number, last: number): ReadonlySet<number> {
  const missing = nearby(position, last).filter((i) => !loaded.has(i));
  return missing.length > 0 ? new Set([...loaded, ...missing]) : loaded;
}
