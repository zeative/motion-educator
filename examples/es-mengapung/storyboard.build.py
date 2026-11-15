"""Writes storyboard.json for "Kenapa es malah ngapung di air?" (portrait, 1080 x 1920).

The film has no narration: the script is shown as pop captions, a few large words at a time. Every shot is as long
as its caption takes to read (at least 0.5 s + characters / 15), rounded up to half beats of the music (86 BPM, a
half beat is 0.349 s), so every cut sits on the grid:

    python3 examples/es-mengapung/storyboard.build.py && node kit/tools/storyboard.mjs examples/es-mengapung --png

Everything drawn to stand for a number is computed here and again, from the same constants, in film.js:
- the cube floats with RHO_ICE / RHO_WATER = 0,9167 / 0,9998 = 0,917 of its height under the waterline;
- the box of ice is 1,0907 times as tall as the box of the same molecules as liquid (same width and depth), because
  0,9998 / 0,9167 = 1,0907: the same mass takes about 9 % more room;
- the density bars are 600 px for 1 g/cm3.
What must be read sits between x 64 and 930 and between y 230 and 1180; the captions pop in under that.
"""
import json
import math
from pathlib import Path

HERE = Path(__file__).parent
RHO_ICE = 0.9167  # g/cm3, ice Ih at 0 C
RHO_WATER = 0.9998  # g/cm3, liquid water at 0 C
UNDER = RHO_ICE / RHO_WATER  # 0.9169: the fraction of a floating block under the waterline (fresh water)
GROW = RHO_WATER / RHO_ICE  # 1.0907: the room the same molecules take as ice, against liquid

ICE = "#7fe6ff"  # the accent: ice cyan
WATER = "#3f8cff"  # liquid water
WAX = "#e8891a"  # the wax in the comparison
shots = []


HALF = 60 / 86 / 2  # half a beat of the music


def shot(id, act, type, halves=None, **fields):
    """A shot with a caption is as long as the caption takes to read, in whole half beats; a shot without one is
    given its length in half beats."""
    start = shots[-1]["end"] if shots else 0
    text = fields.get("caption", "").replace("*", "")
    need = math.ceil((0.5 + len(text) / 15) / HALF - 1e-9) if text else 0
    n = max(need, halves or 0)
    shots.append({"id": id, "act": act, "type": type, "start": round(start, 3), "end": round(start + n * HALF, 3), **fields, "frames": FRAMES[id]})


def fr(at, note, *draw):
    return {"at": at, "note": note, "draw": list(draw)}


def label(x, y, text, size=46, **more):
    return {"label": [x, y], "text": text, "size": size, **more}


# ── The things in the film ───────────────────────────────────────────────────────────────────────────────────
def glass(x0, x1, top, bottom, level, liquid=WATER):
    """A glass in cross-section: its walls, the liquid filling it up to level, and the surface line."""
    r = 40
    walls = f"M{x0} {top} L{x0} {bottom - r} Q{x0} {bottom} {x0 + r} {bottom} L{x1 - r} {bottom} Q{x1} {bottom} {x1} {bottom - r} L{x1} {top}"
    fill = f"M{x0 + 8} {level} L{x0 + 8} {bottom - r} Q{x0 + 8} {bottom - 8} {x0 + r} {bottom - 8} L{x1 - r} {bottom - 8} Q{x1 - 8} {bottom - 8} {x1 - 8} {bottom - r} L{x1 - 8} {level} Z"
    return [{"path": fill, "colour": liquid, "fill": liquid, "width": 3}, {"path": walls, "colour": "ink", "width": 9}, {"line": [x0 + 8, level, x1 - 8, level], "colour": liquid, "width": 7}]


def cube(cx, top, s, colour=ICE):
    """A cube seen a little from above: its front face and a thin top face."""
    x0, x1, d = cx - s / 2, cx + s / 2, s * 0.16
    front = f"M{x0} {top} L{x1} {top} L{x1} {top + s} L{x0} {top + s} Z"
    lid = f"M{x0} {top} L{x0 + d} {top - d * 0.6} L{x1 + d} {top - d * 0.6} L{x1} {top} M{x1} {top + s} L{x1 + d} {top + s - d * 0.6} L{x1 + d} {top - d * 0.6}"
    return [{"path": front, "colour": colour, "fill": colour, "width": 7}, {"path": lid, "colour": colour, "width": 5}]


def floating(level, s):
    """The top of a floating cube: UNDER of its height is under the waterline."""
    return round(level - (1 - UNDER) * s, 1)


def hexring(cx, cy, r, colour=ICE, width=6, dashed=False):
    import math
    pts = [(cx + r * math.cos(math.pi / 6 + k * math.pi / 3), cy + r * math.sin(math.pi / 6 + k * math.pi / 3)) for k in range(6)]
    d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + " Z"
    return {"path": d, "colour": colour, "width": width, **({"dashed": True} if dashed else {})}


def honeycomb(x0, y0, x1, y1, r):
    """The lattice seen down its hexagonal axis: rings of molecules around open channels."""
    import math
    out = []
    w = math.sqrt(3) * r
    row = 0
    y = y0 + r
    while y < y1 - r * 0.5:
        x = x0 + w / 2 + (w / 2 if row % 2 else 0)
        while x < x1 - w * 0.4:
            out.append(hexring(round(x, 1), round(y, 1), r, colour="ink", width=4))
            x += w
        y += 1.5 * r
        row += 1
    return out


