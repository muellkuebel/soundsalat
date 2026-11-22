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


def download() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    for name, url in SOURCES.items():
        if not (RAW / name).exists():
            print("download", url)
            subprocess.run(["curl", "-sfL", "-m", "300", "-A", "Mozilla/5.0", url, "-o", str(RAW / name)], check=True)


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
