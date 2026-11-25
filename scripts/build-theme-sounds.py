#!/usr/bin/env python3
"""Build the Weihnachten (christmas) and Hintergrund (ambience) sounds.

Run after scripts/build-sounds.py. It downloads the CC0 sources (if missing),
synthesizes the self-made clips, encodes mono 64 kbps MP3, and merges the
clips into public/sounds/manifest.json and the table in CREDITS.md.

Ambience clips are cut as seamless loops: the tail of the segment is
crossfaded into its head, so the clip can be laid end to end.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RAW = Path("/tmp/sfx-raw-2")
OUT = ROOT / "public" / "sounds"
SR = 44100
CC0 = "CC0 1.0 Universal (public domain)"

FS = "https://cdn.freesound.org/previews"
OGA = "https://opengameart.org/sites/default/files"

# local name -> download URL (Freesound previews are the HQ MP3 previews of CC0 sounds)
SOURCES = {
    "fs-235465.mp3": f"{FS}/235/235465_3843719-hq.mp3",
    "fs-261006.mp3": f"{FS}/261/261006_2558531-hq.mp3",
    "fs-581834.mp3": f"{FS}/581/581834_6904485-hq.mp3",
    "fs-480014.mp3": f"{FS}/480/480014_2524442-hq.mp3",
    "fs-112811.mp3": f"{FS}/112/112811_1535323-hq.mp3",
    "fs-344433.mp3": f"{FS}/344/344433_3278936-hq.mp3",
    "fs-536245.mp3": f"{FS}/536/536245_10403690-hq.mp3",
    "fs-536251.mp3": f"{FS}/536/536251_10403690-hq.mp3",
    "fs-327771.mp3": f"{FS}/327/327771_2278647-hq.mp3",
    "fs-693389.mp3": f"{FS}/693/693389_2573247-hq.mp3",
    "fs-324588.mp3": f"{FS}/324/324588_4361321-hq.mp3",
    "fs-360777.mp3": f"{FS}/360/360777_5658680-hq.mp3",
    "oga-SnowWalk.ogg": f"{OGA}/SnowWalk.ogg",
    "oga-SnowWalk2.ogg": f"{OGA}/SnowWalk2.ogg",
    "oga-storm_arwen.flac": f"{OGA}/storm_arwen_2022.flac",
    "oga-amb_rain_loop_1.ogg": f"{OGA}/amb_rain_loop_1.ogg",
    "oga-park_birds.wav": f"{OGA}/park_ambience_birds.wav",
    "oga-park_river.wav": f"{OGA}/park_ambience_river.wav",
    "oga-crickets-oneloop.mp3": f"{OGA}/crickets-oneloop.mp3",
}

FS_PAGE = "https://freesound.org/people/{}/sounds/{}/"
OGA_PAGE = "https://opengameart.org/content/{}"
SELF = "Soundsalat (own synthesis)"


def load(name: str) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(RAW / name), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def cut(x: np.ndarray, start: float, length: float) -> np.ndarray:
    return x[int(start * SR): int((start + length) * SR)]


def write_wav(path: Path, x: np.ndarray) -> None:
    peak = np.max(np.abs(x)) or 1.0
    y = np.clip(x / peak * 0.9, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((y * 32767).astype("<i2").tobytes())


def probe(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        check=True, capture_output=True, text=True,
    ).stdout
    return float(out.strip())


def encode(x: np.ndarray, dest: Path, *, loop: bool, target: float) -> float:
    """Normalize loudness (two-pass linear loudnorm) and encode mono 64 kbps MP3."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = RAW / "_tmp.wav"
    write_wav(tmp, x)
    measure = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(tmp), "-af",
         f"loudnorm=I={target}:TP=-1.5:LRA=20:print_format=json", "-f", "null", "-"],
        check=True, capture_output=True, text=True,
    ).stderr
    m = json.loads(measure[measure.rindex("{"): measure.rindex("}") + 1])
    norm = (
        f"loudnorm=I={target}:TP=-1.5:LRA=20:linear=true:"
        f"measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
        f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}"
    )
    fades = "afade=t=in:d=0.02,areverse,afade=t=in:d=0.02,areverse" if loop else \
        "afade=t=in:d=0.01,areverse,afade=t=in:d=0.08,areverse"
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(tmp),
         "-af", f"{norm},{fades}", "-ac", "1", "-ar", str(SR), "-c:a", "libmp3lame", "-b:a", "64k", str(dest)],
        check=True,
    )
    tmp.unlink()
    return round(probe(dest), 2)


def trim_silence(x: np.ndarray, threshold_db: float = -45) -> np.ndarray:
    env = np.abs(x)
    limit = np.max(env) * 10 ** (threshold_db / 20)
    idx = np.where(env > limit)[0]
    if len(idx) == 0:
        return x
    return x[max(idx[0] - int(0.01 * SR), 0): idx[-1] + int(0.05 * SR)]


def make_loop(x: np.ndarray, start: float, length: float, xfade: float = 1.5) -> np.ndarray:
    """Cut length seconds and crossfade the following xfade seconds into the head."""
    seg = cut(x, start, length + xfade)
    n, k = int(length * SR), int(xfade * SR)
    assert len(seg) >= n + k, "source too short for loop"
    out = seg[:n].copy()
    t = np.linspace(0, np.pi / 2, k)
    out[:k] = seg[:k] * np.sin(t) + seg[n:n + k] * np.cos(t)
    return out


# ---------- synthesis (own work) ----------

def note_hz(name: str) -> float:
    names = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}
    m = re.fullmatch(r"([A-G])(#?)(\d)", name)
    assert m
    semis = names[m.group(1)] + (1 if m.group(2) else 0) + (int(m.group(3)) - 4) * 12
    return 440.0 * 2 ** (semis / 12)


def bell(freq: float, dur: float, partials: list[tuple[float, float, float]]) -> np.ndarray:
    t = np.arange(int(dur * SR)) / SR
    y = np.zeros_like(t)
    for ratio, amp, decay in partials:
        if freq * ratio < SR / 2:
            y += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t / decay)
    attack = np.minimum(t / 0.003, 1)
    return y * attack


def place(track: np.ndarray, sound: np.ndarray, at: float, gain: float = 1.0) -> None:
    i = int(at * SR)
    j = min(len(track), i + len(sound))
    track[i:j] += sound[: j - i] * gain


def jingle(rng: np.random.Generator) -> np.ndarray:
    """A short shaken sleigh-bell hit: bursts of metallic, high-passed noise."""
    dur = 0.18
    t = np.arange(int(dur * SR)) / SR
    y = np.zeros_like(t)
    for f in rng.uniform(4200, 9000, 7):
        y += np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t / rng.uniform(0.03, 0.08))
    noise = rng.standard_normal(len(t)) * np.exp(-t / 0.03)
    noise = np.diff(noise, prepend=0)
    return (y * 0.12 + noise * 0.08) * np.minimum(t / 0.002, 1)


