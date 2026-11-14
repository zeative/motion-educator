"""Writes storyboard.json for "Kenapa petir terlihat dulu, baru guntur terdengar?" (portrait, 1080 x 1920).

Shot lengths are counted in half beats of the music (86 BPM, so the grid is 172 to the minute); this script only does
that arithmetic and draws the frames. Edit the shots here, run it, then run the storyboard check:

    python3 examples/petir-guntur/storyboard.build.py && node kit/tools/storyboard.mjs examples/petir-guntur --png

The diagrams are to scale: 0.31 px for a metre, so sound (343 m/s) moves 106.3 px a second and the film shows it in
real time. The observer of the first strike stands 2 058 m away (6 x 343), the observer of the counted strike
1 029 m away (3 x 343). The strike times follow from that and are computed in film.js from the shot times here.
"""
import json
import math
import random
from pathlib import Path

HB = 60 / 172  # half a beat of the 86 BPM track
PX_PER_M = 0.31
SOUND = 343 * PX_PER_M  # px a second
shots = []

# Half beats for each shot. Set from the measured narration (node kit/audio/voice.mjs examples/petir-guntur).
LEN = {"s01": 12, "s02": 8, "s03": 8, "s04": 11, "s05": 4, "s06": 8, "s07": 10, "s08": 10, "s09": 8}


def shot(id, act, type, **fields):
    start = shots[-1]["_b1"] if shots else 0
    end = start + LEN[id]
    shots.append({"id": id, "act": act, "type": type, "start": round(start * HB, 3), "end": round(end * HB, 3), "_b1": end, **fields, "frames": FRAMES[id]})


def fr(at, note, *draw):
    return {"at": at, "note": note, "draw": list(draw)}


# Small lettering is drawn with "title" at a small size: the sketcher's "text" thing takes its place from the key
# "text" and its words from the key "text", which one JSON object cannot hold.

# ── Things the sketcher has no word for, drawn as curves ─────────────────────
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


def ring(cx, cy, r, colour="orange", width=7, a0=180, a1=360):
    return {"curve": [[round(cx + r * math.cos(math.radians(a)), 1), round(cy + r * math.sin(math.radians(a)), 1)] for a in range(a0, a1 + 1, 12)], "colour": colour, "width": width}


# ── The four framings of the one world ───────────────────────────────────────
# Diagram (camera at rest): cloud base 400, ground 1100, the bolt strikes at x 190, the observer stands at x 828.
G = 1100
SKY = {"sky": [0, 400], "tone": "dusk"}
GROUND = {"horizon": [G]}
BOLT = bolt(250, 395, 190, G, seed=3)
YOU = {"person": [828, G, 150]}
BOARD_XY = [400, 500, 530, 230]


def board(light, sound):
    return {"panel": BOARD_XY, "title": "tiba di kamu", "rows": [f"cahaya   {light}", f"suara   {sound}"]}


# Hook and poster: the same world with the camera moved so the bolt stands at x 430 and the ground at 1000, which
# leaves the lower third (on the dark floor) for the lettering.
HERO_SKY = {"sky": [0, 360], "tone": "dusk"}
HERO_GROUND = {"horizon": [1000]}
HERO_BOLT = bolt(500, 350, 430, 1000, seed=7, wander=60, width=12)
QUESTION = "Kenapa petir\nterlihat dulu,\nbaru guntur\nterdengar?"

# Macro: the camera 2.2 times closer on the strike point, which sits at (497, 1180).
MACRO_GROUND = {"horizon": [1180]}
MACRO_BOLT = bolt(560, -20, 497, 1180, seed=11, wander=70, width=16)

# Counted strike, seen from where the observer stands: a lower cloud deck, the bolt far off on the horizon.
POV_SKY = {"sky": [0, 560], "tone": "dusk"}
POV_BOLT = bolt(360, 555, 330, G, seed=5, wander=30, width=7)
POV_YOU = [{"dot": [790, 1085, 80], "colour": "ink"}, {"curve": [[560, 1500], [600, 1260], [700, 1180], [880, 1180], [980, 1260], [1020, 1500]], "colour": "ink", "width": 14}]
COUNT_AT = [775, 700]

# The counted strike from the side, camera 1.3 times closer: strike point at x 150, the observer at x 565 (1 029 m).
NEAR_SKY = {"sky": [0, 190], "tone": "dusk"}
NEAR_BOLT = bolt(230, 185, 150, G, seed=9, wander=50, width=11)
NEAR_YOU = {"person": [565, G, 195]}

