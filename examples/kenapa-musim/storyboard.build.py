"""Writes storyboard.json for "Kenapa ada musim?" (portrait 1080 x 1920, the Clay template).

The sample film of the Clay visual template: a handmade plasticine world on a little tabletop set, in stop motion
held at 12 frames a second. The film is cut to one take of narration; these times are a guess until the take
retimes the board:

    python3 examples/kenapa-musim/storyboard.build.py && node kit/tools/storyboard.mjs examples/kenapa-musim --png

The orbit on the table is not to scale and says so on screen: the real orbit is almost a circle (147 to 152 million
km, f2), so s03 exaggerates its stretch to show the wrong idea and s04 straightens it. The noon-sun angles in s13
are computed below from the latitudes and the tilt (f6, f7), not drawn by eye.
"""
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
shots = []

# ── The numbers ──────────────────────────────────────────────────────────────────────────────────────────────────
TILT = 23.44
JAKARTA, BERLIN = -6.2, 52.52  # degrees latitude (south negative)


def noon_elevation(lat, decl):
    """Solar elevation at noon (PVEducation): 90 - |latitude - declination|."""
    return 90 - abs(lat - decl)


JAKARTA_LOW = min(noon_elevation(JAKARTA, d) for d in (TILT, -TILT))  # 60.4
BERLIN_DEC = noon_elevation(BERLIN, -TILT)  # 14.0
assert round(JAKARTA_LOW) == 60 and round(BERLIN_DEC) == 14

# ── Drawing helpers (the table set: the Sun at the middle of the frame, the orbit round it) ──────────────────────────
SUN = (540, 900)


def fr(at, note, *draw):
    flat = []
    for d in draw:
        flat.extend(d if isinstance(d, list) else [d])
    return {"at": at, "note": note, "draw": flat}


def label(x, y, text, size=44, **more):
    return {"label": [x, y], "text": text, "size": size, **more}


def flag(x, y, text):
    """A paper flag on a toothpick: the pick from (x, y) up, the paper to its right."""
    return [{"line": [x, y, x, y - 150], "width": 5}, {"chip": [x + 6, y - 190], "text": text}]


def table(y=1300):
    return {"path": f"M40 {y} H1040", "width": 6}


def orbit(rx=380, ry=150):
    return {"path": f"M{SUN[0] - rx} {SUN[1]} a{rx} {ry} 0 1 0 {2 * rx} 0 a{rx} {ry} 0 1 0 {-2 * rx} 0", "width": 7, "colour": "orange"}


def earth(x, y, r=70, light="left", axis=True, lean=-1):
    """The clay Earth with its toothpick axis; lean -1 tips the top to the left (towards the Sun when it is on the right)."""
    import math
    out = [{"planet": [x, y, r], "light": light}]
    if axis:
        a = math.radians(TILT) * lean
        out.append({"line": [x - math.sin(a) * r * 1.6, y - math.cos(a) * r * 1.6, x + math.sin(a) * r * 1.6, y + math.cos(a) * r * 1.6], "width": 6})
    return out


def sun(r=110):
    return {"sun": [SUN[0], SUN[1], r]}


def shot(id, act, type_, start, end, voice, **more):
    shots.append({"id": id, "act": act, "type": type_, "start": start, "end": end, "voice": voice, **more})


VILLAGE = [{"path": "M120 760 h120 v-90 l-60 -60 l-60 60 Z M280 760 h100 v-70 l-50 -50 l-50 50 Z", "width": 6}, {"path": "M120 670 l60 -60 l60 60 M280 690 l50 -50 l50 50", "colour": "white", "width": 14}, {"dot": [470, 600, 10], "colour": "white"}, {"dot": [180, 520, 8], "colour": "white"}, {"dot": [360, 560, 9], "colour": "white"}]
BEACH = [{"path": "M600 1420 C 720 1390, 860 1400, 1000 1430", "colour": "yellow", "width": 10}, {"path": "M760 1400 V1230 M680 1260 Q760 1180 840 1260 Z", "colour": "red", "width": 6}, {"sun": [930, 1150, 50]}]

