"""Writes storyboard.json for "How do noise-cancelling headphones erase sound?" (portrait 1080 x 1920, English).

The remake as a 3D teardown film. The take (voice/) and the 198-word script are kept exactly; this script writes the
plan, and the take sets the times:

    python3 examples/noise-cancelling/storyboard.build.py && node kit/audio/voice.mjs examples/noise-cancelling --retime \
      && node kit/tools/storyboard.mjs examples/noise-cancelling --png

Colour means one thing all film: amber is the noise, cyan (the accent) is the flipped wave the driver plays, white is
what reaches the eardrum. The two heroes are built in models.js at 1 unit = 1 mm: an over-ear ANC headphone and the
side of a head with its ear, canal and eardrum. Sound is light in that scene (light.js).

The numbers the film draws, computed here and in film.js from the facts:
  wavelength = 343 m/s / frequency: 100 Hz -> 3.43 m, 5,000 Hz -> 6.86 cm (f4)
  left over when the flipped copy is late by d: 2 sin(pi f d). d = 1/30,000 s: 100 Hz -> 2.1 %, 5,000 Hz -> 100 % (f6)
  both charts show the same 10 ms of time: 1 cycle of the hum, 50 of the squeak (f6)
"""
import json
import math
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
W, H = 1080, 1920
shots = []

C = 343.0
DELAY = 1 / 30000
LEFT_LOW = 2 * math.sin(math.pi * 100 * DELAY)  # 0.0209
LEFT_HIGH = 2 * math.sin(math.pi * 5000 * DELAY)  # 1.000

OLD = {s["id"]: s for s in json.loads((HERE / "storyboard.json").read_text())["shots"]}


def shot(id, act, type, **fields):
    o = OLD[id]
    out = {"id": id, "act": act, "type": type, "start": o["start"], "end": o["end"]}
    if "voice" in o:
        out["voice"] = o["voice"]  # the performed words, never changed
    if "hold" in o:
        out["hold"] = o["hold"]
    out.update(fields)
    out["frames"] = FRAMES[id]
    shots.append(out)


def fr(at, note, *draw):
    return {"at": at, "note": note, "draw": list(draw)}


def label(x, y, text, size=36, **more):
    return {"label": [x, y], "text": text, "size": size, **more}


def chip(x, y, text):
    return {"chip": [x, y], "text": text}


def wave(x0, x1, y, amp, length, colour="orange", phase=0):
    return {"wave": [x0, x1, y, amp, length], "colour": colour, "phase": phase}


def ell(cx, cy, a, b, **k):
    return {"path": f"M{cx - a} {cy} a{a} {b} 0 1 0 {2 * a} 0 a{a} {b} 0 1 0 {-2 * a} 0", "colour": k.get("colour", "ink"), **({"fill": k["fill"]} if "fill" in k else {}), "width": k.get("width", 6)}


def phones(cx, cy, s=1.0):
    """The headphone seen three-quarter: the band's arc, two oval cups with their cushions."""
    return [
        {"path": f"M{cx - 250 * s} {cy + 40 * s} Q{cx - 40 * s} {cy - 420 * s} {cx + 250 * s} {cy - 10 * s}", "colour": "ink", "width": 22},
        ell(cx - 250 * s, cy + 170 * s, 78 * s, 112 * s, fill="ink"),
        ell(cx - 225 * s, cy + 170 * s, 52 * s, 86 * s, colour="ink", width=5),
        ell(cx + 250 * s, cy + 130 * s, 70 * s, 104 * s, fill="ink"),
        {"dot": [cx + 222 * s, cy + 60 * s, 10 * s], "colour": "white"},
    ]


def ear(cx, cy, s=1.0):
    """A right ear from the side: the helix's C, the antihelix, the concha's bowl, the tragus and the lobe."""
    return [
        {"path": f"M{cx - 50 * s} {cy - 70 * s} C{cx - 20 * s} {cy - 190 * s} {cx + 150 * s} {cy - 170 * s} {cx + 150 * s} {cy - 20 * s} C{cx + 150 * s} {cy + 80 * s} {cx + 90 * s} {cy + 110 * s} {cx + 70 * s} {cy + 170 * s} C{cx + 50 * s} {cy + 220 * s} {cx - 20 * s} {cy + 220 * s} {cx - 25 * s} {cy + 160 * s}", "colour": "ink", "fill": "orange", "width": 7},
        {"path": f"M{cx + 30 * s} {cy + 100 * s} C{cx + 100 * s} {cy + 40 * s} {cx + 110 * s} {cy - 50 * s} {cx + 60 * s} {cy - 100 * s} M{cx + 85 * s} {cy - 70 * s} L{cx + 10 * s} {cy - 90 * s}", "colour": "ink", "width": 5},
        ell(cx + 15 * s, cy + 15 * s, 34 * s, 44 * s, colour="ink", width=5),
        {"path": f"M{cx - 45 * s} {cy - 5 * s} q-20 25 0 50", "colour": "ink", "width": 6},
    ]


def head_side(cx, cy, s=1.0):
    """The side of a head: the skull's curve, the hairline, the jaw and the neck going down."""
    return [
        {"path": f"M{cx - 320 * s} {cy + 520 * s} C{cx - 330 * s} {cy + 200 * s} {cx - 360 * s} {cy - 380 * s} {cx + 40 * s} {cy - 420 * s} C{cx + 330 * s} {cy - 430 * s} {cx + 420 * s} {cy - 140 * s} {cx + 400 * s} {cy + 80 * s} C{cx + 380 * s} {cy + 260 * s} {cx + 300 * s} {cy + 330 * s} {cx + 260 * s} {cy + 560 * s}", "colour": "ink", "fill": "orange", "width": 7},
        {"path": f"M{cx - 330 * s} {cy - 40 * s} C{cx - 250 * s} {cy - 220 * s} {cx - 40 * s} {cy - 170 * s} {cx + 120 * s} {cy - 240 * s} C{cx + 260 * s} {cy - 260 * s} {cx + 360 * s} {cy - 200 * s} {cx + 390 * s} {cy - 120 * s}", "colour": "ink", "width": 9, "dashed": True},
    ]


def cut_view(cx, cy, s=1.0, cyan=False, white=False, amber=True):
    """The cutaway from above, canal running up the frame: the head's section above, the ear cup's section below,
    cushions left and right against the bust, the driver, the canal going up to the eardrum."""
    d = [
        {"path": f"M0 {cy - 40 * s} L{W} {cy - 40 * s} L{W} 0 L0 0 Z", "colour": "ink", "fill": "red", "width": 4},
        {"path": f"M{cx - 22 * s} {cy - 40 * s} L{cx - 18 * s} {cy - 330 * s} L{cx + 18 * s} {cy - 330 * s} L{cx + 22 * s} {cy - 40 * s}", "colour": "ink", "width": 6},
        {"line": [cx - 46 * s, cy - 350 * s, cx + 40 * s, cy - 320 * s], "width": 10},
        {"path": f"M{cx - 300 * s} {cy - 40 * s} L{cx - 300 * s} {cy + 120 * s} Q{cx - 300 * s} {cy + 380 * s} {cx} {cy + 380 * s} Q{cx + 300 * s} {cy + 380 * s} {cx + 300 * s} {cy + 120 * s} L{cx + 300 * s} {cy - 40 * s}", "colour": "ink", "width": 10},
        ell(cx - 255 * s, cy + 15 * s, 45 * s, 55 * s, fill="ink"),
        ell(cx + 255 * s, cy + 15 * s, 45 * s, 55 * s, fill="ink"),
        {"path": f"M{cx - 120 * s} {cy + 150 * s} L{cx + 120 * s} {cy + 150 * s} L{cx + 70 * s} {cy + 230 * s} L{cx - 70 * s} {cy + 230 * s} Z", "colour": "ink", "fill": "ink"},
    ]
    if amber:
        d.append({"path": f"M{cx - 420 * s} {cy + 520 * s} Q{cx - 340 * s} {cy + 80 * s} {cx - 200 * s} {cy - 10 * s} Q{cx - 60 * s} {cy - 60 * s} {cx} {cy - 120 * s}", "colour": "orange", "width": 8})
    if cyan:
        d.append({"path": f"M{cx} {cy + 140 * s} Q{cx + 40 * s} {cy + 40 * s} {cx} {cy - 120 * s}", "colour": "blue", "width": 8})
    if white:
        d.append({"line": [cx, cy - 120 * s, cx, cy - 320 * s], "colour": "ink", "width": 6})
    return d


TOP = 260  # the first line a reader can rely on, under the app's header

