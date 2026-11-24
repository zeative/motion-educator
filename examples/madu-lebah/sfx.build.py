"""The sounds this film needs that the kit's library has not: water, a wet brush, wings, a hive. Made from numbers,
seeded, so every run writes the same files (examples/madu-lebah/sfx/*.wav); cues.build.py places them.

    python3 examples/madu-lebah/sfx.build.py

  drop        a quick, light drop of nectar letting go and landing (thin, bright: it is runny)
  drip        a slow, low drop of honey folding onto itself (thick: it is slow)
  brush_1..3  a wet brush laying a wash across paper (0.9 s)
  bloom_1..3  a wash spreading in wet paper: a soft hiss that swells and settles (1.0 s)
  hum         a worker's wings in flight, about 230 beats a second, coming in and settling (1.0 s)
  whirr       wings fanning, steady (3 s, a bed: cue it under)
  murmur      a hive heard close: many wings, low (4.5 s, a bed: cue it under)
  sip         the tongue taking nectar: two tiny wet clicks
  swallow     a small liquid gulp
  pluck       one pizzicato string on F (the bed is in F), for the enzyme's cut
  note        one soft plucked high C, for the question
  tap_1..2    a wax cap pressed on: a tiny soft tap
  clink       a lid set on a glass jar: a short glassy ring over a soft knock
  vapour      breath rising: a faint airy hiss that lifts away (1.2 s)
  wet_1..3    water flooding across a sheet: a wet brush stroke with a swash under it and a few small bubbles (0.9 s),
              for each new plate the wash brings in
  drain       water running out of the column: a gurgle of falling bubbles over a soft pour (1.4 s)
"""
import wave
from pathlib import Path

import numpy as np

SR = 48000
OUT = Path(__file__).resolve().parent / "sfx"


def band(x, lo, hi):
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X = np.fft.rfft(x)
    w = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * w, len(x))


def t_(sec):
    return np.arange(int(sec * SR)) / SR


def env(n, attack, release, shape=1.5):
    e = np.ones(n)
    a, r = max(1, int(attack * SR)), max(1, int(release * SR))
    e[:a] = np.linspace(0, 1, a) ** 0.7
    e[n - r:] *= np.linspace(1, 0, r) ** shape
    return e


def slow(rng, n, rate):
    k = max(2, int(n / SR * rate) + 2)
    return np.interp(np.linspace(0, k - 1, n), np.arange(k), rng.standard_normal(k))


def save(name, x, peak=0.89):
    x = np.asarray(x, dtype=np.float64)
    x = x / (np.abs(x).max() + 1e-12) * peak
    OUT.mkdir(exist_ok=True)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def plip(f0, f1, rise, decay, sec, noise=0.15, seed=1):
    """A drop: a bubble whose pitch rises fast as it closes, then rings down."""
    t = t_(sec)
    f = f0 + (f1 - f0) * (1 - np.exp(-t / rise))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t / decay)
    rng = np.random.default_rng(seed)
    click = band(rng.standard_normal(len(t)), 2000, 9000) * np.exp(-t / 0.003) * noise
    return (x + click) * env(len(t), 0.001, 0.02)


def pluck(freq, sec, seed=1, bright=0.5):
    """Karplus-Strong: a plucked string."""
    rng = np.random.default_rng(seed)
    n = int(sec * SR)
    p = int(SR / freq)
    buf = band(rng.standard_normal(p * 4), 60, 2000 + 6000 * bright)[:p]
    y = np.zeros(n)
    y[:p] = buf
    for i in range(p, n):
        y[i] = 0.996 * 0.5 * (y[i - p] + y[i - p + 1])
    return y * env(n, 0.002, 0.15)


