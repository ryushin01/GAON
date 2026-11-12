import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { StatusDot } from './StatusDot';

const meta: Meta<typeof StatusDot> = { title: 'shared/StatusDot', component: StatusDot, args: { tone: 'idle' } };
export default meta;

type Story = StoryObj<typeof StatusDot>;
export const Idle: Story = {};
export const Live: Story = { args: { tone: 'live' } };
export const Signal: Story = { args: { tone: 'signal' } };
