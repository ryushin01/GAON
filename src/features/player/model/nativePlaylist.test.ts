import { createNativePlaylist, type AudioBridge } from './nativePlaylist';

type Listener = Parameters<AudioBridge['onEvent']>[0];

function setup(loop: 'none' | 'single' | 'all' = 'none') {
  let emit: Listener = () => {};
  const bridge = {
    prepareUrl: jest.fn(async (url: string) => `${url}.name`),
    prepareBytes: jest.fn(async () => 'bytes.name'),
    load: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
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
