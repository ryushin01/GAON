import { render, screen } from '@testing-library/react-native';

import { FieldError } from './FieldError';

describe('FieldError', () => {
  it('오류 문구에 입력 칸이 가리킬 id를 답니다', async () => {
    await render(<FieldError id="name-error" message="이름이 비어 있습니다. 플레이리스트 이름을 입력해 주세요." />);
    expect(screen.getByText(/이름이 비어 있습니다/).props.nativeID).toBe('name-error');
  });

  it('오류가 없으면 문구를 그리지 않습니다', async () => {
    await render(<FieldError id="name-error" message="" />);
    expect(screen.queryByText(/이름/)).toBeNull();
  });
});
