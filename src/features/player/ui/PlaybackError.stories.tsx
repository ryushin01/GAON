import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useEffect } from 'react';

import { usePlayerStore } from '../model/playerStore';
import { PlaybackError } from './PlaybackError';

const meta: Meta<typeof PlaybackError> = {
  title: 'features/player/PlaybackError',
  component: PlaybackError,
  decorators: [
    (Story) => {
      useEffect(() => {
        usePlayerStore.setState({ error: '재생기를 시작하지 못했습니다. 설정에서 기본 출력으로 바꿔 보세요.' });
        return () => {
          usePlayerStore.setState({ error: null });
        };
      }, []);
      return <Story />;
    },
  ],
};
export default meta;

type Story = StoryObj<typeof PlaybackError>;
export const Default: Story = {};