def jingle_bells() -> np.ndarray:
    """Chorus of the public-domain tune 'Jingle Bells' (Pierpont, 1857) on a glockenspiel, with sleigh bells."""
    beat = 60 / 168
    melody = [
        ("E5", 1), ("E5", 1), ("E5", 2), ("E5", 1), ("E5", 1), ("E5", 2),
        ("E5", 1), ("G5", 1), ("C5", 1.5), ("D5", 0.5), ("E5", 4),
        ("F5", 1), ("F5", 1), ("F5", 1.5), ("F5", 0.5), ("F5", 1), ("E5", 1), ("E5", 1), ("E5", 0.5), ("E5", 0.5),
        ("E5", 1), ("D5", 1), ("D5", 1), ("E5", 1), ("D5", 2), ("G5", 2),
    ]
    total = sum(d for _, d in melody) * beat + 1.6
    track = np.zeros(int(total * SR))
    glock = [(1, 1.0, 0.9), (2.76, 0.35, 0.25), (5.4, 0.18, 0.1), (8.93, 0.06, 0.05)]
    t = 0.05
    for name, d in melody:
        place(track, bell(note_hz(name), 1.6, glock), t, 0.5)
        t += d * beat
    rng = np.random.default_rng(7)
    beats = int(sum(d for _, d in melody))
    for i in range(beats):
        place(track, jingle(rng), 0.05 + i * beat, 1.0 if i % 2 == 0 else 0.7)
    # bass on the strong beats (C and G)
    bass = [("C4", 0), ("C4", 4), ("C4", 8), ("C4", 12), ("F3", 16), ("C4", 20), ("G3", 24), ("G3", 28)]
    for name, b in bass:
        place(track, bell(note_hz(name), 1.2, [(1, 1.0, 0.5), (2, 0.2, 0.2)]), 0.05 + b * beat, 0.25)
    return track


def music_box() -> np.ndarray:
    """'O Tannenbaum' (traditional, public domain) on a music box that slowly winds down."""
    melody = [
        ("D5", 1), ("G5", 0.75), ("G5", 0.25), ("G5", 1.5), ("A5", 0.5), ("B5", 0.75), ("B5", 0.25), ("B5", 1.5),
        ("B5", 0.5), ("A5", 0.5), ("B5", 0.5), ("C6", 1), ("F#5", 1), ("A5", 1), ("G5", 2),
    ]
    tines = [(1, 1.0, 1.1), (3.0, 0.08, 0.3), (5.9, 0.12, 0.12), (12.0, 0.03, 0.03)]
    beat = 0.5
    total = sum(d for _, d in melody) * beat * 1.35 + 2.2
    track = np.zeros(int(total * SR))
    t, slow = 0.05, 1.0
    rng = np.random.default_rng(3)
    for i, (name, d) in enumerate(melody):
        tone = bell(note_hz(name), 2.2, tines)
        click = rng.standard_normal(int(0.004 * SR)) * 0.08
        place(track, tone, t, 0.5)
        place(track, click, t)
        if i in (2, 6, 11, 14):  # harmony note on strong beats
            place(track, bell(note_hz(name) / 2, 2.0, tines), t, 0.25)
        t += d * beat * slow
        if i > 9:
            slow *= 1.07
    return track


def snow_steps() -> np.ndarray:
    a, b = trim_silence(load("oga-SnowWalk.ogg")), trim_silence(load("oga-SnowWalk2.ogg"))
    track = np.zeros(int(4.2 * SR))
    for i in range(7):
        step = a if i % 2 == 0 else b
        place(track, step, 0.05 + i * 0.56, 1.0 if i % 2 == 0 else 0.85)
    return track


def sleigh_ride() -> np.ndarray:
    hooves = cut(load("fs-581834.mp3"), 2.0, 8.0)
    bells = cut(load("fs-261006.mp3"), 16.0, 8.0)
    n = min(len(hooves), len(bells))
    h = hooves[:n] / (np.sqrt(np.mean(hooves[:n] ** 2)) + 1e-9)
    s = bells[:n] / (np.sqrt(np.mean(bells[:n] ** 2)) + 1e-9)
    return h * 0.8 + s * 0.6


# id slug, label, icon (fallback IconName), builder, author, page, note
CHRISTMAS = [
    ("schlitten", "Schlittenglocken", "bell", lambda: cut(load("fs-235465.mp3"), 0, 7.5),
     "jcdecha", FS_PAGE.format("jcdecha", 235465)),
    ("rentier", "Rentier-Schlitten", "horse", sleigh_ride,
     "MrFizzywig (hooves) and Zott820 (sleigh bells), mixed", FS_PAGE.format("MrFizzywig", 581834) + " and " + FS_PAGE.format("Zott820", 261006)),
    ("jinglebells", "Jingle Bells", "music", jingle_bells, SELF, "scripts/build-theme-sounds.py (tune: James Lord Pierpont, 1857, public domain)"),
    ("stapfen", "Schnee-Stapfen", "drum", snow_steps, "IgnasD (steps arranged here)", OGA_PAGE.format("walking-on-snow-sound")),
    ("kirchenglocken", "Kirchenglocken", "bell", lambda: cut(load("fs-480014.mp3"), 0, 10),
     "craigsmith", FS_PAGE.format("craigsmith", 480014)),
    ("kamin", "Kaminfeuer", "flame", lambda: cut(load("fs-112811.mp3"), 2, 10),
     "Julien_Matthey", FS_PAGE.format("Julien_Matthey", 112811)),
    ("geschenk", "Geschenkpapier", "note", lambda: cut(load("fs-344433.mp3"), 0, 5),
     "GrayJoy", FS_PAGE.format("GrayJoy", 344433)),
    ("hohoho", "Ho ho ho", "stars", lambda: cut(load("fs-536245.mp3"), 0, 6.7),
     "Cloud-10", FS_PAGE.format("Cloud-10", 536245)),
    ("spieluhr", "Spieluhr", "music", music_box, SELF, "scripts/build-theme-sounds.py (tune: O Tannenbaum, traditional, public domain)"),
    ("winterzauber", "Winterzauber", "sparkle", lambda: load("fs-536251.mp3"),
     "Cloud-10", FS_PAGE.format("Cloud-10", 536251)),
]

