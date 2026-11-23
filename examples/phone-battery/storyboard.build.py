"""Writes storyboard.json for "Where does a phone battery keep its energy?" (landscape 1920 x 1080, the Whiteboard template).

The sample film of the Whiteboard template: black marker on a clean white board, blue for the key idea (the lithium
ions, the words that matter) and red for warnings (the electron the separator turns back). The film is cut to one
take of English narration, every spoken line shown as a marker caption (subtitles), so the times here are a guess
until the take retimes the board:

    python3 examples/phone-battery/storyboard.build.py && node kit/tools/storyboard.mjs examples/phone-battery --png

The battery is the one in the viewer's pocket: a phone's lithium-ion cell, a lithium cobalt oxide cathode and a
graphite anode (Battery University BU-205), a flat pouch holding a wound (or stacked) sandwich of thin sheets
(BU-301a). The cell diagram is a schematic, not to scale, and says so on screen: six lithium ions stand for the
billions in a real cell, and the same six are on the board from the first frame to the last, which is the point:
a full battery and an empty one hold the same things, only the lithium is in a different place.

The board is one long board; the camera tracks along it. Section A (the two phones) is never drawn on after frame 0,
so the last shot tracks back to it and lands on frame 0 exactly: the loop.
"""
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
shots = []

# Marker colours in the sketch: black for most lines, blue for the key idea (lithium, key words), red for warnings.
KEY, WARN = "blue", "red"
N_LI = 6  # lithium ions drawn: a stand-in for the billions in a real cell, the same six all film


# ── Drawing helpers (screen coordinates, 1920 x 1080; captions sit below y 940) ─────────────────────────────────────
def fr(at, note, *draw):
    flat = []
    for d in draw:
        flat.extend(d if isinstance(d, list) else [d])
    return {"at": at, "note": note, "draw": flat}


def label(x, y, text, size=46, **more):
    return {"label": [round(x), round(y)], "text": text, "size": round(size), **more}


def rrect(x, y, w, h, r=20, **more):
    d = (f"M{x + r} {y} H{x + w - r} Q{x + w} {y} {x + w} {y + r} V{y + h - r} Q{x + w} {y + h} {x + w - r} {y + h} "
         f"H{x + r} Q{x} {y + h} {x} {y + h - r} V{y + r} Q{x} {y} {x + r} {y} Z")
    return {"path": d, **more}


def li(x, y, r=18):
    """A lithium ion: a blue ring with a plus."""
    return [{"ring": [round(x), round(y), r], "colour": KEY, "width": 5}, {"path": f"M{x - r * 0.5:.0f} {y:.0f} H{x + r * 0.5:.0f} M{x:.0f} {y - r * 0.5:.0f} V{y + r * 0.5:.0f}", "colour": KEY, "width": 4}]


def electron(x, y, tag=False):
    out = [{"dot": [round(x), round(y), 9], "colour": "ink"}]
    if tag:
        out.append(label(x + 26, y - 14, "electron", 34, align="start"))
    return out


def leader(x0, y0, x1, y1):
    return {"line": [x0, y0, x1, y1], "width": 3}


# ── Section A: two phones, full and empty, the same six lithium ions in each (frame 0; never drawn on again) ────────
def phone_back(x, y, full, w=380, h=640):
    """A phone seen from the back with its cover off: body, camera, and the flat battery with a window on its insides."""
    out = [rrect(x, y, w, h, 44, width=7), rrect(x + 26, y + 26, 110, 110, 26, width=5), {"ring": [x + 62, y + 62, 18], "width": 4}, {"ring": [x + 100, y + 100, 18], "width": 4},
           rrect(x + 40, y + 160, w - 80, h - 220, 18, width=6), {"path": f"M{x + 150} {y + 160} V{y + 132} H{x + 230} V{y + 160}", "width": 4}]
    band = (w - 120) * 0.32
    g0, o1, top = x + 60, x + w - 60, y + 200
    gx, ox = g0 + band / 2, o1 - band / 2
    out += [{"path": f"M{g0:.0f} {top - 10} V{y + h - 80} M{g0 + band:.0f} {top - 10} V{y + h - 80}", "width": 3},  # graphite band
            {"path": f"M{o1 - band:.0f} {top - 10} V{y + h - 80} M{o1:.0f} {top - 10} V{y + h - 80}", "width": 3},  # oxide band
            {"line": [x + w / 2, top - 10, x + w / 2, y + h - 80], "dashed": True, "width": 3}]
    for k in range(N_LI):
        out += li(gx if full else ox, top + 26 + k * 62, 17)
    # the level, above the phone
    out += [rrect(x + 70, y - 80, 84, 40, 8, width=4), {"path": f"M{x + 154} {y - 68} h8 v16 h-8", "width": 4}]
    if full:
        out.append(rrect(x + 76, y - 74, 72, 28, 4, fill="ink", width=2))
    out.append(label(x + 260, y - 44, "100%" if full else "0%", 54))
    return out


PH_L, PH_R, PH_Y = 300, 1240, 220


def board_a():
    return [*phone_back(PH_L, PH_Y, True), *phone_back(PH_R, PH_Y, False), label(960, 600, "=", 220, colour=KEY),
            label(PH_L + 190, PH_Y + 700, "full", 50), label(PH_R + 190, PH_Y + 700, "empty", 50)]


# ── Section D: the cell, a slice through the sheets (schematic, not to scale) ───────────────────────────────────────
GX0, GX1, OX0, OX1, TOP, BOT, SEP = 170, 470, 930, 1230, 400, 840, 700
G_SLOTS = [(250, 457), (390, 512), (250, 567), (390, 622), (250, 677), (390, 732)]  # between the graphite sheets
O_SLOTS = [(1010, 470), (1150, 550), (1010, 630), (1150, 710), (1010, 790), (1150, 470)]  # between the oxide rows
assert len(G_SLOTS) == len(O_SLOTS) == N_LI


def cell_body(labels=True, small_note=True):
    out = [{"path": f"M{GX0} {TOP} H{GX1} V{BOT} H{GX0} Z", "width": 7}, {"path": f"M{OX0} {TOP} H{OX1} V{BOT} H{OX0} Z", "width": 7}]
    out += [{"path": f"M{GX0 + 14} {430 + 55 * i} H{GX1 - 14}", "width": 4} for i in range(8)]  # graphite sheets
    out += [{"ring": [x, 430 + 80 * i, 10], "width": 3} for i in range(6) for x in range(955, 1215, 50)]  # oxide rows
    out += [{"line": [SEP, TOP - 20, SEP, BOT + 20], "dashed": True, "width": 5}]
    out += [label(x, y, "~", 40) for x, y in [(540, 470), (620, 620), (560, 760), (800, 520), (860, 690), (780, 800)]]
    if labels:
        out += [label(320, 905, "graphite", 46), leader(320, 870, 320, 846), label(1080, 905, "metal oxide", 46), leader(1080, 870, 1080, 846),
                label(585, 905, "electrolyte", 40), leader(585, 872, 600, 800), label(SEP, 370, "separator", 42)]
    if small_note:
        out.append(label(1640, 110, "schematic, not to scale", 32))
    return out


