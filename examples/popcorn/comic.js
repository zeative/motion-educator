// The Comic template's drawing kit for this film: every object is drawn in SVG in the real frame's coordinates
// (1080 x 1920), as a print would be made: a colour plate (flat red, yellow, blue and halftone dots, nothing else)
// laid down a hair off register (MIS), and the black ink plate over it, heavier on the outside of shapes.
// No gradients anywhere: every mid-tone is a field of dots whose size is computed, as a printer's screen is.
//
// The things drawn are the real ones, from the storyboard's model notes: a popcorn kernel (broad rounded crown, the
// pointed tip cap where it sat on the cob, the germ's teardrop on its face), its section (hull, hard glassy starch,
// soft white starch with the water in it, the germ), a popped flake (white foam lobes, hull bits at its base), a
// wajan on a gas ring, a panci presto (pot, locked lid with the long handle over the pot's, the weight valve), a
// thermometer and a pressure gauge whose readings are computed from the fact sheet.
export const C = { paper: "#fffdf6", ink: "#1c1c1e", red: "#ff3b30", yellow: "#ffcc00", blue: "#007aff", white: "#ffffff" };
export const MIS = [7, 5]; // the colour plate sits this far off the ink plate, like a cheap print
const f = (v) => (Math.round(v * 10) / 10).toString();
let uid = 0;
export const nid = (p = "c") => `${p}${++uid}`;
export const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ── Text measuring (the template's faces are loaded before the film is built) ─────────────────────────────────────
const mctx = document.createElement("canvas").getContext("2d");
export const measure = (text, size, face = "Kalam", weight = 700) => {
  mctx.font = `${weight} ${size}px "${face}"`;
  return mctx.measureText(text).width;
};

// ── Halftone: a printer's screen of dots, each one's size computed ─────────────────────────────────────────────
// The dots sit on a grid turned by `angle`; their radius runs from r0 to r1 along from -> to (or by ramp(x, y) in
// 0..1). Dots smaller than `min` are not printed, as on press. dots() returns the screen; dotPath() prints it,
// keeping only the dots that lie wholly inside every `in` shape and outside every `out` shape. Shading is cut to
// its shape here, on the CPU, never by an SVG clip or mask: the software rasteriser the films are rendered on leaves
// stray hairlines where clipped content meets its tiles.
export const dots = (x0, y0, x1, y1, opts = {}) => ({ x0, y0, x1, y1, opts });
const RING = Array.from({ length: 12 }, (_, i) => [Math.cos((i * Math.PI) / 6), Math.sin((i * Math.PI) / 6)]);
const dot = (x, y, r) => `M${RING.map(([c, s]) => `${f(x + c * r)} ${f(y + s * r)}`).join("L")}Z`;
const hit = document.createElement("canvas").getContext("2d");
const paths2d = new Map();
const P2 = (d) => paths2d.get(d) ?? (paths2d.set(d, new Path2D(d)), paths2d.get(d));
export function dotPath(spec, tests = []) {
  const { x0, y0, x1, y1, opts } = spec;
  const { step = 18, r0 = 0, r1 = 4.5, from, to, angle = 45, min = 0.8, ramp } = opts;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, half = Math.hypot(x1 - x0, y1 - y0) / 2 + step;
  const a = (angle * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  const F = from ?? [x0, y0], T = to ?? [x1, y1];
  const vx = T[0] - F[0], vy = T[1] - F[1], vv = vx * vx + vy * vy || 1;
  const ts = tests.map((t) => ({ ...t, p: P2(t.d), dx: t.dx ?? 0, dy: t.dy ?? 0 }));
  const inside = (t, x, y) => hit.isPointInPath(t.p, x - t.dx, y - t.dy, t.rule ?? "nonzero");
  let d = "";
  for (let u = -half; u <= half; u += step) {
    for (let v = -half; v <= half; v += step) {
      const x = cx + u * ca - v * sa, y = cy + u * sa + v * ca;
      if (x < x0 - step || x > x1 + step || y < y0 - step || y > y1 + step) continue;
      let k = ramp ? ramp(x, y) : ((x - F[0]) * vx + (y - F[1]) * vy) / vv;
      k = Math.max(0, Math.min(1, k));
      const r = r0 + (r1 - r0) * k;
      if (r < min) continue;
      let ok = true;
      for (const t of ts) {
        if (t.out) { if (inside(t, x, y)) { ok = false; break; } continue; }
        if (!inside(t, x, y) || !inside(t, x - r, y) || !inside(t, x + r, y) || !inside(t, x, y - r) || !inside(t, x, y + r)) { ok = false; break; }
      }
      if (ok) d += dot(x, y, r);
    }
  }
  return d;
}
// Dots printed inside a shape; `cut` [dx, dy] leaves out what the shape shifted by that much covers: a hard-edged
// crescent, the cel shadow.
export function shade(shapeD, spec, colour, { cut, rule } = {}) {
  const tests = [{ d: shapeD, rule }];
  if (cut) tests.push({ d: shapeD, dx: cut[0], dy: cut[1], out: true, rule });
  const d = dotPath(spec, tests);
  return d ? `<path d="${d}" fill="${colour}"/>` : "";
}
const fill = (d, colour, extra = "") => `<path d="${d}" fill="${colour}" ${extra}/>`;
export const ink = (d, w = 8, colour = C.ink, extra = "") => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
// One printed object: its colour plate a hair off register, its ink plate on top, then anything printed white.
export const obj = (col = "", inkPlate = "", top = "", cls = "") => `<g${cls ? ` class="${cls}"` : ""}><g class="col" transform="translate(${MIS[0]} ${MIS[1]})">${col}</g><g class="ink">${inkPlate}</g>${top}</g>`;
const bbox = (cx, cy, s) => [cx - s, cy - s, cx + s, cy + s];

// ── Lettering ────────────────────────────────────────────────────────────────────────────────────────────────────
// A sound word: Bangers in red with an ink edge, and the blue plate printed off register behind it.
export function soundWord(text, x, y, size, { colour = C.red, rot = -5, edge = 0.075, shadow = C.blue, anchor = "middle", skew = -6 } = {}) {
  const sw = size * edge;
  const t = (dx, dy, fl, st) => `<text x="${f(x + dx)}" y="${f(y + dy)}" font-size="${size}" text-anchor="${anchor}" class="bang" fill="${fl}" stroke="${st}" stroke-width="${f(sw)}" paint-order="stroke" stroke-linejoin="round">${text}</text>`;
  return `<g transform="rotate(${rot} ${f(x)} ${f(y)}) translate(${f(x)} ${f(y)}) skewX(${skew}) translate(${f(-x)} ${f(-y)})">${shadow ? t(size * 0.05, size * 0.045, shadow, shadow) : ""}${t(0, 0, colour, C.ink)}</g>`;
}
// "≈", which the template's faces do not carry: two ink waves.
export function approx(x, y, w, colour = C.red) {
  const h = w * 0.18, wave = (yy) => `M${f(x)} ${f(yy)} q${f(w / 4)} ${f(-h)} ${f(w / 2)} 0 t${f(w / 2)} 0`;
  return ink(`${wave(y - w * 0.16)}${wave(y + w * 0.16)}`, w * 0.2, C.ink) + ink(`${wave(y - w * 0.16)}${wave(y + w * 0.16)}`, w * 0.1, colour);
}
// Plain lettering (Kalam, as the template's captions and labels), centred on (x, y).
export const letter = (text, x, y, size, { colour = C.ink, anchor = "middle", face = "kal", extra = "" } = {}) =>
  `<text x="${f(x)}" y="${f(y + size * 0.34)}" font-size="${size}" text-anchor="${anchor}" class="${face}" fill="${colour}" ${extra}>${text}</text>`;
// A callout: a small box with a pointer to what it names (the pointer ends in a dot on the thing).
export function callout(text, x, y, tx, ty, { size = 42, colour = C.ink, bg = C.white, face = "Kalam", dot = true } = {}) {
  const w = measure(text, size, face, face === "Bangers" ? 400 : 700) + size * 0.9, h = size * 1.42;
  const x0 = x - w / 2, y0 = y - h / 2;
  let pointer = "";
  if (tx != null) {
    // from the box's edge toward the target
    const dx = tx - x, dy = ty - y, k = Math.min(Math.abs((w / 2) / (dx || 1e-6)), Math.abs((h / 2) / (dy || 1e-6)));
    const sx = x + dx * k, sy = y + dy * k;
    pointer = ink(`M${f(sx)} ${f(sy)}L${f(tx)} ${f(ty)}`, 6) + (dot ? `<circle cx="${f(tx)}" cy="${f(ty)}" r="8" fill="${C.ink}"/>` : "");
  }
  const box = `<path d="M${f(x0)} ${f(y0)}h${f(w)}v${f(h)}h${f(-w)}Z" fill="${bg}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/>`;
  const label = face === "Bangers"
    ? `<text x="${f(x)}" y="${f(y + size * 0.36)}" font-size="${size}" text-anchor="middle" class="bang" fill="${colour}">${text}</text>`
    : letter(text, x, y, size, { colour });
  return `<g class="callout">${pointer}${box}${label}</g>`;
}

// ── Panels ───────────────────────────────────────────────────────────────────────────────────────────────────────
// A panel: the paper of the page inside a thick ink border, with a halftone tint run across it (heavier toward the
// lower right, where a comic's mid-tone sits). Returned as markup; livePanel() in film.js animates its rectangle.
export function tintDots(x0, y0, x1, y1, colour, { step = 18, r = 3.3, r1 } = {}) {
  // a full-panel screen of even dots, as the template's concept page prints its panels
  return dotPath(dots(x0, y0, x1, y1, { step, r0: r, r1: r, min: 0, angle: 45 }));
}

// ── The popcorn kernel ───────────────────────────────────────────────────────────────────────────────────────────
// From the front, as photographs of popcorn kernels show it: a rounded pearly crown with a slight dent, the body
// narrowing to the dark tip cap where it sat on the cob, the pale wrinkled germ on its face.
const KP = (cx, cy, s) => (a, b) => `${f(cx + a * s)} ${f(cy + b * s)}`;
export function kernelPath(cx, cy, s) {
  const p = KP(cx, cy, s);
  // (it tapers straight to a point: no neck, which would read as a light bulb)
  return `M${p(0, -0.5)}C${p(0.3, -0.52)} ${p(0.42, -0.36)} ${p(0.41, -0.14)}C${p(0.4, 0.1)} ${p(0.2, 0.33)} ${p(0.045, 0.49)}Q${p(0, 0.52)} ${p(-0.045, 0.49)}C${p(-0.2, 0.33)} ${p(-0.4, 0.1)} ${p(-0.41, -0.14)}C${p(-0.42, -0.36)} ${p(-0.3, -0.52)} ${p(0, -0.5)}Z`;
}
// the tip cap: a small dark point where the kernel sat on the cob
const tipPath = (cx, cy, s) => { const p = KP(cx, cy, s); return `M${p(-0.1, 0.415)}Q${p(0, 0.445)} ${p(0.1, 0.415)}L${p(0.045, 0.49)}Q${p(0, 0.52)} ${p(-0.045, 0.49)}Z`; };
const germPath = (cx, cy, s) => { const p = KP(cx, cy, s); return `M${p(0.0, 0.35)}C${p(-0.17, 0.27)} ${p(-0.17, -0.02)} ${p(-0.03, -0.13)}C${p(0.13, -0.03)} ${p(0.16, 0.25)} ${p(0.0, 0.35)}Z`; };
const germWrinkles = (cx, cy, s) => { const p = KP(cx, cy, s); return `M${p(-0.08, 0.02)}q${f(0.03 * s)} ${f(0.04 * s)} ${f(0.0)} ${f(0.09 * s)}t${f(0.01 * s)} ${f(0.08 * s)}M${p(0.05, 0.0)}q${f(-0.03 * s)} ${f(0.05 * s)} ${f(0.01 * s)} ${f(0.1 * s)}M${p(-0.02, 0.2)}q${f(0.03 * s)} ${f(0.03 * s)} ${f(0.0)} ${f(0.07 * s)}`; };
// A crack: a jagged split down the crown, drawn as an ink line with a sliver of white beside it.
export function crackPath(cx, cy, s, which = 0) {
  const P = [
    [[-0.04, -0.5], [0.04, -0.41], [-0.04, -0.32], [0.05, -0.22], [-0.02, -0.12], [0.06, -0.02], [0.02, 0.06]],
    [[0.04, -0.41], [0.15, -0.37], [0.22, -0.27], [0.33, -0.24]],
    [[-0.04, -0.32], [-0.16, -0.28], [-0.24, -0.17], [-0.34, -0.15]],
  ][which];
  return `M${P.map(([a, b]) => `${f(cx + a * s)} ${f(cy + b * s)}`).join("L")}`;
}
// Strain: short curved shake marks hugging the hull's sides (a comic's "it trembles"), never rays.
export function shake(cx, cy, s, w = 6) {
  const p = KP(cx, cy, s);
  const side = (k) => `M${p(0.5 * k, -0.28)}Q${p(0.57 * k, -0.08)} ${p(0.5 * k, 0.14)}M${p(0.6 * k, -0.22)}Q${p(0.66 * k, -0.06)} ${p(0.6 * k, 0.1)}`;
  return obj("", ink(side(-1) + side(1), w));
}
// The whole kernel. opts: crack (0 none, 1 the first split, 2 split and branches), strain (shake marks), rot.
export function kernel(cx, cy, s, { crack = 0, strain = false, rot = 0, outline } = {}) {
  const p = KP(cx, cy, s), k = kernelPath(cx, cy, s), w = outline ?? Math.max(5, s * 0.042), wi = Math.max(2.5, w * 0.42);
  const step = Math.max(5, Math.min(11, s * 0.042));
  let col = fill(k, C.yellow) + shade(k, dots(...bbox(cx, cy, s * 0.6), { step, r0: step * 0.34, r1: step * 0.34, angle: 15, min: 0 }), C.red, { cut: [-0.17 * s, -0.08 * s] });
  col += fill(germPath(cx, cy, s), C.paper) + shade(germPath(cx, cy, s), dots(...bbox(cx, cy + 0.12 * s, s * 0.3), { step: step * 0.8, r0: step * 0.16, r1: step * 0.16, angle: 30, min: 0 }), C.yellow);
  col += fill(tipPath(cx, cy, s), C.ink);
  let inkPlate = ink(germPath(cx, cy, s), wi) + ink(germWrinkles(cx, cy, s), wi * 0.8) + ink(`M${p(-0.11, -0.44)}Q${p(0, -0.4)} ${p(0.11, -0.44)}`, wi) + ink(k, w);
  if (crack >= 1) inkPlate += ink(crackPath(cx, cy, s, 0), w * 0.75) + ink(crackPath(cx + s * 0.018, cy, s, 0), w * 0.2, C.white);
  if (crack >= 2) inkPlate += ink(crackPath(cx, cy, s, 1), w * 0.55) + ink(crackPath(cx, cy, s, 2), w * 0.55);
  // pearly sheen: a white crescent on the crown and a glint; the tip cap's own small shine
  const top = `<path d="M${p(-0.31, -0.18)}Q${p(-0.3, -0.42)} ${p(-0.08, -0.45)}Q${p(-0.25, -0.36)} ${p(-0.31, -0.18)}Z" fill="${C.white}"/><circle cx="${f(cx - 0.17 * s)}" cy="${f(cy - 0.12 * s)}" r="${f(Math.max(2, s * 0.022))}" fill="${C.white}"/>` + ink(`M${p(-0.04, 0.47)}l${f(0.05 * s)} ${f(-0.03 * s)}`, Math.max(1.5, wi * 0.7), C.white);
  const body = obj(col, inkPlate, top) + (strain ? shake(cx, cy, s, Math.max(4, w * 0.6)) : "");
  return rot ? `<g transform="rotate(${rot} ${f(cx)} ${f(cy)})">${body}</g>` : body;
}
// The hull torn open: two flaps of the crown peeling back from the split (open 0 to 1), the base still whole with
// the germ and the tip cap. Returns { flaps, base }: what swells out of it is drawn between the two.
export function openKernel(cx, cy, s, { open = 1, w } = {}) {
  const p = KP(cx, cy, s);
  w ??= Math.max(5, s * 0.042);
  const left = `M${p(0, -0.5)}C${p(-0.3, -0.52)} ${p(-0.42, -0.36)} ${p(-0.41, -0.14)}C${p(-0.405, -0.02)} ${p(-0.38, 0.05)} ${p(-0.36, 0.1)}L${p(-0.22, 0.07)}L${p(-0.13, 0.12)}L${p(-0.07, 0.0)}L${p(0.02, -0.08)}L${p(-0.05, -0.2)}L${p(0.03, -0.31)}L${p(-0.04, -0.41)}Z`;
  const flapDots = dots(cx - 0.6 * s, cy - 0.6 * s, cx + 0.6 * s, cy + 0.3 * s, { step: Math.max(5, s * 0.03), r0: Math.max(1.6, s * 0.011), r1: Math.max(1.6, s * 0.011), min: 0, angle: 15 });
  const flap = (k) => {
    const pivot = p(-0.36 * k, 0.1), ang = -k * open * 78;
    const g = obj(fill(left, C.yellow) + shade(left, flapDots, C.red), ink(left, w) + ink(`M${p(-0.3, -0.2)}Q${p(-0.22, -0.38)} ${p(-0.06, -0.42)}`, w * 0.35));
    return `<g transform="rotate(${f(ang)} ${pivot.replace(" ", " ")})${k < 0 ? ` translate(${f(2 * cx)} 0) scale(-1 1)` : ""}">${g}</g>`;
  };
  const base = `M${p(-0.36, 0.1)}C${p(-0.3, 0.27)} ${p(-0.17, 0.36)} ${p(-0.045, 0.49)}Q${p(0, 0.52)} ${p(0.045, 0.49)}C${p(0.17, 0.36)} ${p(0.3, 0.27)} ${p(0.36, 0.1)}L${p(0.22, 0.07)}L${p(0.13, 0.12)}L${p(0.02, 0.04)}L${p(-0.13, 0.12)}L${p(-0.22, 0.07)}Z`;
  const baseCol = fill(base, C.yellow) + shade(base, flapDots, C.red, { cut: [-0.12 * s, -0.05 * s] }) + fill(tipPath(cx, cy, s), C.ink);
  return { flaps: flap(1) + flap(-1), base: obj(baseCol, ink(base, w)) };
}

// ── The kernel in section ────────────────────────────────────────────────────────────────────────────────────────
// Drawn about (0, 0) at size s (film.js places it with a transform). Its parts, as the Popcorn Board and the USDA
// exhibit describe them: the hull (pericarp, a hard tight skin: deep orange), the hard glassy starch under it
// (amber), the soft white starch in the middle with the water in it, the germ (pale, wrinkled) by the tip cap
// (dark). Returns parts so each can be shown, inked on or swapped: base, drops[], wisps[], arrows, cover (the hull
// printed again over the steam), softMark, hullMark, and the points the callouts point at.
export function section(s) {
  const k = kernelPath(0, 0, s), inner = kernelPath(0, -0.012 * s, s * 0.88);
  const P = (a, b) => `${f(a * s)} ${f(b * s)}`;
  const soft = `M${P(-0.26, -0.12)}C${P(-0.3, -0.36)} ${P(0.27, -0.4)} ${P(0.27, -0.12)}C${P(0.28, 0.1)} ${P(-0.24, 0.14)} ${P(-0.26, -0.12)}Z`;
  const germ = `M${P(0.0, 0.36)}C${P(-0.15, 0.3)} ${P(-0.15, 0.12)} ${P(0.0, 0.06)}C${P(0.15, 0.12)} ${P(0.15, 0.3)} ${P(0.0, 0.36)}Z`;
  const wr = `M${P(-0.05, 0.13)}q${f(0.03 * s)} ${f(0.04 * s)} 0 ${f(0.08 * s)}t${f(0.01 * s)} ${f(0.08 * s)}M${P(0.05, 0.12)}q${f(-0.03 * s)} ${f(0.05 * s)} ${f(0.01 * s)} ${f(0.1 * s)}`;
  const tip = tipPath(0, 0, s);
  const hullDots = dots(-s * 0.6, -s * 0.6, s * 0.6, s * 0.6, { step: 9, r0: 4.1, r1: 4.1, angle: 15, min: 0 });
  const glassDots = dots(-s * 0.6, -s * 0.6, s * 0.6, s * 0.6, { step: 11, r0: 1.7, r1: 1.7, angle: 15, min: 0 });
  const softDots = dots(-s * 0.3, -s * 0.42, s * 0.3, s * 0.2, { step: 17, r0: 1.6, r1: 1.6, angle: 30, min: 0 });
  const w = Math.max(6, s * 0.016);
  const ring = k + inner;
  const col = fill(k, C.yellow) + shade(k, hullDots, C.red) + fill(inner, C.yellow) + shade(inner, glassDots, C.red)
    + fill(soft, C.white) + shade(soft, softDots, C.yellow) + fill(germ, C.paper) + shade(germ, dots(-0.2 * s, 0, 0.2 * s, 0.45 * s, { step: 10, r0: 1.8, r1: 1.8, min: 0 }), C.yellow) + fill(tip, C.ink);
  const base = obj(col, ink(germ, w * 0.55) + ink(wr, w * 0.4) + ink(soft, w * 0.55) + ink(inner, w * 0.55) + ink(k, w * 1.6));
  const cover = obj(fill(ring, C.yellow, 'fill-rule="evenodd"') + shade(ring, hullDots, C.red, { rule: "evenodd" }) + fill(tip, C.ink), ink(inner, w * 0.55) + ink(k, w * 1.6));
  // the water: blue drops in the soft starch
  const dropAt = [[-0.15, -0.19], [0.0, -0.26], [0.14, -0.18], [-0.07, -0.07], [0.09, -0.06], [-0.19, -0.04]];
  const drops = dropAt.map(([a, b]) => {
    const x = a * s, y = b * s, r = 0.032 * s;
    const d = `M${f(x)} ${f(y - r * 1.7)}C${f(x + r * 0.5)} ${f(y - r * 0.6)} ${f(x + r * 1.05)} ${f(y + r * 0.1)} ${f(x + r)} ${f(y + r * 0.55)}A${f(r)} ${f(r)} 0 0 1 ${f(x - r)} ${f(y + r * 0.55)}C${f(x - r * 1.05)} ${f(y + r * 0.1)} ${f(x - r * 0.5)} ${f(y - r * 0.6)} ${f(x)} ${f(y - r * 1.7)}Z`;
    return obj(fill(d, C.blue), ink(d, Math.max(3, s * 0.008)), `<circle cx="${f(x - r * 0.35)}" cy="${f(y + r * 0.1)}" r="${f(r * 0.28)}" fill="${C.white}"/>`);
  });
  // the steam: wisps where the drops were, curling out toward the hull
  const wispAt = [[-0.16, -0.12, 0.2, 1], [0.02, -0.18, 0.22, 2], [0.15, -0.1, 0.2, 3], [-0.06, 0.02, 0.18, 4], [0.1, 0.04, 0.18, 5], [-0.2, 0.06, 0.16, 6], [0.22, 0.08, 0.16, 7], [0.0, -0.3, 0.16, 8]];
  const wisps = wispAt.map(([a, b, l, sd]) => wisp(a * s, b * s, l * s, { seed: sd, w: Math.max(5, s * 0.03), line: Math.max(2.5, s * 0.007) }));
  const arrows = [-90, -45, 0, 45, 135, 180, -135, 90].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const reach = (deg === 90 ? 0.34 : Math.abs(Math.sin(a)) > 0.9 ? 0.37 : 0.31) * s;
    return { a, ox: 0, oy: -0.08 * s, reach };
  });
  const arrowMark = ({ a, ox, oy }, r0, r1) => {
    const x0 = ox + Math.cos(a) * r0, y0 = oy + Math.sin(a) * r0, x1 = ox + Math.cos(a) * r1, y1 = oy + Math.sin(a) * r1;
    const hw = s * 0.034, nx = -Math.sin(a), ny = Math.cos(a), hx = x1 - Math.cos(a) * hw * 1.6, hy = y1 - Math.sin(a) * hw * 1.6;
    const d = `M${f(x0 + nx * hw * 0.45)} ${f(y0 + ny * hw * 0.45)}L${f(hx + nx * hw * 0.45)} ${f(hy + ny * hw * 0.45)}L${f(hx + nx * hw)} ${f(hy + ny * hw)}L${f(x1)} ${f(y1)}L${f(hx - nx * hw)} ${f(hy - ny * hw)}L${f(hx - nx * hw * 0.45)} ${f(hy - ny * hw * 0.45)}L${f(x0 - nx * hw * 0.45)} ${f(y0 - ny * hw * 0.45)}Z`;
    return obj(fill(d, C.red), ink(d, Math.max(3, s * 0.008)));
  };
  // the hull's tight layers, seen when the camera goes close: fine lines running along the band
  const layers = [0.925, 0.95, 0.975].map((k2) => ink(kernelPath(0, -0.006 * s, s * k2), Math.max(1.5, s * 0.0035), C.ink, 'opacity="0.55"')).join("");
  return {
    base, cover, drops, wisps, arrows, arrowMark, layers,
    dropXY: dropAt.map(([a, b]) => [a * s, b * s]), wispXY: wispAt.map(([a, b]) => [a * s, b * s]),
    softD: soft, hullD: k,
    softMark: ink(soft, Math.max(7, s * 0.02), C.red, 'class="mark"'),
    hullMark: ink(k, Math.max(14, s * 0.034), C.red, 'class="mark"'),
    at: { hull: [0.39 * s, -0.12 * s], glass: [-0.33 * s, -0.04 * s], soft: [-0.18 * s, -0.12 * s], drop: [0.14 * s, -0.18 * s], germ: [0.0 * s, 0.24 * s], tip: [0.0, 0.47 * s] },
  };
}

