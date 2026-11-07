#!/usr/bin/env node
// 실제 오디오 경로로 재생기를 실행해, 장치가 없거나 독점을 못 쓰는 환경에서도 충돌하지 않는지 봅니다.
//   node scripts/smoke-native-audio.mjs <FLAC>
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const helper = `native/build/gaon-audio${process.platform === 'win32' ? '.exe' : ''}`;
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const child = spawn(helper, [], { stdio: ['pipe', 'pipe', 'inherit'] });
const events = [];
let buffer = '';
child.stdout.setEncoding('utf8');
child.stdout.on('data', (chunk) => {
  buffer += chunk;
  let end = buffer.indexOf('\n');
  while (end >= 0) {
    events.push(JSON.parse(buffer.slice(0, end)));
    buffer = buffer.slice(end + 1);
    end = buffer.indexOf('\n');
  }
});
const exited = new Promise((done) => child.on('exit', (code, signal) => done({ code, signal })));

await wait(500);
child.stdin.write(`load ${resolve(process.argv[2])}\n`);
await wait(300);
child.stdin.write('play\n');
await wait(1500);
child.stdin.write('seek 0.2\n');
await wait(500);
child.stdin.write('pause\n');
await wait(300);
child.stdin.write('play\n');
await wait(500);
child.stdin.end();
const result = await Promise.race([exited, wait(10000).then(() => ({ hung: true }))]);

const names = events.map((e) => e.event);
for (const event of events.filter((e) => e.event !== 'status')) console.log(JSON.stringify(event));
console.log('종료', JSON.stringify(result));
const output = events.find((e) => e.event === 'output');
const failures = [];
if (result.hung) failures.push('입력을 닫아도 끝나지 않음');
if (result.code !== 0) failures.push(`종료 코드 ${result.code}`);
if (!names.includes('ready') || !names.includes('loaded')) failures.push('시작 이벤트 없음');
if (!output && !events.some((e) => e.event === 'error')) failures.push('출력 상태도 오류도 보고하지 않음');
if (output?.bitPerfect && !output.exclusive) failures.push('독점이 아닌데 비트 퍼펙트로 보고함');
if (output?.bitPerfect && output.deviceRate !== output.fileRate) failures.push('샘플레이트가 다른데 비트 퍼펙트로 보고함');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
