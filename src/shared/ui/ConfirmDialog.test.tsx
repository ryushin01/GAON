import { fireEvent, render, screen } from '@testing-library/react-native';

import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('취소와 확인을 구분해 호출합니다', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await render(<ConfirmDialog visible title="출근길 삭제" confirmLabel="삭제" onConfirm={onConfirm} onCancel={onCancel} />);
    await fireEvent.press(screen.getByText('취소'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('삭제'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('닫혀 있으면 내용을 보여 주지 않습니다', async () => {
    await render(<ConfirmDialog visible={false} title="출근길 삭제" confirmLabel="삭제" onConfirm={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.queryByText('취소')).toBeNull();
  });
});
