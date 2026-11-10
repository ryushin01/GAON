/** 웹과 PC 앱에는 암호화 저장소가 없어 브라우저 저장소를 씁니다. 저장소를 막은 환경에서는 저장하지 않습니다. */
export const secureStorage = {
  getItem: async (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // 저장하지 못하면 이번 실행 동안만 로그인됩니다.
    }
  },
  removeItem: async (key: string) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // 지울 것이 없습니다.
    }
  },
};
