"""Writes storyboard.json for "Why do we have seasons?".

Shot lengths are counted in beats of the music (86 BPM), so every cut sits on the grid, and each shot is as long as
its recorded line needs (references/voice.md). Every drawn quantity below is computed from the fact sheet's numbers:
the tilt (23.44 degrees), the noon Sun at 40 degrees north (73.44 and 26.56 degrees), the ground one beam covers
(1 / sin of that height), the daylight (15 h 02 min and 9 h 20 min), the two distances (147.1 and 152.1 million km).
Edit the shots here, run this, then run the storyboard check.
"""
import json
import re
import subprocess
from math import asin, atan, ceil, cos, degrees, pi, radians, sin, tan
from pathlib import Path

BEAT = 60 / 86
TILT = 23.44
LAT = 40.0
HIGH = 90 - LAT + TILT   # 73.44: the noon Sun's height at 40 N on the June solstice
LOW = 90 - LAT - TILT    # 26.56: the same on the December solstice

# ── The orbit, seen from above and to one side ──────────────────────────────
CX, CY, A, B = 960, 455, 640, 250
ECC = 0.0167


def orb(deg):
    return [round(CX + A * cos(radians(deg)), 1), round(CY - B * sin(radians(deg)), 1)]


ORBIT = {"curve": [orb(d) for d in range(0, 361, 10)], "colour": "white", "width": 5}
# The Sun sits off the middle by the orbit's eccentricity, toward the January side (13 degrees past December).
SUN = [round(CX + ECC * A * cos(radians(13))), round(CY - ECC * B * sin(radians(13)))]
DEC, JAN, MAR, JUN, JUL, SEP = orb(0), orb(13), orb(90), orb(180), orb(193), orb(270)
# In this view the axis leans a little more than 23.44 on screen, because the orbit's upright is foreshortened.
VIEW = degrees(asin(B / A))
LEAN = degrees(atan(tan(radians(TILT)) / cos(radians(VIEW))))


def axis(x, y, r, lean=TILT, reach=1.38, colour="orange", width=7):
    dx, dy = sin(radians(lean)) * r * reach, cos(radians(lean)) * r * reach
    return {"line": [round(x - dx), round(y + dy), round(x + dx), round(y - dy)], "colour": colour, "width": width}


def earth(x, y, r, light="left", lean=TILT):
    return [{"planet": [x, y, r], "light": light}, axis(x, y, r, lean)]


def marker(p, light):
    return [{"dot": [p[0], p[1], 30], "colour": "white"}, axis(p[0], p[1], 30, LEAN, 2.2, width=6)]


def sun(r=64):
    return {"sun": [SUN[0], SUN[1], r]}


def rays(x0, x1, ys, colour="orange"):
    return [{"arrow": [x0, y, x1, y], "colour": colour, "width": 5} for y in ys]


# ── The ground diagram: one beam, 250 px wide, landing at two heights ───────
GY, XL, BEAMW = 740, 900, 250
F_HIGH = BEAMW / sin(radians(HIGH))   # 260.8 px: the June patch, one "tile" of ground
F_LOW = BEAMW / sin(radians(LOW))     # 559.1 px: the December patch, 2.14 tiles
RATIO = F_LOW / F_HIGH
GROUND = {"bar": [0, GY + 100, 1920, 100], "colour": "ink"}


def beam(height, colour="orange", dashed=False):
    foot = BEAMW / sin(radians(height))
    out = []
    for k in range(6):
        x = XL + foot * k / 5
        # Each ray runs back up toward the Sun until it leaves the frame (the top or the right edge).
        t = min((GY + 40) / sin(radians(height)), (1960 - x) / cos(radians(height)))
        line = [round(x + t * cos(radians(height))), round(GY - t * sin(radians(height))), round(x), GY]
        out.append({"line": line, "colour": colour, "width": 4, "dashed": True} if dashed else {"arrow": line, "colour": colour, "width": 5})
    return out


def patch(height, colour="orange"):
    foot = BEAMW / sin(radians(height))
    return {"bar": [XL, GY + 34, round(foot), 34], "colour": colour}


PANEL_HIGH = {"panel": [110, 236, 640, 312], "title": "Noon at 40° N · June", "rows": ["Sun's height   73°", "Ground one beam lights   1×", "Light on each m²  ▮▮▮▮▮▮▮"]}
PANEL_LOW = {"panel": [110, 236, 640, 312], "title": "Noon at 40° N · December", "rows": ["Sun's height   27°", "Ground one beam lights   2.1×", "Light on each m²  ▮▮▮▯▯▯▯"]}

# ── The Sun's path across the sky at 40 N: time left to right, height up ────
def px(hour):
    return round(240 + 60 * hour, 1)


def py(alt):
    return round(GY - 6.2 * alt, 1)


def path(decl, step=0.25):
    pts = []
    h = 0.0
    while h <= 24.001:
        alt = degrees(asin(sin(radians(LAT)) * sin(radians(decl)) + cos(radians(LAT)) * cos(radians(decl)) * cos(radians(15 * (h - 12)))))
        if alt >= 0:
            pts.append([px(h), py(alt)])
        h += step
    return pts


DAY_JUN, DAY_DEC = 15 + 2 / 60, 9 + 20 / 60   # U.S. Naval Observatory, 40 N
RISE_JUN, SET_JUN = 12 - DAY_JUN / 2, 12 + DAY_JUN / 2
RISE_DEC, SET_DEC = 12 - DAY_DEC / 2, 12 + DAY_DEC / 2
HORIZON = {"line": [120, GY, 1800, GY], "width": 7}


def fr(at, note, *draw):
    flat = []
    for thing in draw:
        flat.extend(thing if isinstance(thing, list) else [thing])
    return {"at": at, "note": note, "draw": flat}


TITLE = {"title": [104, 470], "text": "Why do we\nhave seasons?", "size": 132, "align": "start", "accent": "seasons?"}
NOTE = {"label": [1340, 92], "text": "almost a circle, seen at an angle · not to scale", "size": 46, "colour": "white"}

