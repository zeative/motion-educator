"""Writes storyboard.json for "Kenapa hoaks yang diulang-ulang lama-lama terasa benar?" (portrait, 1080 x 1920).

The film is cut to one take of narration. This script writes the plan: the shots, each with its run of the script
and its drawn frames. The times it writes are a guess; the take sets the real ones, so the script ends by asking the
voice tool to retime the board (it does nothing until a take is there):

    python3 examples/hoaks-diulang/storyboard.build.py && node kit/tools/storyboard.mjs examples/hoaks-diulang --png

Layout: what must be read sits between x 64 and 930. The picture uses y 250 to 1200; the spoken words pop in at
y 1230 to 1430, under it. The two meters ("terasa benar", amber; "bukti", blue) are illustrations, not measurements:
they say so on screen, and "bukti" never moves off zero until a source is checked.
"""
import json
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
    return {"at": at, "note": note, "draw": [d for d in flat(draw)]}


def flat(items):
    for item in items:
        if isinstance(item, list):
            yield from flat(item)
        else:
            yield item


def label(x, y, text, size=40, **more):
    return {"label": [x, y], "text": text, "size": size, **more}


# ── The chat: a generic group thread, glass on graphite, no real app's look ──────────────────────────────────────
CLAIM = "Malam ini jam 00.30\nmatikan HP! Ada radiasi\nkosmik dari luar angkasa."
SENDERS = ["Om Hendra", "Bude Sri", "Pak RT", "Tante Lina", "Mas Bayu"]


def chat_frame():
    return [{"card": [64, 250, 866, 950]}, label(120, 318, "Grup Keluarga Besar", 44, align="start"), label(120, 362, "38 anggota", 30, align="start"),
            {"line": [64, 392, 930, 392], "width": 3}]


def bubble(y, n, bold=1.0):
    """The same claim, forwarded again: the n-th repeat. Each repeat is set heavier, larger, more amber."""
    size = round(34 + 6 * bold)
    return [{"card": [96, y, 760, 230]}, label(130, y + 46, f"{SENDERS[n % 5]}  ·  diteruskan {n + 1}×", 30, align="start", colour="orange"),
            label(130, y + 100, CLAIM, size, align="start")]


def meters(feel, proof=0, y=1010):
    """Two horizontal meters. feel and proof are 0..1, illustrative."""
    x0, x1 = 360, 930
    w = x1 - x0
    out = [label(64, y + 40, "terasa benar", 38, align="start", colour="orange"),
           {"path": f"M{x0} {y} H{x1} V{y + 56} H{x0} Z", "width": 5}]
    if feel > 0:
        out.append({"path": f"M{x0} {y} H{round(x0 + w * feel)} V{y + 56} H{x0} Z", "colour": "orange", "fill": "orange", "width": 5})
    out += [label(64, y + 140, "bukti", 38, align="start", colour="blue"), {"path": f"M{x0} {y + 100} H{x1} V{y + 156} H{x0} Z", "width": 5},
            label(x0 + 30, y + 142, "0" if proof == 0 else "", 40, align="start", colour="blue")]
    if proof > 0:
        out.append({"path": f"M{x0} {y + 100} H{round(x0 + w * proof)} V{y + 156} H{x0} Z", "colour": "blue", "fill": "blue", "width": 5})
    return out


ILUS = label(930, 1196, "ilustrasi, bukan ukuran", 28, align="end")
FEEL = [0.18, 0.34, 0.48, 0.6, 0.7, 0.78, 0.84]  # the meter after each repeat: it rises, by less each time (illustration)

# ── The head, and the sentence read again and again ──────────────────────────────────────────────────────────────
HEAD = {"path": "M640 1180 L640 1060 Q760 1040 780 960 L830 950 Q850 940 830 900 L860 860 Q880 840 850 820 L840 760 Q840 600 740 500 Q620 380 470 390 Q280 400 200 560 Q140 700 210 840 Q250 920 250 1000 L250 1180", "width": 8}
LINE_Y = 700
# ── The path: a grassy field seen from above at a slant, a path from the bottom up into the distance ───────────
FIELD = [{"path": "M0 380 L1080 380 L1080 1200 L0 1200 Z", "colour": "green", "fill": "green", "width": 2}]


def trail(wear):
    """The path: wider and brighter the more it is walked (wear 0..1)."""
    w0, w1 = round(40 + 140 * wear), round(8 + 30 * wear)
    return {"path": f"M{540 - w0} 1200 Q{470 - w0 / 2} 900 {520 - w1} 420 L{520 + w1} 420 Q{470 + w0 / 2} 900 {540 + w0} 1200 Z", "colour": "orange", "fill": "orange" if wear > 0.3 else None, "width": 5}


NOTE_PIC = {"chip": [64, 250], "text": "gambaran, bukan pindaian otak"}

# ── The headline, seen once ─────────────────────────────────────────────────────────────────────────────────────
HEADLINE = "RADIASI KOSMIK MALAM INI:\nSEMUA HP HARUS DIMATIKAN"
HEADLINE2 = "AIR ES BIKIN LEMAK\nPERUT MEMBEKU"


def news(y, text, seen, h=330):
    return [{"card": [64, y, 866, h]}, label(110, y + 60, "berita  ·  " + ("pernah dilihat 1×" if seen else "baru pertama"), 30, align="start", colour="blue" if seen else None),
            label(110, y + 140, text, 50, align="start")]


