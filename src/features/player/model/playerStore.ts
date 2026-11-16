import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Track } from '@/entities/music';
import { skipUnchangedWrites } from '@/shared/lib';

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
      version: 2,
      // 재생 위치가 바뀔 때마다 같은 내용을 다시 쓰지 않습니다.
      storage: createJSONStorage(() => skipUnchangedWrites(AsyncStorage)),
      // 앱을 다시 켜도 듣던 큐와 곡이 남습니다. 재생 위치처럼 자주 바뀌는 값은 저장하지 않습니다.
      // 기기에 저장한 앨범 아트(내 FLAC, 오프라인 저장)의 주소는 앱을 켤 때마다 새로 만들어서 저장하지 않습니다.
      partialize: ({ repeat, shuffle, exclusive, queue, index }) => ({
        repeat,
        shuffle,
        exclusive,
        queue: queue.map((t) => (t.artUri?.startsWith('http') ? t : { ...t, artUri: undefined })),
        index,
      }),
      // 버전 1은 큐 없이 설정만 저장했습니다.
      migrate: (persisted) => persisted as PlayerState,
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<PlayerState>;
        const queue = Array.isArray(saved.queue) ? saved.queue : [];
        const index = Math.min(Math.max(0, saved.index ?? 0), Math.max(0, queue.length - 1));
        return { ...current, ...saved, queue, index, duration: queue[index]?.durationSec ?? 0 };
      },
    },
  ),
);

export const useCurrentTrack = () => usePlayerStore((s) => s.queue[s.index] as Track | undefined);
