import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon } from '@/shared/ui';

type Props = { change?: number; isNew?: boolean };

export function rankChangeLabel(change = 0, isNew = false): string {
  if (isNew) return '신규 진입';
  if (change > 0) return `${change}계단 상승`;
  if (change < 0) return `${-change}계단 하락`;
  return '순위 변동 없음';
}

/** 색만으로 구분하지 않도록 방향 아이콘과 숫자를 함께 표시합니다. */
export function RankChange({ change = 0, isNew = false }: Props) {
  const { theme } = useUnistyles();
  const label = rankChangeLabel(change, isNew);
  if (isNew) {
    return <Text role="img" aria-label={label} style={styles.isNew}>NEW</Text>;
  }
  if (change === 0) {
    return <Text role="img" aria-label={label} style={styles.same}>-</Text>;
  }
  const up = change > 0;
  return (
    <View role="img" aria-label={label} style={styles.row}>
      <Icon aria-hidden name={up ? 'caret-up' : 'caret-down'} size={12} color={up ? theme.colors.rankUp : theme.colors.rankDown} />
      <Text style={up ? styles.up : styles.down}>{Math.abs(change)}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  up: { color: theme.colors.rankUp, fontSize: 12, fontWeight: '700' },
  down: { color: theme.colors.rankDown, fontSize: 12, fontWeight: '700' },
  same: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center' },
  isNew: { color: theme.colors.rankUp, fontSize: 12, fontWeight: '800', textAlign: 'center' },
}));
