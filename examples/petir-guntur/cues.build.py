"""Writes cues.json from storyboard.json, so every sound sits on the event it belongs to after a retime.

    python3 examples/petir-guntur/cues.build.py

The strike times are the film's own (film.js): the thunder of the race lands 0.2 s into s05 and its flash was 6.00 s
earlier; the counted thunder lands on the cut to s08, 3.00 s after its flash. No flash has a sound: that is the film.

LIB is where the sounds are, relative to kit/audio/: the library kit/audio/fetch.sh downloads.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
LIB = "lib"
sb = json.loads((HERE / "storyboard.json").read_text())
s = {x["id"]: x for x in sb["shots"]}
K1 = s["s02"]["start"] + 0.45
ARR2 = s["s05"]["start"] + 0.2
K2 = ARR2 - 6
SEEN = K2 + (2058 * 0.31) / 4200
RES = s["s06"]["start"] + 2 * sb["music"]["beat"]
ARR3 = s["s08"]["start"]
K3 = ARR3 - 3
L = LIB
r = lambda x: round(x, 3)
cues = {
  "music": {"file": f"{L}/music/xceed_thru_johann.mp3", "start": 0.679, "lufs": -21, "fade_in": 0.01, "fade_out": 1.8, "duck_db": -6,
            "ride": [[0, 0], [16, 0], [22, -1.5], [25, -2.5], [27.6, -3.5]],
            "note": "86 BPM, started 0.679 s in so a beat falls on frame 0; cuts sit on its half beats. A bed under the voice: -21 LUFS, and ridden down as the track itself swells. The path points at this film's own link to the sound library because kit/audio/lib was a broken link when the film was made; with the kit's library in place it is lib/music/xceed_thru_johann.mp3."},
  "voice": {"lufs": -16, "lead": 0.15, "duck_db": -9, "sfx_db": -4},
  "events": [
    {"t": r(s["s02"]["start"] + 0.01), "file": f"{L}/sfx/impact_big_3.mp3", "db": -7, "align": "peak", "duck": 0.7, "trim": [0, 1.2], "fade": 0.8, "note": "the hook's thunder: nothing sounded at its flash, 3.9 s ago"},
    {"t": r(s["s02"]["start"] + 0.01), "file": f"{L}/sfx/sub_drop_1.mp3", "db": -12, "align": "peak", "trim": [0, 1.1], "fade": 0.5, "note": "its body, with harmonics a phone can play"},
    {"t": r(K1 + 0.05), "file": f"{L}/sfx/shimmer_2.mp3", "db": -21, "align": "peak", "note": "close on the channel as it flares"},
    {"t": r(s["s03"]["start"] - 0.05), "file": f"{L}/sfx/whoosh_fast_3.mp3", "db": -17, "align": "peak", "note": "the camera pulls back to the whole scene"},
    {"t": r(SEEN + 0.02), "file": f"{L}/sfx/tick_1.mp3", "db": -7, "align": "peak", "pan": 0.3, "note": "the light's row is filled (the flash itself is silent)"},
    {"t": r(s["s04"]["start"] + 0.3), "file": f"{L}/sfx/tension_1.mp3", "db": -23, "align": "start", "trim": [0, 3.3], "fade_in": 1.4, "fade": 0.7, "note": "a low hum while the sound travels"},
    {"t": r(ARR2), "file": f"{L}/sfx/impact_big_3.mp3", "db": -4, "align": "peak", "duck": True, "trim": [0, 1.5], "fade": 1.0, "note": "THE THUNDER reaches you, 6.00 s after its flash"},
    {"t": r(ARR2), "file": f"{L}/sfx/sub_drop_1.mp3", "db": -7, "align": "peak", "trim": [0, 1.35], "fade": 0.5, "note": "its body"},
    {"t": r(ARR2), "file": f"{L}/sfx/impact_big_1.mp3", "db": -9, "align": "peak", "trim": [0, 1.4], "fade": 1.0, "note": "its depth, for full-range speakers"},
    {"t": r(RES), "file": f"{L}/sfx/card_2.mp3", "db": -7, "align": "peak", "note": "874.000x lands"},
    {"t": r(RES), "file": f"{L}/sfx/impact_big_3.mp3", "db": -13, "align": "peak", "duck": 0.5, "trim": [0, 0.9], "fade": 0.6, "note": "weight under it"},
    {"t": r(s["s07"]["start"] - 0.03), "file": f"{L}/sfx/whoosh_fast_2.mp3", "db": -17, "align": "peak", "note": "the figure is thrown up, cut to your own view"},
    {"t": r(K3 + 1), "file": f"{L}/sfx/tick_2.mp3", "db": -5, "align": "peak", "pan": 0.35, "note": "one"},
    {"t": r(K3 + 2), "file": f"{L}/sfx/tick_2.mp3", "db": -5, "align": "peak", "pan": 0.35, "note": "two"},
    {"t": r(ARR3 + 0.005), "file": f"{L}/sfx/impact_big_3.mp3", "db": -3, "align": "peak", "duck": 0.8, "trim": [0, 1.2], "fade": 0.8, "note": "three: the thunder, 3.00 s after its flash, on the cut"},
    {"t": r(ARR3 + 0.005), "file": f"{L}/sfx/sub_drop_1.mp3", "db": -7, "align": "peak", "trim": [0, 1.1], "fade": 0.5, "note": "its body"},
    {"t": r(s["s08"]["start"] + 0.84), "file": f"{L}/sfx/tick_1.mp3", "db": -11, "align": "peak", "pan": 0.4, "note": "x 343 m"},
    {"t": r(s["s08"]["start"] + 1.26), "file": f"{L}/sfx/tick_1.mp3", "db": -8, "align": "peak", "pan": 0.4, "note": "= 1.029 m"},
    {"t": r(s["s08"]["start"] + 2.1), "file": f"{L}/sfx/success_1.mp3", "db": -9, "align": "peak", "pan": -0.2, "note": "the distance lands: about 1 km"},
    {"t": r(s["s09"]["start"] - 0.02), "file": f"{L}/sfx/whoosh_fast_3.mp3", "db": -18, "align": "peak", "note": "the recap rises"},
    {"t": r(s["s09"]["start"] + 0.3), "file": f"{L}/sfx/impact_big_3.mp3", "db": -5, "align": "peak", "duck": 0.8, "trim": [0, 1.6], "fade": 1.1, "note": "the poster line"},
  ],
}
out = ["{", f'  "music": {json.dumps(cues["music"], ensure_ascii=False)},', f'  "voice": {json.dumps(cues["voice"])},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(cues['events']) - 1 else ''}" for i, e in enumerate(cues["events"])]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(cues['events'])} events -> cues.json")
