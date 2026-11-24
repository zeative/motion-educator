"""Writes cues.json from events.json, so every sound sits on the event film.js draws.

    node kit/tools/render.mjs examples/fotosintesis --events     (events.json: every pop, slide, flip, snip ...)
    python3 examples/fotosintesis/cues.build.py

The bed is composed for this film (music/bed.mp3, kit/audio/music.mjs; its prompt is in music/bed.json). The effects
are paper, made from numbers by foley.py beside this file (sfx/): a rustle for each pop-up, a slide for each layer
that wipes the frame, a flick for each tag, a snip on "mecah", a stamp for each stamped number, soft taps for pins,
rain ticks under s03b, one breath in for s11, and three warm sounds in the bed's key (a chime as the light lands, a
pluck as the sugar pops up and travels, a strummed chord as the recipe's outputs appear). One from kit/audio/lib/foley: the
soil's thump as the cutting goes in.
"""
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
SFX = HERE / "sfx"
if not (SFX / "chord.wav").exists():
    subprocess.run([sys.executable, str(HERE / "foley.py")], check=True)
OWN = "../../examples/fotosintesis/sfx"
r = lambda x: round(x, 3)

# kind -> (file or files to cycle, peak dB, how it is placed, a texture under the picture?, note)
# Levels: the paper is small and stays under the narration. The effects as a layer sit at or below about -20 LUFS
# momentary and never above the voice (measured with the dummy-picture mix and ffmpeg's ebur128 on each layer); a
# moving sound (a slide, the rostrum's air) starts with its move ("start"), a hit lands on its frame ("peak").
KINDS = {
    "rustle": ([f"{OWN}/rustle_{k}.wav" for k in (1, 2, 3)], -24, "peak", False, "leaves pop up"),
    "air": ([f"{OWN}/air.wav"], -30, "start", True, "the rostrum camera moves"),
    "tap": ([f"{OWN}/tap_1.wav", f"{OWN}/tap_2.wav"], -20, "peak", False, "a pin pushed into the card"),
    "slide": ([f"{OWN}/slide_1.wav", f"{OWN}/slide_2.wav"], -24, "start", False, "a sheet of paper slides across"),
    "drop": ([f"{OWN}/drop.wav"], -20, "peak", False, "the question strip lands"),
    "fold": ([f"{OWN}/fold.wav"], -22, "peak", False, "a fold, a crease"),
    "thump": (["lib/foley/thump_1.wav"], -18, "peak", False, "the cutting goes into the soil"),
    "flip": ([f"{OWN}/flip_{k}.wav" for k in (1, 2, 3)], -24, "peak", False, "a tag flips down on its thread"),
    "card": ([f"{OWN}/card.wav"], -24, "peak", False, "the calendar is set down"),
    "page": ([f"{OWN}/page.wav"], -23, "peak", False, "a calendar page turns"),
    "rain": ([f"{OWN}/rain.wav"], -30, "start", True, "light rain on paper"),
    "lift": ([f"{OWN}/lift.wav"], -23, "start", False, "the willow pulled out of its soil"),
    "clunk": ([f"{OWN}/clunk.wav"], -18, "peak", False, "set down on the balance's pan"),
    "tick": ([f"{OWN}/tick.wav"], -24, "peak", False, "a weight, a tick"),
    "stamp": ([f"{OWN}/stamp.wav"], -16, "peak", False, "a number stamped"),
    "pop": ([f"{OWN}/pop.wav"], -21, "peak", False, "a pop-up"),
    "popbig": ([f"{OWN}/popbig.wav"], -18, "peak", False, "a set pops up from the page"),
    "flipbig": ([f"{OWN}/flipbig.wav"], -21, "peak", False, "the leaf turns over"),
    "pff": ([f"{OWN}/pff.wav"], -21, "peak", False, "the CO2 slips through the pore"),
    "peel": ([f"{OWN}/peel.wav"], -23, "start", False, "a layer peeled back"),
    "chime": ([f"{OWN}/chime.wav"], -20, "start", False, "the light lands on the chlorophyll"),
    "chime2": ([f"{OWN}/chime2.wav"], -22, "start", False, "the light's energy passed on"),
    "snip": ([f"{OWN}/snip.wav"], -13, "peak", False, "SNIP: the water split on 'mecah'"),
    "click": ([f"{OWN}/click.wav"], -25, "peak", False, "pieces click together"),
    "breath": ([f"{OWN}/breath.wav"], -17, "start", False, "a breath in"),
    "pluck": ([f"{OWN}/pluck_{k}.wav" for k in range(5)], -20, "start", False, "a sugar"),
    "chord": ([f"{OWN}/chord.wav"], -18, "start", False, "the recipe's outputs"),
    "knock": ([f"{OWN}/wood.wav"], -17, "peak", False, "'kayu': wood"),
}