def mini(x, y, level, w=460):
    return [label(x, y - 16, "terasa benar", 30, align="start", colour="orange"), {"path": f"M{x} {y} H{x + w} V{y + 40} H{x} Z", "width": 4},
            {"path": f"M{x} {y} H{round(x + w * level)} V{y + 40} H{x} Z", "colour": "orange", "fill": "orange", "width": 4}]


STACK = [[{"card": [120, 262 + i * 148, 760, 118]} for i in range(5)], [label(500, 312 + i * 148, "Malam ini jam 00.30 matikan HP! Ada", 30) for i in range(5)],
         [label(500, 352 + i * 148, "radiasi kosmik dari luar angkasa.", 30) for i in range(5)]]
EQUALS = [label(905, 400 + i * 148, "=", 56) for i in range(4)]
SENT = [label(500, 660, "Malam ini jam 00.30", 54), label(500, 730, "matikan HP!", 54)]
SIGN = [{"path": "M520 470 L520 330", "width": 8}, {"card": [380, 250, 280, 90]}, label(520, 312, "BENAR", 52, colour="orange")]
PERSON = {"path": "M140 1200 L140 1080 Q140 980 230 950 L300 930 Q260 880 255 820 Q240 820 236 790 L240 740 Q230 600 330 560 Q460 520 500 640 Q520 700 505 760 L530 820 L500 830 Q500 880 470 900 L430 900 L420 940 Q500 960 520 1060 L520 1200", "width": 8}
KNOW = [{"card": [470, 270, 460, 190]}, label(700, 340, "samudra terbesar:", 34), label(700, 410, "Pasifik ✓", 52, colour="blue")]
ATL = [{"chip": [440, 540], "text": "Atlantik terbesar"}, {"chip": [470, 660], "text": "Atlantik terbesar"}]
BUTTONS = [{"chip": [110, 800], "text": "↪ terusin"}, {"chip": [470, 800], "text": "cek sumber"}]
LOUD = bubble(360, 4, 1.6)

