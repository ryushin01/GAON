import { fireEvent, render, screen } from '@testing-library/react-native';

import { setDemoSession, setOwnerSession, startSession, useSessionStore } from '@/entities/session';

import { AccountSection } from './AccountSection';

const mockLogin = jest.fn();

jest.mock('@/shared/api', () => ({
  AUTH_CALLBACK_URL: 'gaon://auth-callback',
  isDesktopApp: () => false,
  supabase: null,
  fetchGitHubLogin: (...args: unknown[]) => mockLogin(...args),
  forgetLibraryGist: jest.fn(),
}));

describe('AccountSection (로그인 서버가 없는 빌드)', () => {
  beforeAll(() => startSession());
  beforeEach(() => {
    mockLogin.mockReset();
    setOwnerSession(null);
    setDemoSession(null);
  });

  it('데모 버튼은 서버에 가지 않고 데모 사용자로 들어갑니다', async () => {
    await render(<AccountSection />);
    await fireEvent.press(screen.getByRole('button', { name: '카카오 로그인 (데모)' }));
    expect(useSessionStore.getState().session).toMatchObject({ kind: 'demo', provider: 'kakao' });
    expect(screen.getByText('데모 사용자 · 카카오 데모 로그인 중입니다.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '계정 삭제' })).toBeNull();
  });

  it('소유자 계정이 아닌 토큰은 거절합니다', async () => {
    mockLogin.mockResolvedValue('someone');
    await render(<AccountSection />);
    await fireEvent.press(screen.getByRole('button', { name: '소유자 로그인' }));
    await fireEvent.changeText(screen.getByLabelText('GitHub 토큰'), 'token');
    await fireEvent.press(screen.getByRole('button', { name: '소유자로 로그인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/소유자 계정이 아닙니다/);
    expect(useSessionStore.getState().session).toBeNull();
  });

  it('소유자 토큰이면 소유자로 들어갑니다', async () => {
    mockLogin.mockResolvedValue('ryushin01');
    await render(<AccountSection />);
    await fireEvent.press(screen.getByRole('button', { name: '소유자 로그인' }));
    await fireEvent.changeText(screen.getByLabelText('GitHub 토큰'), ' token ');
    await fireEvent.press(screen.getByRole('button', { name: '소유자로 로그인' }));
    expect(mockLogin).toHaveBeenCalledWith('token');
    expect(await screen.findByText('ryushin01 · GitHub 소유자 계정으로 로그인했습니다.')).toBeTruthy();
  });
});
