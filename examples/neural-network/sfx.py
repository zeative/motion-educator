"""The film's own effects: zaps, blips, a buzz, a hum, a swell, made from numbers (seeded: the same every run).

    python3 examples/neural-network/sfx.py      -> examples/neural-network/sfx/*.wav (cues.build.py places them)

The library has no neon in it (it is whooshes, impacts and interface sounds), and the template's Sound line asks for
"a synth bed with a pulsing bass, zaps and soft hums". These are synth sounds in the bed's key: the bed sits on F and
C (F major, measured from its chroma), so every pitched blip and chord is F, G, A, C or E, and the one sound meant to
be wrong (the error) is a low F against an F sharp.
"""
import math
import wave
from pathlib import Path

import numpy as np

SR = 48000
OUT = Path(__file__).parent / "sfx"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(8)
NOTE = {n: 440 * 2 ** ((m - 69) / 12) for n, m in {
    "F2": 41, "F#2": 42, "C3": 48, "F3": 53, "A3": 57, "C4": 60, "E4": 64, "G4": 67, "F4": 65,
    "C5": 72, "E5": 76, "F5": 77, "G5": 79, "A5": 81, "C6": 84, "E6": 88, "G6": 91, "F6": 89}.items()}


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def env(n, attack=0.003, decay=0.06, hold=0.0):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    d = np.where(t < attack + hold, 1.0, np.exp(-(t - attack - hold) / decay))
    return a * d


def chirp(f0, f1, dur, curve="exp"):
    t = t_(dur)
    f = f0 * (f1 / f0) ** (t / dur) if curve == "exp" else f0 + (f1 - f0) * t / dur
    return 2 * math.pi * np.cumsum(f) / SR


