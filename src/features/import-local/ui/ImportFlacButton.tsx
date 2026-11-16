import { useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AppButton, AppText, LiveRegion } from '@/shared/ui';

import { pickAndImportFlac } from '../model/importFlac';

export function ImportFlacButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await pickAndImportFlac();
      if (result) {
        const rejected = result.rejected.length ? ` FLAC이 아니거나 읽을 수 없는 파일: ${result.rejected.join(', ')}` : '';
        setMessage({ text: `${result.added}곡을 가져왔습니다.${rejected}`, isError: result.rejected.length > 0 });
      }
    } catch {
      setMessage({ text: '파일을 가져오지 못했습니다. 다시 시도해 주세요.', isError: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppButton
        label={busy ? '가져오는 중' : '기기에서 FLAC 가져오기'}
        icon="folder-open-outline"
        disabled={busy}
        onPress={() => void run()}
      />
      {/* 결과는 status, 가져오지 못한 파일이 있으면 alert로 알립니다. 두 영역 모두 처음부터 둡니다. */}
      <LiveRegion role="status">{message && !message.isError ? <AppText variant="caption" tone="muted">{message.text}</AppText> : null}</LiveRegion>
      <LiveRegion role="alert">{message?.isError ? <AppText variant="caption" tone="danger">{message.text}</AppText> : null}</LiveRegion>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({ root: { gap: theme.spacing.sm } }));
