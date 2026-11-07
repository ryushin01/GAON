import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { artistLine, displayTitle, QualityBadge, useCatalog } from '@/entities/music';
import { playTracks } from '@/features/player';
import { LikeButton } from '@/features/toggle-like';
import { formatCount, formatDate, formatFileSize, formatTime } from '@/shared/lib';
import { AlbumArt, AppButton, AppText, Screen, ScreenHeader, Section, StateView } from '@/shared/ui';
import { useTrackLookup } from '@/widgets/track-list';

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <AppText tone="muted" style={styles.infoLabel}>{label}</AppText>
      <AppText style={styles.infoValue}>{value}</AppText>
    </View>
  );
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
        <View style={styles.art}><AlbumArt uri={track.artUri} label={`${track.albumTitle} 앨범 아트`} /></View>
        <View style={styles.text}>
          <AppText variant="heading" role="heading" aria-level={2}>{title}</AppText>
          <AppText tone="muted">{artistLine(track)}</AppText>
          <QualityBadge format={track.format} />
          <View style={styles.actions}>
            <AppButton label="듣기" icon="play" onPress={() => void playTracks([track])} />
            <LikeButton trackId={track.id} title={title} />
          </View>
        </View>
      </View>

      <Section title="상세 정보">
        <View style={styles.info}>
          {track.albumId ? (
            <View style={styles.infoRow}>
              <AppText tone="muted" style={styles.infoLabel}>앨범</AppText>
              <Pressable role="link" style={styles.link} onPress={() => router.push(`/album/${track.albumId}`)}>
                <AppText tone="primary">{track.albumTitle}</AppText>
              </Pressable>
            </View>
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
          <View style={styles.info}>
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
  summary: { flexDirection: 'row', gap: theme.spacing.lg, padding: theme.spacing.lg },
  art: { width: 120, flexShrink: 0 },
  text: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  info: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  infoLabel: { width: 80 },
  infoValue: { flex: 1 },
  link: { flex: 1, minHeight: 44, justifyContent: 'center' },
}));
