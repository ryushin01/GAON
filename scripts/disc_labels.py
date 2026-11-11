"""CD 윗면(라벨) 이미지를 그립니다.

실제 CD의 구조를 따릅니다. 가장자리의 얇은 테두리, 인쇄 면, 가운데의 은색 미러 밴드(품번을 적는 곳),
투명한 허브와 쌓임 방지 링입니다. 앱은 허브 위에 구멍을 따로 그리므로 여기서는 그 바깥까지만 그립니다.
디자인은 실제 음반에서 널리 쓰는 방식을 장르에 맞게 고릅니다. 특정 음반의 디자인을 옮기지 않습니다.

비율(반지름 기준): 앱이 그리는 허브 0~0.24, 투명 허브 0.24~0.29, 미러 밴드 0.29~0.37, 인쇄 면 0.37~0.985.
"""
from __future__ import annotations

import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

SIZE = 960
C = SIZE / 2
R = SIZE / 2
FONTS = Path(__file__).resolve().parent.parent / "assets" / "fonts"

CLEAR_HUB = 0.29
MIRROR = 0.37
PRINT_EDGE = 0.985

# 장르마다 어울리는 실제 음반 디자인 방식입니다.
GENRE_STYLES = {
    "발라드": ["picture", "spot"],
    "R&B": ["picture", "split"],
    "재즈": ["minimal_dark", "minimal_light"],
    "클래식": ["minimal_light", "minimal_dark"],
    "포크": ["spot", "silver"],
    "인디": ["split", "silver"],
    "록": ["split", "spot"],
    "일렉트로닉": ["target", "type_ring"],
    "댄스": ["type_ring", "target"],
    "신스팝": ["target", "picture"],
    "시티팝": ["spot", "picture"],
    "힙합": ["vinyl", "split"],
    "로파이": ["vinyl", "silver"],
    "앰비언트": ["silver", "minimal_light"],
}

# 앨범마다 따로 정한 디자인입니다.
OVERRIDES = {"bit": "black_hole"}


def font(name: str, size: int):
    return ImageFont.truetype(str(FONTS / name), size)


def display_font(size: int):
    return font("Diphylleia-Regular.ttf", size)


def serif_font(size: int):
    return font("NanumMyeongjo-Regular.ttf", size)


def mono_font(size: int):
    return font("NanumGothicCoding-Regular.ttf", size)


def rgb(value: str):
    return tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))


def mix(a, b, t: float):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def luminance(color) -> float:
    r, g, b = (c / 255 for c in color)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ink_for(background) -> tuple:
    return (16, 16, 16) if luminance(background) > 0.55 else (245, 244, 240)


def grid():
    y, x = np.mgrid[0:SIZE, 0:SIZE].astype(np.float32)
    dx, dy = (x - C) / R, (y - C) / R
    return dx, dy, np.hypot(dx, dy), np.arctan2(dy, dx)


def silver(angle_offset: float = 0.0) -> np.ndarray:
    """금속 면에 빛이 비친 듯한 은색입니다."""
    _, _, r, theta = grid()
    shine = 0.5 + 0.5 * np.cos(2 * (theta + angle_offset))
    level = 172 + 58 * shine ** 3 + 3 * np.sin(r * 90)
    return np.clip(np.stack([level, level + 2, level + 6], -1), 0, 255).astype(np.uint8)


def arc_text(img: Image.Image, text: str, radius: float, center_deg: float, fnt, fill, *, outside: bool = True, spacing: float = 1.0):
    """원을 따라 글자를 놓습니다. center_deg는 글자 묶음 가운데의 각도(위가 -90)입니다."""
    widths = [fnt.getlength(ch) * spacing for ch in text]
    total = sum(widths) / (radius * R)
    direction = 1 if outside else -1
    angle = math.radians(center_deg) - direction * total / 2
    for ch, w in zip(text, widths):
        step = w / (radius * R)
        mid = angle + direction * step / 2
        x = C + radius * R * math.cos(mid)
        y = C + radius * R * math.sin(mid)
        box = fnt.getbbox(ch)
        tile = Image.new("RGBA", (int(w) + 8, box[3] + 8), (0, 0, 0, 0))
        ImageDraw.Draw(tile).text((4 + (w - fnt.getlength(ch)) / 2, 2), ch, font=fnt, fill=fill)
        rotation = -math.degrees(mid) - 90 if outside else -math.degrees(mid) + 90
        tile = tile.rotate(rotation, resample=Image.BICUBIC, expand=True)
        img.alpha_composite(tile, (int(x - tile.width / 2), int(y - tile.height / 2)))
        angle += direction * step


