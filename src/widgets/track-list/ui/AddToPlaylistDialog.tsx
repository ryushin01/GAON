import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useLibraryStore } from '@/entities/library';
import { usePlaylistNameField } from '@/features/create-playlist';
import { AppButton, AppText, FieldError, IconButton, VisuallyHidden } from '@/shared/ui';

type Props = { visible: boolean; trackIds: string[]; onClose: (added: boolean) => void };

/**
 * 창의 내용입니다. Modal은 닫혀 있으면 내용을 그리지 않으므로, 곡 목록의 행마다 이 창이 있어도
 * 보관함 구독과 입력 상태는 연 창 하나에만 생깁니다(닫힐 때의 흐려지는 효과는 그대로).
 */
function DialogBody({ trackIds, onClose }: Omit<Props, 'visible'>) {
  const { theme } = useUnistyles();
  const playlists = useLibraryStore((s) => s.playlists);
  const addToPlaylist = useLibraryStore((s) => s.addToPlaylist);
  const field = usePlaylistNameField();

  const close = (added: boolean) => {
    field.reset();
    onClose(added);
  };
  const create = () => {
    if (field.create(trackIds)) close(true);
  };

  return (
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
          {...field.inputProps}
          onSubmitEditing={create}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />
        <FieldError id={field.errorId} message={field.error} />
        <AppButton label="새로 만들어 담기" icon="add" onPress={create} />
      </View>
    </View>
  );
}

export function AddToPlaylistDialog({ visible, trackIds, onClose }: Props) {
  return (
    <Modal aria-label="플레이리스트에 담기" visible={visible} transparent animationType="fade" onRequestClose={() => onClose(false)}>
      <DialogBody trackIds={trackIds} onClose={onClose} />
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, backgroundColor: 'rgba(10, 10, 10, 0.55)' },
  sheet: { width: '100%', maxWidth: 420, maxHeight: '85%', gap: theme.spacing.md, padding: theme.spacing.lg, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border },
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
