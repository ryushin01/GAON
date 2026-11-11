import { startSession, useSessionStore } from './sessionStore';

jest.mock('@/shared/config', () => ({ ...jest.requireActual('@/shared/config'), SUPABASE_ENABLED: true }));
jest.mock('@/shared/api', () => ({
  getSupabase: async () => ({
    auth: {
      // 저장된 세션은 늦게 실패하고, 그 전에 로그인 이벤트가 세션을 줍니다.
      getSession: () => new Promise((_, reject) => setTimeout(() => reject(new Error('저장소를 읽지 못했습니다.')), 5)),
      onAuthStateChange: (listener: (event: string, session: unknown) => void) =>
        listener('SIGNED_IN', { user: { id: 'u1', user_metadata: { name: '가온' }, app_metadata: { provider: 'kakao' } } }),
    },
  }),
}));

describe('로그인 상태 (실제 로그인 빌드)', () => {
  it('저장된 세션을 읽지 못해도 준비를 끝내고, 그 사이 로그인 이벤트로 받은 세션은 지우지 않습니다', async () => {
    startSession();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(useSessionStore.getState()).toMatchObject({ ready: true, session: { kind: 'supabase', name: '가온' } });
  });
});
