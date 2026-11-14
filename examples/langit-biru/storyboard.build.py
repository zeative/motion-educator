"""Writes storyboard.json for "Kenapa langit berwarna biru?".

Shot times are counted in beats of the music (86 BPM), so every cut sits on the grid; this script only does that
arithmetic. The storyboard itself is the JSON it writes: edit the shots here, run it, then run the storyboard check.
"""
import json
from pathlib import Path

BEAT = 60 / 86
shots = []


def shot(id, act, type, beats, **fields):
    start = shots[-1]["_b1"] if shots else 0
    end = start + beats
    fields.pop("layout", None)
    shots.append({"id": id, "act": act, "type": type, "start": round(start * BEAT, 3), "end": round(end * BEAT, 3), "_b1": end, **fields, "frames": FRAMES[id]})


def fr(at, note, *draw):
    return {"at": at, "note": note, "draw": list(draw)}


# The Rayleigh curve in the chart's own coordinates: x from 400 to 700 nm, y the strength relative to red.
def cx(nm):
    return 320 + (nm - 400) / 300 * 1320


def cy(nm):
    return 770 - ((700 / nm) ** 4 / 9.6) * 560


CURVE = [[round(cx(nm), 1), round(cy(nm), 1)] for nm in range(400, 701, 20)]
AXES = {"axes": [320, 770, 1340, 590], "xlabel": "panjang gelombang (nm)", "ylabel": "kekuatan hamburan"}
STRIP = {"strip": [320, 790, 1320, 30]}
CLUSTER = {"molecules": [740, 280, 440, 480, 14], "seed": 9, "size": 10}
EARTH_BIG = {"planet": [960, 820, 500]}