music = json.loads((HERE / "cues.json").read_text())["music"]
# The composed bed fades over its last four seconds, which would dip the music at the loop's seam. bed-loop.mp3 is the
# same bed with its tail replaced, from 52.77 s, by the music four bars earlier (bars found by the onsets' period,
# 10.56 s; an 0.12 s crossfade just before a beat), so it plays at full level through the seam and the run-on.
# bed-even.mp3 is that bed through a gentle compressor (3.5:1 from -30 dB, ffmpeg acompressor): the composed bed drops
# to near silence between phrases (-28 dB in the pause at 7.3 s against -20 dB at its middle), which a phone does not
# play at all; evened, its quiet bars sit within about 5 dB of the rest.
music.update({"file": "../../examples/fotosintesis/music/bed-even.mp3", "lufs": -24, "start": 0, "fade_in": 0.01, "fade_out": 0.3, "duck_db": -6, "fill": True,
              "note": "Composed for this film (ElevenLabs Music, the prompt in music/bed.json), its faded tail replaced by the bars before it and its quiet bars evened; -24 LUFS, 6 dB down under the voice."})
# The take's first syllable ("Po-", a plosive straight out of silence) is its hardest transient: the limiter holds it,
# but the encoder lifts it back over -1 dBFS true peak, so it is played 2 dB down.
voice = {"duck_db": -6, "sfx_db": -3, "gain": [{"from": 0.12, "to": 0.34, "db": -2}],
         "note": "The bed dips 6 dB under the voice and stays heard in the pauses; the paper sounds sit 3 dB lower while someone speaks."}

# A run of small sounds (leaves, clicks, plucks) is one texture after its first, and the balance's weight ticks are one
# all through; two of a kind closer than 0.07 s are one sound. A sound whose moment falls inside a spoken word sits
# under the word. The sheet that wipes between two sets starts on a line's last word too, but it is the cut itself:
# levels.py sets it as loud as a named cue.
RUNS = {"tick", "click", "pluck", "rustle"}
SPOKEN = sorted((w[0], w[1]) for v in json.loads((HERE / "voice" / "voice.json").read_text())["film"].values() for w in v["words"])
on_word = lambda t: any(a + 0.02 <= t <= b - 0.02 for a, b in SPOKEN)
# Levels measured on the mix (the effects layer against the voice-and-music layer, both at the mix's own gain,
# momentary loudness over the onset), each cue raised or lowered by the difference and measured again: a named cue
# (in a gap, or on a word's first syllable) sits about 6 dB under voice and music, a sound inside a word about 11 dB
# under, and the textures (leaves, ticks, clicks, plucks after the first, air, rain) keep their kind's level, 3 dB
# down. {event time: peak dB}; cues.levels.json is written by levels.py beside this file (--write).
LEVELS = json.loads((HERE / "cues.levels.json").read_text()) if (HERE / "cues.levels.json").exists() else {}
events, last, count, last_named = [], {}, {}, {}
for e in sorted(json.loads((HERE / "events.json").read_text()), key=lambda e: e["at"]):
    kind = e["kind"]
    files, db, align, under, note = KINDS[kind]
    if e["at"] - last.get(kind, -9) < 0.07:
        continue
    last[kind] = e["at"]
    k = count.get(kind, 0)
    count[kind] = k + 1
    f = files[e.get("note", k) % len(files)] if kind == "pluck" else files[k % len(files)]
    cue = {"t": r(e["at"]), "file": f, "db": db, "align": align, "note": note}
    if e.get("wipe"):
        cue["note"] = "a sheet slides over the frame: the cut between two sets"
    if under or (kind in RUNS and e["at"] - last_named.get(kind, -9) < 1.6) or on_word(e["at"]) or kind == "tick":
        cue["under"] = True
        cue["db"] = LEVELS.get(f"{e['at']:.3f}", db - 3)
    else:
        last_named[kind] = e["at"]
        cue["db"] = LEVELS.get(f"{e['at']:.3f}", db)
    if kind == "rain":
        cue["trim"] = [0, r(min(2.0, e.get("end", e["at"] + 1.6) - e["at"]))]
        cue["fade"] = 0.3
    if kind == "chord":
        cue["trim"], cue["fade"] = [0, 1.8], 0.8
    events.append(cue)

cues = {"music": music, "voice": voice, "events": events}
out = ["{", f'  "music": {json.dumps(music, ensure_ascii=False)},', f'  "voice": {json.dumps(voice, ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(events) - 1 else ''}" for i, e in enumerate(events)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(events)} events -> cues.json")