def centered(draw: ImageDraw.ImageDraw, text: str, y: float, fnt, fill, x: float = C):
    w = fnt.getlength(text)
    draw.text((x - w / 2, y), text, font=fnt, fill=fill)


def finish(face: Image.Image, album: dict, catalog_no: str, *, mirror_tint=(0, 0, 0)) -> Image.Image:
    """인쇄 면 바깥과 안쪽에 실제 CD의 테두리, 미러 밴드, 투명 허브를 입힙니다."""
    _, _, r, _ = grid()
    metal = silver(0.6)
    img = np.array(face.convert("RGB"))
    tint = np.array(mirror_tint, dtype=np.float32)
    band = (r >= CLEAR_HUB) & (r < MIRROR)
    img[band] = np.clip(metal[band] * 0.92 + tint * 0.08, 0, 255)
    hub = r < CLEAR_HUB
    clear = np.full_like(img, 214)
    img[hub] = clear[hub]
    rim = r >= PRINT_EDGE
    img[rim] = metal[rim]
    out = Image.fromarray(img).convert("RGBA")
    draw = ImageDraw.Draw(out)
    # 쌓임 방지 링과 미러 밴드의 경계
    for ring, alpha in ((0.268, 70), (CLEAR_HUB, 90), (MIRROR, 60)):
        draw.ellipse((C - ring * R, C - ring * R, C + ring * R, C + ring * R), outline=(90, 92, 96, alpha), width=2)
    # 미러 밴드의 품번은 실제 CD처럼 아주 작게 새깁니다.
    arc_text(out, f"{catalog_no}  ·  {album['id'].upper()}  ·  MADE IN GAON", 0.335, -90, mono_font(13), (70, 72, 78, 200))
    return out


def footer(img: Image.Image, album: dict, catalog_no: str, ink):
    rate = album.get("rate", 96000)
    khz = f"{rate / 1000:g}"
    info = f"{catalog_no}   ·   FLAC 24BIT/{khz}KHZ   ·   (P) {album['released'][:4]} {album['agency']}"
    arc_text(img, info, 0.92, 90, mono_font(17), (*ink, 230), outside=False)


def style_black_hole(album, catalog_no, art_path):
    """흑백 블랙홀: 검은 그림자, 빛나는 광자 고리, 가로지르는 강착 원반."""
    dx, dy, r, theta = grid()
    shadow, photon = 0.5, 0.53
    level = np.zeros((SIZE, SIZE), np.float32)
    # 광자 고리와 위아래로 휘어 보이는 빛
    ring = np.exp(-((r - photon) / 0.01) ** 2)
    lensed = np.exp(-((r - photon - 0.04) / 0.045) ** 2) * (0.3 + 0.7 * np.abs(np.sin(theta)) ** 2)
    halo = np.where(r > photon, np.exp(-(r - photon) / 0.12), 0) * 0.28
    level += ring * 1.0 + lensed * 0.75 + halo
    # 강착 원반: 가운데가 얇고 바깥으로 갈수록 두꺼운 띠, 왼쪽이 더 밝습니다(도플러).
    thickness = 0.014 + 0.045 * np.abs(dx)
    band = np.exp(-((dy + 0.03 * dx) / thickness) ** 2) * np.clip(1.2 - np.abs(dx), 0, 1)
    doppler = 1.0 + 0.45 * np.tanh(-dx * 3)
    level = np.maximum(level, band * 0.95 * doppler)
    # 그림자 안은 빛이 없고, 앞을 지나는 원반만 보입니다.
    inside = r < shadow
    level[inside] = (band * 0.9 * doppler)[inside]
    # 먼 별
    rng = np.random.default_rng(7)
    stars = (rng.random((SIZE, SIZE)) > 0.9985) & (r > 0.62)
    level[stars] = 0.5 + 0.4 * rng.random(int(stars.sum()))
    grain = rng.normal(0, 0.025, (SIZE, SIZE))
    gray = np.clip((level + grain) * 255, 0, 255).astype(np.uint8)
    img = Image.fromarray(np.stack([gray] * 3, -1)).convert("RGBA")
    draw = ImageDraw.Draw(img)
    white = (244, 243, 238)
    centered(draw, "빛", C + 0.6 * R, display_font(96), (*white, 255))
    arc_text(img, "THE  LIGHT", 0.8, -90, serif_font(38), (*white, 255), spacing=1.25)
    arc_text(img, "유  신", 0.68, -90, serif_font(24), (*white, 220), spacing=1.2)
    footer(img, album, catalog_no, white)
    return finish(img, album, catalog_no, mirror_tint=(0, 0, 0))


