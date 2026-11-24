// The paint box for "Gimana lebah bikin madu?": every real thing in the film, drawn as a natural-history plate in
// watercolour and ink. Each function returns SVG markup (strings) in the coordinates it is given; film.js places it
// on a plate, blooms the washes in and draws the ink on.
//
// What is drawn, and from what:
// - The worker honeybee, Apis mellifera (the Italian strain kept in Indonesian apiaries: three amber tergites with
//   dark hind margins, the rest dark), in profile and from above, in millimetres of a 13 mm worker: head, compound
//   eye, ocelli, elbowed antennae (scape, pedicel, ten flagellomeres), mandibles, proboscis; thorax with tegula and
//   sutures, plumose hair; petiole; six tergites; three pairs of legs (coxa, trochanter, femur, tibia, five
//   tarsomeres; the hind tibia widened into the pollen basket, the basitarsus broad); fore and hind wings with the
//   Apis venation (stigma, the long marginal cell, three submarginal cells, the veinless tip). Proportions measured
//   from lateral photographs of foragers (iNaturalist 113576944, bramblejungle, CC BY-NC; 452239025) and the
//   standard anatomy (Snodgrass, The Anatomy of the Honey Bee, 1910: fore wing, alimentary canal).
// - Inside the worker (s05): oesophagus from the head through the thorax and petiole to the honey stomach (crop) in
//   the front of the abdomen, the proventriculus valve at its back, the ventriculus with its ring folds, the small
//   intestine and the rectum (Snodgrass 1910, fig. of the alimentary canal; ASU Ask A Biologist, honey bee anatomy).
// - Kaliandra, Calliandra calothyrsus: an upright raceme, a cone of club-shaped green buds above, the open flowers in
//   a ring below it, each a small green calyx and a pale yellow-green corolla tube with five reflexed lobes, from
//   which 40-60 rose-red filaments (about 5 cm) spread and droop, tipped with tiny yellow anthers; bipinnate leaves of
//   small leaflets (iNaturalist photographs of C. calothyrsus; Chamberlain 2001, ch. 2).
// - Comb: hexagonal beeswax cells (walls about 0.07 mm, cells 5.4 mm across, here drawn larger), honey cells capped
//   with a pale wax seal.
// - Sucrose: a glucose ring (six atoms, one of them the ring oxygen) joined through an oxygen to a fructose ring (five
//   atoms, one the ring oxygen) (OpenStax Biology 2e, 3.2).

export const C = {
  paper: "#fbf8f1", ink: "#2b2b2b", sap: "#5fb49c", ultra: "#3d5a98", sienna: "#c0703f", rose: "#d77a8b",
  // the natural palette beside the template's: the bee's amber and its dark bands, the wax, the buds, the glass
  ochre: "#d9a440", umber: "#5a3a22", sepia: "#7a5634", wax: "#e8d3a2", bud: "#9fbf5a", corolla: "#d8dc8a",
  grey: "#8d9096", anther: "#e8c34a", leaf: "#5f9a6a",
};

const f = (n) => (Math.round(n * 100) / 100).toString();
export const pt = (x, y) => `${f(x)} ${f(y)}`;

