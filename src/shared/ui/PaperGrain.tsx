import { Image } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/** 화면 전체에 얹는 종이 질감입니다. 움직이지 않고 누르기도 가로막지 않습니다. */
export function PaperGrain() {
  return (
    <Image
      source={require('../../../assets/paper-grain.png')}
      resizeMode="repeat"
      alt=""
      aria-hidden
      accessible={false}
      style={styles.grain}
      testID="paper-grain"
    />
  );
}

const styles = StyleSheet.create({
  grain: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%', opacity: 0.5, pointerEvents: 'none' },
});
