import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { AppText } from './AppText';
import { LiveRegion } from './LiveRegion';

const meta: Meta<typeof LiveRegion> = { title: 'shared/LiveRegion', component: LiveRegion };
export default meta;

type Story = StoryObj<typeof LiveRegion>;
export const Status: Story = { args: { role: 'status', children: <AppText variant="caption" tone="muted">1곡을 가져왔습니다.</AppText> } };
export const Alert: Story = { args: { role: 'alert', children: <AppText tone="danger">보관함을 동기화하지 못했습니다.</AppText> } };
export const Empty: Story = { args: { role: 'status' } };
