export type AudioFormat = { sampleRate: number; bitDepth: number; channels: number };
export type LyricLine = { t: number; text: string };

export type Track = {
  id: string;
  source: 'stream' | 'local';
  title: string;
  artists: string[];
  featuring: string[];
  albumId?: string;
  albumTitle: string;
  genre?: string;
  released?: string;
  trackNumber?: number;
  isTitleTrack?: boolean;
  lyricists: string[];
  composers: string[];
  arrangers: string[];
  durationSec: number;
  format: AudioFormat;
  fileSize?: number;
  /** 스트리밍 주소입니다. 로컬 곡은 재생 직전에 실제 주소로 바꿉니다. */
  uri: string;
  artUri?: string;
  likes?: number;
  lyrics: LyricLine[];
  rank?: number | null;
  rankChange?: number;
  isNew?: boolean;
};

export type Album = {
  id: string;
  title: string;
  artists: string[];
  albumType: string;
  genre: string;
  agency: string;
  released: string;
  artUri: string;
  trackIds: string[];
};

export type Artist = { name: string; role: string };

export type Catalog = {
  artists: Artist[];
  albums: Album[];
  /** 차트 순위순입니다. */
  tracks: Track[];
  tracksById: Map<string, Track>;
  albumsById: Map<string, Album>;
};
