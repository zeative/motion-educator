"""Writes storyboard.json for "Kenapa gunung api bisa meledak?" (landscape 1920 x 1080, the Low Poly template).

The sample film of the Low Poly visual template: a faceted 3D world of flat-shaded triangles under a soft gradient
sky, one sun, soft fog, captions only (no voice) on a soft translucent panel two or three words at a time. It loops:
the last caption ("Itulah kenapa") runs into the first, and the last picture is the first one a moment early.

    python3 examples/gunung-api/storyboard.build.py && node kit/tools/storyboard.mjs examples/gunung-api --png

The example is Merapi (Central Java / Yogyakarta). Its silhouette is not drawn by eye: the profile below is the real
west-east terrain profile through the summit (AWS Terrain Tiles, SRTM-derived, sampled every 0.5 km; reference/
profil-merapi-kilauea.png), drawn at true scale (the same px per km both ways). The cross-sections are schematic and
say so on screen; they are laid over the USGS drawings of a composite volcano and a lava dome (reference/).
Shot lengths are counted in beats of the bed (72 BPM, one beat 0.833 s), so every cut lands on the grid.
"""
import json
import math
from pathlib import Path

HERE = Path(__file__).parent
BPM = 72
BEAT = 60 / BPM

# ── The numbers ──────────────────────────────────────────────────────────────────────────────────────────────────
# Merapi, west (-) to east (+) through the summit: (km from the summit, metres above sea level). Terrain tiles, f11.
MERAPI_WE = [(-8.0, 835), (-7.5, 867), (-7.0, 906), (-6.5, 945), (-6.0, 997), (-5.5, 1040), (-5.0, 1119), (-4.5, 1193), (-4.0, 1260),
             (-3.5, 1364), (-3.0, 1441), (-2.5, 1559), (-2.0, 1727), (-1.5, 1985), (-1.0, 2281), (-0.5, 2616), (0.0, 2915), (0.5, 2581),
             (1.0, 2481), (1.5, 2417), (2.0, 2083), (2.5, 1820), (3.0, 1455), (3.5, 1337), (4.0, 1284), (4.5, 1218), (5.0, 1249),
             (5.5, 1177), (6.0, 1090), (6.5, 1055), (7.0, 1012), (7.5, 958), (8.0, 912)]
ASH_KM = 17.0  # Merapi, 4 November 2010 (f10)
EVEREST_KM = 8.84886  # f10
MERAPI_KM = 2.910  # ESDM (f9)
assert round(ASH_KM / EVEREST_KM, 1) == 1.9  # "hampir dua kali Everest"

# ── Drawing helpers (1920 x 1080; what must be read stays above y 850 and inside x 80..1840) ─────────────────────────
shots = []
ACC = "orange"  # the accent #ff9f1c and the magma


def fr(at, note, *draw):
    flat = []
    for d in draw:
        flat.extend(d if isinstance(d, list) else [d])
    return {"at": at, "note": note, "draw": flat}


def label(x, y, text, size=40, **more):
    return {"label": [x, y], "text": text, "size": size, **more}


def tag(x, y, text, tx, ty):
    """A floating tag (the template's 'floating tags with lines to the object'): a rounded chip and a leader."""
    w = 60 + len(text) * 27
    ax = x if tx < x else x + w
    return [{"line": [round(ax), y + 44, tx, ty], "width": 4}, {"chip": [x, y], "text": text}]


def pts(points):
    return "M" + " L".join(f"{x:.0f} {y:.0f}" for x, y in points)


# Merapi at true scale: k px per km both ways, the 1000 m contour at base_y, the summit at x cx.
def merapi(cx=960, base_y=700, k=230, half=4.5, facets=True):
    prof = [(cx + d * k, base_y - (e - 1000) / 1000 * k) for d, e in MERAPI_WE if abs(d) <= half]
    out = [{"path": pts(prof) + f" L{prof[-1][0]:.0f} {base_y + 40} L{prof[0][0]:.0f} {base_y + 40} Z", "fill": "ink", "width": 6}]
    if facets:  # flat-shaded triangles: each profile vertex joined to the base half-way to the next one
        segs = []
        for i, (x, y) in enumerate(prof[:-1]):
            xm = (x + prof[i + 1][0]) / 2
            segs.append(f"M{x:.0f} {y:.0f} L{xm + (40 if i % 2 else -40):.0f} {base_y + 40}")
        out.append({"path": " ".join(segs), "width": 2})
    return out


SUMMIT = (960, 700 - (2915 - 1000) / 1000 * 230)  # (960, 260)


def world(sun=(1610, 160, 46), merbabu=True):
    out = [{"sky": [0, 700], "tone": "dusk"}, {"sun": list(sun)}]
    if merbabu:
        out.append({"path": "M180 700 L420 430 L520 352 L600 410 L760 560 L820 700 Z", "colour": "white", "fill": "white", "width": 4})
    return out


def fields(y=700):
    """The plain below Merapi: rice fields and villages as flat facets."""
    return [{"horizon": [y + 40]}, {"path": f"M80 {y + 90} L600 {y + 60} L1100 {y + 100} L1840 {y + 70} M80 {y + 140} L700 {y + 120} L1300 {y + 150} L1840 {y + 125}", "colour": "green", "width": 3}]


def ash(level=1.0, x=960):
    """The ash column from the summit, faceted puffs; level 0..1 is how far it has risen in the frame."""
    out = []
    puffs = [(0, 250, 190), (-15, 185, 300), (20, 115, 420), (-10, 45, 560)]
    for i, (dx, y, w) in enumerate(puffs):
        if i / len(puffs) < level:
            out.append({"cloud": [x + dx, y, w]})
    out.append({"path": f"M{x - 30} {SUMMIT[1]} L{x - 60} 200 M{x + 30} {SUMMIT[1]} L{x + 70} 200", "colour": "white", "width": 5})
    return out


def caption_groups(text, start, end, lead=0.12, tail=0.1):
    """The groups of the pop caption, as kit/engine/motion.js times them: at most 3 words and 18 characters each."""
    words = text.replace("*", "").split()
    weights = [len(w) + 2 for w in words]
    total = sum(weights)
    frm = start + lead
    until = end - tail - min(1.2, (end - start) * 0.3)
    run, times = 0, []
    for w in weights:
        times.append(frm + (until - frm) * run / total)
        run += w
    groups = [[]]
    for w, t in zip(words, times):
        g = groups[-1]
        chars = sum(len(x) + 1 for x, _ in g)
        if g and (len(g) >= 3 or chars + len(w) > 18 or g[-1][0][-1] in ".!?"):
            groups.append([(w, t)])
        else:
            g.append((w, t))
    return [(" ".join(w for w, _ in g), g[0][1]) for g in groups]


def cap(text, start, end, at):
    """The caption group on screen at this frame: the soft panel at the bottom centre (grey ink: not the picture)."""
    t = start + (end - start) * at
    groups = caption_groups(text, start, end)
    shown = groups[0][0]
    for words, t0 in groups:
        if t0 <= t + 1e-6:
            shown = words
    w = 60 + len(shown) * 27
    return {"chip": [round(960 - w / 2), 862], "text": shown}


# Tri-atomic gas molecules (H2O, CO2 and SO2 all have three atoms), drawn as three dots.
def gas(x, y, s=1.0, kind="h2o"):
    if kind == "co2":
        return [{"dot": [x - 16 * s, y, 7 * s], "colour": "white"}, {"dot": [x, y, 9 * s], "colour": "ink"}, {"dot": [x + 16 * s, y, 7 * s], "colour": "white"}]
    return [{"dot": [x - 12 * s, y + 10 * s, 6 * s], "colour": "white"}, {"dot": [x, y, 9 * s], "colour": "ink"}, {"dot": [x + 12 * s, y + 10 * s, 6 * s], "colour": "white"}]


GAS_AT = [(260, 220), (520, 330), (760, 180), (980, 380), (1210, 250), (1450, 360), (1680, 200), (380, 560), (700, 620), (1080, 600), (1360, 650), (1620, 560)]


def gases(scale=2.2, n=12):
    out = []
    for i, (x, y) in enumerate(GAS_AT[:n]):
        out += gas(x, y, scale, "co2" if i % 3 == 1 else "h2o")
    return out


def magma_bg():
    """The inside of the reservoir: faceted molten rock, deep orange facets."""
    return [{"path": "M80 80 L700 60 L1300 110 L1840 70 L1840 820 L1200 840 L600 800 L80 830 Z", "fill": ACC, "colour": ACC, "width": 4},
            {"path": "M80 80 L600 800 M700 60 L1200 840 M1300 110 L600 800 M1840 70 L1200 840 M700 60 L80 830 M1300 110 L1840 820", "colour": ACC, "width": 2}]


def bubbles(xs, y0, y1, r0, r1, n=6):
    """Bubbles in a column, small at the bottom (y0) and larger towards the top (y1)."""
    out = []
    for i in range(n):
        f = i / max(1, n - 1)
        out.append({"ring": [xs[i % len(xs)], round(y0 + (y1 - y0) * f), round(r0 + (r1 - r0) * f)], "width": 4})
    return out


