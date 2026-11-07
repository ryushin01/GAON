import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import type { Album } from '../model/types';
import { AlbumCard } from './AlbumCard';

const album = { id: 'demo', title: '유리 도시', artists: ['루멘 트리오'], released: '2026-09-12' } as Album;

const meta: Meta<typeof AlbumCard> = { title: 'entities/AlbumCard', component: AlbumCard, args: { album, onPress: fn() } };
export default meta;

export const Default: StoryObj<typeof AlbumCard> = {};
