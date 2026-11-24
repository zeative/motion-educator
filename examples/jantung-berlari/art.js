// The film's sprites, every one drawn at the game's one pixel size (nothing here is ever scaled). Small things are
// written out pixel by pixel; the organs and the body are rasterised from their shapes at 1 game pixel per pixel,
// then given an outline and two or three shade steps lit from the top left, with an ordered dither where two
// steps meet. Sizes are in game pixels (4 screen pixels each).
import { C, blank, sprite, mask, edge, paint, ellipse, capsule, box, union, and, dither } from "./pixel.js";

const { black: K, navy: N, plum: P, green: G, brown: B, dark: D, grey: Y, cream: W, red: R, orange: O, yellow: Yl, lime: L, sky: S, lav: V, pink: I, peach: E } = C;

// Shading lit from the top left: `s` runs from -1 (the lit corner) to +1 (the shadowed one).
const lit = (cx, cy, r) => (x, y) => ((x - cx) + (y - cy)) / (1.4142 * r);
function shade(base, light, dark, s, x, y, { hi = -0.55, lo = 0.38, band = 0.14 } = {}) {
  if (s > lo + band) return dark;
  if (s > lo) return dither(x, y, (s - lo) / band) ? dark : base; // the step from base to shadow, dithered
  if (light !== null && s < hi) return light;
  return base;
}

// ── HUD ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const HUD_HEART = sprite(["..rrr...rrr..", ".rwwrr.rrrrr.", "rrwrrrrrrrrrp", "rrrrrrrrrrrrp", "rrrrrrrrrrrpp", ".rrrrrrrrrpp.", "..rrrrrrrpp..", "...rrrrrpp...", "....rrrpp....", ".....rpp.....", "......p......"], { r: R, w: W, p: P });

// ── The player ──────────────────────────────────────────────────────────────────────────────────────────────────
// 26 x 34, side on, running to the right, with a one-pixel navy outline so he reads on the peach track and the
// greens alike. The head, shirt and shorts are drawn pixel by pixel; the limbs are strokes between joints placed by
// angle (0 = straight down, positive = forward), thighs three pixels thick, the far limbs a shade darker.
const HEAD = ["...kkkkk...", ".kkkkkkkkk.", "kkkkkkkkkkk", "kkkkkkkeeee", "kkkkkkeekee", "kkkkkeeeeeee", ".kkkeeeeeee", "..keeeeeee.", "....eeeee.."];
function limb(spr, pts, c, w = 2) {
  for (let k = 0; k < pts.length - 1; k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
      for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) if (x + a >= 0 && x + a < spr.w && y + b >= 0 && y + b < spr.h) spr.d[(y + b) * spr.w + x + a] = c;
    }
  }
}
const rad = (deg) => (deg * Math.PI) / 180;
const step = ([x, y], len, deg) => [x + Math.sin(rad(deg)) * len, y + Math.cos(rad(deg)) * len];
function outline(spr, c = N) {
  const src = spr.d.slice();
  for (let y = 0; y < spr.h; y++) for (let x = 0; x < spr.w; x++) {
    if (src[y * spr.w + x] !== 255) continue;
    const on = (i, j) => i >= 0 && j >= 0 && i < spr.w && j < spr.h && src[j * spr.w + i] !== 255;
    if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) spr.d[y * spr.w + x] = c;
  }
  return spr;
}
// pose: { near: [thigh, shin], far: [thigh, shin], armN: [upper, fore], armF: [upper, fore], lean, breathe }
function person({ near, far, armN, armF, lean = 0, drop = 0, breathe = 0 }) {
  const s = blank(26, 34);
  const ox = 7 + lean, oy = 1 + drop + breathe;
  const put = (x, y, c) => x >= 0 && y >= 0 && x < 26 && y < 34 && (s.d[y * 26 + x] = c);
  const hipN = [ox + 4 - lean, 20 + drop], hipF = [ox + 3 - lean, 20 + drop];
  const shN = [ox + 4, oy + 11], shF = [ox + 3, oy + 11];
  const legPts = (hip, [th, sh]) => {
    const knee = step(hip, 5, th);
    return [hip, knee, step(knee, 5, sh)];
  };
  const armPts = (sh, [up, fo]) => {
    const el = step(sh, 4, up);
    return [sh, el, step(el, 4, fo)];
  };
  const shoe = (ankle, c) => {
    const [x, y] = ankle.map(Math.round);
    for (let i = -1; i <= 3; i++) put(x + i, y + 1, c);
    for (let i = 0; i <= 2; i++) put(x + i, y, c);
  };
  const lf = legPts(hipF, far), ln = legPts(hipN, near);
  limb(s, armPts(shF, armF), B);
  limb(s, [lf[0], lf[1]], B, 3);
  limb(s, [lf[1], lf[2]], B);
  shoe(lf[2], Y);
  // shirt and shorts
  for (let y = oy + 10; y <= 19 + drop; y++) for (let x = ox; x <= ox + 7; x++) put(x, y, x === ox ? P : y === oy + 10 && x > ox + 4 ? I : R);
  for (let y = 18 + drop; y <= 21 + drop; y++) for (let x = ox; x <= ox + 7; x++) put(x, y, x === ox ? K : N);
  limb(s, [ln[0], ln[1]], E, 3);
  limb(s, [ln[1], ln[2]], E);
  shoe(ln[2], W);
  limb(s, armPts(shN, armN), E);
  HEAD.forEach((row, j) => [...row].forEach((ch, i) => ch !== "." && put(ox - 2 + i, oy + j, { k: K, e: E }[ch])));
  put(ox + 6, oy + 4, K); // the eye
  return outline(s);
}
const RUN_POSES = [
  { near: [40, 15], far: [-30, -75], armN: [-40, 30], armF: [40, 110] },
  { near: [5, -5], far: [55, -30], armN: [-10, 60], armF: [10, 80] },
  { near: [-30, -75], far: [40, 15], armN: [40, 110], armF: [-40, 30] },
  { near: [55, -30], far: [5, -5], armN: [10, 80], armF: [-10, 60] },
];
export const RUN = RUN_POSES.map((p) => person(p));
// Sitting on the bench, getting his breath back (two drawings), then standing up (two drawings) and standing.
const SIT = { near: [90, 0], far: [88, 2], armN: [15, 70], armF: [10, 70], drop: 4 };
export const SITTING = [0, 1].map((b) => person({ ...SIT, breathe: b }));
export const RISING = [person({ near: [55, 5], far: [50, 5], armN: [30, 80], armF: [25, 80], lean: 2, drop: 2 }), person({ near: [20, 0], far: [18, 0], armN: [10, 40], armF: [5, 40], lean: 1 })];
export const STANDING = person({ near: [0, 0], far: [-2, 0], armN: [5, 15], armF: [-5, 15] });

