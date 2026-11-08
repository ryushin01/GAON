import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Track } from '@/entities/music';

import { DiscStage } from './DiscStage';

jest.mock('react-native-gesture-handler', () => {
  const chain: Record<string, unknown> = {};
  for (const name of ['minDistance', 'onStart', 'onUpdate', 'onEnd', 'activeOffsetX', 'failOffsetY']) chain[name] = () => chain;
  return { Gesture: { Pan: () => chain }, GestureDetector: ({ children }: { children: unknown }) => children };
});

const track = (id: string, title: string, rank: number): Track => ({
  id, source: 'stream', title, artists: ['유신'], featuring: [], albumTitle: title, released: '2026-10-24',
  lyricists: ['유신'], composers: [], arrangers: [], durationSec: 30,
  format: { sampleRate: 96000, bitDepth: 24, channels: 2 }, uri: '', rank, rankChange: 0,
  lyrics: [{ t: 0, text: '닫힌 창틈' }, { t: 3, text: '꺼지지 않을 빛' }],
});

const tracks = [track('a', '빛', 1), track('b', '여름', 2), track('c', '방', 3)];
const props = { tracks, viewport: 800, active: true, onOpen: jest.fn(), header: null };

describe('DiscStage', () => {
  it('가운데 디스크를 누르면 그 곡을 재생합니다', async () => {
    const onPlay = jest.fn();
    await render(<DiscStage {...props} onPlay={onPlay} />);
    await fireEvent.press(screen.getByRole('button', { name: '빛 듣기' }));
    expect(onPlay).toHaveBeenCalledWith(tracks[0]);
  });

  it('첫 순위에는 이전 디스크가 없고 다음 디스크는 있습니다', async () => {
    await render(<DiscStage {...props} onPlay={jest.fn()} />);
    expect(screen.queryByRole('button', { name: '이전 순위' })).toBeNull();
    expect(screen.getByRole('button', { name: '다음 순위' })).toBeTruthy();
  });

  it('곡 정보와 실제 가사를 보여 줍니다', async () => {
    await render(<DiscStage {...props} onPlay={jest.fn()} />);
    expect(screen.getByText('1위')).toBeTruthy();
    expect(screen.getByText('“닫힌 창틈”')).toBeTruthy();
  });

  it('목록을 열고 곡을 고릅니다', async () => {
    await render(<DiscStage {...props} onPlay={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: /목록/ }));
    expect(screen.getByRole('button', { name: /여름/ })).toBeTruthy();
  });
});
