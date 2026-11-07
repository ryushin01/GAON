#!/usr/bin/env node
// 장치로 보낼 버퍼를 PCM으로 되돌려, FLAC 헤더에 기록된 원본 PCM의 MD5와 비교합니다.
//   node scripts/verify-native-audio.mjs public-media/audio/glass-city-1.flac ...
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, mkdtempSync, openSync, readFileSync, readSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const helper = `native/build/gaon-audio${process.platform === 'win32' ? '.exe' : ''}`;
const dir = mkdtempSync(join(tmpdir(), 'gaon-verify-'));
let failed = 0;

for (const file of process.argv.slice(2)) {
  const head = Buffer.alloc(42);
  const fd = openSync(file, 'r');
  readSync(fd, head, 0, 42, 0);
  closeSync(fd);
  if (head.toString('latin1', 0, 4) !== 'fLaC') throw new Error(`${file}: FLAC이 아닙니다.`);
  const expected = head.subarray(26, 42).toString('hex');

  for (const format of ['s32', 's24', 'f32', 's16']) {
    const out = join(dir, `${format}.pcm`);
    const info = JSON.parse(execFileSync(helper, ['--verify', file, out, format], { encoding: 'utf8' }));
    const same = createHash('md5').update(readFileSync(out)).digest('hex') === expected;
    // 담을 수 있는 형식은 원본과 같아야 하고, 담지 못하는 형식은 달라야 합니다. 비교가 실제로 동작한다는 증거입니다.
    const ok = same === info.holds;
    if (!ok) failed += 1;
    console.log(`${ok ? '통과' : '실패'} ${file} ${info.rate}Hz/${info.bits}bit -> ${format}: ${same ? '원본과 같음' : '원본과 다름'} (${info.holds ? '무손실 기대' : '손실 기대'})`);
  }
}
if (failed) process.exit(1);
