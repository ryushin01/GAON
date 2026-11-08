import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    rules: {
      // Expo Router의 app 폴더와 겹치지 않도록 _app, _pages라는 이름을 씁니다.
      'fsd/typo-in-layer-name': 'off',
      // library를 libraries로 바꾸면 보관함이라는 뜻이 흐려져 이름을 그대로 둡니다.
      'fsd/inconsistent-naming': 'off',
    },
  },
  {
    // app-shell은 src 밖의 Expo Router 파일(app/(tabs)/_layout.tsx)에서만 씁니다.
    files: ['./src/widgets/app-shell/**'],
    rules: { 'fsd/insignificant-slice': 'off' },
  },
]);