// ── The park ─────────────────────────────────────────────────────────────────────────────────────────────────────
export const QBLOCK = sprite(["oooooooooooo", "oyyyyyyyyyyo", "oyyykkkkyyyo", "oyykyyyykyyo", "oyyyyyyykyyo", "oyyyyyykyyyo", "oyyyyykyyyyo", "oyyyyykyyyyo", "oyyyyyyyyyyo", "oyyyyykyyyyo", "oyyyyyyyyyyo", "oooooooooooo"], { o: O, y: Yl, k: K });
export const CLOUD = [
  sprite(["....wwww.......", "..wwwwwwww.ww..", ".wwwwwwwwwwwwww", "wwwwwwwwwwwwwww", ".ggggggggggggg."], { w: W, g: Y }),
  sprite(["...www......", ".wwwwwww.ww.", "wwwwwwwwwwww", ".gggggggggg."], { w: W, g: Y }),
];
export function tree() {
  const s = blank(28, 40);
  const canopy = union(ellipse(14, 13, 13, 12), ellipse(8, 18, 7, 6), ellipse(20, 18, 7, 6));
  const m = mask(28, 40, canopy);
  const l = lit(14, 14, 13);
  paint(s, m, (x, y) => shade(G, L, N, l(x + 0.5, y + 0.5), x, y, { hi: -0.35, lo: 0.42 }));
  paint(s, edge(m, 28, 40), N);
  paint(s, mask(28, 40, box(12, 24, 16, 40)), (x) => (x >= 15 ? P : B));
  return s;
}
export const BENCH = outline(sprite(["bbbbbbbbbbbbbbbbbbbbbbbbbbbb", "pppppppppppppppppppppppppppp", ".bb......................bb.", ".bb......................bb.", ".pp......................pp.", ".pp......................pp.", ".pp......................pp."], { b: B, p: P }));

