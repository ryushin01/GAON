import { FlatList, Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { artistLine, displayTitle } from '@/entities/music';
import { removeFromQueue, skipToIndex, usePlayerStore } from '@/features/player';
import { AlbumArt, AppText, IconButton, VisuallyHidden } from '@/shared/ui';

export function QueuePanel() {
  const { theme } = useUnistyles();
  const queue = usePlayerStore((s) => s.queue);
  const index = usePlayerStore((s) => s.index);

  return (
    <FlatList
      role="list"
      aria-label="재생 목록"
      data={queue}
      keyExtractor={(t) => t.id}
      renderItem={({ item, index: i }) => {
        const title = displayTitle(item);
        const current = i === index;
        return (
          <View role="listitem" style={[styles.row, current && styles.current]}>
            <Pressable
              role="button"
              aria-current={current || undefined}
              onPress={() => skipToIndex(i)}
              style={styles.main}
            >
              <AlbumArt uri={item.artUri} size={44} />
              <View style={styles.text}>
                <AppText variant="subheading" tone="onStage" numberOfLines={1}>{title}</AppText>
                <AppText variant="caption" tone="onStageMuted" numberOfLines={1}>{artistLine(item)}</AppText>
                <VisuallyHidden>재생</VisuallyHidden>
              </View>
            </Pressable>
            <IconButton icon="close" label={`${title} 목록에서 빼기`} size={20} color={theme.colors.stage.textMuted} onPress={() => removeFromQueue(item.id)} />
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: theme.radius.md },
  current: { backgroundColor: theme.colors.stage.surface },
  main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.sm },
  text: { flex: 1, minWidth: 0 },
}));
