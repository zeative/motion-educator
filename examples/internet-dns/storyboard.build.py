"""Writes storyboard.json for "How does the internet know where to go?" (landscape 1920 x 1080, the Isometric template).

The sample film of the Isometric template: a soft pastel miniature internet, always at the same 30-degree isometric
angle, where your phone, the DNS servers, the routers and a real server in Singapore are little matte blocks on
floating slabs. It speaks (English, one take, every spoken line shown as a subtitle); the shot times here are a guess
until the take retimes the board:

    python3 examples/internet-dns/storyboard.build.py && node kit/tools/storyboard.mjs examples/internet-dns --png

One real example runs through the whole film, checked on 2026-11-23 (facts f4, f6, f12): looked up from Australian
networks (Telstra, Optus), en.wikipedia.org resolves to 103.102.166.224, Wikimedia's caching data centre in Singapore
(eqsin). Every block is placed with the same isometric projection the build uses (Iso.p below: x and y on the ground
grid, z up, one grid unit = U pixels), so a block drawn at (x, y, z) on the board is built at (x, y, z) in the film.
"""
import json
import math
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
shots = []

# ── The numbers ──────────────────────────────────────────────────────────────────────────────────────────────────
IP = "103.102.166.224"  # en.wikipedia.org looked up from Australia (f4)
OCTETS = [int(n) for n in IP.split(".")]
assert len(OCTETS) == 4 and all(0 <= n <= 255 for n in OCTETS)  # four octets, each 0..255 = 2**8 values (f3)
TTL = 180  # seconds: dyna.wikimedia.org's TTL in Wikimedia's zone file (f8)
PAGE_BYTES = 52254  # gzip-compressed HTML of en.wikipedia.org/wiki/Main_Page, measured 2026-11-23 (f12)
MSS = 1500 - 20 - 20  # bytes of data in one packet: Ethernet MTU minus the IPv4 and TCP headers (f12)
PACKETS = math.ceil(PAGE_BYTES / MSS)  # 36
assert PACKETS == 36
CABLE_KM = 4600  # INDIGO-West, Perth - Jakarta - Singapore (f11)


def idn(n):
    """A number written the English way: 4,600, 52,254."""
    return f"{n:,}"

# ── The isometric projection (the build uses the same) ───────────────────────────────────────────────────────────
# Every diorama is one Iso: an origin on screen (the centre of its slab) and U pixels to a grid unit. x runs to the
# lower right, y to the lower left, z up; the angle never changes, only the origin (a pan) and U (a zoom).
C = math.cos(math.pi / 6)
ACCENT = "#ff5d8f"  # the one saturated accent: your request, its packets and the number it needs
PERI, PEACH, MINT, BUTTER, INK, WHITE, SEAC, PALE = "#7b8cff", "#ffb4a2", "#9ee6c5", "#ffe08a", "#2d3047", "#ffffff", "#c9d0ff", "#d7dcff"
SAFE_Y = 890  # the caption pill sits below this; everything that must be read stays above it


class Iso:
    def __init__(self, ox, oy, u):
        self.o, self.u = (ox, oy), u

    def p(self, x, y, z=0.0):
        return (self.o[0] + (x - y) * C * self.u, self.o[1] + (x + y) * 0.5 * self.u - z * self.u)

    def poly(self, pts, fill, layers=1, width=4):
        d = "M" + " L".join(f"{a:.0f} {b:.0f}" for a, b in (self.p(*q) for q in pts)) + " Z"
        return [{"path": d, "fill": fill, "width": width if i == 0 else 0.1} for i in range(layers)]

    def block(self, x, y, z, w, d, h, colour):
        """A matte block lit from the upper left: the top lightest, the left face a step darker, the right darker."""
        top = [(x, y, z + h), (x + w, y, z + h), (x + w, y + d, z + h), (x, y + d, z + h)]
        left = [(x, y + d, z), (x + w, y + d, z), (x + w, y + d, z + h), (x, y + d, z + h)]
        right = [(x + w, y, z), (x + w, y + d, z), (x + w, y + d, z + h), (x + w, y, z + h)]
        return self.poly(left, colour, 2) + self.poly(right, colour, 3) + self.poly(top, colour, 1)

    def slab(self, x, y, w, d, t=0.4, colour=WHITE):
        return self.block(x, y, -t, w, d, t, colour)

    def house(self, x, y, w=2.4, h=1.5, colour=BUTTER, roof=PEACH):
        r = w * 0.4
        out = self.block(x, y, 0, w, w, h, colour)
        out += self.poly([(x, y + w, h), (x + w, y + w, h), (x + w, y + w / 2, h + r), (x, y + w / 2, h + r)], roof, 2)
        out += self.poly([(x + w, y, h), (x + w, y + w, h), (x + w, y + w / 2, h + r)], roof, 3)
        return out

    def phone(self, x, y, page=0.0, h=3.6):
        """Your phone standing on its slab, the screen on its front-left face; page = how much of the page shows."""
        out = self.block(x, y, 0, 2.0, 0.34, h, PERI)
        yy = y + 0.34
        out += self.poly([(x + 0.16, yy, 0.3), (x + 1.84, yy, 0.3), (x + 1.84, yy, h - 0.3), (x + 0.16, yy, h - 0.3)], WHITE, 1, 3)
        for i in range(round(page * 7)):
            z = h - 0.7 - i * 0.38
            a, b = self.p(x + 0.4, yy, z), self.p(x + (1.6 if i % 3 else 1.1), yy, z)
            out.append({"line": [round(a[0]), round(a[1]), round(b[0]), round(b[1])], "width": 7 if i == 0 else 4})
        return out

    def packet(self, x, y, z=0.1, s=0.55):
        return self.block(x - s / 2, y - s / 2, z, s, s, s, ACCENT)

    def route(self, pts, colour=ACCENT, dashed=True, z=0.02, width=6):
        d = "M" + " L".join(f"{a:.0f} {b:.0f}" for a, b in (self.p(x, y, z) for x, y in pts))
        return {"path": d, "colour": colour, "width": width, "dashed": dashed}

    def road(self, pts):
        return self.route(pts, colour="#aab0d0", dashed=False, width=10)

    def tag(self, x, y, z, text, lift=60, size=34, colour=None, dx=0):
        return tag(*self.p(x, y, z), text, lift, size, colour, dx)

    def move(self, a, b, text=None, z=0.6):
        (x0, y0), (x1, y1) = self.p(*a, z), self.p(*b, z)
        return {"move": [round(x0), round(y0), round(x1), round(y1)], **({"text": text} if text else {})}


def tag(ax, ay, text, lift=60, size=34, colour=None, dx=0):
    """A floating tag: a white pill with a thin line to the part it names (above it, or below with a negative lift)."""
    w, h = len(text) * size * 0.5 + 44, size * 1.55
    cy = ay - lift - h / 2 if lift >= 0 else ay - lift + h / 2
    x0, y0, r = ax + dx - w / 2, cy - h / 2, h / 2
    pill = f"M{x0 + r:.0f} {y0:.0f} H{x0 + w - r:.0f} A{r:.0f} {r:.0f} 0 0 1 {x0 + w - r:.0f} {y0 + h:.0f} H{x0 + r:.0f} A{r:.0f} {r:.0f} 0 0 1 {x0 + r:.0f} {y0:.0f} Z"
    end = y0 + h if lift >= 0 else y0
    out = [{"line": [round(ax), round(ay), round(ax), round(end)], "width": 3}, {"path": pill, "fill": WHITE, "width": 4}]
    out.append(label(ax + dx, cy + size * 0.36, text, size, **({"colour": colour} if colour else {})))
    return out


def label(x, y, text, size=40, **more):
    return {"label": [round(x), round(y)], "text": text, "size": size, **more}


def card(x, y, lines, w=560, accent_row=None, row=84):
    """A white record card floating in the air (an answer, a contact, a packet's label)."""
    out = [{"panel": [round(x), round(y), w, row * len(lines) + 24], "rows": lines}]
    if accent_row is not None:
        yy = y + 24 + row * accent_row + row * 0.5 + 8
        out.append({"path": f"M{x + 34:.0f} {yy + 22:.0f} H{x + w - 40:.0f}", "colour": ACCENT, "width": 8})
    return out


