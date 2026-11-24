"""Writes cues.json from storyboard.json and events.json, so every sound sits on the event film.js draws.

    python3 examples/neural-network/net.py                                  (net.json: the toy network's numbers)
    python3 examples/neural-network/sfx.py                                  (sfx/*.wav: the zaps, blips, buzz, hum)
    python3 examples/neural-network/bed.build.py                           (music/bed-shaped.wav: the bed, shaped)
    node kit/tools/render.mjs examples/neural-network --events             (events.json: what the picture does, when)
    python3 examples/neural-network/cues.build.py

The bed is composed for this film (music/bed.mp3, 96 BPM, F major; kit/audio/music.mjs) and shaped to it by
bed.build.py (thinner under the error, fuller for the repetition, its bass out for a bar at the scale shot). The film
has no voice: the bed is the reference, and the effects carry the events, each about 6 to 10 dB over the bed where it
lands. A zap when a pulse fires, a tick when one arrives, blips for nodes and examples, the neon tube's flicker when
type powers up, a low wrong buzz for the error, a rising reversed zap for the error going back, a swell for the nudge,
a glide that follows the real error curve, a whoosh on every camera move and a hit on the first frame. The bed sits
below 500 Hz, so every key effect has top end (a tick or a click layered on the tonal ones). Textures (the hum, the
fast rounds, the glide under the curve) are marked "under".
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
FX = "../../examples/neural-network/sfx"  # cues name files from kit/audio/
L = "lib/sfx"
sb = json.loads((HERE / "storyboard.json").read_text())
s = {x["id"]: x for x in sb["shots"]}
r = lambda x: round(x, 3)

music = {"file": "../../examples/neural-network/music/bed-shaped.wav", "start": 0, "lufs": -23, "fade_in": 0.01, "fade_out": 0.6, "duck_db": -5, "fill": True,
         "note": "Composed for this film (ElevenLabs Music, the prompt in music/bed.json), shaped by bed.build.py; -23 LUFS before the master gain."}

events = []


def add(t, file, db, note, **more):
    events.append({"t": r(t), "file": file, "db": db, "note": note, **more})


def top(t, db, note, align="peak"):
    """A bright tick on a tonal sound's onset: the top end a phone speaker keeps."""
    add(t, f"{FX}/tick.wav", db, note, align=align)


# whooshes whose sound starts at once (their lead-in trimmed), in turn
WHOOSH = [(2, 0.08), (5, 0.13), (3, 0.0), (4, 0.18), (8, 0.31), (6, 0.27)]
nw = iter(range(10_000))
zaps = iter(range(10_000))


def whoosh(t, d, db, note, **more):
    n, lead = WHOOSH[next(nw) % len(WHOOSH)]
    add(t + 0.42 * d, f"{L}/whoosh_fast_{n}.mp3", db, note, align="peak", trim=[lead, 2.0], **more)


