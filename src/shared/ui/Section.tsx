import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AppText } from './AppText';

type Props = {
  title: string;
  /** 제목 위에 작게 붙는 고정폭 머리말입니다. 예: `01 / CATALOG` */
  eyebrow?: string;
  actionLabel?: string;
  actionHint?: string;
  onAction?: () => void;
  children: ReactNode;
};

/** 관제 화면의 한 구역입니다. 네모 표시와 가는 선으로 머리를 나눕니다. */
export function Section({ title, eyebrow, actionLabel, actionHint, onAction, children }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.titleBox}>
          {eyebrow ? <AppText variant="label" tone="muted">{eyebrow}</AppText> : null}
          <View style={styles.titleRow}>
            <View aria-hidden style={styles.mark} />
            <AppText variant="heading" role="heading" aria-level={2} style={styles.title}>{title}</AppText>
          </View>
        </View>
        {actionLabel && (
          <Pressable role="link" aria-label={actionHint ?? actionLabel} onPress={onAction} style={styles.action}>
            <AppText variant="mono">{`${actionLabel} >`}</AppText>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { marginTop: 48, gap: theme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: theme.spacing.md, marginHorizontal: theme.spacing.lg, minHeight: 44, paddingBottom: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  titleBox: { flexShrink: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  mark: { width: 8, height: 8, backgroundColor: theme.colors.text },
  title: { flexShrink: 1 },
  action: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
}));