# id slug, label, icon, source, start, length, author, page
AMBIENCE = [
    ("wind", "Wind", "wave", "fs-327771.mp3", 0.0, 12, "Jeffreys2", FS_PAGE.format("Jeffreys2", 327771)),
    ("meer", "Meer", "wave", "fs-693389.mp3", 10.0, 14, "derjuli", FS_PAGE.format("derjuli", 693389)),
    ("sturm", "Sturm", "wave", "oga-storm_arwen.flac", 50.0, 14, "Tsorthan Grove", OGA_PAGE.format("storm-arwen-2022")),
    ("regen", "Regen", "wave", "oga-amb_rain_loop_1.ogg", 0.0, 12, "Kresiek The Furry", OGA_PAGE.format("amb-rain-loop-1")),
    ("gewitter", "Gewitter", "sparkle", "fs-324588.mp3", 1.0, 14, "humanoide9000", FS_PAGE.format("humanoide9000", 324588)),
    ("wald", "Wald", "bird", "oga-park_birds.wav", 60.0, 14, "Thimras", OGA_PAGE.format("park-ambiences")),
    ("bach", "Bach", "wave", "oga-park_river.wav", 60.0, 12, "Thimras", OGA_PAGE.format("park-ambiences")),
    ("grillen", "Grillen", "stars", "oga-crickets-oneloop.mp3", 0.0, 12, "Wolfgang_", OGA_PAGE.format("crickets-ambient-noise-loopable")),
    ("stadt", "Stadt", "castle", "fs-360777.mp3", 40.0, 14, "dnlburnett", FS_PAGE.format("dnlburnett", 360777)),
]


# ---------- sounds for the Weihnachts-Hörbücher (story list) ----------
# Freesound CC0 sounds used by the story tiles: id -> (user, HQ preview URL)
FS_PICKS = {
    '196631': ('FuriousGinger', 'https://cdn.freesound.org/previews/196/196631_2013714-hq.mp3'),
    '54505': ('moxobna', 'https://cdn.freesound.org/previews/54/54505_43834-hq.mp3'),
    '108519': ('bsmacbride', 'https://cdn.freesound.org/previews/108/108519_1338699-hq.mp3'),
    '156098': ('marcolo91', 'https://cdn.freesound.org/previews/156/156098_2365601-hq.mp3'),
    '239006': ('squashy555', 'https://cdn.freesound.org/previews/239/239006_1149179-hq.mp3'),
    '267930': ('anagar', 'https://cdn.freesound.org/previews/267/267930_2198771-hq.mp3'),
    '250133': ('FngerSounds', 'https://cdn.freesound.org/previews/250/250133_4149794-hq.mp3'),
    '234735': ('FenrirFangs', 'https://cdn.freesound.org/previews/234/234735_3635427-hq.mp3'),
    '829283': ('megahope', 'https://cdn.freesound.org/previews/829/829283_17979996-hq.mp3'),
    '433921': ('Kalibrk', 'https://cdn.freesound.org/previews/433/433921_3618969-hq.mp3'),
    '192761': ('ryuuzan', 'https://cdn.freesound.org/previews/192/192761_475267-hq.mp3'),
    '82610': ('indigosierra', 'https://cdn.freesound.org/previews/82/82610_1316563-hq.mp3'),
    '365520': ('Caitlin_100', 'https://cdn.freesound.org/previews/365/365520_5407590-hq.mp3'),
    '326460': ('miekyj', 'https://cdn.freesound.org/previews/326/326460_5639585-hq.mp3'),
    '181773': ('keweldog', 'https://cdn.freesound.org/previews/181/181773_3153523-hq.mp3'),
    '103072': ('iggy1345', 'https://cdn.freesound.org/previews/103/103072_1045209-hq.mp3'),
    '272035': ('aldenroth2', 'https://cdn.freesound.org/previews/272/272035_5165013-hq.mp3'),
    '371704': ('Mrthenoronha', 'https://cdn.freesound.org/previews/371/371704_2402876-hq.mp3'),
    '110011': ('tuberatanka', 'https://cdn.freesound.org/previews/110/110011_1537422-hq.mp3'),
    '130388': ('olver', 'https://cdn.freesound.org/previews/130/130388_2037384-hq.mp3'),
    '188043': ('AntumDeluge', 'https://cdn.freesound.org/previews/188/188043_3403708-hq.mp3'),
    '17012': ('cognito perceptu', 'https://cdn.freesound.org/previews/17/17012_57789-hq.mp3'),
    '457043': ('Breviceps', 'https://cdn.freesound.org/previews/457/457043_9159316-hq.mp3'),
    '202101': ('spookymodem', 'https://cdn.freesound.org/previews/202/202101_3756348-hq.mp3'),
    '553886': ('sukondi', 'https://cdn.freesound.org/previews/553/553886_12361046-hq.mp3'),
    '398750': ('Anthousai', 'https://cdn.freesound.org/previews/398/398750_5923045-hq.mp3'),
    '640855': ('Moulaythami', 'https://cdn.freesound.org/previews/640/640855_10196790-hq.mp3'),
    '855901': ('TheKingOfGeeks360', 'https://cdn.freesound.org/previews/855/855901_15895934-hq.mp3'),
    '241032': ('flashdeejay', 'https://cdn.freesound.org/previews/241/241032_3900275-hq.mp3'),
    '268500': ('wjtaylor', 'https://cdn.freesound.org/previews/268/268500_4989900-hq.mp3'),
    '240125': ('mdayalan', 'https://cdn.freesound.org/previews/240/240125_1061768-hq.mp3'),
    '182507': ('swiftoid', 'https://cdn.freesound.org/previews/182/182507_854782-hq.mp3'),
    '673424': ('courtneyeck', 'https://cdn.freesound.org/previews/673/673424_13324371-hq.mp3'),
    '61059': ('xef6', 'https://cdn.freesound.org/previews/61/61059_607076-hq.mp3'),
    '480699': ('craigsmith', 'https://cdn.freesound.org/previews/480/480699_2524442-hq.mp3'),
    '119459': ('Eneasz', 'https://cdn.freesound.org/previews/119/119459_2103700-hq.mp3'),
    '163459': ('LittleBigSounds', 'https://cdn.freesound.org/previews/163/163459_2965892-hq.mp3'),
    '233065': ('LukeUPF', 'https://cdn.freesound.org/previews/233/233065_4207519-hq.mp3'),
    '435748': ('RICHERlandTV', 'https://cdn.freesound.org/previews/435/435748_3450800-hq.mp3'),
    '118960': ('esperri', 'https://cdn.freesound.org/previews/118/118960_1990695-hq.mp3'),
    '465697': ('Breviceps', 'https://cdn.freesound.org/previews/465/465697_9159316-hq.mp3'),
    '316923': ('Rudmer_Rotteveel', 'https://cdn.freesound.org/previews/316/316923_4921277-hq.mp3'),
    '593623': ('Rehanjo', 'https://cdn.freesound.org/previews/593/593623_12589944-hq.mp3'),
    '28010': ('Konamiuss', 'https://cdn.freesound.org/previews/28/28010_130583-hq.mp3'),
    '378059': ('bajko', 'https://cdn.freesound.org/previews/378/378059_2341984-hq.mp3'),
    '445117': ('Breviceps', 'https://cdn.freesound.org/previews/445/445117_9159316-hq.mp3'),
    '242677': ('Reitanna', 'https://cdn.freesound.org/previews/242/242677_950925-hq.mp3'),
    '596517': ('EugeneEverett', 'https://cdn.freesound.org/previews/596/596517_10974703-hq.mp3'),
    '364740': ('newagesoup', 'https://cdn.freesound.org/previews/364/364740_4067257-hq.mp3'),
    '696746': ('Krokulator', 'https://cdn.freesound.org/previews/696/696746_13579627-hq.mp3'),
    '371342': ('Iamgiorgio', 'https://cdn.freesound.org/previews/371/371342_5302340-hq.mp3'),
    '840937': ('Anilan', 'https://cdn.freesound.org/previews/840/840937_10900574-hq.mp3'),
    '213259': ('maurolupo', 'https://cdn.freesound.org/previews/213/213259_3931578-hq.mp3'),
    '42812': ('KidsCastTechy', 'https://cdn.freesound.org/previews/42/42812_455898-hq.mp3'),
    '852386': ('TheKingOfGeeks360', 'https://cdn.freesound.org/previews/852/852386_15895934-hq.mp3'),
    '191823': ('Denis Chapon', 'https://cdn.freesound.org/previews/191/191823_1868374-hq.mp3'),
    '347237': ('BraveFrog', 'https://cdn.freesound.org/previews/347/347237_6323390-hq.mp3'),
    '206171': ('ahill86', 'https://cdn.freesound.org/previews/206/206171_2568776-hq.mp3'),
    '393801': ('HowardV', 'https://cdn.freesound.org/previews/393/393801_1654262-hq.mp3'),
    '59245': ('Zozzy', 'https://cdn.freesound.org/previews/59/59245_91975-hq.mp3'),
    '182509': ('swiftoid', 'https://cdn.freesound.org/previews/182/182509_854782-hq.mp3'),
    '560692': ('StarNinjas37', 'https://cdn.freesound.org/previews/560/560692_10936067-hq.mp3'),
    '620539': ('AbolGuga', 'https://cdn.freesound.org/previews/620/620539_13128969-hq.mp3'),
    '815100': ('Kinoton', 'https://cdn.freesound.org/previews/815/815100_2247456-hq.mp3'),
}

