"""Levels each named cue from the last mix, into levels.json (cues.build.py adds it to the cue's level).

    python3 examples/popcorn/levels.py      (after kit/audio/mix.py: the full mix and the music-and-voice mix)

For each cue that is not a texture: the effects layer is isolated (out/popcorn.mp4 less out/popcorn-music-only.mp4,
gain-matched by each mix's master gain) and its loudest 400 ms momentary loudness in the cue's first 0.4 s is set
against the voice and music's at the same moment. The cue is moved toward 6 dB under them (the reviewers' 4 to 8 dB
band), never more than 6 dB in one round and never past -1 dBFS before the master gain.
"""
import json
import re
import subprocess
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
OUT = HERE / "out"
KIT = HERE.parent.parent / "kit" / "audio"
SR, TARGET = 48000, -6.0


def load(p, ch=2):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", str(ch), "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, ch).astype(np.float64)


def master(txt):
    return float(re.search(r"master gain ([+-][\d.]+) dB", txt.read_text().splitlines()[0]).group(1))


def momentary(x):
    """400 ms K-weighted loudness every 50 ms (ffmpeg ebur128's momentary)."""
    raw = np.clip(x, -1, 1).astype(np.float32).tobytes()
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-af", "ebur128=framelog=info", "-f", "null", "-"], input=raw, capture_output=True).stderr.decode()
    t, m = [], []
    for line in err.splitlines():
        g = re.search(r"t:\s*([\d.]+).*?M:\s*(-?[\d.inf]+)", line)
        if g:
            t.append(float(g.group(1)))
            m.append(-120.0 if "inf" in g.group(2) else float(g.group(2)))
    return np.array(t), np.array(m)


full, mo = load(OUT / "popcorn.mp4"), load(OUT / "popcorn-music-only.mp4")
n = min(len(full), len(mo))
fx = full[:n] - mo[:n] * 10 ** ((master(OUT / "popcorn.mix.txt") - master(OUT / "popcorn-music-only.mix.txt")) / 20)
tf, mf = momentary(fx)
tm, mm = momentary(mo[:n] * 10 ** ((master(OUT / "popcorn.mix.txt") - master(OUT / "popcorn-music-only.mix.txt")) / 20))
levels = json.loads((HERE / "levels.json").read_text()) if (HERE / "levels.json").exists() else {}
report = []
for e in json.loads((HERE / "cues.json").read_text())["events"]:
    if e.get("under") or "(kept low" in e.get("note", ""):
        continue
    s = load(KIT / e["file"], 1)[:, 0]
    if "trim" in e:
        s = s[int(e["trim"][0] * SR): int(e["trim"][1] * SR)]
    start = e["t"] - {"peak": np.argmax(np.abs(s)) / SR, "end": len(s) / SR}.get(e.get("align", "start"), 0)
    # the momentary window ends at its time stamp: the windows that cover the cue's first 0.4 s end 0.4 s after it
    sel = (tf >= start + 0.15) & (tf <= start + 0.55)
    if not sel.any():
        continue
    got = mf[sel].max() - mm[sel].max()
    key = f"{e['t']:.2f} {Path(e['file']).name}"
    step = float(np.clip(TARGET - got, -6, 6))
    if abs(step) > 0.5:
        levels[key] = round(levels.get(key, 0) + step, 1)
    report.append((got, e["t"], Path(e["file"]).name))
(HERE / "levels.json").write_text(json.dumps(dict(sorted(levels.items())), indent=1) + "\n")
g = np.array([x[0] for x in report])
print(f"{len(g)} named cues: under voice+music by median {-np.median(g):.1f} dB; {np.sum((g >= -8) & (g <= -4))} within 4-8 dB, {np.sum(g < -8)} quieter, {np.sum(g > -4)} louder")
