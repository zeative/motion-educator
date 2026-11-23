"""Writes storyboard.json for "Why does a bigger rear gear make hills easier?" (landscape 1920 x 1080, the Blueprint template).

The sample film of the Blueprint visual template: white technical drawing on a blueprint sheet, built line by line at
pen speed, one accent (#ffd166) for the part or the value that matters, captions only (no voice), in English. It loops:
the last caption ("That's why") runs into the first, and the last picture is the first one a moment early.

    python3 examples/gears/storyboard.build.py && node kit/tools/storyboard.mjs examples/gears --png

Every drawing below is computed from the real parts, not drawn by eye:
- the gear pair is a standard spur pair, module 3 mm, 12 and 36 teeth (KHK formulas, f4), drawn 6 px per mm;
- the bicycle is the side elevation of a real 29-inch mountain bike (Polygon Xtrada 7 2021, size XL, f8), with a
  Shimano Deore FC-M5100 32-tooth chainring and CS-M5100 11-51 cassette (f7), every sprocket at its true pitch
  diameter for a 1/2-inch chain (f6);
- the distances per pedal turn in s14 are computed from the teeth and the tyre (f10).
Shot lengths are counted in beats of the bed (75 BPM, one beat 0.8 s), so every cut lands on the grid.
"""
import json
import math
from pathlib import Path

HERE = Path(__file__).parent
BPM = 75
BEAT = 60 / BPM  # 0.8 s

# ── The numbers ──────────────────────────────────────────────────────────────────────────────────────────────────
# The gear pair (f2, f4): module 3 mm, z = 12 drives z = 36.
M = 3.0
Z1, Z2 = 12, 36
RATIO = Z2 / Z1  # 3
D1, D2 = Z1 * M, Z2 * M  # pitch diameters 36 and 108 mm
CENTRE = (Z1 + Z2) * M / 2  # 72 mm
assert RATIO == 3 and (D1, D2, CENTRE) == (36, 108, 72)

# The bicycle (f6, f7, f8, f10).
P = 12.7  # chain pitch, mm (1/2 inch)


def pitch_d(n):
    """Pitch diameter of a chain sprocket: p / sin(180 deg / N) (ASME B29.1 geometry)."""
    return P / math.sin(math.pi / n)


CASSETTE = [11, 13, 15, 18, 21, 24, 28, 33, 39, 45, 51]  # Shimano Deore CS-M5100 11-51T
RING = 32  # FC-M5100-1 chainring
SMALL, BIG = 11, 33
TYRE_OD = 736.3  # 29 x 2.25 in, mm
CIRC = math.pi * TYRE_OD  # 2313 mm
TURNS_SMALL, TURNS_BIG = RING / SMALL, RING / BIG  # wheel turns per pedal turn: 2.91 and 0.97
RUN_SMALL, RUN_BIG = TURNS_SMALL * CIRC / 1000, TURNS_BIG * CIRC / 1000  # 6.73 m and 2.24 m
TORQUE_RADII = pitch_d(BIG) / pitch_d(SMALL)  # 2.96: the chain pulls at the pitch radius
assert round(RUN_SMALL, 1) == 6.7 and round(RUN_BIG, 1) == 2.2 and abs(RUN_SMALL / RUN_BIG - 3) < 1e-9
assert round(pitch_d(SMALL), 1) == 45.1 and round(pitch_d(BIG), 1) == 133.6 and round(TORQUE_RADII, 2) == 2.96

# The frame: Polygon Xtrada 7 (2021), XL, 29 in (bikeinsights.com geometry), in mm, rear axle at the origin, y up.
CS_H, BB_DROP, WB = 430.1, 65.0, 1191.0
STACK, REACH, ST_CT, HTA, STA, HT_LEN, OFFSET, CRANK = 637.0, 470.0, 500.0, 67.0, 75.0, 105.0, 44.3, 175.0

# ── Drawing helpers (1920 x 1080; what must be read stays above y 850 and inside x 80..1840) ─────────────────────────
shots = []
ACC = "orange"  # the accent (#ffd166 on screen) is drawn in orange pencil on the board


def fr(at, note, *draw):
    flat = []
    for d in draw:
        flat.extend(d if isinstance(d, list) else [d])
    return {"at": at, "note": note, "draw": flat}


def label(x, y, text, size=34, **more):
    return {"label": [x, y], "text": text, "size": size, **more}


def P2(x, y):
    return f"{x:.1f} {y:.1f}"


def poly(points, close=False):
    return "M" + " L".join(P2(x, y) for x, y in points) + (" Z" if close else "")


def gear_path(cx, cy, z, rp, ra, rf, rot=0.0):
    """A toothed outline: z teeth, pitch radius rp, tip ra, root rf, rotated rot degrees (clockwise on screen)."""
    tau = 360 / z
    pts = []
    for k in range(z):
        c = rot + k * tau
        for frac, r in ((-0.32, rf), (-0.15, ra), (0.15, ra), (0.32, rf)):
            a = math.radians(c + frac * tau)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return poly(pts, close=True)


def spur(cx, cy, z, k, rot=0.0, colour=None, width=6):
    """A standard spur gear of module M drawn k px per mm: outline, dashed pitch circle, hub and bore."""
    rp, ra, rf = z * M / 2 * k, (z * M / 2 + M) * k, (z * M / 2 - 1.25 * M) * k
    hub = (16 if z > 20 else 7) * k
    bore = (6 if z > 20 else 3) * k
    out = [{"path": gear_path(cx, cy, z, rp, ra, rf, rot), "width": width, **({"colour": colour} if colour else {})},
           {"ring": [round(cx), round(cy), round(rp)], "dashed": True, "width": 2},
           {"ring": [round(cx), round(cy), round(hub)], "width": 4},
           {"ring": [round(cx), round(cy), round(bore)], "width": 3}]
    return out


def mark(cx, cy, r0, r1, angle, colour=ACC):
    a = math.radians(angle)
    return {"line": [round(cx + r0 * math.cos(a)), round(cy + r0 * math.sin(a)), round(cx + r1 * math.cos(a)), round(cy + r1 * math.sin(a))], "colour": colour, "width": 7}


def centre_lines(cx, cy, r):
    return {"path": f"M{cx - r} {cy} H{cx + r} M{cx} {cy - r} V{cy + r}", "dashed": True, "width": 2}


def dim(x0, x1, y, text, size=30, colour=None):
    """A dimension line with arrowheads and its value written above it."""
    c = {"colour": colour} if colour else {}
    return [{"path": f"M{x0} {y} H{x1} M{x0} {y - 16} V{y + 16} M{x1} {y - 16} V{y + 16} M{x0 + 18} {y - 7} L{x0} {y} L{x0 + 18} {y + 7} M{x1 - 18} {y - 7} L{x1} {y} L{x1 - 18} {y + 7}", "width": 3, **c},
            label((x0 + x1) / 2, y - 14, text, size, **c)]


def vdim(x, y0, y1, text, size=30, colour=None, side=1):
    c = {"colour": colour} if colour else {}
    return [{"path": f"M{x} {y0} V{y1} M{x - 14} {y0} H{x + 14} M{x - 14} {y1} H{x + 14} M{x - 7} {y0 + 18} L{x} {y0} L{x + 7} {y0 + 18} M{x - 7} {y1 - 18} L{x} {y1} L{x + 7} {y1 - 18}", "width": 3, **c},
            label(x + side * 20, (y0 + y1) / 2 + 10, text, size, align="start" if side > 0 else "end", **c)]


def balloon(n, x, y, tx, ty, colour=None):
    """A part number in a callout circle with a leader line to the part."""
    c = {"colour": colour} if colour else {}
    a = math.atan2(ty - y, tx - x)
    return [{"ring": [x, y, 26], "width": 3, **c}, label(x, y + 11, str(n), 30, **c),
            {"line": [round(x + 26 * math.cos(a)), round(y + 26 * math.sin(a)), tx, ty], "width": 3, **c}]


def tblock(title, sheet, note="UNITS: mm"):
    """The title block, bottom right, on every sheet."""
    return [{"path": "M1500 872 H1840 V1008 H1500 Z M1500 922 H1840 M1680 922 V1008", "width": 4},
            label(1516, 908, title, 28, align="start"), label(1516, 975, note, 28, align="start"), label(1696, 975, f"SHEET {sheet}/5", 28, align="start")]


def cap(text):
    """The caption, along the bottom left beside the title block (grey on the board: it is not part of the drawing)."""
    return label(100, 985, text.replace("*", "").upper(), 34, align="start", colour="white")


# ── The bicycle, side elevation, from its geometry ───────────────────────────────────────────────────────────────
def bike_points():
    rad = math.radians
    R = (0.0, 0.0)
    F = (WB, 0.0)
    BB = (CS_H, -BB_DROP)
    st_dir = (-math.cos(rad(STA)), math.sin(rad(STA)))
    ST_TOP = (BB[0] + ST_CT * st_dir[0], BB[1] + ST_CT * st_dir[1])
    SADDLE = (BB[0] + 760 * st_dir[0], BB[1] + 760 * st_dir[1])  # saddle height chosen for a rider of the size
    HT_TOP = (BB[0] + REACH, BB[1] + STACK)
    d = (math.cos(rad(HTA)), -math.sin(rad(HTA)))  # down the steering axis
    HT_BOT = (HT_TOP[0] + HT_LEN * d[0], HT_TOP[1] + HT_LEN * d[1])
    t = (F[0] - HT_BOT[0]) * d[0] + (F[1] - HT_BOT[1]) * d[1]
    foot = (HT_BOT[0] + t * d[0], HT_BOT[1] + t * d[1])
    off = (F[0] - foot[0], F[1] - foot[1])  # the fork offset, 44.3 mm
    CROWN = (HT_BOT[0] + off[0], HT_BOT[1] + off[1])
    return dict(R=R, F=F, BB=BB, ST_TOP=ST_TOP, SADDLE=SADDLE, HT_TOP=HT_TOP, HT_BOT=HT_BOT, CROWN=CROWN, d=d)