// ── The heart, from the front ───────────────────────────────────────────────────────────────────────────────────
// The real heart as the viewer sees it facing someone: the ventricles' cone with its apex down and to the viewer's
// right (the body's left); the right atrium at the viewer's left with the superior vena cava rising from it; the left
// auricle peeking out at the upper right; the pulmonary trunk rising from the right ventricle up and to the viewer's
// right, in front; the ascending aorta behind it to its left, arching over to the right with its three branches.
// Arteries carrying oxygen-rich blood are red; the veins and the pulmonary trunk (blood going for oxygen) lavender.
// opts: squeeze 0..1 (how far the walls are in), open (the left ventricle cut open, full of blood), valve (the
// aortic valve open), lit (the pacemaker shown and lit).
const cache = new Map();
export function heart(size, { squeeze = 0, open = false, pace = 0, detail = true } = {}) {
  const key = `${size}|${squeeze}|${open}|${pace}|${detail}`;
  if (cache.has(key)) return cache.get(key);
  const s0 = size;
  const w = Math.ceil(s0 * 1.0) + 4, h = Math.ceil(s0 * 1.12) + 4;
  const cx = Math.round(w * 0.45), cy = Math.round(h * 0.56); // the heart's centre in the sprite
  const u = (a) => cx + a * s0, v = (b) => cy + b * s0;
  // The ventricles contract towards their base, where the atria and the great vessels hold them: the apex rises
  // and the walls draw in, so nothing comes apart. Shapes on the ventricles are drawn relaxed and tested through sq().
  const kx = 1 - 0.045 * squeeze, ky = 1 - 0.08 * squeeze, BASE = -0.16, MID = 0.04;
  const sq = (fn) => (x, y) => fn(cx + (((x - cx) / s0 - MID) / kx + MID) * s0, cy + (((y - cy) / s0 - BASE) / ky + BASE) * s0);
  const k = (kx + ky) / 2;
  const ku = (a) => cx + ((a - MID) * kx + MID) * s0, kb = (b) => cy + ((b - BASE) * ky + BASE) * s0;
  const vent = sq(union(ellipse(u(0.04), v(0.13), 0.36 * s0, 0.29 * s0, 40), ellipse(u(0.18), v(0.27), 0.2 * s0, 0.12 * s0, 50)));
  const ra = ellipse(u(-0.26), v(-0.04), 0.15 * s0 * (1 + 0.05 * squeeze), 0.17 * s0 * (1 + 0.05 * squeeze));
  const la = ellipse(u(0.25), v(-0.1), 0.1 * s0, 0.07 * s0, -20);
  const svc = box(u(-0.33), v(-0.5), u(-0.22), v(-0.1));
  const asc = box(u(-0.105), v(-0.36), u(0.005), v(0.0));
  const archC = [u(0.05), v(-0.36)];
  const arch = (x, y) => y <= archC[1] && Math.hypot(x - archC[0], y - archC[1]) >= 0.05 * s0 && Math.hypot(x - archC[0], y - archC[1]) <= 0.15 * s0;
  const desc = box(u(0.1), v(-0.36), u(0.2), v(-0.16));
  const branches = union(...[-0.06, 0.04, 0.13].map((bx, i) => box(u(bx - 0.022), v(-0.6 + i * 0.01), u(bx + 0.022), v(-0.44))));
  // the pulmonary trunk: wide where it leaves the right ventricle (the conus), up and to the viewer's right, then
  // its left branch running out under the arch
  const pt = union(ellipse(u(-0.03), v(0.04), 0.085 * s0, 0.05 * s0, -30), capsule(u(-0.03), v(0.03), u(0.06), v(-0.16), 0.072 * s0, 0.058 * s0), capsule(u(0.06), v(-0.16), u(0.19), v(-0.22), 0.036 * s0, 0.03 * s0));
  const ptAcross = (x, y) => ((x - u(-0.03)) * 0.92 + (y - v(0.04)) * 0.4) / (0.08 * s0);
  const spr = blank(w, h);
  const M = (f) => mask(w, h, f);
  const L1 = lit(u(0), v(0), 0.4 * s0);
  // back to front
  // the vessels, each shaded as a tube: lit down its left side, in shadow down its right
  const tube = (across, base, light, dark) => (x, y) => shade(base, light, dark, across(x + 0.5, y + 0.5), x, y, { hi: -0.45, lo: 0.3, band: 0.3 });
  const msvc = M(svc);
  paint(spr, msvc, (x, y) => shade(V, Y, N, (x + 0.5 - u(-0.275)) / (0.055 * s0), x, y, { hi: -0.75, lo: 0.4, band: 0.3 }));
  paint(spr, edge(msvc, w, h), N);
  const mback = M(union(desc, branches));
  paint(spr, mback, tube((x) => ((x - u(0.04)) % (0.09 * s0)) / (0.03 * s0) * 0.5 + 0.2, R, I, P));
  paint(spr, edge(mback, w, h), P);
  // the pulmonary trunk's right branch, passing behind the ascending aorta towards the right lung
  if (!open) {
    const mrpa = M(capsule(u(0.04), v(-0.17), u(-0.2), v(-0.21), 0.032 * s0));
    paint(spr, mrpa, (x, y) => (y + 0.5 < v(-0.2) ? Y : V));
    paint(spr, edge(mrpa, w, h), N);
  }
  const maorta = M(union(asc, arch));
  paint(spr, maorta, (x, y) => (y + 0.5 > archC[1] ? tube((xx) => (xx - u(-0.05)) / (0.05 * s0), R, I, P)(x, y) : shade(R, I, P, (Math.hypot(x + 0.5 - archC[0], y + 0.5 - archC[1]) - 0.1 * s0) / (0.05 * s0) * -0.6 + (x - archC[0]) / (0.3 * s0), x, y, { hi: -0.45, lo: 0.3, band: 0.3 })));
  paint(spr, edge(maorta, w, h), P);
  const matria = M(union(ra, la));
  paint(spr, matria, (x, y) => shade(R, I, P, L1(x, y) + 0.12, x, y, { hi: -0.75 }));
  paint(spr, edge(matria, w, h), P);
  const mvent = M(vent);
  const Lv = sq(lit(u(0.04), v(0.1), 0.36 * s0));
  const shine = sq(ellipse(u(-0.12), v(-0.02), 0.09 * s0, 0.05 * s0, -35));
  paint(spr, mvent, (x, y) => (shine(x + 0.5, y + 0.5) && detail ? I : shade(R, I, P, Lv(x + 0.5, y + 0.5), x, y, { hi: -0.62, lo: 0.3, band: 0.16 })));
  paint(spr, edge(mvent, w, h), P);
  // the groove between the ventricles, with its artery, from the base down towards the apex
  if (detail) {
    // the groove between the ventricles, with the artery that runs down it (left anterior descending) and two of its
    // diagonal branches over the left ventricle; the right coronary artery round the groove under the right atrium
    const groove = sq(capsule(u(0.0), v(-0.06), u(0.24), v(0.36), 0.016 * s0 + 0.6));
    paint(spr, and2(M(groove), mvent), P);
    const lad = sq(capsule(u(0.0), v(-0.06), u(0.24), v(0.36), Math.max(0.5, 0.006 * s0)));
    paint(spr, and2(M(lad), mvent), R);
    for (const [a0, b0, a1, b1] of [[0.07, 0.06, 0.2, 0.04], [0.13, 0.17, 0.27, 0.16], [-0.13, 0.0, -0.28, 0.14]]) {
      const br = sq(capsule(u(a0), v(b0), u(a1), v(b1), Math.max(0.5, 0.006 * s0)));
      paint(spr, and2(M(br), mvent), P);
    }
  }
  if (!open) {
    const mpt = M(pt);
    paint(spr, mpt, (x, y) => shade(V, Y, N, ptAcross(x + 0.5, y + 0.5), x, y, { hi: -0.8, lo: 0.4, band: 0.3 }));
    paint(spr, edge(mpt, w, h), N);
  }
  if (open) {
    // The left ventricle cut open: the cut wall (pale, as muscle cut through is) round a cavity full of blood, and
    // the way out, through the aortic valve and up the ascending aorta, opened too.
    const cav = ellipse(ku(0.13), kb(0.15), 0.17 * s0 * (1 - 0.32 * squeeze), 0.085 * s0 * (1 - 0.25 * squeeze), 40);
    const wall = ellipse(ku(0.13), kb(0.15), 0.22 * s0 * (1 - 0.22 * squeeze), 0.13 * s0 * (1 - 0.18 * squeeze), 40);
    // the outflow: from the cavity's upper end, up and to the viewer's left, to the valve at the aorta's root
    const tip = [ku(0.13) - Math.cos(0.7) * 0.15 * s0 * (1 - 0.32 * squeeze), kb(0.15) - Math.sin(0.7) * 0.15 * s0 * (1 - 0.32 * squeeze)];
    const outflow = capsule(tip[0], tip[1], u(-0.05), v(0.01), 0.035 * s0);
    const lumen = union(box(u(-0.08), v(-0.38), u(-0.02), v(0.02)), outflow);
    const archL = (x, y) => y <= archC[1] && Math.hypot(x - archC[0], y - archC[1]) >= 0.075 * s0 && Math.hypot(x - archC[0], y - archC[1]) <= 0.125 * s0;
    const cut = M(union(wall, box(u(-0.105), v(-0.36), u(0.005), v(0.02)), capsule(tip[0], tip[1], u(-0.05), v(0.01), 0.065 * s0)));
    paint(spr, cut, I);
    paint(spr, edge(cut, w, h), P);
    const mc = M(union(cav, lumen, archL));
    // blood: red, a few lighter pixels where it catches the light; the way out darker until it carries blood
    paint(spr, mc, (x, y) => (cav(x + 0.5, y + 0.5) || outflow(x + 0.5, y + 0.5) ? (hash2(x, y) < 0.06 ? I : R) : P));
    paint(spr, edge(mc, w, h), P);
  }
  if (pace > 0) {
    // the pacemaker (the sinoatrial node), at the top of the right atrium where the vena cava comes in
    const sa = ellipse(u(-0.24), v(-0.15), 0.035 * s0 + 1, 0.03 * s0 + 1);
    const m = M(sa);
    paint(spr, m, pace > 1 ? W : Yl);
    paint(spr, edge(m, w, h), O);
  }
  const out = { ...spr, cx, cy, s: s0, u: (a) => Math.round(cx + a * s0), v: (b) => Math.round(cy + b * s0), sa: [Math.round(u(-0.24)), Math.round(v(-0.15))], valve: [Math.round(u(-0.05)), Math.round(v(0.0))], archTop: [Math.round(u(-0.05)), Math.round(v(-0.4))] };
  cache.set(key, out);
  return out;
}
const hash2 = (x, y) => {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
function and2(a, b) {
  const m = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) m[i] = a[i] && b[i];
  return m;
}

