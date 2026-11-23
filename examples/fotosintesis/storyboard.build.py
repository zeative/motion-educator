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


def tree(cx=540, base=1195, k=1.0):
    """The paper tree: an orange trunk (it is made of sugar) under four green discs of canopy."""
    t = lambda dx, dy: f"{cx + dx * k:.0f} {base - dy * k:.0f}"
    trunk = f"M{t(-45, 0)} L{t(-22, 380)} L{t(-110, 470)} L{t(-90, 488)} L{t(-12, 420)} L{t(-8, 520)} L{t(12, 520)} L{t(16, 410)} L{t(110, 500)} L{t(128, 482)} L{t(28, 370)} L{t(45, 0)} Z"
    discs = [(-120, 560, 170), (135, 585, 180), (0, 710, 200), (-10, 500, 140)]
    return [paper(trunk, ORANGE, 6)] + [paper(circ(cx + dx * k, base - dy * k, r * k), GREEN, 6) for dx, dy, r in discs]


def roots(cx=540, base=1195):
    return {"path": f"M{cx} {base} C {cx - 30} {base + 50}, {cx - 120} {base + 80}, {cx - 230} {base + 95} M{cx} {base} C {cx + 30} {base + 60}, {cx + 140} {base + 70}, {cx + 240} {base + 100} M{cx} {base} C {cx - 5} {base + 60}, {cx + 10} {base + 90}, {cx - 20} {base + 110}", "colour": ORANGE, "width": 9}


def opening():
    """Frame 0, and the picture the film loops back into: the big paper tree on its hill, the soil under it."""
    return [sun(), hills(), soil(), roots()] + tree()


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


def pot(cx=620, top=860, bottom=1250, wt=460, wb=360):
    return [paper(f"M{cx - wt / 2:.0f} {top} H{cx + wt / 2:.0f} L{cx + wb / 2:.0f} {bottom} H{cx - wb / 2:.0f} Z", TEAL, 7),
            paper(f"M{cx - wt / 2 - 22:.0f} {top - 46} H{cx + wt / 2 + 22:.0f} V{top + 10} H{cx - wt / 2 - 22:.0f} Z", ORANGE, 6)]


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


shot("s01", "hook", "wide", "Pohon bisa tumbuh segede ini, tapi tanah di bawahnya hampir nggak *berkurang*.",
     teaches="The puzzle: a tree grows huge, yet the soil it stands in barely gets less.",
     screen="Cream card backdrop. Three paper layers: a yellow paper sun top right (820, 430); a green hill across the middle (top edge about y 1000); in front, the deep-teal soil from y 1195 down, cut like a cross-section, with the tree's orange roots on it. In the middle a big paper tree: an orange trunk (sugar is what it is built from, so the trunk is the sugar colour all film) under four overlapping discs of green canopy, top at y 300. Every layer casts a small soft shadow on the one behind.",
     motion="Frame 0 is finished. On 'tumbuh' the canopy grows a step: each green disc pops up and a size larger, one after another, at 12 drawings a second, and a dashed paper outline of the cutting it grew from stays at its foot. On 'tanah di bawahnya' the rostrum camera tilts down to the soil; on 'berkurang' a dashed thread is pinned along the soil's top edge and a tag flips up: 'tanah ≈ tetap'.",
     carries="The tree on its hill and the soil.", transition="A cream paper layer slides across from the left and covers the scene.",
     sound="The acoustic bed starts (nylon guitar). A paper rustle as each canopy disc pops up; a soft tap as the pin goes into the soil line.",
     check="The tree fills the upper two thirds; the soil's level line does not move while the tree grows.", facts=["f1", "f2"],
     frames=[fr(0, "Frame 0 is finished: the big paper tree on the hill, the sun behind it, the soil cut open under it.", opening(), {"move": [940, 980, 940, 700], "text": "tumbuh"}),
             fr(0.5, "The canopy discs pop up a size larger; the dashed outline of the small cutting it grew from stays at its foot.", [sun(), hills(), soil(), roots()], tree(k=1.06), {"path": "M530 1195 V1040 M530 1100 l-40 -40 M530 1070 l40 -40", "colour": TEAL, "width": 5, "dashed": True}, {"camera": "down"}),
             fr(1, "The thread along the soil's top edge, and the tag: 'tanah ≈ tetap'.", opening(), {"path": "M60 1196 C 340 1170, 700 1218, 1020 1192", "colour": RED, "width": 6, "dashed": True}, tag(300, 1272, "tanah ≈ tetap", (330, 1196), 62), {"cut": "lapisan kertas menutup"})])

