import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { MONO_FONT } from '@/shared/config';

import { formatQuality, formatQualityShort, isHiRes } from '../model/format';
import type { AudioFormat } from '../model/types';

type Props = {
  format: AudioFormat;
  onStage?: boolean;
  /** 목록처럼 좁은 곳에서는 Hi-Res 24/96 형태로 줄입니다. */
  compact?: boolean;
  /** 배지와 같은 색 배경 위에 놓일 때 켭니다. */
  raised?: boolean;
};

export function QualityBadge({ format, onStage = false, compact = false, raised = false }: Props) {
  const short = formatQualityShort(format);
  const [grade, detail] = compact ? [short.split(' ')[0], short.split(' ')[1]] : [isHiRes(format) ? 'Hi-Res' : '', formatQuality(format)];
  return (
    <View style={[styles.badge, raised && styles.badgeRaised, onStage && styles.badgeStage]}>
      {grade ? <Text numberOfLines={1} style={[styles.grade, onStage && styles.textStage]}>{grade}</Text> : null}
      <Text numberOfLines={1} style={[styles.text, onStage && styles.textStage]}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  badgeRaised: {},
  badgeStage: {},
  grade: { flexShrink: 0, color: theme.colors.primary, fontFamily: MONO_FONT, fontSize: 12, lineHeight: 17, fontWeight: '800' },
  text: { color: theme.colors.text, fontFamily: MONO_FONT, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  textStage: { color: theme.colors.stage.text },
}));
