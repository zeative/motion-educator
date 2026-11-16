"""Writes storyboard.json for "Why do onions make you cry?" (landscape, 1920 x 1080, narrated in English).

The film is cut to one take of narration. This script writes the plan: the shots, each with its run of the script
and its drawn frames. The times it writes are a guess; the take sets the real ones, so the script ends by asking
the voice tool to retime the board (it does nothing until a take is there):

    python3 examples/onion-tears/storyboard.build.py && node kit/tools/storyboard.mjs examples/onion-tears --png

The pictures, in the order the explanation needs them: a real onion (3D) cut on a board; the cells of its flesh,
magnified, each keeping its sulfur compounds and its enzyme apart; the knife bursting them; the two reactions in
the spilled juice; the gas molecule (3D, ball and stick); the gas drifting to a face; the eye's surface and its
nerves; the reflex to the tear gland; the tear film washing the gas off; two blade tips drawn to scale with each
other and the droplets each throws, in their measured ratio; the recap; the poster.
"""
import json
import math
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
shots = []

# The colour code, kept all film (film.css has the same values).
SULF = "#e8a21a"  # sulfur compounds (amber)
ALLI = "#8a6cf0"  # the first enzyme, alliinase (violet)
ACID = "#ef6c2a"  # the unstable acid (orange)
LFS = "#e8409a"  # the second enzyme, lachrymatory-factor synthase (magenta)
GAS = "#7cc21a"  # the gas, syn-propanethial-S-oxide (lime, the accent)
TEAR = "#2f8fe0"  # tears (water blue)
NERVE = "#d9382e"  # the nerve signal (red)


def shot(id, act, type, length=None, **fields):
    """A speaking shot's length is the take's. A silent beat keeps the length it is given here."""
    start = shots[-1]["end"] if shots else 0
    guess = length if length is not None else round(len(fields.get("voice", "")) / 15 + 0.3, 2)
    shots.append({"id": id, "act": act, "type": type, "start": round(start, 3), "end": round(start + guess, 3), **fields, "frames": FRAMES[id]})


def fr(at, note, *draw):
    return {"at": at, "note": note, "draw": list(draw)}


def label(x, y, text, size=40, **more):
    return {"label": [x, y], "text": text, "size": size, **more}


def chip(x, y, text):
    return {"chip": [x, y], "text": text}


# ── Things the sketcher lacks, as paths ──────────────────────────────────────────────────────────────────────
def onion(cx, cy, r, colour="violet", cut=False):
    """A bulb: round, a pointed neck, a flat root. cut=True adds the rings of a cut face."""
    pts = []
    for i in range(0, 41):
        a = -math.pi / 2 + math.pi * i / 40
        x, y = math.cos(a), math.sin(a)
        if y < 0:  # upper half (screen y up is negative): stretch into a neck
            y = y * (1 + 0.42 * (-y) ** 3)
            x = x * (1 - 0.1 * (-y) ** 4)
        y = min(y, 0.9)
        pts.append((x, y))
    right = " ".join(f"L{cx + x * r:.0f} {cy + y * r:.0f}" for x, y in pts)
    left = " ".join(f"L{cx - x * r:.0f} {cy + y * r:.0f}" for x, y in reversed(pts))
    d = f"M{cx:.0f} {cy - 1.42 * r:.0f} {right} {left} Z"
    out = [{"path": d, "colour": colour, "fill": colour, "width": 8}]
    if cut:
        for k in (0.8, 0.6, 0.4, 0.2):
            out.append({"ring": [cx, cy + 0.1 * r, k * r], "colour": colour, "width": 4})
    return out


def knife(x, y, angle=0, length=620, colour="ink"):
    """A chef's knife seen from the side, its edge pointing down; (x, y) is the edge's middle."""
    h = 120
    d = f"M{x - length / 2:.0f} {y - h:.0f} L{x + length / 2:.0f} {y - h:.0f} Q{x + length / 2 + 40:.0f} {y - 40:.0f} {x + length / 2 - 60:.0f} {y:.0f} L{x - length / 2:.0f} {y:.0f} Z"
    handle = f"M{x - length / 2:.0f} {y - h + 14:.0f} L{x - length / 2 - 260:.0f} {y - h + 20:.0f} L{x - length / 2 - 260:.0f} {y - 34:.0f} L{x - length / 2:.0f} {y - 30:.0f} Z"
    return [{"path": d, "colour": colour, "fill": "white", "width": 7}, {"path": handle, "colour": colour, "fill": colour, "width": 6}]


def board(y=880):
    return {"path": f"M200 {y} L1720 {y} L1760 {y + 70} L160 {y + 70} Z", "colour": "orange", "fill": "orange", "width": 6}


def wisps(x0, y0, x1, y1, n=3, colour=GAS):
    """Rising gas: a few soft S-curves from (x0, y0) toward (x1, y1)."""
    out = []
    for k in range(n):
        dx = (k - (n - 1) / 2) * 60
        out.append({"path": f"M{x0 + dx:.0f} {y0:.0f} C{x0 + dx + 120:.0f} {y0 - 160:.0f} {x1 - 160 + dx:.0f} {y1 + 140:.0f} {x1 + dx * 0.4:.0f} {y1:.0f}", "colour": colour, "width": 6, "dashed": True})
    return out


# The cell sheet: elongated cells in offset rows, magnified. Each cell: a wall, a thin band of cytoplasm with amber
# dots, and a big vacuole holding the violet enzyme. Sheet framing: cells 300 x 124 px, rows offset by half a cell.
CW, CH = 300, 124


def cell(x, y, w=CW - 12, h=CH - 12, burst=False):
    out = [{"path": f"M{x:.0f} {y:.0f} h{w:.0f} v{h:.0f} h{-w:.0f} Z", "colour": "violet", "width": 5, **({"dashed": True} if burst else {})}]
    if not burst:
        out.append({"path": f"M{x + 22:.0f} {y + 22:.0f} h{w - 44:.0f} v{h - 44:.0f} h{-(w - 44):.0f} Z", "colour": ALLI, "fill": ALLI, "width": 3})
        out += [{"dot": [x + 11 + k * (w - 22) / 4, y + 11, 6], "colour": SULF} for k in range(5)]
    return out


def sheet(rows=(0, 1, 2, 3, 4, 5, 6, 7), cols=7, y0=-40, skip=()):
    out = []
    for r in rows:
        off = (r % 2) * CW / 2 - CW / 2
        for c in range(cols + 1):
            x = off + c * CW
            if (r, c) in skip:
                continue
            out += cell(x, y0 + r * CH)
    return out


# The big cell (s04): one cell filling the frame.
BIG = [{"path": "M80 120 h1760 v620 h-1760 Z", "colour": "violet", "width": 12}, {"path": "M190 230 h1540 v400 h-1540 Z", "colour": ALLI, "fill": ALLI, "width": 6}]
BIG_SULF = [{"dot": [140 + k * 120, 170, 16], "colour": SULF} for k in range(14)] + [{"dot": [140 + k * 120, 690, 16], "colour": SULF} for k in range(14)]
BIG_ALLI = [{"dot": [380 + k * 260, 430 + (k % 2) * 60 - 30, 40], "colour": ALLI} for k in range(5)]


def bead(x, y, r, colour):
    return {"dot": [x, y, r], "colour": colour}


def enzyme(x, y, r, colour):
    """An enzyme: a round body with a pocket cut into it (where the molecule it works on sits)."""
    a0, a1 = 0.55, -0.55
    d = f"M{x + r * math.cos(a0):.0f} {y + r * math.sin(a0):.0f} A{r} {r} 0 1 1 {x + r * math.cos(a1):.0f} {y + r * math.sin(a1):.0f} L{x + r * 0.35:.0f} {y:.0f} Z"
    return {"path": d, "colour": colour, "fill": colour, "width": 7}