FRAMES = {
    "s01": [
        fr(0.0, "Frame 0 is finished: storm sky, the leader already half way down, the first line of the question in place.",
           HERO_SKY, cloud(360, 2), HERO_GROUND, bolt(500, 350, 430, 1000, seed=7, wander=60, width=6, part=0.5), {"glow": [470, 520, 330], "colour": "violet"},
           {"title": [497, 1130], "text": "Kenapa petir", "size": 104, "accent": "petir"}, {"move": [470, 560, 440, 860], "text": "leader turun"}, {"camera": "push"}),
        fr(0.3, "0.25 s: the bolt strikes, silent. The whole sky is lit; the lines of the question land with the voice.",
           HERO_SKY, cloud(360, 2), HERO_GROUND, HERO_BOLT, {"scatter": [430, 1000, 9, 30, 130], "colour": "violet"}, {"glow": [440, 640, 480], "colour": "violet"},
           {"title": [497, 1130], "text": "Kenapa petir\nterlihat dulu,", "size": 104, "accent": "petir"}, {"move": [880, 1300, 880, 1210], "text": "baris demi baris"}),
        fr(1.0, "All four lines read; the bolt is an afterglow. The thunder has still not come: it lands on the cut.",
           HERO_SKY, cloud(360, 2), HERO_GROUND, bolt(500, 350, 430, 1000, seed=7, wander=60, width=5),
           {"title": [497, 1130], "text": QUESTION, "size": 104, "accent": "petir"}, {"camera": "push"}, {"cut": "maju ke titik sambaran"}),
    ],
    "s02": [
        fr(0.0, "The camera arrives 2.2 times closer on the strike point; the old channel is a faint trace. The hook's thunder lands here.",
           MACRO_GROUND, bolt(560, -20, 497, 1180, seed=11, wander=70, width=5), {"glow": [497, 700, 380], "colour": "violet"}, {"camera": "push"}),
        fr(0.3, "A new stroke: the channel flares white. In the same instant rays of light leave it and the air around it swells.",
           MACRO_GROUND, MACRO_BOLT, {"scatter": [520, 420, 10, 60, 300], "colour": "violet", "width": 4}, {"scatter": [500, 900, 10, 60, 300], "colour": "violet", "width": 4},
           wall(497 - 70, 0, 1180), wall(497 + 70, 0, 1180, seed=8), {"chip": [560, 300], "text": "kilat = cahaya"}, {"chip": [64, 640], "text": "udara ≈ 28.000 °C"}),
        fr(1.0, "The light is long gone; the front of sound is a dome 500 px out, moving at its true speed for this scale.",
           MACRO_GROUND, bolt(560, -20, 497, 1180, seed=11, wander=70, width=7), wall(497 - 400, 0, 1180), wall(497 + 400, 0, 1180, seed=8), wall(497 + 360, 0, 1180, seed=8, width=4),
           {"chip": [560, 300], "text": "kilat = cahaya"}, {"chip": [470, 900], "text": "guntur = suara"}, {"move": [560, 1060, 860, 1060], "text": "mengembang"}, {"cut": "kamera mundur"}),
    ],
    "s03": [
        fr(0.0, "The camera pulls back to the whole scene: the storm on the left, you on the right, 2 km apart. A leader comes down.",
           SKY, cloud(400, 3), GROUND, bolt(250, 395, 190, G, seed=3, width=6, part=0.45), YOU, {"chip": [744, 820], "text": "kamu"}, board("…", "…"), {"camera": "pull"}),
        fr(0.32, "0.83 s: the stroke. A ray of light crosses to your eye at once and the first row of the board is filled at its value.",
           SKY, cloud(400, 3), GROUND, BOLT, {"arrow": [215, 800, 800, 958], "colour": "violet", "width": 8}, {"glow": [828, 960, 110], "colour": "violet"}, YOU,
           {"chip": [300, 760], "text": "≈ 300.000 km/detik"}, board("0,000007 detik", "…"), wall(215, 420, G, width=6)),
        fr(1.0, "The light has arrived; the sound has gone 670 m. Its front creeps right while the second row counts.",
           SKY, cloud(400, 3), GROUND, bolt(250, 395, 190, G, seed=3, width=5), YOU, {"chip": [300, 760], "text": "≈ 300.000 km/detik"}, board("0,000007 detik", "1,9 detik…"),
           *front(398, 420, G), {"move": [430, 1000, 590, 1000], "text": "suara"}, {"cut": "tanpa potongan"}),
    ],
    "s04": [
        fr(0.0, "Same scene, one thing changed: the label is now on the sound. Its chip travels with the front.",
           SKY, cloud(400, 3), GROUND, bolt(250, 395, 190, G, seed=3, width=4), YOU, board("0,000007 detik", "2,0 detik…"), *front(400, 420, G),
           {"chip": [64, 860], "text": "≈ 343 m/detik"}, {"camera": "push"}),
        fr(0.5, "Half way: 3.9 s gone, the front at 1 340 m. The clock on the board runs in real time.",
           SKY, cloud(400, 3), GROUND, bolt(250, 395, 190, G, seed=3, width=4), YOU, board("0,000007 detik", "3,9 detik…"), *front(605, 420, G),
           {"chip": [170, 860], "text": "≈ 343 m/detik"}, {"move": [640, 1000, 780, 1000], "text": "merambat"}),
        fr(1.0, "5.8 s: the front is a few metres from you. The cut comes just before it arrives.",
           SKY, cloud(400, 3), GROUND, bolt(250, 395, 190, G, seed=3, width=4), YOU, board("0,000007 detik", "5,8 detik…"), *front(806, 420, G),
           {"chip": [370, 860], "text": "≈ 343 m/detik"}, {"cut": "potong dekat ke kamu"}),
    ],
    "s05": [
        fr(0.0, "Close on you, twice the size. The front is a hand's width away; 0.2 s later it hits and the thunder lands.",
           {"horizon": [1180]}, {"person": [560, 1180, 300]}, *front(520, 300, 1180), board("0,000007 detik", "5,8 detik…"), {"move": [330, 1060, 500, 1060], "text": "tiba"}),
        fr(1.0, "The front passes over you, the second row locks at 6,0 detik and takes the sound's colour.",
           {"horizon": [1180]}, {"person": [560, 1180, 300]}, *front(760, 300, 1180), {"scatter": [560, 900, 8, 70, 150], "colour": "orange", "width": 4},
           board("0,000007 detik", "6,0 detik ✓"), {"cut": "kedua kecepatan jadi pecahan"}),
    ],
    "s06": [
        fr(0.0, "The two speed chips leave their things and stack as a fraction over the dimmed scene.",
           SKY, cloud(400, 3), GROUND, YOU, {"chip": [150, 470], "text": "cahaya 299.792.458 m/detik"}, {"line": [150, 584, 852, 584], "width": 6}, {"chip": [270, 610], "text": "suara 343 m/detik"},
           {"move": [300, 820, 300, 720], "text": "jadi pecahan"}),
        fr(0.4, "The result slams in at its value, on the beat, with a ring from the stage.",
           SKY, cloud(400, 3), GROUND, YOU, {"chip": [150, 470], "text": "cahaya 299.792.458 m/detik"}, {"line": [150, 584, 852, 584], "width": 6}, {"chip": [270, 610], "text": "suara 343 m/detik"},
           {"number": [497, 880], "text": "≈ 874.000×", "size": 150}, {"glow": [497, 820, 360], "colour": "violet"}),
        fr(1.0, "Held for a second and a half with its unit; a sheen crosses the figure.",
           SKY, cloud(400, 3), GROUND, YOU, {"chip": [150, 470], "text": "cahaya 299.792.458 m/detik"}, {"line": [150, 584, 852, 584], "width": 6}, {"chip": [270, 610], "text": "suara 343 m/detik"},
           {"number": [497, 880], "text": "≈ 874.000×", "size": 150}, {"title": [497, 980], "text": "lebih cepat", "size": 64}, {"camera": "push"}, {"cut": "potong ke sudut pandangmu"}),
    ],
    "s07": [
        fr(0.14, "Your own view, over your shoulder. Half a second in, a new bolt far off: a silent flash. Start counting.",
           POV_SKY, cloud(560, 4), GROUND, POV_BOLT, {"glow": [340, 800, 420], "colour": "violet"}, *POV_YOU, {"title": [775, 450], "text": "detik sejak kilat", "size": 46}),
        fr(0.45, "One second after the flash the first figure pops, large, where the eye already is.",
           POV_SKY, cloud(560, 4), GROUND, bolt(360, 555, 330, G, seed=5, wander=30, width=4), *POV_YOU, {"title": [775, 450], "text": "detik sejak kilat", "size": 46},
           {"number": COUNT_AT, "text": "1", "size": 300}, {"move": [930, 760, 930, 640], "text": "pop"}),
        fr(0.75, "Two. Nothing heard yet: the figures are the only thing that changes, in real time.",
           POV_SKY, cloud(560, 4), GROUND, bolt(360, 555, 330, G, seed=5, wander=30, width=3), *POV_YOU, {"title": [775, 450], "text": "detik sejak kilat", "size": 46},
           {"number": COUNT_AT, "text": "2", "size": 300}, {"camera": "push"}, {"cut": "tepat di hitungan 3"}),
    ],
    "s08": [
        fr(0.0, "Cut to the side on the count of three: the front has just reached you, the thunder lands on the cut.",
           NEAR_SKY, cloud(190, 6), GROUND, bolt(230, 185, 150, G, seed=9, wander=50, width=5), NEAR_YOU, *front(565, 230, G), {"scatter": [565, 930, 8, 60, 130], "colour": "orange", "width": 4},
           {"number": COUNT_AT, "text": "3", "size": 300}, {"title": [775, 790], "text": "detik", "size": 56}),
        fr(0.45, "The sum arrives under the count, then the distance is measured along the ground.",
           NEAR_SKY, cloud(190, 6), GROUND, bolt(230, 185, 150, G, seed=9, wander=50, width=5), NEAR_YOU, *front(690, 230, G),
           {"number": COUNT_AT, "text": "3", "size": 300}, {"title": [775, 790], "text": "detik", "size": 56}, {"panel": [600, 830, 330, 180], "rows": ["× 343 m", "= 1.029 m"]},
           {"bracket": [150, 565, 1040], "text": "≈ 1 km", "colour": "blue"}),
        fr(1.0, "Everything holds; the front has moved on past you. The scene rises toward the recap.",
           NEAR_SKY, cloud(190, 6), GROUND, bolt(230, 185, 150, G, seed=9, wander=50, width=4), NEAR_YOU, *front(920, 230, G),
           {"number": COUNT_AT, "text": "3", "size": 300}, {"title": [775, 790], "text": "detik", "size": 56}, {"panel": [600, 830, 330, 180], "rows": ["× 343 m", "= 1.029 m"]},
           {"bracket": [150, 565, 1040], "text": "≈ 1 km", "colour": "blue"}, {"camera": "push"}, {"cut": "kartu rangkuman naik"}),
    ],
    "s09": [
        fr(0.0, "The hook's framing again. Three cards rise, each with its small picture; the first line of the poster lands.",
           HERO_SKY, HERO_GROUND, {"card": [64, 270, 866, 210]}, bolt(190, 300, 170, 450, seed=2, wander=14, width=6), ring(170, 450, 70), {"title": [560, 392], "text": "lahir bersamaan", "size": 56},
           {"card": [64, 500, 866, 210]}, {"title": [497, 1140], "text": "Lihat kilat,", "size": 96}, {"move": [980, 800, 980, 600], "text": "kartu naik"}),
        fr(0.5, "The whole recap: born together, light about 874 000 times faster, three seconds for a kilometre.",
           HERO_SKY, HERO_GROUND, {"card": [64, 270, 866, 210]}, bolt(190, 300, 170, 450, seed=2, wander=14, width=6), ring(170, 450, 70), {"title": [560, 392], "text": "lahir bersamaan", "size": 56},
           {"card": [64, 500, 866, 210]}, {"arrow": [110, 580, 290, 580], "colour": "violet"}, {"arrow": [110, 640, 150, 640], "colour": "orange"}, {"title": [600, 622], "text": "cahaya ≈ 874.000× lebih cepat", "size": 46},
           {"card": [64, 730, 866, 210]}, {"number": [180, 870], "text": "3", "size": 120}, {"title": [600, 852], "text": "3 detik ≈ 1 km", "size": 60},
           {"title": [497, 1140], "text": "Lihat kilat,\nhitung detiknya.", "size": 96, "accent": "hitung detiknya."}),
        fr(1.0, "The poster holds for two seconds, breathing, and can cut back to frame 0 without a jolt.",
           HERO_SKY, HERO_GROUND, {"card": [64, 270, 866, 210]}, bolt(190, 300, 170, 450, seed=2, wander=14, width=6), ring(170, 450, 70), {"title": [560, 392], "text": "lahir bersamaan", "size": 56},
           {"card": [64, 500, 866, 210]}, {"arrow": [110, 580, 290, 580], "colour": "violet"}, {"arrow": [110, 640, 150, 640], "colour": "orange"}, {"title": [600, 622], "text": "cahaya ≈ 874.000× lebih cepat", "size": 46},
           {"card": [64, 730, 866, 210]}, {"number": [180, 870], "text": "3", "size": 120}, {"title": [600, 852], "text": "3 detik ≈ 1 km", "size": 60},
           {"title": [497, 1140], "text": "Lihat kilat,\nhitung detiknya.", "size": 96, "accent": "hitung detiknya."}, {"camera": "push"}, {"cut": "kembali ke awal"}),
    ],
}