BIKE = bike_points()
assert abs(math.hypot(BIKE["CROWN"][0] - BIKE["HT_BOT"][0], BIKE["CROWN"][1] - BIKE["HT_BOT"][1]) - OFFSET) < 0.5


def bike(axle=(507, 576), s=0.72, phi=6.0, crank=-60.0, cog=BIG, chain=True, accent=True, ground=True):
    """The bike drawn at s px per mm, rear axle at `axle` on screen, tilted phi degrees up a hill (front up)."""
    c, sn = math.cos(math.radians(phi)), math.sin(math.radians(phi))

    def T(p):
        x, y = p
        return (axle[0] + s * (x * c - y * sn), axle[1] - s * (x * sn + y * c))

    def line(a, b, w=6, **more):
        A, B = T(a), T(b)
        return {"line": [round(A[0]), round(A[1]), round(B[0]), round(B[1])], "width": w, **more}

    def ring(p, r, **more):
        X, Y = T(p)
        return {"ring": [round(X), round(Y), max(3, round(r * s))], **more}

    b = BIKE
    out = []
    if ground:
        g0, g1 = T((-700, -TYRE_OD / 2)), T((WB + 700, -TYRE_OD / 2))
        out.append({"path": f"M{g0[0]:.0f} {g0[1]:.0f} L{g1[0]:.0f} {g1[1]:.0f}", "width": 4})
    for p in (b["R"], b["F"]):
        out += [ring(p, TYRE_OD / 2, width=6), ring(p, 311, width=3), ring(p, 30, width=3)]
    out += [line(b["BB"], b["R"], 7), line((b["ST_TOP"][0] + 10, b["ST_TOP"][1] - 40), b["R"], 6), line(b["BB"], b["ST_TOP"], 8),
            line(b["ST_TOP"], b["SADDLE"], 5), line((b["SADDLE"][0] - 120, b["SADDLE"][1] + 12), (b["SADDLE"][0] + 150, b["SADDLE"][1] + 12), 9),
            line(b["HT_TOP"], b["HT_BOT"], 11), line((b["HT_TOP"][0] + 2, b["HT_TOP"][1] - 5), b["ST_TOP"], 8),
            line((b["HT_BOT"][0] - 8, b["HT_BOT"][1] + 18), b["BB"], 9), line(b["HT_BOT"], b["CROWN"], 8), line(b["CROWN"], b["F"], 7),
            line(b["HT_TOP"], (b["HT_TOP"][0] + 40, b["HT_TOP"][1] + 28), 6), ring((b["HT_TOP"][0] + 40, b["HT_TOP"][1] + 28), 16, width=4)]
    # The drivetrain: chainring 32 T, crank 175 mm, the cassette's largest sprocket and the one the chain is on.
    pedal = (b["BB"][0] + CRANK * math.cos(math.radians(crank)), b["BB"][1] + CRANK * math.sin(math.radians(crank)))
    rr, rc = pitch_d(RING) / 2, pitch_d(cog) / 2
    out += [ring(b["BB"], rr, width=5), ring(b["R"], pitch_d(51) / 2, width=3)]
    out.append(ring(b["R"], rc, width=6, **({"colour": ACC} if accent else {})))
    if chain:
        out += [line((b["BB"][0], b["BB"][1] + rr), (b["R"][0], b["R"][1] + rc), 4),
                line((b["BB"][0], b["BB"][1] - rr), (b["R"][0] + 40, b["R"][1] - 150), 4),
                ring((b["R"][0] + 10, b["R"][1] - 75), 25, width=3), ring((b["R"][0] + 40, b["R"][1] - 150), 25, width=3)]
    out += [line(b["BB"], pedal, 9), line((pedal[0] - 50, pedal[1]), (pedal[0] + 50, pedal[1]), 8)]
    return out, T


def bike_screen(p, **kw):
    return bike(**kw)[1](p)


# ── The cassette, seen along the axle (DETAIL A), every sprocket at its true pitch diameter ──────────────────────────
def cassette(cx, cy, k, hi=(SMALL, BIG), ghost=False):
    g = {"colour": "white"} if ghost else {}
    out = [{**centre_lines(cx, cy, round(pitch_d(51) / 2 * k + 40)), **g}]
    for n in CASSETTE:
        rp = pitch_d(n) / 2 * k
        if n in hi:
            out.append({"path": gear_path(cx, cy, n, rp, rp + 3.5 * k, rp - 4.0 * k), "colour": ACC, "width": 5})
        else:
            out.append({"ring": [cx, cy, round(rp)], "width": 3, **g})
    out.append({"ring": [cx, cy, round(17 * k)], "width": 4, **g})
    return out


