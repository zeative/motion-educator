"""Writes storyboard.json for "Why do traffic jams appear out of nowhere?" (landscape, 1920 x 1080, English, narrated).

The film is cut to one take of narration. This script writes the plan: the shots, each with its run of the script
and its drawn frames. The times it writes are a guess; the take sets the real ones, so the script ends by asking the
voice tool to retime the board (it does nothing until a take is there):

    python3 examples/phantom-jam/sim.py && python3 examples/phantom-jam/storyboard.build.py
    node kit/tools/storyboard.mjs examples/phantom-jam --png

Every car on screen is a car of sim.py's ring (22 cars, 230 m, the Intelligent Driver Model), drawn where the model
puts it: the slowdown that grows from driver to driver, the jam that slides backwards, the time-and-place chart and
the one car that soaks the wave up are all its numbers (sim.json), not drawn by eye.
"""
import json
import math
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
SIM = json.loads((HERE / "sim.json").read_text())
M = SIM["measured"]
DIPS = SIM["dips"]
shots = []


def shot(id, act, type, length=None, **fields):
    """A speaking shot's length is the take's. A silent beat keeps the length it is given here."""
    start = shots[-1]["end"] if shots else 0
    words = len(fields.get("voice", "").split())
    guess = length if length is not None else round(words / 2.6 + 0.35, 2)
    frames = FRAMES[id]
    if len(frames) == 2:
        # the middle of the shot: the end frame's picture before its cut, with the motion that gets it there
        mid = [t for t in frames[1]["draw"] if "cut" not in t] + [{"camera": "push"}]
        frames = [frames[0], fr(0.5, "Midway: " + fields.get("motion", "the move continues"), *mid), frames[1]]
    shots.append({"id": id, "act": act, "type": type, "start": round(start, 3), "end": round(start + guess, 3), **fields, "frames": frames})


def fr(at, note, *draw):
    return {"at": at, "note": note, "draw": list(draw)}


def label(x, y, text, size=34, **more):
    return {"label": [round(x), round(y)], "text": text, "size": size, **more}


def chip(x, y, text):
    return {"chip": [round(x), round(y)], "text": text}


# ── The ring seen from above and a little to the side: the 3D camera's framing, as an ellipse ───────────────────
RC, RX, RY = (960, 470), 640, 330  # the full ring
SC, SX, SY = (560, 470), 430, 255  # the ring on the left half, a panel on the right


def ellipse(c, rx, ry, colour="ink", width=6):
    x, y = c
    return {"path": f"M{x - rx} {y} A{rx} {ry} 0 1 0 {x + rx} {y} A{rx} {ry} 0 1 0 {x - rx} {y}", "colour": colour, "width": width}


def road(c, rx, ry):
    """The single lane: two edges a lane apart."""
    return [ellipse(c, rx, ry, width=5), ellipse(c, rx * 0.9, ry * 0.88, width=5)]


def ring_point(c, rx, ry, a):
    """Where angle a (degrees, 0 at the right, counter-clockwise as the cars go) lands on the drawn ring's lane."""
    r = math.radians(a)
    return [round(c[0] + 0.95 * rx * math.cos(r)), round(c[1] - 0.94 * ry * math.sin(r))]


def cars(c, rx, ry, start=0, jam=(), lit=(), n=22, step=None):
    """n cars round the ring; the ones in `jam` bunched with red brake glow; `lit` gets the cyan marker."""
    out = []
    step = step or 360 / n
    for i in range(n):
        a = start + i * step
        x, y = ring_point(c, rx, ry, a)
        if i in jam:
            out.append({"glow": [x, y, 34], "colour": "red"})
            out.append({"dot": [x, y, 13], "colour": "red"})
        else:
            out.append({"dot": [x, y, 12], "colour": "white"})
        if i in lit:
            out.append({"ring": [x, y, 30], "colour": "blue"})
    return out


def jammed(c, rx, ry, centre, n_jam=10, n=22):
    """The jam: n_jam cars packed tight around `centre`, the rest spread over the remaining ring."""
    out = []
    tight = 7.5
    a0 = centre - tight * (n_jam - 1) / 2
    for i in range(n_jam):
        x, y = ring_point(c, rx, ry, a0 + i * tight)
        out += [{"glow": [x, y, 30], "colour": "red"}, {"dot": [x, y, 12], "colour": "red"}]
    free = n - n_jam
    span = 360 - tight * n_jam
    for i in range(free):
        x, y = ring_point(c, rx, ry, a0 + tight * n_jam + (i + 0.5) * span / free)
        out.append({"dot": [x, y, 12], "colour": "white"})
    return out


# ── The straight road of the hook: the same ring opened out, seen low from behind ───────────────────────────────
def highway(jam_x=760, crawl=True):
    out = [{"horizon": [430]}, {"path": "M200 1080 L900 430 M1720 1080 L1020 430", "colour": "ink", "width": 7}, {"path": "M960 1080 L960 430", "colour": "white", "width": 3, "dashed": True}]
    rows = [(1010, 150), (860, 112), (740, 84), (650, 64), (585, 48), (540, 38)]
    for y, w in rows:
        x = 960 - w * 0.2
        out.append({"path": f"M{x - w / 2} {y} h{w} v{-w * 0.45} h{-w} Z", "colour": "ink", "fill": "white", "width": 4})
        if crawl:
            out.append({"glow": [x - w * 0.4, y - 8, w * 0.32], "colour": "red"})
            out.append({"glow": [x + w * 0.4, y - 8, w * 0.32], "colour": "red"})
    return out


# ── The chart of the chain: each driver's lowest speed as the slowdown reaches them (sim.json "dips") ───────────
CH = (1050, 150, 800, 640)  # x, y, w, h of the panel
BAR0 = (1120, 720, 700, 470)  # x, baseline y, width, height of 30 km/h


