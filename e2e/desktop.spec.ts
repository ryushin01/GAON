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

test('독점 출력을 켜면 재생기로 스트리밍과 로컬 FLAC을 재생합니다', async () => {
  test.setTimeout(180_000);
  const dir = mkdtempSync(join(tmpdir(), 'gaon-'));
  const args = [`--user-data-dir=${join(dir, 'data')}`];
  const env = { ...process.env, GAON_AUDIO_BACKEND: process.env.GAON_AUDIO_BACKEND ?? 'null' };
  const realFile = join(process.cwd(), 'public-media', 'audio', 'glass-city-1.flac');

  let app = await _electron.launch({ executablePath: executablePath!, args, env });
  let win = await app.firstWindow();
  await expect(win.getByText('오늘의 1위')).toBeVisible({ timeout: 30_000 });
  await win.getByRole('link', { name: '설정', exact: true }).click();
  await win.getByRole('button', { name: '비트 퍼펙트 (독점)' }).click();
  await expect(win.getByRole('button', { name: '비트 퍼펙트 (독점)' })).toHaveAttribute('aria-pressed', 'true');

  await win.getByRole('link', { name: 'TOP 100', exact: true }).click();
  await win.getByRole('button', { name: /^빛 \(The Light\) 유신 .*재생$/ }).click();
  await win.getByRole('button', { name: /플레이어 열기/ }).click();
  const slider = win.getByRole('slider', { name: '재생 위치' });
  await expect(async () => {
    expect(Number(await slider.getAttribute('aria-valuenow'))).toBeGreaterThan(1);
  }).toPass({ timeout: 30_000 });
  // 실제 출력 상태를 표시합니다. 시험 출력에서는 비트 퍼펙트라고 말하지 않습니다.
  await expect(win.getByText(process.env.GAON_AUDIO_BACKEND === 'real' ? /^(비트 퍼펙트 ·|장치가 .*변환 중$|.*공유 모드로 재생 중$)/ : /^시험 출력$/)).toBeVisible();
  // 재생기로 재생하므로 브라우저의 미디어 요소는 쓰지 않습니다.
  expect(await win.evaluate(() => navigator.mediaSession?.metadata?.title ?? '')).toBe('');

  const before = Number(await slider.getAttribute('aria-valuenow'));
  await slider.focus();
  await win.keyboard.press('ArrowRight');
  await expect(async () => {
    expect(Number(await slider.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(before + 4);
  }).toPass({ timeout: 10_000 });

  const title = win.getByRole('heading', { level: 1 });
  await win.getByRole('button', { name: '다음 곡' }).click();
  await expect(title).toHaveText('따뜻한 여름');
  await expect(async () => {
    expect(Number(await slider.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  }).toPass({ timeout: 30_000 });
  await win.getByRole('button', { name: '일시정지' }).click();
  await expect(win.getByRole('button', { name: '재생', exact: true })).toBeVisible();
  await win.getByRole('button', { name: '플레이어 닫기' }).click();

  await win.getByRole('link', { name: '보관함', exact: true }).click();
  await win.getByRole('button', { name: '내 FLAC' }).click();
  const [chooser] = await Promise.all([win.waitForEvent('filechooser'), win.getByRole('button', { name: /기기에서 FLAC/ }).click()]);
  await chooser.setFiles([realFile]);
  await expect(win.getByRole('status')).toContainText('1곡을 가져왔습니다');
  await win.getByRole('button', { name: /재생$/ }).last().click();
  await win.getByRole('button', { name: /플레이어 열기/ }).click();
  await expect(async () => {
    expect(Number(await win.getByRole('slider', { name: '재생 위치' }).getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  }).toPass({ timeout: 30_000 });
  await app.close();

  // 설정이 다시 켜도 유지됩니다.
  app = await _electron.launch({ executablePath: executablePath!, args, env });
  win = await app.firstWindow();
  await expect(win.getByText('오늘의 1위')).toBeVisible({ timeout: 30_000 });
  await win.getByRole('link', { name: '설정', exact: true }).click();
  await expect(win.getByRole('button', { name: '비트 퍼펙트 (독점)' })).toHaveAttribute('aria-pressed', 'true');
  await app.close();
});
