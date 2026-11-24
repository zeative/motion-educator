"""Writes sfx/*.wav: the film's 8-bit sound effects, made from numbers the way a game console made them.

    python3 examples/jantung-berlari/sfx.build.py

The Pixel template asks for "a chiptune bed with 8-bit blips, jumps and coin sounds on actions"; the kit's library
(Mixkit effects, kit/audio/foley.py's hand on paper) has none, so they are synthesised here: pulse waves at a few
duty cycles, a triangle for the low thumps, and the noise channel (a 15-bit linear-feedback shift register, as the
NES's), stepped in pitch and volume at 60 Hz like a console's sound driver. Seeded: the same files every run.
"""
from pathlib import Path
import wave

import numpy as np

HERE = Path(__file__).parent
OUT = HERE / "sfx"
OUT.mkdir(exist_ok=True)
SR = 48000
FRAME = SR // 60  # a console's sound driver changes pitch and volume once a video frame


def note(n):
    """Frequency of a note numbered from A4 = 0."""
    return 440.0 * 2 ** (n / 12)


C5, E5, G5, C6, E6, G6, C7, B5, A5 = (note(x) for x in (3, 7, 10, 15, 19, 22, 27, 14, 12))


def pulse(freqs, duty=0.5, vols=None):
    """A pulse wave whose pitch (and volume) is held for each 1/60 s step: freqs and vols are lists per step."""
    n = len(freqs)
    vols = vols if vols is not None else [1.0] * n
    out = np.zeros(n * FRAME)
    phase = 0.0
    for k, (f, v) in enumerate(zip(freqs, vols)):
        t = np.arange(FRAME)
        ph = (phase + f * t / SR) % 1.0
        out[k * FRAME : (k + 1) * FRAME] = np.where(ph < duty, 1.0, -1.0) * v
        phase = (phase + f * FRAME / SR) % 1.0
    return out


def tri(freqs, vols=None):
    n = len(freqs)
    vols = vols if vols is not None else [1.0] * n
    out = np.zeros(n * FRAME)
    phase = 0.0
    for k, (f, v) in enumerate(zip(freqs, vols)):
        t = np.arange(FRAME)
        ph = (phase + f * t / SR) % 1.0
        # the console's triangle is 16 steps, not smooth
        out[k * FRAME : (k + 1) * FRAME] = (np.round((1 - 4 * np.abs(ph - 0.5)) * 7.5) / 7.5) * v
        phase = (phase + f * FRAME / SR) % 1.0
    return out


def noise(rates, vols, short=False):
    """The noise channel: an LFSR clocked at `rate` Hz per step (higher = hissier)."""
    reg = 1
    out = np.zeros(len(rates) * FRAME)
    acc = 0.0
    bit = 1.0
    for k, (r, v) in enumerate(zip(rates, vols)):
        for i in range(FRAME):
            acc += r / SR
            while acc >= 1:
                acc -= 1
                fb = (reg & 1) ^ ((reg >> (6 if short else 1)) & 1)
                reg = (reg >> 1) | (fb << 14)
                bit = 1.0 if reg & 1 else -1.0
            out[k * FRAME + i] = bit * v
    return out


def env(n, a=1, d=0.0):
    """Per-step volumes: a level falling by d each step."""
    return [max(0.0, a - d * k) for k in range(n)]


def tame(x, cutoff=9000):
    """A one-pole low-pass, as the console's output filter, so the edges are not needlessly harsh."""
    y = np.zeros_like(x)
    a = np.exp(-2 * np.pi * cutoff / SR)
    s = 0.0
    for i, v in enumerate(x):
        s = (1 - a) * v + a * s
        y[i] = s
    return y


def mix(*parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[: len(p)] += p
    return out


def save(name, x):
    x = tame(np.asarray(x, dtype=np.float64))
    x = x / max(1e-9, np.abs(x).max()) * 0.9
    edge = min(len(x), 96)
    x[-edge:] *= np.linspace(1, 0, edge)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())


