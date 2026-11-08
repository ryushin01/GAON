import { useMemo, useState, type ReactElement } from 'react';
import { FlatList, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { TrackRow, type Track } from '@/entities/music';
import { AddToPlaylistDialog } from './AddToPlaylistDialog';
import { addToQueue, playTracks, useCurrentTrack } from '@/features/player';
import { AppButton, AppText, Checkbox } from '@/shared/ui';

import { TrackActions } from './TrackActions';

type Props = {
  tracks: Track[];
  showRank?: boolean;
  /** 목록 위에 들어갈 화면 머리말입니다. */
  header?: ReactElement;
  empty?: ReactElement;
  extraActions?: (track: Track) => { label: string; onPress: () => void }[];
};

/** 전체 재생, 셔플, 선택 재생, 담기를 지원하는 곡 목록입니다. */
export function TrackList({ tracks, showRank = false, header, empty, extraActions }: Props) {
  const current = useCurrentTrack();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [dialog, setDialog] = useState(false);

  const picked = useMemo(() => tracks.filter((t) => selected.has(t.id)), [tracks, selected]);
  const allChecked = tracks.length > 0 && picked.length === tracks.length;

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const listHeader = (
    <View>
      {header}
      {tracks.length > 0 && (
        <View style={styles.bar}>
          <Checkbox
            checked={allChecked}
            label="전체 선택"
            onChange={(on) => setSelected(on ? new Set(tracks.map((t) => t.id)) : new Set())}
          />
          <AppButton label="전체 재생" icon="play" onPress={() => void playTracks(tracks)} />
          <AppText variant="caption" tone="muted" style={styles.count}>{tracks.length}곡</AppText>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={tracks}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={empty}
        initialNumToRender={20}
        renderItem={({ item }) => (
          <TrackRow
            track={item}
            rank={showRank && item.rank != null ? item.rank : undefined}
            active={current?.id === item.id}
            onPress={() => void playTracks(tracks, item.id)}
            leading={
              <Checkbox
                checked={selected.has(item.id)}
                label={`${item.title} 선택`}
                onChange={(on) => toggle(item.id, on)}
              />
            }
            trailing={<TrackActions track={item} extra={extraActions?.(item)} />}
          />
        )}
      />
      {picked.length > 0 && (
        <View style={styles.selection} role="toolbar" aria-label={`${picked.length}곡 선택됨`}>
          <AppText variant="subheading" style={styles.selectionCount} role="status">{picked.length}곡 선택</AppText>
          <AppButton label="듣기" icon="play" onPress={() => { void playTracks(picked); setSelected(new Set()); }} />
          <AppButton label="추가" variant="secondary" onPress={() => { void addToQueue(picked); setSelected(new Set()); }} />
          <AppButton label="담기" variant="secondary" onPress={() => setDialog(true)} />
        </View>
      )}
      <AddToPlaylistDialog
        visible={dialog}
        trackIds={picked.map((t) => t.id)}
        onClose={(added) => {
          setDialog(false);
          if (added) setSelected(new Set());
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  count: { marginLeft: 'auto', paddingRight: theme.spacing.md },
  selection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  selectionCount: { flexGrow: 1, paddingHorizontal: theme.spacing.sm },
}));