// ── Seeded noise ───────────────────────────────────────────────────────────────────────────────────────────────────
export const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ── Shapes ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const ell = (cx, cy, rx, ry, rot = 0) => {
  const a = (rot * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const p = (u, v) => pt(cx + u * c - v * s, cy + u * s + v * c);
  return `M${p(-rx, 0)} A${f(rx)} ${f(ry)} ${f(rot)} 1 0 ${p(rx, 0)} A${f(rx)} ${f(ry)} ${f(rot)} 1 0 ${p(-rx, 0)} Z`;
};
export const poly = (pts, close = true) => `M${pts.map(([x, y]) => pt(x, y)).join(" L")}${close ? " Z" : ""}`;
export const hex = (cx, cy, r, turn = 30) => poly(Array.from({ length: 6 }, (_, i) => {
  const a = ((turn + 60 * i) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}));
export const ngon = (cx, cy, r, n, turn = -90) => Array.from({ length: n }, (_, i) => {
  const a = ((turn + (360 * i) / n) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
});

// An outline made of cubic segments: [x0, y0, [c1x, c1y, c2x, c2y, x, y], ...]. Gives its path, and points and
// outward normals along it (for hair, for the pooled edge of a wash).
export function outline(x0, y0, ...segs) {
  const d = `M${pt(x0, y0)} ${segs.map((s) => `C${pt(s[0], s[1])} ${pt(s[2], s[3])} ${pt(s[4], s[5])}`).join(" ")} Z`;
  const sample = (n) => {
    const out = [];
    let px = x0, py = y0;
    for (const s of segs) {
      for (let i = 0; i < n; i++) {
        const t = i / n, u = 1 - t;
        const x = u * u * u * px + 3 * u * u * t * s[0] + 3 * u * t * t * s[2] + t * t * t * s[4];
        const y = u * u * u * py + 3 * u * u * t * s[1] + 3 * u * t * t * s[3] + t * t * t * s[5];
        const dx = 3 * u * u * (s[0] - px) + 6 * u * t * (s[2] - s[0]) + 3 * t * t * (s[4] - s[2]);
        const dy = 3 * u * u * (s[1] - py) + 6 * u * t * (s[3] - s[1]) + 3 * t * t * (s[5] - s[3]);
        const l = Math.hypot(dx, dy) || 1;
        out.push({ x, y, tx: dx / l, ty: dy / l });
      }
      px = s[4];
      py = s[5];
    }
    return out;
  };
  return { d, sample };
}

// Hair: short strokes leaning back along an outline, outward. `side` 1 for an outline drawn clockwise on screen.
export function hairs(shape, { n = 18, len = 0.35, lean = 0.5, seed = 1, from = 0, to = 1, side = 1, jitter = 0.4 } = {}) {
  const r = rng(seed), pts = shape.sample(n);
  const a = Math.floor(from * pts.length), b = Math.floor(to * pts.length);
  let d = "";
  for (let i = a; i < b; i++) {
    const p = pts[i];
    const nx = p.ty * side, ny = -p.tx * side;
    const L = len * (1 - jitter / 2 + r() * jitter);
    const bx = p.x - p.tx * L * 0.15, by = p.y - p.ty * L * 0.15;
    const ex = bx + (nx + p.tx * -lean) * L, ey = by + (ny + p.ty * -lean) * L;
    const mx = (bx + ex) / 2 + nx * L * 0.12, my = (by + ey) / 2 + ny * L * 0.12;
    d += `M${pt(bx, by)} Q${pt(mx, my)} ${pt(ex, ey)} `;
  }
  return d;
}

// ── Marks ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// A wash: a transparent tint. a: its strength. The film's filter pools pigment at its edge and granulates it.
export const W = (d, colour, a = 0.55, extra = "") => `<path d="${d}" fill="${colour}" fill-opacity="${a}"${extra}/>`;
// Ink: fine lines that keep their width at any scale (k0 finest .. k4 boldest, film.css).
export const K = (d, cls = "k2", extra = "") => `<path class="${cls}" d="${d}"${extra}/>`;
// A stroke of paint (not ink): a brush line in colour, at a set width (in px on the page).
export const B = (d, colour, w, a = 0.8, extra = "") => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-opacity="${a}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
export const G = (inner, attrs = "") => `<g${attrs ? " " + attrs : ""}>${inner}</g>`;
export const at = (x, y, s = 1, rot = 0, flip = 1) => `transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s * flip)} ${f(s)})"`;

// A drop of liquid, hanging point up: its body, its pooled rim, a reserved highlight.
export function drop(x, y, r, colour = C.ultra, a = 0.32) {
  const d = `M${pt(x, y - 1.7 * r)} C${pt(x + 0.35 * r, y - 0.95 * r)} ${pt(x + r, y - 0.45 * r)} ${pt(x + r, y + 0.1 * r)} A${f(r)} ${f(r)} 0 0 1 ${pt(x - r, y + 0.1 * r)} C${pt(x - r, y - 0.45 * r)} ${pt(x - 0.35 * r, y - 0.95 * r)} ${pt(x, y - 1.7 * r)} Z`;
  return {
    paint: W(d, colour, a) + W(ell(x + 0.25 * r, y + 0.45 * r, 0.55 * r, 0.4 * r, -20), colour, a * 0.9) + W(ell(x - 0.38 * r, y - 0.2 * r, 0.16 * r, 0.32 * r, 20), C.paper, 0.9),
    ink: K(d, "k1"),
  };
}

// ── The honeybee in profile (Apis mellifera worker), millimetres, facing +x, origin at the petiole ────────────────
// Proportions from a lateral photograph of a forager: abdomen 55 % of the length, thorax 26 %, head 19 %; the head
// hangs a little below the body's axis, face down and forward; the thorax about as tall as it is long.
const HEAD = outline(4.25, -1.0,
  [4.45, -1.6, 4.95, -1.93, 5.38, -1.83],
  [5.88, -1.67, 6.22, -1.07, 6.36, -0.27],
  [6.46, 0.45, 6.42, 1.25, 6.16, 1.8],
  [5.96, 2.21, 5.55, 2.31, 5.25, 2.15],
  [4.85, 1.9, 4.45, 1.35, 4.25, 0.7],
  [4.1, 0.15, 4.1, -0.5, 4.25, -1.0]);
const THORAX = outline(4.05, -0.95,
  [3.95, -1.7, 3.55, -2.3, 2.95, -2.62],
  [2.3, -2.98, 1.4, -2.92, 0.95, -2.55],
  [0.5, -2.2, 0.28, -1.5, 0.22, -0.7],
  [0.18, -0.2, 0.16, 0.2, 0.18, 0.5],
  [0.35, 1.1, 0.95, 1.55, 1.75, 1.68],
  [2.6, 1.8, 3.45, 1.5, 3.9, 0.95],
  [4.15, 0.5, 4.18, -0.35, 4.05, -0.95]);
const ABDOMEN = outline(-0.08, -0.42,
  [-0.42, -1.25, -1.1, -1.82, -2.0, -1.97],
  [-3.2, -2.17, -4.6, -1.94, -5.6, -1.4],
  [-6.4, -0.92, -7.05, -0.28, -7.32, 0.3],
  [-7.02, 0.66, -6.5, 1.06, -5.7, 1.46],
  [-4.6, 2.0, -3.2, 2.17, -2.0, 2.02],
  [-1.1, 1.88, -0.4, 1.34, -0.08, 0.7],
  [0.0, 0.3, 0.0, -0.1, -0.08, -0.42]);
const TOP = ABDOMEN.sample(60).filter((p) => p.y < 0.2 && p.x < -0.25);
const topAt = (x) => TOP.reduce((b, p) => (Math.abs(p.x - x) < Math.abs(b.x - x) ? p : b), TOP[0]).y;
// The hind margins of tergites 1 to 5 (each tergite laps over the next), bowed back a little down the side.
const MARGINS = [-1.15, -2.45, -3.75, -4.92, -5.95];
const marginD = (x) => {
  const y0 = topAt(x) - 0.1;
  return `M${pt(x, y0)} C${pt(x - 0.3, y0 + 1.0)} ${pt(x - 0.5, 0.4)} ${pt(x - 0.42, 1.5)}`;
};
// A band behind a margin (towards the head: the hind part of the tergite in front), w mm wide, to clip by the body.
const bandD = (x, w, back = 0) => `M${pt(x - back, -3)} C${pt(x - 0.3 - back, -0.6)} ${pt(x - 0.5 - back, 0.4)} ${pt(x - 0.42 - back, 2.6)} L${pt(x - 0.42 + w, 2.6)} C${pt(x - 0.5 + w, 0.4)} ${pt(x - 0.3 + w, -0.6)} ${pt(x + w, -3)} Z`;

// The fore wing of Apis in its own frame (u from the base along the wing, v towards the trailing edge), mm, after
// Snodgrass (1910) and photographs: the costa straight, a small stigma, the long narrow marginal cell reaching near
// the tip, three submarginal cells under it, the discoidal cells below, and the tip and hind margin without veins.
const FORE = "M0 0 C2.6 -0.38 6.2 -0.4 8.4 0.02 C9.15 0.28 9.25 1.05 8.7 1.58 C7.7 2.42 5.7 2.98 3.9 2.88 C2.6 2.78 1.2 2.04 0.4 1.04 C0.1 0.64 0 0.3 0 0 Z";
const FORE_VEINS = [
  "M0.12 0.02 C1.3 -0.18 2.6 -0.27 3.6 -0.24",
  "M0.25 0.2 C1.3 0.1 2.5 0.0 3.55 0.0",
  "M4.05 0.02 C4.9 0.55 6.7 0.8 7.85 0.06",
  "M0.3 0.45 C1.5 0.55 2.6 0.75 3.45 1.0 C4.15 1.28 4.6 1.42 5.05 1.45 C5.85 1.47 6.45 1.38 6.85 1.24 C7.3 1.02 7.55 0.72 7.7 0.32",
  "M3.6 0.04 C3.55 0.4 3.5 0.72 3.45 1.0",
  "M5.2 0.6 C5.14 0.88 5.1 1.16 5.05 1.45",
  "M6.6 0.7 C6.68 0.9 6.76 1.06 6.85 1.24",
  "M2.95 0.86 C3.5 1.42 4.05 1.9 4.7 2.08 C5.35 2.24 5.95 2.26 6.45 2.18",
  "M4.15 1.3 C4.22 1.56 4.28 1.8 4.32 2.0",
  "M5.55 1.45 C5.6 1.7 5.64 1.94 5.68 2.22",
  "M0.32 0.7 C1.2 1.1 2.2 1.6 3.2 1.96 C3.7 2.13 4.1 2.24 4.4 2.28",
  "M0.36 0.95 C1.0 1.4 1.6 1.82 2.2 2.12",
];
const STIGMA = "M3.5 -0.22 C3.8 -0.27 4.05 -0.2 4.12 -0.06 C3.98 0.1 3.7 0.12 3.52 0.04 Z";
const HIND = "M0 0 C2 -0.12 4.5 0 6.1 0.42 C6.55 0.72 6.32 1.22 5.6 1.42 C4.0 1.82 2.2 1.72 0.9 1.22 C0.3 0.92 0 0.42 0 0 Z";
const HIND_VEINS = ["M0.1 0.08 C1.2 0.02 2.3 0.04 3.1 0.12", "M0.2 0.5 C1.1 0.66 1.9 0.8 2.6 0.86 C3.1 0.9 3.5 0.95 3.8 1.0", "M2.55 0.86 C2.7 0.6 2.85 0.35 3.0 0.14", "M0.3 0.8 C0.9 1.05 1.5 1.24 2.1 1.36"];

// One wing, placed: base (x, y), angle (deg, 0 = pointing forward), squash (1 seen flat; small = edge on; negative
// flips which edge is on top).
function wing(kind, x, y, angle, squash, { veins = true, a = 0.12 } = {}) {
  const body = kind === "fore" ? FORE : HIND, vv = kind === "fore" ? FORE_VEINS : HIND_VEINS;
  const tr = `transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)}) scale(1 ${f(squash)})"`;
  return {
    paint: `<g ${tr}>${W(body, "#8f8a80", a)}${W(body, "#d9c89c", a * 0.6)}${kind === "fore" && veins ? W(STIGMA, C.umber, 0.6) : ""}</g>`,
    ink: `<g ${tr}>${K(body, "k1", ' style="stroke:#5b4632"')}${veins ? vv.map((v) => K(v, "k0", ' style="stroke:#6b4f33"')).join("") : ""}</g>`,
  };
}

// A leg: a chain of joints, each segment a slender painted limb with a highlight along its upper edge.
// widths[i] = [w at start, w at end, bulge]
function limb(chain, widths, { colour = C.umber, a = 0.82, hairy = 0, light = true } = {}) {
  let paint = "", ink = "", hair = "";
  for (let i = 0; i < chain.length - 1; i++) {
    const [x0, y0] = chain[i], [x1, y1] = chain[i + 1];
    const w0 = widths[i][0] / 2, w1 = widths[i][1] / 2, bulge = widths[i][2] ?? 0.12;
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    const q = (t, s) => {
      const w = (w0 + (w1 - w0) * t) * (1 + bulge * Math.sin(Math.PI * t)) * s;
      return pt(x0 + dx * t + nx * w, y0 + dy * t + ny * w);
    };
    const d = `M${q(0, 1)} C${q(0.33, 1.08)} ${q(0.66, 1.08)} ${q(1, 1)} L${q(1, -1)} C${q(0.66, -1.08)} ${q(0.33, -1.08)} ${q(0, -1)} Z`;
    paint += W(d, colour, a);
    // light from above: a reserved streak on the upper side of the segment
    if (light && l > 0.5) {
      const up = ny < 0 ? 1 : -1;
      paint += W(`M${q(0.15, 0.55 * up)} C${q(0.4, 0.75 * up)} ${q(0.6, 0.75 * up)} ${q(0.85, 0.55 * up)} L${q(0.85, 0.25 * up)} C${q(0.6, 0.4 * up)} ${q(0.4, 0.4 * up)} ${q(0.15, 0.25 * up)} Z`, C.paper, 0.4);
    }
    ink += K(d, "k1");
    if (hairy && i >= 1 && l > 0.6) {
      const n = Math.round(l * 7 * hairy);
      for (let k = 1; k < n; k++) {
        const t = k / n, s = k % 2 ? 1 : -1, w = (w0 + (w1 - w0) * t) * s;
        hair += `M${pt(x0 + dx * t + nx * w, y0 + dy * t + ny * w)} l${pt((nx * s * 0.26 + (dx / l) * 0.12) * hairy, (ny * s * 0.26 + (dy / l) * 0.12) * hairy)} `;
      }
    }
  }
  // claws at the tip
  const [ax, ay] = chain.at(-2), [bx, by] = chain.at(-1), l = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / l, uy = (by - ay) / l;
  ink += K(`M${pt(bx, by)} q${pt(ux * 0.18 - uy * 0.08, uy * 0.18 + ux * 0.08)} ${pt(ux * 0.14 + uy * 0.12, uy * 0.14 - ux * 0.12)}`, "k1");
  return { paint, ink, hair };
}
// Near-side legs standing on a surface (y about 4.4): coxa, trochanter, femur, tibia, basitarsus, four tarsomeres.
export const STAND = {
  fore: [[3.55, 1.2], [3.7, 1.75], [3.85, 2.0], [4.75, 2.65], [5.15, 3.75], [5.62, 4.05], [5.86, 4.18], [6.04, 4.27], [6.18, 4.33], [6.34, 4.37]],
  mid: [[2.12, 1.66], [2.2, 2.15], [2.3, 2.4], [2.9, 3.15], [2.4, 4.02], [1.8, 4.24], [1.56, 4.31], [1.38, 4.36], [1.22, 4.39], [1.04, 4.42]],
  hind: [[0.82, 1.5], [0.7, 2.0], [0.55, 2.25], [-0.35, 3.0], [-1.95, 3.3], [-2.85, 3.88], [-3.08, 4.04], [-3.26, 4.16], [-3.42, 4.26], [-3.6, 4.36]],
};
const LEGW = {
  fore: [[0.5, 0.42], [0.36, 0.34], [0.36, 0.42, 0.18], [0.3, 0.36], [0.26, 0.22], [0.17, 0.16], [0.16, 0.15], [0.15, 0.14], [0.14, 0.1]],
  mid: [[0.5, 0.42], [0.36, 0.34], [0.38, 0.42, 0.18], [0.3, 0.34], [0.28, 0.24], [0.17, 0.16], [0.16, 0.15], [0.15, 0.14], [0.14, 0.1]],
  hind: [[0.55, 0.46], [0.4, 0.38], [0.42, 0.48, 0.18], [0.38, 0.98, -0.05], [0.72, 0.62, 0], [0.19, 0.17], [0.17, 0.16], [0.16, 0.14], [0.14, 0.1]],
};

// The honeybee worker in profile. Options:
//   tongue: mm of proboscis out (0 folded under the head); tongueAngle: degrees below forward
//   wings: "rest" (folded over the abdomen) | "raised" (lifted and spread, as a plate shows them) | "none"
//   legs: { fore, mid, hind } chains to pose them (clinging, walking); clear: the abdomen's paint left off (anatomy)
//   id: names the clip paths (unique per bee on a page)
// Returns the layers, in mm, to place with a transform: far (far-side legs), under (raised wings), paint, hair, ink,
// over (folded wings), and the tongue's path.
export function beeSide({ tongue = 0, tongueAngle = 30, wings = "rest", legs = {}, clear = false, seed = 3, id = "b" } = {}) {
  const L = { ...STAND, ...legs };
  let paint = "", ink = "", hair = "", far = "", farInk = "", abdPaint = "", abdInk = "", abdHair = "";
  // far-side legs, behind the body: the same chains a little forward and higher, paler
  for (const k of ["fore", "mid", "hind"]) {
    const off = { fore: [0.45, -0.25], mid: [-0.5, -0.3], hind: [0.7, -0.35] }[k];
    const ch = L[k].map(([x, y], i) => (i < 2 ? [x + 0.1, y - 0.3] : [x + off[0], y + off[1]]));
    const leg = limb(ch, LEGW[k], { a: 0.5, light: false });
    far += leg.paint;
    farInk += leg.ink.replaceAll('class="k1"', 'class="k0"');
  }
  const wl = wings === "raised" ? [wing("hind", 1.85, -2.35, -158, -0.7), wing("fore", 2.6, -2.5, -166, -0.82)]
    : wings === "rest" ? [wing("hind", 1.85, -2.42, -177, -0.22, { veins: false }), wing("fore", 2.6, -2.55, -174, -0.3)] : [];
  const T = THORAX.d, H = HEAD.d, A = ABDOMEN.d;
  const clipA = `${id}-abd`, clipT = `${id}-thx`, clipH = `${id}-head`;
  const defs = `<defs><clipPath id="${clipA}"><path d="${A}"/></clipPath><clipPath id="${clipT}"><path d="${T}"/></clipPath><clipPath id="${clipH}"><path d="${H}"/></clipPath></defs>`;
  const petiole = "M0.24 -0.3 C0.1 -0.26 0 -0.24 -0.16 -0.28 L-0.16 0.5 C0 0.42 0.1 0.4 0.22 0.42 Z";
  paint += defs + W(petiole, C.umber, 0.8);
  // thorax: dark cuticle under a coat of tawny hair, lit from above
  paint += `<g clip-path="url(#${clipT})">${W(T, "#a3743e", 0.62)}${W(ell(2.2, -2.0, 1.8, 1.0, -6), "#e6c27c", 0.55)}${W("M0.2 0.2 C1.0 1.8 3.0 2.0 4.2 0.6 L4.2 2.2 L0.2 2.2 Z", C.umber, 0.55)}${W("M3.7 -2.5 C3.1 -1.2 3.3 0.3 3.9 1.2 L4.4 1.2 L4.4 -2.5 Z", C.umber, 0.28)}${W(ell(2.6, -0.2, 0.7, 1.1, 10), C.umber, 0.25)}</g>`;
  // head: brown, the face with buff hair, the eye dark
  paint += `<g clip-path="url(#${clipH})">${W(H, C.umber, 0.68)}${W("M5.55 -1.6 C6.2 -1.0 6.45 0.6 6.15 1.6 C5.85 0.8 5.7 -0.4 5.55 -1.6 Z", "#d7b06a", 0.6)}${W(ell(4.6, 1.3, 0.6, 0.9), C.ink, 0.3)}</g>`;
  const EYE = "M4.8 -1.42 C5.28 -1.52 5.62 -0.98 5.6 -0.2 C5.53 0.2 5.46 0.5 5.53 0.9 C5.58 1.34 5.24 1.6 4.86 1.5 C4.46 1.35 4.33 0.6 4.34 -0.1 C4.36 -0.9 4.46 -1.36 4.8 -1.42 Z";
  paint += W(EYE, "#2a1f17", 0.82) + W("M4.62 -1.15 C4.9 -1.3 5.2 -1.1 5.25 -0.6 C5.1 -0.3 4.75 -0.4 4.6 -0.7 Z", "#8a7a68", 0.35);
  // abdomen: amber tergites 1-3, dark hind margins, tergites 4-6 dark, pale hair bands; lit from above
  if (!clear) {
    let ab = W(A, C.ochre, 0.7) + W(A, "#c98a3a", 0.25);
    for (const [i, x] of MARGINS.entries()) ab += W(bandD(x, [0.32, 0.42, 0.55, 1.0, 1.2][i]), "#3d2716", [0.7, 0.75, 0.8, 0.85, 0.88][i]);
    ab += W("M-5.95 -3 L-8 -3 L-8 3 L-6.4 3 C-6.5 1.4 -6.2 0 -5.95 -3 Z", "#3d2716", 0.8);
    for (const x of [-2.45, -3.75, -4.92]) ab += W(bandD(x - 0.05, 0.36, 0.42), "#efe4cc", 0.75);
    ab += W("M-0.4 1.2 C-2.2 1.9 -4.8 1.9 -6.8 0.9 L-6.8 2.6 L-0.4 2.6 Z", C.umber, 0.45);
    ab += W(ell(-2.8, -1.35, 2.3, 0.5, -3), C.paper, 0.42);
    abdPaint = `<defs><clipPath id="${clipA}"><path d="${A}"/></clipPath></defs><g clip-path="url(#${clipA})">${ab}</g>`;
  }
  const MAND = "M5.52 1.72 C6.0 1.66 6.46 1.98 6.42 2.4 C6.32 2.66 5.92 2.58 5.72 2.32 C5.6 2.16 5.54 1.94 5.52 1.72 Z";
  paint += W(MAND, "#6b4422", 0.85);
  // antenna: the scape, the elbow, the flagellum of ten segments
  const scape = "M6.06 -0.08 C6.3 -0.46 6.58 -0.86 6.84 -1.12", flag = "M7.0 -1.16 C7.68 -1.3 8.32 -1.02 8.78 -0.4";
  // the antenna, elbowed: a long scape up and forward from its socket on the face, the pedicel, then the flagellum
  // bent forward and down
  const antenna = limb([[6.04, -0.1], [6.78, -1.5], [6.9, -1.6]], [[0.17, 0.2], [0.15, 0.14]], { colour: "#3a2718", a: 0.9, light: false });
  const flagellum = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10, u = 1 - t;
    return [u * u * u * 6.9 + 3 * u * u * t * 7.75 + 3 * u * t * t * 8.55 + t * t * t * 8.85, u * u * u * -1.6 + 3 * u * u * t * -1.55 + 3 * u * t * t * -0.9 + t * t * t * 0.0];
  });
  const fl = limb(flagellum, flagellum.slice(1).map(() => [0.14, 0.14, 0.15]), { colour: "#3a2718", a: 0.88, light: false });
  paint += antenna.paint + fl.paint;
  // proboscis: folded under the head, or reaching out (dark sheath, a paler hairy glossa at its end)
  let tng = "";
  if (tongue > 0) {
    const a = (tongueAngle * Math.PI) / 180, x0 = 5.95, y0 = 2.15, x1 = x0 + Math.cos(a) * tongue, y1 = y0 + Math.sin(a) * tongue;
    tng = `M${pt(x0, y0)} Q${pt(x0 + Math.cos(a) * tongue * 0.5 + 0.06, y0 + Math.sin(a) * tongue * 0.5 - 0.06)} ${pt(x1, y1)}`;
  }
  ink += K(A, "k2") + K(petiole, "k1") + K(T, "k2") + K(H, "k2") + K(EYE, "k1") + K(MAND, "k1") + antenna.ink + fl.ink;
  if (!clear) {
    for (const x of MARGINS) abdInk += K(marginD(x), "k1");
    abdInk += K("M-0.55 1.15 C-2.4 1.62 -4.6 1.52 -6.62 0.92", "k0");
    ink += K("M-7.32 0.3 l-0.16 0.06", "k1");
  }
  ink += K("M3.75 -2.18 C3.32 -1.1 3.48 0.25 3.88 1.05", "k0") + K("M2.55 -2.36 C2.18 -1.0 2.3 0.55 2.62 1.62", "k0") + K("M1.38 -2.8 C1.2 -2.55 1.02 -2.45 0.84 -2.48", "k0") + K("M1.18 -2.1 C0.94 -0.95 1.0 0.5 1.22 1.5", "k0");
  ink += W(ell(2.72, -2.34, 0.28, 0.14, -12), "#c89a5a", 0.5) + K(ell(2.72, -2.34, 0.28, 0.14, -12), "k0", ' style="stroke-opacity:.5"');
  for (const [ox, oy] of [[5.0, -1.78], [5.27, -1.84], [5.52, -1.72]]) ink += `<circle cx="${ox}" cy="${oy}" r="0.12" class="dot"/><circle cx="${ox - 0.03}" cy="${oy - 0.04}" r="0.035" fill="${C.paper}"/>`;
  // facets: a fine stipple over the eye
  let fac = "";
  for (let iy = -1.3; iy < 1.45; iy += 0.17) for (let ix = 4.42; ix < 5.55; ix += 0.17) {
    const xx = ix + (Math.round((iy + 2) / 0.17) % 2) * 0.085;
    if (((xx - 4.97) / 0.6) ** 2 + ((iy - 0.04) / 1.45) ** 2 < 0.92) fac += `M${pt(xx, iy)} l0.01 0 `;
  }
  ink += `<path d="${fac}" class="k0" style="stroke:#c9b7a0;stroke-opacity:.5"/>`;
  if (tng) ink += K(tng, "k3", ' data-part="tongue" style="stroke:#3a2718"');
  else ink += K("M5.3 2.21 C4.9 2.4 4.5 2.37 4.15 2.17", "k1");
  let legsPaint = "", legsInk = "";
  for (const k of ["hind", "mid", "fore"]) {
    const leg = limb(L[k], LEGW[k], { hairy: k === "hind" ? 1.4 : 0.7 });
    legsPaint += leg.paint;
    legsInk += leg.ink;
    hair += leg.hair;
  }
  // hair: plumose and tawny over the thorax and the top of the head, short on the abdomen; strokes inside the thorax
  // follow its form
  hair += hairs(THORAX, { n: 26, len: 0.5, lean: 0.3, seed, from: 0, to: 0.6 });
  hair += hairs(THORAX, { n: 22, len: 0.36, lean: 0.2, seed: seed + 1, from: 0.66, to: 0.99 });
  hair += hairs(HEAD, { n: 16, len: 0.28, lean: 0.25, seed: seed + 2, from: 0.0, to: 0.66 });
  if (!clear) abdHair += hairs(ABDOMEN, { n: 14, len: 0.14, lean: 0.6, seed: seed + 3, from: 0.02, to: 0.52 });
  // the pile of the thorax: short curved hairs over all of it, lying outward from the dome's crown and down its sides
  const r = rng(seed * 7);
  for (let i = 0; i < 230; i++) {
    const ang = r() * Math.PI * 2, rad = Math.sqrt(r());
    const x = 2.15 + Math.cos(ang) * rad * 1.85, y = -0.55 + Math.sin(ang) * rad * 2.05;
    const L = 0.16 + 0.16 * r(), dir = Math.atan2(y + 2.0, x - 2.2) + (r() - 0.5) * 0.6;
    const ox = Math.cos(dir) * L, oy = Math.sin(dir) * L;
    hair += `M${pt(x, y)} q${pt(ox * 0.5 + oy * 0.25, oy * 0.5 - ox * 0.25)} ${pt(ox, oy)} `;
  }
  // the face's pale hair, and the hair between the eye and the mandible
  for (let i = 0; i < 40; i++) {
    const x = 5.6 + r() * 0.75, y = -1.3 + r() * 2.9, L = 0.12 + 0.1 * r();
    hair += `M${pt(x, y)} q${pt(L * 0.6, L * 0.2)} ${pt(L, L * 0.7)} `;
  }
  return {
    far, farInk,
    under: wings === "raised" ? wl.map((w) => w.paint).join("") : "",
    underInk: wings === "raised" ? wl.map((w) => w.ink).join("") : "",
    paint: paint + legsPaint,
    ink: legsInk + ink,
    abdPaint, abdInk, abdHair, A,
    over: wings === "rest" ? wl.map((w) => w.paint).join("") : "",
    overInk: wings === "rest" ? wl.map((w) => w.ink).join("") : "",
    hair,
    tongue: tng,
  };
}
// Beating wings, drawn over a flying or fanning bee: the fore wing at three points of its stroke, faint, and the arc
// its tip sweeps. phase 0..1 turns the set a little, so the blur lives.
export function beeFlap(phase = 0, a = 1) {
  let paint = "", ink = "";
  const base = [2.6, -2.5];
  const swing = Math.sin(phase * 6.283);
  for (const [k, ang] of [-118, -176].entries()) {
    const wg = wing("fore", base[0], base[1], ang + swing * 8 * (k ? -1 : 1), -0.85, { veins: true, a: 0.1 * a });
    paint += wg.paint;
    ink += `<g style="opacity:${0.45 * a}">${wg.ink}</g>`;
  }
  for (const ang of [-132, -150, -162]) paint += wing("fore", base[0], base[1], ang + swing * 5, -0.85, { veins: false, a: 0.045 * a }).paint;
  ink += K("M1.4 -8.9 C-1.8 -8.7 -5.0 -7.1 -6.7 -4.0", "k0", ` style="opacity:${0.5 * a}"`);
  return { paint, ink };
}

// Inside the worker (Snodgrass 1910, figs. 1 and 42): the oesophagus through the thorax and petiole, the honey
// stomach (crop) in the front of the abdomen, the proventriculus behind it, the U-shaped ventriculus with its ring
// folds, the coiled small intestine with the Malpighian tubules, the rectum. mm, the frame of beeSide.
export const GUT = {
  // from the mouth, under the eye, out of the head at the back and along the thorax to the petiole
  oesophagus: "M5.75 2.0 C5.3 1.9 4.82 1.6 4.42 1.05 C4.12 0.62 3.7 0.42 3.2 0.32 C2.4 0.18 1.3 0.12 0.6 0.12 C0.2 0.12 -0.1 0.14 -0.42 0.16",
  // the honey stomach, empty (folded, small) and full (swollen through the front of the abdomen); the same commands,
  // so one can be drawn on the way to the other
  crop: "M-0.42 -0.1 C-0.6 -0.55 -1.1 -0.72 -1.55 -0.66 C-2.0 -0.6 -2.2 -0.25 -2.18 0.2 C-2.15 0.62 -1.85 0.92 -1.4 0.9 C-0.95 0.88 -0.6 0.62 -0.42 0.42 Z",
  cropFull: "M-0.42 -0.28 C-0.72 -1.2 -1.6 -1.55 -2.35 -1.45 C-3.15 -1.3 -3.42 -0.55 -3.38 0.2 C-3.32 1.0 -2.8 1.55 -1.95 1.52 C-1.1 1.48 -0.6 1.05 -0.42 0.5 Z",
  // the proventriculus: the short neck behind the honey stomach, its four lips the valve into the midgut
  valve: "M-3.3 -0.06 L-3.88 -0.02 L-3.88 0.34 L-3.3 0.38 Z",
  valveLips: "M-3.3 0.02 L-3.12 0.1 M-3.3 0.3 L-3.12 0.22 M-3.3 0.16 L-3.08 0.16",
  // the ventriculus: a thick U-shaped tube with ring folds through the middle and back of the abdomen
  ventriculus: "M-3.88 0.16 C-4.6 0.26 -5.45 0.42 -5.85 -0.18 C-6.12 -0.7 -5.55 -1.38 -4.8 -1.32 C-4.25 -1.28 -3.95 -1.02 -3.7 -1.2",
  intestine: "M-3.7 -1.2 C-4.2 -1.62 -5.35 -1.72 -5.98 -1.32 C-6.3 -1.05 -6.12 -0.62 -6.3 -0.32",
  rectum: "M-6.3 -0.32 C-6.62 -0.6 -7.05 -0.35 -7.1 0.05 C-7.12 0.45 -6.85 0.7 -6.45 0.62 C-6.2 0.55 -6.1 0.2 -6.3 -0.32 Z",
  malpighian: "M-3.7 -1.2 C-3.4 -1.55 -3.0 -1.3 -2.7 -1.6 C-2.5 -1.8 -2.9 -1.9 -3.2 -1.75 M-3.7 -1.2 C-3.9 -1.7 -4.4 -1.75 -4.6 -1.95 M-3.7 -1.2 C-3.3 -0.9 -3.5 -0.55 -3.2 -0.4 M-3.7 -1.2 C-4.0 -0.8 -4.5 -0.85 -4.7 -0.55",
};
export const lerpPath = (a, b, k) => {
  const na = a.match(/-?\d*\.?\d+/g).map(Number), nb = b.match(/-?\d*\.?\d+/g).map(Number);
  let i = 0;
  return a.replace(/-?\d*\.?\d+/g, () => { const v = na[i] + (nb[i] - na[i]) * k; i++; return v.toFixed(3); });
};
// a tube of width w along a cubic chain: its outline (to fill) and its two walls (to ink)
export function tube(d, w, taper = [1, 1]) {
  const n = d.match(/-?\d*\.?\d+/g).map(Number), pts = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
  const L = [], R = [];
  const segs = Math.floor((pts.length - 1) / 3);
  for (let s = 0; s < segs; s++) {
    const [p0, c1, c2, p1] = [pts[s * 3], pts[s * 3 + 1], pts[s * 3 + 2], pts[s * 3 + 3]];
    for (let t = s ? 0.05 : 0; t <= 1.0001; t += 0.05) {
      const u = 1 - t, x = u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0], y = u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1];
      const dx = 3 * u * u * (c1[0] - p0[0]) + 6 * u * t * (c2[0] - c1[0]) + 3 * t * t * (p1[0] - c2[0]), dy = 3 * u * u * (c1[1] - p0[1]) + 6 * u * t * (c2[1] - c1[1]) + 3 * t * t * (p1[1] - c2[1]);
      const l = Math.hypot(dx, dy) || 1, g = (s + t) / segs, r = (w / 2) * (taper[0] + (taper[1] - taper[0]) * g);
      L.push(pt(x - (dy / l) * r, y + (dx / l) * r));
      R.push(pt(x + (dy / l) * r, y - (dx / l) * r));
    }
  }
  return { fill: `M${L.join(" L")} L${R.reverse().join(" L")} Z`, walls: `M${L.join(" L")} M${R.join(" L")}` };
}
// ring folds across a tube: short strokes across it every `step` along the path's control polygon (mm)
export function folds(d, w, step = 0.32) {
  const n = d.match(/-?\d*\.?\d+/g).map(Number), pts = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
  // sample the cubic chain
  const out = [];
  for (let s = 0; s + 3 < pts.length; s += 3) {
    const [p0, c1, c2, p1] = [pts[s], pts[s + 1], pts[s + 2], pts[s + 3]];
    for (let t = 0; t < 1; t += 0.12) {
      const u = 1 - t, x = u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0], y = u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1];
      const dx = 3 * u * u * (c1[0] - p0[0]) + 6 * u * t * (c2[0] - c1[0]) + 3 * t * t * (p1[0] - c2[0]), dy = 3 * u * u * (c1[1] - p0[1]) + 6 * u * t * (c2[1] - c1[1]) + 3 * t * t * (p1[1] - c2[1]);
      const l = Math.hypot(dx, dy) || 1;
      out.push(`M${pt(x - (dy / l) * w * 0.48, y + (dx / l) * w * 0.48)} L${pt(x + (dy / l) * w * 0.48, y - (dx / l) * w * 0.48)}`);
    }
  }
  return out.join(" ");
}

