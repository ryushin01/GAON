import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Disc } from './Disc';

const meta: Meta<typeof Disc> = { title: 'shared/Disc', component: Disc, args: { size: 280, label: '앨범 아트' } };
export default meta;

type Story = StoryObj<typeof Disc>;
export const Default: Story = {};
export const Spinning: Story = { args: { spinning: true } };
export const Tilted: Story = { args: { tilted: true } };
