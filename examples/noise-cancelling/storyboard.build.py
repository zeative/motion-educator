"""Writes storyboard.json for "How do noise-cancelling headphones erase sound?" (landscape, 1920 x 1080, English).

The film is cut to one take of narration. This script writes the plan: the shots, each with its run of the script
and its drawn frames. The times it writes are a guess; the take sets the real ones, so the script ends by asking the
voice tool to retime the board (it does nothing until a take is there):

    python3 examples/noise-cancelling/storyboard.build.py && node kit/tools/storyboard.mjs examples/noise-cancelling --png

Colour means one thing all film: amber is the noise, cyan (the accent) is the flipped wave the chip makes, white is
what your ear is left with. The numbers drawn are computed here and in film.js from the facts:
  wavelength = 343 m/s / frequency: 100 Hz -> 3.43 m, 5,000 Hz -> 6.86 cm (f4)
  what is left of a tone when its flipped copy is late by d: 2 sin(pi f d) of the tone (f6). With the example delay
  d = 1/30,000 s: 100 Hz -> 2.1 %, 5,000 Hz -> 100 %.
The to-scale shots (s12 to s16) draw 400 px a metre (a 3.43 m wave is 1,372 px), then ten times closer.
"""
import json
import math
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
shots = []

# ── The arithmetic the film draws ────────────────────────────────────────────────────────────────────────────
C = 343.0
DELAY = 1 / 30000
LOW, HIGH = 100, 5000
LAM_LOW, LAM_HIGH = C / LOW, C / HIGH  # 3.43 m, 0.0686 m
LEFT_LOW = 2 * math.sin(math.pi * LOW * DELAY)  # 0.0209
LEFT_HIGH = 2 * math.sin(math.pi * HIGH * DELAY)  # 1.000
PX_M = 400  # the to-scale view: 400 px a metre
PX_M_ZOOM = 4000  # ten times closer


def shot(id, act, type, length=None, **fields):
    """A speaking shot's length is the take's. A silent beat keeps the length it is given here."""
    start = shots[-1]["end"] if shots else 0
    guess = length if length is not None else round(len(fields.get("voice", "")) / 15 + 0.3, 2)
    shots.append({"id": id, "act": act, "type": type, "start": round(start, 3), "end": round(start + guess, 3), **fields, "frames": FRAMES[id]})


def fr(at, note, *draw):
    return {"at": at, "note": note, "draw": list(draw)}


def label(x, y, text, size=34, **more):
    return {"label": [x, y], "text": text, "size": size, **more}


def wave(x0, x1, y, amp, length, colour="orange", phase=0, width=None):
    w = {"wave": [x0, x1, y, amp, length], "colour": colour, "phase": phase}
    if width:
        w["width"] = width
    return w


def flat(x0, x1, y):
    return {"line": [x0, y, x1, y], "colour": "ink", "width": 8}


# ── The cross-section of one ear cup, seen from above (s05, s08, s09, s19, s20) ──────────────────────────────
AXIS = 450
SHELL = {"path": "M1440 170 L1170 170 Q1060 170 1060 280 L1060 620 Q1060 730 1170 730 L1440 730 L1440 650 L1205 650 Q1170 650 1170 615 L1170 285 Q1170 250 1205 250 L1440 250 Z", "colour": "ink", "fill": "ink", "width": 6}
CUSHIONS = [{"path": "M1438 210 a34 62 0 1 0 68 0 a34 62 0 1 0 -68 0", "colour": "ink", "fill": "yellow", "width": 5},
            {"path": "M1438 690 a34 62 0 1 0 68 0 a34 62 0 1 0 -68 0", "colour": "ink", "fill": "yellow", "width": 5}]
HEAD = {"path": "M1506 0 Q1540 450 1506 1080 L1920 1080 L1920 0 Z", "colour": "ink", "fill": "orange", "width": 6}
CANAL = {"path": "M1516 420 L1760 420 Q1790 450 1760 480 L1516 480", "colour": "ink", "width": 5}
SPEAKER = {"path": "M1232 330 L1232 570 L1282 520 L1282 380 Z", "colour": "ink", "fill": "white", "width": 5}
MIC = {"dot": [1050, 300, 16], "colour": "white"}
CHIP = {"path": "M1088 423 h54 v54 h-54 Z", "colour": "ink", "fill": "blue", "width": 5}
TRACE = {"path": "M1052 316 L1052 390 Q1052 450 1088 450 M1142 450 L1232 450", "colour": "blue", "width": 4}
CUP = [HEAD, CANAL, SHELL, *CUSHIONS, SPEAKER, MIC, CHIP, TRACE]
NOISE_OUT = wave(0, 1050, AXIS, 120, 420)

# ── The three lanes (s10, s11) and the chip's panel (s06, s07) ──────────────────────────────────────────────
LANES = [300, 500, 700]

# ── The to-scale view (s12 to s15): 400 px a metre, the listener at x 1640 ───────────────────────────────────
HEAD_X = 1640
TINY_HEAD = [{"dot": [HEAD_X, 470, 31], "colour": "orange"}, {"path": f"M{HEAD_X - 40} 470 a40 46 0 0 1 80 0", "colour": "ink", "width": 6}]
RULER_Y = 700
LAM_LOW_PX = round(LAM_LOW * PX_M)  # 1372
LAM_HIGH_PX = round(LAM_HIGH * PX_M, 1)  # 27.4
LAM_HIGH_ZOOM = round(LAM_HIGH * PX_M_ZOOM)  # 274

CARDS = [
    {"card": [110, 150, 400, 480]}, {"dot": [310, 330, 30], "colour": "white"}, label(310, 560, "1  hear it", 40),
    {"card": [560, 150, 400, 480]}, wave(600, 920, 280, 50, 160), wave(600, 920, 420, 50, 160, "blue", 180), label(760, 560, "2  flip it", 40),
    {"card": [1010, 150, 400, 480]}, flat(1050, 1370, 350), label(1210, 560, "3  add them", 40),
    {"card": [1460, 150, 350, 480]}, {"path": "M1600 260 a34 62 0 1 0 68 0 a34 62 0 1 0 -68 0", "colour": "ink", "fill": "yellow"}, label(1635, 540, "cushions:", 36), label(1635, 590, "the highs", 36),
]