FRAMES = {
    "s01": [
        fr(0.0, "Frame 0 is finished: the group thread fills the frame, the claim is already in it once and a second copy is sliding in. The amber meter under it already shows a sliver.",
           chat_frame(), bubble(420, 0, 0), bubble(680, 1, 0.3), {"move": [880, 980, 880, 760], "text": "masuk"}, meters(FEEL[1]), ILUS, {"camera": "push"}),
        fr(1.0, "A copy lands on 'diulang-ulang' and another on 'keluarga': the thread scrolls up, each copy set heavier, larger and more amber, the meter stepping up with each.",
           chat_frame(), bubble(420, 2, 0.6), bubble(680, 3, 1.0), {"move": [700, 700, 700, 450], "text": "gulir naik"}, meters(FEEL[3]), ILUS, {"cut": "tanpa potongan"}),
    ],
    "s02": [
        fr(0.0, "On 'lama-lama' the fifth copy lands, the loudest: it glows amber and fills its bubble. The camera pushes in on it and the meter.",
           chat_frame(), bubble(400, 3, 1.0), bubble(640, 4, 1.6), {"glow": [480, 780, 300], "colour": "orange"}, meters(FEEL[4]), ILUS, {"camera": "push"}),
        fr(1.0, "On 'terasa benar' the meter's label lights and the bar holds high: five copies, one feeling.",
           chat_frame(), bubble(400, 3, 1.0), bubble(640, 4, 1.6), meters(FEEL[4]), {"glow": [500, 1040, 160], "colour": "orange"}, ILUS, {"cut": "salinan berjajar"}),
    ],
    "s03": [
        fr(0.0, "The thread pulls back into a stack of five identical bubbles: the same words in every one.",
           STACK, meters(FEEL[4]), ILUS, {"camera": "pull"}),
        fr(0.45, "On 'sama persis' '=' marks pop between the copies, one after another.",
           STACK, EQUALS, {"move": [980, 400, 980, 860], "text": "="}, meters(FEEL[4]), ILUS),
        fr(1.0, "On 'bukti' the blue meter lights, its 0 pops, and it stays empty while the amber one is high.",
           STACK, EQUALS, meters(FEEL[4]), {"glow": [420, 1140, 120], "colour": "blue"}, ILUS, {"cut": "kalimat terbang ke kepala"}),
    ],
    "s04": [
        fr(0.0, "A head in profile, outlined in glass light, fills the frame; the stack folds into one sentence that flies into it from the right.",
           HEAD, {"move": [930, 420, 640, 640], "text": "masuk"}, {"glow": [480, 720, 260], "colour": "orange"}, {"camera": "push"}),
        fr(1.0, "On 'otak' a soft amber light swells inside the head; the sentence sits inside it on two lines.",
           HEAD, SENT, {"glow": [500, 700, 340], "colour": "orange"}, {"cut": "tanpa potongan"}),
    ],
    "s05": [
        fr(0.0, "Pass one: a reading light crawls along the sentence, catching on each word. A chip 'dibaca ke-1' and a long 'usaha' bar.",
           HEAD, SENT, {"move": [300, 790, 560, 790], "text": "pelan, tersendat"},
           {"chip": [330, 870], "text": "dibaca ke-1"}, label(300, 1080, "usaha", 34, align="start"), {"path": "M420 1056 H860 V1096 H420 Z", "fill": "ink", "width": 4}),
        fr(1.0, "Pass two goes quicker; the 'usaha' bar has stepped down.",
           HEAD, SENT, {"move": [300, 790, 700, 790], "text": "lebih cepat"},
           {"chip": [330, 870], "text": "dibaca ke-2"}, label(300, 1080, "usaha", 34, align="start"), {"path": "M420 1056 H730 V1096 H420 Z", "fill": "ink", "width": 4}, {"cut": "kamera mendekat"}),
    ],
    "s06": [
        fr(0.0, "The camera has pushed in on the sentence. Pass three glides.",
           [label(540, 640, "Malam ini jam 00.30", 70), label(540, 730, "matikan HP!", 70)], {"move": [200, 800, 880, 800], "text": "lancar"},
           {"chip": [360, 880], "text": "dibaca ke-3"}, label(300, 1080, "usaha", 34, align="start"), {"path": "M420 1056 H600 V1096 H420 Z", "fill": "ink", "width": 4}, {"camera": "push"}),
        fr(1.0, "On 'gampang' pass five sweeps in one stroke; the sentence glows warm and smooth; 'usaha' is a sliver. The cut dives along the reading line.",
           [label(540, 640, "Malam ini jam 00.30", 70, colour="orange"), label(540, 730, "matikan HP!", 70, colour="orange")],
           {"chip": [360, 880], "text": "dibaca ke-5"}, label(300, 1080, "usaha", 34, align="start"), {"path": "M420 1056 H470 V1096 H420 Z", "fill": "ink", "width": 4}, {"cut": "menyelam ke garis bacaan"}),
    ],
    "s07": [
        fr(0.0, "A lit 3D field of grass, seen from above at a slant, fills the frame to the edges. A faint line runs through it from the bottom to the horizon. A chip at the top: a picture, not a brain scan.",
           FIELD, trail(0.05), NOTE_PIC, {"camera": "down"}),
        fr(0.5, "A small amber light walks the line; behind it the blades bend down. Again, quicker: they bend further. 'dilewati 3×'.",
           FIELD, trail(0.4), NOTE_PIC, {"dot": [500, 760, 22], "colour": "orange"}, {"move": [520, 1100, 500, 520], "text": "dilewati lagi"}, {"chip": [600, 1080], "text": "dilewati 3×"}),
        fr(1.0, "On 'mulus' the path is wide and smooth, the flattened grass shining; the walker runs it in a quarter of the first time. 'dilewati 6×'.",
           FIELD, trail(0.9), NOTE_PIC, {"chip": [600, 1080], "text": "dilewati 6×"}, {"camera": "push"}, {"cut": "kamera naik"}),
    ],
    "s08": [
        fr(0.0, "The camera tilts up along the smooth path to its far end.",
           FIELD, trail(0.9), {"camera": "up"}),
        fr(1.0, "At the end of the path an amber sign: 'BENAR'. On 'salah kira' a blue chip hangs on it: the brain follows the easy path to the wrong sign.",
           FIELD, trail(0.9), SIGN, {"chip": [600, 380], "text": "salah kira"}, {"cut": "tanpa potongan"}),
    ],
    "s09": [
        fr(0.0, "On 'gampang' and 'akrab' two chips rise off the path; the meters return under the field.",
           FIELD, trail(0.9), SIGN, {"chip": [130, 560], "text": "gampang"}, {"chip": [560, 640], "text": "akrab"}, meters(FEEL[5]), ILUS),
        fr(1.0, "On 'benar' the line 'gampang + akrab = terasa benar' slams in; the amber meter steps up; 'bukti' is still 0.",
           FIELD, SIGN, {"title": [500, 760], "text": "gampang + akrab\n= terasa benar", "size": 84, "accent": "terasa benar"}, meters(FEEL[6]), ILUS, {"cut": "nama efeknya naik"}),
    ],
    "s10": [
        fr(0.0, "The name in metal type over the dim field: 'efek' lands on its word.",
           {"title": [500, 560], "text": "efek", "size": 140}, {"path": "M0 380 L1080 380 L1080 1200 L0 1200 Z", "colour": "green", "width": 2}, {"camera": "push"}),
        fr(0.5, "'kebenaran', then 'ilusif' in amber, each on its word.",
           {"title": [500, 560], "text": "efek\nkebenaran\nilusif", "size": 140, "accent": "ilusif"}, {"path": "M0 380 L1080 380 L1080 1200 L0 1200 Z", "colour": "green", "width": 2}),
        fr(1.0, "Under it, small: the English name and where it was first measured.",
           {"title": [500, 560], "text": "efek\nkebenaran\nilusif", "size": 140, "accent": "ilusif"}, label(500, 1000, "illusory truth effect", 42),
           label(500, 1066, "Hasher, Goldstein & Toppino · 1977", 34), {"cut": "kartu berita naik"}),
    ],
    "s11": [
        fr(0.0, "A generic news card slides up (no outlet's look): a dark space picture, the headline about the same radiation hoax, 'baru pertama'.",
           news(360, HEADLINE, False, 560), {"path": "M64 360 H930 V640 H64 Z", "width": 3}, {"move": [500, 1150, 500, 900], "text": "masuk"}, label(500, 1000, "contoh judul palsu", 32)),
        fr(1.0, "On 'sekali' a reading light crosses it once; 'dilihat 1×' pops; on 'aja' the card drops away down the feed.",
           news(360, HEADLINE, True, 560), {"chip": [560, 860], "text": "dilihat 1×"}, {"move": [500, 700, 500, 1100], "text": "lewat"}, {"cut": "ketemu lagi"}),
    ],
    "s12": [
        fr(0.0, "Later: the seen headline comes back on top ('pernah dilihat 1×'), a new fake one under it ('baru pertama'). Each has a small amber meter, empty.",
           news(270, HEADLINE, True), mini(110, 660, 0.0), news(750, HEADLINE2, False), mini(110, 1140, 0.0)),
        fr(0.6, "On 'terasa benar' the meters fill: the seen headline's stops a little higher than the new one's.",
           news(270, HEADLINE, True), mini(110, 660, 0.25), news(750, HEADLINE2, False), mini(110, 1140, 0.15)),
        fr(1.0, "A small tick marks the gap, 'sedikit lebih tinggi'; the source in the corner.",
           news(270, HEADLINE, True), mini(110, 660, 0.25), news(750, HEADLINE2, False), mini(110, 1140, 0.15),
           {"bracket": [312, 368, 720], "text": "sedikit"}, label(930, 1120, "Pennycook dkk. · 2018 · ilustrasi", 34, align="end"), {"cut": "orang yang tahu"}),
    ],
    "s13": [
        fr(0.0, "A person in profile fills the left. Above, a thought card with what they know: 'samudra terbesar: Pasifik ✓'.",
           PERSON, KNOW, {"camera": "push"}),
        fr(0.5, "A false sentence arrives twice: 'Atlantik terbesar'.",
           PERSON, KNOW, ATL, {"move": [990, 660, 760, 660], "text": "diulang"}),
        fr(1.0, "On 'kena' a small amber meter by the person nudges up a little, and the knowledge card is still lit.",
           PERSON, KNOW, ATL, mini(470, 900, 0.42), label(930, 1160, "Fazio dkk. · 2015", 30, align="end"), {"cut": "kembali ke grup"}),
    ],
    "s14": [
        fr(0.0, "Back in the thread: the loudest copy of the claim, and the two meters.",
           chat_frame(), LOUD, meters(FEEL[6]), ILUS, {"camera": "pull"}),
        fr(0.6, "On 'bukan bukti' a hit: the blue 0 flashes, and 'sering dengar ≠ bukti' slams in, the '≠' in amber.",
           chat_frame(), LOUD, {"title": [500, 860], "text": "sering dengar ≠ bukti", "size": 72, "accent": "≠"}, meters(FEEL[6]), ILUS),
        fr(1.0, "The hold after the line: the line stays, the amber glow on the claim pulses once.",
           chat_frame(), LOUD, {"title": [500, 860], "text": "sering dengar ≠ bukti", "size": 72, "accent": "≠"}, meters(FEEL[6]), ILUS, {"camera": "push"}, {"cut": "tanpa potongan"}),
    ],
    "s15": [
        fr(0.0, "Two buttons rise under the claim: '↪ terusin' and a calm blue 'cek sumber'. A finger comes in.",
           chat_frame(), LOUD, BUTTONS, {"move": [880, 1180, 300, 880], "text": "jari"}, meters(FEEL[6]), ILUS),
        fr(1.0, "On 'terusin' the finger hovers over it, then slides to 'cek sumber'.",
           chat_frame(), LOUD, BUTTONS, {"move": [300, 900, 620, 880], "text": "pindah"}, meters(FEEL[6]), ILUS, {"cut": "tanpa potongan"}),
    ],
    "s16": [
        fr(0.0, "On 'cek' the tap: a calm blue ring, the stage turns blue, a blue scan sweeps down the bubble.",
           chat_frame(), LOUD, BUTTONS, {"ring": [620, 845, 90], "colour": "blue"}, {"line": [96, 520, 856, 520], "colour": "blue", "width": 8}, meters(FEEL[6]), ILUS),
        fr(0.45, "On 'sumbernya' the claim cracks across and its pieces fall away.",
           chat_frame(), {"path": "M96 360 L420 360 L380 520 L460 600 L400 730 L96 730 Z", "width": 6}, {"path": "M470 380 L856 360 L856 720 L520 740 L560 600 L480 520 Z", "width": 6},
           {"move": [300, 700, 260, 1000], "text": "jatuh"}, meters(0.3), ILUS),
        fr(1.0, "A blue result card: 'sumber resmi: tidak ada · lembaga antariksa tak pernah mengimbau ini', stamp 'HOAKS'. The amber meter has drained to grey; 'bukti' still 0, now marked 'dicek'.",
           chat_frame(), {"card": [96, 400, 760, 380]}, label(476, 490, "sumber resmi: tidak ada", 46, colour="blue"), label(476, 560, "lembaga antariksa tak pernah", 34),
           label(476, 610, "mengimbau ini", 34), {"title": [476, 730], "text": "HOAKS", "size": 96}, meters(0.2, 0), label(860, 1140, "dicek", 34, colour="blue"), ILUS, {"cut": "kartu rangkuman naik"}),
    ],
    "s17": [
        fr(0.0, "Calm blue light. Three recap cards rise, each with its small picture: a smooth path, two meters, a magnifier.",
           {"card": [64, 260, 866, 190]}, label(580, 370, "diulang → makin gampang", 40), {"card": [64, 480, 866, 190]}, label(580, 590, "gampang dikira benar", 40),
           {"card": [64, 700, 866, 190]}, label(580, 810, "bukti ada di sumbernya", 40), {"magnifier": [170, 790, 50]}, {"move": [990, 900, 990, 600], "text": "naik"}),
        fr(0.4, "The poster line lands under the cards.",
           {"card": [64, 260, 866, 190]}, {"card": [64, 480, 866, 190]}, {"card": [64, 700, 866, 190]},
           {"title": [500, 1030], "text": "Sering dengar,\nbelum tentu benar.", "size": 92, "accent": "belum tentu benar."}),
        fr(1.0, "It holds, breathing; 'Cek sumbernya dulu.' in blue under it. It can loop to frame 0.",
           {"card": [64, 260, 866, 190]}, {"card": [64, 480, 866, 190]}, {"card": [64, 700, 866, 190]},
           {"title": [500, 1030], "text": "Sering dengar,\nbelum tentu benar.", "size": 92, "accent": "belum tentu benar."}, label(500, 1290, "Cek sumbernya dulu.", 60, colour="blue"), {"camera": "push"}, {"cut": "kembali ke awal"}),
    ],
}

