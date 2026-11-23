"""Writes storyboard.json for "Gimana lebah bikin madu?" (portrait 1080 x 1920, the Watercolour template).

The sample film of the Watercolour visual template: soft transparent washes that bloom in, fine ink drawn on over
them, italic labels on thin leaders, a natural-history plate on cold-pressed paper. The film is cut to one take of
narration, so the times here are only a guess (from the length of each line) until the take retimes the board:

    python3 examples/madu-lebah/storyboard.build.py && node kit/tools/storyboard.mjs examples/madu-lebah --png

The flower is kaliandra (Calliandra calothyrsus), planted in Java for honey (f2); its nectar holds 14-20 % sugar, and
the film's worked example takes the top of that range: 100 g of nectar with 20 g of sugar. Ripe honey here is said
as about a fifth water (17 % in temperate honey, at most 20 % by the Codex standard, 17.5-22 % in measured Indonesian
honeys, f8), so the example dries to 25 g. The columns in s12 are computed below from those masses.
"""
import json
import math
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
shots = []

# ── The numbers ──────────────────────────────────────────────────────────────────────────────────────────────────
NECTAR = 100.0  # g, the worked example
SUGAR = 20.0  # g: kaliandra nectar is 14-20 % sugar (f2); the top of the range
HONEY_WATER = 0.20  # ripe honey: about a fifth water (f8)
HONEY = SUGAR / (1 - HONEY_WATER)  # 25 g
EVAPORATED = NECTAR - HONEY  # 75 g
assert HONEY == 25 and EVAPORATED == 75
PX = 7  # px a gram in s12
COL_NECTAR, COL_HONEY = NECTAR * PX, HONEY * PX  # 700 and 175 px
BAND_SUGAR = SUGAR * PX  # 140 px in both columns
BASE = 1180

# ── The paint ─────────────────────────────────────────────────────────────────────────────────────────────────────
INK, SAP, ULTRA, SIENNA, ROSE, PAPER = "#2b2b2b", "#5fb49c", "#3d5a98", "#c0703f", "#d77a8b", "#fbf8f1"
WAX = "#e3cfa6"  # a very dilute sienna glaze: beeswax caps
READ = (60, 1020, 230, 1300)
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


def label(x, y, text, size=54, colour=INK, to=None):
    """Italic ink lettering, with a thin ink leader curving to the part it names."""
    w = max(len(line) for line in text.split("\n")) * size * 0.46
    inside(x - w / 2, x + w / 2, y - size, y + size * 0.3 + text.count("\n") * size * 1.08, f"label '{text}'")
    out = [{"label": [x, y], "text": text, "size": size, "colour": colour}]
    if to:
        sx, sy = (x, y + size * 0.35) if to[1] > y else (x, y - size)
        if abs(to[0] - x) > w / 2 + 20:
            sx, sy = (x + w / 2 + 10 if to[0] > x else x - w / 2 - 10), y - size * 0.35
        out.append({"path": f"M{sx:.0f} {sy:.0f} Q{(sx + to[0]) / 2 + 50:.0f} {(sy + to[1]) / 2 - 30:.0f} {to[0]:.0f} {to[1]:.0f}", "colour": INK, "width": 3})
    return out


def ell(cx, cy, rx, ry):
    return f"M{cx - rx:.0f} {cy:.0f} a{rx:.0f} {ry:.0f} 0 1 0 {2 * rx:.0f} 0 a{rx:.0f} {ry:.0f} 0 1 0 {-2 * rx:.0f} 0 Z"


def wash(d, colour, width=3):
    """A transparent wash: a tint with its pigment pooled at the edge."""
    return {"path": d, "colour": colour, "fill": colour, "width": width}


def ink(d, width=4, colour=INK):
    return {"path": d, "colour": colour, "width": width}


def poly(cx, cy, r, n, turn=0):
    pts = [(cx + r * math.cos(math.radians(turn + 360 * i / n)), cy + r * math.sin(math.radians(turn + 360 * i / n))) for i in range(n)]
    return "M" + " L".join(f"{x:.0f} {y:.0f}" for x, y in pts) + " Z"


# ── Things painted ───────────────────────────────────────────────────────────────────────────────────────────────
def bee(x, y, L, face="left", tongue=0.0, fanning=False, gut=None):
    """An Apis mellifera worker in profile: head, thorax, banded abdomen, two pairs of wings, six legs, antennae.
    (x, y) is the middle of the body, L its length; `tongue` reaches the proboscis out by that share of L;
    `gut` paints the honey stomach inside (a fill colour), seen through a cleared abdomen."""
    s = 1 if face == "left" else -1

    def P(u, v):
        return x + s * u * L, y + v * L

    def E(u, v, ru, rv):
        cx, cy = P(u, v)
        return ell(cx, cy, ru * L, rv * L)

    def path(*pts):
        return "M" + " L".join(f"{px:.0f} {py:.0f}" for px, py in (P(u, v) for u, v in pts))

    out = []
    # wings first (behind), a pale ultramarine glaze with fine veins
    wings = [(0.02, -0.22, 0.26, 0.08), (0.08, -0.16, 0.18, 0.06)]
    if fanning:
        wings += [(0.0, -0.12, 0.25, 0.07), (0.04, -0.28, 0.22, 0.06)]
    for u, v, ru, rv in wings:
        out.append(wash(E(u, v, ru, rv), ULTRA, 2))
    # body
    out.append(ink(E(0.2, 0.04, 0.25, 0.16), 4) if gut else wash(E(0.2, 0.04, 0.25, 0.16), SIENNA, 4))
    out.append(wash(E(-0.14, -0.01, 0.15, 0.14), SIENNA, 4))
    out.append(wash(E(-0.36, 0.02, 0.11, 0.13), INK, 4))
    out.append(wash(E(-0.38, -0.01, 0.05, 0.08), INK, 3))
    # bands on the abdomen
    for u in (0.1, 0.2, 0.3):
        out.append(ink(path((u, -0.1), (u + 0.025, 0.04), (u, 0.18)), 3, SIENNA) if gut else ink(path((u, -0.1), (u + 0.025, 0.04), (u, 0.18)), max(3, round(0.022 * L))))
    # antenna, elbowed
    out.append(ink(path((-0.4, -0.1), (-0.43, -0.26), (-0.55, -0.31)), 3))
    # three legs on the near side
    for (a, b, c) in [((-0.2, 0.1), (-0.27, 0.26), (-0.31, 0.36)), ((-0.13, 0.12), (-0.1, 0.28), (-0.14, 0.38)), ((-0.06, 0.11), (0.05, 0.28), (0.03, 0.4))]:
        out.append(ink(path(a, b, c), 3))
    if tongue:
        out.append(ink(path((-0.44, 0.1), (-0.44 - tongue, 0.18)), max(3, round(0.012 * L)), SIENNA))
    if gut:
        out.append(ink(path((-0.4, 0.02), (-0.14, 0.02), (0.02, 0.03)), 4))
        out.append(wash(E(0.1, 0.03, 0.09, 0.08), gut, 4))
        out.append(ink(E(0.21, 0.03, 0.015, 0.02), 4))
        out.append(ink(path((0.23, 0.03), (0.32, -0.02), (0.38, 0.05), (0.3, 0.1), (0.4, 0.12)), 5))
    return out


