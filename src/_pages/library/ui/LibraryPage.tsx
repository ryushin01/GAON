import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { deleteLocalFile, useLibraryStore, useLocalTracks } from '@/entities/library';
import type { Track } from '@/entities/music';
import { usePlaylistNameField } from '@/features/create-playlist';
import { ImportFlacButton } from '@/features/import-local';
import { forgetTrack } from '@/features/player';
import { removeOffline, SaveOfflineButton } from '@/features/save-offline';
import { formatFileSize } from '@/shared/lib';
import { AppButton, AppText, Chip, ConfirmDialog, FieldError, IconButton, Screen, ScreenHeader, StateView } from '@/shared/ui';
import { TrackList, useTrackLookup } from '@/widgets/track-list';

type Tab = 'liked' | 'recent' | 'playlists' | 'local' | 'offline';
const TABS: { id: Tab; label: string }[] = [
  { id: 'liked', label: '좋아요' },
  { id: 'recent', label: '최근 재생' },
  { id: 'playlists', label: '플레이리스트' },
  { id: 'local', label: '내 FLAC' },
  { id: 'offline', label: '오프라인' },
];

const EMPTY: Record<Exclude<Tab, 'playlists'>, { title: string; description: string }> = {
  liked: { title: '좋아요한 곡이 없습니다', description: '곡 목록에서 마음에 드는 곡을 찾아보세요.' },
  recent: { title: '최근 들은 곡이 없습니다', description: '곡 목록에서 마음에 드는 곡을 찾아보세요.' },
  local: { title: '가져온 FLAC이 없습니다', description: '위 버튼으로 기기에 있는 FLAC 파일을 가져오세요.' },
  offline: { title: '오프라인으로 저장한 곡이 없습니다', description: '좋아요 탭이나 플레이리스트에서 오프라인 저장을 누르면 인터넷 없이 들을 수 있습니다.' },
};

function Playlists() {
  const playlists = useLibraryStore((s) => s.playlists);
  const field = usePlaylistNameField();
  const create = () => {
    field.create();
  };
  return (
    <View style={styles.pane}>
      <AppText variant="label" tone="muted" aria-hidden>새 플레이리스트 이름</AppText>
      <View style={styles.form}>
        <TextInput aria-label="새 플레이리스트 이름" {...field.inputProps} onSubmitEditing={create} style={styles.input} />
        <AppButton label="만들기" onPress={create} />
      </View>
      <FieldError id={field.errorId} message={field.error} />
      <View role="list">
        {playlists.map((p) => (
          <View role="listitem" key={p.id}>
            <Pressable role="link" style={styles.playlist} onPress={() => router.push(`/playlist/${p.id}`)}>
              <AppText variant="subheading" numberOfLines={1} style={styles.flex}>{p.name}</AppText>
              <AppText variant="caption" tone="muted">{p.trackIds.length}곡</AppText>
            </Pressable>
          </View>
        ))}
      </View>
      {!playlists.length && <StateView title="플레이리스트가 없습니다" description="이름을 입력해 첫 플레이리스트를 만들어 보세요." />}
    </View>
  );
}

function deleteLocal(track: Track) {
  useLibraryStore.getState().removeLocalTrack(track.id);
  // 재생 목록에서 먼저 빼고(올리던 큐가 있으면 그 뒤에), 빠진 뒤에 파일을 지웁니다.
  void forgetTrack(track.id).then(() => deleteLocalFile(track.id));
}

export function LibraryPage() {
  const [tab, setTab] = useState<Tab>('liked');
  const likedIds = useLibraryStore((s) => s.likedIds);
  const recentIds = useLibraryStore((s) => s.recentIds);
  const offlineTracks = useLibraryStore((s) => s.offlineTracks);
  const local = useLocalTracks();
  const { resolve } = useTrackLookup();
  const [deleting, setDeleting] = useState<Track | null>(null);
  const [clearingOffline, setClearingOffline] = useState(false);

  const tracks = useMemo(() => {
    if (tab === 'liked') return resolve(likedIds);
    if (tab === 'recent') return resolve(recentIds);
    if (tab === 'offline') return resolve(offlineTracks.map((t) => t.id));
    return tab === 'local' ? local : [];
  }, [tab, likedIds, recentIds, offlineTracks, local, resolve]);
  const offlineBytes = useMemo(() => offlineTracks.reduce((sum, t) => sum + (t.fileSize ?? 0), 0), [offlineTracks]);

  const tabs = (
    <View>
      <ScreenHeader eyebrow="GAON / ARCHIVE" title="보관함" trailing={<IconButton icon="settings-outline" label="설정" onPress={() => router.push('/settings')} />} />
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Chip key={t.id} label={t.label} selected={t.id === tab} onPress={() => setTab(t.id)} />
        ))}
      </View>
      {tab === 'local' && (
        <View style={styles.pane}>
          <ImportFlacButton />
          <AppText variant="caption" tone="muted">가져온 곡은 앱 안에 저장되어 인터넷 없이도 재생할 수 있습니다.</AppText>
        </View>
      )}
      {tab === 'liked' && <SaveOfflineButton tracks={tracks} style={styles.pane} />}
      {tab === 'offline' && offlineTracks.length > 0 && (
        <View style={styles.pane}>
          <AppText variant="caption" tone="muted">{`인터넷 없이 들을 수 있도록 기기에 저장한 곡입니다. ${offlineTracks.length}곡 · ${formatFileSize(offlineBytes)}`}</AppText>
          <View style={styles.actions}>
            <AppButton label="모두 삭제" variant="secondary" onPress={() => setClearingOffline(true)} />
          </View>
        </View>
      )}
    </View>
  );

  return (
    <Screen scroll={false}>
      {tab === 'playlists' ? (
        <View style={styles.flex}>
          {tabs}
          <Playlists />
        </View>
      ) : (
        <TrackList
          key={tab}
          tracks={tracks}
          header={tabs}
          extraActions={tab === 'local' ? (t) => [{ label: '보관함에서 삭제', onPress: () => setDeleting(t) }] : undefined}
          empty={<StateView {...EMPTY[tab]} />}
        />
      )}
      <ConfirmDialog
        visible={deleting != null}
        title={`${deleting?.title ?? ''} 삭제`}
        description="앱에 저장한 파일을 지웁니다. 기기에 있는 원본 파일은 그대로 남습니다."
        confirmLabel="삭제"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteLocal(deleting);
          setDeleting(null);
        }}
      />
      <ConfirmDialog
        visible={clearingOffline}
        title="오프라인 저장 모두 삭제"
        description="기기에 저장한 곡 파일을 모두 지웁니다. 인터넷에 연결되어 있으면 지운 곡도 계속 스트리밍으로 들을 수 있습니다."
        confirmLabel="삭제"
        onCancel={() => setClearingOffline(false)}
        onConfirm={() => {
          setClearingOffline(false);
          void removeOffline(offlineTracks.map((t) => t.id));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
  pane: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  actions: { flexDirection: 'row' },
  form: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  input: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: theme.spacing.md, fontSize: 16, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.rule, backgroundColor: theme.colors.panel },
  playlist: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 52, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
}));
