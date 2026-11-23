"""Writes storyboard.json for "Kenapa a² + b² = c² selalu benar?" (landscape 1920 x 1080, the Chalkboard template).

The sample film of the Chalkboard template: a teacher's green board in a wooden frame, white chalk for everything,
yellow chalk for the point (the square on c) and blue chalk for the two pieces (the squares on a and b). The film is
cut to one take of narration, so the times here are a guess until the take retimes the board:

    python3 examples/pythagoras/storyboard.build.py && node kit/tools/storyboard.mjs examples/pythagoras --png

The proof is the rearrangement proof (NRICH, "Pythagoras Proofs", method 2): one square of side a + b holds four
copies of the right triangle twice; the first time the space left over is the tilted square on c, the second time it
is the squares on a and b. Every corner below is computed from the legs, not placed by eye: the triangle is the
3-4-5 triangle everywhere (the shape the counting uses), the two moves are translations by (-a, -b) and (-b, +a),
and the empty regions are checked to be a by a and b by b.

The board is one long board; the camera slides along it. Section A (the opening) is never drawn on after frame 0,
so the last shot can slide back to it and land on frame 0 exactly: the loop.
"""
import json
import math
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
shots = []

# ── The numbers ──────────────────────────────────────────────────────────────────────────────────────────────────
LEG_A, LEG_B = 3, 4
HYP = math.hypot(LEG_A, LEG_B)
assert HYP == 5 and LEG_A ** 2 + LEG_B ** 2 == HYP ** 2  # 9 + 16 = 25

# Chalk colours in the sketch: white chalk is the pencil's ink, yellow chalk the point (c²), blue chalk the pieces.
C_KEY, C_PIECE = "yellow", "blue"


# ── Drawing helpers (screen coordinates, 1920 x 1080; captions sit below y 940, the wooden frame is 34 px) ─────────
def fr(at, note, *draw):
    flat = []
    for d in draw:
        flat.extend(d if isinstance(d, list) else [d])
    return {"at": at, "note": note, "draw": flat}


def label(x, y, text, size=48, **more):
    return {"label": [round(x), round(y)], "text": text, "size": round(size), **more}


def poly(points, close=True, **more):
    d = "M" + " L".join(f"{x:.0f} {y:.0f}" for x, y in points) + (" Z" if close else "")
    return {"path": d, **more}


def rect(x, y, w, h, **more):
    return poly([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], **more)


def centroid(points):
    return (sum(p[0] for p in points) / len(points), sum(p[1] for p in points) / len(points))


def right_mark(x, y, sx, sy, s=22, **more):
    """The little square in a right angle at (x, y); sx, sy point into the triangle."""
    return {"path": f"M{x:.0f} {y + sy * s:.0f} h{sx * s:.0f} v{-sy * s:.0f}", "width": 4, **more}


def underline(x0, x1, y, colour=C_KEY):
    return {"path": f"M{x0:.0f} {y:.0f} C {x0 + (x1 - x0) * 0.3:.0f} {y + 6:.0f}, {x0 + (x1 - x0) * 0.7:.0f} {y - 4:.0f}, {x1:.0f} {y + 2:.0f}", "colour": colour, "width": 7}


# The classic figure: the right triangle with a square on each side. Right angle at (cx, cy); leg a (3u) goes up,
# leg b (4u) goes right; the square on c sits outside the hypotenuse.
def figure(cx, cy, u, names=("a", "b", "c"), squares=(True, True, True), grids=(False, False, False), counts=None, size=1.0):
    A = (cx, cy - LEG_A * u)
    B = (cx + LEG_B * u, cy)
    n = (LEG_A * u, -LEG_B * u)  # the outward normal of the hypotenuse, as long as it
    B2, A2 = (B[0] + n[0], B[1] + n[1]), (A[0] + n[0], A[1] + n[1])
    out = [poly([A, (cx, cy), B], width=7, fill="ink"), right_mark(cx, cy, 1, -1)]
    sa, sb, sc = squares
    if sa:
        out.append(rect(cx - LEG_A * u, cy - LEG_A * u, LEG_A * u, LEG_A * u, colour=C_PIECE, width=7))
    if sb:
        out.append(rect(cx, cy, LEG_B * u, LEG_B * u, colour=C_PIECE, width=7))
    if sc:
        out.append(poly([A, B, B2, A2], colour=C_KEY, width=7))
    ga, gb, gc = grids
    if ga:
        for k in range(1, LEG_A):
            out.append({"path": f"M{cx - LEG_A * u + k * u:.0f} {cy - LEG_A * u:.0f} V{cy:.0f} M{cx - LEG_A * u:.0f} {cy - LEG_A * u + k * u:.0f} H{cx:.0f}", "colour": C_PIECE, "width": 3})
    if gb:
        for k in range(1, LEG_B):
            out.append({"path": f"M{cx + k * u:.0f} {cy:.0f} V{cy + LEG_B * u:.0f} M{cx:.0f} {cy + k * u:.0f} H{cx + LEG_B * u:.0f}", "colour": C_PIECE, "width": 3})
    if gc:
        for k in range(1, int(HYP)):
            t = k / HYP
            p, q = (A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t), (A2[0] + (B2[0] - A2[0]) * t, A2[1] + (B2[1] - A2[1]) * t)
            r, s = (A[0] + n[0] * t, A[1] + n[1] * t), (B[0] + n[0] * t, B[1] + n[1] * t)
            out.append({"path": f"M{p[0]:.0f} {p[1]:.0f} L{q[0]:.0f} {q[1]:.0f} M{r[0]:.0f} {r[1]:.0f} L{s[0]:.0f} {s[1]:.0f}", "colour": C_KEY, "width": 3})
    if names:
        na, nb, nc = names
        out += [label(cx + 16 * size, cy - LEG_A * u * 0.42, na, 46 * size, align="start"),
                label(cx + LEG_B * u * 0.55, cy - 14 * size, nb, 46 * size),
                label(cx + LEG_B * u * 0.5 - 22 * size, cy - LEG_A * u * 0.5 + 30 * size, nc, 46 * size)]
    if counts:
        ka, kb, kc = counts
        if ka:
            out.append(label(cx - LEG_A * u / 2, cy - LEG_A * u / 2 + 22 * size, ka, 64 * size, colour=C_PIECE))
        if kb:
            out.append(label(cx + LEG_B * u / 2, cy + LEG_B * u / 2 + 22 * size, kb, 70 * size, colour=C_PIECE))
        if kc:
            ctr = ((A[0] + B2[0]) / 2, (A[1] + B2[1]) / 2)
            out.append(label(ctr[0], ctr[1] + 24 * size, kc, 74 * size, colour=C_KEY))
    return out


# ── Section A: the opening board, finished at frame 0 and never drawn on again ───────────────────────────────────────
FIG = dict(cx=530, cy=600, u=70)  # the square on c reaches up to y 110; the square on b down to y 880


