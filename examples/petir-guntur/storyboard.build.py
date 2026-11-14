"""Writes storyboard.json for "Kenapa petir terlihat dulu, baru guntur terdengar?" (portrait, 1080 x 1920).

The film is cut to one take of narration. This script writes the plan: the shots, each with its run of the script
and its drawn frames. The times it writes are only a guess; the take sets the real ones, so the script ends by
asking the voice tool to retime the board (it does nothing until a take is there):

    python3 examples/petir-guntur/storyboard.build.py && node kit/tools/storyboard.mjs examples/petir-guntur --png

The diagrams are to scale: you stand at x 828, and 0.2067 px is a metre, so sound (343 m/s) moves 70.9 px a second
and the film shows it in real time. The race strikes 3 087 m away (9 x 343), the counted strike 1 029 m away
(3 x 343), the last one 343 m away (1 x 343). film.js works the strike times back from where the take puts the cuts.
"""
import json
import math
import random
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
YOU_X = 828
PX_PER_M = (YOU_X - 190) / 3087
shots = []


def shot(id, act, type, length=None, **fields):
    """A speaking shot's length is the take's. A silent beat keeps the length it is given here."""
    start = shots[-1]["end"] if shots else 0
    guess = length if length is not None else round(len(fields.get("voice", "")) / 15 + 0.3, 2)
    shots.append({"id": id, "act": act, "type": type, "start": round(start, 3), "end": round(start + guess, 3), **fields, "frames": FRAMES[id]})


def fr(at, note, *draw):
    return {"at": at, "note": note, "draw": list(draw)}


# ── Things drawn as curves, so a bolt can be half way down and a front can follow its channel ───────────────
def bolt(x0, y0, x1, y1, seed=3, wander=46, colour="violet", width=10, part=1.0):
    """A jagged channel from the cloud to the ground; part < 1 draws only the top of it (the leader coming down)."""
    rand = random.Random(seed)
    n = 13
    pts = []
    for i in range(n + 1):
        u = i / n
        if u > part + 1e-6:
            break
        k = math.sin(math.pi * u)  # no wander at the two ends
        pts.append([round(x0 + (x1 - x0) * u + (rand.random() - 0.5) * 2 * wander * k, 1), round(y0 + (y1 - y0) * u, 1)])
    return {"curve": pts, "colour": colour, "width": width}


def cloud(y, seed=1, x0=-20, x1=1100):
    """The ragged underside of the cloud deck."""
    rand = random.Random(seed)
    pts = []
    x = x0
    while x <= x1:
        pts.append([x, round(y + (rand.random() - 0.5) * 70 - 26 * math.sin(x / 90), 1)])
        x += 60
    return {"curve": pts, "colour": "ink", "width": 7}


def wall(x, y0, y1, seed=5, width=9, colour="orange"):
    """A front of sound seen from the side: it follows the channel's shape, so it is a wavy standing line."""
    rand = random.Random(seed)
    return {"curve": [[round(x + (rand.random() - 0.5) * 22, 1), y] for y in range(y0, y1 + 1, 70)], "colour": colour, "width": width}


def front(x, y0, y1):
    """The leading front and two fainter ones behind it."""
    return [wall(x, y0, y1), wall(x - 34, y0, y1, width=4), wall(x - 68, y0, y1, width=3)]


def label(x, y, text, size=46, **more):
    return {"label": [x, y], "text": text, "size": size, **more}


# ── The framings of the one world ────────────────────────────────────────────────────────────────────────────
# At rest: cloud base 480, ground 1180, the race's bolt strikes at x 190, you stand at x 828. The spoken words sit
# on the floor just under the ground line, so the picture has the whole height from the top safe line down to 1180.
G = 1180
SKY = {"sky": [0, 480], "tone": "dusk"}
GROUND = {"horizon": [G]}
BOLT = bolt(250, 470, 190, G, seed=3)
GHOST = bolt(250, 470, 190, G, seed=3, width=4)
YOU = {"person": [YOU_X, G, 150]}
REST = [SKY, cloud(480, 3), GROUND]


def board(light, sound):
    return {"panel": [400, 570, 530, 230], "title": "tiba di kamu", "rows": [f"cahaya   {light}", f"suara   {sound}"]}


# Hook and poster: the camera moved so the bolt stands at x 430 and the ground at 1000, which leaves the lower third
# (on the dark floor) for the lettering.
HERO_SKY = {"sky": [0, 560], "tone": "dusk"}
HERO_GROUND = {"horizon": [1000]}
HERO = [HERO_SKY, cloud(560, 2), HERO_GROUND]
HERO_BOLT = bolt(500, 520, 430, 1000, seed=7, wander=60, width=12)
Q1, Q2, Q3, Q4 = "Kenapa sih kilat", "selalu kelihatan", "duluan, baru", "gunturnya nyusul?"

# Macro: the camera 2.2 times closer on the strike point, which sits at (497, 1180).
MACRO_BOLT = bolt(560, -20, 497, G, seed=11, wander=70, width=16)

# The approach: 1.45 times closer on the last stretch of the race, you at x 800.
# The thunder landing: twice the size, you at x 560.
# The count seen from where you stand: a lower cloud deck, the bolt far off on the horizon.
POV_SKY = {"sky": [0, 640], "tone": "dusk"}
POV = [POV_SKY, cloud(640, 4), GROUND]
POV_BOLT = bolt(360, 635, 330, G, seed=5, wander=30, width=7)
POV_YOU = [{"dot": [790, 1176, 78], "colour": "ink"}, {"path": "M606 1920 L606 1480 Q612 1340 706 1318 Q764 1306 764 1238 L816 1238 Q816 1306 874 1318 Q968 1340 974 1480 L974 1920", "colour": "ink", "width": 12}]
COUNT_AT = [775, 760]
COUNT_LABEL = label(775, 500, "detik sejak kilat")

