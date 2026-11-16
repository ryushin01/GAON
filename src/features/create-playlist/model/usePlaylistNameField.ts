import { useId, useState } from 'react';

import { useLibraryStore } from '@/entities/library';

const PLAYLIST_NAME_MAX = 40;
const EMPTY_NAME = '이름이 비어 있습니다. 플레이리스트 이름을 입력해 주세요.';

/**
 * 새 플레이리스트 이름 입력입니다. 보관함과 담기 창이 같은 검사와 오류 안내를 씁니다.
 * 빈 칸은 잘못된 값이 아니라 aria-invalid를 붙이지 않고, 오류 문구만 입력 칸에 연결합니다.
 */
export function usePlaylistNameField() {
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const errorId = `playlist-name-error-${useId().replace(/:/g, '')}`;
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setError('');
  };

  /** 이름이 있으면 플레이리스트를 만들고 id를 돌려줍니다. 비어 있으면 오류를 보여 주고 null입니다. */
  const create = (trackIds: string[] = []): string | null => {
    const value = name.trim();
    if (!value) {
      setError(EMPTY_NAME);
      return null;
    }
    const id = createPlaylist(value, trackIds);
    reset();
    return id;
  };

  const inputProps = {
    value: name,
    maxLength: PLAYLIST_NAME_MAX,
    onChangeText: (value: string) => {
      setName(value);
      if (error) setError('');
    },
    'aria-describedby': error ? errorId : undefined,
    'aria-errormessage': error ? errorId : undefined,
  };

  return { inputProps, error, errorId, create, reset };
}
