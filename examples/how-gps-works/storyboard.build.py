"""Writes storyboard.json (and geometry.json, which film.js reads) for "How does your phone know where you are?".

The film has no narration: the script is shown as captions (landscape pill subtitles). Each shot lasts as long as
its caption takes to read (0.5 s + 15 characters a second), rounded up to whole beats of the music (86 BPM), so the
cuts sit on the beat:

    python3 examples/how-gps-works/storyboard.build.py && node kit/tools/storyboard.mjs examples/how-gps-works --png

Everything drawn is computed here, in Earth radii (1 = 6 371 km), and written to geometry.json so the film draws the
same numbers: the satellites sit on the GPS orbit (20 200 km up, 26 571 km from the centre); each satellite's sphere
has the true distance from it to you as its radius; the circle where two spheres cross, the two points three of them
leave, and the four points that disagree when the phone's clock is 2 ms fast are solved here (trilateration), not
placed by eye. The 3D layer's camera stands 300 units back with a lens that keeps one unit at UNIT pixels at the
Earth's centre, so the projection below is the film's.
"""
import json
import math
import subprocess
from pathlib import Path

HERE = Path(__file__).parent

# ── The world ────────────────────────────────────────────────────────────────────────────────────────────────
RE = 6371.0  # km, mean Earth radius
ALT = 20200.0  # km, GPS orbit height
A = (ALT + RE) / RE  # 4.1707 Earth radii from the centre
C_KM = 299792.458  # km/s
UNIT = 1080 / (2 * 100 * math.tan(math.radians(15)))  # px per unit at the Earth's plane (kit/engine/stage3d.js)
CAM = 300  # the film moves the 3D camera back to 300 units (same UNIT at z = 0, less distortion)


def add(a, b):
    return [a[i] + b[i] for i in range(3)]


def sub(a, b):
    return [a[i] - b[i] for i in range(3)]


def mul(a, k):
    return [x * k for x in a]


def dot(a, b):
    return sum(a[i] * b[i] for i in range(3))


def cross(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]


def norm(a):
    return math.sqrt(dot(a, a))


def unit(a):
    return mul(a, 1 / norm(a))


# You: on the Earth's face, 18 degrees in front of its top edge, so "up" from you lies in the picture's plane.
P = unit([0, 0.95, 0.31])
EAST = [1.0, 0, 0]
NORTH = cross(P, EAST)


def satellite(az, el):
    """The GPS satellite seen at this azimuth and elevation from you: on the orbit sphere, A Earth radii out."""
    az, el = math.radians(az), math.radians(el)
    d = add(add(mul(EAST, math.cos(el) * math.sin(az)), mul(NORTH, math.cos(el) * math.cos(az))), mul(P, math.sin(el)))
    b, c = 2 * dot(P, d), dot(P, P) - A * A
    rho = (-b + math.sqrt(b * b - 4 * c)) / 2
    return add(P, mul(d, rho))


SKY = [(0, 90), (215, 25), (105, 25), (300, 45)]  # the four satellites: one overhead, three spread over the sky
SATS = [satellite(*s) for s in SKY]
RANGES = [norm(sub(s, P)) for s in SATS]


def trilaterate(centres, radii):
    """The two points at the given distances from three centres."""
    s0, s1, s2 = centres
    ex = unit(sub(s1, s0))
    d = norm(sub(s1, s0))
    i = dot(ex, sub(s2, s0))
    ey = unit(sub(sub(s2, s0), mul(ex, i)))
    ez = cross(ex, ey)
    j = dot(ey, sub(s2, s0))
    r0, r1, r2 = radii
    x = (r0 * r0 - r1 * r1 + d * d) / (2 * d)
    y = (r0 * r0 - r2 * r2 + i * i + j * j) / (2 * j) - i / j * x
    z = math.sqrt(max(0.0, r0 * r0 - x * x - y * y))
    base = add(s0, add(mul(ex, x), mul(ey, y)))
    return [add(base, mul(ez, z)), add(base, mul(ez, -z))]


TWO = trilaterate(SATS[:3], RANGES[:3])
OTHER = max(TWO, key=lambda q: norm(sub(q, P)))  # the second point three spheres leave: far out in space
CLOCK_MS = 2.0  # the example clock error: the phone's clock 2 ms fast
BIAS = -CLOCK_MS / 1000 * C_KM / RE  # every distance 600 km too short, in Earth radii
TRIPLES = [(0, 1, 2), (0, 1, 3), (0, 2, 3), (1, 2, 3)]
WRONG = [min(trilaterate([SATS[k] for k in t], [RANGES[k] + BIAS for k in t]), key=lambda q: norm(sub(q, P))) for t in TRIPLES]


# ── The camera ───────────────────────────────────────────────────────────────────────────────────────────────
def proj(w, c, rpx):
    """Where a world point (Earth radii) lands on screen when the Earth's centre is drawn at c with radius rpx."""
    x = c[0] - 960 + w[0] * rpx
    y = c[1] - 540 - w[1] * rpx
    z = w[2] * rpx / UNIT
    k = CAM / (CAM - z)
    return [round(960 + x * k, 1), round(540 + y * k, 1)]


def centre_for(p_screen, rpx):
    """The Earth's centre on screen that puts you (P) at p_screen (P's own depth ignored: a few pixels)."""
    return [p_screen[0] - P[0] * rpx, p_screen[1] + P[1] * rpx]


# The framings, as (Earth centre on screen, Earth radius in px).
HOOK = ([1330, 1010], 600)  # the real Earth, large, low right; you near its top edge
DIVE = (centre_for([960, 760], 1800), 1800)  # down to you: the horizon across the frame, the phone standing on it
WIDE = ([960, 500], 100)  # the whole constellation, to scale
MECH = ([960, 750], 122)
ALTV = ([960, 760], 105)  # the height of the orbits, side on  # the mechanism: you on top of a small Earth, four satellites around
ZOOM = (centre_for([960, 640], 900), 900)  # close on you: the horizon, and the sky above it

S_M = [proj(s, *MECH) for s in SATS]
P_M = proj(P, *MECH)
OTHER_M = proj(OTHER, *MECH)
P_Z = proj(P, *ZOOM)
WRONG_Z = [proj(q, *ZOOM) for q in WRONG]
R_M = [r * MECH[1] for r in RANGES]  # sphere radii on screen (at the Earth's depth)

# The constellation: six orbital planes 60 degrees apart, inclined 55 degrees, 32 satellites (6 5 5 6 5 5).
PLANES = []
SLOTS = [6, 5, 5, 6, 5, 5]
for k in range(6):
    raan = math.radians(60 * k + 15)
    inc = math.radians(55)
    PLANES.append({"raan": raan, "inc": inc, "n": SLOTS[k], "phase": k * 0.37})


def orbit_point(plane, angle):
    """A point on an orbital plane: the equator is the world's x-z plane, the spin axis is y."""
    x, z = A * math.cos(angle), A * math.sin(angle)
    # incline about the x axis, then turn the node about y
    y, z = z * math.sin(plane["inc"]), z * math.cos(plane["inc"])
    cr, sr = math.cos(plane["raan"]), math.sin(plane["raan"])
    return [x * cr + z * sr, y, -x * sr + z * cr]


