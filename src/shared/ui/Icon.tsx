import createIconSet from '@expo/vector-icons/createIconSet';

import { ICON_GLYPHS } from './iconGlyphs';

/** 앱이 쓰는 아이콘 이름입니다. 새 아이콘은 scripts/subset-icons.py에 넣고 다시 만듭니다. */
export type IconName = keyof typeof ICON_GLYPHS;

/**
 * Ionicons에서 쓰는 아이콘만 남긴 글꼴로 그립니다.
 * Ionicons 전체 글꼴과 모든 아이콘 묶음의 글리프 표를 받지 않아 첫 화면이 가벼워집니다.
 */
export const Icon = createIconSet(ICON_GLYPHS, 'GaonIcons', require('../../../assets/fonts/GaonIcons.ttf'));