def chain_bars(k):
    """The first k drivers' bars, each as tall as that driver's lowest speed (30 km/h = full height)."""
    x, base, w, h = BAR0
    bw = w / len(DIPS)
    out = [{"panel": list(CH), "title": "lowest speed, driver by driver", "rows": []}, {"line": [x, base, x + w, base]}, label(x - 10, base - h - 6, "30 km/h", 28, align="end")]
    for i, (_, _, v) in enumerate(DIPS[:k]):
        out.append({"bar": [round(x + i * bw + 4), base, round(bw - 8), round(h * v / 30)], "colour": "red" if v < 20 else "white"})
    return out


# ── The time-and-place chart (s16): the traces of all 22 cars, from the model, and the jam's slope ──────────────
TS = (150, 120, 1620, 700)


def traces():
    x, y, w, h = TS
    out = [{"axes": [x + 90, y + h - 70, w - 140, h - 150], "xlabel": "time (s)", "ylabel": "place on the ring (m)"}]
    # four of the 22 traces, rising (driving forwards), flat where the car is stopped in the jam
    for k in range(4):
        x0 = x + 100 + k * 330
        out.append({"curve": [[x0, y + h - 90], [x0 + 140, y + 220], [x0 + 210, y + 210], [x0 + 330, y + 90]], "colour": "white"})
    out.append({"line": [x + 160, y + 140, x + w - 120, y + h - 120], "dashed": True})
    return out