def lowpass(x, fc):
    a = math.exp(-2 * math.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def highpass(x, fc):
    return x - lowpass(x, fc)


def saw(phase):
    return 2 * ((phase / (2 * math.pi)) % 1) - 1


def save(name, x, pan_width=0.0):
    x = np.asarray(x, dtype=np.float64)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.89  # every file peaks at -1 dBFS; cues.json sets the level
    fade = min(len(x), int(0.004 * SR))
    x[-fade:] *= np.linspace(1, 0, fade)
    st = np.stack([x, x], axis=1)
    if pan_width:
        st[:, 0] = x * (1 - pan_width) + np.roll(x, 24) * pan_width
    pcm = (np.clip(st, -1, 1) * 32767).astype("<i2")
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


# A pulse fires: a bright electric chirp falling fast, with a click of noise at its front.
for i, f0 in enumerate([2200, 2600, 3000], 1):
    d = 0.16
    ph = chirp(f0, 320, d)
    x = (np.sin(ph) + 0.35 * np.tanh(3 * np.sin(ph))) * env(len(ph), 0.002, 0.045)
    click = highpass(rng.standard_normal(len(ph)), 2500) * env(len(ph), 0.0005, 0.006) * 0.6
    save(f"zap_{i}", x + click)
# The strong pulse in s05: longer, with a body under it.
ph = chirp(1800, 160, 0.42)
x = (np.sin(ph) + 0.4 * np.tanh(4 * np.sin(ph))) * env(len(ph), 0.002, 0.12)
x += np.sin(2 * math.pi * NOTE["F2"] * 2 * t_(0.42)) * env(len(ph), 0.004, 0.12) * 0.8
save("zap_big", x)
# The error going back up: a zap played backwards, rising, cut at its top.
ph = chirp(240, 2600, 0.5)
e = np.clip(t_(0.5) / 0.5, 0, 1) ** 2.2
x = (np.sin(ph) + 0.3 * np.tanh(3 * np.sin(ph))) * e
save("zap_up", x)
# The cross over the rules: a lower falling zap with grit.
ph = chirp(1400, 110, 0.26)
x = np.tanh(2.5 * np.sin(ph)) * env(len(ph), 0.002, 0.08) + highpass(rng.standard_normal(len(ph)), 1800) * env(len(ph), 0.001, 0.02) * 0.4
save("zap_down", x)

# Blips: a soft square tone with a little fall in pitch, in the bed's key.
def blip(freq, dur=0.13, decay=0.05, hold=0.0):
    t = t_(dur)
    ph = 2 * math.pi * np.cumsum(freq * (1 + 0.04 * np.exp(-t / 0.02))) / SR
    x = np.tanh(1.8 * np.sin(ph)) + 0.25 * np.sin(2 * ph)
    return x * env(len(t), 0.003, decay, hold)


for name in ["C5", "F5", "G5", "A5", "C6", "E6"]:
    save(f"blip_{name}", blip(NOTE[name]))
save("blip_C6_long", blip(NOTE["C6"], dur=0.7, decay=0.2, hold=0.08))
save("blip_low", blip(NOTE["F4"], dur=0.12, decay=0.035) * 0.6)  # an input that stays at 0: a muted blip

# A tick: a click and a bright ping that rings for a moment (enough body to be heard over the bed at a low peak).
t = t_(0.12)
save("tick", highpass(rng.standard_normal(len(t)), 3000) * env(len(t), 0.0003, 0.002) * 0.7 + (np.sin(2 * math.pi * 3150 * t) + 0.6 * np.sin(2 * math.pi * NOTE["C6"] * 1.5 * t)) * env(len(t), 0.0008, 0.028))
# A click for a number landing: lower, rounder.
save("click", highpass(rng.standard_normal(len(t)), 1200) * env(len(t), 0.0003, 0.003) * 0.7 + (np.sin(2 * math.pi * NOTE["C6"] * t) + 0.5 * np.sin(2 * math.pi * NOTE["F5"] * t)) * env(len(t), 0.001, 0.04))

# Rising arpeggios for a guess running down the network: F A C E, and one step higher, G C E G.
def arp(notes, step=0.075):
    out = np.zeros(int((step * len(notes) + 0.16) * SR))
    for k, n in enumerate(notes):
        b = blip(NOTE[n], dur=0.16, decay=0.05) * (0.75 + 0.25 * k / len(notes))
        i = int(k * step * SR)
        out[i : i + len(b)] += b
    return out


save("arp_up", arp(["F5", "A5", "C6", "E6"]))
save("arp_up2", arp(["G5", "C6", "E6", "G6"]))

# The wrong note: a low F against an F sharp, buzzing, a little gritty, cut short.
for name, dur in (("buzz", 0.5), ("buzz_soft", 0.28)):
    t = t_(dur)
    x = saw(2 * math.pi * NOTE["F2"] * 2 * t) + saw(2 * math.pi * NOTE["F#2"] * 2 * t) + 0.5 * saw(2 * math.pi * NOTE["F2"] * t)
    x = lowpass(x * (0.75 + 0.25 * np.sign(np.sin(2 * math.pi * 31 * t))), 1600)
    # a bright electric crackle on top: the part a phone speaker plays
    crackle = highpass(rng.standard_normal(len(t)), 2500) * (0.6 + 0.4 * np.sign(np.sin(2 * math.pi * 31 * t))) * 0.5
    save(name, (x + crackle) * env(len(t), 0.004, dur * 0.4, hold=dur * 0.3))

# A neon tube powering up: a mains hum and a crackle, gated in the same flicker the picture uses (film.js flick()).
def gate(t):
    return np.select([t < 0.034, t < 0.067, t < 0.1, t < 0.15], [0.85, 0.12, 1.0, 0.45], 1.0)


t = t_(0.3)
hum = np.sin(2 * math.pi * 120 * t) + 0.6 * np.sin(2 * math.pi * 240 * t) + 0.35 * np.sin(2 * math.pi * 360 * t) + 0.2 * saw(2 * math.pi * 120 * t)
crackle = highpass(rng.standard_normal(len(t)), 2000) * (rng.random(len(t)) < 0.02) * 2.5
save("power", (hum * 0.8 + crackle) * gate(t) * env(len(t), 0.001, 0.07, hold=0.12))
# ... and dying: the flicker reversed.
t = t_(0.3)
g2 = np.select([t < 0.05, t < 0.1, t < 0.14, t < 0.2], [0.35, 0.9, 0.12, 0.5], 0.0)
hum = np.sin(2 * math.pi * 120 * t) + 0.6 * np.sin(2 * math.pi * 240 * t) + 0.2 * saw(2 * math.pi * 120 * t)
save("power_off", (hum + highpass(rng.standard_normal(len(t)), 2000) * (rng.random(len(t)) < 0.03) * 2) * g2)

# The network's hum: soft, low, steady, for under the opening (a texture).
t = t_(4.0)
x = np.sin(2 * math.pi * NOTE["F2"] * t) + 0.5 * np.sin(2 * math.pi * NOTE["C3"] * t * (1 + 0.002 * np.sin(2 * math.pi * 0.7 * t))) + 0.25 * np.sin(2 * math.pi * NOTE["F3"] * t)
save("hum", x * np.clip(t / 0.4, 0, 1) * np.clip((4.0 - t) / 0.8, 0, 1))

# The nudge: a synth swell rising into the change (F, C, E, saws opening their filter), at its top by 0.22 s, then off.
t = t_(0.4)
x = sum(saw(2 * math.pi * NOTE[n] * (1 + d) * t) for n in ("F3", "C4", "E4") for d in (-0.004, 0.004))
cut = 400 + 2200 * np.clip(t / 0.24, 0, 1) ** 2
y = np.zeros_like(x)
acc = 0.0
for i in range(len(x)):
    a = math.exp(-2 * math.pi * cut[i] / SR)
    acc = (1 - a) * x[i] + a * acc
    y[i] = acc
save("swell", y * np.clip(t / 0.22, 0, 1) ** 1.5 * np.clip((0.4 - t) / 0.16, 0, 1), pan_width=0.3)

# The trained network: a warm chord (F major nine) opening.
t = t_(1.1)
x = sum(saw(2 * math.pi * NOTE[n] * (1 + d) * t) for n in ("F3", "A3", "C4", "E4", "G4") for d in (-0.003, 0.003))
x = lowpass(lowpass(x, 1400), 2200)
save("chord", x * np.clip(t / 0.1, 0, 1) * np.clip((1.1 - t) / 0.7, 0, 1), pan_width=0.3)

# The error curve: a glide whose pitch follows the network's real error, round by round (net.json), as the line draws.
import json  # noqa: E402

net = json.loads((Path(__file__).parent / "net.json").read_text())
curve = [net["mse_start"], *net["mse_rounds"][1:61]]
d = 1.5  # film.js CURVE_DUR
t = t_(d)
v = np.interp(t / d * 60, np.arange(61), curve)
f = NOTE["F3"] + (NOTE["C6"] - NOTE["F3"]) * (v / curve[0])
ph = 2 * math.pi * np.cumsum(f) / SR
x = np.sin(ph) + 0.3 * np.tanh(2 * np.sin(ph))
save("glide", x * np.clip(t / 0.03, 0, 1) * np.clip((d - t) / 0.25, 0, 1) * (0.6 + 0.4 * v / curve[0]))

# A chirp as the cat is drawn: a quick rising whistle.
ph = chirp(900, 2600, 0.2)
save("chirp", (np.sin(ph) + 0.2 * np.sin(2 * ph)) * env(len(ph), 0.01, 0.07, hold=0.06))

# A sub drop for the scale of a big model: a low sine falling an octave.
ph = chirp(NOTE["F2"] * 2, NOTE["F2"] / 2, 1.2)
save("sub", np.sin(ph) * env(len(ph), 0.006, 0.45))
print(f"{len(list(OUT.glob('*.wav')))} sounds -> {OUT}")
