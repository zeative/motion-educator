// "Why does a² + b² = c² always work?" in the Chalkboard template. Built from storyboard.json: every time below is a
// shot's start or end, or a word of the take (voice/voice.json, the film's own clock), looked up by the word itself.
//
// One long board, sections A to E side by side; the camera glides and pushes along it. Section A (the opening) is
// never drawn on, so the last shot glides back to it and lands on frame 0: the loop. Every line is chalk, drawn on
// stroke by stroke (kit/engine/ink.js) under url(#chalk); every letter is written on; what goes is wiped with a cloth
// and leaves a smear. Labels never sit on hatching or grid lines: the chalk lifts round each one (a gap the shape of
// the label). Every figure is computed from its legs, never placed by eye (storyboard.build.py, f3 to f7): the
// proof's triangle has legs a = 240 and b = 320 px; the two moves are translations by (-a, -b) and (-b, +a), and the
// triangles that move are the drawn triangles themselves, carried, never redrawn.
// Colour: yellow chalk only for c² (and the one key underline of the question); blue for a² and b²; white for the rest.
import { createFilm } from "../../kit/engine/motion.js";
import { createInk } from "../../kit/engine/ink.js";

const storyboard = await (await fetch("storyboard.json")).json();
await Promise.all(['700 54px "Kalam"', '700 54px "Cabin Sketch"'].map((f) => document.fonts.load(f)));
const film = await createFilm({ storyboard });
const { tl, gsap, $, shots: s } = film;
const D = film.duration;
const ink = createInk(film);
const NS = "http://www.w3.org/2000/svg";
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r1 = (v) => Math.round(v * 10) / 10;

// ── The take's words: every chalk mark is timed to the word it goes with ─────────────────────────────────────────────
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9'-]/g, "");
function said(id, text, nth = 0, end = false) {
  let k = 0;
  for (const w of film.voiced[id]?.words ?? []) if (norm(w[2]) === text && k++ === nth) return end ? w[1] : w[0];
  throw new Error(`the take has no "${text}" (${nth}) in ${id}`);
}
const saidEnd = (id, text, nth = 0) => said(id, text, nth, true);

// ── Sound log: every line, letter, tap, wipe and move, with its time (render.mjs --events -> events.json) ───────────
const events = (window.__events = []);
const log = (kind, at, end = at, note) => events.push({ kind, at: +at.toFixed(3), end: +end.toFixed(3), ...(note ? { note } : {}) });

// ── The board: one long surface, painted once, drawn where the camera is ──────────────────────────────────────────────
const SEC = { A: 0, B: 2000, C: 4000, D: 6000, E: 8000 };
const BX0 = -1400, BX1 = 11400, BY0 = -700, BY1 = 1780, TS = 0.5;
const tex = Object.assign(document.createElement("canvas"), { width: (BX1 - BX0) * TS, height: (BY1 - BY0) * TS });
{
  const c = tex.getContext("2d", { willReadFrequently: true });
  const r = rng(29);
  c.fillStyle = "#1f3b2d";
  c.fillRect(0, 0, tex.width, tex.height);
  // Old chalk, rubbed in: broad faint clouds, then the arcs an eraser left behind.
  c.filter = "blur(22px)";
  for (let i = 0; i < 180; i++) {
    c.fillStyle = `rgba(236,242,230,${0.018 + r() * 0.03})`;
    c.beginPath();
    c.ellipse(r() * tex.width, r() * tex.height, 50 + r() * 170, 16 + r() * 50, (r() - 0.5) * 0.6, 0, Math.PI * 2);
    c.fill();
  }
  c.filter = "blur(10px)";
  c.lineCap = "round";
  for (let i = 0; i < 130; i++) {
    const x = r() * tex.width, y = r() * tex.height, l = 90 + r() * 220, bend = (r() - 0.5) * 60;
    c.strokeStyle = `rgba(236,242,230,${0.012 + r() * 0.022})`;
    c.lineWidth = 14 + r() * 26;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + l / 2, y + bend, x + l, y + (r() - 0.5) * 20);
    c.stroke();
  }
  c.filter = "none";
  const img = c.getImageData(0, 0, tex.width, tex.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 2;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  c.putImageData(img, 0, 0);
}
const boardCtx = $("#board").getContext("2d");