FRAMES = {
    # ── Hook ──────────────────────────────────────────────────────────────────────────────────────────────
    "s01": [
        fr(0.0, "Frame 0 is finished: lit 3D over-ear headphones (generic, no logo) turning slowly on the right; amber rings of a low drone already rolling in from the left edge; the question in metal type on the left, first line in place.",
           {"glow": [1450, 470, 420], "colour": "orange"}, {"ring": [-300, 470, 700], "colour": "orange"}, {"ring": [-300, 470, 1000], "colour": "orange", "dashed": True},
           {"path": "M1210 520 Q1210 160 1450 160 Q1690 160 1690 520", "colour": "ink", "width": 22}, {"path": "M1150 470 h120 v260 h-120 Z", "colour": "ink", "fill": "ink"}, {"path": "M1630 470 h120 v260 h-120 Z", "colour": "ink", "fill": "ink"},
           {"title": [90, 300], "text": "How do noise-cancelling", "size": 84, "align": "start"}, {"move": [80, 900, 700, 900], "text": "drone rolls in"}, {"camera": "push"}),
        fr(0.5, "Each line of the question lands as it is said. The rings reach the headphones and light the cups' rims amber.",
           {"glow": [1450, 470, 420], "colour": "orange"}, {"ring": [-300, 470, 1300], "colour": "orange"}, {"ring": [-300, 470, 1600], "colour": "orange", "dashed": True},
           {"path": "M1210 520 Q1210 160 1450 160 Q1690 160 1690 520", "colour": "ink", "width": 22}, {"path": "M1150 470 h120 v260 h-120 Z", "colour": "ink", "fill": "ink"}, {"path": "M1630 470 h120 v260 h-120 Z", "colour": "ink", "fill": "ink"},
           {"title": [90, 300], "text": "How do noise-cancelling\nheadphones make\na noise disappear?", "size": 84, "align": "start", "accent": "disappear?"}),
        fr(1.0, "The whole question holds; a sheen crosses 'disappear?'. The title lifts away as the headphones slide back and right.",
           {"glow": [1450, 470, 420], "colour": "orange"}, {"path": "M1210 520 Q1210 160 1450 160 Q1690 160 1690 520", "colour": "ink", "width": 22}, {"path": "M1150 470 h120 v260 h-120 Z", "colour": "ink", "fill": "ink"}, {"path": "M1630 470 h120 v260 h-120 Z", "colour": "ink", "fill": "ink"},
           {"title": [90, 300], "text": "How do noise-cancelling\nheadphones make\na noise disappear?", "size": 84, "align": "start", "accent": "disappear?"}, {"cut": "title lifts; headphones recede behind the sum"}),
    ],
    "s02": [
        fr(0.0, "The headphones sit back, dimmed and large, behind three glass cards across the frame. The first card fills with the amber noise wave.",
           {"card": [110, 250, 480, 360]}, wave(150, 550, 430, 90, 200), label(350, 300, "noise", 36), {"camera": "push"}),
        fr(0.5, "On 'adding': a plus, and the second card fills with a cyan wave (the same shape, flipped). On 'more sound' an equals and the third card with a question mark.",
           {"card": [110, 250, 480, 360]}, wave(150, 550, 430, 90, 200), label(350, 300, "noise", 36), label(650, 450, "+", 90),
           {"card": [720, 250, 480, 360]}, wave(760, 1160, 430, 90, 200, "blue", 180), label(960, 300, "more sound", 36), {"move": [600, 700, 760, 700], "text": "it adds"}),
        fr(1.0, "Three cards: noise + more sound = ?. The cut dives into the first card's wave.",
           {"card": [110, 250, 480, 360]}, wave(150, 550, 430, 90, 200), label(350, 300, "noise", 36), label(650, 450, "+", 90),
           {"card": [720, 250, 480, 360]}, wave(760, 1160, 430, 90, 200, "blue", 180), label(960, 300, "more sound", 36), label(1260, 450, "=", 90),
           {"card": [1330, 250, 480, 360]}, {"number": [1570, 490], "text": "?", "size": 160}, {"cut": "dive into the noise card"}),
    ],
    # ── Sound is a wave of pressure ───────────────────────────────────────────────────────────────────────
    "s03": [
        fr(0.0, "The noise card's wave has become the air itself: a field of fine air dots filling the frame, still even. A drone arrives at the left edge and the first dots start to bunch.",
           {"molecules": [60, 110, 1800, 690, 70], "seed": 4}, {"move": [80, 460, 560, 460], "text": "the drone pushes"}, {"camera": "push"}),
        fr(1.0, "On 'pressure': bands of bunched dots (bright) and spread dots (dark) travel to the right across the whole field. A chip 'air' sits at the top left.",
           {"molecules": [60, 110, 1800, 690, 120], "seed": 5}, {"chip": [150, 120], "text": "air"}, {"move": [700, 820, 1300, 820], "text": "the wave travels"}, {"cut": "no cut: the pressure curve draws over the dots"}),
    ],
    "s04": [
        fr(0.0, "The same field; the pressure curve draws over it from left to right, high where the dots bunch, low where they spread.",
           {"molecules": [60, 110, 1800, 690, 120], "seed": 5}, wave(60, 900, 450, 150, 420), label(140, 260, "pressure", 34, align="start")),
        fr(0.5, "On 'squeezed' a chip lands on a crest band; on 'stretched' another on a trough band.",
           {"molecules": [60, 110, 1800, 690, 120], "seed": 5}, wave(60, 1860, 450, 150, 420), {"chip": [470, 230], "text": "squeezed"}, {"chip": [680, 670], "text": "stretched"}),
        fr(1.0, "On 'over and over' the bands keep rolling past; the camera starts to pull back to show where they are heading: an ear cup at the right.",
           {"molecules": [60, 110, 1800, 690, 120], "seed": 5}, wave(60, 1860, 450, 150, 420), {"chip": [470, 230], "text": "squeezed"}, {"chip": [680, 670], "text": "stretched"}, {"camera": "pull"}, {"cut": "pull back: the field becomes the air outside the cup"}),
    ],
    # ── The flip ──────────────────────────────────────────────────────────────────────────────────────────
    "s05": [
        fr(0.0, "The cut through one ear cup, seen from above, fills the right half: graphite shell, foam cushions against the side of the head, the speaker inside, the ear canal. The air and its amber wave fill the left half and roll toward the cup.",
           *CUP, NOISE_OUT, label(1250, 120, "one ear cup, cut through", 32), {"camera": "pull"}),
        fr(0.5, "On 'microphone': the small microphone on the outside of the cup lights; a chip names it with a leader line.",
           *CUP, NOISE_OUT, {"chip": [800, 230], "text": "microphone"}, {"line": [920, 250, 1036, 296]}, {"glow": [1050, 300, 60], "colour": "blue"}),
        fr(1.0, "On 'hears that wave coming in': a copy of the amber wave runs along the trace from the microphone into the chip, which lights.",
           *CUP, NOISE_OUT, {"chip": [800, 230], "text": "microphone"}, {"line": [920, 250, 1036, 296]}, {"move": [1052, 320, 1100, 440], "text": "signal"}, {"glow": [1115, 450, 60], "colour": "blue"}, {"camera": "push"}, {"cut": "dive into the chip"}),
    ],
    "s06": [
        fr(0.0, "Inside the chip: a large glass panel across the frame. Top lane 'in: the noise' carries the amber wave arriving from the microphone.",
           {"panel": [140, 110, 1640, 720], "title": "the chip"}, label(200, 260, "in: the noise", 34, align="start"), wave(200, 1720, 330, 90, 420), {"camera": "push"}),
        fr(1.0, "On 'upside-down copy': the bottom lane 'out: flipped' draws the cyan wave left to right, the same shape upside down.",
           {"panel": [140, 110, 1640, 720], "title": "the chip"}, label(200, 260, "in: the noise", 34, align="start"), wave(200, 1720, 330, 90, 420),
           label(200, 520, "out: flipped", 34, align="start"), wave(200, 1720, 620, 90, 420, "blue", 180), {"move": [200, 760, 1700, 760], "text": "built as it arrives"}, {"cut": "no cut: crests and troughs get linked"}),
    ],
    "s07": [
        fr(0.0, "The same panel. On 'a stretch wherever the noise squeezes': a dashed line drops from an amber crest to the cyan trough under it; a chip 'squeeze' on the crest, 'stretch' on the trough.",
           {"panel": [140, 110, 1640, 720], "title": "the chip"}, wave(200, 1720, 330, 90, 420), wave(200, 1720, 620, 90, 420, "blue", 180),
           {"line": [515, 240, 515, 710], "dashed": True}, {"chip": [515, 200], "text": "squeeze"}, {"chip": [515, 770], "text": "stretch"}),
        fr(0.6, "On 'a squeeze wherever it stretches': the next pair, the other way round. Every crest now has its trough under it.",
           {"panel": [140, 110, 1640, 720], "title": "the chip"}, wave(200, 1720, 330, 90, 420), wave(200, 1720, 620, 90, 420, "blue", 180),
           {"line": [515, 240, 515, 710], "dashed": True}, {"line": [725, 240, 725, 710], "dashed": True}, {"line": [935, 240, 935, 710], "dashed": True}, {"line": [1145, 240, 1145, 710], "dashed": True}),
        fr(1.0, "The cyan wave lifts out of the panel and flies right, toward the speaker.",
           {"panel": [140, 110, 1640, 720], "title": "the chip"}, wave(200, 1720, 330, 90, 420), wave(200, 1720, 620, 90, 420, "blue", 180), {"move": [1200, 620, 1800, 620], "text": "to the speaker"}, {"cut": "pull out to the cup"}),
    ],
    "s08": [
        fr(0.0, "Back at the cut-through cup. The amber noise reaches the cavity past the cushions.",
           *CUP, NOISE_OUT, wave(1282, 1506, AXIS, 70, 420), {"camera": "pull"}),
        fr(1.0, "On 'flipped wave': the speaker's cone pushes and the cyan wave flows from it toward the ear canal, over the amber one.",
           *CUP, NOISE_OUT, wave(1282, 1506, AXIS, 70, 420), wave(1282, 1506, AXIS, 70, 420, "blue", 180), {"chip": [1350, 820], "text": "speaker"}, {"move": [1290, 380, 1500, 380], "text": "flipped wave"}, {"cut": "push in on the ear"}),
    ],
    "s09": [
        fr(0.0, "Closer on the cavity and the ear (1.6 times): amber and cyan side by side between the speaker and the ear canal.",
           {"path": "M1200 0 Q1260 540 1200 1080 L1920 1080 L1920 0 Z", "colour": "ink", "fill": "orange"}, {"path": "M300 160 L300 920", "colour": "ink", "width": 20},
           wave(330, 1200, 540, 140, 670), wave(330, 1200, 540, 140, 670, "blue", 180), {"camera": "push"}),
        fr(1.0, "On 'add up to almost nothing': the two fold into one white line, flat, entering the ear. The air dots inside the cup go even and still. A chip '≈ silence' at the canal.",
           {"path": "M1200 0 Q1260 540 1200 1080 L1920 1080 L1920 0 Z", "colour": "ink", "fill": "orange"}, {"path": "M300 160 L300 920", "colour": "ink", "width": 20},
           flat(330, 1640, 540), {"chip": [1500, 430], "text": "≈ silence"}, {"cut": "the flat line stays, two lanes open above it"}),
    ],
    "s10": [
        fr(0.0, "Three lanes across the frame: the noise (amber), plus the flipped wave (cyan), equals what you hear (white, flat). Each lane has its name on the left.",
           label(130, 300, "noise", 34, align="start"), wave(380, 1790, 300, 80, 420), label(130, 500, "+ flipped", 34, align="start"), wave(380, 1790, 500, 80, 420, "blue", 180),
           label(130, 700, "= you hear", 34, align="start"), flat(380, 1790, 700)),
        fr(1.0, "On 'destructive interference' the name lands in metal type at the top, the accent on 'destructive'.",
           {"title": [960, 170], "text": "destructive interference", "size": 80, "accent": "destructive"}, wave(380, 1790, 300, 80, 420), wave(380, 1790, 500, 80, 420, "blue", 180), flat(380, 1790, 700), {"cut": "no cut: the turn"}),
    ],
    # ── The catch ─────────────────────────────────────────────────────────────────────────────────────────
    "s11": [
        fr(0.0, "On 'But': a hit. The title slides away; the cyan lane starts to slip to the right, a little late.",
           label(130, 300, "noise", 34, align="start"), wave(380, 1790, 300, 80, 420), label(130, 500, "+ flipped", 34, align="start"), wave(380, 1790, 500, 80, 420, "blue", 230),
           label(130, 700, "= you hear", 34, align="start"), wave(380, 1790, 700, 30, 420, "ink"), {"move": [900, 420, 1100, 420], "text": "a little late"}),
        fr(1.0, "On 'in step': it slides back into place and the white line goes flat again. A chip 'in step' lights.",
           wave(380, 1790, 300, 80, 420), wave(380, 1790, 500, 80, 420, "blue", 180), flat(380, 1790, 700), {"chip": [1600, 600], "text": "in step"}, {"cut": "whip to the hum, to scale"}),
    ],
    "s12": [
        fr(0.0, "To scale (400 px a metre, said on screen): a listener's head with headphones, small, at x 1640; a generic engine's dark nacelle at the left edge; one long amber wave of a 100 Hz hum between them.",
           {"path": "M0 330 L180 360 L180 580 L0 610 Z", "colour": "ink", "fill": "ink"}, wave(180, 1600, 470, 110, LAM_LOW_PX), *TINY_HEAD, label(1640, 560, "you", 32),
           label(960, 130, "to scale: 1 m = 400 px", 30), {"camera": "right"}),
        fr(1.0, "On 'engine's drone' a chip '100 Hz hum' sits on the wave. The wave rolls slowly toward you; on 'easy' the head's headphones glow cyan.",
           {"path": "M0 330 L180 360 L180 580 L0 610 Z", "colour": "ink", "fill": "ink"}, wave(180, 1600, 470, 110, LAM_LOW_PX), *TINY_HEAD, {"chip": [700, 300], "text": "100 Hz hum"},
           {"glow": [HEAD_X, 470, 60], "colour": "blue"}, {"cut": "no cut: the ruler draws"}),
    ],
    "s13": [
        fr(0.0, "The same view. A ruler draws under one whole cycle of the wave: '≈ 3.4 m' (343 / 100 = 3.43 m).",
           wave(180, 1600, 470, 110, LAM_LOW_PX), *TINY_HEAD, {"bracket": [228, 228 + LAM_LOW_PX, RULER_Y], "text": "one wave ≈ 3.4 m"}),
        fr(1.0, "On 'keep repeating': the cycle copies itself ahead of the wave, ghosted, again and again; a chip '100 times a second'.",
           wave(180, 1600, 470, 110, LAM_LOW_PX), *TINY_HEAD, {"bracket": [228, 228 + LAM_LOW_PX, RULER_Y], "text": "one wave ≈ 3.4 m"}, {"chip": [960, 860], "text": "the same, 100 times a second"}, {"cut": "the meters panel rises"}),
    ],
    "s14": [
        fr(0.0, "The view dims; a glass panel rises at the left: 'the copy is late by 0.033 ms (an example)'. Two lanes in it: the hum and its flipped copy, a hair late.",
           {"panel": [120, 140, 1000, 640], "title": "100 Hz hum"}, wave(180, 1060, 330, 70, 880), wave(180, 1060, 470, 70, 880, "blue", 181), label(620, 740, "copy late by 0.033 ms (example)", 30)),
        fr(1.0, "On 'match them': two bars on the right, drawn to proportion: 'noise 100%' full, 'left over 2%' a sliver. A chip 'easy'.",
           {"panel": [120, 140, 1000, 640], "title": "100 Hz hum"}, wave(180, 1060, 330, 70, 880), wave(180, 1060, 470, 70, 880, "blue", 181),
           {"bar": [1250, 720, 160, 500], "colour": "orange", "label": "noise 100%"}, {"bar": [1520, 720, 160, 10], "colour": "ink", "label": "left over 2%"}, {"cut": "the panel drops away; the squeak arrives"}),
    ],
    "s15": [
        fr(0.0, "Back to the to-scale view, same 400 px a metre. The long hum fades; a dense amber ripple races in from a small source on the left: a 5,000 Hz squeak.",
           wave(180, 1600, 470, 70, LAM_HIGH_PX * 4), *TINY_HEAD, label(960, 130, "to scale: 1 m = 400 px", 30), {"move": [200, 600, 800, 600], "text": "squeak"}),
        fr(1.0, "On 'harder' the chip '5,000 Hz squeak' lands; the headphones' cyan glow flickers.",
           wave(180, 1600, 470, 70, LAM_HIGH_PX * 4), *TINY_HEAD, {"chip": [700, 300], "text": "5,000 Hz squeak"}, {"camera": "push", "text": "ten times closer"}, {"cut": "zoom ten times onto the head"}),
    ],
    "s16": [
        fr(0.0, "Ten times closer (4,000 px a metre): the side of the head fills the right, the cup on it; the squeak's waves now readable, one every 274 px.",
           {"path": "M1300 0 Q1380 540 1300 1080 L1920 1080 L1920 0 Z", "colour": "ink", "fill": "orange"}, {"path": "M1150 250 h150 v580 h-150 Z", "colour": "ink", "fill": "ink"},
           wave(60, 1150, 540, 120, LAM_HIGH_ZOOM), label(960, 130, "ten times closer: 1 m = 4,000 px", 30), {"camera": "push"}),
        fr(1.0, "On 'centimetres': a ruler under one cycle, '≈ 7 cm' (343 / 5,000 = 6.9 cm): smaller than the ear cup.",
           {"path": "M1300 0 Q1380 540 1300 1080 L1920 1080 L1920 0 Z", "colour": "ink", "fill": "orange"}, {"path": "M1150 250 h150 v580 h-150 Z", "colour": "ink", "fill": "ink"},
           wave(60, 1150, 540, 120, LAM_HIGH_ZOOM), {"bracket": [300, 300 + LAM_HIGH_ZOOM, 760], "text": "one wave ≈ 7 cm"}, {"cut": "the meters panel rises again"}),
    ],
    "s17": [
        fr(0.0, "The same panel as s14, now for the squeak: the same delay, 0.033 ms, is a sixth of a cycle here, so the cyan copy sits visibly out of step.",
           {"panel": [120, 140, 1000, 640], "title": "5,000 Hz squeak"}, wave(180, 1060, 330, 70, 220), wave(180, 1060, 470, 70, 220, "blue", 240), label(620, 740, "same delay: 0.033 ms (example)", 30)),
        fr(1.0, "On 'out of step': the bars, to proportion: 'noise 100%', 'left over 100%': nothing cancelled. The 2% sliver of the hum stays beside them, faint, for comparison.",
           {"panel": [120, 140, 1000, 640], "title": "5,000 Hz squeak"}, wave(180, 1060, 330, 70, 220), wave(180, 1060, 470, 70, 220, "blue", 240),
           {"bar": [1250, 720, 160, 500], "colour": "orange", "label": "noise 100%"}, {"bar": [1520, 720, 160, 500], "colour": "ink", "label": "left over 100%"}, {"cut": "a clatter cuts in"}),
    ],
    "s18": [
        fr(0.0, "A full-width trace: a sudden clatter, an irregular burst of spikes arriving from the left, nothing like a repeating wave. Above it 'sudden clatter'.",
           {"curve": [[100, 400], [300, 400], [330, 250], [360, 560], [390, 300], [420, 480], [460, 400], [700, 400]], "colour": "orange"}, label(160, 200, "sudden clatter", 36, align="start")),
        fr(0.6, "The cyan copy follows a beat behind and never matches; the white line under them stays jagged.",
           {"curve": [[100, 400], [600, 400], [630, 250], [660, 560], [690, 300], [720, 480], [760, 400], [1800, 400]], "colour": "orange"},
           {"curve": [[100, 400], [700, 400], [730, 560], [760, 250], [790, 500], [820, 320], [860, 400], [1800, 400]], "colour": "blue"},
           {"curve": [[100, 700], [600, 700], [640, 600], [680, 820], [720, 600], [760, 780], [800, 620], [860, 700], [1800, 700]], "colour": "ink"}, {"chip": [1400, 560], "text": "too late"}),
        fr(1.0, "Another burst, another miss. The cut pulls back to the cup.",
           {"curve": [[100, 400], [1100, 400], [1130, 250], [1160, 560], [1190, 300], [1220, 480], [1260, 400], [1800, 400]], "colour": "orange"},
           {"curve": [[100, 700], [1100, 700], [1140, 600], [1180, 820], [1220, 600], [1260, 780], [1300, 620], [1360, 700], [1800, 700]], "colour": "ink"}, {"cut": "pull back to the cup"}),
    ],
    "s18b": [],
    # ── Cushions ──────────────────────────────────────────────────────────────────────────────────────────
    "s19": [
        fr(0.0, "The cut-through cup again. The two foam cushions brighten and swell slightly; a chip 'cushions' with leader lines to both.",
           *CUP, {"chip": [1250, 900], "text": "cushions"}, {"line": [1340, 870, 1472, 752]}, {"glow": [1472, 210, 80], "colour": "yellow"}, {"glow": [1472, 690, 80], "colour": "yellow"}),
        fr(1.0, "The camera settles; the shell and cushions hold the lit cyan rim.",
           *CUP, {"chip": [1250, 900], "text": "cushions"}, {"line": [1340, 870, 1472, 752]}, {"camera": "push"}, {"cut": "no cut: two kinds of sound arrive"}),
    ],
    "s20": [
        fr(0.0, "Two sounds arrive from the left on two lanes: an upper dense squeak (short waves) and a lower long hum.",
           *CUP, wave(0, 1050, 300, 60, 60), wave(0, 1050, 600, 100, 420)),
        fr(0.5, "On 'high, sharp sounds': the squeak hits the shell and cushions and comes out inside much smaller. A chip 'highs: blocked'.",
           *CUP, wave(0, 1050, 300, 60, 60), wave(1282, 1500, 300, 12, 60), wave(0, 1050, 600, 100, 420), {"chip": [520, 180], "text": "highs: blocked by the cushions"}),
        fr(1.0, "On 'the chip can't catch': the hum passes in and is met by the cyan wave; the line to the ear goes flat. A chip 'lows: cancelled by the chip'.",
           *CUP, wave(0, 1050, 300, 60, 60), wave(1282, 1500, 300, 12, 60), wave(0, 1050, 600, 100, 420), flat(1282, 1500, 600), {"chip": [520, 180], "text": "highs: blocked by the cushions"}, {"chip": [520, 760], "text": "lows: cancelled by the chip"}, {"cut": "the cup shrinks into the recap"}),
    ],
    # ── Recap ─────────────────────────────────────────────────────────────────────────────────────────────
    "s21": [
        fr(0.0, "Four glass cards rise in a row: 1 hear it (the microphone), 2 flip it (amber over cyan), 3 add them (a flat line), and a narrower fourth: cushions for the highs.",
           *CARDS[:3], {"move": [310, 780, 310, 660], "text": "cards rise"}),
        fr(1.0, "All four cards in place, each lit as the voice reaches it.",
           *CARDS, {"cut": "cards part; the headphones come forward"}),
    ],
    "s22": [
        fr(0.0, "The 3D headphones come forward through the parted cards, centre; an amber ring meets a cyan ring around the cups.",
           {"glow": [960, 450, 420], "colour": "blue"}, {"path": "M720 500 Q720 140 960 140 Q1200 140 1200 500", "colour": "ink", "width": 22},
           {"path": "M660 450 h120 v260 h-120 Z", "colour": "ink", "fill": "ink"}, {"path": "M1140 450 h120 v260 h-120 Z", "colour": "ink", "fill": "ink"}, {"ring": [960, 520, 470], "colour": "orange"}, {"ring": [960, 520, 430], "colour": "blue"}),
        fr(1.0, "On 'right on time': the rings close on each other and vanish; a soft flash, then stillness.",
           {"glow": [960, 450, 420], "colour": "blue"}, {"path": "M720 500 Q720 140 960 140 Q1200 140 1200 500", "colour": "ink", "width": 22},
           {"path": "M660 450 h120 v260 h-120 Z", "colour": "ink", "fill": "ink"}, {"path": "M1140 450 h120 v260 h-120 Z", "colour": "ink", "fill": "ink"}, {"camera": "pull"}, {"cut": "the poster line lands"}),
    ],
    "s23": [
        fr(0.0, "The poster: the headphones on the right, still turning slowly; on the left the line to remember in metal type, the accent on 'silence'; under it the three lanes small: amber + cyan = flat white.",
           {"path": "M1240 500 Q1240 140 1480 140 Q1720 140 1720 500", "colour": "ink", "width": 22}, {"path": "M1180 450 h120 v260 h-120 Z", "colour": "ink", "fill": "ink"}, {"path": "M1660 450 h120 v260 h-120 Z", "colour": "ink", "fill": "ink"},
           {"title": [110, 340], "text": "Noise + its flip\n= silence", "size": 110, "align": "start", "accent": "silence"}, wave(120, 520, 700, 40, 200), label(560, 712, "+", 50), wave(600, 1000, 700, 40, 200, "blue", 180)),
        fr(1.0, "It holds, breathing: a slow push, a sheen across the line, the bed's last chord.",
           {"path": "M1240 500 Q1240 140 1480 140 Q1720 140 1720 500", "colour": "ink", "width": 22}, {"path": "M1180 450 h120 v260 h-120 Z", "colour": "ink", "fill": "ink"}, {"path": "M1660 450 h120 v260 h-120 Z", "colour": "ink", "fill": "ink"},
           {"title": [110, 340], "text": "Noise + its flip\n= silence", "size": 110, "align": "start", "accent": "silence"}, flat(120, 1000, 800), {"camera": "push"}),
    ],
}