shot("s01", "hook", "wide", 0, 4.0, "Eropa lagi *bersalju*, sementara Australia malah musim panas.",
     teaches="The puzzle: in the same December, one place is snowy and another is in summer.",
     screen="A tabletop set seen from the front, painted card backdrop in peach. Top half of the frame: a little clay village with white snow caps and clay snowflakes, a paper flag 'Eropa, Desember'. Bottom half: a clay beach with a striped umbrella and a small yellow clay sun, flag 'Australia, Desember'.",
     motion="Frame 0 is finished. Snowflakes drop on twelves; the umbrella's sun pulses; the camera tilts from the village down to the beach.",
     carries="The two dioramas.", transition="The camera keeps tilting down onto the table, where a clay question mark plops.",
     sound="A playful marimba bed starts; a soft crunch of snow, then a pop.", check="Both places read at a glance: cold and hot.", facts=["f4"],
     frames=[fr(0, "Frame 0: the snowy village fills the upper half; the beach waits below.", table(1300), VILLAGE, flag(560, 760, "Eropa · Desember"), {"camera": "down"}),
             fr(0.5, "The camera tilts down past the table edge: both places in frame.", VILLAGE, flag(560, 760, "Eropa · Desember"), BEACH, flag(560, 1420, "Australia · Desember")),
             fr(1, "The beach at the centre, the village above.", BEACH, flag(560, 1420, "Australia · Desember"), {"cut": "turun ke meja"})])

shot("s02", "hook", "type", 4.0, 5.4, "Kok bisa beda?",
     teaches="Asks the question out loud: why the difference?",
     screen="On the bare table a big clay question mark plops down, squashes and settles.",
     motion="Plop, squash and stretch, settle (on twelves).", carries="The table.", transition="The question mark is rolled away as the Sun is set down.",
     sound="A plop and a wobble.", check="Readable in under a second.",
     frames=[fr(0, "The question mark falls in.", table(1300), {"path": "M460 760 q0 -120 100 -120 q100 0 100 100 q0 80 -90 100 v80", "width": 30}, {"move": [560, 420, 560, 600], "text": "plop"}),
             fr(1, "Settled, squashed a little.", table(1300), {"path": "M460 820 q0 -110 100 -110 q100 0 100 100 q0 70 -90 90 v70 M560 1150 v4", "width": 30}, {"cut": "Matahari diletakkan"})])

shot("s03", "salah", "diagram", 5.4, 7.6, "Banyak yang ngira, musim itu soal *jarak*:",
     teaches="Names the common wrong idea: seasons come from the distance to the Sun.",
     screen="Top-down on the table: the clay Sun in the middle and a rolled clay orbit pressed into a long oval (exaggerated, labelled 'bukan skala'), the clay Earth on it.",
     motion="The oval is rolled out round the Sun; the Earth is set on it.", carries="The Sun and the orbit.",
     transition="Continuous: the Earth starts round the oval.", sound="A squish as the clay rope is laid.", check="It is marked as an idea, not a fact ('bukan skala').", facts=["f2"],
     frames=[fr(0, "Top-down: the Sun alone on the table.", sun(90), table(1500)),
             fr(1, "The stretched oval laid round it, the Earth on it.", sun(90), {"path": f"M{SUN[0] - 440} {SUN[1]} a440 230 0 1 0 880 0 a440 230 0 1 0 -880 0", "width": 7, "colour": "orange"}, earth(SUN[0] + 300, SUN[1] - 20, 50, axis=False), label(540, 1260, "bukan skala", 34), {"cut": "tanpa potongan"})])