# ── Babak 1: pertanyaan ──────────────────────────────────────────────────────────────────────────────────────
shot("s01", "hook", "ui",
     voice="[curious] Kenapa *hoaks* yang diulang-ulang di grup keluarga,",
     teaches="Asks the question while it happens: the same claim forwarded again and again into a family group.",
     screen="A generic group thread on a glass panel (x 64-930, y 240-960): header 'Grup Keluarga Besar · 38 anggota' with an icon of three initials; no real app's colours, icons or layout. Two ordinary messages first ('Selamat pagi, keluarga!', 'Arisan hari Minggu jadi, ya?'), then bubbles 770 px wide from different relatives, each tagged in amber '↪ diteruskan N×', each holding exactly the same words: 'Malam ini jam 00.30 matikan HP! Ada radiasi kosmik dari luar angkasa.' Each copy is set heavier and larger, its amber glow stronger. Under the thread (y 990-1200, on a dark plate so it reads over any picture) the 'terasa benar' meter in amber and a small 'ilustrasi, bukan ukuran'.",
     motion="Frame 0 holds the first copy and the second sliding in. Copies land on 'diulang-ulang' and 'keluarga': the thread scrolls up, a soft ring on each bubble, the meter steps up with each. Slow push.",
     carries="The thread and the meter.",
     transition="No cut: the fifth copy lands as the next line starts.",
     sound="The composed bed from frame 0. A soft notification pop with each copy.",
     check="The question is in the pop captions within 1.5 s. Every copy has exactly the same words. The meter rises with each copy and never falls. Nothing readable right of x 930.",
     facts=["f6", "f7"])

