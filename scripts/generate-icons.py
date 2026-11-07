#!/usr/bin/env python3
"""앱 아이콘과 스플래시를 코드로 만듭니다. 코발트 블루 바탕에 빛이 퍼지는 G 모양입니다."""
from pathlib import Path

from PIL import Image, ImageDraw

COBALT = (0, 71, 171)
WHITE = (255, 255, 255)
OUT = Path("assets")
SCALE = 4


def mark(size, color, thickness=0.13, extent=0.62):
    """가운데 놓인 G 글자 모양을 투명 배경에 그립니다."""
    big = size * SCALE
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = big * extent / 2
    c = big / 2
    box = (c - radius, c - radius, c + radius, c + radius)
    width = int(big * thickness)
    d.arc(box, start=35, end=320, fill=color, width=width)
    d.rectangle((c, c - width * 0.1, c + radius, c + width * 0.9), fill=color)
    return img.resize((size, size), Image.LANCZOS)


def solid(size, color):
    return Image.new("RGBA", (size, size), (*color, 255))


def main():
    icon = solid(1024, COBALT)
    icon.alpha_composite(mark(1024, WHITE))
    icon.convert("RGB").save(OUT / "icon.png")
    favicon = solid(196, COBALT)
    favicon.alpha_composite(mark(196, WHITE))
    favicon.convert("RGB").save(OUT / "favicon.png")
    mark(1024, WHITE, extent=0.42).save(OUT / "android-icon-foreground.png")
    solid(1024, COBALT).convert("RGB").save(OUT / "android-icon-background.png")
    mark(1024, WHITE, extent=0.42).save(OUT / "android-icon-monochrome.png")
    mark(1024, WHITE, extent=0.7).save(OUT / "splash-icon.png")


if __name__ == "__main__":
    main()
