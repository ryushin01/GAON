import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AppText } from './AppText';

type Props = { title: string; actionLabel?: string; actionHint?: string; onAction?: () => void; children: ReactNode };

export function Section({ title, actionLabel, actionHint, onAction, children }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <AppText variant="title" role="heading" aria-level={2}>{title}</AppText>
        {actionLabel && (
          <Pressable role="link" aria-label={actionHint ?? actionLabel} onPress={onAction} style={styles.action}>
            <AppText tone="primary" variant="caption">{actionLabel}</AppText>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { marginTop: 48, gap: theme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginHorizontal: theme.spacing.lg, minHeight: 44, paddingBottom: theme.spacing.xs, borderBottomWidth: 1, borderBottomColor: theme.colors.rule },
  action: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
}));
