// "How does a neural network learn?" in the Neon Line template. Built from storyboard.json: every time below is a
// shot's start or end (s.sNN), or a beat of the 96 BPM bed counted from one.
//
// The picture is one canvas, drawn every frame from the timeline's time, so any frame can be seeked and drawn alone:
// the near-black stage, a perspective floor that flies with the camera, and every line, node, pulse and label as a
// thin glowing line. A glow pass (the frame's light blurred at quarter size and added back) gives every line its
// halo; a chromatic pass splits red and blue a few pixels apart toward the edges of the frame (template.md, Finish);
// the renderer adds the bloom and the grain.
//
// The numbers are real. net.json is written by net.py, which trains the film's toy network (the same run as the fact
// sheet, n3 to n8): every line's width is the size of its weight at that moment, the guess, the error, the nudged
// weight, the second guess, the error curve, the final answers and the trained widths are read from it.
//
// Colour keeps one meaning all film: cyan is the network (its lines, its nodes, the guess it gives), magenta is the
// error and everything it sends back (the gap, the backward pulses, the nudge arrows), white is type and the
// examples. Line width means weight.
import { createFilm } from "../../kit/engine/motion.js";

const storyboard = await (await fetch("storyboard.json")).json();
const NET = await (await fetch("net.json")).json();
const film = await createFilm({ storyboard });
const { $, shots: s, duration: D } = film;
film.captions();

// Every event the picture makes (a line drawn, a pulse fired or arriving, a word lit) is logged with its time:
// render.mjs --events writes them to events.json and cues.build.py puts a sound on each.
const LOG = (window.__events = []);
const ev = (kind, at, end = at, more = {}) => LOG.push({ kind, at: +at.toFixed(3), end: +end.toFixed(3), ...more });

// ── Time ────────────────────────────────────────────────────────────────────────────────────────────────────────
const W = 1080, H = 1920, TAU = Math.PI * 2, BEAT = 60 / 96;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const E = {
  lin: (k) => k,
  out2: (k) => 1 - (1 - k) ** 2,
  out3: (k) => 1 - (1 - k) ** 3,
  in2: (k) => k * k,
  in3: (k) => k ** 3,
  io2: (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2),
  io3: (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2),
  outExpo: (k) => (k >= 1 ? 1 : 1 - 2 ** (-10 * k)),
  outBack: (k) => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2,
};
// 0 before t0, 1 after t0 + d, eased between.
const ramp = (t, t0, d, e = E.io3) => (d <= 0 ? (t >= t0 ? 1 : 0) : e(clamp((t - t0) / d)));
// A neon tube powering up: two quick flickers, then steady. And the reverse, for a glow that dies.
const flick = (dt) => (dt < 0 ? 0 : dt < 0.034 ? 0.85 : dt < 0.067 ? 0.12 : dt < 0.1 ? 1 : dt < 0.15 ? 0.45 : 1);
const flickOff = (dt) => (dt < 0 ? 1 : dt < 0.05 ? 0.35 : dt < 0.1 ? 0.9 : dt < 0.14 ? 0.12 : dt < 0.2 ? 0.5 : 0);
// On at `on` (with a flicker, or a fade of fi), off at `off` (a fade of fo).
const life = (t, on, off = Infinity, { fi = 0, fo = 0.25, flicker = true } = {}) =>
  (flicker ? flick(t - on) : ramp(t, on, fi, E.out2)) * (1 - ramp(t, off, fo, E.in2));
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};

// ── Colour ──────────────────────────────────────────────────────────────────────────────────────────────────────
const CY = "#00f5d4", MG = "#f15bb5", WH = "#e9fffb", BG = "#07070c";
const rgbOf = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const RGB = { [CY]: rgbOf(CY), [MG]: rgbOf(MG), [WH]: rgbOf(WH), [BG]: rgbOf(BG) };
const rgba = (c, a = 1) => {
  const [r, g, b] = Array.isArray(c) ? c : (RGB[c] ?? rgbOf(c));
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
};
const mixC = (c1, c2, k) => {
  const a = Array.isArray(c1) ? c1 : RGB[c1] ?? rgbOf(c1), b = Array.isArray(c2) ? c2 : RGB[c2] ?? rgbOf(c2);
  return [0, 1, 2].map((i) => lerp(a[i], b[i], k));
};
// The bright core of a neon tube: its colour run three quarters of the way to white.
const coreOf = (c) => rgba(mixC(c, [255, 255, 255], 0.72));

// ── Canvases ────────────────────────────────────────────────────────────────────────────────────────────────────
const main = $("#neon");
const m = main.getContext("2d");
const canvas = (w, h) => {
  const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
  return [c, c.getContext("2d")];
};
const [C, g] = canvas(W, H); // the lit things, on transparent: what glows and what the camera moves
const [T, gt] = canvas(W, H); // the lettering: its own layer, with a lighter glow, so the letterforms stay crisp
const [Q, q] = canvas(W / 4, H / 4);
const [Q2, q2] = canvas(W / 4, H / 4);
const [Q3, q3] = canvas(W / 8, H / 8);
const [CR, cr] = canvas(W, H);
const [CB, cb] = canvas(W, H);
for (const c of [q, q2, q3]) c.imageSmoothingQuality = "high";

// The camera: the world point (wx, wy) is shown at the frame's (sx, sy), at zoom z. The world is drawn in the frame's
// own coordinates, so the identity camera (wx = sx, wy = sy, z = 1) shows it as laid out. View sets both layers.
const cam = { wx: 497, wy: 785, z: 1, sx: 497, sy: 785 };
const setView = (a, e, f) => {
  g.setTransform(a, 0, 0, a, e, f);
  gt.setTransform(a, 0, 0, a, e, f);
};
const toWorld = () => setView(cam.z, cam.sx - cam.wx * cam.z, cam.sy - cam.wy * cam.z);
const toScreen = () => setView(1, 0, 0); // the heads-up layer: notes and counters that do not move with the camera

// ── Drawing: every shape is a line ──────────────────────────────────────────────────────────────────────────────
// A glowing line from (x0, y0) to (x1, y1), trimmed r0 and r1 from its ends (so it meets a node's ring), drawn from
// k0 to k1 of its length: a tube of colour with a whiter core.
function tube(w, col, a) {
  g.globalAlpha = a;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = rgba(col);
  g.lineWidth = w;
  g.stroke();
  if (w >= 2.2) {
    g.globalAlpha = a * 0.85;
    g.strokeStyle = coreOf(col);
    g.lineWidth = Math.max(0.9, w * 0.34);
    g.stroke();
  }
}
function line(x0, y0, x1, y1, { w = 3.5, col = CY, a = 1, k0 = 0, k1 = 1, r0 = 0, r1 = 0 } = {}) {
  if (a <= 0.004 || k1 <= k0) return;
  const L = Math.hypot(x1 - x0, y1 - y0);
  if (L < 1e-6) return;
  const ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  const sx = x0 + ux * r0, sy = y0 + uy * r0, ex = x1 - ux * r1, ey = y1 - uy * r1;
  g.beginPath();
  g.moveTo(lerp(sx, ex, k0), lerp(sy, ey, k0));
  g.lineTo(lerp(sx, ex, k1), lerp(sy, ey, k1));
  tube(w, col, a);
}
// A point part way along a trimmed line.
const along = (x0, y0, x1, y1, k, r0 = 0, r1 = 0) => {
  const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  return [lerp(x0 + ux * r0, x1 - ux * r1, k), lerp(y0 + uy * r0, y1 - uy * r1, k)];
};
// A node: a ring, its inside the stage's black (it hides the lines behind it), lit from within when `lit`.
function ring(x, y, r, { w = 5, col = CY, a = 1, lit = 0, k = 1, hollow = false } = {}) {
  if (a <= 0.004 || r <= 0.2) return;
  g.globalAlpha = a;
  g.fillStyle = BG;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  if (!hollow) g.fill();
  if (lit > 0.01) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(col, 0.6 * lit));
    gr.addColorStop(1, rgba(col, 0.1 * lit));
    g.fillStyle = gr;
    g.fill();
  }
  g.beginPath();
  g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * k);
  tube(w * (1 + 0.35 * lit), col, a);
}
// A pulse: a white-hot point with a halo of its colour, and a short streak behind it when it moves fast.
function pulse(x, y, r, { col = CY, a = 1, dx = 0, dy = 0 } = {}) {
  if (a <= 0.004 || r <= 0.2) return;
  if (dx || dy) {
    g.beginPath();
    g.moveTo(x - dx, y - dy);
    g.lineTo(x, y);
    const gr = g.createLinearGradient(x - dx, y - dy, x, y);
    gr.addColorStop(0, rgba(col, 0));
    gr.addColorStop(1, rgba(col, 0.9 * a));
    g.globalAlpha = 1;
    g.strokeStyle = gr;
    g.lineWidth = r * 0.9;
    g.lineCap = "round";
    g.stroke();
  }
  const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.2);
  gr.addColorStop(0, rgba([255, 255, 255], a));
  gr.addColorStop(0.22, rgba(mixC(col, [255, 255, 255], 0.6), a));
  gr.addColorStop(0.5, rgba(col, 0.55 * a));
  gr.addColorStop(1, rgba(col, 0));
  g.globalAlpha = 1;
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r * 2.2, 0, TAU);
  g.fill();
}
// Lettering, in the template's wide geometric sans. `n` letters of it are lit (written on); `wide` spaces it out.
const FONT = (size, weight = 500) => `${weight} ${size}px "Space Grotesk", sans-serif`;
function label(str, x, y, { size = 44, col = WH, a = 1, align = "center", weight = 500, n = Infinity, spacing = 0, knock = false } = {}) {
  if (a <= 0.004 || !str) return;
  gt.font = FONT(size, weight);
  gt.letterSpacing = `${spacing}px`;
  const full = gt.measureText(str).width;
  const shown = n >= str.length ? str : str.slice(0, Math.max(0, Math.floor(n)));
  const left = align === "center" ? x - full / 2 : align === "end" ? x - full : x;
  gt.textAlign = "left";
  gt.textBaseline = "alphabetic";
  gt.globalAlpha = a;
  if (knock) {
    // a rim of the stage's black round the letters, so a line behind the label does not run through it
    gt.strokeStyle = BG;
    gt.lineWidth = size * 0.32;
    gt.lineJoin = "round";
    gt.strokeText(shown, left, y);
  }
  gt.fillStyle = rgba(col);
  gt.fillText(shown, left, y);
  gt.letterSpacing = "0px";
  return full;
}
const textWidth = (str, size, weight = 500) => {
  gt.font = FONT(size, weight);
  return gt.measureText(str).width;
};
// A short arrow: a line and a chevron.
function arrow(x0, y0, x1, y1, { w = 4, col = MG, a = 1, head = 14 } = {}) {
  line(x0, y0, x1, y1, { w, col, a });
  const ang = Math.atan2(y1 - y0, x1 - x0);
  g.beginPath();
  g.moveTo(x1 - Math.cos(ang - 0.6) * head, y1 - Math.sin(ang - 0.6) * head);
  g.lineTo(x1, y1);
  g.lineTo(x1 - Math.cos(ang + 0.6) * head, y1 - Math.sin(ang + 0.6) * head);
  tube(w, col, a);
}
// A path (SVG path data in its own coordinates) drawn on from its start: k of its length.
const svgNS = "http://www.w3.org/2000/svg";
const measure = document.createElementNS(svgNS, "path");
function shape(d) {
  return d.split(/(?=M)/).map((part) => {
    measure.setAttribute("d", part);
    return { p: new Path2D(part), len: measure.getTotalLength() };
  });
}
function drawShape(sh, x, y, sc, { w = 5, col = WH, a = 1, k = 1 } = {}) {
  if (a <= 0.004 || k <= 0) return;
  const total = sh.reduce((n, piece) => n + piece.len, 0);
  let left = k * total;
  g.save();
  g.translate(x, y);
  g.scale(sc, sc);
  for (const piece of sh) {
    if (left <= 0) break;
    const show = Math.min(piece.len, left);
    left -= piece.len;
    g.setLineDash(show >= piece.len ? [] : [show, piece.len + 10]);
    g.globalAlpha = a;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = rgba(col);
    g.lineWidth = w / sc;
    g.stroke(piece.p);
    g.globalAlpha = a * 0.8;
    g.strokeStyle = coreOf(col);
    g.lineWidth = Math.max(0.9, (w * 0.34)) / sc;
    g.stroke(piece.p);
  }
  g.setLineDash([]);
  g.restore();
}
// A rounded rectangle traced from its top centre, clockwise: a point at u (0..1) of the way round. A circle is the
// case hw = hh = rr, so the loop arrow of the recap can open into the phone of the first shot.
function rrectAt(cx, cy, hw, hh, rr, u) {
  const sx = Math.max(0, hw - rr), sy = Math.max(0, hh - rr), q4 = (Math.PI / 2) * rr;
  const parts = [sx, q4, 2 * sy, q4, 2 * sx, q4, 2 * sy, q4, sx];
  const total = parts.reduce((a, b) => a + b, 0);
  let d = (((u % 1) + 1) % 1) * total;
  const arc = (ox, oy, a0, k) => [ox + Math.cos(a0 + (k * Math.PI) / 2) * rr, oy + Math.sin(a0 + (k * Math.PI) / 2) * rr];
  const steps = [
    (k) => [cx + k * sx, cy - hh],
    (k) => arc(cx + sx, cy - sy, -Math.PI / 2, k),
    (k) => [cx + hw, cy - sy + k * 2 * sy],
    (k) => arc(cx + sx, cy + sy, 0, k),
    (k) => [cx + sx - k * 2 * sx, cy + hh],
    (k) => arc(cx - sx, cy + sy, Math.PI / 2, k),
    (k) => [cx - hw, cy + sy - k * 2 * sy],
    (k) => arc(cx - sx, cy - sy, Math.PI, k),
    (k) => [cx - sx + k * sx, cy - hh],
  ];
  for (let i = 0; i < parts.length; i++) {
    if (d <= parts[i] || i === parts.length - 1) return steps[i](parts[i] > 0 ? clamp(d / parts[i]) : 0);
    d -= parts[i];
  }
  return [cx, cy - hh];
}
function rrect(cx, cy, hw, hh, rr, { from = 0, k = 1, w = 6, col = CY, a = 1, n = 220 } = {}) {
  if (a <= 0.004 || k <= 0) return null;
  g.beginPath();
  let last;
  for (let i = 0; i <= n; i++) {
    last = rrectAt(cx, cy, hw, hh, rr, from + (k * i) / n);
    if (i) g.lineTo(...last);
    else g.moveTo(...last);
  }
  if (k >= 1) g.closePath();
  tube(w, col, a);
  return last;
}