// ── The honeybee from above (dorsal), mm, facing +x, origin at the petiole ──────────────────────────────────────
// Head wider than long with the eyes along its sides, the round thorax with the tegulae, the wings folded over the
// abdomen side by side, the legs splayed.
export function beeTop({ wings = "rest", step = 0, seed = 5, id = "t", clipHead = null } = {}) {
  const HEADT = outline(4.15, 0, [4.15, -1.2, 4.6, -2.05, 5.2, -2.05], [5.9, -2.0, 6.25, -1.1, 6.3, 0], [6.25, 1.1, 5.9, 2.0, 5.2, 2.05], [4.6, 2.05, 4.15, 1.2, 4.15, 0]);
  const THX = outline(4.1, 0, [4.1, -1.15, 3.2, -2.0, 2.1, -2.0], [1.0, -2.0, 0.15, -1.15, 0.15, 0], [0.15, 1.15, 1.0, 2.0, 2.1, 2.0], [3.2, 2.0, 4.1, 1.15, 4.1, 0]);
  const ABD = outline(-0.2, -0.6,
    [-0.8, -1.9, -2.2, -2.32, -3.4, -2.28],
    [-5.0, -2.18, -6.4, -1.4, -7.25, 0],
    [-6.4, 1.4, -5.0, 2.18, -3.4, 2.28],
    [-2.2, 2.32, -0.8, 1.9, -0.2, 0.6],
    [-0.1, 0.2, -0.1, -0.2, -0.2, -0.6]);
  let paint = "", ink = "", hair = "", under = "", underInk = "";
  const clipA = `${id}-abd`;
  paint += `<defs><clipPath id="${clipA}"><path d="${ABD.d}"/></clipPath></defs>`;
  // legs, splayed three a side; `step` walks them (alternating tripods)
  const LG = [[[3.2, 1.3], [3.7, 2.4], [4.7, 3.0], [5.4, 3.5], [5.9, 3.7]], [[2.2, 1.6], [2.35, 3.0], [1.7, 3.95], [1.1, 4.4], [0.6, 4.6]], [[1.0, 1.4], [0.3, 2.7], [-1.5, 3.5], [-2.6, 3.95], [-3.2, 4.1]]];
  for (const side of [1, -1]) for (const [i, ch] of LG.entries()) {
    const ph = ((i % 2 === 0) === (side > 0) ? 0 : 0.5);
    const sw = Math.sin((step + ph) * 6.283) * 0.35;
    const c = ch.map(([x, y], j) => [x + (j > 1 ? sw : 0), y * side]);
    const leg = limb(c, [[0.3, 0.28], [0.26, i === 2 ? 0.62 : 0.22], [i === 2 ? 0.48 : 0.18, 0.14], [0.13, 0.08]], { a: 0.8, light: false });
    under += leg.paint;
    underInk += leg.ink;
  }
  let ab = W(ABD.d, C.ochre, 0.7) + W(ABD.d, "#c98a3a", 0.25);
  const xs = [-1.2, -2.5, -3.8, -4.95, -5.95];
  for (const [i, x] of xs.entries()) {
    const w = [0.3, 0.4, 0.5, 0.95, 1.2][i];
    ab += W(`M${pt(x, -3)} C${pt(x - 0.45, -1)} ${pt(x - 0.45, 1)} ${pt(x, 3)} L${pt(x + w, 3)} C${pt(x + w - 0.45, 1)} ${pt(x + w - 0.45, -1)} ${pt(x + w, -3)} Z`, "#3d2716", [0.7, 0.75, 0.8, 0.85, 0.88][i]);
    if (i > 0 && i < 4) ab += W(`M${pt(x - 0.42, -3)} C${pt(x - 0.87, -1)} ${pt(x - 0.87, 1)} ${pt(x - 0.42, 3)} L${pt(x - 0.04, 3)} C${pt(x - 0.49, 1)} ${pt(x - 0.49, -1)} ${pt(x - 0.04, -3)} Z`, "#efe4cc", 0.7);
  }
  ab += W("M-5.95 -3 L-8 -3 L-8 3 L-5.95 3 C-6.4 1 -6.4 -1 -5.95 -3 Z", "#3d2716", 0.85);
  ab += W(ell(-2.8, -0.9, 2.6, 0.7), C.paper, 0.35);
  paint += `<g clip-path="url(#${clipA})">${ab}</g>`;
  for (const x of xs) {
    const hw = 2.3 * Math.sqrt(Math.max(0, 1 - ((x + 3.4) / 3.95) ** 2));
    ink += K(`M${pt(x + 0.05, -hw)} C${pt(x - 0.4, -hw * 0.4)} ${pt(x - 0.4, hw * 0.4)} ${pt(x + 0.05, hw)}`, "k0");
  }
  const thx = W(THX.d, "#a3743e", 0.6) + W(ell(2.0, -0.35, 1.5, 1.3), "#e6c27c", 0.55) + W(ell(1.6, 1.0, 1.4, 0.8), C.umber, 0.25);
  paint += thx;
  const head = W(HEADT.d, C.umber, 0.68) + W(ell(5.7, 0, 0.5, 0.9), "#d7b06a", 0.5);
  const eyes = [outline(4.45, -1.6, [4.7, -2.15, 5.6, -2.15, 5.85, -1.55], [5.6, -1.3, 4.8, -1.25, 4.45, -1.6]), outline(4.45, 1.6, [4.7, 2.15, 5.6, 2.15, 5.85, 1.55], [5.6, 1.3, 4.8, 1.25, 4.45, 1.6])];
  const eyePaint = eyes.map((e) => W(e.d, "#2a1f17", 0.85)).join("");
  // antennae, elbowed, pointing forward
  const ants = [1, -1].map((sd) => {
    const sc = limb([[6.15, 0.35 * sd], [6.9, 0.9 * sd]], [[0.17, 0.16]], { colour: "#3a2718", a: 0.9, light: false });
    const fl = limb([[6.9, 0.9 * sd], [7.7, 1.1 * sd], [8.4, 1.05 * sd], [8.95, 0.8 * sd]], [[0.14, 0.14], [0.14, 0.14], [0.14, 0.13]], { colour: "#3a2718", a: 0.9, light: false });
    return { paint: sc.paint + fl.paint, ink: sc.ink + fl.ink };
  });
  if (clipHead) {
    // her head down inside a cell: drawn darker, under the cell's rim
    paint += `<g opacity="0.55">${head}${eyePaint}${ants.map((a2) => a2.paint).join("")}</g>`;
  } else {
    paint += head + eyePaint + ants.map((a2) => a2.paint).join("");
  }
  let over = "", overInk = "";
  if (wings === "rest") {
    for (const sd of [1, -1]) {
      const wg = wing("fore", 2.5, 1.05 * sd, 180 - 6 * sd, -0.62 * sd, { a: 0.14 });
      const hw = wing("hind", 2.0, 0.85 * sd, 180 - 4 * sd, -0.55 * sd, { veins: false, a: 0.08 });
      over += hw.paint + wg.paint;
      overInk += hw.ink + wg.ink;
    }
  }
  ink += K(ABD.d, "k2") + K(THX.d, "k2") + K(HEADT.d, "k2") + eyes.map((e) => K(e.d, "k1")).join("") + ants.map((a2) => a2.ink).join("");
  for (const sd of [1, -1]) ink += W(ell(2.85, 1.72 * sd, 0.34, 0.22), "#6b4422", 0.8) + K(ell(2.85, 1.72 * sd, 0.34, 0.22), "k0");
  hair += hairs(THX, { n: 16, len: 0.42, lean: 0.25, seed });
  hair += hairs(HEADT, { n: 10, len: 0.22, lean: 0.25, seed: seed + 1, from: 0.0, to: 0.25 }) + hairs(HEADT, { n: 10, len: 0.22, lean: 0.25, seed: seed + 2, from: 0.75, to: 1 });
  const r = rng(seed * 3);
  for (let i = 0; i < 60; i++) {
    const ang = r() * Math.PI * 2, rad = Math.sqrt(r());
    const x = 2.1 + Math.cos(ang) * rad * 1.75, y = Math.sin(ang) * rad * 1.75, ox = Math.cos(ang) * 0.2, oy = Math.sin(ang) * 0.2;
    hair += `M${pt(x, y)} q${pt(ox * 0.5 + oy * 0.2, oy * 0.5 - ox * 0.2)} ${pt(ox, oy)} `;
  }
  return { under, underInk, paint, ink, over, overInk, hair, abd: ABD.d, head: HEADT.d };
}

