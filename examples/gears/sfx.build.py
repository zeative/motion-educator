"""The sounds of this film that the kit's library does not have, made from numbers (seeded: the same every run), and
the music bed put on the storyboard's beat.

    python3 examples/gears/sfx.build.py        writes examples/gears/sfx/*.wav and examples/gears/music/bed-75.mp3

A drawing table: a technical pen along a ruler, a compass, a sheet of paper sliding, a wooden ruler tapped; and the
machine: a gear tooth clicking past another, a soft bell for the x3, a bicycle chain running and dropping onto a
sprocket, a freewheel's pawls. The kit's own foley (kit/audio/foley.py) gives the stroke, band and envelope.

The bed (music/bed.mp3) was composed at 70 BPM, not the 75 the board was cut to (measured below: a beat every 0.857 s,
the first on its first sample). It is stretched by 0.857 / 0.8 without changing its pitch (ffmpeg's rubberband), so a
beat falls every 0.8 s from frame 0 and every cut lands on one. Stretched, it would fade out inside the film's last
second, so from bar 17 on it plays its own bars 5 to 7 again: bar 16 and bar 4 are the same E flat chord, so the bar
after each is the same, and bar 18 (the run-on the mix lays over frame 0) is C minor, like bar 1.
"""
import importlib.util
import json
import subprocess
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
KIT = HERE.parent.parent / "kit" / "audio" / "foley.py"
spec = importlib.util.spec_from_file_location("foley", KIT)
F = importlib.util.module_from_spec(spec)
spec.loader.exec_module(F)
SR = F.SR
OUT = HERE / "sfx"
OUT.mkdir(exist_ok=True)
t_ = lambda n: np.arange(n) / SR


def rule(rng, seconds=0.9):
    """A technical pen drawn along a ruler: a fine, even hiss (finer than a marker) and the ruler's edge ticking under it."""
    n = int(seconds * SR)
    x = F.band(rng.standard_normal(n), 2600, 9500) * (0.85 + 0.15 * F.smooth_noise(rng, n, 5))
    tick = F.band(rng.standard_normal(n), 1200, 5000) * np.exp(-t_(n) * 260) * 1.6
    return (x + tick) * F.env(n, 0.006, min(0.08, seconds * 0.25))


def compass(rng, seconds=0.9):
    """A compass's pencil going round: graphite on paper with a faint squeak that rises and falls with the pressure."""
    n = int(seconds * SR)
    scratch = F.band(rng.standard_normal(n), 1500, 6500) * (0.7 + 0.3 * F.smooth_noise(rng, n, 9))
    f = 2350 * (1 + 0.05 * F.smooth_noise(rng, n, 3))
    squeak = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.18 + 0.12 * F.smooth_noise(rng, n, 2))
    return (scratch + squeak) * F.env(n, 0.02, min(0.1, seconds * 0.3))


def tooth(rng, f0=3100):
    """A gear tooth passing another: a hard, short metal click with a small ring."""
    n = int(0.16 * SR)
    t = t_(n)
    ring = sum(a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t * d) for f, d, a in [(f0, 55, 1), (f0 * 1.73, 80, 0.55), (f0 * 2.61, 120, 0.3)])
    click = F.band(rng.standard_normal(n), 2000, 11000) * np.exp(-t * 500) * 1.4
    knock = np.sin(2 * np.pi * 420 * t) * np.exp(-t * 70) * 0.5
    return (ring + click + knock) * F.env(n, 0.0008, 0.03)


def tap(rng, f0=1250):
    """A wooden ruler tapped on the table, or a pen tick that ends a figure."""
    n = int(0.2 * SR)
    t = t_(n)
    x = sum(a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t * d) for f, d, a in [(f0, 30, 1), (f0 * 1.78, 42, 0.5), (f0 * 3.1, 80, 0.25)])
    click = F.band(rng.standard_normal(n), 1800, 8000) * np.exp(-t * 380) * 0.8
    return (x + click) * F.env(n, 0.0008, 0.04)


def ping(rng, f0=1567.98):
    """A soft bell on G (in both of the bed's chords, C minor and E flat): for the x3."""
    n = int(1.6 * SR)
    t = t_(n)
    x = sum(a * np.sin(2 * np.pi * f0 * k * t + rng.uniform(0, 6)) * np.exp(-t * d) for k, d, a in [(1, 2.6, 1), (2.0, 4.5, 0.22), (2.76, 6, 0.16), (5.4, 11, 0.05)])
    strike = F.band(rng.standard_normal(n), 3000, 10000) * np.exp(-t * 300) * 0.25
    return (x + strike) * F.env(n, 0.002, 0.3)