# The middle frame of every two-frame shot: the event the shot exists for, drawn on the state it ends in.
MID = {
    "s03": "Mid-line: the first bands of bunched dots have crossed a third of the field; behind them the dots still rock.",
    "s06": "Half way: the cyan wave has drawn under the first two cycles of the amber one, a beat behind its arrival.",
    "s08": "On 'plays': the speaker's cone pushes out; the cyan wave leaves it, half way to the ear.",
    "s09": "On 'add up': the amber and cyan waves slide onto one line; the white sum starts to draw from the speaker side.",
    "s10": "The name half typed; the three lanes roll in step.",
    "s11": "The slip at its widest: the cyan lane a fifth of a cycle late, the white lane rippling, the chip 'a little late'.",
    "s12": "On 'hum' the chip lands on the wave; the wave rolls a little toward the head.",
    "s13": "The ruler complete under one cycle; the first ghost copy slides out ahead of the wave.",
    "s14": "The copy has lined up a hair behind the hum; the two bars start to grow.",
    "s15": "The ripple has crossed half the space; the long hum is almost gone.",
    "s16": "The zoom settling: the ripple's crests sharpen into readable waves.",
    "s17": "The copy slides into its late place, a sixth of a cycle behind; the left-over bar starts to grow.",
    "s19": "On 'cushions': both cushions swell and light; the chip pops.",
    "s21": "The third card lands; the fourth is rising.",
    "s22": "On 'flipped': the cyan ring appears just inside the amber one; both start to close on the cups.",
    "s23": "The line complete; the sheen crosses 'silence'.",
}
FRAMES["s18b"] = [dict(FRAMES["s18"][1], at=0.0), dict(FRAMES["s18"][1], at=0.5, note="On 'faster': a second burst arrives; the copy answers late again."), dict(FRAMES["s18"][2], at=1.0)]
FRAMES["s18"] = [FRAMES["s18"][0], fr(1.0, "The first burst has passed; the white line under it took the whole burst. The cyan copy is about to try.", *FRAMES["s18"][0]["draw"], {"curve": [[100, 700], [300, 700], [330, 550], [360, 860], [390, 600], [420, 780], [460, 700], [1800, 700]], "colour": "ink"}, {"cut": "no cut: the copy tries"})]
for sid, note in MID.items():
    first, last = FRAMES[sid][0], FRAMES[sid][-1]
    if len(FRAMES[sid]) == 2:
        keep = [d for d in last["draw"] if not ("cut" in d or "camera" in d)]
        FRAMES[sid].insert(1, fr(0.5, note, *keep, {"move": [760, 1000, 1160, 1000], "text": "the event"} if sid in ("s10", "s23") else {"camera": "push"}))

