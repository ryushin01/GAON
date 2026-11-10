import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { describeUser, useSessionStore } from '@/entities/session';
import { supabase } from '@/shared/api';
import { PRIVACY_POLICY_URL } from '@/shared/config';
import { AppButton, AppText, ConfirmDialog } from '@/shared/ui';

import { deleteAccount, signIn, signOut, type SocialProvider } from '../model/signIn';

type Brand = { provider: SocialProvider; label: string; icon: ComponentProps<typeof Ionicons>['name']; bg: string; fg: string; border?: string };

/** 각 서비스의 로그인 버튼 색입니다. 테마와 상관없이 그대로 씁니다. */
const BRANDS: Brand[] = [
  { provider: 'kakao', label: '카카오 로그인', icon: 'chatbubble', bg: '#FEE500', fg: 'rgba(0, 0, 0, 0.85)' },
  { provider: 'google', label: 'Google로 로그인', icon: 'logo-google', bg: '#FFFFFF', fg: '#1F1F1F', border: '#747775' },
  { provider: 'github', label: 'GitHub로 로그인', icon: 'logo-github', bg: '#24292F', fg: '#FFFFFF', border: '#8C959F' },
];

const PROVIDER_NAME: Record<string, string> = { kakao: '카카오', google: 'Google', github: 'GitHub' };

type Props = {
  /** 로그아웃하거나 계정을 지운 뒤 부릅니다. */
  onSignedOut?: () => void;
  /** 로그인한 동안 아래에 보여 줄 내용입니다. */
  children?: React.ReactNode;
};

/** 설정의 계정 구역입니다. 로그인을 설정하지 않은 빌드에서는 그리지 않습니다. */
export function AccountSection({ onSignedOut, children }: Props) {
  const session = useSessionStore((s) => s.session);
  const ready = useSessionStore((s) => s.ready);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  // 상태는 다음 렌더에야 바뀌어, 빠른 연속 누르기를 막으려고 따로 잠급니다.
  const lock = useRef(false);

  if (!supabase || !ready) return null;

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

  const privacy = (
    <Pressable role="link" style={styles.link} onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}>
      <AppText variant="caption" style={styles.underline}>개인정보 처리방침</AppText>
    </Pressable>
  );

  if (!session) {
    return (
      <View style={styles.body}>
        <AppText tone="muted">로그인하면 좋아요, 최근 재생, 플레이리스트를 다른 기기와 맞출 수 있습니다. 로그인하지 않아도 모든 기능을 쓸 수 있습니다.</AppText>
        <View style={styles.buttons}>
          {BRANDS.map((brand) => (
            <Pressable
              key={brand.provider}
              role="button"
              aria-label={brand.label}
              disabled={busy !== null}
              aria-disabled={busy !== null || undefined}
              onPress={() => void run(brand.provider, () => signIn(brand.provider))}
              style={({ pressed }) => [styles.brand, { backgroundColor: brand.bg, borderColor: brand.border ?? brand.bg }, pressed && styles.pressed, busy !== null && busy !== brand.provider && styles.dim]}
            >
              <Ionicons aria-hidden name={brand.icon} size={18} color={brand.fg} />
              <Text style={[styles.brandLabel, { color: brand.fg }]}>{busy === brand.provider ? '로그인 중…' : brand.label}</Text>
            </Pressable>
          ))}
        </View>
        {error ? <AppText tone="danger" role="alert">로그인하지 못했습니다. {error}</AppText> : null}
        {privacy}
      </View>
    );
  }

  const { name, provider } = describeUser(session);
  return (
    <View style={styles.body}>
      <AppText>{name} · {PROVIDER_NAME[provider] ?? provider} 계정으로 로그인했습니다.</AppText>
      {children}
      <View style={styles.row}>
        <AppButton variant="secondary" label={busy === 'out' ? '로그아웃 중…' : '로그아웃'} disabled={busy !== null} onPress={() => void run('out', async () => { await signOut(); onSignedOut?.(); })} />
        <AppButton variant="secondary" label="계정 삭제" disabled={busy !== null} onPress={() => setConfirming(true)} />
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  underline: { textDecorationLine: 'underline' },
}));