def ions(where):
    """where: 'g' (all in the graphite), 'o' (all in the oxide), or a list of (x, y)."""
    pts = G_SLOTS if where == "g" else O_SLOTS if where == "o" else where
    out = []
    for x, y in pts:
        out += li(x, y)
    return out


WIRE = {"path": f"M320 {TOP} V200 H620 M780 200 H1080 V{TOP}", "width": 6}


def charger():
    return [rrect(620, 140, 160, 120, 14, width=6), {"path": "M665 140 V100 M735 140 V100", "width": 7}, label(890, 160, "charger", 44)]


def phone_small(lit=False):
    out = [rrect(645, 90, 110, 210, 18, width=6), rrect(657, 108, 86, 160, 8, width=3)]
    if lit:
        out += [{"path": "M700 70 V40 M760 80 L785 55 M640 80 L615 55", "colour": KEY, "width": 5}]
    out.append(label(890, 160, "phone", 48))
    return out


def hill(t=0.0, arrow=None, labels=True):
    """The hill beside the cell: high on the left (lithium in the graphite), low on the right (in the oxide).
    t places the ball: 0 at the top, 1 at the bottom."""
    pts = [(1400, 404), (1520, 470), (1600, 640), (1690, 780), (1770, 806)]
    k = min(int(t * (len(pts) - 1)), len(pts) - 2)
    f = t * (len(pts) - 1) - k
    bx, by = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f
    out = [{"path": "M1320 430 H1440 C 1560 430, 1600 830, 1820 830", "width": 7}, *li(bx, by, 24)]
    if labels:
        out += [label(1400, 350, "in graphite", 40), label(1640, 905, "in metal oxide", 40)]
    if arrow == "up":
        out.append({"move": [1700, 760, 1460, 420], "text": "pushed up"})
    if arrow == "down":
        out.append({"move": [1460, 430, 1720, 780], "text": "rolls down"})
    return out


# The electrons on the wire: positions along it in the direction they travel.
E_CHARGE = [(1080, 330), (1080, 230), (950, 200), (840, 200), (520, 200), (400, 200), (320, 260)]  # oxide side -> charger -> graphite
E_USE = [(320, 330), (320, 230), (420, 200), (560, 200), (860, 200), (990, 200), (1080, 280)]  # graphite -> phone -> oxide


def electrons(pts, tag_first=True):
    out = []
    for i, (x, y) in enumerate(pts):
        out += electron(x, y, tag=tag_first and i == 0)
    return out


# ── Close-ups: the loose and the snug lithium (s10); the separator (s14) ───────────────────────────────────────────
def close_bonds(stage):
    out = [{"path": f"M120 {y} H860" , "width": 7} for y in (300, 450, 600, 750)]
    out += [label(490, 230, "in graphite", 54), *li(490, 525, 42)]
    if stage >= 1:
        out += [{"path": "M410 500 q-20 25 0 50 M570 500 q20 25 0 50", "width": 4}, label(490, 850, "loose: doesn't like it here", 48)]
    out += [label(1440, 230, "in metal oxide", 54)]
    out += [{"ring": [x, y, 34], "width": 5} for y in (360, 690) for x in range(1100, 1800, 110)]
    out += li(1440, 525, 42)
    if stage >= 1:
        out += [{"path": "M1386 470 L1340 410 M1494 470 L1540 410 M1386 580 L1340 640 M1494 580 L1540 640", "width": 4}, label(1440, 850, "held tight: at home", 48)]
    return out


def close_separator(stage):
    out = [{"path": "M900 140 V360 M900 420 V610 M900 670 V880 M1020 140 V360 M1020 420 V610 M1020 670 V880", "width": 7},
           {"path": "M900 360 H1020 M900 420 H1020 M900 610 H1020 M900 670 H1020", "width": 4}, label(960, 110, "separator", 52),
           label(470, 200, "graphite", 50), {"arrow": [370, 240, 250, 240]}, label(1450, 200, "metal oxide", 50), {"arrow": [1560, 240, 1680, 240]}]
    if stage == 0:
        out += li(700, 390, 34) + electron(700, 640)
    if stage >= 1:
        out += li(1200, 390, 34) + [{"move": [700, 390, 1150, 390]}, label(1250, 320, "through a pore", 46, colour=KEY)]
    if stage >= 1:
        out += electron(860, 640) + [{"path": "M800 600 L840 560 M800 560 L840 600", "colour": WARN, "width": 7}]
    if stage >= 2:
        out += [{"arrow": [850, 660, 660, 760], "colour": WARN}, label(560, 830, "electrons can't pass", 50, colour=WARN)]
    return out


# ── The recap ──────────────────────────────────────────────────────────────────────────────────────────────────────
def recap(stage):
    out = [label(960, 190, "charging = pushing lithium up the hill", 72)]
    # 1: charging: the ball pushed up, a plug beside it
    out += [{"path": "M120 400 H250 C 370 400, 400 760, 620 760", "width": 7}, *li(210, 372, 26), {"move": [560, 700, 280, 420], "text": "up"},
            rrect(470, 280, 120, 84, 12, width=6), {"path": "M500 280 V245 M560 280 V245", "width": 6}, label(370, 850, "charging: lithium goes up", 46)]
    if stage >= 1:
        out += [{"path": "M700 400 H830 C 950 400, 980 760, 1200 760", "width": 7}, *li(1100, 736, 26), {"move": [850, 420, 1080, 700], "text": "down"},
                rrect(1090, 230, 90, 170, 14, width=6), *electron(1000, 315), {"arrow": [1020, 315, 1080, 315]}, label(950, 850, "in use: lithium goes down", 46)]
    if stage >= 2:
        out += [rrect(1300, 320, 210, 420, 16, width=6), rrect(1600, 320, 210, 420, 16, width=6), label(1555, 570, "=", 110, colour=KEY),
                {"line": [1405, 340, 1405, 720], "dashed": True, "width": 3}, {"line": [1705, 340, 1705, 720], "dashed": True, "width": 3}]
        for k in range(3):
            out += li(1350, 420 + k * 120, 20) + li(1760, 420 + k * 120, 20)
        out.append(label(1555, 850, "same stuff, just moved", 46))
    return out