// ── Steam, foam, bursts and speed ────────────────────────────────────────────────────────────────────────────────
// Steam is drawn as steam: thin wispy ribbons that taper and curl (white with a blue edge), never a cloud, so it
// cannot be mistaken for the popcorn it makes. A wisp at (x, y) rising `len` (negative angle turns it).
export function wisp(x, y, len, { seed = 1, w = 14, line = 4, angle = -90, curl = 1 } = {}) {
  const R = rng(seed), ph = R() * 6.28, n = 18, a = (angle * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const L = [], Rt = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, sway = Math.sin(ph + t * 6.28 * 1.1 * curl) * len * 0.16 * t;
    const cx = x + ux * len * t + nx * sway, cy = y + uy * len * t + ny * sway, hw = (w / 2) * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.08)) * (1 - 0.6 * t);
    L.push([cx + nx * hw, cy + ny * hw]);
    Rt.push([cx - nx * hw, cy - ny * hw]);
  }
  const d = `M${L.map(([px, py]) => `${f(px)} ${f(py)}`).join("L")}L${Rt.reverse().map(([px, py]) => `${f(px)} ${f(py)}`).join("L")}Z`;
  return obj(fill(d, C.white), ink(d, line, C.blue));
}
// A jet of steam leaving a split: several wisps fanning up from (x, y).
export function steamJet(x, y, len, { seed = 1, n = 4, w = 30, line = 6, spread = 26 } = {}) {
  let out = "";
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) - 0.5 : 0;
    out += wisp(x + t * w * 1.4, y, len * (0.8 + 0.4 * ((i * 7) % 3) / 2), { seed: seed + i, w, line, angle: -90 + t * spread * 2, curl: 0.8 + 0.3 * (i % 2) });
  }
  return out;
}
// A popped flake as photographs show it: a cluster of irregular puffed lobes ("butterfly" popcorn), each with its
// crinkled skin, cream-white with yellow in its shadows, and the curled bits of hull still stuck to its base.
const LOBES = [[-0.46, -0.24, 0.42], [0.43, -0.3, 0.44], [0.0, -0.55, 0.4], [-0.56, 0.16, 0.36], [0.56, 0.12, 0.38], [-0.2, 0.26, 0.42], [0.23, 0.24, 0.44], [0.0, -0.08, 0.48]];
function lobe(x, y, rr, seed) {
  const R = rng(seed), n = 11, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n, k = 0.86 + R() * 0.22;
    pts.push([x + Math.cos(a) * rr * k, y + Math.sin(a) * rr * k]);
  }
  let d = `M${f((pts[0][0] + pts[1][0]) / 2)} ${f((pts[0][1] + pts[1][1]) / 2)}`;
  for (let i = 1; i <= n; i++) {
    const a = pts[i % n], b = pts[(i + 1) % n];
    d += `Q${f(a[0])} ${f(a[1])} ${f((a[0] + b[0]) / 2)} ${f((a[1] + b[1]) / 2)}`;
  }
  return d + "Z";
}
export function flake(cx, cy, r, { seed = 7, curls = true, cells = 0, w, grow = 1, folds = true } = {}) {
  w ??= Math.max(4, r * 0.04);
  const R = rng(seed + 50);
  let out = "";
  LOBES.forEach(([dx, dy, k], i) => {
    const x = cx + dx * r * grow, y = cy + dy * r * grow, rr = k * r * grow * (0.9 + R() * 0.2);
    const d = lobe(x, y, rr, seed * 13 + i);
    const sh = shade(d, dots(x - rr * 1.2, y - rr * 1.2, x + rr * 1.2, y + rr * 1.2, { step: Math.max(5, rr * 0.13), r0: Math.max(1.2, rr * 0.03), r1: Math.max(1.2, rr * 0.03), min: 0, angle: 30 }), C.yellow, { cut: [-rr * 0.32, -rr * 0.3] });
    // the crinkled skin: one small irregular fold on each lobe, never a pair (pairs read as eyes)
    const a = R() * 6.28, fx = x + Math.cos(a) * rr * 0.45, fy = y + Math.sin(a) * rr * 0.45, l = rr * 0.32, b = a + 1.6 + R();
    const fold = `M${f(fx)} ${f(fy)}q${f(Math.cos(b) * l * 0.5 + Math.cos(a) * l * 0.25)} ${f(Math.sin(b) * l * 0.5 + Math.sin(a) * l * 0.25)} ${f(Math.cos(b) * l)} ${f(Math.sin(b) * l)}q${f(Math.cos(b) * l * 0.2)} ${f(Math.sin(b) * l * 0.2 - l * 0.1)} ${f(Math.cos(b) * l * 0.35)} ${f(Math.sin(b) * l * 0.35 + l * 0.1)}`;
    out += obj(fill(d, C.white) + sh, ink(d, w) + (folds ? ink(fold, w * 0.45) : ""));
  });
  if (cells) {
    // foam: many small cells of uneven sizes packed through it (a sponge's texture), never a few big rings, which
    // read as eyes; each cell a slightly squashed ring at its own angle
    let rings = "";
    const n = cells * 4;
    for (let i = 0; i < n; i++) {
      const a = R() * 6.28, dd = Math.sqrt(R()) * r * 0.72 * grow, rr = r * grow * (0.018 + R() * R() * 0.05);
      const x = cx + Math.cos(a) * dd, y = cy - 0.1 * r + Math.sin(a) * dd * 0.85, sq = 0.65 + R() * 0.35, rot = R() * 180;
      rings += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rr)}" ry="${f(rr * sq)}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})"/>`;
    }
    out += `<g fill="none" stroke="${C.ink}" stroke-width="${f(Math.max(1.8, w * 0.38))}">${rings}</g>`;
  }
  if (curls) {
    // two curls of hull, orange, stuck to the base
    const curl = (x, y, k, m) => {
      const d = `M${f(x)} ${f(y)}c${f(m * 0.5 * k)} ${f(0.3 * k)} ${f(m * 1.2 * k)} ${f(0.1 * k)} ${f(m * 1.3 * k)} ${f(-0.4 * k)}c${f(m * 0.05 * k)} ${f(-0.3 * k)} ${f(-m * 0.3 * k)} ${f(-0.4 * k)} ${f(-m * 0.45 * k)} ${f(-0.2 * k)}c${f(m * 0.25 * k)} ${f(0.05 * k)} ${f(m * 0.3 * k)} ${f(0.3 * k)} ${f(m * 0.05 * k)} ${f(0.4 * k)}c${f(-m * 0.3 * k)} ${f(0.1 * k)} ${f(-m * 0.6 * k)} ${f(0.0)} ${f(-m * 0.9 * k)} ${f(-0.2 * k)}Z`;
      return obj(fill(d, C.yellow) + shade(d, dots(x - k * 1.5, y - k, x + k * 1.5, y + k, { step: Math.max(4, k * 0.12), r0: Math.max(1.4, k * 0.045), r1: Math.max(1.4, k * 0.045), min: 0 }), C.red), ink(d, w * 0.8));
    };
    out += curl(cx - 0.18 * r * grow, cy + 0.62 * r * grow, r * 0.3 * grow, -1) + curl(cx + 0.14 * r * grow, cy + 0.66 * r * grow, r * 0.26 * grow, 1);
  }
  return out;
}
// The foam swelling out of the split: the flake's lobes at a smaller size, soft, full of cells.
export const foam = (cx, cy, r, { seed = 3, bubbles = 9, w, grow = 1 } = {}) => flake(cx, cy, r, { seed, curls: false, cells: bubbles, w, grow, folds: false });
// (kept for the presto's valve: a small puff from a weight is a puff)
export function cloud(cx, cy, r, { seed = 1, w = 6 } = {}) {
  return steamJet(cx, cy + r, r * 2, { seed, n: 3, w: r * 0.5, line: w * 0.7, spread: 18 });
}
// An impact burst: a star of n points, seeded so each burst is its own, yellow with an ink edge.
export function burstPath(cx, cy, r0, r1, n = 16, seed = 1, sx = 1.1) {
  const R = rng(seed), pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n + (R() - 0.5) * (Math.PI / n) * 0.5;
    const r = i % 2 ? r1 * (0.86 + R() * 0.28) : r0 * (0.9 + R() * 0.2);
    pts.push(`${f(cx + Math.cos(a) * r * sx)} ${f(cy + Math.sin(a) * r)}`);
  }
  return `M${pts.join("L")}Z`;
}
export function burst(cx, cy, r0, r1, { n = 16, seed = 1, colour = C.yellow, w = 10, inner, sx = 1.1 } = {}) {
  const d = burstPath(cx, cy, r0, r1, n, seed, sx);
  let col = fill(d, colour) + shade(d, dots(cx - r1 * 1.3, cy - r1 * 1.1, cx + r1 * 1.3, cy + r1 * 1.1, { step: 16, r0: 0, r1: 4, from: [cx, cy], to: [cx + r1 * 0.9, cy + r1 * 0.9] }), C.red);
  if (inner) col += fill(burstPath(cx, cy, r0 * inner, r1 * inner, n, seed + 5, sx), C.white);
  return obj(col, ink(d, w));
}
// Speed lines: tapered ink wedges radiating from the action.
export function speedLines(cx, cy, r0, r1, { n = 18, seed = 2, width = 16, colour = C.ink } = {}) {
  const R = rng(seed);
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n + (R() - 0.5) * 0.18, a0 = r0 * (0.9 + R() * 0.25), a1 = r1 * (0.85 + R() * 0.3);
    const wd = width * (0.6 + R() * 0.8), nx = -Math.sin(a), ny = Math.cos(a);
    const ox = cx + Math.cos(a) * a1, oy = cy + Math.sin(a) * a1;
    d += `M${f(cx + Math.cos(a) * a0)} ${f(cy + Math.sin(a) * a0)}L${f(ox + nx * wd)} ${f(oy + ny * wd)}L${f(ox - nx * wd)} ${f(oy - ny * wd)}Z`;
  }
  return `<path d="${d}" fill="${colour}"/>`;
}
// Motion lines: straight parallel strokes behind something moving (dx, dy: the direction it came from).
export const motionLines = (pts, len, w = 7) => ink(pts.map(([x, y]) => `M${f(x)} ${f(y)}l0 ${f(len)}`).join(""), w);

