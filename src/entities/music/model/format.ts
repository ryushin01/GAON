import type { AudioFormat, Track } from './types';

export function formatKhz(sampleRate: number): string {
  const khz = sampleRate / 1000;
  return `${Number.isInteger(khz) ? khz : khz.toFixed(1)}kHz`;
}

/** 예: FLAC 24bit/96kHz */
export function formatQuality(format: AudioFormat): string {
  return `FLAC ${format.bitDepth}bit/${formatKhz(format.sampleRate)}`;
}

/** 예: Hi-Res 24/96, FLAC 16/44.1 */
export function formatQualityShort(format: AudioFormat): string {
  const khz = formatKhz(format.sampleRate).replace('kHz', '');
  return `${isHiRes(format) ? 'Hi-Res' : 'FLAC'} ${format.bitDepth}/${khz}`;
}

/** CD(16bit/44.1kHz)와 48kHz를 넘는 음원을 하이레즈로 봅니다. */
export function isHiRes(format: AudioFormat): boolean {
  return format.bitDepth > 16 || format.sampleRate > 48000;
}

export function artistLine(track: Pick<Track, 'artists'>): string {
  return track.artists.join(', ');
}

/** 예: 네온 레인 (Feat. 윤슬) */
export function displayTitle(track: Pick<Track, 'title' | 'featuring'>): string {
  return track.featuring.length ? `${track.title} (Feat. ${track.featuring.join(', ')})` : track.title;
}
