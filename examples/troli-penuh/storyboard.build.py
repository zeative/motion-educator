"""Writes storyboard.json for "Kenapa troli penuh susah didorong?" (portrait 1080 x 1920, the Stickman template).

The sample film of the Stickman visual template: black ink on warm paper, drawn line by line, one marker colour.
The film is cut to one take of narration, so the times here are only a guess until the take retimes the board:

    python3 examples/troli-penuh/storyboard.build.py && node kit/tools/storyboard.mjs examples/troli-penuh --png

The physics is Newton's second law with one real trolley: a Wanzl ELT7/130 (131 litres) weighs 21 kg (f1). The
shopping is an example, chosen so the arithmetic is clean: 42 kg more makes 63 kg, three times the empty trolley.
Every distance drawn in s09 and s12 is computed below from those masses, not drawn by eye.
"""
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
shots = []

# ── The numbers ──────────────────────────────────────────────────────────────────────────────────────────────────
EMPTY, SHOPPING = 21, 42
FULL = EMPTY + SHOPPING  # 63 kg
RATIO = FULL / EMPTY  # 3.0
# s09: the same push F for the same time t; distance = a t^2 / 2 with a = F / m, so the full trolley goes 1/3 as far.
LANE = 560  # px the empty trolley covers while it is pushed
FULL_RUN = LANE / RATIO  # 187 px
# s12: the same braking force from the same speed; stopping distance = m v^2 / (2 F), so the full trolley needs 3 times.
STOP_EMPTY = 180
STOP_FULL = STOP_EMPTY * RATIO  # 540 px
assert RATIO == 3

# ── Drawing helpers for the board (1080 x 1920; the drawing lives in the upper two thirds) ─────────────────────────
GROUND = 1150


def fr(at, note, *draw):
    flat = []
    for d in draw:
        flat.extend(d if isinstance(d, list) else [d])
    return {"at": at, "note": note, "draw": flat}


def label(x, y, text, size=48, **more):
    return {"label": [x, y], "text": text, "size": size, **more}


def ground(y=GROUND):
    return {"path": f"M40 {y} C 300 {y - 12}, 700 {y + 8}, 1040 {y - 6}", "width": 6}


def scene(x=520, full=True, push=True, lean=20):
    """The opening picture: someone leaning into a loaded trolley."""
    out = [ground(), {"trolley": [x, GROUND, 380], "full": full}]
    if push:
        out.append({"pusher": [x - 210, GROUND, 430], "lean": lean})
    return out


def marker(x, y, w):
    return {"path": f"M{x} {y} H{x + w}", "colour": "yellow", "width": 34}


def scale_(x, y, reading):
    return [{"path": f"M{x - 220} {y} H{x + 220} V{y + 70} H{x - 220} Z", "width": 6},
            {"path": f"M{x - 70} {y + 18} H{x + 70} V{y + 56} H{x - 70} Z", "width": 4}, label(x, y + 50, reading, 34)]


# ── The script, cut into shots (one take; the take sets the times) ────────────────────────────────────────────────
def shot(id, act, type_, start, end, voice, **more):
    shots.append({"id": id, "act": act, "type": type_, "start": start, "end": end, "voice": voice, **more})