// The wooden frame round the board, fixed to the picture (painted once).
{
  const cv = $("#frame"), c = cv.getContext("2d"), r = rng(5), F = 34, W = cv.width, H = cv.height;
  const rails = [
    [[0, 0], [W, 0], [W - F, F], [F, F], "h"],
    [[0, H], [W, H], [W - F, H - F], [F, H - F], "h"],
    [[0, 0], [0, H], [F, H - F], [F, F], "v"],
    [[W, 0], [W, H], [W - F, H - F], [W - F, F], "v"],
  ];
  for (const [k, [a, b, cc, dd, dir]] of rails.entries()) {
    c.save();
    c.beginPath();
    c.moveTo(...a); c.lineTo(...b); c.lineTo(...cc); c.lineTo(...dd); c.closePath();
    c.clip();
    c.fillStyle = ["#7a4d2b", "#6f4526", "#754a29", "#704727"][k];
    c.fillRect(0, 0, W, H);
    // Grain running along the rail.
    for (let i = 0; i < 40; i++) {
      const off = r() * F, dark = r() < 0.6;
      c.strokeStyle = dark ? `rgba(40,22,10,${0.05 + r() * 0.1})` : `rgba(190,140,95,${0.03 + r() * 0.06})`;
      c.lineWidth = 0.6 + r() * 1.6;
      c.beginPath();
      const len = dir === "h" ? W : H, wob = 1 + r() * 3, f = 0.002 + r() * 0.01, ph = r() * 6;
      for (let s2 = 0; s2 <= len; s2 += 12) {
        const o = off + Math.sin(s2 * f + ph) * wob;
        const [x, y] = dir === "h" ? [s2, (k === 0 ? 0 : H - F) + o] : [(k === 2 ? 0 : W - F) + o, s2];
        s2 ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    }
    c.restore();
  }
  // The mitred joins, the outer and inner edges, and the frame's shadow on the board.
  c.strokeStyle = "rgba(30,16,6,0.55)";
  c.lineWidth = 1.5;
  for (const [a, b] of [[[0, 0], [F, F]], [[W, 0], [W - F, F]], [[0, H], [F, H - F]], [[W, H], [W - F, H - F]]]) {
    c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke();
  }
  c.strokeStyle = "rgba(20,10,4,0.7)";
  c.lineWidth = 3;
  c.strokeRect(F - 1.5, F - 1.5, W - 2 * F + 3, H - 2 * F + 3);
  c.strokeStyle = "rgba(205,160,110,0.35)";
  c.lineWidth = 1.5;
  c.strokeRect(F - 5, F - 5, W - 2 * F + 10, H - 2 * F + 10);
  c.strokeStyle = "rgba(20,10,4,0.6)";
  c.lineWidth = 2;
  c.strokeRect(1, 1, W - 2, H - 2);
  for (let i = 0; i < 10; i++) {
    c.strokeStyle = `rgba(0,0,0,${0.16 * (1 - i / 10) ** 2})`;
    c.lineWidth = 1;
    c.strokeRect(F + i + 0.5, F + i + 0.5, W - 2 * F - 2 * i - 1, H - 2 * F - 2 * i - 1);
  }
}

// ── The camera: board point (x, y) at the middle of the frame, at zoom z (times k, a glide's pull-back) ───────────
const cam = { x: 960, y: 540, z: 1, k: 1 };
const home = (key) => ({ x: SEC[key] + 960, y: 540, z: 1 });
// Section point (fx, fy) at the middle of the frame, at zoom z.
const at = (key, fx, fy, z = 1) => ({ x: SEC[key] + fx, y: fy, z });
let camAt = home("A");
// Every move is a fromTo from where the last one left it, so any frame can be drawn on its own.
function camTo(to, t, d, ease = "power2.inOut") {
  tl.fromTo(cam, { x: camAt.x, y: camAt.y, z: camAt.z }, { x: to.x, y: to.y, z: to.z, duration: d, ease, immediateRender: false }, t);
  camAt = { ...to };
}
// A glide along the board: eased in and out, pulling back a little as it travels (as a camera on a rail does), the
// picture softened a touch at its fastest. The air of it is logged for the sound.
const mb = { x: 0 };
$("#filters").insertAdjacentHTML("beforeend", '<filter id="slideblur" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="0 0"/></filter>');
const blurNode = $("#slideblur feGaussianBlur");
function glide(to, t, d, { dip = 0.86, blur = 4 } = {}) {
  camTo(to, t, d, "power2.inOut");
  tl.fromTo(cam, { k: 1 }, { k: dip, duration: d / 2, ease: "sine.inOut", immediateRender: false }, t);
  tl.fromTo(cam, { k: dip }, { k: 1, duration: d / 2, ease: "sine.inOut", immediateRender: false }, t + d / 2);
  tl.fromTo(mb, { x: 0 }, { x: blur, duration: d / 2, ease: "power2.in", immediateRender: false }, t);
  tl.fromTo(mb, { x: blur }, { x: 0, duration: d / 2, ease: "power2.out", immediateRender: false }, t + d / 2);
  log("slide", t, t + d);
}

const camEl = $("#cam"), world = $("#world");
const sections = [];
film.each(() => {
  const { x, y } = cam, z = cam.z * cam.k;
  camEl.style.transform = `translate(${(960 - x * z).toFixed(2)}px, ${(540 - y * z).toFixed(2)}px) scale(${z.toFixed(5)})`;
  const sw = 1920 / z, sh = 1080 / z, wx = x - sw / 2, wy = y - sh / 2;
  boardCtx.drawImage(tex, (wx - BX0) * TS, (wy - BY0) * TS, sw * TS, sh * TS, 0, 0, 1920, 1080);
  const on = mb.x > 0.3;
  if (on) blurNode.setAttribute("stdDeviation", `${mb.x.toFixed(2)} 0`);
  world.style.filter = on ? "url(#slideblur)" : "";
  // Only the sections in view are drawn.
  for (const sec of sections) {
    const v = sec.ox + 2000 > wx - 60 && sec.ox < wx + sw + 60 ? "visible" : "hidden";
    if (sec.el.style.visibility !== v) sec.el.style.visibility = v;
  }
});
film.scene("#world", 0, D);

// ── Chalk: sections, layers, lines, lettering ──────────────────────────────────────────────────────────────────
function section(key) {
  const el = Object.assign(document.createElement("div"), { className: "sec" });
  el.style.left = `${SEC[key]}px`;
  camEl.append(el);
  const sec = { key, el, ox: SEC[key] };
  sections.push(sec);
  return sec;
}
// A layer is what one cloth wipe takes away: its own svg and its own lettering.
function layer(sec) {
  const el = Object.assign(document.createElement("div"), { className: "layer" });
  el.innerHTML = '<svg viewBox="0 0 2000 1080"></svg>';
  sec.el.append(el);
  return { sec, el, svg: el.querySelector("svg") };
}
function g(parent, cls = "") {
  const e = document.createElementNS(NS, "g");
  if (cls) e.setAttribute("class", cls);
  (parent.svg ?? parent).append(e);
  return e;
}
function line(parent, d, cls = "") {
  const p = document.createElementNS(NS, "path");
  p.setAttribute("d", d);
  if (cls) p.setAttribute("class", cls);
  (parent.svg ?? parent).append(p);
  return p;
}
const P = (pts, close = true) => `M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(" L")}${close ? " Z" : ""}`;
// Each side its own stroke, so a shape is drawn side by side as a hand draws it.
const sides = (pts, close = true) => pts.slice(0, close ? pts.length : pts.length - 1).map((a, i) => `M${r1(a[0])} ${r1(a[1])} L${r1(pts[(i + 1) % pts.length][0])} ${r1(pts[(i + 1) % pts.length][1])}`).join(" ");
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
// Lettering at its baseline's middle (x, y), as the storyboard writes it.
function text(L, x, y, html, size, cls = "") {
  const el = Object.assign(document.createElement("div"), { className: `t ${cls}`.trim(), innerHTML: html });
  Object.assign(el.style, { left: `${x}px`, top: `${y}px`, fontSize: `${size}px` });
  (L.el ?? L).append(el);
  return el;
}
// Where a piece of lettering sits in its section (measured while the camera is still at rest, at scale 1).
function box(el, sec) {
  const r = el.getBoundingClientRect(), c = camEl.getBoundingClientRect();
  return { x0: r.left - c.left - sec.ox, x1: r.right - c.left - sec.ox, y0: r.top - c.top, y1: r.bottom - c.top };
}
// The gap the chalk leaves round a label: its box, a little larger.
const gap = (el, sec, pad = 5, more = {}) => { const b = box(el, sec); return { x0: b.x0 - pad - (more.l ?? 0), x1: b.x1 + pad + (more.r ?? 0), y0: b.y0 + 4 - pad, y1: b.y1 - 2 + pad }; };
let seed = 1;
const rough = (els, amount = 1.1) => ink.roughen(els, { amount, step: 9, seed: seed++ });
// Drawing, writing and wiping, each logged for the sound.
// A stroke is drawn on through a dash offset kept in a state object and written every frame. ink.drawOn tweens
// strokeDashoffset itself and GSAP rounds it to whole pixels, so on a pathLength="1" path the stroke popped on whole
// at half its time (the verifier saw whole strokes appear on one frame). Every stroke takes at least `min` seconds and
// is drawn no faster than `cap` px a second, so it is always seen being drawn.
const dash = new Map();
const dashOf = (path) => {
  let st = dash.get(path);
  if (!st) {
    st = { off: 1, last: null };
    dash.set(path, st);
    path.setAttribute("pathLength", "1");
    path.style.strokeDasharray = "1 1.02";
  }
  return st;
};
film.each(() => {
  for (const [path, st] of dash) if (st.last !== st.off) { path.style.strokeDashoffset = st.off.toFixed(4); st.last = st.off; }
});
function inkOn(els, t0, { speed = 2200, duration, gap = 0.03, ease = "power1.inOut", min, cap, kind } = {}) {
  const list = ink.paths(Array.isArray(els) ? els.flat(4) : els);
  const lengths = list.map((q) => q.getTotalLength());
  const hatchy = kind === "hatch";
  min ??= hatchy ? 0.02 : 0.06;
  cap ??= hatchy ? 15000 : 6500;
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  const scale = duration ? Math.max(0.02, duration - gap * (list.length - 1)) / (total / speed) : 1;
  let t = t0;
  list.forEach((path, i) => {
    const d = Math.max(min, lengths[i] / cap, (lengths[i] / speed) * scale);
    tl.fromTo(dashOf(path), { off: 1 }, { off: 0, duration: d, ease, immediateRender: false }, t);
    t += d + gap;
  });
  return t;
}
function draw(els, t, o = {}) {
  const end = inkOn(els, t, o);
  log(o.kind ?? "line", t, end, o.note);
  return end;
}
function write(els, t, o = {}) {
  const end = ink.write(els, t, { speed: 16, ...o });
  log("write", t, end, o.note);
  return end;
}
// A cloth wipe across box [x0, y0, x1, y1] of a section, left to right: the layers go, a faint smear stays.
const wipes = [];
function wipe(layers, sec, [x0, y0, x1, y1], t, d = 0.3, note) {
  const sm = Object.assign(document.createElement("div"), { className: "smear" });
  Object.assign(sm.style, { left: `${x0 - 10}px`, top: `${y0 - 6}px`, width: `${x1 - x0 + 20}px`, height: `${y1 - y0 + 12}px` });
  // the cloth's passes: a few long streaks of rubbed-in chalk, not a cloud
  const r = rng(Math.round(x0 * 3 + y0 * 7 + t * 50)), h = y1 - y0 + 12, n = Math.max(2, Math.round(h / 95));
  for (let i = 0; i < n; i++) {
    const st = document.createElement("i"), hh = (h / n) * (0.55 + r() * 0.5);
    Object.assign(st.style, { left: `${r() * 4}%`, width: `${88 + r() * 12}%`, top: `${(i / n) * h + r() * (h / n - hh)}px`, height: `${hh}px`, opacity: (0.45 + r() * 0.55).toFixed(2), transform: `rotate(${((r() - 0.5) * 3).toFixed(2)}deg)` });
    sm.append(st);
  }
  sec.el.prepend(sm);
  // the eraser itself, a felt block on a wooden back, swept along the wiping edge in up-and-down passes
  const er = Object.assign(document.createElement("div"), { className: "eraser" });
  er.innerHTML = "<i></i>";
  camEl.append(er); // outside the section, so the chalk filter does not grain it
  const st = { p: 0 };
  tl.fromTo(st, { p: 0 }, { p: 1, duration: d, ease: "power1.inOut", immediateRender: false }, t);
  wipes.push({ st, layers: [].concat(layers), sm, er, ox: sec.ox, x0, x1, y0, y1, passes: Math.max(1, Math.round((y1 - y0) / 260)) });
  log("wipe", t, t + d, note);
  return t + d;
}
film.each(() => {
  for (const { st, layers, sm, er, ox, x0, x1, y0, y1, passes } of wipes) {
    const x = x0 - 70 + (x1 - x0 + 140) * st.p;
    const on = st.p > 0 && st.p < 1;
    er.style.visibility = on ? "visible" : "hidden";
    if (on) {
      const H = 170, span = Math.max(0, y1 - y0 - H + 40), ph = st.p * passes * Math.PI;
      er.style.transform = `translate(${(ox + x - 40).toFixed(1)}px, ${(y0 - 20 + span * (0.5 - 0.5 * Math.cos(ph))).toFixed(1)}px) rotate(${(4 * Math.sin(ph * 2)).toFixed(2)}deg)`;
    }
    for (const L of layers) {
      const el = L.el ?? L;
      const m = st.p <= 0 ? "" : st.p >= 1 ? "linear-gradient(transparent, transparent)" : `linear-gradient(90deg, transparent ${(x - 30).toFixed(1)}px, #000 ${(x + 30).toFixed(1)}px)`;
      if (el.style.webkitMaskImage !== m) el.style.webkitMaskImage = el.style.maskImage = m;
      el.style.visibility = st.p >= 1 ? "hidden" : "";
    }
    const sx = x - x0 + 10;
    sm.style.visibility = st.p <= 0 ? "hidden" : "";
    const mm = st.p >= 1 ? "" : `linear-gradient(90deg, #000 ${(sx - 40).toFixed(1)}px, transparent ${(sx + 10).toFixed(1)}px)`;
    if (sm.style.webkitMaskImage !== mm) sm.style.webkitMaskImage = sm.style.maskImage = mm;
  }
});

// The parts of segment p-q that lie outside every gap (axis-aligned boxes): where the chalk lifts.
function clipOut(p, q, holes = []) {
  const dx = q[0] - p[0], dy = q[1] - p[1];
  let keep = [[0, 1]];
  for (const h of holes) {
    let t0 = 0, t1 = 1, hit = true;
    for (const [pk, qk] of [[-dx, p[0] - h.x0], [dx, h.x1 - p[0]], [-dy, p[1] - h.y0], [dy, h.y1 - p[1]]]) {
      if (Math.abs(pk) < 1e-9) { if (qk < 0) { hit = false; break; } continue; }
      const rr = qk / pk;
      if (pk < 0) { if (rr > t1) { hit = false; break; } if (rr > t0) t0 = rr; }
      else { if (rr < t0) { hit = false; break; } if (rr < t1) t1 = rr; }
    }
    if (!hit || t1 <= t0) continue;
    keep = keep.flatMap(([a, b]) => [[a, Math.min(b, t0)], [Math.max(a, t1), b]].filter(([u, v]) => v - u > 1e-4));
  }
  return keep.map(([a, b]) => [[p[0] + dx * a, p[1] + dy * a], [p[0] + dx * b, p[1] + dy * b]]);
}
const segs = (list, holes, min = 4) => list.flatMap(([p, q]) => clipOut(p, q, holes)).filter(([m, n]) => Math.hypot(n[0] - m[0], n[1] - m[1]) > min).map(([m, n]) => `M${r1(m[0])} ${r1(m[1])} L${r1(n[0])} ${r1(n[1])}`).join(" ");

// Hatching: the side of the chalk dragged back and forth across a convex shape, a little inside its outline, each
// stroke a touch off the last in spacing and angle, lifting short of the edge unevenly, and round every label.
function inset(pts, d) {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
  const sg = Math.sign(area);
  const lines = pts.map((a, i) => {
    const b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    return { p: [a[0] + (-dy / l) * sg * d, a[1] + (dx / l) * sg * d], v: [dx, dy] };
  });
  return lines.map((L, i) => {
    const M = lines[(i + n - 1) % n];
    const den = M.v[0] * L.v[1] - M.v[1] * L.v[0];
    const t = ((L.p[0] - M.p[0]) * L.v[1] - (L.p[1] - M.p[1]) * L.v[0]) / den;
    return [M.p[0] + M.v[0] * t, M.p[1] + M.v[1] * t];
  });
}
let hatchSeed = 11;
function hatchPaths(pts, { spacing = 13, angle = 60, pad = 7, holes = [], jitter = 0.12, tilt = 1.2 } = {}) {
  const poly = inset(pts, pad);
  const r = rng(hatchSeed++ * 7919);
  const a0 = (angle * Math.PI) / 180, nv = [-Math.sin(a0), Math.cos(a0)];
  const pr = poly.map((p) => p[0] * nv[0] + p[1] * nv[1]);
  const lo = Math.min(...pr), hi = Math.max(...pr);
  const list = [];
  let k = 0;
  for (let c = lo + spacing * (0.3 + r() * 0.5); c < hi; c += spacing * (1 + (r() - 0.5) * 2 * jitter)) {
    const a = a0 + ((r() - 0.5) * 2 * tilt * Math.PI) / 180, d = [Math.cos(a), Math.sin(a)], o = [nv[0] * c, nv[1] * c];
    const ts = [];
    poly.forEach((A, i) => {
      const B = poly[(i + 1) % poly.length], e = [B[0] - A[0], B[1] - A[1]], den = d[0] * e[1] - d[1] * e[0];
      if (Math.abs(den) < 1e-9) return;
      const w = [A[0] - o[0], A[1] - o[1]], t = (w[0] * e[1] - w[1] * e[0]) / den, u = (w[0] * d[1] - w[1] * d[0]) / den;
      if (u >= -1e-6 && u <= 1 + 1e-6) ts.push(t);
    });
    if (ts.length < 2) continue;
    const t0 = Math.min(...ts) + r() * 5, t1 = Math.max(...ts) - r() * 5;
    if (t1 - t0 < 8) continue;
    let p = [o[0] + d[0] * t0, o[1] + d[1] * t0], q = [o[0] + d[0] * t1, o[1] + d[1] * t1];
    if (k++ % 2) [p, q] = [q, p];
    list.push([p, q]);
  }
  return segs(list, holes, 6);
}
const hatch = (parent, pts, cls, o) => rough(line(parent, hatchPaths(pts, o), cls), 0.7);

// An equals sign as a teacher draws it: two firm strokes, centred on (x, y), w wide.
const equals = (L, x, y, w) => rough(line(L, `M${x - w / 2} ${y - w * 0.17} L${x + w / 2} ${y - w * 0.19} M${x - w / 2} ${y + w * 0.17} L${x + w / 2} ${y + w * 0.15}`, "fat"), 0.8);
// An arrow: a shaft and a head.
function arrow(parent, x0, y0, x1, y1, cls = "", bend = 0) {
  const mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend;
  const a = Math.atan2(y1 - my, x1 - mx), h = 22;
  return line(parent, `M${r1(x0)} ${r1(y0)} Q${r1(mx)} ${r1(my)} ${r1(x1)} ${r1(y1)} M${r1(x1 - Math.cos(a - 0.5) * h)} ${r1(y1 - Math.sin(a - 0.5) * h)} L${r1(x1)} ${r1(y1)} L${r1(x1 - Math.cos(a + 0.5) * h)} ${r1(y1 - Math.sin(a + 0.5) * h)}`, cls);
}
// An angle's arc at vertex v from direction u1 to u2 (unit vectors), radius r.
function arc(parent, v, u1, u2, r, cls = "") {
  const a1 = Math.atan2(u1[1], u1[0]), a2 = Math.atan2(u2[1], u2[0]);
  let da = a2 - a1;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  const p1 = [v[0] + Math.cos(a1) * r, v[1] + Math.sin(a1) * r], p2 = [v[0] + Math.cos(a2) * r, v[1] + Math.sin(a2) * r];
  return line(parent, `M${r1(p1[0])} ${r1(p1[1])} A${r} ${r} 0 0 ${da > 0 ? 1 : 0} ${r1(p2[0])} ${r1(p2[1])}`, cls);
}
const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
const along = (v, u, r) => [v[0] + u[0] * r, v[1] + u[1] * r];
const bis = (u1, u2) => unit([0, 0], [u1[0] + u2[0], u1[1] + u2[1]]);
// The little square in a right angle at v, its legs along u1 and u2.
const rightMark = (parent, v, u1, u2, s2 = 22, cls = "thin") => line(parent, P([along(v, u1, s2), [v[0] + (u1[0] + u2[0]) * s2, v[1] + (u1[1] + u2[1]) * s2], along(v, u2, s2)], false), cls);
const centroid = (pts) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
const ring = (parent, x, y, r, cls = "thin") => line(parent, `M${x + r} ${y} a${r} ${r} 0 1 0 ${-2 * r} 0 a${r} ${r} 0 1 0 ${2 * r} 0`, cls);
const tickMark = (parent, x, y, cls = "thin") => line(parent, `M${r1(x)} ${r1(y)} l9 10 l17 -24`, cls);

// A tap of the chalk: a dot and a puff of dust that settles in half a second (nothing stays).
const taps = [];
function tap(sec, x, y, t, note) {
  const holder = sec.dust ?? (sec.dust = g(layer(sec).svg));
  const r = rng(Math.round(x * 7 + y * 13 + t * 100));
  const dot = document.createElementNS(NS, "circle");
  dot.setAttribute("class", "dust");
  dot.setAttribute("r", "6");
  holder.append(dot);
  const bits = Array.from({ length: 14 }, () => {
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("class", "dust");
    holder.append(c);
    const ang = -Math.PI * (0.05 + r() * 0.9) + (r() < 0.25 ? Math.PI : 0);
    return { c, vx: Math.cos(ang) * (40 + r() * 90), vy: Math.sin(ang) * (30 + r() * 70), rad: 1.2 + r() * 2.4, life: 0.4 + r() * 0.45 };
  });
  taps.push({ x, y, t, dot, bits });
  log("tap", t, t + 0.05, note);
}
film.each((now) => {
  for (const { x, y, t, dot, bits } of taps) {
    const dt = now - t;
    const on = dt >= 0 && dt < 0.9;
    dot.style.visibility = on ? "visible" : "hidden";
    if (on) {
      dot.setAttribute("cx", x);
      dot.setAttribute("cy", y);
      dot.style.opacity = Math.max(0, 0.95 - dt * 1.2).toFixed(3);
    }
    for (const b of bits) {
      const live = on && dt < b.life;
      b.c.style.visibility = live ? "visible" : "hidden";
      if (!live) continue;
      b.c.setAttribute("cx", r1(x + b.vx * dt));
      b.c.setAttribute("cy", r1(y + b.vy * dt + 140 * dt * dt));
      b.c.setAttribute("r", b.rad);
      b.c.style.opacity = (0.85 * (1 - dt / b.life)).toFixed(3);
    }
  }
});
// The chalk run along a line already drawn: a bright tip that leaves nothing new behind.
function retrace(parent, d, t, dur, cls = "", note = "retrace") {
  const p = line(parent, d, `tip ${cls}`);
  p.setAttribute("pathLength", "1");
  p.style.strokeDasharray = "0.12 3";
  const st = { o: 0.12, last: null };
  gsap.set(p, { visibility: "hidden" });
  tl.set(p, { visibility: "visible" }, t);
  tl.fromTo(st, { o: 0.12 }, { o: -1, duration: dur, ease: "power1.inOut", immediateRender: false }, t);
  tl.set(p, { visibility: "hidden" }, t + dur);
  film.each(() => { if (st.last !== st.o) { p.style.strokeDashoffset = st.o.toFixed(4); st.last = st.o; } });
  log("line", t, t + dur, note);
}
const showAt = (el, t) => { gsap.set(el, { visibility: "hidden" }); tl.set(el, { visibility: "visible" }, t); };

// ── The figure: a right triangle with legs a (up) and b (along), and a square on each side ───────────────────────
// Right angle at (cx, cy); a = 3u, b = 4u (the 3-4-5 triangle); the square on c sits outside the hypotenuse.
function figurePts(cx, cy, u) {
  const A = [cx, cy - 3 * u], C = [cx, cy], B = [cx + 4 * u, cy];
  const n = [3 * u, -4 * u];
  return { A, B, C, B2: [B[0] + n[0], B[1] + n[1]], A2: [A[0] + n[0], A[1] + n[1]], u, cx, cy };
}

// ═══ Section A: the opening board, finished at frame 0 and never drawn on again (s01 to s03, s20) ═══════════════
const A = section("A");
const LA = layer(A);
const FA = figurePts(530, 600, 70);
const sqPathA = {};
{
  const { A: pa, B: pb, C: pc, A2, B2, cx, cy, u } = FA;
  const tri = [pa, pc, pb];
  // the sides' letters inside the triangle, each with its gap in the hatching
  const la = text(LA, cx + 26, cy - 1.5 * u + 30, "a", 48), lb = text(LA, cx + 2.4 * u, cy - 14, "b", 48), lc = text(LA, cx + 1.75 * u, cy - 0.85 * u + 14, "c", 48);
  hatch(LA, tri, "hl", { spacing: 21, angle: 120, pad: 9, holes: [la, lb, lc].map((el) => gap(el, A, 4)) });
  rough(line(LA, P(tri)), 1);
  rough(rightMark(LA, pc, [0, -1], [1, 0]), 0.4);
  sqPathA.a = P(rect(cx - 3 * u, cy - 3 * u, 3 * u, 3 * u));
  sqPathA.b = P(rect(cx, cy, 4 * u, 4 * u));
  sqPathA.c = P([pa, pb, B2, A2]);
  rough(line(LA, sqPathA.a, "b"), 1.1);
  rough(line(LA, sqPathA.b, "b"), 1.1);
  rough(line(LA, sqPathA.c, "y"), 1.1);
  text(LA, cx - 1.5 * u, cy - 1.5 * u + 22, "a²", 64, "b");
  text(LA, cx + 2 * u, cy + 2 * u + 22, "b²", 70, "b");
  text(LA, (pa[0] + B2[0]) / 2, (pa[1] + B2[1]) / 2 + 24, "c²", 74, "y");
}
text(LA, 1470, 220, "Why does it", 92);
const qLine = text(LA, 1470, 322, '<span class="al">always</span> work?', 92);
const formulaA = text(LA, 1470, 560, '<span class="ta b">a²</span> + <span class="tb b">b²</span> = <span class="tc y">c²</span>', 104);
const alBox = box(qLine.querySelector(".al"), A);
const underA = `M${r1(alBox.x0 + 4)} ${r1(alBox.y1 + 6)} C ${r1(alBox.x0 + 60)} ${r1(alBox.y1 + 12)}, ${r1(alBox.x1 - 70)} ${r1(alBox.y1 + 1)}, ${r1(alBox.x1 + 2)} ${r1(alBox.y1 + 8)}`;
rough(line(LA, underA, "y"), 0.6);
const termX = [".ta", ".tb", ".tc"].map((k) => { const b = box(formulaA.querySelector(k), A); return [(b.x0 + b.x1) / 2 - 8, b.y1 + 14]; });

// s01: the camera pushes in toward the right angle (the square on c stays in the frame); two taps on its little
// square on "right triangle".
camTo(at("A", 690, 524, 1.16), 0, s.s02.start - 0.15, "power1.out");
tap(A, FA.cx + 11, FA.cy - 11, said("s01", "right") + 0.04, "tap on the right angle");
tap(A, FA.cx + 12, FA.cy - 10, said("s01", "triangle") + 0.04, "tap on the right angle");
// s02: out to the formula and the figure together; as each term is said, a tap under it and the chalk runs round
// the square it names (the same lines: nothing new is drawn on section A).
camTo(at("A", 1100, 520, 1.12), s.s02.start - 0.15, 0.75);
camTo(at("A", 1110, 515, 1.15), s.s02.start + 0.6, s.s03.start - 0.1 - (s.s02.start + 0.6), "none");
tap(A, termX[0][0], termX[0][1], said("s02", "a") + 0.06, "tap under a²");
retrace(LA, sqPathA.a, said("s02", "squared") - 0.02, 0.5, "b", "the square on a, run round");
tap(A, termX[1][0], termX[1][1], said("s02", "b") + 0.04, "tap under b²");
retrace(LA, sqPathA.b, said("s02", "squared", 1) - 0.02, 0.5, "b", "the square on b, run round");
tap(A, termX[2][0], termX[2][1], said("s02", "c") + 0.04, "tap under c²");
retrace(LA, sqPathA.c, said("s02", "squared", 2) - 0.02, 0.6, "y", "the square on c, run round");
// s03: back to frame 0's framing, the question in view; the chalk runs along the yellow line under "always".
camTo(home("A"), s.s03.start - 0.1, 1.45, "power2.inOut");
retrace(LA, underA, said("s03", "always") - 0.04, 0.42, "y");

// ═══ Section B: squared means a square (s04, s05) ════════════════════════════════════════════════════════════════
const B = section("B");
const LB = layer(B);
glide(at("B", 960, 520, 1.02), 7.02, 0.95);
camTo(at("B", 990, 505, 1.06), 7.97, 12.7 - 7.97, "none");
{
  const a2 = text(LB, 470, 520, "a²", 230, "b");
  write(a2, said("s04", "squared") - 0.06, { duration: 0.42 });
  draw(equals(LB, 760, 452, 92), said("s04", "means") + 0.05, { duration: 0.18, gap: 0.04, note: "=" });
  const sq = rough(line(LB, sides(rect(960, 190, 420, 420)), "b fat"), 1.2);
  const tq = draw(sq, said("s04", "actual") - 0.02, { duration: 0.62, gap: 0.035 });
  tap(B, 962, 190, tq + 0.01, "the square closes");
  const lead = rough(line(LB, "M1532 342 Q1460 350 1394 382", "thin"), 0.6);
  draw(lead, said("s04", "square") + 0.1, { duration: 0.14 });
  write(text(LB, 1640, 330, "square", 60, "hand"), said("s04", "square") + 0.22, { duration: 0.36 });
  // s05: the area is what the square covers: its inside hatched in blue on "area", and 'area' written under it;
  // on "side a" each side gets a dimension line and its letter; then "= a × a".
  const fill = hatch(LB, rect(960, 190, 420, 420), "b hl", { spacing: 17, angle: 60, pad: 12 });
  draw(fill, said("s05", "area") - 0.06, { duration: 0.5, gap: 0.004, kind: "hatch" });
  const area = text(LB, 1170, 790, '<span class="p1">area</span> <span class="p2">= a × a</span>', 104);
  write(area.querySelector(".p1"), said("s05", "area") + 0.1, { duration: 0.34 });
  const ab = box(area.querySelector(".p1"), B);
  const und = rough(line(LB, `M${r1(ab.x0)} ${r1(ab.y1 + 4)} C ${r1(ab.x0 + 60)} ${r1(ab.y1 + 10)}, ${r1(ab.x1 - 60)} ${r1(ab.y1 - 1)}, ${r1(ab.x1 + 6)} ${r1(ab.y1 + 6)}`, "b"), 0.5);
  draw(und, saidEnd("s05", "area") + 0.1, { duration: 0.16, note: "the underline under area" });
  const dimTop = rough(line(LB, "M960 150 L1380 150 M960 136 L960 164 M1380 136 L1380 164", "thin"), 0.4);
  const dimLeft = rough(line(LB, "M920 190 L920 610 M906 190 L934 190 M906 610 L934 610", "thin"), 0.4);
  const ts = said("s05", "side");
  let t = draw(dimTop, ts - 0.52, { duration: 0.18, gap: 0.02 });
  t = write(text(LB, 1170, 128, "a", 60), t, { duration: 0.08 });
  t = draw(dimLeft, t + 0.02, { duration: 0.18, gap: 0.02 });
  t = write(text(LB, 884, 420, "a", 60), t, { duration: 0.08 });
  write(area.querySelector(".p2"), t + 0.03, { duration: 0.38 });
}

// ═══ Section C: three, four, five, counted (s06 to s10) ════════════════════════════════════════════════════════
const C = section("C");
const LC = layer(C);
const FC = figurePts(640, 600, 70);
// s06: close on the triangle at twice the size; s07: the square on 3 large, then out to take in its sum; s08: down
// to the square on 4; s09: out to the whole counted figure; s10: a drift toward the two other triangles.
glide(at("C", 770, 490, 2), 12.7, 0.62, { dip: 0.88 });
camTo(at("C", 778, 492, 2.04), 13.32, s.s07.start - 0.12 - 13.32, "none");
camTo(at("C", 690, 470, 1.5), s.s07.start - 0.12, 0.6);
camTo(at("C", 694, 472, 1.53), s.s07.start + 0.48, said("s07", "little") - 0.1 - (s.s07.start + 0.48), "none");
camTo(at("C", 850, 556, 1.2), said("s07", "little") - 0.1, 0.85, "power2.inOut");
camTo(at("C", 858, 560, 1.21), said("s07", "little") + 0.75, s.s09.start - (said("s07", "little") + 0.75), "none");
camTo(at("C", 1000, 495, 1.05), s.s09.start + 0.05, 0.9);
camTo(at("C", 1015, 505, 1.07), s.s09.start + 0.95, s.s10.start - (s.s09.start + 0.95), "none");
camTo(at("C", 1070, 520, 1.08), s.s10.start, 1.15);
{
  const { A: pa, B: pb, C: pc, A2, B2, cx, cy, u } = FC;
  // s06: the three sides in turn, each number as it is said, inside the triangle and clear of its lines.
  const legA = rough(line(LC, `M${cx} ${cy} L${pa[0]} ${pa[1]}`), 1);
  const legB = rough(line(LC, `M${cx} ${cy} L${pb[0]} ${pb[1]}`), 1);
  const hyp = rough(line(LC, `M${pa[0]} ${pa[1]} L${pb[0]} ${pb[1]}`), 1);
  const mark = rough(rightMark(LC, pc, [0, -1], [1, 0]), 0.4);
  // (the glide lands on the first stroke: 3, 4 and 5 follow each other a beat behind the voice)
  let t6 = draw(legA, 13.26, { duration: 0.18 });
  t6 = write(text(LC, 658, 530, "3", 50), t6, { duration: 0.1 });
  t6 = draw(legB, t6 + 0.02, { duration: 0.2 });
  t6 = write(text(LC, 838, 592, "4", 50), t6, { duration: 0.1 });
  t6 = draw(mark, t6, { duration: 0.06 });
  t6 = draw(hyp, Math.max(t6 + 0.02, said("s06", "five") - 0.04), { duration: 0.26 });
  write(text(LC, 750, 540, "5", 50), t6, { duration: 0.1 });

  // A count: one chalk tick a cell, in the cell's corner and clear of its number, about ten a second.
  const count = (ticks, t, d, cls) => {
    ticks.forEach(([x, y], i) => {
      const dt = line(LC, `M${r1(x - 4)} ${r1(y + 3)} L${r1(x + 5)} ${r1(y - 4)}`, `thin ${cls}`);
      const ti = t + (d * i) / ticks.length;
      inkOn(dt, ti, { duration: 0.04, min: 0.034, ease: "none" });
      log("tick", ti, ti + 0.03);
    });
    return t + d;
  };
  const inGap = ([x, y], holes) => holes.some((h) => x > h.x0 - 4 && x < h.x1 + 4 && y > h.y0 - 4 && y < h.y1 + 4);
  // the tick of a cell in its corner along e1, e2 (the grid's own axes), the first corner that is clear of a label
  const tickOf = (c0, e1, e2, k, holes) => {
    for (const [s1, s2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const p = [c0[0] + (s1 * e1[0] + s2 * e2[0]) * k, c0[1] + (s1 * e1[1] + s2 * e2[1]) * k];
      if (!inGap(p, holes)) return p;
    }
    return c0;
  };
  const grid = (o, e1, e2, n, cls, holes) => {
    const list = [];
    for (let k = 1; k < n; k++) {
      list.push([[o[0] + e1[0] * k * u, o[1] + e1[1] * k * u], [o[0] + e1[0] * k * u + e2[0] * n * u, o[1] + e1[1] * k * u + e2[1] * n * u]]);
      list.push([[o[0] + e2[0] * k * u, o[1] + e2[1] * k * u], [o[0] + e2[0] * k * u + e1[0] * n * u, o[1] + e2[1] * k * u + e1[1] * n * u]]);
    }
    return rough(line(LC, segs(list, holes), `${cls} thin`), 0.6);
  };
  const ticksOf = (o, e1, e2, n, k, holes) => {
    const out = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) out.push(tickOf([o[0] + (e1[0] * (i + 0.5) + e2[0] * (j + 0.5)) * u, o[1] + (e1[1] * (i + 0.5) + e2[1] * (j + 0.5)) * u], e1, e2, k, holes));
    return out;
  };
  // s07: the square on 3, its grid, counted (nine ticks in about a second): 9; then 3 × 3 = 9 at the right.
  const n9 = text(LC, cx - 1.5 * u, cy - 1.5 * u + 22, "9", 60, "b");
  const h9 = [gap(n9, C, 4)];
  const sqA = rough(line(LC, P([pa, [cx - 3 * u, cy - 3 * u], [cx - 3 * u, cy], pc], false), "b"), 1);
  let t = draw(sqA, said("s07", "square") - 0.1, { duration: 0.34 });
  t = draw(grid([cx - 3 * u, cy - 3 * u], [1, 0], [0, 1], 3, "b", h9), t + 0.02, { duration: 0.2, gap: 0.01 });
  t = count(ticksOf([cx - 3 * u, cy - 3 * u], [1, 0], [0, 1], 3, 0.36 * u, h9), t + 0.02, 0.9, "b");
  write(n9, t + 0.01, { duration: 0.16 });
  write(text(LC, 1300, 230, '<span class="b">3 × 3 = 9</span>', 72), said("s07", "little") + 0.1, { duration: 0.6 });
  // s08: the square on 4, its grid, counted (sixteen in about a second): 16; then 4 × 4 = 16.
  const n16 = text(LC, cx + 2 * u, cy + 2 * u + 24, "16", 64, "b");
  const h16 = [gap(n16, C, 10)];
  const sqB = rough(line(LC, P([pc, [cx, cy + 4 * u], [cx + 4 * u, cy + 4 * u], pb], false), "b"), 1);
  t = draw(sqB, s.s08.start - 0.05, { duration: 0.32 });
  t = draw(grid([cx, cy], [1, 0], [0, 1], 4, "b", h16), t + 0.02, { duration: 0.2, gap: 0.01 });
  t = count(ticksOf([cx, cy], [1, 0], [0, 1], 4, 0.36 * u, h16), t + 0.02, 1.0, "b");
  write(n16, t + 0.01, { duration: 0.18 });
  write(text(LC, 1300, 340, '<span class="b">4 × 4 = 16</span>', 72), t + 0.2, { duration: 0.45 });
  // s09: 9 + 16 = 25 (the 9 and the 16 blue, as they were counted), then the square on 5, its tilted grid, counted
  // (25 ticks, a quick roll): 25, and = 5 × 5.
  const sum = text(LC, 1300, 470, '<span class="p1"><span class="b">9</span> + <span class="b">16</span> =</span> <span class="p2 y">25</span>', 84);
  write(sum.querySelector(".p1"), said("s09", "together") + 0.2, { duration: 0.4 });
  write(sum.querySelector(".p2"), said("s09", "twenty-five") + 0.02, { duration: 0.28 });
  const b25 = box(sum.querySelector(".p2"), C);
  const u25 = rough(line(LC, `M${r1(b25.x0 - 6)} ${r1(b25.y1 + 4)} C ${r1(b25.x0 + 20)} ${r1(b25.y1 + 10)}, ${r1(b25.x1 - 20)} ${r1(b25.y1 - 1)}, ${r1(b25.x1 + 8)} ${r1(b25.y1 + 6)}`, "y"), 0.5);
  draw(u25, said("s09", "twenty-five") + 0.42, { duration: 0.16, note: "underline 25" });
  const e1 = [0.8, 0.6], e2 = [0.6, -0.8]; // along the hypotenuse, and out of it
  const c25 = [(pa[0] + B2[0]) / 2, (pa[1] + B2[1]) / 2];
  const n25 = text(LC, c25[0], c25[1] + 22, "25", 60, "y");
  const h25 = [gap(n25, C, 7)];
  const sqC = rough(line(LC, P([pa, A2, B2, pb], false), "y"), 1);
  t = draw(sqC, said("s09", "square") - 0.1, { duration: 0.38 });
  t = draw(grid(pa, e1, e2, 5, "y", h25), t + 0.02, { duration: 0.26, gap: 0.008 });
  write(n25, t + 0.04, { duration: 0.2 });
  t += 0.3;
  t = write(text(LC, 1300, 570, '<span class="y">= 5 × 5</span>', 72), t + 0.24, { duration: 0.42 });
  // s10: but that is one triangle: a flat one and a tall one, each with its right angle, each a question.
  const flat = [[1180, 840], [1180, 790], [1450, 840]], tall = [[1600, 840], [1600, 660], [1690, 840]];
  const fl = rough(line(LC, P(flat), "thin"), 0.8), flm = rough(rightMark(LC, flat[0], [0, -1], [1, 0], 16, "fine"), 0.3);
  const tlp = rough(line(LC, P(tall), "thin"), 0.8), tlm = rough(rightMark(LC, tall[0], [0, -1], [1, 0], 16, "fine"), 0.3);
  t = draw([fl, flm], Math.max(t + 0.02, said("s10", "that's") + 0.1), { duration: 0.26 });
  write(text(LC, 1500, 834, "?", 80), t + 0.02, { duration: 0.12 });
  t = draw([tlp, tlm], said("s10", "triangle") - 0.02, { duration: 0.24 });
  write(text(LC, 1740, 770, "?", 80), t + 0.02, { duration: 0.12 });
}

// ═══ Section D: the proof (s11 to s17) ═══════════════════════════════════════════════════════════════════════
const Dd = section("D");
const PA = 240, PB = 320, PS = PA + PB, LX = 200, RX = 1160, PY = 130;
// The four triangles round the tilted square, each the same triangle a quarter turn from the last.
const corners = (x0, y0) => ({
  1: [[x0, y0], [x0 + PB, y0], [x0, y0 + PA]],
  2: [[x0 + PS, y0], [x0 + PB, y0], [x0 + PS, y0 + PB]],
  3: [[x0 + PS, y0 + PS], [x0 + PS, y0 + PB], [x0 + PA, y0 + PS]],
  4: [[x0, y0 + PS], [x0 + PA, y0 + PS], [x0, y0 + PA]],
});
const MOVE = { 3: [-PA, -PB], 2: [-PB, PA] }; // f4: 3 slides by (-a, -b), 2 by (-b, +a); neither turns
const tilt = (x0, y0) => [[x0 + PB, y0], [x0 + PS, y0 + PB], [x0 + PA, y0 + PS], [x0, y0 + PA]];
const LD = layer(Dd);
const XT = layer(Dd); // the reference triangle, its letters and '× 4' (wiped in s13)
const BR = layer(Dd); // the bracket 'a + b' (wiped in s13)
const NOTE = layer(Dd); // the angle note (wiped in s16)
const RS = layer(Dd); // the second square: its outline, letters and the four copies
const GH = layer(Dd); // the dotted outlines and the arrows of the moves (wiped in s15)
const TOP = layer(Dd);
const SN = layer(Dd); // 'slid, not turned' (wiped in s16) // drawn over the second square's triangles: the two gaps, their names, the run round its edge
// A triangle of the proof: its light hatching (lifting round its number and the tick it will get), its outline and
// its number, as one group and one piece of lettering, so it can be carried whole.
function triangle(L, pts, n, holes = []) {
  const c = centroid(pts), v = pts[0];
  const p = [v[0] + (c[0] - v[0]) * 0.9, v[1] + (c[1] - v[1]) * 0.9];
  const num = text(L, p[0], p[1] + 18, String(n), 52);
  const grp = g(L, "tri");
  const hl = hatch(grp, pts, "hl", { spacing: 21, angle: 120, pad: 9, holes: [gap(num, L.sec, 5, { r: 40 }), ...holes] });
  const o = rough(line(grp, sides(pts)), 1);
  return { grp, hl, o, num, tick: [p[0] + 28, p[1] + 4], pts };
}
// s11: the triangle, its letters and '× 4'; then four copies of it at the corners, each taken from it in turn (the
// chalk runs round the triangle, then draws its copy), numbered.
const xt = [[1000, 500], [1000, 500 - PA], [1000 + PB, 500]];
{
  const xo = rough(line(XT, sides([xt[1], xt[0], xt[2]], false) + ` M${xt[1][0]} ${xt[1][1]} L${xt[2][0]} ${xt[2][1]}`), 1);
  const xm = rough(rightMark(XT, xt[0], [0, -1], [1, 0]), 0.4);
  const la = text(XT, 966, 400, "a", 48), lb = text(XT, 1160, 552, "b", 48), lc = text(XT, 1190, 378, "c", 48);
  const xh = hatch(XT, xt, "hl", { spacing: 21, angle: 120, pad: 9 });
  let t = draw([xo, xm], said("s11", "every") - 0.08, { duration: 0.42 });
  draw(xh, t, { duration: 0.18, gap: 0.005, kind: "hatch" });
  write(la, t + 0.02, { duration: 0.08 });
  write(lb, t + 0.12, { duration: 0.08 });
  write(lc, t + 0.22, { duration: 0.08 });
  write(text(XT, 1430, 420, "× 4", 80), said("s11", "four") + 0.02, { duration: 0.26 });
}
glide(at("D", 800, 445, 1.18), s.s11.start - 0.32, 0.92);
camTo(at("D", 790, 448, 1.22), s.s11.start + 0.6, said("s13", "side") + 0.1 - (s.s11.start + 0.6), "none");
const left = corners(LX, PY), right = corners(RX, PY);
const V = [LX + PS, PY + PB], T2 = [LX + PB, PY]; // the tilted square's right corner (760, 450); triangle 2's other acute angle
const up = [0, -1], dn = [0, 1], toTop = unit(V, [LX + PB, PY]), toBot = unit(V, [LX + PA, PY + PS]), toV = unit(T2, V);
const labAt = (v, u1, u2, r) => { const p = along(v, bis(u1, u2), r); return [p[0], p[1] + 18]; };
const lx = text(LD, ...labAt(V, up, toTop, 100), "x", 50), ly = text(LD, ...labAt(V, dn, toBot, 100), "y", 50), ly2 = text(LD, ...labAt(T2, [1, 0], toV, 84), "y", 50);
const angleGaps = { 2: [lx, ly2], 3: [ly] };
const tris = {};
for (const n of [1, 2, 3, 4]) tris[n] = triangle(LD, left[n], n, (angleGaps[n] ?? []).map((el) => gap(el, Dd, 5)));
const xtPath = P([xt[1], xt[0], xt[2]]);
{
  let t = said("s11", "four") + 0.26;
  for (const n of [1, 2, 3, 4]) {
    retrace(XT, xtPath, t, 0.2, "", "the triangle, copied");
    t = draw(tris[n].o, t, { duration: 0.18, gap: 0.012 });
    draw(tris[n].hl, t - 0.02, { duration: 0.08, gap: 0.002, kind: "hatch" });
    write(tris[n].num, t, { duration: 0.06 });
    t += 0.06;
  }
}
// s12: the outer square round them, in one stroke; the points where b meets a marked on two sides and the sides
// lettered as they are named; the bracket a + b.
const outerL = rough(line(LD, P(rect(LX, PY, PS, PS)), "fat"), 1.2);
draw(outerL, said("s12", "inside") + 0.02, { duration: 0.6 });
{
  const marks = rough(line(LD, `M${LX + PB} ${PY - 14} L${LX + PB} ${PY + 14} M${LX - 14} ${PY + PA} L${LX + 14} ${PY + PA}`, "thin"), 0.3);
  const tl0 = said("s12", "sides");
  draw(marks, tl0 - 0.16, { duration: 0.12, gap: 0.03 });
  write(text(LD, LX + PB / 2, PY - 22, "b", 52), tl0 - 0.02, { duration: 0.08 });
  write(text(LD, LX + PB + PA / 2, PY - 22, "a", 52), tl0 + 0.12, { duration: 0.08 });
  write(text(LD, LX - 40, PY + PA / 2 + 18, "a", 52), tl0 + 0.26, { duration: 0.08 });
  write(text(LD, LX - 40, PY + PA + PB / 2 + 18, "b", 52), tl0 + 0.4, { duration: 0.08 });
  const br = rough(line(BR, `M${LX} ${PY + PS + 22} V${PY + PS + 40} H${LX + PS} V${PY + PS + 22}`, "thin"), 0.7);
  const t = draw(br, said("s12", "plus") - 0.1, { duration: 0.3 });
  write(text(BR, LX + PS / 2, PY + PS + 88, "a + b", 52), t, { duration: 0.34 });
}
// s13: the space left in the middle is the tilted square on c: outlined, hatched in yellow (round the letters it
// will get), each side lettered c, then c². It is a true square (f5): at its right corner V the angles x and y of
// the two triangles and the corner itself make a straight line (marked 180°); x and y are the two acute angles of
// one right triangle (triangle 2 shows both, round its right angle), so x + y = 90° and the corner is 90° too.
const TQ = tilt(LX, PY);
{
  wipe(XT, Dd, [930, 230, 1500, 570], said("s13", "that") + 0.02, 0.26, "the '× 4' wiped");
  const yo = rough(line(LD, P(TQ), "y"), 1);
  let t = draw(yo, said("s13", "tilted") - 0.16, { duration: 0.36 });
  const ctr = [LX + PS / 2, PY + PS / 2];
  const c2 = text(LD, ctr[0], ctr[1] + 30, "c²", 88, "y");
  const cs = TQ.map((p, i) => {
    const q = TQ[(i + 1) % 4], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], inw = unit(m, ctr);
    return text(LD, m[0] + inw[0] * 44, m[1] + inw[1] * 44 + 20, "c", 64, "y");
  });
  const yh = hatch(LD, TQ, "y hd", { spacing: 15, angle: 80, pad: 9, holes: [c2, ...cs].map((el) => gap(el, Dd, 6)) });
  // its name and its four sides' letters first, then the hatching round them, so no gap stands empty
  t = write(c2, t + 0.02, { duration: 0.22 });
  cs.forEach((el) => { t = write(el, t + 0.02, { duration: 0.07 }); });
  t = draw(yh, t + 0.02, { duration: 0.6, gap: 0.003, min: 0.012, kind: "hatch" });
  camTo(at("D", 650, 500, 1.1), said("s13", "side") + 0.1, 0.9);
  // the angles at V: x above, y below; and in triangle 2 its other acute angle (y) and its right angle
  const ax = arc(LD, V, up, toTop, 42), ay = arc(LD, V, dn, toBot, 42);
  const ay2 = arc(LD, T2, [1, 0], toV, 46), rm2 = rightMark(LD, [LX + PS, PY], [-1, 0], [0, 1], 24);
  rough([ax, ay, ay2, rm2], 0.3);
  // the bracket goes before the note takes its place (the cloth while the chalk marks the angles)
  wipe(BR, Dd, [LX - 10, PY + PS + 14, LX + PS + 10, PY + PS + 100], t - 0.02, 0.22, "the bracket wiped");
  t = draw([ax, ay], t + 0.02, { duration: 0.16, gap: 0.02 });
  t = write(lx, t, { duration: 0.06 });
  t = write(ly, t + 0.01, { duration: 0.06 });
  t = draw([ay2, rm2], t + 0.02, { duration: 0.14, gap: 0.02 });
  t = write(ly2, t, { duration: 0.06 });
  // the note: x + y = 90°, under the square, large (in the pause after the line)
  t = write(text(NOTE, 480, 782, "x + y = 90°", 72), t + 0.06, { duration: 0.32 });
  // the straight line at V: a half circle, 180°
  const half = rough(line(NOTE, `M${V[0]} ${V[1] - 64} A64 64 0 0 0 ${V[0]} ${V[1] + 64}`, "thin"), 0.3);
  t = draw(half, t + 0.03, { duration: 0.16 });
  t = write(text(NOTE, V[0] + 78, V[1] - 40, "180°", 50), t, { duration: 0.12 });
  // the corner: 90° too
  const rmV = rough(rightMark(LD, V, toTop, toBot, 28, ""), 0.3);
  t = draw(rmV, t + 0.03, { duration: 0.07 });
  t = write(text(NOTE, 480, 866, "so this corner is 90° too", 62, "hand"), t + 0.03, { duration: 0.36 });
  const na = rough(arrow(NOTE, 812, 838, V[0] + 22, V[1] + 34, "thin", 0.18), 0.3);
  draw(na, t + 0.02, { duration: 0.12 });
}
// s14: a second square of the same size, drawn in one stroke and lettered; the same four triangles copied into the
// same corners, one by one (the chalk runs round each in the first square, then draws its copy); then two of them
// slide, 3 first, then 2, without turning, each leaving a dotted outline where it was.
camTo(at("D", 655, 506, 1.12), said("s13", "side") + 1.0, s.s14.start + 0.05 - (said("s13", "side") + 1.0), "none");
camTo(at("D", 975, 470, 1.0), s.s14.start + 0.05, 0.75);
const copy = {};
for (const n of [1, 2, 3, 4]) copy[n] = triangle(RS, right[n], n);
const slid = { 2: { x: 0, y: 0 }, 3: { x: 0, y: 0 } };
film.each(() => {
  for (const n of [2, 3]) {
    copy[n].grp.setAttribute("transform", `translate(${r1(slid[n].x)} ${r1(slid[n].y)})`);
    copy[n].num.style.transform = `translate(${r1(slid[n].x)}px, ${r1(slid[n].y)}px) translate(-50%, -0.8em)`;
  }
});
{
  const outerR = rough(line(RS, P(rect(RX, PY, PS, PS)), "fat"), 1.2);
  let t = draw(outerR, said("s14", "now") + 0.12, { duration: 0.34 });
  const marks = rough(line(RS, `M${RX + PB} ${PY - 14} L${RX + PB} ${PY + 14} M${RX - 14} ${PY + PA} L${RX + 14} ${PY + PA}`, "thin"), 0.3);
  draw(marks, t, { duration: 0.08, gap: 0.02 });
  [["b", RX + PB / 2, PY - 22], ["a", RX + PB + PA / 2, PY - 22], ["a", RX - 40, PY + PA / 2 + 18], ["b", RX - 40, PY + PA + PB / 2 + 18]].forEach(([l, x, y], i) => write(text(RS, x, y, l, 52), t + 0.02 + i * 0.05, { duration: 0.05 }));
  t += 0.2;
  for (const n of [1, 2, 3, 4]) {
    retrace(LD, P(left[n]), t, 0.17, "", "the triangle, copied");
    t = draw(copy[n].o, t, { duration: 0.15, gap: 0.01 });
    draw(copy[n].hl, t - 0.02, { duration: 0.06, gap: 0.002, kind: "hatch" });
    write(copy[n].num, t, { duration: 0.05 });
    t += 0.03;
  }
  const ghostOf = (pts) => {
    const list = [];
    for (let i = 0; i < 3; i++) {
      const a = pts[i], b = pts[(i + 1) % 3], L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.floor(L / 26);
      for (let j = 0; j < k; j++) {
        const f0 = (j + 0.2) / k, f1 = (j + 0.7) / k;
        list.push([[a[0] + (b[0] - a[0]) * f0, a[1] + (b[1] - a[1]) * f0], [a[0] + (b[0] - a[0]) * f1, a[1] + (b[1] - a[1]) * f1]]);
      }
    }
    return line(GH, segs(list, []), "thin");
  };
  const moveOne = (n, t0, d) => {
    const pts = right[n], [dx, dy] = MOVE[n];
    const c0 = centroid(pts), c1 = [c0[0] + dx, c0[1] + dy];
    const ar = rough(arrow(GH, c0[0] + dx * 0.14, c0[1] + dy * 0.14, c1[0] - dx * 0.12, c1[1] - dy * 0.12, "thin"), 0.4);
    draw(ar, t0 - 0.14, { duration: 0.14 });
    tl.fromTo(slid[n], { x: 0, y: 0 }, { x: dx, y: dy, duration: d, ease: "power2.inOut", immediateRender: false }, t0);
    log("move", t0, t0 + d, `triangle ${n} slides`);
    draw(ghostOf(pts), t0 + 0.04, { duration: 0.26, gap: 0.002, min: 0.005, cap: 1e9, note: "dotted where it was" });
    return t0 + d;
  };
  t = moveOne(3, Math.max(t + 0.16, said("s14", "them") - 0.04), 0.52);
  t = moveOne(2, t + 0.14, 0.52);
  t = write(text(SN, RX + PS / 2, PY - 78, "slid, not turned", 50, "hand"), t + 0.02, { duration: 0.44 });
  wipe(GH, Dd, [RX - 10, PY - 10, RX + PS + 10, PY + PS + 10], Math.max(t + 0.04, said("s15", "becomes") + 0.05), 0.3, "the dotted outlines and the arrows wiped");
}
// s15: the gap is now two squares, a × a and b × b, outlined in blue, named as they are said and hatched round their
// names; the right side of the square lettered a and b beside them. The camera leans toward them.
camTo(at("D", 1000, 455, 1.035), s.s15.start + 0.1, s.s16.start - 0.2 - (s.s15.start + 0.1), "sine.inOut");
{
  const qa = rect(RX + PB, PY, PA, PA), qb = rect(RX + PA, PY + PA, PB, PB);
  const oa = rough(line(TOP, sides(qa), "b"), 0.9), ob = rough(line(TOP, sides(qb), "b"), 0.9);
  draw([oa, ob], said("s15", "two") - 0.04, { duration: 0.7, gap: 0.02 });
  const na = text(TOP, qa[0][0] + PA / 2, PY + PA / 2 + 28, "a²", 80, "b"), nb = text(TOP, qb[0][0] + PB / 2, qb[0][1] + PB / 2 + 30, "b²", 92, "b");
  const ha = hatch(TOP, qa, "b hd", { spacing: 15, angle: 60, pad: 9, holes: [gap(na, Dd, 6)] });
  const hb = hatch(TOP, qb, "b hd", { spacing: 15, angle: 60, pad: 9, holes: [gap(nb, Dd, 6)] });
  let t = write(na, said("s15", "a") - 0.02, { duration: 0.18 });
  t = draw(ha, t + 0.01, { duration: 0.4, gap: 0.004, kind: "hatch" });
  write(text(TOP, RX + PS + 36, PY + PA / 2 + 18, "a", 52), t, { duration: 0.08 });
  t = write(nb, said("s15", "b") - 0.02, { duration: 0.18 });
  t = draw(hb, t + 0.01, { duration: 0.46, gap: 0.004, kind: "hatch" });
  write(text(TOP, RX + PS + 36, PY + PA + PB / 2 + 18, "b", 52), t, { duration: 0.08 });
}
// s16: the note is wiped; same square (the chalk runs round both), same triangles (ticked in pairs, in white), so
// the gaps must match: 'big square − 4 triangles' under each, then '='.
camTo(at("D", 960, 480, 1.0), s.s16.start - 0.15, 0.85);
{
  wipe(NOTE, Dd, [150, 700, 950, 900], s.s16.start - 0.06, 0.3, "the angle note wiped");
  wipe(SN, Dd, [1180, 10, 1700, 70], s.s16.start + 0.2, 0.2, "the cloth goes on over 'slid, not turned'");
  const t0 = said("s16", "square") - 0.1;
  retrace(LD, P(rect(LX, PY, PS, PS)), t0, 0.4);
  retrace(TOP, P(rect(RX, PY, PS, PS)), t0 + 0.4, 0.4);
  const t1 = said("s16", "triangles") - 0.18;
  [1, 2, 3, 4].forEach((n, i) => {
    const p0 = tris[n].tick, p1 = [copy[n].tick[0] + (MOVE[n]?.[0] ?? 0), copy[n].tick[1] + (MOVE[n]?.[1] ?? 0)];
    draw(rough(tickMark(LD, ...p0), 0.3), t1 + i * 0.15, { duration: 0.05, kind: "tick" });
    draw(rough(tickMark(TOP, ...p1), 0.3), t1 + i * 0.15 + 0.07, { duration: 0.05, kind: "tick" });
  });
  const tb = said("s16", "gaps") - 0.1;
  write(text(LD, LX + PS / 2, 758, "big square − 4 triangles", 46, "hand"), tb, { duration: 0.42 });
  write(text(TOP, RX + PS / 2, 758, "big square − 4 triangles", 46, "hand"), tb + 0.44, { duration: 0.42 });
  draw(equals(LD, 960, 410, 100), said("s16", "match") + 0.02, { duration: 0.22, gap: 0.05, note: "the firm double stroke of =" });
}
camTo(at("D", 960, 486, 1.02), s.s16.start + 0.7, s.s17.start - (s.s16.start + 0.7), "none");
// s17: c² = a² + b², written term by term with the voice, each arrow as its term is written; then it holds.
camTo(at("D", 960, 540, 1.03), s.s17.start, 2.4);
camTo(at("D", 960, 540, 1.045), s.s17.start + 2.4, s.s18.start - 0.3 - (s.s17.start + 2.4), "none");
{
  const f = text(LD, 960, 896, '<span class="k1 y">c²</span> <span class="k2">=</span> <span class="k3 b">a²</span> <span class="k4">+</span> <span class="k5 b">b²</span>', 112);
  write(f.querySelector(".k1"), said("s17", "c") - 0.02, { duration: 0.26 });
  write(f.querySelector(".k2"), said("s17", "equals") + 0.02, { duration: 0.12 });
  write(f.querySelector(".k3"), said("s17", "a") - 0.02, { duration: 0.26 });
  write(f.querySelector(".k4"), said("s17", "plus") + 0.02, { duration: 0.1 });
  const t = write(f.querySelector(".k5"), said("s17", "b") - 0.02, { duration: 0.2 });
  const k1 = box(f.querySelector(".k1"), Dd), k5 = box(f.querySelector(".k5"), Dd);
  const a1 = rough(arrow(LD, LX + PS / 2 + 150, 786, k1.x0 - 16, k1.y0 + 40, "thin y", -0.16), 0.4);
  const a2 = rough(arrow(LD, RX + PS / 2 - 150, 786, k5.x1 + 16, k5.y0 + 40, "thin b", 0.16), 0.4);
  draw(a1, saidEnd("s17", "squared") + 0.02, { duration: 0.24 });
  draw(a2, t + 0.02, { duration: 0.24 });
  tap(Dd, (k1.x1 + k5.x0) / 2, k5.y1 + 12, t + 0.3, "the double tap: done");
  tap(Dd, (k1.x1 + k5.x0) / 2 + 30, k5.y1 + 14, t + 0.45, "the double tap: done");
}