# ── The shots ────────────────────────────────────────────────────────────────────────────────────────────────
CUP_SCREEN = ("The cut through one ear cup, seen from above, filling the right half: a graphite shell (x 1060 to 1440, y 170 to 730) open toward the head, "
              "two foam cushions where it meets the side of the head (x 1440 to 1506), skin from x 1506 with the ear canal at y 450, the speaker's cone inside at x 1232, "
              "a small microphone on the outside of the shell at (1050, 300) and the chip in the shell's back wall at (1115, 450), joined by thin glowing traces. "
              "A small note 'one ear cup, cut through · not to scale'.")

shot("s01", "hook", "object3d",
     voice="How do noise-cancelling headphones make a noise *disappear?*", caption=False,
     teaches="Asks the one question, over the thing itself: a pair of headphones in a room full of drone.",
     screen="Generic over-ear headphones in lit 3D (graphite cups, soft cushions, a brushed band, no logo or brand) turning slowly at the right, about 700 px tall. Amber rings of pressure roll in from the left edge across the floor. On the left the question in metal type, three lines at 84 px, the accent on 'disappear?'. No caption pill: the title is the spoken line.",
     motion="Frame 0 is finished and moving: the rings already rolling, the headphones mid-turn, the first line arriving. Each line of the title types in as it is said. A sheen across 'disappear?' at the end; a slow push all through.",
     carries="The headphones (they stay, dimmed, behind the next shot) and the amber of the noise.",
     transition="The title lifts out by character; the headphones slide back and darken while three cards rise in front.",
     sound="The bed from the first frame. A soft low swell under the rings; nothing on the words.",
     check="Frame 0 is a finished picture. No brand, logo or real product shape. The title is fully readable for a second before it leaves.",
     facts=["f1", "f2"])