# The counted strike from the side, twice the size: strike point at x 135, you at x 560 (1 029 m apart).
NEAR = [{"sky": [0, 300], "tone": "dusk"}, cloud(300, 6), GROUND]
NEAR_BOLT = bolt(220, 290, 135, G, seed=9, wander=50, width=11)
NEAR_GHOST = bolt(220, 290, 135, G, seed=9, wander=50, width=5)
NEAR_YOU = {"person": [560, G, 300]}

# The three strikes side by side, at rest: 3 087 m, 1 029 m and 343 m from you.
X3 = round(YOU_X - 1029 * PX_PER_M)  # 615
X1 = round(YOU_X - 343 * PX_PER_M)  # 757
STEP9 = {"chip": [214, 1010], "text": "9 detik ≈ 3 km"}
STEP3 = {"chip": [218, 810], "text": "3 detik ≈ 1 km"}
STEP1 = {"chip": [330, 620], "text": "1 detik ≈ 343 m"}

CARDS = [
    {"card": [64, 262, 866, 215]}, bolt(190, 292, 170, 442, seed=2, wander=14, width=6), {"ring": [170, 442, 70], "colour": "orange"}, label(580, 386, "lahir barengan", 56),
    {"card": [64, 500, 866, 215]}, {"arrow": [110, 580, 290, 580], "colour": "violet"}, {"arrow": [110, 640, 150, 640], "colour": "orange"}, label(600, 624, "cahaya ≈ 874.000× lebih cepat"),
    {"card": [64, 738, 866, 215]}, {"number": [180, 880], "text": "3", "size": 120}, label(600, 862, "3 detik ≈ 1 km", 60),
]

