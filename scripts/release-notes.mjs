#!/usr/bin/env node
// 태그가 package.json, app.json 버전과 맞고 CHANGELOG.md에 기록이 있는지 확인한 뒤 Release 설명을 출력합니다.
//   node scripts/release-notes.mjs v0.1.0
import { readFileSync } from 'node:fs';

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const tag = process.argv[2] ?? '';
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
if (tag !== `v${version}`) fail(`태그 ${tag || '(없음)'}가 package.json 버전 v${version}과 다릅니다.`);

const appVersion = JSON.parse(readFileSync('app.json', 'utf8')).expo.version;
if (appVersion !== version) fail(`app.json 버전 ${appVersion}이 package.json 버전 ${version}과 다릅니다.`);

const lines = readFileSync('CHANGELOG.md', 'utf8').split('\n');
const start = lines.findIndex((line) => line === `## ${version}` || line.startsWith(`## ${version} `) || line.startsWith(`## [${version}]`));
if (start < 0) fail(`CHANGELOG.md에 ${version} 기록이 없습니다.`);
const next = lines.findIndex((line, i) => i > start && line.startsWith('## '));
const changes = lines.slice(start + 1, next < 0 ? undefined : next).join('\n').trim();
if (!changes) fail(`CHANGELOG.md의 ${version} 기록이 비어 있습니다.`);

const guide = readFileSync('.github/release-notes.md', 'utf8').replaceAll('{{version}}', version).trim();
console.log(`${changes}\n\n${guide}`);
