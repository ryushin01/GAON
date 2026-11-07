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

  it('준비에 실패하면 알립니다', async () => {
    const { bridge, list, onError } = setup();
    bridge.prepareUrl.mockRejectedValueOnce(new Error('download_failed'));
    list.play();
    await settle();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(bridge.load).not.toHaveBeenCalled();
  });
});