// ── Kaliandra (Calliandra calothyrsus) ────────────────────────────────────────────────────────────────────────────
// One open flower: pedicel, calyx, corolla tube with five reflexed lobes, then the tuft of stamens. In mm, the
// flower's base at the origin, pointing along `angle` (deg, 0 = +x); stamens spread and droop by gravity.
export function flower({ angle = -30, len = 48, n = 36, spread = 70, droop = 0.55, seed = 1, corolla = 1 } = {}) {
  const r = rng(seed), a = (angle * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const P = (u, v) => [u * ux + v * nx, u * uy + v * ny];
  const S = (u, v) => pt(...P(u, v));
  const k = corolla;
  const calyx = `M${S(0.5 * k, -0.6 * k)} C${S(1.4 * k, -1.1 * k)} ${S(2.4 * k, -1.1 * k)} ${S(2.8 * k, -0.95 * k)} L${S(2.8 * k, 0.95 * k)} C${S(2.4 * k, 1.1 * k)} ${S(1.4 * k, 1.1 * k)} ${S(0.5 * k, 0.6 * k)} Z`;
  const tube = `M${S(2.6 * k, -0.9 * k)} C${S(4.2 * k, -1.0 * k)} ${S(6.0 * k, -1.15 * k)} ${S(7.2 * k, -1.5 * k)} L${S(7.2 * k, 1.5 * k)} C${S(6.0 * k, 1.15 * k)} ${S(4.2 * k, 1.0 * k)} ${S(2.6 * k, 0.9 * k)} Z`;
  const lobes = [-1, 1].map((s) => `M${S(7.1 * k, 1.45 * k * s)} C${S(7.6 * k, 2.4 * k * s)} ${S(8.4 * k, 2.6 * k * s)} ${S(8.0 * k, 1.7 * k * s)} C${S(7.8 * k, 1.4 * k * s)} ${S(7.5 * k, 1.2 * k * s)} ${S(7.2 * k, 1.1 * k * s)}`).join(" ") + ` M${S(7.15 * k, -0.6 * k)} C${S(7.9 * k, -0.9 * k)} ${S(8.5 * k, -0.4 * k)} ${S(8.1 * k, 0.1 * k)} C${S(7.7 * k, 0.2 * k)} ${S(7.4 * k, 0.1 * k)} ${S(7.2 * k, 0.05 * k)}`;
  const teeth = [-0.8, -0.3, 0.3, 0.8].map((v) => `M${S(2.6 * k, v * 1.05 * k)} L${S(3.25 * k, v * 0.95 * k)}`).join(" ");
  const veins = [-0.55, 0, 0.55].map((v) => `M${S(2.9 * k, v * 0.9 * k)} C${S(4.5 * k, v * 1.0 * k)} ${S(6.0 * k, v * 1.15 * k)} ${S(7.1 * k, v * 1.35 * k)}`).join(" ");
  const column = `M${S(7.0 * k, -0.42 * k)} L${S(7.9 * k, -0.36 * k)} L${S(7.9 * k, 0.36 * k)} L${S(7.0 * k, 0.42 * k)} Z`;
  const mouth = P(7.9 * k, 0);
  let st = "", tips = "";
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) - 0.5 : 0, th = a + ((t * spread + (r() - 0.5) * 10) * Math.PI) / 180;
    const L = len * (0.7 + r() * 0.36);
    const x0 = mouth[0] + (r() - 0.5) * 0.7 * k, y0 = mouth[1] + (r() - 0.5) * 0.7 * k;
    // each filament leaves the mouth near straight and arches as it goes, bowed one way or the other and bending
    // a little under its own weight (photographs: long, slender, gently curved, never ruled)
    const bend = (r() - 0.5) * 0.6 + (t > 0 ? 0.12 : -0.12);
    const d1 = th + bend * 0.25, d2 = th + bend * 0.7, d3 = th + bend;
    const c1x = x0 + Math.cos(d1) * L * 0.34, c1y = y0 + Math.sin(d1) * L * 0.34;
    const c2x = x0 + Math.cos(d2) * L * 0.68, c2y = y0 + Math.sin(d2) * L * 0.68 + L * droop * 0.25;
    const ex = x0 + Math.cos(d3) * L * 0.95, ey = y0 + Math.sin(d3) * L * 0.95 + L * droop * (0.4 + r() * 0.4);
    st += `M${pt(x0, y0)} C${pt(c1x, c1y)} ${pt(c2x, c2y)} ${pt(ex, ey)} `;
    // the anther: a small yellow body across the filament's tip
    const tx = ex - c2x, ty = ey - c2y, tl = Math.hypot(tx, ty) || 1, an = 0.22 * Math.max(0.6, k);
    tips += `M${pt(ex - (ty / tl) * an, ey + (tx / tl) * an)} L${pt(ex + (ty / tl) * an, ey - (tx / tl) * an)} `;
  }
  const tuftD = "";
  return { calyx, tube, lobes, teeth, veins, column, stamens: st, tips, mouth, tuftD };
}

