"""Writes cues.json from events.json, so every sound sits on the event film.js draws at that moment.

    node kit/tools/render.mjs examples/internet-dns --events     (events.json: every block, card, hop and move)
    python3 examples/internet-dns/cues.build.py

The bed is composed for this film (music/bed.mp3, kit/audio/music.mjs: a light electronic bed, as the template's Sound
line asks); its rests are patched from a bar away ("fill") and it runs on into the opening for the loop. The effects
are the template's: soft clicks and pops as blocks and tags appear, a blip where a cube reaches a server or a router,
a paper flick for each answer card, a key click for Enter and the typing, a drawer click and a clock tick at the
cache, a low air whoosh under the sea, a ripple of pops as the reply's packets leave, a chime when the number lands and
when the page is complete. Small and clean, between the words; the camera's moves get soft air under the picture.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
L = "lib"
r = lambda x: round(x, 3)

music = json.loads((HERE / "cues.json").read_text())["music"]
# The composed bed fades out over its last six seconds (from 49.5 s), though the film loops: so the bed this film uses
# is music/bed-loop.mp3, the composed bed with that fade replaced by four bars from earlier in its last third, joined on
# a bar line (the bed measures 99 BPM, first beat at 0.14 s): 0 to 48.625 s, then 38.928 s onwards, a 60 ms crossfade.
#   ffmpeg -i music/bed.mp3 -af atrim=0:48.625 a.wav; ffmpeg -ss 38.928 -i music/bed.mp3 -t 8.3 b.wav
#   ffmpeg -i a.wav -i b.wav -filter_complex acrossfade=d=0.06:c1=tri:c2=tri -c:a libmp3lame -q:a 2 music/bed-loop.mp3
# Under the DNS chain (s07 to s11: the resolver asking the root, .org and ns0, the answer kept) the narration is dense
# and the picture busy, so the bed rides 6 dB lower there.
music.update({"file": "../../examples/internet-dns/music/bed-loop.mp3", "lufs": -23, "start": 0, "fade_in": 0.01, "fade_out": 0.6, "duck_db": -7, "fill": True, "bpm": 99,
              "ride": [[0, 0], [17.1, 0], [17.6, -6], [29.5, -6], [30.1, 0], [53, 0]],
              "note": "Composed for this film (ElevenLabs Music, the prompt in music/bed.json), its end fade replaced by four bars of itself (bed-loop.mp3); -23 LUFS under the voice (at -17 LUFS before the master gain), 6 dB lower under the DNS chain (17.6 to 29.5 s); its rests patched from a bar away; it runs on into the opening (loop)."})
# The voice runs almost the whole film, so the effects are not lowered under it (sfx_db 0): they are short and placed on
# what happens, and they are the template's clicks and pops, heard between and over the words.
voice = {"lufs": -17, "duck_db": -8, "sfx_db": 0, "note": "The bed dips 8 dB under the voice, so it stays heard between sentences; the effects are not lowered under it."}

events = []
n = {}
last = {}
# How much each kind of sound matters: within 0.4 s of each other, the one that matters more is the named
# event and the other becomes a texture under it ("under": its lift is not measured), so a run of ticks reads as one.
RANK = {"key": 3, "bonk": 4, "card": 4, "chime": 5, "drawer": 4, "slap": 4, "thud": 4, "blip": 3, "rise": 3, "pop": 2, "tick": 2, "tag": 1, "click": 3, "send": 0, "bubble": 0, "whoosh": 0}


# The effects stay under the narration: the whole layer is set FX dB from the table's levels so that, measured alone at
# the finished mix's gain, its loudest moment is at or below about -20 LUFS momentary and below the voice's. A named
# event that cannot rise 5 dB over the words at that level is marked "under" (UNDER below) rather than pushed up.
# Long sounds (a chime, a paper slide, a landing, air) carry more loudness for their peak than a click, so they sit
# lower still.
FX = {"short": -3, "long": -8, "success_1": -13, "boing_1": -10, "send_1": -4}
# (the number on Wikimedia's building, 41.81 s, is moved into the pause before "Singapore")
BOOST = {}
LONG = ("success_", "card_", "sub_drop", "boing", "send_2", "whoosh")
# Measured in the finished mix (cues -> mix.py -> lift), these named events stay under 5 dB of lift at a level that keeps
# the layer under the voice, and each lands on a word (9.38 and 26.07 on a stressed one): they are heard as texture.
UNDER = {2.95, 4.71, 7.43, 9.38, 18.39, 18.89, 21.27, 24.12, 26.07, 27.14, 34.32, 35.89, 36.43, 38.53}
# The levels, measured: the effects and voice+music mixed apart at the finished mix's gain, each cue's momentary
# loudness (400 ms) at its onset against voice+music's there. A named cue is set to sit about 6 dB under (7 for a long
# one), at most -5 dBFS at its peak (-4 to -4.5 for the soft key and paper sounds, -4 for a tick); a cue in UNDER about 9.5 dB
# under. (Clicks are short, so at that ceiling the key, the paper cards and a tick still measure 8 to 10 dB under.)
# Where the voice is between words and the bed is up (1.99, 46.43, 49.19), the cue is held lower so it is never louder
# than the voice at that moment.
LEVEL = {1.43: -4.5, 1.99: -7.5, 2.95: -9.9, 4.71: -11.5, 6.92: -4, 7.43: -15, 9.38: -11.7, 10.05: -5.8, 12.71: -6.2, 14.33: -4,
         15.31: -5, 18.39: -9, 18.89: -9, 21.27: -7.7, 23.03: -5, 24.12: -11.9, 24.99: -5, 26.07: -20.1, 27.14: -11.7, 27.76: -5,
         29.39: -21.7, 30.13: -4, 30.67: -12.6, 31.77: -4.5, 34.32: -11.7, 35.89: -9, 36.43: -12.4, 38.07: -6.2, 38.53: -12,
         39.11: -6.4, 41.81: -9, 42.74: -6.4, 44.97: -9, 45.78: -17, 46.43: -7.5, 47.71: -4, 48.45: -5, 49.19: -9}


def add(t, file, db, note, **more):
    stem = Path(file).stem
    db += FX.get(stem, FX["long"] if stem.startswith(LONG) else FX["short"])
    named = not more.get("under")  # (LEVEL and UNDER are for these, not for a texture at the same moment)
    db += next((v for k, v in BOOST.items() if abs(t - k) < 0.03 and named), 0)
    if named and any(abs(t - u) < 0.03 for u in UNDER):
        more["under"] = True
        note += " (under: it lands on a word and cannot rise 5 dB over it without masking it)"
    if named:
        db = next((v for k, v in LEVEL.items() if abs(t - k) < 0.03), db)
    events.append({"t": r(t), "file": f"{L}/{file}", "db": db, "align": more.pop("align", "peak"), "note": note, **more})


def nxt(kind, count):
    n[kind] = n.get(kind, -1) + 1
    return n[kind] % count + 1


raw = json.loads((HERE / "events.json").read_text())
named, prev = [], None
for e in raw:
    if e.get("under") or RANK[e["kind"]] == 0:
        continue
    if prev and e["at"] - prev["at"] < 0.4:
        # A run (ticks a beat apart, a blip then the card it brings back): the sound that matters most is the event.
        lead = next((x for x in reversed(named) if not x.get("under")), None)
        # (an event film.js marks "lead" is the one heard, whatever the other is)
        if lead and e["at"] - lead["at"] < 0.9 and (e.get("lead") or RANK[e["kind"]] > RANK[lead["kind"]]) and not lead.get("lead"):
            lead["under"] = True
        elif lead and e["at"] - lead["at"] < 0.9:
            e["under"] = True
    prev = e
    named.append(e)

for e in raw:
    kind, t, note = e["kind"], e["at"], e.get("note", "")
    soft, under = e.get("soft", False), e.get("under", False)
    if t - last.get(kind, -9) < 0.05:
        continue  # two things at once: one sound
    last[kind] = t
    pan = e.get("pan")
    extra = {"under": True} if under else {}
    if pan is not None:
        extra["pan"] = pan
    lo = 9 if under else 0  # a texture sits well under the named events
    if kind == "key":
        if soft:
            add(t, "sfx/key_1.mp3", -20, note, trim=[0.17, 0.33], fade=0.05, under=True)
        else:
            add(t, "sfx/key_1.mp3", -5, note, trim=[0.15, 0.42], fade=0.08)
            # (a key click is too brief to be heard over the words by itself: a soft pop gives the press its body)
            add(t, "sfx/pop_3.mp3", -7, note + " (body under the key)", under=True)
    elif kind == "pop":
        if "pops up from the phone" in note:
            add(t, "sfx/send_2.mp3", -9, note, trim=[0, 0.6], fade=0.25)
        elif soft and "reply packet" in note and "lands" in note:
            # the rest of the page's packets landing in the phone: a ripple you hear under the first one
            add(t, "sfx/pop_3.mp3", -14, note, trim=[0, 0.3], fade=0.06, **extra)
        elif soft:
            add(t, f"sfx/pop_{2 if e.get('rise', 0) % 2 else 3}.mp3", -12 - lo, note, trim=[0, 0.3], fade=0.06, **extra)
        else:
            add(t, "sfx/pop_1.mp3", -6 - lo, note, trim=[0, 0.35], fade=0.1, **extra)
    elif kind == "tick":
        if soft:
            add(t, "sfx/tick_1.mp3", -5 - lo, note, **extra)
        else:
            if "question mark" in note:
                add(t, "sfx/pop_3.mp3", -5 - lo, note, **extra)
            else:
                add(t, "sfx/tick_2.mp3", -6 - lo, note, trim=[0, 0.3], fade=0.08, **extra)
    elif kind == "tag":
        add(t, "sfx/pop_3.mp3", (-6 if not soft else -8) - lo, note, **extra)
    elif kind == "rise":
        # Islands and cards rising one after another: the same pop, a step brighter each time.
        add(t, "sfx/pop_1.mp3", -6 + 1.2 * min(2, e.get("rise", 0)) - lo, note, trim=[0, 0.35], fade=0.1, duck=True, **extra)
    elif kind == "blip":
        add(t, "sfx/send_1.mp3", (-5 if not soft else -8) - lo, note, **extra)
    elif kind == "send":
        add(t, "sfx/send_2.mp3", -18, note, trim=[0, 0.5], fade=0.2, under=True)
    elif kind == "card":
        if soft:
            # (a card that rises softly, like the DNS card in s06: a texture, but one you hear)
            add(t, "sfx/card_3.mp3", -5, note, trim=[0, 0.6], fade=0.2, under=True)
            if "answer" not in note:  # (the answer's card flies under the chime of the number: no pop there)
                add(t, "sfx/pop_2.mp3", -5, note + " (the card's pop)", trim=[0, 0.3], fade=0.06, under=True)
        else:
            # An answer card: a paper slide with some body to it, so it is heard over the words.
            answer = "straight back" in note
            add(t, "sfx/success_3.mp3" if answer else "sfx/card_3.mp3", (-9 if answer else -5) - lo, note, trim=[0, 0.7], fade=0.25, duck=True, **extra)
            if not answer and not under:
                # (the paper slide is soft at its front: a pop under it marks the moment the card appears)
                add(t, "sfx/pop_2.mp3", -6, note + " (the card's pop)", trim=[0, 0.3], fade=0.06, under=True)
    elif kind == "chime":
        add(t, "sfx/success_1.mp3", -4 - lo, note, trim=[0, 1.4], fade=0.6, duck=True, **extra)
    elif kind == "bonk":
        add(t, "foley/boing_1.wav", -5 - lo, note, duck=True, **extra)
    elif kind == "drawer":
        add(t, "sfx/click_1.mp3", -7 - lo, note, **extra)
    elif kind == "slap":
        add(t, "sfx/card_2.mp3", -6 - lo, note, trim=[0, 0.4], fade=0.15, **extra)
        if not under:
            add(t, "sfx/pop_2.mp3", -6, note + " (the label's pop)", trim=[0, 0.3], fade=0.06, under=True)
    elif kind == "click":
        add(t, "sfx/pop_3.mp3", -5 - lo, note, **extra)
    elif kind == "thud":
        # (a soft landing is a texture: its long tail would cover the click of the number that follows it)
        add(t, "sfx/sub_drop_2.mp3", -8 - (9 if soft else lo), note, duck=True, **({"under": True} if soft else extra))
    elif kind == "bubble":
        # (the run along the cable: a long low whoosh under the words, loud enough to be heard as the sea)
        add(t, "sfx/whoosh_long_2.mp3", -5, note, align="start", trim=[0.1, 1.5], fade=0.5, fade_in=0.15, under=True)
    elif kind == "whoosh":
        # Air under each camera move, its peak in the middle of the move, panned the way the picture travels; the
        # short hops between servers get a lighter one.
        k = nxt("whoosh", 3)
        add(t, ["sfx/whoosh_fast_2.mp3", "sfx/whoosh_fast_5.mp3", "sfx/whoosh_fast_3.mp3"][k - 1], -12 if e.get("small") else -8, note, trim=[0, 0.75], fade=0.3, under=True, **({"pan": pan} if pan is not None else {}))
    else:
        raise SystemExit(f"no sound for the event kind '{kind}'")

events.sort(key=lambda e: e["t"])
cues = {"music": music, "voice": voice, "events": events}
out = ["{", f'  "music": {json.dumps(music, ensure_ascii=False)},', f'  "voice": {json.dumps(voice, ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(events) - 1 else ''}" for i, e in enumerate(events)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(events)} events -> cues.json")
