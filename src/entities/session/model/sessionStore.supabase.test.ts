import { startSession, useSessionStore } from './sessionStore';

type Listener = (event: string, session: unknown) => void;

let mockFailRead: (error: Error) => void = () => undefined;
let mockListener: Listener = () => undefined;

jest.mock('@/shared/config', () => ({ ...jest.requireActual('@/shared/config'), SUPABASE_ENABLED: true }));
jest.mock('@/shared/api', () => ({
  getSupabase: async () => ({
    auth: {
      // 읽기는 테스트가 직접 끝냅니다.
      getSession: () =>
        new Promise((_resolve, reject) => {
          mockFailRead = reject;
        }),
      onAuthStateChange: (listener: Listener) => {
        mockListener = listener;
      },
    },
  }),
}));

const user = { user: { id: 'u1', user_metadata: { name: '가온' }, app_metadata: { provider: 'kakao' } } };

/** 기다리는 비동기 작업이 모두 끝나게 합니다. */
const settle = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

describe('로그인 상태 (실제 로그인 빌드)', () => {
  beforeAll(async () => {
    startSession();
    await settle();
  });

  it('로그인 이벤트 뒤에 세션 읽기가 실패해도 그 세션을 지우지 않고 준비를 끝냅니다', async () => {
    mockListener('SIGNED_IN', user);
    mockFailRead(new Error('저장소를 읽지 못했습니다.'));
    await settle();
    expect(useSessionStore.getState()).toMatchObject({ ready: true, session: { kind: 'supabase', name: '가온' } });
  });
});
