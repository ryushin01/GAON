import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AppText } from './AppText';
import { IconButton } from './IconButton';

type Props = { title: string; back?: boolean; trailing?: ReactNode };

export function ScreenHeader({ title, back = false, trailing }: Props) {
  return (
    <View style={styles.root}>
      {back && <IconButton icon="chevron-back" label="뒤로" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />}
      <AppText variant="title" role="heading" aria-level={1} numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: 56, paddingHorizontal: theme.spacing.lg },
  title: { flex: 1 },
}));
