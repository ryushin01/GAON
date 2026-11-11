import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Font from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { useUnistyles } from 'react-native-unistyles';

import { useLibraryStore } from '@/entities/library';
import { startSession } from '@/entities/session';
import { useThemeStore } from '@/features/change-theme';
import { restoreLocalArt } from '@/features/import-local';
import { startLibrarySync } from '@/features/sync-library';
import { whenFirstImage } from '@/shared/lib';
import { PaperGrain, SkipLink } from '@/shared/ui';

import { FONT_SOURCES } from './fontSources';

// 저장한 테마를 읽은 뒤에 첫 화면을 그립니다. 시스템 테마가 잠깐 보이지 않게 합니다.
void useThemeStore.persist.rehydrate();
const subscribeThemeHydration = (onChange: () => void) => useThemeStore.persist.onFinishHydration(onChange);

// 로그인을 설정한 빌드에서만 저장된 로그인을 읽고 보관함 동기화를 시작합니다.
startSession();
startLibrarySync();

/** 홈의 첫 이미지 다음에 받는 큰 한글 글꼴입니다. 그 이미지가 없으면 이 시간 뒤에 받습니다. */
const LARGE_FONTS = ['GaonSerif', 'Diphylleia'];
const FIRST_IMAGE_WAIT_MS = 4000;

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
  const themeReady = useSyncExternalStore(subscribeThemeHydration, useThemeStore.persist.hasHydrated);

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

  // 글꼴을 기다리지 않고 먼저 그린 뒤, 받으면 바꿉니다. 받지 못해도 대체 글꼴로 보입니다.
  // 웹은 큰 한글 글꼴을 홈의 첫 디스크 이미지 다음에 받아, 그 이미지와 대역폭을 나누지 않습니다.
  useEffect(() => {
    let cancelled = false;
    const load = (names: string[]) => {
      const fonts = Object.fromEntries(
        Object.entries(FONT_SOURCES)
          .filter(([name]) => names.includes(name))
          .map(([name, uri]) => [name, { uri, display: Font.FontDisplay.SWAP }]),
      );
      Font.loadAsync(fonts).catch(() => undefined);
    };
    const names = Object.keys(FONT_SOURCES);
    if (Platform.OS !== 'web') {
      load(names);
      return;
    }
    load(names.filter((name) => !LARGE_FONTS.includes(name)));
    void whenFirstImage(FIRST_IMAGE_WAIT_MS).then(() => {
      if (!cancelled) load(LARGE_FONTS);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const restore = () => void restoreLocalArt();
    if (useLibraryStore.persist.hasHydrated()) restore();
    return useLibraryStore.persist.onFinishHydration(restore);
  }, []);

  if (!themeReady) return null;

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
        <PaperGrain />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