# Hero glass (s01, s03, s11): walls at x 232 and 762, water up to y 540, a 250 px cube at x 497.
G = dict(x0=232, x1=762, top=300, bottom=1150, level=540)
S = 250
FLOAT_TOP = floating(G["level"], S)  # 519.2: 20.8 px of the cube above water, 229.2 px under
HERO = glass(**G)
# The two glasses (s02).
WAXG = dict(x0=84, x1=444, top=420, bottom=1120, level=560)
ICEG = dict(x0=550, x1=910, top=420, bottom=1120, level=560)
S2 = 170
# The boxes of molecules (s04 to s07): 240 molecules. Ice box 560 x 808 px; the same molecules as liquid fill 808 / 1.0907 of it.
BX0, BX1, BBOT = 217, 777, 1150
H_ICE = 808  # 5 rectangular cells of the lattice, 5 x sqrt(3) x a, with a = 560 / 6 = 93.3 px
H_LIQ = round(H_ICE / GROW, 1)  # 696.8
# Side by side (s07, s08): the same boxes at 0.75, two columns 420 px wide, ice 606 px tall.
C_ICE = 606
C_LIQ = round(C_ICE / GROW, 1)  # 555.6
# The bars (s08): 600 px for 1 g/cm3.
PX_G = 600
# The close-up (s10): water at y 640, a 400 px cube at x 430.
WL = 640
S9 = 400
TOP9 = floating(WL, S9)  # 600.2

