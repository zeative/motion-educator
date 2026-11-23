"""Writes storyboard.json for "Kenapa jantung berdetak makin cepat waktu kamu lari?" (portrait 1080 x 1920, the Pixel template).

The sample film of the Pixel visual template: a retro game screen (a 270 x 480 canvas scaled up four times with hard
edges, the PICO-8 palette, sprites, a HUD at the top and a typed dialogue box at the bottom), held at 12 frames a
second. The film is cut to one take of narration, so the times here are only a guess until the take retimes the board:

    python3 examples/jantung-berlari/storyboard.build.py && node kit/tools/storyboard.mjs examples/jantung-berlari --png

The physiology is cardiac output = heart rate x stroke volume, with the textbook's worked numbers for a healthy young
adult (OpenStax Anatomy & Physiology, 19.4): at rest 75 beats a minute x 70 mL = 5.25 L a minute; running hard, about
150 beats x 130 mL = 19.5 L a minute. Every HUD value, bottle, beat tick and blood block drawn below is computed from
those numbers, not drawn by eye. Every coordinate is in screen pixels and snaps to the 4 px game pixel.

The sources were read through web search results (quoted passages); openstax.org and med.libretexts.org could not be
opened from the session that wrote this board, so the OpenStax wording should be checked on the page before release.
"""
import json
import math
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
shots = []

# ── The numbers ──────────────────────────────────────────────────────────────────────────────────────────────────
HR_REST, SV_REST = 75, 70  # beats a minute, mL a beat
HR_RUN, SV_RUN = 150, 130
CO_REST = HR_REST * SV_REST / 1000  # 5.25 L a minute
CO_RUN = HR_RUN * SV_RUN / 1000  # 19.5 L a minute
RATIO = CO_RUN / CO_REST  # 3.71: "hampir empat kali lipat"
MAX_HR_20 = 220 - 20  # 200: the AHA estimate for a 20-year-old; 150 is 75 % of it (the vigorous zone, 70-85 %)
STRIP_S = 4  # s12: a strip four seconds long
BEATS_REST = HR_REST / 60 * STRIP_S  # 5 beats
BEATS_RUN = HR_RUN / 60 * STRIP_S  # 10 beats
assert (CO_REST, CO_RUN) == (5.25, 19.5) and 3.7 < RATIO < 3.75 and (BEATS_REST, BEATS_RUN) == (5, 10)
assert 0.70 <= HR_RUN / MAX_HR_20 <= 0.85
dec = lambda v: f"{v:g}".replace(".", ",")  # Indonesian decimal comma: 5,25

# ── The palette (PICO-8) and the frame (1080 x 1920: the 270 x 480 canvas at 4 px a game pixel) ─────────────────
P = {"navy": "#1d2b53", "plum": "#7e2553", "green": "#008751", "brown": "#ab5236", "dark": "#5f574f", "grey": "#c2c3c7",
     "cream": "#fff1e8", "red": "#ff004d", "orange": "#ffa300", "yellow": "#ffec27", "lime": "#00e436", "sky": "#29adff",
     "lav": "#83769c", "pink": "#ff77a8", "peach": "#ffccaa", "black": "#000000"}
INK = "#26262b"
HUD = (60, 236, 1020, 332)  # the HUD bar, inside the safe area
GROUND = 1100


def fr(at, note, *draw):
    flat = []
    for d in draw:
        flat.extend(d if isinstance(d, list) else [d])
    return {"at": at, "note": note, "draw": flat}


def label(x, y, text, size=44, **more):
    return {"label": [x, y], "text": text, "size": size, **more}


def box(x0, y0, x1, y1, colour=P["navy"], width=6, fill=None):
    d = f"M{x0} {y0}H{x1}V{y1}H{x0}Z"
    return {"path": d, "colour": colour, "width": width, **({"fill": fill} if fill else {})}


def window(x0, y0, x1, y1):
    """A game window: a cream border inside a navy one (the dialogue box and the insets)."""
    return [box(x0, y0, x1, y1, P["navy"], 7, fill=P["navy"]), box(x0 + 12, y0 + 12, x1 - 12, y1 - 12, INK, 4)]


def merged(segs, horizontal):
    """Joins touching edge segments of a pixel outline into longer strokes."""
    out, key = [], (lambda s: (s[1], s[0])) if horizontal else (lambda s: (s[0], s[1]))
    for s in sorted(segs, key=key):
        if out and (out[-1][1] == s[1] and out[-1][0] + out[-1][2] == s[0] if horizontal else out[-1][0] == s[0] and out[-1][1] + out[-1][2] == s[1]):
            out[-1][2] += s[2]
        else:
            out.append(list(s))
    return "".join(f"M{x} {y}h{n}" if horizontal else f"M{x} {y}v{n}" for x, y, n in out)


def raster(inside, x0, y0, x1, y1, cell=16, colour=INK, fill=None, width=5):
    """Any shape, rasterised to whole cells and drawn as its pixel outline (and a tint): how the film draws it."""
    cols, rows = int((x1 - x0) // cell), int((y1 - y0) // cell)
    on = [[inside(x0 + (i + 0.5) * cell, y0 + (j + 0.5) * cell) for i in range(cols)] for j in range(rows)]
    hs, vs, runs = [], [], []
    for j in range(rows):
        for i in range(cols):
            if not on[j][i]:
                continue
            X, Y = x0 + i * cell, y0 + j * cell
            if j == 0 or not on[j - 1][i]:
                hs.append((X, Y, cell))
            if j == rows - 1 or not on[j + 1][i]:
                hs.append((X, Y + cell, cell))
            if i == 0 or not on[j][i - 1]:
                vs.append((X, Y, cell))
            if i == cols - 1 or not on[j][i + 1]:
                vs.append((X + cell, Y, cell))
        i = 0
        while i < cols:
            if on[j][i]:
                k = i
                while k < cols and on[j][k]:
                    k += 1
                runs.append(f"M{x0 + i * cell} {y0 + j * cell}h{(k - i) * cell}v{cell}h{-(k - i) * cell}Z")
                i = k
            else:
                i += 1
    out = []
    if fill and runs:
        out.append({"path": "".join(runs), "colour": fill, "fill": fill, "width": 0})
    if hs:
        out.append({"path": merged(hs, True) + merged(vs, False), "colour": colour, "width": width})
    return out


def sprite(rows, x, y, k, keys):
    """A sprite from strings of palette letters, each letter a solid k x k pixel ('.' is clear)."""
    out = {}
    for j, row in enumerate(rows):
        i = 0
        while i < len(row):
            c = row[i]
            if c == ".":
                i += 1
                continue
            n = 1
            while i + n < len(row) and row[i + n] == c:
                n += 1
            out.setdefault(c, []).append(f"M{x + i * k + k / 2:g} {y + j * k + k / 2:g}h{(n - 1) * k:g}")
            i += n
    return [{"path": "".join(d), "colour": keys[c], "width": k} for c, d in out.items()]


# ── Shapes ───────────────────────────────────────────────────────────────────────────────────────────────────────
def ellipse(cx, cy, a, b, deg=0):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return lambda x, y: (((x - cx) * c + (y - cy) * s) / a) ** 2 + ((-(x - cx) * s + (y - cy) * c) / b) ** 2 <= 1


def capsule(x0, y0, x1, y1, r):
    def inside(x, y):
        dx, dy = x1 - x0, y1 - y0
        t = max(0, min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)))
        return math.hypot(x - (x0 + t * dx), y - (y0 + t * dy)) <= r
    return inside


def union(*fs):
    return lambda x, y: any(f(x, y) for f in fs)


def heart_fn(cx, cy, s):
    """The real heart from the front, simplified: the ventricles' cone with its apex down and to the viewer's right
    (the body's left), the right atrium at the upper left with the superior vena cava above it, the left atrium peeking
    out at the upper right, the pulmonary trunk rising in front, and the aortic arch with its three branches."""
    u = lambda x: (x - cx) / s
    v = lambda y: (y - cy) / s
    vent = union(ellipse(cx + 0.03 * s, cy + 0.12 * s, 0.36 * s, 0.29 * s, 40), ellipse(cx + 0.17 * s, cy + 0.27 * s, 0.20 * s, 0.12 * s, 50))
    atria = union(ellipse(cx - 0.25 * s, cy - 0.05 * s, 0.15 * s, 0.17 * s), ellipse(cx + 0.21 * s, cy - 0.10 * s, 0.12 * s, 0.09 * s))
    svc = lambda x, y: -0.31 <= u(x) <= -0.20 and -0.46 <= v(y) <= -0.10
    ac = (0.12, -0.30)

    def arch(x, y):
        r = math.hypot(u(x) - ac[0], v(y) - ac[1])
        return v(y) <= ac[1] and 0.055 <= r <= 0.15
    ascending = lambda x, y: -0.03 <= u(x) <= 0.065 and -0.30 <= v(y) <= -0.02
    descending = lambda x, y: 0.175 <= u(x) <= 0.27 and -0.30 <= v(y) <= -0.16
    branches = lambda x, y: any(abs(u(x) - bx) <= 0.022 and -0.58 <= v(y) <= -0.42 for bx in (0.04, 0.12, 0.20))
    pulmonary = capsule(cx - 0.07 * s, cy - 0.02 * s, cx - 0.15 * s, cy - 0.30 * s, 0.065 * s)
    return union(vent, atria, svc, arch, ascending, descending, branches, pulmonary)


