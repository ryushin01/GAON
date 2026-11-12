import { render, screen } from '@testing-library/react-native';

import { DotGrid } from './DotGrid';

describe('DotGrid', () => {
  it('바탕 꾸밈이라 보조 기술에서 숨깁니다', async () => {
    await render(<DotGrid />);
    expect(screen.getByTestId('dot-grid', { includeHiddenElements: true }).props['aria-hidden']).toBe(true);
  });
});