shot("s02", "hook", "type", "Terus, bahannya dari mana?",
     teaches="Asks the question out loud: what is the tree made of, if not the soil?",
     screen="A cream paper layer has slid over the scene. Printed on a paper strip, in Fraunces: 'Bahannya / dari mana?', the word 'mana?' on an orange tab. Beside it a big cut-out question mark in deep teal, standing up from the layer like a pop-up.",
     motion="The layer slides in from the left (12 drawings a second); the strip drops onto it with a little bounce; the question mark folds up from flat as the voice asks.",
     carries="The cream layer.", transition="The layer slides off to the right, uncovering a workbench with a pot.",
     sound="A long paper slide, then a crisp fold for the question mark.", check="The question reads in under a second, with the sound off.",
     frames=[fr(0, "The cream layer sliding across the tree from the left.", opening(), layer_slide(620), {"move": [120, 560, 560, 560], "text": "lapisan geser"}),
             fr(0.5, "The layer covers the frame; the strip drops onto it.", layer_slide(1100), strip(540, 640, "Bahannya\ndari mana?", 116, "mana?"), {"move": [540, 330, 540, 480], "text": "jatuh"}),
             fr(1, "The question mark folds up beside the strip.", layer_slide(1100), strip(540, 640, "Bahannya\ndari mana?", 116, "mana?"), paper("M430 1000 q0 -110 110 -110 q110 0 110 100 q0 80 -90 100 v70 h-44 v-110 q90 -10 90 -70 q0 -55 -66 -55 q-66 0 -66 65 Z M520 1220 h44 v44 h-44 Z", TEAL, 6), {"cut": "geser ke pot"})])

shot("s03", "bukti", "diagram", "Dulu ada yang pernah nyoba: pohon kecil ditanam di *pot*,",
     teaches="The test: a small tree planted in a pot of weighed, dried soil.",
     screen="A workbench scene on the cream card. A big deep-teal paper pot with an orange rim fills the lower middle (x 280-800, y 820-1250), dry soil inside. A cut-out figure on split pins (deep-teal clothes, cream face, yellow pins at the joints) holds a willow cutting over it. A tag tied to the pot: 'tanah 91 kg'; a tag on the cutting: 'pohon 2,3 kg'. A strip at the top: 'Van Helmont · abad ke-17'.",
     motion="The figure's arm turns on its pins and lowers the cutting into the soil (on twelves); the cutting's leaves unfold; the two tags flip up on their threads one after the other; the strip slides in at the top.",
     carries="The pot with its tags.", transition="The camera pulls back; the pot is outside, a paper calendar beside it.",
     sound="A soft thump of soil; two tag flicks; guitar continues.", check="The tags read 91 kg and 2,3 kg (f1); the cutting is small next to the pot.", facts=["f1"],
     frames=[fr(0, "The pot of dried soil, tag 'tanah 91 kg'; the figure holds the cutting above it.", pot(), tag(620, 1110, "tanah 91 kg"), figure(210, 1250, 640, (520, 700)), willow(560, 760, 160, 40), {"move": [600, 560, 600, 740], "text": "tanam"}),
             fr(0.5, "The cutting is in the soil; its tag 'pohon 2,3 kg' flips up.", pot(), tag(620, 1110, "tanah 91 kg"), figure(210, 1250, 640, (560, 770)), willow(620, 860, 230, 50), tag(810, 520, "pohon 2,3 kg", (640, 640))),
             fr(1, "The strip at the top names who tried it: 'Van Helmont · abad ke-17'.", pot(), tag(620, 1110, "tanah 91 kg"), figure(210, 1250, 640), willow(620, 860, 230, 50), tag(810, 520, "pohon 2,3 kg", (640, 640)), tag(540, 330, "Van Helmont · abad ke-17"), {"cut": "mundur, kalender"})])

shot("s03b", "bukti", "wide", "terus dirawat *lima tahun*.",
     teaches="Five years go by; the only thing added is rainwater.",
     screen="The pot outside on the green hill. A paper cloud top left drips cream raindrops into it, tag 'cuma disiram air hujan'. Right, a little stack of paper calendar sheets: 'tahun 1' turning to 'tahun 5'. The willow in the pot grows in pop-up steps into a small tree with long hanging leaves.",
     motion="The calendar sheets flip over one by one (five flips, on twelves); with each flip the willow pops up a size; rain strips drop from the cloud.",
     carries="The grown willow in its pot.", transition="The figure lifts the willow out and onto a scale.",
     sound="Five page flips, light rain ticks on paper.", check="Five flips, five steps of growth; nothing but water goes into the pot.", facts=["f1"],
     frames=[fr(0, "The pot outside, the small cutting; the calendar reads 'tahun 1'; the cloud starts to rain.", hills(), pot(540), willow(540, 860, 230, 50), {"cloud": [300, 430, 360]}, {"path": "M220 470 v40 M300 480 v40 M380 470 v40", "colour": TEAL, "width": 6}, {"card": [770, 360, 210, 250]}, label(875, 450, "tahun", 50), label(875, 570, "1", 96, colour=TEAL), {"move": [875, 640, 875, 720], "text": "dibalik"}),
             fr(1, "Five years on: the willow is a small tree; the calendar reads 'tahun 5'; the tag 'cuma disiram air hujan'.", hills(), pot(540), willow(540, 860, 560, 230), {"cloud": [300, 430, 360]}, {"path": "M220 470 v40 M300 480 v40 M380 470 v40", "colour": TEAL, "width": 6}, {"card": [770, 360, 210, 250]}, label(875, 450, "tahun", 50), label(875, 570, "5", 96, colour=TEAL), tag(410, 640, "cuma disiram air hujan", (330, 540), 54), {"cut": "angkat ke timbangan"})])

