"""Writes storyboard.json for "Gimana sih luka bisa nutup sendiri?" (portrait, 1080 x 1920).

The film is cut to one take of narration. This script writes the plan: the shots, each with its run of the script
and its drawn frames. The times it writes are only a guess; the take sets the real ones, so the script ends by
asking the voice tool to retime the board (it does nothing until a take is there):

    python3 examples/luka-sembuh/storyboard.build.py && node kit/tools/storyboard.mjs examples/luka-sembuh --png

The world is one cross-section of skin, drawn at rest in screen pixels: the surface at y 460, the base of the
epidermis at y 600, a capillary at y 1000, and a wound cut from (380..700, 460) down to the vessel (470..610, 948).
The spoken words sit on the deep dermis below y 1230, so the picture has the height from the top safe line to 1200.

The time bar at the top is a log scale from one minute to one year, computed from the facts (f8): a minute at x 64,
an hour at 331, a day at 539, a week at 666, a year at 924. Each phase is painted over the stretch the fact sheet
gives it, and the marker sits at the time the shot is about.
"""
import json
import math
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
shots = []


def shot(id, act, type, length=None, **fields):
    """A speaking shot's length is the take's. A silent beat keeps the length it is given here."""
    start = shots[-1]["end"] if shots else 0
    guess = length if length is not None else round(len(fields.get("voice", "")) / 15 + 0.3, 2)
    shots.append({"id": id, "act": act, "type": type, "start": round(start, 3), "end": round(start + guess, 3), **fields, "frames": FRAMES[id]})


def fr(at, note, *draw):
    return {"at": at, "note": note, "draw": list(draw)}


def label(x, y, text, size=30, **more):
    return {"label": [x, y], "text": text, "size": size, **more}


# ── The time bar: a log scale from a minute to a year ──────────────────────────────────────────────────────
BAR_X0, BAR_X1, BAR_Y = 64, 924, 318
YEAR_MIN = 365 * 24 * 60


def tx(minutes):
    """Where a time (in minutes) sits on the bar."""
    return round(BAR_X0 + (BAR_X1 - BAR_X0) * max(0.0, math.log10(max(1.0, minutes))) / math.log10(YEAR_MIN), 1)


TICKS = [("menit", 1), ("jam", 60), ("hari", 1440), ("minggu", 10080), ("tahun", YEAR_MIN)]
PHASES = [  # (name, from, to) in minutes: f1
    ("sumbat", 1, 10),
    ("bersihkan", 10, 3 * 1440),
    ("tumbuh", 3 * 1440, 21 * 1440),
    ("rapikan", 21 * 1440, YEAR_MIN),
]
COLOURS = ["red", "blue", "pink", "ink"]


def bar(lit=0, at=None, chip=None):
    """The time bar with `lit` phases painted, the marker at `at` minutes, and a chip riding over the marker."""
    out = [{"line": [BAR_X0, BAR_Y, BAR_X1, BAR_Y], "width": 3}]
    for name, m in TICKS:
        out.append({"line": [tx(m), BAR_Y - 12, tx(m), BAR_Y + 12], "width": 3})
        out.append(label(tx(m), BAR_Y + 44, name, 26))
    for i, (name, a, b) in enumerate(PHASES[:lit]):
        out.append({"line": [tx(a), BAR_Y, tx(b), BAR_Y], "width": 12, "colour": COLOURS[i]})
    if at is not None:
        out.append({"dot": [tx(at), BAR_Y, 14], "colour": "red"})
        if chip:
            out.append({"chip": [min(max(tx(at) - 90, 64), 740), BAR_Y - 86], "text": chip})
    return out


# ── The skin, at rest ──────────────────────────────────────────────────────────────────────────────────────
SURF, EPI, VES_Y, VES_R = 460, 600, 1000, 52
WOUND = "M380 460 L470 948 L610 948 L700 460"


def skin(closed=False):
    """The cross-section: air above, epidermis, dermis, the capillary, and the wound."""
    out = [
        {"sky": [0, SURF], "tone": "night"},
        {"curve": [[x, SURF + 8 * math.sin(x / 70)] for x in range(-20, 1101, 60)], "colour": "ink", "width": 6},
        {"curve": [[x, EPI + 18 * math.sin(x / 46)] for x in range(-20, 1101, 30)], "colour": "pink", "width": 4},
        {"line": [-20, VES_Y - VES_R, 1100, VES_Y - VES_R], "colour": "red", "width": 5},
        {"line": [-20, VES_Y + VES_R, 1100, VES_Y + VES_R], "colour": "red", "width": 5},
        {"label": [130, 540], "text": "epidermis", "size": 28},
        {"label": [150, 820], "text": "dermis", "size": 28},
    ]
    if not closed:
        out.append({"path": WOUND, "colour": "red", "width": 6})
    return out


def rbc(x, y, r=22):
    return {"dot": [x, y, r], "colour": "red"}


def plate(x, y):
    return {"dot": [x, y, 8], "colour": "orange"}


FLOW = [rbc(x, VES_Y + (17 if i % 2 else -15)) for i, x in enumerate(range(60, 1060, 70))]
SPILL = [rbc(x, y) for x, y in [(520, 900), (560, 860), (500, 820), (590, 790), (530, 740), (470, 700), (600, 650), (540, 600), (460, 560)]]
PLUG = [plate(x, y) for x, y in [(472, 930), (492, 942), (515, 946), (540, 948), (565, 946), (588, 942), (606, 930), (462, 880), (614, 880), (452, 820), (622, 820)]]
NET = [{"line": [a, b, c, d], "colour": "ink", "width": 2} for a, b, c, d in [(400, 500, 690, 620), (420, 600, 660, 520), (430, 700, 650, 780), (450, 820, 630, 700), (460, 900, 600, 840), (390, 480, 600, 940), (680, 480, 480, 940)]]
SCAB = {"path": "M372 452 Q540 420 708 452 L692 520 Q540 500 388 520 Z", "colour": "ink", "fill": "ink"}
BUGS = [{"path": f"M{x} {y} l34 -10", "colour": "green", "width": 12} for x, y in [(330, 430), (720, 420), (690, 470)]]
GRAN_TOP = 560  # the new tissue fills the wound up to here, under the scab


