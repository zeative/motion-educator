"""Writes cues.json from storyboard.json and the take, so every sound sits on the event it belongs to after a retime.

    python3 examples/hp-lemot/cues.build.py

The music is the bed composed for this film (music/bed.mp3, kit/audio/music.mjs); this script keeps its file and
sets its level. The event times are the film's own (film.js works them out from the same words): the bar turning
red, the dive, a page written, the refused overwrite, the erases, the turn, the copies, the photo landing, the
chart's last bar, the squeezed temp files, the fast landing, the payoff and the poster.

Effects go between the words where the picture allows. The ones that must sit on their picture (a page landing,
the copies ticking, an erase) fall under the voice on purpose and are kept small.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
L = "lib"
sb = json.loads((HERE / "storyboard.json").read_text())
film = json.loads((HERE / "voice" / "voice.json").read_text())["film"]
grid = json.loads((HERE / "grid.json").read_text())
s = {x["id"]: x for x in sb["shots"]}
D = sb["duration"]
r = lambda x: round(x, 3)


def said(id, word, nth=0):
    hits = [w for w in film[id]["words"] if "".join(c for c in w[2].lower() if c.isalpha() or c == "-") == word]
    return hits[nth][0]


def end_of(id, word):
    return next(w[1] for w in film[id]["words"] if "".join(c for c in w[2].lower() if c.isalpha() or c == "-") == word)


# The same moments film.js uses.
LEMOT = said("s01", "lemot")
DIVE = s["s02"]["start"]
T4 = said("s04", "halaman") + 0.02
HIT = said("s04b", "ditimpa") + 0.06
ERASE2 = said("s05", "blok") + 0.02
COPY0 = said("s07", "mindahin") - 0.05
STEP = min(0.17, (s["s08"]["start"] - 0.25 - COPY0) / len(grid["moved"]))
ARRIVALS = [COPY0 + i * STEP + 0.36 for i in range(len(grid["moved"]))]
ERASE4 = said("s08", "dihapus") + 0.02
PHOTO_IN = said("s08", "masuk") + 0.02
DROP1 = said("s11", "masuk") + 0.02
POSTER = s["s13"]["start"] + 0.4

music = json.loads((HERE / "cues.json").read_text())["music"]
music.update({"lufs": -22, "start": 0, "fade_in": 0.01, "fade_out": 0.5, "duck_db": -6,
              # The bed rises about 4 dB on its own between 10 s and 30 s; hold it level under the voice.
              "ride": [[0, 0], [10, 0], [16, -2], [24, -3], [32, -3], [38, -1.5], [41.5, -1.5], [43, 1], [r(D), 1.5]],
              "note": "Composed for this film (ElevenLabs Music, the prompt in music/bed.json); kept at -22 LUFS under the voice, ridden level, and up a little under the poster so it runs to the last frame."})

events = [
    {"t": r(end_of("s01", "lemot") + 0.02), "file": f"{L}/sfx/alert_1.mp3", "db": -13, "align": "peak", "note": "the bar turns red: a small error click, after 'lemot'"},
    {"t": r(DIVE - 0.04), "file": f"{L}/sfx/whoosh_fast_3.mp3", "db": -13, "align": "peak", "note": "the dive into the phone, between the question and 'Di dalam'"},
    {"t": r(end_of("s02", "blok-blok") + 0.02), "file": f"{L}/sfx/shimmer_2.mp3", "db": -15, "align": "peak", "note": "the chip's face lit as the grid"},
    {"t": r(T4), "file": f"{L}/sfx/pop_3.mp3", "db": -11, "align": "peak", "note": "one page written (under 'halaman', on purpose)"},
    {"t": r(HIT), "file": f"{L}/sfx/alert_1.mp3", "db": -11, "align": "peak", "note": "the overwrite is refused (at the end of 'ditimpa')"},
    {"t": r(ERASE2), "file": f"{L}/sfx/whoosh_fast_5.mp3", "db": -13, "align": "peak", "note": "a whole block erased at once"},
    {"t": r(said("s06", "nah") - 0.4), "file": f"{L}/sfx/sub_drop_2.mp3", "db": -8, "align": "peak", "duck": 0.6, "note": "THE TURN: 'Nah', in the gap before it"},
    {"t": r(said("s06", "habis") + 0.05), "file": f"{L}/sfx/alert_2.mp3", "db": -17, "align": "peak", "trim": [0, 0.9], "fade": 0.4, "note": "no empty page left, after 'habis'"},
    *[{"t": r(a), "file": f"{L}/sfx/tick_1.mp3", "db": -9, "align": "peak", "pan": 0.2 * ((i % 3) - 1), "note": f"page {i + 1} of 11 moved (under the voice, small)"} for i, a in enumerate(ARRIVALS)],
    {"t": r(ERASE4), "file": f"{L}/sfx/whoosh_fast_5.mp3", "db": -13, "align": "peak", "note": "the old block erased"},
    {"t": r(PHOTO_IN), "file": f"{L}/sfx/pop_2.mp3", "db": -10, "align": "peak", "note": "the photo finally goes in"},
    {"t": r(s["s10"]["start"] + 0.03), "file": f"{L}/sfx/sub_drop_2.mp3", "db": -11, "align": "peak", "note": "the slowness, after 'lemot'"},
    {"t": r(said("s10", "sempit") + 0.1), "file": f"{L}/sfx/alert_1.mp3", "db": -15, "align": "peak", "note": "the temporary files do not fit"},
    {"t": r(DROP1), "file": f"{L}/sfx/pop_1.mp3", "db": -10, "align": "peak", "note": "with room: the photo lands at once (the release)"},
    {"t": r(end_of("s12", "ngebut") + 0.08), "file": f"{L}/sfx/success_3.mp3", "db": -13, "align": "peak", "note": "THE PAYOFF: fast again, after 'ngebut'"},
    {"t": r(s["s13"]["start"] + 0.05), "file": f"{L}/sfx/whoosh_fast_2.mp3", "db": -16, "align": "peak", "note": "the recap cards rise"},
    {"t": r(POSTER), "file": f"{L}/sfx/impact_big_3.mp3", "db": -9, "align": "peak", "duck": 0.8, "trim": [0, 1.4], "fade": 1.0, "note": "the poster line"},
]
cues = {"music": music, "events": events}
out = ["{", f'  "music": {json.dumps(music, ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(events) - 1 else ''}" for i, e in enumerate(events)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
words = [(a, b, w) for line in film.values() for a, b, w in line["words"]]
for e in events:
    on = next((w for a, b, w in words if a - 0.03 <= e["t"] <= b), None)
    if on:
        print(f"  under the voice at {e['t']:.2f} s ('{on}'): {e['note'][:60]}")
print(f"{len(events)} events -> cues.json")
