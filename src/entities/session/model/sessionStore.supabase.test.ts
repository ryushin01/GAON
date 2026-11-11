import { startSession, useSessionStore } from './sessionStore';

jest.mock('@/shared/config', () => ({ ...jest.requireActual('@/shared/config'), SUPABASE_ENABLED: true }));
jest.mock('@/shared/api', () => ({
  getSupabase: async () => ({
    auth: {
      getSession: () => Promise.reject(new Error('저장소를 읽지 못했습니다.')),
      onAuthStateChange: jest.fn(),
    },
  }),
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('로그인 상태 (실제 로그인 빌드)', () => {
  it('저장된 세션을 읽지 못해도 로그아웃한 상태로 준비를 끝냅니다', async () => {
    startSession();
    for (let i = 0; i < 5; i += 1) await flush();
    expect(useSessionStore.getState()).toMatchObject({ ready: true, session: null });
  });
});