FRAMES = {
    "s01": [
        fr(0.0, "Frame 0 is finished: the headphone stands on a walnut desk in a dim room, three-quarter view, large in the middle of the frame; amber pressure bands and a glowing amber wave already roll in from the upper left through the air round it. The question's first line is in metal type at the top.",
           *phones(560, 1000, 1.25), {"move": [80, 700, 380, 860], "text": "noise rolls in"}, wave(60, 1020, 1350, 40, 180), {"title": [540, TOP + 70], "text": "How do noise-cancelling", "size": 84}, {"camera": "orbit"}),
        fr(0.5, "Each line of the question lands as it is said; the camera orbits a little and pushes in. Amber light catches the cups' rims as the bands pass.",
           *phones(560, 1010, 1.3), wave(60, 1020, 1350, 40, 180), {"title": [540, TOP + 70], "text": "How do noise-cancelling\nheadphones make\na noise disappear?", "size": 84, "accent": "disappear?"}, {"camera": "push"}),
        fr(1.0, "The question holds; a sheen crosses 'disappear?'. The camera keeps orbiting round toward the inside of the right cup.",
           *phones(540, 1020, 1.35), {"title": [540, TOP + 70], "text": "How do noise-cancelling\nheadphones make\na noise disappear?", "size": 84, "accent": "disappear?"}, {"cut": "no cut: the orbit carries on to the cup's inside"}),
    ],
    "s02": [
        fr(0.0, "The orbit carries on round the right cup to its inside: the leather cushion's ring and the fabric cover fill the middle; amber bands pass round it.",
           ell(560, 880, 260, 360, fill="ink"), ell(560, 880, 150, 250, colour="ink"), wave(40, 1040, 420, 50, 200), {"camera": "orbit"}),
        fr(0.5, "On 'adding': behind the fabric the driver glows cyan and a cyan wave leaves the cup, beside the amber one: more sound.",
           ell(560, 880, 260, 360, fill="ink"), ell(560, 880, 150, 250, colour="ink"), {"glow": [560, 880, 140], "colour": "blue"}, wave(40, 1040, 420, 50, 200), wave(300, 1040, 1300, 50, 200, "blue", 180), {"move": [560, 1050, 560, 1260], "text": "more sound"}),
        fr(1.0, "Both waves glow; the camera dives toward the amber bands in the air beside the cup.",
           ell(560, 880, 260, 360, fill="ink"), {"glow": [560, 880, 140], "colour": "blue"}, wave(40, 1040, 420, 50, 200), wave(300, 1040, 1300, 50, 200, "blue", 180), {"camera": "push"}, {"cut": "dive into the amber air"}),
    ],
    "s03": [
        fr(0.0, "The air beside the right ear cup, on the display bust: thousands of specks of air fill the left of the frame; the cup's outside and the clay bust's ear region sit at the right edge.",
           {"molecules": [40, 400, 760, 900, 110], "seed": 4}, ell(1000, 860, 120, 260, fill="ink"), {"camera": "push"}),
        fr(1.0, "On 'pressure': the specks bunch into bands and spread between them, and the bands travel right, toward the cup; a small note 'slowed down, not to scale'.",
           {"molecules": [40, 400, 760, 900, 160], "seed": 5}, ell(1000, 860, 120, 260, fill="ink"), {"move": [200, 1100, 860, 1100], "text": "toward the cup"}, label(300, 1200, "slowed down, not to scale", 30), {"cut": "no cut: the camera drifts back and the pressure line draws"}),
    ],
    "s04": [
        fr(0.0, "The camera drifts back. Over the specks a glowing amber line draws itself: high where they bunch, low where they spread.",
           {"molecules": [40, 360, 1000, 760, 160], "seed": 5}, wave(40, 700, 740, 170, 420), {"camera": "pull"}),
        fr(0.5, "On 'squeezed' a pin lands on a bright band; on 'stretched' another on a dark one.",
           {"molecules": [40, 360, 1000, 760, 160], "seed": 5}, wave(40, 1040, 740, 170, 420), chip(300, 470, "squeezed"), chip(520, 1020, "stretched")),
        fr(1.0, "On 'over and over' the bands keep coming; the camera pulls back and up and the field becomes the air outside a head wearing the headphone.",
           *head_side(760, 900, 0.8), wave(40, 700, 600, 90, 260), {"camera": "pull"}, {"cut": "the pull back lands on the ear cup"}),
    ],
    "s05": [
        fr(0.0, "The side of a head wearing the headphone, from behind and outside: the right cup big, the amber wave arriving across the frame from the left.",
           *head_side(620, 900, 0.9), ell(560, 860, 200, 270, fill="ink"), wave(30, 400, 820, 80, 240), {"camera": "push"}),
        fr(0.3, "By 'microphone' the camera is close on the cup's back: a small oval grille near its top edge; a pin 'feed-forward mic' on it.",
           ell(560, 980, 420, 560, fill="ink"), ell(420, 600, 60, 40, colour="white"), {"dot": [420, 600, 14], "colour": "blue"}, chip(300, 420, "feed-forward mic"), {"camera": "push"}),
        fr(1.0, "On 'hears that wave coming in': the amber wave reaches the grille and a spark of it runs in; the grille glows.",
           ell(560, 980, 420, 560, fill="ink"), ell(420, 600, 60, 40, colour="white"), {"glow": [420, 600, 90], "colour": "orange"}, wave(20, 380, 600, 50, 160), chip(300, 420, "feed-forward mic"), {"cut": "no cut: the shell lifts away"}),
    ],
    "s06": [
        fr(0.0, "The cup's shell lifts straight off, taking the grille with it; inside, the board with its chips sits behind the driver, the battery below.",
           {"path": "M140 260 h800 v300 h-800 Z", "colour": "ink", "fill": "ink"}, {"move": [540, 600, 540, 300], "text": "shell lifts"}, {"card": [200, 700, 680, 400]}, {"path": "M420 820 h120 v120 h-120 Z", "colour": "ink", "fill": "ink"}, {"camera": "push"}),
        fr(0.5, "Macro on the board: by 'chip' the small square chip marked ANC fills the frame, in focus, the rest soft; a pin 'ANC chip'. A spark runs along the flex from the mic into it.",
           {"card": [80, 520, 920, 700]}, {"path": "M360 720 h300 v300 h-300 Z", "colour": "ink", "fill": "ink"}, label(510, 880, "ANC", 60, colour="white"), chip(330, 460, "ANC chip"), {"move": [80, 600, 360, 760], "text": "the noise, as a signal"}),
        fr(1.0, "On 'upside-down copy' the chip glows cyan; above it an amber wave and, under it, its flipped copy begin to draw in light.",
           {"card": [80, 520, 920, 700]}, {"path": "M360 720 h300 v300 h-300 Z", "colour": "ink", "fill": "blue"}, wave(80, 1000, 380, 60, 300), {"camera": "up"}, {"cut": "no cut: the camera rises over the board"}),
    ],
    "s07": [
        fr(0.0, "The camera rises over the board. Floating above it: the amber wave, labelled 'noise', and under it the cyan wave, labelled 'flipped copy', the same shape upside down.",
           {"card": [120, 1100, 840, 260]}, wave(60, 1020, 520, 120, 400), wave(60, 1020, 860, 120, 400, "blue", 180), chip(220, 360, "noise"), chip(260, 1010, "flipped copy")),
        fr(0.5, "On 'a stretch wherever the noise squeezes': a line of light drops from an amber crest to the cyan trough under it; pins 'squeeze' and 'stretch'.",
           wave(60, 1020, 520, 120, 400), wave(60, 1020, 860, 120, 400, "blue", 180), {"line": [360, 400, 360, 980], "dashed": True}, chip(360, 340, "squeeze"), chip(360, 1060, "stretch")),
        fr(1.0, "On 'a squeeze wherever it stretches': the next pair the other way round; every crest has its trough under it.",
           wave(60, 1020, 520, 120, 400), wave(60, 1020, 860, 120, 400, "blue", 180), {"line": [360, 400, 360, 980], "dashed": True}, {"line": [560, 400, 560, 980], "dashed": True}, chip(560, 1060, "squeeze"), {"camera": "orbit"}, {"cut": "the camera swings round to the driver"}),
    ],
    "s08": [
        fr(0.0, "The cup opened along its axis, seen from the front of the head: the cushion still against the bust, the driver moved out from it, the shell and board further out.",
           *head_side(260, 900, 0.6), {"path": "M520 500 v800", "colour": "ink", "width": 30}, ell(720, 900, 60, 300, fill="ink"), ell(900, 900, 40, 280, fill="ink"), {"camera": "orbit"}),
        fr(0.5, "By 'speaker' the camera is close on the driver: copper coil, cone, surround; a pin '40 mm driver'. On 'flipped' its cone pushes and pulls, and cyan bands leave it toward the ear.",
           ell(640, 900, 120, 380, fill="ink"), ell(640, 900, 60, 200, colour="white"), chip(700, 420, "40 mm driver"), wave(80, 560, 900, 80, 220, "blue", 180), {"move": [560, 1160, 120, 1160], "text": "into your ear"}),
        fr(1.0, "The cyan wave runs into the gap toward the ear; the parts slide back together as the cut begins.",
           ell(640, 900, 120, 380, fill="ink"), wave(80, 560, 900, 80, 220, "blue", 180), {"camera": "up"}, {"cut": "the parts close up and the scene is cut open"}),
    ],
    "s09": [
        fr(0.0, "From above, the head and the cup cut through at the canal's height: the head's section at the top, the canal running up into it to the eardrum, the cup's section below with its cushions against the bust. The amber noise leaks in past the cushion.",
           *cut_view(540, 900, 1.0), chip(160, 1130, "noise leaks in"), {"camera": "down"}),
        fr(0.5, "The cyan wave leaves the driver; in the cavity amber and cyan overlap, crest on trough.",
           *cut_view(540, 900, 1.0, cyan=True), chip(820, 1150, "flipped")),
        fr(1.0, "On 'almost nothing': where they meet, the line goes flat white up the canal; the eardrum stays still. A pin '≈ silence' at the eardrum.",
           *cut_view(540, 900, 1.0, cyan=True, white=True), chip(760, 520, "≈ silence"), {"cut": "lift out of the cut: the three waves float free"}),
    ],
    "s10": [
        fr(0.0, "Three glowing lines float in the dark above the cut-open cup, stacked down the frame: amber 'noise', plus cyan 'flipped', equals white 'what you hear', flat.",
           wave(80, 1000, 520, 90, 360), label(540, 420, "noise", 36), label(540, 660, "+", 70), wave(80, 1000, 780, 90, 360, "blue", 180), label(540, 920, "=", 70), {"line": [80, 1040, 1000, 1040], "width": 8}, {"camera": "orbit"}),
        fr(0.5, "On 'destructive interference' the name is the framed caption at the top (one name, no title); the lanes hold, each with its label on a dark plate.",
           chip(200, 640, "noise"), wave(80, 1000, 720, 90, 360), chip(220, 880, "flipped copy"), wave(80, 1000, 960, 90, 360, "blue", 180), chip(220, 1120, "what you hear"), {"line": [80, 1200, 1000, 1200], "width": 8}),
        fr(1.0, "The lines hold still, exactly opposite; the white one flat.",
           chip(200, 640, "noise"), wave(80, 1000, 720, 90, 360), chip(220, 880, "flipped copy"), wave(80, 1000, 960, 90, 360, "blue", 180), chip(220, 1120, "what you hear"), {"line": [80, 1200, 1000, 1200], "width": 8}, {"cut": "no cut: the turn"}),
    ],
    "s11": [
        fr(0.0, "On 'But': a hit. The name lifts away; a time arrow 'time →' appears under the lines; the cyan copy slides to the right, later in time.",
           wave(80, 1000, 560, 90, 360), wave(80, 1000, 800, 90, 360, "blue", 230), {"move": [400, 700, 560, 700], "text": "late"}, wave(80, 1000, 1040, 40, 360, "ink"), {"arrow": [120, 1180, 900, 1180]}, label(510, 1230, "time", 32)),
        fr(1.0, "On 'in step': it slides back into place; the white line goes flat again; a pin 'in step'.",
           wave(80, 1000, 560, 90, 360), wave(80, 1000, 800, 90, 360, "blue", 180), {"line": [80, 1040, 1000, 1040], "width": 8}, chip(760, 940, "in step"), {"cut": "back to the head, to scale"}),
    ],
    "s12": [
        fr(0.0, "The head and the headphone from behind and to the side, whole. The light turns amber and slow: one enormous swell of pressure passes over the whole head at once.",
           *head_side(540, 820, 0.7), {"glow": [300, 700, 500]}, chip(250, 380, "100 Hz hum"), {"camera": "up"}),
        fr(0.5, "The camera cranes up and back: the head shrinks; the hum's glowing wave, metres long, comes into view lying across the set.",
           {"dot": [540, 1100, 60], "colour": "orange"}, wave(40, 1040, 1100, 120, 1640), {"camera": "up"}),
        fr(1.0, "On 'easy' the headphone's cups glow cyan for a beat. The camera is high above, looking down.",
           {"dot": [540, 1150, 40], "colour": "orange"}, {"glow": [540, 1150, 80], "colour": "blue"}, {"path": "M540 1600 Q440 1200 540 800 Q640 400 540 0", "colour": "orange", "width": 9}, {"cut": "no cut: the ruler draws"}),
    ],
    "s13": [
        fr(0.0, "Straight down from above, to scale: the head with its headphone is a small dot near the bottom; the hum's wave runs up the frame past it, one whole cycle 1,650 px tall. A note 'to scale'.",
           {"dot": [540, 1300, 36], "colour": "orange"}, {"path": "M540 1920 Q300 1500 540 1100 Q780 700 540 300 Q300 -100 540 -500", "colour": "orange", "width": 9}, label(700, TOP + 10, "to scale", 32)),
        fr(1.0, "A ruler draws beside one whole wave: '≈ 3.4 m'; the bands keep repeating up the frame.",
           {"dot": [540, 1300, 36], "colour": "orange"}, {"path": "M540 1920 Q300 1500 540 1100 Q780 700 540 300 Q300 -100 540 -500", "colour": "orange", "width": 9}, {"line": [860, 1100, 860, 300], "width": 6}, label(900, 700, "≈ 3.4 m", 44, align="start"), {"cut": "the chart panel rises over the scene"}),
    ],
    "s14": [
        fr(0.0, "A glass panel rises over the dimmed scene: '100 Hz hum · 10 ms shown'. Three traces against a time axis: the hum, its flipped copy late by 0.033 ms, and what is left.",
           {"panel": [64, 430, 860, 1050], "title": "100 Hz hum · 10 ms shown"}, wave(110, 880, 520, 90, 770), wave(110, 880, 760, 90, 770, "blue", 181), {"line": [110, 980, 880, 980], "width": 6}, label(500, 1150, "copy late by 0.033 ms (example)", 30)),
        fr(1.0, "On 'match them' two bars to proportion: 'noise 100%' full, 'left over 2%' a sliver.",
           {"panel": [64, 430, 860, 1050], "title": "100 Hz hum · 10 ms shown"}, {"bar": [180, 1330, 220, 300], "colour": "orange", "label": "noise 100%"}, {"bar": [560, 1330, 220, 6], "colour": "ink", "label": "left over 2%"}, {"cut": "the panel drops; back to the cup"}),
    ],
    "s15": [
        fr(0.0, "Back down at the head, three-quarter from the front, to scale: a dense amber ripple races in, its waves not much longer than the cup is tall.",
           *head_side(600, 880, 0.75), ell(560, 860, 120, 170, fill="ink"), wave(30, 440, 860, 60, 70), chip(240, 420, "5,000 Hz squeak"), {"camera": "down"}),
        fr(1.0, "On 'harder' the camera pushes toward the cup; the ripples break on it.",
           ell(560, 860, 200, 280, fill="ink"), wave(30, 360, 860, 60, 70), {"camera": "push"}, {"cut": "no cut: the push carries on"}),
    ],
    "s16": [
        fr(0.0, "Close on the cup's outside: the dense ripple passes it; a ruler draws beside one wave: '≈ 7 cm', set against the 9.4 cm cup.",
           ell(600, 900, 300, 420, fill="ink"), wave(30, 300, 900, 50, 210), {"bracket": [60, 270, 680], "text": "≈ 7 cm"}, {"camera": "push"}),
        fr(1.0, "On 'centimetres' the ruler holds; the cup is barely more than one wave tall.",
           ell(600, 900, 300, 420, fill="ink"), wave(30, 300, 900, 50, 210), {"bracket": [60, 270, 680], "text": "≈ 7 cm"}, {"line": [960, 480, 960, 1320], "width": 6}, label(980, 900, "9.4 cm", 32, align="start"), {"cut": "the chart panel rises again"}),
    ],
    "s17": [
        fr(0.0, "The same panel, the same 10 ms of time: '5,000 Hz squeak · 10 ms shown'. The squeak is fifty tight cycles; its copy, late by the same 0.033 ms.",
           {"panel": [64, 430, 860, 1050], "title": "5,000 Hz squeak · 10 ms shown"}, wave(110, 880, 520, 70, 16), wave(110, 880, 760, 70, 16, "blue", 240), {"magnifier": [760, 640, 120]}),
        fr(0.5, "A magnifier, marked 'zoom ×10', shows two cycles: the copy one sixth of a cycle late, crest no longer under trough.",
           {"panel": [64, 430, 860, 1050], "title": "5,000 Hz squeak · 10 ms shown"}, {"magnifier": [560, 760, 260]}, label(560, 1060, "zoom ×10", 32)),
        fr(1.0, "On 'out of step' the bars: 'noise 100%' and 'left over 100%', the same height.",
           {"panel": [64, 430, 860, 1050], "title": "5,000 Hz squeak · 10 ms shown"}, {"bar": [180, 1330, 220, 300], "colour": "orange", "label": "noise 100%"}, {"bar": [560, 1330, 220, 300], "colour": "ink", "label": "left over 100%"}, {"cut": "the panel drops; a clatter hits"}),
    ],
    "s18": [
        fr(0.0, "The head and headphone from the front three-quarter; below, out of shot, something drops: a bright amber shell of sound bursts from a point and races outward.",
           *head_side(620, 820, 0.7), {"ring": [260, 1300, 160], "colour": "orange"}, {"ring": [260, 1300, 300], "colour": "orange", "dashed": True}, {"camera": "left"}),
        fr(1.0, "On 'harder still' the shell hits the cup: a flash on the shell, and a pin 'sudden clatter'.",
           *head_side(620, 820, 0.7), {"ring": [260, 1300, 520], "colour": "orange"}, chip(260, 480, "sudden clatter"), {"cut": "the chart panel rises"}),
    ],
    "s18b": [
        fr(0.0, "The panel again, the same 10 ms: a clatter's trace, quiet, then a sudden spike that rings away. Under it the chip's copy, which only starts to follow after the spike has begun.",
           {"panel": [64, 430, 860, 1050], "title": "a sudden clatter · 10 ms shown"}, {"path": "M110 520 H300 L320 400 L340 640 L360 440 L390 600 L430 480 L480 560 L560 500 L700 530 H880", "colour": "orange", "width": 6}, {"path": "M110 760 H330 L360 860 L390 700 L430 820 L480 740 L560 790 L700 760 H880", "colour": "blue", "width": 6}),
        fr(1.0, "On 'faster than the chip can follow': the leftover trace keeps the spike's sharp front; a note 'illustration'.",
           {"panel": [64, 430, 860, 1050], "title": "a sudden clatter · 10 ms shown"}, {"path": "M110 1000 H300 L320 880 L340 1120 L360 940 L400 1040 L460 990 H880", "colour": "ink", "width": 6}, label(500, 1150, "illustration", 30), {"cut": "back to the cup: the cushions"}),
    ],
    "s19": [
        fr(0.0, "Low and close on the cushion where it meets the bust: the leather's grain and its pleats sharp, the clay bust soft behind.",
           ell(560, 900, 480, 330, fill="ink"), ell(560, 900, 260, 150, colour="white"), {"camera": "push"}),
        fr(1.0, "On 'cushions' the leather is cut away along the camera's line: the memory foam inside shows its pores; pins 'memory foam' and 'leather cover'.",
           ell(560, 900, 480, 330, fill="ink"), ell(560, 900, 380, 230, colour="white"), chip(260, 480, "memory foam"), chip(700, 1150, "leather cover"), {"cut": "no cut: the camera rises over the cut"}),
    ],
    "s20": [
        fr(0.0, "From above, the cut through head and cup again; the high squeak's dense ripples arrive from below.",
           *cut_view(540, 900, 1.0, amber=False), wave(40, 1040, 1400, 30, 70), {"camera": "down"}),
        fr(0.5, "On 'block': the ripples hit the shell and the cushions and bounce off; only a faint trace gets in.",
           *cut_view(540, 900, 1.0, amber=False), wave(40, 1040, 1400, 30, 70), {"move": [300, 1300, 160, 1500], "text": "bounces off"}, chip(160, 1120, "cushion blocks it")),
        fr(1.0, "The canal stays nearly dark; a pin on the cushion, 'blocks the highs'.",
           *cut_view(540, 900, 1.0, amber=False), chip(160, 1120, "blocks the highs"), {"cut": "lift out to the whole headphone, opened up"}),
    ],
    "s21": [
        fr(0.0, "The recap in one frame: the headphone on its set, its right cup opened along its axis. Numbered pins rise one after another: 1 hear (the outside mic), 2 flip (the chip).",
           *phones(560, 900, 1.0), chip(240, 420, "1  hear"), chip(780, 560, "2  flip"), {"camera": "orbit"}),
        fr(0.5, "3 play (the driver) and the cushions: 'blocks the highs'.",
           *phones(560, 900, 1.0), chip(240, 420, "1  hear"), chip(780, 560, "2  flip"), chip(260, 1120, "3  play"), chip(800, 1200, "cushions: the highs")),
        fr(1.0, "All four pins hold; the camera keeps its slow orbit; the parts start to close up.",
           *phones(560, 900, 1.0), chip(240, 420, "1  hear"), chip(780, 560, "2  flip"), chip(260, 1120, "3  play"), {"cut": "the parts close; the two waves meet at the ear"}),
    ],
    "s22": [
        fr(0.0, "The head and headphone, cut open from above once more: the amber and the cyan waves arrive at the canal from both sides, exactly opposite.",
           *cut_view(540, 900, 1.0, cyan=True), {"camera": "pull"}),
        fr(0.6, "On 'right on time' they meet in the canal and fold into one flat white line; a ring of light closes on the eardrum and vanishes.",
           *cut_view(540, 900, 1.0, cyan=True, white=True), {"ring": [540, 560, 120]}),
        fr(1.0, "Silence: the canal is dark and still; the camera keeps pulling back.",
           *cut_view(540, 900, 1.0, amber=False), {"camera": "pull"}, {"cut": "dissolve to the headphone on its set"}),
    ],
    "s23": [
        fr(0.0, "The poster: the headphone on the desk, as in the first frame, turning slowly; the line in metal type at the top.",
           *phones(560, 1000, 1.25), {"title": [540, TOP + 80], "text": "Hear it.\nFlip it.\nPlay it on time.", "size": 104, "accent": "on time."}, {"camera": "orbit"}),
        fr(1.0, "The line holds for two seconds; a sheen crosses 'on time.'. The last frame matches the first, so the loop has no jolt.",
           *phones(560, 1000, 1.25), {"title": [540, TOP + 80], "text": "Hear it.\nFlip it.\nPlay it on time.", "size": 104, "accent": "on time."}, {"cut": "loops to the first frame"}),
    ],
}

