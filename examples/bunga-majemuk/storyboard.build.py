"""Writes storyboard.json for "Kok uang bisa beranak? Gimana bunga majemuk bekerja?" (landscape, 1920 x 1080).

The film has no narration: the script is shown as captions (landscape pill subtitles). This script writes the plan:
the shots, each with its run of the script as its caption, and its drawn frames. A shot lasts as long as its caption
takes to read (0.5 s + characters / 15), rounded up to the music's half beat, so every cut sits on the grid:

    python3 examples/bunga-majemuk/storyboard.build.py && node kit/tools/storyboard.mjs examples/bunga-majemuk --png

Every drawn quantity is computed: one coin is Rp1 juta, a tenth of a coin (a thin slice) is the 10% each coin earns
in a year; the chart's lines are 10 + t (simple) and 10 x 1,1^t (compound) on the same axes; the doubling ladder's
corners sit on the curve at t = k x ln 2 / ln 1,1 (7,27 years a step). film.js uses the same numbers (CHART below).
"""
import json
import math
import re
from pathlib import Path

HERE = Path(__file__).parent
shots = []


BEAT = 0.697674
HALF = BEAT / 2
halves = [0]


def plain(text):
    return re.sub(r"\s+", " ", (text or "").replace("*", "")).strip()


def shot(id, act, type, length=None, read=0, **fields):
    """A shot lasts as long as its caption takes to read (or `read` seconds, for lettering in the picture), at least
    `length` when its picture needs longer, rounded up to the half beat."""
    caption = fields.get("caption")
    need = max(0.5 + len(plain(caption)) / 15 if caption else 0, read, length or 0)
    n = 2 * math.ceil(need / BEAT - 1e-6)  # whole beats: cuts on the grid
    start, end = halves[-1] * HALF, (halves[-1] + n) * HALF
    halves.append(halves[-1] + n)
    shots.append({"id": id, "act": act, "type": type, "start": round(start, 3), "end": round(end, 3), **fields, "frames": FRAMES[id]})


def fr(at, note, *draw):
    return {"at": at, "note": note, "draw": list(draw)}


# ── Coins, drawn the way the 3D camera sees them: tilted, so the top face is an ellipse a third as tall as wide ──
R = 120  # a coin's radius on screen at the stack's framing
T = 26  # its thickness on screen
RY = 0.33


def coin(x, top, r=R, t=T, colour="orange", width=6):
    """One coin, its top face centred at (x, top)."""
    ry = r * RY
    return {"path": f"M{x - r} {top} A{r} {ry:.0f} 0 1 0 {x + r} {top} A{r} {ry:.0f} 0 1 0 {x - r} {top} M{x - r} {top} L{x - r} {top + t} A{r} {ry:.0f} 0 0 0 {x + r} {top + t} L{x + r} {top}",
            "colour": colour, "width": width}


def stack(x, base, n, r=R, t=T, colour="orange"):
    """n coins standing on base (the bottom of the lowest coin's edge, at its front)."""
    top = base - t - (n - 1) * t
    ry = r * RY
    seams = " ".join(f"M{x - r} {top + t * k} A{r} {ry:.0f} 0 0 0 {x + r} {top + t * k}" for k in range(1, n))
    out = [coin(x, top, r, n * t, colour)]
    if seams:
        out.append({"path": seams, "colour": colour, "width": 3})
    return out


def slices(x, base, n, dx, colour="yellow"):
    """The thin tenth each coin of a stack earns, slid dx to the right of its coin."""
    return [{"line": [x + dx - R * 0.8, base - T * k - T * 0.5, x + dx + R * 0.8, base - T * k - T * 0.5], "colour": colour, "width": 7} for k in range(n)]


def label(x, y, text, size=46, **more):
    return {"label": [x, y], "text": text, "size": size, **more}


# ── The chart (film.js reads the same numbers) ───────────────────────────────────────────────────────────────
X0, X1, Y0, Y1 = 300, 1480, 840, 170
DOUBLE = math.log(2) / math.log(1.1)  # 7,27 years


def px(t, v, xmax=30, ymax=180):
    return [round(X0 + (X1 - X0) * t / xmax, 1), round(Y0 - (Y0 - Y1) * v / ymax, 1)]


def simple(t):
    return 10 + t


def compound(t):
    return 10 * 1.1**t


def line_of(f, t1, xmax=30, ymax=180, colour="blue", width=9):
    n = 40
    return {"curve": [px(t1 * i / n, f(t1 * i / n), xmax, ymax) for i in range(n + 1)], "colour": colour, "width": width}


def axes(xmax=30, ymax=180):
    return {"axes": [X0, Y0, X1 - X0, Y0 - Y1], "xlabel": f"tahun (0 sampai {xmax})", "ylabel": f"Rp juta (0 sampai {ymax})"}


LADDER = []
for k in range(4):
    a, b = k * DOUBLE, (k + 1) * DOUBLE
    LADDER += [px(a, 10 * 2**k), px(b, 10 * 2**k), px(b, 10 * 2 ** (k + 1))]
LADDER_DRAW = {"curve": LADDER, "colour": "orange", "width": 6}

# The skyline of s14: a column of coins for every year, 0 to 30, its height computed (4 px a juta).
SKY_X0, SKY_STEP, SKY_BASE, SKY_PX = 300, 40, 900, 3.9


def skyline(upto=30, colour="orange"):
    out = []
    for y in range(upto + 1):
        h = compound(y) * SKY_PX
        x = SKY_X0 + y * SKY_STEP
        out.append({"bar": [x - 15, SKY_BASE, 30, round(h, 1)], "colour": colour})
    return out


Q1, Q2 = "Kok uang yang disimpan", "bisa beranak sendiri?"
HOOK = stack(1400, 900, 10)
STACK_X, BASE = 820, 860
POKOK = stack(STACK_X, BASE, 10)
NOTE = label(960, 96, "10% cuma contoh ilustrasi, bukan janji imbal hasil produk apa pun", 30, colour="white")
NOTE_LOW = label(960, 1010, "10% cuma contoh ilustrasi, bukan janji imbal hasil produk apa pun", 30, colour="white")
BUNGA_X = 1360
BLUE_X = 1660

