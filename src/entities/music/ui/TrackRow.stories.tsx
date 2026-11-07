import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import type { Track } from '../model/types';
import { TrackRow } from './TrackRow';

const track: Track = {
  id: 'bit-1', source: 'stream', title: '빛 (The Light)', artists: ['유신'], featuring: [], albumTitle: '빛 (The Light)',
  lyricists: ['유신'], composers: ['유신'], arrangers: ['한결'], durationSec: 30,
  format: { sampleRate: 96000, bitDepth: 24, channels: 2 }, uri: '', lyrics: [], rank: 1, rankChange: 0,
};

const meta: Meta<typeof TrackRow> = { title: 'entities/TrackRow', component: TrackRow };
export default meta;

export const Ranked: StoryObj<typeof TrackRow> = { args: { track, rank: 1, onPress: () => {} } };
export const Active: StoryObj<typeof TrackRow> = { args: { track, active: true, onPress: () => {} } };
export const Featuring: StoryObj<typeof TrackRow> = {
  args: { track: { ...track, title: '네온 레인', artists: ['루멘 트리오'], featuring: ['윤슬'] }, rank: 7, onPress: () => {} },
};
