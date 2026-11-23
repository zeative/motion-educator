"""Writes cues.json from storyboard.json, so every sound sits on the event film.js draws at the same time.

    python3 examples/troli-penuh/cues.build.py

The bed is composed for this film (music/bed.mp3, kit/audio/music.mjs). The effects are small and paper-like: a
card slide for each fresh page, pops for the shopping, a tick for the check, a soft drop on the turn. The library has
no pen scratch, so the drawing itself stays silent and the bed carries it.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
L = "lib"
sb = json.loads((HERE / "storyboard.json").read_text())
s = {x["id"]: x for x in sb["shots"]}
D = sb["duration"]
r = lambda x: round(x, 3)
T_FULL = 2 * 570 / 480  # film.js: the full trolley's braking time

music = json.loads((HERE / "cues.json").read_text())["music"]
music.update({"lufs": -22, "start": 0, "fade_in": 0.01, "fade_out": 0.6, "duck_db": -6,
              "note": "Composed for this film (ElevenLabs Music, the prompt in music/bed.json); -22 LUFS under the voice."})

slides = ["s03", "s05", "s06", "s07", "s09", "s10", "s12", "s13", "s14"]
events = [
    {"t": r(1.15), "file": f"{L}/sfx/pop_1.mp3", "db": -16, "align": "peak", "note": "the shove: the trolley gives a little"},
    {"t": r(s["s01"]["end"] - 1.0), "file": f"{L}/sfx/alert_1.mp3", "db": -17, "align": "peak", "note": "the crossed-out lift arrow"},
    {"t": r(s["s02"]["start"] + 0.15), "file": f"{L}/sfx/pop_2.mp3", "db": -13, "align": "peak", "note": "the question mark"},
    *[{"t": r(s[i]["start"] - 0.15), "file": f"{L}/sfx/card_{(k % 3) + 1}.mp3", "db": -15, "align": "peak", "note": f"fresh paper slides in ({i})"} for k, i in enumerate(slides)],
    {"t": r(s["s03"]["start"] + 1.0), "file": f"{L}/sfx/tick_1.mp3", "db": -15, "align": "peak", "note": "the weight arrows land on the wheels"},
    {"t": r(s["s04"]["start"] + 1.5), "file": f"{L}/sfx/whoosh_fast_1.mp3", "db": -19, "align": "peak", "note": "the marker swipe under 'kelembaman'"},
    {"t": r(s["s05"]["start"] + 0.95), "file": f"{L}/sfx/pop_1.mp3", "db": -16, "align": "peak", "note": "the shove that hardly moves it"},
    {"t": r(s["s07"]["start"] + 1.25), "file": f"{L}/sfx/tick_2.mp3", "db": -13, "align": "peak", "note": "the scale reads 21 kg"},
    *[{"t": r(s["s08"]["start"] + 0.45 + i * 0.4), "file": f"{L}/sfx/pop_3.mp3", "db": -11, "pan": 0.15 * (i - 1), "align": "peak", "note": f"shopping item {i + 1} lands"} for i in range(3)],
    {"t": r(s["s08b"]["start"] + 1.3), "file": f"{L}/sfx/pop_2.mp3", "db": -13, "align": "peak", "note": "3x and its marker"},
    {"t": r(s["s09"]["start"] + 0.9), "file": f"{L}/sfx/whoosh_long_2.mp3", "db": -20, "align": "peak", "note": "both trolleys pushed off"},
    {"t": r(s["s10"]["start"] - 0.05), "file": f"{L}/sfx/sub_drop_1.mp3", "db": -10, "align": "peak", "duck": 0.5, "note": "THE TURN: 'Masalahnya belum selesai'"},
    {"t": r(s["s11"]["start"] + 0.5), "file": f"{L}/sfx/whoosh_fast_4.mp3", "db": -17, "align": "peak", "note": "heels skid as it drags on"},
    {"t": r(s["s12"]["start"] + 1.0), "file": f"{L}/sfx/whoosh_fast_6.mp3", "db": -16, "align": "peak", "note": "both start braking at the line"},
    {"t": r(s["s12"]["start"] + 0.3 + 0.7 + 2 * 190 / 480), "file": f"{L}/sfx/tick_1.mp3", "db": -14, "align": "peak", "note": "the empty trolley has stopped"},
    {"t": r(s["s12"]["start"] + 0.3 + 0.7 + T_FULL), "file": f"{L}/sfx/tick_1.mp3", "db": -12, "align": "peak", "note": "the full one stops, three times further on"},
    {"t": r(s["s13"]["start"] + 0.75), "file": f"{L}/sfx/success_2.mp3", "db": -15, "align": "peak", "note": "THE PAYOFF: 'massa' gets its marker"},
    {"t": r(s["s13"]["start"] + 2.3), "file": f"{L}/sfx/alert_2.mp3", "db": -18, "align": "peak", "trim": [0, 0.6], "fade": 0.3, "note": "'berat' crossed out"},
]
events.sort(key=lambda e: e["t"])
cues = {"music": music, "events": events}
out = ["{", f'  "music": {json.dumps(music, ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(events) - 1 else ''}" for i, e in enumerate(events)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(events)} events -> cues.json")