FRAMES = {
    "s01": [
        fr(0.0, "Frame 0 is finished: storm sky, the leader already half way down, the first line of the question in place.",
           *HERO, bolt(500, 520, 430, 1000, seed=7, wander=60, width=6, part=0.5), {"glow": [470, 620, 330], "colour": "violet"},
           {"title": [497, 1120], "text": Q1, "size": 88, "accent": "kilat"}, {"move": [560, 640, 520, 860], "text": "leader turun"}, {"camera": "push"}),
        fr(0.25, "0.25 s: the bolt strikes, silent. The whole sky is lit. Each line of the question lands as its first word is said.",
           *HERO, HERO_BOLT, {"scatter": [430, 1000, 9, 30, 130], "colour": "violet"}, {"glow": [440, 700, 480], "colour": "violet"},
           {"title": [497, 1120], "text": f"{Q1}\n{Q2}", "size": 88, "accent": "kilat"}, {"move": [900, 1300, 900, 1210], "text": "baris demi baris"}),
        fr(0.86, "The question is asked; a beat of silence, and only now the thunder: a soft flash and a ring on the floor.",
           *HERO, bolt(500, 520, 430, 1000, seed=7, wander=60, width=5), {"ring": [430, 1000, 260], "colour": "orange", "dashed": True},
           {"title": [497, 1120], "text": f"{Q1}\n{Q2}\n{Q3}\n{Q4}", "size": 88, "accent": "kilat"}, {"camera": "push"}, {"cut": "maju ke titik sambaran"}),
    ],
    "s02": [
        fr(0.0, "The camera arrives 2.2 times closer on the strike point; the old channel is a faint trace.",
           GROUND, bolt(560, -20, 497, G, seed=11, wander=70, width=5), {"glow": [497, 700, 380], "colour": "violet"}, {"camera": "push"}),
        fr(0.6, "On 'lahir barengan' a new stroke has flared: shells of light are already gone, the air around the channel swells as an amber front.",
           GROUND, MACRO_BOLT, {"scatter": [520, 420, 10, 60, 300], "colour": "violet", "width": 4}, {"scatter": [500, 900, 10, 60, 300], "colour": "violet", "width": 4},
           wall(497 - 110, 0, G), wall(497 + 110, 0, G, seed=8), {"chip": [560, 300], "text": "kilat = cahaya"}, {"chip": [64, 640], "text": "udara ≈ 28.000 °C"},
           {"chip": [230, 900], "text": "guntur = suara"}, {"move": [620, 1060, 860, 1060], "text": "mengembang"}, {"cut": "kamera mundur"}),
    ],
    "s03": [
        fr(0.0, "The camera pulls back to the whole scene: the storm on the left, you far on the right. The last channel is a trace.",
           *REST, GHOST, YOU, {"chip": [744, 900], "text": "kamu"}, {"camera": "pull"}),
        fr(0.8, "The race is set: a board with two empty rows, and the distance measured along the floor, three kilometres.",
           *REST, GHOST, YOU, {"chip": [744, 900], "text": "kamu"}, board("…", "…"), {"bracket": [190, YOU_X, 1210], "text": "≈ 3 km", "colour": "blue"},
           {"move": [300, 1260, 720, 1260], "text": "penggaris digambar"}, {"cut": "tanpa potongan"}),
    ],
    "s04": [
        fr(0.0, "A leader comes down over the old trace while the voice says 'Cahaya'.",
           *REST, bolt(250, 470, 190, G, seed=3, width=6, part=0.45), YOU, {"chip": [744, 900], "text": "kamu"}, board("…", "…"), {"bracket": [190, YOU_X, 1210], "text": "≈ 3 km", "colour": "blue"}),
        fr(0.25, "On 'ngebut': the stroke. A shell of light sweeps the scene, a ray is at your eye, the first row is filled at its value.",
           *REST, BOLT, {"arrow": [215, 880, 800, 1038], "colour": "violet", "width": 8}, {"glow": [YOU_X, 1040, 110], "colour": "violet"}, YOU,
           {"chip": [300, 840], "text": "≈ 300.000 km/detik"}, board("0,00001 detik", "…"), wall(215, 500, G, width=6), {"bracket": [190, YOU_X, 1210], "text": "≈ 3 km", "colour": "blue"}),
        fr(1.0, "'...langsung sampai ke mata kamu': the light has long arrived; the sound has gone one kilometre of its three.",
           *REST, GHOST, YOU, {"chip": [300, 840], "text": "≈ 300.000 km/detik"}, board("0,00001 detik", "3,2 detik…"),
           *front(417, 500, G), {"move": [450, 1080, 600, 1080], "text": "suara"}, {"bracket": [190, YOU_X, 1210], "text": "≈ 3 km", "colour": "blue"}, {"cut": "tanpa potongan"}),
    ],
    "s05": [
        fr(0.0, "'Suara?' The light's chip is gone; a chip naming the sound rides just behind the front.",
           *REST, GHOST, YOU, board("0,00001 detik", "3,7 detik…"), *front(452, 500, G), {"chip": [150, 1020], "text": "suara"}, {"camera": "push"}),
        fr(1.0, "'Jauh lebih santai': it is still not half way. The clock on the board runs in real seconds.",
           *REST, GHOST, YOU, board("0,00001 detik", "5,8 detik…"), *front(601, 500, G), {"chip": [300, 1020], "text": "suara"}, {"move": [640, 1090, 760, 1090], "text": "merambat"},
           {"cut": "kamera mendekat"}),
    ],
    "s06": [
        fr(0.0, "The camera has pushed 1.45 times closer on the last stretch: the front on the left, you on the right.",
           {"sky": [0, 380], "tone": "dusk"}, cloud(380, 3), GROUND, {"person": [800, G, 218]}, board("0,00001 detik", "6,3 detik…"), *front(500, 400, G), {"camera": "push"}),
        fr(0.4, "On 'tiga ratus empat puluh meter' the chip on the front changes to the figure.",
           {"sky": [0, 380], "tone": "dusk"}, cloud(380, 3), GROUND, {"person": [800, G, 218]}, board("0,00001 detik", "7,4 detik…"), *front(614, 400, G),
           {"chip": [190, 1000], "text": "≈ 343 m/detik"}, {"move": [650, 1100, 740, 1100], "text": "merambat"}),
        fr(1.0, "The line is said; the front is a few metres from you. The cut comes just before it arrives.",
           {"sky": [0, 380], "tone": "dusk"}, cloud(380, 3), GROUND, {"person": [800, G, 218]}, board("0,00001 detik", "8,8 detik…"), *front(772, 400, G),
           {"chip": [350, 1000], "text": "≈ 343 m/detik"}, {"cut": "potong dekat ke kamu"}),
    ],
    "s07": [
        fr(0.0, "Close on you, twice the size, in silence. The front is a hand's width away; a tenth of a second later it hits.",
           GROUND, {"person": [560, G, 300]}, *front(535, 300, G), board("0,00001 detik", "8,9 detik…"), {"move": [330, 1060, 500, 1060], "text": "tiba"}),
        fr(1.0, "The thunder has landed: the front passes over you, the second row locks at 9,0 detik in the sound's colour.",
           GROUND, {"person": [560, G, 300]}, *front(700, 300, G), {"scatter": [560, 900, 8, 70, 150], "colour": "orange", "width": 4},
           board("0,00001 detik", "9,0 detik ✓"), {"cut": "kedua kecepatan jadi pecahan"}),
    ],
    "s08": [
        fr(0.0, "'Artinya': the two speeds stack as a fraction over the dimmed scene.",
           *REST, YOU, {"chip": [150, 520], "text": "cahaya 299.792.458 m/detik"}, {"line": [150, 634, 852, 634], "width": 6}, {"chip": [270, 660], "text": "suara 343 m/detik"},
           {"move": [300, 880, 300, 780], "text": "jadi pecahan"}),
        fr(0.55, "On 'sejuta' the result slams in at its value, with a ring from the stage.",
           *REST, YOU, {"chip": [150, 520], "text": "cahaya 299.792.458 m/detik"}, {"line": [150, 634, 852, 634], "width": 6}, {"chip": [270, 660], "text": "suara 343 m/detik"},
           {"number": [497, 930], "text": "≈ 874.000×", "size": 150}, {"glow": [497, 880, 360], "colour": "violet"}),
        fr(1.0, "Held with its unit while the line ends; a sheen crosses the figure.",
           *REST, YOU, {"chip": [150, 520], "text": "cahaya 299.792.458 m/detik"}, {"line": [150, 634, 852, 634], "width": 6}, {"chip": [270, 660], "text": "suara 343 m/detik"},
           {"number": [497, 930], "text": "≈ 874.000×", "size": 150}, label(497, 1030, "lebih cepat", 64), {"camera": "push"}, {"cut": "angka dilempar ke atas"}),
    ],
    "s09": [
        fr(0.0, "'Nah': a new picture, close on you from the side, looking toward the storm. Nothing has struck yet.",
           {"sky": [0, 420], "tone": "dusk"}, cloud(420, 5), GROUND, {"person": [330, G, 420]}, {"chip": [250, 690], "text": "kamu"}, {"camera": "push"}),
        fr(0.7, "'...bisa kamu pakai': the tool lands beside you: a counter at zero, waiting for a flash.",
           {"sky": [0, 420], "tone": "dusk"}, cloud(420, 5), GROUND, {"person": [330, G, 420]}, {"chip": [250, 690], "text": "kamu"}, COUNT_LABEL,
           {"number": COUNT_AT, "text": "0", "size": 300}, {"move": [930, 880, 930, 760], "text": "masuk"}, {"cut": "potong ke sudut pandangmu"}),
    ],
    "s10": [
        fr(0.0, "Your own view, over your shoulder. The counter is where it was, still at zero.",
           *POV, *POV_YOU, COUNT_LABEL, {"number": COUNT_AT, "text": "0", "size": 300}, bolt(360, 635, 330, G, seed=5, wander=30, width=4, part=0.4)),
        fr(0.3, "On 'kilat': a bolt far off, a silent flash. The count starts.",
           *POV, POV_BOLT, {"glow": [340, 900, 420], "colour": "violet"}, *POV_YOU, COUNT_LABEL, {"number": COUNT_AT, "text": "0", "size": 300}),
        fr(0.58, "One second after the flash, on 'detiknya', the first figure pops.",
           *POV, bolt(360, 635, 330, G, seed=5, wander=30, width=4), *POV_YOU, COUNT_LABEL, {"number": COUNT_AT, "text": "1", "size": 300}, {"move": [930, 820, 930, 700], "text": "pop"}),
        fr(0.85, "Two. Nothing heard yet; '...sampai gunturnya kedengaran' is still being said.",
           *POV, bolt(360, 635, 330, G, seed=5, wander=30, width=3), *POV_YOU, COUNT_LABEL, {"number": COUNT_AT, "text": "2", "size": 300}, {"camera": "push"}, {"cut": "tepat di hitungan 3"}),
    ],
    "s11": [
        fr(0.0, "Cut to the side on the count of three, in silence: the front has just reached you and the thunder lands on the cut.",
           *NEAR, NEAR_GHOST, NEAR_YOU, *front(560, 320, G), {"scatter": [560, 920, 8, 70, 150], "colour": "orange", "width": 4},
           {"number": COUNT_AT, "text": "3", "size": 300}, label(775, 850, "detik", 56)),
        fr(1.0, "The front moves on past you; the three stays.",
           *NEAR, NEAR_GHOST, NEAR_YOU, *front(720, 320, G), {"number": COUNT_AT, "text": "3", "size": 300}, label(775, 850, "detik", 56), {"cut": "tanpa potongan"}),
    ],
    "s12": [
        fr(0.0, "'Tiap tiga detik': the sum starts under the count.",
           *NEAR, NEAR_GHOST, NEAR_YOU, *front(750, 320, G), {"number": COUNT_AT, "text": "3", "size": 300}, label(775, 850, "detik", 56), {"panel": [632, 892, 298, 180], "rows": ["× 343 m", ""]}),
        fr(0.5, "The sum is complete; the ruler draws along the floor from the strike point to you.",
           *NEAR, NEAR_GHOST, NEAR_YOU, {"number": COUNT_AT, "text": "3", "size": 300}, label(775, 850, "detik", 56), {"panel": [632, 892, 298, 180], "rows": ["× 343 m", "= 1.029 m"]},
           {"bracket": [135, 560, 1215], "text": "", "colour": "blue"}, {"move": [160, 1270, 520, 1270], "text": "penggaris"}),
        fr(0.9, "On 'satu kilometer' the distance lands between the bolt and you.",
           *NEAR, NEAR_GHOST, NEAR_YOU, {"number": COUNT_AT, "text": "3", "size": 300}, label(775, 850, "detik", 56), {"panel": [632, 892, 298, 180], "rows": ["× 343 m", "= 1.029 m"]},
           {"bracket": [135, 560, 1215], "text": "", "colour": "blue"}, {"number": [347, 1100], "text": "≈ 1 km", "size": 92}, {"camera": "push"}, {"cut": "kamera mundur"}),
    ],
    "s13": [
        fr(0.0, "The camera is back at rest. The two strikes the film has shown stand as traces, each with its count: far is long, nearer is shorter.",
           *REST, GHOST, bolt(X3 + 50, 470, X3, G, seed=9, width=4), YOU, STEP9, STEP3, {"camera": "pull"}),
        fr(0.3, "On 'Makin cepat' a third bolt strikes much nearer, 343 m from you.",
           *REST, GHOST, bolt(X3 + 50, 470, X3, G, seed=9, width=4), bolt(X1 + 40, 470, X1, G, seed=13, wander=30), {"glow": [X1, 800, 300], "colour": "violet"}, YOU, STEP9, STEP3, wall(X1 + 14, 500, G, width=6)),
        fr(0.75, "Exactly one second later, on 'datang', its thunder is on you and its count lands: the steps climb toward you.",
           *REST, GHOST, bolt(X3 + 50, 470, X3, G, seed=9, width=4), bolt(X1 + 40, 470, X1, G, seed=13, wander=30, width=5), YOU, STEP9, STEP3, STEP1,
           *front(YOU_X + 30, 500, G), {"scatter": [YOU_X, 1040, 8, 40, 100], "colour": "orange", "width": 4}, {"move": [250, 990, 420, 600], "text": "makin dekat"}, {"cut": "kartu rangkuman naik"}),
    ],
    "s14": [
        fr(0.0, "The hook's framing again, in silence. Three cards rise, each with its small picture; the first line of the poster lands.",
           *HERO, *CARDS[:6], {"title": [497, 1150], "text": "Lihat kilat,", "size": 100}, {"move": [990, 800, 990, 600], "text": "kartu naik"}),
        fr(0.4, "The whole recap: born together, light about 874 000 times faster, three seconds for a kilometre.",
           *HERO, *CARDS, {"title": [497, 1150], "text": "Lihat kilat,\nhitung detiknya.", "size": 100, "accent": "hitung detiknya."}),
        fr(1.0, "The poster holds for two seconds, breathing, and can cut back to frame 0 without a jolt.",
           *HERO, *CARDS, {"title": [497, 1150], "text": "Lihat kilat,\nhitung detiknya.", "size": 100, "accent": "hitung detiknya."}, {"camera": "push"}, {"cut": "kembali ke awal"}),
    ],
}