FRAMES = {
    "s01": [
        fr(0.0, "Frame 0 is a finished picture: the Earth on the right, lit from the left, its axis drawn through it and leaning.",
           {"glow": [470, 520, 430], "colour": "orange"}, earth(1420, 510, 300), {"label": [520, 520], "text": "(title arrives by letter)", "size": 46, "colour": "white"}, {"camera": "orbit"}),
        fr(0.9, "The question is on screen within the first second and the Earth keeps turning about its leaning axis.",
           {"glow": [470, 520, 430], "colour": "orange"}, earth(1420, 510, 300), TITLE, {"move": [1340, 280, 1500, 280], "text": "turns"}, {"cut": "no cut: camera pulls back"}),
    ],
    "s02": [
        fr(0.0, "The camera pulls back: the Earth shrinks onto its orbit, the Sun arrives in the middle.",
           ORBIT, sun(), earth(1480, 560, 150, "left", LEAN), {"camera": "pull"}),
        fr(0.5, "The guess is drawn as a guess: a dashed line from Sun to Earth, labelled as the distance, with a question mark.",
           ORBIT, sun(), earth(orb(-12)[0], orb(-12)[1], 75, "left", LEAN), {"line": [SUN[0] + 80, SUN[1] + 8, orb(-12)[0] - 90, orb(-12)[1] - 8], "dashed": True, "colour": "orange"},
           {"chip": [1090, 524], "text": "closer = summer?"}, {"move": [1680, 560, 1700, 470], "text": "orbits"}, NOTE),
        fr(1.0, "The Earth has travelled on along its orbit; the dashed distance line follows it.",
           ORBIT, sun(), earth(DEC[0], DEC[1], 75, "left", LEAN), {"line": [SUN[0] + 80, SUN[1], DEC[0] - 90, DEC[1]], "dashed": True, "colour": "orange"},
           {"chip": [1090, 524], "text": "closer = summer?"}, NOTE, {"cut": "the line becomes a measure"}),
    ],
    "s03": [
        fr(0.0, "The Earth stops at its closest point; the dashed line turns solid and takes its value.",
           ORBIT, sun(), earth(JAN[0], JAN[1], 75, "left", LEAN), {"line": [SUN[0] + 76, SUN[1] - 6, JAN[0] - 86, JAN[1] + 8], "colour": "orange", "width": 7},
           {"label": [1270, 372], "text": "147.1 million km", "size": 50, "colour": "orange"}, NOTE),
        fr(0.5, "Its label says when: early January. Across the orbit a ghost Earth marks the farthest point, in early July.",
           ORBIT, sun(), earth(JAN[0], JAN[1], 75, "left", LEAN), {"line": [SUN[0] + 76, SUN[1] - 6, JAN[0] - 86, JAN[1] + 8], "colour": "orange", "width": 7},
           {"label": [1270, 372], "text": "147.1 million km", "size": 50, "colour": "orange"}, {"chip": [1200, 142], "text": "closest · early January"},
           {"dot": [JUL[0], JUL[1], 30], "colour": "white"}, {"line": [SUN[0] - 76, SUN[1] + 6, JUL[0] + 40, JUL[1] - 4], "colour": "blue", "width": 5, "dashed": True},
           {"label": [632, 556], "text": "152.1 million km", "size": 50, "colour": "blue"}, {"chip": [404, 388], "text": "farthest · early July"}, NOTE),
        fr(1.0, "Both distances are read at their values; the camera starts toward the January Earth.",
           ORBIT, sun(), earth(JAN[0], JAN[1], 75, "left", LEAN), {"line": [SUN[0] + 76, SUN[1] - 6, JAN[0] - 86, JAN[1] + 8], "colour": "orange", "width": 7},
           {"label": [1270, 372], "text": "147.1 million km", "size": 50, "colour": "orange"}, {"chip": [1200, 142], "text": "closest · early January"},
           {"dot": [JUL[0], JUL[1], 30], "colour": "white"}, {"label": [632, 556], "text": "152.1 million km", "size": 50, "colour": "blue"}, {"chip": [404, 388], "text": "farthest · early July"},
           {"camera": "push"}, {"cut": "push in to the Earth"}),
    ],
    "s04": [
        fr(0.0, "The January Earth fills the right of the frame, seen from the side: sunlight comes from the left, the axis leans away from it.",
           {"glow": [80, 450, 380], "colour": "blue"}, rays(60, 850, [250, 350, 450, 550, 650]), earth(1180, 450, 290), {"chip": [150, 150], "text": "early January"}, {"camera": "push"}),
        fr(1.0, "The north, tipped away from the Sun, is labelled: winter. The top of the globe sits in the dark.",
           {"glow": [80, 450, 380], "colour": "blue"}, rays(60, 850, [250, 350, 450, 550, 650]), earth(1180, 450, 290), {"chip": [150, 150], "text": "early January"},
           {"chip": [1490, 190], "text": "north: winter"}, {"line": [1500, 270, 1330, 300], "colour": "blue"}, {"cut": "flash: the answer"}),
    ],
    "s05": [
        fr(0.0, "A flash, and the first line slams in over the dimmed stage.",
           {"glow": [960, 520, 480], "colour": "orange"}, {"title": [960, 430], "text": "The real cause", "size": 150}, {"camera": "push"}),
        fr(1.0, "The second line lands; its accent word is itself tilted by 23.4 degrees.",
           {"glow": [960, 520, 480], "colour": "orange"}, {"title": [960, 430], "text": "The real cause\nis the tilt.", "size": 150, "accent": "tilt."},
           {"move": [1250, 700, 1330, 560], "text": "the word leans 23.4°"}, {"cut": "type lifts away, Earth returns"}),
    ],
    "s06": [
        fr(0.0, "The Earth, large on the left, seen exactly from the side. A dashed upright stands through its centre; the orbit's plane runs level.",
           {"glow": [1400, 300, 420], "colour": "orange"}, {"line": [100, 470, 1140, 470], "colour": "white", "width": 4}, {"planet": [700, 470, 270]},
           {"line": [700, 80, 700, 860], "dashed": True}, {"chip": [130, 494], "text": "orbit's plane"}, {"camera": "push"}),
        fr(0.45, "The axis swings out from the upright to its true lean and the arc between them opens.",
           {"glow": [1400, 300, 420], "colour": "orange"}, {"line": [100, 470, 1140, 470], "colour": "white", "width": 4}, earth(700, 470, 270),
           {"line": [700, 80, 700, 860], "dashed": True}, {"curve": [[round(700 + 335 * sin(radians(a))), round(470 - 335 * cos(radians(a)))] for a in (0, 6, 12, 18, TILT)], "colour": "orange", "width": 7},
           {"move": [720, 110, 840, 120], "text": "axis leans"}, {"chip": [878, 92], "text": "axis"}),
        fr(1.0, "The number stands at its value beside the arc, and the globe keeps spinning about the leaning axis.",
           {"glow": [1400, 300, 420], "colour": "orange"}, {"line": [100, 470, 1140, 470], "colour": "white", "width": 4}, earth(700, 470, 270),
           {"line": [700, 80, 700, 860], "dashed": True}, {"curve": [[round(700 + 335 * sin(radians(a))), round(470 - 335 * cos(radians(a)))] for a in (0, 6, 12, 18, TILT)], "colour": "orange", "width": 7},
           {"chip": [878, 92], "text": "axis"}, {"number": [1430, 420], "text": "23.4°", "size": 230, "colour": "orange"},
           {"label": [1430, 500], "text": "the tilt of Earth's axis", "size": 50, "colour": "ink"}, {"cut": "camera pulls back to the orbit"}),
    ],
    "s07": [
        fr(0.0, "Back on the orbit. The Earth leaves December and its axis mark stays behind.",
           ORBIT, sun(), earth(orb(25)[0], orb(25)[1], 70, "left", LEAN), marker(DEC, "left"), {"chip": [1480, 560], "text": "December"}, {"move": [1560, 330, 1380, 250], "text": "orbits"}, {"camera": "pull"}),
        fr(0.55, "March is passed; every mark the Earth leaves leans the same way.",
           ORBIT, sun(), marker(DEC, "left"), {"chip": [1480, 560], "text": "December"}, marker(MAR, "left"), {"chip": [1050, 150], "text": "March"},
           earth(orb(140)[0], orb(140)[1], 70, "right", LEAN), {"move": [600, 240, 430, 310], "text": "orbits"}),
        fr(1.0, "Four marks, four parallel axes; the Earth arrives at June, on the left of the Sun.",
           ORBIT, sun(), marker(DEC, "left"), {"chip": [1480, 560], "text": "December"}, marker(MAR, "left"), {"chip": [1050, 150], "text": "March"},
           marker(SEP, "left"), {"chip": [1050, 690], "text": "September"}, earth(JUN[0], JUN[1], 75, "right", LEAN), {"chip": [230, 560], "text": "June"},
           {"label": [960, 600], "text": "same direction, all year", "size": 46, "colour": "orange"}, {"cut": "push in to the June Earth"}),
    ],
    "s08": [
        fr(0.0, "The June Earth, from the side. Now the Sun is on the right, and the same leaning axis points toward it.",
           {"glow": [1840, 450, 420], "colour": "orange"}, rays(1860, 1090, [330, 450, 570]), earth(760, 450, 290, "right"), {"chip": [150, 150], "text": "June"}, {"camera": "push"}),
        fr(0.5, "Both halves are named: summer in the north, winter in the south.",
           {"glow": [1840, 450, 420], "colour": "orange"}, rays(1860, 1090, [330, 450, 570]), earth(760, 450, 290, "right"), {"chip": [150, 150], "text": "June"},
           {"chip": [1210, 150], "text": "north: summer"}, {"chip": [1210, 734], "text": "south: winter"}),
        fr(1.0, "A dot marks noon at 40 degrees north, on the sunlit side; the camera starts to dive toward it.",
           {"glow": [1840, 450, 420], "colour": "orange"}, rays(1860, 1090, [330, 450, 570]), earth(760, 450, 290, "right"), {"chip": [150, 150], "text": "June"},
           {"chip": [1210, 150], "text": "north: summer"}, {"chip": [1210, 734], "text": "south: winter"},
           {"dot": [round(760 + 290 * cos(radians(LAT - TILT))), round(450 - 290 * sin(radians(LAT - TILT))), 14], "colour": "orange"}, {"chip": [1108, 264], "text": "noon at 40° N"},
           {"camera": "push"}, {"cut": "dive to the ground at 40° N"}),
    ],
    "s09": [
        fr(0.0, "The dive ends on the ground at 40 degrees north, at noon in June: the camera has rolled until the ground is level, the globe fades under it, and the six rays it followed come down 73 degrees above the horizon.",
           {"glow": [1300, 80, 380], "colour": "orange"}, GROUND, beam(HIGH), {"curve": [[300, 1000], [620, 800], [1030, 742], [1440, 800], [1760, 1000]], "colour": "blue", "width": 5}, {"move": [1380, 150, 1240, 560], "text": "the same six rays"}, {"camera": "push"}),
        fr(0.5, "The whole beam has landed: six rays, a small bright patch of ground under them.",
           {"glow": [1300, 80, 380], "colour": "orange"}, GROUND, beam(HIGH), patch(HIGH), PANEL_HIGH,
           {"label": [1500, 690], "text": "73°", "size": 60, "colour": "orange"}),
        fr(1.0, "The patch is measured: one tile of ground for this beam. The panel holds the two readings.",
           {"glow": [1300, 80, 380], "colour": "orange"}, GROUND, beam(HIGH), patch(HIGH), PANEL_HIGH,
           {"label": [1500, 690], "text": "73°", "size": 60, "colour": "orange"}, {"bracket": [XL, round(XL + F_HIGH), GY + 78], "text": "1×"}, {"cut": "whip down to the orbit"}),
    ],
    "s10": [
        fr(0.0, "The orbit again: the Earth leaves June and runs the near side, past September.",
           ORBIT, sun(), marker(JUN, "right"), {"chip": [230, 560], "text": "June"}, marker(MAR, "left"), marker(DEC, "left"),
           earth(orb(235)[0], orb(235)[1], 75, "right", LEAN), {"move": [480, 700, 760, 760], "text": "half a year"}, {"camera": "down"}),
        fr(1.0, "It reaches December. The axis has not turned, so the north now leans away from the Sun.",
           ORBIT, sun(), marker(JUN, "right"), {"chip": [230, 560], "text": "June"}, marker(MAR, "left"), marker(SEP, "left"),
           earth(DEC[0], DEC[1], 80, "left", LEAN), {"chip": [1480, 560], "text": "December"}, {"chip": [1330, 146], "text": "north: winter"}, {"cut": "whip back to the ground"}),
    ],
    "s11": [
        fr(0.0, "The same ground, the same beam. The June beam stays as a dashed ghost while the beam swings down.",
           {"glow": [1840, 300, 380], "colour": "blue"}, GROUND, beam(HIGH, "orange", True), beam(50, "blue"), PANEL_HIGH, {"move": [1420, 150, 1700, 380], "text": "the Sun is lower"}),
        fr(0.5, "At 27 degrees the six rays land far apart: the patch has stretched along the ground.",
           {"glow": [1840, 300, 380], "colour": "blue"}, GROUND, beam(HIGH, "orange", True), beam(LOW, "blue"), patch(LOW, "blue"), PANEL_LOW,
           {"label": [1700, 690], "text": "27°", "size": 60, "colour": "blue"}),
        fr(1.0, "Measured against the June tile: 2.1 times the ground for the same light, so each part gets less.",
           {"glow": [1840, 300, 380], "colour": "blue"}, GROUND, beam(HIGH, "orange", True), beam(LOW, "blue"), patch(LOW, "blue"), PANEL_LOW,
           {"label": [1700, 690], "text": "27°", "size": 60, "colour": "blue"}, {"bracket": [XL, round(XL + F_LOW), GY + 78], "text": "2.1×", "colour": "blue"}, {"cut": "no cut: the ground becomes the horizon"}),
    ],
    "s12": [
        fr(0.0, "The ground stays as the horizon and a clock runs along it. The June Sun rises on the left.",
           HORIZON, {"label": [px(6), GY + 110], "text": "6:00", "size": 46, "colour": "ink"}, {"label": [px(12), GY + 110], "text": "noon", "size": 46, "colour": "ink"}, {"label": [px(18), GY + 110], "text": "18:00", "size": 46, "colour": "ink"},
           {"curve": path(TILT)[:22], "colour": "orange"}, {"sun": [path(TILT)[21][0], path(TILT)[21][1], 26]}, {"move": [540, 520, 700, 330], "text": "June Sun"}, {"camera": "pull"}),
        fr(0.5, "The June path is whole: high and long. The December path starts lower and later.",
           HORIZON, {"label": [px(6), GY + 110], "text": "6:00", "size": 46, "colour": "ink"}, {"label": [px(12), GY + 110], "text": "noon", "size": 46, "colour": "ink"}, {"label": [px(18), GY + 110], "text": "18:00", "size": 46, "colour": "ink"},
           {"curve": path(TILT), "colour": "orange"}, {"chip": [640, 186], "text": "June · 15 h of daylight"}, {"curve": path(-TILT)[:20], "colour": "blue"}, {"sun": [path(-TILT)[19][0], path(-TILT)[19][1], 22]}),
        fr(1.0, "Both days are measured along the horizon: about 15 hours of daylight against about 9.",
           HORIZON, {"label": [px(6), GY + 110], "text": "6:00", "size": 46, "colour": "ink"}, {"label": [px(12), GY + 110], "text": "noon", "size": 46, "colour": "ink"}, {"label": [px(18), GY + 110], "text": "18:00", "size": 46, "colour": "ink"},
           {"curve": path(TILT), "colour": "orange"}, {"chip": [640, 186], "text": "June · 15 h of daylight"}, {"curve": path(-TILT), "colour": "blue"}, {"chip": [660, 478], "text": "December · 9 h 20 min"},
           {"line": [px(RISE_JUN), GY + 34, px(SET_JUN), GY + 34], "colour": "orange", "width": 12}, {"line": [px(RISE_DEC), GY + 58, px(SET_DEC), GY + 58], "colour": "blue", "width": 12},
           {"label": [1560, 200], "text": "the Sun's path, 40° N", "size": 46, "colour": "white"}, {"cut": "the chart folds into a card"}),
    ],
    "s13": [
        fr(0.0, "Three cards rise, one after another, each with the small picture of its idea.",
           {"glow": [960, 600, 520], "colour": "orange"}, {"label": [960, 170], "text": "What makes a summer", "size": 50, "colour": "white"},
           {"card": [120, 250, 520, 420], "label": "The axis leans 23.4°"}, {"planet": [380, 420, 110]}, axis(380, 420, 110), {"move": [960, 760, 960, 660], "text": "cards rise"}),
        fr(0.5, "All three are up: the tilt, the steep light on a small patch, the long day.",
           {"glow": [960, 600, 520], "colour": "orange"}, {"label": [960, 170], "text": "What makes a summer", "size": 50, "colour": "white"},
           {"card": [120, 250, 520, 420], "label": "The axis leans 23.4°"}, {"planet": [380, 420, 110]}, axis(380, 420, 110),
           {"card": [700, 250, 520, 420], "label": "Steep light, small patch"}, {"arrow": [1010, 290, 940, 520], "colour": "orange"}, {"arrow": [1070, 290, 1000, 520], "colour": "orange"}, {"line": [800, 530, 1120, 530], "width": 7},
           {"card": [1280, 250, 520, 420], "label": "Long days: 15 h against 9"}, {"curve": [[1340, 540], [1420, 400], [1540, 320], [1660, 400], [1740, 540]], "colour": "orange"}, {"curve": [[1440, 540], [1500, 490], [1540, 470], [1580, 490], [1640, 540]], "colour": "blue"}, {"line": [1320, 540, 1760, 540], "width": 6}),
        fr(1.0, "The cards hold, breathing, then gather toward the centre for the last line.",
           {"glow": [960, 600, 520], "colour": "orange"}, {"label": [960, 170], "text": "What makes a summer", "size": 50, "colour": "white"},
           {"card": [120, 250, 520, 420], "label": "The axis leans 23.4°"}, {"planet": [380, 420, 110]}, axis(380, 420, 110),
           {"card": [700, 250, 520, 420], "label": "Steep light, small patch"}, {"arrow": [1010, 290, 940, 520], "colour": "orange"}, {"arrow": [1070, 290, 1000, 520], "colour": "orange"}, {"line": [800, 530, 1120, 530], "width": 7},
           {"card": [1280, 250, 520, 420], "label": "Long days: 15 h against 9"}, {"curve": [[1340, 540], [1420, 400], [1540, 320], [1660, 400], [1740, 540]], "colour": "orange"}, {"curve": [[1440, 540], [1500, 490], [1540, 470], [1580, 490], [1640, 540]], "colour": "blue"}, {"line": [1320, 540, 1760, 540], "width": 6},
           {"move": [300, 720, 800, 720], "text": "gather"}, {"cut": "flash into the last line"}),
    ],
    "s14": [
        fr(0.0, "A flash; the Earth settles at the top of the frame, leaning, still turning.",
           {"glow": [960, 760, 460], "colour": "orange"}, earth(960, 300, 190), {"camera": "pull"}),
        fr(0.4, "The line to remember arrives by letter under it.",
           {"glow": [960, 760, 460], "colour": "orange"}, earth(960, 300, 190), {"title": [960, 660], "text": "It's the tilt,\nnot the distance.", "size": 124, "accent": "tilt,"}),
        fr(1.0, "The poster holds for more than two seconds, breathing: the light swells and the frame pushes in a little.",
           {"glow": [960, 760, 460], "colour": "orange"}, earth(960, 300, 190), {"title": [960, 660], "text": "It's the tilt,\nnot the distance.", "size": 124, "accent": "tilt,"},
           {"label": [960, 910], "text": "EARTH'S AXIS · 23.4°", "size": 46, "colour": "white"}, {"camera": "push"}, {"cut": "end"}),
    ],
}