def heart(cx, cy, s, cell=None, cut=False, squeeze=False):
    """A big heart sprite: red, with a darker plum step on the lower right (lit from the top left).
    cut=True opens the left ventricle (the blood inside it, in red). squeeze=True is the contracted drawing."""
    k = 0.92 if squeeze else 1.0
    cell = cell or (8 if s <= 420 else 12)
    shape = heart_fn(cx, cy, s * k)
    box_ = (cx - 0.5 * s, cy - 0.62 * s, cx + 0.5 * s, cy + 0.5 * s)
    out = raster(shape, *box_, cell, P["plum"], P["red"], 5)
    out += raster(lambda x, y: shape(x, y) and (x - cx) + (y - cy) > 0.30 * s, *box_, cell, P["plum"], P["plum"], 3)
    if cut:
        out += raster(ellipse(cx + 0.10 * s, cy + 0.13 * s, 0.19 * s * (0.65 if squeeze else 1), 0.095 * s, 40), cx - 0.2 * s, cy - 0.1 * s, cx + 0.42 * s, cy + 0.4 * s, cell, P["navy"], P["red"], 6)
    return out


HEART_ICON = ["..rrr...rrr..", ".rrwrr.rrrrr.", "rrwwrrrrrrrrr", "rrwrrrrrrrrrr", "rrrrrrrrrrrrr", ".rrrrrrrrrrr.", "..rrrrrrrrr..", "...rrrrrrr...", "....rrrrr....", ".....rrr.....", "......r......"]
RUNNER = [  # 16 x 32 game pixels: hair, face, red shirt, navy shorts, legs and shoes; two frames of the run cycle
    ["......kkkk......", ".....kkkkkk.....", "....kkkkkkkk....", "....kkeeeeek....", "....keeeekee....", "....keeeeeee....", ".....eeeeee.....", "......eeee......",
     ".......ee.......", ".....rrrrrr.....", "....rrrrrrrr....", "...errrrrrrre...", "..ee.rrrrrr.ee..", ".ee..rrrrrr..e..", ".....rrrrrr.....", ".....rrrrrr.....",
     ".....nnnnnn.....", ".....nnnnnn.....", "....nnn..nnn....", "....nn....nn....", "...ee......ee...", "...ee.......ee..", "..ee........ee..", "..ee.........ee.",
     ".ee..........ee.", ".ee...........ee", "www...........ww", "www............."],
    ["......kkkk......", ".....kkkkkk.....", "....kkkkkkkk....", "....kkeeeeek....", "....keeeekee....", "....keeeeeee....", ".....eeeeee.....", "......eeee......",
     ".......ee.......", ".....rrrrrr.....", "....rrrrrrrr....", "....errrrrre....", "....eerrrree....", ".....errrre.....", ".....rrrrrr.....", ".....rrrrrr.....",
     ".....nnnnnn.....", ".....nnnnnn.....", "......nnnn......", "......neen......", "......eee.......", "......eee.......", ".....eeee.......", ".....ee.ee......",
     ".....ee..ee.....", "....ee....ee....", "....ww....ww....", "................"],
]
SITTING = ["......kkkk......", ".....kkkkkk.....", "....kkkkkkkk....", "....kkeeeeek....", "....keeeekee....", "....keeeeeee....", ".....eeeeee.....", "......eeee......",
           ".......ee.......", ".....rrrrrr.....", "....rrrrrrrr....", "....errrrrre....", "....e.rrrr.e....", "....e.rrrr.e....", ".....nnnnnnnnn..", ".....nnnnnnnnn..",
           "............ee..", "............ee..", "............ee..", "............ee..", "...........www.."]
KEYS = {"k": P["black"], "e": P["peach"], "r": P["red"], "n": P["navy"], "w": P["cream"], "o": P["orange"], "y": P["yellow"], "s": P["sky"], "b": P["brown"]}
QBLOCK = ["oooooooooooo", "oyyyyyyyyyyo", "oyyykkkkyyyo", "oyykyyyykyyo", "oyyyyyyykyyo", "oyyyyyykyyyo", "oyyyyykyyyyo", "oyyyyykyyyyo", "oyyyyyyyyyyo", "oyyyyykyyyyo", "oyyyyyyyyyyo", "oooooooooooo"]


def hud(bpm=None, right=None, extra=None):
    """The HUD bar: the heart icon and the beats-per-minute counter on the left, a second counter on the right."""
    out = [box(*HUD, P["navy"], 7, fill=P["navy"]), *sprite(HEART_ICON, 84, 262, 4, {"r": P["red"], "w": P["cream"]})]
    if bpm is not None:
        out.append(label(150, 304, f"{bpm} BPM", 56, align="start"))
    if right:
        out.append(label(996, 304, right, 50, align="end"))
    if extra:
        out.append(label(600, 304, extra, 52, colour=P["red"]))
    return out


def dialog(line1, key=None):
    """The dialogue box the captions are typed into (two or three words at a time; the key word in the accent)."""
    out = [box(60, 1300, 1020, 1452, P["navy"], 7, fill=P["navy"]), box(72, 1312, 1008, 1440, INK, 4), label(96, 1366, line1, 50, align="start")]
    if key:
        out.append(label(96, 1426, key, 50, align="start", colour=P["red"]))
    return out


def park(scroll=0):
    """The side-scrolling park: stepped hills, two trees, the running track and the grass, in whole pixels."""
    hills = raster(lambda x, y: y > 930 + 50 * math.sin((x + scroll) / 120) + 30 * math.sin((x + scroll) / 47), 60, 820, 1020, 1040, 16, P["green"], P["lime"], 5)
    trees = []
    for tx in (180 - scroll % 400, 900 - scroll % 400):
        if 100 < tx < 980:
            trees += raster(union(ellipse(tx, 880, 74, 66), lambda x, y, tx=tx: abs(x - tx) < 18 and 900 < y < 1040), tx - 96, 800, tx + 96, 1040, 16, P["green"], P["green"], 5)
    track = raster(lambda x, y: True, 60, 1040, 1020, 1104, 16, P["brown"], P["peach"], 4)
    grass = [{"path": "M60 1104H1020", "colour": P["green"], "width": 6}] + [{"path": "".join(f"M{x} 1150h8" for x in range(80, 1000, 48)), "colour": P["green"], "width": 6}]
    return hills + trees + track + grass


def runner(x, y=GROUND, frame=0):
    """The player: 16 x 28 game pixels at 4 px each, feet on y."""
    rows = RUNNER[frame]
    return sprite(rows, x, y - len(rows) * 4, 4, KEYS)


def inset(content):
    """The game inset window above the runner, with a leader down to the runner's chest."""
    return [*window(200, 372, 880, 812), *content, {"path": "M540 812V900H404V996", "colour": P["navy"], "width": 5, "dashed": True}]


def bottle(x, y, level, w=96, h=220):
    """A one-litre bottle, filled to `level` (0 to 1): the liquid is computed, never drawn by eye."""
    neck = w * 0.36
    out = [{"path": f"M{x + (w - neck) / 2:g} {y}h{neck:g}v{h * 0.14:g}l{(w - neck) / 2:g} {h * 0.1:g}V{y + h:g}H{x}V{y + h * 0.24:g}l{(w - neck) / 2:g} {-h * 0.1:g}Z", "colour": P["navy"], "width": 5}]
    if level > 0:
        top = y + h - (h * 0.74) * level
        out.append({"path": f"M{x + 8} {top:g}H{x + w - 8}V{y + h - 6}H{x + 8}Z", "colour": P["red"], "fill": P["red"], "width": 3})
    return out