def board_a():
    return [*figure(**FIG, counts=("a²", "b²", "c²")),
            label(1470, 220, "Kok bisa", 92), label(1470, 322, "selalu pas?", 92), underline(1290, 1520, 344),
            {"title": [1470, 560], "text": "a² + b² = c²", "size": 104}]


def board_a_view(k, fx, fy, sx=960, sy=500, underline_q=True):
    """Section A seen by a camera pushed in k times on board point (fx, fy), which lands at (sx, sy)."""
    tx, ty = sx - k * fx, sy - k * fy
    cx, cy, u = FIG["cx"] * k + tx, FIG["cy"] * k + ty, FIG["u"] * k
    out = figure(cx, cy, u, counts=("a²", "b²", "c²"), size=k)
    out += [label(1470 * k + tx, 220 * k + ty, "Kok bisa", 92 * k), label(1470 * k + tx, 322 * k + ty, "selalu pas?", 92 * k),
            {"title": [round(1470 * k + tx), round(560 * k + ty)], "text": "a² + b² = c²", "size": round(104 * k)}]
    if underline_q:
        out.append(underline(1290 * k + tx, 1520 * k + tx, 344 * k + ty))
    return out


# ── Section D: the proof. Two squares of side a + b, side by side ───────────────────────────────────────────────────
PU = 80
PA, PB = LEG_A * PU, LEG_B * PU  # 240, 320
PS = PA + PB  # 560
LX, RX, PY = 200, 1160, 130


def corners(x0, y0):
    """The four triangles round the tilted square (the first arrangement), each a list of three points."""
    S, A, B = PS, PA, PB
    return {
        1: [(x0, y0), (x0 + B, y0), (x0, y0 + A)],
        2: [(x0 + S, y0), (x0 + B, y0), (x0 + S, y0 + B)],
        3: [(x0 + S, y0 + S), (x0 + S, y0 + B), (x0 + A, y0 + S)],
        4: [(x0, y0 + S), (x0 + A, y0 + S), (x0, y0 + A)],
    }


def moved(x0, y0):
    """The second arrangement: triangles 1 and 4 stay; 3 slides by (-a, -b), 2 by (-b, +a)."""
    t = corners(x0, y0)
    t[3] = [(x - PA, y - PB) for x, y in t[3]]
    t[2] = [(x - PB, y + PA) for x, y in t[2]]
    return t


# The empty regions of the second arrangement: a square a x a at the top right, b x b at the bottom right.
A_SQ = (RX + PB, PY, PA, PA)
B_SQ = (RX + PA, PY + PA, PB, PB)
# Check: the moved triangles fill the square exactly around those two holes (areas add up to (a + b)²).
assert 4 * PA * PB / 2 + PA ** 2 + PB ** 2 == PS ** 2
assert sorted(moved(RX, PY)[3]) == sorted([(RX + PB, PY + PA), (RX + PB, PY), (RX, PY + PA)])
assert sorted(moved(RX, PY)[2]) == sorted([(RX + PA, PY + PA), (RX, PY + PA), (RX + PA, PY + PS)])


def tri(points, n=None, dashed=False):
    out = [poly(points, width=6, **({"dashed": True} if dashed else {"fill": "ink"}))]
    if n is not None:
        c = centroid(points)
        out.append(label(c[0], c[1] + 16, str(n), 42))
    return out


def tilted(x0, y0):
    S, A, B = PS, PA, PB
    return [(x0 + B, y0), (x0 + S, y0 + B), (x0 + A, y0 + S), (x0, y0 + A)]


def proof_left(numbers=True, middle=False, which=(1, 2, 3, 4), outline=True, sides=False):
    out = [rect(LX, PY, PS, PS, width=7)] if outline else []
    for n, pts in corners(LX, PY).items():
        if n in which:
            out += tri(pts, n if numbers else None)
    if middle:
        out += [poly(tilted(LX, PY), colour=C_KEY, fill=C_KEY, width=7), label(LX + PS / 2, PY + PS / 2 + 30, "c²", 84, colour=C_KEY)]
    if sides:
        out += [label(LX + PB / 2, PY - 18, "b", 46), label(LX + PB + PA / 2, PY - 18, "a", 46),
                label(LX - 34, PY + PA / 2 + 16, "a", 46), label(LX - 34, PY + PA + PB / 2 + 16, "b", 46),
                {"path": f"M{LX} {PY + PS + 34} V{PY + PS + 58} H{LX + PS} V{PY + PS + 34}", "width": 5},
                label(LX + PS / 2, PY + PS + 112, "a + b", 52)]
    return out


def proof_right(stage):
    """stage 0: outline, 1 and 4, ghosts of 2 and 3; 1: arrows; 2: 2 and 3 moved; 3: the two squares lit."""
    t0, t1 = corners(RX, PY), moved(RX, PY)
    out = [rect(RX, PY, PS, PS, width=7)] + tri(t0[1], 1) + tri(t0[4], 4)
    if stage <= 1:
        out += tri(t0[2], 2, dashed=True) + tri(t0[3], 3, dashed=True)
    if stage == 1:
        for n in (2, 3):
            a, b = centroid(t0[n]), centroid(t1[n])
            out.append({"move": [round(a[0]), round(a[1]), round(b[0]), round(b[1])]})
        out.append(label(RX + PS / 2, PY - 20, "3 dulu, lalu 2: cuma digeser", 40))
    if stage >= 2:
        out += tri(t1[2], 2) + tri(t1[3], 3)
    if stage >= 3:
        out += [rect(*A_SQ, colour=C_PIECE, fill=C_PIECE, width=7), label(A_SQ[0] + PA / 2, PY + PA / 2 + 26, "a²", 74, colour=C_PIECE),
                rect(*B_SQ, colour=C_PIECE, fill=C_PIECE, width=7), label(B_SQ[0] + PB / 2, B_SQ[1] + PB / 2 + 28, "b²", 84, colour=C_PIECE)]
    return out


XTRI = [poly([(1300, 500), (1300, 500 - PA), (1300 + PB, 500)], width=7, fill="ink"), label(1730, 420, "× 4", 80)]  # the triangle 'x 4', on the board from s11 to s13


# ── Section E: the same proof for other right triangles (mini), then the recap ──────────────────────────────────────
def mini_pair(x0, y0, s, a, b, gap=40):
    """Both arrangements, side by side, for a right triangle with legs a (vertical in corner 1) and b."""
    def corner_tris(x, y):
        return [[(x, y), (x + b, y), (x, y + a)], [(x + s, y), (x + b, y), (x + s, y + b)],
                [(x + s, y + s), (x + s, y + b), (x + a, y + s)], [(x, y + s), (x + a, y + s), (x, y + a)]]
    left = [rect(x0, y0, s, s, width=5)] + [poly(t, width=4, fill="ink") for t in corner_tris(x0, y0)]
    left.append(poly([(x0 + b, y0), (x0 + s, y0 + b), (x0 + a, y0 + s), (x0, y0 + a)], colour=C_KEY, fill=C_KEY, width=5))
    x1 = x0 + s + gap
    t = corner_tris(x1, y0)
    t[2] = [(x - a, y - b) for x, y in t[2]]
    t[1] = [(x - b, y + a) for x, y in t[1]]
    right = [rect(x1, y0, s, s, width=5)] + [poly(p, width=4, fill="ink") for p in t]
    right += [rect(x1 + b, y0, a, a, colour=C_PIECE, fill=C_PIECE, width=5), rect(x1 + a, y0 + a, b, b, colour=C_PIECE, fill=C_PIECE, width=5)]
    return left + right


