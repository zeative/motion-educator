"""Writes storyboard.json for "Gimana tumbuhan bikin makanan dari cahaya?" (portrait 1080 x 1920, the Paper Cut-out template).

The sample film of the Paper Cut-out visual template: layers of craft paper with soft shadows between them, opening
like a pop-up book, stepped at 12 frames a second. The film is cut to one take of narration, so the times here are
only a guess (from the length of each line) until the take retimes the board:

    python3 examples/fotosintesis/storyboard.build.py && node kit/tools/storyboard.mjs examples/fotosintesis --png

The hook is Helmont's potted willow (f1): the tree gained 164 pounds while 200 pounds of dried soil lost about two
ounces. The pounds are converted at the avoirdupois pound (0.45359 kg), and the bars in s05 are computed from those
masses below, not drawn by eye. The paper colours keep one meaning each through the film: yellow is light, orange
is sugar (and so the trunk, which is built from it), red is oxygen, deep teal is carbon and soil, cream is hydrogen.
"""
import json
import math
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
shots = []

# ── The numbers ──────────────────────────────────────────────────────────────────────────────────────────────────
LB, OZ = 0.45359237, 0.028349523  # kg
TREE_START = 5 * LB  # 2.27 kg
TREE_GAIN = 164 * LB  # 74.39 kg ("164 pounds of Wood, Barks, and Roots")
SOIL = 200 * LB  # 90.72 kg of dried earth
SOIL_LOSS = 2 * OZ  # 0.0567 kg ("wanting about two ounces")
SHARE = SOIL_LOSS / TREE_GAIN  # 0.00076: under a thousandth
assert round(TREE_GAIN) == 74 and round(SOIL_LOSS * 1000) == 57 and SHARE < 0.001
BAR = 760  # px: the tree's gain in s05
SOIL_BAR = BAR * SHARE  # 0.58 px: the soil's loss on the same scale, a hairline
# Dry matter of a plant (f2): about 45 % carbon, 45 % oxygen, 6 % hydrogen, so minerals from the soil are about 4 %.
CHO = 45 + 45 + 6
assert CHO == 96

# ── The paper (five craft papers on cream, each with one meaning) ─────────────────────────────────────────────────
TEAL, GREEN, YELLOW, ORANGE, RED, CREAM = "#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51", "#fbf6ea"
LEAFG = "#6a9a4f"  # the leaf's own green (the template's concept still); the teal green is the hills
W, H = 1080, 1920
READ = (60, 1020, 230, 1300)  # what must be read stays inside these x and y bounds (captions sit at 1340-1420)
problems = []


def fr(at, note, *draw):
    flat = []

    def add(d):
        if isinstance(d, list):
            for x in d:
                add(x)
        else:
            flat.append(d)
    add(list(draw))
    return {"at": at, "note": note, "draw": flat}


def inside(x0, x1, y0, y1, what):
    if x0 < READ[0] or x1 > READ[1] or y0 < READ[2] or y1 > READ[3]:
        problems.append(f"{what}: box {x0:.0f}..{x1:.0f} x {y0:.0f}..{y1:.0f} leaves the reading area")


def label(x, y, text, size=52, **more):
    w = max(len(line) for line in text.split("\n")) * size * 0.5
    inside(x - w / 2, x + w / 2, y - size, y + size * 0.3 + (text.count("\n")) * size * 1.08, f"label '{text}'")
    return {"label": [x, y], "text": text, "size": size, **more}


def circ(cx, cy, r):
    return f"M{cx - r:.0f} {cy:.0f} a{r:.0f} {r:.0f} 0 1 0 {2 * r:.0f} 0 a{r:.0f} {r:.0f} 0 1 0 {-2 * r:.0f} 0 Z"


def ell(cx, cy, rx, ry):
    return f"M{cx - rx:.0f} {cy:.0f} a{rx:.0f} {ry:.0f} 0 1 0 {2 * rx:.0f} 0 a{rx:.0f} {ry:.0f} 0 1 0 {-2 * rx:.0f} 0 Z"


def paper(d, colour, width=6):
    """A cut paper shape: its edge and a tint of its colour (cream paper gets a teal cut edge, or it would not show)."""
    return {"path": d, "colour": TEAL if colour == CREAM else colour, "fill": colour, "width": width}


def tag(x, y, text, to=None, size=58, colour=TEAL):
    """A paper tag tied with thread to the part it names: (x, y) is the text's baseline centre, `to` the part."""
    w = len(text) * size * 0.5 + 56
    x0, y0, y1 = x - w / 2, y - size * 0.95, y + size * 0.42
    inside(x0, x0 + w, y0, y1, f"tag '{text}'")
    out = [{"path": f"M{x0:.0f} {y0:.0f} H{x0 + w:.0f} V{y1:.0f} H{x0:.0f} Z M{x0 + 22:.0f} {(y0 + y1) / 2:.0f} a6 6 0 1 0 0.1 0", "colour": colour, "fill": CREAM, "width": 4},
           {"label": [x, y], "text": text, "size": size, "colour": colour}]
    if to:
        sx, sy = (x0 + 22, (y0 + y1) / 2) if to[0] < x0 else (x0 + w, (y0 + y1) / 2) if to[0] > x0 + w else (x, y1 if to[1] > y1 else y0)
        bend = 60 if to[0] >= sx else -60
        out.append({"path": f"M{sx:.0f} {sy:.0f} Q{(sx + to[0]) / 2 + bend:.0f} {(sy + to[1]) / 2 - 40:.0f} {to[0]:.0f} {to[1]:.0f}", "colour": colour, "width": 3, "dashed": True})
    return out


def stamp(x, y, text, size=96, colour=TEAL):
    """A number on a stamped tag, at its real value."""
    w = len(text) * size * 0.52 + 60
    inside(x - w / 2, x + w / 2, y - size * 0.95, y + size * 0.4, f"stamp '{text}'")
    return [{"path": f"M{x - w / 2:.0f} {y - size * 0.95:.0f} H{x + w / 2:.0f} V{y + size * 0.4:.0f} H{x - w / 2:.0f} Z", "colour": colour, "fill": CREAM, "width": 7},
            {"label": [x, y], "text": text, "size": size, "colour": colour}]


def strip(x, y, text, size=110, key=None):
    """Big lettering printed on a cream paper strip; `key` goes on an orange tab."""
    lines = text.split("\n")
    w = max(len(line) for line in lines) * size * 0.5 + 90
    h = len(lines) * size * 1.1 + 50
    inside(x - w / 2, x + w / 2, y - size, y - size + h, f"strip '{text}'")
    out = [{"path": f"M{x - w / 2:.0f} {y - size - 10:.0f} H{x + w / 2:.0f} V{y - size + h:.0f} H{x - w / 2:.0f} Z", "colour": TEAL, "fill": CREAM, "width": 5}]
    out.append({"title": [x, y], "text": text, "size": size, **({"accent": key} if key else {})})
    return out


# ── Things built from paper ──────────────────────────────────────────────────────────────────────────────────────
def sun(x=820, y=430, r=115):
    return paper(circ(x, y, r), YELLOW, 7)


def hills():
    return paper("M0 1030 C 220 960, 460 990, 660 1040 C 840 1085, 960 1020, 1080 1010 V1200 H0 Z", GREEN)


def soil(y=1195):
    return paper(f"M0 {y + 5} C 280 {y - 25}, 700 {y + 25}, 1080 {y - 5} V1910 H0 Z", TEAL)


CLUSTERS = [(545, 395, 122), (400, 468, 112), (690, 462, 112), (345, 612, 110), (738, 606, 106), (482, 592, 102), (622, 612, 98)]
BRANCHES = [((540, 860), (352, 628)), ((540, 850), (736, 622)), ((540, 840), (545, 420)), ((528, 760), (402, 488)), ((556, 730), (690, 478))]


def tree(cx=540, base=1195, k=1.0):
    """The paper tree: an orange trunk and branches (built from sugar) under seven clusters of cut leaves."""
    P = lambda x, y: (cx + (x - 540) * k, base - (1195 - y) * k)
    (a, b), (c, d) = P(493, 1195), P(587, 1195)
    (e, f), (g, h) = P(515, 830), P(565, 830)
    out = [paper(f"M{a:.0f} {b:.0f} L{e:.0f} {f:.0f} L{g:.0f} {h:.0f} L{c:.0f} {d:.0f} Z", ORANGE, 6)]
    for p0, p1 in BRANCHES:
        (x0, y0), (x1, y1) = P(*p0), P(*p1)
        out.append({"line": [round(x0), round(y0), round(x1), round(y1)], "colour": ORANGE, "width": max(4, round(22 * k))})
    for x, y, r in CLUSTERS:
        (X, Y) = P(x, y)
        out.append(paper(circ(X, Y, r * k * 0.95), LEAFG, 6))
        out += [{"path": f"M{X - r * k * 0.55:.0f} {Y:.0f} q{r * k * 0.3:.0f} {-r * k * 0.25:.0f} {r * k * 0.6:.0f} {-r * k * 0.1:.0f} M{X - r * k * 0.2:.0f} {Y + r * k * 0.45:.0f} q{r * k * 0.25:.0f} {-r * k * 0.3:.0f} {r * k * 0.55:.0f} {-r * k * 0.25:.0f}", "colour": "#4f7f3e", "width": 4}]
    return out


def roots(cx=540, base=1195):
    return {"path": f"M{cx} {base} C {cx - 30} {base + 50}, {cx - 120} {base + 80}, {cx - 230} {base + 95} M{cx} {base} C {cx + 30} {base + 60}, {cx + 140} {base + 70}, {cx + 240} {base + 100} M{cx} {base} C {cx - 5} {base + 60}, {cx + 10} {base + 90}, {cx - 20} {base + 110}", "colour": ORANGE, "width": 9}


def lifted(d, dy=-60):
    """An absolute-coordinate path (M L C H V Z) moved up by the opening camera's 60 px."""
    out, cmd, nums = [], None, []
    for tok in re.findall(r"[MLCHVZ]|-?[0-9.]+", d):
        if tok.isalpha():
            cmd = tok
            out.append(tok)
            continue
        v = float(tok)
        if cmd == "H":
            out.append(f"{v:.0f}")
        elif cmd == "V":
            out.append(f"{v + dy:.0f}")
        else:
            nums.append(v)
            if len(nums) == 2:
                out.append(f"{nums[0]:.0f} {nums[1] + dy:.0f}")
                nums = []
    return " ".join(out)


