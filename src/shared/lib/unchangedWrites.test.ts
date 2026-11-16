import { skipUnchangedWrites } from './unchangedWrites';

describe('skipUnchangedWrites', () => {
  it('같은 값은 다시 쓰지 않고 바뀐 값만 씁니다', async () => {
    const setItem = jest.fn();
    const storage = skipUnchangedWrites({ getItem: async () => 'a', setItem, removeItem: jest.fn() });
    await storage.getItem('k');
    storage.setItem('k', 'a');
    storage.setItem('k', 'b');
    storage.setItem('k', 'b');
    expect(setItem.mock.calls).toEqual([['k', 'b']]);
  });

  it('지운 뒤에는 같은 값도 다시 씁니다', () => {
    const setItem = jest.fn();
    const storage = skipUnchangedWrites({ getItem: () => null, setItem, removeItem: jest.fn() });
    storage.setItem('k', 'a');
    storage.removeItem('k');
    storage.setItem('k', 'a');
    expect(setItem).toHaveBeenCalledTimes(2);
  });

  it('쓰기에 실패한 값은 기억하지 않아 다시 쓸 수 있습니다', async () => {
    const setItem = jest.fn().mockRejectedValueOnce(new Error('quota')).mockResolvedValue(undefined);
    const storage = skipUnchangedWrites({ getItem: () => null, setItem, removeItem: jest.fn() });
    await expect(storage.setItem('k', 'a')).rejects.toThrow('quota');
    await storage.setItem('k', 'a');
    expect(setItem).toHaveBeenCalledTimes(2);
  });

  it('읽는 사이에 쓴 값을 늦게 끝난 읽기 결과로 덮지 않습니다', async () => {
    let finish: (value: string) => void = () => {};
    const setItem = jest.fn();
    const storage = skipUnchangedWrites({
      getItem: () => new Promise<string>((resolve) => (finish = resolve)),
      setItem,
      removeItem: jest.fn(),
    });
    const read = storage.getItem('k');
    storage.setItem('k', 'new');
    finish('old');
    await read;
    storage.setItem('k', 'old');
    expect(setItem.mock.calls).toEqual([['k', 'new'], ['k', 'old']]);
  });
});