// ── The stage: near-black, a halo where the light is, and a perspective floor that flies ───────────────────────
// The floor scrolls toward the viewer at a slow pace and faster on every camera move (a push flies forward, a pull
// back flies backward). Its travel over the whole film is a whole number of grid lines, so it meets itself at the
// loop seam.
const FLIGHTS = [
  [s.s04.start, 0.95, 1.4], // push through the phone
  [s.s05.start - 0.55, 0.6, 1.1], // push in on two lines
  [s.s06.start - 0.5, 0.9, -1.0], // pull back to the toy
  [s.s14.start + 2.0, 1.1, 2.2], // the rounds speed up
  [s.s15.start - 0.1, 0.4, 0.8], // collapse into the chart
  [s.s18.start + 0.5, 0.7, -2.4], // pull far back: a million weights
  [s.s18.start + 1.75, 0.7, -2.4], // and again: 175 billion
  [s.s20.start + 0.15, 1.0, 1.4], // the loop opens into the phone
];
const smoothInt = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * k * (k * (6 * k - 15) + 10));
const travel0 = (t) => FLIGHTS.reduce((n, [t0, d, amt]) => n + amt * smoothInt((t - t0) / d), 0);
const SPEED = (Math.round(0.6 * D + travel0(D)) - travel0(D)) / D; // a whole number of lines over the film
// ... and it flies with the camera: a push in travels forward, a pull back backward (camZoom is 1 at both ends)
const travel = (t) => SPEED * t + travel0(t) + 4.5 * Math.log(camAt(t).z);

const HORIZON = 1470;
function floor(t) {
  const off = ((travel(t) % 1) + 1) % 1;
  m.lineWidth = 2;
  // Lines across: at depths z = 1, 2, 3 ... (moving toward the viewer as the floor travels).
  for (let k = 0; k < 26; k++) {
    const z = k + 1 - off;
    if (z < 0.35) continue;
    const y = HORIZON + 470 / z;
    if (y > H + 4) continue;
    const a = 0.42 * clamp(1 - z / 22) * clamp((y - HORIZON) / 60);
    m.strokeStyle = rgba(MG, a);
    m.beginPath();
    m.moveTo(0, y);
    m.lineTo(W, y);
    m.stroke();
  }
  // Lines into the distance, toward the vanishing point on the horizon.
  const fade = m.createLinearGradient(0, HORIZON, 0, H);
  fade.addColorStop(0, rgba(MG, 0));
  fade.addColorStop(0.25, rgba(MG, 0.14));
  fade.addColorStop(1, rgba(MG, 0.34));
  m.strokeStyle = fade;
  for (let i = -9; i <= 9; i++) {
    m.beginPath();
    m.moveTo(540 + i * 6, HORIZON);
    m.lineTo(540 + i * 165, H + 10);
    m.stroke();
  }
}
// The stage light: a soft halo behind the subject, cyan for the network, turning magenta while the error is on
// screen (s10 to s11, and the error curve in s15).
const errorLight = (t) =>
  Math.max(
    ramp(t, s.s10.start + 0.05, 0.5) * (1 - ramp(t, s.s12.start + 0.2, 0.8)),
    ramp(t, s.s15.start + 0.1, 0.5) * (1 - ramp(t, s.s16.start, 0.5)),
  );
function halo(t, x, y, strength) {
  const col = mixC(CY, MG, errorLight(t));
  const gr = m.createRadialGradient(x, y, 0, x, y, 760);
  gr.addColorStop(0, rgba(col, 0.1 * strength));
  gr.addColorStop(0.5, rgba(col, 0.035 * strength));
  gr.addColorStop(1, rgba(col, 0));
  m.fillStyle = gr;
  m.fillRect(0, 0, W, H);
}

// ── The phone and the network inside it (s01, s02, s04, s20) ───────────────────────────────────────────────────
// Four rows (4, 5, 5, 3), every node joined to every node of the next row, inside a phone drawn as one outline.
const PL = [[330, 470, 610, 750], [310, 425, 540, 655, 770], [310, 425, 540, 655, 770], [380, 540, 700]];
const PY = [430, 640, 850, 1060];
const PR = 22;
// The pulses: two waves a period apart by half, each three pulses racing down a path of nodes chosen per cycle. The
// period divides the film's length (47 cycles) and the choice repeats every 47 cycles, so the last frame leads into
// the first.
const PERIOD = 1.25, PHASE0 = 0.35, CYCLES = Math.round(D / PERIOD);
function wavePaths(c, w) {
  const r = rng((((c % CYCLES) + CYCLES) % CYCLES) * 2 + w + 101);
  const used = new Set();
  const paths = [];
  while (paths.length < 3) {
    const a = Math.floor(r() * 4);
    if (used.has(a)) continue;
    used.add(a);
    paths.push([a, Math.floor(r() * 5), Math.floor(r() * 5), Math.floor(r() * 3)]);
  }
  return paths;
}
// Every pulse on screen at t (row gap, path) and how bright each node flares (from the last arrival).
function phoneSignal(t) {
  const pulses = [];
  const flare = PL.map((row) => row.map(() => 0));
  for (let w = 0; w < 2; w++) {
    const v = t / PERIOD + PHASE0 + w / 2;
    const c = Math.floor(v), phi = v - c;
    for (const [cc, ph] of [[c, phi], [c - 1, phi + 1]]) {
      for (const path of wavePaths(cc, w)) {
        if (ph < 1) {
          const gap = Math.floor(ph * 3), u = ph * 3 - gap;
          pulses.push({ gap, from: path[gap], to: path[gap + 1], u });
        }
        for (let row = 0; row < 4; row++) {
          const dt = (ph - row / 3) * PERIOD;
          if (dt >= 0) flare[row][path[row]] = Math.max(flare[row][path[row]], Math.exp(-dt / 0.16));
        }
      }
    }
  }
  return { pulses, flare };
}
// The phone's outline, at a place and scale. `k` of it drawn, the rest (speaker, camera, buttons, bar) at `extras`.
function phoneOutline(cx, cy, sc, { a = 1, k = 1, extras = 1, w = 6 } = {}) {
  const T = (x, y) => [cx + (x - 540) * sc, cy + (y - 760) * sc];
  rrect(cx, cy, 290 * sc, 490 * sc, 60 * sc, { k, w: w * Math.min(1.4, Math.max(0.6, sc)), a });
  const ea = a * extras;
  if (ea <= 0.004) return;
  const lw = 5 * Math.min(1.4, Math.max(0.6, sc));
  line(...T(492, 312), ...T(588, 312), { w: lw, a: ea }); // the speaker slot
  ring(...T(626, 312), 7 * sc, { w: lw * 0.8, a: ea }); // the front camera
  line(...T(240, 430), ...T(240, 510), { w: lw, a: ea }); // volume up
  line(...T(240, 540), ...T(240, 620), { w: lw, a: ea }); // volume down
  line(...T(840, 470), ...T(840, 570), { w: lw, a: ea }); // power
  line(...T(490, 1218), ...T(590, 1218), { w: lw * 0.8, a: ea * 0.8 }); // the home bar
}
// The network: `rows` the alpha of each row's nodes, `gaps` how much of each row of lines is drawn, `sweep` a bright
// pass running down the rows (the lines redrawn), `pul` the pulses' alpha.
function phoneNet(t, { cx = 540, cy = 760, sc = 1, a = 1, rows = [1, 1, 1, 1], gaps = [1, 1, 1], sweep = -9, pul = 1, flickerLines = 1 } = {}) {
  if (a <= 0.004) return;
  const T = (x, y) => [cx + (x - 540) * sc, cy + (y - 760) * sc];
  const r = PR * sc;
  const sig = phoneSignal(t);
  for (let gp = 0; gp < 3; gp++) {
    if (gaps[gp] <= 0) continue;
    const boost = Math.exp(-(((sweep - gp - 0.5) / 0.55) ** 2));
    for (const x0 of PL[gp]) {
      for (const x1 of PL[gp + 1]) {
        const [ax, ay] = T(x0, PY[gp]), [bx, by] = T(x1, PY[gp + 1]);
        line(ax, ay, bx, by, { w: (3.4 + 2.2 * boost) * Math.min(1.5, sc), a: a * flickerLines * (0.62 + 0.38 * boost), k1: gaps[gp], r0: r, r1: r });
      }
    }
  }
  PL.forEach((row, ri) => {
    row.forEach((x, ni) => {
      const fl = sig.flare[ri][ni] * pul;
      ring(...T(x, PY[ri]), r * (1 + 0.12 * fl), { w: 4.5 * Math.min(1.5, sc), a: a * rows[ri], lit: fl });
    });
  });
  if (pul > 0.004) {
    for (const p of sig.pulses) {
      if (gaps[p.gap] < 1) continue;
      const [ax, ay] = T(PL[p.gap][p.from], PY[p.gap]), [bx, by] = T(PL[p.gap + 1][p.to], PY[p.gap + 1]);
      const [x, y] = along(ax, ay, bx, by, p.u, r, r);
      const L = Math.hypot(bx - ax, by - ay) || 1;
      pulse(x, y, 7 * sc, { a: a * pul, dx: ((bx - ax) / L) * 26 * sc * Math.min(1, p.u * 4), dy: ((by - ay) / L) * 26 * sc * Math.min(1, p.u * 4) });
    }
  }
}

// ── The toy network (s06 to s17): three yes/no questions in, three hidden neurons, one guess out ────────────────
const IN = [[200, 500], [497, 500], [794, 500]], HID = [[200, 790], [497, 790], [794, 790]], OUT = [497, 1070], R = 36;
// Its twelve lines: 0..8 input i -> hidden j (id j * 3 + i, weight w1[j][i]); 9..11 hidden j -> output (w2[j]).
const LINES = [];
for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) LINES.push({ id: j * 3 + i, a: IN[i], b: HID[j], i, j, get: (w) => w.w1[j][i] });
LINES.sort((p, q) => p.id - q.id);
for (let j = 0; j < 3; j++) LINES.push({ id: 9 + j, a: HID[j], b: OUT, j, get: (w) => w.w2[j] });
// Line width means weight, everywhere in the film: 1 px plus 5 px per unit of its size, at most 16 px.
const wid = (v) => Math.min(16, 1 + 5 * Math.abs(v));
const mixW = (A, B, k) => ({ w1: A.w1.map((row, j) => row.map((v, i) => lerp(v, B.w1[j][i], k))), w2: A.w2.map((v, j) => lerp(v, B.w2[j], k)) });
const START = NET.start, ONE = NET.one, END = NET.end;
const n2 = (v) => v.toFixed(2);
const sigm = (z) => 1 / (1 + Math.exp(-z));

// ── The repetition (s14): the run's own first nudges, cat, dog, fish, one a beat and then faster and faster ──────
const REP = [];
{
  let t0 = s.s14.start + 0.12, k = 0;
  const until = s.s15.start - 0.1;
  while (k < NET.steps.length) {
    const d = k < 3 ? BEAT : Math.max(1 / 60, BEAT * 0.55 ** (k - 2));
    if (t0 + d > until) break;
    REP.push({ ...NET.steps[k], t0, d, prev: k ? NET.steps[k - 1].after : ONE });
    t0 += d;
    k++;
  }
}
const REP_END = REP.at(-1).t0 + REP.at(-1).d;