# ── Babak 1: pertanyaan ──────────────────────────────────────────────────────────────────────────────────────
shot("s01", "hook", "wide",
     voice="[curious] Kenapa sih *kilat* selalu kelihatan duluan, baru *gunturnya* nyusul?", hold=0.55, caption=False,
     teaches="Asks the question the film answers, and shows it happening: the flash comes at 0.25 s, its thunder only after the question is asked.",
     screen="Night storm, the camera placed so the bolt stands at x 430 and the ground at y 1000. A cloud deck fills the top to y 560, lit from inside. A violet-white bolt runs from the cloud to the ground. On the dark floor below the horizon, inside the safe area, the spoken question in four lines of metal type at 88 px: 'Kenapa sih kilat / selalu kelihatan / duluan, baru / gunturnya nyusul?', 'kilat' in the violet of light and 'gunturnya' in the amber of sound. The lettering is the line, so the shot shows no caption.",
     motion="Frame 0 already holds the first line and a leader half way down. At 0.25 s the return stroke: two frames of full flash, a flicker, an afterglow. Each of the other three lines slams in as its first word is said. After the question, half a second of silence in which the thunder arrives: a soft flash and a ring on the floor. Clouds drift, rain falls, the camera pushes 4 percent.",
     carries="The bolt's channel and its strike point: the camera goes to it.",
     transition="The lettering lifts away and the camera pushes into the strike point; no cut in the picture.",
     sound="Music from the first frame, low. The flash is silent on purpose. The thunder lands in the pause after 'nyusul?', before 'Padahal'.",
     check="The question is readable inside the safe area and never under the app's buttons. The flash is at 0.25 s and nothing sounds at it. The thunder falls between the two sentences, on no word.",
     facts=["f4"])