# The face, in profile, looking left; the eye at (1380, 380).
EYE = (1380, 380)
FACE = {"path": "M1980 -20 L1560 -20 Q1350 20 1330 200 Q1325 300 1300 340 L1240 470 Q1232 492 1262 500 L1300 506 Q1290 560 1312 600 Q1300 640 1330 680 Q1340 740 1420 760 L1500 780 L1520 1100 L1980 1100 Z", "colour": "ink", "fill": "ink", "width": 7}
EYE_MARK = [{"path": "M1340 372 Q1380 350 1420 372 Q1380 398 1340 372 Z", "colour": "ink", "fill": "white", "width": 5}, {"dot": [1372, 374, 9], "colour": "ink"}]

# The eye's surface, macro (s13, s16): the cornea as a curved band across the frame, nerve endings reaching up into it.
CORNEA = {"path": "M-20 760 Q960 300 1940 760 L1940 860 Q960 400 -20 860 Z", "colour": "blue", "fill": "#cfe6ff", "width": 7}
NERVES = [{"path": f"M{x:.0f} 1100 C{x + 20:.0f} 960 {x - 40:.0f} 880 {x + 10:.0f} {700 - 260 * math.exp(-((x - 960) / 700) ** 2) + 80:.0f}", "colour": NERVE, "width": 5} for x in (260, 560, 860, 1160, 1460, 1760)]

# The head in profile for the reflex (s14, s15): face looking left, eye at (620, 470), brain behind it.
HEAD = {"path": "M760 40 Q1300 -40 1560 260 Q1700 470 1560 700 L1480 1100 L820 1100 L800 900 Q640 900 600 840 Q560 760 600 720 Q560 690 580 640 L520 560 Q500 530 540 520 L560 420 Q540 200 760 40 Z", "colour": "ink", "width": 8}
BRAIN = {"path": "M760 150 Q1000 60 1300 140 Q1500 240 1460 430 Q1400 560 1180 560 Q980 580 860 500 Q700 420 720 300 Z", "colour": "violet", "fill": "violet", "width": 5}
EYE2 = (620, 470)
GLAND = (690, 405)
PATH_IN = {"curve": [[620, 470], [760, 520], [960, 600], [1150, 640], [1200, 620]], "colour": NERVE, "width": 7}
PATH_OUT = {"curve": [[1200, 620], [1050, 560], [880, 470], [760, 420], [690, 405]], "colour": TEAR, "width": 7}

# The knife test (s17 to s19): two blade tips side by side, drawn to scale with each other at 6 px a micrometre:
# sharpest tip radius 0.91 um = 5.5 px, bluntest 13.3 um = 80 px (Wu et al. 2025). Onion layer not to scale.
SHARP_X, BLUNT_X, LAYER_Y = 520, 1400, 560


def blade(x, tip_r, y_tip, half=0.26):
    """A wedge coming down to a rounded tip of radius tip_r (px) at y_tip."""
    top = y_tip - 520
    k = math.tan(half)
    xl, xr = x - tip_r - (y_tip - top) * k, x + tip_r + (y_tip - top) * k
    return {"path": f"M{xl:.0f} {top:.0f} L{x - tip_r:.0f} {y_tip - tip_r:.0f} A{tip_r:.1f} {tip_r:.1f} 0 0 0 {x + tip_r:.0f} {y_tip - tip_r:.0f} L{xr:.0f} {top:.0f} Z", "colour": "ink", "fill": "white", "width": 6}


def layer(x, dent=0, w=640):
    """The onion's first layer: a tough skin over soft cells, dented down by `dent` px under the blade."""
    return [{"path": f"M{x - w / 2:.0f} {LAYER_Y} L{x - 120:.0f} {LAYER_Y} Q{x:.0f} {LAYER_Y + 2 * dent} {x + 120:.0f} {LAYER_Y} L{x + w / 2:.0f} {LAYER_Y}", "colour": "violet", "width": 10},
            {"path": f"M{x - w / 2:.0f} {LAYER_Y + 18} h{w} v240 h{-w} Z", "colour": "violet", "fill": "#f3e3f0", "width": 4}]


def drops(x, n, spread=220, y=520, seed=1):
    out = []
    for k in range(n):
        a = math.pi * (0.15 + 0.7 * ((k * 0.618 + seed * 0.13) % 1))
        rr = 60 + ((k * 0.377) % 1) * spread
        out.append({"dot": [round(x + math.cos(a) * rr * 1.2), round(y - math.sin(a) * rr), 5], "colour": TEAR})
    return out


# Recap cards (s20 to s22): four cards along the frame, each with its small picture.
def recap_cards(n=4):
    xs = [80, 530, 980, 1430]
    titles = ["kept apart", "cut: they mix", "2nd enzyme: gas", "eye: tears"]
    out = []
    for i in range(n):
        x = xs[i]
        out.append({"card": [x, 150, 410, 400]})
        out.append(label(x + 205, 500, titles[i], 36))
    if n >= 1:
        out += [{"path": f"M{xs[0] + 60} 210 h290 v200 h-290 Z", "colour": "violet", "width": 5}, {"path": f"M{xs[0] + 100} 250 h210 v120 h-210 Z", "colour": ALLI, "fill": ALLI, "width": 3}]
    if n >= 2:
        out += [bead(xs[1] + 150, 300, 22, SULF), enzyme(xs[1] + 260, 300, 50, ALLI), {"line": [xs[1] + 40, 200, xs[1] + 380, 420], "colour": "ink", "width": 6}]
    if n >= 3:
        out += [bead(xs[2] + 110, 310, 22, ACID), enzyme(xs[2] + 220, 310, 50, LFS), bead(xs[2] + 340, 260, 22, GAS)]
    if n >= 4:
        out += [{"path": f"M{xs[3] + 90} 300 Q{xs[3] + 205} 220 {xs[3] + 320} 300 Q{xs[3] + 205} 380 {xs[3] + 90} 300 Z", "colour": "ink", "width": 6}, {"dot": [xs[3] + 205, 300, 26], "colour": "ink"}, {"path": f"M{xs[3] + 150} 345 q-10 50 0 80", "colour": TEAR, "width": 8}]
    return out


POSTER = [{"title": [120, 700], "text": "Cutting mixes what\nthe onion keeps apart.", "size": 92, "align": "start", "accent": "keeps apart."}]