# Every shot drawn: how it starts, what happens, how it ends. Coordinates are the real frame's (1920 x 1080).
FRAMES = {
    "s01": [
        fr(0.0, "Frame 0 sudah jadi: Bumi di kanan, sisi siang menghadap Matahari di kiri, cincin udara tipis.",
           {"glow": [1410, 540, 520], "colour": "blue"}, {"planet": [1410, 540, 350]}, {"label": [560, 560], "text": "(judul belum masuk)", "size": 40, "colour": "white"}),
        fr(0.45, "Judul masuk huruf demi huruf dari kiri; Bumi berputar pelan.",
           {"glow": [1410, 540, 520], "colour": "blue"}, {"planet": [1410, 540, 350]}, {"title": [104, 430], "text": "Kenapa langit\nberwarna biru?", "size": 132, "align": "start", "accent": "biru?"}, {"camera": "orbit"}),
        fr(1.0, "Judul terangkat dan memudar; kamera mulai mendorong ke tepi Bumi.",
           {"planet": [1410, 540, 350]}, {"title": [104, 380], "text": "Kenapa langit\nberwarna biru?", "size": 132, "align": "start", "accent": "biru?"}, {"move": [520, 300, 520, 170], "text": "judul naik"}, {"camera": "push"}, {"cut": "tanpa potongan"}),
    ],
    "s02": [
        fr(0.0, "Kamera melaju ke tepi Bumi: bola membesar dan turun keluar bingkai.",
           {"planet": [1180, 1100, 760]}, {"camera": "push"}),
        fr(0.6, "Lengkung Bumi memenuhi bingkai; pita udara biru tipis di atasnya, label menunjuk ke pita.",
           {"planet": [1100, 1850, 1450]}, {"line": [1250, 300, 1180, 396]}, {"dot": [1180, 398, 9], "colour": "blue"}, {"chip": [1240, 236], "text": "atmosfer"}, {"glow": [700, 330, 300], "colour": "blue"}),
        fr(1.0, "Cahaya dari kiri menguat: sinar putih mulai masuk bingkai.",
           {"planet": [1100, 1850, 1450]}, {"chip": [1240, 236], "text": "atmosfer"}, {"beam": [0, 330, 520, 70]}, {"move": [80, 250, 480, 250], "text": "sinar masuk"}, {"cut": "kamera mundur"}),
    ],
    "s03": [
        fr(0.0, "Kamera mundur cepat: Bumi mengecil ke kanan, ruang di kiri terbuka untuk sinar.",
           {"planet": [1480, 600, 420]}, {"camera": "pull"}),
        fr(0.55, "Berkas sinar putih tumbuh dari kiri menuju Bumi; label naik di atasnya.",
           {"glow": [120, 540, 380], "colour": "orange"}, {"beam": [0, 540, 1010, 96]}, {"planet": [1530, 540, 230]}, {"chip": [300, 356], "text": "cahaya Matahari"}, {"move": [200, 690, 900, 690], "text": "sinar tumbuh"}),
        fr(1.0, "Sinar menyentuh Bumi (hit lembut), lalu berkas mulai membesar memenuhi layar.",
           {"glow": [120, 540, 380], "colour": "orange"}, {"beam": [0, 540, 1310, 96]}, {"planet": [1530, 540, 230]}, {"chip": [300, 356], "text": "cahaya Matahari"}, {"scatter": [1300, 540, 6, 40, 110], "colour": "orange"}, {"cut": "zoom ke dalam sinar"}),
    ],
    "s04": [
        fr(0.0, "Berkas sinar menjadi kilatan putih yang memenuhi layar; baris pertama menghentak masuk.",
           {"beam": [0, 540, 1920, 420]}, {"title": [960, 470], "text": "Jadi, dari mana", "size": 160}, {"camera": "push"}),
        fr(1.0, "Dua baris terbaca penuh di atas sinar tipis; kilau menyapu kata beraksen.",
           {"beam": [0, 548, 1920, 44]}, {"title": [960, 470], "text": "Jadi, dari mana\nbirunya?", "size": 160, "accent": "birunya?"}, {"move": [1500, 300, 1500, 130], "text": "teks dilempar ke atas"}, {"cut": "whip vertikal"}),
    ],
    "s05": [
        fr(0.0, "Prisma naik dari bawah ke posisinya; sinar putih merambat ke arahnya.",
           {"beam": [80, 540, 420, 64]}, {"prism": [800, 540, 170]}, {"move": [800, 980, 800, 760], "text": "prisma naik"}, {"camera": "up"}),
        fr(0.5, "Sinar menyentuh prisma; kipas warna mulai membuka dari merah.",
           {"beam": [80, 540, 760, 64]}, {"prism": [800, 540, 170]}, {"fan": [905, 555, 1790, 628, 760], "n": 4}, {"move": [1300, 540, 1700, 540], "text": "membuka"}),
        fr(1.0, "Tujuh pita terbuka penuh, semuanya membelok ke arah alas prisma: merah paling sedikit, ungu paling banyak.",
           {"beam": [80, 540, 760, 64]}, {"prism": [800, 540, 170]}, {"fan": [905, 555, 1790, 628, 892]}, {"label": [1820, 606], "text": "merah", "size": 36, "align": "end", "colour": "red"}, {"label": [1820, 950], "text": "ungu", "size": 36, "align": "end", "colour": "violet"}, {"camera": "push"}, {"cut": "pita meluruskan diri"}),
    ],
    "s06": [
        fr(0.0, "Pita-pita meluruskan diri menjadi tujuh garis sejajar; prisma memudar.",
           *[{"line": [150, 190 + i * 100, 1770, 190 + i * 100], "colour": c, "width": 8} for i, c in enumerate(["red", "orange", "yellow", "green", "blue", "#5350c4", "violet"])], {"move": [960, 120, 960, 60], "text": "garis lurus"}),
        fr(0.55, "Garis mulai bergelombang dari kiri ke kanan: atas renggang, bawah rapat.",
           *[{"wave": [150, 1770, 190 + i * 100, 26, nm * 0.42], "colour": c} for i, (c, nm) in enumerate([("red", 700), ("orange", 620), ("yellow", 580), ("green", 530), ("blue", 450), ("#5350c4", 425), ("violet", 400)])], {"move": [300, 880, 1500, 880], "text": "merambat"}),
        fr(1.0, "Lima gelombang meredup; merah dan biru bersiap membesar.",
           *[{"wave": [150, 1770, 190 + i * 100, 26, nm * 0.42], "colour": c, "faint": i not in (0, 4)} for i, (c, nm) in enumerate([("red", 700), ("orange", 620), ("yellow", 580), ("green", 530), ("blue", 450), ("#5350c4", 425), ("violet", 400)])], {"cut": "merah & biru membesar"}),
    ],
    "s07": [
        fr(0.0, "Dua gelombang besar: merah di atas, biru di bawah, terus merambat.",
           {"wave": [150, 1770, 320, 84, 630], "colour": "red", "width": 10}, {"wave": [150, 1770, 650, 84, 405], "colour": "blue", "width": 10}, {"move": [300, 500, 900, 500], "text": "merambat"}),
        fr(0.6, "Kurung ukur membuka di satu panjang gelombang; angkanya langsung tampil pada nilainya.",
           {"wave": [150, 1770, 320, 84, 630], "colour": "red", "width": 10}, {"bracket": [622, 1252, 190], "text": "700 nm", "colour": "red"},
           {"wave": [150, 1770, 650, 84, 405], "colour": "blue", "width": 10}, {"bracket": [656, 1061, 800], "text": "450 nm", "colour": "blue"}),
        fr(1.0, "Kamera menukik ke ruang di antara gelombang, menuju skala molekul.",
           {"wave": [150, 1770, 320, 84, 630], "colour": "red", "width": 10}, {"bracket": [622, 1252, 190], "text": "700 nm", "colour": "red"},
           {"wave": [150, 1770, 650, 84, 405], "colour": "blue", "width": 10}, {"bracket": [656, 1061, 800], "text": "450 nm", "colour": "blue"}, {"camera": "push"}, {"cut": "zoom ke udara"}),
    ],
    "s08": [
        fr(0.0, "Masuk ke udara: molekul dua-atom bermunculan di kedalaman berbeda.",
           {"molecules": [120, 150, 1680, 660, 22], "seed": 3}, {"camera": "push"}),
        fr(0.6, "Puluhan molekul melayang dan berputar pelan; dua chip komposisi udara muncul.",
           {"molecules": [120, 150, 1680, 660, 44], "seed": 3}, {"chip": [1320, 170], "text": "N₂  78%"}, {"chip": [1320, 262], "text": "O₂  21%"}, {"move": [400, 860, 700, 830], "text": "melayang"}),
        fr(1.0, "Molekul lain memudar; satu molekul di tengah tetap sebagai pembanding skala.",
           {"molecules": [120, 150, 1680, 660, 10], "seed": 8}, {"molecule": [960, 500, 44]}, {"chip": [1320, 170], "text": "N₂  78%"}, {"chip": [1320, 262], "text": "O₂  21%"}, {"cut": "tinggal satu molekul"}),
    ],
    "s09": [
        fr(0.0, "Gelombang biru besar masuk dari kiri; molekul menyusut jadi titik di bawah puncaknya.",
           {"wave": [140, 1100, 400, 112, 620], "colour": "blue", "width": 10}, {"dot": [960, 512, 8]}, {"move": [200, 250, 1000, 250], "text": "gelombang masuk"}),
        fr(0.55, "Kaca pembesar membuka di atas titik itu dan memperlihatkan molekulnya.",
           {"wave": [140, 1780, 400, 112, 620], "colour": "blue", "width": 10}, {"bracket": [760, 1380, 232], "text": "450 nm", "colour": "blue"}, {"dot": [960, 512, 8]}, {"line": [960, 520, 960, 560]}, {"magnifier": [960, 690, 130]}, {"molecule": [960, 690, 40]}, {"chip": [1150, 660], "text": "molekul ≈ 0,3 nm"}),
        fr(1.0, "Angka pembanding 1.500× masuk dan bertahan.",
           {"wave": [140, 1780, 400, 112, 620], "colour": "blue", "width": 10}, {"bracket": [760, 1380, 232], "text": "450 nm", "colour": "blue"}, {"magnifier": [960, 690, 130]}, {"molecule": [960, 690, 40]}, {"chip": [1150, 660], "text": "molekul ≈ 0,3 nm"}, {"number": [1560, 440], "text": "1.500×"}, {"label": [1560, 500], "text": "lebih kecil", "size": 40}, {"cut": "molekul berkumpul"}),
    ],
    "s10": [
        fr(0.0, "Molekul berkumpul menjadi gugus di tengah; sinar merah bergelombang datang dari kiri.",
           CLUSTER, {"wave": [80, 700, 520, 38, 300], "colour": "red", "width": 9}, {"chip": [120, 236], "text": "merah · 700 nm"}, {"move": [200, 640, 640, 640], "text": "sinar merah"}),
        fr(0.6, "Sinar menembus gugus; hanya sedikit panah hambur kecil yang pucat.",
           CLUSTER, {"wave": [80, 1840, 520, 38, 300], "colour": "red", "width": 9}, {"chip": [120, 236], "text": "merah · 700 nm"}, {"scatter": [900, 400, 3, 30, 80], "colour": "red", "width": 3}, {"scatter": [1040, 640, 3, 30, 80], "colour": "red", "width": 3}, {"panel": [1340, 760, 470, 70], "rows": ["terhambur  ▮▯▯▯▯▯▯"]}),
        fr(1.0, "Sinar merah keluar hampir utuh di kanan; gugus molekul tetap untuk percobaan berikutnya.",
           CLUSTER, {"wave": [1200, 1840, 520, 36, 300], "colour": "red", "width": 9}, {"chip": [120, 236], "text": "merah · 700 nm"}, {"move": [1500, 430, 1820, 430], "text": "lolos"}, {"panel": [1340, 760, 470, 70], "rows": ["terhambur  ▮▯▯▯▯▯▯"]}, {"cut": "sinar biru masuk"}),
    ],
    "s11": [
        fr(0.0, "Sinar biru masuk di jalur yang sama; label berganti.",
           CLUSTER, {"wave": [80, 760, 520, 38, 190], "colour": "blue", "width": 9}, {"chip": [120, 236], "text": "biru · 450 nm"}, {"move": [200, 640, 640, 640], "text": "sinar biru"}),
        fr(0.55, "Tiap molekul menyala dan memancarkan panah biru ke segala arah.",
           CLUSTER, {"wave": [80, 1180, 520, 38, 190], "colour": "blue", "width": 9}, {"chip": [120, 236], "text": "biru · 450 nm"},
           {"scatter": [820, 360, 10, 34, 150]}, {"scatter": [980, 520, 10, 34, 170]}, {"scatter": [1090, 700, 10, 34, 150]}, {"scatter": [860, 660, 8, 34, 130]}, {"glow": [960, 520, 420], "colour": "blue"}),
        fr(1.0, "Sinar yang keluar jelas menipis; meter melonjak; ledakan panah memenuhi layar.",
           CLUSTER, {"wave": [80, 1180, 520, 38, 190], "colour": "blue", "width": 9}, {"wave": [1180, 1840, 520, 12, 190], "colour": "blue", "width": 5},
           {"scatter": [820, 360, 12, 34, 260]}, {"scatter": [980, 520, 12, 34, 300]}, {"scatter": [1090, 700, 12, 34, 260]}, {"panel": [1340, 760, 470, 70], "rows": ["terhambur  ▮▮▮▮▮▮▯"]}, {"cut": "kilatan biru"}),
    ],
    "s12": [
        fr(0.0, "Kilatan mereda; 'namanya' muncul kecil, judul menghentak tepat di ketukan.",
           {"scatter": [960, 520, 14, 300, 560]}, {"label": [960, 330], "text": "namanya", "size": 54}, {"title": [960, 560], "text": "Hamburan", "size": 176}, {"camera": "push"}),
        fr(1.0, "Nama lengkap terbaca; garis mikro naik; kilau menyapu.",
           {"label": [960, 330], "text": "namanya", "size": 54}, {"title": [960, 560], "text": "Hamburan Rayleigh", "size": 176, "accent": "Rayleigh"}, {"label": [960, 690], "text": "LORD RAYLEIGH — 1871", "size": 40}, {"move": [700, 800, 420, 320], "text": "mengecil ke kiri atas"}, {"cut": "jadi judul grafik"}),
    ],
    "s13": [
        fr(0.0, "Sumbu digambar dari titik asal; pita spektrum membuka di bawahnya.",
           AXES, STRIP, {"move": [360, 730, 900, 730], "text": "sumbu digambar"}),
        fr(0.55, "Kurva digambar dari kanan (merah) ke kiri (ungu): terasa menanjak.",
           AXES, STRIP, {"curve": CURVE[6:], "colour": "blue"}, {"move": [1500, 620, 900, 520], "text": "kurva naik"}),
        fr(1.0, "Kurva penuh; rumus masuk di kanan atas.",
           AXES, STRIP, {"curve": CURVE, "colour": "blue"}, {"title": [1400, 300], "text": "∝ 1 / λ⁴", "size": 110}, {"camera": "push"}, {"cut": "tanpa potongan"}),
    ],
    "s14": [
        fr(0.0, "Titik merah muncul di 700 nm dengan garis putus-putus ke sumbu.",
           AXES, STRIP, {"curve": CURVE, "colour": "blue"}, {"line": [1640, 770, 1640, 712], "dashed": True}, {"dot": [1640, 712, 16], "colour": "red"}, {"label": [1560, 680], "text": "1×", "size": 60, "colour": "red"}),
        fr(0.5, "Titik biru muncul di 450 nm; label 5,9× mulai masuk.",
           AXES, STRIP, {"curve": CURVE, "colour": "blue"}, {"line": [1640, 770, 1640, 712], "dashed": True}, {"dot": [1640, 712, 16], "colour": "red"}, {"label": [1560, 680], "text": "1×", "size": 60, "colour": "red"},
           {"line": [540, 770, 540, 428], "dashed": True}, {"dot": [540, 428, 18], "colour": "blue"}, {"number": [760, 400], "text": "5,9×", "size": 130}, {"move": [760, 440, 760, 330], "text": "naik masuk"}),
        fr(1.0, "5,9× bertahan; perhitungannya tampil di kanan.",
           AXES, STRIP, {"curve": CURVE, "colour": "blue"}, {"dot": [1640, 712, 16], "colour": "red"}, {"label": [1560, 680], "text": "1×", "size": 60, "colour": "red"},
           {"line": [540, 770, 540, 428], "dashed": True}, {"dot": [540, 428, 18], "colour": "blue"}, {"number": [770, 400], "text": "5,9×", "size": 150}, {"label": [770, 462], "text": "lebih kuat", "size": 40}, {"panel": [1130, 470, 520, 100], "rows": ["(700 / 450)⁴ ≈ 5,9"]}, {"cut": "titik biru jadi langit"}),
    ],
    "s15": [
        fr(0.0, "Langit masih gelap; cahaya biru mulai menyebar dari arah Matahari di kiri atas.",
           {"sun": [300, 220, 60]}, {"sky": [0, 300], "tone": "day"}, {"horizon": [860]}, {"person": [960, 800, 130]}, {"move": [420, 300, 900, 420], "text": "biru menyebar"}),
        fr(0.55, "Seluruh kubah langit biru, lebih pucat di cakrawala; panah biru mulai tumbuh.",
           {"sky": [0, 860], "tone": "day"}, {"sun": [300, 220, 60]}, {"horizon": [860]}, {"person": [960, 800, 130]},
           {"arrow": [300, 400, 780, 700], "colour": "blue"}, {"arrow": [960, 160, 960, 620], "colour": "blue"}, {"arrow": [1620, 400, 1140, 700], "colour": "blue"}, {"camera": "up"}),
        fr(1.0, "Panah biru dari seluruh penjuru menuju pengamat.",
           {"sky": [0, 860], "tone": "day"}, {"sun": [300, 220, 60]}, {"horizon": [860]}, {"person": [960, 800, 130]},
           *[{"arrow": [x, y, 960 + (x - 960) * 0.2, 690], "colour": "blue"} for x, y in [(180, 330), (420, 210), (700, 150), (960, 130), (1220, 150), (1500, 210), (1740, 330)]], {"cut": "langit jadi pita spektrum"}),
    ],
    "s16": [
        fr(0.0, "Kubah langit memipih menjadi pita spektrum lebar di tengah layar.",
           {"strip": [200, 600, 1520, 70]}, {"move": [960, 240, 960, 560], "text": "memipih"}),
        fr(0.5, "Batang biru naik, lalu batang ungu naik lebih tinggi.",
           {"strip": [200, 600, 1520, 70]}, {"bar": [420, 586, 104, 232], "colour": "blue", "label": ""}, {"bar": [208, 586, 104, 190], "colour": "violet", "label": ""}, {"label": [472, 730], "text": "biru", "size": 40}, {"label": [260, 730], "text": "ungu", "size": 40}, {"move": [260, 380, 260, 240], "text": "naik"}),
        fr(1.0, "Ungu melampaui biru; tanda tanya memantul di atasnya.",
           {"strip": [200, 600, 1520, 70]}, {"bar": [420, 586, 104, 232], "colour": "blue", "label": ""}, {"bar": [208, 586, 104, 372], "colour": "violet", "label": ""}, {"label": [472, 730], "text": "biru", "size": 40}, {"label": [260, 730], "text": "ungu", "size": 40}, {"number": [262, 170], "text": "?", "size": 150, "colour": "violet"}, {"cut": "pita naik, panel masuk"}),
    ],
    "s17": [
        fr(0.0, "Pita naik ke atas; panel alasan naik dari bawah dengan miring 3D.",
           {"strip": [260, 130, 1400, 56]}, {"panel": [200, 430, 1090, 390], "rows": ["", "", ""]}, {"move": [740, 960, 740, 800], "text": "panel naik"}),
        fr(0.55, "Baris alasan muncul berurutan; tiap baris meredupkan bagian ungu di pita.",
           {"strip": [260, 130, 1400, 56]}, {"panel": [200, 330, 1090, 390], "rows": ["1  Matahari memancarkan lebih sedikit ungu", "2  Sebagian diserap di atmosfer atas", ""]}, {"line": [262, 200, 440, 200], "dashed": True}),
        fr(1.0, "Tiga alasan lengkap; lingkaran 'yang kita lihat' terisi biru langit.",
           {"strip": [260, 130, 1400, 56]}, {"panel": [200, 330, 1090, 390], "rows": ["1  Matahari memancarkan lebih sedikit ungu", "2  Sebagian diserap di atmosfer atas", "3  Mata kita kurang peka pada ungu"]},
           {"dot": [1570, 512, 170], "colour": "blue"}, {"label": [1570, 760], "text": "yang kita lihat", "size": 40}, {"cut": "lingkaran jadi Bumi"}),
    ],
    "s18": [
        fr(0.0, "Lingkaran biru membesar menjadi Bumi 3D dengan lapisan udara yang dibesarkan.",
           EARTH_BIG, {"glow": [120, 540, 320], "colour": "orange"}, {"move": [1570, 512, 1100, 700], "text": "lingkaran → Bumi"}, {"camera": "pull"}),
        fr(0.45, "Jalur siang digambar pendek: sinar tegak lurus ke pengamat di bawah Matahari.",
           EARTH_BIG, {"line": [170, 820, 392, 820], "dashed": True}, {"line": [392, 820, 460, 820], "colour": "orange", "width": 16}, {"dot": [460, 820, 12], "colour": "white"}, {"chip": [150, 716], "text": "siang · 1×"}),
        fr(1.0, "Jalur senja digambar panjang menyerong menembus udara; label ≈ 38× masuk.",
           EARTH_BIG, {"line": [170, 820, 392, 820], "dashed": True}, {"line": [392, 820, 460, 820], "colour": "orange", "width": 16}, {"dot": [460, 820, 12], "colour": "white"}, {"chip": [150, 716], "text": "siang · 1×"},
           {"line": [170, 320, 686, 320], "dashed": True}, {"line": [686, 320, 960, 320], "colour": "orange", "width": 16}, {"dot": [960, 320, 12], "colour": "white"}, {"chip": [1010, 222], "text": "senja · ≈ 38×"}, {"label": [1640, 830], "text": "gambar tidak berskala", "size": 34, "colour": "white"}, {"cut": "jalur diluruskan"}),
    ],
    "s19": [
        fr(0.0, "Jalur senja diluruskan menjadi garis panjang melintasi barisan molekul; sinar putih masuk.",
           {"molecules": [190, 430, 1560, 140, 17], "seed": 12, "size": 6}, {"beam": [80, 500, 520, 44]}, {"move": [200, 380, 700, 380], "text": "sinar merambat"}),
        fr(0.5, "Di tengah jalan sinar menguning; panah biru terlontar keluar ke atas dan bawah.",
           {"molecules": [190, 430, 1560, 140, 17], "seed": 12, "size": 6}, {"beam": [80, 500, 1100, 44]}, *[{"arrow": [x, 440, x - 30, 290], "colour": "blue"} for x in (320, 520, 720)], *[{"arrow": [x, 560, x + 30, 710], "colour": "blue"} for x in (420, 620, 860)],
           {"label": [1000, 440], "text": "kuning", "size": 38, "colour": "yellow"}, {"panel": [600, 770, 720, 70], "rows": ["sisa biru  ▮▮▮▯▯▯▯"]}),
        fr(1.0, "Ujung kanan berkas jingga-merah; batang 'sisa biru' hampir kosong.",
           {"molecules": [190, 430, 1560, 140, 17], "seed": 12, "size": 6}, {"beam": [80, 500, 1840, 44]}, *[{"arrow": [x, 440, x - 30, 290], "colour": "blue"} for x in (320, 520, 720, 960)],
           {"label": [1000, 440], "text": "kuning", "size": 38, "colour": "yellow"}, {"label": [1400, 440], "text": "jingga", "size": 38, "colour": "orange"}, {"label": [1740, 440], "text": "merah", "size": 38, "colour": "red"}, {"panel": [600, 770, 720, 70], "rows": ["sisa biru  ▮▯▯▯▯▯▯"]}, {"cut": "ujung jadi Matahari"}),
    ],
    "s20": [
        fr(0.0, "Ujung berkas membesar menjadi cakram Matahari rendah di atas cakrawala.",
           {"sky": [0, 860], "tone": "dusk"}, {"sun": [760, 640, 70]}, {"horizon": [860]}, {"person": [960, 800, 130]}, {"move": [1700, 500, 900, 620], "text": "jadi Matahari"}),
        fr(1.0, "Langit senja penuh: biru tua di atas, jingga dan merah di cakrawala; Matahari turun pelan.",
           {"sky": [0, 860], "tone": "dusk"}, {"sun": [760, 720, 70]}, {"horizon": [860]}, {"person": [960, 800, 130]}, {"label": [1500, 160], "text": "biru tua", "size": 40, "colour": "blue"}, {"label": [1500, 660], "text": "jingga · merah", "size": 40, "colour": "orange"}, {"move": [760, 520, 760, 620], "text": "turun"}, {"camera": "pull"}, {"cut": "langit meredup"}),
    ],
    "s21": [
        fr(0.0, "Judul kecil masuk; kartu pertama naik dengan miring 3D.",
           {"label": [960, 160], "text": "Jadi, kenapa langit biru?", "size": 58}, {"card": [130, 236, 520, 540], "label": "1"}, {"prism": [390, 420, 60]}, {"move": [390, 980, 390, 800], "text": "kartu naik"}),
        fr(0.4, "Tiga kartu sejajar; gambar mini di tiap kartu bergerak sedikit.",
           {"label": [960, 160], "text": "Jadi, kenapa langit biru?", "size": 58},
           {"card": [130, 236, 520, 540], "label": "putih = semua warna"}, {"prism": [330, 400, 56]}, {"fan": [372, 400, 600, 320, 480], "n": 5},
           {"card": [700, 236, 520, 540], "label": "biru terhambur ≈ 5,9×"}, {"molecule": [960, 410, 26]}, {"scatter": [960, 410, 8, 50, 130]},
           {"card": [1270, 236, 520, 540], "label": "senja: tinggal jingga"}, {"sun": [1530, 420, 46]}, {"line": [1340, 480, 1720, 480]}),
        fr(1.0, "Kilau menyapu tiap kartu bergantian; lalu ketiganya mengecil ke satu titik di tengah.",
           {"label": [960, 160], "text": "Jadi, kenapa langit biru?", "size": 58},
           {"card": [130, 236, 520, 540], "label": "putih = semua warna"}, {"prism": [330, 400, 56]}, {"fan": [372, 400, 600, 320, 480], "n": 5},
           {"card": [700, 236, 520, 540], "label": "biru terhambur ≈ 5,9×"}, {"molecule": [960, 410, 26]}, {"scatter": [960, 410, 8, 50, 130]},
           {"card": [1270, 236, 520, 540], "label": "senja: tinggal jingga"}, {"sun": [1530, 420, 46]}, {"line": [1340, 480, 1720, 480]},
           {"move": [390, 840, 900, 620], "text": ""}, {"move": [1530, 840, 1020, 620], "text": "ke satu titik"}, {"cut": "Bumi muncul dari titik"}),
    ],
    "s22": [
        fr(0.0, "Bumi mendarat dari besar ke kecil dengan putaran, di atas tengah.",
           {"glow": [960, 290, 360], "colour": "blue"}, {"planet": [960, 330, 300]}, {"move": [1360, 560, 1120, 380], "text": "mengecil"}, {"camera": "pull"}),
        fr(0.4, "Kalimat penutup masuk huruf demi huruf di bawah Bumi.",
           {"glow": [960, 290, 300], "colour": "blue"}, {"planet": [960, 290, 160]}, {"title": [960, 620], "text": "Langit biru =", "size": 138}),
        fr(1.0, "Frame terakhir = poster: Bumi, kalimat lengkap, garis mikro. Tahan dengan gerak halus.",
           {"glow": [960, 290, 300], "colour": "blue"}, {"planet": [960, 290, 160]}, {"title": [960, 620], "text": "Langit biru =\nhamburan Rayleigh.", "size": 138, "accent": "hamburan Rayleigh."}, {"label": [960, 930], "text": "MOTION EDUCATOR — FILM UJI", "size": 36, "colour": "white"}),
    ],
}

