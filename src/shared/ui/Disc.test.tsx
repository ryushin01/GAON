import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { withRepeat } from 'react-native-reanimated';

import { Disc } from './Disc';

let notify: (enabled: boolean) => void = () => undefined;

// 동작 줄이기 구독은 앱 전체에서 한 번만 만들어져, 첫 렌더링 전에 잡아 둡니다.
beforeAll(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_event: string, handler: (enabled: boolean) => void) => {
    notify = handler;
    return { remove: jest.fn() };
  }) as never);
});

describe('Disc', () => {
  it('이미지가 없으면 틀에 이름을 답니다', async () => {
    await render(<Disc label="빛 앨범 아트" size={120} />);
    expect(screen.getByLabelText('빛 앨범 아트')).toBeTruthy();
  });

  it('꾸밈 이미지는 보조 기술에서 숨깁니다', async () => {
    await render(<Disc size={120} />);
    expect(screen.getByTestId('disc', { includeHiddenElements: true }).props['aria-hidden']).toBe(true);
  });

  it('재생 중에 동작 줄이기를 켜면 회전을 다시 시작하지 않습니다', async () => {
    jest.mocked(withRepeat).mockClear();

    await render(<Disc size={120} spinning />);
    expect(withRepeat).toHaveBeenCalledTimes(1);

    await act(async () => notify(true));
    expect(withRepeat).toHaveBeenCalledTimes(1);

    await act(async () => notify(false));
    expect(withRepeat).toHaveBeenCalledTimes(2);
  });
});