FRAMES = {
    "s01": [
        fr(0.0, "Frame 0 is finished: a lit stack of ten gold coins on the right, the first line of the question already in metal type on the left, the light low and warm behind the stack.",
           *HOOK, {"label": [640, 190], "text": "BUNGA MAJEMUK", "size": 30}, {"glow": [1400, 720, 360], "colour": "orange"}, {"title": [640, 330], "text": Q1, "size": 100}, {"camera": "orbit", "text": "pelan"}),
        fr(0.5, "On 'beranak' a bright new coin is born from the top of the stack: it rises out of it, glowing, and the second line lands with 'beranak' in gold.",
           *HOOK, coin(1400, 560, colour="yellow"), {"move": [1400, 600, 1640, 800], "text": "koin baru lahir"}, {"glow": [1400, 580, 200], "colour": "yellow"},
           {"title": [640, 330], "text": f"{Q1}\n{Q2}", "size": 100, "accent": "beranak"}),
        fr(1.0, "The child coin has landed beside its stack with a soft ring on the floor; the question holds, the camera keeps orbiting.",
           *HOOK, coin(1660, 840, colour="yellow"), {"ring": [1660, 870, 150], "colour": "yellow", "dashed": True},
           {"title": [640, 330], "text": f"{Q1}\n{Q2}", "size": 100, "accent": "beranak"}, {"cut": "judul pergi, kamera ke tumpukan"}),
    ],
    "s02": [
        fr(0.0, "The question lifts away; the camera glides so the stack stands at x 820. The child coin is gone: we start from the beginning.",
           *POKOK, {"move": [1300, 700, 900, 700], "text": "kamera geser"}, {"camera": "left"}),
        fr(1.0, "The pokok is named: a bracket up the left side of the stack and 'Rp10 juta' in big type, with '1 koin = Rp1 juta' under it.",
           *POKOK, {"line": [660, 600, 660, 860]}, label(430, 520, "pokok", 50), {"number": [430, 650], "text": "Rp10 juta", "size": 96},
           label(430, 720, "1 koin = Rp1 juta", 34), {"cut": "tanpa potongan"}),
    ],
    "s03": [
        fr(0.0, "On 'bunganya': the chip 'bunga 10% / tahun' lands at the upper right, and the note about the 10% being an illustration sits low in the frame.",
           *POKOK, {"number": [430, 650], "text": "Rp10 juta", "size": 96}, {"chip": [1240, 300], "text": "bunga 10% / tahun"}, NOTE),
        fr(1.0, "Every coin grows a thin bright slice a tenth of its own thickness, pushed out of its right edge: the 10% each coin earns in a year. The coins themselves stay whole.",
           *POKOK, *slices(STACK_X, BASE, 10, 60), {"number": [430, 650], "text": "Rp10 juta", "size": 96}, {"chip": [1240, 300], "text": "bunga 10% / tahun"},
           label(1210, 470, "tiap koin: 1/10", 36), NOTE, {"cut": "tanpa potongan"}),
    ],
    "s04": [
        fr(0.0, "'Tahun pertama': a year chip at the top; the ten slices slide out of the stack, one after another.",
           *POKOK, *slices(STACK_X, BASE, 10, 220), {"chip": [890, 140], "text": "tahun 1"}, {"move": [960, 700, 1250, 760], "text": "10 irisan"}, {"camera": "push", "text": "sedikit"}),
        fr(0.6, "The ten slices stack beside the pile into exactly one coin (10 x 1/10): a bright gold coin with a glow, labelled 'bunga Rp1 juta'.",
           *POKOK, coin(BUNGA_X, BASE - T, colour="yellow"), {"glow": [BUNGA_X, 820, 160], "colour": "yellow"}, {"chip": [1250, 640], "text": "bunga Rp1 juta"}, {"chip": [890, 140], "text": "tahun 1"}),
        fr(1.0, "Held: pokok on the left still ten coins, bunga beside it, the brackets name both.",
           *POKOK, coin(BUNGA_X, BASE - T, colour="yellow"), {"chip": [1250, 640], "text": "bunga Rp1 juta"}, label(430, 520, "pokok", 50), {"chip": [890, 140], "text": "tahun 1"},
           {"cut": "koin bunga terangkat"}),
    ],
    "s05": [
        fr(0.0, "On 'ambil': the bunga coin lifts and slides right into a tray; as it goes it cools from gold to a blue-silver: interest taken out does not earn.",
           *POKOK, coin(1500, 760, colour="blue"), {"move": [BUNGA_X, 820, BLUE_X, 820], "text": "diambil"}, {"chip": [890, 140], "text": "tahun 1"}),
        fr(0.5, "The years run (2, 3, 4): each year the same ten slices make one more coin, and it goes to the blue pile. The pokok never changes.",
           *POKOK, *slices(STACK_X, BASE, 10, 260), *stack(BLUE_X, BASE, 3, colour="blue"), {"chip": [890, 140], "text": "tahun 3"}, {"chip": [1540, 520], "text": "+Rp1 juta / tahun"}),
        fr(1.0, "Year 5: five blue coins beside the ten gold ones. Key phrase in the caption pill: 'bunga diambil'.",
           *POKOK, *stack(BLUE_X, BASE, 5, colour="blue"), {"chip": [890, 140], "text": "tahun 5"}, {"chip": [1540, 520], "text": "+Rp1 juta / tahun"},
           {"card": [710, 950, 500, 80], "label": "bunga diambil"}, {"cut": "whip ke grafik"}),
    ],
    "s06": [
        fr(0.0, "A whip to the chart: axes for 30 years and up to Rp180 juta, a blue dot at Rp10 juta on year 0.",
           axes(), {"dot": px(0, 10) + [12], "colour": "blue"}, label(X0 - 40, px(0, 10)[1] + 14, "10", 34, align="end"), {"camera": "right", "text": "whip"}),
        fr(0.5, "The blue line is drawn by the year: Rp1 juta more every year, a straight line.",
           axes(), line_of(simple, 15), {"dot": px(15, 25) + [12], "colour": "blue"}, label(px(15, 25)[0], px(15, 25)[1] - 40, "+1 / tahun", 36, colour="blue")),
        fr(1.0, "At year 30 it ends at Rp40 juta: a blue tag 'Rp40 juta'.",
           axes(), line_of(simple, 30), {"chip": [px(30, 40)[0] + 20, px(30, 40)[1]], "text": "Rp40 juta"}, {"cut": "whip kembali ke koin"}),
    ],
    "s07": [
        fr(0.0, "Back at the coins, year 1 again: ten gold coins and the newborn bunga coin beside them, gold.",
           *POKOK, coin(BUNGA_X, BASE - T, colour="yellow"), {"chip": [890, 140], "text": "tahun 1"}, {"camera": "left", "text": "whip"}),
        fr(0.55, "On 'biarkan' the bunga coin hops onto the top of the stack instead of leaving.",
           *POKOK, coin(1090, 520, colour="yellow"), {"move": [BUNGA_X, 800, STACK_X + 60, 560], "text": "gabung"}, {"chip": [890, 140], "text": "tahun 1"}),
        fr(1.0, "It sits on top: eleven coins, the top one still bright so we can follow it. The bracket now reads 'pokok + bunga, Rp11 juta'. Caption: 'bunga gabung ke pokok'.",
           *stack(STACK_X, BASE, 10), coin(STACK_X, BASE - 11 * T, colour="yellow"), label(430, 520, "pokok + bunga", 46), {"number": [430, 650], "text": "Rp11 juta", "size": 96},
           {"card": [660, 950, 600, 80], "label": "bunga gabung ke pokok"}, {"cut": "kamera maju"}),
    ],
    "s08": [
        fr(0.0, "'Tahun depan': the camera pushes in on the stack of eleven; year chip 'tahun 2'.",
           *stack(STACK_X, BASE, 10), coin(STACK_X, BASE - 11 * T, colour="yellow"), {"chip": [890, 140], "text": "tahun 2"}, {"camera": "push"}),
        fr(0.45, "All eleven coins grow their tenth. The slice from last year's bunga coin (the top one) burns white-gold and has its own label: 'bunga dari bunga, Rp0,1 juta'.",
           *stack(STACK_X, BASE, 10), coin(STACK_X, BASE - 11 * T, colour="yellow"), *slices(STACK_X, BASE, 10, 220), {"line": [1100, BASE - 10.5 * T, 1300, BASE - 10.5 * T], "colour": "red", "width": 9},
           label(1420, 520, "bunga dari bunga", 44, colour="red"), label(1420, 570, "Rp0,1 juta", 40, colour="red"), {"chip": [890, 140], "text": "tahun 2"}),
        fr(1.0, "The eleven slices have flown right and stack at x 1360, the bright one last, on top.",
           *stack(STACK_X, BASE, 10), coin(STACK_X, BASE - 11 * T, colour="yellow"), *slices(BUNGA_X, BASE, 10, 0), {"line": [BUNGA_X - 100, BASE - 10.5 * T, BUNGA_X + 100, BASE - 10.5 * T], "colour": "red", "width": 9},
           {"move": [1100, 600, 1300, 700], "text": "irisan terbang"}, {"chip": [890, 140], "text": "tahun 2"}, {"cut": "tanpa potongan"}),
    ],
    "s09": [
        fr(0.0, "The column of slices settles into one coin plus a thin extra slice on top.",
           *stack(STACK_X, BASE, 10), coin(STACK_X, BASE - 11 * T, colour="yellow"), coin(BUNGA_X, BASE - T, colour="yellow"),
           {"line": [BUNGA_X - 100, BASE - T - 4, BUNGA_X + 100, BASE - T - 4], "colour": "red", "width": 9}, {"chip": [890, 140], "text": "tahun 2"}),
        fr(1.0, "'bunga Rp1,1 juta': the thin extra slice pulses with a small ring, the child's child.",
           *stack(STACK_X, BASE, 10), coin(STACK_X, BASE - 11 * T, colour="yellow"), coin(BUNGA_X, BASE - T, colour="yellow"),
           {"line": [BUNGA_X - 100, BASE - T - 4, BUNGA_X + 100, BASE - T - 4], "colour": "red", "width": 9}, {"ring": [BUNGA_X, BASE - 30, 140], "colour": "red", "dashed": True},
           {"chip": [1250, 640], "text": "bunga Rp1,1 juta"}, {"chip": [890, 140], "text": "tahun 2"}, {"cut": "whip ke grafik"}),
    ],
    "s10": [
        fr(0.0, "The chart again, close on the first five years (0 to 5 years, 0 to Rp20 juta). The blue line is there; the gold curve starts beside it.",
           axes(5, 20), line_of(simple, 5, 5, 20), line_of(compound, 1, 5, 20, colour="orange"), {"camera": "push", "text": "zoom 5 tahun"}),
        fr(0.6, "The gold curve is drawn to year 5, hugging the blue line: the gap at year 5 is a hair, Rp1,1 juta (16,1 vs 15). Little chips on the gold line give each year's interest: +1 / +1,1 / +1,21 / +1,33 / +1,46.",
           axes(5, 20), line_of(simple, 5, 5, 20), line_of(compound, 5, 5, 20, colour="orange"), {"bracket": [1500, 1500, px(5, 15.5, 5, 20)[1]], "text": "beda Rp1,1 jt"},
           label(px(1, 11, 5, 20)[0], px(1, 11, 5, 20)[1] - 50, "+1", 34, colour="orange"), label(px(3, 13.31, 5, 20)[0], px(3, 13.31, 5, 20)[1] - 50, "+1,21", 34, colour="orange"),
           label(px(5, 16.1, 5, 20)[0], px(5, 16.1, 5, 20)[1] - 50, "+1,46", 34, colour="orange")),
        fr(1.0, "On 'makin besar' the chips grow in size with their value, and the axes start to pull out.",
           axes(5, 20), line_of(simple, 5, 5, 20), line_of(compound, 5, 5, 20, colour="orange"), {"camera": "pull"}, {"cut": "tanpa potongan"}),
    ],
    "s11": [
        fr(0.0, "The axes pull out to 30 years and Rp180 juta; both lines shrink into the lower left, still together.",
           axes(), line_of(simple, 5), line_of(compound, 5, colour="orange"), {"camera": "pull"}),
        fr(1.0, "The gold curve is drawn on, year by year, and bends away upward from the straight blue line.",
           axes(), line_of(simple, 30), line_of(compound, 25, colour="orange"), {"move": [1200, 600, 1400, 300], "text": "melengkung"}, {"cut": "tanpa potongan"}),
    ],
    "s12": [
        fr(0.0, "The curve reaches year 30. A gold dot at its end.",
           axes(), line_of(simple, 30), line_of(compound, 30, colour="orange"), {"dot": px(30, 174.5) + [14], "colour": "orange"}),
        fr(0.5, "The two ends are named side by side: gold 'Rp174,5 juta', blue 'Rp40 juta', and a bracket between them '≈ 4,4×'.",
           axes(), line_of(simple, 30), line_of(compound, 30, colour="orange"), {"chip": [px(30, 174.5)[0] + 20, px(30, 174.5)[1]], "text": "≈ Rp174,5 juta"},
           {"chip": [px(30, 40)[0] + 20, px(30, 40)[1]], "text": "Rp40 juta"}, {"line": [1500, px(30, 160)[1], 1500, px(30, 50)[1]], "dashed": True}, label(1560, 450, "≈ 4,4×", 44)),
        fr(1.0, "Held with a 3 percent push; the blue line and its tag begin to dim for the next question.",
           axes(), line_of(simple, 30, width=4), line_of(compound, 30, colour="orange"), {"chip": [px(30, 174.5)[0] + 20, px(30, 174.5)[1]], "text": "≈ Rp174,5 juta"},
           {"camera": "push"}, {"cut": "garis biru meredup"}),
    ],
    "s13": [
        fr(0.0, "'Terus, kapan...': the blue line and the end tags dim. A dashed line leaves Rp20 juta on the axis (twice the Rp10 juta start) and runs right.",
           axes(), line_of(compound, 30, colour="orange"), {"line": [X0, px(0, 20)[1], px(DOUBLE, 20)[0], px(0, 20)[1]], "dashed": True}, label(X0 - 30, px(0, 20)[1] + 14, "20", 34, align="end")),
        fr(0.5, "On 'dua kali lipat' the dashed line has run across to the curve; the axis marks Rp10 juta and Rp20 juta.",
           axes(), line_of(compound, 30, colour="orange"), {"line": [X0, px(0, 20)[1], px(DOUBLE, 20)[0], px(0, 20)[1]], "dashed": True},
           label(X0 - 30, px(0, 20)[1] + 14, "20", 34, align="end"), label(X0 - 30, px(0, 10)[1] + 14, "10", 34, align="end"), {"move": [X0, px(0, 20)[1] - 30, px(DOUBLE, 20)[0], px(0, 20)[1] - 30]}),
        fr(1.0, "It meets the curve: a ring on the meeting point and a '×2 ?' tag above it.",
           axes(), line_of(compound, 30, colour="orange"), {"line": [X0, px(0, 20)[1], px(DOUBLE, 20)[0], px(0, 20)[1]], "dashed": True},
           {"ring": px(DOUBLE, 20) + [26], "colour": "orange"}, label(px(DOUBLE, 20)[0], px(DOUBLE, 20)[1] - 60, "×2 ?", 48), {"cut": "tanpa potongan"}),
    ],
    "s14": [
        fr(0.0, "The rule arrives at the upper left in metal type: '72 ÷ 10'.",
           axes(), line_of(compound, 30, colour="orange"), {"title": [720, 300], "text": "72 ÷ 10", "size": 110}),
        fr(0.5, "'≈ 7,2 tahun' lands under it; the ladder starts: from Rp10 juta across to the curve, up to Rp20 juta, '×2'.",
           axes(), line_of(compound, 30, colour="orange"), {"title": [720, 300], "text": "72 ÷ 10\n≈ 7,2 tahun", "size": 110, "accent": "7,2 tahun"},
           {"curve": LADDER[:3], "colour": "orange", "width": 6}, label(px(DOUBLE, 15)[0] + 50, px(DOUBLE, 15)[1], "×2", 40)),
        fr(1.0, "The ladder climbs four steps, each about seven years: 10, 20, 40, 80, 160. Year marks under the axis: ≈7, ≈14,5, ≈22, ≈29.",
           axes(), line_of(compound, 30, colour="orange"), {"title": [720, 300], "text": "72 ÷ 10\n≈ 7,2 tahun", "size": 110, "accent": "7,2 tahun"}, LADDER_DRAW,
           *[label(px(k * DOUBLE, 0)[0], Y0 + 50, f"≈{round(k * DOUBLE)}", 34) for k in range(1, 5)], {"cut": "grafik jadi tumpukan koin"}),
    ],
    "s15": [
        fr(0.0, "The chart becomes coins: under the gold curve, a column of gold coins stands at each year, its height that year's money (4 px a juta), rising left to right.",
           *skyline(10), {"camera": "orbit", "text": "pelan"}, {"move": [700, 700, 1300, 300], "text": "kolom tumbuh"}),
        fr(0.55, "All 31 columns stand: from 10 coins at year 0 to 174,5 at year 30. A faint blue line across marks where simple interest would be.",
           *skyline(30), {"curve": [[SKY_X0 + y * SKY_STEP, round(SKY_BASE - simple(y) * SKY_PX, 1)] for y in (0, 30)], "colour": "blue", "width": 5}),
        fr(1.0, "All the columns stand; the camera starts to travel right along them.",
           *skyline(30), {"camera": "right"}, {"cut": "tanpa potongan"}),
    ],
    "s16": [
        fr(0.0, "The camera travels right along the columns; the late years are the tall ones.",
           *[{"bar": [x, 960, 60, round(compound(21 + i) * 6.0, 1)], "colour": "orange"} for i, x in enumerate(range(240, 1700, 150))], {"camera": "right", "text": "dolly"}),
        fr(1.0, "It settles on the year-30 column, tilting up it: tag 'tahun 30 ≈ Rp174,5 juta'.",
           *[{"bar": [x, 960, 60, round(compound(21 + i) * 6.0, 1)], "colour": "orange"} for i, x in enumerate(range(240, 1700, 150))],
           {"chip": [1250, 120], "text": "tahun 30 ≈ Rp174,5 juta"}, {"camera": "up"}, {"cut": "poster turun di atasnya"}),
    ],
    "s17": [
        fr(0.0, "The poster: the columns dim behind; the line to remember in metal type, 'Bunga yang ikut berbunga.', three small glass cards underneath.",
           *skyline(30), {"title": [960, 300], "text": "Bunga yang ikut\nberbunga.", "size": 120, "accent": "berbunga."},
           {"card": [210, 600, 480, 220], "label": "pokok + bunga"}, {"card": [720, 600, 480, 220], "label": "Rp40 jt vs Rp174,5 jt"}, {"card": [1230, 600, 480, 220], "label": "72 ÷ bunga"}, NOTE_LOW),
        fr(0.4, "The three cards have risen one after another; a sheen crosses the title.",
           {"title": [960, 300], "text": "Bunga yang ikut\nberbunga.", "size": 120, "accent": "berbunga."},
           {"card": [210, 600, 480, 220], "label": "pokok + bunga"}, {"card": [720, 600, 480, 220], "label": "Rp40 jt vs Rp174,5 jt"}, {"card": [1230, 600, 480, 220], "label": "72 ÷ bunga"}, NOTE_LOW,
           {"move": [300, 980, 300, 860], "text": "kartu naik"}),
        fr(1.0, "It holds, breathing: a 3 percent push.",
           {"title": [960, 300], "text": "Bunga yang ikut\nberbunga.", "size": 120, "accent": "berbunga."},
           {"card": [210, 600, 480, 220], "label": "pokok + bunga"}, {"card": [720, 600, 480, 220], "label": "Rp40 jt vs Rp174,5 jt"}, {"card": [1230, 600, 480, 220], "label": "72 ÷ bunga"}, NOTE_LOW, {"camera": "push"}),
    ],
}

