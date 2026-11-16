import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { FieldError } from './FieldError';

const meta: Meta<typeof FieldError> = { title: 'shared/FieldError', component: FieldError };
export default meta;

type Story = StoryObj<typeof FieldError>;
export const Default: Story = { args: { id: 'name-error', message: '이름이 비어 있습니다. 플레이리스트 이름을 입력해 주세요.' } };
export const Empty: Story = { args: { id: 'name-error', message: '' } };
