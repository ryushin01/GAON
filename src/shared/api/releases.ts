/** PC 설치본을 공개하는 저장소입니다. */
const LATEST_RELEASE_URL = 'https://api.github.com/repos/ryushin01/GAON/releases/latest';

export type LatestRelease = { version: string; url: string };

/** 가장 최근에 공개한 설치본의 버전(v 없이)과 내려받는 페이지 주소입니다. 공개한 것이 없으면 null입니다. */
export async function fetchLatestRelease(): Promise<LatestRelease | null> {
  const response = await fetch(LATEST_RELEASE_URL, { headers: { Accept: 'application/vnd.github+json' } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`최신 버전을 확인하지 못했습니다. (${response.status})`);
  const release = (await response.json()) as { tag_name?: unknown; html_url?: unknown };
  if (typeof release.tag_name !== 'string' || typeof release.html_url !== 'string') return null;
  return { version: release.tag_name.replace(/^v/, ''), url: release.html_url };
}
