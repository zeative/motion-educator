"""Writes cues.json from events.json, so every sound sits on the frame film.js draws its event on.

    node kit/tools/render.mjs examples/jantung-berlari --events     (events.json: every beat, coin, blip, cut)
    python3 examples/jantung-berlari/sfx.build.py                   (sfx/*.wav: the 8-bit effects)
    python3 examples/jantung-berlari/cues.build.py

The bed is composed for this film (music/bed.mp3: a chiptune at 150 beats a minute whose kick is the running heart).
The effects are a game console's, synthesised by sfx.build.py: a coin for every litre and every oxygen pixel
delivered, a thump for every heartbeat the picture shows close up, an arpeggio for the nerve signal, the power-up
when the pacemaker fires, monitor blips for the beat strips, a level-up on the result. Footsteps, the low-oxygen
alarm and the small "used" blips are textures under the picture ("under": true).
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
FX = "../../examples/jantung-berlari/sfx"
sb = json.loads((HERE / "storyboard.json").read_text())
s = {x["id"]: x for x in sb["shots"]}
r = lambda x: round(x, 3)

music = json.loads((HERE / "cues.json").read_text())["music"]
ev_all = json.loads((HERE / "events.json").read_text())
SPARK = next(e["at"] for e in ev_all if e["kind"] == "powerup")
music.update({
    "file": "../../examples/jantung-berlari/music/bed-film.mp3", "start": 0, "lufs": -20, "fade_in": 0.01, "fade_out": 0.6, "duck_db": -6, "fill": True,
    # The pause ducks the bed (s02). Through the rest the bed's kick is filtered out (bed.build.py), so the heart's own
    # thump at 75 a minute is the beat heard there.
    "ride": [[0, 0], [s["s02"]["start"] - 0.05, 0], [s["s02"]["start"] + 0.1, -8], [s["s03"]["start"] - 0.1, -8], [s["s03"]["start"] + 0.15, 0], [sb["duration"], 0]],
    "note": "Composed for this film (ElevenLabs Music, the prompt in music/bed.json), its kick filtered out through the rest (music/bed-film.mp3, bed.build.py); -20 LUFS under the voice; ducked under the pause.",
})
voice = {"duck_db": -8, "note": "The bed dips 8 dB under the voice (not the default 11): its kick is the heartbeat and should stay heard."}

# kind: (file, peak dB, extra). Levels set by measurement in the finished mix (each effect's loudness over its first
# 0.4 s against the voice and the music at that moment): the cues that carry the story (the power-up, the level-up,
# the low-oxygen alarm, the heartbeats) sit about 4 to 8 dB under the voice and the music; the rest lower; no effect is
# pushed over a word. Textures heard as a layer are "under".
SOUNDS = {
    "used": ("used", -34, {"under": True}),
    "beep": ("beep", -17, {}),
    "coin_soft": ("coin_soft", -32, {"under": True}),
    "pulse": ("pulse", -28, {"under": True}),
    "thump_rest": ("thump_soft", -6, {}),
    "coin": ("coin", -20, {"trim": [0, 0.28], "fade": 0.1}),
    "squelch": ("squelch", -12, {}),
    "dissolve": ("zoom", -24, {}),
    "wipe": ("wipe", -24, {}),
    "pan": ("slide", -25, {}),
    "pause": ("pause", -20, {"duck": True, "trim": [0, 0.3]}),
    "bump": ("bump", -12, {"duck": True}),
    "ding": ("ding", -20, {}),
    "thump": ("thump", -10, {}),
    "heavy": ("heavy", -4, {"duck": True}),
    "tally": ("tally", -19, {"duck": True}),
    "ping": ("ping", -20, {"trim": [0, 0.36], "fade": 0.12}),
    "powerup": ("powerup", -17, {"duck": True}),
    "blip_lo": ("blip", -19, {}),
    "blip_hi": ("blip", -19, {}),
    "bracket": ("bracket", -21, {}),
    "stack": ("stack", -30, {"under": True}),
    "sweep": ("sweep", -30, {"under": True}),
    "thud": ("thud", -10, {"duck": True}),
    "levelup": ("levelup", -17, {"duck": True}),
    "ok": ("ok", -14, {}),
    "menu": ("menu", -15, {}),
    "drop": ("drop", -19, {}),
    "victory": ("victory", -28, {}),
    "slide": ("lift", -31, {}),
    "rise": ("rise", -18, {}),
}
LEVEL = json.loads(__import__("os").environ.get("FX_LEVEL", "{}"))  # tuning: {"kind": dB}
for k, v in LEVEL.items():
    SOUNDS[k] = (SOUNDS[k][0], v, SOUNDS[k][2])
# A run: the same sound again within RUN seconds of the last. Its first is the event the viewer hears land; the rest
# keep time with the picture but are heard as one run (a texture), a little lower.
RUN = {"coin": 0.3, "blip": 0.9, "heavy": 0.5, "thump": 0.9, "thump_rest": 0.9, "beep": 0.4, "arp": 9, "arp2": 9}
KEY = {"powerup", "levelup", "beep", "thump", "thump_rest", "heavy", "pause", "tally", "ping"}
SPOKEN = [(w[0], w[1]) for line in json.loads((HERE / "voice" / "voice.json").read_text())["film"].values() for w in line["words"]]
events = []
last = {}
arp = {"arp": 0, "arp2": 0}
for e in ev_all:
    kind, t = e["kind"], e["at"]
    if t - last.get(kind, -9) < 0.07:
        continue  # two of the same on one frame: one sound
    family = "blip" if kind.startswith("blip") else kind  # the two strips' blips are one run
    in_run = family in RUN and t - last.get(family, -9) <= RUN[family]
    last[kind] = last[family] = t
    if kind in arp:
        arp[kind] += 1
        events.append({"t": r(t), "file": f"{FX}/arp_{min(12, arp[kind] + (0 if kind == 'arp' else 4))}.wav", "db": -27, "note": e["note"], "under": True})
        continue
    name, db, extra = SOUNDS[kind]
    if in_run and kind not in ("thump", "thump_rest"):
        extra = {**{k: v for k, v in extra.items() if k != "duck"}, "under": True}
        db -= 8 if kind == "coin" else 3
    # An effect that is not one of the story's key cues and lands on a spoken word cannot rise over it without
    # masking it: it keeps its level and is marked as heard under the voice.
    elif kind not in KEY and not extra.get("under") and any(a - 0.03 <= t <= b + 0.03 for a, b in SPOKEN):
        extra = {**extra, "under": True}
        e = {**e, "note": e["note"] + " (under the voice: lands on a word)"}
    events.append({"t": r(t), "file": f"{FX}/{name}.wav", "db": db, "note": e["note"], **extra})
events.sort(key=lambda e: e["t"])
cues = {"music": music, "voice": voice, "events": events}
out = ["{", f'  "music": {json.dumps(music, ensure_ascii=False)},', f'  "voice": {json.dumps(voice, ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(events) - 1 else ''}" for i, e in enumerate(events)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(events)} events -> cues.json")
