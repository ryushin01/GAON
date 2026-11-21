import { MEDIA_BASE_URL } from '@/shared/config';

import raw from '../../../../public/offline-media/catalog.json';

import type { Snapshot } from './snapshotTypes';

/**
 * 앱에 든 데모 카탈로그(public/offline-media/catalog.json)를 읽습니다.
 * iOS·Android 앱은 화면 코드에 목록만 넣고, 앨범 아트·음원은 공개 미디어 주소를 그대로 씁니다(한 번 본 그림은 캐시에 남음).
 */
export async function readSnapshot(): Promise<Snapshot> {
  return { raw, baseUrl: MEDIA_BASE_URL, audioBaseFor: () => MEDIA_BASE_URL };
}