shot("s01", "hook", "wide", 0, 4.4,
     "Troli penuh lebih susah didorong, padahal beratnya nggak kamu *angkat* sama sekali.",
     teaches="The puzzle: a full trolley is hard to push, yet you never lift it.",
     screen="Warm paper. A hand-drawn floor across the frame at y 1150. A stick figure leans into a shopping trolley piled with three boxes of shopping; push arrow from the hands; sweat flicks by the head.",
     motion="Frame 0 is finished. The figure winds back, then shoves with a step (on twos); a horizontal arrow 'dorong' draws on from his hands, and the trolley starts to creep, slowly gaining speed: heavy to get going, not stuck. On 'angkat' an upward arrow is drawn and crossed out. The caption's key word is 'angkat'.",
     carries="The figure and the trolley.", transition="Hold, then the camera pushes in on the face.",
     sound="Paper bed starts; a strained 'hngg' is the voice's, a creak on the shove.",
     check="The trolley reads as a trolley at a glance; the figure is leaning, not standing.", facts=["f1"],
     frames=[fr(0, "Frame 0 is finished: the figure leaning into the loaded trolley, both drawn and still.", scene(), {"arrow": [450, 870, 520, 870], "colour": "red"}),
             fr(0.5, "The shove: the figure rocks back then forward; the trolley moves a hair and stops.", scene(lean=26), {"move": [520, 700, 560, 700], "text": "nyaris diam"}),
             fr(1, "On 'angkat' a dotted arrow points up from the trolley with a cross through it: you never lift it.", scene(), {"arrow": [710, 690, 710, 520], "colour": "red"}, {"path": "M670 560 L750 640 M750 560 L670 640", "colour": "red", "width": 8}, {"cut": "dorong kamera ke wajah"})])

shot("s02", "hook", "type", 4.4, 5.8, "Kok bisa?",
     teaches="Asks the question out loud.",
     screen="Close on the figure's head: a big hand-drawn question mark draws on beside it.",
     motion="Camera push to the face; the question mark draws on in two strokes.", carries="The face.", transition="Cut to a side view of the wheels.",
     sound="A pen scratch for the question mark.", check="Readable as a question in under a second.",
     frames=[fr(0, "Push in: the head and shoulders fill the upper half.", {"ring": [470, 700, 130]}, {"path": "M430 690 v4 M510 690 v4 M440 760 q30 -16 60 0", "width": 6}, {"camera": "push"}),
             fr(1, "A big question mark beside the head.", {"ring": [470, 700, 130]}, {"path": "M700 560 q0 -90 80 -90 q80 0 80 80 q0 60 -70 80 v60 M790 830 v6", "width": 14}, {"cut": "potong ke roda"})])

shot("s03", "massa", "diagram", 5.8, 9.4, "Semua beratnya ditahan roda ke lantai.",
     teaches="The weight goes down through the wheels into the floor; the floor holds it.",
     screen="The trolley side-on, larger. Ink arrows from the basket down to the two wheel pairs; arrows of the same length from the floor back up. Label 'berat' with a curved leader, 'lantai yang menahan' under the floor.",
     motion="The down arrows draw on from the load to the wheels; the up arrows answer from the floor.", carries="The loaded trolley.",
     transition="The arrows are rubbed out; the camera pulls back over the whole trolley and 'Kelembaman' is written across the top.",
     sound="Two soft taps as the arrows land.", check="Down and up arrows are the same length.", facts=["f2"],
     frames=[fr(0, "The loaded trolley, larger, centred on the floor.", ground(), {"trolley": [350, GROUND, 470], "full": True}),
             fr(0.5, "Weight arrows from the load down to the wheels.", ground(), {"trolley": [350, GROUND, 470], "full": True}, {"arrow": [420, 820, 420, 1110], "colour": "red"}, {"arrow": [760, 820, 760, 1110], "colour": "red"}, label(590, 760, "berat", 46, colour="red")),
             fr(1, "The floor pushes back up: equal arrows; label 'lantai menahan'.", ground(), {"trolley": [350, GROUND, 470], "full": True}, {"arrow": [420, 1250, 420, 1160], "colour": "blue"}, {"arrow": [760, 1250, 760, 1160], "colour": "blue"}, label(590, 1310, "lantai yang menahan", 44, colour="blue"), {"cut": "tulisan baru di atas"})])

