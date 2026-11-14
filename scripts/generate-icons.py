#!/usr/bin/env python3
"""앱 아이콘과 스플래시를 만듭니다. 검은 바탕에 빛이 퍼지는 스펙트럼 원입니다.

원본은 assets/brand/spectrum.svg이고, 바탕을 뺀 마크를 assets/brand/spectrum-mark.png(1024, 투명)로
그려 둔 것을 씁니다. 원본 SVG를 바꾸면 마크 PNG를 다시 그린 뒤 이 스크립트를 실행합니다.
"""
from pathlib import Path

from PIL import Image, ImageChops

INK = (11, 11, 11)
WHITE = (255, 255, 255)
OUT = Path("assets")
MARK = Image.open(OUT / "brand" / "spectrum-mark.png").convert("RGBA")


def mark(size, scale=1.0):
    """마크를 size 캔버스 가운데에 scale 비율로 둡니다(1이면 원본 그림의 배치 그대로)."""
    inner = round(size * scale)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.alpha_composite(MARK.resize((inner, inner), Image.LANCZOS), ((size - inner) // 2, (size - inner) // 2))
    return img


def mono(size, scale):
    """안드로이드 단색(테마) 아이콘: 밝은 선만 흰색으로 남기고 가운데 어두운 원판은 비웁니다."""
    src = mark(size, scale)
    bright = src.convert("L").point(lambda v: 255 if v >= 128 else 0)
    out = Image.new("RGBA", (size, size), (*WHITE, 0))
    out.putalpha(ImageChops.multiply(bright, src.getchannel("A")))
    return out


def solid(size, color):
    return Image.new("RGBA", (size, size), (*color, 255))


def main():
    icon = solid(1024, INK)
    icon.alpha_composite(mark(1024))
    icon.convert("RGB").save(OUT / "icon.png")
    favicon = solid(196, INK)
    favicon.alpha_composite(mark(196))
    favicon.convert("RGB").save(OUT / "favicon.png")
    # 적응형 아이콘은 가운데 안전 영역(약 66%) 안에 들도록 줄입니다.
    mark(1024, 0.62).save(OUT / "android-icon-foreground.png")
    solid(1024, INK).convert("RGB").save(OUT / "android-icon-background.png")
    mono(1024, 0.62).save(OUT / "android-icon-monochrome.png")
    mark(1024, 0.8).save(OUT / "splash-icon.png")


if __name__ == "__main__":
    main()