FLAT = (64, 296)  # a gepeng triangle: legs 64 and 296 px (a : b about 1 : 4.6), its square 360 px
TALL = (250, 110)  # a tinggi one: legs 250 and 110 px


def general(stage):
    out = []
    out += mini_pair(110, 150, FLAT[0] + FLAT[1], *FLAT)
    if stage >= 1:
        out += mini_pair(1010, 150, TALL[0] + TALL[1], *TALL)
    # each triangle itself, small, under its pair, with its right angle ringed
    out += [poly([(330, 720), (330, 720 - FLAT[0]), (330 + FLAT[1], 720)], width=6, fill="ink"), right_mark(330, 720, 1, -1),
            {"ring": [342, 708, 30], "colour": C_KEY, "width": 5}, label(480, 800, "gepeng", 46)]
    if stage >= 1:
        out += [poly([(1350, 790), (1350, 790 - TALL[0]), (1350 + TALL[1], 790)], width=6, fill="ink"), right_mark(1350, 790, 1, -1),
                {"ring": [1362, 778, 30], "colour": C_KEY, "width": 5}, label(1470, 800, "tinggi", 46)]
    if stage >= 2:
        tick = lambda x, y: {"path": f"M{x} {y - 20} l16 18 l30 -40", "colour": C_KEY, "width": 7}  # a drawn tick, not a glyph
        out += [label(460, 880, "c² = a² + b²", 54, colour=C_KEY), tick(640, 878), label(1450, 880, "c² = a² + b²", 54, colour=C_KEY), tick(1630, 878)]
    return out


def recap(stage):
    out = [rect(140, 220, 360, 360, colour=C_PIECE, width=8), label(320, 198, "a", 50), label(108, 416, "a", 50),
           label(320, 436, "a²", 110, colour=C_PIECE), label(320, 690, "a² = luas persegi", 54)]
    if stage >= 1:
        out += mini_pair(580, 220, 330, 142, 188, gap=120)
        out += [label(970, 420, "=", 100), label(970, 690, "persegi besar sama, 4 segitiga sama", 44), label(970, 760, "sisanya sama luas", 50)]
    if stage >= 2:
        out += [rect(1420, 330, 400, 170, width=7), label(1620, 446, "c² = a² + b²", 74, colour=C_KEY), label(1620, 600, "asal siku-siku", 54)]
    return out


# Section B: "kuadrat itu persegi".  Section C: the 3-4-5 triangle, counted.
def board_b(stage):
    out = [label(470, 520, "a²", 230, colour=C_PIECE)]
    if stage >= 1:
        out += [label(760, 500, "=", 150), rect(960, 190, 420, 420, colour=C_PIECE, width=8)]
    if stage >= 2:
        out += [label(1170, 170, "a", 56), label(926, 420, "a", 56), label(1640, 330, "persegi", 56), {"line": [1520, 340, 1390, 380], "width": 5}]
    if stage >= 3:
        out += [label(1170, 790, "luas = a × a", 104)]
    return out


def board_c(stage):
    """stage 1: the triangle 3-4-5; 2: the square on 3 counted; 3: on 4; 4: on 5 and the sum; 5: other triangles."""
    sq = (stage >= 2, stage >= 3, stage >= 4)
    cnt = ("9" if stage >= 2 else None, "16" if stage >= 3 else None, "25" if stage >= 4 else None)
    out = figure(**FIG, names=("3", "4", "5"), squares=sq, grids=sq, counts=cnt)
    if stage >= 2:
        out.append(label(1480, 230, "3 × 3 = 9", 72, colour=C_PIECE))
    if stage >= 3:
        out.append(label(1480, 340, "4 × 4 = 16", 72, colour=C_PIECE))
    if stage >= 4:
        out += [label(1480, 470, "9 + 16 = 25", 84), underline(1640, 1740, 492), label(1480, 570, "= 5 × 5", 72, colour=C_KEY)]
    if stage >= 5:
        out += [poly([(1180, 840), (1180, 790), (1450, 840)], width=6, fill="ink"), label(1500, 830, "?", 80),
                poly([(1600, 840), (1600, 660), (1690, 840)], width=6, fill="ink"), label(1740, 760, "?", 80)]
    return out


def triangle_close():
    """Section C, the camera pushed in on the bare triangle: legs 3 and 4 at 2 x scale."""
    cx, cy, u = 700, 760, 140
    return [poly([(cx, cy - 3 * u), (cx, cy), (cx + 4 * u, cy)], width=9, fill="ink"), right_mark(cx, cy, 1, -1, s=36),
            label(cx - 50, cy - 1.5 * u + 30, "3", 96), label(cx + 2 * u, cy + 90, "4", 96), label(cx + 2 * u + 50, cy - 1.5 * u - 20, "5", 96)]


# ── The script, cut into shots (one take; the take sets the times) ────────────────────────────────────────────────
def shot(id, act, type_, voice, **more):
    start = shots[-1]["end"] if shots else 0.0
    plain = voice.replace("*", "")
    length = more.pop("length", None) or max(1.3, round(len(plain) / 15.2 + 0.1, 2))  # the voiced examples ran at 13 to 15 characters a second
    shots.append({"id": id, "act": act, "type": type_, "start": round(start, 3), "end": round(start + length, 3), "voice": voice, **more})


SLIDE = "The camera slides right along the board to a clean section"

shot("s01", "hook", "wide", "Di segitiga *siku-siku* mana pun,",
     caption="segitiga *siku-siku*",
     teaches="Opens on the rule the viewer already knows, over the figure that it is about: a right triangle with a square on each side.",
     screen="The whole board, finished at frame 0: dark green chalkboard (#1f3b2d) with faint smudges of old chalk, a wooden frame round it. Left: a right triangle drawn in white chalk and lightly hatched (legs 3 and 4 in proportion, the right angle marked with a little square), a blue-chalk square on each leg labelled a² and b², a yellow-chalk square on the hypotenuse labelled c², sides lettered a, b, c. Right: 'Kok bisa / selalu pas?' in Cabin Sketch chalk lettering with 'selalu' underlined in yellow, and under it the formula 'a² + b² = c²' in large neat chalk figures.",
     motion="Frame 0 is the finished board (nothing half-drawn). The camera pushes in slowly (about 1.4x) toward the right angle; on 'siku-siku' the chalk taps the little square twice, leaving two puffs of dust.",
     carries="The figure and the formula on section A of the board.", transition="The camera slides right along the board to the formula.",
     sound="The quiet bed starts under the first word; two chalk taps on 'siku-siku'.",
     check="Frame 0 is complete and readable; the triangle is clearly right-angled; only white, yellow and blue chalk.", facts=["f1"],
     frames=[fr(0, "Frame 0: the finished board, the figure left, the question and the formula right.", board_a()),
             fr(0.55, "The camera pushes in toward the triangle.", board_a_view(1.2, 600, 560), {"camera": "push"}),
             fr(1, "Close on the right angle: two chalk taps on its little square.", board_a_view(1.45, 560, 560), {"dot": [960, 500, 10], "colour": "white"}, {"cut": "geser ke rumus"})])