# ── Babak 1: pertanyaan ──────────────────────────────────────────────────────
shot("s01", "hook", "wide",
     voice="Kenapa petir terlihat dulu, baru guntur terdengar?",
     teaches="Asks the question the film answers, and shows it happening: the flash comes at 0.25 s, its thunder only on the cut.",
     screen="Night storm, the camera placed so the bolt stands at x 430 and the ground at y 1000. A cloud deck fills the top to y 360, lit from inside. A violet-white bolt runs from the cloud base to the ground. On the dark floor below the horizon, inside the safe area, the question in four lines of metal type at 104 px: 'Kenapa petir / terlihat dulu, / baru guntur / terdengar?', 'petir' in the violet of light and 'guntur' in the amber of sound.",
     motion="Frame 0 already holds the first line and a leader half way down. At 0.25 s the return stroke: two frames of full flash, a flicker, an afterglow. The other three lines slam in one by one in step with the voice. Clouds drift, rain falls, the camera pushes 4 percent.",
     carries="The bolt's channel and its strike point: the camera goes to it.",
     transition="The lettering lifts away and the camera pushes into the strike point; no cut in the picture.",
     sound="Music from the first frame, low. The flash is silent on purpose. No effect until the thunder, which lands on the cut to s02.",
     check="The question is readable inside the safe area by 1.5 s and never under the app's buttons. The flash is at 0.25 s. Nothing sounds at the flash.",
     facts=["f4"])