FRAMES = {
    "s01": [
        fr(0.0, "Frame 0 is finished: night, low behind a queue of cars on an open road, every brake light lit. The question is already landing across the top.",
           *highway(), {"title": [960, 190], "text": "Why do traffic jams appear\nout of nowhere?", "size": 92, "accent": "out of nowhere?"}, {"camera": "push"}),
        fr(1.0, "The question has landed; the camera keeps creeping along the queue. Cut: the camera rises.",
           *highway(), {"title": [960, 170], "text": "Why do traffic jams appear\nout of nowhere?", "size": 92, "accent": "out of nowhere?"}, {"cut": "the title lifts away as the camera rises"}),
    ],
    "s02": [
        fr(0.0, "Higher and behind: the queue crawls (red lights), and far ahead the road is clear.",
           *highway(), {"move": [960, 980, 960, 600], "text": "the camera flies along"}),
        fr(1.0, "Past the front of the jam: cars pull away, brake lights off, open road. Cut on 'clears'.",
           {"horizon": [430]}, {"path": "M200 1080 L900 430 M1720 1080 L1020 430", "colour": "ink", "width": 7}, {"dot": [960, 700, 22], "colour": "white"}, {"dot": [960, 560, 14], "colour": "white"}, label(960, 380, "open road", 34), {"camera": "push"}, {"cut": "hold over the open road"}),
    ],
    "s03": [
        fr(0.0, "Above the front of the jam, looking down the empty road: nothing is there.",
           {"horizon": [380]}, {"path": "M300 1080 L920 380 M1620 1080 L1000 380", "colour": "ink", "width": 7}, chip(560, 330, "no crash"), chip(1360, 330, "no roadworks"), {"camera": "up"}),
        fr(1.0, "The chips land and are struck through, one on each word; the road stays empty. Cut: pull back to the whole road.",
           {"horizon": [380]}, {"path": "M300 1080 L920 380 M1620 1080 L1000 380", "colour": "ink", "width": 7}, chip(560, 330, "no crash ✕"), chip(1360, 330, "no roadworks ✕"), {"cut": "pull back"}),
    ],
    "s04": [
        fr(0.0, "High above the road, seen from the side: one lane, packed with cars all moving.",
           {"path": "M0 560 L1920 560 M0 640 L1920 640", "colour": "ink", "width": 6}, *[{"dot": [80 + i * 120, 600, 14], "colour": "white"} for i in range(16)], {"camera": "pull"}),
        fr(1.0, "On 'close together': the gap between two cars is bracketed, about six metres.",
           {"path": "M0 560 L1920 560 M0 640 L1920 640", "colour": "ink", "width": 6}, *[{"dot": [80 + i * 120, 600, 14], "colour": "white"} for i in range(16)], {"bracket": [915, 1005, 520], "text": "≈ 6 m"}, {"cut": "the brake lights spread"}),
    ],
    "s05": [
        fr(0.0, "The same road: a cluster of brake lights starts in the middle of the packed cars.",
           {"path": "M0 560 L1920 560 M0 640 L1920 640", "colour": "ink", "width": 6}, *[{"dot": [80 + i * 120, 600, 14], "colour": "white"} for i in range(6)], *[{"glow": [800 + i * 70, 600, 30], "colour": "red"} for i in range(6)], {"move": [1300, 500, 900, 500], "text": "the jam grows"}),
        fr(1.0, "The jam is there, made by nothing but the cars. Cut: the road starts to bend.",
           {"path": "M0 560 L1920 560 M0 640 L1920 640", "colour": "ink", "width": 6}, *[{"glow": [700 + i * 64, 600, 30], "colour": "red"} for i in range(9)], label(960, 470, "no cause", 36), {"cut": "the road bends into a ring"}),
    ],
    "s06": [
        fr(0.0, "The road curls: the straight lane bends, the ends sweep round toward each other.",
           {"path": "M100 760 Q960 300 1820 760", "colour": "ink", "width": 8}, {"camera": "up"}, {"move": [200, 700, 520, 360], "text": "curls"}),
        fr(0.55, "Half way: a horseshoe; the source chip lands top left.",
           {"path": "M500 860 Q300 300 960 160 Q1620 300 1420 860", "colour": "ink", "width": 8}, chip(380, 120, "Sugiyama et al., 2008")),
        fr(1.0, "Closed: the test track, a single lane ring, seen from above at an angle.",
           *road(RC, RX, RY), *cars(RC, RX, RY), chip(380, 120, "Sugiyama et al., 2008"), {"cut": "hold; labels arrive"}),
    ],
    "s07": [
        fr(0.0, "The ring fills the frame, 22 cars evenly spaced and all moving.",
           *road(RC, RX, RY), *cars(RC, RX, RY), {"camera": "orbit"}),
        fr(0.5, "On 'twenty-two cars': a count chip.", *road(RC, RX, RY), *cars(RC, RX, RY), chip(960, 470, "22 cars")),
        fr(1.0, "On 'two hundred and thirty metres around': an arc measures the lane.",
           *road(RC, RX, RY), *cars(RC, RX, RY), chip(960, 430, "22 cars"), chip(960, 520, "230 m around"), ellipse(RC, RX * 1.06, RY * 1.07, colour="blue", width=4), {"cut": "push in"}),
    ],
    "s08": [
        fr(0.0, "Closer on one side of the ring: cars in a row, evenly spaced, moving together.",
           *road((960, 820), 1500, 600), *[{"dot": [200 + i * 190, 360 + abs(i - 4) * 18, 18], "colour": "white"} for i in range(9)], {"camera": "left"}),
        fr(1.0, "Each car shows the same speed: 30 km/h, and the gaps are equal.",
           *road((960, 820), 1500, 600), *[{"dot": [200 + i * 190, 360 + abs(i - 4) * 18, 18], "colour": "white"} for i in range(9)], chip(960, 230, "every driver: 30 km/h"), {"cut": "rise to the whole ring"}),
    ],
    "s09": [
        fr(0.0, "Low over the infield: the ring all round, nothing on it but the cars.",
           *road(RC, RX, RY), *cars(RC, RX, RY, start=10), {"camera": "orbit"}),
        fr(1.0, "Chip: no bottleneck. The ring keeps turning.",
           *road(RC, RX, RY), *cars(RC, RX, RY, start=20), chip(960, 470, "no bottleneck"), {"cut": "a flash: minutes later"}),
    ],
    "s10": [
        fr(0.0, "A few minutes on (a chip says so): half the ring is a block of red brake lights.",
           *road(RC, RX, RY), *jammed(RC, RX, RY, 100), chip(960, 470, "a few minutes later")),
        fr(1.0, "Cars at the jam's heart stand still: a 0 km/h tag. Cut: back to the start.",
           *road(RC, RX, RY), *jammed(RC, RX, RY, 104), chip(960, 470, "a few minutes later"), label(*ring_point(RC, RX, RY, 104), "0 km/h", 30), {"cut": "rewind to the start"}),
    ],
    "s11": [
        fr(0.0, "Back to the even ring, closer: one car marked in cyan.",
           *road(SC, SX, SY), *cars(SC, SX, SY, lit=(0,)), {"camera": "push"}),
        fr(1.0, "Its brake lights glow; its tag reads 30 then 25 km/h. Everything else is calm.",
           *road(SC, SX, SY), *cars(SC, SX, SY, jam=(0,), lit=(0,)), label(SC[0] + SX, SC[1] - 60, "30 → 25 km/h", 32), {"cut": "the chart panel opens on the right"}),
    ],
    "s12": [
        fr(0.0, "Ring left, chart right: the first driver's bar stands at 25 km/h.",
           *road(SC, SX, SY), *cars(SC, SX, SY, jam=(0,)), *chain_bars(1)),
        fr(0.5, "The brake glow passes back to the next cars; a bar for each driver, as it happens.",
           *road(SC, SX, SY), *cars(SC, SX, SY, jam=(0, 21, 20, 19)), *chain_bars(6), {"move": [SC[0] + 300, SC[1] - 250, SC[0] - 100, SC[1] - 300], "text": "passed back"}),
        fr(1.0, "Bars start to fall, driver after driver.", *road(SC, SX, SY), *cars(SC, SX, SY, jam=(21, 20, 19, 18, 17, 16)), *chain_bars(12), {"cut": "keeps going"}),
    ],
    "s13": [
        fr(0.0, "The bars keep falling, each driver slower than the one ahead.", *road(SC, SX, SY), *cars(SC, SX, SY, jam=(16, 15, 14, 13, 12)), *chain_bars(14)),
        fr(0.6, "The bars drop steeply: 16, 9, 2 km/h.", *road(SC, SX, SY), *cars(SC, SX, SY, jam=(9, 8, 7, 6, 5)), *chain_bars(18)),
        fr(1.0, "The last bar is zero: a car has stopped (tag on the ring).", *road(SC, SX, SY), *cars(SC, SX, SY, jam=(8, 7, 6, 5, 4)), *chain_bars(19), label(*ring_point(SC, SX, SY, 4 * 360 / 22), "stopped", 30), {"cut": "the panel slides away; the ring fills the frame"}),
    ],
    "s14": [
        fr(0.0, "The whole ring with its jam (red block); arrows on the moving cars point the way they drive.",
           *road(RC, RX, RY), *jammed(RC, RX, RY, 60), {"arrow": [1500, 560, 1400, 720], "colour": "blue"}, {"arrow": [420, 380, 520, 230], "colour": "blue"}),
        fr(1.0, "One car (cyan) is followed as it drives forwards into the back of the jam.",
           *road(RC, RX, RY), *jammed(RC, RX, RY, 62), {"ring": [*ring_point(RC, RX, RY, 120), 30], "colour": "blue"}, {"move": [*ring_point(RC, RX, RY, 150), *ring_point(RC, RX, RY, 120)], "text": "forwards"}),
    ],
    "s15": [
        fr(0.0, "The jam is outlined by a red arc. The cars keep going one way…",
           *road(RC, RX, RY), *jammed(RC, RX, RY, 64), {"path": "M480 230 A640 330 0 0 1 1100 140", "colour": "red", "width": 14}),
        fr(0.6, "…and the red arc slides the other way, round the ring.",
           *road(RC, RX, RY), *jammed(RC, RX, RY, 80), {"move": [1100, 120, 760, 120], "text": "the jam slides back"}),
        fr(1.0, "Tag on the arc: about 20 km/h, backwards. Cut: the chart.",
           *road(RC, RX, RY), *jammed(RC, RX, RY, 92), chip(760, 70, "jam: ≈ 20 km/h backwards"), {"cut": "the ring flattens into a chart"}),
    ],
    "s16": [
        fr(0.0, "A chart of time and place: every car's trace drawn from left to right as time runs.",
           {"panel": list(TS), "title": "the 22 cars, minute by minute", "rows": []}, *traces()),
        fr(0.6, "The jam is where the traces go flat; those flats line up into a band sloping down: backwards.",
           {"panel": list(TS), "title": "the 22 cars, minute by minute", "rows": []}, *traces(), label(1200, 300, "cars: forwards", 30)),
        fr(1.0, "The slope is labelled: the same ~20 km/h measured on real highways.",
           {"panel": list(TS), "title": "the 22 cars, minute by minute", "rows": []}, *traces(), chip(1250, 720, "≈ 20 km/h, as on real highways"), {"cut": "back to the road, close"}),
    ],
    "s17": [
        fr(0.0, "Close on two cars from the side: the second one right on the first one's bumper.",
           {"horizon": [760]}, {"path": "M300 760 h420 v-120 h-420 Z M760 760 h420 v-120 h-420 Z", "colour": "ink", "fill": "white"}, {"bracket": [720, 760, 600], "text": "1 m"}, {"camera": "right"}),
        fr(1.0, "The first brakes; the tailgater's brake lights flare instantly. A crossed chip: tailgating.",
           {"horizon": [760]}, {"path": "M300 760 h420 v-120 h-420 Z M760 760 h420 v-120 h-420 Z", "colour": "ink", "fill": "white"}, {"glow": [300, 690, 50], "colour": "red"}, {"glow": [760, 690, 50], "colour": "red"}, chip(960, 300, "tailgating ✕"), {"cut": "the camera drops back"}),
    ],
    "s18": [
        fr(0.0, "The cyan car (you) further back, a long gap bracketed in front of it.",
           {"horizon": [760]}, {"path": "M1300 760 h360 v-110 h-360 Z", "colour": "ink", "fill": "white"}, {"path": "M200 760 h360 v-110 h-360 Z", "colour": "blue", "fill": "blue"}, {"bracket": [560, 1300, 600], "text": "a big gap"}),
        fr(1.0, "Its speed tag holds steady while the car ahead speeds up and pulls away.",
           {"horizon": [760]}, {"path": "M1500 760 h360 v-110 h-360 Z", "colour": "ink", "fill": "white"}, {"path": "M200 760 h360 v-110 h-360 Z", "colour": "blue", "fill": "blue"}, {"bracket": [560, 1500, 600], "text": "a big gap"}, chip(380, 520, "steady"), {"cut": "same shot continues"}),
    ],
    "s19": [
        fr(0.0, "The car ahead hits the jam and stops (red); you roll on slowly, lights off.",
           {"horizon": [760]}, {"path": "M1400 760 h360 v-110 h-360 Z", "colour": "ink", "fill": "white"}, {"glow": [1400, 700, 60], "colour": "red"}, {"path": "M260 760 h360 v-110 h-360 Z", "colour": "blue", "fill": "blue"}, {"bracket": [620, 1400, 600], "text": "gap"}),
        fr(0.6, "The gap shrinks as you roll; you never stop.",
           {"horizon": [760]}, {"path": "M1400 760 h360 v-110 h-360 Z", "colour": "ink", "fill": "white"}, {"glow": [1400, 700, 60], "colour": "red"}, {"path": "M700 760 h360 v-110 h-360 Z", "colour": "blue", "fill": "blue"}, {"bracket": [1060, 1400, 600], "text": "gap"}, {"move": [300, 820, 700, 820], "text": "rolling"}),
        fr(1.0, "The car ahead moves off again just as you arrive. Cut: the two speed lines.",
           {"horizon": [760]}, {"path": "M1500 760 h360 v-110 h-360 Z", "colour": "ink", "fill": "white"}, {"path": "M900 760 h360 v-110 h-360 Z", "colour": "blue", "fill": "blue"}, {"cut": "the speeds as lines"}),
    ],
    "s20": [
        fr(0.0, "A chart: the car ahead's speed line (white) dives to zero and back; yours (cyan) runs flat.",
           {"axes": [220, 760, 1480, 520], "xlabel": "time", "ylabel": "speed"}, {"curve": [[220, 300], [500, 280], [620, 760], [900, 760], [1040, 320], [1300, 760], [1700, 400]], "colour": "white"}, {"curve": [[220, 600], [1700, 600]], "colour": "blue"}),
        fr(1.0, "The line of the car behind you is flat too: the wave stops with you.",
           {"axes": [220, 760, 1480, 520], "xlabel": "time", "ylabel": "speed"}, {"curve": [[220, 300], [500, 280], [620, 760], [900, 760], [1040, 320], [1300, 760], [1700, 400]], "colour": "white"}, {"curve": [[220, 600], [1700, 600]], "colour": "blue"}, {"curve": [[220, 608], [1700, 608]], "colour": "ink"}, label(1500, 560, "you, and the car behind", 30), {"cut": "rise to the ring"}),
    ],
    "s21": [
        fr(0.0, "The ring again, jammed; one car marked as the automated one.",
           *road(RC, RX, RY), *jammed(RC, RX, RY, 60), {"ring": [*ring_point(RC, RX, RY, 200), 32], "colour": "blue"}, chip(400, 120, "Stern et al., 2018")),
        fr(1.0, "The marked car holds its speed; a big gap opens in front of it.",
           *road(RC, RX, RY), *jammed(RC, RX, RY, 50, n_jam=8), {"ring": [*ring_point(RC, RX, RY, 230), 32], "colour": "blue"}, chip(400, 120, "Stern et al., 2018"), {"cut": "time speeds up"}),
    ],
    "s22": [
        fr(0.0, "Time sped up: the red block shrinks lap by lap.", *road(RC, RX, RY), *jammed(RC, RX, RY, 40, n_jam=5), chip(1600, 120, "sped up ×8")),
        fr(1.0, "No brake lights left: every car rolling at the same speed.", *road(RC, RX, RY), *cars(RC, RX, RY, start=30, step=12), {"ring": [*ring_point(RC, RX, RY, 30), 32], "colour": "blue"}, {"cut": "the recap cards rise"}),
    ],
    "s23": [
        fr(0.0, "The recap: three glass cards rise in a row over the calm ring.",
           {"card": [120, 230, 520, 520], "label": "one tap grows"}, {"card": [700, 230, 520, 520], "label": "the jam goes backwards"}, {"card": [1280, 230, 520, 520], "label": "a gap soaks it up"}),
        fr(1.0, "Each card holds its small picture: falling bars; a red arc with a backward arrow; the cyan car with its gap.",
           {"card": [120, 230, 520, 520], "label": "one tap grows"}, *[{"bar": [200 + i * 60, 640, 40, 220 - i * 40]} for i in range(6)],
           {"card": [700, 230, 520, 520], "label": "the jam goes backwards"}, {"ring": [960, 520, 140]}, {"arrow": [1040, 400, 880, 400], "colour": "red"},
           {"card": [1280, 230, 520, 520], "label": "a gap soaks it up"}, {"bracket": [1380, 1700, 540], "text": "gap"}, {"cut": "the cards fall away"}),
    ],
    "s24": [
        fr(0.0, "The calm ring, every car moving, the cyan one leading a smooth line.",
           *road(RC, RX, RY), *cars(RC, RX, RY, start=30, step=12, lit=(0,)), {"camera": "pull"}),
        fr(1.0, "The line to remember lands over the ring.",
           *road(RC, RX, RY), *cars(RC, RX, RY, start=40, step=12, lit=(0,)), {"title": [960, 470], "text": "Leave a gap.\nSoak up the wave.", "size": 110, "accent": "Soak up the wave."}),
    ],
    "s25": [
        fr(0.0, "The poster: the line holds over the slowly turning ring, breathing.",
           *road(RC, RX, RY), *cars(RC, RX, RY, start=44, step=12, lit=(0,)), {"title": [960, 470], "text": "Leave a gap.\nSoak up the wave.", "size": 110, "accent": "Soak up the wave."}, {"camera": "push"}),
        fr(1.0, "Last frame: the same, a little closer.",
           *road(RC, RX, RY), *cars(RC, RX, RY, start=48, step=12, lit=(0,)), {"title": [960, 470], "text": "Leave a gap.\nSoak up the wave.", "size": 110, "accent": "Soak up the wave."}),
    ],
}