shot("s04", "bukti", "diagram", "Pohonnya nambah *tujuh puluh kilo* lebih,",
     teaches="The tree gained about 74 kg.",
     screen="A paper platform scale on the bench (deep-teal platform x 200-720 at y 1200, a cream dial on a post at the right, centre (860, 760)). The willow, lifted out of its pot with its bare orange roots, stands on the platform. A big stamped tag hangs from the dial: '+74 kg'.",
     motion="The figure lifts the willow out (on twelves) and sets it on the platform; the dial's paper needle swings round and stops; the stamped tag drops in on its thread with a little swing.",
     carries="The scale and the willow.", transition="The willow slides off; the scale is folded down into a bar chart.",
     sound="A creak as it is lifted, a paper clunk on the platform, a stamp thud.", check="The stamped number is +74 kg (164 lb, f1), at its value, no counting up.", facts=["f1"],
     frames=[fr(0, "The figure lifts the willow out of the pot, bare roots, on its way to the platform.", figure(150, 1250, 600, (330, 820)), willow(380, 900, 600, 230), {"path": "M370 900 c-40 40 -90 50 -140 60 M390 900 c40 40 90 50 140 60", "colour": ORANGE, "width": 8}, paper("M200 1200 H720 V1250 H200 Z", TEAL), paper(circ(860, 760, 120), CREAM), {"line": [860, 880, 860, 1200], "width": 10, "colour": TEAL}, {"move": [380, 980, 460, 1120], "text": "angkat"}),
             fr(1, "On the platform; the needle has swung; the stamp '+74 kg'.", willow(460, 1140, 680, 250), {"path": "M450 1140 c-40 30 -90 40 -140 50 M470 1140 c40 30 90 40 140 50", "colour": ORANGE, "width": 8}, paper("M200 1200 H720 V1250 H200 Z", TEAL), paper(circ(860, 760, 120), CREAM), {"line": [860, 760, 930, 690], "width": 8, "colour": RED}, {"line": [860, 880, 860, 1200], "width": 10, "colour": TEAL}, stamp(830, 1010, "+74 kg", 84), {"cut": "jadi grafik"})])

shot("s05", "bukti", "chart", "tapi tanahnya cuma berkurang sekitar *setengah ons*.",
     teaches="The soil lost only about 57 grams: on the same scale, nothing.",
     screen=f"A bar chart made of paper on the cream card, one scale for both: left, a green paper column 260 wide and {BAR} px tall for the tree's gain, stamped '+74 kg'; right, the soil's loss on the same scale is {SOIL_BAR:.2f} px tall, a hairline on the base. A paper magnifier slides over it: inside, '−57 g'. Under it a tag '< 0,1 %'. Words under the bars on paper strips: 'pohon', 'tanah'.",
     motion="The tree's column rises like a pop-up (on twelves); the soil's column 'rises' and stays a hairline; the magnifier slides in on a paper arm and the '−57 g' tag flips up inside it, then '< 0,1 %'.",
     carries="The tall green column.", transition="The chart folds flat and the opening tree pops back up behind it.",
     sound="A paper rustle for the column, a small 'tik' for the hairline, a stamp for '−57 g'.", check=f"Bars are {BAR} px and {SOIL_BAR:.2f} px: the same scale (164 lb against 2 oz, f1).", facts=["f1", "f10"],
     frames=[fr(0, "The tree's column rising, stamped '+74 kg'; the base line for both.", {"path": "M120 1180 H960", "colour": TEAL, "width": 8}, paper(f"M170 1180 V{1180 - BAR * 0.7:.0f} H430 V1180 Z", GREEN), label(300, 1260, "pohon", 60, colour=TEAL), label(780, 1260, "tanah", 60, colour=TEAL), {"move": [300, 1000, 300, 600], "text": "naik"}),
             fr(0.5, "Full height; the soil's column on the same scale is a hairline.", {"path": "M120 1180 H960", "colour": TEAL, "width": 8}, paper(f"M170 1180 V{1180 - BAR:.0f} H430 V1180 Z", GREEN), stamp(300, 380, "+74 kg", 80), {"path": f"M650 1180 H910 V{1180 - SOIL_BAR:.2f} H650 Z", "colour": RED, "width": 4}, label(300, 1260, "pohon", 60, colour=TEAL), label(780, 1260, "tanah", 60, colour=TEAL), {"move": [960, 700, 820, 1020], "text": "kaca pembesar"}),
             fr(1, "Under the magnifier: '−57 g', and '< 0,1 %' of what the tree gained.", {"path": "M120 1180 H960", "colour": TEAL, "width": 8}, paper(f"M170 1180 V{1180 - BAR:.0f} H430 V1180 Z", GREEN), stamp(300, 380, "+74 kg", 80), {"magnifier": [780, 1040, 120]}, label(780, 1060, "−57 g", 72, colour=RED), tag(760, 800, "< 0,1 %", (780, 915)), label(300, 1260, "pohon", 60, colour=TEAL), label(780, 1260, "tanah", 60, colour=TEAL), {"cut": "pohon muncul lagi"})])