def stamens(cx, cy, R, n=34, seed=3):
    """A kaliandra head: a hemisphere of long rose stamens from a cluster of small green floral cups."""
    out = [wash(ell(cx, cy - 0.15 * R, R * 0.95, R * 0.75), ROSE, 2)]
    for i in range(n):
        a = math.radians(-172 + 164 * i / (n - 1))
        k = 0.78 + 0.22 * ((i * 7 + seed) % 5) / 4
        x0, y0 = cx + 0.12 * R * math.cos(a), cy + 0.2 * R + 0.06 * R * math.sin(a)
        x1, y1 = cx + k * R * math.cos(a), cy + 0.2 * R + k * 0.85 * R * math.sin(a)
        out.append(ink(f"M{x0:.0f} {y0:.0f} Q{(x0 + x1) / 2 + 8:.0f} {(y0 + y1) / 2 - 10:.0f} {x1:.0f} {y1:.0f}", 3, ROSE))
    out.append(wash(f"M{cx - 0.18 * R:.0f} {cy + 0.18 * R:.0f} q{0.18 * R:.0f} {0.22 * R:.0f} {0.36 * R:.0f} 0 z", SAP, 3))
    out.append(ink(f"M{cx:.0f} {cy + 0.3 * R:.0f} q-10 {0.4 * R:.0f} 30 {0.8 * R:.0f}", 5, SAP))
    return out


def droplet(x, y, r, colour=ULTRA):
    return [wash(f"M{x} {y - 1.6 * r:.0f} C {x + 0.4 * r:.0f} {y - 0.8 * r:.0f}, {x + r:.0f} {y - 0.3 * r:.0f}, {x + r:.0f} {y + 0.2 * r:.0f} A{r:.0f} {r:.0f} 0 0 1 {x - r:.0f} {y + 0.2 * r:.0f} C {x - r:.0f} {y - 0.3 * r:.0f}, {x - 0.4 * r:.0f} {y - 0.8 * r:.0f}, {x} {y - 1.6 * r:.0f} Z", colour, 3)]


def jar(lid=False, level=1000):
    out = [ink("M310 860 H770 V900 H310 Z", 4),
           wash(f"M285 {level} H795 V1220 C 795 1250, 780 1265, 750 1265 H330 C 300 1265, 285 1250, 285 1220 Z", SIENNA, 3),
           ink("M300 900 C 290 900, 280 920, 280 950 V1220 C 280 1250, 300 1270, 330 1270 H750 C 780 1270, 800 1250, 800 1220 V950 C 800 920, 790 900, 780 900 Z", 5)]
    if lid:
        out.append(wash("M295 800 H785 V870 H295 Z", SIENNA, 4))
    return out


def spoon():
    return [ink("M440 500 L120 330", 9), wash(ell(530, 530, 115, 58), SIENNA, 4)]


def ribbon(fold=1.0):
    return [ink("M610 572 C 606 700, 552 820, 540 1000", 22, SIENNA),
            ink(f"M540 1000 c -{50 * fold:.0f} -6, -{50 * fold:.0f} -40, 0 -42 c {46 * fold:.0f} 0, {46 * fold:.0f} 32, 0 40", 14, SIENNA)]


def opening():
    """Frame 0, and the picture the film loops into: honey falls from a spoon into a jar; a kaliandra flower beside."""
    return [stamens(830, 430, 170), droplet(812, 640, 16)] + spoon() + ribbon() + jar()


COMB = "#c8b89a"  # a faint wax line, for comb kept in the background


def hexgrid(x0, y0, cols, rows, r, fill=None, line=INK, width=3):
    """Comb cells, pointy-topped, in ink; `fill` maps (col, row) to a wash colour."""
    out = []
    w = math.sqrt(3) * r
    for row in range(rows):
        for col in range(cols):
            cx = x0 + col * w + (w / 2 if row % 2 else 0)
            cy = y0 + row * 1.5 * r
            d = poly(cx, cy, r * 0.94, 6, 30)
            colour = (fill or {}).get((col, row))
            out.append(wash(d, colour, width) if colour else ink(d, width, line))
    return out


def cell_of(x0, y0, r, col, row):
    w = math.sqrt(3) * r
    return x0 + col * w + (w / 2 if row % 2 else 0), y0 + row * 1.5 * r


def sucrose(x, y, k=1.0):
    """Sucrose: a glucose ring (hexagon) bridged by an oxygen to a fructose ring (pentagon)."""
    return [wash(poly(x - 165 * k, y, 130 * k, 6, 30), SIENNA, 4), wash(poly(x + 160 * k, y, 112 * k, 5, -90), SIENNA, 4),
            ink(f"M{x - 52 * k:.0f} {y:.0f} H{x + 52 * k:.0f}", 6), {"dot": [round(x), round(y), round(14 * k)], "colour": INK}]


def enzyme(x, y, r, open_=0.5):
    """The enzyme, painted as a soft rose body with a cleft that closes on the bond."""
    a = 25 * open_
    return wash(f"M{x:.0f} {y:.0f} L{x + r * math.cos(math.radians(-90 + a)):.0f} {y + r * math.sin(math.radians(-90 + a)):.0f} A{r} {r} 0 1 1 {x + r * math.cos(math.radians(-90 - a)):.0f} {y + r * math.sin(math.radians(-90 - a)):.0f} Z", ROSE, 4)


def column(x, w, water, sugar, base=BASE):
    """A painted swatch column: water (ultramarine) on top of sugar (burnt sienna), heights in px."""
    return [wash(f"M{x} {base - sugar:.0f} H{x + w} V{base - sugar - water:.0f} H{x} Z", ULTRA, 3),
            wash(f"M{x} {base} H{x + w} V{base - sugar:.0f} H{x} Z", SIENNA, 3), ink(f"M{x} {base} H{x + w} V{base - sugar - water:.0f} H{x} Z", 4)]


def flood(edge):
    """A new wash flooding the page from the left, its wet edge at x = edge."""
    return wash(f"M-20 -20 H{edge} C {edge + 60} 600, {edge - 40} 1200, {edge + 30} 1940 H-20 Z", SIENNA, 3)


def recap(rows):
    """The recap plate: four small vignettes down the left, each with its two-line italic note, joined by arrows."""
    arrow = lambda y0, y1: [ink(f"M210 {y0} V{y1}", 3), ink(f"M196 {y1 - 16} L210 {y1} L224 {y1 - 16}", 3)]
    out = [stamens(210, 400, 120), droplet(210, 530, 18), label(700, 400, "nektar\nair ±80 %", 62)]
    if rows >= 2:
        out += [arrow(560, 600), bee(210, 680, 280), wash(ell(76, 712, 22, 20), ROSE), label(700, 650, "enzim:\ngula dipotong", 62)]
    if rows >= 3:
        out += [arrow(790, 830), bee(140, 900, 170, fanning=True), bee(290, 900, 170, fanning=True), ink("M60 960 H370", 4),
                [ink(f"M{x} 960 V1000 H{x + 60} V960", 3) for x in (80, 160, 240, 320)], label(700, 890, "kipas sayap:\nair menguap", 62)]
    if rows >= 4:
        out += [arrow(1010, 1060), wash("M140 1110 H290 V1270 H140 Z", SIENNA), ink("M130 1090 H300 V1280 H130 Z", 4), wash("M135 1070 H295 V1095 H135 Z", SIENNA),
                label(700, 1150, "madu\nair ±20 %", 66, SIENNA)]
    return out


# ── The script, cut into shots (one take; the take sets the times) ────────────────────────────────────────────────
t = 0.0


def shot(id, act, type_, voice, **more):
    global t
    said = re.sub(r"\[[^]]*\]", "", voice).replace("*", "").strip()
    dur = round(max(1.5, len(said) / 15.5 + 0.3), 2)
    shots.append({"id": id, "act": act, "type": type_, "start": round(t, 3), "end": round(t + dur, 3), "voice": voice, **more})
    t += dur


