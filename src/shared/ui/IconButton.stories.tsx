import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { IconButton } from './IconButton';

const meta: Meta<typeof IconButton> = { title: 'shared/IconButton', component: IconButton, args: { icon: 'heart-outline', label: '좋아요', onPress: fn() } };
export default meta;

type Story = StoryObj<typeof IconButton>;
export const Default: Story = {};
export const Filled: Story = { args: { icon: 'play', label: '재생', filled: true } };
export const WithBadge: Story = { args: { icon: 'repeat', label: '한 곡 반복', badge: '1' } };
export const Disabled: Story = { args: { disabled: true } };
