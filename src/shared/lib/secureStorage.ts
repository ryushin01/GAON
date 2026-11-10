import * as SecureStore from 'expo-secure-store';

/** 토큰처럼 민감한 값은 기기의 암호화 저장소(iOS 키체인, Android Keystore)에 둡니다. */
export const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
