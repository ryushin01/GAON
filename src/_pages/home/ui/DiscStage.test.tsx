import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Track } from '@/entities/music';

import { DiscStage } from './DiscStage';

const track = (id: string, title: string, rank: number): Track => ({
  id, source: 'stream', title, artists: ['유신'], featuring: [], albumTitle: title,
  lyricists: [], composers: [], arrangers: [], durationSec: 30,
  format: { sampleRate: 96000, bitDepth: 24, channels: 2 }, uri: '', lyrics: [], rank, rankChange: 0,
});

const tracks = [track('a', '빛', 1), track('b', '여름', 2), track('c', '방', 3)];
const scrollY = { get: () => 0, set: jest.fn() } as never;

describe('DiscStage', () => {
  it('첫 순위에서는 이전 버튼을 막고, 다음 버튼은 그만큼 스크롤합니다', async () => {
    const scrollTo = jest.fn();
    await render(<DiscStage tracks={tracks} scrollY={scrollY} viewport={800} scrollTo={scrollTo} onPlay={jest.fn()} header={null} />);
    expect(screen.getByRole('button', { name: '이전 순위' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: '다음 순위' }));
    expect(scrollTo).toHaveBeenCalledWith(640);
  });

  it('듣기는 지금 보이는 곡을 재생합니다', async () => {
    const onPlay = jest.fn();
    await render(<DiscStage tracks={tracks} scrollY={scrollY} viewport={800} scrollTo={jest.fn()} onPlay={onPlay} header={null} />);
    await fireEvent.press(screen.getByRole('button', { name: '빛 듣기' }));
    expect(onPlay).toHaveBeenCalledWith(tracks[0]);
  });
});
