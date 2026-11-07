import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useCatalog, type Track } from '@/entities/music';
import { formatDate } from '@/shared/lib';
import { AlbumArt, AppText, Screen, ScreenHeader, StateView } from '@/shared/ui';
import { TrackList } from '@/widgets/track-list';

export function AlbumPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: catalog, isPending } = useCatalog();
  const album = catalog?.albumsById.get(id);
  const tracks = useMemo(
    () => (album ? album.trackIds.map((t) => catalog?.tracksById.get(t)).filter((t): t is Track => Boolean(t)) : []),
    [album, catalog],
  );

  if (isPending) return <Screen><StateView loading /></Screen>;
  if (!album) {
    return (
      <Screen>
        <ScreenHeader title="앨범" back />
        <StateView title="앨범을 찾을 수 없습니다" />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <TrackList
        tracks={tracks}
        header={
          <View>
            <ScreenHeader title={album.title} back />
            <View style={styles.info}>
              <View style={styles.art}>
                <AlbumArt uri={album.artUri} label={`${album.title} 앨범 아트`} />
              </View>
              <View style={styles.text}>
                <AppText variant="caption" tone="primary">{album.albumType}</AppText>
                {album.artists.map((name) => (
                  <Pressable key={name} role="link" style={styles.artist} onPress={() => router.push(`/artist/${encodeURIComponent(name)}`)}>
                    <AppText variant="subheading">{name}</AppText>
                  </Pressable>
                ))}
                <AppText variant="caption" tone="muted">발매일 {formatDate(album.released)}</AppText>
                <AppText variant="caption" tone="muted">장르 {album.genre}</AppText>
                <AppText variant="caption" tone="muted">기획사 {album.agency}</AppText>
              </View>
            </View>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  info: { flexDirection: 'row', gap: theme.spacing.lg, padding: theme.spacing.lg },
  art: { width: 140, flexShrink: 0 },
  text: { flex: 1, minWidth: 0, gap: 2, justifyContent: 'center' },
  artist: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
}));