shot("s02", "hook", "chart",
     voice="lama-lama kok terasa *benar?*",
     teaches="The feeling of truth rises with every copy.",
     screen="The fifth, loudest copy (amber-lit, largest type) and the meter, pushed in on: 'terasa benar' high in amber.",
     motion="The fifth copy lands on 'lama-lama', the meter steps up; the camera pushes in; on 'terasa benar' the meter's label lights and the bar shines.",
     carries="Five identical copies and the high meter.",
     transition="The thread pulls back into a stack of the five copies.",
     sound="The fifth pop, a little bigger.",
     check="The meter is higher than in s01 and only rose on a copy landing.",
     facts=["f7"])

shot("s03", "hook", "compare",
     voice="Padahal isinya sama persis, nggak ada *bukti* baru.",
     teaches="The tension: nothing in the messages changed and no evidence was added, yet the feeling rose.",
     screen="The five copies as a stack of equal bubbles (760 x 118 px each, y 262 to 974), each with the full claim in two lines; '=' marks between them on the right. Under them the two meters: 'terasa benar' high in amber, 'bukti' empty with a blue 0.",
     motion="The thread pulls back into the stack in 0.5 s; the '=' marks pop down the stack on 'sama persis'; on 'bukti' the blue meter lights, its 0 pops, and it stays empty.",
     carries="The sentence of the claim.",
     transition="The stack folds into one sentence that flies into a head.",
     sound="A soft tick on the 0.",
     check="The '=' marks sit between the copies. 'bukti' reads 0 and is empty.",
     facts=["f7"])

# ── Babak 2: kenapa ──────────────────────────────────────────────────────────────────────────────────────────
shot("s04", "kenapa", "macro",
     voice="Yang berubah itu *otak* kamu.",
     teaches="Turns the eye from the message to the reader: the change is in the brain.",
     screen="A head in profile drawn in glass light fills the frame (x 140-880, y 380-1200). The claim's sentence flies in and sits inside it on two lines at y 620-760.",
     motion="The sentence flies in from the right; on 'otak' a warm amber light swells inside the head.",
     carries="The sentence inside the head.",
     transition="No cut: a reading light starts along the sentence.",
     sound="A short whoosh as the line flies in, before the voice.",
     check="The head is a drawing, not a brain scan. The line is readable.",
     facts=["f2"])

shot("s05", "kenapa", "diagram",
     voice="Tiap kali kamu baca kalimat yang sama,",
     teaches="The same sentence is read again and again.",
     screen="Inside the head, the sentence. A reading light runs along it: pass one slow, catching on each word; pass two quicker. A chip 'dibaca ke-N' and a bar 'usaha' (effort) that shrinks with each pass. A note 'ilustrasi'.",
     motion="Pass one crawls with small stops on each word; pass two runs in two thirds of the time; the 'usaha' bar steps down on its own frame after each pass.",
     carries="The sentence, the counter and the effort bar.",
     transition="The camera pushes in on the sentence.",
     sound="A faint tick when each pass ends.",
     check="Pass two is faster than pass one; 'usaha' only shrinks.",
     facts=["f2", "f7"])

shot("s06", "kenapa", "diagram",
     voice="otak makin *gampang* memprosesnya.",
     teaches="The mechanism: each reading goes more easily (processing fluency).",
     screen="Closer on the sentence (70 px). Passes three, four and five, each faster; the sentence warms to amber; 'usaha' a sliver.",
     motion="Three quick passes, the fourth on 'gampang', the last in one stroke; the glow of the sentence grows; the camera keeps pushing.",
     carries="The smooth line of reading.",
     transition="The camera dives along the reading line, which becomes the path through the grass.",
     sound="Faint ticks per pass; a soft whoosh on the dive.",
     check="Each pass is faster than the last. 'usaha' only shrinks.",
     facts=["f2", "f7"])

