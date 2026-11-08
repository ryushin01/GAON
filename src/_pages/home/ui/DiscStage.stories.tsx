import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';

import type { Track } from '@/entities/music';

import { DiscStage } from './DiscStage';

const track = (id: string, title: string, rank: number): Track => ({
  id, source: 'stream', title, artists: ['유신'], featuring: [], albumTitle: title, released: '2026-10-24',
  lyricists: ['유신'], composers: ['한결'], arrangers: [], durationSec: 30,
  format: { sampleRate: 96000, bitDepth: 24, channels: 2 }, uri: '', rank, rankChange: 0, likes: 43327,
  lyrics: [{ t: 0, text: '닫힌 창틈으로 새어 든 아침' }, { t: 3, text: '오래도록 꺼지지 않을 빛' }],
});

const tracks = [track('a', '빛 (The Light)', 1), track('b', '따뜻한 여름', 2), track('c', 'Daydream', 3)];

function Demo() {
  return (
    <View style={{ height: 720 }}>
      <DiscStage tracks={tracks} viewport={720} active onPlay={() => {}} onOpen={() => {}} header={null} />
    </View>
  );
}

const meta: Meta<typeof Demo> = { title: 'pages/home/DiscStage', component: Demo };
export default meta;

export const Default: StoryObj<typeof Demo> = {};
