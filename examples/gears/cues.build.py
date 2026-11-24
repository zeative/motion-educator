"""Writes cues.json from storyboard.json and events.json, so every sound sits on the event film.js draws.

    node kit/tools/render.mjs examples/gears --events     (events.json: every line drawn, word written, line rubbed
                                                           out, and every sound the picture makes, from film.js)
    python3 examples/gears/sfx.build.py                    (the sounds and the bed on the board's 75 BPM grid)
    python3 examples/gears/cues.build.py

The bed is composed for this film (music/bed.mp3, its prompt in music/bed.json), stretched onto the board's beat
(music/bed-75.mp3, sfx.build.py says why). The effects are a drawing table and a machine, nothing from a phone:
a technical pen on every line, a ruler under every straight one, a compass on every circle, lettering written and
rubbed out (these are textures, marked "under", and set loud enough to be heard over the bed: they are the template's own sound); the events are the gear teeth clicking past each other, the bell on
each x3, the chain running and dropping onto the teeth, the freewheel, the ruler tapped on the question mark and the
3, the sheets sliding, and three ticks rising for the summary.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
L, OWN = "lib", "../../examples/gears/sfx"
r = lambda x: round(x, 3)
sb = json.loads((HERE / "storyboard.json").read_text())

music = {"file": "../../examples/gears/music/bed-75.mp3", "start": 0, "lufs": -24.5, "fade_in": 0.01, "fade_out": 2.4, "duck_db": -4, "fill": True,
         "note": "Composed for this film (ElevenLabs Music, prompt in music/bed.json) at 70 BPM, stretched to the board's 75 BPM by sfx.build.py; -24.5 LUFS under captions only, so the events stand out of it."}

events, last = [], {}
count = {}
for e in json.loads((HERE / "events.json").read_text()):
    k, at, d = e["kind"], e["at"], max(0.0, e["end"] - e["at"])
    n = count[k] = count.get(k, 0) + 1
    if k in ("pen", "ruler", "compass", "write", "erase") and at - last.get(k, -9) < 0.07:
        continue  # two things drawn at once by one hand: one sound
    last[k] = at
    if k == "pen":
        events.append({"t": r(at), "file": f"{L}/foley/pen_{n % 3 + 1}.wav", "db": -15, "trim": [0, r(min(0.9, d + 0.05))], "fade": 0.05, "under": True, "note": "the pen draws an outline"})
    elif k == "ruler":
        events.append({"t": r(at), "file": f"{OWN}/rule_{n % 3 + 1}.wav", "db": -14, "trim": [0, r(min(0.9, d + 0.05))], "fade": 0.05, "under": True, "note": "a line along the ruler"})
    elif k == "compass":
        events.append({"t": r(at), "file": f"{OWN}/compass_{n % 2 + 1}.wav", "db": -15, "trim": [0, r(min(0.9, d + 0.05))], "fade": 0.06, "under": True, "note": "the compass goes round"})
    elif k == "write":
        events.append({"t": r(at), "file": f"{L}/foley/write_{n % 3 + 1}.wav", "db": -19, "trim": [0, r(min(1.8, d + 0.04))], "fade": 0.05, "under": True, "note": "lettering written"})
    elif k == "erase":
        events.append({"t": r(at), "file": f"{L}/foley/rub_{n % 2 + 1}.wav", "db": -15, "trim": [0, r(min(0.6, d + 0.08))], "fade": 0.08, "under": True, "note": "rubbed out"})
    elif k == "tooth":
        events.append({"t": r(at), "file": f"{OWN}/tooth_1.wav", "db": -6.5, "align": "peak", "duck": True, "note": e.get("note", "a tooth passes")})
    elif k == "tooth2":
        events.append({"t": r(at), "file": f"{OWN}/tooth_2.wav", "db": -7, "align": "peak", "note": e.get("note", "a tooth of the big gear passes")})
    elif k == "tooth-soft":
        events.append({"t": r(at), "file": f"{OWN}/tooth_3.wav", "db": -17, "align": "peak", "under": True, "note": e.get("note", "a tooth passes")})
    elif k == "tick":
        events.append({"t": r(at), "file": f"{OWN}/tap_1.wav", "db": -3.5, "align": "peak", "note": e.get("note", "the ruler tapped")})
    elif k == "tick-up":
        step = sum(1 for x in events if "summary line" in x["note"])
        events.append({"t": r(at), "file": f"{OWN}/tap_{step + 2}.wav", "db": -4.5, "align": "peak", "note": e.get("note", "a summary line")})
    elif k == "ping":
        events.append({"t": r(at), "file": f"{OWN}/ping_1.wav", "db": -4, "align": "peak", "duck": True, "trim": [0, 1.5], "fade": 0.6, "note": e.get("note", "x3")})
    elif k == "chain":
        if d > 0.7:  # s10: the chain drawn on round the drivetrain, link-run by link-run
            events.append({"t": r(at), "file": f"{OWN}/chain_1.wav", "db": -4, "trim": [0, r(d + 0.05)], "fade": 0.12, "duck": True, "note": "the chain runs on"})
        else:  # s12: the chains laid over the cogs, a moment before they drop onto the teeth (the drop is the event)
            events.append({"t": r(at), "file": f"{OWN}/chain_2.wav", "db": -15, "trim": [0, r(d + 0.05)], "fade": 0.12, "under": True, "note": "the chains laid over the cogs"})
    elif k == "drop":
        events.append({"t": r(at), "file": f"{OWN}/drop_1.wav", "db": -5, "align": "peak", "note": e.get("note", "the chains drop onto the teeth")})
    elif k == "slide":
        events.append({"t": r(at), "file": f"{OWN}/paper_{n % 3 + 1}.wav", "db": -6, "note": e.get("note", "a sheet slides")})
    elif k == "roll11":
        events.append({"t": r(at), "file": f"{OWN}/chaincog_11.wav", "db": -14, "pan": -0.15, "under": True, "note": "the chain runs onto the 11 while its wheel rolls 2.91 turns (pedalling: no freewheel clicks)"})
    elif k == "roll33":
        events.append({"t": r(at), "file": f"{OWN}/chaincog_33.wav", "db": -15, "pan": 0.15, "under": True, "note": "the chain runs onto the 33 at the same speed; its wheel rolls 0.97 turn"})
    elif k == "roll":
        events.append({"t": r(at), "file": f"{OWN}/paper_2.wav", "db": -16, "under": True, "note": "the cogs roll away off the sheet"})
    elif k == "creep":
        events.append({"t": r(at), "file": f"{OWN}/chaincog_slow.wav", "db": -14, "under": True, "note": "a slow pedal stroke on the big cog: a roller seats every 0.45 s"})
    # "silent" and "whoosh" make no sound: the board asks for no whooshes, and a part drawn beside another is one hand

events.sort(key=lambda e: e["t"])
cues = {"music": music, "events": events}
out = ["{", f'  "music": {json.dumps(music, ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(events) - 1 else ''}" for i, e in enumerate(events)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(events)} events -> cues.json ({sum(1 for e in events if not e.get('under'))} events that must be heard, the rest textures)")