shot("s03b", "salah", "diagram", 7.6, 9.6, "dekat Matahari panas, jauh dingin.",
     teaches="The wrong idea spelled out: near means hot, far means cold.",
     screen="The Earth slides round the oval: near the Sun a red flag 'panas?', far from it a blue flag 'dingin?'.",
     motion="The Earth slides; a flag pops up at each end.", carries="The Sun and the oval.",
     transition="The oval is pressed back into a near circle.", sound="Two small knocks for the flags.", check="The flags carry question marks: it is the wrong idea.", facts=["f2"],
     frames=[fr(0, "Near: a red flag 'panas?'.", sun(90), {"path": f"M{SUN[0] - 440} {SUN[1]} a440 230 0 1 0 880 0 a440 230 0 1 0 -880 0", "width": 7, "colour": "orange"}, earth(SUN[0] + 300, SUN[1] - 20, 50, axis=False), flag(870, 900, "panas?")),
             fr(1, "Far: a blue flag 'dingin?'.", sun(90), {"path": f"M{SUN[0] - 440} {SUN[1]} a440 230 0 1 0 880 0 a440 230 0 1 0 -880 0", "width": 7, "colour": "orange"}, earth(SUN[0] - 430, SUN[1], 50, axis=False), flag(870, 900, "panas?"), flag(140, 900, "dingin?"), {"cut": "orbit dibulatkan"})])

shot("s04", "salah", "chart", 9.6, 13.4, "Padahal Bumi justru paling dekat ke Matahari di awal *Januari*.",
     teaches="The fact that breaks it: Earth is closest to the Sun in early January.",
     screen="The orbit pressed into a near circle. The Earth at its closest point with a flag 'Januari · 147 juta km'; on the far side a flag 'Juli · 152 juta km'.",
     motion="The oval is squashed round by a clay thumb; the Earth rolls to the January point; flags stick in.", carries="The near-circular orbit.",
     transition="Push in on the Earth at the January point.", sound="A squish as the orbit is reshaped; two flag knocks.", check="The two distances are the fact sheet's: 147 and 152 million km.", facts=["f2"],
     frames=[fr(0, "The orbit becomes almost a circle.", sun(90), orbit(400, 200), {"move": [940, 700, 900, 760], "text": "dibulatkan"}),
             fr(0.6, "The Earth at the January point.", sun(90), orbit(400, 200), earth(SUN[0] + 395, SUN[1] + 30, 50, axis=False), flag(640, 820, "Januari · 147 juta km")),
             fr(1, "The far side flag too.", sun(90), orbit(400, 200), earth(SUN[0] + 395, SUN[1] + 30, 50, axis=False), flag(640, 820, "Januari · 147 juta km"), flag(150, 1060, "Juli · 152 juta km"), {"cut": "mendekat ke Bumi"})])

shot("s05", "salah", "wide", 13.4, 16.0, "Pas itu, Eropa lagi dingin-dinginnya.",
     teaches="Closest to the Sun, yet Europe is in deep winter: distance is not the reason.",
     screen="Close on the clay Earth at the January point: its northern cap has white clay snow on it; a tiny flag 'Eropa: musim dingin' stuck in the north.",
     motion="White snow is pressed onto the north (on twelves); the flag goes in.", carries="The Earth.", transition="The Earth turns to show its toothpick axis.",
     sound="A soft squish, a flag knock.", check="Snow on the north, readable.", facts=["f2", "f4"],
     frames=[fr(0, "The Earth close, bare, the Sun glowing at the left edge.", earth(540, 900, 260, axis=False), {"sun": [40, 900, 90]}),
             fr(1, "Snow on the north; the flag 'Eropa: musim dingin'.", earth(540, 900, 260, axis=False), {"path": "M330 760 Q540 600 750 760", "colour": "white", "width": 40}, flag(600, 660, "Eropa: musim dingin"), {"cut": "Bumi berputar"})])

shot("s06", "miring", "diagram", 16.0, 20.0, "Rahasianya ada di sini: sumbu Bumi *miring*, sekitar dua puluh tiga koma empat derajat.",
     teaches="The real cause: Earth's axis is tilted about 23.4 degrees.",
     screen="The Earth close, its wooden toothpick axis tilted; a paper protractor behind it with the angle between the toothpick and the upright marked '23,4°'.",
     motion="The toothpick tips from upright to 23.4 degrees (on twelves); the paper protractor slides in; the angle arc draws.", carries="The tilted Earth.",
     transition="Pull back to the orbit.", sound="A wooden click as the pick tilts.", check="The drawn angle is 23.4 degrees.", facts=["f1"],
     frames=[fr(0, "The toothpick axis stands straight up.", earth(540, 920, 230, axis=False), {"line": [540, 560, 540, 1280], "width": 8}),
             fr(0.6, "The axis tips to 23.4 degrees.", earth(540, 920, 230, lean=-1), {"line": [540, 560, 540, 700], "width": 3, "dashed": True}),
             fr(1, "The angle between upright and toothpick is labelled 23,4°.", earth(540, 920, 230, lean=-1), {"line": [540, 560, 540, 700], "width": 3, "dashed": True}, {"path": "M540 640 A 280 280 0 0 0 430 660", "width": 5, "colour": "orange"}, label(470, 600, "23,4°", 64), {"cut": "mundur ke orbit"})])

