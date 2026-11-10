import { completeSignIn } from './signIn';

const mockExchange = jest.fn();

jest.mock('@/shared/api', () => ({
  AUTH_CALLBACK_URL: 'gaon://auth-callback',
  isDesktopApp: () => false,
  supabase: { auth: { exchangeCodeForSession: (...args: unknown[]) => mockExchange(...args) } },
}));

describe('completeSignIn', () => {
  beforeEach(() => mockExchange.mockReset().mockResolvedValue({ error: null }));

  it('돌아온 주소의 코드를 그 로그인 흐름으로 교환합니다', async () => {
    await completeSignIn('gaon://auth-callback?code=abc', 'flow-1');
    expect(mockExchange).toHaveBeenCalledWith('abc', { flowId: 'flow-1' });
  });

  it('로그인 서비스가 거절하면 그 이유를 알려 줍니다', async () => {
    await expect(completeSignIn('gaon://auth-callback?error=access_denied&error_description=사용자가 취소함')).rejects.toThrow('사용자가 취소함');
    expect(mockExchange).not.toHaveBeenCalled();
  });

  it('코드가 없으면 교환하지 않습니다', async () => {
    await expect(completeSignIn('gaon://auth-callback')).rejects.toThrow('코드가 없습니다');
  });
});
