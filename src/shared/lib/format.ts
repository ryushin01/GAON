export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const seconds = Math.floor(totalSeconds);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** 2026-10-24 → 2026.10.24 */
export function formatDate(iso?: string): string {
  return iso ? iso.replace(/-/g, '.') : '';
}

export function formatCount(value: number): string {
  return value.toLocaleString('ko-KR');
}

export function formatFileSize(bytes: number): string {
  return bytes >= 1_000_000_000 ? `${(bytes / 1_000_000_000).toFixed(1)} GB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