// ═══ Section E: every right triangle (s18), then wiped for the recap (s19) ═══════════════════════════════════════
const E = section("E");
const LE = layer(E);
glide(at("E", 960, 525, 1.02), s.s18.start - 0.3, 0.92);
camTo(at("E", 960, 515, 1.05), s.s18.start + 0.62, s.s19.start - (s.s18.start + 0.62), "none");
// Both arrangements for a right triangle with legs a and b (a up the first corner), in a square of side a + b.
function miniPair(L, x0, y0, a, b, gap0, t0, d) {
  const S2 = a + b;
  const ct = (x, y) => [[[x, y], [x + b, y], [x, y + a]], [[x + S2, y], [x + b, y], [x + S2, y + b]], [[x + S2, y + S2], [x + S2, y + b], [x + a, y + S2]], [[x, y + S2], [x + a, y + S2], [x, y + a]]];
  const x1 = x0 + S2 + gap0;
  const tr = ct(x1, y0);
  tr[2] = tr[2].map(([x, y]) => [x - a, y - b]);
  tr[1] = tr[1].map(([x, y]) => [x - b, y + a]);
  const lo = rough(line(L, [P(rect(x0, y0, S2, S2)), ...ct(x0, y0).map((p) => P(p))].join(" "), "thin"), 0.8);
  const tq = [[x0 + b, y0], [x0 + S2, y0 + b], [x0 + a, y0 + S2], [x0, y0 + a]];
  const ly = rough(line(L, P(tq), "y thin"), 0.6);
  const lh = hatch(L, tq, "y hd", { spacing: 13, angle: 80, pad: 6 });
  const ro = rough(line(L, [P(rect(x1, y0, S2, S2)), ...tr.map((p) => P(p))].join(" "), "thin"), 0.8);
  const qa = rect(x1 + b, y0, a, a), qb = rect(x1 + a, y0 + a, b, b);
  const rb = rough(line(L, [P(qa), P(qb)].join(" "), "b thin"), 0.6);
  const rh = [hatch(L, qa, "b hd", { spacing: 13, angle: 60, pad: 6 }), hatch(L, qb, "b hd", { spacing: 13, angle: 60, pad: 6 })].flat();
  const quick = { min: 0.034, cap: 20000, gap: 0.004 };
  let t = draw(lo, t0, { duration: d * 0.3, ...quick });
  t = draw(ly, t, { duration: d * 0.08, ...quick });
  draw(lh, t, { duration: d * 0.14, gap: 0.002, min: 0.01, kind: "hatch" });
  t = draw(ro, t + d * 0.12, { duration: d * 0.3, ...quick });
  t = draw(rb, t, { duration: d * 0.08, ...quick });
  draw(rh, t, { duration: d * 0.14, gap: 0.002, min: 0.01, kind: "hatch" });
  return t + d * 0.14;
}
const FLAT = [64, 296], TALL = [250, 110];
const law = '<span class="y">c²</span> = <span class="b">a²</span> + <span class="b">b²</span>';
{
  // the two triangles first, as they are named, each with its right angle; then each one's pair.
  const ft = [[330, 720], [330, 720 - FLAT[0]], [330 + FLAT[1], 720]];
  const tt = [[1350, 790], [1350, 790 - TALL[0]], [1350 + TALL[1], 790]];
  const fo = rough(line(LE, P(ft), "thin"), 0.8), fm = rough(rightMark(LE, ft[0], [0, -1], [1, 0], 16, "fine"), 0.3);
  const to = rough(line(LE, P(tt), "thin"), 0.8), tm = rough(rightMark(LE, tt[0], [0, -1], [1, 0], 16, "fine"), 0.3);
  let t = draw([fo, fm], s.s18.start + 0.2, { duration: 0.22 });
  t = write(text(LE, 480, 806, "flat", 52, "hand"), t, { duration: 0.18 });
  t = draw([to, tm], Math.max(t + 0.02, said("s18", "tall")), { duration: 0.24 });
  write(text(LE, 1536, 812, "tall", 52, "hand"), t, { duration: 0.18 });
  t = miniPair(LE, 110, 150, ...FLAT, 40, t + 0.04, 0.5);
  t = miniPair(LE, 1010, 150, ...TALL, 40, t + 0.02, 0.5);
  const rf = rough(ring(LE, 342, 708, 30), 0.4), rt = rough(ring(LE, 1362, 778, 30), 0.4);
  draw([rf, rt], said("s18", "right") - 0.04, { duration: 0.34, gap: 0.04, note: "the right angles ringed" });
  const ok = said("s18", "works");
  write(text(LE, 460, 890, law, 58), ok - 0.06, { duration: 0.3 });
  write(text(LE, 1450, 890, law, 58), ok + 0.06, { duration: 0.3 });
  draw(rough(tickMark(LE, 650, 862, ""), 0.3), ok + 0.26, { duration: 0.08, kind: "tick" });
  draw(rough(tickMark(LE, 1640, 862, ""), 0.3), ok + 0.38, { duration: 0.08, kind: "tick" });
}
// s19: the board wiped with the cloth; the answer on one board: a² is a square's area; the same square and the same
// four triangles leave a gap that changes shape, never its area; c² = a² + b², for right triangles only.
const LR = layer(E);
camTo(at("E", 965, 520, 1.02), s.s19.start, s.s20.start - 0.05 - s.s19.start, "none");
{
  let t = wipe(LE, E, [60, 100, 1880, 930], s.s19.start + 0.01, 0.36, "the board wiped for the recap");
  const sq = rough(line(LR, sides(rect(130, 160, 360, 360)), "b fat"), 1.1);
  t = draw(sq, t - 0.06, { duration: 0.26, gap: 0.02 });
  write(text(LR, 310, 140, "a", 52), t - 0.06, { duration: 0.06 });
  write(text(LR, 98, 358, "a", 52), t + 0.02, { duration: 0.06 });
  write(text(LR, 310, 382, "a²", 120, "b"), t + 0.08, { duration: 0.2 });
  const ta = write(text(LR, 310, 612, '<span class="b">a²</span> = area', 58), t + 0.28, { duration: 0.22 });
  t = miniPair(LR, 590, 160, 154, 206, 110, Math.max(ta + 0.02, said("s19", "changes") - 0.06), 0.5);
  t = draw(equals(LR, 1005, 340, 64), t + 0.02, { duration: 0.12, gap: 0.03, note: "=" });
  t = write(text(LR, 1005, 612, "same area", 58, "hand"), t + 0.02, { duration: 0.26 });
  const bx = rough(line(LR, P(rect(560, 690, 890, 190))), 1);
  t = draw(bx, t + 0.02, { duration: 0.34 });
  t = write(text(LR, 1005, 826, law, 112), t, { duration: 0.34 });
  const rt = [[1560, 420], [1560, 300], [1720, 420]];
  const ro = rough(line(LR, P(rt), "thin"), 0.6), rm = rough(rightMark(LR, rt[0], [0, -1], [1, 0], 16, "fine"), 0.3), rr = rough(ring(LR, 1572, 408, 30), 0.3);
  t = draw([ro, rm, rr], t + 0.02, { duration: 0.16, gap: 0.01, min: 0.05 });
  t = write(text(LR, 1640, 512, "right", 54, "hand"), t, { duration: 0.1 });
  write(text(LR, 1640, 572, "triangles only", 54, "hand"), t + 0.02, { duration: 0.2 });
}

