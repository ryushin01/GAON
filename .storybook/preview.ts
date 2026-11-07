import type { Decorator, Preview } from '@storybook/react-native-web-vite';
import { UnistylesRuntime } from 'react-native-unistyles';

import '../src/shared/config/unistyles';

const withTheme: Decorator = (Story, context) => {
  UnistylesRuntime.setAdaptiveThemes(false);
  UnistylesRuntime.setTheme(context.globals.theme === 'dark' ? 'dark' : 'light');
  return Story();
};

const preview: Preview = {
  decorators: [withTheme],
  initialGlobals: { theme: 'light' },
  globalTypes: {
    theme: {
      description: '화면 테마',
      toolbar: { title: '테마', icon: 'circlehollow', items: [{ value: 'light', title: '라이트' }, { value: 'dark', title: '다크' }] },
    },
  },
};

export default preview;
