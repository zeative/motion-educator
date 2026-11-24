// The real parts of "Why does a bigger rear gear make hills easier?", computed from the fact sheet's numbers.
// Everything here is geometry in millimetres, y pointing down the screen (angles grow clockwise on screen), and
// returns strokes: { pts: [[x, y], ...], closed, w, dash, col, tool } that draft.js draws on at pen speed.
//
//   w     line weight on screen: THICK (outlines), MID (the accent part), THIN (everything else)
//   dash  null (solid), "dash" (hidden edges, pitch circles), "chain" (centre lines: dash-dot)
//   col   "ink" (#e8f1ff) or "acc" (#ffd166, the part or value that matters)
//   tool  what the draughtsman draws it with, for the sound: "pen" (curves), "ruler" (straight), "compass" (circles)
//
// Sources: the spur pair is a standard involute pair (KHK Gear Technical Reference, Table 4.1: d = zm, addendum m,
// dedendum 1.25m, 20 degree pressure angle) of module 3 with 12 and 36 teeth (f2, f4). The sprockets are for a
// 1/2-inch chain, pitch diameter p / sin(180/N), outside diameter p (0.6 + cot(180/N)) (ASME B29.1 as given by
// Engineers Edge, f6). The bike is the side elevation of a Polygon Xtrada 7 (2021), XL, 29 in, from its geometry
// (bikeinsights.com, f8), with a Shimano Deore 32-tooth chainring, 175 mm cranks and an 11-51 cassette (f7).
export const THICK = 4, MID = 3.4, THIN = 2;
const rad = (d) => (d * Math.PI) / 180;

// ── Strokes ─────────────────────────────────────────────────────────────────────────────────────────────────────
export const S = (pts, o = {}) => ({ pts, closed: false, w: THIN, dash: null, col: "ink", tool: "ruler", ...o });
export const line = (a, b, o = {}) => S([a, b], o);
export function arc(cx, cy, r, a0, a1, o = {}, step = 3) {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return S(pts, { tool: "compass", ...o });
}
// A full circle, starting at `from` degrees (the compass's needle goes in at the centre, the pencil starts there).
export const circle = (cx, cy, r, o = {}, from = -90) => ({ ...arc(cx, cy, r, from, from + 360, o, Math.max(1.2, Math.min(4, 600 / Math.max(r, 1)))), closed: true });
export const poly = (pts, o = {}) => S(pts, { tool: "pen", ...o });
// Points of a stroke moved: rotated about the origin by `a` degrees, scaled, then shifted.
export function place(strokes, { x = 0, y = 0, r = 0, s = 1 } = {}) {
  const c = Math.cos(rad(r)), n = Math.sin(rad(r));
  return strokes.map((k) => ({ ...k, pts: k.pts.map(([px, py]) => [x + s * (c * px - n * py), y + s * (n * px + c * py)]) }));
}

// ── Drawing conventions: centre lines, dimensions, arrows, balloons ──────────────────────────────────────────────
export const centreLines = (cx, cy, rx, ry = rx, o = {}) => [line([cx - rx, cy], [cx + rx, cy], { dash: "chain", ...o }), line([cx, cy - ry], [cx, cy + ry], { dash: "chain", ...o })];
// An arrowhead at b, pointing from a to b: a closed slim triangle, drawn as two strokes back from the tip.
export function head(a, b, size = 20, o = {}) {
  const an = Math.atan2(b[1] - a[1], b[0] - a[0]), wing = 0.28;
  return S([[b[0] - size * Math.cos(an - wing), b[1] - size * Math.sin(an - wing)], b, [b[0] - size * Math.cos(an + wing), b[1] - size * Math.sin(an + wing)]], { ...o, closed: true, fill: true, w: Math.min(o.w ?? THIN, 2) });
}
export const dot = (x, y, r = 4.5, o = {}) => ({ ...circle(x, y, r, { w: 1.5, ...o }), fill: true });
export const arrow = (a, b, o = {}, size = 22) => [line(a, b, o), head(a, b, size, o)];
export const arrow2 = (a, b, o = {}, size = 20) => [line(a, b, o), head(a, b, size, o), head(b, a, size, o)];
// A linear dimension between two points, with extension lines from the part (`ext`: how far the dimension line sits
// from the measured points, along the normal), arrowheads inside, and a gap at the ends of the extension lines.
export function dim(a, b, ext = 0, o = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const A = [a[0] + nx * ext, a[1] + ny * ext], B = [b[0] + nx * ext, b[1] + ny * ext];
  const out = [line(A, B, o), head(B, A, 18, o), head(A, B, 18, o)];
  if (ext) {
    const s = Math.sign(ext), g = 6, over = 12;
    out.push(line([a[0] + nx * g * s, a[1] + ny * g * s], [A[0] + nx * over * s, A[1] + ny * over * s], o));
    out.push(line([b[0] + nx * g * s, b[1] + ny * g * s], [B[0] + nx * over * s, B[1] + ny * over * s], o));
  }
  return out;
}
// A part number in a callout circle, with a leader to the part ending in a dot.
export function balloon(x, y, tx, ty, r = 26, o = {}) {
  const a = Math.atan2(ty - y, tx - x);
  return [circle(x, y, r, { ...o, tool: "compass" }), line([x + r * Math.cos(a), y + r * Math.sin(a)], [tx, ty], o), dot(tx, ty, 4.5, o)];
}

