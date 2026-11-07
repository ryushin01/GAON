import { IconButton } from '@/shared/ui';

import { togglePlay } from '../model/engine';
import { usePlayerStore } from '../model/playerStore';

type Props = { size?: number; color?: string; filled?: boolean };

export function PlayPauseButton({ size = 28, color, filled }: Props) {
  const playing = usePlayerStore((s) => s.playing);
  return (
    <IconButton
      icon={playing ? 'pause' : 'play'}
      label={playing ? '일시정지' : '재생'}
      size={size}
      color={color}
      filled={filled}
      onPress={togglePlay}
    />
  );
}
