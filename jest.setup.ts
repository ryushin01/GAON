// 기기 암호화 저장소는 테스트에서 메모리로 흉내 냅니다.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: async (key: string) => store.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void store.set(key, value),
    deleteItemAsync: async (key: string) => void store.delete(key),
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Disc의 회전은 네이티브 Worklets가 필요해 테스트에서는 값만 흉내 냅니다.
jest.mock('react-native-reanimated', () => {
  const { Text, View } = require('react-native');
  return {
    __esModule: true,
    default: { Text, View },
    cancelAnimation: jest.fn(),
    Extrapolation: { CLAMP: 'clamp' },
    FadeIn: { duration: () => undefined },
    FadeInDown: { duration: () => undefined },
    withSpring: (value: unknown) => value,
    interpolate: () => 0,
    useAnimatedReaction: jest.fn(),
    useDerivedValue: (compute: () => unknown) => ({ get: compute }),
    Easing: { linear: (t: number) => t },
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => false,
    useSharedValue: (value: number) => ({ get: () => value, set: jest.fn() }),
    withRepeat: jest.fn((animation: unknown) => animation),
    withTiming: (value: unknown) => value,
    withDelay: (_delay: number, animation: unknown) => animation,
    withSequence: (...animations: unknown[]) => animations[animations.length - 1],
  };
});

jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn: (...args: unknown[]) => void, ...args: unknown[]) => fn(...args),
  scheduleOnUI: (fn: (...args: unknown[]) => void, ...args: unknown[]) => fn(...args),
}));
