import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { artistLine, displayTitle, QualityBadge, useCatalog } from '@/entities/music';
import { playTracks } from '@/features/player';
import { LikeButton } from '@/features/toggle-like';
import { formatCount, formatDate, formatFileSize, formatTime } from '@/shared/lib';
import { AppButton, AppText, Disc, MetaRow, Screen, ScreenHeader, Section, StateView } from '@/shared/ui';
import { useTrackLookup } from '@/widgets/track-list';

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return <MetaRow label={label}>{value}</MetaRow>;
}

export function TrackPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isPending } = useCatalog();
  const { find } = useTrackLookup();
  const track = find(id);

  if (!track) {
    return (
      <Screen>
        <ScreenHeader title="곡 정보" back />
        {isPending ? <StateView loading /> : <StateView title="곡을 찾을 수 없습니다" />}
      </Screen>
    );
  }
  const title = displayTitle(track);

  return (
    <Screen>
      <ScreenHeader title="곡 정보" back />
      <View style={styles.summary}>
        <View style={styles.art}><Disc uri={track.discUri ?? track.artUri} label={`${track.albumTitle} 앨범 아트`} /></View>
        <AppText variant="display" role="heading" aria-level={2} style={styles.centered}>{title}</AppText>
        <AppText tone="muted" style={styles.centered}>{artistLine(track)}</AppText>
        <View style={styles.badge}><QualityBadge format={track.format} /></View>
        <View style={styles.actions}>
          <AppButton label="듣기" icon="play" onPress={() => void playTracks([track])} />
          <LikeButton trackId={track.id} title={title} />
        </View>
      </View>

      <Section title="상세 정보">
        <View style={styles.info}>
          {track.albumId ? (
            <MetaRow label="앨범">
              <Pressable role="link" style={styles.link} onPress={() => router.push(`/album/${track.albumId}`)}>
                <AppText style={styles.linkText}>{track.albumTitle}</AppText>
              </Pressable>
            </MetaRow>
          ) : (
            <Row label="앨범" value={track.albumTitle} />
          )}
          <Row label="피처링" value={track.featuring.join(', ')} />
          <Row label="발매일" value={formatDate(track.released)} />
          <Row label="장르" value={track.genre} />
          <Row label="트랙 번호" value={track.trackNumber ? `${track.trackNumber}번${track.isTitleTrack ? ' (타이틀)' : ''}` : undefined} />
          <Row label="재생 시간" value={formatTime(track.durationSec)} />
          <Row label="파일 크기" value={track.fileSize ? formatFileSize(track.fileSize) : undefined} />
          <Row label="좋아요" value={track.likes != null ? formatCount(track.likes) : undefined} />
        </View>
      </Section>

      {(track.lyricists.length > 0 || track.composers.length > 0 || track.arrangers.length > 0) && (
        <Section title="참여 정보">
          <View style={styles.info}>
            <Row label="작사" value={track.lyricists.join(', ')} />
            <Row label="작곡" value={track.composers.join(', ')} />
            <Row label="편곡" value={track.arrangers.join(', ')} />
          </View>
        </Section>
      )}

      {track.lyrics.length > 0 && (
        <Section title="가사">
          <View style={styles.lyrics}>
            {track.lyrics.map((line, i) => (
              <AppText key={`${i}-${line.text}`}>{line.text}</AppText>
            ))}
          </View>
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  summary: { alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.lg },
  art: { width: '100%', maxWidth: 280, paddingBottom: theme.spacing.md },
  centered: { textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  badge: { alignSelf: 'center' },
  // 구역 제목의 먹선과 첫 행의 먹선이 겹쳐 한 줄로 보이게 합니다.
  info: { paddingHorizontal: theme.spacing.lg, marginTop: -(theme.spacing.lg + 1) },
  lyrics: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
  link: { minHeight: 44, justifyContent: 'center', marginVertical: -11 },
  linkText: { textDecorationLine: 'underline' },
}));