def opening(k=1.0):
    """Frame 0, and the picture the film loops back into: the paper tree on its hill, the soil under it (as the
    film's opening camera frames it, 60 px higher than the set, so the roots stay above the captions)."""
    return [sun(820, 370, 112), paper(lifted(hills()["path"]), GREEN), soil(1135), roots(540, 1135)] + tree(540, 1135, k)


def atom(x, y, r, colour):
    return {"dot": [round(x), round(y), round(r)], "colour": colour}


def co2(x, y, r=26):
    return [atom(x - 1.6 * r, y, r * 0.85, RED), atom(x + 1.6 * r, y, r * 0.85, RED), atom(x, y, r, TEAL)]


def h2o(x, y, r=26):
    return [atom(x - 1.05 * r, y + 0.85 * r, r * 0.6, CREAM), atom(x + 1.05 * r, y + 0.85 * r, r * 0.6, CREAM), atom(x, y, r, RED)]


def o2(x, y, r=24):
    return [atom(x - 0.85 * r, y, r, RED), atom(x + 0.85 * r, y, r, RED)]


def hexagon(x, y, r):
    pts = " L".join(f"{x + r * math.cos(math.radians(60 * i + 30)):.0f} {y + r * math.sin(math.radians(60 * i + 30)):.0f}" for i in range(6))
    return paper(f"M{pts} Z", ORANGE, 6)


def figure(x, y, s, reach=None):
    """A cut-out figure on split pins: feet at (x, y), height s; `reach` points the near arm at a place."""
    u = s / 100  # one hundredth of the height
    head = (x, y - 89 * u)
    sh = (x + 4 * u, y - 72 * u)
    hand = reach or (x + 14 * u, y - 44 * u)
    elbow = ((sh[0] + hand[0]) / 2 - 4 * u, (sh[1] + hand[1]) / 2 + 8 * u)
    hip = (x, y - 42 * u)
    out = [paper(circ(*head, 10 * u), CREAM, 5),
           {"line": [x, y - 79 * u, x, y - 76 * u], "colour": TEAL, "width": round(4 * u)},
           paper(f"M{x - 11 * u:.0f} {y - 76 * u:.0f} H{x + 11 * u:.0f} L{x + 9 * u:.0f} {y - 42 * u:.0f} H{x - 9 * u:.0f} Z", TEAL, 5),
           paper(f"M{x - 8 * u:.0f} {y - 44 * u:.0f} L{x - 13 * u:.0f} {y:.0f} H{x - 5 * u:.0f} L{x:.0f} {y - 40 * u:.0f} Z M{x:.0f} {y - 40 * u:.0f} L{x + 6 * u:.0f} {y:.0f} H{x + 14 * u:.0f} L{x + 8 * u:.0f} {y - 44 * u:.0f} Z", TEAL, 5),
           {"path": f"M{sh[0]:.0f} {sh[1]:.0f} L{elbow[0]:.0f} {elbow[1]:.0f} L{hand[0]:.0f} {hand[1]:.0f}", "colour": TEAL, "width": round(4.5 * u)},
           paper(circ(hand[0], hand[1], 3 * u), CREAM, 4)]
    out += [atom(sh[0], sh[1], 1.8 * u, YELLOW), atom(elbow[0], elbow[1], 1.8 * u, YELLOW), atom(hip[0], hip[1], 1.8 * u, YELLOW)]
    return out


POT, POT_L = "#7e8e90", "#97a4a4"  # the soil's teal made lighter: an earthen pot, cut away to show the soil


def pot(cx=620, top=860, bottom=1250, wt=460, wb=360):
    return [paper(f"M{cx - wt / 2:.0f} {top} H{cx + wt / 2:.0f} L{cx + wb / 2:.0f} {bottom} H{cx - wb / 2:.0f} Z", POT, 7),
            paper(f"M{cx - wt / 2 + 24:.0f} {top + 10} H{cx + wt / 2 - 24:.0f} L{cx + wb / 2 - 22:.0f} {bottom - 24} H{cx - wb / 2 + 22:.0f} Z", TEAL, 4),
            paper(f"M{cx - wt / 2 - 22:.0f} {top - 46} H{cx + wt / 2 + 22:.0f} V{top + 10} H{cx - wt / 2 - 22:.0f} Z", POT_L, 6)]


def willow(cx, base, height, spread):
    """A young willow: an orange stem and long narrow green leaves hanging from its branches."""
    top = base - height
    out = [paper(f"M{cx - 10} {base} L{cx - 5} {top} L{cx + 5} {top} L{cx + 10} {base} Z", ORANGE, 5)]
    for i in range(7):
        a = -spread + i * spread * 2 / 6
        bx, by = cx + a, top + abs(a) * 0.5 + 20
        out.append({"path": f"M{cx} {top + 30} Q{cx + a * 0.6:.0f} {top - 20:.0f} {bx:.0f} {by:.0f} q{a * 0.05:.0f} {height * 0.25:.0f} {a * 0.12:.0f} {height * 0.45:.0f}", "colour": GREEN, "width": 12})
    return out


def leaf_big():
    return [paper("M110 820 C 280 520, 760 460, 980 760 C 760 1020, 290 1080, 110 820 Z", GREEN, 8),
            {"path": "M110 820 C 400 770, 700 750, 980 760 M330 790 L240 660 M330 790 L250 930 M560 770 L470 600 M560 770 L480 960 M780 762 L720 610 M780 762 L720 920", "colour": TEAL, "width": 5}]


def stoma(cx, cy, w, h):
    """Two guard cells round a slit, as cut paper beans."""
    l = f"M{cx} {cy - h / 2:.0f} C {cx - w:.0f} {cy - h / 2:.0f}, {cx - w:.0f} {cy + h / 2:.0f}, {cx} {cy + h / 2:.0f} C {cx - w * 0.35:.0f} {cy + h / 4:.0f}, {cx - w * 0.35:.0f} {cy - h / 4:.0f}, {cx} {cy - h / 2:.0f} Z"
    r = f"M{cx} {cy - h / 2:.0f} C {cx + w:.0f} {cy - h / 2:.0f}, {cx + w:.0f} {cy + h / 2:.0f}, {cx} {cy + h / 2:.0f} C {cx + w * 0.35:.0f} {cy + h / 4:.0f}, {cx + w * 0.35:.0f} {cy - h / 4:.0f}, {cx} {cy - h / 2:.0f} Z"
    return [paper(l, GREEN, 5), paper(r, GREEN, 5)]


def granum(cx, cy, n=5, rx=72, ry=17, gap=26):
    return [paper(ell(cx, cy - i * gap, rx, ry), GREEN, 5) for i in range(n)]


def chloroplast(cx=540, cy=810, rx=480, ry=390, grana=((330, 880), (540, 820), (750, 900))):
    out = [paper(ell(cx, cy, rx, ry), GREEN, 8), {"path": ell(cx, cy, rx - 26, ry - 26), "colour": GREEN, "width": 3}]
    for gx, gy in grana:
        out += granum(gx, gy)
    return out


def beam(x0, y0, x1, y1, w=70):
    """A strip of yellow paper: light arriving."""
    a = math.atan2(y1 - y0, x1 - x0) + math.pi / 2
    dx, dy = math.cos(a) * w / 2, math.sin(a) * w / 2
    return paper(f"M{x0 - dx:.0f} {y0 - dy:.0f} L{x1 - dx:.0f} {y1 - dy:.0f} L{x1 + dx:.0f} {y1 + dy:.0f} L{x0 + dx:.0f} {y0 + dy:.0f} Z", YELLOW, 5)


def paper_arrow(x0, y0, x1, y1, colour=TEAL, w=34):
    """A cut paper arrow (part of the picture, not the blue direction pencil)."""
    a = math.atan2(y1 - y0, x1 - x0)
    n = (math.cos(a + math.pi / 2), math.sin(a + math.pi / 2))
    hx, hy = x1 - math.cos(a) * w * 1.6, y1 - math.sin(a) * w * 1.6
    p = [(x0 + n[0] * w / 2, y0 + n[1] * w / 2), (hx + n[0] * w / 2, hy + n[1] * w / 2), (hx + n[0] * w, hy + n[1] * w), (x1, y1),
         (hx - n[0] * w, hy - n[1] * w), (hx - n[0] * w / 2, hy - n[1] * w / 2), (x0 - n[0] * w / 2, y0 - n[1] * w / 2)]
    return paper("M" + " L".join(f"{px:.0f} {py:.0f}" for px, py in p) + " Z", colour, 5)


def layer_slide(x_edge):
    """The paper layer that wipes across the frame, its leading edge at x_edge."""
    return paper(f"M-20 -20 H{x_edge} V1940 H-20 Z", CREAM, 8)


TRUNK = paper("M250 240 H830 V1300 H250 Z", ORANGE, 8)


def chain(x, y0, n, r=30):
    """Sugar hexagons linked one under the other: a strand of cellulose."""
    out = []
    for i in range(n):
        y = y0 + i * r * 2.15
        out.append(hexagon(x, y, r))
        if i:
            out.append({"line": [x, y - r * 1.15, x, y - r * 0.85], "colour": TEAL, "width": 6})
    return out


def recipe(stage):
    """The recap card: ingredients (1), into the leaf (2), out come sugar and oxygen (3)."""
    out = [paper("M70 260 H1010 V1295 H70 Z", CREAM, 7), paper(circ(220, 430, 95), YELLOW), co2(540, 430, 36), h2o(860, 415, 40),
           label(220, 610, "cahaya", 68, colour=TEAL), label(540, 610, "udara", 68, colour=TEAL), label(860, 610, "air", 68, colour=TEAL)]
    if stage >= 2:
        out += [paper_arrow(250, 650, 430, 760, TEAL, 28), paper_arrow(540, 650, 540, 740, TEAL, 28), paper_arrow(830, 650, 650, 760, TEAL, 28),
                paper("M340 850 C 420 720, 660 720, 740 850 C 660 980, 420 980, 340 850 Z", GREEN, 8), {"line": [340, 850, 740, 850], "colour": TEAL, "width": 5}]
    if stage >= 3:
        out += [paper_arrow(470, 950, 370, 990, TEAL, 24), paper_arrow(610, 950, 710, 990, TEAL, 24), hexagon(300, 1060, 90), o2(780, 1060, 44),
                label(300, 1200, "gula", 72, colour=TEAL), label(780, 1200, "oksigen", 72, colour=TEAL), label(540, 1278, "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂", 50, colour=TEAL)]
    return out


# ── The script, cut into shots (one take; the take sets the times) ────────────────────────────────────────────────
t = 0.0