# The first cut had a sentence a shot. The narration is now one piece of talk, cut where its pictures change; the
# drawn frames of the first cut are reused where the picture is the same, re-keyed to the new shots.
OLD = FRAMES
DOT40 = [round(760 + 290 * cos(radians(LAT - TILT))), round(450 - 290 * sin(radians(LAT - TILT)))]
FRAMES = {
    "s01": OLD["s01"], "s02": OLD["s02"], "s03": OLD["s03"], "s04": OLD["s04"],
    "s05": [
        fr(0.0, "A flash; the first line slams in with the first sentence: the guess is dismissed in type.",
           {"glow": [960, 520, 480], "colour": "orange"}, {"title": [960, 430], "text": "Not the distance.", "size": 150}, {"camera": "push"}),
        fr(0.55, "With 'It's the tilt' the second line lands; its accent word leans by 23.4 degrees.",
           {"glow": [960, 520, 480], "colour": "orange"}, {"title": [960, 430], "text": "Not the distance.\nIt's the tilt.", "size": 150, "accent": "tilt."},
           {"move": [1250, 700, 1330, 560], "text": "the word leans 23.4°"}),
        fr(1.0, "A beat of silence on the answer, then the type is thrown up and the Earth returns behind it.",
           {"glow": [960, 520, 480], "colour": "orange"}, {"title": [960, 400], "text": "Not the distance.\nIt's the tilt.", "size": 150, "accent": "tilt."},
           {"move": [1500, 300, 1500, 130], "text": "type thrown up"}, {"cut": "whip up, the Earth returns"}),
    ],
    "s06": OLD["s06"], "s07": OLD["s07"], "s08": OLD["s08"][:2] + [
        fr(1.0, "The 40th parallel is ringed and a dot marks noon on it, on the sunlit side; six fine rays, one beam, arrive at the dot.",
           {"glow": [1840, 450, 420], "colour": "orange"}, rays(1860, 1090, [330, 450, 570]), earth(760, 450, 290, "right"), {"chip": [150, 150], "text": "June"},
           {"chip": [1210, 150], "text": "north: summer"}, {"chip": [1210, 734], "text": "south: winter"},
           {"dot": [DOT40[0], DOT40[1], 14], "colour": "orange"}, {"chip": [1108, 264], "text": "noon at 40° N"}, {"cut": "the dive"}),
    ],
    "s09": [
        fr(0.0, "The dive starts: the camera closes on the noon mark at 40° N and begins to roll; the six rays of the beam stay on the mark.",
           {"glow": [1840, 300, 420], "colour": "orange"}, {"planet": [500, 640, 620], "light": "right"}, rays(1860, 1100, [420, 432, 444, 456, 468, 480]),
           {"dot": [1090, 450, 14], "colour": "orange"}, {"camera": "push"}),
        OLD["s09"][0],
    ],
    "s10": [OLD["s09"][1], OLD["s09"][2],
        fr(1.0, "The panel's gauge fills: all the light of the beam on one tile of ground. The camera holds on a slow push.",
           {"glow": [1300, 80, 380], "colour": "orange"}, GROUND, beam(HIGH), patch(HIGH), PANEL_HIGH,
           {"label": [1500, 690], "text": "73°", "size": 60, "colour": "orange"}, {"bracket": [XL, round(XL + F_HIGH), GY + 78], "text": "1×"}, {"cut": "whip down to the orbit"}),
    ],
    "s11": OLD["s10"],
    "s12": [OLD["s11"][0], OLD["s11"][1]],
    "s13": [
        fr(0.0, "The beam has landed low: the patch is measured against the June tile.",
           {"glow": [1840, 300, 380], "colour": "blue"}, GROUND, beam(HIGH, "orange", True), beam(LOW, "blue"), patch(LOW, "blue"), PANEL_LOW,
           {"label": [1700, 690], "text": "27°", "size": 60, "colour": "blue"}, {"bracket": [XL, round(XL + F_HIGH), GY + 40], "text": "1×"}),
        OLD["s11"][2],
    ],
    "s14": OLD["s12"], "s15": OLD["s13"], "s16": OLD["s14"],
}
FRAMES["s04"] = [OLD["s04"][0],
    fr(0.5, "The rays have reached the globe: the day side faces left, and the north, tipped away, is in the dark.",
       {"glow": [80, 450, 380], "colour": "blue"}, rays(60, 850, [250, 350, 450, 550, 650]), earth(1180, 450, 290), {"chip": [150, 150], "text": "early January"}, {"move": [1300, 120, 1420, 160], "text": "north in the dark"}),
    OLD["s04"][1]]
