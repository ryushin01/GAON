import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

type Props = {
  uri?: string;
  /** 지정하지 않으면 부모 너비를 채우는 정사각형이 됩니다. */
  size?: number;
  /** 옆에 곡 정보가 있어 꾸밈 이미지일 때는 비워 둡니다. */
  label?: string;
};

/** 앨범 프레임은 항상 정사각형입니다. */
export function AlbumArt({ uri, size, label }: Props) {
  const { theme } = useUnistyles();
  return (
    <View
      style={[styles.frame, size ? { width: size } : styles.fill]}
      // 이미지가 있으면 대체 텍스트를 이미지에 달고, 없으면 자리 표시 아이콘 틀에 답니다.
      role={label && !uri ? 'img' : undefined}
      aria-label={uri ? undefined : label}
      aria-hidden={label ? undefined : true}
      testID="album-art"
    >
      {uri ? (
        <Image accessible={Boolean(label)} accessibilityLabel={label} source={{ uri }} style={imageStyle} contentFit="cover" transition={120} recyclingKey={uri} />
      ) : (
        <Ionicons aria-hidden name="musical-notes" size={size ? Math.max(16, size * 0.4) : 48} color={theme.colors.textMuted} />
      )}
    </View>
  );
}

// expo-image는 React Native 기본 컴포넌트가 아니라 고정 값을 직접 넘깁니다.
const imageStyle = { width: '100%', height: '100%' } as const;

const styles = StyleSheet.create((theme) => ({
  frame: {
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { width: '100%' },
}));