// ── The leg in cutaway ───────────────────────────────────────────────────────────────────────────────────────────
// The player's leg from the side, running to the right, from the hip (in his shorts) to the shoe. Cut open along
// its length: the skin, a thin layer of fat, the thigh bone, the big muscle in front of it (quadriceps, red, its
// fibres running along it) and the one behind (hamstrings, plum), the kneecap; in the shin the shin bone at the front
// and the calf behind. Posed by angle (0 = straight down, positive = forward): a stride in four drawings.
export const STRIDE = [[30, 5, 1], [0, -5, 1], [-25, -40, 0], [15, -70, 0]]; // thigh, shin, pulling
export function leg(thighDeg, shinDeg, pull = 0) {
  const w = 240, h = 244;
  const hip = [110, 52];
  const dirOf = (deg) => [Math.sin(rad(deg)), Math.cos(rad(deg))];
  const d = dirOf(thighDeg), f = [d[1], -d[0]]; // along the thigh; its front
  const n = 80, sn = 72;
  const knee = [hip[0] + d[0] * n, hip[1] + d[1] * n];
  const sd = dirOf(shinDeg), sf = [sd[1], -sd[0]]; // along the shin; its front
  const ankle = [knee[0] + sd[0] * sn, knee[1] + sd[1] * sn];
  const th = (x, y) => [(x - hip[0]) * d[0] + (y - hip[1]) * d[1], (x - hip[0]) * f[0] + (y - hip[1]) * f[1]];
  const sh = (x, y) => [(x - knee[0]) * sd[0] + (y - knee[1]) * sd[1], (x - knee[0]) * sf[0] + (y - knee[1]) * sf[1]];
  const thighR = (a) => 23 - (6 * Math.max(0, Math.min(n, a))) / n;
  const thigh = (x, y) => {
    const [a, b] = th(x, y);
    return (a >= 0 && a <= n && Math.abs(b) <= thighR(a) + (b > 0 ? pull : 0)) || Math.hypot(a - n, b) <= thighR(n);
  };
  const buttock = ellipse(hip[0] - 7, hip[1] - 2, 29, 26);
  const shin = capsule(...knee, ...ankle, 15, 9);
  const calf = (x, y) => {
    const [a, b] = sh(x, y);
    return a > 6 && a < sn - 12 && b < 0 && b > -(9 + 10 * Math.sin((Math.PI * (a - 6)) / (sn - 18)));
  };
  const skin = union(thigh, buttock, shin, calf);
  const foot = [ankle[0] + sf[0] * 22, ankle[1] + sf[1] * 22];
  const shoeM = union(capsule(ankle[0] + sd[0] * 3, ankle[1] + sd[1] * 3, foot[0], foot[1], 8), capsule(ankle[0] + sd[0] * 8 - sf[0] * 5, ankle[1] + sd[1] * 8 - sf[1] * 5, foot[0] + sd[0] * 5, foot[1] + sd[1] * 5, 4));
  const spr = blank(w, h);
  const M = (fn) => mask(w, h, fn);
  const ms = M(skin);
  const shorts = (x, y) => th(x, y)[0] < 34 || buttock(x, y);
  paint(spr, ms, (x, y) => (shorts(x + 0.5, y + 0.5) ? (dither(x, y, 0.2) ? V : N) : shade(E, W, I, (x - hip[0]) / 150 + (y - hip[1]) / 190 - 0.15, x, y, { hi: -0.6, lo: 0.62 })));
  const inside = (fn) => (x, y) => {
    for (const [ox, oy] of [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, 2], [2, -2], [-2, -2]]) if (!fn(x + ox, y + oy)) return false;
    return true;
  };
  const inner = inside(skin);
  paint(spr, M(inner), O); // fat, a pixel under the skin
  const deep = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([ox, oy]) => inner(x + ox, y + oy));
  paint(spr, M(deep), I); // the sheets between the muscles
  const femur = (x, y) => {
    const [a, b] = th(x, y);
    return a > -6 && a < n - 5 && Math.abs(b + 2) <= 4 + (a > n - 15 ? (a - n + 15) * 0.3 : 0);
  };
  const quad = (x, y) => {
    const [a, b] = th(x, y);
    return deep(x, y) && b >= 4 && a < n - 4 && a > -14;
  };
  const ham = (x, y) => {
    const [a, b] = th(x, y);
    return deep(x, y) && b <= -7 && a < n - 2;
  };
  const glute = (x, y) => deep(x, y) && buttock(x, y) && th(x, y)[1] < -6;
  const mg = M(glute);
  paint(spr, mg, (x, y) => ((x + y) % 5 === 0 ? N : P));
  const mq = M(quad);
  paint(spr, mq, (x, y) => {
    const [a, b] = th(x + 0.5, y + 0.5);
    if (Math.round(b) % 4 === 0 && a > 8 && a < n - 10) return P; // its fibres, running along the thigh
    return shade(R, I, P, -b / 26 + a / n - 0.55 - pull * 0.15, x, y, { hi: -0.75, lo: 0.25, band: 0.2 });
  });
  paint(spr, edge(mq, w, h), P);
  const mh = M(ham);
  paint(spr, mh, (x, y) => (Math.round(th(x + 0.5, y + 0.5)[1]) % 4 === 0 ? N : P));
  paint(spr, edge(mh, w, h), N);
  const mc = M((x, y) => deep(x, y) && calf(x, y));
  paint(spr, mc, (x, y) => (Math.round(sh(x + 0.5, y + 0.5)[1]) % 4 === 0 ? N : P));
  paint(spr, edge(mc, w, h), N);
  const tibia = (x, y) => {
    const [a, b] = sh(x, y);
    return a > 6 && a < sn - 2 && b > 0 && b < 6;
  };
  const pelvis = ellipse(hip[0] - 5, hip[1] - 7, 11, 7, -20);
  for (const bone of [femur, tibia, pelvis]) {
    const mb = M((x, y) => bone(x, y) && inner(x, y));
    paint(spr, mb, (x, y) => (dither(x, y, 0.2) && th(x, y)[1] < -3 ? Y : W));
    paint(spr, edge(mb, w, h), D);
  }
  const patella = ellipse(knee[0] + f[0] * 16 - d[0] * 2, knee[1] + f[1] * 16 - d[1] * 2, 4, 6, Math.atan2(d[1], d[0]) * 57.3);
  const mp = M(patella);
  paint(spr, mp, W);
  paint(spr, edge(mp, w, h), D);
  paint(spr, edge(ms, w, h), N);
  const msh = M(shoeM);
  paint(spr, msh, (x, y) => ((x - ankle[0]) * sd[0] + (y - ankle[1]) * sd[1] > 12 ? N : W));
  paint(spr, edge(msh, w, h), N);
  const q = [hip[0] + d[0] * n * 0.5 + f[0] * 14, hip[1] + d[1] * n * 0.5 + f[1] * 14];
  let low = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (spr.d[y * w + x] !== 255) low = Math.max(low, y);
  return { ...spr, quad: [Math.round(q[0]), Math.round(q[1])], low, hip };
}