// The filaments' colour: palest pink at the base (white in life, but a white line is lost on white paper), crimson
// along them (photographs of C. calothyrsus), as a gradient centred on the flower's mouth, in the flower's own units.
export const stamenPaint = (id, [mx, my], len) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(mx)}" cy="${f(my)}" r="${f(len)}"><stop offset="0" stop-color="#f1cfd5"/><stop offset="0.14" stop-color="#eeb0bd"/><stop offset="0.32" stop-color="#d9405e"/><stop offset="1" stop-color="#c2233f"/></radialGradient>`;

// A club-shaped bud on a short stalk, pointing along angle; mm.
export function bud(x, y, angle, len, w) {
  const a = (angle * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const S = (u, v) => pt(x + u * ux + v * nx, y + u * uy + v * ny);
  return `M${S(0, -0.18 * w)} C${S(0.3 * len, -0.2 * w)} ${S(0.45 * len, -0.5 * w)} ${S(0.72 * len, -0.52 * w)} C${S(1.02 * len, -0.5 * w)} ${S(1.06 * len, 0.5 * w)} ${S(0.72 * len, 0.52 * w)} C${S(0.45 * len, 0.5 * w)} ${S(0.3 * len, 0.2 * w)} ${S(0, 0.18 * w)} Z`;
}

// The whole raceme in mm (photographs of C. calothyrsus): a slender spike of small club-shaped buds on the axis, the
// open flowers round its foot, each a pale corolla from which some thirty filaments, white at the base and crimson
// along their length, spray up and out round the axis, tipped with yellow anthers; behind, a bipinnate leaf: a
// rachis with pairs of pinnae, each a feather of small oblong leaflets. Origin where the open flowers meet the axis.
export function raceme({ seed = 7, flowers = 12, leaf = true, len = 46, rows = 22, leafAngle = 200, id = "km" } = {}) {
  const r = rng(seed);
  let budPaint = "", budInk = "", calyx = "", tube = "", lobes = "", stam = "", tips = "", leaves = "", leafInk = "", defs = "";
  const stem = "M0 40 C0.4 24 -0.3 8 0 -2 C0.2 -18 0 -34 0.2 -50";
  // buds: a slender spike, rows of four or five round the axis, smaller towards the tip
  const B = [];
  for (let k = 0; k < rows; k++) {
    const t = k / (rows - 1), y = -3 - t * 46, R = 3.4 * (1 - t) ** 0.8 + 0.6;
    const n = t < 0.7 ? 5 : 4;
    for (let j = 0; j < n; j++) {
      const phi = (j / n) * Math.PI * 2 + k * 0.7, side = Math.cos(phi), depth = Math.sin(phi);
      const len2 = 3.4 - 1.6 * t, bw = 1.7 - 0.7 * t;
      const ang = -90 + side * (55 - 25 * t) + (r() - 0.5) * 12;
      B.push({ depth, d: bud(side * R, y + depth * 0.6, ang, len2, bw), t });
    }
  }
  B.sort((p2, q) => p2.depth - q.depth);
  for (const b of B) {
    const near = b.depth > -0.25;
    budPaint += W(b.d, b.t < 0.25 ? C.corolla : C.bud, near ? 0.62 : 0.38) + W(b.d, "#7f9f45", near ? 0.2 : 0.32);
    if (near) budInk += K(b.d, "k0");
  }
  // open flowers round the foot of the spike, each turned out and up; filaments in a wide fan
  const F = [];
  for (let i = 0; i < flowers; i++) {
    const phi = (i / flowers) * Math.PI * 2 + 0.25 + (i % 2) * 0.25, side = Math.cos(phi), depth = Math.sin(phi);
    F.push({ i, side, depth, y: (i % 3) * 1.6 });
  }
  F.sort((p2, q) => p2.depth - q.depth);
  for (const { i, side, depth, y } of F) {
    const out = side >= 0 ? 0 : 180, ang = out + (side >= 0 ? -1 : 1) * (35 - 25 * Math.abs(side)) + (r() - 0.5) * 14;
    const fl = flower({ angle: ang, len: len * (0.8 + 0.25 * Math.abs(side)), n: 26, spread: 120, droop: 0.12, seed: seed * 13 + i, corolla: 0.62 });
    const ox = side * 1.4, oy = 1 + y + depth * 1.0;
    const g = (s2) => `<g transform="translate(${f(ox)} ${f(oy)})">${s2}</g>`;
    const near = depth > -0.3, gid = `${id}${seed}f${i}`;
    defs += `<g transform="translate(${f(ox)} ${f(oy)})">${stamenPaint(gid, fl.mouth, len * 0.95)}</g>`;
    calyx += g(W(fl.calyx, "#86a94f", near ? 0.6 : 0.4));
    tube += g(W(fl.tube, C.corolla, near ? 0.7 : 0.45) + W(fl.lobes, C.corolla, 0.6));
    if (near) lobes += g(K(fl.calyx, "k0") + K(fl.tube, "k0") + K(fl.lobes, "k0"));
    stam += g(`<path d="${fl.stamens}" style="stroke:url(#${gid})${near ? "" : ";stroke-opacity:.5"}"/>`);
    tips += g(`<path d="${fl.tips}"${near ? "" : ' style="stroke-opacity:.5"'}/>`);
  }
  if (leaf) {
    // a bipinnate leaf: a curving rachis with seven pairs of pinnae, each a feather of 22 pairs of small leaflets
    const L0 = [-1, 14], a0 = (leafAngle * Math.PI) / 180;
    const rach = (s2) => [L0[0] + Math.cos(a0) * s2 + Math.sin(s2 / 30) * 3, L0[1] + Math.sin(a0) * s2 + (s2 * s2) / 900];
    let rachD = `M${pt(...rach(0))}`;
    for (let s2 = 4; s2 <= 70; s2 += 4) rachD += ` L${pt(...rach(s2))}`;
    leafInk += K(rachD, "k1");
    for (let p2 = 0; p2 < 7; p2++) {
      const s2 = 12 + p2 * 8.5, [bx, by] = rach(s2), [nx, ny] = rach(s2 + 1), dir = Math.atan2(ny - by, nx - bx);
      for (const sd of [1, -1]) {
        const pa = dir + sd * 1.0, pl = 26 - p2 * 2.2;
        const ex = bx + Math.cos(pa) * pl, ey = by + Math.sin(pa) * pl + 3;
        leafInk += K(`M${pt(bx, by)} Q${pt((bx + ex) / 2 + Math.sin(pa) * 1.5, (by + ey) / 2 - Math.cos(pa) * 1.5)} ${pt(ex, ey)}`, "k0");
        for (let q = 1; q <= 22; q++) {
          const t = q / 23, lx = bx + (ex - bx) * t, ly = by + (ey - by) * t, la = Math.atan2(ey - by, ex - bx);
          const ll = 2.6 * (1 - t * 0.45);
          for (const s3 of [1, -1]) {
            const aa = la + s3 * 1.05;
            leaves += W(ell(lx + Math.cos(aa) * ll * 0.5, ly + Math.sin(aa) * ll * 0.5, ll * 0.52, 0.48, (aa * 180) / Math.PI), C.leaf, 0.55);
          }
        }
      }
    }
  }
  return { budPaint, budInk, stem, calyx, tube, lobes, stam: `<defs>${defs}</defs>${stam}`, tips, leaves, leafInk, tuft: "" };
}

// ── Honey things ───────────────────────────────────────────────────────────────────────────────────────────────────
// A glass jar, px: x0..x1 wide, rim at y0, base at y1; honey up to `level`.
export function jar(x0, x1, y0, y1, level, { lid = false } = {}) {
  const r = 34, w = x1 - x0;
  const glass = `M${pt(x0 + 18, y0 + 40)} C${pt(x0 - 4, y0 + 52)} ${pt(x0, y0 + 90)} ${pt(x0, y0 + 120)} L${pt(x0, y1 - r)} C${pt(x0, y1 - 8)} ${pt(x0 + 10, y1)} ${pt(x0 + r, y1)} L${pt(x1 - r, y1)} C${pt(x1 - 10, y1)} ${pt(x1, y1 - 8)} ${pt(x1, y1 - r)} L${pt(x1, y0 + 120)} C${pt(x1, y0 + 90)} ${pt(x1 + 4, y0 + 52)} ${pt(x1 - 18, y0 + 40)} Z`;
  const neck = `M${pt(x0 + 18, y0 + 40)} L${pt(x0 + 18, y0)} L${pt(x1 - 18, y0)} L${pt(x1 - 18, y0 + 40)}`;
  const thread = [12, 24].map((d) => `M${pt(x0 + 18, y0 + d)} Q${pt(x0 + w / 2, y0 + d + 7)} ${pt(x1 - 18, y0 + d)}`).join(" ");
  const honey = `M${pt(x0 + 7, level)} C${pt(x0 + w * 0.3, level + 10)} ${pt(x0 + w * 0.7, level + 10)} ${pt(x1 - 7, level)} L${pt(x1 - 7, y1 - r)} C${pt(x1 - 7, y1 - 12)} ${pt(x1 - 16, y1 - 7)} ${pt(x1 - r, y1 - 7)} L${pt(x0 + r, y1 - 7)} C${pt(x0 + 16, y1 - 7)} ${pt(x0 + 7, y1 - 12)} ${pt(x0 + 7, y1 - r)} Z`;
  const surface = ell(x0 + w / 2, level + 4, w / 2 - 9, 14);
  const lidD = `M${pt(x0 + 6, y0 - 62)} L${pt(x1 - 6, y0 - 62)} C${pt(x1 + 2, y0 - 62)} ${pt(x1 + 2, y0 - 50)} ${pt(x1 + 2, y0 - 40)} L${pt(x1 + 2, y0 + 30)} L${pt(x0 - 2, y0 + 30)} L${pt(x0 - 2, y0 - 40)} C${pt(x0 - 2, y0 - 50)} ${pt(x0 - 2, y0 - 62)} ${pt(x0 + 6, y0 - 62)} Z`;
  return {
    glass: W(glass, C.grey, 0.07) + W(`M${pt(x0 + 26, y0 + 130)} L${pt(x0 + 26, y1 - 60)} L${pt(x0 + 54, y1 - 70)} L${pt(x0 + 54, y0 + 136)} Z`, C.paper, 0.75) + W(`M${pt(x1 - 40, y0 + 150)} L${pt(x1 - 40, y1 - 90)} L${pt(x1 - 28, y1 - 96)} L${pt(x1 - 28, y0 + 156)} Z`, C.paper, 0.55),
    honey: W(honey, C.ochre, 0.62) + W(honey, C.sienna, 0.4) + W(`M${pt(x0 + 7, y1 - (y1 - level) * 0.45)} C${pt(x0 + w * 0.4, y1 - (y1 - level) * 0.38)} ${pt(x1 - 60, y1 - (y1 - level) * 0.5)} ${pt(x1 - 7, y1 - (y1 - level) * 0.4)} L${pt(x1 - 7, y1 - r)} L${pt(x0 + 7, y1 - r)} Z`, C.sienna, 0.28) + W(`M${pt(x0 + 40, level + 40)} L${pt(x0 + 40, y1 - 50)} L${pt(x0 + 64, y1 - 56)} L${pt(x0 + 64, level + 44)} Z`, "#fff2d4", 0.7) + W(ell(x0 + w * 0.6, level + (y1 - level) * 0.4, w * 0.22, (y1 - level) * 0.2, -8), "#f3c76f", 0.18),
    surface: W(surface, C.sienna, 0.4),
    ink: K(glass, "k2") + K(neck, "k2") + K(thread, "k1") + K(`M${pt(x0 + 7, level)} C${pt(x0 + w * 0.3, level + 10)} ${pt(x0 + w * 0.7, level + 10)} ${pt(x1 - 7, level)}`, "k1"),
    lid: W(lidD, C.sienna, 0.35) + W(lidD, C.umber, 0.2) + W(`M${pt(x0 + 20, y0 - 50)} L${pt(x1 - 20, y0 - 50)} L${pt(x1 - 20, y0 - 38)} L${pt(x0 + 20, y0 - 38)} Z`, C.paper, 0.5),
    lidInk: K(lidD, "k2") + Array.from({ length: 14 }, (_, i) => K(`M${pt(x0 + 20 + (i * (w - 40)) / 13, y0 - 30)} l0 50`, "k0")).join(""),
  };
}

// A spoon: its handle from (hx, hy) to the bowl at (bx, by); px.
export function spoon(hx, hy, bx, by, rx = 112, ry = 56) {
  const a = Math.atan2(by - hy, bx - hx), deg = (a * 180) / Math.PI;
  const nx = -Math.sin(a), ny = Math.cos(a);
  const nk = [bx - Math.cos(a) * rx * 0.92, by - Math.sin(a) * rx * 0.92];
  const handle = `M${pt(hx + nx * 15, hy + ny * 15)} C${pt(hx + nx * 17 + Math.cos(a) * 60, hy + ny * 17 + Math.sin(a) * 60)} ${pt(nk[0] + nx * 8 - Math.cos(a) * 80, nk[1] + ny * 8 - Math.sin(a) * 80)} ${pt(nk[0] + nx * 6, nk[1] + ny * 6)} L${pt(nk[0] - nx * 6, nk[1] - ny * 6)} C${pt(nk[0] - nx * 8 - Math.cos(a) * 80, nk[1] - ny * 8 - Math.sin(a) * 80)} ${pt(hx - nx * 17 + Math.cos(a) * 60, hy - ny * 17 + Math.sin(a) * 60)} ${pt(hx - nx * 15, hy - ny * 15)} C${pt(hx - nx * 15 - Math.cos(a) * 12, hy - ny * 15 - Math.sin(a) * 12)} ${pt(hx + nx * 15 - Math.cos(a) * 12, hy + ny * 15 - Math.sin(a) * 12)} ${pt(hx + nx * 15, hy + ny * 15)} Z`;
  const bowl = ell(bx, by, rx, ry, deg);
  const honeyIn = ell(bx + Math.cos(a) * 14, by + Math.sin(a) * 14 + 6, rx * 0.8, ry * 0.62, deg);
  return {
    paint: W(handle, C.grey, 0.28) + W(bowl, C.grey, 0.24) + W(honeyIn, C.sienna, 0.6) + W(ell(bx - Math.cos(a) * 30, by - Math.sin(a) * 30 - 18, rx * 0.35, ry * 0.18, deg), C.paper, 0.6) + W(`M${pt(hx + nx * 4, hy + ny * 4)} L${pt(nk[0] + nx * 2, nk[1] + ny * 2)}`, C.paper, 0.5, ' stroke="#fff" stroke-width="5" stroke-opacity=".5"'),
    ink: K(handle, "k2") + K(bowl, "k2") + K(`M${pt(bx - Math.cos(a) * rx * 0.75 + nx * 2, by - Math.sin(a) * rx * 0.75 + ny * 2 - 6)} C${pt(bx, by + ry * 0.55)} ${pt(bx + Math.cos(a) * rx * 0.6, by + Math.sin(a) * rx * 0.6 + 4)} ${pt(bx + Math.cos(a) * rx * 0.96, by + Math.sin(a) * rx * 0.96)}`, "k1"),
  };
}

// ── Comb ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export const cellAt = (x0, y0, r, col, row) => [x0 + col * Math.sqrt(3) * r + (row % 2 ? (Math.sqrt(3) * r) / 2 : 0), y0 + row * 1.5 * r];

// ── Sugar ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// Sucrose, px: the glucose ring (a hexagon, its ring oxygen at the upper right), the bridging oxygen, the fructose
// ring (a pentagon, its ring oxygen at the top). k scales it; returns the ring paths and where each O sits.
export function sucrose(x, y, k = 1) {
  const g = ngon(x - 175 * k, y, 120 * k, 6, -30), fr = ngon(x + 168 * k, y, 104 * k, 5, -90);
  // glucose: its anomeric carbon is the vertex at angle 30 (lower right): bridge from there to fructose's left vertex
  const gC1 = g[1], fC2 = fr[4];
  const bridgeO = [(gC1[0] + fC2[0]) / 2, (gC1[1] + fC2[1]) / 2 + 26 * k];
  return {
    glucose: poly(g), fructose: poly(fr), gO: g[0], fO: fr[0],
    bond: `M${pt(gC1[0], gC1[1])} L${pt(bridgeO[0] - 20 * k, bridgeO[1] - 4 * k)} M${pt(bridgeO[0] + 20 * k, bridgeO[1] - 4 * k)} L${pt(fC2[0], fC2[1])}`,
    bridgeO, gC1, fC2,
  };
}

// A comb seen face on: hexagonal cells (pointy-topped) with wax walls and the three rhombi of each cell's base;
// fill(col, row) -> null | { nectar: 0..1, honey: 0..1, cap: true } paints a cell's contents. px.
// A piece of comb, face on, painted cell by cell: each cell's wall in its own tone of wax (new comb pale, older comb
// darker), the thickened rim (the coping) catching light, the shadow down its upper walls. `outline` (cx, cy) =>
// true keeps a cell: an irregular outline makes it a fragment of comb with paper round it, its edge cells left
// shallow and unfinished, as bees leave a growing edge.
export function combFace(x0, y0, cols, rows, r, { seed = 3, outline = null } = {}) {
  const R = rng(seed);
  const keep = (col, row) => col >= 0 && row >= 0 && col < cols && row < rows && (!outline || outline(...cellAt(x0, y0, r, col, row)));
  const TONES = ["#e8d3a2", "#e3c88e", "#eddcaf", "#dcbd7e", "#e6cf98"];
  let wax = "", inner = "", ink = "", edge = "";
  const kept = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    if (!keep(col, row)) continue;
    kept.push([col, row]);
    const [cx0, cy0] = cellAt(x0, y0, r, col, row);
    const cx = cx0 + (R() - 0.5) * r * 0.03, cy = cy0 + (R() - 0.5) * r * 0.03, rr = r * (0.985 + R() * 0.03);
    const odd = row % 2;
    const nb = [[col - 1, row], [col + 1, row], [col - 1 + odd, row - 1], [col + odd, row - 1], [col - 1 + odd, row + 1], [col + odd, row + 1]];
    const rim = nb.some(([c, w]) => !keep(c, w));
    const outer = hex(cx, cy, rr * 1.0), cell = hex(cx, cy, rr * 0.86), coping = hex(cx, cy, rr * 0.8);
    const tone = TONES[Math.floor(R() * TONES.length)];
    wax += `<path d="${outer} ${cell}" fill="${tone}" fill-opacity="${(0.66 + R() * 0.22).toFixed(2)}" fill-rule="evenodd"/>`;
    // the coping: a paler band just inside the wall, where the rim is thickened
    wax += `<path d="${cell} ${coping}" fill="#f4e7c4" fill-opacity="${(0.35 + R() * 0.25).toFixed(2)}" fill-rule="evenodd"/>`;
    const deep = rim ? 0.12 : 0.22 + R() * 0.14;
    inner += W(`M${pt(cx - rr * 0.745, cy - rr * 0.43)} L${pt(cx, cy - rr * 0.86)} L${pt(cx + rr * 0.745, cy - rr * 0.43)} L${pt(cx + rr * 0.745, cy - rr * 0.12)} L${pt(cx + rr * 0.5, cy - rr * 0.26)} L${pt(cx, cy - rr * 0.55)} L${pt(cx - rr * 0.5, cy - rr * 0.26)} L${pt(cx - rr * 0.745, cy - rr * 0.12)} Z`, R() < 0.5 ? "#b88a45" : "#a87a3c", deep) + W(hex(cx + rr * 0.04, cy + rr * 0.08, rr * 0.46), "#e9d3a0", 0.2 + R() * 0.12);
    ink += K(cell, "k0", ` style="stroke-opacity:${(0.4 + R() * 0.2).toFixed(2)}"`);
    if (R() < 0.35) ink += K(`M${pt(cx, cy)} L${pt(cx, cy + rr * 0.34)} M${pt(cx, cy)} L${pt(cx - rr * 0.29, cy - rr * 0.17)} M${pt(cx, cy)} L${pt(cx + rr * 0.29, cy - rr * 0.17)}`, "k0", ' style="stroke-opacity:.07"');
    // at the comb's edge: the outer wall, thicker and darker, with the paper beyond
    if (rim) {
      edge += W(outer, "#c99a4c", 0.22);
      ink += K(outer, "k1", ' style="stroke-opacity:.5"');
    }
  }
  return { wax, inner, ink, edge, kept };
}
// an irregular outline for a fragment: inside an ellipse whose radius wanders with the angle
export const fragment = (cx, cy, rx, ry, seed = 1, wobble = 0.1) => {
  const R = rng(seed), k = Array.from({ length: 5 }, () => [R() * wobble, R() * 6.283]);
  return (x, y) => {
    const a = Math.atan2((y - cy) / ry, (x - cx) / rx), d = Math.hypot((x - cx) / rx, (y - cy) / ry);
    return d < 1 + k.reduce((s, [m, ph], i) => s + m * Math.sin(a * (i + 2) + ph), 0);
  };
};
// The contents of one face-on cell: a thin film of nectar, honey filling it, or a wax cap.
export function cellFill(cx, cy, r, kind, amount = 1) {
  const cell = hex(cx, cy, r * 0.86);
  if (kind === "nectar") return W(hex(cx, cy + r * 0.06 * (1 - amount), r * (0.42 + 0.4 * amount)), C.ultra, 0.3 + 0.12 * amount) + W(ell(cx - r * 0.25, cy - r * 0.18, r * 0.16, r * 0.07, -20), C.paper, 0.7);
  if (kind === "honey") return W(cell, C.ochre, 0.6) + W(cell, C.sienna, 0.42) + W(ell(cx + r * 0.12, cy + r * 0.2, r * 0.55, r * 0.4), C.sienna, 0.25) + W(ell(cx - r * 0.3, cy - r * 0.32, r * 0.16, r * 0.06, -25), "#fff4d8", 0.55);
  // a wax cap: opaque, it covers the honey (drawn in a group that does not multiply)
  if (kind === "cap") return `<path d="${cell}" fill="#f5efe1"/>` + W(hex(cx, cy, r * 0.84), "#e2d5b6", 0.35) + W(hex(cx - r * 0.05, cy - r * 0.06, r * 0.62), "#fbf8f0", 0.7) + W(ell(cx + r * 0.2, cy + r * 0.26, r * 0.42, r * 0.26, -25), "#d9c9a6", 0.22);
  return "";
}