# ── The script, cut into shots (one take; the take sets the times) ────────────────────────────────────────────────
def shot(id, act, type_, voice, **more):
    start = shots[-1]["end"] if shots else 0.0
    plain = voice.replace("*", "")
    length = more.pop("length", None) or max(1.3, round(len(plain) / 15.5 + 0.1, 2))  # Courtney's take for onion-tears ran at about 15.7 characters a second
    shots.append({"id": id, "act": act, "type": type_, "start": round(start, 3), "end": round(start + length, 3), "voice": voice, **more})


TRACK = "The camera tracks right along the board to a clean stretch"
CELL_SCREEN = ("The cell as a slice through its sheets, filling the left two thirds: on the left a block of graphite drawn as stacked "
               "horizontal sheets (x 170-470), on the right a block of metal oxide drawn as rows of small rings (x 930-1230), between them "
               "the electrolyte marked with a few '~' and the separator as a dashed vertical line at x 700; labels with leaders underneath "
               "('graphite', 'electrolyte', 'metal oxide') and 'separator' over the separator; small, top right, 'schematic, not to scale'.")

shot("s01", "hook", "wide", "A full phone battery and an empty one hold *exactly the same* stuff.",
     teaches="The surprise that opens the question: a full phone battery and an empty one contain exactly the same things.",
     screen="Frame 0 is finished: a clean white board (#fbfbf8) with a faint shine and a few ghost marks. Two phones seen from the back with the cover off, drawn in black marker: left one with a full battery icon and '100%' above it, 'full' under it; right one with an empty icon, '0%', 'empty'. Each shows its flat battery with a window on its insides: two thin bands and a dashed line between them, and the same six blue lithium ions, in the left band of the full one and in the right band of the empty one. A big blue '=' between the phones.",
     motion="The camera holds, then pushes in slowly toward the '='; on 'exactly the same' the marker taps the '=' (a squeak). The spoken line is hand-lettered as a caption beside the bottom edge, word by word, 'exactly the same' in blue.",
     carries="The two phones (section A of the board).", transition="The camera tracks right to a clean stretch of board.",
     sound="The light, upbeat bed starts under the first word; a marker squeak on the '='.",
     check="Frame 0 is complete; both phones read as phones; the six ions are the same six in both.", facts=["f1", "f7"],
     frames=[fr(0, "Frame 0: the two phones, full and empty, and the '=' between them.", board_a()),
             fr(0.5, "The camera eases in toward the '='.", board_a(), {"camera": "push"}),
             fr(1, "The '=' tapped on 'exactly the same'.", board_a(), {"ring": [960, 520, 120], "colour": KEY, "dashed": True}, {"cut": "track right"})])

shot("s02", "hook", "type", "So where's the *energy*?", caption=False,
     teaches="Asks the one question: where is the energy kept?",
     screen="A clean stretch of board: a flat phone battery drawn on the left with a '?' inside it; on the right, written large in marker lettering (Patrick Hand), 'Where's the / energy?' with 'energy?' boxed in blue. The lettering is the line, so no caption repeats it.",
     motion=f"{TRACK}; the battery is outlined fast, the '?' drawn in it; the words are written on as said; the blue box is drawn round 'energy?' on the word.",
     carries="The battery outline.", transition="The camera tracks right; the battery is drawn large.",
     sound="Marker squeaks while writing; a tap for the '?'.", check="Readable as a question in under a second.",
     frames=[fr(0, "Tracking right; the battery outline and its '?'.", rrect(200, 260, 360, 520, 24, width=7), label(380, 580, "?", 220), {"camera": "right"}),
             fr(0.5, "'Where's the' written.", rrect(200, 260, 360, 520, 24, width=7), label(380, 580, "?", 220), label(1180, 420, "Where's the", 120)),
             fr(1, "'energy?' boxed in blue.", rrect(200, 260, 360, 520, 24, width=7), label(380, 580, "?", 220), label(1180, 420, "Where's the", 120), label(1180, 600, "energy?", 140), rrect(960, 480, 440, 160, 18, colour=KEY, width=6), {"cut": "track right"})])

shot("s03", "inside", "diagram", "Let's *open* one.",
     teaches="Look inside the real thing: a phone's battery is a flat sealed pouch.",
     screen="A phone battery drawn large: a flat pouch 800 x 540 px with a thin circuit strip along its top edge and a little flex connector, labelled 'phone battery' with a leader; a dashed cut line along its right edge.",
     motion=f"{TRACK}; the pouch is drawn at writing speed; the cut line is dashed down its right edge as the voice says 'open'.",
     carries="The pouch.", transition="Continuous: the pouch opens and its insides are drawn.",
     sound="A long marker stroke; a short squeak for each dash.", check="It reads as a phone battery (flat, with its circuit strip), not as an AA cell.", facts=["f2"],
     frames=[fr(0, "The pouch, its circuit strip and connector.", rrect(300, 220, 800, 540, 26, width=7), {"path": "M340 220 V270 H1060 V220 M640 220 V170 H760 V220", "width": 5}, label(1420, 300, "phone battery", 54), leader(1260, 310, 1100, 360), {"camera": "right"}),
             fr(1, "A dashed cut line down its right edge.", rrect(300, 220, 800, 540, 26, width=7), {"path": "M340 220 V270 H1060 V220 M640 220 V170 H760 V220", "width": 5}, label(1420, 300, "phone battery", 54), leader(1260, 310, 1100, 360), {"line": [1140, 240, 1140, 760], "dashed": True, "width": 5}, {"cut": "continuous"})])

ROLL = [rrect(340 + k * 34, 300 + k * 34, 720 - k * 68, 420 - k * 68, 60 - k * 8, width=4) for k in range(6)]
STRIP = [{"path": "M1100 420 H1800", "width": 9}, {"path": "M1100 470 H1800", "width": 4, "dashed": True}, {"path": "M1100 520 H1800", "width": 9}]

