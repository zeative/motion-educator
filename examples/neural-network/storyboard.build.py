"""Writes storyboard.json for "How does a neural network learn?" (portrait 1080 x 1920, the Neon Line template).

The sample film of the Neon Line template: thin glowing lines on near-black, cyan for the network (its lines, nodes
and the guess that flows through it), magenta for the error and the nudges that come back, white for type. It has no
voice: the words are on screen, two or three at a time, and every shot lasts as long as its words take to read
(0.5 s + 17 characters a second), rounded up to whole beats of the music (96 BPM), so every cut is on the beat:

    python3 examples/neural-network/storyboard.build.py && node kit/tools/storyboard.mjs examples/neural-network --png

The network in the film is a real one, trained below: three yes/no inputs ("meow?", "bark?", "four legs?"), three
hidden neurons and one output ("cat?"), sigmoid units, plain gradient descent on the squared error over three
examples (a cat, a dog, a fish). Every number on screen (the first guess, the error, the nudged weight, the second
guess, the error curve, the final answers, the line widths) is this run's, computed here, not drawn by eye.
"""
import json
import math
import random
from pathlib import Path

HERE = Path(__file__).parent
shots = []

# ── The toy network, trained (fact n3) ────────────────────────────────────────────────────────────────────────────
INPUTS = ["meow?", "bark?", "four legs?"]
DATA = [("cat", (1, 0, 1), 1), ("dog", (0, 1, 1), 0), ("fish", (0, 0, 0), 0)]
SEED, RATE, ROUNDS = 8, 2.0, 1000


def sig(z):
    return 1 / (1 + math.exp(-z))


def init(seed):
    r = random.Random(seed)
    w1 = [[r.uniform(-1, 1) for _ in range(3)] for _ in range(3)]  # w1[hidden][input]
    b1 = [r.uniform(-1, 1) for _ in range(3)]
    w2 = [r.uniform(-1, 1) for _ in range(3)]  # hidden -> output
    b2 = r.uniform(-1, 1)
    return w1, b1, w2, b2


def forward(p, x):
    w1, b1, w2, b2 = p
    h = [sig(sum(w1[j][i] * x[i] for i in range(3)) + b1[j]) for j in range(3)]
    return h, sig(sum(w2[j] * h[j] for j in range(3)) + b2)


def nudge(p, x, t):
    """One step of gradient descent on E = (y - t)^2 / 2, the error sent back through the network (backpropagation)."""
    w1, b1, w2, b2 = p
    h, y = forward(p, x)
    d = (y - t) * y * (1 - y)
    dh = [d * w2[j] * h[j] * (1 - h[j]) for j in range(3)]
    return ([[w1[j][i] - RATE * dh[j] * x[i] for i in range(3)] for j in range(3)], [b1[j] - RATE * dh[j] for j in range(3)],
            [w2[j] - RATE * d * h[j] for j in range(3)], b2 - RATE * d)


def mse(p):
    return sum((forward(p, x)[1] - t) ** 2 for _, x, t in DATA) / len(DATA)


START = init(SEED)
CAT = DATA[0][1]
GUESS0 = forward(START, CAT)[1]
ONE = nudge(START, CAT, 1)  # one nudge, on the cat
GUESS1 = forward(ONE, CAT)[1]
p, CURVE = ONE, [mse(START), mse(ONE)]
CATERR = [1 - forward(ONE, CAT)[1]]  # the cat's own error, 1 - its guess: after the one nudge, then after each round
for _ in range(ROUNDS):
    for _, x, t in DATA:
        p = nudge(p, x, t)
    CURVE.append(mse(p))
    CATERR.append(1 - forward(p, CAT)[1])
END = p
FINAL = {name: forward(END, x)[1] for name, x, _ in DATA}
SHOWN_W = 1  # the hidden -> output weight the film labels (the one the first nudge moves most visibly)
W_BEFORE, W_AFTER = START[2][SHOWN_W], ONE[2][SHOWN_W]


def strength(p, i):
    """How much a yes/no input weighs: the sum of the sizes of its three lines."""
    return sum(abs(p[0][j][i]) for j in range(3))


def n2(v):
    return f"{v:.2f}"


assert (n2(GUESS0), n2(GUESS1)) == ("0.27", "0.40")
assert (n2(1 - GUESS0), n2(1 - GUESS1)) == ("0.73", "0.60")
assert (n2(W_BEFORE), n2(W_AFTER)) == ("0.66", "0.79")
assert n2(FINAL["cat"]) == "0.98" and n2(FINAL["dog"]) == "0.01" and n2(FINAL["fish"]) == "0.01"
assert max(range(3), key=lambda i: strength(END, i)) == 0 and max(range(3), key=lambda i: strength(START, i)) == 1
WEIGHTS = 3 * 3 + 3  # the lines drawn; the four biases are not drawn

# ── Drawing helpers (1080 x 1920; what must be read stays above y 1250, clear of the captions) ────────────────────
CY, MG = "#0a9c88", "#d23c95"  # the board's stand-ins for cyan #00f5d4 and magenta #f15bb5 (legible on paper)
IN = [(200, 500), (497, 500), (794, 500)]
HID = [(200, 790), (497, 790), (794, 790)]
OUT = (497, 1070)
R = 36
BAR = (200, 794, 1200)  # the guess meter: 0 at x 200, 1 at x 794, on y 1200


def fr(at, note, *draw):
    flat = []
    for d in draw:
        flat.extend(d if isinstance(d, list) else [d])
    return {"at": at, "note": note, "draw": flat}


def label(x, y, text, size=44, **more):
    return {"label": [round(x), round(y)], "text": text, "size": size, **more}


def grid():
    """The faint perspective grid on the floor, below the captions."""
    out = [{"line": [540 + (540 - x) * 0.02, 1470, x, 1910], "colour": MG, "width": 1.5} for x in range(-500, 1600, 260)]
    out += [{"line": [0, y, 1080, y], "colour": MG, "width": 1.5} for y in (1520, 1610, 1740, 1900)]
    return out


def seg(a, b, r0=R, r1=R):
    (x0, y0), (x1, y1) = a, b
    d = math.hypot(x1 - x0, y1 - y0)
    ux, uy = (x1 - x0) / d, (y1 - y0) / d
    return [round(x0 + ux * r0), round(y0 + uy * r0), round(x1 - ux * r1), round(y1 - uy * r1)]


def along(a, b, k):
    return (a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k)


def width(w):
    """Line width means weight, everywhere in the film: 1 px plus 5 px per unit of |w|, at most 16 px."""
    return round(min(16, 1 + 5 * abs(w)), 1)


def toy(p=START, x=None, labels=True, glow_out=False, colour=CY, only_in=None):
    """The toy network, its line widths drawn from its weights (|w|)."""
    w1, _, w2, _ = p
    out = []
    for j in range(3):
        for i in range(3):
            if only_in is None or only_in == i:
                out.append({"line": seg(IN[i], HID[j]), "colour": colour, "width": width(w1[j][i])})
        out.append({"line": seg(HID[j], OUT), "colour": colour, "width": width(w2[j])})
    for k, (cx, cy) in enumerate(IN):
        out.append({"ring": [cx, cy, R], "colour": CY if not x or x[k] else "#6b6b72", "width": 6})
        if x:
            out.append(label(cx, cy + 16, str(x[k]), 44))
    out += [{"ring": [cx, cy, R], "colour": CY, "width": 6} for cx, cy in HID]
    out.append({"ring": [OUT[0], OUT[1], R + (10 if glow_out else 0)], "colour": CY, "width": 9 if glow_out else 6})
    if labels:
        out += [label(200, 428, INPUTS[0], 44), label(497, 428, INPUTS[1], 44), label(794, 390, "four", 44), label(794, 436, "legs?", 44)]
        out.append(label(560, 1085, "cat?", 44, align="start"))
    return out


