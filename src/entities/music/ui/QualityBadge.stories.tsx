import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { QualityBadge } from './QualityBadge';

const meta: Meta<typeof QualityBadge> = { title: 'entities/QualityBadge', component: QualityBadge };
export default meta;

export const HiRes: StoryObj<typeof QualityBadge> = { args: { format: { sampleRate: 192000, bitDepth: 24, channels: 2 } } };
export const Compact: StoryObj<typeof QualityBadge> = { args: { format: { sampleRate: 88200, bitDepth: 24, channels: 2 }, compact: true } };
export const Cd: StoryObj<typeof QualityBadge> = { args: { format: { sampleRate: 44100, bitDepth: 16, channels: 2 } } };