shot("s04", "inside", "diagram", "Inside, thin sheets, *rolled* up tight.",
     teaches="Inside are thin sheets wound tightly into a flat roll.",
     screen="Inside the opened pouch, a flattened roll drawn as nested rounded rectangles; from its right side a strip unrolls across the board as three long layers, top to bottom: a thick line (graphite), a dashed line (separator), a thick line (metal oxide), each labelled at its right end.",
     motion="The nested turns are drawn from outside in; then the strip is pulled out to the right in one long stroke for each layer, and the three labels are written.",
     carries="The three layers of the strip.", transition="The camera tracks right along the strip, which grows into a big slice of the cell.",
     sound="A quick spiral of squeaks; three long strokes.", check="Three layers in the order graphite, separator, metal oxide.", facts=["f2"],
     frames=[fr(0, "The pouch open; the roll inside.", rrect(300, 220, 800, 540, 26, width=7), ROLL),
             fr(0.5, "A strip unrolls to the right.", rrect(300, 220, 800, 540, 26, width=7), ROLL, STRIP, {"move": [1120, 360, 1760, 360], "text": "unrolled"}),
             fr(1, "The three layers labelled.", rrect(300, 220, 800, 540, 26, width=7), ROLL, STRIP, label(1640, 405, "graphite", 40), label(1640, 455, "separator", 36), label(1640, 575, "metal oxide", 40), {"cut": "follow the strip"})])

shot("s05", "inside", "compare", "*Graphite* on one side, *metal oxide* on the other,",
     teaches="The two sides of the sandwich: graphite on one side, a metal oxide on the other.",
     screen="The slice of the cell, large: the graphite block on the left drawn as stacked sheets, labelled 'graphite'; the oxide block on the right drawn as rows of small rings, labelled 'metal oxide' and, small, '(in phones: lithium cobalt oxide)'.",
     motion=f"{TRACK}; the graphite block is drawn sheet by sheet as 'graphite' is said, the oxide block ring by ring as 'metal oxide' is said.",
     carries="The two blocks.", transition="Continuous: the middle is filled.",
     sound="Short repeated strokes; a dotted tapping for the rings.", check="The two blocks are drawn differently enough to tell apart at a glance.", facts=["f1", "f2"],
     frames=[fr(0, "Arriving: the graphite block drawn sheet by sheet.", {"path": f"M{GX0} {TOP} H{GX1} V{BOT} H{GX0} Z", "width": 7}, [{"path": f"M{GX0 + 14} {430 + 55 * i} H{GX1 - 14}", "width": 4} for i in range(8)], label(320, 905, "graphite", 46), {"camera": "right"}),
             fr(0.5, "The oxide block drawn ring by ring.", cell_body(labels=False, small_note=False), label(320, 905, "graphite", 46)),
             fr(1, "Both labelled; '(in phones: lithium cobalt oxide)' small.", cell_body(labels=False, small_note=False), label(320, 905, "graphite", 46), label(1080, 905, "metal oxide", 46), label(1080, 370, "(in phones: lithium cobalt oxide)", 30), {"cut": "continuous"})])

shot("s06", "inside", "diagram", "a thin *separator* between,",
     teaches="Between them: a thin separator, soaked in electrolyte.",
     screen=CELL_SCREEN,
     motion="The dashed separator is drawn down the middle; the '~' marks of the electrolyte are dotted in; the labels are written.",
     carries="The whole cell.", transition="Continuous: the lithium ions are drawn in.",
     sound="A dashed squeak down the board.", check="The separator is clearly between the two blocks and labelled.", facts=["f2"],
     frames=[fr(0, "The two blocks; the separator starts down the middle.", cell_body(labels=False, small_note=False), {"move": [SEP + 40, TOP - 20, SEP + 40, BOT], "text": "separator"}),
             fr(1, "The cell complete with its labels.", cell_body(), {"cut": "continuous"})])

shot("s07", "inside", "wide", "and *lithium* moving across.",
     teaches="The thing that moves: lithium, which can sit on either side and travel between them.",
     screen="The whole cell, pulled back a little; six blue lithium ions (a ring with a plus) sitting between the oxide rows on the right; a blue double arrow across the middle, 'lithium'; the external wire drawn over the top from the graphite to the oxide, with a gap in the middle where something will plug in.",
     motion="The six ions are drawn in, the double arrow, then the wire in two strokes.",
     carries="The cell with its six ions and the wire.", transition="Continuous: a charger is drawn into the gap.",
     sound="Six light taps for the ions.", check="Six ions, no more; the wire leaves a gap at the top middle.", facts=["f3"],
     frames=[fr(0, "The cell; the ions drawn in on the oxide side.", cell_body(), ions("o"), {"camera": "pull"}),
             fr(0.5, "A blue double arrow across the middle: 'lithium'.", cell_body(), ions("o"), {"arrow": [880, 300, 520, 300], "colour": KEY}, {"arrow": [520, 330, 880, 330], "colour": KEY}, label(700, 280, "lithium", 40, colour=KEY)),
             fr(1, "The wire over the top, a gap in the middle.", cell_body(), ions("o"), WIRE, {"cut": "continuous"})])

shot("s08", "charge", "diagram", "Charging pushes *electrons* into the graphite,",
     teaches="Charging: the charger pushes electrons round the outside wire into the graphite.",
     screen="The cell with a wall charger drawn in the gap of the wire (a box with two prongs, 'charger'); small black dots (electrons, the first tagged 'electron') travelling along the wire from the oxide side, through the charger, down into the graphite; a black arrow on the wire shows the direction.",
     motion="The charger is drawn; the electrons slide along the wire (one of the few things that move without being drawn) from right to left, piling into the graphite.",
     carries="The charger and the electrons in the graphite.", transition="Continuous: the ions follow inside.",
     sound="A plug-in click; a light ticking as the dots run.", check="Electrons go oxide side → charger → graphite, never through the middle.", facts=["f4"],
     frames=[fr(0, "The charger drawn in the gap.", cell_body(), ions("o"), WIRE, charger()),
             fr(0.5, "Electrons run along the wire toward the graphite.", cell_body(), ions("o"), WIRE, charger(), electrons(E_CHARGE[:4]), {"arrow": [1000, 170, 860, 170]}),
             fr(1, "They reach the graphite.", cell_body(), ions("o"), WIRE, charger(), electrons(E_CHARGE), {"arrow": [460, 170, 360, 170]}, {"cut": "continuous"})])

MID = [(560, 470), (760, 560), (620, 650), (780, 740), (560, 800), (820, 470)]

