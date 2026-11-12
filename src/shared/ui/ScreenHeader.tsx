import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AppText } from './AppText';
import { Cursor } from './Cursor';
import { IconButton } from './IconButton';

type Props = {
  title: string;
  back?: boolean;
  trailing?: ReactNode;
  /** 제목 위의 고정폭 머리말입니다. 지정하지 않으면 `GAON /`을 씁니다. */
  eyebrow?: string;
};

/** 화면 제목입니다. 고정폭 머리말 아래에 가는 큰 제목과 깜빡이는 커서를 둡니다. */
export function ScreenHeader({ title, back = false, trailing, eyebrow = 'GAON /' }: Props) {
  return (
    <View style={styles.root}>
      {back && <IconButton icon="chevron-back" label="뒤로" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />}
      <View style={styles.text}>
        <AppText variant="label" tone="muted" numberOfLines={1}>{eyebrow}</AppText>
        <View style={styles.titleRow}>
          <AppText variant="title" role="heading" aria-level={1} numberOfLines={1} style={styles.title}>
            {title}
          </AppText>
          <Cursor textStyle={titleCursor} />
        </View>
      </View>
      {trailing}
    </View>
  );
}

const titleCursor = { fontSize: 30, lineHeight: 36, fontWeight: '300' } as const;

const styles = StyleSheet.create((theme) => ({
  root: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: 72, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md },
  text: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  title: { flexShrink: 1 },
}));