shot("s02", "hook", "macro",
     voice="[warmly] Padahal dua-duanya lahir *barengan,* lho.",
     teaches="The tension: light and sound start at the same instant, from the same channel, because the stroke heats the air.",
     screen="Close on the strike point (2.2 times), which sits at (497, 1180); the channel runs up and out of the top of the frame. When it flares, white shells of light and short rays leave it on both sides and are out of the frame in a few frames, while an amber front of sound, the channel's own outline, begins to swell away from it. Three chips sit on their things: 'kilat = cahaya' beside the channel, 'guntur = suara' riding the front, 'udara ≈ 28.000 °C' on the channel.",
     motion="A third of a second in, a new stroke flares. A shell of light leaves with the stroke and with each of its three re-strikes; the front grows at the diagram's true speed (71 px a second in the world, 156 on screen), so both have visibly left together by the time the voice says 'lahir barengan'. Chips pop as their thing appears.",
     carries="The front of sound and the colour code: violet is light, amber is sound.",
     transition="The camera pulls back fast to the whole scene; the front fades and the channel stays as a trace.",
     sound="No effect: the voice is speaking. The music only.",
     check="Shells and front start on the same frame. The front is amber, the light white-violet. 28 000 °C matches the fact sheet. The spoken words do not sit on the bright channel.",
     facts=["f4"])

# ── Babak 2: balapan ─────────────────────────────────────────────────────────────────────────────────────────
shot("s03", "balapan", "wide",
     voice="Bedanya cuma di *kecepatan.*",
     teaches="Sets the race: the same start, a long way to go, and two runners whose times will be compared.",
     screen="The whole scene from the side, to scale (0.2067 px a metre): cloud deck to y 480, ground at y 1180, the strike point at x 190, you standing at x 828, which is 3 087 m away. A chip 'kamu' over the figure. A glass board at (400, 570), 'tiba di kamu', with two empty rows: 'cahaya' and 'suara'. Along the floor under the ground line a ruler from the strike point to you with a tick every 500 m, and over its middle '≈ 3 km'.",
     motion="The camera pulls back from the strike point in 0.7 s. 'kamu' pops, the board lands, the ruler draws from the bolt to you and its label lands on 'kecepatan'.",
     carries="The scene, the board and the ruler: everything is ready for the stroke.",
     transition="No cut in the picture: a leader starts down.",
     sound="A short whoosh with the pull back, in the gap before the line.",
     check="The ruler runs exactly from the strike point to your feet and 3 087 m is written as about 3 km. Nothing readable is under the spoken words.",
     facts=["f5"])

