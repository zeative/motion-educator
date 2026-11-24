"""Paper foley for this film, made from numbers (seeded, so every run writes the same files): the sounds cut paper
makes, which neither the fetched library nor kit/audio/foley.py has. Writes examples/fotosintesis/sfx/*.wav.

    python3 examples/fotosintesis/foley.py        (cues.build.py runs it when a file is missing)

  rustle_1..3  a paper disc popped up, a crinkle         slide_1..2  a sheet slid over the card
  flip_1..3    a tag flipped down on its thread          flipbig     a leaf turned over
  fold         a crisp crease                            pop, popbig a pop-up page standing up (and a big one)
  tap_1..2     a pin pushed into card                    drop        a paper strip landing
  page         a calendar page turned                    card        a card set down
  air          the rostrum's move, a soft air            lift        roots pulled out of crumbly soil
  clunk        a paper willow set on a paper platform    stamp       a rubber stamp
  tick         a small tick (a needle, a hairline)       click       paper pieces clicking together
  snip         scissors                                  peel        a layer peeled back
  pff          a molecule slipping through a slit        breath      one breath in
  wood         a knuckle on a block of wood
  rain         light rain on paper (a texture, 2 s)
  pluck_0..4   a nylon string plucked (E4 G4 B4 C5 E5: in the bed's key, C major / E minor by its chroma)
  chime, chime2  a soft bell (E5+B5, G5+C6)              chord       a strummed Cmaj7 on nylon strings
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


def env(n, attack, release, curve=1.6):
    e = np.ones(n)
    a, r = max(1, int(attack * SR)), max(1, int(release * SR))
    e[:a] = np.linspace(0, 1, a) ** 0.7
    e[n - r:] *= np.linspace(1, 0, r) ** curve
    return e


def decay(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def crackle(rng, n, rate, width=0.0012):
    """Paper crinkle: many tiny clicks at random, each a short decaying burst."""
    x = np.zeros(n)
    k = int(width * SR)
    for _ in range(int(rate * n / SR)):
        i = rng.integers(0, max(1, n - k))
        x[i:i + k] += rng.standard_normal(k) * np.exp(-np.arange(k) / (k / 4)) * rng.uniform(0.3, 1)
    return x


# How hard each sound is driven into a soft clip: a short paper sound has a high crest (a click, then little), so
# under a voice it is felt rather than heard; driving it fills its first tens of milliseconds at the same peak.
DRIVE = {"rustle": 3, "slide": 2, "flip": 3.5, "flipbig": 2.5, "fold": 4, "pop": 3.5, "popbig": 3, "tap": 4, "drop": 3.5, "page": 3,
         "card": 3, "clunk": 3, "stamp": 3.5, "tick": 4, "click": 4, "snip": 2.5, "wood": 3, "peel": 2.5, "pff": 2, "lift": 2.5}


def save(name, x, peak=0.89):
    x = x / (np.max(np.abs(x)) or 1)
    d = DRIVE.get(name.split("_")[0], 0)
    if d:
        x = np.tanh(d * x) / np.tanh(d)
    x = x * peak
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


def ks(freq, seconds, rng, bright=0.5, damp=0.996):
    """A plucked nylon string (Karplus-Strong), warm: a soft excitation and a gentle loop filter."""
    n = int(seconds * SR)
    p = int(SR / freq)
    buf = band(rng.standard_normal(p * 4), 80, 1800 + 3000 * bright)[:p]
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        j = (i + 1) % p
        buf[i % p] = damp * 0.5 * (buf[i % p] + buf[j])
    body = band(out, 90, 5000)
    return body * env(n, 0.002, 0.3)


def main():
    rng = np.random.default_rng(1648)
    for k in range(3):  # rustle: crinkle over a soft noise bed, 0.24 s
        n = int(0.24 * SR)
        x = band(crackle(rng, n, 900), 1500, 9000) + band(rng.standard_normal(n), 800, 6000) * 0.18
        save(f"rustle_{k + 1}", x * env(n, 0.004, 0.14) * (1 + 0.3 * k))
    for k in range(2):  # slide: paper over card, a swell
        n = int(0.5 * SR)
        x = band(rng.standard_normal(n), 500, 5200) * np.sin(np.linspace(0, np.pi, n)) ** 1.4
        x += band(crackle(rng, n, 220), 2000, 8000) * 0.25 * np.sin(np.linspace(0, np.pi, n))
        save(f"slide_{k + 1}", x)
    for k in range(3):  # flip: a quick fwip
        n = int(0.11 * SR)
        x = band(rng.standard_normal(n), 1400 + 300 * k, 7000) * np.sin(np.linspace(0, np.pi, n)) ** 2
        save(f"flip_{k + 1}", x + band(crackle(rng, n, 300), 2500, 9000) * 0.3)
    n = int(0.34 * SR)  # flipbig: a leaf turned over
    save("flipbig", band(rng.standard_normal(n), 600, 4500) * np.sin(np.linspace(0, np.pi, n)) ** 1.6 + band(crackle(rng, n, 200), 2000, 8000) * 0.3 * np.sin(np.linspace(0, np.pi, n)))
    n = int(0.14 * SR)  # fold: a crisp crease
    c = np.zeros(n)
    c[:int(0.004 * SR)] = rng.standard_normal(int(0.004 * SR))
    save("fold", band(c, 1500, 9000) * 1.2 + band(crackle(rng, n, 700), 2000, 9000) * decay(n, 0.04) * 0.8)
    for name, lo, tau, thump in (("pop", 250, 0.05, 0.0), ("popbig", 120, 0.08, 0.7)):  # a pop-up standing up
        n = int(0.22 * SR)
        x = band(rng.standard_normal(n), lo, 3500) * decay(n, tau)
        x += np.sin(2 * np.pi * 95 * np.arange(n) / SR) * decay(n, 0.05) * thump
        save(name, x * env(n, 0.003, 0.05))
    for k in range(2):  # tap: a pin into card
        n = int(0.1 * SR)
        x = band(rng.standard_normal(n), 2000, 8000) * decay(n, 0.004) * 0.8 + np.sin(2 * np.pi * (180 + 40 * k) * np.arange(n) / SR) * decay(n, 0.025)
        save(f"tap_{k + 1}", x)
    n = int(0.16 * SR)  # drop: a paper strip landing
    save("drop", band(rng.standard_normal(n), 250, 2500) * decay(n, 0.035) + np.sin(2 * np.pi * 120 * np.arange(n) / SR) * decay(n, 0.03) * 0.5)
    n = int(0.15 * SR)  # page
    save("page", band(rng.standard_normal(n), 1200, 6500) * np.sin(np.linspace(0, np.pi, n)) ** 2 + band(crackle(rng, n, 260), 2500, 9000) * 0.25)
    n = int(0.2 * SR)  # card set down
    save("card", band(rng.standard_normal(n), 300, 4000) * decay(n, 0.03) + band(crackle(rng, n, 200), 2000, 8000) * decay(n, 0.06) * 0.3)
    n = int(0.42 * SR)  # air: the rostrum moves
    save("air", band(rng.standard_normal(n), 180, 1600) * np.sin(np.linspace(0, np.pi, n)) ** 2.2)
    n = int(0.45 * SR)  # lift: roots out of the soil
    save("lift", band(crackle(rng, n, 500, 0.003), 300, 3500) * env(n, 0.02, 0.2) + band(rng.standard_normal(n), 150, 900) * 0.2 * env(n, 0.02, 0.3))
    n = int(0.2 * SR)  # clunk: set down on the platform
    save("clunk", np.sin(2 * np.pi * 110 * np.arange(n) / SR) * decay(n, 0.045) + band(rng.standard_normal(n), 300, 3000) * decay(n, 0.02) * 0.6)
    n = int(0.24 * SR)  # stamp
    save("stamp", np.sin(2 * np.pi * 85 * np.arange(n) / SR) * decay(n, 0.05) + band(rng.standard_normal(n), 200, 2600) * decay(n, 0.025) * 0.9)
    n = int(0.06 * SR)  # tick
    save("tick", band(rng.standard_normal(n), 2500, 9000) * decay(n, 0.003) + np.sin(2 * np.pi * 2400 * np.arange(n) / SR) * decay(n, 0.006) * 0.5)
    n = int(0.07 * SR)  # click: paper pieces meeting
    save("click", band(rng.standard_normal(n), 1800, 7000) * decay(n, 0.005) + np.sin(2 * np.pi * 900 * np.arange(n) / SR) * decay(n, 0.01) * 0.4)
    n = int(0.2 * SR)  # snip: two blades closing
    x = np.zeros(n)
    for t0, a in ((0.0, 1.0), (0.055, 0.8)):
        i = int(t0 * SR)
        m = int(0.03 * SR)
        x[i:i + m] += band(rng.standard_normal(m), 2200, 7500) * decay(m, 0.006) * a
        x[i:i + m] += np.sin(2 * np.pi * 3300 * np.arange(m) / SR) * decay(m, 0.008) * 0.5 * a
    x += band(rng.standard_normal(n), 2500, 9000) * np.exp(-((np.arange(n) / SR - 0.03) ** 2) / 0.0004) * 0.3
    save("snip", x)
    n = int(0.25 * SR)  # wood: a knuckle on a block of wood (its modes, a click on top)
    t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * t) * decay(n, tau) for f, a, tau in ((420, 1.0, 0.04), (780, 0.6, 0.025), (1310, 0.35, 0.015)))
    save("wood", x + band(rng.standard_normal(n), 1500, 6000) * decay(n, 0.003) * 0.8)
    n = int(0.4 * SR)  # peel
    save("peel", band(crackle(rng, n, 1300, 0.0015), 1500, 9000) * np.linspace(0.4, 1, n) * env(n, 0.03, 0.08) + band(rng.standard_normal(n), 800, 5000) * 0.15)
    n = int(0.22 * SR)  # pff
    save("pff", band(rng.standard_normal(n), 400, 2600) * np.sin(np.linspace(0, np.pi, n)) ** 1.5)
    n = int(0.75 * SR)  # breath in
    save("breath", band(rng.standard_normal(n), 350, 2800) * np.sin(np.linspace(0, np.pi, n)) ** 1.3 * np.linspace(0.6, 1, n))
    n = int(2.0 * SR)  # rain on paper: a texture
    save("rain", band(crackle(rng, n, 70, 0.0008), 2500, 9000) * env(n, 0.15, 0.4), peak=0.6)
    for k, f in enumerate((329.63, 392.0, 493.88, 523.25, 659.26)):
        save(f"pluck_{k}", ks(f, 1.3, rng, bright=0.45))
    for name, fs in (("chime", (659.26, 987.77)), ("chime2", (783.99, 1046.5))):
        n = int(1.4 * SR)
        t = np.arange(n) / SR
        x = sum(np.sin(2 * np.pi * f * t) * decay(n, 0.5) + 0.25 * np.sin(2 * np.pi * f * 2.76 * t) * decay(n, 0.12) for f in fs)
        save(name, x * env(n, 0.004, 0.3), peak=0.8)
    n = int(2.2 * SR)  # chord: Cmaj7 strummed (C3 G3 E4 G4 B4)
    x = np.zeros(n)
    for k, f in enumerate((130.81, 196.0, 329.63, 392.0, 493.88)):
        i = int(k * 0.028 * SR)
        x[i:] += ks(f, (n - i) / SR, rng, bright=0.35, damp=0.998)[: n - i] * (0.8 if k else 1)
    save("chord", x * env(n, 0.002, 0.6), peak=0.85)


if __name__ == "__main__":
    main()
    print(f"paper foley -> {OUT}")