shot("s02", "hook", "compare",
     voice="Surprisingly, they do it by *adding* more sound.",
     teaches="The surprise that frames the film: the headphones make the noise go away by adding sound, not only by blocking it.",
     screen="Three glass cards across the frame (x 110 to 1810, y 250 to 610): 'noise' with the amber wave, '+', 'more sound' with a cyan wave of the same shape flipped, '=', and a third card holding a large question mark. Behind them the headphones, dimmed and soft.",
     motion="The cards land left to right with the words: the first as the shot opens, the plus and the second card on 'adding', the equals and the question mark on 'more sound'. The waves inside the cards roll slowly.",
     carries="The amber wave of the first card: the camera dives into it.",
     transition="A dive into the first card: its wave grows to fill the frame and becomes the air.",
     sound="A soft card landing for each card, between the words where it can be.",
     check="The cyan wave is exactly the amber wave upside down (same length, same height). The question mark stays a question here: the answer comes in s09.",
     facts=["f2"])

shot("s03", "wave", "macro",
     voice="Sound is a wave of *pressure:*",
     teaches="What a sound is: air pushed together and pulled apart, travelling.",
     screen="A field of fine air dots fills the frame (x 60 to 1860, y 110 to 800), lit from above. A drone arrives from the left: bands where the dots bunch (brighter, amber-tinted) and bands where they spread (darker) travel right. A small chip 'air' at the top left.",
     motion="The dots start even at the left; the first band of bunching rolls in on 'Sound'. By 'pressure' the bands fill the field and travel at a steady slow speed. Each dot only rocks back and forth: none travels with the wave. A slow push.",
     carries="The field of dots, still rolling.",
     transition="No cut: the pressure curve draws over the same dots.",
     sound="A whoosh on the dive, before the line.",
     check="The dots rock in place (their rest positions do not drift); the bands travel. No two dots overlap into a blob.",
     facts=["f1"])

shot("s04", "wave", "diagram",
     voice="the air gets *squeezed,* then *stretched,* over and over.",
     teaches="Squeezed is high pressure, stretched is low: the wave's curve is the pressure of the air.",
     screen="The same field. Over it the pressure curve in amber, drawn left to right, high over the bunched bands and low over the spread ones, labelled 'pressure' on the left. Two chips: 'squeezed' over a crest band, 'stretched' over a trough band.",
     motion="The curve draws during 'the air gets'; 'squeezed' pops on its crest band as the word is said, 'stretched' on its trough band. The chips ride with their bands for a moment, then hold. On 'over and over' the camera starts to pull back.",
     carries="The amber curve and the moving air: they become the air outside the ear cup.",
     transition="The camera pulls back and the cut-through ear cup slides in on the right.",
     sound="No effect under the words.",
     check="The curve's highs sit exactly over the bunched bands. Chips at 30 px or more, readable against the dots.",
     facts=["f1"])