// ── The body as a level map ─────────────────────────────────────────────────────────────────────────────────────
// The player standing, front on: a big silhouette with the heart in the chest (to the viewer's right of the middle:
// the body's left), the thigh muscles, the main artery from the heart down to both thighs, and the nervous system the
// film needs: the brain with its brainstem, and the spinal cord, drawn beside the aorta, not on it. Rasterised at
// scale k from one shape, so a bigger copy is redrawn at the same pixel size, never enlarged.
export function bodyMap(k = 1) {
  const cx0 = 75;
  const sil = union(ellipse(cx0, 22, 16, 19), box(cx0 - 6, 38, cx0 + 6, 50), capsule(cx0 - 28, 56, cx0 + 28, 56, 9), capsule(cx0 - 21, 64, cx0 + 21, 64, 13), capsule(cx0 - 15, 84, cx0 + 15, 84, 12), capsule(cx0 - 15, 104, cx0 + 15, 104, 12), capsule(cx0 - 36, 58, cx0 - 44, 100, 7, 6), capsule(cx0 - 44, 100, cx0 - 47, 132, 6, 5), capsule(cx0 + 36, 58, cx0 + 44, 100, 7, 6), capsule(cx0 + 44, 100, cx0 + 47, 132, 6, 5), ellipse(cx0 - 48, 136, 5, 6), ellipse(cx0 + 48, 136, 5, 6), capsule(cx0 - 13, 114, cx0 - 16, 168, 12, 9), capsule(cx0 - 16, 168, cx0 - 17, 206, 8, 6), capsule(cx0 + 13, 114, cx0 + 16, 168, 12, 9), capsule(cx0 + 16, 168, cx0 + 17, 206, 8, 6), box(cx0 - 25, 204, cx0 - 10, 212), box(cx0 + 10, 204, cx0 + 25, 212));
  const w = Math.round(150 * k), h = Math.round(222 * k);
  const U = (fn) => (x, y) => fn(x / k, y / k);
  const spr = blank(w, h);
  const m = mask(w, h, U(sil));
  paint(spr, m, (x, y) => shade(E, W, I, ((x / k - cx0) / 50 + (y / k - 100) / 160), x, y, { hi: -0.95, lo: 0.62, band: 0.12 }));
  paint(spr, edge(m, w, h), N);
  const thighs = U(union(ellipse(cx0 - 16, 140, 8, 20, -4), ellipse(cx0 + 16, 140, 8, 20, 4)));
  const mt = mask(w, h, thighs);
  paint(spr, mt, (x, y) => ((y % 4) === 0 ? P : R));
  paint(spr, edge(mt, w, h), P);
  const S = ([x, y]) => [Math.round(x * k), Math.round(y * k)];
  return { ...spr, k, cx: Math.round(cx0 * k), heart: S([cx0 + 7, 62]), thighs: [S([cx0 - 16, 140]), S([cx0 + 16, 140])], brain: S([cx0, 17]), stem: S([cx0, 37]), hip: S([cx0, 108]) };
}
// The main artery on the map, from the heart down to each thigh (the aorta, then each iliac and femoral artery).
export const ARTERY = (b) => {
  const k = b.k, cx = b.cx;
  const P_ = (x, y) => [Math.round(x), Math.round(y)];
  const [hx, hy] = b.heart;
  const trunk = [P_(hx - 3 * k, hy - 8 * k), P_(cx - 2 * k, hy - 12 * k), P_(cx - 2 * k, hy + 6 * k), P_(cx - 2 * k, 108 * k)];
  return [trunk.concat([P_(cx - 8 * k, 116 * k), P_(cx - 14 * k, 124 * k), P_(cx - 15 * k, 150 * k)]), trunk.concat([P_(cx + 8 * k, 116 * k), P_(cx + 14 * k, 124 * k), P_(cx + 15 * k, 150 * k)])];
};
// The nerves the film follows: from each thigh muscle up the spinal cord (beside the aorta) to the brainstem; and from
// the brainstem down to the heart.
export const NERVES = (b) => {
  const k = b.k, cx = b.cx;
  const P_ = (x, y) => [Math.round(x), Math.round(y)];
  const spine = cx + 4 * k;
  const up = b.thighs.map(([x, y], i) => [P_(x + (i ? 5 : -5) * k, y + 10 * k), P_(x + (i ? 4 : -4) * k, y - 20 * k), P_(spine, 112 * k), P_(spine, 50 * k), P_(b.stem[0] + 2 * k, b.stem[1] + 4 * k)]);
  const down = [P_(b.stem[0] + 3 * k, b.stem[1] + 3 * k), P_(spine + 2 * k, 46 * k), P_(b.heart[0] - 2 * k, b.heart[1] - 6 * k)];
  return { up, down };
};

