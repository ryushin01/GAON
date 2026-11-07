#!/usr/bin/env python3
"""GAON 데모 카탈로그 생성기.

가수, 앨범, 크레딧, 가사, 순위는 모두 가상 데이터이고, 음원과 앨범 아트는 코드로 직접 합성합니다.
항목 구성은 국내 음악 서비스의 곡 상세 화면을 참고했습니다.
결과물은 public-media/ 에 만들어지며 저장소에는 올리지 않습니다.

  pip install numpy soundfile pillow
  python scripts/generate-media.py [출력 폴더]
"""
from __future__ import annotations

import json
import math
import os
import random
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFilter

# Windows 콘솔의 기본 인코딩(cp1252)으로는 한글을 출력하지 못합니다.
sys.stdout.reconfigure(encoding="utf-8")

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "public-media")
HANDWRITTEN_SECONDS = 30
GENERATED_SECONDS = 24
CHART_SIZE = 100
NOTE = {n: i for i, n in enumerate("C C# D D# E F F# G G# A A# B".split())}


def song(title, *, featuring=(), lyricists=(), composers=(), arrangers=()):
    return {
        "title": title, "featuring": list(featuring), "lyricists": list(lyricists),
        "composers": list(composers), "arrangers": list(arrangers),
    }


ALBUMS = [
    {
        "id": "bit", "title": "빛 (The Light)", "artists": ["유신"], "albumType": "싱글", "genre": "발라드",
        "agency": "가온 레코즈", "released": "2026-10-24", "rate": 96000, "bpm": 68, "root": "D",
        "colors": ("#0047AB", "#BFD7FF"),
        "tracks": [
            song("빛 (The Light)", lyricists=["유신"], composers=["유신"], arrangers=["한결"]),
            song("그림자가 머문 자리", lyricists=["유신"], composers=["유신"], arrangers=["한결"]),
            song("다시 아침", featuring=["윤슬"], lyricists=["유신"], composers=["유신"], arrangers=["한결"]),
        ],
    },
    {
        "id": "glass-city", "title": "유리 도시", "artists": ["루멘 트리오"], "albumType": "정규", "genre": "일렉트로닉",
        "agency": "프리즘 사운드", "released": "2026-09-12", "rate": 192000, "bpm": 112, "root": "A",
        "colors": ("#0B1F4B", "#22D3EE"),
        "tracks": [
            song("네온 레인", featuring=["윤슬"], lyricists=["서다온"], composers=["루멘 트리오"], arrangers=["루멘 트리오"]),
            song("고층의 정원", lyricists=["서다온"], composers=["루멘 트리오"], arrangers=["강이든"]),
            song("마지막 지하철", lyricists=["강이든"], composers=["루멘 트리오"], arrangers=["강이든"]),
        ],
    },
    {
        "id": "paper-moon", "title": "종이 달", "artists": ["윤슬"], "albumType": "EP", "genre": "포크",
        "agency": "달빛 뮤직", "released": "2026-08-02", "rate": 88200, "bpm": 88, "root": "G",
        "colors": ("#1E3A8A", "#FDE68A"),
        "tracks": [
            song("창가의 편지", lyricists=["윤슬"], composers=["윤슬"], arrangers=["도하람"]),
            song("느린 자전거", lyricists=["윤슬"], composers=["도하람"], arrangers=["도하람"]),
            song("달을 접는 법", featuring=["유신"], lyricists=["윤슬"], composers=["윤슬", "유신"], arrangers=["도하람"]),
        ],
    },
    {
        "id": "north-line", "title": "북쪽 선로", "artists": ["오로라 클럽"], "albumType": "정규", "genre": "재즈",
        "agency": "블루노트 서울", "released": "2025-12-20", "rate": 96000, "bpm": 96, "root": "F",
        "colors": ("#312E81", "#A5B4FC"),
        "tracks": [
            song("눈 내리는 플랫폼", composers=["민경하"], arrangers=["오로라 클럽"]),
            song("난로 앞 블루스", lyricists=["민경하"], composers=["민경하"], arrangers=["오로라 클럽"]),
            song("종착역", composers=["오로라 클럽"], arrangers=["오로라 클럽"]),
        ],
    },
    {
        "id": "tide-pool", "title": "조수 웅덩이", "artists": ["해무"], "albumType": "EP", "genre": "앰비언트",
        "agency": "프리즘 사운드", "released": "2025-04-11", "rate": 192000, "bpm": 64, "root": "C",
        "colors": ("#134E4A", "#5EEAD4"),
        "tracks": [
            song("얕은 빛", composers=["해무"], arrangers=["해무"]),
            song("소금 냄새", composers=["해무"], arrangers=["해무"]),
            song("밀물", composers=["해무"], arrangers=["해무"]),
        ],
    },
    {
        "id": "small-orbit", "title": "작은 궤도", "artists": ["모노레일", "서다온"], "albumType": "정규", "genre": "신스팝",
        "agency": "가온 레코즈", "released": "2024-02-28", "rate": 96000, "bpm": 120, "root": "E",
        "colors": ("#1D4ED8", "#F0ABFC"),
        "tracks": [
            song("위성 라디오", lyricists=["서다온"], composers=["모노레일"], arrangers=["모노레일"]),
            song("중력 없는 오후", featuring=["루멘 트리오"], lyricists=["서다온"], composers=["모노레일"], arrangers=["강이든"]),
            song("돌아오는 길", lyricists=["서다온"], composers=["모노레일", "서다온"], arrangers=["모노레일"]),
        ],
    },
]