# ── The shots: the script, in order ─────────────────────────────────────────────────────────────────────────────
shot("s01", "hook", "wide", voice="[curious] Why do traffic jams appear *out of nowhere?*", caption=False,
     teaches="Asks the one question, over the thing itself: a queue of brake lights on an open road.",
     screen="Night. The 3D road (the ring of sim.py opened into a straight lane and repeated), seen low from behind a queue of crawling cars, every brake light lit and blooming. The question in metal type across the top third.",
     motion="The camera creeps forward along the queue; the title types in by character and a sheen crosses 'out of nowhere?'.",
     carries="The road and the queue.", transition="The camera rises; the title lifts away.",
     sound="The bed starts at full level on frame 0; a soft low hit under the title.", check="Frame 0 finished; brake lights read red, not orange; title contrast.")
shot("s02", "hook", "macro", voice="You crawl along, then the road clears.",
     teaches="Names the experience: the jam ends and the road ahead is empty.",
     screen="The camera flies low along the queue to its front, where cars pull away, lights off, onto open road.",
     motion="A forward camera move along the lane, accelerating as the cars do.", carries="The road.", transition="The camera tilts down over the empty road.",
     sound="A soft whoosh as the camera clears the front of the jam.", check="The front of the jam visibly releases cars.")
shot("s03", "hook", "ui", voice="No crash, no roadworks, nothing.",
     teaches="Rules out the usual causes.",
     screen="Above the jam's front looking down the empty lane; two glass chips, 'no crash' and 'no roadworks', each struck through as it is said.",
     motion="Chips pop in on their words; a strike line draws across each.", carries="The road.", transition="Pull back high to see the whole packed road.",
     sound="Two small ticks between the words.", check="Chips 30 px or more; nothing on the road ahead.")