// ── Blood, oxygen, muscle ────────────────────────────────────────────────────────────────────────────────────────
// A red blood cell, a biconcave disc, in the drawings of a tumble: face on (round, its thin middle pale), turned
// three quarters (an oval, the pale middle to one side), and edge on (a bar pinched in the middle).
export function cell(w = 20, h = 12, view = "edge") {
  const spr = blank(w, h);
  const cx = w / 2, cy = h / 2;
  const disc = view === "face" ? ellipse(cx, cy, Math.min(w, h) / 2, Math.min(w, h) / 2) : view === "turn" ? ellipse(cx, cy, w / 2 - 1, h / 2 - 1, -12) : (x, y) => Math.abs(x - cx) <= w / 2 && Math.abs(y - cy) <= (h / 2) * (0.55 + 0.45 * ((x - cx) / (w / 2)) ** 2) && ellipse(cx, cy, w / 2, h / 2)(x, y);
  const m = mask(w, h, disc);
  const l = lit(cx, cy, w / 2);
  paint(spr, m, (x, y) => shade(R, I, P, l(x + 0.5, y + 0.5), x, y, { hi: -0.5, lo: 0.42 }));
  if (view === "face") paint(spr, mask(w, h, ellipse(cx + 0.5, cy + 0.5, h * 0.2, h * 0.2)), I);
  if (view === "turn") paint(spr, mask(w, h, ellipse(cx + 1.5, cy + 0.5, w * 0.14, h * 0.18, -12)), I);
  paint(spr, edge(m, w, h), P);
  return spr;
}
export const O2 = sprite(["wsssss", "ssssss", "ssssss", "ssssss", "ssssss", "ssssnn"], { w: W, s: S, n: N });
export const O2S = sprite(["wss", "sss", "ssn"], { w: W, s: S, n: N });
// A muscle fibre: a long red cylinder with its bands (the striations), shorter and a little fatter when it pulls.
export function fibre(len, r, pull = 0) {
  const w = len, h = 2 * r + 3;
  const spr = blank(w, h);
  const m = mask(w, h, capsule(r + 1, r + 1, w - r - 2, r + 1, r));
  const bands = Math.round((len - 2 * r) / 6);
  paint(spr, m, (x, y) => {
    const t = (x - r) / ((len - 2 * r) / bands);
    if (Math.abs(t - Math.round(t)) < 0.12) return P;
    return shade(R, I, P, (y - r) / r * 0.9, x, y, { hi: -0.62, lo: 0.45, band: 0.25 });
  });
  paint(spr, edge(m, w, h), P);
  return spr;
}
// A one-litre bottle: glass outline, cap, and red to `level` (0 to 1) of its body, computed, never by eye.
export function bottle(w, h, level) {
  const spr = blank(w, h);
  const neck = Math.max(4, Math.round(w * 0.36));
  const nx = Math.round((w - neck) / 2);
  const shoulder = Math.round(h * 0.26);
  const body = (x, y) => (y >= shoulder ? x >= 0 && x < w : y >= Math.round(h * 0.12) && x >= nx - Math.round(((y - Math.round(h * 0.12)) / (shoulder - Math.round(h * 0.12))) * nx) && x < w - nx + Math.round(((y - Math.round(h * 0.12)) / (shoulder - Math.round(h * 0.12))) * nx));
  const m = mask(w, h, (x, y) => body(Math.floor(x), Math.floor(y)) && y < h);
  paint(spr, m, N);
  paint(spr, edge(m, w, h), W);
  // the cap
  for (let y = 0; y < Math.round(h * 0.12); y++) for (let x = nx; x < w - nx; x++) spr.d[y * w + x] = Y;
  // the liquid: its height a fraction of the body's inside, rounded to whole pixels
  const top = shoulder + 1, bottom = h - 2, inside = bottom - top + 1;
  const filled = Math.round(inside * level);
  for (let y = bottom - filled + 1; y <= bottom; y++) for (let x = 1; x < w - 1; x++) spr.d[y * w + x] = y === bottom - filled + 1 && filled > 1 ? I : R;
  // a glint down the glass
  for (let y = top; y < bottom - 1; y++) if (spr.d[y * w + 2] === N) spr.d[y * w + 2] = D;
  return spr;
}
export function brain(w = 26, h = 18, glow = false, stem = 0) {
  const spr = blank(w, h + stem);
  const H = h + stem;
  const m = mask(w, H, union(ellipse(w * 0.36, h * 0.52, w * 0.36, h * 0.46), ellipse(w * 0.64, h * 0.5, w * 0.36, h * 0.48)));
  paint(spr, m, (x, y) => ((x * 3 + y * 5) % 11 === 0 || (x * 7 + y * 2) % 13 === 0 ? I : P));
  paint(spr, mask(w, H, box(w / 2 - 0.5, 2, w / 2 + 0.5, h - 3)), N);
  paint(spr, edge(m, w, H), N);
  if (stem) {
    // the brainstem, under the brain, into the neck: where the heart's centres are
    const ms = mask(w, H, box(w / 2 - 2, h - 4, w / 2 + 2, H));
    paint(spr, ms, glow ? Yl : P);
    paint(spr, edge(ms, w, H), glow ? O : N);
  }
  return spr;
}
