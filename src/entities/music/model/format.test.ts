import { artistLine, displayTitle, formatKhz, formatQuality, formatQualityShort, isHiRes } from './format';

describe('music format', () => {
  it('소수점이 있는 샘플레이트도 표시합니다', () => {
    expect(formatKhz(96000)).toBe('96kHz');
    expect(formatKhz(88200)).toBe('88.2kHz');
    expect(formatQuality({ sampleRate: 192000, bitDepth: 24, channels: 2 })).toBe('FLAC 24bit/192kHz');
  });
  it('좁은 곳에 쓰는 짧은 표기를 만듭니다', () => {
    expect(formatQualityShort({ sampleRate: 88200, bitDepth: 24, channels: 2 })).toBe('Hi-Res 24/88.2');
    expect(formatQualityShort({ sampleRate: 44100, bitDepth: 16, channels: 2 })).toBe('FLAC 16/44.1');
  });
  it('CD 음질은 하이레즈가 아닙니다', () => {
    expect(isHiRes({ sampleRate: 44100, bitDepth: 16, channels: 2 })).toBe(false);
    expect(isHiRes({ sampleRate: 96000, bitDepth: 24, channels: 2 })).toBe(true);
    expect(isHiRes({ sampleRate: 44100, bitDepth: 24, channels: 2 })).toBe(true);
  });
  it('피처링을 제목에 붙입니다', () => {
    expect(displayTitle({ title: '빛 (The Light)', featuring: [] })).toBe('빛 (The Light)');
    expect(displayTitle({ title: '네온 레인', featuring: ['윤슬', '유신'] })).toBe('네온 레인 (Feat. 윤슬, 유신)');
    expect(artistLine({ artists: ['모노레일', '서다온'] })).toBe('모노레일, 서다온');
  });
});