def shot(id, act, type_, voice, **more):
    global t
    said = re.sub(r"\[[^]]*\]", "", voice).replace("*", "").strip()
    dur = round(max(1.5, len(said) / 15.5 + 0.3), 2)
    shots.append({"id": id, "act": act, "type": type_, "start": round(t, 3), "end": round(t + dur, 3), "voice": voice, **more})
    t += dur


shot("s01", "hook", "wide", "Pohon bisa *tumbuh* segede ini,",
     teaches="A tree grows huge: the first half of the puzzle, the picture of a big tree and the small cutting it grew from.",
     screen="Cream card backdrop. Three paper layers: a yellow paper sun top right (820, 430); a green hill across the middle (top edge about y 1000); in front, the deep-teal soil from y 1195 down, cut like a cross-section, with the tree's orange roots on it. In the middle a big paper tree: an orange trunk and branches (sugar is what it is built from, so wood is the sugar colour all film; s14 opens the bark to show it) under seven clusters of cut leaves in leaf green, top at y 240. A leafy sprig hangs into the top corner and grass stands at the bottom corners, nearest the lens. Every layer casts a small soft shadow on the one behind.",
     motion="Frame 0 is finished. On 'tumbuh' the canopy grows a step: each leaf cluster pops up and a size larger, one after another, at 12 drawings a second, and a dashed paper outline of the cutting it grew from stays at its foot. A slow rostrum push (9 %) all the while, the layers moving with parallax.",
     carries="The tree on its hill and the soil.", transition="The rostrum camera tilts down to the soil.",
     sound="The acoustic bed starts (nylon guitar). A paper rustle as each canopy disc pops up.",
     check="The tree fills the upper two thirds; the soil's top edge stays where it is while the tree grows.", facts=["f1", "f2"],
     frames=[fr(0, "Frame 0 is finished: the big paper tree on the hill, the sun behind it, the soil cut open under it.", opening(), {"move": [940, 980, 940, 700], "text": "tumbuh"}),
             fr(1, "The leaf clusters have popped up a size larger; the dashed outline of the small cutting it grew from stays at its foot. A slow push all the while.", opening(1.06), {"path": "M530 1135 V1000 M530 1060 l-30 -30 M530 1032 l30 -30", "colour": TEAL, "width": 5, "dashed": True}, {"camera": "push"})])

# s01b: the rostrum camera tilted down and pushed in on the soil: (x, y) of the opening set is drawn at
# (540 + (x - 540) * 1.25, 880 + (y - 1195) * 1.25), so the soil's top edge sits at y 880 on screen.
def zoomed(d, k=1.25, fx=540, fy=1195, tx=540, ty=880):
    """An absolute-coordinate path (M L C H V Z) of the opening set, as the pushed-in camera sees it."""
    out, cmd, nums = [], None, []
    X = lambda v: f"{tx + (v - fx) * k:.0f}"
    Y = lambda v: f"{ty + (v - fy) * k:.0f}"
    for tok in re.findall(r"[MLCHVZ]|-?[0-9.]+", d):
        if tok.isalpha():
            cmd = tok
            out.append(tok)
            continue
        v = float(tok)
        if cmd == "H":
            out.append(X(v))
        elif cmd == "V":
            out.append(Y(v))
        else:
            nums.append(v)
            if len(nums) == 2:
                out.append(f"{X(nums[0])} {Y(nums[1])}")
                nums = []
    return " ".join(out)


ZOOM_SOIL = [paper(zoomed(hills()["path"]), GREEN), paper(zoomed(soil()["path"].replace("V1910", "V2200")), TEAL), {**roots(), "path": "M540 880 C 502 942, 390 980, 252 999 M540 880 C 578 955, 715 968, 840 1005 M540 880 C 534 955, 552 992, 515 1018", "width": 11},
             tree(540, 880, 1.06 * 1.25), {"path": "M528 880 V686 M528 761 l-50 -50 M528 724 l50 -50", "colour": TEAL, "width": 6, "dashed": True}]
shot("s01b", "hook", "diagram", "tapi tanah di bawahnya hampir nggak *berkurang*.",
     teaches="The soil it stands in barely gets less: the second half of the puzzle, measured against a thread pinned at the soil's top edge.",
     screen="The same set, the rostrum camera tilted down and pushed in to 1.25x: the trunk's foot and the lower canopy at the top, the hill behind, the deep-teal soil cut open from y 880 down with the orange roots on it. A cream thread is pinned along the soil's top edge with two yellow pins; a tag tied to it: 'tanah ≈ tetap'.",
     motion="The camera tilts down on 'tanah di bawahnya' (on twelves); the two pins go in at the ends of the soil's top edge and the thread is pulled taut between them; on 'berkurang' the tag flips up on its thread. The tree grows one more step above (the canopy discs pop a size larger) and the soil's edge stays on the thread.",
     carries="The soil and its thread, under the cream layer.", transition="A cream paper layer slides across from the left and covers the scene.",
     sound="Two soft taps as the pins go in; a tag flick; a paper rustle as the canopy pops.",
     check="The soil's top edge sits exactly on the thread before and after the tree grows; the tag reads 'tanah ≈ tetap'.", facts=["f1", "f2"],
     frames=[fr(0, "Tilted down and pushed in: the trunk's foot, the hill, the soil cut open with its roots.", ZOOM_SOIL, {"move": [540, 360, 540, 560], "text": "kamera turun"}, {"camera": "down"}),
             fr(1, "The thread pinned along the soil's top edge, the tag 'tanah ≈ tetap'; the canopy above has popped one size larger and the edge has not moved.", ZOOM_SOIL, {"path": "M80 874 C 350 870, 679 892, 1000 885", "colour": CREAM, "width": 6}, atom(80, 874, 12, YELLOW), atom(1000, 885, 12, YELLOW), tag(330, 1010, "tanah ≈ tetap", (330, 876), 62), {"cut": "lapisan kertas menutup"})])

def soil_block():
    return [paper("M150 1150 C 260 1136, 520 1160, 640 1146 L646 1286 L146 1290 Z", TEAL)] + tree(395, 1150, 0.46)


QMARK = "M642 1000 q0 -132 132 -132 q132 0 132 120 q0 96 -106 120 v62 h-56 v-112 q104 -12 104 -76 q0 -64 -74 -64 q-76 0 -76 82 Z M744 1206 h56 v56 h-56 Z"


