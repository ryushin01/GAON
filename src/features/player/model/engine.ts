import { createAudioPlaylist, setAudioModeAsync, type AudioPlaylistStatus } from 'expo-audio';

import { releaseAudioUris, resolveAudioUri, useLibraryStore } from '@/entities/library';
import { artistLine, displayTitle, type Track } from '@/entities/music';
import { onceAsync, shuffled } from '@/shared/lib';

import { createNativePlaylist, getAudioBridge, type PlaylistLike } from './nativePlaylist';
import { usePlayerStore, type RepeatMode } from './playerStore';

/** 이 시간 이상 재생했으면 '이전'은 곡의 처음으로 돌아갑니다. */
const RESTART_THRESHOLD_SEC = 3;
const LOOP = { off: 'none', all: 'all', one: 'single' } as const;

let playlist: PlaylistLike | null = null;
/** 셔플을 끌 때 돌아갈 원래 순서입니다. */
let baseQueue: Track[] = [];
/** 지금 큐의 순서가 어느 셔플 설정으로 만들어졌는지입니다. null이면 저장된 설정을 따릅니다(복원한 큐). */
let orderShuffled: boolean | null = null;
let lockScreenActive = false;
/** 큐를 바꾸는 동안 나오는 곡 변경 이벤트는 무시합니다. */
let rebuilding = false;

/**
 * 큐를 바꾸는 작업(새 큐 올리기, 셔플 재배치, 곡 더하기·빼기)은 한 줄로 세워 하나씩 실행합니다.
 * 곡 주소를 구하느라 기다리는 동안 다른 작업이 끼어들어 큐를 덮는 일이 없어, 작업 사이의 경쟁을 따로 막지 않아도 됩니다.
 * 멈춤(stop)만 바로 처리하고, 줄을 선 작업은 멈춤 번호(stops)를 보고 그만둡니다.
 */
let tail: Promise<void> = Promise.resolve();
/** 새 큐 요청마다 늘어납니다. 아직 실행하지 않았거나 주소를 구하는 중인 앞 요청은 버려, 마지막에 고른 곡이 재생됩니다. */
let request = 0;
/** 재생을 멈출 때마다 늘어납니다. 멈추기 전에 줄을 선 곡 더하기·빼기를 그만두게 합니다. */
let stops = 0;
/** 새 큐를 올리거나 멈출 때마다 늘어납니다. 옛 큐에서 고른 곡 빼기가 새 큐에 적용되지 않게 합니다. */
let loads = 0;
/** 줄을 서 있거나 실행 중인 새 큐 요청 수입니다. */
let pendingStarts = 0;

function serial(task: () => Promise<void> | void): Promise<void> {
  const run = tail.then(task).catch((error: unknown) => {
    usePlayerStore.setState({ error: error instanceof Error ? error.message : '재생 목록을 바꾸지 못했습니다.' });
  });
  tail = run;
  return run;
}

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
        // 미디어 키도 화면의 버튼과 같은 규칙(오류 지우기, 3초 뒤 이전은 처음으로, 반복 재생의 처음으로 돌아가기)을 따릅니다.
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

/**
 * 잠금 화면 조작을 쓰려면 다른 앱 소리와 섞이지 않는 모드여야 합니다. 한 번만 설정하고,
 * 실패하면 기억하지 않아 다음 재생에서 다시 시도합니다(전에는 앱을 다시 켤 때까지 재생이 안 됐습니다).
 */
const ensureAudioMode = onceAsync(() =>
  setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  }),
);

async function playableUri(track: Track): Promise<string> {
  return track.source === 'local' ? resolveAudioUri(track.id) : track.uri;
}

/**
 * 지금 큐에 없는 내 FLAC의 재생 주소를 놓습니다. 웹에서는 파일 데이터를 붙잡는 blob 주소입니다.
 * 작업을 하나씩 실행하므로, 다른 작업이 쓰려고 만든 주소를 놓는 일은 없습니다.
 */
function releaseUnused() {
  const { queue } = usePlayerStore.getState();
  releaseAudioUris(queue.filter((t) => t.source === 'local').map((t) => t.id));
}