shot("s01", "hook", "wide", "Madu sekental ini, awalnya cuma cairan bunga yang *encer* banget.",
     teaches="The puzzle: thick honey starts as a thin, watery liquid from a flower.",
     screen="Cold-pressed watercolour paper (#fbf8f1) with a deckled edge. A plate: a spoon tilted top left, a thick ribbon of honey (burnt sienna wash, pooled darker at its edges) falling from it and folding over itself into a glass jar (fine ink outline) that fills the middle and lower frame (x 280-800, y 860-1270). Top right, a kaliandra flower head: a pompom of long rose stamens over small green cups, with one clear drop of nectar (the palest ultramarine) hanging from it.",
     motion="Frame 0 is finished. The ribbon keeps folding, slowly (honey speed). On 'cairan bunga' the camera eases right to the flower; on 'encer' the nectar drop lets go and falls fast past the jar, a thin streak, while the honey still crawls. Italic labels write on: 'kental' by the ribbon, 'encer' by the drop.",
     carries="The jar, the spoon and the flower.", transition="A wash floods in from the left and the words are written on it.",
     sound="A calm bed starts: solo piano, a soft string pad under it. A slow honey drip; a tiny quick water drop.", check="Thick and thin read at a glance: the slow fold against the fast drop.", facts=["f1"],
     frames=[fr(0, "Frame 0 is finished: honey folding from the spoon into the jar; the kaliandra flower with its drop of nectar.", opening(), {"move": [690, 760, 690, 900], "text": "pelan"}),
             fr(0.5, "The nectar drop falls fast, a thin streak, past the slow ribbon.", opening()[:1], spoon(), ribbon(1.2), jar(), droplet(830, 860, 14), ink("M830 700 V820", 2, ULTRA), {"move": [900, 660, 900, 900], "text": "cepat"}, {"camera": "right"}),
             fr(1, "Labels written on in italic: 'kental' by the honey, 'encer' by the drop.", opening(), label(330, 760, "kental", 64, INK, (550, 800)), label(900, 860, "encer", 64, INK, (818, 660)), {"cut": "lapisan cat membanjiri"})])

shot("s02", "hook", "type", "Kok bisa berubah?",
     teaches="Asks the question: how does thin nectar become thick honey?",
     screen="A fresh wash of pale sienna has flooded the page. In Cormorant Garamond, ink, centred: 'Kok bisa / berubah?', with 'berubah?' over a stronger burnt-sienna bloom. Under it, small: a pale blue drop, a fine ink arrow, a fat amber drop.",
     motion="The wash blooms in from the left edge and settles; the words write on in ink, letter by letter; the sienna bloom spreads behind 'berubah?'; the two drops and the arrow draw on last.",
     carries="The page and the two drops.", transition="The camera drifts down into a new plate: the flower, large.",
     sound="A single piano note on the question; a soft brush sweep for the wash.", check="The question reads in under a second, with the sound off.",
     frames=[fr(0, "The wash floods in from the left; 'Kok bisa' writes on in ink.", flood(700), {"title": [540, 640], "text": "Kok bisa", "size": 130}, {"move": [300, 900, 640, 900], "text": "cat basah"}),
             fr(1, "'berubah?' over its sienna bloom; the blue drop, the arrow, the amber drop.", flood(1100), wash(ell(560, 760, 280, 90), SIENNA), {"title": [540, 640], "text": "Kok bisa\nberubah?", "size": 130, "accent": "berubah?"}, droplet(360, 1030, 34), ink("M420 1010 H640", 4), ink("M610 990 L640 1010 L610 1030", 4), droplet(720, 1030, 52, SIENNA), {"cut": "turun ke bunga"})])

shot("s03", "nektar", "diagram", "Cairan itu namanya *nektar*, isinya kebanyakan air.",
     teaches="The thin liquid is nectar, and it is mostly water.",
     screen="A botanical plate: a kaliandra head, large (centre (430, 640), the stamens spreading to x 130-730), italic title 'Calliandra calothyrsus (kaliandra)'. An inset circle in fine ink (centre (360, 1080), r 170) magnifies one flower: its green cup with the stamens leaving it and a clear drop of nectar in it; label 'nektar'. Beside, a painted swatch column (x 790-980, y 520-1160): 80 % ultramarine 'air', 20 % burnt sienna 'gula'.",
     motion="Slow push in; the rose wash of the stamens blooms first, then their ink lines draw on; the inset's circle draws round and its drop pools in; the column paints from the bottom up, the sienna band then the ultramarine above it; labels write on.",
     carries="The swatch column of nectar.", transition="A bee comes in from the left, the camera easing back.",
     sound="A soft water drop as the nectar pools; piano carries on.", check="The column is 80 : 20 by height (512 px and 128 px), from the kaliandra figure (f1, f2).", facts=["f1", "f2"],
     frames=[fr(0, "The kaliandra head blooms in; the italic title.", stamens(430, 640, 300), label(540, 300, "Calliandra calothyrsus (kaliandra)", 44), {"camera": "push"}),
             fr(0.5, "The inset magnifies one flower: its cup holds a drop of nectar; label 'nektar'.", stamens(430, 640, 300), label(540, 300, "Calliandra calothyrsus (kaliandra)", 44), ink(ell(360, 1080, 170, 170), 4), ink("M470 950 L430 880", 3), wash("M270 1170 C 280 1040, 440 1040, 450 1170 Z", SAP, 4), ink("M300 1060 L220 940 M330 1050 L300 920 M390 1050 L420 920 M420 1060 L500 950", 4, ROSE), droplet(360, 1145, 30), label(640, 1230, "nektar", 60, INK, (380, 1135))),
             fr(1, "The swatch column: air 80 %, gula 20 %.", stamens(430, 640, 300), ink(ell(360, 1080, 170, 170), 4), wash("M270 1170 C 280 1040, 440 1040, 450 1170 Z", SAP, 4), ink("M300 1060 L220 940 M330 1050 L300 920 M390 1050 L420 920 M420 1060 L500 950", 4, ROSE), droplet(360, 1145, 30), label(640, 1230, "nektar", 60, INK, (380, 1135)), column(790, 190, 512, 128, 1160), label(885, 490, "isi nektar", 52), label(885, 780, "air", 64), label(885, 850, "80 %", 60), label(885, 1090, "gula", 48), label(885, 1140, "20 %", 44), {"cut": "lebah datang"})])

shot("s04", "nektar", "wide", "Lebah nyedot nektar,",
     teaches="A honey bee drinks the nectar with its tongue.",
     screen="The kaliandra head on the right (centre (650, 700), R 330). An Apis mellifera worker, painted true to life (amber bands, dark stripes, a hairy thorax, glassy wings with fine veins), clings to the side of a flower cup at the base of the stamens and reaches its tongue in; the label 'Apis mellifera' in italic below.",
     motion="The camera eases back; the bee flies in on a gentle curve, wings a soft blur; it lands at the base of the stamens, folds its wings and the tongue reaches out and in; the nectar drop shrinks.",
     carries="The bee on the flower.", transition="The bee's abdomen clears like glass and the camera pushes in on it.",
     sound="A soft, low wing hum fading as it lands; a tiny sip.", check="The bee is at the base of the stamens, on the side of the cup, as bees forage kaliandra (f2).", facts=["f2", "f3"],
     frames=[fr(0, "The bee flies in towards the flower, wings blurred.", stamens(650, 700, 330), bee(260, 520, 340, "right", fanning=True), {"move": [180, 640, 380, 860], "text": "terbang"}),
             fr(0.5, "Hovering in front of the flower cup, about to land.", stamens(650, 700, 330), bee(320, 680, 400, "right", fanning=True), {"move": [260, 560, 330, 720], "text": "mendarat"}),
             fr(1, "Landed at the base of the stamens; the tongue in the flower cup.", stamens(650, 700, 330), bee(400, 760, 440, "right", tongue=0.16), label(380, 1080, "Apis mellifera", 60, INK, (380, 930)), {"cut": "perut jadi bening"})])