shot("s02", "hook", "type", "a kuadrat tambah b kuadrat pasti sama dengan *c kuadrat*.",
     teaches="States the rule as the formula on the board, term by term.",
     screen="Section A, the camera on the formula 'a² + b² = c²' in large chalk figures (about 140 px high on screen); a² and b² in white with their blue squares just in view at left, c² in white.",
     motion="The camera slides right and steadies on the formula; as each term is said the chalk taps under it (a², b², then c²), a puff of dust each time. Nothing new is written: section A stays as frame 0 drew it.",
     carries="The formula.", transition="The camera pulls back to the whole board.",
     sound="Three soft chalk taps, one a term.", check="The formula is the largest thing on screen and reads at a glance.", facts=["f1"],
     frames=[fr(0, "Sliding right from the triangle to the formula.", board_a_view(1.3, 1000, 520), {"camera": "right"}),
             fr(0.45, "On the formula; the chalk taps under a² and b².", board_a_view(1.35, 1470, 520), {"dot": [720, 600, 9], "colour": "white"}, {"dot": [930, 600, 9], "colour": "white"}),
             fr(1, "On 'c kuadrat' the last tap, under c².", board_a_view(1.35, 1470, 520), {"dot": [1190, 600, 9], "colour": "white"}, {"cut": "kamera mundur"})])

shot("s03", "hook", "type", "Kok bisa *selalu* pas?",
     teaches="Asks the one question the film answers: why it always works.",
     screen="Section A again, whole: the figure, the question 'Kok bisa / selalu pas?' (selalu underlined in yellow) and the formula. The question is now the thing to read.",
     motion="The camera pulls back to the framing of frame 0 and rises a little to the question; the yellow underline under 'selalu' is retraced once by the chalk (the same line, no new mark).",
     carries="The figure, which the next section redraws as a square.", transition="The camera slides right to a clean section of the board.",
     sound="A light chalk scratch on 'selalu'.", check="Readable as a question in under a second; frame 0's framing is reached at the end.",
     frames=[fr(0, "Pulling back from the formula.", board_a_view(1.2, 1300, 480), {"camera": "pull"}),
             fr(1, "The whole board, the question in view: the same framing as frame 0.", board_a(), {"cut": "geser ke papan kosong"})])

shot("s04", "persegi", "diagram", "Rahasianya, kuadrat itu beneran *persegi*.",
     caption="kuadrat = *persegi*",
     teaches="The key idea: 'squared' is not just a number operation; a² is an actual square.",
     screen="Section B, a clean stretch of board. Left: 'a²' in blue chalk, very large (about 230 px). Middle: '='. Right: a blue-chalk square 420 px on a side, labelled 'persegi' with a leader line from the right.",
     motion=f"{SLIDE}. 'a²' is written on stroke by stroke; '=' follows; the square is drawn side by side, its four strokes at chalk speed; the leader and the word 'persegi' last.",
     carries="The square.", transition="Continuous: its sides get their letters.",
     sound="Chalk scratches for each stroke; a tap as the square closes.", check="The square really is square (420 x 420); a² and the square are the same blue.", facts=["f2"],
     frames=[fr(0, "Arriving at a clean section; 'a²' written large.", board_b(0), {"camera": "right"}),
             fr(0.5, "'=' and the square drawn on.", board_b(1), {"move": [960, 650, 1380, 650], "text": "digambar"}),
             fr(1, "The word 'persegi' with its leader.", board_b(2), {"cut": "tanpa potongan"})])

shot("s05", "persegi", "type", "a kuadrat itu *luas* persegi yang sisinya a.",
     caption="*luas* persegi",
     teaches="a² is the area of the square whose side is a.",
     screen="The same section: the blue square with 'a' on its top and left sides, and under it 'luas = a × a' in large chalk lettering (about 100 px).",
     motion="'luas = a × a' is written on as the voice says it; 'luas' gets a yellow underline on the word.",
     carries="The idea that a square's area is side times side.", transition="The camera slides right to a clean section; a triangle is drawn there.",
     sound="Chalk writing; a short underline scratch.", check="The lettering reads 'luas = a × a' and sits above y 940.", facts=["f2"],
     frames=[fr(0, "The square with its sides lettered a.", board_b(2)),
             fr(1, "'luas = a × a' written under it, 'luas' underlined in yellow.", board_b(3), underline(870, 1080, 812), {"cut": "geser ke segitiga 3-4-5"})])

shot("s06", "hitung", "diagram", "Coba segitiga *tiga, empat, lima*.",
     caption="segitiga *3-4-5*",
     teaches="A concrete case first: the right triangle with sides 3, 4 and 5.",
     screen="Section C, the camera close: one right triangle in white chalk, legs 3 (up) and 4 (along), hypotenuse 5, each side's number written beside it in large chalk numerals; the right angle marked.",
     motion=f"{SLIDE}. The three sides are drawn in turn (up, along, across) and each number is written as it is said.",
     carries="The 3-4-5 triangle.", transition="The camera pulls back as squares grow off its sides.",
     sound="Three strokes of chalk, three taps for the numbers.", check="The legs are drawn in the ratio 3 : 4 and the long side reads as 5.", facts=["f3"],
     frames=[fr(0, "A clean section; the first leg drawn.", {"path": "M700 760 V340", "width": 9}, label(650, 580, "3", 96), {"camera": "right"}),
             fr(0.5, "The second leg along the bottom: 4.", {"path": "M700 340 V760 H1260", "width": 9}, label(650, 580, "3", 96), label(980, 850, "4", 96), right_mark(700, 760, 1, -1, s=36)),
             fr(1, "The hypotenuse: 5. The triangle is whole.", triangle_close(), {"cut": "kamera mundur"})])