shot("s04", "massa", "type", 9.4, 12.6, "Yang kamu lawan itu hal lain: *kelembaman*.",
     teaches="Names the real thing you fight: inertia.",
     screen="The word KELEMBAMAN hand-lettered big across the upper third, a marker swipe under it; the small trolley below.",
     motion="The word writes on letter by letter; the marker swipes under it on the word in the voice.", carries="The small trolley.",
     transition="The word slides up as a ball rolls in.", sound="A marker squeak under the swipe.", check="The word is the biggest thing on the page.",
     frames=[fr(0, "The word starts to write on.", label(540, 560, "Kelem", 120), ground(), {"trolley": [380, GROUND, 320], "full": True}),
             fr(1, "The whole word with its marker swipe.", marker(170, 600, 740), label(540, 560, "Kelembaman", 120), ground(), {"trolley": [380, GROUND, 320], "full": True}, {"cut": "kata naik"})])

shot("s05", "massa", "diagram", 12.6, 16.2, "Benda yang diam maunya tetap diam.",
     teaches="Inertia, part one: what is at rest stays at rest unless something pushes it.",
     screen="Back to the opening page: the figure shoves the full trolley again and it only creeps. Label 'diam' with a curved leader to the trolley, then 'maunya tetap diam' above. (Built without the ball: the same push on the same trolley carries the idea, and the page stays one picture.)",
     motion="The shove, then the trolley creeps forward, slowly gaining speed.", carries="The trolley and the figure.",
     transition="A second trolley slides in beside it.", sound="A light roll; a heavy creak.", check="It reads as heavy to start, not stuck: the trolley keeps creeping.", facts=["f3"],
     frames=[fr(0, "The trolley at rest; label 'diam'.", scene(push=False), label(710, 680, "diam", 54)),
             fr(0.5, "The figure pushes; arrow; the trolley hardly moves.", scene(), {"arrow": [450, 870, 530, 870], "colour": "red"}, {"move": [700, 650, 730, 650], "text": "sedikit"}),
             fr(1, "Label: 'maunya tetap diam'.", scene(), label(710, 600, "maunya tetap diam", 50), {"cut": "troli kedua masuk"})])

shot("s06", "massa", "compare", 16.2, 19.8, "Makin besar massanya, makin susah diubah geraknya.",
     teaches="Inertia grows with mass: more mass, harder to change its motion.",
     screen="Two trolleys side by side: empty (left, label 'massa kecil') and full (right, 'massa besar'); under the floor 'susah diubah geraknya:' and a hand-drawn bar under each trolley, the full one's three times longer and hatched.",
     motion="The bars draw on; the full one's marker swipe.", carries="The two trolleys.", transition="The empty trolley rolls onto a scale.",
     sound="Two pen strokes.", check="The bars are in the ratio 1 : 3.", facts=["f1", "f4"],
     frames=[fr(0, "Two trolleys side by side on one floor.", ground(), {"trolley": [130, GROUND, 300], "full": False}, {"trolley": [610, GROUND, 300], "full": True}),
             fr(0.5, "Labels under them: massa kecil, massa besar.", ground(), {"trolley": [130, GROUND, 300], "full": False}, {"trolley": [610, GROUND, 300], "full": True}, label(280, 1230, "massa kecil", 42), label(760, 1230, "massa besar", 42)),
             fr(1, "Bars for 'susah diubah': 1 and 3.", ground(), {"trolley": [130, GROUND, 300], "full": False}, {"trolley": [610, GROUND, 300], "full": True}, {"bar": [220, 1420, 120, 80]}, {"bar": [600, 1420, 360, 80], "colour": "red"}, {"cut": "troli kosong ke timbangan"})])