def chain_on(cx, cy, rp, k, length=420, colour=None):
    """A chain wrapped over the top of a sprocket and running off to the right: plates and rollers at 12.7 mm."""
    c = {"colour": colour} if colour else {}
    out = [{"path": f"M{cx + length} {cy - rp - 9} H{cx} M{cx + length} {cy - rp + 9} H{cx}", "width": 3, **c}]
    step = P * k
    x = cx
    while x < cx + length:
        out.append({"ring": [round(x), round(cy - rp), round(0.4 * step)], "width": 3, **c})
        x += step
    n = round(rp * 2 * math.pi / step)
    for i in range(1, n // 4 + 1):
        a = math.radians(-90 - i * 360 / n)
        out.append({"ring": [round(cx + rp * math.cos(a)), round(cy + rp * math.sin(a)), round(0.4 * step)], "width": 3, **c})
    return out


# ── The shots ────────────────────────────────────────────────────────────────────────────────────────────────────
def shot(id, act, type_, beats, caption, **more):
    start = shots[-1]["_end"] if shots else 0
    end = start + beats
    entry = {"id": id, "act": act, "type": type_, "start": round(start * BEAT, 3), "end": round(end * BEAT, 3), "_end": end}
    if caption:
        entry["caption"] = caption
    entry.update(more)
    shots.append(entry)


# Gear pair layout (sheet 2): 6 px per mm, the big gear's centre at (720, 450), the small one 72 mm to its right.
K = 6
BIGC = (720, 450)
SMC = (720 + round(CENTRE * K), 450)  # (1152, 450)
PITCH_PT = (BIGC[0] + round(D2 / 2 * K), 450)  # (1044, 450): where the pitch circles touch


def pair(theta=0.0, marks=True, small_colour=ACC, k=K, big=BIGC, small=SMC):
    """The 36-tooth gear and the 12-tooth gear in mesh; theta is how far the small one has turned (clockwise)."""
    out = [centre_lines(big[0], big[1], round(D2 / 2 * k + 60)), centre_lines(small[0], small[1], round(D1 / 2 * k + 50))]
    out += spur(big[0], big[1], Z2, k, rot=-theta / RATIO)
    out += spur(small[0], small[1], Z1, k, rot=15 + theta, colour=small_colour)
    if marks:
        out += [mark(big[0], big[1], 20 * k, D2 / 2 * k, -90 - theta / RATIO), mark(small[0], small[1], 4 * k, D1 / 2 * k, -90 + theta)]
    return out


def pair_dims():
    return dim(378, 1062, 845, "Ø108 · 36 TEETH") + dim(1044, 1260, 800, "Ø36 · 12 TEETH", colour=ACC) + balloon(1, 300, 170, 470, 240) + balloon(2, 1330, 230, 1225, 330, colour=ACC)


C01 = "A *bigger* rear gear makes a hill feel easy."
BIKE_ALL, _ = bike()
RAX = bike_screen((0, 0))  # the rear axle on screen, (507, 576)
BBX = bike_screen((CS_H, -BB_DROP))  # the bottom bracket on screen, (820, 590)
shot("s01", "hook", "wide", 6, C01,
     teaches="The puzzle from the viewer's own ride: shifting to the big rear sprocket makes a hill feel light.",
     screen="The blueprint sheet (#0d3b66 to #134e8a, fine 10 px grid, heavier 100 px grid, a faint vignette). Left two thirds: the side elevation of a real 29-inch mountain bike, white 2-weight lines, drawn at 0.72 px per mm from its geometry, centred (x 270 to 1650, y 70 to 840) and tilted 6 degrees up a hill whose ground line crosses the sheet. Thick outlines for tyres, frame and crank; thin for rims, hubs and the cassette's 51-tooth outline; the chain on the 33-tooth sprocket, which is the one accent-yellow part. A dash-dot centre line through both axles. Title block bottom right: 'MOUNTAIN BIKE 29\"', 'UNITS: mm', 'SHEET 1/5'. The caption along the bottom left in capitals.",
     motion="Frame 0 is finished: the whole drawing is already on the sheet. Main move: a slow push (a draughtsman leaning in) from the whole bike towards the rear hub. Supporting: the 33-tooth sprocket's outline re-traces once in yellow at pen speed. Detail: the line boil is nil (a precise pen), only the paper grain moves.",
     carries="The rear sprocket, which the push keeps in the middle of the frame.", transition="The push continues into the hub; the bike's lines fade to 30% behind the lettering of s02.",
     sound="The bed starts from frame 0 (felt piano, a soft pad). A single soft pen scratch as the sprocket re-traces.",
     check="It reads as a bicycle on a hill at a glance; the proportions match the geometry (wheelbase 1191 mm = 858 px along the slope); the yellow sprocket is the only colour.",
     facts=["f8", "f11"],
     frames=[fr(0, "Frame 0, finished: the bike on the hill, chain on the big sprocket in yellow, title block, caption.", BIKE_ALL, tblock('MOUNTAIN BIKE 29"', 1), cap(C01)),
             fr(0.5, "The push begins towards the rear hub; the 33-tooth sprocket re-traces in yellow.", BIKE_ALL, tblock('MOUNTAIN BIKE 29"', 1), {"camera": "push"}, {"move": [900, 260, round(RAX[0]) + 60, round(RAX[1]) - 60], "text": "in to the cog"}, cap(C01)),
             fr(1, "Closer: the rear wheel and cassette fill the left half (the same drawing at 1.5x).", bike(axle=(640, 540), s=1.1)[0], tblock('MOUNTAIN BIKE 29"', 1), {"camera": "push"}, {"cut": "on into the lettering"}, cap(C01))])

GHOST = cassette(960, 450, 3.2, hi=(BIG,), ghost=True)
shot("s02", "hook", "type", 4, None,
     teaches="Asks the question: the same legs, so where does the help come from?",
     screen="The cassette seen along its axle, faint (30%, grey on the board) and large in the middle of the sheet (Ø206 mm at 3.2 px per mm), the 33-tooth sprocket in yellow. Over it, technical lettering in capitals (Share Tech Mono, 84 px, spaced 0.12 em), centred at y 400 and 520: 'BUT YOUR LEGS ARE THE SAME.' then 'SO HOW?' with 'SO HOW?' in yellow. The title block stays.",
     motion="The lettering writes on letter by letter at a steady pen speed (about 24 letters a second). The faint sprocket turns a few degrees. On the last beat the yellow sprocket brightens and the other sprockets erase.",
     carries="The yellow 33-tooth sprocket, which becomes the 36-tooth gear of s03.", transition="The lettering erases; the sprocket redraws as a 36-tooth spur gear and a second, small gear draws in beside it.",
     sound="Pen scratches under the lettering; a soft ruler tick at the question mark.",
     check="Both lines are readable in under two seconds; nothing else competes with them.",
     frames=[fr(0, "The cassette, faint; the first line writes on.", GHOST, {"title": [960, 400], "text": "BUT YOUR LEGS ARE THE SAME.", "size": 84}, tblock('MOUNTAIN BIKE 29"', 1)),
             fr(1, "Both lines; 'SO HOW?' in yellow.", GHOST, {"title": [960, 400], "text": "BUT YOUR LEGS ARE THE SAME.\nSO HOW?", "size": 84, "accent": "SO HOW?"}, tblock('MOUNTAIN BIKE 29"', 1), {"cut": "cog becomes a gear"})])

C03 = "Two gears: *12* teeth and *36* teeth."
shot("s03", "gears", "diagram", 4, C03,
     teaches="Meet the mechanism: a small gear of 12 teeth in mesh with a big one of 36.",
     screen=f"Sheet 2, one view: two spur gears in mesh, module 3 mm, drawn 6 px per mm. Gear 1 (36 teeth, pitch Ø108 mm) centred at {BIGC}, gear 2 (12 teeth, Ø36 mm) at {SMC}, the small one in yellow. Dash-dot centre lines through both, pitch circles thin and dashed, hubs and bores thin. Part balloons 1 and 2 with leaders; dimension lines under each gear: 'Ø108 · 36 TEETH', 'Ø36 · 12 TEETH'. Title block: 'SPUR GEARS · m 3', 'SHEET 2/5'.",
     motion="Built as a draughtsman would: the centre lines first, then the pitch circles, then the outlines tooth by tooth at pen speed (2600 px a second), then the dimensions and balloons. The gears are still.",
     carries="The gear pair.", transition="The camera pushes in on the point where the teeth meet.",
     sound="Pen and a compass squeak for the circles; a ruler slide under each dimension.",
     check="The teeth interleave at the pitch point without overlapping; 12 and 36 teeth can be counted; the big gear is exactly 3x the small one's pitch diameter.",
     facts=["f2", "f4"],
     frames=[fr(0, "The centre lines and the dashed pitch circles draw on first.", centre_lines(BIGC[0], BIGC[1], 384), centre_lines(SMC[0], SMC[1], 158), {"ring": [BIGC[0], BIGC[1], 324], "dashed": True, "width": 2}, {"ring": [SMC[0], SMC[1], 108], "dashed": True, "width": 2}, tblock("SPUR GEARS · m 3", 2), cap(C03)),
             fr(0.45, "The 36-tooth outline is drawn tooth by tooth; the small gear's starts.", pair(marks=False)[:6], {"move": [420, 150, 700, 100], "text": "drawn tooth by tooth"}, tblock("SPUR GEARS · m 3", 2), cap(C03)),
             fr(1, "Both gears, dimensions and balloons: the sheet is complete.", pair(marks=False), pair_dims(), tblock("SPUR GEARS · m 3", 2), {"cut": "push in on the mesh"}, cap(C03))])

# DETAIL B: the mesh at 18 px per mm, the pitch point at (960, 450).
KB = 18
DB_BIG = (960 - round(D2 / 2 * KB), 450)  # off the left edge
DB_SM = (960 + round(D1 / 2 * KB), 450)


def detail_b(theta):
    """The mesh at 3:1; each small-gear tooth that has passed the pitch point carries its number (true when written)."""
    out = spur(DB_BIG[0], DB_BIG[1], Z2, KB, rot=-theta / RATIO)[:1] + spur(DB_SM[0], DB_SM[1], Z1, KB, rot=15 + theta, colour=ACC)[:2]
    out.append({"ring": [DB_SM[0], DB_SM[1], round(D1 / 2 * KB)], "dashed": True, "width": 2})
    out.append({"dot": [960, 450, 10]})
    for j in range(1, 4):
        a = 165 - 30 * (j - 1) + theta  # tooth j starts just below the pitch point and moves up past it
        if a >= 180:
            r = 250
            out.append(label(round(DB_SM[0] + r * math.cos(math.radians(a))), round(DB_SM[1] + r * math.sin(math.radians(a))) + 16, str(j), 48, colour=ACC))
    out.append(label(120, 130, "DETAIL B · 3:1", 32, align="start"))
    return out


C04 = "The teeth meet *one by one*."
shot("s04", "gears", "diagram", 3, C04,
     teaches="The teeth engage one pair at a time: every tooth of the small gear passes exactly one tooth of the big one.",
     screen="DETAIL B (scale 3:1 of sheet 2): the pitch point fills the middle of the frame; the small gear (yellow) occupies the right half, the big gear's rim arcs in from the left edge. The teeth of the small gear carry small numbers 1, 2, 3 written beside them as they pass the pitch point; a thin leader to the tooth in contact.",
     motion="The camera has pushed in; the small gear turns clockwise 90 degrees (three teeth) at an even speed, the big gear's rim answers a third as far; each tooth gets its number as it passes the pitch point (three numbers, each true when written).",
     carries="The meshing teeth.", transition="Pull back to the whole sheet.",
     sound="A soft click for each tooth that passes (three), in time with the beat.",
     check="Exactly one number per tooth that has passed; the big gear has turned a third as far (30 degrees at its own centre).",
     facts=["f1", "f2"],
     frames=[fr(0, "Pushed in: the pitch point (dot) in the middle, tooth 1 just below it, about to engage.", detail_b(0), {"camera": "push"}, cap(C04)),
             fr(0.5, "45 degrees: teeth 1 and 2 have passed the pitch point; each carries its number.", detail_b(45), {"move": [1560, 140, 1700, 300], "text": "clockwise"}, cap(C04)),
             fr(1, "90 degrees: three teeth passed, and three teeth of the big gear went the other way: one for one.", detail_b(90), {"move": [700, 760, 700, 560], "text": "1 for 1"}, {"cut": "pull back"}, cap(C04))])

C05 = "The small one turns once; the big one, *a third*."
shot("s05", "gears", "chart", 5, C05,
     teaches="Speed: one full turn of the 12-tooth gear moves 12 of the big gear's 36 teeth, a third of a turn, the other way.",
     screen="Sheet 2 again, the whole pair. Each gear has a yellow reference mark (a radius from hub to pitch circle) that starts pointing up. Around the small gear a thin arc with an arrowhead grows to a full circle, '1 TURN · 360°'; around the big gear an arc grows to 120 degrees the other way, '1/3 TURN · 120°'. Both arcs are dimension-weight lines with their values written on them.",
     motion="The pull back lands; then the small gear turns one full turn clockwise in 2.4 s (eased in and out) while the big gear turns 120 degrees counter-clockwise, locked to it by the teeth. The arcs draw on with the marks; the values are written as the turn ends.",
     carries="The pair with both marks where the turn left them.", transition="Hold; the arcs erase and a dot appears at the pitch point.",
     sound="The ticks of s04 continue, twelve of them, quieter; a pen stroke for each value.",
     check="When the small mark is back at the top, the big mark points 120 degrees round, counter-clockwise; the arcs show 360 and 120.",
     facts=["f1", "f2"],
     frames=[fr(0, "Pulled back: both marks point up.", pair(0), {"camera": "pull"}, tblock("SPUR GEARS · m 3", 2), cap(C05)),
             fr(0.5, "Half way: small 180 degrees, big 60 degrees the other way.", pair(180), {"path": f"M{SMC[0]} {SMC[1] - 150} A150 150 0 0 1 {SMC[0]} {SMC[1] + 150}", "colour": ACC, "width": 4}, {"path": f"M{BIGC[0]} {BIGC[1] - 370} A370 370 0 0 0 {BIGC[0] - round(370 * math.sin(math.radians(60)))} {BIGC[1] - round(370 * math.cos(math.radians(60)))}", "width": 4}, tblock("SPUR GEARS · m 3", 2), cap(C05)),
             fr(1, "One turn of the small gear; a third of a turn of the big one.", pair(360), {"ring": [SMC[0], SMC[1], 150], "colour": ACC, "width": 4}, label(1320, 270, "1 TURN · 360°", 42, align="start", colour=ACC), {"path": f"M{BIGC[0]} {BIGC[1] - 370} A370 370 0 0 0 {BIGC[0] - round(370 * math.sin(math.radians(120)))} {BIGC[1] - round(370 * math.cos(math.radians(120)))}", "width": 4}, label(130, 110, "1/3 TURN · 120°", 42, align="start"), tblock("SPUR GEARS · m 3", 2), {"cut": "the pitch point"}, cap(C05))])

C06 = "Where they meet, the push is *equal*."
F_ARROWS = [{"arrow": [PITCH_PT[0], PITCH_PT[1], PITCH_PT[0], PITCH_PT[1] - 170], "width": 6}, {"arrow": [PITCH_PT[0] + 14, PITCH_PT[1], PITCH_PT[0] + 14, PITCH_PT[1] + 170], "colour": ACC, "width": 6},
            label(PITCH_PT[0] - 20, PITCH_PT[1] - 190, "F", 44, align="end"), label(PITCH_PT[0] + 36, PITCH_PT[1] + 200, "F", 44, align="start", colour=ACC)]
shot("s06", "gears", "diagram", 4, C06,
     teaches="Force: where the teeth touch, the push on the big gear and the push back on the small one are equal.",
     screen="Sheet 2, the pair at rest. A dot at the pitch point (1044, 450). Two force arrows of exactly equal length drawn from it: 'F' upward on the big gear's tooth (white), 'F' downward on the small gear's tooth (yellow). A note to the right: 'ACTION = REACTION'.",
     motion="The camera eases towards the pitch point; the dot is set; the two arrows draw out from it at the same speed and stop at the same length; the note is written.",
     carries="The pair and the two arrows.", transition="The arrows stay; radius lines start from the two centres.",
     sound="A soft ruler slide for each arrow.",
     check="The two arrows are the same length, on one vertical line, pointing opposite ways.",
     facts=["f3"],
     frames=[fr(0, "The pitch point is marked with a dot.", pair(), {"dot": [PITCH_PT[0], PITCH_PT[1], 12]}, {"camera": "push"}, tblock("SPUR GEARS · m 3", 2), cap(C06)),
             fr(0.5, "Two arrows grow from the dot at the same speed.", pair(), {"dot": [PITCH_PT[0], PITCH_PT[1], 12]}, {"arrow": [PITCH_PT[0], PITCH_PT[1], PITCH_PT[0], PITCH_PT[1] - 90], "width": 6}, {"arrow": [PITCH_PT[0] + 14, PITCH_PT[1], PITCH_PT[0] + 14, PITCH_PT[1] + 90], "colour": ACC, "width": 6}, tblock("SPUR GEARS · m 3", 2), cap(C06)),
             fr(1, "Equal and opposite: F and F; 'ACTION = REACTION'.", pair(), {"dot": [PITCH_PT[0], PITCH_PT[1], 12]}, F_ARROWS, label(1330, 520, "ACTION = REACTION", 42, align="start"), tblock("SPUR GEARS · m 3", 2), {"cut": "radii"}, cap(C06))])

C07 = "But it's *3 times* farther from the axle."
RADII = [{"path": f"M{BIGC[0]} {BIGC[1] + 8} H{PITCH_PT[0] - 2} M{PITCH_PT[0] - 20} {BIGC[1] + 1} L{PITCH_PT[0] - 2} {BIGC[1] + 8} L{PITCH_PT[0] - 20} {BIGC[1] + 15}", "width": 4}, label(910, 430, "r 54", 46),
         {"path": f"M{SMC[0]} {SMC[1] + 8} H{PITCH_PT[0] + 2} M{PITCH_PT[0] + 20} {SMC[1] + 1} L{PITCH_PT[0] + 2} {SMC[1] + 8} L{PITCH_PT[0] + 20} {SMC[1] + 15}", "colour": ACC, "width": 4},
         {"line": [1100, 462, 1210, 640], "colour": ACC, "width": 3}, label(1220, 668, "r 18", 46, align="start", colour=ACC)]
shot("s07", "gears", "compare", 4, C07,
     teaches="The same push acts three times farther from the big gear's axle than from the small one's: 54 mm against 18 mm.",
     screen="Sheet 2 with the arrows of s06 kept. Two radius dimensions from the centres to the pitch point: 'r 54' along the big gear (white), 'r 18' along the small gear (yellow). 'r 54' is written inside the big gear's web, 'r 18' outside the small gear on a leader. In the right margin: '54 ÷ 18 = 3'.",
     motion="Each radius line draws from its centre out to the pitch point at pen speed, the small one first; the values are written; the division is written last, its '3' in yellow.",
     carries="The two radii and the arrows.", transition="The camera drifts right to clear the margin for the bars.",
     sound="Two ruler slides and a pen tick on '3'.",
     check="r 54 and r 18 meet at the pitch point; 54 / 18 = 3.",
     facts=["f3", "f4"],
     frames=[fr(0, "The small radius draws from its centre to the pitch point.", pair(marks=False), F_ARROWS, RADII[2:], tblock("SPUR GEARS · m 3", 2), cap(C07)),
             fr(0.5, "The big radius follows: three times as long.", pair(marks=False), F_ARROWS, RADII, {"move": [BIGC[0] + 20, 560, PITCH_PT[0] - 20, 560], "text": "54 mm"}, tblock("SPUR GEARS · m 3", 2), cap(C07)),
             fr(1, "Both radii and '54 ÷ 18 = 3'.", pair(marks=False), F_ARROWS, RADII, label(1360, 320, "54 ÷ 18 = 3", 52, align="start", colour=ACC), tblock("SPUR GEARS · m 3", 2), {"cut": "drift right"}, cap(C07))])

C08 = "So the *torque*, the turning force, triples."
BARS = [{"path": "M1390 800 V680 H1530 V800", "width": 5}, {"path": "M1630 800 V440 H1770 V800", "colour": ACC, "width": 6},
        {"line": [1360, 800, 1800, 800], "width": 3}, label(1460, 840, "F × 18", 34), label(1700, 840, "F × 54", 34, colour=ACC), label(1700, 420, "×3", 52, colour=ACC)]
shot("s08", "gears", "chart", 4, C08,
     teaches="Torque is force times distance from the axle, so with the same F the big gear turns with three times the torque.",
     screen="Sheet 2, the pair where it was, the right margin (x 1360 to 1800) clear. Two outline bars (no fill: the Blueprint never fills) standing on one base line at y 800: 'F × 18' 120 px tall, 'F × 54' 360 px tall in yellow, '×3' above it. A heading 'TORQUE = FORCE × DISTANCE' over them.",
     motion="The heading is written; the short bar draws up, then the tall one draws up to exactly three times its height, timed so the yellow bar lands on the beat; '×3' is written.",
     carries="The two bars beside the pair.", transition="A cross-fade of the bars into two labels, 'TURNS' and 'TORQUE'.",
     sound="Two rising pen strokes; a soft bell-like ping on '×3' (the one tonal accent of the act).",
     check="The bars are 120 and 360 px: 1 : 3. No fill.",
     facts=["f3"],
     frames=[fr(0, "The heading is written in the cleared margin.", pair(marks=False), RADII, label(1360, 320, "TORQUE = FORCE × DISTANCE", 36, align="start"), tblock("SPUR GEARS · m 3", 2), cap(C08)),
             fr(0.5, "The short bar stands; the tall one is drawing up.", pair(marks=False), RADII, label(1360, 320, "TORQUE = FORCE × DISTANCE", 36, align="start"), BARS[0], BARS[2], {"path": "M1630 800 V620 H1770 V800", "colour": ACC, "width": 6}, {"move": [1830, 780, 1830, 470], "text": ""}, tblock("SPUR GEARS · m 3", 2), cap(C08)),
             fr(1, "1 : 3, with '×3' over the yellow bar.", pair(marks=False), RADII, label(1360, 320, "TORQUE = FORCE × DISTANCE", 36, align="start"), BARS, tblock("SPUR GEARS · m 3", 2), {"cut": "into two words"}, cap(C08))])

C09 = "*Speed* is traded for torque."
SLOW_ARC = {"path": f"M{BIGC[0] - 230} {BIGC[1] - 290} A370 370 0 0 0 {BIGC[0] - 350} {BIGC[1] - 120} M{BIGC[0] - 368} {BIGC[1] - 146} L{BIGC[0] - 350} {BIGC[1] - 120} L{BIGC[0] - 330} {BIGC[1] - 144}", "width": 4}
TRADE = [label(1360, 300, "TURNS 1/3", 46, align="start"), {"arrow": [1420, 330, 1420, 400], "width": 5},
         label(1360, 640, "TORQUE ×3", 52, align="start", colour=ACC), {"arrow": [1420, 560, 1420, 490], "colour": ACC, "width": 5},
         {"path": "M1600 340 V600 M1588 360 L1600 340 L1612 360 M1588 580 L1600 600 L1612 580", "width": 4}, label(1630, 480, "TRADED", 36, align="start")]
shot("s09", "gears", "compare", 3, C09,
     teaches="The trade in one picture: the big gear turns a third as fast with three times the torque; nothing is gained for free.",
     screen="Sheet 2: the pair turning slowly, a short curved arrow over the big gear's rim for its slow turn. In the right margin (x 1360 to 1800), stacked: 'TURNS 1/3' with a small arrow down, then 'TORQUE ×3' in yellow with a small arrow up, and between them a two-headed vertical arrow with the word 'TRADED'.",
     motion="The pair turns continuously (the small one at one turn per 2.4 s, the big one a third as fast). 'TURNS 1/3' is written, then 'TORQUE ×3', then the two-headed arrow draws between them.",
     carries="The turning pair, which shrinks into the corner as the bike is drawn.", transition="The pair shrinks and slides to where the bike's chainring will be; the bike draws on around it.",
     sound="The tooth ticks, slower; a soft pen stroke on the two-headed arrow.",
     check="'TURNS 1/3' and 'TORQUE ×3' are both readable and the turning speeds are 3 : 1.",
     facts=["f3", "f5"],
     frames=[fr(0, "The pair turns; the slow-turn arrow over the big gear; 'TURNS 1/3' is written.", pair(40), SLOW_ARC, TRADE[:2], tblock("SPUR GEARS · m 3", 2), cap(C09)),
             fr(1, "'TORQUE ×3' in yellow under it, and 'TRADED' between them.", pair(80), SLOW_ARC, TRADE, tblock("SPUR GEARS · m 3", 2), {"cut": "to the bike"}, cap(C09))])

C10 = "A bike does the same, with a *chain*."
BIKE_NOCHAIN, _ = bike(chain=False, accent=False)
shot("s10", "bike", "wide", 4, C10,
     teaches="The bicycle is the same mechanism with a chain between the teeth: chainring in front, sprockets on the rear wheel.",
     screen="Sheet 3: the bike's side elevation again (same drawing as s01, same place). The chain draws on from the 32-tooth chainring over the top to the 33-tooth sprocket (yellow) and back under through the derailleur's two pulleys. Balloon 3 to the chainring 'FRONT CHAINRING 32', balloon 4 to the cassette 'REAR CASSETTE', and a detail circle 'A' (dashed) round the rear hub.",
     motion="The shrunken gear pair from s09 slides onto the chainring's place and is replaced by it; the chain draws on link-run by link-run in the direction it moves; the balloons and the detail circle are drawn last.",
     carries="The rear hub inside detail circle A.", transition="The camera pushes into detail circle A, which opens into the cassette seen along its axle.",
     sound="A light chain rattle as the chain is drawn; pen ticks for the balloons.",
     check="The chain is tangent to the chainring and the 33-tooth sprocket; the bike matches s01's drawing exactly.",
     facts=["f6", "f7", "f8"],
     frames=[fr(0, "The bike without its chain; the small gear pair slides onto the chainring.", BIKE_NOCHAIN, {"move": [1250, 200, round(BBX[0]) + 30, round(BBX[1]) - 50], "text": "gears become cogs"}, tblock("BIKE · DRIVETRAIN", 3), cap(C10)),
             fr(0.5, "The chain draws on over the top to the yellow 33-tooth sprocket.", BIKE_ALL, tblock("BIKE · DRIVETRAIN", 3), {"move": [round(BBX[0]), round(BBX[1]) - 80, round(RAX[0]) + 20, round(RAX[1]) - 85], "text": "chain"}, cap(C10)),
             fr(1, "Balloons 3 and 4, and the dashed detail circle A round the rear hub.", BIKE_ALL, balloon(3, round(BBX[0]) + 170, 330, round(BBX[0]) + 20, round(BBX[1]) - 50), label(round(BBX[0]) + 210, 322, "FRONT CHAINRING 32", 32, align="start"), balloon(4, 250, 250, round(RAX[0]) - 40, round(RAX[1]) - 70), label(290, 242, "REAR CASSETTE", 32, align="start"), {"ring": [round(RAX[0]), round(RAX[1]), 110], "dashed": True, "width": 3}, label(round(RAX[0]) + 90, round(RAX[1]) - 110, "A", 40), tblock("BIKE · DRIVETRAIN", 3), {"cut": "into detail A"}, cap(C10))])

C11 = "Compare cogs of *11* and *33* teeth."
KC = 3.2  # the two side views of s12 and s13
KA = 3.6  # DETAIL A
CAS = cassette(620, 450, KA)
shot("s11", "bike", "diagram", 4, C11,
     teaches="The real cassette: eleven sprockets from 11 to 51 teeth; the film compares the 11 and the 33.",
     screen="DETAIL A, sheet 4: the Shimano Deore 11-51 cassette seen along the axle, 3.6 px per mm, centred at (620, 450): eleven concentric sprockets at their true pitch diameters (Ø45 to Ø206 mm), thin; the 11-tooth and the 33-tooth drawn tooth by tooth in yellow. Leaders to two callouts in the right margin: '11 TEETH · Ø45.1' and '33 TEETH · Ø133.6'. Title block 'CASSETTE 11–51 TEETH', 'SHEET 4/5'.",
     motion="The detail circle opens into the view; the eleven pitch circles are drawn from the inside out at pen speed; the two yellow sprockets are re-traced with their teeth; the callouts are written.",
     carries="The 11 and 33 sprockets.", transition="The two yellow sprockets slide apart sideways into two separate side views, each catching the chain.",
     sound="A compass squeak per circle (fast, eleven of them), then two pen strokes.",
     check="Eleven circles, the 33 exactly 2.96x the 11 in diameter (Ø133.6 / Ø45.1), true to the cassette.",
     facts=["f6", "f7"],
     frames=[fr(0, "The detail circle opens; the inner sprockets are drawn first.", cassette(620, 450, KA)[:5], {"camera": "push"}, label(120, 110, "DETAIL A", 34, align="start"), tblock("CASSETTE 11–51 TEETH", 4), cap(C11)),
             fr(0.5, "All eleven pitch circles; the 11 and 33 in yellow with their teeth.", CAS, label(120, 110, "DETAIL A", 34, align="start"), tblock("CASSETTE 11–51 TEETH", 4), cap(C11)),
             fr(1, "Callouts: 11 TEETH Ø45.1 and 33 TEETH Ø133.6.", CAS, {"line": [620 + 84, 450 - 24, 1250, 300], "colour": ACC, "width": 3}, label(1260, 310, "11 TEETH · Ø45.1", 42, align="start", colour=ACC), {"line": [620 + 232, 450 + 80, 1250, 560], "colour": ACC, "width": 3}, label(1260, 570, "33 TEETH · Ø133.6", 42, align="start", colour=ACC), label(120, 110, "DETAIL A", 34, align="start"), tblock("CASSETTE 11–51 TEETH", 4), {"cut": "the two cogs apart"}, cap(C11))])

C12 = "The chain pulls *the same*."
R11, R33 = pitch_d(SMALL) / 2 * KC, pitch_d(BIG) / 2 * KC
L11, L33 = (330, 560), (1150, 560)


def two_cogs(with_chain=True, arrows=False, radii=False):
    out = [centre_lines(L11[0], L11[1], 110), {"path": gear_path(L11[0], L11[1], SMALL, R11, R11 + 3.5 * KC, R11 - 4 * KC), "colour": ACC, "width": 5},
           centre_lines(L33[0], L33[1], 250), {"path": gear_path(L33[0], L33[1], BIG, R33, R33 + 3.5 * KC, R33 - 4 * KC), "colour": ACC, "width": 5},
           label(L11[0], 820, "COG 11", 34), label(L33[0], 820, "COG 33", 34)]
    if with_chain:
        out += chain_on(L11[0], L11[1], R11, KC, 300) + chain_on(L33[0], L33[1], R33, KC, 300)
    if arrows:
        out += [{"arrow": [L11[0] + 320, L11[1] - R11, L11[0] + 470, L11[1] - R11], "width": 6}, label(L11[0] + 395, L11[1] - R11 - 26, "F", 48),
                {"arrow": [L33[0] + 320, L33[1] - R33, L33[0] + 470, L33[1] - R33], "width": 6}, label(L33[0] + 395, L33[1] - R33 - 26, "F", 48)]
    if radii:
        out += vdim(L11[0] - 40, L11[1] - R11, L11[1], "r 22.5", 32, side=-1) + vdim(L33[0] - 40, L33[1] - R33, L33[1], "r 66.8", 32, side=-1)
    return out


shot("s12", "bike", "diagram", 3, C12,
     teaches="With the same chainring and the same push on the pedal, the chain pulls with the same force whichever sprocket it is on.",
     screen="Sheet 4, two side views on one base line: the 11-tooth sprocket centred at (330, 560) and the 33-tooth at (1150, 560), both in yellow at 3.2 px per mm, each with the chain over its top (plates as two thin lines, rollers as small circles every 12.7 mm) running off to the right towards the chainring. On each chain run an arrow 'F' of the same length pulling right.",
     motion="The chains settle onto the teeth (rollers drop into the gaps); both arrows draw out together and stop at the same length.",
     carries="The two sprockets with their chains and arrows.", transition="Radius dimensions draw from the centres up to the chain line.",
     sound="A soft chain clink as each chain seats; one ruler slide for both arrows.",
     check="The two F arrows are identical in length and height above their axles' chain line.",
     facts=["f9"],
     frames=[fr(0, "The two sprockets apart; the chains drop onto them.", two_cogs(), {"move": [800, 200, 800, 260], "text": "chain drops on"}, tblock("CASSETTE 11–51 TEETH", 4), cap(C12)),
             fr(1, "The same F on both chains.", two_cogs(arrows=True), tblock("CASSETTE 11–51 TEETH", 4), {"cut": "radii"}, cap(C12))])

C13 = "The 33 gives the wheel *3 times* the torque."
shot("s13", "bike", "chart", 4, C13,
     teaches="Same pull, three times the radius: the 33-tooth sprocket turns the wheel with about three times the torque of the 11.",
     screen="Sheet 4 as s12, with vertical radius dimensions from each axle to its chain line: 'r 22.5' and 'r 66.8' (mm). In the free space under the arrows, two outline bars: 'F × 22.5' and 'F × 66.8', the second three times the first, '×3' in yellow.",
     motion="The radius dimensions draw up from the axles; the bars draw up from one base line, the second to three times the first's height; '×3' is written on the beat.",
     carries="The 33-tooth sprocket.", transition="The sprockets roll away along the base line, which becomes a road.",
     sound="Two ruler ticks; the same soft ping as s08 on '×3' (it is the same idea).",
     check="r 22.5 and r 66.8 are written; the bars stand 1 : 3 (the ideal ratio, 33/11; the radii give 2.96).",
     facts=["f6", "f9"],
     frames=[fr(0, "Radius dimensions draw up from both axles.", two_cogs(arrows=True, radii=True), tblock("CASSETTE 11–51 TEETH", 4), cap(C13)),
             fr(0.5, "The bars rise from one base line.", two_cogs(arrows=True, radii=True), {"path": "M1560 800 V740 H1640 V800", "width": 5}, {"path": "M1680 800 V680 H1760 V800", "colour": ACC, "width": 5}, {"line": [1540, 800, 1790, 800], "width": 3}, tblock("CASSETTE 11–51 TEETH", 4), cap(C13)),
             fr(1, "Bars 1 : 3 and '×3'.", two_cogs(arrows=True, radii=True), {"path": "M1560 800 V740 H1640 V800", "width": 5}, {"path": "M1680 800 V620 H1760 V800", "colour": ACC, "width": 5}, {"line": [1540, 800, 1790, 800], "width": 3}, label(1720, 600, "×3", 44, colour=ACC), tblock("CASSETTE 11–51 TEETH", 4), {"cut": "into a road"}, cap(C13))])

C14 = "The price: one pedal turn moves you only *2.2 m*."
KR = 1500 / (RUN_SMALL * 1000)  # px per mm on the road: 6.73 m = 1500 px
WR = TYRE_OD / 2 * KR  # wheel radius on this scale, 82 px


def road(y, metres, turns, colour=None):
    c = {"colour": colour} if colour else {}
    x0 = 180
    x1 = x0 + metres * 1000 * KR
    out = [{"line": [x0 - 40, y, 1840, y], "width": 3}]
    n = 0
    while n <= turns:
        xx = x0 + n * CIRC * KR
        out.append({"line": [round(xx), y - 10, round(xx), y + 10], "width": 3})
        n += 1
    out.append({"ring": [round(x1), round(y - WR), round(WR)], "width": 4, **c})
    return out


shot("s14", "bike", "compare", 5, C14,
     teaches="The price: on the 33 one pedal turn moves the bike 2.2 m, on the 11 it moves 6.7 m; three times the turns for the same distance.",
     screen=f"Sheet 5 'DISTANCE PER PEDAL TURN', two roads drawn as base lines across the sheet at 1 mm = {KR:.3f} px. Top, 'COG 11': the wheel (Ø736 mm = {2 * WR:.0f} px) rolls from x 180 to x 1680, ticks at each full wheel turn (2.9 turns), dimension '6.7 m'. Bottom, 'COG 33': the same wheel rolls only to x {180 + RUN_BIG * 1000 * KR:.0f} (0.97 turn), dimension '2.2 m' in yellow. Both start on one dashed start line.",
     motion="One pedal turn, the same 2.4 s for both: the top wheel rolls three times as far as the bottom one in the same time, each leaving its tick marks; the dimension lines draw behind them; the values are written as they stop.",
     carries="The bottom road with its yellow 2.2 m.", transition="The sheet tilts up to the hill of s01 as the bike is drawn back on it.",
     sound="A freewheel tick under each rolling wheel (the top one ticks three times as often).",
     check=f"6.73 m and 2.24 m are drawn as 1500 and {RUN_BIG * 1000 * KR:.0f} px: 3 : 1. The wheel's circumference is {CIRC * KR:.0f} px.",
     facts=["f10"],
     frames=[fr(0, "Both wheels on the dashed start line.", road(380, 0, 0), road(700, 0, 0, ACC), {"line": [180, 220, 180, 760], "dashed": True, "width": 3}, label(180, 200, "1 PEDAL TURN", 32), label(1840, 340, "COG 11", 34, align="end"), label(1840, 660, "COG 33", 34, align="end", colour=ACC), tblock("DISTANCE PER PEDAL TURN", 5, "UNITS: m"), cap(C14)),
             fr(0.5, "Half a pedal turn: the top wheel is three times as far along.", road(380, RUN_SMALL / 2, 1), road(700, RUN_BIG / 2, 0, ACC), {"line": [180, 220, 180, 760], "dashed": True, "width": 3}, {"move": [300, 260, 900, 260], "text": "fast"}, {"move": [300, 580, 500, 580], "text": "slow"}, tblock("DISTANCE PER PEDAL TURN", 5, "UNITS: m"), cap(C14)),
             fr(1, "One pedal turn: 6.7 m against 2.2 m.", road(380, RUN_SMALL, 2.9), road(700, RUN_BIG, 0.97, ACC), {"line": [180, 220, 180, 760], "dashed": True, "width": 3}, dim(180, 1680, 440, "6.7 m", 42), dim(180, round(180 + RUN_BIG * 1000 * KR), 760, "2.2 m", 42, colour=ACC), tblock("DISTANCE PER PEDAL TURN", 5, "UNITS: m"), {"cut": "back to the hill"}, cap(C14))])

C15 = "Slower, but much *easier*."
UP = (RAX[0] + 60 * math.cos(math.radians(6)), RAX[1] - 60 * math.sin(math.radians(6)))  # the bike 60 px further up the slope
PED = bike(axle=UP)[1]((CS_H + CRANK * math.cos(math.radians(-60)), -BB_DROP + CRANK * math.sin(math.radians(-60))))


def arc_arrow(cx, cy, r, a0, a1, colour=ACC, width=6):
    x0, y0 = cx + r * math.cos(math.radians(a0)), cy + r * math.sin(math.radians(a0))
    x1, y1 = cx + r * math.cos(math.radians(a1)), cy + r * math.sin(math.radians(a1))
    t = math.radians(a1 + 90)  # the direction of travel at the end (clockwise on screen)
    h1 = (x1 - 26 * math.cos(t) + 12 * math.cos(t + math.pi / 2), y1 - 26 * math.sin(t) + 12 * math.sin(t + math.pi / 2))
    h2 = (x1 - 26 * math.cos(t) - 12 * math.cos(t + math.pi / 2), y1 - 26 * math.sin(t) - 12 * math.sin(t + math.pi / 2))
    return {"path": f"M{x0:.0f} {y0:.0f} A{r} {r} 0 0 1 {x1:.0f} {y1:.0f} M{h1[0]:.0f} {h1[1]:.0f} L{x1:.0f} {y1:.0f} L{h2[0]:.0f} {h2[1]:.0f}", "colour": colour, "width": width}


TORQUE_ARC = arc_arrow(UP[0], UP[1], 300, 195, 280)
shot("s15", "bike", "wide", 3, C15,
     teaches="The payoff on the hill: slower, but the wheel gets three times the turning force from the same push.",
     screen="Sheet 1 again: the bike on the 6-degree hill as in s01. A curved yellow arrow round the rear wheel 'TORQUE ×3'; a small white arrow at the pedal 'SAME PUSH'; a short blue-white speed arrow along the slope 'SLOW'.",
     motion="The bike creeps up the slope (the drawing slides along the ground line about 60 px over the shot) while the crank turns; the arrows are drawn in turn.",
     carries="The bike on the hill.", transition="The sheet slides off to the left; the summary sheet slides in.",
     sound="A slow freewheel-and-chain cadence; the bed lifts a little.",
     check="The torque arrow is on the rear wheel, not the pedal; the bike is the same drawing as s01.",
     facts=["f9", "f10", "f11"],
     frames=[fr(0, "The bike on the hill; the crank turns.", BIKE_ALL, {"move": [500, 860, 640, 845], "text": ""}, tblock('MOUNTAIN BIKE 29"', 1), cap(C15)),
             fr(1, "Arrows: TORQUE ×3 round the rear wheel, SAME PUSH at the pedal, slow along the slope.", bike(axle=(UP[0], UP[1]))[0], TORQUE_ARC, label(110, 250, "TORQUE ×3", 46, align="start", colour=ACC), {"line": [round(PED[0]) + 20, round(PED[1]) + 10, round(PED[0]) + 90, 800], "width": 3}, label(round(PED[0]) + 100, 812, "SAME PUSH", 32, align="start"), {"move": [1150, 560, 1350, 540], "text": "slow"}, tblock('MOUNTAIN BIKE 29"', 1), {"cut": "summary sheet"}, cap(C15))])

C16 = "Small driving big: *slower, but stronger*."
KM = 2.6
MINI_PAIR = pair(0, marks=False, k=KM, big=(300, 420), small=(300 + round(CENTRE * KM), 420))
BOX = ["M100 130 H610 V820 H100 Z", "M705 130 H1215 V820 H705 Z", "M1310 130 H1820 V820 H1310 Z"]
R11M, R33M = pitch_d(SMALL) / 2 * 1.5, pitch_d(BIG) / 2 * 1.5
MINI_COGS = [{"path": gear_path(820, 420, SMALL, R11M, R11M + 5, R11M - 6), "colour": ACC, "width": 4}, {"path": gear_path(1060, 420, BIG, R33M, R33M + 5, R33M - 6), "colour": ACC, "width": 4},
             label(820, 560, "11", 36), label(1060, 560, "33", 36)]
MINI_ROADS = ([{"line": [1350, 380, 1790, 380], "width": 3}, {"ring": [1765, 355, 25], "width": 4}] + dim(1370, 1765, 430, "6.7 m", 32)
              + [{"line": [1350, 560, 1790, 560], "width": 3}, {"ring": [1500, 535, 25], "colour": ACC, "width": 4}] + dim(1370, 1500, 610, "2.2 m", 32, colour=ACC))


def box_text(i, l1, l2, accent=False):
    x = [355, 960, 1565][i]
    return [label(x, 700, l1, 40), label(x, 760, l2, 40, **({"colour": ACC} if accent else {}))]


shot("s16", "answer", "recap", 5, C16,
     teaches="The answer in one sheet: a small gear driving a big one turns it slower and with more torque; on a bike that is the big rear sprocket, paid for in distance per pedal turn.",
     screen="Sheet 'SUMMARY', three boxes across the sheet (x 100 to 1820, y 130 to 820), each a small drawing with two lines of capitals under it: (1) the 12/36 gear pair at 2.6 px per mm, '12 → 36' / '1/3 TURN · TORQUE ×3'; (2) the 11 and 33 sprockets side by side, '11 vs 33' / 'WHEEL TORQUE ×3'; (3) the two roads, 'THE PRICE' / '2.2 m PER PEDAL TURN'. The second lines in yellow.",
     motion="The three boxes draw on left to right, one per beat; inside each the miniature redraws quickly (the same drawing as before, smaller); the lines are written; the yellow lines last.",
     carries="The sheet, which slides back to the bike.", transition="The summary sheet slides out; the hill sheet slides back into exactly the place it had at frame 0.",
     sound="Three pen ticks rising in pitch; the bed opens up.",
     check="Readable with the sound off; the numbers are the ones shown before (12, 36, 11, 33, 6.7 m, 2.2 m).",
     facts=["f2", "f3", "f9", "f10"],
     frames=[fr(0, "The first box: the gear pair, small, and its two lines.", {"path": BOX[0], "width": 4}, MINI_PAIR, box_text(0, "12 → 36", "1/3 TURN · TORQUE ×3", True), tblock("SUMMARY", 5), cap(C16)),
             fr(0.5, "The second box: the 11 and 33 sprockets.", {"path": BOX[0] + " " + BOX[1], "width": 4}, MINI_PAIR, box_text(0, "12 → 36", "1/3 TURN · TORQUE ×3", True), MINI_COGS, box_text(1, "11 vs 33", "WHEEL TORQUE ×3", True), tblock("SUMMARY", 5), cap(C16)),
             fr(1, "The third box: the price, 2.2 m per pedal turn against 6.7 m.", {"path": " ".join(BOX), "width": 4}, MINI_PAIR, box_text(0, "12 → 36", "1/3 TURN · TORQUE ×3", True), MINI_COGS, box_text(1, "11 vs 33", "WHEEL TORQUE ×3", True), MINI_ROADS, box_text(2, "THE PRICE", "2.2 m PER PEDAL TURN", True), tblock("SUMMARY", 5), {"cut": "bike sheet returns"}, cap(C16))])

C17 = "That's why"
shot("s17", "answer", "wide", 3, C17,
     teaches="The bridge: the last caption runs into the first ('That\'s why / a bigger rear gear makes a hill feel easy').",
     screen="The summary sheet slides out to the left; sheet 1 (the bike on the hill, chain on the yellow 33-tooth sprocket, title block 'MOUNTAIN BIKE 29\"') slides back to exactly the place it has at frame 0. Caption: 'THAT'S WHY'.",
     motion="A sheet slide (eased, 1.2 s) and a settle; the last 0.4 s holds the frame-0 picture so the loop cut is invisible.",
     carries="Into s01: the same picture.", transition="No cut: the film loops straight into s01.",
     sound="The bed runs on into the opening (the music's tail is laid over frame 0 in the mix).",
     check="The last frame matches frame 0 (check.mjs compares them).",
     frames=[fr(0, "The summary sheet slides out; the hill sheet slides in from the right.", bike(axle=(RAX[0] + 520, RAX[1]))[0], {"move": [1500, 300, 1000, 300], "text": "sheet returns"}, tblock('MOUNTAIN BIKE 29"', 1), cap(C17)),
             fr(1, "The opening picture, a moment before frame 0.", BIKE_ALL, tblock('MOUNTAIN BIKE 29"', 1), {"cut": "loop to s01"}, cap(C17))])

for s in shots:
    s.pop("_end")
duration = shots[-1]["end"]

storyboard = {
    "title": "Why does a bigger rear gear make hills easier?",
    "template": "blueprint",
    "standard": 3,
    "question": "Why does shifting to a bigger rear gear make a hill feel easier, when your legs are just as strong as before?",
    "audience": "Curious teenagers and adults anywhere who ride a bike and have shifted gears on a hill. They know gears from machines and clocks, and many have heard the word 'torque' from car or motorbike specs, but they have never seen why a small gear driving a big one turns it more strongly.",
    "promise": "A small gear driving a big one trades speed for torque: with three times the teeth, the big gear turns three times slower but with three times the torque, and that is why a bigger rear gear makes a hill easier, at the price of more pedal turns.",
    "language": "en",
    "format": "1920x1080",
    "duration": round(duration, 3),
    "fps": 60,
    "captions": "pill",
    "loop": {"line": "That's why / a bigger rear gear makes a hill feel easy.", "picture": "The summary sheet slides out and sheet 1 (the bike on the hill, chain on the yellow 33-tooth sprocket) slides back to exactly its frame-0 place; the last 0.4 s is the frame-0 picture."},
    "look": {
        "accent": "#ffd166",
        "mood": "The Blueprint template, line by line: a blueprint sheet (#0d3b66 to #134e8a) with a fine 10 px grid, a heavier grid every 100 px and a title block in the bottom-right corner (x 1500 to 1840, y 872 to 1008); flat light, faint paper texture, a slight vignette; white lines (#e8f1ff) at two weights, thick outlines, thin dashed hidden edges and pitch circles, dash-dot centre lines; one accent (#ffd166) for the part or the value that matters (on this board, drawn in orange pencil); orthographic views and one detail view of real parts at true proportions; every drawing builds line by line at a steady pen speed; capitals in Share Tech Mono, small and spaced like annotations; dimension lines with arrows and real measurements, leader lines to part numbers in callout circles; a flat sheet with slow pushes and pans to the detail, as if leaning over it; one view per screen; paper grain and a slight ink bleed, no glow; never a colour fill, 3D shading or decoration. Captions: one short line in capitals along the bottom left (x 100, baseline y 985), beside the title block, the key word in the accent; nothing that must be read sits below y 850 except the caption and the title block.",
    },
    "music": {
        "track": "Composed for this film (to be made with kit/audio/music.mjs after the board is approved; not generated yet)",
        "bpm": BPM,
        "beat": round(BEAT, 6),
        "offset": 0,
        "start": 0,
        "note": "A calm, minimal bed composed for the film, as the template's Sound line asks: felt piano on a slow two-chord figure, a soft warm pad, a brushed shaker on the off-beats and a woodblock that ticks like teeth passing (it doubles the gear ticks in s04 and s05), 75 BPM, 54.4 s plus a tail that the mix lays over frame 0 so the loop is seamless. It thins under the gear mechanism (s04 to s08) and opens on the bicycle and the recap. Every shot starts on a beat. Effects per shot are in each shot's 'sound': soft pen and ruler strokes as lines draw on (the template's own), a compass squeak for circles, a quiet tooth click per tooth in s04 and s05, one soft ping on each '×3' (s08 and s13, the same idea), a light chain rattle in s10 and s12, freewheel ticks in s14 and s15. No whooshes, no impacts: a drawing table, not a trailer.",
    },
    "facts": [
        {"id": "f1", "claim": "Meshing gears pass their teeth one for one, so the driven gear turns (teeth of the driver ÷ teeth of the driven) times for each turn of the driver; two external gears turn in opposite directions. The film's s04 numbers three teeth as they pass and s05 turns the gears opposite ways.",
         "source": "Bureau of Naval Personnel, Basic Machines (NAVPERS 10624, 1946), ch. 6 'Gears', pp. 71-73: 'Wheel A has 10 teeth which mesh with the 40 teeth on wheel B. Wheel A will have to rotate four times to cause B to make one revolution'; 'When two external gears mesh, they rotate in opposite directions' (archive.org/details/BasicMachines10624). Also Shigley & Mischke, Mechanical Engineering Design, ch. 13 (via Wikipedia, 'Gear train')."},
        {"id": "f2", "claim": "The film's pair: 12 teeth driving 36. Ratio 36 ÷ 12 = 3. One turn of the 12-tooth gear moves 12 teeth past the mesh, which is 12/36 = 1/3 of a turn of the big gear = 120°. On screen: '12', '36', '1 TURN · 360°', '1/3 TURN · 120°', 'a third'.",
         "source": "Arithmetic from f1 (storyboard.build.py asserts it)."},
        {"id": "f3", "claim": "At the pitch point the tooth of each gear pushes the other with the same force F (action and reaction). Torque is force times the distance from the axle, so the small gear's torque is F × 18 mm and the big gear's F × 54 mm: three times as much. This is the gear's mechanical advantage, teeth of the driven ÷ teeth of the driver = 36/12 = 3 (ideal, with no losses). On screen: 'r 18', 'r 54', '54 ÷ 18 = 3', 'TORQUE ×3'. Simplification: the tooth force really acts along the line of action at the 20° pressure angle; the arrows show its tangential part, which is the part that turns the gear; friction losses (small for spur gears) are left out.",
         "source": "Basic Machines (1946), ch. 6, 'Magnifying force with gears', p. 74: 'M.A. (theoretical) = To/Ta, in which To = number of teeth on driven gear; Ta = number of teeth on driver gear', and 'wherever there is a speed reduction, the effect of the effort you apply is multiplied'; Wikipedia, 'Gear train', 'Torque ratio analysis using virtual work' and 'Mechanical advantage' (MA = N_B / N_A)."},
        {"id": "f4", "claim": "The pair's dimensions, standard spur gears of module m = 3 mm: pitch diameter d = z × m = 36 mm (12 teeth) and 108 mm (36 teeth), so pitch radii 18 and 54 mm; tip diameter d + 2m (42 and 114 mm); root diameter d − 2.5m (28.5 and 100.5 mm); centre distance (12 + 36) × 3 / 2 = 72 mm. Drawn at 6 px per mm. On screen: 'Ø108 · 36 TEETH', 'Ø36 · 12 TEETH', 'm 3'. Simplification: the teeth are drawn as straight-flanked trapezoids at true addendum and dedendum, not exact involutes, and a real 12-tooth 20° gear is usually profile-shifted to avoid undercut (KHK's own 12-tooth example uses x = +0.6); the drawing shows the unshifted standard proportions.",
         "source": "KHK Gears, Gear Technical Reference, 'Calculation of Gear Dimensions', 4.1 Spur gears, Table 4.1: reference diameter d = zm, addendum 1.00m, tooth depth 2.25m, tip diameter d + 2m, root diameter d − 2.5m (khkgears.net)."},
        {"id": "f5", "claim": "A gear pair exchanges speed for torque: what the driven gear gains in torque it loses in speed (1/3 the speed × 3 times the torque = the same power, minus friction). On screen: 'Speed is traded for torque', 'TURNS 1/3', 'TORQUE ×3', 'TRADED'.",
         "source": "University of Florida, EML2322L Design and Manufacturing Lab, 'Gears and gearing': 'The primary purpose of gears is to exchange speed for torque or vice-versa' (web.mae.ufl.edu/designlab); Wikipedia, 'Gear train' (virtual work: torque ratio = speed ratio)."},
        {"id": "f6", "claim": "Bicycle chain has a 1/2-inch (12.7 mm) pitch (ANSI #40, ISO 606 #08). A sprocket's pitch diameter is p / sin(180°/N): 11 teeth Ø45.08 mm, 33 teeth Ø133.61 mm, 32 teeth Ø129.57 mm, 51 teeth Ø206.30 mm. Pitch radii 22.54 and 66.80 mm (on screen 'Ø45.1', 'Ø133.6', 'r 22.5', 'r 66.8'); 66.80 / 22.54 = 2.96.",
         "source": "Wikipedia, 'Bicycle chain', section Pitch (1/2 in, ANSI #40, ISO 606 #8); sprocket pitch diameter formula PD = P / sin(180°/N) per ASME B29.1 as given by Engineers Edge, 'Sprocket Pitch Diameter' and the Autodesk Inventor help 'Geometry Design Properties of Roller Chains' (read through search summaries; the formula's page is an image). Arithmetic in storyboard.build.py."},
        {"id": "f7", "claim": "The real drivetrain drawn: Shimano Deore CS-M5100 11-speed cassette, 11-51 teeth, sprockets 11-13-15-18-21-24-28-33-39-45-51; Shimano Deore FC-M5100-1 crankset, 32-tooth chainring, 175 mm cranks (also made with 30 teeth and 170 mm). This group is fitted, for example, to the Polygon Xtrada 6 (2024). On screen: '11 TEETH', '33 TEETH', 'FRONT CHAINRING 32', 'CASSETTE 11–51 TEETH'.",
         "source": "Shimano product pages for CS-M5100-11 and FC-M5100-1 (bike.shimano.com, via search); sprocket list from SJS Cycles and bike-components.de listings of the CS-M5100 11-51T; chainring and crank options from Halfords and Competitive Cyclist listings; Xtrada 6 (2024) spec via bikesonline.com (search summary). The Shimano pages themselves refused a direct fetch (403)."},
        {"id": "f8", "claim": "The bike drawn is the side elevation of a Polygon Xtrada 7 (2021), size XL, 29 in: chainstay 435 mm (430.1 horizontal), bottom-bracket drop 65 mm, wheelbase 1191 mm, stack 637, reach 470, seat tube 500 mm c-t, head angle 67°, seat angle 75°, head tube 105 mm, fork offset 44.3 mm, tyre 29 × 2.25 in (outer Ø736.3 mm), cranks 175 mm. Simplifications: the saddle height (760 mm from the bottom bracket), stem and bar are drawn for a rider of the size, the rear derailleur is drawn as its two pulleys only, and the hill is a 6° slope chosen for the picture (no grade is stated on screen). The cassette and chainring of f7 are drawn on this frame.",
         "source": "bikeinsights.com, '2021 Polygon Bikes Xtrada 7 XL 29\"' geometry (fetched). The same chainstay figures appear for the Xtrada 6 (2024) in its listing (search summary)."},
        {"id": "f9", "claim": "With the same chainring and the same push on the pedals, the chain's pull is the same whichever rear sprocket it is on (pull = crank torque ÷ chainring pitch radius). The rear sprocket is fixed to the wheel while pedalling, so the torque at the wheel is that pull × the sprocket's pitch radius: 66.80 / 22.54 = 2.96 times as much on the 33 as on the 11; averaged over a turn it is exactly 33/11 = 3 (the work done per pedal turn is the same). On screen: 'The chain pulls the same', 'The 33 gives the wheel 3 times the torque', 'TORQUE ×3'. Losses in the chain are left out.",
         "source": "Basic Machines (1946), ch. 3 'The wheel and axle', p. 33: 'When you are pedaling, the sprocket is fixed to the wheel, so the combination is a true wheel-and-axle machine'; torque = force × radius and MA = teeth ratio as in f3; Wikipedia, 'Gear train' ('The speed ratios of chain and belt drives are computed in the same way as gear ratios'). Arithmetic in storyboard.build.py."},
        {"id": "f10", "claim": "Distance per pedal turn: the chain moves 32 teeth per crank turn, so the wheel turns 32/11 = 2.91 times on the 11 and 32/33 = 0.97 times on the 33. The tyre's circumference is π × 736.3 = 2313 mm, so one pedal turn moves the bike 6.73 m on the 11 and 2.24 m on the 33: three times the pedal turns for the same distance. On screen: '6.7 m', '2.2 m', '1 PEDAL TURN'.",
         "source": "Arithmetic from f7 and f8 (tyre outer diameter 736.3 mm from bikeinsights.com), shown in storyboard.build.py; rolling without slip."},
        {"id": "f11", "claim": "Why the hill feels lighter: climbing needs a certain force at the tyre; on the bigger sprocket the same push on the pedal gives about three times the turning force at the wheel (f9), so a third of the push does the same job, at a third of the distance per pedal turn (f10). On screen: 'A bigger rear gear makes a hill feel easy', 'Slower, but much easier', 'SAME PUSH'.",
         "source": "Follows from f9 and f10; the trade of speed for torque is f5 (UF EML2322L)."},
    ],
    "acts": [
        {"id": "hook", "title": "The question", "goal": "The everyday puzzle: the big rear sprocket makes the hill light, with the same legs.", "rail": False},
        {"id": "gears", "title": "Gears", "goal": "Two gears, 12 and 36: a third of the speed, three times the torque, and why (same push, three times the distance).", "rail": True},
        {"id": "bike", "title": "The bike", "goal": "The real bike: the chain, the 11 and the 33, three times the torque at the wheel, paid for in distance per pedal turn.", "rail": True},
        {"id": "answer", "title": "The answer", "goal": "One summary sheet, then the bridge back into the first line.", "rail": False},
    ],
    "shots": shots,
}

out = HERE / "storyboard.json"
out.write_text(json.dumps(storyboard, ensure_ascii=False, indent=2) + "\n")
chars = [(s["id"], len(s["caption"].replace("*", "")), len(s["caption"].replace("*", "")) / (s["end"] - s["start"] - 0.5)) for s in shots if s.get("caption")]
print(f"{len(shots)} shots, {sum(len(s['frames']) for s in shots)} frames, {duration:.1f} s -> {out}")
for sid, n, cps in chars:
    print(f"  {sid}: {n} chars, {cps:.1f} chars/s")
