import { chartTracks, fetchCatalog, genresOf, latestAlbums, matchesQuery, toCatalog, type RawCatalog } from './catalog';

const raw: RawCatalog = {
  artists: [{ name: '유신', role: '싱어송라이터' }],
  albums: [
    { id: 'a', title: '옛 앨범', artists: ['윤슬'], albumType: 'EP', genre: '포크', agency: '달빛 뮤직', released: '2024-01-01', artPath: 'art/a.jpg', trackIds: ['t2'] },
    { id: 'b', title: '빛 (The Light)', artists: ['유신'], albumType: '싱글', genre: '발라드', agency: '가온 레코즈', released: '2026-10-24', artPath: 'art/b.jpg', discPath: 'disc/b.webp', trackIds: ['t1'] },
  ],
  tracks: [
    { id: 't1', title: '빛 (The Light)', artists: ['유신'], featuring: [], albumId: 'b', albumTitle: '빛 (The Light)', genre: '발라드', lyricists: ['유신'], composers: ['유신'], arrangers: ['한결'], durationSec: 30, sampleRate: 96000, bitDepth: 24, channels: 2, audioPath: 'audio/t1.flac', artPath: 'art/b.jpg', lyrics: [], rank: 1 },
    { id: 't2', title: '창가의 편지', artists: ['윤슬'], featuring: ['유신'], albumId: 'a', albumTitle: '옛 앨범', genre: '포크', lyricists: [], composers: [], arrangers: [], durationSec: 30, sampleRate: 88200, bitDepth: 24, channels: 2, audioPath: 'audio/t2.flac', artPath: 'art/a.jpg', lyrics: [], rank: null },
  ],
};

describe('catalog', () => {
  const catalog = toCatalog(raw, 'https://media.test');

  it('상대 경로를 공개 주소로 바꿉니다', () => {
    expect(catalog.tracks[0].uri).toBe('https://media.test/audio/t1.flac');
    expect(catalog.albums[0].artUri).toBe('https://media.test/art/a.jpg');
    // 라벨이 있는 앨범만 discUri가 있습니다.
    expect(catalog.albums[0].discUri).toBeUndefined();
    expect(catalog.albums.find((a) => a.id === 'b')?.discUri).toBe('https://media.test/disc/b.webp');
    expect(catalog.tracksById.get('t1')?.format).toEqual({ sampleRate: 96000, bitDepth: 24, channels: 2 });
  });
  it('차트에는 순위가 있는 곡만 나옵니다', () => expect(chartTracks(catalog).map((t) => t.id)).toEqual(['t1']));
  it('앨범은 최신순입니다', () => expect(latestAlbums(catalog)[0].id).toBe('b'));
  it('장르를 중복 없이 모읍니다', () => expect(genresOf(catalog.tracks)).toEqual(['발라드', '포크']));
  it('피처링과 크레딧으로도 찾습니다', () => {
    expect(matchesQuery(catalog.tracks[1], '유신')).toBe(true);
    expect(matchesQuery(catalog.tracks[0], 'the light')).toBe(true);
    expect(matchesQuery(catalog.tracks[0], '   ')).toBe(false);
  });
});

describe('오프라인 대체', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('공개 미디어에 닿지 못하면 앱에 든 데모 카탈로그를 씁니다', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const catalog = await fetchCatalog();
    expect(catalog.snapshot).toBe(true);
    expect(catalog.tracks.find((t) => t.rank === 1)?.title).toBe('빛 (The Light)');
    expect(catalog.tracks.filter((t) => t.rank != null)).toHaveLength(100);
  });

  it('서버가 오류로 답해도 데모 카탈로그로 넘어갑니다', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    expect((await fetchCatalog()).snapshot).toBe(true);
  });

  it('공개 미디어를 받으면 데모 표시가 없습니다', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => raw });
    const catalog = await fetchCatalog();
    expect(catalog.snapshot).toBeUndefined();
    expect(catalog.tracks[0].uri).toMatch(/\/audio\/t1\.flac$/);
  });

  it('음원 기준 주소를 곡마다 정할 수 있습니다', () => {
    const mixed = toCatalog(raw, 'app://offline', (path) => (path === 'audio/t1.flac' ? 'app://offline' : 'https://media.test'));
    expect(mixed.tracksById.get('t1')?.uri).toBe('app://offline/audio/t1.flac');
    expect(mixed.tracksById.get('t2')?.uri).toBe('https://media.test/audio/t2.flac');
    expect(mixed.albums[0].artUri).toBe('app://offline/art/a.jpg');
  });
});