def orbit_path(plane, c, rpx):
    pts = [proj(orbit_point(plane, math.radians(a)), c, rpx) for a in range(0, 361, 12)]
    return "M" + " L".join(f"{x:.0f} {y:.0f}" for x, y in pts)


# ── The film reads the same numbers ──────────────────────────────────────────────────────────────────────────
geometry = {
    "note": "Written by storyboard.build.py. Earth radii (1 = 6 371 km); y is up on screen, z toward the camera.",
    "RE": RE, "A": A, "C_KM": C_KM, "CAM": CAM,
    "P": P, "sats": SATS, "ranges": RANGES, "other": OTHER, "bias": BIAS, "clockMs": CLOCK_MS, "triples": TRIPLES, "wrong": WRONG,
    "planes": PLANES,
    "framings": {k: {"c": v[0], "r": v[1]} for k, v in {"HOOK": HOOK, "DIVE": DIVE, "WIDE": WIDE, "MECH": MECH, "ZOOM": ZOOM}.items()},
}
(HERE / "geometry.json").write_text(json.dumps(geometry, indent=1) + "\n")

# ── Drawing helpers ──────────────────────────────────────────────────────────────────────────────────────────
shots = []


BEAT = 60 / 86


def reading(text):
    """Seconds a caption needs: 0.5 s plus 15 characters a second, rounded up to whole beats of the music."""
    chars = len(text.replace("*", ""))
    return math.ceil((0.5 + chars / 15) / BEAT - 1e-6) * BEAT


def shot(id, act, type, length=None, read=None, **fields):
    """Every shot is as long as its words take to read (the caption, or the title it shows), on the beat."""
    start = shots[-1]["end"] if shots else 0
    text = read or (fields.get("caption") or "")
    dur = length if length is not None else reading(text)
    shots.append({"id": id, "act": act, "type": type, "start": round(start, 3), "end": round(start + dur, 3), **fields, "frames": FRAMES[id]})


def fr(at, note, *draw):
    return {"at": at, "note": note, "draw": list(draw)}


def label(x, y, text, size=40, **more):
    return {"label": [round(x), round(y)], "text": text, "size": size, **more}


def earth(framing, light="left"):
    (cx, cy), r = framing
    return {"planet": [round(cx), round(cy), round(r)], "light": light}


def sat_icon(p, size=34):
    x, y = p
    return {"path": f"M{x - size * 2.2:.0f} {y:.0f} H{x + size * 2.2:.0f} M{x - size * 0.5:.0f} {y - size * 0.6:.0f} h{size:.0f} v{size * 1.2:.0f} h{-size:.0f} Z", "colour": "ink", "width": 6}


def sphere(i, framing=MECH, scale=1.0, dashed=False):
    c = proj(SATS[i], *framing)
    return {"ring": [round(c[0]), round(c[1]), round(RANGES[i] * framing[1] * scale)], "colour": "blue", "width": 6, "dashed": dashed}


def you(p, text="you"):
    return [{"dot": [round(p[0]), round(p[1]), 14], "colour": "orange"}, label(p[0] + 70, p[1] + 50, text, 40, colour="orange")]


def ring_path(i, j, framing, bias=0.0, steps=48):
    """The circle where spheres i and j cross, projected."""
    si, sj = SATS[i], SATS[j]
    ri, rj = RANGES[i] + bias, RANGES[j] + bias
    d = norm(sub(sj, si))
    ex = unit(sub(sj, si))
    a = (ri * ri - rj * rj + d * d) / (2 * d)
    rad = math.sqrt(max(0, ri * ri - a * a))
    centre = add(si, mul(ex, a))
    u1 = unit(cross(ex, [0, 0, 1]))
    u2 = cross(ex, u1)
    pts = [proj(add(centre, add(mul(u1, rad * math.cos(t)), mul(u2, rad * math.sin(t)))), *framing) for t in [2 * math.pi * k / steps for k in range(steps + 1)]]
    return {"path": "M" + " L".join(f"{x:.0f} {y:.0f}" for x, y in pts), "colour": "orange", "width": 7}


def constellation(framing):
    out = [earth(framing)]
    for pl in PLANES:
        out.append({"path": orbit_path(pl, *framing), "colour": "white", "width": 3})
        for k in range(pl["n"]):
            p = proj(orbit_point(pl, pl["phase"] + 2 * math.pi * k / pl["n"]), *framing)
            out.append({"dot": [round(p[0]), round(p[1]), 8], "colour": "ink"})
    return out


HOOK_P = proj(P, *HOOK)
Q1, Q2 = "How does your phone", "know where you are?"
TITLE = {"title": [600, 470], "text": f"{Q1}\n{Q2}", "size": 104, "accent": "where you are?"}
MECH_EARTH = earth(MECH)
SATS_M = [sat_icon(p) for p in S_M]
SAT_NAMES = [label(S_M[i][0], S_M[i][1] - 50, f"satellite {i + 1}", 36) for i in range(4)]
PHONE = {"card": [760, 230, 400, 760], "label": "map"}
PIN = {"dot": [960, 560, 22], "colour": "orange"}

