import type { ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AppText } from './AppText';

type Props = { label: string; children: ReactNode };

/** 가는 선 위에 고정폭 항목 이름과 값을 양 끝으로 놓는 정보 행입니다. */
export function MetaRow({ label, children }: Props) {
  return (
    <View style={styles.row}>
      <AppText variant="label" tone="muted" style={styles.label}>{label}</AppText>
      <View style={styles.value}>
        {typeof children === 'string' ? <AppText style={styles.text}>{children}</AppText> : children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.lg, paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  label: { paddingTop: 3, flexShrink: 0 },
  value: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  text: { textAlign: 'right' },
}));
