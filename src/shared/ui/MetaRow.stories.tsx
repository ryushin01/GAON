import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { MetaRow } from './MetaRow';

const meta: Meta<typeof MetaRow> = { title: 'shared/MetaRow', component: MetaRow, args: { label: '발매일', children: '2026.10.24' } };
export default meta;

type Story = StoryObj<typeof MetaRow>;
export const Default: Story = {};