def pulses(k, back=False, colour=None):
    """Bright pulses part way along every line: k = 0..1 down the network (or up it, magenta, when back)."""
    out = []
    c = colour or (MG if back else "ink")
    for j in range(3):
        for i in range(3):
            a, b = (IN[i], HID[j]) if not back else (HID[j], IN[i])
            if back or i != 1:
                q = along(a, b, min(1, k * 2))
                out.append({"dot": [round(q[0]), round(q[1]), 9], "colour": c})
        a, b = (HID[j], OUT) if not back else (OUT, HID[j])
        q = along(a, b, max(0, min(1, k * 2 - 1)) if not back else min(1, k * 2))
        out.append({"dot": [round(q[0]), round(q[1]), 10], "colour": c})
    return out


def bx(v):
    return BAR[0] + (BAR[1] - BAR[0]) * v


def meter(guess=None, ghost=None, error=False, target=True):
    """The guess meter under the output: 0 to 1, the guess in cyan, the answer in white, the gap (error) in magenta."""
    x0, x1, y = BAR
    out = [{"line": [x0, y, x1, y], "width": 4}, {"line": [x0, y - 16, x0, y + 16], "width": 4}, {"line": [x1, y - 16, x1, y + 16], "width": 4}]
    out += [label(x0 - 40, y + 14, "0", 36), label(x1 + 40, y + 14, "1", 36)]
    if target:
        out += [{"line": [x1, y - 40, x1, y + 40], "width": 6}, label(x1 - 10, y - 56, "answer: 1", 34, align="end")]
    if ghost is not None:
        out += [{"line": [round(bx(ghost)), y - 30, round(bx(ghost)), y + 30], "colour": CY, "width": 3}]
    if guess is not None:
        gx = round(bx(guess))
        out += [{"line": [gx, y - 40, gx, y + 40], "colour": CY, "width": 8}, label(gx, y - 56, f"guess {n2(guess)}", 36, colour=CY)]
        if error:
            out += [{"line": [gx + 6, y, x1 - 6, y], "colour": MG, "width": 16}, label((gx + x1) / 2, y + 58, f"error {n2(1 - guess)}", 40, colour=MG)]
    return out


def icon(kind, cx, cy, s=1.0, colour="ink"):
    """Line drawings of the three examples: a cat, a dog, a fish (outlines only)."""
    if kind == "cat":
        d = f"M{cx - 60 * s} {cy + 40 * s} Q{cx - 70 * s} {cy - 20 * s} {cx - 50 * s} {cy - 40 * s} L{cx - 55 * s} {cy - 85 * s} L{cx - 20 * s} {cy - 55 * s} Q{cx} {cy - 62 * s} {cx + 20 * s} {cy - 55 * s} L{cx + 55 * s} {cy - 85 * s} L{cx + 50 * s} {cy - 40 * s} Q{cx + 70 * s} {cy - 20 * s} {cx + 60 * s} {cy + 40 * s} Q{cx} {cy + 70 * s} {cx - 60 * s} {cy + 40 * s} Z M{cx - 90 * s} {cy + 5 * s} L{cx - 35 * s} {cy + 12 * s} M{cx + 90 * s} {cy + 5 * s} L{cx + 35 * s} {cy + 12 * s}"
    elif kind == "dog":
        d = f"M{cx - 45 * s} {cy - 50 * s} Q{cx} {cy - 75 * s} {cx + 45 * s} {cy - 50 * s} Q{cx + 60 * s} {cy} {cx + 30 * s} {cy + 50 * s} Q{cx} {cy + 70 * s} {cx - 30 * s} {cy + 50 * s} Q{cx - 60 * s} {cy} {cx - 45 * s} {cy - 50 * s} Z M{cx - 45 * s} {cy - 50 * s} Q{cx - 90 * s} {cy - 30 * s} {cx - 75 * s} {cy + 30 * s} M{cx + 45 * s} {cy - 50 * s} Q{cx + 90 * s} {cy - 30 * s} {cx + 75 * s} {cy + 30 * s}"
    else:
        d = f"M{cx - 70 * s} {cy} Q{cx - 10 * s} {cy - 55 * s} {cx + 50 * s} {cy} Q{cx - 10 * s} {cy + 55 * s} {cx - 70 * s} {cy} Z M{cx + 50 * s} {cy} L{cx + 90 * s} {cy - 35 * s} L{cx + 90 * s} {cy + 35 * s} Z"
    return [{"path": d, "colour": colour, "width": 6}, label(cx, cy + 120 * s, kind, round(36 * max(s, 0.8)))]


def phone(net=True, k=None, s=1.0, c=(540, 760), outline=True, floor=True):
    """The opening picture: a phone outline, and inside it a bigger glowing network: the AI you use every day.
    s scales it about its centre c (s02 shrinks it into the lower half)."""
    T = lambda x, y: (round(c[0] + (x - 540) * s), round(c[1] + (y - 760) * s))
    out = []
    if outline:
        (x0, y0), (x1, y1), r = T(250, 270), T(830, 1250), round(60 * s)
        out += [{"path": f"M{x0 + r} {y0} H{x1 - r} Q{x1} {y0} {x1} {y0 + r} V{y1 - r} Q{x1} {y1} {x1 - r} {y1} H{x0 + r} Q{x0} {y1} {x0} {y1 - r} V{y0 + r} Q{x0} {y0} {x0 + r} {y0} Z", "colour": CY, "width": 6},
                {"line": [*T(480, 310), *T(600, 310)], "colour": CY, "width": 6}]
    if net:
        layers = [[330 + 420 * i / 3 for i in range(4)], [310 + 460 * i / 4 for i in range(5)], [310 + 460 * i / 4 for i in range(5)], [380 + 320 * i / 2 for i in range(3)]]
        ys = [430, 640, 850, 1060]
        rr = round(22 * s)
        for a in range(3):
            for x0 in layers[a]:
                for x1 in layers[a + 1]:
                    out.append({"line": seg(T(x0, ys[a]), T(x1, ys[a + 1]), rr, rr), "colour": CY, "width": 2.5})
        for a, row in enumerate(layers):
            out += [{"ring": [*T(x, ys[a]), rr], "colour": CY, "width": 5} for x in row]
        if k is not None:
            for a in range(3):
                for x0, x1 in zip(layers[a], layers[a + 1][1:] + layers[a + 1][:1]):
                    q = along(T(x0, ys[a]), T(x1, ys[a + 1]), k)
                    out.append({"dot": [round(q[0]), round(q[1]), round(9 * s)], "colour": "ink"})
    return out + (grid() if floor else [])


def shot(id, act, type_, caption=None, read=None, beats=None, **more):
    """Every shot is as long as its words take to read (0.5 s + 17 characters a second), in whole beats of the music."""
    start = shots[-1]["end"] if shots else 0.0
    text = (read or caption or "").replace("*", "")
    need = math.ceil((0.5 + len(text) / 17) / BEAT - 1e-6)
    n = max(need, beats or 0)
    fields = {"caption": caption} if caption else {}
    shots.append({"id": id, "act": act, "type": type_, "start": round(start, 3), "end": round(start + n * BEAT, 3), **fields, **more})