FRAMES = {
    "s01": [
        fr(0.0, "Frame 0 is finished: the real Earth fills the lower right, lit from the left; a soft amber dot (you) near its top edge; the question's first line is already in place on the left. Cyan shells are sweeping down over the globe from satellites out of frame.",
           earth(HOOK), *you(HOOK_P, ""), {"ring": [1700, -500, 980], "colour": "blue", "dashed": True}, {"title": [600, 470], "text": Q1, "size": 104},
           {"glow": [1100, 520, 420], "colour": "blue"}, {"camera": "push"}),
        fr(0.5, "The second line lands as it is said, 'where you are?' in the amber of you. A shell passes over the dot; a satellite glides across the top of the frame.",
           earth(HOOK), *you(HOOK_P, ""), {"ring": [1700, -500, 1180], "colour": "blue", "dashed": True}, sat_icon([700, 120], 40), {"move": [560, 120, 980, 150], "text": "satellite drifts"}, TITLE),
        fr(1.0, "The question holds; the camera has begun to dive toward the dot.",
           earth(HOOK), *you(HOOK_P, ""), TITLE, {"move": [1200, 700, HOOK_P[0] - 20, HOOK_P[1] + 40], "text": "dive"}, {"cut": "dive into the dot"}),
    ],
    "s02": [
        fr(0.0, "The camera has dived to the ground: the curve of the Earth across the bottom, the sky above. A phone of glass stands where the dot was, its screen a small map with your dot.",
           {"horizon": [820]}, PHONE, PIN, {"camera": "push"}),
        fr(0.4, "'It doesn't send anything up': an amber arrow tries to leave the phone upward and is struck through.",
           {"horizon": [820]}, PHONE, PIN, {"arrow": [1300, 600, 1300, 200], "colour": "orange", "dashed": True}, {"line": [1240, 360, 1360, 440], "colour": "red", "width": 10}, label(1440, 420, "sends nothing", 40)),
        fr(1.0, "'It just listens': cyan arcs come down from the sky into the phone, one after another.",
           {"horizon": [820]}, PHONE, PIN, {"ring": [960, -200, 640], "colour": "blue"}, {"ring": [960, -200, 760], "colour": "blue"}, {"move": [960, 100, 960, 220], "text": "signals arrive"}, {"cut": "follow a signal back up"}),
    ],
    "s03": [
        fr(0.0, "Following a signal back up: one GPS satellite close, gold body and two dark solar wings, lit from the left. A chip on it reads the time it broadcasts.",
           sat_icon([960, 520], 110), {"chip": [1220, 610], "text": "time sent 10:24:31.0670"}, {"glow": [760, 400, 380], "colour": "blue"}),
        fr(0.5, "On 'time' a cyan shell leaves the satellite; the figures keep running.",
           sat_icon([960, 520], 110), {"chip": [1220, 610], "text": "time sent 10:24:31.2410"}, {"ring": [960, 520, 220], "colour": "blue"}, {"camera": "orbit"}),
        fr(1.0, "The time ticks on, the chip says 'atomic clock'; a cyan shell leaves the satellite and grows past the frame.",
           sat_icon([960, 520], 110), {"chip": [1220, 610], "text": "time sent 10:24:31.4120"}, label(1420, 760, "atomic clock on board", 36), {"ring": [960, 520, 420], "colour": "blue"}, {"cut": "pull back"}),
    ],
    "s04": [
        fr(0.0, "The camera pulls far back: the Earth small at the centre, six orbit rings around it, to scale.",
           *constellation(WIDE), {"camera": "pull"}),
        fr(0.5, "The satellites drift along their rings; on 'thirty satellites' a chip lands: 32 satellites, 6 orbits.",
           *constellation(WIDE), {"chip": [1380, 120], "text": "32 satellites"}, label(1500, 260, "6 orbits", 36)),
        fr(1.0, "Held, drifting; a small note at the bottom: orbits to scale, satellites enlarged.",
           *constellation(WIDE), {"chip": [1380, 120], "text": "32 satellites"}, label(1500, 260, "6 orbits", 36), label(400, 170, "orbits to scale, satellites enlarged", 30), {"cut": "the camera sinks toward the Earth"}),
    ],
    "s05": [
        fr(0.0, "The camera sinks so the Earth sits low; the rings fade into one faint cyan circle: the height all the orbits share.",
           earth(ALTV), {"ring": [ALTV[0][0], ALTV[0][1], round(A * ALTV[1])], "colour": "blue", "dashed": True}, *you(proj(P, *ALTV)), {"camera": "down"}),
        fr(0.6, "A measure draws from the ground up to the orbit and lands at its value: 20,200 km.",
           earth(ALTV), {"ring": [ALTV[0][0], ALTV[0][1], round(A * ALTV[1])], "colour": "blue", "dashed": True}, *you(proj(P, *ALTV)),
           {"line": [ALTV[0][0] + 240, ALTV[0][1] - ALTV[1], ALTV[0][0] + 240, ALTV[0][1] - round(A * ALTV[1])], "colour": "blue", "width": 6}, label(ALTV[0][0] + 400, ALTV[0][1] - 300, "20,200 km", 48, colour="blue")),
        fr(1.0, "Four satellites stay on the circle; the others fade.",
           earth(ALTV), {"ring": [ALTV[0][0], ALTV[0][1], round(A * ALTV[1])], "colour": "blue", "dashed": True}, *you(proj(P, *ALTV)), *[sat_icon(proj(q, *ALTV), 26) for q in SATS],
           label(ALTV[0][0] + 400, ALTV[0][1] - 300, "20,200 km", 48, colour="blue"), {"cut": "no cut: settle on four"}),
    ],
    "s06": [
        fr(0.0, "The mechanism's framing: a small Earth low in the middle, you on top of it, four satellites around. Satellite 1 is straight overhead. A stopwatch panel on the right reads 0.000 s.",
           MECH_EARTH, *you(P_M), *SATS_M, {"panel": [1440, 680, 400, 190], "title": "delay", "rows": ["0.000 s"]}, {"camera": "push"}),
        fr(0.5, "A cyan shell leaves satellite 1 and grows toward you; the stopwatch runs with the shell's radius.",
           MECH_EARTH, *you(P_M), *SATS_M, {"ring": [round(S_M[0][0]), round(S_M[0][1]), round(R_M[0] * 0.5)], "colour": "blue"}, {"panel": [1440, 680, 400, 190], "title": "delay", "rows": ["0.034 s"]}, label(1640, 920, "slowed down", 30)),
        fr(1.0, "The shell reaches you, the stopwatch stops at 0.067 s, a small flash at the dot.",
           MECH_EARTH, *you(P_M), *SATS_M, {"ring": [round(S_M[0][0]), round(S_M[0][1]), round(R_M[0])], "colour": "blue"}, {"panel": [1440, 680, 400, 190], "title": "delay", "rows": ["0.067 s"]}, {"scatter": [round(P_M[0]), round(P_M[1]), 8, 20, 50], "colour": "orange"}, {"cut": "no cut: the sum builds"}),
    ],
    "s07": [
        fr(0.0, "The stopwatch's figure flies into a glass panel at upper right and a sum builds: 0.0674 s x 299,792 km/s.",
           MECH_EARTH, *you(P_M), *SATS_M, {"panel": [1300, 300, 560, 300], "title": "distance", "rows": ["0.0674 s", ""]}, {"move": [1640, 760, 1500, 420], "text": "figure flies"}),
        fr(0.5, "'x 299,792 km/s' lands on 'speed of light'.",
           MECH_EARTH, *you(P_M), *SATS_M, {"panel": [1300, 300, 560, 300], "title": "distance", "rows": ["0.0674 s x 299,792 km/s", ""]}),
        fr(1.0, "Held for the read; the camera eases in a little.",
           MECH_EARTH, *you(P_M), *SATS_M, {"panel": [1300, 300, 560, 300], "title": "distance", "rows": ["0.0674 s x 299,792 km/s", ""]}, {"camera": "push"}, {"cut": "no cut: the result"}),
    ],
    "s08": [
        fr(0.0, "The result lands at its value under the sum, = 20,200 km.",
           MECH_EARTH, *you(P_M), *SATS_M, {"panel": [1300, 300, 560, 300], "title": "distance", "rows": ["0.0674 s x 299,792 km/s", "= 20,200 km"]}),
        fr(1.0, "A cyan measure draws from satellite 1 down to you with '20,200 km' beside it: the delay has become a distance.",
           MECH_EARTH, *you(P_M), *SATS_M, {"panel": [1300, 300, 560, 300], "title": "distance", "rows": ["0.0674 s x 299,792 km/s", "= 20,200 km"]},
           {"line": [S_M[0][0], S_M[0][1], P_M[0], P_M[1]], "colour": "blue", "width": 8}, label(S_M[0][0] - 130, (S_M[0][1] + P_M[1]) / 2, "20,200 km", 40, colour="blue"), {"cut": "the radius sweeps a sphere"}),
    ],
    "s09": [
        fr(0.0, "The measure swings around satellite 1 and leaves a sphere behind it: a glassy cyan shell, bright at its rim.",
           MECH_EARTH, *you(P_M), *SATS_M, sphere(0, dashed=True), {"move": [P_M[0], P_M[1], P_M[0] - 300, P_M[1] - 140], "text": "radius sweeps"}),
        fr(0.5, "The whole sphere is there; every point on it is 20,200 km from satellite 1. Small amber question marks ride its surface: you could be anywhere on it.",
           MECH_EARTH, *you(P_M), *SATS_M, sphere(0), label(S_M[0][0] - 380, S_M[0][1] + 40, "?", 60, colour="orange"), label(S_M[0][0] + 380, S_M[0][1] + 120, "?", 60, colour="orange"), label(S_M[0][0], S_M[0][1] - 360, "?", 60, colour="orange")),
        fr(1.0, "Held, turning slowly so it reads as a sphere, not a circle.",
           MECH_EARTH, *you(P_M), *SATS_M, sphere(0), {"camera": "orbit"}, {"cut": "satellite 2's sphere grows"}),
    ],
    "s10": [
        fr(0.0, "Satellite 2's shell grows from the left until it reaches you.",
           MECH_EARTH, *you(P_M), *SATS_M, sphere(0), sphere(1, scale=0.6, dashed=True), {"move": [S_M[1][0], S_M[1][1], S_M[1][0] + 200, S_M[1][1] - 60], "text": "grows"}),
        fr(1.0, "Where the two spheres cross, an amber circle lights up, running through you: you are somewhere on that ring.",
           MECH_EARTH, *you(P_M), *SATS_M, sphere(0), sphere(1), ring_path(0, 1, MECH), {"cut": "satellite 3's sphere grows"}),
    ],
    "s11": [
        fr(0.0, "Satellite 3's shell grows from the right.",
           MECH_EARTH, *you(P_M), *SATS_M, sphere(0), sphere(1), sphere(2, scale=0.6, dashed=True), ring_path(0, 1, MECH)),
        fr(1.0, "The ring shrinks to the two points where it meets the third sphere: one is you, the other is far out in space.",
           MECH_EARTH, *you(P_M), *SATS_M, sphere(0), sphere(1), sphere(2), {"dot": [round(OTHER_M[0]), round(OTHER_M[1]), 14], "colour": "orange"}, label(OTHER_M[0] + 120, OTHER_M[1] - 30, "or here?", 40, colour="orange"), {"cut": "hard cut to the ruler"}),
    ],
    "s12": [
        fr(0.0, "A new picture: a glass ruler across the frame, 0 to 300 m, ticks every 50 m. A stopwatch above reads 0.000000 s.",
           {"bar": [210, 640, 1500, 24], "colour": "ink"}, label(210, 720, "0 m", 40), label(1710, 720, "300 m", 40), {"panel": [700, 260, 520, 180], "title": "time", "rows": ["0.000000 s"]}),
        fr(0.6, "A cyan pulse of light runs the ruler; the stopwatch runs in millionths with it.",
           {"bar": [210, 640, 1500, 24], "colour": "ink"}, {"line": [210, 620, 1100, 620], "colour": "blue", "width": 10}, {"dot": [1100, 620, 20], "colour": "blue"}, label(210, 720, "0 m", 40), label(1710, 720, "300 m", 40), {"panel": [700, 260, 520, 180], "title": "time", "rows": ["0.000000 6 s"]}),
        fr(1.0, "The pulse reaches 300 m as the stopwatch reaches one millionth of a second.",
           {"bar": [210, 640, 1500, 24], "colour": "ink"}, {"line": [210, 620, 1710, 620], "colour": "blue", "width": 10}, label(210, 720, "0 m", 40), label(1710, 720, "300 m", 40), {"panel": [700, 260, 520, 180], "title": "time", "rows": ["0.000001 s"]}, {"cut": "dive to you"}),
    ],
    "s13": [
        fr(0.0, "Close on you: the Earth's horizon across the lower frame, you on it, space above. Three amber arcs (the circles of the spheres) cross exactly at you.",
           {"horizon": [700]}, *you(P_Z), {"path": f"M200 900 Q{P_Z[0]} {P_Z[1] - 60} 1700 300", "colour": "orange", "width": 6}, {"path": f"M300 200 Q{P_Z[0]} {P_Z[1] + 40} 1650 900", "colour": "orange", "width": 6}, {"camera": "push"}),
        fr(0.45, "A chip lands: 'clock 2 ms fast'. Every sphere shrinks by the same 600 km.",
           {"horizon": [700]}, *you(P_Z), {"chip": [1240, 120], "text": "clock 2 ms fast"}, label(1500, 260, "every distance 600 km short", 32), {"path": f"M200 880 Q{P_Z[0]} {P_Z[1] - 100} 1700 280", "colour": "orange", "width": 6}),
        fr(1.0, "A clock chip ticks fast: 'phone clock +2 ms, every distance 600 km short'. The spheres shrink a little and their meeting point slides up into the sky, away from you.",
           {"horizon": [700]}, *you(P_Z), {"chip": [1240, 120], "text": "clock 2 ms fast"}, label(1500, 260, "every distance 600 km short", 32),
           {"dot": [round(WRONG_Z[0][0]), round(WRONG_Z[0][1]), 16], "colour": "red"}, {"move": [P_Z[0], P_Z[1], WRONG_Z[0][0], WRONG_Z[0][1]]}, {"cut": "no cut: a fourth sphere"}),
    ],
    "s14": [
        fr(0.0, "The fourth satellite's arcs come in.",
           {"horizon": [700]}, *you(P_Z), {"chip": [1240, 120], "text": "clock 2 ms fast"}, {"dot": [round(WRONG_Z[0][0]), round(WRONG_Z[0][1]), 16], "colour": "red"}),
        fr(0.45, "Satellite 4's arcs sweep across; where they cross the others, new points pop.",
           {"horizon": [700]}, *you(P_Z), {"chip": [1240, 120], "text": "clock 2 ms fast"}, *[{"dot": [round(q[0]), round(q[1]), 16], "colour": "red"} for q in WRONG_Z[:2]], {"move": [1700, 100, 1200, 400], "text": "sphere 4"}),
        fr(1.0, "With four spheres there are four meeting points, and they disagree: four red points scattered in the sky above you.",
           {"horizon": [700]}, *you(P_Z), {"chip": [1240, 120], "text": "clock 2 ms fast"}, *[{"dot": [round(q[0]), round(q[1]), 16], "colour": "red"} for q in WRONG_Z], {"cut": "no cut: the correction"}),
    ],
    "s15": [
        fr(0.0, "A dial appears: 'clock correction -2.0 ms'. As it turns, every sphere grows by the same amount.",
           {"horizon": [700]}, *you(P_Z), {"panel": [1300, 120, 520, 190], "title": "clock correction", "rows": ["-2.0 ms"]}, *[{"dot": [round(q[0]), round(q[1]), 16], "colour": "red"} for q in WRONG_Z]),
        fr(0.5, "The four points slide together toward you, computed from the dial every frame.",
           {"horizon": [700]}, *you(P_Z), {"panel": [1300, 120, 520, 190], "title": "clock correction", "rows": ["-1.0 ms"]}, *[{"dot": [round((q[0] + P_Z[0]) / 2), round((q[1] + P_Z[1]) / 2), 16], "colour": "red"} for q in WRONG_Z],
           {"move": [WRONG_Z[2][0], WRONG_Z[2][1], P_Z[0] + 30, P_Z[1] - 30]}),
        fr(1.0, "Almost there: the four points nearly touch, just above you.",
           {"horizon": [700]}, *you(P_Z), {"panel": [1300, 120, 520, 190], "title": "clock correction", "rows": ["-0.2 ms"]}, *[{"dot": [round(q[0] * 0.1 + P_Z[0] * 0.9), round(q[1] * 0.1 + P_Z[1] * 0.9), 16], "colour": "red"} for q in WRONG_Z], {"cut": "no cut: the lock"}),
    ],
    "s16": [
        fr(0.0, "At 0 they meet on one point, on the ground, and it locks: amber, with a ring.",
           {"horizon": [700]}, {"dot": [round(P_Z[0]), round(P_Z[1]), 20], "colour": "orange"}, {"ring": [round(P_Z[0]), round(P_Z[1]), 70], "colour": "orange"}, {"panel": [1300, 120, 520, 190], "title": "clock correction", "rows": ["0.0 ms  fixed"]}),
        fr(1.0, "'you are here' lands under the point; the dial reads 'fixed'.",
           {"horizon": [700]}, {"dot": [round(P_Z[0]), round(P_Z[1]), 20], "colour": "orange"}, {"ring": [round(P_Z[0]), round(P_Z[1]), 90], "colour": "orange"}, label(P_Z[0], P_Z[1] + 110, "you are here", 44, colour="orange"),
           {"panel": [1300, 120, 520, 190], "title": "clock correction", "rows": ["0.0 ms  fixed"]}, {"cut": "pull back to the phone"}),
    ],
    "s17": [
        fr(0.0, "The phone again, the same glass slab: its map now has a firm amber pin with a ring.",
           {"horizon": [820]}, PHONE, PIN, {"ring": [960, 560, 60], "colour": "orange"}, {"camera": "pull"}),
        fr(1.0, "Four cyan threads come down into the phone from above.",
           {"horizon": [820]}, PHONE, PIN, {"line": [300, 0, 900, 400], "colour": "blue"}, {"line": [900, 0, 950, 400], "colour": "blue"}, {"line": [1400, 0, 1000, 400], "colour": "blue"}, {"line": [1800, 120, 1020, 420], "colour": "blue"}, {"cut": "pull back to space"}),
    ],
    "s18": [
        fr(0.0, "Pull back to the mechanism's framing: Earth, you, four satellites, each joined to you by a cyan thread.",
           MECH_EARTH, *you(P_M), *SATS_M, *[{"line": [S_M[i][0], S_M[i][1], P_M[0], P_M[1]], "colour": "blue", "width": 4} for i in range(4)], {"camera": "pull"}),
        fr(0.5, "The camera settles; pulses run down the four threads toward you.",
           MECH_EARTH, *you(P_M), *SATS_M, *[{"line": [S_M[i][0], S_M[i][1], P_M[0], P_M[1]], "colour": "blue", "width": 4} for i in range(4)], *[{"dot": [round((S_M[i][0] + P_M[0]) / 2), round((S_M[i][1] + P_M[1]) / 2), 10], "colour": "blue"} for i in range(4)]),
        fr(1.0, "On 'four clocks', a small clock face lights on each satellite; signals pulse down the threads.",
           MECH_EARTH, *you(P_M), *SATS_M, *[{"line": [S_M[i][0], S_M[i][1], P_M[0], P_M[1]], "colour": "blue", "width": 4} for i in range(4)],
           *[{"ring": [round(S_M[i][0] + 70), round(S_M[i][1] - 50), 26], "colour": "blue"} for i in range(4)], {"cut": "cards rise"}),
    ],
    "s19": [
        fr(0.0, "The recap: three glass cards rise across the top, each with its small picture.",
           MECH_EARTH, {"card": [140, 110, 520, 250], "label": "each sends the time"}, {"card": [700, 110, 520, 250], "label": "delay x light = distance"}, {"card": [1260, 110, 520, 250], "label": "4 spheres: 1 point + clock"}, {"move": [960, 500, 960, 380], "text": "cards rise"}),
        fr(0.4, "The poster line lands under them.",
           MECH_EARTH, {"card": [140, 110, 520, 250], "label": "each sends the time"}, {"card": [700, 110, 520, 250], "label": "delay x light = distance"}, {"card": [1260, 110, 520, 250], "label": "4 spheres: 1 point + clock"},
           {"title": [960, 560], "text": "Four clocks in the sky.\nYour phone just listens.", "size": 92, "accent": "just listens."}),
        fr(1.0, "Held for two seconds, the Earth turning slowly below.",
           MECH_EARTH, {"card": [140, 110, 520, 250], "label": "each sends the time"}, {"card": [700, 110, 520, 250], "label": "delay x light = distance"}, {"card": [1260, 110, 520, 250], "label": "4 spheres: 1 point + clock"},
           {"title": [960, 560], "text": "Four clocks in the sky.\nYour phone just listens.", "size": 92, "accent": "just listens."}, {"camera": "push"}, {"cut": "end"}),
    ],
}