def fr(at, note, *draw):
    flat = []
    for d in draw:
        flat.extend(d if isinstance(d, list) else [d])
    return {"at": at, "note": note, "draw": flat}


# ── The dioramas ─────────────────────────────────────────────────────────────────────────────────────────────────
HOME = Iso(960, 560, 76)  # the opening: 8 x 8 units, 1053 px wide


def home(page=0.0, typed="en.wikipedia.org", cube=None, packets=(), where=True):
    """Your phone at the front left, your house at the back right, two trees, a tiny figure, a road out."""
    I = HOME
    out = I.slab(-4, -4, 8, 8)
    out += [I.road([(-1.2, 1.0), (4.0, 1.0)])]
    out += I.block(-3.6, -3.6, 0, 1.0, 1.0, 1.0, MINT) + I.block(-2.4, -3.7, 0, 0.8, 0.8, 1.5, MINT)
    out += I.house(0.6, -3.4)
    out += I.phone(-3.2, 1.3, page)
    fx, fy = I.p(1.4, 2.4)
    out.append({"person": [round(fx), round(fy), 120]})
    if where:
        out += tag(fx, fy + 8, "you, in Australia", -16, 30)
    if typed:
        out += I.tag(-2.2, 1.47, 3.6, typed, lift=46, size=44)
    if cube:
        out += I.packet(*cube)
    for q in packets:
        out += I.packet(*q)
    return out


CITY = Iso(960, 480, 32)


def city(question=True):
    """The whole miniature internet: blocks as far as the slab goes, your house at the front-left corner."""
    I = CITY
    out = I.slab(-12, -12, 24, 24, t=0.6)
    heights = [1.2, 2.6, 0.8, 3.4, 1.6, 2.0, 0.9, 2.9, 1.4, 3.8, 1.1, 2.2, 0.7, 2.5, 1.9, 3.1, 1.3, 0.9, 2.7, 1.5, 3.6, 1.0, 2.3, 1.7]
    colours = [PERI, PEACH, MINT, BUTTER, PERI]
    top = {}
    for k, (gx, gy) in enumerate((gx, gy) for gx in range(5) for gy in range(5) if (gx, gy) != (0, 4)):
        x, y = -11 + gx * 4.6, -11 + gy * 4.6
        out += I.block(x, y, 0, 2.6, 2.6, heights[k], colours[(gx + gy) % 5])
        top[gx, gy] = (x + 1.3, y + 1.3, heights[k])
    out += I.house(-11, 7.4, 2.6)
    out += I.tag(-9.7, 8.7, 2.6, "you", lift=40, size=34)
    if question:
        for key in [(2, 0), (4, 1), (1, 2), (3, 3), (4, 4)]:
            out += I.tag(*top[key], "?", lift=30, size=44)
    return out


STREET = Iso(960, 650, 66)
PANEL = (420, 70, 1080, 300)  # the router's number panel, above it
ROWS = ["103.102.166.…  → route A", "198.41.0.…  → route B", "208.80.154.…  → route C"]


def router_sign(highlight=False, name=None, bounce=False, packet=None):
    """A crossroads with one router block; the panel above it says which way each kind of number goes."""
    I = STREET
    out = I.slab(-3.6, -3.6, 7.2, 7.2)
    out += [I.road([(-3.6, 0.9), (3.6, 0.9)]), I.road([(0.9, -3.6), (0.9, 3.6)])]
    out += I.block(-0.6, -0.6, 0, 1.6, 1.6, 1.4, PERI) + I.block(-0.1, -0.1, 1.4, 0.5, 0.5, 0.5, INK)
    x, y, w, h = PANEL
    out.append({"panel": [x, y, w, h], "rows": ROWS})
    ax, ay = I.p(0.2, 0.2, 1.9)
    out.append({"line": [round(ax), round(ay), round(ax), y + h], "width": 3})
    if highlight:
        out.append({"path": f"M{x + 40} {y + 72} H{x + 470}", "colour": ACCENT, "width": 8})
    if name:
        out += I.tag(*name, 0.1, "en.wikipedia.org", lift=40, size=40)
        if bounce:
            nx, ny = I.p(*name, 0.1)
            out.append(label(nx - 250, ny - 60, "?", 110))
    if packet:
        out += I.packet(*packet, 0.1, 0.7)
    return out


def ip_anatomy():
    """Push in on the panel: the full number, and the bracket that splits it into its four parts."""
    out = [{"panel": [PANEL[0], PANEL[1], PANEL[2], PANEL[3]], "rows": ROWS}, {"path": f"M{PANEL[0] + 40} {PANEL[1] + 72} H{PANEL[0] + 470}", "colour": ACCENT, "width": 8}]
    size, cw = 130, 52  # the figure and the width of one of its characters
    out.append({"number": [960, 580], "text": IP, "size": size, "colour": ACCENT})
    x0 = 960 - len(IP) * cw / 2
    for k in range(4):  # one bracket under each group of digits: characters 0-2, 4-6, 8-10, 12-14
        a = x0 + k * 4 * cw
        out.append({"bracket": [round(a + 4), round(a + 3 * cw - 4), 660], "text": "0–255"})
    out.append(label(960, 790, "IP address: 4 numbers, each 0–255", 44))
    return out


# The DNS district: five small floating islands, one per machine, so nothing hides behind anything.
ISLE = {"home": Iso(300, 740, 58), "resolver": Iso(720, 620, 58), "root": Iso(1130, 400, 58), "org": Iso(1600, 450, 58), "ns": Iso(1520, 790, 58)}
TOPS = {"resolver": 2.4, "root": 2.8, "org": 2.2, "ns": 1.8}
NAMES = {"resolver": "DNS resolver", "root": "root server", "org": ".org server", "ns": "wikipedia.org server"}
COLOURS = {"resolver": MINT, "root": PERI, "org": PEACH, "ns": BUTTER}


def zoomed(view, k=1.45, centre=(510, 660), to=(720, 640)):
    """The same islands seen closer: the camera zooms by k about centre, which lands at to."""
    return {key: Iso(to[0] + (I.o[0] - centre[0]) * k, to[1] + (I.o[1] - centre[1]) * k, I.u * k) for key, I in view.items()}


CLOSE = zoomed(ISLE)


def at(key, z=None):
    """Where a machine's top (or a height z) is on screen."""
    return ISLE[key].p(0, 0, TOPS.get(key, 1.6) if z is None else z)


def district(servers=("root", "org", "ns"), rise=1.0, links=False, view=None):
    view = view or ISLE
    out = []
    I = view["home"]
    out += I.slab(-1.8, -1.8, 3.6, 3.6) + I.house(-0.2, -1.6, 1.6) + I.phone(-1.6, 0.4, 0, 2.2)
    out += I.tag(-0.6, 0.57, 2.2, "you", lift=36, size=32)
    for key in ["resolver", *servers]:
        I = view[key]
        h = TOPS[key] * (rise if key != "resolver" else 1)
        out += I.slab(-1.8, -1.8, 3.6, 3.6) + I.block(-1.0, -1.0, 0, 2.0, 2.0, h, COLOURS[key])
        if key == "resolver" or rise >= 1:
            out += I.tag(0, 0, h, NAMES[key], lift=44, size=32)
    if links:
        for key in servers:
            (x0, y0), (x1, y1) = at("resolver", 1.0), at(key, 1.0)
            out.append({"line": [round(x0), round(y0), round(x1), round(y1)], "dashed": True, "width": 3})
    return out


def cube_at(key, z=None, s=0.6):
    I = ISLE[key]
    return I.packet(0.9, 0.9, TOPS.get(key, 1.6) if z is None else z, s)


def trip(a, b, text=None):
    (x0, y0), (x1, y1) = at(a, 1.0), at(b, 1.0)
    k = 0.18
    return {"move": [round(x0 + (x1 - x0) * k), round(y0 + (y1 - y0) * k), round(x1 - (x1 - x0) * k), round(y1 - (y1 - y0) * k)], **({"text": text} if text else {})}


CONTACT, RECORD = Iso(520, 640, 68), Iso(1400, 640, 68)


