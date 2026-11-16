"""Writes cues.json from storyboard.json and the take, so every sound sits on the event it belongs to.

    python3 examples/noise-cancelling/cues.build.py

The bed is the film's own composition (music/bed.mp3, made by kit/audio/music.mjs for this take at its length),
slowed 1.3 % (bed-fit.mp3) so its last chord rings to the final frame; the length is unchanged, so it is reused.
The sound follows the motion (references/sound.md): a soft air move on every camera move, a click as a part lifts,
a tick as a label lands, 12 to 20 dB under the voice. Three hits are loud: the payoff ('almost nothing'), the turn
('But') and the answer ('on time'). The times below follow film.js's events.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
L = "lib/sfx"
sb = json.loads((HERE / "storyboard.json").read_text())
said = json.loads((HERE / "voice" / "voice.json").read_text())["film"]
s = {x["id"]: x for x in sb["shots"]}
D = sb["duration"]
r = lambda x: round(x, 3)


def word(shot, w):
    norm = lambda x: x.lower().strip(".,?:!*")
    for a, b, text in said[shot]["words"]:
        if norm(text) == norm(w):
            return a, b
    raise KeyError(f"{w} not in {shot}")


at = lambda shot, w: word(shot, w)[0]
end = lambda shot, w: word(shot, w)[1]
T = lambda id, f=0: s[id]["start"] + f * (s[id]["end"] - s[id]["start"])

music = {"file": "../../examples/noise-cancelling/music/bed-fit.mp3", "start": 0, "lufs": -22, "fade_in": 0.01, "fade_out": 0.3, "duck_db": -6,
         "ride": [[0, 0], [7, 0], [9, -2.5], [12.5, -2.5], [14, 0], [19.5, 0], [21, -2.5], [23, -2.5], [24.5, 0], [31.5, 0], [33.5, -2.5], [36, -2.5], [37.5, 0],
                  [44, 0], [45.5, -2], [47.5, -2], [49, 0], [56, 0], [57.5, -2.5], [60, -2.5], [62, 0], [68, 1], [71, 8], [73, 13], [r(D), 18]],
         "note": "Composed for this film (music/bed.json has the prompt), slowed 1.3 % (bed-fit.mp3) so its last chord rings to the final frame. -22 LUFS under the voice; ridden down over its swells and up over the last chord's decay."}

E = []


def ev(t, f, db, note, **k):
    E.append({"t": r(t), "file": f"{L}/{f}.mp3", "db": db, "align": k.pop("align", "peak"), **k, "note": note})


# a camera move: a soft air sound shaped to it (fade in with the ease-in), panned the way it travels
def air(t, f, db, note, pan=0, fade_in=0.25, fade=0.3, trim=None):
    extra = {"pan": pan, "fade_in": fade_in, "fade": fade, "align": "start"}
    if trim:
        extra["trim"] = trim
    ev(t, f, db, note, **extra)


tick = lambda t, note, db=-26, f="tick_1": ev(t, f, db, note, trim=[0, 0.25], fade=0.12)

# hook
air(0.0, "whoosh_long_1", -27, "the opening orbit round the headphone", pan=0.3, fade_in=0.6, fade=1.2)
air(T("s02") + 0.1, "whoosh_long_2", -24, "the orbit round to the cup's inside", pan=-0.3, fade_in=0.4, fade=0.8)
ev(at("s02", "adding") + 0.02, "shimmer_1", -24, "the driver glows cyan behind the fabric", trim=[0, 0.6], fade=0.3)
ev(T("s03") - 0.12, "whoosh_fast_3", -19, "the dive into the air (between 'sound.' and 'Sound')")
# the air
tick(at("s04", "squeezed"), "pin 'squeezed' lands")
tick(at("s04", "stretched"), "pin 'stretched' lands", f="tick_2")
air(T("s04", 0.6), "whoosh_long_3", -25, "the pull back to the head", pan=0.4, fade_in=0.5, fade=0.9)
# the flip
air(T("s05") - 0.05, "whoosh_fast_2", -23, "the push to the outside mic", pan=0.2)
tick(at("s05", "microphone") - 0.05, "pin on the grille", -24, "tick_2")
ev(at("s05", "hears") - 0.02, "pop_1", -27, "the grille lights as the wave arrives", trim=[0, 0.3], fade=0.15)
ev(T("s06") - 0.06, "click_1", -20, "the shell unclips (in the gap after 'in.')", trim=[0, 0.3], fade=0.1)
air(T("s06") + 0.05, "whoosh_fast_4", -25, "the shell lifts away", pan=-0.2)
ev(T("s06") + 0.3, "typing_1", -30, "the spark running down the flex", trim=[0, 0.6], fade=0.3, align="start")
tick(at("s06", "chip") - 0.05, "pin on the chip", -24)
ev(at("s06", "upside-down") - 0.2, "shimmer_2", -27, "the chip glows", trim=[0, 0.5], fade=0.3)
air(T("s07"), "whoosh_fast_5", -26, "the rise over the board", pan=0.15)
for w, f in [("squeezes,", "tick_1"), ("stretch", "tick_2"), ("stretches.", "tick_1"), ("squeeze", "tick_2")]:
    tick(at("s07", w) - 0.05, f"pin at '{w}'", -27, f)
ev(T("s08") - 0.1, "click_2", -21, "the cup's parts slide apart", trim=[0, 0.3], fade=0.1)
air(T("s08"), "whoosh_long_1", -25, "the swing round to the driver", pan=-0.4, fade_in=0.3, fade=0.6, trim=[0, 1.6])
tick(at("s08", "speaker") - 0.05, "pin on the driver", -24)
air(T("s09") - 0.05, "whoosh_fast_6", -22, "the cut sweeps down through head and cup", pan=0)
ev(T("s09") + 0.05, "click_1", -24, "the parts close up", trim=[0, 0.3], fade=0.1)
PAYOFF = end("s09", "nothing.") + 0.12
ev(PAYOFF, "impact_big_3", -10, "THE PAYOFF: almost nothing, in the hold after 'nothing'", duck=0.6, trim=[0, 0.6], fade=0.4)
ev(PAYOFF, "sub_drop_2", -16, "its body", trim=[0, 0.55], fade=0.3)
tick(T("s10") + 0.15, "the three lanes appear", -28)
ev(end("s10", "interference.") + 0.05, "shimmer_1", -16, "the sheen across the name, in the hold", trim=[0, 0.4], fade=0.2)
TURN = T("s11") - 0.06
ev(TURN, "impact_big_2", -8, "THE TURN: at the end of the hold, before 'But'", duck=0.5, trim=[0, 0.7], fade=0.45)
ev(TURN, "sub_drop_1", -17, "its body", trim=[0, 0.6], fade=0.35)
air(at("s11", "copy"), "whoosh_fast_7", -27, "the copy slips late", pan=0.4)
air(at("s11", "in") - 0.35, "whoosh_fast_7", -28, "and slides back", pan=-0.4)
# the catch
air(T("s12") + 0.2, "whoosh_long_2", -21, "the crane up, to scale", pan=0, fade_in=0.8, fade=1.4)
tick(at("s12", "hum,"), "pin '100 Hz hum'", -25)
ev(at("s12", "easy.") - 0.05, "pop_2", -26, "the cups glow cyan on 'easy'", trim=[0, 0.3], fade=0.15)
tick(at("s13", "long") - 0.1, "the ruler's label lands", -24, "tick_2")
ev(T("s14") - 0.08, "card_1", -18, "the chart panel rises", trim=[0, 0.4], fade=0.2)
ev(at("s14", "match") - 0.1, "pop_3", -25, "the bars", trim=[0, 0.3], fade=0.15)
air(T("s15") - 0.08, "whoosh_fast_8", -21, "the drop back down to the head", pan=-0.2)
tick(at("s15", "squeak") - 0.05, "pin 'squeak'", -25)
air(T("s16"), "whoosh_fast_1", -27, "the push in on the cup", pan=0.2)
tick(at("s16", "centimetres") - 0.1, "the ruler's label", -24, "tick_2")
ev(T("s17") - 0.08, "card_2", -18, "the chart panel rises again", trim=[0, 0.4], fade=0.2)
ev(at("s17", "delay") - 0.1, "pop_1", -25, "the magnifier opens", trim=[0, 0.3], fade=0.15)
ev(at("s17", "out") - 0.15, "pop_3", -25, "the bars", trim=[0, 0.3], fade=0.15)
ev(T("s18") + 0.2, "key_2", -22, "the clatter starts (something drops)", trim=[0, 0.3], fade=0.1)
ev(at("s18", "harder"), "impact_big_1", -17, "the clatter's front hits the cup (a small hit)", trim=[0, 0.35], fade=0.25)
ev(T("s18b") - 0.08, "card_3", -18, "the chart panel", trim=[0, 0.4], fade=0.2)
# cushions
air(T("s19") - 0.05, "whoosh_fast_2", -24, "the drop to the cushion", pan=0.3)
air(at("s19", "cushions") - 0.2, "whoosh_long_3", -28, "the cut slides across the cushion", pan=-0.2, fade_in=0.4, fade=0.6, trim=[0, 1.2])
tick(at("s19", "cushions") + 0.5, "pin 'memory foam'", -26)
tick(at("s19", "still"), "pin 'leather cover'", -26, "tick_2")
air(T("s20") - 0.05, "whoosh_fast_6", -23, "the cut from above again")
ev(at("s20", "block") - 0.02, "pop_2", -25, "the highs bounce off the cushion", trim=[0, 0.3], fade=0.15)
# recap
RC = T("s21")
ev(RC - 0.12, "card_3", -12, "the recap: the cup stands up on the desk, in the pause after 'catch.'")
ev(RC + 0.1, "click_2", -22, "its parts slide apart", trim=[0, 0.3], fade=0.1)
air(RC + 0.05, "whoosh_long_1", -26, "the recap's orbit", pan=0.3, fade_in=0.5, fade=1.0, trim=[0, 2.4])
for w in ["answer:", "headphones", "noise", "own"]:
    tick(at("s21", w) - 0.05, f"recap pin at '{w}'", -25)
air(T("s22") - 0.08, "whoosh_fast_4", -22, "back to the ear, cut open")
RINGS = end("s22", "time.") + 0.12
ev(RINGS, "impact_big_3", -9, "THE ANSWER: the two waves meet and vanish, after 'time'", duck=0.6, trim=[0, 1.4], fade=0.9)
ev(RINGS, "sub_drop_2", -15, "its body", trim=[0, 1.0], fade=0.5)
ev(T("s23") + 1.3, "shimmer_2", -15, "the sheen across the poster line", trim=[0, 1.2], fade=0.6)

E.sort(key=lambda e: e["t"])
cues = {"music": music, "events": E}
out = ["{", f'  "music": {json.dumps(cues["music"], ensure_ascii=False)},', '  "events": [']
out += [f"    {json.dumps(e, ensure_ascii=False)}{',' if i < len(E) - 1 else ''}" for i, e in enumerate(E)]
out += ["  ]", "}"]
(HERE / "cues.json").write_text("\n".join(out) + "\n")
print(f"{len(E)} events -> cues.json")