ARTISTS = [
    {"name": "유신", "role": "싱어송라이터"},
    {"name": "윤슬", "role": "포크 싱어"},
    {"name": "루멘 트리오", "role": "일렉트로닉 트리오"},
    {"name": "오로라 클럽", "role": "재즈 밴드"},
    {"name": "해무", "role": "앰비언트 프로듀서"},
    {"name": "모노레일", "role": "신스팝 듀오"},
    {"name": "서다온", "role": "싱어"},
]

EXTRA_ARTISTS = [
    ("하늘새", "싱어"), ("밤의 정원", "인디 밴드"), ("차가을", "싱어송라이터"), ("코발트 스트리트", "얼터너티브 밴드"),
    ("온새미", "R&B 싱어"), ("파도소리단", "포크 듀오"), ("미르내", "싱어"), ("라임 트레인", "신스팝 밴드"),
    ("이안개", "재즈 보컬"), ("겨울잠", "로파이 프로듀서"), ("새벽반", "록 밴드"), ("다솜", "발라드 싱어"),
    ("시월의 창", "어쿠스틱 듀오"), ("노을정류장", "인디 밴드"), ("한아름", "싱어"), ("블루 벤치", "시티팝 밴드"),
    ("가람", "래퍼"), ("은하철길", "일렉트로닉 듀오"), ("별하", "댄스 싱어"), ("초록 라디오", "포크 밴드"),
    ("여울", "R&B 싱어"), ("낮달", "드림팝 밴드"), ("수피아", "클래식 크로스오버"), ("지평선 클럽", "재즈 밴드"),
    ("토요일의 소년들", "록 밴드"), ("나린", "싱어"), ("미드나잇 빵집", "로파이 듀오"), ("아라", "댄스 싱어"),
]
EXTRA_GENRES = {
    "싱어": "발라드", "인디 밴드": "인디", "싱어송라이터": "포크", "얼터너티브 밴드": "록", "R&B 싱어": "R&B",
    "포크 듀오": "포크", "신스팝 밴드": "신스팝", "재즈 보컬": "재즈", "로파이 프로듀서": "로파이", "록 밴드": "록",
    "발라드 싱어": "발라드", "어쿠스틱 듀오": "포크", "시티팝 밴드": "시티팝", "래퍼": "힙합", "일렉트로닉 듀오": "일렉트로닉",
    "댄스 싱어": "댄스", "포크 밴드": "포크", "드림팝 밴드": "인디", "클래식 크로스오버": "클래식", "재즈 밴드": "재즈", "로파이 듀오": "로파이",
}
TITLE_A = ["늦은", "푸른", "작은", "오래된", "낯선", "조용한", "따뜻한", "먼", "흐린", "맑은", "느린", "깊은", "하얀", "젖은"]
TITLE_B = ["골목", "편지", "여름", "정류장", "파도", "새벽", "창문", "계단", "기차", "노래", "우산", "별자리", "바람", "오후", "방", "숲", "약속", "불빛"]
TITLE_C = ["Midnight Walk", "Afterglow", "Slow Motion", "Paper Plane", "Blue Note", "Daydream", "Echoes", "Static", "Homebound", "Satellite"]
WRITERS = ["강이든", "도하람", "민경하", "한결", "서다온", "이로운", "정마루", "백하윤", "신나래", "오지호"]
AGENCIES = ["가온 레코즈", "프리즘 사운드", "달빛 뮤직", "블루노트 서울", "새봄 엔터테인먼트", "파란문 레이블"]
COLOR_PAIRS = [
    ("#0047AB", "#93C5FD"), ("#0B1F4B", "#38BDF8"), ("#1E3A8A", "#FCD34D"), ("#312E81", "#C4B5FD"), ("#134E4A", "#6EE7B7"),
    ("#1D4ED8", "#F9A8D4"), ("#0F172A", "#60A5FA"), ("#1E40AF", "#FDBA74"), ("#172554", "#67E8F9"), ("#075985", "#E0F2FE"),
]


