"""Writes cues.json from events.json, so every sound sits on the chalk mark film.js draws.

    node kit/tools/render.mjs examples/pythagoras --events     (events.json: every line, letter, tap, wipe and move)
    python3 examples/pythagoras/chalk_foley.py                 (sfx/: the chalk sounds, made from numbers)
    python3 examples/pythagoras/cues.build.py

The template's Sound line: a quiet bed with chalk scratches and taps and the soft wipe of the eraser. So: a scratch
of chalk on every line drawn, a run of short strokes for every word written, the back-and-forth of hatching, a quick
tick for every cell counted (all of them textures under the voice); and as events that must be heard, the chalk's
taps, the eraser's wipes, the triangles slid along the board and the air of the board sliding by. The music bed was
composed for the film (music/bed.json has its prompt).
"""
import json
import subprocess
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
sb = json.loads((HERE / "storyboard.json").read_text())
FX = "../../examples/pythagoras/sfx"
L = "lib/sfx"
r = lambda x: round(x, 3)

# The voice ducks the bed from its first word, which comes 0.15 s after the loop's seam; the bed is ridden down over the
# last half second the same way, so it does not drop 9 dB at the seam.
music = {"file": "../../examples/pythagoras/music/bed-long.mp3", "start": 0, "lufs": -22, "fade_in": 0.01, "fade_out": 0.6, "duck_db": -6, "fill": True,
         "ride": [[0, 0], [round(sb["duration"] - 0.6, 3), 0], [round(sb["duration"] - 0.05, 3), -5], [round(sb["duration"] + 1, 3), -5]],
         "note": "Composed for this film (ElevenLabs Music, the prompt in music/bed.json), two bars of it played twice to cover the held pauses (music/bed.build.py), with its run-on for the loop; -22 LUFS under the voice."}
voice = {"duck_db": -9, "sfx_db": -1, "note": "The bed dips 9 dB under the voice: it is a quiet piano bed and should still be heard between sentences. The chalk dips only 1 dB: it is quiet already, and the slides and wipes must be heard while he talks."}

# Where the voice is speaking (from the take's word times on the film's clock): an effect there cannot rise 5 dB over
# the words without masking them, and the effects layer is kept under about -20 LUFS momentary (below the voice), so
# such an effect is marked "under" and left out of the lift check. The wipes are all "under": the one in a pause (the
# bracket, s13) follows chalk lettering that is as loud as the budget lets a wipe be, so it cannot lift 5 dB either.
SAID = [(w[0], w[1]) for line in json.loads((HERE / "voice" / "voice.json").read_text())["film"].values() for w in line["words"]]
talking = lambda t: any(a - 0.05 < t + 0.3 and b > t - 0.05 for a, b in SAID)

events = []
last = {}
count = {}
for e in json.loads((HERE / "events.json").read_text()):
    kind, at, end = e["kind"], e["at"], e["end"]
    d = max(0.05, end - at)
    # two marks made at once by one hand are one sound
    if at - last.get(kind, -9) < (0.012 if kind == "tick" else 0.06):
        continue
    last[kind] = at
    k = count[kind] = count.get(kind, 0) + 1
    note = e.get("note") or {"line": "a chalk line drawn", "write": "chalk lettering", "hatch": "chalk hatching", "tick": "a cell counted"}.get(kind, kind)
    if kind == "line":
        events.append({"t": r(at), "file": f"{FX}/line_{k % 4 + 1}.wav", "db": -20 if note.startswith("retrace") or "run round" in note or "copied" in note else -15, "trim": [0, r(min(1.15, d + 0.04))], "fade": 0.04, "under": True, "note": note})
    elif kind == "write":
        events.append({"t": r(at), "file": f"{FX}/write_{k % 3 + 1}.wav", "db": -12, "trim": [0, r(min(2.3, d + 0.04))], "fade": 0.04, "under": True, "note": note})
    elif kind == "hatch":
        events.append({"t": r(at), "file": f"{FX}/hatch_{k % 2 + 1}.wav", "db": -12, "trim": [0, r(min(2.5, d + 0.05))], "fade": 0.05, "under": True, "note": note})
    elif kind == "tick":
        events.append({"t": r(at), "file": f"{FX}/tick_{k % 3 + 1}.wav", "db": -14, "under": True, "note": note})
    elif kind == "tap":
        # Every tap falls on a spoken word (the right angle on "right triangle", each term as it is said, the
        # square closing on "square", the double tap after "b squared"): an accent of the chalk under the voice,
        # heard as a click on the word rather than as an event between words, so it is a texture.
        events.append({"t": r(at), "file": f"{FX}/tap_{k % 3 + 1}.wav", "db": -5, "align": "peak", "under": True, "note": note + " (on the word)"})
    elif kind == "wipe":
        events.append({"t": r(at), "file": f"{FX}/wipe_{k % 2 + 1}.wav", "db": -17, **({"under": True} if "goes on" in note else {}), "trim": [0, r(min(0.8, d + 0.3))], "fade": 0.12, "note": note})
    elif kind == "move":
        carried = "carried" in note
        events.append({"t": r(at), "file": f"{FX}/slide_1.wav", "db": -16 if carried else -14, "trim": [0, r(min(0.7, d * 0.7 if carried else d * 0.8))], "fade": 0.16, "note": note})
    elif kind == "slide":
        # the air of the board going by: a long whoosh whose loudest moment is the middle of the glide
        last_glide = at > 54
        if last_glide:  # its loudest just after "why", not at the very end of the film
            # the glide runs under "That's why" to the loop's seam: its air sits under the words (marked "under") and has
            # died away by the last frame, so nothing is cut off when the film starts again
            events.append({"t": r(at + d * 0.45), "file": f"{L}/whoosh_long_1.mp3", "db": -19, "align": "peak", "trim": [0, 0.98], "fade": 0.45, "fade_in": 0.1, "under": True, "note": "the board glides back to the start (under 'That's why')"})
            continue
        events.append({"t": r(at + d * 0.5), "file": f"{L}/whoosh_long_1.mp3", "db": -13 if last_glide else -14, "align": "peak", "trim": [0, r(min(1.6, d + 0.5))], "fade": 0.45, "fade_in": 0.12,
                       "note": "the board glides back to the start" if last_glide else "the board glides along"})