/** base가 queue의 원래 순서인지(같은 곡들인지) 봅니다. */
function describes(base: Track[], queue: Track[]) {
  return base.length === queue.length && queue.every((t) => base.some((b) => b.id === t.id));
}

/** 큐의 원래 순서입니다. 기억한 순서가 지금 큐와 맞지 않으면(복원한 큐) 지금 큐를 씁니다. */
const baseFor = (queue: Track[]) => (describes(baseQueue, queue) ? baseQueue : queue);

const currentOrderShuffled = () => orderShuffled ?? usePlayerStore.getState().shuffle;

type Start = {
  queue: Track[];
  index: number;
  /** 셔플 전의 원래 순서입니다. */
  base: Track[];
  /** 큐를 만들 때의 셔플 설정입니다. */
  shuffledWith: boolean;
};

/**
 * 새 큐를 올리도록 줄을 세웁니다. build는 실행할 차례가 왔을 때의 상태(셔플 설정, 복원한 큐)로 큐를 만들고,
 * 그사이 더 새 요청이 있었으면 실행하지 않습니다.
 */
function requestStart(build: () => Start | null): Promise<void> {
  const ticket = ++request;
  pendingStarts += 1;
  return serial(async () => {
    try {
      if (ticket !== request) return;
      const start = build();
      if (start) await load(ticket, start);
    } finally {
      pendingStarts -= 1;
    }
  });
}

/** 큐를 재생기에 올리고 index의 곡부터 재생합니다. */
async function load(ticket: number, { queue, index, base, shuffledWith }: Start): Promise<void> {
  const first = queue[index];
  try {
    await ensureAudioMode();
    const uris = await Promise.all(queue.map(playableUri));
    if (ticket !== request) {
      // 주소를 구하는 사이에 더 새 요청이나 멈춤이 있었습니다. 이번에 만든 주소 중 지금 큐에 없는 것을 놓습니다.
      releaseUnused();
      return;
    }
    const list = ensurePlaylist();
    rebuilding = true;
    list.clear();
    uris.forEach((uri) => list.add({ uri }));
    if (index > 0) list.skipTo(index);
    rebuilding = false;
    baseQueue = base;
    orderShuffled = shuffledWith;
    loads += 1;
    usePlayerStore.setState({ queue, index, currentTime: 0, duration: first.durationSec, error: null });
    releaseUnused();
    useLibraryStore.getState().addRecent(first.id);
    syncLockScreen(first);
    list.play();
  } catch (error) {
    rebuilding = false;
    releaseUnused();
    if (ticket !== request) return;
    usePlayerStore.setState({ error: error instanceof Error ? error.message : '곡을 재생하지 못했습니다.' });
  }
}

/** 지금의 셔플 설정으로 곡 목록의 큐를 만듭니다. */
function buildStart(tracks: Track[], startId?: string): Start {
  const { shuffle } = usePlayerStore.getState();
  const first = tracks.find((t) => t.id === startId) ?? (shuffle ? shuffled(tracks)[0] : tracks[0]);
  const queue = shuffle ? [first, ...shuffled(tracks.filter((t) => t.id !== first.id))] : tracks;
  return { queue, index: queue.indexOf(first), base: tracks, shuffledWith: shuffle };
}

/** 곡 목록을 큐로 만들고 지정한 곡부터 재생합니다. */
export function playTracks(tracks: Track[], startId?: string): Promise<void> {
  if (!tracks.length) return Promise.resolve();
  return requestStart(() => buildStart(tracks, startId));
}

/** 앱을 다시 켜 복원한 큐를 그대로 재생기에 올립니다. targetId가 있으면 그 곡부터 재생합니다. */
function startRestored(targetId?: string): Promise<void> {
  return requestStart(() => {
    const { queue, index } = usePlayerStore.getState();
    const at = targetId ? queue.findIndex((t) => t.id === targetId) : Math.min(index, queue.length - 1);
    if (at < 0 || !queue[at]) return null;
    return { queue, index: at, base: baseFor(queue), shuffledWith: currentOrderShuffled() };
  });
}

export function togglePlay() {
  if (!playlist) {
    // 복원한 큐는 재생기가 없으니, 누르면 그 곡부터 이어 듣습니다. 이미 올리는 중이면 기다립니다.
    if (!pendingStarts && usePlayerStore.getState().queue.length) void startRestored();
    return;
  }
  if (playlist.playing) playlist.pause();
  else resume();
}