shot("s05", "cancel", "wide",
     voice="A tiny *microphone* on the outside of each ear cup hears that wave coming in.",
     teaches="Step one: the headphones listen to the noise before it reaches you.",
     screen=CUP_SCREEN + " The air field and its amber curve fill the left half and roll into the cup. A chip 'microphone' with a leader to it.",
     motion="The pull back settles in the first 0.6 s. On 'microphone' it lights cyan and its chip pops. On 'hears that wave coming in' a small copy of the amber wave runs along the trace from the microphone into the chip, which lights.",
     carries="The chip, lit.",
     transition="A push into the chip: it grows to fill the frame and becomes a glass panel.",
     sound="A small click when the microphone lights, after 'microphone'.",
     check="The microphone is on the outside of the shell, facing the noise. The shell, cushions and head read as a cut-through drawing, labelled not to scale.",
     facts=["f2", "f7"])

shot("s06", "cancel", "macro",
     voice="Then a chip builds an *upside-down* copy:",
     teaches="Step two: the chip makes the same wave upside down.",
     screen="A glass panel across the frame titled 'the chip' (x 140 to 1780, y 110 to 830). Top lane 'in: the noise' with the amber wave; bottom lane 'out: flipped' with the cyan wave drawn under it, the same shape upside down.",
     motion="The amber wave flows in from the left. On 'upside-down copy' the cyan wave draws from left to right just behind the amber one's arrival, as if built as it comes in.",
     carries="Both lanes.",
     transition="No cut: crests and troughs get linked.",
     sound="A whoosh into the chip before the line.",
     check="The cyan wave is the amber wave times minus one, at the same x. The panel fills the frame.",
     facts=["f2"])

shot("s07", "cancel", "diagram",
     voice="a *stretch* wherever the noise squeezes, and a *squeeze* wherever it stretches.",
     teaches="What flipped means: every high of the noise gets a low, every low a high.",
     screen="The same panel. Dashed vertical lines from amber crests down to the cyan troughs under them and from troughs to crests. Two chips on the first pair: 'squeeze' on the amber crest, 'stretch' on the cyan trough; then the next pair the other way round.",
     motion="The first dashed line drops on 'a stretch wherever the noise squeezes', its two chips pop; the second pair on 'a squeeze wherever it stretches'; then the remaining links draw quickly across. At the end the cyan wave lifts and slides right.",
     carries="The cyan wave, flying right toward the speaker.",
     transition="A pull back out of the chip to the cut-through cup; the cyan wave lands in the speaker.",
     sound="No effect under the words.",
     check="Each dashed line is vertical and joins a crest to the trough directly under it.",
     facts=["f2"])

shot("s08", "cancel", "wide",
     voice="The speaker plays that *flipped* wave into your ear,",
     teaches="Step three: the flipped wave is played into the same space the noise fills.",
     screen=CUP_SCREEN + " Inside the cup the amber noise (what gets past the shell) runs from the speaker to the ear; the cyan wave flows from the speaker's cone over it, toward the ear canal. A chip 'speaker'.",
     motion="The pull back settles; the cone pushes on 'plays'; the cyan wave flows from it on 'flipped wave' and reaches the canal on 'your ear'.",
     carries="The two waves inside the cup.",
     transition="A push in on the space between the speaker and the ear.",
     sound="No effect under the words.",
     check="Inside the cup the two waves have the same length and height and are opposite at every x.",
     facts=["f2", "f7"])

shot("s09", "cancel", "macro",
     voice="and the two add up to *almost nothing.*", hold=0.55,
     teaches="The result: noise plus its flip is near silence.",
     screen="1.6 times closer on the cavity: the speaker's edge at the left, the ear at the right. The amber and cyan waves fold into one white line that is flat; the air dots inside the cup go even and still. A chip '≈ silence' at the ear canal.",
     motion="On 'add up' the two waves slide onto each other and the white sum draws; on 'almost nothing' it lies flat (a tiny ripple left, not zero) and the chip pops. A soft cyan bloom on the canal.",
     carries="The flat white line: it becomes the bottom lane of the next shot.",
     transition="The camera pulls up; two lanes open above the flat line.",
     sound="THE PAYOFF of the mechanism: a soft, deep hit after 'nothing', with the bed ducked.",
     check="The white line is the sum of the two drawn waves at every x. It is close to flat, not perfectly flat (the voice says 'almost').",
     facts=["f2", "f3"])

shot("s10", "cancel", "compare",
     voice="Physicists call it *destructive interference.*", hold=0.45,
     teaches="Names what was just seen.",
     screen="Three lanes across the frame: 'noise' (amber) at y 300, '+ flipped' (cyan) at y 500, '= you hear' (white, flat) at y 700, names at the left at 34 px. At the top, in metal type at 80 px, 'destructive interference', the accent on 'destructive'.",
     motion="The lanes are in place as the shot opens; the name types in as it is said; a sheen across it. The waves roll.",
     carries="The three lanes.",
     transition="No cut: the turn happens on the same lanes.",
     sound="A shimmer as the name's sheen crosses it, after the line.",
     check="The third lane is the sum of the first two.",
     facts=["f2"])

shot("s11", "limits", "diagram",
     voice="*But* the copy has to stay exactly *in step.*",
     teaches="The catch: cancelling only works if the flipped wave is lined up with the noise.",
     screen="The same three lanes; the name gone. The cyan lane slips to the right (late); the white lane grows a ripple at once. Then it slides back and the white lane goes flat. A chip 'a little late' while it slips, 'in step' when it returns.",
     motion="On 'But' a hit; the cyan lane slips a fifth of a cycle and the white ripple grows from the sum. On 'in step' it slides back; the ripple dies.",
     carries="The amber wave.",
     transition="A whip to the right into the to-scale view.",
     sound="THE TURN: a deep hit in the pause before 'But'.",
     check="At every moment the white lane is the sum of the two above it.",
     facts=["f6"])

shot("s12", "limits", "wide",
     voice="With a steady, low *hum,* like an engine's drone, that's easy.",
     teaches="Low steady sounds are the easy case.",
     screen="To scale, with the scale on screen ('to scale: 1 m = 400 px'): at the left edge the dark nacelle of a generic engine; at x 1640 a listener's head with headphones, small (15 cm wide is 62 px); between them one long amber wave of a 100 Hz hum, one cycle 1,372 px long. A chip '100 Hz hum'. The headphones glow cyan on 'easy'.",
     motion="The whip lands; the wave rolls slowly toward the head; the chip pops on 'hum'; on 'easy' the headphones glow.",
     carries="The wave and the head.",
     transition="No cut: the ruler draws.",
     sound="A whoosh on the whip, before the line.",
     check="The head and the wave are both at 400 px a metre: 3.43 m is 1,372 px.",
     facts=["f3", "f4", "f8"])

shot("s13", "limits", "diagram",
     voice="Its waves are *metres* long and keep repeating,",
     teaches="A low hum's waves are metres long and the same every time.",
     screen="The same view. A ruler under one full cycle, '≈ 3.4 m'. Then ghosted copies of that cycle stack ahead of the wave, one after another; a chip 'the same, 100 times a second'.",
     motion="The ruler draws from crest to crest on 'metres'; on 'keep repeating' three ghost copies slide out ahead in rhythm.",
     carries="The wave, dimmed.",
     transition="A glass panel rises over the dimmed view.",
     sound="No effect under the words.",
     check="The ruler spans exactly one cycle (1,372 px). 343 / 100 = 3.43 m.",
     facts=["f4"])

shot("s14", "limits", "chart",
     voice="so the chip has time to *match* them.",
     teaches="With a hum, even a copy that is a little late still cancels almost all of it.",
     screen="A glass panel on the left, '100 Hz hum': the amber wave and its cyan copy under it, late by an example delay, 'copy late by 0.033 ms (example)'. On the right two bars drawn to proportion: 'noise 100%' and 'left over 2%' (a sliver).",
     motion="The panel rises; the copy lines up a hair behind; on 'match' the bars grow, the left-over bar stops at 2% of the noise bar's height.",
     carries="The panel and its bars, which the squeak will reuse.",
     transition="The panel drops; the to-scale view returns with a new sound.",
     sound="A soft tick when the bars lock, after 'them'.",
     check="2 x sin(pi x 100 x 0.0000333) = 2.1%: the sliver is 2.1% of the full bar. The delay is labelled an example.",
     facts=["f6"])