// ── Hands and the narrator ───────────────────────────────────────────────────────────────────────────────────────
// Skin is printed as a comic prints it: red and yellow dots on the paper (Ben-Day), no sixth colour.
export function skin(d, box, { cutShade } = {}) {
  const [x0, y0, x1, y1] = box;
  const red = dots(x0, y0, x1, y1, { step: 11, r0: 2.4, r1: 2.4, angle: 15, min: 0 });
  const yel = dots(x0 + 4, y0 + 4, x1, y1, { step: 11, r0: 2.9, r1: 2.9, angle: 75, min: 0 });
  let col = fill(d, C.paper) + shade(d, yel, C.yellow) + shade(d, red, C.red);
  if (cutShade) col += shade(d, dots(x0, y0, x1, y1, { step: 9, r0: 2.8, r1: 2.8, angle: 45, min: 0 }), C.red, { cut: cutShade });
  return col;
}
// A thumb and an index finger pinching a kernel at (x, y), coming in from the lower left; s about the kernel's size.
export function pinch(x, y, s, { mirror = false } = {}) {
  const p = (a, b) => `${f(x + a * s)} ${f(y + b * s)}`;
  // index finger: from the lower left, over the kernel's left side, its pad on the kernel
  const index = `M${p(-1.5, -0.12)}C${p(-1.1, -0.36)} ${p(-0.74, -0.38)} ${p(-0.4, -0.31)}C${p(-0.18, -0.27)} ${p(-0.1, -0.12)} ${p(-0.2, 0.0)}C${p(-0.3, 0.08)} ${p(-0.52, 0.08)} ${p(-0.74, 0.1)}C${p(-1.02, 0.14)} ${p(-1.28, 0.28)} ${p(-1.46, 0.42)}Z`;
  const nail = `M${p(-0.38, -0.28)}C${p(-0.24, -0.27)} ${p(-0.19, -0.15)} ${p(-0.25, -0.08)}C${p(-0.34, -0.08)} ${p(-0.42, -0.15)} ${p(-0.38, -0.28)}Z`;
  const knuckle = `M${p(-0.9, -0.3)}q${f(0.05 * s)} ${f(0.1 * s)} 0 ${f(0.2 * s)}M${p(-0.98, -0.26)}q${f(0.04 * s)} ${f(0.07 * s)} 0 ${f(0.13 * s)}`;
  // thumb: under the kernel's tip side, pushing up
  const thumb = `M${p(-1.3, 0.92)}C${p(-1.0, 0.56)} ${p(-0.62, 0.38)} ${p(-0.3, 0.27)}C${p(-0.1, 0.2)} ${p(0.02, 0.32)} ${p(-0.07, 0.46)}C${p(-0.2, 0.6)} ${p(-0.5, 0.7)} ${p(-0.74, 0.86)}C${p(-0.9, 0.98)} ${p(-1.0, 1.08)} ${p(-1.06, 1.2)}Z`;
  const tnail = `M${p(-0.25, 0.27)}C${p(-0.12, 0.24)} ${p(-0.05, 0.34)} ${p(-0.11, 0.42)}C${p(-0.2, 0.44)} ${p(-0.28, 0.37)} ${p(-0.25, 0.27)}Z`;
  // the back of the hand the two come out of, and the curled fingers under the index
  const palm = `M${p(-1.62, -0.1)}C${p(-1.3, -0.2)} ${p(-1.2, 0.3)} ${p(-1.05, 0.5)}C${p(-0.95, 0.62)} ${p(-1.05, 0.95)} ${p(-1.3, 1.1)}C${p(-1.6, 1.25)} ${p(-2.0, 1.1)} ${p(-2.1, 0.7)}C${p(-2.2, 0.3)} ${p(-1.95, -0.05)} ${p(-1.62, -0.1)}Z`;
  const curl = `M${p(-1.5, 0.42)}C${p(-1.2, 0.36)} ${p(-0.92, 0.4)} ${p(-0.86, 0.55)}C${p(-0.84, 0.68)} ${p(-1.05, 0.72)} ${p(-1.3, 0.7)}`;
  const box = [x - 2.3 * s, y - 0.5 * s, x + 0.2 * s, y + 1.4 * s];
  const lw = Math.max(6, s * 0.04);
  const back = obj(skin(palm + "Z", box, { cutShade: [0.1 * s, -0.16 * s] }) + skin(thumb, box, { cutShade: [-0.08 * s, -0.12 * s] }) + fill(tnail, C.white),
    ink(palm, lw) + ink(curl, lw * 0.7) + ink(thumb, lw) + ink(tnail, Math.max(3, s * 0.015)));
  const front = obj(skin(index, box, { cutShade: [0, -0.12 * s] }) + fill(nail, C.white), ink(index, lw) + ink(nail, Math.max(3, s * 0.015)) + ink(knuckle, Math.max(3, s * 0.018)));
  const m = (g) => (mirror ? `<g transform="translate(${f(2 * x)} 0) scale(-1 1)">${g}</g>` : g);
  return { back: m(back), front: m(front) };
}
// The narrator: a kid in a blue T-shirt, from the shoulders up, head at (x, y) with radius R, facing right.
// face: "squint" (one eye narrowed at the kernel) or "wow" (eyebrows up, mouth open).
export function kid(x, y, R, face = "squint") {
  const p = (a, b) => `${f(x + a * R)} ${f(y + b * R)}`;
  const head = `M${p(0.02, -1.0)}C${p(0.62, -1.0)} ${p(1.0, -0.6)} ${p(0.98, -0.05)}C${p(0.97, 0.45)} ${p(0.62, 0.92)} ${p(0.08, 0.96)}C${p(-0.45, 0.98)} ${p(-0.95, 0.6)} ${p(-0.98, 0.02)}C${p(-1.0, -0.6)} ${p(-0.55, -1.0)} ${p(0.02, -1.0)}Z`;
  const ear = `M${p(-0.86, -0.1)}C${p(-1.16, -0.2)} ${p(-1.2, 0.3)} ${p(-0.86, 0.3)}`;
  const hair = `M${p(-1.0, 0.05)}C${p(-1.1, -0.7)} ${p(-0.5, -1.18)} ${p(0.15, -1.1)}C${p(0.55, -1.12)} ${p(0.95, -0.85)} ${p(1.02, -0.32)}L${p(0.72, -0.55)}L${p(0.62, -0.3)}L${p(0.42, -0.6)}L${p(0.2, -0.36)}L${p(0.05, -0.64)}L${p(-0.2, -0.4)}L${p(-0.38, -0.62)}C${p(-0.6, -0.45)} ${p(-0.72, -0.25)} ${p(-0.74, 0.04)}Z`;
  const neck = `M${p(-0.32, 0.78)}L${p(-0.3, 1.25)}L${p(0.32, 1.25)}L${p(0.3, 0.8)}Z`;
  const shirt = `M${p(-1.85, 3.2)}L${p(-1.75, 2.3)}C${p(-1.7, 1.55)} ${p(-1.15, 1.2)} ${p(-0.4, 1.12)}Q${p(0, 1.32)} ${p(0.4, 1.12)}C${p(1.15, 1.2)} ${p(1.7, 1.55)} ${p(1.75, 2.3)}L${p(1.85, 3.2)}Z`;
  const collar = `M${p(-0.42, 1.12)}Q${p(0, 1.42)} ${p(0.42, 1.12)}`;
  const box = [x - 1.3 * R, y - 1.2 * R, x + 1.2 * R, y + 1.3 * R];
  const col = skin(head + neck + ear + "Z", box, { cutShade: [-0.22 * R, -0.12 * R] })
    + fill(shirt, C.blue) + shade(shirt, dots(x - 2 * R, y + R, x + 2 * R, y + 3.3 * R, { step: 12, r0: 0, r1: 4.6, from: [x - R, y + 1.2 * R], to: [x + 1.6 * R, y + 2.6 * R] }), C.ink)
    + fill(hair, C.ink);
  let face_ = "";
  const eyeL = [x + 0.12 * R, y - 0.08 * R], eyeR = [x + 0.6 * R, y - 0.1 * R];
  if (face === "squint") {
    // the near eye narrowed hard at the kernel, the far one open; brows pulled down and together
    face_ += ink(`M${f(eyeL[0] - 0.14 * R)} ${f(eyeL[1])}q${f(0.14 * R)} ${f(-0.06 * R)} ${f(0.28 * R)} ${f(0.02 * R)}`, R * 0.05);
    face_ += `<ellipse cx="${f(eyeR[0])}" cy="${f(eyeR[1])}" rx="${f(0.13 * R)}" ry="${f(0.17 * R)}" fill="${C.white}" stroke="${C.ink}" stroke-width="${f(R * 0.035)}"/><circle cx="${f(eyeR[0] + 0.05 * R)}" cy="${f(eyeR[1] + 0.02 * R)}" r="${f(0.075 * R)}" fill="${C.ink}"/>`;
    face_ += ink(`M${f(eyeL[0] - 0.2 * R)} ${f(eyeL[1] - 0.22 * R)}l${f(0.32 * R)} ${f(0.08 * R)}M${f(eyeR[0] - 0.14 * R)} ${f(eyeR[1] - 0.24 * R)}l${f(0.28 * R)} ${f(-0.08 * R)}`, R * 0.07);
    face_ += ink(`M${f(x + 0.18 * R)} ${f(y + 0.5 * R)}q${f(0.16 * R)} ${f(-0.06 * R)} ${f(0.3 * R)} ${f(0.04 * R)}`, R * 0.045);
  } else {
    // eyebrows shot up, both eyes wide on the kernel, mouth a small "o"
    for (const [ex, ey] of [eyeL, eyeR]) face_ += `<ellipse cx="${f(ex)}" cy="${f(ey)}" rx="${f(0.14 * R)}" ry="${f(0.2 * R)}" fill="${C.white}" stroke="${C.ink}" stroke-width="${f(R * 0.035)}"/><circle cx="${f(ex + 0.06 * R)}" cy="${f(ey - 0.02 * R)}" r="${f(0.08 * R)}" fill="${C.ink}"/>`;
    face_ += ink(`M${f(eyeL[0] - 0.16 * R)} ${f(eyeL[1] - 0.36 * R)}q${f(0.16 * R)} ${f(-0.12 * R)} ${f(0.32 * R)} ${f(-0.02 * R)}M${f(eyeR[0] - 0.14 * R)} ${f(eyeR[1] - 0.4 * R)}q${f(0.16 * R)} ${f(-0.12 * R)} ${f(0.3 * R)} 0`, R * 0.07);
    face_ += `<ellipse cx="${f(x + 0.38 * R)}" cy="${f(y + 0.52 * R)}" rx="${f(0.08 * R)}" ry="${f(0.11 * R)}" fill="${C.ink}"/>`;
  }
  // the nose, turned toward the kernel
  face_ += ink(`M${f(x + 0.4 * R)} ${f(y + 0.05 * R)}q${f(0.16 * R)} ${f(0.16 * R)} ${f(0.02 * R)} ${f(0.26 * R)}`, R * 0.04);
  const inkPlate = ink(shirt, R * 0.055) + ink(collar, R * 0.04) + ink(neck, R * 0.04) + ink(head, R * 0.055) + ink(ear, R * 0.045) + ink(hair, R * 0.03) + face_;
  const top = ink(`M${p(-0.5, -0.82)}q${f(0.2 * R)} ${f(-0.14 * R)} ${f(0.42 * R)} ${f(-0.12 * R)}`, R * 0.05, C.blue) + ink(`M${p(-1.2, 1.6)}q${f(0.25 * R)} ${f(-0.2 * R)} ${f(0.5 * R)} ${f(-0.26 * R)}`, R * 0.04, C.white);
  return obj(col, inkPlate, top);
}
// The kid's raised forearm, from the shoulder to the pinch.
export function forearm(x0, y0, x1, y1, w) {
  const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a) * w / 2, ny = Math.cos(a) * w / 2;
  const sleeveEnd = [x0 + (x1 - x0) * 0.32, y0 + (y1 - y0) * 0.32];
  const arm = `M${f(x0 + nx)} ${f(y0 + ny)}L${f(x1 + nx * 0.8)} ${f(y1 + ny * 0.8)}L${f(x1 - nx * 0.8)} ${f(y1 - ny * 0.8)}L${f(x0 - nx)} ${f(y0 - ny)}Z`;
  const sleeve = `M${f(x0 + nx * 1.35)} ${f(y0 + ny * 1.35)}L${f(sleeveEnd[0] + nx * 1.3)} ${f(sleeveEnd[1] + ny * 1.3)}L${f(sleeveEnd[0] - nx * 1.3)} ${f(sleeveEnd[1] - ny * 1.3)}L${f(x0 - nx * 1.35)} ${f(y0 - ny * 1.35)}Z`;
  const box = [Math.min(x0, x1) - w, Math.min(y0, y1) - w, Math.max(x0, x1) + w, Math.max(y0, y1) + w];
  return obj(skin(arm, box, { cutShade: [nx * 0.5, ny * 0.5] }) + fill(sleeve, C.blue) + shade(sleeve, dots(...box, { step: 12, r0: 3, r1: 3, min: 0 }), C.ink, { cut: [-nx * 0.6, -ny * 0.6] }), ink(arm, w * 0.09) + ink(sleeve, w * 0.1));
}