BPM = 96
BEAT = 60 / BPM  # 0.625 s

# ── The shots ────────────────────────────────────────────────────────────────────────────────────────────────────
shot("s01", "hook", "wide", "The AI you use *learned* what it knows.",
     teaches="The surprise the film starts from: the AI you use every day was not written rule by rule; it learned.",
     screen="Near-black #07070c, the faint magenta perspective grid on the floor below y 1450. In the middle, a phone drawn as one glowing cyan outline (x 250 to 830, y 270 to 1250, rounded corners, a short speaker line at the top). Inside it a glowing network: four rows of outline nodes (4, 5, 5, 3) from y 430 to 1060, every node joined to every node of the next row by a thin cyan line. White pulses race down the lines.",
     motion="Frame 0 is finished: the phone and the network are lit and pulses are already moving. The pulses race down row by row at a steady pace; the nodes they reach flare for a moment; the whole picture breathes very slightly (bloom).",
     carries="The network in the phone.",
     transition="The network's lines flicker as a list of rules is drawn beside it.",
     sound="The synth bed is running from frame 0: a pulsing bass on the beat, a soft hum under the network; tiny ticks as pulses reach nodes.",
     check="Frame 0 is a finished, lit picture. The caption sits below the phone, clear of it.",
     facts=["n1"],
     frames=[fr(0, "Frame 0, finished: the phone outline and the glowing network inside it, pulses already moving.", phone(k=0.35)),
             fr(0.5, "The pulses race down to the last row; nodes flare as they arrive.", phone(k=0.75), {"move": [900, 450, 900, 1050], "text": "signal"}),
             fr(1, "A beat of stillness: the network glows, the caption complete.", phone(k=0.95), {"cut": "a list of rules"})])

RULES = ["if it meows → cat", "if it barks → dog", "if …"]


def rules(crossed=False):
    out = [{"path": "M140 330 H940 V720 H140 Z", "colour": "ink", "width": 4, "dashed": True}, label(540, 400, "RULES", 52)]
    out += [label(180, 500 + 80 * k, r, 40, align="start") for k, r in enumerate(RULES)]
    if crossed:
        out += [{"line": [160, 350, 920, 700], "width": 8}, {"line": [920, 350, 160, 700], "width": 8}]
    return out


shot("s02", "hook", "diagram", "Nobody wrote its rules.", beats=4,
     teaches="The tension: nobody wrote its rules one by one.",
     screen="The phone slides down and shrinks to the lower half (to 42 %, y 800 to 1210), its network still running. Above it, a dashed white outline card titled 'RULES' with three rule lines written in white: 'if it meows → cat', 'if it barks → dog', 'if …'. Then the card is crossed out with a big white X.",
     motion="The rule lines type on fast, one per beat; on the last beat a white X draws across the card in two strokes and the card's glow dies (flicker off).",
     carries="The phone with its network.",
     transition="Everything dims; one line of type comes up.",
     sound="A soft keyboard patter for the rules; a short descending zap for the X.",
     check="The X is white, not magenta (magenta means the error in this film).",
     facts=["n1"],
     frames=[fr(0, "The rules type on above the shrunken phone.", rules(), phone(s=0.42, c=(540, 1010), k=0.4)),
             fr(1, "Crossed out: nobody wrote them.", rules(crossed=True), phone(s=0.42, c=(540, 1010)), {"cut": "dim, type"})])

shot("s03", "hook", "type", read="So how does it learn?", beats=4,
     teaches="Asks the one question the film answers.",
     screen="Type only, three lines centred on x 497 from y 560 to 900 (inside the side margins): 'So how' / 'does it' in glowing white Space Grotesk 112 px, 'learn?' under them in magenta. The grid glows faintly below.",
     motion="Lines flicker on like a sign powering up (two quick flickers, then steady); the magenta word arrives last.",
     carries="The dark stage; the network comes back behind the type.",
     transition="The type fades up and away; the network draws on behind it.",
     sound="A power-up buzz and a click on 'learn?'.",
     check="Readable in under two seconds; no caption doubles it.",
     frames=[fr(0, "The first lines flicker on.", {"title": [497, 640], "text": "So how\ndoes it", "size": 112}, grid()),
             fr(1, "The question complete, 'learn?' in the second colour.", {"title": [497, 640], "text": "So how\ndoes it\nlearn?", "size": 112, "accent": "learn?"}, grid(), {"cut": "the network appears"})])


def big_net(note=True):
    out = phone(outline=False, s=1.25, c=(540, 740))  # the network without the phone outline, pushed in
    if note:
        out += [{"line": [258, 312, 170, 270], "width": 3}, label(150, 258, "nodes", 44), {"line": [755, 721, 830, 610], "width": 3}, label(800, 590, "connections", 40)]
    return out


shot("s04", "weights", "diagram", "Inside is a *neural network*: nodes, all connected.",
     teaches="What is inside: a neural network, nodes joined by lines.",
     screen="Pushed in through the phone: its outline is gone and the network, 1.25 times larger, fills the upper frame (the same four rows, now x 250 to 830, y 330 to 1140). Two white labels with thin leader lines: 'nodes' to a node at the top left, 'connections' to a line in the middle right.",
     motion="The camera pushes through the phone outline (it slides off the edges); the lines redraw fast row by row; the labels' leaders draw on, then their words.",
     carries="The network, close.",
     transition="Push in on two of the lines.",
     sound="A whoosh for the push, two soft ticks for the labels.",
     check="Labels sit beside what they name, with leaders; nothing overlaps the caption band.",
     facts=["n2"],
     frames=[fr(0, "Push in through the phone outline.", phone(), {"camera": "push"}),
             fr(0.5, "The network fills the frame.", big_net(note=False)),
             fr(1, "Labelled: 'nodes' and 'connections'.", big_net(), {"cut": "push in on two lines"})])

W_A, W_B = abs(START[0][0][1]), abs(START[0][2][2])  # two of the toy's own starting weights, shown big and small


def two_lines(k=None):
    out = [{"ring": [200, 420, R], "colour": CY, "width": 6}, {"ring": [200, 900, R], "colour": CY, "width": 6},
           {"ring": [880, 420, R], "colour": CY, "width": 6}, {"ring": [880, 900, R], "colour": CY, "width": 6}]
    out += [{"line": [236, 420, 844, 420], "colour": CY, "width": width(W_A)}, {"line": [236, 900, 844, 900], "colour": CY, "width": width(W_B)}]
    out += [label(540, 370, f"weight {n2(W_A)}: strong", 48), label(540, 850, f"weight {n2(W_B)}: weak", 48)]
    if k is not None:
        out += [{"dot": [round(236 + 608 * k), 420, 20], "colour": "ink"}, {"dot": [round(236 + 608 * k), 900, 9], "colour": "ink"}]
    return out + grid()


