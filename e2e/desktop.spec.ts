import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { _electron, expect, test } from '@playwright/test';

/** 설치본 안의 실행 파일을 그대로 실행합니다. GAON_EXECUTABLE로 경로를 넘깁니다. */
const executablePath = process.env.GAON_EXECUTABLE;

test.skip(!executablePath, 'GAON_EXECUTABLE이 없으면 건너뜁니다.');

test('PC 앱에서 스트리밍과 로컬 FLAC이 재시작 뒤에도 동작합니다', async () => {
  test.setTimeout(180_000);
  const dir = mkdtempSync(join(tmpdir(), 'gaon-'));
  const args = [`--user-data-dir=${join(dir, 'data')}`];
  const fake = join(dir, 'fake.flac');
  writeFileSync(fake, 'not flac');
  const realFile = join(process.cwd(), 'public-media', 'audio', 'glass-city-1.flac');

  let app = await _electron.launch({ executablePath: executablePath!, args });
  let win = await app.firstWindow();
  await expect(win.getByText('오늘의 1위')).toBeVisible({ timeout: 30_000 });
  await win.getByRole('link', { name: 'TOP 100', exact: true }).click();
  await expect(win).toHaveTitle('TOP 100 - GAON');
  await win.getByRole('button', { name: '전체 재생' }).click();
  await expect(async () => {
    expect(await win.evaluate(() => navigator.mediaSession?.metadata?.title)).toBe('빛 (The Light)');
  }).toPass({ timeout: 15_000 });

  await win.getByRole('link', { name: '보관함', exact: true }).click();
  await win.getByRole('button', { name: '내 FLAC' }).click();
  const [chooser] = await Promise.all([win.waitForEvent('filechooser'), win.getByRole('button', { name: /기기에서 FLAC/ }).click()]);
  await chooser.setFiles([realFile, fake]);
  await expect(win.getByRole('alert')).toContainText('1곡을 가져왔습니다');
  await expect(win.getByRole('alert')).toContainText('fake.flac');
  await app.close();

  app = await _electron.launch({ executablePath: executablePath!, args });
  win = await app.firstWindow();
  await expect(win.getByText('오늘의 1위')).toBeVisible({ timeout: 30_000 });
  await win.getByRole('link', { name: '보관함', exact: true }).click();
  await win.getByRole('button', { name: '내 FLAC' }).click();
  await win.getByRole('button', { name: /네온 레인.*재생/ }).first().click();
  await win.getByRole('button', { name: /플레이어 열기/ }).click();
  const slider = win.getByRole('slider', { name: '재생 위치' });
  await expect(async () => {
    expect(Number(await slider.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  }).toPass({ timeout: 15_000 });
  await app.close();
});
