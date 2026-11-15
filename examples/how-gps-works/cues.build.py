"""Writes cues.json from storyboard.json, so every sound sits on the event film.js puts at the same moment.

    python3 examples/how-gps-works/cues.build.py

No voice: the bed sits at -18 LUFS and the effects at the calm levels of references/sound.md. One big hit on the
lock (the payoff of the mechanism) and one under the poster line; small sounds on real events only.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
sb = json.loads((HERE / "storyboard.json").read_text())
s = {x["id"]: x for x in sb["shots"]}
D = sb["duration"]
L = "lib/sfx"


def at(id, f):
    return s[id]["start"] + (s[id]["end"] - s[id]["start"]) * f


r = lambda x: round(x, 3)
ev = []


def cue(t, name, db, note, **more):
    ev.append({"t": r(t), "file": f"{L}/{name}.mp3", "db": db, "align": "peak", **more, "note": note})


cue(1.6, "shimmer_1", -17, "light crosses the question")
cue(s["s01"]["end"] - 0.3, "whoosh_fast_3", -16, "the dive into the dot")
cue(at("s02", 0.36) + 0.1, "click_1", -14, "the upward arrow is struck through")
for f in (0.5, 0.66, 0.82):
    cue(at("s02", f), "tick_1", -18, "a signal reaches the phone")
cue(s["s03"]["start"] - 0.05, "whoosh_fast_2", -17, "up the signal to the satellite")
cue(s["s03"]["start"] + 0.35, "shimmer_2", -18, "a shell leaves the satellite")
cue(s["s04"]["start"] + 0.1, "whoosh_long_1", -17, "pull back to the constellation", trim=[0, 1.6], fade=0.6)
cue(at("s04", 0.35) + 0.1, "pop_1", -15, "32 satellites")
cue(s["s05"]["start"] + 0.85, "pop_2", -16, "20,200 km lands")
cue(at("s06", 0.86), "tick_2", -12, "the shell reaches you: the stopwatch stops at 0.067 s")
cue(at("s07", 0.3) + 0.1, "pop_1", -15, "x the speed of light")
cue(s["s08"]["start"] + 0.12, "pop_3", -14, "= 20,200 km")
cue(s["s09"]["start"] + 0.3, "shimmer_1", -16, "the sphere fills in")
cue(at("s10", 0.5) + 0.2, "shimmer_2", -17, "the circle draws")
cue(at("s11", 0.46) + 0.05, "pop_2", -13, "two points")
cue(s["s12"]["start"] - 0.05, "whoosh_fast_1", -17, "cut to the ruler")
cue(at("s12", 0.82), "tick_1", -12, "the light reaches 300 m at 1 microsecond")
cue(s["s13"]["start"] + 0.05, "whoosh_fast_4", -17, "dive to you")
cue(at("s13", 0.42) + 0.1, "click_2", -14, "the meeting point slides off you")
for j in range(3):
    cue(at("s14", 0.5) + j * 0.18, "tick_2", -16, "a disagreeing point")
cue(s["s15"]["start"] + 0.4, "shimmer_1", -18, "the correction turns, the points converge")
cue(s["s16"]["start"], "impact_big_1", -7, "THE LOCK: one point, the clock fixed", duck=True, trim=[0, 1.4], fade=0.9)
cue(s["s16"]["start"] + 0.05, "success_1", -13, "the lock confirmed")
cue(s["s17"]["start"] - 0.2, "whoosh_fast_3", -17, "pull back to the phone")
cue(at("s17", 0.45), "pop_3", -14, "the pin lands")
for i in range(4):
    cue(at("s18", 0.35) + i * 0.15 + 0.1, "tick_1", -17, "a clock lights")
cue(s["s19"]["start"] + 0.1, "card_1", -14, "the recap cards rise")
cue(s["s19"]["start"] + 0.85, "impact_big_2", -8, "the poster line", duck=0.8, trim=[0, 1.8], fade=1.2)

cues = {
    "music": {"file": "lib/music/xceed_thru_johann.mp3", "start": 0.679, "lufs": -18, "fade_in": 0.01, "fade_out": 2.4, "duck_db": -6,
              "ride": [[0, 0], [30, 0], [42, -1.5], [r(D), -2.5]],
              "note": "86 BPM, started 0.679 s in so a beat falls on frame 0; every shot is whole beats long, so every cut is on the beat. Ridden down as the track's own ramp rises."},
    "events": sorted(ev, key=lambda e: e["t"]),
}
out = ["{", f'  "music": {json.dumps(cues["music"], ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(cues['events']) - 1 else ''}" for i, e in enumerate(cues["events"])]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(ev)} events -> cues.json")