FRAMES["s13"].insert(1, fr(0.5, "'2.1×' is drawn under the stretched patch, against the June tile's '1×'; the panel's December readings land.",
       {"glow": [1840, 300, 380], "colour": "blue"}, GROUND, beam(HIGH, "orange", True), beam(LOW, "blue"), patch(LOW, "blue"), PANEL_LOW,
       {"bracket": [XL, round(XL + F_LOW), GY + 78], "text": "2.1×", "colour": "blue"}, {"move": [XL + 40, GY + 120, XL + 520, GY + 120], "text": "twice the ground"}))
FRAMES["s11"] = [OLD["s10"][0],
    fr(0.5, "Half way: the Earth crosses the near side of the orbit, past September; its axis line stays parallel to every marker.",
       ORBIT, sun(), marker(JUN, "right"), {"chip": [230, 560], "text": "June"}, marker(MAR, "left"), marker(SEP, "left"),
       earth(orb(275)[0], orb(275)[1], 78, "left", LEAN), {"move": [900, 760, 1300, 720], "text": "six months"}),
    OLD["s10"][1]]
FRAMES["s05b"] = FRAMES["s05"][1:]
FRAMES["s05"] = [FRAMES["s05"][0],
    fr(1.0, "The first line holds alone, readable, on a slow push; the second line's place below it is still empty.",
       {"glow": [960, 520, 480], "colour": "orange"}, {"title": [960, 430], "text": "Not the distance.", "size": 150}, {"camera": "push"}, {"cut": "no cut: the second line arrives"})]