REPO_SOUNDS = ROOT / "public" / "sounds"


def fs(sid: int | str) -> np.ndarray:
    return load(f"fs-{sid}.mp3")


def fs_page(sid: int | str) -> str:
    user = FS_PICKS[str(sid)][0]
    return FS_PAGE.format(user.replace(" ", "%20"), sid)


def repo_clip(rel: str) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(REPO_SOUNDS / rel), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def rms_norm(x: np.ndarray) -> np.ndarray:
    return x / (np.sqrt(np.mean(x ** 2)) + 1e-9)


def resample(x: np.ndarray, rate) -> np.ndarray:
    """Play x at a speed (scalar or per-output-sample array); <1 is slower and lower."""
    if np.isscalar(rate):
        idx = np.arange(0, len(x) - 1, rate)
    else:
        idx = np.cumsum(rate)
        idx = idx[idx < len(x) - 1]
    return np.interp(idx, np.arange(len(x)), x)


def lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def fade_tail(x: np.ndarray, seconds: float) -> np.ndarray:
    n = min(len(x), int(seconds * SR))
    y = x.copy()
    y[-n:] *= np.linspace(1, 0, n)
    return y


PIANO = [(1, 1.0, 0.9), (2, 0.45, 0.5), (3, 0.25, 0.3), (4, 0.12, 0.2), (5, 0.06, 0.15), (6, 0.03, 0.1)]
MARIMBA = [(1, 1.0, 0.45), (3.98, 0.25, 0.08), (9.9, 0.06, 0.03)]
CELESTA = [(1, 1.0, 1.0), (2, 0.2, 0.4), (4.1, 0.08, 0.15)]


def song(melody, beat, timbre, gain=0.5, start=0.05, tail=1.6, chords=None, chord_timbre=None, chord_gain=0.18):
    total = sum(d for _, d in melody) * beat + tail + start
    track = np.zeros(int(total * SR))
    t = start
    for name, d in melody:
        if name != "-":
            place(track, bell(note_hz(name), min(d * beat + 1.2, 2.5), timbre), t, gain)
        t += d * beat
    for names, at in chords or []:
        for name in names:
            place(track, bell(note_hz(name), 2.0, chord_timbre or PIANO), start + at * beat, chord_gain)
    return track


def weihnachtsmusik() -> np.ndarray:
    """'We Wish You a Merry Christmas' (traditional English carol, public domain) with sleigh bells."""
    m = [("D4", 1), ("G4", 1), ("G4", 0.5), ("A4", 0.5), ("G4", 0.5), ("F#4", 0.5), ("E4", 1), ("E4", 1),
         ("E4", 1), ("A4", 1), ("A4", 0.5), ("B4", 0.5), ("A4", 0.5), ("G4", 0.5), ("F#4", 1), ("D4", 1),
         ("D4", 1), ("B4", 1), ("B4", 0.5), ("C5", 0.5), ("B4", 0.5), ("A4", 0.5), ("G4", 1), ("E4", 1),
         ("D4", 0.5), ("D4", 0.5), ("E4", 1), ("A4", 1), ("F#4", 1), ("G4", 2)]
    m = [(n[:-1] + str(int(n[-1]) + 1), d) for n, d in m]  # an octave up, bright
    chords = [(["G3", "B3", "D4"], 1), (["C4", "E4", "G4"], 4), (["A3", "D4", "F#4"], 7), (["B3", "D4", "G4"], 10),
              (["C4", "E4", "G4"], 13), (["D4", "F#4", "A4"], 16), (["G3", "B3", "D4"], 19)]
    track = song(m, 60 / 150, CELESTA, 0.45, chords=chords)
    rng = np.random.default_rng(11)
    for i in range(int(len(track) / SR / (60 / 150)) - 2):
        place(track, jingle(rng), 0.05 + (i + 1) * 60 / 150, 0.6 if i % 3 == 0 else 0.35)
    return track


def froehliche_musik() -> np.ndarray:
    """'Deck the Halls' (traditional Welsh tune, public domain) on a bouncy marimba."""
    m = [("G5", 1.5), ("F5", 0.5), ("E5", 1), ("D5", 1), ("C5", 1), ("D5", 1), ("E5", 1), ("C5", 1),
         ("D5", 0.5), ("E5", 0.5), ("F5", 0.5), ("D5", 0.5), ("E5", 1.5), ("D5", 0.5), ("C5", 1), ("B4", 1), ("C5", 2)]
    track = song(m, 60 / 168, MARIMBA, 0.55, tail=1.0)
    for i in range(16):  # oom-pah bass
        place(track, bell(note_hz(["C3", "G3"][i % 2] if i < 12 else ["G2", "C3"][i % 2]), 0.6, MARIMBA), 0.05 + i * 60 / 168, 0.35)
    return track


