import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AlbumCard, useCatalog } from '@/entities/music';
import { AppText, Screen, ScreenHeader, Section, StateView } from '@/shared/ui';
import { TrackList } from '@/widgets/track-list';

export function ArtistPage() {
  const params = useLocalSearchParams<{ name: string }>();
  const name = decodeURIComponent(params.name ?? '');
  const { data: catalog, isPending } = useCatalog();
  const artist = catalog?.artists.find((a) => a.name === name);
  const albums = useMemo(() => catalog?.albums.filter((a) => a.artists.includes(name)) ?? [], [catalog, name]);
  // 참여한 곡도 함께 보여 줍니다.
  const tracks = useMemo(
    () => catalog?.tracks.filter((t) => t.artists.includes(name) || t.featuring.includes(name)) ?? [],
    [catalog, name],
  );

  if (isPending) return <Screen><StateView loading /></Screen>;
  if (!artist) {
    return (
      <Screen>
        <ScreenHeader title="가수" back />
        <StateView title="가수를 찾을 수 없습니다" />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <TrackList
        tracks={tracks}
        header={
          <View>
            <ScreenHeader title={artist.name} back />
            <AppText tone="muted" style={styles.role}>{artist.role}</AppText>
            <Section title="앨범">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.albums}>
                {albums.map((album) => (
                  <AlbumCard key={album.id} album={album} size={130} onPress={() => router.push(`/album/${album.id}`)} />
                ))}
              </ScrollView>
            </Section>
            <AppText variant="heading" role="heading" aria-level={2} style={styles.heading}>곡</AppText>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  role: { paddingHorizontal: theme.spacing.lg },
  albums: { gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg },
  heading: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl },
}));
