export type FlacInfo = {
  sampleRate: number;
  bitDepth: number;
  channels: number;
  durationSec: number;
  tags: Partial<Record<'title' | 'artist' | 'album' | 'genre' | 'date' | 'tracknumber' | 'lyrics', string>>;
  picture?: { mime: string; data: Uint8Array };
};

export class NotFlacError extends Error {
  constructor() {
    super('FLAC 파일이 아닙니다.');
    this.name = 'NotFlacError';
  }
}

const BLOCK_STREAMINFO = 0;
const BLOCK_VORBIS_COMMENT = 4;
const BLOCK_PICTURE = 6;
const PICTURE_FRONT_COVER = 3;

const utf8 = new TextDecoder('utf-8');

function u32be(b: Uint8Array, i: number) {
  return ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
}
function u32le(b: Uint8Array, i: number) {
  return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
}

/** 파일 앞에 ID3v2 태그가 붙은 FLAC도 있어 건너뜁니다. */
function flacStart(b: Uint8Array): number {
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33 && b.length > 10) {
    return 10 + (((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f));
  }
  return 0;
}

function parseComments(b: Uint8Array, tags: FlacInfo['tags']) {
  let i = u32le(b, 0) + 4;
  const count = u32le(b, i);
  i += 4;
  for (let n = 0; n < count && i + 4 <= b.length; n += 1) {
    const size = u32le(b, i);
    i += 4;
    const text = utf8.decode(b.subarray(i, i + size));
    i += size;
    const eq = text.indexOf('=');
    if (eq > 0) {
      const key = text.slice(0, eq).toLowerCase() as keyof FlacInfo['tags'];
      if (!tags[key]) tags[key] = text.slice(eq + 1);
    }
  }
}

function parsePicture(b: Uint8Array): (NonNullable<FlacInfo['picture']> & { type: number }) | undefined {
  const type = u32be(b, 0);
  const mimeSize = u32be(b, 4);
  const mime = utf8.decode(b.subarray(8, 8 + mimeSize));
  let i = 8 + mimeSize;
  i += 4 + u32be(b, i) + 16;
  const size = u32be(b, i);
  i += 4;
  if (i + size > b.length) return undefined;
  return { type, mime, data: b.subarray(i, i + size) };
}

/**
 * 파일 앞부분만으로 FLAC 메타데이터를 읽습니다.
 * 데이터가 중간에 잘려 있으면 읽을 수 있는 블록까지만 돌려줍니다.
 */
export function parseFlac(bytes: Uint8Array): FlacInfo {
  let i = flacStart(bytes);
  if (bytes[i] !== 0x66 || bytes[i + 1] !== 0x4c || bytes[i + 2] !== 0x61 || bytes[i + 3] !== 0x43) {
    throw new NotFlacError();
  }
  i += 4;

  const info: FlacInfo = { sampleRate: 0, bitDepth: 0, channels: 0, durationSec: 0, tags: {} };
  let isLast = false;
  while (!isLast && i + 4 <= bytes.length) {
    const type = bytes[i] & 0x7f;
    isLast = (bytes[i] & 0x80) !== 0;
    const size = (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3];
    i += 4;
    const complete = i + size <= bytes.length;
    const block = bytes.subarray(i, i + size);

    if (type === BLOCK_STREAMINFO && complete) {
      info.sampleRate = (block[10] << 12) | (block[11] << 4) | (block[12] >> 4);
      info.channels = ((block[12] >> 1) & 0x07) + 1;
      info.bitDepth = (((block[12] & 0x01) << 4) | (block[13] >> 4)) + 1;
      // 총 샘플 수는 36비트라 비트 연산 대신 곱셈으로 계산합니다.
      const samples = (block[13] & 0x0f) * 2 ** 32 + u32be(block, 14);
      info.durationSec = info.sampleRate ? samples / info.sampleRate : 0;
    } else if (type === BLOCK_VORBIS_COMMENT && complete) {
      parseComments(block, info.tags);
    } else if (type === BLOCK_PICTURE && complete) {
      const picture = parsePicture(block);
      if (picture && (!info.picture || picture.type === PICTURE_FRONT_COVER)) {
        info.picture = { mime: picture.mime, data: picture.data };
      }
    }
    i += size;
  }
  if (!info.sampleRate) throw new NotFlacError();
  return info;
}
