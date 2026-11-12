import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AlbumCard, useCatalog } from '@/entities/music';
import { AppText, Rail, Screen, ScreenHeader, Section, StateView } from '@/shared/ui';
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
            <ScreenHeader eyebrow="GAON / ARTIST" title={artist.name} back />
            <AppText tone="muted" style={styles.role}>{artist.role}</AppText>
            <Section eyebrow="DISCOGRAPHY" title="앨범">
              <Rail>
                {albums.map((album) => (
                  <AlbumCard key={album.id} album={album} size={130} onPress={() => router.push(`/album/${album.id}`)} />
                ))}
              </Rail>
            </Section>
            <View style={styles.headingRow}>
              <View aria-hidden style={styles.mark} />
              <AppText variant="heading" role="heading" aria-level={2}>곡</AppText>
            </View>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  role: { paddingHorizontal: theme.spacing.lg },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.xl, paddingBottom: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mark: { width: 8, height: 8, backgroundColor: theme.colors.text },
}));