/** 다시 재생합니다. 앞서 난 오류는 지우고, 또 실패하면 재생기가 다시 알립니다. */
function resume() {
  if (!playlist) {
    togglePlay();
    return;
  }
  usePlayerStore.setState({ error: null });
  playlist.play();
}

/** 복원한 큐에서 재생기 없이 곡만 옮깁니다. 새 큐를 올리는 중이면 올린 뒤에 조작합니다. */
function moveRestored(index: number) {
  if (pendingStarts) return;
  const track = usePlayerStore.getState().queue[index];
  if (track) usePlayerStore.setState({ index, currentTime: 0, duration: track.durationSec });
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
  // 복원한 큐의 목록에서 고른 곡부터 재생합니다. 올리는 중인 요청보다 나중에 고른 것이 이깁니다.
  const target = usePlayerStore.getState().queue[index];
  if (target) void startRestored(target.id);
}

export function cycleRepeat() {
  const order: RepeatMode[] = ['off', 'all', 'one'];
  const { repeat } = usePlayerStore.getState();
  const value = order[(order.indexOf(repeat) + 1) % order.length];
  usePlayerStore.setState({ repeat: value });
  if (playlist) playlist.loop = LOOP[value];
}

/** 지금 듣는 곡은 끊지 않고 나머지 곡의 순서만 바꿉니다. 바꿨으면 true입니다. */
async function reorder(order: Track[]): Promise<boolean> {
  if (!playlist) {
    // 재생기가 아직 없으면(복원한 큐) 순서만 바꿉니다.
    const { queue, index } = usePlayerStore.getState();
    usePlayerStore.setState({ queue: order, index: order.findIndex((t) => t.id === queue[index]?.id) });
    return true;
  }
  const stopTicket = stops;
  const uris = await Promise.all(order.map(playableUri));
  if (stops !== stopTicket || !playlist) return false;
  // 주소를 구하는 사이에 다음 곡으로 넘어갔을 수 있어, 지금 듣는 곡을 다시 확인합니다.
  const { queue, index } = usePlayerStore.getState();
  const at = order.findIndex((t) => t.id === queue[index]?.id);
  if (at < 0) return false;
  const list = playlist;
  rebuilding = true;
  for (let i = list.trackCount - 1; i >= 0; i -= 1) {
    if (i !== index) list.remove(i);
  }
  order.forEach((_, i) => {
    if (i < at) list.insert({ uri: uris[i] }, i);
    else if (i > at) list.add({ uri: uris[i] });
  });
  rebuilding = false;
  usePlayerStore.setState({ queue: order, index: at });
  return true;
}

/** 셔플을 바꿉니다. 큐는 앞서 줄을 선 작업(새 큐 올리기 등)이 끝난 뒤의 큐를 그때의 설정에 맞게 늘어놓습니다. */
export function toggleShuffle(): Promise<void> {
  // 설정을 바꾸기 전에, 지금 큐의 순서가 어느 설정을 따르는지 고정해 둡니다.
  orderShuffled = currentOrderShuffled();
  usePlayerStore.setState({ shuffle: !usePlayerStore.getState().shuffle });
  return serial(async () => {
    const { shuffle: value, queue, index } = usePlayerStore.getState();
    const current = queue[index];
    if (!current || value === currentOrderShuffled()) return;
    baseQueue = baseFor(queue);
    const base = baseQueue.filter((t) => queue.some((q) => q.id === t.id));
    const order = value ? [current, ...shuffled(queue.filter((t) => t.id !== current.id))] : base;
    if (await reorder(order)) orderShuffled = value;
  });
}

