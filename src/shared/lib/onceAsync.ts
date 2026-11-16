/**
 * 한 번만 만드는 비동기 값을 돌려줍니다. 만들다 실패하면 기억하지 않아 다음 요청에서 다시 만듭니다.
 */
export function onceAsync<T>(create: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () => {
    pending ??= create().catch((error: unknown) => {
      pending = null;
      throw error;
    });
    return pending;
  };
}
