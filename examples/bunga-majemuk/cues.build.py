"""Writes cues.json from storyboard.json, so every sound sits on the event it belongs to (the times film.js uses).

    python3 examples/bunga-majemuk/cues.build.py

No voice: the bed sits at -18 LUFS and the effects follow the calm levels of references/sound.md. Two hits only:
the payoff of the comparison (Rp174,5 juta lands, s12) and the poster. Everything else is small and on a real
event: a coin landing, a slice glinting, a label or a ladder step locking, a whip.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
sb = json.loads((HERE / "storyboard.json").read_text())
s = {x["id"]: x for x in sb["shots"]}
D = sb["duration"]
L = "lib/sfx"
r = lambda x: round(x, 3)
st = lambda i: s[i]["start"]
ev = []


def add(t, name, db, note, **more):
    ev.append({"t": r(t), "file": f"{L}/{name}.mp3", "db": db, "align": "peak", **more, "note": note})


add(0.62, "shimmer_2", -17, "a coin is born out of the stack")
add(1.95, "card_2", -11, "the child coin lands beside its stack")
add(st("s02") - 0.2, "whoosh_fast_5", -19, "the camera glides to the lesson framing")
add(st("s02") + 0.8, "tick_1", -15, "the pokok label locks")
add(st("s03") + 0.4, "shimmer_1", -16, "ten slices slide out of the coins", trim=[0, 1.4], fade=0.5)
add(st("s04") + 1.05, "card_2", -11, "ten tenths become one coin: bunga Rp1 juta")
add(st("s05") + 0.85, "card_2", -14, "year 1's coin lands on the blue pile")
for y in range(2, 6):
    add(st("s05") + 0.85 + (y - 2) * 0.78 + 0.77, "tick_2", -17, f"year {y}'s coin lands on the blue pile", pan=0.4)
add(st("s06"), "whoosh_fast_3", -15, "whip to the chart")
add(st("s06") + 1.95, "pop_1", -15, "Rp40 juta tag")
add(st("s07"), "whoosh_fast_3", -15, "whip back to the coins")
add(st("s07") + 1.7, "card_2", -11, "the bunga coin lands on the stack")
add(st("s08") + 1.2, "shimmer_2", -15, "the slice from last year's bunga flares: bunga dari bunga")
add(st("s09"), "card_2", -11, "eleven slices become Rp1,1 juta")
add(st("s09") + 0.6, "pop_2", -18, "the thin slice pulses")
add(st("s10"), "whoosh_fast_5", -15, "vertical whip to the chart")
for k in range(1, 6):
    add(st("s10") + 0.35 + 1.7 * k / 5, "tick_1", -20, f"interest chip {k}")
add(st("s12") + 0.05, "impact_big_3", -6, "THE PAYOFF: Rp174,5 juta against Rp40 juta", duck=0.8, trim=[0, 1.3], fade=0.8)
add(st("s12") + 0.05, "sub_drop_2", -13, "its body", trim=[0, 1.0], fade=0.5)
add(st("s13") + 1.2, "tick_2", -15, "the doubling point is ringed")
add(st("s14") + 1.0, "pop_3", -15, "≈ 7,2 tahun slams in")
for k in range(4):
    add(st("s14") + 1.25 + k * 0.55, "tick_1", -17, f"ladder step {k + 1}: ×2")
add(st("s15") - 0.2, "whoosh_long_2", -17, "the curve becomes coin columns", trim=[0, 2.0], fade=0.8)
add(st("s17") + 0.4, "impact_big_1", -7, "the poster line", duck=0.8, trim=[0, 2.2], fade=1.2)

cues = {
    "music": {"file": "lib/music/xceed_thru_johann.mp3", "start": 0.679, "lufs": -18, "fade_in": 0.01, "fade_out": 1.8, "duck_db": -6,
              "note": "86 BPM, started 0.679 s in so a beat falls on frame 0; every cut is a whole number of beats. -18 LUFS: no voice to make room for."},
    "events": ev,
}
out = ["{", f'  "music": {json.dumps(cues["music"], ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(ev) - 1 else ''}" for i, e in enumerate(ev)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(ev)} events -> cues.json")