# Steps and taps
save("step", noise([3000, 1800, 1200], [0.8, 0.45, 0.15]))
save("used", pulse([note(31), note(36)], 0.25, [0.6, 0.35]))
save("menu", pulse([note(24)] * 2 + [note(31)] * 3, 0.25, [1, 1, 0.9, 0.6, 0.3]))
# Pause: the classic two blips, high then low, then again
save("pause", pulse([note(27)] * 4 + [0] * 2 + [note(22)] * 4 + [0] * 2 + [note(27)] * 3 + [note(22)] * 5, 0.5, [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0.8, 0.8, 0.8, 0.6, 0.4, 0.2]))
# The question block: a bonk
save("bump", mix(pulse([note(-5 - 2 * k) for k in range(8)], 0.5, env(8, 1, 0.12)), tri([note(-17 - k) for k in range(8)], env(8, 1, 0.1))))
# A pixel dissolve: a quick downward zoom of blips
save("zoom", pulse([note(36 - 3 * k) for k in range(14)], 0.125, env(14, 0.9, 0.06)))
# A screen wipe: the noise channel swept from dull to bright
save("wipe", noise([800 + 900 * k for k in range(18)], [0.2 + 0.05 * k if k < 12 else 0.8 - 0.15 * (k - 12) for k in range(18)]))
# The camera slides along: a soft falling sweep
save("slide", mix(noise([4000 - 180 * k for k in range(20)], env(20, 0.5, 0.025)), pulse([note(20 - k) for k in range(20)], 0.125, env(20, 0.35, 0.017))))
# A squelchy muscle pull
save("squelch", mix(pulse([note(-2 + (3 if k % 2 else 0) - k) for k in range(7)], 0.25, env(7, 1, 0.13)), noise([1500] * 4, [0.3, 0.2, 0.1, 0.05])))
# Low oxygen: the low-health alarm, two notes
save("beep", pulse([note(14)] * 4 + [note(9)] * 4, 0.5, [0.9] * 3 + [0.5] + [0.9] * 3 + [0.4]))
# A coin: B5 then E6, the shape everyone knows
save("coin", pulse([B5] * 4 + [E6] * 22, 0.5, [1] * 4 + env(22, 1, 0.045)))
save("coin_soft", pulse([B5] * 3 + [E6] * 12, 0.25, [0.8] * 3 + env(12, 0.8, 0.065)))
# The map's ding
save("ding", mix(pulse([C7] * 30, 0.25, env(30, 1, 0.033)), pulse([G6] * 30, 0.5, env(30, 0.45, 0.015))))
# Heartbeats: the triangle channel thumping, the second (lub-dub) a little higher and softer
lubdub = lambda a, b, v=1.0: mix(tri([note(a - 2 * k) for k in range(8)], env(8, v, v / 8)), np.concatenate([np.zeros(8 * FRAME), tri([note(b - 2 * k) for k in range(7)], env(7, 0.7 * v, 0.1 * v))]))
save("thump_soft", lubdub(-29, -26, 0.8))
save("thump", mix(lubdub(-27, -24), pulse([note(-27 - 2 * k) for k in range(5)], 0.5, env(5, 0.35, 0.07))))
save("heavy", mix(lubdub(-31, -27), pulse([note(-26 - 3 * k) for k in range(8)], 0.5, env(8, 0.7, 0.08)), noise([2500, 1500, 900, 600, 400], [0.6, 0.45, 0.3, 0.15, 0.05])))
save("pulse", tri([note(-24 - 2 * k) for k in range(7)], env(7, 1, 0.14)))
# Blood leaving: a rising blip
save("rise", pulse([note(3 + 3 * k) for k in range(9)], 0.25, env(9, 0.9, 0.07)))
# The tally: a quick arpeggio onto a held note
save("tally", pulse([C6] * 3 + [E6] * 3 + [G6] * 3 + [C7] * 18, 0.5, [1] * 9 + env(18, 1, 0.05)))
# The nerve signal: an ascending arpeggio, one note an event
SCALE = [0, 3, 7, 10, 12, 15, 19, 22, 24, 27, 31, 34]
for k, step in enumerate(SCALE):
    save(f"arp_{k + 1}", pulse([note(step)] * 5, 0.125, [1, 0.9, 0.7, 0.45, 0.2]))
save("ping", mix(pulse([note(32)] * 30, 0.5, env(30, 1, 0.033)), pulse([note(39)] * 20, 0.25, env(20, 0.5, 0.025))))
# The pacemaker fires: the power-up
save("powerup", pulse([note(x) for x in (3, 7, 10, 15, 7, 10, 15, 19, 10, 15, 19, 22, 15, 19, 22, 27, 27, 27, 27, 27, 27, 27)], 0.5, [1] * 16 + env(6, 1, 0.15)))
# The monitor: a short beep per beat
save("blip", pulse([note(26)] * 5, 0.5, [0.9, 0.9, 0.9, 0.6, 0.2]))
save("bracket", pulse([note(22)] * 4 + [note(34)] * 10, 0.25, [1] * 4 + env(10, 1, 0.09)))
# The blocks: a sweep up as the rows stack, a thud as it lands
save("sweep", pulse([note(-12 + 1.4 * k) for k in range(30)], 0.25, env(30, 0.7, 0.0)))
save("stack", pulse([note(-12 + 1.4 * k) for k in range(14)], 0.25, env(14, 0.6, 0.0)))
save("thud", mix(tri([note(-30 - 2 * k) for k in range(10)], env(10, 1, 0.1)), noise([1200, 700, 400, 300], [0.8, 0.5, 0.25, 0.1])))
# The result: level up
save("levelup", mix(pulse([note(x) for x in (3, 7, 10, 15, 10, 15, 19, 22)] + [note(27)] * 26, 0.5, [1] * 8 + env(26, 1, 0.036)), pulse([0] * 8 + [note(22)] * 26, 0.25, [0] * 8 + env(26, 0.5, 0.018))))
save("ok", pulse([C6] * 4 + [G6] * 12, 0.5, [1] * 4 + env(12, 1, 0.08)))
# The summary: the panel drops in three steps, and a short victory tune
save("drop", pulse([note(10)] * 3 + [note(5)] * 3 + [note(-2)] * 5, 0.25, [0.9] * 6 + env(5, 0.9, 0.18)))
save("victory", pulse([note(x) for x in [10] * 5 + [15] * 5 + [19] * 5 + [22] * 5 + [27] * 30], 0.5, [1] * 20 + env(30, 1, 0.03)))
save("lift", mix(noise([1000 + 500 * k for k in range(16)], env(16, 0.5, 0.03)), pulse([note(5 + 2 * k) for k in range(16)], 0.125, env(16, 0.45, 0.028))))
print(f"{len(list(OUT.glob('*.wav')))} effects in {OUT}")