def build_generated_albums():
    """TOP 100을 채울 가상 앨범을 항상 같은 결과로 만듭니다."""
    rng = random.Random(1004)
    used = {t["title"] for a in ALBUMS for t in a["tracks"]}

    def title():
        while True:
            value = rng.choice(TITLE_C) if rng.random() < 0.18 else f"{rng.choice(TITLE_A)} {rng.choice(TITLE_B)}"
            if value not in used:
                used.add(value)
                return value

    names = [name for name, _ in EXTRA_ARTISTS]
    albums = []
    for i, (name, role) in enumerate(EXTRA_ARTISTS):
        genre = EXTRA_GENRES[role]
        writers = [name] if role in ("싱어송라이터", "로파이 프로듀서", "래퍼") else rng.sample(WRITERS, 2)
        tracks = []
        for _ in range(3):
            guest = [g for g in rng.sample(names, 1) if g != name and rng.random() < 0.18]
            tracks.append(song(title(), featuring=guest, lyricists=writers[:1], composers=writers, arrangers=[rng.choice(WRITERS)]))
        year = 2018 + i % 9
        albums.append({
            "id": f"album-{i + 1:02d}", "title": title(), "artists": [name],
            "albumType": rng.choice(["정규", "EP", "싱글"]), "genre": genre, "agency": rng.choice(AGENCIES),
            "released": f"{year}-{rng.randint(1, 10):02d}-{rng.randint(1, 28):02d}",
            "rate": 192000 if i % 7 == 3 else (88200 if i % 5 == 2 else 96000),
            "bpm": rng.randint(66, 128), "root": rng.choice(list(NOTE)), "colors": COLOR_PAIRS[i % len(COLOR_PAIRS)],
            "seconds": GENERATED_SECONDS, "tracks": tracks,
        })
    return albums


for _album in ALBUMS:
    _album["seconds"] = HANDWRITTEN_SECONDS
ALBUMS.extend(build_generated_albums())
ARTISTS.extend({"name": name, "role": role} for name, role in EXTRA_ARTISTS)

# 이 곡은 차트 1위로 고정합니다.
PINNED_FIRST = "bit-1"

BIT_LYRICS = [
    "닫힌 창틈으로 새어 든 아침", "내 이름을 조용히 불러 준 너", "어둠에 익숙해진 두 눈 위로",
    "한 줌의 온기가 내려앉아요", "멀리 돌아온 길의 끝에서", "나는 다시 고개를 들어요",
    "너는 내게 빛", "오래도록 꺼지지 않을 빛",
]
LYRIC_POOL = [
    "아직 이름 없는 새벽이 와요", "창문 너머 파란빛이 번지고", "멈춘 시계 위로 숨을 고르면",
    "잊었던 노래가 다시 들려요", "조용히 흔들리는 물결처럼", "우리는 천천히 멀어져 가요",
    "손끝에 남은 온기를 따라", "오늘의 끝까지 걸어가요", "빛이 지나간 자리마다",
    "작은 소리들이 피어나요", "돌아보면 그곳에 있을까요", "파란 하루가 다시 시작돼요",
]

MODE = {
    "ambient": [(0, [0, 7, 14, 16]), (5, [0, 7, 11, 16]), (9, [0, 7, 12, 15]), (7, [0, 7, 12, 14])],
    "pop": [(0, [0, 4, 7, 12]), (7, [0, 4, 7, 12]), (9, [0, 3, 7, 12]), (5, [0, 4, 7, 12])],
    "jazz": [(0, [0, 4, 11, 14]), (9, [0, 3, 10, 14]), (2, [0, 3, 10, 14]), (7, [0, 4, 10, 13])],
}
GENRE_MODE = {"앰비언트": "ambient", "재즈": "jazz"}