def gauge(x, y, value, text="tekanan"):
    """A pressure gauge: an arc from low (left) to high (right), the needle at value 0..1."""
    a = math.radians(180 + 180 * value)
    return [{"path": f"M{x - 90} {y} A90 90 0 0 1 {x + 90} {y}", "width": 6}, {"path": f"M{x + 64} {y - 64} A90 90 0 0 1 {x + 90} {y}", "colour": "red", "width": 10},
            {"line": [x, y, round(x + 78 * math.cos(a)), round(y + 78 * math.sin(a))], "width": 7}, {"dot": [x, y, 10]}, label(x, y + 50, text, 36)]


# The cut-away Merapi: the USGS composite-volcano drawing for the cone, the conduit and the reservoir under it.
PLATE = {"blueprint": "reference/usgs-composite-volcano.png", "at": [600, 120, 720, 542], "crop": [0, 0, 348, 262]}
VENT_X = 960


def section(magma_y=740, conduit_to=150, colour=ACC, plate=True):
    out = [PLATE] if plate else [{"path": "M560 662 L860 230 L960 140 L1060 230 L1360 662 Z", "width": 6}]
    out += [{"path": f"M{VENT_X - 14} {magma_y - 40} L{VENT_X - 10} {conduit_to} M{VENT_X + 14} {magma_y - 40} L{VENT_X + 10} {conduit_to}", "colour": colour, "width": 6},
            {"path": f"M{VENT_X - 230} {magma_y} L{VENT_X - 120} {magma_y - 50} L{VENT_X + 60} {magma_y - 60} L{VENT_X + 220} {magma_y - 20} L{VENT_X + 160} {magma_y + 50} L{VENT_X - 150} {magma_y + 55} Z", "fill": colour, "colour": colour, "width": 5}]
    return out


NOT_TO_SCALE = label(1810, 110, "skema · tidak sesuai skala", 34, align="end")


def shot(id, act, type_, beats, caption, **more):
    start = shots[-1]["_end"] if shots else 0
    end = start + beats
    entry = {"id": id, "act": act, "type": type_, "start": round(start * BEAT, 3), "end": round(end * BEAT, 3), "_end": end}
    if caption:
        entry["caption"] = caption
    entry.update(more)
    shots.append(entry)


def at(sid):
    """(start, end) of a shot already planned, in seconds."""
    s = next(x for x in shots if x["id"] == sid)
    return s["start"], s["end"]


def beats_to_times(n_before, beats):
    return n_before * BEAT, (n_before + beats) * BEAT


PLAN = [("s01", 5), ("s02", 4), ("s03", 3), ("s04", 4), ("s05", 4), ("s06", 4), ("s07", 4), ("s08", 4), ("s09", 3), ("s10", 3),
        ("s11", 4), ("s12", 3), ("s13", 4), ("s14", 3), ("s15", 5), ("s16", 4), ("s17", 5), ("s18", 3)]
TIMES = {}
_b = 0
for _id, _n in PLAN:
    TIMES[_id] = beats_to_times(_b, _n)
    _b += _n


def C(sid, text, a):
    return cap(text, TIMES[sid][0], TIMES[sid][1], a)


OPENING = world() + merapi() + fields() + ash(1.0) + tag(1250, 250, "Merapi, 2010", 1000, 270)

C01 = "Gunung api bisa *meledak* begini."
shot("s01", "hook", "wide", 5, C01,
     teaches="The puzzle, shown: a real volcano exploding, Merapi in 2010.",
     screen="A faceted dawn world: a soft gradient sky (orange #ff9f1c at the top to sand #ffbf69 and pale #cbf3f0 at the horizon), one low sun at upper right with a faint bloom, soft fog towards the horizon. Merapi fills the middle of the frame, built from its real west-east profile at true scale (summit at (960, 260), the shoulder on the east side), grey-brown facets on the bare upper cone, green facets on the lower flanks, the breached summit crater; Merbabu behind on the left, pale in the fog; rice-field facets in the foreground. A faceted ash column rises from the summit and leaves the top of the frame. A floating tag 'Merapi, 2010' with a line to the summit.",
     camera="A slow drone orbit: from 15 degrees west of south to 5 degrees east of south, about 14 km from the summit and 600 m above the plain, a 35 mm-equivalent lens; Merapi's summit in focus, the fog softening Merbabu.",
     motion="Frame 0 is finished: the column is already rising. Main move: the orbit. Supporting: the ash puffs assemble facet by facet as they rise and the column widens. Detail: the fields' facets shimmer once as the sun catches them.",
     carries="The ash column.", transition="The camera rises into the ash and flies through the cloud (the template's cloud cut).",
     sound="The bed starts from frame 0 (warm pad, soft wind); a low muffled rumble under the column; one gentle chime as the tag appears.",
     check="Merapi's silhouette matches the reference profile (steep summit cone, east shoulder); the column leaves the frame (it reached 17 km, far above it); nothing smooth or textured.",
     facts=["f9", "f10", "f11"],
     frames=[fr(0, "Frame 0, finished: Merapi at dawn with its ash column rising, the tag on the summit.", OPENING, {"camera": "orbit"}, C("s01", C01, 0)),
             fr(0.5, "The orbit continues; the column assembles more facets and widens.", OPENING, {"move": [960, 240, 960, 60], "text": "abu naik"}, {"camera": "orbit"}, C("s01", C01, 0.5)),
             fr(1, "The camera tilts up into the ash.", OPENING, {"camera": "up"}, {"cut": "terbang lewat awan abu"}, C("s01", C01, 1))])

# Kilauea: a gentle shield at 100 px per km both ways (true scale); lava ribbons running to the sea.
KIL = [{"sky": [0, 640], "tone": "day"}, {"sun": [1500, 150, 46]},
       {"path": "M0 640 L500 560 L900 520 L1200 540 L1500 600 L1500 1080 L0 1080 Z", "fill": "ink", "width": 6},
       {"path": "M0 760 L400 700 L700 820 L1100 720 L1500 800 M200 640 L400 1080 M700 545 L900 1080 M1100 535 L1200 1080", "width": 2},
       {"path": "M1500 600 L1920 600 L1920 1080 L1500 1080 Z", "fill": "blue", "colour": "blue", "width": 4},
       {"path": "M1560 680 L1700 660 L1840 700 M1540 780 L1720 760 L1880 800", "colour": "blue", "width": 3},
       {"path": "M930 520 C 1000 560, 1100 590, 1250 640 M940 522 C 980 600, 1060 650, 1150 700", "colour": ACC, "width": 12},
       {"path": "M915 520 L930 470 L945 520", "colour": ACC, "width": 6}]
C02 = "Tapi di Hawaii, lavanya *mengalir*."
# The split of s02's last beat: both volcanoes at the same true scale (110 px per km both ways).
SPLIT = ([{"path": "M960 60 V840", "width": 6}] + merapi(cx=480, base_y=700, k=110, half=4.0, facets=False)
         + [{"cloud": [480, 430, 160]}, {"cloud": [470, 350, 240]}, {"cloud": [490, 260, 320]},
            {"path": "M1000 700 L1200 688 L1420 678 L1600 684 L1700 700", "fill": "ink", "width": 5}, {"path": "M1700 702 L1840 702", "colour": "blue", "width": 5},
            {"path": "M1420 680 C 1500 684, 1600 692, 1700 700", "colour": ACC, "width": 9}, {"path": "M1414 678 L1420 650 L1426 678", "colour": ACC, "width": 5}])
SPLIT_DIM = [dict(t, colour="white") if "path" in t or "line" in t else t for t in SPLIT if "cloud" not in t]
shot("s02", "hook", "compare", 4, C02,
     teaches="The contrast: at Kīlauea in Hawaii the same kind of molten rock just flows out as lava.",
     screen="Through the cloud, a second faceted world in a midday palette (teal sea #2ec4b6, pale sky #cbf3f0, dark #293241 basalt): Kīlauea's broad, gentle shield at true scale (slopes of a few degrees, from its real profile), a low lava fountain at a vent and two orange faceted lava ribbons flowing down to the coastline and the sea. A floating tag 'Kīlauea, Hawaii'. In the last beat the frame splits, both volcanoes at the same true scale (110 px per km both ways): Merapi with its column on the left half, Kīlauea's low shield with its lava on the right, tags 'meledak' and 'mengalir'.",
     camera="Out of the cloud the camera glides low over Kīlauea's coast, 20 km wide in frame, eye level 300 m, then pulls back to a two-panel split; the lava ribbons in focus.",
     motion="Main move: the glide. Supporting: the lava ribbons move as facets sliding downhill (slow, steady); the fountain pulses a little. Detail: steam where the lava meets the sea. The split slides in from the left on the last beat.",
     carries="The two halves, Merapi and Kīlauea.", transition="The split dims behind the question panel of s03.",
     sound="Soft wind and surf; a low lava gurgle; the same chime for the tag.",
     check="The shield is visibly gentler than Merapi (both at true scale); the lava flows, nothing explodes.",
     facts=["f6", "f8"],
     frames=[fr(0, "Out of the ash cloud: puffs part to show a gentle island shield.", {"cloud": [200, 200, 700]}, {"cloud": [1000, 320, 800]}, KIL[2:4], {"camera": "down"}, C("s02", C02, 0)),
             fr(0.5, "Kīlauea: a low fountain and lava ribbons flowing to the sea.", KIL, tag(1150, 300, "Kīlauea, Hawaii", 935, 480), {"move": [1000, 560, 1220, 630], "text": "mengalir"}, C("s02", C02, 0.5)),
             fr(1, "Split, both at the same true scale: Merapi exploding (left), Kīlauea's low shield with lava flowing (right).", SPLIT, {"chip": [340, 740], "text": "meledak"}, {"chip": [1240, 740], "text": "mengalir"}, {"cut": "panel pertanyaan"}, C("s02", C02, 1))])