shot("s07", "angka", "diagram", 19.8, 23.6, "Troli kosong cuma sekitar *dua puluh satu kilo*.",
     teaches="A real trolley: an empty one weighs about 21 kg.",
     screen="The empty trolley on a big platform scale drawn on the floor; the scale's window reads 21 kg; small note 'Wanzl ELT7/130, 131 liter'.",
     motion="The trolley rolls onto the scale; the reading writes on.", carries="The trolley on the scale.", transition="Shopping drops in from above.",
     sound="A clunk onto the scale.", check="The number is 21, as the fact sheet says.", facts=["f1"],
     frames=[fr(0, "The empty trolley rolls in from the left.", ground(), {"trolley": [120, GROUND, 340], "full": False}, scale_(600, GROUND - 4, "")),
             fr(0.5, "The empty trolley stands on the scale.", ground(), scale_(600, GROUND - 4, ""), {"trolley": [430, GROUND - 4, 340], "full": False}),
             fr(1, "The reading: 21 kg, and the model's name small.", ground(), scale_(600, GROUND - 4, "21 kg"), {"trolley": [430, GROUND - 4, 340], "full": False}, {"number": [600, 600], "text": "21 kg", "size": 130}, label(600, 680, "Wanzl ELT7/130, 131 liter", 34), {"cut": "belanjaan jatuh"})])

shot("s08", "angka", "diagram", 23.6, 25.8, "Tambah belanjaan empat puluh dua kilo,",
     teaches="A real week's shop goes in: 42 kg of it.",
     screen="Boxes and bags drop one by one into the empty trolley standing on the scale; each lands with a squash.",
     motion="Each item drops and squashes into the basket on twos; the scale's needle waits.", carries="The trolley on the scale.",
     transition="Continuous: the reading changes on the next line.", sound="Three thumps as the items land.", check="The items land inside the basket, not floating.", facts=["f5"],
     frames=[fr(0, "Shopping falls into the basket from above.", ground(), scale_(600, GROUND - 4, "21 kg"), {"trolley": [430, GROUND - 4, 340], "full": False}, {"move": [600, 420, 600, 640], "text": "belanjaan"}),
             fr(1, "The basket is full; label '+42 kg'.", ground(), scale_(600, GROUND - 4, "21 kg"), {"trolley": [430, GROUND - 4, 340], "full": True}, label(600, 560, "+ 42 kg", 64), {"cut": "tanpa potongan"})])

shot("s08b", "angka", "chart", 25.8, 27.6, "massanya jadi *tiga kali lipat*.",
     teaches="21 + 42 = 63 kg: three times the empty trolley.",
     screen="The scale reads 63 kg; above it '21 + 42 = 63 kg' and a big '3×' with the marker.",
     motion="The reading changes once; the sum writes on; the marker swipes under 3×.", carries="The full trolley on the scale.",
     transition="Split into two lanes.", sound="A pen tick on '3×'.", check="21 + 42 = 63 is written; 63 / 21 = 3.", facts=["f1", "f5"],
     frames=[fr(0, "The scale's reading turns to 63 kg; the sum writes on.", ground(), scale_(600, GROUND - 4, "63 kg"), {"trolley": [430, GROUND - 4, 340], "full": True}, label(600, 520, "21 + 42 = 63 kg", 54)),
             fr(1, "The big 3× with its marker swipe.", ground(), scale_(600, GROUND - 4, "63 kg"), {"trolley": [430, GROUND - 4, 340], "full": True}, marker(420, 440, 240), {"number": [540, 430], "text": "3×", "size": 160}, {"cut": "dua lajur"})])