// ── The kitchen ──────────────────────────────────────────────────────────────────────────────────────────────────
// A wajan (a wok with a long handle) on a gas ring, seen a little from above: the rim an ellipse, oil and kernels in
// the bowl, the burner's blue flames under it, the pan supports. kernels: how many sit in the oil.
export function wajan(cx, cy, w, { kernels = 4, flames = true, flakes = 0, seed = 5, ks = 0.09 } = {}) {
  const rx = w / 2, ry = w * 0.13, depth = w * 0.24;
  const rim = `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`;
  const bowl = `M${f(cx - rx)} ${f(cy)}C${f(cx - rx * 0.92)} ${f(cy + depth * 1.05)} ${f(cx + rx * 0.92)} ${f(cy + depth * 1.05)} ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 0 1 ${f(cx - rx)} ${f(cy)}Z`;
  const inside = `M${f(cx - rx * 0.93)} ${f(cy + ry * 0.05)}A${f(rx * 0.93)} ${f(ry * 0.82)} 0 1 0 ${f(cx + rx * 0.93)} ${f(cy + ry * 0.05)}A${f(rx * 0.93)} ${f(ry * 0.82)} 0 1 0 ${f(cx - rx * 0.93)} ${f(cy + ry * 0.05)}Z`;
  const handle = `M${f(cx + rx * 0.97)} ${f(cy - ry * 0.1)}L${f(cx + rx * 1.75)} ${f(cy - ry * 0.75)}L${f(cx + rx * 1.79)} ${f(cy - ry * 0.4)}L${f(cx + rx * 1.0)} ${f(cy + ry * 0.35)}Z`;
  const grip = `M${f(cx + rx * 1.3)} ${f(cy - ry * 0.4)}L${f(cx + rx * 1.82)} ${f(cy - ry * 0.95)}L${f(cx + rx * 1.86)} ${f(cy - ry * 0.45)}L${f(cx + rx * 1.33)} ${f(cy + ry * 0.05)}Z`;
  const box = [cx - rx * 1.1, cy - ry * 1.5, cx + rx * 1.1, cy + depth * 1.2];
  // the oil: a golden layer filling the bowl, with the sheen and the small bubbles of hot oil
  const backCol = fill(inside, C.yellow) + shade(inside, dots(...box, { step: 9, r0: 2.4, r1: 2.4, min: 0, angle: 15 }), C.red, { cut: [rx * 0.25, ry * 0.5] })
    + fill(handle, C.white) + shade(handle, dots(cx + rx, cy - ry * 2, cx + rx * 1.9, cy + ry, { step: 9, r0: 3, r1: 3, min: 0 }), C.ink) + fill(grip, C.ink);
  const backInk = ink(inside, w * 0.012) + ink(handle, w * 0.014) + ink(grip, w * 0.012);
  const frontCol = fill(bowl, C.white) + shade(bowl, dots(...box, { step: 10, r0: 1.5, r1: 4.4, from: [cx - rx * 0.6, cy], to: [cx + rx, cy + depth] }), C.ink);
  const frontInk = ink(bowl, w * 0.018);
  const frontTop = ink(`M${f(cx - rx * 0.62)} ${f(cy + depth * 0.62)}q${f(rx * 0.4)} ${f(depth * 0.25)} ${f(rx * 0.9)} ${f(depth * 0.05)}`, w * 0.014, C.white);
  // the oil: a sheen across the bowl's floor
  const R0 = rng(seed + 9);
  let bubbles = "";
  for (let i = 0; i < 9; i++) {
    const bx = cx + (R0() - 0.5) * rx * 1.4, by = cy + (R0() - 0.3) * ry * 0.9, br = w * (0.006 + R0() * 0.008);
    bubbles += `M${f(bx - br)} ${f(by)}a${f(br)} ${f(br)} 0 1 0 ${f(2 * br)} 0a${f(br)} ${f(br)} 0 1 0 ${f(-2 * br)} 0`;
  }
  const backTop = ink(`M${f(cx - rx * 0.62)} ${f(cy - ry * 0.25)}q${f(rx * 0.4)} ${f(-ry * 0.3)} ${f(rx * 0.85)} ${f(-ry * 0.12)}`, w * 0.012, C.white) + ink(bubbles, Math.max(2, w * 0.004), C.white);
  let contents = "";
  const R = rng(seed), kernelXY = [];
  for (let i = 0; i < kernels; i++) {
    const kx = kernels === 1 ? cx : cx - rx * 0.5 + (i + 0.5) * (rx / Math.max(1, kernels)) * 1.0 + (R() - 0.5) * rx * 0.1, ky = cy + ry * (0.1 + 0.25 * ((i % 2) - 0.5));
    kernelXY.push([kx, ky - w * 0.025]);
    contents += kernel(kx, ky - w * 0.025, w * ks, { rot: (R() - 0.5) * 70 });
  }
  for (let i = 0; i < flakes; i++) {
    const fx = cx - rx * 0.65 + (i / Math.max(1, flakes - 1)) * rx * 1.3, fy = cy - ry * 0.25 - (i % 2) * ry * 0.6;
    contents += flake(fx, fy, w * 0.11, { seed: 20 + i });
  }
  // the burner under it: a cast ring, pan supports and blue gas flames
  let stove = "";
  if (flames) {
    const by = cy + depth + w * 0.07;
    const ring = `M${f(cx - rx * 0.42)} ${f(by)}h${f(rx * 0.84)}v${f(w * 0.045)}h${f(-rx * 0.84)}Z`;
    // the pan supports: three cast prongs from the ring up under the bowl, touching it
    const top = cy + depth * 0.9;
    const legs = `M${f(cx - rx * 0.62)} ${f(by + w * 0.045)}L${f(cx - rx * 0.62)} ${f(top - w * 0.01)}L${f(cx - rx * 0.48)} ${f(top + w * 0.012)}M${f(cx + rx * 0.62)} ${f(by + w * 0.045)}L${f(cx + rx * 0.62)} ${f(top - w * 0.01)}L${f(cx + rx * 0.48)} ${f(top + w * 0.012)}M${f(cx - rx * 0.8)} ${f(by + w * 0.045)}H${f(cx + rx * 0.8)}`;
    let fl = "";
    for (let i = 0; i < 7; i++) {
      const fx = cx - rx * 0.36 + (i * rx * 0.72) / 6, h = w * (0.07 + 0.025 * ((i * 3) % 2));
      fl += `M${f(fx - w * 0.018)} ${f(by)}C${f(fx - w * 0.02)} ${f(by - h * 0.5)} ${f(fx)} ${f(by - h * 0.8)} ${f(fx + w * 0.004)} ${f(by - h)}C${f(fx + w * 0.012)} ${f(by - h * 0.6)} ${f(fx + w * 0.02)} ${f(by - h * 0.4)} ${f(fx + w * 0.018)} ${f(by)}Z`;
    }
    stove = obj(fill(fl, C.blue) + fill(ring, C.ink), ink(fl, w * 0.008) + ink(legs, w * 0.016), "", "stove");
  }
  return { back: stove + obj(backCol, backInk, backTop), contents, front: obj(frontCol, frontInk, frontTop), kernelXY };
}
// Heat: red wavy lines rising (two drawings: phase 0 or 1).
export function heat(cx, cy, w, phase = 0, n = 3) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = cx + (i - (n - 1) / 2) * w * 0.22, s = phase ? -1 : 1, h = w * 0.12;
    d += `M${f(x)} ${f(cy)}c${f(s * w * 0.05)} ${f(-h * 0.33)} ${f(-s * w * 0.05)} ${f(-h * 0.66)} 0 ${f(-h)}c${f(s * w * 0.05)} ${f(-h * 0.33)} ${f(-s * w * 0.05)} ${f(-h * 0.66)} 0 ${f(-h)}`;
  }
  return obj("", ink(d, w * 0.03, C.ink) + ink(d, w * 0.016, C.red));
}
// A panci presto: the pot (aluminium: ink dots on paper), its lid locked under the long black handle that lies over
// the pot's own handle, the weight valve on top. Returns { body, weight } so the weight can rattle.
export function presto(cx, cy, s) {
  const p = (a, b) => `${f(cx + a * s)} ${f(cy + b * s)}`;
  const pot = `M${p(-0.5, -0.12)}L${p(-0.5, 0.46)}Q${p(-0.5, 0.56)} ${p(-0.4, 0.56)}L${p(0.4, 0.56)}Q${p(0.5, 0.56)} ${p(0.5, 0.46)}L${p(0.5, -0.12)}Z`;
  const lip = `M${p(-0.54, -0.14)}L${p(0.54, -0.14)}L${p(0.54, -0.07)}L${p(-0.54, -0.07)}Z`;
  const lid = `M${p(-0.5, -0.14)}Q${p(-0.46, -0.36)} ${p(0, -0.38)}Q${p(0.46, -0.36)} ${p(0.5, -0.14)}Z`;
  const potHandle = `M${p(0.52, -0.06)}L${p(1.08, -0.06)}Q${p(1.14, -0.06)} ${p(1.14, 0.0)}L${p(1.14, 0.02)}Q${p(1.14, 0.06)} ${p(1.08, 0.06)}L${p(0.52, 0.06)}Z`;
  const lidHandle = `M${p(0.1, -0.3)}L${p(1.1, -0.22)}Q${p(1.17, -0.21)} ${p(1.16, -0.15)}L${p(1.15, -0.12)}Q${p(1.14, -0.08)} ${p(1.08, -0.09)}L${p(0.12, -0.18)}Z`;
  const side = `M${p(-0.66, 0.02)}L${p(-0.5, 0.02)}L${p(-0.5, 0.12)}L${p(-0.66, 0.12)}Z`;
  const box = [cx - 0.6 * s, cy - 0.45 * s, cx + 0.6 * s, cy + 0.6 * s];
  const metal = (d, from, to) => shade(d, dots(...box, { step: 10, r0: 0.6, r1: 4.2, from, to }), C.ink);
  const col = fill(pot, C.white) + metal(pot, [cx - 0.2 * s, cy], [cx + 0.5 * s, cy + 0.5 * s]) + fill(lid, C.white) + metal(lid, [cx - 0.2 * s, cy - 0.35 * s], [cx + 0.5 * s, cy - 0.1 * s])
    + fill(lip, C.white) + fill(potHandle, C.ink) + fill(lidHandle, C.ink) + fill(side, C.ink);
  const inkPlate = ink(pot, s * 0.03) + ink(lip, s * 0.02) + ink(lid, s * 0.025) + ink(potHandle, s * 0.02) + ink(lidHandle, s * 0.02) + ink(side, s * 0.02);
  const top = ink(`M${p(-0.38, 0.0)}L${p(-0.38, 0.4)}`, s * 0.035, C.white) + ink(`M${p(-0.3, -0.25)}Q${p(-0.1, -0.33)} ${p(0.05, -0.33)}`, s * 0.025, C.white);
  // the weight valve: a stem and a round weight on it
  const stem = `M${p(-0.04, -0.38)}L${p(-0.04, -0.45)}L${p(0.04, -0.45)}L${p(0.04, -0.38)}Z`;
  const weight = `M${p(-0.09, -0.45)}L${p(-0.07, -0.56)}Q${p(0, -0.6)} ${p(0.07, -0.56)}L${p(0.09, -0.45)}Z`;
  // the gas ring under it
  let fl = "";
  for (let i = 0; i < 6; i++) {
    const fx = cx - 0.32 * s + (i * 0.64 * s) / 5, by = cy + 0.7 * s, h = s * (0.1 + 0.04 * (i % 2));
    fl += `M${f(fx - s * 0.03)} ${f(by)}C${f(fx - s * 0.03)} ${f(by - h * 0.5)} ${f(fx)} ${f(by - h * 0.8)} ${f(fx + s * 0.005)} ${f(by - h)}C${f(fx + s * 0.02)} ${f(by - h * 0.6)} ${f(fx + s * 0.03)} ${f(by - h * 0.4)} ${f(fx + s * 0.03)} ${f(by)}Z`;
  }
  const ring = `M${p(-0.42, 0.7)}h${f(0.84 * s)}v${f(0.06 * s)}h${f(-0.84 * s)}Z`;
  const stove = obj(fill(fl, C.blue) + fill(ring, C.ink), ink(fl, s * 0.012));
  return { body: stove + obj(col + fill(stem, C.ink), inkPlate + ink(stem, s * 0.015), top), weight: obj(fill(weight, C.ink), ink(weight, s * 0.015), ink(`M${p(-0.04, -0.52)}l${f(0.05 * s)} ${f(-0.02 * s)}`, s * 0.015, C.white)), weightAt: [cx, cy - 0.5 * s] };
}