shot("s06", "bahan", "wide", "Ternyata bahannya dari *udara* dan air.",
     teaches="The answer to where it comes from: air and water.",
     screen="Back to the opening tree on its hill. In the sky, three paper CO₂ molecules (a deep-teal carbon disc between two red oxygen discs) drift towards the leaves; a tag 'udara (CO₂)' flips up on a thread. In the soil, three paper water molecules (a red oxygen disc with two small cream hydrogen discs) sit by the roots; a tag 'air (H₂O)'. Two cut-paper arrows: one from the sky into the canopy, one up the trunk from the roots.",
     motion="The chart folds away and the tree pops up again; the CO₂ molecules slide in from the left edge on the twelves; the tag flips; then the soil layer lifts a little and the water molecules appear by the roots, their tag flipping.",
     carries="The tree, the CO₂ by the leaves, the water by the roots.", transition="The camera pushes into one leaf.",
     sound="Two soft tag flicks; a light paper slide for the molecules.", check="Same colours as everywhere: carbon teal, oxygen red, hydrogen cream.", facts=["f3"],
     frames=[fr(0, "The opening tree pops back up as the chart folds away.", opening(), {"camera": "pull"}),
             fr(0.5, "CO₂ molecules slide in towards the leaves; tag 'udara (CO₂)'.", opening(), co2(150, 520), co2(170, 760), co2(900, 700), paper_arrow(150, 600, 330, 640, TEAL), tag(250, 400, "udara (CO₂)", (180, 500)), {"move": [80, 300, 280, 300], "text": "masuk"}),
             fr(1, "Water molecules by the roots; tag 'air (H₂O)'; an arrow up the trunk.", opening(), co2(150, 520), co2(170, 760), co2(900, 700), paper_arrow(150, 600, 330, 640, TEAL), tag(250, 400, "udara (CO₂)", (180, 500)), h2o(430, 1240), h2o(760, 1245), paper_arrow(540, 1170, 540, 980, CREAM, 30), tag(230, 1275, "air (H₂O)", (400, 1238)), {"cut": "masuk ke daun"})])

shot("s07", "bahan", "diagram", "Karbon dioksida masuk lewat pori-pori kecil di *daun*,",
     teaches="Carbon dioxide gets in through tiny pores on the underside of the leaf (stomata).",
     screen="One leaf fills the frame: green paper with deep-teal veins (x 110-980, y 470-1060). Its top layer peels back from the right like a flap, showing the underside dotted with pores; then one pore close up, as big as the frame allows: two green paper guard cells round a slit (centre 540, 820), a CO₂ molecule passing through it. Tags on threads: 'pori daun (stomata)', 'CO₂'.",
     motion="Rostrum push from the tree to the leaf; the leaf's top layer peels back (fold on twelves); the camera pushes again onto one pore; the CO₂ molecule slides through the slit and disappears behind the paper.",
     carries="The leaf.", transition="The camera tilts down the trunk to the roots.",
     sound="A paper peel; a soft 'pff' as the molecule slips through.", check="The pore is drawn on the underside (the peeled side), as it is in most leaves.", facts=["f4"],
     frames=[fr(0, "Push in: one leaf fills the frame.", leaf_big(), {"camera": "push"}),
             fr(0.5, "The top layer peels back from the right: the underside is dotted with pores.", paper("M110 820 C 280 520, 760 460, 980 760 C 760 1020, 290 1080, 110 820 Z", GREEN, 8), paper("M620 520 C 760 520, 900 600, 980 760 C 900 700, 800 690, 700 720 Z", CREAM, 6), stoma(300, 820, 36, 60), stoma(460, 720, 36, 60), stoma(500, 900, 36, 60), stoma(660, 820, 36, 60), {"move": [900, 640, 760, 560], "text": "dikelupas"}),
             fr(1, "One pore up close: the guard cells, the slit, a CO₂ molecule slipping through; tags.", paper(ell(540, 830, 420, 330), GREEN, 6), stoma(540, 830, 230, 400), co2(540, 690, 30), tag(540, 380, "pori daun (stomata)", (540, 630)), tag(840, 560, "CO₂", (600, 680)), {"move": [380, 560, 520, 690], "text": "masuk"}, {"cut": "turun ke akar"})])