def style_picture(album, catalog_no, art_path):
    """커버 이미지를 인쇄 면 전체에 싣고, 가장자리에 흰 글자를 두릅니다."""
    art = Image.open(art_path).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
    img = art.convert("RGBA")
    shade = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(shade).ellipse((C - 0.98 * R, C - 0.98 * R, C + 0.98 * R, C + 0.98 * R), outline=(0, 0, 0, 70), width=int(0.16 * R))
    img.alpha_composite(shade)
    white = (250, 250, 248)
    arc_text(img, album["title"].upper(), 0.84, -90, display_font(54), (*white, 255))
    arc_text(img, " · ".join(album["artists"]), 0.72, -90, serif_font(30), (*white, 235))
    footer(img, album, catalog_no, white)
    return finish(img, album, catalog_no)


def style_spot(album, catalog_no, art_path):
    """실크 인쇄 단색 면 위에 큰 제목 하나를 둡니다."""
    base = mix(rgb(album["colors"][0]), (20, 20, 20), 0.15)
    ink = ink_for(base)
    img = Image.new("RGBA", (SIZE, SIZE), (*base, 255))
    draw = ImageDraw.Draw(img)
    accent = rgb(album["colors"][1])
    draw.ellipse((C - 0.6 * R, C - 0.6 * R, C + 0.6 * R, C + 0.6 * R), outline=(*accent, 255), width=6)
    title = album["title"]
    size = 120 if len(title) <= 6 else 84
    centered(draw, title, C - 0.86 * R + 40, display_font(size), (*ink, 255))
    centered(draw, " · ".join(album["artists"]), C + 0.5 * R, serif_font(34), (*ink, 230))
    footer(img, album, catalog_no, ink)
    return finish(img, album, catalog_no)


def style_minimal(album, catalog_no, art_path, *, dark: bool):
    """흑백 면에 작은 글자 몇 줄만 두는 절제된 방식입니다."""
    base = (18, 18, 18) if dark else (238, 236, 230)
    ink = (236, 235, 230) if dark else (22, 22, 22)
    img = Image.new("RGBA", (SIZE, SIZE), (*base, 255))
    draw = ImageDraw.Draw(img)
    draw.line((C - 0.16 * R, C - 0.62 * R, C + 0.16 * R, C - 0.62 * R), fill=(*ink, 255), width=2)
    centered(draw, " ".join(album["artists"]).upper(), C - 0.78 * R, mono_font(30), (*ink, 255))
    centered(draw, album["title"], C - 0.56 * R, serif_font(34), (*ink, 255))
    footer(img, album, catalog_no, ink)
    return finish(img, album, catalog_no)


def style_silver(album, catalog_no, art_path):
    """인쇄를 최소로 해 은색 면이 드러나는 방식입니다. 색 띠 하나와 검은 글자만 찍습니다."""
    img = Image.fromarray(silver(0.0)).convert("RGBA")
    draw = ImageDraw.Draw(img)
    accent = rgb(album["colors"][0])
    w = int(0.05 * R)
    draw.ellipse((C - 0.66 * R, C - 0.66 * R, C + 0.66 * R, C + 0.66 * R), outline=(*accent, 255), width=w)
    ink = (24, 24, 26)
    arc_text(img, album["title"], 0.8, -90, display_font(52), (*ink, 255))
    arc_text(img, " · ".join(album["artists"]), 0.52, -90, serif_font(26), (*ink, 255))
    footer(img, album, catalog_no, ink)
    return finish(img, album, catalog_no)


def style_vinyl(album, catalog_no, art_path):
    """레코드처럼 검은 면에 소리골을 새기고, 가운데에 색 라벨을 둡니다."""
    _, _, r, theta = grid()
    grooves = 22 + 10 * (np.sin(r * 520) > 0.6) + 14 * (0.5 + 0.5 * np.cos(2 * (theta + 0.8))) ** 6
    gray = np.clip(grooves, 0, 255).astype(np.uint8)
    img = Image.fromarray(np.stack([gray] * 3, -1)).convert("RGBA")
    draw = ImageDraw.Draw(img)
    label = rgb(album["colors"][1])
    lr = 0.62
    draw.ellipse((C - lr * R, C - lr * R, C + lr * R, C + lr * R), fill=(*label, 255))
    ink = ink_for(label)
    arc_text(img, album["title"], 0.53, -90, display_font(46), (*ink, 255))
    arc_text(img, " · ".join(album["artists"]), 0.44, 90, serif_font(26), (*ink, 255), outside=False)
    footer(img, album, catalog_no, (200, 200, 200))
    return finish(img, album, catalog_no)


