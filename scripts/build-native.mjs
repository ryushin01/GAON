#!/usr/bin/env node
// 비트 퍼펙트 재생기를 빌드해 native/build에 둡니다. 설치본은 이 폴더를 앱 리소스로 포함합니다.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const isWin = process.platform === 'win32';
const output = `native/build/gaon-audio${isWin ? '.exe' : ''}`;
mkdirSync('native/build', { recursive: true });

const flags = {
  darwin: ['-framework', 'CoreFoundation', '-framework', 'CoreAudio', '-framework', 'AudioToolbox', '-framework', 'AudioUnit'],
  win32: ['-lole32', '-luser32', '-lavrt', '-D_CRT_SECURE_NO_WARNINGS'],
  linux: ['-lpthread', '-lm', '-ldl'],
}[process.platform];

execFileSync('clang', ['-O2', '-w', 'native/gaon-audio/main.c', '-o', output, ...flags], { stdio: 'inherit' });
console.log(`빌드 완료: ${output}`);
