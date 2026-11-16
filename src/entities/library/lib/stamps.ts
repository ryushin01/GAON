/**
 * 항목마다 바뀐 시각(밀리초)입니다. 보관함 동기화가 두 기기의 더하기와 빼기 중 나중 것을 고를 때 씁니다.
 * 시각은 각 기기의 시계입니다.
 */
export type Stamps = Record<string, number>;

/** 삭제 기록은 이 기간과 개수만큼만 남깁니다. 그보다 오래 동기화하지 않은 기기의 옛 항목은 되살아날 수 있습니다. */
const KEEP_MS = 180 * 24 * 60 * 60 * 1000;
const KEEP_COUNT = 500;

/** 객체의 기본 속성(constructor 등)과 헷갈리지 않게 자기 키만 봅니다. */
export function hasStamp(stamps: Stamps, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(stamps, key);
}

/** keys의 시각을 at으로 남긴 새 기록입니다. */
export function stamp(stamps: Stamps | undefined, keys: string[], at: number): Stamps {
  return { ...stamps, ...Object.fromEntries(keys.map((key) => [key, at])) };
}

/** keys를 뺀 새 기록입니다. */
export function unstamp(stamps: Stamps | undefined, keys: string[]): Stamps {
  const next = { ...stamps };
  for (const key of keys) delete next[key];
  return next;
}

/** 오래된 삭제 기록을 지우고, 가장 최근 것부터 정해진 개수만 남깁니다. */
export function pruneStamps(stamps: Stamps, now = Date.now()): Stamps {
  const entries = Object.entries(stamps);
  const fresh = entries.filter(([, at]) => now - at < KEEP_MS);
  if (fresh.length === entries.length && fresh.length <= KEEP_COUNT) return stamps;
  return Object.fromEntries(fresh.sort((a, b) => b[1] - a[1]).slice(0, KEEP_COUNT));
}
