// 인터넷 없이도 앱이 보이도록 데모 미디어 일부를 public/offline-media에 복사합니다.
// 웹 빌드와 PC 앱에 함께 들어가고, 공개 미디어 서버에 닿지 못할 때만 씁니다.
//
//   python scripts/generate-media.py public-media
//   pnpm media:snapshot            # public-media → public/offline-media
//
// 카탈로그·앨범 아트·디스크 라벨은 모두 넣고, 음원은 용량 때문에 BUNDLED_AUDIO의 곡만 넣습니다
// (같은 앨범의 두 곡이라 갭리스 재생도 확인할 수 있음).
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BUNDLED_AUDIO = ['audio/bit-1.flac', 'audio/bit-2.flac'];

const source = path.resolve(process.argv[2] ?? 'public-media');
const target = path.resolve(process.argv[3] ?? 'public/offline-media');

if (!existsSync(path.join(source, 'catalog.json'))) {
  console.error(`${source}/catalog.json이 없습니다. 먼저 pnpm media:generate를 실행하세요.`);
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(path.join(source, 'catalog.json'), 'utf8'));
const known = new Set(catalog.tracks.map((track) => track.audioPath));
for (const audio of BUNDLED_AUDIO) {
  if (!known.has(audio)) throw new Error(`카탈로그에 없는 곡입니다: ${audio}`);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(path.join(target, 'audio'), { recursive: true });
cpSync(path.join(source, 'art'), path.join(target, 'art'), { recursive: true });
cpSync(path.join(source, 'disc'), path.join(target, 'disc'), { recursive: true });
for (const audio of BUNDLED_AUDIO) copyFileSync(path.join(source, audio), path.join(target, audio));
// 앱은 bundledAudio에 있는 곡만 앱 안의 주소로, 나머지는 공개 미디어 주소로 재생합니다.
writeFileSync(path.join(target, 'catalog.json'), `${JSON.stringify({ ...catalog, bundledAudio: BUNDLED_AUDIO })}\n`);
console.log(`데모 미디어를 ${path.relative(process.cwd(), target)}에 만들었습니다. (곡 ${BUNDLED_AUDIO.length}개)`);
