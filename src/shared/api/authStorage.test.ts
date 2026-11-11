import AsyncStorage from '@react-native-async-storage/async-storage';

import { authStorage } from './authStorage';

jest.mock('expo-crypto', () => ({ getRandomBytes: (count: number) => Uint8Array.from({ length: count }, (_, i) => (i * 37 + 11) % 256) }));

describe('authStorage (앱)', () => {
  it('세션을 암호화해 저장하고 그대로 되읽습니다', async () => {
    const session = JSON.stringify({ access_token: 'secret-token', user: { id: 'u1' } });
    await authStorage.setItem('sb-session', session);
    const stored = await AsyncStorage.getItem('sb-session');
    expect(stored).not.toContain('secret-token');
    await expect(authStorage.getItem('sb-session')).resolves.toBe(session);
  });

  it('지우면 키와 암호문이 함께 사라집니다', async () => {
    await authStorage.setItem('sb-session', 'value');
    await authStorage.removeItem('sb-session');
    await expect(authStorage.getItem('sb-session')).resolves.toBeNull();
  });
});
