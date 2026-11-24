"""Chalk on a board, made from numbers for this film: the kit's foley (kit/audio/foley.py) is a felt marker on paper,
and the Chalkboard template asks for chalk scratches, taps and the soft wipe of the eraser. Seeded, so every run
writes the same files into sfx/ (cues.build.py puts them on the events film.js logs).

    python3 examples/pythagoras/chalk_foley.py          writes examples/pythagoras/sfx/*.wav (--force redoes them)

  line_1..4    a stroke of chalk dragged across the board (1.2 s: trim it to the stroke)
  write_1..3   chalk lettering, short strokes with lifts between (2.4 s: trim it to the word)
  hatch_1..2   the side of the chalk hatched back and forth (2.6 s: trim it)
  tick_1..3    one quick chalk tick, for a count
  tap_1..3     the chalk's tip knocked on the board: a dry click and the board's dull knock
  wipe_1..2    the felt eraser swept once across the board (0.8 s)
  slide_1      a piece slid along the board's face (0.7 s)

What a chalk stroke is: grains of chalk catching and letting go on the board's slightly rough paint, so a crackle of
tiny clicks (a few thousand a second, very uneven) over a dry hiss, and a faint low rub where the stick presses; a
marker is a smooth hiss, chalk is grainy. Nobody has listened to these: they were checked by their spectra and levels.
"""
import sys
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


def smooth_noise(rng, n, rate):
    k = max(2, int(n / SR * rate) + 2)
    return np.interp(np.linspace(0, k - 1, n), np.arange(k), rng.standard_normal(k))


def env(n, attack, release):
    e = np.ones(n)
    a, r = max(1, int(attack * SR)), max(1, int(release * SR))
    e[:a] = np.linspace(0, 1, a) ** 0.7
    e[n - r:] *= np.linspace(1, 0, r) ** 1.5
    return e


def unit(x):
    return x / (np.sqrt(np.mean(x**2)) + 1e-12)


def crackle(rng, n, rate):
    """Grains catching on the board: sparse, very uneven clicks, each ringing for a millisecond."""
    x = np.zeros(n)
    k = rng.poisson(rate * n / SR)
    # uneven, but no single grain a hundred times the rest: a stroke is a texture, not a string of pops
    np.add.at(x, rng.integers(0, n, k), np.minimum(rng.pareto(3.0, k) + 0.25, 3.5) * rng.choice([-1.0, 1.0], k))
    t = np.arange(int(0.0016 * SR)) / SR
    ring = np.exp(-t * 2600) * np.sin(2 * np.pi * rng.uniform(2600, 3800) * t)
    return band(np.convolve(x, ring, mode="same"), 1400, 9000)


def stroke(rng, seconds, grit=1.0):
    n = max(8, int(seconds * SR))
    c = unit(crackle(rng, n, rng.uniform(2600, 4200)))
    hiss = unit(band(rng.standard_normal(n), 1800, 8000))
    rub = unit(band(rng.standard_normal(n), 220, 900))
    # the hand's pressure wanders; the stick chatters a little as it catches and slips
    pressure = 0.72 + 0.28 * np.clip(smooth_noise(rng, n, 6), -1.5, 1.5) / 1.5
    chatter = 1 + 0.45 * np.clip(band(rng.standard_normal(n), 18, 70) * 7, -1, 1)
    x = (0.62 * grit * c + 0.42 * hiss + 0.16 * rub) * pressure * chatter
    return x * env(n, 0.006, min(0.05, seconds * 0.3))


def line(rng):
    return stroke(rng, 1.2)


def write(rng):
    n = int(2.4 * SR)
    out = np.zeros(n)
    t = 0.0
    while t < 2.3:
        d = rng.uniform(0.05, 0.12)
        s = stroke(rng, d, grit=1.15) * rng.uniform(0.6, 1.0)
        a = int(t * SR)
        out[a:a + len(s)] += s[: n - a]
        t += d + rng.uniform(0.012, 0.05)
    return out