# ── Babak 1: pertanyaan ──────────────────────────────────────────────────────────────────────────────────────
shot("s01", "hook", "object3d",
     caption=False, read=3.4,
     teaches="Asks the one question the film answers, over the picture of it: a stack of coins giving birth to a new coin.",
     screen="Lower right: a stack of ten 3D gold coins (reeded edges, raised rims, an embossed face), base centre at (1400, 900), lit warm from the upper left with a soft contact shadow. Upper left: a small mono kicker 'BUNGA MAJEMUK' at y 190, then the question in metal type, 100 px, two lines centred on x 640 from y 330: 'Kok uang yang disimpan / bisa beranak sendiri?', 'beranak' in gold. The stack stands at (1400, 900). The lettering is the question, so the shot shows no caption pill.",
     motion="Frame 0 holds the stack and the first line, the camera already orbiting slowly. On 'beranak' a bright coin rises out of the top of the stack, arcs right and lands at (1660, 870) with a ring on the floor; the second line lands with the word. Light pulses warm on the birth.",
     carries="The stack of ten coins.",
     transition="The question lifts and fades; the camera glides left so the stack stands at x 820. The child coin fades: we start again from year 0.",
     sound="Music from frame 0, low. A soft light impact as the child coin lands, between the words.",
     check="The question is on screen and spoken inside two seconds. The child coin lands in the pause, not over the title.",
     facts=["f5"])

