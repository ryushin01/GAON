import { createAudioPlaylist, setAudioModeAsync, type AudioPlaylistStatus } from 'expo-audio';

import { releaseAudioUris, resolveAudioUri, useLibraryStore } from '@/entities/library';
import { artistLine, displayTitle, type Track } from '@/entities/music';
import { shuffled } from '@/shared/lib';

import { createNativePlaylist, getAudioBridge, type PlaylistLike } from './nativePlaylist';
import { usePlayerStore, type RepeatMode } from './playerStore';

/** 이 시간 이상 재생했으면 '이전'은 곡의 처음으로 돌아갑니다. */
const RESTART_THRESHOLD_SEC = 3;
const LOOP = { off: 'none', all: 'all', one: 'single' } as const;

let playlist: PlaylistLike | null = null;
/** 셔플을 끌 때 돌아갈 원래 순서입니다. */
let baseQueue: Track[] = [];
let lockScreenActive = false;
let audioModeReady: Promise<void> | null = null;
/** 큐를 바꾸는 동안 나오는 곡 변경 이벤트는 무시합니다. */
let rebuilding = false;
/**
 * 큐를 바꾸는 요청마다 늘어납니다. 곡 주소를 구하는 사이에 새 요청이 오면 앞의 요청은 버려,
 * 빠르게 연달아 고를 때 마지막에 고른 곡이 재생되게 합니다.
 */
let request = 0;
/** 재생을 멈출 때마다 늘어납니다. 멈춘 뒤에 끝난 큐 추가가 재생을 다시 시작하지 않게 합니다. */
let stops = 0;
/** 복원한 큐를 재생기에 올리는 중인지입니다. 그동안 큐를 바꾸면 바뀐 큐로 다시 올립니다. */
let starting = false;

const lockMetadata = (track: Track) => ({
  title: displayTitle(track),
  artist: artistLine(track),
  albumTitle: track.albumTitle,
  artworkUrl: track.artUri?.startsWith('http') ? track.artUri : undefined,
});

function syncLockScreen(track: Track | undefined) {
  if (!playlist || !track) return;
  if (lockScreenActive) {
    playlist.updateLockScreenMetadata(lockMetadata(track));
  } else {
    playlist.setActiveForLockScreen(true, lockMetadata(track), { showNextTrack: true, showPreviousTrack: true });
    lockScreenActive = true;
  }
}

function handleStatus(status: AudioPlaylistStatus) {
  usePlayerStore.setState({
    playing: status.playing,
    buffering: status.isBuffering,
    currentTime: status.currentTime,
    duration: status.duration,
  });
}

function handleTrackChanged(currentIndex: number) {
  if (rebuilding) return;
  const { queue } = usePlayerStore.getState();
  usePlayerStore.setState({ index: currentIndex, currentTime: 0, error: null });
  const track = queue[currentIndex];
  if (track) {
    useLibraryStore.getState().addRecent(track.id);
    syncLockScreen(track);
  }
}

function createPlaylist(): PlaylistLike {
  const { exclusive, repeat } = usePlayerStore.getState();
  const bridge = getAudioBridge();
  if (exclusive && bridge) {
    return createNativePlaylist(
      bridge,
      {
        onOutput: (output) => usePlayerStore.setState({ output }),
        onError: (error) => usePlayerStore.setState({ error }),
        // 미디어 키도 화면의 버튼과 같은 규칙(3초 뒤 이전은 처음으로, 반복 재생의 처음으로 돌아가기)을 따릅니다.
        onMediaPlay: () => resume(),
        onMediaNext: () => next(),
        onMediaPrevious: () => previous(),
      },
      LOOP[repeat],
    );
  }
  return createAudioPlaylist({ updateInterval: 250, loop: LOOP[repeat] }) as unknown as PlaylistLike;
}

function ensurePlaylist(): PlaylistLike {
  if (!playlist) {
    playlist = createPlaylist();
    playlist.addListener('playlistStatusUpdate', handleStatus);
    playlist.addListener('trackChanged', ({ currentIndex }) => handleTrackChanged(currentIndex));
  }
  return playlist;
}

function ensureAudioMode() {
  // 잠금 화면 조작을 쓰려면 다른 앱 소리와 섞이지 않는 모드여야 합니다.
  audioModeReady ??= setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  });
  return audioModeReady;
}

async function playableUri(track: Track): Promise<string> {
  return track.source === 'local' ? resolveAudioUri(track.id) : track.uri;
}

/** 지금 큐에 없는 내 FLAC의 재생 주소를 놓습니다. 웹에서는 파일 데이터를 붙잡는 blob 주소입니다. */
function releaseUnused(queue: Track[]) {
  releaseAudioUris(queue.filter((t) => t.source === 'local').map((t) => t.id));
}

/**
 * 낡은 요청이 만든 주소를 놓습니다. 더 새 요청이 아직 주소를 구하는 중이면 그 요청이 쓸 주소까지 놓을 수 있어,
 * 그때는 놓지 않고 새 요청이 끝날 때 정리하게 둡니다.
 */
function releaseStale() {
  if (!starting) releaseUnused(usePlayerStore.getState().queue);
}