shot("s02", "sebab", "macro",
     voice="Padahal keduanya lahir bersamaan.",
     caption="Padahal keduanya lahir *bersamaan*.",
     teaches="The tension: light and sound start at the same instant, from the same channel, because the stroke heats the air.",
     screen="Close on the strike point (2.2 times), which sits at (497, 1180); the channel runs up and out of the top of the frame. When it flares, white shells of light and short rays leave it on both sides and are out of the frame in a few frames, while an amber front of sound, the channel's own outline, begins to swell away from it. Three chips sit on their things: 'kilat = cahaya' on the rays, 'guntur = suara' on the front, 'udara ≈ 28.000 °C' on the channel.",
     motion="0.45 s in, a new stroke flares. A shell of light leaves with the stroke and with each of its three re-strikes and crosses the frame in a tenth of a second, short rays keep streaming while the channel glows; the front grows at the diagram's true speed (106 px a second in the world, 234 on screen). Chips pop as their thing appears. The stage light sits on the channel.",
     carries="The front of sound and the colour code: violet is light, amber is sound.",
     transition="The camera pulls back fast to the whole scene; the old front fades as a new leader starts down.",
     sound="The hook's thunder (a deep drum impact with a falling body under it, trimmed short) on the cut, before the line. A very soft sparkle when the channel flares.",
     check="Rays and front start on the same frame. The front is amber, the rays violet. 28 000 °C matches the fact sheet. The caption does not sit on the bright channel.",
     facts=["f4"])