shot("s08", "bahan", "wide", "air naik dari *akar*.",
     teaches="Water comes up from the roots, through the stem, to the leaves.",
     screen="The camera has tilted down: the ground at y 880, the trunk rising out of frame. The front soil layer folds down like a flap to show the orange roots spreading to y 1250. Water molecules (red with two cream discs) sit at the root tips and climb in a line up a cream channel in the trunk. Tags: 'akar', 'air (H₂O)'.",
     motion="The soil flap folds down (on twelves); the water molecules step up the channel one after another, a drawing at a time; the 'akar' tag flips up on its thread.",
     carries="The water climbing the trunk.", transition="The camera rises up the trunk into a leaf and the leaf's top layer is lifted.",
     sound="A paper fold; small taps as each molecule steps up.", check="The water goes up, from roots to leaves, never down.", facts=["f5"],
     frames=[fr(0, "Tilted down: the ground, the trunk, the soil flap starting to fold down.", paper("M0 880 C 300 860, 700 900, 1080 870 V1910 H0 Z", TEAL), paper("M480 880 L505 300 L575 300 L600 880 Z", ORANGE), paper(circ(540, 240, 200), GREEN), {"move": [900, 900, 900, 1120], "text": "dibuka"}, {"camera": "down"}),
             fr(1, "Roots shown; water molecules climb the cream channel; tags 'akar' and 'air (H₂O)'.", paper("M0 880 C 300 860, 700 900, 1080 870 V1910 H0 Z", TEAL), paper("M480 880 L505 300 L575 300 L600 880 Z", ORANGE), paper("M528 1000 L532 300 L548 300 L552 1000 Z", CREAM, 4), paper(circ(540, 240, 200), GREEN), {"path": "M540 880 C 500 980, 380 1060, 230 1150 M540 880 C 590 990, 700 1060, 850 1160 M540 880 C 530 1000, 560 1120, 520 1250 M380 1060 C 330 1100, 300 1180, 280 1240 M700 1060 C 760 1110, 790 1180, 800 1250", "colour": ORANGE, "width": 12}, h2o(230, 1190, 22), h2o(850, 1200, 22), h2o(540, 1060, 20), h2o(540, 900, 20), h2o(540, 740, 20), h2o(540, 580, 20), {"move": [640, 1000, 640, 560], "text": "naik"}, tag(200, 980, "akar", (280, 1080)), tag(850, 760, "air (H₂O)", (580, 740)), {"cut": "naik ke daun"})])

shot("s09", "bahan", "diagram", "Nah, di daun ada *klorofil*, zat hijau yang nangkep cahaya matahari.",
     teaches="Inside the leaf, chlorophyll (the green stuff) catches the sunlight.",
     screen="The leaf opened like a pop-up: a row of six tall cream paper cells (x 130-950, y 560-980) under a thin green top layer, each holding small green paper discs (chloroplasts). Strips of yellow paper (sunlight) slant in from the top right and land on them. Then a push into one chloroplast: stacks of green paper coins (the grana), tag 'klorofil (zat hijau)'.",
     motion="The top layer lifts and the cells pop up behind it; the yellow strips slide in one after another (on twelves) and stop on the green discs; the camera pushes into one disc; the coin stacks unfold up from flat; the tag flips.",
     carries="The chloroplast with its green coin stacks.", transition="Continuous: the camera stays inside the chloroplast.",
     sound="A pop-up unfold; a warm chime as the light strips land.", check="The light lands on the green parts; the label sits on the stacks it names.", facts=["f6"],
     frames=[fr(0, "The leaf's top layer lifts: a row of tall cells, each full of green discs.", paper("M100 520 H980 V560 H100 Z", GREEN), [paper(f"M{130 + i * 140} 570 h126 v410 h-126 Z", CREAM, 5) for i in range(6)], [atom(130 + i * 140 + 40 + (j % 2) * 46, 620 + j * 70, 20, GREEN) for i in range(6) for j in range(5)], {"camera": "push"}),
             fr(0.5, "Yellow strips of sunlight slant in and land on the green discs; tag 'kloroplas'.", paper("M100 520 H980 V560 H100 Z", GREEN), [paper(f"M{130 + i * 140} 570 h126 v410 h-126 Z", CREAM, 5) for i in range(6)], [atom(130 + i * 140 + 40 + (j % 2) * 46, 620 + j * 70, 20, GREEN) for i in range(6) for j in range(5)], beam(980, 280, 640, 700), beam(980, 420, 820, 640), tag(330, 360, "kloroplas", (300, 640)), {"move": [1000, 260, 760, 520], "text": "cahaya"}),
             fr(1, "Inside one chloroplast: stacks of green coins; tag 'klorofil (zat hijau)'.", chloroplast(), beam(990, 300, 600, 700, 80), tag(470, 330, "klorofil (zat hijau)", (520, 700)), {"cut": "tetap di dalam"})])

