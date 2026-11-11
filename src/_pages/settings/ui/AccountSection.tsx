import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useSessionStore } from '@/entities/session';
import { OWNER_GITHUB_LOGIN, PRIVACY_POLICY_URL, SUPABASE_ENABLED } from '@/shared/config';
import { AppButton, AppText, ConfirmDialog, Icon, type IconName } from '@/shared/ui';

import { deleteAccount, signIn, signInOwner, signOut, type SocialProvider } from '../model/signIn';

type Brand = { provider: SocialProvider; label: string; icon: IconName; bg: string; fg: string; border?: string };

/** 각 서비스의 로그인 버튼 색입니다. 테마와 상관없이 그대로 씁니다. */
const BRANDS: Brand[] = [
  { provider: 'kakao', label: '카카오 로그인', icon: 'chatbubble', bg: '#FEE500', fg: 'rgba(0, 0, 0, 0.85)' },
  { provider: 'google', label: 'Google로 로그인', icon: 'logo-google', bg: '#FFFFFF', fg: '#1F1F1F', border: '#747775' },
  { provider: 'github', label: 'GitHub로 로그인', icon: 'logo-github', bg: '#24292F', fg: '#FFFFFF', border: '#8C959F' },
];

const PROVIDER_NAME: Record<string, string> = { kakao: '카카오', google: 'Google', github: 'GitHub' };
const TOKEN_HELP_URL = 'https://github.com/settings/personal-access-tokens/new';

type Props = {
  /** 로그아웃하거나 계정을 지운 뒤 부릅니다. */
  onSignedOut?: () => void;
  /** 로그인한 동안 아래에 보여 줄 내용입니다. */
  children?: ReactNode;
};