def gran(top):
    w = lambda y: 380 + (y - 460) * 90 / 488  # the wound's left wall
    return {"path": f"M{w(top):.0f} {top} Q540 {top - 30} {1080 - w(top):.0f} {top} L610 948 L470 948 Z", "colour": "pink", "fill": "pink"}


def tongue(p):
    """The two tongues of new epidermis crawling in from the edges, under the scab; p = 1 when they meet."""
    left = 380 + 160 * p
    right = 700 - 160 * p
    return [{"path": f"M330 470 L{left:.0f} 520 L{left - 40:.0f} 560 L330 600 Z", "colour": "blue", "fill": "blue"},
            {"path": f"M750 470 L{right:.0f} 520 L{right + 40:.0f} 560 L750 600 Z", "colour": "blue", "fill": "blue"}]


# The finger, for the hook and the end: a fingertip from the bottom of the frame, its pad toward us.
FINGER = {"path": "M300 1500 L300 640 Q300 330 540 320 Q780 330 780 640 L780 1500", "colour": "ink", "width": 8, "fill": "pink"}
NAIL = {"path": "M430 360 Q540 330 650 360", "colour": "ink", "width": 4}
PRINTS = [{"path": f"M{540 - r} 760 Q540 {760 - r * 1.2:.0f} {540 + r} 760", "colour": "ink", "width": 2} for r in (60, 100, 140, 180)]
SCRAPE = {"path": "M420 600 Q540 560 660 610 Q650 690 540 700 Q430 690 420 600 Z", "colour": "red", "fill": "red"}
SCAR_LINE = {"path": "M440 640 Q540 620 640 645", "colour": "pink", "width": 10}
Q = "Gimana sih luka\nbisa nutup sendiri?"
POSTER = "Luka ditutup\nestafet sel."

# The recap: four small cards, two by two, over the dimmed finger. Each picture sits at (card x + 90, card y + 120).
CARD_POS = [(64, 262), (502, 262), (64, 552), (502, 552)]
CARDS = []
for (cx, cy), (word, when) in zip(CARD_POS, [("sumbat", "menit"), ("bersihkan", "jam"), ("tumbuh, tutup", "hari"), ("rapikan", "bulan")]):
    px, py = cx + 90, cy + 120
    CARDS.append({"card": [cx, cy, 414, 250]})
    if word == "sumbat":
        CARDS += [plate(px - 20, py), plate(px + 10, py + 22), rbc(px + 40, py - 10, 18)]
    elif word == "bersihkan":
        CARDS += [{"dot": [px, py, 32], "colour": "blue"}, {"path": f"M{px + 42} {py - 4} l28 -8", "colour": "green", "width": 10}]
    elif word == "tumbuh, tutup":
        CARDS += [{"path": f"M{px - 40} {py + 30} Q{px} {py - 20} {px + 40} {py + 30} Z", "colour": "pink", "fill": "pink"}, {"line": [px - 44, py - 14, px + 44, py - 14], "colour": "blue", "width": 6}]
    else:
        CARDS += [{"line": [px - 40, py + d, px + 40, py + d], "width": 3} for d in (-14, 0, 14, 28)]
    CARDS.append(label(cx + 270, cy + 104, word, 34))
    CARDS.append(label(cx + 270, cy + 160, when, 28))

