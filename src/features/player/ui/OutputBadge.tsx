import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { formatKhz } from '@/entities/music';
import { AppText } from '@/shared/ui';

import type { OutputInfo } from '../model/nativePlaylist';
import { usePlayerStore } from '../model/playerStore';

export function outputLabel(output: OutputInfo): string {
  if (output.bitPerfect) return `비트 퍼펙트 · ${formatKhz(output.deviceRate)}, ${output.fileBits}bit`;
  const file = formatKhz(output.fileRate);
  const device = formatKhz(output.deviceRate);
  const reasons: Record<string, string> = {
    rate_unsupported: `장치가 ${file}를 지원하지 않아 ${device}로 변환 중`,
    device_busy: '다른 앱이 장치를 쓰는 중이라 공유 모드로 재생 중',
    exclusive_not_allowed: '소리 설정에서 독점 모드가 꺼져 있어 공유 모드로 재생 중',
    exclusive_unavailable: '독점 모드를 쓸 수 없어 공유 모드로 재생 중',
    rate_converted: `장치 형식이 ${device}라 ${file}를 변환 중`,
    format_truncated: `장치가 ${output.fileBits}bit를 그대로 받지 못해 변환 중`,
    simulated: '시험 출력',
  };
  return reasons[output.reason] ?? '변환을 거쳐 재생 중';
}

/** 재생기가 알려 준 실제 출력 상태를 그대로 보여 줍니다. */
export function OutputBadge() {
  const { theme } = useUnistyles();
  const output = usePlayerStore((s) => s.output);
  if (!output) return null;
  return (
    <View style={styles.row}>
      <Ionicons aria-hidden name={output.bitPerfect ? 'checkmark-circle' : 'alert-circle-outline'} size={14} color={theme.colors.stage.textMuted} />
      <AppText variant="caption" tone="onStageMuted" style={styles.text}>{outputLabel(output)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  text: { flexShrink: 1 },
}));
