// 화면에는 재생에 필요한 기능만 내보냅니다.
const { contextBridge, ipcRenderer } = require('electron');

if (ipcRenderer.sendSync('audio:available')) {
  contextBridge.exposeInMainWorld('gaonAudio', {
    prepareUrl: (url) => ipcRenderer.invoke('audio:prepareUrl', url),
    prepareBytes: (bytes) => ipcRenderer.invoke('audio:prepareBytes', bytes),
    load: (name) => ipcRenderer.send('audio:load', name),
    play: () => ipcRenderer.send('audio:command', 'play'),
    pause: () => ipcRenderer.send('audio:command', 'pause'),
    stop: () => ipcRenderer.send('audio:command', 'stop'),
    seek: (seconds) => ipcRenderer.send('audio:seek', seconds),
    onEvent: (listener) => {
      const handler = (_event, value) => listener(value);
      ipcRenderer.on('audio:event', handler);
      return () => ipcRenderer.removeListener('audio:event', handler);
    },
  });
}

// 소셜 로그인은 시스템 브라우저에서 하고, 앱으로 돌아온 주소를 받습니다.
contextBridge.exposeInMainWorld('gaonAuth', {
  signIn: (url) => ipcRenderer.invoke('auth:signIn', url),
});