shot("s05", "weights", "compare", "Every connection has a *weight*: its strength.",
     teaches="Every connection has a weight: how strongly it passes its signal on.",
     screen=f"(As built: the two lines are bigger, 0.92 at y 560 and 0.28 at y 1000; a signal of 1 sits in each left node, and what arrives at the right is written: '1 × 0.92 = 0.92', '1 × 0.28 = 0.28'; 'line width = size of the weight' stays up from the pulse's start. The cut into this shot follows a pulse out of the phone's network.) Two connections, one above the other, each a cyan line between two outline nodes (x 200 to 880): the upper one thick and bright, labelled 'weight {n2(W_A)}: strong'; the lower one thin and dim, 'weight {n2(W_B)}: weak'. A pulse runs along each: a big bright one above, a small faint one below.",
     motion="The two lines draw on; a pulse leaves each left node at the same moment and runs to the right; the upper one arrives as a flash, the lower as a glint.",
     carries="The idea of a weight: line width means weight from here on.",
     transition="Pull back: the two lines become two of the toy network's twelve.",
     sound="Two zaps, one strong, one faint.",
     check=f"Line widths are drawn from the weights ({n2(W_A)} and {n2(W_B)}); the labels match.",
     facts=["n2", "n3"],
     frames=[fr(0, "Two lines draw on, one thick, one thin.", two_lines()),
             fr(0.5, "A pulse runs along each.", two_lines(0.45), {"move": [300, 300, 780, 300], "text": "signal"}),
             fr(1, "The strong one flashes, the weak one glints.", two_lines(1.0), {"cut": "pull back to a tiny network"})])

shot("s06", "guess", "wide", "Here's a tiny one. Its job: is it a *cat*?",
     teaches="A tiny network to watch learn: three yes/no questions in, one guess out: is it a cat?",
     screen="The toy network, stacked top to bottom: three input nodes at y 500 labelled above them 'meow?', 'bark?', 'four legs?'; three hidden nodes at y 790; one output node at y 1070 labelled 'cat?' at its right. Twelve cyan lines, each as wide as its starting weight (random, between 0 and 1).",
     motion="Pull back from the two lines; the nodes pop on with a flicker, top row first; the twelve lines draw on fast; the labels write on.",
     carries="The toy network.",
     transition="Continuous: an example drops in from the top.",
     sound="A rising run of three blips for the three rows.",
     check="Twelve lines, three plus three plus one nodes; widths differ, as the weights do.",
     facts=["n3"],
     frames=[fr(0, "Pull back: the nodes pop on, row by row.", [{"ring": [x, y, R], "colour": CY, "width": 6} for x, y in IN + HID + [OUT]], grid(), {"camera": "pull"}),
             fr(0.5, "The twelve lines draw on, each as wide as its weight.", toy(labels=False), grid()),
             fr(1, "Labelled: three questions in, 'cat?' out.", toy(), grid(), {"cut": "an example drops in"})])

shot("s07", "guess", "diagram", "First example: a *cat*.", beats=4,
     teaches="The first example goes in: a cat: it meows (1), doesn't bark (0), has four legs (1).",
     screen="A cat drawn in one white outline line drops in at the top (y 210 to 340); the three inputs show their answers inside the nodes: '1', '0', '1'; the '0' node stays dim.",
     motion="The cat outline draws on in one stroke; three short white lines flick from it to the inputs; each input node flickers on with its number (the '0' one stays dark).",
     carries="The network with the cat's answers in it.",
     transition="Continuous: the signal leaves the inputs.",
     sound="A soft chirp as the cat draws; three blips, the middle one muted.",
     check="The inputs read 1, 0, 1, matching meow, bark, four legs for a cat.",
     facts=["n3"],
     frames=[fr(0, "The cat outline draws on at the top.", toy(), icon("cat", 540, 270, 0.9), grid()),
             fr(1, "The answers in the inputs: 1, 0, 1.", toy(x=CAT), icon("cat", 540, 270, 0.9), grid(), {"cut": "no cut"})])

shot("s08", "guess", "diagram", "The signal flows through to a *guess*.",
     teaches="The signal flows through every weight and comes out as a guess.",
     screen=f"(As built: the camera rides the signal down; as it reaches the hidden row each node shows its value, 0.20, 0.45, 0.78, and under the guess the sum is written: '0.20×(−0.62) + 0.45×0.66 + 0.78×(−0.82)', '+ bias (−0.53) = −1.00 → 0.27', 'node value × line weight, added up, then squashed into 0 to 1'.) White pulses leave the lit inputs and run down every line to the hidden nodes, then on to the output; the output ring flares and a number writes on beside it: '{n2(GUESS0)}'.",
     motion="Pulses race down at a steady speed, brighter on the thicker lines; the hidden nodes flare as they arrive; the output flares last and the number appears at its value.",
     carries=f"The guess, {n2(GUESS0)}.",
     transition="Continuous: the meter draws under the output.",
     sound="A quick rising arpeggio as the pulses travel, a click as the number lands.",
     check=f"The number is {n2(GUESS0)}, the network's real output for the cat.",
     facts=["n3", "n4"],
     frames=[fr(0, "Pulses leave the lit inputs.", toy(x=CAT), pulses(0.2), grid()),
             fr(0.5, "They reach the hidden row and go on.", toy(x=CAT), pulses(0.6), grid(), {"move": [970, 560, 970, 1000], "text": "down"}),
             fr(1, f"The output flares: '{n2(GUESS0)}'.", toy(x=CAT, glow_out=True), label(380, 1088, n2(GUESS0), 56, colour=CY), grid(), {"cut": "the meter"})])

shot("s09", "error", "chart", f"It guesses {n2(GUESS0)}. The *answer* is 1.",
     teaches=f"Compare the guess with the right answer: {n2(GUESS0)}, when it should be 1.",
     screen=f"A horizontal outline meter under the output (x 200 to 794 at y 1200, '0' and '1' at its ends): a cyan tick at {n2(GUESS0)} labelled 'guess {n2(GUESS0)}', a white tick at 1 labelled 'answer: 1'.",
     motion="The meter draws on left to right; the cyan tick drops from the output to its place; the white tick lights at 1.",
     carries="The meter with the two ticks.",
     transition="Continuous: the gap between them fills.",
     sound="A tick for each mark.",
     check=f"The cyan tick sits at {n2(GUESS0)} of the meter's length (x {round(bx(GUESS0))}).",
     facts=["n4"],
     frames=[fr(0, "The meter draws on under the output.", toy(x=CAT, glow_out=True), meter(target=False), grid()),
             fr(1, "The guess and the answer on it.", toy(x=CAT, glow_out=True), meter(GUESS0), grid(), {"cut": "the gap fills"})])

shot("s10", "error", "chart", "The gap is the *error*.",
     teaches="The gap between the guess and the answer is the error.",
     screen=f"The gap on the meter, from {n2(GUESS0)} to 1, fills with a thick magenta line; under it 'error {n2(1 - GUESS0)}' in magenta.",
     motion="The magenta gap fills from the cyan tick to the white one in one quick stroke and buzzes once.",
     carries="The magenta error.",
     transition="Continuous: the error flows back up into the network.",
     sound="A low buzz: the wrong note.",
     check=f"The magenta segment runs exactly from {n2(GUESS0)} to 1; the label says {n2(1 - GUESS0)}.",
     facts=["n4"],
     frames=[fr(0, "The gap starts to fill from the guess.", toy(x=CAT, glow_out=True), meter(GUESS0), {"line": [round(bx(GUESS0)) + 6, BAR[2], round(bx(GUESS0)) + 150, BAR[2]], "colour": MG, "width": 16}, grid()),
             fr(1, f"The error, {n2(1 - GUESS0)}, in magenta.", toy(x=CAT, glow_out=True), meter(GUESS0, error=True), grid(), {"cut": "the error goes up"})])