# ── Babak 2: bunga yang diambil ──────────────────────────────────────────────────────────────────────────────
shot("s02", "simple", "object3d",
     caption="Misalnya kamu simpan *Rp10 juta*,",
     teaches="The starting point: Rp10 juta of pokok, shown as ten coins, one coin per Rp1 juta.",
     screen="The stack of ten coins at x 820, base y 860, filling the middle height. Left of it a thin gold bracket up the stack, 'pokok' (50 px) above 'Rp10 juta' in big type (96 px) at x 430, and '1 koin = Rp1 juta' (34 px) under it.",
     motion="The camera glides in from the hook framing and settles with a slow push. The bracket draws up the stack, the label lands on 'sepuluh juta'.",
     carries="The stack and its label.",
     transition="No cut: the next line plays over the same stack.",
     sound="A small tick as the label lands.",
     check="Exactly ten coins. The label reads Rp10 juta, written the Indonesian way.",
     facts=["f1", "f5"])

shot("s03", "simple", "diagram",
     caption="bunganya *10%* setahun.",
     teaches="What 10% a year means for coins: every coin earns a tenth of itself in a year.",
     screen="Same stack. A glass chip 'bunga 10% / tahun' at the upper right (1240, 300). Each coin pushes out of its right edge a thin bright slice a tenth of its thickness (2,6 px of 26), like a card sliding out of a deck; the coins stay whole. A small label 'tiap koin: 1/10' beside the slices. At the top of the frame (y 96), 30 px, clear of the caption band: '10% cuma contoh ilustrasi, bukan janji imbal hasil produk apa pun'.",
     motion="The chip lands on 'bunganya'; on 'sepuluh persen' the ten slices slide out one after another from the bottom coin up, each with a glint. The note fades in under it.",
     carries="The ten slices, out to the right of the stack.",
     transition="No cut: the slices keep moving into the next shot.",
     sound="A light shimmer as the slices glint.",
     check="Ten slices, each a tenth of a coin's thickness. The coins do not get thinner. The note is readable (30 px) and inside the safe area.",
     facts=["f1", "f4", "f5"])

