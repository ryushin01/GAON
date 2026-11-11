#!/usr/bin/env python3
"""Ionicons에서 앱이 쓰는 아이콘만 담은 글꼴과 글리프 표를 만듭니다.

새 아이콘을 쓰려면 아래 ICONS에 이름을 넣고 실행합니다. fontTools가 필요합니다.
    pip install fonttools
    python scripts/subset-icons.py
"""
import json
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ICONS = [
    'add', 'alert-circle-outline', 'arrow-down', 'caret-down', 'caret-up', 'chatbubble', 'checkbox', 'checkmark',
    'checkmark-circle', 'chevron-back', 'chevron-down', 'chevron-up', 'close', 'close-circle', 'ellipsis-vertical',
    'folder-open-outline', 'heart', 'heart-outline', 'information-circle-outline', 'list', 'logo-github', 'logo-google',
    'musical-notes', 'pause', 'play', 'play-skip-back', 'play-skip-forward', 'reader-outline', 'repeat',
    'repeat-outline', 'settings-outline', 'shuffle', 'shuffle-outline', 'square-outline', 'volume-high',
]

ROOT = Path(__file__).resolve().parent.parent
VENDOR = ROOT / 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons'

glyphs = json.loads((VENDOR / 'glyphmaps/Ionicons.json').read_text())
missing = [name for name in ICONS if name not in glyphs]
if missing:
    raise SystemExit(f'Ionicons에 없는 이름입니다: {missing}')
picked = {name: glyphs[name] for name in sorted(ICONS)}

font = TTFont(VENDOR / 'Fonts/Ionicons.ttf')
options = subset.Options()
options.notdef_outline = True
subsetter = subset.Subsetter(options)
subsetter.populate(unicodes=list(picked.values()))
subsetter.subset(font)
font.save(ROOT / 'assets/fonts/GaonIcons.ttf')

lines = ',\n'.join(f"  '{name}': {code}" for name, code in picked.items())
(ROOT / 'src/shared/ui/iconGlyphs.ts').write_text(
    '// scripts/subset-icons.py가 만든 파일입니다. 직접 고치지 않습니다.\n'
    f'export const ICON_GLYPHS = {{\n{lines},\n}} as const;\n'
)
print(f'아이콘 {len(picked)}개, 글꼴 {(ROOT / "assets/fonts/GaonIcons.ttf").stat().st_size // 1024}KB')
