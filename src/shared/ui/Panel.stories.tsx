import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { AppText } from './AppText';
import { Panel } from './Panel';

const meta: Meta<typeof Panel> = {
  title: 'shared/Panel',
  component: Panel,
  args: {
    style: { padding: 24, maxWidth: 360 },
    children: (
      <>
        <AppText variant="label" tone="muted">Legislative Intelligence</AppText>
        <AppText variant="title">GAON</AppText>
      </>
    ),
  },
};
export default meta;

type Story = StoryObj<typeof Panel>;
export const Default: Story = {};
export const Bare: Story = { args: { bare: true } };
export const NoCorners: Story = { args: { corners: false } };