FRAMES = {
    "s01": [
        fr(0.0, "Frame 0 is finished: a fingertip fills the upper two thirds, lit from the upper left, a raw scrape across its pad with a bead of blood. The first line of the question is in place below.",
           {"glow": [470, 560, 360], "colour": "red"}, FINGER, NAIL, *PRINTS, SCRAPE, {"dot": [600, 660, 18], "colour": "red"},
           {"title": [540, 1080], "text": "Gimana sih luka", "size": 96}, {"camera": "push"}),
        fr(0.5, "Each line lands as its first word is said; the blood bead swells and catches the light.",
           {"glow": [470, 560, 360], "colour": "red"}, FINGER, NAIL, *PRINTS, SCRAPE, {"dot": [600, 668, 24], "colour": "red"},
           {"title": [540, 1080], "text": Q, "size": 96, "accent": "nutup sendiri?"}, {"move": [700, 560, 640, 640], "text": "darah merembes"}),
        fr(1.0, "The question is asked; the lettering lifts and the camera dives into the scrape.",
           {"glow": [540, 640, 300], "colour": "red"}, FINGER, SCRAPE, {"magnifier": [540, 640, 120]}, {"camera": "push"}, {"cut": "masuk ke goresan"}),
    ],
    "s02": [
        fr(0.0, "Inside the scrape: the cross-section opens out of it, a disc of tissue growing from the scrape to the whole frame.",
           *skin(), *FLOW, {"ring": [540, 640, 260], "colour": "red"}, {"camera": "push"}),
        fr(0.5, "The whole cross-section: surface, epidermis, dermis, a capillary with red cells flowing, and the wound cut down to it.",
           *skin(), *FLOW, {"move": [100, 1000, 300, 1000], "text": "darah mengalir"}),
        fr(1.0, "On 'estafet' the time bar lands at the top: five ticks, four empty legs.",
           *skin(), *FLOW, *bar(0), {"move": [494, 240, 494, 300], "text": "bar waktu turun"}, {"cut": "tanpa potongan"}),
    ],
    "s03": [
        fr(0.0, "Blood wells out of the torn capillary into the wound; the marker starts at the first minute.",
           *skin(), *FLOW, *SPILL[:4], *bar(0, 1), {"move": [540, 940, 540, 760], "text": "darah naik"}),
        fr(0.6, "On 'trombosit' the small pale platelets light up among the red discs; a chip names one.",
           *skin(), *FLOW, *SPILL, *[plate(x, y) for x, y in [(500, 880), (580, 820), (520, 700), (600, 600)]], {"chip": [620, 690], "text": "trombosit"}, *bar(0, 2)),
        fr(1.0, "The platelets drift toward the walls of the wound.",
           *skin(), *FLOW, *SPILL, *PLUG[:6], {"chip": [620, 690], "text": "trombosit"}, *bar(0, 2), {"move": [540, 760, 470, 900], "text": "menempel"}, {"cut": "tanpa potongan"}),
    ],
    "s04": [
        fr(0.0, "Platelets stick to the torn wall and to each other, spiky now.",
           *skin(), *FLOW, *SPILL, *PLUG[:8], {"chip": [620, 690], "text": "trombosit"}, *bar(0, 3), {"camera": "push"}),
        fr(1.0, "A plug sits over the break in the vessel; the bleeding slows. The camera pushes into the wound.",
           *skin(), *FLOW, *SPILL, *PLUG, {"chip": [620, 960], "text": "sumbat"}, *bar(0, 3), {"camera": "push"}, {"cut": "terjun ke dalam gumpalan"}),
    ],
    "s05": [
        fr(0.0, "Lit 3D, very close: red cells (discs with a dimple) tumble slowly in warm haze; pale strands begin to spin between them.",
           {"glow": [540, 700, 420], "colour": "red"}, *[rbc(x, y, 70) for x, y in [(300, 520), (700, 640), (480, 860), (820, 1000), (260, 1050)]], {"camera": "orbit"}),
        fr(0.6, "On 'fibrin' the strands weave a net across the frame; a chip names them.",
           {"glow": [540, 700, 420], "colour": "red"}, *[rbc(x, y, 70) for x, y in [(300, 520), (700, 640), (480, 860), (820, 1000), (260, 1050)]],
           *[{"line": [a, b, c, d], "width": 3} for a, b, c, d in [(80, 400, 1000, 900), (100, 1100, 980, 380), (60, 760, 1020, 700), (400, 260, 620, 1180)]], {"chip": [620, 420], "text": "benang fibrin"}),
        fr(1.0, "The cells are caught in the net and slow to a stop.",
           {"glow": [540, 700, 420], "colour": "red"}, *[rbc(x, y, 70) for x, y in [(320, 540), (690, 650), (500, 850), (800, 980), (280, 1030)]],
           *[{"line": [a, b, c, d], "width": 4} for a, b, c, d in [(80, 400, 1000, 900), (100, 1100, 980, 380), (60, 760, 1020, 700), (400, 260, 620, 1180), (80, 560, 1000, 520)]], {"chip": [620, 420], "text": "benang fibrin"}, {"cut": "mundur ke potongan kulit"}),
    ],
    "s06": [
        fr(0.0, "Back in the cross-section: the wound is full of a dark clot, its net visible.",
           *skin(), *FLOW, *SPILL, *PLUG, *NET, *bar(0, 4), {"camera": "pull"}),
        fr(0.5, "The clot darkens from the top down; the marker slides to a few minutes.",
           *skin(), *FLOW, *SPILL, *PLUG, *NET, {"path": "M372 452 Q540 430 708 452 L700 480 Q540 470 380 480 Z", "colour": "ink", "fill": "ink"}, *bar(0, 5), {"move": [540, 470, 540, 520], "text": "mengering"}),
        fr(1.0, "On 'menggumpal' the clot sets, its top dries into a scab, and the first leg of the bar fills: minutes.",
           *skin(), *FLOW, *SPILL, *PLUG, *NET, SCAB, *bar(1, 6, "beberapa menit"), {"cut": "tanpa potongan"}),
    ],
    "s07": [
        fr(0.0, "A little closer on the top of the wound: the scab, the raw edges. Rod-shaped germs drift down from the air.",
           *skin(), SCAB, *NET, *BUGS[:1], *bar(1, 20), {"move": [330, 380, 380, 450], "text": "kuman turun"}),
        fr(1.0, "Two of them slip in at the scab's edge, into the clot.",
           *skin(), SCAB, *NET, *BUGS, {"chip": [760, 380], "text": "kuman"}, *bar(1, 40), {"cut": "kamera mendekat"}),
    ],
    "s08": [
        fr(0.0, "Closer on the side of the wound and the vessel: a white cell presses against the vessel wall.",
           *skin(), SCAB, *BUGS, {"dot": [600, 990, 44], "colour": "blue"}, *bar(1, 60), {"camera": "push"}),
        fr(0.5, "It squeezes out of the vessel and flows up toward the germs, one arm reaching ahead.",
           *skin(), SCAB, *BUGS, {"dot": [620, 820, 50], "colour": "blue"}, {"chip": [700, 760], "text": "sel darah putih"}, *bar(1, 240), {"move": [620, 900, 690, 520], "text": "merayap"}),
        fr(1.0, "It reaches the nearest germ; the bar's marker is at a few hours.",
           *skin(), SCAB, *BUGS, {"dot": [680, 540, 52], "colour": "blue"}, {"chip": [700, 760], "text": "sel darah putih"}, *bar(1, 360, "≈ 6 jam"), {"cut": "tanpa potongan"}),
    ],
    "s09": [
        fr(0.0, "The white cell's arms close around the germ.",
           *skin(), SCAB, {"dot": [680, 520, 58], "colour": "blue"}, {"path": "M690 470 l34 -10", "colour": "green", "width": 12}, *bar(1, 400, "≈ 6 jam")),
        fr(1.0, "The germ is inside it, dimming. The second leg of the bar is painted.",
           *skin(), SCAB, {"dot": [680, 520, 58], "colour": "blue"}, {"dot": [684, 516, 10], "colour": "green"}, *bar(2, 900), {"cut": "kamera mundur"}),
    ],
    "s10": [
        fr(0.0, "The whole wound again: under the scab the clot is fading, and new pink tissue rises from the base, with new capillary loops.",
           *skin(), SCAB, gran(860), *FLOW, *bar(2, 3 * 1440), {"move": [540, 930, 540, 760], "text": "tumbuh"}, {"camera": "pull"}),
        fr(0.5, "Half full: the clot above it thins, new capillary loops reach up into the pink.",
           *skin(), SCAB, gran(720), *FLOW, {"path": "M500 900 Q480 800 520 760 Q560 800 560 900", "colour": "red", "width": 4}, *bar(2, 4 * 1440), {"move": [540, 800, 540, 680], "text": "tumbuh"}),
        fr(1.0, "On 'jaringan baru' the tissue has filled the wound to just under the scab.",
           *skin(), SCAB, gran(GRAN_TOP), *FLOW, {"chip": [600, 760], "text": "jaringan baru"}, *bar(2, 5 * 1440, "hari ke-3 sampai ke-21"), {"cut": "kamera ke tepi"}),
    ],
    "s11": [
        fr(0.0, "Close on the top: from both edges a tongue of skin cells starts to crawl in, under the scab, over the new tissue.",
           *skin(), SCAB, gran(GRAN_TOP), *tongue(0.1), *bar(2, 6 * 1440), {"move": [380, 540, 470, 540], "text": "merayap"}, {"move": [700, 540, 610, 540], "text": ""}),
        fr(0.6, "The two tongues slide toward each other; a chip names the cells.",
           *skin(), SCAB, gran(GRAN_TOP), *tongue(0.6), {"chip": [600, 660], "text": "sel kulit"}, *bar(3, 9 * 1440)),
        fr(1.0, "On 'tertutup' they meet in the middle: the gap is closed.",
           *skin(), SCAB, gran(GRAN_TOP), *tongue(1.0), {"chip": [600, 660], "text": "sel kulit"}, *bar(3, 12 * 1440, "hari ke-3 sampai ke-21"), {"cut": "tanpa potongan"}),
    ],
    "s12": [
        fr(0.0, "The closed skin under its scab; the new tissue below is a tangle of fibres.",
           *skin(True), SCAB, gran(GRAN_TOP), *tongue(1.0), *[{"line": [430 + (k * 53) % 200, 640 + (k * 37) % 280, 470 + (k * 71) % 200, 700 + (k * 29) % 220], "width": 2} for k in range(9)], *bar(3, 18 * 1440)),
        fr(1.0, "On 'beres' the scab tilts up and drifts away.",
           *skin(True), gran(GRAN_TOP), *tongue(1.0), {"path": "M380 430 Q540 360 712 400 L700 430 Q540 400 392 460 Z", "colour": "ink", "fill": "ink"}, *bar(3, 21 * 1440), {"move": [540, 420, 640, 260], "text": "keropeng lepas"}, {"cut": "tanpa potongan"}),
    ],
    "s12b": [
        fr(0.0, "The tangle in the new tissue begins to turn.",
           *skin(True), gran(GRAN_TOP), *tongue(1.0), *[{"line": [430 + (k * 53) % 200, 640 + (k * 37) % 280, 470 + (k * 71) % 200, 700 + (k * 29) % 220], "width": 2} for k in range(9)], *bar(4, 25 * 1440), {"camera": "push"}),
        fr(0.5, "On 'dirapikan' the fibres comb themselves into straight bundles; the marker moves into weeks.",
           *skin(True), gran(GRAN_TOP), *[{"line": [400, y, 680, y + 6], "width": 3} for y in range(640, 940, 50)], {"chip": [600, 760], "text": "dirapikan"}, *bar(4, 60 * 1440, "berbulan-bulan")),
        fr(1.0, "On 'berbulan-bulan' the marker is at months; the bundles are parallel, the new tissue paler.",
           *skin(True), *[{"line": [400, y, 680, y + 4], "width": 3} for y in range(640, 940, 40)], *bar(4, 180 * 1440, "berbulan-bulan"), {"cut": "tanpa potongan"}),
    ],
    "s13": [
        fr(0.0, "The healed section: a pale band of scar where the wound was, flat underneath and with no wavy ridges.",
           *skin(True), {"path": "M380 470 L700 470 L640 940 L440 940 Z", "colour": "pink", "fill": "pink"}, *bar(4, YEAR_MIN)),
        fr(0.6, "On 'nggak sekuat' two bars land above: the original skin full, the scar at most about four fifths.",
           *skin(True), {"path": "M380 470 L700 470 L640 940 L440 940 Z", "colour": "pink", "fill": "pink"},
           {"panel": [64, 240, 866, 200], "title": "kekuatan kulit", "rows": []}, {"bar": [300, 300, 600, 40]}, {"bar": [300, 370, 480, 40]},
           label(180, 320, "asli", 28), label(180, 390, "bekas luka", 28), label(860, 390, "≤ 80%", 30)),
        fr(1.0, "On 'bekas luka' a chip lands on the pale band.",
           *skin(True), {"path": "M380 470 L700 470 L640 940 L440 940 Z", "colour": "pink", "fill": "pink"},
           {"panel": [64, 240, 866, 200], "title": "kekuatan kulit", "rows": []}, {"bar": [300, 300, 600, 40]}, {"bar": [300, 370, 480, 40]},
           label(180, 320, "asli", 28), label(180, 390, "bekas luka", 28), label(860, 390, "≤ 80%", 30), {"chip": [600, 700], "text": "bekas luka"}, {"cut": "kamera mundur ke jari"}),
    ],
    "s14": [
        fr(0.0, "The camera pulls out of the section, which shrinks back into the fingertip: the reverse of the dive.",
           FINGER, NAIL, *PRINTS, SCAR_LINE, {"ring": [540, 640, 200], "colour": "pink"}, {"camera": "pull"}),
        fr(1.0, "The fingertip, healed: a faint pale line where the scrape was.",
           FINGER, NAIL, *PRINTS, SCAR_LINE, {"glow": [470, 560, 360], "colour": "pink"}, {"cut": "kartu naik"}),
    ],
    "s15": [
        fr(0.0, "The finger dims; four glass cards rise, one after another, each with its small picture: platelets and a red cell, a white cell and a germ, new tissue, combed fibres.",
           FINGER, SCAR_LINE, *CARDS[:9], {"move": [990, 900, 990, 600], "text": "kartu naik"}),
        fr(1.0, "All four cards: the relay in one frame.",
           FINGER, SCAR_LINE, *CARDS, {"camera": "push"}, {"cut": "tanpa potongan"}),
    ],
    "s16": [
        fr(0.0, "In silence the poster line slams in where the question stood.",
           FINGER, SCAR_LINE, *CARDS, {"title": [540, 1060], "text": "Luka ditutup", "size": 104}),
        fr(1.0, "The poster holds, breathing, and can cut back to frame 0 (the same finger, the same place for the lettering).",
           FINGER, SCAR_LINE, *CARDS, {"title": [540, 1060], "text": POSTER, "size": 104, "accent": "estafet sel."}, {"camera": "push"}, {"cut": "kembali ke awal"}),
    ],
}