// The weights the toy shows at t: the start, the one nudge (s12), the run's nudges (s14), and in s17 the start
// again, morphing to the end of training.
const NUDGE = s.s12.start + 0.62; // the lines swell or thin
// s12's arrows, one beside each weight the nudge moved (the lines from bark? did not: the cat does not bark, its
// input was 0), placed along each line where no other arrow, node or label is.
const NUDGE_ARROWS = [];
{
  const busy = [...IN, ...HID, OUT].map(([x, y]) => ({ x, y, r: R + 34 }));
  busy.push({ x: 640, y: 918, r: 120 }, { x: 560, y: 918, r: 70 }); // the 0.66 -> 0.79 label
  for (const ln of LINES) {
    if (ln.id < 9 && ln.i === 1) continue;
    if (ln.id === 9 + NET.shown) continue; // labelled instead
    for (const k of [0.5, 0.36, 0.64, 0.28, 0.72, 0.22]) {
      const [px, py] = along(...ln.a, ...ln.b, k, R, R);
      const x = px + (ln.b[0] >= ln.a[0] ? -36 : 36), y = py;
      if (busy.every((b) => Math.hypot(b.x - x, b.y - y) > b.r)) {
        NUDGE_ARROWS.push({ ln, x, y });
        busy.push({ x, y, r: 62 });
        break;
      }
    }
  }
}
const MORPH = s.s17.start + 0.95; // s17: start -> trained
function weightsAt(t) {
  if (t < NUDGE) return START;
  if (t < s.s14.start) return mixW(START, ONE, ramp(t, NUDGE, 0.6, E.io3));
  if (t < s.s17.start) {
    let cur = ONE;
    for (const st of REP) {
      if (t < st.t0) break;
      // each nudge lands in the last third of its step, after the error has gone back up
      cur = mixW(st.prev, st.after, st.d > 0.1 ? ramp(t, st.t0 + st.d * 0.62, st.d * 0.3, E.io2) : 1);
    }
    return cur;
  }
  return mixW(START, END, ramp(t, MORPH, 1.0, E.io2));
}

// ── The examples, drawn in one white line each ───────────────────────────────────────────────────────────────
// A cat sitting, from the front: pointed ears, almond eyes, whiskers, front paws, the tail curled round. A dog
// standing, side on: snout, a floppy ear, four legs, the tail up. A fish, side on: forked tail, fins, gill, eye.
const ICON = {
  cat: shape(
    "M-44 -28 C-50 -50 -48 -68 -42 -84 L-36 -122 L-14 -96 Q0 -100 14 -96 L36 -122 L42 -84 C48 -68 50 -50 44 -28 C38 -6 20 4 0 4 C-20 4 -38 -6 -44 -28 Z" +
      "M-20 2 C-46 22 -56 62 -48 98 L48 98 C56 62 46 22 20 2" +
      "M-32 98 Q-22 86 -12 98 M12 98 Q22 86 32 98" +
      "M48 92 C84 96 100 70 92 42 C88 28 76 24 70 32" +
      "M-26 -48 Q-17 -57 -8 -48 Q-17 -41 -26 -48 Z M8 -48 Q17 -57 26 -48 Q17 -41 8 -48 Z" +
      "M-6 -30 L6 -30 L0 -23 Z" +
      "M-14 -24 L-64 -34 M-14 -19 L-64 -16 M14 -24 L64 -34 M14 -19 L64 -16",
  ),
  dog: shape(
    "M96 -70 Q96 -40 74 -24 L-34 -24 Q-46 -26 -52 -46 Q-58 -70 -78 -68 L-104 -54 Q-114 -46 -106 -38 L-82 -32 Q-68 -24 -64 -4 L-62 56 L-48 56 L-46 12 Q-6 18 36 10 L40 56 L54 56 L56 10 Q66 -4 74 -24" +
      "M-62 -66 Q-46 -66 -46 -44 Q-50 -32 -58 -38" +
      "M-38 12 L-34 56 L-22 56 M60 6 L68 56 L80 56" +
      "M-78 -54 L-76 -50",
  ),
  fish: shape(
    "M-96 0 Q-40 -60 32 -16 L76 -50 L66 0 L76 50 L32 16 Q-40 60 -96 0 Z" +
      "M-34 -34 Q-12 -70 20 -24" +
      "M-58 -26 Q-46 0 -58 26" +
      "M-30 14 Q-18 34 -4 16" +
      "M-74 -8 L-72 -6",
  ),
};

// ── The meter under the output: 0 to 1, the guess (cyan), the answer (white), the gap between them (magenta) ────
const BAR = { x0: 200, x1: 794, y: 1200 };
const bx = (v) => BAR.x0 + (BAR.x1 - BAR.x0) * v;
function meter(t, { a = 1, axis = 1, answer = 0, guess = null, guessA = 0, gk = 1, ghost = null, ghostA = 0, gap = 0, gapTo = null, errA = 0, errV = null, guessLbl = 1 } = {}) {
  if (a <= 0.004) return;
  const { x0, x1, y } = BAR;
  line(x0, y, lerp(x0, x1, axis), y, { w: 4, col: WH, a: a * 0.85 });
  line(x0, y - 16, x0, y + 16, { w: 4, col: WH, a: a * 0.85 * flick((axis - 0.05) * 3) });
  line(x1, y - 16, x1, y + 16, { w: 4, col: WH, a: a * 0.85 * (axis >= 1 ? 1 : 0) });
  label("0", x0, y + 58, { size: 40, a: a * 0.8 * clamp(axis * 4) });
  label("1", x1, y + 58, { size: 40, a: a * 0.8 * (axis >= 1 ? 1 : 0) });
  if (answer > 0) {
    line(x1, y - 42, x1, y + 42, { w: 6, col: WH, a: a * answer });
    label("answer: 1", x1 - 6, y - 62, { size: 42, a: a * answer, align: "end", weight: 600 });
  }
  if (ghost !== null && ghostA > 0) line(bx(ghost), y - 30, bx(ghost), y + 30, { w: 4, col: CY, a: a * ghostA * 0.4 });
  if (guess !== null && guessA > 0) {
    const gx = bx(guess);
    if (gap > 0) {
      const to = gapTo ?? BAR.x1;
      line(gx + 8, y, lerp(gx + 8, to - 8, gap), y, { w: 14, col: MG, a: a });
    }
    line(gx, y - 42 * gk, gx, y + 42 * gk, { w: 7, col: CY, a: a * guessA });
    label(`guess ${n2(guess)}`, gx, y - 58, { size: 50, col: CY, a: a * guessA * guessLbl, weight: 600 });
  }
  if (errA > 0 && errV !== null && guess !== null) label(`error ${n2(errV)}`, (bx(guess) + BAR.x1) / 2 + 10, y + 70, { size: 52, col: MG, a: a * errA, weight: 600 });
}

// ── The camera ──────────────────────────────────────────────────────────────────────────────────────────────────
// A directed camera over the toy network (s07 to s14, s17): it pushes in to the inputs as the cat's answers arrive,
// rides the signal down to the guess, dives to the meter, follows the error back up, goes close on the weight the
// nudge changed, and pulls back for the repetition. Keys are framings; between two keys it eases. Outside the toy
// network's shots it is the identity (the shot's own moves, a push through the phone, the zoom-out of s18, carry
// the camera there).
const ID = { wx: 497, wy: 785, z: 1, sx: 497, sy: 785 };
const K = {
  inputs: { wx: 497, wy: 420, z: 1.22, sx: 500, sy: 600 }, // the cat and the three questions
  hidden: { wx: 497, wy: 700, z: 1.28, sx: 480, sy: 640 }, // riding the signal: the hidden row
  output: { wx: 497, wy: 900, z: 1.25, sx: 480, sy: 680 }, // the guess, with room for its sum below
  meter: { wx: 497, wy: 1140, z: 1.4, sx: 480, sy: 980 }, // dive to the meter: guess against answer
  meter2: { wx: 497, wy: 1160, z: 1.45, sx: 480, sy: 1000 }, // closer on the gap, the error
  up: { wx: 497, wy: 650, z: 1.1, sx: 480, sy: 560 }, // following the error back up to the inputs
  net: { wx: 497, wy: 820, z: 1.05, sx: 480, sy: 760 }, // every weight nudged
  line: { wx: 497, wy: 930, z: 2.6, sx: 380, sy: 680 }, // close on the one we label: middle hidden -> output
  s13: { wx: 497, wy: 1000, z: 1.25, sx: 480, sy: 900 }, // guess again, with the meter
  s17: { wx: 497, wy: 640, z: 1.15, sx: 480, sy: 720 }, // in on the trained lines from the questions
};
const CAMS = [
  [0, ID],
  [s.s07.start, ID],
  [s.s07.start + 0.65, K.inputs, E.io3],
  [s.s08.start + 0.12, K.inputs],
  [s.s08.start + 0.84, K.hidden, E.io2],
  [s.s08.start + 1.56, K.output, E.io2],
  [s.s09.start, K.output],
  [s.s09.start + 0.6, K.meter, E.io3],
  [s.s10.start, K.meter],
  [s.s10.start + 1.75, K.meter2, E.io2],
  [s.s11.start + 0.3, K.meter2],
  [s.s11.start + 1.6, K.up, E.io2],
  [s.s12.start, K.up],
  [s.s12.start + 0.45, K.net, E.io3],
  [s.s12.start + 1.4, K.net],
  [s.s12.start + 2.05, K.line, E.io3],
  [s.s13.start - 0.5, K.line],
  [s.s13.start + 0.1, K.s13, E.io3],
  [s.s14.start, K.s13],
  [s.s14.start + 0.55, ID, E.io3],
  [s.s17.start, ID],
  [s.s18.start - 0.1, K.s17, E.io2],
  [s.s18.start, K.s17],
  [s.s18.start + 0.5, ID, E.io3],
];
const mixKey = (a, b, k) => ({ wx: lerp(a.wx, b.wx, k), wy: lerp(a.wy, b.wy, k), z: a.z * (b.z / a.z) ** k, sx: lerp(a.sx, b.sx, k), sy: lerp(a.sy, b.sy, k) });
function camAt(t) {
  let i = 0;
  while (i + 1 < CAMS.length && CAMS[i + 1][0] <= t) i++;
  if (i + 1 >= CAMS.length) return CAMS[i][1];
  const [t0, k0] = CAMS[i], [t1, k1, ease = E.io3] = CAMS[i + 1];
  if (k0 === k1) return k0;
  return mixKey(k0, k1, ease(clamp((t - t0) / (t1 - t0))));
}
// The camera's moves, for the sound: one whoosh each.
const MOVES = CAMS.slice(1).map((c, i) => [CAMS[i][0], c[0], CAMS[i][1] !== c[1]]).filter(([a, b, moving]) => moving && b - a > 0.3);

// The heads-up layer: notes, counters and the sum are drawn after the world, in the frame's own coordinates.
const HUD = [];
const hud = (fn) => HUD.push(fn);

// ── Shots ───────────────────────────────────────────────────────────────────────────────────────────────────────
// Each draws itself when its window is on; times are the storyboard's. What must be read stays inside the app's
// safe area and above the caption band.

