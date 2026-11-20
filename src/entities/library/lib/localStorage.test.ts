import { File } from 'expo-file-system';

import { deleteLocalFile, downloadAudio, releaseAudioUris, resolveAudioUri } from './localStorage';

/** 앱(iOS·Android)의 파일 저장소를 흉내 냅니다. 있는 파일의 경로만 기억합니다. */
const mockFiles = new Set<string>();

jest.mock('expo-file-system', () => {
  const join = (parts: unknown[]) => parts.map((p) => (typeof p === 'string' ? p : (p as { path: string }).path)).join('/');
  class Directory {
    path: string;
    constructor(...parts: unknown[]) {
      this.path = join(parts);
    }
    get exists() {
      return true;
    }
    create() {}
  }
  class File {
    path: string;
    constructor(...parts: unknown[]) {
      this.path = join(parts);
    }
    get exists() {
      return mockFiles.has(this.path);
    }
    get uri() {
      return `file:///${this.path}`;
    }
    delete() {
      mockFiles.delete(this.path);
    }
    static downloadFileAsync = async (_url: string, target: File) => {
      mockFiles.add(target.path);
      return target;
    };
  }
  return { Directory, File, Paths: { document: { path: 'doc' } } };
});

const flac = (id: string) => `doc/local-library/${id}.flac`;

beforeEach(() => {
  releaseAudioUris([]);
  mockFiles.clear();
});

describe('앱의 저장 파일 지우기', () => {
  it('재생 목록에 있는 곡 파일은 큐에서 빠질 때까지 지우지 않고, 앨범 아트는 바로 지웁니다', async () => {
    await downloadAudio('a', 'https://m/a.flac');
    mockFiles.add('doc/local-library/a.webp');
    releaseAudioUris(['a']);
    expect(await deleteLocalFile('a', { release: false })).toBe(false);
    expect(mockFiles.has(flac('a'))).toBe(true);
    expect(mockFiles.has('doc/local-library/a.webp')).toBe(false);
    // 재생기는 큐에 올릴 때 받은 경로로 곡을 엽니다.
    await expect(resolveAudioUri('a')).resolves.toBe(`file:///${flac('a')}`);
    releaseAudioUris([]);
    expect(mockFiles.has(flac('a'))).toBe(false);
  });

  it('재생 목록에 없는 곡 파일은 바로 지웁니다', async () => {
    await downloadAudio('a', 'https://m/a.flac');
    releaseAudioUris(['b']);
    expect(await deleteLocalFile('a', { release: false })).toBe(true);
    expect(mockFiles.has(flac('a'))).toBe(false);
    await expect(resolveAudioUri('a')).rejects.toThrow('저장된 파일을 찾을 수 없습니다.');
  });

  it('지우기를 미룬 곡을 다시 저장하면 새 파일을 나중에 지우지 않습니다', async () => {
    await downloadAudio('a', 'https://m/a.flac');
    releaseAudioUris(['a']);
    await deleteLocalFile('a', { release: false });
    await downloadAudio('a', 'https://m/a.flac');
    releaseAudioUris([]);
    expect(mockFiles.has(flac('a'))).toBe(true);
  });

  it('지우기를 미룬 곡을 다시 저장하면 남은 파일을 그대로 써, 받지 못하는 상황에서도 재생 목록의 파일이 남습니다', async () => {
    await downloadAudio('a', 'https://m/a.flac');
    releaseAudioUris(['a']);
    await deleteLocalFile('a', { release: false });
    const download = jest.spyOn(File, 'downloadFileAsync').mockRejectedValue(new Error('offline'));
    try {
      await downloadAudio('a', 'https://m/a.flac');
      expect(download).not.toHaveBeenCalled();
      expect(mockFiles.has(flac('a'))).toBe(true);
    } finally {
      download.mockRestore();
    }
  });
});