events.sort(key=lambda x: x["t"])

# The named cues sit where they are clearly heard but under the words: about 4 to 8 dB below voice + music around
# their loudest moment. Their levels were fitted to the mix (the effects layer isolated as the full mix minus the
# gain-matched music-and-voice mix, 300 ms round each cue's peak); the time each was fitted at is the key.
FIT = {7.5: -10.5, 13.0: -11.5, 23.6: -10, 48.3: -10,                     # the glides
       28.8: -9, 36.7: -14, 39.1: -11, 51.6: -11}                         # the wipes
# The bracket's wipe (on "c.") and triangle 3's slide (on "turning") land on words: they sit under them.
ONWORD = {31.0: -19, 35.0: -23}
for e in events:
    near = min(ONWORD, key=lambda k: abs(k - e["t"]))
    if abs(near - e["t"]) < 0.08 and ("/wipe_" in e["file"] or "/slide_" in e["file"]):
        e.update(db=ONWORD[near], under=True)
for e in events:
    near = min(FIT, key=lambda k: abs(k - e["t"]))
    if not e.get("under") and abs(near - e["t"]) < 0.08:
        e["db"] = FIT[near]

# A loudness budget for the effects layer: it stays under about -20 LUFS momentary in the finished mix (the mix adds
# about +1 dB of master gain), so it never rises over the voice. Where the chalk is dense (a figure drawn in a burst)
# the strokes that overlap a window over budget are lowered together, a little at a time, until it fits.
BUDGET = -21.5
SR = 48000
KIT = HERE.parent.parent / "kit" / "audio"
_cache = {}


def _load(rel):
    if rel not in _cache:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(KIT / rel), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
        _cache[rel] = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
    return _cache[rel]


def _place(e, n):
    x = _load(e["file"])
    if "trim" in e:
        x = x[int(e["trim"][0] * SR): int(e["trim"][1] * SR)]
    x = x.copy()
    if e.get("fade"):
        k = min(len(x), int(e["fade"] * SR)); x[-k:] *= np.linspace(1, 0, k)[:, None]
    if e.get("fade_in"):
        k = min(len(x), int(e["fade_in"] * SR)); x[:k] *= np.linspace(0, 1, k)[:, None]
    env = np.abs(x).max(axis=1)
    x = x / max(env.max(), 1e-9) * 10 ** (e["db"] / 20)
    i = int(e["t"] * SR) - {"peak": int(np.argmax(env)), "end": len(x), "start": 0}[e.get("align", "start")]
    return i, x


def _momentary(buf):
    try:  # K-weighting (ITU-R BS.1770) when scipy is there; plain energy otherwise (chalk sits where K adds little)
        from scipy.signal import lfilter
        buf = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], buf, axis=0)
        buf = lfilter([1, -2, 1], [1, -1.99004745483398, 0.99007225036621], buf, axis=0)
    except ImportError:
        pass
    p = (buf ** 2).sum(axis=1)
    hop, win = SR // 10, int(0.4 * SR)
    c = np.concatenate([[0], np.cumsum(p)])
    starts = np.arange(0, max(1, len(p) - win), hop)
    return starts, -0.691 + 10 * np.log10((c[starts + win] - c[starts]) / win + 1e-12)


N = int((sb["duration"] + 1) * SR)
for _ in range(6):
    buf = np.zeros((N, 2))
    spans = []
    for e in events:
        if not e.get("under"):  # the budget is the textures' (the named cues are fitted above)
            spans.append((0, 0))
            continue
        i, x = _place(e, N)
        a, b = max(0, i), min(N, i + len(x))
        if b > a:
            buf[a:b] += x[a - i: b - i]
        spans.append((i, i + len(x)))
    starts, m = _momentary(buf)
    over = [(st, lv - BUDGET) for st, lv in zip(starts, m) if lv > BUDGET]
    if not over:
        break
    cut = {}
    for st, ex in over:
        for k, (a, b) in enumerate(spans):
            if a < st + int(0.4 * SR) and b > st and events[k].get("under"):
                cut[k] = max(cut.get(k, 0), ex + 0.3)
    for k, c in cut.items():
        events[k]["db"] = round(events[k]["db"] - c, 1)
print(f"texture budget: loudest window {m.max() + 1:.1f} LUFS momentary after the master gain (budget {BUDGET + 1:.1f})")
out = ["{", f'  "music": {json.dumps(music, ensure_ascii=False)},', f'  "voice": {json.dumps(voice, ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(x, ensure_ascii=False)}{',' if i < len(events) - 1 else ''}" for i, x in enumerate(events)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(events)} events -> cues.json")