shot("s09", "angka", "compare", 27.6, 31.8, "Artinya, dorongan yang sama cuma bikin dia ngebut *sepertiganya*.",
     teaches="Same push, three times the mass: a third of the acceleration, so in the same time it gets a third as far.",
     screen=f"Two lanes, one above the other. Top: empty trolley with a push arrow F on its handle. Bottom: full trolley with the same arrow F. A dashed start line; when the push ends the empty one has gone {LANE} px, the full one {round(FULL_RUN)} px: brackets 'jauh' and 'cuma ⅓'.",
     motion="Both arrows are drawn the same length first; both trolleys are pushed for the same time (on twos), the full one gaining speed at a third of the rate; the arrows are rubbed out when the push ends, the brackets are drawn, and both roll on at the speed they have (the empty one out of the frame).", carries="The two lanes.",
     transition="Hold on the gap, then the full lane fills the frame.", sound="Two rolls, one long, one short.", check=f"Distances are {LANE} and {round(FULL_RUN)} px: 3 : 1.", facts=["f4", "f5"],
     frames=[fr(0, "Two lanes, same push arrow F on each.", {"path": "M80 760 H1000 M80 1260 H1000", "width": 5}, {"trolley": [120, 760, 220], "full": False}, {"trolley": [120, 1260, 220], "full": True}, {"arrow": [40, 640, 110, 640], "colour": "red"}, {"arrow": [40, 1140, 110, 1140], "colour": "red"}, label(70, 600, "F", 50, colour="red"), label(70, 1100, "F", 50, colour="red")),
             fr(0.6, "Both move for the same time.", {"path": "M80 760 H1000 M80 1260 H1000", "width": 5}, {"trolley": [120 + LANE * 0.6, 760, 220], "full": False}, {"trolley": [120 + FULL_RUN * 0.6, 1260, 220], "full": True}, {"move": [120, 520, 120 + LANE * 0.6, 520], "text": "cepat"}, {"move": [120, 1020, 120 + FULL_RUN * 0.6, 1020], "text": "lambat"}),
             fr(1, "Where they are after the same time: 3 : 1.", {"path": "M80 760 H1000 M80 1260 H1000", "width": 5}, {"trolley": [120 + LANE, 760, 220], "full": False}, {"trolley": [120 + FULL_RUN, 1260, 220], "full": True}, {"bracket": [120, 120 + LANE, 830], "text": "1 bagian kosong"}, {"bracket": [120, 120 + round(FULL_RUN), 1330], "text": "1/3"}, {"cut": "lajur penuh membesar"})])

shot("s10", "berhenti", "wide", 31.8, 34.0, "Masalahnya belum selesai.",
     teaches="Turn: inertia also works the other way.",
     screen="The full trolley now rolling along the floor with speed lines; the figure walking behind it.",
     motion="It rolls on at a steady speed with speed lines; the figure runs after it (on twos); the camera travels with the trolley along the floor, its tiles going by.", carries="The rolling trolley.", transition="Continuous: the figure grabs the handle.",
     sound="Wheels rumbling.", check="It reads as moving, not standing.",
     frames=[fr(0, "Rolling, speed lines behind.", ground(), {"trolley": [480, GROUND, 360], "full": True}, {"path": "M300 900 h120 M280 980 h140 M320 1060 h100", "width": 6}, {"camera": "right"}),
             fr(1, "Still rolling; the figure catches up.", ground(), {"trolley": [560, GROUND, 360], "full": True}, {"person": [380, GROUND, 400]}, {"cut": "tanpa potongan"})])

shot("s11", "berhenti", "diagram", 34.0, 37.2, "Begitu udah jalan, dia juga ogah *berhenti*.",
     teaches="Inertia, part two: what moves keeps moving; stopping a big mass is hard too.",
     screen="The figure leans back on the handle, heels dug in; the trolley keeps rolling and drags them along; label 'maunya tetap jalan'.",
     motion="His arm reaches the handle over four drawings; he leans back, heels dug in and sliding (skid lines); the trolley slows but is still rolling when the page turns.", carries="The figure and trolley.",
     transition="Split into two lanes again.", sound="Shoes squeak as the heels slide.", check="The figure leans backwards, the opposite of s01.", facts=["f3"],
     frames=[fr(0, "Grabbing the handle, starting to lean back.", ground(), {"trolley": [560, GROUND, 360], "full": True}, {"person": [400, GROUND, 400]}),
             fr(0.5, "Leaning back, heels skidding; the trolley rolls on.", ground(), {"trolley": [620, GROUND, 360], "full": True}, {"path": "M420 1150 l-60 -380 M420 1150 l40 -10", "width": 10}, {"move": [620, 700, 700, 700], "text": "tetap jalan"}),
             fr(1, "Label 'maunya tetap jalan'.", ground(), {"trolley": [660, GROUND, 360], "full": True}, label(540, 560, "maunya tetap jalan", 52), {"cut": "dua lajur"})])