// ── Spur gears: involute teeth at true addendum and dedendum ─────────────────────────────────────────────────────
const inv = (a) => Math.tan(a) - a;
export function spurOutline(z, m, { alpha = 20 } = {}) {
  const rp = (z * m) / 2, rb = rp * Math.cos(rad(alpha)), ra = rp + m, rf = rp - 1.25 * m;
  const psiP = Math.PI / (2 * z) + inv(rad(alpha));
  const psi = (r) => psiP - inv(Math.acos(Math.min(1, rb / r)));
  const r0 = Math.max(rf, rb); // the involute starts at the base circle; below it the flank runs radially to the root
  const flank = [];
  for (let i = 0; i <= 10; i++) {
    const r = r0 + ((ra - r0) * i) / 10;
    flank.push([r, psi(r)]);
  }
  const pts = [];
  const P = (r, a) => pts.push([r * Math.cos(a), r * Math.sin(a)]);
  const tau = (2 * Math.PI) / z, rootHalf = psi(r0);
  for (let k = 0; k < z; k++) {
    const c = k * tau;
    if (rf < rb) P(rf, c - rootHalf);
    for (const [r, p] of flank) P(r, c - p);
    const tipHalf = psi(ra);
    for (let i = 1; i < 4; i++) P(ra, c - tipHalf + (2 * tipHalf * i) / 4);
    for (const [r, p] of [...flank].reverse()) P(r, c + p);
    if (rf < rb) P(rf, c + rootHalf);
    // the root land, to the next tooth
    const a0 = c + rootHalf, a1 = c + tau - rootHalf;
    for (let i = 1; i < 4; i++) P(rf, a0 + ((a1 - a0) * i) / 4);
  }
  return { pts, rp, ra, rf, rb };
}
// A spur gear in front view: outline (thick), pitch circle (thin dashed), hub and bore with its keyway (thin).
export function spurGear(z, m, k, { col = "ink", w = THICK, hub, bore, key } = {}) {
  const g = spurOutline(z, m);
  const out = { outline: S(g.pts.map(([x, y]) => [x * k, y * k]), { closed: true, w, col, tool: "pen" }), pitch: circle(0, 0, g.rp * k, { dash: "dash" }), g };
  const hb = [];
  if (hub) hb.push(circle(0, 0, (hub / 2) * k, { col }));
  if (bore) {
    // the bore with a keyway at the top (DIN 6885 proportions for its shaft): round from one side of the keyway to
    // the other, then out, across and back in
    const rb = (bore / 2) * k, kw = (key[0] / 2) * k, kd = key[1] * k;
    const a = (Math.asin(kw / rb) * 180) / Math.PI, yk = -Math.sqrt(rb * rb - kw * kw), top = -rb - kd;
    const p = arc(0, 0, rb, -90 + a, 270 - a, { col }, 4).pts;
    hb.push(S([...p, [-kw, top], [kw, top], [kw, yk]], { col, tool: "compass", closed: false }));
  }
  out.hub = hb;
  return out;
}

// ── Chain sprockets: roller seats on the pitch circle, flanks to a pointed tip ───────────────────────────────────
export const P = 12.7; // 1/2-inch chain pitch (f6)
export const ROLLER = 7.75; // a bicycle chain's roller diameter
export const pitchR = (n) => P / (2 * Math.sin(Math.PI / n));
export const tipR = (n) => (P * (0.6 + 1 / Math.tan(Math.PI / n))) / 2;
export function sprocketOutline(n, { phase = 0 } = {}) {
  const R = pitchR(n), Ro = tipR(n), rs = 0.5025 * ROLLER + 0.04, tau = (2 * Math.PI) / n;
  const pts = [];
  const beta = rad(68); // how far round the roller the seat wraps, either side of its bottom
  for (let j = 0; j < n; j++) {
    const c = phase + j * tau, cx = R * Math.cos(c), cy = R * Math.sin(c);
    // the seat: the inner part of a circle round the roller's centre, from the trailing side to the leading side
    for (let i = 0; i <= 8; i++) {
      const a = c + Math.PI + beta - (2 * beta * i) / 8;
      pts.push([cx + rs * Math.cos(a), cy + rs * Math.sin(a)]);
    }
    // the tooth between this seat and the next: a flank up to a short tip land, and down again
    const mid = c + tau / 2, land = 0.45 / Ro;
    pts.push([Ro * Math.cos(mid - land), Ro * Math.sin(mid - land)], [Ro * Math.cos(mid + land), Ro * Math.sin(mid + land)]);
  }
  return pts;
}
export const sprocket = (n, k, o = {}, phase = 0) => S(sprocketOutline(n, { phase }).map(([x, y]) => [x * k, y * k]), { closed: true, w: THIN, tool: "pen", ...o });