shot("s07", "kenapa", "object3d",
     voice="Kayak jalan setapak: makin sering dilewati, makin *mulus.*",
     teaches="An image for fluency: a path through grass gets smoother every time it is walked.",
     screen="A lit 3D field of grass blades seen from above at a slant fills the frame to the edges; a path runs from the bottom up to the horizon. A chip at the top: 'gambaran, bukan pindaian otak'. A counter 'dilewati N×'.",
     motion="A small amber light walks the path six times, faster each time; behind it the blades bend down further and the path widens and shines. The camera drifts forward.",
     carries="The smooth, bright path.",
     transition="The camera tilts up along the path.",
     sound="A soft swish for each pass, under the bed.",
     check="The chip saying it is a picture is readable. The counter matches the passes shown. The path only ever gets smoother.",
     facts=["f2", "f7"])

shot("s08", "kenapa", "diagram",
     voice="Masalahnya, otak kita salah kira:",
     teaches="The error: the easy path leads to the feeling 'true'.",
     screen="The field from higher up; at the far end of the smooth path an amber sign 'BENAR'. A blue chip 'salah kira' hangs on it.",
     motion="The camera tilts up the path; the sign rises at its end on 'Masalahnya'; 'salah kira' pops on its words.",
     carries="The sign and the path.",
     transition="No cut: the two words rise from the path.",
     sound="A low, uneasy note under the voice from the bed only.",
     check="The sign stands at the end of the path, in amber.",
     facts=["f2"])

shot("s09", "kenapa", "chart",
     voice="yang gampang dan akrab dianggap *benar.*",
     teaches="Easy and familiar are taken as true.",
     screen="Over the dimmed field: chips 'gampang' and 'akrab' rise off the path, then the line 'gampang + akrab = terasa benar' in metal type. The two meters return under it: amber steps up, blue 'bukti' still 0.",
     motion="The chips pop on their words and fly into the line; '= terasa benar' slams in on 'benar' and the amber meter steps up.",
     carries="The amber meter, near full, and the blue 0.",
     transition="The line lifts; the name of the effect comes up in its place.",
     sound="A low hit on 'benar'.",
     check="'bukti' is still 0. The meter rise is marked as an illustration.",
     facts=["f2", "f7"])

shot("s10", "kenapa", "type", caption=False,
     voice="Namanya efek kebenaran *ilusif.*",
     teaches="Names the effect so the viewer can look it up.",
     screen="Metal type, 140 px: 'efek / kebenaran / ilusif', 'ilusif' in amber. Under it: 'illusory truth effect' and 'Hasher, Goldstein & Toppino · 1977'. The lettering is the line, so the shot shows no pop caption.",
     motion="Each line slams in as its word is said; a sheen crosses it; the source line lands.",
     carries="The amber accent.",
     transition="The type lifts away as a news card slides up.",
     sound="A shimmer on the sheen.",
     check="The year is 1977 and matches the fact sheet.",
     facts=["f1", "f8"])

shot("s11", "bukti", "ui",
     voice="Ternyata, sekali lihat judul berita palsu aja,",
     teaches="One exposure is enough to start it (the set-up of the 2018 headline study).",
     screen="A generic news card (no outlet's look) x 64-930, y 360-920: a dark space picture, 'berita · baru pertama', the headline 'RADIASI KOSMIK MALAM INI: SEMUA HP HARUS DIMATIKAN'; a label 'contoh judul palsu'. After it is read once, 'dilihat 1×'.",
     motion="The card slides up; a quick reading light crosses the headline once on 'sekali'; 'dilihat 1×' pops on 'lihat'; on 'aja' the card drops away.",
     carries="The headline and its 'dilihat 1×'.",
     transition="It comes back, stacked over a new headline.",
     sound="A soft card slide.",
     check="The headline is labelled as an example of a fake one.",
     facts=["f3", "f6"])

shot("s12", "bukti", "compare",
     voice="waktu ketemu lagi, judulnya udah lebih terasa *benar.*",
     teaches="Seen before beats new: the familiar fake headline is judged more accurate than an unfamiliar one.",
     screen="Two cards stacked: the seen headline ('pernah dilihat 1×') and a new fake one ('baru pertama', 'AIR ES BIKIN LEMAK PERUT MEMBEKU'). Each with a small amber 'terasa benar' meter. The seen one fills a little further; a small bracket under its meter marks the part beyond where the new one stopped, 'sedikit lebih tinggi'. Source: 'Pennycook dkk. · 2018 · ilustrasi'. Illustrative levels: new about 15 %, seen about 25 %.",
     motion="The cards land on 'ketemu lagi'; on 'terasa benar' both meters fill, the seen one a step further, and a tick marks the gap.",
     carries="The amber meter idea, now on a person.",
     transition="Hard cut to a person in profile.",
     sound="A soft tick when the higher meter stops.",
     check="The difference is small, not dramatic: the film says 'lebih terasa benar', nothing more.",
     facts=["f3", "f7"])

