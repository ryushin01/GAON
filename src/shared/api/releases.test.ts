import { fetchLatestRelease } from './releases';

const json = (body: unknown, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);

describe('fetchLatestRelease', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('태그의 v를 떼고 내려받는 페이지 주소와 함께 돌려줍니다', async () => {
    fetchMock.mockReturnValueOnce(json({ tag_name: 'v1.0.0', html_url: 'https://github.com/ryushin01/GAON/releases/tag/v1.0.0' }));
    await expect(fetchLatestRelease()).resolves.toEqual({ version: '1.0.0', url: 'https://github.com/ryushin01/GAON/releases/tag/v1.0.0' });
  });

  it('공개한 설치본이 없으면 null, 요청이 실패하면 오류입니다', async () => {
    fetchMock.mockReturnValueOnce(json({}, 404));
    await expect(fetchLatestRelease()).resolves.toBeNull();
    fetchMock.mockReturnValueOnce(json({}, 403));
    await expect(fetchLatestRelease()).rejects.toThrow('최신 버전을 확인하지 못했습니다. (403)');
  });
});