def zaubermusik() -> np.ndarray:
    """Own composition: soft rising harp-like arpeggios over a warm pad."""
    beat = 0.22
    arp = ["C5", "E5", "G5", "B5", "D6", "B5", "G5", "E5", "A4", "C5", "E5", "G5", "B5", "G5", "E5", "C5",
           "F4", "A4", "C5", "E5", "G5", "E5", "C5", "A4", "G4", "B4", "D5", "F#5", "A5", "D6", "A5", "F#5"]
    track = song([(n, 1) for n in arp], beat, CELESTA, 0.3, tail=2.5)
    t = np.arange(len(track)) / SR
    for i, chord in enumerate([["C4", "E4", "G4"], ["A3", "C4", "E4"], ["F3", "A3", "C4"], ["G3", "B3", "D4"]]):
        seg = np.zeros_like(track)
        a, b = int(i * 8 * beat * SR), int(min((i + 1) * 8 * beat + 1.0, t[-1]) * SR)
        for n in chord:
            seg[a:b] += np.sin(2 * np.pi * note_hz(n) * t[a:b])
        envl = np.zeros_like(track)
        envl[a:b] = np.sin(np.linspace(0, np.pi, b - a))
        track += seg * envl * 0.05
    return track


def nachtmusik() -> np.ndarray:
    """'Stille Nacht' (Franz Xaver Gruber, 1818, public domain), soft and slow."""
    m = [("G4", 1.5), ("A4", 0.5), ("G4", 1), ("E4", 3), ("G4", 1.5), ("A4", 0.5), ("G4", 1), ("E4", 3),
         ("D5", 2), ("D5", 1), ("B4", 3), ("C5", 2), ("C5", 1), ("G4", 3)]
    chords = [(["C3", "G3", "E4"], 0), (["C3", "G3", "E4"], 6), (["G2", "D3", "B3"], 12), (["C3", "G3", "E4"], 18)]
    soft = [(1, 1.0, 1.4), (2, 0.15, 0.6), (3, 0.05, 0.3)]
    return song(m, 0.42, soft, 0.4, tail=2.5, chords=chords, chord_timbre=soft, chord_gain=0.12)


def karussell() -> np.ndarray:
    """Own composition: a little fairground waltz on a reedy organ (oom-pah-pah)."""
    beat = 60 / 200
    m = [("C5", 1), ("E5", 1), ("G5", 1), ("G5", 2), ("E5", 1), ("F5", 1), ("D5", 1), ("B4", 1), ("G4", 3),
         ("D5", 1), ("F5", 1), ("A5", 1), ("A5", 2), ("F5", 1), ("E5", 1), ("G5", 1), ("E5", 1), ("C5", 3)]
    total = sum(d for _, d in m) * beat + 1.0
    t = np.arange(int(total * SR)) / SR
    track = np.zeros_like(t)

    def organ(freq, dur, gain):
        n = int(dur * SR)
        tt = np.arange(n) / SR
        vib = 1 + 0.004 * np.sin(2 * np.pi * 6 * tt)
        y = sum(np.sin(2 * np.pi * freq * k * vib * tt) / k for k in (1, 2, 3, 4, 6))
        envl = np.minimum(tt / 0.02, 1) * np.minimum((dur - tt) / 0.05, 1).clip(0, 1)
        return y * envl * gain

    at = 0.05
    for name, d in m:
        place(track, organ(note_hz(name), d * beat * 0.95, 0.18), at)
        at += d * beat
    bars = int(sum(d for _, d in m) / 3)
    roots = ["C3", "G2", "G2", "C3", "D3", "G2", "G2", "C3"]
    for b in range(bars):
        root = roots[b % len(roots)]
        place(track, organ(note_hz(root), beat * 0.8, 0.22), 0.05 + b * 3 * beat)
        for k in (1, 2):
            third = note_hz(root) * 2 * (2 ** (4 / 12))
            place(track, organ(third, beat * 0.5, 0.08), 0.05 + (b * 3 + k) * beat)
            place(track, organ(note_hz(root) * 3, beat * 0.5, 0.06), 0.05 + (b * 3 + k) * beat)
    return track


def klaviermusik() -> np.ndarray:
    """'Joy to the World' (Lowell Mason, 1839, public domain) on piano."""
    m = [("C5", 2), ("B4", 1.5), ("A4", 0.5), ("G4", 3), ("F4", 1), ("E4", 2), ("D4", 2), ("C4", 3),
         ("G4", 1), ("A4", 3), ("A4", 1), ("B4", 3), ("B4", 1), ("C5", 4)]
    chords = [(["C3", "G3"], 0), (["F3", "C4"], 4), (["G3", "B3"], 8), (["C3", "E3"], 12),
              (["F3", "A3"], 16), (["G3", "D4"], 20), (["C3", "E3", "G3"], 24)]
    return song(m, 60 / 132, PIANO, 0.5, chords=chords, chord_gain=0.2)


def leise_gloeckchen() -> np.ndarray:
    """Own: a few tiny, quiet bells."""
    rng = np.random.default_rng(5)
    track = np.zeros(int(3.2 * SR))
    notes = ["E6", "G6", "A6", "C7", "D7"]
    for i in range(9):
        f = note_hz(notes[rng.integers(len(notes))])
        place(track, bell(f, 1.6, [(1, 1, 0.6), (2.76, 0.3, 0.15)]), 0.05 + i * 0.22 + rng.uniform(0, 0.05), rng.uniform(0.15, 0.3))
    return track


def schlitten_fliegt() -> np.ndarray:
    """Sleigh bells (jcdecha, CC0) drifting away: slowing down, darker, quieter, with a whoosh."""
    x = cut(load("fs-235465.mp3"), 0, 5.0)
    rate = np.linspace(1.0, 0.85, int(len(x) / 0.92))
    y = resample(x, rate)
    n = len(y)
    fade = np.exp(-np.linspace(0, 4, n))
    dark = lowpass(y, 2500)
    mix = np.linspace(0, 1, n)
    y = (y * (1 - mix) + dark * mix) * fade
    rng = np.random.default_rng(2)
    noise = lowpass(rng.standard_normal(n), 900) * np.sin(np.linspace(0, np.pi, n)) ** 2
    return rms_norm(y) + rms_norm(noise) * 0.25


def wusch_plopp() -> np.ndarray:
    """Own: a whoosh followed by a cartoon plop."""
    rng = np.random.default_rng(1)
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    # sweep a simple resonant band by mixing two lowpasses
    lo, hi = lowpass(noise, 400), lowpass(noise, 3500)
    sweep = (t / t[-1]) ** 1.5
    out = (lo * (1 - sweep) + (hi - lo) * sweep) * np.sin(np.pi * t / t[-1]) ** 2
    track = np.zeros(int(1.3 * SR))
    place(track, rms_norm(out) * 0.25, 0.0)
    m = int(0.12 * SR)
    tt = np.arange(m) / SR
    freq = 900 * np.exp(-tt * 14) + 250
    plop = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-tt * 30)
    place(track, plop * 0.9, 0.78)
    return track


