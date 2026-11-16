"""The ring of cars the film shows, computed instead of drawn by eye.

22 cars, 4.5 m long, on a single-lane ring 230 m around (Sugiyama et al. 2008): every car starts evenly spaced at
30 km/h. Each driver follows the car ahead with the Intelligent Driver Model (Treiber, Hennecke & Helbing 2000), seeing
it 0.35 s late. The parameters are chosen so that 30 km/h at this spacing (a 5.95 m gap) is the steady state: desired
speed 15.0 m/s, time gap 0.5 s, minimum gap 1.5 m, acceleration 2.5 m/s2, comfortable braking 4.0 m/s2.

Scenario "jam": at 5 s one driver (car 0) eases off for three seconds (-0.5 m/s2, 30 -> 25 km/h) and then drives on
normally. Nothing else happens. The slowdown grows each time it passes a driver until cars stop, and a jam forms and
travels backwards round the ring.

Scenario "absorb": the same ring, from the jam's state at ON s, with one car (ABS) driving like the wave-dampening car
of Stern et al. 2018: it holds the ring's average speed (measured over the last minute before it starts), lets the gap
in front open and close instead of copying the car ahead, and only brakes harder when the gap gets short.

    python3 examples/phantom-jam/sim.py      -> sim.json (positions and speeds at 10 Hz, and the measurements)
"""
import json
import math
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
L, N, CAR = 230.0, 22, 4.5
P = dict(v0=15.01, T=0.5, s0=1.5, a=2.5, b=4.0, tau=0.35)
DT = 0.05
REC = 0.1  # recorded every 0.1 s
TAP = (5.0, 8.0, -0.5)
ON = 140.0  # the absorbing car switches on
ABS = 11
T_END = 300.0


def idm(s, v, dv, p=P):
    star = p["s0"] + np.maximum(0, v * p["T"] + v * dv / (2 * math.sqrt(p["a"] * p["b"])))
    return p["a"] * (1 - (v / p["v0"]) ** 4 - (star / np.maximum(s, 0.1)) ** 2)


def simulate(absorb=False, t_end=T_END):
    x = np.arange(N) * (L / N)
    v = np.full(N, 30 / 3.6)
    lag = int(round(P["tau"] / DT))
    seen = []
    rec_x, rec_v, own = [], [], []
    U = None
    every = int(round(REC / DT))
    for k in range(int(round(t_end / DT)) + 1):
        t = k * DT
        if k % every == 0:
            rec_x.append(x.copy())
            rec_v.append(v.copy())
        lead = np.roll(x, -1)
        lead[-1] += L
        s = lead - x - CAR
        dv = v - np.roll(v, -1)
        seen.append((s, dv, v.copy()))
        ss, sdv, sv = seen[-1 - lag] if len(seen) > lag else seen[0]
        acc = np.maximum(idm(ss, sv, sdv), -9.0)
        if TAP[0] <= t < TAP[1]:
            acc[0] = min(acc[0], TAP[2])
        own.append(v[ABS])
        if absorb and t >= ON:
            if U is None:
                U = float(np.mean(own[-int(60 / DT):]))
            # hold the average speed; catch up a little when the gap is very long; never closer than safe
            want = U + 0.5 * min(1.0, max(0.0, (s[ABS] - 15.0) / 10.0))
            a_c = float(np.clip(0.2 * (want - v[ABS]), -1.0, 0.5))
            a_safe = float(idm(np.array([s[ABS]]), np.array([v[ABS]]), np.array([dv[ABS]]), dict(P, T=0.4, s0=1.0))[0])
            acc[ABS] = min(a_c, a_safe)
        v = np.maximum(0.0, v + acc * DT)
        x = x + v * DT
        assert (s > 0).all(), f"cars touched at {t:.2f} s"
        seen = seen[-(lag + 2):]
    return np.array(rec_x), np.array(rec_v), U