# ── Babak 1: pertanyaan ──────────────────────────────────────────────────────────────────────────────────────
shot("s01", "hook", "macro",
     voice="[warmly] Gimana sih luka bisa *nutup sendiri?*", hold=0.25, caption=False,
     teaches="Asks the question the film answers, over the thing the viewer has had: a scraped fingertip.",
     screen="A fingertip fills the frame from the bottom edge up to y 320, its pad toward us, lit warm from the upper left with a rim on the right; fingerprint ridges, a nail edge at the top. Across the pad a raw scrape (420..660, 560..700) with a bead of blood that grows. Below, in metal type at 96 px over the dark lower finger: 'Gimana sih luka / bisa nutup sendiri?', 'nutup sendiri?' in blood red. The lettering is the spoken line, so no caption.",
     motion="Frame 0 already holds the finger and the first line. The second line slams in as 'bisa' is said. The bead of blood swells and its highlight slides. A slow push of 4 percent toward the scrape; at the end the lettering lifts away and the camera dives into the scrape.",
     carries="The scrape: the camera goes into it.",
     transition="A dive: the finger scales up around the scrape while the cross-section opens out of it as a growing disc.",
     sound="The bed starts on frame 0. A soft whoosh on the dive, in the gap after the question.",
     check="The question is readable inside the safe area. The scrape is not covered by the lettering. Frame 0 is a finished picture.",
     facts=[])

