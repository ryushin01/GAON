import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = { title: 'shared/Checkbox', component: Checkbox, args: { label: '곡 선택', checked: false, onChange: fn() } };
export default meta;

type Story = StoryObj<typeof Checkbox>;
export const Default: Story = {};
export const Checked: Story = { args: { checked: true } };
