import { getOwnerToken, setDemoSession, setOwnerSession, startSession, useSessionStore } from './sessionStore';

jest.mock('@/shared/api', () => ({ supabase: null }));

describe('로그인 상태', () => {
  beforeAll(async () => {
    startSession();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  afterEach(async () => {
    await setOwnerSession(null);
    setDemoSession(null);
  });

  it('데모 로그인은 데모 사용자로 들어갑니다', () => {
    setDemoSession('kakao');
    expect(useSessionStore.getState().session).toEqual({ kind: 'demo', userId: 'demo', name: '데모 사용자', provider: 'kakao' });
  });

  it('소유자 로그인이 데모보다 앞서고, 토큰은 보관함 상태에 남기지 않습니다', async () => {
    setDemoSession('google');
    await setOwnerSession({ login: 'ryushin01', token: 't' });
    expect(useSessionStore.getState().session).toMatchObject({ kind: 'owner', name: 'ryushin01' });
    expect(getOwnerToken()).toBe('t');
    expect(JSON.stringify(useSessionStore.getState())).not.toContain('"t"');
    await setOwnerSession(null);
    expect(useSessionStore.getState().session?.kind).toBe('demo');
  });
});
