import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { formatDate } from '@/shared/lib';
import { AppText, Disc, VisuallyHidden } from '@/shared/ui';

import type { Album } from '../model/types';

type Props = { album: Album; size?: number; onPress: () => void };

export function AlbumCard({ album, size = 196, onPress }: Props) {
  const artists = album.artists.join(', ');
  return (
    <Pressable
      role="link"
      onPress={onPress}
      style={({ pressed }) => [styles.card, { width: size }, pressed && styles.pressed]}
    >
      <Disc uri={album.artUri} size={size} />
      <View style={styles.text}>
        <AppText variant="subheading" numberOfLines={1} style={styles.center}>{album.title}</AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.center}>{artists}</AppText>
        <VisuallyHidden>앨범, {formatDate(album.released)} 발매</VisuallyHidden>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: { gap: theme.spacing.sm },
  text: { gap: 2 },
  center: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
}));
