import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Track } from '@/entities/music';

import type { OutputInfo } from './nativePlaylist';

export type RepeatMode = 'off' | 'all' | 'one';

type PlayerState = {
  queue: Track[];
  index: number;
  repeat: RepeatMode;
  shuffle: boolean;
  playing: boolean;
  buffering: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  /** PC 앱에서 비트 퍼펙트 재생기를 씁니다. */
  exclusive: boolean;
  /** 재생기가 알려 준 실제 출력 상태입니다. */
  output: OutputInfo | null;
};

/** 재생 위치처럼 자주 바뀌는 값까지 들어 있어 화면에서는 필요한 값만 골라 구독합니다. */
export const usePlayerStore = create<PlayerState>()(
  persist(
    (): PlayerState => ({
      queue: [],
      index: 0,
      repeat: 'off',
      shuffle: false,
      playing: false,
      buffering: false,
      currentTime: 0,
      duration: 0,
      error: null,
      exclusive: false,
      output: null,
    }),
    {
      name: 'gaon-player',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ repeat, shuffle, exclusive }) => ({ repeat, shuffle, exclusive }),
    },
  ),
);

export const useCurrentTrack = () => usePlayerStore((s) => s.queue[s.index] as Track | undefined);