shot("s07", "hitung", "chart", "Persegi di sisi tiga isinya *sembilan* kotak,",
     caption="3 × 3 = *9* kotak",
     teaches="The square on the side 3 holds 9 unit squares.",
     screen="Pulled back: the 3-4-5 triangle at the same place and size as the opening figure. A blue-chalk square on the side 3 with a 3 x 3 grid inside, '9' in its middle; on the right of the board '3 × 3 = 9' in blue.",
     motion="The camera pulls back; the square is drawn off the side 3, then its grid lines, then the cells are counted with quick chalk ticks (1 to 9) and '9' is written; the sum on the right writes on.",
     carries="The triangle and its first square.", transition="Continuous: the next square grows off the side 4.",
     sound="Nine quick chalk ticks.", check="The grid is exactly 3 x 3 and each cell is the same size as a unit of the legs.", facts=["f3", "f2"],
     frames=[fr(0, "Pulled back: the triangle at the opening figure's size.", board_c(1), {"camera": "pull"}),
             fr(0.5, "The square on 3 drawn, its 3 x 3 grid.", figure(**FIG, names=("3", "4", "5"), squares=(True, False, False), grids=(True, False, False))),
             fr(1, "Counted: 9; '3 × 3 = 9' on the right.", board_c(2), {"cut": "tanpa potongan"})])

shot("s08", "hitung", "chart", "di sisi empat *enam belas*.",
     caption="4 × 4 = *16* kotak",
     teaches="The square on the side 4 holds 16.",
     screen="The same board: a blue-chalk square on the side 4 with a 4 x 4 grid, '16' in its middle; '4 × 4 = 16' added under '3 × 3 = 9' on the right.",
     motion="The square and its grid are drawn on; the count ticks run fast; '16' and the sum write on.",
     carries="Both small squares, counted.", transition="Continuous: the square on the long side follows.",
     sound="Sixteen fast ticks, almost a roll.", check="4 x 4 grid; cells the same size as in the square on 3.", facts=["f3"],
     frames=[fr(0, "The square on 4 starts off the bottom leg.", board_c(2), {"move": [740, 650, 740, 860], "text": "persegi tumbuh"}),
             fr(1, "Counted: 16; '4 × 4 = 16' on the right.", board_c(3), {"cut": "tanpa potongan"})])

shot("s09", "hitung", "compare", "Totalnya *dua puluh lima*, pas sama persegi di sisi miringnya.",
     caption="9 + 16 = *25*",
     teaches="9 + 16 = 25, and the square on the side 5 holds exactly 25.",
     screen="The full counted figure: the yellow-chalk square on the hypotenuse with its tilted 5 x 5 grid and '25'; on the right '9 + 16 = 25' with 25 underlined in yellow, and '= 5 × 5' under it in yellow.",
     motion="'9 + 16 = 25' writes on first; then the yellow square and its tilted grid are drawn off the long side and '25' is written in it; the underline joins the two 25s.",
     carries="The counted figure.", transition="Continuous: two other triangles appear lower right.",
     sound="A chalk scratch for the underline.", check="The tilted grid is 5 x 5 with cells the same size as the others; the sums are right.", facts=["f3"],
     frames=[fr(0, "The sum writes on: 9 + 16 = 25.", board_c(3), label(1480, 470, "9 + 16 = 25", 84)),
             fr(0.55, "The yellow square on 5 and its grid.", figure(**FIG, names=("3", "4", "5"), grids=(True, True, True), counts=("9", "16", None)), label(1480, 230, "3 × 3 = 9", 72, colour=C_PIECE), label(1480, 340, "4 × 4 = 16", 72, colour=C_PIECE), label(1480, 470, "9 + 16 = 25", 84)),
             fr(1, "25 in the big square, '= 5 × 5' under the sum.", board_c(4), {"cut": "tanpa potongan"})])

shot("s10", "hitung", "diagram", "Tapi itu baru *satu* segitiga.",
     caption="segitiga *lain*?",
     teaches="The turn: one example is not a reason; other right triangles exist.",
     screen="Lower right of the same section: a flat right triangle and a tall one, quick white chalk sketches, each followed by a large '?'.",
     motion="The two triangles are sketched fast, each with its '?'.",
     carries="The question: does it hold for every right triangle?", transition="The camera slides right to a long clean section.",
     sound="Two quick sketch scratches.", check="The two triangles are clearly different shapes and both right-angled.", facts=["f7"],
     frames=[fr(0, "The counted figure; a flat triangle sketched lower right.", board_c(4), poly([(1180, 840), (1180, 790), (1450, 840)], width=6, fill="ink")),
             fr(1, "Both other triangles with their question marks.", board_c(5), {"cut": "geser ke bagian bersih"})])

shot("s11", "bukti", "compare", "Buktinya gampang: ambil empat segitiga *kembar*,",
     caption="4 segitiga *kembar*",
     teaches="The proof uses four identical copies of one right triangle (any one: legs a and b).",
     screen=f"Section D. Right half: the triangle (legs a and b, hypotenuse c, in the 3 : 4 shape) with '× 4' beside it. Left half: four identical copies drawn, numbered 1 to 4, at the four corners of what will be a square of side a + b ({PS} px), each turned a quarter turn from the last.",
     motion=f"{SLIDE}. The triangle and '× 4' are written; then the four copies are drawn into place one after another, a number in each.",
     carries="The four numbered triangles.", transition="Continuous: the square round them is closed.",
     sound="Four chalk strokes in a rhythm, a tap for each number.", check="The four triangles are the same size and shape (computed corners, not drawn by eye).", facts=["f4"],
     frames=[fr(0, "A clean section; the triangle a, b, c and '× 4'.", poly([(1300, 500), (1300, 500 - PA), (1300 + PB, 500)], width=7, fill="ink"), right_mark(1300, 500, 1, -1), label(1270, 400, "a", 46), label(1460, 550, "b", 46), label(1480, 380, "c", 46), label(1730, 420, "× 4", 80), {"camera": "right"}),
             fr(0.5, "Copies 1 and 2 drawn at two corners.", tri(corners(LX, PY)[1], 1), tri(corners(LX, PY)[2], 2), XTRI),
             fr(1, "All four copies, numbered.", proof_left(outline=False), XTRI, {"cut": "tanpa potongan"})])

shot("s12", "bukti", "diagram", "terus susun di persegi bersisi *a tambah b*.",
     caption="sisi *a + b*",
     teaches="Together they sit inside one big square whose side is a + b.",
     screen="The outer square drawn round the four triangles; along its top 'b' then 'a', down its left 'a' then 'b'; under it a bracket 'a + b'.",
     motion="The outer square is drawn in one continuous stroke round the triangles; the letters and the bracket follow.",
     carries="The square with the four triangles.", transition="Continuous: the hole in the middle fills with yellow.",
     sound="One long chalk stroke, then taps.", check="Each side reads as b + a: the parts are drawn at 320 and 240 px.", facts=["f4"],
     frames=[fr(0, "The four triangles; the outer square starts.", proof_left(outline=False), XTRI, {"path": f"M{LX} {PY} H{LX + PS}", "width": 7}, {"move": [LX + 40, PY - 50, LX + PS, PY - 50], "text": "persegi besar"}),
             fr(0.5, "The square closed round them.", proof_left(), XTRI),
             fr(1, "Its sides lettered: b + a along the top, a + b down the side, bracket 'a + b'.", proof_left(sides=True), XTRI, {"cut": "tanpa potongan"})])