# ── Act 1: the question ──────────────────────────────────────────────────────────────────────────────────────
shot("s01", "hook", "wide",
     caption=False, read="How does your phone know where you are?",
     teaches="Asks the one question the film answers, over the real Earth with a dot that is you.",
     screen="The real Earth (NASA maps, langit-biru's globe) fills the lower right, lit from the left, its top edge at about y 410. An amber dot with a soft halo sits just inside that edge: you. Cyan shells (signals) sweep down across the globe from satellites out of frame, and one satellite glides across the top. On the left, in metal type at 104 px: 'How does your phone / know where you are?', 'where you are?' in amber.",
     motion="Frame 0 holds the Earth, the dot and the first line. The second line slams in as 'know' is said. A slow push in; the shells keep coming; a satellite drifts left to right across the top third.",
     carries="The amber dot: the camera dives into it.",
     transition="The title lifts away and the camera dives into the dot (the Earth grows past the frame).",
     sound="The bed from the first frame. A soft whoosh on the dive, between the two sentences.",
     check="The question is readable within 2 s. The dot is on the lit side, on land. The title does not overlap the globe.",
     facts=["f1"])

shot("s02", "hook", "macro",
     caption="It sends nothing up. It just *listens.*",
     teaches="The surprise the whole film rests on: a GPS receiver transmits nothing; it only receives.",
     screen="Down at the ground: the Earth's curved surface across the bottom of the frame, the dark sky above. A phone of glass 400 x 760 at the centre, its screen a dark map with your amber dot. To its right an amber arrow tries to go up and is struck through, 'sends nothing'. Then cyan arcs come down from above into the phone.",
     motion="The dive lands; the phone rises into place. On 'send anything up' the amber arrow draws upward and is struck through, then fades. On 'listens' three cyan arcs fall into the phone one after another and its screen glints with each.",
     carries="The cyan arcs: the camera follows one back up to its satellite.",
     transition="A vertical whip up the arcs to the satellite.",
     sound="A soft click as the arrow is struck through, between the words. Small chimes as the arcs land, kept low.",
     check="The struck-through arrow reads as 'nothing goes up'. The arcs come from above and end at the phone.",
     facts=["f6"])