FRAMES = {
    "s01": [
        fr(0.0, "Frame 0 is finished: the glass fills the frame, the cube has just been let go near the bottom and is rising, a trail of bubbles; the first line of the question in metal type on the floor.",
           *HERO, *cube(497, 860, S), {"dot": [450, 820, 10], "colour": WATER}, {"dot": [540, 780, 7], "colour": WATER}, {"glow": [497, 700, 380], "colour": ICE},
           {"title": [497, 1290], "text": "Kenapa es", "size": 96}, {"move": [497, 840, 497, 600], "text": "naik"}, {"camera": "push"}),
        fr(0.45, "The cube breaks the surface and overshoots, the water rings, the second line of the question lands.",
           *HERO, *cube(497, 470, S), {"ring": [497, 540, 260], "colour": WATER, "dashed": True},
           {"title": [497, 1290], "text": "Kenapa es\nmalah ngapung", "size": 96, "accent": "ngapung"}, {"move": [700, 460, 700, 520], "text": "terombang-ambing"}),
        fr(1.0, "It settles where the physics puts it: 0,917 of the cube under the waterline, a sliver above. The whole question is up.",
           *HERO, *cube(497, FLOAT_TOP, S), {"glow": [497, 600, 320], "colour": ICE},
           {"title": [497, 1290], "text": "Kenapa es\nmalah ngapung\ndi air?", "size": 96, "accent": "ngapung"}, {"camera": "pull"}, {"cut": "kaca membelah jadi dua"}),
    ],
    "s02": [
        fr(0.0, "Two glasses side by side. Left: molten wax, amber; a pale block of the same wax let go at the surface. Right: the floating ice from s01, smaller.",
           *glass(**WAXG, liquid=WAX), *cube(264, 480, S2, colour=WAX), *glass(**ICEG), *cube(730, floating(560, S2), S2),
           {"chip": [104, 300], "text": "lilin"}, {"chip": [600, 300], "text": "es"}, {"camera": "pull"}),
        fr(0.55, "On 'tenggelam' the wax block is half way down and still sinking; the ice stays up.",
           *glass(**WAXG, liquid=WAX), *cube(264, 760, S2, colour=WAX), *glass(**ICEG), *cube(730, floating(560, S2), S2),
           {"chip": [104, 300], "text": "lilin"}, {"chip": [600, 300], "text": "es"}, {"move": [264, 640, 264, 920], "text": "tenggelam"}),
        fr(1.0, "The wax rests on the bottom with 'padat → tenggelam' on it; the ice, 'padat → ngapung', is the odd one out.",
           *glass(**WAXG, liquid=WAX), *cube(264, 942, S2, colour=WAX), *glass(**ICEG), *cube(730, floating(560, S2), S2),
           {"chip": [104, 300], "text": "lilin"}, {"chip": [600, 300], "text": "es"}, label(264, 1060, "tenggelam", 40), label(730, 820, "ngapung", 40, colour=ICE), {"cut": "kembali ke satu gelas"}),
    ],
    "s03": [
        fr(0.0, "The cut is a dive: a lens opens over the water beside the floating cube and grows over the whole frame; inside it the water is already molecules.",
           *HERO, *cube(497, FLOAT_TOP, S), {"ring": [540, 900, 260], "colour": WATER}, {"molecules": [330, 680, 420, 420, 14], "seed": 4}, {"move": [560, 960, 540, 760], "text": "masuk ke air"}, {"camera": "push"}),
        fr(0.3, "Inside the water: a glass box of molecules, each an oxygen with two hydrogens, packed close in no order. A chip 'air · cair'.",
           {"path": f"M{BX0} {BBOT - H_LIQ} L{BX0} {BBOT} L{BX1} {BBOT} L{BX1} {BBOT - H_LIQ}", "colour": "ink", "width": 6},
           {"molecules": [BX0 + 20, BBOT - H_LIQ + 20, BX1 - BX0 - 60, H_LIQ - 60, 40], "seed": 7}, {"chip": [BX0, 270], "text": "air · cair"}),
        fr(0.65, "They jostle and tumble all the time: short trails show where each was a moment ago.",
           {"path": f"M{BX0} {BBOT - H_LIQ} L{BX0} {BBOT} L{BX1} {BBOT} L{BX1} {BBOT - H_LIQ}", "colour": "ink", "width": 6},
           {"molecules": [BX0 + 20, BBOT - H_LIQ + 20, BX1 - BX0 - 60, H_LIQ - 60, 40], "seed": 8}, {"chip": [BX0, 270], "text": "air · cair"},
           {"move": [300, 700, 380, 640]}, {"move": [640, 900, 560, 980]}, {"move": [500, 560, 600, 600]}),
        fr(1.0, "still moving as the line ends; the light cools from blue toward ice cyan.",
           {"path": f"M{BX0} {BBOT - H_LIQ} L{BX0} {BBOT} L{BX1} {BBOT} L{BX1} {BBOT - H_LIQ}", "colour": "ink", "width": 6},
           {"molecules": [BX0 + 20, BBOT - H_LIQ + 20, BX1 - BX0 - 60, H_LIQ - 60, 40], "seed": 9}, {"chip": [BX0, 270], "text": "air · cair"}, {"glow": [500, 780, 300], "colour": ICE}, {"cut": "tanpa potongan"}),
    ],
    "s04": [
        fr(0.0, "'Tapi pas membeku': the light turns ice cyan, the molecules slow and start to slide to their places.",
           {"path": f"M{BX0} {BBOT - H_LIQ} L{BX0} {BBOT} L{BX1} {BBOT} L{BX1} {BBOT - H_LIQ}", "colour": "ink", "width": 6},
           {"molecules": [BX0 + 20, BBOT - H_LIQ + 20, BX1 - BX0 - 60, H_LIQ - 60, 40], "seed": 9}, {"chip": [BX0, 270], "text": "membeku · 0 °C"}, {"glow": [500, 780, 360], "colour": ICE}),
        fr(0.5, "They snap into a lattice. One molecule in the middle is ringed; on 'empat tetangga' its four bonds light up, one after another, to four neighbours.",
           {"path": f"M{BX0} {BBOT - H_ICE} L{BX0} {BBOT} L{BX1} {BBOT} L{BX1} {BBOT - H_ICE}", "colour": ICE, "width": 6},
           *honeycomb(BX0 + 10, BBOT - H_ICE + 10, BX1 - 10, BBOT - 10, 54), {"ring": [500, 770, 52], "colour": ICE},
           {"line": [500, 770, 500, 704], "colour": ICE, "width": 9}, {"line": [500, 770, 443, 803], "colour": ICE, "width": 9}, {"line": [500, 770, 557, 803], "colour": ICE, "width": 9}, {"line": [500, 770, 518, 742], "colour": ICE, "width": 9}),
        fr(1.0, "The chip '4 tetangga' sits by the ringed molecule; the box has grown to the lattice's height.",
           {"path": f"M{BX0} {BBOT - H_ICE} L{BX0} {BBOT} L{BX1} {BBOT} L{BX1} {BBOT - H_ICE}", "colour": ICE, "width": 6},
           *honeycomb(BX0 + 10, BBOT - H_ICE + 10, BX1 - 10, BBOT - 10, 54), {"ring": [500, 770, 52], "colour": ICE}, {"chip": [580, 600], "text": "4 tetangga"}, {"cut": "kamera berputar"}),
    ],
    "s05": [
        fr(0.0, "The camera turns to look straight down the lattice's six-fold axis: the molecules line up into rings.",
           *honeycomb(BX0 + 10, BBOT - H_ICE + 10, BX1 - 10, BBOT - 10, 54), {"camera": "orbit", "text": "lihat dari atas kisi"}),
        fr(0.5, "On 'segi enam' one ring is traced in ice cyan.",
           *honeycomb(BX0 + 10, BBOT - H_ICE + 10, BX1 - 10, BBOT - 10, 54), hexring(497, 760, 54, width=12), {"chip": [600, 300], "text": "segi enam"}),
        fr(1.0, "On 'berongga' the open channels inside the rings glow: the gaps the liquid could fill. A chip 'rongga' on one of them.",
           *honeycomb(BX0 + 10, BBOT - H_ICE + 10, BX1 - 10, BBOT - 10, 54), hexring(497, 760, 54, width=12), {"dot": [500, 760, 34], "colour": ICE}, {"dot": [385, 562, 34], "colour": ICE},
           {"dot": [614, 958, 34], "colour": ICE}, {"chip": [560, 300], "text": "rongga"}, {"cut": "kisi mengecil ke kanan"}),
    ],
    "s06": [
        fr(0.0, "The lattice shrinks into a column on the right; on the left the same molecules as liquid fill a column of the same width. Both say how many.",
           {"path": f"M50 {1130 - C_LIQ} L50 1130 L470 1130 L470 {1130 - C_LIQ}", "colour": WATER, "width": 6}, {"molecules": [70, 1130 - C_LIQ + 20, 360, C_LIQ - 60, 30], "seed": 3},
           {"path": f"M510 {1130 - C_ICE} L510 1130 L930 1130 L930 {1130 - C_ICE}", "colour": ICE, "width": 6}, *honeycomb(520, 1130 - C_ICE + 10, 920, 1120, 40),
           {"chip": [50, 270], "text": "cair · 240"}, {"chip": [510, 270], "text": "es · 240"}, {"move": [700, 760, 720, 760], "text": "mengecil"}),
        fr(1.0, "On 'sama' the two counters land at the same figure; the cut is 'tapi'.",
           {"path": f"M50 {1130 - C_LIQ} L50 1130 L470 1130 L470 {1130 - C_LIQ}", "colour": WATER, "width": 6}, {"molecules": [70, 1130 - C_LIQ + 20, 360, C_LIQ - 60, 30], "seed": 3},
           {"path": f"M510 {1130 - C_ICE} L510 1130 L930 1130 L930 {1130 - C_ICE}", "colour": ICE, "width": 6}, *honeycomb(520, 1130 - C_ICE + 10, 920, 1120, 40),
           {"chip": [50, 270], "text": "cair · 240"}, {"chip": [510, 270], "text": "es · 240"}, {"cut": "tanpa potongan: garis putus-putus"}),
    ],
    "s07": [
        fr(0.0, "The same two columns; on 'tapi' a dashed line draws from the liquid column's top across to the ice column.",
           {"path": f"M50 {1130 - C_LIQ} L50 1130 L470 1130 L470 {1130 - C_LIQ}", "colour": WATER, "width": 6}, {"molecules": [70, 1130 - C_LIQ + 20, 360, C_LIQ - 60, 30], "seed": 3},
           {"path": f"M510 {1130 - C_ICE} L510 1130 L930 1130 L930 {1130 - C_ICE}", "colour": ICE, "width": 6}, *honeycomb(520, 1130 - C_ICE + 10, 920, 1120, 40),
           {"chip": [50, 270], "text": "cair · 240"}, {"chip": [510, 270], "text": "es · 240"}, {"line": [50, 1130 - C_LIQ, 930, 1130 - C_LIQ], "dashed": True}, {"move": [60, 1130 - C_LIQ - 30, 900, 1130 - C_LIQ - 30], "text": "garis"}),
        fr(1.0, "On '9%' a dashed line carries the liquid's top across, and the gap up to the ice's top is measured: +9%.",
           {"path": f"M50 {1130 - C_LIQ} L50 1130 L470 1130 L470 {1130 - C_LIQ}", "colour": WATER, "width": 6}, {"molecules": [70, 1130 - C_LIQ + 20, 360, C_LIQ - 60, 30], "seed": 3},
           {"path": f"M510 {1130 - C_ICE} L510 1130 L930 1130 L930 {1130 - C_ICE}", "colour": ICE, "width": 6}, *honeycomb(520, 1130 - C_ICE + 10, 920, 1120, 40),
           {"line": [50, 1130 - C_LIQ, 930, 1130 - C_LIQ], "dashed": True}, {"line": [915, 1130 - C_ICE, 915, 1130 - C_LIQ], "colour": ICE, "width": 8},
           {"number": [720, 470], "text": "+9%", "size": 110, "colour": ICE}, {"chip": [50, 270], "text": "cair · 240"}, {"chip": [510, 270], "text": "es · 240"}, {"cut": "kolom jadi batang"}),
    ],
    "s08": [
        fr(0.0, "The two columns become two bars of density on one baseline: water and ice, one cubic centimetre each.",
           {"axes": [150, 1100, 760, 700], "ylabel": "g per cm³"}, {"bar": [200, 1100, 240, PX_G * 1.0], "colour": WATER, "label": "air"}, {"bar": [560, 1100, 240, PX_G * RHO_ICE], "colour": ICE, "label": "es"},
           {"move": [680, 600, 680, 560], "text": "menyusut"}),
        fr(0.5, "On 'ringan' the figures land on top of the bars at their values: 1,000 and 0,917.",
           {"axes": [150, 1100, 760, 700]}, {"bar": [200, 1100, 240, PX_G * 1.0], "colour": WATER}, {"bar": [560, 1100, 240, PX_G * RHO_ICE], "colour": ICE},
           {"number": [320, 470], "text": "1,000", "size": 80}, {"number": [680, 640], "text": "0,917", "size": 80, "colour": ICE}, {"line": [180, 500, 880, 500], "dashed": True}),
        fr(1.0, "On 'ngapung' the ice bar lifts off its baseline, a cube again, and rises out of the top: the cut goes to the glass.",
           {"axes": [150, 1100, 760, 700]}, {"bar": [200, 1100, 240, PX_G * 1.0], "colour": WATER}, *cube(680, 380, 200),
           {"number": [320, 470], "text": "1,000", "size": 80}, {"move": [680, 700, 680, 420], "text": "ngapung"}, {"cut": "potong ke balok di air"}),
    ],
    "s09": [
        fr(0.0, "Close on the floating cube: the waterline crosses it near the top; a ruler of ten marks down its left side.",
           *glass(60, 1020, 200, 1200, WL), *cube(430, TOP9, S9), {"camera": "push"}),
        fr(0.5, "On '9/10' the part under water is measured: 9 of the 10 marks, and a little more.",
           *glass(60, 1020, 200, 1200, WL), *cube(430, TOP9, S9), {"line": [720, WL, 720, TOP9 + S9], "colour": ICE, "width": 10},
           {"number": [830, 650], "text": "92%", "size": 64, "colour": ICE}, {"line": [100, WL, 980, WL], "colour": WATER, "width": 8}),
        fr(1.0, "The fraction it comes from lands at the top: 0,917 ÷ 1,000 ≈ 0,92.",
           *glass(60, 1020, 200, 1200, WL), *cube(430, TOP9, S9), {"line": [720, WL, 720, TOP9 + S9], "colour": ICE, "width": 10},
           {"number": [830, 650], "text": "92%", "size": 64, "colour": ICE}, {"chip": [150, 300], "text": "0,917 ÷ 1,000 ≈ 0,92"}, {"cut": "kartu naik"}),
    ],
    "s10": [
        fr(0.0, "The recap rises over the dimmed glass: three cards, each with its small picture.",
           {"card": [64, 250, 866, 170]}, hexring(160, 335, 52), {"card": [64, 440, 866, 170]}, {"path": "M120 590 L120 470 M220 590 L220 456", "colour": ICE, "width": 30},
           {"card": [64, 630, 866, 170]}, *cube(160, 690, 80), {"move": [497, 860, 497, 800], "text": "naik"}),
        fr(0.4, "The line to remember slams in under them.",
           {"card": [64, 250, 866, 170]}, hexring(160, 335, 52), label(560, 350, "4 tetangga, kisi segi enam", 40), {"card": [64, 440, 866, 170]},
           {"path": "M120 590 L120 470 M220 590 L220 456", "colour": ICE, "width": 30}, label(560, 540, "+9% tempat, molekul sama", 40), {"card": [64, 630, 866, 170]}, *cube(160, 690, 80), label(560, 730, "≈ 92% di bawah air", 40),
           {"title": [497, 960], "text": "Es ngapung\nkarena berongga.", "size": 100, "accent": "berongga."}),
        fr(1.0, "Held for two seconds; a sheen crosses the line. The last frame can loop to the first.",
           {"card": [64, 250, 866, 170]}, hexring(160, 335, 52), label(560, 350, "4 tetangga, kisi segi enam", 40), {"card": [64, 440, 866, 170]},
           {"path": "M120 590 L120 470 M220 590 L220 456", "colour": ICE, "width": 30}, label(560, 540, "+9% tempat, molekul sama", 40), {"card": [64, 630, 866, 170]}, *cube(160, 690, 80), label(560, 730, "≈ 92% di bawah air", 40),
           {"title": [497, 960], "text": "Es ngapung\nkarena berongga.", "size": 100, "accent": "berongga."}, {"camera": "push"}, {"cut": "selesai; bisa diputar ulang"}),
    ],
}