shot("s07", "miring", "wide", 20.0, 24.0, "Miringnya selalu ke arah yang sama, sepanjang Bumi mengelilingi Matahari.",
     teaches="The tilt keeps pointing the same way all the way round the orbit.",
     screen="Pulled back: the Sun, the round orbit, the Earth at four places round it (June, September, December, March), each with its toothpick leaning the same way (parallel), a small paper arrow above each showing the same direction.",
     motion="The Earth rolls round the orbit; ghost Earths are left at the four places; the toothpicks stay parallel.", carries="The orbit and the Earth.",
     transition="The roll stops at the June place; the camera eases round.", sound="A gentle roll of clay on card.", check="All four toothpicks are parallel.", facts=["f3"],
     frames=[fr(0, "The orbit; the Earth starts to roll.", sun(80), orbit(400, 200), earth(SUN[0] + 400, SUN[1], 45)),
             fr(0.5, "Half way round: the axis still leans the same way.", sun(80), orbit(400, 200), earth(SUN[0] + 400, SUN[1], 45), earth(SUN[0], SUN[1] + 200, 45), {"move": [940, 1000, 640, 1180], "text": "arah sama"}),
             fr(1, "Four places, four parallel toothpicks.", sun(80), orbit(400, 200), earth(SUN[0] + 400, SUN[1], 45), earth(SUN[0], SUN[1] + 200, 45), earth(SUN[0] - 400, SUN[1], 45), earth(SUN[0], SUN[1] - 200, 45), {"cut": "berhenti di Juni"})])

shot("s08", "miring", "diagram", 24.0, 27.6, "Jadi di bulan *Juni*, belahan utara condong ke Matahari.",
     teaches="In June the northern half leans towards the Sun.",
     screen="The Earth at the June place, right of the Sun; its top leans towards the Sun; the lit half faces the Sun; flag 'Juni'; a paper label 'utara condong' on the north.",
     motion="Camera eases round so the Sun is left of frame; the lit side glows; the flag goes in.", carries="The June Earth.",
     transition="A clay torch is set beside the Earth.", sound="A small wooden flag knock.", check="The north half is tipped towards the Sun.", facts=["f3"],
     frames=[fr(0, "June: the Earth right of the Sun.", {"sun": [140, 900, 110]}, earth(640, 900, 220, light="left", lean=-1)),
             fr(0.5, "The lit half faces the Sun; the north leans into it.", {"sun": [140, 900, 110]}, earth(640, 900, 220, light="left", lean=-1), {"arrow": [300, 760, 470, 760], "colour": "yellow"}),
             fr(1, "Flag 'Juni'; 'utara condong'.", {"sun": [140, 900, 110]}, earth(640, 900, 220, light="left", lean=-1), flag(860, 1180, "Juni"), label(560, 600, "utara condong", 48), {"cut": "senter clay"})])

