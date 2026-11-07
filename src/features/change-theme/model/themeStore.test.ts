import { UnistylesRuntime } from 'react-native-unistyles';

import { applyThemePreference, useThemeStore } from './themeStore';

describe('테마 선택', () => {
  beforeEach(() => {
    jest.spyOn(UnistylesRuntime, 'setAdaptiveThemes').mockImplementation(() => undefined);
    jest.spyOn(UnistylesRuntime, 'setTheme').mockImplementation(() => undefined as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it('시스템 설정을 따를 때는 테마를 직접 지정하지 않습니다', () => {
    applyThemePreference('system');
    expect(UnistylesRuntime.setAdaptiveThemes).toHaveBeenCalledWith(true);
    expect(UnistylesRuntime.setTheme).not.toHaveBeenCalled();
  });

  it('직접 고르면 시스템 따르기를 먼저 끄고 테마를 지정합니다', () => {
    useThemeStore.getState().setPreference('dark');
    expect(UnistylesRuntime.setAdaptiveThemes).toHaveBeenCalledWith(false);
    expect(UnistylesRuntime.setTheme).toHaveBeenCalledWith('dark');
    expect(useThemeStore.getState().preference).toBe('dark');
  });
});
