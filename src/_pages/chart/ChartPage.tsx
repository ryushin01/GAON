import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { chartTracks, genresOf, useCatalog } from '@/entities/music';
import { AppText, Chip, Screen, ScreenHeader, StateView } from '@/shared/ui';
import { TrackList } from '@/widgets/track-list';

const ALL = '전체';

export function ChartPage() {
  const { data: catalog, isPending, isError, refetch } = useCatalog();
  const [genre, setGenre] = useState(ALL);
  const chart = useMemo(() => (catalog ? chartTracks(catalog, 100) : []), [catalog]);
  const genres = useMemo(() => [ALL, ...genresOf(chart)], [chart]);
  const tracks = useMemo(() => (genre === ALL ? chart : chart.filter((t) => t.genre === genre)), [chart, genre]);

  return (
    <Screen scroll={false}>
      {isPending && <StateView loading />}
      {isError && <StateView title="차트를 불러오지 못했습니다" description="인터넷 연결을 확인해 주세요." actionLabel="다시 시도" onAction={() => void refetch()} />}
      {catalog && (
        <TrackList
          tracks={tracks}
          showRank
          header={
            <View>
              <ScreenHeader title="TOP 100" />
              <AppText variant="caption" tone="muted" style={styles.note}>모든 순위와 변동은 데모용 가상 데이터입니다.</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {genres.map((g) => (
                  <Chip key={g} label={g} selected={g === genre} onPress={() => setGenre(g)} />
                ))}
              </ScrollView>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  note: { paddingHorizontal: theme.spacing.lg },
  chips: { gap: theme.spacing.sm, padding: theme.spacing.lg, paddingBottom: theme.spacing.xs },
}));
