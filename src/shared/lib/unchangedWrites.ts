type StringStorage = {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => unknown;
  removeItem: (name: string) => unknown;
};

/**
 * 같은 값을 다시 쓰지 않는 저장소입니다. zustand persist는 상태가 바뀔 때마다 저장하므로,
 * 재생 위치처럼 저장하지 않는 값이 자주 바뀌는 스토어는 같은 내용을 계속 쓰게 됩니다.
 *
 * - 쓰기에 실패하면 그 값을 기억하지 않아, 같은 값을 다시 쓸 수 있게 합니다.
 * - 읽는 사이에 쓰거나 지웠으면 늦게 끝난 읽기 결과로 기억을 덮지 않습니다.
 */
export function skipUnchangedWrites(storage: StringStorage): StringStorage {
  const written = new Map<string, string>();
  const generations = new Map<string, number>();
  const generation = (name: string) => generations.get(name) ?? 0;
  const bump = (name: string) => generations.set(name, generation(name) + 1);

  return {
    getItem: async (name) => {
      const before = generation(name);
      const value = await storage.getItem(name);
      if (value != null && generation(name) === before) written.set(name, value);
      return value;
    },
    setItem: (name, value) => {
      if (written.get(name) === value) return undefined;
      bump(name);
      written.set(name, value);
      const forget = () => {
        // 더 새 값을 쓰지 않았을 때만 지웁니다.
        if (written.get(name) === value) written.delete(name);
      };
      try {
        const result = storage.setItem(name, value);
        if (result instanceof Promise) {
          return result.catch((error: unknown) => {
            forget();
            throw error;
          });
        }
        return result;
      } catch (error) {
        forget();
        throw error;
      }
    },
    removeItem: (name) => {
      bump(name);
      written.delete(name);
      return storage.removeItem(name);
    },
  };
}