shot("s11", "nudge", "diagram", "Now the error goes *backwards*.",
     teaches="The key step: the error is sent backwards through the network.",
     screen="Magenta pulses leave the output and run up every line, to the hidden nodes and on to the inputs: the same lines the guess came down, the other way. The meter keeps its magenta gap.",
     motion="The magenta pulses rise row by row at a steady pace; each line they pass glows magenta for a moment, then settles back to cyan.",
     carries="The network, every line just touched by the error.",
     transition="Continuous: the lines start to change width.",
     sound="A reversed zap, rising.",
     check="The pulses go up (output to inputs), magenta, never cyan.",
     facts=["n5"],
     frames=[fr(0, "Magenta pulses leave the output, going up.", toy(x=CAT), pulses(0.25, back=True), meter(GUESS0, error=True), grid()),
             fr(1, "They reach the inputs: every line has had its share.", toy(x=CAT), pulses(0.95, back=True), meter(GUESS0, error=True), grid(), {"move": [970, 1000, 970, 560], "text": "backwards"}, {"cut": "weights shift"})])


def nudges(p=START, done=False):
    out = toy(ONE if done else p, x=CAT)
    a, b = HID[SHOWN_W], OUT
    m = along(a, b, 0.5)
    out.append(label(m[0] + 24, m[1] - 10, f"{n2(W_BEFORE)} → {n2(W_AFTER)}" if done else n2(W_BEFORE), 40, align="start", colour=MG if done else CY))
    if done:
        for j in range(3):
            for i in (0, 2):
                q = along(IN[i], HID[j], 0.5)
                up = abs(ONE[0][j][i]) > abs(START[0][j][i])
                out.append({"arrow": [round(q[0] - 30), round(q[1] + (14 if up else -14)), round(q[0] - 30), round(q[1] + (-14 if up else 14))], "colour": MG, "width": 4})
    return out


shot("s12", "nudge", "diagram", "Each weight gets nudged a *little*, to shrink the error.",
     teaches="Each weight is nudged a little, in the direction that makes the error smaller.",
     screen=f"(As built: the arrows carry the words 'thicker' and 'thinner'; then the camera goes close on the middle hidden → output line, '0.66 → 0.79' beside it, 'its weight' and a 0-to-1 gauge whose bar grows from 0.66 to 0.79 over a ghost of the old value, 'one nudge, made big so you can see it'.) The toy network: every line the error touched changes width a little (the ones from the lit inputs); small magenta arrows beside them show up or down; the line from the middle hidden node to the output is labelled with its weight changing: '{n2(W_BEFORE)} → {n2(W_AFTER)}'.",
     motion=f"All the touched lines swell or thin at once, eased over 0.6 s; the label's number ticks from {n2(W_BEFORE)} to {n2(W_AFTER)} once (no counting through other values); the arrows flash once.",
     carries="The nudged network.",
     transition="Continuous: a new guess runs down.",
     sound="A soft rising synth swell, a click on the new number.",
     check=f"The widths change by the computed amounts; the label reads {n2(W_BEFORE)} → {n2(W_AFTER)}.",
     facts=["n5", "n6"],
     frames=[fr(0, "Before the nudge: the weight reads its old value.", nudges(), grid()),
             fr(0.5, "The touched lines swell or thin; arrows show which way.", nudges(done=True), grid()),
             fr(1, f"The labelled weight now {n2(W_AFTER)}.", nudges(done=True), meter(GUESS0, error=True), grid(), {"cut": "guess again"})])

shot("s13", "nudge", "compare", f"Guess again: {n2(GUESS1)}. *Closer*.",
     teaches=f"The same cat again: the guess is now {n2(GUESS1)}, closer to 1: the error shrank.",
     screen=f"Pulses run down the nudged network again; on the meter the old guess stays as a faint cyan ghost at {n2(GUESS0)}, the new cyan tick lands at {n2(GUESS1)}, and the magenta gap is shorter: 'error {n2(1 - GUESS1)}'.",
     motion="One fast run of pulses down; the cyan tick slides from the ghost to its new place; the magenta gap shortens with it.",
     carries="The meter, the error a bit shorter.",
     transition="The examples start to cycle at the top.",
     sound="The arpeggio again, one step higher; a softer buzz.",
     check=f"Ghost at {n2(GUESS0)}, new tick at {n2(GUESS1)}, gap {n2(1 - GUESS1)}.",
     facts=["n6"],
     frames=[fr(0, "Pulses run down the nudged network.", toy(ONE, x=CAT), pulses(0.5), meter(ghost=GUESS0), grid()),
             fr(1, f"The new guess, {n2(GUESS1)}, beside the ghost of the old one; a shorter error.", toy(ONE, x=CAT, glow_out=True), meter(GUESS1, ghost=GUESS0, error=True), grid(), {"cut": "examples take turns"})])

shot("s14", "repeat", "wide", "Repeat: cat, dog, fish, again and again.",
     teaches="It is repeated for every example, over and over: guess, error, nudge.",
     screen="Across the top (y 200 to 340) the three examples drawn in white outline: a cat, a dog, a fish; one at a time lights up and its 1/0 answers drop into the inputs. Below, pulses run down in cyan and back up in magenta, faster and faster; a white counter at the right of the output: 'round 1', '2', '3'…",
     motion="The examples light in turn, one per beat, then faster; the down-and-up pulse runs speed up into streaks; the counter ticks on each round.",
     carries="The repeating network.",
     transition="The streaks collapse into a chart.",
     sound="The bass doubles; the zaps blur into a rolling hum.",
     check="Cyan goes down, magenta goes up, every time.",
     facts=["n3", "n7"],
     frames=[fr(0, "The cat lights; its answers drop in.", toy(x=CAT), icon("cat", 250, 270, 0.6), icon("dog", 540, 270, 0.6), icon("fish", 820, 270, 0.6), grid()),
             fr(0.5, "The dog's turn: pulses down in cyan, up in magenta.", toy(x=DATA[1][1]), pulses(0.6), pulses(0.3, back=True), icon("cat", 250, 270, 0.6), icon("dog", 540, 270, 0.6), icon("fish", 820, 270, 0.6), grid()),
             fr(1, "Faster and faster; the counter runs.", toy(x=DATA[2][1]), icon("cat", 250, 270, 0.6), icon("dog", 540, 270, 0.6), icon("fish", 820, 270, 0.6), label(860, 1140, "round 3…", 40), grid(), {"cut": "into a chart"})])

SHOW = 60  # the chart shows the first 60 rounds: after that the curve lies on the floor
CX0, CX1, CY0, CY1 = 170, 900, 1100, 440  # the chart's box: x for rounds 0..SHOW, y for error 0..0.25


def curve(upto=SHOW):
    pts = [(round(CX0 + (CX1 - CX0) * k / SHOW), round(CY0 - (CY0 - CY1) * CURVE[k] / 0.25)) for k in range(0, upto + 1, 2)]
    return {"curve": pts, "colour": MG, "width": 7}


def chart(upto):
    out = [{"axes": [CX0, CY0, CX1 - CX0 + 40, CY0 - CY1 + 60], "xlabel": f"rounds (0 – {SHOW})", "ylabel": "error"}]
    out += [label(CX0 - 30, CY1 + 14, n2(0.25), 30, align="end"), label(CX0 - 30, CY0 + 10, "0", 30, align="end")]
    out.append(curve(upto))
    return out + grid()


