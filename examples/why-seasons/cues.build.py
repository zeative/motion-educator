"""Writes cues.json for "Why do we have seasons?": the music bed and every effect, on the film's clock.

Every time is counted from a shot's start in storyboard.json, so a retime moves the sounds with the picture.
The film speaks, so the effects are few and small and sit in the gaps between the lines (voice/voice.json has each
line's length); only a low whoosh under the swinging beam, one tick and one card sound fall under speech.
Levels were set by measurement: at the kit's table levels (-14 to -16) the pops, ticks and cards lifted 0 to 3 dB
over the music at their moment (the cuts are on the music's own beats), so they were raised until each lifts about
5 dB or more over the half second before it.

LIB is where the sound library is, relative to kit/audio/: "lib/", filled by kit/audio/fetch.sh.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
LIB = "lib/"
sb = json.loads((HERE / "storyboard.json").read_text())
voice = json.loads((HERE / "voice" / "voice.json").read_text())["lines"]
s = {shot["id"]: shot["start"] for shot in sb["shots"]}
END = sb["duration"]

events = []


def cue(t, file, db, note, **more):
    events.append({"t": round(t, 3), "file": f"{LIB}sfx/{file}.mp3", "db": db, "align": "peak", **more, "note": note})


cue(1.5, "shimmer_1", -13, "light crosses the title, after the question is asked")
cue(s["s02"] - 0.12, "whoosh_long_1", -12, "the camera pulls back to the orbit")
cue(s["s02"] + 1.97, "pop_2", -9, "the guess lands: closer = summer?", pan=0.15)
cue(s["s03"] + 0.03, "tick_1", -8, "the dashed line turns into a measurement", pan=0.2)
cue(s["s04"] - 0.14, "whoosh_fast_2", -11, "push in to the January Earth", pan=0.2)
cue(s["s05"], "impact_big_3", -6, "THE ANSWER: the real cause is the tilt", duck=True, trim=[0, 1.3], fade=0.8)
cue(s["s06"] - 0.16, "whoosh_fast_6", -10, "the type is thrown up, the Earth returns")
cue(s["s06"] + 1.52, "tick_1", -11, "23.4 degrees locks beside the arc", pan=0.3)
cue(s["s07"] - 0.12, "whoosh_long_2", -13, "pull back to the orbit")
cue(s["s07"] + 1.68, "tick_2", -8, "the last axis mark is left")
cue(s["s08"] - 0.14, "whoosh_fast_2", -11, "push in to the June Earth", pan=-0.2)
cue(s["s08"] + 2.07, "pop_1", -9, "the noon mark at 40 N", pan=0.1)
cue(s["s09"], "whoosh_fast_7", -8, "the dive to the ground, ending on the cut")
cue(s["s09"] + 2.4, "tick_1", -8, "the light gauge fills", pan=-0.4)
cue(s["s10"] + 0.01, "whoosh_fast_3", -11, "whip down to the orbit")
cue(s["s10"] + 1.97, "pop_2", -10, "north: winter", pan=0.4)
cue(s["s11"], "whoosh_fast_4", -11, "whip back to the ground")
cue(s["s11"] + 1.0, "whoosh_long_2", -18, "the beam swings down (low, under the voice)", pan=0.3)
cue(s["s13"] - 0.2, "card_1", -8, "card 1 lands", pan=-0.45)
cue(s["s13"] + 0.1, "card_2", -9, "card 2 lands")
cue(s["s13"] + 0.4, "card_1", -11, "card 3 lands", pan=0.45)
cue(s["s14"] - 0.02, "whoosh_fast_1", -14, "the cards gather, ending on the cut")
cue(s["s14"], "impact_big_1", -6, "THE LAST LINE lands", duck=True, trim=[0, 1.6], fade=1.0)
cue(s["s14"] + 2.15, "shimmer_1", -14, "light crosses the last line")

# Say where each sound sits against the narration, so the gaps can be checked by reading.
spoken = [(shot["start"] + 0.15, shot["start"] + 0.15 + voice[shot["id"]]["speech"]) for shot in sb["shots"] if shot["id"] in voice]
for e in events:
    e["under_voice"] = any(a - 0.05 <= e["t"] <= b for a, b in spoken)

cues = {
    "music": {
        "file": f"{LIB}music/xceed_thru_johann.mp3",
        "start": 0.679,
        "lufs": -21,
        "fade_in": 0.01,
        "fade_out": 2.6,
        "duck_db": -6,
        # The track climbs about 6 dB over its first 35 s; under a voice that would crowd the later lines.
        "ride": [[0, 1.0], [10, 0], [22, -2], [34, -3.5], [END - 4, -3.5], [END, -5]],
        "note": "86 BPM, a calm pulse with no lead melody. Starting 0.679 s in puts a beat on the first frame and on every cut. Kept 3 dB under the level a silent film would use, and 9 dB lower again while the voice speaks.",
    },
    "voice": {"lufs": -16, "lead": 0.15, "duck_db": -9, "sfx_db": -4},
    "events": sorted(events, key=lambda e: e["t"]),
}
(HERE / "cues.json").write_text(json.dumps(cues, indent=2) + "\n")
print(len(events), "effects;", sum(e["under_voice"] for e in events), "under the voice")
for e in cues["events"]:
    print(f'{e["t"]:7.3f} {e["db"]:4d} {"voice" if e["under_voice"] else "     "} {e["file"].split("/")[-1]:20s} {e["note"]}')