FRAMES = {
    "s01": [
        fr(0.0, "Frame 0 is finished: a red onion on a wooden board, lit from the upper left, the knife already coming down. The question sits on the left in metal type.",
           board(), *onion(1300, 600, 260), *knife(1300, 250), {"title": [110, 330], "text": "Why does\ncutting an onion\nmake you cry?", "size": 104, "align": "start", "accent": "cry?"},
           {"move": [1300, 120, 1300, 330], "text": "the knife"}, {"camera": "push"}),
        fr(0.5, "On 'onion' the blade is through; the two halves fall apart and their wet cut faces catch the light. The first lime wisps rise off them.",
           board(), *onion(1160, 600, 260, cut=True), *onion(1440, 600, 260, cut=True), *knife(1300, 860), *wisps(1300, 450, 1300, 160),
           {"title": [110, 330], "text": "Why does\ncutting an onion\nmake you cry?", "size": 104, "align": "start", "accent": "cry?"}),
        fr(1.0, "The question has been asked. The gas keeps rising; the camera has pushed four percent.",
           board(), *onion(1150, 600, 260, cut=True), *onion(1450, 600, 260, cut=True), *wisps(1300, 420, 1300, 80, 4),
           {"title": [110, 330], "text": "Why does\ncutting an onion\nmake you cry?", "size": 104, "align": "start", "accent": "cry?"}, {"cut": "the halves slide off left; a whole onion takes their place"}),
    ],
    "s02": [
        fr(0.0, "A whole onion, the same lighting, centred and larger: nothing rises from it. A chip names it.",
           board(), *onion(960, 560, 300), chip(1350, 300, "a whole onion"), {"glow": [500, 200, 200]}, {"camera": "push"}),
        fr(0.5, "'for weeks': the key light swings across it, day after day: its shadow turns on the board; a day count ticks at its true value.",
           board(), *onion(960, 560, 300), chip(1350, 300, "a whole onion"), {"glow": [1450, 200, 200]}, label(400, 300, "day 1 … day 21", 44), {"move": [500, 160, 1450, 160], "text": "days pass"}),
        fr(1.0, "'...never bother you': still no gas. The camera starts to dive into the onion's skin.",
           board(), *onion(960, 560, 300), chip(1350, 300, "no gas"), {"camera": "push"}, {"cut": "dive into the flesh"}),
    ],
    "s03": [
        fr(0.0, "The dive lands on a sheet of onion cells, magnified, filling the frame: long glassy cells in offset rows, their walls lit.",
           *sheet(), chip(1500, 60, "onion cells · magnified"), {"camera": "push"}),
        fr(0.55, "'keep two things apart': inside every cell the amber dots in the thin outer band and the violet sac in the middle light up in turn.",
           *sheet(), chip(1500, 60, "onion cells · magnified"), {"glow": [960, 470, 300], "colour": ALLI}),
        fr(1.0, "The camera pushes on one cell in the middle; the others slide out of the frame.",
           *sheet(), {"ring": [960, 470, 200], "colour": "violet"}, {"camera": "push"}, {"cut": "push into one cell"}),
    ],
    "s04": [
        fr(0.0, "One cell fills the frame: a thick wall, a thin band of cytoplasm around a big sac (the vacuole).",
           *BIG, {"camera": "push"}, label(960, 950, "one cell (simplified)", 32)),
        fr(0.4, "'sulfur compounds on one side': amber beads in the band light up and a chip lands on them.",
           *BIG, *BIG_SULF, chip(180, 60, "sulfur compounds"), {"arrow": [300, 90, 300, 150], "colour": SULF}),
        fr(1.0, "'...an enzyme on the other': violet enzymes drift in the sac; their chip lands. A soft line pulses along the sac's skin: the barrier.",
           *BIG, *BIG_SULF, *BIG_ALLI, chip(180, 60, "sulfur compounds"), chip(1300, 780, "enzyme (alliinase)"), {"move": [190, 640, 1730, 640], "text": "the barrier"}, {"cut": "pull back to the sheet"}),
    ],
    "s05": [
        fr(0.0, "Back on the sheet of cells. A steel blade edge enters from the top, huge at this magnification.",
           *sheet(), *knife(960, 80, length=900), {"move": [960, 40, 960, 400], "text": "the edge"}),
        fr(0.55, "'those cells burst': along the blade's path the walls tear and the sacs split; the contents begin to spill.",
           *sheet(skip={(r, c) for r in range(8) for c in (3, 4)}), *[x for r in range(8) for x in cell(-150 + (r % 2) * 150 + 3 * CW, -40 + r * CH, burst=True)], *knife(960, 700, length=900),
           {"scatter": [960, 500, 10, 60, 220], "colour": SULF}),
        fr(1.0, "The blade has passed; a wet seam of broken cells runs down the middle of the frame.",
           *sheet(skip={(r, c) for r in range(8) for c in (3, 4)}), {"path": "M900 -20 L1020 1100", "colour": ACID, "width": 30}, {"camera": "push"}, {"cut": "push into the seam"}),
    ],
    "s06": [
        fr(0.0, "Close in the seam: amber beads and violet enzymes pour out of the broken cells from both sides.",
           {"path": "M0 0 L700 0 L640 1080 L0 1080 Z", "colour": "violet", "width": 5}, {"path": "M1220 0 L1920 0 L1920 1080 L1280 1080 Z", "colour": "violet", "width": 5},
           bead(700, 300, 24, SULF), bead(760, 520, 24, SULF), enzyme(1200, 380, 60, ALLI), {"move": [600, 400, 860, 460], "text": "spill"}, {"move": [1320, 600, 1080, 560]}),
        fr(1.0, "'...spill together': the two are now in the same juice, mixed in the middle of the frame.",
           bead(820, 300, 24, SULF), bead(1040, 420, 24, SULF), bead(900, 620, 24, SULF), enzyme(960, 460, 60, ALLI), enzyme(780, 640, 60, ALLI), chip(860, 120, "mixed"), {"cut": "no cut: the reaction starts"}),
    ],
    "s07": [
        fr(0.0, "A violet enzyme closes on an amber sulfur compound in its pocket.",
           enzyme(820, 480, 150, ALLI), bead(880, 480, 46, SULF), chip(560, 230, "enzyme"), chip(1100, 230, "sulfur compound")),
        fr(0.5, "'snips': a flash in the pocket; the compound comes out as an orange acid that jitters.",
           enzyme(820, 480, 150, ALLI), bead(1180, 440, 46, ACID), {"scatter": [1180, 440, 8, 60, 100], "colour": ACID}, {"move": [960, 480, 1140, 450]}),
        fr(1.0, "The juice fills with jittering orange acid as enzymes everywhere do the same. Chip: 'unstable acid'.",
           bead(1180, 440, 46, ACID), bead(1400, 640, 40, ACID), bead(1500, 320, 40, ACID), bead(700, 760, 40, ACID), chip(1280, 200, "unstable acid"), {"cut": "the acid stays; the enzyme leaves"}),
    ],
    "s08": [
        fr(0.0, "The orange acid, alone, centred. A dashed arrow runs from it to an empty lime outline: the old idea.",
           bead(560, 480, 70, ACID), {"arrow": [700, 480, 1220, 480], "colour": "ink", "width": 6}, {"ring": [1360, 480, 70], "colour": GAS, "dashed": True}, label(960, 420, "by itself?", 48)),
        fr(0.5, "A card lands at the top: 'the old idea (until 2002)'. The acid flickers but nothing happens.",
           bead(560, 480, 70, ACID), {"arrow": [700, 480, 1220, 480], "colour": "ink", "width": 6}, {"ring": [1360, 480, 70], "colour": GAS, "dashed": True}, label(960, 420, "by itself?", 48),
           {"card": [610, 110, 700, 150], "label": "the old idea"}),
        fr(1.0, "The arrow and the outline fade: nothing appeared by itself.",
           bead(560, 480, 70, ACID), {"line": [700, 480, 1220, 480], "dashed": True}, {"card": [610, 110, 700, 150], "label": "the old idea"}, {"cut": "the card flips to the finding"}),
    ],
    "s09": [
        fr(0.0, "A second enzyme, magenta, flies in from the right with a ring of light.",
           bead(560, 480, 70, ACID), enzyme(1500, 480, 170, LFS), {"move": [1900, 480, 1560, 480], "text": "enter"}),
        fr(0.6, "'found a second enzyme': it settles; under it a citation card: Imai et al., Nature, 2002.",
           bead(560, 480, 70, ACID), enzyme(1300, 480, 170, LFS), {"card": [1000, 740, 620, 150], "label": "Imai et al. · Nature · 2002"}, chip(1180, 230, "a second enzyme")),
        fr(1.0, "Held; the enzyme turns slowly, its pocket facing the acid.",
           bead(560, 480, 70, ACID), enzyme(1300, 480, 170, LFS), {"card": [1000, 740, 620, 150], "label": "Imai et al. · Nature · 2002"}, {"camera": "push"}, {"cut": "it takes the acid"}),
    ],
    "s10": [
        fr(0.0, "The acid is drawn into the magenta pocket.",
           enzyme(1100, 480, 170, LFS), bead(1170, 480, 60, ACID), {"move": [700, 480, 1120, 480]}, chip(800, 230, "lachrymatory-factor synthase")),
        fr(1.0, "'making that gas': out comes a lime molecule, glowing, rising: the gas.",
           enzyme(1100, 480, 170, LFS), bead(1450, 300, 60, GAS), {"glow": [1450, 300, 120], "colour": GAS}, chip(1500, 160, "the gas"), {"move": [1300, 420, 1450, 320]}, {"cut": "dive into the molecule"}),
    ],
    "s11": [
        fr(0.0, "The gas molecule in 3D, ball and stick, turning: three carbons, a sulfur, an oxygen, six hydrogens.",
           *[bead(700 + k * 170, 420 + (k % 2) * 60, 46, "ink") for k in range(3)], bead(1210, 400, 56, SULF), bead(1330, 300, 44, "red"), {"camera": "orbit"}),
        fr(0.5, "'syn-propanethial-S-oxide': the name lands under it in metal type, the formula beside it.",
           *[bead(700 + k * 170, 420 + (k % 2) * 60, 46, "ink") for k in range(3)], bead(1210, 400, 56, SULF), bead(1330, 300, 44, "red"),
           {"title": [960, 820], "text": "syn-propanethial-S-oxide", "size": 84, "accent": "syn-propanethial-S-oxide"}, label(960, 900, "C₃H₆OS", 36)),
        fr(1.0, "'Quite a mouthful': it keeps turning; the name holds.",
           *[bead(700 + k * 170, 420 + (k % 2) * 60, 46, "ink") for k in range(3)], bead(1210, 400, 56, SULF), bead(1330, 300, 44, "red"),
           {"title": [960, 820], "text": "syn-propanethial-S-oxide", "size": 84, "accent": "syn-propanethial-S-oxide"}, {"camera": "pull"}, {"cut": "pull out to the kitchen"}),
    ],
    "s12": [
        fr(0.0, "The kitchen from the side: the cut onion on its board at lower left, a face in profile on the right.",
           {"path": "M100 880 L1000 880 L1020 940 L80 940 Z", "colour": "orange", "fill": "orange", "width": 6}, *onion(480, 760, 120, cut=True), FACE, *EYE_MARK, {"camera": "pull"}),
        fr(0.5, "'evaporates fast': lime wisps lift off the cut face.",
           {"path": "M100 880 L1000 880 L1020 940 L80 940 Z", "colour": "orange", "fill": "orange", "width": 6}, *onion(480, 760, 120, cut=True), FACE, *EYE_MARK, *wisps(480, 620, 800, 420, 3)),
        fr(1.0, "'...toward your face': the wisps reach the eye; a lime ring marks where they arrive.",
           {"path": "M100 880 L1000 880 L1020 940 L80 940 Z", "colour": "orange", "fill": "orange", "width": 6}, *onion(480, 760, 120, cut=True), FACE, *EYE_MARK, *wisps(480, 620, 1330, 380, 3),
           {"ring": [1372, 374, 60], "colour": GAS}, {"camera": "push"}, {"cut": "dive into the eye"}),
    ],
    "s13": [
        fr(0.0, "The eye's surface, magnified: the clear cornea as a curved band; under it, nerve endings reaching up into it. Gas molecules fall from above.",
           CORNEA, *NERVES, bead(700, 200, 20, GAS), bead(1100, 140, 20, GAS), bead(1400, 260, 20, GAS), chip(120, 120, "your eye's surface")),
        fr(0.5, "'it sets off': a molecule touches the surface; the nerve under it flashes red from its tip downward.",
           CORNEA, *NERVES, bead(860, 560, 20, GAS), {"scatter": [860, 560, 8, 30, 80], "colour": NERVE}, {"move": [860, 600, 860, 1000], "text": "signal"}),
        fr(1.0, "'...the nerves that sense pain': three nerves are firing; a chip names them.",
           CORNEA, *NERVES, bead(860, 560, 20, GAS), bead(1160, 540, 20, GAS), bead(560, 620, 20, GAS), chip(1300, 950, "pain nerves"), {"cut": "pull out to the head"}),
    ],
    "s14b": [
        fr(0.0, "The head in profile, filling the frame, the brain drawn inside. The eye at the left.",
           HEAD, BRAIN, {"dot": [620, 470, 18], "colour": "ink"}, {"camera": "pull"}),
        fr(0.3, "'They signal your brain': a red pulse runs from the eye to the brainstem; it lights.",
           HEAD, BRAIN, {"dot": [620, 470, 18], "colour": "ink"}, PATH_IN, {"glow": [1200, 620, 80], "colour": NERVE}, chip(1260, 700, "brain"), {"move": [700, 500, 1150, 630]}),
        fr(0.7, "'your tear glands': a blue pulse runs back to the gland above the eye, which lights blue.",
           HEAD, BRAIN, {"dot": [620, 470, 18], "colour": "ink"}, PATH_IN, PATH_OUT, {"glow": [690, 405, 60], "colour": TEAR}, chip(300, 300, "tear gland"), {"move": [1150, 600, 760, 430]}),
        fr(1.0, "'...to flush it out': tears well over the eye and run down the cheek.",
           HEAD, BRAIN, {"dot": [620, 470, 18], "colour": "ink"}, {"glow": [690, 405, 60], "colour": TEAR}, {"path": "M600 490 Q590 600 610 700", "colour": TEAR, "width": 12}, {"cut": "closer on the face"}),
    ],
    "s16": [
        fr(0.0, "The face again, close on the eye, a tear rolling. The word 'sad' sits by it, struck through.",
           FACE, *EYE_MARK, {"path": "M1350 400 Q1340 470 1352 540", "colour": TEAR, "width": 12}, label(1000, 300, "sad?", 60), {"line": [900, 285, 1100, 285], "width": 8}),
        fr(1.0, "Held: the tear runs; the struck word fades.",
           FACE, *EYE_MARK, {"path": "M1350 400 Q1340 520 1356 640", "colour": TEAR, "width": 12}, {"camera": "push"}, {"cut": "dive into the tear"}),
    ],
    "s17": [
        fr(0.0, "The eye's surface again: a wave of tear water sweeps across from the left.",
           CORNEA, *NERVES, bead(860, 560, 20, GAS), bead(1160, 540, 20, GAS), {"path": "M-20 700 Q300 560 600 640 L600 760 Q300 700 -20 820 Z", "colour": TEAR, "fill": TEAR, "width": 6}, {"move": [200, 520, 700, 520], "text": "tears"}),
        fr(1.0, "'washing itself': the water has covered the surface; the gas molecules are carried off to the right; the nerves go quiet.",
           CORNEA, *NERVES, {"path": "M-20 720 Q960 260 1940 720 L1940 800 Q960 340 -20 800 Z", "colour": TEAR, "fill": TEAR, "width": 6}, bead(1700, 520, 20, GAS), bead(1820, 600, 20, GAS), chip(760, 160, "washed away"), {"cut": "whip to the knife test"}),
    ],
    "s18": [
        fr(0.0, "Two blade tips side by side, magnified and drawn to scale with each other, over an onion layer: sharp on the left, blunt on the right.",
           blade(SHARP_X, 5.5, 380), blade(BLUNT_X, 80, 380), *layer(SHARP_X), *layer(BLUNT_X), chip(SHARP_X - 120, 60, "sharp"), chip(BLUNT_X - 120, 60, "blunt"),
           label(960, 1000, "blade tips to scale with each other · onion not to scale", 30)),
        fr(1.0, "'...your knife comes in': the tip radii are labelled from the study's measurements.",
           blade(SHARP_X, 5.5, 380), blade(BLUNT_X, 80, 380), *layer(SHARP_X), *layer(BLUNT_X), label(SHARP_X, 160, "tip ≈ 0.9 µm", 40), label(BLUNT_X, 160, "tip ≈ 13 µm", 40), {"cut": "both press down"}),
    ],
    "s19": [
        fr(0.0, "Both blades press into the layer at the same speed.",
           blade(SHARP_X, 5.5, 560), blade(BLUNT_X, 80, 560), *layer(SHARP_X, 4), *layer(BLUNT_X, 10), {"move": [BLUNT_X, 200, BLUNT_X, 380]}),
        fr(0.6, "'squashes the onion': the blunt one dents the skin deep and the cells under it glow with pressure; the sharp one is already through.",
           blade(SHARP_X, 5.5, 640), blade(BLUNT_X, 80, 660), *layer(SHARP_X, 0), *layer(BLUNT_X, 90), {"glow": [BLUNT_X, 680, 140], "colour": "red"}, chip(BLUNT_X + 160, 420, "squashed")),
        fr(1.0, "'...before it splits': the blunt blade breaks through with a burst of juice.",
           blade(SHARP_X, 5.5, 700), blade(BLUNT_X, 80, 720), *layer(SHARP_X, 0), *layer(BLUNT_X, 0), *drops(BLUNT_X, 30), {"cut": "the droplets are counted"}),
    ],
    "s20": [
        fr(0.0, "Each blade's droplets, counted as dots: a few over the sharp one, forty times as many over the blunt one.",
           blade(SHARP_X, 5.5, 700), blade(BLUNT_X, 80, 720), *layer(SHARP_X, 0), *layer(BLUNT_X, 0), *drops(SHARP_X, 3), *drops(BLUNT_X, 40)),
        fr(0.6, "'up to forty times more droplets': two bars rise at their measured ratio, 1 and 40.",
           *layer(SHARP_X, 0), *layer(BLUNT_X, 0), {"bar": [SHARP_X - 60, 860, 120, 14], "colour": TEAR}, {"bar": [BLUNT_X - 60, 860, 120, 560], "colour": TEAR},
           {"number": [BLUNT_X, 260], "text": "40×", "size": 130}, label(SHARP_X, 800, "1×", 48)),
        fr(1.0, "The source sits under the bars: Wu et al., Cornell, 2025.",
           {"bar": [SHARP_X - 60, 860, 120, 14], "colour": TEAR}, {"bar": [BLUNT_X - 60, 860, 120, 560], "colour": TEAR}, {"number": [BLUNT_X, 260], "text": "40×", "size": 130},
           label(960, 1000, "droplets thrown per cut, sharpest vs bluntest blade · Wu et al. 2025", 30), {"cut": "cards rise"}),
    ],
    "s21": [
        fr(0.0, "The recap: four cards rise one after another, each with its small picture.",
           *recap_cards(2), {"move": [1200, 700, 1200, 560], "text": "cards rise"}),
        fr(0.5, "All four cards: kept apart, cut and mixed, a second enzyme makes the gas, the eye makes tears.",
           *recap_cards(4)),
        fr(1.0, "Held while the line ends; the cards slide up to make room for the poster.",
           *recap_cards(4), {"camera": "push"}, {"cut": "the cards lift; the onion returns"}),
    ],
    "s22": [
        fr(0.0, "The poster: the cut onion and the knife on the right, lit; on the left the line to remember in metal type.",
           board(), *onion(1350, 600, 230, cut=True), *knife(1500, 300), *POSTER),
        fr(0.5, "'Keep your knife sharp': the sharp knife glints; under the line a second line lands.",
           board(), *onion(1350, 600, 230, cut=True), *knife(1500, 300), *POSTER, label(120, 900, "Sharp knife: less spray, fewer tears.", 48, align="start")),
        fr(1.0, "'...fewer tears': everything settles; the last wisp of gas fades from over the onion.",
           board(), *onion(1350, 600, 230, cut=True), *knife(1500, 300), *POSTER, label(120, 900, "Sharp knife: less spray, fewer tears.", 48, align="start"), {"camera": "push"}),
    ],
    "s23": [
        fr(0.0, "Silent: the poster holds, breathing, the gas no longer rising.",
           board(), *onion(1350, 600, 230, cut=True), *knife(1500, 300), *POSTER, label(120, 900, "Sharp knife: less spray, fewer tears.", 48, align="start")),
        fr(1.0, "The last frame, readable for two and a half seconds.",
           board(), *onion(1350, 600, 230, cut=True), *knife(1500, 300), *POSTER, label(120, 900, "Sharp knife: less spray, fewer tears.", 48, align="start"), {"camera": "push"}, {"cut": "end"}),
    ],
}

