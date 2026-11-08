import { readFileSync } from 'node:fs';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function openChart(page: Page) {
  await page.goto('/chart');
  await expect(page.getByRole('button', { name: /^빛 \(The Light\) 유신 .*재생$/ })).toBeVisible();
}

function homeReady(page: Page) {
  return page.getByRole('heading', { name: '빛 (The Light)', level: 2 });
}

async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test('홈에 1위 곡 유신의 빛 (The Light)가 나옵니다', async ({ page }) => {
  await page.goto('/');
  await expect(homeReady(page)).toBeVisible();
  await expect(page.getByRole('button', { name: '빛 (The Light) 듣기' })).toBeVisible();
  await expect(page).toHaveTitle('홈 - GAON');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expectNoOverflow(page);
});

test('홈의 디스크는 양옆 디스크와 방향키, 휠로 넘어갑니다', async ({ page }) => {
  await page.goto('/');
  await expect(homeReady(page)).toBeVisible();
  await expect(page.getByRole('button', { name: '이전 순위' })).toHaveCount(0);
  await page.getByRole('button', { name: '다음 순위' }).click();
  await expect(page.getByRole('heading', { name: '따뜻한 여름', level: 2 })).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(homeReady(page)).toBeVisible();
  const viewport = page.viewportSize()!;
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.mouse.wheel(0, 700);
  await expect(page.getByRole('heading', { name: '따뜻한 여름', level: 2 })).toBeVisible();
  await expectNoOverflow(page);
});

test('휠을 한 칸만 굴려도 다음 곡으로 넘어갑니다', async ({ page }) => {
  await page.goto('/');
  await expect(homeReady(page)).toBeVisible();
  const viewport = page.viewportSize()!;
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.mouse.wheel(0, 120);
  await expect(page.getByRole('heading', { name: '따뜻한 여름', level: 2 })).toBeVisible();
});

test('Ctrl+휠은 브라우저 확대에 맡깁니다', async ({ page }) => {
  await page.goto('/');
  await expect(homeReady(page)).toBeVisible();
  const prevented = await page.evaluate(() => {
    const target = document.elementFromPoint(innerWidth / 2, innerHeight / 2)!;
    const event = new WheelEvent('wheel', { deltaY: 120, ctrlKey: true, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(false);
});

test('낮은 창에서는 세로 방향키로 곡을 넘기지 않습니다', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 420 });
  await page.goto('/');
  await expect(homeReady(page)).toBeAttached();
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(500);
  await expect(homeReady(page)).toBeAttached();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: '따뜻한 여름', level: 2 })).toBeAttached();
});

test('목록을 연 채 끌어도 디스크가 넘어가지 않습니다', async ({ page }) => {
  await page.goto('/');
  await expect(homeReady(page)).toBeVisible();
  await page.getByRole('button', { name: '목록' }).click();
  const viewport = page.viewportSize()!;
  await page.mouse.move(viewport.width - 20, viewport.height - 90);
  await page.mouse.down();
  await page.mouse.move(40, viewport.height - 90, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await expect(homeReady(page)).toBeVisible();
});

test('카탈로그를 받지 못해도 메뉴로 이동할 수 있습니다', async ({ page }) => {
  await page.route('**/catalog.json', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByText('카탈로그를 불러오지 못했습니다')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('link', { name: '보관함', exact: true })).toBeVisible();
});

test('목록을 열어 순위를 고르고 Esc로 닫습니다', async ({ page }) => {
  await page.goto('/');
  await expect(homeReady(page)).toBeVisible();
  const toggle = page.getByRole('button', { name: '목록' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: /^Daydream/ }).click();
  await expect(page.getByRole('heading', { name: 'Daydream', level: 2 })).toBeVisible();
  await toggle.click();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});

test('동작 줄이기에서도 디스크를 넘길 수 있고 인트로가 없습니다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(homeReady(page)).toBeVisible();
  await expect(page.getByText('재생 준비 중')).toHaveCount(0);
  await page.getByRole('button', { name: '다음 순위' }).click();
  await expect(page.getByRole('heading', { name: '따뜻한 여름', level: 2 })).toBeVisible();
});

test('가운데 디스크를 누르면 재생합니다', async ({ page }) => {
  await page.goto('/');
  await expect(homeReady(page)).toBeVisible();
  await page.getByRole('button', { name: '빛 (The Light) 듣기' }).click();
  await expect(page.getByRole('button', { name: /플레이어 열기/ })).toBeVisible();
});

test('스크립트를 받기 전에도 첫 화면이 있고, 앱이 그려지면 사라집니다', async ({ page }) => {
  const html = await (await page.request.get('/')).text();
  expect(html).toContain('<p class="boot">GAON</p>');
  await page.goto('/');
  await expect(homeReady(page)).toBeVisible();
  await expect(page.locator('.boot')).toHaveCount(0);
});

test('앱 스크립트가 없어도 저장한 테마로 첫 화면을 표시합니다', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('gaon-theme', JSON.stringify({ state: { preference: 'dark' }, version: 0 })));
  await page.route('**/_expo/static/js/**', (route) => route.abort());
  await page.reload();
  await expect(page.locator('.boot')).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(12, 12, 11)');
});

