"""Writes cues.json from storyboard.json and the take, so every sound sits on the event it belongs to after a retime.

    python3 examples/noise-cancelling/cues.build.py

The bed is the film's own composition (music/bed.mp3, made by kit/audio/music.mjs to the film's length). Its last
chord fell below -40 dB at 73.1 s, 0.9 s before the last frame, so it is slowed 1.3 % (bed-fit.mp3, atempo 0.987):
the chord now rings to 74.06 s. It swells every twelve seconds or so (short-term -23 to -14 LUFS), so it is ridden
down about 2.5 dB over each swell and up over its last decay so the poster is still heard.
Effects go between the words (the take's pauses, measured below); only the recap cards fall under speech, small.
The film.js times they follow: the dive DIVE = s03 - 0.3, the pull back s05 - 0.35, into the chip s06 - 0.2, out of it
s08 - 0.3, the whip s12, the zoom s16 - 0.1, back to the cup s19 - 0.2, the rings meet 0.2 s after 'time.'.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
L = "lib"
sb = json.loads((HERE / "storyboard.json").read_text())
said = json.loads((HERE / "voice" / "voice.json").read_text())["film"]
s = {x["id"]: x for x in sb["shots"]}
D = sb["duration"]
r = lambda x: round(x, 3)


def word(shot, w):
    """When a word of a shot's line starts and ends, in the film's time."""
    norm = lambda x: x.lower().strip(".,?:!*")
    for a, b, text in said[shot]["words"]:
        if norm(text) == norm(w):
            return a, b
    raise KeyError(f"{w} not in {shot}")


if not (HERE / "music" / "bed-fit.mp3").exists():
    raise SystemExit("make the fitted bed first: ffmpeg -i music/bed.mp3 -af atempo=0.987 music/bed-fit.mp3")
music = {"file": "../../examples/noise-cancelling/music/bed-fit.mp3", "start": 0, "lufs": -22, "fade_in": 0.01, "fade_out": 0.3, "duck_db": -6,
         "ride": [[0, 0], [7, 0], [9, -2.5], [12.5, -2.5], [14, 0], [19.5, 0], [21, -2.5], [23, -2.5], [24.5, 0], [31.5, 0], [33.5, -2.5], [36, -2.5], [37.5, 0],
                  [44, 0], [45.5, -2], [47.5, -2], [49, 0], [56, 0], [57.5, -2.5], [60, -2.5], [62, 0], [68, 1], [71, 4], [73, 9], [r(D), 14]],
         "note": "Composed for this film (music/bed.json has the prompt), slowed 1.3 % (bed-fit.mp3) so its last chord rings to the final frame. -22 LUFS under the voice; ridden down over its swells and up over the last chord's decay."}

PAYOFF = word("s09", "nothing.")[1] + 0.12
TURN = s["s11"]["start"] - 0.06
RINGS = word("s22", "time.")[1] + 0.2
RC = s["s21"]["start"] - 0.42
cues = {
    "music": music,
    "events": [
        {"t": r(s["s02"]["start"] + 0.02), "file": f"{L}/sfx/card_1.mp3", "db": -10, "align": "peak", "note": "the noise card lands, in the pause before 'Surprisingly'"},
        {"t": r(s["s03"]["start"] - 0.12), "file": f"{L}/sfx/whoosh_fast_3.mp3", "db": -18, "align": "peak", "note": "the dive into the noise card (soft: the take has no pause here)"},
        {"t": r(s["s06"]["start"]), "file": f"{L}/sfx/whoosh_fast_1.mp3", "db": -18, "align": "peak", "note": "the dive into the chip, in the 0.2 s gap after 'in.'"},
        {"t": r(PAYOFF), "file": f"{L}/sfx/impact_big_3.mp3", "db": -10, "align": "peak", "duck": 0.6, "trim": [0, 0.6], "fade": 0.4, "note": "THE PAYOFF of the mechanism: almost nothing, in the hold after 'nothing'"},
        {"t": r(PAYOFF), "file": f"{L}/sfx/sub_drop_2.mp3", "db": -16, "align": "peak", "trim": [0, 0.55], "fade": 0.3, "note": "its body"},
        {"t": r(word("s10", "interference.")[1] + 0.03), "file": f"{L}/sfx/shimmer_1.mp3", "db": -15, "align": "peak", "trim": [0, 0.4], "fade": 0.2, "note": "the sheen across the name, in the hold"},
        {"t": r(TURN), "file": f"{L}/sfx/impact_big_2.mp3", "db": -7, "align": "peak", "duck": 0.5, "trim": [0, 0.7], "fade": 0.45, "note": "THE TURN: at the end of the hold, before 'But'"},
        {"t": r(TURN), "file": f"{L}/sfx/sub_drop_1.mp3", "db": -17, "align": "peak", "trim": [0, 0.6], "fade": 0.35, "note": "its body"},
        {"t": r(s["s12"]["start"] - 0.1), "file": f"{L}/sfx/whoosh_fast_5.mp3", "db": -17, "align": "peak", "note": "the whip to the to-scale view (soft, on the sentence end)"},
        {"t": r(s["s16"]["start"]), "file": f"{L}/sfx/whoosh_fast_6.mp3", "db": -19, "align": "peak", "note": "the zoom ten times closer (soft, in the gap after 'harder.')"},
        {"t": r(RC + 0.32), "file": f"{L}/sfx/card_3.mp3", "db": -7, "align": "peak", "note": "the recap cards rise, in the pause after 'catch.'"},
        {"t": r(RINGS), "file": f"{L}/sfx/impact_big_3.mp3", "db": -9, "align": "peak", "duck": 0.6, "trim": [0, 1.4], "fade": 0.9, "note": "THE ANSWER: the two rings meet and vanish, after 'time'"},
        {"t": r(RINGS), "file": f"{L}/sfx/sub_drop_2.mp3", "db": -15, "align": "peak", "trim": [0, 1.0], "fade": 0.5, "note": "its body"},
        {"t": r(s["s23"]["start"] + 1.2), "file": f"{L}/sfx/shimmer_2.mp3", "db": -15, "align": "peak", "trim": [0, 1.2], "fade": 0.6, "note": "the sheen across the poster line"},
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
