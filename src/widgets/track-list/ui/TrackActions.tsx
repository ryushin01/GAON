import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { displayTitle, type Track } from '@/entities/music';
import { AddToPlaylistDialog } from './AddToPlaylistDialog';
import { addToQueue } from '@/features/player';
import { useOfflineMenuItem } from '@/features/save-offline';
import { LikeButton } from '@/features/toggle-like';
import { AppText, IconButton } from '@/shared/ui';

type Item = { label: string; onPress: () => void };
type Props = { track: Track; extra?: Item[] };

/**
 * 열린 메뉴의 내용입니다. 메뉴를 연 동안만 그려, 오프라인 저장 상태를 곡 목록의 행마다 구독하지 않으면서도
 * 메뉴를 연 사이에 저장이 끝나면 항목이 바뀝니다.
 */
function TrackMenu({ track, title, items, onClose }: { track: Track; title: string; items: Item[]; onClose: () => void }) {
  const offline = useOfflineMenuItem(track);
  // 오프라인 저장 항목은 플레이리스트에 담기 바로 뒤에 둡니다.
  const all = offline ? [...items.slice(0, 2), offline, ...items.slice(2)] : items;
  return (
    <View style={styles.backdrop}>
      <View style={styles.menu}>
        <AppText variant="subheading" numberOfLines={1} style={styles.menuTitle}>{title}</AppText>
        {all.map((item) => (
          <Pressable
            key={item.label}
            role="button"
            style={styles.item}
            onPress={() => {
              onClose();
              item.onPress();
            }}
          >
            <AppText>{item.label}</AppText>
          </Pressable>
        ))}
        <Pressable role="button" style={styles.item} onPress={onClose}>
          <AppText tone="muted">닫기</AppText>
        </Pressable>
      </View>
    </View>
  );
}

export function TrackActions({ track, extra = [] }: Props) {
  const { theme } = useUnistyles();
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState(false);
  const title = displayTitle(track);

  const items: Item[] = [
    { label: '다음에 듣기 목록에 추가', onPress: () => void addToQueue([track]) },
    { label: '플레이리스트에 담기', onPress: () => setDialog(true) },
    { label: '곡 정보', onPress: () => router.push(`/track/${track.id}`) },
    ...(track.albumId ? [{ label: '앨범으로 이동', onPress: () => router.push(`/album/${track.albumId}`) }] : []),
    ...(track.source === 'stream' ? [{ label: '가수 정보', onPress: () => router.push(`/artist/${encodeURIComponent(track.artists[0])}`) }] : []),
    ...extra,
  ];

  return (
    <View style={styles.row}>
      <LikeButton trackId={track.id} title={title} />
      <IconButton icon="ellipsis-vertical" label={`${title} 더보기`} size={20} color={theme.colors.textMuted} onPress={() => setMenu(true)} />
      <Modal aria-label={`${title} 메뉴`} visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <TrackMenu track={track} title={title} items={items} onClose={() => setMenu(false)} />
      </Modal>
      <AddToPlaylistDialog visible={dialog} trackIds={[track.id]} onClose={() => setDialog(false)} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center' },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, backgroundColor: 'rgba(10, 10, 10, 0.55)' },
  menu: { width: '100%', maxWidth: 360, padding: theme.spacing.sm, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border },
  menuTitle: { padding: theme.spacing.md },
  item: { minHeight: 48, justifyContent: 'center', paddingHorizontal: theme.spacing.md },
}));
