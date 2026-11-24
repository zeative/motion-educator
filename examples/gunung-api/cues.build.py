"""Writes cues.json from storyboard.json and events.json, so every sound sits on what film.js does at that moment.

    node kit/tools/render.mjs examples/gunung-api --events     (events.json: tags, cuts, presses, bubbles, the burst)
    python3 examples/gunung-api/cues.build.py

The bed is composed for this film (music/bed.mp3, the prompt in music/bed.json): a warm pad, soft wind, kalimba and
small bells at 72 BPM; the film loops, so mix.py lays its run-on over the opening. music/bed-narrow.mp3 is the same
bed with its sides narrowed (ffmpeg stereotools slev 0.4: left/right correlation 0.08 -> 0.76), so the mix holds
together on one speaker. The film has no voice, so the bed sits at -25 LUFS and the effects are 7 to 10 dB above
the calm-explainer table in references/sound.md (a captions-only film needs it to be heard).

The effects are the storyboard's sound lines: a chime as a tag lands, air on camera moves and on every cut, soft
presses and gauge ticks for pressure, blubs and pops for bubbles, the cap coming off and the fizz, stony knocks for
the dome, and the eruption as the loudest moment of the film: a deep boom with a crack on top of it (1 to 4 kHz,
so it is heard on a phone), rubble and a rumble under the rising column, and the bed swelling through to the chart.
Textures (rumbles, creaks, long air) are "under".
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
L = "lib"
sb = json.loads((HERE / "storyboard.json").read_text())
S = {x["id"]: (x["start"], x["end"]) for x in sb["shots"]}
D = sb["duration"]
r = lambda x: round(x, 3)
boom_t = S["s15"][0]

music = {"file": "../../examples/gunung-api/music/bed-narrow.mp3", "start": 0, "lufs": -25, "fade_in": 0.01, "fade_out": 0.4,
         "duck_db": -6, "fill": True,
         # the bed comes up at the loop's seam (its own first second is quiet), and swells from the eruption to the chart
         "ride": [[0.0, 2.5], [1.3, 0.0], [boom_t - 0.2, 0.0], [boom_t + 0.6, 4.0], [S["s16"][0] - 0.1, 4.0], [S["s16"][0] + 0.8, 0.0]],
         "note": "Composed for this film (ElevenLabs Music, prompt in music/bed.json), narrowed; captions only, so -25 LUFS under louder effects; rests patched from a bar away; ridden up at the seam and through the eruption."}

CHIME_SHOTS = ("s01", "s02", "s05", "s18")
shot_at = lambda t: next((k for k, (a, b) in S.items() if a <= t < b), "s18")

events = []
last = {}


def add(t, file, db, note, gap=0.0, key=None, prio=5, **more):
    key = key or file
    if t - last.get(key, -99) < gap:
        return
    last[key] = t
    events.append({"t": r(t), "file": f"{L}/{file}", "db": db, "align": more.pop("align", "peak"), "note": note, "_prio": prio, **more})


n = {}
for e in json.loads((HERE / "events.json").read_text()):
    kind, t, end = e["kind"], e["at"], e["end"]
    n[kind] = n.get(kind, 0) + 1
    k = n[kind]
    if kind == "tag":
        if shot_at(t) in CHIME_SHOTS:
            # (in s05 a little under the others, so nothing but the eruption comes near the top of the film)
            add(t, "sfx/success_1.mp3", -3.9 if shot_at(t) == "s05" else -3.5, "a tag lands: a gentle chime", gap=0.3, key="tag", trim=[0, 0.4], fade=0.3, prio=7)
        else:
            add(t, "sfx/pop_3.mp3", -7, "a tag lands", gap=0.25, key="tag", prio=3)
    elif kind == "whoosh":
        add((t + end) / 2, f"sfx/whoosh_long_{1 + k % 2}.mp3", -12, "the camera flies through / swings (air, under)", trim=[0, 1.6], fade=0.5, prio=6, under=True)
    elif kind == "cut":
        add(t - 0.03, "sfx/whoosh_fast_5.mp3", -7, "a cut", key=f"cut{k}", prio=8)
    elif kind == "split":
        add(t, "sfx/whoosh_fast_5.mp3", -2.5, "the split slides in", prio=8)
    elif kind == "panel":
        add(t, "sfx/success_1.mp3", -8, "the question panel lands (first note)", trim=[0, 1.0], fade=0.5, prio=9)
    elif kind == "question":
        add(t, "sfx/shimmer_2.mp3", -10, "'beda?' (second note)", prio=9)
    elif kind == "slice":
        add((t + end) / 2, "sfx/shimmer_1.mp3", -16, "the slicing line sweeps down", prio=6)
    elif kind == "slide":
        add((t + end) / 2, "sfx/whoosh_long_3.mp3", -13, "the near half sinks: a soft stony slide (under)", trim=[0, 1.4], fade=0.5, prio=6, under=True)
        add(t + 0.1, "foley/scrape_1.wav", -16, "rock grinding as it sinks (under)", trim=[0, 0.9], fade=0.4, under=True)
    elif kind == "assemble":
        add(t + 0.15, "sfx/shimmer_2.mp3", -13, "facets assemble", prio=2)
    elif kind == "push":
        add(end - 0.08, "sfx/whoosh_fast_2.mp3", -6, "push in through the cut", prio=6)
    elif kind == "strike":
        add(t, "sfx/pop_1.mp3", -8, "'panas' struck out", prio=7)
    elif kind == "capoff":
        add(t, "sfx/pop_2.mp3", -6, "the cap comes off: the pressure goes", prio=8)
    elif kind == "fizz":
        add(t, "sfx/shimmer_2.mp3", -11, "the fizz (bubbles rising)", prio=4)
        for i in range(3):
            add(t + 0.15 + i * 0.22, "sfx/pop_1.mp3", -14, "bubbles at the surface", key=f"fz{i}", prio=4)
    elif kind == "press":
        add(t, f"foley/thump_{1 + k % 2}.wav", -7, "an arrow presses on the reservoir", prio=7)
    elif kind == "gauge":
        add(end, "sfx/tick_1.mp3", -4.5, "the gauge reaches high", key="gauge", prio=5)
    elif kind == "rise":
        add(t + 0.05, "sfx/whoosh_fast_3.mp3", -5.5, "the blob rises a step", key=f"rise{k}", prio=5)
        add(end, "sfx/tick_2.mp3", -8, "the gauge ticks down", key=f"rtick{k}", prio=5)
    elif kind in ("bubble", "blub"):
        add(t, "sfx/pop_2.mp3", -7, "a bubble forms: a soft blub", gap=0.4, key="blub", prio=4)
    elif kind == "pop":
        add(t, "sfx/pop_1.mp3", -6, "a bubble bursts at the top (runny)", gap=0.42, key="pop", prio=4)
    elif kind == "spill":
        add(t + 0.1, "foley/squish_1.wav", -17, "the runny lava spills over", under=True)
    elif kind == "light":
        add(t + 0.15, "sfx/shimmer_1.mp3", -17, "the light crosses to the thick column", prio=6)
        add(t + 0.2, "foley/rub_2.wav", -21, "a thick, slow creak", under=True)
    elif kind == "stop":
        add(t, "foley/knock_1.wav", -3, "a bubble stops against the crust", gap=0.3, key="stop", prio=4)
    elif kind == "crane":
        add((t + end) / 2, "sfx/whoosh_long_1.mp3", -14, "crane (air, under)", trim=[0, 1.4], fade=0.5, prio=6, under=True)
    elif kind == "block":
        add(t, f"foley/knock_{1 + k % 2}.wav", -4, "a block of the dome settles", gap=0.16, key="block", prio=4)
    elif kind == "tick":
        add(t, "sfx/tick_1.mp3", -4, "the gauge climbs", gap=0.3, key="tick", prio=5)
    elif kind == "crack":
        add(t, "foley/rub_1.wav", -16, "the dome creaks and cracks", under=True)
        add(end - 0.4, "foley/rub_2.wav", -15, "creak", under=True)
    elif kind == "boom":
        # the loudest moment: a deep boom, a crack on it (1 to 4 kHz), rubble, then the long rush and rumble
        add(t, "sfx/impact_big_3.mp3", 0, "THE ERUPTION: a deep boom", duck=True, prio=10)
        add(t + 0.01, "foley/clap_1.wav", 0, "THE ERUPTION: the crack on the boom (1-4 kHz)", key="crack1", prio=10)
        add(t + 0.06, "sfx/card_2.mp3", -3, "the dome's blocks thrown out (a layer of the boom)", key="blocks", prio=9, under=True)
        add(t + 0.11, "foley/clap_1.wav", -1, "a second crack as the dome splits (a layer of the boom)", key="crack2", prio=9, under=True)
        add(t + 0.18, "foley/scrape_1.wav", -2, "rubble and ash tearing out (under)", trim=[0, 2.2], fade=1.0, under=True)
        add(t + 0.3, "sfx/whoosh_long_3.mp3", -4, "the rush as the column climbs (under)", trim=[0, 2.4], fade=1.2, under=True)
        # the column's grit, so the climb holds on a phone speaker (1-4 kHz): falling rock rattles and a second scrape
        for i, dt in enumerate([0.95, 1.5, 2.05, 2.6, 3.1, 3.55]):
            add(t + dt, f"foley/rub_{1 + i % 2}.wav", -4 - i * 0.5, "rock and ash rattling down as the column climbs (1-4 kHz)", key=f"rubble{i}", prio=9, under=True)
        add(t + 1.7, "foley/scrape_1.wav", -3, "the column's roar keeps its grit (1-4 kHz, under)", trim=[0, 2.2], fade=0.9, key="scrape2", under=True)
        add(t + 1.2, "sfx/whoosh_long_1.mp3", -6, "the column's rush, its upper air (under)", trim=[0, 1.9], fade=0.8, key="rush2", under=True)
    elif kind == "pull":
        pass
    elif kind == "bar":
        add(t, "sfx/success_1.mp3", -5, "a bar stops at its value", trim=[0, 0.4], fade=0.3, key=f"bar{k}", prio=8)
    elif kind == "bar-big":
        add(t, "sfx/success_2.mp3", -7, "17 km: the fuller chime", prio=8)
    elif kind == "card":
        add(t, "sfx/success_1.mp3", -7, "a recap card lands", trim=[0, 0.8], fade=0.45, key=f"card{k}", prio=8)
    elif kind == "burst-small":
        add(t, "sfx/sub_drop_2.mp3", -10, "the little Merapi bursts", prio=7)
    elif kind == "fly":
        add(t + 0.5, "sfx/whoosh_long_2.mp3", -12, "fly over the hill: the wind rises (under)", trim=[0, 1.8], fade=0.7, prio=6, under=True)

# textures under the picture: the column's rumble at the start and into the loop; the rising rumble under the dome;
# the column's long rumble after the eruption
events += [
    {"t": 0.0, "file": f"{L}/sfx/tension_1.mp3", "db": -20, "align": "start", "fade_in": 0.01, "trim": [0, 4.0], "fade": 1.0, "under": True, "note": "a low muffled rumble under the column (carries on from the loop's end)"},
    {"t": r(D - 1.9), "file": f"{L}/sfx/tension_1.mp3", "db": -20, "align": "start", "fade_in": 1.2, "trim": [0, 1.9], "fade": 0.01, "under": True, "note": "the rumble returns with the column, into the loop"},
    {"t": r(S["s14"][0] + 0.1), "file": f"{L}/sfx/tension_1.mp3", "db": -18, "align": "start", "fade_in": 1.6, "trim": [0, S["s15"][0] - S["s14"][0] - 0.1], "fade": 0.05, "under": True, "note": "a rising low rumble as the pressure builds"},
    {"t": r(boom_t + 0.4), "file": f"{L}/sfx/tension_1.mp3", "db": -6, "align": "start", "fade_in": 0.3, "trim": [0, 3.6], "fade": 0.8, "under": True, "note": "the column's rumble as it climbs to 17 km"},
]
# a small sound right after a big one (a chime's ring, the boom) is lost in it: left out
big = [e for e in events if e.get("_prio", 0) >= 7 and not e.get("under")]
events = [e for e in events if e.get("_prio", 0) > 4 or e.get("under") or not any(0 < e["t"] - b["t"] < (1.6 if b["_prio"] >= 10 else 0.7) for b in big)]
# thin clusters: a sound within 0.3 s of a more important one is left out (the eruption's layers stay together)
kept = []
for e in sorted(events, key=lambda e: (-e.get("_prio", 0), e["t"])):
    if e.get("under") or e.get("_prio", 0) >= 9 or all(abs(e["t"] - k["t"]) >= 0.3 for k in kept if not k.get("under") and k.get("_prio", 0) < 9):
        kept.append(e)
events = sorted(kept, key=lambda e: e["t"])
for e in events:
    e.pop("_prio", None)
cues = {"music": music, "events": events}
out = ["{", f'  "music": {json.dumps(music, ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(events) - 1 else ''}" for i, e in enumerate(events)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(events)} events -> cues.json")
