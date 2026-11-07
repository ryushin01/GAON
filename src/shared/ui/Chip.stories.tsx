import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { Chip } from './Chip';

const meta: Meta<typeof Chip> = { title: 'shared/Chip', component: Chip, args: { label: '재즈', selected: false, onPress: fn() } };
export default meta;

type Story = StoryObj<typeof Chip>;
export const Default: Story = {};
export const Selected: Story = { args: { selected: true } };