// Is a point inside a closed polygon (even-odd)?
function inside(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// Split a closed outline into the runs that are not hidden behind any of `covers` (closed polygons in front of it).
function visibleRuns(pts, covers, step = 0.6) {
  const dense = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / step));
    for (let k = 0; k < n; k++) dense.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  const vis = dense.map((p) => !covers.some((c) => inside(p, c)));
  if (vis.every(Boolean)) return [[...dense, dense[0]]];
  const start = vis.indexOf(false), runs = [];
  let cur = null;
  for (let k = 1; k <= dense.length; k++) {
    const i = (start + k) % dense.length;
    if (vis[i]) (cur ??= []).push(dense[i]);
    else if (cur) runs.push(cur), (cur = null);
  }
  if (cur) runs.push(cur);
  return runs.filter((r) => r.length > 1);
}
// The Shimano Deore CS-M5100 11-51 cassette seen along the axle (f7): every sprocket at its true size, the smaller ones
// in front, so each larger one shows only the ring of teeth outside them (hidden lines left out, as drawn).
export const CASSETTE = [11, 13, 15, 18, 21, 24, 28, 33, 39, 45, 51];
export function cassette(k, { hi = [11, 33], only } = {}) {
  // each sprocket turned a little against the next (the 33's teeth line up with the bike's own drawing of it)
  const outlines = CASSETTE.map((n, i) => sprocketOutline(n, { phase: rad((i - 7) * 7) }));
  const out = [];
  CASSETTE.forEach((n, i) => {
    if (only && !only(n)) return;
    const covers = outlines.slice(0, i);
    for (const run of visibleRuns(outlines[i], covers)) {
      const acc = hi.includes(n);
      out.push(S(run.map(([x, y]) => [x * k, y * k]), { w: acc ? MID : THIN, col: acc ? "acc" : "ink", tool: "pen", n }));
    }
  });
  // the lockring in front of the 11: its outer edge and the splines it is turned by
  if (!only || only(0)) out.push({ ...circle(0, 0, 17 * k), n: 0 }, { ...circle(0, 0, 11.5 * k), n: 0 });
  return out;
}

// ── The bicycle: Polygon Xtrada 7 (2021), XL, 29 in, side elevation from its geometry (f8) ───────────────────────
// Frame numbers in mm with the rear axle at the origin and y up (as geometry charts give them); flipped to y down.
export const GEO = { CS_H: 430.1, BB_DROP: 65, WB: 1191, STACK: 637, REACH: 470, ST_CT: 500, HTA: 67, STA: 75, HT_LEN: 105, OFFSET: 44.3, CRANK: 175, TYRE: 736.3, RIM: 622, RING: 32 };
export function bikePoints() {
  const { CS_H, BB_DROP, WB, STACK, REACH, ST_CT, HTA, STA, HT_LEN } = GEO;
  const R = [0, 0], F = [WB, 0], BB = [CS_H, -BB_DROP];
  const st = [-Math.cos(rad(STA)), Math.sin(rad(STA))];
  const ST_TOP = [BB[0] + ST_CT * st[0], BB[1] + ST_CT * st[1]];
  const SADDLE = [BB[0] + 760 * st[0], BB[1] + 760 * st[1]]; // saddle height for a rider of the size (f8)
  const HT_TOP = [BB[0] + REACH, BB[1] + STACK];
  const d = [Math.cos(rad(HTA)), -Math.sin(rad(HTA))]; // down the steering axis
  const HT_BOT = [HT_TOP[0] + HT_LEN * d[0], HT_TOP[1] + HT_LEN * d[1]];
  const t = (F[0] - HT_BOT[0]) * d[0] + (F[1] - HT_BOT[1]) * d[1];
  const foot = [HT_BOT[0] + t * d[0], HT_BOT[1] + t * d[1]];
  const off = [F[0] - foot[0], F[1] - foot[1]]; // the fork offset, 44.3 mm
  const flip = (p) => [p[0], -p[1]];
  return Object.fromEntries(Object.entries({ R, F, BB, ST_TOP, SADDLE, HT_TOP, HT_BOT, foot, off, d }).map(([k, v]) => [k, k === "d" || k === "off" ? [v[0], -v[1]] : flip(v)]));
}

// A tube in side view: two outline lines at its diameter, the ends left open where it meets the next tube. The
// parts of its outline that fall inside another tube are hidden and not drawn.
function capsule(a, b, ra, rb = ra) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  return { a, b, ra, rb, L, nx, ny, ux: dx / L, uy: dy / L };
}
function inTube(p, t, pad = 0.4) {
  const px = p[0] - t.a[0], py = p[1] - t.a[1], s = px * t.ux + py * t.uy;
  if (s < -t.ra * 0.2 || s > t.L + t.rb * 0.2) return false;
  const q = Math.max(0, Math.min(t.L, s)), r = t.ra + ((t.rb - t.ra) * q) / t.L;
  return Math.abs(px * t.nx + py * t.ny) < r - pad;
}
function tubeLines(tubes, extraCovers = [], o = {}) {
  // A tube's outline is hidden only inside the tubes in front of it (a higher `z`): the top tube's lines stop at the
  // head tube, the seatpost's at the seat tube, the stanchion's at the fork's lower leg.
  const out = [];
  tubes.forEach((t, i) => {
    const front = tubes.filter((u, j) => j !== i && (u.z ?? 0) >= (t.z ?? 0));
    const sides = [[1, t.ra, t.rb], [-1, t.ra, t.rb]];
    const runs = [];
    for (const [side] of sides) {
      const pts = [];
      const n = Math.ceil(t.L / 2);
      for (let k = 0; k <= n; k++) {
        const s = (t.L * k) / n, r = t.ra + ((t.rb - t.ra) * k) / n;
        pts.push([t.a[0] + t.ux * s + side * t.nx * r, t.a[1] + t.uy * s + side * t.ny * r]);
      }
      runs.push(pts);
    }
    // closed ends (a head tube, a lower leg) are drawn across
    if (t.closed) {
      runs.push([[t.a[0] + t.nx * t.ra, t.a[1] + t.ny * t.ra], [t.a[0] - t.nx * t.ra, t.a[1] - t.ny * t.ra]]);
      runs.push([[t.b[0] + t.nx * t.rb, t.b[1] + t.ny * t.rb], [t.b[0] - t.nx * t.rb, t.b[1] - t.ny * t.rb]]);
    }
    for (const pts of runs) {
      let run = [];
      for (const p of pts) {
        const hidden = front.some((u) => inTube(p, u)) || extraCovers.some((c) => c(p));
        if (hidden) {
          if (run.length > 1) out.push(S(run, { w: THICK, tool: "ruler", ...o }));
          run = [];
        } else run.push(p);
      }
      if (run.length > 1) out.push(S(run, { w: THICK, tool: "ruler", ...o }));
    }
  });
  return out;
}

