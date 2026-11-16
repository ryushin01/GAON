import { act, render, screen } from '@testing-library/react-native';

import { usePlayerStore } from '../model/playerStore';
import { PlaybackError } from './PlaybackError';

describe('PlaybackError', () => {
  it('오류가 생기면 문구를 보여 주고, 지워지면 감춥니다', async () => {
    usePlayerStore.setState({ error: null });
    await render(<PlaybackError />);
    expect(screen.queryByText('곡을 불러오지 못했습니다.')).toBeNull();
    await act(async () => usePlayerStore.setState({ error: '곡을 불러오지 못했습니다.' }));
    expect(screen.getByText('곡을 불러오지 못했습니다.')).toBeTruthy();
    await act(async () => usePlayerStore.setState({ error: null }));
    expect(screen.queryByText('곡을 불러오지 못했습니다.')).toBeNull();
  });
});