/** 큐 끝에 곡을 더합니다. 재생 중인 곡이 없으면 바로 재생합니다. */
export function addToQueue(tracks: Track[]): Promise<void> {
  if (!tracks.length) return Promise.resolve();
  if (!usePlayerStore.getState().queue.length && !pendingStarts) return playTracks(tracks);
  const stopTicket = stops;
  const requestTicket = request;
  return serial(async () => {
    // 그사이 재생을 멈췄으면 더하지 않습니다.
    if (stops !== stopTicket) return;
    const { queue } = usePlayerStore.getState();
    if (!queue.length) {
      // 앞서 올리던 큐가 실패해 큐가 비었습니다. 더 나중에 고른 곡이 줄을 서 있으면 그 곡이 이기게 두고,
      // 아니면 더하려던 곡으로 새로 재생합니다. 이 작업 안에서 바로 올려, 나중 요청보다 앞서지 않게 합니다.
      if (request !== requestTicket) return;
      pendingStarts += 1;
      try {
        await load(++request, buildStart(tracks));
      } finally {
        pendingStarts -= 1;
      }
      return;
    }
    const fresh = tracks.filter((t) => !queue.some((q) => q.id === t.id));
    if (!fresh.length) return;
    const keepBase = describes(baseQueue, queue);
    if (playlist) {
      const uris = await Promise.all(fresh.map(playableUri));
      if (stops !== stopTicket || !playlist) {
        releaseUnused();
        return;
      }
      uris.forEach((uri) => playlist?.add({ uri }));
    }
    // 재생기가 없으면(복원한 큐) 곡만 더하고, 재생을 누를 때 재생기에 올립니다.
    if (keepBase) baseQueue = [...baseQueue, ...fresh];
    usePlayerStore.setState({ queue: [...usePlayerStore.getState().queue, ...fresh] });
  });
}

/** 재생 목록에서 고른 곡을 뺍니다. 그사이 새 큐가 올라왔거나 멈췄으면, 옛 큐에서 고른 곡을 새 큐에서 빼지 않습니다. */
export function removeFromQueue(trackId: string): Promise<void> {
  const loadTicket = loads;
  return serial(() => {
    if (loads === loadTicket) removeNow(trackId);
  });
}

/**
 * 곡을 어느 큐에 있든 뺍니다. 보관함에서 지운 곡처럼 다시 재생할 수 없는 곡에 씁니다.
 * 앞서 줄을 선 큐 올리기가 끝난 뒤에 빼므로, 끝나기를 기다린 뒤 파일을 지웁니다.
 */
export function forgetTrack(trackId: string): Promise<void> {
  return serial(() => removeNow(trackId));
}

/** 마지막 곡을 빼면 큐를 비웁니다. */
function removeNow(trackId: string) {
  const { queue, index } = usePlayerStore.getState();
  const at = queue.findIndex((t) => t.id === trackId);
  if (at < 0) return;
  if (queue.length === 1) {
    clearQueue();
    return;
  }
  if (playlist) {
    rebuilding = true;
    playlist.remove(at);
    rebuilding = false;
  }
  baseQueue = baseQueue.filter((t) => t.id !== trackId);
  const nextQueue = queue.filter((t) => t.id !== trackId);
  const nextIndex = at < index ? index - 1 : Math.min(index, nextQueue.length - 1);
  usePlayerStore.setState({ queue: nextQueue, index: nextIndex });
  if (at === index) syncLockScreen(nextQueue[nextIndex]);
}

/** 재생을 멈추고 줄을 선 새 큐 요청과 곡 더하기도 그만두게 합니다(출력 방식을 바꿀 때). */
function stop() {
  request += 1;
  stops += 1;
  clearQueue();
}

/** 큐를 비우고 재생을 멈춥니다. 줄을 선 요청은 그대로 두어, 마지막 곡을 뺀 뒤에 고른 곡은 재생됩니다. */
function clearQueue() {
  loads += 1;
  if (playlist) {
    playlist.pause();
    playlist.clear();
    playlist.clearLockScreenControls();
    lockScreenActive = false;
  }
  baseQueue = [];
  orderShuffled = null;
  usePlayerStore.setState({ queue: [], index: 0, playing: false, buffering: false, currentTime: 0, duration: 0 });
  releaseUnused();
}

/** 출력 방식을 바꾸면 다음 재생부터 새 재생기를 씁니다. */
export function setExclusiveOutput(exclusive: boolean) {
  if (usePlayerStore.getState().exclusive === exclusive) return;
  stop();
  playlist?.destroy?.();
  playlist = null;
  usePlayerStore.setState({ exclusive, output: null });
}