// ── Instruments: their readings are computed from the fact sheet ─────────────────────────────────────────────────
// A thermometer from 0 to max °C: tube (x, y0..y1) and bulb; returns its parts and where a value sits.
export function thermometer(x, y0, y1, max = 200, { tick = 50, r = 34 } = {}) {
  const h = y1 - y0, yOf = (v) => y1 - (h * v) / max;
  const tube = `M${f(x - r)} ${f(y0)}V${f(y1 + r * 0.6)}A${f(r * 2)} ${f(r * 2)} 0 1 0 ${f(x + r)} ${f(y1 + r * 0.6)}V${f(y0)}A${f(r)} ${f(r)} 0 0 0 ${f(x - r)} ${f(y0)}Z`;
  let scale = "", labels = "";
  for (let v = 0; v <= max; v += tick / 5) {
    const y = yOf(v), major = v % tick === 0;
    scale += `M${f(x + r + 8)} ${f(y)}h${major ? 46 : 22}`;
    if (major) labels += letter(`${v}`, x + r + 66, y, 40, { anchor: "start" });
  }
  const bulb = `<circle cx="${f(x)}" cy="${f(y1 + r * 2.15)}" r="${f(r * 1.55)}" fill="${C.red}"/>`;
  const glass = obj(fill(tube, C.white), ink(tube, 10) + ink(scale, 6) + labels, ink(`M${f(x - r * 0.45)} ${f(y0 + 20)}V${f(y1 - 20)}`, 7, C.white, 'opacity="0.9"'));
  return { glass, bulb: obj(bulb, `<circle cx="${f(x)}" cy="${f(y1 + r * 2.15)}" r="${f(r * 1.55)}" fill="none" stroke="${C.ink}" stroke-width="6"/>`, `<circle cx="${f(x - r * 0.5)}" cy="${f(y1 + r * 1.75)}" r="${f(r * 0.32)}" fill="${C.white}"/>`), yOf, columnD: (v) => `M${f(x - r * 0.48)} ${f(yOf(v))}V${f(y1 + r * 2)}H${f(x + r * 0.48)}V${f(yOf(v))}Z` };
}
// A pressure gauge from 0 to max times the air's pressure over a 240° sweep; red zone from `red` up.
export function gauge(cx, cy, r, { max = 10, red = 8, labelSize, unit = true, small = false } = {}) {
  const a0 = 150, span = 240, ang = (v) => ((a0 + (span * v) / max) * Math.PI) / 180;
  const at = (v, k) => [cx + Math.cos(ang(v)) * r * k, cy + Math.sin(ang(v)) * r * k];
  let ticks = "";
  for (let v = 0; v <= max; v += 0.5) {
    const major = v % 5 === 0, mid = v % 1 === 0, [x0, y0] = at(v, major ? 0.72 : mid ? 0.8 : 0.86), [x1, y1] = at(v, 0.93);
    ticks += `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`;
  }
  const ls = labelSize ?? r * 0.2;
  let labels = "";
  for (const v of small ? [0, 5, 10] : [0, 2, 4, 6, 8, 10]) {
    const [x, y] = at(v, small ? 0.52 : 0.58);
    labels += `<text x="${f(x)}" y="${f(y + ls * 0.36)}" font-size="${f(ls)}" text-anchor="middle" class="bang" fill="${C.ink}">${v}</text>`;
  }
  const [rx0, ry0] = at(red, 0.86), [rx1, ry1] = at(max, 0.86);
  const zone = `M${f(rx0)} ${f(ry0)}A${f(r * 0.86)} ${f(r * 0.86)} 0 0 1 ${f(rx1)} ${f(ry1)}`;
  const face = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${C.white}"/>`;
  const rimD = `M${f(cx - r * 1.1)} ${f(cy)}a${f(r * 1.1)} ${f(r * 1.1)} 0 1 0 ${f(r * 2.2)} 0a${f(r * 1.1)} ${f(r * 1.1)} 0 1 0 ${f(-r * 2.2)} 0Z`;
  const rim = fill(rimD, C.white) + shade(rimD, dots(cx - r * 1.2, cy - r * 1.2, cx + r * 1.2, cy + r * 1.2, { step: Math.max(7, r * 0.04), r0: 0.6, r1: Math.max(2.4, r * 0.012), from: [cx - r, cy - r], to: [cx + r, cy + r] }), C.ink);
  const unitText = unit ? letter("× tekanan udara", cx, cy + r * 0.58, Math.max(28, r * 0.11)) : "";
  const body = obj(rim + face, ink(rimD, Math.max(6, r * 0.035)) + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${C.ink}" stroke-width="${f(Math.max(4, r * 0.02))}"/>` + ink(zone, Math.max(8, r * 0.06), C.red, 'stroke-linecap="butt"') + ink(ticks, Math.max(3, r * 0.02)) + labels + unitText);
  return { body, ang, at };
}
// The needle at a value: drawn about the gauge's centre so it can be turned with a transform.
export function needle(cx, cy, r) {
  const d = `M${f(cx - r * 0.16)} ${f(cy - r * 0.045)}L${f(cx + r * 0.8)} ${f(cy - r * 0.012)}L${f(cx + r * 0.84)} ${f(cy)}L${f(cx + r * 0.8)} ${f(cy + r * 0.012)}L${f(cx - r * 0.16)} ${f(cy + r * 0.045)}Z`;
  return obj(fill(d, C.red), ink(d, Math.max(3, r * 0.018)) + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.09)}" fill="${C.ink}"/>`, `<circle cx="${f(cx - r * 0.025)}" cy="${f(cy - r * 0.025)}" r="${f(r * 0.03)}" fill="${C.white}"/>`);
}

