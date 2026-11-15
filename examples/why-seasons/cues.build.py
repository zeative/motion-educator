"""Writes cues.json for "Why do we have seasons?": the music bed and every effect, on the film's clock.

The film has no voice: its words are captions, read at about fifteen characters a second. Every time below is a
shot's start or the moment a word of its caption has been read (the same reading model as film.js), so each sound
lands on the picture event it belongs to. With no voice to make room for, the bed sits at -18 LUFS; the effects are
small, with two hits, on the turn and on the last line. The levels are well above the table in
references/sound.md, set by measurement: against a bed at -18 LUFS whose beats fall on every cut, pops and ticks at
-9 to -13 sat 2 to 5 dB under the music at their moment and cards 8 to 13 dB under it.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
sb = json.loads((HERE / "storyboard.json").read_text())
shots = {shot["id"]: shot for shot in sb["shots"]}
s = {k: v["start"] for k, v in shots.items()}
END = sb["duration"]
READ_FROM, CPS = 0.3, 15


def text(sid):
    return (shots[sid].get("caption") or shots[sid].get("script") or "").replace("*", "")


def norm(word):
    return "".join(c for c in word.lower() if c.isalnum() or c == "-")


def said(sid, word):
    parts = text(sid).split()
    i = next(k for k, w in enumerate(parts) if norm(w) == norm(word))
    return s[sid] + READ_FROM + len(" ".join(parts[:i]) + (" " if i else "")) / CPS


def ends(sid):
    return min(shots[sid]["end"] - 0.25, s[sid] + READ_FROM + len(text(sid)) / CPS)


events = []


def cue(t, file, db, note, **more):
    events.append({"t": round(t, 3), "file": f"lib/sfx/{file}.mp3", "db": db, "align": "peak", **more, "note": note})


cue(s["s02"] - 0.08, "whoosh_long_1", -6, "the camera pulls back to the orbit")
cue(ends("s02"), "pop_2", -1, "the guess lands: closer = summer?", pan=0.15)
cue(said("s03", "but") - 0.1, "tick_1", -2, "the dashed line turns into a measurement", pan=0.2)
cue(s["s04"] - 0.04, "whoosh_fast_2", -4, "push in to the January Earth", pan=0.2)
cue(s["s05"], "impact_big_3", -1, "THE TURN: not the distance", duck=True, trim=[0, 1.3], fade=0.8)
cue(s["s05b"] + 0.04, "pop_1", -1, "the second line slams in: it's the tilt")
cue(s["s05b"] + 1.5, "shimmer_2", -7, "light crosses the leaning word")
cue(s["s06"] - 0.16, "whoosh_fast_6", -3, "the type is thrown up, the Earth returns")
cue(said("s06", "leans") + 0.85, "tick_1", -1, "23.4 degrees locks beside the arc", pan=0.3)
cue(s["s07"] - 0.08, "whoosh_long_2", -5, "pull back to the orbit")
cue(said("s07", "same"), "tick_2", -1, "every axis glows at once: same way")
cue(s["s08"] - 0.04, "whoosh_fast_2", -5, "push in to the June Earth", pan=-0.2)
cue(ends("s08"), "pop_1", -1, "the noon mark at 40 N", pan=0.1)
cue(said("s09", "steep,") + 0.08, "whoosh_fast_7", -3, "the dive lands on the ground")
cue(said("s10", "ground.") + 0.5, "tick_1", -1, "the light gauge has filled", pan=-0.4)
cue(s["s11"] + 0.01, "whoosh_fast_3", -3, "whip down to the orbit")
cue(ends("s11"), "pop_2", -1, "north: winter", pan=0.4)
cue(s["s12"] + 0.02, "whoosh_fast_4", -2, "whip back to the ground")
cue(said("s12", "same") + 0.55, "whoosh_long_2", -8, "the beam swings down", pan=0.3)
cue(said("s13", "twice") - 0.05, "tick_2", -1, "2.1x locks under the stretched patch")
cue(s["s13b"] - 0.1, "send_1", -5, "push in on the panel")
cue(said("s13b", "less.") - 0.05, "success_3", -7, "the gauge row glows: less light on each square metre")
cue(s["s14"] + 1.0, "tick_1", -1, "the June chip", pan=-0.2)
cue(said("s14b", "9") - 0.1, "tick_1", -1, "the December chip", pan=0.2)
cue(s["s15"] - 0.22, "card_2", -1, "card 1 lands", pan=-0.45)
cue(said("s15", "steep") - 0.12, "card_2", -1, "card 2 lands")
cue(said("s15", "long") - 0.12, "card_2", -1, "card 3 lands", pan=0.45)
cue(s["s16"] - 0.04, "whoosh_fast_1", -5, "the cards gather, ending on the cut")
cue(s["s16"], "impact_big_1", -1, "THE LAST LINE lands", duck=True, trim=[0, 1.6], fade=1.0)
cue(s["s16"] + 2.1, "shimmer_1", -8, "light crosses the last line")

cues = {
    "music": {
        "file": "lib/music/xceed_thru_johann.mp3",
        "start": 0.679,
        "lufs": -18,
        "fade_in": 0.01,
        "fade_out": 2.6,
        "duck_db": -6,
        # The track climbs about 6 dB over its first 35 s; ride it down so the end card is not louder than the start.
        "ride": [[0, 1.0], [10, 0], [22, -1.5], [34, -3], [END - 4, -3], [END, -4.5]],
        "note": "86 BPM, a calm pulse with no lead melody, at -18 LUFS: the film has no voice. Starting 0.679 s in puts a beat on frame 0, and every shot is a whole number of beats, so every cut is on the grid.",
    },
    "events": sorted(events, key=lambda e: e["t"]),
}
(HERE / "cues.json").write_text(json.dumps(cues, indent=2) + "\n")
print(len(events), "effects")