shot("s02", "hook", "wide",
     voice="Ternyata, sel-sel kamu lagi kerja *estafet.*",
     teaches="The answer's shape: not one thing, a relay of cells taking turns.",
     screen="The cross-section of skin fills the frame: dark air above y 460, the translucent pale epidermis of packed cells to y 600 with its wavy base, warm pink dermis with fibres below, a capillary at y 1000 with red discs flowing through it. The wound is a V cut from the surface down into the capillary. Labels 'epidermis' and 'dermis' in small type. On 'estafet' a glass time bar lands at the top: a line from a minute to a year with ticks 'menit, jam, hari, minggu, tahun' and four empty legs.",
     motion="The disc opens to fill the frame in 0.6 s; the camera settles. Red cells flow in the vessel. The labels pop. The time bar drops in on 'estafet'.",
     carries="The section and the time bar: they stay to the end of the explanation.",
     transition="No cut: blood starts to well up.",
     sound="A soft whoosh with the dive, before the line. A small card sound as the bar lands, after the word.",
     check="The bar sits inside the safe area. The wound reaches the vessel. Nothing is under the spoken words.",
     facts=["f1", "f8"])

# ── Babak 2: sumbat ──────────────────────────────────────────────────────────────────────────────────────────
shot("s03", "sumbat", "diagram",
     voice="Yang pertama datang itu *trombosit,*",
     teaches="The first runner: platelets, small pieces of cell carried in the blood.",
     screen="Blood wells up from the torn vessel into the wound: red discs, and among them small pale-gold platelets. On 'trombosit' the platelets brighten and a chip 'trombosit' lands on one. The time bar's marker starts at one minute.",
     motion="The red cells rise into the gap, tumbling; the platelets catch the light as the word is said. The marker starts to move.",
     carries="The platelets, now visible.",
     transition="No cut: the platelets head for the walls.",
     sound="No effect under the voice.",
     check="Platelets are clearly smaller than red cells (a red cell is about 7 to 8 µm, a platelet 2 to 3 µm: drawn 44 px and 16 px). The chip sits on a platelet.",
     facts=["f2", "f8"])

shot("s04", "sumbat", "diagram",
     voice="keping darah yang nyumbat lubangnya.",
     teaches="What platelets do: they stick to the torn wall and to each other and plug the hole.",
     screen="The platelets turn spiky and stick along the walls of the wound and over the break in the vessel; they pile into a plug. The chip changes to 'sumbat' over the plug.",
     motion="Each platelet drifts to the wall, sticks with a small squash and turns spiky; more pile on. The red cells slow. The camera begins to push into the wound.",
     carries="The plug and the blood in the wound.",
     transition="A dive into the clot, to the 3D macro.",
     sound="A soft whoosh on the dive, between the lines.",
     check="Platelets end on the wall and the vessel break, not floating. The red cells keep flowing in the vessel beside the plug.",
     facts=["f2"])

shot("s05", "sumbat", "object3d",
     voice="Terus, benang *fibrin* menganyam jaring,",
     teaches="Fibrin strands weave a net that catches the red cells.",
     screen="Lit 3D, very close inside the blood: red cells as glossy biconcave discs tumbling slowly in a warm haze, a few small platelets. Pale, faintly glowing fibrin strands spin out across the frame, crossing and crossing until they are a net; the red cells catch on them and slow to a stop. A chip 'benang fibrin' rides on one strand.",
     motion="The camera orbits slowly. The strands grow from their ends in turn, on 'fibrin' and after; each cell that meets a strand slows. The time bar stays at the top.",
     carries="The net, which the next shot shows from outside as the clot.",
     transition="The camera pulls back out of the clot to the cross-section.",
     sound="A faint shimmer as the first strand spins, after 'fibrin'.",
     check="The discs read as red blood cells (round, dimpled). The strands are drawn growing, never popping in. The bar is readable over the 3D.",
     facts=["f2"])

shot("s06", "sumbat", "diagram",
     voice="dan dalam beberapa menit darahnya *menggumpal.*",
     teaches="The result, and how soon: within minutes the blood in the wound has become a clot, and its top dries to a scab.",
     screen="The cross-section: the wound is full of a dark red clot with the net's pale strands in it, the plug at its base. On 'menggumpal' the top of the clot darkens to a brown crust. The time bar's first leg fills in red over 'menit', and the chip over the marker reads 'beberapa menit'.",
     motion="The camera pulls back. The clot darkens from the top down; the first leg paints; the marker sits at a few minutes.",
     carries="The clot and its scab.",
     transition="A push toward the top of the wound.",
     sound="A soft low hit as the first leg fills, after the word.",
     check="The first leg covers a minute to ten minutes on the log bar (x 64 to 214).",
     facts=["f1", "f3", "f8"])

