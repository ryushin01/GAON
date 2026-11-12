import { Image } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

/** 관제 화면처럼 바탕에 까는 점 격자입니다. 본문 뒤에 놓여 누르기를 가로막지 않습니다. */
export function DotGrid() {
  const { theme } = useUnistyles();
  return (
    <Image
      source={require('../../../assets/dot-grid.png')}
      resizeMode="repeat"
      tintColor={theme.colors.text}
      alt=""
      aria-hidden
      accessible={false}
      style={styles.grid}
      testID="dot-grid"
    />
  );
}

const styles = StyleSheet.create({
  grid: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%', opacity: 0.14, pointerEvents: 'none' },
});