def main():
    rng = np.random.default_rng(7)
    save("drop", np.concatenate([plip(700, 1900, 0.006, 0.08, 0.25, 0.2, 1), np.zeros(int(0.05 * SR))]))
    # honey: a slow low plop, its body low-passed, and a soft second fold
    h = plip(160, 330, 0.04, 0.18, 0.7, 0.05, 2)
    h = band(h, 60, 1500) + 0.4 * np.roll(band(plip(140, 280, 0.05, 0.15, 0.7, 0.0, 3), 60, 1200), int(0.18 * SR))
    save("drip", h)
    for k in range(3):
        r = np.random.default_rng(10 + k)
        n = int(0.9 * SR)
        x = band(r.standard_normal(n), 400, 3800) * (0.75 + 0.25 * slow(r, n, 9))
        wet = band(r.standard_normal(n), 120, 700) * 0.5
        tt = np.linspace(0, 0.9, n)
        e = np.minimum(1, tt / 0.12) ** 0.8 * np.exp(-np.maximum(0, tt - 0.12) / 0.3)
        save(f"brush_{k + 1}", (x + wet) * e)
    for k in range(3):
        r = np.random.default_rng(20 + k)
        n = int(1.0 * SR)
        x = band(r.standard_normal(n), 900, 6000) * (0.8 + 0.2 * slow(r, n, 5))
        e = np.linspace(0, 1, n) ** 0.6 * np.exp(-np.linspace(0, 3.2, n))
        save(f"bloom_{k + 1}", x * e * env(n, 0.05, 0.3))
    # wings: a buzz near 230 Hz, its harmonics softened, the beat wavering
    t = t_(1.0)
    f = 228 + 6 * np.sin(2 * np.pi * 3.1 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    buzz = sum(np.sin(k * ph) / k ** 1.3 for k in range(1, 9))
    buzz = band(buzz, 120, 2200) * (0.85 + 0.15 * np.sin(2 * np.pi * 11 * t))
    save("hum", buzz * env(len(t), 0.15, 0.45))
    t = t_(3.0)
    f = 236 + 4 * np.sin(2 * np.pi * 1.7 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    air = band(rng.standard_normal(len(t)), 200, 1800) * (0.6 + 0.4 * np.abs(np.sin(ph / 2)))
    save("whirr", (0.5 * band(sum(np.sin(k * ph) / k ** 1.5 for k in range(1, 6)), 120, 1500) + air) * env(len(t), 0.3, 0.6))
    t = t_(4.5)
    hive = sum(np.sin(2 * np.pi * np.cumsum(fq + 5 * slow(rng, len(t), 0.7)) / SR) * (0.6 + 0.4 * slow(rng, len(t), 1.3)) for fq in (196, 214, 231, 247, 262, 205, 239))
    hive = band(hive, 120, 900) + 0.6 * band(rng.standard_normal(len(t)), 150, 700)
    save("murmur", hive * env(len(t), 0.6, 1.0))
    sip = np.concatenate([plip(900, 1900, 0.004, 0.03, 0.07, 0.4, 4), np.zeros(int(0.03 * SR)), plip(800, 1700, 0.004, 0.035, 0.08, 0.4, 5), np.zeros(int(0.03 * SR)), plip(1000, 2100, 0.004, 0.03, 0.08, 0.4, 11)])
    save("sip", band(sip, 600, 9000))
    g = plip(180, 420, 0.03, 0.15, 0.45, 0.0, 6)
    save("swallow", band(g, 80, 2000))
    save("pluck", pluck(174.61, 1.6, 8, 0.55))
    save("note", pluck(523.25, 2.0, 9, 0.35) + 0.4 * pluck(1046.5, 2.0, 10, 0.2))
    for k in range(2):
        r = np.random.default_rng(30 + k)
        t = t_(0.2)
        tap = band(r.standard_normal(len(t)), 300, 3000) * np.exp(-t / 0.012) + 0.9 * np.sin(2 * np.pi * (520 + 80 * k) * t) * np.exp(-t / 0.045) + 0.5 * np.sin(2 * np.pi * (1310 + 90 * k) * t) * np.exp(-t / 0.03)
        save(f"tap_{k + 1}", tap)
    t = t_(1.2)
    ring = sum(a * np.sin(2 * np.pi * fq * t) * np.exp(-t / d) for fq, a, d in ((2130, 1, 0.4), (3460, 0.6, 0.25), (5190, 0.35, 0.15), (1290, 0.5, 0.45)))
    knock = band(rng.standard_normal(len(t)), 150, 1200) * np.exp(-t / 0.015)
    save("clink", 0.9 * ring + knock)
    r = np.random.default_rng(40)
    n = int(1.2 * SR)
    v = band(r.standard_normal(n), 2500, 11000) * (0.7 + 0.3 * slow(r, n, 6))
    tt = np.linspace(0, 1.2, n)
    save("vapour", v * np.minimum(1, tt / 0.15) * np.exp(-np.maximum(0, tt - 0.15) / 0.45))
    for k in range(3):
        r = np.random.default_rng(50 + k)
        n = int(0.9 * SR)
        tt = np.linspace(0, 0.9, n)
        stroke = band(r.standard_normal(n), 350, 3200) * (0.7 + 0.3 * slow(r, n, 7))
        swash = band(r.standard_normal(n), 90, 520) * (0.6 + 0.4 * slow(r, n, 3)) * 0.9
        e = np.minimum(1, tt / 0.06) ** 0.7 * np.exp(-np.maximum(0, tt - 0.08) / 0.32)
        bub = np.zeros(n)
        for j in range(4):
            at = int((0.05 + 0.13 * j + 0.04 * r.random()) * SR)
            b = plip(380 + 260 * r.random(), 900 + 500 * r.random(), 0.01, 0.04, 0.12, 0.05, 60 + 10 * k + j) * (0.35 - 0.06 * j)
            bub[at:at + len(b)] += b[: n - at]
        save(f"wet_{k + 1}", (stroke + swash) * e + bub)
    r = np.random.default_rng(70)
    n = int(1.4 * SR)
    tt = np.linspace(0, 1.4, n)
    pour = band(r.standard_normal(n), 150, 1400) * (0.65 + 0.35 * slow(r, n, 10)) * np.minimum(1, tt / 0.05) * np.exp(-tt / 0.6) * 0.55
    gurgle = np.zeros(n)
    for j in range(11):
        at = int((0.02 + j * 0.1 + 0.03 * r.random()) * SR)
        f0 = 520 - 26 * j + 60 * r.random()
        b = plip(f0, f0 * 2.1, 0.012, 0.05, 0.14, 0.03, 80 + j) * (1.0 - 0.07 * j)
        gurgle[at:at + len(b)] += b[: n - at]
    save("drain", band(pour + gurgle, 90, 6000))
    print(f"wrote {len(list(OUT.glob('*.wav')))} sounds -> {OUT}")


main()
