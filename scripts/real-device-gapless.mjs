// 실제 출력 장치로 비트 퍼펙트 재생기를 띄워, 같은 형식 두 곡이 끝남 알림 없이 이어 넘어가는지(갭리스) 봅니다.
// 소리가 나고 출력 장치를 잠시 독점할 수 있습니다. 끝나면 재생기가 장치를 놓습니다.
// 쓰는 법: node scripts/real-device-gapless.mjs <첫 곡.flac> <다음 곡.flac> [다른 형식 곡.flac]
// 셋째 곡을 주면, 넘어간 뒤 그 곡을 불러 장치가 곡의 형식(샘플레이트)으로 다시 열리는지도 봅니다.
// REQUIRE_EXCLUSIVE=1이면 독점(비트 퍼펙트) 출력이 아니어도 실패로 봅니다.
import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const helper = `native/build/gaon-audio${process.platform === 'win32' ? '.exe' : ''}`;
const [first, second, third] = process.argv.slice(2).map((file) => resolve(file));
if (!first || !second) {
  console.error('쓰는 법: node scripts/real-device-gapless.mjs <첫 곡.flac> <다음 곡.flac> [다른 형식 곡.flac]');
  process.exit(2);
}

const child = spawn(helper, [], { stdio: ['pipe', 'pipe', 'inherit'] });
const events = [];
let buffer = '';
child.stdout.setEncoding('utf8');
child.stdout.on('data', (chunk) => {
  buffer += chunk;
  for (let end = buffer.indexOf('\n'); end >= 0; end = buffer.indexOf('\n')) {
    events.push(JSON.parse(buffer.slice(0, end)));
    buffer = buffer.slice(end + 1);
  }
});
const exited = new Promise((done) => child.on('exit', (code, signal) => done({ code, signal })));
const send = (line) => child.stdin.write(`${line}\n`);
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const until = async (match, ms, from = 0) => {
  for (let waited = 0; waited < ms; waited += 20) {
    const found = events.slice(from).find(match);
    if (found) return found;
    await wait(20);
  }
  return undefined;
};
// 재생기가 주기적으로 보내는 상태(status)의 버퍼 부족 횟수입니다.
const underruns = () => events.findLast((e) => e.event === 'status')?.underruns ?? 0;

await wait(500);
send(`load ${first}`);
const loaded = await until((e) => e.event === 'loaded', 5000);
send(`next ${second}`);
send('play');
await wait(800);
// 첫 곡의 끝 1.5초 전으로 옮겨, 끝까지 들으면 다음 곡으로 넘어가게 합니다. 위치를 옮기면 버퍼를 다시 채우는 사이에
// 버퍼 부족이 날 수 있어, 옮긴 직후(0.5초)와 그 뒤(이어 넘어가기 포함)를 나눠 셉니다.
const beforeSeek = underruns();
send(`seek ${Math.max(0, (loaded?.duration ?? 0) - 1.5)}`);
await wait(500);
const afterSeek = underruns();
const advanced = await until((e) => e.event === 'advanced', 8000);
await wait(1000);
let switched;
let thirdLoaded;
if (third) {
  // 형식이 다른 곡을 부르면 재생기는 장치를 그 곡의 형식으로 다시 엽니다.
  const mark = events.length;
  send(`load ${third}`);
  thirdLoaded = await until((e) => e.event === 'loaded', 5000, mark);
  send('play');
  switched = await until((e) => e.event === 'output', 5000, mark);
  await wait(800);
}
send('pause');
await wait(200);
child.stdin.end();
const result = await Promise.race([exited, wait(5000).then(() => (child.kill(), 'timeout'))]);

for (const e of events.filter((e) => e.event !== 'status')) console.log(JSON.stringify(e));
const output = events.find((e) => e.event === 'output');
const before = advanced ? events.slice(0, events.indexOf(advanced)) : events;
const endedEarly = before.some((e) => e.event === 'ended');
const failures = [];
if (!loaded) failures.push('첫 곡을 불러오지 못함');
if (!output) failures.push('출력 장치를 열지 못함');
if (output && process.env.REQUIRE_EXCLUSIVE === '1' && !(output.exclusive && output.bitPerfect)) failures.push('독점(비트 퍼펙트) 출력이 아님');
if (advanced?.file !== basename(second)) failures.push(`다음 곡으로 이어 넘어가지 않음: ${JSON.stringify(advanced ?? null)}`);
if (endedEarly) failures.push('이어 붙일 곡이 있는데 끝났다고 알림');
if (third) {
  if (!switched) failures.push('다른 형식 곡에서 출력 장치를 다시 열지 못함');
  else if (switched.deviceRate !== thirdLoaded?.rate) failures.push(`다른 형식 곡의 샘플레이트로 열리지 않음: ${JSON.stringify(switched)}`);
  else if (process.env.REQUIRE_EXCLUSIVE === '1' && !(switched.exclusive && switched.bitPerfect)) failures.push('다른 형식 곡에서 독점(비트 퍼펙트) 출력이 아님');
}
if (result === 'timeout' || result.code !== 0) failures.push(`재생기 종료: ${JSON.stringify(result)}`);

const describe = (o) => `${o.backend}, 독점 ${o.exclusive}, 비트 퍼펙트 ${o.bitPerfect}${o.reason ? ` (${o.reason})` : ''}, 장치 ${o.deviceRate}Hz ${o.deviceFormat}`;
const summary = [
  `출력: ${output ? describe(output) : '없음'}`,
  `넘어가기: ${advanced ? `${advanced.file}, 그 전 끝남 알림 ${endedEarly ? '있음' : '없음'}` : '없음'}`,
  `버퍼 부족(underrun): 위치 이동 직후 ${afterSeek - beforeSeek}번, 그 뒤 이어 넘어가기까지 ${underruns() - afterSeek}번`,
  ...(third ? [`형식 바꾸기: ${basename(third)} → ${switched ? describe(switched) : '없음'}`] : []),
  failures.length ? `실패: ${failures.join(' / ')}` : '통과',
];
console.log(summary.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### 실제 출력 갭리스 (${basename(first)} → ${basename(second)})\n\n${summary.map((line) => `- ${line}`).join('\n')}\n\n`);
}
process.exit(failures.length ? 1 : 0);
