import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * 인터넷이 끊긴 상태를 흉내 냅니다. 웹 빌드(localhost:8081)만 열어 두고 공개 미디어(github.io),
 * 개발용 미디어 서버(localhost:8787), GitHub API 등 그 밖의 요청은 모두 막습니다.
 * 앱에 든 데모 카탈로그(public/offline-media)로 주요 화면이 내용과 함께 떠야 합니다.
 */
const APP_ORIGIN = 'http://localhost:8081/';

test.beforeEach(async ({ context }) => {
  await context.route((url) => !url.href.startsWith(APP_ORIGIN), (route) => route.abort('internetdisconnected'));
});

const notice = (page: Page) => page.getByRole('status').filter({ hasText: '오프라인 데모' });

test('인터넷 없이도 홈에 데모 목록과 오프라인 안내가 나옵니다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '빛 (The Light)', level: 2 })).toBeVisible({ timeout: 20_000 });
  await expect(notice(page)).toBeVisible();
  await expect(page.getByText('카탈로그를 불러오지 못했습니다')).toBeHidden();
  // 앨범 아트도 앱 안의 파일로 그립니다.
  const loaded = await page.evaluate(() =>
    [...document.images].filter((img) => img.src.includes('/offline-media/') && img.complete && img.naturalWidth > 0).length,
  );
  expect(loaded).toBeGreaterThan(0);
});

test('인터넷 없이도 TOP 100, 앨범, 곡 정보, 검색이 내용과 함께 나옵니다', async ({ page }) => {
  await page.goto('/chart');
  await expect(page.getByText('100곡')).toBeVisible({ timeout: 20_000 });
  await expect(notice(page)).toBeVisible();

  await page.goto('/album/bit');
  await expect(page.getByRole('heading', { name: '빛 (The Light)' }).first()).toBeVisible({ timeout: 20_000 });

  await page.goto('/track/bit-1');
  await expect(page.getByText('유신').first()).toBeVisible({ timeout: 20_000 });

  await page.goto('/search');
  await page.getByRole('searchbox').or(page.getByRole('textbox')).first().fill('유신');
  await expect(page.getByRole('button', { name: /^빛 \(The Light\) 유신 .*재생$/ }).first()).toBeVisible({ timeout: 20_000 });
});

test('인터넷 없이도 앱에 든 데모 곡을 재생하고 플레이어 화면을 엽니다', async ({ page }) => {
  await page.goto('/chart');
  await page.getByRole('button', { name: /^빛 \(The Light\) 유신 .*재생$/ }).click();
  await page.getByRole('button', { name: /플레이어 열기/ }).click();
  const slider = page.getByRole('slider', { name: '재생 위치' });
  await expect.poll(async () => Number(await slider.getAttribute('aria-valuenow')), { timeout: 15_000 }).toBeGreaterThan(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('빛 (The Light)');
  await page.waitForTimeout(800);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target} ${v.nodes[0]?.failureSummary}`)).toEqual([]);
});

test('오프라인 안내가 있는 화면에도 axe 위반이 없습니다', async ({ page }) => {
  await page.goto('/');
  await expect(notice(page)).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1000);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target} ${v.nodes[0]?.failureSummary}`)).toEqual([]);
});

test('로그인 서버 없이 데모로 로그인합니다', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'GitHub로 로그인 (데모)' }).click();
  await expect(page.getByText('데모 사용자 · GitHub 데모 로그인 중입니다.')).toBeVisible();
});