shot("s12", "berhenti", "compare", 37.2, 41.8, "Kalau kamu ngerem sekuat tadi, jaraknya *tiga kali* lebih panjang.",
     teaches="Same braking force from the same speed: the full trolley needs three times the distance to stop.",
     screen=f"Two lanes again, both trolleys arriving at the same speed at a dashed line 'mulai ngerem'; while each brakes, the same arrow F as in s09 turned round on its handle ('sekuat tadi'); skid marks and brackets grow from the line: {STOP_EMPTY} px for the empty one, {round(STOP_FULL)} px for the full one; '1' and '× 3' in marker.",
     motion="Both brake at the line at the same moment; the empty one stops early, the full one slides on; '× 3' is written as it stops, on 'tiga kali', and held for a second before the page turns.", carries="The two stopping marks.",
     transition="The lanes slide away; one frame of the summary.", sound="Two skids, the second three times as long.", check=f"Stopping marks {STOP_EMPTY} and {round(STOP_FULL)} px: 1 : 3.", facts=["f4", "f6"],
     frames=[fr(0, "Both arrive at the braking line at the same speed.", {"path": "M80 760 H1040 M80 1260 H1040", "width": 5}, {"path": "M300 540 V1290", "colour": "red", "dashed": True}, {"trolley": [80, 760, 220], "full": False}, {"trolley": [80, 1260, 220], "full": True}, label(300, 500, "mulai ngerem", 40, colour="red")),
             fr(0.6, "The empty one has stopped; the full one is still sliding.", {"path": "M80 760 H1040 M80 1260 H1040", "width": 5}, {"path": "M300 540 V1290", "colour": "red", "dashed": True}, {"trolley": [300 + STOP_EMPTY - 220, 760, 220], "full": False}, {"trolley": [300 + STOP_FULL * 0.6 - 220, 1260, 220], "full": True}),
             fr(1, "Both stopped: marks 1 and 3; '×3'.", {"path": "M80 760 H1040 M80 1260 H1040", "width": 5}, {"path": "M300 540 V1290", "colour": "red", "dashed": True}, {"trolley": [300 + STOP_EMPTY - 220, 760, 220], "full": False}, {"trolley": [300 + STOP_FULL - 220, 1260, 220], "full": True}, {"bracket": [300, 300 + STOP_EMPTY, 830], "text": "1"}, {"bracket": [300, 300 + round(STOP_FULL), 1330], "text": "×3"}, {"cut": "rangkuman"})])

shot("s13", "recap", "recap", 41.8, 45.6, "Jadi yang bikin capek itu *massanya*, bukan beratnya.",
     teaches="The answer in one frame: you fight the mass (inertia), not the weight.",
     screen="One page: at the top 'massa ✓' with the marker and 'berat' crossed out, and under them, small, '(terutama saat mulai & berhenti)' (f7); then the two ideas as small drawings in a column: 'susah mulai' (figure pushing, arrow forward), 'susah berhenti' (figure leaning back on a rolling trolley, arrow back, skid lines).",
     motion="The two small drawings draw on; 'berat' is crossed out on 'bukan'.", carries="The pushing figure.", transition="The opening page is laid back over it.",
     sound="Two ticks and a cross-out scratch.", check="Readable as a summary with the sound off.", facts=["f3", "f4", "f7"],
     frames=[fr(0, "The two words at the top.", marker(250, 450, 260), label(380, 420, "massa ✓", 70), label(720, 420, "berat", 70)),
             fr(0.5, "Two small drawings: hard to start, hard to stop.", label(380, 420, "massa ✓", 70), label(720, 420, "berat", 70), {"pusher": [300, 900, 260]}, {"trolley": [430, 900, 200], "full": True}, label(420, 960, "susah mulai", 40), {"person": [680, 1300, 260]}, {"trolley": [760, 1300, 200], "full": True}, label(760, 1360, "susah berhenti", 40)),
             fr(1, "'berat' crossed out.", label(380, 420, "massa ✓", 70), label(720, 420, "berat", 70), {"path": "M630 400 L820 430", "colour": "red", "width": 9}, {"pusher": [300, 900, 260]}, {"trolley": [430, 900, 200], "full": True}, {"person": [680, 1300, 260]}, {"trolley": [760, 1300, 200], "full": True}, {"cut": "kembali ke awal"})])