shot("s05", "nektar", "diagram", "terus nyimpennya di perut khusus, namanya *kantong madu*.",
     teaches="The bee keeps the nectar in a special storage stomach, the honey stomach, where it is not digested.",
     screen="A plate of the bee in profile, as large as the frame allows (body x 140-945, y 470-1140), the abdomen painted as if clear: inside, a fine ink oesophagus runs from the head through the thorax to a round sac in the front of the abdomen, the honey stomach, filling with pale ultramarine nectar; behind it a small valve and the coiled gut. Labels on thin leaders: 'kantong madu', 'katup'; under the bee: 'cuma disimpan, nggak dicerna'.",
     motion="Gentle zoom in; the abdomen's sienna wash lifts away to clear paper; the oesophagus draws on; a pale blue wash runs down it and blooms in the sac until it is full; the labels write on, one after the other.",
     carries="The honey stomach full of nectar.", transition="The camera keeps pushing into the sac.",
     sound="A soft liquid swallow; strings hold a low note.", check="The sac sits in the front of the abdomen, before the valve to the gut (f3).", facts=["f3"],
     frames=[fr(0, "The bee in profile, large; its abdomen starts to clear.", bee(540, 800, 900), {"camera": "push"}),
             fr(0.5, "Seen through the clear abdomen: the nectar runs down the oesophagus.", bee(540, 800, 900, gut=PAPER), {"move": [250, 760, 590, 760], "text": "nektar"}),
             fr(1, "The sac fills; labels 'kantong madu', 'katup' and 'cuma disimpan, nggak dicerna'.", bee(540, 800, 900, gut=ULTRA), label(300, 380, "kantong madu", 60, INK, (600, 760)), label(880, 400, "katup", 54, INK, (720, 805)), label(540, 1260, "cuma disimpan, nggak dicerna", 46), {"cut": "masuk ke kantong"})])

shot("s06", "enzim", "diagram", "Di situ, *enzim* dari tubuh lebah",
     teaches="In the honey stomach the bee adds an enzyme to the nectar.",
     screen="Inside the honey stomach, painted like a cross-section: a big pale-ultramarine sac (centre (540, 800), 760 wide) with the oesophagus coming in at the left; floating in it, sugar molecules drawn as a burnt-sienna hexagon joined to a pentagon. Small rose drops of enzyme come in with the nectar and spread among them; label 'enzim (invertase)'.",
     motion="Push in through the wall; the sac's wash blooms around the frame; rose drops bloom in one after another at the inlet and drift slowly among the sugars.",
     carries="The sugars and the enzyme in the sac.", transition="The camera pushes in on one sugar molecule.",
     sound="Soft, low water sounds; a high string harmonic for the enzyme.", check="The enzyme comes from the bee (it enters with the swallowed nectar), not from the flower (f4).", facts=["f4"],
     frames=[fr(0, "Inside the sac: sugar molecules in pale nectar; the inlet at the left.", wash(ell(540, 800, 400, 330), ULTRA), ink("M60 690 C 120 700, 160 720, 180 760", 6), sucrose(380, 640, 0.38), sucrose(680, 760, 0.38), sucrose(470, 960, 0.38), sucrose(760, 1010, 0.38), {"camera": "push"}),
             fr(1, "Rose enzyme drops come in and spread among the sugars; label 'enzim (invertase)'.", wash(ell(540, 800, 400, 330), ULTRA), ink("M60 690 C 120 700, 160 720, 180 760", 6), sucrose(380, 640, 0.38), sucrose(680, 760, 0.38), sucrose(470, 960, 0.38), sucrose(760, 1010, 0.38), [wash(ell(x, y, 26, 22), ROSE) for x, y in ((220, 760), (300, 820), (560, 700), (600, 900), (380, 1060))], label(330, 360, "enzim (invertase)", 58, INK, (300, 800)), {"move": [120, 720, 280, 800], "text": "masuk"}, {"cut": "dekat ke satu gula"})])

shot("s07", "enzim", "compare", "mulai motong gulanya jadi dua gula yang lebih *kecil*.",
     teaches="The enzyme cuts each sugar molecule in two smaller sugars (sucrose into glucose and fructose).",
     screen="One sugar molecule, large, painted in burnt sienna: a hexagon (glukosa) joined through an oxygen to a pentagon (fruktosa), labelled 'sukrosa' above. The rose enzyme closes on the bond between them. Below, after: the hexagon and the pentagon apart, labelled 'glukosa' and 'fruktosa'.",
     motion="The molecule's wash blooms in and its ink draws on; the enzyme drifts up and its cleft closes on the bond; the bond line is rubbed out; the two rings drift apart slowly and settle lower in the frame; labels write on.",
     carries="The two small sugars.", transition="The camera drifts back out of the bee as it flies home.",
     sound="A soft pizzicato pluck on the cut.", check="Before above, after below: one big sugar, then two smaller ones, nothing added but the cut (f4).", facts=["f4"],
     frames=[fr(0, "Before: the sugar 'sukrosa', the enzyme coming up to its bond.", sucrose(540, 580, 1.25), label(540, 340, "sukrosa", 70), enzyme(540, 900, 120, 0.9), label(840, 940, "enzim", 60, INK, (660, 900)), {"move": [540, 1000, 540, 760], "text": "mendekat"}),
             fr(0.5, "The enzyme closes on the bond: the cut.", sucrose(540, 580, 1.25), label(540, 340, "sukrosa", 70), enzyme(540, 720, 120, 0.2), ink("M490 530 L590 630 M590 530 L490 630", 6, ROSE)),
             fr(1, "After: two smaller sugars apart, 'glukosa' and 'fruktosa'.", label(540, 340, "sukrosa", 70), ink("M330 380 H750", 4), wash(poly(300, 1000, 150, 6, 30), SIENNA, 4), wash(poly(790, 1000, 130, 5, -90), SIENNA, 4), label(300, 1240, "glukosa", 64), label(790, 1240, "fruktosa", 64), {"move": [480, 780, 360, 880], "text": "lepas"}, {"cut": "terbang pulang"})])

shot("s08", "sarang", "wide", "Sampai di sarang, nektarnya dioper dari *mulut ke mulut* ke lebah lain,",
     teaches="At the hive the forager hands the nectar to another bee, mouth to mouth.",
     screen="A pale wax comb fills the paper behind (fine ink hexagons over a faint warm wash). Two worker bees face each other in the middle: the forager on the left, the receiver on the right with her tongue out; between their mouths, a drop of nectar passes. Label 'dari mulut ke mulut'.",
     motion="Slow pan from the flower to the comb, the comb's layer moving slower than the bees (parallax); the forager lands; the two face each other; the drop slides along the tongues from left to right; the forager turns and flies off.",
     carries="The receiver bee with the drop.", transition="She walks to an empty cell; the camera follows.",
     sound="A gentle hive murmur under the piano; a soft liquid tick as the drop passes.", check="The drop moves from the forager to the receiver, not the other way (f5).", facts=["f5"],
     frames=[fr(0, "The comb; the forager lands on it.", hexgrid(80, 360, 6, 7, 95, line=COMB, width=2), bee(240, 760, 360, "right", fanning=True), {"move": [80, 560, 200, 700], "text": "mendarat"}, {"camera": "right"}),
             fr(0.5, "Face to face; the drop passes from mouth to mouth.", hexgrid(80, 360, 6, 7, 95, line=COMB, width=2), bee(360, 780, 380, "right", tongue=0.08), bee(720, 780, 380, "left", tongue=0.08), droplet(540, 846, 18), label(540, 330, "dari mulut ke mulut", 58, INK, (540, 790)), {"move": [480, 900, 600, 900], "text": "dioper"}),
             fr(1, "The receiver holds the drop; the forager flies off for more.", hexgrid(80, 360, 6, 7, 95, line=COMB, width=2), bee(240, 560, 300, "left", fanning=True), bee(770, 780, 380, "left", tongue=0.05), droplet(610, 840, 16), label(540, 330, "dari mulut ke mulut", 58), {"move": [260, 640, 110, 480], "text": "balik ke bunga"}, {"cut": "ke sel kosong"})])