def boing() -> np.ndarray:
    """Own: a springy cartoon boing."""
    n = int(1.1 * SR)
    t = np.arange(n) / SR
    freq = 140 + 260 * (1 - np.exp(-t * 6)) + 90 * np.sin(2 * np.pi * 13 * t) * np.exp(-t * 2.5)
    y = np.sin(2 * np.pi * np.cumsum(freq) / SR)
    y += 0.3 * np.sin(2 * 2 * np.pi * np.cumsum(freq) / SR)
    return y * np.exp(-t * 2.8) * np.minimum(t / 0.004, 1)


def ringing(bell_hz: float, strikes_hz: float, dur: float, partials=None) -> np.ndarray:
    """A mechanical bell hit by a fast hammer (kitchen timer, telephone, school bell)."""
    partials = partials or [(1, 1.0, 0.25), (2.4, 0.5, 0.12), (4.1, 0.3, 0.06)]
    hit = bell(bell_hz, 0.4, partials)
    track = np.zeros(int((dur + 0.5) * SR))
    k = 0
    while k / strikes_hz < dur:
        place(track, hit, k / strikes_hz, 0.5 if k % 2 == 0 else 0.42)
        k += 1
    return track


def kuechenwecker() -> np.ndarray:
    return ringing(2600, 22, 1.8)


def telefon() -> np.ndarray:
    track = np.zeros(int(4.0 * SR))
    ring = ringing(1250, 20, 1.0, [(1, 1.0, 0.3), (1.12, 0.8, 0.3), (2.6, 0.3, 0.1)])
    place(track, ring, 0.05)
    place(track, ring, 2.0)
    return track


def schulglocke() -> np.ndarray:
    return ringing(880, 26, 3.0, [(1, 1.0, 0.5), (2.32, 0.6, 0.2), (4.25, 0.3, 0.08)])


def maschine(seconds: float = 5.0) -> np.ndarray:
    n = int(seconds * SR)
    t = np.arange(n) / SR
    hum = sum(np.sin(2 * np.pi * 55 * k * t) / k for k in (1, 2, 3, 5))
    rng = np.random.default_rng(4)
    chug = lowpass(rng.standard_normal(n), 600) * (0.5 + 0.5 * np.sin(2 * np.pi * 3 * t) ** 8)
    whine = 0.08 * np.sin(2 * np.pi * 440 * t + 2 * np.sin(2 * np.pi * 0.5 * t))
    y = rms_norm(hum) * 0.5 + rms_norm(chug) * 0.4 + whine * 4
    edge = np.minimum(np.minimum(t / 0.3, (seconds - t) / 0.3), 1)
    return y * edge


def werkstatt() -> np.ndarray:
    """Own mix: machine hum (own), hammering (cognito perceptu, CC0), lever (Krokulator, CC0)."""
    track = maschine(8.0) * 0.25
    hammer = rms_norm(trim_silence(fs(17012)))
    lever = rms_norm(trim_silence(fs(696746)))
    for at in (0.3, 3.6, 6.2):
        place(track, hammer, at, 0.35)
    place(track, lever, 2.7, 0.3)
    place(track, lever, 5.4, 0.3)
    return track


def hase() -> np.ndarray:
    """Own: soft hops in the snow, getting quieter as the rabbit hops away."""
    rng = np.random.default_rng(9)
    track = np.zeros(int(2.8 * SR))
    for i in range(6):
        gain = 0.9 * (0.72 ** i)
        for off in (0.0, 0.07):
            m = int(0.09 * SR)
            tt = np.arange(m) / SR
            thud = np.sin(2 * np.pi * 95 * tt) * np.exp(-tt * 45)
            crunch = lowpass(rng.standard_normal(m), 2500) * np.exp(-tt * 35) * 0.5
            place(track, thud + crunch, 0.05 + i * 0.42 + off, gain)
    return track


def schwere_schritte() -> np.ndarray:
    """Wooden footsteps (rubberduck, CC0, castle-schritte) slowed down and deepened."""
    step = resample(repo_clip("castle/castle-schritte.mp3"), 0.6)
    m = int(0.25 * SR)
    tt = np.arange(m) / SR
    boom = np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 14)
    track = np.zeros(int(3.6 * SR))
    for i in range(4):
        place(track, rms_norm(step), 0.05 + i * 0.85, 0.5)
        place(track, boom, 0.05 + i * 0.85, 0.6)
    return track


def bauernhof() -> np.ndarray:
    """Mix: cow (Zozzy), sheep (swiftoid), chickens (esperri), donkey (StarNinjas37), all CC0."""
    track = np.zeros(int(7.5 * SR))
    for sid, at, g in ((59245, 0.0, 0.9), (182509, 1.4, 0.7), (118960, 3.2, 0.6), (560692, 5.0, 0.6)):
        x = rms_norm(cut(trim_silence(fs(sid)), 0, 3.0))
        place(track, fade_tail(x, 0.2), at, g)
    return track


def familie_lacht() -> np.ndarray:
    """Mix: man (Eneasz), woman (Kalibrk), children (Iamgiorgio) laughing together, all CC0."""
    track = np.zeros(int(5.0 * SR))
    for sid, at, g in ((119459, 0.0, 0.6), (433921, 0.5, 0.6), (371342, 0.9, 0.7)):
        x = rms_norm(cut(trim_silence(fs(sid)), 0, 4.0))
        place(track, fade_tail(x, 0.3), at, g)
    return track


def markt() -> np.ndarray:
    """Mix: crowd (Breviceps, CC0) with own Christmas music in the background."""
    crowd = rms_norm(cut(fs(457043), 2, 10))
    music = weihnachtsmusik()[: len(crowd)]
    music = np.pad(music, (0, len(crowd) - len(music)))
    return crowd * 0.8 + rms_norm(music) * 0.35