def compare_pair(right=True, lit=True):
    out = CONTACT.slab(-2.6, -2.6, 5.2, 5.2) + CONTACT.block(-1.0, -1.8, 0, 2.0, 3.6, 0.25, PERI) + CONTACT.poly([(-0.8, -1.6, 0.25), (0.8, -1.6, 0.25), (0.8, 1.6, 0.25), (-0.8, 1.6, 0.25)], WHITE)
    out += card(220, 110, ["Mum", "04•• ••• •••"], 600, accent_row=1 if lit else None, row=104)
    out += [{"line": [520, 342, 520, 600], "width": 3}, label(520, 870, "your contacts", 44)]
    if right:
        out += RECORD.slab(-2.6, -2.6, 5.2, 5.2) + RECORD.block(-1.0, -1.0, 0, 2.0, 2.0, 2.2, MINT)
        out += card(1080, 110, ["en.wikipedia.org", IP], 640, accent_row=1, row=104)
        out += [{"line": [1400, 342, 1400, 470], "width": 3}, label(1400, 870, "DNS", 44)]
    return out


CACHE = Iso(960, 620, 88)


def cache(lid=1.0, neighbour=False):
    """Close on the resolver: its roof lifted, the answer filed on a shelf, a timer running."""
    I = CACHE
    out = I.slab(-3, -3, 6, 6)
    out += I.block(-1.4, -1.4, 0, 2.8, 2.8, 1.7, MINT)
    out += I.block(-1.0, -0.2, 1.7, 2.0, 0.4, 0.8, WHITE)
    out += I.block(-1.5, -1.5, 1.7 + lid * 1.4, 3.0, 3.0, 0.3, MINT)
    out += card(240, 90, ["en.wikipedia.org", IP], 600, accent_row=1)
    sx, sy = I.p(0, 0.0, 2.5)
    out.append({"line": [540, 282, round(sx), round(sy)], "width": 3})
    out += [{"ring": [1480, 230, 90]}, {"path": "M1480 230 L1480 160 M1480 230 L1532 262", "width": 7}, label(1480, 380, f"{TTL} seconds", 44)]
    if neighbour:
        out += I.house(-2.9, 1.5, 1.3)
        (hx, hy), (rx, ry) = I.p(-1.6, 2.2, 0.8), I.p(-1.4, 1.0, 0.8)
        out += [{"arrow": [round(hx), round(hy - 20), round(rx), round(ry - 20)]}, {"arrow": [round(rx), round(ry + 20), round(hx), round(hy + 20)], "colour": ACCENT}]
        out += I.tag(-2.25, 2.15, 1.8, "neighbour", lift=30, size=30)
    return out


def packet_scene(label_on=True, rise=1.0):
    I = HOME
    out = home(typed=None, where=False)
    out += I.packet(-2.2, 1.47, 3.6 + rise * 0.8, 0.9)
    if label_on:
        out += card(1180, 40, [f"to: {IP}", "from: you", "asks for: the page"], 620, accent_row=0)
        px, py = I.p(-1.75, 1.47, 4.9)
        out.append({"line": [1180, 130, round(px), round(py)], "width": 3})
    return out


ROADS = Iso(960, 500, 46)
ROUTERS = [(-6, 2), (-2, 2), (-2, -2), (2, -2), (2, 2), (6, -2), (6, 2), (-6, -2), (2, -6), (-2, -6), (6, -6)]


def router_net(packet_at=None, wave=1.0):
    """The road network: little router blocks at every junction between your house and the coast."""
    I = ROADS
    out = I.slab(-10, -8, 20, 12)
    for y in (-6, -2, 2):
        out.append(I.road([(-10, y), (8.6, y)]))
    for x in (-6, -2, 2, 6):
        out.append(I.road([(x, -8), (x, 4)]))
    out += I.house(-9.6, 1.0, 2.0)
    for x, y in ROUTERS:
        if (x + 10) / 20 <= wave:
            out += I.block(x - 0.7, y - 0.7, 0, 1.4, 1.4, 1.0, PERI)
    out += I.block(8.6, -8, -0.4, 1.4, 12, 0.3, SEAC)
    out += I.tag(9.3, -2.0, 0, "to the coast", lift=60, size=32)
    if packet_at:
        out += I.packet(*packet_at, z=1.05, s=0.7)
    return out


SEA = Iso(940, 470, 52)


def sea(packet_t=None, server=0.0):
    """The crossing: the Indonesian coast, the strait sliced open at the front to show the cable on the sea bed, Singapore."""
    I = SEA
    out = I.slab(-12, -3, 7, 6)
    out += I.block(-7.4, -0.7, 0, 1.4, 1.4, 1.0, PERI)
    out += I.block(-5, -3, -2.0, 9, 6, 0.3, BUTTER)
    out += I.block(-5, -3, -1.7, 9, 6, 1.4, SEAC)
    waves = [(-5 + k * 0.5, 3, -0.3 + (0.08 if k % 2 else -0.04)) for k in range(19)]
    out.append({"path": "M" + " L".join(f"{a:.0f} {b:.0f}" for a, b in (I.p(*q) for q in waves)), "colour": "blue", "width": 4})
    cable = [(-5, 3, -1.45), (-2, 3, -1.6), (1, 3, -1.6), (4, 3, -1.45)]
    out.append({"path": "M" + " L".join(f"{a:.0f} {b:.0f}" for a, b in (I.p(*q) for q in cable)), "width": 12})
    out.append(I.route([(-6.7, 0), (-5, 0)], colour=INK, dashed=False, width=5))
    out += I.slab(4, -3, 7, 6)
    if server > 0:
        out += I.block(6.0, -1.4, 0, 2.8, 2.8, 3.0 * server, PERI)
    out += I.tag(-9, -3, 0, "Australia", lift=40, size=36) + I.tag(8, -3, 0, "Singapore", lift=40, size=36)
    out += I.tag(-0.5, 3, -1.6, "undersea cable", lift=-60, size=36)
    out += I.tag(-0.5, 3, -2.0, f"example: INDIGO-West, Perth–Singapore, {idn(CABLE_KM)} km", lift=-130, size=30)
    if packet_t is not None:
        x = -6.7 + packet_t * 15.0
        under = -5 < x < 4
        out += I.packet(x, 3.0 if under else 0, -1.6 if under else 0.1, 0.7)
    return out


DC = Iso(960, 610, 62)


def datacentre(lid=0.0, out_packets=0, rise=1.0):
    """Wikimedia's caching data centre in Singapore (eqsin): a base, four racks, a roof that lifts."""
    I = DC
    out = I.slab(-4.4, -4.4, 8.8, 8.8)
    out += I.block(-2.4, -2.4, 0, 4.8, 4.8, 0.3, PALE)
    for i in range(4):
        out += I.block(-2.0 + i * 1.1, -1.4, 0.3, 0.8, 2.8, 2.4 * rise, PERI)
    out += I.block(-2.5, -2.5, (2.8 + lid * 2.2) * rise, 5.0, 5.0, 0.35, PALE)
    out += I.tag(2.5, -2.5, (3.1 + lid * 2.2) * rise, "Wikipedia's server · Singapore", lift=70, size=34, dx=200)
    out += I.tag(-2.5, 2.5, 0.3, IP, lift=330, size=44, colour=ACCENT)
    for k in range(out_packets):
        out += I.packet(-2.0 - k * 0.55, 3.0 + k * 0.55, 0.1, 0.45)
    return out


RECAP = [Iso(360, 660, 56), Iso(960, 660, 56), Iso(1560, 660, 56)]