shot("s09", "sarang", "diagram", "terus ditaruh di sel-sel *lilin*.",
     teaches="The nectar is put into the wax cells of the comb.",
     screen="Close on the comb face: large hexagonal wax cells in fine ink over a pale warm wash, filling the frame (r 120). The receiver bee puts her head into one cell; a thin pale-blue film of nectar spreads in it. Label 'sel lilin'.",
     motion="Gentle zoom; the bee walks in and dips her head into the cell; the nectar's wash blooms in the cell; the label writes on.",
     carries="The comb with nectar in its cells.", transition="More bees line up along the comb.",
     sound="A soft wet dab; the hive murmur.", check="The nectar is inside a cell, painted as a thin wash, not a full cell yet (f6).", facts=["f6"],
     frames=[fr(0, "Large wax cells; the bee comes to an empty one.", hexgrid(120, 420, 4, 6, 120), bee(760, 640, 360, "left"), {"move": [700, 560, 480, 740], "text": "masuk"}),
             fr(0.5, "Her head goes into the cell; the first film of nectar.", hexgrid(120, 420, 4, 6, 120, {(1, 2): ULTRA}), bee(470, 760, 360, "left", tongue=0.04), {"move": [760, 600, 560, 700], "text": "ditaruh"}),
             fr(1, "Nectar spreads in the cell; label 'sel lilin'.", hexgrid(120, 420, 4, 6, 120, {(1, 2): ULTRA, (2, 3): ULTRA, (1, 3): ULTRA}), bee(760, 560, 360, "right"), label(330, 330, "sel lilin", 62, INK, cell_of(120, 420, 120, 1, 2)), {"cut": "lebah berjajar"})])

shot("s10", "kering", "wide", "Nah, bagian pentingnya:",
     teaches="Sets up the key step: the nectar in the cells is still thin and watery.",
     screen="The camera pulls back over a whole comb: rows of wax cells in fine ink, many holding a pale ultramarine film of thin nectar, a few workers walking on it. An italic note with a leader to one cell: 'nektar di sel masih encer'.",
     motion="A slow pull back over the comb, the bees' layer moving a little faster than the comb's (parallax); the pale blue in the cells glints as the light passes; the note writes on.",
     carries="The comb full of thin nectar.", transition="Ease down to the comb's edge, where bees line up.",
     sound="The piano pauses on a held note: the signpost; the hive murmur stays.", check="The nectar in the cells is still the pale blue of s03, not amber yet (f1).", facts=["f1"],
     frames=[fr(0, "Pulling back over the whole comb; thin nectar in many cells.", hexgrid(100, 380, 6, 9, 92, {(c, r): ULTRA for c in range(6) for r in range(9) if (c * 2 + r) % 3 == 0}, line=COMB, width=2), bee(300, 620, 220, "left"), bee(760, 980, 220, "right"), {"camera": "pull"}),
             fr(1, "The note: 'nektar di sel masih encer'.", hexgrid(100, 380, 6, 9, 92, {(c, r): ULTRA for c in range(6) for r in range(9) if (c * 2 + r) % 3 == 0}, line=COMB, width=2), bee(300, 620, 220, "left"), bee(760, 980, 220, "right"), label(540, 300, "nektar di sel masih encer", 54, INK, cell_of(100, 380, 92, 3, 2)), {"cut": "ke tepi sarang"})])

shot("s10b", "kering", "wide", "lebah-lebah ngipasin sayapnya rame-rame,",
     teaches="Many bees fan their wings together over the comb, moving air across the open cells.",
     screen="A row of three workers along the comb's edge, side by side, wings beating (each wing painted twice, a soft blur); below them a cut-through of open cells holding nectar. Fine ink lines of moving air sweep across above the cells from left to right. Label 'kipas sayap'.",
     motion="The camera eases back to show the row; the wing blurs pulse in turn, gently; the air lines draw on one after another across the frame, slowly.",
     carries="The fanning bees and the cells.", transition="Push in on the open cells.",
     sound="A soft, airy whirr of wings, gentle and steady, under the strings.", check="The air moves across the cells, the bees facing the same way (f7).", facts=["f7"],
     frames=[fr(0, "Three bees line up along the comb's edge.", ink("M80 1000 H1000", 5), [ink(f"M{x} 1000 V1200 M{x + 160} 1000 V1200 M{x} 1200 H{x + 160}", 4) for x in (100, 300, 500, 700)], [wash(f"M{x + 6} 1060 H{x + 154} V1194 H{x + 6} Z", ULTRA) for x in (100, 300, 500, 700)], bee(240, 880, 300), bee(540, 880, 300), bee(840, 880, 300), {"move": [100, 500, 300, 700], "text": "berjajar"}),
             fr(1, "Wings fanning; air lines sweep across; label 'kipas sayap'.", ink("M80 1000 H1000", 5), [ink(f"M{x} 1000 V1200 M{x + 160} 1000 V1200 M{x} 1200 H{x + 160}", 4) for x in (100, 300, 500, 700)], [wash(f"M{x + 6} 1060 H{x + 154} V1194 H{x + 6} Z", ULTRA) for x in (100, 300, 500, 700)], bee(240, 880, 300, fanning=True), bee(540, 880, 300, fanning=True), bee(840, 880, 300, fanning=True), ink("M80 560 C 300 520, 600 600, 1000 540 M80 640 C 300 610, 600 680, 1000 620", 3), label(540, 400, "kipas sayap", 62), {"move": [120, 470, 900, 470], "text": "angin"}, {"cut": "dekat ke sel"})])

shot("s11", "kering", "diagram", "biar airnya *menguap*.",
     teaches="The moving air carries water off the nectar: it evaporates.",
     screen="Close on the open cells, cut through: five cells side by side (x 120-960, y 760-1200), each holding nectar. Fine wisps of ultramarine rise from the surfaces and drift away to the right. The liquid's wash turns from pale blue towards amber as its level drops. Label 'uap air'.",
     motion="The wisps draw on and drift right, slowly, one after another; the level in each cell sinks a little; the sienna blooms up through the liquid.",
     carries="The cells, their nectar thickening.", transition="The cells are lifted off; the swatch column of s03 comes back.",
     sound="A faint breathy shimmer for the vapour; piano.", check="The vapour is water (blue) leaving; the sugar (sienna) stays behind (f7).", facts=["f7"],
     frames=[fr(0, "Open cells, nectar in each; the first wisps rise.", [ink(f"M{120 + i * 170} 760 V1200 H{270 + i * 170} V760", 5) for i in range(5)], [wash(f"M{126 + i * 170} 900 H{264 + i * 170} V1194 H{126 + i * 170} Z", ULTRA) for i in range(5)], [ink(f"M{190 + i * 170} 880 c -20 -40, 20 -60, 0 -100 c -20 -40, 20 -60, 0 -100", 3, ULTRA) for i in range(5)], {"move": [200, 600, 500, 520], "text": "naik"}),
             fr(1, "The wisps drift away; the level drops and the colour warms; label 'uap air'.", [ink(f"M{120 + i * 170} 760 V1200 H{270 + i * 170} V760", 5) for i in range(5)], [wash(f"M{126 + i * 170} 1010 H{264 + i * 170} V1194 H{126 + i * 170} Z", SIENNA) for i in range(5)], [ink(f"M{230 + i * 170} 840 c 20 -40, 60 -50, 80 -90 c 20 -40, 60 -50, 90 -80", 3, ULTRA) for i in range(5)], label(540, 400, "uap air", 64, INK, (700, 640)), {"move": [300, 520, 900, 440], "text": "terbawa angin"}, {"cut": "kolom kembali"})])

