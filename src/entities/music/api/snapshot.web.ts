import { MEDIA_BASE_URL } from '@/shared/config';

import type { Snapshot } from './snapshotTypes';

/** 웹 빌드와 PC 앱에 함께 들어가는 데모 미디어 폴더입니다(public/offline-media). */
function snapshotBaseUrl() {
  // GitHub Pages처럼 하위 경로(/GAON)에 올린 빌드도 같은 폴더를 찾습니다.
  const basePath = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
  return `${window.location.origin}${basePath}/offline-media`;
}

/**
 * 웹·PC 앱은 카탈로그, 앨범 아트, 디스크 라벨과 일부 곡의 FLAC을 빌드에 함께 넣어 인터넷 없이도 보여 줍니다.
 * 빌드에 없는 곡은 공개 미디어 주소를 그대로 써서, 연결이 돌아오면 들을 수 있습니다.
 */
export async function readSnapshot(): Promise<Snapshot> {
  const baseUrl = snapshotBaseUrl();
  const response = await fetch(`${baseUrl}/catalog.json`);
  if (!response.ok) throw new Error(`데모 카탈로그를 불러오지 못했습니다. (${response.status})`);
  const raw: unknown = await response.json();
  const bundled = new Set(bundledAudioOf(raw));
  return { raw, baseUrl, audioBaseFor: (audioPath) => (bundled.has(audioPath) ? baseUrl : MEDIA_BASE_URL) };
}

function bundledAudioOf(raw: unknown): string[] {
  if (typeof raw !== 'object' || raw === null || !('bundledAudio' in raw) || !Array.isArray(raw.bundledAudio)) return [];
  return raw.bundledAudio.filter((path): path is string => typeof path === 'string');
}
