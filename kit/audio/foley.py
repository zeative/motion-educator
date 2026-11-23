"""Foley made from numbers, for the drawn templates: the sounds a hand and a sheet of paper make, which the fetched
library (fetch.sh, Mixkit) does not have. Seeded, so every run writes the same files.

    python3 kit/audio/foley.py            writes kit/audio/lib/foley/*.wav (skips files that exist; --force redoes)

  pen_1..3     a marker drawing one line on paper (0.9 s: trim it to the stroke)
  write_1..3   a marker writing a word, letter by letter (1.8 s: trim it to the word)
  rub_1..2     an eraser rubbing out (0.6 s)
  boing_1      a spring, for a bounce or a surprise
  clap_1       one soft clap, for a payoff
  thump_1..2   something soft and heavy landing in a basket
  squeak_1     a shoe's rubber heel sliding on a shop floor (1.4 s: trim it)
  scrape_1     wheels skidding on a hard floor (2.4 s: trim it)
Cue them like any effect in cues.json: "file": "lib/foley/pen_2.wav", with "trim": [0, stroke] for the line ones.
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
OUT = Path(__file__).resolve().parent / "lib" / "foley"


def band(x, lo, hi):
    """Band-pass by FFT: keep lo..hi Hz with soft edges."""
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X = np.fft.rfft(x)
    w = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * w, len(x))


def smooth_noise(rng, n, rate):
    """Slow random wander at about `rate` Hz, 0 mean, unit-ish size."""
    k = max(2, int(n / SR * rate) + 2)
    pts = rng.standard_normal(k)
    return np.interp(np.linspace(0, k - 1, n), np.arange(k), pts)


def env(n, attack, release):
    e = np.ones(n)
    a, r = int(attack * SR), int(release * SR)
    e[:a] = np.linspace(0, 1, a) ** 0.7
    e[n - r:] *= np.linspace(1, 0, r) ** 1.5
    return e


def stroke(rng, seconds, lo=1800, hi=7500):
    """A felt tip dragged across paper: rough band noise whose loudness and grain wander with the hand."""
    n = int(seconds * SR)
    x = band(rng.standard_normal(n), lo, hi)
    grain = 1 + 0.6 * np.clip(band(rng.standard_normal(n), 20, 90) * 6, -1, 1)
    hand = 0.75 + 0.25 * smooth_noise(rng, n, 7)
    return x * grain * hand * env(n, 0.012, min(0.08, seconds * 0.3))


def pen(rng):
    return stroke(rng, 0.9)


def write(rng):
    n = int(1.8 * SR)
    out = np.zeros(n)
    t = 0.0
    while t < 1.75:
        d = rng.uniform(0.05, 0.13)
        s = stroke(rng, d, lo=rng.uniform(1500, 2400), hi=rng.uniform(6000, 8500)) * rng.uniform(0.6, 1.0)
        a = int(t * SR)
        out[a:a + len(s)] += s[: n - a]
        t += d + rng.uniform(0.015, 0.06)
    return out


def rub(rng):
    n = int(0.6 * SR)
    x = band(rng.standard_normal(n), 300, 2600)
    strokes = 0.35 + 0.65 * np.abs(np.sin(np.pi * 8.5 * np.arange(n) / SR + rng.uniform(0, 3)))
    return x * strokes * env(n, 0.02, 0.12)


def boing(rng):
    n = int(0.65 * SR)
    t = np.arange(n) / SR
    f = 210 * (1 + 0.9 * np.exp(-t * 30)) * (1 + 0.22 * np.exp(-t * 5) * np.sin(2 * np.pi * 13 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)) * np.exp(-t * 5.5)
    return x * env(n, 0.004, 0.08)


def clap(rng):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for k, at in enumerate([0, 0.007, 0.016]):
        a = int(at * SR)
        burst = band(rng.standard_normal(n - a), 900, 4500) * np.exp(-t[: n - a] * (90 - k * 20))
        x[a:] += burst * (1 - 0.25 * k)
    room = band(rng.standard_normal(int(0.12 * SR)), 500, 5000) * np.exp(-np.arange(int(0.12 * SR)) / SR * 40)
    return np.convolve(x, room * 0.02, mode="full")[:n] + x


def thump(rng):
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    f = 95 * np.exp(-t * 7) + 48
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16)
    paper = band(rng.standard_normal(n), 150, 1600) * np.exp(-t * 45) * 0.5
    return (body + paper) * env(n, 0.002, 0.05)


def squeak(rng):
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    f = 1050 * (1 + 0.08 * smooth_noise(rng, n, 9))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    stick = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 38 * t + 3 * smooth_noise(rng, n, 5)))
    hiss = band(rng.standard_normal(n), 700, 3500) * 0.35
    return (tone * 0.6 * band(stick, 1, 400) + hiss) * (0.7 + 0.3 * smooth_noise(rng, n, 4)) * env(n, 0.03, 0.2)


def scrape(rng):
    n = int(2.4 * SR)
    x = band(rng.standard_normal(n), 400, 3200)
    chatter = 0.6 + 0.4 * np.clip(band(rng.standard_normal(n), 15, 60) * 8, -1, 1)
    return x * chatter * env(n, 0.04, 0.3)


MAKE = {"pen": (pen, 3), "write": (write, 3), "rub": (rub, 2), "boing": (boing, 1), "clap": (clap, 1), "thump": (thump, 2), "squeak": (squeak, 1), "scrape": (scrape, 1)}


def save(path, x, seed):
    rng = np.random.default_rng(seed)
    x = x / max(np.abs(x).max(), 1e-9) * 0.89
    # a hair of stereo: the right channel a few samples late
    st = np.stack([x, np.roll(x, int(rng.integers(8, 24)))], axis=1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((st * 32767).astype("<i2").tobytes())


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    force = "--force" in sys.argv
    for k, (name, (fn, count)) in enumerate(MAKE.items()):
        for i in range(1, count + 1):
            path = OUT / f"{name}_{i}.wav"
            if path.exists() and not force:
                continue
            seed = 1000 * (k + 1) + i
            save(path, fn(np.random.default_rng(seed)), seed)
            print(f"made  {path.relative_to(OUT.parent.parent)}")