shot("s03", "hook", "type", 3, None,
     teaches="Asks the question the film answers: why does one explode and the other flow?",
     screen="The split of s02 dimmed and softened behind a large soft translucent panel (white at 62%, rounded corners, a slight drop shadow) in the middle: 'Kok bisa beda?' in Nunito ExtraBold 150 px, 'beda?' in the accent orange.",
     motion="The panel rises in with a gentle ease and a small overshoot; the words appear two at a time; the background facets keep moving slowly.",
     carries="The question panel over Merapi's half.", transition="The panel lifts away as the camera swings back to Merapi, now cut in half.",
     sound="A soft two-note chime as the panel lands.",
     check="Readable in under a second; the split behind stays legible as two volcanoes.",
     frames=[fr(0, "The panel rises in over the dimmed split.", SPLIT_DIM, {"card": [460, 300, 1000, 360]}, {"move": [960, 760, 960, 660], "text": "panel naik"}),
             fr(1, "'Kok bisa beda?' with 'beda?' in orange.", SPLIT_DIM, {"card": [460, 300, 1000, 360]}, {"title": [960, 520], "text": "Kok bisa beda?", "size": 150, "accent": "beda?"}, {"cut": "gunung dibelah"})])

C04 = "Di bawahnya ada *magma*: batu cair."
shot("s04", "magma", "object3d", 4, C04,
     teaches="Under the volcano is magma: molten rock in a reservoir, joined to the summit by a conduit.",
     screen="Merapi again, side-on, sliced in half by a vertical plane through the summit: the cut face shows the cone's layers of lava and pyroclastic deposits as flat bands of facets (laid out from the USGS drawing of a composite volcano, placed on this board), the central vent (conduit) as a narrow orange channel rising to the summit crater, and below the cone a faceted orange magma reservoir glowing softly. Floating tags with lines: 'magma' to the reservoir, 'saluran magma' to the conduit, 'kawah' to the summit crater. Small text top right: 'skema · tidak sesuai skala'.",
     camera="The camera swings from the 3/4 view of s01 to exactly side-on (orthographic-looking, a long 85 mm lens from 25 km), the cut face square to the lens; the reservoir in focus as the cut opens.",
     motion="Main move: a sweeping slice line crosses the mountain top to bottom; the near half slides away along its axis and out of frame. Supporting: the reservoir assembles facet by facet and starts to glow. Detail: a faint heat shimmer above the conduit.",
     carries="The cut-away volcano and its reservoir.", transition="Push into the reservoir until its facets fill the frame.",
     sound="A soft stony slide as the half moves away; a low warm drone fades in under the magma.",
     check="The plate's layers, conduit and crater line up with the silhouette; 'tidak sesuai skala' is on screen; the reservoir sits under the cone.",
     facts=["f1", "f12"],
     frames=[fr(0, "Merapi side-on; a slicing line sweeps down through the summit.", world(merbabu=False), merapi(), {"line": [960, 120, 960, 860], "dashed": True, "width": 4}, {"move": [1200, 140, 1200, 700], "text": "dibelah"}, {"camera": "orbit"}, C("s04", C04, 0)),
             fr(0.5, "The near half slides away: the cut face, drawn from the USGS composite-volcano drawing, the conduit rising.", section(magma_y=760, conduit_to=200), {"move": [1500, 400, 1800, 400], "text": "separuh bergeser"}, NOT_TO_SCALE, C("s04", C04, 0.5)),
             fr(1, "Tags: kawah, saluran magma, magma; the reservoir glows.", section(), tag(1230, 150, "kawah", 990, 150), tag(1290, 380, "saluran magma", 975, 420), tag(1280, 700, "magma", 1150, 740), NOT_TO_SCALE, {"cut": "masuk ke magma"}, C("s04", C04, 1))])

C05 = "Bukan panasnya. Di magma ada *gas* yang larut."
shot("s05", "magma", "macro", 4, C05,
     teaches="The magma carries dissolved gas: mostly water vapour, then carbon dioxide and sulfur dioxide.",
     screen="Inside the reservoir: the frame is filled with deep-orange molten facets (a warm-dark palette for this scene: orange #ff9f1c, ember red, dark #293241 seams). Dissolved gas molecules drift in it, each a little faceted three-atom model (a central atom with two smaller ones; water bent, carbon dioxide straight). Three floating tags pick out one of each: 'uap air (H₂O)', 'CO₂', 'SO₂'. No bubbles yet.",
     camera="The camera pushes through the cut face into the reservoir and stops with molecules at 1:1 'macro' scale, 50 mm, shallow focus on the middle row of molecules, the far ones softened by the glow.",
     motion="Main move: the push-in, easing out. Supporting: the molecules drift slowly with the magma's flow, each rotating a little. Detail: the facets of the melt brighten and dim like embers.",
     carries="The molecules in the melt.", transition="The melt shrinks into a soda bottle's liquid in the next shot (a match cut on the dissolved molecules).",
     sound="The warm drone; a soft glassy chime as each tag appears.",
     check="No bubbles are shown: the gas is dissolved. Water vapour is the most common tag (most molecules are drawn bent).",
     facts=["f1", "f3", "f5"],
     frames=[fr(0, "Pushing in: the reservoir's facets fill the frame.", magma_bg(), {"camera": "push"}, C("s05", C05, 0)),
             fr(0.5, "Dissolved gas molecules drift in the melt.", magma_bg(), gases(), {"move": [300, 760, 600, 720], "text": "hanyut"}, C("s05", C05, 0.5)),
             fr(1, "Tags on one of each: uap air (H₂O), CO₂, SO₂.", magma_bg(), gases(), tag(120, 90, "uap air (H2O)", 260, 210), tag(1300, 430, "CO2", 1210, 260), tag(1380, 740, "SO2", 1360, 660), {"cut": "jadi botol soda"}, C("s05", C05, 1))])

BOTTLE = "M820 160 L860 150 L860 210 L900 300 L930 420 L930 760 L700 760 L700 420 L730 300 L770 210 L770 150 Z"
C06 = "Kayak soda dalam botol *tertutup*."
shot("s06", "magma", "diagram", 4, C06,
     teaches="The everyday version: gas dissolved in a closed soda bottle, held in by pressure.",
     screen="A soda bottle built from a few hundred flat facets (the silhouette of a common 1.5 litre PET soft-drink bottle), standing on a faceted table in the middle-left of a pale teal studio; the cap screwed on (accent orange); the drink inside slightly transparent with the same three-atom CO₂ molecules dissolved in it, no bubbles. Floating tags: 'tutup rapat: tekanan tinggi' to the cap, 'CO₂ larut' to the liquid. On the right, small, the reservoir of s05 with 'sama kayak magma'.",
     camera="A gentle push-in from a medium shot to the bottle's shoulder, 50 mm, the cap in focus at the end.",
     motion="The bottle assembles facet by facet from the bottom up; the liquid fills; the molecules appear inside; the tags float in.",
     carries="The closed bottle.", transition="The bottle slides left and the camera pans down into the ground under the volcano.",
     sound="A small glassy clink as the bottle completes; a soft fizz-free silence (no bubbles).",
     check="The cap is on and there are no bubbles; the molecules match the magma's CO₂ model.",
     facts=["f4"],
     frames=[fr(0, "The bottle assembles facet by facet from the bottom.", {"path": "M80 780 H1840", "width": 4}, {"path": "M700 760 L930 760 L930 560 L700 560 Z", "width": 5}, {"move": [600, 760, 600, 560], "text": "tersusun"}, C("s06", C06, 0)),
             fr(0.5, "The closed bottle with dissolved CO₂ molecules, cap on.", {"path": "M80 780 H1840", "width": 4}, {"path": BOTTLE, "width": 6}, {"path": "M770 150 L860 150 L860 110 L770 110 Z", "colour": ACC, "fill": ACC, "width": 5}, gas(790, 500, 1.8, "co2"), gas(860, 610, 1.8, "co2"), gas(790, 700, 1.8, "co2"), C("s06", C06, 0.5)),
             fr(1, "Tags: tutup rapat = tekanan tinggi; CO₂ larut; and 'sama kayak magma' with the reservoir.", {"path": "M80 780 H1840", "width": 4}, {"path": BOTTLE, "width": 6}, {"path": "M770 150 L860 150 L860 110 L770 110 Z", "colour": ACC, "fill": ACC, "width": 5}, gas(790, 500, 1.8, "co2"), gas(860, 610, 1.8, "co2"), gas(790, 700, 1.8, "co2"),
                                                                                                  tag(100, 120, "tutup rapat: tekanan tinggi", 770, 125), tag(120, 380, "CO2 larut", 760, 560), {"path": "M1300 560 L1420 500 L1600 510 L1760 560 L1700 640 L1350 640 Z", "colour": ACC, "fill": ACC, "width": 5}, label(1530, 700, "sama kayak magma", 40), {"cut": "turun ke bawah gunung"}, C("s06", C06, 1))])