# ── Act 2: the signal ────────────────────────────────────────────────────────────────────────────────────────
shot("s03", "signal", "object3d",
     caption="What it hears is the *time,*",
     teaches="What a satellite broadcasts: the time it sends each signal, kept by atomic clocks on board.",
     screen="One GPS satellite close up in 3D: a gold-foil body, two dark-blue solar wings, lit from the left by the Sun, the Earth's curve below. A glass chip on it reads 'time sent  10:24:31.0670' with the figures running, and a small label 'atomic clock on board'. Cyan shells leave it, one every half second.",
     motion="The whip arrives; the satellite turns slowly. The time figures run in real time (the last digits blur by). A shell leaves on 'time' and grows past the frame.",
     carries="The shells: they keep coming as the camera pulls back.",
     transition="A fast pull back to the whole constellation.",
     sound="A soft shimmer as the shell leaves, after 'time'.",
     check="The clock runs at real speed. The satellite looks like a GPS satellite, not a box.",
     facts=["f7"])

shot("s04", "signal", "wide",
     caption="from over thirty *GPS satellites,*",
     teaches="Where the time comes from: 32 satellites on six orbits, drawn to scale.",
     screen="The Earth small at the centre (diameter 216 px), six orbit rings around it at their true radius (4.17 Earth radii, 450 px), inclined 55 degrees, 32 satellites on them as small gold sparks. A chip '32 satellites' with '6 orbits · about 12 hours a lap' under it at upper right. A small note at upper left, under the chapter rail: 'orbits to scale · satellites enlarged · motion sped up'.",
     motion="The camera pulls back fast from the satellite, then slowly, the whole constellation turning a little. The satellites drift along their rings (sped up). The chip lands on 'thirty satellites'.",
     carries="The Earth and the orbits.",
     transition="No cut: the camera sinks toward the Earth and the rings merge into one circle.",
     sound="A whoosh with the pull back, before 'from'.",
     check="Ring radius / Earth radius = 26 571 / 6 371 = 4.17. 32 satellites drawn.",
     facts=["f1", "f5"])

