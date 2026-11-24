"""The comic's own sounds, made from numbers (seeded: every run writes the same files), for what the fetched library
(kit/audio/lib, Mixkit) does not have: a water drop, a sizzle, a slide whistle, a drum roll, a buzzer, a muted
trumpet, a sad trombone, a crunch. Written into examples/popcorn/sfx/ and cued by cues.build.py.

    python3 examples/popcorn/sfx.build.py

Nobody has listened to these: they were made by recipe and checked by measurement only (length, peak, where the
energy sits). Each is short and plain on purpose, so a bad one is easy to hear and replace.
"""
import wave
from pathlib import Path

import numpy as np

SR = 48000
OUT = Path(__file__).parent / "sfx"
OUT.mkdir(exist_ok=True)


def band(x, lo, hi):
    f = np.fft.rfftfreq(len(x), 1 / SR)
    w = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4)
    return np.fft.irfft(np.fft.rfft(x) * w, len(x))


def env(n, attack, release, curve=1.5):
    e = np.ones(n)
    a, r = max(1, int(attack * SR)), max(1, int(release * SR))
    e[:a] = np.linspace(0, 1, a)
    e[n - r:] *= np.linspace(1, 0, r) ** curve
    return e


def decay(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def sweep(f0, f1, n, shape="exp"):
    """Phase of a tone gliding from f0 to f1 over n samples."""
    k = np.linspace(0, 1, n)
    f = f0 * (f1 / f0) ** k if shape == "exp" else f0 + (f1 - f0) * k
    return 2 * np.pi * np.cumsum(f) / SR


def saw(phase, harmonics=12):
    return sum(np.sin(phase * h) / h for h in range(1, harmonics + 1))


def lowpass_env(x, cut):
    """A crude time-varying low-pass: blend of the signal and its smoothed self by a cutoff curve in 0..1."""
    out = np.zeros_like(x)
    y = 0.0
    for i in range(len(x)):
        a = cut[i]
        y += a * (x[i] - y)
        out[i] = y
    return out


def save(name, x, seed=None):
    x = np.asarray(x, dtype=np.float64)
    x = x / (np.abs(x).max() + 1e-9) * 0.89
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


rng = np.random.default_rng(7)

# a water drop: a quick upward glide, a "plip"
n = int(0.14 * SR)
save("plip", np.sin(sweep(420, 1500, n)) * decay(n, 0.035) * env(n, 0.002, 0.03))

# oil sizzling in the pan: hiss with crackles, 2.6 s
n = int(2.6 * SR)
hiss = band(rng.standard_normal(n), 2500, 9000) * 0.25
crackle = np.zeros(n)
for i in rng.integers(0, n - 2000, 260):
    m = int(rng.integers(80, 400))
    crackle[i:i + m] += rng.standard_normal(m) * decay(m, 0.002) * rng.uniform(0.3, 1)
save("sizzle", (hiss + band(crackle, 1500, 10000)) * env(n, 0.15, 0.5))

# a small puff of steam: "fff"
n = int(0.22 * SR)
save("puff", band(rng.standard_normal(n), 900, 4500) * env(n, 0.015, 0.16))

# the steam's hiss, rising with the pressure, 2.6 s
n = int(2.6 * SR)
x = rng.standard_normal(n)
lo = band(x, 1200, 3000)
hi = band(x, 3000, 8000)
k = np.linspace(0, 1, n)
save("hiss_rise", (lo * (1 - k) + hi * k) * (0.2 + 0.8 * k ** 1.5) * env(n, 0.3, 0.12))

# the pressure cooker's weight rattling: metal ticks at 12 a second, 1.2 s
n = int(1.2 * SR)
x = np.zeros(n)
for j, t in enumerate(np.arange(0, 1.15, 1 / 12)):
    i = int(t * SR)
    m = int(0.05 * SR)
    seg = band(rng.standard_normal(m), 2500, 7000) * decay(m, 0.006) + np.sin(2 * np.pi * (2150 + 90 * (j % 2)) * np.arange(m) / SR) * decay(m, 0.012) * 0.5
    x[i:i + m] += seg[: max(0, min(m, n - i))] * (0.8 + 0.2 * (j % 2))
save("rattle", x)

# the cooker letting steam out: "PSST"
n = int(0.6 * SR)
save("psst", band(rng.standard_normal(n), 2200, 9000) * env(n, 0.008, 0.45, 2))

# a slide whistle rising, stopping dead on the value (1.15 s)
n = int(1.15 * SR)
ph = sweep(650, 1700, n)
vib = 1 + 0.004 * np.sin(2 * np.pi * 6 * np.arange(n) / SR)
x = np.sin(ph * vib) + 0.12 * np.sin(2 * ph * vib) + 0.02 * band(rng.standard_normal(n), 1000, 6000)
save("whistle", x * env(n, 0.05, 0.02, 1))

# a snare drum roll building (2.0 s): strokes at 22 a second, louder and louder
n = int(2.0 * SR)
x = np.zeros(n)
for j, t in enumerate(np.arange(0, 1.95, 1 / 22)):
    i, m = int(t * SR), int(0.06 * SR)
    stroke = band(rng.standard_normal(m), 1500, 7000) * decay(m, 0.018) + 0.6 * np.sin(2 * np.pi * 190 * np.arange(m) / SR) * decay(m, 0.02)
    x[i:i + m] += stroke[: max(0, min(m, n - i))] * (0.25 + 0.75 * (t / 1.95) ** 1.6) * (0.85 + 0.15 * (j % 2))
save("drumroll", x * env(n, 0.01, 0.05))

# a hull creaking under the strain: a slow, uneven rasp (0.9 s)
n = int(0.9 * SR)
x = np.zeros(n)
t = 0.0
while t < 0.86:
    i, m = int(t * SR), int(0.012 * SR)
    x[i:i + m] += band(rng.standard_normal(m), 300, 2500) * decay(m, 0.003)
    t += rng.uniform(0.012, 0.03) * (1.4 - t)
save("creak", band(x, 250, 2200) * env(n, 0.05, 0.2))

# a small dry crack (a hull splitting a little)
n = int(0.18 * SR)
x = band(rng.standard_normal(n), 800, 9000) * decay(n, 0.008) + 0.5 * np.sin(2 * np.pi * 1700 * np.arange(n) / SR) * decay(n, 0.02)
save("crack", x)

# KRAK: a harder, lower crack
n = int(0.3 * SR)
x = band(rng.standard_normal(n), 300, 8000) * decay(n, 0.015) + 0.6 * np.sin(2 * np.pi * 850 * np.arange(n) / SR) * decay(n, 0.04)
save("krak", x)

# blub: a bubble rising in something thick (two of them)
n = int(0.3 * SR)
x = np.zeros(n)
for t0, f0, f1 in ((0.0, 220, 640), (0.13, 280, 760)):
    m = int(0.11 * SR)
    i = int(t0 * SR)
    x[i:i + m] += np.sin(sweep(f0, f1, m)) * decay(m, 0.03) * env(m, 0.004, 0.03)
save("blub", x)

# KRES: set foam crunching, a burst of tiny cracks thinning out (0.4 s)
n = int(0.4 * SR)
x = np.zeros(n)
for i in np.sort(rng.exponential(0.09, 140) * SR).astype(int):
    if i >= n - 600:
        continue
    m = int(rng.integers(60, 500))
    x[i:i + m] += rng.standard_normal(m) * decay(m, 0.0015) * rng.uniform(0.3, 1)
save("crunch", band(x, 1200, 11000) * env(n, 0.002, 0.15))

# a buzzer: "nope" (0.4 s), two low square tones
n = int(0.42 * SR)
tt = np.arange(n) / SR
x = np.sign(np.sin(2 * np.pi * 116 * tt)) + 0.6 * np.sign(np.sin(2 * np.pi * 174 * tt))
save("buzzer", band(x, 80, 2600) * env(n, 0.005, 0.06))

# a muted trumpet bending up: "hmm?" (0.55 s)
n = int(0.55 * SR)
ph = sweep(233, 311, n)
x = saw(ph, 14)
cut = 0.05 + 0.25 * np.sin(np.linspace(0, np.pi, n)) ** 2
save("hmm", lowpass_env(x, cut) * env(n, 0.03, 0.12))

# the steam leaking away: a deflating hiss falling (1.3 s)
n = int(1.3 * SR)
x = rng.standard_normal(n)
k = np.linspace(0, 1, n)
save("deflate", (band(x, 2500, 7000) * (1 - k) + band(x, 700, 2200) * k) * (1 - k) ** 1.2 * env(n, 0.05, 0.1))

# a sad trombone: "wah, wah, wah, waaah" (1.4 s)
notes = [(0.0, 0.28, 294), (0.28, 0.28, 277), (0.56, 0.28, 262), (0.84, 0.56, 247)]
n = int(1.42 * SR)
x = np.zeros(n)
for t0, d, f0 in notes:
    m = int(d * SR)
    vib = 1 + (0.012 * np.sin(2 * np.pi * 5.5 * np.arange(m) / SR) * np.linspace(0, 1, m) if d > 0.3 else 0)
    ph = 2 * np.pi * np.cumsum(np.full(m, f0) * vib) / SR
    note = saw(ph, 10)
    wah = 0.04 + 0.22 * np.sin(np.linspace(0, np.pi, m)) ** 1.5
    i = int(t0 * SR)
    x[i:i + m] += lowpass_env(note, wah) * env(m, 0.02, 0.06)
save("trombone", x)

# a brass stab for the last word (= POP!): a short major chord, bright then closing (0.5 s)
n = int(0.5 * SR)
x = sum(saw(sweep(f, f, n), 12) for f in (262, 330, 392, 523))
cut = 0.03 + 0.5 * decay(n, 0.09)
save("stab", lowpass_env(x, cut) * env(n, 0.006, 0.2))

print("sfx:", ", ".join(sorted(p.stem for p in OUT.glob("*.wav"))))
