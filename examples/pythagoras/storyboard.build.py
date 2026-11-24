"""Writes storyboard.json for "Why does a² + b² = c² always work?" (landscape 1920 x 1080, the Chalkboard template).

The sample film of the Chalkboard template: a teacher's green board in a wooden frame, white chalk for everything,
yellow chalk for the point (the square on c) and blue chalk for the two pieces (the squares on a and b). The film is
cut to one take of English narration, every spoken line shown as a chalk caption (subtitles), so the times here are a
guess until the take retimes the board:

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
            label(1470, 220, "Why does it", 92), label(1470, 322, "always work?", 92), underline(1250, 1450, 344),
            {"title": [1470, 560], "text": "a² + b² = c²", "size": 104}]


def board_a_view(k, fx, fy, sx=960, sy=500, underline_q=True):
    """Section A seen by a camera pushed in k times on board point (fx, fy), which lands at (sx, sy)."""
    tx, ty = sx - k * fx, sy - k * fy
    cx, cy, u = FIG["cx"] * k + tx, FIG["cy"] * k + ty, FIG["u"] * k
    out = figure(cx, cy, u, counts=("a²", "b²", "c²"), size=k)
    out += [label(1470 * k + tx, 220 * k + ty, "Why does it", 92 * k), label(1470 * k + tx, 322 * k + ty, "always work?", 92 * k),
            {"title": [round(1470 * k + tx), round(560 * k + ty)], "text": "a² + b² = c²", "size": round(104 * k)}]
    if underline_q:
        out.append(underline(1250 * k + tx, 1450 * k + tx, 344 * k + ty))
    return out


FIGC = dict(cx=640, cy=600, u=70)  # section C's figure, right of the opening's so the sums sit close beside it


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
        out.append(label(RX + PS / 2, PY - 20, "3 first, then 2: slid, not turned", 40))
    if stage >= 2:
        out += tri(t1[2], 2) + tri(t1[3], 3)
    if stage >= 3:
        out += [rect(*A_SQ, colour=C_PIECE, fill=C_PIECE, width=7), label(A_SQ[0] + PA / 2, PY + PA / 2 + 26, "a²", 74, colour=C_PIECE),
                rect(*B_SQ, colour=C_PIECE, fill=C_PIECE, width=7), label(B_SQ[0] + PB / 2, B_SQ[1] + PB / 2 + 28, "b²", 84, colour=C_PIECE)]
    return out


XTRI = [poly([(1000, 500), (1000, 500 - PA), (1000 + PB, 500)], width=7, fill="ink"), label(1430, 420, "× 4", 80)]  # the triangle 'x 4', on the board from s11 to s13


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


FLAT = (64, 296)  # a flat triangle: legs 64 and 296 px (a : b about 1 : 4.6), its square 360 px
TALL = (250, 110)  # a tall one: legs 250 and 110 px


def general(stage):
    out = []
    out += mini_pair(110, 150, FLAT[0] + FLAT[1], *FLAT)
    if stage >= 1:
        out += mini_pair(1010, 150, TALL[0] + TALL[1], *TALL)
    # each triangle itself, small, under its pair, with its right angle ringed
    out += [poly([(330, 720), (330, 720 - FLAT[0]), (330 + FLAT[1], 720)], width=6, fill="ink"), right_mark(330, 720, 1, -1),
            {"ring": [342, 708, 30], "width": 5}, label(480, 800, "flat", 46)]
    if stage >= 1:
        out += [poly([(1350, 790), (1350, 790 - TALL[0]), (1350 + TALL[1], 790)], width=6, fill="ink"), right_mark(1350, 790, 1, -1),
                {"ring": [1362, 778, 30], "width": 5}, label(1470, 800, "tall", 46)]
    if stage >= 2:
        tick = lambda x, y: {"path": f"M{x} {y - 20} l16 18 l30 -40", "width": 7}  # a drawn tick, not a glyph
        out += [label(460, 880, "c² = a² + b²", 54, colour=C_KEY), tick(640, 878), label(1450, 880, "c² = a² + b²", 54, colour=C_KEY), tick(1630, 878)]
    return out


def recap(stage):
    out = [rect(110, 160, 360, 360, colour=C_PIECE, width=8), label(290, 140, "a", 52), label(80, 360, "a", 52),
           label(290, 380, "a²", 120, colour=C_PIECE), label(290, 610, "a² = area", 56)]
    if stage >= 1:
        out += mini_pair(590, 160, 360, 154, 206, gap=110)
        out += [label(1005, 380, "=", 90), label(1005, 610, "same area", 56),
                poly([(1560, 420), (1560, 300), (1720, 420)], width=6), right_mark(1560, 420, 1, -1), {"ring": [1572, 408, 30], "width": 5},
                label(1640, 500, "right", 52), label(1640, 560, "triangles only", 52)]
    if stage >= 2:
        out += [rect(560, 690, 890, 190, width=7), label(1005, 822, "c² = a² + b²", 110, colour=C_KEY)]
    return out


# Section B: "squared means a square".  Section C: the 3-4-5 triangle, counted.
def board_b(stage):
    out = [label(470, 520, "a²", 230, colour=C_PIECE)]
    if stage >= 1:
        out += [label(760, 500, "=", 150), rect(960, 190, 420, 420, colour=C_PIECE, width=8)]
    if stage >= 2:
        out += [label(1170, 170, "a", 56), label(926, 420, "a", 56), label(1640, 330, "square", 56), {"line": [1520, 340, 1390, 380], "width": 5}]
    if stage >= 3:
        out += [label(1170, 790, "area = a × a", 104)]
    return out


def board_c(stage):
    """stage 1: the triangle 3-4-5; 2: the square on 3 counted; 3: on 4; 4: on 5 and the sum; 5: other triangles."""
    sq = (stage >= 2, stage >= 3, stage >= 4)
    cnt = ("9" if stage >= 2 else None, "16" if stage >= 3 else None, "25" if stage >= 4 else None)
    out = figure(**FIGC, names=("3", "4", "5"), squares=sq, grids=sq, counts=cnt)
    if stage >= 2:
        out.append(label(1300, 230, "3 × 3 = 9", 72, colour=C_PIECE))
    if stage >= 3:
        out.append(label(1300, 340, "4 × 4 = 16", 72, colour=C_PIECE))
    if stage >= 4:
        out += [label(1300, 470, "9 + 16 = 25", 84), underline(1460, 1560, 492), label(1300, 570, "= 5 × 5", 72, colour=C_KEY)]
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
    length = more.pop("length", None) or max(1.3, round(len(plain) / 14.8 + 0.1, 2))  # Craig's take for noise-cancelling ran at about 14.8 characters a second
    shots.append({"id": id, "act": act, "type": type_, "start": round(start, 3), "end": round(start + length, 3), "voice": voice, **more})


SLIDE = "The camera glides right along the board (about 0.9 s, eased) and lands on the first chalk stroke of a clean section"

shot("s01", "hook", "wide", "In any *right triangle* you draw,",
     teaches="Opens on the rule the viewer already knows, over the figure it is about: a right triangle with a square on each side.",
     screen="The whole board, finished at frame 0: dark green chalkboard (#1f3b2d) with faint smudges of old chalk, a wooden frame round it. Left: a right triangle drawn in white chalk and lightly hatched (legs 3 and 4 in proportion, the right angle marked with a little square), a blue-chalk square on each leg labelled a² and b², a yellow-chalk square on the hypotenuse labelled c², sides lettered a, b, c. Right: 'Why does it / always work?' in Cabin Sketch chalk lettering with 'always' underlined in yellow, and under it the formula 'a² + b² = c²' in large neat chalk figures.",
     motion="Frame 0 is the finished board (nothing half-drawn). The camera pushes in slowly (about 1.4x) toward the right angle; on 'right triangle' the chalk taps the little square twice, leaving two puffs of dust. The spoken line is written as a chalk caption near the bottom, word by word.",
     carries="The figure and the formula on section A of the board.", transition="The camera slides right along the board to the formula.",
     sound="The quiet bed starts under the first word; two chalk taps on 'right triangle'.",
     check="Frame 0 is complete and readable; the triangle is clearly right-angled; only white, yellow and blue chalk.", facts=["f1"],
     frames=[fr(0, "Frame 0: the finished board, the figure left, the question and the formula right.", board_a()),
             fr(0.55, "The camera pushes in toward the triangle.", board_a_view(1.2, 600, 560), {"camera": "push"}),
             fr(1, "Close on the right angle: two chalk taps on its little square.", board_a_view(1.45, 560, 560), {"dot": [960, 500, 10], "colour": "white"}, {"cut": "slide to the formula"})])

shot("s02", "hook", "type", "a squared plus b squared equals *c squared*.",
     teaches="States the rule as the formula on the board, term by term.",
     screen="Section A, the camera on the formula 'a² + b² = c²' in large chalk figures (about 140 px high on screen); the blue squares just in view at left.",
     motion="The camera eases right to take in the formula and the figure together; as each term is said the chalk taps under it (a², b², then c²), a puff of dust each time, and runs once round the square it names (the same lines, no new mark). Nothing new is drawn: section A stays as frame 0 drew it.",
     carries="The formula.", transition="The camera pulls back to the whole board.",
     sound="Three soft chalk taps, one a term.", check="The formula is the largest thing on screen and reads at a glance.", facts=["f1"],
     frames=[fr(0, "Sliding right from the triangle to the formula.", board_a_view(1.3, 1000, 520), {"camera": "right"}),
             fr(0.45, "On the formula; the chalk taps under a² and b².", board_a_view(1.35, 1470, 520), {"dot": [720, 600, 9], "colour": "white"}, {"dot": [930, 600, 9], "colour": "white"}),
             fr(1, "On 'c squared' the last tap, under c².", board_a_view(1.35, 1470, 520), {"dot": [1190, 600, 9], "colour": "white"}, {"cut": "pull back"})])

shot("s03", "hook", "type", "Why does it *always* work?", caption=False,
     teaches="Asks the one question the film answers: why it always works.",
     screen="Section A again, whole: the figure, the question 'Why does it / always work?' ('always' underlined in yellow) and the formula. The question is the thing to read; it is already lettered on the board, so no caption repeats it.",
     motion="The camera pulls back to the framing of frame 0 and rises a little to the question; the chalk retraces the yellow underline under 'always' once (the same line, no new mark).",
     carries="The figure, whose square the next section redraws on its own.", transition="The camera slides right to a clean section of the board.",
     sound="A light chalk scratch on 'always'.", check="Readable as a question in under a second; frame 0's framing is reached at the end.",
     frames=[fr(0, "Pulling back from the formula.", board_a_view(1.2, 1300, 480), {"camera": "pull"}),
             fr(1, "The whole board, the question in view: the same framing as frame 0.", board_a(), {"cut": "slide to a clean board"})])

shot("s04", "square", "diagram", "Squared means an actual *square*:",
     teaches="The key idea: 'squared' is not just a sum to do; a² is an actual square.",
     screen="Section B, a clean stretch of board. Left: 'a²' in blue chalk, very large (about 230 px). Middle: '='. Right: a blue-chalk square 420 px on a side, labelled 'square' with a leader line from the right.",
     motion=f"{SLIDE}. 'a²' is written on stroke by stroke; '=' follows; the square is drawn side by side, its four strokes at chalk speed; the leader and the word 'square' last.",
     carries="The square.", transition="Continuous: its sides get their letters.",
     sound="Chalk scratches for each stroke; a tap as the square closes.", check="The square really is square (420 x 420); a² and the square are the same blue.", facts=["f2"],
     frames=[fr(0, "Arriving at a clean section; 'a²' written large.", board_b(0), {"camera": "right"}),
             fr(0.5, "'=' and the square drawn on.", board_b(1), {"move": [960, 650, 1380, 650], "text": "drawn"}),
             fr(1, "The word 'square' with its leader.", board_b(2), {"cut": "continuous"})])

shot("s05", "square", "type", "a squared is the *area* of a square with side a.",
     teaches="a² is the area of the square whose side is a.",
     screen="The same section: the blue square with 'a' on its top and left sides, and under it 'area = a × a' in large chalk lettering (about 100 px).",
     motion="On 'area' the inside of the square is hatched in blue (the area is what it covers) and 'area' is written under it with a yellow underline; on 'side a' each side gets a dimension line with an 'a'; then '= a × a'.",
     carries="The idea that a square's area is side times side.", transition="The camera slides right to a clean section; a triangle is drawn there.",
     sound="Chalk writing; a short underline scratch.", check="The lettering reads 'area = a × a' and sits above the caption line.", facts=["f2"],
     frames=[fr(0, "The square with its sides lettered a.", board_b(2)),
             fr(1, "'area = a × a' written under it, 'area' underlined in yellow.", board_b(3), underline(860, 1070, 812), {"cut": "slide to the 3-4-5 triangle"})])

shot("s06", "count", "diagram", "Try *three, four, five*.",
     teaches="A concrete case first: the right triangle with sides 3, 4 and 5.",
     screen="Section C, the camera close: one right triangle in white chalk, legs 3 (up) and 4 (along), hypotenuse 5, each side's number written beside it in large chalk numerals; the right angle marked.",
     motion=f"{SLIDE}. The three sides are drawn in turn (up, along, across) and each number is written as it is said.",
     carries="The 3-4-5 triangle.", transition="The camera pulls back as squares grow off its sides.",
     sound="Three strokes of chalk, three taps for the numbers.", check="The legs are drawn in the ratio 3 : 4 and the long side reads as 5.", facts=["f3"],
     frames=[fr(0, "A clean section; the first leg drawn.", {"path": "M700 760 V340", "width": 9}, label(650, 580, "3", 96), {"camera": "right"}),
             fr(0.5, "The second leg along the bottom: 4.", {"path": "M700 340 V760 H1260", "width": 9}, label(650, 580, "3", 96), label(980, 850, "4", 96), right_mark(700, 760, 1, -1, s=36)),
             fr(1, "The hypotenuse: 5. The triangle is whole.", triangle_close(), {"cut": "pull back"})])

shot("s07", "count", "chart", "The square on three holds *nine* little squares,",
     teaches="The square on the side 3 holds 9 unit squares.",
     screen="Pulled back: the 3-4-5 triangle at the same place and size as the opening figure. A blue-chalk square on the side 3 with a 3 x 3 grid inside, '9' in its middle; on the right of the board '3 × 3 = 9' in blue.",
     motion="The camera pulls back to about 1.75x on the triangle; the square is drawn off the side 3, then its grid lines, then the cells are counted with chalk ticks (1 to 9, about a second) and '9' is written; the camera eases out to take in the sum on the right as it writes on.",
     carries="The triangle and its first square.", transition="Continuous: the next square grows off the side 4.",
     sound="Nine quick chalk ticks.", check="The grid is exactly 3 x 3 and each cell is the same size as a unit of the legs.", facts=["f3", "f2"],
     frames=[fr(0, "Pulled back: the triangle at the opening figure's size.", board_c(1), {"camera": "pull"}),
             fr(0.5, "The square on 3 drawn, its 3 x 3 grid.", figure(**FIGC, names=("3", "4", "5"), squares=(True, False, False), grids=(True, False, False))),
             fr(1, "Counted: 9; '3 × 3 = 9' on the right.", board_c(2), {"cut": "continuous"})])

shot("s08", "count", "chart", "the one on four, *sixteen*.",
     teaches="The square on the side 4 holds 16.",
     screen="The same board: a blue-chalk square on the side 4 with a 4 x 4 grid, '16' in its middle; '4 × 4 = 16' added under '3 × 3 = 9' on the right.",
     motion="The square and its grid are drawn on; the count ticks run fast; '16' and the sum write on.",
     carries="Both small squares, counted.", transition="Continuous: the square on the long side follows.",
     sound="Sixteen fast ticks, almost a roll.", check="4 x 4 grid; cells the same size as in the square on 3.", facts=["f3"],
     frames=[fr(0, "The square on 4 starts off the bottom leg.", board_c(2), {"move": [740, 650, 740, 860], "text": "square grows"}),
             fr(1, "Counted: 16; '4 × 4 = 16' on the right.", board_c(3), {"cut": "continuous"})])

shot("s09", "count", "compare", "Together, *twenty-five*: the square on the long side.",
     teaches="9 + 16 = 25, and the square on the side 5 holds exactly 25.",
     screen="The full counted figure: the yellow-chalk square on the hypotenuse with its tilted 5 x 5 grid and '25'; on the right '9 + 16 = 25' with 25 underlined in yellow, and '= 5 × 5' under it in yellow.",
     motion="'9 + 16 = 25' writes on first; then the yellow square and its tilted grid are drawn off the long side and '25' is written in it; the underline joins the two 25s.",
     carries="The counted figure.", transition="Continuous: two other triangles appear lower right.",
     sound="A chalk scratch for the underline.", check="The tilted grid is 5 x 5 with cells the same size as the others; the sums are right.", facts=["f3"],
     frames=[fr(0, "The sum writes on: 9 + 16 = 25.", board_c(3), label(1300, 470, "9 + 16 = 25", 84)),
             fr(0.55, "The yellow square on 5 and its grid.", figure(**FIGC, names=("3", "4", "5"), grids=(True, True, True), counts=("9", "16", None)), label(1300, 230, "3 × 3 = 9", 72, colour=C_PIECE), label(1300, 340, "4 × 4 = 16", 72, colour=C_PIECE), label(1300, 470, "9 + 16 = 25", 84)),
             fr(1, "25 in the big square, '= 5 × 5' under the sum.", board_c(4), {"cut": "continuous"})])

shot("s10", "count", "diagram", "But that's *one* triangle.",
     teaches="The turn: one example is not a reason; other right triangles exist.",
     screen="Lower right of the same section: a flat right triangle and a tall one, quick white chalk sketches, each followed by a large '?'.",
     motion="The two triangles are sketched fast, each with its '?'.",
     carries="The question: does it hold for every right triangle?", transition="The camera slides right to a long clean section.",
     sound="Two quick sketch scratches.", check="The two triangles are clearly different shapes and both right-angled.", facts=["f7"],
     frames=[fr(0, "The counted figure; a flat triangle sketched lower right.", board_c(4), poly([(1180, 840), (1180, 790), (1450, 840)], width=6, fill="ink")),
             fr(1, "Both other triangles with their question marks.", board_c(5), {"cut": "slide to a clean section"})])

shot("s11", "proof", "compare", "For every case, put four *identical* triangles",
     teaches="The proof uses four identical copies of one right triangle (any one: legs a and b).",
     screen=f"Section D. Right half: the triangle (legs a and b, hypotenuse c, in the 3 : 4 shape) with '× 4' beside it. Left half: four identical copies drawn, numbered 1 to 4, at the four corners of what will be a square of side a + b ({PS} px), each turned a quarter turn from the last.",
     motion=f"{SLIDE}. The triangle and '× 4' are written; then the four copies are drawn into place one after another, a number in each.",
     carries="The four numbered triangles.", transition="Continuous: the square round them is closed.",
     sound="Four chalk strokes in a rhythm, a tap for each number.", check="The four triangles are the same size and shape (computed corners, not drawn by eye).", facts=["f4"],
     frames=[fr(0, "A clean section; the triangle a, b, c and '× 4'.", poly([(1000, 500), (1000, 500 - PA), (1000 + PB, 500)], width=7, fill="ink"), right_mark(1000, 500, 1, -1), label(966, 400, "a", 48), label(1160, 552, "b", 48), label(1190, 378, "c", 48), label(1430, 420, "× 4", 80), {"camera": "right"}),
             fr(0.5, "Copies 1 and 2 drawn at two corners.", tri(corners(LX, PY)[1], 1), tri(corners(LX, PY)[2], 2), XTRI),
             fr(1, "All four copies, numbered.", proof_left(outline=False), XTRI, {"cut": "continuous"})])

shot("s12", "proof", "diagram", "inside a square with sides *a plus b*.",
     teaches="Together they sit inside one big square whose side is a + b.",
     screen="The outer square drawn round the four triangles; along its top 'b' then 'a', down its left 'a' then 'b'; under it a bracket 'a + b'.",
     motion="The outer square is drawn in one continuous stroke round the triangles; the letters and the bracket follow.",
     carries="The square with the four triangles.", transition="Continuous: the hole in the middle fills with yellow.",
     sound="One long chalk stroke, then taps.", check="Each side reads as b + a: the parts are drawn at 320 and 240 px.", facts=["f4"],
     frames=[fr(0, "The four triangles; the outer square starts.", proof_left(outline=False), XTRI, {"path": f"M{LX} {PY} H{LX + PS}", "width": 7}, {"move": [LX + 40, PY - 50, LX + PS, PY - 50], "text": "big square"}),
             fr(0.5, "The square closed round them.", proof_left(), XTRI),
             fr(1, "Its sides lettered: b + a along the top, a + b down the side, bracket 'a + b'.", proof_left(sides=True), XTRI, {"cut": "continuous"})])

shot("s13", "proof", "diagram", "That leaves a tilted square in the middle, side *c*.", hold=1.4,
     teaches="The space left in the middle is a tilted square on c, and it is a true square because each of its corners is 90 degrees.",
     screen="The middle outlined and hatched in yellow chalk, each of its sides lettered c and 'c²' in it. At its right corner the two triangles' acute angles x and y (both also marked in triangle 2, round its right angle), the straight line marked 180° with a half circle, and a right-angle mark for the square's corner. Under the square (the bracket and the '× 4' wiped away), in large chalk: 'x + y = 90°' and 'so this corner is 90° too' with an arrow to that corner.",
     motion="The hole is outlined and hatched in yellow; its sides are lettered c and then 'c²' is written; the camera pushes in toward the corner; '× 4' and the bracket are wiped with a cloth (a faint smear stays); the angles, the half circle and the note are written with its arrow in the pause after the line.",
     carries="The first arrangement: four triangles and c².", transition="The angle note is wiped; a second square of the same size is drawn on the right.",
     sound="Chalk hatching; the soft wipe of the eraser.", check="The middle shape has four equal sides; the angle note is 60 px or more and stays on the board through s15.", facts=["f4", "f5"],
     frames=[fr(0, "The hole hatched yellow; c² written.", proof_left(middle=True, sides=True), XTRI),
             fr(0.5, "'× 4' and the bracket wiped; x and y at the right corner, the straight line marked 180°.", proof_left(middle=True, sides=True), {"path": f"M{LX + PS} {PY + PB - 44} A44 44 0 0 0 {LX + PS - 26} {PY + PB - 35}", "width": 5}, {"path": f"M{LX + PS} {PY + PB + 44} A44 44 0 0 1 {LX + PS - 35} {PY + PB + 26}", "width": 5}, {"path": f"M{LX + PS} {PY + PB - 70} A70 70 0 0 0 {LX + PS} {PY + PB + 70}", "width": 4}, label(LX + PS - 30, PY + PB - 64, "x", 48), label(LX + PS - 30, PY + PB + 96, "y", 48), label(LX + PS + 70, PY + PB + 16, "180°", 46), {"path": "M1200 460 C 1400 440, 1600 470, 1800 450", "colour": "white", "width": 30}, {"camera": "push"}),
             fr(1, "The angle note: x + y = 90°, so this corner is 90° too.", proof_left(middle=True), label(LX + PB / 2 + 140, PY + 50, "y", 48), label(480, 780, "x + y = 90°", 70), label(480, 862, "so this corner is 90° too", 60), {"arrow": [820, 840, LX + PS + 18, PY + PB + 20]}, {"path": f"M{LX + PS - 26} {PY + PB - 20} l-14 20 l14 20", "width": 5}, {"cut": "continuous: a second square is drawn on the right"})])

shot("s14", "proof", "wide", "Now *slide* two of them, without turning.",
     teaches="The same four triangles, moved without turning or resizing: two of them slide.",
     screen=f"Both squares, side by side, the same size: left, the first arrangement with c² and the angle note under it. Right, a new square of side a + b, lettered b, a along its top and a, b down its left, with the same four triangles copied into the same corners, numbered. Then triangle 3 slides up-left by (a, b) and triangle 2 down-left by (b, a), each with a white chalk arrow, leaving a dotted outline where it was; above the square 'slid, not turned'.",
     motion="The right square is drawn in one stroke and lettered; each triangle is copied in turn (the chalk runs round the first square's triangle, then draws its copy); the arrow for 3 is drawn and 3 slides, then 2 (one after the other), each leaving a dotted outline; the dotted outlines and the arrows are wiped (a faint smear stays) and the bracket goes with them.",
     carries="Both arrangements, side by side.", transition="Continuous: the two holes on the right are hatched.",
     sound="Chalk strokes; two soft wipes as the ghosts go.", check="2 and 3 keep their orientation (pure slides); the moved corners are the computed ones; the copies never overlap the first square.", facts=["f4"],
     frames=[fr(0, "Right square, 1 and 4 in place, 2 and 3 dashed where they were.", proof_left(middle=True), proof_right(0), {"camera": "pull"}),
             fr(0.5, "Arrows: 3 slides up-left, 2 slides down-left.", proof_left(middle=True), proof_right(1)),
             fr(1, "2 and 3 at their new places; ghosts wiped.", proof_left(middle=True), proof_right(2), {"cut": "continuous"})])

shot("s15", "proof", "diagram", "The gap becomes two squares: *a squared* and *b squared*.",
     teaches="Now the empty space is two squares: one a by a, one b by b.",
     screen=f"The right square's two holes outlined and hatched in blue chalk: top right a² ({PA} x {PA}), bottom right b² ({PB} x {PB}), each lettered, and the right side of the square lettered a and b beside them. The left square with c² stays beside it.",
     motion="The small hole is hatched and lettered on 'a squared', the big one on 'b squared'.",
     carries="c² on the left, a² and b² on the right.", transition="Continuous: an '=' is written between the squares.",
     sound="Two runs of chalk hatching.", check=f"The holes measure {PA} and {PB} px: a and b exactly.", facts=["f4"],
     frames=[fr(0, "The two holes, still empty.", proof_left(middle=True), proof_right(2)),
             fr(0.5, "a² hatched and lettered.", proof_left(middle=True), proof_right(2), rect(*A_SQ, colour=C_PIECE, fill=C_PIECE, width=7), label(A_SQ[0] + PA / 2, PY + PA / 2 + 26, "a²", 74, colour=C_PIECE)),
             fr(1, "b² hatched and lettered.", proof_left(middle=True), proof_right(3), {"cut": "continuous"})])

shot("s16", "proof", "compare", "Same square, same triangles: the gaps must *match*.", hold=0.6,
     teaches="Same big square minus the same four triangles: what is left must be the same area.",
     screen="Both squares complete; a large '=' between them; under each 'big square - 4 triangles'; the outer edges retraced and the triangles ticked 1 to 4 on both sides.",
     motion="The angle note is wiped; the chalk runs round both outer squares (same size), ticks each pair of matching triangles in white, writes the two short lines under them, then '=' between.",
     carries="The two equal leftovers.", transition="Continuous: the conclusion is written under them.",
     sound="Four ticks; a firm double stroke for '='.", check="Both outer squares are 560 px; the '=' sits midway between them.", facts=["f4"],
     frames=[fr(0, "Both arrangements complete.", proof_left(middle=True), proof_right(3)),
             fr(0.5, "'=' written between them.", proof_left(middle=True), proof_right(3), label(960, 450, "=", 150)),
             fr(1, "Under each: 'big square - 4 triangles'.", proof_left(middle=True), proof_right(3), label(960, 450, "=", 150), label(LX + PS / 2, 770, "big square - 4 triangles", 44), label(RX + PS / 2, 770, "big square - 4 triangles", 44), {"cut": "continuous"})])

shot("s17", "proof", "type", "Which means c squared equals *a squared plus b squared*.", hold=1.4,
     teaches="The conclusion, read off the two squares: c² = a² + b².",
     screen="Under the two squares, large: 'c² = a² + b²', c² in yellow chalk and a² + b² in blue; thin chalk arrows from the c² in the left square and from a² and b² in the right one down to their terms. The spoken line runs as a caption below it.",
     motion="The formula is written term by term with the voice, each arrow as its term is written; the camera settles on it and it holds, complete, for a second and a half (a pause after the line) before the board moves on.",
     carries="The proof and its formula.", transition="The camera slides right to a clean section.",
     sound="Chalk writing; a satisfied double tap at the end.", check="The formula sits clear of the caption line and is the largest lettering on screen.", facts=["f1", "f4"],
     frames=[fr(0, "'c² =' written under the squares.", proof_left(middle=True), proof_right(3), label(960, 450, "=", 150), label(800, 890, "c² =", 100, colour=C_KEY)),
             fr(0.5, "'a² + b²' follows in blue.", proof_left(middle=True), proof_right(3), label(960, 450, "=", 150), label(800, 890, "c² =", 100, colour=C_KEY), label(1080, 890, "a² + b²", 100, colour=C_PIECE)),
             fr(1, "'c² = a² + b²' complete, arrows from the squares.", proof_left(middle=True), proof_right(3), label(960, 450, "=", 150), label(800, 890, "c² =", 100, colour=C_KEY), label(1080, 890, "a² + b²", 100, colour=C_PIECE), {"arrow": [LX + PS / 2, PY + PS + 20, 760, 820], "colour": C_KEY}, {"arrow": [RX + 300, PY + PS + 20, 1100, 820], "colour": C_PIECE}, {"cut": "slide to a clean section"})])

shot("s18", "general", "compare", "Flat or tall, any *right triangle* works.", hold=0.55,
     teaches="The proof never used the numbers: it works the same for any right triangle, flat or tall.",
     screen="Section E: the same two arrangements again, smaller, for a flat right triangle (left pair) and a tall one (right pair), each pair with its triangle drawn underneath, its right angle ringed in white chalk, labelled 'flat' and 'tall', and under each 'c² = a² + b²' with a drawn tick.",
     motion=f"{SLIDE}. Each pair is drawn quickly, the holes hatched (yellow on the left of the pair, blue on the right), then the ticks.",
     carries="The rule for every right triangle.", transition="The board is wiped with a cloth for the recap.",
     sound="Quick chalk strokes; two ticks.", check="Both pairs follow the same moves; the two triangles are clearly different shapes.", facts=["f6", "f7"],
     frames=[fr(0, "The flat triangle's pair drawn.", general(0), {"camera": "right"}),
             fr(0.5, "The tall triangle's pair drawn.", general(1)),
             fr(1, "Ticks: c² = a² + b² for both.", general(2), {"cut": "wipe clean"})])

shot("s19", "answer", "recap", "The gap just changes shape, never its *area*.", hold=0.9,
     teaches="The answer in one frame: the squares are areas, the same leftover space changes shape, so c² = a² + b².",
     screen="One board after a cloth wipe (faint smears), filled: above, a blue square with sides a and 'a² = area' under it; the two small arrangements with '=' between and 'same area' under them; a small right triangle, its right angle ringed, and 'right triangles only'. Below, across the middle, 'c² = a² + b²' large and boxed in white chalk, c² in yellow and a² + b² in blue.",
     motion="The cloth wipes left to right; the three small pictures are drawn in order, the box last.",
     carries="The proof's picture, which the camera passes on its way back.", transition="The camera slides back left along the whole board.",
     sound="The soft wipe of the eraser; chalk strokes.", check="Readable as a summary with the sound off.", facts=["f2", "f4", "f6"],
     frames=[fr(0, "Wiped; the square and 'a² = area'.", recap(0), {"path": "M120 860 C 600 840, 1200 870, 1800 850", "colour": "white", "width": 40}),
             fr(0.5, "The two arrangements with '='.", recap(1)),
             fr(1, "'c² = a² + b²' boxed; 'right triangles only'.", recap(2), {"cut": "slide back to the start"})])

shot("s20", "answer", "wide", "That's why", length=1.3,
     teaches="The bridge: the last words run into the first line, the picture into frame 0.",
     screen="The camera slides back left past the proof, the counted 3-4-5 and the square, and settles on section A: the opening figure, the question and the formula, the same picture as frame 0.",
     motion="A glide left along the whole board (about 1.1 s, eased), pulling back as it travels so the proof, the counted 3-4-5 and the square pass by, and pushing in to settle exactly on the framing of frame 0 on the last frame.",
     carries="Into s01.", transition="No cut: the film loops straight into s01.",
     sound="The bed runs on into the opening.", check="The last frame matches frame 0 (check.mjs SSIM).",
     frames=[fr(0, "Sliding back left along the board.", recap(2), {"camera": "left"}),
             fr(1, "The opening board, a moment before frame 0.", board_a(), {"cut": "loop to s01"})])

duration = shots[-1]["end"]

storyboard = {
    "title": "Why does a² + b² = c² always work?",
    "question": "Everyone learns a² + b² = c², but why is it true for every right triangle?",
    "audience": "Curious teenagers and adults anywhere, watching on a phone or a laptop, often with the sound off at first. They remember a² + b² = c² from school and can use it, but have never seen why it is true, and think of 'squared' as just a sum to do.",
    "promise": "a² is the area of a square on side a; four identical right triangles in a square of side a + b leave c² empty, and moved around they leave a² and b² empty, so c² = a² + b² for any right triangle.",
    "template": "chalkboard",
    "standard": 3,
    "language": "en",
    "format": "1920x1080",
    "subtitles": True,
    "duration": round(duration, 3),
    "fps": 60,
    "loop": {"line": "That's why / in any right triangle you draw, a squared plus b squared equals c squared.",
             "picture": "The last shot slides back along the board to section A, which has not been touched since frame 0, and settles on frame 0's framing: the figure, the question and the formula."},
    "voice": {"voice_id": "MnTN9XubPKNlI4AwhLj5", "name": "Craig", "model": "eleven_v4", "language": "en", "direction": "[warmly]"},
    "look": {
        "accent": "#f6d365",
        "accent2": "#8fd3f4",
        "mood": "The Chalkboard template: one long dark green board (#1f3b2d) in a wooden frame, faint smudges of old erased chalk, flat classroom light with a soft vignette and chalk-dust grain, no glow. White chalk (#f2f2ea) for everything; yellow chalk (#f6d365) only for c² and the point, blue chalk (#8fd3f4) only for a² and b², so the colour says which squares are the pieces and which is the whole. Every line and letter is drawn on stroke by stroke with grainy edges (ink.js drawOn and write under url(#chalk)); hatching for filled areas; corrections crossed out; a cloth wipe leaves a faint smear. Cabin Sketch for headings and the formula, numbers large and neat. The camera slides and pushes along the one board (stage.camx). Captions: every spoken line written in chalk near the bottom as it is said (subtitles), its *key* word in yellow (film.css should set --accent to #f6d365: look.css ships #9bd3ae, which is not in this template's palette); the question in s03 is already lettered on the board, so that shot has no caption.",
    },
    "music": {
        "track": "Composed for this film (ElevenLabs Music, music/bed.mp3; lengthened by two repeated bars in music/bed-long.mp3)",
        "bpm": 84,
        "note": "A quiet classroom bed composed to the take's length: felt piano and soft pizzicato strings with a brushed pulse, no lead melody, low under the voice; it thins to piano alone under the proof (s11 to s16) and lifts gently on 'Which means' (s17); its tail runs on over the opening so the loop is seamless. The pauses held after s13, s16, s17, s18 and s19 made the film longer than the bed was composed for, so two bars of it (at its measured 83 BPM) are played twice (music/bed.build.py writes music/bed-long.mp3); no new music was composed. Effects per shot, from the template's Sound line: chalk taps on the right angle and each formula term (s01, s02), a scratch for each stroke and letter drawn (s04 to s18), quick ticks while the cells are counted (s07 to s09), long hatching strokes when a hole is filled (s13, s15), the soft wipe of the eraser cloth (s13, s14, s19), and the air of the board sliding by under s20. The cuts follow the take.",
    },
    "facts": [
        {"id": "f1", "claim": "In any right triangle the square on the side opposite the right angle (the hypotenuse c) equals the sum of the squares on the two other sides (the legs a and b): a² + b² = c². The film says it for 'any right triangle you draw' and writes 'a² + b² = c²'.",
         "source": "Euclid, Elements I.47, in D. E. Joyce's edition, Clark University (mathcs.clarku.edu/~djoyce/elements/bookI/propI47.html): 'In right-angled triangles the square on the side opposite the right angle equals the sum of the squares on the sides containing the right angle.' OpenStax Prealgebra 2e, §9.3 (openstax.org/books/prealgebra-2e/pages/9-3-use-properties-of-angles-triangles-and-the-pythagorean-theorem): 'In any right triangle, a² + b² = c², where c is the length of the hypotenuse and a and b are the lengths of the legs.'"},
        {"id": "f2", "claim": "a² is the area of a square with side a: a square is a rectangle with length = width = a, and a rectangle's area is length × width, which counts the unit squares that cover it. Euclid's own statement of the theorem is about these squares ('the square on the side'), not about a number squared.",
         "source": "OpenStax Prealgebra 2e, §9.4 'Use Properties of Rectangles, Triangles, and Trapezoids' (area as the number of unit squares that cover a region; the rug 2 ft by 3 ft is 6 squares; area of a rectangle = L × W); Euclid I.47 as f1."},
        {"id": "f3", "claim": "The triangle with sides 3, 4 and 5 is a right triangle: 3² + 4² = 9 + 16 = 25 = 5² (by the converse of the theorem, Euclid I.48, the angle between the sides 3 and 4 is right). The square on 3 holds 3 × 3 = 9 unit squares, the one on 4 holds 4 × 4 = 16, the one on 5 holds 5 × 5 = 25. The same 3-4-5 case is drawn in the ancient Chinese 'hypotenuse diagram' of the Zhou bi suan jing (not shown in the film).",
         "source": "Arithmetic; Euclid I.48 (Joyce, Clark University, mathcs.clarku.edu/~djoyce/elements/bookI/propI48.html); Joyce's note to I.47 on Plimpton 322 and the Zhou bi hypotenuse diagram ('the smallest of these is 3, 4, 5')."},
        {"id": "f4", "claim": "The rearrangement proof. A square of side a + b holds four copies of the right triangle (legs a, b). Placed at the four corners, they leave a tilted square of side c in the middle: area (a + b)² = 4 triangles + c². Moved (two of them slide, none turns or changes), they leave a square a × a and a square b × b: area (a + b)² = 4 triangles + a² + b². The big square and the four triangles are the same both times, so c² = a² + b². In the film's drawing a = 240 px and b = 320 px (the 3 : 4 triangle); triangle 3 slides by (−a, −b) and triangle 2 by (−b, +a), and the holes left are 240 × 240 and 320 × 320 (checked in storyboard.build.py: 4 × ½ab + a² + b² = (a + b)²).",
         "source": "NRICH (University of Cambridge, Millennium Mathematics Project), 'Pythagoras Proofs', problem 6553, method 2 and its published solution (nrich.maths.org/problems/pythagoras-proofs): 'The area of the first square is given by (a+b)² or 4(½ab) + c². The area of the second square is given by (a+b)² or 4(½ab) + a² + b² ... Subtracting equals from both sides we have a² + b² = c².' Triangle area ½bh: OpenStax Prealgebra 2e §9.4."},
        {"id": "f5", "claim": "The middle shape is a true square: its four sides are each a hypotenuse c, and at each of its corners the two triangles' acute angles (x and y) and the square's corner make a straight line, 180°. The acute angles of a right triangle add up to 90° (the three angles of a triangle add up to 180°, one is 90°), so the corner is 180° − 90° = 90°. On screen: 'x + y = 90°' and 'so this corner is 90° too'.",
         "source": "OpenStax Prealgebra 2e §9.3: 'For any ΔABC, the sum of the measures of the angles is 180°' and 'A right triangle has one 90° angle'. NRICH 'Pythagoras Proofs' solution, which points out this step (Lewis's diagram, 'x + y = 90°') as the piece a proof by this picture must not leave out."},
        {"id": "f6", "claim": "It holds only for right triangles: when the angle between a and b is obtuse, the square on the third side is larger than a² + b²; when it is acute, smaller (Euclid's geometric form of the law of cosines). The film says 'any right triangle', rings the right angle, and writes 'right triangles only' in the recap; the proof needs the right angle in f5.",
         "source": "Euclid, Elements II.12 and II.13 (Joyce, Clark University, mathcs.clarku.edu/~djoyce/elements/bookII/propII12.html and propII13.html); Joyce's note to I.47: 'Propositions II.12 and II.13 consider triangles other than right triangles ... geometric forms of the law of cosines.'"},
        {"id": "f7", "claim": "The proof uses nothing but the legs a and b of one right triangle and four copies of it, so it works for every right triangle, flat or tall. The film's two other triangles are drawn with legs 64 and 296 px (flat) and 250 and 110 px (tall); their pairs follow the same two moves.",
         "source": "NRICH 'Pythagoras Proofs' (as f4): the proof is written for general a, b, c; the mini figures are computed in storyboard.build.py."},
    ],
    "acts": [
        {"id": "hook", "title": "The question", "goal": "The rule everyone memorised, and why it always works.", "rail": False},
        {"id": "square", "title": "Squared = square", "goal": "a² is a real square: its area is a times a.", "rail": False},
        {"id": "count", "title": "3-4-5", "goal": "Count one case: 9 + 16 = 25, then ask about every other triangle.", "rail": False},
        {"id": "proof", "title": "The proof", "goal": "Four identical triangles in a square of side a + b, moved: the leftover space is c², then a² + b².", "rail": False},
        {"id": "general", "title": "Every right triangle", "goal": "The same moves work for any right triangle, flat or tall.", "rail": False},
        {"id": "answer", "title": "The answer", "goal": "The leftover space only changes shape; then the bridge into the first line.", "rail": False},
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
