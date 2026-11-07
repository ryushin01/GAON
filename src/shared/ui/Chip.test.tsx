import { fireEvent, render, screen } from '@testing-library/react-native';

import { Chip } from './Chip';

describe('Chip', () => {
  it('선택 상태를 알려 주고 누르면 호출합니다', async () => {
    const onPress = jest.fn();
    await render(<Chip label="재즈" selected onPress={onPress} />);
    expect(screen.getByRole('button').props['aria-pressed']).toBe(true);
    await fireEvent.press(screen.getByText('재즈'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