shot("s14", "recap", "wide", 45.6, 47.4, "Itulah kenapa",
     teaches="The bridge back into the first line.",
     screen="Back to the opening picture: the figure leaning into the full trolley, the same pixels as frame 0.",
     motion="The page slides back; the figure settles into the s01 pose a moment before frame 0.", carries="Into s01.", transition="No cut: the film loops straight into s01.",
     sound="The bed runs on into the opening.", check="The last frame matches frame 0 (check.mjs SSIM).",
     frames=[fr(0, "The page slides back to the opening picture.", scene(lean=14), {"move": [900, 900, 700, 900], "text": "halaman kembali"}),
             fr(1, "The opening picture, a moment before frame 0.", scene(), {"cut": "loop ke s01"})])

duration = shots[-1]["end"]

storyboard = {
    "title": "Kenapa troli penuh susah didorong?",
    "question": "Kenapa troli belanja yang penuh lebih susah didorong, padahal beratnya nggak kita angkat?",
    "audience": "Orang Indonesia yang belanja ke supermarket dan nonton video pendek. Mereka tahu troli penuh terasa berat, tapi mengira itu soal berat yang harus diangkat atau ditahan, bukan soal massa.",
    "promise": "Yang bikin troli penuh susah didorong itu massanya, bukan beratnya: dorongan yang sama ke massa tiga kali lipat cuma menghasilkan sepertiga percepatan, dan dia juga tiga kali lebih susah dihentikan.",
    "template": "stickman",
    "language": "id",
    "format": "1080x1920",
    "captions": "pop",
    "duration": round(duration, 3),
    "fps": 60,
    "loop": {"line": "Itulah kenapa / troli penuh lebih susah didorong, padahal beratnya nggak kamu angkat sama sekali.", "picture": "The last shot slides back to the opening picture: the figure leaning into the loaded trolley, the same pixels as frame 0."},
    "voice": {"voice_id": "xlBOShi2835jfBgaEld4", "name": "Rafiq", "model": "eleven_v4", "language": "id", "direction": "[warmly]"},
    "look": {
        "accent": "#f2c14e",
        "mood": "The Stickman template: warm off-white paper with grain and a soft vignette, black ink drawn on stroke by stroke and boiling over a faint pencil sketch that runs past it, lettering written letter by letter and rubbed out, never faded; one marker colour (yellow) for the word or the number that matters, and nothing else in colour. Each page is a sheet laid over the last. Characters on twos.",
    },
    "music": {
        "track": "Composed for this film (ElevenLabs Music, music/bed.mp3)",
        "bpm": 96,
        "note": "A light acoustic bed (ukulele, pizzicato, soft claps), composed to the take's length; it thins under the numbers and lifts on the payoff. Pen scratches as lines draw and as letters are written, a rub for each erasure, a thump for each item of shopping, skids in s12. The cuts follow the take.",
    },
    "facts": [
        {"id": "f1", "claim": "A real supermarket trolley: the Wanzl ELT7/130, with a 131-litre basket, weighs 21 kg (load capacity 131 kg). The film calls the empty trolley 'sekitar dua puluh satu kilo' and writes '21 kg' and the model on screen.",
         "source": "Wanzl, Shopping trolleys catalogue (1193_Shopping-trolleys_EN.pdf, wanzl.com), 'Order section for ELT series': ELT7/130, basket volume 131 l, load capacity 131 kg, weight 21.0 kg."},
        {"id": "f2", "claim": "On a level floor you do not lift the trolley: its weight is carried by the wheels and held up by the floor (the floor's upward push balances the weight). Simplification: the film draws two equal arrow pairs; there are four wheels.",
         "source": "NASA Glenn Research Center, Beginner's Guide, 'Newton's Laws of Motion' and 'Weight' (grc.nasa.gov/www/k-12): a body at rest has balanced forces."},
        {"id": "f3", "claim": "Inertia (Newton's first law): a body at rest stays at rest, and a body in motion keeps moving at the same speed, unless an outside force acts on it.",
         "source": "NASA Glenn Research Center, 'Newton's First Law of Motion' (grc.nasa.gov/www/k-12/airplane/newton1g.html)."},
        {"id": "f4", "claim": "Newton's second law: F = m × a, so a = F / m. With the same push F, three times the mass gives a third of the acceleration. Starting from rest for the same time t, the distance is a t² / 2, so the full trolley covers a third as far (the film's lanes: 560 px and 187 px).",
         "source": "NASA Glenn Research Center, 'Newton's Second Law of Motion' (grc.nasa.gov/www/k-12/BGP/newton2.html); 'Motion equations' (grc.nasa.gov/www/k-12/airplane/motion.html) for distance = a t² / 2."},
        {"id": "f5", "claim": "The shopping is an example: 42 kg (a big week's shop: drinks, rice, detergent). 21 + 42 = 63 kg, and 63 / 21 = 3: three times the empty trolley's mass. On screen: '21 + 42 = 63 kg' and '3×'.",
         "source": "Arithmetic from f1; the 42 kg is chosen for the example and is said as one ('Tambah belanjaan empat puluh dua kilo')."},
        {"id": "f6", "claim": "Stopping: with the same braking force F from the same speed v, the deceleration is F / m and the stopping distance is v² / (2a) = m v² / (2F), proportional to the mass. Three times the mass: three times the distance (the film's marks: 180 px and 540 px). The braking arrow is drawn the same length as s09's push ('sekuat tadi'). Rolling friction is ignored in both lanes.",
         "source": "NASA Glenn Research Center, 'Newton's Second Law of Motion' and 'Motion equations' (v² = 2 a d), as f4; the arithmetic is shown in storyboard.build.py."},
        {"id": "f7", "claim": "The weight is not irrelevant: rolling at a steady walk, the wheels' rolling resistance is about Crr × N, where N is the weight the wheels carry, so a full trolley also takes a little more push to keep going. For hard wheels on a smooth floor Crr is small, so it is a small force next to the push needed to start or stop the mass. The film says 'bukan beratnya' and writes '(terutama saat mulai & berhenti)' under it, so the claim is about starting and stopping.",
         "source": "Rolling resistance, F = Crr × N (Wikipedia, 'Rolling resistance', en.wikipedia.org/wiki/Rolling_resistance: definition and typical coefficients); Newton's second law for the push to start or stop the mass (f4, f6)."},
    ],
    "acts": [
        {"id": "hook", "title": "Pertanyaan", "goal": "The puzzle: hard to push, yet never lifted.", "rail": False},
        {"id": "massa", "title": "Kelembaman", "goal": "Not weight: inertia, and it grows with mass.", "rail": False},
        {"id": "angka", "title": "Tiga kali", "goal": "A real trolley, a real load, the arithmetic of a third.", "rail": False},
        {"id": "berhenti", "title": "Susah berhenti", "goal": "The same mass also resists stopping: three times the distance.", "rail": False},
        {"id": "recap", "title": "Jawaban", "goal": "Mass, not weight; then the bridge into the first line.", "rail": False},
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
