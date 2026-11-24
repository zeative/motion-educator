"""The film's toy network, trained here: every weight, guess, error and nudge on screen is read from net.json.

    python3 examples/neural-network/net.py      -> examples/neural-network/net.json (film.js loads it)

The same network and the same run as the fact sheet (storyboard.build.py, facts n3 to n8): three yes/no inputs
("meow?", "bark?", "four legs?"), three hidden neurons, one output ("cat?"), sigmoid units, starting weights and biases
drawn uniformly from -1 to 1 with seed 8, plain gradient descent on E = (y - t)^2 / 2 with step size 2.0. The film
shows one nudge on the cat (s12, s13), then 1,000 rounds of cat, dog, fish, one nudge per example per round (s14 to
s17). It is computed again here, apart from the board, and checked against what the board says.
"""
import json
import math
import random
from pathlib import Path

HERE = Path(__file__).parent
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
    """One gradient step on E = (y - t)^2 / 2: the error sent back through the network (backpropagation)."""
    w1, b1, w2, b2 = p
    h, y = forward(p, x)
    d = (y - t) * y * (1 - y)
    dh = [d * w2[j] * h[j] * (1 - h[j]) for j in range(3)]
    return ([[w1[j][i] - RATE * dh[j] * x[i] for i in range(3)] for j in range(3)], [b1[j] - RATE * dh[j] for j in range(3)],
            [w2[j] - RATE * d * h[j] for j in range(3)], b2 - RATE * d)


def mse(p):
    return sum((forward(p, x)[1] - t) ** 2 for _, x, t in DATA) / len(DATA)


def weights(p):
    """The twelve lines the film draws: in[i] -> hidden[j] as w1[j][i], hidden[j] -> out as w2[j]."""
    return {"w1": [[round(v, 5) for v in row] for row in p[0]], "w2": [round(v, 5) for v in p[2]]}


def strength(p, i):
    """How much a yes/no input weighs: the sum of the sizes of its three lines."""
    return sum(abs(p[0][j][i]) for j in range(3))


n2 = lambda v: f"{v:.2f}"

START = init(SEED)
CAT = DATA[0][1]
H0, GUESS0 = forward(START, CAT)
ONE = nudge(START, CAT, 1)
H1, GUESS1 = forward(ONE, CAT)

# The repetition: after the one nudge, rounds of cat, dog, fish. Keep every nudge of the first rounds (s14 shows
# them), the error after every round (s15's chart) and the end.
p, steps, after_round = ONE, [], [mse(ONE)]
cat_err = [1 - forward(ONE, CAT)[1]]  # the cat's own error (1 - its guess) after the one nudge, then after each round
for r in range(1, ROUNDS + 1):
    for name, x, t in DATA:
        _, y = forward(p, x)
        p = nudge(p, x, t)
        if r <= 24:
            steps.append({"round": r, "example": name, "guess": round(y, 4), "after": weights(p)})
    after_round.append(mse(p))
    cat_err.append(1 - forward(p, CAT)[1])
END = p
FINAL = {name: forward(END, x)[1] for name, x, _ in DATA}

# What the board says (storyboard.json facts n2 to n8), checked against this run.
SHOWN = 1  # the hidden -> output weight s12 labels: from the middle hidden neuron
assert (n2(GUESS0), n2(GUESS1), n2(1 - GUESS0), n2(1 - GUESS1)) == ("0.27", "0.40", "0.73", "0.60")
assert (n2(START[2][SHOWN]), n2(ONE[2][SHOWN])) == ("0.66", "0.79")
assert (n2(abs(START[0][0][1])), n2(abs(START[0][2][2]))) == ("0.92", "0.28")  # s05: two of its own starting weights
assert (n2(FINAL["cat"]), n2(FINAL["dog"]), n2(FINAL["fish"])) == ("0.98", "0.01", "0.01")
assert max(range(3), key=lambda i: strength(START, i)) == 1 and max(range(3), key=lambda i: strength(END, i)) == 0
assert f"{mse(START):.3f}" == "0.227" and f"{after_round[-1]:.5f}" == "0.00019"
assert (n2(cat_err[0]), n2(cat_err[60]), n2(cat_err[-1])) == ("0.60", "0.10", "0.02")
first_below = next(r for r, e in enumerate(after_round) if e < 0.01)

net = {
    "note": "Written by net.py: the toy network's real numbers. Do not edit by hand.",
    "inputs": INPUTS,
    "data": [{"name": n, "x": list(x), "t": t} for n, x, t in DATA],
    "rate": RATE,
    "rounds": ROUNDS,
    "start": weights(START),
    "one": weights(ONE),
    "end": weights(END),
    "shown": SHOWN,
    "s05": [[0, 1], [2, 2]],  # s05's strong and weak lines: w1[hidden][input]
    "hidden0": [round(v, 4) for v in H0],
    # s08's sum at the output, for the cat at the start: hidden values x their weights, plus the bias, squashed
    "sum0": {"h": [round(v, 4) for v in H0], "w": [round(v, 4) for v in START[2]], "b": round(START[3], 4),
             "z": round(sum(h * w for h, w in zip(H0, START[2])) + START[3], 4), "y": round(GUESS0, 4)},
    "guess0": round(GUESS0, 4),
    "guess1": round(GUESS1, 4),
    "final": {k: round(v, 5) for k, v in FINAL.items()},  # fish is 0.014969: 0.01 to two places
    # the error curve: mse at the start, then after each round of the repetition (round 0 = after the one nudge)
    "mse_start": round(mse(START), 5),
    "mse_rounds": [round(v, 5) for v in after_round[:121]],
    "mse_end": after_round[-1],
    "first_below_001": first_below,
    # s15's chart: the cat's error from the one nudge (round 0) through the rounds, and after the last
    "cat_err_rounds": [round(v, 5) for v in cat_err[:121]],
    "cat_err_end": round(cat_err[-1], 5),
    "steps": steps,
    "strength_start": [round(strength(START, i), 3) for i in range(3)],
    "strength_end": [round(strength(END, i), 3) for i in range(3)],
}
(HERE / "net.json").write_text(json.dumps(net, separators=(",", ":")) + "\n")
print(f"guess {GUESS0:.4f} -> {GUESS1:.4f}; error {1 - GUESS0:.4f} -> {1 - GUESS1:.4f}; w2[{SHOWN}] {START[2][SHOWN]:.4f} -> {ONE[2][SHOWN]:.4f}")
print("one nudge, every weight: " + ", ".join(f"in{i}->h{j} {START[0][j][i]:+.3f}->{ONE[0][j][i]:+.3f}" for j in range(3) for i in range(3)))
print("  hidden->out: " + ", ".join(f"h{j} {START[2][j]:+.3f}->{ONE[2][j]:+.3f}" for j in range(3)))
print(f"final {', '.join(f'{k} {v:.4f}' for k, v in FINAL.items())}; mse {mse(START):.4f} -> {after_round[-1]:.6f}, below 0.01 after round {first_below}")
print(f"strength start {net['strength_start']} end {net['strength_end']}")
