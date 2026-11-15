import { expect, type Page, test } from '@playwright/test';

/**
 * README 화면 촬영 (pnpm screenshots). 결과: docs/images/*.jpg
 * 먼저 가상 음원을 만들고 웹을 빌드합니다: python scripts/generate-media.py public-media && EXPO_PUBLIC_MEDIA_BASE_URL=http://localhost:8787 pnpm build:web
 * 곡·가수는 모두 가상 데이터입니다. 평소 E2E에는 들어가지 않습니다(SCREENSHOTS=1일 때만 프로젝트가 생김).
 */
const OUT = 'docs/images';

const homeReady = (page: Page) => page.getByRole('heading', { name: '빛 (The Light)', level: 2 });

async function shoot(page: Page, name: string) {
  // 음원을 받는 화면은 네트워크가 쉬지 않으므로 5초까지만 기다립니다.
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  // 재생 중에는 글꼴 준비 신호가 늦을 수 있어 3초까지만 기다립니다.
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82 });
}

/** 1위 곡을 재생해 재생 중 표시와 미니 플레이어가 보이게 합니다. */
async function playFirst(page: Page) {
  await page.getByRole('button', { name: /^빛 \(The Light\) 유신 .*재생$/ }).first().click();
  await page.waitForTimeout(1500);
}

/** 재생을 멈춥니다(재생 위치가 화면마다 달라지지 않게). */
async function pause(page: Page) {
  await page.getByRole('button', { name: '일시정지' }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
}

/** 미니 플레이어로 플레이어 화면을 엽니다. 주소로 바로 열면 재생 상태가 없어 홈으로 돌아갑니다. */
async function openPlayer(page: Page) {
  await page.getByRole('button', { name: /플레이어 열기$/ }).click();
  await page.waitForURL('**/player');
  await page.waitForTimeout(1500);
}

test.describe('넓은 화면', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('홈·TOP 100·플레이어·곡 정보', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/');
    await expect(homeReady(page)).toBeVisible();
    await shoot(page, 'home');

    await page.goto('/chart');
    await expect(page.getByRole('heading', { name: /TOP 100/ }).first()).toBeVisible();
    await shoot(page, 'top100');

    await playFirst(page);
    await openPlayer(page);
    await pause(page);
    await shoot(page, 'player');

    await page.goto('/track/bit-1');
    await shoot(page, 'track');
  });
});

test.describe('다크 테마', () => {
  test.use({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });

  test('TOP 100과 설정', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/chart');
    await expect(page.getByRole('heading', { name: /TOP 100/ }).first()).toBeVisible();
    await playFirst(page);
    await pause(page);
    await shoot(page, 'dark-top100');
    await page.goto('/settings');
    await shoot(page, 'dark-settings');
  });
});

test.describe('모바일', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  test('홈·TOP 100·플레이어·보관함', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/');
    await expect(homeReady(page)).toBeVisible();
    await shoot(page, 'mobile-home');

    await page.goto('/chart');
    await expect(page.getByRole('heading', { name: /TOP 100/ }).first()).toBeVisible();
    await playFirst(page);
    await pause(page);
    await shoot(page, 'mobile-top100');

    await openPlayer(page);
    await shoot(page, 'mobile-player');

    await page.goto('/library');
    await page.getByRole('button', { name: /내 FLAC/ }).click({ timeout: 5000 }).catch(() => {});
    await shoot(page, 'mobile-library');
  });
});