shot("s09", "charge", "wide", "and lithium ions *cross* over",
     teaches="At the same time the lithium ions leave the oxide and cross the electrolyte and the separator.",
     screen="The whole cell with the charger in the wire and the electrons piled in the graphite: the six blue ions slide out of the oxide, through the electrolyte and the dashed separator, toward the graphite; a blue arrow over the middle shows the way.",
     motion="The ions slide one after another (elements that slide to show a change), right to left, in step with the electrons arriving on the wire.",
     carries="Ions on the way to the graphite.", transition="The camera pushes in on the graphite.",
     sound="Soft slides as the ions cross.", check="The ions cross through the separator, the electrons stay on the wire.", facts=["f3", "f4"],
     frames=[fr(0, "The ions start to leave the oxide.", cell_body(), WIRE, charger(), electrons(E_CHARGE), ions(O_SLOTS[:3] + MID[3:]), {"move": [920, 560, 720, 560], "text": "crossing"}),
             fr(1, "Half way: crossing the separator.", cell_body(), WIRE, charger(), electrons(E_CHARGE), ions(MID), {"arrow": [700, 300, 500, 300], "colour": KEY}, {"cut": "push in on the graphite"})])

ZOOM_SHEETS = [{"path": f"M120 {y} H1000", "width": 7} for y in (260, 370, 480, 590, 700, 810)] + [{"line": [1000, 200, 1000, 870], "width": 7}, {"line": [1500, 180, 1500, 880], "dashed": True, "width": 6}, label(560, 200, "graphite", 54), label(1500, 150, "separator", 46)]

shot("s09b", "charge", "diagram", "and *slip* between its layers.",
     teaches="The ions slip in between the graphite's sheets and stay there.",
     screen="Pushed in on the graphite: its sheets drawn as long parallel lines (110 px apart) ending at the block's edge, the separator dashed on the right; blue ions arrive from the right and slide into the gaps between the sheets.",
     motion="The camera pushes in; three ions slide in from the right and each settles in a gap between two sheets with a small click.",
     carries="Ions lodged between the sheets.", transition="Continuous: a second close-up is drawn beside it.",
     sound="Three small clicks as the ions settle.", check="Each ion sits between two sheets, not on them.", facts=["f3"],
     frames=[fr(0, "Pushed in on the graphite; ions arriving from the right.", ZOOM_SHEETS, li(1250, 425, 34), li(1680, 535, 34), li(1180, 645, 34), {"move": [1220, 330, 820, 330], "text": "slips in"}, {"camera": "push"}),
             fr(0.5, "The first ion slides between two sheets.", ZOOM_SHEETS, li(560, 425, 34), li(1300, 535, 34), li(1180, 645, 34)),
             fr(1, "All three lodged between the sheets.", ZOOM_SHEETS, li(560, 425, 34), li(380, 535, 34), li(760, 645, 34), {"cut": "continuous"})])

shot("s10", "charge", "compare", "Here's the catch: lithium *doesn't like* it there.",
     teaches="In the graphite the lithium is only loosely held; in the oxide it is held tightly.",
     screen="Two close-ups side by side: left, an ion between two graphite sheets with room round it and small wobble marks, 'loose: doesn't like it here'; right, an ion wedged between rings of the oxide with short bond strokes to them, 'held tight: at home'.",
     motion="From the graphite close-up the view narrows to one ion between two sheets in the left half; the oxide close-up is drawn on the right; the wobble marks on the left boil, the right ion stays still.",
     carries="The idea: graphite is the uncomfortable place.", transition="The close-ups are wiped; the camera pulls back and a hill is drawn beside the cell.",
     sound="A small nervous wobble sound on the left ion.", check="The two places read as loose and tight without the words.", facts=["f5"],
     frames=[fr(0, "One ion between two graphite sheets, now in the left half.", close_bonds(0), {"camera": "left"}),
             fr(0.5, "Loose on the left; the snug oxide drawn on the right.", close_bonds(1)),
             fr(1, "Both labelled: 'doesn't like it here', 'at home'.", close_bonds(1), {"cut": "wipe, a hill"})])

shot("s11", "energy", "chart", "It's a ball pushed up a *hill*:",
     teaches="An analogy: putting lithium into the graphite is like pushing a ball up a hill.",
     screen="Back to the whole cell (charger, six ions in the graphite) and, in the right third of the board, a hill drawn as one marker line: high and flat on the left, labelled 'in graphite', curving down to 'in metal oxide' at the right; a blue ion as the ball, pushed up the slope to the top.",
     motion="The camera pulls back; the hill is drawn in one stroke; the ball slides up the slope with a dashed blue arrow 'pushed up' and stops on the top.",
     carries="The hill with the ball on top.", transition="Continuous: the height is marked.",
     sound="A rising squeak as the ball goes up.", check="The hill's high side is the graphite side (left), the same side as in the cell.", facts=["f5"],
     frames=[fr(0, "Pulled back: the charged cell; the hill drawn.", cell_body(), WIRE, charger(), ions("g"), hill(1.0), {"camera": "pull"}),
             fr(0.5, "The ball pushed up the slope.", cell_body(), WIRE, charger(), ions("g"), hill(0.5, "up")),
             fr(1, "The ball resting on the top of the hill.", cell_body(), WIRE, charger(), ions("g"), hill(0.0), {"cut": "continuous"})])

shot("s12", "energy", "chart", "the energy is in its *position*.",
     teaches="The stored energy is the lithium's position: up in the graphite.",
     screen="The same board: a dashed ground line under the hill and, at its left, a measure from the ground up to the top where the ball sits, labelled 'stored energy' in blue; in the cell the six ions in the graphite get a blue bracket: they are the ball at the top.",
     motion="The measure is drawn up beside the slope and written; then the bracket in the cell.",
     carries="Ball on top, ions in the graphite.", transition="The charger is wiped; a phone is drawn into the gap.",
     sound="A tap for the measure.", check="The measure runs from the bottom of the hill to the ball, not past it.", facts=["f5", "f7"],
     frames=[fr(0, "The ball on top; the measure starts.", cell_body(), WIRE, charger(), ions("g"), hill(0.0), {"path": "M1290 830 H1820", "width": 3, "dashed": True}, {"path": "M1300 830 V430", "colour": KEY, "width": 5}),
             fr(1, "'stored energy'; the ions bracketed.", cell_body(), WIRE, charger(), ions("g"), hill(0.0), {"path": "M1290 830 H1820", "width": 3, "dashed": True}, {"path": "M1300 830 V430 M1285 830 H1315 M1285 430 H1315", "colour": KEY, "width": 5}, label(1480, 680, "stored", 44, colour=KEY), label(1480, 730, "energy", 44, colour=KEY), {"path": "M150 440 Q130 600 150 760", "colour": KEY, "width": 6}, {"cut": "wipe the charger, draw the phone"})])

# The way home, in steps: (graphite slots still full, ions in the electrolyte, oxide slots filled)
def going_home(n_oxide, in_transit):
    """n_oxide ions already home in the oxide, in_transit crossing, the rest still in the graphite."""
    transit = [(560, 470), (780, 640), (620, 760)][:in_transit]
    return O_SLOTS[:n_oxide] + transit + G_SLOTS[n_oxide + in_transit:]


