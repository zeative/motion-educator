"""Writes cues.json from events.json, so every sound sits on the thing film.js draws or moves.

    node kit/tools/render.mjs examples/phone-battery --events      (events.json: every stroke, word, wipe and move)
    python3 examples/phone-battery/cues.build.py

The bed is composed for this film (music/bed.mp3; the prompt is in music/bed.json). The template's Sound line asks for
a light, upbeat bed with marker squeaks and taps, so the effects are a marker on a board: a pen on every stroke and a
pen writing every word (kit/audio/foley.py makes these), a rub for every wipe, and taps where the marker taps. They
sit under the voice as a texture ("under": true). The events the storyboard names are heard on their own frames: the
tap on the '=' and the '?', the plug-in click, the ions settling between the sheets, the squeak of the ball pushed up
the hill, the soft pass of the ion through the pore, the dull bump of the electron stopped at it, the chime as the
phone's screen lights, the settle of the last ion home; the bed dips on 'empty'; the air of the board under each
camera move and under the flight home.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
L = "lib"
r = lambda x: round(x, 3)
events_in = json.loads((HERE / "events.json").read_text())
music = json.loads((HERE / "cues.json").read_text())["music"]
music.update({
    "file": "../../examples/phone-battery/music/bed.mp3", "start": 0, "lufs": -21, "fade_in": 0.01, "fade_out": 0.6, "duck_db": -6, "fill": True,
    # the bed dips on "the battery's empty" and comes back for the answer
    "ride": [[43.0, 0], [43.35, -4], [43.95, -4], [44.4, 0]],
    "note": "Composed for this film (ElevenLabs Music, the prompt in music/bed.json); -21 LUFS under the voice, its rests patched from a bar away; it dips on 'empty'.",
})
voice = {"duck_db": -8, "note": "The bed dips 8 dB under the voice (not the default 11): it is light and must stay heard between sentences."}

out = []
last = {}
pen_k = write_k = rub_k = 0
first_settle = True
homes = [e for e in events_in if e["kind"] == "home"]
# The wipes the storyboard names are heard; the other wipes are a texture like the pen.
words = json.loads((HERE / "voice" / "voice.json").read_text())["film"]
said = lambda shot, w: next(x[0] for x in words[shot]["words"] if x[2].lower().strip(".,:?!") == w)
NAMED_WIPES = {35.85: "the close-up's marks wiped"}
for e in events_in:
    k, at, d = e["kind"], e["at"], max(0.1, e["end"] - e["at"])
    if k in ("line", "dash", "spiral", "sheets", "rings", "ion", "under", "ions", "rays", "cross", "ring", "ball"):
        if at - last.get("pen", -9) < 0.07:
            continue  # two strokes begun at once by one hand: one sound
        last["pen"] = at
        pen_k += 1
        lvl = {"spiral": -16, "dash": -17, "rings": -18, "ion": -18, "cross": -13}.get(k, -16)
        out.append({"t": r(at), "file": f"{L}/foley/pen_{pen_k % 3 + 1}.wav", "db": lvl, "trim": [0, r(min(0.9, d + 0.04))], "fade": 0.05, "under": True, "note": f"marker: {k}"})
    elif k == "write":
        if at - last.get("write", -9) < 0.07:
            continue
        last["write"] = at
        write_k += 1
        out.append({"t": r(at), "file": f"{L}/foley/write_{write_k % 3 + 1}.wav", "db": -17, "trim": [0, r(min(1.6, d + 0.04))], "fade": 0.05, "under": True, "note": "a word written"})
    elif k == "erase":
        if at - last.get("erase", -9) < 0.07:
            continue
        last["erase"] = at
        rub_k += 1
        named = next((v for t0, v in NAMED_WIPES.items() if abs(t0 - at) < 0.05), None)
        out.append({"t": r(at), "file": f"{L}/foley/rub_{rub_k % 2 + 1}.wav", "db": -11 if named else -16, "trim": [0, r(min(0.6, d + 0.12))], "fade": 0.08,
                    **({} if named else {"under": True}), "note": named or "rubbed out"})
    elif k == "tap":
        if abs(at - 9.82) < 0.05:  # the magnifier ring round the strip is a stroke, not a tap
            out.append({"t": r(at), "file": f"{L}/foley/pen_2.wav", "db": -18, "trim": [0, 0.3], "fade": 0.05, "under": True, "note": "marker: the ring round the strip"})
            continue
        note = "a tap for the '?' (s02)" if at < 6 else "a tap for the measure (s12)" if at < 31 else "a tap for the '=' (s18)"
        # the '?' is tapped as it is written, in the breath before "where's"
        # the recap's '=' is tapped in the breath before "hill", which follows too closely for it to stand out: under
        out.append({"t": r(at), "file": f"{L}/sfx/card_1.mp3", "db": -7, "align": "peak", "duck": True, **({"under": True} if at > 40 else {}), "note": note})
    elif k == "plug":
        # on "pushes electrons": heard as a layer under the words, not pushed over them
        out.append({"t": r(at), "file": f"{L}/sfx/click_1.mp3", "db": -12, "align": "peak", "under": True, "note": "the charger plugs in (s08)"})
    elif k == "emerge":
        out.append({"t": r(at), "file": f"{L}/sfx/tick_2.mp3", "db": -21, "align": "peak", "trim": [0, 0.3], "fade": 0.1, "under": True, "note": "an electron leaves the oxide (s08)"})
    elif k == "slide":
        out.append({"t": r(at), "file": f"{L}/sfx/whoosh_fast_5.mp3", "db": -28, "align": "peak", "fade": 0.2, "under": True, "note": "an ion slides across"})
    elif k == "settle":
        # each on the frame its ion comes to rest; they fall on "slip between its layers", so even the first (the
        # loudest) sits under the words: the loudest 50 ms after it is the voice, and pushing it up to lift 5 dB would
        # put it over "slip". A layer under the voice.
        out.append({"t": r(at), "file": f"{L}/sfx/click_2.mp3", "db": -11 if first_settle else -17, "align": "peak", "trim": [0, 0.25], "fade": 0.08,
                    "under": True, "note": "an ion settles between the sheets (s09b)"})
        first_settle = False
    elif k == "push":
        out.append({"t": r(at), "file": f"{L}/foley/squeak_1.wav", "db": -12, "under": True, "trim": [0, r(d)], "fade": 0.2, "note": "a rising squeak as the ball is pushed up (s11)"})
    elif k == "rest":
        out.append({"t": r(at), "file": f"{L}/foley/knock_2.wav", "db": -14, "align": "peak", "note": "the ball comes to rest on the top"})
    elif k == "roll":
        out.append({"t": r(at), "file": f"{L}/foley/scrape_1.wav", "db": -30, "trim": [0, r(min(2.0, d))], "fade": 0.4, "fade_in": 0.15, "under": True, "note": "the ball starts to roll (s13)"})
    elif k == "pass":
        out.append({"t": r(at), "file": f"{L}/sfx/send_1.mp3", "db": -10, "align": "peak", "under": True, "note": "the ion passes through the pore (s14)"})
    elif k == "bump":
        out.append({"t": r(at), "file": f"{L}/foley/thump_1.wav", "db": -9, "align": "peak", "duck": True, "note": "THE BLOCK: the electron stopped at the pore (s14)"})
    elif k == "tick":
        out.append({"t": r(at), "file": f"{L}/sfx/tick_2.mp3", "db": -21, "align": "peak", "trim": [0, 0.3], "fade": 0.1, "under": True, "note": "an electron leaves along the wire (s15)"})
    elif k == "home":
        final = e is homes[-1]
        # s17's sound line: "a soft settle" as the last ion arrives, on the word "home": a texture under the voice
        out.append({"t": r(at), "file": f"{L}/sfx/click_2.mp3", "db": -13 if final else -19, "align": "peak", "trim": [0, 0.25], "fade": 0.08,
                    "under": True, "note": "the last ion home (s17)" if final else "an ion home in the oxide"})
    elif k == "chime":
        out.append({"t": r(at), "file": f"{L}/sfx/success_1.mp3", "db": -13, "align": "peak", "trim": [0, 1.3], "fade": 0.7, "note": "THE PAYOFF: the phone's screen lights on 'current' (s16)"})
    elif k == "move":
        if e["at"] > 46:
            continue  # the flight home has its own
        out.append({"t": r((e["at"] + e["end"]) / 2), "file": f"{L}/sfx/whoosh_fast_2.mp3", "db": -24, "align": "peak", "fade": 0.25, "under": True, "note": "the board travels by"})
    elif k == "track":
        out.append({"t": r(at + 0.45), "file": f"{L}/sfx/whoosh_long_2.mp3", "db": -15, "align": "peak", "trim": [0, 1.6], "fade": 0.6, "under": True, "note": "the air of the whole board flying by, home to frame 0 (s19)"})

# '0%' on the phone's screen: the battery is empty
zero = next(e for e in events_in if e["kind"] == "write" and abs(e["at"] - (said("s17", "battery's") + 0.14)) < 0.06)
out.append({"t": r(zero["at"] + 0.05), "file": f"{L}/sfx/tick_1.mp3", "db": -11, "align": "peak", "note": "'0%' on the phone: empty (s17)"})

out.sort(key=lambda x: x["t"])
cues = {"music": music, "voice": voice, "events": out}
lines = ["{", f'  "music": {json.dumps(music, ensure_ascii=False)},', f'  "voice": {json.dumps(voice, ensure_ascii=False)},', '  "events": [']
lines += [f"    {json.dumps(x, ensure_ascii=False)}{',' if i < len(out) - 1 else ''}" for i, x in enumerate(out)]
lines += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(lines) + "\n")
print(f"{len(out)} events -> cues.json ({sum(1 for x in out if not x.get('under'))} heard on their own)")