shot("s10", "dapur", "diagram", "Energi cahayanya dipakai buat *mecah* air.",
     teaches="The light's energy splits water apart.",
     screen="Inside the chloroplast, filling the frame (a green paper oval, x 60-1020, y 420-1200) with three stacks of green coins. A water molecule (red disc, two cream discs, as big as a fist: r 40) drifts to the middle stack; a yellow strip of light lands on it; the molecule is snipped apart: the red oxygen to one side, the two cream hydrogens to the other. Tags: 'H₂O', then 'O' and 'H'.",
     motion="The molecule drifts in (on twelves); the light strip slides in and touches the stack; a paper snip: the three discs jump apart along cut lines, each landing with a little bounce.",
     carries="The loose red O and the cream H discs.", transition="The camera follows the red O as it drifts up and out.",
     sound="A soft guitar swell; a crisp scissor snip on 'mecah'.", check="One red disc and two cream discs come out of one water molecule: nothing appears from nowhere.", facts=["f7"],
     frames=[fr(0, "A water molecule drifts to the middle stack; tag 'H₂O'.", chloroplast(), h2o(560, 620, 40), tag(250, 330, "H₂O", (510, 590), 64), {"move": [760, 380, 600, 560], "text": "air masuk"}),
             fr(0.5, "The light strip lands on the stack, on the molecule.", chloroplast(), h2o(560, 650, 40), beam(1000, 260, 600, 640, 80)),
             fr(1, "Snip: the oxygen jumps one way, the two hydrogens the other; tags 'O' and 'H'.", chloroplast(), beam(1000, 260, 600, 640, 80), atom(420, 600, 40, RED), atom(700, 590, 24, CREAM), atom(760, 650, 24, CREAM), {"path": "M520 560 l40 30 l-30 20 l40 30 M620 560 l-20 40 l30 10 l-20 40", "colour": TEAL, "width": 5}, tag(250, 330, "O", (400, 560), 72), tag(860, 330, "H", (720, 570), 72), {"cut": "O keluar"})])

shot("s11", "dapur", "wide", "Oksigennya dilepas, terus kita *hirup*.",
     teaches="The oxygen from the water is let out into the air, and it is what we breathe.",
     screen="Pulled back: the tree on the left (trunk at x 380), a cut-out figure on split pins standing on the right under the canopy's edge. Pairs of red discs (O₂) float out of the leaves and drift to the figure's face. A tag 'O₂ (oksigen)' tied to one pair.",
     motion="Two red discs join into a pair and drift out of the canopy on the twelves; the figure's chest rises (its torso piece tilts on its pin) as the pairs reach its face.",
     carries="The tree and the figure.", transition="Back into the chloroplast for the cream hydrogens left behind.",
     sound="A soft breath in, timed to the chest; light paper rustle.", check="The O₂ comes out of the leaves, not out of the trunk or the soil.", facts=["f7"],
     frames=[fr(0, "O₂ pairs float out of the canopy; tag 'O₂ (oksigen)'.", [sun(900, 380, 100), hills(), soil(), roots(380)], tree(380), figure(860, 1195, 480), o2(640, 520), o2(700, 640), o2(620, 760), tag(760, 330, "O₂ (oksigen)", (680, 500)), {"move": [620, 560, 760, 700], "text": "keluar"}),
             fr(1, "The pairs reach the figure's face; its chest rises: breathing in.", [sun(900, 380, 100), hills(), soil(), roots(380)], tree(380), figure(860, 1195, 480), o2(760, 700), o2(800, 760), o2(700, 620), tag(760, 330, "O₂ (oksigen)", (680, 500)), {"move": [700, 720, 830, 780], "text": "dihirup"}, {"cut": "balik ke kloroplas"})])

shot("s12", "dapur", "diagram", "Hidrogennya digabung sama karbon dioksida, jadi *gula*.",
     teaches="The hydrogen from the water is joined with carbon dioxide to make sugar.",
     screen="The chloroplast again (the green oval, its coin stacks now at the left). Cream hydrogen discs slide in from the left; CO₂ molecules (teal between two reds) come down from the top; they meet in the middle and are pressed together into one orange paper hexagon, the sugar, centre (620, 860), r 150. A stamped tag: 'gula (C₆H₁₂O₆)'.",
     motion="The pieces slide in from two sides (on twelves) and click together; the hexagon pops up out of them like a pop-up page, a size too big, then settles; the tag drops on its thread.",
     carries="The orange sugar hexagon.", transition="Pull back out of the leaf to the whole tree.",
     sound="Little paper clicks as the pieces meet; a warm pluck as the hexagon pops up.", check="The sugar is made of the cream H and the teal-and-red CO₂, nothing else.", facts=["f8", "f3"],
     frames=[fr(0, "Hydrogens come in from the left, CO₂ from above.", chloroplast(grana=((240, 900), (240, 760))), [atom(380 + i * 40, 720 + (i % 2) * 70, 22, CREAM) for i in range(4)], co2(620, 600, 26), co2(800, 660, 26), {"move": [300, 1000, 520, 900], "text": "H"}, {"move": [760, 480, 700, 640], "text": "CO₂"}),
             fr(0.5, "They meet in the middle and are pressed together.", chloroplast(grana=((240, 900), (240, 760))), [atom(560 + i * 34, 840 + (i % 2) * 40, 22, CREAM) for i in range(4)], co2(640, 780, 26), co2(700, 900, 26)),
             fr(1, "The orange sugar hexagon pops up; tag 'gula (C₆H₁₂O₆)'.", chloroplast(grana=((240, 900), (240, 760))), hexagon(620, 860, 150), label(620, 880, "gula", 64, colour=TEAL), tag(600, 330, "gula (C₆H₁₂O₆)", (620, 710)), {"cut": "mundur ke pohon"})])