# ── Babak 2: balapan ─────────────────────────────────────────────────────────
shot("s03", "balapan", "diagram",
     voice="Cahayanya sampai nyaris seketika.",
     caption="Cahayanya sampai *nyaris seketika*.",
     teaches="Light crosses the two kilometres to you in seven millionths of a second: you see the flash the moment it happens.",
     screen="The whole scene from the side, to scale (0.31 px a metre): cloud deck to y 400, ground at y 1100, the bolt striking at x 190, you standing at x 828, which is 2 058 m away. A glass board at (400, 500), 'tiba di kamu', with two rows: 'cahaya' and 'suara'. A chip 'kamu' over the figure. After the stroke: a violet ray from the channel to your eye, the chip '≈ 300.000 km/detik' on the ray, and the first row reading '0,000007 detik'.",
     motion="A leader comes down for 0.8 s, then the stroke: flash, a shell of light sweeps the scene and the ray is at your eye within nine frames, your figure is rim lit and the first row is filled at its value. The amber front leaves the channel on the same frame and creeps right at 106 px a second while the second row starts counting tenths.",
     carries="The front of sound, still on its way, and the board with its second row counting.",
     transition="No cut in the picture: the light's chip fades and the sound's chip arrives.",
     sound="The flash is silent. One small tick when the first row is filled.",
     check="The ray reaches the eye within 0.16 s of the flash. The row reads 0,000007 detik. The front moves 106 px a second. The figure is not hidden by the board.",
     facts=["f1", "f5"])

