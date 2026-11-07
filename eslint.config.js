const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'release/*', 'ios/*', 'android/*', 'public-media/*', 'storybook-static/*', '.expo/*'],
  },
  { files: ['jest.setup.ts', '**/*.test.ts', '**/*.test.tsx'], languageOptions: { globals: { jest: 'readonly' } } },
]);
