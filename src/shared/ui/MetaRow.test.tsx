import { render, screen } from '@testing-library/react-native';

import { AppText } from './AppText';
import { MetaRow } from './MetaRow';

describe('MetaRow', () => {
  it('문자열 값을 글자로 보여 줍니다', async () => {
    await render(<MetaRow label="장르">재즈</MetaRow>);
    expect(screen.getByText('장르')).toBeTruthy();
    expect(screen.getByText('재즈')).toBeTruthy();
  });

  it('요소 값은 그대로 보여 줍니다', async () => {
    await render(<MetaRow label="가수"><AppText>유신</AppText></MetaRow>);
    expect(screen.getByText('유신')).toBeTruthy();
  });
});
