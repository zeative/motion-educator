"""Writes cues.json from storyboard.json and events.json, so every sound sits on the frame its picture happens.

    node kit/tools/render.mjs examples/popcorn --events      (events.json: everything film.js logged)
    python3 examples/popcorn/sfx.build.py                    (sfx/*.wav: the comic sounds the library lacks)
    python3 examples/popcorn/cues.build.py

The picture is held on twelves (the Comic template's "stepped": 12), so a thing logged at t is first seen on the next
twelfth of a second: each sound is put on that frame, not on t.

The bed is composed for this film (music/bed.mp3; its prompt is in music/bed.json). It has one rest, a dead stop of
the whole band from 34.9 to 35.9 s, at the end of s10 and the start of s11. It is kept, not patched ("fill" is
off): the picture makes it a beat. As the band stops, the panel's dots finish turning blue and the foam freezes hard
(film.js); in the silence the set foam crunches (KRES!); the band comes back on the frame the panel splits for s11,
the line about the sound. The board also asks the bed to cut for one beat on the POP (s08): that is a ride.
"""
import json
import math
from pathlib import Path

HERE = Path(__file__).parent
sb = json.loads((HERE / "storyboard.json").read_text())
L, OWN = "lib", "../../examples/popcorn/sfx"
r = lambda x: round(x, 3)
seen = lambda t: r(math.ceil(t * 12 - 1e-6) / 12)  # the first held frame that shows what happens at t

music = json.loads((HERE / "cues.json").read_text())["music"]
music.update({
    "file": "../../examples/popcorn/music/bed.mp3", "start": 0, "lufs": -21, "fade_in": 0.01, "fade_out": 0.6, "duck_db": -6, "fill": False,
    # the bed cuts out for one beat (112 bpm) on the POP and comes back with the steam (storyboard: music)
    "ride": [[0, 0], [seen(29.59) - 0.03, 0], [seen(29.59) + 0.02, -22], [30.12, -22], [30.26, 0], [60, 0]],
    "note": "Composed for this film (ElevenLabs Music, the prompt in music/bed.json); -21 LUFS under the voice. Its one rest (34.9-35.9 s) is kept as a beat in the picture, not patched; a ride cuts it for one beat on the POP.",
})
voice = {"duck_db": -8, "note": "The bed dips 8 dB under the voice (not the default 11), so the band stays heard between sentences; the effects dip 4 dB under it (the default)."}

events = []
# Levels (the reviewers' rule, a ceiling and a floor): the effects layer is never louder than the voice and no effect
# is pushed over the words, yet every named cue is clearly heard: it sits about 4 to 8 dB under the voice and the
# music at its onset. levels.py measures that on the mix (the full mix less the music-and-voice mix, gain-matched,
# 400 ms momentary loudness) and writes levels.json, the correction each cue needs to land 6 dB under. Only the
# textures (pen strokes, the sizzle, the hiss, the rattle, the roll, the creak, the leak) sit "under".
LEVELS = json.loads((HERE / "levels.json").read_text()) if (HERE / "levels.json").exists() else {}
# The verifier measured five effects louder than the word they land on ("air" 16.2, "jadi" 17.2, "naik" 20.4,
# "pati" 31.3, "kulit" 46.9): those sit 4 dB lower than the levelling puts them, and levels.py leaves them alone.
LOW = {"16.25 send_1.mp3", "17.25 puff.wav", "20.42 thump_2.mp3", "20.42 thump_2.wav", "19.75 send_1.mp3", "31.33 whoosh_fast_6.mp3", "31.33 whoosh_fast_3.mp3", "31.33 whoosh_fast_5.mp3", "46.92 thump_2.wav"}
def add(t, file, db, note, **more):
    key = f"{r(t):.2f} {Path(file).name}"
    if not more.get("under"):
        db = min(-1.0, db + LEVELS.get(key, 0))
        if key in LOW:
            db -= 4
            note += " (kept low: on a word)"
    events.append({"t": r(t), "file": file, "db": round(db, 1), "note": note, **more})
