jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Disc의 회전은 네이티브 Worklets가 필요해 테스트에서는 값만 흉내 냅니다.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    cancelAnimation: jest.fn(),
    Easing: { linear: (t: number) => t },
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => false,
    useSharedValue: (value: number) => ({ get: () => value, set: jest.fn() }),
    withRepeat: (animation: unknown) => animation,
    withTiming: (value: unknown) => value,
  };
});