# Tiles in the Weihnachten tray after the first ten, grouped: music and magic, people,
# animals, home and kitchen, things and tools, outside and wind.
# ("fs", slug, label, icon, freesound id, start, max seconds)
# ("own", slug, label, icon, builder, author, source)
# ("loop", slug, label, icon, source file, start, length, author, page)
# ("reuse", slug, label, icon, existing clip id)
STORY = [
    ("own", "weihnachtsmusik", "Weihnachtsmusik", "music", weihnachtsmusik, SELF, "tune: We Wish You a Merry Christmas, traditional, public domain"),
    ("own", "froehlichemusik", "Fröhliche Musik", "music", froehliche_musik, SELF, "tune: Deck the Halls, traditional, public domain"),
    ("own", "klavier", "Klaviermusik", "music", klaviermusik, SELF, "tune: Joy to the World, Lowell Mason 1839, public domain"),
    ("own", "nachtmusik", "Leise Nachtmusik", "music", nachtmusik, SELF, "tune: Stille Nacht, Franz Xaver Gruber 1818, public domain"),
    ("own", "zaubermusik", "Leise Zaubermusik", "sparkle", zaubermusik, SELF, "own composition"),
    ("own", "karussell", "Karussellmusik", "music", karussell, SELF, "own composition"),
    ("own", "markt", "Weihnachtsmarkt", "stars", markt, "Breviceps (crowd) and own music, mixed", "crowd: " + FS_PAGE.format("Breviceps", 457043)),
    ("own", "gloeckchen", "Leise Glöckchen", "bell", leise_gloeckchen, SELF, "own synthesis"),
    ("own", "schlittenfliegt", "Schlitten fliegt davon", "bell", schlitten_fliegt, "jcdecha (sleigh bells), processed here", FS_PAGE.format("jcdecha", 235465)),
    ("reuse", "zauberglitzern", "Zauberglitzern", "sparkle", "princess-funkeln"),
    ("own", "wuschplopp", "Wusch und Plopp", "sparkle", wusch_plopp, SELF, "own synthesis"),
    ("own", "boing", "Boing", "drum", boing, SELF, "own synthesis"),

    ("fs", "lachen", "Lachen", "stars", 433921, 0, 3),
    ("fs", "kinderlachen", "Kinder lachen", "stars", 371342, 0, 4),
    ("own", "familielacht", "Familie lacht", "heart", familie_lacht, "Eneasz, Kalibrk and Iamgiorgio, mixed", FS_PAGE.format("Eneasz", 119459) + ", " + FS_PAGE.format("Kalibrk", 433921) + ", " + FS_PAGE.format("Iamgiorgio", 371342)),
    ("fs", "tiefeslachen", "Tiefes Lachen", "stars", 119459, 0, 5),
    ("fs", "oh", "Oh!", "stars", 242677, 0, 2),
    ("fs", "weinen", "Weinen", "heart", 156098, 0, 3),
    ("fs", "niesen", "Niesen", "note", 54505, 0, 3),
    ("fs", "schnarchen", "Schnarchen", "note", 108519, 0, 5),
    ("fs", "stoehnen", "Stöhnen", "note", 103072, 0, 3),
    ("fs", "schnuppern", "Schnuppern", "note", 202101, 0, 3),
    ("fs", "schluerfen", "Schlürfen", "note", 28010, 0, 3.5),
    ("fs", "klatschen", "Klatschen", "stars", 267930, 0, 4),
    ("reuse", "applaus", "Applaus", "stars", "circus-applaus"),
    ("reuse", "jubeln", "Jubeln", "stars", "football-jubel"),
    ("fs", "kinderjubeln", "Kinder jubeln", "stars", 640855, 1, 5),
    ("fs", "kinderrufen", "Kinder rufen", "stars", 480699, 0, 5),
    ("fs", "kindersingen", "Kinder singen", "music", 840937, 1, 12),
    ("fs", "maedchensingt", "Mädchen singt", "music", 213259, 0, 6),
    ("fs", "menschen", "Viele Menschen", "stars", 457043, 0, 10),
    ("reuse", "strasse", "Belebte Straße", "castle", "ambience-stadt"),

    ("fs", "vogel", "Vogel", "bird", 182507, 0, 4.5),
    ("fs", "rotkehlchen", "Rotkehlchen", "bird", 855901, 0, 3.5),
    ("fs", "eule", "Eule", "bird", 465697, 0, 4.5),
    ("fs", "fluegel", "Flügelschlagen", "bird", 241032, 0, 3),
    ("fs", "katze", "Katze", "heart", 110011, 0, 2),
    ("fs", "hund", "Hund bellt", "heart", 163459, 0, 2.5),
    ("fs", "maus", "Maus piepst", "heart", 188043, 0, 2),
    ("fs", "hamster", "Hamster piepst", "heart", 435748, 0, 2),
    ("fs", "eichhoernchen", "Eichhörnchen", "heart", 852386, 0, 4.5),
    ("own", "hase", "Hase hoppelt weg", "heart", hase, SELF, "own synthesis"),
    ("fs", "huhn", "Huhn gackert", "bird", 118960, 0, 4),
    ("own", "bauernhof", "Bauernhoftiere", "horse", bauernhof, "Zozzy, swiftoid, esperri and StarNinjas37, mixed", ", ".join(FS_PAGE.format(u, s) for u, s in (("Zozzy", 59245), ("swiftoid", 182509), ("esperri", 118960), ("StarNinjas37", 560692)))),

    ("fs", "tee", "Tee eingießen", "wave", 240125, 0, 4.5),
    ("fs", "loeffel", "Löffel in der Tasse", "bell", 239006, 0, 4),
    ("fs", "tassen", "Tassen klirren", "bell", 206171, 0, 3),
    ("fs", "ei", "Ei aufschlagen", "note", 250133, 0, 3),
    ("fs", "ruehren", "Rühren", "note", 42812, 0, 4.5),
    ("fs", "ofentuer", "Ofentür", "castle", 234735, 0, 3),
    ("own", "kuechenwecker", "Küchenwecker", "bell", kuechenwecker, SELF, "own synthesis"),
    ("fs", "kueche", "Küchengeräusche", "note", 829283, 0, 8),
    ("fs", "milch", "Milch im Eimer", "wave", 191823, 0, 4.5),
    ("fs", "dose", "Dosendeckel", "drum", 371704, 0, 2),
    ("fs", "uhr", "Uhr tickt", "drum", 130388, 0, 5),
    ("own", "telefon", "Telefon klingelt", "bell", telefon, SELF, "own synthesis"),
    ("fs", "klopfen", "Klopfen", "drum", 268500, 0, 2.5),
    ("fs", "fenster", "Klopfen am Fenster", "drum", 596517, 0, 3),
    ("fs", "tuer", "Tür geht auf", "castle", 398750, 0, 2),
    ("fs", "knarrtuer", "Knarrende Tür", "castle", 393801, 1.5, 4.5),
    ("fs", "boden", "Knarrender Boden", "castle", 326460, 0, 4),
    ("fs", "treppe", "Schritte auf der Treppe", "drum", 233065, 0, 4.5),
    ("own", "schwereschritte", "Schwere Schritte", "drum", schwere_schritte, "rubberduck (footstep), processed here", "https://opengameart.org/content/100-cc0-sfx-2"),
    ("fs", "rennen", "Rennende Schritte", "drum", 316923, 0, 3),
    ("fs", "vorhang", "Vorhang", "note", 347237, 0, 2.5),
    ("own", "schulglocke", "Schulglocke", "bell", schulglocke, SELF, "own synthesis"),
    ("fs", "ladenglocke", "Türglocke im Laden", "bell", 192761, 0, 2),
    ("fs", "zugglocke", "Glocke vom Spielzeugzug", "bell", 196631, 0, 3),

    ("reuse", "muenzen", "Münzen", "note", "circus-muenzen"),
    ("fs", "kiste", "Kiste öffnen", "note", 364740, 0, 2),
    ("fs", "sack", "Rascheln im Sack", "note", 365520, 0, 3.5),
    ("fs", "papierreisst", "Papier reißt", "note", 181773, 0, 2),
    ("fs", "schere", "Schere schneidet", "note", 272035, 0, 2.5),
    ("fs", "stift", "Stift schreibt", "note", 82610, 0, 4),
    ("fs", "kamera", "Kamera klickt", "note", 61059, 0, 1.5),
    ("reuse", "klicken", "Klicken", "drum", "skate-klick"),
    ("fs", "hebel", "Hebel", "drum", 696746, 0, 1.5),
    ("fs", "haemmern", "Hämmern", "drum", 17012, 0, 3),
    ("own", "maschine", "Maschine brummt", "rocket", maschine, SELF, "own synthesis"),
    ("own", "werkstatt", "Volle Werkstatt", "drum", werkstatt, "own mix with cognito perceptu (hammer) and Krokulator (lever)", FS_PAGE.format("cognito%20perceptu", 17012) + ", " + FS_PAGE.format("Krokulator", 696746)),
    ("fs", "absturz", "Absturz", "drum", 553886, 0, 2.5),
    ("fs", "plumps", "Plumps", "drum", 673424, 0, 2.5),

    ("fs", "schneeball", "Schneeball trifft", "ball", 378059, 0, 1.5),
    ("fs", "platsch", "Platsch", "wave", 445117, 0, 1.5),
    ("reuse", "pfiff", "Pfiff", "whistle", "football-pfiff"),
    ("fs", "kufen", "Kufen auf dem Eis", "skate", 593623, 0, 5),
    ("reuse", "wasser", "Plätscherndes Wasser", "wave", "pirates-platscher"),
    ("reuse", "wind", "Wind", "wave", "ambience-wind"),
    ("reuse", "starkerwind", "Starker Wind", "wave", "ambience-sturm"),
    ("loop", "eisigerwind", "Eisiger Wind", "wave", "fs-620539.mp3", 5.0, 10, "AbolGuga", FS_PAGE.format("AbolGuga", 620539)),
    ("loop", "windbaeume", "Wind in den Bäumen", "wave", "oga-park_wind.wav", 110.0, 10, "Thimras", OGA_PAGE.format("park-ambiences")),
    ("loop", "dachboden", "Wind auf dem Dachboden", "ghost", "fs-815100.mp3", 30.0, 10, "Kinoton", FS_PAGE.format("Kinoton", 815100)),
]


