import { render, screen } from '@testing-library/react-native';

import { Disc } from './Disc';

describe('Disc', () => {
  it('이미지가 없으면 틀에 이름을 답니다', async () => {
    await render(<Disc label="빛 앨범 아트" size={120} />);
    expect(screen.getByLabelText('빛 앨범 아트')).toBeTruthy();
  });

  it('꾸밈 이미지는 보조 기술에서 숨깁니다', async () => {
    await render(<Disc size={120} />);
    expect(screen.getByTestId('disc', { includeHiddenElements: true }).props['aria-hidden']).toBe(true);
  });
});