assert all(len(going_home(a, b)) == N_LI for a, b in [(0, 2), (2, 2), (4, 1), (5, 1), (6, 0)])

shot("s13", "use", "diagram", "Now use your phone, and the lithium heads *home*.",
     teaches="Using the phone: the lithium heads home, back down to the oxide ('home' answers 'doesn't like it there').",
     screen="The charger is wiped out of the gap and a small phone is drawn there instead, 'phone'; in the cell the first ions leave the graphite toward the oxide; on the hill the ball starts to roll down.",
     motion="A quick wipe takes the charger; the phone is drawn in its place; two ions slide right through the electrolyte; the ball rolls a little way down with a dashed arrow 'rolls down'.",
     carries="The phone in the circuit, ions on the move.", transition="The camera pushes in on the separator.",
     sound="A quick wipe; a soft roll for the ball.", check="The ions move right (toward the oxide), the opposite of s09.", facts=["f3", "f5"],
     frames=[fr(0, "The charger wiped; the phone drawn in the gap.", cell_body(), WIRE, phone_small(), ions("g"), hill(0.0)),
             fr(0.5, "Ions start back toward the oxide.", cell_body(), WIRE, phone_small(), ions(going_home(0, 2)), {"move": [520, 340, 900, 340], "text": "home"}, hill(0.25, "down")),
             fr(1, "The ball rolling; ions crossing.", cell_body(), WIRE, phone_small(), ions(going_home(0, 2)), hill(0.35), {"cut": "push in on the separator"})])

shot("s14", "use", "compare", "Ions cross the separator. Electrons *can't*.",
     teaches="The separator lets the ions through but not the electrons: the electron is stopped at the same kind of opening the ion used, so it is not a matter of size (the electrolyte and the separator carry ions, never electrons).",
     screen="Close on the separator, drawn as a thick wall with gaps (pores): a blue ion passes through a pore to the right, 'through a pore'; a black electron dot runs at the wall and is stopped, a red cross on it and a red arrow turning it back, 'electrons can't pass' in red.",
     motion="The camera pushes in; the ion slides through the pore; the electron bumps the wall, the red cross is drawn and it is turned back.",
     carries="The turned-back electron.", transition="The camera pulls back to the whole circuit.",
     sound="A soft pass for the ion; a dull bump and a short red-marker squeak for the electron.", check="Red is used only for the blocked electron.", facts=["f6"],
     frames=[fr(0, "Close on the separator; an ion and an electron on the graphite side.", close_separator(0), {"camera": "push"}),
             fr(0.5, "The ion passes through a pore; the electron is stopped.", close_separator(1)),
             fr(1, "The electron turned back: 'electrons can't pass'.", close_separator(2), {"cut": "pull back to the circuit"})])

shot("s15", "use", "diagram", "So they go the *long way* round, through your phone.",
     teaches="So the electrons take the long way round: out of the graphite, along the wire, through the phone, into the oxide.",
     screen="The whole circuit again: electrons running from the graphite up the wire, through the phone, and down into the oxide, with black arrows on the wire; inside, the ions keep crossing to the oxide.",
     motion="The camera pulls back; the electron dots run round the wire left to right while the ions cross inside, in step.",
     carries="The flow round the circuit.", transition="Continuous: the phone's screen lights.",
     sound="A light run of ticks along the wire.", check="Electrons and ions both end up on the oxide side, by two different paths.", facts=["f6"],
     frames=[fr(0, "Pulled back: the circuit with the phone.", cell_body(), WIRE, phone_small(), ions(going_home(0, 2)), hill(0.35), {"camera": "pull"}),
             fr(0.5, "Electrons leave the graphite up the wire.", cell_body(), WIRE, phone_small(), ions(going_home(1, 2)), electrons(E_USE[:3]), {"arrow": [360, 170, 520, 170]}, hill(0.5)),
             fr(1, "Through the phone and down into the oxide.", cell_body(), WIRE, phone_small(), ions(going_home(2, 2)), electrons(E_USE), {"arrow": [880, 170, 1020, 170]}, hill(0.6), {"cut": "continuous"})])

shot("s16", "use", "wide", "That flow is the *current* that runs your phone.",
     teaches="That flow of electrons through the phone is the electric current that runs it.",
     screen="The same circuit: the phone's screen lights (three blue rays above it), a blue label 'current' along the wire; electrons all along the wire.",
     motion="The rays are drawn on 'current'; the label is written along the wire; the dots keep running.",
     carries="The lit phone, the current.", transition="Continuous: the last ions arrive in the oxide.",
     sound="A small bright chime as the screen lights.", check="The label sits on the wire it names.", facts=["f6"],
     frames=[fr(0, "The flow round the wire.", cell_body(), WIRE, phone_small(), ions(going_home(2, 2)), electrons(E_USE), hill(0.6)),
             fr(0.5, "The phone's screen lights up with blue rays.", cell_body(), WIRE, phone_small(lit=True), ions(going_home(3, 2)), electrons(E_USE), hill(0.7)),
             fr(1, "'current' along the wire.", cell_body(), WIRE, phone_small(lit=True), ions(going_home(4, 1)), electrons(E_USE), label(470, 160, "current", 44, colour=KEY), hill(0.75), {"cut": "continuous"})])

shot("s17", "use", "diagram", "Once it's all home, the battery's *empty*.",
     teaches="When the lithium is back in the oxide, the battery is empty.",
     screen="All six ions back between the oxide rows (as in s07); the ball at the bottom of the hill; the phone's screen dark with a small empty battery icon, '0%'.",
     motion="The last ions slide home; the ball rolls to the bottom; the rays are wiped and the empty icon drawn.",
     carries="The empty cell: the same six ions, on the other side.", transition="The camera tracks right to a clean stretch for the summary.",
     sound="A soft settle; the bed dips.", check="Six ions in the oxide; none lost.", facts=["f3", "f8"],
     frames=[fr(0, "The last ions sliding home.", cell_body(), WIRE, phone_small(lit=True), ions(going_home(5, 1)), electrons(E_USE[3:]), hill(0.85)),
             fr(0.5, "All six in the oxide; the ball at the bottom.", cell_body(), WIRE, phone_small(), ions("o"), hill(1.0)),
             fr(1, "The phone's empty icon: '0%'.", cell_body(), WIRE, phone_small(), ions("o"), hill(1.0), label(700, 205, "0%", 40), rrect(675, 225, 50, 24, 5, width=3), {"cut": "track to the summary"})])