// s01, s02 (and the phone's return at the end of s03, the push of s04, and s20): the AI you use, as a network.
function phoneScene(t) {
  // s01: the phone, lit, its network running. s02: it slides down and shrinks under the rules.
  if (t < s.s03.start + 0.4) {
    const k = ramp(t, s.s02.start, 0.6, E.io3);
    const dim = 1 - ramp(t, s.s03.start, 0.3, E.in2);
    const sc = lerp(1, 0.42, k), cy = lerp(760, 1010, k);
    // The network's lines flicker as the rules are drawn beside it.
    const fl = t > s.s02.start && t < s.s02.start + 0.3 ? 0.55 + 0.45 * flick(t - s.s02.start - 0.12) : 1;
    phoneOutline(540, cy, sc, { a: dim });
    phoneNet(t, { cy, sc, a: dim, flickerLines: fl });
    return;
  }
  // The end of s03: the phone draws on again behind the question, row by row.
  if (t < s.s04.start) {
    const t0 = s.s04.start - 0.5;
    if (t < t0) return;
    phoneOutline(540, 760, 1, { k: ramp(t, t0, 0.42, E.io2), extras: life(t, t0 + 0.38) });
    const rows = [0, 1, 2, 3].map((r) => flick(t - (t0 + 0.12 + r * 0.08)));
    const gaps = [0, 1, 2].map((gp) => ramp(t, t0 + 0.16 + gp * 0.09, 0.2, E.lin));
    phoneNet(t, { rows, gaps, pul: ramp(t, t0 + 0.4, 0.2) });
    return;
  }
  // s04: pushed in through the phone: the outline (nearer the camera) grows past the edges of the frame while the
  // network grows to 1.25 times; the lines are redrawn by a bright pass running down the rows. Then the camera pushes
  // on into the network, one pulse races out of it toward the camera, and the cut follows that pulse (s05).
  if (t < s.s05.start) {
    const k = ramp(t, s.s04.start, 0.9, E.io3);
    const k2 = ramp(t, s.s05.start - 0.6, 0.6, E.in3);
    const f = lerp(1, 2.7, k2), P = [600, 690];
    const sc = lerp(1, 1.25, k) * f, cx = P[0] + (540 - P[0]) * f, cy = P[1] + (lerp(760, 740, k) - P[1]) * f;
    const os = lerp(1, 2.6, E.in2(k));
    phoneOutline(540, lerp(760, 700, k), os, { a: 1 - ramp(t, s.s04.start + 0.45, 0.4, E.lin) });
    const sweep = (t - (s.s04.start + 0.5)) / 0.22;
    phoneNet(t, { cx, cy, sc, a: 1 - ramp(t, s.s05.start - 0.32, 0.22, E.in2), sweep });
    // The labels: 'nodes' to a node at the top left, 'connections' to a line of the last row, from below the net.
    const la = 1 - ramp(t, s.s05.start - 0.6, 0.2, E.in2);
    const n0 = s.s04.start + 3 * BEAT, c0 = s.s04.start + 4 * BEAT;
    line(250, 328, 196, 318, { w: 3, col: WH, a: la, k1: ramp(t, n0, 0.2, E.out2) });
    label("nodes", 124, 334, { size: 48, a: la * flick(t - n0 - 0.15), n: (t - n0 - 0.15) * 30 });
    line(762, 1146, 779, 1004, { w: 3, col: WH, a: la, k1: ramp(t, c0, 0.2, E.out2) });
    label("connections", 700, 1192, { size: 48, a: la * flick(t - c0 - 0.15), n: (t - c0 - 0.15) * 40 });
    // the lead pulse: out of the network, toward the camera, onto the first node of the next shot
    const p0 = s.s05.start - 0.45;
    if (t >= p0) {
      const u = E.in2(clamp((t - p0) / 0.45));
      const x = lerp(620, S05_A[0], u), y = lerp(700, S05_LINES[0].y, u);
      pulse(x, y, lerp(9, 34, u), { a: 1, dx: (S05_A[0] - 620) * 0.12 * u, dy: (S05_LINES[0].y - 700) * 0.12 * u });
    }
    return;
  }
  // s20: the recap's loop arrow has opened into the phone (loopScene draws the outline); the network comes back
  // row by row and its pulses run into the first frame.
  if (t >= s.s20.start) {
    const t0 = s.s20.start + 1.0;
    phoneOutline(540, 760, 1, { a: t >= t0 ? 1 : 0, extras: life(t, t0 + 0.05) }); // the loop arrow becomes it at t0
    const rows = [0, 1, 2, 3].map((r) => flick(t - (t0 + r * BEAT * 0.4)));
    const gaps = [0, 1, 2].map((gp) => ramp(t, t0 + 0.05 + gp * BEAT * 0.4, 0.25, E.lin));
    phoneNet(t, { rows, gaps, pul: ramp(t, t0 + 0.6, 0.5, E.io2) });
  }
}

// s02: the rules nobody wrote: a dashed card of rules, typed one a beat, then crossed out.
const RULES = [["if it meows", "cat"], ["if it barks", "dog"], ["if …", ""]];
function rulesScene(t) {
  const t0 = s.s02.start, t1 = s.s03.start;
  if (t < t0 || t > t1 + 0.4) return;
  const die = t < t0 + 2.1 ? 1 : flickOff(t - (t0 + 2.1)) * 0.55 + 0.45 * (1 - ramp(t, t0 + 2.1, 0.25));
  const a = die * (1 - ramp(t, t1, 0.25, E.in2));
  // the card: a dashed outline, drawn on
  const k = ramp(t, t0 + 0.3, 0.38, E.io2); // once the phone has made room
  if (k > 0) {
    g.setLineDash([22, 16]);
    rrect(540, 525, 400, 195, 18, { k, w: 4, col: WH, a: a * 0.9 });
    g.setLineDash([]);
  }
  label("RULES", 540, 410, { size: 52, weight: 600, spacing: 8, a: a * flick(t - t0 - 0.5) });
  RULES.forEach(([cond, out], i) => {
    const at = t0 + 0.66 + i * 0.44, y = 505 + i * 82;
    const n = (t - at) * 42;
    const w = label(cond, 190, y, { size: 42, align: "start", a, n }) ?? 0;
    if (out && n > cond.length + 1) {
      const ax = 190 + w + 22;
      arrow(ax, y - 14, ax + 54, y - 14, { w: 3.5, col: WH, a, head: 12 });
      label(out, ax + 74, y, { size: 42, align: "start", a, n: n - cond.length - 2 });
    }
  });
  // crossed out, on the last beat: two white strokes
  const x0 = t0 + 3 * BEAT;
  line(170, 350, 910, 700, { w: 7, col: WH, a, k1: ramp(t, x0, 0.12, E.out2) });
  line(910, 350, 170, 700, { w: 7, col: WH, a, k1: ramp(t, x0 + 0.14, 0.12, E.out2) });
}

// s03: the question, lettered like a sign powering up.
function questionScene(t) {
  const t0 = s.s03.start, t1 = s.s04.start;
  if (t < t0 || t > t1) return;
  const out = ramp(t, t1 - 0.62, 0.34, E.in2);
  const lift = -70 * out;
  const lines = [["So how", WH, t0 + 0.08], ["does it", WH, t0 + BEAT], ["learn?", MG, t0 + 2 * BEAT]];
  // a slow push on the sign (4 % over the shot), and the hum of a neon tube: a faint, uneven shimmer
  const z = 1 + 0.04 * E.io2((t - t0) / (t1 - t0));
  const hum = (i) => 0.93 + 0.07 * Math.sin(t * 23 + i * 2.1) * Math.sin(t * 7.3 + i);
  lines.forEach(([str, col, at], i) => label(str, 497, 768 + (640 + i * 128 - 768) * z + lift, { size: 112 * z, weight: 700, col, a: flick(t - at) * (1 - out) * hum(i) }));
}

// s05: every connection has a weight: two of the toy's own starting lines (bark? -> hidden 1: 0.92; four legs? ->
// hidden 3: 0.28), big. A signal of 1 goes in at the left of each; what arrives at the right is 1 x the weight. At
// the end of the shot they carry into the toy network, where they are two of its twelve.
const CARRY_END = s.s06.start + 0.25;
const S05 = NET.s05.map(([j, i]) => Math.abs(START.w1[j][i]));
const S05_A = [150, 0], S05_B = 890, R5 = 46;
const S05_LINES = [
  { v: S05[0], y: 560, txt: `weight ${n2(S05[0])} · strong`, to: [IN[1], HID[0]] },
  { v: S05[1], y: 1000, txt: `weight ${n2(S05[1])} · weak`, to: [IN[2], HID[2]] },
];
function weightsScene(t) {
  const t0 = s.s05.start, t1 = s.s06.start;
  if (t < t0 || t > t1 + 0.4) return;
  // the pull back: the two lines carry into the toy network, where they are two of its twelve
  const mk = ramp(t, t1 - 0.5, CARRY_END - (t1 - 0.5), E.io3);
  if (t >= CARRY_END) return;
  const go = t0 + BEAT, arrive = go + 1.5;
  const la = 1 - ramp(t, t1 - 0.55, 0.25, E.in2); // words leave before the lines carry
  const r = lerp(R5, R, mk);
  S05_LINES.forEach((ln, n) => {
    const A = [lerp(S05_A[0], ln.to[0][0], mk), lerp(ln.y, ln.to[0][1], mk)], B = [lerp(S05_B, ln.to[1][0], mk), lerp(ln.y, ln.to[1][1], mk)];
    const on = t0 + n * 0.16;
    const dim = n ? 0.62 : 1;
    // the first node ignites where the lead pulse landed; the line draws on from it
    if (n === 0 && t < t0 + 0.4) ring(...A, R5 + 90 * E.out3(clamp((t - t0) / 0.4)), { w: 4, a: 0.8 * (1 - clamp((t - t0) / 0.4)), hollow: true });
    line(...A, ...B, { w: wid(ln.v), a: dim, k1: ramp(t, on + 0.05, 0.32, E.io2), r0: r, r1: r });
    const hit = Math.exp(-Math.max(0, t - arrive) / (n ? 0.12 : 0.3)) * (t >= arrive ? 1 : 0);
    ring(...A, r, { a: flick(t - on + 0.04), w: 5, lit: t >= go - 0.25 && t < arrive + 0.6 ? 0.7 : 0 });
    ring(...B, r * (1 + (n ? 0.05 : 0.25) * hit), { a: flick(t - on - 0.25), w: 5, lit: (n ? 0.35 : 1) * hit + (t >= arrive ? 0.25 + 0.5 * ln.v : 0) });
    label(ln.txt, 520, ln.y - 66, { size: 58, weight: 600, a: la * flick(t - on - 0.35), n: (t - on - 0.35) * 40 });
    // a signal of 1 goes in ...
    label("1", A[0], A[1] + 16, { size: 44, weight: 600, a: la * flick(t - go + 0.25) });
    // ... the pulse carries it, as big and bright as the weight ...
    if (t >= go && t < arrive + 0.05) {
      const u = clamp((t - go) / 1.5);
      const [x, y] = along(...A, ...B, u, r, r);
      pulse(x, y, 4 + 17 * ln.v, { a: 0.35 + 0.65 * ln.v, dx: -30 * ln.v, dy: 0 });
    }
    // ... and what arrives is 1 x the weight: the strong one as a flash, the weak one as a glint
    if (t >= arrive) {
      const rr = r + (n ? 30 : 120) * E.out3(clamp((t - arrive) / 0.5));
      ring(...B, rr, { w: n ? 2 : 4, a: (n ? 0.3 : 0.8) * (1 - clamp((t - arrive) / 0.5)), hollow: true });
      label(n2(ln.v), B[0], B[1] + 12, { size: 34, weight: 600, col: CY, a: la * flick(t - arrive) });
      label(`1 × ${n2(ln.v)} = ${n2(ln.v)}`, 520, ln.y + 104, { size: 48, a: la * flick(t - arrive - 0.15) * (n ? 0.8 : 1), n: (t - arrive - 0.15) * 40 });
    }
  });
  // the key to the whole picture, said once and left up
  hud(() => label("line width = size of the weight", 497, 1205, { size: 42, a: 0.85 * la * flick(t - go - 0.1), n: (t - go - 0.1) * 36 }));
}

