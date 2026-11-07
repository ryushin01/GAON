import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { RankChange } from './RankChange';

const meta: Meta<typeof RankChange> = { title: 'entities/RankChange', component: RankChange };
export default meta;

type Story = StoryObj<typeof RankChange>;
export const Up: Story = { args: { change: 3 } };
export const Down: Story = { args: { change: -7 } };
export const Same: Story = { args: { change: 0 } };
export const New: Story = { args: { isNew: true } };
