"""Sets the effects' levels against the voice and the music, and checks them (writes cues.levels.json for cues.build.py).

    python3 examples/fotosintesis/levels.py            measure and report
    python3 examples/fotosintesis/levels.py --write    and move every cue onto its target in cues.levels.json
    (then python3 examples/fotosintesis/cues.build.py, and measure again: one pass lands within a few tenths of a dB)

It mixes the film three times with kit/audio/mix.py on a small blank picture (everything, voice and music, voice
alone), then builds the effects layer as mix.py does (each cue peak-normalised to its db, 3 dB down while the voice
speaks, at the full mix's master gain) and measures K-weighted momentary loudness (400 ms windows, every 50 ms):
  - each cue on its own at its onset (the loudest window ending 0.2-0.5 s after it) against voice and music there:
    a named cue about 6 dB under, the recipe's chord 8, a sound inside a word about 11 dB under, the sheet sliding
    between two sets 6 dB under but never quieter than -24 LUFS, and three hits that rise over a word in 100 ms (SHORT)
    further down; the textures (leaves, ticks, clicks and plucks after the first, the camera's air, rain) keep their
    kind's level. Peaks stop at -9 dBFS (-12 inside a word): the shortest hits (a tap, a click, the knock) are louder
    to the ear than a 400 ms window says.
  - the whole effects layer against the voice alone wherever the voice is speaking: it stays under it.
"""
import json, re, shutil, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from scipy.signal import lfilter
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
F = str(HERE)
SR = 48000
gain = lambda db: 10 ** (np.asarray(db, dtype=float) / 20)
def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
SP = tempfile.mkdtemp(prefix="foto-levels-")
shots = json.loads((HERE / "storyboard.json").read_text())["shots"]
length = max(s["start"] + s["duration"] for s in shots) if "duration" in shots[0] else max(s["end"] for s in shots)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"color=c=black:s=108x192:r=12:d={length:.3f}", "-c:v", "libx264", f"{SP}/blank.mp4"], check=True)
for name, extra in (("m_full", []), ("m_vm", ["--no-sfx"]), ("m_v", ["--no-sfx", "--no-music"])):
    subprocess.run([sys.executable, str(ROOT / "kit" / "audio" / "mix.py"), F, *extra, "--picture", f"{SP}/blank.mp4", "--out", f"{SP}/{name}.mp4"], check=True, capture_output=True)
mg = lambda name: float(re.search(r"master gain ([-+0-9.]+)", open(f"{SP}/{name}.mix.txt").read()).group(1))
G, GVM, GV = mg("m_full"), mg("m_vm"), mg("m_v")
vm = load(f"{SP}/m_vm.mp4") * gain(G - GVM)
vo_raw = load(f"{SP}/m_v.mp4")
N = min(len(vm), len(vo_raw))
vm, vo_raw = vm[:N], vo_raw[:N]
vo = vo_raw * gain(G - GV)
# the voice's talking envelope exactly as mix.py opens it (voice at its own -16 LUFS: the voice-only mix less its gain)
inner = vo_raw * gain(-GV)
hop = SR // 100
level = np.abs(inner).max(axis=1)[: N // hop * hop].reshape(-1, hop).max(axis=1)
talking = (level > gain(-45)).astype(float)
talking = np.clip(np.convolve(np.maximum.reduce([np.roll(talking, -k) for k in range(14)]), np.ones(41) / 41, mode="same") * 1.6, 0, 1)
env = np.interp(np.arange(N), np.arange(len(talking)) * hop + hop / 2, talking)
plan = json.load(open(f"{F}/cues.json"))
cues = plan["events"]
duck = gain(plan.get("voice", {}).get("sfx_db", -4) * env)
cache = {}
def place(c):
    f = c["file"]
    if f not in cache: cache[f] = load(ROOT / "kit" / "audio" / f)
    s = cache[f]
    if "trim" in c: s = s[int(c["trim"][0] * SR):int(c["trim"][1] * SR)]
    s = s.copy()
    if c.get("fade"):
        n = min(len(s), int(c["fade"] * SR)); s[-n:] *= np.linspace(1, 0, n)[:, None]
    if c.get("fade_in"):
        n = min(len(s), int(c["fade_in"] * SR)); s[:n] *= np.linspace(0, 1, n)[:, None]
    e = np.abs(s).max(axis=1); pk = int(np.argmax(e))
    s = s / max(e.max(), 1e-9) * gain(c["db"] + G)
    i = int(c["t"] * SR) - {"peak": pk, "end": len(s), "start": 0}[c.get("align", "start")]
    a, b = max(0, i), min(N, i + len(s))
    return a, (s[a - i:b - i] * duck[a:b, None] if b > a else np.zeros((0, 2)))
def kw(x):
    x = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x, axis=0)
    return lfilter([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621], x, axis=0)
