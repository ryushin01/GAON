import { createAudioPlaylist, setAudioModeAsync, type AudioPlaylistStatus } from 'expo-audio';

import { resolveAudioUri, useLibraryStore } from '@/entities/library';
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

/** 곡 목록을 큐로 만들고 지정한 곡부터 재생합니다. */
export async function playTracks(tracks: Track[], startId?: string): Promise<void> {
  if (!tracks.length) return;
  const { shuffle } = usePlayerStore.getState();
  const start = tracks.find((t) => t.id === startId) ?? (shuffle ? shuffled(tracks)[0] : tracks[0]);
  baseQueue = tracks;
  const queue = shuffle ? [start, ...shuffled(tracks.filter((t) => t.id !== start.id))] : tracks;
  const index = queue.indexOf(start);

  try {
    await ensureAudioMode();
    const uris = await Promise.all(queue.map(playableUri));
    const list = ensurePlaylist();
    rebuilding = true;
    list.clear();
    uris.forEach((uri) => list.add({ uri }));
    if (index > 0) list.skipTo(index);
    rebuilding = false;
    usePlayerStore.setState({ queue, index, currentTime: 0, duration: start.durationSec, error: null });
    useLibraryStore.getState().addRecent(start.id);
    syncLockScreen(start);
    list.play();
  } catch (error) {
    rebuilding = false;
    usePlayerStore.setState({ error: error instanceof Error ? error.message : '곡을 재생하지 못했습니다.' });
  }
}

export function togglePlay() {
  if (!playlist) return;
  if (playlist.playing) {
    playlist.pause();
  } else {
    playlist.play();
  }
}

export function next() {
  const { index, queue, repeat } = usePlayerStore.getState();
  if (!playlist || !queue.length) return;
  if (index >= queue.length - 1) {
    if (repeat === 'off') return;
    playlist.skipTo(0);
  } else {
    playlist.next();
  }
}

export function previous() {
  const { index, currentTime, queue } = usePlayerStore.getState();
  if (!playlist || !queue.length) return;
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
  playlist?.skipTo(index);
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
  if (!playlist) return;
  const uris = await Promise.all(order.map(playableUri));
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
  if (!queue.length || !playlist) {
    await playTracks(tracks);
    return;
  }
  const uris = await Promise.all(fresh.map(playableUri));
  uris.forEach((uri) => playlist?.add({ uri }));
  baseQueue = [...baseQueue, ...fresh];
  usePlayerStore.setState({ queue: [...queue, ...fresh] });
}

export function removeFromQueue(trackId: string) {
  const { queue, index } = usePlayerStore.getState();
  const at = queue.findIndex((t) => t.id === trackId);
  if (at < 0 || !playlist) return;
  if (queue.length === 1) {
    stop();
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
  if (playlist) {
    playlist.pause();
    playlist.clear();
    playlist.clearLockScreenControls();
    lockScreenActive = false;
  }
  baseQueue = [];
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
