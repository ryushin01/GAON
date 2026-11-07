import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';

import { useLibraryStore } from '@/entities/library';
import { AppButton, ConfirmDialog, Screen, ScreenHeader, StateView } from '@/shared/ui';
import { TrackList, useTrackLookup } from '@/widgets/track-list';

export function PlaylistPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playlist = useLibraryStore((s) => s.playlists.find((p) => p.id === id));
  const removeFromPlaylist = useLibraryStore((s) => s.removeFromPlaylist);
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist);
  const { resolve } = useTrackLookup();
  const [confirming, setConfirming] = useState(false);
  const tracks = useMemo(() => (playlist ? resolve(playlist.trackIds) : []), [playlist, resolve]);

  if (!playlist) {
    return (
      <Screen>
        <ScreenHeader title="플레이리스트" back />
        <StateView title="플레이리스트를 찾을 수 없습니다" />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <TrackList
        tracks={tracks}
        extraActions={(t) => [{ label: '플레이리스트에서 빼기', onPress: () => removeFromPlaylist(playlist.id, t.id) }]}
        header={
          <ScreenHeader
            title={playlist.name}
            back
            trailing={
              <AppButton
                label="삭제"
                variant="secondary"
                onPress={() => setConfirming(true)}
              />
            }
          />
        }
        empty={<StateView title="담은 곡이 없습니다" description="곡 메뉴의 '플레이리스트에 담기'로 추가해 보세요." />}
      />
      <ConfirmDialog
        visible={confirming}
        title={`${playlist.name} 삭제`}
        description="플레이리스트를 지웁니다. 담겨 있던 곡은 그대로 들을 수 있습니다."
        confirmLabel="삭제"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          deletePlaylist(playlist.id);
          router.back();
        }}
      />
    </Screen>
  );
}
