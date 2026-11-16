import { render, screen } from '@testing-library/react-native';

import { LiveRegion } from './LiveRegion';
import { AppText } from './AppText';

describe('LiveRegion', () => {
  it('내용이 없어도 영역을 두고, 내용이 생기면 보여 줍니다', async () => {
    const view = await render(<LiveRegion role="status" />);
    expect(view.toJSON()).not.toBeNull();
    await view.rerender(<LiveRegion role="status"><AppText>1곡을 가져왔습니다.</AppText></LiveRegion>);
    expect(screen.getByText('1곡을 가져왔습니다.')).toBeTruthy();
  });
});