shot("s04", "simple", "macro",
     caption="Tahun pertama, bungamu *Rp1 juta*.",
     teaches="Ten tenths make one coin: the first year's bunga is Rp1 juta.",
     screen="A chip 'tahun 1' at the top centre. The ten slices fly from the stack to x 1360 and settle on each other into a column exactly one coin thick, which becomes a bright gold coin with a soft glow (the bunga colour: a paler, hotter gold than the pokok). A chip 'bunga Rp1 juta' above it.",
     motion="The slices travel in a short arc, stacking from the bottom; on the last one the column flashes and is a coin. The camera pushes 4 percent.",
     carries="The pokok stack and the new bunga coin beside it.",
     transition="No cut: the bunga coin is lifted in the next shot.",
     sound="A soft light impact when the coin forms.",
     check="The new coin is exactly as thick as one pokok coin. It is visibly a different, brighter gold than the pokok.",
     facts=["f1", "f5"])

shot("s05", "simple", "object3d",
     caption="Kalau bunga *diambil*, tiap tahun cuma nambah Rp1 juta.",
     teaches="Simple interest: when the interest is taken out, the pokok never grows, so every year pays the same Rp1 juta.",
     screen="The pokok stack stays at x 820. The bunga coin lifts and slides to a separate pile at x 1660, turning from gold to a cool blue-silver as it goes (blue means: taken out, does not earn). The year chip runs 1 to 5; each year ten slices leave the stack and form one more coin that goes to the blue pile. A chip '+Rp1 juta / tahun' above the blue pile. Caption pill: 'bunga diambil'.",
     motion="One year a second: slices out, coin formed, coin to the blue pile. The pokok never changes height. The stage light cools a little toward the blue pile.",
     carries="The blue pile, which becomes the blue line.",
     transition="A horizontal whip to the chart.",
     sound="A small tick each time a blue coin lands, kept between words where it can.",
     check="Ten gold coins throughout. Five blue coins at year 5. The colour change happens on the way, not before.",
     facts=["f1", "f5"])