shot("s05", "signal", "diagram",
     caption="20,200 kilometres *up.*",
     teaches="How high: every GPS orbit is about 20 200 km above the ground, more than three Earth radii.",
     screen="The Earth low in the frame (radius 112 px, centre at (960, 900)), you an amber dot on top. The six rings fade into one faint dashed cyan circle at 4.17 Earth radii: the height they all share. A cyan measure from the ground up to that circle, '20,200 km'. Four satellites stay on the circle; the rest fade.",
     motion="The camera sinks during 'twenty thousand'; the measure draws upward and its figure lands on 'kilometres'; on 'up' the other satellites fade and four stay.",
     carries="The Earth, you and the four satellites.",
     transition="No cut: the camera settles on the mechanism's framing.",
     sound="No effect under the words.",
     check="The measure runs from the Earth's surface to the circle: (26 571 - 6 371) / 6 371 = 3.17 Earth radii = 355 px.",
     facts=["f1"])

shot("s06", "signal", "diagram",
     caption="Each signal takes about a *fifteenth of a second.*",
     teaches="The signal from a satellite overhead takes about 0.067 s to reach you.",
     screen="The mechanism's framing: the Earth small and low in the middle (radius 122 px), you an amber dot on its top edge, four satellites around (1 straight overhead, 2 low left, 3 low right, 4 high left), each named. A cyan shell grows from satellite 1 down to you. A glass stopwatch at the right reads the shell's travel time; a small note 'slowed down'.",
     motion="On 'Each signal' the shell leaves satellite 1; the stopwatch counts with the shell (counting is the point: it is a stopwatch) and stops at 0.067 s as the shell touches you, on 'second'. A small amber flash at the dot.",
     carries="The stopwatch's figure.",
     transition="No cut: the figure flies into a sum.",
     sound="A tick as the stopwatch stops, after 'second'.",
     check="The stopwatch reads radius / 299 792 km/s at every frame and stops at 0.067. Satellite 1 is 20 200 km above you (3.17 Earth radii).",
     facts=["f1", "f2"])

shot("s07", "signal", "compare",
     caption="Multiply by the *speed of light:*",
     teaches="The rule: a delay times the speed of light is a distance.",
     screen="The same framing. The stopwatch's figure flies into a glass panel at upper right, 'distance', and the sum builds: '0.0674 s  ×  299,792 km/s'.",
     motion="The figure flies in at the start; '× 299,792 km/s' lands a third of the way in; a slow push.",
     carries="The sum.",
     transition="No cut: the result lands.",
     sound="A soft pop as the speed of light lands.",
     check="0.0674 s is the stopwatch's final figure. 299,792 km/s is the speed of light.",
     facts=["f2", "f3"])

shot("s08", "signal", "diagram",
     caption="that's the *distance.*",
     teaches="0.0674 s x 299 792 km/s = 20 200 km: the distance from satellite 1 to you.",
     screen="The same framing and panel, now with '= 20,200 km' at its value. A cyan measure from satellite 1 down to you, labelled '20,200 km'.",
     motion="The result lands at once; the measure draws down from the satellite to the dot and its label lands.",
     carries="The measure: it becomes the radius of a sphere.",
     transition="No cut: the measure swings round satellite 1.",
     sound="A soft pop as the result lands.",
     check="0.0674 x 299 792 = 20 206 km, shown as 20,200. The measure runs from satellite 1 to the dot.",
     facts=["f2", "f3"])

shot("s09", "spheres", "object3d",
     caption="But one distance only puts you on a *sphere.*",
     teaches="One distance does not give a place: it gives a sphere of places around the satellite.",
     screen="The same framing. Around satellite 1, a sphere of radius 20 200 km (3.17 Earth radii, 387 px) as a glassy cyan shell, bright at its rim, with faint lines of latitude so it reads as round. Its surface passes exactly through you. Small amber question marks ride its surface.",
     motion="The measure swings round satellite 1 and the sphere fills in behind it (0.6 s). The question marks appear on 'puts you on a sphere' and slide over its surface; the sphere turns slowly.",
     carries="Sphere 1.",
     transition="No cut: satellite 2's shell grows.",
     sound="A low swell as the sphere fills, kept low.",
     check="The sphere's radius is computed from the range (3.17 Earth radii) and touches the dot.",
     facts=["f8"])

shot("s10", "spheres", "diagram",
     caption="Two spheres cross in a *circle.*",
     teaches="Two distances: the two spheres meet in a circle, and you are on it.",
     screen="Sphere 1 stays. Satellite 2's sphere (23 244 km, 3.65 Earth radii) grows from the left until it touches you. The circle where the two spheres cross lights amber; it runs through you.",
     motion="Sphere 2 grows during 'Two spheres'; the amber circle draws itself around on 'circle'.",
     carries="The two spheres and the amber circle.",
     transition="No cut: satellite 3's shell grows.",
     sound="A soft shimmer as the circle draws.",
     check="The circle is the computed intersection of the two spheres and passes through the dot.",
     facts=["f8"])

shot("s11", "spheres", "object3d",
     caption="A third leaves *two points.*",
     teaches="Three distances leave two possible points: one is you, the other is out in space.",
     screen="Satellite 3's sphere (23 244 km) grows from the right. The amber circle shrinks to two amber points: you, and a second point far out in space (5.6 Earth radii from the centre) with a small 'or here?'.",
     motion="Sphere 3 grows; on 'two points' the circle collapses onto the two points, each pops with a ring.",
     carries="Your point.",
     transition="A hard cut to a new picture: the ruler.",
     sound="Two small pops, one per point, after 'points'.",
     check="The second point is the computed second intersection of the three spheres.",
     facts=["f8", "f4"])