// A wheel in side view: tyre, rim, hub and 32 spokes laced three-cross, in the wheel's own coordinates.
export function wheel({ spokesFrom = 0 } = {}) {
  const T = GEO.TYRE / 2, rimIn = GEO.RIM / 2 - 22, out = [];
  out.push(circle(0, 0, T, { w: THICK }), circle(0, 0, GEO.RIM / 2, { w: THIN }), circle(0, 0, rimIn, { w: THIN }));
  const spokes = [];
  for (let i = 0; i < 32; i++) {
    const a = rad(i * 11.25), lead = i % 2 ? 1 : -1;
    const h = [27 * Math.cos(a), 27 * Math.sin(a)];
    const e = rad(i * 11.25 + lead * 3 * 22.5 + (i % 4 < 2 ? 5.6 : 0));
    const r = [rimIn * Math.cos(e), rimIn * Math.sin(e)];
    // the part behind the cassette (rear wheel, drive side) is hidden: start the line where it comes out
    let a0 = h;
    if (spokesFrom > 0) {
      const dx = r[0] - h[0], dy = r[1] - h[1];
      for (let s = 0; s <= 1; s += 0.01) {
        const p = [h[0] + dx * s, h[1] + dy * s];
        if (Math.hypot(p[0], p[1]) >= spokesFrom) { a0 = p; break; }
      }
    }
    spokes.push(line(a0, r, { w: THIN }));
  }
  const hub = [circle(0, 0, 30, { w: THIN }), circle(0, 0, 21, { w: THIN }), circle(0, 0, 7, { w: THIN })];
  return { rim: out, spokes, hub };
}

// Belt geometry: the tangent from circle A to circle B for a chain wrapping A then B, each clockwise (+1) or
// anticlockwise (-1) on screen.
function tangent(A, B) {
  const Dx = B.c[0] - A.c[0], Dy = B.c[1] - A.c[1], L = Math.hypot(Dx, Dy), g = Math.atan2(Dy, Dx);
  const k = B.s * B.r - A.s * A.r, dl = g - Math.asin(k / L);
  const d = [Math.cos(dl), Math.sin(dl)], rot = [-d[1], d[0]];
  return { from: [A.c[0] - A.s * A.r * rot[0], A.c[1] - A.s * A.r * rot[1]], to: [B.c[0] - B.s * B.r * rot[0], B.c[1] - B.s * B.r * rot[1]] };
}
const angleOf = (c, p) => Math.atan2(p[1] - c[1], p[0] - c[0]);
// The chain's pitch line round a loop of circles: [{c, r, s}], in order of travel. Returns one closed polyline.
export function chainPath(loop) {
  const tans = loop.map((A, i) => tangent(A, loop[(i + 1) % loop.length]));
  const pts = [];
  loop.forEach((A, i) => {
    const inT = tans[(i - 1 + loop.length) % loop.length].to, outT = tans[i].from;
    let a0 = angleOf(A.c, inT), a1 = angleOf(A.c, outT);
    if (A.s > 0) while (a1 < a0) a1 += 2 * Math.PI;
    else while (a1 > a0) a1 -= 2 * Math.PI;
    const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / rad(4)));
    for (let k = 0; k <= n; k++) {
      const a = a0 + ((a1 - a0) * k) / n;
      pts.push([A.c[0] + A.r * Math.cos(a), A.c[1] + A.r * Math.sin(a)]);
    }
    pts.push(tans[i].to);
  });
  return pts;
}
// Offset a closed polyline sideways by d (both sides give the chain's plates as two lines).
export function offset(pts, d) {
  return pts.map((p, i) => {
    const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length];
    const tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty) || 1;
    return [p[0] - (ty / L) * d, p[1] + (tx / L) * d];
  });
}