W, H = int(0.4 * SR), int(0.05 * SR)
ends = np.arange(W, N, H)
def mom(x):
    cs = np.concatenate([[0], np.cumsum((kw(x) ** 2).sum(axis=1))])
    return -0.691 + 10 * np.log10((cs[ends] - cs[ends - W]) / W + 1e-12)
Mvm, Mvo = mom(vm), mom(vo)
T = ends / SR
layers = [place(c) for c in cues]
fx = np.zeros((N, 2))
for a, s in layers: fx[a:a + len(s)] += s
Mfx = mom(fx)
TEX = ("rustle", "air", "rain", "tick", "click", "pluck")
ev = sorted(json.load(open(f"{F}/events.json")), key=lambda e: e["at"])
keys = {}
for e in ev: keys.setdefault(round(e["at"], 3), f"{e['at']:.3f}")
wipes = {round(e["at"], 3) for e in ev if e.get("wipe")}
# A few hits rise over the word beside them in a 100 ms window though they sit 6 dB under it over 400 ms (the
# calendar's page turns on "lima tahun", the tag flipped down on "ons"): they go that much further down.
SHORT = {"12.470": -4, "12.770": -4, "18.820": -7}
# The sheet that slides between two sets is the cut, and it slides mostly in a pause, where the bed is low: on its
# own it is never quieter than -24 LUFS (still 9 dB and more under the voice).
WIPE_FLOOR = -24
wiped = []
try: levels = json.load(open(f"{F}/cues.levels.json"))
except FileNotFoundError: levels = {}
mode = "step" if "--write" in sys.argv else ("v" if "--each" in sys.argv else "check")
named, inw = [], []
for c, lay in zip(cues, layers):
    stem = c["file"].split("/")[-1]
    if c.get("under") and stem.startswith(TEX): continue
    sel = (T >= c["t"] + 0.2) & (T <= c["t"] + 0.5)
    own = mom_c = None
    base = max(0, int((c["t"] - 0.5) * SR))
    buf = np.zeros((int(3.5 * SR), 2))
    a, s = lay
    o = a - base
    if o < 0: s, o = s[-o:], 0
    s = s[: len(buf) - o]
    buf[o:o + len(s)] = s
    # momentary of this cue alone over the windows ending 0.2-0.5 s after its time; the loudest is its onset
    cs = np.concatenate([[0], np.cumsum((kw(buf) ** 2).sum(axis=1))])
    best = (-200.0, 0)
    for k in np.nonzero(sel)[0]:
        e_ = ends[k] - base
        if e_ - W < 0 or e_ > len(cs) - 1: continue
        L = -0.691 + 10 * np.log10((cs[e_] - cs[e_ - W]) / W + 1e-12)
        if L > best[0]: best = (L, k)
    L, k = best
    d = L - Mvm[k]
    wipe = round(c["t"], 3) in wipes
    target = (-11 if c.get("under") and not wipe else (-8 if stem == "chord.wav" else -6)) + SHORT.get(keys[round(c["t"], 3)], 0)
    if wipe: target = max(target, WIPE_FLOOR - Mvm[k])
    (wiped if wipe else inw if c.get("under") else named).append(d)
    top = -12.0 if c.get("under") and not wipe else -9.0
    new = c["db"] + (target - d)
    flag = ""
    if new > top: new, flag = top, " (capped)"
    if mode == "step": levels[keys[round(c["t"], 3)]] = round(float(new), 1)
    if mode == "v": print(f"{c['t']:6.2f} {stem:13s} {'sheet  ' if wipe else 'in-word' if c.get('under') else 'named  '} db {c['db']:6.1f} own {L:6.1f} vm {Mvm[k]:6.1f}  d {d:+5.1f} -> {new:6.1f}{flag}")
