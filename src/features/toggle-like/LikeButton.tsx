import { useLibraryStore } from '@/entities/library';
import { IconButton } from '@/shared/ui';

type Props = { trackId: string; title: string; color?: string; size?: number };

export function LikeButton({ trackId, title, color, size = 22 }: Props) {
  const liked = useLibraryStore((s) => s.likedIds.includes(trackId));
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  return (
    <IconButton
      icon={liked ? 'heart' : 'heart-outline'}
      label={liked ? `${title} 좋아요 취소` : `${title} 좋아요`}
      aria-pressed={liked}
      size={size}
      color={color}
      onPress={() => toggleLike(trackId)}
    />
  );
}
