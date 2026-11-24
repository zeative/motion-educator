"""Writes terrain.json: the faceted ground of Merapi's and Kīlauea's worlds, from their real elevations.

    python3 examples/gunung-api/terrain.build.py [--cache DIR]

Elevations are AWS Terrain Tiles (Mapzen terrarium, SRTM-derived, zoom 12, about 36 to 38 m a pixel), the source the
storyboard's profiles come from (f11, reference/profil-merapi-kilauea.png). Each world is a set of points spread with
a spacing that grows away from what the camera looks at (250 m on Merapi's summit cone, 1 to 3 km on the far
plain), joined into triangles (Delaunay): a low-poly surface whose every vertex sits at the real elevation of its
place. Merapi's west-east line through the summit also gets the storyboard's own profile samples (every 0.5 km,
f11), so the cut-away's top edge passes through them.

Units: 1 = 100 m, the same horizontally and vertically (true scale). x east, z south, y up; each world's origin is
its summit (Merapi) or the middle of Kīlauea's caldera, at sea level.
"""
import io
import json
import math
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.spatial import Delaunay

HERE = Path(__file__).parent
CACHE = Path(sys.argv[sys.argv.index("--cache") + 1]) if "--cache" in sys.argv else HERE / "out" / "dem"
Z = 12
URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"


def tile_of(lat, lon, z=Z):
    n = 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return x, y


def fetch(x, y, z=Z):
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / f"{z}-{x}-{y}.png"
    if not f.exists():
        with urllib.request.urlopen(URL.format(z=z, x=x, y=y), timeout=60) as r:
            f.write_bytes(r.read())
    a = np.asarray(Image.open(f).convert("RGB"), dtype=np.float64)
    return a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768


class Dem:
    """Bilinear elevation (m) at any (lat, lon) inside a box, from a mosaic of tiles."""

    def __init__(self, lat0, lat1, lon0, lon1):
        x0, y0 = tile_of(lat1, lon0)
        x1, y1 = tile_of(lat0, lon1)
        self.tx0, self.ty0 = int(x0), int(y0)
        tx1, ty1 = int(x1), int(y1)
        rows = []
        for ty in range(self.ty0, ty1 + 1):
            rows.append(np.concatenate([fetch(tx, ty) for tx in range(self.tx0, tx1 + 1)], axis=1))
        self.m = np.concatenate(rows, axis=0)

    def __call__(self, lat, lon):
        x, y = tile_of(lat, lon)
        px = (x - self.tx0) * 256 - 0.5
        py = (y - self.ty0) * 256 - 0.5
        i, j = int(math.floor(py)), int(math.floor(px))
        fy, fx = py - i, px - j
        m = self.m
        return (m[i, j] * (1 - fx) * (1 - fy) + m[i, j + 1] * fx * (1 - fy) + m[i + 1, j] * (1 - fx) * fy + m[i + 1, j + 1] * fx * fy)