// A thought bubble with its trail of circles, and lettering in it.
export function thought(cx, cy, rx, ry, toward, text, size) {
  const R = rng(9), n = 9, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n, k = 0.92 + R() * 0.16;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const d = `M${f(pts[0][0])} ${f(pts[0][1])}` + pts.slice(1).concat([pts[0]]).map(([x, y]) => `A${f(rx * 0.3)} ${f(rx * 0.3)} 0 0 1 ${f(x)} ${f(y)}`).join("") + "Z";
  const [tx, ty] = toward;
  const trail = [0.35, 0.62, 0.84].map((k, i) => {
    const x = cx + (tx - cx) * k, y = cy + ry * 0.9 + (ty - cy - ry * 0.9) * k, r = [26, 17, 10][i];
    return `M${f(x - r)} ${f(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  }).join("");
  return obj(fill(d + trail, C.white), ink(d, 8) + ink(trail, 6), soundWord(text, cx, cy + size * 0.36, size, { rot: -4 }));
}

// ── Narration and speech, lettered as the template says ──────────────────────────────────────────────────────────
// Words of a line, each knowing whether it is the key word (*stars* in the storyboard) and its colour.
function tokens(text, keyColour) {
  const out = [];
  for (const part of text.split(/(\*[^*]+\*)/)) {
    if (!part) continue;
    const key = part.startsWith("*");
    for (const w of (key ? part.slice(1, -1) : part).split(/\s+/).filter(Boolean)) {
      if (/^[.,;:!?]+$/.test(w) && out.length) out.at(-1).w += w;
      else out.push({ w, key, colour: key ? keyColour : C.ink });
    }
  }
  return out;
}
// Lines of at most `width` px; returns [{ x, words: [{ w, key, colour, x }] }] laid out from x 0.
function wrap(toks, size, width) {
  const sp = measure(" ", size, "Kalam", 400), lines = [[]];
  let x = 0;
  for (const t of toks) {
    const tw = measure(t.w, size, "Kalam", t.key ? 700 : 400);
    if (x > 0 && x + tw > width) { lines.push([]); x = 0; }
    lines.at(-1).push({ ...t, x, tw });
    x += tw + sp;
  }
  return lines.map((ws) => ({ words: ws, width: ws.length ? ws.at(-1).x + ws.at(-1).tw : 0 }));
}
const wordsMarkup = (lines, x0, y0, size, lh, anchor = "start", boxW = 0) => lines.map((ln, i) => {
  const dx = anchor === "middle" ? (boxW - ln.width) / 2 : 0;
  return ln.words.map((t) => `<text x="${f(x0 + dx + t.x)}" y="${f(y0 + i * lh)}" font-size="${size}" class="kal" style="font-weight:${t.key ? 700 : 400}" fill="${t.colour}"${t.key && t.colour === C.ink ? ' text-decoration="underline"' : ""}>${t.w}</text>`).join("");
}).join("");
// A narration caption box: yellow, an ink border and a hard shadow, the key word in bold. Returns { markup, h }.
export function captionBox(text, x, y, width, { size = 44, keyColour = C.red, pad = 22 } = {}) {
  const lines = wrap(tokens(text, keyColour), size, width - 2 * pad), lh = size * 1.18;
  const h = lines.length * lh + pad * 1.3;
  const box = `<rect x="${f(x + 8)}" y="${f(y + 8)}" width="${f(width)}" height="${f(h)}" fill="${C.ink}"/><rect x="${f(x)}" y="${f(y)}" width="${f(width)}" height="${f(h)}" fill="${C.yellow}" stroke="${C.ink}" stroke-width="5"/>`;
  return { markup: `<g class="capbox">${box}${wordsMarkup(lines, x + pad, y + pad * 0.55 + size * 0.86, size, lh)}</g>`, h, w: width };
}
// A speech bubble: white, an ink edge, its tail pointing at the speaker's mouth (tx, ty).
export function speech(text, x, y, width, tx, ty, { size = 46 } = {}) {
  const lines = wrap(tokens(text, C.red), size, width - 60), lh = size * 1.16, h = lines.length * lh + 46;
  const r = Math.min(60, h / 2), x1 = x + width, y1 = y + h;
  const bx = Math.max(x + r + 30, Math.min(x1 - r - 70, tx + 40));
  const d = `M${f(x + r)} ${f(y)}H${f(x1 - r)}Q${f(x1)} ${f(y)} ${f(x1)} ${f(y + r)}V${f(y1 - r)}Q${f(x1)} ${f(y1)} ${f(x1 - r)} ${f(y1)}H${f(bx + 34)}L${f(tx)} ${f(ty)}L${f(bx - 20)} ${f(y1)}H${f(x + r)}Q${f(x)} ${f(y1)} ${f(x)} ${f(y1 - r)}V${f(y + r)}Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)}Z`;
  return { markup: `<g class="speech"><path d="${d}" fill="${C.white}" stroke="${C.ink}" stroke-width="7" stroke-linejoin="round"/>${wordsMarkup(lines, x + 30, y + 23 + size * 0.84, size, lh, "middle", width - 60)}</g>`, h };
}
// The gauge's stem: a pipe from (x0, y0) to (x1, y1) ending in a needle point that goes into what it measures.
export function pipe(x0, y0, x1, y1, w = 22) {
  const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a) * w / 2, ny = Math.cos(a) * w / 2;
  const d = `M${f(x0 + nx)} ${f(y0 + ny)}L${f(x1 + nx * 0.5)} ${f(y1 + ny * 0.5)}L${f(x1)} ${f(y1 + Math.sin(a) * w)}L${f(x1 - nx * 0.5)} ${f(y1 - ny * 0.5)}L${f(x0 - nx)} ${f(y0 - ny)}Z`;
  return obj(fill(d, C.white) + shade(d, dots(Math.min(x0, x1) - w, Math.min(y0, y1) - w, Math.max(x0, x1) + w, Math.max(y0, y1) + w, { step: 7, r0: 2, r1: 2, min: 0 }), C.ink, { cut: [nx * 0.6, ny * 0.6] }), ink(d, 6));
}
// "×", drawn: two ink strokes with the colour under them.
export const times = (x, y, k, colour = C.red) => ink(`M${f(x - k)} ${f(y - k)}L${f(x + k)} ${f(y + k)}M${f(x + k)} ${f(y - k)}L${f(x - k)} ${f(y + k)}`, k * 0.75, C.ink) + ink(`M${f(x - k)} ${f(y - k)}L${f(x + k)} ${f(y + k)}M${f(x + k)} ${f(y - k)}L${f(x - k)} ${f(y + k)}`, k * 0.42, colour);
