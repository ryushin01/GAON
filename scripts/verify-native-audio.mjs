#!/usr/bin/env node
// 장치로 보낼 버퍼를 PCM으로 되돌려, FLAC 헤더에 기록된 원본 PCM의 MD5와 비교합니다.
// 이어 적은 두 파일은 재생할 때처럼 이어 붙여(갭리스), 곡 경계에서 샘플을 더하거나 빠뜨리지 않는지도 봅니다.
//   node scripts/verify-native-audio.mjs public-media/audio/glass-city-1.flac public-media/audio/glass-city-2.flac ...
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, mkdtempSync, openSync, readFileSync, readSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const helper = `native/build/gaon-audio${process.platform === 'win32' ? '.exe' : ''}`;
const dir = mkdtempSync(join(tmpdir(), 'gaon-verify-'));
const files = process.argv.slice(2);
let failed = 0;

const md5 = (data) => createHash('md5').update(data).digest('hex');

/** FLAC 헤더(STREAMINFO)의 형식, 프레임 수, 원본 PCM의 MD5입니다. */
function streamInfo(file) {
  const head = Buffer.alloc(42);
  const fd = openSync(file, 'r');
  readSync(fd, head, 0, 42, 0);
  closeSync(fd);
  if (head.toString('latin1', 0, 4) !== 'fLaC') throw new Error(`${file}: FLAC이 아닙니다.`);
  const packed = head.readBigUInt64BE(18);
  return {
    rate: Number(packed >> 44n),
    channels: Number((packed >> 41n) & 0x7n) + 1,
    bits: Number((packed >> 36n) & 0x1fn) + 1,
    frames: Number(packed & 0xfffffffffn),
    md5: head.subarray(26, 42).toString('hex'),
  };
}

/** 재생기를 검사 모드로 실행합니다. 마지막 줄이 결과이고, 그 앞은 곡을 이어 붙이며 낸 이벤트입니다. */
function verify(args) {
  const lines = execFileSync(helper, ['--verify', ...args], { encoding: 'utf8' }).trim().split('\n').map((line) => JSON.parse(line));
  return { info: lines.at(-1), events: lines.slice(0, -1) };
}

for (const file of files) {
  const { md5: expected } = streamInfo(file);
  for (const format of ['s32', 's24', 'f32', 's16']) {
    const out = join(dir, `${format}.pcm`);
    const { info } = verify([file, out, format]);
    const same = md5(readFileSync(out)) === expected;
    // 담을 수 있는 형식은 원본과 같아야 하고, 담지 못하는 형식은 달라야 합니다. 비교가 실제로 동작한다는 증거입니다.
    const ok = same === info.holds;
    if (!ok) failed += 1;
    console.log(`${ok ? '통과' : '실패'} ${file} ${info.rate}Hz/${info.bits}bit -> ${format}: ${same ? '원본과 같음' : '원본과 다름'} (${info.holds ? '무손실 기대' : '손실 기대'})`);
  }
}

// 형식이 같으면 첫 곡 끝에 다음 곡을 그대로 이어 붙이고, 다르면 장치를 다시 열어야 해서 첫 곡에서 멈춥니다.
for (let i = 0; i + 1 < files.length; i += 1) {
  const [first, second] = [files[i], files[i + 1]];
  const a = streamInfo(first);
  const b = streamInfo(second);
  const joinable = a.rate === b.rate && a.channels === b.channels && a.bits === b.bits;
  const out = join(dir, 'joined.pcm');
  const { info, events } = verify([first, out, 's32', second]);
  const pcm = readFileSync(out);
  const split = a.frames * a.channels * Math.ceil(a.bits / 8);
  const problems = [];
  if (joinable) {
    if (info.frames !== a.frames + b.frames) problems.push(`프레임 ${info.frames}, 기대 ${a.frames + b.frames}`);
    if (info.advancedAt !== a.frames) problems.push(`넘어간 곳 ${info.advancedAt}, 기대 ${a.frames}`);
    if (md5(pcm.subarray(0, split)) !== a.md5) problems.push('첫 곡이 원본과 다름');
    if (md5(pcm.subarray(split)) !== b.md5) problems.push('다음 곡이 원본과 다름');
    if (!events.some((e) => e.event === 'advanced' && e.file === basename(second))) problems.push('advanced 이벤트 없음');
  } else {
    if (info.frames !== a.frames || info.advancedAt !== -1) problems.push('형식이 다른데 이어 붙임');
    if (md5(pcm) !== a.md5) problems.push('첫 곡이 원본과 다름');
  }
  if (problems.length) failed += 1;
  const what = joinable ? '이어 붙이기(갭리스)' : '형식이 달라 이어 붙이지 않음';
  console.log(`${problems.length ? '실패' : '통과'} ${first} -> ${second}: ${what}${problems.length ? ` (${problems.join(', ')})` : ''}`);
}
if (failed) process.exit(1);