FRAMES["s13b"] = [
    fr(0.0, "The camera pushes in on the panel; the diagram behind dims.",
       {"glow": [1840, 300, 380], "colour": "blue"}, {"panel": [110, 236, 640, 312], "title": "Noon at 40° N · December", "rows": ["Sun's height   27°", "Ground one beam lights   2.1×", "Light on each m²  ▮▮▮▯▯▯▯"]}, {"camera": "push"}),
    fr(1.0, "The panel fills the left half; the gauge row glows, its blue bar at 47% with June's full level ghosted behind it.",
       {"glow": [1840, 300, 380], "colour": "blue"}, {"panel": [120, 200, 930, 452], "title": "Noon at 40° N · December", "rows": ["Sun's height   27°", "Ground one beam lights   2.1×", "Light on each m²  ▮▮▮▯▯▯▯"]},
       {"bar": [700, 600, 160, 30], "colour": "blue"}, {"label": [1400, 560], "text": "47% of June's", "colour": "blue"}, {"cut": "the panel falls away"}),
]
FRAMES["s14b"] = FRAMES["s14"][1:]
FRAMES["s14"] = FRAMES["s14"][:2]
FRAMES["s13"] = FRAMES["s13"][:2]
# Reused frames keep their drawings; where each sits in its new shot is spread evenly.
for key, frames in FRAMES.items():
    FRAMES[key] = [{**frame, "at": round(i / (len(frames) - 1), 2)} for i, frame in enumerate(frames)]

shots = []


def shot(id, act, type, extra=0.0, **fields):
    # A film with no voice is read: a shot is as long as its words take to read (0.5 s + a character every 1/15 s)
    # plus any beat the picture needs ("extra"), rounded up to whole beats of the music so every cut is on the grid.
    # "script" is the shot's run of the talk-style script; it is the caption, or the lettering when the picture
    # itself spells it (the title, the turn, the last line).
    text = (fields.get("caption") or fields.get("script") or "").replace("*", "")
    beats = max(2, ceil((0.5 + len(text) / 15 + extra) / BEAT - 0.02))
    start = shots[-1]["_b1"] if shots else 0
    shots.append({"id": id, "act": act, "type": type, "start": round(start * BEAT, 3), "end": round((start + beats) * BEAT, 3), "_b1": start + beats, **fields, "frames": FRAMES[id]})


shot("s01", "hook", "object3d",
     script="Why do we have seasons?",
     teaches="Asks the question the whole film answers, over the object the answer is about.",
     screen="The real Earth (NASA maps) fills the right of the frame, centre (1420, 510), 600 px across, lit from the left, a thin amber axis through its poles leaning 23.4 degrees to the right. On the left the title in metal type, two lines, 'Why do we / have seasons?', with 'seasons?' in amber.",
     motion="The Earth turns slowly about its leaning axis from frame 0. The title arrives letter by letter with the words and a sheen crosses it; at the end the title lifts away as the camera starts back.",
     carries="The Earth and its axis, which shrink onto the orbit.",
     transition="No cut: the title leaves upward and the camera pulls back from the Earth.",
     sound="The bed from its first beat, low. A soft shimmer as light crosses the title, after the question.",
     check="The question is spoken and readable inside two seconds; frame 0 already shows the lit Earth and its axis.",
     facts=["f1"])
shot("s02", "distance", "wide",
     caption="Is it because we're *closer* to the Sun?",
     teaches="States the common belief, out loud, as the viewer's own guess.",
     screen="The orbit seen from above and to one side: an ellipse 1280 px wide centred (960, 455), the Sun at its middle, the Earth (150 px) on the right of the orbit with its axis. A dashed amber line joins Sun and Earth; a chip under it reads 'closer = summer?'. Top right, small: 'the orbit is almost a circle, seen at an angle · sizes not to scale'. The chapter rail appears top left.",
     motion="The Earth shrinks from the hero shot onto the orbit while the ellipse draws itself around the Sun. The dashed line grows from the Sun to the Earth as 'closer' is said and the chip pops in with 'summer'.",
     carries="The orbit, the Sun, the Earth and the Sun-to-Earth line.",
     transition="No cut: the dashed line turns solid as the Earth stops.",
     sound="A soft whoosh for the pull back; a small pop when the chip lands, after the line.",
     check="The orbit is a closed, even ellipse; the guess carries its question mark; the Earth's axis leans the same way as in the first shot.",
     facts=["f2"])