shot("s06", "simple", "chart",
     caption="30 tahun lagi, totalnya *Rp40 juta*.",
     teaches="Taken out, the money grows in a straight line: Rp40 juta after 30 years.",
     screen="Chart filling the frame: axes from (300, 840) to (1480, 170); x 0 to 30 years ('tahun'), y Rp0 to Rp180 juta ('Rp juta'), gridlines every 5 years and Rp20 juta. A blue line from Rp10 juta at year 0 to Rp40 juta at year 30 (10 + t, drawn by the year). A blue tag 'Rp40 juta' at its end.",
     motion="Whip in. The blue line draws left to right as the caption reads, a dot at its head; the tag pops at year 30.",
     carries="The axes and the blue line.",
     transition="A whip back to the coins.",
     sound="A whoosh on the whip; a tick on the tag.",
     check="The line is straight and ends at exactly Rp40 juta on the axis. The axis starts at zero.",
     facts=["f1"])

# ── Babak 3: bunga yang berbunga ─────────────────────────────────────────────────────────────────────────────
shot("s07", "compound", "object3d",
     caption="Tapi kalau *dibiarkan*, bunga gabung ke pokok.",
     teaches="Compound interest: the interest stays and joins the money that earns.",
     screen="Back at the coins in year 1: ten gold coins at x 820 and the newborn bunga coin at x 1360. The bunga coin hops onto the top of the stack: eleven coins, the top one still the brighter bunga gold. The bracket and label become 'pokok + bunga', 'Rp11 juta'. Caption pill: 'bunga gabung ke pokok'.",
     motion="Whip in. On 'biarkan' the bunga coin lifts in an arc and lands on the stack with a small settle; the label swaps on one frame.",
     carries="The stack of eleven with its bright top coin.",
     transition="The camera pushes in.",
     sound="A whoosh on the whip, a soft impact as the coin lands on the stack.",
     check="Eleven coins; the top one is the bunga colour. The label reads Rp11 juta.",
     facts=["f2", "f5"])

shot("s08", "compound", "macro",
     caption="Tahun depan, bunga itu ikut *berbunga*.",
     teaches="The mechanism: next year every coin earns a tenth, including last year's interest, so the interest itself earns interest.",
     screen="Closer on the stack (1.15x). Year chip 'tahun 2'. All eleven coins push out their tenth; the one from the bunga coin on top is white-hot and labelled 'bunga dari bunga · Rp0,1 juta'. The eleven slices fly to x 1360 and stack there, the bright one on top.",
     motion="The slices slide out; the top slice flares and its label lands as 'berbunga' is read; then the slices fly and stack.",
     carries="The column of eleven slices.",
     transition="No cut: the column becomes a coin in the next shot.",
     sound="A shimmer on the bright slice.",
     check="Eleven slices. 'bunga dari bunga' points at the slice from the top coin.",
     facts=["f2", "f5"])

shot("s09", "compound", "object3d",
     caption="Anaknya beranak lagi.",
     teaches="The payoff of the mechanism: interest made by interest, a tenth of a coin from last year's coin.",
     screen="The eleven slices have settled at x 1360 into one bright coin plus one thin slice on top (white-hot, from last year's bunga). A chip above it: 'bunga Rp1,1 juta'. The stack of eleven stays at x 820.",
     motion="The column snaps into a coin with a glint; the thin slice pulses and a small ring spreads on the floor; the chip pops.",
     carries="The new bunga (Rp1,1 juta), as the gold curve's first step.",
     transition="A whip to the chart.",
     sound="A light impact as the Rp1,1 juta coin forms; a small sparkle on the pulse.",
     check="The thin slice is exactly a tenth of a coin's thickness and sits on top of a whole coin.",
     facts=["f2", "f5"])

shot("s10", "compound", "chart",
     caption="Awalnya bedanya tipis, tapi yang berbunga makin *besar*.",
     teaches="At first the two ways barely differ; but the amount earning interest grows every year.",
     screen="The chart, zoomed to the first five years (0 to 5 years, Rp0 to Rp20 juta). The blue line and the gold curve (10 x 1,1^t) start together at Rp10 juta and are a hair apart at year 5 (Rp16,1 vs Rp15 juta): a small bracket 'beda Rp1,1 jt'. Small gold chips on the gold curve name each year's interest: +1 · +1,1 · +1,21 · +1,33 · +1,46.",
     motion="The gold curve draws to year 5 on 'tipis'; the chips pop on it one by one, each a little larger, on 'makin besar'. Then the axes start to pull out.",
     carries="Both lines, as the axes pull out.",
     transition="No cut: the axes rescale into the next shot.",
     sound="Four small ticks as the chips pop, low.",
     check="At year 5 the gold curve is at 16,1 and the blue at 15 on the zoomed axis. The chips' values are 10% of the year before's total.",
     facts=["f2"])