shot("s04", "turn", "wide", voice="[excited] Here's the surprise: enough cars, close together,", facts=["f1", "f8"],
     teaches="The turn: density alone is enough.",
     screen="High above the straight road, side on: one lane full of moving cars; the gap between two of them bracketed '≈ 6 m'.",
     motion="The camera pulls up and turns side on; the bracket draws on 'close together'.", carries="The packed cars.", transition="Brake lights begin to spread in the middle.",
     sound="THE TURN: a soft impact on 'surprise'.", check="The bracket matches the model's 5.95 m gap.")
shot("s05", "turn", "diagram", voice="make the jam themselves.", facts=["f2"],
     teaches="Nothing else is needed: the jam grows among the cars.",
     screen="The same side view: a block of red brake lights forms among the moving cars and grows.",
     motion="Brake lights spread backwards car by car (the model's own jam).", carries="The road.", transition="The road bends: it curls into a ring.",
     sound="Nothing over the words; the bed alone.", check="The cluster grows among cars, not at any obstacle.")
shot("s06", "experiment", "object3d", voice="[warmly] In two thousand eight, Japanese scientists tested it.", facts=["f1"],
     teaches="Sets up the experiment that proved it.",
     screen="The straight lane curls into a closed ring, seen from above at an angle: the test track. Source chip top left: 'Sugiyama et al., 2008 · New Journal of Physics'.",
     motion="The road's curvature runs from 0 to a full circle while the camera rises; the cars ride it.", carries="The cars.", transition="Hold on the closed ring while the labels arrive.",
     sound="A long soft whoosh under the curl, between the words.", check="No double road at the ends while curling.")
shot("s07", "experiment", "diagram", voice="Twenty-two cars, on a ring two hundred and thirty metres around.", facts=["f1"],
     teaches="The setup in numbers.",
     screen="The ring fills the frame, 22 cars evenly spaced; chip '22 cars' at the centre, then a cyan arc measures the lane and a chip '230 m around'.",
     motion="A slow orbit round the ring as the cars cruise; each chip lands on its number and the cyan arc draws round the lane.", carries="The ring.", transition="Push in to one side.",
     sound="A tick on each chip.", check="22 cars exactly; spacing even.")