shot("s12", "kering", "chart", "Airnya terus berkurang, sampai tinggal sekitar *seperlima*.",
     teaches=f"The water drops from about four fifths of the nectar to about one fifth of the honey: {NECTAR:.0f} g of nectar becomes {HONEY:.0f} g of honey.",
     screen=f"Two painted swatch columns on one base line (y {BASE}), one scale ({PX} px a gram): left 'nektar {NECTAR:.0f} g', {COL_NECTAR:.0f} px tall, ultramarine water {SUGAR * 0 + (NECTAR - SUGAR) * PX:.0f} px over burnt-sienna sugar {BAND_SUGAR:.0f} px, labelled 'air 80 %'; right 'madu {HONEY:.0f} g', {COL_HONEY:.0f} px tall: the same {BAND_SUGAR:.0f} px of sugar under {(HONEY - SUGAR) * PX:.0f} px of water, labelled 'air ±20 %'. Between them an ink arrow: '{EVAPORATED:.0f} g air menguap'.",
     motion="The nectar column from s03 returns at full height; a copy slides right and its blue band drains down slowly, the wash lifting off the top, while the sienna band stays exactly where it is; the arrow and its figure write on; labels last.",
     carries="The small honey column.", transition="The column is washed over by amber: full cells of honey.",
     sound="A slow descending piano line as the water drains; it stops when the column does.", check=f"Columns {COL_NECTAR:.0f} px and {COL_HONEY:.0f} px; the sugar band is {BAND_SUGAR:.0f} px in both (f8).", facts=["f8", "f1"],
     frames=[fr(0, "The nectar column returns: 100 g, air 80 %.", ink(f"M120 {BASE} H960", 5), column(180, 220, (NECTAR - SUGAR) * PX, BAND_SUGAR), label(290, 420, "nektar 100 g", 58), label(290, 760, "air 80 %", 54), {"move": [420, 800, 620, 800], "text": "geser"}),
             fr(0.5, "The copy's blue band drains down; the sienna band does not move.", ink(f"M120 {BASE} H960", 5), column(180, 220, (NECTAR - SUGAR) * PX, BAND_SUGAR), label(290, 420, "nektar 100 g", 58), column(640, 220, (NECTAR - SUGAR) * PX * 0.4, BAND_SUGAR), {"move": [880, 700, 880, 980], "text": "air menguap"}),
             fr(1, "Honey: 25 g, air ±20 %; the arrow '75 g air menguap'.", ink(f"M120 {BASE} H960", 5), column(180, 220, (NECTAR - SUGAR) * PX, BAND_SUGAR), label(290, 420, "nektar 100 g", 58), label(290, 760, "air 80 %", 54), column(640, 220, (HONEY - SUGAR) * PX, BAND_SUGAR), label(750, 910, "madu 25 g", 58), label(750, 975, "air ±20 %", 50), label(540, 1255, "gula tetap sama", 50), ink("M400 640 C 520 600, 620 640, 700 760", 4), ink("M676 744 L700 760 L706 732", 4), label(720, 560, "75 g air menguap", 52), {"cut": "sel penuh madu"})])

shot("s13", "kering", "diagram", "Kalau udah sekental itu, selnya ditutup *lilin*.",
     teaches="When the honey is ripe, the bees seal each cell with a wax cap.",
     screen="The comb face again, large cells (r 110) now full of deep burnt-sienna honey; a worker at the upper right lays a pale wax cap over one cell; the capped cells on the left are a pale wax glaze (dilute sienna) with a fine ink rim. Label 'tutup lilin'.",
     motion="The honey's wash deepens as it blooms into each cell; the bee moves along a row; each cap draws on as a fine ink arc and a pale glaze spreads over the cell, left to right.",
     carries="The capped comb.", transition="The camera eases back to a jar beside the comb.",
     sound="Tiny soft taps for each cap; the strings warm.", check="Caps only on full cells (f9).", facts=["f9"],
     frames=[fr(0, "Full cells of deep honey; the bee arrives with wax.", hexgrid(140, 400, 4, 6, 110, {(c, r): SIENNA for c in range(4) for r in range(6)}), bee(840, 380, 300, "left"), {"move": [960, 300, 820, 440], "text": "datang"}),
             fr(0.5, "The first column of cells is capped, left to right.", hexgrid(140, 400, 4, 6, 110, {(c, r): (WAX if c < 1 else SIENNA) for c in range(4) for r in range(6)}), [ink(poly(*cell_of(140, 400, 110, 0, r), 96, 6, 30), 3) for r in range(6)], bee(800, 480, 300, "left"), {"move": [860, 700, 560, 800], "text": "ditutup"}),
             fr(1, "Caps over the left cells; label 'tutup lilin'.", hexgrid(140, 400, 4, 6, 110, {(c, r): (WAX if c < 2 else SIENNA) for c in range(4) for r in range(6)}), [ink(poly(*cell_of(140, 400, 110, c, r), 96, 6, 30), 3) for c in range(2) for r in range(6)], bee(760, 560, 300, "left"), label(330, 300, "tutup lilin", 62, INK, cell_of(140, 400, 110, 0, 1)), {"cut": "mundur ke toples"})])

shot("s14", "kering", "wide", "Jadilah madu, yang bisa *awet* lama banget.",
     teaches="Ripe honey, with so little water, keeps for a very long time, as long as it stays sealed.",
     screen="The jar of s01, now with a lid, full of burnt-sienna honey; beside it a slab of capped comb. Italic notes: 'awet, asal tertutup rapat' and, smaller, 'air sedikit: mikroba susah tumbuh'.",
     motion="The camera eases back; the lid's wash blooms on and settles; the two notes write on, one after the other.",
     carries="The jar, honey inside.", transition="A clean page; the three steps are painted on it.",
     sound="A soft glass-and-lid tap; a warm string chord.", check="The note says 'asal tertutup rapat': honey that takes up water can ferment (f10).", facts=["f10"],
     frames=[fr(0, "The jar full of honey; the lid comes down.", jar(level=920), hexgrid(880, 760, 1, 6, 70, {(0, r): WAX for r in range(6)}), hexgrid(880, 760, 1, 6, 70, width=2), {"move": [540, 640, 540, 780], "text": "tutup"}),
             fr(0.5, "The lid is on; the first note writes on.", jar(lid=True, level=920), hexgrid(880, 760, 1, 6, 70, {(0, r): WAX for r in range(6)}), hexgrid(880, 760, 1, 6, 70, width=2), label(540, 400, "awet, asal tertutup rapat", 56), {"camera": "pull"}),
             fr(1, "Lidded; the notes 'awet, asal tertutup rapat' and 'air sedikit: mikroba susah tumbuh'.", jar(lid=True, level=920), hexgrid(880, 760, 1, 6, 70, {(0, r): WAX for r in range(6)}), hexgrid(880, 760, 1, 6, 70, width=2), label(540, 400, "awet, asal tertutup rapat", 56), label(540, 490, "air sedikit: mikroba susah tumbuh", 42), {"cut": "halaman rangkuman"})])