# ── Babak 1: pertanyaan ──────────────────────────────────────────────────────────────────────────────────────
shot("s01", "hook", "wide",
     caption="Kenapa es malah *ngapung* di air?",
     teaches="Asks the question while it happens: a cube of ice let go under water rises and floats.",
     screen="A tall glass in cross-section fills the frame (walls at x 232 and 762, rim at y 300, bottom at y 1150), water to y 540 with a bright meniscus line and soft caustics on the back. A 250 px ice cube, translucent cyan with frosted edges and a bright rim, is near the bottom on frame 0, rising, with a trail of bubbles. On the floor of the frame, inside the safe area, the question in metal type at 90 px, three lines: 'Kenapa es / malah ngapung / di air?', 'ngapung' in ice cyan. The lettering is the caption, so the pop caption of this shot is hidden (film.css).",
     motion="The cube rises from frame 0, breaks the surface at about 0.9 s, overshoots and bobs twice (a damped oscillation) and settles with 0,917 of its height under the waterline. Rings spread on the surface where it broke through. The first line is there on frame 0; the other two slam in at the pace the caption would show them. The camera pushes 4 percent.",
     carries="The glass and the floating cube.",
     transition="The glass slides left and shrinks into the right glass of a pair; a wax glass slides in on the left.",
     sound="Music from frame 0, low. A soft water plop where the cube breaks the surface, as the second line lands.",
     check="Frame 0 is a finished picture. The cube settles with its top 20.8 px above the waterline (0,083 of 250 px). The question is inside the safe area and not over the glass's water.",
     facts=["f1", "f5"])

