/** 소유자 보관함을 비공개 Gist 하나에 저장합니다. 서버 없이 GitHub API를 바로 부릅니다. */
const API = 'https://api.github.com';
const FILE = 'gaon-library.json';
const DESCRIPTION = 'GAON 보관함 (앱이 관리합니다)';

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!response.ok) {
    const message = response.status === 401 ? '토큰이 올바르지 않거나 만료되었습니다.' : response.status === 403 ? '토큰에 Gist 권한이 없습니다.' : `GitHub 요청이 실패했습니다. (${response.status})`;
    throw new GitHubError(message, response.status);
  }
  return (await response.json()) as T;
}

/** 토큰 주인의 계정 이름입니다. */
export async function fetchGitHubLogin(token: string): Promise<string> {
  const user = await call<{ login: string }>(token, '/user');
  return user.login;
}

type GistFile = { content?: string; truncated?: boolean; raw_url?: string };
type Gist = { id: string; updated_at: string; files: Record<string, GistFile | undefined> };

/** 보관함 Gist를 찾습니다. 없으면 null입니다. */
async function findGist(token: string): Promise<Gist | null> {
  for (let page = 1; page <= 10; page += 1) {
    const gists = await call<Gist[]>(token, `/gists?per_page=100&page=${page}`);
    const found = gists.find((gist) => gist.files[FILE]);
    if (found) return call<Gist>(token, `/gists/${found.id}`);
    if (gists.length < 100) return null;
  }
  return null;
}

let cachedId: string | null = null;

/** 저장된 보관함과 마지막 저장 시각입니다. 아직 없으면 null입니다. */
export async function readLibraryGist(token: string): Promise<{ data: unknown; updatedAt: string } | null> {
  const gist = cachedId ? await call<Gist>(token, `/gists/${cachedId}`) : await findGist(token);
  if (!gist) return null;
  cachedId = gist.id;
  const content = gist.files[FILE]?.content;
  if (!content) return null;
  return { data: JSON.parse(content) as unknown, updatedAt: gist.updated_at };
}

/** 보관함을 저장하고 저장 시각을 돌려줍니다. Gist가 없으면 비공개로 만듭니다. */
export async function writeLibraryGist(token: string, data: unknown): Promise<string> {
  const files = { [FILE]: { content: JSON.stringify(data) } };
  if (!cachedId) {
    const existing = await findGist(token);
    cachedId = existing?.id ?? null;
  }
  const gist = cachedId
    ? await call<Gist>(token, `/gists/${cachedId}`, { method: 'PATCH', body: JSON.stringify({ files }) })
    : await call<Gist>(token, '/gists', { method: 'POST', body: JSON.stringify({ description: DESCRIPTION, public: false, files }) });
  cachedId = gist.id;
  return gist.updated_at;
}

/** 로그아웃하면 찾아 둔 Gist를 잊습니다. */
export function forgetLibraryGist() {
  cachedId = null;
}
