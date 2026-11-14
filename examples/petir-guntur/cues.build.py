"""Writes cues.json from storyboard.json and the take, so every sound sits on the event it belongs to after a retime.

    python3 examples/petir-guntur/cues.build.py

The strike times are the film's own (film.js): the hook's thunder comes in the pause after the question; the race's
thunder lands 0.1 s into the silent s07, 9.00 s after its flash; the counted thunder on the cut to the silent s11,
3.00 s after its flash; the near one 1.00 s after its flash. No flash has a sound: that is the film.

Effects go between the words: the three big thunders are in silences the take was opened for. Only the two ticks of
the count and the last, small thunder fall under speech, on purpose, and are kept low.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
L = "lib"
sb = json.loads((HERE / "storyboard.json").read_text())
said = json.loads((HERE / "voice" / "voice.json").read_text())["film"]
s = {x["id"]: x for x in sb["shots"]}
THUNDER0 = said["s01"]["to"] + 0.24
ARR2 = s["s07"]["start"] + 0.1
ARR3 = s["s11"]["start"]
K3 = ARR3 - 3
K4 = s["s13"]["start"] + 0.25
ARR4 = K4 + 1
D = sb["duration"]
r = lambda x: round(x, 3)
cues = {
  "music": {"file": f"{L}/music/xceed_thru_johann.mp3", "start": 0.679, "lufs": -22, "fade_in": 0.01, "fade_out": 1.8, "duck_db": -6,
            "ride": [[0, 0], [20, 0], [30, -1.5], [36, -2.5], [r(D), -3.5]],
            "note": "86 BPM, started 0.679 s in so a beat falls on frame 0. A bed under the voice at -22 LUFS, ridden down as the track itself swells; the cuts follow the take, not the beat."},
  "events": [
    {"t": r(THUNDER0), "file": f"{L}/sfx/impact_big_3.mp3", "db": -6, "align": "peak", "duck": 0.7, "trim": [0, 1.0], "fade": 0.6, "note": "the hook's thunder, in the pause after the question: nothing sounded at its flash"},
    {"t": r(THUNDER0), "file": f"{L}/sfx/sub_drop_1.mp3", "db": -11, "align": "peak", "trim": [0, 1.0], "fade": 0.45, "note": "its body, with harmonics a phone can play"},
    {"t": r(s["s03"]["start"] - 0.1), "file": f"{L}/sfx/whoosh_fast_3.mp3", "db": -19, "align": "peak", "note": "the camera pulls back to the whole scene, between two sentences"},
    {"t": r(s["s06"]["start"] - 0.3), "file": f"{L}/sfx/tension_1.mp3", "db": -24, "align": "start", "trim": [0, 3.3], "fade_in": 1.5, "fade": 0.5, "note": "a low hum while the sound closes in"},
    {"t": r(ARR2), "file": f"{L}/sfx/impact_big_3.mp3", "db": -4, "align": "peak", "duck": True, "trim": [0, 1.4], "fade": 0.9, "note": "THE THUNDER reaches you, 9.00 s after its flash, in the silent shot"},
    {"t": r(ARR2), "file": f"{L}/sfx/sub_drop_1.mp3", "db": -7, "align": "peak", "trim": [0, 1.3], "fade": 0.5, "note": "its body"},
    {"t": r(ARR2), "file": f"{L}/sfx/impact_big_1.mp3", "db": -9, "align": "peak", "trim": [0, 1.3], "fade": 0.9, "note": "its depth, for full-range speakers"},
    {"t": r(s["s09"]["start"] - 0.05), "file": f"{L}/sfx/whoosh_fast_2.mp3", "db": -18, "align": "peak", "note": "the figure is thrown up, cut to you, between two sentences"},
    {"t": r(K3 + 1), "file": f"{L}/sfx/tick_2.mp3", "db": -9, "align": "peak", "pan": 0.35, "note": "one (under the voice, on purpose: the count is the point)"},
    {"t": r(K3 + 2), "file": f"{L}/sfx/tick_2.mp3", "db": -9, "align": "peak", "pan": 0.35, "note": "two"},
    {"t": r(ARR3 + 0.005), "file": f"{L}/sfx/impact_big_3.mp3", "db": -4, "align": "peak", "duck": 0.8, "trim": [0, 1.1], "fade": 0.7, "note": "three: the thunder, 3.00 s after its flash, on the cut to the silent shot"},
    {"t": r(ARR3 + 0.005), "file": f"{L}/sfx/sub_drop_1.mp3", "db": -8, "align": "peak", "trim": [0, 1.05], "fade": 0.45, "note": "its body"},
    {"t": r(ARR4), "file": f"{L}/sfx/impact_big_3.mp3", "db": -3, "align": "peak", "duck": 0.6, "trim": [0, 0.6], "fade": 0.4, "note": "the near strike's thunder, 1.00 s after its flash, short, under the voice"},
    {"t": r(s["s14"]["start"] - 0.02), "file": f"{L}/sfx/whoosh_fast_3.mp3", "db": -19, "align": "peak", "note": "the recap rises"},
    {"t": r(s["s14"]["start"] + 0.3), "file": f"{L}/sfx/impact_big_3.mp3", "db": -6, "align": "peak", "duck": 0.8, "trim": [0, 1.6], "fade": 1.1, "note": "the poster line"},
  ],
}
out = ["{", f'  "music": {json.dumps(cues["music"], ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(cues['events']) - 1 else ''}" for i, e in enumerate(cues["events"])]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
# Which sounds fall on a word: only the ones meant to.
words = [(a, b, w) for line in said.values() for a, b, w in line["words"]]
for e in cues["events"]:
    on = next((w for a, b, w in words if a - 0.03 <= e["t"] <= b), None)
    if on:
        print(f"  under the voice at {e['t']:.2f} s ('{on}'): {e['note'][:60]}")
print(f"{len(cues['events'])} events -> cues.json")
