import { createNativePlaylist, type AudioBridge } from './nativePlaylist';

type Listener = Parameters<AudioBridge['onEvent']>[0];

function setup(loop: 'none' | 'single' | 'all' = 'none') {
  let emit: Listener = () => {};
  const bridge = {
    prepareUrl: jest.fn(async (url: string) => `${url}.name`),
    prepareBytes: jest.fn(async () => 'bytes.name'),
    load: jest.fn(),
    next: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    // 재생기는 멈춤을 처리하면 stopped를 알립니다.
    stop: jest.fn(() => queueMicrotask(() => emit({ event: 'stopped' }))),
    seek: jest.fn(),
    onEvent: jest.fn((listener: Listener) => {
      emit = listener;
      return () => {};
    }),
  } satisfies AudioBridge;
  const onOutput = jest.fn();
  const onError = jest.fn();
  const list = createNativePlaylist(bridge, { onOutput, onError }, loop);
  const tracks = jest.fn();
  list.addListener('trackChanged', tracks);
  ['a', 'b', 'c'].forEach((uri) => list.add({ uri }));
  return { bridge, list, tracks, onOutput, onError, emit: (event: Parameters<Listener>[0]) => emit(event) };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('비트 퍼펙트 재생 목록', () => {
  it('재생하면 현재 곡을 준비해 불러온 뒤 시작합니다', async () => {
    const { bridge, list } = setup();
    list.play();
    await settle();
    expect(bridge.prepareUrl).toHaveBeenCalledWith('a');
    expect(bridge.load).toHaveBeenCalledWith('a.name');
    expect(bridge.play).toHaveBeenCalledTimes(1);
  });

  it('곡이 끝나면 다음 곡으로 넘어가고, 마지막 곡에서는 멈춥니다', async () => {
    const { bridge, list, tracks, emit } = setup();
    list.skipTo(1);
    list.play();
    await settle();
    emit({ event: 'ended' });
    await settle();
    expect(tracks).toHaveBeenLastCalledWith({ currentIndex: 2 });
    expect(bridge.load).toHaveBeenLastCalledWith('c.name');
    const before = bridge.load.mock.calls.length;
    emit({ event: 'ended' });
    await settle();
    expect(bridge.load).toHaveBeenCalledTimes(before);
  });

  it('한 곡 반복은 처음으로 돌아가고, 전체 반복은 첫 곡으로 갑니다', async () => {
    const single = setup('single');
    single.list.play();
    await settle();
    single.emit({ event: 'ended' });
    expect(single.bridge.seek).toHaveBeenCalledWith(0);

    const all = setup('all');
    all.list.skipTo(2);
    all.list.play();
    await settle();
    all.emit({ event: 'ended' });
    await settle();
    expect(all.tracks).toHaveBeenLastCalledWith({ currentIndex: 0 });
  });

  it('곡을 빨리 넘기면 마지막에 고른 곡만 불러옵니다', async () => {
    const { bridge, list } = setup();
    list.play();
    list.skipTo(1);
    list.skipTo(2);
    await settle();
    expect(bridge.load.mock.calls).toEqual([['c.name']]);
  });

  it('곡을 넘기면 이전 출력 정보를 지웁니다', async () => {
    const { list, onOutput } = setup();
    list.play();
    await settle();
    onOutput.mockClear();
    list.skipTo(1);
    await settle();
    expect(onOutput).toHaveBeenCalledWith(null);
  });

  it('재생기 오류를 알리고 재생 상태를 끕니다', async () => {
    const { list, emit, onError } = setup();
    list.play();
    await settle();
    emit({ event: 'error', message: 'device_open_failed' });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(list.playing).toBe(false);
  });

  it('재생기 오류 뒤에 다시 재생하면 곡을 다시 불러옵니다', async () => {
    const { bridge, list, emit } = setup();
    list.play();
    await settle();
    emit({ event: 'error', message: 'helper_stopped' });
    bridge.load.mockClear();
    list.play();
    await settle();
    expect(bridge.load).toHaveBeenCalledWith('a.name');
  });

  it('지금 곡을 불러오면 다음 곡을 미리 받아 재생기에 알립니다', async () => {
    const { bridge, list } = setup();
    list.play();
    await settle();
    expect(bridge.prepareUrl).toHaveBeenCalledWith('b');
    expect(bridge.next).toHaveBeenLastCalledWith('b.name');
    expect(bridge.load).toHaveBeenCalledTimes(1);
  });

  it('재생기가 다음 곡을 이어 붙이면 다시 불러오지 않고 곡만 넘기며, 그다음 곡을 알립니다', async () => {
    const { bridge, list, tracks, emit } = setup();
    list.play();
    await settle();
    emit({ event: 'advanced', file: 'b.name', duration: 24 });
    await settle();
    expect(tracks).toHaveBeenLastCalledWith({ currentIndex: 1 });
    expect(bridge.load).toHaveBeenCalledTimes(1);
    expect(bridge.next).toHaveBeenLastCalledWith('c.name');
    // 마지막 곡에서는 알릴 다음 곡이 없습니다(반복 꺼짐).
    emit({ event: 'advanced', file: 'c.name', duration: 24 });
    await settle();
    expect(tracks).toHaveBeenLastCalledWith({ currentIndex: 2 });
    expect(bridge.next).toHaveBeenLastCalledWith('c.name');
  });

  it('다음 곡이 바뀌면 알린 곡을 지우고 새 다음 곡을 알립니다', async () => {
    const { bridge, list } = setup();
    list.play();
    await settle();
    list.remove(1);
    await settle();
    expect(bridge.next.mock.calls.slice(-2)).toEqual([[null], ['c.name']]);
  });

  it('곡을 여러 번 옮기는 작업은 끝난 뒤의 다음 곡만 받습니다', async () => {
    const { bridge, list } = setup();
    list.play();
    await settle();
    bridge.prepareUrl.mockClear();
    // 셔플 재배치처럼 지금 곡만 남기고 빼고 다시 넣습니다.
    list.remove(2);
    list.remove(1);
    list.add({ uri: 'c' });
    list.add({ uri: 'b' });
    await settle();
    expect(bridge.prepareUrl.mock.calls).toEqual([['c']]);
    expect(bridge.next).toHaveBeenLastCalledWith('c.name');
  });

  it('재생기가 큐에 없는 곡으로 넘어갔으면 다음 곡을 새로 불러옵니다', async () => {
    const { bridge, list, tracks, emit } = setup();
    list.play();
    await settle();
    emit({ event: 'advanced', file: 'old.name', duration: 24 });
    await settle();
    expect(tracks).toHaveBeenLastCalledWith({ currentIndex: 1 });
    expect(bridge.load).toHaveBeenLastCalledWith('b.name');
  });

  it('마지막 곡에서 큐에 없는 곡으로 넘어갔으면 멈추고, 다시 재생하면 지금 곡을 새로 불러옵니다', async () => {
    const { bridge, list, emit } = setup();
    list.skipTo(2);
    list.play();
    await settle();
    emit({ event: 'advanced', file: 'old.name', duration: 24 });
    await settle();
    expect(list.playing).toBe(false);
    expect(bridge.stop).toHaveBeenCalledTimes(2);
    bridge.load.mockClear();
    list.play();
    await settle();
    expect(bridge.load).toHaveBeenCalledWith('c.name');
  });

  it('한 곡 반복은 같은 곡을 다음 곡으로 알리고, 넘어가도 곡을 바꾸지 않습니다', async () => {
    const { bridge, list, tracks, emit } = setup('single');
    list.play();
    await settle();
    expect(bridge.next).toHaveBeenLastCalledWith('a.name');
    tracks.mockClear();
    emit({ event: 'advanced', file: 'a.name', duration: 24 });
    await settle();
    expect(tracks).not.toHaveBeenCalled();
    expect(bridge.load).toHaveBeenCalledTimes(1);
  });

  it('멈춤을 처리했다는 알림 전에 온 이벤트는 멈추기 전 곡의 것이라 버립니다', async () => {
    const { bridge, list, tracks, emit } = setup();
    list.play();
    await settle();
    list.skipTo(1);
    // 재생기가 멈춤을 처리하기 전에 앞 곡이 끝났다는 알림이 왔습니다.
    emit({ event: 'ended' });
    await settle();
    expect(tracks).toHaveBeenLastCalledWith({ currentIndex: 1 });
    expect(bridge.load).toHaveBeenLastCalledWith('b.name');
  });

  it('준비에 실패하면 알립니다', async () => {
    const { bridge, list, onError } = setup();
    bridge.prepareUrl.mockRejectedValueOnce(new Error('download_failed'));
    list.play();
    await settle();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(bridge.load).not.toHaveBeenCalled();
  });
});

describe('비트 퍼펙트 재생기의 Media Session', () => {
  const handlers: Record<string, ((details: { seekTime?: number }) => void) | null> = {};
  const session = {
    metadata: null as unknown,
    playbackState: 'none',
    setActionHandler: jest.fn((action: string, handler: ((details: { seekTime?: number }) => void) | null) => {
      handlers[action] = handler;
    }),
    setPositionState: jest.fn(),
  };

  beforeAll(() => {
    Object.defineProperty(globalThis.navigator, 'mediaSession', { value: session, configurable: true });
    (globalThis as { MediaMetadata?: unknown }).MediaMetadata = class {
      constructor(readonly init: object) {
        Object.assign(this, init);
      }
    };
  });
  afterAll(() => {
    Object.defineProperty(globalThis.navigator, 'mediaSession', { value: undefined, configurable: true });
    delete (globalThis as { MediaMetadata?: unknown }).MediaMetadata;
  });

  it('곡 정보를 알리고 미디어 키로 재생·다음 곡·위치 이동을 합니다', async () => {
    const { bridge, list, tracks, emit } = setup();
    list.setActiveForLockScreen(true, { title: '빛', artist: '유신', albumTitle: '앨범' });
    expect(session.metadata).toMatchObject({ title: '빛', artist: '유신', album: '앨범' });

    handlers.play?.({});
    await settle();
    expect(bridge.play).toHaveBeenCalled();
    emit({ event: 'status', playing: true, time: 3, duration: 30 });
    expect(session.playbackState).toBe('playing');
    expect(session.setPositionState).toHaveBeenCalledWith({ duration: 30, position: 3, playbackRate: 1 });

    handlers.seekto?.({ seekTime: 10 });
    expect(bridge.seek).toHaveBeenCalledWith(10);
    handlers.nexttrack?.({});
    expect(tracks).toHaveBeenLastCalledWith({ currentIndex: 1 });

    list.clearLockScreenControls();
    expect(session.metadata).toBeNull();
    expect(handlers.play).toBeNull();
  });

  it('미디어 키의 재생·다음·이전은 화면 버튼과 같은 규칙을 쓰도록 엔진에 맡깁니다', () => {
    const onMediaNext = jest.fn();
    const onMediaPrevious = jest.fn();
    const bridge = {
      prepareUrl: jest.fn(async (url: string) => url),
      prepareBytes: jest.fn(async () => 'bytes'),
      load: jest.fn(),
      play: jest.fn(),
      pause: jest.fn(),
      stop: jest.fn(),
      seek: jest.fn(),
      onEvent: jest.fn(() => () => {}),
    } satisfies AudioBridge;
    const onMediaPlay = jest.fn();
    const list = createNativePlaylist(bridge, { onOutput: jest.fn(), onError: jest.fn(), onMediaPlay, onMediaNext, onMediaPrevious }, 'all');
    list.setActiveForLockScreen(true, { title: '빛' });
    handlers.nexttrack?.({});
    handlers.previoustrack?.({});
    // 운영체제의 재생 버튼도 화면의 재생 버튼처럼 앞서 난 오류를 지우고 재생하도록 엔진에 맡깁니다.
    handlers.play?.({});
    expect(onMediaNext).toHaveBeenCalledTimes(1);
    expect(onMediaPrevious).toHaveBeenCalledTimes(1);
    expect(onMediaPlay).toHaveBeenCalledTimes(1);
    expect(bridge.play).not.toHaveBeenCalled();
  });
});
