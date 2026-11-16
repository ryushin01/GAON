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
  | { event: 'ended' | 'ready' | 'loaded' | 'stopped' }
  /** 미리 알려 둔 다음 곡(file)을 지금 곡 뒤에 이어 붙여 재생하기 시작했습니다. */
  | { event: 'advanced'; file: string; duration: number }
  | { event: 'error'; message: string };

/** PC 앱의 preload가 window.gaonAudio로 내보내는 기능입니다. */
export type AudioBridge = {
  prepareUrl: (url: string) => Promise<string>;
  prepareBytes: (bytes: ArrayBuffer) => Promise<string>;
  load: (name: string) => void;
  /** 지금 곡 다음에 이어 재생할 파일을 알립니다. null이면 지웁니다. 형식이 같으면 재생기가 끊김 없이 이어 붙입니다. */
  next?: (name: string | null) => void;
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
  /** 미디어 키의 재생입니다. 없으면 바로 재생합니다. 엔진은 앞서 난 오류를 지운 뒤 재생합니다. */
  onMediaPlay?: () => void;
  /** 미디어 키의 다음·이전입니다. 없으면 재생 목록에서 한 칸 옮깁니다. */
  onMediaNext?: () => void;
  onMediaPrevious?: () => void;
};

/**
 * 재생 목록은 화면에서 관리하고, 재생기는 지금 곡과 미리 알려 둔 다음 곡만 압니다.
 * 다음 곡은 지금 곡을 불러온 뒤 미리 받아 두고 재생기에 알려, 형식이 같으면 곡 사이 끊김 없이 이어집니다(갭리스).
 */
export function createNativePlaylist(
  bridge: AudioBridge,
  { onOutput, onError, onMediaPlay, onMediaNext, onMediaPrevious }: Callbacks,
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
  /** 재생기에 알린 다음 곡입니다. */
  let queued: { uri: string; name: string } | null = null;
  /** 다음 곡으로 받는 중인 주소입니다. */
  let preparing: string | null = null;
  /** 보낸 멈춤 중 재생기가 아직 처리하지 않은 수입니다. 그 전에 온 이벤트는 멈추기 전 곡의 것이라 버립니다. */
  let stopsPending = 0;
  let syncScheduled = false;
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

  /** 재생기를 멈추고 다음 곡도 잊게 합니다. 멈춤을 처리했다는 알림(stopped)이 오기 전의 이벤트는 버립니다. */
  const stopHelper = () => {
    stopsPending += 1;
    queued = null;
    preparing = null;
    bridge.stop();
  };

  /** 지금 곡 다음에 재생할 곡의 위치입니다. 없으면 null입니다. */
  const followingIndex = (): number | null => {
    if (!uris.length) return null;
    if (loop === 'single') return index;
    if (index < uris.length - 1) return index + 1;
    return loop === 'all' ? 0 : null;
  };

  /** 지금 곡이 재생기에 올라가 있을 때만 다음 곡을 미리 알립니다. */
  const wantedNext = (): string | null => {
    if (loading || !loadedUri || loadedUri !== uris[index]) return null;
    const target = followingIndex();
    return target == null ? null : uris[target];
  };

  /** 재생기에 알린 다음 곡을 지금 큐에 맞춥니다. 바뀌었으면 옛 곡을 지우고 새 곡을 받아 알립니다. */
  const syncNext = () => {
    const tell = bridge.next;
    if (!tell) return;
    const uri = wantedNext();
    if (uri === (queued?.uri ?? null) || (uri !== null && uri === preparing)) return;
    if (queued) {
      tell(null);
      queued = null;
    }
    preparing = uri;
    if (uri === null) return;
    prepare(uri)
      .then((name) => {
        // 받는 사이에 큐나 지금 곡이 바뀌었으면 알리지 않습니다.
        if (preparing !== uri) return;
        preparing = null;
        if (wantedNext() !== uri) return;
        queued = { uri, name };
        tell(name);
      })
      .catch(() => {
        // 미리 받지 못해도 지금 곡이 끝나면 그때 다시 불러옵니다.
        if (preparing === uri) preparing = null;
      });
  };

  /** 큐를 여러 번 바꾸는 작업(셔플 재배치 등)이 끝난 뒤 한 번만 맞춥니다. 중간 상태의 곡을 받지 않습니다. */
  const scheduleSync = () => {
    if (syncScheduled) return;
    syncScheduled = true;
    queueMicrotask(() => {
      syncScheduled = false;
      syncNext();
    });
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
    stopHelper();
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
        syncNext();
      }
    }
  };

  const goTo = (target: number) => {
    index = target;
    announceTrack();
    if (wantPlay) {
      void loadCurrent();
    } else {
      loadedUri = null;
      scheduleSync();
    }
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

  /** 재생기가 미리 알려 둔 다음 곡으로 넘어갔습니다. 그사이 큐가 바뀌어 그 곡이 다음 곡이 아니면 다음 곡을 새로 불러옵니다. */
  const advanced = (file: string, nextDuration: number) => {
    const target = followingIndex();
    const expected = queued;
    queued = null;
    if (!expected || expected.name !== file || target == null || uris[target] !== expected.uri) {
      if (target == null) {
        wantPlay = false;
        playing = false;
        stopHelper();
        publish();
      } else {
        goTo(target);
      }
      return;
    }
    // 한 곡 반복은 같은 곡을 이어 붙여 위치만 처음으로 돌아갑니다.
    const changed = target !== index;
    index = target;
    loadedUri = expected.uri;
    time = 0;
    duration = nextDuration;
    if (changed) announceTrack();
    publish();
    syncNext();
  };

  const unsubscribe = bridge.onEvent((event) => {
    if (event.event === 'stopped') {
      stopsPending = Math.max(0, stopsPending - 1);
      return;
    }
    // 재생기가 꺼졌으면 보낸 멈춤은 처리되지 않습니다. 다음 명령에 새로 켜집니다.
    if (event.event === 'error' && event.message === 'helper_stopped') stopsPending = 0;
    else if (stopsPending > 0) return;
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
    } else if (event.event === 'advanced') {
      advanced(event.file, event.duration);
    } else if (event.event === 'error') {
      wantPlay = false;
      playing = false;
      // 재생기가 다시 시작되면 불러온 곡이 없으니 다음 재생 때 다시 불러옵니다.
      loadedUri = null;
      queued = null;
      preparing = null;
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
      scheduleSync();
    },
    get playing() {
      return playing;
    },
    get trackCount() {
      return uris.length;
    },
    add: ({ uri }) => {
      uris.push(uri);
      scheduleSync();
    },
    insert: ({ uri }, at) => {
      uris.splice(at, 0, uri);
      if (at <= index && uris.length > 1) index += 1;
      scheduleSync();
    },
    remove: (at) => {
      uris.splice(at, 1);
      if (at < index) {
        index -= 1;
      } else if (at === index) {
        index = Math.min(index, Math.max(uris.length - 1, 0));
        if (wantPlay) {
          void loadCurrent();
          return;
        }
        loadedUri = null;
      }
      scheduleSync();
    },
    clear: () => {
      uris = [];
      index = 0;
      loadedUri = null;
      loadToken += 1;
      loading = false;
      stopHelper();
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
      session.setActionHandler('play', () => (onMediaPlay ? onMediaPlay() : playlist.play()));
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
      stopHelper();
      onOutput(null);
      clearMediaSession();
    },
  };
  return playlist;
}
