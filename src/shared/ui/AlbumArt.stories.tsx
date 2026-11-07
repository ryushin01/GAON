import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { AlbumArt } from './AlbumArt';

const meta: Meta<typeof AlbumArt> = { title: 'shared/AlbumArt', component: AlbumArt };
export default meta;

export const Placeholder: StoryObj<typeof AlbumArt> = { args: { size: 160 } };
