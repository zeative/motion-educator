"""Writes storyboard.json for "Kenapa popcorn bisa meletus?" (portrait 1080 x 1920, the Comic template).

The sample film of the Comic visual template: comic book pages, panels with thick black borders on warm white paper,
halftone dots for the mid-tones, yellow caption boxes, Bangers sound words and one splash panel for the pop, held at
12 frames a second like limited animation. The film is cut to one take of narration, so the times here are only a
guess until the take retimes the board:

    python3 examples/popcorn/storyboard.build.py && node kit/tools/storyboard.mjs examples/popcorn --png

The physics is a pressure vessel: the hard hull (pericarp) holds the steam from the kernel's own water until it
bursts at about 180 degrees C (Virot & Ponomarenko 2015), when the pressure inside is about 931 kPa (135 psi:
Hoseney et al. 1983), 931 / 101.325 = 9.2 times the air's. The thermometer and the gauge in s07 and s07b are
computed from those numbers below. Everything that must be read sits above y 1290: the caption box sits under it.

The sources were read through web search results (abstracts, catalogue records and quoted passages); no paper's full
text could be opened from the session that wrote this board.
"""
import json
import math
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
shots = []

# ── The numbers ──────────────────────────────────────────────────────────────────────────────────────────────────
POP_C = 180  # degrees C: the critical temperature at which nearly all kernels pop (Virot & Ponomarenko 2015)
POP_KPA = 931  # kPa inside the kernel when it pops (135 psi, Hoseney et al. 1983, at about 177 C)
ATM_KPA = 101.325  # one standard atmosphere
TIMES_AIR = POP_KPA / ATM_KPA  # 9.19: "kira-kira sembilan kali tekanan udara"
MOISTURE = 14  # percent of the kernel's weight: the optimum (13.5-14 %, Popcorn Board; 14 %, Iowa State)
THERMO_MAX = 200  # the thermometer's scale, 0 to 200 C
GAUGE_MAX = 10  # the gauge's scale, 0 to 10 times the air's pressure
assert round(TIMES_AIR) == 9 and abs(POP_KPA / 6.895 - 135) < 1  # 931 kPa is 135 psi
dec = lambda v: f"{v:g}".replace(".", ",")

# ── The palette (the template's five) and the page ───────────────────────────────────────────────────────────────
C = {"paper": "#fffdf6", "ink": "#1c1c1e", "red": "#ff3b30", "yellow": "#ffcc00", "blue": "#007aff"}
HULL = "#e8891a"  # the sketcher's orange stands for the hull's yellow overprinted with red dots (no sixth colour)
TOP, BOTTOM = 236, 1290  # the panels' space: everything read sits in it; the caption box is below


def fr(at, note, *draw):
    flat = []
    for d in draw:
        flat.extend(d if isinstance(d, list) else [d])
    return {"at": at, "note": note, "draw": flat}


def label(x, y, text, size=48, **more):
    return {"label": [x, y], "text": text, "size": size, **more}