/** base가 queue의 원래 순서인지(같은 곡들인지) 봅니다. */
function describes(base: Track[], queue: Track[]) {
  return base.length === queue.length && queue.every((t) => base.some((b) => b.id === t.id));
}

/** 복원한 큐의 원래 순서입니다. 앞서 실패한 요청의 순서가 남아 있으면 쓰지 않습니다. */
const baseFor = (queue: Track[]) => (describes(baseQueue, queue) ? baseQueue : queue);

/**
 * 만들어 둔 큐를 재생기에 올리고 index의 곡부터 재생합니다.
 * base는 셔플 전의 원래 순서이고, 올리기에 성공했을 때만 기억합니다.
 */
async function startQueue(queue: Track[], index: number, base: Track[] = queue): Promise<void> {
  const ticket = ++request;
  const start = queue[index];
  starting = true;
  try {
    await ensureAudioMode();
    const uris = await Promise.all(queue.map(playableUri));
    if (ticket !== request) {
      // 그사이 새 요청이나 멈춤이 있었으면, 이번에 만든 내 FLAC 주소 중 쓰지 않는 것을 놓습니다.
      releaseStale();
      return;
    }
    starting = false;
    baseQueue = base;
    const list = ensurePlaylist();
    rebuilding = true;
    list.clear();
    uris.forEach((uri) => list.add({ uri }));
    if (index > 0) list.skipTo(index);
    rebuilding = false;
    usePlayerStore.setState({ queue, index, currentTime: 0, duration: start.durationSec, error: null });
    releaseUnused(queue);
    useLibraryStore.getState().addRecent(start.id);
    syncLockScreen(start);
    list.play();
  } catch (error) {
    rebuilding = false;
    if (ticket !== request) {
      releaseStale();
      return;
    }
    starting = false;
    releaseUnused(usePlayerStore.getState().queue);
    usePlayerStore.setState({ error: error instanceof Error ? error.message : '곡을 재생하지 못했습니다.' });
  }
}

/**
 * 재생기가 아직 없는 복원한 큐를 바꿉니다. 재생기에 올리는 중이었으면 바뀐 큐로 다시 올려,
 * 늦게 끝난 앞 요청이 바뀐 큐를 덮지 않게 합니다.
 */
function updateRestored(queue: Track[], index: number) {
  const track = queue[index];
  usePlayerStore.setState({ queue, index, ...(track ? { currentTime: 0, duration: track.durationSec } : null) });
  if (starting && track) void startQueue(queue, index, baseFor(queue));
}

/** 곡 목록을 큐로 만들고 지정한 곡부터 재생합니다. */
export async function playTracks(tracks: Track[], startId?: string): Promise<void> {
  if (!tracks.length) return;
  const { shuffle } = usePlayerStore.getState();
  const start = tracks.find((t) => t.id === startId) ?? (shuffle ? shuffled(tracks)[0] : tracks[0]);
  const queue = shuffle ? [start, ...shuffled(tracks.filter((t) => t.id !== start.id))] : tracks;
  await startQueue(queue, queue.indexOf(start), tracks);
}

export function togglePlay() {
  if (!playlist) {
    // 앱을 다시 켜 복원한 큐는 재생기가 없으니, 누르면 그 곡부터 이어 듣습니다.
    const { queue, index } = usePlayerStore.getState();
    if (queue.length) void startQueue(queue, Math.min(index, queue.length - 1), baseFor(queue));
    return;
  }
  if (playlist.playing) playlist.pause();
  else resume();
}

/** 다시 재생합니다. 앞서 난 오류는 지우고, 또 실패하면 재생기가 다시 알립니다. */
function resume() {
  usePlayerStore.setState({ error: null });
  playlist?.play();
}

/** 복원한 큐에서 재생기 없이 곡만 옮깁니다. */
function moveRestored(index: number) {
  const { queue } = usePlayerStore.getState();
  if (queue[index]) updateRestored(queue, index);
}

export function next() {
  const { index, queue, repeat } = usePlayerStore.getState();
  if (!queue.length) return;
  if (!playlist) {
    moveRestored(index < queue.length - 1 ? index + 1 : repeat === 'off' ? index : 0);
    return;
  }
  if (index >= queue.length - 1) {
    if (repeat === 'off') return;
    playlist.skipTo(0);
  } else {
    playlist.next();
  }
}

export function previous() {
  const { index, currentTime, queue } = usePlayerStore.getState();
  if (!queue.length) return;
  if (!playlist) {
    moveRestored(Math.max(0, index - 1));
    return;
  }
  if (currentTime > RESTART_THRESHOLD_SEC || index === 0) {
    void playlist.seekTo(0);
  } else {
    playlist.previous();
  }
}

export function seekTo(seconds: number) {
  usePlayerStore.setState({ currentTime: seconds });
  void playlist?.seekTo(seconds);
}

export function skipToIndex(index: number) {
  if (playlist) {
    playlist.skipTo(index);
    return;
  }
  const { queue } = usePlayerStore.getState();
  if (queue[index]) void startQueue(queue, index, baseFor(queue));
}