// Open cells cut through (a section): wax walls, the base, the liquid inside up to `level` (0..1 of the depth). px.
export function cellSection(x, y, w, h) {
  const t = 9;
  const walls = `M${pt(x - t / 2, y)} L${pt(x - t / 2, y + h)} Q${pt(x + w / 2, y + h + 26)} ${pt(x + w + t / 2, y + h)} L${pt(x + w + t / 2, y)}`;
  return {
    wax: W(`M${pt(x - t, y - 4)} L${pt(x, y - 4)} L${pt(x, y + h - 4)} Q${pt(x + w / 2, y + h + 18)} ${pt(x + w, y + h - 4)} L${pt(x + w, y - 4)} L${pt(x + w + t, y - 4)} L${pt(x + w + t, y + h + 6)} Q${pt(x + w / 2, y + h + 34)} ${pt(x - t, y + h + 6)} Z`, C.wax, 0.9),
    ink: K(`M${pt(x - t, y - 4)} L${pt(x - t, y + h + 6)} Q${pt(x + w / 2, y + h + 34)} ${pt(x + w + t, y + h + 6)} L${pt(x + w + t, y - 4)}`, "k2") + K(`M${pt(x, y - 4)} L${pt(x, y + h - 4)} Q${pt(x + w / 2, y + h + 18)} ${pt(x + w, y + h - 4)} L${pt(x + w, y - 4)}`, "k1"),
    liquid: (level) => {
      const top = y + h - (h - 8) * level;
      return `M${pt(x + 2, top)} Q${pt(x + w / 2, top + 7)} ${pt(x + w - 2, top)} L${pt(x + w - 2, y + h - 6)} Q${pt(x + w / 2, y + h + 14)} ${pt(x + 2, y + h - 6)} Z`;
    },
    walls,
  };
}