// The whole bike, in groups that move on their own: the frame (fixed), each wheel's rim and spokes (turn with the
// wheel), the crank and chainring (turn with the pedals), the cassette (turns with the rear wheel), the chain.
export function bike({ cog = 33 } = {}) {
  const b = bikePoints();
  const { CRANK } = GEO;
  // Tubes (axis ends and radii in mm). The diameters are a typical alloy hardtail's; the axes are the geometry's.
  const ST_T = b.ST_TOP, toST = (k) => [b.BB[0] + (ST_T[0] - b.BB[0]) * k, b.BB[1] + (ST_T[1] - b.BB[1]) * k];
  const z = (t, v, closed = false) => Object.assign(t, { z: v, closed });
  const tubes = [
    z(capsule(b.BB, b.R, 12, 8), 4), // chainstay
    z(capsule(toST(0.93), b.R, 8, 6.5), 4), // seatstay
    z(capsule(b.BB, [ST_T[0] + (ST_T[0] - b.BB[0]) * 0.06, ST_T[1] + (ST_T[1] - b.BB[1]) * 0.06], 17.5), 8), // seat tube
    z(capsule(ST_T, b.SADDLE, 15.5), 3), // seatpost
    z(capsule([b.HT_TOP[0] - 6, b.HT_TOP[1] + 26], toST(0.9), 19, 16), 5), // top tube, sloping back to the seat tube
    z(capsule([b.HT_BOT[0] - 8, b.HT_BOT[1] - 24], b.BB, 26, 22), 5), // down tube
    z(capsule([b.HT_TOP[0] - b.d[0] * 6, b.HT_TOP[1] - b.d[1] * 6], [b.HT_BOT[0] + b.d[0] * 6, b.HT_BOT[1] + b.d[1] * 6], 23, 28), 9, true), // head tube (tapered)
  ];
  const bbShell = (p) => Math.hypot(p[0] - b.BB[0], p[1] - b.BB[1]) < 22;
  const frame = tubeLines(tubes, [bbShell]);
  frame.push(circle(b.BB[0], b.BB[1], 22, { w: THICK }));
  // the suspension fork: the steerer in the head tube, a crown under it carrying the stanchions forward by the
  // offset, the stanchions sliding into the lower legs, the dropout on the front axle
  const legTop = [b.HT_BOT[0] + b.d[0] * 30 + b.off[0], b.HT_BOT[1] + b.d[1] * 30 + b.off[1]];
  const legLen = Math.hypot(b.F[0] - legTop[0], b.F[1] - legTop[1]);
  const legU = [(b.F[0] - legTop[0]) / legLen, (b.F[1] - legTop[1]) / legLen];
  const at = (s) => [legTop[0] + legU[0] * s, legTop[1] + legU[1] * s];
  const fork = [
    z(capsule([b.HT_BOT[0] + b.d[0] * 4, b.HT_BOT[1] + b.d[1] * 4], [b.HT_BOT[0] + b.d[0] * 30 + b.off[0] * 1.25, b.HT_BOT[1] + b.d[1] * 30 + b.off[1] * 1.25], 15), 6, true), // crown
    z(capsule(at(-6), at(legLen * 0.44), 16), 3), // stanchion
    z(capsule(at(legLen * 0.36), at(legLen + 16), 21, 17), 7, true), // lower leg
  ];
  const forkLines = tubeLines([...fork, tubes[6]]).slice(0);
  // (the head tube was passed only to hide the crown's top inside it; its own lines are already in `frame`)
  const hcount = tubeLines([tubes[6]]).length;
  forkLines.splice(forkLines.length - hcount, hcount);
  // the stem and the bar (side view: the bar's clamp circle), and the saddle's profile
  const stemEnd = [b.HT_TOP[0] + 55, b.HT_TOP[1] - 22];
  const cock = [line([b.HT_TOP[0] - b.d[0] * 12, b.HT_TOP[1] - b.d[1] * 12], [b.HT_TOP[0] - b.d[0] * 40, b.HT_TOP[1] - b.d[1] * 40], { w: THICK }), line([b.HT_TOP[0] - b.d[0] * 32 - 6, b.HT_TOP[1] - b.d[1] * 32], stemEnd, { w: THICK }), circle(stemEnd[0], stemEnd[1], 16, { w: THICK }), line([stemEnd[0] - 12, stemEnd[1] - 6], [stemEnd[0] - 70, stemEnd[1] - 14], { w: THIN }), line([stemEnd[0] - 70, stemEnd[1] - 14], [stemEnd[0] - 118, stemEnd[1] - 12], { w: THICK })];
  const s = b.SADDLE;
  const saddle = [poly([[s[0] - 140, s[1] - 6], [s[0] - 120, s[1] - 22], [s[0] - 60, s[1] - 26], [s[0] + 40, s[1] - 18], [s[0] + 120, s[1] - 10], [s[0] + 138, s[1] - 2], [s[0] + 120, s[1] + 6], [s[0] + 40, s[1] + 4], [s[0] - 60, s[1] + 8], [s[0] - 128, s[1] + 10], [s[0] - 140, s[1] - 6]], { w: THICK, closed: true }), line([s[0] - 40, s[1] + 8], [s[0] - 30, s[1] + 22], { w: THIN }), line([s[0] - 30, s[1] + 22], [s[0] + 50, s[1] + 22], { w: THIN }), line([s[0] + 50, s[1] + 22], [s[0] + 70, s[1] + 6], { w: THIN })];
  // the rear derailleur (Shimano Deore type, f8 simplifies it): hanger off the dropout, B-knuckle, the parallelogram's
  // two links, P-knuckle, the cage and its two 11-tooth pulleys
  const U = [-38, 136], L = [-16, 218], rpul = pitchR(11);
  const derailleur = [];
  derailleur.push(poly([[8, -10], [16, 4], [6, 26], [-10, 34], [-22, 28], [-18, 10], [-6, -4], [8, -10]], { w: THIN, closed: true })); // hanger
  derailleur.push(circle(-16, 40, 13, { w: THIN }), circle(-16, 40, 4, { w: THIN })); // B-knuckle and its pivot
  derailleur.push(poly([[-6, 48], [-26, 92]], { w: THICK }), poly([[-24, 46], [-44, 90]], { w: THICK })); // parallelogram links
  derailleur.push(poly([[-30, 86], [-52, 92], [-56, 108], [-44, 118], [-24, 112], [-22, 96], [-30, 86]], { w: THIN, closed: true })); // P-knuckle
  const cage = capsule(U, L, 31);
  derailleur.push(...tubeLines([cage]).map((k) => ({ ...k, w: THIN })), arc(U[0], U[1], 31, 180 + 15, 360 - 15, { w: THIN }), arc(L[0], L[1], 31, 15, 165, { w: THIN }));
  const pulleys = [sprocket(11, 1, { w: THIN }, 0.2), ...place([sprocket(11, 1, { w: THIN }, 0.5)], { x: L[0], y: L[1] })].map((k, i) => (i === 0 ? { ...k, pts: k.pts.map(([x, y]) => [x + U[0], y + U[1]]) } : k));
  derailleur.push(circle(U[0], U[1], 6, { w: THIN }), circle(L[0], L[1], 6, { w: THIN }));
  // the chain on the chosen sprocket: its pitch line, links every 12.7 mm (plates, pins; rollers hidden behind)
  const loop = [{ c: [0, 0], r: pitchR(cog), s: 1 }, { c: b.BB, r: pitchR(GEO.RING), s: 1 }, { c: L, r: rpul, s: 1 }, { c: U, r: rpul, s: -1 }];
  const path = chainPath(loop);
  const centres = pitchPoints(path, true);
  const chain = chainLinks(centres, 1, { closed: true });
  // the drivetrain: chainring (32 T, direct mount, four arms to the crank's boss), and the cassette's sprocket the chain
  // is on; the chain is laid over them, so its plates hide the teeth they wrap
  const ring = [sprocket(GEO.RING, 1, { w: THIN }), circle(0, 0, pitchR(GEO.RING) - 14, { w: THIN }), circle(0, 0, 24, { w: THIN })];
  for (let i = 0; i < 4; i++) {
    const q = rad(45 + i * 90), w = 0.2;
    ring.push(line([24 * Math.cos(q - w), 24 * Math.sin(q - w)], [(pitchR(GEO.RING) - 14) * Math.cos(q - w * 0.45), (pitchR(GEO.RING) - 14) * Math.sin(q - w * 0.45)], { w: THIN }));
    ring.push(line([24 * Math.cos(q + w), 24 * Math.sin(q + w)], [(pitchR(GEO.RING) - 14) * Math.cos(q + w * 0.45), (pitchR(GEO.RING) - 14) * Math.sin(q + w * 0.45)], { w: THIN }));
  }
  const cas = [sprocket(51, 1, { w: THIN }), circle(0, 0, 17, { w: THIN })];
  const cog33 = [sprocket(cog, 1, { w: MID, col: "acc" })];
  derailleur.push(...pulleys);
  // disc brakes, 160 mm rotors on the far side: the front one seen through the spokes, its calliper on the fork's post
  // mount; the rear one behind the cassette, so hidden (dashed), with its calliper on the seatstay
  const rotorF = [circle(0, 0, 80, { w: THIN }), circle(0, 0, 66, { w: THIN }), circle(0, 0, 30, { w: THIN })];
  const fa = Math.atan2(-legU[1], -legU[0]); // up the fork leg, from the axle
  const cal = (cx, cy, an, o = {}) => place([poly([[-36, -16], [36, -16], [40, 0], [36, 16], [-36, 16], [-40, 0], [-36, -16]], { w: THIN, closed: true, ...o })], { x: cx, y: cy, r: (an * 180) / Math.PI + 90 });
  const calF = cal(b.F[0] + 76 * Math.cos(fa - 0.6), b.F[1] + 76 * Math.sin(fa - 0.6), fa - 0.6);
  const rotorR = [circle(0, 0, 80, { w: THIN, dash: "dash" }), circle(0, 0, 66, { w: THIN, dash: "dash" })];
  const calR = cal(76 * Math.cos(rad(-128)), 76 * Math.sin(rad(-128)), rad(-128), { dash: "dash" });
  // the crank (175 mm) and the platform pedal on it, in the crank's own coordinates (angle 0 = pointing forward)
  const crankArm = [poly([[0, -14], [CRANK, -9], [CRANK + 9, 0], [CRANK, 9], [0, 14]], { w: THICK }), circle(CRANK, 0, 6, { w: THIN }), circle(0, 0, 12, { w: THIN })];
  const otherArm = [poly([[0, -14], [-CRANK, -9], [-CRANK - 9, 0], [-CRANK, 9], [0, 14]], { w: THIN, dash: "dash" })];
  const pedal = [poly([[-52, -12], [52, -12], [56, -4], [56, 4], [52, 12], [-52, 12], [-56, 4], [-56, -4], [-52, -12]], { w: THICK, closed: true }), circle(0, 0, 8, { w: THIN }), line([-30, -6], [30, -6], { w: THIN }), line([-30, 6], [30, 6], { w: THIN }), ...[-40, -14, 14, 40].flatMap((x) => [line([x, -12], [x, -19], { w: THIN }), line([x, 12], [x, 19], { w: THIN })])];
  return { b, frame: [...frame, ...forkLines, ...cock, ...saddle], derailleur, chain, ring, cas, cog33, crankArm, otherArm, pedal, U, L, rotorF, calF, rotorR, calR, centres, path };
}