C07 = "Tekanan tinggi menahan gasnya tetap *larut*."
PRESS = [{"arrow": [x, 300, x, 650], "colour": "red", "width": 9} for x in (760, 870, 1050, 1160)]
shot("s07", "magma", "diagram", 4, C07,
     teaches="Deep down, the weight of the rock above keeps the magma under high pressure, and that pressure keeps the gas dissolved.",
     screen="The same cut-away Merapi as s04, in the same place (schematic, 'tidak sesuai skala'), the reservoir in orange; four arrows press down from the cone onto the reservoir; a faceted pressure gauge floats to the right with its needle at high; inside the reservoir the three-atom molecules, still dissolved. Tag: 'batuan di atasnya menekan'.",
     motion="The arrows push down one after another (a small squash of the reservoir's facets); the gauge's needle rises to high; the molecules stay put.",
     carries="The reservoir under pressure and the gauge.", transition="The camera tilts up the conduit as a blob of magma starts to rise.",
     sound="A deep, soft press for each arrow; the gauge clicks up.",
     check="The needle is high; no bubbles in the reservoir.",
     facts=["f4", "f12"],
     frames=[fr(0, "The cut-away volcano again, the reservoir glowing.", section(), NOT_TO_SCALE, C("s07", C07, 0)),
             fr(0.5, "Arrows press down from the rock onto the reservoir.", section(), PRESS, tag(120, 200, "batuan di atasnya menekan", 760, 300), NOT_TO_SCALE, C("s07", C07, 0.5)),
             fr(1, "The gauge reads high; the gas stays dissolved.", section(), PRESS, gauge(1620, 520, 0.9), gas(900, 740, 0.8), gas(1040, 730, 0.8, "co2"), label(1620, 330, "gas tetap larut", 40), NOT_TO_SCALE, {"cut": "magma naik"}, C("s07", C07, 1))])

C08 = "Begitu magma *naik*, tekanannya turun."
shot("s08", "naik", "object3d", 4, C08,
     teaches="Magma is lighter than the rock around it, so it rises; the higher it gets, the less rock presses on it.",
     screen="The cut-away Merapi: a faceted blob of magma (orange) leaves the reservoir and climbs the conduit; the pressure gauge floating beside the conduit falls as the blob rises (high, middle, low). Tag 'lebih ringan, jadi naik' with a line to the blob.",
     camera="The camera cranes up the conduit with the blob, from the reservoir to two thirds of the way to the summit, side-on, 85 mm; the blob in focus.",
     motion="Main move: the blob rises in three eased steps; the gauge needle falls in step. Supporting: the conduit's walls glow where the blob passes. Detail: the molecules inside the blob jostle.",
     carries="The rising blob.", transition="Push into the blob: the molecules inside are about to change.",
     sound="A slow rising tone under the blob; the gauge ticks down.",
     check="The needle falls as the blob rises; the blob stays inside the conduit.",
     facts=["f2", "f4", "f12"],
     frames=[fr(0, "The blob leaves the reservoir; the gauge reads high.", section(), {"path": "M935 690 L985 690 L995 640 L960 615 L925 640 Z", "fill": ACC, "colour": ACC, "width": 5}, gauge(1550, 640, 0.85), {"camera": "up"}, NOT_TO_SCALE, C("s08", C08, 0)),
             fr(0.5, "Half way up the conduit; the needle at the middle.", section(), {"path": "M935 470 L985 470 L995 420 L960 395 L925 420 Z", "fill": ACC, "colour": ACC, "width": 5}, gauge(1550, 440, 0.5), tag(220, 380, "lebih ringan, jadi naik", 930, 440), NOT_TO_SCALE, C("s08", C08, 0.5)),
             fr(1, "Near the top; the needle low.", section(), {"path": "M935 300 L985 300 L995 250 L960 225 L925 250 Z", "fill": ACC, "colour": ACC, "width": 5}, gauge(1550, 280, 0.15), {"move": [880, 560, 880, 280], "text": "naik"}, NOT_TO_SCALE, {"cut": "masuk ke gumpalan"}, C("s08", C08, 1))])

C09 = "Gasnya lepas jadi *gelembung*."
shot("s09", "naik", "macro", 3, C09,
     teaches="With less pressure the gas comes out of solution: bubbles form in the magma.",
     screen="Inside the rising blob, the macro view of s05 again (same molecules, same orange facets), but now the molecules gather and little faceted spheres of gas, transparent and lighter, appear among them: the first bubbles. Tag 'gelembung gas'.",
     camera="Inside the melt at the scale of s05, the camera drifting upward with the magma, 50 mm, the newest bubble in focus.",
     motion="Main move: molecules cluster and each cluster swells into a bubble (a facet-by-facet inflation). Supporting: the whole scene drifts up. Detail: a faint glint on each bubble's top facet.",
     carries="The bubbles.", transition="Pull out to a column of magma with bubbles from bottom to top.",
     sound="Soft, low bubbling (small 'blub' sounds, sparse).",
     check="The bubbles grow out of the molecules (the same gas, now separate), not from nowhere.",
     facts=["f4"],
     frames=[fr(0, "The melt with dissolved molecules, rising.", magma_bg(), gases(), {"camera": "up"}, C("s09", C09, 0)),
             fr(1, "The molecules cluster into small bubbles.", magma_bg(), gases(n=7), [{"ring": [x, y, 34], "width": 5} for x, y in ((380, 560), (700, 620), (1080, 600), (1360, 650), (1620, 560))], tag(1200, 90, "gelembung gas", 1110, 560), {"cut": "mundur ke kolom"}, C("s09", C09, 1))])

C10 = "Makin ke atas, makin *besar*."
COL = [{"path": "M820 820 L840 80 L1100 80 L1120 820 Z", "colour": ACC, "fill": ACC, "width": 5}]
COL_BUB = bubbles([900, 1030, 960, 1050, 890, 990], 760, 160, 10, 60)
BARS = [{"path": f"M1350 {y - 28} H{1350 + w} L{1350 + w + 20} {y} L{1350 + w} {y + 28} H1350 Z", "fill": c, "colour": c, "width": 5} for y, w, c in ((290, 380, ACC), (500, 170, "ink"), (710, 50, "ink"))]
shot("s10", "naik", "chart", 3, C10,
     teaches="As the magma keeps rising and the pressure keeps falling, the bubbles grow.",
     screen="A vertical slice of the conduit as a faceted orange column from bottom to top of the frame, bubbles small at the bottom and large near the top; beside it a chart of faceted bars (lying flat, one per depth) for the bubble's size: 'dalam' short, 'tengah' longer, 'dekat permukaan' longest in the accent. Labels 'ukuran gelembung (ilustrasi)' and the depth labels; no numbers.",
     motion="Bubbles travel up the column and inflate as they go; each bar grows out to the right as a bubble passes its height.",
     carries="The column with its bubbles.", transition="The column is copied into two columns side by side.",
     sound="Bubbles rising, each 'blub' a little lower and fuller than the last.",
     check="Bubbles only grow going up; the chart has no numbers and says 'ilustrasi'.",
     facts=["f5"],
     frames=[fr(0, "The column; small bubbles at the bottom.", COL, COL_BUB[:3], label(1350, 150, "ukuran gelembung (ilustrasi)", 34, align="start"), {"move": [700, 760, 700, 300], "text": "naik"}, C("s10", C10, 0)),
             fr(1, "Bubbles large near the top; the bars dalam, tengah, dekat permukaan.", COL, COL_BUB, label(1350, 150, "ukuran gelembung (ilustrasi)", 34, align="start"), BARS, label(1350, 770, "dalam", 38, align="start"), label(1350, 560, "tengah", 38, align="start"), label(1350, 350, "dekat permukaan", 38, align="start"), {"cut": "jadi dua kolom"}, C("s10", C10, 1))])

