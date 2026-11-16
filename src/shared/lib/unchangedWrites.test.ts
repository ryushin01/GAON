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
});
