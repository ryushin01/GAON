import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { useSessionStore } from '@/entities/session';

import { AccountSection } from './AccountSection';

const mockSignInWithOAuth = jest.fn();

jest.mock('@/shared/api', () => ({
  AUTH_CALLBACK_URL: 'gaon://auth-callback',
  isDesktopApp: () => false,
  supabase: {
    auth: { signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args), signOut: jest.fn().mockResolvedValue({ error: null }) },
    rpc: jest.fn(),
  },
}));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn().mockResolvedValue({ type: 'cancel' }) }));

describe('AccountSection', () => {
  beforeEach(() => {
    mockSignInWithOAuth.mockReset();
    useSessionStore.setState({ session: null, ready: true });
  });

  it('로그인하지 않았으면 세 가지 소셜 로그인을 보여 줍니다', async () => {
    await render(<AccountSection />);
    expect(screen.getByRole('button', { name: '카카오 로그인' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Google로 로그인' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'GitHub로 로그인' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '개인정보 처리방침' })).toBeTruthy();
  });

  it('빠르게 두 번 눌러도 로그인을 한 번만 시작합니다', async () => {
    let finish: (value: unknown) => void = () => undefined;
    mockSignInWithOAuth.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await render(<AccountSection />);
    const button = screen.getByRole('button', { name: '카카오 로그인' });
    await fireEvent.press(button);
    await fireEvent.press(button);
    expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
    expect(mockSignInWithOAuth.mock.calls[0][0].provider).toBe('kakao');
    await act(async () => finish({ data: { url: 'https://example.com', flowId: 'f' }, error: null }));
  });

  it('로그인하면 계정과 로그아웃, 계정 삭제를 보여 줍니다', async () => {
    useSessionStore.setState({
      session: { kind: 'supabase', userId: 'u1', name: '가온', provider: 'kakao' },
      ready: true,
    });
    await render(<AccountSection />);
    expect(screen.getByText('가온 · 카카오 계정으로 로그인했습니다.')).toBeTruthy();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '계정 삭제' })).toBeTruthy();
  });
});