shot("s11", "compound", "chart",
     caption="Makanya garisnya *melengkung* naik,",
     teaches="Because the base grows, the growth grows: the line curves upward.",
     screen="The axes pull out to 30 years and Rp180 juta: the two lines shrink into the lower left together, then the gold curve draws on from year 5 to year 30 and bends away up from the straight blue line.",
     motion="The axes rescale smoothly (the lines are recomputed each frame, never stretched). The gold head travels with a glow; the stage light follows it up and right.",
     carries="Both lines, the gold one rising.",
     transition="No cut: the full chart carries on.",
     sound="A soft rising air as the curve climbs (no riser).",
     check="The gold curve stays above the blue one and both are computed on the same axes.",
     facts=["f2"])

shot("s12", "compound", "compare",
     caption="sampai hampir *Rp175 juta*.",
     teaches="The end of the comparison: about Rp174,5 juta against Rp40 juta, from the same Rp10 juta and the same 10%.",
     screen="The full chart. Gold tag '≈ Rp174,5 juta' at the curve's end (1500, 177), blue tag 'Rp40 juta' at the line's end (1500, 689). A dashed bracket between the two ends: '≈ 4,4×'.",
     motion="The gold dot lands at year 30 with a hit; the tag pops; the bracket draws down; the camera pushes 3 percent.",
     carries="The gold curve.",
     transition="The blue line and tags dim; the gold curve stays.",
     sound="The main hit as the gold tag lands, between the words.",
     check="The tags are at their computed positions and inside the safe area.",
     facts=["f1", "f2"])

# ── Babak 4: aturan 72 ───────────────────────────────────────────────────────────────────────────────────────
shot("s13", "rule72", "diagram",
     caption="Terus, kapan jadi *dua kali lipat*?",
     teaches="The new question: how long until the money doubles.",
     screen="The chart with only the gold curve lit. A dashed line from Rp20 juta on the axis (twice the start) runs right until it meets the curve at year 7,27; a ring there and a tag '×2 ?'.",
     motion="The dashed line draws on 'dua kali lipat'; the ring pops where it meets the curve.",
     carries="The meeting point: the first step of the ladder.",
     transition="No cut: the ladder grows from the ring.",
     sound="A tick as the ring pops.",
     check="The meeting point is on the curve at year 7,27.",
     facts=["f3"])

shot("s14", "rule72", "type",
     caption="Bagi 72 dengan bunganya: kira-kira *7 tahun*.",
     teaches="The rule of 72: 72 divided by the yearly rate is about the years it takes to double.",
     screen="Top left inside the chart, metal type 110 px: '72 ÷ 10' and under it '≈ 7,2 tahun' in gold. A gold ladder climbs the curve: across from Rp10 juta to year 7,27, up to Rp20 juta ('×2'), and so on to 40, 80 and Rp160 juta; marks under the axis: ≈7, ≈15, ≈22, ≈29. Caption pill: 'aturan 72'.",
     motion="'72 ÷ 10' types in on 'tujuh puluh dua'; '≈ 7,2 tahun' slams in on 'tujuh tahun'; the ladder climbs step by step with it, each '×2' popping as its riser is drawn.",
     carries="The gold curve and its ladder.",
     transition="The chart turns into coins: columns rise under the curve.",
     sound="A small tick on each '×2'.",
     check="Every step doubles exactly and its corner sits on the curve. '≈ 7,2' is the rule's estimate; the steps are at the true 7,27 years.",
     facts=["f3"])

# ── Babak 5: jawaban dan poster ──────────────────────────────────────────────────────────────────────────────
shot("s15", "answer", "wide",
     caption="Jadi uang beranak karena bunganya *berbunga*,",
     teaches="The answer: money grows on itself because the interest earns interest, and time is what makes it large.",
     screen="3D: under the place where the curve was, 31 columns of stacked gold coins, one per year from 0 to 30 at x 300 to 1500, each as tall as that year's money (3,9 px a juta: 39 px at year 0, 680 px at year 30), reeded edges catching the light. A faint blue line across marks the simple-interest heights. A tag 'tahun 30 ≈ Rp174,5 juta' near the tallest column.",
     motion="The columns grow in from left to right, each to its height, as the camera orbits low and slow. The light sweeps across the tops.",
     carries="The columns.",
     transition="No cut: the camera travels on along the columns.",
     sound="A soft whoosh as the columns rise.",
     check="Column heights follow 10 x 1,1^t exactly; the last one is 4,4 times the blue line's end.",
     facts=["f2", "f5"])

shot("s16", "answer", "object3d",
     caption="asal dikasih *waktu*.",
     teaches="Time is the ingredient: the tallest columns are the late years.",
     screen="The camera has travelled right and turned a little: all 31 columns rise from the lower left to the year-30 column at x 1240, whose top nearly reaches the top of the frame; the tag 'tahun 30 ≈ Rp174,5 juta' sits just left of its top (900, 150). The faint blue line of simple interest crosses the columns low.",
     motion="A slow lateral dolly to the right and a tilt up the tallest column; the light sweeps across the tops.",
     carries="The columns, which stay behind the poster.",
     transition="The columns dim and the poster lands over them.",
     sound="Nothing new: the music carries it.",
     check="The tallest column is whole inside the frame; the tag does not cover it.",
     facts=["f2", "f5"])

shot("s17", "recap", "recap", 3.4,
     teaches="The line to remember and the three ideas in one frame.",
     screen="The columns dimmed behind. Line to remember in metal type, 120 px, centred at y 300: 'Bunga yang ikut / berbunga.', 'berbunga.' in gold. Under it three glass cards (480 x 220): a small coin stack with a bright top coin, 'pokok + bunga ikut berbunga'; a straight blue line and a gold curve, 'Rp40 jt vs ≈ Rp174,5 jt'; '72 ÷ bunga ≈ tahun jadi 2×'. At the bottom, 30 px: the note that 10% is an illustration and not a promise.",
     motion="The title lands line by line, the cards rise one after another in the first 0.6 s, a sheen crosses the title; then everything holds for two seconds with a 3 percent push.",
     carries="Nothing: the film ends here.",
     transition="End: the film holds on the poster.",
     sound="A soft low impact under the title, the music fades over the last 1.8 s.",
     check="Readable for at least two seconds. Every figure matches the fact sheet.",
     facts=["f1", "f2", "f3", "f4"])