shot("s03", "distance", "diagram",
     caption="But we're closest in *early January,*",
     teaches="The fact that breaks the belief: the Earth is nearest the Sun in early January.",
     screen="Same orbit. The Earth sits at the closest point (13 degrees past the December position). A solid amber line from the Sun carries '147.1 million km' and a chip 'closest · early January'. Opposite, a ghost Earth on a dashed blue line carries '152.1 million km' and 'farthest · early July'. The Sun is drawn off the middle by the orbit's real eccentricity (1.67%), so the two lines are in the ratio of the two numbers.",
     motion="On 'But' the dashed line turns solid and the near distance appears at its value with 'closest'; the far side's ghost, line and number follow as 'January' is said. Nothing counts up.",
     carries="The January Earth, which the camera goes to.",
     transition="The camera pushes in on the January Earth; the orbit and labels fall away.",
     sound="A tick as the line locks into a measurement, just before the line starts.",
     check="147.1 sits on the January side and 152.1 on the July side; the drawn lengths differ by about 3%, not more.",
     facts=["f2", "f3"])
shot("s04", "distance", "object3d",
     caption="in the middle of *northern winter.*",
     teaches="Closest to the Sun, and yet it is winter in the north: distance cannot be the cause.",
     screen="The January Earth from the side, centre (1180, 450), 580 px across. Sunlight comes from the left as parallel rays; the axis leans to the right, away from the Sun, and the Arctic is in the dark. Chips: 'early January' top left; 'north: winter', in cool blue, beside the northern half. The stage turns cool blue.",
     motion="A fast push in: the Earth grows from its place on the orbit to fill the right of the frame while the rays streak in from the left. 'north: winter' lands as 'winter' is said; the globe keeps turning.",
     carries="The Earth, which dims behind the type and returns in s06.",
     transition="A flash on the cut; the Earth dims behind the incoming type.",
     sound="A whoosh for the push in, before the words.",
     check="The lit side faces left; the axis leans right; the north polar cap is on the dark side; 'north: winter' points at the northern half.",
     facts=["f2", "f5"])
shot("s05", "tilt", "type",
     script="Not the distance.",
     teaches="The turn, first half: the guess is dismissed.",
     screen="One line of metal type, centred at y = 430: 'Not the distance.' Behind it the stage's floor and a warm amber light; nothing else. The second line's place below is empty.",
     motion="A flash and a shock ring on the cut. 'Not the distance.' slams in (scale from 1.5, blur to sharp); the stage light settles; a slow push of 2%.",
     carries="The line of type, which stays as the second line arrives under it.",
     transition="No cut: the second line arrives under the first.",
     sound="The film's first big hit on the cut.",
     check="The line is readable for over a second before the second line arrives; nothing else is on screen.",
     facts=["f2"])
shot("s05b", "tilt", "type", extra=0.6,
     script="It's the tilt.",
     teaches="The turn, second half: the answer is the tilt.",
     screen="The same type, now two lines: 'Not the distance.' and 'It's the tilt.' The word 'tilt.' is amber and is itself set leaning 23.4 degrees.",
     motion="'It's the tilt.' slams in under the first line; the accent word swings from upright to its 23.4 degree lean; a beat of stillness; a sheen crosses; then the type is thrown up.",
     carries="The lean of the word, which becomes the lean of the axis.",
     transition="The type lifts away fast with a vertical blur; the Earth is already arriving behind it.",
     sound="A whoosh as the type is thrown up.",
     check="The leaning word does not collide with the line above; the beat after it is held before the throw.",
     facts=["f1"])
shot("s06", "tilt", "object3d",
     caption="Earth's axis leans *23.4 degrees,*",
     teaches="What the tilt is: the angle between the Earth's axis and the upright of its orbit, 23.4 degrees.",
     screen="The Earth exactly from the side, centre (700, 470), 540 px across, its equator ringed. A level line through it is the orbit's plane (chip on the left: 'orbit's plane'); a dashed white upright stands through the centre; the amber axis leans from it. An amber arc between upright and axis, 335 px from the centre. On the right '23.4°' in large amber numerals, under it 'the tilt of Earth's axis'.",
     motion="The Earth arrives upright. As 'leans' is said the axis, and the globe with it, swings out to exactly 23.44 degrees and the arc opens with it; the number appears at its value with 'twenty-three'. The globe keeps spinning about the leaning axis.",
     carries="The Earth with its axis, back onto the orbit.",
     transition="The camera pulls back: the Earth shrinks onto the orbit.",
     sound="A tick as the number locks, between the words.",
     check="The angle drawn between the dashed upright and the axis measures 23.4 degrees; the number never shows another value.",
     facts=["f1"])
shot("s07", "tilt", "wide",
     caption="and points the *same way* all year.",
     teaches="The axis keeps its direction in space as the Earth goes round the Sun.",
     screen="The orbit view. The Earth travels from late winter (right) past March (far side) to June (left). At December, March, June and September a small marker stays: a disc with an amber axis line. All four axis lines are parallel. Chips name the four months; under the Sun, amber words: 'same direction, all year'.",
     motion="The Earth runs at a steady rate to June, anticlockwise; the December marker is behind it, March's pops as it passes, September's is drawn ahead; the axis lines glow once together on 'same way'. The axis never turns.",
     carries="The orbit with its four markers; the Earth at June.",
     transition="The camera pushes in on the June Earth.",
     sound="A soft whoosh for the pull back; a small tick as the last marker is left.",
     check="The four axis lines are exactly parallel; June is on the left of the Sun and December on the right.",
     facts=["f4"])
shot("s08", "sunlight", "object3d",
     caption="So in June, the north leans *toward* the Sun.",
     teaches="In June the same axis points the northern half toward the Sun.",
     screen="The June Earth from the side, centre (760, 450), 580 px across. The Sun is now on the right: amber rays come in from the right edge. The axis leans right, toward them; the Arctic is in the light. Chips: 'June' top left, 'north: summer' in amber upper right, 'south: winter' in blue lower right. The 40th parallel is ringed and a dot on the sunlit limb marks noon at 40° N.",
     motion="A push in from the orbit. The rays arrive from the right; 'north: summer' lands with 'northern half', 'south: winter' just after; at the end of the line the 40 degree ring, the noon dot and a six-ray beam appear.",
     carries="The noon dot at 40° N and the six rays on it, which the dive follows.",
     transition="The dive: the camera closes on the dot and rolls.",
     sound="A whoosh for the push in; a small pop for the noon mark, after the line.",
     check="The lit side faces right; the axis is the same line as in s06; the dot sits on the 40th parallel on the lit side.",
     facts=["f4", "f5", "f6"])
shot("s09", "sunlight", "macro", extra=0.3,
     caption="Its sunlight comes in *steep,*",
     teaches="Seen from the ground at 40° N, the June Sun is high: its light comes down steeply.",
     screen="The dive: the camera closes on the noon mark and rolls by 73.4 degrees until the ground there is level. The globe grows past the frame and fades; the same six rays now come down steeply from the upper right onto a level ground line at y = 740.",
     motion="The camera closes and rolls on 'sunlight' (power2.in), so the rays turn from horizontal to 73 degrees; the ground diagram takes over exactly where the rays land, on 'steep'.",
     carries="The six rays and the ground, which stay for the next shot.",
     transition="No cut: the ground diagram is already in place.",
     sound="A whoosh for the dive, ending on the ground.",
     check="The rays never jump between the globe and the ground diagram; the beam lands at 73 degrees.",
     facts=["f6"])