shot("s13", "gula", "wide", "Gula inilah *makanan* tumbuhan,",
     teaches="That sugar is the plant's food: it is sent all over the plant.",
     screen="The whole tree again. Small orange paper hexagons appear in the canopy and travel down the trunk and out along the roots, and up to the top of the canopy; a tag 'makanan' tied to one of them.",
     motion="Pull back from the leaf; the hexagons slide along the branches and down the trunk in steps (on twelves), like beads on a thread.",
     carries="The tree with its sugar.", transition="Push in on the trunk; a flap of its surface lifts.",
     sound="A soft run of plucked notes as the hexagons travel.", check="The sugar goes from the leaves to the rest of the plant.", facts=["f9"],
     frames=[fr(0, "Pulled back: sugar hexagons appear in the leaves.", opening(), [hexagon(x, y, 36) for x, y in ((420, 640), (660, 620), (540, 480), (480, 790))], tag(820, 300, "makanan", (680, 600)), {"camera": "pull"}),
             fr(1, "The hexagons travel down the trunk to the roots, and up to the top of the canopy.", opening(), [hexagon(x, y, 34) for x, y in ((540, 880), (540, 1000), (540, 1120), (400, 1260), (700, 1262), (540, 470))], tag(820, 300, "makanan", (570, 900)), {"move": [620, 820, 620, 1150], "text": "dikirim"}, {"cut": "dekat ke batang"})])

shot("s14", "gula", "diagram", "yang disusun jadi daun, batang, sampai *kayu*.",
     teaches="The sugar is also the building material: chained up, it becomes the stuff of leaves, stems and wood.",
     screen="Close on the trunk, an orange band filling most of the frame (x 250-830, y 240-1300). A flap of its surface lifts at the right; underneath, the orange hexagons link up into long vertical chains packed side by side, like grain in wood. Tags: 'rantai gula = selulosa' and 'kayu'.",
     motion="Push in; the flap lifts; the hexagons slide into line one after another and link (on twelves) until the chains fill the cut; the tags flip up.",
     carries="The wood made of chains of sugar.", transition="A cream recipe card slides in over it.",
     sound="Quick soft clicks as each hexagon links; a wooden tap for 'kayu'.", check="The chains are made of the same orange hexagons as the sugar in s12.", facts=["f9"],
     frames=[fr(0, "Close on the trunk; single hexagons arrive.", TRUNK, [hexagon(x, y, 40) for x, y in ((430, 520), (600, 650), (470, 840), (660, 960))], {"camera": "push"}, {"move": [960, 380, 720, 560], "text": "gula datang"}),
             fr(0.5, "They line up and link into chains.", TRUNK, chain(380, 600, 4), chain(500, 520, 6), chain(620, 640, 3), {"move": [860, 1000, 860, 640], "text": "disusun"}),
             fr(1, "The chains fill the cut like wood grain; tags 'rantai gula = selulosa' and 'kayu'.", TRUNK, [chain(320 + c * 110, 470, 11) for c in range(5)], paper("M800 300 C 920 360, 960 560, 940 760 L800 760 Z", ORANGE), tag(540, 380, "rantai gula = selulosa", (540, 470), 54), tag(900, 1060, "kayu", (790, 1000), 64), {"cut": "kartu resep"})])

shot("s15", "recap", "recap", "Jadi tumbuhan bikin makanannya sendiri, dari *cahaya*, udara, dan air.",
     teaches="The answer in one frame: light, air and water go into the leaf; sugar and oxygen come out.",
     screen="A cream recipe card (x 70-1010, y 260-1295) laid over the scene with a shadow. Top row, three ingredients with paper tags: the yellow sun 'cahaya', a CO₂ molecule 'udara', a water molecule 'air'. Arrows into a green paper leaf in the middle. Out of it: the orange hexagon 'gula' and a red O₂ pair 'oksigen'. Printed along the bottom strip: '6 CO₂ + 6 H₂O → C₆H₁₂O₆ + 6 O₂'.",
     motion="The card slides in; the three ingredients pop up one per word ('cahaya', 'udara', 'air'); paper arrows fold down into the leaf; the outputs pop up; the equation strip slides in last.",
     carries="The card, until the layer slides away.", transition="The card slides off to the right, uncovering the opening tree.",
     sound="Three soft taps, one per ingredient; a warm guitar chord on the outputs.", check="Readable as a summary with the sound off; the equation balances (f3).", facts=["f3", "f6", "f7", "f8"],
     frames=[fr(0, "The recipe card slides in; the three ingredients pop up.", recipe(1), {"move": [1060, 800, 900, 800], "text": "kartu"}),
             fr(0.5, "Arrows fold down into the leaf.", recipe(2)),
             fr(1, "Out come sugar and oxygen; the equation strip.", recipe(3), {"cut": "kartu geser keluar"})])

