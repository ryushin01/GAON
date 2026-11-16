import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { displayTitle, type Track } from '@/entities/music';
import { AddToPlaylistDialog } from './AddToPlaylistDialog';
import { addToQueue } from '@/features/player';
import { offlineMenuItem } from '@/features/save-offline';
import { LikeButton } from '@/features/toggle-like';
import { AppText, IconButton } from '@/shared/ui';

type Props = { track: Track; extra?: { label: string; onPress: () => void }[] };

export function TrackActions({ track, extra = [] }: Props) {
  const { theme } = useUnistyles();
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState(false);
  // 저장 상태는 메뉴를 열 때 구합니다. 항목을 고르면 메뉴가 닫혀 그 사이 바뀌어도 다시 구할 필요가 없습니다.
  const [offline, setOffline] = useState<ReturnType<typeof offlineMenuItem>>(null);
  const title = displayTitle(track);
  const openMenu = () => {
    setOffline(offlineMenuItem(track));
    setMenu(true);
  };

  const items: { label: string; onPress: () => void }[] = [
    { label: '다음에 듣기 목록에 추가', onPress: () => void addToQueue([track]) },
    { label: '플레이리스트에 담기', onPress: () => setDialog(true) },
    ...(offline ? [offline] : []),
    { label: '곡 정보', onPress: () => router.push(`/track/${track.id}`) },
    ...(track.albumId ? [{ label: '앨범으로 이동', onPress: () => router.push(`/album/${track.albumId}`) }] : []),
    ...(track.source === 'stream' ? [{ label: '가수 정보', onPress: () => router.push(`/artist/${encodeURIComponent(track.artists[0])}`) }] : []),
    ...extra,
  ];

  return (
    <View style={styles.row}>
      <LikeButton trackId={track.id} title={title} />
      <IconButton icon="ellipsis-vertical" label={`${title} 더보기`} size={20} color={theme.colors.textMuted} onPress={openMenu} />
      <Modal aria-label={`${title} 메뉴`} visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <View style={styles.backdrop}>
          <View style={styles.menu}>
            <AppText variant="subheading" numberOfLines={1} style={styles.menuTitle}>{title}</AppText>
            {items.map((item) => (
              <Pressable
                key={item.label}
                role="button"
                style={styles.item}
                onPress={() => {
                  setMenu(false);
                  item.onPress();
                }}
              >
                <AppText>{item.label}</AppText>
              </Pressable>
            ))}
            <Pressable role="button" style={styles.item} onPress={() => setMenu(false)}>
              <AppText tone="muted">닫기</AppText>
            </Pressable>
          </View>
        </View>
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
