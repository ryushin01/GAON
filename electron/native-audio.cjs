// 비트 퍼펙트 재생기(native/gaon-audio)를 실행하고 화면과 잇습니다.
const { spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const { closeSync, existsSync, mkdirSync, openSync, readdirSync, readSync, renameSync, rmSync, statSync, writeFileSync } = require('node:fs');
const { writeFile } = require('node:fs/promises');
const path = require('node:path');

const { app, ipcMain } = require('electron');

/** 캐시로 내려받는 주소입니다. 화면이 넘긴 값을 그대로 믿지 않습니다. */
const ALLOWED_MEDIA = ['https://ryushin01.github.io/GAON/media/', 'http://localhost:8787/'];
const CACHE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;
const COMMANDS = new Set(['play', 'pause', 'stop']);

function helperPath() {
  const name = process.platform === 'win32' ? 'gaon-audio.exe' : 'gaon-audio';
  return app.isPackaged ? path.join(process.resourcesPath, 'native', name) : path.join(__dirname, '..', 'native', 'build', name);
}

function isFlacFile(file) {
  const head = Buffer.alloc(4);
  const fd = openSync(file, 'r');
  try {
    readSync(fd, head, 0, 4, 0);
  } finally {
    closeSync(fd);
  }
  return head.toString('latin1') === 'fLaC';
}

/** 오래 안 쓴 파일부터 지워 캐시 크기를 제한합니다. */
function pruneCache(dir, keep) {
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.flac'))
    .map((name) => {
      const stat = statSync(path.join(dir, name));
      return { name, size: stat.size, used: stat.mtimeMs };
    })
    .sort((a, b) => b.used - a.used);
  let total = 0;
  for (const file of files) {
    total += file.size;
    if (total > CACHE_LIMIT_BYTES && file.name !== keep) rmSync(path.join(dir, file.name), { force: true });
  }
}

function setupNativeAudio(getWindow) {
  let child = null;
  let buffer = '';
  const cacheDir = () => {
    const dir = path.join(app.getPath('userData'), 'audio-cache');
    mkdirSync(dir, { recursive: true });
    return dir;
  };
  const send = (event) => {
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send('audio:event', event);
  };

  const ensureChild = () => {
    if (child) return child;
    const args = process.env.GAON_AUDIO_BACKEND === 'null' ? ['--backend', 'null'] : [];
    child = spawn(helperPath(), args, { stdio: ['pipe', 'pipe', 'ignore'] });
    buffer = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      let end = buffer.indexOf('\n');
      while (end >= 0) {
        try {
          send(JSON.parse(buffer.slice(0, end)));
        } catch {
          // 한 줄이 깨져도 재생은 이어 갑니다.
        }
        buffer = buffer.slice(end + 1);
        end = buffer.indexOf('\n');
      }
    });
    const lost = () => {
      if (!child) return;
      child = null;
      send({ event: 'error', message: 'helper_stopped' });
    };
    child.on('error', lost);
    child.on('exit', lost);
    child.stdin.on('error', () => {});
    return child;
  };
  const command = (line) => ensureChild().stdin.write(`${line}\n`);

  const cached = async (key, write) => {
    const dir = cacheDir();
    const name = `${createHash('sha256').update(key).digest('hex')}.flac`;
    const file = path.join(dir, name);
    if (!existsSync(file)) {
      const part = `${file}.${process.pid}.part`;
      await write(part);
      if (!isFlacFile(part)) {
        rmSync(part, { force: true });
        throw new Error('not_flac');
      }
      renameSync(part, file);
      pruneCache(dir, name);
    }
    return name;
  };

  ipcMain.on('audio:available', (event) => {
    event.returnValue = existsSync(helperPath());
  });
  // 파일을 준비하고 이름만 돌려줍니다. 곡을 빨리 넘길 때 화면이 마지막 곡만 재생하도록 load는 따로 부릅니다.
  ipcMain.handle('audio:prepareUrl', (_event, url) => {
    if (typeof url !== 'string' || !ALLOWED_MEDIA.some((base) => url.startsWith(base))) throw new Error('blocked_url');
    return cached(url, async (part) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('download_failed');
      await writeFile(part, Buffer.from(await response.arrayBuffer()));
    });
  });
  ipcMain.handle('audio:prepareBytes', (_event, bytes) => {
    const data = Buffer.from(bytes);
    return cached(createHash('sha256').update(data).digest('hex'), async (part) => writeFileSync(part, data));
  });
  ipcMain.on('audio:load', (_event, name) => {
    if (typeof name !== 'string' || !/^[0-9a-f]{64}\.flac$/.test(name)) return;
    command(`load ${path.join(cacheDir(), name)}`);
  });
  ipcMain.on('audio:command', (_event, name) => {
    if (COMMANDS.has(name)) command(name);
  });
  ipcMain.on('audio:seek', (_event, seconds) => {
    if (Number.isFinite(seconds)) command(`seek ${seconds}`);
  });

  // 입력을 닫으면 재생기가 장치를 놓고 끝납니다.
  app.on('will-quit', () => {
    if (!child) return;
    const running = child;
    child = null;
    running.removeAllListeners('exit');
    running.stdin.end();
  });
}

module.exports = { setupNativeAudio };