def recap(n=3, run=None):
    a, b, c = RECAP
    big = dict(w=500, row=110)
    out = a.slab(-2.5, -2.5, 5, 5) + a.block(-1, -1, 0, 2, 2, 2.2, MINT) + card(110, 120, ["1 · name → number"], **big)
    if n >= 2:
        out += b.slab(-2.5, -2.5, 5, 5) + b.block(-2.2, 0.4, 0, 1.2, 1.2, 0.9, PERI) + b.block(0.6, -1.9, 0, 1.2, 1.2, 0.9, PERI)
        out += [b.route([(-1.6, 1.0), (-0.4, -0.4), (1.2, -1.3)])] + b.packet(-0.4, -0.4, 0.1) + card(710, 120, ["2 · number → route"], **big)
    if n >= 3:
        out += c.slab(-2.5, -2.5, 5, 5) + c.block(-1.2, -1.2, 0, 2.4, 2.4, 2.4, PERI) + c.packet(-1.4, 2.0, 0.1) + c.packet(-2.1, 2.6, 0.1)
        out += card(1310, 120, ["3 · packets back"], **big)
    if run:
        out.append({"move": run, "text": "packet"})
    return out


# ── The script, cut into shots (one take; the take sets the times) ────────────────────────────────────────────────
def shot(id, act, type_, voice, **more):
    words = len(re.sub(r"\[[^]]*\]", "", voice).split())
    start = shots[-1]["end"] if shots else 0.0
    dur = round(0.25 + 0.38 * words, 3)  # about 158 words a minute plus a breath a shot: a guess until the take
    shots.append({"id": id, "act": act, "type": type_, "start": round(start, 3), "end": round(start + dur, 3), "voice": voice, **more})


shot("s01", "hook", "wide", "You type a name, hit Enter, and there's the *page*.",
     teaches="The everyday moment the film explains: a name typed, Enter, the page is there.",
     screen="Pastel #eef1ff stage. One floating white slab (8 x 8 units at U 76, centred at 960, 560, 1053 px wide) seen from the fixed isometric angle, a soft periwinkle shadow under it. Your phone stands at the front left: a periwinkle block 2.0 x 0.34 x 3.6 units, its front-left face a white screen. A butter-yellow house with a peach roof at the back right, two mint cube trees at the back corner, a faceless tiny figure at the front right with a small tag 'you, in Australia', a grey road leading off to the right. A white floating tag with a thin line down to the phone: 'en.wikipedia.org' in Manrope 44 px ink.",
     motion="Frame 0 is finished: everything is in place and the name is typed. On 'Enter' the phone dips 4 px and springs back (back.out); a small #ff5d8f cube (the request) pops out of its top with an overshoot and runs off along the road at a steady pace; on 'page' the page's lines snap onto the screen row by row, top to bottom.",
     carries="The phone and its slab: the camera pulls back from them over the whole miniature internet.",
     transition="The camera zooms out (same angle) until the slab is one corner of a city.",
     sound="The bed is playing from frame 0 (soft plucks). A key click on 'Enter', a soft pop as the cube appears, a light tick per page row.",
     check="Frame 0 is a finished picture. The tags are readable. Tops are lighter, right faces darker: the light reads from the upper left.",
     facts=["f1", "f4"],
     frames=[fr(0, "Frame 0, finished: the home slab, the house, the phone with 'en.wikipedia.org' typed in its tag.", home()),
             fr(0.45, "On 'Enter': the phone dips; the pink request cube pops out and runs off along the road.", home(cube=(0.4, 1.0)), HOME.move((-0.8, 1.0), (3.4, 1.0), "request")),
             fr(1, "On 'page': the page's lines snap onto the screen.", home(page=1.0), {"cut": "zoom out to the city"})])

shot("s02", "hook", "wide", "How does the internet know *where* to go?",
     teaches="The question: of all the machines on the internet, how does it find the right one?",
     screen="The camera has pulled back: the home slab is now the front-left corner of one big slab (24 x 24 units at U 32) packed with 24 pastel blocks of different heights on a grid. A tag 'you' over your house. White tags with a big '?' float over five of the blocks.",
     motion="A steady zoom out at the fixed angle; the new blocks rise out of the ground row by row with a slight overshoot as they come into frame; the '?' tags pop up one after another, 0.15 s apart.",
     carries="The city: the camera drops down to one crossroads in it.",
     transition="Zoom in on a crossroads near your house.",
     sound="Soft pops as the blocks rise, a rising run of five ticks for the question marks.",
     check="It reads as a whole city of machines; your house is still findable at the front left.",
     facts=["f1"],
     frames=[fr(0, "The pull back: the city rises around the home slab.", city(question=False), {"camera": "pull"}),
             fr(1, "Question marks pop over five blocks: which one?", city(), {"cut": "zoom to a crossroads"})])

shot("s03", "number", "diagram", "Thing is, it doesn't know *names*.",
     teaches="The tension: the network that carries your request does not work with names.",
     screen="One crossroads, close (U 66): a white slab, two grey roads crossing, a periwinkle router block at the corner with a small ink box on top, and a white panel floating above it (x 420 to 1500, y 70 to 370) whose three rows are numbers only: '103.102.166.… → route A', '198.41.0.… → route B', '208.80.154.… → route C'. The 'en.wikipedia.org' tag glides in along the road from the left.",
     motion="The name tag glides in at a steady pace and stops at the router; the panel does not react; a big ink '?' pops beside it and the tag bounces back 60 px with a small overshoot.",
     carries="The router and its panel of numbers.",
     transition="Push in on the panel.",
     sound="A soft 'bonk' as the tag bounces back.",
     check="The panel has only numbers; the name visibly does not fit.",
     facts=["f2"],
     frames=[fr(0, "The crossroads; the name tag arrives along the road.", router_sign(name=(-3.4, 0.9)), STREET.move((-3.2, 2.6), (-1.4, 2.6), "name")),
             fr(1, "The router's panel lists numbers only; the name bounces off with a '?'.", router_sign(name=(-3.0, 0.9), bounce=True), {"cut": "push in on the panel"})])

shot("s04", "number", "diagram", "It only knows numbers: *IP addresses*.",
     teaches="What the network does use: a number, the IP address: four numbers, each from 0 to 255.",
     screen=f"Pushed in on the panel: its first row underlined in the accent #ff5d8f; below it the full number '{IP}' in accent, 130 px, at its real value; under the number four brackets, one under each group of digits, each labelled '0–255'; under them in ink, 44 px: 'IP address: 4 numbers, each 0–255'.",
     motion="The camera pushes in; the accent line sweeps under the first row; the full number slides down out of it; the four brackets draw on left to right, one per beat.",
     carries=f"The number {IP}: it is what the rest of the film goes looking for.",
     transition="Pan right to the DNS district.",
     sound="Four light ticks for the four parts.",
     check=f"The number is exactly {IP}; each part is between 0 and 255.",
     facts=["f3", "f4"],
     frames=[fr(0, "Push in: the router's panel fills the upper half.", router_sign(), {"camera": "push"}),
             fr(1, "The full number in the accent, split into four parts, each 0–255.", ip_anatomy(), {"cut": "pan to the DNS district"})])

shot("s05", "dns", "wide", "So your phone asks *DNS* first.",
     teaches="So before anything else, your phone asks DNS for the number.",
     screen="The DNS district, seen close (U 84): small floating islands. Left: your house and phone on their own island, tagged 'you'. Centre: a mint block on its island, tagged 'DNS resolver', with a small tag under it: 'usually your ISP's'. The right of the frame is empty pastel for now.",
     motion="The pan settles; a pink question cube hops from your island to the resolver's along a dashed arc, at a steady pace; the resolver pulses once (scale 1.04) as it arrives.",
     carries="Your island and the resolver.",
     transition="The two islands slide left; a phone and a record card rise on a second pair of islands.",
     sound="A whoosh for the pan, a tiny blip as the cube reaches the resolver.",
     check="The question goes from your phone to the resolver, nowhere else.",
     facts=["f1"],
     frames=[fr(0, "The DNS district, close; the question cube leaves your island.", district(servers=(), view=CLOSE), CLOSE["home"].packet(1.2, 0.0, 1.2), {"camera": "right"}),
             fr(0.5, "The cube hops to the resolver.", district(servers=(), view=CLOSE), CLOSE["home"].move((1.8, 0), (5.5, -2.5), "ask", z=1.0)),
             fr(1, "At the resolver; it pulses. Under it: 'usually your ISP's'.", district(servers=(), view=CLOSE), CLOSE["resolver"].packet(0.9, 0.9, 2.4, 0.6), CLOSE["resolver"].tag(1.8, 1.8, -0.4, "usually your ISP's", lift=-24, size=34), {"cut": "slide to the comparison"})])

