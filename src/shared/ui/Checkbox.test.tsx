import { fireEvent, render, screen } from '@testing-library/react-native';

import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('누르면 반대 값을 넘깁니다', async () => {
    const onChange = jest.fn();
    await render(<Checkbox label="곡 선택" checked={false} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('checkbox', { name: '곡 선택' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