// s20: that's why: the camera glides back along the whole board, pulling back as it passes the proof, the counted
// 3-4-5 and the square, and lands on frame 0's framing on the last frame.
glide(home("A"), s.s20.start - 0.05, D - (s.s20.start - 0.05), { dip: 0.5, blur: 5 });

// ── Captions: each spoken line written in chalk at the foot of the board as it is said ───────────────────────────
// The key word (*stars* in the storyboard) is underlined: in blue where it names a² or b² (or the squares on 3 and
// 4), in yellow where it names c²; a key word that names neither gets a white chalk underline (yellow means c²).
const KEY = { s02: "y", s04: "b", s05: "b", s07: "b", s08: "b", s09: "y", s13: "y", s15: "b", s17: "b", s19: "y" };
const capped = storyboard.shots.filter((sh) => sh.voice && sh.caption !== false && film.voiced[sh.id]);
capped.forEach((sh, i) => {
  const line0 = film.voiced[sh.id];
  const tokens = [];
  for (const part of sh.voice.split(/(\*[^*]+\*)/)) {
    if (!part) continue;
    const strong = part.startsWith("*");
    for (const w of (strong ? part.slice(1, -1) : part).split(/\s+/).filter(Boolean)) {
      if (/^[.,;:!?]+$/.test(w) && tokens.length) tokens.at(-1).w += w;
      else tokens.push({ w, strong });
    }
  }
  const el = Object.assign(document.createElement("div"), { className: "cap" });
  const spans = tokens.map(({ w, strong }, k) => {
    if (k) el.append(" ");
    const sp = Object.assign(document.createElement("span"), { className: `w${strong && KEY[sh.id] ? ` ${KEY[sh.id]}` : ""}`, textContent: w });
    el.append(sp);
    return sp;
  });
  $("#caps").append(el);
  if (el.offsetWidth > 1740) el.style.fontSize = `${Math.floor((54 * 1740) / el.offsetWidth)}px`;
  const words = line0.words;
  const t0 = words[0][0];
  const next = capped[i + 1] ? film.voiced[capped[i + 1].id].words[0][0] : D;
  const off = Math.min(next - 0.03, sh.end + 0.16, D - 0.1);
  tl.set(el, { visibility: "visible" }, t0 - 0.02);
  spans.forEach((sp, k) => {
    const [a, b] = words[Math.min(k, words.length - 1)];
    ink.write(sp, a, { duration: Math.max(0.1, Math.min(0.55, (b - a) * 0.92)) });
  });
  // the key words' underline, as one chalk stroke under the run of them
  const keys = spans.filter((sp, k) => tokens[k].strong);
  if (keys.length) {
    const first = keys[0], last = keys.at(-1);
    const x0 = first.offsetLeft, x1 = last.offsetLeft + last.offsetWidth, y = first.offsetTop + first.offsetHeight * 0.96;
    const sv = document.createElementNS(NS, "svg");
    Object.assign(sv.style, { position: "absolute", left: "0", top: "0", width: "1px", height: "1px", overflow: "visible" });
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", `M${x0 - 4} ${r1(y)} C ${r1(x0 + (x1 - x0) * 0.3)} ${r1(y + 6)}, ${r1(x0 + (x1 - x0) * 0.7)} ${r1(y - 3)}, ${x1 + 6} ${r1(y + 3)}`);
    Object.assign(p.style, { fill: "none", stroke: KEY[sh.id] === "b" ? "var(--blue)" : KEY[sh.id] === "y" ? "var(--yel)" : "var(--chalk)", strokeWidth: "5px", strokeLinecap: "round" });
    sv.append(p);
    el.append(sv);
    const kEnd = words[Math.min(tokens.indexOf(tokens.filter((tk) => tk.strong).at(-1)), words.length - 1)][1];
    inkOn(p, Math.min(kEnd + 0.02, off - 0.3), { duration: 0.18 });
  }
  // wiped off with a flick of the cloth as the next line starts
  const st = { p: 0 };
  tl.fromTo(st, { p: 0 }, { p: 1, duration: 0.14, ease: "power1.in", immediateRender: false }, off - 0.14);
  tl.set(el, { visibility: "hidden" }, off);
  film.each(() => {
    const m = st.p <= 0 ? "" : `linear-gradient(90deg, transparent ${(st.p * 115 - 10).toFixed(1)}%, #000 ${(st.p * 115 + 5).toFixed(1)}%)`;
    if (el.style.webkitMaskImage !== m) el.style.webkitMaskImage = el.style.maskImage = m;
  });
});

film.finish();