shot("s02", "hook", "compare",
     caption="Padahal benda padat biasanya *tenggelam* di cairannya sendiri.",
     teaches="The tension: a solid normally sinks in its own melt; wax does, ice does not.",
     screen="Two glasses side by side, 360 px wide, rims at y 420, bottoms at y 1120, liquid to y 560. Left: molten wax, warm amber and slightly opaque, with a 170 px block of solid wax, paler and matte. Right: the same water and ice as s01, a 170 px cube floating with 0,917 of it under. Chips above: 'lilin' (left) and 'es' (right). Under each when it is decided: 'padat → tenggelam' (amber), 'padat → ngapung' (cyan).",
     motion="The wax block is let go at the surface on the first word and sinks slowly through the thick melt; it lands on the bottom with a small bounce as the caption says 'cairannya'. The ice bobs gently and stays up. The labels under each glass land when each fate is clear.",
     carries="The right glass, with the ice.",
     transition="The wax glass slides out left; the ice glass grows back to the hero glass.",
     sound="A soft thud when the wax lands.",
     check="The wax is a different colour from the water and the ice. The ice's waterline is still at 0,917 of its height. Labels sit on their glasses.",
     facts=["f6"])

# ── Babak 2: molekul ─────────────────────────────────────────────────────────────────────────────────────────
shot("s03", "molekul", "diagram",
     caption="Waktu cair, molekul air *berdesakan* dan terus bergerak.",
     teaches="In the liquid the molecules are packed close in no order and always moving.",
     screen=f"A glass box (x {BX0} to {BX1}, bottom y {BBOT}, top y {BBOT - H_LIQ:.0f}) holding N water molecules drawn as balls: a large oxygen in water blue with two small white hydrogens at 104.5 degrees, shaded as spheres, lit from the upper left; nearer ones larger and sharper, farther ones smaller and dimmer. A chip 'air · cair' at the top left. The molecules are packed close, in no order.",
     motion="The cut is a dive: in the first 0.9 s a lens opens over the water of the hero glass beside the cube and grows over the frame, with the liquid already inside it; the glass dims away. Every molecule jiggles and tumbles all shot long (a seeded drift and spin on each, as a function of time). The camera drifts slightly so the depth reads. The stage light is water blue, low behind the box.",
     carries="The same molecules, in the same box.",
     transition="No cut: the cold comes in.",
     sound="The music only.",
     check="The box's height is the ice box's height divided by 1,0907. The molecules never leave the box.",
     facts=["f7"])