/** 설정의 계정 구역입니다. 로그인 서버가 없는 빌드는 데모 로그인과 소유자 로그인을 보여 줍니다. */
export function AccountSection({ onSignedOut, children }: Props) {
  const { theme } = useUnistyles();
  const session = useSessionStore((s) => s.session);
  const ready = useSessionStore((s) => s.ready);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [token, setToken] = useState('');
  // 상태는 다음 렌더에야 바뀌어, 빠른 연속 누르기를 막으려고 따로 잠급니다.
  const lock = useRef(false);
  const demo = !SUPABASE_ENABLED;

  if (!ready) return null;

  const run = async (key: string, task: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(key);
    setError(null);
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '요청을 처리하지 못했습니다.');
    } finally {
      lock.current = false;
      setBusy(null);
    }
  };

  // 실제로 개인정보를 받는 빌드에서만 처리방침을 보여 줍니다.
  const privacy = SUPABASE_ENABLED ? (
    <Pressable role="link" style={styles.link} onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}>
      <AppText variant="caption" style={styles.underline}>개인정보 처리방침</AppText>
    </Pressable>
  ) : null;

  if (!session) {
    return (
      <View style={styles.body}>
        <AppText tone="muted">
          {demo
            ? '데모 모드입니다. 아래 버튼은 실제 서비스에 로그인하지 않고 데모 사용자로 들어가며, 보관함은 이 기기에만 저장됩니다.'
            : '로그인하면 좋아요, 최근 재생, 플레이리스트를 다른 기기와 맞출 수 있습니다. 로그인하지 않아도 모든 기능을 쓸 수 있습니다.'}
        </AppText>
        <View style={styles.buttons}>
          {BRANDS.map((brand) => {
            const label = demo ? `${brand.label} (데모)` : brand.label;
            return (
              <Pressable
                key={brand.provider}
                role="button"
                aria-label={label}
                disabled={busy !== null}
                aria-disabled={busy !== null || undefined}
                onPress={() => void run(brand.provider, () => signIn(brand.provider))}
                style={({ pressed }) => [styles.brand, { backgroundColor: brand.bg, borderColor: brand.border ?? brand.bg }, pressed && styles.pressed, busy !== null && busy !== brand.provider && styles.dim]}
              >
                <Icon aria-hidden name={brand.icon} size={18} color={brand.fg} />
                <Text style={[styles.brandLabel, { color: brand.fg }]}>{busy === brand.provider ? '로그인 중…' : label}</Text>
              </Pressable>
            );
          })}
        </View>
        {demo && (
          <>
            <Pressable role="button" aria-label="소유자 로그인" aria-expanded={ownerOpen} onPress={() => setOwnerOpen(!ownerOpen)} style={styles.link}>
              <View style={styles.inline}>
                <AppText variant="caption" style={styles.underline}>소유자 로그인</AppText>
                <Icon aria-hidden name={ownerOpen ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.text} />
              </View>
            </Pressable>
            {ownerOpen && (
              <View style={styles.owner}>
                <AppText variant="caption" tone="muted">{OWNER_GITHUB_LOGIN} 계정의 GitHub 토큰으로만 들어갈 수 있습니다. 보관함은 그 계정의 비공개 Gist에 저장되어 다른 기기와 맞춰집니다. 토큰은 Gist 읽기·쓰기 권한만 주세요.</AppText>
                <AppText variant="label" nativeID="owner-token-label">GitHub 토큰</AppText>
                <TextInput
                  aria-labelledby="owner-token-label"
                  value={token}
                  onChangeText={setToken}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  onSubmitEditing={() => void run('owner', async () => { await signInOwner(token); setToken(''); })}
                  style={styles.input}
                />
                <View style={styles.row}>
                  <AppButton label={busy === 'owner' ? '확인 중…' : '소유자로 로그인'} disabled={busy !== null} onPress={() => void run('owner', async () => { await signInOwner(token); setToken(''); })} />
                  <Pressable role="link" style={styles.link} onPress={() => void Linking.openURL(TOKEN_HELP_URL)}>
                    <AppText variant="caption" style={styles.underline}>토큰 만들기</AppText>
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}
        {error ? <AppText tone="danger" role="alert">로그인하지 못했습니다. {error}</AppText> : null}
        {privacy}
      </View>
    );
  }

  const providerName = PROVIDER_NAME[session.provider] ?? session.provider;
  const description =
    session.kind === 'owner' ? `${session.name} · GitHub 소유자 계정으로 로그인했습니다.` : session.kind === 'demo' ? `${session.name} · ${providerName} 데모 로그인 중입니다.` : `${session.name} · ${providerName} 계정으로 로그인했습니다.`;
  return (
    <View style={styles.body}>
      <AppText>{description}</AppText>
      {children}
      <View style={styles.row}>
        <AppButton variant="secondary" label={busy === 'out' ? '로그아웃 중…' : '로그아웃'} disabled={busy !== null} onPress={() => void run('out', async () => { await signOut(session.kind); onSignedOut?.(); })} />
        {session.kind === 'supabase' && <AppButton variant="secondary" label="계정 삭제" disabled={busy !== null} onPress={() => setConfirming(true)} />}
      </View>
      {error ? <AppText tone="danger" role="alert">{error}</AppText> : null}
      {privacy}
      <ConfirmDialog
        visible={confirming}
        title="계정을 삭제할까요?"
        description="계정과 서버에 저장한 보관함이 지워지고 되돌릴 수 없습니다. 이 기기의 보관함은 그대로 남습니다."
        confirmLabel="삭제"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          void run('delete', async () => { await deleteAccount(); onSignedOut?.(); });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  body: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
  buttons: { gap: theme.spacing.sm, maxWidth: 360 },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, minHeight: 48, paddingHorizontal: theme.spacing.lg, borderWidth: 1, borderRadius: 6 },
  brandLabel: { fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.8 },
  dim: { opacity: 0.5 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  owner: { gap: theme.spacing.sm, maxWidth: 480, paddingTop: theme.spacing.xs },
  input: { minHeight: 44, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.rule, color: theme.colors.text, backgroundColor: theme.colors.panel, fontSize: 15 },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  underline: { textDecorationLine: 'underline' },
}));