# ── Babak 3: bersihkan ───────────────────────────────────────────────────────────────────────────────────────
shot("s07", "bersihkan", "diagram",
     voice="Tapi *kuman* masih bisa masuk.",
     teaches="The danger the next runner deals with: germs get in at the edge of the wound.",
     screen="Closer (1.5 times) on the top of the wound: scab, the raw edges, the air above. Small rod-shaped germs, a sickly yellow-green, drift down out of the air; two slip in at the edge of the scab into the clot. A chip 'kuman'.",
     motion="The germs tumble down; two wriggle in under the scab's edge. The stage light turns a little colder.",
     carries="The germs inside the clot's edge.",
     transition="The camera moves down the wound's side toward the vessel.",
     sound="No effect under the voice.",
     check="The germs are a colour used for nothing else. They enter at the edge, not through the scab.",
     facts=["f4"])

shot("s08", "bersihkan", "macro",
     voice="Makanya, dalam beberapa jam, *sel darah putih* datang",
     teaches="The second runner: a white blood cell leaves the vessel and comes for the germs, within hours.",
     screen="Close (1.8 times) on the wall of the wound and the vessel: a white cell, soft cyan-white and translucent with a lobed nucleus inside, squeezes through the vessel wall and flows up toward the germs, reaching ahead with one arm. A chip 'sel darah putih' travels with it. The marker moves to a few hours and its chip reads '≈ 6 jam'.",
     motion="The cell squeezes out (a narrow neck, then round again), then crawls: its outline bulges forward and the rest follows. The camera follows it up.",
     carries="The white cell next to the germ.",
     transition="No cut: it engulfs the germ.",
     sound="A soft pop as the cell comes out of the vessel, between the words if the take allows.",
     check="The cell is clearly bigger than the red cells (drawn about twice their size: a neutrophil is about 12 to 15 µm). The marker's chip says ≈ 6 jam.",
     facts=["f4", "f8"])

shot("s09", "bersihkan", "macro",
     voice="dan *menelan* kumannya.",
     teaches="What it does: it engulfs the germ.",
     screen="The white cell's arms close around the germ; the germ ends inside it and dims. The second leg of the time bar paints cyan, from ten minutes to three days.",
     motion="Two arms wrap and meet; the germ is drawn inside; a soft cyan glow. The leg paints.",
     carries="The cleaned wound.",
     transition="The camera pulls back to the whole wound.",
     sound="A small soft click as the arms close.",
     check="The germ is inside the outline, not on top of it. The second leg covers x 214 to 611.",
     facts=["f4", "f8"])

# ── Babak 4: tutup ───────────────────────────────────────────────────────────────────────────────────────────
shot("s10", "tutup", "diagram",
     voice="Beberapa hari berikutnya, *jaringan baru* tumbuh mengisi lukanya.",
     teaches="The third runner: new tissue grows up from the base and fills the wound, over days.",
     screen="The whole wound: under the scab the clot fades while new tissue, healing pink and bumpy with tiny new capillary loops, rises from the base until it fills the wound to just under the scab. A chip 'jaringan baru'. The marker moves into days; its chip reads 'hari ke-3 sampai ke-21'.",
     motion="The camera pulls back; the pink tissue rises in soft waves, loops of new vessels growing into it.",
     carries="The new tissue and the scab.",
     transition="The camera moves up to the top of the wound.",
     sound="No effect under the voice.",
     check="The tissue grows from the bottom up. The chip says hari ke-3 sampai ke-21.",
     facts=["f5", "f8"])

shot("s11", "tutup", "macro",
     voice="Sel kulit dari pinggir luka *merayap* pelan-pelan, sampai celahnya tertutup.",
     teaches="Skin cells crawl in from the edges, under the scab, until the gap is closed.",
     screen="Close (1.6 times) on the top of the wound: from both edges a tongue of skin cells, the same packed cells as the epidermis and tinted cyan as they move, slides in under the scab over the pink tissue. A chip 'sel kulit'. On 'tertutup' the two tongues meet. The third leg of the bar paints pink.",
     motion="The leading cells flatten and slide, the ones behind follow; they meet as the word is said. The camera drifts with them.",
     carries="The closed skin and the scab.",
     transition="No cut: the scab starts to lift.",
     sound="A soft click as the edges meet, after the word.",
     check="The tongues move under the scab, not over it. They meet at x 540.",
     facts=["f6", "f8"])

# ── Babak 5: rapikan ─────────────────────────────────────────────────────────────────────────────────────────
shot("s12", "rapikan", "diagram",
     voice="Tapi kerjanya belum *beres:*",
     teaches="The relay is not over: the closed skin is still unfinished underneath.",
     screen="The closed section with its scab. In the new pink tissue the fibres lie in a tangle. On 'beres' the scab tilts up at one edge and drifts away, leaving thin new skin. The bar's third leg is painted; the marker is at three weeks.",
     motion="The scab peels from its left edge, tilts and drifts up out of the frame. The camera pushes 3 percent.",
     carries="The new tissue and its tangled fibres.",
     transition="No cut: the fibres start to comb.",
     sound="A soft whoosh as the scab lifts, after the word if the take allows.",
     check="The scab leaves the skin closed underneath. The marker is at x 738 (21 days).",
     facts=["f1", "f8"])

shot("s12b", "rapikan", "macro",
     voice="kulit baru itu *dirapikan* berminggu-minggu, bahkan berbulan-bulan.",
     teaches="The last runner is slow: the new tissue is reorganised for weeks to months.",
     screen="Closer (1.3 times) on the new tissue: the tangled fibres comb themselves, on 'dirapikan', into straight parallel bundles; the tissue pales from pink toward the dermis colour. The marker travels from weeks into months, painting the fourth leg; its chip reads 'berbulan-bulan'.",
     motion="The fibres turn and straighten over the rest of the line, slowly, as if combed from left to right. The camera pushes in and settles.",
     carries="The healed section, with a band that is not quite like the rest.",
     transition="The camera pulls back to the whole section.",
     sound="A soft shimmer as the fibres comb, after 'dirapikan'.",
     check="The fourth leg runs from three weeks to a year (x 738 to 924), with the marker ending past a few months.",
     facts=["f7", "f8"])

