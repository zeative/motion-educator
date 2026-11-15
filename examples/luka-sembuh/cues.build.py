"""Writes cues.json from storyboard.json and the take, so every sound sits on the event it belongs to after a retime.

    python3 examples/luka-sembuh/cues.build.py

The bed is the film's own composition (music/bed.mp3, made by kit/audio/music.mjs to the film's length); it is kept
at -22 LUFS under the voice and ridden down where the composition itself swells (about 38 to 46 s, measured at
-14.5 LUFS short-term against about -19 elsewhere). Effects go between the words: the dives, the turn ("Tapi kuman")
and the poster have silences of their own. Only the fibrin shimmer, the engulfing click and the recap cards fall
under speech, on purpose, and are kept small.
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


DIVE_AT = s["s02"]["start"] - 0.4  # film.js: the dive into the scrape, 1.0 s long
EAT = word("s09", "menelan")[0] - 0.25  # film.js: the white cell closes on the germ
OUT = s["s14"]["start"] - 0.3  # film.js: the pull out of the skin, back to the finger
bed = HERE / "music" / "bed-fit.mp3"
music = {"file": "../../examples/luka-sembuh/music/bed-fit.mp3", "start": 0, "lufs": -19, "fade_in": 0.01, "fade_out": 0.25, "duck_db": -6,
         "ride": [[0, 0], [36.5, 0], [39, -2.5], [46.6, -2.5], [48.8, 0], [50.8, 0], [52.2, 5], [r(D), 8]],
         "note": "Composed for this film (music/bed.json has the prompt), slowed 1.8 % (bed-fit.mp3, atempo 0.9817) so its last chord rings to the final frame. -19 LUFS; ridden down where it swells under s12b and s13, and up over the last chord's decay so it is still heard on the last frame."}
if not bed.exists():
    raise SystemExit("compose the bed first: node kit/audio/music.mjs examples/luka-sembuh --prompt ...")

VOICE_CHAIN = "highpass=f=85,equalizer=f=220:t=q:w=1.1:g=-1.5,equalizer=f=2400:t=q:w=1.4:g=2,deesser=i=0.35:m=0.5:f=0.5,acompressor=threshold=-21dB:ratio=3:attack=8:release=140:knee=6:makeup=2"
# The last two lines (from 45.4 s in the film) 3.5 dB up: the take's own time there is the film's minus the stretch's shift.
LAST = s["s14"]["start"] - (json.loads((HERE / "voice" / "voice.json").read_text())["pieces"][-1]["at"] - json.loads((HERE / "voice" / "voice.json").read_text())["pieces"][-1]["from"])
cues = {
    "music": music,
    "voice": {"lufs": -16, "duck_db": -9, "sfx_db": -4, "chain": VOICE_CHAIN + f",volume=volume=1.5:enable='gte(t,{LAST:.2f})'"},
    "events": [
        {"t": r(DIVE_AT + 0.45), "file": f"{L}/sfx/whoosh_fast_3.mp3", "db": -9, "align": "peak", "note": "the dive into the scrape, after the question"},
        {"t": r(word("s02", "estafet.")[1] + 0.12), "file": f"{L}/sfx/card_1.mp3", "db": -5, "align": "peak", "note": "the time bar lands, after 'estafet'"},
        {"t": r(s["s05"]["start"] - 0.08), "file": f"{L}/sfx/whoosh_fast_2.mp3", "db": -15, "align": "peak", "note": "the dive into the clot, between the lines"},
        {"t": r(word("s05", "fibrin")[1] + 0.05), "file": f"{L}/sfx/shimmer_1.mp3", "db": -16, "align": "peak", "trim": [0, 1.2], "fade": 0.5, "note": "the strands spin (under the voice, small)"},
        {"t": r(word("s07", "tapi")[0] - 0.22), "file": f"{L}/sfx/impact_big_2.mp3", "db": -14, "align": "peak", "duck": 0.6, "trim": [0, 1.0], "fade": 0.6, "note": "THE TURN: the clot is set, but germs get in; in the pause before 'Tapi'"},
        {"t": r(word("s07", "tapi")[0] - 0.22), "file": f"{L}/sfx/sub_drop_1.mp3", "db": -17, "align": "peak", "trim": [0, 0.9], "fade": 0.4, "note": "its body"},
        {"t": r(word("s08", "dalam")[0] - 0.14), "file": f"{L}/sfx/pop_2.mp3", "db": -10, "align": "peak", "pan": 0.2, "note": "the white cell comes out of the vessel, after 'Makanya'"},
        {"t": r(EAT + 0.8), "file": f"{L}/sfx/click_1.mp3", "db": -5, "align": "peak", "pan": 0.25, "note": "the arms close on the germ"},
        {"t": r(s["s10"]["start"] - 0.12), "file": f"{L}/sfx/whoosh_fast_1.mp3", "db": -9, "align": "peak", "note": "the camera pulls back to the whole wound, between the lines"},
        {"t": r(word("s11", "tertutup.")[1] + 0.08), "file": f"{L}/sfx/tick_1.mp3", "db": -10, "align": "peak", "note": "the edges meet, after 'tertutup'"},
        {"t": r(word("s12", "beres:")[1] - 0.12), "file": f"{L}/sfx/whoosh_fast_4.mp3", "db": -20, "align": "peak", "note": "the scab lifts away"},
        {"t": r(word("s12b", "dirapikan")[1] + 0.05), "file": f"{L}/sfx/shimmer_2.mp3", "db": -10, "align": "peak", "trim": [0, 1.4], "fade": 0.6, "note": "the fibres comb"},
        {"t": r(s["s13"]["start"] - 0.05), "file": f"{L}/sfx/card_2.mp3", "db": -5, "align": "peak", "note": "the strength panel lands, before 'Hasilnya'"},
        {"t": r(OUT + 0.3), "file": f"{L}/sfx/whoosh_fast_3.mp3", "db": -9, "align": "peak", "note": "back out to the finger, before 'Jadi'"},
        *[{"t": r(s["s15"]["start"] + i * 0.16 + 0.25), "file": f"{L}/sfx/card_3.mp3", "db": -8, "align": "peak", "note": f"recap card {i + 1}"} for i in range(4)],
        {"t": r(s["s16"]["start"] + 0.1), "file": f"{L}/sfx/impact_big_3.mp3", "db": -8, "align": "peak", "duck": 0.6, "trim": [0, 1.6], "fade": 1.0, "note": "THE PAYOFF: the poster line"},
        {"t": r(s["s16"]["start"] + 0.1), "file": f"{L}/sfx/sub_drop_2.mp3", "db": -14, "align": "peak", "trim": [0, 1.2], "fade": 0.6, "note": "its body"},
    ],
}
out = ["{", f'  "music": {json.dumps(cues["music"], ensure_ascii=False)},', f'  "voice": {json.dumps(cues["voice"], ensure_ascii=False)},', '  "events": [']
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