shot("s04", "balapan", "diagram",
     voice="Suara cuma tiga ratus empat puluh tiga meter per detik.",
     caption="Suara cuma *343 meter* per detik.",
     teaches="Sound is slow: 343 metres a second. The viewer watches it take its real six seconds to cross.",
     screen="The same scene. The amber front, a standing wavy line with fainter fronts behind it, is between the bolt and you. A chip '≈ 343 m/detik' travels just behind the front; the chip 'kamu' leaves a second before the two would meet. The board's second row shows the running time in tenths of a second.",
     motion="The front crosses from x 400 to x 806 in real time, the chip with it. The camera pushes 5 percent toward you. The stage light follows the front along the ground.",
     carries="The front, a few metres from you, and the running clock.",
     transition="A cut to a close shot of you, 0.2 s before the front arrives.",
     sound="A low hum rides under the front, very quiet under the voice.",
     check="At every frame the front's distance from the strike point is 343 m/s times the time since the flash, at 0.31 px a metre. The chip never leaves the safe area.",
     facts=["f2", "f5"])

shot("s05", "balapan", "macro",
     caption="Baru *terdengar*.",
     teaches="The answer to the question in one picture: the thunder reaches you six seconds after the light did.",
     screen="Close on you (twice the size), feet at (560, 1180). The amber front sweeps over the figure; small arcs of sound at the ears; the figure shakes. The board, in the same place, locks its second row at '6,0 detik' in amber.",
     motion="0.2 s after the cut the front reaches you: a hit, a ring from the stage, the light turns amber for a moment. The row locks with a tick. The front keeps travelling right.",
     carries="The two speeds, as their chips.",
     transition="The camera returns to the whole scene as the two chips fly to the middle and stack.",
     sound="THE THUNDER: a big impact with a sub drop under it, on the frame the front arrives. No voice in this shot.",
     check="The front touches the figure exactly 6.00 s after the flash of s03. The row reads 6,0 detik.",
     facts=["f5"])

shot("s06", "balapan", "compare",
     voice="Cahaya hampir sejuta kali lebih cepat.",
     caption="Cahaya hampir *sejuta kali* lebih cepat.",
     teaches="The number, once, with what it is computed from: 299 792 458 divided by 343 is about 874 000.",
     screen="Over the dimmed scene, a fraction made of the two chips: 'cahaya 299.792.458 m/detik' above a rule, 'suara 343 m/detik' below it. Under the fraction the result in metal type at 138 px, '≈ 874.000×', and beneath it 'lebih cepat'.",
     motion="The chips land as a fraction, the rule draws, the result slams in at its value on the beat with a ring, a sheen crosses it. It holds a second and a half; the camera pushes 4 percent.",
     carries="The storm itself: the same sky, now seen from where you stand.",
     transition="A hard cut on the beat to your own view of the storm; the figure is thrown upward as it goes.",
     sound="A soft thud with a short deep impact under the figure, ducked under the voice.",
     check="874.000 agrees with 299 792 458 / 343 = 874 030. The figure never counts up. It is inside the safe area.",
     facts=["f1", "f2", "f3"])

# ── Babak 3: menghitung ──────────────────────────────────────────────────────
shot("s07", "hitung", "wide",
     voice="Jadi, lihat kilat, lalu hitung detiknya.",
     caption="Jadi, lihat kilat, lalu *hitung detiknya*.",
     teaches="What to do with it: start counting seconds when you see the flash.",
     screen="Your own view over your shoulder: the back of your head and shoulders dark in the lower right, a low cloud deck to y 560, the horizon at y 1100 and a thin bolt far off at x 330. To the right of the bolt, at (775, 700), the count in violet figures 300 px tall, under a small label 'detik sejak kilat'.",
     motion="The bolt flashes 0.49 s after the cut, as the voice says 'lihat kilat', silent. Exactly one second later '1' pops, a second after that '2'. Each figure replaces the last on one frame. The afterglow fades; clouds flicker far away.",
     carries="The count, in the same place on screen.",
     transition="A hard cut on the count of three, as the thunder lands.",
     sound="No thunder yet. A soft tick with each figure, between the words.",
     check="The figures land 1.00 s and 2.00 s after the flash. They are inside the safe area and clear of the caption.",
     facts=["f6"])