shot("s06", "dns", "compare", "Like contacts: you tap a name, you're calling a *number*.",
     teaches="The analogy that makes it obvious: you pick a name, but the call goes to the number.",
     screen=f"Two islands side by side. Left: a phone lying flat (periwinkle, white screen) and a white card floating above it with a leader: 'Mum' / '04•• ••• •••' (masked), the number row underlined in the accent; 'your contacts' under the island. Right: the mint resolver on its island with the same kind of card: 'en.wikipedia.org' / '{IP}', the number underlined in the accent; 'DNS' under it.",
     motion="The left card rises from the phone with a slight overshoot; on 'number' its number row gets the accent line; the right island pops up beside it and its card does the same, mirroring the first.",
     carries="The record card with the number: it is what the resolver has to find.",
     transition="The left island sinks away; the camera pans back to the district.",
     sound="Two soft pops for the cards; a little dial-tone blip on 'calling'.",
     check="The two cards have the same layout: the name on top, the number underneath.",
     facts=["f5", "f4"],
     frames=[fr(0, "Left: the contact card rises from a phone lying flat.", compare_pair(right=False, lit=False), {"move": [880, 560, 880, 360], "text": "rises"}),
             fr(0.5, "On 'number' the number row gets the accent: the call goes to the number.", compare_pair(right=False)),
             fr(1, "Right: the DNS card mirrors it, name above, number below.", compare_pair(), {"cut": "back to the district"})])

shot("s07", "dns", "wide", "If DNS doesn't know, it asks a *chain*.",
     teaches="If the resolver does not already know, it asks other servers in a chain.",
     screen="Back on the DNS district: three more islands rise out of the pastel at the right, each with one block: a tall periwinkle 'root server' at the top, a peach '.org server' at the right, a butter 'wikipedia.org server' at the lower right; thin dashed lines link the resolver to each.",
     motion="The three islands rise one after another with an overshoot, 0.3 s apart (root, .org, wikipedia.org); their tags pop as they land; the dashed links draw on from the resolver.",
     carries="The five islands of the district.",
     transition="Continuous: the question cube sets off from the resolver.",
     sound="Three rising pops, one per island.",
     check="Three new servers, each named, in the order they will be asked.",
     facts=["f6"],
     frames=[fr(0, "Pulling back from the resolver; three islands start to rise at the right.", district(rise=0.3), {"camera": "pull"}),
             fr(0.5, "The islands rise one after another.", district(rise=0.75), {"move": [1500, 900, 1500, 700], "text": "rise"}),
             fr(1, "All three standing, named, linked to the resolver.", district(links=True), {"cut": "cube to the root"})])

shot("s08", "dns", "diagram", "A *root* server points to dot org,",
     teaches="First stop: a root server, which does not know the address but knows who runs .org.",
     screen="The district. The pink question cube hops from the resolver to the root island. Under the root's island a small tag: '13 names · 2,046 servers' (13 root names, 2,046 copies round the world). The root answers with a small white card 'ask the .org servers', which flies back to the resolver; an ink arrow points from the root to the .org island.",
     motion="The cube hops resolver → root at a steady pace; the root pulses; the card pops out and flies back; the arrow to .org draws on.",
     carries="The resolver now holds a pointer to .org.",
     transition="Continuous: the cube sets off again.",
     sound="A blip on arrival, a paper flick as the card flies back.",
     check="The root gives no number, only the pointer to .org.",
     facts=["f6", "f7"],
     frames=[fr(0, "The cube hops from the resolver to the root.", district(links=True), trip("resolver", "root", "ask"), cube_at("resolver")),
             fr(0.5, "At the root: '13 names · 2,046 servers'; a card 'ask the .org servers' pops out.", district(links=True), cube_at("root"), ISLE["root"].tag(1.8, 1.8, -0.4, "13 names · 2,046 servers", lift=-16, size=28), card(560, 170, ["ask the .org servers"], 460)),
             fr(1, "The card back at the resolver; an arrow from the root to .org.", district(links=True), card(260, 110, ["ask the .org servers"], 460), {"arrow": [round(at("root", 1.4)[0] + 110), round(at("root", 1.4)[1]), round(at("org", 1.4)[0] - 110), round(at("org", 1.4)[1])]}, {"cut": "on to .org"})])

shot("s09", "dns", "diagram", "dot org to Wikipedia's own *server*,",
     teaches="The chain goes on: .org points to the server that holds wikipedia.org's records.",
     screen="The cube hops resolver → .org (peach); .org returns a card 'ask ns0.wikimedia.org'; the cube hops on to the butter 'wikipedia.org server' island, whose block lights up (its top a step brighter).",
     motion="Two hops of the cube, each at the same steady pace; the .org block pulses; a card flies back; the last block brightens as the cube lands.",
     carries="The cube at the wikipedia.org server.",
     transition="Continuous: the answer comes out.",
     sound="Two blips, one card flick.",
     check="The order is root → .org → wikipedia.org, never skipped on screen.",
     facts=["f6"],
     frames=[fr(0, "The cube hops to .org.", district(links=True), trip("resolver", "org", "ask .org"), cube_at("resolver")),
             fr(0.5, ".org answers: 'ask ns0.wikimedia.org'.", district(links=True), cube_at("org"), card(200, 110, ["ask ns0.wikimedia.org"], 560)),
             fr(1, "The cube lands on the wikipedia.org server; it lights up.", district(links=True), cube_at("ns"), trip("resolver", "ns", "ask"), {"cut": "the answer comes out"})])

shot("s10", "dns", "ui", "and that one has the *number*.",
     teaches="The answer: the server that holds the name gives the number.",
     screen=f"A white record card rises from the wikipedia.org server: 'en.wikipedia.org' / '{IP}', the number in the accent #ff5d8f, the same number as on the router's panel in s04.",
     motion="The card rises with an overshoot; the number types on digit by digit at its real value; the card then glides back over the resolver to your island.",
     carries=f"The number {IP}, carried home.",
     transition="Push in on the resolver.",
     sound="A bright two-note chime as the number lands.",
     check="The number is the one from s04.",
     facts=["f4", "f6"],
     frames=[fr(0, "The answer card rises from the wikipedia.org server.", district(links=True), cube_at("ns"), card(930, 640, ["en.wikipedia.org", IP], 400, accent_row=1)),
             fr(1, "The card glides back over the resolver towards you.", district(links=True), card(120, 110, ["en.wikipedia.org", IP], 420, accent_row=1), {"move": [1300, 600, 700, 330], "text": "home"}, {"cut": "push in on the resolver"})])

shot("s11", "dns", "diagram", "The answer's kept a few *minutes*, so next time's quick.",
     teaches="The resolver keeps the answer for a while (its TTL), so the next question is answered at once.",
     screen=f"Close on the resolver (U 88): its roof lifts to show a white shelf inside; the answer card floats above with a leader down to the shelf; at the right a ring timer with a hand, '{TTL} seconds'. A neighbour's small house slides in at the front left, tagged 'neighbour'; its question goes in and the answer comes straight back (a short pink arrow), with no trip round the chain.",
     motion="The roof lifts with an overshoot; the card drops onto the shelf; the timer hand starts to turn; the neighbour's question goes in and the answer returns in one quick step.",
     carries="The answer, filed: the camera goes back to your house.",
     transition="Pan back to the home slab.",
     sound="A drawer click as the card is filed, a soft clock tick.",
     check=f"The timer reads {TTL} seconds; the neighbour's answer comes back without leaving the resolver.",
     facts=["f8"],
     frames=[fr(0, "Push in: the resolver's roof starts to lift.", cache(lid=0.25), {"camera": "push"}),
             fr(0.5, f"The card filed on the shelf; the timer '{TTL} seconds' starts.", cache()),
             fr(1, "A neighbour asks; the answer comes straight back.", cache(neighbour=True), {"cut": "pan to the house"})])

