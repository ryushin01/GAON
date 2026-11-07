import AsyncStorage from '@react-native-async-storage/async-storage';
import { UnistylesRuntime } from 'react-native-unistyles';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

/** 고른 값을 화면에 적용합니다. 직접 테마를 지정하려면 먼저 시스템 따르기를 꺼야 합니다. */
export function applyThemePreference(preference: ThemePreference) {
  const adaptive = preference === 'system';
  UnistylesRuntime.setAdaptiveThemes(adaptive);
  if (!adaptive) UnistylesRuntime.setTheme(preference);
}

type ThemeState = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => {
        applyThemePreference(preference);
        set({ preference });
      },
    }),
    {
      name: 'gaon-theme',
      storage: createJSONStorage(() => AsyncStorage),
      // 앱 시작 때 _app에서 직접 불러옵니다.
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state) applyThemePreference(state.preference);
      },
    },
  ),
);