// The enzyme (invertase), painted as a folded protein: a lumpy rose body with a cleft, the active site, that closes
// on the bond. `open` 1 wide, 0 shut. px.
export function enzyme(x, y, r, open = 1) {
  const g = 26 * open + 4;
  const ptA = (deg, k) => { const a = (deg * Math.PI) / 180; return pt(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k); };
  const d = `M${ptA(-90 - g, 0.98)} C${ptA(-90 - g - 30, 1.12)} ${ptA(-170, 1.05)} ${ptA(-180, 0.95)} C${ptA(-200, 0.86)} ${ptA(-230, 1.08)} ${ptA(-250, 1.0)} C${ptA(-275, 0.92)} ${ptA(-300, 1.06)} ${ptA(-330, 0.98)} C${ptA(-350, 0.92)} ${ptA(-15, 1.08)} ${ptA(-40, 1.0)} C${ptA(-60, 0.95)} ${ptA(-90 + g + 20, 1.1)} ${ptA(-90 + g, 0.98)} C${ptA(-90 + g * 0.4, 0.62)} ${ptA(-90 - g * 0.4, 0.62)} ${ptA(-90 - g, 0.98)} Z`;
  return { d, paint: W(d, C.rose, 0.55) + W(ell(x + r * 0.2, y + r * 0.3, r * 0.6, r * 0.45), C.rose, 0.25) + W(ell(x - r * 0.35, y - r * 0.2, r * 0.25, r * 0.15, -30), C.paper, 0.45), ink: K(d, "k1") };
}

