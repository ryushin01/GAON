import { onceAsync } from './supabase';

describe('onceAsync', () => {
  it('한 번 만든 값은 다시 만들지 않습니다', async () => {
    const create = jest.fn().mockResolvedValue('client');
    const get = onceAsync(create);
    await expect(get()).resolves.toBe('client');
    await expect(get()).resolves.toBe('client');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('만들다 실패하면 기억하지 않고 다음 요청에서 다시 만듭니다', async () => {
    const create = jest.fn().mockRejectedValueOnce(new Error('묶음을 받지 못했습니다.')).mockResolvedValue('client');
    const get = onceAsync(create);
    await expect(get()).rejects.toThrow('묶음을 받지 못했습니다.');
    await expect(get()).resolves.toBe('client');
    expect(create).toHaveBeenCalledTimes(2);
  });
});