shot("s13", "bukti", "diagram", "Ruang kosong di tengahnya jadi persegi miring, sisinya *c*.",
     caption="tengahnya: *c²*",
     teaches="The space left in the middle is a tilted square on c, and it is a true square because each of its corners is 90 degrees.",
     screen=f"The middle hatched in yellow chalk, 'c²' in it. At its top corner, small arc marks for the two triangles' acute angles (x and y) and a right-angle mark for the square's corner. Right half (the '× 4' wiped away): 'x + y = 90°' and 'jadi sudut ini juga 90°' with an arrow to that corner.",
     motion="The hole is hatched in yellow; 'c²' is written; the camera pushes in a little; '× 4' is wiped with a cloth (a faint smear stays) and the angle note is written with its arrow.",
     carries="The first arrangement: four triangles and c².", transition="The angle note is wiped; a second square of the same size is drawn on the right.",
     sound="Chalk hatching; the soft wipe of the eraser.", check="The middle shape has four equal sides; the angle note is small but readable.", facts=["f4", "f5"],
     frames=[fr(0, "The hole hatched yellow; c² written.", proof_left(middle=True, sides=True), XTRI),
             fr(0.5, "'× 4' wiped; arc marks at the top corner.", proof_left(middle=True, sides=True), {"path": f"M{LX + PB - 60} {PY} A60 60 0 0 0 {LX + PB - 48} {PY + 36}", "width": 5}, {"path": f"M{LX + PB + 60} {PY} A60 60 0 0 1 {LX + PB + 48} {PY + 36}", "width": 5}, label(LX + PB - 80, PY + 44, "x", 40), label(LX + PB + 80, PY + 44, "y", 40), {"path": "M1200 460 C 1400 440, 1600 470, 1800 450", "colour": "white", "width": 30}, {"camera": "push"}),
             fr(1, "The angle note: x + y = 90°, so this corner is 90° too.", proof_left(middle=True, sides=True), label(1450, 300, "x + y = 90°", 72), label(1450, 400, "jadi sudut ini juga 90°", 52), {"arrow": [1160, 380, LX + PB + 40, PY + 60], "colour": C_KEY}, {"path": f"M{LX + PB - 16} {PY + 12} l16 12 l12 -16", "colour": C_KEY, "width": 5}, {"cut": "hapus, persegi kedua"})])

shot("s14", "bukti", "wide", "Sekarang *geser* dua segitiganya, tanpa diubah.",
     caption="*geser*, tanpa diubah",
     teaches="The same four triangles, moved without turning or resizing: two of them slide.",
     screen=f"Both squares, side by side, the same size: left, the first arrangement with c². Right, a new square of side a + b: triangles 1 and 4 drawn where they were; triangles 2 and 3 first as dashed outlines in their old places, then chalk arrows to their new places (3 first, then 2) and a small note above the square, '3 dulu, lalu 2: cuma digeser', where they are drawn solid. Triangle 3 slides up-left by (a, b), triangle 2 down-left by (b, a).",
     motion="The angle note is wiped; the right square and triangles 1 and 4 are drawn; ghosts of 2 and 3 are dotted in, the arrows drawn, then 3 is drawn at its new place, then 2 (one after the other, so the arrows never cross at the same moment), and the ghosts are wiped (leaving a faint smear).",
     carries="Both arrangements, side by side.", transition="Continuous: the two holes on the right are hatched.",
     sound="Chalk strokes; two soft wipes as the ghosts go.", check="2 and 3 keep their orientation (pure slides); the moved corners are the computed ones.", facts=["f4"],
     frames=[fr(0, "Right square, 1 and 4 in place, 2 and 3 dashed where they were.", proof_left(middle=True), proof_right(0), {"camera": "pull"}),
             fr(0.5, "Arrows: 3 slides up-left, 2 slides down-left.", proof_left(middle=True), proof_right(1)),
             fr(1, "2 and 3 at their new places; ghosts wiped.", proof_left(middle=True), proof_right(2), {"cut": "tanpa potongan"})])

shot("s15", "bukti", "diagram", "Ruang kosongnya jadi dua persegi: *a kuadrat* dan *b kuadrat*.",
     caption="jadi *a²* dan *b²*",
     teaches="Now the empty space is two squares: one a by a, one b by b.",
     screen=f"The right square's two holes hatched in blue chalk: top right a² ({PA} x {PA}), bottom right b² ({PB} x {PB}), each lettered. The left square with c² stays beside it.",
     motion="The small hole is hatched and lettered on 'a kuadrat', the big one on 'b kuadrat'.",
     carries="c² on the left, a² and b² on the right.", transition="Continuous: an '=' is written between the squares.",
     sound="Two runs of chalk hatching.", check=f"The holes measure {PA} and {PB} px: a and b exactly.", facts=["f4"],
     frames=[fr(0, "The two holes, still empty.", proof_left(middle=True), proof_right(2)),
             fr(0.5, "a² hatched and lettered.", proof_left(middle=True), proof_right(2), rect(*A_SQ, colour=C_PIECE, fill=C_PIECE, width=7), label(A_SQ[0] + PA / 2, PY + PA / 2 + 26, "a²", 74, colour=C_PIECE)),
             fr(1, "b² hatched and lettered.", proof_left(middle=True), proof_right(3), {"cut": "tanpa potongan"})])

shot("s16", "bukti", "compare", "Persegi besarnya sama, segitiganya sama, jadi sisanya *sama luas*.",
     caption="sisanya *sama luas*",
     teaches="Same big square minus the same four triangles: what is left must be the same area.",
     screen="Both squares complete; a large '=' between them; under each 'persegi besar - 4 segitiga'; the outer edges retraced and the triangles ticked 1 to 4 on both sides.",
     motion="The chalk runs round both outer squares (same size), ticks each pair of matching triangles, writes '=' between, then the two short lines under them.",
     carries="The two equal leftovers.", transition="Continuous: the conclusion is written under them.",
     sound="Four ticks; a firm double stroke for '='.", check="Both outer squares are 560 px; the '=' sits midway between them.", facts=["f4"],
     frames=[fr(0, "Both arrangements complete.", proof_left(middle=True), proof_right(3)),
             fr(0.5, "'=' written between them.", proof_left(middle=True), proof_right(3), label(960, 450, "=", 150)),
             fr(1, "Under each: 'persegi besar - 4 segitiga'.", proof_left(middle=True), proof_right(3), label(960, 450, "=", 150), label(LX + PS / 2, 770, "persegi besar - 4 segitiga", 44), label(RX + PS / 2, 770, "persegi besar - 4 segitiga", 44), {"cut": "tanpa potongan"})])

