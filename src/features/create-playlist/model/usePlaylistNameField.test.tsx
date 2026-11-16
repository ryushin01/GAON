import { act, renderHook } from '@testing-library/react-native';

import { useLibraryStore } from '@/entities/library';

import { usePlaylistNameField } from './usePlaylistNameField';

describe('usePlaylistNameField', () => {
  beforeEach(() => useLibraryStore.setState({ playlists: [] }));

  it('빈 이름이면 만들지 않고 오류를 입력 칸에 연결합니다', async () => {
    const { result } = await renderHook(() => usePlaylistNameField());
    let id: string | null = 'x';
    await act(async () => {
      id = result.current.create();
    });
    expect(id).toBeNull();
    expect(result.current.error).toContain('플레이리스트 이름을 입력해 주세요');
    expect(result.current.inputProps['aria-describedby']).toBe(result.current.errorId);
    expect(result.current.inputProps).not.toHaveProperty('aria-invalid');
    expect(useLibraryStore.getState().playlists).toHaveLength(0);
  });

  it('이름을 고치면 오류를 지우고, 만들면 입력을 비웁니다', async () => {
    const { result } = await renderHook(() => usePlaylistNameField());
    await act(async () => {
      result.current.create();
    });
    await act(async () => result.current.inputProps.onChangeText('  밤 드라이브  '));
    expect(result.current.error).toBe('');
    await act(async () => {
      result.current.create(['t1']);
    });
    expect(useLibraryStore.getState().playlists[0]).toMatchObject({ name: '밤 드라이브', trackIds: ['t1'] });
    expect(result.current.inputProps.value).toBe('');
  });
});