shot("s18", "answer", "recap", "Charging doesn't add electricity. It pushes lithium back *up the hill*.",
     teaches="The answer in one frame: charging lifts the lithium back up; using the phone lets it roll down while the electrons run through the phone; nothing is added or used up.",
     screen="A clean stretch: a heading 'charging = pushing lithium up the hill' across the top; under it three small drawings in a row: a hill with a ball pushed up and a plug, 'charging: lithium goes up'; a hill with the ball rolling down and an electron arrow into a phone, 'in use: lithium goes down'; two batteries with three ions each, on opposite sides, and a blue '=', 'same stuff, just moved'.",
     motion=f"{TRACK}; the heading is written; the three drawings are drawn left to right as the line is said.",
     carries="The summary, which the camera passes on its way back.", transition="The camera tracks back left along the whole board.",
     sound="Quick marker strokes; three taps.", check="Readable as a summary with the sound off.", facts=["f4", "f5", "f6", "f7"],
     frames=[fr(0, "The heading and the first drawing: charging.", recap(0), {"camera": "right"}),
             fr(0.5, "The second: using the phone.", recap(1)),
             fr(1, "The third: the same contents, '='.", recap(2), {"cut": "track back to the start"})])

shot("s19", "answer", "wide", "That's why", length=1.3,
     teaches="The bridge: the last words run into the first line, the picture into frame 0.",
     screen="The camera tracks back left past the cell, the roll and the question, and settles on section A: the two phones, full and empty, and the '=': the same picture as frame 0.",
     motion="A fast track left along the board (about 1.1 s, eased), settling exactly on the framing of frame 0 a moment before the cut.",
     carries="Into s01.", transition="No cut: the film loops straight into s01.",
     sound="The bed runs on into the opening.", check="The last frame matches frame 0 (check.mjs SSIM).",
     frames=[fr(0, "Tracking back left along the board.", recap(2), {"camera": "left"}),
             fr(1, "The two phones, a moment before frame 0.", board_a(), {"cut": "loop to s01"})])

duration = shots[-1]["end"]

