import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

type Props = {
  /** 결과·안내는 status, 바로 알아야 하는 오류는 alert입니다. */
  role: 'status' | 'alert';
  /** 알릴 내용입니다. 없으면 영역만 남습니다. */
  children?: ReactNode;
  /** 내용이 있을 때의 모양입니다. */
  style?: StyleProp<ViewStyle>;
};

/**
 * 화면 낭독기에 알리는 영역입니다. 영역이 내용과 함께 새로 생기면 읽지 않는 화면 낭독기가 있어,
 * 영역은 처음부터 두고 내용만 바꿉니다. 비어 있을 때는 흐름 밖에 두어 주변 간격(gap)을 바꾸지 않습니다.
 */
export function LiveRegion({ role, children, style }: Props) {
  const empty = children == null || children === false || children === '';
  // Android의 TalkBack은 role만으로는 바뀐 내용을 읽지 않아 live region을 따로 답니다.
  // 웹은 role에 aria-live가 들어 있어 다시 달지 않습니다.
  const liveRegion = Platform.OS === 'android' ? (role === 'alert' ? 'assertive' : 'polite') : undefined;
  return (
    <View role={role} accessibilityLiveRegion={liveRegion} style={empty ? styles.empty : style}>
      {empty ? null : children}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
});