shot("s08", "experiment", "macro", voice="Everyone was told to hold thirty kilometres an hour.", facts=["f1"],
     teaches="The rule: a steady 30 km/h.",
     screen="Close on one side of the ring at a low angle: cars in an even row; a chip 'every driver: 30 km/h' and speed tags on three cars reading 30.",
     motion="The camera tracks low alongside the cars at their own speed, so they hold still in frame while the ground slides.", carries="The cars.", transition="The camera rises to the whole ring.", sound="No effect: the bed alone.", check="Tags read 30 km/h (the model's start speed).")
shot("s09", "experiment", "wide", voice="No bottleneck, nothing in the way.", facts=["f1"],
     teaches="Nothing in the setup could cause a jam.",
     screen="The whole ring from low over the infield, turning; chip 'no bottleneck'.",
     motion="A slow orbit low over the infield while the cars circle evenly.", carries="The ring.", transition="A soft flash: minutes later.", sound="No effect: the bed alone.", check="The ring is empty but for the cars.")
shot("s10", "experiment", "object3d", voice="Within minutes, cars were stopping dead.", facts=["f2", "f5"],
     teaches="The result: a jam with no cause.",
     screen="The same ring a few minutes on (chip 'a few minutes later'; 'computer model' tag bottom right): half the ring is packed and red with brake lights, the cars there stopped ('0 km/h').",
     motion="The camera pushes toward the jam; stopped cars, moving cars.", carries="The ring.", transition="Rewind to the start, closer.",
     sound="A low hit on 'stopping dead'.", check="Stopped cars stand still; tag reads 0 km/h.")
shot("s11", "mechanism", "macro", voice="[short pause] Here's why. One driver eases off a little.", facts=["f4", "f5"],
     teaches="It starts with one small slowdown.",
     screen="The even ring again, a little closer and set to the left; one car ringed in cyan; its brake lights glow and its tag reads 30 → 25 km/h.",
     motion="Push toward the marked car; its lights glow for three seconds of model time.", carries="The ring and the marked car.", transition="A glass chart panel opens on the right.",
     sound="A small click as the lights come on.", check="The others stay calm.")
shot("s12", "mechanism", "chart", voice="The drivers behind react late and brake harder,", facts=["f4", "f5"],
     teaches="The slowdown passes back and grows.",
     screen="Ring left, panel right: 'Lowest speed, driver by driver', one bar per driver as the slowdown reaches them (sim.json 'dips'), each as tall as that driver's lowest speed, 30 km/h full height. The car whose bar is landing glows on the ring.",
     motion="Model time runs about 1.8 times real time (tagged on screen, worked out so the easing-off lands on 'One' and the stop on 'stops'); bars land one by one in time with the cars.", carries="The chart.", transition="Continues into the next line, same picture.",
     sound="Soft ticks for bars, between words.", check="Bar heights are the model's numbers.")
shot("s13", "mechanism", "object3d", voice="so it grows, car after car, until somebody stops.", facts=["f4", "f5"],
     teaches="The slowdown grows until a car stops.",
     screen="The bars fall steeply (16, 9, 2, 0 km/h); the last car stops on the ring ('stopped').",
     motion="The last bar lands at zero; the camera swings to the stopped car.", carries="The stopped car.", transition="The panel slides away; the ring fills the frame.",
     sound="A soft hit on 'stops'.", check="The 19th bar is zero.")
shot("s14", "wave", "wide", voice="Now watch the jam. The cars go forwards,", facts=["f3"],
     teaches="Look at the jam, not the cars: the cars go one way.",
     screen="The whole ring with its jam; cyan arrows on the moving cars show the way they drive; one car is followed into the back of the jam.",
     motion="Real model time; the camera tracks the followed car.", carries="The ring.", transition="The jam gets outlined in red.", sound="No effect: the bed alone.", check="Arrows point the way the cars drive.")
shot("s15", "wave", "diagram", voice="but the jam slides backwards, at about twenty kilometres an hour.", facts=["f3", "f5"],
     teaches="The jam goes the other way, at about 20 km/h.",
     screen="A red arc outlines the jam and slides backwards round the ring; a red arrow and chip 'jam: ≈ 20 km/h backwards'.",
     motion="Real model time (the model's jam moves 18.5 km/h backwards); the arc follows the stopped cars.", carries="The jam's arc.", transition="The ring flattens into a chart.",
     sound="A soft whoosh with the backward arrow.", check="Arc and arrow go against the cars.")
shot("s16", "wave", "chart", voice="That's a stop-and-go wave. Real highway jams move at that same speed.", facts=["f3", "f5"],
     teaches="It is a wave, and the same one as on real highways.",
     screen="A time-and-place chart: every car's trace (time across, place on the ring up), drawn from the model; the flat parts (stopped) line up into a band sloping down; the band is labelled 'stop-and-go wave', a dashed line marks 20 km/h backwards, chip '≈ 20 km/h on real highways too'.",
     motion="The traces draw left to right as model time runs; the band lights red.", carries="The red band.", transition="Back to the road, close.",
     sound="A shimmer as the band lights.", check="The band's slope matches the dashed 20 km/h line closely.")
shot("s17", "fix", "macro", voice="[short pause] How do you stop one? Don't tailgate.", facts=["f6"],
     teaches="The habit that passes the wave on.",
     screen="Close, side on, on two cars of the ring: the second right on the first's bumper; when the first brakes the second's lights flare; chip 'tailgating' crossed out.",
     motion="The camera tracks alongside the pair, side on, as the front car brakes and the second one copies it at once.", carries="The road.", transition="The camera drops back.", sound="A small buzz on the cross.", check="Gap reads small.")
shot("s18", "fix", "object3d", voice="Leave a big gap, and keep a steady speed.", facts=["f6", "f7"],
     teaches="The habit that soaks it up: a big gap, a steady speed.",
     screen="The cyan car ('you', the model's wave-absorbing car) with a long gap bracketed in front; its tag holds a steady speed while the car ahead pulls away.",
     motion="Camera tracks with the cyan car; the gap bracket stretches as the car ahead accelerates.", carries="The cyan car.", transition="Continues: the same car, the gap now shrinking.", sound="No effect: the bed alone.", check="The speed tag holds steady.")
