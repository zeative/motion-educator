"""Writes music/kicks.json: when the bed's kick drum lands, measured from music/bed.mp3.

    python3 examples/jantung-berlari/beats.build.py

The bed is a chiptune at 150 beats a minute whose kick is the running heart (the storyboard's music note), so the
picture's heart squeezes on the kick, not on a grid guessed from the tempo. The bed was composed, not sequenced: its
beat drifts by about 20 ms and jumps by 125 ms near 51.5 s, which a fixed grid would miss by a frame or two.
A kick is an onset in the 40-120 Hz band; where the bed leaves one out (a fill), the beat is kept on the grid between
its neighbours, because the heart does not skip.
"""
import json
import subprocess
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
SR, HOP = 8000, 40  # 5 ms steps
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(HERE / "music" / "bed.mp3"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).astype(np.float64)
spec = np.fft.rfft(x)
freq = np.fft.rfftfreq(len(x), 1 / SR)
low = np.fft.irfft(spec * ((freq > 40) & (freq < 120)), len(x))
n = len(low) // HOP
env = np.sqrt((low[: n * HOP] ** 2).reshape(n, HOP).mean(1))
onset = np.maximum(0, np.diff(env, prepend=env[0]))
thr = np.percentile(onset, 97)
peaks = [i * HOP / SR for i in range(2, n - 2) if onset[i] > thr and onset[i] == onset[i - 2 : i + 3].max()]

BEAT = 60 / 150
kicks = []
for t in peaks:
    if kicks and t - kicks[-1] < BEAT * 0.5:
        continue  # a double onset of one kick
    while kicks and t - kicks[-1] > BEAT * 1.5:
        kicks.append(kicks[-1] + (t - kicks[-1]) / round((t - kicks[-1]) / BEAT))  # a kick the bed left out
    kicks.append(t)
kicks = [round(k, 3) for k in kicks]
gaps = np.diff(kicks)
(HERE / "music" / "kicks.json").write_text(json.dumps({"bpm": 150, "source": "music/bed.mp3, onsets in 40-120 Hz (beats.build.py)", "kicks": kicks}) + "\n")
print(f"{len(kicks)} kicks from {kicks[0]} to {kicks[-1]} s; spacing {gaps.min():.3f} to {gaps.max():.3f} s (median {np.median(gaps):.3f})")