# ── Babak 0: pertanyaan ────────────────────────────────────────────────────
shot("s01", "tanya", "object3d", 4,
     teaches="Memancing rasa ingin tahu: pertanyaan yang semua orang pernah punya, diajukan di atas gambar Bumi dari angkasa.",
     screen="Bumi 3D dari angkasa di sisi kanan bingkai: sisi siang menghadap kiri, sisi malam gelap, garis tipis atmosfer biru di tepinya. Judul besar dua baris di kiri: 'Kenapa langit / berwarna biru?' dengan kata 'biru' berwarna aksen biru.",
     motion="Bumi berputar pelan dan kamera mengorbit sedikit ke kanan. Judul datang huruf demi huruf dari buram ke tajam, lalu kilau menyapu kata 'biru'. Cahaya panggung biru redup bernapas di belakang Bumi.",
     carries="Bumi 3D tetap di layar dan menjadi subjek shot berikutnya.",
     transition="Judul terangkat dan memudar; kamera mulai mendorong ke tepi Bumi tanpa potongan.",
     sound="Musik masuk pelan sejak frame 0. Riser lembut pendek di bawah judul, pop halus saat kata 'biru' mendarat.",
     check="Frame 0 sudah berupa komposisi jadi (Bumi terlihat, tidak hitam). Judul tidak menabrak Bumi.")

