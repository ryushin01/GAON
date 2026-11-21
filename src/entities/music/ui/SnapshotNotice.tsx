import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AppText, LiveRegion } from '@/shared/ui';

import { useCatalog } from '../api/catalog';

/**
 * 공개 미디어에 닿지 못해 앱에 든 데모 카탈로그를 보여 줄 때 화면 위에 알립니다.
 * 알림 영역은 처음부터 두고 내용만 바꿉니다(LiveRegion).
 */
export function SnapshotNotice() {
  const { data: catalog } = useCatalog();
  return (
    <LiveRegion role="status" style={styles.root}>
      {catalog?.snapshot ? (
        <View style={styles.row}>
          <AppText variant="label" style={styles.tag}>오프라인 데모</AppText>
          <AppText variant="caption" style={styles.text}>
            서버에 연결하지 못해 앱에 든 목록을 보여 줍니다. 인터넷 없이는 &lsquo;빛 (The Light)&rsquo;의 1·2번 곡만 재생됩니다.
          </AppText>
        </View>
      ) : null}
    </LiveRegion>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: theme.spacing.sm, rowGap: 2 },
  tag: { color: theme.colors.text },
  text: { color: theme.colors.text, flexShrink: 1 },
}));