// ── Spur gears generated by their rack (the second pass, after review) ───────────────────────────────────────────
// Both gears are cut, as a hobbing machine cuts them, by one basic rack: 20 degree flanks, a cutter tip of 1.25 m with
// tip radius 0.38 m (so each root gets its fillet), thickened by half the backlash so the pair runs with 0.1 m of
// backlash. The 12-tooth pinion is profile-shifted by x = +0.6 so it is not undercut (KHK's own 12-tooth example uses
// +0.6) and the 36-tooth wheel by -0.6, so the centre distance stays (12 + 36) x 3 / 2 = 72 mm and the pitch circles
// stay 36 and 108 mm. The outline is the envelope of the rack's teeth as it rolls on the pitch circle: for every
// direction from the centre, the nearest point any cutter tooth reached.
export function rackGear(z, m, { x = 0, alpha = 20, backlash = 0.1, rho = 0.38, hf = 1.25, perPitch = 160 } = {}) {
  const a = rad(alpha), rp = (z * m) / 2, ra = rp + m * (1 + x), tau = (2 * Math.PI) / z;
  // the cutter tooth, centred on s = 0: s along the datum line, h into the blank
  const w0 = (Math.PI * m) / 4 + (backlash * m) / 4, tipH = hf * m, r = rho * m, tn = Math.tan(a);
  const hc = tipH - r, sc = w0 - hc * tn - r / Math.cos(a);
  const tooth = [];
  for (let i = 0; i <= 40; i++) { const h = -1.6 * m + ((hc + r * Math.sin(a) + 1.6 * m) * i) / 40; tooth.push([-(w0 - h * tn), h]); }
  for (let i = 0; i <= 16; i++) { const q = Math.PI - a - ((Math.PI / 2 - a) * i) / 16; tooth.push([-sc + r * Math.cos(q), hc + r * Math.sin(q)]); }
  for (let i = 1; i < 12; i++) tooth.push([-sc + (2 * sc * i) / 12, tipH]);
  for (let i = 0; i <= 16; i++) { const q = Math.PI / 2 - ((Math.PI / 2 - a) * i) / 16; tooth.push([sc + r * Math.cos(q), hc + r * Math.sin(q)]); }
  for (let i = 0; i <= 40; i++) { const h = hc + r * Math.sin(a) - ((hc + r * Math.sin(a) + 1.6 * m) * i) / 40; tooth.push([w0 - h * tn, h]); }
  // roll it: the rack moves rp t along its line while the blank turns t; collect, per direction, the nearest cut
  const N = perPitch * z, rmin = new Float64Array(N).fill(ra);
  const t1 = (5 * m) / rp, steps = Math.ceil((2 * t1 * rp) / (0.012 * m));
  for (let k = 0; k <= steps; k++) {
    const t = -t1 + (2 * t1 * k) / steps, c = Math.cos(-t), sn = Math.sin(-t);
    for (let j = -2; j <= 2; j++) {
      for (const [s, h] of tooth) {
        const X = s + j * Math.PI * m + rp * t, Y = -(rp + x * m) + h;
        const gx = c * X - sn * Y, gy = sn * X + c * Y;
        const R = Math.hypot(gx, gy);
        if (R >= ra) continue;
        let b = Math.floor(((Math.atan2(gy, gx) + Math.PI) / (2 * Math.PI)) * N);
        b = ((b % N) + N) % N;
        if (R < rmin[b]) rmin[b] = R;
      }
    }
  }
  // one pitch, centred on the space the middle cutter tooth cut at the bottom (-90 degrees), repeated round, and
  // turned so a tooth is centred on angle 0
  const b0 = Math.floor(((-Math.PI / 2 + Math.PI) / (2 * Math.PI)) * N), half = Math.floor(perPitch / 2);
  const one = [];
  for (let i = -half; i < perPitch - half; i++) {
    const b = (((b0 + i) % N) + N) % N;
    one.push([rmin[b], ((b + 0.5) / N) * 2 * Math.PI - Math.PI]);
  }
  const turn = Math.PI / 2 + tau / 2;
  const pts = [];
  for (let k = 0; k < z; k++) for (const [R, phi] of one) { const q = phi + turn + k * tau; pts.push([R * Math.cos(q), R * Math.sin(q)]); }
  return { pts, rp, ra, rf: Math.min(...rmin), rb: rp * Math.cos(a), x, z, m };
}
// A gear made from rackGear: outline (thick), pitch circle (thin chain line), hub and bore with its keyway.
export function cutGear(z, m, k, { x = 0, col = "ink", w = THICK, hub, bore, key } = {}) {
  const g = rackGear(z, m, { x });
  const out = { outline: S(g.pts.map(([px, py]) => [px * k, py * k]), { closed: true, w, col, tool: "pen" }), pitch: circle(0, 0, g.rp * k, { dash: "chain" }), g };
  const hb = [];
  if (hub) hb.push(circle(0, 0, (hub / 2) * k, { col }));
  if (bore) {
    const rb = (bore / 2) * k, kw = (key[0] / 2) * k, kd = key[1] * k;
    const aa = (Math.asin(kw / rb) * 180) / Math.PI, yk = -Math.sqrt(rb * rb - kw * kw), top = -rb - kd;
    const p = arc(0, 0, rb, -90 + aa, 270 - aa, { col }, 4).pts;
    hb.push(S([...p, [-kw, top], [kw, top], [kw, yk]], { col, tool: "compass", closed: false }));
  }
  out.hub = hb;
  return out;
}

