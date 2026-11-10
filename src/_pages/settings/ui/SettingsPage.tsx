import Constants from 'expo-constants';
import { Linking, Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ThemeSelector } from '@/features/change-theme';
import { OutputModeSelector } from '@/features/player';
import { forgetSync, SyncStatus } from '@/features/sync-library';
import { supabase } from '@/shared/api';
import { AppText, Screen, ScreenHeader, Section } from '@/shared/ui';

import { AccountSection } from './AccountSection';

const HELP_URL = 'https://github.com/ryushin01/GAON/issues';

export function SettingsPage() {
  return (
    <Screen>
      <ScreenHeader title="설정" back />
      {supabase && (
        <Section title="계정">
          <AccountSection onSignedOut={forgetSync}>
            <SyncStatus />
          </AccountSection>
        </Section>
      )}
      <Section title="화면 테마">
        <View style={styles.body}>
          <ThemeSelector />
        </View>
      </Section>
      <Section title="음질 안내">
        <View style={styles.body}>
          <AppText tone="muted">가져온 FLAC은 변환 없이 그대로 저장하고, 재생할 때 손실 없이 복원합니다.</AppText>
          <AppText variant="caption" tone="muted">기본 출력에서는 소리가 나오는 마지막 단계를 기기가 처리합니다. 파일의 샘플레이트가 기기 출력 설정보다 높으면 기기가 낮춰서 내보낼 수 있고, 블루투스로 들으면 전송할 때 다시 압축될 수 있습니다.</AppText>
          <OutputModeSelector />
        </View>
      </Section>
      <Section title="도움말">
        <View style={styles.body}>
          <AppText tone="muted">문제가 있거나 제안할 내용이 있으면 알려 주세요.</AppText>
          <Pressable role="link" style={styles.link} onPress={() => void Linking.openURL(HELP_URL)}>
            <AppText tone="primary">GitHub 이슈에 문의하기</AppText>
          </Pressable>
        </View>
      </Section>
      <Section title="앱 정보">
        <View style={styles.body}>
          <AppText tone="muted">버전 {Constants.expoConfig?.version}</AppText>
          <AppText variant="caption" tone="muted">가수, 앨범, 가사, 순위는 모두 가상 데이터이고, 음원과 앨범 아트는 코드로 합성했습니다.</AppText>
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  body: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
}));