storyboard = {
    "title": "Where does a phone battery keep its energy?",
    "question": "A full phone battery and an empty one hold the same stuff, so where is the energy?",
    "audience": "Curious teenagers and adults anywhere who charge a phone every day, often watching with the sound off at first. Many picture a battery as a tank that gets filled with electricity; they know the words 'ion' and 'electron' from school but have never seen what moves inside a battery.",
    "promise": "A phone battery isn't filled with electricity: charging pushes lithium into the graphite, where it is loosely held (like a ball pushed up a hill), and in use the lithium goes back to the metal oxide while its electrons are forced the long way round, through the phone; that flow is the current.",
    "template": "whiteboard",
    "standard": 3,
    "language": "en",
    "format": "1920x1080",
    "subtitles": True,
    "duration": round(duration, 3),
    "fps": 60,
    "loop": {"line": "That's why / a full phone battery and an empty one hold exactly the same stuff.",
             "picture": "The last shot tracks back along the board to section A, which has not been touched since frame 0, and settles on frame 0's framing: the two phones and the '='."},
    "voice": {"voice_id": "xd8j2LFPw16XKmJ5qeBK", "name": "Courtney", "model": "eleven_v4", "language": "en", "direction": "[warmly]"},
    "look": {
        "accent": "#2f80ed",
        "accent2": "#eb5757",
        "mood": "The Whiteboard template: one long clean white board (#fbfbf8) with a faint shine and a few ghost marks, flat bright light with a slight vignette, clean, no grain and no glow. Black marker (#1e1e1e) for most lines, even weight with rounded ends and a dry edge, drawn on stroke by stroke at writing speed (ink.js drawOn and write under url(#marker)); blue (#2f80ed) only for the key idea: the lithium ions and the key words; red (#eb5757) only for the warning: the electron the separator turns back. No large colour fills. Hand lettering in Patrick Hand, written on as said. Captions: every spoken line hand-lettered near the bottom as it is said (subtitles), its *key* word in blue; the question in s02 is already lettered on the board, so that shot has no caption. The camera tracks along the one board from drawing to drawing (stage.camx); a drawing is erased with a quick wipe. Nothing moves except by being drawn, apart from the elements that slide to show the change: the ions, the electrons on the wire and the ball on the hill.",
    },
    "music": {
        "track": "Composed for this film (ElevenLabs Music, music/bed.mp3)",
        "bpm": 104,
        "note": "A light, upbeat bed composed to the take's length: ukulele and pizzicato with a soft glockenspiel and finger snaps, no lead melody, low under the voice; it drops to a thin pulse under the hill (s11, s12) so the analogy lands, picks up as the phone lights (s16) and dips on 'empty' (s17); its tail runs on over the opening so the loop is seamless. Effects per shot, from the template's Sound line: marker squeaks for every stroke and word written (all shots), a tap on the '=' (s01) and the '?' (s02), a plug-in click (s08), light ticks as electrons run along the wire (s08, s15, s16), soft slides and clicks as ions settle (s09, s09b, s13, s17), a rising squeak as the ball is pushed up (s11), a quick wipe of the eraser (s10, s13), a dull bump for the blocked electron (s14), a small chime as the screen lights (s16), and the air of the board tracking by under s19. The cuts follow the take.",
    },
    "facts": [
        {"id": "f1", "claim": "Phones run on lithium-ion batteries; the usual phone chemistry is lithium cobalt oxide (LiCoO₂) at the positive side and graphite at the negative side. The film calls the positive side 'metal oxide' and writes '(in phones: lithium cobalt oxide)' small.",
         "source": "Battery University (Cadex Electronics), BU-205 'Types of Lithium-ion' (batteryuniversity.com/article/bu-205-types-of-lithium-ion): 'Its high specific energy makes Li-cobalt the popular choice for mobile phones, laptops and digital cameras. The battery consists of a cobalt oxide cathode and a graphite carbon anode.' UL Research Institutes, 'What Are Lithium-Ion Batteries?' (ul.org/library/what-lithium-ion-battery-factsheet): li-ion powers 'our mobile phones'."},
        {"id": "f2", "claim": "Inside the cell: a negative electrode of graphite (coated on copper foil), a positive electrode of metal oxide (coated on aluminium foil), a porous polymer separator between them, and an electrolyte (a lithium salt in an organic solvent). In a phone the cell is flat: the sheets are wound and flattened into a roll (or stacked) inside a sealed pouch. Simplification: the film draws one sandwich of three layers and leaves out the foils and the double-sided coating.",
         "source": "Battery University BU-204 'How do Lithium Batteries Work?' (batteryuniversity.com/article/bu-204-how-do-lithium-batteries-work): 'a metal oxide positive electrode (cathode) that is coated onto an aluminum current collector, a negative electrode (anode) made from carbon/graphite coated on a copper current collector, a separator and electrolyte made of lithium salt in an organic solvent'; BU-301a 'Types of Battery Cells': prismatic cells 'wound and flattened into a pseudo-prismatic jelly roll ... predominantly found in mobile phones'; the pouch cell; BU-306 'What is the Function of the Separator?' (a polyolefin film, commonly about 10 to 25 µm thick)."},
        {"id": "f3", "claim": "Lithium ions shuttle between the two electrodes: on charge from the oxide to the graphite, on discharge back again; in the graphite they sit between its layers (intercalation: about one lithium for six carbon atoms); the electrodes are not used up as they are in most other batteries (a little lithium is lost over hundreds of cycles, f7). The film's six ions are a stand-in for billions.",
         "source": "Battery University BU-204: 'During discharge, the ions flow from the anode to the cathode through the electrolyte and separator; charge reverses the direction' and 'It takes six carbon (graphite) atoms to bind to a single lithium ion'; The Nobel Prize in Chemistry 2019, popular information (nobelprize.org/prizes/chemistry/2019/popular-information/): 'the lithium ions flow back and forth between the electrodes', 'intercalated in the molecular layers in graphite'."},
        {"id": "f4", "claim": "Charging is driven from outside: the charger's voltage supplies electrons to the graphite through the external wire while the lithium ions move through the electrolyte into the graphite. It does not happen by itself (non-spontaneous).",
         "source": "LG Energy Solution, Battery Inside, 'How Lithium-ion Batteries Work: An Electrochemical Explanation' (inside.lgensol.com, 2026): 'During charging ... electrons are supplied to the anode through an external power source, while lithium ions move through the electrolyte and are reinserted into the anode ... charging is a non-spontaneous electrochemical process driven by an externally applied voltage.' Nobel 2019 popular information: 'When he charged the petroleum coke with electrons, the lithium ions were drawn into the material.'"},
        {"id": "f5", "claim": "Where the energy is: lithium in the graphite is loosely bound; in the oxide it is bonded much more strongly, so its move back to the oxide is energetically downhill and releases energy, and only a high enough charging voltage can drive it back up. The film's hill is an analogy (gravity stands in for chemical bonding), not a measured energy diagram.",
         "source": "S. H. Finkelstein, M. Ricci, T. Bötticher, K. Schmidt-Rohr, 'How lithium-ion batteries work conceptually: thermodynamics of Li bonding in idealized electrodes', Physical Chemistry Chemical Physics, 2024, doi:10.1039/d4cp00818a (abstract via Europe PMC): 'compared to loosely-bound lithium in the negative electrode (anode), lithium in the ionic positive electrode is more strongly bonded, moves there in an energetically downhill irreversible process ... Only a sufficiently high charging voltage can drive it back.' LG Energy Solution (as f4): 'Because discharge proceeds toward a lower-energy state, it occurs spontaneously.' Nobel 2019: the ions flow 'towards the cobalt oxide in the cathode, which has a much higher potential'."},
        {"id": "f6", "claim": "The separator lets lithium ions through its pores but does not conduct electrons, and the electrolyte in its pores carries ions but not electrons, so on discharge the electrons must travel through the outside circuit (the phone) to reach the oxide; that flow of electrons is the electric current that powers the device. (The film stops its electron at a pore like the one the ion used, so the block reads as 'not a conductor', not as 'too big'.)",
         "source": "Battery University BU-306: 'Although ions pass freely between the electrodes, the separator is an isolator with no electrical conductivity.' LG Energy Solution (as f4): 'the separator blocks the internal movement of electrons, ensuring that current flows through the external circuit'; LG Energy Solution, 'Lithium-Ion Battery's Structure and How It Works' (inside.lgensol.com, 2022): the electrolyte must 'prevent the electrons from entering the electrolyte and make them only move along the external conducting wire'. UL Research Institutes: 'Electrons move in the opposite direction in the external circuit. This migration is the reason the battery powers the device.'"},
        {"id": "f7", "claim": "A battery does not store electricity (or extra electrons): it turns electrical energy into chemical energy and back. A full and an empty phone battery hold the same materials and the same lithium; only where the lithium sits differs. Simplifications, kept off screen: over hundreds of cycles a little lithium is lost to side reactions; and the stored energy has a mass equivalent (E = mc²), which for an example 5 000 mAh × 3.87 V cell is 19.35 Wh = 69 660 J, / (3.0 × 10⁸ m/s)² ≈ 7.7 × 10⁻¹³ kg, less than a nanogram, far below anything a scale could detect.",
         "source": "LG Energy Solution (as f4), Key Q&A: 'A battery does not store electricity itself. Instead, it is an electrochemical system that converts electrical energy into chemical energy for storage, then converts it back into electrical energy when needed.' Nobel 2019 popular information (ions flow back and forth without reacting with their surroundings). The mass arithmetic is ours (the cell is an example, not a claim in the film)."},
        {"id": "f8", "claim": "'Empty' is when the lithium has moved back to the oxide. Simplification: a phone stops at a cut-off voltage (Battery University gives a usable range of about 3.70 to 2.80 V per cell) before every last lithium has left the graphite, and some lithium is never moved; the film says 'once it's all home' and draws all six back.",
         "source": "Battery University BU-204: 'the flat discharge curve offers effective utilization of the stored energy in a desirable and flat voltage spectrum of 3.70–2.80V/cell'; the direction of the ions on discharge as f3."},
    ],
    "acts": [
        {"id": "hook", "title": "The question", "goal": "Full and empty hold the same things: so where is the energy?", "rail": False},
        {"id": "inside", "title": "Inside", "goal": "Open the phone's battery: graphite, separator and electrolyte, metal oxide, and the lithium that moves.", "rail": False},
        {"id": "charge", "title": "Charging", "goal": "Charging pushes electrons round and lithium into the graphite, where it is not comfortable.", "rail": False},
        {"id": "energy", "title": "The hill", "goal": "The ball pushed up a hill: the energy is in the lithium's position.", "rail": False},
        {"id": "use", "title": "In use", "goal": "Lithium goes back; the electrons can only go round through the phone: that is the current.", "rail": False},
        {"id": "answer", "title": "The answer", "goal": "Charging lifts lithium back up; nothing is filled; then the bridge into the first line.", "rail": False},
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