shot("s04", "molekul", "macro",
     caption="Tapi pas membeku, tiap molekul *menggandeng* 4 tetangga,",
     teaches="Freezing: each molecule locks onto exactly four neighbours, and that fixes them in a lattice.",
     screen=f"The same box. The molecules slide to the sites of a real ice Ih lattice (oxygens on a hexagonal-diamond lattice, O–O 2,76 Å, drawn tilted so all four bonds show), and hydrogen bonds draw between neighbours as thin ice-cyan lines, each hydrogen pointing along one bond (the ice rules). The box's top rises from y {BBOT - H_LIQ:.0f} to y {BBOT - H_ICE} as they spread. One molecule in the middle is ringed in cyan, its four bonds thicker and brighter. A chip '4 tetangga' beside it; the chip at the top left becomes 'membeku'.",
     motion="On 'membeku' the light turns ice cyan and the jiggle dies away over 0.6 s while each molecule glides to its site (ease out, the nearest first). Bonds draw in as both ends arrive. On 'menggandeng' the camera has pushed in 16 percent on the middle of the block and the other molecules dim; on 'empat' the ringed molecule's four bonds light one after another, and on 'tetangga' the chip pops.",
     carries="The lattice and its ringed molecule.",
     transition="No cut: the camera turns to look down the lattice's six-fold axis.",
     sound="A crisp crackle of freezing as the lattice locks, a small click as the four bonds light.",
     check="Every molecule in the lattice has four bonds except at the box's edges. The same N molecules as in s04. The ringed molecule has exactly four lit bonds.",
     facts=["f3"])

shot("s05", "molekul", "diagram",
     caption="jadi kisi *segi enam* yang berongga.",
     teaches="seen down its axis, the lattice is rings of six around open channels: room the liquid would have filled.",
     screen="The same lattice seen straight down its six-fold axis: the molecules stack into a honeycomb of hexagonal rings. One ring is traced in thick ice cyan. On 'berongga' the open channels inside the rings glow faintly cyan; a chip 'rongga' points at one. A chip 'segi enam' at the top.",
     motion="The camera orbits 0.6 s from the tilted view to straight down the axis; the rings close up. The ring traces itself on 'segi enam'; the channels light from the centre outward on 'berongga'.",
     carries="The lattice, which shrinks into the right column of the next shot.",
     transition="The lattice shrinks to the right; the liquid twin appears on the left.",
     sound="A shimmer as the channels light.",
     check="The rings are regular hexagons; each molecule sits on a ring's corner. The chip sits on a real channel.",
     facts=["f3"])

shot("s06", "molekul", "compare",
     caption="Jumlah molekulnya *sama,*",
     teaches="The liquid and the ice are the same molecules, the same number of them.",
     screen=f"Two columns of the same width on one floor (bottom y 1130). Left, 'cair': the N liquid molecules, jiggling, in a box {C_LIQ:.0f} px tall. Right, 'es': the same N in the lattice, in a box {C_ICE} px tall ({GROW:.4f} times). Chips over each column name it and give the count, the same figure on both.",
     motion="The lattice shrinks into the right column as the liquid twin slides in on the left. The two counts land on 'sama', together.",
     carries="The two columns and their counts.",
     transition="No cut: a dashed line starts across.",
     sound="A soft tick as the counts land.",
     check="Both counts show the same number, which is the number of molecules drawn in each column.",
     facts=["f4"])

shot("s07", "molekul", "diagram",
     caption="tapi makan tempat *9%* lebih banyak.",
     teaches="The same molecules as ice take 9% more room.",
     screen=f"The same two columns. A dashed line carries the liquid's top (y {1130 - C_LIQ:.0f}) across to the ice column; a cyan measure on the ice column's right edge from that line up to its top (y {1130 - C_ICE}) and, above the ice column, '+9%' in metal type, ice cyan.",
     motion="The dashed line draws from left to right on 'tapi makan tempat'; the measure grows up and '+9%' slams in on '9%'. The camera pushes a little toward the gap.",
     carries="The two columns.",
     transition="The columns turn into two bars on a scale of density.",
     sound="A pop on '+9%'.",
     check=f"The ice column is {GROW:.4f} times the liquid one ({C_ICE} against {C_LIQ} px); the measure spans exactly the difference, {C_ICE - C_LIQ:.1f} px.",
     facts=["f4"])