LEFT = [{"path": "M300 820 L320 260 L620 260 L640 820 Z", "colour": ACC, "fill": ACC, "width": 5}]
RIGHT = [{"path": "M1280 820 L1300 260 L1600 260 L1620 820 Z", "colour": "red", "fill": "red", "width": 5}]
C11 = "Hawaii: magmanya *encer*, gas lolos."
shot("s11", "kental", "compare", 4, C11,
     teaches="In runny magma the bubbles rise freely and burst at the top: the gas escapes quietly.",
     screen="Two faceted conduit slices side by side, the same height: left 'encer' (bright orange, glossy facets), right 'kental' (darker red-orange, matte, dimmed for now). In the left column bubbles rise quickly and pop at the top; small puffs of gas leave the surface; a little lava spills over the rim and runs down. Tags 'encer' and 'gas lolos'.",
     motion="Left column: bubbles race up and burst one after another at the surface (each pop a small facet burst), the gas puffs drift away; the overflow slides down gently. Right column: still.",
     carries="The two columns.", transition="The light moves from the left column to the right one.",
     sound="Light pops for each burst bubble, an easy gurgle.",
     check="Nothing explodes on the left: the gas leaves in small puffs.",
     facts=["f6", "f8"],
     frames=[fr(0, "Two columns side by side; the right one dimmed.", LEFT, RIGHT, label(470, 220, "encer", 52), label(1450, 220, "kental", 52, colour="white"), C("s11", C11, 0)),
             fr(0.5, "Bubbles race up the runny column.", LEFT, RIGHT, bubbles([400, 520, 460, 560, 380], 760, 320, 14, 40, 5), {"move": [240, 760, 240, 320], "text": "cepat"}, label(470, 220, "encer", 52), label(1450, 220, "kental", 52, colour="white"), C("s11", C11, 0.5)),
             fr(1, "They burst at the top; puffs of gas leave; lava spills gently.", LEFT, RIGHT, bubbles([400, 520, 460], 760, 400, 14, 30, 3), {"cloud": [380, 130, 120]}, {"cloud": [520, 90, 100]}, {"path": "M620 262 C 680 300, 700 400, 720 520", "colour": ACC, "width": 10}, tag(760, 120, "gas lolos", 560, 180), label(1450, 220, "kental", 52, colour="white"), {"cut": "pindah ke kanan"}, C("s11", C11, 1))])

C12 = "Kalau *kental*, gasnya terjebak."
STUCK = [{"ring": [x, y, r], "width": 4} for x, y, r in ((1360, 700, 26), (1440, 640, 30), (1530, 720, 24), (1380, 560, 34), (1500, 500, 38), (1420, 420, 42), (1540, 360, 40), (1360, 320, 36), (1460, 300, 30))]
shot("s12", "kental", "compare", 3, C12,
     teaches="In thick magma the bubbles cannot get out: they stay trapped and pile up.",
     screen="The same two columns; now the right one ('kental', red-orange, matte) is lit and the left dims. Its bubbles barely move, crowd together and press on each other under a crust at the top; short arrows on them stop against the crust. Tag 'gas terjebak'.",
     motion="The light crosses to the right; bubbles inch upward and stall; more crowd in from below; the crust holds.",
     carries="The trapped bubbles.", transition="The right column becomes Merapi's conduit inside the cut-away volcano.",
     sound="A thick, slow creak; no pops.",
     check="No bubble reaches the surface in the right column.",
     facts=["f6"],
     frames=[fr(0, "The light crosses to the thick column.", LEFT, RIGHT, STUCK[:4], label(470, 220, "encer", 52, colour="white"), label(1450, 220, "kental", 52), {"move": [700, 160, 1200, 160], "text": "lampu pindah"}, C("s12", C12, 0)),
             fr(1, "Bubbles crowd and stall under the crust: trapped.", LEFT, RIGHT, STUCK, {"path": "M1300 262 L1600 262", "width": 14}, [{"arrow": [x, y - 40, x, y - 70], "width": 5} for x, y, _ in ((1420, 420, 0), (1540, 360, 0))], tag(1000, 120, "gas terjebak", 1360, 300), {"cut": "jadi Merapi"}, C("s12", C12, 1))])

DOME = {"blueprint": "reference/usgs-lava-dome.png", "at": [560, 90, 800, 443], "crop": [0, 0, 300, 166]}
DCONDUIT = {"path": "M940 860 L946 533 M980 860 L974 533", "colour": "red", "width": 8}
C13 = "Magma Merapi itu yang *kental*."
shot("s13", "kental", "object3d", 4, C13,
     teaches="Merapi's magma is the thick kind: it builds a lava dome that plugs the top of the conduit.",
     screen="The cut-away Merapi (as s04, schematic), the camera close on the summit: a lava dome of blocky dark facets sits in the summit crater and plugs the conduit (laid out from the USGS drawing of a lava dome, placed on this board); below it the conduit's magma is the dark red-orange of s12, crowded with trapped bubbles. Tags: 'kubah lava menyumbat' to the dome, 'magma kental: andesit basaltik' to the conduit.",
     camera="A crane up the cut face from the reservoir to the summit, ending side-on and close (the summit crater filling the upper half), 85 mm; the dome in focus.",
     motion="Main move: the crane. Supporting: the dome grows a little, block by block, as thick lava is squeezed up under it. Detail: the trapped bubbles shuffle.",
     carries="The plugged summit.", transition="Hold on the dome; the gauge of s07 floats back in.",
     sound="Stony clicks as the dome's blocks settle; the thick creak continues.",
     check="The dome sits in the summit crater, over the conduit; the tags match the fact sheet (basaltic andesite, viscous domes).",
     facts=["f9", "f12"],
     frames=[fr(0, "The cut-away again; the camera cranes up towards the summit.", section(), {"camera": "up"}, NOT_TO_SCALE, C("s13", C13, 0)),
             fr(0.5, "Close on the summit: the lava dome plugs the conduit (USGS lava-dome drawing placed).", DOME, DCONDUIT, [{"ring": [x, y, r], "width": 4} for x, y, r in ((960, 800, 13), (960, 720, 15), (960, 640, 14), (960, 570, 15))], NOT_TO_SCALE, C("s13", C13, 0.5)),
             fr(1, "Tags: kubah lava menyumbat; magma kental: andesit basaltik.", DOME, DCONDUIT, [{"ring": [x, y, r], "width": 4} for x, y, r in ((960, 800, 13), (960, 720, 15), (960, 640, 14), (960, 570, 15))], tag(1300, 120, "kubah lava menyumbat", 1150, 200), tag(110, 600, "magma kental: andesit basaltik", 938, 680), NOT_TO_SCALE, {"cut": "tekanan naik"}, C("s13", C13, 1))])

C14 = "Tekanannya *numpuk* terus..."
shot("s14", "kental", "object3d", 3, C14,
     teaches="Trapped and growing, the gas pushes harder and harder against the plug.",
     screen="The same close cut-away of the summit: the bubbles under the dome swell and crowd; the dome bulges upward; hairline cracks open in its facets; the floating gauge beside it climbs into its red zone. Tag 'tekanan numpuk'.",
     camera="A slow push-in on the dome from the framing of s13 to the dome filling the middle third, 85 mm, a slight handheld-free tremor added in the last beat (the camera itself stays smooth).",
     motion="Main move: the push-in. Supporting: the bubbles swell, the dome lifts by a few facets, cracks run across it. Detail: little puffs of steam from the cracks.",
     carries="The cracked, bulging dome.", transition="The dome bursts: cut on the burst to the wide.",
     sound="A rising low rumble; creaks; the gauge ticks fast.",
     check="The gauge is in the red; the dome is cracked but still in place at the end.",
     facts=["f5", "f6"],
     frames=[fr(0, "Bubbles swell under the dome; the gauge climbs.", DOME, DCONDUIT, [{"ring": [x, y, r], "width": 4} for x, y, r in ((960, 800, 17), (960, 720, 19), (960, 640, 20), (960, 570, 18))], gauge(1600, 640, 0.7), {"camera": "push"}, C("s14", C14, 0)),
             fr(1, "The dome bulges and cracks; the needle in the red.", DOME, {"bolt": [800, 260, 900, 120], "seed": 3}, {"bolt": [1050, 280, 1160, 130], "seed": 5}, {"bolt": [960, 300, 980, 100], "seed": 7}, DCONDUIT, [{"ring": [x, y, r], "width": 4} for x, y, r in ((960, 800, 24), (960, 715, 30), (960, 625, 32), (960, 560, 28))], gauge(1600, 640, 0.97), tag(1330, 120, "tekanan numpuk", 1160, 160), {"cut": "meledak"}, C("s14", C14, 1))])

