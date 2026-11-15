"""Writes cues.json from storyboard.json, so every sound sits on the event film.js puts on screen.

    python3 examples/float-math/cues.build.py

No voice: the music bed sits at -18 LUFS and the effects at the calm levels of references/sound.md. Two big hits
only: the amber 4 (the surprise) and the poster line. read() is film.js's: when a caption word is lit.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
sb = json.loads((HERE / "storyboard.json").read_text())
s = {x["id"]: x for x in sb["shots"]}
D = sb["duration"]
L = "lib"


def key(w):
    return "".join(c for c in w.lower() if c.isalnum())


def read(id, word):
    shot = s[id]
    words = shot["caption"].replace("*", "").split()
    weight = [len(w) + 2 for w in words]
    total = sum(weight)
    a, b = shot["start"] + 0.12, shot["end"] - 0.1
    run = 0
    for w, k in zip(words, weight):
        if key(w) == key(word):
            return a + (b - a) * run / total
        run += k
    raise KeyError(word)


st = lambda id: s[id]["start"]
r = lambda x: round(x, 3)
FOUR = read("s02", "a") - 0.05
CUT = read("s06", "cut") - 0.05 + 0.14
ROUND = read("s06", "53") + 0.13
DIVE = st("s07") + 0.25
HOP = read("s08", "error") + 0.05
FOUR3 = read("s08", "4") - 0.12
TOL = read("s09", "tolerance") - 0.05
POSTER = st("s11") + 0.35

events = [
    (1.5, "shimmer_1", -16, "peak", {}, "light crosses 0.3? on the question"),
    (st("s02") - 0.3, "whoosh_fast_1", -17, "peak", {}, "the question lifts away, the terminal rises"),
    (read("s02", "0.3,") - 0.05, "key_2", -12, "peak", {}, "the result lands"),
    (read("s02", "and") + 0.05, "click_1", -15, "peak", {}, "false"),
    (FOUR, "impact_big_2", -6, "peak", {"duck": True, "trim": [0, 1.4], "fade": 0.9}, "THE 4: the error, lit amber"),
    (st("s03") + 0.18, "whoosh_fast_3", -15, "peak", {}, "whip up to binary"),
    (st("s03") + 0.75, "pop_1", -14, "peak", {}, "0.11 lands"),
    (st("s04") - 0.15, "whoosh_fast_5", -19, "peak", {}, "0.11 slides to row one"),
    (st("s04") + 0.05, "typing_1", -22, "start", {"trim": [9.5, 15.0], "fade_in": 0.2, "fade": 0.5}, "the bits stream (a bed under s04 and s05)"),
    (CUT, "click_2", -9, "peak", {}, "the blade cuts after bit 53"),
    (CUT, "sub_drop_2", -16, "peak", {"trim": [0, 0.8], "fade": 0.4}, "its weight"),
    (ROUND, "card_2", -14, "peak", {}, "...001 flips to ...010"),
    (DIVE, "whoosh_long_1", -17, "start", {}, "the dive into 0.1"),
    (read("s07", "tiny") - 0.1, "shimmer_2", -16, "peak", {}, "the gap between 0.1 and its stored value lights"),
    (st("s08"), "whoosh_fast_2", -15, "peak", {}, "whip along the line to 0.3"),
    (HOP + 0.5, "tick_1", -13, "peak", {}, "the sum snaps to the next double"),
    (FOUR3, "impact_big_3", -11, "peak", {"duck": 0.7, "trim": [0, 0.9], "fade": 0.6}, "that 4 again"),
    (st("s09"), "card_1", -14, "peak", {}, "flash cut to the fix"),
    (read("s09", "compare") - 0.2, "typing_2", -20, "start", {"trim": [0.5, 1.1], "fade": 0.1}, "line one types"),
    (TOL + 0.2, "success_1", -14, "peak", {}, "true"),
    (read("s10", "use") - 0.15, "typing_2", -20, "start", {"trim": [1.2, 1.8], "fade": 0.1}, "line two types"),
    (read("s10", "integers") + 0.25, "success_2", -15, "peak", {}, "true"),
    (st("s11") - 0.1, "whoosh_long_2", -17, "start", {}, "the recap cards rise"),
    (POSTER + 0.18, "impact_big_1", -6, "peak", {"duck": True, "trim": [0, 1.8], "fade": 1.2}, "the poster line"),
]
cues = {
    "music": {"file": f"{L}/music/xceed_thru_johann.mp3", "start": 0.679, "lufs": -18, "fade_in": 0.01, "fade_out": 1.8, "duck_db": -6,
              "note": "86 BPM, started 0.679 s in so a beat falls on frame 0; every cut is on a half beat. No voice, so the bed sits at -18 LUFS."},
    "events": [{"t": r(t), "file": f"{L}/sfx/{f}.mp3", "db": db, "align": al, **more, "note": note} for t, f, db, al, more, note in events],
}
out = ["{", f'  "music": {json.dumps(cues["music"], ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(cues['events']) - 1 else ''}" for i, e in enumerate(cues["events"])]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(cues['events'])} events -> cues.json")