# ── Act 1: the question ──────────────────────────────────────────────────────────────────────────────────────
shot("s01", "hook", "object3d",
     voice="Why does cutting an onion make you *cry?*", caption=False,
     teaches="Asks the question the film answers while it happens on screen: a knife goes through an onion and something rises off it.",
     screen="A red onion in 3D, glossy purple skin with fine veins, on a wooden board at lower right (centre 1300, 600, about 520 px across). A steel chef's knife above it. On the left, in metal type at 104 px, the spoken question in three lines, 'cry?' in the lime accent. No caption pill: the lettering is the line.",
     motion="Frame 0: the knife already moving down. On 'cutting' it passes through; the halves part and tip outward, their cut faces wet and ringed. Lime wisps rise off the cut faces. The title arrives line by line with the voice. A slow 4 percent push.",
     carries="The onion and the colour of the gas (lime).",
     transition="The halves slide out to the left as a whole onion slides in: a short whip.",
     sound="The bed from the first frame. A soft knife chop on the cut, before the word 'onion' if it fits between words.",
     check="Frame 0 is a finished, lit picture. The question is fully readable by the end. The gas is lime from its first frame.",
     facts=["f1"])
shot("s02", "hook", "wide",
     voice="A whole onion can sit on your counter for weeks and never bother you.",
     teaches="The tension: an intact onion does nothing, so the tears must come from the cutting itself.",
     screen="The same board; one whole red onion, centred, larger (about 600 px across). A chip 'a whole onion' to its upper right. The key light swings across from left to right three times (days passing); the onion's shadow turns on the board. No gas.",
     motion="Whip in from the right. The light sweeps three times during 'for weeks'. On 'never bother you' the chip changes to 'no gas'. Then the camera starts to push into the skin.",
     carries="The onion itself: the camera dives into it.",
     transition="A dive: the onion grows past the frame and the cell sheet opens out of its skin.",
     sound="No effect under the words. A soft whoosh on the dive, after 'you'.",
     check="Nothing rises from the whole onion. The chip reads at 30 px or more.",
     facts=["f1"])

