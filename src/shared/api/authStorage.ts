import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * 앱의 로그인 세션을 암호화해 저장합니다.
 * 세션은 암호화 저장소의 한 항목 한도(약 2KB)를 넘을 수 있어, 무작위 키만 암호화 저장소에 두고
 * 그 키로 암호화한 세션은 일반 저장소에 둡니다. 저장할 때마다 새 키를 만듭니다.
 */
async function encrypt(key: string, value: string) {
  const secret = Crypto.getRandomBytes(32);
  const cipher = new aesjs.ModeOfOperation.ctr(secret, new aesjs.Counter(1));
  const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
  await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(secret));
  return aesjs.utils.hex.fromBytes(encrypted);
}

async function decrypt(key: string, value: string) {
  const secret = await SecureStore.getItemAsync(key);
  if (!secret) return null;
  const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(secret), new aesjs.Counter(1));
  return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
}

export const authStorage = {
  async getItem(key: string) {
    const encrypted = await AsyncStorage.getItem(key);
    return encrypted ? decrypt(key, encrypted) : null;
  },
  async setItem(key: string, value: string) {
    await AsyncStorage.setItem(key, await encrypt(key, value));
  },
  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  },
};
