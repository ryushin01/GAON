import { useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useLibraryStore } from '@/entities/library';
import { AppButton, AppText, IconButton, VisuallyHidden } from '@/shared/ui';

type Props = { visible: boolean; trackIds: string[]; onClose: (added: boolean) => void };

export function AddToPlaylistDialog({ visible, trackIds, onClose }: Props) {
  const { theme } = useUnistyles();
  const playlists = useLibraryStore((s) => s.playlists);
  const addToPlaylist = useLibraryStore((s) => s.addToPlaylist);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const close = (added: boolean) => {
    setName('');
    setError('');
    onClose(added);
  };
  const create = () => {
    if (!name.trim()) {
      setError('플레이리스트 이름을 입력해 주세요.');
      return;
    }
    createPlaylist(name.trim(), trackIds);
    close(true);
  };

  return (
    <Modal aria-label="플레이리스트에 담기" visible={visible} transparent animationType="fade" onRequestClose={() => close(false)}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <AppText variant="heading" role="heading" aria-level={2} style={styles.flex}>
              {trackIds.length}곡 담기
            </AppText>
            <IconButton icon="close" label="닫기" onPress={() => close(false)} />
          </View>
          <ScrollView style={styles.list}>
            {playlists.map((p) => (
              <Pressable
                key={p.id}
                role="button"
                style={styles.item}
                onPress={() => {
                  addToPlaylist(p.id, trackIds);
                  close(true);
                }}
              >
                <AppText variant="subheading" numberOfLines={1} style={styles.flex}>{p.name}</AppText>
                <AppText variant="caption" tone="muted">{p.trackIds.length}곡</AppText>
                <VisuallyHidden>담기</VisuallyHidden>
              </Pressable>
            ))}
            {!playlists.length && <AppText tone="muted">아직 플레이리스트가 없습니다. 아래에서 새로 만들어 보세요.</AppText>}
          </ScrollView>
          <AppText variant="caption">새 플레이리스트 이름</AppText>
          <TextInput
            aria-label="새 플레이리스트 이름"
            aria-invalid={Boolean(error)}
            value={name}
            onChangeText={(v) => {
              setName(v);
              if (error) setError('');
            }}
            onSubmitEditing={create}
            maxLength={40}
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
          />
          {error ? <AppText variant="caption" tone="danger" role="alert">{error}</AppText> : null}
          <AppButton label="새로 만들어 담기" icon="add" onPress={create} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, backgroundColor: 'rgba(3, 12, 30, 0.6)' },
  sheet: { width: '100%', maxWidth: 420, maxHeight: '85%', gap: theme.spacing.md, padding: theme.spacing.lg, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  header: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  list: { flexGrow: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 48 },
  input: {
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.textMuted,
    borderRadius: theme.radius.md,
  },
}));