# ── Act 2: inside the onion ──────────────────────────────────────────────────────────────────────────────────
shot("s03", "inside", "macro",
     voice="That's because its cells keep two things *apart:*",
     teaches="The onion's cells hold two ingredients in separate compartments.",
     screen="A sheet of onion cells filling the frame: long glass-like cells 300 x 124 px in offset rows, violet-tinted walls lit along their edges. Each holds a big violet sac (the vacuole) and a thin outer band dotted with amber. A chip 'onion cells · magnified'.",
     motion="The sheet arrives from the dive (scale from 1.6 to 1). On 'two things' the amber bands brighten, then the violet sacs. On 'apart' a push starts toward the middle cell.",
     carries="The middle cell: the camera goes into it.",
     transition="A push into one cell; its neighbours slide out of the frame.",
     sound="No effect under the words.",
     check="The cells fill the whole frame; nothing reads as a tiny diagram in a dark field.",
     facts=["f2"])
shot("s04", "inside", "diagram",
     voice="*sulfur compounds* on one side, and an *enzyme* on the other.",
     teaches="Names the two: sulfur compounds in one compartment, an enzyme (alliinase) in the other, kept apart by a membrane.",
     screen="One cell fills the frame (1760 x 620 px): a thick wall, a band of cytoplasm with amber beads along the top and bottom, and the big sac in the middle with five violet enzymes drifting in it. Chips: 'sulfur compounds' (amber dot) over the band; 'enzyme (alliinase)' (violet dot) on the sac. A small label 'simplified'.",
     motion="The beads light on 'Sulfur compounds' and their chip pops; the enzymes light on 'enzyme' and theirs pops. A soft line of light runs along the sac's skin: the barrier. Slow push.",
     carries="The barrier between the two, about to break.",
     transition="Pull back to the sheet of cells.",
     sound="Two small pops, each just before its word, kept under the voice.",
     check="Amber and violet stay the colours of these two for the whole film.",
     facts=["f2"])