# ── Act 4: the clock ─────────────────────────────────────────────────────────────────────────────────────────
shot("s12", "clock", "chart",
     caption="Here's the catch: light goes 300 m in a *millionth of a second,*",
     teaches="Why timing matters: light covers about 300 m in one microsecond.",
     screen="A new picture, flat and bright: a glass ruler across the frame from x 210 to 1710, 0 to 300 m with a tick every 50 m. Above it a glass stopwatch in millionths: '0.000000 s'. A cyan pulse runs along the ruler.",
     motion="On 'light goes' the pulse sets off at the 0 mark and reaches 300 m exactly as the stopwatch reaches 0.000001 s, on 'second'. The stopwatch counts in step with the pulse (the counting is the point).",
     carries="The figure 'one millionth of a second', as a clock.",
     transition="A dive back to you, close.",
     sound="A light tick when the pulse arrives, after 'second'.",
     check="The pulse's position / 1500 px x 300 m = stopwatch x 299 792 458 m/s at every frame.",
     facts=["f3"])

shot("s13", "clock", "macro",
     caption="and your phone's clock isn't that *good.*",
     teaches="A phone's clock is far less precise than that, so every distance is off by the same amount, and the meeting point lands in the wrong place.",
     screen="Close on you (the Earth 7.4 times larger than the mechanism's framing): the horizon across the lower frame, you on it, the sky above. The three spheres' circles are amber arcs crossing exactly at you. A chip at upper left: 'PHONE CLOCK 2 ms fast' and under it, on a dark label, 'every distance 0.002 s × 299,792 km/s = 600 km short'. The spheres shrink by 600 km and the meeting point slides up into the sky to a red point 640 km above you, labelled 'the phone's answer'.",
     motion="The camera dives in on 'and your phone's'. On 'clock' the chip lands; the arcs move as the spheres shrink and the crossing slides up to the red point by 'good'.",
     carries="The wrong point, and the arcs.",
     transition="No cut: the fourth sphere arrives.",
     sound="A small dissonant tick when the point leaves you.",
     check="2 ms x 299 792 km/s = 600 km. The red point is the computed meeting point of the three shortened spheres.",
     facts=["f3", "f9"])

shot("s14", "clock", "diagram",
     caption="So it listens to a *fourth.*",
     teaches="A fourth satellite shows that something is wrong: with the clock off, the four spheres have no common point.",
     screen="The same close view. Satellite 4's sphere arrives (its arcs sweep in). Now there are four meeting points, one for each three of the four spheres, and they disagree: four red points scattered 600 to 1 600 km above you.",
     motion="The fourth sphere's arcs sweep in on 'listens'; the three new red points pop one after another on 'fourth'.",
     carries="The four red points.",
     transition="No cut: the correction.",
     sound="Three small ticks as the points pop.",
     check="The four points are the computed solutions for each three spheres with every distance 600 km short.",
     facts=["f4", "f9"])

shot("s15", "clock", "object3d",
     caption="Only one point and one clock correction",
     teaches="The phone solves for its position and its clock error together: one correction, the same for every sphere.",
     screen="The same close view. A glass dial 'clock correction' at upper right turns from -2.0 ms toward 0. As it turns every sphere grows by the same amount and the four red points slide down together toward you.",
     motion="The dial turns through the shot; the points are solved from it every frame and converge.",
     carries="The four points, nearly together.",
     transition="No cut: the points meet and lock.",
     sound="A soft rising shimmer as the points converge.",
     check="The correction moves every sphere by the same amount; the points are solved from it each frame.",
     facts=["f4", "f9"])

shot("s16", "clock", "diagram",
     caption="fit all *four.*", length=3 * BEAT,
     teaches="At the right correction all four spheres meet at one point: you.",
     screen="The same close view. The four points meet on the dot, which turns amber with an amber ring; 'you are here' under it; the dial reads '0.0 ms  fixed'.",
     motion="The point locks on the cut with a ring and a flash of the stage light, amber; the label lands.",
     carries="Your point, now sure.",
     transition="Pull back to the phone.",
     sound="THE LOCK: a clean impact and a chime on the cut.",
     check="The four points meet exactly on the dot at 0.0 ms.",
     facts=["f4", "f9"])

shot("s17", "payoff", "macro",
     caption="That's how your phone *finds you:*",
     teaches="The answer, brought back to the phone: the dot on its map is that point.",
     screen="The phone of s02 again, the same place and size: its map now carries a firm amber pin with a ring. Cyan threads come down into it from four directions above.",
     motion="The pin lands on 'finds you' with a ring; the four threads draw down into the phone.",
     carries="The four threads.",
     transition="A pull back up the threads to space.",
     sound="A soft whoosh on the pull back, between the words.",
     check="The phone is where it was in s02. Four threads, not three.",
     facts=["f4"])

shot("s18", "payoff", "wide",
     caption="it listens to four *clocks in the sky.*",
     teaches="The answer in one picture: four satellites, each a clock, all heard by you.",
     screen="The mechanism's framing: the Earth, you, the four satellites, each joined to you by a cyan thread with pulses running down it. A small glowing clock face beside each satellite.",
     motion="The camera pulls back to the framing; on 'four clocks' the clock faces light one after another; pulses run down the threads.",
     carries="The Earth and the four satellites.",
     transition="The recap cards rise over the scene.",
     sound="Four soft ticks as the clocks light, low.",
     check="Four satellites, four clocks, four threads; the threads end at the dot.",
     facts=["f4", "f7"])

shot("s19", "recap", "recap", 6 * BEAT,
     teaches="The three ideas in one frame, and the line to remember.",
     screen="The Earth's limb low in the frame, the satellites gone. Three glass cards across the top, each with a small picture: a satellite with a clock, 'Each satellite sends the time'; a cyan line with '0.067 s × light speed = 20,200 km', 'Delay × light speed = distance'; four crossing rings meeting at one amber point, '4 spheres → 1 point + the clock'. Below, the poster line in metal type at 92 px: 'Four clocks in the sky. / Your phone just listens.', 'just listens.' in cyan.",
     motion="The cards rise in one after another in the first 0.5 s, the poster lines slam in, a sheen crosses them. Then it holds for two seconds with a 3 percent push while the Earth turns.",
     carries="Nothing: the film ends here.",
     transition="The film ends on this frame.",
     sound="A soft whoosh as the cards rise, a low impact under the poster line, the music fades over the last 1.8 s.",
     check="Every figure matches the fact sheet. The poster is fully readable for at least two seconds.",
     facts=["f2", "f3", "f4"])

duration = shots[-1]["end"]