def cluster_speed(X, V, t0, t1):
    """How fast the jam moves along the road (m/s; negative is backwards), from the centre of the stopped cars."""
    i0, i1 = int(t0 / REC), int(t1 / REC)
    cen, ts = [], []
    for i in range(i0, i1, 5):
        slow = V[i] < 2.5
        if not slow.any():
            continue
        ang = (X[i][slow] % L) / L * 2 * math.pi
        cen.append(math.atan2(np.sin(ang).mean(), np.cos(ang).mean()))
        ts.append(i * REC)
    p = np.unwrap(np.array(cen)) * L / (2 * math.pi)
    return float(np.polyfit(np.array(ts), p, 1)[0])


X, V, _ = simulate()
XA, VA, U = simulate(absorb=True)
n = len(X)
times = np.arange(n) * REC

# When each driver the slowdown reached braked, and how slow it made them: every local dip in a car's speed, in the
# order they happen, from the tap to the first time a car stops.
first_stop = float(times[np.argmax((V < 0.05).any(axis=1))])
dips = []
for c in range(N):
    vc = V[:, c]
    for i in range(1, n - 1):
        if times[i] < TAP[0] or times[i] > first_stop + 0.01:
            continue
        if vc[i] <= vc[i - 1] and vc[i] < vc[i + 1] and vc[i] < 30 / 3.6 - 0.05:
            dips.append((float(times[i]), c, float(vc[i])))
        elif times[i] == first_stop and vc[i] < 0.05:
            dips.append((float(times[i]), c, 0.0))
dips.sort()

c_jam = cluster_speed(X, V, 60, 260)
free = float(V[int(60 / REC):int(260 / REC)].max())
stopped_now = [int((V[i] < 0.3).sum()) for i in range(int(60 / REC), int(260 / REC))]
on = int(ON / REC)
spread_before = float(VA[on - 600:on].std())
spread_after = float(VA[-600:].std())
mean_before = float(VA[on - 600:on].mean())
mean_after = float(VA[-600:].mean())

out = {
    "note": "Written by sim.py. x: metres along the ring, unwrapped (x mod 230 is where the car is); v: m/s. Car i follows car i+1; car 21 follows car 0. 10 samples a second.",
    "L": L, "N": N, "car": CAR, "rec": REC, "params": P, "tap": TAP, "on": ON, "absorber": ABS, "U": U,
    "jam": {"x": np.round(X, 2).tolist(), "v": np.round(V, 3).tolist()},
    "absorb": {"x": np.round(XA[on - 10:], 2).tolist(), "v": np.round(VA[on - 10:], 3).tolist(), "from": round((on - 10) * REC, 3)},
    "dips": [[round(t, 2), c, round(v * 3.6, 2)] for t, c, v in dips],
    "measured": {
        "first_stop_s": first_stop,
        "jam_speed_kmh": round(c_jam * 3.6, 1),
        "free_speed_max_kmh": round(free * 3.6, 1),
        "stopped_cars_mean": round(float(np.mean(stopped_now)), 1),
        "absorber_speed_kmh": round(U * 3.6, 1),
        "speed_spread_before_kmh": round(spread_before * 3.6, 2),
        "speed_spread_after_kmh": round(spread_after * 3.6, 2),
        "mean_speed_before_kmh": round(mean_before * 3.6, 1),
        "mean_speed_after_kmh": round(mean_after * 3.6, 1),
        "dips": len(dips),
    },
}
(HERE / "sim.json").write_text(json.dumps(out, separators=(",", ":")) + "\n")
m = out["measured"]
print(f"first car stops at {first_stop:.1f} s; the jam moves {m['jam_speed_kmh']} km/h (minus is backwards); free cars reach {m['free_speed_max_kmh']} km/h; {m['stopped_cars_mean']} cars stopped at a time")
print(f"{len(dips)} dips from the tap to the first stop: {dips[0][2]*3.6:.1f} km/h first, then " + ", ".join(f"{d[2]*3.6:.0f}" for d in dips[1:40:3]) + " ...")
print(f"absorber on at {ON:.0f} s, holding {U*3.6:.1f} km/h: speed spread {m['speed_spread_before_kmh']} -> {m['speed_spread_after_kmh']} km/h, mean {m['mean_speed_before_kmh']} -> {m['mean_speed_after_kmh']} km/h")
