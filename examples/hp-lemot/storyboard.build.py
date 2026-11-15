"""Writes storyboard.json (and grid.json, the states of the flash grid the film draws) for
"Kenapa HP makin lemot pas memorinya hampir penuh?" (portrait, 1080 x 1920).

The film is cut to one take of narration. This script writes the plan: the shots, each with its run of the script
and its drawn frames. Its times are only a guess; the take sets the real ones, so the script ends by asking the voice
tool to retime the board (it does nothing until a take is there):

    python3 examples/hp-lemot/storyboard.build.py && node kit/tools/storyboard.mjs examples/hp-lemot --png

The grid is an illustration, not to scale: a real block holds hundreds of pages (f1), the film draws sixteen. Its
layout is fixed here and film.js reads the same numbers from grid.json, so the board and the film agree to the pixel.
The bars in s09 are computed by sim.py (a toy flash with greedy garbage collection), not drawn by eye.
"""
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
shots = []

# ── The grid: six user blocks (3 x 2), one spare block, 4 x 4 pages each ────────────────────────────────────────
B, GAP, PAD, PG = 252, 26, 16, 10
PAGE = (B - 2 * PAD - 3 * PG) / 4  # 47.5 px
COLS = [93, 371, 649]
ROWS = [400, 678]
SPARE = (371, 966)
BLOCKS = [(COLS[c], ROWS[r]) for r in range(2) for c in range(3)] + [SPARE]  # index 6 is the spare