shot("s08", "hitung", "diagram",
     voice="Tiga detik? Petirnya sekitar satu kilometer.",
     caption="Tiga detik? Petirnya sekitar *satu kilometer*.",
     teaches="Seconds times 343 metres is the distance: three seconds is about one kilometre.",
     screen="The counted strike from the side, to the same scale, camera 1.3 times closer: strike point at x 150, you at x 565, which is 1 029 m away. The front is on you. The count '3' at (775, 700) with 'detik' under it; below, a glass card with '× 343 m' and '= 1.029 m'. Along the ground a ruler from the strike point to you, and over it, large, '≈ 1 km'.",
     motion="On the cut the front arrives: hit, ring, the figure shakes, '3' pops. The card's two rows land one after the other, then the ruler draws from the bolt to you and '≈ 1 km' lands on it. The front moves on to the right.",
     carries="The rule: three seconds, about a kilometre.",
     transition="The scene sinks as the recap cards rise over the storm.",
     sound="The thunder on the cut, shorter and lighter than the first (it is nearer but the film is talking). A tick for each row, a soft chime when the distance lands.",
     check="The front reaches the figure exactly 3.00 s after the flash of s07. 3 x 343 = 1 029 is written correctly. The ruler ends at the figure's feet.",
     facts=["f2", "f6"])

shot("s09", "recap", "recap",
     teaches="The three ideas in one frame, and the line to remember: see the flash, count the seconds.",
     screen="The hook's framing of the storm. Three glass cards, 866 px wide, at y 270, 500 and 730, each with a small picture and a line: a bolt with a ring of sound, 'Kilat dan guntur lahir bersamaan'; a long violet arrow that runs off the card over a short amber one, 'Cahaya ≈ 874.000× lebih cepat'; a large 3 over a ruler, '3 detik ≈ 1 km / tiap detik ≈ 343 m'. Below, where the question stood in s01, the poster line in metal type at 106 px: 'Lihat kilat, / hitung detiknya.'.",
     motion="The cards rise in one after another in the first 0.6 s, the two lines of the poster slam in, a sheen crosses them. Then everything holds for two seconds with a 3 percent push while the clouds drift.",
     transition="The film ends on this frame; it can cut back to frame 0, which has the same sky and lettering in the same place.",
     sound="A short whoosh as the cards rise, a soft low impact under the poster line, the music faded over the last 1.8 s. No voice.",
     check="Every figure matches the fact sheet. The poster line is fully readable for at least two seconds. Nothing is outside the safe area.",
     facts=["f3", "f4", "f6"])

duration = shots[-1]["_b1"] * HB
for s in shots:
    del s["_b1"]