shot("s02", "tanya", "macro", 4,
     caption="Dari angkasa: hanya *selapis tipis biru*.",
     teaches="Atmosfer itu sangat tipis dibanding Bumi, dan warnanya biru bahkan dilihat dari luar.",
     screen="Kamera mendekat ke tepi (limb) Bumi sampai lengkungannya memenuhi bingkai dari kiri bawah ke kanan atas. Lapisan atmosfer tampak sebagai pita biru bercahaya tipis di atas permukaan; label kecil 'atmosfer' dengan garis penunjuk ke pita itu.",
     motion="Dorongan kamera yang melambat saat tiba (Bumi membesar 2,6×). Pita atmosfer berdenyut sekali saat label muncul. Garis penunjuk digambar dari titik ke label.",
     carries="Tepi Bumi dan pita birunya tetap, lalu disapu sinar Matahari.",
     transition="Cahaya dari kiri menguat: seberkas sinar putih masuk bingkai dan memicu shot berikutnya.",
     sound="Whoosh panjang lembut mengikuti dorongan kamera; tick kecil saat label menempel.",
     check="Pita atmosfer terbaca jelas biru, bukan putih terbakar bloom. Label menunjuk tepat ke pita.",
     facts=["f1"])

shot("s03", "tanya", "wide", 4,
     caption="Padahal cahaya Matahari itu *putih*.",
     teaches="Kontradiksi yang harus dijelaskan: sumber cahayanya putih, tetapi langit tampak biru.",
     screen="Bidikan lebar: Bumi mengecil ke kanan; dari kiri bingkai datang berkas sinar putih tebal dari arah Matahari (kilau hangat di tepi kiri) menuju Bumi. Label 'cahaya Matahari' di atas berkas.",
     motion="Kamera mundur cepat lalu tenang. Berkas sinar tumbuh dari kiri ke kanan seperti digambar, dengan butir cahaya mengalir di dalamnya. Cahaya panggung berubah dari biru ke putih hangat.",
     carries="Berkas sinar putih: ia yang akan dibelah di babak berikutnya.",
     transition="Berkas sinar membesar memenuhi layar (zoom masuk ke dalam berkas) menuju kartu pertanyaan.",
     sound="Riser udara terang mengikuti sinar; hit lembut saat sinar menyentuh Bumi.",
     check="Sinar benar-benar putih (bukan kuning). Kata 'putih' di caption beraksen.",
     facts=["f2"])

