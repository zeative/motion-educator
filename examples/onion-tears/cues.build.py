"""Writes cues.json from storyboard.json and the take, so every sound sits on the event it belongs to after a retime.

    python3 examples/onion-tears/cues.build.py

The music is the bed composed for this film (music/bed.mp3, made by kit/audio/music.mjs after the take: marimba and
pizzicato strings, 96 BPM, an even level, playing without a gap past the last frame). It sits at -22 LUFS under the
voice. Effects are small and go in the performer's own pauses (measured with silencedetect on the take, mapped to
the film's clock): the whips and dives, the turn before "Then", the payoff before "Keep". A few sit under words on
purpose (the snip, the nerves firing, the split, the 40x locking) and are kept small.
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
    for a, b, text in said[shot]["words"]:
        if text.lower().strip(".,?:!*") == w.strip(".,?:!*"):
            return a, b
    raise KeyError(f"{w} not in {shot}")


if not (HERE / "music" / "bed.mp3").exists():
    raise SystemExit("compose the bed first: node kit/audio/music.mjs examples/onion-tears --prompt ...")
music = {"file": f"../../examples/{HERE.name}/music/bed.mp3", "start": 0, "lufs": -22, "fade_in": 0.01, "fade_out": 0.3, "duck_db": -6,
         "ride": [[0, 0], [r(D - 2.6), 0], [r(D - 1.2), 2], [r(D), 3]],
         "note": "Composed for this film (music/bed.json has the prompt). -22 LUFS under the voice; ridden up 3 dB over the silent poster so the last chord is heard to the final frame; it is still at full level when the picture ends (the bed runs 6 s longer)."}

# film.js times, worked out the same way
CUT = word("s01", "onion")[0]
DIVE = s["s03"]["start"] - 0.35
INTO = s["s04"]["start"] - 0.35
OUT = s["s05"]["start"] - 0.3
SNIP = word("s07", "snips")[0] + 0.05
THEN = word("s09", "then")[0]
MAKE = word("s10", "making")[0] - 0.05
MOL = s["s11"]["start"] - 0.2
PULL = s["s12"]["start"] - 0.2
EYEIN = s["s13"]["start"] - 0.12
LAND = word("s13", "sets")[0] - 0.02
HEAD = s["s14b"]["start"] - 0.1
KN = s["s18"]["start"] - 0.12
SPLIT = word("s19", "splits.")[0] - 0.04
RC = s["s21"]["start"] - 0.1
PO = s["s22"]["start"] - 0.05

cues = {
    "music": music,
    "voice": {"lufs": -16, "duck_db": -10, "sfx_db": -4},
    "events": [
        {"t": r(CUT + 0.02), "file": f"{L}/sfx/click_2.mp3", "db": -13, "align": "peak", "note": "the blade reaches the board (under 'onion', small)"},
        {"t": r(s["s02"]["start"] - 0.2), "file": f"{L}/sfx/whoosh_fast_2.mp3", "db": -12, "align": "peak", "note": "the whip to the whole onion, after 'cry?'"},
        {"t": r(DIVE + 0.15), "file": f"{L}/sfx/whoosh_long_1.mp3", "db": -13, "align": "peak", "trim": [0, 1.4], "fade": 0.5, "note": "the dive into the flesh, after 'you.'"},
        {"t": r(INTO + 0.1), "file": f"{L}/sfx/whoosh_fast_5.mp3", "db": -16, "align": "peak", "note": "push into one cell, in the pause after 'apart:'"},
        {"t": r(word("s04", "sulfur")[0] - 0.08), "file": f"{L}/sfx/pop_1.mp3", "db": -11, "align": "peak", "note": "the sulfur compounds light, just before the word"},
        {"t": r(word("s04", "and")[0] - 0.16), "file": f"{L}/sfx/pop_2.mp3", "db": -11, "align": "peak", "note": "the enzyme lights, in the pause after 'side,'"},
        {"t": r(OUT + 0.08), "file": f"{L}/sfx/whoosh_fast_3.mp3", "db": -15, "align": "peak", "note": "pull back to the sheet, after 'other.'"},
        {"t": r(word("s05", "in,")[0] + 0.2), "file": f"{L}/sfx/whoosh_fast_6.mp3", "db": -12, "align": "peak", "note": "the blade slices down, in the pause after 'in,'"},
        {"t": r(word("s05", "burst,")[0] - 0.1), "file": f"{L}/sfx/pop_3.mp3", "db": -10, "align": "peak", "note": "the cells burst"},
        {"t": r(SNIP), "file": f"{L}/sfx/click_1.mp3", "db": -11, "align": "peak", "note": "the snip (under 'snips', small)"},
        {"t": r(s["s08"]["start"] - 0.1), "file": f"{L}/sfx/whoosh_fast_4.mp3", "db": -18, "align": "peak", "note": "the acid carried to the next picture, after 'acid.'"},
        {"t": r(THEN - 0.08), "file": f"{L}/sfx/impact_big_2.mp3", "db": -11, "align": "peak", "duck": 0.6, "trim": [0, 1.0], "fade": 0.6, "note": "THE TURN: the second enzyme arrives, in the pause before 'Then'"},
        {"t": r(THEN - 0.08), "file": f"{L}/sfx/sub_drop_1.mp3", "db": -17, "align": "peak", "trim": [0, 0.9], "fade": 0.4, "note": "its body"},
        {"t": r(MAKE + 0.05), "file": f"{L}/sfx/shimmer_1.mp3", "db": -16, "align": "peak", "trim": [0, 1.2], "fade": 0.5, "note": "the gas appears (under 'making', small)"},
        {"t": r(MOL + 0.1), "file": f"{L}/sfx/whoosh_fast_1.mp3", "db": -14, "align": "peak", "note": "the dive into the molecule, after 'gas.'"},
        {"t": r(PULL + 0.1), "file": f"{L}/sfx/whoosh_fast_7.mp3", "db": -14, "align": "peak", "note": "pull out to the kitchen, after 'mouthful.'"},
        {"t": r(EYEIN - 0.05), "file": f"{L}/sfx/whoosh_fast_2.mp3", "db": -13, "align": "peak", "note": "the dive into the eye, after 'face.'"},
        *[{"t": r(LAND + k * 0.3), "file": f"{L}/sfx/tick_1.mp3", "db": -15, "align": "peak", "pan": [-0.1, 0.2, -0.3][k], "note": f"nerve {k + 1} fires (small, under the words)"} for k in range(3)],
        {"t": r(HEAD - 0.05), "file": f"{L}/sfx/whoosh_fast_8.mp3", "db": -15, "align": "peak", "note": "cut to the head, after 'pain.'"},
        {"t": r(word("s16", "so")[0] - 0.16), "file": f"{L}/sfx/pop_1.mp3", "db": -13, "align": "peak", "note": "a tear falls, after 'out.'"},
        {"t": r(word("s17", "itself.")[0] + 0.36), "file": f"{L}/sfx/shimmer_2.mp3", "db": -15, "align": "peak", "trim": [0, 1.0], "fade": 0.4, "note": "washed away, after 'itself.'"},
        {"t": r(KN - 0.1), "file": f"{L}/sfx/whoosh_fast_5.mp3", "db": -12, "align": "peak", "note": "the vertical whip to the knife test"},
        {"t": r(SPLIT), "file": f"{L}/sfx/pop_3.mp3", "db": -10, "align": "peak", "note": "the blunt blade breaks through (on 'splits')"},
        {"t": r(word("s20", "forty")[0] - 0.02), "file": f"{L}/sfx/card_1.mp3", "db": -12, "align": "peak", "note": "40x locks (under 'forty', small)"},
        {"t": r(RC - 0.15), "file": f"{L}/sfx/whoosh_fast_3.mp3", "db": -14, "align": "peak", "note": "the test sinks, the cards rise, after 'one.'"},
        *[{"t": r(RC + 0.12 + i * 0.18), "file": f"{L}/sfx/card_3.mp3", "db": -15, "align": "peak", "note": f"recap card {i + 1}"} for i in range(4)],
        {"t": r(PO - 0.12), "file": f"{L}/sfx/whoosh_fast_6.mp3", "db": -16, "align": "peak", "note": "the cards lift away"},
        {"t": r(PO + 0.02), "file": f"{L}/sfx/impact_big_3.mp3", "db": -10, "align": "peak", "duck": 0.6, "trim": [0, 1.6], "fade": 1.0, "note": "THE PAYOFF: the poster, in the pause before 'Keep'"},
        {"t": r(PO + 0.02), "file": f"{L}/sfx/sub_drop_2.mp3", "db": -16, "align": "peak", "trim": [0, 1.2], "fade": 0.6, "note": "its body"},
    ],
}
out = ["{", f'  "music": {json.dumps(cues["music"], ensure_ascii=False)},', f'  "voice": {json.dumps(cues["voice"], ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(cues['events']) - 1 else ''}" for i, e in enumerate(cues["events"])]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
# Which sounds fall on a word: only the ones meant to. (A word's end runs on into the pause after it, so a sound
# listed here after a sentence's last word is usually in that pause: the take's silences were checked separately.)
words = [(a, b, w) for line in said.values() for a, b, w in line["words"]]
for e in cues["events"]:
    on = next((w for a, b, w in words if a - 0.03 <= e["t"] <= b), None)
    if on:
        print(f"  under the voice at {e['t']:.2f} s ('{on}'): {e['note'][:60]}")
print(f"{len(cues['events'])} events -> cues.json")