# ── The shots ────────────────────────────────────────────────────────────────────────────────────────────────────
WORN = "the head and headphone"
shot("s01", "hook", "object3d", caption=False, facts=["f1", "f2", "f9"],
     teaches="Asks the question over the real object: a pair of noise-cancelling headphones, with noise in the air round it.",
     screen="The headphone standing on its cups on a walnut desk in a dim room at night, three-quarter, filling the middle of the frame (y 650 to 1350): graphite cups, leather cushions, brushed yokes and sliders; a keyboard and a mug on the desk, warm lamps far behind as soft discs. Amber pressure bands and a glowing amber wave roll through the air round it from the upper left. The question in metal type at the top, y 262 to 600, three lines, 'disappear?' in cyan (the spoken line is lettered by the title, so no caption here).",
     camera="Starts three-quarter front-right (az 32, el 16, 560 mm off, 30 mm lens-equivalent fov 30), target the band's middle; orbits to az 60 and pushes to 500 mm over the shot; slow sway. No depth of field.",
     motion="The camera orbits and pushes in; the title types in line by line as it is said; the amber bands keep travelling; a sheen crosses 'disappear?' at the end.",
     carries="The headphone and the amber noise: the orbit keeps going round to the cup's inside.",
     transition="No cut: the orbit carries the camera round to the inside of the right cup as the title lifts away.",
     sound="The bed starts at full level; a low amber drone texture is the music's own; no effects under the question.",
     check="Frame 0 is a finished picture; the title sits inside the safe area; the headphone reads at a glance; nothing important under y 1490.")