shot("s12", "route", "diagram", "Your request goes out as a *packet*, labelled with that number.",
     teaches="Your request travels as a packet that carries the destination address (and yours).",
     screen=f"Back at the home slab: the pink request cube rises above the phone, bigger (0.9 units); a label card is stuck to it with a thin leader: 'to: {IP}' (underlined in the accent), 'from: you', 'asks for: the page'.",
     motion="The cube pops up from the phone with an overshoot; the label slaps on (a small squash); the number row underlines in the accent.",
     carries="The labelled packet: it goes out on the road.",
     transition="Zoom out to the road network.",
     sound="A soft pop, a sticker slap.",
     check="The packet shows the destination number, the same as before.",
     facts=["f9", "f13"],
     frames=[fr(0, "Back home: the cube starts to rise from the phone.", packet_scene(label_on=False, rise=0.1)),
             fr(0.45, "The cube hangs above the phone.", packet_scene(label_on=False), {"move": [740, 300, 740, 190], "text": "packet"}),
             fr(1, "The label card on it: to, from, what.", packet_scene(), {"cut": "zoom out to the roads"})])

shot("s13", "route", "wide", "No router knows the whole *route*.",
     teaches="No machine on the way knows the whole route.",
     screen="Zoomed out (U 46): a slab with a grid of grey roads; eleven periwinkle router blocks at the junctions; your house at the left; a pale blue strip along the right edge, tagged 'to the coast'. The packet sits on the first router. No route is drawn: many ways are possible.",
     motion="The camera zooms out over the grid; the routers pop up in a wave from left to right; the packet waits on the first one, bobbing 4 px.",
     carries="The packet on the first router.",
     transition="Push in on that router.",
     sound="A wave of soft pops.",
     check="No single route is drawn: the point is that none is known in advance.",
     facts=["f10"],
     frames=[fr(0, "Zooming out: the road grid, routers popping up from the left.", router_net(wave=0.45), {"camera": "pull"}),
             fr(1, "Eleven routers; the packet waits on the first.", router_net(packet_at=(-6, 2)), ROADS.tag(-6, 2, 1.0, "router", lift=70, size=34), {"cut": "push in on the router"})])

shot("s14", "route", "diagram", "Each reads the number and passes it *on*.",
     teaches="Each router only reads the destination number and passes the packet to the next router.",
     screen="Close on one router (U 66) with its number panel; the packet arrives along the road from the left; the panel's row '103.102.166.… → route A' underlines in the accent; the packet slides off down that road towards the next router.",
     motion="The packet arrives and stops; the matching row lights; the packet slides on at a steady pace; the camera follows it to the next router, which does the same.",
     carries="The packet, hopping on.",
     transition="Follow the packet to the coast.",
     sound="A blip at each router, a soft click as the row lights.",
     check="The row that lights matches the packet's number.",
     facts=["f10", "f2"],
     frames=[fr(0, "The packet arrives at the router.", router_sign(packet=(-2.4, 0.9)), STREET.move((-3.6, 2.0), (-1.6, 2.0), "arrives")),
             fr(0.5, "The router reads the number: its row lights up.", router_sign(highlight=True, packet=(-1.2, 0.9))),
             fr(1, "Passed on down the road to the next router.", router_sign(highlight=True, packet=(0.9, 2.8)), STREET.move((1.6, 1.6), (1.6, 3.6), "on"), {"cut": "follow the packet"})])

shot("s15", "route", "wide", "Router to router, under the *sea* from Australia,",
     teaches="The packet goes router to router, and leaves Australia in a cable on the sea bed.",
     screen=f"The crossing (U 52): the Australian coast slab at the upper left with its last router; a pale blue sea block, sliced open at the front to show water over a butter sand sea bed and the cable lying on it, a wavy line along the top edge; the Singapore slab at the lower right, still bare. Tags 'Australia', 'Singapore', and under the slice 'undersea cable' and, smaller, 'example: INDIGO-West, Perth–Singapore, {idn(CABLE_KM)} km'.",
     motion="The camera pans right with the packet; the sea block's front face slices open (the cut drawn on); the packet dives to the cable and runs along it at a steady pace.",
     carries="The packet on the cable, heading for Singapore.",
     transition="Continuous: the packet comes up on the island.",
     sound="A low bubbly whoosh under the sea.",
     check=f"The cable is labelled as an example, {idn(CABLE_KM)} km.",
     facts=["f11"],
     frames=[fr(0, "Pan right: the coast, the sea, the island.", sea(packet_t=0.0), {"camera": "right"}),
             fr(0.5, "The slice opens; the packet runs along the cable on the sea bed.", sea(packet_t=0.45), SEA.move((-3.5, 3.6), (2.5, 3.6), "cable", z=-1.0)),
             fr(1, "The packet comes up on the Singapore side.", sea(packet_t=0.85, server=0.2), {"cut": "the server rises"})])

shot("s16", "route", "diagram", "to a server in *Singapore*.",
     teaches=f"The destination: a real server in Singapore, at {IP}.",
     screen=f"The Singapore slab (U 62): Wikimedia's data centre rises out of the ground: a pale base, four periwinkle racks, a pale roof; tags 'Wikipedia's server · Singapore' and '{IP}' in the accent. The packet goes in at the front.",
     motion="The building rises with an overshoot; the tags pop; the packet slides in and the building pulses once.",
     carries="The data centre.",
     transition="Continuous: its roof lifts.",
     sound="A deep, soft pop as the building lands; a door blip.",
     check=f"The number on the building is {IP}, the one from s04 and s10.",
     facts=["f4"],
     frames=[fr(0, "The data centre rising out of the island.", datacentre(rise=0.4), DC.packet(-2.0, 3.4, 0.1), {"move": [1500, 620, 1500, 420], "text": "rises"}),
             fr(1, "Standing, tagged with its number; the packet goes in.", datacentre(), {"cut": "the roof lifts"})])

shot("s17", "back", "diagram", "The page comes back in *packets*,",
     teaches=f"The answer comes back as many packets: the page's text alone is about {PACKETS}.",
     screen=f"The data centre's roof lifts to show the four racks; pink packets pour out at the front in a line, off to the left; a tag 'page text alone ≈ {PACKETS} packets'.",
     motion="The roof lifts; the racks blink; the packets come out one by one at a steady beat, each with a tiny pop, and file off to the left.",
     carries="The line of packets.",
     transition="Follow the packets back across the sea to your house.",
     sound="A quick ripple of small pops, one per packet.",
     check=f"The tag says ≈ {PACKETS}; the packets are the same pink as the request.",
     facts=["f12"],
     frames=[fr(0, "The roof lifts: the racks inside.", datacentre(lid=0.5), {"move": [1240, 330, 1240, 200], "text": "roof"}),
             fr(0.5, "Packets pour out at the front.", datacentre(lid=1.0, out_packets=5)),
             fr(1, f"A long line of them: '≈ {PACKETS} packets'.", datacentre(lid=1.0, out_packets=10), tag(*DC.p(-4.6, 5.6, 0.6), f"page text alone ≈ {PACKETS} packets", 150, 34), {"cut": "follow them home"})])

shot("s18", "back", "wide", "addressed to *you*.",
     teaches="The packets come back to your address and the page appears.",
     screen="The home slab again: the line of pink packets comes in along the road and drops into the phone one after another; the page's lines fill the screen as they land. A tag 'to your address' over the road.",
     motion="The packets stream in at the same steady pace and vanish into the phone; with each, a line of the page snaps on, top to bottom.",
     carries="The phone with the page on it.",
     transition="Lift up to the recap islands.",
     sound="Soft pops landing; a small chime when the page is complete.",
     check="The packets go into the phone, not the house.",
     facts=["f13", "f9"],
     frames=[fr(0, "The packets come in along the road.", home(typed=None, page=0.2, packets=[(3.2, 1.0), (2.2, 1.0), (1.2, 1.0), (0.2, 1.0)], where=False), HOME.tag(3.4, 1.0, 0.6, "to your address", lift=90, size=36, dx=60)),
             fr(1, "The page is complete on the phone.", home(typed=None, page=1.0, where=False), {"cut": "up to the recap"})])

