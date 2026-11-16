import { useQuery } from '@tanstack/react-query';

import { fetchLatestRelease, isDesktopApp } from '@/shared/api';

/** 1.10.0이 1.9.3보다 새 버전인지처럼 숫자로 비교합니다. 숫자가 아닌 부분(-beta 등)은 버립니다. */
export function isNewerVersion(latest: string, current: string): boolean {
  const parts = (version: string) => version.split('-')[0].split('.').map((part) => Number.parseInt(part, 10) || 0);
  const a = parts(latest);
  const b = parts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

/**
 * PC 앱에서 더 새 설치본이 나왔으면 그 버전과 주소를 돌려줍니다. 웹은 늘 최신이라 확인하지 않습니다.
 * 확인하지 못하면 알리지 않습니다(설정 화면의 다른 기능을 막지 않음).
 */
export function useUpdateNotice(current: string | undefined) {
  const { data } = useQuery({
    queryKey: ['latest-release'],
    queryFn: fetchLatestRelease,
    enabled: isDesktopApp() && Boolean(current),
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });
  return data && current && isNewerVersion(data.version, current) ? data : null;
}