C15 = "...sampai *meledak*. Magmanya hancur jadi abu."
FRAGS = [{"path": f"M{x} {y} l18 -26 l14 30 Z", "fill": "ink", "width": 3} for x, y in ((820, 200), (900, 120), (1010, 150), (1100, 210), (760, 300), (1180, 290), (950, 60))]
shot("s15", "kental", "wide", 5, C15,
     teaches="The explosion: the gas bursts out and tears the frothy magma into ash.",
     screen="The dome blows apart into faceted blocks; the frothy magma under it shatters into tiny dark triangular fragments (ash) carried up by the gas; the camera pulls back through the cut-away to the whole of Merapi in its dawn world, the faceted ash column rising from the summit as in s01. Tag 'magma hancur jadi abu' on the fragments.",
     camera="A fast-then-easing pull back: from the dome at 85 mm to the s01 framing (the whole mountain, 35 mm), the cut-away closing up as it goes so the mountain is whole again; the column in focus.",
     motion="Main move: the burst (blocks fly out on curves, fragments stream up) and the pull back. Supporting: the column assembles puff by puff. Detail: a shock ring of facets in the sky.",
     carries="The rising ash column over Merapi.", transition="Cut to the chart: the column becomes the tallest bar.",
     sound="One deep, soft boom (felt more than heard), then a long rushing rumble; the bed swells.",
     check="The fragments come from the magma (they are dark and angular), not from the sky; the mountain is whole again by the end.",
     facts=["f5", "f7"],
     frames=[fr(0, "The dome bursts; blocks fly; the magma shatters into fragments.", DOME, FRAGS, {"glow": [960, 200, 240], "colour": "orange"}, DCONDUIT, tag(1250, 380, "magma hancur jadi abu", 1100, 240), C("s15", C15, 0)),
             fr(0.5, "Pulling back: the column rises out of the summit.", world(merbabu=False), merapi(), ash(0.6), FRAGS[:4], {"camera": "pull"}, C("s15", C15, 0.5)),
             fr(1, "The wide: Merapi and the ash column, as at the start.", world(), merapi(), fields(), ash(1.0), {"cut": "jadi grafik"}, C("s15", C15, 1))])

KPX = 40  # px per km in the chart
BASE = 800
C16 = "Tahun 2010, abunya sampai *17 km*."
CHART = [{"line": [200, BASE, 1700, BASE], "width": 4},
         {"bar": [330, BASE, 240, round(MERAPI_KM * KPX)]}, label(450, BASE + 50, "Merapi", 38), label(450, BASE - round(MERAPI_KM * KPX) - 20, "2,9 km", 40),
         {"bar": [780, BASE, 240, round(EVEREST_KM * KPX)]}, label(900, BASE + 50, "Everest", 38), label(900, BASE - round(EVEREST_KM * KPX) - 20, "8,8 km", 40),
         {"bar": [1230, BASE, 240, round(ASH_KM * KPX)], "colour": ACC}, label(1350, BASE + 50, "abu Merapi, 2010", 38), label(1350, BASE - round(ASH_KM * KPX) - 20, "17 km", 48, colour=ACC)]
shot("s16", "merapi", "chart", 4, C16,
     teaches="How big that was: Merapi's 2010 ash column reached 17 km, almost twice the height of Everest.",
     screen=f"A faceted bar chart standing on the plain (the template's 'charts as faceted bars'), heights at their real values on one scale ({KPX} px per km above sea level): Merapi itself 2.9 km, Everest 8.8 km, and Merapi's ash column of 4 November 2010, 17 km, in the accent. Values written on top of each bar; a tag 'hampir 2× Everest'.",
     camera="A low, slow dolly along the bars from left to right, 35 mm, ending square to the tallest; the 17 km bar in focus.",
     motion="The bars rise one by one, facet layers stacking, each stopping at its value (no counting through false values: the number appears when the bar is complete). The tallest rises last, on the beat.",
     carries="The 17 km bar.", transition="The bars fold down into three small cards for the recap.",
     sound="A soft rising chime per bar, the third one fuller.",
     check="Bars at 116, 354 and 680 px: 2.9 : 8.8 : 17 km.",
     facts=["f9", "f10"],
     frames=[fr(0, "The base line and Merapi's own height.", CHART[:5], {"camera": "right"}, C("s16", C16, 0)),
             fr(0.5, "Everest's bar rises beside it.", CHART[:9], C("s16", C16, 0.5)),
             fr(1, "The ash column's 17 km, almost twice Everest.", CHART, tag(620, 170, "hampir 2× Everest", 1230, 150), {"cut": "jadi kartu"}, C("s16", C16, 1))])

C17 = "Gas larut. Magma naik. Gas terjebak. *Meledak*."
CARDS = [{"card": [110, 140, 520, 620]}, {"card": [700, 140, 520, 620]}, {"card": [1290, 140, 520, 620]}]
MINI1 = [{"path": "M170 480 L320 390 L560 400 L600 510 L440 600 L190 590 Z", "colour": ACC, "fill": ACC, "width": 5}] + gas(310, 500, 1.7) + gas(470, 520, 1.7, "co2") + [{"arrow": [390, 200, 390, 370], "colour": "red", "width": 8}]
MINI2 = [{"path": "M880 660 L895 200 L1025 200 L1040 660 Z", "colour": ACC, "fill": ACC, "width": 5}] + bubbles([930, 990, 955, 1000, 940], 620, 250, 12, 50, 5)
MINI3 = merapi(cx=1550, base_y=620, k=75, half=3.3, facets=False) + [{"cloud": [1550, 440, 150]}, {"cloud": [1540, 360, 240]}, {"cloud": [1560, 270, 330]}]
shot("s17", "rangkum", "recap", 5, C17,
     teaches="The whole chain in one frame: dissolved gas, rising magma and bubbles, trapped in thick magma, explosion.",
     screen="Three soft translucent cards across the frame over a blurred dawn world, each with a tiny faceted scene and two or three words: (1) the reservoir with dissolved molecules and a pressing arrow, 'gas larut'; (2) the conduit with bubbles growing upward, 'magma naik, gelembung'; (3) Merapi with its dome bursting into a column, 'kental: terjebak, meledak' with 'meledak' in the accent.",
     motion="The cards fly in one per beat on gentle curves and settle; each little scene plays its one move once (molecules drift, bubbles rise and grow, the dome bursts).",
     carries="The third card's little Merapi.", transition="The third card grows to fill the frame and the camera flies over a faceted hill into the opening picture.",
     sound="Three gentle chimes rising; the bed resolves.",
     check="Readable with the sound off; the three words carry the chain in order.",
     facts=["f3", "f4", "f5", "f6"],
     frames=[fr(0, "Card 1 flies in: the reservoir, gas larut.", CARDS[0], MINI1, label(370, 690, "gas larut", 44), C("s17", C17, 0)),
             fr(0.5, "Card 2: magma naik, gelembung.", CARDS[:2], MINI1, label(370, 690, "gas larut", 44), MINI2, label(960, 690, "magma naik, gelembung", 40), C("s17", C17, 0.5)),
             fr(1, "Card 3: kental, terjebak, meledak.", CARDS, MINI1, label(370, 690, "gas larut", 44), MINI2, label(960, 690, "magma naik, gelembung", 40), MINI3, label(1550, 690, "kental: terjebak, meledak", 38), {"cut": "terbang ke awal"}, C("s17", C17, 1))])

C18 = "Itulah kenapa"
shot("s18", "rangkum", "wide", 3, C18,
     teaches="The bridge: the last caption runs into the first ('Itulah kenapa / gunung api bisa meledak begini').",
     screen="The third card grows to the full frame and the camera flies low over a faceted hill on the plain, rising to reveal Merapi with its ash column at exactly the framing and orbit position of frame 0. Caption 'Itulah kenapa'.",
     camera="A fly-over: from 50 m above a foreground hill, rising and tilting up to the s01 position (14 km from the summit, 600 m up, 35 mm), the last 0.4 s at frame 0's position and orbit speed.",
     motion="The fly-over (eased); the column and fields as in s01; the orbit picks up at frame 0's speed so the loop cut is invisible.",
     carries="Into s01: the same picture.", transition="No cut: the film loops straight into s01.",
     sound="The bed runs on into the opening (its tail is laid over frame 0 in the mix); the wind rises.",
     check="The last frame matches frame 0 (check.mjs compares them).",
     frames=[fr(0, "Flying low over a faceted hill; Merapi appears behind it.", world(), merapi(), {"path": "M80 860 L500 620 L900 700 L1400 600 L1840 760 L1840 860 Z", "fill": "green", "colour": "green", "width": 5}, {"camera": "up"}, C("s18", C18, 0)),
             fr(1, "The opening picture, a moment before frame 0.", OPENING, {"camera": "orbit"}, {"cut": "loop ke s01"}, C("s18", C18, 1))])

for s in shots:
    s.pop("_end")
assert all(abs(s["start"] - round(TIMES[s["id"]][0], 3)) < 1e-6 for s in shots)
duration = shots[-1]["end"]

