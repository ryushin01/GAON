import { useEffect, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { Track } from '@/entities/music';
import { formatFileSize } from '@/shared/lib';
import { AppButton, AppText, LiveRegion } from '@/shared/ui';

import { cancelOffline, saveOffline, useOfflineStatus, type OfflineStatus } from '../model/saveOffline';

/** 받지 못한 까닭과 고치는 방법입니다. */
function failure({ failed, storageFull }: OfflineStatus): string {
  return storageFull
    ? `${failed}곡을 저장하지 못했습니다. 기기의 저장 공간이 모자랍니다. 저장한 곡을 지우거나 공간을 비운 뒤 남은 곡 저장을 다시 눌러 주세요.`
    : `${failed}곡을 저장하지 못했습니다. 인터넷 연결을 확인하고 남은 곡 저장을 다시 눌러 주세요.`;
}

function summary({ total, saved, saving, savedBytes, missingBytes }: OfflineStatus): string {
  if (saving > 0) return `오프라인 저장 중 · ${saved}/${total}곡`;
  if (saved === total) return `${total}곡 모두 오프라인 저장됨 · ${formatFileSize(savedBytes)}`;
  if (saved > 0) return `${total}곡 중 ${saved}곡 저장됨 · 남은 곡 ${formatFileSize(missingBytes)}`;
  return `${total}곡 · ${formatFileSize(missingBytes)}`;
}

/**
 * 곡 목록(좋아요, 플레이리스트)의 스트리밍 곡을 기기에 저장해 인터넷 없이 듣게 합니다. 받는 동안에는 멈출 수 있습니다.
 * 진행은 글자로 보여 주고, 화면 낭독기에는 시작과 끝, 실패만 알립니다.
 */
export function SaveOfflineButton({ tracks, style }: { tracks: Track[]; style?: StyleProp<ViewStyle> }) {
  const status = useOfflineStatus(tracks);
  const busy = status.saving > 0;
  const [notice, setNotice] = useState('');
  const wasBusy = useRef(busy);

  useEffect(() => {
    if (busy && !wasBusy.current) setNotice('오프라인 저장을 시작했습니다.');
    if (!busy && wasBusy.current) {
      setNotice(status.saved === status.total ? `${status.total}곡을 모두 오프라인으로 저장했습니다.` : `${status.saved}곡까지 오프라인으로 저장했습니다.`);
    }
    wasBusy.current = busy;
  }, [busy, status.saved, status.total]);

  if (!status.total) return null;
  const rest = status.missing.length;
  return (
    <View style={[styles.root, style]}>
      <View style={styles.row}>
        {busy ? (
          <AppButton label="저장 멈추기" variant="secondary" onPress={() => cancelOffline(tracks.map((t) => t.id))} />
        ) : rest > 0 ? (
          <AppButton
            label={status.saved > 0 ? `남은 ${rest}곡 저장` : '오프라인 저장'}
            icon="arrow-down"
            variant="secondary"
            onPress={() => saveOffline(status.missing)}
          />
        ) : null}
        <AppText variant="caption" tone="muted" style={styles.summary}>{summary(status)}</AppText>
      </View>
      {/* 화면에는 위 요약이 늘 보여, 시작과 끝 알림은 화면 낭독기에만 들려줍니다. */}
      <LiveRegion role="status" style={styles.announce}>{notice ? <AppText variant="caption">{notice}</AppText> : null}</LiveRegion>
      <LiveRegion role="alert">
        {status.failed > 0 && !busy ? (
          <AppText variant="caption" tone="danger">
            {failure(status)}
          </AppText>
        ) : null}
      </LiveRegion>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { gap: theme.spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm },
  summary: { flexShrink: 1 },
  announce: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
}));
