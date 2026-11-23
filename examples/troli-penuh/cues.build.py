"""Writes cues.json from storyboard.json and events.json, so every sound sits on the event film.js draws.

    node kit/tools/render.mjs examples/troli-penuh --events     (events.json: every line, word and erasure)
    python3 examples/troli-penuh/cues.build.py

The bed is composed for this film (music/bed.mp3, kit/audio/music.mjs). The effects are a hand and paper: a pen on
every line drawn and every word written, a rub for every erasure (kit/audio/foley.py makes these), a sheet laid down
for each fresh page, thumps for the shopping, a spring for the question, a clap for the payoff, wheels and a heel
skidding where they move. Nothing from a phone's interface.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
L = "lib"
sb = json.loads((HERE / "storyboard.json").read_text())
s = {x["id"]: x for x in sb["shots"]}
r = lambda x: round(x, 3)
# film.js's own numbers for s12: both reach the line at RUN_AT + 0.5; the empty one stops T[0] later, the full one T[1]
V, STOP_EMPTY = 600, 180
T = [2 * STOP_EMPTY / V, 2 * STOP_EMPTY * 3 / V]
RUN_AT = 32.6
GRAB = s["s11"]["start"]

music = json.loads((HERE / "cues.json").read_text())["music"]
music.update({"lufs": -20, "start": 0, "fade_in": 0.01, "fade_out": 0.6, "duck_db": -6, "fill": True,
              "note": "Composed for this film (ElevenLabs Music, the prompt in music/bed.json); -20 LUFS under the voice."})
voice = {"duck_db": -8, "note": "The bed dips 8 dB under the voice (not the default 11): it is light and must stay heard between sentences."}

# The pen: one sound per line, word or erasure film.js logged, trimmed to how long it takes, variants in turn.
pen = []
last = {}
for k, e in enumerate(json.loads((HERE / "events.json").read_text())):
    if e["at"] - last.get(e["kind"], -9) < 0.06:
        continue  # two things drawn at once by one hand: one sound
    last[e["kind"]] = e["at"]
    d = max(0.12, e["end"] - e["at"])
    if e["kind"] == "line":
        pen.append({"t": r(e["at"]), "file": f"{L}/foley/pen_{k % 3 + 1}.wav", "db": -17, "trim": [0, r(min(0.9, d + 0.04))], "fade": 0.05, "note": "a line drawn"})
    elif e["kind"] == "write":
        pen.append({"t": r(e["at"]), "file": f"{L}/foley/write_{k % 3 + 1}.wav", "db": -18, "trim": [0, r(min(1.8, d + 0.04))], "fade": 0.05, "note": "a word written"})
    elif e["kind"] == "erase":
        pen.append({"t": r(e["at"]), "file": f"{L}/foley/rub_{k % 2 + 1}.wav", "db": -17, "trim": [0, r(min(0.6, d + 0.1))], "fade": 0.08, "note": "rubbed out"})

turns = ["s03", "s05", "s06", "s07", "s09", "s10", "s12", "s13", "s14"]
events = pen + [
    # A fresh sheet laid over the last: it starts 0.3 s before the shot and lands most of the way in 0.15 s.
    *[{"t": r(s[i]["start"] - 0.22), "file": f"{L}/sfx/card_{(k % 3) + 1}.mp3", "db": -8, "align": "peak", "note": f"a fresh sheet laid down ({i})"} for k, i in enumerate(turns)],
    {"t": 1.05, "file": f"{L}/foley/thump_2.wav", "db": -17, "align": "peak", "note": "the shove: his weight goes into it"},
    {"t": r(s["s02"]["start"] + 0.12), "file": f"{L}/foley/boing_1.wav", "db": -15, "align": "peak", "note": "the question mark springs up"},
    {"t": 10.95, "file": f"{L}/foley/pen_3.wav", "db": -15, "trim": [0, 0.5], "fade": 0.1, "note": "the marker under 'Kelembaman'"},
    {"t": 12.85, "file": f"{L}/foley/thump_1.wav", "db": -17, "align": "peak", "note": "the shove that only starts it creeping"},
    {"t": r(s["s07"]["start"] + 0.15), "file": f"{L}/foley/scrape_1.wav", "db": -27, "trim": [0, 1.0], "fade": 0.4, "fade_in": 0.1, "note": "the empty trolley rolls onto the scale"},
    {"t": r(s["s07"]["start"] + 1.2), "file": f"{L}/sfx/tick_2.mp3", "db": -13, "align": "peak", "note": "the scale reads 21 kg"},
    *[{"t": r(s["s08"]["start"] + 0.1 + i * 0.32 + 0.25), "file": f"{L}/foley/thump_{i % 2 + 1}.wav", "db": -11, "pan": 0.12 * (i - 1.5), "align": "peak", "note": f"shopping {i + 1} lands in the basket"} for i in range(4)],
    {"t": r(s["s08b"]["start"] + 0.6), "file": f"{L}/sfx/tick_1.mp3", "db": -15, "align": "peak", "note": "the scale turns to 63 kg"},
    {"t": 23.25, "file": f"{L}/foley/pen_2.wav", "db": -15, "trim": [0, 0.45], "fade": 0.1, "note": "the marker under 3×"},
    {"t": 25.0, "file": f"{L}/sfx/whoosh_long_2.mp3", "db": -22, "align": "peak", "note": "both trolleys pushed off"},
    {"t": r(s["s10"]["start"] - 0.3), "file": f"{L}/foley/scrape_1.wav", "db": -28, "trim": [0, 2.2], "fade": 0.5, "fade_in": 0.2, "note": "it rolls along on its own"},
    {"t": r(s["s10"]["start"] + 0.02), "file": f"{L}/foley/boing_1.wav", "db": -19, "align": "peak", "note": "THE TURN: 'Masalahnya belum selesai'"},
    {"t": r(GRAB + 0.25), "file": f"{L}/foley/squeak_1.wav", "db": -20, "trim": [0, 1.4], "fade": 0.4, "note": "his heels slide as it drags him on"},
    {"t": r(RUN_AT + 0.5), "file": f"{L}/foley/scrape_1.wav", "db": -21, "pan": -0.25, "trim": [0, r(T[0])], "fade": 0.1, "note": "the empty trolley skids to a stop"},
    {"t": r(RUN_AT + 0.5), "file": f"{L}/foley/scrape_1.wav", "db": -19, "pan": 0.25, "trim": [0, r(T[1])], "fade": 0.25, "note": "the full one skids three times as far"},
    {"t": r(RUN_AT + 0.5 + T[0]), "file": f"{L}/sfx/tick_1.mp3", "db": -15, "align": "peak", "note": "the empty trolley has stopped"},
    {"t": r(RUN_AT + 0.5 + T[1]), "file": f"{L}/sfx/tick_1.mp3", "db": -13, "align": "peak", "note": "the full one stops, three times further on"},
    {"t": 37.95, "file": f"{L}/foley/clap_1.wav", "db": -6, "align": "peak", "note": "THE PAYOFF: 'massa' gets its marker"},
]
events.sort(key=lambda e: e["t"])
cues = {"music": music, "voice": voice, "events": events}
out = ["{", f'  "music": {json.dumps(music, ensure_ascii=False)},', f'  "voice": {json.dumps(voice, ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(events) - 1 else ''}" for i, e in enumerate(events)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(events)} events -> cues.json")
