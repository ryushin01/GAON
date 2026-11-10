import { setDemoSession, setOwnerSession, startSession, useSessionStore } from './sessionStore';

jest.mock('@/shared/api', () => ({ supabase: null }));

describe('로그인 상태', () => {
  beforeAll(() => startSession());
  afterEach(() => {
    setOwnerSession(null);
    setDemoSession(null);
  });

  it('데모 로그인은 데모 사용자로 들어갑니다', () => {
    setDemoSession('kakao');
    expect(useSessionStore.getState().session).toEqual({ kind: 'demo', userId: 'demo', name: '데모 사용자', provider: 'kakao' });
  });

  it('소유자 로그인이 데모보다 앞섭니다', () => {
    setDemoSession('google');
    setOwnerSession({ login: 'ryushin01', token: 't' });
    expect(useSessionStore.getState().session).toMatchObject({ kind: 'owner', name: 'ryushin01' });
    setOwnerSession(null);
    expect(useSessionStore.getState().session?.kind).toBe('demo');
  });
});
