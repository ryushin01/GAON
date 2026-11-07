import type { StorybookConfig } from '@storybook/react-native-web-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {
      pluginReactOptions: { babel: { plugins: [['react-native-unistyles/plugin', { root: 'src' }]] } },
    },
  },
  viteFinal: (vite) => ({
    ...vite,
    resolve: { ...vite.resolve, alias: { ...vite.resolve?.alias, '@': new URL('../src', import.meta.url).pathname } },
  }),
};

export default config;
