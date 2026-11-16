"""앱에 넣는 글꼴을 필요한 글자만 남겨 줄입니다. 한글이 든 글꼴은 KS X 1001 한글 2,350자를 남깁니다.

- 웹·PC 앱: 고정폭 글꼴의 라틴 문자만 woff2로 (한글은 웹 글꼴과 운영체제 글꼴이 맡음)
- 모바일 앱(iOS·Android): LINE Seed와 고정폭 글꼴을 TTF로. 원본은 굵기마다 약 3.4MB라 앱이 무거워집니다.
  KS X 1001에 없는 드문 한글은 운영체제가 시스템 글꼴로 대신 그립니다.
원본 TTF는 줄인 파일을 다시 만들 때와 `pnpm fonts --check`의 비교에 씁니다.
OFL의 예약 이름(Nanum)이 있는 글꼴은 줄인 파일의 이름을 바꿉니다.

    pip install fonttools brotli
    python scripts/subset-fonts.py
"""

from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

FONTS = Path(__file__).resolve().parent.parent / "assets" / "fonts"

# (원본, 결과, 바꿀 이름 또는 None, 한글 포함 여부)
# 웹의 고정폭 글꼴은 음질 표시(FLAC 24bit/192kHz)처럼 영문·숫자에만 쓰므로 라틴 문자만 남깁니다.
# 모바일 앱은 글꼴 하나로 한글 라벨까지 그려서 고정폭 글꼴에도 한글을 남깁니다.
TARGETS = [
    ("NanumGothicCoding-Regular.ttf", "GaonMono-subset.woff2", "GaonMono", False),
    ("NanumGothicCoding-Regular.ttf", "GaonMono-app.ttf", "GaonMono", True),
    ("LINESeedKR-Thin.ttf", "LINESeedKR-Thin-subset.ttf", None, True),
    ("LINESeedKR-Regular.ttf", "LINESeedKR-Regular-subset.ttf", None, True),
    ("LINESeedKR-Bold.ttf", "LINESeedKR-Bold-subset.ttf", None, True),
]


def ks_x_1001_hangul() -> list[int]:
    """EUC-KR로 나타낼 수 있는 완성형 한글 2,350자"""
    return [cp for cp in range(0xAC00, 0xD7A4) if _euc_kr(chr(cp))]


def _euc_kr(ch: str) -> bool:
    # 파이썬의 euc-kr 코덱은 KS X 1001에 없는 한글도 8바이트 조합형(채움 문자 시퀀스)으로 인코딩합니다.
    # 완성형 2,350자만 2바이트이므로 길이로 가립니다.
    try:
        return len(ch.encode("euc-kr")) == 2
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
        flavor = "woff2" if target.endswith(".woff2") else None
        options = subset.Options()
        options.flavor = flavor
        options.layout_features = ["*"]
        options.name_IDs = ["*"]
        options.name_languages = ["*"]
        font = TTFont(FONTS / source)
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=unicodes(hangul))
        subsetter.subset(font)
        if family:
            rename(font, family)
        font.flavor = flavor
        font.save(FONTS / target)
        print(f"{target}: {(FONTS / target).stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