shot("s05", "inside", "macro",
     voice="But the moment your knife goes in, those cells *burst,*",
     teaches="Cutting breaks cells open.",
     screen="The cell sheet again, full frame. A steel blade edge, huge at this magnification, comes down through the middle of the frame. Along its path the walls tear, the sacs split, amber and violet spill out.",
     motion="The blade enters on 'knife' and sweeps down in 0.6 s with motion blur; the broken cells flash as they burst on 'burst', in a wave down the cut.",
     carries="The seam of broken cells: the camera pushes into it.",
     transition="A push into the seam of broken cells.",
     sound="A short slice whoosh with the blade, between 'But' and 'the moment' if it fits, else small.",
     check="Only the cells the blade touches break.",
     facts=["f2"])
shot("s06", "inside", "macro",
     voice="and the two spill *together.*",
     teaches="Once the cells are broken, the sulfur compounds and the enzyme meet.",
     screen="Close in the seam: broken walls at the left and right edges, the juice between them. Amber beads and violet enzymes pour in from both sides and mix in the middle. A chip 'mixed'.",
     motion="Both kinds stream inward; they meet in the middle of the frame on 'together'.",
     carries="An enzyme and a sulfur compound, side by side.",
     transition="No cut: the camera closes on one pair.",
     sound="No effect under the words.",
     check="Both colours are clearly in the same space at the end.",
     facts=["f2"])
shot("s07", "inside", "diagram",
     voice="The enzyme snips the sulfur compounds into an *unstable acid.*",
     teaches="The first reaction: alliinase turns the sulfur compounds into an unstable acid.",
     screen="One violet enzyme, large (300 px), with a pocket. An amber bead sits in the pocket. Chips 'enzyme' and 'sulfur compound'. After the snip: an orange bead that jitters, chip 'unstable acid'. More pairs react in the background.",
     motion="On 'snips' a flash in the pocket; the amber bead leaves as an orange one that trembles. Background pairs react one after another.",
     carries="The orange acid.",
     transition="The enzyme drifts away left; the acid stays and the camera settles on it.",
     sound="A small click on the snip, between words if possible.",
     check="The acid is orange and visibly unstable (it trembles).",
     facts=["f3"])

# ── Act 3: the second enzyme ─────────────────────────────────────────────────────────────────────────────────
shot("s08", "gas", "compare",
     voice="For decades, scientists thought that acid became tear gas *by itself.*",
     teaches="The old belief: the tear gas was assumed to form from the acid on its own.",
     screen="The orange acid centred left (140 px). A dashed arrow to an empty dashed lime circle on the right, 'by itself?' over the arrow. A glass card at the top: 'the old idea · until 2002'.",
     motion="The arrow draws on 'became'; the card lands on 'scientists thought'. On 'by itself' the lime outline flickers and stays empty.",
     carries="The acid, still waiting.",
     transition="The card flips; a magenta shape flies in from the right.",
     sound="No effect under the words.",
     check="The outline stays empty: the picture says this did not happen.",
     facts=["f4"])
shot("s09", "gas", "diagram",
     voice="[short pause] Then, in two thousand two, a team in Japan found a *second enzyme*",
     teaches="The finding: a separate enzyme makes the tear gas (Imai et al., Nature, 2002).",
     screen="A magenta enzyme (340 px) enters from the right and settles at (1300, 480), its pocket facing the acid. A citation card under it: 'Imai et al. · Nature · 2002 · Japan'. A chip 'a second enzyme'.",
     motion="It flies in on 'Then' with a ring of light from the stage (film.hit). The card lands on 'two thousand two'. The chip pops on 'second enzyme'.",
     carries="The magenta enzyme and the acid.",
     transition="No cut: the acid is drawn into the pocket.",
     sound="THE TURN: a soft low hit in the pause before 'Then'.",
     check="The year on the card is 2002, matching the fact sheet.",
     facts=["f4"])
shot("s10", "gas", "diagram",
     voice="whose whole job is making that *gas.*",
     teaches="The second reaction: lachrymatory-factor synthase turns the acid into the tear gas.",
     screen="The acid slides into the magenta pocket. Out comes a lime molecule, glowing, rising to the upper right. Chips: 'lachrymatory-factor synthase' under the enzyme, 'the gas' on the lime molecule.",
     motion="The acid is drawn in on 'whole job'; a flash; on 'gas' the lime molecule pops out and rises. More lime molecules follow from enzymes behind.",
     carries="The lime molecule: the camera dives into it.",
     transition="A dive into the lime molecule, which becomes the 3D model.",
     sound="A shimmer as the gas appears, kept small under the voice.",
     check="Lime is the gas and only the gas.",
     facts=["f4"])
shot("s11", "gas", "object3d",
     voice="It's called *syn-propanethial-S-oxide.* Quite a mouthful.",
     teaches="Names the gas, and shows it as a real, small molecule.",
     screen="The molecule in lit 3D, ball and stick, filling the middle of the frame (about 900 px across): three graphite carbons, six white hydrogens, a yellow sulfur, a red oxygen, lime light glowing from inside. Under it in metal type at 84 px: 'syn-propanethial-S-oxide', and 'C₃H₆OS' at 36 px.",
     motion="It turns slowly (one third of a turn over the shot) as the camera orbits. The name types in by character as it is said. On 'mouthful' it keeps turning.",
     carries="The lime glow of the gas.",
     transition="Pull out fast to the kitchen; the molecule shrinks into a lime wisp.",
     sound="No effect under the words; a whoosh on the pull, after 'mouthful'.",
     check="Atoms: C3 H6 O S, connected as CH3-CH2-CH=S=O (the S bonded to the third carbon and to the oxygen).",
     facts=["f5"])
shot("s12", "gas", "wide",
     voice="It evaporates fast and drifts toward your *face.*",
     teaches="The gas is volatile: it leaves the cut onion as vapour and reaches the eyes of whoever is cutting.",
     screen="The kitchen from the side: the cut onion on its board at lower left (centre 480, 760), a face in profile on the right with its eye at (1380, 380). Lime wisps curl up from the cut face and drift toward the eye.",
     motion="The wisps rise on 'evaporates' and curl up and right; on 'face' they reach the eye and a lime ring blooms there.",
     carries="The eye: the camera dives into it.",
     transition="A dive into the eye the gas just reached.",
     sound="A soft air whoosh as the wisps rise, under the voice and small.",
     check="The face is a generic silhouette. The wisps go from the onion to the eye.",
     facts=["f6"])

# ── Act 4: your eye ──────────────────────────────────────────────────────────────────────────────────────────
shot("s13", "eye", "macro",
     voice="On your eye, it sets off the *nerves* that sense pain.",
     teaches="The gas irritates the sensory (pain) nerve endings in the cornea.",
     screen="The eye's surface, magnified: the clear cornea as a glassy curved band across the frame, nerve endings branching up into it from below. Lime molecules fall from above. Where each one lands, the nerve under it flashes red and a pulse runs down it. Chips 'your eye's surface' and 'pain nerves'.",
     motion="On 'reaches' the first molecule touches; on 'sets off' its nerve fires; by 'pain' three nerves are firing.",
     carries="The red signal running down the nerves.",
     transition="Pull out to the head in profile; the signal keeps travelling.",
     sound="Three tiny ticks as the nerves fire, quiet under the voice.",
     check="The nerve endings sit in the cornea, under its surface.",
     facts=["f7"])