shot("s19", "fix", "macro", voice="When the car ahead brakes, don't copy it. Let the gap shrink.", facts=["f6", "f7"],
     teaches="The gap is the buffer: it shrinks instead of you stopping.",
     screen="The car ahead stops in the jam (red); the cyan car keeps rolling, lights off, the gap bracket shrinking; the car ahead moves off before the gap is gone.",
     motion="The camera tracks with the cyan car; the bracket shortens as it rolls up on the stopped car, then the car ahead moves off.", carries="The cyan car.", transition="The two speeds become lines on a chart.", sound="No effect between these words.", check="The cyan car never stops.")
shot("s20", "fix", "chart", voice="You soak up the wave instead of passing it on.", facts=["f7"],
     teaches="Proof in two lines: the wave stops at you.",
     screen="A chart of speed against time from the model: the car ahead (white) dives to zero and back; you (cyan) run flat; the car behind you (grey) runs flat too.",
     motion="The three speed lines draw left to right in model time; the white one dives, the cyan and grey stay flat.", carries="The cyan line.", transition="The chart fades as the camera rises to the ring.", sound="A soft success chime after 'on'.", check="Lines are the model's speeds.")
shot("s21", "fix", "wide", voice="Later, one car with a computer on the pedals did just that,", facts=["f6"],
     teaches="Real evidence: one automated car calmed a whole ring.",
     screen="The jammed ring; one car ringed in cyan ('one car, speed set by a computer'); source chip 'Stern et al., 2018 · USA'. The ringed car holds its speed and a big gap opens ahead of it.",
     motion="A slow orbit over the jammed ring in real model time; the ringed car rolls steadily as the gap opens ahead of it.", carries="The ring.", transition="Model time speeds up on the same picture.", sound="No effect: the bed alone.", check="Chip says the model, not the experiment, is on screen.")
shot("s22", "fix", "object3d", voice="and the waves faded.", facts=["f6", "f7"],
     teaches="The waves die out across the whole ring.",
     screen="Model time sped up (×8 tag): the red block shrinks and goes; every car rolls at the same speed.",
     motion="Model time runs eight times faster (tagged), the camera turns slowly; the red lights go out one by one.", carries="The calm ring.", transition="The recap cards rise.", sound="A soft rising shimmer as the last lights go out.", check="No brake lights at the end.")
shot("s23", "recap", "recap", voice="[warmly] So a jam out of nowhere starts with one tap on the brakes.", facts=["f4", "f3", "f7"],
     teaches="The answer in three pictures.",
     screen="Three glass cards over the dimmed ring: 'one tap grows' (falling bars, the model's), 'the jam goes backwards' (a ring with a red backward arrow), 'a gap soaks it up' (the cyan car and its gap).",
     motion="Cards rise in turn; their small pictures draw.", carries="The calm ring behind.", transition="The cards fall away.", sound="A card sound each.", check="The small bars are the same numbers as s12.")
shot("s24", "recap", "endcard", voice="And it can end with you.",
     teaches="The payoff: the viewer can stop it.",
     screen="The calm ring, the cyan car leading a smooth line; the line to remember lands: 'Leave a gap. Soak up the wave.'",
     motion="A slow pull back over the calm ring; the title types in by character and a sheen crosses its accent.", carries="The title.", transition="Holds into the poster.", sound="THE PAYOFF: a warm hit as the title lands.", check="Title contrast.")
shot("s25", "recap", "endcard", length=2.6,
     teaches="The poster: the line to remember, readable for over two seconds.",
     screen="As s24, held: the title 'Leave a gap. Soak up the wave.' over the calm ring, every car rolling, breathing.",
     motion="A slow push of 3 percent; the cars keep circling at their even speed.", carries="Nothing: the film ends.", transition="End on the poster: no fade to black.",
     sound="The bed rings to the last frame on its last chord.", check="Sound to the last frame; nothing pops.")

duration = shots[-1]["end"]
dips = ", ".join(f"{d[2]:.1f}" for d in DIPS)