k = {"knock": 0, "whoosh": 0, "pen": 0}
# where each whoosh's body starts: its lead-in is cut, so it arrives with the move (and its peak is where it lands)
LEAD = {2: 0.16, 3: 0.04, 5: 0.12, 6: 0.3}
for e in json.loads((HERE / "events.json").read_text()):
    kind, at, end, note = e["kind"], e["at"], e["end"], e.get("note", "")
    t = seen(at)
    if kind == "burst":
        add(t, f"{L}/sfx/pop_1.mp3", -12, "the burst kicks on 'meledak': pop", align="peak")
        add(t, f"{L}/sfx/sub_drop_2.mp3", -18, "and its thump", align="peak")
    elif kind in ("whoosh", "flip"):
        k["whoosh"] += 1
        w = [3, 6, 5][k["whoosh"] % 3]
        add(seen(at + 0.12), f"{L}/sfx/whoosh_fast_{w}.mp3", -17, note, align="peak", trim=[LEAD[w], 1.2], fade_in=0.03, fade=0.2)
    elif kind in ("zoom", "grow", "split", "push"):
        add(seen(min(end, at + 0.22)), f"{L}/sfx/whoosh_fast_2.mp3", -17, note, align="peak", trim=[LEAD[2], 0.86], fade_in=0.03, fade=0.2)
    elif kind == "hmm":
        add(t, f"{OWN}/hmm.wav", -20, note)
    elif kind == "pop":
        add(t, f"{OWN}/hmm.wav", -20, "the kid asks: a puzzled trumpet slide, hmm?")
    elif kind == "knock":
        if note == "≈ 9× TEKANAN UDARA":
            continue  # it lands on the frame the needle stops: the needle's tick is its sound
        k["knock"] += 1
        # a light pop as the box pops on (a wooden knock is too short to be heard over the voice)
        add(t, f"{L}/sfx/send_1.mp3", -15, f"callout pops on: {note}", align="peak")
    elif kind == "plip":
        if int(note.split()[-1]) % 2:  # the board's three plips: drops 1, 3 and 5 (each drop is seen; three are heard)
            add(t, f"{OWN}/plip.wav", -13, note)
    elif kind == "ink":
        k["pen"] += 1
        add(t, f"{L}/foley/pen_{k['pen'] % 3 + 1}.wav", -24, "ink drawn on", trim=[0, r(min(0.9, end - at + 0.05))], fade=0.05, under=True)
    elif kind == "sizzle":
        add(t, f"{OWN}/sizzle.wav", -24, "the oil sizzles under the pan's panel", trim=[0, 2.5], fade=0.5, under=True)
        add(t, f"{L}/sfx/pop_3.mp3", -15, "SSSS pops up", align="peak")
    elif kind == "drop":
        add(seen(at + 0.12), f"{L}/sfx/card_2.mp3", -15, note, align="peak")
    elif kind == "puff":
        if int(note.split()[1]) % 2:  # three puffs for six drops turning to steam
            add(t, f"{OWN}/puff.wav", -16, note)
    elif kind == "hiss":
        add(t, f"{OWN}/hiss_rise.wav", -26, note, trim=[0, 2.6], fade=0.15, under=True)
    elif kind == "press":
        add(t, f"{L}/foley/thump_2.wav", -17, note, align="peak")
    elif kind == "rattle":
        add(t, f"{OWN}/rattle.wav", -24, note, trim=[0, r(end - at)], fade=0.1, under=True)
    elif kind == "psst":
        add(t, f"{OWN}/psst.wav", -15, note)
    elif kind == "whistle":
        # it runs under "seratus delapan puluh": a texture, 5 dB lower than before
        add(t, f"{OWN}/whistle.wav", -29, note, trim=[0, r(seen(end) - t)], fade=0.02, under=True)
    elif kind == "needle":
        add(t, f"{L}/sfx/tick_2.mp3", -16, note, align="peak")
    elif kind == "roll":
        # the roll builds from the dive into the kernel to the hit: it ends a frame before the POP
        add(seen(29.59) - 2.0, f"{OWN}/drumroll.wav", -24, "a tense drum roll, building to the POP", fade=0.05, under=True)
    elif kind == "creak":
        add(t, f"{OWN}/creak.wav", -22, note, under=True)
    elif kind == "crack":
        add(t, f"{OWN}/crack.wav", -14, note)
    elif kind == "POP":
        add(t, f"{L}/sfx/pop_1.mp3", -10, "THE POP: the hull gives way (the hit)", align="peak", duck=True)
        add(t, f"{L}/sfx/sub_drop_2.mp3", -12, "THE POP: its bass thump", align="peak")
    elif kind == "steam":
        add(seen(at + 0.25), f"{L}/sfx/whoosh_long_2.mp3", -16, "the steam jets out: FWOOSH", align="peak")
    elif kind == "blub":
        add(t, f"{OWN}/blub.wav", -20, note)
    elif kind == "crunch":
        add(t, f"{OWN}/crunch.wav", -12, "KRES! the set foam crunches, in the band's rest")
    elif kind == "krak":
        add(t, f"{OWN}/krak.wav", -14, note)
    elif kind == "nope":
        add(t, f"{OWN}/buzzer.wav", -22, "the X: a buzzer, no", fade=0.05)
    elif kind == "steampop":
        add(t, f"{L}/sfx/pop_1.mp3", -12, "the clean pop: the steam escaping", align="peak")
        add(t, f"{OWN}/puff.wav", -16, "and its puff")
    elif kind == "ding":
        add(t, f"{L}/sfx/success_1.mp3", -16, "the tick: ding", align="peak", trim=[0, 0.6], fade=0.3)
    elif kind == "leak":
        add(t, f"{OWN}/deflate.wav", -24, note, under=True)
    elif kind == "smallpop":
        add(t, f"{L}/sfx/pop_2.mp3", -13, note, align="peak")
    elif kind == "sad":
        add(t, f"{OWN}/trombone.wav", -22, "NGGAK MELETUS: a short sad trombone, wah-wah", trim=[0, 0.56], fade=0.12)
    elif kind == "turn":
        add(seen(at + 0.25), f"{L}/sfx/card_3.mp3", -12, note, align="peak")
    elif kind == "flick":
        add(t, f"{L}/sfx/send_1.mp3", -18, f"{note} is marked", align="peak")
    elif kind == "stamp":
        add(t, f"{L}/foley/thump_1.wav", -14, "AIR stamps in", align="peak")
    elif kind == "stamp2":
        add(t, f"{L}/foley/thump_2.wav", -15, "+ KULIT KERAS stamps in", align="peak")
    elif kind == "stinger":
        add(t, f"{OWN}/stab.wav", -18, "= POP!: a brass stab", duck=0.6)
        add(t, f"{L}/sfx/pop_1.mp3", -13, "= POP!: and its pop", align="peak")
    elif kind in ("cool", "fwoosh"):
        continue  # (shown, not heard: the dots turning, the lettering of the steam's whoosh)
    else:
        raise SystemExit(f"no sound for event kind {kind!r} at {at}")

events.sort(key=lambda e: e["t"])
out = ["{", f'  "music": {json.dumps(music, ensure_ascii=False)},', f'  "voice": {json.dumps(voice, ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(events) - 1 else ''}" for i, e in enumerate(events)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(events)} events -> cues.json")
