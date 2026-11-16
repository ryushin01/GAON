import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useEffect } from 'react';

import { useLibraryStore } from '@/entities/library';
import type { Track } from '@/entities/music';

import { useOfflineSave } from '../model/saveOffline';
import { SaveOfflineButton } from './SaveOfflineButton';

const track = (id: string, title: string): Track => ({
  id, source: 'stream', title, artists: ['유신'], featuring: [], albumTitle: '빛 (The Light)', lyricists: [], composers: [], arrangers: [],
  durationSec: 30, format: { sampleRate: 96000, bitDepth: 24, channels: 2 }, uri: `https://example.com/${id}.flac`, lyrics: [],
  fileSize: 18_400_000,
});
const tracks = [track('bit-1', '빛 (The Light)'), track('bit-2', '그림자가 머문 자리'), track('bit-3', '다시 아침')];

/** 저장 상태를 정해 둔 채로 보여 줍니다. 스토리에서 누르면 실제로 받으려 하므로 상태별 동작은 단위 테스트로 확인합니다. */
function withState(saved: number, saving = 0, failed = 0): Meta<typeof SaveOfflineButton>['decorators'] {
  return [
    (Story) => {
      useEffect(() => {
        useLibraryStore.setState({ offlineTracks: tracks.slice(0, saved) });
        useOfflineSave.setState({
          queue: tracks.slice(saved, saved + saving),
          current: saving ? tracks[saved].id : null,
          failed: tracks.slice(saved, saved + failed).map((t) => t.id),
        });
        return () => {
          useLibraryStore.setState({ offlineTracks: [] });
          useOfflineSave.setState({ queue: [], current: null, failed: [] });
        };
      }, []);
      return <Story />;
    },
  ];
}

const meta: Meta<typeof SaveOfflineButton> = {
  title: 'features/save-offline/SaveOfflineButton',
  component: SaveOfflineButton,
  args: { tracks },
};
export default meta;

type Story = StoryObj<typeof SaveOfflineButton>;
export const NotSaved: Story = { decorators: withState(0) };
export const Saving: Story = { decorators: withState(1, 2) };
export const Failed: Story = { decorators: withState(2, 0, 1) };
export const AllSaved: Story = { decorators: withState(3) };