shot("s02", "hook", "object3d", facts=["f2"],
     teaches="The surprise: they cancel noise by adding sound, not only by blocking it.",
     screen="The right cup from its inside, large (y 500 to 1300): the leather cushion ring with its pleats, the dark fabric cover inside it. Amber bands pass through the air beside it. On 'adding' the fabric glows cyan from the driver behind it and a cyan wave leaves the cup down the frame beside the amber one.",
     camera="Continues the orbit from s01: az 60 to az 125 round the right cup (its inside faces the camera), el 16 to 8, dist 500 to 300 mm, target eases onto the cushion's centre; fov 30 to 27.",
     motion="The orbit swings round; on 'adding' the cyan light swells behind the fabric and the cyan wave draws out; the camera begins to dive toward the amber bands at the end.",
     carries="The amber bands in the air: the dive goes into them.",
     transition="A push through the amber bands into the air itself; a soft whoosh on the cut.",
     sound="A soft whoosh on the dive at the cut into s03.",
     check="The cushion's inside and the fabric read as a real ear cup; the cyan comes from the driver behind the fabric, not from outside.")
shot("s03", "wave", "macro", facts=["f1", "f11"],
     teaches="Sound is a wave of pressure: air squeezed and stretched, travelling.",
     screen="The air beside the right ear cup of the headphone on a matte clay display bust: thousands of specks of air fill the left two thirds of the frame, the cup's outside at the right edge; the specks bunch into bands and spread between them, and the bands travel right, toward the cup. A small note 'slowed down, not to scale', 30 px, above the bottom of the safe area.",
     camera="From behind the bust, side-on to the travel (az 186 to 182, el 6), 300 to 330 mm off, fov 26; drifts with the bands toward the cup; sway 0.6; no depth of field.",
     motion="The specks rock back and forth about their places, so bands of squeeze and stretch travel through them; the camera drifts with them.",
     carries="The speck field and the travelling bands.",
     transition="No cut: the camera drifts back and a pressure line draws over the specks.",
     sound="The music alone; a faint air hiss belongs to the bed.",
     check="The specks only rock about their places; the pattern is what travels. The note 'slowed down, not to scale' is readable (30 px).")