def bottles(x, y, litres, per_row=5, w=60, h=136, gap=16, row_gap=24):
    out = []
    n = math.ceil(litres)
    for i in range(n):
        level = min(1, litres - i)
        out += bottle(x + (i % per_row) * (w + gap), y + (i // per_row) * (h + row_gap), level, w, h)
    return out


def body_map(cx=540):
    """The runner as a level map: a big silhouette (head, torso, arms, legs) with the heart in the chest and the thighs."""
    sil = union(ellipse(cx, 470, 78, 86), capsule(cx, 560, cx, 600, 30), capsule(cx - 70, 640, cx + 70, 640, 70), capsule(cx - 60, 700, cx + 60, 860, 92),
                capsule(cx - 140, 640, cx - 190, 900, 34), capsule(cx + 140, 640, cx + 190, 900, 34), capsule(cx - 64, 930, cx - 84, 1240, 46), capsule(cx + 64, 930, cx + 84, 1240, 46))
    out = raster(sil, cx - 260, 368, cx + 260, 1296, 16, P["navy"], P["peach"], 5)
    out += raster(union(capsule(cx - 66, 960, cx - 76, 1080, 30), capsule(cx + 66, 960, cx + 76, 1080, 30)), cx - 130, 920, cx + 130, 1120, 8, P["plum"], P["red"], 4)
    out += raster(heart_fn(cx + 36, 680, 118), cx - 60, 580, cx + 120, 770, 8, P["plum"], P["red"], 4)
    return out


ARTERY = "M576 700V940M540 940H576M540 940L470 980V1080M576 940L610 980V1080"


def cells(points, r=40):
    """Red blood cells (discs with a dimple), each carrying an oxygen pixel."""
    out = []
    for x, y in points:
        out += raster(ellipse(x, y, r * 1.6, r), x - r * 2, y - r * 1.5, x + r * 2, y + r * 1.5, 8, P["plum"], P["red"], 4)
        out.append({"path": f"M{x + r * 0.4:g} {y - r * 1.1:g}h24v24h-24Z", "colour": P["sky"], "fill": P["sky"], "width": 8})
        out.append({"path": f"M{x - r * 0.7:g} {y}h{r * 1.4:g}", "colour": P["plum"], "width": 6})
    return out


def o2(points):
    return [{"path": "".join(f"M{x} {y}h24v24h-24Z" for x, y in points), "colour": P["sky"], "fill": P["sky"], "width": 8}]


def fibres(shrink=0):
    """Muscle fibres: five long red cylinders with their striations, and the capillary along the top."""
    out = []
    for y in (620, 740, 860, 980, 1100):
        out += raster(capsule(150 + shrink, y, 930 - shrink, y, 48), 96, y - 56, 984, y + 56, 16, P["plum"], P["red"], 5)
        out.append({"path": "".join(f"M{x} {y - 28}v56" for x in range(200 + shrink, 900 - shrink, 56)), "colour": P["plum"], "width": 5})
    out += raster(capsule(100, 524, 980, 524, 24), 60, 492, 1020, 560, 8, P["plum"], P["red"], 4)
    return out


def leg(stride=0):
    """The player's leg in cutaway, from the side, running to the right: the thigh angled forward from the hip to the
    knee, the shin back down to the foot; inside, the thigh bone, the big muscle in front (quadriceps, red) and the
    one behind (hamstrings, plum), the kneecap."""
    hip, knee, ankle = (420, 470), (700 - stride, 860), (560 - stride, 1190)
    dx, dy = knee[0] - hip[0], knee[1] - hip[1]
    n = math.hypot(dx, dy)
    d, fwd = (dx / n, dy / n), (dy / n, -dx / n)  # along the thigh; its front (up and to the right)
    at = lambda base, a, b: (base[0] + d[0] * a + fwd[0] * b, base[1] + d[1] * a + fwd[1] * b)
    skin = union(capsule(*hip, *knee, 118), capsule(*knee, *ankle, 74), capsule(ankle[0], ankle[1] + 20, ankle[0] + 150, ankle[1] + 40, 34))
    out = raster(skin, 220, 340, 920, 1296, 16, P["navy"], P["peach"], 5)
    out += raster(capsule(*at(hip, 30, -8), *at(knee, -30, -8), 24), 300, 400, 800, 940, 16, P["dark"], P["cream"], 4)
    out += raster(capsule(*at(hip, 50, 56 + stride * 0.3), *at(knee, -70, 52 + stride * 0.3), 52 + stride * 0.15), 300, 380, 860, 940, 16, P["plum"], P["red"], 5)
    out += raster(capsule(*at(hip, 70, -66), *at(knee, -80, -62), 44), 260, 420, 820, 940, 16, P["plum"], P["plum"], 4)
    out += raster(ellipse(*at(knee, -10, 92), 30, 22), knee[0] - 40, knee[1] - 160, knee[0] + 160, knee[1] + 40, 8, P["dark"], P["cream"], 4)
    return out


def tag(x, y, text, tx, ty, colour=INK, size=42):
    """A pixel tag with its leader: the label sits by the thing it names."""
    return [label(x, y, text, size, colour=colour), {"path": f"M{tx} {ty}L{x} {y + 14}", "colour": colour, "width": 5}]


def ecg(x0, x1, y, beats):
    """A heartbeat trace across a strip of STRIP_S seconds: one spike per beat, placed at its real time."""
    d = f"M{x0} {y}"
    span = x1 - x0
    for k in range(int(beats)):
        bx = x0 + span * (k + 0.5) / beats
        d += f"H{bx - 24:g}l12 -12l12 80l12 -140l12 72H{bx + 40:g}"
    return {"path": d + f"H{x1}", "colour": P["red"], "width": 7}


# ── The script, cut into shots (one take; the take sets the times) ────────────────────────────────────────────────
t = 0.0


def shot(id, act, type_, voice, **more):
    global t
    said = voice.replace("*", "")
    dur = round(max(1.5, len(said) / 15.5 + 0.25), 2)  # a guess at the take: the finished examples ran at 14 to 15 characters a second
    shots.append({"id": id, "act": act, "type": type_, "start": round(t, 3), "end": round(t + dur, 3), "voice": voice, **more})
    t += dur


shot("s01", "hook", "wide", "Jantung kamu langsung *ngebut* begitu kamu mulai lari.",
     teaches="The everyday fact the film explains: your heart races as soon as you run.",
     screen="The game screen. A side-scrolling park in pixels: sky-blue sky, three layers of stepped hills (green and lime), two trees, a peach running track with a brown edge, grass below. The player sprite (16 x 28 game pixels: black hair, peach skin, red shirt, navy shorts, cream shoes) runs on the track at x 360. Above it a game inset window (navy with a cream border) shows its real heart from the front (ventricles, right atrium, aortic arch with three branches, plum outline, red fill, two shade steps lit from the top left), pumping; a dotted pixel leader runs from the inset down to the player's chest. HUD at the top: the heart icon and '150 BPM' in yellow on navy.",
     motion="Frame 0 is finished. The park scrolls left in whole pixels (hills 1 px a step, trees 2: parallax); the player runs on a two-frame cycle at 12 fps; the heart in the inset squeezes on every beat at 150 a minute (2.5 beats a second: the squeezed sprite on the beat, the relaxed one between) and the HUD heart icon blinks with it.",
     carries="The park, the player and the inset.", transition="The game pauses: the scroll stops and a dither dims the screen.",
     sound="The chiptune bed starts at 150 BPM, its kick on the heartbeat; 8-bit footstep blips.", check="Frame 0 reads at a glance as a game: player, heart, HUD, dialogue box. 150 is the HUD value.", facts=["f3", "f7"],
     frames=[fr(0, "Frame 0 is finished: the park, the player mid-stride, the heart in the inset, HUD 150 BPM, the dialogue box.", park(), runner(360), inset(heart(540, 610, 380)), hud(HR_RUN), dialog("JANTUNG KAMU")),
             fr(0.5, "The heart squeezes on the beat; the park scrolls left behind the player (parallax).", park(40), runner(360, frame=1), inset(heart(540, 610, 380, squeeze=True)), hud(HR_RUN), {"move": [960, 760, 720, 760], "text": "latar geser"}, dialog("LANGSUNG", "NGEBUT")),
             fr(1, "Still running; 'MULAI LARI' types into the box.", park(80), runner(360), inset(heart(540, 610, 380)), hud(HR_RUN), dialog("BEGITU KAMU", "MULAI LARI"), {"cut": "game di-pause"})])

shot("s02", "hook", "type", "Kok bisa, padahal kamu nggak nyuruh?",
     teaches="Asks the question: nobody told the heart to speed up, so what did?",
     screen="The same park, paused: a checkerboard dither of navy pixels over it (no gradient), HUD shows 'PAUSE'. A question block (12 x 12 game pixels, yellow with an orange rim and a black '?') bounces above the player's head; big pixel lettering 'KOK BISA?' across the middle in cream, the '?' in the accent red.",
     motion="The dither lays in two steps; the block drops 8 px, bounces up 4 and settles (on twelves); the lettering types on letter by letter.",
     carries="The player, frozen mid-stride.", transition="A pixel dissolve (random 4 px squares) into the player's thigh.",
     sound="The bed ducks to a held chord; a pause 'bloop'; a block-bump blip.", check="The question reads in under a second, all in whole pixels.",
     frames=[fr(0, "Paused: dither over the park, HUD 'PAUSE'.", park(80), runner(360), hud(None, None, "PAUSE"), {"path": "".join(f"M{x} {y}h8" for y in range(372, 1290, 48) for x in range(76 + (y // 48 % 2) * 24, 1010, 48)), "colour": P["navy"], "width": 8}, dialog("KOK BISA,", "PADAHAL KAMU")),
             fr(1, "The question block over the player; 'KOK BISA?' typed on.", park(80), runner(360), hud(None, None, "PAUSE"), sprite(QBLOCK, 368, 880, 8, KEYS), {"title": [540, 640], "text": "KOK BISA?", "size": 120, "accent": "?"}, dialog("NGGAK", "NYURUH?"), {"cut": "pixel dissolve ke paha"})])

shot("s03", "otot", "diagram", "Jawabannya ada di *otot* kaki kamu.",
     teaches="Where the answer starts: the working leg muscles.",
     screen="A cutaway sprite of the player's leg from the side, running to the right, filling the middle (x 220 to 920, y 340 to 1290): peach skin with a navy outline, the thigh angled forward from the hip to the knee and the shin back down to the foot; inside the thigh the bone (cream, grey outline), the big muscle in front (quadriceps, red, plum striations) and the one behind (hamstrings, plum), the kneecap. Pixel tag 'OTOT PAHA' in the accent with a leader to the front muscle. HUD stays: '150 BPM'.",
     motion="The pixel dissolve resolves the leg; the leg swings through a stride on four drawings (the knee 40 px back and forth); the front muscle thickens 4 px each time it pulls.",
     carries="The thigh muscle.", transition="Pixel dissolve into the muscle's fibres.",
     sound="A soft 8-bit 'zoom' blip on the dissolve; a squelchy blip on each pull.", check="The leg reads as a real leg in cutaway (bone, muscle in front and behind, kneecap), not an icon.", facts=["f4"],
     frames=[fr(0, "The dissolve resolves into the leg cutaway, big: bone, front and back muscles.", hud(HR_RUN), leg(), {"path": "".join(f"M{x} {y}h16v16h-16Z" for x, y in ((300, 400), (780, 520), (860, 900), (260, 1100), (700, 1240), (900, 700))), "colour": P["navy"], "fill": P["navy"], "width": 4}, label(860, 420, "dissolve", 36), dialog("JAWABANNYA", "ADA DI")),
             fr(1, "The front muscle pulls as the knee swings; tag 'OTOT PAHA'.", hud(HR_RUN), leg(40), tag(860, 480, "OTOT PAHA", 640, 620, P["red"], 54), {"move": [760, 960, 700, 960], "text": "ayun"}, dialog("OTOT", "KAKI KAMU"), {"cut": "dissolve ke serat otot"})])

shot("s04", "otot", "ui", "Otot yang kerja keras butuh *oksigen* jauh lebih banyak,",
     teaches="Working muscle uses far more oxygen than resting muscle.",
     screen="Inside the thigh muscle: five long red fibres stacked across the frame (x 100 to 980, y 570 to 1150) with plum striations, a capillary along the top (y 524). Oxygen is sky-blue pixels (6 x 6 game pixels), tagged 'O2'. Under the HUD a game status window: 'OTOT PAHA' and a warning 'O2 RENDAH!' that blinks red like a low-health alarm (no bar and no number: the shot claims only 'more').",
     motion="The fibres contract and relax on twos (32 px shorter each pull); O2 pixels hop down from the capillary into the fibres and blink out as they are used, faster with every pull; the warning blinks at 4 a second.",
     carries="The fibres and the capillary.", transition="The camera scrolls left along the capillary in whole pixels, out to the artery that feeds it.",
     sound="A low-health beeping (two-note square wave) under the bed; tiny blips as O2 is used.", check="The O2 pixels are visibly used up; the warning has no fake number.", facts=["f4"],
     frames=[fr(0, "Relaxed fibres; O2 pixels drop from the capillary into them.", hud(HR_RUN), fibres(), o2([(300, 580), (520, 700), (760, 580), (420, 820), (640, 940)]), {"move": [600, 470, 600, 590], "text": "O2 masuk"}, tag(860, 470, "O2", 772, 580, P["sky"], 56), dialog("OTOT YANG", "KERJA KERAS")),
             fr(0.5, "A pull: the fibres shorten; most O2 pixels have blinked out, used.", hud(HR_RUN), fibres(32), o2([(520, 700)]), {"move": [130, 1220, 190, 1220], "text": "tarik"}, {"move": [950, 1220, 890, 1220]}, dialog("BUTUH", "OKSIGEN")),
             fr(1, "The status window: 'O2 RENDAH!' blinking red.", hud(HR_RUN), fibres(), *window(60, 352, 1020, 476), label(100, 434, "OTOT PAHA", 48, align="start"), label(980, 434, "O2 RENDAH!", 54, align="end", colour=P["red"]), dialog("JAUH LEBIH", "BANYAK"), {"cut": "geser ke pembuluh"})])

shot("s05", "otot", "diagram", "dan oksigen itu cuma diantar lewat *darah*.",
     teaches="Oxygen only reaches the muscle in the blood, carried by red blood cells.",
     screen="A wide artery across the frame (x 60 to 840, y 600 to 980): stepped plum walls, dark red inside. Red blood cells (discs 20 x 12 game pixels with a plum dimple) ride along it, each carrying a sky-blue O2 pixel; at the right the artery opens into the muscle block (x 840 to 1020, red, striated). Pixel tags 'SEL DARAH MERAH' and 'O2' with leaders. HUD '150 BPM'.",
     motion="The cells flow left to right in whole pixels (8 px a step), tumbling on two drawings; at the muscle each drops its O2 pixel, which hops into the fibres.",
     carries="The artery and its cells.", transition="A screen wipe (8 px columns, left to right) to the whole body as a map.",
     sound="A soft whooshing pulse on each heartbeat; a coin blip each time an O2 pixel is delivered.", check="Labels sit on the cell and the O2 pixel; flow is left to right.", facts=["f5"],
     frames=[fr(0, "The artery; cells enter from the left, each with an O2 pixel.", hud(HR_RUN), raster(lambda x, y: 600 <= y <= 980, 60, 584, 840, 996, 16, P["plum"], P["plum"], 6), raster(lambda x, y: True, 840, 480, 1020, 1100, 20, P["plum"], P["red"], 5), cells([(140, 790), (330, 720), (470, 880)]), {"move": [160, 540, 520, 540], "text": "aliran"}, dialog("DAN OKSIGEN", "ITU")),
             fr(0.5, "The cells halfway; tags on a cell and on its O2 pixel.", hud(HR_RUN), raster(lambda x, y: 600 <= y <= 980, 60, 584, 840, 996, 16, P["plum"], P["plum"], 6), raster(lambda x, y: True, 840, 480, 1020, 1100, 20, P["plum"], P["red"], 5), cells([(300, 790), (490, 720), (630, 880)]), tag(300, 470, "SEL DARAH MERAH", 300, 760, INK, 50), tag(640, 1120, "O2", 670, 860, P["sky"], 60), dialog("CUMA DIANTAR", "LEWAT")),
             fr(1, "At the muscle the O2 pixels hop off into the fibres.", hud(HR_RUN), raster(lambda x, y: 600 <= y <= 980, 60, 584, 840, 996, 16, P["plum"], P["plum"], 6), raster(lambda x, y: True, 840, 480, 1020, 1100, 20, P["plum"], P["red"], 5), cells([(560, 790), (740, 720)]), o2([(900, 640), (940, 820), (880, 960)]), {"move": [780, 600, 900, 620], "text": "O2 lepas"}, dialog("DARAH", None), {"cut": "wipe ke peta badan"})])

shot("s06", "otot", "wide", "Nah, yang mompa darah itu *jantung*.",
     teaches="The heart is the pump that sends that blood.",
     screen="The player's body as a level map: a big pixel silhouette (peach, navy outline) standing in the middle (x 280 to 800, y 380 to 1290), the real heart in the chest (to the viewer's right of the middle, plum and red), the thigh muscles red; the main artery drawn as a red pixel path from the heart down the middle and into both thighs, blood cells moving down it like a convoy on a game map. Tag 'JANTUNG' in the accent with a leader to the heart; 'OTOT' on a thigh. Not to scale: said on screen, small.",
     motion="The wipe reveals the map column by column; the heart squeezes on each beat; the convoy steps down the path, one cell every beat.",
     carries="The body map with its heart.", transition="Pixel wipe back to the park, where the player sits down on a bench.",
     sound="A map 'ding' as the heart lights up; a pulse thump per beat.", check="The heart sits in the chest, slightly to the body's left; the path leads to the thighs.", facts=["f5"],
     frames=[fr(0, "The wipe reveals the body map, column by column.", hud(HR_RUN), body_map(), {"move": [100, 360, 980, 360], "text": "wipe"}, dialog("NAH, YANG", "MOMPA DARAH")),
             fr(1, "The heart lights; the convoy runs down the artery to the thighs; tags.", hud(HR_RUN), body_map(), {"path": ARTERY, "colour": P["red"], "width": 10}, o2([(570, 800), (570, 880), (480, 1000), (604, 1000)]),
                tag(860, 560, "JANTUNG", 640, 660, P["red"], 52), tag(860, 1160, "OTOT", 650, 1040, INK, 46), label(200, 1270, "bukan skala", 30), dialog("ITU", "JANTUNG"), {"cut": "wipe ke taman"})])

shot("s07", "santai", "wide", "Waktu santai, jantung berdetak sekitar *tujuh puluh lima* kali semenit,",
     teaches="At rest the heart beats about 75 times a minute.",
     screen="Back in the park, the scroll stopped: the player sits on a brown pixel bench at the left of the track, breathing (two frames). The inset window shows the same real heart beating slowly. HUD: the counter reads '75 BPM'.",
     motion="The wipe brings the park back; the heart squeezes once every 0.8 s (75 a minute), the HUD icon blinking with it; the player's shoulders rise and fall on twelves.",
     carries="The inset heart.", transition="Pixel dissolve into the heart, opened up.",
     sound="The bed drops to half-time (the kick on every other beat: 75 a minute) with a lazy arpeggio; a soft thump per beat.", check="The HUD reads 75; the beat in the inset is half the opening's rate.", facts=["f1", "f2"],
     frames=[fr(0, "The wipe brings back the park, still; the player sits on a bench.", park(80), sprite(SITTING, 320, 1016, 4, KEYS), {"path": "M300 1060h160M310 1060v40M450 1060v40", "colour": P["brown"], "width": 10}, inset(heart(540, 610, 380)), hud(HR_REST), {"move": [980, 1200, 100, 1200], "text": "wipe"}, dialog("WAKTU", "SANTAI")),
             fr(0.5, "One slow beat in the inset; HUD 75 BPM.", park(80), sprite(SITTING, 320, 1016, 4, KEYS), {"path": "M300 1060h160M310 1060v40M450 1060v40", "colour": P["brown"], "width": 10}, inset(heart(540, 610, 380, squeeze=True)), hud(HR_REST), dialog("JANTUNG", "BERDETAK")),
             fr(1, "Relaxed again; 'TUJUH PULUH LIMA' in the box.", park(80), sprite(SITTING, 320, 1016, 4, KEYS), {"path": "M300 1060h160M310 1060v40M450 1060v40", "colour": P["brown"], "width": 10}, inset(heart(540, 610, 380)), hud(HR_REST), dialog("TUJUH PULUH", "LIMA KALI"), {"cut": "dissolve ke jantung"})])

shot("s08", "santai", "diagram", "tiap detak mompa kurang lebih tujuh puluh mililiter.",
     teaches="Each beat pushes out about 70 mL of blood: the stroke volume.",
     screen="The heart big in the middle (x 200 to 880, y 380 to 1180), opened: the left ventricle's cavity shown full of red blood. On the beat it squeezes and a pixel block of blood leaves up through the aortic valve into the aorta and out of the top of the frame; the tag '70 mL / DETAK' rides beside the block. HUD '75 BPM'.",
     motion="Relaxed (filled) on one drawing, squeezed on the next (the walls step in 8 px), the block rising up the aorta in whole pixels; then it fills again.",
     carries="The heart, opened.", transition="The block rises out of the top; cut to the sum on a game screen.",
     sound="A thick 8-bit 'thump' on the squeeze and a rising blip as the block leaves.", check="The block is labelled 70 mL; the valve is at the top of the ventricle, into the aorta.", facts=["f2"],
     frames=[fr(0, "The heart opened, the ventricle full.", hud(HR_REST), heart(540, 820, 620, cut=True), tag(900, 1000, "VENTRIKEL KIRI", 640, 900, INK, 38), dialog("TIAP DETAK", "MOMPA")),
             fr(0.5, "The squeeze: the walls step in; a block of blood goes up the aorta.", hud(HR_REST), heart(540, 820, 620, cut=True, squeeze=True), {"path": "M520 560h64v64h-64Z", "colour": P["red"], "fill": P["red"], "width": 6}, {"move": [700, 700, 700, 500], "text": "keluar"}, {"move": [880, 900, 800, 880]}, {"move": [260, 900, 340, 880]}, dialog("KURANG LEBIH", "TUJUH PULUH")),
             fr(1, "The block leaves the top with its tag; the ventricle refills.", hud(HR_REST), heart(540, 820, 620, cut=True), {"path": "M520 380h64v64h-64Z", "colour": P["red"], "fill": P["red"], "width": 6}, label(780, 430, "70 mL / DETAK", 48, colour=P["red"]), dialog("MILILITER", None), {"cut": "ke layar hitungan"})])

shot("s09", "santai", "chart", "Totalnya kira-kira *lima liter* darah per menit.",
     teaches=f"Heart rate x stroke volume = cardiac output: {HR_REST} x {SV_REST} mL = {dec(CO_REST)} L a minute.",
     screen=f"A score screen: the sum in pixel lettering, '{HR_REST} × {SV_REST} mL' and '= {dec(CO_REST)} L / MENIT' (the result in the accent). Under it six one-litre pixel bottles in a row: five full of red and the sixth filled a quarter, so the bottles show {dec(CO_REST)} L exactly. HUD: '{HR_REST} BPM' and on the right '{dec(CO_REST)} L/MNT'.",
     motion="The sum types on like a score tally; the bottles fill one after another with a coin blip each, the last to a quarter; the HUD's right counter appears at its value.",
     carries="The bottles and the HUD.", transition="Screen wipe to the body map: the player stands up and starts to run.",
     sound="A coin blip per litre; a tally 'ding' on the result.", check=f"Five and a quarter bottles; {HR_REST} x {SV_REST} = {HR_REST * SV_REST} mL = {dec(CO_REST)} L.", facts=["f2"],
     frames=[fr(0, "The sum types on like a score tally: 75 × 70 mL.", hud(HR_REST), label(540, 520, f"{HR_REST} × {SV_REST} mL", 96), label(540, 650, f"= {dec(CO_REST)} L / MENIT", 76, colour=P["red"]), dialog("TOTALNYA", "KIRA-KIRA")),
             fr(0.5, "The bottles fill, one coin blip each.", hud(HR_REST), label(540, 520, f"{HR_REST} × {SV_REST} mL", 96), label(540, 650, f"= {dec(CO_REST)} L / MENIT", 76, colour=P["red"]), sum([bottle(96 + i * 152, 860, 1 if i < 3 else 0, 112, 300) for i in range(6)], []), {"move": [96, 820, 520, 820], "text": "1 botol = 1 L"}, dialog("LIMA LITER", None)),
             fr(1, "Five bottles and a quarter; the HUD's right counter reads 5,25 L/MNT.", hud(HR_REST, f"{dec(CO_REST)} L/MNT"), label(540, 520, f"{HR_REST} × {SV_REST} mL", 96), label(540, 650, f"= {dec(CO_REST)} L / MENIT", 76, colour=P["red"]), sum([bottle(96 + i * 152, 860, min(1, CO_REST - i), 112, 300) for i in range(6)], []), {"bracket": [96, 96 + 5 * 152 + 112 * 0.25, 1220], "text": f"{dec(CO_REST)} L"}, dialog("DARAH", "PER MENIT"), {"cut": "wipe ke peta badan"})])

shot("s10", "gas", "diagram", "Begitu kamu lari, otot ngirim *sinyal* ke otak,",
     teaches="Running starts a signal: sensors in the working muscles and joints report to the brain.",
     screen="The body map again (the silhouette, heart and thighs), now with a nerve drawn as a dotted yellow pixel line from each thigh up the spine to the brain (a plum pixel blob in the head). Yellow signal sparks (2 x 2 game pixels) travel up it. Tags 'SINYAL' by the sparks and 'OTAK' by the head. HUD '75 BPM' for now.",
     motion="The thighs flash on each stride; sparks step up the nerve in whole pixels, 8 px a frame; the brain lights (a 1-pixel cream rim) when they arrive.",
     carries="The body map.", transition="Pixel dissolve onto the heart, the nerve still coming in from the top left.",
     sound="Rising 8-bit arpeggio blips as the sparks climb; a bright 'ping' when they reach the brain.", check="The sparks go up, from the legs to the head.", facts=["f6"],
     frames=[fr(0, "The body map; the thighs flash.", hud(HR_REST), body_map(), {"path": "M476 1060V920L540 900V560", "colour": P["orange"], "width": 6, "dashed": True}, label(300, 1100, "lari!", 46, colour=P["red"]), dialog("BEGITU KAMU", "LARI")),
             fr(0.5, "Sparks climb the nerve from the thighs.", hud(HR_REST), body_map(), {"path": "M476 1060V920L540 900V560", "colour": P["orange"], "width": 6, "dashed": True}, {"move": [400, 1040, 400, 640], "text": "sinyal"}, {"path": "M532 820h16v16h-16ZM532 740h16v16h-16Z", "colour": P["yellow"], "fill": P["yellow"], "width": 8}, dialog("OTOT", "NGIRIM SINYAL")),
             fr(1, "The brain lights; tags 'SINYAL' and 'OTAK'.", hud(HR_REST), body_map(), {"path": "M476 1060V920L540 900V560", "colour": P["orange"], "width": 6, "dashed": True}, raster(ellipse(540, 450, 56, 40), 470, 400, 610, 500, 8, P["plum"], P["pink"], 4), tag(840, 420, "OTAK", 596, 450, INK, 50), tag(220, 760, "SINYAL", 528, 760, P["orange"], 44), dialog("KE OTAK", None), {"cut": "dissolve ke jantung"})])

shot("s11", "gas", "diagram", "dan otak nyuruh jantung *ngegas* lewat saraf.",
     teaches="The brain answers through the heart's nerves: the pacemaker (SA node) fires faster and the muscle squeezes harder.",
     screen="The heart big again (as in s08, closed), the nerve entering from the top left as a dotted yellow pixel line to a spark at the top of the right atrium: the heart's own pacemaker, tagged 'PACU ALAMI (NODUS SA)'. A yellow pixel 'GAS!' pops beside it. HUD: '75' turns to '150 BPM' on the beat the spark lands.",
     motion="A spark runs down the nerve in whole pixels; the pacemaker flashes; from then the heart squeezes twice as often (the squeezed sprite every 0.4 s); a small screen shake (2 px) on the first fast beat.",
     carries="The heart, now fast.", transition="Cut to two beat strips.",
     sound="A power-up jingle as the spark lands; the bed snaps back to full time (150 BPM).", check="The spark goes to the top of the right atrium (the viewer's upper left of the heart); the HUD changes in one step, 75 to 150.", facts=["f3", "f6"],
     frames=[fr(0, "The heart; a spark comes down the nerve from the top left.", hud(HR_REST), heart(560, 860, 600), {"path": "M80 400L200 520H300V680", "colour": P["orange"], "width": 6, "dashed": True}, {"move": [160, 440, 300, 640], "text": "saraf"}, dialog("DAN OTAK", "NYURUH JANTUNG")),
             fr(0.5, "The spark reaches the pacemaker; it flashes; tag.", hud(HR_REST), heart(560, 860, 600), {"path": "M80 400L200 520H300V680", "colour": P["orange"], "width": 6, "dashed": True}, {"path": "M300 684h24v24h-24Z", "colour": P["yellow"], "fill": P["yellow"], "width": 10}, tag(540, 420, "PACU ALAMI (NODUS SA)", 324, 684, INK, 40), dialog("NGEGAS", None)),
             fr(1, "'GAS!' pops; the heart squeezes fast; HUD 150 BPM.", hud(HR_RUN), heart(560, 860, 600, squeeze=True), {"path": "M300 684h24v24h-24Z", "colour": P["yellow"], "fill": P["yellow"], "width": 10}, label(880, 560, "GAS!", 90, colour=P["red"]), {"move": [880, 760, 800, 800]}, {"move": [240, 1000, 320, 960]}, dialog("LEWAT SARAF", None), {"cut": "dua jalur detak"})])

STRIP = (120, 960)
shot("s12", "gas", "compare", "Detaknya naik sampai sekitar *seratus lima puluh* kali semenit.",
     teaches=f"The rate doubles: {HR_REST} to about {HR_RUN} beats a minute (in four seconds, {BEATS_REST:g} beats become {BEATS_RUN:g}).",
     screen=f"Two beat strips, one above the other, each four seconds wide (x {STRIP[0]} to {STRIP[1]}): top 'SANTAI {HR_REST} BPM' with {BEATS_REST:g} pixel heartbeat spikes; bottom 'LARI {HR_RUN} BPM' with {BEATS_RUN:g}. Each spike is placed at its real time. A bracket '4 DETIK' under both; '×2' in the accent. HUD '{HR_RUN} BPM'.",
     motion="Each trace draws left to right in whole pixels like a game monitor, at the same speed, so the bottom one lays down twice as many spikes; the bracket and '×2' pop on the end.",
     carries="The two strips.", transition="The strips slide up; two blood blocks rise in their place.",
     sound="A monitor blip per spike (the bottom strip blips twice as often).", check=f"Spikes: {BEATS_REST:g} and {BEATS_RUN:g} in the same 4 s width.", facts=["f1", "f3", "f8"],
     frames=[fr(0, "The resting strip: five spikes in four seconds.", hud(HR_RUN), label(STRIP[0], 520, f"SANTAI · {HR_REST} BPM", 44, align="start"), ecg(STRIP[0], STRIP[1], 660, BEATS_REST), dialog("DETAKNYA", "NAIK")),
             fr(0.5, "The running strip draws, twice as many spikes.", hud(HR_RUN), label(STRIP[0], 520, f"SANTAI · {HR_REST} BPM", 44, align="start"), ecg(STRIP[0], STRIP[1], 660, BEATS_REST), label(STRIP[0], 860, f"LARI · {HR_RUN} BPM", 44, align="start", colour=P["red"]), ecg(STRIP[0], 540, 1000, BEATS_RUN / 2), {"move": [560, 1100, 900, 1100], "text": "garis jalan"}, dialog("SEKITAR", "SERATUS")),
             fr(1, "Both strips full; bracket '4 DETIK'; '×2'.", hud(HR_RUN), label(STRIP[0], 520, f"SANTAI · {HR_REST} BPM", 44, align="start"), ecg(STRIP[0], STRIP[1], 660, BEATS_REST), label(STRIP[0], 860, f"LARI · {HR_RUN} BPM", 44, align="start", colour=P["red"]), ecg(STRIP[0], STRIP[1], 1000, BEATS_RUN), {"bracket": [STRIP[0], STRIP[1], 1200], "text": "4 DETIK"}, label(940, 860, "×2", 80, colour=P["red"], align="end"), dialog("LIMA PULUH", "KALI SEMENIT"), {"cut": "blok darah"})])

BLOCK_PX = 5  # px of block height a mL
shot("s13", "gas", "diagram", "Tiap detak juga makin *kuat*:",
     teaches="The same nerves make each squeeze stronger, not only more frequent.",
     screen="The heart big again, closed (as in s11), the pacemaker still lit: on the beat its walls step in twice as far as in s08 (16 px, not 8) and a bigger pixel block of blood leaves up the aorta. Pixel tag 'LEBIH KUAT' in the accent by the squeezing wall, with two pairs of pixel squeeze marks. HUD '150 BPM'.",
     motion="Relaxed, then the hard squeeze on the next drawing (the walls in 16 px), a 2 px screen shake, the block rising; twice in the shot, at 150 a minute.",
     carries="The block of blood leaving the heart.", transition="The block drops onto a floor and becomes the right-hand bar of the comparison.",
     sound="A heavier 8-bit thump than s08's, with a crunchy square-wave edge.", check="The squeeze is visibly deeper than s08's; the block is bigger.", facts=["f3", "f6"],
     frames=[fr(0, "The heart relaxed and full, the pacemaker still lit.", hud(HR_RUN), heart(540, 820, 620, cut=True), {"path": "M276 640h24v24h-24Z", "colour": P["yellow"], "fill": P["yellow"], "width": 10}, dialog("TIAP DETAK", "JUGA")),
             fr(1, "The hard squeeze: walls far in, a bigger block up the aorta, tag 'LEBIH KUAT'.", hud(HR_RUN), heart(540, 820, 560, cut=True, squeeze=True), {"path": "M508 440h88v88h-88Z", "colour": P["red"], "fill": P["red"], "width": 6}, {"move": [900, 880, 800, 860]}, {"move": [200, 900, 300, 880]}, label(860, 660, "LEBIH KUAT", 52, colour=P["red"]), dialog("MAKIN", "KUAT"), {"cut": "blok darah jatuh"})])

shot("s13b", "gas", "compare", "sekitar seratus tiga puluh mililiter.",
     teaches=f"Each beat is also stronger: the stroke volume rises from about {SV_REST} to {SV_RUN} mL.",
     screen=f"Two blocks of blood made of pixel rows, standing on one floor (y 1200): left 'SANTAI' {SV_REST} mL ({SV_REST * BLOCK_PX} px tall), right 'LARI' {SV_RUN} mL ({SV_RUN * BLOCK_PX} px tall), both 240 px wide; over each a small heart sprite, the right one with squeeze lines. Values in pixel lettering on the blocks.",
     motion="The left block stacks up row by row; then the right one, higher, one row a frame (12 fps), stopping at its value; a 2 px shake when it lands.",
     carries="The two blocks.", transition="Cut to the score screen.",
     sound="A rising square-wave sweep as the right block stacks; a thud on landing.", check=f"Block heights {SV_REST * BLOCK_PX} and {SV_RUN * BLOCK_PX} px: {SV_REST} : {SV_RUN}.", facts=["f3", "f6"],
     frames=[fr(0, "The resting block stacks up: 70 mL.", hud(HR_RUN), raster(lambda x, y: True, 200, 1200 - SV_REST * BLOCK_PX, 440, 1200, 16, P["plum"], P["red"], 5), label(320, 1256, "SANTAI", 48), label(320, 1200 - SV_REST * BLOCK_PX - 30, f"{SV_REST} mL", 52, colour=P["red"]), {"path": "M120 1200H960", "colour": INK, "width": 6}, dialog("SEKITAR", "SERATUS")),
             fr(0.5, "The running block stacks higher.", hud(HR_RUN), raster(lambda x, y: True, 200, 1200 - SV_REST * BLOCK_PX, 440, 1200, 16, P["plum"], P["red"], 5), raster(lambda x, y: True, 640, 1200 - SV_RUN * BLOCK_PX // 2, 880, 1200, 16, P["plum"], P["red"], 5), {"move": [960, 1120, 960, 640], "text": "naik"}, label(320, 1256, "SANTAI", 48), label(760, 1256, "LARI", 48), {"path": "M120 1200H960", "colour": INK, "width": 6}, dialog("SERATUS TIGA", "PULUH")),
             fr(1, "Both blocks at their values; labels; a heart over each.", hud(HR_RUN), raster(lambda x, y: True, 200, 1200 - SV_REST * BLOCK_PX, 440, 1200, 16, P["plum"], P["red"], 5), raster(lambda x, y: True, 640, 1200 - SV_RUN * BLOCK_PX, 880, 1200, 16, P["plum"], P["red"], 5),
                label(320, 1256, "SANTAI", 48), label(760, 1256, "LARI", 48), label(320, 1200 - SV_REST * BLOCK_PX - 30, f"{SV_REST} mL", 52, colour=P["red"]), label(760, 1200 - SV_RUN * BLOCK_PX - 30, f"{SV_RUN} mL", 52, colour=P["red"]), {"path": "M120 1200H960", "colour": INK, "width": 6},
                sprite(HEART_ICON, 294, 1200 - SV_REST * BLOCK_PX - 140, 4, {"r": P["red"], "w": P["cream"]}), sprite(HEART_ICON, 734, 1200 - SV_RUN * BLOCK_PX - 140, 4, {"r": P["red"], "w": P["cream"]}), dialog("MILILITER", None), {"cut": "layar skor"})])

shot("s14", "gas", "chart", "Hasilnya, hampir *dua puluh liter* darah per menit.",
     teaches=f"{HR_RUN} x {SV_RUN} mL = {dec(CO_RUN)} L a minute, against {dec(CO_REST)} at rest.",
     screen=f"The score screen again: '{HR_RUN} × {SV_RUN} mL = {dec(CO_RUN)} L / MENIT'. Under it two groups of one-litre bottles, five to a row: left 'SANTAI' {dec(CO_REST)} bottles (five full, one a quarter), right 'LARI' {dec(CO_RUN)} bottles (nineteen full, one half). HUD: '{HR_RUN} BPM' and '{dec(CO_RUN)} L/MNT'.",
     motion="The sum tallies on; the right group fills bottle by bottle, a coin blip each, faster and faster; the HUD's right counter changes once to its value.",
     carries="The bottles.", transition="Pixel wipe back to the running park.",
     sound="A run of coin blips that speeds up; a 'level up' chord on the result.", check=f"Bottles {dec(CO_REST)} and {dec(CO_RUN)}; {HR_RUN} x {SV_RUN} = {HR_RUN * SV_RUN} mL.", facts=["f2", "f3"],
     frames=[fr(0, "The running sum tallies on; the resting bottles stay.", hud(HR_RUN, f"{dec(CO_REST)} L/MNT"), label(540, 470, f"{HR_RUN} × {SV_RUN} mL", 90), label(540, 590, f"= {dec(CO_RUN)} L / MENIT", 72, colour=P["red"]), bottles(96, 680, CO_REST, w=56, h=110), label(244, 1000, "SANTAI", 44), dialog("HASILNYA", None)),
             fr(0.5, "The running group fills, bottle by bottle.", hud(HR_RUN, f"{dec(CO_REST)} L/MNT"), label(540, 470, f"{HR_RUN} × {SV_RUN} mL", 90), label(540, 590, f"= {dec(CO_RUN)} L / MENIT", 72, colour=P["red"]), bottles(96, 680, CO_REST, w=56, h=110), bottles(588, 680, 11, w=56, h=110), {"move": [588, 650, 940, 650], "text": "terisi"}, dialog("HAMPIR", "DUA PULUH")),
             fr(1, "Nineteen and a half bottles; HUD 19,5 L/MNT.", hud(HR_RUN, f"{dec(CO_RUN)} L/MNT"), label(540, 470, f"{HR_RUN} × {SV_RUN} mL", 90), label(540, 590, f"= {dec(CO_RUN)} L / MENIT", 72, colour=P["red"]), bottles(96, 680, CO_REST, w=56, h=110), bottles(588, 680, CO_RUN, w=56, h=110), label(244, 1000, "SANTAI", 44), label(736, 1270, "LARI", 44), dialog("LITER DARAH", "PER MENIT"), {"cut": "wipe ke taman"})])

shot("s15", "gas", "wide", "Nyaris empat kali lipat, semuanya buat ngantar oksigen ke otot.",
     teaches=f"Nearly four times as much blood ({dec(CO_RUN)} / {dec(CO_REST)} = {RATIO:.1f}), and it is all for the oxygen the muscles need.",
     screen=f"The running park again, scrolling. The inset window now shows the artery into the thigh with a dense stream of red cells, each with its O2 pixel, pouring into the muscle; under the stream, inside the inset, the status reads 'O2 OK' in lime and '≈ {dec(round(RATIO, 1))}× DARAH' in the accent; the HUD reads '{dec(CO_RUN)} L/MNT'.",
     motion="Scroll and run cycle as in s01; in the inset the cells stream at twice s05's rate, O2 pixels hopping off into the fibres; 'O2 RENDAH!' is replaced by 'O2 OK'.",
     carries="The park, the player and the inset.", transition="The screen freezes into the summary panel.",
     sound="The full bed back; coin blips as O2 is delivered.", check=f"'≈ {dec(round(RATIO, 1))}×' agrees with {dec(CO_RUN)} / {dec(CO_REST)}; the status reads OK.", facts=["f3", "f4"],
     frames=[fr(0, "Back in the running park; the inset shows the stream of cells into the muscle.", park(120), runner(360), inset([*raster(lambda x, y: 560 <= y <= 700, 232, 544, 720, 716, 16, P["plum"], P["plum"], 5), *raster(lambda x, y: True, 720, 400, 848, 740, 16, P["plum"], P["red"], 5), *cells([(300, 630), (420, 630), (540, 630), (660, 630)], 22)]), hud(HR_RUN, f"{dec(CO_RUN)} L/MNT"), dialog("NYARIS EMPAT", "KALI LIPAT")),
             fr(0.5, "The cells pour into the muscle; O2 pixels hop off.", park(160), runner(360, frame=1), inset([*raster(lambda x, y: 560 <= y <= 700, 232, 544, 720, 716, 16, P["plum"], P["plum"], 5), *raster(lambda x, y: True, 720, 400, 848, 740, 16, P["plum"], P["red"], 5), *cells([(340, 630), (460, 630), (580, 630)], 22), *o2([(760, 520), (780, 660), (800, 580)])]), hud(HR_RUN, f"{dec(CO_RUN)} L/MNT"), {"move": [300, 460, 680, 460], "text": "deras"}, dialog("SEMUA BUAT", "NGANTAR")),
             fr(1, "'O2 OK' replaces the warning; '≈ 3,7× DARAH' under the stream.", park(200), runner(360), inset([*raster(lambda x, y: 560 <= y <= 700, 232, 544, 720, 716, 16, P["plum"], P["plum"], 5), *raster(lambda x, y: True, 720, 400, 848, 740, 16, P["plum"], P["red"], 5), *cells([(300, 630), (420, 630), (540, 630), (660, 630)], 22)]), hud(HR_RUN, f"{dec(CO_RUN)} L/MNT"), label(700, 772, f"≈ {dec(round(RATIO, 1))}× DARAH", 46, align="end", colour=P["red"]), label(236, 772, "O2 OK", 46, align="start", colour=P["green"]), dialog("OKSIGEN", "KE OTOT"), {"cut": "panel rangkuman"})])

row1 = [*raster(capsule(150, 600, 380, 600, 56), 80, 528, 452, 672, 16, P["plum"], P["red"], 5), {"path": "".join(f"M{x} 572v56" for x in range(190, 360, 40)), "colour": P["plum"], "width": 5}, *o2([(400, 540), (430, 620)]), label(500, 622, "OTOT BUTUH O2", 60, align="start")]
row2 = [*raster(ellipse(170, 840, 72, 52), 88, 780, 252, 900, 8, P["plum"], P["pink"], 4), {"path": "M244 860H300V900", "colour": P["orange"], "width": 7, "dashed": True}, *heart(380, 890, 180), label(500, 880, "SARAF: GAS!", 60, align="start")]
row3 = [*heart(200, 1130, 180), *bottle(330, 1040, 1, 70, 170), label(500, 1150, f"{dec(CO_REST)} → {dec(CO_RUN)} L", 60, align="start", colour=P["red"])]
shot("s16", "recap", "recap", "Jadi otot minta *oksigen*, dan jantung ngebut buat ngirimnya.",
     teaches="The answer in one frame: muscles ask for oxygen, nerves tell the heart, the heart pumps nearly four times the blood.",
     screen=f"A game summary panel (navy window, cream border) over the frozen park, filling the frame between the HUD and the dialogue box, title 'JADI:' in the accent and three rows, each a small sprite and its words: 1 'OTOT BUTUH O2' (a red muscle fibre with sky O2 pixels), 2 'SARAF: GAS!' (the brain, a yellow dotted nerve, the heart), 3 '{dec(CO_REST)} → {dec(CO_RUN)} L' (the heart and a red bottle, the numbers in the accent).",
     motion="The panel drops in (stepped, 3 drawings); each row types on with a blip, one per phrase of the voice.",
     carries="The frozen park behind the panel.", transition="The panel slides up out of the frame in whole pixels; the game unpauses.",
     sound="Three menu blips; a short victory arpeggio.", check="Readable with the sound off: the three steps in order, each with its picture.", facts=["f2", "f3", "f4", "f6"],
     frames=[fr(0, "The panel drops in; row 1: the muscle wants oxygen.", hud(HR_RUN, f"{dec(CO_RUN)} L/MNT"), *window(60, 352, 1020, 1280), label(540, 456, "JADI:", 84, colour=P["red"]), *row1,
                dialog("JADI OTOT", "MINTA OKSIGEN")),
             fr(0.5, "Row 2: the nerve tells the heart to speed up.", hud(HR_RUN, f"{dec(CO_RUN)} L/MNT"), *window(60, 352, 1020, 1280), label(540, 456, "JADI:", 84, colour=P["red"]), *row1, *row2, dialog("DAN JANTUNG", "NGEBUT")),
             fr(1, "Row 3: nearly four times the blood a minute.", hud(HR_RUN, f"{dec(CO_RUN)} L/MNT"), *window(60, 352, 1020, 1280), label(540, 456, "JADI:", 84, colour=P["red"]), *row1, *row2, *row3, dialog("BUAT", "NGIRIMNYA"), {"cut": "panel naik, game jalan"})])

shot("s17", "recap", "wide", "Dan itulah kenapa",
     teaches="The bridge back into the first line.",
     screen="The panel slides up and away: the running park, the player at x 360, the inset heart pumping, HUD '150 BPM', the same pixels as frame 0.",
     motion="The panel leaves in whole-pixel steps; the scroll and the run cycle resume, landing on the opening's scroll position a moment before frame 0.",
     carries="Into s01.", transition="No cut: the film loops straight into s01.",
     sound="The bed runs on into the opening.", check="The last frame matches frame 0 (check.mjs SSIM).", facts=["f3"],
     frames=[fr(0, "The panel slides up and away; the game unpauses.", park(200), runner(360), inset(heart(540, 610, 380)), hud(HR_RUN), {"move": [540, 1200, 540, 420], "text": "panel naik"}, dialog("DAN ITULAH", "KENAPA")),
             fr(1, "The opening picture, a moment before frame 0.", park(), runner(360), inset(heart(540, 610, 380)), hud(HR_RUN), dialog("DAN ITULAH", "KENAPA"), {"cut": "loop ke s01"})])

duration = round(shots[-1]["end"], 3)

storyboard = {
    "title": "Kenapa jantung makin cepat waktu kamu lari?",
    "question": "Kenapa jantung kita langsung berdetak makin cepat begitu kita lari, padahal kita nggak nyuruh?",
    "audience": "Orang Indonesia yang nonton video pendek, dari anak SMP sampai orang dewasa. Mereka pernah ngerasain dada deg-degan habis lari atau naik tangga, tapi belum tahu apa yang nyuruh jantung ngebut dan apa gunanya.",
    "promise": "Waktu kamu lari, otot butuh oksigen jauh lebih banyak; saraf nyuruh jantung berdetak dua kali lebih cepat dan memompa lebih kuat, jadi darah yang dipompa per menit naik hampir empat kali lipat (dari sekitar 5 jadi hampir 20 liter) untuk ngantar oksigen itu.",
    "template": "pixel",
    "language": "id",
    "format": "1080x1920",
    "captions": "pop",
    "duration": duration,
    "fps": 60,
    "standard": 3,
    "loop": {"line": "Dan itulah kenapa / jantung kamu langsung ngebut begitu kamu mulai lari.", "picture": "The summary panel slides up off the running park: the player at x 360, the inset heart pumping, HUD 150 BPM, the same pixels and scroll position as frame 0."},
    "voice": {"voice_id": "GdyFAZdMpKMBHw5pc1Bu", "name": "Livna", "model": "eleven_v4", "language": "id", "direction": "[warmly]"},
    "look": {
        "accent": P["red"],
        "mood": "The Pixel template: a retro game screen, a 270 x 480 canvas scaled up four times with hard edges, every shape rasterised at that one pixel size (no sprite is scaled up, so no mixed pixel sizes). The PICO-8 palette only: sky-blue sky, green and lime hills, navy HUD and windows with cream borders, flat colours with two or three shade steps lit from the top left, dithering instead of gradients. Red (#ff004d, the palette's red) is the accent and means the heart and its blood throughout; sky blue always means oxygen; yellow means a nerve signal. HUD at the top (beats a minute, litres a minute, at their real values), the action in the middle, the dialogue box at the bottom with the captions typed in (pop captions: two or three words, the key word red). Everything held at 12 frames a second; faint scanlines, no blur, no bloom. Note for the build: film.css sets --accent to #ff004d, because template.json's default accent (#ff4d6d) is not one of the template's sixteen colours.",
    },
    "music": {
        "track": "Composed for this film (ElevenLabs Music, music/bed.mp3)",
        "bpm": HR_RUN,
        "note": f"A chiptune bed composed for the film (square-wave lead, triangle bass, noise-channel drums, as the template's Sound line asks) at {HR_RUN} BPM, so its kick is the running heartbeat; it drops to a half-time feel ({HR_REST} a minute: the resting heart) under s07 to s10 and snaps back to full time when the pacemaker fires in s11. It ducks under the pause (s02) and lifts on the summary. Effects per shot, all 8-bit: footstep blips (s01, s15, s17), a pause bloop and a block bump (s02), a zoom blip on each pixel dissolve, a low-health beep (s04), coin blips for each O2 delivered and each litre filled (s05, s09, s14, s15), a thump on each heartbeat, a rising arpeggio for the nerve signal (s10), a power-up jingle (s11), monitor blips per spike (s12), a level-up chord (s14), menu blips and a short victory arpeggio (s16). The cuts follow the take.",
    },
    "facts": [
        {"id": "f1", "claim": f"A normal resting heart rate for adults is 60 to 100 beats a minute (well-trained people can be lower). The film uses {HR_REST} beats a minute as its resting example, the textbook's worked value.",
         "source": "American Heart Association, 'Target Heart Rates Chart' (heart.org/en/healthy-living/fitness/fitness-basics/target-heart-rates): resting heart rate 60-100 bpm; OpenStax, Anatomy & Physiology 2e, 19.4 'Cardiac Physiology' (normal resting HR 60-100 bpm)."},
        {"id": "f2", "claim": f"Cardiac output (blood pumped by a ventricle each minute) = heart rate x stroke volume. At rest a stroke volume of about 70 mL is typical: {HR_REST} x {SV_REST} mL = {HR_REST * SV_REST} mL = {dec(CO_REST)} L a minute (normal range 4 to 8 L a minute). The film says 'sekitar tujuh puluh lima', 'kurang lebih tujuh puluh mililiter' and 'kira-kira lima liter', and shows '{dec(CO_REST)} L' as five and a quarter one-litre bottles.",
         "source": "OpenStax, Anatomy & Physiology 2e (Betts et al.), 19.4 'Cardiac Physiology': CO = HR x SV, worked example 75 bpm x 70 mL = 5.25 L/min, resting CO 4.0-8.0 L/min (same text in Indiana University 'Human Physiology' Pressbooks, 'Cardiac output')."},
        {"id": "f3", "claim": f"In healthy young people the heart rate may rise to 150 beats a minute or more during exercise, and the stroke volume from about 70 to about 130 mL through stronger contraction: {HR_RUN} x {SV_RUN} mL = {HR_RUN * SV_RUN} mL = {dec(CO_RUN)} L a minute. {dec(CO_RUN)} / {dec(CO_REST)} = {RATIO:.2f}, which the film says as 'nyaris empat kali lipat' and shows as '≈ {dec(round(RATIO, 1))}×' (the textbook itself rounds this to '4-5 times the resting rate'; the film keeps the lower, computed figure). Real values vary with age, size, sex and fitness; trained endurance athletes reach higher outputs.",
         "source": "OpenStax, Anatomy & Physiology 2e, 19.4 'Cardiac Physiology': 'In healthy young individuals, HR may increase to 150 bpm or higher during exercise. SV can also increase from 70 to approximately 130 mL due to increased strength of contraction. This would increase CO to approximately 19.5 L/min'. Read through search results quoting the Lumen Learning and Indiana University Pressbooks copies of the same text: openstax.org and med.libretexts.org could not be opened from this session (their hosts are not on its network allowlist)."},
        {"id": "f4", "claim": "During physical activity the muscles use more oxygen than at rest, and aerobic activity makes the heart beat faster than usual. The film shows no number for the muscle's oxygen use, only 'jauh lebih banyak' and a low-oxygen warning.",
         "source": "NIH National Heart, Lung, and Blood Institute, 'Physical Activity and Your Heart' (nhlbi.nih.gov/health/heart/physical-activity)."},
        {"id": "f5", "claim": "Red blood cells pick up oxygen in the lungs and carry it in the blood to the body's tissues; the left side of the heart pumps this oxygen-rich blood out through the aorta to the body. Simplification: the film shows one artery from the heart to the thighs and one O2 pixel per cell; it does not show the lungs.",
         "source": "NHLBI, 'How the Heart Works' (nhlbi.nih.gov/health/heart/blood-flow); U.S. National Library of Medicine, 'Circulation Station' (nlm.nih.gov/exhibition/changing-the-face-of-medicine/resources/circulation-station.html)."},
        {"id": "f6", "claim": "In exercise, receptors in muscles, joints and tendons (proprioreceptors) fire more often; the cardiovascular centres in the brainstem respond through the sympathetic cardioaccelerator nerves, which release norepinephrine at the SA node (the heart's natural pacemaker, in the right atrium) and the heart muscle, raising the heart rate and the strength of contraction (and so the stroke volume). Simplification: the film says 'otot ngirim sinyal ke otak, otak nyuruh jantung ngegas lewat saraf'; it leaves out the brain's own command at the start of exercise, adrenaline from the adrenal glands, chemoreceptors, and the extra blood returning to the heart (Frank-Starling).",
         "source": "OpenStax, Anatomy & Physiology 2e, 19.4 'Cardiac Physiology', 'Autonomic Innervation of the Heart' and its table of factors increasing HR and force of contraction (proprioreceptors: 'increased rates of firing during exercise'), read through search results quoting the Lumen Learning copies; BYU-Idaho BIO 265 text, 'Extrinsic regulation' (sympathetic fibres steepen the pacemaker potential)."},
        {"id": "f7", "claim": f"Maximum heart rate is estimated as about 220 minus age; vigorous activity is about 70-85 % of it. For a 20-year-old: 220 - 20 = {MAX_HR_20}, and {HR_RUN} is {HR_RUN / MAX_HR_20:.0%} of it, so the film's {HR_RUN} is an ordinary hard run, not a maximum. (The formula is an estimate; individuals can differ by about 15 bpm.)",
         "source": "American Heart Association, 'Target Heart Rates Chart' (as f1); Harvard Health Publishing, 'All about your heart rate' (on the formula's spread)."},
        {"id": "f8", "claim": f"The beat strips in s12 are four seconds long: {HR_REST} beats a minute is {HR_REST} / 60 x 4 = {BEATS_REST:g} beats, {HR_RUN} is {BEATS_RUN:g}; each spike is drawn at its real time. The blood blocks in s13 are {BLOCK_PX} px a mL ({SV_REST * BLOCK_PX} and {SV_RUN * BLOCK_PX} px), and the bottles in s09 and s14 are one litre each.",
         "source": "Arithmetic from f1 to f3, shown in storyboard.build.py."},
    ],
    "acts": [
        {"id": "hook", "title": "Pertanyaan", "goal": "The everyday fact and the question: who tells the heart to speed up?", "rail": False},
        {"id": "otot", "title": "Otot butuh oksigen", "goal": "Working muscle needs oxygen, oxygen rides in the blood, the heart pumps the blood.", "rail": False},
        {"id": "santai", "title": "Waktu santai", "goal": "The resting numbers: 75 beats x 70 mL = about 5 litres a minute.", "rail": False},
        {"id": "gas", "title": "Waktu lari", "goal": "The signal, the faster and stronger beat, and nearly four times the blood.", "rail": False},
        {"id": "recap", "title": "Jawaban", "goal": "The three steps in one frame, then the bridge into the first line.", "rail": False},
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