def midi_hz(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def tone(freq, seconds, rate, *, harmonics, attack, decay, phase=0.0):
    """배음을 나이퀴스트 아래까지 쌓은 음 하나."""
    t = np.arange(int(seconds * rate), dtype=np.float64) / rate
    out = np.zeros_like(t)
    for n, gain in harmonics:
        f = freq * n
        if f < rate * 0.45:
            out += gain * np.sin(2 * np.pi * f * t + phase * n)
    env = (1 - np.exp(-t / attack)) * np.exp(-t / decay)
    return out * env


def place(buf, sig, start):
    start = int(start)
    if start >= len(buf):
        return
    end = min(len(buf), start + len(sig))
    buf[start:end] += sig[: end - start]


def synthesize(album, index, rng: random.Random):
    rate = album["rate"]
    seconds = album["seconds"]
    frames = seconds * rate
    left = np.zeros(frames)
    right = np.zeros(frames)
    beat = 60 / album["bpm"]
    bar = beat * 4
    root = 48 + NOTE[album["root"]] + rng.choice([-2, 0, 0, 3])
    mode = MODE[GENRE_MODE.get(album["genre"], "pop")]
    prog = mode[index % len(mode):] + mode[: index % len(mode)]

    pad_h = [(1, 1.0), (2, 0.38), (3, 0.16), (4, 0.08), (6, 0.03)]
    pluck_h = [(1, 1.0), (2, 0.55), (3, 0.3), (5, 0.16), (8, 0.08), (13, 0.04), (21, 0.02)]
    bass_h = [(1, 1.0), (2, 0.25), (3, 0.08)]
    pattern = rng.sample([0, 1, 2, 3, 2, 1, 3, 0], 8)

    for b in range(int(seconds / bar) + 1):
        offset, chord = prog[b % len(prog)]
        start = b * bar * rate
        for i, interval in enumerate(chord):
            sig = tone(midi_hz(root + offset + interval), bar * 1.5, rate,
                       harmonics=pad_h, attack=bar * 0.25, decay=bar * 1.4, phase=i) * 0.055
            pan = 0.5 + 0.28 * math.sin(i * 1.7 + b)
            place(left, sig * (1 - pan), start)
            place(right, sig * pan, start)
        sig = tone(midi_hz(root + offset - 12), bar, rate, harmonics=bass_h, attack=0.02, decay=bar * 0.6) * 0.16
        place(left, sig, start)
        place(right, sig, start)
        if b >= 2:  # 인트로 뒤에 아르페지오가 들어옵니다.
            for step in range(8):
                note = chord[pattern[step] % len(chord)] + 12
                sig = tone(midi_hz(root + offset + note), beat * 2, rate,
                           harmonics=pluck_h, attack=0.004, decay=beat * 0.5) * 0.085
                pan = 0.5 + 0.35 * math.sin(step * 0.9)
                at = start + step * beat / 2 * rate
                place(left, sig * (1 - pan), at)
                place(right, sig * pan, at)

    # 간단한 교차 딜레이로 공간감을 줍니다.
    delay = int(beat * 0.75 * rate)
    wet_l, wet_r = np.zeros(frames), np.zeros(frames)
    wet_l[delay:] = right[:-delay] * 0.28
    wet_r[delay:] = left[:-delay] * 0.28
    wet_l[2 * delay:] += left[:-2 * delay] * 0.1
    wet_r[2 * delay:] += right[:-2 * delay] * 0.1
    audio = np.stack([left + wet_l, right + wet_r], axis=1)

    fade = int(rate * 2.5)
    ramp = np.linspace(0, 1, fade)
    audio[:fade] *= ramp[:, None]
    audio[-fade:] *= ramp[::-1, None]
    return audio / max(1e-9, np.abs(audio).max()) * 0.89


def hex_rgb(value):
    return tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))