// Honey falling from the spoon's tip and folding over itself on the surface: a thick thread that thins as it falls,
// and a coil laid down in turns. phase 0..1 is one fold. px.
export function ribbon(x0, y0, x1, y1, phase) {
  // the thread: from the tip it swings very slightly with the fold
  const sway = Math.sin(phase * 6.283) * 6;
  const thread = (w0, w1) => {
    const mx = (x0 + x1) / 2 + sway * 0.5, my = (y0 + y1) / 2;
    return `M${pt(x0 - w0, y0)} Q${pt(mx - (w0 + w1) / 2, my)} ${pt(x1 + sway - w1, y1)} L${pt(x1 + sway + w1, y1)} Q${pt(mx + (w0 + w1) / 2, my)} ${pt(x0 + w0, y0)} Z`;
  };
  // the coil: three turns of a rope lying on the surface, the newest on top, one being laid now
  let coil = "";
  for (let k = 0; k < 3; k++) {
    const p = (phase + k) / 3, rx = 34 + 18 * p, ry = 11 + 4 * p, cy = y1 + 6 + 5 * (1 - p);
    const a0 = (phase + k) * Math.PI * 2;
    const a1 = a0 + Math.PI * 1.6;
    const P2 = (a) => pt(x1 + sway + Math.cos(a) * rx, cy + Math.sin(a) * ry);
    coil += `M${P2(a0)} A${f(rx)} ${f(ry)} 0 1 1 ${P2(a1)} `;
  }
  return { thread: thread(13, 6), coil };
}