test('설정에 현재 버전을 표시합니다', async ({ page }) => {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
  await page.goto('/settings');
  await expect(page.getByText(`버전 ${version}`)).toBeVisible();
});

test('TOP 100은 100곡을 순위대로 보여 주고 장르로 거릅니다', async ({ page }) => {
  await openChart(page);
  await expect(page).toHaveTitle('TOP 100 - GAON');
  await expect(page.getByText('100곡')).toBeVisible();
  await page.getByRole('button', { name: '재즈', exact: true }).click();
  await expect(page.getByText('100곡')).toBeHidden();
  await expectNoOverflow(page);
});

test('앨범 프레임은 정사각형입니다', async ({ page }) => {
  await openChart(page);
  const frames = page.locator('[data-testid="album-art"], [data-testid="disc"]');
  const count = await frames.count();
  expect(count).toBeGreaterThan(5);
  for (let i = 0; i < count; i += 1) {
    const box = await frames.nth(i).boundingBox();
    if (box) expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
  }
});

test('FLAC을 스트리밍으로 재생하고 위치를 옮깁니다', async ({ page }) => {
  await openChart(page);
  await page.getByRole('button', { name: /^빛 \(The Light\) 유신 .*재생$/ }).click();
  await page.getByRole('button', { name: /플레이어 열기/ }).click();
  const slider = page.getByRole('slider', { name: '재생 위치' });
  await expect(async () => {
    expect(Number(await slider.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  }).toPass({ timeout: 15_000 });

  const before = Number(await slider.getAttribute('aria-valuenow'));
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(async () => {
    expect(Number(await slider.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(before + 4);
  }).toPass();

  await page.getByRole('button', { name: '다음 곡' }).click();
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('빛 (The Light)');
});

test('앨범을 눌러 상세로 들어가고 뒤로 돌아옵니다', async ({ page }) => {
  await page.goto('/search');
  await page.getByRole('searchbox').or(page.getByRole('textbox')).first().fill('유리 도시');
  await page.getByRole('link', { name: /^유리 도시 루멘 트리오/ }).click();
  await expect(page).toHaveURL(/\/album\/glass-city$/);
  await expect(page).toHaveTitle('앨범 - GAON');
  await expect(page.locator('#main')).toHaveCount(1);
  await page.goBack();
  await expect(page).toHaveTitle('검색 - GAON');
});

test('곡 정보에 싱어송라이터 유신의 크레딧이 나옵니다', async ({ page }) => {
  await page.goto('/track/bit-1');
  await expect(page.getByRole('heading', { name: '빛 (The Light)', level: 2 })).toBeVisible();
  await expect(page.getByText('작사', { exact: true })).toBeVisible();
  await expect(page.getByText('발매일', { exact: true })).toBeVisible();
  await page.goto('/artist/' + encodeURIComponent('유신'));
  await expect(page.getByText('싱어송라이터')).toBeVisible();
});

test('좋아요와 플레이리스트가 새로 고침 뒤에도 남습니다', async ({ page }) => {
  await openChart(page);
  await page.getByRole('button', { name: '빛 (The Light) 좋아요', exact: true }).click();
  await page.getByRole('button', { name: '빛 (The Light) 더보기' }).click();
  await page.getByRole('button', { name: '플레이리스트에 담기' }).click();
  await page.getByRole('button', { name: '새로 만들어 담기' }).click();
  await expect(page.getByRole('alert')).toHaveText('플레이리스트 이름을 입력해 주세요.');
  await page.getByRole('textbox', { name: '새 플레이리스트 이름' }).fill('출근길');
  await page.getByRole('button', { name: '새로 만들어 담기' }).click();

  await page.goto('/library');
  await expect(page.getByRole('button', { name: /^빛 \(The Light\) 유신 .*재생$/ })).toBeVisible();
  await page.getByRole('button', { name: '플레이리스트', exact: true }).click();
  await expect(page.getByRole('link', { name: '출근길 1곡' })).toBeVisible();
});

test('검색은 가수, 제목, 크레딧으로 찾고 결과 없음을 알려 줍니다', async ({ page }) => {
  await page.goto('/search');
  const box = page.getByRole('searchbox');
  await box.fill('유신');
  await expect(page.getByRole('link', { name: '유신 싱어송라이터' })).toBeVisible();
  await box.fill('없는검색어');
  await expect(page.getByText('검색 결과가 없습니다')).toBeVisible();
});

test('키보드로 본문 바로가기를 쓸 수 있습니다', async ({ page }) => {
  await page.goto('/');
  await expect(homeReady(page)).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: '본문 바로가기' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main').first()).toBeFocused();
});

for (const [name, path] of [['홈', '/'], ['TOP 100', '/chart'], ['검색', '/search'], ['보관함', '/library'], ['앨범', '/album/bit'], ['곡 정보', '/track/bit-1'], ['가수', '/artist/%EC%9C%A0%EC%8B%A0'], ['설정', '/settings']] as const) {
  test(`${name} 화면에 axe 위반이 없습니다`, async ({ page }) => {
    await page.goto(path);
    await page.waitForTimeout(1000);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target} ${v.nodes[0]?.failureSummary}`)).toEqual([]);
    await expectNoOverflow(page);
  });
}

test('플레이어 화면에 axe 위반이 없습니다', async ({ page }) => {
  await openChart(page);
  await page.getByRole('button', { name: /^빛 \(The Light\) 유신 .*재생$/ }).click();
  await page.getByRole('button', { name: /플레이어 열기/ }).click();
  await expect(page.getByRole('slider')).toBeVisible();
  await page.waitForTimeout(800);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target} ${v.nodes[0]?.failureSummary}`)).toEqual([]);
  await expectNoOverflow(page);
});

test('테마를 직접 고르면 새로 고침 뒤에도 유지됩니다', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: '다크', exact: true }).click();
  await expect(page.getByRole('button', { name: '다크', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const scheme = () => page.evaluate(() => document.documentElement.style.colorScheme);
  await expect.poll(scheme).toBe('dark');
  await page.reload();
  await expect.poll(scheme).toBe('dark');
  await page.getByRole('button', { name: '라이트', exact: true }).click();
  await expect.poll(scheme).toBe('light');
});

test('다크로 고른 화면에도 axe 위반이 없습니다', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: '다크', exact: true }).click();
  await page.waitForTimeout(500);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
});

