"""Writes cues.json from storyboard.json, so every sound sits on the event film.js animates at the same time.

    python3 examples/kenapa-musim/cues.build.py

The bed is composed for this film (music/bed.mp3, kit/audio/music.mjs). Clay is set down, so most sounds are small
plops and wooden knocks on the things film.js plops in (each a fixed offset from its shot's start, the same offsets
as in film.js); the turn ("Padahal") gets a soft drop and the payoff a small lift.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
L = "lib"
sb = json.loads((HERE / "storyboard.json").read_text())
s = {x["id"]: x["start"] for x in sb["shots"]}
r = lambda x: round(x, 3)
PLOP = 0.17  # film.js plop(): the squash lands 0.17 s after it starts

music = json.loads((HERE / "cues.json").read_text())["music"]
music.update({"lufs": -22, "start": 0, "fade_in": 0.01, "fade_out": 0.6, "duck_db": -6,
              "note": "Composed for this film (ElevenLabs Music, the prompt in music/bed.json); -22 LUFS under the voice."})


def plop(shot, off, file="pop_1", db=-15, note="", pan=0):
    return {"t": r(s[shot] + off + PLOP), "file": f"{L}/sfx/{file}.mp3", "db": db, "pan": pan, "align": "peak", "note": note}


events = [
    {"t": 0.35, "file": f"{L}/sfx/shimmer_1.mp3", "db": -22, "align": "peak", "note": "snow over the village"},
    plop("s02", 0.15, "pop_1", -12, "the clay question mark is set down"),
    {"t": r(s["s03"] - 0.2), "file": f"{L}/sfx/whoosh_long_1.mp3", "db": -21, "align": "peak", "note": "up over the table to the Sun"},
    {"t": r(s["s03"] + 0.5), "file": f"{L}/sfx/pop_2.mp3", "db": -14, "align": "peak", "note": "the Earth is set on the oval"},
    plop("s03", 1.4, "pop_3", -17, "'bukan skala'"),
    plop("s03b", 0.2, "pop_1", -14, "'panas?'", 0.2),
    plop("s03b", 2.0, "pop_1", -14, "'dingin?'", -0.1),
    {"t": r(s["s04"] - 0.05), "file": f"{L}/sfx/sub_drop_2.mp3", "db": -11, "align": "peak", "duck": 0.5, "note": "THE TURN: 'Padahal'"},
    {"t": r(s["s04"] + 0.25), "file": f"{L}/sfx/card_1.mp3", "db": -16, "align": "peak", "note": "the oval is swapped for a rounder one"},
    {"t": r(s["s04"] + 0.5), "file": f"{L}/sfx/card_2.mp3", "db": -16, "align": "peak", "note": "and for the round orbit"},
    plop("s04b", 0.1, "pop_2", -14, "'Januari · 147 juta km'", -0.2),
    plop("s04b", 0.5, "pop_2", -15, "'Juli · 152 juta km'", 0.2),
    plop("s05", 0.6, "pop_3", -13, "winter snow pressed on the north"),
    plop("s05", 1.3, "pop_1", -16, "'Eropa: musim dingin'"),
    {"t": r(s["s06b"] + 0.35), "file": f"{L}/sfx/click_1.mp3", "db": -13, "align": "peak", "note": "the toothpick tips"},
    {"t": r(s["s06b"] + 1.3 + PLOP), "file": f"{L}/sfx/card_3.mp3", "db": -15, "align": "peak", "note": "the paper protractor"},
    plop("s07", 0.9, "pop_2", -15, "the axis arrow"),
    plop("s07b", 0.1, "pop_3", -18, "ghost Earth (Desember)", -0.2),
    plop("s07b", 1.1, "pop_3", -18, "ghost Earth (Maret)"),
    plop("s07b", 1.5, "pop_3", -18, "ghost Earth (September)", 0.2),
    plop("s08", 0.9, "pop_1", -15, "'Juni'", 0.2),
    plop("s08", 1.7, "pop_1", -16, "'utara condong'", 0.1),
    {"t": r(s["s09"] - 0.15), "file": f"{L}/sfx/whoosh_long_2.mp3", "db": -22, "align": "peak", "note": "across the table to the torch"},
    {"t": r(s["s09"] + 0.6), "file": f"{L}/sfx/click_2.mp3", "db": -12, "align": "peak", "note": "the torch clicks on"},
    plop("s09", 1.6, "pop_1", -15, "'sempit = panas'"),
    *[plop("s09b", 0.2 + i * 0.12, "tick_1", -21, f"day bead {i + 1}", 0.1 * ((i % 3) - 1)) for i in range(8)],
    plop("s09b", 1.2, "pop_1", -16, "'siang lebih panjang'"),
    {"t": r(s["s10"] + 0.3), "file": f"{L}/sfx/whoosh_long_3.mp3", "db": -21, "align": "peak", "note": "half way round the orbit"},
    plop("s10", 2.4, "pop_1", -15, "'Desember'", -0.2),
    plop("s10", 2.9, "pop_1", -16, "'selatan condong'", -0.1),
    {"t": r(s["s11"] + 0.6), "file": f"{L}/sfx/whoosh_fast_2.mp3", "db": -18, "align": "peak", "note": "the torch tips"},
    plop("s11", 2.2, "pop_1", -15, "'lebar = dingin'"),
    plop("s12", 1.4, "pop_3", -13, "the equator band"),
    plop("s12", 2.5, "pop_2", -14, "Indonesia's flag"),
    plop("s13", 2.0, "pop_1", -15, "'Jakarta ≥ 60°'", -0.2),
    *[plop("s13b", 0.9 + i * 0.12, "pop_3", -18, f"snow on the Berlin plate {i + 1}", 0.15) for i in range(4)],
    plop("s13b", 1.3, "pop_1", -15, "'Berlin, Des 14°'", 0.2),
    plop("s14", 0.8, "success_1", -15, "THE PAYOFF: 'miring ✓'"),
    plop("s14", 1.8, "pop_1", -16, "'jarak ✗'"),
    {"t": r(s["s15"] + 0.2), "file": f"{L}/sfx/whoosh_long_1.mp3", "db": -22, "align": "peak", "note": "back up to the snowy village"},
]
events.sort(key=lambda e: e["t"])
cues = {"music": music, "events": events}
out = ["{", f'  "music": {json.dumps(music, ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(events) - 1 else ''}" for i, e in enumerate(events)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(events)} events -> cues.json")