shot("s15", "recap", "recap", "Intinya, madu itu nektar yang diolah *enzim*, terus dikeringin pakai kipasan sayap lebah.",
     teaches="The answer in one plate: nectar, cut by the enzyme, dried by the bees' fanning, becomes honey.",
     screen="One plate filling the frame: four small vignettes down the left (x 60-370, y 280-1280), each with its italic note in two lines to the right, joined by fine ink arrows: a kaliandra head with its drop, 'nektar / air ±80 %'; a bee with a rose enzyme drop at its mouth, 'enzim: / gula dipotong'; two fanning bees over open cells, 'kipas sayap: / air menguap'; the jar of honey, 'madu / air ±20 %' in burnt sienna.",
     motion="A clean wash floods the page; the vignettes bloom in one after another as the voice names them, each line written on beside it; the arrows draw on between them.",
     carries="The plate, until the wash floods the page.", transition="A sienna wash floods the page from the left and the opening comes up under it.",
     sound="Three soft piano notes, one per step; a fuller chord for 'madu'.", check="Readable as a summary with the sound off; the two water figures match s03 and s12 (f8).", facts=["f1", "f4", "f7", "f8"],
     frames=[fr(0, "Nektar, then the enzyme step, each with its line.", recap(2)),
             fr(0.5, "The fanning step joins the plate: two bees fanning over open cells.", recap(3)),
             fr(1, "Honey at the end: the jar, 'madu · air ±20 %'.", recap(4), {"cut": "cat membanjiri"})])

shot("s16", "recap", "wide", "Jadi lain kali kamu nyendok madu, inget,",
     teaches="The bridge back into the first line.",
     screen="A sienna wash floods the page from the left and, as it settles, the opening plate is there under it: the spoon, the folding ribbon of honey, the jar, the kaliandra flower with its drop, in the places frame 0 has them.",
     motion="The wash's wet edge travels across the page and fades back to paper; the ribbon's fold is a moment before its frame-0 pose when the film loops.",
     carries="Into s01.", transition="No cut: the film loops straight into s01.",
     sound="The bed runs on into the opening.", check="The last frame matches frame 0 (check.mjs SSIM).",
     frames=[fr(0, "The wash floods across, the opening plate coming up under it.", opening(), flood(560), {"move": [200, 1100, 700, 1100], "text": "cat membanjiri"}),
             fr(1, "The opening plate, a moment before frame 0.", opening(), {"cut": "loop ke s01"})])

duration = round(t, 3)
shots[-1]["end"] = duration