for e in json.loads((HERE / "events.json").read_text()):
    k, at, end = e["kind"], e["at"], e["end"]
    d = end - at
    if k == "frame0":
        add(0.0, f"{FX}/zap_2.wav", -7, "frame 0: the network is on (and the loop comes round)")
        add(0.0, f"{FX}/tick.wav", -6, "frame 0: its first tick")
    elif k == "arrive":
        add(at, f"{FX}/tick.wav", -17, "a pulse reaches a row of the phone's network", under=True)
    elif k == "hum":
        add(at, f"{FX}/hum.wav", -24, "the network's hum under the opening", trim=[0, r(d + 0.6)], fade=0.6, under=True)
    elif k == "whoosh":
        if e.get("note") == "the phone slides down":
            whoosh(at, d, -12, e["note"], under=True)
        elif e.get("note") == "push into the network":  # the lead pulse's landing, 0.35 s later, is the event
            whoosh(at, d, -9, e["note"], under=True)
        else:
            whoosh(at, d, -4, e.get("note", "a camera move"), duck=True)
    elif k == "move":
        if d <= 1.3:  # a slow drift (the s10 push, the s17 push) is not a hit
            whoosh(at, d, -6, "the camera moves", duck=True)
    elif k == "draw":
        if e.get("note") == "the cat":
            add(at, f"{FX}/chirp.wav", -5, "a chirp as the cat is drawn")
        else:
            add(at, f"{FX}/power.wav", -13, f"drawn on: {e.get('note', '')}", under=True)
    elif k == "type":
        add(at, f"{L}/typing_1.mp3", -16, "a rule typed", trim=[11.98, r(11.98 + d + 0.05)], fade=0.06, under=True)
        top(at, -4, "a rule starts", align="start")
    elif k == "cross":
        add(at + 0.06, f"{FX}/zap_down.wav", -3, "the rules crossed out", align="peak", duck=True)
        top(at + 0.06, -6, "the cross lands")
    elif k == "flickoff":
        add(at, f"{FX}/power_off.wav", -12, "the card's glow dies", under=True)
    elif k == "power":
        add(at, f"{FX}/power.wav", -6, f"the question's line {e['n']}: the tube's hum", under=True)
        top(at + 0.07, -3, f"line {e['n']} of the question lights")
    elif k == "learn":
        add(at, f"{FX}/power.wav", -6, "'learn?' powers up", under=True)
        add(at + 0.1, f"{FX}/click.wav", -2, "THE QUESTION: a click on 'learn?'", align="peak", duck=True)
    elif k == "redraw":
        add(at, f"{FX}/power.wav", -12, "the network draws on behind the type", under=True)
    elif k == "label":
        top(at + 0.15, -4, e.get("note", "a label written on"))
    elif k == "lead":
        add(at, f"{FX}/zap_3.wav", -5, e.get("note", "a lead pulse lands"), align="peak")
        top(at, -6, "it lands")
    elif k == "zap":
        add(at, f"{FX}/zap_big.wav", -3, "a pulse fires along each line: the strong one", align="peak")
        add(at, f"{FX}/zap_2.wav", -16, "... and the weak one, faint", align="peak", under=True)
    elif k == "flash":
        add(at, f"{FX}/blip_C6.wav", -4, "the strong pulse arrives: a flash", align="peak")
    elif k == "blip":
        add(at, f"{FX}/blip_{['C5', 'F5', 'A5'][e['n']]}.wav", -5, f"a row of the toy pops on ({e['n'] + 1} of 3)", align="peak")
    elif k == "lines":
        add(at, f"{FX}/power.wav", -14, "ten lines draw on", under=True)
    elif k == "input":
        if e["on"]:
            add(at, f"{FX}/blip_{'A5' if at < s['s07']['start'] + 0.8 else 'C6'}.wav", -5, "an input lights: 1", align="peak")
        else:
            add(at, f"{FX}/blip_low.wav", -8, "an input stays dark: 0 (muted)", align="peak")
            top(at, -12, "its tick")
    elif k == "forward":
        add(at, f"{FX}/zap_1.wav", -4, "the signal leaves the inputs", align="peak")
        add(at + 0.05, f"{FX}/arp_up.wav", -12, "a rising arpeggio as it travels", under=True)
    elif k == "arrive_hidden":
        add(at, f"{FX}/zap_3.wav", -5, "the signal reaches the hidden row and goes on", align="peak")
    elif k == "arrive_out":
        add(at, f"{FX}/tick.wav", -14, "it reaches the output", align="peak", under=True)
    elif k == "number":
        add(at, f"{FX}/click.wav", -3, f"a number lands: {e.get('note', '')}", align="peak", duck=True)
    elif k == "tick":
        top(at, -3, e.get("note", "a mark"))
    elif k == "error":
        add(at + 0.08, f"{FX}/buzz.wav", -2, "THE ERROR: a low buzz, the wrong note", duck=True)
        add(at + 0.08, f"{FX}/zap_down.wav", -8, "the error's bright edge", align="start")
    elif k == "backward":
        add(at, f"{FX}/zap_up.wav", -12, "the error goes backwards: a reversed zap, rising (texture)", under=True)
        add(at, f"{FX}/zap_2.wav", -3, "the error leaves the output", align="peak", duck=True)
    elif k == "nudge":
        add(at - 0.05, f"{FX}/swell.wav", -6, "every weight nudged: a rising swell", duck=True)
        top(at + 0.2, -5, "the nudge lands")
    elif k == "forward2":
        add(at, f"{FX}/arp_up2.wav", -10, "guess again: the arpeggio one step higher (texture)", under=True)
        add(at, f"{FX}/zap_1.wav", -4, "guess again: the signal leaves the inputs", align="peak")
    elif k == "error2":
        add(at + 0.06, f"{FX}/buzz_soft.wav", -9, "a softer buzz: the error is smaller", under=True)
    elif k == "step":
        pitch = {"cat": "C6", "dog": "A5", "fish": "F5"}[e["example"]]
        add(at, f"{FX}/blip_{pitch}.wav", -5, f"round {e['round']}: the {e['example']}", align="peak")
        add(at + 0.5 * d, f"{FX}/zap_up.wav", -16, "its error goes back", trim=[0.25, 0.5], under=True)
    elif k == "fast":
        add(at, f"{FX}/zap_{next(zaps) % 3 + 1}.wav", -18, f"round {e['round']}, fast", under=True)
    elif k == "collapse":
        add(at + 0.1, f"{FX}/zap_down.wav", -4, "the streaks collapse into the chart's first point", align="peak")
    elif k == "curve":
        add(at, f"{FX}/glide.wav", -12, "the error curve: a glide whose pitch is the cat's real error (texture)", under=True)
        top(at, -4, "the curve starts")
    elif k == "result":
        pitch = {"cat": "C6", "dog": "G5", "fish": "F5"}[e["example"]]
        add(at, f"{FX}/blip_{pitch}.wav", -4, f"the {e['example']}'s answer lands", align="peak")
    elif k == "gather":
        add(at, f"{FX}/zap_up.wav", -17, "the answers fly into the network", trim=[0.1, 0.5], under=True)
        top(end, -5, "they arrive")
    elif k == "morph":
        add(at, f"{FX}/chord.wav", -9, "the lines grow to their trained widths: a warm chord (texture)", under=True)
        add(at, f"{FX}/blip_F5.wav", -4, "the morph starts", align="peak")
    elif k == "strongest":
        add(at, f"{L}/shimmer_2.mp3", -12, "the meow? lines brighten", align="peak", trim=[0, 1.0], fade=0.45, under=True)
    elif k == "level":
        whoosh(at, d, -4, f"the zoom-out: step {e['n']}", duck=True)
        if e["n"] == 1:
            top(end, -4, "a million: the step settles")  # step 2 settles on the count's click
    elif k == "count":
        add(at, f"{FX}/sub.wav", -13, "175,000,000,000: a sub drop under it (texture)", align="peak", under=True)
        add(at, f"{FX}/click.wav", -2, "175,000,000,000: the number appears", align="peak", duck=True)
    elif k == "row":
        pitch = ["F5", "G5", "A5", "C6_long"][e["n"]]
        add(at, f"{FX}/blip_{pitch}.wav", -4, f"recap row {e['n'] + 1}", align="peak")
    elif k == "powerrow":
        add(at, f"{FX}/power.wav", -14, f"the phone's network row {e['n'] + 1} flickers on", under=True)

# Calibration: each named effect brought toward 8 dB over the bed where it lands, measured on the mix (the
# effects layer against the music-only layer, gain-matched): cues.trim.json holds the change for each, in dB.
TRIM = json.loads((HERE / "cues.trim.json").read_text()) if (HERE / "cues.trim.json").exists() else {}
for e in events:
    e["db"] = round(e["db"] + TRIM.get(f"{e['t']:.3f}|{e['file']}", 0), 2)
events.sort(key=lambda e: e["t"])
cues = {"music": music, "events": events}
out = ["{", f'  "music": {json.dumps(music, ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(events) - 1 else ''}" for i, e in enumerate(events)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(events)} events -> cues.json")
