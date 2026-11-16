import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { RouteError } from './RouteError';

const meta: Meta<typeof RouteError> = { title: 'app/RouteError', component: RouteError };
export default meta;

type Story = StoryObj<typeof RouteError>;
export const Default: Story = { args: { error: new Error('렌더 오류'), retry: fn(async () => {}) } };