// ── Hidden lines: a polyline split into the runs a set of covers leaves visible and the runs it hides ──────────────
export function splitHidden(pts, covers, { closed = false, step = 0.5 } = {}) {
  const seq = closed ? [...pts, pts[0]] : pts;
  const dense = [];
  for (let i = 0; i + 1 < seq.length; i++) {
    const a = seq[i], b = seq[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / step));
    for (let k = 0; k < n; k++) dense.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  dense.push(seq.at(-1));
  const hid = dense.map((p) => covers.some((c) => (typeof c === "function" ? c(p) : inside(p, c))));
  const vis = [], hidden = [];
  let run = [dense[0]], state = hid[0];
  for (let i = 1; i < dense.length; i++) {
    run.push(dense[i]);
    if (hid[i] !== state || i === dense.length - 1) {
      (state ? hidden : vis).push(run);
      run = [dense[i]];
      state = hid[i];
    }
  }
  return { vis: vis.filter((r) => r.length > 1), hidden: hidden.filter((r) => r.length > 1) };
}

// ── The chain: link plates, outer and inner alternately, and the pins ─────────────────────────────────────────────
// Roller centres every 12.7 mm along the chain's pitch line; plates 11.2 mm high, waisted between the pins (a 1/2 x
// 3/32 in bicycle chain's proportions), pins 3.7 mm across. The plates are filled with the paper, so whatever is behind
// them (the teeth they wrap, the rollers, the inner plates under the outer ones) is hidden as a drawing hides it.
// Returns { inner, outer }: two stroke lists, the inner plates to be laid down first.
export function chainLinks(centres, k = 1, { closed = false, o = {} } = {}) {
  const rp = 5.6, waist = 4.4, pin = 1.85, inner = [], outer = [];
  const n = centres.length, links = closed ? n : n - 1;
  for (let i = 0; i < links; i++) {
    const a = centres[i], b = centres[(i + 1) % n];
    const an = Math.atan2(b[1] - a[1], b[0] - a[0]), nx = -Math.sin(an), ny = Math.cos(an);
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const plate = [];
    for (let j = 0; j <= 8; j++) { const q = an + Math.PI / 2 + (Math.PI * j) / 8; plate.push([a[0] + rp * Math.cos(q), a[1] + rp * Math.sin(q)]); }
    plate.push([m[0] - nx * waist, m[1] - ny * waist]);
    for (let j = 0; j <= 8; j++) { const q = an - Math.PI / 2 + (Math.PI * j) / 8; plate.push([b[0] + rp * Math.cos(q), b[1] + rp * Math.sin(q)]); }
    plate.push([m[0] + nx * waist, m[1] + ny * waist]);
    const st = S(plate.map(([x, y]) => [x * k, y * k]), { closed: true, w: THIN, tool: "pen", fill: "paper", ...o });
    (i % 2 ? inner : outer).push(st);
    if (i % 2 === 0) {
      outer.push({ ...circle(a[0] * k, a[1] * k, pin * k, { w: THIN, ...o }) });
      outer.push({ ...circle(b[0] * k, b[1] * k, pin * k, { w: THIN, ...o }) });
    }
  }
  return { inner, outer };
}
// Roller centres every pitch along a polyline (the chain's pitch line).
export function pitchPoints(path, closed = true, p = P) {
  const seq = closed ? [...path, path[0]] : path;
  const out = [seq[0]];
  let need = p, i = 0, cur = seq[0];
  while (i + 1 < seq.length) {
    const nxt = seq[i + 1], L = Math.hypot(nxt[0] - cur[0], nxt[1] - cur[1]);
    if (L >= need) {
      cur = [cur[0] + ((nxt[0] - cur[0]) * need) / L, cur[1] + ((nxt[1] - cur[1]) * need) / L];
      out.push(cur);
      need = p;
    } else { need -= L; cur = nxt; i++; }
  }
  if (closed && Math.hypot(out.at(-1)[0] - out[0][0], out.at(-1)[1] - out[0][1]) < p * 0.5) out.pop();
  return out;
}
