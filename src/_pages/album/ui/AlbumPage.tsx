import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useCatalog, type Track } from '@/entities/music';
import { formatDate } from '@/shared/lib';
import { AppText, Disc, IconButton, MetaRow, Screen, ScreenHeader, StateView } from '@/shared/ui';
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
            <View style={styles.back}>
              <IconButton icon="chevron-back" label="뒤로" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
            </View>
            <AppText variant="label" tone="muted" style={styles.eyebrow}>{`GAON / ALBUM / ${album.albumType}`}</AppText>
            <AppText variant="display" role="heading" aria-level={1} style={styles.title}>{album.title}</AppText>
            <View style={styles.info}>
              <MetaRow label="가수">
                {album.artists.map((name) => (
                  <Pressable key={name} role="link" style={styles.artist} onPress={() => router.push(`/artist/${encodeURIComponent(name)}`)}>
                    <AppText>{name}</AppText>
                  </Pressable>
                ))}
              </MetaRow>
              <MetaRow label="유형">{album.albumType}</MetaRow>
              <MetaRow label="발매일">{formatDate(album.released)}</MetaRow>
              <MetaRow label="장르">{album.genre}</MetaRow>
              <MetaRow label="기획사">{album.agency}</MetaRow>
            </View>
            <View style={styles.art}>
              <Disc uri={album.discUri ?? album.artUri} label={`${album.title} 앨범 아트`} />
            </View>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  back: { flexDirection: 'row', paddingHorizontal: theme.spacing.sm },
  eyebrow: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm },
  title: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
  info: { paddingHorizontal: theme.spacing.lg },
  art: { width: '100%', maxWidth: 320, alignSelf: 'center', paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.xl },
  // 표 행 높이를 지키면서 누르는 영역은 44px 이상으로 둡니다.
  artist: { minHeight: 44, justifyContent: 'center', marginVertical: -11 },
}));