shot("s09", "miring", "compare", 27.6, 30.8, "Sinarnya jatuh lebih *tegak*, jadi panasnya numpuk di tempat yang lebih sempit.",
     teaches="Direct sunlight packs the same light into a smaller area, so it warms more.",
     screen="A clay torch (a short cylinder with a paper beam) above a clay slab, shining straight down: a small bright patch labelled 'sempit = panas'.",
     motion="The beam switches on (two frames of light); the patch glows; the label writes.", carries="The torch and slab.",
     transition="Continuous: a clock card is set beside the slab.", sound="A click of the torch; a soft hum.", check="The patch is small and bright.", facts=["f5"],
     frames=[fr(0, "The torch above the slab, off.", {"path": "M440 520 h200 v160 h-200 Z", "width": 7}, {"path": "M300 1120 H780", "width": 8}),
             fr(0.5, "On: a straight beam onto the slab.", {"path": "M440 520 h200 v160 h-200 Z", "width": 7}, {"path": "M460 680 L470 1110 M620 680 L610 1110", "colour": "yellow", "width": 5}, {"path": "M300 1120 H780", "width": 8}),
             fr(1, "A small bright patch, 'sempit = panas'.", {"path": "M440 520 h200 v160 h-200 Z", "width": 7}, {"path": "M460 680 L470 1110 M620 680 L610 1110", "colour": "yellow", "width": 5}, {"path": "M300 1120 H780", "width": 8}, {"path": "M470 1120 H610", "colour": "yellow", "width": 22}, label(540, 1200, "sempit = panas", 48), {"cut": "kartu jam"})])

shot("s09b", "miring", "diagram", 30.8, 32.6, "Siangnya juga lebih panjang.",
     teaches="And the days are longer in the hemisphere that leans towards the Sun.",
     screen="A round clay clock card beside the slab: a yellow day arc longer than half the face, 'siang lebih panjang'.",
     motion="The yellow arc is pressed round the face past the half.", carries="The slab and the clock.",
     transition="The Earth rolls on half an orbit to December.", sound="A soft clock tick as the arc closes.", check="The arc is longer than half the clock.", facts=["f5"],
     frames=[fr(0, "The clock card goes in beside the slab.", {"path": "M300 1120 H780", "width": 8}, {"ring": [860, 1450, 110]}),
             fr(1, "The long day arc and its label.", {"path": "M300 1120 H780", "width": 8}, {"ring": [860, 1450, 110]}, {"path": "M760 1450 A110 110 0 1 1 960 1450", "colour": "yellow", "width": 18}, label(860, 1610, "siang lebih panjang", 38), {"cut": "Bumi ke Desember"})])

shot("s10", "miring", "diagram", 32.6, 36.0, "Nah, enam bulan lagi, giliran belahan *selatan* yang condong.",
     teaches="Six months on, the southern half leans towards the Sun.",
     screen="The Earth at the December place, left of the Sun now on the right of frame; the toothpick still leans the same way, so the south faces the Sun; flag 'Desember'; label 'selatan condong'.",
     motion="The Earth rolls half the orbit; the toothpick does not turn; flag in.", carries="The December Earth.",
     transition="The torch tips over to a slant.", sound="A roll, a flag knock.", check="The axis leans the same way as in s08; now the south faces the Sun.", facts=["f3"],
     frames=[fr(0, "The Earth rolling to the other side.", {"sun": [940, 900, 110]}, earth(440, 900, 220, light="right", lean=-1), {"move": [700, 600, 480, 600], "text": "setengah putaran"}),
             fr(1, "Flag 'Desember'; 'selatan condong'.", {"sun": [940, 900, 110]}, earth(440, 900, 220, light="right", lean=-1), flag(220, 1180, "Desember"), label(520, 1220, "selatan condong", 48), {"cut": "senter dimiringkan"})])

shot("s11", "miring", "compare", 36.0, 40.0, "Utara cuma kebagian sinar miring yang *menyebar*, dan itulah musim dingin.",
     teaches="Slanting light spreads the same light over a bigger area: colder. That is winter.",
     screen="The clay torch tipped to a slant over the same slab: the patch is long and dim, labelled 'lebar = dingin'. Small snow returns to the village flag.",
     motion="The torch tips (on twelves); the patch stretches; the label writes.", carries="The torch and slab.",
     transition="Cut to the Earth's middle: the equator band.", sound="A wooden tip; a soft wind.", check="The slanted patch is visibly longer and dimmer than in s09.", facts=["f5"],
     frames=[fr(0, "The torch starts to tip.", {"path": "M440 520 h200 v160 h-200 Z", "width": 7}, {"path": "M300 1120 H880", "width": 8}),
             fr(0.5, "Half tipped: the patch starts to stretch.", {"path": "M380 540 l180 -60 l50 150 l-180 60 Z", "width": 7}, {"path": "M300 1120 H880", "width": 8}, {"path": "M450 1120 H700", "colour": "yellow", "width": 14}),
             fr(1, "Slanted: a long dim patch, 'lebar = dingin'.", {"path": "M300 560 l170 -100 l80 140 l-170 100 Z", "width": 7}, {"path": "M390 700 L420 1110 M520 640 L800 1110", "colour": "yellow", "width": 4}, {"path": "M300 1120 H880", "width": 8}, {"path": "M420 1120 H800", "colour": "yellow", "width": 10}, label(600, 1200, "lebar = dingin", 48), {"cut": "ke khatulistiwa"})])