shot("s04", "balapan", "diagram",
     voice="Cahaya *ngebut* banget, jadi kilatnya langsung sampai ke mata kamu.",
     teaches="Light crosses the three kilometres in a hundred-thousandth of a second: you see the flash the moment it happens.",
     screen="The same scene. On the stroke: a white shell of light sweeping right, a violet ray from the channel to your eye, the chip '≈ 300.000 km/detik' on the ray, and the board's first row reading '0,00001 detik'. The amber front has left the channel on the same frame and creeps right; the second row counts tenths of a second.",
     motion="A leader comes down during 'Cahaya'; the stroke falls on 'ngebut' (it is timed nine seconds before the thunder must land). The shell crosses in 0.15 s, your figure is rim lit, the first row is filled at its value, the chip lands. Through the rest of the line the ray keeps arriving and the front has gone a third of the way.",
     carries="The front of sound, still on its way, and the board with its second row counting.",
     transition="No cut in the picture: the light's chip fades and the sound gets its name.",
     sound="The flash is silent. No effect under the voice.",
     check="The stroke is on the word 'ngebut'. The row reads 0,00001 detik. The front moves 70.9 px a second. The figure is not hidden by the board.",
     facts=["f1", "f5"])

shot("s05", "balapan", "diagram",
     voice="*Suara?* Jauh lebih santai.",
     teaches="The same scene, one thing changed: now watch the sound, which has barely started.",
     screen="The same scene, the light's ray and chip gone. The amber front, a standing wavy line with a haze and fainter fronts behind it, is a third of the way across. A chip 'suara' rides just behind it. The board's second row shows the running time.",
     motion="'suara' pops on the front as the word is said. The front moves in real time, 71 px a second; the stage light follows it along the ground. The camera begins to push toward you.",
     carries="The front, the running clock and you.",
     transition="The camera pushes in on the stretch between the front and you; no cut.",
     sound="A low hum starts under the front, very quiet under the voice.",
     check="At every frame the front's distance from the strike point is 343 m/s times the time since the flash, at 0.2067 px a metre.",
     facts=["f5"])

shot("s06", "balapan", "macro",
     voice="Cuma sekitar tiga ratus empat puluh meter per detik.",
     teaches="The number: sound does about 340 metres a second (343 on screen), and the viewer watches it take its real nine seconds.",
     screen="1.45 times closer on the last stretch: the front on the left moving right, you at x 800, the bolt out of the frame. The chip on the front now reads '≈ 343 m/detik'. The board, in its place, counts 6,3 ... 8,8 detik.",
     motion="The camera settles in the first 0.7 s. On 'tiga ratus' the chip changes from the name to the figure, on one frame. The front crosses the frame in real time (103 px a second on screen) and is a few metres from you when the line ends.",
     carries="The front, a few metres from you, and the running clock.",
     transition="A cut to a close shot of you, a tenth of a second before the front arrives.",
     sound="The low hum rides under the front. No effect under the words.",
     check="The chip says ≈ 343 m/detik while the voice says the rounded 'tiga ratus empat puluh'. The clock agrees with the front's position.",
     facts=["f2", "f5"])

shot("s07", "balapan", "macro", 1.5,
     caption="Baru *kedengaran*.",
     teaches="The answer to the question in one picture: the thunder reaches you nine seconds after the light did.",
     screen="Close on you (twice the size), feet at (560, 1180), in silence. The amber front sweeps over the figure; small arcs of sound at the ears; the figure shakes. The board, in the same place, locks its second row at '9,0 detik' in amber.",
     motion="A tenth of a second after the cut the front reaches you: a soft flash, a ring on the floor, the stage light turns amber for a moment. The row locks. The front keeps travelling right.",
     carries="The two speeds, as their chips.",
     transition="The camera returns to the whole scene as the two chips stack into a fraction.",
     sound="THE THUNDER: a big impact with a falling body under it, on the frame the front arrives. The voice is silent for this shot.",
     check="The front touches the figure exactly 9.00 s after the flash of s04. The row reads 9,0 detik.",
     facts=["f5"])

shot("s08", "balapan", "compare",
     voice="Artinya, cahaya hampir *sejuta kali* lebih cepat.",
     teaches="The number, once, with what it is computed from: 299 792 458 divided by 343 is about 874 000.",
     screen="Over the dimmed scene, a fraction made of the two chips: 'cahaya 299.792.458 m/detik' above a rule, 'suara 343 m/detik' below it. Under the fraction the result in metal type at 138 px, '≈ 874.000×', and beneath it 'lebih cepat'.",
     motion="The chips land as a fraction during 'Artinya, cahaya', the rule draws, and the result slams in at its value as the voice says 'sejuta', with a ring; a sheen crosses it. It holds to the end of the line; the camera pushes 4 percent.",
     carries="The storm itself, and you in it.",
     transition="The figure is thrown upward; a hard cut to you, close, from the side.",
     sound="No effect under the words. A soft whoosh on the cut, in the gap before 'Nah'.",
     check="874.000 agrees with 299 792 458 / 343 = 874 030. The figure never counts up. It lands on the word 'sejuta'.",
     facts=["f1", "f2", "f3"])

# ── Babak 3: menghitung ──────────────────────────────────────────────────────────────────────────────────────
shot("s09", "hitung", "macro",
     voice="Nah, ini bisa *kamu* pakai.",
     teaches="The turn from explanation to use: this is something you can do yourself.",
     screen="Close on you from the side (2.8 times), standing at the left of the frame and looking toward the storm; low cloud, rain. A chip 'kamu' at your head. On the right, where the count will be, a small label 'detik sejak kilat' and a large violet '0', 300 px tall.",
     motion="'kamu' pops as the shot opens; the label and the zero land on 'bisa kamu pakai'. A slow push.",
     carries="The counter, in the same place on screen.",
     transition="A hard cut to your own view of the storm; the counter does not move.",
     sound="The music only.",
     check="The zero and its label are inside the safe area and clear of the spoken words.",
     facts=["f6"])

