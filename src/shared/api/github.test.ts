import { fetchGitHubLogin, forgetLibraryGist, readLibraryGist, writeLibraryGist } from './github';

const json = (body: unknown, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);

describe('GitHub 보관함', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    forgetLibraryGist();
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('토큰 주인의 계정 이름을 확인합니다', async () => {
    fetchMock.mockReturnValueOnce(json({ login: 'ryushin01' }));
    await expect(fetchGitHubLogin('t')).resolves.toBe('ryushin01');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer t');
  });

  it('잘못된 토큰이면 이유를 알려 줍니다', async () => {
    fetchMock.mockReturnValueOnce(json({}, 401));
    await expect(fetchGitHubLogin('t')).rejects.toThrow('토큰이 올바르지 않거나 만료되었습니다.');
  });

  it('보관함 Gist가 없으면 null이고, 저장하면 비공개로 만듭니다', async () => {
    fetchMock.mockReturnValueOnce(json([]));
    await expect(readLibraryGist('t')).resolves.toBeNull();
    fetchMock.mockReturnValueOnce(json([])).mockReturnValueOnce(json({ id: 'g1', updated_at: '2026-11-10T00:00:00Z', files: {} }));
    await expect(writeLibraryGist('t', { likedIds: ['a'] })).resolves.toBe('2026-11-10T00:00:00Z');
    const [url, init] = fetchMock.mock.calls[2];
    expect(url).toBe('https://api.github.com/gists');
    expect(JSON.parse(init.body).public).toBe(false);
  });

  it('찾은 Gist를 읽고 그 Gist에 덮어씁니다', async () => {
    fetchMock
      .mockReturnValueOnce(json([{ id: 'g1', updated_at: 'x', files: { 'gaon-library.json': {} } }]))
      .mockReturnValueOnce(json({ id: 'g1', updated_at: '2026-11-10T01:00:00Z', files: { 'gaon-library.json': { content: '{"likedIds":["b"]}' } } }));
    await expect(readLibraryGist('t')).resolves.toEqual({ data: { likedIds: ['b'] }, updatedAt: '2026-11-10T01:00:00Z' });
    fetchMock.mockReturnValueOnce(json({ id: 'g1', updated_at: '2026-11-10T02:00:00Z', files: {} }));
    await writeLibraryGist('t', {});
    expect(fetchMock.mock.calls[2][0]).toBe('https://api.github.com/gists/g1');
    expect(fetchMock.mock.calls[2][1].method).toBe('PATCH');
  });

  it('1MB가 넘어 잘린 파일은 원본(raw_url)을 따로 받아 읽습니다', async () => {
    fetchMock
      .mockReturnValueOnce(json([{ id: 'g1', updated_at: 'x', files: { 'gaon-library.json': {} } }]))
      .mockReturnValueOnce(
        json({
          id: 'g1',
          updated_at: '2026-11-13T00:00:00Z',
          files: { 'gaon-library.json': { content: '{"likedIds":["a"', truncated: true, raw_url: 'https://gist.example/raw' } },
        }),
      )
      .mockReturnValueOnce(Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{"likedIds":["a","b"]}') } as Response));
    await expect(readLibraryGist('t')).resolves.toEqual({ data: { likedIds: ['a', 'b'] }, updatedAt: '2026-11-13T00:00:00Z' });
    expect(fetchMock.mock.calls[2][0]).toBe('https://gist.example/raw');
  });

  it('사용자가 고쳐 JSON이 깨졌으면 이해할 수 있는 오류를 냅니다', async () => {
    fetchMock
      .mockReturnValueOnce(json([{ id: 'g1', updated_at: 'x', files: { 'gaon-library.json': {} } }]))
      .mockReturnValueOnce(json({ id: 'g1', updated_at: 'x', files: { 'gaon-library.json': { content: '{oops' } } }));
    await expect(readLibraryGist('t')).rejects.toThrow('보관함 파일 내용이 올바르지 않습니다.');
  });
});