shot("s17", "bukti", "type", "Artinya, c kuadrat sama dengan *a kuadrat tambah b kuadrat*.",
     teaches="The conclusion, read off the two squares: c² = a² + b².",
     screen="Under the two squares, large: 'c² = a² + b²', c² in yellow chalk and a² + b² in blue; thin chalk arrows from the c² in the left square and from a² and b² in the right one down to their terms.",
     motion="The formula is written term by term with the voice; the arrows are drawn last.",
     carries="The proof and its formula.", transition="The camera slides right to a clean section.",
     sound="Chalk writing; a satisfied double tap at the end.", check="The formula sits above y 940 and is the largest lettering on screen.", facts=["f1", "f4"],
     frames=[fr(0, "'c² =' written under the squares.", proof_left(middle=True), proof_right(3), label(960, 450, "=", 150), label(800, 890, "c² =", 100, colour=C_KEY)),
             fr(0.5, "'a² + b²' follows in blue.", proof_left(middle=True), proof_right(3), label(960, 450, "=", 150), label(800, 890, "c² =", 100, colour=C_KEY), label(1080, 890, "a² + b²", 100, colour=C_PIECE)),
             fr(1, "'c² = a² + b²' complete, arrows from the squares.", proof_left(middle=True), proof_right(3), label(960, 450, "=", 150), label(800, 890, "c² =", 100, colour=C_KEY), label(1080, 890, "a² + b²", 100, colour=C_PIECE), {"arrow": [LX + PS / 2, PY + PS + 20, 760, 820], "colour": C_KEY}, {"arrow": [RX + 300, PY + PS + 20, 1100, 820], "colour": C_PIECE}, {"cut": "geser ke bagian bersih"})])

shot("s18", "umum", "compare", "Segitiganya gepeng atau tinggi, asal *siku-siku*, tetap jalan.",
     caption="asal *siku-siku*",
     teaches="The proof never used the numbers: it works the same for any right triangle, flat or tall.",
     screen="Section E: the same two arrangements again, smaller, for a flat right triangle (left pair) and a tall one (right pair), each pair with its triangle drawn underneath, its right angle ringed in yellow, labelled 'gepeng' and 'tinggi', and under each 'c² = a² + b²' with a drawn tick.",
     motion=f"{SLIDE}. Each pair is drawn quickly, the holes hatched (yellow on the left of the pair, blue on the right), then the ticks.",
     carries="The rule for every right triangle.", transition="The board is wiped with a cloth for the recap.",
     sound="Quick chalk strokes; two ticks.", check="Both pairs follow the same moves; the two triangles are clearly different shapes.", facts=["f6", "f7"],
     frames=[fr(0, "The flat triangle's pair drawn.", general(0), {"camera": "right"}),
             fr(0.5, "The tall triangle's pair drawn.", general(1)),
             fr(1, "Ticks: c² = a² + b² for both.", general(2), {"cut": "lap bersih"})])

shot("s19", "jawab", "recap", "Ruang kosongnya cuma ganti bentuk, luasnya *tetap*.",
     caption="luasnya *tetap*",
     teaches="The answer in one frame: the squares are areas, the same leftover space changes shape, so c² = a² + b².",
     screen="One board after a cloth wipe (faint smears): left, a blue square with sides a and 'a² = luas persegi'; middle, the two small arrangements with '=' between and 'persegi besar sama, 4 segitiga sama / sisanya sama luas'; right, 'c² = a² + b²' boxed in white chalk with c² in yellow, and 'asal siku-siku' under it.",
     motion="The cloth wipes left to right; the three small pictures are drawn in order, the box last.",
     carries="The proof's picture, which the camera passes on its way back.", transition="The camera slides back left along the whole board.",
     sound="The soft wipe of the eraser; chalk strokes.", check="Readable as a summary with the sound off.", facts=["f2", "f4", "f6"],
     frames=[fr(0, "Wiped; the square and 'a² = luas persegi'.", recap(0), {"path": "M120 860 C 600 840, 1200 870, 1800 850", "colour": "white", "width": 40}),
             fr(0.5, "The two arrangements with '='.", recap(1)),
             fr(1, "'c² = a² + b²' boxed; 'asal siku-siku'.", recap(2), {"cut": "geser balik ke awal"})])

shot("s20", "jawab", "wide", "Makanya,", length=1.4,
     teaches="The bridge: the last word runs into the first line, the picture into frame 0.",
     screen="The camera slides back left past the proof, the counted 3-4-5 and the square, and settles on section A: the opening figure, the question and the formula, the same picture as frame 0.",
     motion="A fast slide left along the board (about 1.2 s, eased), settling exactly on the framing of frame 0 a moment before the cut.",
     carries="Into s01.", transition="No cut: the film loops straight into s01.",
     sound="The bed runs on into the opening.", check="The last frame matches frame 0 (check.mjs SSIM).",
     frames=[fr(0, "Sliding back left along the board.", recap(2), {"camera": "left"}),
             fr(1, "The opening board, a moment before frame 0.", board_a(), {"cut": "loop ke s01"})])

duration = shots[-1]["end"]