shot("s10", "hitung", "wide",
     voice="Begitu lihat *kilat,* hitung detiknya sampai gunturnya kedengaran.",
     teaches="What to do: start counting seconds when you see the flash, stop when you hear the thunder.",
     screen="Your own view over your shoulder: the back of your head and shoulders dark in the lower right, a low cloud deck to y 640, the horizon at y 1180 and a thin bolt far off at x 330. On the right, at (775, 760), the count in violet figures 300 px tall under the label 'detik sejak kilat'.",
     motion="The bolt flashes on the word 'kilat', silent (it is timed three seconds before the cut). Exactly one second later '1' replaces '0', a second after that '2'; each figure replaces the last on one frame. The afterglow fades; the camera pushes.",
     carries="The count, in the same place on screen.",
     transition="A hard cut to the side on the count of three, as the thunder lands.",
     sound="No thunder yet. A soft tick with each figure.",
     check="The flash is on 'kilat'. The figures land 1.00 s and 2.00 s after it. They are inside the safe area and clear of the spoken words.",
     facts=["f6"])

shot("s11", "hitung", "diagram", 1.25,
     teaches="The count stops on three: the thunder has taken three seconds to reach you.",
     screen="The counted strike from the side, to scale, twice the size: strike point at x 135, you at x 560, which is 1 029 m away. The amber front is on you; arcs of sound at your ears. The count '3' at (775, 760) with 'detik' under it. Nobody speaks.",
     motion="On the cut the front arrives: a soft flash, a ring on the floor, the figure shakes, '3' pops. The front moves on to the right.",
     carries="The three and the scene: the sum is done on it.",
     transition="No cut: the voice resumes over the same picture.",
     sound="The thunder on the cut, in the silence the take was opened for.",
     check="The front reaches the figure exactly 3.00 s after the flash of s10.",
     facts=["f6"])

shot("s12", "hitung", "diagram",
     voice="Tiap tiga detik, kira-kira *satu kilometer.*",
     teaches="Seconds times 343 metres is the distance: three seconds is about one kilometre.",
     screen="The same picture. Under the count a glass card with '× 343 m' and '= 1.029 m'. Along the floor a ruler from the strike point to you with a tick every 100 m, and above the ground between the bolt and you, large, '≈ 1 km'.",
     motion="The card's two rows land one after the other during 'Tiap tiga detik'; the ruler draws from the bolt to you; '≈ 1 km' pops as the voice says 'satu kilometer'.",
     carries="The rule, and the strike's trace.",
     transition="The camera pulls back to the whole scene, where the first strike's trace is waiting.",
     sound="No effect under the words.",
     check="3 x 343 = 1 029 is written correctly. The ruler ends at the figure's feet. '≈ 1 km' lands with its words.",
     facts=["f2", "f6"])

shot("s13", "hitung", "compare",
     voice="Makin *cepat* gunturnya datang, makin *dekat* petirnya.",
     teaches="The consequence: a shorter count means a nearer strike.",
     screen="The whole scene at rest, you at x 828. Three strikes at their true distances: the race's trace at x 190 with a chip '9 detik ≈ 3 km', the counted one at x 615 with '3 detik ≈ 1 km', and a new bolt at x 757, 343 m from you, with '1 detik ≈ 343 m'. The chips step up and to the right, toward you.",
     motion="The first two chips are there as the camera settles. On 'Makin cepat' the third bolt strikes; its front reaches you exactly one second later, on 'datang': a small flash, arcs at your ears, and its chip lands. The stage light moves from the far bolt to you.",
     carries="The storm, now close.",
     transition="The scene sinks as the recap cards rise over the storm.",
     sound="A short, lighter thunder when the near strike's sound arrives, kept under the voice.",
     check="The three bolts stand 638, 213 and 71 px from you (3 087, 1 029 and 343 m at 0.2067 px a metre). The near front arrives 1.00 s after its flash. Each chip's seconds times 343 is its distance.",
     facts=["f6"])

shot("s14", "recap", "recap", 2.7,
     teaches="The three ideas in one frame, and the line to remember: see the flash, count the seconds.",
     screen="The hook's framing of the storm, in silence. Three glass cards, 866 px wide, at y 262, 500 and 738, each with a small picture and a line: a bolt with a ring of sound, 'Kilat dan guntur lahir barengan'; a long violet arrow that runs off the card over a short amber one, 'Cahaya ≈ 874.000× lebih cepat'; a large 3 over a ruler, '3 detik ≈ 1 km / tiap detik ≈ 343 m'. Below, where the question stood in s01, the poster line in metal type at 106 px: 'Lihat kilat, / hitung detiknya.'.",
     motion="The cards rise in one after another in the first 0.5 s, the two lines of the poster slam in, a sheen crosses them. Then everything holds for two seconds with a 3 percent push while the clouds drift.",
     transition="The film ends on this frame; it can cut back to frame 0, which has the same sky and lettering in the same place.",
     sound="A short whoosh as the cards rise, a soft low impact under the poster line, the music faded over the last 1.8 s. No voice.",
     check="Every figure matches the fact sheet. The poster line is fully readable for at least two seconds. Nothing is outside the safe area.",
     facts=["f3", "f4", "f6"])

duration = shots[-1]["end"]