// s06 to s17: the toy network. One function, its state read from the time.
function toyNodes(t, A, { lit = [0, 0, 0, 0, 0, 0, 0], nodeA = [1, 1, 1, 1, 1, 1, 1], sc = 1, col = CY } = {}) {
  const w = Math.max(1.2, 5 * sc), r = R * sc;
  IN.forEach((p, i) => ring(...A(p), r, { a: nodeA[i], lit: lit[i], col, w }));
  HID.forEach((p, j) => ring(...A(p), r, { a: nodeA[3 + j], lit: lit[3 + j], col, w }));
  ring(...A(OUT), r * (1 + 0.15 * lit[6]), { a: nodeA[6], lit: lit[6], w: w * (1 + 0.6 * lit[6]), col });
}
// The pulses of one pass down (forward, cyan: brighter on the thicker lines, from the inputs that are on) or up
// (backward, magenta, along every line), at progress u (0..1) of a pass that takes rows in turn.
function pass(t, A, weights, x, u, { back = false, a = 1, streak = 0, sc = 1 } = {}) {
  const rowK = (k) => clamp(u * 2 - k); // 0..1 for the first row of lines, then the second
  const h = HID.map((_, j) => sigm(weights.w1[j].reduce((n, v, i) => n + v * x[i], 0)));
  for (const ln of LINES) {
    const out = ln.id >= 9;
    const k = back ? rowK(out ? 0 : 1) : rowK(out ? 1 : 0);
    if (k <= 0 || k >= 1) continue;
    if (!back && !out && !x[ln.i]) continue;
    const v = Math.abs(ln.get(weights));
    const [ax, ay] = A(back ? ln.b : ln.a), [bx, by] = A(back ? ln.a : ln.b);
    const [px, py] = along(ax, ay, bx, by, k, R * sc, R * sc);
    const L = Math.hypot(bx - ax, by - ay);
    const sz = (back ? 9 : 6.5 + 5 * Math.min(1.6, v * (out ? h[ln.j] * 1.6 : 1))) * sc;
    const tail = (28 + streak * 160) * sc;
    pulse(px, py, sz, { col: back ? MG : CY, a: a * (back ? 1 : 0.5 + 0.5 * Math.min(1, v)), dx: ((bx - ax) / L) * tail * Math.min(1, k * 3), dy: ((by - ay) / L) * tail * Math.min(1, k * 3) });
  }
}
// The forward pass of s08, and the second one of s13; the error's pass back of s11.
const F0 = s.s08.start + 0.12, FROW = 0.72;
const G0 = s.s13.start + 0.08, GROW = 0.42;
const BACK0 = s.s11.start + 0.3, BACKROW = 0.65;
const SUM = NET.sum0;
const fmt = (v) => (v < 0 ? `(−${Math.abs(v).toFixed(2)})` : v.toFixed(2));
function toyScene(t) {
  const t0 = s.s06.start - 0.5, t1 = s.s19.start + 0.5;
  if (t < t0 || t > t1) return;
  if (t > s.s15.start + 0.25 && t < s.s17.start) return; // the chart and the results take the frame
  const weights = weightsAt(t);
  // Where the network sits: still in s06 to s14 (the camera moves); collapsing into the chart's first point at the
  // end of s14; in s18 the zoom-out carries it, smaller and smaller, into the middle of the field.
  let sc = 1, cx = 497, cy = 785, a = 1;
  if (t < s.s15.start + 0.3 && t > s.s15.start - 0.2) {
    const k = ramp(t, s.s15.start - 0.18, 0.3, E.in3);
    sc = lerp(1, 0.04, k);
    cx = lerp(497, chx(0), k);
    cy = lerp(785, chy(CAT[0]), k);
    a = 1 - ramp(t, s.s15.start + 0.05, 0.12, E.lin);
  }
  if (t >= s.s17.start) {
    a = life(t, s.s17.start + 0.05) * (1 - ramp(t, s.s19.start - 0.3, 0.2));
    if (t >= s.s18.start) ({ sc, cx, cy } = toyInField(t));
  }
  if (sc * 700 < 2) return;
  const A = ([x, y]) => [cx + (x - 497) * sc, cy + (y - 785) * sc];

  // s06: nodes pop on row by row (the two carried lines' four nodes are there already), then the other ten lines
  // draw on, each as wide as its weight.
  const pop = [s.s06.start + 0.1, s.s06.start + 0.1, s.s06.start + 0.1, s.s06.start + 0.42, s.s06.start + 0.42, s.s06.start + 0.42, s.s06.start + 0.74];
  const carried = new Set([1, 2, 3, 5]); // IN[1], IN[2], HID[0], HID[2]
  const nodeA = [0, 1, 2, 3, 4, 5, 6].map((n) => (t >= s.s07.start ? 1 : carried.has(n) ? (t >= CARRY_END ? 1 : 0) : flick(t - pop[n])));
  const lineK = (ln) => {
    if (t >= s.s07.start) return 1;
    if (ln.id === 1 || ln.id === 8) return t >= CARRY_END ? 1 : 0; // the carried ones: bark? -> h1, four legs? -> h3
    const order = [0, 2, 3, 4, 5, 6, 7, 9, 10, 11].indexOf(ln.id);
    return ramp(t, s.s06.start + BEAT + 0.05 + order * 0.07, 0.18, E.lin);
  };
  // The inputs: from s07 they hold the example's answers (1 lights the node, 0 leaves it dark).
  let x = null;
  const cat = NET.data[0].x;
  if (t >= s.s07.start + BEAT && t < s.s14.start) x = cat;
  let stepNow = null;
  if (t >= s.s14.start && t < s.s15.start) {
    stepNow = REP.findLast((st) => t >= st.t0) ?? null;
    x = stepNow ? NET.data.find((d) => d.name === stepNow.example).x : null;
  }
  const inLit = [0, 1, 2].map((i) => {
    if (!x) return 0;
    if (t < s.s08.start) return x[i] * flick(t - (s.s07.start + BEAT + i * 0.25)) * (0.85 + 0.15 * Math.cos(((t - s.s07.start) * TAU) / BEAT));
    return x[i] * (stepNow ? 1 : 0.85 + 0.15 * Math.cos(((t - s.s07.start) * TAU) / BEAT)); // breathing on the beat
  });
  const inA = [0, 1, 2].map((i) => nodeA[i] * (x && !x[i] ? (t < s.s08.start ? 1 - 0.6 * flick(t - (s.s07.start + BEAT + i * 0.25)) : 0.4) : 1));

  // Line colour: cyan; magenta for a moment as the error passes back along it (s11), and while it is nudged (s12).
  const tint = (ln) => {
    const out = ln.id >= 9;
    const pass0 = BACK0 + (out ? 0 : BACKROW);
    let k = t >= pass0 && t < pass0 + 1.2 ? Math.exp(-Math.max(0, t - pass0 - BACKROW) / 0.35) * clamp((t - pass0) / 0.15) : 0;
    const touched = out || ln.i !== 1;
    if (touched) k = Math.max(k, Math.exp(-(((t - (NUDGE + 0.3)) / 0.35) ** 2)));
    return k;
  };
  // During the repetition, each step's error goes back as a magenta streak.
  const glowNow = (ln) => (!stepNow || stepNow.d > 0.1 ? 0 : 0.5 + 0.5 * Math.sin((t - stepNow.t0) * 90 + ln.id));
  const trained = t >= s.s17.start ? ramp(t, MORPH + 0.9, 0.4) : 0; // s17: the questions' lines take the stage
  // s12's close-up: every line but the one we follow steps back
  const focus = t >= s.s12.start && t < s.s13.start + 0.4 ? ramp(t, s.s12.start + 1.4, 0.4) * (1 - ramp(t, s.s13.start - 0.45, 0.4)) : 0;
  for (const ln of LINES) {
    const k1 = lineK(ln);
    if (k1 <= 0) continue;
    const v = ln.get(weights);
    const tk = Math.max(tint(ln), stepNow && stepNow.d <= 0.1 ? 0.4 * glowNow(ln) : 0);
    const col = mixC(CY, MG, tk);
    let la = 0.88;
    // a line from an input that is 0 carries nothing for this example: it dims while that example is in
    if (x && ln.id < 9 && !x[ln.i]) la *= t < s.s08.start ? 1 - 0.5 * flick(t - (s.s07.start + BEAT + ln.i * 0.25)) : 0.5;
    if (focus > 0 && ln.id !== 9 + NET.shown) la *= 1 - 0.75 * focus;
    if (t >= s.s17.start) {
      // the comparison s17 makes is between the questions: meow?'s lines bright, the others' dim, and the
      // hidden -> output lines (a different job) pushed back
      if (ln.id >= 9) la = lerp(0.88, 0.22, trained);
      else if (ln.i === 0) la = 0.88 + 0.12 * trained - (t > MORPH + 1.5 ? 0.12 * (1 - Math.max(0, Math.cos(((t - MORPH) * TAU) / BEAT)) ** 2) : 0);
      else la = lerp(0.88, 0.45, trained);
    }
    line(...A(ln.a), ...A(ln.b), { w: Math.max(0.9, wid(v) * sc), col, a: a * la, k1, r0: R * sc, r1: R * sc });
    if (t >= s.s17.start && ln.id < 9 && ln.i === 0 && trained > 0) line(...A(ln.a), ...A(ln.b), { w: Math.max(0.9, wid(v) * sc) + 6 * sc, col: CY, a: a * 0.22 * trained, k1, r0: R * sc, r1: R * sc });
  }

  // Lit nodes: inputs that are on; the hidden row and the output flare when a pass reaches them.
  const lit = [...inLit, 0, 0, 0, 0];
  const flareAt = (at, dur = 0.35) => (t >= at ? Math.exp(-(t - at) / dur) : 0);
  for (let j = 0; j < 3; j++) lit[3 + j] = Math.max(flareAt(F0 + FROW) * 0.9, t >= F0 + FROW && t < s.s09.start + 0.4 ? 0.3 : 0, flareAt(G0 + GROW) * 0.9, flareAt(BACK0 + BACKROW, 0.3) * 0.5);
  lit[6] = Math.max(t >= F0 + 2 * FROW && t < s.s09.start + 2 * BEAT ? 0.35 + 0.15 * Math.sin((t - F0) * 5) + 0.6 * flareAt(F0 + 2 * FROW, 0.5) : 0, flareAt(G0 + 2 * GROW, 0.5) * 0.9 + (t >= G0 + 2 * GROW && t < s.s14.start ? 0.3 : 0));
  const errCol = t >= BACK0 - 0.3 && t < BACK0 + 2 * BACKROW ? mixC(CY, MG, Math.exp(-Math.abs(t - BACK0) / 0.25)) : null;
  if (a > 0.004) {
    g.globalAlpha = 1;
    toyNodes(t, A, { lit, sc, nodeA: [...inA, nodeA[3], nodeA[4], nodeA[5], nodeA[6]].map((v) => v * a) });
    if (errCol) ring(...A(OUT), R * 1.15 * sc, { w: 7, col: errCol, a: a * Math.exp(-Math.abs(t - BACK0) / 0.25), lit: 0.6 });
  }
  // the numbers in the inputs
  if (x && t >= s.s07.start + BEAT && t < s.s15.start && sc > 0.9) {
    IN.forEach((p, i) => label(String(x[i]), p[0], p[1] + 16, { size: 44, weight: 600, col: x[i] ? WH : CY, a: a * (x[i] ? 1 : 0.45) * (t < s.s08.start ? flick(t - (s.s07.start + BEAT + i * 0.25)) : 1) }));
  }
  // s08: each hidden node's value, written into it as the signal arrives (and kept until the camera dives)
  if (t >= F0 + FROW && t < s.s09.start + 0.5) {
    HID.forEach((p, j) => label(SUM.h[j].toFixed(2), p[0], p[1] + 11, { size: 30, weight: 600, col: WH, a: a * flick(t - F0 - FROW - j * 0.04) * (1 - ramp(t, s.s09.start + 0.1, 0.3)) }));
  }
  // passes: s08 down, s11 up (the error, from the output), s13 down again
  if (t >= F0 && t < F0 + 2 * FROW) pass(t, A, weights, cat, (t - F0) / (2 * FROW));
  if (t >= BACK0 && t < BACK0 + 2 * BACKROW) pass(t, A, weights, cat, (t - BACK0) / (2 * BACKROW), { back: true });
  if (t >= G0 && t < G0 + 2 * GROW) pass(t, A, weights, cat, (t - G0) / (2 * GROW));
  // s14: each step, a pass down in cyan and back up in magenta; when the steps get fast, streaks
  if (stepNow) {
    const u = (t - stepNow.t0) / stepNow.d;
    const streak = clamp((0.3 - stepNow.d) / 0.28);
    const sx = NET.data.find((d) => d.name === stepNow.example).x;
    if (u < 0.5) pass(t, A, stepNow.prev, sx, u * 2, { streak });
    else pass(t, A, stepNow.prev, sx, (u - 0.5) * 2, { back: true, streak });
  }

  // The labels: the three questions and the output's, written on in s06.
  const lt = s.s06.start + 2 * BEAT + 0.4;
  const labA = a * (t >= s.s18.start ? 1 - ramp(t, s.s18.start, 0.3) : 1);
  if (sc > 0.5) {
    const lab = (str, px, py, at, o = {}) => label(str, ...A([px, py]), { size: 44, a: labA * flick(t - at), n: (t - at) * 30, ...o });
    lab("meow?", 200, 430, lt);
    lab("bark?", 497, 430, lt + 0.12);
    lab("four", 794, 392, lt + 0.24);
    lab("legs?", 794, 438, lt + 0.3);
    lab("cat?", 552, 1086, lt + 0.45, { align: "start" });
  }
  // s06's note: the toy's lines start random.
  if (t >= s.s06.start && t < s.s07.start + 0.3) label("12 weights · random at first", 497, 1180, { size: 44, weight: 600, a: 0.9 * flick(t - lt - 0.7) * (1 - ramp(t, s.s07.start, 0.25)), n: (t - lt - 0.7) * 40 });

  // s08: the guess appears beside the output, at its value; under it, how it was made: each hidden node's value
  // times its line's weight, added up with the bias, and squashed into 0 to 1.
  const guessAt = F0 + 2 * FROW + 0.1;
  if (t >= guessAt && t < s.s09.start + BEAT - 0.05 + 0.3) {
    const k = ramp(t, s.s09.start + BEAT - 0.05, 0.3, E.io2);
    const w0 = textWidth(n2(NET.guess0), 50, 600), wl = textWidth(`guess ${n2(NET.guess0)}`, 50, 600);
    const x1 = bx(NET.guess0) + wl / 2 - w0 / 2; // where the number sits inside 'guess 0.27'
    label(n2(NET.guess0), lerp(372, x1, k), lerp(1088, BAR.y - 58, k), { size: lerp(60, 50, k), weight: 600, col: CY, a: flick(t - guessAt) });
  }
  const e0 = F0 + FROW + 0.35, eOff = s.s09.start - 0.12;
  if (t >= e0 && t < eOff + 0.3) {
    const ea = 1 - ramp(t, eOff, 0.2);
    hud(() => {
      const terms = SUM.h.map((h, j) => `${h.toFixed(2)}×${fmt(SUM.w[j])}`);
      const l1 = `${terms[0]} + ${terms[1]} + ${terms[2]}`;
      const size = Math.min(46, 46 * (860 / textWidth(l1, 46, 500)));
      const w = textWidth(l1, size, 500);
      let xx = 497 - w / 2;
      terms.forEach((tm, j) => {
        const str = j < 2 ? `${tm} + ` : tm;
        label(str, xx, 1070, { size, align: "start", col: j === NET.shown ? CY : WH, weight: j === NET.shown ? 700 : 500, a: ea * flick(t - e0 - j * 0.12) });
        xx += textWidth(str, size, 500);
      });
      label(`+ bias ${fmt(SUM.b)} = ${SUM.z.toFixed(2).replace("-", "−")}  →  ${n2(SUM.y)}`, 497, 1138, { size: 46, a: ea * flick(t - e0 - 0.5) });
      label("node value × line weight, added up, then squashed into 0 to 1", 497, 1196, { size: 30, a: 0.75 * ea * flick(t - e0 - 0.8) });
    });
  }

  // s12: every weight the error reached is nudged: arrows say which way (thicker or thinner), then the camera goes
  // close on the one we follow, middle hidden -> output: its old width as a ghost, its value 0.66 -> 0.79.
  if (t >= s.s12.start && t < s.s13.start + 0.4) {
    const fade = 1 - ramp(t, s.s13.start - 0.62, 0.22);
    const arA = fade * life(t, NUDGE + 0.05) * (t < NUDGE + 0.9 ? 0.6 + 0.4 * Math.abs(Math.sin((t - NUDGE) * 9)) : 1) * (1 - ramp(t, s.s12.start + 1.5, 0.4));
    const bob = 5 * Math.max(0, Math.sin(((t - NUDGE) * TAU) / BEAT)) ** 3;
    for (const { ln, x: px, y: py } of NUDGE_ARROWS) {
      const grew = Math.abs(ln.get(ONE)) > Math.abs(ln.get(START));
      const dy = grew ? -bob : bob;
      arrow(px, py + dy + (grew ? 22 : -22), px, py + dy + (grew ? -22 : 22), { w: 4.5, col: MG, a: arA, head: 14 });
      if (ln === LEGEND.up) label("thicker", px - 6, py - 44, { size: 38, weight: 600, col: MG, a: arA * flick(t - NUDGE - 0.3), knock: true });
      if (ln === LEGEND.down) label("thinner", px + 6, py - 44, { size: 38, weight: 600, col: MG, a: arA * flick(t - NUDGE - 0.45), knock: true });
    }
    // the close-up: the line, its old and new value beside it, and a gauge of the value with the old one as a ghost
    const close = ramp(t, s.s12.start + 1.6, 0.4) * fade;
    if (close > 0) {
      // its old and new value written beside it, and a gauge of the value (the length is the weight)
      const k = ramp(t, s.s12.start + 2.3, 0.6, E.io2);
      hud(() => {
        label(`${n2(START.w2[NET.shown])} → ${n2(ONE.w2[NET.shown])}`, 450, 610, { size: 72, weight: 700, col: CY, align: "start", a: close * flick(t - s.s12.start - 2.1), knock: true });
        label("its weight", 452, 676, { size: 40, align: "start", a: 0.85 * close * flick(t - s.s12.start - 2.2), knock: true });
        const gx = 452, gy = 740, len = 440;
        line(gx, gy, gx + len, gy, { w: 3, col: WH, a: 0.5 * close });
        line(gx, gy - 14, gx, gy + 14, { w: 3, col: WH, a: 0.6 * close });
        line(gx + len, gy - 14, gx + len, gy + 14, { w: 3, col: WH, a: 0.6 * close });
        label("0", gx, gy + 48, { size: 32, a: 0.7 * close });
        label("1", gx + len, gy + 48, { size: 32, a: 0.7 * close });
        const w0 = START.w2[NET.shown], w1 = ONE.w2[NET.shown];
        line(gx, gy, gx + len * w0, gy, { w: 12, col: WH, a: 0.35 * close }); // the old value, a ghost
        line(gx, gy, gx + len * lerp(w0, w1, k), gy, { w: 8, col: CY, a: close });
        label("one nudge, made big so you can see it", 452, 840, { size: 34, align: "start", a: 0.8 * close * flick(t - s.s12.start - 2.6), knock: true });
      });
    }
  }

  // s14: the examples take turns at the top, and the rounds are counted
  if (t >= s.s14.start - 0.05 && t < s.s15.start + 0.2) {
    const ia = 1 - ramp(t, s.s15.start - 0.12, 0.2, E.in2);
    ["cat", "dog", "fish"].forEach((name, n) => {
      const on = stepNow ? (stepNow.example === name ? 1 : 0.28) : 0.28;
      drawShape(ICON[name], [255, 540, 825][n], 290, 0.52, { w: 5, a: ia * on * ramp(t, s.s14.start + n * 0.06, 0.25, E.out2), k: ramp(t, s.s14.start + n * 0.06, 0.4, E.io2) });
    });
    if (stepNow) hud(() => label(`round ${stepNow.round}`, 600, 1170, { size: 48, weight: 600, align: "start", a: ia }));
  }

  // s17: what training found: the lines from meow? grew strongest; labelled
  if (t >= s.s17.start && t < s.s18.start + 0.4) {
    const fa = 1 - ramp(t, s.s18.start, 0.3);
    const st = MORPH - 0.05;
    hud(() => {
      label("at the start: random", 497, 300, { size: 40, a: 0.85 * fa * (t < st ? flick(t - s.s17.start - 0.2) : 0) });
      label(`after ${NET.rounds.toLocaleString("en-US")} rounds`, 497, 300, { size: 40, a: 0.85 * fa * (t >= st ? 1 : 0) });
    });
    const lt2 = MORPH + 1.35;
    arrow(200, 338, 200, 386, { w: 4, col: WH, a: fa * flick(t - lt2), head: 12 });
    label("strongest", 200, 324, { size: 48, weight: 700, a: fa * flick(t - lt2), n: (t - lt2) * 30 });
  }
}
// s12's legend: the arrow on meow? -> hidden 1 (it grew) says "thicker", the one on four legs? -> hidden 3 "thinner".
const LEGEND = { up: LINES[0], down: LINES[8] };