storyboard = {
    "title": "Kenapa a² + b² = c² selalu benar?",
    "question": "Rumus Pythagoras itu kita hafal, tapi kenapa a kuadrat tambah b kuadrat selalu sama dengan c kuadrat di segitiga siku-siku mana pun?",
    "audience": "Pelajar SMA di Indonesia dan orang dewasa yang penasaran. Mereka hafal a² + b² = c² dari SMP dan bisa memakainya, tapi kebanyakan belum pernah melihat kenapa rumus itu benar, dan menganggap 'kuadrat' cuma operasi hitung.",
    "promise": "a² itu luas persegi bersisi a; empat segitiga siku-siku yang sama, disusun di persegi bersisi a + b, menyisakan c², dan disusun ulang menyisakan a² dan b², jadi c² = a² + b² untuk segitiga siku-siku apa pun.",
    "template": "chalkboard",
    "standard": 3,
    "language": "id",
    "format": "1920x1080",
    "duration": round(duration, 3),
    "fps": 60,
    "loop": {"line": "Makanya, / di segitiga siku-siku mana pun, a kuadrat tambah b kuadrat pasti sama dengan c kuadrat.",
             "picture": "The last shot slides back along the board to section A, which has not been touched since frame 0, and settles on frame 0's framing: the figure, the question and the formula."},
    "voice": {"voice_id": "xlBOShi2835jfBgaEld4", "name": "Rafiq", "model": "eleven_v4", "language": "id", "direction": "[warmly]"},
    "look": {
        "accent": "#f6d365",
        "accent2": "#8fd3f4",
        "mood": "The Chalkboard template: one long dark green board (#1f3b2d) in a wooden frame, faint smudges of old erased chalk, flat classroom light with a soft vignette and chalk-dust grain, no glow. White chalk (#f2f2ea) for everything; yellow chalk (#f6d365) only for c² and the point, blue chalk (#8fd3f4) only for a² and b², so the colour says which squares are the pieces and which is the whole. Every line and letter is drawn on stroke by stroke with grainy edges (ink.js drawOn and write under url(#chalk)); hatching for filled areas; corrections crossed out; a cloth wipe leaves a faint smear. Cabin Sketch for headings and the formula, numbers large and neat. The camera slides and pushes along the one board (stage.camx). Captions are short chalk lines; their key word in yellow (film.css should set --accent to #f6d365: look.css ships #9bd3ae, which is not in this template's palette).",
    },
    "music": {
        "track": "Composed for this film (ElevenLabs Music, music/bed.mp3)",
        "bpm": 84,
        "note": "A quiet classroom bed composed to the take's length: felt piano and soft pizzicato strings with a brushed pulse, no lead melody, low under the voice; it thins to piano alone under the proof (s11 to s16) and lifts gently on 'Artinya' (s17); its tail runs on over the opening so the loop is seamless. Effects per shot, from the template's Sound line: chalk taps on the right angle and each formula term (s01, s02), a scratch for each stroke and letter drawn (s04 to s18), quick ticks while the cells are counted (s07 to s09), long hatching strokes when a hole is filled (s13, s15), the soft wipe of the eraser cloth (s13, s14, s19), and the air of the board sliding by under s20. The cuts follow the take.",
    },
    "facts": [
        {"id": "f1", "claim": "In any right triangle the square on the side opposite the right angle (the hypotenuse c) equals the sum of the squares on the two other sides (the legs a and b): a² + b² = c². The film says it for 'segitiga siku-siku mana pun' and writes 'a² + b² = c²'.",
         "source": "Euclid, Elements I.47, in D. E. Joyce's edition, Clark University (mathcs.clarku.edu/~djoyce/elements/bookI/propI47.html): 'In right-angled triangles the square on the side opposite the right angle equals the sum of the squares on the sides containing the right angle.' OpenStax Prealgebra 2e, §9.3 (openstax.org/books/prealgebra-2e/pages/9-3-use-properties-of-angles-triangles-and-the-pythagorean-theorem): 'In any right triangle, a² + b² = c², where c is the length of the hypotenuse and a and b are the lengths of the legs.'"},
        {"id": "f2", "claim": "a² is the area of a square with side a: a square is a rectangle with length = width = a, and a rectangle's area is length × width, which counts the unit squares that cover it. Euclid's own statement of the theorem is about these squares ('the square on the side'), not about a number squared.",
         "source": "OpenStax Prealgebra 2e, §9.4 'Use Properties of Rectangles, Triangles, and Trapezoids' (area as the number of unit squares that cover a region; the rug 2 ft by 3 ft is 6 squares; area of a rectangle = L × W); Euclid I.47 as f1."},
        {"id": "f3", "claim": "The triangle with sides 3, 4 and 5 is a right triangle: 3² + 4² = 9 + 16 = 25 = 5² (by the converse of the theorem, Euclid I.48, the angle between the sides 3 and 4 is right). The square on 3 holds 3 × 3 = 9 unit squares, the one on 4 holds 4 × 4 = 16, the one on 5 holds 5 × 5 = 25. The same 3-4-5 case is drawn in the ancient Chinese 'hypotenuse diagram' of the Zhou bi suan jing (not shown in the film).",
         "source": "Arithmetic; Euclid I.48 (Joyce, Clark University, mathcs.clarku.edu/~djoyce/elements/bookI/propI48.html); Joyce's note to I.47 on Plimpton 322 and the Zhou bi hypotenuse diagram ('the smallest of these is 3, 4, 5')."},
        {"id": "f4", "claim": "The rearrangement proof. A square of side a + b holds four copies of the right triangle (legs a, b). Placed at the four corners, they leave a tilted square of side c in the middle: area (a + b)² = 4 triangles + c². Moved (two of them slide, none turns or changes), they leave a square a × a and a square b × b: area (a + b)² = 4 triangles + a² + b². The big square and the four triangles are the same both times, so c² = a² + b². In the film's drawing a = 240 px and b = 320 px (the 3 : 4 triangle); triangle 3 slides by (−a, −b) and triangle 2 by (−b, +a), and the holes left are 240 × 240 and 320 × 320 (checked in storyboard.build.py: 4 × ½ab + a² + b² = (a + b)²).",
         "source": "NRICH (University of Cambridge, Millennium Mathematics Project), 'Pythagoras Proofs', problem 6553, method 2 and its published solution (nrich.maths.org/problems/pythagoras-proofs): 'The area of the first square is given by (a+b)² or 4(½ab) + c². The area of the second square is given by (a+b)² or 4(½ab) + a² + b² ... Subtracting equals from both sides we have a² + b² = c².' Triangle area ½bh: OpenStax Prealgebra 2e §9.4."},
        {"id": "f5", "claim": "The middle shape is a true square: its four sides are each a hypotenuse c, and at each of its corners the two triangles' acute angles (x and y) and the square's corner make a straight line, 180°. The acute angles of a right triangle add up to 90° (the three angles of a triangle add up to 180°, one is 90°), so the corner is 180° − 90° = 90°. On screen: 'x + y = 90°' and 'jadi sudut ini juga 90°'.",
         "source": "OpenStax Prealgebra 2e §9.3: 'For any ΔABC, the sum of the measures of the angles is 180°' and 'A right triangle has one 90° angle'. NRICH 'Pythagoras Proofs' solution, which points out this step (Lewis's diagram, 'x + y = 90°') as the piece a proof by this picture must not leave out."},
        {"id": "f6", "claim": "It holds only for right triangles: when the angle between a and b is obtuse, the square on the third side is larger than a² + b²; when it is acute, smaller (Euclid's geometric form of the law of cosines). The film says 'asal siku-siku' and rings the right angle; the proof needs it in f5.",
         "source": "Euclid, Elements II.12 and II.13 (Joyce, Clark University, mathcs.clarku.edu/~djoyce/elements/bookII/propII12.html and propII13.html); Joyce's note to I.47: 'Propositions II.12 and II.13 consider triangles other than right triangles ... geometric forms of the law of cosines.'"},
        {"id": "f7", "claim": "The proof uses nothing but the legs a and b of one right triangle and four copies of it, so it works for every right triangle, flat or tall. The film's two other triangles are drawn with legs 64 and 296 px (gepeng) and 250 and 110 px (tinggi); their pairs follow the same two moves.",
         "source": "NRICH 'Pythagoras Proofs' (as f4): the proof is written for general a, b, c; the mini figures are computed in storyboard.build.py."},
    ],
    "acts": [
        {"id": "hook", "title": "Pertanyaan", "goal": "The rule everyone memorised, and why it always works.", "rail": False},
        {"id": "persegi", "title": "Kuadrat = persegi", "goal": "a² is a real square: its area is a times a.", "rail": False},
        {"id": "hitung", "title": "3-4-5", "goal": "Count one case: 9 + 16 = 25, then ask about every other triangle.", "rail": False},
        {"id": "bukti", "title": "Bukti", "goal": "Four identical triangles in a square of side a + b, moved: the leftover space is c², then a² + b².", "rail": False},
        {"id": "umum", "title": "Semua siku-siku", "goal": "The same moves work for any right triangle, flat or tall.", "rail": False},
        {"id": "jawab", "title": "Jawaban", "goal": "The leftover space only changes shape; then the bridge into the first line.", "rail": False},
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
