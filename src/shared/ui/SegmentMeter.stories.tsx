import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { SegmentMeter } from './SegmentMeter';

const meta: Meta<typeof SegmentMeter> = { title: 'shared/SegmentMeter', component: SegmentMeter, args: { value: 0.72 } };
export default meta;

type Story = StoryObj<typeof SegmentMeter>;
export const Default: Story = {};
export const Signal: Story = { args: { value: 0.92, color: '#10B981' } };
export const Empty: Story = { args: { value: 0 } };