shot("s04", "tanya", "type", 3,
     teaches="Menyatakan pertanyaan inti secara eksplisit sebelum penjelasan dimulai.",
     screen="Layar tipografi penuh: 'Jadi, dari mana / birunya?' besar di tengah, kata 'birunya' beraksen biru, di atas panggung gelap dengan berkas sinar putih samar melintang di belakang.",
     motion="Baris pertama masuk dengan skala 1,5→1 dan buram→tajam; baris kedua menyusul. Kilau menyapu kata 'birunya'.",
     carries="Berkas sinar putih di belakang teks tetap dan menjadi sinar yang masuk ke prisma.",
     transition="Teks terlempar ke atas (whip vertikal) dan panggung ikut bergerak; prisma naik dari bawah.",
     sound="Impact sedang saat baris pertama mendarat; whoosh cepat di akhir.",
     check="Teks terbaca dalam 2 detik; tidak ada sisa elemen shot 3 yang menumpuk.")

# ── Babak 1: cahaya ────────────────────────────────────────────────────────
shot("s05", "cahaya", "diagram", 5,
     caption="Cahaya putih adalah *campuran semua warna*.",
     teaches="Cahaya putih bukan satu warna: ia terdiri dari semua warna pelangi yang bisa dipisahkan.",
     screen="Diagram prisma: berkas putih dari kiri masuk ke prisma kaca segitiga di tengah-kiri, keluar di kanan sebagai kipas tujuh pita warna (merah di atas sampai ungu di bawah). Prisma dari kaca dengan tepi terang.",
     motion="Sinar putih merambat ke prisma; setelah menyentuh, kipas warna membuka satu per satu dari merah ke ungu. Prisma berkilau sekali. Kamera mendorong pelan 3%.",
     carries="Kipas pita warna: pita merah dan biru akan menjadi gelombang.",
     transition="Pita-pita warna meluruskan diri menjadi garis horizontal sejajar, siap menjadi gelombang.",
     sound="Shimmer saat kipas warna membuka; tick halus per pita.",
     check="Urutan warna benar (merah dibelokkan paling sedikit, ungu paling banyak). Tujuh pita terlihat terpisah.",
     facts=["f2"])

shot("s06", "cahaya", "diagram", 4,
     caption="Tiap warna adalah sebuah *gelombang*.",
     teaches="Warna cahaya ditentukan oleh panjang gelombangnya.",
     screen="Tujuh pita warna kini menjadi tujuh gelombang sinus bertumpuk rapi dari merah (atas) ke ungu (bawah) yang merambat ke kanan; gelombang atas renggang, gelombang bawah rapat.",
     motion="Garis lurus mulai bergelombang dari kiri ke kanan (amplitudo tumbuh), lalu semua gelombang merambat terus. Sorot cahaya bergerak menuruni tumpukan dari merah ke ungu.",
     carries="Gelombang merah dan biru: keduanya dipertahankan, sisanya memudar.",
     transition="Lima gelombang lain meredup dan menyingkir; merah dan biru membesar ke tengah.",
     sound="Sweep bernada naik halus saat garis menjadi gelombang.",
     check="Gelombang merah jelas lebih renggang daripada biru; gerak rambatnya mulus (tidak patah antar frame).",
     facts=["f3"])

shot("s07", "cahaya", "compare", 4,
     caption="Merah *panjang*, biru *pendek*.",
     teaches="Angka konkretnya: merah sekitar 700 nm, biru sekitar 450 nm.",
     screen="Dua gelombang besar: merah di atas, biru di bawah. Di tiap gelombang satu panjang gelombang ditandai kurung ukur dengan angka: '700 nm' (merah) dan '450 nm' (biru). Label 'panjang gelombang (λ)' kecil di kiri.",
     motion="Kurung ukur membuka dari satu puncak ke puncak berikutnya; angka langsung tampil pada nilainya (tidak dihitung naik, supaya tidak pernah ada angka yang salah di layar). Gelombang tetap merambat.",
     carries="Gelombang biru dan merah mengecil menjadi dua sinar tipis yang masuk ke udara.",
     transition="Kamera menukik masuk ke ruang di antara gelombang: zoom ke skala molekul.",
     sound="Dua tick bernada (rendah untuk merah, tinggi untuk biru) saat angka terkunci.",
     check="Kurung ukur tepat menutup satu panjang gelombang; rasio visual 700:450 benar.",
     facts=["f3"])

