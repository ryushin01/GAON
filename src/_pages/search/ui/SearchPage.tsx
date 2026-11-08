import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useLocalTracks } from '@/entities/library';
import { AlbumCard, matchesQuery, TrackRow, useCatalog } from '@/entities/music';
import { playTracks, useCurrentTrack } from '@/features/player';
import { AppText, IconButton, Rail, Screen, ScreenHeader, Section, StateView } from '@/shared/ui';
import { TrackActions } from '@/widgets/track-list';

const TRACK_LIMIT = 30;

export function SearchPage() {
  const { theme } = useUnistyles();
  const { data: catalog, isError } = useCatalog();
  const local = useLocalTracks();
  const current = useCurrentTrack();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const tracks = useMemo(
    () => (q ? [...local, ...(catalog?.tracks ?? [])].filter((t) => matchesQuery(t, q)) : []),
    [q, local, catalog],
  );
  const albums = useMemo(
    () => (q ? (catalog?.albums ?? []).filter((a) => [a.title, ...a.artists].some((v) => v.toLowerCase().includes(q))) : []),
    [q, catalog],
  );
  const artists = useMemo(
    () => (q ? (catalog?.artists ?? []).filter((a) => a.name.toLowerCase().includes(q)) : []),
    [q, catalog],
  );
  const nothing = q && !tracks.length && !albums.length && !artists.length;

  return (
    <Screen>
      <ScreenHeader title="검색" />
      <View style={styles.field}>
        <TextInput
          role="searchbox"
          aria-label="곡, 앨범, 가수 검색"
          placeholder="곡, 앨범, 가수, 작곡가"
          placeholderTextColor={theme.colors.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
          style={styles.input}
        />
        {query ? <IconButton icon="close-circle" label="검색어 지우기" size={20} color={theme.colors.textMuted} onPress={() => setQuery('')} /> : null}
      </View>

      {isError && <AppText tone="danger" role="alert" style={styles.notice}>카탈로그를 불러오지 못해 내 FLAC에서만 찾습니다.</AppText>}
      {!q && <StateView title="듣고 싶은 음악을 찾아보세요" description="예: 유신, 빛, 재즈" />}
      {nothing ? <StateView title="검색 결과가 없습니다" description="다른 검색어를 입력해 보세요." /> : null}

      {artists.length > 0 && (
        <Section title="가수">
          <Rail>
            {artists.map((artist) => (
              <Pressable
                key={artist.name}
                role="link"
                style={styles.artist}
                onPress={() => router.push(`/artist/${encodeURIComponent(artist.name)}`)}
              >
                <AppText variant="subheading">{artist.name}</AppText>
                <AppText variant="caption" tone="muted">{artist.role}</AppText>
              </Pressable>
            ))}
          </Rail>
        </Section>
      )}
      {albums.length > 0 && (
        <Section title="앨범">
          <Rail>
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} size={130} onPress={() => router.push(`/album/${album.id}`)} />
            ))}
          </Rail>
        </Section>
      )}
      {tracks.length > 0 && (
        <Section title={`곡 ${tracks.length}개`}>
          {tracks.length > TRACK_LIMIT && <AppText variant="caption" tone="muted" style={styles.limit}>앞의 {TRACK_LIMIT}곡만 보여 줍니다. 검색어를 더 자세히 입력해 보세요.</AppText>}
          <View role="list">
            {tracks.slice(0, TRACK_LIMIT).map((track) => (
              <TrackRow
                key={track.id}
                listItem
                track={track}
                active={current?.id === track.id}
                onPress={() => void playTracks(tracks, track.id)}
                trailing={<TrackActions track={track} />}
              />
            ))}
          </View>
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    paddingLeft: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.textMuted,
    borderRadius: theme.radius.md,
  },
  input: { flex: 1, minHeight: 44, fontSize: 16, color: theme.colors.text },
  notice: { padding: theme.spacing.lg },
  limit: { paddingHorizontal: theme.spacing.lg },
  artist: { minHeight: 44, minWidth: 120, justifyContent: 'center', padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface },
}));