shot("s13", "rapikan", "compare",
     voice="Hasilnya nggak sekuat kulit asli, dan kadang tersisa jadi *bekas luka.*",
     teaches="Why a scar can remain: the remodelled skin is weaker and different from the original.",
     screen="The healed section: a pale band where the wound was, its fibres parallel, its base flat. The time bar is replaced by a glass panel 'kekuatan kulit' with two bars: 'asli' full, 'bekas luka' at 80% of its length with '≤ 80%'. On 'bekas luka' a chip lands on the pale band.",
     motion="The panel lands; the scar bar draws to its value (no counting); the chip pops.",
     carries="The pale band: it becomes the line on the finger.",
     transition="The camera pulls out of the section back to the fingertip.",
     sound="A soft card sound as the panel lands, between the words.",
     check="The scar bar is 0.8 of the original's length. The number is ≤ 80%, as in the fact sheet.",
     facts=["f7", "f9"])

# ── Babak 6: rangkuman ───────────────────────────────────────────────────────────────────────────────────────
shot("s14", "recap", "wide",
     voice="Jadi, luka nggak nutup *sendiri.*",
     teaches="The answer: a wound does not close by itself.",
     screen="The section shrinks back into the fingertip (the reverse of the dive); the fingertip, lit as in the hook, has a faint pale line where the scrape was.",
     motion="The section shrinks into the scrape and the finger scales down around it in 0.7 s, then a slow push of 3 percent.",
     carries="The finger: the cards rise over it.",
     transition="No cut: the cards rise.",
     sound="A soft whoosh with the pull out, before the line.",
     check="The finger matches the hook's: same place, same light.",
     facts=["f7"])

shot("s15", "recap", "recap",
     voice="Sel-sel kamu yang *gantian* menutupnya.",
     teaches="The relay in one frame: plug, clean, grow and close, tidy.",
     screen="Over the dimmed finger, four glass cards two by two (414 x 250 each, from y 262 to 802), each with a small drawing, a word and a time: platelets and a red cell, 'sumbat', 'menit'; a white cell and a germ, 'bersihkan', 'jam'; pink new tissue under a closing skin, 'tumbuh, tutup', 'hari'; combed fibres, 'rapikan', 'bulan'.",
     motion="The cards rise one after another in the first second; a sheen crosses them.",
     carries="The cards.",
     transition="No cut: the poster line lands under them.",
     sound="A small card sound with each of the four, between the words where possible.",
     check="Each card matches its phase in the fact sheet. Nothing is under the spoken words.",
     facts=["f1"])

shot("s16", "recap", "endcard", 2.6,
     teaches="The line to remember.",
     screen="The cards stay; in the place the question stood, the poster line in metal type at 104 px: 'Luka ditutup / estafet sel.', 'estafet sel.' in blood red.",
     motion="The two lines slam in, a sheen crosses them, and everything holds for two seconds with a 3 percent push.",
     transition="The film ends on this frame; it can cut back to frame 0 (the same finger, lettering in the same place).",
     sound="A soft low hit under the poster line; the bed resolves on its last chord and fades.",
     check="The poster is readable for at least two seconds. Nothing is outside the safe area.",
     facts=[])

duration = shots[-1]["end"]

