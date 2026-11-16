import { fireEvent, render, screen } from '@testing-library/react-native';

import { RouteError } from './RouteError';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (...args: unknown[]) => mockReplace(...args) } }));

describe('RouteError', () => {
  it('오류를 알리고 다시 시도와 홈으로 가기를 제공합니다', async () => {
    const retry = jest.fn(async () => {});
    await render(<RouteError error={new Error('boom')} retry={retry} />);
    expect(screen.getByText('화면을 보여 주지 못했습니다')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
    expect(retry).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: '홈으로' }));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
