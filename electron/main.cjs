// GAON PC 앱입니다. Expo 웹 빌드를 설치본 안에 넣어 실행합니다.
const { app, BrowserWindow, ipcMain, Menu, nativeTheme, net, protocol, shell } = require('electron');
const { createHash } = require('node:crypto');
const { existsSync, readFileSync, statSync } = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { setupNativeAudio } = require('./native-audio.cjs');

const SCHEME = 'gaon-app';
const HOST = 'app';
const ORIGIN = `${SCHEME}://${HOST}`;
const WEB_ROOT = path.join(__dirname, '..', 'dist');

// 소셜 로그인은 시스템 브라우저에서 하고 이 주소로 앱에 돌아옵니다.
const AUTH_SCHEME = 'gaon';
const AUTH_CALLBACK = `${AUTH_SCHEME}://auth-callback`;
const AUTH_TIMEOUT_MS = 5 * 60 * 1000;
let pendingAuth = null;

function focusWindow() {
  const [win] = BrowserWindow.getAllWindows();
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
}

function handleAuthUrl(url) {
  if (typeof url !== 'string' || !url.startsWith(AUTH_CALLBACK)) return;
  focusWindow();
  if (!pendingAuth) return;
  clearTimeout(pendingAuth.timer);
  pendingAuth.resolve(url);
  pendingAuth = null;
}

// 개발 중에는 Electron 실행 파일에 스크립트 경로를 함께 넘겨야 링크가 이 앱으로 옵니다.
if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient(AUTH_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient(AUTH_SCHEME);
}
// macOS는 링크를 이 이벤트로 넘깁니다. 앱이 준비되기 전에 등록해야 합니다.
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleAuthUrl(url);
});

// standard와 secure가 있어야 IndexedDB, Media Session, 절대 경로가 웹과 같게 동작합니다.
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } },
]);

/**
 * 앱 화면의 콘텐츠 보안 정책입니다. 스크립트는 앱에 든 파일과 index.html의 테마 스크립트(해시)만 실행합니다.
 * 스타일은 React Native Web과 Unistyles가 런타임에 넣어 인라인을 허용합니다.
 * 앨범 아트·음원·카탈로그는 공개 미디어(https)와 개발용 미디어 서버에서, 내 FLAC은 blob 주소로 받습니다.
 */
function contentSecurityPolicy() {
  let html = '';
  try {
    html = readFileSync(path.join(WEB_ROOT, 'index.html'), 'utf8');
  } catch {
    // 화면 파일이 없으면 인라인 스크립트도 없습니다.
  }
  // 브라우저는 HTML을 읽을 때 줄바꿈(CRLF, CR)을 LF로 바꾼 뒤 해시를 비교합니다.
  // Windows에서는 git이 화면 파일을 CRLF로 받으므로 같은 규칙으로 바꿔서 계산합니다.
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    ([, code]) => `'sha256-${createHash('sha256').update(code.replace(/\r\n?/g, '\n')).digest('base64')}'`,
  );
  const local = 'http://localhost:8787';
  return [
    "default-src 'self'",
    `script-src 'self' ${inline.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: https: ${local}`,
    `media-src 'self' blob: https: ${local}`,
    "font-src 'self' data:",
    `connect-src 'self' blob: https: ${local}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
}

function resolveFile(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl).pathname);
  const candidate = path.normalize(path.join(WEB_ROOT, pathname));
  const inside = candidate === WEB_ROOT || candidate.startsWith(WEB_ROOT + path.sep);
  if (inside && existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  // 화면 경로는 모두 index.html이 처리합니다.
  return path.join(WEB_ROOT, 'index.html');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 360,
    minHeight: 560,
    title: 'GAON',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#081223' : '#FFFFFF',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.cjs') },
  });

  // 앱 밖의 주소는 앱 창이 아니라 기본 브라우저에서 엽니다.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(ORIGIN)) {
      event.preventDefault();
      if (url.startsWith('https://')) void shell.openExternal(url);
    }
  });
  void win.loadURL(`${ORIGIN}/`);
  return win;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Windows는 링크를 새 실행 인자로 넘깁니다.
  app.on('second-instance', (_event, argv) => {
    focusWindow();
    handleAuthUrl(argv.find((arg) => arg.startsWith(AUTH_CALLBACK)));
  });

  // 화면이 넘긴 로그인 주소를 브라우저에서 열고, 앱으로 돌아온 주소를 돌려줍니다.
  ipcMain.handle('auth:signIn', (_event, url) => {
    if (typeof url !== 'string' || !url.startsWith('https://')) throw new Error('로그인 주소가 올바르지 않습니다.');
    if (pendingAuth) {
      clearTimeout(pendingAuth.timer);
      pendingAuth.reject(new Error('새 로그인을 시작했습니다.'));
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingAuth = null;
        reject(new Error('로그인 시간이 지났습니다. 다시 시도해 주세요.'));
      }, AUTH_TIMEOUT_MS);
      pendingAuth = { resolve, reject, timer };
      shell.openExternal(url).catch((error) => {
        clearTimeout(timer);
        pendingAuth = null;
        reject(error);
      });
    });
  });

  app.whenReady().then(() => {
    const csp = contentSecurityPolicy();
    protocol.handle(SCHEME, async (request) => {
      const file = resolveFile(request.url);
      const response = await net.fetch(pathToFileURL(file).toString());
      if (!file.endsWith('.html')) return response;
      // 화면 문서에만 정책을 붙입니다.
      const headers = new Headers(response.headers);
      headers.set('Content-Security-Policy', csp);
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    });
    if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
    setupNativeAudio(() => BrowserWindow.getAllWindows()[0]);
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
