import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { deleteLocalFile, useLibraryStore, useLocalTracks } from '@/entities/library';
import type { Track } from '@/entities/music';
import { ImportFlacButton } from '@/features/import-local';
import { removeFromQueue } from '@/features/player';
import { AppButton, AppText, Chip, ConfirmDialog, IconButton, Screen, ScreenHeader, StateView } from '@/shared/ui';
import { TrackList, useTrackLookup } from '@/widgets/track-list';

type Tab = 'liked' | 'recent' | 'playlists' | 'local';
const TABS: { id: Tab; label: string }[] = [
  { id: 'liked', label: '좋아요' },
  { id: 'recent', label: '최근 재생' },
  { id: 'playlists', label: '플레이리스트' },
  { id: 'local', label: '내 FLAC' },
];

function Playlists() {
  const playlists = useLibraryStore((s) => s.playlists);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const create = () => {
    if (!name.trim()) {
      setError('플레이리스트 이름을 입력해 주세요.');
      return;
    }
    createPlaylist(name.trim());
    setName('');
    setError('');
  };
  return (
    <View style={styles.pane}>
      <AppText variant="label" tone="muted" aria-hidden>새 플레이리스트 이름</AppText>
      <View style={styles.form}>
        <TextInput
          aria-label="새 플레이리스트 이름"
          aria-invalid={Boolean(error)}
          value={name}
          maxLength={40}
          onChangeText={(v) => {
            setName(v);
            if (error) setError('');
          }}
          onSubmitEditing={create}
          style={styles.input}
        />
        <AppButton label="만들기" onPress={create} />
      </View>
      {error ? <AppText variant="caption" tone="danger" role="alert">{error}</AppText> : null}
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
  removeFromQueue(track.id);
  useLibraryStore.getState().removeLocalTrack(track.id);
  void deleteLocalFile(track.id);
}

export function LibraryPage() {
  const [tab, setTab] = useState<Tab>('liked');
  const likedIds = useLibraryStore((s) => s.likedIds);
  const recentIds = useLibraryStore((s) => s.recentIds);
  const local = useLocalTracks();
  const { resolve } = useTrackLookup();
  const [deleting, setDeleting] = useState<Track | null>(null);

  const tracks = useMemo(() => {
    if (tab === 'liked') return resolve(likedIds);
    if (tab === 'recent') return resolve(recentIds);
    return tab === 'local' ? local : [];
  }, [tab, likedIds, recentIds, local, resolve]);

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
          empty={
            <StateView
              title={tab === 'liked' ? '좋아요한 곡이 없습니다' : tab === 'recent' ? '최근 들은 곡이 없습니다' : '가져온 FLAC이 없습니다'}
              description={tab === 'local' ? '위 버튼으로 기기에 있는 FLAC 파일을 가져오세요.' : '곡 목록에서 마음에 드는 곡을 찾아보세요.'}
            />
          }
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
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
  pane: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  form: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  input: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: theme.spacing.md, fontSize: 16, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.rule, backgroundColor: theme.colors.panel },
  playlist: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 52, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
}));
