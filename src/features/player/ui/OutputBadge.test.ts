import { outputLabel } from './OutputBadge';

const base = { exclusive: true, fileRate: 96000, fileBits: 24, deviceRate: 96000, reason: '', bitPerfect: true };

jest.mock('../model/playerStore', () => ({ usePlayerStore: jest.fn() }));

describe('outputLabel', () => {
  it('조건이 맞을 때만 비트 퍼펙트라고 표시합니다', () => {
    expect(outputLabel(base)).toBe('비트 퍼펙트 · 96kHz, 24bit');
  });
  it('변환되면 이유를 표시합니다', () => {
    expect(outputLabel({ ...base, bitPerfect: false, exclusive: false, reason: 'rate_unsupported', fileRate: 192000, deviceRate: 48000 })).toBe('장치가 192kHz를 지원하지 않아 48kHz로 변환 중');
    expect(outputLabel({ ...base, bitPerfect: false, reason: 'rate_converted', fileRate: 96000, deviceRate: 48000 })).toBe('장치 형식이 48kHz라 96kHz를 변환 중');
    expect(outputLabel({ ...base, bitPerfect: false, reason: 'unknown_reason' })).toBe('변환을 거쳐 재생 중');
  });
});
