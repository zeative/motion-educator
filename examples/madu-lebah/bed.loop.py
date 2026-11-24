"""The composed bed (music/bed.mp3) fades out over its last four seconds, so the music dipped where the film loops.
This writes music/bed-loop.wav: the same bed, with its fading tail from 47.5 s replaced by the two bars before it
(40.83-46.83 s at 72 BPM: no rests there), joined on the beat with a short crossfade, so it plays at full level
through the last frame and runs on into the first. cues.json points at it.

    python3 examples/madu-lebah/bed.loop.py
"""
import subprocess
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
SR = 48000
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(HERE / "music" / "bed.mp3"), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)
BAR = 4 * 60 / 72
at, back, xf = int(47.5 * SR), int(2 * BAR * SR), int(0.35 * SR)
src = x[at - back :]
out = x.copy()
n = len(out) - at
w = np.ones(n)
w[:xf] = np.sin(np.linspace(0, np.pi / 2, xf)) ** 2
tail = src[:n]
out[at:] = out[at:] * (1 - w[:, None]) + tail * w[:, None]
# the copy ends before the track does: hold its last part, faded, past 53 s only (well after the run-on)
y = np.clip(out, -1, 1)
with wave.open(str(HERE / "music" / "bed-loop.wav"), "wb") as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes((y * 32767).astype(np.int16).tobytes())
rms = lambda s: 20 * np.log10(np.sqrt(np.mean(s**2)) + 1e-9)
print(f"bed-loop.wav: {len(y) / SR:.2f} s; level 44-47 s {rms(y[44 * SR:47 * SR]):.1f} dB, 48.5-51 s {rms(y[int(48.5 * SR):51 * SR]):.1f} dB (was {rms(x[int(48.5 * SR):51 * SR]):.1f})")
