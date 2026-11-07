import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { ConfirmDialog } from './ConfirmDialog';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'shared/ConfirmDialog',
  component: ConfirmDialog,
  args: { visible: true, title: '출근길 삭제', description: '플레이리스트를 지웁니다.', confirmLabel: '삭제', onConfirm: fn(), onCancel: fn() },
};
export default meta;

export const Default: StoryObj<typeof ConfirmDialog> = {};
