"""Writes cues.json from storyboard.json and events.json, so every sound sits on what film.js does at that moment.

    node kit/tools/render.mjs examples/kenapa-musim --events     (events.json: every piece set down, flag, move)
    python3 examples/kenapa-musim/cues.build.py

The bed is composed for this film (music/bed.mp3, kit/audio/music.mjs); its rests are patched from a bar away
("fill"), so it is heard between sentences. The effects are the template's: a squish for every piece of clay set
down, a small wooden knock for every toothpick flag, a soft whoosh when the camera crosses the table, a click for
the torch, a clap on the payoff (kit/audio/foley.py makes the squishes, knocks and the clap).
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
L = "lib"
sb = json.loads((HERE / "storyboard.json").read_text())
s = {x["id"]: x["start"] for x in sb["shots"]}
r = lambda x: round(x, 3)

music = json.loads((HERE / "cues.json").read_text())["music"]
music.update({"lufs": -20, "start": 0, "fade_in": 0.01, "fade_out": 0.6, "duck_db": -6, "fill": True,
              "note": "Composed for this film (ElevenLabs Music, the prompt in music/bed.json); -20 LUFS under the voice; its rests patched from a bar away."})
voice = {"duck_db": -8, "note": "The bed dips 8 dB under the voice (not the default 11), so it stays heard."}

events = []
k = {"plop": 0, "flag": 0, "travel": 0, "lift": 0}
last = {}
for e in json.loads((HERE / "events.json").read_text()):
    kind, t = e["kind"], e["at"]
    if t - last.get(kind, -9) < 0.07:
        continue  # pieces set down together by one hand: one sound
    last[kind] = t
    if kind == "plop":
        k["plop"] += 1
        events.append({"t": r(t), "file": f"{L}/foley/squish_{k['plop'] % 3 + 1}.wav", "db": -11, "align": "peak", "note": "clay set down"})
    elif kind == "bead":
        events.append({"t": r(t), "file": f"{L}/foley/squish_3.wav", "db": -19, "align": "peak", "note": "a bead pressed on"})
    elif kind == "flag":
        k["flag"] += 1
        events.append({"t": r(t), "file": f"{L}/foley/knock_{k['flag'] % 2 + 1}.wav", "db": -11, "align": "peak", "note": "a toothpick flag stuck in"})
    elif kind == "lift":
        k["lift"] += 1
        events.append({"t": r(t + 0.05), "file": f"{L}/sfx/pop_{k['lift'] % 3 + 1}.mp3", "db": -22, "align": "peak", "note": "lifted away"})
    elif kind == "travel":
        k["travel"] += 1
        mid = (e["at"] + e["end"]) / 2
        events.append({"t": r(mid), "file": f"{L}/sfx/whoosh_long_{k['travel'] % 3 + 1}.mp3", "db": -21, "align": "peak", "note": "the camera crosses the table"})
    elif kind == "move" and e["end"] - e["at"] >= 0.7:
        events.append({"t": r((e["at"] + e["end"]) / 2), "file": f"{L}/sfx/whoosh_fast_2.mp3", "db": -27, "align": "peak", "note": "a slow dolly"})
    elif kind == "click":
        events.append({"t": r(t), "file": f"{L}/sfx/click_2.mp3", "db": -10, "align": "peak", "note": "the torch clicks on"})

events += [
    {"t": 0.35, "file": f"{L}/sfx/shimmer_1.mp3", "db": -22, "align": "peak", "note": "snow over the village"},
    {"t": 21.3, "file": f"{L}/foley/knock_1.wav", "db": -13, "align": "peak", "note": "the toothpick tips to 23.4 degrees"},
    {"t": 45.45, "file": f"{L}/sfx/whoosh_fast_1.mp3", "db": -20, "align": "peak", "note": "the torch tips"},
    {"t": 60.03, "file": f"{L}/foley/clap_1.wav", "db": -8, "align": "peak", "note": "THE PAYOFF: 'miring ✓'"},
]
events.sort(key=lambda e: e["t"])
cues = {"music": music, "voice": voice, "events": events}
out = ["{", f'  "music": {json.dumps(music, ensure_ascii=False)},', f'  "voice": {json.dumps(voice, ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(events) - 1 else ''}" for i, e in enumerate(events)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(events)} events -> cues.json")
