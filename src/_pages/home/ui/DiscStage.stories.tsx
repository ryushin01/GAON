import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import Animated, { useAnimatedRef, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import type { Track } from '@/entities/music';

import { DiscStage } from './DiscStage';

const track = (id: string, title: string, rank: number): Track => ({
  id, source: 'stream', title, artists: ['유신'], featuring: [], albumTitle: title,
  lyricists: [], composers: [], arrangers: [], durationSec: 30,
  format: { sampleRate: 96000, bitDepth: 24, channels: 2 }, uri: '', lyrics: [], rank, rankChange: 0,
});

const tracks = [track('a', '빛 (The Light)', 1), track('b', '따뜻한 여름', 2), track('c', 'Daydream', 3)];

function Demo() {
  const ref = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  return (
    <Animated.ScrollView ref={ref} onScroll={onScroll} scrollEventThrottle={16} style={{ height: 720 }}>
      <DiscStage
        tracks={tracks}
        scrollY={scrollY}
        viewport={720}
        scrollTo={(y) => ref.current?.scrollTo({ y, animated: true })}
        onPlay={() => {}}
        header={null}
      />
    </Animated.ScrollView>
  );
}

const meta: Meta<typeof Demo> = { title: 'pages/home/DiscStage', component: Demo };
export default meta;

export const Default: StoryObj<typeof Demo> = {};