shot("s15", "repeat", "chart", "The *error* keeps falling.", beats=4,
     teaches="Round after round, the error falls.",
     screen=f"(As built: the chart plots the cat's own error, 1 − its guess, so its numbers continue the meter's: from 0.60 after the one nudge, over rounds 0 to 60, the round written at the curve's head, and 'round 1,000: 0.02' at its end; y axis 0 to 0.75, labelled 'the cat's error'.) A glowing outline chart, y 440 to 1100: 'error' up the side (0 to {n2(0.25)}), 'rounds (0 – {SHOW})' along the bottom; the line, in magenta (it is the error), is the network's real mean squared error over the three examples, from {n2(CURVE[0])} at the start, falling steeply and then lying almost flat on the floor.",
     motion="The magenta line draws on left to right at a steady pace, a bright white pulse at its head; the white axes are already there.",
     carries="The flat end of the curve.",
     transition="The chart folds away; the three examples come back with their answers.",
     sound="A descending synth glide following the line.",
     check=f"The curve is drawn from the computed values; it starts at {n2(CURVE[0])}.",
     facts=["n7"],
     frames=[fr(0, "The chart's axes; the line starts high.", chart(6)),
             fr(1, "The line falls steeply, then lies flat.", chart(SHOW), {"cut": "the results"})])


def results(n=3):
    out = []
    for k, (name, _, target) in enumerate(DATA[:n]):
        y = 380 + k * 330
        out += icon(name, 200, y, 1.0)
        out += [{"line": [380, y, 900, y], "width": 4}, {"line": [900, y - 26, 900, y + 26], "width": 4}, {"line": [380, y - 26, 380, y + 26], "width": 4}]
        gx = round(380 + 520 * FINAL[name])
        out += [{"line": [gx, y - 36, gx, y + 36], "colour": CY, "width": 8}, label(gx, y - 50, n2(FINAL[name]), 44, colour=CY)]
        out += [label(380, y + 58, "0", 30), label(900, y + 58, "1", 30)]
    return out + grid()


shot("s16", "repeat", "compare", f"*{ROUNDS:,} rounds* later: cat {n2(FINAL['cat'])}, dog {n2(FINAL['dog'])}.",
     teaches="After a thousand rounds the guesses are right: near 1 for the cat, near 0 for the dog and the fish.",
     screen=f"Three rows, one per example: the white outline of the cat, the dog and the fish at the left, and beside each a meter from 0 to 1 with its cyan tick and number: cat {n2(FINAL['cat'])}, dog {n2(FINAL['dog'])}, fish {n2(FINAL['fish'])}. A small counter at the top: '{ROUNDS:,} rounds'.",
     motion="The rows slide in one per beat; each tick drops to its place and its number appears at its value.",
     carries="The trained network's answers.",
     transition="The meters fold back into the network.",
     sound="Three bright blips, the cat's highest.",
     check=f"Ticks at {n2(FINAL['cat'])}, {n2(FINAL['dog'])}, {n2(FINAL['fish'])}: the computed outputs after {ROUNDS} rounds.",
     facts=["n7"],
     frames=[fr(0, "The cat's row slides in.", results(1), label(540, 230, f"{ROUNDS:,} rounds", 40)),
             fr(0.5, "The dog's row slides in under it.", results(2), label(540, 230, f"{ROUNDS:,} rounds", 40)),
             fr(1, "All three: cat near 1, dog and fish near 0.", results(), label(540, 230, f"{ROUNDS:,} rounds", 40), {"cut": "back to the network"})])

shot("s17", "repeat", "diagram", "The *meow* weights grew strongest. Nobody told it.",
     teaches="The objection answered: nobody told it what matters; the weights from 'meow?' grew strongest on their own.",
     screen=f"The toy network again, now with its trained weights: the three lines from 'meow?' are the thickest and brightest, the ones from 'bark?' and 'four legs?' thinner. A white label above 'meow?' with a short arrow down to it: 'strongest'.",
     motion="The network's lines morph from their starting widths to the trained ones over 1 s (no flicker); the 'meow?' lines brighten last; the label writes on.",
     carries="The trained network.",
     transition="Pull back far: the little network becomes a dot beside a huge one.",
     sound="A warm chord swell.",
     check="Line widths are the computed weights; the 'meow?' lines are the widest.",
     facts=["n8"],
     frames=[fr(0, "The starting network: 'bark?' had the thickest lines.", toy(START), grid()),
             fr(0.5, "The lines morph to their trained widths.", toy(END), grid()),
             fr(1, "'meow?' strongest, labelled.", toy(END), label(200, 330, "strongest", 44), {"arrow": [200, 342, 200, 392], "width": 4}, grid(), {"cut": "pull far back"})])


