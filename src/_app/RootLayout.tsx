import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useUnistyles } from 'react-native-unistyles';

import { useLibraryStore } from '@/entities/library';
import { restoreLocalArt } from '@/features/import-local';
import { SkipLink } from '@/shared/ui';

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
];

export function pageTitle(pathname: string): string {
  const match = PAGE_TITLES.find(([pattern]) => pattern.test(pathname));
  return match ? `${match[1]} - GAON` : 'GAON';
}

export function RootLayout() {
  const { rt, theme } = useUnistyles();
  const pathname = usePathname();

  // 웹과 PC 앱에서 화면마다 제목이 달라야 합니다.
  useEffect(() => {
    if (Platform.OS === 'web') document.title = pageTitle(pathname);
  }, [pathname]);

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
          <Stack.Screen name="player" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