shot("s13", "bukti", "macro",
     voice="Bahkan orang yang sebenarnya *tahu* jawabannya juga bisa kena.",
     teaches="Knowing the answer does not make you immune.",
     screen="A person in profile fills the left (x 140-530, y 520-1200). A thought card: 'samudra terbesar: Pasifik ✓' in blue. A false sentence arrives twice as chips: 'Atlantik terbesar'. A small amber meter by the person nudges up a little. Source: 'Fazio dkk. · 2015'.",
     motion="The thought card lights on 'tahu'; the chips slide in one after another; on 'kena' the meter nudges up while the knowledge card stays lit.",
     carries="The amber meter.",
     transition="Back to the thread: the meter grows into the big one.",
     sound="Two soft pops for the chips.",
     check="The knowledge card stays on screen the whole shot: the point is that it is there and the meter moves anyway.",
     facts=["f4", "f7"])

# ── Babak 3: cek ─────────────────────────────────────────────────────────────────────────────────────────────
shot("s14", "cek", "chart", hold=0.45,
     voice="[short pause] Jadi, sering dengar itu *bukan bukti.*",
     teaches="The turn: repetition is not evidence.",
     screen="The thread again with the loudest copy of the claim; under it 'sering dengar ≠ bukti' in metal type, the '≠' in amber; the two meters: amber at about 60 %, blue at 0.",
     motion="The camera pulls back to the thread; on 'bukan bukti' a hit, the blue 0 flashes, the line slams in.",
     carries="The claim's bubble and the meters.",
     transition="No cut: two buttons rise under the bubble.",
     sound="THE TURN: a deep hit on 'bukan bukti'.",
     check="The blue meter is at 0. '≠' is readable.",
     facts=["f5", "f7"])

shot("s15", "cek", "ui",
     voice="Makanya, sebelum kamu terusin,",
     teaches="The moment that matters: before forwarding.",
     screen="Under the claim two buttons: '↪ terusin' (grey) and 'cek sumber' (calm blue, with a magnifier). A finger comes in, hovers over 'terusin' on the word, then slides to 'cek sumber'.",
     motion="The buttons rise on 'Makanya'; the finger arrives on 'sebelum' and hovers on 'terusin'; then it moves.",
     carries="The finger over 'cek sumber'.",
     transition="No cut: the finger taps 'cek sumber' as the next line starts.",
     sound="The bed thins out.",
     check="Both buttons are inside the safe area; the finger never covers the claim's words.",
     facts=["f5"])

shot("s16", "cek", "ui", hold=1.0,
     voice="*cek dulu sumbernya.*",
     teaches="The habit that protects you: check the source, and the claim falls apart.",
     screen="The tap: a blue ring on 'cek sumber', a blue scan down the bubble, the claim cracks into two pieces that fall. A blue result card: 'sumber resmi: tidak ada · lembaga antariksa tak pernah mengimbau ini' and a stamp 'HOAKS'. The amber meter drains toward grey; 'bukti' still reads 0, now marked 'dicek'. The stage turns calm blue.",
     motion="The tap on 'cek'; the scan sweeps; the crack runs on 'sumbernya'; the pieces fall; the result card lands and the stamp hits after the line. The take is held open a second after the line so the result can be read.",
     carries="The calm blue light.",
     transition="The thread sinks; the recap cards rise.",
     sound="A click on the tap, a glassy crack, and THE PAYOFF hit on the stamp.",
     check="The tap is on 'cek'. The result card matches the fact sheet (the claim is a known hoax).",
     facts=["f5", "f6"])

shot("s17", "recap", "recap", 3.2,
     teaches="The ideas in one frame, and the line to remember.",
     screen="Calm blue light. Three glass cards (866 px wide, y 260, 480, 700), each with a small picture: a smooth path 'Diulang → makin gampang diproses'; two meters 'Gampang & akrab dikira benar'; a magnifier 'Bukti ada di sumbernya'. Below: the poster 'Sering dengar, / belum tentu benar.' and 'Cek sumbernya dulu.' in blue.",
     motion="Cards rise one after another, the poster slams in, a sheen; then it holds two seconds with a 3 percent push.",
     transition="The film ends here; it can loop to frame 0.",
     sound="A soft whoosh as the cards rise, a low impact under the poster; the bed resolves.",
     check="The poster is fully readable for at least two seconds. Nothing outside the safe area.",
     facts=["f2", "f5"])

duration = shots[-1]["end"]