med = lambda x: sorted(x)[len(x) // 2]
print(f"named {len(named)}: median {med(named):+.1f}, in -8..-4: {sum(-8 <= x <= -4 for x in named)}, under -8: {sum(x < -8 for x in named)}, over -4: {sum(x > -4 for x in named)}")
print(f"inside words {len(inw)}: median {med(inw):+.1f}, over -8: {sum(x > -8 for x in inw)}")
print(f"sheet slides {len(wiped)}: against voice and music {', '.join(f'{x:+.1f}' for x in wiped)}")
sp = Mvo > -24
dd = Mfx[sp] - Mvo[sp]
print(f"speech windows {sp.sum()}: effects vs voice median {np.median(dd):+.1f}, 95th pct {np.percentile(dd, 95):+.1f}, max {dd.max():+.1f}, over -3 dB: {(dd > -3).sum()}, over 0: {(dd > 0).sum()}")
for k in np.nonzero(sp)[0][np.argsort(-dd)][:6]:
    print(f"   {T[k]:6.2f} fx {Mfx[k]:6.1f} voice {Mvo[k]:6.1f}")
# the layers in LU: effects alone over the film against the whole mix
def integ(x):
    m = mom(x); m = m[m > -70]; m = m[m > 10 * np.log10(np.mean(10 ** (m / 10))) - 10]
    return 10 * np.log10(np.mean(10 ** (m / 10)))
print(f"effects layer {integ(fx):.1f} LUFS gated, voice {integ(vo):.1f}, voice+music {integ(vm):.1f}")
# The same in 100 ms windows (a short hit can rise over a syllable that a 400 ms window averages away): wherever
# voice and music are above -20 LUFS, the windows where the effects come out on top, and the cue under each.
e100 = np.arange(int(0.1 * SR), N, H)
def short(x):
    cs = np.concatenate([[0], np.cumsum((kw(x) ** 2).sum(axis=1))])
    return -0.691 + 10 * np.log10((cs[e100] - cs[e100 - int(0.1 * SR)]) / int(0.1 * SR) + 1e-12)
Sfx, Svm, T1 = short(fx), short(vm), e100 / SR
on = Svm > -20
over = np.nonzero(on & (Sfx > Svm))[0]
def near(t):
    best = max((c for c in cues if c["t"] - 0.1 <= t <= c["t"] + 0.6), key=lambda c: c["db"], default=None)
    return f"{best['t']:.2f} {best['file'].split('/')[-1][:-4]}" if best else "?"
print(f"100 ms windows over -20 LUFS {on.sum()}: effects on top in {len(over)} ({100 * len(over) / on.sum():.1f}%), most {max((Sfx[over] - Svm[over]), default=0):+.1f} dB")
if mode != "check": print("   " + "; ".join(f"{T1[i]:.2f} {Sfx[i] - Svm[i]:+.1f} ({near(T1[i])})" for i in over))
if mode == "step":
    json.dump(dict(sorted(levels.items(), key=lambda kv: float(kv[0]))), open(f"{F}/cues.levels.json", "w"), indent=0)
shutil.rmtree(SP, ignore_errors=True)
