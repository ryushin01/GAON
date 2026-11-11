// 세션 읽기가 예외 대신 오류 응답을 돌려주는 경우입니다. 로그인 시작은 파일마다 한 번이라 따로 둡니다.
import { startSession, useSessionStore } from './sessionStore';

type Listener = (event: string, session: unknown) => void;

let mockFinishRead: (result: unknown) => void = () => undefined;
let mockListener: Listener = () => undefined;

jest.mock('@/shared/config', () => ({ ...jest.requireActual('@/shared/config'), SUPABASE_ENABLED: true }));
jest.mock('@/shared/api', () => ({
  getSupabase: async () => ({
    auth: {
      // 읽기는 테스트가 직접 끝냅니다.
      getSession: () =>
        new Promise((resolve) => {
          mockFinishRead = resolve;
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

  it('로그인 이벤트 뒤에 도착한 빈 세션과 오류 응답이 그 세션을 덮어쓰지 않습니다', async () => {
    mockListener('SIGNED_IN', user);
    mockFinishRead({ data: { session: null }, error: new Error('갱신 실패') });
    await settle();
    expect(useSessionStore.getState()).toMatchObject({ ready: true, session: { kind: 'supabase', name: '가온' } });
  });
});
