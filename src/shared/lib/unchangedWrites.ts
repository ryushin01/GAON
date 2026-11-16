type StringStorage = {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => unknown;
  removeItem: (name: string) => unknown;
};

/**
 * 같은 값을 다시 쓰지 않는 저장소입니다. zustand persist는 상태가 바뀔 때마다 저장하므로,
 * 재생 위치처럼 저장하지 않는 값이 자주 바뀌는 스토어는 같은 내용을 계속 쓰게 됩니다.
 */
export function skipUnchangedWrites(storage: StringStorage): StringStorage {
  const written = new Map<string, string>();
  return {
    getItem: async (name) => {
      const value = await storage.getItem(name);
      if (value != null) written.set(name, value);
      return value;
    },
    setItem: (name, value) => {
      if (written.get(name) === value) return undefined;
      written.set(name, value);
      return storage.setItem(name, value);
    },
    removeItem: (name) => {
      written.delete(name);
      return storage.removeItem(name);
    },
  };
}