shot("s19", "recap", "recap", "So: name to *number*, and the number finds the *way*.",
     teaches="The answer in one frame: DNS turns the name into a number; routers pass packets towards that number; the reply comes back the same way.",
     screen="Three islands in a row, each with its card above (44 px): (1) the mint resolver, '1 · name → number'; (2) two routers with a pink packet on the dashed route between them, '2 · number → route'; (3) the data centre with packets leaving it, '3 · packets back'.",
     motion="The three islands rise one after another on the beat, each card popping after it; a pink packet runs across all three from left to right.",
     carries="The first island: the camera dives back to your house from it.",
     transition="Zoom back into the opening picture.",
     sound="Three pops rising in pitch.",
     check="Readable with the sound off: three cards, left to right.",
     facts=["f1", "f6", "f10"],
     frames=[fr(0, "The first island rises with its card.", recap(1), {"move": [760, 700, 1500, 700], "text": "one by one"}),
             fr(0.5, "All three, each with its card.", recap()),
             fr(1, "A packet runs across all three.", recap(run=[360, 860, 1560, 860]), {"cut": "back to the start"})])

shot("s20", "recap", "wide", "And it all happens again, every time",
     teaches="The bridge back into the first line: it all happens again, every time.",
     screen="Back to the opening picture: the home slab, the house, the trees, the figure with its tag 'you, in Australia', and the phone, its screen empty again and the tag 'en.wikipedia.org' being typed letter by letter, in the framing of frame 0.",
     motion="The camera settles from the recap into the home slab; the screen clears row by row; the tag is retyped and is complete a moment before the cut.",
     carries="Into s01.",
     transition="No cut: the film loops straight into s01.",
     sound="The bed runs on into the opening; a few soft key clicks.",
     check="The last frame matches frame 0 (check.mjs compares them).",
     facts=["f1"],
     frames=[fr(0, "Back on the home slab; the screen clears.", home(typed="en.wiki", page=0.4), {"camera": "push"}),
             fr(1, "The opening picture, a moment before frame 0.", home(), {"cut": "loop to s01"})])

duration = shots[-1]["end"]