storyboard = {
    "title": "Kenapa hoaks yang diulang-ulang lama-lama terasa benar?",
    "question": "Kenapa hoaks yang diulang-ulang di grup keluarga, lama-lama kok terasa benar?",
    "audience": "Orang Indonesia di grup chat keluarga dan warga, dari remaja sampai orang tua. Mereka sering menerima pesan berantai yang sama berkali-kali, tahu kata 'hoaks', tapi belum tahu kenapa pesan yang diulang terasa makin benar.",
    "promise": "Mendengar klaim yang sama lagi bikin otak lebih gampang memprosesnya, dan otak mengira 'gampang dan akrab' itu 'benar'. Ini kena juga ke orang yang sebenarnya tahu. Jadi sering dengar bukan bukti: cek sumbernya dulu sebelum meneruskan.",
    "language": "id",
    "format": "1080x1920",
    "captions": "pop",
    "duration": round(duration, 3),
    "fps": 60,
    "voice": {"voice_id": "1ijzBXcD3AIVH8RGMcQd", "name": "Jefri", "model": "eleven_v4", "language": "id"},
    "look": {
        "accent": "#ffb02e",
        "accent2": "#5aa9ff",
        "mood": "A dark graphite stage. Warning amber is the feeling of truth: each copy of the claim, the 'terasa benar' meter, the trodden path. Calm blue is checking: the 'bukti' meter, the 'cek sumber' button, the result. The stage light is amber and grows warmer through the repeats, dims for the explanation, and turns calm blue at the tap.",
    },
    "music": {
        "track": "Composed for this film (ElevenLabs Music, kit/audio/music.mjs)",
        "bpm": 84,
        "start": 0,
        "note": "A bed made to the film's length after the take: an uneasy pulse that builds with the repeats, clears at the check. The cuts follow the take, not a beat.",
    },
    "facts": [
        {"id": "f1", "claim": "The effect was first shown by Hasher, Goldstein and Toppino in 1977: people rated plausible statements (true and false) on three sessions two weeks apart; statements that were repeated across sessions were judged more valid each time, unrepeated ones were not. It is now called the illusory truth effect.",
         "source": "Hasher, L., Goldstein, D., & Toppino, T. (1977). Frequency and the conference of referential validity. Journal of Verbal Learning and Verbal Behavior, 16, 107-112 (abstract read at hasherlab.psych.utoronto.ca; full text not opened)."},
        {"id": "f2", "claim": "The leading explanation is processing fluency: a repeated statement is easier to process, and that ease is taken as a cue for truth. Making a statement easier to read without repeating it (higher colour contrast) also raises judged truth, a little. A meta-analysis of 70 studies found a medium-sized repetition effect (d about 0.49). Simplification: memory-based and 'referential' accounts also exist and fluency is not the whole story; the film says the brain processes it more easily and takes that for truth, which all accounts share. The path through the grass is a picture of this, not anatomy, and says so on screen.",
         "source": "Reber, R., & Schwarz, N. (1999). Effects of perceptual fluency on judgments of truth. Consciousness and Cognition, 8, 338-342; Dechêne, A., Stahl, C., Hansen, J., & Wänke, M. (2010). The truth about the truth: a meta-analytic review of the truth effect. Personality and Social Psychology Review, 14, 238-257; Unkelbach, C., & Rom, S. C. (2017), Cognition 160. Read as search summaries, not in full."},
        {"id": "f3", "claim": "A single prior exposure to a fake news headline raised how accurate people later judged it, compared with headlines they had not seen; the effect held a week later and even when the headline carried a 'disputed by fact-checkers' warning. It did not work for statements that are plainly impossible. The film says only that the headline 'lebih terasa benar' (feels more true); it gives no size, and the meters in s09 are an illustration.",
         "source": "Pennycook, G., Cannon, T. D., & Rand, D. G. (2018). Prior exposure increases perceived accuracy of fake news. Journal of Experimental Psychology: General, 147(12), 1865-1880 (abstract and summaries; the full text could not be opened from here)."},
        {"id": "f4", "claim": "Knowing the right answer does not protect against the effect: repeating a false statement such as 'The Atlantic Ocean is the largest ocean on Earth' raised its judged truth even among people who, tested separately, knew the answer (the Pacific). The authors call it knowledge neglect. The film shows a small nudge, not belief.",
         "source": "Fazio, L. K., Brashier, N. M., Payne, B. K., & Marsh, E. J. (2015). Knowledge does not protect against illusory truth. Journal of Experimental Psychology: General, 144(5), 993-1002 (abstract, PubMed 26301795)."},
        {"id": "f5", "claim": "Hearing a claim often is not evidence for it. Focusing on accuracy when first meeting a claim reduces the effect: people who first rated statements for truth showed no illusory truth effect, those who rated them for interest did. The film's habit (check the source before forwarding) is advice built on this, not a measured cure.",
         "source": "Brashier, N. M., Eliseev, E. D., & Marsh, E. J. (2020). An initial accuracy focus prevents illusory truth. Cognition, 194, 104054 (abstract); Calvillo & Smelter (2020), Cognitive Research: Principles and Implications."},
        {"id": "f6", "claim": "The example claim (turn off your phone tonight because of cosmic radiation from space) is a real chain-message hoax that has circulated since at least 2017; LAPAN and NASA made no such warning. The time '00.30' is from versions of the message. The fake headline in s08 is the same hoax set as a headline; the second headline in s09 is invented for the comparison and labelled as an example.",
         "source": "Kompas.com Cek Fakta, '[HOAKS] Imbauan Matikan Ponsel dan Laptop karena Radiasi Kosmik', 24 August 2022 (read as a search summary)."},
        {"id": "f7", "claim": "The meters, the reading passes and the path are illustrations, not measurements: they show the direction (feeling of truth up, evidence unchanged), not a size. Each is labelled 'ilustrasi' or 'gambaran' on screen. The 'terasa benar' meter rises by less with each repeat, which is the shape reported in later work, but its values are not data.",
         "source": "The film's own drawing; direction from f1 to f4."},
        {"id": "f8", "claim": "'Efek kebenaran ilusif' is an Indonesian rendering of 'illusory truth effect', the name used in the research literature; the English name is shown beside it.",
         "source": "Term as used in f2, f4, f5."},
    ],
    "acts": [
        {"id": "hook", "title": "Pertanyaan", "goal": "Ask the question while it happens: the same claim forwarded again and again, the feeling of truth rising, the evidence not.", "rail": False},
        {"id": "kenapa", "title": "Kenapa", "goal": "The mechanism: repetition makes it easier to process, and easy is mistaken for true. Name it.", "rail": False},
        {"id": "bukti", "title": "Bukti", "goal": "It takes only one exposure, and it works even on people who know better.", "rail": False},
        {"id": "cek", "title": "Cek", "goal": "Repetition is not evidence: check the source before forwarding, and the claim cracks.", "rail": False},
        {"id": "recap", "title": "Rangkuman", "goal": "The ideas in one frame and the line to remember.", "rail": False},
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