shot("s08", "cahaya", "macro", 4,
     caption="Udara penuh molekul yang *sangat kecil*.",
     teaches="Udara bukan ruang kosong: isinya molekul nitrogen dan oksigen.",
     screen="Makro udara: puluhan molekul dua-atom (N₂ biru-abu, O₂ merah muda) melayang di kedalaman berbeda dengan blur kedalaman. Dua chip di kanan atas: 'N₂ 78%' dan 'O₂ 21%'.",
     motion="Molekul melayang dan berputar pelan dengan paralaks (yang dekat bergerak lebih cepat). Chip muncul berurutan. Kamera maju pelan menembus molekul.",
     carries="Satu molekul N₂ di tengah menjadi pembanding skala.",
     transition="Semua molekul lain memudar; satu molekul di tengah tetap dan mengecil ke kiri.",
     sound="Pop lembut berulang pelan saat molekul masuk; whoosh kecil saat zoom.",
     check="Molekul terbaca sebagai benda 3D (ada sorot dan bayangan), bukan lingkaran datar. Angka 78% dan 21% benar.",
     facts=["f5"])

shot("s09", "cahaya", "compare", 4,
     caption="Jauh lebih kecil dari gelombang cahaya.",
     teaches="Skala adalah kuncinya: molekul ~0,3 nm, gelombang biru 450 nm, lebih dari seribu kali lebih besar.",
     screen="Perbandingan skala: satu gelombang biru besar melintang di tengah dengan kurung '450 nm'; di bawah satu puncaknya ada titik molekul sangat kecil dengan garis penunjuk dan label 'molekul ≈ 0,3 nm'. Angka besar di kanan: '1.500×'.",
     motion="Gelombang biru masuk dari kiri; kaca pembesar lingkaran membesar di atas titik molekul memperlihatkan molekul dua-atom di dalamnya. Angka '1.500×' masuk pada nilainya dan bertahan.",
     carries="Molekul dan gelombang: keduanya dipakai di percobaan hamburan.",
     transition="Kaca pembesar menutup; molekul berlipat ganda menjadi barisan molekul di tengah layar.",
     sound="Pop saat kaca pembesar terbuka; satu tick saat angka mendarat.",
     check="Perbandingan 450 / 0,3 = 1.500 tertulis benar. Label menunjuk tepat ke molekul.",
     facts=["f3", "f6"])

# ── Babak 2: hamburan ──────────────────────────────────────────────────────
shot("s10", "hamburan", "diagram", 4,
     caption="Gelombang panjang lolos *hampir lurus*.",
     teaches="Cahaya merah nyaris tidak terpengaruh molekul udara.",
     screen="Percobaan: gugus molekul di tengah layar. Sinar merah bergelombang datang dari kiri, melewati gugus, dan keluar di kanan hampir utuh; hanya dua-tiga panah hambur merah kecil yang pucat. Label 'merah · 700 nm' di kiri atas.",
     motion="Gelombang merah merambat melintasi layar. Saat melewati molekul, beberapa molekul berkedip samar dan memancarkan panah kecil. Meter 'terhambur' di kanan bawah naik sedikit saja.",
     carries="Gugus molekul yang sama tetap di tempat untuk percobaan biru.",
     transition="Sinar merah keluar bingkai ke kanan; sinar biru masuk dari kiri di jalur yang sama.",
     sound="Dengung rendah halus mengikuti gelombang merah.",
     check="Sinar merah yang keluar masih hampir setebal yang masuk. Panah hambur sedikit dan pucat.",
     facts=["f4"])

shot("s11", "hamburan", "diagram", 4,
     caption="Yang pendek *terhambur* ke segala arah.",
     teaches="Cahaya biru dihamburkan molekul ke semua arah, jauh lebih kuat daripada merah.",
     screen="Percobaan yang sama dengan sinar biru: saat melewati gugus molekul, tiap molekul memancarkan cincin dan panah biru terang ke segala arah; sinar yang keluar di kanan jelas lebih tipis dan redup. Label 'biru · 450 nm'.",
     motion="Gelombang biru merambat masuk; molekul menyala berurutan dan memancarkan panah radial yang memanjang lalu memudar, berulang. Cahaya panggung berubah menjadi biru. Meter 'terhambur' melonjak tinggi.",
     carries="Panah-panah biru radial: bentuknya menjadi latar kartu nama.",
     transition="Ledakan panah biru memenuhi layar dan menjadi kilatan menuju kartu nama.",
     sound="Shimmer terang dan pop cepat beruntun saat molekul menyala; hit kecil di puncak.",
     check="Perbedaan dengan shot merah langsung terlihat tanpa membaca. Sinar keluar jelas lebih lemah.",
     facts=["f4"])

shot("s12", "hamburan", "type", 3,
     teaches="Memberi nama pada fenomenanya supaya penonton bisa mencarinya lagi.",
     screen="Kartu nama tipografi: tulisan kecil 'namanya' di atas, lalu 'Hamburan Rayleigh' sangat besar di tengah dengan kata 'Rayleigh' beraksen biru; garis mikro di bawah: 'LORD RAYLEIGH · 1871'.",
     motion="Judul masuk dengan hentakan (skala 1,5→1, buram→tajam) tepat di ketukan; kilau menyapu; garis mikro naik.",
     carries="Tulisan 'Hamburan Rayleigh' mengecil ke pojok kanan atas dan tetap di sana sebagai judul grafik.",
     transition="Teks mengecil dan terbang ke kanan atas; sumbu grafik sudah mulai digambar selagi teks berpindah.",
     sound="Impact sedang tepat di ketukan; shimmer pendek.",
     check="Ejaan 'Rayleigh' benar. Tahun 1871 sesuai lembar fakta.",
     facts=["f8"])

shot("s13", "hamburan", "chart", 4,
     caption="Makin pendek gelombangnya, makin *kuat*.",
     teaches="Hubungannya curam: kekuatan hamburan naik sangat cepat saat panjang gelombang memendek (∝ 1/λ⁴).",
     screen="Grafik besar: sumbu datar 'panjang gelombang (nm)' dari 400 sampai 700 dengan pita spektrum warna di bawah sumbu; sumbu tegak 'kekuatan hamburan'. Kurva 1/λ⁴ turun curam dari kiri atas ke kanan bawah. Rumus '∝ 1/λ⁴' di kanan atas.",
     motion="Sumbu digambar, pita spektrum membuka dari kiri ke kanan, lalu kurva digambar dari kanan (merah) ke kiri (ungu) sehingga terasa menanjak. Rumus masuk huruf demi huruf.",
     carries="Kurva dan sumbunya tetap; dua titik ditambahkan di atasnya.",
     transition="Tanpa potongan: kamera mendorong 6% dan dua titik data muncul di kurva.",
     sound="Sweep naik mengikuti kurva yang menanjak.",
     check="Bentuk kurva benar-benar 1/λ⁴ (dihitung, bukan digambar tangan). Label sumbu terbaca.",
     facts=["f4"])

shot("s14", "hamburan", "chart", 5,
     caption="Biru terhambur ≈ *5,9×* lebih kuat dari merah.",
     teaches="Angka kuncinya: (700/450)⁴ ≈ 5,9. Biru hampir enam kali lebih kuat terhambur daripada merah.",
     screen="Grafik yang sama dengan dua titik bercahaya di kurva: merah di 700 nm (label '1×') dan biru di 450 nm (label besar '5,9×'). Garis putus-putus dari tiap titik ke sumbu. Di kanan: perhitungan '(700 / 450)⁴ ≈ 5,9'.",
     motion="Titik merah muncul dulu; garis putus-putus naik dari sumbu; titik biru muncul dan label 5,9× masuk pada nilainya. Perhitungan muncul setelahnya.",
     carries="Titik biru yang bercahaya: ia menjadi butir cahaya biru di langit.",
     transition="Titik biru membesar menjadi kilatan biru yang memenuhi layar: masuk ke langit.",
     sound="Pop per titik, lalu tick dan chime lembut saat 5,9× mendarat.",
     check="5,9 konsisten dengan (700/450)^4 = 5,86. Titik berada tepat di kurva.",
     facts=["f4"])

