import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Font from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useUnistyles } from 'react-native-unistyles';

import { useLibraryStore } from '@/entities/library';
import { startSession } from '@/entities/session';
import { useThemeStore } from '@/features/change-theme';
import { restoreLocalArt } from '@/features/import-local';
import { restoreOffline } from '@/features/save-offline';
import { startLibrarySync } from '@/features/sync-library';
import { SkipLink, useLiveReducedMotion } from '@/shared/ui';

import { attachFonts } from './attachFonts';
import { FONT_SOURCES } from './fontSources';

// 저장한 테마를 읽은 뒤에 첫 화면을 그립니다. 시스템 테마가 잠깐 보이지 않게 합니다.
void useThemeStore.persist.rehydrate();
const subscribeThemeHydration = (onChange: () => void) => useThemeStore.persist.onFinishHydration(onChange);

// 로그인을 설정한 빌드에서만 저장된 로그인을 읽고 보관함 동기화를 시작합니다.
startSession();
startLibrarySync();

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

function pageTitle(pathname: string): string {
  const match = PAGE_TITLES.find(([pattern]) => pattern.test(pathname));
  return match ? `${match[1]} - GAON` : 'GAON';
}

export function RootLayout() {
  const { rt, theme } = useUnistyles();
  const pathname = usePathname();
  // 사용 중에 바꾼 동작 줄이기 설정도 화면 전환에 바로 반영합니다.
  const reduceMotion = useLiveReducedMotion();
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

  // 웹·PC 앱: 영문 Lexend와 한글 함렛(화면 글자 파일)을 바로 붙이고, 나머지 한글 조각은 페이지를 다 받은 뒤 붙입니다.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const add = (href: string) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.append(link);
      return link;
    };
    const links = [add('/fonts/lexend.css'), add('/fonts/gaon-sans.css')];
    const cancel = attachFonts('/fonts/gaon-sans-rest.css');
    return () => {
      cancel();
      links.forEach((link) => link.remove());
    };
  }, []);

  // 글꼴을 기다리지 않고 먼저 그린 뒤, 받으면 바꿉니다. 받지 못해도 대체 글꼴로 보입니다.
  useEffect(() => {
    // 웹·PC 앱은 LINE Seed(모바일 전용, 굵기마다 약 3.4MB)를 받지 않습니다.
    const sources = Object.entries(FONT_SOURCES).filter(([name]) => Platform.OS !== 'web' || !name.startsWith('GaonSans-'));
    const fonts = Object.fromEntries(sources.map(([name, uri]) => [name, { uri, display: Font.FontDisplay.SWAP }]));
    Font.loadAsync(fonts).catch(() => undefined);
  }, []);

  useEffect(() => {
    const restore = () => {
      void restoreLocalArt();
      void restoreOffline();
    };
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
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
