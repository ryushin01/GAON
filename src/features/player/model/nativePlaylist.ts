import type { AudioPlaylistLoopMode, AudioPlaylistStatus } from 'expo-audio';

export type OutputInfo = {
  bitPerfect: boolean;
  reason: string;
  exclusive: boolean;
  fileRate: number;
  fileBits: number;
  deviceRate: number;
};

type HelperEvent =
  | ({ event: 'output' } & OutputInfo)
  | { event: 'status'; playing: boolean; time: number; duration: number }
  | { event: 'ended' | 'ready' | 'loaded' }
  | { event: 'error'; message: string };

/** PC 앱의 preload가 window.gaonAudio로 내보내는 기능입니다. */
export type AudioBridge = {
  prepareUrl: (url: string) => Promise<string>;
  prepareBytes: (bytes: ArrayBuffer) => Promise<string>;
  load: (name: string) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (seconds: number) => void;
  onEvent: (listener: (event: HelperEvent) => void) => () => void;
};

export function getAudioBridge(): AudioBridge | undefined {
  return (globalThis as { gaonAudio?: AudioBridge }).gaonAudio;
}

type Source = { uri: string };
type Listeners = {
  playlistStatusUpdate: (status: AudioPlaylistStatus) => void;
  trackChanged: (event: { currentIndex: number }) => void;
};

/** 엔진이 expo-audio 재생 목록에서 쓰는 기능입니다. 비트 퍼펙트 재생기도 같은 모양으로 맞춥니다. */
export type PlaylistLike = {
  loop: AudioPlaylistLoopMode;
  readonly playing: boolean;
  readonly trackCount: number;
  add: (source: Source) => void;
  insert: (source: Source, index: number) => void;
  remove: (index: number) => void;
  clear: () => void;
  skipTo: (index: number) => void;
  next: () => void;
  previous: () => void;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => Promise<void>;
  addListener: <K extends keyof Listeners>(name: K, listener: Listeners[K]) => unknown;
  setActiveForLockScreen: (active: boolean, metadata?: unknown, options?: unknown) => void;
  updateLockScreenMetadata: (metadata: unknown) => void;
  clearLockScreenControls: () => void;
  destroy?: () => void;
};

type LockMetadata = { title?: string; artist?: string; albumTitle?: string; artworkUrl?: string };

const MEDIA_ACTIONS = ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto'] as const;

function mediaSession(): MediaSession | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.mediaSession;
}

function setMediaMetadata(metadata: unknown) {
  const session = mediaSession();
  if (!session || typeof MediaMetadata === 'undefined' || !metadata) return;
  const { title, artist, albumTitle, artworkUrl } = metadata as LockMetadata;
  session.metadata = new MediaMetadata({ title, artist, album: albumTitle, artwork: artworkUrl ? [{ src: artworkUrl }] : [] });
}

type Callbacks = {
  onOutput: (output: OutputInfo | null) => void;
  onError: (message: string) => void;
  /** 미디어 키의 다음·이전입니다. 없으면 재생 목록에서 한 칸 옮깁니다. */
  onMediaNext?: () => void;
  onMediaPrevious?: () => void;
};