# ── Babak 3: ngapung ─────────────────────────────────────────────────────────────────────────────────────────
shot("s08", "ngapung", "chart",
     caption="Makanya es lebih *ringan*, dan ngapung.",
     teaches="The same mass in more room is less dense: a cubic centimetre of ice weighs 0,917 g against 1,000 g of water.",
     screen=f"Two bars on one baseline (y 1100), 240 px wide: 'air' in water blue, {PX_G} px tall, and 'es' in ice cyan, {PX_G * RHO_ICE:.0f} px tall ({PX_G} px for 1 g/cm³). The figures: '1,000 g' above the water bar and '0,917 g' just inside the top of the ice bar (under the dashed line carried across from the water bar's top, which shows the gap); a chip 'massa tiap 1 cm³' at the top. Labels 'air' and 'es' under the baseline.",
     motion="The columns of s07 morph into the bars. The figures land at their values on 'ringan'. On 'ngapung' the ice bar lifts off the baseline and rises out of the top of the frame.",
     carries="The cube, rising.",
     transition="A cut to the floating cube, close, as if it had risen into the glass.",
     sound="A soft pop as the figures land; a little water splash as the cube leaves.",
     check="Bar heights 600 and 550 px; the figures 1,000 and 0,917 g/cm³ agree with the fact sheet. No counting up.",
     facts=["f1", "f2"])

shot("s09", "ngapung", "diagram",
     caption="Sekitar *9/10-nya* ada di bawah air.",
     teaches="How much of it is under: the ratio of the densities, 0,917, about nine tenths.",
     screen=f"Close on a {S9} px ice cube floating in a wide glass, water at y {WL}: {S9 * (1 - UNDER):.0f} px of it above the water, {S9 * UNDER:.0f} px under, seen through the water (a little bent and bluer). Down the cube's left side a ruler of ten marks. A cyan measure just right of the cube (x 720) from the waterline to the cube's bottom, with '≈ 92%' and 'di bawah air' beside it. At the top a chip: '0,917 ÷ 1,000 ≈ 0,92'.",
     motion="The cube bobs to rest as the shot opens. The ruler's marks light one by one from the bottom on '9/10', stopping at the waterline after nine and a bit. The measure draws and '≈ 92%' lands; the chip with the division lands last.",
     carries="The cube and the glass, behind the recap.",
     transition="The scene dims as the recap cards rise.",
     sound="No effect under the words.",
     check=f"The waterline crosses the cube at {UNDER:.3f} of its height from the bottom. The ruler's nine lit marks end just under the waterline.",
     facts=["f5"])

shot("s10", "recap", "recap", 7,
     teaches="The three ideas in one frame and the line to remember.",
     screen="Over the dimmed glass, three glass cards (866 px wide, at y 250, 440, 630), each with a small picture and a line: a hexagon ring with four bonds, '4 tetangga, kisi segi enam'; two columns, the right taller, '+9% tempat, molekul sama'; a floating cube, '≈ 92% di bawah air'. Under them the poster line in metal type at 100 px: 'Es ngapung / karena berongga.', 'berongga' in ice cyan.",
     motion="The cards rise in one after another in the first 0.5 s, the poster lines slam in, a sheen crosses them. Then everything holds two seconds with a 3 percent push.",
     transition="The film ends on this frame; it can loop to frame 0, the same glass.",
     sound="A short whoosh as the cards rise, a soft low impact under the poster line, the music fading over the last 1.8 s.",
     check="Every figure matches the fact sheet. The poster line is readable for two seconds. Nothing is outside the safe area.",
     facts=["f3", "f4", "f5"])

duration = shots[-1]["end"]