shot("s12", "indonesia", "diagram", 40.0, 42.8, "Terus, Indonesia gimana? Kita ada di dekat *khatulistiwa*.",
     teaches="Indonesia sits on the equator.",
     screen="The clay Earth, face-on: a red clay band round its middle (the equator) and a tiny red-and-white flag 'Indonesia' stuck on it.",
     motion="The band is pressed on; the flag goes in with a wobble.", carries="The Earth with its band.", transition="Two clay figures appear on two small plates.",
     sound="A squish, a flag knock.", check="The flag sits on the band.", facts=["f6"],
     frames=[fr(0, "The Earth with the equator band.", earth(540, 920, 250, axis=False), {"path": "M290 920 Q540 980 790 920", "colour": "red", "width": 16}),
             fr(1, "The flag 'Indonesia' on the band.", earth(540, 920, 250, axis=False), {"path": "M290 920 Q540 980 790 920", "colour": "red", "width": 16}, flag(600, 950, "Indonesia"), {"cut": "dua piring"})])

shot("s13", "indonesia", "compare", 42.8, 47.6, "Matahari siangnya tetap tinggi sepanjang tahun, makanya kita nggak kenal *musim dingin*.",
     teaches="Near the equator the noon Sun stays high all year: no winter.",
     screen=f"Two small plates on the table, each with a clay figure and a stick holding a little clay sun at the noon angle: 'Jakarta, paling rendah' at {round(JAKARTA_LOW)} degrees, 'Berlin, Desember' at {round(BERLIN_DEC)} degrees; the angles on paper cards.",
     motion="The two little suns rise on their sticks to their angles (on twelves); the cards stick in.", carries="The two plates.",
     transition="The plates slide away; the summary card.", sound="Two soft ticks.", check=f"Angles drawn at {round(JAKARTA_LOW)} and {round(BERLIN_DEC)} degrees.", facts=["f6", "f7"],
     frames=[fr(0, "Two plates, two figures, the suns at the horizon.", {"path": "M120 1200 H500 M580 1200 H960", "width": 8}, {"person": [310, 1190, 170]}, {"person": [770, 1190, 170]}),
             fr(0.5, "The suns rise to their noon angles.", {"path": "M120 1200 H500 M580 1200 H960", "width": 8}, {"person": [310, 1190, 170]}, {"person": [770, 1190, 170]}, {"sun": [310 + 230 * 0.5, 1190 - 230 * 0.87, 36]}, {"sun": [770 + 230 * 0.97, 1190 - 230 * 0.24, 36]}),
             fr(1, "Cards on each plate: Jakarta 60° and Berlin 14°.", {"path": "M120 1200 H500 M580 1200 H960", "width": 8}, {"person": [310, 1190, 170]}, {"person": [770, 1190, 170]}, {"sun": [310 + 230 * 0.5, 1190 - 230 * 0.87, 36]}, {"sun": [770 + 230 * 0.97, 1190 - 230 * 0.24, 36]}, label(310, 1300, f"Jakarta · ≥ {round(JAKARTA_LOW)}°", 40), label(770, 1300, f"Berlin, Des · {round(BERLIN_DEC)}°", 40), {"cut": "kartu rangkuman"})])

