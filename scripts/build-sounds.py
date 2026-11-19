#!/usr/bin/env python3
"""Build the CC0 sound library: trim, normalize, encode, write manifest and credits."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = Path("/tmp/sfx-raw")
OUT = ROOT / "public" / "sounds"

CC0 = "CC0 1.0 Universal (public domain)"

# id, German label, category, icon, source file, max seconds, author, page
CLIPS: list[tuple] = [
    ("halloween-geist", "Geist", "halloween", "ghost", "ghost-breath/ghostbreath.flac", 6, "qubodup", "https://opengameart.org/content/ghost-breath"),
    ("halloween-spuk", "Spuk", "halloween", "ghost", "4-atmospheric-ghostly-loops/at.mp3", 12, "Independent.nu", "https://opengameart.org/content/4-atmospheric-ghostly-loops"),
    ("halloween-donner", "Donner", "halloween", "sparkle", "rain-long-thunder/rain-thunder.ogg", 10, "WuxiaScrub", "https://opengameart.org/content/rain-long-thunder"),
    ("halloween-knarren", "Knarren", "halloween", "castle", "50-rpg-sound-effects/RPGsounds_Kenney/OGG/creak1.ogg", 4, "Kenney", "https://kenney.nl/assets/rpg-audio"),
    ("halloween-glocke", "Glocke", "halloween", "bell", "bell-dingschimes/bell_ding1.wav", 4, "PWL", "https://opengameart.org/content/bell-dingschimes"),
    ("halloween-zauber", "Zauber", "halloween", "sparkle", "magic-spell-sfx/magical_1.ogg", 5, "JaggedStone", "https://opengameart.org/content/magic-spell-sfx"),
    ("halloween-heulen", "Heulen", "halloween", "ghost", "7-ghast-sounds/ghast_-_starninjas/ghast - StarNinjas/ghast_cries.1.ogg", 4, "StarNinjas", "https://opengameart.org/content/7-ghast-sounds"),
    ("halloween-tuer", "Tür", "halloween", "castle", "50-rpg-sound-effects/RPGsounds_Kenney/OGG/doorOpen_1.ogg", 4, "Kenney", "https://kenney.nl/assets/rpg-audio"),
    ("halloween-kette", "Kette", "halloween", "bell", "80-cc0-rpg-sfx/80-CC0-RPG-SFX_0/chain_01.ogg", 4, "rubberduck", "https://opengameart.org/content/80-cc0-rpg-sfx"),

    ("castle-tor", "Tor", "castle", "castle", "50-rpg-sound-effects/RPGsounds_Kenney/OGG/doorOpen_2.ogg", 4, "Kenney", "https://kenney.nl/assets/rpg-audio"),
    ("castle-schwert", "Schwert", "castle", "sword", "80-cc0-rpg-sfx/80-CC0-RPG-SFX_0/blade_01.ogg", 3, "rubberduck", "https://opengameart.org/content/80-cc0-rpg-sfx"),
    ("castle-pferd", "Pferd", "castle", "horse", "horse-trotting/Trot.ogg", 6, "EZduzziteh", "https://opengameart.org/content/horse-trotting"),
    ("castle-schritte", "Schritte", "castle", "drum", "100-cc0-sfx-2/sfx_100_v2/sfx100v2_footstep_wood_01.ogg", 3, "rubberduck", "https://opengameart.org/content/100-cc0-sfx-2"),
    ("castle-riegel", "Riegel", "castle", "castle", "50-rpg-sound-effects/RPGsounds_Kenney/OGG/metalLatch.ogg", 3, "Kenney", "https://kenney.nl/assets/rpg-audio"),
    ("castle-fanfare", "Fanfare", "castle", "music", "85-short-music-jingles/jingleSounds_Kenney/OGG/jingles_HIT/jingles_HIT00.ogg", 6, "Kenney", "https://kenney.nl/assets/music-jingles"),
    ("castle-klinge", "Klinge", "castle", "sword", "50-rpg-sound-effects/RPGsounds_Kenney/OGG/drawKnife1.ogg", 3, "Kenney", "https://kenney.nl/assets/rpg-audio"),
    ("castle-buch", "Buch", "castle", "note", "50-rpg-sound-effects/RPGsounds_Kenney/OGG/bookOpen.ogg", 3, "Kenney", "https://kenney.nl/assets/rpg-audio"),
    ("castle-ruestung", "Rüstung", "castle", "sword", "50-rpg-sound-effects/RPGsounds_Kenney/OGG/metalPot1.ogg", 3, "Kenney", "https://kenney.nl/assets/rpg-audio"),

    ("fire-knistern", "Knistern", "fire", "flame", "fire-crackling/fire-1.ogg", 8, "AntumDeluge", "https://opengameart.org/content/fire-crackling"),
    ("fire-lagerfeuer", "Lagerfeuer", "fire", "flame", "fireplace-sound-loop/fire.wav", 14, "PagDev", "https://opengameart.org/content/fireplace-sound-loop"),
    ("fire-flamme", "Flamme", "fire", "flame", "catching-fire/flame.ogg", 6, "themightyglider", "https://opengameart.org/content/catching-fire"),
    ("fire-funken", "Funken", "fire", "sparkle", "25-cc0-bang-firework-sfx/25-CC0-bang-sfx/fw_02.ogg", 5, "rubberduck", "https://opengameart.org/content/25-cc0-bang-firework-sfx"),
    ("fire-knall", "Knall", "fire", "drum", "25-cc0-bang-firework-sfx/25-CC0-bang-sfx/bang_02.ogg", 3, "rubberduck", "https://opengameart.org/content/25-cc0-bang-firework-sfx"),
    ("fire-zauberfeuer", "Feuerzauber", "fire", "flame", "80-cc0-rpg-sfx/80-CC0-RPG-SFX_0/spell_fire_01.ogg", 4, "rubberduck", "https://opengameart.org/content/80-cc0-rpg-sfx"),
    ("fire-lohe", "Lohe", "fire", "flame", "80-cc0-rpg-sfx/80-CC0-RPG-SFX_0/spell_fire_03.ogg", 4, "rubberduck", "https://opengameart.org/content/80-cc0-rpg-sfx"),
    ("fire-zischen", "Zischen", "fire", "sparkle", "100-cc0-sfx-2/sfx_100_v2/sfx100v2_air_01.ogg", 4, "rubberduck", "https://opengameart.org/content/100-cc0-sfx-2"),

    ("princess-funkeln", "Funkeln", "princess", "sparkle", "magic-spell-sfx/magical_4.ogg", 5, "JaggedStone", "https://opengameart.org/content/magic-spell-sfx"),
    ("princess-gloeckchen", "Glöckchen", "princess", "bell", "pleasing-bell-sound-effect/pleasing-bell.ogg", 4, "Spring Spring", "https://opengameart.org/content/pleasing-bell-sound-effect"),
    ("princess-weise", "Weise", "princess", "music", "85-short-music-jingles/jingleSounds_Kenney/OGG/jingles_PIZZA/jingles_PIZZA00.ogg", 8, "Kenney", "https://kenney.nl/assets/music-jingles"),
    ("princess-stab", "Zauberstab", "princess", "sparkle", "magic-spell-sfx/magical_2.ogg", 4, "JaggedStone", "https://opengameart.org/content/magic-spell-sfx"),
    ("princess-glocke", "Glocke", "princess", "bell", "bell-dingschimes/bell_ding2.wav", 4, "PWL", "https://opengameart.org/content/bell-dingschimes"),
    ("princess-glanz", "Glanz", "princess", "stars", "interface-sounds/kenney_interfaceSounds/Audio/confirmation_001.ogg", 3, "Kenney", "https://kenney.nl/assets/interface-sounds"),
    ("princess-kristall", "Kristall", "princess", "sparkle", "interface-sounds/kenney_interfaceSounds/Audio/glass_001.ogg", 3, "Kenney", "https://kenney.nl/assets/interface-sounds"),
    ("princess-stern", "Stern", "princess", "stars", "magic-spell-sfx/magical_6.ogg", 4, "JaggedStone", "https://opengameart.org/content/magic-spell-sfx"),
    ("princess-krone", "Krone", "princess", "crown", "85-short-music-jingles/jingleSounds_Kenney/OGG/jingles_HIT/jingles_HIT03.ogg", 6, "Kenney", "https://kenney.nl/assets/music-jingles"),

    ("football-pfeife", "Pfeife", "football", "whistle", "steam-whistle/steam_whistle.wav", 5, "bart", "https://opengameart.org/content/steam-whistle"),
    ("football-pfiff", "Pfiff", "football", "whistle", "steam-whistle/steamwhistle_0.wav", 4, "bart", "https://opengameart.org/content/steam-whistle"),
    ("football-jubel", "Jubel", "football", "stars", "crowd-shoutingspeaking-ambience/crowd_shouting.ogg", 8, "StarNinjas", "https://opengameart.org/content/crowd-shoutingspeaking-ambience"),
    ("football-schuss", "Schuss", "football", "ball", "100-cc0-sfx/100-CC0-SFX_0/hit_01.ogg", 2, "rubberduck", "https://opengameart.org/content/100-cc0-sfx"),
    ("football-tor", "Tor", "football", "bell", "85-short-music-jingles/jingleSounds_Kenney/OGG/jingles_HIT/jingles_HIT02.ogg", 5, "Kenney", "https://kenney.nl/assets/music-jingles"),
    ("football-pass", "Pass", "football", "ball", "100-cc0-sfx-2/sfx_100_v2/sfx100v2_air_02.ogg", 3, "rubberduck", "https://opengameart.org/content/100-cc0-sfx-2"),
    ("football-anstoss", "Anstoß", "football", "ball", "100-cc0-sfx/100-CC0-SFX_0/hit_02.ogg", 2, "rubberduck", "https://opengameart.org/content/100-cc0-sfx"),
    ("football-fanfare", "Fanfare", "football", "music", "85-short-music-jingles/jingleSounds_Kenney/OGG/jingles_NES/jingles_NES00.ogg", 6, "Kenney", "https://kenney.nl/assets/music-jingles"),

    ("circus-applaus", "Applaus", "circus", "stars", "applause-in-a-large-hall-or-church/applause-clapping-church-crowd-immersive.wav", 8, "eXpl0it3r", "https://opengameart.org/content/applause-in-a-large-hall-or-church"),
    ("circus-tusch", "Tusch", "circus", "music", "85-short-music-jingles/jingleSounds_Kenney/OGG/jingles_HIT/jingles_HIT05.ogg", 5, "Kenney", "https://kenney.nl/assets/music-jingles"),
    ("circus-hupe", "Hupe", "circus", "clown", "bicycle-sounds/bicycle_sounds/bicycle_horn-1.ogg", 3, "AntumDeluge", "https://opengameart.org/content/bicycle-sounds"),
    ("circus-gong", "Gong", "circus", "bell", "100-cc0-sfx/100-CC0-SFX_0/gong_01.ogg", 5, "rubberduck", "https://opengameart.org/content/100-cc0-sfx"),
    ("circus-klingel", "Klingel", "circus", "bell", "bicycle-sounds/bicycle_sounds/rotating_bicycle_bell-1.ogg", 4, "AntumDeluge", "https://opengameart.org/content/bicycle-sounds"),
    ("circus-melodie", "Melodie", "circus", "music", "85-short-music-jingles/jingleSounds_Kenney/OGG/jingles_PIZZA/jingles_PIZZA02.ogg", 8, "Kenney", "https://kenney.nl/assets/music-jingles"),
    ("circus-muenzen", "Münzen", "circus", "sparkle", "54-casino-sound-effects-cards-dice-chips/kenney_casino-audio/Audio/chips-handle-1.ogg", 3, "Kenney", "https://kenney.nl/assets/casino-audio"),
    ("circus-pauke", "Pauke", "circus", "drum", "25-cc0-bang-firework-sfx/25-CC0-bang-sfx/bang_05.ogg", 3, "rubberduck", "https://opengameart.org/content/25-cc0-bang-firework-sfx"),
    ("circus-zauber", "Zauber", "circus", "sparkle", "magic-spell-sfx/magical_3.ogg", 4, "JaggedStone", "https://opengameart.org/content/magic-spell-sfx"),

    ("pirates-wellen", "Wellen", "pirates", "wave", "beach-ocean-waves/wave_01_cc0-18363__jasinski__alkaibeach.flac", 14, "jasinski", "https://opengameart.org/content/beach-ocean-waves"),
    ("pirates-kanone", "Kanone", "pirates", "pistol", "cannon-fire/cannon_fire.ogg", 4, "Thimras", "https://opengameart.org/content/cannon-fire"),
    ("pirates-treffer", "Treffer", "pirates", "drum", "battle-at-sea/cannon_hit_ship_short.ogg", 4, "Thimras", "https://opengameart.org/content/battle-at-sea"),
    ("pirates-moewe", "Möwe", "pirates", "bird", "solo-seagull-sound-effects/Seagull%20Ambient%202.wav", 4, "Rango Mango", "https://opengameart.org/content/solo-seagull-sound-effects"),
    ("pirates-muenzen", "Münzen", "pirates", "sparkle", "50-rpg-sound-effects/RPGsounds_Kenney/OGG/handleCoins.ogg", 3, "Kenney", "https://kenney.nl/assets/rpg-audio"),
    ("pirates-kette", "Kette", "pirates", "bell", "80-cc0-rpg-sfx/80-CC0-RPG-SFX_0/chain_02.ogg", 4, "rubberduck", "https://opengameart.org/content/80-cc0-rpg-sfx"),
    ("pirates-knarren", "Knarren", "pirates", "castle", "50-rpg-sound-effects/RPGsounds_Kenney/OGG/creak2.ogg", 4, "Kenney", "https://kenney.nl/assets/rpg-audio"),
    ("pirates-platscher", "Platscher", "pirates", "wave", "battle-at-sea/cannon_miss_1.ogg", 4, "Thimras", "https://opengameart.org/content/battle-at-sea"),
    ("pirates-weise", "Weise", "pirates", "music", "85-short-music-jingles/jingleSounds_Kenney/OGG/jingles_NES/jingles_NES04.ogg", 6, "Kenney", "https://kenney.nl/assets/music-jingles"),

    ("space-laser", "Laser", "space", "pistol", "sci-fi-sounds/sci-fi_sounds/Audio/laserRetro_000.ogg", 3, "Kenney", "https://kenney.nl/assets/sci-fi-sounds"),
    ("space-strahl", "Strahl", "space", "pistol", "63-digital-sound-effects-lasers-phasers-space-etc/Digital_SFX_Set/laser3.mp3", 3, "Kenney", "https://kenney.nl/assets/digital-audio"),
    ("space-rakete", "Rakete", "space", "rocket", "50-cc0-sci-fi-sfx/sci-fi-sfx/rocket_01.ogg", 5, "rubberduck", "https://opengameart.org/content/50-cc0-sci-fi-sfx"),
    ("space-motor", "Motor", "space", "rocket", "sci-fi-sounds/sci-fi_sounds/Audio/engineCircular_000.ogg", 6, "Kenney", "https://kenney.nl/assets/sci-fi-sounds"),
    ("space-piep", "Piep", "space", "sparkle", "50-cc0-sci-fi-sfx/sci-fi-sfx/beep_01.ogg", 3, "rubberduck", "https://opengameart.org/content/50-cc0-sci-fi-sfx"),
    ("space-funk", "Funk", "space", "music", "sci-fi-sounds/sci-fi_sounds/Audio/computerNoise_000.ogg", 4, "Kenney", "https://kenney.nl/assets/sci-fi-sounds"),
    ("space-beamen", "Beamen", "space", "sparkle", "50-cc0-sci-fi-sfx/sci-fi-sfx/teleport_01.ogg", 4, "rubberduck", "https://opengameart.org/content/50-cc0-sci-fi-sfx"),
    ("space-schild", "Schild", "space", "planet", "sci-fi-sounds/sci-fi_sounds/Audio/forceField_000.ogg", 4, "Kenney", "https://kenney.nl/assets/sci-fi-sounds"),
    ("space-alarm", "Alarm", "space", "bell", "50-cc0-sci-fi-sfx/sci-fi-sfx/retro_beep_01.ogg", 3, "rubberduck", "https://opengameart.org/content/50-cc0-sci-fi-sfx"),

    ("skate-rollen", "Rollen", "skate", "skate", "bicycle-sounds/bicycle_sounds/bicycle_spokes-1.ogg", 4, "AntumDeluge", "https://opengameart.org/content/bicycle-sounds"),
    ("skate-sprung", "Sprung", "skate", "skate", "100-cc0-sfx-2/sfx_100_v2/sfx100v2_air_03.ogg", 3, "rubberduck", "https://opengameart.org/content/100-cc0-sfx-2"),
    ("skate-landung", "Landung", "skate", "drum", "interface-sounds/kenney_interfaceSounds/Audio/drop_001.ogg", 2, "Kenney", "https://kenney.nl/assets/interface-sounds"),
    ("skate-klick", "Klick", "skate", "skate", "50-rpg-sound-effects/RPGsounds_Kenney/OGG/metalClick.ogg", 2, "Kenney", "https://kenney.nl/assets/rpg-audio"),
    ("skate-brett", "Brett", "skate", "skate", "100-cc0-sfx-2/sfx_100_v2/sfx100v2_footstep_wood_02.ogg", 2, "rubberduck", "https://opengameart.org/content/100-cc0-sfx-2"),
    ("skate-rutschen", "Rutschen", "skate", "skate", "interface-sounds/kenney_interfaceSounds/Audio/scroll_001.ogg", 3, "Kenney", "https://kenney.nl/assets/interface-sounds"),
    ("skate-jubel", "Jubel", "skate", "stars", "85-short-music-jingles/jingleSounds_Kenney/OGG/jingles_HIT/jingles_HIT11.ogg", 4, "Kenney", "https://kenney.nl/assets/music-jingles"),
    ("skate-ollie", "Ollie", "skate", "skate", "interface-sounds/kenney_interfaceSounds/Audio/drop_002.ogg", 2, "Kenney", "https://kenney.nl/assets/interface-sounds"),
]


def encode(src: Path, dest: Path, max_seconds: float) -> float:
    dest.parent.mkdir(parents=True, exist_ok=True)
    silence = (
        "silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.02:detection=rms,"
        "areverse,"
        "silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.05:detection=rms,"
        "areverse,"
    )
    tail = "loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=0.01,areverse,afade=t=in:d=0.05,areverse"
    def run(audio_filter: str) -> None:
        subprocess.run(
            [
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                "-i", str(src),
                "-t", str(max_seconds),
                "-af", audio_filter,
                "-ac", "1", "-ar", "44100",
                "-c:a", "libmp3lame", "-b:a", "64k",
                str(dest),
            ],
            check=True,
        )
    run(silence + tail)
    duration = probe(dest)
    if duration < 0.35:
        run(tail)
        duration = probe(dest)
    if duration < 0.12:
        raise RuntimeError(f"too short: {dest} ({duration})")
    return duration


def probe(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        check=True, capture_output=True, text=True,
    )
    return float(result.stdout.strip())


def main() -> None:
    missing = [row[4] for row in CLIPS if not (RAW / row[4]).exists()]
    if missing:
        raise SystemExit("missing sources:\n" + "\n".join(missing))
    # remove previous generated category folders but keep the folder itself
    if OUT.exists():
        for child in OUT.iterdir():
            if child.name == "manifest.json":
                continue
            if child.is_dir():
                for f in child.rglob("*"):
                    if f.is_file():
                        f.unlink()
    clips = []
    credits = []
    for clip_id, name, category, icon, rel, max_s, author, source in CLIPS:
        dest_rel = f"{category}/{clip_id}.mp3"
        dest = OUT / dest_rel
        duration = encode(RAW / rel, dest, max_s)
        duration = round(duration, 2)
        clips.append({
            "id": clip_id,
            "name": name,
            "category": category,
            "icon": icon,
            "file": dest_rel,
            "duration": duration,
        })
        credits.append((clip_id, name, dest_rel, author, source, duration))
        print(f"{clip_id:22} {duration:5.2f}s")
    manifest = {
        "comment": "CC0-Klänge. duration ist die Länge in Sekunden. Eigene Dateien können ergänzt werden.",
        "clips": clips,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    lines = [
        "# Credits and licenses",
        "",
        "Every sound effect shipped with Soundsalat is **CC0 1.0 Universal** (public domain).",
        "Attribution is not required. This list records where each file came from.",
        "Kenney packs were mirrored from OpenGameArt and originally published at [kenney.nl](https://kenney.nl).",
        "If a file cannot be loaded, the app plays a short synthesized stand-in instead.",
        "",
        "| Clip | Label | File | Author | License | Source |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for clip_id, name, dest_rel, author, source, duration in credits:
        lines.append(
            f"| `{clip_id}` | {name} | `public/sounds/{dest_rel}` | {author} | {CC0} | {source} |"
        )
    lines.append("")
    lines.append("Processed locally: silence trimmed, loudness normalized to about −16 LUFS, encoded as mono 64 kbps MP3.")
    lines.append("")
    (ROOT / "CREDITS.md").write_text("\n".join(lines))
    total = sum(p.stat().st_size for p in OUT.rglob("*.mp3"))
    print(f"clips {len(clips)} bytes {total} ({total/1024/1024:.2f} MB)")


if __name__ == "__main__":
    main()