storyboard = {
    "title": "How does your phone know where you are?",
    "question": "How does your phone know where you are?",
    "audience": "Curious adults and teenagers anywhere, watching on a phone. They use maps every day and may think the phone sends something to the satellites; they know light is fast but not how a distance comes from a time.",
    "promise": "A GPS receiver only listens: each satellite broadcasts the time, the delay of each signal times the speed of light gives a distance, each distance puts you on a sphere around that satellite, and four satellites pin down your position and correct the receiver's own clock.",
    "language": "en",
    "format": "1920x1080",
    "duration": round(duration, 3),
    "fps": 60,
    "poster": 8.0,
    "look": {
        "accent": "#38e1ff",
        "accent2": "#ffb547",
        "mood": "Space over the kit's graphite stage: the real Earth (NASA maps) lit from the left, satellites of gold foil and dark solar cells. Cyan is the signal and everything made from it (shells, distances, spheres); amber is you (the dot, the circle and points where you may be, the pin). Red marks a wrong point. The stage light sits on the Earth, turns cyan as signals travel and settles amber on you when the position locks.",
    },
    "music": {
        "track": "Xceed Thru Johann (Mixkit 556)",
        "bpm": 86,
        "beat": 0.697674,
        "start": 0.679,
        "note": "A calm 86 BPM bed with no lead melody, at -18 LUFS. Every shot is a whole number of beats long and the music starts 0.679 s in, which puts a beat on frame 0, so every cut sits on the beat.",
    },
    "facts": [
        {"id": "f1", "claim": "GPS satellites fly in medium Earth orbit at an altitude of about 20,200 km (12,550 miles), circling the Earth twice a day. From the Earth's centre that is 20,200 + 6,371 = 26,571 km, 4.17 Earth radii: the film draws the orbits at that ratio.",
         "source": "GPS.gov, Space Segment (gps.gov/systems/gps/space), read through search summaries (the page could not be opened from this session); ESA Navipedia, GPS Space Segment. Mean Earth radius 6,371 km (IUGG)."},
        {"id": "f2", "claim": "A signal from a satellite straight overhead travels 20,200 km: 20,200 / 299,792 km/s = 0.0674 s, about 67 milliseconds, written as 'about a fifteenth of a second' (1/15 = 0.0667 s). From satellites lower in the sky it takes longer (up to about 86 ms at the horizon).",
         "source": "Arithmetic from f1 and the speed of light (BIPM SI Brochure, 9th ed.: c = 299,792,458 m/s exactly). The same order is given by the USDA Forest Service 'How GPS works' note (about 0.06 s) and Science News Today (about 67 ms for 20,000 km). The signal is slowed slightly in the atmosphere; ignored here."},
        {"id": "f3", "claim": "Light travels 299,792,458 m/s, so in one microsecond (a millionth of a second) it covers 299.8 m, about 300 m; an error of 2 ms in the clock is 0.002 x 299,792 km/s = 600 km of distance.",
         "source": "BIPM, The International System of Units (SI Brochure), 9th edition, 2019 (definition of the metre); arithmetic. Wikipedia, Pseudorange: 'an error of one microsecond corresponds to an error of 300 metres'."},
        {"id": "f4", "claim": "A receiver needs signals from at least four satellites: three for its position (x, y, z) and one more for its own clock error, which it solves for at the same time. With three spheres alone there are two possible points; one is normally far from the Earth's surface.",
         "source": "Penn State GEOG 862, GPS and GNSS for Geospatial Professionals, 'The Navigation Solution' (e-education.psu.edu/geog862/node/1724); Wikipedia, Pseudorange; Kaplan and Hegarty, Understanding GPS/GNSS, 3rd ed., ch. 2."},
        {"id": "f5", "claim": "The constellation has 32 operational satellites after the last GPS III satellite (SV-10) launched on 21 April 2026; it was 31 for several years. The US commits to at least 24 operational 95% of the time. The film says 'over thirty' and draws 32 on six orbital planes inclined 55 degrees.",
         "source": "Lockheed Martin, GPS III (lockheedmartin.com/gps): 32 satellites in the operational constellation; CGSIC briefing of 21 April 2026 hosted on gps.gov; GPS.gov Space Segment (24-satellite commitment, six planes, 55 degrees). Read through search summaries, not opened in full; the count changes as satellites are launched and retired."},
        {"id": "f6", "claim": "A GPS receiver is passive: it only receives the satellites' signals and sends nothing to them, which is why any number of users can use GPS at once. (A phone may download help data over its mobile network to start faster; that is not sent to the satellites.)",
         "source": "Enge, 'The Global Positioning System: signals, measurements, and performance', Proc. IEEE 1999 ('a passive system... no transmissions from the users', unlimited concurrent users); Penn State GEOG 862, NAVSTAR GPS. Read through search summaries."},
        {"id": "f7", "claim": "Each GPS satellite carries atomic clocks (rubidium; some older blocks also caesium; GPS III is rubidium only) and broadcasts the time each signal leaves, with its orbit data. The film shows a running time stamp as an illustration, not a real broadcast format.",
         "source": "US Naval Observatory, Global Positioning System Overview (cnmoc.usff.navy.mil); Penn State GEOG 862, NAVSTAR GPS (courses.ems.psu.edu/geog862/node/1768); Kaplan and Hegarty, ch. 3. Read through search summaries."},
        {"id": "f8", "claim": "The geometry is computed, not drawn by eye: you sit at 53 degrees from the equator's plane in the film's world, 18 degrees in front of the globe's edge; the four satellites are on the GPS orbit at azimuth/elevation (0, 90), (215, 25), (105, 25), (300, 45) as seen from you, at ranges 20,200, 23,244, 23,244 and 21,681 km. Each sphere's radius is that range. The circle of two spheres, and the two points of three (you, and one 5.6 Earth radii from the centre, far out in space), are solved by trilateration in storyboard.build.py. Satellites are drawn enlarged; distances are to scale.",
         "source": "Arithmetic (storyboard.build.py, geometry.json)."},
        {"id": "f9", "claim": "With the phone's clock 2 ms fast every measured distance is 600 km short; solving three spheres at a time then gives four different points 600 to 1,600 km above you. Moving every sphere by the same amount (the clock correction) until all four meet brings them to one point: that is how a receiver finds its clock error. 2 ms is an example; real receivers solve whatever their error is.",
         "source": "Arithmetic in storyboard.build.py from f3 and f4; the method: Penn State GEOG 862, 'The Navigation Solution'."},
    ],
    "acts": [
        {"id": "hook", "title": "The question", "goal": "Ask the question over the real Earth, then break the belief that a phone talks to the satellites.", "rail": False},
        {"id": "signal", "title": "A time, a delay", "goal": "What the satellites send, how long it takes, and how a delay becomes a distance."},
        {"id": "spheres", "title": "Spheres", "goal": "One distance is a sphere, two cross in a circle, three leave two points: drawn and computed."},
        {"id": "clock", "title": "The clock", "goal": "Why the phone's clock spoils it, and how a fourth satellite fixes the position and the clock together."},
        {"id": "payoff", "title": "Four clocks", "goal": "The answer back on the phone, then in one picture.", "rail": False},
        {"id": "recap", "title": "Recap", "goal": "The three ideas in one frame and the line to remember.", "rail": False},
    ],
    "shots": shots,
}

out = HERE / "storyboard.json"
out.write_text(json.dumps(storyboard, ensure_ascii=False, indent=2) + "\n")
print(f"{len(shots)} shots, {sum(len(s['frames']) for s in shots)} frames, {duration:.1f} s -> {out}")
print("ranges km", [round(r * RE) for r in RANGES], "other point |r|", round(norm(OTHER), 2), "wrong heights km", [round((norm(q) - 1) * RE) for q in WRONG])
