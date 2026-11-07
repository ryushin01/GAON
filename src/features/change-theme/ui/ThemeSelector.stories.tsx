import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { ThemeSelector } from './ThemeSelector';

const meta: Meta<typeof ThemeSelector> = { title: 'features/ThemeSelector', component: ThemeSelector };
export default meta;

export const Default: StoryObj<typeof ThemeSelector> = {};