shot("s04", "wave", "diagram", facts=["f1", "f11"],
     teaches="Squeezed then stretched, over and over: the pressure line names the bands.",
     screen="The same speck field, wider; a glowing amber line draws over it, high over the bright bands, low over the dark. Pins 'squeezed' (on a bright band, left, y about 470) and 'stretched' (on a dark band, y about 1020). At the end the camera swings round behind the bust to the ear cup.",
     camera="Pull back from 330 to 400 mm (az 182 to 178, el 6 to 8, fov 26 to 28) as the line draws; then the target moves onto the right ear cup and the camera swings round behind the bust to 380 mm (az 150, el 16).",
     motion="The amber line draws from left to right as the voice says 'the air'; the pins ride on a crest and a trough as they travel; the pull back reveals the head.",
     carries="The amber bands: they keep rolling toward the ear cup.",
     transition="No cut: the pull back lands on the ear cup, which the next shot approaches.",
     sound="The music alone; nothing on the words.",
     check="'squeezed' sits on a bright band, 'stretched' on a dark one, as they move. The pins are at least 36 px and inside the safe area.")
shot("s05", "cancel", "object3d", facts=["f2", "f7", "f9"],
     teaches="A microphone on the outside of the cup hears the noise before it reaches the ear.",
     screen="The clay display bust wearing the headphone, from behind and outside: the right cup big. The camera closes on the cup's back panel: a small oval perforated grille near its top front edge, with a metal bezel. The amber wave arrives from the left and touches it; the grille glows; a pin 'feed-forward mic · outside the cup'.",
     camera="Approach: from behind the head (az 140, el 14, 420 mm, fov 28, target the cup) in to the grille by 'microphone' (az 112, el 22, 110 mm, fov 22, target the grille), then a slow push to 90 mm; depth of field 0.5 focused on the grille; sway 0.6.",
     motion="The camera travels to the grille; the amber wave runs across and reaches it; a spark of amber runs into the grille on 'coming in' and it glows.",
     carries="The grille and the spark of noise in it.",
     transition="No cut: the shell lifts away from the camera to show what the mic is wired to.",
     sound="The music alone; a tiny tick as the grille lights (between 'cup' and 'hears').",
     check="By 13.9 s the grille fills a third or more of the frame; the pin names it; the amber wave visibly arrives from outside.")
shot("s06", "cancel", "macro", facts=["f2"],
     teaches="A chip in the cup makes an upside-down copy of the noise.",
     screen="The shell lifts off the cup, straight back toward the camera and out of shot; inside, the main board sits behind the driver: a small square chip marked 'ANC', a shielded radio, tiny resistors and capacitors, a crystal, copper flex. A spark runs along the flex from the mic to the chip; the chip glows cyan. A pin 'ANC chip'.",
     camera="Macro: from the grille (100 mm) the target travels down the flex to the chip (az 100 to 92, el 24 to 34, dist 100 to 70 mm, fov 22 to 20); rack focus from the grille to the chip by 'chip'; blur 0.8; sway 0.6.",
     motion="The shell lifts 74 mm along the cup's axis in 1 s; the camera follows the flex down to the chip; the spark runs; the chip glows on 'upside-down copy'.",
     carries="The chip and the light over it.",
     transition="No cut: the camera rises over the board and the two waves draw above it.",
     sound="A soft mechanical slide as the shell lifts, under 'Then'.",
     check="The chip fills 30 to 60% of the frame's height within half a second of 'chip' (18.4 s); its marking reads; the board looks like a board.")
shot("s07", "cancel", "diagram", facts=["f2", "f11"],
     teaches="Upside down means a stretch for every squeeze and a squeeze for every stretch.",
     screen="Over the board, two waves of light float: the amber 'noise' above and the cyan 'flipped copy' below, the same shape upside down. A line of light drops from an amber crest to the cyan trough under it; pins 'squeeze' and 'stretch'; then the next pair the other way round.",
     camera="Pulls back and levels over the board: az 112 to 86 to 76, el 30 to 16 to 8, dist 58 to 175 mm, fov 24, target 14 mm out from the chip and 18 mm above it; no depth of field (the waves must be sharp).",
     motion="The two waves hold their shapes and travel slowly together; the dashed lines of light drop one by one on 'squeezes' and 'stretches'.",
     carries="The cyan wave: the next shot follows it to the driver.",
     transition="The camera swings round the cup to its ear side as it opens.",
     sound="The music alone.",
     check="Every amber crest sits exactly over a cyan trough (180 degrees apart).")
shot("s08", "cancel", "macro", facts=["f2", "f9"],
     teaches="The speaker (the driver) plays the flipped wave into the ear.",
     screen="The whole cup opened along its axis, out from the bust: the clay ear uncovered on the left, the cushion, the fabric, the driver, the board and the shell in a row going right. The driver's cone pushes and pulls; cyan motes and a cyan wave leave it and travel into the ear. Pins '40 mm driver' and 'your ear', a ruler '40 mm' across the driver.",
     camera="Pull back and swing round to the front right of the bust as the cup opens: from over the board out to the front right of the bust, az 18, el 14, 470 mm, then a slow push to az 26, el 10, 420 mm, framing the ear and the driver together; fov 26; no depth of field (the cyan light must stay sharp).",
     motion="The parts slide apart along the cup's axis; the camera closes on the driver; the cone moves with the cyan wave; the bands travel to the ear.",
     carries="The cyan wave travelling to the ear.",
     transition="The parts slide back together and the scene is cut open from above.",
     sound="A soft whoosh as the parts open; the cone's motion is silent.",
     check="The driver fills 30 to 60% of the frame by 25.8 s; the cyan comes out of the cone, toward the ear.")
shot("s09", "cancel", "macro", facts=["f2", "f3", "f11"],
     teaches="In the cup, the flipped wave and the noise add up to almost nothing at the ear.",
     screen="From above, the head and cup cut through at the canal's height: the bust's clay section (pale, hatched) at the top, the canal lit cyan, the canal running up into it to the eardrum; the cup's section below: shell, board, driver, fabric, the cushions' foam inside leather, pressed against the bust. The amber noise squeezes in past the cushion's edge; the cyan leaves the driver; where they overlap the line goes flat and white up the canal; the eardrum stays still.",
     camera="Top-down cutaway, read like a section drawing: az 90, el 80 to 84, dist 270 to 235 mm, target just outside the canal's mouth; fov 26; the canal runs up the frame; no depth of field.",
     motion="The cut plane sweeps down through head and cup; the amber leaks in, the cyan leaves the driver, the white sum draws up the canal and fades; a pin '≈ silence' at the eardrum on 'nothing'.",
     carries="The amber, cyan and white lines: they lift out into the next shot.",
     transition="A hit on the payoff; the three waves lift out of the cut.",
     sound="The payoff hit after 'nothing', in the hold.",
     check="The noise comes in past the cushion (never out of the driver); only the cyan comes from the driver; amber and cyan are exactly 180 degrees apart where they meet.")
shot("s10", "cancel", "compare", facts=["f2"],
     teaches="The name for it: destructive interference.",
     screen="Three glowing lines float in the dim room stacked down the frame (y 720, 960, 1200): amber 'noise', '+', cyan 'flipped copy', '=', white 'what you hear', flat, each label on a dark plate at the left; small warm lamps far behind. The name 'destructive interference' is the framed caption at the top, 'destructive' in its frame: one name, no title.",
     camera="The lines in 3D, hung in the room with the warm lamps far behind them: camera front-on, slow orbit az 172 to 186, el 4, 300 mm, fov 26; no depth of field (the lines must stay sharp).",
     motion="The lanes draw in one after another; the camera orbits slowly; the framed caption lights word by word.",
     carries="The three lines.",
     transition="No cut: on 'But' the cyan line slips.",
     sound="A shimmer under the sheen; the turn's hit at the end of the hold, before 'But'.",
     check="Cyan is exactly the amber upside down; the white line is flat; the name appears once (the caption), nothing overlaps it.")