test('키보드로 곡을 선택하고 메뉴를 닫습니다', async ({ page }) => {
  await openChart(page);
  const checkbox = page.getByRole('checkbox', { name: '빛 (The Light) 선택' });
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(checkbox).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Space');
  await expect(checkbox).toHaveAttribute('aria-checked', 'false');

  const more = page.getByRole('button', { name: '빛 (The Light) 더보기' });
  await more.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: '빛 (The Light) 메뉴' });
  await expect(dialog).toBeVisible();
  // 초점이 대화상자 안으로 들어가고, 닫으면 연 버튼으로 돌아와야 합니다.
  await expect(dialog.locator(':focus')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(more).toBeFocused();
});

test('열린 대화상자에도 axe 위반이 없습니다', async ({ page }) => {
  await openChart(page);
  await page.getByRole('button', { name: /^빛 \(The Light\) 유신 .*재생$/ }).click();
  await page.getByRole('button', { name: '빛 (The Light) 더보기' }).click();
  // 여는 애니메이션이 끝나 초점이 들어온 뒤에 검사합니다.
  await expect(page.getByRole('dialog').locator(':focus')).toHaveCount(1);
  let result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);

  await page.getByRole('button', { name: '플레이리스트에 담기' }).click();
  await page.getByRole('button', { name: '새로 만들어 담기' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('[aria-modal]')).toHaveCount(1);
  result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
});

test('화면을 옮기면 초점이 새 본문으로 갑니다', async ({ page }) => {
  await page.goto('/search');
  await page.getByRole('searchbox').or(page.getByRole('textbox')).first().fill('유리 도시');
  await page.getByRole('link', { name: /^유리 도시 루멘 트리오/ }).click();
  await expect(page.locator('#main')).toBeFocused();
});

test('주소로 바로 연 플레이리스트를 삭제하면 보관함으로 갑니다', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('button', { name: '플레이리스트', exact: true }).click();
  await page.getByRole('textbox', { name: '새 플레이리스트 이름' }).fill('바로 연 목록');
  await page.getByRole('button', { name: '만들기' }).click();
  await page.getByRole('link', { name: '바로 연 목록 0곡' }).click();
  await expect(page).toHaveURL(/\/playlist\//);
  await page.goto(page.url());
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page.getByRole('dialog', { name: '바로 연 목록 삭제' }).getByRole('button', { name: '삭제' }).click();
  await expect(page).toHaveTitle('보관함 - GAON');
});

test('플레이리스트는 확인을 거쳐 삭제합니다', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('button', { name: '플레이리스트', exact: true }).click();
  await page.getByRole('textbox', { name: '새 플레이리스트 이름' }).fill('지울 목록');
  await page.getByRole('button', { name: '만들기' }).click();
  await page.getByRole('link', { name: '지울 목록 0곡' }).click();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '지울 목록 삭제' });
  await dialog.getByRole('button', { name: '취소' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: '지울 목록', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await dialog.getByRole('button', { name: '삭제' }).click();
  await expect(page).toHaveTitle('보관함 - GAON');
});

test('낮은 창에서도 플레이어를 닫을 수 있습니다', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 500 });
  await openChart(page);
  await page.getByRole('button', { name: /^빛 \(The Light\) 유신 .*재생$/ }).click();
  await page.getByRole('button', { name: /플레이어 열기/ }).click();
  await expect(page.getByRole('slider')).toBeVisible();
  await page.getByRole('button', { name: '다음 곡' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: '다음 곡' })).toBeInViewport();
  await page.getByRole('button', { name: '플레이어 닫기' }).click();
  await expect(page.getByRole('slider')).toBeHidden();
});