def style_target(album, catalog_no, art_path):
    """별색 세 가지로 겹친 동심원입니다."""
    a, b = rgb(album["colors"][0]), rgb(album["colors"][1])
    colors = [a, b, mix(a, b, 0.5), (240, 238, 232)]
    img = Image.new("RGBA", (SIZE, SIZE), (*a, 255))
    draw = ImageDraw.Draw(img)
    for i, radius in enumerate((0.98, 0.8, 0.62, 0.48)):
        draw.ellipse((C - radius * R, C - radius * R, C + radius * R, C + radius * R), fill=(*colors[i % len(colors)], 255))
    ink = ink_for(colors[0])
    arc_text(img, album["title"].upper(), 0.88, -90, display_font(46), (*ink, 255))
    inner = ink_for(colors[2])
    arc_text(img, " · ".join(album["artists"]), 0.54, -90, serif_font(26), (*inner, 255))
    footer(img, album, catalog_no, ink)
    return finish(img, album, catalog_no)


def style_split(album, catalog_no, art_path):
    """두 색을 사선으로 나눈 면입니다."""
    a, b = rgb(album["colors"][0]), rgb(album["colors"][1])
    dx, dy, _, _ = grid()
    top = (dx * 0.5 + dy) < -0.05
    img_arr = np.where(top[..., None], np.array(a, np.uint8), np.array(b, np.uint8))
    img = Image.fromarray(img_arr.astype(np.uint8)).convert("RGBA")
    draw = ImageDraw.Draw(img)
    centered(draw, album["title"], C - 0.8 * R + 30, display_font(78), (*ink_for(a), 255))
    centered(draw, " · ".join(album["artists"]), C + 0.48 * R, serif_font(32), (*ink_for(b), 255))
    footer(img, album, catalog_no, ink_for(b))
    return finish(img, album, catalog_no)


def style_type_ring(album, catalog_no, art_path):
    """제목을 원을 따라 여러 겹으로 되풀이합니다."""
    base = rgb(album["colors"][0])
    ink = rgb(album["colors"][1]) if abs(luminance(rgb(album["colors"][1])) - luminance(base)) > 0.35 else ink_for(base)
    img = Image.new("RGBA", (SIZE, SIZE), (*base, 255))
    word = f"{album['title']}  ·  "
    # 바깥쪽에는 가수와 음질을 두고, 그 안쪽을 제목 띠로 채웁니다.
    for radius, size, alpha in ((0.78, 34, 255), (0.66, 30, 190), (0.54, 26, 150)):
        fnt = display_font(size)
        repeat = max(1, int(2 * math.pi * radius * R / max(1, fnt.getlength(word))))
        arc_text(img, word * repeat, radius, -90, fnt, (*ink, alpha))
    arc_text(img, " · ".join(album["artists"]), 0.87, -90, serif_font(30), (*ink, 255))
    footer(img, album, catalog_no, ink)
    return finish(img, album, catalog_no)


STYLES = {
    "black_hole": style_black_hole,
    "picture": style_picture,
    "spot": style_spot,
    "minimal_dark": lambda a, c, p: style_minimal(a, c, p, dark=True),
    "minimal_light": lambda a, c, p: style_minimal(a, c, p, dark=False),
    "silver": style_silver,
    "vinyl": style_vinyl,
    "target": style_target,
    "split": style_split,
    "type_ring": style_type_ring,
}


def style_for(album: dict, index: int) -> str:
    if album["id"] in OVERRIDES:
        return OVERRIDES[album["id"]]
    choices = GENRE_STYLES.get(album["genre"], ["spot", "picture"])
    return choices[index % len(choices)]


def make_disc(album: dict, path: Path, index: int, art_path: Path) -> str:
    """디스크 라벨을 WebP로 저장하고 고른 디자인 이름을 돌려줍니다."""
    style = style_for(album, index)
    catalog_no = f"GAON-{index + 1:04d}"
    img = STYLES[style](album, catalog_no, art_path)
    img.convert("RGB").save(path, "WEBP", quality=84, method=6)
    return style
