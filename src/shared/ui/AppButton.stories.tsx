import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { AppButton } from './AppButton';

const meta: Meta<typeof AppButton> = { title: 'shared/AppButton', component: AppButton };
export default meta;

export const Primary: StoryObj<typeof AppButton> = { args: { label: '전체 재생', icon: 'play' } };
export const Secondary: StoryObj<typeof AppButton> = { args: { label: '담기', variant: 'secondary' } };
export const Disabled: StoryObj<typeof AppButton> = { args: { label: '가져오는 중', disabled: true } };