// s09 to s13: the meter (the camera dives to it)
function meterScene(t) {
  const t0 = s.s09.start, t1 = s.s14.start;
  if (t < t0 || t > t1) return;
  const focus = ramp(t, s.s12.start + 1.3, 0.3) * (1 - ramp(t, s.s13.start - 0.2, 0.3)); // s12's close-up
  const a = (1 - ramp(t, t1 - 0.3, 0.3, E.in2)) * (1 - focus);
  const axis = ramp(t, t0 + 0.15, 0.4, E.io2);
  const gIn = t0 + BEAT - 0.05 + 0.3; // the guess drops from the output onto the meter
  const answer = flick(t - (t0 + 2 * BEAT));
  const gapK = ramp(t, s.s10.start + 0.1, 0.35, E.out3);
  // s13: the new guess slides from the ghost of the old one to its place; the gap shortens with it
  const slide = ramp(t, s.s13.start + 0.08 + 0.84 + 0.1, 0.45, E.io3);
  const guess = lerp(NET.guess0, NET.guess1, slide);
  const landed = slide >= 1;
  meter(t, {
    a,
    axis,
    answer,
    guess,
    guessA: t >= gIn ? 1 : 0,
    gk: t >= gIn ? E.outBack(clamp((t - gIn) / 0.25)) : 0,
    ghost: t >= s.s13.start ? NET.guess0 : null,
    ghostA: ramp(t, s.s13.start + 0.1, 0.2),
    gap: gapK,
    errA: t < s.s13.start + 1.0 ? flick(t - s.s10.start - 0.4) : landed ? 1 : 0,
    errV: landed ? 1 - NET.guess1 : 1 - NET.guess0,
    guessLbl: t < s.s13.start + 1.0 || landed ? 1 : 0, // never a number between the two true ones
  });
  // the error buzzes once as it fills, then hums while it is there: a wider faint glow round the gap, breathing
  if (t > s.s10.start + 0.45 && t < s.s10.start + 0.75) {
    const bz = 0.5 + 0.5 * Math.sin((t - s.s10.start) * 160);
    line(bx(NET.guess0) + 8, BAR.y, BAR.x1 - 8, BAR.y, { w: 22, col: MG, a: 0.35 * bz });
  } else if (t > s.s10.start + 0.75 && gapK > 0) {
    const hm = 0.5 + 0.5 * Math.sin((t - s.s10.start) * TAU * 0.8);
    line(bx(guess) + 8, BAR.y, BAR.x1 - 8, BAR.y, { w: 24, col: MG, a: a * 0.16 * hm });
  }
}

// s15: the error keeps falling: the cat's own error (1 - its guess, the gap the meter showed), from the one nudge
// (0.60, where the meter left it) through 60 rounds of cat, dog and fish; its round counted at the head; the value
// after round 1,000 written at the end. The network's last streaks collapse into the curve's first point.
const CAT = NET.cat_err_rounds;
const CH = { x0: 170, x1: 880, y0: 1100, y1: 440, n: 60, top: 0.75 };
const CURVE_DUR = 1.5;
const chx = (r) => CH.x0 + ((CH.x1 - CH.x0) * r) / CH.n, chy = (v) => CH.y0 - ((CH.y0 - CH.y1) * v) / CH.top;
const CHART_OUT = s.s16.start - 0.3; // the head pulse leaves for the results; the chart dims as they come in
function chartHead(t) {
  const d0 = s.s15.start + 0.35;
  const k = ramp(t, d0, CURVE_DUR, E.lin) * CH.n;
  const r = Math.min(CH.n, Math.ceil(k)), f = Math.min(1, k - (r - 1));
  if (k <= 0) return { k, x: chx(0), y: chy(CAT[0]) };
  return { k, x: lerp(chx(r - 1), chx(r), f), y: chy(lerp(CAT[r - 1], CAT[r], f)) };
}
function chartScene(t) {
  const t0 = s.s15.start, t1 = s.s16.start;
  if (t < t0 - 0.2 || t > t1 + 0.1) return;
  const a = 1 - ramp(t, CHART_OUT + 0.08, 0.12);
  const ax = ramp(t, t0 + 0.02, 0.3, E.io2);
  line(CH.x0, CH.y0, CH.x0, lerp(CH.y0, CH.y1 - 40, ax), { w: 4, col: WH, a });
  line(CH.x0, CH.y0, lerp(CH.x0, CH.x1 + 30, ax), CH.y0, { w: 4, col: WH, a });
  for (const v of [0.25, 0.5, 0.75]) line(CH.x0 - 12, chy(v), CH.x0, chy(v), { w: 3, col: WH, a: a * ax * 0.7 });
  const la = a * flick(t - t0 - 0.3);
  for (const v of [0.25, 0.5, 0.75]) label(v.toFixed(2), CH.x0 - 22, chy(v) + 11, { size: 32, align: "end", a: la * 0.8 });
  label("0", CH.x0 - 22, CH.y0 + 11, { size: 32, align: "end", a: la * 0.8 });
  label("the cat's error", CH.x0 + 24, CH.y1 - 26, { size: 46, weight: 600, col: MG, align: "start", a: la });
  label("rounds", (CH.x0 + CH.x1) / 2, CH.y0 + 66, { size: 40, a: la * 0.85 });
  label("0", CH.x0, CH.y0 + 46, { size: 32, a: la * 0.7 });
  label("60", CH.x1, CH.y0 + 46, { size: 32, a: la * 0.7 });
  // the network's last streaks land as a pulse on the first point (0.60, where the meter left the cat's error)
  const head = chartHead(t);
  if (t < t0 + 0.35) {
    pulse(chx(0), chy(CAT[0]), 12 * ramp(t, t0 - 0.15, 0.15), { col: MG, a });
    return;
  }
  label(n2(CAT[0]), CH.x0 - 22, chy(CAT[0]) + 13, { size: 38, weight: 700, col: MG, align: "end", a: a * flick(t - t0 - 0.35) });
  g.beginPath();
  g.moveTo(chx(0), chy(CAT[0]));
  for (let r = 1; r <= Math.ceil(head.k) && r <= CH.n; r++) {
    const f = Math.min(1, head.k - (r - 1));
    g.lineTo(lerp(chx(r - 1), chx(r), f), chy(lerp(CAT[r - 1], CAT[r], f)));
  }
  tube(6, MG, a);
  // the round, at the head; when the curve is done, where 1,000 rounds take it
  const done = head.k >= CH.n;
  if (!done) {
    pulse(head.x, head.y, 12, { col: MG });
    label(`round ${Math.max(1, Math.floor(head.k))}`, head.x + 18, head.y - 34, { size: 38, weight: 600, align: "start", a });
  } else {
    const dt = t - (t0 + 0.35 + CURVE_DUR);
    label("round 60", CH.x1, chy(CAT[CH.n]) - 40, { size: 38, weight: 600, align: "end", a: a * (1 - ramp(dt, 0, 0.15)) });
    label(`round 1,000: ${n2(NET.cat_err_end)}`, CH.x1 + 30, chy(CAT[CH.n]) - 70, { size: 44, weight: 700, col: MG, align: "end", a: a * flick(dt - 0.15), knock: true });
    // the head pulse rests, then leads the cut: up to where the cat's answer will land
    if (t < CHART_OUT) pulse(head.x, head.y, 12, { col: MG });
  }
}

