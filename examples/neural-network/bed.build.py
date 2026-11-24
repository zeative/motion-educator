"""Shapes the composed bed to the film: music/bed.mp3 -> music/bed-shaped.wav (cues.json plays the shaped one).

    python3 examples/neural-network/bed.build.py

The bed was composed as one even piece (ElevenLabs Music, its prompt in music/bed.json; no new composition was
made). The storyboard's music note asks it to thin under the error (s09 to s12), fill out for the repetition (s14)
and drop its bass for one bar as the scale opens (s18). That is done here with equalisation over time: the bed is
split into three bands (below 200 Hz, 200 Hz to 2 kHz, above 2 kHz, with zero-phase filters so the bands add back to
the original exactly), each band gets its own gain curve, and the bands are summed. Every change starts and ends on
a beat and ramps over a quarter of a second. The run-on past the last frame (which the mix lays over the opening
for the loop) is left as composed.
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfiltfilt

HERE = Path(__file__).parent
SR = 48000
sb = json.loads((HERE / "storyboard.json").read_text())
s = {x["id"]: x for x in sb["shots"]}

raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(HERE / "music" / "bed.mp3"), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
low = sosfiltfilt(butter(4, 200, "lp", fs=SR, output="sos"), x, axis=0)
rest = x - low
high = sosfiltfilt(butter(4, 2000, "hp", fs=SR, output="sos"), rest, axis=0)
mid = rest - high

t = np.arange(len(x)) / SR
RAMP = 0.25


def window(t0, t1):
    """1 inside [t0, t1], ramping in and out over RAMP (raised cosine), 0 outside."""
    a = np.clip((t - t0) / RAMP, 0, 1)
    b = np.clip((t1 - t) / RAMP, 0, 1)
    return (0.5 - 0.5 * np.cos(np.pi * a)) * (0.5 - 0.5 * np.cos(np.pi * b))


# (band, from, to, dB)
SHAPES = [
    ("low", s["s09"]["start"], s["s13"]["start"], -7.0),  # thinner under the error: guess against answer, the gap,
    ("mid", s["s09"]["start"], s["s13"]["start"], -2.0),  # the error sent back, the nudge
    ("low", s["s14"]["start"], s["s15"]["start"], +3.5),  # fuller for the repetition
    ("mid", s["s14"]["start"], s["s15"]["start"], +1.5),
    ("low", s["s18"]["start"], s["s18"]["start"] + 4 * sb["music"]["beat"], -20.0),  # the bass drops out for a bar
    ("mid", s["s18"]["start"], s["s19"]["start"], +2.0),  # and the scale shot opens up
    ("high", s["s18"]["start"], s["s19"]["start"], +4.0),
]
gains = {"low": np.zeros_like(t), "mid": np.zeros_like(t), "high": np.zeros_like(t)}
for band, t0, t1, db in SHAPES:
    gains[band] += db * window(t0, t1)
g = {k: (10 ** (v / 20))[:, None] for k, v in gains.items()}
y = low * g["low"] + mid * g["mid"] + high * g["high"]
peak = np.abs(y).max()
if peak > 0.99:
    y *= 0.99 / peak
out = HERE / "music" / "bed-shaped.wav"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", str(out)], input=y.astype(np.float32).tobytes(), check=True)


def level(sig, t0, t1):
    seg = sig[int(t0 * SR) : int(t1 * SR)]
    return 20 * np.log10(np.sqrt(np.mean(seg**2)) + 1e-12)


for sid in ("s08", "s10", "s12", "s14", "s16", "s18", "s19"):
    a, b = s[sid]["start"], s[sid]["end"]
    print(f"{sid}: {level(x, a, b):6.1f} -> {level(y, a, b):6.1f} dB RMS (low band {level(low, a, b):6.1f} -> {level(low * g['low'], a, b):6.1f})")
print(f"-> {out}")