shot("s10", "sunlight", "diagram",
     caption="packed onto a *small patch* of ground.",
     teaches="The mechanism: a beam arriving steeply lands on a small patch of ground, so the patch is bright.",
     screen="The ground at 40° N as a level slab marked in tiles. One beam of six parallel amber rays, 250 px across, comes down at 73.4 degrees and lights a patch 261 px wide: one tile, bright. An arc reads '73°'. A measure across the beam reads 'one beam'; one under the patch reads '1×'. Left, a glass panel: 'Noon at 40° N · June', 'Sun's height 73°', 'Ground one beam lights 1×', and a gauge, 'Light on each m²', full.",
     motion="The patch lights with 'packed'; the tiles tick in, the arc and the measures draw with 'small patch'; the panel's rows arrive one by one and its gauge fills. A slow push.",
     carries="The ground, the beam and the panel: the same picture returns in s12 with one thing changed.",
     transition="A vertical whip down to the orbit.",
     sound="A tick as the gauge fills, between the lines.",
     check="The patch is exactly as wide as the beam's width divided by sin 73.4 degrees; the six rays are evenly spaced and parallel.",
     facts=["f6", "f7"])
shot("s11", "sunlight", "wide",
     caption="But six months later, it leans *away.*",
     teaches="Half a year later the axis has not turned, so the north now leans away from the Sun.",
     screen="The orbit view with its markers. The Earth runs from June (left) along the near side, past September, to December (right). At December a blue chip: 'north: winter'. The month chips for June and December stay.",
     motion="The Earth sweeps half the orbit with 'six months later', its axis never turning; it lands at December with a small push in and the chip pops on 'away'. The stage turns blue.",
     carries="The December Earth's lean, which sets the low Sun of the next shot.",
     transition="A horizontal whip back to the ground at 40° N.",
     sound="A whoosh on the whip in; a pop for the chip after 'away'.",
     check="The Earth's axis stays parallel to the markers through the whole sweep; at December the top of the axis points away from the Sun.",
     facts=["f4", "f5"])
shot("s12", "sunlight", "diagram",
     caption="Now the same light comes in *low,*",
     teaches="The same beam, from a December Sun, arrives at a low angle.",
     screen="The same slab and the same six rays, now cool blue-white. The June beam stays as a dashed amber ghost with its one-tile patch outlined. The measure across the beam now reads 'the same beam'. The panel's readings are blank while the beam moves.",
     motion="On 'same sunlight' the beam swings down about the patch's left end from 73.4 to 26.6 degrees; the patch stretches with it, always the beam's width over the sine of its height; it lands on 'low'.",
     carries="The low beam, which is measured in the next shot.",
     transition="No cut: the measure draws.",
     sound="A low whoosh as the beam swings, under the voice.",
     check="At every moment of the swing the patch is the beam's width over the sine of its height; the ghost beam stays at 73 degrees.",
     facts=["f6", "f7"])
shot("s13", "sunlight", "diagram",
     caption="and spreads over *twice* the ground,",
     teaches="The same beam, arriving low, is spread over about twice the ground.",
     screen="The same diagram: the beam at 26.6 degrees and its patch 559 px wide, 2.1 tiles, visibly dimmer. Under the ground, '1×' (the June tile) and '2.1×'. The arc reads '27°'. The panel reads 'December', 'Sun's height 27°', 'Ground one beam lights 2.1×'.",
     motion="'2.1×' draws under the patch with 'twice'; the panel's readings land. A slow push.",
     carries="The panel, which the camera moves to.",
     transition="The camera pushes in on the panel's gauge.",
     sound="A tick as '2.1×' locks.",
     check="The December patch is 2.14 times the June one (559 px against 261 px).",
     facts=["f6", "f7"])
shot("s13b", "sunlight", "ui",
     caption="so each bit gets *less.*",
     teaches="Spread twice as wide, each square metre gets about half the light.",
     screen="The panel fills the left half of the frame, 1.45 times its size; its last row, 'Light on each m²', is lit, its blue gauge at 47% of June's (261 / 559), with June's full amber level ghosted behind it. The diagram behind is dimmed.",
     motion="A push in on the panel; the gauge row glows once on 'less'; June's level ghosts in behind the blue bar so the drop reads as a drop.",
     carries="The ground line behind, which becomes the horizon of the chart.",
     transition="The panel falls away; the beams fade, the ground stays and the sky above it becomes a chart.",
     sound="A soft low tone as the gauge row glows.",
     check="The blue gauge stands at 261 / 559 = 47% of the amber June level.",
     facts=["f6", "f7"])
shot("s14", "sunlight", "chart",
     caption="The days get *shorter,* too:",
     teaches="The winter Sun is up for less of the day.",
     screen="A chart on the same ground line: time of day left to right (6:00, noon, 18:00 under the horizon), the Sun's height up. Two paths computed for 40° N: June's, amber, high and wide (peak 73 degrees), and December's, blue, low and narrow (peak 27 degrees). A small Sun rides each. Under the horizon an amber bar and a blue bar span each day. Top right: 'the Sun's path · 40° N'.",
     motion="The June Sun rises and draws its path, its bar growing under the horizon, and its chip lands as it completes; December's path follows, lower and later, with 'shorter'.",
     carries="Both paths and both bars, which the chips then name.",
     transition="No cut: the chips land on the same chart.",
     sound="A tick as each path completes.",
     check="Both paths peak at noon; June at 73 degrees, December at 27, on the same scale.",
     facts=["f6", "f8"])
shot("s14b", "sunlight", "chart",
     caption="about *9 hours* of daylight, not *15.*",
     teaches="About 9 hours of daylight in December against 15 in June, at 40° N.",
     screen="The same chart with its two chips: 'June · 15 h of daylight' above the amber peak and 'December · 9 h 20 min' above the blue one. The two bars under the horizon are the two days' lengths.",
     motion="The December chip lands with '9 hours', beside the June chip already there; a slow push while both are read.",
     carries="The amber and blue paths, which shrink into the third recap card.",
     transition="The chart fades as three cards rise over it.",
     sound="A tick for each chip.",
     check="The June bar is 15.0/24 of the day's width and the December bar 9.3/24.",
     facts=["f8"])
shot("s15", "recap", "recap",
     caption="Steep light and long days: that's *summer.*",
     teaches="The whole answer in one frame: the tilt, the steep light, the long day.",
     screen="Three glass cards in a row, each 520 x 420: 'The axis leans 23.4°' with a small Earth and its axis; 'Steep light, small patch' with the steep amber beam beside the low blue one on their two patches; 'Long days: 15 h against 9' with the two Sun paths and their day bars. Above them: 'What makes a summer'.",
     motion="The cards rise in turn with a slight forward tilt and settle, the second with 'steep light', the third with 'long days'; they breathe; at the end they shrink together toward the centre.",
     carries="The amber of the three cards, which gathers into the flash.",
     transition="The cards collapse to the centre and a flash opens the last frame.",
     sound="Three soft card sounds as they land, before and between the words.",
     check="Each small picture agrees with its big one: the axis at 23.4 degrees, the patches about 1 to 2.1, the June path higher and wider than December's.",
     facts=["f1", "f7", "f8"])
