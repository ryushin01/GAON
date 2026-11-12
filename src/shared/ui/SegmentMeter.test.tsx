import { render, screen } from '@testing-library/react-native';

import { SegmentMeter } from './SegmentMeter';

const litCount = (json: unknown, color: string) => JSON.stringify(json).split(color).length - 1;

describe('SegmentMeter', () => {
  it('값만큼 칸을 켭니다', async () => {
    const { toJSON } = await render(<SegmentMeter value={0.5} segments={10} color="#123456" />);
    expect(litCount(toJSON(), '#123456')).toBe(5);
  });

  it('범위를 벗어난 값은 잘라 냅니다', async () => {
    const { toJSON } = await render(<SegmentMeter value={3} segments={10} color="#123456" />);
    expect(litCount(toJSON(), '#123456')).toBe(10);
  });

  it('같은 값을 글자로 보여 주는 곳에 쓰므로 보조 기술에서 숨깁니다', async () => {
    await render(<SegmentMeter value={0.5} />);
    expect(screen.getByTestId('segment-meter', { includeHiddenElements: true }).props['aria-hidden']).toBe(true);
  });
});
