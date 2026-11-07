import { useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { AppButton, AppText } from '@/shared/ui';

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
      {message && (
        <AppText variant="caption" tone={message.isError ? 'danger' : 'muted'} role={message.isError ? 'alert' : 'status'}>
          {message.text}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({ root: { gap: theme.spacing.sm } }));
