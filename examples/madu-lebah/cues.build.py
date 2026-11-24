"""Writes cues.json from storyboard.json and events.json, so every sound sits on the event film.js draws.

    python3 examples/madu-lebah/sfx.build.py                         (the film's own sounds: sfx/*.wav)
    node kit/tools/render.mjs examples/madu-lebah --events           (events.json: every wash, line, word, event)
    python3 examples/madu-lebah/cues.build.py

The bed is composed for this film (music/bed.mp3: solo piano over a string pad, in F, about 72 BPM). The template asks
for soft brush and water sounds over it, and the storyboard's sound lines name the rest: a wet brush for each wash
that floods the page, a hiss of water for each bloom, a fine pen for the ink and the lettering (all under, as
textures); a slow honey drip and a quick nectar drop; wings in flight; a sip and a swallow; the enzyme's arrivals; a
pizzicato pluck on the cut; a hive murmur at the comb; the airy whirr of fanning; vapour; taps for the wax caps; the
lid on the jar. Nothing from a phone's interface.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
F = "../../examples/madu-lebah/sfx"
L = "lib"
sb = json.loads((HERE / "storyboard.json").read_text())
s = {x["id"]: x for x in sb["shots"]}
r = lambda x: round(x, 3)

END = sb.get("duration") or max(x["end"] for x in sb["shots"])
# At the seam the bed would rise for the half second after the last word and then drop 9 dB at once, because the
# first word starts 0.14 s into the film and the voice duck opens ahead of it: a 7 dB hole of 0.1 s at the loop.
# The ride keeps the bed down through that breath, so the last frame meets the first at the same level.
music = {"file": "../../examples/madu-lebah/music/bed-loop.wav", "start": 0, "lufs": -20, "fade_in": 0.01, "fade_out": 0.4, "duck_db": -7, "fill": True,
         "ride": [[0, 0], [r(END - 0.42), 0], [r(END - 0.08), -8.5], [r(END), -8.5]],
         "note": "Composed for this film (ElevenLabs Music, the prompt in music/bed.json); -20 LUFS under the voice; its rests patched from a bar away; its fading tail replaced by two earlier bars (bed.loop.py) so it carries through the loop."}
voice = {"duck_db": -9, "note": "The bed dips 9 dB under the voice: it is a quiet piano and must stay heard between sentences."}

ev = json.loads((HERE / "events.json").read_text())
events = []
last = {}
k = 0
for e in ev:
    kind, at, end = e["kind"], e["at"], e["end"]
    d = max(0.12, end - at)
    if kind in ("line", "write", "wash", "erase"):
        if at - last.get(kind, -9) < 0.12:
            continue  # two things drawn at once by one hand: one sound
        last[kind] = at
        k += 1
    if kind == "line":
        events.append({"t": r(at), "file": f"{L}/foley/pen_{k % 3 + 1}.wav", "db": -27, "trim": [0, r(min(0.9, d + 0.04))], "fade": 0.05, "under": True, "note": "ink drawn on"})
    elif kind == "write":
        events.append({"t": r(at), "file": f"{L}/foley/write_{k % 3 + 1}.wav", "db": -27, "trim": [0, r(min(1.8, d + 0.04))], "fade": 0.05, "under": True, "note": "a label written"})
    elif kind == "erase":
        events.append({"t": r(at), "file": f"{L}/foley/rub_{k % 2 + 1}.wav", "db": -27, "trim": [0, r(min(0.6, d + 0.1))], "fade": 0.08, "under": True, "note": "a label rubbed out"})
    elif kind == "wash":
        events.append({"t": r(at), "file": f"{F}/bloom_{k % 3 + 1}.wav", "db": -25, "trim": [0, r(min(1.0, d + 0.2))], "fade": 0.2, "under": True, "note": "a wash blooms in"})
    elif kind in ("reveal", "flood"):
        # each new plate floods in on a wet edge: a wet brush and a swash of water, then the hiss of it spreading
        n_rev = sum(1 for x in events if x.get("note", "").startswith("a new plate floods"))
        events.append({"t": r(at + 0.03), "file": f"{F}/wet_{n_rev % 3 + 1}.wav", "db": -12, "pan": [-0.25, 0.2, 0][n_rev % 3], "note": "a new plate floods in on a wet edge"})
        events.append({"t": r(at + 0.22), "file": f"{F}/bloom_{n_rev % 3 + 1}.wav", "db": -26, "trim": [0, 0.9], "fade": 0.3, "under": True, "note": "the flood spreads in the wet paper"})
    elif kind == "buzz":
        events.append({"t": r(at), "file": f"{F}/hum.wav", "db": -15, "trim": [0, r(d + 0.3)], "fade": 0.3, "fade_in": 0.08, "note": "her wings in flight"})
    elif kind == "land":
        events.append({"t": r(at), "file": f"{F}/tap_1.wav", "db": -16, "align": "peak", "note": "she lands"})
    elif kind == "enzyme":
        n_enz = sum(1 for x in events if x.get("note", "").startswith("an enzyme"))
        events.append({"t": r(at + 0.25), "file": f"{F}/tap_{n_enz % 2 + 1}.wav", "db": -12, "align": "peak", "pan": [-0.3, 0.1, -0.1, 0.3, 0][n_enz % 5], "duck": n_enz == 0, "note": f"an enzyme comes in with the nectar ({n_enz + 1})"})
    elif kind == "cap":
        n_cap = sum(1 for x in events if x.get("note", "").startswith("a column of cells"))
        events.append({"t": r(at + 0.18), "file": f"{F}/tap_{n_cap % 2 + 1}.wav", "db": -11, "align": "peak", "pan": [-0.35, -0.1, 0.15, 0.35][n_cap % 4], "note": f"a column of cells capped with wax ({n_cap + 1})"})
    elif kind == "fan":
        # the fanning has to be heard as an event over the bed when it starts, then carries on under the words
        events.append({"t": r(at + 0.05), "file": f"{F}/whirr.wav", "db": -12, "fade_in": 0.05, "trim": [0, 1.9], "fade": 0.6, "note": "wings fanning: the whirr starts"})
        events.append({"t": r(at + 1.5), "file": f"{F}/whirr.wav", "db": -19, "fade_in": 0.4, "trim": [0.3, 2.9], "fade": 0.6, "under": True, "note": "wings fanning"})
    elif kind == "drain":
        events.append({"t": r(at), "file": f"{F}/drain.wav", "db": -12, "note": "the water drains out of the column"})
    k += kind not in ("line", "write", "wash", "erase")

S = lambda i: s[i]["start"]
events += [
    # s01: the honey folding slowly; the nectar lets go fast; the question lands on a plucked note
    {"t": 0.95, "file": f"{F}/drip.wav", "db": -13, "align": "peak", "note": "honey folds onto itself, slowly"},
    {"t": 2.6, "file": f"{F}/drip.wav", "db": -16, "align": "peak", "note": "and again"},
    {"t": 3.31, "file": f"{F}/drop.wav", "db": -9, "align": "peak", "duck": True, "note": "the nectar drop lets go: quick, light"},
    {"t": 4.9, "file": f"{F}/note.wav", "db": -11, "align": "peak", "trim": [0, 1.4], "fade": 0.6, "note": "THE QUESTION: 'berubah?'"},
    # s03: the nectar pools in the flower's cup
    {"t": 7.4, "file": f"{F}/drop.wav", "db": -15, "align": "peak", "note": "nectar pools in the cup"},
    # s04-s05: she drinks; it goes down to the honey stomach
    {"t": 10.5, "file": f"{F}/sip.wav", "db": -12, "note": "her tongue takes the nectar"},
    {"t": 12.65, "file": f"{F}/swallow.wav", "db": -13, "align": "peak", "note": "into the honey stomach"},
    # s07: the cut
    {"t": 18.32, "file": f"{F}/pluck.wav", "db": -8, "align": "peak", "duck": True, "trim": [0, 1.3], "fade": 0.5, "note": "THE CUT: one sugar becomes two"},
    # s08: the hive; mouth to mouth
    {"t": r(S("s08")), "file": f"{F}/murmur.wav", "db": -23, "fade_in": 0.6, "under": True, "note": "the hive, close"},
    {"t": r(S("s08") + 4.1), "file": f"{F}/murmur.wav", "db": -24, "fade_in": 0.5, "trim": [0, 3.4], "fade": 0.8, "under": True, "note": "the hive, close"},
    {"t": 21.95, "file": f"{F}/sip.wav", "db": -13, "note": "the drop passes from mouth to mouth"},
    {"t": 22.95, "file": f"{F}/drop.wav", "db": -14, "align": "peak", "note": "the receiver has it"},
    # s09: into the cell
    {"t": 25.3, "file": f"{F}/drop.wav", "db": -12, "align": "peak", "note": "a film of nectar in the wax cell"},
    # s10b-s11: fanning, vapour
    {"t": r(S("s10b") + 2.8), "file": f"{F}/whirr.wav", "db": -21, "trim": [0, 1.4], "fade": 0.6, "under": True, "note": "wings fanning"},
    {"t": 30.15, "file": f"{F}/vapour.wav", "db": -15, "note": "water rises off the nectar"},
    # s12: the column slides; the water drains
    {"t": 32.0, "file": f"{F}/brush_2.wav", "db": -17, "trim": [0, 0.6], "fade": 0.2, "note": "the copy of the column slides across"},
    {"t": 32.62, "file": f"{F}/bloom_2.wav", "db": -24, "trim": [0, 1.0], "fade": 0.4, "under": True, "note": "the water leaves the wash"},
    # s14: the lid
    {"t": 38.7, "file": f"{F}/clink.wav", "db": -9, "align": "peak", "duck": True, "trim": [0, 1.0], "fade": 0.4, "note": "the lid set on the jar"},
    # s15: the answer: one soft note as the honey arrives
    {"t": 45.95, "file": f"{F}/note.wav", "db": -14, "align": "peak", "trim": [0, 1.4], "fade": 0.6, "note": "honey, the answer"},
    # s16: the honey folding again, into the loop
    {"t": 48.0, "file": f"{F}/drip.wav", "db": -16, "align": "peak", "note": "honey folds onto itself again"},
]
# Under one continuous voice a named sound has to rise over the words and the bed to be heard: every one that is
# not a texture goes up 6 dB and dips the bed as it lands (mix.py measures the lift of each).
# The drops and the swallow sat loudest of all, louder than the moments they mark: they come down 5 dB. The taps are
# small, but each cap and each enzyme is one thing happening, so each is heard.
LEVEL = {"wet": -15, "brush": -14, "hum": -16, "drip": -14, "drop": -15, "swallow": -15, "drain": -12, "whirr": -13, "note": -11, "pluck": -10, "tap": -6, "sip": -11, "clink": -13, "vapour": -12}
for e in events:
    if e.get("under"):
        continue
    name = e["file"].rsplit("/", 1)[1].rsplit(".", 1)[0]
    e["db"] = next((v for kk, v in LEVEL.items() if name.startswith(kk)), -14)
    e.setdefault("duck", True)
# her feet landing are foley under the words; the second and later enzymes come quick on each other, so they do not
# dip the bed again, and sit a little lower than the first
for e in events:
    if e["note"] == "she lands":
        e.update({"under": True, "db": -16})
        e.pop("duck", None)
    elif e["note"].startswith("an enzyme") and not e["note"].endswith("(1)"):
        e.update({"db": -9, "duck": False})
# Levels, measured in the finished mix with the effects isolated (the full mix minus the gain-matched mix without
# them): each named sound's loudest 50 ms in its first 0.4 s sits 4 to 8 dB under the voice and music over that same
# 0.4 s, so it is clearly heard without rising over the words. TUNE holds the level each one needed for that (dBFS
# peak, before the master gain), keyed by its time and sound; a sound not in it keeps the level above.
TUNE = json.loads((HERE / "cues.tune.json").read_text()) if (HERE / "cues.tune.json").exists() else {}
for e in events:
    key = f"{e['t']:.2f} {e['file'].rsplit('/', 1)[1].rsplit('.', 1)[0]}"
    if key in TUNE:
        e["db"] = TUNE[key]
# A sound that lands on a spoken word is marked under: it is heard inside the sentence, not as a hit between
# sentences, so the lift check (a rise over the half second before) leaves it out. It keeps its level and its dip.
WORDS = [(w[0], w[1]) for sh in json.loads((HERE / "voice" / "voice.json").read_text())["film"].values() for w in sh["words"]]
for e in events:
    if e.get("under"):
        continue
    onset = e["t"] - (0.03 if e.get("align") == "peak" else 0)
    if any(a - 0.03 <= onset <= b for a, b in WORDS):
        e["under"] = True
events.sort(key=lambda e: e["t"])
cues = {"music": music, "voice": voice, "events": events}
out = ["{", f'  "music": {json.dumps(music, ensure_ascii=False)},', f'  "voice": {json.dumps(voice, ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(events) - 1 else ''}" for i, e in enumerate(events)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(events)} events -> cues.json")