// s16: 1,000 rounds later: the answers, each at its value. The cat's tick lands where the chart's head pulse flies.
const ROWS = [["cat", 400], ["dog", 715], ["fish", 1030]];
const RX0 = 380, RX1 = 880;
function resultsScene(t) {
  const t0 = s.s16.start, t1 = s.s17.start;
  if (t < CHART_OUT || t > t1) return;
  const out = t1 - 0.4; // the answers leave as three pulses for the network's output
  const a = 1 - ramp(t, out, 0.15);
  // the lead pulse: from the chart's end to the cat's answer
  const end = chartHead(CHART_OUT);
  const p = ramp(t, CHART_OUT, 0.3, E.io2);
  const catX = lerp(RX0, RX1, NET.final.cat);
  if (p < 1) pulse(lerp(end.x, catX, p), lerp(end.y, ROWS[0][1], p), 12, { col: CY, dy: (ROWS[0][1] - end.y) * 0.05 });
  label(`${NET.rounds.toLocaleString("en-US")} rounds`, 497, 290, { size: 48, weight: 700, a: a * flick(t - t0 + 0.1) });
  ROWS.forEach(([name, y], n) => {
    const on = t0 - 0.1 + n * BEAT;
    if (t < on) return;
    const ra = a * clamp((t - on) / 0.15);
    drawShape(ICON[name], 190, y, name === "dog" ? 0.72 : 0.68, { w: 5, a: ra, k: ramp(t, on, 0.35, E.io2) });
    label(name, 190, y + 108, { size: 34, a: ra * 0.8 });
    line(RX0, y, lerp(RX0, RX1, ramp(t, on, 0.3, E.io2)), y, { w: 4, col: WH, a: ra * 0.85 });
    line(RX0, y - 16, RX0, y + 16, { w: 4, col: WH, a: ra * 0.85 });
    line(RX1, y - 16, RX1, y + 16, { w: 4, col: WH, a: ra * 0.85 * (t > on + 0.3 ? 1 : 0) });
    label("0", RX0, y + 80, { size: 34, a: ra * 0.75 });
    label("1", RX1, y + 80, { size: 34, a: ra * 0.75 });
    const v = NET.final[name], gx = lerp(RX0, RX1, v);
    const land = n === 0 ? CHART_OUT + 0.3 : on + 0.3;
    const drop = ramp(t, land, 0.25, E.outBack);
    if (t >= land && t < out + 0.2) {
      line(gx, y - 40 * drop, gx, y + 40 * drop, { w: 7, col: CY, a: ra });
      label(n2(v), clamp(gx, RX0 + 56, RX1 - 56), y - 60, { size: 60, weight: 700, col: CY, a: ra * flick(t - land - 0.05) });
    }
    // the answers fly into the network's output: the cut follows them (s17)
    if (t >= out) {
      const u = ramp(t, out, 0.4, E.in2);
      pulse(lerp(gx, OUT[0], u), lerp(y, OUT[1], u), 16, { col: CY, a: 1 - ramp(t, t1 - 0.05, 0.05), dx: (OUT[0] - gx) * 0.12 * u, dy: (OUT[1] - y) * 0.12 * u });
    }
  });
}

// s18: big models work the same way. A zoom-out in three steps: the toy network (12 weights) becomes one dot of a
// field of a million weights, which becomes one dot of a field of 175 billion (GPT-3, 2020). Not to scale: each
// field is drawn as a grid of dots that runs off the frame, each dot standing for many.
const FIELD_C = [540, 640], CELL = 46, STEP = 18; // each level is STEP times the one before, on screen
const L1 = [s.s18.start + 0.5, s.s18.start + 1.15], L2 = [s.s18.start + 1.75, s.s18.start + 2.4];
const levelAt = (t) => ramp(t, L1[0], L1[1] - L1[0], E.io2) + ramp(t, L2[0], L2[1] - L2[0], E.io2) + 0.08 * clamp((t - L2[1]) / 1.5);
// The toy's place in the zoom: from its own framing into the middle of the first field, then smaller and smaller.
function toyInField(t) {
  const k = ramp(t, s.s18.start, 0.5, E.io3);
  const L = levelAt(t);
  const sc = lerp(1, 0.9, k) * STEP ** -L;
  return { sc, cx: lerp(497, FIELD_C[0], k), cy: lerp(785, FIELD_C[1], k) };
}
function field(level, scale, a, t) {
  // a field of dots, CELL apart at scale 1, round FIELD_C; the centre dot is left for the level before it
  if (a <= 0.01 || scale < 0.02) return;
  const cell = CELL * scale;
  const reach = level === 1 ? 9.5 : 40; // the million field is finite (it must fit in one dot of the next)
  const n = Math.min(reach, Math.ceil(1300 / cell));
  const ring_ = Math.max(0.6, 0.27 * cell);
  g.save();
  g.globalAlpha = 1;
  g.lineCap = "round";
  const dots = new Path2D(), links = new Path2D();
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      if (!i && !j) continue;
      const d = Math.hypot(i, j);
      if (d > reach) continue;
      const x = FIELD_C[0] + i * cell, y = FIELD_C[1] + j * cell;
      if (x < -cell || x > W + cell || y < -cell || y > H + cell) continue;
      dots.moveTo(x + ring_, y);
      dots.arc(x, y, ring_, 0, TAU);
      if (i < n) {
        links.moveTo(x + ring_, y);
        links.lineTo(x + cell - ring_, y);
      }
      if (j < n) {
        links.moveTo(x, y + ring_);
        links.lineTo(x, y + cell - ring_);
      }
    }
  }
  const fade = level === 1 ? 1 : 1;
  g.globalAlpha = a * 0.35 * fade;
  g.strokeStyle = rgba(CY);
  g.lineWidth = Math.max(0.6, 1.4 * Math.min(1.6, scale));
  g.stroke(links);
  g.globalAlpha = a * fade;
  g.lineWidth = Math.max(0.7, 2.6 * Math.min(1.6, scale));
  g.stroke(dots);
  g.restore();
  // a dark falloff toward the edge of a finite field, so it reads as one blob from further out
  if (level === 1) {
    const rr = reach * cell;
    const gr = g.createRadialGradient(FIELD_C[0], FIELD_C[1], rr * 0.55, FIELD_C[0], FIELD_C[1], rr * 1.05);
    gr.addColorStop(0, "rgba(7,7,12,0)");
    gr.addColorStop(1, "rgba(7,7,12,1)");
    g.save();
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = gr;
    g.beginPath();
    g.arc(FIELD_C[0], FIELD_C[1], rr * 1.3, 0, TAU);
    g.arc(FIELD_C[0], FIELD_C[1], rr * 0.55, 0, TAU, true);
    g.fill();
    g.restore();
  }
}
const GPT = "175,000,000,000";
function scaleScene(t) {
  const t0 = s.s18.start, t1 = s.s19.start;
  if (t < t0 || t > t1 + 0.1) return;
  const a = 1 - ramp(t, t1 - 0.1, 0.12);
  const L = levelAt(t);
  // level 1: a million weights, the toy in its centre dot (drawn by toyScene); level 2: 175 billion
  field(1, STEP ** (1 - L), a * ramp(t, L1[0] - 0.05, 0.25), t);
  field(2, STEP ** (2 - L), a * ramp(t, L2[0] - 0.05, 0.25), t);
  // the count sits below the field: the field fades out above it
  {
    const gr = g.createLinearGradient(0, 960, 0, 1080);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(1, "rgba(0,0,0,1)");
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = gr;
    g.fillRect(0, 960, W, H - 960);
    g.restore();
  }
  // signals run through the big field once it is there
  if (t > L2[1]) {
    const pr = rng(5), sc = STEP ** (2 - L);
    for (let k = 0; k < 30; k++) {
      const row = Math.floor(pr() * 40) - 20, speed = 3 + pr() * 3, ph = pr() * 30;
      const u = ((t - L2[1]) * speed + ph) % 30 - 15;
      const py = FIELD_C[1] + row * CELL * sc;
      if (py < 960) pulse(FIELD_C[0] + u * CELL * sc, py, 4, { a: a * 0.8 * ramp(t, L2[1], 0.4) });
    }
  }
  // the count at each step, at its value
  const lvl = L < 0.98 ? 0 : L < 1.98 ? 1 : 2;
  const on = [t0 + 0.15, L1[1], L2[1]][lvl];
  hud(() => {
    const big = [`${WEIGHTS} weights`, "1,000,000 weights", GPT][lvl];
    const size = Math.min(96, 96 * (820 / textWidth(big, 96, 700)));
    label(big, 497, 1150, { size, weight: 700, col: CY, a: a * flick(t - on) });
    const sub = ["our toy network", "a field of a million", "weights in GPT-3 (2020)"][lvl];
    label(sub, 497, 1218, { size: 44, a: 0.9 * a * flick(t - on - 0.1) });
    if (lvl > 0) label("not to scale: each dot stands for many", 497, 1278, { size: 34, a: 0.8 * a * flick(t - L1[1] - 0.3) });
  });
}
const WEIGHTS = 12;

// s19: the answer in one frame: four rows; s20: the loop arrow opens into the phone of the first shot
const RECAP_Y = [340, 600, 860, 1120];
function recapScene(t) {
  const t0 = s.s19.start, t1 = s.s20.start;
  if (t < t0 - 0.2 || t > t1 + 1.1) return;
  // the lead pulse: from the middle of the big field to the first row's node
  if (t < t0 + 0.05) {
    const u = ramp(t, t0 - 0.2, 0.25, E.io2);
    pulse(lerp(FIELD_C[0], 190, u), lerp(FIELD_C[1], RECAP_Y[0] - 85, u), lerp(6, 12, u));
  }
  const out = ramp(t, t1, 0.35, E.in2);
  const words = [["1", "guess"], ["2", "measure error"], ["3", "nudge weights"], ["4", "repeat"]];
  words.forEach(([num, word], k) => {
    const on = t0 + 0.02 + k * BEAT;
    const y = RECAP_Y[k];
    const a = flick(t - on) * (k < 3 ? 1 - out : 1 - ramp(t, t1, 0.25));
    if (a <= 0.004) return;
    if (k === 0) {
      ring(190, y - 85, 38, { a });
      ring(190, y + 85, 38, { a });
      line(190, y - 85, 190, y + 85, { w: 5, a, r0: 38, r1: 38 });
      const u = ((t - on) / 0.9) % 1;
      pulse(190, lerp(y - 45, y + 45, u), 10, { a, dy: 24 });
    } else if (k === 1) {
      line(60, y, 320, y, { w: 5, col: WH, a: a * 0.85 });
      line(320, y - 40, 320, y + 40, { w: 6, col: WH, a });
      line(138, y, 312, y, { w: 16, col: MG, a });
      line(128, y - 40, 128, y + 40, { w: 8, col: CY, a });
    } else if (k === 2) {
      line(60, y + 18, 320, y + 18, { w: lerp(5, 13, ramp(t, on + 0.2, 0.5)), a });
      arrow(190, y + 80, 190, y - 54, { w: 6, col: MG, a, head: 20 });
    }
    label(num, 372, y + 26, { size: 72, weight: 700, col: CY, a, align: "start" });
    label(word, 430, y + 26, { size: 66, weight: 600, a, align: "start", n: (t - on) * 34 });
  });
  // row 4's loop arrow: it starts to turn, then spins up and opens into the phone (s20)
  const on4 = t0 + 0.02 + 3 * BEAT;
  if (t >= on4) loopArrow(t, flick(t - on4));
}
function loopArrow(t, a) {
  const t1 = s.s20.start;
  const spin = t < t1 ? Math.max(0, t - (s.s19.start + 0.05 + 3 * BEAT + 0.3)) * 0.35 : 0;
  const k = ramp(t, t1 + 0.1, 0.9, E.io3); // the morph: circle -> phone, done at s20 + 1.0, where phoneScene takes over
  if (t >= t1 + 1.0) return;
  const spinUp = t >= t1 ? (t - t1) * 0.35 + 1.6 * E.in2(clamp((t - t1) / 0.45)) * (1 - k) : 0;
  const from0 = (t < t1 ? -spin : -(spin + spinUp)) % 1;
  const cx = lerp(190, 540, k), cy = lerp(RECAP_Y[3], 760, k);
  const hw = lerp(96, 290, k), hh = lerp(96, 490, k), rr = lerp(96, 60, k);
  const frac = lerp(0.78, 1, E.io2(k));
  const from = lerp(from0 + 0.22, 0, E.io2(k));
  const end = rrect(cx, cy, hw, hh, rr, { from, k: frac, w: lerp(8, 6, k), col: CY, a });
  if (end && k < 0.7) {
    const p0 = rrectAt(cx, cy, hw, hh, rr, from + frac - 0.02);
    const ang = Math.atan2(end[1] - p0[1], end[0] - p0[0]);
    const hd = 24 * (1 - k / 0.7);
    g.beginPath();
    g.moveTo(end[0] - Math.cos(ang - 0.6) * hd, end[1] - Math.sin(ang - 0.6) * hd);
    g.lineTo(...end);
    g.lineTo(end[0] - Math.cos(ang + 0.6) * hd, end[1] - Math.sin(ang + 0.6) * hd);
    tube(8, CY, a * (1 - k / 0.7));
  }
}

