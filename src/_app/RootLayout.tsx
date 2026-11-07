import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { useUnistyles } from 'react-native-unistyles';

import { useLibraryStore } from '@/entities/library';
import { useThemeStore } from '@/features/change-theme';
import { restoreLocalArt } from '@/features/import-local';
import { SkipLink } from '@/shared/ui';

// 첫 화면이 그려지기 전에 저장한 테마를 적용합니다.
void useThemeStore.persist.rehydrate();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2 } },
});

const PAGE_TITLES: [RegExp, string][] = [
  [/^\/$/, '홈'],
  [/^\/chart/, 'TOP 100'],
  [/^\/search/, '검색'],
  [/^\/library/, '보관함'],
  [/^\/album\//, '앨범'],
  [/^\/artist\//, '가수'],
  [/^\/track\//, '곡 정보'],
  [/^\/playlist\//, '플레이리스트'],
  [/^\/player/, '플레이어'],
  [/^\/settings/, '설정'],
];

export function pageTitle(pathname: string): string {
  const match = PAGE_TITLES.find(([pattern]) => pattern.test(pathname));
  return match ? `${match[1]} - GAON` : 'GAON';
}

export function RootLayout() {
  const { rt, theme } = useUnistyles();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  // 웹과 PC 앱에서 화면마다 제목이 달라야 합니다.
  useEffect(() => {
    if (Platform.OS === 'web') document.title = pageTitle(pathname);
  }, [pathname]);

  // 웹의 스크롤바, 입력 컨트롤, 브라우저 주소창 색도 테마를 따르게 합니다.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.documentElement.style.colorScheme = rt.themeName ?? 'light';
    document.body.style.backgroundColor = theme.colors.bg;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.colors.bg);
  }, [rt.themeName, theme.colors.bg]);

  useEffect(() => {
    const restore = () => void restoreLocalArt();
    if (useLibraryStore.persist.hasHydrated()) restore();
    return useLibraryStore.persist.onFinishHydration(restore);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SkipLink />
        <StatusBar style={rt.themeName === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="player" options={{ presentation: 'fullScreenModal', animation: reduceMotion ? 'none' : 'slide_from_bottom' }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