shot("s14b", "eye", "diagram",
     voice="They signal your brain, and your brain tells your *tear glands* to flush it out.",
     teaches="The reflex: the nerves signal the brain (brainstem), which signals the tear gland to make tears that wash the eye.",
     screen="A head in profile filling the frame, facing left, drawn in light line; the brain inside. The eye at (620, 470). A red pulse runs along a nerve path from the eye back to the brainstem at (1200, 620), which lights; chip 'brain'. Then a blue pulse runs from there along a second path to the tear gland above the outer corner of the eye (690, 405), which lights blue; chip 'tear gland'. Tears well over the eye and run down the cheek.",
     motion="The red pulse travels in 0.8 s during 'They signal your brain'; the blue pulse leaves on 'tells'; the gland lights on 'tear glands'; tears run on 'flush it out'.",
     carries="The tear.",
     transition="Cut closer to the face, the tear running.",
     sound="A soft water drop as the tears appear, after 'out'.",
     check="Red is the signal in, blue the signal out and the tears. The gland sits above the outer corner of the eye.",
     facts=["f7"])
shot("s16", "eye", "wide",
     voice="So those tears aren't *sadness.*",
     teaches="The objection answered: these are reflex tears, not emotional ones.",
     screen="The face in profile, larger, a tear rolling down the cheek. Beside it the word 'sad?' at 60 px, struck through on 'aren't'.",
     motion="The tear rolls; the strike draws through 'sad?' as the voice says 'aren't'.",
     carries="The tear and the eye.",
     transition="Dive into the tear on the eye's surface.",
     sound="No effect under the words.",
     check="The struck word is readable before it fades.",
     facts=["f7"])
shot("s17", "eye", "macro",
     voice="They're your eye *washing* itself.",
     teaches="The tears wash the irritant off the eye.",
     screen="The eye's surface again (as in s13): a wave of blue tear water sweeps across it from the left, lifting the lime molecules and carrying them off to the right. The nerves go quiet. Chip 'washed away'.",
     motion="The wave crosses in 1.2 s on 'washing'; the molecules ride it out of the frame; the red in the nerves fades.",
     carries="The blue of water: the next picture is the knife test.",
     transition="A vertical whip to the knife test.",
     sound="A soft wash of water, small, after 'itself'.",
     check="No lime molecule is left on the surface at the end.",
     facts=["f7"])

# ── Act 5: the knife ─────────────────────────────────────────────────────────────────────────────────────────
shot("s18", "knife", "compare",
     voice="And that's where your *knife* comes in.",
     teaches="Sets up the tip: a sharp and a blunt blade, which differ only in how rounded their tips are.",
     screen="Two blade tips side by side over a pink onion layer (a tough skin over soft cells): sharp on the left at x 520, blunt on the right at x 1400, tips drawn to scale with each other (radius 5.5 px and 80 px at 6 px a micrometre). Labels 'sharp · tip ≈ 0.9 µm' and 'blunt · tip ≈ 13 µm'. Small line at the bottom: 'blade tips to scale with each other · onion not to scale'.",
     motion="The blades slide in from the top on 'And that's why'; the labels land on 'sharp knife'.",
     carries="The two blades, about to press.",
     transition="No cut: they press down.",
     sound="A short metallic shimmer as the blades land, between words.",
     check="The tip radii are 5.5 px and 80 px: a ratio of 14.6, as 13.3 / 0.91.",
     facts=["f8"])
shot("s19", "knife", "diagram",
     voice="A blunt blade *squashes* the onion before it splits.",
     teaches="Why blunt is worse: it dents and compresses the soft cells under the tough skin before the skin breaks, so the juice is under pressure when it does.",
     screen="The same two blades pressing down at the same speed. The sharp one slips through with a shallow dent. The blunt one dents the skin deep (a 90 px dip), the cells under it glow red with pressure, a chip 'squashed'; then it breaks through and juice bursts up.",
     motion="On 'squashes' the blunt dent deepens and the glow grows; on 'splits' it snaps through and droplets spray up and out.",
     carries="The droplets in the air over both blades.",
     transition="No cut: the droplets freeze and are counted.",
     sound="A small wet pop as the blunt blade breaks through, between 'splits' and 'and'.",
     check="Both blades move at the same speed: only the tip differs.",
     facts=["f8"])
shot("s20", "knife", "chart",
     voice="In one lab test, it sprayed up to *forty times* more droplets than a sharp one.",
     teaches="The measurement: the bluntest blade threw up to forty times as many droplets as the sharpest.",
     screen="Over each blade, its droplets as blue dots: 3 over the sharp one, 120 over the blunt one (40 times as many). Then two bars at the true ratio: 14 px and 560 px tall on the same baseline, '1×' and '40×' (130 px figure). The source under them at 30 px: 'droplets per cut, sharpest vs bluntest blade · Wu et al. 2025'.",
     motion="The dots freeze in the air on 'lab test'; the bars rise on 'sprayed'; '40×' lands at its value on 'forty times'. Slow push.",
     carries="The blue of the droplets fades; the pictures shrink into recap cards.",
     transition="The chart sinks as four recap cards rise.",
     sound="A tick as the 40× locks, after 'times' if it fits.",
     check="The bars are 1 : 40 exactly. 3 and 120 dots. The number never counts up.",
     facts=["f8"])

# ── Act 6: recap ─────────────────────────────────────────────────────────────────────────────────────────────
shot("s21", "recap", "recap",
     voice="[short pause] Onions make you cry because cutting mixes what they keep *apart.*",
     teaches="The answer in one frame: kept apart, cut and mixed, a second enzyme makes the gas, the eye washes it with tears.",
     screen="Four glass cards (410 x 400 px) in a row across the frame, each with its small picture and a title at 36 px: a cell with the two kept apart; a cut line through a bead and an enzyme ('cut: they mix'); the acid, the magenta enzyme and a lime bead ('2nd enzyme: gas'); an eye with a tear ('eye: tears').",
     motion="The cards rise one after another, 0.2 s apart, on 'Onions make you cry'. A sheen crosses them on 'apart'. Slow push.",
     carries="The onion and the knife on the last card fold into the poster.",
     transition="The cards lift and fade as the 3D onion returns.",
     sound="A soft card sound for each, kept small; nothing on the words.",
     check="Each card's colours match the film's code.",
     facts=["f2", "f3", "f4", "f7"])
shot("s22", "recap", "endcard",
     voice="Keep your knife *sharp:* less spray, fewer tears.",
     caption=False,
     teaches="The one thing to do: keep the knife sharp.",
     screen="The poster: the cut red onion in 3D on its board at the right, the knife lying beside it, glinting. On the left in metal type at 92 px: 'Cutting mixes what / the onion keeps apart.', 'keeps apart.' in lime; under it at 48 px 'Sharp knife: less spray, fewer tears.'",
     motion="The poster line types in as the shot opens; the second line lands on 'sharp'; a sheen crosses the knife. Slow 3 percent push.",
     carries="Everything: the poster holds.",
     transition="No cut: the silent hold follows.",
     sound="THE PAYOFF: a warm low hit just before 'Keep', then the bed resolves.",
     check="Both lines are fully readable.",
     facts=["f8"])
shot("s23", "recap", "endcard", 2.6,
     teaches="The last frame holds, so the line can be read and remembered.",
     screen="The same poster, unchanged: the onion and knife at right, the two lines on the left. Nothing new arrives. The gas has stopped rising; the stage light breathes.",
     motion="Only the slow push continues and the light breathes; nothing else moves.",
     transition="The film ends on this frame.",
     sound="No voice; the bed's last chord rings to the final frame.",
     check="The sound is still audible on the last frame. Fully readable for 2.6 s.",
     facts=["f8"])

duration = shots[-1]["end"]