export function cycleRepeat() {
  const order: RepeatMode[] = ['off', 'all', 'one'];
  const { repeat } = usePlayerStore.getState();
  const value = order[(order.indexOf(repeat) + 1) % order.length];
  usePlayerStore.setState({ repeat: value });
  if (playlist) playlist.loop = LOOP[value];
}

/** 지금 듣는 곡은 끊지 않고 나머지 곡의 순서만 바꿉니다. */
async function reorderAround(order: Track[], current: Track) {
  if (!playlist) {
    // 재생기가 아직 없으면(복원한 큐) 순서만 바꿉니다.
    updateRestored(order, order.indexOf(current));
    return;
  }
  const ticket = ++request;
  const uris = await Promise.all(order.map(playableUri));
  if (ticket !== request || !playlist) return;
  const list = playlist;
  const { index } = usePlayerStore.getState();
  rebuilding = true;
  for (let i = list.trackCount - 1; i >= 0; i -= 1) {
    if (i !== index) list.remove(i);
  }
  const at = order.indexOf(current);
  order.forEach((_, i) => {
    if (i < at) list.insert({ uri: uris[i] }, i);
    else if (i > at) list.add({ uri: uris[i] });
  });
  rebuilding = false;
  usePlayerStore.setState({ queue: order, index: at });
}

export async function toggleShuffle() {
  const { shuffle, queue, index } = usePlayerStore.getState();
  const value = !shuffle;
  usePlayerStore.setState({ shuffle: value });
  const current = queue[index];
  if (!current) return;
  // 원래 순서가 지금 큐와 맞지 않으면(복원한 큐, 실패한 요청) 섞기 전의 순서를 기준으로 삼습니다.
  baseQueue = baseFor(queue);
  if (value) {
    await reorderAround([current, ...shuffled(queue.filter((t) => t.id !== current.id))], current);
  } else {
    const base = baseQueue.filter((t) => queue.some((q) => q.id === t.id));
    const restored = base.find((t) => t.id === current.id) ? base : queue;
    await reorderAround(restored, restored.find((t) => t.id === current.id) ?? current);
  }
}

/** 큐 끝에 곡을 더합니다. 재생 중인 곡이 없으면 바로 재생합니다. */
export async function addToQueue(tracks: Track[]) {
  const { queue } = usePlayerStore.getState();
  const fresh = tracks.filter((t) => !queue.some((q) => q.id === t.id));
  if (!queue.length) {
    await playTracks(tracks);
    return;
  }
  if (!playlist) {
    // 복원한 큐에는 곡만 더하고, 재생을 누를 때 재생기에 올립니다.
    if (baseQueue.length) baseQueue = [...baseQueue, ...fresh];
    updateRestored([...queue, ...fresh], usePlayerStore.getState().index);
    return;
  }
  const ticket = request;
  const stopTicket = stops;
  const uris = await Promise.all(fresh.map(playableUri));
  if (ticket !== request) {
    // 그사이 재생을 멈췄으면 더하지 않습니다. 큐가 바뀌었으면 바뀐 큐를 기준으로 다시 더합니다.
    if (stops !== stopTicket) {
      releaseStale();
      return;
    }
    await addToQueue(tracks);
    return;
  }
  uris.forEach((uri) => playlist?.add({ uri }));
  baseQueue = [...baseQueue, ...fresh];
  usePlayerStore.setState({ queue: [...queue, ...fresh] });
}

export function removeFromQueue(trackId: string) {
  const { queue, index } = usePlayerStore.getState();
  const at = queue.findIndex((t) => t.id === trackId);
  if (at < 0) return;
  if (queue.length === 1) {
    stop();
    return;
  }
  if (!playlist) {
    const rest = queue.filter((t) => t.id !== trackId);
    baseQueue = baseQueue.filter((t) => t.id !== trackId);
    updateRestored(rest, at < index ? index - 1 : Math.min(index, rest.length - 1));
    return;
  }
  rebuilding = true;
  playlist.remove(at);
  rebuilding = false;
  baseQueue = baseQueue.filter((t) => t.id !== trackId);
  const nextQueue = queue.filter((t) => t.id !== trackId);
  const nextIndex = at < index ? index - 1 : Math.min(index, nextQueue.length - 1);
  usePlayerStore.setState({ queue: nextQueue, index: nextIndex });
  if (at === index) syncLockScreen(nextQueue[nextIndex]);
}

function stop() {
  request += 1;
  stops += 1;
  starting = false;
  if (playlist) {
    playlist.pause();
    playlist.clear();
    playlist.clearLockScreenControls();
    lockScreenActive = false;
  }
  baseQueue = [];
  releaseUnused([]);
  usePlayerStore.setState({ queue: [], index: 0, playing: false, buffering: false, currentTime: 0, duration: 0 });
}

/** 출력 방식을 바꾸면 다음 재생부터 새 재생기를 씁니다. */
export function setExclusiveOutput(exclusive: boolean) {
  if (usePlayerStore.getState().exclusive === exclusive) return;
  stop();
  playlist?.destroy?.();
  playlist = null;
  usePlayerStore.setState({ exclusive, output: null });
}