duration = shots[-1]["end"]

storyboard = {
    "title": "Kok uang bisa beranak? Gimana bunga majemuk bekerja?",
    "question": "Kok uang yang disimpan bisa beranak sendiri? Gimana bunga majemuk bekerja?",
    "audience": "Anak muda Indonesia umur dua puluhan yang baru mulai menabung. Mereka tahu tabungan dapat bunga, tapi belum pernah melihat kenapa bunga majemuk tumbuh melengkung, dan belum kenal aturan 72.",
    "promise": "Dengan bunga majemuk, bunganya ikut berbunga, jadi uang tumbuh melengkung ke atas, bukan lurus; dan aturan 72 (72 dibagi bunga per tahun) kira-kira memberi tahu berapa tahun uang jadi dua kali lipat.",
    "language": "id",
    "format": "1920x1080",
    "duration": round(duration, 3),
    "fps": 60,
    "poster": round(shots[-1]["start"] + 1.6, 2),
    "look": {
        "accent": "#f4b740",
        "accent2": "#6fb6ff",
        "mood": "A dark graphite stage with warm gold light: 3D gold coins (reeded edges, raised rims, embossed faces) under a studio light, soft contact shadows on the floor. Gold is money that earns; a paler, hotter gold marks bunga; a cool blue-silver marks interest taken out (simple interest), the same blue as the straight line on the chart. The stage light is warm over the coins, cools toward the blue pile, follows the gold curve up and right, and settles warm behind the poster.",
    },
    "music": {
        "track": "Xceed Thru Johann (Mixkit 556)",
        "bpm": 86,
        "beat": 0.697674,
        "offset": 0,
        "start": 0.679,
        "note": "A calm 86 BPM bed that rises slowly, started 0.679 s in so a beat falls on frame 0. Every shot length is a whole number of half beats, so every cut is on the grid. At -18 LUFS: there is no voice to make room for.",
    },
    "facts": [
        {"id": "f1", "claim": "Simple interest (bunga diambil tiap tahun): 10% of Rp10 juta = Rp1 juta a year, every year, because the pokok never changes. After 30 years: 10 + 30 x 1 = Rp40 juta in all (the Rp10 juta pokok plus Rp30 juta taken out). Drawn as the line 10 + t.",
         "source": "Definition of simple interest (interest on the principal only), e.g. Investor.gov (US SEC), Compound Interest Calculator and glossary; arithmetic done here."},
        {"id": "f2", "claim": "Compounded once a year (bunga dibiarkan): the balance after t years is 10 x 1,1^t juta. Year 1: 11. Year 2's interest: 0,1 x 11 = 1,1 juta = 1 (from the pokok) + 0,1 (from last year's interest: 'bunga dari bunga'). Year 1 to 5 interest: 1; 1,1; 1,21; 1,331; 1,4641. Year 5: 16,11 vs 15 simple (gap 1,1). Year 30: 10 x 1,1^30 = 174,494 ≈ Rp174,5 juta (said 'hampir seratus tujuh puluh lima juta'). 174,5 / 40 = 4,36 ≈ 4,4×.",
         "source": "Compound interest formula A = P(1 + r)^n, e.g. Federal Reserve Bank of St. Louis, Open Vault, 'How Does Compound Interest Work?' (2018); arithmetic done here (Python)."},
        {"id": "f3", "claim": "Rule of 72: years to double ≈ 72 / yearly rate in percent. At 10%: 72 / 10 = 7,2 years (said 'kira-kira tujuh tahun'). The exact doubling time at 10% compounded yearly is ln 2 / ln 1,1 = 7,27 years, so the ladder's corners are drawn at 7,27; 14,55; 21,82; 29,09 years for Rp20, 40, 80 and 160 juta, and the marks under the axis are rounded (≈7, ≈15, ≈22, ≈29). The rule is an estimate, closest for rates around 6 to 10%.",
         "source": "Investor.gov (US SEC), glossary: 'Rule of 72'; Federal Reserve Bank of St. Louis, Open Vault (2018); exact time computed here."},
        {"id": "f4", "claim": "10% a year is an illustration chosen to make the arithmetic easy, not the return of any product; the film says so on screen. It ignores tax, fees, inflation and changing rates, and compounds once a year. The film teaches the mechanism and gives no financial advice.",
         "source": "The film's own framing; simplifications listed here."},
        {"id": "f5", "claim": "In the pictures one coin stands for Rp1 juta and a slice a tenth of a coin's thickness for Rp100 ribu (10% of one coin). Ten slices make one coin (year 1's Rp1 juta), eleven make 1,1 coins (year 2's Rp1,1 juta). The columns in s14 are 3,9 px per Rp1 juta: 39 px at year 0, 680,5 px at year 30.",
         "source": "Arithmetic from f1 and f2."},
    ],
    "acts": [
        {"id": "hook", "title": "Pertanyaan", "goal": "Ask the question over its picture: a stack of coins giving birth to a coin.", "rail": False},
        {"id": "simple", "title": "Bunga diambil", "goal": "Show the mechanism of interest on coins (each coin earns a tenth), then what happens when it is taken out: a straight line to Rp40 juta.", "rail": False},
        {"id": "compound", "title": "Bunga berbunga", "goal": "The turn: the interest joins the pile and earns too (bunga dari bunga), so the line curves up to about Rp174,5 juta.", "rail": False},
        {"id": "rule72", "title": "Aturan 72", "goal": "Turn the curve into a tool: 72 divided by the rate gives the years to double, drawn as a ladder on the curve.", "rail": False},
        {"id": "answer", "title": "Jawaban", "goal": "Answer the question in one line over the coins, then the poster.", "rail": False},
        {"id": "recap", "title": "Rangkuman", "goal": "The line to remember and the three ideas in one frame.", "rail": False},
    ],
    "shots": shots,
}

out = HERE / "storyboard.json"
out.write_text(json.dumps(storyboard, ensure_ascii=False, indent=2) + "\n")
print(f"{len(shots)} shots, {sum(len(s['frames']) for s in shots)} frames, {duration:.1f} s, cut on the beat -> {out}")
