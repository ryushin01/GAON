import { render } from '@testing-library/react-native';

import { StatusDot } from './StatusDot';

describe('StatusDot', () => {
  it('색만으로 알리지 않도록 글자 옆에 두는 꾸밈이라 보조 기술에서 숨깁니다', async () => {
    const { toJSON } = await render(<StatusDot tone="live" />);
    expect(JSON.stringify(toJSON())).toContain('"aria-hidden":true');
  });
});
