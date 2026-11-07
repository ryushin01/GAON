// GAON PC 앱입니다. Expo 웹 빌드를 설치본 안에 넣어 실행합니다.
const { app, BrowserWindow, Menu, net, protocol, shell } = require('electron');
const { existsSync, statSync } = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const SCHEME = 'gaon-app';
const HOST = 'app';
const ORIGIN = `${SCHEME}://${HOST}`;
const WEB_ROOT = path.join(__dirname, '..', 'dist');

// standard와 secure가 있어야 IndexedDB, Media Session, 절대 경로가 웹과 같게 동작합니다.
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } },
]);

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
    backgroundColor: '#06214F',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
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
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    protocol.handle(SCHEME, (request) => net.fetch(pathToFileURL(resolveFile(request.url)).toString()));
    if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