shot("s16", "recap", "wide", "Makanya,",
     teaches="The bridge back into the first line.",
     screen="The recipe card slides off to the right and the opening picture is under it: the big paper tree on the hill, the sun, the soil, the same layers in the same places as frame 0.",
     motion="The card slides right (on twelves) with its shadow; the canopy discs settle into the frame-0 pose a moment before the film loops.",
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
        "mood": "The Paper Cut-out template: layers of craft paper cut out and stacked with small gaps on a cream card backdrop (#f8f1e5), one soft light from above so each layer drops a small shadow on the one behind, visible fibre and slightly rough cut edges, the odd fold line. Five papers, each with one meaning all film: sun yellow #e9c46a is light, orange #f4a261 is sugar and what is built from it (the trunk, the key words), red #e76f51 is oxygen, deep teal #264653 is carbon and soil and the printed type, green #2a9d8f is the leaf. Hydrogen is a cream disc. Everything slides, flips, folds and pops up like a pop-up book, stepped at 12 frames a second; a top-down rostrum camera with parallax between the layers; cuts by a paper layer sliding across. Labels are paper tags tied with thread; numbers are stamped tags at their real values; captions are two or three words on a paper strip, the key word on an orange tab. No gradients, no glow, no clean vector edges.",
    },
    "music": {
        "track": "Composed for this film (ElevenLabs Music, music/bed.mp3), written to the take's length",
        "bpm": 92,
        "note": "A gentle acoustic bed: fingerpicked nylon-string guitar, a soft upright piano and a brushed shaker, in a warm major key, composed to the take's length so it ends under the bridge and runs on into the opening. It thins to guitar alone under the pot experiment and the numbers (s03-s05), adds the piano when the leaf opens (s09), and lifts on the recipe card (s15). Sound effects are paper: a rustle for every pop-up, a slide for every layer that wipes the frame, a snip on 'mecah' (s10), soft taps for tags and stamps, light rain ticks in s03b, one breath in for s11. The cuts follow the take, not the beat.",
    },
    "facts": [
        {"id": "f1", "claim": f"Van Helmont's willow experiment (published 1648, so 'abad ke-17' on screen): 200 pounds of oven-dried earth in an earthen pot, a willow stem of 5 pounds, watered only with rainwater or distilled water; after five years the tree weighed 169 pounds and about 3 ounces, 'therefore 164 pounds of Wood, Barks, and Roots', while the dried earth was 'the same two hundred pounds, wanting about two ounces'. At the avoirdupois pound (0.45359 kg): soil 200 lb = {SOIL:.1f} kg (screen: 91 kg), the stem 5 lb = {TREE_START:.2f} kg (screen: 2,3 kg), the gain 164 lb = {TREE_GAIN:.1f} kg (screen: +74 kg; voice: 'tujuh puluh kilo lebih'), the soil's loss 2 oz = {SOIL_LOSS * 1000:.0f} g (screen: −57 g; voice: 'sekitar setengah ons', f10). {SOIL_LOSS * 1000:.1f} g / {TREE_GAIN * 1000:.0f} g = {SHARE * 100:.3f} %, under 0.1 % (screen: '< 0,1 %'). The bars in s05 are {BAR} px and {SOIL_BAR:.2f} px. Caveats kept off screen: the pound Helmont used may differ from the avoirdupois pound by some per cent (the rounded figures hold either way); he weighed the tree fresh but the soil dry; and his weighing could not have been very accurate (Hershey). The film uses it only for what it shows: very little of the tree's weight came from the soil.",
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
        {"id": "f8", "claim": "The hydrogen and the energy from the light reactions (carried as NADPH and ATP) are used in the Calvin cycle to turn carbon dioxide into sugar (G3P; two G3P make a glucose, which takes six turns of the cycle, one CO₂ each). Simplification, on screen and in the voice: 'Hidrogennya digabung sama karbon dioksida, jadi gula'; NADPH, ATP and G3P are not named, the hexagon stands for the sugar molecule (glucose's ring), and s12 shows fewer pieces than one glucose needs.",
         "source": "OpenStax, Biology 2e, 8.3 'Using Light Energy to Make Organic Molecules' (openstax.org/books/biology-2e/pages/8-3-using-light-energy-to-make-organic-molecules): NADPH loses 'both energy and a hydrogen atom' in making G3P from CO2; 'six times to produce a six-carbon glucose molecule'; and 8.1 ('Glucose ... is made from two three-carbon G3Ps')."},
        {"id": "f9", "claim": "The sugars made by photosynthesis are the plant's food (its source of energy) and its building material: they are carried from the leaves to the growing parts through the phloem, and glucose chains make cellulose, the main part of plant cell walls (over thirty per cent of plant matter); wood is mostly cellulose. s14 draws cellulose as chains of the sugar hexagon. Simplification: wood also holds hemicellulose and lignin, which are made from the same sugars but are not shown.",
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