# ── Babak 3: langit ────────────────────────────────────────────────────────
shot("s15", "langit", "wide", 4,
     caption="Biru datang dari *seluruh penjuru langit*.",
     teaches="Karena biru terhambur ke segala arah, mata kita menerima biru dari mana pun kita memandang langit.",
     screen="Bidikan lebar dari permukaan: siluet cakrawala dan seorang pengamat kecil di bawah, langit siang berupa kubah biru bergradasi (lebih pucat di cakrawala), Matahari di kiri atas. Sinar putih dari Matahari mengenai molekul-molekul di berbagai titik langit; tiap molekul menyala, menghamburkan biru ke segala arah, dan satu panah biru dari tiap molekul berakhir tepat di kepala pengamat.",
     motion="Langit berubah dari gelap menjadi biru mulai dari jalur sinar lalu menyebar ke seluruh kubah. Panah-panah biru tumbuh dari langit menuju pengamat satu per satu. Kamera miring naik pelan.",
     carries="Kubah langit biru: warnanya menjadi contoh di pita spektrum.",
     transition="Kubah langit memipih menjadi pita spektrum horizontal.",
     sound="Pad terbuka (musik naik setingkat); pop halus per panah.",
     check="Langit dekat cakrawala lebih pucat (benar secara fisika). Pengamat terlihat walau kecil.",
     facts=["f4"])

shot("s16", "langit", "compare", 5,
     caption="Ungu terhambur lebih kuat. Kenapa bukan ungu?",
     teaches="Mengantisipasi keberatan yang wajar: menurut kurva tadi, ungu seharusnya menang.",
     screen="Pita spektrum lebar di tengah (ungu di kiri sampai merah di kanan) dengan kurva hamburan di atasnya; batang ungu (400 nm) lebih tinggi daripada batang biru (450 nm), dan batang merah (700 nm) yang pendek di kanan sebagai pembanding. Tanda tanya besar di samping batang ungu.",
     motion="Pita membuka; penanda biru dan ungu naik seperti batang, ungu melampaui biru. Tanda tanya masuk dengan pantulan kecil.",
     carries="Pita spektrum tetap di atas; tiga alasan muncul di bawahnya.",
     transition="Pita naik ke bagian atas layar; panel alasan naik dari bawah.",
     sound="Dua tick naik; nada tanya (pop bernada naik).",
     check="Penanda ungu memang lebih tinggi daripada biru (sesuai 1/λ⁴).",
     facts=["f4"])

shot("s17", "langit", "ui", 5,
     caption="Ungu Matahari sedikit, dan mata kita kurang peka.",
     teaches="Tiga alasan langit tidak ungu: Matahari memancarkan lebih sedikit ungu, sebagian diserap di atmosfer atas, dan mata kita kurang peka terhadap ungu.",
     screen="Pita spektrum kecil di atas. Di bawahnya panel kaca berisi tiga baris bernomor: '1 Matahari memancarkan lebih sedikit ungu', '2 Sebagian diserap di atmosfer atas', '3 Mata kita kurang peka pada ungu'. Di kanan: lingkaran warna hasil akhir 'yang kita lihat' berwarna biru langit.",
     motion="Panel naik dengan miring 3D lalu rata; baris muncul berurutan, tiap baris meredupkan bagian ungu di pita. Lingkaran hasil terisi biru di akhir.",
     carries="Lingkaran biru langit: ia menjadi Bumi di shot berikutnya.",
     transition="Lingkaran biru membesar dan berubah menjadi Bumi 3D (bentuk bulat yang sama).",
     sound="Tiga tick berurutan; chime lembut saat lingkaran terisi.",
     check="Ketiga alasan sesuai lembar fakta. Teks baris terbaca di ukuran ponsel.",
     facts=["f9"])

# ── Babak 4: senja ─────────────────────────────────────────────────────────
shot("s18", "senja", "object3d", 5,
     caption="Saat senja, jalur cahaya *jauh lebih panjang*.",
     teaches="Geometri: saat Matahari rendah, sinarnya menempuh atmosfer jauh lebih panjang sebelum sampai ke mata.",
     screen="Bumi 3D besar di tengah-bawah dengan lapisan atmosfer tebal yang dibesar-besarkan. Dua pengamat di permukaan: satu di bawah Matahari (siang) dengan jalur sinar pendek tegak lurus, satu di garis senja dengan jalur sinar panjang menyerong menembus atmosfer. Label: 'siang: 1×' dan 'senja: ≈ 38×'.",
     motion="Bumi berputar masuk. Jalur siang digambar pendek; jalur senja digambar panjang dan label ≈ 38× masuk pada nilainya. Atmosfer berpendar di sepanjang jalur.",
     carries="Jalur sinar senja yang panjang: ia diluruskan menjadi diagram.",
     transition="Kamera mengikuti jalur senja dan meluruskannya menjadi garis horizontal panjang.",
     sound="Whoosh lembut saat Bumi masuk; pop per jalur; satu tick saat 38× mendarat.",
     check="Angka 38× hanya untuk cakrawala (sesuai fakta). Jalur senja jelas lebih panjang di gambar.",
     facts=["f7"])

shot("s19", "senja", "diagram", 4,
     caption="Birunya habis terhambur di jalan.",
     teaches="Sepanjang jalur yang panjang, biru terus dihamburkan keluar sampai nyaris habis.",
     screen="Diagram jalur: berkas sinar panjang horizontal melintasi barisan molekul. Di kiri berkas putih; makin ke kanan ia berubah kuning, jingga, lalu merah. Sepanjang jalan, panah biru (lalu hijau pucat) keluar ke atas dan bawah. Pita kecil di bawah menunjukkan 'sisa biru' yang menyusut.",
     motion="Sinar merambat dari kiri ke kanan; warnanya berubah seiring jarak. Panah biru terlontar keluar berurutan. Batang 'sisa biru' menyusut dari penuh ke hampir kosong. Cahaya panggung bergeser dari biru ke jingga.",
     carries="Ujung kanan berkas yang jingga-merah menjadi Matahari senja.",
     transition="Ujung berkas merah membesar menjadi cakram Matahari di cakrawala.",
     sound="Sweep turun panjang (biru yang hilang); pop kecil per panah.",
     check="Perubahan warna halus tanpa pita kasar. Batang 'sisa biru' selaras dengan warna berkas.",
     facts=["f7"])

shot("s20", "senja", "wide", 4,
     caption="Yang tersisa: *jingga dan merah*.",
     teaches="Warna senja adalah cahaya Matahari yang birunya sudah habis terhambur.",
     screen="Langit senja penuh layar: gradasi dari biru tua di atas ke jingga dan merah di cakrawala, cakram Matahari rendah di tengah-kiri dengan pendar, siluet cakrawala dan pengamat kecil yang sama seperti shot 15.",
     motion="Matahari turun pelan; gradasi langit berubah makin hangat; kilau di cakrawala melebar. Kamera mundur pelan.",
     carries="Siluet pengamat dan cakrawala: keduanya menutup cerita yang dibuka di shot 15.",
     transition="Langit meredup ke gelap panggung; tiga kartu rangkuman naik.",
     sound="Musik di puncaknya; shimmer hangat.",
     check="Gradasi tidak bergaris (banding). Matahari tidak terbakar putih polos.",
     facts=["f7"])

