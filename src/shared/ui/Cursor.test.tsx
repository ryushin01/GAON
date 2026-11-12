import { render, screen } from '@testing-library/react-native';

import { Cursor } from './Cursor';

describe('Cursor', () => {
  it('꾸밈이라 보조 기술에서 숨깁니다', async () => {
    await render(<Cursor />);
    expect(screen.getByTestId('cursor', { includeHiddenElements: true }).props['aria-hidden']).toBe(true);
  });

  it('네모 커서도 숨깁니다', async () => {
    await render(<Cursor shape="block" />);
    expect(screen.getByTestId('cursor', { includeHiddenElements: true }).props['aria-hidden']).toBe(true);
  });
});