def lidded_pot(cx=620, top=860):
    """Helmont's earthen pot cut away: crumbly soil inside, a tinned plate with many holes over its mouth (f1)."""
    out = pot(cx, top)
    out += [atom(cx - 160 + (i % 8) * 46, top + 60 + (i // 8) * 70 + (i % 3) * 10, 13, "#3b5f6b") for i in range(32)]
    out.append({"path": f"M{cx - 250} {top - 62} H{cx + 250}", "colour": TEAL, "width": 12})
    out += [atom(cx - 216 + i * 36, top - 62, 4, CREAM) for i in range(13)]
    return out


def balance(a=0.0, left=None, right=0):
    """A 17th-century equal-arm balance: post, beam on a pivot at (540, 430), two pans hung on chains."""
    import math as m
    ca, sa = m.cos(m.radians(a)), m.sin(m.radians(a))
    L, R = (540 - 320 * ca, 430 - 320 * sa), (540 + 320 * ca, 430 + 320 * sa)
    out = [paper("M470 1258 L486 1206 H594 L610 1258 Z", TEAL), {"line": [540, 1210, 540, 440], "colour": TEAL, "width": 18},
           {"line": [round(L[0]), round(L[1]), round(R[0]), round(R[1])], "colour": TEAL, "width": 18}, atom(540, 430, 12, YELLOW)]
    for (hx, hy) in (L, R):
        py = hy + 640
        out += [{"path": f"M{hx:.0f} {hy:.0f} L{hx - 146:.0f} {py:.0f} M{hx:.0f} {hy:.0f} L{hx + 146:.0f} {py:.0f}", "colour": TEAL, "width": 3, "dashed": True},
                paper(f"M{hx - 150:.0f} {py:.0f} H{hx + 150:.0f} C {hx + 130:.0f} {py + 44:.0f}, {hx - 130:.0f} {py + 44:.0f}, {hx - 150:.0f} {py:.0f} Z", TEAL, 5)]
    if right:
        x, y = R[0], R[1] + 640
        out += [paper(f"M{x - 100:.0f} {y:.0f} H{x + 100:.0f} V{y - 70:.0f} H{x - 100:.0f} Z", CREAM, 4), paper(f"M{x - 85:.0f} {y - 82:.0f} H{x + 85:.0f} V{y - 142:.0f} H{x - 85:.0f} Z", CREAM, 4)]
        if right > 1:
            out.append(paper(f"M{x - 70:.0f} {y - 154:.0f} H{x + 70:.0f} V{y - 206:.0f} H{x - 70:.0f} Z", CREAM, 4))
    return out


shot("s02", "hook", "type", "Terus, bahannya dari mana?",
     teaches="Asks the question out loud: what is the tree made of? The soil, as most people think?",
     screen="A sheet of cream paper has slid over the scene. Printed on a paper strip, in Fraunces: 'Bahannya / dari mana?', the word 'mana?' on an orange tab. Below it a small copy of the tree in a block of soil, a tag on the soil 'tanah?', and a big cut-out question mark in deep teal standing up beside it.",
     motion="The sheet slides in from the left (12 drawings a second); the strip drops onto it with a little bounce; the soil block and the tree pop up; the question mark folds up as the voice asks; the tag flips down on 'dari'. A slow push on the sheet.",
     carries="The sheet.", transition="The sheet slides off to the right, uncovering Helmont and his pot.",
     sound="A paper slide, the strip landing, a pop for the tree, a crisp fold for the question mark, a tag flick.", check="The question reads in under a second, with the sound off; 'tanah?' is a question, not a claim.",
     frames=[fr(0, "The sheet sliding across the tree from the left; the strip dropping onto it.", opening(), layer_slide(620), strip(300, 560, "Bahannya\ndari mana?", 70, "mana?"), {"move": [120, 560, 560, 560], "text": "lapisan geser"}),
             fr(0.5, "The strip has landed; the tree in its soil and the question mark pop up.", layer_slide(1100), strip(540, 570, "Bahannya\ndari mana?", 116, "mana?"), soil_block(), paper(QMARK, TEAL, 6), {"move": [774, 1240, 774, 1000], "text": "berdiri"}),
             fr(1, "The tag on the soil: 'tanah?'.", layer_slide(1100), strip(540, 570, "Bahannya\ndari mana?", 116, "mana?"), soil_block(), paper(QMARK, TEAL, 6), tag(330, 1250, "tanah?", (300, 1186), 52), {"cut": "geser ke pot"})])

shot("s03", "bukti", "diagram", "Dulu ada yang pernah nyoba: pohon kecil ditanam di *pot*,",
     teaches="The test: a small tree planted in a pot of weighed, dried soil, the pot covered against dust.",
     screen="On the cream card over a strip of grass: Helmont as a cut-out figure on split pins (deep-teal coat, a cream ruff, yellow pins at the joints) holds a willow cutting over a big earthen pot, cut away to show its dry soil as many crumbs of deep teal. A stamped tag tied to the pot: 'tanah 91 kg'; a stamped tag on the cutting: 'pohon 2,3 kg'; a strip at the top: 'Van Helmont · abad ke-17'. After planting, a tinned plate with many holes slides over the pot's mouth.",
     motion="'tanah 91 kg' flips down at the start (on screen for 3.4 s); the strip slides in on 'ada'; 'pohon 2,3 kg' on 'pohon'; the arm turns on its pins and lowers the cutting into the soil (on twelves); its leaves unfold; on 'pot' the lid slides on. A slow push (8 %).",
     carries="The pot with its tags.", transition="The camera pulls back; the tags fold up one after the other; hills pop up behind: the pot is outside.",
     sound="Tag flicks, a soft thump of soil, a slide for the lid.", check="The tags read 91 kg and 2,3 kg (f1); the cutting is small next to the pot; the soil is in pieces, not a flat fill.", facts=["f1"],
     frames=[fr(0, "The pot of dried soil, cut away, tag 'tanah 91 kg'; Helmont holds the cutting above it.", lidded_pot()[:-14] if False else pot() + [atom(460 + (i % 8) * 46, 920 + (i // 8) * 70, 13, "#3b5f6b") for i in range(32)], tag(620, 1110, "tanah 91 kg", (395, 842)), figure(270, 1250, 640, (530, 644)), willow(540, 740, 160, 40), {"move": [600, 560, 600, 740], "text": "tanam"}),
             fr(0.5, "The strip names who tried it; the cutting's tag 'pohon 2,3 kg'.", pot() + [atom(460 + (i % 8) * 46, 920 + (i // 8) * 70, 13, "#3b5f6b") for i in range(32)], tag(620, 1110, "tanah 91 kg", (395, 842)), figure(270, 1250, 640, (610, 784)), willow(620, 880, 230, 50), tag(720, 530, "pohon 2,3 kg", (626, 730), 52), tag(540, 330, "Van Helmont · abad ke-17")),
             fr(1, "Planted, and the lid with many holes slides over the pot's mouth.", lidded_pot(), tag(620, 1110, "tanah 91 kg", (395, 842)), figure(270, 1250, 640), willow(620, 880, 230, 50), tag(720, 530, "pohon 2,3 kg", (626, 730), 52), tag(540, 330, "Van Helmont · abad ke-17"), {"move": [1000, 790, 760, 790], "text": "tutup"}, {"cut": "mundur, kalender"})])

shot("s03b", "bukti", "wide", "terus dirawat *lima tahun*.",
     teaches="Five years go by; the only thing added is rainwater.",
     screen="The pot outside, hills popped up behind it. A cream paper cloud top left drips cream raindrops into it, tag 'cuma disiram air hujan'. Right, a little paper calendar: 'tahun 1' turning to 'tahun 5'. The willow grows through the lid in pop-up steps into a small weeping willow, orange stem, leaf-green hanging leaves.",
     motion="The tags of s03 fold up one after the other and the camera pulls back (0.8 s); the calendar sheets flip over one by one (on twelves); with each flip the willow pops up a size; the rain falls the whole time.",
     carries="The grown willow in its pot.", transition="The willow is lifted out with its roots and carried to a balance that stands up from the ground.",
     sound="Page flips, light rain ticks on paper.", check="Five steps of growth; nothing but water goes into the pot.", facts=["f1"],
     frames=[fr(0, "The pot outside, the small cutting; the calendar reads 'tahun 1'; the cloud starts to rain.", hills(), lidded_pot(540), willow(540, 860, 230, 50), {"cloud": [300, 430, 360]}, {"path": "M220 470 v40 M300 480 v40 M380 470 v40", "colour": TEAL, "width": 6}, {"card": [760, 360, 170, 230]}, label(845, 450, "tahun", 44), label(845, 560, "1", 96, colour=TEAL), {"move": [845, 640, 845, 720], "text": "dibalik"}),
             fr(1, "Five years on: the willow is a small tree; the calendar reads 'tahun 5'; the tag 'cuma disiram air hujan'.", hills(), lidded_pot(540), willow(540, 860, 520, 205), {"cloud": [300, 430, 360]}, {"path": "M220 470 v40 M300 480 v40 M380 470 v40", "colour": TEAL, "width": 6}, {"card": [760, 360, 170, 230]}, label(845, 450, "tahun", 44), label(845, 560, "5", 96, colour=TEAL), tag(390, 300, "cuma disiram air hujan", (320, 400), 50), {"cut": "angkat ke timbangan"})])

shot("s04", "bukti", "diagram", "Pohonnya nambah *tujuh puluh kilo* lebih,",
     teaches="The tree gained about 74 kg: it is weighed on a balance, out of its soil.",
     screen="The willow comes up out of the pot with its bare roots and is carried left; the pot is carried off right. A 17th-century equal-arm balance stands up from the ground (a post, a beam on a pivot at (540, 430), two pans hung on chains); the willow is set on the left pan, plain cream weights go on the right pan until the beam is level. A stamped tag hangs from the pivot: '+74 kg'.",
     motion="Lift (0.4 s), carry; the balance pops up like a pop-up page, its pans drop on their chains; the willow goes down onto the pan, which sinks; three weights drop on the other pan one after another and the beam swings level; the stamp drops on its thread with a little swing. A slow push.",
     carries="The balance.", transition="The willow and its weights come off; the pot of soil is lowered onto the pan.",
     sound="Soil crumbling as the roots come out, a pop for the balance, a clunk on the pan, a tick per weight, a stamp.", check="The stamp reads +74 kg (164 lb, f1), at its value; a balance, not a dial scale (none existed in 1648).", facts=["f1"],
     frames=[fr(0, "The willow lifted out of its pot with bare roots, carried left; the balance standing up.", willow(230, 700, 520, 205), {"path": "M230 700 c-30 40 -70 50 -110 60 M230 700 c30 40 70 50 110 60 M230 700 c0 40 4 60 -6 90", "colour": ORANGE, "width": 8}, lidded_pot(1000), balance(), {"move": [620, 700, 260, 700], "text": "angkat"}),
             fr(0.5, "On the left pan, which sinks; weights going onto the right pan.", balance(-7, right=1), willow(220, 1020, 520, 205), {"move": [860, 700, 860, 960], "text": "beban"}),
             fr(1, "The beam level; the stamp '+74 kg' on its thread.", balance(0, right=2), willow(220, 1020, 520, 205), {"path": "M540 450 L560 744", "colour": TEAL, "width": 3}, stamp(560, 820, "+74 kg", 78), {"cut": "ganti tanah"})])

shot("s05", "bukti", "diagram", "tapi tanahnya cuma berkurang sekitar *setengah ons*.",
     teaches="The soil, weighed again after five years, lost only about 57 grams: almost nothing.",
     screen="The same balance. The willow and its weights are gone; the pot of soil (dried again) is lowered onto the left pan; the weights for its first weighing go on the right pan, tagged 'dulu 91 kg', and the beam is level. The smallest weight is lifted off the top of the stack and held up: a stamped tag '−57 g', and under it '< 0,1 %'. The beam does not move: 57 g of 91 kg cannot be seen.",
     motion="Willow off left, weights off up; the pot comes down onto the pan, which sinks; the weights drop one by one and the beam swings level; on 'berkurang' the tiny weight is lifted off in an arc; '−57 g' flips down on 'setengah', '< 0,1 %' on 'ons'. A slow push.",
     carries="The balance with the soil on it.", transition="A sheet of paper slides across from the right; behind it the tree stands up from the page.",
     sound="A slide, a clunk, ticks for the weights, a tick for the tiny one, a stamp for '−57 g'.", check="'dulu 91 kg', '−57 g', '< 0,1 %' (f1, f10): 2 oz of 200 lb; the beam stays level.", facts=["f1", "f10"],
     frames=[fr(0, "The pot of soil lowered onto the left pan; the willow carried off left.", balance(-8), pot(220, 690), willow(-60, 900, 520, 205), {"move": [220, 300, 220, 640], "text": "turun"}),
             fr(0.5, "Weighed again: the weights 'dulu 91 kg' and the beam level.", balance(0, right=2), pot(220, 690), tag(662, 990, "dulu 91 kg", (760, 960), 46)),
             fr(1, "The tiny weight lifted off: '−57 g', '< 0,1 %'.", balance(0, right=2), pot(220, 690), tag(662, 990, "dulu 91 kg", (760, 960), 46), paper("M676 660 H704 V642 H676 Z", CREAM, 3), tag(676, 566, "−57 g", (690, 640), 64), tag(650, 800, "< 0,1 %", (690, 664), 50), {"cut": "lapisan geser"})])

shot("s06", "bahan", "wide", "Ternyata bahannya dari *udara* dan air.",
     teaches="The answer to where it comes from: air and water.",
     screen="Behind the sheet the tree stands up from the page layer by layer (hills, soil, tree, the near grass). The camera frames the canopy and the sky: three CO₂ molecules (a deep-teal carbon disc between two red oxygen discs) slide in towards the leaves, an arrow, a tag 'udara (CO₂)'. Then a rostrum tilt down the trunk to the roots: three water molecules (a red oxygen disc with two cream hydrogen discs) by the roots, an arrow up the trunk, a tag 'air (H₂O)'.",
     motion="The sheet slides across (0.9 s) and the layers pop up behind it, back to front; a slow push on the canopy; the CO₂ slides in on 'udara'; a 0.75 s tilt down to the roots on 'air'; the soil lifts a little and the water appears.",
     carries="The tree, the CO₂ by the leaves, the water by the roots.", transition="A 1 s rostrum push into one leaf of the canopy.",
     sound="A slide for the sheet, a big pop as the tree stands up, a slide for the molecules, a tag flick, air for the tilt.", check="Same colours as everywhere: carbon teal, oxygen red, hydrogen cream.", facts=["f3"],
     frames=[fr(0, "The sheet sliding off; the tree standing up from the page.", opening(), layer_slide(500), {"move": [900, 900, 300, 900], "text": "lapisan geser"}),
             fr(0.5, "Framed on the canopy: CO₂ slides in towards the leaves; tag 'udara (CO₂)'.", sun(840, 260, 130), tree(540, 1395, 1.2), co2(72, 744), co2(120, 948), co2(940, 828), paper_arrow(60, 852, 222, 816, TEAL), tag(275, 519, "udara (CO₂)", (72, 720), 52), {"camera": "push"}),
             fr(1, "Tilted down to the roots: water by the roots, an arrow up the trunk; tag 'air (H₂O)'.", paper(lifted(hills()["path"], 0), GREEN), soil(1110), roots(540, 1110), {"path": "M490 1110 L500 400 L580 400 L590 1110 Z", "colour": ORANGE, "fill": ORANGE, "width": 6}, h2o(400, 1190), h2o(680, 1196), h2o(810, 1176), paper_arrow(540, 1090, 540, 840, CREAM, 30), tag(720, 1038, "air (H₂O)", (810, 1150), 52), {"camera": "down"}, {"cut": "masuk ke daun"})])

shot("s07", "bahan", "diagram", "Karbon dioksida masuk lewat pori-pori kecil di *daun*,",
     teaches="Carbon dioxide gets in through tiny pores on the underside of the leaf (stomata).",
     screen="A rostrum push lands on one leaf of the tree, which now fills the frame (x 95-995, y 470-1090), other leaves of the canopy paler behind it. The leaf turns over on its midrib to show its paler underside dotted with pores. Tiny CO₂ molecules (smaller than a pore) drift up to them; tags 'CO₂', 'pori daun'. A second push onto one pore: two leaf-green guard cells round a dark slit (centre 540, 820) on a field of skin cells; a CO₂ molecule slips through the slit; tags 'pori daun (stomata)', 'CO₂'.",
     motion="Push from the tree into the leaf (1 s, with parallax); the leaf turns over (on twelves); CO₂ drifts up; push onto the pore (0.75 s); the guard cells part a little and the molecule sinks through the slit, behind the paper.",
     carries="The leaf.", transition="A sheet of paper slides down over the pore; under it the tree, tilted down to its roots.",
     sound="Air for the pushes, a paper flip as the leaf turns, tag flicks, a soft 'pff' as the molecule slips through.", check="The pores are on the underside; the molecules are drawn smaller than the pores they enter (neither is to scale).", facts=["f4"],
     frames=[fr(0, "Landed in one leaf: it fills the frame, other leaves paler behind.", leaf_big(), {"camera": "push"}),
             fr(0.5, "Turned over: the paler underside, dotted with pores; tiny CO₂ drifts up to them.", paper("M110 820 C 280 520, 760 460, 980 760 C 760 1020, 290 1080, 110 820 Z", "#a8c49a", 8), stoma(300, 820, 30, 50), stoma(460, 720, 30, 50), stoma(500, 900, 30, 50), stoma(660, 820, 30, 50), stoma(780, 760, 30, 50), co2(470, 960, 6), co2(760, 1000, 6), tag(340, 470, "pori daun", (450, 700), 50), {"move": [540, 600, 540, 1000], "text": "dibalik"}),
             fr(1, "One pore up close: the guard cells, the slit, a CO₂ molecule slipping through; tags.", paper(ell(540, 830, 420, 330), "#8fb57e", 6), stoma(540, 830, 230, 400), co2(540, 690, 30), tag(410, 1190, "pori daun (stomata)", (430, 1010)), tag(820, 300, "CO₂", (600, 680)), {"move": [380, 560, 520, 690], "text": "masuk"}, {"cut": "lapisan turun"})])

shot("s08", "bahan", "wide", "air naik dari *akar*.",
     teaches="Water comes up from the roots, through the stem, to the leaves.",
     screen="Under the sheet: the tree, the camera tilted down to the ground (at y 760) and pushed in, the trunk rising out of frame. The soil's front layer has folded down like a flap to show the whole root system on the deep soil, with root hairs at the tips. A strip of bark is lifted aside on the trunk: a cream channel (the xylem). Small water molecules (red with two cream discs, narrower than the channel) climb from the root tips up the channel one after another. Tags: 'akar', 'air (H₂O)'.",
     motion="The sheet slides down across the frame (0.8 s); the flap is down; the bark strip folds aside; the water molecules step up the channel, a drawing at a time; the tags flip down.",
     carries="The water climbing the trunk.", transition="A 1 s rostrum move up the trunk and into a leaf; its surface lifts.",
     sound="A slide for the sheet, a paper fold, small ticks as the molecules climb, tag flicks.", check="The water goes up, from roots to leaves, never down; the molecules fit inside the channel.", facts=["f5"],
     frames=[fr(0, "Tilted down: the ground, the trunk, the soil flap folded down, the deep roots.", paper("M0 760 C 300 740, 700 780, 1080 750 V1910 H0 Z", TEAL), paper("M480 760 L500 200 L580 200 L600 760 Z", ORANGE), {"path": "M540 760 C 500 860, 380 940, 230 1040 M540 760 C 590 870, 700 940, 850 1050 M540 760 C 530 880, 560 1000, 520 1130", "colour": ORANGE, "width": 12}, {"move": [900, 800, 900, 1020], "text": "dibuka"}, {"camera": "down"}),
             fr(1, "Water molecules climb the cream channel; tags 'akar' and 'air (H₂O)'.", paper("M0 760 C 300 740, 700 780, 1080 750 V1910 H0 Z", TEAL), paper("M480 760 L500 200 L580 200 L600 760 Z", ORANGE), paper("M520 900 L522 200 L558 200 L560 900 Z", CREAM, 4), {"path": "M540 760 C 500 860, 380 940, 230 1040 M540 760 C 590 870, 700 940, 850 1050 M540 760 C 530 880, 560 1000, 520 1130", "colour": ORANGE, "width": 12}, h2o(230, 1070, 12), h2o(850, 1080, 12), h2o(540, 620, 12), h2o(540, 460, 12), h2o(540, 300, 12), {"move": [640, 900, 640, 400], "text": "naik"}, tag(216, 1007, "akar", (300, 1000)), tag(720, 620, "air (H₂O)", (556, 470)), {"cut": "naik ke daun"})])

shot("s09", "bahan", "diagram", "Nah, di daun ada *klorofil*, zat hijau yang nangkep cahaya matahari.",
     teaches="Inside the leaf, chlorophyll (the green stuff in the chloroplasts) catches the sunlight.",
     screen="A rostrum move up the trunk lands in a leaf; its surface lifts away like a flap, and the leaf is there in cross-section, filling the frame (y 280-1260 on screen) and held for 3 s: the waxy cuticle, the upper skin as a row of flat clear cells, tall palisade cells packed with leaf-green chloroplasts (each with its nucleus), spongy cells round air spaces, a vein (xylem rings for water, small orange phloem cells for sugar, a ring of sheath cells), the lower skin with a stoma opening into an air space. Tags 'kloroplas' and 'klorofil = zat hijau'. Strips of yellow paper (sunlight) slant in from the top right onto the palisade. Then a 0.8 s push into one chloroplast of a palisade cell.",
     motion="Move up and in (1 s); the flap lifts (on twelves); a slow push across the section (1.14 to 1.2); the tags flip down on 'ada' and 'zat'; the light strips slide in on 'nangkep'; the push into a chloroplast, which opens into the next set at the same size.",
     carries="The chloroplast.", transition="Continuous: the push goes on into the chloroplast.",
     sound="Air for the moves, a paper peel for the flap, tag flicks, a warm chime as the light lands.", check="Every layer of a leaf section in its place; the light lands on the green; the section is on screen for 3 s.", facts=["f6"],
     frames=[fr(0, "Landed in a leaf: its surface, a green flap, lifts away.", paper("M0 300 H1080 V1300 H0 Z", LEAFG), {"path": "M0 800 H1080", "colour": "#4f7f3e", "width": 14}, {"move": [540, 900, 540, 380], "text": "dibuka"}, {"camera": "push"}),
             fr(0.5, "The leaf in cross-section: cuticle, upper skin, palisade with chloroplasts, spongy cells and air spaces, a vein, lower skin with a stoma; tags 'kloroplas', 'klorofil = zat hijau'.", paper("M0 282 H1080 V340 H0 Z", CREAM, 3), [paper(f"M{-40 + i * 166} 346 h150 v450 h-150 Z", CREAM, 4) for i in range(7)], [atom(-40 + i * 166 + (30 if j % 2 else 120), 380 + j * 52, 18, LEAFG) for i in range(7) for j in range(8)], [paper(ell(x, y, 80, 56), CREAM, 4) for x, y in ((80, 930), (280, 960), (900, 950), (1040, 1010), (160, 1090))], paper(ell(700, 1010, 130, 105), CREAM, 4), [atom(700 + dx, 990 + dy, 22, CREAM) for dx, dy in ((-40, -20), (0, -36), (40, -20))], [atom(660 + i * 20, 1050, 9, ORANGE) for i in range(5)], paper("M0 1200 H1080 V1246 H0 Z", CREAM, 3), stoma(330, 1222, 24, 40), tag(250, 330, "kloroplas", (210, 432), 56), tag(680, 330, "klorofil = zat hijau", (470, 640), 50)),
             fr(1, "Sunlight slants in onto the palisade; the push into one chloroplast begins.", [paper(f"M{-40 + i * 166} 346 h150 v450 h-150 Z", CREAM, 4) for i in range(7)], [atom(-40 + i * 166 + (30 if j % 2 else 120), 380 + j * 52, 18, LEAFG) for i in range(7) for j in range(8)], beam(1080, 60, 700, 520, 60), beam(1080, 220, 860, 560, 60), {"camera": "push"}, {"cut": "masuk kloroplas"})])

shot("s10", "dapur", "diagram", "Energi cahayanya dipakai buat *mecah* air.",
     teaches="The light, caught by the chlorophyll, gives its energy to split water apart.",
     screen="Inside the chloroplast, filling the frame: its double envelope (two membranes), the pale stroma, four grana (stacks of green thylakoid coins) joined by thin lamellae, a few starch grains. A water molecule (red disc, two cream discs, r 50) comes in from the left to beside the second granum. A yellow strip of light lands on that granum (on its chlorophyll, tag 'klorofil'), not on the water; a yellow zigzag of energy passes from the granum to the water; a snip: the red oxygen jumps up-left, the two cream hydrogens jump right. Tags 'H₂O', then 'O' and 'H'.",
     motion="The molecule slides in (on twelves); the light strip slides in and lands on the stack; the zigzag travels from the stack to the molecule; a dashed cut line and the snip on 'mecah': the three discs jump apart along it, each landing with a little bounce. A slow push.",
     carries="The loose red O and the cream H discs.", transition="The O drifts up and out; a sheet of paper slides up across the frame.",
     sound="A slide, a warm chime as the light lands, a softer chime as the energy passes, a crisp scissor snip on 'mecah'.", check="One red disc and two cream discs come out of one water molecule; the light goes through the chlorophyll, not straight onto the water.", facts=["f7", "f6"],
     frames=[fr(0, "The chloroplast: double envelope, stroma, four grana and lamellae; the water comes in.", paper(ell(540, 820, 600, 420), "#4f7f3e", 8), paper(ell(540, 820, 552, 374), "#c5d8b8", 4), [granum(x, y, 6, 84, 20, 28) for x, y in ((200, 900), (400, 830), (610, 910), (380, 1060))], h2o(230, 676, 50), tag(300, 380, "H₂O", (240, 626), 64), {"move": [-100, 660, 200, 676], "text": "air masuk"}),
             fr(0.5, "The light lands on the second granum (its chlorophyll); a zigzag of energy passes to the water.", paper(ell(540, 820, 600, 420), "#4f7f3e", 8), paper(ell(540, 820, 552, 374), "#c5d8b8", 4), [granum(x, y, 6, 84, 20, 28) for x, y in ((200, 900), (400, 830), (610, 910), (380, 1060))], h2o(230, 676, 50), beam(1150, 160, 460, 700, 70), {"path": "M380 700 l-20 -14 l-10 16 l-20 -14 l-10 16 l-20 -14", "colour": YELLOW, "width": 8}, tag(560, 380, "klorofil", (420, 700), 56)),
             fr(1, "Snip: the oxygen jumps one way, the two hydrogens the other; tags 'O' and 'H'.", paper(ell(540, 820, 600, 420), "#4f7f3e", 8), paper(ell(540, 820, 552, 374), "#c5d8b8", 4), [granum(x, y, 6, 84, 20, 28) for x, y in ((200, 900), (400, 830), (610, 910), (380, 1060))], beam(1150, 160, 460, 700, 70), atom(150, 520, 50, RED), atom(560, 630, 32, CREAM), atom(660, 690, 32, CREAM), tag(200, 380, "O", (150, 470), 64), tag(720, 420, "H", (566, 598), 64), {"cut": "O keluar"})])

shot("s11", "dapur", "wide", "Oksigennya dilepas, terus kita *hirup*.",
     teaches="The oxygen from the water is let out into the air, and it is what we breathe.",
     screen="Under the sheet: the tree on the left (the camera to its right), a cut-out person on split pins standing under the canopy's edge on the right (x 775-880, clear of the app's rail). Two red discs join into a pair in the canopy; pairs of red discs (O₂) float out of the leaves to the person's face. A tag 'O₂ (oksigen)' tied to one pair.",
     motion="The sheet slides up across the frame (0.8 s); two O discs meet and pair; the pairs drift out on the twelves; the person's chest rises (the body piece swings up on its pin) as the pairs reach the face. A slow push.",
     carries="The tree and the person.", transition="A sheet of paper slides across from the left; under it the chloroplast again.",
     sound="A slide, a small click as the pair forms, pops as pairs come out, one breath in, timed to the chest.", check="The O₂ comes out of the leaves, not out of the trunk or the soil.", facts=["f7"],
     frames=[fr(0, "Two O discs pair in the canopy; O₂ pairs float out; tag 'O₂ (oksigen)'.", sun(780, 330, 100), paper(lifted(hills()["path"], -40), GREEN), soil(1155), tree(380, 1155, 1.0), figure(830, 1155, 460), o2(560, 500), o2(620, 620), o2(500, 740), tag(680, 290, "O₂ (oksigen)", (560, 470), 50), {"move": [560, 540, 760, 660], "text": "keluar"}),
             fr(1, "The pairs reach the person's face; the chest rises: breathing in.", sun(780, 330, 100), paper(lifted(hills()["path"], -40), GREEN), soil(1155), tree(380, 1155, 1.0), figure(830, 1155, 460), o2(760, 730), o2(780, 790), tag(680, 290, "O₂ (oksigen)", (760, 700), 50), {"move": [700, 720, 800, 760], "text": "dihirup"}, {"cut": "lapisan geser"})])

shot("s12", "dapur", "diagram", "Hidrogennya digabung sama karbon dioksida, jadi *gula*.",
     teaches="The hydrogen from the water is joined with carbon dioxide, in the chloroplast's fluid, to make sugar.",
     screen="Under the sheet: the same chloroplast, the same four grana, the camera moved right to the stroma. Cream hydrogen discs come from the grana (where the water was split); two CO₂ molecules come in from outside, through the envelope at the right edge; they meet in the stroma and are pressed together into one orange paper hexagon, the sugar (centre 670, 820 on screen, r 130). A tag: 'gula'. (Fewer pieces than one glucose needs, f8; the formula is on the recipe card, not here.)",
     motion="The sheet slides across from the left (0.9 s); the hydrogens slide in from the grana (on twelves); the CO₂ slides in from the right; they click together; the hexagon pops up out of them, a size too big, then settles; the tag flips down. A slow push.",
     carries="The orange sugar hexagon.", transition="Pull back out of the chloroplast and the leaf to the whole tree.",
     sound="A slide, little paper clicks as the pieces meet, a warm pluck as the hexagon pops up, a tag flick.", check="The sugar is made of the cream H and the teal-and-red CO₂, nothing else; four grana, as before.", facts=["f8", "f3"],
     frames=[fr(0, "Hydrogens from the grana, CO₂ from the right edge.", paper(ell(390, 810, 600, 420), "#4f7f3e", 8), paper(ell(390, 810, 552, 374), "#c5d8b8", 4), [granum(x, y, 6, 84, 20, 28) for x, y in ((50, 890), (250, 820), (460, 900), (230, 1050))], [atom(400 + (i % 2) * 40, 700 + i * 70, 28, CREAM) for i in range(4)], co2(980, 690, 28), co2(980, 950, 28), {"move": [1060, 820, 820, 820], "text": "CO₂"}),
             fr(0.5, "They meet in the stroma and are pressed together.", paper(ell(390, 810, 600, 420), "#4f7f3e", 8), paper(ell(390, 810, 552, 374), "#c5d8b8", 4), [granum(x, y, 6, 84, 20, 28) for x, y in ((50, 890), (250, 820), (460, 900), (230, 1050))], [atom(630 + (i % 2) * 40, 780 + (i // 2) * 40, 20, CREAM) for i in range(4)], co2(720, 800, 22), co2(700, 880, 22)),
             fr(1, "The orange sugar hexagon pops up; tag 'gula'.", paper(ell(390, 810, 600, 420), "#4f7f3e", 8), paper(ell(390, 810, 552, 374), "#c5d8b8", 4), [granum(x, y, 6, 84, 20, 28) for x, y in ((50, 890), (250, 820), (460, 900), (230, 1050))], hexagon(670, 820, 130), tag(610, 430, "gula", (640, 690), 64), {"cut": "mundur ke pohon"})])

shot("s13", "gula", "wide", "Gula inilah *makanan* tumbuhan,",
     teaches="That sugar is the plant's food: it is sent all over the plant.",
     screen="The chloroplast shrinks away and the camera pulls back out of the leaf to the tree, framed on the canopy (1.12x). Small orange paper hexagons appear in the leaves and travel along the branches, down the trunk and out along the roots, and up to the top of the canopy, like beads on a thread; a tag 'makanan' tied to one of them. The camera tilts down after them.",
     motion="Pull back (0.8 s); the hexagons pop up and slide along in steps (on twelves); a tilt down the trunk following them.",
     carries="The tree with its sugar.", transition="A sheet of paper slides across; under it a growing branch tip.",
     sound="Air for the pull-back, a pop as the sugars appear, a soft run of plucked notes as they travel.", check="The sugar goes from the leaves to the rest of the plant.", facts=["f9"],
     frames=[fr(0, "Pulled back: sugar hexagons appear in the leaves; tag 'makanan'.", sun(860, 240, 120), tree(540, 1450, 1.12), [hexagon(x, y, 26) for x, y in ((300, 700), (760, 680), (545, 470), (420, 545), (690, 540))], tag(770, 300, "makanan", (545, 440)), {"camera": "pull"}),
             fr(1, "The hexagons travel down the trunk to the roots and up to the top of the canopy; the camera follows down.", paper(lifted(hills()["path"], -200), GREEN), soil(995), roots(540, 995), {"path": "M490 995 L510 100 L570 100 L590 995 Z", "colour": ORANGE, "fill": ORANGE, "width": 6}, [hexagon(x, y, 26) for x, y in ((540, 300), (540, 560), (540, 820), (420, 1060), (680, 1062))], {"move": [640, 300, 640, 900], "text": "dikirim"}, {"camera": "down"}, {"cut": "lapisan geser"})])

shot("s14", "gula", "diagram", "yang disusun jadi daun, batang, sampai *kayu*.",
     teaches="The sugar is also the building material: a new leaf, a longer stem, and wood, whose cell walls are chains of the sugar (cellulose).",
     screen="Under the sheet: a branch close up, thick at the bottom left, its tip at the upper right, a twig and old leaves on it. A flap of its bark opens: under it the wood's long cells, their walls laid as chains of small orange hexagons (cellulose), one wall after another, tag 'dinding sel = rantai gula'. Sugar beads ride up the branch; on 'daun' a new leaf pops up at the tip (tag 'daun baru'); on 'batang' the stem grows on, with another leaf; on 'kayu' the tag 'kayu' on the wood.",
     motion="The sheet slides across (0.8 s); the flap opens; the walls are laid down in sequence (on twelves); beads ride up; the leaf and the stem pop up on their words; the tags flip down. A slow push.",
     carries="The branch, built from sugar.", transition="The recipe card, folded, slides in over it on a sheet of its own.",
     sound="A slide, a paper peel for the flap, quick soft clicks as the walls are laid, pops for the leaf and the stem, a wooden knock for 'kayu'.", check="The walls are made of the same orange hexagons as the sugar in s12; the leaf and stem appear on their words.", facts=["f9"],
     frames=[fr(0, "The branch; the bark flap opens on the wood's cells.", paper("M-140 1430 L240 1000 L540 690 L760 470 L810 520 L590 760 L300 1120 L120 1500 Z", ORANGE, 6), paper("M60 1100 L300 840 L500 1060 L260 1320 Z", "#f9cfa8", 4), {"move": [200, 1300, 260, 1000], "text": "dibuka"}),
             fr(0.5, "Cell walls of chained hexagons; tag 'dinding sel = rantai gula'; a new leaf at the tip, tag 'daun baru'.", paper("M-140 1430 L240 1000 L540 690 L760 470 L810 520 L590 760 L300 1120 L120 1500 Z", ORANGE, 6), paper("M60 1100 L300 840 L500 1060 L260 1320 Z", "#f9cfa8", 4), [hexagon(120 + i * 30, 1060 - i * 32, 10) for i in range(7)], [hexagon(200 + i * 30, 1140 - i * 32, 10) for i in range(7)], [hexagon(280 + i * 30, 1220 - i * 32, 10) for i in range(7)], paper("M760 450 C 720 380, 650 360, 560 380 C 640 420, 700 450, 760 450 Z", LEAFG, 5), tag(600, 1110, "dinding sel = rantai gula", (330, 1060), 46), tag(280, 290, "daun baru", (650, 400), 50)),
             fr(1, "The stem grown on; the tag 'kayu' on the wood.", paper("M-140 1430 L240 1000 L540 690 L760 470 L810 520 L590 760 L300 1120 L120 1500 Z", ORANGE, 6), paper("M60 1100 L300 840 L500 1060 L260 1320 Z", "#f9cfa8", 4), [hexagon(120 + i * 30, 1060 - i * 32, 10) for i in range(7)], [hexagon(200 + i * 30, 1140 - i * 32, 10) for i in range(7)], [hexagon(280 + i * 30, 1220 - i * 32, 10) for i in range(7)], paper("M760 450 C 720 380, 650 360, 560 380 C 640 420, 700 450, 760 450 Z", LEAFG, 5), paper("M780 500 L880 330 L900 345 L805 515 Z", ORANGE, 5), tag(700, 990, "kayu", (440, 1060), 60), {"cut": "kartu resep"})])

shot("s15", "recap", "recap", "Jadi tumbuhan bikin makanannya sendiri, dari *cahaya*, udara, dan air.",
     teaches="The answer in one frame: light, air and water go into the leaf; sugar and oxygen come out; the sugar becomes the plant's body and wood; not from the soil.",
     screen="A recipe card (x 70-1010, y 246-1290) on a sheet of its own, folded in half when it arrives; it opens like a pop-up. Middle: a leaf-green leaf. Bottom row: the orange hexagon 'gula' with an arrow to a small tree 'tubuh, kayu', and a red O₂ pair 'oksigen', with arrows from the leaf. Top row, one per word: the yellow sun 'cahaya', a CO₂ molecule 'udara', a water molecule 'air', each with an arrow into the leaf. Printed along the bottom strip: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂'. Stamped at the top: 'bukan dari tanah'.",
     motion="The sheet slides in; the card's top half opens up from the fold (pop-up); the leaf pops up; on 'tumbuhan' the small tree; on 'makanannya' the sugar and its arrow to the tree; on 'sendiri' the oxygen; the three ingredients pop up one per word with their arrows folding down; the equation strip slides in; the stamp lands on 'air'. A slow push.",
     carries="The card, until its sheet slides away.", transition="The sheet slides off to the right, uncovering the opening tree.",
     sound="A slide, a fold as the card opens, pops, a pluck for the sugar, a warm chord on the outputs, taps for the ingredients, a stamp.", check="Readable as a summary with the sound off; the equation balances (f3); nothing collides with the labels.", facts=["f3", "f2", "f9"],
     frames=[fr(0, "The card arrives folded and opens up from its fold; the leaf pops up.", layer_slide(1100), paper("M72 770 L1006 770 L1002 1290 L76 1284 Z", CREAM, 6), paper("M72 246 L1006 252 L1006 772 L72 772 Z", CREAM, 6), paper("M340 802 C 420 676, 660 676, 740 802 C 660 928, 420 928, 340 802 Z", LEAFG, 6), {"move": [540, 760, 540, 300], "text": "dibuka"}),
             fr(0.5, "Out: gula (and from it the tree's body and wood) and oksigen.", layer_slide(1100), paper("M72 246 L1006 252 L1002 1290 L76 1284 Z", CREAM, 6), paper("M340 802 C 420 676, 660 676, 740 802 C 660 928, 420 928, 340 802 Z", LEAFG, 6), paper_arrow(470, 905, 320, 962, TEAL, 22), paper_arrow(610, 905, 770, 962, TEAL, 22), hexagon(260, 1018, 64), paper_arrow(338, 1018, 452, 1018, TEAL, 22), tree(560, 1098, 0.17), o2(830, 1018, 36), label(260, 1140, "gula", 50, colour=TEAL), label(560, 1140, "tubuh, kayu", 50, colour=TEAL), label(830, 1140, "oksigen", 50, colour=TEAL)),
             fr(1, "In: cahaya, udara, air; the equation; the stamp 'bukan dari tanah'.", layer_slide(1100), paper("M72 246 L1006 252 L1002 1290 L76 1284 Z", CREAM, 6), sun(220, 450, 76), co2(540, 455, 30), h2o(860, 440, 34), label(220, 588, "cahaya", 56, colour=TEAL), label(540, 588, "udara", 56, colour=TEAL), label(860, 588, "air", 56, colour=TEAL), paper_arrow(250, 625, 410, 722, TEAL, 24), paper_arrow(540, 625, 540, 706, TEAL, 24), paper_arrow(830, 625, 670, 722, TEAL, 24), paper("M340 802 C 420 676, 660 676, 740 802 C 660 928, 420 928, 340 802 Z", LEAFG, 6), hexagon(260, 1018, 64), tree(560, 1098, 0.17), o2(830, 1018, 36), label(260, 1140, "gula", 50, colour=TEAL), label(560, 1140, "tubuh, kayu", 50, colour=TEAL), label(830, 1140, "oksigen", 50, colour=TEAL), label(540, 1250, "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂", 40, colour=TEAL), stamp(540, 335, "bukan dari tanah", 50), {"cut": "kartu geser keluar"})])

shot("s16", "recap", "wide", "Makanya,",
     teaches="The bridge back into the first line.",
     screen="The recipe card slides off to the right and the opening picture is under it: the big paper tree on the hill, the sun, the soil, the same layers in the same places as frame 0.",
     motion="The card slides right (on twelves) with its shadow; the leaf clusters settle into the frame-0 pose a moment before the film loops.",
     carries="Into s01.", transition="No cut: the film loops straight into s01.",
     sound="The bed runs on into the opening.", check="The last frame matches frame 0 (check.mjs SSIM).",
     frames=[fr(0, "The card slides off to the right, uncovering the opening tree.", opening(), paper("M560 280 H1100 V1300 H560 Z", CREAM, 7), {"move": [600, 760, 900, 760], "text": "geser"}),
             fr(1, "The opening picture, a moment before frame 0.", opening(), {"cut": "loop ke s01"})])

duration = round(t, 3)
shots[-1]["end"] = duration

storyboard = {
    "title": "Gimana tumbuhan bikin makanan dari cahaya?",
    "question": "Pohon bisa tumbuh segede ini, tapi tanah di bawahnya hampir nggak berkurang. Terus, bahannya dari mana?",
    "audience": "Orang Indonesia yang nonton video pendek. Mereka pernah dengar kata 'fotosintesis' di pelajaran IPA, tapi banyak yang masih mengira tumbuhan 'makan' dari tanah, dan nggak bisa menjelaskan dari mana bahan tubuh tumbuhan berasal.",
    "promise": "Tumbuhan bikin makanannya sendiri: daun menangkap cahaya dengan klorofil, energinya dipakai untuk memecah air (oksigennya dilepas), dan hidrogennya digabung dengan karbon dioksida dari udara jadi gula, yang jadi makanan sekaligus bahan tubuh tumbuhan. Jadi pohon dibangun dari udara dan air, bukan dari tanah.",
    "template": "paper",
    "standard": 3,
    "language": "id",
    "format": "1080x1920",
    "captions": "pop",
    "duration": duration,
    "fps": 60,
    "loop": {"line": "Makanya, / pohon bisa tumbuh segede ini, tapi tanah di bawahnya hampir nggak berkurang.", "picture": "The recipe card of the recap slides off to the right and uncovers the opening picture: the big paper tree on its hill with the soil under it, every layer where frame 0 has it."},
    "voice": {"voice_id": "GdyFAZdMpKMBHw5pc1Bu", "name": "Livna", "model": "eleven_v4", "language": "id", "direction": "[warmly]"},
    "look": {
        "accent": "#f4a261",
        "mood": "The Paper Cut-out template: layers of craft paper cut out and stacked with small gaps on a cream card backdrop (#f8f1e5), one soft light from above so each layer drops a small shadow on the one behind, visible fibre, slightly rough cut edges and the odd fold line, a foreground layer nearest the lens in most shots. Papers keep one meaning each all film: sun yellow #e9c46a is light, orange #f4a261 is sugar and what is built from it (the trunk and branches, the wood: s14 opens the bark to show it), red #e76f51 is oxygen, deep teal #264653 is carbon, soil and the printed type, leaf green #6a9a4f (the concept still's leaf) is the leaf and its chlorophyll, the teal greens are the hills. Hydrogen is a cream disc; the cloud and the rain are cream. Everything slides, flips, folds and pops up like a pop-up book, stepped at 12 frames a second; a rostrum camera with parallax between the layers makes 0.8-1 s moves and slow pushes; cuts are those moves or a sheet of paper slid across the frame. Labels are paper tags tied with thread; numbers are stamped tags at their real values; captions are phrases on a paper strip laid down as they are said, the key word on an orange tab. No gradients, no glow, no clean vector edges.",
    },
    "music": {
        "track": "Composed for this film (ElevenLabs Music, music/bed.mp3), written to the take's length",
        "bpm": 92,
        "note": "A gentle acoustic bed: fingerpicked nylon-string guitar, a soft upright piano and a brushed shaker, in a warm major key, composed to the take's length so it ends under the bridge and runs on into the opening. It thins to guitar alone under the pot experiment and the numbers (s03-s05), adds the piano when the leaf opens (s09), and lifts on the recipe card (s15). Sound effects are paper: a rustle for every pop-up, a slide for every layer that wipes the frame, a snip on 'mecah' (s10), soft taps for tags and stamps, light rain ticks in s03b, one breath in for s11. The cuts follow the take, not the beat.",
    },
    "facts": [
        {"id": "f1", "claim": f"Van Helmont's willow experiment (published 1648, so 'abad ke-17' on screen): 200 pounds of oven-dried earth in an earthen pot, a willow stem of 5 pounds, watered only with rainwater or distilled water, the mouth of the pot covered against dust with 'an iron plate covered with tin, and easily passable with many holes' (s03 draws that lid); after five years the tree weighed 169 pounds and about 3 ounces, 'therefore 164 pounds of Wood, Barks, and Roots', while the dried earth was 'the same two hundred pounds, wanting about two ounces'. At the avoirdupois pound (0.45359 kg): soil 200 lb = {SOIL:.1f} kg (screen: 91 kg), the stem 5 lb = {TREE_START:.2f} kg (screen: 2,3 kg), the gain 164 lb = {TREE_GAIN:.1f} kg (screen: +74 kg; voice: 'tujuh puluh kilo lebih'), the soil's loss 2 oz = {SOIL_LOSS * 1000:.0f} g (screen: −57 g; voice: 'sekitar setengah ons', f10). {SOIL_LOSS * 1000:.1f} g / {TREE_GAIN * 1000:.0f} g = {SHARE * 100:.3f} %, under 0.1 % (screen: '< 0,1 %'). In s05 the soil is weighed again on the same balance: the weights for its first weighing ('dulu 91 kg') and the smallest one, the 57 g, lifted off; on a balance carrying 91 kg the beam cannot show 57 g, so it does not move. The scale is an equal-arm balance, as used in the 17th century (the dial platform scale is a 19th-century invention). Caveats kept off screen: the pound Helmont used may differ from the avoirdupois pound by some per cent (the rounded figures hold either way); he weighed the tree fresh but the soil dry; and his weighing could not have been very accurate (Hershey). The film uses it only for what it shows: very little of the tree's weight came from the soil.",
         "source": "J. B. van Helmont, Ortus Medicinae (1648), English translation 1662, as quoted in D. R. Hershey, 'Misconceptions about Helmont's Willow Experiment', Plant Science Bulletin 49(3): 78-83 (2003), Botanical Society of America (botany.org, PSB_2003_49_3.pdf), including the caveats on fresh vs dry weight and accuracy."},
        {"id": "f2", "claim": f"A tree does not eat the soil: the dry matter of a plant is on average about 45 % carbon, 45 % oxygen and 6 % hydrogen ({CHO} % together), and the carbon, taken from the CO₂ in the air, makes up the majority of the dry mass; mineral nutrients from the soil are the few per cent that remain. So a growing tree takes very little from the soil itself ('tanah di bawahnya hampir nggak berkurang'). Simplification: the film does not mention the minerals; the water does come up through the soil (f5).",
         "source": "OpenStax, Biology 2e, 31.1 'Nutritional Requirements of Plants' (openstax.org/books/biology-2e/pages/31-1-nutritional-requirements-of-plants): 'Carbon that was obtained from atmospheric CO2 ... composes the majority of the dry mass within most plants'; 'the dry weight ... of a cell is 45 percent carbon ... oxygen (45 percent) and hydrogen (6 percent)'."},
        {"id": "f3", "claim": "Photosynthesis uses sunlight, carbon dioxide and water to make sugar, and gives off oxygen: 6 CO₂ + 6 H₂O → C₆H₁₂O₆ + 6 O₂, with light as the energy source. Plants make their own food this way (photoautotrophs, 'self-feeders using light'). The equation is on screen in s15; the voice says 'bikin makanannya sendiri, dari cahaya, udara, dan air'.",
         "source": "OpenStax, Biology 2e, 8.1 'Overview of Photosynthesis', Figure 8.5 (the equation: 'six carbon dioxide and six water molecules produce one sugar molecule and six oxygen molecules ... Sunlight is used as an energy source') and the text on photoautotrophs (openstax.org/books/biology-2e/pages/8-1-overview-of-photosynthesis)."},
        {"id": "f4", "claim": "Carbon dioxide enters the leaf (and oxygen leaves it) through small, regulated openings called stomata, which are typically on the underside of the leaf. The voice calls them 'pori-pori kecil di daun'; the tag reads 'pori daun (stomata)'. The pore in s07 is drawn much larger than life.",
         "source": "OpenStax, Biology 2e, 8.1: 'The gas exchange of carbon dioxide and oxygen occurs through small, regulated openings called stomata ... typically located on the underside of the leaf'."},
        {"id": "f5", "claim": "Plant roots absorb water from the soil through root hairs and transport it up to the leaves through the xylem (the cream channel in s08), pulled up mainly by transpiration.",
         "source": "OpenStax, Biology 2e, 31.1 ('Plant roots absorb water from the soil through root hairs and transport it up to the leaves through the xylem') and 30.5 'Transport of Water and Solutes in Plants'."},
        {"id": "f6", "claim": "Inside the leaf's cells, chloroplasts hold stacks of thylakoids (grana); chlorophyll, embedded in the thylakoid membranes, is the pigment that absorbs the light. Chlorophyll absorbs blue and red light but not green, which it reflects, so it looks green ('zat hijau').",
         "source": "OpenStax, Biology 2e, 8.1 ('Embedded in the thylakoid membrane is chlorophyll, a pigment (molecule that absorbs light)') and 8.2 'The Light-Dependent Reactions of Photosynthesis' ('Chlorophyll a absorbs wavelengths from either end of the visible spectrum (blue and red), but not green ... chlorophyll appears green')."},
        {"id": "f7", "claim": "Light energy drives the splitting of water in the light-dependent reactions: splitting one H₂O releases two electrons, two hydrogen ions and one oxygen atom; two split waters make one O₂. The oxygen given off by photosynthesis comes from this water; most of it escapes to the atmosphere, where aerobic organisms (us) use it to breathe. s10 shows one molecule split; s11 shows O₂ (pairs) reaching a person.",
         "source": "OpenStax, Biology 2e, 8.2: 'water is \"split\" during this stage of photosynthesis ... Splitting one H2O molecule releases two electrons, two hydrogen atoms, and one atom of oxygen ... splitting two molecules is required to form one molecule of diatomic O2 gas ... The remainder escapes to the atmosphere where it is used by aerobic organisms to support respiration'."},
        {"id": "f8", "claim": "The hydrogen and the energy from the light reactions (carried as NADPH and ATP) are used in the Calvin cycle to turn carbon dioxide into sugar (G3P; two G3P make a glucose, which takes six turns of the cycle, one CO₂ each). Simplification, on screen and in the voice: 'Hidrogennya digabung sama karbon dioksida, jadi gula'; NADPH, ATP and G3P are not named, the hexagon stands for the sugar molecule (glucose's ring), and s12 shows fewer pieces than one glucose needs, so its tag says only 'gula' (the formula is shown once, whole, on the recipe card in s15).",
         "source": "OpenStax, Biology 2e, 8.3 'Using Light Energy to Make Organic Molecules' (openstax.org/books/biology-2e/pages/8-3-using-light-energy-to-make-organic-molecules): NADPH loses 'both energy and a hydrogen atom' in making G3P from CO2; 'six times to produce a six-carbon glucose molecule'; and 8.1 ('Glucose ... is made from two three-carbon G3Ps')."},
        {"id": "f9", "claim": "The sugars made by photosynthesis are the plant's food (its source of energy) and its building material: they are carried from the leaves to the growing parts through the phloem, and glucose chains make cellulose, the main part of plant cell walls (over thirty per cent of plant matter); wood is mostly cellulose. s14 draws the cell walls of wood as chains of the sugar hexagon, and a new leaf and stem at a branch tip built as the sugar arrives. Simplification: wood also holds hemicellulose and lignin, which are made from the same sugars but are not shown.",
         "source": "OpenStax, Biology 2e, 30.5 ('The products of photosynthesis are called photosynthates ... Sugars produced in sources, such as leaves, need to be delivered to growing parts of the plant via the phloem'); 3.2 'Carbohydrates' ('Wood and paper are mostly cellulosic in nature. Glucose monomers comprise cellulose'); 31.1 (cellulose 'makes up over thirty percent of plant matter')."},
        {"id": "f10", "claim": f"In Indonesian everyday use one ons is one hundred grams, so the soil's loss of about {SOIL_LOSS * 1000:.0f} g is said as 'sekitar setengah ons' (half an ons is 50 g; the screen shows the exact −57 g).",
         "source": "Kamus Besar Bahasa Indonesia, entry 'ons': 'satuan ukuran berat (massa) seratus gram' (read at kbbi.web.id/ons; kbbi.kemdikbud.go.id did not answer)."},
    ],
    "acts": [
        {"id": "hook", "title": "Pertanyaan", "goal": "The puzzle: the tree grows huge, the soil barely shrinks. Where does the tree come from?", "rail": False},
        {"id": "bukti", "title": "Bukan dari tanah", "goal": "The potted willow: plus 74 kg of tree, minus 57 g of soil.", "rail": False},
        {"id": "bahan", "title": "Udara dan air", "goal": "The ingredients: CO₂ through the leaf's pores, water from the roots, light caught by the green chlorophyll.", "rail": False},
        {"id": "dapur", "title": "Dapur di daun", "goal": "The mechanism: light splits water, oxygen goes out, hydrogen and CO₂ become sugar.", "rail": False},
        {"id": "gula", "title": "Gula jadi tubuh", "goal": "The sugar is the plant's food and, chained up, its wood.", "rail": False},
        {"id": "recap", "title": "Jawaban", "goal": "Light, air and water in; sugar and oxygen out. Then the bridge into the first line.", "rail": False},
    ],
    "shots": shots,
}

for p in problems:
    print("layout:", p)
out = HERE / "storyboard.json"
out.write_text(json.dumps(storyboard, ensure_ascii=False, indent=2) + "\n")
words = sum(len(re.sub(r"\[[^]]*\]", "", s["voice"]).replace("*", "").split()) for s in shots if s.get("voice"))
print(f"{len(shots)} shots, {sum(len(s['frames']) for s in shots)} frames, {words} words, about {duration:.1f} s before the take -> {out}")
manifest = HERE / "voice" / "voice.json"
if manifest.exists() and json.loads(manifest.read_text()).get("version") == 2:
    kit = next(p for p in HERE.parents if (p / "kit" / "audio" / "voice.mjs").exists())
    subprocess.run(["node", str(kit / "kit" / "audio" / "voice.mjs"), str(HERE), "--retime"], check=False, stdout=subprocess.DEVNULL)