def chain(rng, seconds=1.0, rate=24):
    """A bicycle chain running over a sprocket: rollers clicking into the teeth, plates rattling."""
    n = int(seconds * SR)
    out = np.zeros(n)
    at = 0.0
    while at < seconds - 0.03:
        a = int(at * SR)
        m = min(n - a, int(0.05 * SR))
        tt = t_(m)
        f = rng.uniform(3800, 5600)
        hit = (np.sin(2 * np.pi * f * tt) * np.exp(-tt * 160) * 0.6 + F.band(rng.standard_normal(m), 3000, 10000) * np.exp(-tt * 420)) * rng.uniform(0.55, 1.0)
        out[a:a + m] += hit
        at += (1 / rate) * rng.uniform(0.7, 1.3)
    rattle = F.band(rng.standard_normal(n), 2500, 8000) * 0.12 * (0.6 + 0.4 * F.smooth_noise(rng, n, 12))
    out = (out + rattle) * F.env(n, 0.01, min(0.12, seconds * 0.3)) * 0.4
    # the chain catching the first teeth: a clear clink before the run
    out[: int(0.45 * SR)] += drop(rng)[: min(n, int(0.45 * SR))]
    return out


def drop(rng):
    """The chain dropping onto the teeth: three quick metal clinks, the rollers seating."""
    n = int(0.45 * SR)
    out = np.zeros(n)
    for k, (at, g) in enumerate([(0.0, 1.0), (0.034, 0.7), (0.071, 0.5)]):
        a = int(at * SR)
        m = n - a
        tt = t_(m)
        f = 4300 + 600 * k
        out[a:] += g * (np.sin(2 * np.pi * f * tt) * np.exp(-tt * 45) + 0.5 * np.sin(2 * np.pi * f * 1.6 * tt) * np.exp(-tt * 70) + F.band(rng.standard_normal(m), 2500, 11000) * np.exp(-tt * 350))
    return out * F.env(n, 0.0008, 0.1)


def freewheel(rng, seconds, rate):
    """A freewheel's pawls: soft quick ticks at `rate` a second."""
    n = int(seconds * SR)
    out = np.zeros(n)
    for k in range(int(seconds * rate)):
        a = int((k / rate + rng.uniform(-0.002, 0.002)) * SR)
        if a < 0 or a >= n:
            continue
        m = min(n - a, int(0.03 * SR))
        tt = t_(m)
        out[a:a + m] += (np.sin(2 * np.pi * 2900 * tt) * np.exp(-tt * 260) + F.band(rng.standard_normal(m), 2500, 9000) * np.exp(-tt * 600)) * rng.uniform(0.7, 1.0)
    return out * F.env(n, 0.005, 0.05)


def slide(rng, seconds=0.75):
    """A sheet of paper slid across a drawing table: a soft breathy rush that starts at once and settles."""
    n = int(seconds * SR)
    t = t_(n)
    x = F.band(rng.standard_normal(n), 500, 5200) * (0.8 + 0.2 * F.smooth_noise(rng, n, 14))
    shape = np.minimum(1, t / 0.035) * np.exp(-np.maximum(0, t - 0.08) * 4.2)
    return x * shape * F.env(n, 0.004, 0.12)


def paper(rng, seconds=0.7):
    """A sheet of paper laid over another and slid into place: a soft, low rub of fibre on fibre, no rush of air."""
    n = int(seconds * SR)
    t = t_(n)
    x = F.band(rng.standard_normal(n), 160, 2400)
    fibre = 0.65 + 0.35 * np.clip(F.band(rng.standard_normal(n), 18, 70) * 7, -1, 1)
    shape = np.minimum(1, t / 0.07) ** 1.5 * np.exp(-np.maximum(0, t - 0.18) * 3.2)
    return x * fibre * shape * F.env(n, 0.03, 0.2)


