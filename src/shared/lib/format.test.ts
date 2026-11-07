import { formatCount, formatDate, formatFileSize, formatTime, shuffled } from './format';

describe('format', () => {
  it('재생 시간을 분:초로 표시합니다', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65.9)).toBe('1:05');
    expect(formatTime(Number.NaN)).toBe('0:00');
  });
  it('날짜를 점으로 구분합니다', () => expect(formatDate('2026-10-24')).toBe('2026.10.24'));
  it('숫자와 파일 크기를 표시합니다', () => {
    expect(formatCount(48000)).toBe('48,000');
    expect(formatFileSize(8_472_754)).toBe('8.5 MB');
    expect(formatFileSize(1_500_000_000)).toBe('1.5 GB');
  });
  it('섞어도 항목이 그대로 유지됩니다', () => {
    const input = [1, 2, 3, 4, 5];
    expect(shuffled(input, () => 0.3).sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});