shot("s16", "recap", "endcard", extra=2.2,
     script="It's the tilt, not the distance.",
     teaches="The line to remember, said and then held as a poster.",
     screen="The Earth, 380 px across, at the top centre (960, 300), leaning on its amber axis and turning. Under it, two lines of metal type: 'It's the tilt,' with 'tilt' in amber, and 'not the distance.' Under them a small line in mono capitals: 'EARTH'S AXIS · 23.4°'. A warm light on the floor below.",
     motion="A flash; the Earth settles from large to its place; the two lines arrive by letter with the voice; a sheen crosses; then the frame holds for two seconds after the last word, the light swelling and a 2% push in.",
     transition="The film ends on this frame; the music fades under it.",
     sound="The second big hit on the cut, before the line; the bed fades over the hold.",
     check="The line is fully readable at least two seconds before the end; nothing moves abruptly in the hold.",
     facts=["f1", "f2"])

duration = round(shots[-1]["_b1"] * BEAT, 3)
shots[-1]["end"] = duration
for x in shots:
    del x["_b1"]

storyboard = {
    "title": "Why do we have seasons?",
    "question": "Why do we have seasons?",
    "audience": "Curious viewers from about twelve up, anywhere in the world. They know the Earth goes round the Sun once a year; many believe summer is when the Earth is nearer the Sun.",
    "promise": "Seasons come from the tilt of the Earth's axis, not from its distance to the Sun: the half of the Earth leaning toward the Sun gets steeper, more concentrated sunlight and longer days, and that is its summer.",
    "language": "en",
    "format": "1920x1080",
    "duration": duration,
    "fps": 60,
    "poster": 17.5,
    "captions": "pill",
    "look": {
        "accent": "#ffb43a",
        "accent2": "#5fb0ff",
        "mood": "A dark graphite stage. Amber is sunlight and summer, cool blue is winter, and they keep those meanings all film. The stage's light sits where the Sun is: left of the January Earth, right of the June Earth, high for the steep beam, low and blue for the December one. The Earth is the real globe from NASA's maps; the diagrams are thin glowing lines; panels are glass, headings are metal.",
    },
    "music": {"track": "Xceed Thru Johann (Mixkit 556)", "bpm": 86, "beat": round(BEAT, 6), "offset": 0, "start": 0.679,
              "note": "A calm pulse with no lead melody, at -18 LUFS: the film has no voice, so the bed carries it. Starting 0.679 s in puts a beat on frame 0, and every shot is a whole number of beats long, so every cut is on the grid."},
    "facts": [
        {"id": "f1", "claim": "The Earth's axis is tilted 23.44 degrees from the upright of its orbit (its obliquity); the film shows 23.4°.", "source": "NASA Goddard, Earth Fact Sheet (obliquity to orbit 23.44 deg); IAU value 23.4393 deg for epoch J2000"},
        {"id": "f2", "claim": "The Earth is closest to the Sun (perihelion, 147.1 million km) in early January, about 3 January, and farthest (aphelion, 152.1 million km) in early July, about 4 July. The difference is 5.0 million km: 5.0 / 152.1 = 3.3%.", "source": "NASA Goddard, Earth Fact Sheet (perihelion 147.095, aphelion 152.100 million km); NASA Science, Milankovitch (Orbital) Cycles (perihelion on or about 3 January, aphelion about 4 July)"},
        {"id": "f3", "claim": "The Earth's orbit is nearly a circle: its eccentricity is 0.0167, so the Sun sits 1.67% of the orbit's half-width off its centre. The film's orbit is a circle seen at an angle, with the Sun offset by that amount; (1 - 0.0167) / (1 + 0.0167) = 0.967 = 147.1 / 152.1.", "source": "NASA Goddard, Earth Fact Sheet (orbit eccentricity 0.0167)"},
        {"id": "f4", "claim": "The axis keeps pointing in the same direction in space all year (toward Polaris), so the northern half leans toward the Sun around the June solstice (20-21 June) and away from it around the December solstice (21-22 December). The slow 26,000-year drift of the axis is left out.", "source": "NASA Space Place, What Causes the Seasons?; NOAA SciJinks, What Causes the Seasons?"},
        {"id": "f5", "claim": "Seasons are opposite in the two hemispheres: June to August is summer in the north and winter in the south, December to February the reverse. In early January the north is in winter.", "source": "NASA Space Place, What Causes the Seasons?; NOAA National Weather Service, The Seasons, the Equinox and the Solstices"},
        {"id": "f6", "claim": "At 40 degrees north the noon Sun stands 90 - 40 + 23.44 = 73.44 degrees above the horizon at the June solstice and 90 - 40 - 23.44 = 26.56 degrees at the December solstice.", "source": "Arithmetic from f1 (noon height = 90 - latitude + the Sun's declination); NOAA Global Monitoring Laboratory, Solar Calculator"},
        {"id": "f7", "claim": "A beam of sunlight of a given width covers ground in proportion to 1 / sin(the Sun's height): 1 / sin 73.44 = 1.043 widths in June, 1 / sin 26.56 = 2.236 widths in December, so 2.236 / 1.043 = 2.14 times the ground (captioned 'twice', shown as 2.1x). The light on each square metre falls in the same ratio. This is at noon at 40 N, ignoring the extra air the low beam crosses.", "source": "Lambert's cosine law; arithmetic from f6; NASA Earth Observatory, Climate and Earth's Energy Budget (sunlight at a low angle is spread over more surface)"},
        {"id": "f8", "claim": "At 40 degrees north the longest day has 15 h 02 min of daylight and the shortest 9 h 20 min (captioned 'about nine hours of daylight, not fifteen'). The drawn paths use the Sun's height = asin(sin 40 sin d + cos 40 cos d cos(15 (t - 12))) with d = +23.44 and -23.44 degrees.", "source": "U.S. Naval Observatory, Astronomical Applications: Comparative Lengths of Days and Nights (40 N: 15h02m, 9h20m)"},
    ],
    "acts": [
        {"id": "hook", "title": "Question", "goal": "Ask the question in the viewer's own words, over the Earth and its leaning axis.", "rail": False},
        {"id": "distance", "title": "Distance?", "goal": "Meet the common guess head on: the Earth is closest to the Sun in the northern winter, so distance is not the cause."},
        {"id": "tilt", "title": "The tilt", "goal": "Show what the tilt is, measure it, and show that the axis keeps its direction all year."},
        {"id": "sunlight", "title": "Sunlight", "goal": "The mechanism: leaning toward the Sun means steep, concentrated light and long days; leaning away means low, spread light and short days."},
        {"id": "recap", "title": "Recap", "goal": "The three ideas in one frame, then the line to remember.", "rail": False},
    ],
    "shots": shots,
}
Path(__file__).with_name("storyboard.json").write_text(json.dumps(storyboard, ensure_ascii=False, indent=2) + "\n")
print(len(shots), "shots,", storyboard["duration"], "s,", sum(len(s["frames"]) for s in shots), "frames,", sum(len(s.get("voice", "")) for s in shots), "spoken characters")
print(f"LEAN {LEAN:.2f}  HIGH {HIGH:.2f}  LOW {LOW:.2f}  F_HIGH {F_HIGH:.1f}  F_LOW {F_LOW:.1f}  RATIO {RATIO:.3f}  SUN {SUN}  JAN {JAN}  JUL {JUL}")