// s07: the first example: a cat drawn in one line; its three answers flick down from it into the inputs
function exampleScene(t) {
  const t0 = s.s07.start, t1 = s.s14.start;
  if (t < t0 || t > t1 + 0.1) return;
  const a = 1 - ramp(t, s.s08.start + 0.6, 0.4);
  drawShape(ICON.cat, 540, 308, 0.7, { w: 5.5, a, k: ramp(t, t0 + 0.05, 0.55, E.io2) });
  for (let i = 0; i < 3; i++) {
    const at = t0 + BEAT - 0.2 + i * 0.25;
    if (t < at || t > at + 0.3) continue;
    const from = [lerp(480, 600, i / 2), 384], to = [IN[i][0], IN[i][1] - R];
    const on = NET.data[0].x[i] ? 1 : 0.45;
    line(...from, ...to, { w: 2.5, col: WH, a: a * on * 0.8, k0: ramp(t, at + 0.1, 0.12, E.in2), k1: ramp(t, at, 0.12, E.out2) });
    const u = ramp(t, at, 0.2, E.in2);
    if (u < 1) pulse(lerp(from[0], to[0], u), lerp(from[1], to[1], u), 7, { col: WH, a: a * on });
  }
}

// ── Sound events: logged from the same times the picture uses ─────────────────────────────────────────────────
{
  ev("frame0", 0, 0.2, { note: "the network is on" });
  // the phone's pulses arrive at a row: ticks while the phone is on screen
  for (let c = 0; c < CYCLES * 2; c++) {
    for (let row = 1; row < 4; row++) {
      const at = (Math.floor(c / 2) + row / 3 - PHASE0 - (c % 2) / 2) * PERIOD;
      if ((at >= 0.15 && at < s.s02.start + 0.4) || (at >= s.s20.start + 1.6 && at < D - 0.3)) ev("arrive", at, at, { row });
    }
  }
  ev("hum", 0, s.s02.start + 0.6);
  ev("whoosh", s.s02.start + 0.05, s.s02.start + 0.6, { note: "the phone slides down" });
  ev("draw", s.s02.start + 0.3, s.s02.start + 0.68, { note: "the rules card" });
  RULES.forEach(([c, o], i) => ev("type", s.s02.start + 0.66 + i * 0.44, s.s02.start + 0.66 + i * 0.44 + (c.length + o.length + 2) / 42));
  ev("cross", s.s02.start + 3 * BEAT, s.s02.start + 3 * BEAT + 0.26);
  ev("flickoff", s.s02.start + 2.1, s.s02.start + 2.3);
  ev("power", s.s03.start + 0.08, s.s03.start + 0.3, { n: 1 });
  ev("power", s.s03.start + BEAT, s.s03.start + BEAT + 0.22, { n: 2 });
  ev("learn", s.s03.start + 2 * BEAT, s.s03.start + 2 * BEAT + 0.22);
  ev("redraw", s.s04.start - 0.5, s.s04.start - 0.05, { note: "the network draws on behind the type" });
  ev("whoosh", s.s04.start, s.s04.start + 0.9, { note: "push through the phone" });
  ev("label", s.s04.start + 3 * BEAT);
  ev("label", s.s04.start + 4 * BEAT);
  ev("whoosh", s.s05.start - 0.6, s.s05.start, { note: "push into the network" });
  ev("lead", s.s05.start, s.s05.start + 0.3, { note: "the lead pulse lands: s05's first node" });
  ev("zap", s.s05.start + BEAT, s.s05.start + BEAT + 1.5, { strong: true });
  ev("flash", s.s05.start + BEAT + 1.5, s.s05.start + BEAT + 1.8, { note: "the strong pulse arrives" });
  ev("whoosh", s.s06.start - 0.5, s.s06.start + 0.25, { note: "pull back to the toy" });
  ev("blip", s.s06.start + 0.1, s.s06.start + 0.2, { n: 0 });
  ev("blip", s.s06.start + 0.42, s.s06.start + 0.52, { n: 1 });
  ev("blip", s.s06.start + 0.74, s.s06.start + 0.84, { n: 2 });
  ev("lines", s.s06.start + BEAT + 0.05, s.s06.start + BEAT + 0.05 + 9 * 0.07 + 0.18);
  ev("draw", s.s07.start + 0.05, s.s07.start + 0.6, { note: "the cat" });
  for (let i = 0; i < 3; i++) ev("input", s.s07.start + BEAT + i * 0.25, s.s07.start + BEAT + i * 0.25 + 0.1, { on: NET.data[0].x[i] });
  ev("forward", F0, F0 + 2 * FROW);
  ev("arrive_hidden", F0 + FROW);
  ev("arrive_out", F0 + 2 * FROW);
  ev("number", F0 + 2 * FROW + 0.1, F0 + 2 * FROW + 0.3, { note: "0.27" });
  ev("tick", s.s09.start + BEAT + 0.25, s.s09.start + BEAT + 0.3, { note: "the guess on the meter" });
  ev("tick", s.s09.start + 2 * BEAT, s.s09.start + 2 * BEAT + 0.05, { note: "the answer" });
  ev("error", s.s10.start + 0.1, s.s10.start + 0.75);
  ev("backward", BACK0, BACK0 + 2 * BACKROW);
  ev("nudge", NUDGE, NUDGE + 0.6);
  ev("number", s.s12.start + 2.1, s.s12.start + 2.3, { note: "0.66 -> 0.79" });
  ev("forward2", G0, G0 + 2 * GROW);
  ev("tick", s.s13.start + 1.47, s.s13.start + 1.5, { note: "the new guess lands" });
  ev("error2", s.s13.start + 1.5, s.s13.start + 1.8);
  REP.forEach((st) => ev(st.d > 0.1 ? "step" : "fast", st.t0, st.t0 + st.d, { example: st.example, round: st.round }));
  ev("collapse", s.s15.start - 0.18, s.s15.start + 0.12);
  ev("curve", s.s15.start + 0.35, s.s15.start + 0.35 + CURVE_DUR);
  ev("label", s.s15.start + 0.35 + CURVE_DUR + 0.15, s.s15.start + 0.35 + CURVE_DUR + 0.3, { note: "round 1,000: 0.02" });
  ev("lead", CHART_OUT + 0.3, CHART_OUT + 0.45, { note: "the cat's answer lands" });
  ROWS.slice(1).forEach(([name], n) => ev("result", s.s16.start - 0.1 + (n + 1) * BEAT + 0.3, s.s16.start - 0.1 + (n + 1) * BEAT + 0.55, { example: name }));
  ev("gather", s.s17.start - 0.4, s.s17.start, { note: "the answers fly into the network" });
  ev("morph", MORPH, MORPH + 1.0);
  ev("strongest", MORPH + 0.9, MORPH + 1.3);
  ev("label", MORPH + 1.35);
  ev("level", L1[0], L1[1], { n: 1 });
  ev("level", L2[0], L2[1], { n: 2 });
  ev("count", L2[1], L2[1] + 0.2, { note: "175,000,000,000" });
  for (let k = 0; k < 4; k++) ev("row", s.s19.start + 0.02 + k * BEAT, s.s19.start + 0.02 + k * BEAT + 0.2, { n: k });
  ev("whoosh", s.s20.start + 0.1, s.s20.start + 1.0, { note: "the loop opens into the phone" });
  for (let r = 0; r < 4; r++) ev("powerrow", s.s20.start + 1.0 + r * BEAT * 0.4, s.s20.start + 1.0 + r * BEAT * 0.4 + 0.15, { n: r });
  // the camera's moves over the toy network: a whoosh each
  for (const [a, b] of MOVES) ev("move", a, b);
}

// ── The camera's breath: a slow push and pull of about 1 % through every held picture ──────────────────────────
// Six slow swells over the film, never a jump at a cut, and back to the first frame's framing at the loop seam.
const breathe = (t) => 1 + 0.012 * Math.sin((TAU * 6 * t) / D);

// ── A frame ─────────────────────────────────────────────────────────────────────────────────────────────────────
function glowFrom(src, strong) {
  q.clearRect(0, 0, W / 4, H / 4);
  q.drawImage(src, 0, 0, W / 4, H / 4);
  q2.clearRect(0, 0, W / 4, H / 4);
  q2.filter = "blur(2.5px)";
  q2.drawImage(Q, 0, 0);
  q2.filter = "none";
  m.globalCompositeOperation = "lighter";
  m.globalAlpha = strong ? 1.0 : 0.4;
  m.drawImage(Q2, 0, 0, W, H);
  if (strong) {
    q3.clearRect(0, 0, W / 8, H / 8);
    q3.filter = "blur(3px)";
    q3.drawImage(Q, 0, 0, W / 8, H / 8);
    q3.filter = "none";
    m.globalAlpha = 0.9;
    m.drawImage(Q3, 0, 0, W, H);
  }
  m.globalAlpha = 1;
  m.globalCompositeOperation = "source-over";
}
function render(t) {
  // the camera: the framing for this moment, breathing about the point it frames
  Object.assign(cam, camAt(t));
  cam.z *= breathe(t);
  HUD.length = 0;

  for (const c of [g, gt]) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, H);
  }
  toWorld();
  phoneScene(t);
  rulesScene(t);
  questionScene(t);
  weightsScene(t);
  exampleScene(t);
  toyScene(t);
  meterScene(t);
  chartScene(t);
  resultsScene(t);
  scaleScene(t);
  recapScene(t);
  toScreen();
  {
    const gr = g.createLinearGradient(0, 1255, 0, 1490);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(0.2, "rgba(0,0,0,1)");
    gr.addColorStop(0.79, "rgba(0,0,0,1)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    for (const c of [g, gt]) {
      c.save();
      c.globalCompositeOperation = "destination-out";
      c.fillStyle = gr;
      c.fillRect(0, 1255, W, 235);
      c.restore();
    }
  }
  for (const fn of HUD) fn();
  g.globalAlpha = 1;
  gt.globalAlpha = 1;

  // the stage: near-black, the light behind the subject, the floor
  m.globalCompositeOperation = "source-over";
  m.globalAlpha = 1;
  m.fillStyle = BG;
  m.fillRect(0, 0, W, H);
  halo(t, 540, 780, 1);
  floor(t);
  // the glow: the lit things blurred at a quarter and an eighth of the size and added back as light; the lettering
  // gets a lighter glow of its own, so its letterforms stay crisp
  glowFrom(C, true);
  glowFrom(T, false);
  m.drawImage(C, 0, 0);
  m.drawImage(T, 0, 0);
  // chromatic aberration toward the edges: red from a copy 0.28 % larger, blue from one 0.28 % smaller
  const ca = 0.0028;
  cr.globalCompositeOperation = "copy";
  cr.drawImage(main, (-W * ca) / 2, (-H * ca) / 2, W * (1 + ca), H * (1 + ca));
  cr.globalCompositeOperation = "multiply";
  cr.fillStyle = "#ff0000";
  cr.fillRect(0, 0, W, H);
  cb.globalCompositeOperation = "source-over";
  cb.fillStyle = BG;
  cb.fillRect(0, 0, W, H);
  cb.drawImage(main, (W * ca) / 2, (H * ca) / 2, W * (1 - ca), H * (1 - ca));
  cb.globalCompositeOperation = "multiply";
  cb.fillStyle = "#0000ff";
  cb.fillRect(0, 0, W, H);
  m.globalCompositeOperation = "multiply";
  m.fillStyle = "#00ff00";
  m.fillRect(0, 0, W, H);
  m.globalCompositeOperation = "lighter";
  m.drawImage(CR, 0, 0);
  m.drawImage(CB, 0, 0);
  m.globalCompositeOperation = "source-over";
}
film.each(render);
film.finish();