storyboard = {
    "title": "Why do onions make you cry?",
    "question": "Why does cutting an onion make you cry?",
    "audience": "Curious adults and teenagers anywhere, watching on X or Reddit, mostly on a phone, often muted at first. They know onions sting the eyes and have heard tips, but not what happens inside the onion or the eye.",
    "promise": "An onion's cells keep sulfur compounds and an enzyme apart; cutting bursts the cells, they mix, and a second enzyme turns the product into a gas that reaches your eyes and sets off nerves that make you tear up. A sharp knife bursts less and sprays far fewer droplets.",
    "language": "en",
    "format": "1920x1080",
    "subtitles": True,
    "duration": round(duration, 3),
    "fps": 60,
    "poster": round(duration - 1.2, 2),
    "voice": {"voice_id": "xd8j2LFPw16XKmJ5qeBK", "name": "Courtney", "model": "eleven_v4", "language": "en", "direction": "[warmly]"},
    "look": {
        "accent": GAS,
        "accent2": LFS,
        "mood": "A kitchen at night under a warm key light on the graphite stage: a glossy red onion and steel knife in lit 3D. Inside the onion the stage turns violet (cells), then the light follows the chemistry: amber sulfur, violet first enzyme, orange acid, magenta second enzyme, lime gas. The eye act is cool and blue (tears), the nerve signal red. Glass chips name things where they are.",
    },
    "music": {"track": "composed bed (music/bed.mp3)", "bpm": 92, "note": "A bed composed for this film's length after the take: warm, curious, sparse, no lead melody, even loudness, under the voice at about -22 LUFS. The cuts follow the take, not its beat."},
    "facts": [
        {"id": "f1", "claim": "Cutting an onion releases an irritating 'lachrymatory factor' that makes the eyes water; an intact onion does not release it, because the chemistry starts only when tissue is disrupted.",
         "source": "Imai et al., 'An onion enzyme that makes the eyes water', Nature 419, 685 (2002), doi:10.1038/419685a (abstract read on nature.com); Kato et al., Scientific Reports 6, 23779 (2016): 'the LF is produced through the successive enzymatic reactions that occur upon onion tissue disruption' (read)."},
        {"id": "f2", "claim": "In the intact onion the sulfur-containing flavour precursors (S-alk(en)yl cysteine sulfoxides, mainly isoalliin) and the enzyme alliinase are kept in separate compartments; cutting breaks the cells and they meet. Simplification: the film draws the enzyme in the vacuole and the precursors in the cytoplasm around it, the classic finding (Lancaster & Collin 1981), but the exact compartments are still debated, and not every cell holds both (alliinase is concentrated in bundle-sheath cells). The board says 'simplified'.",
         "source": "Lancaster & Collin, Plant Science Letters 22, 169 (1981), as summarised in a 2023 open-access paper (PMC10698848, read: 'clearly partitioned... the vacuoles exhibited alliinase activity while the alkyl cysteine sulfoxide precursor is present in the protoplasts'); Live Science, 'Why does slicing onions make you cry?' (2025, quoting J. Silvaroli, Ohio State; read)."},
        {"id": "f3", "claim": "Alliinase turns the sulfur compounds (isoalliin) into 1-propenesulfenic acid, which is unstable ('sulfenic acids are not very stable').",
         "source": "Kato et al. 2016 (above, read); Wikipedia, syn-Propanethial-S-oxide (read); Live Science 2025 quoting Silvaroli (read)."},
        {"id": "f4", "claim": "The tear gas was presumed to form spontaneously from that acid after alliinase acted; Imai et al. (House Foods Corporation, Japan, with the Universities of Tokyo and Kyoto) showed in 2002 that it is made specifically by a previously unknown enzyme, lachrymatory-factor synthase. 'For decades': the gas was identified as propanethial S-oxide by Brodnitz and Pascale in 1971, 31 years before.",
         "source": "Imai et al., Nature 419, 685 (2002), abstract and author affiliations (read on nature.com); Kato et al. 2016: LF 'identified as propanethial S-oxide almost 40 years ago by Brodnitz and Pascale' (1971)."},
        {"id": "f5", "claim": "The gas is syn-propanethial-S-oxide, (Z)-CH3CH2CH=S+-O-, formula C3H6OS, molar mass 90.14 g/mol: three carbons, six hydrogens, one sulfur, one oxygen; the sulfur is double-bonded to the third carbon and bonded to the oxygen.",
         "source": "Wikipedia, syn-Propanethial-S-oxide (read): formula, structure, 'a volatile liquid that acts as a lachrymatory agent'."},
        {"id": "f6", "claim": "It is volatile: it turns to vapour quickly, which is how it reaches the eyes. Simplification: the film draws it as rising wisps; it drifts on air currents. A 2025 study suggests tiny droplets thrown up by the cut carry it too (f8).",
         "source": "Live Science 2025 quoting Silvaroli (read: 'a volatile liquid, meaning it turns to vapor very quickly... That's how it reaches your eyes and irritates sensory nerves'); Wikipedia (read)."},
        {"id": "f7", "claim": "On the eye it irritates the sensory nerves of the cornea; that signal reaches the brainstem (trigeminal nerve), which drives the tear (lacrimal) gland through parasympathetic nerves: reflex tears, which wash the irritant away. Simplification: the film draws one path in and one out.",
         "source": "Wu et al. 2025 (below): 'activates the ciliary nerves in the cornea and cause tears'; Live Science 2025 quoting Silvaroli: 'Your eyes start tearing up to get rid of the irritant'; StatPearls (NCBI Bookshelf) on the corneal and lacrimation reflexes (search summary only, not opened)."},
        {"id": "f8", "claim": "Blade sharpness: cutting with blades whose tip radius rose from 0.91 um (sharpest) to 13.3 um (bluntest) increased the number of droplets thrown up to forty-fold; blunter blades dent the soft tissue under the tough skin more before it breaks, so the juice comes out under pressure. Faster cuts threw about four times as many (0.44 to 2.03 m/s; not in the film). Chilling the onion is NOT in the film: the same team refrigerated onions (1 C, 12 h) and saw no difference in droplet speed and a noticeably larger volume of droplets, and no direct measurement that cold reduces the gas was found. 'Fewer tears' is the authors' own reading ('experimental validation for the widely held belief that sharpening knives reduces onion-induced tearing'); they measured droplets, not tears. The drawn tips are to scale with each other (13.3 / 0.91 = 14.6); the onion layer is not.",
         "source": "Wu, Hooshanginejad, Wang, Hui & Jung (Cornell), 'Droplet outbursts from onion cutting', arXiv:2505.06016 (May 2025; read in full), published in PNAS 2025 (doi 10.1073/pnas.2512779122, per press coverage; the PNAS page could not be opened)."},
    ],
    "acts": [
        {"id": "hook", "title": "Question", "goal": "Ask the question while it happens on screen, then the tension: a whole onion does nothing.", "rail": False},
        {"id": "inside", "title": "Inside", "goal": "Show the two ingredients the cells keep apart, the knife bursting them, and the first reaction.", "rail": False},
        {"id": "gas", "title": "The gas", "goal": "Break the old belief: a second enzyme (2002) makes the gas; name it; send it to the eye.", "rail": False},
        {"id": "eye", "title": "Your eye", "goal": "The nerves, the reflex to the tear gland, and why the tears are washing, not sadness.", "rail": False},
        {"id": "knife", "title": "The knife", "goal": "Why a sharp knife helps, with the measured ratio drawn true.", "rail": False},
        {"id": "recap", "title": "Recap", "goal": "The whole chain in one frame, then the line to remember.", "rail": False},
    ],
    "shots": shots,
}

out = HERE / "storyboard.json"
out.write_text(json.dumps(storyboard, ensure_ascii=False, indent=2) + "\n")
print(f"{len(shots)} shots, {sum(len(s['frames']) for s in shots)} frames, about {duration:.1f} s before the take -> {out}")
# The take sets the times: once it is there, put them back after every build.
manifest = HERE / "voice" / "voice.json"
if manifest.exists() and json.loads(manifest.read_text()).get("version") == 2:
    kit = next(p for p in HERE.parents if (p / "kit" / "audio" / "voice.mjs").exists())
    subprocess.run(["node", str(kit / "kit" / "audio" / "voice.mjs"), str(HERE), "--retime"], check=False, stdout=subprocess.DEVNULL)
