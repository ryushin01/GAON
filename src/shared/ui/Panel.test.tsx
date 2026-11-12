import { render, screen } from '@testing-library/react-native';

import { AppText } from './AppText';
import { Panel } from './Panel';

const hiddenCount = (json: unknown) => JSON.stringify(json).split('"aria-hidden":true').length - 1;

describe('Panel', () => {
  it('내용과 보조 기술에서 숨긴 네 귀퉁이 꺾쇠를 그립니다', async () => {
    const { toJSON } = await render(<Panel><AppText>수치</AppText></Panel>);
    expect(screen.getByText('수치')).toBeTruthy();
    expect(hiddenCount(toJSON())).toBe(4);
  });

  it('corners를 끄면 꺾쇠를 그리지 않습니다', async () => {
    const { toJSON } = await render(<Panel corners={false}><AppText>수치</AppText></Panel>);
    expect(hiddenCount(toJSON())).toBe(0);
  });
});