shot("s15", "limits", "wide",
     voice="A *high-pitched* squeak is harder.",
     teaches="High sounds are the hard case.",
     screen="The same to-scale view (1 m = 400 px). The long hum has faded; a dense amber ripple of a 5,000 Hz squeak fills the space from a small source on the left to the head: one cycle every 27 px. A chip '5,000 Hz squeak'.",
     motion="The ripple races in on 'high-pitched'; the chip pops; on 'harder' the headphones' cyan glow flickers.",
     carries="The head and the ripple.",
     transition="A zoom ten times onto the head.",
     sound="No effect under the words.",
     check="One cycle is 27.4 px (6.86 cm at 400 px a metre).",
     facts=["f3", "f4"])

shot("s16", "limits", "macro",
     voice="Its waves are only a few *centimetres* long,",
     teaches="A squeak's waves are shorter than the ear cup itself.",
     screen="Ten times closer (1 m = 4,000 px, on screen): the side of the head at the right, the cup on it, the squeak's waves readable, one every 274 px. A ruler under one cycle: '≈ 7 cm'.",
     motion="The zoom settles in 0.6 s; the ruler draws on 'centimetres'.",
     carries="The squeak.",
     transition="The panel from s14 rises again, now for the squeak.",
     sound="A whoosh on the zoom, before the line.",
     check="274 px a cycle at 4,000 px a metre is 6.86 cm. The cup is drawn about 9 cm across.",
     facts=["f4", "f8"])

shot("s17", "limits", "chart",
     voice="so the tiniest delay knocks the copy out of *step.*",
     teaches="The same small delay that cancelled the hum cancels none of the squeak.",
     screen="The same panel, now '5,000 Hz squeak': the amber wave and its cyan copy, 'same delay: 0.033 ms (example)', which here is a sixth of a cycle: visibly out of step. Bars to proportion: 'noise 100%', 'left over 100%'. The hum's 2% sliver stays faint beside them for comparison.",
     motion="The panel rises; the copy slips into its late place; on 'out of step' the left-over bar grows to the full height.",
     carries="Nothing: a hard cut.",
     transition="A hard cut on a sudden clatter.",
     sound="No effect under the words.",
     check="2 x sin(pi x 5,000 x 0.0000333) = 2 sin(30 degrees) = 1.00: the left-over bar is as tall as the noise bar.",
     facts=["f6"])

shot("s18", "limits", "diagram",
     voice="A *sudden* clatter is harder still:",
     teaches="Sudden sounds are the third case: nothing like a steady wave.",
     screen="Two lanes across the frame: an amber trace, flat, then an irregular burst of spikes (a clatter) arriving from the left; under it the white 'you hear' line. Label 'sudden clatter' at the top left.",
     motion="The burst arrives on 'sudden', out of a flat line; the white line takes it in full.",
     carries="The trace and its lanes.",
     transition="No cut: the copy tries to follow.",
     sound="The clatter is drawn, not heard: no effect under the words.",
     check="The white lane is the sum of the lanes above it.",
     facts=["f3"])

shot("s18b", "limits", "chart",
     voice="it changes *faster* than the chip can follow.",
     teaches="A sudden sound never repeats, so the copy is always too late.",
     screen="The same lanes: the cyan copy now under the amber, a beat behind and wrong; the white 'you hear' line stays jagged. A chip 'too late' on the copy.",
     motion="The cyan copy answers the first burst a beat late and wrongly; a second burst on 'faster', another miss; the white line stays jagged.",
     carries="The amber bursts.",
     transition="Pull back to the cut-through cup.",
     sound="No effect under the words.",
     check="The white lane is the sum of the two above it. The copy is visibly late.",
     facts=["f3"])

shot("s19", "cushions", "wide",
     voice="That's why the soft *cushions* still matter.",
     teaches="The cushions are the other half of the system.",
     screen=CUP_SCREEN + " The two cushions brighten; a chip 'cushions' with leader lines to both.",
     motion="The pull back settles; the cushions swell slightly and light on 'cushions'; the chip pops.",
     carries="The cup.",
     transition="No cut: two sounds arrive.",
     sound="A soft pop when the cushions light, after 'cushions'.",
     check="The cushions sit between the shell and the head, top and bottom.",
     facts=["f5"])

shot("s20", "cushions", "diagram",
     voice="They block the *high,* sharp sounds the chip can't catch.", hold=0.4,
     teaches="The cushions and shell block the highs; the chip cancels the lows: they share the work.",
     screen=CUP_SCREEN + " Two lanes arrive from the left: an upper dense squeak and a lower long hum. Inside the cup the squeak comes out much smaller (labelled 'highs: blocked by the cushions'); the hum comes in, is met by the cyan wave and goes flat ('lows: cancelled by the chip').",
     motion="The two lanes roll in; on 'high' the squeak meets the shell and comes out inside much smaller; on 'can't catch' the hum is met by cyan and goes flat; the two chips pop in turn.",
     carries="The cup, which shrinks into the recap.",
     transition="The scene recedes as four recap cards rise.",
     sound="No effect under the words.",
     check="The squeak inside is drawn smaller but not gone (the sizes are an illustration, said in the label 'illustration'). The hum line inside is flat.",
     facts=["f3", "f5"])

shot("s21", "recap", "recap",
     voice="So that's the answer: your headphones erase a noise with its *own wave,*",
     teaches="The three steps and the cushions, in one frame.",
     screen="Four glass cards in a row (y 150 to 630): '1 hear it' with the microphone; '2 flip it' with amber over cyan; '3 add them' with the flat white line; and a narrower fourth, 'cushions: the highs', with a cushion.",
     motion="The cards rise one after another in the first second; each lights as the voice reaches it.",
     carries="The headphones behind the cards.",
     transition="The cards part to the sides as the headphones come forward.",
     sound="A soft card sound for each card, between the words where possible.",
     check="Every small picture matches its big one (the flip card's cyan is the amber upside down).",
     facts=["f2", "f5"])

shot("s22", "recap", "object3d",
     voice="flipped upside down and played right on *time.*",
     teaches="The answer, said once more over the object.",
     screen="The 3D headphones forward, centre, 900 px wide. Around the cups an amber ring and a cyan ring close on each other.",
     motion="The headphones come forward and turn; on 'flipped' the cyan ring appears inside the amber; on 'right on time' they meet and vanish together, a soft flash.",
     carries="The headphones.",
     transition="The poster line types in beside them.",
     sound="The payoff hit as the rings meet, after 'time'.",
     check="No brand or logo. The rings vanish together.",
     facts=["f2"])

shot("s23", "recap", "endcard", 3.2,
     teaches="The line to remember.",
     screen="The poster: the headphones on the right, turning slowly; on the left in metal type at 110 px 'Noise + its flip' and '= silence', the accent on 'silence'. Under it the three lanes small: amber + cyan = flat white.",
     motion="The line types in; a sheen; a slow push and the headphones' turn keep it breathing to the last frame.",
     carries="The end.",
     transition="The end: the bed's last chord rings out under the last frame.",
     sound="The bed resolves on its last chord, still sounding on the last frame.",
     check="Readable for more than two seconds. The sound runs to the last frame.",
     facts=["f2"])

duration = shots[-1]["end"]