storyboard = {
    "title": "Kenapa petir terlihat dulu, baru guntur terdengar?",
    "question": "Kenapa petir terlihat dulu, baru guntur terdengar?",
    "audience": "Remaja dan orang dewasa di Indonesia yang menonton video pendek di ponsel. Mereka tahu petir dan guntur, pernah dengar bahwa 'cahaya lebih cepat', tapi belum tahu seberapa jauh bedanya dan belum pernah memakainya untuk mengukur jarak.",
    "promise": "Kilat dan guntur lahir di saat yang sama, tapi cahaya hampir sejuta kali lebih cepat daripada suara. Jadi hitung detik dari kilat sampai guntur: tiap detik kira-kira 343 meter, tiga detik kira-kira satu kilometer.",
    "language": "id",
    "format": "1080x1920",
    "captions": "pop",
    "duration": round(duration, 3),
    "fps": 60,
    "poster": 5.3,
    "voice": {"voice_id": "1ijzBXcD3AIVH8RGMcQd", "name": "Jefri", "model": "eleven_multilingual_v2", "language": "id"},
    "look": {
        "accent": "#a98bff",
        "accent2": "#ffb347",
        "mood": "A night storm over the kit's graphite floor: a shader sky of drifting cloud lit from inside, the floor's grid as the ground. Violet-white is light (the bolt, its rays, the count); amber is sound (the front, its clock). The stage light sits on the bolt when it strikes and travels to the observer with the sound, turning amber when the thunder lands.",
    },
    "music": {
        "track": "Xceed Thru Johann (Mixkit 556)",
        "bpm": 172,
        "beat": round(HB, 6),
        "offset": 0,
        "start": 0.679,
        "note": "An 86 BPM track tagged investigation and tension, with no drop. The grid is its half beat (172 to the minute) so that shots can be as short as the narration allows; it starts 0.679 s in, which puts a beat on frame 0. Kept at -21 LUFS under the voice.",
    },
    "facts": [
        {"id": "f1", "claim": "Light travels at 299 792 458 m/s in vacuum (exact, by definition of the metre); in air it is 0,03% slower (refractive index about 1,0003), so about 299 700 km/s. The film rounds this to '≈ 300.000 km/detik' and uses the exact figure in the division.",
         "source": "BIPM, The International System of Units (SI Brochure), 9th edition, 2019: definition of the metre. Refractive index of air: Ciddor 1996, Applied Optics 35, 1566."},
        {"id": "f2", "claim": "Sound travels at about 343 m/s in dry air at 20 °C: 331,3 x sqrt(1 + 20/273,15) = 343,2 m/s. It depends on temperature (347 m/s at 27 °C, 349 m/s at 30 °C), so every distance in the film is marked '≈'. Simplification: the film uses the 20 °C figure everywhere; on a 30 °C evening the true distances are 1,7% larger.",
         "source": "Standard formula for an ideal gas, e.g. US National Weather Service, Speed of Sound Calculator (weather.gov/epz/wxcalc_speedofsound); Kinsler et al., Fundamentals of Acoustics, 4th ed."},
        {"id": "f3", "claim": "Light is about 874 000 times faster than sound in air: 299 792 458 / 343 = 874 030. Spoken as 'hampir sejuta kali' (nearly a million), written as '≈ 874.000×'.",
         "source": "Arithmetic from f1 and f2."},
        {"id": "f4", "claim": "Thunder is made by the lightning itself: the stroke heats the air in its channel to about 50 000 °F = (50 000 - 32) x 5/9 = 27 760 °C ≈ 28 000 °C within microseconds, the air expands explosively, and that shock becomes the sound. So the flash and the thunder start at the same moment and place. Simplification: thunder comes from the whole length of the channel, which is why it rumbles; the film draws the front as the channel's outline moving outward and times the arrival from the nearest point, the strike point.",
         "source": "NOAA National Severe Storms Laboratory, Severe Weather 101: Lightning Basics and FAQ (nssl.noaa.gov/education/svrwx101/lightning); US National Weather Service, Understanding Lightning: Thunder (weather.gov/safety/lightning-science-thunder)."},
        {"id": "f5", "claim": "Over the 2 058 m of the first strike, light takes 2 058 / 299 792 458 = 0,0000069 s (shown as 0,000007 detik) and sound takes 2 058 / 343 = 6,00 s. The scene is drawn at 0,31 px a metre, so 2 058 m is 638 px and the front moves 343 x 0,31 = 106,3 px a second, in real time. The human figure is not to scale, and neither is the light in time: its shell is drawn crossing the scene in 0,15 s (4 200 px a second) because its true speed would be a millionth of a frame; the board gives the true figure.",
         "source": "Arithmetic from f1 and f2."},
        {"id": "f6", "claim": "Distance to a strike ≈ seconds between flash and thunder x 343 m. Three seconds: 3 x 343 = 1 029 m ≈ 1 km (one kilometre takes 1 000 / 343 = 2,9 s). The US weather service gives the same rule in miles: count the seconds and divide by five (1 609 m / 343 m/s = 4,7 s a mile).",
         "source": "US National Weather Service, Understanding Lightning: Thunder (weather.gov/safety/lightning-science-thunder); arithmetic from f2."},
    ],
    "acts": [
        {"id": "hook", "title": "Pertanyaan", "goal": "Ask the question in the viewer's words while it happens on screen: a flash now, its thunder seconds later.", "rail": False},
        {"id": "sebab", "title": "Lahir bersamaan", "goal": "Set the tension: both start at the same instant, so the delay needs an explanation.", "rail": False},
        {"id": "balapan", "title": "Balapan", "goal": "Show the mechanism as a race in real time and to scale: light arrives at once, sound takes six seconds, then the ratio.", "rail": False},
        {"id": "hitung", "title": "Hitung", "goal": "Turn the delay into a tool: count the seconds, multiply by 343 metres.", "rail": False},
        {"id": "recap", "title": "Rangkuman", "goal": "The three ideas in one frame and the line to remember.", "rail": False},
    ],
    "shots": shots,
}

out = Path(__file__).with_name("storyboard.json")
out.write_text(json.dumps(storyboard, ensure_ascii=False, indent=2) + "\n")
print(f"{len(shots)} shots, {sum(len(s['frames']) for s in shots)} frames, {duration:.3f} s -> {out}")