shot("s11", "limits", "diagram", facts=["f6"],
     teaches="The copy has to stay exactly in step: a copy late in time leaves something behind.",
     screen="The same three lines, now with a time axis under them, 'time →'. The cyan copy slides right, later in time; the white sum grows a ripple; a tag 'late' rides on the cyan; then the cyan slides back, the white goes flat, a pin 'in step'.",
     camera="The same lines, a slow push and level: az 186 to 180, el 4 to 2, 300 to 290 mm, fov 26.",
     motion="The cyan line shifts right by a quarter cycle and back; the white line is computed from the two and follows.",
     carries="The amber hum: it becomes the hum round the head.",
     transition="The lines drift down out of frame and the head comes up, to scale.",
     sound="The turn's hit lands at the cut, before 'But'.",
     check="'Late' is drawn later in time: the cyan moves right, along the time arrow. The white is always amber plus cyan.")
shot("s12", "limits", "wide", facts=["f3", "f4", "f8"],
     teaches="A steady low hum is easy to cancel.",
     screen="The head and headphone whole, from behind and to the side, on the set; the light amber and slow. One huge swell of pressure passes over the whole head at once. A pin '100 Hz hum'. The camera cranes up; the glowing hum, metres long, comes into view lying across the set. On 'easy' the cups glow cyan for a beat.",
     camera="Pull back and crane: from az 125, el 14, 700 mm (fov 30) to straight down from above (el 88) at 7,400 mm, the frame turned so the wave runs up it; target the head; no depth of field.",
     motion="The crane is the main move (3 s, power2.inOut); the swell travels slowly past; the cups' cyan glow pulses once on 'easy'.",
     carries="The head seen from above and the long wave beside it.",
     transition="No cut: the ruler draws beside the wave.",
     sound="A slow whoosh under the crane, soft.",
     check="The head and the wave are both to scale (the head 15 cm, the wave 3.43 m).")
shot("s13", "limits", "wide", facts=["f4", "f8"],
     teaches="The hum's waves are metres long and repeat.",
     screen="Straight down from above, to scale: the head with its headphone a small shape near the bottom (about 70 px), the hum's wave running up the frame past it, one cycle about 1,650 px of the frame's 1,920. A ruler beside one whole wave: '≈ 3.4 m'. A note 'to scale'.",
     camera="Held high above (el 88, 7,400 mm, fov 30), drifting a little; the roll keeps the wave running up the frame.",
     motion="The ruler draws along one cycle; the bands keep travelling up past the head.",
     carries="The hum: it becomes a trace on the chart.",
     transition="The chart panel rises over the dimmed scene.",
     sound="The music alone.",
     check="The ruler spans exactly one cycle (3.43 m at the scene's scale); 'to scale' is said on screen.")
shot("s14", "limits", "chart", facts=["f6"],
     teaches="With a hum, a tiny delay hardly matters: about 2% is left.",
     screen="A glass panel (x 64 to 930, y 428 to 1484, under the captions) over the dimmed scene: '100 Hz hum · 10 ms shown'. Three traces against a time axis: the hum (amber), its flipped copy late by 0.033 ms (cyan), what is left (white, nearly flat). Under it two bars to proportion: 'noise 100%' and 'left over 2%'.",
     camera="Not a 3D shot: the scene behind is held, dimmed, as the panel rises.",
     motion="The traces draw left to right; the bars grow to their values; nothing counts up.",
     carries="The panel: it stays for the squeak.",
     transition="The panel drops away and the camera is back at the head.",
     sound="The music alone.",
     check="The bars are 100 and 2.1 (2 sin(pi x 100 / 30,000)); the time window is said on screen.")
shot("s15", "limits", "wide", facts=["f3", "f4", "f8"],
     teaches="A high squeak is harder to cancel.",
     screen="Back at the head, three-quarter from the front, to scale: a dense amber ripple races in, its waves 6.86 cm long, not much shorter than the 9.4 cm cup is tall. A pin '5,000 Hz squeak'.",
     camera="From high above, the camera drops to the side of the head: az 40, el 12, 520 mm, fov 28, then pushes toward the cup on 'harder'.",
     motion="The ripples travel quickly toward the cup and break on it; the push begins on 'harder'.",
     carries="The cup and the ripples on it.",
     transition="No cut: the push carries on to the cup.",
     sound="A soft whoosh as the camera drops back down.",
     check="The ripple's spacing is 6.86 cm at the scene's scale.")
shot("s16", "limits", "macro", facts=["f4", "f8"],
     teaches="The squeak's waves are only a few centimetres long.",
     screen="Close on the cup's outside, the ripple passing it; a ruler of light beside one wave '≈ 7 cm', and the cup's height '9.4 cm' beside it.",
     camera="Push: from az 40, el 12, 360 mm to az 60, el 8, 230 mm, fov 24, target the cup; blur 0.3 focused on the cup; sway 0.5.",
     motion="The ripples keep passing; the ruler draws on 'centimetres'.",
     carries="The squeak: it becomes the trace on the chart.",
     transition="The chart panel rises again, over the dimmed scene.",
     sound="The music alone.",
     check="The ruler spans one 6.86 cm wave; the cup measures 9.4 cm.")
shot("s17", "limits", "chart", facts=["f6"],
     teaches="For the squeak, the same tiny delay leaves the copy out of step: nothing is cancelled.",
     screen="The same panel, the same 10 ms of time: '5,000 Hz squeak · 10 ms shown'. Fifty tight cycles; the copy late by the same 0.033 ms. A magnifier 'zoom ×10' shows two cycles: crest no longer under trough. Bars: 'noise 100%' and 'left over 100%'.",
     camera="Not a 3D shot: the scene behind stays dimmed.",
     motion="The traces draw; the magnifier opens; the bars grow; nothing counts up.",
     carries="The panel's frame.",
     transition="The panel drops; a clatter bursts in the scene.",
     sound="The music alone.",
     check="The time window is the same as in s14 and says so; the zoom says ×10; 'late' is to the right on the time axis; left over is 100% (2 sin 30 degrees).")
shot("s18", "limits", "diagram", facts=["f3", "f10"],
     teaches="A sudden clatter is harder still.",
     screen="The head and headphone from behind and to the side; a thin bright amber shell of sound bursts from a point below and behind and races outward; it hits the cup; a flash. A pin 'sudden clatter'.",
     camera="A medium shot from behind and to the side: az 128, el 6, 600 mm to az 118, el 10, 520 mm, fov 28; slow push.",
     motion="The shell grows fast (343 m/s slowed, said in f11); a hit flash when it reaches the cup.",
     carries="The clatter: its trace is the next chart.",
     transition="The chart panel rises.",
     sound="A small sharp clack under 'clatter' is not used (it would sit on the word); the hit flash is silent.",
     check="The shell starts after the shot starts and reaches the cup on 'harder'.")
shot("s18b", "limits", "chart", facts=["f10"],
     teaches="It changes faster than the chip can follow, so its sharp front gets through.",
     screen="The panel: 'a sudden clatter · 10 ms shown'. The clatter's trace (amber): quiet, then a sharp spike ringing away; the chip's copy (cyan) only follows after a lag; what is left (white) keeps the spike's front. A note 'illustration'.",
     camera="Not a 3D shot: the scene behind stays dimmed.",
     motion="The traces draw left to right; the leftover's front flashes once.",
     carries="Back to the cup: the cushions.",
     transition="The panel drops; the camera is low and close on the cushion.",
     sound="The music alone.",
     check="The leftover is the clatter plus its copy, computed, not drawn by hand.")
shot("s19", "cushions", "macro", facts=["f5", "f9"],
     teaches="The cushions still matter.",
     screen="Low and close on the cushion where it meets the bust: the leather's grain and pleats, the piping seam. The leather cuts away along the camera's line: the memory foam inside shows its pores. Pins 'memory foam' and 'leather cover'.",
     camera="Macro: az 24, el 10, 190 mm to az 34, el 6, 150 mm, target the cushion's front edge where it meets the bust; fov 22; sharp throughout (the leather and the foam are the subject); sway 0.6.",
     motion="A slow push; the cut plane slides across the cushion to show the foam.",
     carries="The cut: it widens to the whole head and cup.",
     transition="No cut: the camera rises over the cut, to the view from above.",
     sound="A soft whoosh as the camera rises.",
     check="Leather grain, pleats and foam pores read at full size.")