def panel(x0, y0, x1, y1, tint=None, step=40):
    """A panel with a thick ink border; tint lays halftone dots over its lower-right half (the comic's mid-tone)."""
    out = [{"path": f"M{x0} {y0}H{x1}V{y1}H{x0}Z", "colour": C["ink"], "width": 12}]
    if tint:
        dots = "".join(f"M{x} {y}h0.1" for y in range(y0 + step // 2, y1 - 8, step) for x in range(x0 + step // 2 + (y // step % 2) * step // 2, x1 - 8, step)
                       if (x - x0) / (x1 - x0) + (y - y0) / (y1 - y0) > 1.05)
        out.insert(0, {"path": dots, "colour": tint, "width": 9})
    return out


def caption(line, key=None):
    """The yellow narration box the captions appear in (the template's caption skin), below the panels."""
    out = [{"path": "M80 1312H1000V1428H80Z", "colour": C["ink"], "fill": C["yellow"], "width": 7}, label(110, 1386, line, 50, align="start")]
    if key:
        out.append(label(980, 1386, key, 54, align="end", colour=C["red"]))
    return out


def callout(x, y, text, tx, ty, size=40, colour=C["ink"]):
    """A small callout box with a pointer to what it names."""
    w = len(text) * size * 0.52 + 36
    return [{"path": f"M{x - w / 2:g} {y - size * 0.9:g}h{w:g}v{size * 1.3:g}h{-w:g}Z", "colour": C["ink"], "width": 5},
            label(x, y, text, size, colour=colour), {"path": f"M{x:g} {y + size * 0.4:g}L{tx} {ty}", "colour": C["ink"], "width": 5}]


def sfx(x, y, text, size=150, colour=C["red"]):
    """A sound word (Bangers in the film): bold, red with an ink edge."""
    return label(x, y, text, size, colour=colour)


def kernel_path(cx, cy, s):
    """A popcorn kernel from the front: a broad rounded crown narrowing to the pointed tip cap where it sat on the cob."""
    p = lambda a, b: f"{cx + a * s:g} {cy + b * s:g}"
    return f"M{p(0, -0.5)} C{p(0.46, -0.52)} {p(0.46, 0.05)} {p(0.12, 0.42)} L{p(0.03, 0.5)} L{p(-0.03, 0.5)} L{p(-0.12, 0.42)} C{p(-0.46, 0.05)} {p(-0.46, -0.52)} {p(0, -0.5)} Z"


def kernel(cx, cy, s, cracked=False):
    """A whole kernel: the glossy hull (yellow), a white highlight, the germ's teardrop on its face."""
    out = [{"path": kernel_path(cx, cy, s), "colour": C["ink"], "fill": C["yellow"], "width": 8},
           {"path": f"M{cx - 0.22 * s:g} {cy - 0.30 * s:g} q{0.1 * s:g} {-0.1 * s:g} {0.24 * s:g} {-0.08 * s:g}", "colour": "#ffffff", "width": 10},
           {"path": f"M{cx:g} {cy + 0.36 * s:g} c{-0.14 * s:g} {-0.1 * s:g} {-0.14 * s:g} {-0.34 * s:g} 0 {-0.42 * s:g} c{0.14 * s:g} {0.08 * s:g} {0.14 * s:g} {0.32 * s:g} 0 {0.42 * s:g}", "colour": C["ink"], "width": 5}]
    if cracked:
        out.append({"bolt": [cx - 0.1 * s, cy - 0.5 * s, cx + 0.08 * s, cy - 0.05 * s], "seed": 3, "width": 7})
    return out


def cutaway(cx, cy, s, water=True, steam=0, hull_mark=False, soft_mark=False):
    """The kernel cut in half: the hull (pericarp) as a thin hard skin, the hard glassy starch under it, the soft
    white starch in the middle with the water in it (blue drops), the germ at the bottom; steam (0 to 1) replaces the
    drops with puffs pushing on the hull."""
    p = lambda a, b: (cx + a * s, cy + b * s)
    out = [{"path": kernel_path(cx, cy, s), "colour": C["red"] if hull_mark else C["ink"], "fill": HULL, "width": 22 if hull_mark else 14},
           {"path": kernel_path(cx, cy - 0.01 * s, s * 0.9), "colour": C["ink"], "fill": C["yellow"], "width": 4},
           {"path": "M{0:g} {1:g} c{2:g} {3:g} {4:g} {5:g} {6:g} {7:g} c{8:g} {9:g} {10:g} {11:g} {12:g} {13:g} Z".format(*p(-0.26, -0.12), -0.02 * s, -0.22 * s, 0.5 * s, -0.26 * s, 0.52 * s, 0.02 * s, 0.02 * s, 0.24 * s, -0.48 * s, 0.26 * s, -0.52 * s, -0.02 * s),
            "colour": C["red"] if soft_mark else C["ink"], "fill": "#ffffff", "width": 9 if soft_mark else 5},
           {"path": "M{0:g} {1:g} c{2:g} {3:g} {4:g} {5:g} 0 {6:g} c{7:g} {8:g} {9:g} {10:g} 0 {11:g}".format(*p(0.02, 0.40), -0.16 * s, -0.08 * s, -0.16 * s, -0.3 * s, -0.36 * s, 0.14 * s, 0.1 * s, 0.14 * s, 0.28 * s, 0.36 * s), "colour": C["ink"], "fill": C["yellow"], "width": 5}]
    drops = [(-0.14, -0.14), (0.0, -0.2), (0.14, -0.12), (-0.06, -0.02), (0.1, 0.0), (-0.18, 0.02)]
    if water and steam < 1:
        for a, b in drops:
            x, y = p(a, b)
            r = 0.035 * s
            out.append({"path": f"M{x:g} {y - r * 1.6:g} q{r:g} {r * 1.4:g} 0 {r * 2.6:g} q{-r:g} {-r * 1.2:g} 0 {-r * 2.6:g}Z", "colour": C["blue"], "fill": C["blue"], "width": 6})
    if steam:
        for a, b in drops:
            x, y = p(a * 1.5, b * 1.4)
            out.append({"cloud": [x, y, 0.13 * s]})
        for ang in range(0, 360, 45):
            r0, r1 = 0.26 * s, (0.32 + 0.06 * steam) * s
            c, si = math.cos(math.radians(ang)), math.sin(math.radians(ang))
            out.append({"arrow": [cx + c * r0, cy - 0.08 * s + si * r0, cx + c * r1, cy - 0.08 * s + si * r1], "colour": C["red"], "width": 7})
    return out


def flake(cx, cy, r, hull=True):
    """A popped flake: a puffy white foam of lobes with ink edges, bits of the yellow hull still on its base."""
    pts, n = [], 11
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 1 + 0.18 * math.sin(i * 2.3)
        pts.append((cx + math.cos(a) * r * k, cy + math.sin(a) * r * 0.82 * k))
    d = f"M{pts[0][0]:.0f} {pts[0][1]:.0f}" + "".join(f"A{r * 0.34:.0f} {r * 0.34:.0f} 0 0 1 {x:.0f} {y:.0f}" for x, y in pts[1:] + pts[:1]) + "Z"
    out = [{"path": d, "colour": C["ink"], "fill": "#ffffff", "width": 9},
           {"path": f"M{cx - r * 0.3:.0f} {cy - r * 0.1:.0f} q{r * 0.15:.0f} {-r * 0.2:.0f} {r * 0.3:.0f} 0 M{cx + r * 0.1:.0f} {cy + r * 0.25:.0f} q{r * 0.15:.0f} {-r * 0.2:.0f} {r * 0.3:.0f} 0", "colour": C["ink"], "width": 5}]
    if hull:
        out.append({"path": f"M{cx - r * 0.35:.0f} {cy + r * 0.62:.0f} l{r * 0.2:.0f} {r * 0.3:.0f} l{r * 0.25:.0f} {-r * 0.12:.0f} l{r * 0.05:.0f} {-r * 0.22:.0f}Z", "colour": C["ink"], "fill": HULL, "width": 6})
    return out


def burst(cx, cy, r0, r1, n=16):
    """An impact burst: a star of n points with an ink edge, yellow inside."""
    pts = []
    for i in range(n * 2):
        a = math.pi * i / n
        r = r1 if i % 2 else r0
        pts.append(f"{cx + math.cos(a) * r * 1.1:.0f} {cy + math.sin(a) * r:.0f}")
    return {"path": "M" + " L".join(pts) + "Z", "colour": C["ink"], "fill": C["yellow"], "width": 9}


def speed(cx, cy, r0, r1, n=14, clip=(60, TOP, 1020, BOTTOM)):
    """Speed lines radiating from the action, kept inside their panel (clip)."""
    inside = lambda x, y: clip[0] + 20 <= x <= clip[2] - 20 and clip[1] + 20 <= y <= clip[3] - 20
    d = ""
    for i in range(n):
        a = 2 * math.pi * i / n
        x0, y0, x1, y1 = cx + math.cos(a) * r0, cy + math.sin(a) * r0, cx + math.cos(a) * r1, cy + math.sin(a) * r1
        if inside(x0, y0) and inside(x1, y1):
            d += f"M{x0:.0f} {y0:.0f}L{x1:.0f} {y1:.0f}"
    return {"path": d or f"M{cx} {cy}h0.1", "colour": C["ink"], "width": 6}


def steam(x, y, k=1.0):
    """Steam jetting up from a crack at (x, y): puffs growing as they rise, with speed lines beside them."""
    out = [{"cloud": [x + dx * k, y - dy * k, w * k]} for dx, dy, w in ((0, 30, 170), (-25, 150, 250), (20, 300, 330))]
    out.append({"path": f"M{x - 210 * k:.0f} {y - 40 * k:.0f}v{-220 * k:.0f}M{x + 210 * k:.0f} {y - 30 * k:.0f}v{-240 * k:.0f}M{x - 260 * k:.0f} {y - 150 * k:.0f}v{-150 * k:.0f}M{x + 260 * k:.0f} {y - 130 * k:.0f}v{-170 * k:.0f}", "colour": C["ink"], "width": 6})
    return out


def fingers(x, y, s):
    """A thumb and a finger pinching something at (x, y), coming in from the lower left."""
    return [{"path": f"M{x - 1.3 * s:g} {y + 1.1 * s:g} C{x - 0.9 * s:g} {y + 0.5 * s:g} {x - 0.6 * s:g} {y + 0.35 * s:g} {x - 0.36 * s:g} {y + 0.1 * s:g} q{0.12 * s:g} {-0.14 * s:g} {0.06 * s:g} {0.3 * s:g} C{x - 0.5 * s:g} {y + 0.7 * s:g} {x - 0.7 * s:g} {y + 0.9 * s:g} {x - 0.8 * s:g} {y + 1.2 * s:g}", "colour": C["ink"], "fill": "#ffd9b0", "width": 8},
            {"path": f"M{x - 1.4 * s:g} {y - 0.2 * s:g} C{x - 1.0 * s:g} {y - 0.3 * s:g} {x - 0.7 * s:g} {y - 0.32 * s:g} {x - 0.36 * s:g} {y - 0.18 * s:g} q{0.12 * s:g} {0.12 * s:g} {-0.04 * s:g} {0.26 * s:g} C{x - 0.8 * s:g} {y + 0.06 * s:g} {x - 1.1 * s:g} {y + 0.12 * s:g} {x - 1.4 * s:g} {y + 0.18 * s:g}", "colour": C["ink"], "fill": "#ffd9b0", "width": 8}]


def kid(x, y, s, puzzled=True):
    """The narrator: a kid from the shoulders up, head at (x, y), looking hard at the kernel she holds up."""
    out = [{"path": f"M{x - 0.9 * s:g} {y + 1.5 * s:g} C{x - 0.85 * s:g} {y + 0.9 * s:g} {x - 0.4 * s:g} {y + 0.75 * s:g} {x:g} {y + 0.75 * s:g} C{x + 0.4 * s:g} {y + 0.75 * s:g} {x + 0.85 * s:g} {y + 0.9 * s:g} {x + 0.9 * s:g} {y + 1.5 * s:g}", "colour": C["ink"], "fill": C["blue"], "width": 9},
           {"ring": [x, y, 0.55 * s], "width": 9},
           {"path": f"M{x - 0.56 * s:g} {y - 0.05 * s:g} C{x - 0.6 * s:g} {y - 0.75 * s:g} {x + 0.6 * s:g} {y - 0.75 * s:g} {x + 0.56 * s:g} {y - 0.05 * s:g} C{x + 0.3 * s:g} {y - 0.35 * s:g} {x - 0.3 * s:g} {y - 0.35 * s:g} {x - 0.56 * s:g} {y - 0.05 * s:g}Z", "colour": C["ink"], "fill": C["ink"], "width": 6},
           {"dot": [x - 0.2 * s, y + 0.05 * s, 0.06 * s], "colour": C["ink"]}, {"dot": [x + 0.2 * s, y + 0.05 * s, 0.06 * s], "colour": C["ink"]},
           {"path": f"M{x - 0.32 * s:g} {y - 0.12 * s:g} l{0.2 * s:g} {(-0.08 if puzzled else 0.02) * s:g} M{x + 0.12 * s:g} {y - 0.18 * s:g} l{0.2 * s:g} {0.08 * s:g}", "colour": C["ink"], "width": 8},
           {"path": f"M{x - 0.12 * s:g} {y + 0.3 * s:g} q{0.12 * s:g} {(-0.06 if puzzled else 0.1) * s:g} {0.24 * s:g} 0", "colour": C["ink"], "width": 7}]
    return out


def pan(cx, cy, w, kernels=4, flames=True):
    """A frying pan on a gas ring: oil, a few kernels, the handle to the right, blue-and-red flames under it."""
    out = [{"path": f"M{cx - w / 2:g} {cy:g}H{cx + w / 2:g}L{cx + w * 0.42:g} {cy + w * 0.16:g}H{cx - w * 0.42:g}Z", "colour": C["ink"], "fill": "#8d8d94", "width": 10},
           {"path": f"M{cx + w / 2:g} {cy + w * 0.03:g}H{cx + w * 0.86:g}", "colour": C["ink"], "width": 18}]
    for i in range(kernels):
        out += kernel(cx - w * 0.3 + i * w * 0.2, cy - w * 0.04, w * 0.1)
    if flames:
        for i in range(5):
            fx = cx - w * 0.32 + i * w * 0.16
            out.append({"path": f"M{fx:g} {cy + w * 0.3:g} q{-w * 0.04:g} {-w * 0.06:g} 0 {-w * 0.12:g} q{w * 0.04:g} {w * 0.06:g} 0 {w * 0.12:g}Z", "colour": C["red"], "fill": C["blue"], "width": 6})
    return out


def heat(cx, cy, w):
    return {"path": "".join(f"M{cx + dx:g} {cy:g} c{-w * 0.04:g} {-w * 0.05:g} {w * 0.04:g} {-w * 0.1:g} 0 {-w * 0.15:g} c{-w * 0.04:g} {-w * 0.05:g} {w * 0.04:g} {-w * 0.1:g} 0 {-w * 0.15:g}" for dx in (-w * 0.2, 0, w * 0.2)), "colour": C["red"], "width": 9}


def presto(cx, cy, s, hiss=True):
    """A pressure cooker (panci presto): the pot, its locked lid with the long handle, the weight valve on top."""
    out = [{"path": f"M{cx - 0.5 * s:g} {cy - 0.2 * s:g}V{cy + 0.45 * s:g}Q{cx - 0.5 * s:g} {cy + 0.55 * s:g} {cx - 0.4 * s:g} {cy + 0.55 * s:g}H{cx + 0.4 * s:g}Q{cx + 0.5 * s:g} {cy + 0.55 * s:g} {cx + 0.5 * s:g} {cy + 0.45 * s:g}V{cy - 0.2 * s:g}Z", "colour": C["ink"], "fill": "#c2c3c7", "width": 10},
           {"path": f"M{cx - 0.56 * s:g} {cy - 0.2 * s:g}Q{cx:g} {cy - 0.5 * s:g} {cx + 0.56 * s:g} {cy - 0.2 * s:g}Z", "colour": C["ink"], "fill": "#c2c3c7", "width": 10},
           {"path": f"M{cx + 0.1 * s:g} {cy - 0.3 * s:g}H{cx + 0.95 * s:g}", "colour": C["ink"], "width": 22},
           {"path": f"M{cx - 0.06 * s:g} {cy - 0.36 * s:g}h{0.12 * s:g}v{-0.12 * s:g}h{-0.12 * s:g}Z", "colour": C["ink"], "fill": C["ink"], "width": 6}]
    if hiss:
        out.append({"cloud": [cx - 0.05 * s, cy - 0.62 * s, 0.4 * s]})
    return out


def thermometer(x, y0, y1, value):
    """A thermometer from 0 to THERMO_MAX C: the red column is computed from the value."""
    h = y1 - y0
    top = y1 - h * value / THERMO_MAX
    out = [{"path": f"M{x - 30} {y0}V{y1}A60 60 0 1 0 {x + 30} {y1}V{y0}A30 30 0 0 0 {x - 30} {y0}Z", "colour": C["ink"], "fill": "#ffffff", "width": 9},
           {"path": f"M{x - 14} {top:g}V{y1 + 30}H{x + 14}V{top:g}Z", "colour": C["red"], "fill": C["red"], "width": 8}, {"dot": [x, y1 + 46, 44], "colour": C["red"]}]
    for v in range(0, THERMO_MAX + 1, 50):
        yy = y1 - h * v / THERMO_MAX
        out += [{"path": f"M{x + 34} {yy:g}h34", "colour": C["ink"], "width": 5}, label(x + 80, yy + 14, f"{v}", 38, align="start")]
    return out


def gauge(cx, cy, r, value, needle=True):
    """A pressure gauge from 0 to GAUGE_MAX times the air's pressure, over 240 degrees; the needle is computed."""
    a0, span = 150, 240  # degrees, clockwise from the +x axis in screen space
    ang = lambda v: math.radians(a0 + span * v / GAUGE_MAX)
    out = [{"ring": [cx, cy, r], "width": 12}, {"ring": [cx, cy, r * 0.12]}]
    ticks = ""
    for v in range(0, GAUGE_MAX + 1):
        a = ang(v)
        k = 0.78 if v % 5 == 0 else 0.86
        ticks += f"M{cx + math.cos(a) * r * k:.0f} {cy + math.sin(a) * r * k:.0f}L{cx + math.cos(a) * r * 0.95:.0f} {cy + math.sin(a) * r * 0.95:.0f}"
    out.append({"path": ticks, "colour": C["ink"], "width": 7})
    for v in (0, 5, 10):
        a = ang(v)
        out.append(label(cx + math.cos(a) * r * 0.6, cy + math.sin(a) * r * 0.6 + 16, f"{v}", 46))
    a = ang(GAUGE_MAX * 0.85)
    out.append({"path": f"M{cx + math.cos(ang(GAUGE_MAX * 0.8)) * r * 0.9:.0f} {cy + math.sin(ang(GAUGE_MAX * 0.8)) * r * 0.9:.0f}A{r * 0.9:.0f} {r * 0.9:.0f} 0 0 1 {cx + math.cos(ang(GAUGE_MAX)) * r * 0.9:.0f} {cy + math.sin(ang(GAUGE_MAX)) * r * 0.9:.0f}", "colour": C["red"], "width": 16})
    if needle:
        a = ang(value)
        out.append({"path": f"M{cx:g} {cy:g}L{cx + math.cos(a) * r * 0.82:.0f} {cy + math.sin(a) * r * 0.82:.0f}", "colour": C["red"], "width": 14})
    return out


# ── The script, cut into shots (one take; the take sets the times) ────────────────────────────────────────────────
t = 0.0


def shot(id, act, type_, voice, **more):
    global t
    said = voice.replace("*", "")
    dur = round(max(1.5, len(said) / 15.5 + 0.25), 2)  # a guess at the take: the finished examples ran at 14 to 15 characters a second
    shots.append({"id": id, "act": act, "type": type_, "start": round(t, 3), "end": round(t + dur, 3), "voice": voice, **more})
    t += dur


P1, P2 = (60, TOP, 1020, 744), (60, 774, 1020, BOTTOM)  # the opening page: two stacked panels


def opening(pop=1.0, at=0):
    """The opening page: a kernel pinched between finger and thumb (top), the same kernel bursting into a flake (bottom)."""
    out = [*panel(*P1, C["blue"]), *fingers(470, 520, 170), *kernel(600, 490, 280), *callout(880, 330, "KERAS", 720, 420, 50),
           *panel(*P2, C["red"]), burst(540, 1050, 120 + 15 * pop, 205 + 20 * pop), *flake(540, 1065, 95 * pop + 20), sfx(540, 950, "POP!", 150), speed(540, 1050, 250, 340, 16, P2)]
    return out


shot("s01", "hook", "wide", "Biji jagung sekeras ini bisa *meledak* jadi popcorn.",
     teaches="The everyday wonder the film explains: a hard dry kernel bursts into a soft white flake.",
     screen="A comic page on warm white paper, two stacked panels with thick ink borders. Top (y 236 to 744): a close-up of a real popcorn kernel pinched between finger and thumb, drawn in confident ink: the broad rounded crown, the pointed tip cap, the germ's teardrop on its face, glossy yellow with a white highlight; blue halftone dots in the panel's lower right; a callout 'KERAS' with a pointer. Bottom (y 774 to 1290): the same kernel bursting: a yellow impact burst, the white flake of foam with bits of hull at its base, speed lines, and the sound word 'POP!' in red Bangers with an ink edge; red halftone.",
     motion="Frame 0 is finished. Limited animation on twelves: the burst throbs (two drawings), the flake jiggles, the speed lines flicker; the top panel holds still.",
     carries="The kernel and the flake.", transition="The top panel slides off to the left; the narrator slides in with the kernel.",
     sound="A punchy bed starts (a snare hit on frame 0); the 'pop' itself on the burst.", check="Frame 0 reads at a glance as a comic page; the kernel looks like a real popcorn kernel, not a generic corn icon.", facts=["p1"],
     frames=[fr(0, "Frame 0 is finished: the kernel between finger and thumb; below, the same kernel bursting, 'POP!'.", opening(), caption("BIJI JAGUNG", "SEKERAS INI")),
             fr(0.5, "The burst throbs on twelves; the speed lines flicker.", opening(1.15), {"move": [880, 1180, 960, 1240], "text": "getar"}, caption("BISA", "MELEDAK")),
             fr(1, "Held; the top panel starts to slide off.", opening(), {"move": [400, 300, 120, 300], "text": "panel geser"}, caption("JADI", "POPCORN"), {"cut": "narator masuk"})])

shot("s02", "hook", "wide", "Kok bisa, padahal bijinya kelihatan kering?",
     teaches="Asks the question, with the tension: the kernel looks completely dry.",
     screen="One tall panel (y 236 to 1290): the narrator, a kid in a blue T-shirt drawn from the shoulders up, holds the kernel up to one eye and squints at it, eyebrows up; a thought bubble with '?!' in Bangers; a callout 'KERING?' pointing at the kernel. Blue halftone shading on the background.",
     motion="The kid slides in and holds a strong pose (two drawings: the squint, then the eyebrows up); the thought bubble pops in with a bounce.",
     carries="The kernel in the kid's fingers.", transition="The camera zooms into the kernel: the next panel is its cutaway.",
     sound="A comic 'hmm?' stinger (a muted trumpet slide).", check="The question reads from the picture alone: someone puzzled by a dry kernel.",
     frames=[fr(0, "The kid slides in, kernel held up to one eye.", *panel(60, TOP, 1020, BOTTOM, C["blue"]), *kid(420, 760, 300), *fingers(760, 640, 150), *kernel(790, 620, 130), {"move": [-40, 900, 160, 900], "text": "masuk"}, caption("KOK BISA,", None)),
             fr(1, "Eyebrows up; thought bubble '?!'; callout 'KERING?'.", *panel(60, TOP, 1020, BOTTOM, C["blue"]), *kid(420, 760, 300), *fingers(760, 640, 150), *kernel(790, 620, 130), {"path": "M180 360 a110 80 0 1 1 220 0 a110 80 0 1 1 -220 0Z M330 470 a18 14 0 1 1 1 0Z M370 510 a10 8 0 1 1 1 0Z", "colour": C["ink"], "fill": "#ffffff", "width": 7}, sfx(290, 390, "?!", 110), callout(820, 880, "KERING?", 790, 700, 48), caption("PADAHAL BIJINYA", "KERING?"), {"cut": "zoom ke dalam biji"})])

shot("s03", "dalam", "diagram", "Ternyata, di dalamnya ada *air*: sekitar empat belas persen beratnya.",
     teaches=f"The surprise: a dry-looking kernel holds water, about {MOISTURE} % of its weight.",
     screen=f"A zoom panel (round-cornered inset bursting out of the last one): the kernel cut in half, huge (x 220 to 860, y 300 to 1240): the hull as a thin hard orange skin, the hard glassy starch inside it (yellow), the soft white starch in the middle, the germ (yellow teardrop) at the bottom, and blue drops of water in the soft starch. Callouts with pointers: 'KULIT', 'PATI', and in bold block letters 'AIR ±{MOISTURE}%' in blue.",
     motion="The zoom: the panel grows out of the kernel (three drawings), then the drops of water appear one by one, each with a tiny 'plip'.",
     carries="The cutaway kernel.", transition="Continuous: the soft starch and then the hull are outlined in turn.",
     sound="Three soft 'plip' drops.", check=f"The water sits in the starch, not in a cavity; the callout reads ±{MOISTURE}%.", facts=["p1", "p2"],
     frames=[fr(0, "The zoom panel grows out of the kernel.", *panel(60, TOP, 1020, BOTTOM), *cutaway(540, 800, 900, water=False), {"camera": "push"}, caption("TERNYATA,", None)),
             fr(0.5, "Blue drops of water appear in the soft starch.", *panel(60, TOP, 1020, BOTTOM), *cutaway(540, 800, 900), callout(860, 1180, "KULIT", 760, 1060, 44), caption("DI DALAMNYA", "ADA AIR")),
             fr(1, f"Callouts: 'KULIT', 'PATI', 'AIR ±{MOISTURE}%'.", *panel(60, TOP, 1020, BOTTOM), *cutaway(540, 800, 900), callout(860, 1180, "KULIT", 760, 1060, 44), callout(240, 420, "PATI", 380, 600, 44), callout(800, 380, f"AIR ±{MOISTURE}%", 600, 580, 52, C["blue"]), caption("EMPAT BELAS", "PERSEN")), ])

shot("s04", "dalam", "diagram", "Airnya tersimpan di pati yang lembut, dibungkus kulit keras yang rapat.",
     teaches="Where the water sits and what holds it in: soft starch inside, a hard tight hull outside.",
     screen="The same cutaway. First the soft starch gets a red outline and a callout 'PATI LEMBUT'; then the hull's outline thickens to a heavy red ink line all round and a callout 'KULIT KERAS & RAPAT' points at it. The rest stays as in s03.",
     motion="The red outlines are inked on (drawOn) one after the other; each callout pops in with a small bounce.",
     carries="The cutaway kernel with its hull marked.", transition="Slide: a new panel with a pan on the stove pushes in from the right.",
     sound="Two ink 'swish' strokes; a small knock as each callout lands.", check="The hull is marked all the way round; the water stays inside it.", facts=["p1", "p3"],
     frames=[fr(0, "The soft starch outlined red; 'PATI LEMBUT'.", *panel(60, TOP, 1020, BOTTOM), *cutaway(540, 800, 900, soft_mark=True), callout(260, 420, "PATI LEMBUT", 400, 620, 46, C["red"]), caption("AIRNYA TERSIMPAN", None)),
             fr(0.5, "The hull's outline thickens to heavy red ink, all round.", *panel(60, TOP, 1020, BOTTOM), *cutaway(540, 800, 900, soft_mark=True, hull_mark=True), callout(260, 420, "PATI LEMBUT", 400, 620, 46, C["red"]), {"move": [880, 700, 880, 1000], "text": "tinta"}, caption("DI PATI", "YANG LEMBUT")),
             fr(1, "Callout 'KULIT KERAS & RAPAT'.", *panel(60, TOP, 1020, BOTTOM), *cutaway(540, 800, 900, soft_mark=True, hull_mark=True), callout(260, 420, "PATI LEMBUT", 400, 620, 46, C["red"]), callout(720, 1210, "KULIT KERAS & RAPAT", 820, 1070, 44, C["red"]), caption("KULIT KERAS", "YANG RAPAT"), {"cut": "panel wajan masuk"})])

shot("s05", "uap", "wide", "Waktu dipanasin, air itu berubah jadi *uap*.",
     teaches="Heat turns the water inside into steam.",
     screen="Two panels. Top (y 236 to 744): a frying pan on a gas ring, oil and four kernels in it, flames under it, red heat squiggles rising, the sound word 'SSSS' in Bangers. Bottom (y 774 to 1290): a round zoom inset on the cutaway kernel: the blue drops turning into small white steam puffs with ink edges.",
     motion="The pan panel slides in from the right; the heat squiggles wave (two drawings); the zoom panel drops in under it and the drops change to puffs on the twelves.",
     carries="The steam inside the kernel.", transition="The pan panel slides up and away; the zoom panel grows to fill the page.",
     sound="A sizzle; small 'fff' puffs as the drops turn to steam.", check="Heat comes from below the pan; the steam stays inside the hull.", facts=["p3"],
     frames=[fr(0, "The pan on the flame slides in; heat squiggles.", *panel(*P1, C["red"]), *pan(480, 520, 560), heat(480, 440, 500), sfx(860, 380, "SSSS", 90), *panel(*P2), {"move": [1100, 500, 900, 500], "text": "masuk"}, caption("WAKTU", "DIPANASIN")),
             fr(0.5, "The zoom panel under it: the kernel's drops start to turn to steam.", *panel(*P1, C["red"]), *pan(480, 520, 560), heat(480, 440, 500), *panel(*P2), *cutaway(540, 1040, 440, steam=0.4), caption("AIR ITU", None)),
             fr(1, "All the drops are steam puffs now, still inside the hull.", *panel(*P1, C["red"]), *pan(480, 520, 560), heat(480, 440, 500), *panel(*P2), *cutaway(540, 1040, 440, steam=1), callout(860, 900, "UAP", 680, 1000, 52, C["red"]), caption("BERUBAH JADI", "UAP"), {"cut": "panel membesar"})])

shot("s06", "uap", "compare", "Uapnya ketahan kulit, jadi tekanannya naik terus, kayak panci presto.",
     teaches="The hull traps the steam, so the pressure inside keeps rising, like a pressure cooker.",
     screen="Two panels side by side (y 236 to 1290). Left: the cutaway kernel, steam puffs inside and red arrows pushing outward on every side of the hull; a callout 'TEKANAN NAIK'. Right: a pressure cooker (panci presto) on a flame, lid locked, the weight on top lifting with a puff of steam and the sound word 'PSST' in Bangers; a callout 'SAMA!'.",
     motion="The pressure arrows grow on each drawing (three steps); the hull bulges a little; the cooker's weight rattles on twos.",
     carries="The kernel under pressure.", transition="The right panel flips over to a thermometer.",
     sound="A rising hiss; the cooker's rattle.", check="The arrows push outward from inside; the cooker is a recognisable panci presto, not a plain pot.", facts=["p3", "p4"],
     frames=[fr(0, "The kernel full of steam; small arrows push on the hull.", *panel(60, TOP, 524, BOTTOM, C["blue"]), *cutaway(292, 760, 430, steam=0.3), *panel(556, TOP, 1020, BOTTOM), caption("UAPNYA", "KETAHAN KULIT")),
             fr(0.5, "The arrows grow: the pressure rises.", *panel(60, TOP, 524, BOTTOM, C["blue"]), *cutaway(292, 760, 430, steam=1), callout(292, 1150, "TEKANAN NAIK", 292, 1020, 44, C["red"]), *panel(556, TOP, 1020, BOTTOM), caption("TEKANANNYA", "NAIK TERUS")),
             fr(1, "Beside it the panci presto hisses: 'PSST', 'SAMA!'.", *panel(60, TOP, 524, BOTTOM, C["blue"]), *cutaway(292, 760, 430, steam=1), callout(292, 1150, "TEKANAN NAIK", 292, 1020, 44, C["red"]), *panel(556, TOP, 1020, BOTTOM), *presto(760, 860, 300), sfx(880, 520, "PSST", 80), callout(760, 1180, "SAMA!", 760, 1080, 52), caption("KAYAK", "PANCI PRESTO"), {"cut": "termometer"})])

shot("s07", "uap", "chart", "Di sekitar seratus delapan puluh derajat,",
     teaches=f"When it pops: at about {POP_C} degrees C.",
     screen=f"A tall panel: a big thermometer (scale 0 to {THERMO_MAX} °C, ticks every 50) beside the kernel on its hot pan; the red column computed to stand at {POP_C} °C; the number '±{POP_C} °C' in bold block letters in red at the column's top.",
     motion="The red column climbs to its value in three stepped drawings (no number counts up: the number appears only when the column arrives).",
     carries="The thermometer.", transition="A second panel slides in beside it: the gauge.",
     sound="A rising whistle that stops on the value.", check=f"The column stands at {POP_C} on the 0 to {THERMO_MAX} scale ({POP_C / THERMO_MAX:.0%} of its height).", facts=["p4"],
     frames=[fr(0, "The thermometer beside the kernel on the pan, the column low.", *panel(60, TOP, 1020, BOTTOM), *thermometer(300, 360, 1060, 60), *pan(700, 1080, 360, kernels=1), {"move": [300, 1000, 300, 700], "text": "naik"}, caption("DI SEKITAR", None)),
             fr(1, f"The column at {POP_C} °C; '±{POP_C} °C' in red.", *panel(60, TOP, 1020, BOTTOM), *thermometer(300, 360, 1060, POP_C), *pan(700, 1080, 360, kernels=1), label(700, 560, f"±{POP_C} °C", 120, colour=C["red"]), caption("SERATUS DELAPAN", "PULUH DERAJAT"), {"cut": "panel pengukur"})])

shot("s07b", "uap", "chart", "tekanannya kira-kira *sembilan kali* tekanan udara.",
     teaches=f"The pressure inside then: about {POP_KPA} kPa, {TIMES_AIR:.1f} times the air's.",
     screen=f"A panel with a big pressure gauge (0 to {GAUGE_MAX} times the air's pressure, a red zone at the top end), its red needle computed to {TIMES_AIR:.1f}; under it in bold block letters '≈ {round(TIMES_AIR)}× TEKANAN UDARA' and smaller '{POP_KPA} kPa · {round(POP_KPA / 6.895)} psi'. The kernel, small, in the top right corner with its hull straining (stress lines).",
     motion="The needle swings up in three stepped drawings and quivers in the red zone (two drawings); the numbers pop in when it stops.",
     carries="The straining kernel.", transition="The page breaks: the kernel bursts out of the panels.",
     sound="A creaking stretch; a tense drum roll.", check=f"The needle stands at {TIMES_AIR:.1f} of {GAUGE_MAX}; the text says ≈ {round(TIMES_AIR)}×.", facts=["p4", "p5"],
     frames=[fr(0, "The gauge, the needle low; the kernel in the top right corner.", *panel(60, TOP, 1020, BOTTOM, C["yellow"]), *gauge(540, 720, 330, 1), *kernel(910, 360, 110), caption("TEKANANNYA", None)),
             fr(0.5, "The needle swings up.", *panel(60, TOP, 1020, BOTTOM, C["yellow"]), *gauge(540, 720, 330, 6), *kernel(910, 360, 110), {"move": [300, 520, 600, 420], "text": "naik"}, caption("KIRA-KIRA", "SEMBILAN KALI")),
             fr(1, f"The needle quivers at {TIMES_AIR:.1f}; '≈ {round(TIMES_AIR)}× TEKANAN UDARA'.", *panel(60, TOP, 1020, BOTTOM, C["yellow"]), *gauge(540, 720, 330, TIMES_AIR), *kernel(910, 360, 110), {"path": "M830 300 l-24 -24 M990 300 l24 -24 M830 380 h-30 M990 380 h30", "colour": C["ink"], "width": 6},
                label(470, 1140, f"≈ {round(TIMES_AIR)}× TEKANAN UDARA", 62, colour=C["red"]), label(470, 1220, f"{POP_KPA} kPa · {round(POP_KPA / 6.895)} psi", 40), caption("TEKANAN", "UDARA"), {"cut": "pecah keluar panel"})])

shot("s08", "pop", "wide", "Kulitnya nggak kuat lagi, dan *POP!*",
     teaches="The hull gives way all at once.",
     screen="The splash: the camera breaks out of the panels; the whole page is one full-bleed splash panel (the ink border torn open at the top). The kernel in the middle, its hull split by jagged cracks, a huge yellow impact burst behind it, speed lines from the centre, and 'POP!' in giant red Bangers with an ink edge and a blue misregistered shadow.",
     motion="Two drawings of cracks spreading, then the burst slams in past its size and settles (back-out), 'POP!' scales in after it; a screen shake of 10 px for four frames.",
     carries="The burst kernel at the centre.", transition="Continuous: the steam jets out of the cracks.",
     sound="The pop: a sharp hit with a bass thump; the bed cuts for a beat.", check="This is the one splash in the film; 'POP!' is the biggest lettering in it.", facts=["p3", "p6"],
     frames=[fr(0, "Cracks spread across the hull; the panel border tears.", {"path": "M60 236H420L470 300L520 236H1020V1290H60Z", "colour": C["ink"], "width": 12}, *kernel(540, 760, 420, cracked=True), {"bolt": [600, 560, 720, 900], "seed": 8, "width": 8}, caption("KULITNYA", "NGGAK KUAT")),
             fr(0.5, "The burst slams in; speed lines; shake.", burst(540, 760, 300, 500, 18), speed(540, 760, 520, 640, 18), *kernel(540, 760, 380, cracked=True), sfx(540, 470, "POP!", 230), {"camera": "shake", "text": "LAYAR GETAR"}, caption("DAN", "POP!")),
             fr(1, "'POP!' settles, huge; the hull split open.", burst(540, 760, 300, 500, 18), speed(540, 760, 520, 640, 18), *kernel(540, 800, 340, cracked=True), sfx(540, 470, "POP!", 250), {"cut": "uap menyembur"}, caption("DAN", "POP!"))])

shot("s09", "pop", "wide", "Uapnya nyembur,",
     teaches="The steam rushes out through the split hull.",
     screen="A wide panel (y 236 to 1000) close on the split kernel: white steam jets blasting out of the cracks with speed lines, the hull flaps peeling back; the sound word 'FWOOSH' in Bangers. Under it a thin panel strip (y 1030 to 1290) with the hull flaps drawn as curling orange shards.",
     motion="The jets shoot out on three drawings, the flaps curl back; speed lines whip.",
     carries="The open hull and the escaping steam.", transition="Continuous: the foam swells out behind the steam.",
     sound="A steam 'fwoosh' whoosh.", check="The steam leaves through the cracks, not through the whole skin.", facts=["p6", "p7"],
     frames=[fr(0, "Steam jets out of the cracks.", *panel(60, TOP, 1020, 1000, C["blue"]), *kernel(540, 760, 360, cracked=True), *steam(500, 600, 0.8), *panel(60, 1030, 1020, BOTTOM), caption("UAPNYA", "NYEMBUR")),
             fr(1, "'FWOOSH'; the hull flaps curl back.", *panel(60, TOP, 1020, 1000, C["blue"]), *kernel(540, 780, 340, cracked=True), *steam(500, 620, 0.9), sfx(800, 400, "FWOOSH", 96), *panel(60, 1030, 1020, BOTTOM), {"path": "M200 1200 q40 -100 120 -60 M500 1220 q60 -120 140 -40 M780 1200 q40 -100 120 -50", "colour": C["ink"], "fill": HULL, "width": 8}, caption("UAPNYA", "NYEMBUR"), {"cut": "busa mengembang"})])

shot("s09b", "pop", "diagram", "pati yang lembek mengembang jadi *busa*,",
     teaches="The softened starch swells into a foam as the steam expands it.",
     screen="A zoom panel on the kernel's insides: the soft starch, softened by the hot steam, swelling out of the split hull as a white foam of bubbles (ink circles of many sizes), the hull pushed aside; callouts 'PATI LEMBEK' and 'BUSA'. Red halftone behind.",
     motion="The foam swells in three stepped drawings, bubbles popping into place one ring at a time.",
     carries="The swelling foam.", transition="The foam sets; the panel cools from red dots to blue.",
     sound="A bubbly 'blub-blub' rising.", check="The foam grows out of the starch, through the split hull.", facts=["p6"],
     frames=[fr(0, "The soft starch starts to swell out of the split.", *panel(60, TOP, 1020, BOTTOM, C["red"]), *kernel(540, 960, 360, cracked=True), {"path": "M440 820 a60 60 0 1 1 120 0 a50 50 0 1 1 100 10", "colour": C["ink"], "fill": "#ffffff", "width": 8}, callout(260, 520, "PATI LEMBEK", 460, 780, 46), caption("PATI YANG", "LEMBEK")),
             fr(0.5, "The foam swells: bubbles of every size.", *panel(60, TOP, 1020, BOTTOM, C["red"]), *flake(540, 700, 240, hull=False), *[{"ring": [540 + dx, 700 + dy, r]} for dx, dy, r in ((-120, -40, 40), (60, -100, 54), (120, 60, 34), (-40, 90, 46), (0, 0, 24))], {"move": [540, 640, 540, 400], "text": "mengembang"}, caption("MENGEMBANG", None)),
             fr(1, "The foam full-size; callout 'BUSA'.", *panel(60, TOP, 1020, BOTTOM, C["red"]), *flake(540, 760, 330), *[{"ring": [540 + dx, 760 + dy, r]} for dx, dy, r in ((-160, -60, 50), (80, -140, 64), (170, 70, 40), (-60, 120, 56), (10, 0, 30), (-200, 110, 30))], callout(860, 400, "BUSA", 700, 560, 56, C["red"]), caption("JADI", "BUSA"), {"cut": "busa mengeras"})])

shot("s10", "pop", "diagram", "terus mengeras jadi popcorn yang renyah.",
     teaches="The foam cools and sets hard: that is the crunchy popcorn.",
     screen="A panel turning from red halftone to blue (cooling): the finished popcorn flake, white puffy foam with ink edges, the leftover hull bits (orange) at its base; callouts 'BUSA PATI, MENGERAS' and 'SISA KULIT'; a tiny frost of blue lines for 'cooling'. A small inset (y 980 to 1270, right) of the kernel before, for comparison, marked 'bukan skala'.",
     motion="The halftone dots swap from red to blue across the panel in two steps; the flake stops jiggling and holds a hard pose; the callouts pop in.",
     carries="The popcorn flake.", transition="The panel splits down the middle into two.",
     sound="A crisp 'krenyes' crunch.", check="The flake has hull bits at its base, as real popcorn does.", facts=["p6", "p8"],
     frames=[fr(0, "The foam still soft, the dots red.", *panel(60, TOP, 1020, BOTTOM, C["red"]), *flake(480, 700, 320), caption("TERUS", "MENGERAS")),
             fr(0.5, "The dots turn blue: the foam cools and sets.", *panel(60, TOP, 1020, BOTTOM, C["blue"]), *flake(480, 700, 320), {"path": "M120 300 l30 30 M180 280 l20 40 M900 320 l-30 30", "colour": C["blue"], "width": 6}, callout(480, 1150, "BUSA PATI, MENGERAS", 480, 960, 46), caption("JADI", "POPCORN")),
             fr(1, "Callouts; the small kernel inset, 'bukan skala'.", *panel(60, TOP, 1020, BOTTOM, C["blue"]), *flake(480, 700, 320), callout(480, 1150, "BUSA PATI, MENGERAS", 480, 960, 46), callout(220, 400, "SISA KULIT", 360, 940, 42), *panel(820, 980, 1000, 1270), *kernel(910, 1110, 120), label(910, 1250, "bukan skala", 28), caption("YANG", "RENYAH"), {"cut": "panel terbelah dua"})])

shot("s11", "bunyi", "compare", "Bunyi pop-nya itu bukan kulit yang pecah,",
     teaches="The surprise about the sound: the 'pop' is not the hull cracking.",
     screen="Two panels side by side (y 236 to 1290). Left, now: the hull cracking open in close-up with the sound word 'KRAK?' over it, struck through with a thick red X. Right: still empty (white paper, a pencil frame).",
     motion="'KRAK?' pops in, then the red X is inked across it in two strokes.",
     carries="The two panels.", transition="Continuous: the right panel fills.",
     sound="A dry crack, then a buzzer 'nope' stinger.", check="The X crosses the crack's sound word, not the picture.", facts=["p7"],
     frames=[fr(0, "Left panel: the hull cracking, 'KRAK?'.", *panel(60, TOP, 524, BOTTOM, C["yellow"]), *kernel(292, 820, 320, cracked=True), sfx(292, 500, "KRAK?", 100, C["ink"]), *panel(556, TOP, 1020, BOTTOM), caption("BUNYI POP-NYA", None)),
             fr(1, "A red X struck across 'KRAK?'.", *panel(60, TOP, 524, BOTTOM, C["yellow"]), *kernel(292, 820, 320, cracked=True), sfx(292, 500, "KRAK?", 100, C["ink"]), {"path": "M140 380 L450 540 M450 380 L140 540", "colour": C["red"], "width": 22}, *panel(556, TOP, 1020, BOTTOM), caption("BUKAN KULIT", "YANG PECAH"), {"cut": "panel kanan terisi"})])

shot("s11b", "bunyi", "compare", "tapi *uap* yang nyembur keluar.",
     teaches="The 'pop' you hear is the steam escaping.",
     screen="The right panel fills: the steam jet blasting out of the split kernel with speed lines, and the sound word 'POP!' attached to the jet, with a green-free tick (a bold ink check mark in blue) and a callout 'UAP!'. The left panel stays with its red X.",
     motion="The jet shoots out (two drawings), 'POP!' rides out on it, the tick is inked on.",
     carries="The steam jet.", transition="Slide: a pan of finished popcorn pushes in from below.",
     sound="The steam's 'pop' again, clean; a 'ding' for the tick.", check="'POP!' sits on the steam jet, not on the hull.", facts=["p7"],
     frames=[fr(0, "The right panel: steam jets from the split kernel.", *panel(60, TOP, 524, BOTTOM, C["yellow"]), *kernel(292, 820, 320, cracked=True), sfx(292, 500, "KRAK?", 100, C["ink"]), {"path": "M140 380 L450 540 M450 380 L140 540", "colour": C["red"], "width": 22}, *panel(556, TOP, 1020, BOTTOM, C["blue"]), *kernel(788, 980, 280, cracked=True), *steam(770, 850, 0.8), caption("TAPI", "UAP")),
             fr(1, "'POP!' rides the jet; a blue tick; 'UAP!'.", *panel(60, TOP, 524, BOTTOM, C["yellow"]), *kernel(292, 820, 320, cracked=True), sfx(292, 500, "KRAK?", 100, C["ink"]), {"path": "M140 380 L450 540 M450 380 L140 540", "colour": C["red"], "width": 22}, *panel(556, TOP, 1020, BOTTOM, C["blue"]), *kernel(788, 980, 280, cracked=True), *steam(770, 850, 0.8), sfx(788, 400, "POP!", 120), {"path": "M620 1200 l40 40 l90 -110", "colour": C["blue"], "width": 18}, callout(880, 1200, "UAP!", 800, 700, 54), caption("YANG NYEMBUR", "KELUAR"), {"cut": "wajan masuk"})])

shot("s12", "bunyi", "diagram", "Makanya biji yang kulitnya retak",
     teaches="Sets up the consequence: some kernels have a cracked hull.",
     screen="A panel of the pan full of popped flakes; among them one kernel still whole and hard, with a hairline crack across its hull; a callout 'RETAK' pointing at the crack. Red halftone.",
     motion="The flakes around it jiggle on twos; the cracked kernel holds still; the callout pops in.",
     carries="The cracked kernel.", transition="The panel splits into two side by side.",
     sound="A short 'hmm' trumpet slide.", check="The crack is visible on the hull, drawn as a jagged ink line.", facts=["p8"],
     frames=[fr(0, "The pan of flakes; one kernel still whole among them.", *panel(60, TOP, 1020, BOTTOM, C["red"]), *flake(240, 700, 130), *flake(820, 760, 130), *flake(520, 1080, 120), *kernel(520, 720, 240), caption("MAKANYA BIJI", None)),
             fr(1, "Its hull has a crack; callout 'RETAK'.", *panel(60, TOP, 1020, BOTTOM, C["red"]), *flake(240, 700, 130), *flake(820, 760, 130), *flake(520, 1080, 120), *kernel(520, 720, 240, cracked=True), *callout(520, 440, "RETAK", 500, 600, 54), caption("YANG KULITNYA", "RETAK"), {"cut": "dua panel"})])

shot("s12b", "bunyi", "compare", "nggak meletus: uapnya bocor duluan.",
     teaches="Shown twice, changed once: a sealed hull builds pressure and pops; a cracked one leaks its steam and never does.",
     screen="Two panels side by side (y 236 to 1290). Left, 'UTUH': a whole kernel full of steam, its gauge needle high in the red zone, a small 'POP!' burst. Right, 'RETAK': the cracked kernel with thin steam wisps leaking out of the crack, the sound word 'fsss...' small and droopy, its gauge needle low; under the gauges 'MELETUS' and, in red, 'NGGAK MELETUS'. The two gauges are the same size and scale as s07b's.",
     motion="Both needles rise together; at the crack the wisps leak on twos and the right needle sinks back; the left one reaches the red and its burst pops.",
     carries="The cracked kernel.", transition="The page turns: the summary page.",
     sound="A thin deflating hiss under a short sad trombone 'wah-wah'; the left panel's small pop.", check="Only the hull differs between the panels; the right needle stays out of the red zone.", facts=["p5", "p8"],
     frames=[fr(0, "Both kernels heat; both needles start to rise.", *panel(60, TOP, 524, BOTTOM, C["yellow"]), *panel(556, TOP, 1020, BOTTOM, C["blue"]), label(292, 330, "UTUH", 60), label(788, 330, "RETAK", 60, colour=C["red"]), *kernel(292, 640, 220), *kernel(788, 640, 220, cracked=True), *gauge(292, 1030, 150, 4), *gauge(788, 1030, 150, 4), caption("NGGAK MELETUS", None)),
             fr(0.5, "The right kernel leaks through its crack; its needle sinks.", *panel(60, TOP, 524, BOTTOM, C["yellow"]), *panel(556, TOP, 1020, BOTTOM, C["blue"]), label(292, 330, "UTUH", 60), label(788, 330, "RETAK", 60, colour=C["red"]), *kernel(292, 640, 220), *kernel(788, 640, 220, cracked=True), {"path": "M770 520 c-20 -40 20 -60 0 -100 M800 520 c20 -40 -20 -60 0 -100", "colour": C["ink"], "width": 5}, label(900, 470, "fsss...", 50), *gauge(292, 1030, 150, 7.5), *gauge(788, 1030, 150, 2), caption("UAPNYA", "BOCOR")),
             fr(1, "Left: the needle in the red, POP. Right: needle low, 'NGGAK MELETUS'.", *panel(60, TOP, 524, BOTTOM, C["yellow"]), *panel(556, TOP, 1020, BOTTOM, C["blue"]), label(292, 330, "UTUH", 60), label(788, 330, "RETAK", 60, colour=C["red"]), burst(292, 640, 110, 190), *flake(292, 650, 100), sfx(292, 470, "POP!", 90), *kernel(788, 640, 220, cracked=True), {"path": "M770 520 c-20 -40 20 -60 0 -100 M800 520 c20 -40 -20 -60 0 -100", "colour": C["ink"], "width": 5}, label(900, 470, "fsss...", 50), *gauge(292, 1030, 150, TIMES_AIR), *gauge(788, 1030, 150, 2), label(292, 1256, "MELETUS", 44), label(788, 1256, "NGGAK MELETUS", 44, colour=C["red"]), caption("BOCOR", "DULUAN"), {"cut": "halaman rangkuman"})])

shot("s13", "recap", "recap", "Jadi rahasianya cuma *air* yang kejebak di kulit keras.",
     teaches="The answer in one page: water, trapped by a hard hull, turns to steam and bursts it.",
     screen="A summary page of three panels in a row across the top half and one wide below: 1 the cutaway with blue drops, 'AIR'; 2 the steam pushing on the hull with the gauge, 'UAP + TEKANAN'; 3 the burst and the flake, 'POP!'. Below, a wide yellow caption panel with the line in bold block letters: 'AIR + KULIT KERAS = POP!'.",
     motion="The three panels slide in one after another on the voice's phrases; the wide one stamps in last.",
     carries="The 'POP!' panel.", transition="The page turns back to the first page.",
     sound="Three page-flick whooshes; a stinger on the stamp.", check="Readable with the sound off: water, steam and pressure, pop.", facts=["p1", "p3", "p4", "p6"],
     frames=[fr(0, "Panel 1 slides in: the kernel's water.", *panel(60, TOP, 364, 760, C["blue"]), *cutaway(212, 520, 300), label(212, 730, "AIR", 52, colour=C["blue"]), caption("JADI RAHASIANYA", None)),
             fr(0.5, "Panels 2 and 3: steam and pressure, then the pop.", *panel(60, TOP, 364, 760, C["blue"]), *cutaway(212, 520, 300), label(212, 730, "AIR", 52, colour=C["blue"]), *panel(388, TOP, 692, 760, C["yellow"]), *cutaway(540, 470, 240, steam=1), *gauge(540, 640, 70, TIMES_AIR), label(540, 736, "UAP + TEKANAN", 38),
                *panel(716, TOP, 1020, 760, C["red"]), burst(868, 480, 80, 140), *flake(868, 490, 70), sfx(868, 700, "POP!", 70), caption("CUMA", "AIR")),
             fr(1, "The wide panel stamps in: 'AIR + KULIT KERAS = POP!'.", *panel(60, TOP, 364, 760, C["blue"]), *cutaway(212, 520, 300), label(212, 730, "AIR", 52, colour=C["blue"]), *panel(388, TOP, 692, 760, C["yellow"]), *cutaway(540, 470, 240, steam=1), *gauge(540, 640, 70, TIMES_AIR), label(540, 736, "UAP + TEKANAN", 38),
                *panel(716, TOP, 1020, 760, C["red"]), burst(868, 480, 80, 140), *flake(868, 490, 70), sfx(868, 700, "POP!", 70), {"path": f"M60 790H1020V{BOTTOM}H60Z", "colour": C["ink"], "fill": C["yellow"], "width": 12}, label(540, 1000, "AIR + KULIT KERAS", 84), sfx(540, 1170, "= POP!", 130), caption("YANG KEJEBAK", "KULIT KERAS"), {"cut": "kembali ke halaman 1"})])

shot("s14", "recap", "wide", "Dan gara-gara air itulah,",
     teaches="The bridge back into the first line.",
     screen="The page turns back to the opening: the kernel between finger and thumb above, the same kernel bursting into a flake with 'POP!' below, the same drawing as frame 0.",
     motion="A page-turn wipe (the summary page lifts away from the right edge); the opening page is under it, the burst a drawing before frame 0's.",
     carries="Into s01.", transition="No cut: the film loops straight into s01.",
     sound="The bed runs on into the opening; a page-turn whoosh.", check="The last frame matches frame 0 (check.mjs SSIM).", facts=["p1"],
     frames=[fr(0, "The summary page lifts away from the right edge.", opening(), {"path": "M1020 236 Q700 600 1020 1290", "colour": C["ink"], "width": 10}, {"move": [1000, 760, 600, 760], "text": "halaman dibalik"}, caption("DAN GARA-GARA", "AIR ITULAH")),
             fr(1, "The opening page, a moment before frame 0.", opening(), caption("DAN GARA-GARA", "AIR ITULAH"), {"cut": "loop ke s01"})])

duration = round(shots[-1]["end"], 3)

storyboard = {
    "title": "Kenapa popcorn bisa meletus?",
    "question": "Kenapa biji jagung yang keras dan kelihatan kering bisa meletus jadi popcorn?",
    "audience": "Orang Indonesia yang nonton video pendek, dari anak sekolah sampai orang dewasa yang suka ngemil popcorn di bioskop atau bikin sendiri pakai wajan. Mereka tahu popcorn meletus kalau dipanasin, tapi nggak tahu apa yang bikin bijinya meledak.",
    "promise": f"Di dalam biji popcorn ada sedikit air (sekitar {MOISTURE}% beratnya). Waktu dipanasin, airnya jadi uap yang ketahan kulit yang keras dan rapat, sampai di sekitar {POP_C} °C tekanannya kira-kira {round(TIMES_AIR)} kali tekanan udara; kulitnya jebol, uapnya nyembur (itulah bunyi 'pop'-nya), dan pati yang lembek mengembang jadi busa yang mengeras.",
    "template": "comic",
    "language": "id",
    "format": "1080x1920",
    "captions": "pop",
    "duration": duration,
    "fps": 60,
    "standard": 3,
    "loop": {"line": "Dan gara-gara air itulah, / biji jagung sekeras ini bisa meledak jadi popcorn.", "picture": "The summary page turns away to show the opening page under it: the kernel between finger and thumb above, the kernel bursting into a flake with 'POP!' below, the same drawing as frame 0."},
    "voice": {"voice_id": "xlBOShi2835jfBgaEld4", "name": "Rafiq", "model": "eleven_v4", "language": "id", "direction": "[warmly]"},
    "look": {
        "accent": C["red"],
        "mood": "The Comic template: comic book pages on warm white paper (#fffdf6) with a paper texture and a slight misregistration of the colours, like print. Panels with thick black ink borders, two or three to a screen in the space above the caption box (y 236 to 1290), and one full-bleed splash for the pop (s08), where the camera breaks out of the panels. Confident ink lines of varying weight, heavier on the outside of shapes; flat colour (red #ff3b30, yellow #ffcc00, blue #007aff) with hard cel shadows and halftone dots for the mid-tones, never a gradient. The kernel's hull is yellow overprinted with red halftone (it reads as orange, with no sixth colour). Red is the accent: heat, pressure and 'POP!'; blue is water and, later, cooling. Narration in the template's yellow caption box under the panels (pop captions, the key word red); sound words in Bangers (POP!, SSSS, PSST, FWOOSH, KRAK); callouts in small boxes with pointers; numbers in bold block letters at their real values. Limited animation held on twelves: panels slide in, strong poses, speed lines and impact bursts.",
    },
    "music": {
        "track": "Composed for this film (ElevenLabs Music, music/bed.mp3)",
        "bpm": 112,
        "note": "A punchy bed composed for the film, as the template's Sound line asks: tight funk drums, slap bass, a brass stab on the hits and a muted trumpet for the comic beats. It sits low under the cutaway (s03 to s06), builds with a drum roll and a rising whistle under the thermometer and the gauge (s07, s07b), cuts out for one beat on the pop (s08) and comes back on the steam, then lifts for the summary. Effects per shot: the pop on frame 0 and in s08 (a sharp hit with a bass thump), a 'hmm?' trumpet slide (s02), water 'plips' (s03), ink swishes and callout knocks (s04), a sizzle and puffs (s05), a rising hiss and the cooker's rattle (s06), the whistle and a creak (s07, s07b), a 'fwoosh' (s09), a bubbly 'blub' (s09b), a crunch (s10), a crack and a buzzer (s11), the clean pop and a 'ding' (s11b), a deflating hiss and a short sad trombone (s12), page-flick whooshes and a stinger (s13), a page turn (s14). The cuts follow the take.",
    },
    "facts": [
        {"id": "p1", "claim": f"A popcorn kernel has three parts: the hull (pericarp), the starchy endosperm and the germ. It holds a small amount of water in its starch: the ideal moisture is about 13.5 to 14 % of the kernel's weight. The film says 'sekitar empat belas persen beratnya' and writes 'AIR ±{MOISTURE}%'. Simplification: the water is spread through the starch as moisture; the film draws it as a few blue drops.",
         "source": "The Popcorn Board, 'What Makes Popcorn Pop?' (popcorn.org/All-About-Popcorn/What-Makes-Popcorn-Pop): germ, endosperm, pericarp; 'a small drop of water stored inside a circle of soft starch'; 13.5-14 % moisture. Iowa State University, The Maize Page (popcorn FAQ, mirrored by the University of Hamburg): 'The optimum moisture is 14%'. Purdue University College of Agriculture, 'What's under the shell of this popular snack?' (2020, B. Hamaker): moisture about 13 to 14.5 %."},
        {"id": "p2", "claim": "The kernel looks dry and is hard, yet it contains that water (p1): the surprise the film opens on.",
         "source": "As p1; USDA National Agricultural Library, exhibit 'Popcorn: How does popcorn pop?' (nal.usda.gov/exhibits/speccoll/exhibits/show/popcorn): each kernel holds water in soft starch inside a hard outer surface."},
        {"id": "p3", "claim": "When the kernel is heated, its water turns to steam; the hard hull holds it in and acts as a pressure vessel, so the pressure inside rises until the hull gives way. The hull of good popping kernels is a strong, highly ordered cellulose layer that keeps the moisture in; press coverage of that work likens it to a pressure cooker (the film's 'kayak panci presto').",
         "source": "Hoseney, Zeleznak & Abdelrahman, 'Mechanism of popcorn popping', Journal of Cereal Science 1 (1983) 43-52, doi 10.1016/S0733-5210(83)80007-1 (the pericarp acts as a pressure vessel); Tandjung, Janaswamy, Chandrasekaran & Hamaker, Biomacromolecules (2005), reported by the American Chemical Society release of 15 April 2005 (EurekAlert, ScienceDaily: 'the corn pericarp acts like a pressure cooker'); USDA NAL exhibit (as p2)."},
        {"id": "p4", "claim": f"Nearly all kernels pop at a critical temperature of about {POP_C} °C, whatever their size. Hoseney et al. measured popping at about 177 °C. The film says 'sekitar seratus delapan puluh derajat' and the thermometer (0 to {THERMO_MAX} °C) stands at {POP_C}, {POP_C / THERMO_MAX:.0%} of its scale.",
         "source": "Virot & Ponomarenko, 'Popcorn: critical temperature, jump and sound', Journal of the Royal Society Interface 12 (2015) 20141247, doi 10.1098/rsif.2014.1247 (abstract; PMC4345489); Hoseney et al. 1983 (as p3)."},
        {"id": "p5", "claim": f"At popping the pressure inside the kernel is about 135 psi, that is {POP_KPA} kPa (the vapour pressure of water at about 177 °C). One standard atmosphere is {ATM_KPA} kPa, so {POP_KPA} / {ATM_KPA} = {TIMES_AIR:.2f}: the film says 'kira-kira sembilan kali tekanan udara' and writes '≈ {round(TIMES_AIR)}× TEKANAN UDARA' and '{POP_KPA} kPa · 135 psi'; the gauge's needle stands at {TIMES_AIR:.1f} of {GAUGE_MAX}. In s12 the cracked kernel's needle is drawn low (2 of 10): an illustration, not a measurement.",
         "source": f"Hoseney et al. 1983 (as p3), as quoted by Wu & Schwartzberg, 'Popping behavior and zein coating of popcorn', Cereal Chemistry 69 (1992) 567-573 (cerealsgrains.org): 'popping occurred at about 177 °C, which for pure water is equivalent to a pressure of 931 kPa (135 psia) inside the kernel'. One standard atmosphere = 101.325 kPa (NIST, SP 811, Guide for the Use of the SI)."},
        {"id": "p6", "claim": "When the hull bursts, the steam escapes and the pressure drop lets the starch, softened by the hot steam, expand into a foam that sets as it cools: the white flake, with bits of hull left at its base. The expansion happens in a flash (fracture to flake in under about 90 ms). Simplification: the film shows the softening, the swelling and the setting as three drawings.",
         "source": "Hoseney et al. 1983 (as p3: the superheated water drives the expansion); USDA NAL exhibit (as p2: the starch inflates and turns the kernel inside out); Virot & Ponomarenko 2015 (as p4), reported by AFP/phys.org (Feb 2015): fracture to flake in less than 90 ms. The softening ('gelatinous') and setting of the starch are as described in EBSCO Research Starters, 'Popcorn': a secondary source, not checked against a primary paper."},
        {"id": "p7", "claim": "The 'pop' you hear is not the hull cracking: by synchronising high-speed video with sound recordings, Virot & Ponomarenko attribute the sound to the release of the water vapour from the kernel.",
         "source": "Virot & Ponomarenko 2015 (as p4), abstract: 'By synchronizing video and acoustic recordings, the familiar pop is attributed to the release of water vapour'; Royal Society blog, 'The science of popcorn' (Feb 2015)."},
        {"id": "p8", "claim": "Kernels whose hull is cut, cracked or weak lose their moisture as steam during heating instead of building pressure, so they do not pop (the unpopped kernels at the bottom of the bag).",
         "source": "American Chemical Society release on Tandjung et al. 2005 (as p3) and Purdue University College of Agriculture (as p1): kernels with cuts or weak spots in the pericarp let the moisture leave on heating and fail to pop."},
    ],
    "acts": [
        {"id": "hook", "title": "Pertanyaan", "goal": "The hard dry kernel and its pop: how?", "rail": False},
        {"id": "dalam", "title": "Di dalam biji", "goal": "The hidden water, the soft starch and the hard tight hull.", "rail": False},
        {"id": "uap", "title": "Uap dan tekanan", "goal": "Heat makes steam, the hull traps it, the pressure climbs: about 180 °C and nine times the air's.", "rail": False},
        {"id": "pop", "title": "POP!", "goal": "The hull bursts, the steam rushes out, the starch foams and sets.", "rail": False},
        {"id": "bunyi", "title": "Bunyi dan biji gagal", "goal": "The sound is the steam; a cracked hull leaks and never pops.", "rail": False},
        {"id": "recap", "title": "Jawaban", "goal": "Water plus a hard hull equals pop; then the bridge into the first line.", "rail": False},
    ],
    "shots": shots,
}

out = HERE / "storyboard.json"
out.write_text(json.dumps(storyboard, ensure_ascii=False, indent=2) + "\n")
import re
words = sum(len(re.sub(r"\[[^]]*\]", "", s["voice"]).replace("*", "").split()) for s in shots if s.get("voice"))
print(f"{len(shots)} shots, {sum(len(s['frames']) for s in shots)} frames, {words} words, about {duration:.1f} s before the take -> {out}")
manifest = HERE / "voice" / "voice.json"
if manifest.exists() and json.loads(manifest.read_text()).get("version") == 2:
    kit = next(p for p in HERE.parents if (p / "kit" / "audio" / "voice.mjs").exists())
    subprocess.run(["node", str(kit / "kit" / "audio" / "voice.mjs"), str(HERE), "--retime"], check=False, stdout=subprocess.DEVNULL)
