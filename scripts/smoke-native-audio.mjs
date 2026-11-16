#!/usr/bin/env node
// 1. 실제 오디오 경로로 재생기를 실행해, 장치가 없거나 독점을 못 쓰는 환경에서도 충돌하지 않는지 봅니다.
//    (SMOKE_SKIP_REAL=1이면 건너뜁니다. 오디오 백엔드가 아예 없는 실행기용입니다.)
// 2. 시험 출력(--backend null)으로 실제 스레드에서 다음 곡을 이어 재생(갭리스)하고, 이어 붙인 곡을 바꾸면
//    그 곡을 버리는지, 멈춤 알림(stopped)이 오는지 봅니다. 두 파일은 형식이 같아야 합니다.
//   node scripts/smoke-native-audio.mjs <FLAC> [같은 형식의 다음 FLAC]
import { spawn } from 'node:child_process';
import { basename, resolve } from 'node:path';

const helper = `native/build/gaon-audio${process.platform === 'win32' ? '.exe' : ''}`;
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const [first, second = first] = process.argv.slice(2).map((file) => resolve(file));
const failures = [];

function start(args) {
  const child = spawn(helper, args, { stdio: ['pipe', 'pipe', 'inherit'] });
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
  const send = (line) => child.stdin.write(`${line}\n`);
  /** 입력을 닫으면 재생기가 장치를 놓고 끝나야 합니다. */
  const close = async () => {
    child.stdin.end();
    const result = await Promise.race([exited, wait(10000).then(() => ({ hung: true }))]);
    if (result.hung) {
      child.kill();
      failures.push(`${args.join(' ') || '실제 출력'}: 입력을 닫아도 끝나지 않음`);
    } else if (result.code !== 0) {
      failures.push(`${args.join(' ') || '실제 출력'}: 종료 코드 ${result.code}`);
    }
    return result;
  };
  return { events, send, close };
}

const show = (events) => events.filter((e) => e.event !== 'status').forEach((e) => console.log(JSON.stringify(e)));

if (process.env.SMOKE_SKIP_REAL !== '1') {
  const real = start([]);
  await wait(500);
  real.send(`load ${first}`);
  real.send(`next ${second}`);
  await wait(300);
  real.send('play');
  await wait(1500);
  real.send('seek 0.2');
  await wait(500);
  real.send('pause');
  await wait(300);
  real.send('play');
  await wait(500);
  const result = await real.close();
  show(real.events);
  console.log('실제 출력 종료', JSON.stringify(result));
  const names = real.events.map((e) => e.event);
  const output = real.events.find((e) => e.event === 'output');
  if (!names.includes('ready') || !names.includes('loaded')) failures.push('시작 이벤트 없음');
  if (!output && !real.events.some((e) => e.event === 'error')) failures.push('출력 상태도 오류도 보고하지 않음');
  if (output?.bitPerfect && !output.exclusive) failures.push('독점이 아닌데 비트 퍼펙트로 보고함');
  if (output?.bitPerfect && output.deviceRate !== output.fileRate) failures.push('샘플레이트가 다른데 비트 퍼펙트로 보고함');
}

{
  const sim = start(['--backend', 'null']);
  /** 조건을 만족하는 이벤트가 올 때까지 기다립니다. */
  const until = async (match, ms = 5000) => {
    for (let waited = 0; waited < ms; waited += 20) {
      const found = sim.events.find(match);
      if (found) return found;
      await wait(20);
    }
    return undefined;
  };
  sim.send(`load ${first}`);
  const loaded = await until((e) => e.event === 'loaded');
  // 첫 곡의 끝 1초만 듣고 다음 곡으로 넘어갑니다.
  sim.send(`next ${second}`);
  sim.send('play');
  sim.send(`seek ${Math.max(0, (loaded?.duration ?? 0) - 1)}`);
  const advanced = await until((e) => e.event === 'advanced');
  const before = advanced ? sim.events.slice(0, sim.events.indexOf(advanced)) : sim.events;
  if (advanced?.file !== basename(second)) failures.push(`다음 곡으로 이어 넘어가지 않음: ${JSON.stringify(advanced)}`);
  if (before.some((e) => e.event === 'ended')) failures.push('이어 붙일 곡이 있는데 끝났다고 알림');

  // 다음 곡을 이어 붙인 뒤 화면이 다음 곡을 지우면, 이어 붙인 곡은 버리고 지금 곡에서 끝납니다.
  sim.send(`next ${first}`);
  sim.send(`seek ${Math.max(0, (advanced?.duration ?? 0) - 1)}`);
  await wait(300);
  sim.send('next');
  const ended = await until((e) => e.event === 'ended', 3000);
  if (!ended) failures.push('다음 곡을 지웠는데 끝나지 않음');
  if (sim.events.filter((e) => e.event === 'advanced').length !== 1) failures.push('지운 다음 곡으로 넘어감');
  const statuses = sim.events.filter((e) => e.event === 'status' && sim.events.indexOf(e) > sim.events.indexOf(advanced));
  if (statuses.some((e) => e.time > (advanced?.duration ?? 0) + 0.1)) failures.push('넘어간 뒤 재생 위치가 다음 곡 기준이 아님');

  sim.send('stop');
  if (!(await until((e) => e.event === 'stopped', 2000))) failures.push('멈춤 알림(stopped) 없음');
  const result = await sim.close();
  show(sim.events);
  console.log('시험 출력 종료', JSON.stringify(result));
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