shot("s20", "cushions", "diagram", facts=["f3", "f5"],
     teaches="They block the high, sharp sounds the chip cannot catch.",
     screen="From above, the cut through head and cup: the squeak's dense ripples arrive from below, hit the shell and the cushions and bounce back; a faint trace gets in; the canal stays nearly dark. A pin 'cushion blocks the highs'.",
     camera="Top-down cutaway again, turning: az 80 to 96, el 80 to 84, dist 290 to 260 mm, fov 26; no depth of field.",
     motion="The ripples come and bounce; the camera turns a little over the cut.",
     carries="The headphone: it lifts out whole.",
     transition="The cut closes and the camera lifts out to the whole headphone on its set.",
     sound="The music alone.",
     check="What gets in is visibly weaker; no number is claimed.")
shot("s21", "recap", "recap", facts=["f2", "f5"],
     teaches="The whole answer in one frame: hear, flip, play, and cushions for the highs.",
     screen="The right cup stands on the desk, opened upward along its axis into a tower so every part is in its row. Four pins rise one after another: '1  hear' (the outside mic), '2  flip' (the ANC chip), '3  play' (the driver), 'cushions: the highs'.",
     camera="Establish and slow orbit round the tower: az 34 to 52, el 16 to 14, 640 to 600 mm, fov 28, target the opened cup; no depth of field.",
     motion="The parts slide apart; the pins rise in order; the camera orbits.",
     carries="The headphone: it closes and goes back on the head.",
     transition="The parts close and the scene is cut open at the ear again.",
     sound="The recap's cards land in the pause after 'catch.'.",
     check="Every pin is on its part and inside the safe area; at most four at once, two each side.")
shot("s22", "recap", "object3d", facts=["f2"],
     teaches="Flipped upside down, played right on time: the two waves meet and vanish.",
     screen="From above, the cut through head and cup: the amber noise and the cyan flipped wave arrive at the canal, exactly opposite; they fold into one flat white line; a ring of light closes on the eardrum and vanishes; the canal goes dark.",
     camera="Top-down cutaway, pulling back: az 92 to 88, el 84 to 78, 215 to 320 mm, fov 26; target just outside the canal's mouth.",
     motion="The two waves converge and cancel on 'time'; a ring closes and goes out.",
     carries="The headphone.",
     transition="A dissolve to the headphone on its set.",
     sound="The answer's hit after 'time', with its body.",
     check="The closing waves are exactly 180 degrees apart.")
shot("s23", "recap", "endcard", length=3.2, facts=["f2"],
     teaches="The line to remember, on a frame that loops.",
     screen="The headphone on the desk, three-quarter as in the first frame, turning slowly. The poster line in metal type at the top: 'Hear it. Flip it. Play it on time.', 'on time.' in cyan.",
     camera="Slow orbit: az 44 to 58, el 16 to 14, 700 to 760 mm, fov 30, ending exactly on the first frame's view.",
     motion="The line types in; a sheen crosses 'on time.'; the camera turns into the first frame's view.",
     carries="Nothing: the last frame.",
     transition="Loops to the first frame without a jolt.",
     sound="The bed's last chord rings out; a shimmer under the sheen.",
     check="The line is readable for at least two seconds; the last frame matches the first.")

KEYS = {"s02": ["adding"], "s03": ["pressure"], "s04": ["squeezed", "stretched"], "s05": ["microphone"], "s06": ["chip"], "s07": ["stretch", "squeeze"],
        "s08": ["speaker"], "s09": ["nothing"], "s10": ["destructive"], "s11": ["step"], "s12": ["hum"], "s13": ["metres"], "s14": ["match"], "s15": ["squeak"],
        "s16": ["centimetres"], "s17": ["delay"], "s18": ["sudden"], "s18b": ["faster"], "s19": ["cushions"], "s20": ["high"], "s21": ["own"], "s22": ["time"]}
for s in shots:
    s.pop("length", None)
    if s["id"] in KEYS:
        s["keys"] = KEYS[s["id"]]