storyboard = {
    "title": "Kenapa es malah ngapung di air?",
    "question": "Kenapa sih es malah ngapung di air?",
    "audience": "Remaja dan orang dewasa di Indonesia yang menonton video pendek di ponsel. Mereka tahu es ngapung di gelas, tapi kebanyakan mengira itu biasa saja, atau karena 'es ada udaranya'. Belum tahu bahwa benda padat biasanya tenggelam di cairannya sendiri.",
    "promise": "Benda padat biasanya tenggelam di cairannya sendiri, tapi waktu air membeku, tiap molekulnya menggandeng empat tetangga jadi kisi segi enam yang berongga. Molekul yang sama makan tempat sekitar sembilan persen lebih banyak, jadi es lebih ringan dari air (0,917 lawan 1,000 g/cm³) dan ngapung dengan kira-kira sembilan per sepuluh badannya di bawah permukaan.",
    "language": "id",
    "format": "1080x1920",
    "captions": "pop",
    "duration": round(duration, 3),
    "fps": 60,
    "poster": 1.6,
    "look": {
        "accent": ICE,
        "accent2": WATER,
        "mood": "Cold and clean: the kit's graphite floor and a stage light that starts water blue under the glass and turns ice cyan the moment the water freezes, staying cyan to the end. Ice is translucent cyan with frosted edges and a bright rim; liquid water is a deeper blue; wax (one shot only) is a warm amber. Molecules are shaded balls lit from the upper left, with depth. Ice cyan always means ice and its bonds; blue always means liquid water.",
    },
    "music": {
        "track": "Xceed Thru Johann (Mixkit 556)",
        "bpm": 86,
        "beat": round(HALF, 6),
        "offset": 0,
        "start": 0.679,
        "note": "A calm, curious 86 BPM bed with no lead melody, started 0.679 s in so a beat falls on frame 0, at -18 LUFS. Every shot is a whole number of half beats (0.349 s), so every cut is on the grid; 'beat' here is that half beat.",
    },
    "facts": [
        {"id": "f1", "claim": "Ordinary ice (ice Ih) at 0 °C and normal pressure has a density of about 0,9167 g/cm³; liquid water at 0 °C about 0,9998 g/cm³. The film writes these as 0,917 and 1,000 g/cm³ (a cubic centimetre of ice weighs 0,917 g, of water 1,000 g).",
         "source": "CRC Handbook of Chemistry and Physics (ice 0,9167 g/cm³ at 0 °C), as cited by Wikipedia, 'Ice'; IEEE Technology Navigator, 'Ice' (917 kg/m³ against 999,8 kg/m³); International Critical Tables via Journal of Glaciology (0,9168 ± 0,0005 g/ml)."},
        {"id": "f2", "claim": "Liquid water is densest at about 4 °C (3,98 °C, 0,99997 g/cm³); between 0 °C (0,9998) and 4 °C it changes by less than 0,02 %, so '1,000 g/cm³' holds for the cold water around the ice.",
         "source": "Encyclopaedia Britannica, 'Water: physical properties' (maximum density 1,0000 g/cm³ at 3,98 °C); IAPWS / VSMOW figure 0,99997495 g/mL at 3,983 °C as tabulated in Wikipedia, 'Properties of water'."},
        {"id": "f3", "claim": "In ice Ih each water molecule is hydrogen-bonded to four neighbours arranged as a tetrahedron (O–O about 2,76 Å, angles near 109,5°); the oxygens form puckered layers of six-membered rings, and seen down the c axis the lattice is a honeycomb with open hexagonal channels. Each bond carries one hydrogen (the ice rules, Bernal–Fowler 1933, Pauling 1935). This open framework is why ice is less dense than the liquid, where molecules also sit in the spaces the lattice leaves open. The film builds its lattice from the real geometry (hexagonal diamond, c/a = 1,63) and orients the hydrogens by the ice rules; balls are not to scale with the gaps (drawn smaller than the atoms really are, so the bonds can be seen). The film draws 240 molecules: a block 6 a wide, 5 √3 a tall and one cell (c) deep holds 6 x 5 x 8 = 240 of them.",
         "source": "M. Chaplin, Water Structure and Science, London South Bank University: 'Hexagonal ice (ice Ih)' (water.lsbu.ac.uk/water/hexagonal_ice.html, ice_phases.html); IEEE Technology Navigator, 'Ice'; L. Pauling, J. Am. Chem. Soc. 57, 2680 (1935)."},
        {"id": "f4", "claim": "Freezing, the same mass of water takes about 9 % more room: volume ratio 0,9998 / 0,9167 = 1,0907, so +9,1 %. Put the other way, ice is 1 − 0,9167 / 0,9998 = 8,3 % less dense. The caption says '9% lebih banyak' of the room, which is the 9 %; it never says 'nine percent less dense', which would be wrong (8 %). The columns of s07 keep the same width and depth, so their heights carry the volume: 606 px against 606 / 1,0907 = 555,6 px.",
         "source": "Arithmetic from f1."},
        {"id": "f5", "claim": "A floating body sinks until it pushes aside its own weight of liquid (Archimedes), so the fraction under the surface is ρ_object / ρ_liquid: for ice in fresh water near 0 °C, 0,9167 / 0,9998 = 0,917, 'about nine tenths' (written ≈ 92 %). In sea water (about 1,025 g/cm³) it is 0,894, the familiar 'nine tenths of an iceberg'. The film shows fresh water in a glass. The 250 px cube floats with 0,083 x 250 = 20,8 px above the water; the 400 px cube with 33,2 px above.",
         "source": "OpenStax, College Physics 2e, section 11.7 'Archimedes' Principle' (fraction submerged = ρ_obj / ρ_fl); arithmetic from f1."},
        {"id": "f6", "claim": "For most substances the solid is denser than its liquid, so a lump of the solid sinks in its own melt; water is one of a few exceptions (others: silicon, gallium, germanium, bismuth). The film's example is paraffin wax: solid about 0,88 to 0,93 g/cm³, molten about 0,73 to 0,78 g/cm³ (100 to 135 °C), so solid wax sinks in molten wax. The caption says 'biasanya' (usually), not 'always'.",
         "source": "Anton Paar Wiki, 'Paraffin wax' (density of molten wax); paraffin solid density in standard tables (0,88 to 0,93 g/cm³); M. Chaplin, Water Structure and Science, 'Anomalous properties of water' (density anomaly, other substances that expand on freezing)."},
        {"id": "f7", "claim": "In liquid water the molecules are close together and constantly moving; hydrogen bonds still form but break and re-form within picoseconds, so there is no lasting lattice and molecules can sit in the spaces the ice lattice keeps open. Simplification: the film draws the liquid without bonds, and its motion is slowed down enormously to be visible.",
         "source": "M. Chaplin, Water Structure and Science, London South Bank University: 'Water structure' and 'Hydrogen bonding in water'."},
    ],
    "acts": [
        {"id": "hook", "title": "Pertanyaan", "goal": "Ask the question while ice floats on screen, then break the obvious: a solid usually sinks in its own liquid (wax does).", "rail": False},
        {"id": "molekul", "title": "Molekul", "goal": "Go inside: crowded moving molecules, then freezing locks each to four neighbours in an open hexagonal lattice; the same molecules need 9 % more room.", "rail": False},
        {"id": "ngapung", "title": "Ngapung", "goal": "Turn the extra room into density (0,917 against 1,000) and the density into the waterline: about nine tenths under.", "rail": False},
        {"id": "recap", "title": "Rangkuman", "goal": "The three ideas in one frame and the line to remember.", "rail": False},
    ],
    "shots": shots,
}

out = HERE / "storyboard.json"
out.write_text(json.dumps(storyboard, ensure_ascii=False, indent=2) + "\n")
print(f"{len(shots)} shots, {sum(len(s['frames']) for s in shots)} frames, {duration:.2f} s -> {out}")