def page_xy(b, p):
    bx, by = BLOCKS[b]
    return bx + PAD + (p % 4) * (PAGE + PG), by + PAD + (p // 4) * (PAGE + PG)


def page_centre(b, p):
    x, y = page_xy(b, p)
    return round(x + PAGE / 2), round(y + PAGE / 2)


# Page states: 0 empty, 1 in use (cyan), 2 no longer used (grey: an old copy, or a deleted file).
def blocks_from(spec):
    """spec: one string of 16 characters a block: '.' empty, 'o' in use, 'x' no longer used."""
    return [[{".": 0, "o": 1, "x": 2}[c] for c in row] for row in spec]


# s03 to s05: about half full. Block 0 is where writing is shown; block 2 is all old data, the one erased in s05.
HALF = blocks_from([
    "oooooo..........",
    "ooxoooooxooo....",
    "xxxxxxxxxxxxxxxx",
    "oooooooo........",
    "ooooxoooooxooo..",
    "oooo............",
    "................",
])
# After s04: new data went to page 6 of block 0. After s04b: page 2 was changed; the new version went to page 7 and
# page 2 is old data now.
AFTER_WRITE = [row[:] for row in HALF]
AFTER_WRITE[0][6] = 1
AFTER_WRITE[0][2] = 2
AFTER_WRITE[0][7] = 1
# After s05: block 2 erased in one go.
AFTER_ERASE = [row[:] for row in AFTER_WRITE]
AFTER_ERASE[2] = [0] * 16
# s06 to s08: nearly full. No empty page left in the six user blocks; block 4 has the most old pages (5 of 16),
# so it is the one the controller cleans: 11 pages in use are copied to the spare block, then block 4 is erased.
FULL = blocks_from([
    "ooooooooooooxooo",
    "oooooooooxoooooo",
    "oooooxoooooooooo",
    "ooooooxooooooooo",
    "ooxoxooxoooxoxoo",
    "oooooooooxoooooo",
    "................",
])
VICTIM = 4
MOVED = [p for p, s in enumerate(FULL[VICTIM]) if s == 1]  # 11 pages
assert len(MOVED) == 11
# s11: room to spare. The photo lands at once in the first empty page of block 0.
ROOMY = blocks_from([
    "oooooooo........",
    "ooxooooo........",
    "oooooo..........",
    "................",
    "ooooxooooo......",
    "oooo............",
    "................",
])
LAND_ROOMY = (0, 8)

# The toy flash of sim.py: written pages per page of new data, by how full the user area is.
SIM = json.loads((HERE / "sim.json").read_text())

(HERE / "grid.json").write_text(json.dumps({
    "B": B, "PAD": PAD, "PG": PG, "PAGE": PAGE, "blocks": BLOCKS,
    "half": HALF, "afterWrite": AFTER_WRITE, "afterErase": AFTER_ERASE, "full": FULL, "victim": VICTIM, "moved": MOVED,
    "roomy": ROOMY, "landRoomy": LAND_ROOMY, "sim": SIM,
}) + "\n")


# ── Drawing helpers for the board ─────────────────────────────────────────────────────────────────────────────────
def fr(at, note, *draw):
    flat = []
    for d in draw:
        flat.extend(d if isinstance(d, list) else [d])
    return {"at": at, "note": note, "draw": flat}


def label(x, y, text, size=36, **more):
    return {"label": [x, y], "text": text, "size": size, **more}


def rect(x, y, w, h, colour="ink", fill=None, width=4):
    d = f"M{x:.0f} {y:.0f} H{x + w:.0f} V{y + h:.0f} H{x:.0f} Z"
    out = {"path": d, "colour": colour, "width": width}
    if fill:
        out["fill"] = fill
    return out


def grid(state, only=None, glow=None):
    """The blocks and their pages. glow: list of (block, page) drawn heavier."""
    out = []
    for b, (bx, by) in enumerate(BLOCKS):
        if only is not None and b not in only:
            continue
        out.append(rect(bx, by, B, B, "ink", width=6 if b < 6 else 4))
        for p in range(16):
            x, y = page_xy(b, p)
            s = state[b][p]
            if s == 1:
                out.append(rect(x, y, PAGE, PAGE, "blue", fill="blue", width=6 if glow and (b, p) in glow else 3))
            elif s == 2:
                out.append(rect(x, y, PAGE, PAGE, "white", fill="white", width=3))
            else:
                out.append(rect(x, y, PAGE, PAGE, "ink", width=2))
    return out


def hud(text, colour="red", fill=0.97):
    """The storage strip at the top of the chip shots."""
    return [label(93, 268, "penyimpanan", 32, align="start"), rect(93, 292, 808, 30, "ink"), rect(93, 292, round(808 * fill), 30, colour, fill=colour), {"chip": [690, 236], "text": text}]


SPARE_LABEL = label(497, 1250, "blok cadangan", 30)
CTRL = [rect(108, 1000, 200, 150, "ink", width=6), label(208, 1085, "pengendali", 30)]


def counter(moved, erased):
    return [{"panel": [649, 990, 252, 190], "title": "kerja ekstra", "rows": [f"pindah  {moved}", f"hapus  {erased}"]}]


def photo(x, y, w=150):
    h = round(w * 0.72)
    return [rect(x, y, w, h, "ink", fill="yellow", width=5), {"path": f"M{x + 10} {y + h - 10} L{x + w * 0.4:.0f} {y + h * 0.4:.0f} L{x + w * 0.62:.0f} {y + h * 0.7:.0f} L{x + w * 0.78:.0f} {y + h * 0.5:.0f} L{x + w - 10} {y + h - 10} Z", "colour": "ink", "fill": "green", "width": 3}, {"dot": [x + w * 0.75, y + h * 0.28, 10], "colour": "orange"}]


# The phone: 520 x 1050, centred on (497, 760); its screen inset 22 px.
PX, PY, PW, PH = 237, 235, 520, 1050
SX, SY = PX + 22, PY + 22


def phone(bar, colour, *screen):
    return [{"path": f"M{PX + 70} {PY} H{PX + PW - 70} Q{PX + PW} {PY} {PX + PW} {PY + 70} V{PY + PH - 70} Q{PX + PW} {PY + PH} {PX + PW - 70} {PY + PH} H{PX + 70} Q{PX} {PY + PH} {PX} {PY + PH - 70} V{PY + 70} Q{PX} {PY} {PX + 70} {PY} Z", "colour": "ink", "width": 9},
            rect(SX, SY + 6, PW - 44, PH - 56, "ink", width=3),
            label(SX + 30, 360, "Penyimpanan", 44, align="start"),
            {"number": [SX + 150, 500], "text": f"{round(bar * 100)}%", "size": 110, "colour": colour},
            rect(SX + 30, 560, PW - 104, 40, "ink"), rect(SX + 30, 560, round((PW - 104) * bar), 40, colour, fill=colour),
            *[t for item in screen for t in (item if isinstance(item, list) else [item])]]


# ── The frames ────────────────────────────────────────────────────────────────────────────────────────────────────
FRAMES = {
    "s01": [
        fr(0.0, "Frame 0 is finished: a generic phone fills the frame, lit, a slight tilt. Its storage screen shows the bar at 91% and still climbing; the first words of the question pop under it.",
           phone(0.91, "blue", label(SX + 30, 680, "Foto  ·  Aplikasi  ·  Sistem", 30, align="start")), {"glow": [497, 600, 360], "colour": "blue"}, {"camera": "push"}, {"move": [700, 580, 760, 580], "text": "bar naik"}),
        fr(0.55, "On 'lemot' the bar reaches 97% and turns warning red; a 'Hampir penuh' chip drops in; the photo being saved shows a spinner that keeps turning.",
           phone(0.97, "red", {"chip": [SX + 40, 640], "text": "Hampir penuh"}, photo(SX + 150, 780, 180), {"ring": [SX + 240, 845, 40], "colour": "red", "dashed": True}, label(SX + 240, 950, "menyimpan…", 32)), {"glow": [497, 600, 360], "colour": "red"}),
        fr(1.0, "The question is asked. The phone pushes toward the lens: the cut dives through the screen to the chip inside.",
           phone(0.97, "red", {"chip": [SX + 40, 640], "text": "Hampir penuh"}, photo(SX + 150, 780, 180)), {"camera": "push"}, {"cut": "menyelam ke chip"}),
    ],
    "s02": [
        fr(0.0, "Inside: a flash chip in 3D, graphite package on a dark board, seen steeply from the side, lit by a cyan rim. Its face is dark.",
           {"path": "M140 900 L560 640 L960 900 L540 1180 Z", "colour": "ink", "fill": "white", "width": 8}, {"path": "M140 900 L140 940 L540 1220 L540 1180", "colour": "ink", "width": 6}, label(497, 1300, "chip memori (flash)", 34), {"camera": "orbit"}, {"move": [820, 700, 860, 560], "text": "berputar menghadap"}),
        fr(1.0, "On 'blok-blok' the chip has turned face-on and its face lights up as a grid: six blocks and a seventh below. The 3D face hands over to the flat grid at the same pixels.",
           rect(60, 368, 874, 882, "ink", width=8), grid(HALF), {"glow": [497, 800, 420], "colour": "blue"}, {"cut": "tanpa potongan: wajah chip jadi grid"}),
    ],
    "s03": [
        fr(0.0, "The grid face-on. Block 0 lifts slightly and a bracket names it '1 blok'.",
           grid(HALF), {"bracket": [93, 345, 380], "text": "1 blok", "colour": "blue"}, {"camera": "push"}),
        fr(0.7, "On 'banyak halaman' the sixteen pages of block 0 flash one by one; on 'halaman' a chip at the top names one (a leader to page 3); on 'kecil' a note at the top right: 'aslinya: ratusan halaman per blok'.",
           grid(HALF, glow=[(0, 3)]), {"chip": [380, 246], "text": "halaman"}, {"arrow": [436, 312, 300, 432], "colour": "blue"}, label(800, 270, "aslinya: ratusan", 28), label(800, 310, "halaman per blok", 28), {"cut": "kamera mendekat ke blok 0"}),
    ],
    "s04": [
        fr(0.0, "The camera pushes in on block 0 (2.2 times): six pages lit, ten empty. A small cyan packet appears above it.",
           [rect(80, 380, 860, 860, "ink", width=8)], {"path": "M150 450 H330 V630 H150 Z M360 450 H540 V630 H360 Z M570 450 H750 V630 H570 Z", "colour": "blue", "fill": "blue", "width": 5},
           rect(800, 250, 90, 90, "blue", fill="blue", width=6), {"camera": "push"}),
        fr(1.0, "On 'halaman' the packet drops into the next empty page: it lights. One page, one write.",
           [rect(80, 380, 860, 860, "ink", width=8)], {"path": "M150 450 H330 V630 H150 Z M360 450 H540 V630 H360 Z M570 450 H750 V630 H570 Z", "colour": "blue", "fill": "blue", "width": 5},
           rect(780, 450, 120, 120, "blue", fill="blue", width=8), {"move": [840, 300, 840, 440], "text": "data baru"}, {"chip": [140, 1150], "text": "ditulis per halaman"}, {"cut": "tanpa potongan"}),
    ],
    "s04b": [
        fr(0.0, "A changed copy of page 2 (cyan, with a small pencil) comes down toward page 2, which is already full.",
           [rect(80, 380, 860, 860, "ink", width=8)], {"path": "M150 450 H330 V630 H150 Z M360 450 H540 V630 H360 Z M570 450 H750 V630 H570 Z", "colour": "blue", "fill": "blue", "width": 5},
           rect(780, 450, 120, 120, "blue", fill="blue", width=8), rect(610, 260, 100, 100, "blue", fill="blue", width=6), {"move": [660, 250, 660, 420], "text": "data diubah"}),
        fr(0.5, "'tapi halaman yang terisi nggak bisa ditimpa': a changed copy of page 2 tries to land on it and bounces off with a red cross.",
           [rect(80, 380, 860, 860, "ink", width=8)], {"path": "M150 450 H330 V630 H150 Z M360 450 H540 V630 H360 Z M570 450 H750 V630 H570 Z", "colour": "blue", "fill": "blue", "width": 5},
           {"path": "M600 300 L720 420 M720 300 L600 420", "colour": "red", "width": 14}, {"move": [660, 250, 660, 410], "text": "ditimpa?"}, {"chip": [140, 1150], "text": "nggak bisa ditimpa"}),
        fr(1.0, "The changed copy goes to the next empty page (page 7) instead; the old page 2 turns grey: 'lama, nggak dipakai'.",
           [rect(80, 380, 860, 860, "ink", width=8)], {"path": "M150 450 H330 V630 H150 Z M360 450 H540 V630 H150 Z", "colour": "blue", "fill": "blue", "width": 5},
           rect(570, 450, 180, 180, "white", fill="white"), rect(360, 660, 180, 180, "blue", fill="blue", width=8), {"arrow": [660, 640, 470, 700], "colour": "blue"}, {"chip": [500, 880], "text": "lama, nggak dipakai"}, {"cut": "kamera mundur"}),
    ],
    "s05": [
        fr(0.0, "Back to the whole grid. Block 2 is all grey: old data only. A red frame closes around it.",
           grid(AFTER_WRITE), rect(640, 391, 270, 270, "red", width=8), {"camera": "pull"}),
        fr(0.6, "On 'satu blok sekaligus': all sixteen pages of block 2 are wiped in one flash, together, not one by one.",
           grid(AFTER_ERASE), {"glow": [775, 526, 200], "colour": "blue"}, {"chip": [600, 360], "text": "hapus 1 blok sekaligus"}, {"scatter": [775, 526, 10, 150, 220], "colour": "blue"}),
        fr(1.0, "The block is empty and ready to be written again.",
           grid(AFTER_ERASE), {"cut": "grid mulai terisi cepat"}),
    ],
    "s06": [
        fr(0.0, "'Nah': the strip at the top starts to fill; empty pages light one after another all over the grid.",
           hud("terisi…", "blue", 0.8), grid(AFTER_ERASE), {"move": [200, 1000, 800, 1000], "text": "terisi cepat"}, {"camera": "pull"}),
        fr(0.6, "On 'hampir penuh' the strip turns red: 'hampir penuh'. Every page of the six blocks is used or old; none is empty.",
           hud("hampir penuh", "red", 0.97), grid(FULL), {"glow": [497, 650, 420], "colour": "red"}),
        fr(1.0, "'halaman kosongnya habis': a chip in red, '0 halaman kosong'. The spare block below stays empty, labelled.",
           hud("hampir penuh", "red", 0.97), grid(FULL), {"chip": [600, 252], "text": "0 halaman kosong"}, SPARE_LABEL, {"cut": "tanpa potongan"}),
    ],
    "s07": [
        fr(0.0, "On 'satu foto' a new photo drops in at the top right and looks for an empty page: a red scan flickers across full pages.",
           hud("hampir penuh", "red", 0.97), grid(FULL), photo(760, 210, 130), {"move": [820, 320, 500, 520], "text": "cari halaman kosong"}, *CTRL),
        fr(0.45, "The controller lights; block 4 (the most grey pages) is ringed; its pages still in use fly one by one to the spare block. The counter counts them.",
           hud("hampir penuh", "red", 0.97), grid([row if i != 6 else [1] * 5 + [0] * 11 for i, row in enumerate(FULL)]), photo(760, 210, 130), rect(362, 669, 270, 270, "red", width=8),
           *CTRL, counter(5, 0), {"move": [450, 800, 450, 1000], "text": "dipindah"}),
        fr(1.0, "Eleven pages in use are in the spare block; block 4 is left with grey pages only.",
           hud("hampir penuh", "red", 0.97), grid([[2 if (i == VICTIM and s == 1) else s for s in row] if i != 6 else [1] * 11 + [0] * 5 for i, row in enumerate(FULL)]), photo(760, 210, 130), *CTRL, counter(11, 0), {"cut": "tanpa potongan"}),
    ],
    "s08": [
        fr(0.0, "'Terus': block 4 holds only grey pages now, in its red frame; the photo still waits at the top.",
           hud("hampir penuh", "red", 0.97), grid([[2 if (i == VICTIM and s == 1) else s for s in row] if i != 6 else [1] * 11 + [0] * 5 for i, row in enumerate(FULL)]), rect(362, 669, 270, 270, "red", width=8), photo(760, 210, 130), *CTRL, counter(11, 0)),
        fr(0.4, "'dihapus': block 4 flashes and all sixteen pages are erased together; the counter's 'hapus' reads 1.",
           hud("hampir penuh", "red", 0.97), grid([[0] * 16 if i == VICTIM else (row if i != 6 else [1] * 11 + [0] * 5) for i, row in enumerate(FULL)]), {"glow": [497, 804, 200], "colour": "blue"}, photo(760, 210, 130), *CTRL, counter(11, 1)),
        fr(1.0, "'baru fotonya masuk': the photo flies into the first empty page of the spare block. Only now is it saved.",
           hud("hampir penuh", "red", 0.97), grid([[0] * 16 if i == VICTIM else (row if i != 6 else [1] * 12 + [0] * 4) for i, row in enumerate(FULL)], glow=[(6, 11)]), {"move": [820, 320, 620, 1110], "text": "foto masuk"}, *CTRL, counter(11, 1), {"cut": "grid menyusut jadi grafik"}),
    ],
    "s09": [
        fr(0.0, "A chart of the toy flash: bars for how many pages are written to save one page of new data, at 60, 80, 90 and 97% full.",
           {"axes": [140, 520, 780, 640], "xlabel": "seberapa penuh", "ylabel": ""}, *[{"bar": [180 + i * 190, 1160, 130, round(SIM["wa"][k] * 160)], "colour": ["blue", "blue", "orange", "red"][i], "label": f"{k}%"} for i, k in enumerate(["60", "80", "90", "97"])][:2],
           label(497, 440, "ditulis per 1 halaman data baru", 34), {"move": [300, 1000, 600, 800], "text": "bar tumbuh"}),
        fr(0.6, "The bars stand at their computed values, turning red as the storage fills: 1,3× ... 3×. A small label: 'model sederhana'.",
           {"axes": [140, 520, 780, 640], "xlabel": "seberapa penuh", "ylabel": ""}, *[{"bar": [180 + i * 190, 1160, 130, round(SIM["wa"][k] * 160)], "colour": ["blue", "blue", "orange", "red"][i], "label": f"{k}%"} for i, k in enumerate(["60", "80", "90", "97"])],
           *[label(245 + i * 190, 1160 - round(SIM["wa"][k] * 160) - 24, SIM["text"][k], 36) for i, k in enumerate(["60", "80", "90", "97"])], label(497, 440, "ditulis per 1 halaman data baru", 34), label(497, 1255, "model sederhana, bukan ukuran HP asli", 28)),
        fr(1.0, "Held; the last bar pulses red on 'lemot'.",
           {"axes": [140, 520, 780, 640], "xlabel": "seberapa penuh", "ylabel": ""}, *[{"bar": [180 + i * 190, 1160, 130, round(SIM["wa"][k] * 160)], "colour": ["blue", "blue", "orange", "red"][i], "label": f"{k}%"} for i, k in enumerate(["60", "80", "90", "97"])],
           {"glow": [815, 900, 200], "colour": "red"}, {"camera": "push"}, {"cut": "kembali ke HP"}),
    ],
    "s10": [
        fr(0.0, "The phone again, its storage screen at 97% in red, now with the breakdown: Foto, Aplikasi, Sistem, and a thin row 'File sementara'.",
           phone(0.97, "red", label(SX + 30, 690, "Foto", 34, align="start"), label(SX + 30, 760, "Aplikasi", 34, align="start"), label(SX + 30, 830, "Sistem", 34, align="start"), label(SX + 30, 900, "File sementara", 34, align="start")), {"camera": "push"}),
        fr(1.0, "'juga ikut sempit': the temporary-files slot at the end of the bar is squeezed to a sliver; small file tiles pile up against it, red.",
           phone(0.97, "red", label(SX + 30, 690, "Foto", 34, align="start"), label(SX + 30, 760, "Aplikasi", 34, align="start"), label(SX + 30, 830, "Sistem", 34, align="start"), label(SX + 30, 900, "File sementara", 34, align="start"),
                 rect(SX + 300, 880, 40, 30, "red", fill="red"), rect(SX + 350, 880, 40, 30, "red", fill="red"), {"chip": [SX + 30, 960], "text": "nggak muat"}), {"move": [600, 1000, 700, 600], "text": "terjepit"}, {"cut": "kembali ke grid yang lega"}),
    ],
    "s11": [
        fr(0.0, "'Padahal': the grid again, with plenty of empty pages; the strip at the top is cyan.",
           hud("lega", "blue", 0.55), grid(ROOMY), photo(760, 210, 130), *CTRL, counter(0, 0)),
        fr(0.45, "'fotonya langsung': the photo is already falling, straight down toward the first empty page of block 0.",
           hud("lega", "blue", 0.55), grid(ROOMY), photo(250, 480, 90), {"move": [800, 300, 290, 560], "text": "jatuh langsung"}, *CTRL, counter(0, 0)),
        fr(1.0, "'masuk': the photo drops straight into an empty page of block 0 with a clean cyan flash. Nothing is moved, nothing erased.",
           hud("lega", "blue", 0.55), grid([[1 if (b, p) == LAND_ROOMY else s for p, s in enumerate(row)] for b, row in enumerate(ROOMY)], glow=[LAND_ROOMY]), {"move": [800, 320, 270, 640], "text": "langsung"}, *CTRL, counter(0, 0), {"chip": [380, 1250], "text": "langsung masuk"}, {"cut": "kembali ke HP"}),
    ],
    "s12": [
        fr(0.0, "The phone: on 'sisakan ruang kosong' the bar shrinks from 97% as things are cleared.",
           phone(0.97, "red"), {"move": [700, 580, 560, 580], "text": "dikosongkan"}, {"camera": "push"}),
        fr(0.5, "On 'sepuluh persen' a marker stands at 90% on the bar and the last tenth is outlined in cyan: '≥ 10% kosong'.",
           phone(0.8, "blue", {"line": [SX + 30 + 0.9 * (PW - 104), 540, SX + 30 + 0.9 * (PW - 104), 620], "colour": "blue", "width": 6}, {"chip": [SX + 220, 640], "text": "≥ 10% kosong"})),
        fr(1.0, "'biar tetap ngebut': the bar settles at 80% in cyan, a check lights; the saving photo now lands instantly.",
           phone(0.8, "blue", {"chip": [SX + 220, 640], "text": "≥ 10% kosong"}, photo(SX + 150, 780, 180), label(SX + 240, 950, "tersimpan ✓", 32)), {"glow": [497, 600, 360], "colour": "blue"}, {"cut": "kartu rangkuman naik"}),
    ],
    "s13": [
        fr(0.0, "Silent. The phone fades away; three glass cards rise, each with its small picture.",
           {"card": [64, 262, 866, 200]}, label(560, 370, "tulis per halaman, hapus per blok", 34), {"card": [64, 486, 866, 200]}, label(560, 594, "penuh: pindah dulu, hapus, baru tulis", 34),
           {"move": [990, 800, 990, 600], "text": "kartu naik"}),
        fr(0.4, "The whole recap, and the poster line under it.",
           {"card": [64, 262, 866, 200]}, label(560, 370, "tulis per halaman, hapus per blok", 34), {"card": [64, 486, 866, 200]}, label(560, 594, "penuh: pindah dulu, hapus, baru tulis", 34),
           {"card": [64, 710, 866, 200]}, label(560, 818, "sisakan ≥ 10% kosong", 34), {"title": [497, 1080], "text": "Sisakan ruang,\nbiar ngebut.", "size": 100, "accent": "biar ngebut."}, rect(110, 1330, 770, 56, "ink"), rect(110, 1330, 616, 56, "blue", fill="blue"), rect(803, 1318, 77, 80, "blue", width=5), label(842, 1450, "≥ 10% kosong", 36)),
        fr(1.0, "The poster holds for two seconds, breathing; it can loop back to the phone of frame 0.",
           {"card": [64, 262, 866, 200]}, {"card": [64, 486, 866, 200]}, {"card": [64, 710, 866, 200]}, label(560, 818, "sisakan ≥ 10% kosong", 34),
           {"title": [497, 1080], "text": "Sisakan ruang,\nbiar ngebut.", "size": 100, "accent": "biar ngebut."}, rect(110, 1330, 770, 56, "ink"), rect(110, 1330, 616, 56, "blue", fill="blue"), rect(803, 1318, 77, 80, "blue", width=5), label(842, 1450, "≥ 10% kosong", 36), {"camera": "push"}, {"cut": "kembali ke awal"}),
    ],
}


def shot(id, act, type, length=None, **fields):
    """A speaking shot's length is the take's. A silent beat keeps the length it is given here."""
    start = shots[-1]["end"] if shots else 0
    guess = length if length is not None else round(len(fields.get("voice", "")) / 15 + 0.3, 2)
    shots.append({"id": id, "act": act, "type": type, "start": round(start, 3), "end": round(start + guess, 3), **fields, "frames": FRAMES[id]})


# ── Babak 1: pertanyaan ─────────────────────────────────────────────────────────────────────────────────────────────
shot("s01", "hook", "ui",
     voice="[curious] Kenapa sih hape kamu makin *lemot* pas memorinya hampir penuh?",
     teaches="Asks the question in the viewer's own words while it happens: a phone's storage bar climbing into the red and a photo that will not finish saving.",
     screen="A generic phone in 3D (no brand, no real interface), 520 x 1050 px centred on (497, 760), graphite frame and glass front, lit from the upper left with a cyan rim. Its screen is a plain storage page: 'Penyimpanan', a large percentage, a thick bar, and below it a photo thumbnail with a spinner and 'menyimpan…'. The question pops in large words under the phone.",
     motion="Frame 0 already shows the bar at 91% climbing, the phone turning slowly. On 'lemot' the bar reaches 97% and turns warning red, the figure ticks to 97% on that frame, 'Hampir penuh' drops in, and the spinner keeps turning. At the end the phone pushes toward the lens.",
     carries="The red of 'full' and the push into the phone.",
     transition="The phone rushes at the lens; a soft flash; we are inside, at the chip.",
     sound="The bed starts on frame 0. A soft error blip as the bar turns red, in the gap after 'lemot'. A whoosh on the dive.",
     check="The phone is generic: no logo, no real app's interface. The question is readable and never under the app's buttons. The figure on the screen agrees with the bar.",
     facts=["f8"])

shot("s02", "kerja", "object3d",
     voice="Di dalam chipnya ada *blok-blok,*",
     teaches="Where the data really lives: a flash chip, and its inside is divided into blocks.",
     screen="A flash chip in 3D, a graphite package 880 px square on a dark board with fine traces, gold contacts along its edges, lit by a cyan rim. It turns from a steep three-quarter view to face the camera; its face lights up from inside as a grid: six blocks in two rows and a seventh below.",
     motion="The chip turns and settles in 1.5 s (expo out). On 'blok-blok' the grid on its face lights block by block. In the last frames the 3D face hands over to the flat grid at the same pixels.",
     carries="The grid, at the same pixels.",
     transition="No cut: the chip face becomes the flat grid.",
     sound="A low shimmer as the face lights, between words.",
     check="The 3D face and the flat grid line up on the hand-over frame (no jump).",
     facts=["f1"])

shot("s03", "kerja", "diagram",
     voice="tiap blok punya banyak *halaman* kecil.",
     teaches="A block is made of many pages: the page is the small unit, the block the big one.",
     screen="The grid face-on: six dark glass blocks (252 px) in a 3 x 2 grid from y 400 to 930, the spare block under them at (371, 966), each holding 4 x 4 pages. Pages in use glow electric cyan; empty pages are dark outlines; old ones are grey. A strip at the top, 'penyimpanan', is half full in cyan. A bracket '1 blok' over block 0, a chip 'halaman' at the top with a leader to one page, and a small note at the top right 'aslinya: ratusan halaman per blok'. (The storage strip comes in only at s06.)",
     motion="Block 0's bracket draws as the line starts; its pages tick on one by one; on 'halaman' the chip pops on page 5. A slow push.",
     carries="Block 0.",
     transition="The camera pushes in on block 0.",
     sound="Small ticks as the pages tick on, under the music.",
     check="Sixteen pages a block are drawn, and the note says a real block has hundreds.",
     facts=["f1"])

shot("s04", "kerja", "macro",
     voice="Data ditulis per *halaman,*",
     teaches="Writing goes one page at a time.",
     screen="Close on block 0, 2.2 times: its pages are 105 px squares, six lit cyan, ten empty. A small cyan packet drops into the next empty page, which lights. Chip: 'ditulis per halaman'.",
     motion="The camera pushes in over 0.6 s; the packet falls and lands on 'halaman' with a small flash.",
     carries="Block 0, close.",
     transition="No cut: a second packet comes down at the same block.",
     sound="A soft pop as the page is written.",
     check="One packet fills exactly one page.",
     facts=["f1"])

shot("s04b", "kerja", "macro",
     voice="tapi halaman yang terisi nggak bisa *ditimpa.*",
     teaches="A page that holds data cannot be written over: a changed copy goes to an empty page and the old one becomes useless.",
     screen="Close on block 0. A changed copy of page 2 comes down onto it, bounces off with a red cross, and lands in the next empty page instead; page 2 turns grey. Chips: 'nggak bisa ditimpa', then 'lama, nggak dipakai'.",
     motion="The changed copy hits page 2 on 'ditimpa' and bounces (a red flash and cross); it slides to page 6 and lights; page 2 greys.",
     carries="Block 0 with its first grey page.",
     transition="The camera pulls back to the whole grid.",
     sound="An error blip on the bounce, low under the voice.",
     check="The bounce reads as 'not allowed' (red), and the old page turns grey, not empty.",
     facts=["f2"])

shot("s05", "kerja", "diagram",
     voice="Harus dihapus dulu, dan hapusnya satu *blok* sekaligus.",
     teaches="Erasing works only on a whole block at once.",
     screen="The whole grid again. Block 2 is all grey (old data). A red frame closes around it; then all sixteen of its pages wipe in one flash, together. A chip: 'hapus 1 blok sekaligus'.",
     motion="The camera pulls back in 0.5 s. The frame draws round block 2 on 'dihapus'; on 'blok' a single bright sweep crosses it and every page empties on the same frame.",
     carries="The grid, now with one clean block.",
     transition="No cut: the grid starts to fill.",
     sound="A clean 'wipe' sweep on the erase.",
     check="All sixteen pages empty on the same frame: the erase is never page by page.",
     facts=["f2"])

# ── Babak 2: pas penuh ──────────────────────────────────────────────────────────────────────────────────────────────
shot("s06", "penuh", "wide",
     voice="[short pause] Nah, pas hampir *penuh,* halaman kosongnya *habis.*",
     teaches="The turn: when the storage is nearly full, there is no empty page left to write to.",
     screen="The grid from a little further back, with the spare block labelled 'blok cadangan' under it. Empty pages light one after another until none is left; a few are grey. The strip at the top fills and turns red: 'hampir penuh'. A chip in red: '0 halaman kosong'.",
     motion="Pages fill in a fast ripple from 'Nah' to 'penuh' (about 40 pages in 1.5 s); the strip turns red on 'penuh'; the stage light turns red; the chip lands on 'habis'.",
     carries="The full grid and the empty spare block.",
     transition="No cut: a photo arrives.",
     sound="A rising run of soft ticks as the pages fill; a low warning tone on 'habis', between words.",
     check="No empty page is left in the six blocks. The spare block stays empty.",
     facts=["f3"])

shot("s07", "penuh", "diagram",
     voice="Jadi buat nyimpan satu *foto,* hape harus mindahin data yang masih *dipakai.*",
     teaches="The extra work, step one: to make room, the phone's controller copies the pages still in use out of a block into a spare block.",
     screen="The full grid. A new photo (a generic landscape thumbnail) drops in at the top right and a red scan looks for an empty page. At the bottom left a chip 'pengendali' lights; at the bottom right a glass counter 'kerja ekstra: pindah 0, hapus 0'. Block 4, with the most grey pages, gets a red frame; its eleven cyan pages fly one by one to the spare block, the counter ticking 1 ... 11.",
     motion="The photo drops on 'foto'; the scan runs 0.5 s; the frame closes round block 4; the copies leave one every 0.2 s or so along short arcs and land in order; each landing ticks the counter.",
     carries="Block 4, left with grey pages only, and the photo still waiting.",
     transition="No cut: block 4 is erased.",
     sound="Quick soft ticks, one a page moved, low under the voice.",
     check="Exactly the eleven cyan pages of block 4 are moved; the counter ends at 11. The photo is not saved yet.",
     facts=["f4", "f5"])

shot("s08", "penuh", "diagram",
     voice="Terus blok lamanya *dihapus,* baru fotonya *masuk.*",
     teaches="Step two and three: the old block is erased, and only then is the photo written.",
     screen="The same picture. Block 4 is wiped in one flash; the counter's 'hapus' reads 1. The photo shrinks into a page and flies into the first empty page of the spare block, which lights. A chip: 'baru tersimpan'.",
     motion="The erase on 'dihapus'; the photo flies on 'fotonya' and lands on 'masuk'.",
     carries="The counter: 11 moved and 1 erased for one photo.",
     transition="The grid steps back and becomes the chart's first bar.",
     sound="The wipe sweep, then a satisfying small 'drop' as the photo lands.",
     check="The photo lands after the erase, never before.",
     facts=["f4"])

shot("s09", "penuh", "chart",
     voice="Makin penuh, makin sering kerja ekstra ini, makanya *lemot.*",
     teaches="The fuller the storage, the more pages are written for each page of new data: that extra work is the slowness.",
     screen="A chart on glass: 'ditulis per 1 halaman data baru', four bars at '60%', '80%', '90%', '97%' full, heights computed by the toy flash in sim.py (1,3×, 1,8×, 2,3×, 3×): cyan, cyan, amber (90% is the limit), red. Under it: 'model sederhana, bukan ukuran HP asli'.",
     motion="The bars rise one after another on 'Makin penuh, makin sering', each landing at its value with its figure; on 'lemot' the last one pulses red.",
     carries="The red of 'full', into the phone.",
     transition="Cut back to the phone.",
     sound="A small low hit on 'lemot', between words if the take allows.",
     check="Each bar's height is its value times 160 px and the figures agree with sim.json. The note says it is a simple model.",
     facts=["f5"])

shot("s10", "penuh", "ui",
     voice="Belum lagi, ruang buat file sementara ikut *sempit.*",
     teaches="A second cost: the system also needs free room for temporary files, and a full phone has none to give.",
     screen="The phone at 97%, its bar split into Foto, Aplikasi and Sistem from the first frame. Under it the breakdown rows and 'File sementara', whose room is already only a sliver. Small file tiles try to fit into the slot and pile up, red: 'nggak muat'.",
     motion="The breakdown rows land; small file tiles arrive and bump against the sliver of room; on 'sempit' the room squeezes shut and the chip 'nggak muat' pops.",
     carries="The phone.",
     transition="A quick cut to the roomy grid.",
     sound="A soft bump as the tiles hit the edge.",
     check="Nothing on the phone imitates a real brand's settings page.",
     facts=["f6"])

# ── Babak 3: biar ngebut ────────────────────────────────────────────────────────────────────────────────────────────
shot("s11", "lega", "compare",
     voice="Padahal kalau *lega,* fotonya langsung masuk.",
     teaches="The contrast: with free pages, the same photo is written at once, with no copying and no erasing.",
     screen="The grid with many empty pages, the strip at the top cyan and half full: 'lega'. The same photo drops straight into an empty page of block 0 with a cyan flash. The counter reads 'pindah 0, hapus 0'; a chip 'langsung masuk'.",
     motion="The photo falls in one quick move on 'langsung' and lands on 'masuk'; the counter stays at zero.",
     carries="The cyan, into the phone.",
     transition="Cut back to the phone.",
     sound="A bright, quick 'drop' on the landing (the release).",
     check="Same photo, same counter as s07 and s08, now at zero.",
     facts=["f4"])

shot("s12", "lega", "ui",
     voice="Jadi sisakan ruang kosong, paling nggak *sepuluh persen,* biar tetap *ngebut.*",
     teaches="What to do: keep some room free, at least about a tenth of the storage.",
     screen="The phone, already cyan: its bar falls from 90% to 80% as it is cleared; the figure changes at its values. A marker stands at 90% and the last tenth of the bar is outlined: '≥ 10% kosong'. The photo below is saved at once: 'tersimpan ✓'.",
     motion="The bar falls on 'sisakan ruang kosong'; the marker and its chip land on 'sepuluh persen'; the check lights on 'ngebut'. Slow push.",
     carries="The phone, dimmed, behind the recap.",
     transition="The cards rise over the phone.",
     sound="A gentle success tone on 'ngebut', after the word.",
     check="The figure shown always matches the bar. The marker sits at exactly 90% of the bar.",
     facts=["f7", "f8"])

shot("s13", "recap", "recap", 3.0,
     teaches="The three ideas in one frame, and the line to remember.",
     screen="Three glass cards, 866 px wide, at y 262, 486 and 710, each with a small picture: a block of pages with one page lit and the block outline red ('tulis per halaman, hapus per blok'); pages hopping to a new block ('penuh: pindah dulu, hapus, baru tulis'); a bar with its last tenth outlined ('sisakan ≥ 10% kosong'). Below, the poster line in metal type at 100 px on a dark glass plate: 'Sisakan ruang, / biar ngebut.', and under it a clean storage bar at 80% with its last tenth outlined, '≥ 10% kosong'.",
     motion="The cards rise one after another in the first 0.5 s; the poster lines slam in; a sheen crosses them. It holds for two seconds with a slow push.",
     transition="The film ends on this frame; it can loop to frame 0, the same phone.",
     sound="A soft whoosh as the cards rise, a small low impact under the poster line, the bed resolving.",
     check="Every figure matches the fact sheet. The poster is readable for at least two seconds.",
     facts=["f2", "f4", "f7"])

duration = shots[-1]["end"]

storyboard = {
    "title": "Kenapa HP makin lemot pas memorinya hampir penuh?",
    "question": "Kenapa sih hape kamu makin lemot pas memorinya hampir penuh?",
    "audience": "Pengguna HP sehari-hari di Indonesia yang nonton video pendek. Mereka tahu memori HP bisa penuh dan pernah merasa HP jadi lemot, tapi tidak tahu apa yang terjadi di dalam chip penyimpanannya.",
    "promise": "Chip penyimpanan HP menulis per halaman kecil tapi cuma bisa menghapus per blok besar; jadi pas hampir penuh, HP harus memindahkan data lama dan menghapus blok dulu sebelum bisa menulis, dan sistem juga kehabisan tempat buat file sementara. Makanya sisakan ruang kosong, paling nggak sekitar sepuluh persen.",
    "language": "id",
    "format": "1080x1920",
    "captions": "pop",
    "duration": round(duration, 3),
    "fps": 60,
    "poster": round((json.loads((HERE / "voice" / "voice.json").read_text())["duration"] if (HERE / "voice" / "voice.json").exists() else duration) - 1.45, 3),
    "voice": {"voice_id": "xlBOShi2835jfBgaEld4", "name": "Rafiq", "model": "eleven_v4", "language": "id"},
    "look": {
        "accent": "#2ee6ff",
        "accent2": "#ff3d55",
        "mood": "The kit's graphite stage, cool and clean. Electric cyan is data and speed (pages in use, the chip's light, a fast write); warning red is 'full' (the storage bar, the bounce, the block being cleaned). Grey is old data. The stage light sits on the phone, dives into the chip, turns red while the phone struggles and returns to cyan when it is fast again. A generic phone and a flash chip in lit 3D; the grid is a crisp glowing canvas.",
    },
    "music": {
        "track": "Composed for this film (ElevenLabs Music, music/bed.mp3)",
        "bpm": 100,
        "note": "A bed composed to the film's length after the take: light, curious tech; sparse under the voice; a small tension while the phone struggles and a release when it is fast again. The cuts follow the take, not a beat.",
    },
    "facts": [
        {"id": "f1", "claim": "Phone storage is NAND flash. Its smallest unit for reading and writing (programming) is the page; its smallest unit for erasing is the block, which holds many pages. Typical figures: pages of about 4 to 16 KB, blocks of 64 to 512 pages or more (one datasheet: 16 384-byte pages, 256 pages a block, about 4 MB). The film draws 16 pages a block and says on screen that a real block has hundreds.",
         "source": "Phison / NYCU course slides on NAND flash ('Page is the smallest unit for read and program; Block is the smallest unit for erase', 1 block = 256 pages of 16 KB); flashdba.com, 'Understanding Flash: Blocks, Pages and Program / Erases' (2014); a 64 Gb MLC NAND datasheet (16 384-byte page, 256 pages a block). Read through search summaries; the pages themselves could not be opened from this session."},
        {"id": "f2", "claim": "A NAND page that holds data cannot be overwritten in place: it must be erased first, and erasing works only on a whole block. So changed data is written to an already-erased page and the old copy is marked stale (no longer used).",
         "source": "Phison / NYCU slides ('Must erase before program (cannot overwrite)'); Hu et al., 'Write Amplification Analysis in Flash-Based Solid State Drives', SYSTOR 2009 (IBM Zurich); flashdba.com (2014). Read through search summaries."},
        {"id": "f3", "claim": "When free space runs out, there is no erased page to write to until the controller makes one by garbage collection. Simplification: the film shows the six blocks with no empty page at all; a real controller keeps hidden spare blocks (over-provisioning) and collects garbage in the background, but when the drive is nearly full it has to do it more often and while you wait.",
         "source": "Hu et al., SYSTOR 2009; Stanford CS111 lecture notes on flash memory (garbage collection and TRIM). Read through search summaries."},
        {"id": "f4", "claim": "Garbage collection: the controller picks a block (usually the one with the fewest valid pages), copies its still-valid pages to an erased block, then erases the old block. Those copies are writes nobody asked for (write amplification). In the film one photo is drawn as one page; a real photo of a few megabytes fills hundreds of pages. The 11 pages moved in s07 match the toy model's average at 97% full (10,7 pages a clean-up).",
         "source": "Hu et al., SYSTOR 2009 (greedy reclaiming); IBM Research report RZ3757; sim.py in this folder for the 10,7."},
        {"id": "f5", "claim": "Write amplification grows as spare space shrinks: with less room, the blocks being cleaned hold more valid pages, so more must be copied, and clean-ups are needed more often. In the toy flash of sim.py (7 blocks of 16 pages, greedy garbage collection, random overwrites) the pages written per page of new data are 1,29 at 60% full, 1,82 at 80%, 2,32 at 90% and 3,00 at 97%, and clean-ups per write rise from 0,08 to 0,19. The film shows these as 1,3×, 1,8×, 2,3× and 3×, labelled as a simple model, not a measured phone.",
         "source": "Hu et al., SYSTOR 2009 ('The impact of garbage collection on write amplification is influenced by the level of over-provisioning'); 'Modelling and Managing SSD Write-amplification' (arXiv 1504.00229); the arithmetic: sim.py in this folder (200 000 writes a level, seed 1)."},
        {"id": "f6", "claim": "The system and apps keep temporary (cache) files on the same storage, and Android may delete cache files when the device is low on internal storage. So a nearly full phone also has less room for the temporary files apps and the system use while working.",
         "source": "Android developer documentation on app-specific files ('When the device is low on internal storage space, Android may delete these cache files to recover space'), quoted via a forum post because developer.android.com could not be opened from this session."},
        {"id": "f7", "claim": "Google's Android help says a phone can start having issues when less than 10% of its storage is free. So the film says 'paling nggak sepuluh persen' (at least about ten percent) and shows '≥ 10% kosong'. Higher figures (15 to 20%) appear only in secondary sources and are not used.",
         "source": "Google, Android Help, 'Speed up a slow Android device' (support.google.com/android/answer/7667018), as quoted in search results; the page itself could not be opened from this session."},
        {"id": "f8", "claim": "TRIM: the phone's system tells the flash which pages belong to deleted files, so garbage collection need not copy them; Android has run this (fstrim) automatically during idle maintenance since Android 4.3 (2013). It cannot help when the storage is truly full of data you keep. Not spoken in the film; it is why deleting files really frees space for the controller. The percentages on the phone's screen (91%, 97%, 80%) are an illustration of a phone filling up.",
         "source": "AnandTech, 'Android 4.3 Update Brings TRIM to All Nexus Devices' (2013); Wikipedia, Trim (computing). Read through search summaries."},
    ],
    "acts": [
        {"id": "hook", "title": "Pertanyaan", "goal": "Ask the question while a phone fills up, then go inside to the chip.", "rail": False},
        {"id": "kerja", "title": "Cara kerja", "goal": "The two rules of flash: write a page at a time, erase a block at a time, never overwrite.", "rail": False},
        {"id": "penuh", "title": "Pas penuh", "goal": "Show the mechanism of the slowness: no empty page, so copy, erase, then write; the fuller, the more work; and no room for temporary files.", "rail": False},
        {"id": "lega", "title": "Biar ngebut", "goal": "The same write with room to spare, and what to do.", "rail": False},
        {"id": "recap", "title": "Rangkuman", "goal": "The ideas in one frame and the line to remember.", "rail": False},
    ],
    "shots": shots,
}

out = HERE / "storyboard.json"
out.write_text(json.dumps(storyboard, ensure_ascii=False, indent=2) + "\n")
import re
words = sum(len(re.sub(r"\[[^]]*\]", "", s["voice"]).replace("*", "").split()) for s in shots if s.get("voice"))
print(f"{len(shots)} shots, {sum(len(s['frames']) for s in shots)} frames, {words} words, about {duration:.1f} s before the take -> {out}")
# The take sets the times: once it is there, put them back after every build.
manifest = HERE / "voice" / "voice.json"
if manifest.exists() and json.loads(manifest.read_text()).get("version") == 2:
    kit = next(p for p in HERE.parents if (p / "kit" / "audio" / "voice.mjs").exists())
    subprocess.run(["node", str(kit / "kit" / "audio" / "voice.mjs"), str(HERE), "--retime"], check=False, stdout=subprocess.DEVNULL)
