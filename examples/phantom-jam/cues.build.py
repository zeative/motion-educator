"""Writes cues.json from storyboard.json and the take, so every sound sits on its event after a retime.

    python3 examples/phantom-jam/cues.build.py

The music is the bed composed for this film (music/bed.mp3, kit/audio/music.mjs; its prompt is in music/bed.json).
Measured, the bed sits about 9 dB louder from 37.9 s on than before it and its last chord dies away from 77 s, so
the ride below lifts the first half, holds the second half down, and lifts the decaying chord so it rings to the
last frame of the poster.

Effects go between the words: each one is placed in the silence nearest its moment (the take's word times), and the
script prints any that still touch a word. Hits on the turn ("Here's the surprise") and on the payoff (the poster).
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
L = "lib"
sb = json.loads((HERE / "storyboard.json").read_text())
film = json.loads((HERE / "voice" / "voice.json").read_text())["film"]
s = {x["id"]: x for x in sb["shots"]}
D = sb["duration"]
r = lambda x: round(x, 3)
words = sorted((a, b, w) for line in film.values() for a, b, w in line["words"])


def key(w):
    return "".join(c for c in w.lower() if c.isalpha() or c == "-")


def said(id, word, nth=0):
    return [w for w in film[id]["words"] if key(w[2]) == word][nth][0]


def end_of(id, word, nth=0):
    return [w for w in film[id]["words"] if key(w[2]) == word][nth][1]


# Where the voice is really silent: the word times from the alignment give a sentence's last word its pause too,
# so the gaps are measured on the take itself (20 ms windows more than 30 dB under its loudest), in film time.
import subprocess
import numpy as np
piece = json.loads((HERE / "voice" / "voice.json").read_text())["pieces"][0]
raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", str(HERE / "voice" / "take.mp3"), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
pcm = np.frombuffer(raw, dtype=np.float32)
win = 320
rms = np.sqrt(np.mean(pcm[: len(pcm) // win * win].reshape(-1, win) ** 2, axis=1)) + 1e-9
db = 20 * np.log10(rms / rms.max())
quiet = db < -30
SHIFT = piece["at"] - piece["from"]


def gap_after(t, need=0.18):
    """The film time of the first silence of at least `need` s at or after t, starting 0.03 s into it."""
    i = max(0, int((t - SHIFT) * 50))
    n = int(need * 50)
    while i + n < len(quiet):
        if quiet[i : i + n].all():
            found = i / 50 + SHIFT + 0.03
            return found if found < t + 1.0 else t
        i += 1
    return t


music = json.loads((HERE / "cues.json").read_text())["music"]
music.update({
    "file": "../../examples/phantom-jam/music/bed.mp3", "lufs": -22, "start": 0, "fade_in": 0.01, "fade_out": 0.3, "duck_db": -6,
    "ride": [[0, 4], [35.6, 4], [37.9, -5], [76.9, -5], [77.4, 4], [78.0, 14], [78.6, 22], [r(D), 28]],
    "note": "Composed for this film (ElevenLabs Music, prompt in music/bed.json). It steps up about 9 dB at 37.9 s and its last chord dies from 77 s: ridden level, and the decay lifted so it rings to the last frame.",
})

events = [
    {"t": r(gap_after(end_of("s01", "nowhere") - 0.3, 0.1)), "file": f"{L}/sfx/whoosh_fast_2.mp3", "db": -14, "align": "peak", "note": "the camera flies along the queue"},
    {"t": r(gap_after(said("s03", "nothing") + 0.4, 0.1)), "file": f"{L}/sfx/sub_drop_2.mp3", "db": -8, "align": "peak", "duck": 0.6, "note": "THE TURN: before 'Here's the surprise'"},
    {"t": r(s["s06"]["start"] - 0.08), "file": f"{L}/sfx/whoosh_long_1.mp3", "db": -16, "align": "peak", "trim": [0, 2.0], "fade": 0.8, "note": "the road curls into the ring"},
    {"t": r(s["s10"]["start"] - 0.08), "file": f"{L}/sfx/impact_big_2.mp3", "db": -11, "align": "peak", "duck": 0.5, "trim": [0, 1.4], "fade": 0.8, "note": "a few minutes later: the jam (on the flash, just before 'Within')"},
    {"t": r(s["s14"]["start"] - 0.02), "file": f"{L}/sfx/impact_big_3.mp3", "db": -12, "align": "peak", "duck": 0.5, "trim": [0, 1.2], "fade": 0.7, "note": "a car has stopped: the cut to the whole jam"},
    {"t": r(gap_after(said("s17", "tailgate") + 0.3, 0.1)), "file": f"{L}/sfx/alert_1.mp3", "db": -14, "align": "peak", "note": "tailgating crossed out"},
    {"t": r(gap_after(said("s20", "on") + 0.12, 0.1)), "file": f"{L}/sfx/success_3.mp3", "db": -13, "align": "peak", "note": "the wave stops with you"},
    {"t": r(gap_after(said("s22", "faded") + 0.3, 0.1)), "file": f"{L}/sfx/shimmer_2.mp3", "db": -15, "align": "peak", "note": "the last brake lights go out"},
    {"t": r(s["s25"]["start"] - 0.05), "file": f"{L}/sfx/impact_big_1.mp3", "db": -9, "align": "peak", "duck": 0.8, "trim": [0, 1.6], "fade": 1.0, "note": "THE PAYOFF: the poster"},
]
out = ["{", f'  "music": {json.dumps(music, ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(events) - 1 else ''}" for i, e in enumerate(events)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
for e in events:
    k = int((e["t"] - SHIFT) * 50)
    print(f"  {e['t']:6.2f} s {'in a silence' if k >= len(quiet) or quiet[k] else 'UNDER THE VOICE'}: {e['note']}")
print(f"{len(events)} events -> cues.json")