shot("s14", "recap", "recap", 47.6, 51.2, "Jadi musim itu soal *miringnya* Bumi, bukan jaraknya.",
     teaches="The answer in one frame: tilt, not distance.",
     screen="A clay plate as a card: the tilted Earth with its toothpick at 23,4°, 'miring ✓' beside it; a small orbit with 'jarak ✗' crossed out; two tiny scenes under it: June (north sunny), December (south sunny).",
     motion="The words are pressed in; 'jarak' gets a clay cross.", carries="The tilted Earth.", transition="Camera rises back to the opening village.",
     sound="Two pops; a soft scratch for the cross.", check="Readable as a summary with the sound off.", facts=["f1", "f2", "f3"],
     frames=[fr(0, "The tilted Earth and 'miring ✓'.", earth(380, 900, 170, lean=-1), label(760, 900, "miring ✓", 72)),
             fr(0.5, "'jarak' with a cross.", earth(380, 900, 170, lean=-1), label(760, 900, "miring ✓", 72), label(760, 1060, "jarak", 64), {"path": "M680 1040 L840 1080", "colour": "red", "width": 10}),
             fr(1, "June and December scenes under it.", earth(380, 900, 170, lean=-1), label(760, 900, "miring ✓", 72), label(760, 1060, "jarak", 64), {"path": "M680 1040 L840 1080", "colour": "red", "width": 10}, earth(300, 1400, 70, light="left", lean=-1), earth(780, 1400, 70, light="right", lean=-1), label(300, 1530, "Juni", 40), label(780, 1530, "Desember", 40), {"cut": "kembali ke desa bersalju"})])

shot("s15", "recap", "wide", 51.2, 53.0, "Dan itu sebabnya, tiap bulan Desember,",
     teaches="The bridge back into the first line.",
     screen="The camera rises back up the table to the opening: the snowy village with its flag, the beach below, the same framing as frame 0.",
     motion="A camera crane up from the table to the village; snow starts falling again a moment before frame 0.", carries="Into s01.", transition="No cut: the film loops straight into s01.",
     sound="The bed runs on into the opening.", check="The last frame matches frame 0 (check.mjs SSIM).",
     frames=[fr(0, "Rising from the table.", table(1300), {"camera": "up"}, BEACH),
             fr(1, "The opening picture, a moment before frame 0.", table(1300), VILLAGE, flag(560, 760, "Eropa · Desember"), {"cut": "loop ke s01"})])

duration = shots[-1]["end"]

