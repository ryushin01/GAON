import { isNewerVersion } from './updateNotice';

describe('isNewerVersion', () => {
  it('자리마다 숫자로 비교합니다', () => {
    expect(isNewerVersion('1.0.0', '0.10.0')).toBe(true);
    expect(isNewerVersion('0.10.0', '0.9.3')).toBe(true);
    expect(isNewerVersion('0.10.0', '0.10.0')).toBe(false);
    expect(isNewerVersion('0.9.9', '0.10.0')).toBe(false);
    expect(isNewerVersion('1.1', '1.0.5')).toBe(true);
  });

  it('시험판 꼬리표는 무시합니다', () => {
    expect(isNewerVersion('1.0.0-beta.1', '0.10.0')).toBe(true);
    expect(isNewerVersion('1.0.0-beta.1', '1.0.0')).toBe(false);
  });
});