storyboard = {
    "title": "Gimana lebah bikin madu?",
    "question": "Madu sekental ini, awalnya cuma cairan bunga yang encer banget. Kok bisa berubah?",
    "audience": "Orang Indonesia yang nonton video pendek dan biasa minum madu. Mereka tahu madu dibuat lebah dari bunga, tapi banyak yang mengira bunga 'punya madu' dan lebah tinggal mengangkutnya, atau nggak tahu kenapa madu bisa kental dan awet.",
    "promise": "Madu itu nektar bunga yang diolah lebah: enzim dari tubuh lebah memotong gulanya jadi dua gula yang lebih kecil, lalu lebah mengipasi nektar di sel lilin sampai airnya tinggal sekitar seperlima, baru selnya ditutup lilin. Karena airnya sedikit, madu kental dan awet.",
    "template": "watercolour",
    "standard": 3,
    "language": "id",
    "format": "1080x1920",
    "captions": "pop",
    "duration": duration,
    "fps": 60,
    "loop": {"line": "Jadi lain kali kamu nyendok madu, inget, / madu sekental ini, awalnya cuma cairan bunga yang encer banget.", "picture": "A sienna wash floods the page from the left and the opening plate comes up under it: the spoon, the folding ribbon of honey, the jar and the kaliandra flower, as frame 0 has them."},
    "voice": {"voice_id": "xlBOShi2835jfBgaEld4", "name": "Rafiq", "model": "eleven_v4", "language": "id", "direction": "[warmly]"},
    "look": {
        "accent": "#c0703f",
        "mood": "The Watercolour template: cold-pressed watercolour paper (#fbf8f1) with visible grain and a deckled edge, soft daylight, transparent washes with pigment pooling at their edges, fine slightly broken ink outlines (#2b2b2b) drawn on over them, a natural-history plate with plenty of paper and the subject centred. Each colour keeps one meaning: burnt sienna #c0703f is sugar and honey (the accent, and the caption's key word), ultramarine #3d5a98 is water, rose #d77a8b is the kaliandra flower and, inside the bee, the enzyme, sap green #5fb49c is the plant; the bee is painted true to an Apis mellifera worker in dilute sienna and ink. Labels are italic Cormorant Garamond on thin ink leaders; figures are serif, at their real values. Washes bloom and spread as they appear, ink draws on, nothing moves faster than paint spreads; slow pans and gentle zooms with parallax between painted layers; cuts by a new wash flooding the page. No hard vector edges, no neon, no 3D, no glow, no busy backgrounds.",
    },
    "music": {
        "track": "Composed for this film (ElevenLabs Music, music/bed.mp3), written to the take's length",
        "bpm": 72,
        "note": "A calm acoustic bed: solo piano over a soft string pad (cello and violas), slow and spacious, composed to the take's length so it is still sounding under the bridge and runs on into the opening. Sparse under the bee's anatomy and the enzyme (s05-s07), a slow descending piano line as the water drains in s12, a warmer chord on the capped honey and the recap. Sound effects are soft and wet: a brush sweep for each wash that floods the page, water drops (a slow honey drip and a quick nectar drop in s01), a low wing hum, a hive murmur, an airy whirr of fanning wings in s10b, a breathy shimmer for the vapour, tiny taps for the wax caps. The cuts follow the take, not the beat.",
    },
    "facts": [
        {"id": "f1", "claim": f"Nectar is mostly water with sugar dissolved in it. The sugar varies greatly between plants, usually 25-50 % (so 50-75 % water); 'water usually makes up approximately 70 percent of nectar'; nectar 'can contain up to 80 percent water'. The film's worked example is kaliandra nectar at {SUGAR / NECTAR * 100:.0f} % sugar ({100 - SUGAR / NECTAR * 100:.0f} % water, f2): the s03 column is 512 px of water over 128 px of sugar (80 : 20), and the recap says 'air ±80 %'.",
         "source": "F. Ratnieks, 'How Bees Make Honey', information sheet, Laboratory of Apiculture and Social Insects, University of Sussex (2011); M. Shipman, 'How Do Bees Make Honey?', NC State University News (19 June 2013); S. Collins-Smith, 'How is honey made?', Mississippi State University Extension."},
        {"id": "f2", "claim": "Kaliandra (Calliandra calothyrsus) is grown in Java as a nectar source for honey (Perum Perhutani planted it in state forest for honey production; 1,625 ha in the Sukabumi district in 1989). Its nectar has been measured at 20-50 µl a flower with 14-20 % sugar. Bees visit for the nectar left after the night's flowering, clinging to the side of the floral cup and foraging at the base of the stamens and corolla, as s04 draws. Monofloral kaliandra honey from Apis mellifera has been sampled in Sukabumi, West Java. Simplification: the film shows an Apis mellifera worker; in the older Java reports the kaliandra honey came from Apis cerana hives.",
         "source": "D. J. Chamberlain (ed.), 'Calliandra calothyrsus: an agroforestry tree for the humid tropics', Tropical Forestry Paper 40, Oxford Forestry Institute (2001), ch. 3 (nectar volume and sugar) and 5.7 'Honey production' (bees as nectar robbers on the floral cup; Perhutani; Apis cerana); R. A. Rosyidah, A. E. Z. Hasan and D. Andrianto, 'Antibacterial and diastase enzyme activities of honey Apis mellifera from Indonesia', BIOTROPIA 31(1): 23-33 (2024), sample list (Calliandra calothyrsus, Sukabumi, West Java)."},
        {"id": "f3", "claim": "A forager drinks nectar and stores it in its crop, the honey stomach, a storage sac in the abdomen that visibly lengthens the abdomen when full (drawn at its front, before the valve, as anatomy diagrams show it); the crop is used for storage and the nectar is not digested there. The proventriculus, a valve at the back of the honey stomach, controls what passes on to the midgut. On screen: 'kantong madu', 'katup', 'cuma disimpan, nggak dicerna'. Drawn in profile from the worker's anatomy: head, thorax, abdomen, two pairs of wings, six legs, elbowed antennae, the proboscis.",
         "source": "Arizona State University, Ask A Biologist, 'Honey Bee Anatomy' (askabiologist.asu.edu/honey-bee-anatomy): honey stomach (foregut/crop) 'a storage sac, used in honey bees to carry nectar'; proventriculus 'can control the flow of nectar and solids. This allows honey bees to store nectar in the honey stomach without being digested'; NC State News (as f1): 'The crop is used solely for storage, and the bee does not digest the nectar at all'; University of Sussex LASI (as f1): 'When full ... the forager's abdomen is visibly longer'."},
        {"id": "f4", "claim": "Bees add an enzyme, invertase, to the nectar (foragers as they swallow it into the honey stomach, and processor bees each time they regurgitate it). Invertase breaks each sucrose molecule (table sugar, the main sugar of most nectar) into two smaller sugars, glucose and fructose. s07 draws sucrose as a glucose hexagon joined by an oxygen to a fructose pentagon. Simplification: the film shows one enzyme; the bees also add glucose oxidase later, which the film leaves out.",
         "source": "Mississippi State University Extension (as f1): 'Foragers collecting nectar from flowers add an enzyme (invertase) as they swallow it ... breaking down the nectar's complex sugar (sucrose) into simpler sugars (glucose and fructose) within the honey stomach'; University of Sussex LASI (as f1): 'The bees make an enzyme that breaks each sucrose molecule into two smaller sugar molecules, one glucose and one fructose'; OpenStax Biology 2e, 3.2 'Carbohydrates' (sucrose is a glucose and a fructose joined by a glycosidic bond)."},
        {"id": "f5", "claim": "Back at the hive a forager regurgitates its nectar load to a receiver (processor, food-handling) worker, which takes it with her tongue extended; the forager goes back to the flowers.",
         "source": "University of Sussex LASI (as f1), figure b: 'On returning to the hive a nectar forager (right) transfers her nectar to a receiver worker (left) who has her tongue extended'; NC State News and Mississippi State University Extension (as f1)."},
        {"id": "f6", "claim": "The receiver bee puts the nectar into the hexagonal beeswax cells of the comb (it takes many loads to fill a cell).",
         "source": "NC State News (as f1): 'regurgitates it into a hexagonal wax cell ... it takes many loads of nectar to fill a cell'; Mississippi State University Extension and University of Sussex LASI (as f1)."},
        {"id": "f7", "claim": "To ripen the nectar the bees dry it out: they fan their wings, which moves air over the comb and helps the water evaporate. Simplification: bees also work droplets with their mouthparts to evaporate water, which the film does not show.",
         "source": "Mississippi State University Extension (as f1): 'The bees also reduce the water content of the nectar by rapidly beating or fanning their wings in the hive'; NC State News (as f1): 'fanning their wings, which creates airflow around the honeycomb and helps water evaporate'; University of Sussex LASI (as f1)."},
        {"id": "f8", "claim": f"Ripe honey holds about a fifth of its weight in water: about 17 % (LASI) or 18 % (MSU); the Codex standard allows at most 20 % for most honeys; Indonesian Apis mellifera honeys measured 17.5-22 % (the Indonesian standard, SNI, allows up to 22 %). The voice says 'sekitar seperlima'; the screen says 'air ±20 %'. Worked example: {NECTAR:.0f} g of nectar at {SUGAR:.0f} % sugar holds {SUGAR:.0f} g of sugar and {NECTAR - SUGAR:.0f} g of water; at 20 % water the honey weighs {SUGAR:.0f} / 0.8 = {HONEY:.0f} g ({SUGAR:.0f} g sugar + {HONEY - SUGAR:.0f} g water), so {EVAPORATED:.0f} g of water evaporated. The s12 columns at {PX} px a gram: {COL_NECTAR:.0f} px (water {(NECTAR - SUGAR) * PX:.0f}, sugar {BAND_SUGAR:.0f}) and {COL_HONEY:.0f} px (water {(HONEY - SUGAR) * PX:.0f}, sugar {BAND_SUGAR:.0f}).",
         "source": "University of Sussex LASI (as f1): 'approximately 83% sugar and 17% water'; Mississippi State University Extension: 'around 18 percent'; Codex Alimentarius, Standard for Honey CXS 12-1981 (Rev. 2001), 3.4 Moisture content: 'Honeys not listed below - not more than 20%'; Rosyidah et al., BIOTROPIA 31(1) 2024 (as f2): water content 17.50-22.00 %, kaliandra honey 22.00 %, 'determined by SNI'. The arithmetic is in storyboard.build.py."},
        {"id": "f9", "claim": "When the nectar has ripened into honey, the bees cap the cell with a wax seal.",
         "source": "NC State News (as f1): 'the processor bees \"cap\" the cell with an airtight wax seal'; University of Sussex LASI (as f1): 'The cell is then capped with wax'."},
        {"id": "f10", "claim": "Ripe honey contains so little water and so much sugar that yeasts and other microbes cannot grow in it, so it keeps; but honey takes up moisture from the air, so it must stay sealed (capped in the comb, the lid on the jar), and honey with too much water can ferment. On screen: 'awet, asal tertutup rapat' and 'air sedikit: mikroba susah tumbuh'.",
         "source": "NC State News (as f1): 'it contains so little water that no microbes can grow in it ... If the cap is not airtight, the honey will absorb moisture ... why it's important to screw the lid back on your jar of honey'; University of Sussex LASI (as f1): 'too concentrated for yeasts and other microorganisms to grow'; Rosyidah et al. 2024 (as f2) on fermentation of honey with high water content."},
    ],
    "acts": [
        {"id": "hook", "title": "Pertanyaan", "goal": "Thick honey, thin nectar: how does one become the other?", "rail": False},
        {"id": "nektar", "title": "Nektar", "goal": "Nectar is mostly water; the bee drinks it into its honey stomach.", "rail": False},
        {"id": "enzim", "title": "Enzim", "goal": "The bee's enzyme cuts each sugar into two smaller sugars.", "rail": False},
        {"id": "sarang", "title": "Di sarang", "goal": "Mouth to mouth to a house bee, then into the wax cells.", "rail": False},
        {"id": "kering", "title": "Dikeringkan", "goal": "Fanning dries it from four fifths water to one fifth; ripe, it is capped and keeps.", "rail": False},
        {"id": "recap", "title": "Jawaban", "goal": "Nectar, enzyme, fanning: honey. Then the bridge into the first line.", "rail": False},
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
