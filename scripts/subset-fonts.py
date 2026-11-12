"""웹과 PC 앱에서 쓰는 글꼴을 필요한 글자만 남겨 줄입니다. 한글이 든 글꼴은 KS X 1001 한글 2,350자를 남깁니다.

원본 TTF는 앱(iOS·Android)이 그대로 씁니다. 웹은 원본이 수 MB라 줄인 woff2를 씁니다.
OFL의 예약 이름(Nanum)이 있는 글꼴은 줄인 파일의 이름을 바꿉니다.

    pip install fonttools brotli
    python scripts/subset-fonts.py
"""

from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

FONTS = Path(__file__).resolve().parent.parent / "assets" / "fonts"

# (원본, 결과, 바꿀 이름 또는 None, 한글 포함 여부)
# 고정폭 글꼴은 음질 표시(FLAC 24bit/192kHz)처럼 영문·숫자에만 쓰므로 라틴 문자만 남깁니다.
TARGETS = [
    ("NanumGothicCoding-Regular.ttf", "GaonMono-subset.woff2", "GaonMono", False),
]


def ks_x_1001_hangul() -> list[int]:
    """EUC-KR로 나타낼 수 있는 완성형 한글 2,350자"""
    return [cp for cp in range(0xAC00, 0xD7A4) if _euc_kr(chr(cp))]


def _euc_kr(ch: str) -> bool:
    try:
        ch.encode("euc-kr")
        return True
    except UnicodeEncodeError:
        return False


def unicodes(hangul: bool) -> list[int]:
    ranges = [
        (0x0020, 0x007E),  # 기본 라틴
        (0x00A0, 0x00FF),  # 라틴 보충
        (0x2010, 0x2027),  # 줄표, 따옴표, 말줄임표
        (0x2030, 0x203A),
        (0x2190, 0x2193),  # 화살표
        (0x3000, 0x3011),  # 한중일 문장 부호
        (0x3131, 0x318E),  # 한글 자모
    ]
    latin = [cp for start, end in ranges[:5] for cp in range(start, end + 1)]
    if not hangul:
        return latin
    return latin + [cp for start, end in ranges[5:] for cp in range(start, end + 1)] + ks_x_1001_hangul()


def rename(font: TTFont, family: str) -> None:
    for record in font["name"].names:
        if record.nameID in (1, 4, 16, 21):
            record.string = family
        elif record.nameID == 6:
            record.string = family.replace(" ", "") + "-Regular"
        elif record.nameID == 3:
            record.string = family + " subset"


def main() -> None:
    for source, target, family, hangul in TARGETS:
        options = subset.Options()
        options.flavor = "woff2"
        options.layout_features = ["*"]
        options.name_IDs = ["*"]
        options.name_languages = ["*"]
        font = TTFont(FONTS / source)
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=unicodes(hangul))
        subsetter.subset(font)
        if family:
            rename(font, family)
        font.flavor = "woff2"
        font.save(FONTS / target)
        print(f"{target}: {(FONTS / target).stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
