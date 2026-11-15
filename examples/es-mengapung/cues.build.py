"""Writes cues.json from storyboard.json, so every sound sits on the event it belongs to.

    python3 examples/es-mengapung/cues.build.py

The events are the film's own (film.js, lab.js): the cube breaks the surface (worked out from the same bob as
lab.js), the wax lands, the lens dives, the lattice locks, the four bonds light, the counts land, '+9%' lands, the
bars morph, the ice bar rises, the recap. There is no narration: the music bed sits at -18 LUFS and the effects at
the calm levels of references/sound.md. Word times are the captions' own pacing, worked out as film.js does.
"""
import json
import math
from pathlib import Path

HERE = Path(__file__).parent
L = "lib"
sb = json.loads((HERE / "storyboard.json").read_text())
s = {x["id"]: x for x in sb["shots"]}
D = sb["duration"]
r = lambda x: round(x, 3)


def word(shot, w):
    """When a caption word lights up: spread across the shot by length, as motion.js paces pop captions."""
    sh = s[shot]
    words = sh["caption"].replace("*", "").split()
    weight = [len(x) + 2 for x in words]
    a, b = sh["start"] + 0.12, sh["end"] - 0.1
    run = 0
    for x, wt in zip(words, weight):
        if "".join(ch for ch in x.lower() if ch.isalnum() or ch in "%/-") == w:
            return a + (b - a) * run / sum(weight)
        run += wt
    raise KeyError(f"{shot}: {w}")


# The hero cube (lab.js heroTop): let go at t0 = -0.25 s; it breaks the surface when its top crosses the waterline.
UNDER = 0.9167 / 0.9998
level, size, bottom, t0 = 540, 250, 1150, -0.25
eq = level - (1 - UNDER) * size
top = lambda u: eq + (bottom - 18 - size - eq) * math.exp(-1.18 * u) * math.cos(1.745 * u) + 2 * math.sin(1.6 * (u + t0))
BREAK = t0 + next(u / 200 for u in range(600) if top(u / 200) < level)
WAX_LAND = s["s02"]["start"] + 0.15 + 3.2  # lab.js: the wax takes 3.2 s to reach the bottom
FREEZE = word("s04", "membeku") - 0.05
cues = {
    "music": {"file": f"{L}/music/xceed_thru_johann.mp3", "start": 0.679, "lufs": -18, "fade_in": 0.01, "fade_out": 1.8, "duck_db": -6,
              "ride": [[0, 0], [20, 0], [28, -1.5], [r(D), -2.5]],
              "note": "86 BPM, started 0.679 s in so a beat falls on frame 0; every cut is on a half beat. A calm curious bed with no lead melody at -18 LUFS (no voice to make room for), ridden down a little as the track swells."},
    "events": [
        {"t": r(BREAK), "file": f"{L}/sfx/send_1.mp3", "db": -14, "align": "peak", "note": "the cube breaks the surface (a light pop for the splash)"},
        {"t": r(s["s02"]["start"] - 0.05), "file": f"{L}/sfx/whoosh_fast_2.mp3", "db": -16, "align": "peak", "note": "the glass becomes two"},
        {"t": r(WAX_LAND), "file": f"{L}/sfx/card_2.mp3", "db": -12, "align": "peak", "note": "the wax lands on the bottom"},
        {"t": r(s["s03"]["start"] + 0.6), "file": f"{L}/sfx/whoosh_long_2.mp3", "db": -15, "align": "peak", "note": "the dive through the lens"},
        {"t": r(FREEZE + 0.75), "file": f"{L}/sfx/shimmer_2.mp3", "db": -14, "align": "peak", "note": "the lattice locks"},
        {"t": r(word("s04", "4") - 0.05), "file": f"{L}/sfx/tick_2.mp3", "db": -14, "align": "peak", "note": "the four bonds light"},
        {"t": r(word("s05", "berongga") - 0.02), "file": f"{L}/sfx/shimmer_1.mp3", "db": -17, "align": "peak", "note": "the channels light"},
        {"t": r(s["s06"]["start"] - 0.1), "file": f"{L}/sfx/whoosh_fast_3.mp3", "db": -16, "align": "peak", "note": "the lattice shrinks to its column, the liquid twin slides in"},
        {"t": r(word("s06", "sama") - 0.05), "file": f"{L}/sfx/tick_1.mp3", "db": -13, "align": "peak", "note": "the two counts land together"},
        {"t": r(word("s07", "9%") - 0.05), "file": f"{L}/sfx/impact_big_3.mp3", "db": -10, "align": "peak", "duck": 0.5, "trim": [0, 0.9], "fade": 0.6, "note": "THE TURN: '+9%' lands"},
        {"t": r(s["s08"]["start"] - 0.1), "file": f"{L}/sfx/whoosh_fast_2.mp3", "db": -17, "align": "peak", "note": "the columns become bars"},
        {"t": r(word("s08", "ringan") - 0.05), "file": f"{L}/sfx/pop_1.mp3", "db": -14, "align": "peak", "note": "the figures land"},
        {"t": r(word("s08", "ngapung") + 0.25), "file": f"{L}/sfx/send_2.mp3", "db": -15, "align": "peak", "note": "the ice bar rises away"},
        {"t": r(word("s09", "9/10-nya") + 0.7), "file": f"{L}/sfx/tick_2.mp3", "db": -14, "align": "peak", "note": "'≈ 92%' lands"},
        {"t": r(s["s10"]["start"] - 0.02), "file": f"{L}/sfx/whoosh_fast_3.mp3", "db": -16, "align": "peak", "note": "the recap rises"},
        {"t": r(s["s10"]["start"] + 0.3), "file": f"{L}/sfx/impact_big_3.mp3", "db": -6, "align": "peak", "duck": 0.8, "trim": [0, 1.6], "fade": 1.1, "note": "THE PAYOFF: the poster line"},
    ],
}
out = ["{", f'  "music": {json.dumps(cues["music"], ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(cues['events']) - 1 else ''}" for i, e in enumerate(cues["events"])]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"break at {BREAK:.2f} s; {len(cues['events'])} events -> cues.json")
