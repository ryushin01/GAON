import { NotFlacError, parseFlac } from './parseFlac';

const enc = new TextEncoder();
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le32 = (n: number) => be32(n).reverse();

function block(type: number, body: number[], last = false) {
  return [(last ? 0x80 : 0) | type, (body.length >> 16) & 255, (body.length >> 8) & 255, body.length & 255, ...body];
}

function streamInfo(rate: number, channels: number, bits: number, samples: number) {
  const b = new Array(34).fill(0);
  b[10] = (rate >> 12) & 255;
  b[11] = (rate >> 4) & 255;
  b[12] = ((rate & 15) << 4) | ((channels - 1) << 1) | (((bits - 1) >> 4) & 1);
  b[13] = (((bits - 1) & 15) << 4) | (Math.floor(samples / 2 ** 32) & 15);
  be32(samples % 2 ** 32).forEach((v, i) => (b[14 + i] = v));
  return b;
}

function comments(entries: string[]) {
  const vendor = [...enc.encode('test')];
  const body = [...le32(vendor.length), ...vendor, ...le32(entries.length)];
  for (const entry of entries) {
    const bytes = [...enc.encode(entry)];
    body.push(...le32(bytes.length), ...bytes);
  }
  return body;
}

function picture(type: number, mime: string, data: number[]) {
  const m = [...enc.encode(mime)];
  return [...be32(type), ...be32(m.length), ...m, ...be32(0), ...new Array(16).fill(0), ...be32(data.length), ...data];
}

const file = (...blocks: number[][]) => new Uint8Array([...enc.encode('fLaC'), ...blocks.flat()]);

describe('parseFlac', () => {
  it('하이레즈 형식과 재생 시간을 읽습니다', () => {
    const info = parseFlac(file(block(0, streamInfo(192000, 2, 24, 192000 * 90), true)));
    expect(info).toMatchObject({ sampleRate: 192000, channels: 2, bitDepth: 24, durationSec: 90 });
  });

  it('36비트 총 샘플 수를 잃지 않습니다', () => {
    const samples = 2 ** 33 + 96000;
    expect(parseFlac(file(block(0, streamInfo(96000, 2, 24, samples), true))).durationSec).toBeCloseTo(samples / 96000);
  });

  it('한글 태그와 앞표지를 읽습니다', () => {
    const info = parseFlac(
      file(
        block(0, streamInfo(96000, 2, 24, 96000)),
        block(4, comments(['TITLE=빛 (The Light)', 'ARTIST=유신'])),
        block(6, picture(4, 'image/png', [9])),
        block(6, picture(3, 'image/jpeg', [1, 2, 3]), true),
      ),
    );
    expect(info.tags).toMatchObject({ title: '빛 (The Light)', artist: '유신' });
    expect(info.picture?.mime).toBe('image/jpeg');
    expect([...(info.picture?.data ?? [])]).toEqual([1, 2, 3]);
  });

  it('앞부분만 읽어 잘린 앨범 아트는 건너뜁니다', () => {
    const whole = file(block(0, streamInfo(96000, 2, 24, 96000)), block(6, picture(3, 'image/jpeg', new Array(500).fill(1)), true));
    const info = parseFlac(whole.subarray(0, 120));
    expect(info.sampleRate).toBe(96000);
    expect(info.picture).toBeUndefined();
  });

  it('앞에 붙은 ID3v2 태그를 건너뜁니다', () => {
    const id3 = [0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0];
    const info = parseFlac(new Uint8Array([...id3, ...file(block(0, streamInfo(88200, 2, 24, 88200), true))]));
    expect(info.sampleRate).toBe(88200);
  });

  it('FLAC이 아니면 오류를 냅니다', () => {
    expect(() => parseFlac(enc.encode('ID3 not flac file'))).toThrow(NotFlacError);
    expect(() => parseFlac(new Uint8Array(0))).toThrow(NotFlacError);
  });
});
