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
  const violations: string[] = [];
  win.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) violations.push(message.text());
  });
  await expect(win.getByRole('heading', { name: '빛 (The Light)', level: 2 })).toBeVisible({ timeout: 30_000 });
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
  const imported = win.getByRole('alert').filter({ hasText: '1곡을 가져왔습니다' });
  await expect(imported).toContainText('fake.flac');
  // 앱이 쓰는 스크립트·이미지·음원·글꼴은 콘텐츠 보안 정책 안에 있습니다.
  expect(violations).toEqual([]);
  // 정책에 없는 인라인 스크립트는 실행되지 않습니다(DevTools로 실행하는 evaluate 자체는 정책을 받지 않음).
  const injected = await win.evaluate(async () => {
    const script = document.createElement('script');
    script.textContent = 'window.__injected = true';
    document.head.append(script);
    await new Promise((resolve) => setTimeout(resolve, 100));
    return (window as { __injected?: boolean }).__injected ?? false;
  });
  expect(injected).toBe(false);
  // 다크 테마를 고른 채로 다시 켭니다. index.html의 테마 스크립트는 CSP 해시가 맞아야 실행됩니다.
  await win.getByRole('link', { name: '설정', exact: true }).click();
  await win.getByRole('button', { name: '다크', exact: true }).click();
  await app.close();

  app = await _electron.launch({ executablePath: executablePath!, args });
  win = await app.firstWindow();
  // 콘솔 감시는 첫 문서를 읽은 뒤에 붙어 위반을 놓칠 수 있어, 테마 스크립트가 실제로 실행됐는지 봅니다.
  // (Windows는 git이 화면 파일을 CRLF로 받아, 해시를 계산할 때 줄바꿈을 맞추지 않으면 여기서 막힙니다.)
  await expect.poll(() => win.evaluate(() => document.documentElement.dataset.theme ?? '')).toBe('dark');
  await expect(win.getByRole('heading', { name: '빛 (The Light)', level: 2 })).toBeVisible({ timeout: 30_000 });
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
  await expect(win.getByRole('heading', { name: '빛 (The Light)', level: 2 })).toBeVisible({ timeout: 30_000 });
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
  // 재생기도 미디어 키와 운영체제 재생 표시를 쓰도록 Media Session에 곡과 상태를 알립니다.
  const session = () => win.evaluate(() => ({ title: navigator.mediaSession?.metadata?.title ?? '', state: navigator.mediaSession?.playbackState }));
  await expect(async () => {
    expect(await session()).toEqual({ title: '빛 (The Light)', state: 'playing' });
  }).toPass({ timeout: 10_000 });

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
  await expect(async () => {
    expect(await session()).toEqual({ title: '따뜻한 여름', state: 'paused' });
  }).toPass({ timeout: 10_000 });
  await win.getByRole('button', { name: '플레이어 닫기' }).click();

  await win.getByRole('link', { name: '보관함', exact: true }).click();
  await win.getByRole('button', { name: '내 FLAC' }).click();
  const [chooser] = await Promise.all([win.waitForEvent('filechooser'), win.getByRole('button', { name: /기기에서 FLAC/ }).click()]);
  await chooser.setFiles([realFile]);
  await expect(win.getByRole('status').filter({ hasText: '1곡을 가져왔습니다' })).toBeVisible();
  await win.getByRole('button', { name: /재생$/ }).last().click();
  await win.getByRole('button', { name: /플레이어 열기/ }).click();
  await expect(async () => {
    expect(Number(await win.getByRole('slider', { name: '재생 위치' }).getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  }).toPass({ timeout: 30_000 });
  await app.close();

  // 설정이 다시 켜도 유지됩니다.
  app = await _electron.launch({ executablePath: executablePath!, args, env });
  win = await app.firstWindow();
  await expect(win.getByRole('heading', { name: '빛 (The Light)', level: 2 })).toBeVisible({ timeout: 30_000 });
  await win.getByRole('link', { name: '설정', exact: true }).click();
  await expect(win.getByRole('button', { name: '비트 퍼펙트 (독점)' })).toHaveAttribute('aria-pressed', 'true');
  await app.close();
});

test('비트 퍼펙트 재생기는 같은 형식의 다음 곡을 끊김 없이 이어 재생합니다', async () => {
  test.setTimeout(180_000);
  const dir = mkdtempSync(join(tmpdir(), 'gaon-'));
  const args = [`--user-data-dir=${join(dir, 'data')}`];
  const env = { ...process.env, GAON_AUDIO_BACKEND: process.env.GAON_AUDIO_BACKEND ?? 'null' };

  const app = await _electron.launch({ executablePath: executablePath!, args, env });
  const win = await app.firstWindow();
  await expect(win.getByRole('heading', { name: '빛 (The Light)', level: 2 })).toBeVisible({ timeout: 30_000 });
  await win.getByRole('link', { name: '설정', exact: true }).click();
  await win.getByRole('button', { name: '비트 퍼펙트 (독점)' }).click();
  // 재생기가 보내는 이벤트를 모읍니다. 이어 붙이면 ended 없이 advanced가 옵니다.
  await win.evaluate(() => {
    const w = window as unknown as { gaonAudio: { onEvent: (listener: (event: { event: string }) => void) => void }; gaonEvents: string[] };
    w.gaonEvents = [];
    w.gaonAudio.onEvent((event) => w.gaonEvents.push(event.event));
  });

  // 앨범 「빛 (The Light)」의 곡은 모두 96kHz/24bit라 장치를 다시 열지 않고 이어 붙일 수 있습니다.
  await win.getByRole('link', { name: '검색', exact: true }).click();
  await win.getByRole('searchbox').fill('빛');
  await win.getByRole('link', { name: /^빛 \(The Light\) 유신/ }).first().click();
  await win.getByRole('button', { name: '전체 재생' }).click();
  await win.getByRole('button', { name: /플레이어 열기/ }).click();
  const title = win.getByRole('heading', { level: 1 });
  await expect(title).toHaveText('빛 (The Light)');
  const slider = win.getByRole('slider', { name: '재생 위치' });
  const position = async () => Number(await slider.getAttribute('aria-valuenow'));
  await expect.poll(position, { timeout: 30_000 }).toBeGreaterThan(0);

  // 30초 곡의 끝 무렵으로 옮겨, 끝까지 들으면 다음 곡으로 넘어가게 합니다. 한 번에 5초씩 옮기므로 22초를 넘으면 멈춰,
  // 옮긴 위치를 확인하는 동안 곡이 끝나 버리지 않게 합니다(넘어가면 위치가 다음 곡 기준으로 돌아감).
  await slider.focus();
  while ((await position()) < 22) {
    const before = await position();
    await win.keyboard.press('ArrowRight');
    await expect.poll(position).toBeGreaterThanOrEqual(before + 4);
  }
  await expect(title).toHaveText('그림자가 머문 자리', { timeout: 20_000 });
  const events = await win.evaluate(() => (window as unknown as { gaonEvents: string[] }).gaonEvents);
  expect(events).toContain('advanced');
  expect(events).not.toContain('ended');
  // 넘어간 곡의 재생 위치는 그 곡의 처음부터 셉니다.
  await expect.poll(position).toBeLessThan(10);
  await expect.poll(position).toBeGreaterThan(0);
  await app.close();
});