board = {
    "title": "How do noise-cancelling headphones erase sound?",
    "standard": 2,
    "question": "How do noise-cancelling headphones make a noise disappear?",
    "audience": "Curious adults and teenagers anywhere, watching on a phone, English as a first or second language. Many own or have tried noise-cancelling headphones; they think the headphones just block sound, like earmuffs, and have not heard of anti-noise.",
    "promise": "The headphones listen to the noise, make the same wave flipped upside down, and play it so the two add up to almost nothing. That works on steady low hums, whose waves are long and repeat; it fails on high or sudden sounds, so the cushions still block those.",
    "language": "en",
    "format": "1080x1920",
    "captions": "frame",
    "duration": 74.01,
    "fps": 60,
    "poster": 72.41,
    "voice": {"voice_id": "MnTN9XubPKNlI4AwhLj5", "name": "Craig - Warm, Articulate, Conversational", "model": "eleven_v4", "language": "en", "direction": "[warmly]"},
    "look": {"accent": "#3fe0ff", "accent2": "#ffb547", "mood": "A dim room at night: a walnut desk with a keyboard and a mug, a far wall, warm lamps all round as soft out-of-focus discs, dust catching a warm key light; deep shadows. The head shots keep the room without the desk; the cutaways sit in the same warm dark. The two heroes are lit like products: key from the upper side, rim from behind. Amber is always the noise, cyan (the accent) the flipped wave the driver plays, white what reaches the eardrum; the wall's wash takes the act's colour: amber for the noise, cyan when the driver answers, pale when the two cancel, amber again through the catch."},
    "music": {"track": "composed for the film (music/bed-fit.mp3)", "bpm": 80, "start": 0, "note": "The bed composed for this film's take, reused: the length is unchanged (74.01 s). The cuts follow the take, not a beat."},
    "facts": [
        {"id": "f1", "claim": "Sound in air is a pressure wave: the air is pushed together (compressions, higher pressure) and pulled apart (rarefactions, lower pressure) in turn, and that pattern travels, at about 343 m/s in air at 20 °C. Each bit of air only rocks back and forth about where it is; the pattern is what travels.", "source": "Standard acoustics (Kinsler, Frey et al., Fundamentals of Acoustics, 4th ed., ch. 5); speed of sound 331.3 x sqrt(1 + 20/273.15) = 343.2 m/s. From the textbook, not looked up in this session."},
        {"id": "f2", "claim": "Active noise cancellation: a microphone picks up the incoming noise, the electronics make a signal of the opposite phase (the same wave upside down, 'anti-noise'), and the speaker plays it with your audio. Where the noise is high the anti-noise is low, so they add up to much less: destructive interference. The film's 'add up to almost nothing' is said of the steady hum it shows.", "source": "Kuo and Morgan, 'Active noise control: a tutorial review', Proc. IEEE 87(6), 943-973, 1999; HowStuffWorks and BBC Science Focus explainers. Read through search summaries in the first cut; not reopened."},
        {"id": "f3", "claim": "ANC works best on steady, low-frequency noise (engine hum, air conditioning) and less well on higher frequencies and on sudden or quickly changing sounds. NIOSH describes ANC as aimed at low-frequency noise, typically 500 Hz and below. No dB figure is stated in the film.", "source": "CDC/NIOSH record stacks.cdc.gov/view/cdc/210761; Sennheiser support; Sonos; TechRadar. Read through search summaries."},
        {"id": "f4", "claim": "Wavelength = speed / frequency. A 100 Hz hum: 343 / 100 = 3.43 m, said 'metres long', shown '≈ 3.4 m'. A 5,000 Hz squeak: 343 / 5,000 = 0.0686 m, said 'a few centimetres', shown '≈ 7 cm'. The two frequencies are examples chosen for the film.", "source": "Arithmetic from f1."},
        {"id": "f5", "claim": "The cups and cushions block sound passively, and passive isolation works better at mid and high frequencies than at low ones; so passive isolation handles the highs and ANC the lows. The film shows the squeak coming through weaker, as an illustration, without a figure.", "source": "Sonos, 'How do noise-canceling headphones work'; Logitech, 'Passive noise isolation vs active noise cancellation'; Sennheiser support. Read through search summaries."},
        {"id": "f6", "claim": f"If a tone's flipped copy is late by d, what is left is 2 sin(pi f d) of the tone. With an example delay d = 1/30,000 s (0.033 ms): 100 Hz leaves {LEFT_LOW * 100:.1f}% (shown 2%), 5,000 Hz leaves {LEFT_HIGH * 100:.0f}% (2 sin 30°). Both charts show the same 10 ms of time: 1 cycle of the hum, 50 of the squeak; the squeak's magnifier is marked ×10 (0.4 ms across the lens). 'Late' is drawn to the right on a time axis. The delay is an illustration, not a measured figure for any headphone.", "source": "Arithmetic (sum of two equal sine waves with a phase difference of 2 pi f d)."},
        {"id": "f7", "claim": "Many headphones have a microphone inside the cup too, in front of the driver (feedback or 'hybrid' ANC). The model has both; the film explains the outside (feed-forward) one and names the inside one only in the model. The headphone is generic: no real product, no logo.", "source": "Audio-Technica support, 'How do different active noise-cancelling headphones work'; SoundGuys, 'Noise canceling explained'; the 52Audio teardown of a 40 mm over-ear ANC headphone (feed-forward and feedback MEMS mics), all read through search results in this session."},
        {"id": "f8", "claim": "The to-scale views put the head (about 15 cm across), the 100 Hz wave (3.43 m) and the 5,000 Hz wave (6.86 cm) in the same scene at 1 unit = 1 mm, with the 9.4 cm tall ear cup. Seen from straight above at 7.4 m with a 30 degree lens, the frame is 2 x 7.4 x tan 15° = 4.0 m tall, so one whole 3.43 m wave fits beside the head (about 70 px across) with its ruler.", "source": "Arithmetic from f4; head breadth about 15 cm (typical adult); the cup's size is the model's (f9)."},
        {"id": "f9", "claim": "The headphone model: oval cups 76 x 94 mm, 30 mm deep; a 40 mm dynamic driver screwed to a baffle; feed-forward mic behind a grille on the outside of the cup; feedback MEMS mic in front of the driver; main board with the ANC chip behind the driver; a pouch battery; memory-foam cushions in a leather cover, 21 mm thick. The ear: pinna about 62 mm tall and 35 mm wide, canal about 25 mm long and 7 mm across, an eardrum about 9 mm across set at a slant.", "source": "Teardowns of 40 mm over-ear ANC headphones (qucox.com teardown of a Technics EAH-A800; 52Audio teardowns of Sony WH-1000XM4 and WH-XB910N as summarised by The Walkman Blog; a Lumafield CT scan of over-ear headphones), read through search results in this session, not opened; ear canal 2.5 cm by 0.7 cm from the ear canal article in Wikipedia's medical mirror (search result); pinna and eardrum sizes from textbook anatomy, not looked up."},
        {"id": "f10", "claim": "The clatter chart is an illustration: a sharp burst (a fast rise, then a ringing that dies away in a few milliseconds) and the chip's copy modelled as the burst smoothed (the chip cannot follow a change faster than about a millisecond) and late by the same 0.033 ms; what is left is computed as their sum. It is not a measurement.", "source": "Arithmetic in film.js; the claim that ANC handles sudden sounds less well is f3."},
        {"id": "f11", "claim": "The waves of light in the cup, in the air and over the chip are slowed down and not to scale (sound would cross the cup in a tenth of a millisecond); the to-scale views (f8) say so where they are.", "source": "The film's own drawing convention, said on screen in s03."},
    ],
    "models": [
        {"name": "over-ear ANC headphone (generic)",
         "variant": "The most common international over-ear ANC headphone, the kind an English-speaking viewer on X or Reddit owns or sees on a commuter: a closed-back, matte black, oval-cup wireless model with a plastic band, brushed metal sliders and forked yokes, protein-leather cushions and a 40 mm driver (the family the Sony WH-1000X, Bose QuietComfort and Sennheiser Momentum belong to), with no logo or product name.",
         "looks": "Matte black or graphite plastic cups, oval (taller than wide, about 76 x 94 mm), a thin bright trim ring round the back panel, a small perforated mic grille near the top of each cup, buttons and a USB-C port on the lower edge; brushed stainless sliders with size marks; black protein-leather cushions, pleated on the inner wall, about 20 mm thick, in a black plastic ring; a dark fabric cover over the driver inside; a padded leather band under a plastic outer.",
         "photos": ["product listings found by search, not opened: Bose QuietComfort (black; protein-leather cushions), Cleer NC Over-Ear (protein leather, aluminium housing), JBL Club One (oval over-ear cups, metal hinges), Sennheiser Momentum 2.0 Wireless (brushed stainless sliders, memory foam cushions), Bang & Olufsen Beoplay H95 (oval memory-foam cushions)", "teardown write-ups found by search, not opened: qucox.com Technics EAH-A800 teardown; 52Audio Sony WH-1000XM4 and WH-XB910N teardowns via The Walkman Blog; Lumafield 'scan of the month: headphones'", "no photo was looked at in this session: the looks above are from the listings' text and from general knowledge of the category"],
         "reference": "Teardowns of 40 mm over-ear ANC headphones (Technics EAH-A800 by qucox; Sony WH-1000XM4 and WH-XB910N by 52Audio via The Walkman Blog; Lumafield's CT scan of four over-ears: driver screwed to a sub-baffle, wiring packed round it); vendor explainers on feed-forward and feedback mic placement (Audio-Technica, SoundGuys). Read through search results; the teardown pages and their photos could not be opened from this session.",
         "scale": "1 unit = 1 mm",
         "parts": ["headband: plastic outer, leather pad (34 mm wide)", "sliders: brushed steel strips with size marks", "yokes: forks holding each cup at two pivots", "ear cup shell: dished oval 76 x 94 x 30 mm, 2 mm wall, parting line, brushed trim ring, buttons, USB-C, status light", "feed-forward mic behind an oval perforated grille on the outside of the shell", "feedback MEMS mic on a bracket in front of the driver", "40 mm dynamic driver (P.driver): basket, magnet, top plate, pole piece, copper voice coil, spider, cone, surround, dust cap", "baffle with four screws", "main board 34 x 20 mm: ANC chip (QFN), shielded radio, crystal, resistors and capacitors, flex connector", "pouch battery 36 x 15 x 5 mm with protection board and leads", "memory-foam cushion in a pleated protein-leather cover with piping, 21 mm thick", "fabric baffle cover", "copper flex from each mic to the board"]},
        {"name": "a matte clay display bust with a sculpted right ear",
         "variant": "A product-photography display bust (the matte grey form headphones are shown on in shops and product shots) with an average adult right ear, so the ear and canal read as anatomy without a person's skin, hair or face; chosen after a reviewer found a skin-toned head uncanny.",
         "looks": "Matte warm-grey clay with a fine cast grain, no hair, no skin tone, a smooth cranium, jaw and neck; the ear about 62 mm tall and 35 mm wide, standing out about 20 degrees, with a rolled helix, the antihelix and its two crura, a deep concha leading into the canal, the tragus over the canal's mouth, a soft lobe; in the cutaway a paler clay section, the canal and eardrum lit in the accent cyan.",
         "photos": ["no photographs: side-view anatomy plates of the auricle from textbook knowledge (helix, antihelix, crura, triangular fossa, scapha, concha, tragus, antitragus, lobule); ear canal size from the ear canal article (2.5 cm by 0.7 cm), read through search results"],
         "reference": "Product photography of headphones on display busts (matte clay or off-white, no hair, no skin tone); side-view anatomy plates of the auricle (helix, antihelix and its crura, triangular fossa, scapha, concha, tragus, antitragus, lobule) traced into an outline; textbook dimensions (pinna about 62 x 35 mm, standing out about 20 degrees from the head); ear canal about 25 mm long, 7 mm across, gently S-shaped, ending at a slanted eardrum about 9 mm across with the malleus showing through.",
         "scale": "1 unit = 1 mm",
         "parts": ["bust surface: one smooth union of cranium, jaw and neck, in matte warm-grey clay with a fine cast grain", "cut section: paler clay, hatched", "pinna: traced outline extruded with a deep bevel (P.extrude), the relief laid over it: helix rim, scapha, antihelix and two crura, triangular fossa, concha, crus of the helix, tragus, antitragus, lobe", "ear canal: a tube cut in the cutaways, its inside lit in the accent cyan", "eardrum: a thin cone with its ring and the malleus handle, lit in the accent"]},
    ],
    "acts": [
        {"id": "hook", "title": "The question", "goal": "Ask the question over the real headphones, then the surprise: they add sound.", "rail": False},
        {"id": "wave", "title": "A wave of pressure", "goal": "What sound is: squeezed and stretched air, travelling.", "rail": False},
        {"id": "cancel", "title": "The flip", "goal": "Hear it (the outside mic), flip it (the chip), play it (the driver): in the cup the two add up to almost nothing at the eardrum.", "rail": False},
        {"id": "limits", "title": "The catch", "goal": "It must stay in step: easy for long, repeating waves; hard for short ones and sudden ones, drawn to scale and with the arithmetic.", "rail": False},
        {"id": "cushions", "title": "Cushions", "goal": "Why passive isolation still matters: the cushions block the highs the chip cannot.", "rail": False},
        {"id": "recap", "title": "Recap", "goal": "The parts and the steps in one frame, then the line to remember.", "rail": False},
    ],
    "shots": shots,
}
(HERE / "storyboard.json").write_text(json.dumps(board, indent=1, ensure_ascii=False) + "\n")
print(f"{len(shots)} shots, {sum(len(s['frames']) for s in shots)} frames -> storyboard.json")
voice = subprocess.run(["node", str(HERE.parent.parent / "kit" / "audio" / "voice.mjs"), str(HERE), "--retime"], capture_output=True, text=True)
print(voice.stdout[-400:], voice.stderr[-400:])