def download() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    sources = dict(SOURCES)
    sources["oga-park_wind.wav"] = f"{OGA}/park_ambience_wind.wav"
    for sid, (_user, url) in FS_PICKS.items():
        sources[f"fs-{sid}.mp3"] = url
    for name, url in sources.items():
        if not (RAW / name).exists():
            print("download", url)
            subprocess.run(["curl", "-sfL", "-m", "300", "-A", "Mozilla/5.0", url, "-o", str(RAW / name)], check=True)


def story_clips(credits: list[str], existing: dict) -> list[dict]:
    out = []
    for entry in STORY:
        kind, slug, name, icon = entry[:4]
        clip_id = f"christmas-{slug}"
        if kind == "reuse":
            src = existing[entry[4]]
            out.append({"id": clip_id, "name": name, "category": "christmas", "icon": icon, "file": src["file"], "duration": src["duration"]})
            credits.append(f"| `{clip_id}` | {name} | `public/sounds/{src['file']}` | same file as `{entry[4]}` | {CC0} | see `{entry[4]}` |")
            print(f"{clip_id:28} reuse {entry[4]}")
            continue
        rel = f"christmas/{clip_id}.mp3"
        if kind == "fs":
            sid, start, length = entry[4:7]
            x = cut(trim_silence(fs(sid)), start, length)
            if len(x) >= int((length - 0.05) * SR):
                x = fade_tail(x, 0.3)
            author, page, loop, target = FS_PICKS[str(sid)][0], fs_page(sid), False, -16
        elif kind == "own":
            build, author, page = entry[4:7]
            x = trim_silence(build())
            loop, target = False, -16
        else:  # loop
            src, start, length, author, page = entry[4:9]
            x = make_loop(load(src), start, length)
            loop, target = True, -20
        duration = encode(x, OUT / rel, loop=loop, target=target)
        out.append({"id": clip_id, "name": name, "category": "christmas", "icon": icon, "file": rel, "duration": duration})
        note = " (loop cut)" if loop else ""
        credits.append(f"| `{clip_id}` | {name} | `public/sounds/{rel}` | {author} | {CC0} | {page}{note} |")
        print(f"{clip_id:28} {duration:5.2f}s")
    return out


def main() -> None:
    download()
    clips: list[dict] = []
    credits: list[str] = []
    for slug, name, icon, build, author, page in CHRISTMAS:
        clip_id = f"christmas-{slug}"
        rel = f"christmas/{clip_id}.mp3"
        x = trim_silence(build())
        duration = encode(x, OUT / rel, loop=False, target=-16)
        clips.append({"id": clip_id, "name": name, "category": "christmas", "icon": icon, "file": rel, "duration": duration})
        credits.append(f"| `{clip_id}` | {name} | `public/sounds/{rel}` | {author} | {CC0} | {page} |")
        print(f"{clip_id:28} {duration:5.2f}s")
    existing = {c["id"]: c for c in json.loads((OUT / "manifest.json").read_text())["clips"]}
    clips += [c for c in story_clips(credits, existing)]
    for slug, name, icon, src, start, length, author, page in AMBIENCE:
        clip_id = f"ambience-{slug}"
        rel = f"ambience/{clip_id}.mp3"
        x = make_loop(load(src), start, length)
        duration = encode(x, OUT / rel, loop=True, target=-20)
        clips.append({"id": clip_id, "name": name, "category": "ambience", "icon": icon, "file": rel, "duration": duration})
        credits.append(f"| `{clip_id}` | {name} | `public/sounds/{rel}` | {author} | {CC0} | {page} (loop cut) |")
        print(f"{clip_id:28} {duration:5.2f}s")

    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    keep = [c for c in manifest["clips"] if c.get("category") not in ("christmas", "ambience")]
    manifest["clips"] = keep + clips
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

    credits_path = ROOT / "CREDITS.md"
    lines = credits_path.read_text().split("\n")
    lines = [l for l in lines if not re.match(r"\| `(christmas|ambience)-", l)]
    last_row = max(i for i, l in enumerate(lines) if l.startswith("| `"))
    lines[last_row + 1:last_row + 1] = credits
    credits_path.write_text("\n".join(lines))

    total = sum(p.stat().st_size for p in OUT.rglob("*.mp3"))
    new = sum((OUT / c["file"]).stat().st_size for c in clips)
    print(f"new clips {len(clips)} bytes {new} ({new/1024/1024:.2f} MB); library {total/1024/1024:.2f} MB")


if __name__ == "__main__":
    sys.exit(main())