def world(dem, lat0, lon0, box, spacing, extra=(), seed=1):
    """Points over box (units), spaced by spacing(x, z), at their real elevation; Delaunay triangles."""
    kx = 111320 * math.cos(math.radians(lat0)) / 100
    kz = 110574 / 100
    to_ll = lambda x, z: (lat0 - z / kz, lon0 + x / kx)
    rng = np.random.default_rng(seed)
    pts = [tuple(p) for p in extra]
    cell = 2.0
    grid = {}

    def near(x, z, r):
        cx, cz = int(x // cell), int(z // cell)
        k = int(r // cell) + 1
        for i in range(cx - k, cx + k + 1):
            for j in range(cz - k, cz + k + 1):
                for (px, pz) in grid.get((i, j), ()):
                    if (px - x) ** 2 + (pz - z) ** 2 < r * r:
                        return True
        return False

    def put(x, z):
        grid.setdefault((int(x // cell), int(z // cell)), []).append((x, z))

    for (x, z) in pts:
        put(x, z)
    x0, x1, z0, z1 = box
    # the corners and edges first, so the world's outline is straight
    for x in np.arange(x0, x1 + 0.01, 30):
        for z in (z0, z1):
            if not near(x, z, 3):
                pts.append((x, z)); put(x, z)
    for z in np.arange(z0, z1 + 0.01, 30):
        for x in (x0, x1):
            if not near(x, z, 3):
                pts.append((x, z)); put(x, z)
    # dart throwing, fine to coarse: candidates on a jittered fine lattice in a seeded order
    cand = []
    step = 1.6
    for x in np.arange(x0 + step, x1 - step / 2, step):
        for z in np.arange(z0 + step, z1 - step / 2, step):
            cand.append((x + rng.uniform(-0.45, 0.45) * step, z + rng.uniform(-0.45, 0.45) * step))
    order = rng.permutation(len(cand))
    cand = [cand[i] for i in order]
    cand.sort(key=lambda p: spacing(*p))
    for (x, z) in cand:
        s = spacing(x, z)
        if not near(x, z, s * 0.82):
            pts.append((x, z)); put(x, z)
    P = np.array(pts)
    tri = Delaunay(P)
    ys = [dem(*to_ll(x, z)) / 100 for x, z in P]
    return P, np.array(ys), tri.simplices


def pack(P, Y, T, floor=None):
    if floor is not None:
        Y = np.maximum(Y, floor)
    v = []
    for (x, z), y in zip(P, Y):
        v += [round(float(x), 2), round(float(y), 2), round(float(z), 2)]
    return {"v": v, "t": [int(i) for i in T.flatten()]}


out = {"units": "1 = 100 m, true scale both ways; x east, z south, y up",
       "source": "AWS Terrain Tiles (terrarium, SRTM-derived), zoom 12; sampled by examples/gunung-api/terrain.build.py"}

# ── Merapi ──────────────────────────────────────────────────────────────────────────────────────────────────────────
dem = Dem(-7.85, -7.25, 110.15, 110.75)
# the summit: the highest sample within a kilometre of the mapped peak (7°32'26"S 110°26'48"E)
best = max(((dem(-7.5406 + a / 1000, 110.4467 + b / 1000), a, b) for a in range(-9, 10) for b in range(-9, 10)))
LAT0, LON0 = -7.5406 + best[1] / 1000, 110.4467 + best[2] / 1000
# the storyboard's profile (f11), west to east through the summit, km and m
WE = [(-8.0, 835), (-7.5, 867), (-7.0, 906), (-6.5, 945), (-6.0, 997), (-5.5, 1040), (-5.0, 1119), (-4.5, 1193), (-4.0, 1260),
      (-3.5, 1364), (-3.0, 1441), (-2.5, 1559), (-2.0, 1727), (-1.5, 1985), (-1.0, 2281), (-0.5, 2616), (0.0, 2915), (0.5, 2581),
      (1.0, 2481), (1.5, 2417), (2.0, 2083), (2.5, 1820), (3.0, 1455), (3.5, 1337), (4.0, 1284), (4.5, 1218), (5.0, 1249),
      (5.5, 1177), (6.0, 1090), (6.5, 1055), (7.0, 1012), (7.5, 958), (8.0, 912)]
kx = 111320 * math.cos(math.radians(LAT0)) / 100
MB = ((110.4400 - LON0) * kx, -(-7.4550 - LAT0) * 110574 / 100)  # Merbabu's summit, about 9.5 km north


def sp_merapi(x, z):
    r = math.hypot(x, z) / 10  # km
    rm = math.hypot(x - MB[0], z - MB[1]) / 10
    s = 2.6 if r < 2.2 else 4.2 if r < 4.5 else 7 if r < 9 else 12 if r < 16 else 20 if r < 24 else 30
    if rm < 2.5:
        s = min(s, 4.5)
    elif rm < 5:
        s = min(s, 8)
    # the plain under the opening camera (14 km south, s01 and s18), where the ground is close to the lens
    if -75 < x < 35 and 100 < z < 225:
        s = min(s, 6)
    return s


extra = [(d * 10, 0.0) for d, _ in WE]
# rings round the summit (130, 240 and 360 m out), for the crater's floor, rim and outer slope
for r, n, a0 in ((1.3, 9, 0.2), (2.4, 14, 0.0), (3.6, 18, 0.1)):
    for k in range(n):
        a = a0 + 2 * math.pi * k / n
        x, z = r * math.cos(a), r * math.sin(a)
        if abs(z) > 0.3:  # the west-east line keeps the storyboard's own samples
            extra.append((round(x, 3), round(z, 3)))
P, Y, T = world(dem, LAT0, LON0, (-340, 340, -320, 240), sp_merapi, extra, seed=7)
for i, (d, e) in enumerate(WE):  # the line's points take the storyboard's numbers exactly
    Y[i] = e / 100
out_rings = [i for i in range(len(WE), len(extra))]
out["merapi"] = {"lat": round(LAT0, 5), "lon": round(LON0, 5), "summit_m": round(best[0]), "merbabu": [round(MB[0], 2), round(MB[1], 2)],
                 **pack(P, Y, T)}
print(f"merapi: summit {best[0]:.0f} m at {LAT0:.4f}, {LON0:.4f}; {len(P)} points, {len(T)} triangles")

# ── Kīlauea ─────────────────────────────────────────────────────────────────────────────────────────────────────────
dem = Dem(19.10, 19.72, -155.80, -154.95)
LAT0, LON0 = 19.4069, -155.2834  # the middle of the summit caldera
kx = 111320 * math.cos(math.radians(LAT0)) / 100
MU = ((-155.2106 - LON0) * kx, -(19.3647 - LAT0) * 110574 / 100)  # Mauna Ulu, the vent of 1969-74


ML = ((-155.6081 - LON0) * kx, -(19.4750 - LAT0) * 110574 / 100)  # Mauna Loa's summit, 34 km west


def sp_kilauea(x, z):
    # finest along the flow from Mauna Ulu down to the south coast and in the summit caldera (Halemaʻumaʻu)
    dx, dz = x - MU[0], z - MU[1]
    along = max(0.0, min(1.0, dz / 110))
    off = math.hypot(dx - 8 * along, dz - 110 * along) / 10
    s = 4.0 if off < 3 else 7 if off < 8 else 11 if off < 16 else 18
    rc = math.hypot(x, z) / 10
    if rc < 3.2:
        s = min(s, 2.6)
    elif rc < 6:
        s = min(s, 5)
    if x < -180:
        s = max(s, 26 if math.hypot(x - ML[0], z - ML[1]) > 90 else 16)
    return s


P, Y, T = world(dem, LAT0, LON0, (-560, 300, -330, 220), sp_kilauea, [], seed=11)
out["kilauea"] = {"lat": LAT0, "lon": LON0, "mauna_ulu": [round(MU[0], 2), round(MU[1], 2)], "mauna_loa": [round(ML[0], 2), round(ML[1], 2)],
                  "halemaumau": [round((-155.2873 - LON0) * kx, 2), round(-(19.4085 - LAT0) * 110574 / 100, 2)], **pack(P, Y, T, floor=-4)}
print(f"kilauea: {len(P)} points, {len(T)} triangles; Mauna Ulu at {MU[0]:.1f}, {MU[1]:.1f}")

(HERE / "terrain.json").write_text(json.dumps(out, separators=(",", ":")))
print(f"terrain.json: {(HERE / 'terrain.json').stat().st_size // 1024} KB")