storyboard = {
    "title": "Kenapa gunung api bisa meledak?",
    "template": "lowpoly",
    "standard": 3,
    "question": "Kenapa ada gunung api yang meledak, kayak Merapi, sementara yang lain lavanya cuma mengalir?",
    "audience": "Pelajar SMA di Indonesia dan orang dewasa yang penasaran. Mereka tinggal di negeri gunung api, tahu Merapi dan kata 'magma', dan banyak yang mengira gunung meledak karena panas atau api di dalamnya, bukan karena gas.",
    "promise": "Gunung api meledak karena gas: di kedalaman, gas larut di magma karena tekanan tinggi; waktu magma naik dan tekanannya turun, gas lepas jadi gelembung yang membesar, dan di magma yang kental seperti Merapi gelembung itu terjebak sampai tekanannya cukup untuk meledak dan menghancurkan magma jadi abu.",
    "language": "id",
    "format": "1920x1080",
    "duration": round(duration, 3),
    "fps": 60,
    "captions": "pop",
    "loop": {"line": "Itulah kenapa / gunung api bisa meledak begini.", "picture": "The recap's third card grows into a low fly-over of a faceted hill that rises into the s01 framing: Merapi at dawn with its ash column, the drone orbit at frame 0's position and speed."},
    "look": {
        "accent": "#ff9f1c",
        "mood": "The Low Poly template, line by line: a faceted 3D world (hills, sky, objects built from flat triangles) under a soft gradient sky; one directional sun, so every facet has its own flat shade, and soft fog toward the horizon; one harmonious palette per scene (dawn for Merapi: orange #ff9f1c, sand #ffbf69, sky #cbf3f0, teal #2ec4b6, dark #293241; midday teal for Hawaii; a warm-dark ember palette inside the magma); flat-shaded facets with no textures, water, glass and the soda bottle slightly transparent; Merapi and Kīlauea built from their real terrain profiles at true scale with a few hundred triangles each, a cross-section as a sliced faceted model; Nunito with a slight drop shadow; captions two or three words at a time on a soft translucent panel at the bottom centre, the key word in the accent; floating tags with lines to the object; numbers at their real values; charts as faceted bars; slow drone-like orbits, fly-throughs and push-ins with gentle easing; objects assemble facet by facet and the world reshapes smoothly; cuts by flying through a cloud or over a hill; soft fog, a very light bloom on the sun, no grain; never smooth high-poly models, photo textures or cluttered scenes. Everything that must be read sits above y 850 and inside 80 px side margins; the caption panel sits at y 862 to 950.",
    },
    "models": [
        {"name": "Gunung Merapi (Jawa Tengah / DI Yogyakarta)",
         "variant": "Merapi as it stands since the 2010 eruption, seen from the south (the side Yogyakarta and Prambanan see it from): the steep summit cone with the shoulder on its east side and the summit crater breached towards the south-east, Merbabu behind to the north. This is the volcano an Indonesian viewer knows.",
         "reference": "The real west-east terrain profile through the summit (AWS Terrain Tiles, SRTM-derived, zoom 12, sampled every 100 m; summit sample 2,915 m, about 1,000 m at 6 km from the summit, about 500 m at 15 km), drawn at true scale in reference/profil-merapi-kilauea.png; the USGS drawings of a composite volcano's and a lava dome's insides for the cut-away; photographs from Klangon and Prambanan for colour and silhouette.",
         "blueprints": ["reference/profil-merapi-kilauea.png: true-scale west-east profile of Merapi through the summit, from AWS Terrain Tiles (SRTM), made for this film", "reference/usgs-composite-volcano.png: USGS 'Volcanoes' (Tilling), schematic of the internal structure of a typical composite volcano (filled central vent, radiating dikes, pyroclastic layers, lava flows)", "reference/usgs-lava-dome.png: USGS 'Volcanoes' (Tilling), schematic of the internal structure of a typical volcanic dome", "Surono et al. 2012, Fig. 1: index map of Merapi (summit, Kali Gendol, Yogyakarta 25-30 km south)"],
         "photos": ["Wikimedia Commons, 'The peak of Merapi seen from Klangon.jpg' (the post-2010 twin-peaked summit, bare grey-brown upper cone, green lower flanks)", "Wikimedia Commons, 'Prambanan Java243.jpg' (Merapi from the south-south-east: steep summit cone with a shoulder on the right, a white steam plume)"],
         "looks": "Upper cone above about 2,000 m bare and grey-brown, darker at the summit crater and dome; lower flanks deep green (forest and farmland), the plain below in rice-field greens and sand; a thin white steam plume at rest; in eruption a grey ash column. In the dawn palette the lit facets warm to sand and orange, the shaded ones to the template's dark #293241.",
         "scale": "1 unit = 100 m, the same horizontally and vertically (true scale); the cut-away's reservoir and conduit are schematic and say so on screen",
         "parts": ["summit crater, breached to the south-east after 2010", "lava dome plugging the conduit", "central vent (the conduit)", "magma reservoir (schematic)", "upper cone of lava flows and pyroclastic layers", "lower flanks and the rice-field plain", "Merbabu, the neighbour peak to the north"],
         "notShown": ["radiating dikes (USGS drawing): not needed for the gas mechanism, and they would clutter the cut face", "rivers and lahar channels other than the general south flank: clutter at this scale", "the observatory posts and villages on the flanks: the film is about the mechanism, not the hazard map"]},
        {"name": "Kīlauea (Hawaii)",
         "variant": "Kīlauea as a broad basaltic shield with an effusive eruption: a low fountain at a vent and lava flows running down its gentle slope to the sea, the familiar picture of 'lava that flows'.",
         "reference": "Its real south-north terrain profile through the summit caldera (AWS Terrain Tiles, SRTM-derived; reference/profil-merapi-kilauea.png, true scale), the USGS drawing of a shield volcano's insides, and a USGS photograph of the Mauna Ulu fountain and flows for colour.",
         "blueprints": ["reference/profil-merapi-kilauea.png: true-scale south-north profile of Kīlauea through the summit caldera, from AWS Terrain Tiles (SRTM)", "reference/usgs-shield-volcano.png: USGS 'Volcanoes' (Tilling), the internal structure of a typical shield volcano (summit caldera, central vent, magma reservoir)"],
         "photos": ["Wikimedia Commons, 'Mauna Ulu eruption episode 12.jpg' (USGS photograph: orange fountain, black basalt crust, bright lava channels)"],
         "looks": "Black and dark-grey basalt facets with a slight sheen, bright orange-yellow lava ribbons, a teal sea, white steam where lava meets water; very gentle slopes (a few degrees).",
         "scale": "1 unit = 100 m, true scale both ways",
         "parts": ["summit caldera", "gentle shield flanks", "lava fountain at a vent", "lava flows running to the sea", "coastline and sea"],
         "notShown": ["Mauna Loa, the bigger shield behind it: it would confuse which volcano is meant", "the rift zones' fissure lines: one vent is enough to show lava that flows"]},
    ],
    "music": {
        "track": "Composed for this film (to be made with kit/audio/music.mjs after the board is approved; not generated yet)",
        "bpm": BPM,
        "beat": round(BEAT, 6),
        "offset": 0,
        "start": 0,
        "note": "An ambient bed composed for the film, as the template's Sound line asks: a warm pad, soft wind, gentle chimes (kalimba and small bells) on the tags and cards, a slow pulse at 72 BPM, 57.5 s plus a tail that the mix lays over frame 0 so the loop is seamless. It sinks into a low warm drone inside the magma (s05 to s10), tightens with a slow rising tone under the pressure (s12 to s14), and swells after one deep, soft boom on the eruption (s15); it resolves on the recap. Every shot starts on a beat. Effects per shot are in each shot's 'sound': a muffled rumble under the opening column, surf and a lava gurgle for Kīlauea, a glassy clink for the bottle, soft presses and gauge ticks for pressure, sparse bubbling, light pops for the runny column, a thick creak for the trapped one, stony clicks and cracks for the dome. Nothing loud or harsh: a calm explainer, not a disaster film.",
    },
    "facts": [
        {"id": "f1", "claim": "Magma is molten rock below the surface (lava once it erupts); besides a little crystal and rock it contains dissolved gases. It collects in a reservoir below the volcano and reaches the surface through a conduit (the central vent). On screen: 'magma: batu cair', 'saluran magma', 'kawah'.",
         "source": "USGS, Robert I. Tilling, 'Volcanoes' (General Interest Publication, pubs.usgs.gov/gip/volc/): 'Molten rock below the surface of the Earth that rises in volcanic vents is known as magma, but after it erupts from a volcano it is called lava ... the ascending magma commonly contains some crystals, fragments of surrounding (unmelted) rocks, and dissolved gases'; 'The essential feature of a composite volcano is a conduit system through which magma from a reservoir deep in the Earth's crust rises to the surface'."},
        {"id": "f2", "claim": "Magma rises because it is lighter than the solid rock around it. On screen: 'lebih ringan, jadi naik'.",
         "source": "USGS, Tilling, 'Volcanoes': 'Driven by buoyancy and gas pressure the molten rock, which is lighter than the surrounding solid rock forces its way upward'."},
        {"id": "f3", "claim": "The gas in magma is mostly water vapour, followed by carbon dioxide and sulfur dioxide (with smaller amounts of others). At Merapi's summit fumarole in 2010 the gas was 87-92% water vapour, 5.6-10% CO₂ and 0.8-1.0% SO₂ (mol %). On screen: tags 'uap air (H₂O)', 'CO₂', 'SO₂'; most molecules drawn are water.",
         "source": "USGS Open-File Report 95-85, McGee & Gerlach, 'Volcanic gas': 'Water vapor is typically the most abundant volcanic gas, followed by carbon dioxide and sulfur dioxide' (also OFR 97-262, McGee et al.); Surono et al. 2012, J. Volcanol. Geotherm. Res. 241-242, Table 1 (Woro fumarole analyses, May and September 2010)."},
        {"id": "f4", "claim": "All magmas contain dissolved gases; as magma rises the confining pressure falls and the gases come out of solution, like the gas in a closed bottle of a fizzy drink that forms bubbles when the pressure is released. On screen: the soda bottle, 'Kayak soda dalam botol tertutup', 'tutup rapat: tekanan tinggi', 'tekanan tinggi menahan gasnya tetap larut', 'begitu magma naik, tekanannya turun', 'gasnya lepas jadi gelembung'. Simplification: 'tekanan' on the gauge is shown without numbers; the weight of the rock above is what sets it.",
         "source": "USGS, Tilling, 'Volcanoes': 'All magmas contain dissolved gases, and as they rise to the surface to erupt, the confining pressures are reduced and the dissolved gases are liberated either quietly or explosively' and 'Gases in lava may be compared with the gas in a bottle of a carbonated soft drink'; British Geological Survey, 'Eruption styles' (bgs.ac.uk): 'It's a bit like a bottle of fizzy pop'."},
        {"id": "f5", "claim": "The bubbles expand as the pressure keeps falling, and their sudden expansion is what drives explosions. On screen: 'Makin ke atas, makin besar' (the bubble chart is marked 'ilustrasi' and has no numbers), 'tekanannya numpuk terus', and the misconception answered: 'Bukan panasnya' (it is the gas expanding, not the heat, that makes the explosion).",
         "source": "USGS, Tilling, 'Volcanoes': 'Their sudden expansion causes the terrible explosions that throw out great masses of solid rock as well as lava, dust, and ashes'; 'Explosive eruptions caused by gas rapidly expanding and escaping from molten lava'."},
        {"id": "f6", "claim": "Whether the gas escapes quietly or explosively depends on the magma: in thin, runny magma the gas escapes easily and the lava flows out; in thick, sticky magma it cannot move freely, pressure builds and it escapes with explosive violence. On screen: 'Kalau encer, gasnya lolos', 'gas lolos', 'Kalau kental, gasnya terjebak', 'mengalir', 'meledak'.",
         "source": "USGS, Tilling, 'Volcanoes': 'If the lava is a thin fluid (not viscous), the gases may escape easily. But if the lava is thick and pasty (highly viscous), the gases will not move freely but will build up tremendous pressure, and ultimately escape with explosive violence'; British Geological Survey, 'Eruption styles': 'If a magma has low viscosity (it is runny), gas can escape easily, so when the magma erupts at the surface it forms lava flows'."},
        {"id": "f7", "claim": "In an explosive eruption the gas-filled froth of magma is shattered into small fragments: volcanic ash. On screen: '...sampai meledak. Magmanya hancur jadi abu.', 'magma hancur jadi abu'.",
         "source": "USGS, Tilling, 'Volcanoes': 'The violent separation of gas from lava may produce rock froth called pumice ... In many eruptions, the froth is shattered explosively into small fragments that are hurled high into the air in the form of volcanic cinders, volcanic ash, and volcanic dust'."},
        {"id": "f8", "claim": "Kīlauea is a shield volcano built of fluid basalt lava flows; the Hawaiian shields are generally non-explosive, so its lava usually flows out. On screen: 'Tapi di Hawaii, lavanya mengalir', 'Kīlauea, Hawaii', 'mengalir', and in s11 'Magma Hawaii encer' with the runny column labelled 'encer · Kīlauea'. Simplification: the source says 'generally' non-explosive; the film shows the usual behaviour and does not claim Kīlauea never explodes.",
         "source": "USGS, Tilling, 'Volcanoes': shield volcanoes 'are built almost entirely of fluid lava flows ... the Hawaiian Islands are composed of linear chains of these volcanoes including Kilauea and Mauna Loa', and 'the generally non-explosive Hawaiian shield volcanoes'. Profile: AWS Terrain Tiles (reference/profil-merapi-kilauea.png)."},
        {"id": "f9", "claim": "Merapi is a stratovolcano about 2,910 m high on the border of Central Java and Yogyakarta, 25-30 km north of Yogyakarta. Its magma is basaltic andesite (55.8% SiO₂ in 2010), and it typically builds viscous lava domes that plug the top of the conduit. On screen: 'Merapi', 'Magma Merapi itu yang kental', 'magma kental', 'kubah lava menyumbat', '2,9 km'.",
         "source": "Kementerian ESDM (Badan Geologi, PVMBG/BPPTKG), 'Mengenal Merapi Lebih Dekat: Merapi Dulu dan Kini' (esdm.go.id): Merapi 2,910 m, a stratovolcano (height quoted from the search summary of the same page); Surono et al. 2012: 'Merapi stratovolcano is located 25-30 km north of ... Yogyakarta ... composed mainly of basaltic-andesite', 'produced viscous lava domes', 'lava domes have typically plugged the uppermost part of the conduit', Table 1 SiO₂ 55.8 wt% (2010)."},
        {"id": "f10", "claim": "Merapi's 2010 eruption was its largest since 1872 (VEI about 4); the climactic explosion on 4 November 2010 sent an ash column to 17 km altitude. Mount Everest is 8,848.86 m, so the column rose 17 ÷ 8.85 ≈ 1.9 times as high: 'hampir 2× Everest'. On screen: 'Merapi, 2010', 'Tahun 2010, abunya sampai 17 km', '17 km', '8,8 km', 'hampir 2× Everest'.",
         "source": "Surono et al. 2012, 'The 2010 explosive eruption of Java's Merapi volcano, a 100-year event', J. Volcanol. Geotherm. Res. 241-242: 121-135 (read in full: 'a VEI and Me of about 4'; 'produced an ash column that ascended to 17 km altitude'; the 1872 eruption named as the previous large explosive one); 'largest in more than a century': the USGS publication summary of the same paper (via search); Everest: Nepal and China's joint announcement of 8 December 2020 (The Kathmandu Post, 'It's official: Mount Everest is 8,848.86 metres tall'; NPR, same day)."},
        {"id": "f11", "claim": "Merapi's silhouette is its real profile: the west-east terrain profile through the summit sampled every 0.5 km (summit 2,915 m in the data; 1,441 m 3 km west; 1,455 m 3 km east; a shoulder of 2,481-2,417 m 1-1.5 km east), drawn at true scale (230 px per km both ways in s01, cropped to the part above 1,000 m). Since 2010 the summit crater opens to the south-east.",
         "source": "AWS Terrain Tiles (Mapzen terrarium, SRTM-derived), zoom 12, sampled for this film (reference/profil-merapi-kilauea.png); crater opening: Kementerian ESDM, 'Mengenal Merapi Lebih Dekat' ('terbentuk kawah yang membuka ke arah tenggara/selatan')."},
        {"id": "f12", "claim": "The cut-away drawings (s04, s07, s08, s13, s14) are schematic: the reservoir, conduit and dome are drawn to show where things are, not their real sizes or depths, and the screen says 'skema · tidak sesuai skala'. Their layout follows the USGS drawings of a composite volcano and a lava dome.",
         "source": "USGS, Tilling, 'Volcanoes', figures 'Schematic representation of the internal structure of a typical composite volcano' and '... of a typical volcanic dome' (pubs.usgs.gov/gip/volc/types.html; copies in reference/)."},
    ],
    "acts": [
        {"id": "hook", "title": "Pertanyaan", "goal": "Merapi explodes, Kīlauea flows: why the difference?", "rail": False},
        {"id": "magma", "title": "Gas di magma", "goal": "Under the volcano: magma, gas dissolved in it like soda, held in by pressure.", "rail": True},
        {"id": "naik", "title": "Magma naik", "goal": "Rising magma, falling pressure: bubbles form and grow.", "rail": True},
        {"id": "kental", "title": "Encer atau kental", "goal": "Runny magma lets the gas go; thick magma like Merapi's traps it until it explodes into ash.", "rail": True},
        {"id": "merapi", "title": "Merapi 2010", "goal": "How big that was: a 17 km ash column, almost twice Everest.", "rail": True},
        {"id": "rangkum", "title": "Jawaban", "goal": "The chain in one frame, then the bridge into the first line.", "rail": False},
    ],
    "shots": shots,
}

out = HERE / "storyboard.json"
out.write_text(json.dumps(storyboard, ensure_ascii=False, indent=2) + "\n")
print(f"{len(shots)} shots, {sum(len(s['frames']) for s in shots)} frames, {duration:.1f} s -> {out}")
for s in shots:
    if s.get("caption"):
        n = len(s["caption"].replace("*", ""))
        print(f"  {s['id']}: {n} chars, {n / (s['end'] - s['start'] - 0.5):.1f} chars/s, groups: {' | '.join(g for g, _ in caption_groups(s['caption'], s['start'], s['end']))}")