# ── Babak 5: rangkuman ─────────────────────────────────────────────────────
shot("s21", "rangkum", "recap", 7,
     caption="Putih itu semua warna. Biru paling terhambur. Senja tinggal jingga dan merah.",
     teaches="Mengulang tiga gagasan inti dalam satu bingkai supaya melekat.",
     screen="Tiga kartu kaca sejajar, masing-masing dengan gambar mini dan satu kalimat: (1) prisma mini: 'Cahaya putih = semua warna', (2) molekul dengan panah biru: 'Udara menghamburkan biru ≈ 5,9× lebih kuat', (3) Matahari senja mini: 'Senja: jalur panjang, tinggal jingga'. Judul kecil di atas: 'Jadi, kenapa langit biru?'.",
     motion="Kartu naik berurutan dengan miring 3D lalu rata; gambar mini di tiap kartu bergerak sedikit (kipas warna membuka, panah memancar, Matahari turun). Kilau menyapu tiap kartu bergantian.",
     carries="Kartu tengah (hamburan) membesar menjadi kalimat penutup.",
     transition="Ketiga kartu mengecil ke satu titik di tengah; Bumi dan kalimat penutup muncul dari titik itu.",
     sound="Tiga pop bernada naik; musik mulai turun.",
     check="Tiap kartu terbaca sendiri. Angka 5,9× sama dengan shot 14.",
     facts=["f2", "f4", "f7"])

shot("s22", "rangkum", "endcard", 6,
     teaches="Menutup dengan satu kalimat yang bisa diingat dan diucapkan ulang.",
     screen="Bumi 3D kecil di atas tengah dengan pendar atmosfer biru. Di bawahnya kalimat besar: 'Langit biru = / hamburan Rayleigh.' dengan 'hamburan Rayleigh' beraksen biru. Garis mikro: 'MOTION EDUCATOR · FILM UJI'.",
     motion="Bumi mendarat dari besar ke kecil dengan putaran; kalimat masuk huruf demi huruf; kilau menyapu; cahaya panggung bernapas biru. Tahan dengan gerak halus sampai akhir.",
     transition="Film berakhir pada frame ini; musik selesai berdering.",
     sound="Hit penutup lembut saat Bumi mendarat; shimmer; musik memudar.",
     check="Frame terakhir layak jadi poster. Kalimat terbaca minimal 2 detik penuh.")

for s in shots:
    del s["_b1"]

storyboard = {
    "title": "Kenapa langit berwarna biru?",
    "question": "Cahaya Matahari putih. Lalu kenapa langit siang biru dan senja jingga?",
    "audience": "Pelajar SMP/SMA dan penonton umum yang penasaran; tidak perlu latar fisika.",
    "promise": "Setelah menonton, penonton bisa menjelaskan dengan kata-katanya sendiri bahwa molekul udara menghamburkan cahaya biru jauh lebih kuat daripada merah, dan kenapa itu membuat siang biru dan senja jingga.",
    "language": "id",
    "duration": round(96 * BEAT, 3),
    "fps": 60,
    "poster": 40.9,
    "format": "1920x1080",
    "look": {
        "accent": "#4da3ff",
        "accent2": "#ffb21a",
        "mood": "Panggung grafit gelap dengan satu aksen biru langit; cahaya panggung ikut berganti warna mengikuti isi (putih, biru, jingga senja). Kaca, logam, dan cahaya nyata, bukan gaya kartun.",
    },
    "music": {
        "track": "Xceed Thru Johann (Mixkit 556)",
        "bpm": 86,
        "beat": round(BEAT, 6),
        "offset": 0,
        "start": 0.679,
        "note": "Mulai 0,679 s ke dalam lagu supaya ketukan jatuh di 0 + 0,698k detik film; tiap shot dimulai tepat di ketukan. Musik menanjak halus sepanjang film, cocok untuk penjelasan yang membangun.",
    },
    "facts": [
        {"id": "f1", "claim": "Atmosfer Bumi sangat tipis dibanding jari-jari Bumi: sekitar 99% massanya berada di bawah ketinggian ~30 km, sedangkan jari-jari Bumi ~6.371 km.", "source": "NASA Earth Fact Sheet; NOAA JetStream: Layers of the Atmosphere"},
        {"id": "f2", "claim": "Cahaya Matahari tampak putih karena merupakan campuran semua warna cahaya tampak; prisma dapat memisahkannya menjadi spektrum.", "source": "Newton, Opticks (1704); NASA Science: Visible Light"},
        {"id": "f3", "claim": "Cahaya tampak berpanjang gelombang kira-kira 380-750 nm; merah sekitar 700 nm dan biru sekitar 450 nm.", "source": "NASA Science: The Electromagnetic Spectrum, Visible Light"},
        {"id": "f4", "claim": "Hamburan Rayleigh oleh molekul udara sebanding dengan 1/λ⁴, sehingga biru 450 nm terhambur (700/450)⁴ ≈ 5,9 kali lebih kuat daripada merah 700 nm.", "source": "Rayleigh (1871), Phil. Mag. 41; HyperPhysics: Blue Sky and Rayleigh Scattering"},
        {"id": "f5", "claim": "Udara kering terdiri dari sekitar 78% nitrogen (N₂) dan 21% oksigen (O₂) menurut volume.", "source": "NOAA JetStream: The Atmosphere; CRC Handbook of Chemistry and Physics"},
        {"id": "f6", "claim": "Molekul N₂ dan O₂ berukuran sekitar 0,3 nm, lebih dari seribu kali lebih kecil daripada panjang gelombang cahaya tampak (450 / 0,3 = 1.500).", "source": "CRC Handbook (diameter kinetik N₂ 0,364 nm, O₂ 0,346 nm)"},
        {"id": "f7", "claim": "Saat Matahari di cakrawala, cahayanya menempuh massa udara sekitar 38 kali lebih besar daripada saat Matahari tepat di atas kepala, sehingga biru banyak terhambur keluar dan yang tersisa jingga-merah.", "source": "Kasten & Young (1989), Applied Optics 28: massa udara di cakrawala ≈ 38"},
        {"id": "f8", "claim": "Fenomena ini dijelaskan oleh Lord Rayleigh (John William Strutt) pada tahun 1871.", "source": "Strutt, J.W. (1871), Philosophical Magazine 41, 107-120"},
        {"id": "f9", "claim": "Langit tidak tampak ungu karena Matahari memancarkan lebih sedikit ungu daripada biru, sebagian ungu diserap di atmosfer atas, dan mata manusia kurang peka terhadap ungu.", "source": "Smith (2005), Human color vision and the unsaturated blue color of the daytime sky, Am. J. Phys. 73"},
    ],
    "acts": [
        {"id": "tanya", "title": "Pertanyaan", "goal": "Membuat penonton ingin tahu: cahayanya putih, tapi langitnya biru.", "rail": False},
        {"id": "cahaya", "title": "Cahaya", "goal": "Cahaya putih adalah campuran warna, tiap warna adalah gelombang dengan panjang berbeda, dan udara berisi molekul yang jauh lebih kecil."},
        {"id": "hamburan", "title": "Hamburan", "goal": "Molekul menghamburkan gelombang pendek jauh lebih kuat: hamburan Rayleigh, sebanding 1/λ⁴."},
        {"id": "langit", "title": "Langit", "goal": "Biru yang terhambur datang dari segala arah; dan kenapa bukan ungu."},
        {"id": "senja", "title": "Senja", "goal": "Jalur cahaya yang panjang membuang biru dan menyisakan jingga-merah."},
        {"id": "rangkum", "title": "Rangkuman", "goal": "Tiga gagasan inti diulang dalam satu bingkai, lalu satu kalimat penutup.", "rail": False},
    ],
    "shots": shots,
}
Path(__file__).with_name("storyboard.json").write_text(json.dumps(storyboard, ensure_ascii=False, indent=2) + "\n")
print(len(shots), "shots,", storyboard["duration"], "s")
