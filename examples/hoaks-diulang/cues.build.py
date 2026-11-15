"""Writes cues.json from storyboard.json and the take, so every sound sits on the event it belongs to after a retime.

    python3 examples/hoaks-diulang/cues.build.py

The times are the film's own (film.js works them out the same way, from the words of the take). The music is the
bed composed for this film (music/bed.mp3, kit/audio/music.mjs). Effects are small and go between the words where
the take allows; the two big hits are the turn (in the pause after "bukan bukti") and the payoff (the stamp, in the
hold after the last line).
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
L = "lib"
sb = json.loads((HERE / "storyboard.json").read_text())
film = json.loads((HERE / "voice" / "voice.json").read_text())["film"]
s = {x["id"]: x for x in sb["shots"]}
D = sb["duration"]


def said(id, word):
    for a, b, text in film[id]["words"]:
        if "".join(c for c in text.lower() if c.isalnum() or c == "-") == word:
            return a
    raise SystemExit(f'the take has no "{word}" in {id}')


ended = lambda id: film[id]["to"]
r = lambda x: round(x, 3)

ARRIVE = [0.02, said("s01", "diulang-ulang") - 0.04, said("s01", "keluarga") - 0.04, said("s02", "lama-lama") - 0.04]
BUKTI = said("s03", "bukti")
P = [s["s05"]["start"] + 0.12, said("s05", "kalimat") + 0.1, s["s06"]["start"] + 0.1, said("s06", "gampang") - 0.06, said("s06", "memprosesnya") + 0.05]
PD = [1.15, 0.72, 0.48, 0.33, 0.22]
DIVE = s["s07"]["start"] - 0.3
BENAR = said("s09", "benar")
ILUSIF = said("s10", "ilusif")
TURN = ended("s14") + 0.08
CEK = said("s16", "cek")
SUMBER = said("s16", "sumbernya")
BREAK = SUMBER + 0.4
STAMP = max(ended("s16") + 0.08, BREAK + 0.8)
R = s["s17"]["start"]

bed = HERE / "music" / "bed.mp3"
music = {"file": f"../../examples/{HERE.name}/music/bed.mp3", "start": 0, "lufs": -22, "fade_in": 0.01, "fade_out": 0.4, "duck_db": -6,
         "note": "Composed for this film by ElevenLabs Music to its length (music/bed.json has the prompt): an uneasy pulse that builds with the repeats and turns calm near the check. A bed under the voice at -22 LUFS."}
# The bed swells right where the stamp lands (about 45.7 s): dip it under the payoff so the hit is heard.
music["ride"] = [[0, 0], [r(STAMP - 0.35), 0], [r(STAMP - 0.08), -9], [r(STAMP + 0.7), -9], [r(STAMP + 1.2), 0],
                 # The bed resolves on a chord that decays under the poster: ride its tail up so the film is not silent at the end.
                 [r(R + 0.8), 0], [r(R + 1.8), 12], [r(D), 14]]
# The voice: the kit's chain, with three lines lifted a little (times are the take's own clock): "ilusif." +3 dB,
# the lines of s02 and s06 +1.5 dB.
take = json.loads((HERE / "voice" / "voice.json").read_text())["lines"]
CHAIN = "highpass=f=85,equalizer=f=220:t=q:w=1.1:g=-1.5,equalizer=f=2400:t=q:w=1.4:g=2,deesser=i=0.35:m=0.5:f=0.5,acompressor=threshold=-21dB:ratio=3:attack=8:release=140:knee=6:makeup=2"
ilusif = next(w for w in take["s10"]["words"] if w[2].startswith("ilusif"))
lifts = [(ilusif[0] - 0.03, ilusif[1] + 0.05, 1.413), (take["s02"]["from"] - 0.03, take["s02"]["to"] + 0.05, 1.189), (take["s06"]["from"] - 0.03, take["s06"]["to"] + 0.05, 1.189)]
CHAIN += "".join(f",volume=volume={g}:enable='between(t,{a:.2f},{b:.2f})'" for a, b, g in lifts)
voice = {"lufs": -16, "duck_db": -11, "sfx_db": -4, "chain": CHAIN}
if not bed.exists():
    raise SystemExit("compose the bed first: node kit/audio/music.mjs examples/hoaks-diulang --prompt ...")

events = []
for i, t in enumerate(ARRIVE):
    events.append({"t": r(t + 0.05), "file": f"{L}/sfx/pop_3.mp3", "db": -13 + i, "align": "peak", "pan": -0.15, "note": f"copy {i + 2} of the claim lands in the thread"})
events += [
    {"t": r(BUKTI + 0.05), "file": f"{L}/sfx/tick_1.mp3", "db": -11, "align": "peak", "note": "the evidence meter: 0"},
    {"t": r(s["s04"]["start"] - 0.01), "file": f"{L}/sfx/whoosh_fast_5.mp3", "db": -17, "align": "peak", "note": "the copies fold into one line and fly into the head, between two sentences"},
]
for i, (t, d) in [(i, x) for i, x in enumerate(zip(P, PD)) if i in (0, 1, 4)]:
    events.append({"t": r(t + d), "file": f"{L}/sfx/tick_2.mp3", "db": -17, "align": "peak", "pan": 0.2, "note": f"reading {i + 1} ends, the effort bar steps down"})
events += [
    {"t": r(s["s07"]["start"]), "file": f"{L}/sfx/whoosh_long_2.mp3", "db": -17, "align": "peak", "note": "the dive along the reading line into the field"},
    {"t": r(said("s07", "mulus") + 0.1), "file": f"{L}/sfx/shimmer_2.mp3", "db": -17, "align": "peak", "note": "the path is smooth"},
    {"t": r(s["s08"]["start"] + 0.85), "file": f"{L}/sfx/card_2.mp3", "db": -14, "align": "peak", "note": "the BENAR sign stands up at the end of the path"},
    {"t": r(BENAR), "file": f"{L}/sfx/impact_big_3.mp3", "db": -12, "align": "peak", "trim": [0, 0.9], "fade": 0.6, "note": "'= terasa benar' slams in; the meter steps up"},
    {"t": r(ILUSIF + 0.4), "file": f"{L}/sfx/shimmer_1.mp3", "db": -22, "align": "peak", "trim": [0, 2.0], "fade": 0.8, "note": "light across the name"},
    {"t": r(s["s11"]["start"] + 0.05), "file": f"{L}/sfx/card_3.mp3", "db": -14, "align": "peak", "note": "the news card slides up"},
    {"t": r(said("s11", "lihat") + 0.12), "file": f"{L}/sfx/pop_2.mp3", "db": -14, "align": "peak", "note": "dilihat 1x"},
    {"t": r(said("s12", "terasa") + 0.5), "file": f"{L}/sfx/tick_1.mp3", "db": -13, "align": "peak", "note": "the meters stop, the seen one a little higher"},
    {"t": r(said("s13", "jawabannya") + 0.05), "file": f"{L}/sfx/pop_2.mp3", "db": -14, "align": "peak", "pan": 0.3, "note": "'Atlantik terbesar', once"},
    {"t": r(said("s13", "juga") + 0.05), "file": f"{L}/sfx/pop_2.mp3", "db": -13, "align": "peak", "pan": 0.3, "note": "and again"},
    {"t": r(s["s14"]["start"] - 0.02), "file": f"{L}/sfx/whoosh_fast_2.mp3", "db": -18, "align": "peak", "note": "back to the thread"},
    {"t": r(TURN), "file": f"{L}/sfx/impact_big_1.mp3", "db": -5, "align": "peak", "duck": True, "trim": [0, 1.6], "fade": 1.0, "note": "THE TURN: hearing it often is not evidence, in the pause after the line"},
    {"t": r(TURN), "file": f"{L}/sfx/sub_drop_2.mp3", "db": -10, "align": "peak", "note": "its body"},
    {"t": r(said("s15", "makanya") + 0.12), "file": f"{L}/sfx/card_1.mp3", "db": -16, "align": "peak", "note": "the two buttons rise"},
    {"t": r(CEK + 0.04), "file": f"{L}/sfx/click_2.mp3", "db": -8, "align": "peak", "note": "the tap on 'cek sumber'"},
    {"t": r(SUMBER + 0.05), "file": f"{L}/sfx/tension_3.mp3", "db": -14, "align": "peak", "trim": [0, 0.6], "fade": 0.3, "note": "the claim cracks"},
    {"t": r(BREAK + 0.2), "file": f"{L}/sfx/whoosh_fast_6.mp3", "db": -17, "align": "peak", "note": "its two pieces fall away"},
    {"t": r(STAMP), "file": f"{L}/sfx/impact_big_3.mp3", "db": -5, "align": "peak", "duck": True, "trim": [0, 1.4], "fade": 0.9, "note": "THE PAYOFF: the stamp, after the last line"},
    {"t": r(STAMP), "file": f"{L}/sfx/card_2.mp3", "db": -9, "align": "peak", "note": "the stamp's slap"},
    {"t": r(R + 0.05), "file": f"{L}/sfx/whoosh_fast_3.mp3", "db": -18, "align": "peak", "note": "the recap rises"},
    {"t": r(R + 0.45), "file": f"{L}/sfx/impact_big_1.mp3", "db": -10, "align": "peak", "duck": 0.6, "trim": [0, 3.6], "fade": 1.8, "note": "the poster line, left to ring out to the last frame"},
]
# Measured on the first mix: at these levels the small effects lifted 0 to 0.6 dB over voice and bed, i.e. inaudible.
# Raise every small one by 6 dB (the two big hits and the recap stay as they are).
for e in events:
    if e["db"] <= -8:
        e["db"] = min(-6, e["db"] + 6)
# Measured again on the second mix: under the voice the small ones still lift under 1 dB. The few that carry the
# picture's events (the copies landing, the 0, the tap, the crack) go up further; the payoff sits on an accent of the
# bed, so it goes up too.
LOUDER = {"copy": -4, "copy 4": -8, "copy 5": -8, "the evidence meter": -7, "the tap": -3, "the claim cracks": -5, "THE PAYOFF": -2, "the stamp's slap": -4}
for e in events:
    for key, level in LOUDER.items():
        if e["note"].startswith(key):
            e["db"] = level
events.sort(key=lambda e: e["t"])
out = ["{", f'  "music": {json.dumps(music, ensure_ascii=False)},', f'  "voice": {json.dumps(voice, ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(events) - 1 else ''}" for i, e in enumerate(events)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
words = [(a, b, w) for line in film.values() for a, b, w in line["words"]]
for e in events:
    on = next((w for a, b, w in words if a - 0.03 <= e["t"] <= b), None)
    if on:
        print(f"  under the voice at {e['t']:.2f} s ('{on}'): {e['note'][:60]}")
print(f"{len(events)} events -> cues.json")
