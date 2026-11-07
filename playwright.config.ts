import { defineConfig, devices } from '@playwright/test';

/** 프로덕션 웹 빌드를 검사합니다. 먼저 EXPO_PUBLIC_MEDIA_BASE_URL=http://localhost:8787 pnpm build:web 이 필요합니다. */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:8081',
    locale: 'ko-KR',
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
  projects: [
    { name: 'phone', testIgnore: /desktop\.spec/, use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 } } },
    { name: 'wide', testIgnore: /desktop\.spec/, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'dark', testIgnore: /desktop\.spec/, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, colorScheme: 'dark' } },
    { name: 'desktop-app', testMatch: /desktop\.spec/ },
  ],
  webServer: [
    { command: 'node scripts/serve-web.mjs dist 8081', url: 'http://localhost:8081', reuseExistingServer: true },
    { command: 'node scripts/serve-media.mjs public-media 8787', url: 'http://localhost:8787/catalog.json', reuseExistingServer: true },
  ],
});