def scale(field=True, count=True):
    out = [{"ring": [200, 460, 60], "colour": CY, "width": 5}, label(200, 580, "toy:", 40), label(200, 630, f"{WEIGHTS} weights", 40)]
    for k in range(48 if field else 0):
        x, y = 430 + (k % 8) * 66, 300 + (k // 8) * 80
        out.append({"ring": [x, y, 18], "colour": CY, "width": 4})
        if k % 8:
            out.append({"line": [x - 42, y, x - 18, y], "colour": CY, "width": 2})
    if count:
        out += [label(540, 860, "GPT-3 (2020):", 52), {"number": [540, 980], "text": "175,000,000,000", "size": 96, "colour": CY}, label(540, 1060, "weights (175 billion)", 48), label(540, 1180, "not to scale", 32)]
    return out + grid()


shot("s18", "repeat", "compare", "Big models work the same way: *175 billion* weights.",
     teaches="Big models learn the same way, just with far more weights: GPT-3 has 175 billion.",
     screen=f"(As built: a zoom-out in three steps, centred: the toy network with '{WEIGHTS} weights', then a field of a million weights it is one dot of, then a field of 175,000,000,000 that field is one dot of; the number under the field at each step, 'GPT-3 (2020)' and 'not to scale' with the last.) Planned: Left: the toy network as one small cyan ring, 'toy: {WEIGHTS} weights'. Right: a field of rings and lines fading off into the dark, too many to count, and under it 'GPT-3 (2020):' / '175,000,000,000' / 'weights (175 billion)'. Small at the bottom: 'not to scale'.",
     motion="The camera pulls far back from the toy network until it is one ring; the field of nodes fills in to its right and runs on out of frame; the number writes on at its value.",
     carries="The field of nodes.",
     transition="Everything folds into four small pictures stacked down the frame.",
     sound="The bed opens up: a wide pad, the bass drops out for one bar.",
     check="The number is 175.000.000.000; the drawing says it is not to scale.",
     facts=["n9"],
     frames=[fr(0, "Pull back: the toy network shrinks to one ring.", toy(END, labels=False), {"camera": "pull"}, grid()),
             fr(0.5, "A field of nodes fills in to the right.", scale(count=False)),
             fr(1, "The count: 175 billion.", scale(), {"cut": "four pictures"})])


def recap(n=4):
    rows = [("1  guess", "down"), ("2  measure error", "meter"), ("3  nudge weights", "nudge"), ("4  repeat", "loop")]
    out = []
    for k, (word, kind) in enumerate(rows[:n]):
        y = 350 + k * 270
        if kind == "down":
            out += [{"ring": [190, y - 75, 32], "colour": CY, "width": 5}, {"ring": [190, y + 75, 32], "colour": CY, "width": 5}, {"line": [190, y - 43, 190, y + 43], "colour": CY, "width": 5}, {"dot": [190, y, 12], "colour": "ink"}]
        elif kind == "meter":
            out += [{"line": [80, y, 300, y], "width": 4}, {"line": [140, y - 30, 140, y + 30], "colour": CY, "width": 8}, {"line": [148, y, 298, y], "colour": MG, "width": 16}, {"line": [300, y - 30, 300, y + 30], "width": 6}]
        elif kind == "nudge":
            out += [{"line": [80, y + 10, 300, y + 10], "colour": CY, "width": 12}, {"arrow": [190, y + 60, 190, y - 60], "colour": MG, "width": 6}]
        else:
            out += [{"path": f"M270 {y} A80 80 0 1 1 190 {y - 80}", "colour": CY, "width": 7}, {"arrow": [176, y - 80, 206, y - 80], "colour": CY, "width": 7}]
        out.append(label(340, y + 22, word, 60, align="start"))
    return out + grid()


shot("s19", "recap", "recap", "Guess. Measure the *error*. Nudge. Repeat.", beats=5,
     teaches="The answer in one frame: guess, measure the error, nudge the weights, repeat.",
     screen="Four rows stacked down the frame (y 280 to 1200), each a small glowing picture at the left (about 220 px wide) and its words at the right in white, 60 px (the longest, '3 nudge weights', ends by x 880): '1 guess' (two nodes, a pulse going down), '2 measure error' (a meter with its magenta gap), '3 nudge weights' (a line and a magenta arrow), '4 repeat' (a cyan loop arrow).",
     motion="The rows light one per beat, top to bottom, each with a flicker; the loop arrow of row 4 starts to turn.",
     carries="The loop arrow.",
     transition="The loop arrow spins up and opens into the phone of the first shot.",
     sound="Four blips on the beat, the last held.",
     check="Readable with no other help: four steps, in order, one per row.",
     facts=["n5", "n7"],
     frames=[fr(0, "The first two rows light.", recap(2)),
             fr(0.5, "All four rows lit, top to bottom.", recap()),
             fr(1, "The loop arrow starts to turn.", recap(), {"move": [60, 1290, 60, 1170], "text": "turns"}, {"cut": "back to the start"})])

shot("s20", "recap", "wide", "Again and again. That's how",
     teaches="The bridge back into the first line: done over and over, that is how the AI you use learns.",
     screen="The loop arrow grows into the phone outline of the first shot, and the network inside it redraws row by row, with pulses running down: the picture of frame 0, a moment early.",
     motion="The loop arrow sweeps round and becomes the phone's outline; the four rows of the big network flicker on top to bottom; the pulses are where they are at frame 0 just as the shot ends.",
     carries="Into s01.",
     transition="No cut: the film loops straight into s01.",
     sound="The bed runs on into the opening.",
     check="The last frame matches frame 0 (check.mjs compares them).",
     facts=["n1"],
     frames=[fr(0, "The loop arrow becomes the phone outline.", phone(net=False), {"path": "M560 700 A140 140 0 1 1 420 560", "colour": CY, "width": 6}),
             fr(1, "The opening picture, a moment before frame 0.", phone(k=0.33), {"cut": "loop to s01"})])

duration = shots[-1]["end"]

storyboard = {
    "title": "How does a neural network learn?",
    "template": "neon",
    "standard": 3,
    "captions": "pop",
    "question": "Nobody writes the rules for the AI you use every day. So how does it learn?",
    "audience": "Curious teens and adults anywhere who use AI every day (chatbots, photo filters, recommendations) but have never seen inside one. They have heard that 'AI is trained', but not what actually changes when it learns.",
    "promise": "A neural network learns by guessing, measuring how wrong the guess is (the error), and nudging every weight a little in the direction that makes the error smaller, over and over; nobody writes its rules.",
    "language": "en",
    "format": "1080x1920",
    "duration": round(duration, 3),
    "fps": 60,
    "loop": {"line": "Again and again. That's how / the AI you use learned what it knows.",
             "picture": "The last shot's loop arrow becomes the phone outline of s01 and the network redraws inside it, pulses in their frame-0 places: the same picture as frame 0."},
    "look": {
        "accent": "#00f5d4",
        "accent2": "#f15bb5",
        "mood": "The Neon Line template: near-black #07070c with a faint perspective grid fading into the distance; single continuous glowing lines 3 to 4 px with round caps, outlines only, strong bloom, a little chromatic aberration at the edges, fine grain. Two neon colours with fixed meanings for the whole film: cyan #00f5d4 is the network (its nodes, its lines, the signal going down and the guess); magenta #f15bb5 is the error and everything it sends back (the gap, the backward pulses, the nudge arrows). White #e9fffb for type and the examples' drawings. Line width means weight. Captions: 'pop', two or three glowing white words at a time, the key word in magenta, the second neon colour, as the template's Captions line and its concept still have it (film.css sets .caption .key to #f15bb5 over the look's cyan); in the picture magenta only ever means the error. On the board cyan and magenta are drawn in darker teal and pink so they read on paper.",
    },
    "music": {
        "track": "Composed for this film (ElevenLabs Music, music/bed.mp3)",
        "bpm": BPM,
        "beat": BEAT,
        "offset": 0,
        "start": 0,
        "note": "A synth bed composed for the film at 96 BPM, as the template's Sound line asks: a pulsing sub bass on every beat, a warm analogue pad, a soft arpeggio that climbs when the guess runs down the network and falls when the error runs back; it thins under the error (s09 to s12), doubles its bass for the repetition (s14), opens wide for the scale shot (s18) and runs on past the last frame into the opening for the loop. Every shot is a whole number of beats, so every cut lands on the beat. Effects: soft zaps when pulses fire, a hum under the glowing network, a power-up buzz for the type, a low buzz for the error, a reversed zap for the backward pass, a synth swell for each nudge, blips for each example and result.",
    },
    "facts": [
        {"id": "n1", "claim": "The AI people use is machine learning: instead of programmers writing the rules for the task, a model is trained on data until it has learned the relationship itself. Simplification: engineers still write the training program, choose the data and check the result; what nobody writes is the rules for the task ('if it meows → cat').",
         "source": "Google, Machine Learning: Introduction to ML, 'What is ML?' (developers.google.com/machine-learning/intro-to-ml/what-is-ml): 'ML is the process of training a piece of software, called a model, to make useful predictions or generate content ... from data', contrasted there with the traditional approach of writing the model by hand."},
        {"id": "n2", "claim": f"A neural network is nodes (neurons) in layers, joined by connections; each neuron takes the sum of its inputs times a weight per connection, plus a bias, and passes it through an activation function. A weight is how strongly a connection passes its input on. In s05 the two lines are two of the toy network's starting weights, {n2(W_A)} and {n2(W_B)} (their sizes; the sign is not shown).",
         "source": "Google Machine Learning Crash Course, 'Neural networks: Nodes and hidden layers' (developers.google.com/machine-learning/crash-course/neural-networks/nodes-hidden-layers): 'take the sum of the product of each of its inputs ... and a unique weight parameter, plus the bias'."},
        {"id": "n3", "claim": f"The film's network is a real toy, trained in storyboard.build.py: three yes/no inputs (meow?, bark?, four legs?: 1 = yes, 0 = no), three hidden neurons and one output, sigmoid activations, {WEIGHTS} weights (the lines drawn) plus 4 biases (not drawn). Three examples: cat (1, 0, 1) → 1, dog (0, 1, 1) → 0, fish (0, 0, 0) → 0. Starting weights and biases random between −1 and 1 (seeded, seed {SEED}), as training usually starts. Line widths are drawn from the sizes of the weights. Simplification: real image networks read millions of pixel values, not three yes/no answers; this one is small enough to watch.",
         "source": "Computed (storyboard.build.py). Method: Google ML Crash Course, 'Linear regression: Gradient descent' ('The model begins training with randomized weights and biases near zero'); Rumelhart, Hinton & Williams (1986), 'Learning representations by back-propagating errors', Nature 323, 533–536."},
        {"id": "n4", "claim": f"The first guess for the cat is {GUESS0:.3f} → shown as {n2(GUESS0)}; the right answer is 1, so the gap (the error) is 1 − {n2(GUESS0)} = {n2(1 - GUESS0)}. The film calls the gap 'error'; training makes the squared gap small (squared error), which is the same aim. 'Loss is a numerical value indicating the difference between a model's predictions and the actual values.'",
         "source": "Computed (storyboard.build.py); Google ML Crash Course, 'Linear regression: Loss' (developers.google.com/machine-learning/crash-course/linear-regression/loss)."},
        {"id": "n5", "claim": "Learning is gradient descent: work out, for every weight, which way to move it to make the error smaller, move it a small amount that way, and repeat. Backpropagation is how a network works out that direction for every weight: the error is sent backwards from the output through the connections. 'The procedure repeatedly adjusts the weights of the connections in the network so as to minimize a measure of the difference between the actual output vector of the net and the desired output vector.'",
         "source": "Google ML Crash Course, 'Linear regression: Gradient descent' (steps: calculate the loss, determine the direction that reduces it, move the weights and bias a small amount, repeat) and 'Neural networks: Training using backpropagation' ('Backpropagation is the most common training algorithm for neural networks'); Rumelhart, Hinton & Williams (1986), Nature 323, 533–536, abstract."},
        {"id": "n6", "claim": f"One nudge (one gradient step on the cat, step size {RATE}): the weight from the middle hidden neuron to the output goes {W_BEFORE:.3f} → {W_AFTER:.3f} (shown {n2(W_BEFORE)} → {n2(W_AFTER)}), every other weight touched by the error moves too, and the guess for the same cat goes {n2(GUESS0)} → {n2(GUESS1)}: the error {n2(1 - GUESS0)} → {n2(1 - GUESS1)}. The step size (learning rate) is set large in this toy so one step is visible; real training takes much smaller steps.",
         "source": f"Computed (storyboard.build.py); learning rate: Google ML Crash Course, 'Linear regression: Hyperparameters' ('The learning rate determines the magnitude of the changes to make to the weights and bias during each step')."},
        {"id": "n7", "claim": f"Repeated over the three examples for {ROUNDS:,} rounds (one nudge per example per round), the network's answers become cat {FINAL['cat']:.3f}, dog {FINAL['dog']:.3f}, fish {FINAL['fish']:.3f} (shown {n2(FINAL['cat'])}, {n2(FINAL['dog'])}, {n2(FINAL['fish'])}). The mean squared error over the three falls from {CURVE[0]:.3f} to {CURVE[-1]:.5f}; the chart in s15 shows its first {SHOW} rounds, after which it lies flat (it is below 0.01 by round 50). A loss curve that falls and flattens is what training looks like. As built, the chart in s15 plots the cat's own error (1 − its guess, the gap the meter shows): {n2(1 - GUESS0)} at the start, {n2(CATERR[0])} after the one nudge, {n2(CATERR[1])} after round 1, {n2(CATERR[60])} at round 60, and {n2(CATERR[-1])} after round {ROUNDS:,} (written at the right end of the chart), so its numbers continue the meter's; the mean squared error above is the measure training itself makes small.",
         "source": "Computed (storyboard.build.py); Google ML Crash Course, 'Linear regression: Gradient descent' (loss curves; 'A model is considered to have converged when further iterations do not significantly reduce the loss')."},
        {"id": "n8", "claim": f"Nobody set which input matters. At the start the lines from 'bark?' were the strongest (sum of the three weights' sizes: meow {strength(START, 0):.2f}, bark {strength(START, 1):.2f}, four legs {strength(START, 2):.2f}); after training the lines from 'meow?' are (meow {strength(END, 0):.2f}, bark {strength(END, 1):.2f}, four legs {strength(END, 2):.2f}). In the three examples, meowing is what tells a cat apart. This is the toy's result; in big networks what each weight 'means' is usually not readable like this.",
         "source": "Computed (storyboard.build.py); Rumelhart, Hinton & Williams (1986): as a result of the weight adjustments, hidden units 'come to represent important features of the task domain'."},
        {"id": "n9", "claim": f"Big models learn the same way, with far more weights: GPT-3 (2020) has 175 billion parameters (on screen '175,000,000,000' and '175 billion weights'), trained with Adam (a form of gradient descent) on 300 billion tokens; its 'error' is how wrong its guess of the next word is. Against the toy's {WEIGHTS} weights the drawing cannot be to scale and says so; the zoom-out passes a field of a million weights on the way, a scale mark between the two and not any particular model. Simplifications: the film calls parameters 'weights' (they also include biases and embeddings), and Adam adjusts each step's size, but each step still moves the weights to reduce the error.",
         "source": "Brown et al. (2020), 'Language Models are Few-Shot Learners', arXiv:2005.14165: 'we train GPT-3, an autoregressive language model with 175 billion parameters'; §2.3 and Appendix B: 'All models were trained for a total of 300 billion tokens'; 'To train all versions of GPT-3, we use Adam'."},
    ],
    "acts": [
        {"id": "hook", "title": "The question", "goal": "The AI you use learned; nobody wrote its rules. Then how?", "rail": False},
        {"id": "weights", "title": "Weights", "goal": "Inside: nodes and connections; each connection has a weight."},
        {"id": "guess", "title": "A guess", "goal": "A toy network: an example goes in, a guess comes out."},
        {"id": "error", "title": "The error", "goal": "The guess against the answer: the gap is the error."},
        {"id": "nudge", "title": "Nudge", "goal": "The error goes back; every weight is nudged a little; the next guess is closer."},
        {"id": "repeat", "title": "Repeat", "goal": "Repeated a thousand times: the error falls, the answers come right, the weights find what matters; big models do the same."},
        {"id": "recap", "title": "The answer", "goal": "Guess, measure, nudge, repeat; then the bridge into the first line.", "rail": False},
    ],
    "shots": shots,
}

out = HERE / "storyboard.json"
out.write_text(json.dumps(storyboard, ensure_ascii=False, indent=2) + "\n")
chars = sum(len((s.get("caption") or "").replace("*", "")) for s in shots)
print(f"{len(shots)} shots, {sum(len(s['frames']) for s in shots)} frames, {duration:.2f} s, {chars} caption characters -> {out}")
print(f"guess {GUESS0:.3f} -> {GUESS1:.3f}; weight {W_BEFORE:.3f} -> {W_AFTER:.3f}; final {', '.join(f'{k} {v:.3f}' for k, v in FINAL.items())}; mse {CURVE[0]:.3f} -> {CURVE[-1]:.5f}")