def hatch(rng):
    n = int(2.6 * SR)
    out = np.zeros(n)
    t = 0.0
    k = 0
    while t < 2.5:
        d = rng.uniform(0.07, 0.095)
        s = stroke(rng, d, grit=0.9) * (0.85 if k % 2 else 1.0)
        a = int(t * SR)
        out[a:a + len(s)] += s[: n - a]
        t += d + rng.uniform(0.004, 0.014)
        k += 1
    return out


def tick(rng):
    s = stroke(rng, rng.uniform(0.03, 0.045), grit=1.4)
    n = len(s) + int(0.03 * SR)
    out = np.zeros(n)
    out[: len(s)] = s
    t_ = np.arange(n) / SR
    out += 0.5 * unit(band(rng.standard_normal(n), 2000, 8000)) * np.exp(-t_ * 700)
    return out


def tap(rng):
    """The chalk's tip on the board: a dry click, the board's dull knock under it, and a few grains crumbling off."""
    n = int(0.28 * SR)
    t_ = np.arange(n) / SR
    click = unit(band(rng.standard_normal(n), 1800, 9500)) * np.exp(-t_ * 650)
    knock = sum(np.sin(2 * np.pi * f * t_ + rng.uniform(0, 6)) * np.exp(-t_ * d) * a for f, d, a in [(310, 42, 0.8), (760, 62, 0.7), (1620, 110, 0.45), (3050, 190, 0.3)])
    crumbs = unit(crackle(rng, n, 900)) * np.exp(-t_ * 40) * 0.12
    # the tip bounces once or twice as it lands, and the knock carries for a few tens of milliseconds: a tap is
    # heard as a "tock", not a bare click
    hit = 1.2 * click + 0.8 * unit(knock) * np.exp(-t_ * 13)
    out = hit.copy()
    for lag, g in [(rng.uniform(0.009, 0.013), 0.5), (rng.uniform(0.022, 0.03), 0.28)]:
        k = int(lag * SR)
        out[k:] += g * hit[: n - k]
    return (out + crumbs) * env(n, 0.0005, 0.06)


def wipe(rng):
    """A felt eraser swept once across the board: a soft, low swish that swells and dies away."""
    n = int(0.8 * SR)
    x = unit(band(rng.standard_normal(n), 200, 2800))
    felt = 0.8 + 0.2 * np.clip(band(rng.standard_normal(n), 25, 110) * 6, -1, 1)
    dust = unit(crackle(rng, n, 500)) * 0.08
    # the felt meets the board at once and the sweep dies away as the arm slows: loudest a tenth of a second in
    u = np.linspace(0, 1, n)
    shape = np.where(u < 0.13, u / 0.13, ((1 - u) / 0.87) ** 1.3)
    return (x * felt + dust) * shape * env(n, 0.02, 0.08)


def slide(rng):
    """A piece slid along the board's face: a quiet dry glide, lower and smoother than a stroke."""
    n = int(0.7 * SR)
    x = unit(band(rng.standard_normal(n), 300, 2200))
    grain = unit(crackle(rng, n, 700)) * 0.12
    # it starts with a little catch as the piece is pushed, glides, and has died away before the move ends
    u = np.linspace(0, 1, n)
    shape = np.clip(u / 0.06, 0, 1) ** 0.8 * np.clip((1 - u) / 0.55, 0, 1) ** 1.3
    catch = unit(band(rng.standard_normal(n), 900, 5000)) * np.exp(-np.arange(n) / SR * 45) * 0.9
    return (x + grain + catch) * shape * env(n, 0.004, 0.08)


MAKE = {"line": (line, 4), "write": (write, 3), "hatch": (hatch, 2), "tick": (tick, 3), "tap": (tap, 3), "wipe": (wipe, 2), "slide": (slide, 1)}


def save(path, x, seed):
    rng = np.random.default_rng(seed)
    x = x / max(np.abs(x).max(), 1e-9) * 0.89
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
            seed = 7000 + 100 * (k + 1) + i
            save(path, fn(np.random.default_rng(seed)), seed)
            print(f"made  {path.name}")