storyboard = {
    "title": "How does the internet know where to go?",
    "template": "isometric",
    "standard": 3,
    "question": "You only typed a name. How does the internet know which machine to send you to?",
    "audience": "Curious teens and adults anywhere who use the internet every day but have never seen what happens after they press Enter. They may have heard of 'IP addresses' or 'DNS', but not how the pieces fit together.",
    "promise": "The internet doesn't know names: DNS turns a site's name into a number (its IP address), then your request goes out as packets labelled with that number, passed router to router to the server, and the page comes back to your address the same way.",
    "language": "en",
    "subtitles": True,
    "format": "1920x1080",
    "duration": round(duration, 3),
    "fps": 60,
    "loop": {"line": "And it all happens again, every time / you type a name, hit Enter, and there's the page.",
             "picture": "The last shot settles back on the home slab: the house, the figure and the phone, the tag 'en.wikipedia.org' retyped, the same framing and the same pixels as frame 0."},
    "voice": {"voice_id": "RorawgRgSS2YxWqy31vY", "name": "Catherine", "model": "eleven_v4", "language": "en", "direction": "[warmly]"},
    "look": {
        "accent": ACCENT,
        "accent2": PERI,
        "mood": "The Isometric template: one small diorama at a time floating on soft pastel #eef1ff, always at the same 30-degree isometric angle, lit from the upper left (each face of a block a step lighter or darker) with a soft periwinkle shadow under each slab. Clean matte blocks with rounded edges in periwinkle, peach, mint and butter, ink #2d3047 for type. The one saturated accent, #ff5d8f (as in the template's golden stills), is only ever your request: its packets and the number it needs. Tiny faceless figures. Captions: every spoken line as a subtitle (subtitles on) in the template's soft white pill, a few words at a time, the starred key word in #ff5d8f (film.css sets .caption .key to the accent, as the template's proof did; the look's own key colour is periwinkle). No grain, no bloom; very soft ambient occlusion.",
    },
    "music": {
        "track": "Composed for this film (ElevenLabs Music, music/bed.mp3)",
        "bpm": 100,
        "note": "A light electronic bed, as the template's Sound line asks: soft marimba-like plucks and a warm round sub, a glassy pad, a brushed shaker, no lead melody, composed to the take's length. It thins under the DNS chain (s07 to s11) so the blips read, lifts as the packet crosses the sea (s15) and resolves on the recap; it runs on past the last frame into the opening for the loop. Effects, small and clean: a soft click or pop for every block that rises, a tick for each tag, a blip at each server or router a cube reaches, a paper flick for each answer card, a drawer click and clock tick for the cache, a bubbly whoosh under the sea, a ripple of pops as the reply's packets leave the server, a chime when the page completes. The cuts follow the take.",
    },
    "facts": [
        {"id": "f1", "claim": "DNS turns the name you type into an IP address, the number that identifies the server, so the browser can contact it. The lookup is done by a DNS resolver; your Wi-Fi router is usually set to use your ISP's resolver.",
         "source": "Cloudflare Learning Paths, 'What is DNS?' (developers.cloudflare.com/learning-paths/cybersafe/concepts/what-is-dns/, updated 23 Apr 2026): 'DNS translates the domain name that you type in the browser ... to a computer-friendly IP address'; 'Your Wi-Fi router is typically preconfigured to send DNS queries to the resolver owned by your ISP.' RFC 1034 (Mockapetris, 1987), Domain Concepts and Facilities."},
        {"id": "f2", "claim": "The network moves packets by number, not by name: every IP packet's header carries a 32-bit source address and a 32-bit destination address, and a router looks up the destination address in its routing table to choose where to send it next. Names exist only in DNS. The router panel is a simplified routing table: its 'route A/B/C' stand for the router's outgoing links, and each row starts with a real address prefix used in the film (Wikimedia Asia 103.102.166.0/24, a.root-servers.net 198.41.0.4, ns0.wikimedia.org 208.80.154.238).",
         "source": "RFC 791, Internet Protocol, §3.1 ('Source Address: 32 bits', 'Destination Address: 32 bits'); RFC 1812, Requirements for IPv4 Routers, §5.2.4.3 ('the router looks up the IP Destination Address in its routing table to determine an appropriate next hop address')."},
        {"id": "f3", "claim": "An IPv4 address is 32 bits, four octets; written as four decimal numbers, each part is one octet, 8 bits, so 2^8 = 256 values: 0 to 255. Simplification: the film shows IPv4 only; id.wikipedia.org also has an IPv6 address (2001:df2:e500:ed1a::1, 128 bits).",
         "source": "RFC 791 §2.3: 'Addresses are fixed length of four octets (32 bits).' RFC 8200 (IPv6, 128-bit addresses). The IPv6 address checked as f4."},
        {"id": "f4", "claim": f"The film's real example, and where it was looked up: from Australian networks (Telstra and Optus address blocks), en.wikipedia.org (a CNAME of dyna.wikimedia.org) resolves to {IP}. That address's reverse name is text-lb.eqsin.wikimedia.org: Wikimedia's caching data centre 'eqsin' at Equinix SG3, Singapore (listed by Wikitech as in service since 2017), and Wikimedia's GeoDNS map sends Australia (AU) to eqsin first. The block 103.102.166.0/24 is registered to Wikimedia at APNIC (WIKIMEDIA-AP). So for a viewer in Australia the page really comes from Singapore; the film says 'you, in Australia' on screen and 'from Australia' in the script. Elsewhere the answer differs (from the UK, for instance, the same name gave 185.15.59.224, Wikimedia's Amsterdam site).",
         "source": "Checked 2026-11-23 with Google Public DNS (dns.google/resolve, type A, edns_client_subnet 1.120.0.0/13 and 101.160.0.0/11 (Telstra) and 49.176.0.0/12 (Optus), owners checked with APNIC RDAP; all three answered 103.102.166.224; PTR text-lb.eqsin.wikimedia.org); Wikimedia operations-dns 'geo-maps' (raw.githubusercontent.com/wikimedia/operations-dns/master/geo-maps), line 'AU => [eqsin, ulsfo, ...] # Australia'; Wikitech 'Data centers' and 'Eqsin data center' (wikitech.wikimedia.org); APNIC RDAP for 103.102.166.224 (WIKIMEDIA-AP). UK check: subnets 86.128.0.0/10 (BT), 2.96.0.0/13, 62.30.0.0/15 → 185.15.59.224, PTR text-lb.esams.wikimedia.org."},
        {"id": "f5", "claim": "The analogy: DNS is like a phone book (here, your phone's contacts): you look up a name, and what is used to reach someone is the number. The contact's number on screen is masked ('04•• ••• •••', the shape of an Australian mobile number); it stands for no real number.",
         "source": "Cloudflare Learning Paths, 'What is DNS?' (as f1): 'The Domain Name System (DNS) is the phonebook of the Internet ... similar to how a phonebook translates a person's name to a phone number.'"},
        {"id": "f6", "claim": "When it has nothing cached, the resolver walks the chain: a root name server refers it to the servers for the top-level domain (.org), those refer it to the domain's own name servers (wikipedia.org: ns0, ns1, ns2.wikimedia.org), and those hold the address. Real names on screen: the .org servers are run by Public Interest Registry (v0n0.pir-ns.org, 199.19.56.1); ns0.wikimedia.org is 208.80.154.238. Simplifications: the CNAME step (en.wikipedia.org → dyna.wikimedia.org, answered by the same Wikimedia name servers) is folded into one answer; a busy resolver usually already has the root's and .org's referrals cached, so most lookups skip the first steps.",
         "source": "Cloudflare Learning Paths, 'What is DNS?' (the lookup diagram: resolver → root nameserver → .com nameserver → example.com nameserver → IP); RFC 1034 §5.3.3 (the resolver's algorithm); NS and A records checked 2026-11-23 with Google Public DNS (org NS: v0n0...v2n1.pir-ns.org; wikipedia.org NS: ns0/ns1/ns2.wikimedia.org)."},
        {"id": "f7", "claim": "The root of DNS is served by 13 named root servers (a to m.root-servers.net) run by 12 independent organisations, as 2,046 operational instances around the world, in many countries (Australia and Singapore included). On screen: '13 names · 2,046 servers'. a.root-servers.net is 198.41.0.4 (Verisign).",
         "source": "Root Server Technical Operations Association, root-servers.org (read 2026-11-23T15:48Z: 'the root server system consists of 2046 operational instances operated by the 12 independent root server operators'); IANA, 'Root Servers' (iana.org/domains/root/servers): 13 named authorities and their addresses."},
        {"id": "f8", "claim": f"A resolver keeps (caches) each answer for its TTL, a time in seconds set by the domain's owner. Wikimedia's zone gives dyna.wikimedia.org a TTL of {TTL} seconds (3 minutes); the CNAME from en.wikipedia.org has a much longer TTL (Google Public DNS still had 20,026 s, about five and a half hours, left on it). On screen: '{TTL} seconds'; the script says 'a few minutes'.",
         "source": "RFC 1034 §3.6: 'TTL ... is primarily used by resolvers when they cache RRs. The TTL describes how long a RR can be cached before it should be discarded.' Wikimedia operations-dns, templates/wikimedia.org: 'dyna 180 IN DYNA geoip!text-addrs'; Google Public DNS answers on 2026-11-23 showed TTL 180 for the A record."},
        {"id": "f9", "claim": "Your request travels as packets (IP datagrams). TCP carries the data as segments, each sent as one IP datagram, numbered so the far end can put them back in order and ask again for any that are lost. Simplifications: the film shows the page request as one packet and leaves out the TCP and TLS handshakes that come first, and the encryption (HTTPS).",
         "source": "RFC 9293, Transmission Control Protocol, §2.2: 'The application byte-stream is conveyed over the network via TCP segments, with each TCP segment sent as an Internet Protocol (IP) datagram'; reliability 'via sequence numbers ... correction via retransmission'. RFC 791 §3.1 for the header's addresses."},
        {"id": "f10", "claim": "Routing on the internet is hop by hop: no router holds the whole route; each one only decides the next hop for the packet's destination address, from its own table, and passes the packet on.",
         "source": "RFC 1812 §5.2.4.3 (next hop chosen from the destination address) and §7.3.2 ('the hop-by-hop routing paradigm generally used throughout the current Internet')."},
        {"id": "f11", "claim": f"Traffic between countries goes almost entirely over submarine fibre cables; satellites carry a very small share (the FCC counts 0.37% of U.S. international capacity). Australia has no land link to anywhere, so packets to Singapore cross the sea in a cable. Example on screen: INDIGO-West, Perth – Jakarta – Singapore (Tuas), {CABLE_KM:,} km, in service since 2019, Telstra among its owners. Which cable a given packet uses depends on the ISP's routes; the film labels it 'example'.",
         "source": "TeleGeography, 'Submarine Cable FAQs' (www2.telegeography.com/submarine-cable-faqs-frequently-asked-questions); TeleGeography Submarine Cable Map, 'INDIGO-West' (submarinecablemap.com/api/v3/cable/indigo-west.json: length 4,600 km; landing points Perth, Jakarta, Tuas; RFS May 2019; owners AARNet, Google, Indosat Ooredoo, Singtel, Superloop, Telstra)."},
        {"id": "f12", "claim": f"The reply comes in many packets. English Wikipedia's Main Page HTML alone was {PAGE_BYTES:,} bytes compressed (gzip) on 2026-11-23 (a second fetch gave 52,307: the page changes). A packet on a normal 1,500-byte (Ethernet) link carries at most 1,500 − 20 (IPv4 header) − 20 (TCP header) = {MSS:,} bytes of data, so {PAGE_BYTES:,} / {MSS:,} = {PAGE_BYTES / MSS:.2f} → about {PACKETS} packets, before the images and styles, which come in more. On screen: 'page text alone ≈ {PACKETS} packets'. Simplifications: TLS and HTTP/2 framing overheads are ignored, which would add a few.",
         "source": "Measured with curl on https://en.wikipedia.org/wiki/Main_Page with Accept-Encoding: gzip (size_download 52,254 and 52,307 bytes), 2026-11-23; RFC 894 (IP over Ethernet, 1,500-byte maximum); RFC 791 (20-byte minimum IPv4 header); RFC 9293 (20-byte minimum TCP header). The arithmetic is in storyboard.build.py."},
        {"id": "f13", "claim": "The reply is addressed to the source address the request carried, so it comes back to you. Simplification: most homes and mobile networks share one public IPv4 address through NAT; the reply reaches that shared address, and the router (or the operator's NAT) hands it on to your phone. The film says 'addressed to you'.",
         "source": "RFC 791 §3.1 (source address in every datagram); RFC 3022, Traditional IP Network Address Translator."},
    ],
    "acts": [
        {"id": "hook", "title": "The question", "goal": "A name typed, a page appears: how does the internet know where to go?", "rail": False},
        {"id": "number", "title": "Numbers, not names", "goal": "The network only knows numbers: the IP address."},
        {"id": "dns", "title": "DNS", "goal": "Your phone asks DNS, which walks the chain root → .org → wikipedia.org and keeps the answer for a while."},
        {"id": "route", "title": "Router to router", "goal": "The request as a labelled packet, passed hop by hop, under the sea to Singapore."},
        {"id": "back", "title": "The way back", "goal": "The page comes back as dozens of packets to your address."},
        {"id": "recap", "title": "The answer", "goal": "Name → number → route in one frame, then the bridge into the first line.", "rail": False},
    ],
    "shots": shots,
}

out = HERE / "storyboard.json"
out.write_text(json.dumps(storyboard, ensure_ascii=False, indent=2) + "\n")
words = sum(len(re.sub(r"\[[^]]*\]", "", s["voice"]).replace("*", "").split()) for s in shots if s.get("voice"))
print(f"{len(shots)} shots, {sum(len(s['frames']) for s in shots)} frames, {words} words, about {duration:.1f} s before the take -> {out}")
manifest = HERE / "voice" / "voice.json"
if manifest.exists() and json.loads(manifest.read_text()).get("version") == 2:
    kit = next(p for p in HERE.parents if (p / "kit" / "audio" / "voice.mjs").exists())
    subprocess.run(["node", str(kit / "kit" / "audio" / "voice.mjs"), str(HERE), "--retime"], check=False, stdout=subprocess.DEVNULL)