storyboard = {
    "title": "Kenapa ada musim?",
    "question": "Kenapa pas Desember Eropa bersalju tapi Australia musim panas, dan kenapa Indonesia nggak punya musim dingin?",
    "audience": "Anak sekolah dan orang dewasa di Indonesia yang nonton video pendek. Mereka tahu negara lain punya empat musim, dan banyak yang mengira itu karena Bumi kadang lebih dekat, kadang lebih jauh dari Matahari.",
    "promise": "Musim terjadi karena sumbu Bumi miring sekitar 23,4°, bukan karena jaraknya ke Matahari: belahan yang condong ke Matahari dapat sinar lebih tegak dan siang lebih panjang. Indonesia ada di dekat khatulistiwa, jadi Matahari siangnya tetap tinggi sepanjang tahun.",
    "template": "clay",
    "language": "id",
    "format": "1080x1920",
    "captions": "pop",
    "duration": round(duration, 3),
    "fps": 60,
    "loop": {"line": "Dan itu sebabnya, tiap bulan Desember, / Eropa lagi bersalju, sementara Australia malah musim panas.", "picture": "The last shot cranes back up from the table to the snowy village, the framing of frame 0."},
    "voice": {"voice_id": "GdyFAZdMpKMBHw5pc1Bu", "name": "Livna", "model": "eleven_v4", "language": "id", "direction": "[warmly]"},
    "look": {
        "accent": "#ff8a65",
        "mood": "The Clay template: a little tabletop set with a painted peach card backdrop, a big soft key light from the upper left and a warm bounce, plasticine everything (fingerprints, tool marks, a boil on every held pose), stop motion at twelve frames a second, paper flags on toothpicks for every label. Coral is the accent: the word or flag that matters. The Sun is yellow-orange clay, the Earth blue with green land and white snow where it is winter.",
    },
    "music": {
        "track": "Composed for this film (ElevenLabs Music, music/bed.mp3)",
        "bpm": 100,
        "note": "A playful bed (marimba, plucks), composed to the take's length; quieter under the tilt and the torch, a lift on the payoff. Squishes, plops and small wooden knocks for every flag and lump. The cuts follow the take.",
    },
    "facts": [
        {"id": "f1", "claim": "Earth's axis is tilted 23.44 degrees to its orbit (its obliquity). The film says 'sekitar dua puluh tiga koma empat derajat' and writes '23,4°'.",
         "source": "NASA, Earth Fact Sheet (nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html): 'Obliquity to orbit (deg) 23.44'."},
        {"id": "f2", "claim": "Earth is closest to the Sun (perihelion, about 147.1 million km) in early January and farthest (aphelion, about 152.1 million km) in early July. The difference is small, and the Northern Hemisphere's winter comes when Earth is closest, so distance does not cause the seasons. The film's oval in s03 is exaggerated and labelled 'bukan skala'.",
         "source": "NASA, Earth Fact Sheet (perihelion 147.095, aphelion 152.100 million km); U.S. Naval Observatory, 'The Seasons and the Earth's Orbit' (aa.usno.navy.mil/faq/seasons_orbit): perihelion in early January; NASA Space Place, 'What Causes the Seasons?'."},
        {"id": "f3", "claim": "The seasons come from the tilt: the axis keeps pointing the same way as Earth orbits, so in June the Northern Hemisphere leans towards the Sun and in December the Southern Hemisphere does.",
         "source": "NASA Space Place, 'What Causes the Seasons?' (spaceplace.nasa.gov/seasons); NOAA NESDIS, 'Why does Earth have seasons?'; USNO (as f2)."},
        {"id": "f4", "claim": "The hemispheres have opposite seasons: when it is winter in Europe (December), it is summer in Australia.",
         "source": "NOAA NESDIS, 'Why does Earth have seasons?' (nesdis.noaa.gov); NASA Space Place (as f3)."},
        {"id": "f5", "claim": "The hemisphere leaning towards the Sun gets more direct sunlight, which concentrates the same light on a smaller area, and longer days; slanting light spreads over a bigger area and warms it less. The torch in s09 and s11 shows the spreading.",
         "source": "NASA Space Place, 'What Causes the Seasons?'; NOAA NESDIS, 'Why does Earth have seasons?'. Read through search summaries; the Space Place page reset the connection when fetched directly."},
        {"id": "f6", "claim": "Indonesia lies astride the equator, between about 6° north and 11° south. Jakarta is at about 6.2° south.",
         "source": "Indonesia's astronomical position, 6° N to 11° S (the Indonesian government's description, reported by theindonesia.id, 2021); Britannica, 'Malay Archipelago' (its islands lie within about 10 degrees of the Equator)."},
        {"id": "f7", "claim": "The Sun's height at noon is 90° minus the difference between the latitude and the Sun's declination, which swings between +23.44° and −23.44° through the year. Jakarta (6.2° S): its lowest noon Sun is 90 − (23.44 + 6.2) ≈ 60°. Berlin (52.5° N) in late December: 90 − (52.52 + 23.44) ≈ 14°. On screen: 'Jakarta ≥ 60°' and 'Berlin, Des 14°'.",
         "source": "PVEducation, 'Elevation Angle' (pveducation.org/pvcdrom/properties-of-sunlight/elevation-angle); declination range from f1; the arithmetic is in storyboard.build.py."},
    ],
    "acts": [
        {"id": "hook", "title": "Pertanyaan", "goal": "Same December, snow and summer.", "rail": False},
        {"id": "salah", "title": "Bukan jarak", "goal": "The wrong idea, and the fact that breaks it.", "rail": False},
        {"id": "miring", "title": "Sumbu miring", "goal": "The tilt, always the same way; direct and slanting light.", "rail": False},
        {"id": "indonesia", "title": "Indonesia", "goal": "The equator: the Sun stays high, no winter.", "rail": False},
        {"id": "recap", "title": "Jawaban", "goal": "Tilt, not distance; then the bridge into the first line.", "rail": False},
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