storyboard = {
    "title": "Kenapa petir terlihat dulu, baru guntur terdengar?",
    "question": "Kenapa sih kilat selalu kelihatan duluan, baru gunturnya nyusul?",
    "audience": "Remaja dan orang dewasa di Indonesia yang menonton video pendek di ponsel. Mereka tahu petir dan guntur, pernah dengar bahwa 'cahaya lebih cepat', tapi belum tahu seberapa jauh bedanya dan belum pernah memakainya untuk mengukur jarak.",
    "promise": "Kilat dan guntur lahir barengan, tapi cahaya hampir sejuta kali lebih cepat daripada suara. Jadi hitung detik dari kilat sampai guntur: tiap tiga detik kira-kira satu kilometer, dan makin cepat gunturnya datang, makin dekat petirnya.",
    "language": "id",
    "format": "1080x1920",
    "captions": "pop",
    "duration": round(duration, 3),
    "fps": 60,
    "poster": 11.5,
    "voice": {"voice_id": "xlBOShi2835jfBgaEld4", "name": "Rafiq", "model": "eleven_v4", "language": "id"},
    "look": {
        "accent": "#a98bff",
        "accent2": "#ffb347",
        "mood": "A night storm over the kit's graphite floor: a shader sky of drifting cloud lit from inside, the floor's grid as the ground. Violet-white is light (the bolt, its shells and rays, the count); amber is sound (the front, its clock). The stage light sits on the bolt when it strikes and travels to you with the sound, turning amber when the thunder lands.",
    },
    "music": {
        "track": "Xceed Thru Johann (Mixkit 556)",
        "bpm": 86,
        "start": 0.679,
        "note": "An 86 BPM track tagged investigation and tension, with no drop and no lead melody to fight the voice. The cuts follow the take, not its beat; it starts 0.679 s in, which puts a beat on frame 0. Kept at -22 LUFS under the voice.",
    },
    "facts": [
        {"id": "f1", "claim": "Light travels at 299 792 458 m/s in vacuum (exact, by definition of the metre); in air it is 0,03% slower (refractive index about 1,0003), so about 299 700 km/s. The film rounds this to '≈ 300.000 km/detik' and uses the exact figure in the division.",
         "source": "BIPM, The International System of Units (SI Brochure), 9th edition, 2019: definition of the metre. Refractive index of air: Ciddor 1996, Applied Optics 35, 1566."},
        {"id": "f2", "claim": "Sound travels at about 343 m/s in dry air at 20 °C: 331,3 x sqrt(1 + 20/273,15) = 343,2 m/s. The voice rounds it to 'sekitar tiga ratus empat puluh'; the screen keeps '≈ 343 m/detik' and every distance is worked from 343. It depends on temperature (347 m/s at 27 °C, 349 m/s at 30 °C), so every distance in the film is marked '≈'; on a 30 °C evening the true distances are 1,7% larger.",
         "source": "Standard formula for an ideal gas, e.g. US National Weather Service, Speed of Sound Calculator (weather.gov/epz/wxcalc_speedofsound); Kinsler et al., Fundamentals of Acoustics, 4th ed."},
        {"id": "f3", "claim": "Light is about 874 000 times faster than sound in air: 299 792 458 / 343 = 874 030. Spoken as 'hampir sejuta kali' (nearly a million), written as '≈ 874.000×'.",
         "source": "Arithmetic from f1 and f2."},
        {"id": "f4", "claim": "Thunder is made by the lightning itself: the stroke heats the air in its channel to about 50 000 °F = (50 000 - 32) x 5/9 = 27 760 °C ≈ 28 000 °C within microseconds, the air expands explosively, and that shock becomes the sound. So the flash and the thunder start at the same moment and place. Simplification: thunder comes from the whole length of the channel, which is why it rumbles; the film draws the front as the channel's outline moving outward and times the arrival from the nearest point, the strike point.",
         "source": "NOAA National Severe Storms Laboratory, Severe Weather 101: Lightning Basics and FAQ (nssl.noaa.gov/education/svrwx101/lightning); US National Weather Service, Understanding Lightning: Thunder (weather.gov/safety/lightning-science-thunder)."},
        {"id": "f5", "claim": "The race is 3 087 m long (9 x 343, written '≈ 3 km'). Light takes 3 087 / 299 792 458 = 0,0000103 s (shown as 0,00001 detik); sound takes 3 087 / 343 = 9,00 s. The scene is drawn at 638 px / 3 087 m = 0,2067 px a metre, so the front moves 343 x 0,2067 = 70,9 px a second, in real time. The human figure is not to scale, and neither is the light in time: its shell is drawn crossing the scene in 0,15 s (4 200 px a second) because its true speed would be a millionth of a frame; the board gives the true figure.",
         "source": "Arithmetic from f1 and f2."},
        {"id": "f6", "claim": "Distance to a strike ≈ seconds between flash and thunder x 343 m. One second: 343 m. Three seconds: 3 x 343 = 1 029 m ≈ 1 km (one kilometre takes 1 000 / 343 = 2,9 s). Nine seconds: 9 x 343 = 3 087 m ≈ 3 km. So a shorter count means a nearer strike. The US weather service gives the same rule in miles: count the seconds and divide by five (1 609 m / 343 m/s = 4,7 s a mile).",
         "source": "US National Weather Service, Understanding Lightning: Thunder (weather.gov/safety/lightning-science-thunder); arithmetic from f2."},
    ],
    "acts": [
        {"id": "hook", "title": "Pertanyaan", "goal": "Ask the question in the viewer's words while it happens on screen (a flash now, its thunder seconds later), then set the tension: both start at the same instant.", "rail": False},
        {"id": "balapan", "title": "Balapan", "goal": "Show the mechanism as a race in real time and to scale: light arrives at once, sound takes nine seconds, then the ratio.", "rail": False},
        {"id": "hitung", "title": "Hitung", "goal": "Turn the delay into a tool: count the seconds, three for a kilometre, and fewer means nearer.", "rail": False},
        {"id": "recap", "title": "Rangkuman", "goal": "The three ideas in one frame and the line to remember.", "rail": False},
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