storyboard = {
    "title": "How do noise-cancelling headphones erase sound?",
    "question": "How do noise-cancelling headphones make a noise disappear?",
    "audience": "Curious adults and teenagers anywhere, watching on a phone, English as a first or second language. Many own or have tried noise-cancelling headphones; they think the headphones just block sound, like earmuffs, and have not heard of anti-noise.",
    "promise": "The headphones listen to the noise, make the same wave flipped upside down, and play it so the two add up to almost nothing. That works on steady low hums, whose waves are long and repeat; it fails on high or sudden sounds, so the cushions still block those.",
    "language": "en",
    "format": "1920x1080",
    "subtitles": True,
    "duration": round(duration, 3),
    "fps": 60,
    "poster": round(duration - 1.2, 3),
    "voice": {"voice_id": "MnTN9XubPKNlI4AwhLj5", "name": "Craig - Warm, Articulate, Conversational", "model": "eleven_v4", "language": "en", "direction": "[warmly]"},
    "look": {
        "accent": "#3fe0ff",
        "accent2": "#ffb547",
        "mood": "A quiet graphite studio. Amber is always the noise, cyan (the accent) is the flipped wave the chip makes, white is what your ear is left with. The stage light starts warm on the drone, turns cyan when the chip answers, and goes still and pale when the two cancel; it stays amber through the catch, and turns cyan again on the answer. The headphones are lit 3D: matte graphite cups, soft dark cushions, a brushed metal band, no logo.",
    },
    "music": {
        "track": "composed for the film (music/bed.mp3)",
        "bpm": 80,
        "start": 0,
        "note": "A bed composed for this film after the take, at its length: sparse, calm and curious, no lead melody, an even level. The cuts follow the take, not a beat. Kept low under the voice.",
    },
    "facts": [
        {"id": "f1", "claim": "Sound in air is a pressure wave: the air is pushed together (compressions, higher pressure) and pulled apart (rarefactions, lower pressure) in turn, and that pattern travels, at about 343 m/s in air at 20 °C. Each bit of air only rocks back and forth about where it is; the pattern is what travels.",
         "source": "Standard acoustics (Kinsler, Frey et al., Fundamentals of Acoustics, 4th ed., ch. 5); speed of sound 331.3 x sqrt(1 + 20/273.15) = 343.2 m/s. From the textbook, not looked up in this session."},
        {"id": "f2", "claim": "Active noise cancellation: a microphone picks up the incoming noise, the electronics make a signal of the opposite phase (the same wave upside down, 'anti-noise'), and the speaker plays it with your audio. Where the noise is high the anti-noise is low, so they add up to much less: destructive interference. The film's 'add up to almost nothing' is said of the steady hum it shows.",
         "source": "Kuo and Morgan, 'Active noise control: a tutorial review', Proc. IEEE 87(6), 943-973, 1999 (abstract: anti-noise from secondary sources); HowStuffWorks, 'How noise-canceling headphones work'; BBC Science Focus, 'How do noise-cancelling headphones cancel sounds?'. Read through search summaries; the pages could not be opened from this session."},
        {"id": "f3", "claim": "ANC works best on steady, low-frequency noise (engine hum, air conditioning) and less well on higher frequencies and on sudden or quickly changing sounds (voices, clatter). NIOSH describes ANC as aimed at low-frequency noise, typically 500 Hz and below. No dB figure is stated in the film: published figures vary widely by product and test (consumer sources give anything from 10 to 40 dB), so none is used.",
         "source": "CDC/NIOSH record stacks.cdc.gov/view/cdc/210761 (ANC 'typically at 500 Hz and below'); Sennheiser support, 'What impacts ANC performance'; Sonos, 'How do noise-canceling headphones work'; TechRadar, 'What is active noise cancellation'. All read through search summaries; stacks.cdc.gov and the others could not be opened from this session."},
        {"id": "f4", "claim": "Wavelength = speed / frequency. A 100 Hz hum: 343 / 100 = 3.43 m, said 'metres long', shown '≈ 3.4 m'. A 5,000 Hz squeak: 343 / 5,000 = 0.0686 m, said 'a few centimetres', shown '≈ 7 cm'. 100 Hz repeats 100 times a second. The two frequencies are examples chosen for the film, not measurements of a particular engine or squeak.",
         "source": "Arithmetic from f1."},
        {"id": "f5", "claim": "The cups and cushions block sound passively, and passive isolation works better at mid and high frequencies than at low ones; so passive isolation handles the highs and ANC the lows. The film shows the squeak coming through smaller, as an illustration, without a figure.",
         "source": "Sonos, 'How do noise-canceling headphones work' (cushions passively block high frequencies; ANC the lowest); Logitech blog, 'Passive noise isolation vs active noise cancellation' (passive works on mid to high frequencies); Sennheiser support. Read through search summaries."},
        {"id": "f6", "claim": "Why a delay matters more for a high sound: if a tone's flipped copy is late by a time d, what is left is 2 sin(pi f d) of the tone's size. With an example delay d = 1/30,000 s (0.033 ms): at 100 Hz, 2 sin(pi x 100 / 30,000) = 0.021, about 2% left; at 5,000 Hz, 2 sin(pi x 5,000 / 30,000) = 2 sin(30 degrees) = 1.00, nothing cancelled. The delay is an illustration, not a measured figure for any headphone; real headphones are designed so their cancelling fades out at high frequencies instead of adding noise there.",
         "source": "Arithmetic (sum of two equal sine waves with a phase difference of 2 pi f d)."},
        {"id": "f7", "claim": "Simplification: many headphones also have a microphone inside the cup, near the ear (feedback or 'hybrid' ANC); the film shows only the outside (feedforward) microphone. The cut-through cup is a drawing, not to scale, and not any real product.",
         "source": "BBC Science Focus and HowStuffWorks (feedforward and feedback designs), read through search summaries."},
        {"id": "f8", "claim": "The to-scale view draws 400 px a metre: a 3.43 m wave is 1,372 px, a 6.86 cm wave 27.4 px, a head about 15 cm wide 62 px. Ten times closer (4,000 px a metre) the 6.86 cm wave is 274 px and an ear cup about 9 cm across is 360 px.",
         "source": "Arithmetic from f4; head breadth about 15 cm (typical adult)."},
    ],
    "acts": [
        {"id": "hook", "title": "The question", "goal": "Ask the question over the headphones, then the surprise: they add sound.", "rail": False},
        {"id": "wave", "title": "A wave of pressure", "goal": "What sound is: squeezed and stretched air, travelling.", "rail": False},
        {"id": "cancel", "title": "The flip", "goal": "Hear it, flip it, play it: the two add up to almost nothing, and its name.", "rail": False},
        {"id": "limits", "title": "The catch", "goal": "It must stay in step: easy for long, repeating waves; hard for short ones and sudden ones, with the arithmetic drawn.", "rail": False},
        {"id": "cushions", "title": "Cushions", "goal": "Why passive isolation still matters: it blocks the highs the chip cannot.", "rail": False},
        {"id": "recap", "title": "Recap", "goal": "The steps in one frame, then the line to remember.", "rail": False},
    ],
    "shots": shots,
}

out = HERE / "storyboard.json"
out.write_text(json.dumps(storyboard, ensure_ascii=False, indent=2) + "\n")
print(f"{len(shots)} shots, {sum(len(s['frames']) for s in shots)} frames, about {duration:.1f} s before the take -> {out}")
print(f"  hum: {LAM_LOW:.3f} m = {LAM_LOW_PX} px, left over {LEFT_LOW * 100:.2f}%; squeak: {LAM_HIGH * 100:.2f} cm = {LAM_HIGH_PX} px ({LAM_HIGH_ZOOM} px closer), left over {LEFT_HIGH * 100:.1f}%")
# The take sets the times: once it is there, put them back after every build, then keep the poster inside the film.
manifest = HERE / "voice" / "voice.json"
if manifest.exists() and json.loads(manifest.read_text()).get("version") == 2:
    kit = next(p for p in HERE.parents if (p / "kit" / "audio" / "voice.mjs").exists())
    subprocess.run(["node", str(kit / "kit" / "audio" / "voice.mjs"), str(HERE), "--retime"], check=False, stdout=subprocess.DEVNULL)
    sb = json.loads(out.read_text())
    sb["poster"] = round(sb["shots"][-1]["start"] + 1.6, 3)
    out.write_text(json.dumps(sb, ensure_ascii=False, indent=2) + "\n")
