"""Lengthens the composed bed by playing two of its bars twice, so it runs past the film's new length.

    python3 examples/pythagoras/music/bed.build.py        writes music/bed-long.mp3 from music/bed.mp3

The bed (bed.json) was composed for a 51.57 s film and is at full level until about 51.8 s; the pauses held after
s13, s16, s17 and s19 made the film 55.47 s, and a loop needs the bed playing 1.5 s past the last frame. No new music
is composed (no ElevenLabs credits): the bed's own tempo is measured from its onsets (83.0 BPM: two bars repeat
best at 5.785 s), and at a beat in its middle the two bars before it are played again, with a 40 ms equal-power
crossfade at the join. The beat grid stays where it was.
"""
import subprocess
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
SR = 48000
BEAT0, BPM = 0.395, 83.0          # the first beat and the tempo, measured from the bed's onsets
TWO_BARS = 5.785                   # the repeat length that matches best (8 beats at 83 BPM)
AT = BEAT0 + 44 * 60 / BPM         # the join: a beat at 32.2 s, in the bed's thin piano stretch

raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(HERE / "bed.mp3"), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
j, back, f = int(AT * SR), int((AT - TWO_BARS) * SR), int(0.04 * SR)
w = np.sin(np.linspace(0, np.pi / 2, f))[:, None]
head, tail = x[:j], x[back:]
join = head[-f:] * np.cos(np.linspace(0, np.pi / 2, f))[:, None] + tail[:f] * w
out = np.concatenate([head[:-f], join, tail[f:]])
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "libmp3lame", "-b:a", "256k", str(HERE / "bed-long.mp3")],
               input=out.astype(np.float32).tobytes(), check=True)
print(f"bed-long.mp3: {len(out) / SR:.2f} s (bars {AT - TWO_BARS:.3f}-{AT:.3f} s played twice)")