def make_art(album, path: Path, seed: int):
    """글자 없는 정사각형 추상 앨범 아트."""
    size = 1024
    rng = random.Random(seed)
    a, b = np.array(hex_rgb(album["colors"][0])), np.array(hex_rgb(album["colors"][1]))
    y, x = np.mgrid[0:size, 0:size] / size
    mix = np.clip((x * 0.45 + y * 0.75) ** 1.4, 0, 1)[..., None]
    base = Image.fromarray(np.uint8(a * (1 - mix) + b * mix))

    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for _ in range(7):
        r = rng.randint(90, 380)
        cx, cy = rng.randint(0, size), rng.randint(0, size)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(255, 255, 255, rng.randint(40, 120)), width=rng.randint(2, 9))
    r = rng.randint(130, 240)
    cx, cy = rng.randint(300, 720), rng.randint(280, 640)
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*hex_rgb(album["colors"][1]), 215))
    base = Image.alpha_composite(base.convert("RGBA"), layer.filter(ImageFilter.GaussianBlur(1.2)))
    base.convert("RGB").save(path, "JPEG", quality=88, optimize=True)


def main():
    (OUT / "audio").mkdir(parents=True, exist_ok=True)
    (OUT / "art").mkdir(parents=True, exist_ok=True)
    albums, tracks = [], []
    rng = random.Random(20261106)

    for album_index, album in enumerate(ALBUMS):
        art = f"art/{album['id']}.jpg"
        make_art(album, OUT / art, album_index + 7)
        ids = []
        for i, meta in enumerate(album["tracks"]):
            track_id = f"{album['id']}-{i + 1}"
            rel = f"audio/{track_id}.flac"
            audio = synthesize(album, i, rng)
            # FLAC은 수정 모드를 지원하지 않아 쓰기 전에 태그를 넣습니다.
            with sf.SoundFile(OUT / rel, "w", samplerate=album["rate"], channels=2, format="FLAC", subtype="PCM_24") as f:
                f.title = meta["title"]
                f.artist = ", ".join(album["artists"])
                f.album = album["title"]
                f.write(audio)
            info = sf.info(OUT / rel)
            has_lyrics = bool(meta["lyricists"])
            lines = BIT_LYRICS if track_id == PINNED_FIRST else rng.sample(LYRIC_POOL, 8)
            tracks.append({
                "id": track_id, "albumId": album["id"], "title": meta["title"], "artists": album["artists"],
                "featuring": meta["featuring"], "albumTitle": album["title"], "genre": album["genre"],
                "released": album["released"], "trackNumber": i + 1, "isTitleTrack": i == 0,
                "lyricists": meta["lyricists"], "composers": meta["composers"], "arrangers": meta["arrangers"],
                "durationSec": round(info.duration, 3), "sampleRate": info.samplerate, "bitDepth": 24,
                "channels": info.channels, "fileSize": os.path.getsize(OUT / rel),
                "audioPath": rel, "artPath": art,
                "likes": rng.randint(800, 48000),
                "lyrics": [{"t": 2 + n * (album["seconds"] - 4) / len(lines), "text": line} for n, line in enumerate(lines)] if has_lyrics else [],
            })
            ids.append(track_id)
            print(f"{rel}: {info.samplerate} Hz, {os.path.getsize(OUT / rel) / 1e6:.1f} MB", flush=True)
        albums.append({
            "id": album["id"], "title": album["title"], "artists": album["artists"], "albumType": album["albumType"],
            "genre": album["genre"], "agency": album["agency"], "released": album["released"],
            "artPath": art, "trackIds": ids,
        })

    # 차트 순위와 변동은 데모용 가상 값입니다.
    order = [t for t in tracks if t["id"] != PINNED_FIRST]
    rng.shuffle(order)
    order.insert(0, next(t for t in tracks if t["id"] == PINNED_FIRST))
    for rank, track in enumerate(order, 1):
        ranked = rank <= CHART_SIZE
        track["rank"] = rank if ranked else None
        is_new = ranked and rng.random() < 0.06
        track["isNew"] = is_new
        track["rankChange"] = 0 if rank == 1 or is_new or not ranked else rng.choice([0, 0, 0, 1, 1, 2, 3, 5, 8, -1, -1, -2, -4, -7])

    catalog = {"version": 1, "artists": ARTISTS, "albums": albums, "tracks": sorted(tracks, key=lambda t: t["rank"] or 10_000)}
    (OUT / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=1), encoding="utf-8")
    total = sum(t["fileSize"] for t in tracks) / 1e6
    print(f"완료: 앨범 {len(albums)}장, 곡 {len(tracks)}개, {total:.0f} MB")


if __name__ == "__main__":
    main()
