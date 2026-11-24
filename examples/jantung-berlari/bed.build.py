"""Writes music/bed-film.mp3: the composed bed (music/bed.mp3) with its kick taken out while the heart is at rest.

    python3 examples/jantung-berlari/bed.build.py

The bed's kick is the running heart, 150 a minute, and the bed has no half-time section of its own, so through the
rest (from the park coming back in s07 to the pacemaker firing in s11) its kick would contradict the 75 on the HUD.
There the bed is high-passed above the kick (two 2-pole high-passes at 170 Hz) and a little quieter, crossfaded in and
out over 0.15 s, so what marks the beat is the heart's own thump at 75 (cues.json). Nothing is generated: the bed is
the same composition, filtered. The times come from storyboard.json, voice/voice.json and music/kicks.json, as in
film.js (REST_FROM, SPARK).
"""
import json
import subprocess
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
SR = 48000
sb = json.loads((HERE / "storyboard.json").read_text())
s = {x["id"]: x for x in sb["shots"]}
words = json.loads((HERE / "voice" / "voice.json").read_text())["film"]
kicks = json.loads((HERE / "music" / "kicks.json").read_text())["kicks"]
ngegas = next(w[0] for w in words["s11"]["words"] if w[2].lower().startswith("ngegas"))
REST_FROM = s["s07"]["start"] + 5 / 12
SPARK = next(k for k in kicks if k >= ngegas)


def load(args):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(HERE / "music" / "bed.mp3"), *args, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


dry = load([])
wet = load(["-af", "highpass=f=170:p=2,highpass=f=170:p=2,volume=-2dB"])
n = min(len(dry), len(wet))
t = np.arange(n) / SR
ramp = 0.15
w = np.clip(np.minimum((t - REST_FROM) / ramp, (SPARK - 0.02 - t) / ramp), 0, 1)[:, None]
out = dry[:n] * (1 - w) + wet[:n] * w
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "libmp3lame", "-b:a", "192k", str(HERE / "music" / "bed-film.mp3")], input=out.astype(np.float32).tobytes(), check=True)
print(f"music/bed-film.mp3: the kick filtered out from {REST_FROM:.2f} s to {SPARK:.2f} s")