storyboard = {
    "title": "Gimana sih luka bisa nutup sendiri?",
    "question": "Gimana sih luka bisa nutup sendiri?",
    "audience": "Remaja dan orang dewasa di Indonesia yang menonton video pendek di ponsel, tanpa latar belakang biologi. Mereka pernah luka, tahu ada keropeng dan bekas luka, tapi belum pernah membayangkan apa yang terjadi di dalam kulit.",
    "promise": "Tubuh menutup luka secara estafet: trombosit menyumbat lubang dan benang fibrin membuat gumpalan dalam hitungan menit; sel darah putih datang dan memakan kuman; lalu jaringan baru tumbuh dan sel kulit merayap dari pinggir sampai luka tertutup; kulit baru itu dirapikan berminggu-minggu sampai berbulan-bulan dan hasilnya nggak sekuat kulit asli, makanya bekas luka kadang tersisa.",
    "language": "id",
    "format": "1080x1920",
    "captions": "pop",
    "duration": round(duration, 3),
    "fps": 60,
    "poster": 0.4,
    "voice": {"voice_id": "GdyFAZdMpKMBHw5pc1Bu", "name": "Livna", "model": "eleven_v4", "language": "id"},
    "look": {
        "accent": "#e8463d",
        "accent2": "#7fe3da",
        "mood": "Warm and organic: a lit cross-section of skin, translucent cells with soft highlights and shadows, dermis glowing warm pink, the stage light sitting where the work is happening. Blood red is blood and the point of the film; a soft healing cyan is the white cell and the moving skin cells; pink is new tissue; germs are a sickly yellow-green used for nothing else.",
    },
    "music": {
        "track": "A bed composed for this film (ElevenLabs Music, music/bed.mp3)",
        "bpm": 80,
        "start": 0,
        "note": "Composed after the take, to the film's length: soft felt piano and marimba over a warm pad, sparse, no lead melody, no vocals. The cuts follow the take, not a beat. Kept at -22 LUFS under the voice.",
    },
    "facts": [
        {"id": "f1", "claim": "Wound healing is usually described as four overlapping phases: hemostasis (bleeding stops, minutes), inflammation (cleaning, from the first hours to about day 3: the first 72 h), proliferation (new tissue and new skin, about day 3 to week 3) and remodelling (from about week 3 to a year or more; sources range up to two years). The film paints them on the time bar as 1 to 10 minutes, 10 minutes to 3 days, 3 to 21 days and 21 days to a year. Simplification: the phases overlap, and the times are for a small, clean wound in healthy skin.",
         "source": "StatPearls, Wound Healing Phases (Wallace, Basehore, Zito; NCBI Bookshelf NBK470443, PubMed 29262065); StatPearls, Physiology, Wound Healing (NBK535406). Read as search summaries: the pages themselves could not be opened from this session."},
        {"id": "f2", "claim": "Platelets stick to the exposed wall of a torn vessel and to each other, forming a platelet plug; thrombin turns the blood protein fibrinogen into fibrin, whose strands form a net that traps red blood cells and more platelets and reinforces the plug into a clot. Sizes for the drawing: a red cell is about 7 to 8 µm across, a platelet about 2 to 3 µm (drawn 44 px and 16 px), not otherwise to scale.",
         "source": "OpenStax, Anatomy and Physiology 2e, 18.5 Hemostasis (openstax.org/books/anatomy-and-physiology/pages/18-5-hemostasis), read as a search summary; cell sizes from general textbook knowledge, not looked up."},
        {"id": "f3", "claim": "Within minutes: the bleeding time of a small standard skin cut is a few minutes (published normal ranges vary, roughly 1 to 9 minutes). The film says 'dalam beberapa menit' and shows no exact figure.",
         "source": "Bleeding time reference ranges (e.g. Healthline, Bleeding Time Test; clinical laboratory lecture notes), read as search summaries."},
        {"id": "f4", "claim": "White blood cells called neutrophils arrive first: the bulk are recruited in the first 6 to 12 hours, peak at about a day and stay 2 to 5 days; they engulf (phagocytose) bacteria and kill them. Macrophages, from monocytes in the blood, follow (in numbers around day 2 to 3), clear debris and spent neutrophils and signal the switch to repair. The film shows one neutrophil, labelled 'sel darah putih', at about 6 hours; macrophages are left out for time. The germs are drawn as rods, not as a particular species.",
         "source": "Review, Immunology of Wound Healing, Current Dermatology Reports (doi 10.1007/s13671-018-0234-9); StatPearls, Physiology, Wound Healing (NBK535406). Read as search summaries."},
        {"id": "f5", "claim": "In the proliferation phase (about day 3 to week 3), fibroblasts lay down new matrix and new capillaries grow in, forming granulation tissue that fills the wound from its base.",
         "source": "StatPearls, Wound Healing Phases (NBK470443); read as a search summary."},
        {"id": "f6", "claim": "Skin cells (keratinocytes) at the wound edge change within about 6 hours of injury and start migrating across the wound by about 18 hours in human skin (re-epithelialization), moving over the new tissue and under the scab until the edges meet. Simplification: the film shows the crawl after the new tissue for clarity; in reality the two overlap.",
         "source": "Paladini et al., Onset of re-epithelialization after skin injury correlates with a reorganization of keratin filaments in wound edge keratinocytes, Journal of Cell Biology 132 (3): 381, 1996 (read as a search summary)."},
        {"id": "f7", "claim": "In remodelling, the first collagen (type III) is replaced by type I and the fibres are reorganised; this goes on for months, a year or more. The repaired skin is weaker: about 20% of its strength at three weeks, 70 to 80% by three months, and at most about 75 to 80% of unwounded skin. The film writes '≤ 80%'.",
         "source": "Review on scar biology in PMC (pmc.ncbi.nlm.nih.gov/articles/PMC5792236), read as a search summary; Gurtner et al., Wound repair and regeneration, Nature 453: 314, 2008 (from knowledge, not looked up)."},
        {"id": "f8", "claim": "The time bar is a log scale from 1 minute to 1 year (525 600 minutes) over 860 px: x = 64 + 860 x log10(minutes) / log10(525 600). An hour sits at x 331, a day at 539, a week at 666, a year at 924; 10 minutes at 214, 3 days at 611, 21 days at 738; the marker's 6 hours at 448. Its chips: 'beberapa menit' (f3), '≈ 6 jam' (f4), 'hari ke-3 sampai ke-21' (f1, f5) and 'berbulan-bulan' (f7). The marker's positions in between are illustrative within each phase's window.",
         "source": "Arithmetic from f1, f3, f4, f5, f7."},
        {"id": "f9", "claim": "Scar tissue differs from the skin around it: its collagen lies in parallel bundles instead of a basket weave, and the junction with the epidermis is flat (no wavy ridges); it has no hair follicles or sweat glands. The film draws parallel fibres, a flat base and a paler band. The narration says 'kadang tersisa' (sometimes remains) because a small, shallow scrape often leaves no visible scar.",
         "source": "Gurtner et al., Nature 453: 314, 2008; general dermatology textbooks. From knowledge, not looked up."},
    ],
    "acts": [
        {"id": "hook", "title": "Pertanyaan", "goal": "Ask the question over a scraped finger, then dive into the skin and give the answer's shape: a relay.", "rail": False},
        {"id": "sumbat", "title": "Sumbat", "goal": "Platelets plug the hole and fibrin weaves a net: a clot within minutes.", "rail": False},
        {"id": "bersihkan", "title": "Bersihkan", "goal": "Germs get in; a white cell comes within hours and eats them.", "rail": False},
        {"id": "tutup", "title": "Tutup", "goal": "New tissue fills the wound over days and skin cells crawl in from the edges to close it.", "rail": False},
        {"id": "rapikan", "title": "Rapikan", "goal": "The new skin is reorganised for weeks to months and ends weaker: why a scar can remain.", "rail": False},
        {"id": "recap", "title": "Rangkuman", "goal": "Back on the finger, the four runners in one frame and the line to remember.", "rail": False},
    ],
    "shots": shots,
}

out = HERE / "storyboard.json"
out.write_text(json.dumps(storyboard, ensure_ascii=False, indent=2) + "\n")
print(f"{len(shots)} shots, {sum(len(s['frames']) for s in shots)} frames, about {duration:.1f} s before the take -> {out}")
# The take sets the times: once it is there, put them back after every build.
manifest = HERE / "voice" / "voice.json"
if manifest.exists() and json.loads(manifest.read_text()).get("version") == 2:
    kit = next(p for p in HERE.parents if (p / "kit" / "audio" / "voice.mjs").exists())
    subprocess.run(["node", str(kit / "kit" / "audio" / "voice.mjs"), str(HERE), "--retime"], check=False, stdout=subprocess.DEVNULL)