storyboard = {
    "title": "Why do traffic jams appear out of nowhere?",
    "question": "Why do traffic jams appear out of nowhere?",
    "audience": "Anyone who drives or rides in traffic, watching on X or Reddit, anywhere in the world. They have sat in a jam with no visible cause; they think jams need a crash, roadworks or a bottleneck.",
    "promise": "With enough cars close together, one small slowdown grows from driver to driver into a jam that slides backwards while the cars go forwards; leaving a big gap and holding a steady speed soaks the wave up instead of passing it on.",
    "language": "en",
    "format": "1920x1080",
    "subtitles": True,
    "duration": round(duration, 3),
    "fps": 60,
    "poster": round(duration - 1.2, 3),
    "voice": {"voice_id": "RorawgRgSS2YxWqy31vY", "name": "Catherine", "model": "eleven_v4", "language": "en"},
    "look": {
        "accent": "#ff5a48",
        "accent2": "#4fd0ff",
        "mood": "Night on a test track: the kit's graphite stage as the dark ground, the road a lit band of asphalt, the cars lit 3D models with glowing tail lights. Red (the accent) is braking and the jam, nothing else; cyan is the car that soaks the wave up, and the driver who started it. The stage light sits on the jam and follows it.",
    },
    "music": {"track": "Composed for this film (kit/audio/music.mjs)", "bpm": 96, "start": 0,
              "note": "A bed composed after the take, to the film's length; the cuts follow the voice."},
    "facts": [
        {"id": "f1", "claim": "In the experiment 22 cars drove on a single-lane circular road 230 m around, on flat ground with no bottleneck; they started almost evenly spaced at about 30 km/h, the drivers asked to cruise at about 30 km/h and to follow the car ahead safely. Published 4 March 2008. The gap between cars: 230 / 22 = 10.45 m front to front; with cars 4.5 m long (the model's assumption), about 6 m (5.95 m) bumper to bumper.",
         "source": "Sugiyama, Fukui, Kikuchi, Hasebe, Nakayama, Nishinari, Tadaki and Yukawa, 'Traffic jams without bottlenecks: experimental evidence for the physical mechanism of the formation of a jam', New Journal of Physics 10 (2008) 033001 (read in full from the open-access copy, University of Osaka repository hdl.handle.net/11094/93262). The experiment was run at the track of Nakanihon Automotive College, Japan."},
        {"id": "f2", "claim": "Small fluctuations grew until free flow broke down: the paper's snapshot 3 minutes after the start shows a jam, and several cars were forced to stop completely for a moment. The paper's point: a jam forms spontaneously once the density of cars passes a critical value; a bottleneck is only a trigger. The film's 'within minutes' and 'stopping dead' are these.",
         "source": "Sugiyama et al. 2008 (f1), abstract, text and figure 3."},
        {"id": "f3", "claim": "The jam cluster moved backwards at roughly 20 km/h while the cars kept going forwards (outside the jam at about 40 km/h); about 20 km/h is the common speed of jams measured on real highways (the paper compares it with aerial traces of highway traffic, Treiterer and Myers 1974).",
         "source": "Sugiyama et al. 2008 (f1), text and figures 4 and 5."},
        {"id": "f4", "claim": "The chain from one small slowdown to a stop is the film's model, not a measurement from the experiment: in sim.py one driver eases off from 30 to 25 km/h (-0.5 m/s2 for 3 s); as the slowdown passes back, the lowest speed of each driver it reaches is " + dips + " km/h: the first few about the same, then each lower, until the 19th driver stops. Simplification said in words: 'the drivers behind react late and brake harder'.",
         "source": "sim.py (this film), dips in sim.json."},
        {"id": "f5", "claim": f"The ring on screen is a computer model, labelled as one: 22 cars 4.5 m long on a 230 m ring, Intelligent Driver Model (Treiber, Hennecke and Helbing 2000) with a 0.35 s reaction delay, parameters set so that 30 km/h at this spacing is steady. Its jam moves {M['jam_speed_kmh']} km/h (backwards), close to the experiment's 20; cars outside reach {M['free_speed_max_kmh']} km/h (the experiment: about 40); about {M['stopped_cars_mean']} cars are stopped at a time (the experiment's jam held about 5). The model's first car stops {M['first_stop_s']:.0f} s after the slowdown; the real drivers took a few minutes, so the film never shows the model's clock, and its sped-up passages are tagged.",
         "source": "sim.py and sim.json (this film); Treiber, Hennecke, Helbing, Phys. Rev. E 62, 1805 (2000)."},
        {"id": "f6", "claim": "In a later ring experiment (260 m, 21 to 22 cars, run by the University of Arizona, USA), one car whose speed was controlled by a computer (a human still steered) dampened the stop-and-go waves; one of its controllers simply estimated the average speed and drove at it, letting the gap ahead open when the car in front sped up and close when it slowed. 'One car with a computer on the pedals' is that car. The driving advice (a big gap, a steady speed, don't copy the brakes ahead) is what that controller does; the film does not claim a human study.",
         "source": "Stern et al., 'Dissipation of stop-and-go waves via control of autonomous vehicles: Field experiments', Transportation Research Part C 89 (2018) 205-221 (read in full, arXiv:1705.01693), sections 2.1 and 3.2."},
        {"id": "f7", "claim": f"In the film's model, one car (car 11) switched to that controller {SIM['on']:.0f} s in (holding the ring's measured average, {M['absorber_speed_kmh']} km/h, and a long gap) smooths the ring: the spread of speeds over a minute falls from {M['speed_spread_before_kmh']} km/h to {M['speed_spread_after_kmh']} km/h. The car ahead of it stops and starts; it and the cars behind it roll at an even speed.",
         "source": "sim.py, scenario 'absorb' (this film)."},
        {"id": "f8", "claim": "'Enough cars, close together' is the critical density of f2; '≈ 6 m' on screen is the ring's 5.95 m bumper-to-bumper gap (f1).",
         "source": "Sugiyama et al. 2008; arithmetic in f1."},
    ],
    "acts": [
        {"id": "hook", "title": "Out of nowhere", "goal": "The question, over a jam on an open road with no cause in sight.", "rail": False},
        {"id": "turn", "title": "The surprise", "goal": "Break the belief: no cause is needed, only enough cars close together.", "rail": False},
        {"id": "experiment", "title": "The ring", "goal": "The 2008 experiment: 22 cars, a 230 m ring, 30 km/h, and still a jam.", "rail": False},
        {"id": "mechanism", "title": "Why", "goal": "One small slowdown grows from driver to driver until a car stops.", "rail": False},
        {"id": "wave", "title": "The wave", "goal": "The jam travels backwards at about 20 km/h while every car goes forwards, as on real highways.", "rail": False},
        {"id": "fix", "title": "The fix", "goal": "A big gap and a steady speed soak the wave up; one automated car did it for a whole ring.", "rail": False},
        {"id": "recap", "title": "Recap", "goal": "The three ideas in one frame, and the line to remember.", "rail": False},
    ],
    "shots": shots,
}

out = HERE / "storyboard.json"
out.write_text(json.dumps(storyboard, ensure_ascii=False, indent=2) + "\n")
print(f"{len(shots)} shots, {sum(len(s['frames']) for s in shots)} frames, about {duration:.1f} s before the take -> {out}")
words = " ".join(s.get("voice", "") for s in shots)
import re
plain = re.sub(r"\[[^\]]*\]", " ", words).replace("*", "")
print(f"script: {len(plain.split())} words, {len(re.sub(r'\\s+', ' ', plain).strip())} characters")
# The take sets the times: once it is there, put them back after every build.
manifest = HERE / "voice" / "voice.json"
if manifest.exists() and json.loads(manifest.read_text()).get("version") == 2:
    kit = next(p for p in HERE.parents if (p / "kit" / "audio" / "voice.mjs").exists())
    subprocess.run(["node", str(kit / "kit" / "audio" / "voice.mjs"), str(HERE), "--retime"], check=False, stdout=subprocess.DEVNULL)