/** 재생 목록은 화면에서 관리하고, 재생기는 한 번에 한 곡만 재생합니다. */
export function createNativePlaylist(
  bridge: AudioBridge,
  { onOutput, onError, onMediaNext, onMediaPrevious }: Callbacks,
  initialLoop: AudioPlaylistLoopMode,
): PlaylistLike {
  let uris: string[] = [];
  let index = 0;
  let loop = initialLoop;
  let wantPlay = false;
  let playing = false;
  let loadedUri: string | null = null;
  let loading = false;
  let loadToken = 0;
  let time = 0;
  let duration = 0;
  const statusListeners: Listeners['playlistStatusUpdate'][] = [];
  const trackListeners: Listeners['trackChanged'][] = [];

  const publish = () => {
    const status = { playing, isBuffering: loading, currentTime: time, duration } as AudioPlaylistStatus;
    statusListeners.forEach((listener) => listener(status));
    const session = mediaSession();
    if (session?.metadata) {
      session.playbackState = playing ? 'playing' : 'paused';
      if (duration > 0 && time <= duration) session.setPositionState?.({ duration, position: time, playbackRate: 1 });
    }
  };
  const announceTrack = () => trackListeners.forEach((listener) => listener({ currentIndex: index }));

  const prepare = async (uri: string) => {
    if (uri.startsWith('blob:')) {
      const response = await fetch(uri);
      return bridge.prepareBytes(await response.arrayBuffer());
    }
    return bridge.prepareUrl(uri);
  };

  const loadCurrent = async () => {
    const uri = uris[index];
    if (!uri) return;
    loadToken += 1;
    const token = loadToken;
    loadedUri = null;
    loading = true;
    time = 0;
    onOutput(null);
    bridge.stop();
    publish();
    try {
      const name = await prepare(uri);
      // 내려받는 사이 곡을 넘겼다면 마지막에 고른 곡만 재생합니다.
      if (token !== loadToken) return;
      bridge.load(name);
      loadedUri = uri;
      if (wantPlay) bridge.play();
    } catch {
      if (token === loadToken) onError('곡을 불러오지 못했습니다.');
    } finally {
      if (token === loadToken) {
        loading = false;
        publish();
      }
    }
  };

  const goTo = (target: number) => {
    index = target;
    announceTrack();
    if (wantPlay) void loadCurrent();
    else loadedUri = null;
  };

  const advance = () => {
    if (loop === 'single') {
      bridge.seek(0);
      bridge.play();
    } else if (index < uris.length - 1) {
      goTo(index + 1);
    } else if (loop === 'all' && uris.length > 0) {
      goTo(0);
    } else {
      wantPlay = false;
      playing = false;
      publish();
    }
  };

  const unsubscribe = bridge.onEvent((event) => {
    if (event.event === 'status') {
      if (loading) return;
      playing = event.playing;
      time = event.time;
      duration = event.duration;
      publish();
    } else if (event.event === 'output') {
      onOutput(event);
    } else if (event.event === 'ended') {
      advance();
    } else if (event.event === 'error') {
      wantPlay = false;
      playing = false;
      // 재생기가 다시 시작되면 불러온 곡이 없으니 다음 재생 때 다시 불러옵니다.
      loadedUri = null;
      onError('재생기를 시작하지 못했습니다. 설정에서 기본 출력으로 바꿔 보세요.');
      publish();
    }
  });

  const clearMediaSession = () => {
    const session = mediaSession();
    if (!session) return;
    session.metadata = null;
    session.playbackState = 'none';
    MEDIA_ACTIONS.forEach((action) => session.setActionHandler(action, null));
  };

  const playlist: PlaylistLike = {
    get loop() {
      return loop;
    },
    set loop(value) {
      loop = value;
    },
    get playing() {
      return playing;
    },
    get trackCount() {
      return uris.length;
    },
    add: ({ uri }) => {
      uris.push(uri);
    },
    insert: ({ uri }, at) => {
      uris.splice(at, 0, uri);
      if (at <= index && uris.length > 1) index += 1;
    },
    remove: (at) => {
      uris.splice(at, 1);
      if (at < index) {
        index -= 1;
      } else if (at === index) {
        index = Math.min(index, Math.max(uris.length - 1, 0));
        if (wantPlay) void loadCurrent();
        else loadedUri = null;
      }
    },
    clear: () => {
      uris = [];
      index = 0;
      loadedUri = null;
      loadToken += 1;
      loading = false;
      bridge.stop();
      onOutput(null);
    },
    skipTo: (target) => {
      if (target < 0 || target >= uris.length) return;
      goTo(target);
    },
    next: () => {
      if (index < uris.length - 1) goTo(index + 1);
    },
    previous: () => {
      if (index > 0) goTo(index - 1);
    },
    play: () => {
      wantPlay = true;
      if (loadedUri && loadedUri === uris[index]) bridge.play();
      else void loadCurrent();
    },
    pause: () => {
      wantPlay = false;
      bridge.pause();
    },
    seekTo: async (seconds) => {
      if (loadedUri) bridge.seek(seconds);
    },
    addListener: (name, listener) => {
      if (name === 'playlistStatusUpdate') statusListeners.push(listener as Listeners['playlistStatusUpdate']);
      else trackListeners.push(listener as Listeners['trackChanged']);
    },
    // 재생기는 운영체제 미디어 조작(미디어 키, 제어 센터)을 Media Session으로 받습니다.
    setActiveForLockScreen: (active, metadata) => {
      const session = mediaSession();
      if (!session) return;
      if (!active) {
        clearMediaSession();
        return;
      }
      setMediaMetadata(metadata);
      session.setActionHandler('play', () => playlist.play());
      session.setActionHandler('pause', () => playlist.pause());
      session.setActionHandler('previoustrack', () => (onMediaPrevious ? onMediaPrevious() : playlist.previous()));
      session.setActionHandler('nexttrack', () => (onMediaNext ? onMediaNext() : playlist.next()));
      session.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) void playlist.seekTo(details.seekTime);
      });
      publish();
    },
    updateLockScreenMetadata: (metadata) => setMediaMetadata(metadata),
    clearLockScreenControls: clearMediaSession,
    destroy: () => {
      unsubscribe();
      loadToken += 1;
      bridge.stop();
      onOutput(null);
      clearMediaSession();
    },
  };
  return playlist;
}