def chaincog(rng, seconds, rate, tyre=0.0):
    """A chain running onto a sprocket under load: each roller seating in a tooth gap (a dull metal tick), the plates'
    rattle, and a soft hum of the tyre on the road for a wheel rolling (`tyre`, louder the faster)."""
    n = int(seconds * SR)
    out = np.zeros(n)
    for k in range(int(seconds * rate)):
        a = int((k / rate + rng.uniform(-0.003, 0.003)) * SR)
        if a < 0 or a >= n:
            continue
        m = min(n - a, int(0.04 * SR))
        tt = t_(m)
        out[a:a + m] += (np.sin(2 * np.pi * 2300 * tt) * np.exp(-tt * 140) * 0.7 + np.sin(2 * np.pi * 900 * tt) * np.exp(-tt * 90) * 0.5 + F.band(rng.standard_normal(m), 1500, 7000) * np.exp(-tt * 380) * 0.6) * rng.uniform(0.7, 1.0)
    out += F.band(rng.standard_normal(n), 1800, 6000) * 0.06 * (0.6 + 0.4 * F.smooth_noise(rng, n, 10))
    if tyre:
        out += F.band(rng.standard_normal(n), 80, 600) * tyre * (0.8 + 0.2 * F.smooth_noise(rng, n, 4))
    return out * F.env(n, 0.04, 0.12)


MAKE = {
    **{f"rule_{i}": (lambda r: rule(r), 10 + i) for i in (1, 2, 3)},
    **{f"compass_{i}": (lambda r: compass(r), 20 + i) for i in (1, 2)},
    "tooth_1": (lambda r: tooth(r, 3100), 31), "tooth_2": (lambda r: tooth(r, 2500), 32), "tooth_3": (lambda r: tooth(r, 3500), 33),
    "tap_1": (lambda r: tap(r, 1250), 41), "tap_2": (lambda r: tap(r, 1400), 42), "tap_3": (lambda r: tap(r, 1570), 43), "tap_4": (lambda r: tap(r, 1870), 44),
    "ping_1": (lambda r: ping(r), 51),
    "chain_1": (lambda r: chain(r, 1.05, 26), 61), "chain_2": (lambda r: chain(r, 0.45, 30), 62),
    "drop_1": (lambda r: drop(r), 71),
    "free_fast": (lambda r: freewheel(r, 1.8, 2.91 / 1.8 * 9), 81), "free_slow": (lambda r: freewheel(r, 1.8, 0.97 / 1.8 * 9), 82),
    "free_creep": (lambda r: freewheel(r, 2.2, 4.5), 83), "free_roll": (lambda r: freewheel(r, 0.6, 22), 84),
    "paper_1": (lambda r: paper(r, 0.7), 94), "paper_2": (lambda r: paper(r, 0.55), 95), "paper_3": (lambda r: paper(r, 0.9), 96),
    # both chains run at the same speed, 32 rollers a pedal turn (1.6 s); only the wheels differ
    "chaincog_11": (lambda r: chaincog(r, 1.6, 20, tyre=0.55), 101), "chaincog_33": (lambda r: chaincog(r, 1.6, 20, tyre=0.2), 102),
    "chaincog_slow": (lambda r: chaincog(r, 2.2, 2.2), 103),
}

if __name__ == "__main__":
    for name, (fn, seed) in MAKE.items():
        F.save(OUT / f"{name}.wav", fn(np.random.default_rng(seed)), seed)
    print(f"{len(MAKE)} sounds -> {OUT}")

    # ── The bed on the board's grid ──────────────────────────────────────────────────────────────────────────────
    sb = json.loads((HERE / "storyboard.json").read_text())
    beat = sb["music"]["beat"]  # 0.8 s
    measured = 0.8572  # the composed bed's beat, from its onsets (a comb over the whole track; the first beat at 0.000)
    tmp = OUT / "bed-stretched.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(HERE / "music" / "bed.mp3"), "-af", f"rubberband=tempo={measured / beat:.5f}:pitchq=quality:transients=crisp", "-ar", "48000", "-ac", "2", str(tmp)], check=True)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(tmp), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
    bar = 4 * beat
    cut, src = 16 * bar, 4 * bar  # bar 17 starts at 51.2 s; bars 5 to 7 start at 12.8 s
    a, b = int((cut - 0.03) * SR), int((src - 0.03) * SR)  # spliced just before the downbeat, so the new bar's attack is whole
    fade = int(0.02 * SR)
    tail = x[b : b + int(3 * bar * SR) + fade]
    w = np.linspace(0, 1, fade)[:, None]
    out = np.concatenate([x[:a], x[a : a + fade] * (1 - w) + tail[:fade] * w, tail[fade:]])
    end = int((sb["duration"] + 4.0) * SR)
    out = out[:end]
    pcm = (np.clip(out, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "libmp3lame", "-b:a", "320k", str(HERE / "music" / "bed-75.mp3")], input=pcm, check=True)
    tmp.unlink()
    print(f"bed-75.mp3: {len(out) / SR:.2f} s, a beat every {beat} s from 0, bars 5-7 again from {cut:.1f} s")
