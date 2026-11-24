// "Gimana tumbuhan bikin makanan dari cahaya?" in the Paper Cut-out template. Built from storyboard.json: every time
// below is a shot's start or end, or a word of the take (voice/voice.json, film time). The picture advances on twelves
// (template.json "stepped": 12): the renderer seeks the timeline to the held time, so every move here is stop motion.
//
// Everything is cut paper: each set is a stack of layers (background, middle, foreground) at depths, so the rostrum
// camera moves them with parallax; each piece has a slightly rough cut edge, paper fibre and a small soft shadow from
// one light above (index.html's filters), and the big sheets carry the odd fold line. Pieces slide, flip, fold and pop
// up from their hinge like a pop-up book; cuts are rostrum moves or a sheet of paper slid across the frame.
// The papers keep one meaning each all film: yellow is light, orange is sugar and what is built from it (the trunk,
// the wood: s14 opens the bark to show the wood is chains of sugar), red is oxygen, deep teal is carbon, soil and the
// printed type, leaf green is the leaf and its chlorophyll; hydrogen is a cream disc; the hills are the teal greens.
// The numbers are the fact sheet's: 164 lb = 74.4 kg against 2 oz = 57 g of soil (f1).
import { createFilm } from "../../kit/engine/motion.js";
import { createInk } from "../../kit/engine/ink.js";
import { createFlatBackdrop } from "../../kit/engine/backdrops.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, shots: s, voiced } = film;
const ink = createInk(film);
const D = film.duration;

// ── Paper and its meanings ──────────────────────────────────────────────────────────────────────────────────────
const INK = "#264653", LEAF = "#2a9d8f", SUN = "#e9c46a", SUGAR = "#f4a261", OXY = "#e76f51", CREAM = "#fbf6ea", CARD = "#f8f1e5";
const mix = (a, b, k) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join("")}`;
};
// The leaf's own green, as the template's concept still cuts its leaves; the teal greens are the hills.
const LEAFG = "#6a9a4f", LEAFG_D = "#4f7f3e", LEAFG_L = "#86ad5c";
const LEAFG_P = mix(LEAFG, CARD, 0.45), LEAFG_PP = mix(LEAFG, CARD, 0.66);
const LEAF_D = mix(LEAF, INK, 0.3), LEAF_L = mix(LEAF, CARD, 0.16), HILL = mix(LEAF, CARD, 0.34), HILL_FAR = mix(LEAF, CARD, 0.6);
const LEAF_P = mix(LEAF, CARD, 0.42), LEAF_PP = mix(LEAF, CARD, 0.62);
const SOIL_D = mix(INK, "#000000", 0.2), SOIL_M = mix(INK, LEAF, 0.12), SUGAR_D = mix(SUGAR, OXY, 0.35), SUGAR_L = mix(SUGAR, CARD, 0.45);
const POT = mix(LEAF, INK, 0.3), POT_L = mix(LEAF, CARD, 0.16), INK_L = mix(INK, CARD, 0.2), H_EDGE = mix(INK, CARD, 0.45);
const CREAM_D = mix(CREAM, INK, 0.1);

// ── When things are said (film time) ────────────────────────────────────────────────────────────────────────────
const findWord = (id, text) => {
  const w = voiced[id].words.find((x) => x[2].toLowerCase().replace(/[^\p{L}-]/gu, "").startsWith(text));
  if (!w) throw new Error(`no word "${text}" in ${id}`);
  return w;
};
const said = (id, text) => findWord(id, text)[0];

// ── Sound: every real event is logged with its time (render.mjs --events writes them for cues.build.py) ──────────
const events = (window.__events = []);
const cue = (kind, at, more = {}) => {
  events.push({ kind, at: +at.toFixed(3), ...more });
  return at;
};

// ── A seeded hand ───────────────────────────────────────────────────────────────────────────────────────────────
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ── Sets, layers and the rostrum camera ─────────────────────────────────────────────────────────────────────────
// A set's camera shows its point (x, y) at the frame's centre at zoom z. A layer at depth d moves d of the camera's
// travel and zooms d of its push (1: the subject's plane, less: further back, more: nearer the lens).
const NS = "http://www.w3.org/2000/svg";
const sets = {};
function makeSet(id) {
  const el = document.getElementById(id);
  const S = { id, el, svg: el.querySelector("svg"), cam: { x: 540, y: 960, z: 1 }, layers: [] };
  sets[id] = S;
  gsap.set(el, { autoAlpha: 0 });
  return S;
}
const node = (parent, markup) => {
  const g = document.createElementNS(NS, "g");
  g.innerHTML = markup;
  parent.append(g);
  return g;
};
function layer(S, depth, markup = "") {
  const g = node(S.svg, markup);
  S.layers.push({ g, d: depth });
  return g;
}
film.each(() => {
  for (const S of Object.values(sets)) {
    if (S.el.style.visibility === "hidden") continue;
    const { x, y, z } = S.cam;
    for (const L of S.layers) {
      const zd = 1 + (z - 1) * L.d, cx = 540 + (x - 540) * L.d, cy = 960 + (y - 960) * L.d;
      L.g.setAttribute("transform", `translate(${(540 - cx * zd).toFixed(2)} ${(960 - cy * zd).toFixed(2)}) scale(${zd.toFixed(4)})`);
    }
  }
});
// The camera that shows the set's point (px, py) at the frame's (fx, fy), at zoom z.
const aim = (px, py, z, fx = 540, fy = 960) => ({ x: px - (fx - 540) / z, y: py - (fy - 960) / z, z });
// Where a frame point lands in a set's own coordinates (for a depth-1 layer) under a camera.
const toSet = (cam, fx, fy) => [(fx - 540) / cam.z + cam.x, (fy - 960) / cam.z + cam.y];
const camTo = (S, to, at, duration = 0.6, ease = "power2.inOut") => tl.to(S.cam, { ...to, duration, ease }, at);
const camSet = (S, to, at) => tl.set(S.cam, to, at);
const showSet = (S, at) => tl.set(S.el, { autoAlpha: 1 }, at);
const hideSet = (S, at) => tl.set(S.el, { autoAlpha: 0 }, at);

// Things that move are drawn around their own origin and placed by a state the timeline tweens; the state is written
// every frame. The inner group is free for the paper moves (pop, flip, fold).
const movers = [];
function mover(parent, markup, x = 0, y = 0) {
  const o = node(parent, `<g>${markup}</g>`);
  const st = { x, y, s: 1, r: 0, sx: 1, sy: 1 };
  movers.push([o, st]);
  return { o, i: o.firstElementChild, st };
}
const writeMovers = () => {
  for (const [o, st] of movers) o.setAttribute("transform", `translate(${st.x.toFixed(2)} ${st.y.toFixed(2)}) rotate(${st.r.toFixed(2)}) scale(${(st.s * st.sx).toFixed(4)} ${(st.s * st.sy).toFixed(4)})`);
};

// ── Shapes ──────────────────────────────────────────────────────────────────────────────────────────────────────
const n1 = (v) => +v.toFixed(1);
const circ = (cx, cy, r) => `M${n1(cx - r)} ${n1(cy)} a${n1(r)} ${n1(r)} 0 1 0 ${n1(2 * r)} 0 a${n1(r)} ${n1(r)} 0 1 0 ${n1(-2 * r)} 0 Z`;
const ell = (cx, cy, rx, ry) => `M${n1(cx - rx)} ${n1(cy)} a${n1(rx)} ${n1(ry)} 0 1 0 ${n1(2 * rx)} 0 a${n1(rx)} ${n1(ry)} 0 1 0 ${n1(-2 * rx)} 0 Z`;
const rrect = (x, y, w, h, r) => `M${n1(x + r)} ${n1(y)} H${n1(x + w - r)} Q${n1(x + w)} ${n1(y)} ${n1(x + w)} ${n1(y + r)} V${n1(y + h - r)} Q${n1(x + w)} ${n1(y + h)} ${n1(x + w - r)} ${n1(y + h)} H${n1(x + r)} Q${n1(x)} ${n1(y + h)} ${n1(x)} ${n1(y + h - r)} V${n1(y + r)} Q${n1(x)} ${n1(y)} ${n1(x + r)} ${n1(y)} Z`;
// A cut piece: rough-edged (ink.roughen, once), fibred and shadowed (the .pc filter, or .up when lifted).
const piece = (d, fill, cls = "pc", more = "") => `<path class="${cls} cut" d="${d}" fill="${fill}" ${more}/>`;
// A piece inside a group that carries the filter (one shadow for the whole cut-out: cheaper for many small pieces).
const flat = (d, fill, more = "") => `<path class="cut" d="${d}" fill="${fill}" ${more}/>`;
const bez = (P, t) => {
  const u = 1 - t;
  return [0, 1].map((i) => u * u * u * P[0][i] + 3 * u * u * t * P[1][i] + 3 * u * t * t * P[2][i] + t * t * t * P[3][i]);
};
// A tapering strip of paper along a cubic curve (a root, a branch, a willow leaf): w0 wide at its start, w1 at its end.
function taper(P, w0, w1, n = 22) {
  const L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, [x, y] = bez(P, t), [x2, y2] = bez(P, Math.min(1, t + 0.01)), [x1, y1] = bez(P, Math.max(0, t - 0.01));
    const a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2, w = (w0 + (w1 - w0) * t) / 2;
    L.push([x + Math.cos(a) * w, y + Math.sin(a) * w]);
    R.push([x - Math.cos(a) * w, y - Math.sin(a) * w]);
  }
  const pts = [...L, ...R.reverse()];
  return `M${pts.map(([x, y]) => `${n1(x)} ${n1(y)}`).join(" L")} Z`;
}
const hexPath = (x, y, r) => `M${Array.from({ length: 6 }, (_, i) => `${n1(x + r * Math.cos(((60 * i + 30) * Math.PI) / 180))} ${n1(y + r * Math.sin(((60 * i + 30) * Math.PI) / 180))}`).join(" L")} Z`;
// A cut paper arrow from (x0, y0) to (x1, y1).
function arrowPath(x0, y0, x1, y1, w = 30) {
  const a = Math.atan2(y1 - y0, x1 - x0), n = [Math.cos(a + Math.PI / 2), Math.sin(a + Math.PI / 2)];
  const hx = x1 - Math.cos(a) * w * 1.5, hy = y1 - Math.sin(a) * w * 1.5;
  const p = [[x0 + (n[0] * w) / 2, y0 + (n[1] * w) / 2], [hx + (n[0] * w) / 2, hy + (n[1] * w) / 2], [hx + n[0] * w, hy + n[1] * w], [x1, y1], [hx - n[0] * w, hy - n[1] * w], [hx - (n[0] * w) / 2, hy - (n[1] * w) / 2], [x0 - (n[0] * w) / 2, y0 - (n[1] * w) / 2]];
  return `M${p.map(([x, y]) => `${n1(x)} ${n1(y)}`).join(" L")} Z`;
}

// ── Printed lettering ───────────────────────────────────────────────────────────────────────────────────────────
// Fraunces has no subscript digits, ≈ or →: a subscript is set smaller and lower, the two signs are drawn.
const measure = document.createElement("canvas").getContext("2d");
const SUB = "₀₁₂₃₄₅₆₇₈₉";
function printed(x, y, str, size, { anchor = "middle", weight = 600, colour = INK, cls = "tx" } = {}) {
  const segs = [];
  for (const ch of str) {
    const kind = SUB.includes(ch) ? "sub" : ch === "≈" ? "approx" : ch === "→" ? "arrow" : "text";
    const text = kind === "sub" ? String(SUB.indexOf(ch)) : ch;
    if (segs.length && segs.at(-1).kind === kind && (kind === "text" || kind === "sub")) segs.at(-1).text += text;
    else segs.push({ kind, text });
  }
  const sub = size * 0.64;
  for (const g of segs) {
    measure.font = `${weight} ${g.kind === "sub" ? sub : size}px Fraunces`;
    if (g.kind === "text" || g.kind === "sub") g.w = measure.measureText(g.text).width + (g.kind === "sub" ? size * 0.03 : 0);
    else g.w = g.kind === "approx" ? size * 0.66 : size * 1.0;
  }
  const width = segs.reduce((a, g) => a + g.w, 0);
  let cx = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  let out = "";
  const sw = size * 0.075;
  for (const g of segs) {
    if (g.kind === "text") out += `<text class="${cls}" x="${n1(cx)}" y="${n1(y)}" font-size="${size}" font-weight="${weight}" fill="${colour}" xml:space="preserve">${g.text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`;
    else if (g.kind === "sub") out += `<text class="${cls}" x="${n1(cx + size * 0.015)}" y="${n1(y + size * 0.2)}" font-size="${n1(sub)}" font-weight="${weight}" fill="${colour}">${g.text}</text>`;
    else if (g.kind === "approx") {
      const m = y - size * 0.3, a = g.w * 0.38, x0 = cx + g.w * 0.12;
      for (const dy of [-size * 0.1, size * 0.1]) out += `<path d="M${n1(x0)} ${n1(m + dy + 3)} q${n1(a / 2)} ${n1(-size * 0.16)} ${n1(a)} 0 t${n1(a)} 0" fill="none" stroke="${colour}" stroke-width="${n1(sw)}" stroke-linecap="round"/>`;
    } else {
      const m = y - size * 0.32, x0 = cx + g.w * 0.14, x1 = cx + g.w * 0.86, h = size * 0.2;
      out += `<path d="M${n1(x0)} ${n1(m)} H${n1(x1)} M${n1(x1 - h)} ${n1(m - h)} L${n1(x1)} ${n1(m)} L${n1(x1 - h)} ${n1(m + h)}" fill="none" stroke="${colour}" stroke-width="${n1(sw)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    cx += g.w;
  }
  return { markup: out, width };
}

// A paper tag tied with thread to the part it names. (x, y) is the text's baseline centre; `to` is where the thread
// is tied (or `follow()`, a part that moves). It flips down from its hole as the thread is drawn out to the part.
// A tag that carries a number is stamped: the number is printed in stamp ink, at its value.
const threads = [];
function tag(parent, x, y, text, to, { size = 56, colour = INK, fill = CREAM, sag = 40, stamped = false, follow = null } = {}) {
  const p = printed(x + size * 0.28, y, text, size, { colour, weight: stamped ? 700 : 600 });
  const w = p.width + size * 1.45, h = size * 1.42, x0 = x + size * 0.28 - p.width / 2 - size * 0.95, y0 = y - size * 0.98;
  const c = size * 0.34;
  const hole = [x0 + size * 0.42, y0 + h / 2];
  const body = `M${n1(x0 + c)} ${n1(y0)} H${n1(x0 + w)} V${n1(y0 + h)} H${n1(x0 + c)} L${n1(x0)} ${n1(y0 + h - c)} V${n1(y0 + c)} Z`;
  let thread = null;
  const t = { box: [x0, y0, w, h], hole };
  if (to || follow) {
    const curve = ([tx, ty]) => {
      const mx = (hole[0] + tx) / 2, my = Math.max(hole[1], ty) + sag;
      return `M${n1(hole[0])} ${n1(hole[1])} Q${n1(mx)} ${n1(my)} ${n1(tx)} ${n1(ty)}`;
    };
    const end = to ?? follow();
    thread = node(parent, `<path class="thread" d="${curve(end)}" pathLength="1"/><circle cx="${n1(end[0])}" cy="${n1(end[1])}" r="5" fill="#1d3540"/>`);
    if (follow) threads.push({ thread, curve, follow });
  }
  const g = node(parent, `<g class="tg"><path d="${body}" fill="${fill}"/><circle cx="${n1(hole[0])}" cy="${n1(hole[1])}" r="${n1(size * 0.11)}" fill="${CARD}" stroke="${mix(fill, INK, 0.3)}" stroke-width="2"/>${stamped ? `<g class="stamp-ink">${p.markup}</g>` : p.markup}</g>`);
  g.dataset.ox = n1(hole[0]);
  g.dataset.oy = n1(y0);
  return Object.assign(t, { g, thread });
}
const writeThreads = () => {
  for (const { thread, curve, follow } of threads) {
    if (thread.style.visibility === "hidden") continue;
    const e = follow();
    thread.firstElementChild.setAttribute("d", curve(e));
    thread.lastElementChild.setAttribute("cx", n1(e[0]));
    thread.lastElementChild.setAttribute("cy", n1(e[1]));
  }
};
// A number on a stamped tag, at its real value: a card with the number stamped on in ink, a little crooked.
function stampTag(parent, x, y, text, { size = 96, tilt = -3 } = {}) {
  const p = printed(x, y, text, size, { weight: 700 });
  const w = p.width + size * 0.9, h = size * 1.38, x0 = x - w / 2, y0 = y - size * 0.98;
  const g = node(parent, `<g class="tg"><rect x="${n1(x0)}" y="${n1(y0)}" width="${n1(w)}" height="${n1(h)}" fill="${CREAM}"/><circle cx="${n1(x)}" cy="${n1(y0 + 16)}" r="7" fill="${CARD}" stroke="${mix(CREAM, INK, 0.3)}" stroke-width="2"/>
    <g class="stamp-ink" transform="rotate(${tilt} ${x} ${y0 + h / 2})"><rect x="${n1(x0 + 14)}" y="${n1(y0 + 28)}" width="${n1(w - 28)}" height="${n1(h - 40)}" fill="none" stroke="${INK}" stroke-width="5"/>${printed(x, y + size * 0.08, text, size, { weight: 700 }).markup}</g></g>`);
  return { g, hole: [x, y0 + 16], box: [x0, y0, w, h] };
}
// A printed paper strip (a heading), a little crooked, with an optional orange tab behind one word.
function strip(parent, x, y, text, size, { tilt = -1.2 } = {}) {
  const p = printed(x, y, text, size);
  const w = p.width + size * 1.1, h = size * 1.45;
  return node(parent, `<g class="tg" transform="rotate(${tilt} ${x} ${y})"><path d="M${n1(x - w / 2)} ${n1(y - size * 1.02)} L${n1(x + w / 2)} ${n1(y - size * 1.06)} L${n1(x + w / 2 - 3)} ${n1(y - size * 1.06 + h)} L${n1(x - w / 2 + 2)} ${n1(y - size * 1.02 + h + 2)} Z" fill="${CREAM}"/>${p.markup}</g>`);
}

// ── Molecules: paper discs, one colour per element (C deep teal, O red, H cream) ─────────────────────────────────
const letter = (r, l, colour) => (r >= 26 ? printed(0, r * 0.36, l, r * 1.02, { weight: 700, colour, cls: "tx sans" }).markup : "");
const disc = (x, y, r, fill, l, lc, cls = "pc") => `<g transform="translate(${n1(x)} ${n1(y)})">${piece(circ(0, 0, r), fill, cls, fill === CREAM ? `stroke="${H_EDGE}" stroke-width="2"` : "")}${l ? letter(r, l, lc) : ""}</g>`;
const oAtom = (x, y, r, l = true) => disc(x, y, r, OXY, l && "O", CREAM);
const cAtom = (x, y, r, l = true) => disc(x, y, r, INK, l && "C", CREAM);
const hAtom = (x, y, r, l = true) => disc(x, y, r, CREAM, l && "H", INK);
const co2 = (r, l = true) => oAtom(-1.55 * r, 0, r * 0.86, l) + oAtom(1.55 * r, 0, r * 0.86, l) + cAtom(0, 0, r, l);
const h2o = (r, l = true) => oAtom(0, 0, r, l) + hAtom(-1.02 * r, r * 0.86, r * 0.64, l) + hAtom(1.02 * r, r * 0.86, r * 0.64, l);
const o2 = (r, l = true) => oAtom(-0.82 * r, 0, r, l) + oAtom(0.82 * r, 0, r, l);
// The sugar: an orange hexagon (the ring of glucose; f8), a lighter hexagon laid on it.
const sugar = (r) => piece(hexPath(0, 0, r), SUGAR) + flat(hexPath(0, -r * 0.05, r * 0.62), mix(SUGAR, CARD, 0.22));

// ── Paper motion: everything on twelves, because the renderer holds each drawing for five frames ────────────────
const hidden = (els) => gsap.set(els, { autoAlpha: 0 });
// Pops up from its hinge like a pop-up page: from flat to a little past upright, then settles.
function popUp(el, at, { origin = "50% 100%", dur = 0.42, from = 0.04, axis = "scaleY", sound = "pop", hide = true, ease = "back.out(2.2)" } = {}) {
  if (hide) gsap.set(el, { autoAlpha: 0 });
  tl.set(el, { autoAlpha: 1, [axis]: from, transformOrigin: origin }, at);
  tl.to(el, { [axis]: 1, duration: dur, ease }, at);
  if (sound) cue(sound, at);
  return at + dur;
}
// Folds flat again, towards its hinge.
function foldDown(el, at, { origin = "50% 100%", dur = 0.3, axis = "scaleY", sound = null } = {}) {
  tl.to(el, { [axis]: 0.02, duration: dur, ease: "power2.in", transformOrigin: origin }, at);
  tl.set(el, { autoAlpha: 0 }, at + dur);
  if (sound) cue(sound, at);
  return at + dur;
}
// A tag flips down from its hole on its thread, and the thread is pulled out to the part.
function flipTag(t, at, { dur = 0.34, sound = "flip" } = {}) {
  gsap.set(t.g, { autoAlpha: 0 });
  tl.set(t.g, { autoAlpha: 1, scaleY: -0.15, svgOrigin: `${t.g.dataset.ox} ${t.g.dataset.oy}` }, at);
  tl.to(t.g, { scaleY: 1, duration: dur, ease: "back.out(2)" }, at);
  if (t.thread) {
    const path = t.thread.querySelector("path"), knot = t.thread.querySelector("circle");
    gsap.set(t.thread, { autoAlpha: 0 });
    tl.set(t.thread, { autoAlpha: 1 }, at);
    gsap.set(path, { strokeDasharray: "1 1.02", strokeDashoffset: 1 });
    gsap.set(knot, { autoAlpha: 0 });
    tl.to(path, { strokeDashoffset: 0, duration: dur * 0.9, ease: "power1.out" }, at);
    tl.set(knot, { autoAlpha: 1 }, at + dur * 0.8);
  }
  if (sound) cue(sound, at);
  return at + dur;
}
// A tag (and its thread) folds up and away.
function dropTag(t, at, dur = 0.24) {
  tl.to(t.g, { scaleY: 0.02, duration: dur, ease: "power2.in", svgOrigin: `${t.g.dataset.ox} ${t.g.dataset.oy}` }, at);
  tl.set([t.g, t.thread].filter(Boolean), { autoAlpha: 0 }, at + dur);
}
// Slides in from off the frame and lands; or slides out.
function slideIn(el, at, { x = 0, y = 0, dur = 0.5, ease = "power3.out", sound = "slide" } = {}) {
  gsap.set(el, { autoAlpha: 0 });
  tl.set(el, { autoAlpha: 1 }, at);
  tl.fromTo(el, { x, y }, { x: 0, y: 0, duration: dur, ease, immediateRender: false }, at);
  if (sound) cue(sound, at);
  return at + dur;
}
function slideOut(el, at, { x = 0, y = 0, dur = 0.4, ease = "power3.in", sound = "slide" } = {}) {
  tl.to(el, { x, y, duration: dur, ease }, at);
  tl.set(el, { autoAlpha: 0 }, at + dur);
  if (sound) cue(sound, at);
  return at + dur;
}
// A mover pops up around its own centre: the inner group scales, the outer one is placed by the state.
function popM(m, at, { from = 0.2, dur = 0.3, sound = "pop", origin = "50% 50%" } = {}) {
  gsap.set(m.o, { autoAlpha: 0 });
  tl.set(m.o, { autoAlpha: 1 }, at);
  return popUp(m.i, at, { origin, axis: "scale", from, dur, sound, hide: false });
}
// Hangs from its top and swings to rest, as a tag dropped on its thread does.
function swing(el, at, { ox, oy, angle = 9, dur = 1.1 } = {}) {
  tl.fromTo(el, { rotation: angle, svgOrigin: `${ox} ${oy}` }, { rotation: 0, duration: dur, ease: "elastic.out(1.1, 0.35)", immediateRender: false }, at);
}
// Shown on a frame (no fade: paper is either there or not).
const put = (el, at) => tl.set(el, { autoAlpha: 1 }, at);
const lift = (el, at) => tl.set(el, { autoAlpha: 0 }, at);

// ── A cut-out figure on split pins: head, body, legs and a jointed arm that turns at its pins ────────────────────
// Built standing at the origin, 640 tall, facing right; placed by its state (x, y feet, k scale, face ±1). The near
// hand goes where `reach` says (two-bone reach, elbow down), or the arm hangs by its angles.
function puppet(parent, { ruff = false, coat = INK, seed = 1 } = {}) {
  const H0 = 640, u = H0 / 100, L1 = 0.26 * H0, L2 = 0.26 * H0;
  const S = [26, -461], E0 = [S[0] + L1, S[1]];
  const pin = (x, y) => `<circle cx="${n1(x)}" cy="${n1(y)}" r="9" fill="${SUN}"/><circle cx="${n1(x)}" cy="${n1(y)}" r="3.2" fill="${mix(SUN, INK, 0.5)}"/>`;
  const o = node(parent, "");
  const g = node(o, "");
  g.setAttribute("class", "pc");
  const legs = node(g, flat(taper([[-22, -290], [-28, -190], [-40, -100], [-50, 0]], 54, 44), mix(coat, "#000000", 0.18)) + flat(rrect(-84, -16, 60, 22, 9), SOIL_D) +
    flat(taper([[22, -290], [26, -190], [34, -100], [42, 0]], 54, 44), coat) + flat(rrect(30, -16, 66, 22, 9), SOIL_D));
  const body = node(g, flat("M-72 -488 C -40 -500, 40 -500, 72 -488 L60 -262 C 30 -250, -30 -250, -60 -262 Z", coat) + pin(0, -280));
  const head = node(g, flat(rrect(-14, -512, 28, 34, 6), mix(CREAM, SUGAR, 0.12)) +
    (ruff ? flat(Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2, r = i % 2 ? 40 : 52; return `${i ? "L" : "M"}${n1(Math.cos(a) * r * 1.35)} ${n1(-492 + Math.sin(a) * r * 0.42)}`; }).join(" ") + " Z", CREAM, `stroke="${H_EDGE}" stroke-width="2"`) : "") +
    flat(circ(0, -570, 64), mix(CREAM, SUGAR, 0.12)) + flat("M-66 -580 C -64 -650, 52 -664, 64 -596 C 40 -620, -20 -626, -40 -600 C -46 -590, -52 -570, -60 -556 Z", SOIL_D) +
    `<circle cx="28" cy="-574" r="6.5" fill="${INK}"/>` + flat("M62 -566 q14 8 0 18 Z", mix(CREAM, SUGAR, 0.12)));
  const arm = node(g, "");
  const upper = node(arm, flat(taper([[S[0], S[1]], [S[0] + L1 * 0.33, S[1]], [S[0] + L1 * 0.66, S[1]], [E0[0], E0[1]]], 48, 40), coat));
  const fore = node(arm, flat(taper([[E0[0], E0[1]], [E0[0] + L2 * 0.33, E0[1]], [E0[0] + L2 * 0.66, E0[1]], [E0[0] + L2 - 6, E0[1]]], 40, 34), coat) + flat(circ(E0[0] + L2, E0[1], 22), mix(CREAM, SUGAR, 0.12)) + pin(E0[0], E0[1]));
  node(arm, pin(S[0], S[1]));
  const st = { x: 0, y: 0, k: 1, face: 1, a1: 80, a2: 10, reach: null, hold: 0, breathe: 0, nod: 0 };
  const deg = 180 / Math.PI;
  const hand = () => {
    const a1 = st.a1 / deg, a2 = (st.a1 + st.a2) / deg;
    const lx = S[0] + L1 * Math.cos(a1) + L2 * Math.cos(a2), ly = S[1] + L1 * Math.sin(a1) + L2 * Math.sin(a2);
    return [st.x + lx * st.k * st.face, st.y + ly * st.k];
  };
  film.each(() => {
    if (st.reach && st.hold > 0.5) {
      // The hand goes to a point of the set: back to the figure's own frame, then a two-bone reach, elbow down.
      const [px, py] = st.reach();
      const lx = ((px - st.x) / st.k) * st.face - S[0], ly = (py - st.y) / st.k - S[1];
      const d = Math.min(L1 + L2 - 0.5, Math.hypot(lx, ly)), th = Math.atan2(ly, lx);
      const al = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
      const ga = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2))));
      st.a1 = (th + al) * deg;
      st.a2 = -(Math.PI - ga) * deg;
    }
    o.setAttribute("transform", `translate(${n1(st.x)} ${n1(st.y)}) scale(${(st.k * st.face).toFixed(4)} ${st.k.toFixed(4)})`);
    fore.setAttribute("transform", `rotate(${st.a2.toFixed(2)} ${E0[0]} ${E0[1]})`);
    // Breathing in: the body piece swings up a little on its hip pin and the head rides on it.
    body.setAttribute("transform", `translate(0 ${n1(-st.breathe * 10)}) scale(1 ${(1 + st.breathe * 0.035).toFixed(4)})`);
    head.setAttribute("transform", `translate(0 ${n1(-st.breathe * 16)}) rotate(${n1(st.nod)} 0 -500)`);
    arm.setAttribute("transform", `translate(0 ${n1(-st.breathe * 12)}) rotate(${st.a1.toFixed(2)} ${S[0]} ${S[1]})`);
  });
  return { o, g, st, hand, face: () => [st.x + 30 * st.k * st.face, st.y - 560 * st.k] };
}

// ── A willow, cut from paper: an orange stem and branches (it is built from sugar), long hanging green leaves ─────
function willow(h, sp, seed, { rootsToo = false } = {}) {
  const R = rng(seed);
  const parts = [];
  const leaves = [];
  parts.push(flat(taper([[0, 30], [0, -h * 0.35], [0, -h * 0.7], [0, -h]], 10 + h * 0.035, 4), SUGAR));
  const nb = Math.max(3, Math.round(2 + h / 95));
  for (let i = 0; i < nb; i++) {
    const side = i % 2 ? 1 : -1, f = nb > 1 ? i / (nb - 1) : 0.5;
    const yb = h * (0.52 + 0.46 * f), reach = sp * (0.6 + 0.4 * Math.sin(Math.PI * (0.3 + f * 0.6))) * (0.85 + R() * 0.3);
    const P = [[0, -yb], [side * reach * 0.4, -yb - h * 0.13], [side * reach * 0.82, -yb - h * 0.1], [side * reach, -yb + h * 0.03]];
    parts.push(flat(taper(P, 5 + h * 0.012, 2), SUGAR));
    const nl = Math.max(2, Math.round(2 + reach / 40));
    for (let j = 0; j < nl; j++) {
      const t = 0.35 + (0.65 * j) / Math.max(1, nl - 1), [bx, by] = bez(P, t);
      const L = Math.min(h * 0.42, 50 + h * 0.22) * (0.75 + R() * 0.4), sway = side * (4 + R() * 10);
      leaves.push(flat(taper([[bx, by], [bx + sway * 0.5, by + L * 0.35], [bx + sway, by + L * 0.72], [bx + sway * 0.8, by + L]], 9 + h * 0.012, 1.5), (i + j) % 3 ? LEAFG : LEAFG_D));
    }
  }
  const roots = [];
  if (rootsToo) for (let i = 0; i < 6; i++) {
    const a = -0.9 + (1.8 * i) / 5, L = 40 + h * 0.08 + R() * 20;
    roots.push(flat(taper([[0, 20], [Math.sin(a) * L * 0.3, 20 + L * 0.35], [Math.sin(a) * L * 0.8, 20 + L * 0.55], [Math.sin(a) * L, 20 + L * 0.75]], 9, 2), SUGAR));
  }
  return { markup: parts.join("") + leaves.join(""), roots: roots.join("") };
}

// ── More paper ──────────────────────────────────────────────────────────────────────────────────────────────────
// The odd fold line across a big sheet: a crease, one side catching the light, the other in its own shadow.
const fold = (x0, y0, x1, y1, k = 1) =>
  `<path d="M${x0} ${y0} L${x1} ${y1}" stroke="#ffffff" stroke-opacity="${0.16 * k}" stroke-width="2.5" fill="none"/><path d="M${x0} ${y0 + 2.5} L${x1} ${y1 + 2.5}" stroke="#3b2a1a" stroke-opacity="${0.1 * k}" stroke-width="2" fill="none"/>`;
// A leaf cut from paper, along +x from its stalk end: a pointed oval L long, W wide, its midrib cut in a darker paper.
const leafD = (L, W) => `M0 0 C ${n1(L * 0.22)} ${n1(-W * 0.62)}, ${n1(L * 0.62)} ${n1(-W * 0.66)}, ${n1(L)} 0 C ${n1(L * 0.62)} ${n1(W * 0.66)}, ${n1(L * 0.22)} ${n1(W * 0.62)}, 0 0 Z`;
const leafAt = (x, y, a, L, W, c, rib = mix(c, INK, 0.25)) =>
  `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(a)})">${flat(leafD(L, W), c)}${flat(taper([[L * 0.05, 0], [L * 0.35, 0], [L * 0.65, 0], [L * 0.92, 0]], Math.max(2, W * 0.07), 1), rib)}</g>`;
// A cluster of leaves on a branch tip: a ring of darker leaves behind, lighter ones in front, each its own cut piece.
function cluster(cx, cy, r, seed, { front = 5, back = 9, focus = null } = {}) {
  const R = rng(seed);
  let b = "", f = "";
  for (let i = 0; i < back; i++) {
    const a = (i / back) * 360 + R() * 24, d = r * (0.32 + R() * 0.12), L = r * (0.82 + R() * 0.2);
    const x = cx + Math.cos((a * Math.PI) / 180) * d - Math.cos((a * Math.PI) / 180) * L * 0.25, y = cy + Math.sin((a * Math.PI) / 180) * d * 0.9 - Math.sin((a * Math.PI) / 180) * L * 0.25;
    b += leafAt(x, y, a, L, L * 0.36, i % 3 ? LEAFG_D : LEAFG);
  }
  for (let i = 0; i < front; i++) {
    const a = -150 + (i / Math.max(1, front - 1)) * 300 + R() * 20, d = r * (0.1 + R() * 0.12), L = r * (0.7 + R() * 0.18);
    f += leafAt(cx + Math.cos((a * Math.PI) / 180) * d - L * 0.2 * Math.cos((a * Math.PI) / 180), cy + Math.sin((a * Math.PI) / 180) * d - L * 0.2 * Math.sin((a * Math.PI) / 180), a, L, L * 0.36, i % 2 ? LEAFG_L : LEAFG);
  }
  if (focus) f += leafAt(focus[0], focus[1], 0, focus[2], focus[2] * 0.33 * 2 / 1.32, LEAFG);
  return { back: `<g class="pc">${b}</g>`, front: `<g class="pc">${f}</g>` };
}
// The tree's branches and its clusters: shared by the big tree and its small copies (the question, the recipe).
const BRANCHES = [
  [[[540, 860], [500, 800], [430, 720], [352, 628]], 36, 12], [[[540, 850], [590, 790], [660, 700], [736, 622]], 36, 12],
  [[[540, 840], [536, 720], [540, 600], [545, 420]], 42, 12], [[[528, 760], [470, 690], [425, 580], [402, 488]], 22, 8],
  [[[556, 730], [612, 640], [672, 545], [690, 478]], 22, 8], [[[536, 700], [510, 660], [490, 630], [478, 600]], 14, 6],
  [[[548, 690], [580, 660], [604, 640], [622, 624]], 14, 6],
];
const CLUSTERS = [[545, 395, 122, 3], [400, 468, 112, 5], [690, 462, 112, 7], [345, 612, 110, 11], [738, 606, 106, 13], [482, 592, 102, 17], [622, 612, 98, 19]];
// The leaf the camera goes into (s07, s09, s12, s13): one leaf of the low left cluster, pointing right like the big leaf.
const FOCUS = { x: 300, y: 640, L: 108 };
const TRUNK_D = taper([[540, 1236], [540, 1080], [541, 930], [540, 830]], 94, 50);
function treeMarkup(cx, base, k) {
  const tf = `translate(${n1(cx - 540 * k)} ${n1(base - 1195 * k)}) scale(${k})`;
  const cl = CLUSTERS.map(([x, y, r, sd]) => cluster(x, y, r, sd + 100));
  return `<g transform="${tf}">${piece(TRUNK_D, SUGAR)}<g class="pc">${BRANCHES.map(([P, a, b]) => flat(taper(P, a, b), SUGAR)).join("")}</g>${cl.map((c) => c.back).join("")}${cl.map((c) => c.front).join("")}</g>`;
}

// ── Captions: two or three words on a paper strip, the key word on an orange tab, laid down as they are said ───────
// The strips break where the sentence breaks (a phrase, never "tanah di / bawahnya"); each one slides in as a strip
// of paper is laid down, its words lit as they are said, and is replaced by the next one on the same frame.
const LINES = {
  s01: ["Pohon bisa *tumbuh*", "segede ini,"], s01b: ["tapi tanah di bawahnya", "hampir nggak *berkurang*."],
  s02: ["Terus,"], s03: ["Dulu ada yang", "pernah nyoba:", "pohon kecil", "ditanam di *pot*,"],
  s03b: ["terus dirawat", "*lima tahun*."], s04: ["Pohonnya nambah", "*tujuh puluh kilo* lebih,"],
  s05: ["tapi tanahnya", "cuma berkurang", "sekitar *setengah ons*."], s06: ["Ternyata bahannya", "dari *udara* dan air."],
  s07: ["Karbon dioksida", "masuk lewat", "pori-pori kecil", "di *daun*,"], s08: ["air naik dari *akar*."],
  s09: ["Nah, di daun", "ada *klorofil*,", "zat hijau", "yang nangkep", "cahaya matahari."], s10: ["Energi cahayanya", "dipakai buat", "*mecah* air."],
  s11: ["Oksigennya dilepas,", "terus kita *hirup*."], s12: ["Hidrogennya", "digabung sama", "karbon dioksida,", "jadi *gula*."],
  s13: ["Gula inilah", "*makanan* tumbuhan,"], s14: ["yang disusun jadi", "daun, batang,", "sampai *kayu*."],
  s15: ["Jadi tumbuhan", "bikin makanannya", "sendiri,", "dari *cahaya*,", "udara, dan air."], s16: ["Makanya,"],
};
const capBox = Object.assign(document.createElement("div"), { id: "captions" });
capBox.dataset.style = "pop";
document.getElementById("vignette").before(capBox);
const capGroups = [];
for (const shot of storyboard.shots) {
  const words = voiced[shot.id]?.words ?? [];
  let k = 0;
  for (const line of LINES[shot.id] ?? []) {
    const el = Object.assign(document.createElement("p"), { className: "caption pop" });
    el.dataset.shot = shot.id;
    const tokens = [];
    for (const part of line.split(/(\*[^*]+\*)/)) {
      if (!part) continue;
      const strong = part.startsWith("*");
      const ws = (strong ? part.slice(1, -1) : part).split(/\s+/).filter(Boolean);
      if (strong) tokens.push({ w: ws.join(" "), strong, n: ws.length });
      else for (const w of ws) {
        if (/^[.,;:!?]+$/.test(w) && tokens.length) tokens.at(-1).w += w;
        else tokens.push({ w, strong, n: 1 });
      }
    }
    tokens.forEach((t, i) => {
      if (i && !/^[.,;:!?]/.test(t.w)) el.append(" ");
      el.append(Object.assign(document.createElement("span"), { className: t.strong ? "cw key" : "cw", textContent: t.w }));
      t.at = words[k] ? words[k][0] : shot.start;
      k += t.n;
    });
    capBox.append(el);
    capGroups.push({ el, shot, tokens, at: tokens[0].at });
  }
  // Words a shot's strips leave out are said under a strip of their own on the picture (the question in s02).
  if (words[k] && capGroups.length) capGroups.at(-1).cut = words[k][0] - 0.08;
}
capGroups.forEach((g, i) => {
  const next = capGroups[i + 1];
  const start = i === 0 ? 0.12 : Math.max(g.at - 0.08, g.shot.start - 0.05);
  // Held until the next strip is laid down; across a pause between shots, until the next shot's first word at most.
  // The last strip is gone before the loop's seam, so the last frame is the first.
  const end = g.cut ?? (next ? Math.max(start + 0.3, Math.max(next.at - 0.08, next.shot.start - 0.05)) : g.shot.end - 0.2);
  const words = [...g.el.querySelectorAll(".cw")];
  gsap.set(g.el, { autoAlpha: 0, xPercent: -50, rotation: -1.2 });
  gsap.set(words, { opacity: 0.42 });
  tl.set(g.el, { autoAlpha: 1 }, start);
  tl.fromTo(g.el, { x: -46, rotation: -3.2 }, { x: 0, rotation: -1.2, duration: 0.16, ease: "power3.out", immediateRender: false }, start);
  g.tokens.forEach((t, j) => tl.to(words[j], { opacity: 1, duration: 0.08, ease: "none" }, Math.max(start, t.at)));
  tl.set(g.el, { autoAlpha: 0 }, end);
});

// ── A sheet of paper slid across the frame: the cut between two sets. It covers the frame at `at`, where the swap is
// made, and carries on off the other side at the same pace, so it is on screen for nearly all of `dur`. dir: "left"
// (enters from the right), "right", "up" or "down". `sheet` another sheet (the leaf), `size` how far off the frame
// it starts, `lift` lifts it off upwards like a flap (seconds) instead of sliding it on.
const WIPE = document.getElementById("sheetWipe");
const LEAF_SHEET = document.getElementById("sheetLeaf");
function wipe(at, dir = "left", { dur = 0.9, swap = () => {}, sheet = WIPE, size = null, lift = 0 } = {}) {
  const axis = dir === "left" || dir === "right" ? "x" : "y";
  const span = size ?? (axis === "x" ? 1180 : 2060);
  const from = dir === "left" || dir === "up" ? span : -span;
  tl.set(sheet, { autoAlpha: 1, x: 0, y: 0, scaleY: 1, [axis]: from }, at - dur / 2);
  tl.to(sheet, { [axis]: 0, duration: dur / 2, ease: "none" }, at - dur / 2);
  if (lift) {
    tl.to(sheet, { scaleY: 0.02, transformOrigin: "50% 0%", duration: lift, ease: "none" }, at + 0.04);
    tl.set(sheet, { autoAlpha: 0 }, at + 0.04 + lift);
  } else {
    tl.to(sheet, { [axis]: -from, duration: dur / 2, ease: "none" }, at);
    tl.set(sheet, { autoAlpha: 0 }, at + dur / 2);
  }
  cue("slide", at - dur / 2, { wipe: at });
  swap(at);
}

// The page's paper, for the sheets laid over a set.
const sheetPaper = (() => {
  const c = Object.assign(document.createElement("canvas"), { width: 1080, height: 1920 });
  createFlatBackdrop(c, { ...film.look, paper: CARD }).render({});
  return c.toDataURL("image/jpeg", 0.9);
})();
for (const el of ["sheetAsk", "sheetCard", "sheetWipe"].map((id) => document.getElementById(id)))
  Object.assign(el.style, { background: `url(${sheetPaper}) 0 0 / 1080px 1920px`, boxShadow: "0 0 44px 10px rgb(59 42 26 / 0.34)" });
WIPE.innerHTML = `<svg viewBox="0 0 1080 1920" style="position:absolute;inset:0;width:1080px;height:1920px">${fold(-20, 640, 1100, 560, 1.4)}${fold(300, -20, 380, 1940, 1)}</svg>`;
gsap.set(LEAF_SHEET, { autoAlpha: 0 });
node(LEAF_SHEET.querySelector("svg"), `<g class="up">${flat("M-760 980 C -420 -560, 1500 -560, 1840 940 C 1500 2520, -420 2520, -760 980 Z", LEAFG)}</g><g class="pc">${flat(taper([[-760, 980], [100, 930], [900, 960], [1840, 940]], 30, 8), LEAFG_D)}${[-260, 80, 420, 760, 1100].map((x) => flat(taper([[x, 950], [x + 120, 760], [x + 220, 560], [x + 330, 330]], 16, 5), LEAFG_D) + flat(taper([[x, 960], [x + 120, 1160], [x + 220, 1360], [x + 330, 1600]], 16, 5), LEAFG_D)).join("")}</g>`);

// ═══ The opening set: the tree on its hill, the soil cut open under it (s01, s01b, s06, s08, s11, s13, s16) ══════
const T = makeSet("setTree");
// The opening frame: the set's point (540, 1020) at the frame's middle, so the roots sit above the captions.
const BASE = aim(540, 1020, 1);
const SOIL_EDGE = [[0, 1200], [280, 1170], [700, 1220], [1080, 1190]];
const tSunL = layer(T, 0.22, "");
const tSun = node(tSunL, piece(circ(820, 430, 112), SUN));
const tFarL = layer(T, 0.45, "");
const tFar = node(tFarL, piece("M-520 980 C -260 930, -60 900, 160 925 C 380 950, 520 900, 700 905 C 900 910, 1120 950, 1600 930 V1500 H-520 Z", HILL_FAR) + fold(-200, 1010, 1400, 1060, 0.8));
const tHillL = layer(T, 0.72, "");
const tHill = node(tHillL, piece("M-520 1040 L0 1030 C 220 960, 460 990, 660 1040 C 840 1085, 960 1020, 1080 1010 L1600 1000 V1500 H-520 Z", HILL));
const tMain = layer(T, 1);
const tTree = node(tMain, "");
const tTrunk = node(tTree, piece(TRUNK_D, SUGAR) + fold(528, 1180, 548, 880, 0.8));
// The channel in the trunk that carries water up (the xylem), uncovered in s08 by a strip of bark lifted aside.
const tXylem = node(tTree, piece("M518 1236 L521 1000 L524 860 L556 860 L559 1000 L562 1236 Z", CREAM, "pc", `stroke="${H_EDGE}" stroke-width="2"`));
hidden(tXylem);
const tBranches = node(tTree, `<g class="pc">${BRANCHES.map(([P, a, b]) => flat(taper(P, a, b), SUGAR)).join("")}</g>`);
const CL = CLUSTERS.map(([x, y, r, sd]) => cluster(x, y, r, sd));
// Each cluster grows about its own middle; the whole tree about its foot.
const tBack = CLUSTERS.map(([x, y], i) => node(tTree, `<g transform="translate(${-x} ${-y})">${CL[i].back}</g>`));
const tFront = CLUSTERS.map(([x, y], i) => node(tTree, `<g transform="translate(${-x} ${-y})">${CL[i].front}</g>`));
const tFocus = node(tTree, `<g transform="translate(${-CLUSTERS[3][0]} ${-CLUSTERS[3][1]})"><g class="pc">${leafAt(FOCUS.x - 20, FOCUS.y + 18, 0, FOCUS.L, FOCUS.L * 0.5, LEAFG)}</g></g>`);
const grow = { k: 1, ...Object.fromEntries(CLUSTERS.map((_, i) => [`d${i}`, 1])) };
film.each(() => {
  const at = `translate(540 1195) scale(${grow.k.toFixed(4)}) translate(-540 -1195)`;
  tTrunk.setAttribute("transform", at);
  tXylem.setAttribute("transform", at);
  tBranches.setAttribute("transform", at);
  CLUSTERS.forEach(([x, y], i) => {
    const t = `translate(${n1(540 + (x - 540) * grow.k)} ${n1(1195 - (1195 - y) * grow.k)}) scale(${(grow.k * grow[`d${i}`]).toFixed(4)})`;
    tBack[i].setAttribute("transform", t);
    tFront[i].setAttribute("transform", t);
    if (i === 3) tFocus.setAttribute("transform", t);
  });
});
// The focus leaf in the set's coordinates, where the camera goes to land in a leaf (at grow.k = 1).
const FOCUS_AT = [FOCUS.x - 20 + FOCUS.L / 2, FOCUS.y + 18];
const FOCUS_Z = 900 / FOCUS.L; // the big leaf of s07 is 900 long
// The soil, cut open like a cross-section: two bands and a few pebbles, the roots lying on it.
const tSoil = node(tMain, piece("M-520 1205 L0 1200 C 280 1170, 700 1220, 1080 1190 L1600 1185 V2200 H-520 Z", INK) +
  flat("M-520 1470 C -200 1440, 160 1500, 480 1460 C 760 1425, 980 1480, 1600 1450 V2200 H-520 Z", SOIL_M) +
  flat("M-520 1700 C -100 1680, 300 1730, 640 1690 C 900 1660, 1200 1710, 1600 1690 V2200 H-520 Z", SOIL_D) +
  [[150, 1390, 26, 15], [840, 1360, 20, 12], [330, 1560, 30, 17], [700, 1600, 24, 14], [960, 1520, 28, 15], [80, 1640, 18, 11], [560, 1430, 14, 9]]
    .map(([x, y, rx, ry], i) => flat(ell(x, y, rx, ry), i % 2 ? mix(INK, CARD, 0.28) : mix(INK, CARD, 0.18))).join("") + fold(-100, 1300, 1200, 1340, 0.7));
const ROOTS = [
  [[[540, 1195], [510, 1240], [430, 1262], [330, 1272]], 26, 5],
  [[[540, 1195], [570, 1245], [670, 1255], [760, 1272]], 26, 5],
  [[[540, 1195], [535, 1240], [548, 1262], [522, 1282]], 22, 4],
  [[[455, 1250], [430, 1262], [410, 1270], [395, 1282]], 9, 3],
  [[[640, 1250], [665, 1262], [680, 1270], [700, 1282]], 9, 3],
];
const tRoots = node(tMain, ROOTS.map(([P, a, b]) => piece(taper(P, a, b), SUGAR)).join(""));
const tBushL = layer(T, 1.12, "");
node(tBushL, piece("M-60 1215 C -60 1150, -10 1120, 30 1140 C 50 1100, 120 1100, 140 1150 C 175 1145, 200 1180, 196 1214 Z", LEAF_D) + piece("M880 1200 C 880 1150, 930 1120, 975 1140 C 1000 1105, 1070 1102, 1090 1150 C 1130 1150, 1150 1180, 1150 1200 Z", LEAF));
// The foreground: a leafy sprig hanging into the top corner, grass at the bottom corners, nearest the lens.
const tFore = layer(T, 1.38, `<g class="up">${flat(taper([[-60, 150], [40, 120], [120, 70], [190, 20]], 18, 8), SUGAR_D)}${[[20, 150, 30], [70, 110, 60], [120, 76, -10], [150, 40, 40], [-10, 100, 80]].map(([x, y, a], i) => leafAt(x, y, a, 120, 44, i % 2 ? LEAFG_D : LEAFG)).join("")}</g>` +
  `<g class="up">${[0, 1, 2, 3, 4].map((i) => flat(taper([[-40 + i * 34, 1640], [-30 + i * 34, 1560], [-10 + i * 36, 1500], [10 + i * 40, 1440 + (i % 2) * 30]], 22, 3), i % 2 ? LEAFG_D : LEAFG)).join("")}${[0, 1, 2, 3].map((i) => flat(taper([[1120 - i * 34, 1640], [1110 - i * 34, 1560], [1092 - i * 36, 1500], [1070 - i * 40, 1450 + (i % 2) * 30]], 22, 3), i % 2 ? LEAFG : LEAFG_D)).join("")}</g>`);

// The dashed outline of the cutting the tree grew from, printed on the trunk's foot (s01).
const tCutting = node(tMain, `<path d="M540 1196 V1010 M540 1080 C 516 1060, 494 1046, 470 1046 C 486 1070, 512 1080, 540 1080 M540 1050 C 564 1030, 586 1016, 610 1016 C 594 1040, 568 1050, 540 1050" fill="none" stroke="${CREAM}" stroke-width="7" stroke-dasharray="16 11" stroke-linecap="round"/>`);
hidden(tCutting);

// s01b: a cream thread pinned along the soil's top edge, and its tag. The thread follows the edge's own curve.
const edgeT = (x) => {
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (bez(SOIL_EDGE, m)[0] < x) lo = m;
    else hi = m;
  }
  return lo;
};
const PIN_A = 172, PIN_B = 908;
const pinAt = (x) => bez(SOIL_EDGE, edgeT(x));
const threadPts = Array.from({ length: 41 }, (_, i) => bez(SOIL_EDGE, edgeT(PIN_A) + ((edgeT(PIN_B) - edgeT(PIN_A)) * i) / 40));
const threadD = `M${threadPts.map(([x, y]) => `${n1(x)} ${n1(y + 1)}`).join(" L")}`;
const tLevel = node(tMain, `<path d="${threadD}" fill="none" stroke="#3b2a1a" stroke-opacity="0.35" stroke-width="5" transform="translate(0 3)" pathLength="1" class="lvl"/><path d="${threadD}" fill="none" stroke="${CREAM}" stroke-width="4" stroke-linecap="round" pathLength="1" class="lvl"/>`);
const tPins = [PIN_A, PIN_B].map((x) => {
  const [px, py] = pinAt(x);
  return node(tMain, `<g class="pc"><circle cx="${n1(px)}" cy="${n1(py)}" r="13" fill="${SUN}"/><circle cx="${n1(px)}" cy="${n1(py)}" r="4.5" fill="${mix(SUN, INK, 0.45)}"/></g>`);
});
const tTagSoil = tag(tMain, 392, 1372, "tanah ≈ tetap", [300, pinAt(300)[1] + 2], { size: 50, sag: 10 });
hidden([tLevel, ...tPins, tTagSoil.g, tTagSoil.thread]);

// s06: what the tree is made from. CO₂ from the air towards the leaves; water by the roots and up the trunk.
const CO2_AT = [[150, 520], [190, 690], [870, 600]];
const tCO2 = CO2_AT.map(([x, y]) => mover(tMain, co2(24, false), x, y));
const tAirArrow = node(tMain, piece(arrowPath(120, 610, 255, 580, 26), INK, "pc"));
const tAirTag = tag(tMain, 330, 330, "udara (CO₂)", [165, 505], { size: 46, sag: 20 });
const tH2O = [[420, 1262], [655, 1268], [770, 1250]].map(([x, y]) => mover(tMain, h2o(22, false), x, y));
const tWaterArrow = node(tMain, piece(arrowPath(540, 1150, 540, 940, 30), CREAM, "pc", `stroke="${H_EDGE}" stroke-width="2"`));
const tWaterTag = tag(tMain, 690, 1135, "air (H₂O)", [760, 1232], { size: 46, sag: -20 });
hidden([...tCO2.map((m) => m.o), tAirArrow, tAirTag.g, tAirTag.thread, ...tH2O.map((m) => m.o), tWaterArrow, tWaterTag.g, tWaterTag.thread]);

// s08: under the soil's front layer, the deep soil with the whole root system and water at the root tips.
const tDeep = node(tMain, "");
tSoil.before(tDeep);
node(tDeep, flat("M-520 1205 L0 1200 C 280 1170, 700 1220, 1080 1190 L1600 1185 V2200 H-520 Z", SOIL_D) +
  flat("M-520 1520 C -200 1490, 160 1550, 480 1510 C 760 1475, 980 1530, 1600 1500 V2200 H-520 Z", mix(SOIL_D, "#000000", 0.15)));
const DEEP_ROOTS = [
  [[[540, 1195], [500, 1260], [380, 1330], [230, 1420]], 30, 6], [[[540, 1195], [590, 1265], [700, 1330], [850, 1430]], 30, 6],
  [[[540, 1195], [530, 1290], [560, 1380], [520, 1490]], 26, 5], [[[400, 1310], [350, 1350], [320, 1400], [300, 1460]], 12, 3],
  [[[690, 1320], [740, 1360], [770, 1410], [790, 1470]], 12, 3], [[[536, 1330], [480, 1380], [450, 1420], [430, 1470]], 10, 3],
  [[[300, 1390], [260, 1395], [220, 1405], [180, 1400]], 8, 2], [[[780, 1395], [820, 1395], [860, 1405], [900, 1395]], 8, 2],
];
node(tDeep, `<g class="pc">${DEEP_ROOTS.map(([P, a, b]) => flat(taper(P, a, b), SUGAR)).join("")}${
  // Root hairs: fine strips near the tips, where the water comes in (f5).
  [[230, 1420], [850, 1430], [520, 1490]].flatMap(([x, y]) => Array.from({ length: 7 }, (_, i) => { const a = (i / 6) * Math.PI - Math.PI / 2 + 0.2; return flat(taper([[x, y], [x + Math.cos(a) * 10, y + Math.sin(a) * 10 + 8], [x + Math.cos(a) * 20, y + Math.sin(a) * 18 + 10], [x + Math.cos(a) * 26, y + Math.sin(a) * 24 + 14]], 3.5, 1), SUGAR); })).join("")}</g>`);
// Water molecules: three at the root tips, one after another up the channel in the trunk. Drawn smaller than the
// channel they climb (a molecule is far smaller still: the picture is not to scale).
const WATER_PATHS = [
  [[230, 1440], [380, 1330], [500, 1260], [540, 1200], [540, 1050], [540, 880]],
  [[520, 1515], [545, 1380], [530, 1290], [540, 1200], [540, 1050], [540, 880]],
  [[850, 1450], [700, 1330], [590, 1265], [540, 1200], [540, 1050], [540, 880]],
];
const along = (P, p) => {
  const segs = P.slice(1).map((q, i) => Math.hypot(q[0] - P[i][0], q[1] - P[i][1])), total = segs.reduce((a, b) => a + b, 0);
  let d = Math.max(0, Math.min(1, p)) * total;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const k = segs[i] ? Math.min(1, d / segs[i]) : 0;
      return [P[i][0] + (P[i + 1][0] - P[i][0]) * k, P[i][1] + (P[i + 1][1] - P[i][1]) * k];
    }
    d -= segs[i];
  }
  return P.at(-1);
};
const tWaterUp = node(tMain, "");
const tClimb = WATER_PATHS.map((P) => ({ P, p: { v: 0 }, m: mover(tWaterUp, h2o(10, false), P[0][0], P[0][1]) }));
film.each(() => {
  for (const c of tClimb) [c.m.st.x, c.m.st.y] = along(c.P, c.p.v);
});
const tBark = node(tTree, piece("M514 1236 L517 1000 L520 860 L560 860 L563 1000 L566 1236 Z", SUGAR_D));
hidden([tDeep, tBark, ...tClimb.map((c) => c.m.o)]);
const tRootTag = tag(tMain, 300, 1385, "akar", [345, 1350], { size: 46, sag: 6 });
const tClimbTag = tag(tMain, 672, 1092, "air (H₂O)", null, { size: 46, sag: 20, follow: () => [tClimb[0].m.st.x + 14, tClimb[0].m.st.y] });
hidden([tRootTag.g, tRootTag.thread, tClimbTag.g, tClimbTag.thread]);

// s11: someone standing under the canopy's edge, breathing in what the leaves let out.
const tPerson = puppet(tMain, { coat: mix(INK, LEAF, 0.35) });
Object.assign(tPerson.st, { x: 975, y: 1192, k: 0.72, face: -1, a1: 84, a2: 8 });
hidden(tPerson.o);
const tO2 = [0, 1, 2, 3].map(() => mover(tMain, o2(20, false), 0, 0));
const tSingle = [mover(tMain, oAtom(0, 0, 20, false), 600, 540), mover(tMain, oAtom(0, 0, 20, false), 700, 600)];
hidden([...tO2.map((m) => m.o), ...tSingle.map((m) => m.o)]);
const tO2Tag = tag(tMain, 830, 330, "O₂ (oksigen)", null, { size: 50, sag: 30, follow: () => [tO2[0].st.x, tO2[0].st.y - 20] });
hidden([tO2Tag.g, tO2Tag.thread]);

// s13: the sugar sent all over the plant: beads along the branches, down the trunk, out to the roots and up.
const SUGAR_RUNS = [
  [[352, 628], [430, 720], [500, 800], [538, 900], [538, 1100], [470, 1240], [400, 1262]],
  [[736, 622], [660, 700], [590, 790], [545, 950], [545, 1150], [610, 1240], [690, 1258]],
  [[545, 470], [545, 420], [546, 360]],
  [[402, 488], [425, 580], [470, 690], [528, 760], [535, 1000], [538, 1190], [528, 1270]],
  [[690, 478], [672, 545], [612, 640], [556, 730], [542, 860], [540, 1000]],
];
const tSugar = SUGAR_RUNS.map((P) => ({ P, p: { v: 0 }, m: mover(tMain, sugar(22), P[0][0], P[0][1]) }));
film.each(() => {
  for (const c of tSugar) [c.m.st.x, c.m.st.y] = along(c.P, c.p.v);
});
hidden(tSugar.map((c) => c.m.o));
const tFoodTag = tag(tMain, 770, 300, "makanan", null, { size: 54, sag: 20, follow: () => [tSugar[2].m.st.x + 14, tSugar[2].m.st.y - 14] });
hidden([tFoodTag.g, tFoodTag.thread]);

// ═══ The question, on a sheet of cream paper laid over the tree (s02) ═══════════════════════════════════════════
const ASK = document.getElementById("sheetAsk");
const askSvg = ASK.querySelector("svg");
node(askSvg, fold(-20, 1500, 1100, 1430, 1.2) + fold(760, -20, 700, 1940, 0.8));
const askStrip = (() => {
  const l1 = printed(540, 520, "Bahannya", 124);
  const a = printed(0, 0, "dari ", 124), b = printed(0, 0, "mana?", 124);
  const total = a.width + b.width, x0 = 540 - total / 2;
  const L2a = printed(x0, 666, "dari ", 124, { anchor: "start" }), L2b = printed(x0 + a.width, 666, "mana?", 124, { anchor: "start" });
  const w = Math.max(l1.width, total) + 130;
  return node(askSvg, `<g class="tg"><path d="M${540 - w / 2} 408 L${540 + w / 2 - 6} 404 L${540 + w / 2} 710 L${540 - w / 2 + 4} 714 Z" fill="${CREAM}"/>${l1.markup}${L2a.markup}</g>
    <g class="tg"><rect x="${n1(x0 + a.width - 18)}" y="572" width="${n1(b.width + 36)}" height="128" fill="${SUGAR}" transform="rotate(2.5 ${n1(x0 + a.width + b.width / 2)} 636)"/>${L2b.markup}</g>`);
})();
// A small copy of the tree in a block of soil: is it made of the soil? The question mark stands beside it.
const askSoil = node(askSvg, piece("M150 1150 C 260 1136, 520 1160, 640 1146 L646 1286 L146 1290 Z", INK) + `<g class="pc">${ROOTS.map(([P, a, b]) => flat(taper(P.map(([x, y]) => [395 + (x - 540) * 0.46, 1150 + (y - 1195) * 0.46]), a * 0.5, b * 0.5), SUGAR)).join("")}</g>`);
const askTree = node(askSvg, treeMarkup(395, 1150, 0.46));
const askMark = node(askSvg, piece("M642 1000 q0 -132 132 -132 q132 0 132 120 q0 96 -106 120 v62 h-56 v-112 q104 -12 104 -76 q0 -64 -74 -64 q-76 0 -76 82 Z M744 1206 h56 v56 h-56 Z", INK, "up"));
const askTag = tag(askSvg, 330, 1250, "tanah?", [300, 1186], { size: 52, sag: -40 });
hidden([askSoil, askTree, askMark, askTag.g, askTag.thread]);

// ═══ Helmont's pot (s03, s03b) and his balance (s04, s05) ══════════════════════════════════════════════════════
const P = makeSet("setPot");
const pBackL = layer(P, 0.6, "");
const pFar = node(pBackL, piece("M-400 930 C -150 880, 160 870, 400 900 C 650 930, 900 860, 1600 900 V1300 H-400 Z", HILL_FAR));
const pHill = node(pBackL, piece("M-400 1000 C -100 950, 200 930, 480 985 C 700 1030, 900 950, 1200 960 C 1350 965, 1450 990, 1600 1000 V1300 H-400 Z", HILL) + fold(-100, 1100, 1300, 1060, 0.8));
hidden([pHill, pFar]);
const pMain = layer(P, 1, "");
const pGround = node(pMain, piece("M-400 1258 C 0 1244, 400 1262, 800 1250 C 1100 1242, 1400 1255, 1600 1250 V2300 H-400 Z", mix(LEAF, CARD, 0.12)) + flat("M-400 1520 C 0 1500, 500 1540, 900 1510 C 1200 1495, 1450 1520, 1600 1510 V2300 H-400 Z", LEAF) + fold(-200, 1400, 1400, 1380, 0.8));
// The willow in its sizes: the cutting (5 lb, 2,3 kg) and a step for each year; its roots under the soil line, so it
// comes out of the pot with them.
const WILLOWS = [[170, 42], [250, 80], [330, 115], [400, 150], [460, 180], [520, 205]];
const pWillowM = mover(pMain, "", 620, 880);
const pWillows = WILLOWS.map(([h, sp], i) => {
  const w = willow(h, sp, 30 + i, { rootsToo: true });
  const g = node(pWillowM.i, `<g class="pc">${w.roots}</g><g class="pc">${w.markup}</g>`);
  return { g };
});
pWillows.forEach((w, i) => i && hidden(w.g));
// The pot, cut away: an earthen pot (its walls the soil's teal made lighter), the dry soil inside crumbly, in pieces.
const POT_AT = [620, 860];
const pPotM = mover(pMain, "", ...POT_AT);
{
  const R = rng(91);
  let crumbs = "";
  for (let i = 0; i < 150; i++) {
    const y = 30 + R() * 340, half = 206 - (y / 370) * 46 - 14, x = (R() * 2 - 1) * half, r = 9 + R() * 15;
    const pts = Array.from({ length: 6 }, (_, k) => { const a = (k / 6) * Math.PI * 2 + R() * 0.6, rr = r * (0.7 + R() * 0.45); return [x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8]; });
    crumbs += flat(`M${pts.map(([a, b]) => `${n1(a)} ${n1(b)}`).join(" L")} Z`, [INK, SOIL_M, mix(INK, CARD, 0.16), SOIL_D][i % 4]);
  }
  node(pPotM.i, piece("M-230 0 H230 L180 392 H-180 Z", POT) + `<clipPath id="potIn"><path d="M-206 10 H206 L162 370 H-162 Z"/></clipPath>` +
    flat("M-206 10 H206 L162 370 H-162 Z", SOIL_D) + `<g clip-path="url(#potIn)">${crumbs}</g>` +
    flat("M-206 12 C -150 2, -90 16, -30 6 C 30 -2, 100 14, 206 6 V24 H-206 Z", INK) + piece("M-254 -46 H254 V12 H-254 Z", POT_L) + fold(-60, 40, -110, 380, 0.7));
}
// Its lid: a tinned iron plate pierced with many holes, against the dust (f1); the stem goes through one of them.
const pLid = mover(pMain, piece("M-250 -16 H250 V2 H-250 Z", INK_L) + Array.from({ length: 13 }, (_, i) => `<circle cx="${-216 + i * 36}" cy="-7" r="4.5" fill="${SOIL_D}"/>`).join(""), POT_AT[0], POT_AT[1] - 46);
hidden(pLid.o);
// Helmont on split pins, with a ruff collar.
const pMan = puppet(pMain, { ruff: true });
Object.assign(pMan.st, { x: 270, y: 1252, k: 1, face: 1 });
pWillowM.st.grip = 96;
pMan.st.reach = () => [pWillowM.st.x - 10, pWillowM.st.y - pWillowM.st.grip];
pMan.st.hold = 1;
const pTagSoil = tag(pMain, 620, 1110, "tanah 91 kg", [395, 842], { size: 56, sag: 40, stamped: true });
const pTagTree = tag(pMain, 720, 530, "pohon 2,3 kg", null, { size: 52, sag: 30, stamped: true, follow: () => [pWillowM.st.x + 6, pWillowM.st.y - 150 * pWillowM.st.s] });
const pStrip = strip(pMain, 540, 330, "Van Helmont · abad ke-17", 58);
hidden([pTagSoil.g, pTagSoil.thread, pTagTree.g, pTagTree.thread, pStrip]);
// s03b, outside: rain from a cloud, the years on a calendar. (Placed for the camera of s03b.)
const CAM3B = aim(620, 960, 0.97);
const at3b = (x, y) => toSet(CAM3B, x, y);
const [cloudX, cloudY] = at3b(380, 470);
const pCloud = mover(pMain, piece(`M-150 40 C -190 40, -200 -20, -150 -30 C -150 -90, -70 -110, -40 -70 C -20 -130, 90 -130, 100 -60 C 150 -80, 200 -40, 170 10 C 200 30, 180 50, 150 50 Z`, CREAM, "up", `stroke="${H_EDGE}" stroke-width="2.5"`) + fold(-120, 0, 140, 20, 1.2), cloudX, cloudY);
const pRain = Array.from({ length: 7 }, () => mover(pMain, piece("M0 -26 C 9 -8, 13 4, 0 16 C -13 4, -9 -8, 0 -26 Z", CREAM, "pc", `stroke="${H_EDGE}" stroke-width="2.5"`), 0, 0));
const rain = { on: 0 };
film.each((t) => {
  pRain.forEach((m, i) => {
    const x = cloudX - 100 + i * 32, top = cloudY + 70, fall = at3b(0, 875)[1] - top;
    const ph = (((t * 1.6 + i * 0.37) % 1) + 1) % 1;
    m.st.x = x + (i % 2) * 8;
    m.st.y = top + ph * fall;
    m.o.style.visibility = rain.on > 0.5 ? "visible" : "hidden";
  });
});
const pRainTag = tag(pMain, ...at3b(390, 300), "cuma disiram air hujan", [cloudX - 60, cloudY - 70], { size: 50, sag: 10 });
const [calX, calY] = at3b(842, 470);
const pCal = node(pMain, "");
node(pCal, piece(rrect(calX - 88, calY - 118, 176, 236, 6), CREAM, "up", `stroke="${H_EDGE}" stroke-width="2"`));
const pCalSheets = [1, 2, 3, 4, 5].map((n) => node(pCal, `<g>${flat(rrect(calX - 82, calY - 92, 164, 204, 5), CREAM)}${printed(calX, calY - 34, "tahun", 40).markup}${printed(calX, calY + 92, String(n), 118, { weight: 700 }).markup}</g>`));
node(pCal, flat(rrect(calX - 92, calY - 122, 184, 30, 6), INK) + `<circle cx="${calX - 46}" cy="${calY - 107}" r="7" fill="${CARD}"/><circle cx="${calX + 46}" cy="${calY - 107}" r="7" fill="${CARD}"/>`);
pCalSheets.forEach((sh) => pCal.insertBefore(sh, pCal.children[1]));
hidden([pCloud.o, pRainTag.g, pRainTag.thread, pCal]);
// The foreground: grass at the bottom corners, nearest the lens.
layer(P, 1.3, `<g class="up">${[0, 1, 2, 3, 4].map((i) => flat(taper([[-40 + i * 34, 1700], [-30 + i * 34, 1600], [-10 + i * 36, 1530], [10 + i * 40, 1460 + (i % 2) * 30]], 22, 3), i % 2 ? LEAFG_D : LEAFG)).join("")}${[0, 1, 2, 3].map((i) => flat(taper([[1120 - i * 34, 1700], [1110 - i * 34, 1600], [1092 - i * 36, 1530], [1070 - i * 40, 1470 + (i % 2) * 30]], 22, 3), i % 2 ? LEAFG : LEAFG_D)).join("")}</g>`);

// The balance: an equal-arm beam on a post, two pans hung on chains; a 17th-century weighing, not a dial scale.
// The beam high and the chains long enough that the grown willow, on its pan, stands under the beam.
const BAL = { x: 540, y: 400, arm: 290, hang: 700 };
const bal = { a: 0, lift: 0 };
const pBal = node(pMain, "");
pMain.insertBefore(pBal, pWillowM.o);
const pBalPost = node(pBal, piece("M470 1258 L486 1206 H594 L610 1258 Z", INK_L) + piece(`M528 1210 L532 ${BAL.y + 10} H548 L552 1210 Z`, INK_L) + fold(536, 1200, 540, BAL.y + 30, 0.8));
const pBeam = node(pBal, `<g class="pc">${flat(`M${BAL.x - BAL.arm - 24} ${BAL.y - 10} H${BAL.x + BAL.arm + 24} V${BAL.y + 10} H${BAL.x - BAL.arm - 24} Z`, INK)}${flat(`M${BAL.x - 7} ${BAL.y} L${BAL.x} ${BAL.y - 96} L${BAL.x + 7} ${BAL.y} Z`, INK)}<circle cx="${BAL.x}" cy="${BAL.y}" r="18" fill="${INK_L}"/><circle cx="${BAL.x}" cy="${BAL.y}" r="7" fill="${SUN}"/></g>`);
const pChains = node(pBal, `<path class="ch" d="" fill="none" stroke="${INK}" stroke-width="3.5" stroke-dasharray="7 5"/><path class="ch" d="" fill="none" stroke="${INK}" stroke-width="3.5" stroke-dasharray="7 5"/>`);
const PAN = (cx) => piece(`M${cx - 150} 0 H${cx + 150} C ${cx + 130} 44, ${cx - 130} 44, ${cx - 150} 0 Z`, INK_L) + flat(`M${cx - 150} -6 H${cx + 150} V4 H${cx - 150} Z`, INK);
const pPanL = mover(pBal, PAN(0), 0, 0), pPanR = mover(pBal, PAN(0), 0, 0);
const hangPt = (side) => {
  const a = (bal.a * Math.PI) / 180;
  return [BAL.x + side * BAL.arm * Math.cos(a), BAL.y + side * BAL.arm * Math.sin(a)];
};
const panAt = (side) => { const [x, y] = hangPt(side); return [x, y + BAL.hang - bal.lift]; };
film.each(() => {
  pBeam.setAttribute("transform", `rotate(${bal.a.toFixed(2)} ${BAL.x} ${BAL.y})`);
  const paths = pChains.querySelectorAll(".ch");
  [-1, 1].forEach((side, k) => {
    const [hx, hy] = hangPt(side), [px, py] = panAt(side);
    paths[k].setAttribute("d", `M${n1(hx)} ${n1(hy)} L${n1(px - 146)} ${n1(py)} M${n1(hx)} ${n1(hy)} L${n1(px + 146)} ${n1(py)}`);
    const m = side < 0 ? pPanL : pPanR;
    [m.st.x, m.st.y] = [px, py];
  });
});
// Weights for the right pan: cut from cream card with teal edges, plain (no false numbers on them).
const weight = (w, h) => piece(`M${-w / 2} 0 L${-w / 2 + 6} ${-h} H${w / 2 - 6} L${w / 2} 0 Z`, CREAM, "pc", `stroke="${H_EDGE}" stroke-width="3"`) + flat(`M${-w / 2 + 14} ${-h - 10} H${w / 2 - 14} V${-h} H${-w / 2 + 14} Z`, INK_L);
const pW = [[0, 0, 200, 70], [0, -82, 170, 60], [0, -154, 140, 52]].map(([dx, dy, w, h]) => ({ dx, dy, m: mover(pBal, weight(w, h), 0, 0) }));
const pTiny = { dx: 44, dy: -246, m: mover(pBal, weight(30, 18), 0, 0), off: { v: 0 }, to: [690, 650] };
const pW2 = [[0, 0, 220, 80], [0, -92, 190, 70], [0, -174, 160, 60]].map(([dx, dy, w, h]) => ({ dx, dy, m: mover(pBal, weight(w, h), 0, 0) }));
const onPan = { w: 0, w2: 0 };
film.each(() => {
  const [px, py] = panAt(1);
  pW.forEach((w) => { if (w.free !== true) [w.m.st.x, w.m.st.y] = [px + w.dx, py + w.dy - 4 + w.m.st.fall]; });
  pW2.forEach((w) => { [w.m.st.x, w.m.st.y] = [px + w.dx, py + w.dy - 4 + w.m.st.fall]; });
  const k = pTiny.off.v, x0 = px + pTiny.dx, y0 = py + pTiny.dy - 4 + pTiny.m.st.fall;
  [pTiny.m.st.x, pTiny.m.st.y] = [x0 + (pTiny.to[0] - x0) * k, y0 + (pTiny.to[1] - y0) * k - Math.sin(Math.PI * Math.min(1, k)) * 90];
});
[...pW, ...pW2, pTiny].forEach((w) => (w.m.st.fall = 0));
// The willow or the pot rides on the left pan once it is set down.
const ride = { willow: 0, pot: 0 };
film.each(() => {
  const [px, py] = panAt(-1);
  if (ride.willow > 0.5) [pWillowM.st.x, pWillowM.st.y] = [px + 10, py - 50];
  if (ride.pot > 0.5) { [pPotM.st.x, pPotM.st.y] = [px + 20, py - 392 * pPotM.st.s]; [pLid.st.x, pLid.st.y] = [px + 20, py - (392 + 46) * pPotM.st.s]; }
});
const pStamp = stampTag(pMain, 560, 820, "+74 kg", { size: 78 });
const pStampThread = node(pMain, `<path class="thread" d="M${BAL.x} ${BAL.y + 20} L${pStamp.hole[0]} ${n1(pStamp.hole[1])}" pathLength="1"/>`);
pMain.insertBefore(pStampThread, pStamp.g);
const pTagW2 = tag(pMain, 662, 990, "dulu 91 kg", [760, 960], { size: 46, sag: 6, stamped: true });
const pTagTiny = tag(pMain, 676, 566, "−57 g", null, { size: 64, sag: 20, stamped: true, follow: () => [pTiny.m.st.x, pTiny.m.st.y - 18] });
const pShare = tag(pMain, 650, 800, "< 0,1 %", [690, 664], { size: 50, sag: 6, stamped: true });
hidden([pBal, ...pW.map((w) => w.m.o), ...pW2.map((w) => w.m.o), pTiny.m.o, pStamp.g, pStampThread, pTagW2.g, pTagW2.thread, pTagTiny.g, pTagTiny.thread, pShare.g, pShare.thread]);

// ═══ The leaf (s07): turned over to its underside, where the pores are ═════════════════════════════════════════
const Lf = makeSet("setLeaf");
const lfBack = layer(Lf, 0.5, `<g class="pc">${[[120, 300, 330, 150, -28, HILL_FAR], [980, 420, 300, 130, 24, LEAFG_PP], [60, 1260, 300, 140, 20, LEAFG_PP], [1010, 1190, 320, 150, -18, HILL_FAR], [560, 150, 260, 110, 8, LEAFG_PP]]
  .map(([x, y, a, b, r, c]) => `<g transform="translate(${x} ${y}) rotate(${r})">${flat(`M${-a} 0 C ${-a * 0.7} ${-b * 1.2}, ${a * 0.5} ${-b * 1.3}, ${a} 0 C ${a * 0.5} ${b * 1.3}, ${-a * 0.7} ${b * 1.2}, ${-a} 0 Z`, c)}${flat(taper([[-a, 0], [-a / 3, -4], [a / 3, -2], [a * 0.95, 0]], 8, 3), mix(c, LEAFG, 0.3))}</g>`).join("")}</g>`);
const lfMain = layer(Lf, 1, "");
const LEAF_SHAPE = "M-450 0 C -330 -300, 230 -372, 450 0 C 230 372, -330 300, -450 0 Z";
const lfStalk = node(lfMain, piece(taper([[-600, 70], [-560, 50], [-500, 20], [-440, 0]], 14, 22), LEAFG_D));
const lfTop = node(lfMain, "");
const lfBot = node(lfMain, "");
const veins = (c, w) => {
  let v = flat(taper([[-440, 0], [-150, -4], [150, -2], [430, 0]], 16 * w, 4 * w), c);
  for (let i = 0; i < 6; i++) {
    const x = -320 + i * 125, k = 1 - Math.abs(x) / 520;
    for (const sd of [-1, 1]) v += flat(taper([[x, 0], [x + 55, sd * 84 * k], [x + 110, sd * 168 * k], [x + 150, sd * 228 * k]], 9 * w, 2), c);
  }
  return v;
};
node(lfTop, `<g class="pc">${flat(LEAF_SHAPE, LEAFG)}${veins(LEAFG_D, 1)}</g>`);
// The underside: paler, the veins raised, and the pores (stomata) scattered over it between the veins.
const PORES = [];
{
  const R = rng(77);
  for (let i = 0; i < 600 && PORES.length < 44; i++) {
    const x = -400 + R() * 800, y = (R() - 0.5) * 560, edge = 300 * Math.sin(Math.PI * ((x + 450) / 900)) * 0.92;
    if (Math.abs(y) > edge - 26 || Math.abs(y) < 22) continue;
    if (PORES.some(([a, b]) => Math.hypot(a - x, b - y) < 64)) continue;
    PORES.push([x, y, (R() - 0.5) * 50]);
  }
}
// A pore as the leaf shows it: two guard cells round a slit, about 40 px across here (the CO₂ is drawn smaller).
const poreMark = (x, y, a, k = 1.5) => `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(a)}) scale(${k})">${flat("M0 -13 C -16 -13, -16 13, 0 13 C -6 6, -6 -6, 0 -13 Z", LEAFG_D)}${flat("M0 -13 C 16 -13, 16 13, 0 13 C 6 6, 6 -6, 0 -13 Z", LEAFG_D)}<path d="M0 -9 C -3 -3, -3 3, 0 9 C 3 3, 3 -3, 0 -9 Z" fill="${SOIL_D}"/></g>`;
const LPORE = PORES.reduce((best, p) => (Math.hypot(p[0] - 60, p[1] - 60) < Math.hypot(best[0] - 60, best[1] - 60) ? p : best), PORES[0]);
node(lfBot, `<g class="pc">${flat(LEAF_SHAPE, LEAFG_P)}${veins(mix(LEAFG_P, LEAFG, 0.45), 1.1)}${PORES.map(([x, y, a]) => poreMark(x, y, a)).join("")}</g>`);
const LEAF_AT = [545, 790], LEAF_ROT = -4;
lfStalk.setAttribute("transform", `translate(${LEAF_AT[0]} ${LEAF_AT[1]}) rotate(${LEAF_ROT})`);
const flip = { f: 0 };
film.each(() => {
  const c = Math.cos(Math.PI * flip.f);
  lfTop.setAttribute("transform", `translate(${LEAF_AT[0]} ${LEAF_AT[1]}) rotate(${LEAF_ROT}) scale(1 ${Math.max(0.001, c).toFixed(4)})`);
  lfBot.setAttribute("transform", `translate(${LEAF_AT[0]} ${LEAF_AT[1]}) rotate(${LEAF_ROT}) scale(1 ${Math.max(0.001, -c).toFixed(4)})`);
  lfTop.style.visibility = c > 0 ? "visible" : "hidden";
  lfBot.style.visibility = c < 0 ? "visible" : "hidden";
});
const leafPt = ([x, y]) => {
  const a = (LEAF_ROT * Math.PI) / 180;
  return [LEAF_AT[0] + x * Math.cos(a) - y * Math.sin(a), LEAF_AT[1] + x * Math.sin(a) + y * Math.cos(a)];
};
const LPORE_AT = leafPt(LPORE);
// Carbon dioxide drifting up to the underside: drawn small, smaller than the pores it goes into.
const lfCO2 = [[260, 1300, LPORE_AT[0] - 6, LPORE_AT[1] + 4], [760, 1320, ...leafPt(PORES[5])]].map(([x, y]) => mover(lfMain, co2(6, false), x, y));
const lfTag = tag(lfMain, 860, 1200, "CO₂", null, { size: 54, sag: -30, follow: () => [lfCO2[1].st.x + 10, lfCO2[1].st.y] });
const lfPoreTag = tag(lfMain, 340, 470, "pori daun", [LPORE_AT[0] - 4, LPORE_AT[1] - 14], { size: 50, sag: 10 });
hidden([...lfCO2.map((m) => m.o), lfTag.g, lfTag.thread, lfPoreTag.g, lfPoreTag.thread]);
layer(Lf, 1.4, `<g class="up">${leafAt(-60, 1700, -40, 300, 110, LEAFG_D)}${leafAt(1140, 140, 150, 280, 100, LEAFG)}</g>`);

// ═══ One pore up close (s07): two guard cells round a slit; the CO₂ slips through it into the leaf ═══════════════
const Pr = makeSet("setPore");
const prBack = layer(Pr, 0.85, "");
{
  const R = rng(5);
  let cells = "";
  // Far past every edge: the set arrives at a third of its size (the push onto the pore carries on into it).
  for (let r = -4; r < 14; r++) for (let c = -3; c < 9; c++) {
    const cx = c * 210 + (r % 2) * 105 - 60 + (R() - 0.5) * 40, cy = r * 230 + 60 + (R() - 0.5) * 40;
    const pts = Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * Math.PI * 2 + R() * 0.4, rr = 118 + R() * 22; return [cx + Math.cos(a) * rr * 1.05, cy + Math.sin(a) * rr]; });
    cells += flat(`M${pts.map(([x, y]) => `${n1(x)} ${n1(y)}`).join(" L")} Z`, (r + c) % 3 ? LEAFG_PP : mix(LEAFG_PP, LEAFG, 0.12));
  }
  node(prBack, `<rect x="-900" y="-1100" width="2880" height="4400" fill="${mix(LEAFG_P, LEAFG, 0.25)}"/><g class="pc">${cells}</g>`);
}
const prMain = layer(Pr, 1, "");
const SLIT = "M540 640 C 505 720, 505 920, 540 1000 C 575 920, 575 720, 540 640 Z";
node(prMain, `<defs><clipPath id="slitClip"><path d="${SLIT}"/></clipPath></defs>`);
node(prMain, piece("M540 600 C 470 700, 470 940, 540 1040 C 610 940, 610 700, 540 600 Z", SOIL_D));
const prGuardL = mover(prMain, `<g class="up">${flat("M0 -230 C -250 -230, -250 230, 0 230 C -60 130, -60 -130, 0 -230 Z", LEAFG)}${[[-120, -120], [-160, 0], [-120, 120], [-90, -40], [-95, 55]].map(([x, y]) => flat(ell(x, y, 26, 17), LEAFG_D)).join("")}</g>`, 540, 820);
const prGuardR = mover(prMain, `<g class="up">${flat("M0 -230 C 250 -230, 250 230, 0 230 C 60 130, 60 -130, 0 -230 Z", LEAFG)}${[[120, -120], [160, 0], [120, 120], [90, -40], [95, 55]].map(([x, y]) => flat(ell(x, y, 26, 17), LEAFG_D)).join("")}</g>`, 540, 820);
const prIn = node(prMain, "");
const prCO2 = mover(prMain, co2(30), 860, 470);
const prSink = node(prIn, `<g clip-path="url(#slitClip)"></g>`).firstElementChild;
const prTag = tag(prMain, 410, 1190, "pori daun (stomata)", [430, 1010], { size: 58, sag: -40 });
const prTagC = tag(prMain, 820, 300, "CO₂", null, { size: 58, sag: 20, follow: () => [prCO2.st.x, prCO2.st.y - 34] });
hidden([prTag.g, prTag.thread, prTagC.g, prTagC.thread, prCO2.o]);
// Nearer the lens: two hairs of the leaf's underside across the left corners, sliding by faster than the pore.
const prFore = layer(Pr, 1.3, `<g class="up">${flat(taper([[-80, 2000], [40, 1830], [140, 1690], [230, 1560]], 34, 10), LEAFG_L)}${flat(taper([[-80, 60], [20, 120], [110, 190], [190, 250]], 26, 8), LEAFG_L)}</g>`);
hidden(prFore.firstElementChild);

// ═══ Inside the leaf (s09): a cross-section, cut like a page of a pop-up book ══════════════════════════════════
// Top to bottom, as a leaf is built: the waxy cuticle, the upper skin (epidermis) as a row of flat clear cells, the
// tall palisade cells packed with chloroplasts, the spongy cells with air spaces between them, a vein (its xylem for
// water, its phloem for sugar, inside a sheath of cells), the lower skin with a pore (stoma) opening into an air space.
const Ce = makeSet("setCells");
const ceBack = layer(Ce, 0.9, `<rect x="-200" y="380" width="1480" height="860" fill="${mix(CARD, LEAFG, 0.14)}"/>`);
const ceMain = layer(Ce, 1, "");
{
  const R = rng(41);
  let m = "";
  // Cuticle and upper epidermis.
  m += flat("M-200 392 H1280 V408 H-200 Z", mix(CARD, SUN, 0.25));
  for (let i = 0; i < 12; i++) m += flat(rrect(-160 + i * 112, 410, 106, 50, 12), CREAM, `stroke="${H_EDGE}" stroke-width="2"`);
  // Palisade: tall cells, chloroplasts along their walls.
  for (let i = 0; i < 8; i++) {
    const x = -46 + i * 146;
    m += flat(rrect(x, 466, 132, 396, 40), CREAM, `stroke="${H_EDGE}" stroke-width="2"`);
    for (let j = 0; j < 8; j++) m += flat(ell(x + (j % 2 ? 106 : 26), 500 + j * 46, 17, 13), j % 3 ? LEAFG : LEAFG_D);
    m += flat(ell(x + 66, 640 + (i % 3) * 40, 22, 18), mix(CREAM, INK, 0.12)); // its nucleus
  }
  // Spongy cells round air spaces, and the vein among them.
  const SP = [[40, 930, 80, 52], [210, 960, 70, 58], [370, 920, 64, 50], [110, 1080, 76, 56], [300, 1090, 66, 48], [900, 940, 72, 54], [1040, 1000, 70, 58], [880, 1090, 74, 52], [-40, 1040, 60, 50], [470, 1080, 50, 40]];
  for (const [x, y, rx, ry] of SP) {
    m += flat(ell(x, y, rx, ry), CREAM, `stroke="${H_EDGE}" stroke-width="2"`);
    m += flat(ell(x - rx * 0.4, y - ry * 0.2, 14, 11), LEAFG) + flat(ell(x + rx * 0.35, y + ry * 0.3, 14, 11), LEAFG_D);
  }
  // The vein: a ring of sheath cells, xylem above (water: cream channels with thick walls), phloem below (sugar).
  const VX = 660, VY = 1010;
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; m += flat(circ(VX + Math.cos(a) * 118, VY + Math.sin(a) * 96, 30), CREAM, `stroke="${H_EDGE}" stroke-width="2"`); }
  m += flat(ell(VX, VY, 104, 82), mix(CARD, LEAFG, 0.2));
  for (const [dx, dy, r] of [[-46, -30, 24], [0, -44, 28], [46, -30, 24], [-20, 6, 18], [24, 6, 18]]) m += flat(circ(VX + dx, VY + dy, r + 6), INK_L) + flat(circ(VX + dx, VY + dy, r), CREAM);
  for (let i = 0; i < 7; i++) m += flat(circ(VX - 54 + i * 18, VY + 42 + (i % 2) * 10, 10), SUGAR_L, `stroke="${SUGAR_D}" stroke-width="1.5"`);
  // Lower epidermis with a stoma opening into an air space; cuticle under it.
  for (let i = 0; i < 12; i++) if (i !== 4) m += flat(rrect(-160 + i * 112, 1166, 106, 44, 12), CREAM, `stroke="${H_EDGE}" stroke-width="2"`);
  m += flat("M296 1166 C 270 1166, 262 1210, 300 1212 C 318 1200, 318 1178, 300 1166 Z", LEAFG) + flat("M352 1166 C 378 1166, 386 1210, 348 1212 C 330 1200, 330 1178, 352 1166 Z", LEAFG);
  m += flat("M-200 1212 H1280 V1224 H-200 Z", mix(CARD, SUN, 0.25));
  node(ceMain, `<g class="pc">${m}</g>`);
}
// The cut, as the camera sees it before the leaf is opened: the leaf's surface, a green flap over the whole section.
const ceFlap = node(ceMain, `<g class="up">${flat("M-200 300 H1280 V1300 H-200 Z", LEAFG)}${flat(taper([[-200, 800], [300, 790], [700, 800], [1280, 790]], 22, 12), LEAFG_D)}${[-100, 150, 400, 650, 900].map((x) => flat(taper([[x, 800], [x + 60, 700], [x + 120, 600], [x + 190, 480]], 10, 4), LEAFG_D) + flat(taper([[x, 800], [x + 60, 900], [x + 120, 1000], [x + 190, 1120]], 10, 4), LEAFG_D)).join("")}</g>`);
// Sunlight: strips of yellow paper slanting in from the top right onto the palisade.
const ceBeams = [[1180, 90, 760, 560], [1180, 250, 900, 600], [1080, -40, 470, 560]].map(([x0, y0, x1, y1]) => {
  const a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2, w = 50, dx = (Math.cos(a) * w) / 2, dy = (Math.sin(a) * w) / 2;
  return node(ceMain, piece(`M${n1(x0 - dx)} ${n1(y0 - dy)} L${n1(x1 - dx)} ${n1(y1 - dy)} L${n1(x1 + dx)} ${n1(y1 + dy)} L${n1(x0 + dx)} ${n1(y0 + dy)} Z`, SUN, "up", `opacity="0.95"`));
});
const CHL_FOCUS = [-46 + 4 * 146 + 26, 500 + 2 * 46]; // a chloroplast of the fifth palisade cell
const ceTag = tag(ceMain, 250, 382, "kloroplas", [-46 + 146 + 106, 500 + 46], { size: 56, sag: 20 });
const ceTag2 = tag(ceMain, 680, 382, "klorofil = zat hijau", [-46 + 3 * 146 + 26, 500 + 4 * 46], { size: 50, sag: 30 });
hidden([...ceBeams, ceTag.g, ceTag.thread, ceTag2.g, ceTag2.thread]);
// The foreground: the leaf's lifted surface, rolled back at the top corner, nearest the lens.
const ceFore = layer(Ce, 1.3, `<g class="up">${flat("M-40 -40 H420 C 360 60, 260 160, 120 230 C 60 250, -10 250, -40 240 Z", LEAFG_D)}${flat("M-40 200 C 60 190, 180 150, 300 60", "none", `stroke="${LEAFG}" stroke-width="10"`)}</g>`);
hidden([ceFore.firstElementChild, ceFlap]);

// ═══ Inside a chloroplast (s10, s12): its double envelope, the fluid (stroma), the coin stacks (grana) of
// thylakoids where the chlorophyll is, joined by thin sheets (lamellae) ═══════════════════════════════════════
const Ch = makeSet("setChloro");
const chMain = layer(Ch, 1, "");
const CHL = { x: 540, y: 820, rx: 600, ry: 420 };
node(chMain, piece(ell(CHL.x, CHL.y, CHL.rx, CHL.ry), LEAFG_D) + flat(ell(CHL.x, CHL.y, CHL.rx - 22, CHL.ry - 20), mix(LEAFG_PP, CARD, 0.3)) +
  flat(ell(CHL.x, CHL.y, CHL.rx - 34, CHL.ry - 32), LEAFG_L) + flat(ell(CHL.x, CHL.y, CHL.rx - 48, CHL.ry - 46), LEAFG_PP) + fold(100, 700, 980, 760, 0.8));
// Four grana, the same four all film; lamellae join them at several heights.
const GRANA = [[200, 900], [400, 830], [610, 910], [380, 1060]];
const COIN = { rx: 84, ry: 20, gap: 28, n: 6 };
const lam = (a, b, h1, h2) => flat(taper([[a[0], a[1] - h1], [(2 * a[0] + b[0]) / 3, (2 * (a[1] - h1) + (b[1] - h2)) / 3], [(a[0] + 2 * b[0]) / 3, ((a[1] - h1) + 2 * (b[1] - h2)) / 3], [b[0], b[1] - h2]], 11, 11), LEAFG_P);
const chLam = node(chMain, `<g class="pc">${lam(GRANA[0], GRANA[1], 40, 90)}${lam(GRANA[0], GRANA[1], 110, 30)}${lam(GRANA[1], GRANA[2], 60, 30)}${lam(GRANA[1], GRANA[2], 120, 110)}${lam(GRANA[0], GRANA[3], 20, 90)}${lam(GRANA[3], GRANA[2], 40, 20)}${lam(GRANA[2], [820, 850], 60, 0)}${lam(GRANA[0], [60, 860], 70, 0)}</g>`);
const chStacks = GRANA.map(([x, y]) => {
  const m = mover(chMain, "", x, y);
  const coins = Array.from({ length: COIN.n }, (_, i) => node(m.i, piece(ell(0, 20 - i * COIN.gap, COIN.rx, COIN.ry), i % 2 ? LEAFG : LEAFG_D)));
  return { m, coins };
});
// Starch grains and the chloroplast's own small ribosomes, in the stroma.
node(chMain, `<g class="pc">${[[760, 700, 38, 24], [820, 1010, 30, 20], [250, 690, 26, 18]].map(([x, y, a, b]) => flat(ell(x, y, a, b), CREAM_D)).join("")}${[[700, 1080], [520, 660], [880, 880], [300, 1000], [660, 760], [940, 700]].map(([x, y]) => flat(circ(x, y, 6), LEAFG_D)).join("")}</g>`);
// The light lands on a granum (on its chlorophyll), not on the water.
const G2 = GRANA[1];
const STACK_TOP = [G2[0], G2[1] + 20 - (COIN.n - 1) * COIN.gap - COIN.ry];
const chBeam = node(chMain, piece(`M1150 120 L${STACK_TOP[0] + 40} ${STACK_TOP[1] - 6} L${STACK_TOP[0] + 92} ${STACK_TOP[1] + 40} L1210 200 Z`, SUN, "up", `opacity="0.95"`));
const chTag = tag(chMain, 560, 380, "klorofil", [STACK_TOP[0] + 20, STACK_TOP[1] + 10], { size: 56, sag: 30 });
// The light's energy, caught by the chlorophyll, passed on to the water: a small folded strip of yellow, zigzag.
const chSpark = mover(chMain, piece("M-60 -10 L-20 -30 L-10 -10 L30 -30 L40 -10 L70 -24 L60 12 L30 26 L20 6 L-20 26 L-30 6 L-66 18 Z", SUN, "pc", `stroke="${mix(SUN, INK, 0.3)}" stroke-width="2"`), 0, 0);
// s10: one water molecule beside the granum, split: its oxygen one way, its two hydrogens the other (f7).
const WR = 50;
const chWater = { o: mover(chMain, oAtom(0, 0, WR), 0, 0), h1: mover(chMain, hAtom(0, 0, WR * 0.64), 0, 0), h2: mover(chMain, hAtom(0, 0, WR * 0.64), 0, 0) };
const water = { x: -200, y: 660 };
const WATER_SPOT = [230, 676];
const split = { k: 0 };
const OUT_O = [150, 520], OUT_H1 = [560, 630], OUT_H2 = [660, 690];
film.each(() => {
  const k = split.k;
  const at = (dx, dy, out) => [water.x + dx + (out[0] - (water.x + dx)) * k, water.y + dy + (out[1] - (water.y + dy)) * k];
  [chWater.o.st.x, chWater.o.st.y] = at(0, 0, OUT_O);
  [chWater.h1.st.x, chWater.h1.st.y] = at(-WR * 1.02, WR * 0.86, OUT_H1);
  [chWater.h2.st.x, chWater.h2.st.y] = at(WR * 1.02, WR * 0.86, OUT_H2);
});
const chCut = node(chMain, `<path d="M${WATER_SPOT[0] - 48} ${WATER_SPOT[1] - 50} l26 26 l-18 16 l26 30 M${WATER_SPOT[0] + 30} ${WATER_SPOT[1] - 52} l-14 26 l20 10 l-14 30" fill="none" stroke="${INK}" stroke-width="5" stroke-dasharray="10 8" stroke-linecap="round"/>`);
const chTagW = tag(chMain, 300, 380, "H₂O", null, { size: 64, sag: 30, follow: () => [chWater.o.st.x + 10, chWater.o.st.y - WR] });
const chTagO = tag(chMain, 200, 380, "O", null, { size: 64, sag: 30, follow: () => [chWater.o.st.x, chWater.o.st.y - WR] });
const chTagH = tag(chMain, 720, 420, "H", null, { size: 64, sag: 30, follow: () => [chWater.h1.st.x + 6, chWater.h1.st.y - WR * 0.64] });
hidden([chBeam, chTag.g, chTag.thread, chSpark.o, ...Object.values(chWater).map((m) => m.o), chCut, chTagW.g, chTagW.thread, chTagO.g, chTagO.thread, chTagH.g, chTagH.thread]);
// s12: hydrogens (from the grana) and carbon dioxide (from outside, through the envelope) pressed together into sugar,
// in the stroma. A few of each: the picture is a simplification (f8), and the tag says only "gula", not its formula.
const SITE = [820, 860];
const chH = [[330, 700], [470, 760], [560, 1000], [430, 960]].map(([x, y]) => mover(chMain, hAtom(0, 0, 28), x, y));
const chC = [[1180, 700], [1180, 980]].map(([x, y]) => mover(chMain, co2(28), x, y));
const chSugar = mover(chMain, sugar(130), ...SITE);
const chSugarTag = tag(chMain, 760, 470, "gula", [SITE[0] - 30, SITE[1] - 122], { size: 64, sag: 10 });
hidden([...chH.map((m) => m.o), ...chC.map((m) => m.o), chSugar.o, chSugarTag.g, chSugarTag.thread]);
// Further back, the next chloroplast in the same cell; nearer the lens, the cell's own wall across two corners.
const chBack = layer(Ch, 0.8, `<g class="pc">${flat(ell(70, 1690, 300, 190), LEAFG_D)}${flat(ell(70, 1690, 280, 172), LEAFG_L)}${flat(ell(70, 1690, 262, 156), LEAFG_PP)}${[[-40, 1700], [120, 1650], [210, 1745]].map(([x, y]) => flat(ell(x, y, 52, 13), LEAFG)).join("")}</g>`);
Ch.svg.insertBefore(chBack, chMain);
const chWall = (d, inner) => flat(d, CREAM, `stroke="${H_EDGE}" stroke-width="3"`) + flat(inner, "none", `stroke="${H_EDGE}" stroke-width="2"`);
const chFore = layer(Ch, 1.25, "");
const chForeTL = node(chFore, `<g class="up">${chWall("M-90 -90 H580 C 440 40, 220 160, -90 250 Z", "M-90 214 C 200 132, 400 30, 520 -90")}</g>`);
const chForeBR = node(chFore, `<g class="up">${chWall("M1170 1480 C 1010 1570, 850 1760, 770 2010 H1170 Z", "M1170 1530 C 1030 1610, 890 1780, 820 2010")}</g>`);
hidden([chForeTL, chForeBR]);

// ═══ A growing branch tip (s14): the sugar built into a new leaf, a longer stem, and wood under the bark ════════
const Tr = makeSet("setTrunk");
const trBack = layer(Tr, 0.5, `<g class="pc">${[[120, 260, 30, 130, LEAFG_PP], [960, 300, 150, 120, LEAFG_PP], [980, 1250, -20, 140, HILL_FAR]].map(([x, y, a, L, c]) => leafAt(x, y, a, L * 1.6, L * 0.55, c)).join("")}</g>`);
const trMain = layer(Tr, 1, "");
// The branch: thick at the bottom left, its tip at the upper right.
const BR = [[-120, 1480], [220, 1080], [520, 760], [780, 520]];
node(trMain, piece(taper([[340, 940], [300, 820], [260, 700], [210, 560]], 46, 16), SUGAR) + piece(taper(BR, 340, 72), SUGAR) + `<g class="pc">${flat(taper([[400, 880], [470, 820], [520, 740], [560, 700]], 20, 8), SUGAR_D)}${flat(taper([[160, 1180], [230, 1100], [290, 1040], [330, 1000]], 24, 10), SUGAR_D)}</g>` + fold(40, 1350, 700, 600, 0.8));
// Old leaves along it (the branch is alive already).
node(trMain, `<g class="pc">${leafAt(560, 690, -110, 240, 84, LEAFG_D)}${leafAt(610, 640, 20, 230, 80, LEAFG)}${leafAt(212, 566, -130, 230, 80, LEAFG)}${leafAt(214, 570, -60, 210, 74, LEAFG_D)}${leafAt(262, 690, 180, 220, 78, LEAFG_L)}</g>`);
// The wood under the bark: long cells whose walls are made of chains of the sugar (cellulose), drawn on as they form.
const WOOD = { x0: 40, y0: 980, w: 420, h: 300 };
const woodMark = (() => {
  let walls = "";
  const hexes = (x0, y0, x1, y1, r) => {
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / (r * 1.9)));
    let o = "";
    for (let i = 0; i <= n; i++) o += `<path d="${hexPath(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, r)}" fill="${SUGAR}" stroke="${SUGAR_D}" stroke-width="1.5"/>`;
    return o;
  };
  for (let c = 0; c <= 5; c++) walls += `<g class="wall">${hexes(WOOD.x0 + c * 84, WOOD.y0, WOOD.x0 + c * 84, WOOD.y0 + WOOD.h, 10)}</g>`;
  for (let r = 0; r <= 2; r++) for (let c = 0; c < 5; c++) walls += `<g class="wall">${hexes(WOOD.x0 + c * 84 + 10, WOOD.y0 + r * 150, WOOD.x0 + (c + 1) * 84 - 10, WOOD.y0 + r * 150, 10)}</g>`;
  return walls;
})();
const trWood = node(trMain, `<g transform="rotate(-42 ${WOOD.x0 + WOOD.w / 2} ${WOOD.y0 + WOOD.h / 2})"><g class="pc">${flat(rrect(WOOD.x0 - 16, WOOD.y0 - 16, WOOD.w + 32, WOOD.h + 32, 14), SUGAR_L)}</g>${woodMark}</g>`);
const trWalls = [...trWood.querySelectorAll(".wall")];
const trFlap = node(trMain, `<g class="up" transform="rotate(-42 ${WOOD.x0 + WOOD.w / 2} ${WOOD.y0 + WOOD.h / 2})">${flat(rrect(WOOD.x0 - 22, WOOD.y0 - 22, WOOD.w + 44, WOOD.h + 44, 16), SUGAR)}${flat(taper([[WOOD.x0, WOOD.y0 + 60], [WOOD.x0 + 100, WOOD.y0 + 66], [WOOD.x0 + 200, WOOD.y0 + 56], [WOOD.x0 + WOOD.w, WOOD.y0 + 62]], 10, 6), SUGAR_D)}${flat(taper([[WOOD.x0, WOOD.y0 + 170], [WOOD.x0 + 100, WOOD.y0 + 164], [WOOD.x0 + 200, WOOD.y0 + 176], [WOOD.x0 + WOOD.w, WOOD.y0 + 168]], 10, 6), SUGAR_D)}</g>`);
// The new growth at the tip: a stem segment and a leaf, each popped up as the sugar arrives.
const TIP = BR[3];
const trStem = node(trMain, piece(taper([[TIP[0] - 10, TIP[1] + 10], [TIP[0] + 40, TIP[1] - 40], [TIP[0] + 80, TIP[1] - 86], [TIP[0] + 110, TIP[1] - 130]], 64, 30), SUGAR));
const trLeaf = node(trMain, `<g class="pc">${leafAt(TIP[0] - 10, TIP[1] - 30, -150, 250, 90, LEAFG_L)}</g>`);
const trLeaf2 = node(trMain, `<g class="pc">${leafAt(TIP[0] + 100, TIP[1] - 126, -70, 200, 72, LEAFG)}</g>`);
// Sugar beads riding up the branch to where it grows.
const BEAD_RUNS = [[[0, 1330], [240, 1060], [520, 760], [TIP[0] - 30, TIP[1] + 20]], [[60, 1260], [260, 1040], [540, 740], [TIP[0], TIP[1]]], [[20, 1300], [200, 1110], [380, 920], [520, 770], [TIP[0] + 60, TIP[1] - 80]]];
const trBeads = [];
BEAD_RUNS.forEach((P, k) => { for (let i = 0; i < 4; i++) trBeads.push({ P, p: { v: 0 }, m: mover(trMain, sugar(16), P[0][0], P[0][1]), k, i }); });
film.each(() => { for (const b of trBeads) [b.m.st.x, b.m.st.y] = along(b.P, b.p.v); });
const woodPt = (x, y) => { const a = (-42 * Math.PI) / 180, cx = WOOD.x0 + WOOD.w / 2, cy = WOOD.y0 + WOOD.h / 2; return [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]; };
const trTagWall = tag(trMain, 600, 1180, "dinding sel = rantai gula", woodPt(WOOD.x0 + 330, WOOD.y0 + 150), { size: 46, sag: -30 });
const trTagWood = tag(trMain, 720, 1060, "kayu", woodPt(WOOD.x0 + 380, WOOD.y0 + 60), { size: 60, sag: 20 });
const trTagLeaf = tag(trMain, 300, 360, "daun baru", [TIP[0] - 130, TIP[1] - 50], { size: 50, sag: 20 });
hidden([trStem, trLeaf, trLeaf2, ...trBeads.map((b) => b.m.o), trTagWall.g, trTagWall.thread, trTagWood.g, trTagWood.thread, trTagLeaf.g, trTagLeaf.thread]);
layer(Tr, 1.35, `<g class="up">${leafAt(1150, 1500, 200, 320, 110, LEAFG_D)}${leafAt(-60, 260, 30, 260, 90, LEAFG)}</g>`);

// ═══ The recipe card (s15): a pop-up card laid over on a sheet of its own ══════════════════════════════════════
const CARD_EL = document.getElementById("sheetCard");
const cdSvg = CARD_EL.querySelector("svg");
node(cdSvg, fold(-20, 1500, 1100, 1560, 1) + fold(860, -20, 900, 1940, 0.8));
// The card is folded in half when it arrives; its top half opens up from the fold, like a pop-up book.
const cdBottom = node(cdSvg, piece("M72 770 L1006 770 L1002 1290 L76 1284 Z", CREAM, "up") + fold(80, 772, 1000, 772, 1.6));
const cdTop = node(cdSvg, piece("M72 246 L1006 252 L1006 772 L72 772 Z", CREAM, "up"));
const cdSun = mover(cdSvg, piece(circ(0, 0, 76), SUN), 220, 450);
const cdAir = mover(cdSvg, co2(30, false), 540, 455);
const cdWater = mover(cdSvg, h2o(34, false), 860, 440);
const cdLabels = [[220, 588, "cahaya"], [540, 588, "udara"], [860, 588, "air"]].map(([x, y, t]) => node(cdSvg, printed(x, y, t, 56).markup));
const cdIn = [[250, 625, 410, 722], [540, 625, 540, 706], [830, 625, 670, 722]].map(([a, b, c, d]) => node(cdSvg, piece(arrowPath(a, b, c, d, 24), INK)));
const cdLeaf = node(cdSvg, `<g class="pc">${flat("M340 802 C 420 676, 660 676, 740 802 C 660 928, 420 928, 340 802 Z", LEAFG)}${flat(taper([[340, 802], [460, 798], [620, 798], [740, 802]], 12, 4), LEAFG_D)}${[400, 480, 560, 640].map((x) => flat(taper([[x, 800], [x + 30, 772], [x + 50, 752], [x + 70, 732]], 6, 2), LEAFG_D) + flat(taper([[x, 802], [x + 30, 830], [x + 50, 850], [x + 70, 870]], 6, 2), LEAFG_D)).join("")}</g>`);
const cdOut = [[470, 905, 320, 962], [610, 905, 770, 962]].map(([a, b, c, d]) => node(cdSvg, piece(arrowPath(a, b, c, d, 22), INK)));
const cdSugar = mover(cdSvg, sugar(64), 260, 1018);
const cdBuild = node(cdSvg, piece(arrowPath(338, 1018, 452, 1018, 22), INK));
const cdTree = node(cdSvg, treeMarkup(560, 1098, 0.17));
const cdOxy = mover(cdSvg, o2(36, false), 830, 1018);
const cdOutLabels = [[260, 1140, "gula"], [560, 1140, "tubuh, kayu"], [830, 1140, "oksigen"]].map(([x, y, t]) => node(cdSvg, printed(x, y, t, 50, { weight: 700 }).markup));
const cdEq = strip(cdSvg, 540, 1236, "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂", 40, { tilt: 0.8 });
const cdStamp = node(cdSvg, `<g class="stamp-ink" transform="rotate(-4 540 318)"><rect x="300" y="276" width="480" height="82" fill="none" stroke="${INK}" stroke-width="5"/>${printed(540, 335, "bukan dari tanah", 50, { weight: 700 }).markup}</g>`);
const cdSlots = [[220, 450], [540, 455], [860, 440]].map(([x, y]) => node(cdSvg, `<circle cx="${x}" cy="${y}" r="78" fill="none" stroke="${H_EDGE}" stroke-width="5" stroke-dasharray="14 12"/>${printed(x, y + 24, "?", 70, { weight: 700, colour: H_EDGE }).markup}`));
hidden([cdSun.o, cdAir.o, cdWater.o, ...cdLabels, ...cdIn, ...cdOut, cdSugar.o, cdBuild, cdTree, cdOxy.o, ...cdOutLabels, cdEq, cdLeaf, cdStamp]);

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
//                                                 THE TIMELINE
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const focusCam = (z = FOCUS_Z) => aim(FOCUS_AT[0], FOCUS_AT[1], z, 540, 780);
const tLayersFlat = () => [tSun, tFar, tHill, tSoil, tRoots, tTree, tBushL.firstElementChild, tFore.firstElementChild, tFore.lastElementChild];

// ═══ s01: the tree grows; a slow rostrum push from the first frame ══════════════════════════════════════════════
gsap.set(T.el, { autoAlpha: 1 });
Object.assign(T.cam, BASE);
camTo(T, aim(540, 900, 1.09, 540, 880), 0, s.s01.end - 0.08, "power1.inOut");
{
  const at = said("s01", "tumbuh");
  // Each cluster of leaves pops up a size larger, one after another; the trunk and branches grow with them.
  tl.to(grow, { k: 1.06, duration: 0.5, ease: "back.out(2)" }, at);
  CLUSTERS.forEach((_, i) => {
    tl.to(grow, { [`d${i}`]: 1.08, duration: 0.17, ease: "power2.out" }, at + 0.07 * i);
    tl.to(grow, { [`d${i}`]: 1, duration: 0.25, ease: "back.out(2)" }, at + 0.07 * i + 0.17);
    cue("rustle", at + 0.07 * i);
  });
  const p = tCutting.querySelector("path");
  tl.set(tCutting, { autoAlpha: 1 }, at + 0.6);
  tl.fromTo(p, { strokeDashoffset: 260 }, { strokeDashoffset: 0, duration: 0.5, ease: "none", immediateRender: false }, at + 0.6);
}

// ═══ s01b: the camera tilts down to the soil; its edge is pinned with a thread ═══════════════════════════════════
{
  const t0 = s.s01b.start;
  camTo(T, aim(540, 1195, 1.25, 540, 880), t0 - 0.08, 0.85, "power2.inOut");
  camTo(T, aim(540, 1195, 1.32, 540, 880), t0 + 0.77, s.s01b.end - t0 - 0.77, "none");
  cue("air", t0 - 0.08);
  const pinA = said("s01b", "bawahnya"), pinB = pinA + 0.42;
  for (const [k, at] of [[0, pinA], [1, pinB]]) {
    tl.set(tPins[k], { autoAlpha: 1 }, at);
    tl.fromTo(tPins[k], { scale: 1.8, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.18, ease: "power2.in", immediateRender: false }, at);
    cue("tap", at + 0.17);
  }
  const lv = tLevel.querySelectorAll(".lvl");
  gsap.set(lv, { strokeDasharray: "1 1.02", strokeDashoffset: 1 });
  tl.set(tLevel, { autoAlpha: 1 }, pinA + 0.1);
  tl.to(lv, { strokeDashoffset: 0, duration: 0.42, ease: "power1.inOut" }, pinA + 0.1);
  flipTag(tTagSoil, said("s01b", "berkurang") - 0.1);
  const g2 = said("s01b", "hampir");
  tl.to(grow, { k: 1.12, duration: 0.5, ease: "back.out(2)" }, g2);
  cue("rustle", g2);
}

// ═══ s02: a sheet of paper slides over; the question, a small tree in its soil, and "tanah?" ═════════════════════
{
  const t0 = s.s02.start - 0.12;
  tl.set(ASK, { autoAlpha: 1 }, t0);
  tl.fromTo(ASK, { x: -1180 }, { x: 0, duration: 0.5, ease: "power3.out", immediateRender: false }, t0);
  cue("slide", t0);
  hideSet(T, t0 + 0.5);
  const drop = s.s02.start - 0.04;
  gsap.set(askStrip.children, { autoAlpha: 0 });
  tl.set(askStrip.children, { autoAlpha: 1 }, drop);
  tl.fromTo(askStrip.children, { y: -360, rotation: -4, svgOrigin: "540 560" }, { y: 0, rotation: 0, duration: 0.5, ease: "bounce.out", immediateRender: false }, drop);
  cue("drop", drop + 0.3);
  popUp(askSoil, s.s02.start + 0.2, { dur: 0.36, sound: null });
  popUp(askTree, s.s02.start + 0.3, { dur: 0.42, sound: "pop" });
  popUp(askMark, s.s02.start + 0.5, { origin: "50% 100%", dur: 0.45, sound: "fold" });
  flipTag(askTag, said("s02", "dari") - 0.1);
  tl.fromTo(askSvg, { scale: 1, transformOrigin: "50% 50%" }, { scale: 1.05, duration: s.s03.start - drop, ease: "none", immediateRender: false }, drop);
}

// ═══ s03: the sheet slides off; Helmont plants a willow cutting in a pot of weighed soil ═════════════════════════
{
  const t0 = s.s03.start - 0.12;
  showSet(P, t0 - 0.05);
  tl.to(ASK, { x: 1180, duration: 0.5, ease: "power3.in" }, t0);
  tl.set(ASK, { autoAlpha: 0 }, t0 + 0.5);
  cue("slide", t0);
  Object.assign(P.cam, aim(540, 960, 1));
  camTo(P, aim(570, 920, 1.08), t0, s.s03.end - t0 - 0.1, "power1.inOut");
  Object.assign(pWillowM.st, { x: 540, y: 740, s: 1, r: -6 });
  flipTag(pTagSoil, said("s03", "dulu") + 0.15);
  slideIn(pStrip, said("s03", "ada") - 0.05, { y: -420, dur: 0.45 });
  flipTag(pTagTree, said("s03", "pohon"));
  const down = said("s03", "ditanam") - 0.15;
  tl.to(pWillowM.st, { x: 620, y: 600, r: 0, duration: 0.3, ease: "power2.inOut" }, down);
  tl.to(pWillowM.st, { y: 880, duration: 0.32, ease: "power2.in" }, down + 0.3);
  cue("thump", down + 0.62);
  tl.fromTo(pWillows[0].g, { scaleY: 0.7, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.36, ease: "back.out(2.4)", immediateRender: false }, down + 0.66);
  // The lid goes on, over the soil, the stem through one of its holes.
  tl.set(pLid.o, { autoAlpha: 1 }, said("s03", "pot") - 0.05);
  tl.fromTo(pLid.st, { x: POT_AT[0] + 700 }, { x: POT_AT[0], duration: 0.36, ease: "power3.out", immediateRender: false }, said("s03", "pot") - 0.05);
  cue("slide", said("s03", "pot") - 0.05);
}

// ═══ s03b: outside, five years: rain from the cloud, a page of the calendar and a size of willow for each ════════
{
  const t0 = s.s03b.start;
  camTo(P, CAM3B, t0 - 0.2, 0.8, "power2.inOut");
  camTo(P, aim(620, 940, 1.0), t0 + 0.6, s.s03b.end - t0 - 0.6, "none");
  // The figure steps away; the tags and the strip fold up one after the other; the hills pop up behind.
  tl.set(pMan.st, { hold: 0, a1: 84, a2: 6 }, t0 - 0.22);
  tl.to(pMan.st, { x: -420, duration: 0.5, ease: "power2.in" }, t0 - 0.22);
  dropTag(pTagTree, t0 - 0.3);
  tl.to(pStrip, { y: -420, duration: 0.3, ease: "power2.in" }, t0 - 0.2);
  tl.set(pStrip, { autoAlpha: 0 }, t0 + 0.1);
  dropTag(pTagSoil, t0 - 0.08);
  popUp(pFar, t0, { dur: 0.4, sound: null });
  popUp(pHill, t0 + 0.08, { dur: 0.4 });
  put(pCloud.o, t0 + 0.05);
  tl.fromTo(pCloud.st, { x: cloudX - 600 }, { x: cloudX, duration: 0.45, ease: "power3.out", immediateRender: false }, t0 + 0.05);
  tl.set(rain, { on: 1 }, t0 + 0.4);
  cue("rain", t0 + 0.4, { end: s.s04.start });
  flipTag(pRainTag, t0 + 0.42);
  popUp(pCal, t0 + 0.1, { dur: 0.32, origin: "50% 0%", sound: "card" });
  const flips = [t0 + 0.22, said("s03b", "dirawat") + 0.12, said("s03b", "lima") - 0.08, said("s03b", "tahun") - 0.02, said("s03b", "tahun") + 0.3];
  flips.forEach((at, k) => {
    if (k > 0) {
      const sheet = pCalSheets[k - 1];
      tl.to(sheet, { scaleY: -0.05, duration: 0.14, ease: "power2.in", svgOrigin: `${calX} ${calY - 105}` }, at);
      tl.set(sheet, { autoAlpha: 0 }, at + 0.14);
      cue("page", at);
    }
    tl.set(pWillows[k].g, { autoAlpha: 0 }, at + 0.1);
    tl.set(pWillows[k + 1].g, { autoAlpha: 1 }, at + 0.1);
    tl.fromTo(pWillows[k + 1].g, { scale: 0.9, transformOrigin: "50% 100%" }, { scale: 1, duration: 0.28, ease: "back.out(2.6)", immediateRender: false }, at + 0.1);
    cue("rustle", at + 0.1);
  });
}

// ═══ s04: the willow lifted out with its roots and weighed on a balance; stamped +74 kg ═════════════════════════
{
  const t0 = s.s04.start;
  tl.set(rain, { on: 0 }, t0 - 0.05);
  tl.to(pCloud.st, { x: cloudX - 700, duration: 0.4, ease: "power3.in" }, t0 - 0.2);
  lift(pCloud.o, t0 + 0.2);
  dropTag(pRainTag, t0 - 0.22);
  foldDown(pCal, t0 - 0.15, { origin: "50% 0%" });
  foldDown(pHill, t0 - 0.05, { dur: 0.3 });
  foldDown(pFar, t0, { dur: 0.3 });
  camTo(P, aim(505, 960, 1), t0 - 0.1, 0.9, "power2.inOut");
  camTo(P, aim(505, 920, 1.04), t0 + 0.8, s.s04.end - t0 - 0.8, "none");
  // The willow comes up out of the pot, its roots with it, and is carried to the left; the pot is carried off.
  tl.to(pWillowM.st, { y: 700, duration: 0.4, ease: "power2.out" }, t0 + 0.05);
  cue("lift", t0 + 0.05);
  tl.to(pWillowM.st, { x: BAL.x - BAL.arm + 10, y: BAL.y + BAL.hang - 90, duration: 0.42, ease: "power2.inOut" }, t0 + 0.42);
  tl.to(pPotM.st, { x: 1500, duration: 0.3, ease: "power2.in" }, t0 + 0.3);
  tl.to(pLid.st, { x: 1500, duration: 0.3, ease: "power2.in" }, t0 + 0.3);
  // The balance stands up from the ground like a pop-up page (once the pot is gone): post, beam, pans on chains.
  const up = t0 + 0.62;
  put(pBal, up);
  popUp(pBalPost, up, { dur: 0.4, sound: "popbig", hide: false });
  popUp(pBeam, up + 0.22, { origin: "50% 50%", axis: "scaleX", dur: 0.35, sound: null });
  // The pans come with their chains, not before.
  gsap.set([pPanL.o, pPanR.o], { autoAlpha: 0 });
  tl.set([pPanL.o, pPanR.o], { autoAlpha: 1 }, up + 0.32);
  gsap.set(bal, { lift: 160 });
  tl.fromTo(bal, { lift: 160 }, { lift: 0, duration: 0.3, ease: "back.out(1.6)", immediateRender: false }, up + 0.32);
  tl.fromTo(pChains, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, immediateRender: true }, up + 0.32);
  // Down onto the left pan, which sinks under it; then weights go on the right pan until the beam is level.
  const onto = up + 0.58;
  tl.to(pWillowM.st, { y: BAL.y + BAL.hang - 50, duration: 0.3, ease: "power2.in" }, onto - 0.3);
  tl.set(ride, { willow: 1 }, onto);
  cue("clunk", onto);
  tl.to(bal, { a: -7, duration: 0.2, ease: "power2.out" }, onto);
  pW.forEach((w, i) => {
    const at = onto + 0.1 + i * 0.12;
    tl.set(w.m.o, { autoAlpha: 1 }, at);
    tl.fromTo(w.m.st, { fall: -360 }, { fall: 0, duration: 0.14, ease: "power2.in", immediateRender: false }, at);
    cue("tick", at + 0.14);
  });
  tl.to(bal, { a: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" }, onto + 0.46);
  const st = Math.max(said("s04", "puluh"), onto + 0.6);
  tl.set([pStamp.g, pStampThread], { autoAlpha: 1 }, st);
  tl.fromTo(pStamp.g, { y: -150 }, { y: 0, duration: 0.18, ease: "power2.in", immediateRender: false }, st);
  swing(pStamp.g, st + 0.18, { ox: pStamp.hole[0], oy: pStamp.hole[1], angle: 7 });
  gsap.set(pStampThread.firstElementChild, { strokeDasharray: "1 1.02", strokeDashoffset: 1 });
  tl.to(pStampThread.firstElementChild, { strokeDashoffset: 0, duration: 0.18 }, st);
  cue("stamp", st + 0.18);
}

// ═══ s05: the soil weighed again: the same 91 kg, less a tiny 57 g weight ═══════════════════════════════════════
{
  const t0 = s.s05.start;
  tl.to(pStamp.g, { scaleY: 0.02, duration: 0.2, ease: "power2.in", svgOrigin: `${pStamp.hole[0]} ${pStamp.hole[1]}` }, t0 - 0.25);
  tl.set([pStamp.g, pStampThread], { autoAlpha: 0 }, t0 - 0.05);
  // The willow and its weights come off.
  tl.set(ride, { willow: 0 }, t0 - 0.2);
  tl.to(pWillowM.st, { x: -420, y: 900, duration: 0.45, ease: "power2.in" }, t0 - 0.2);
  pW.forEach((w, i) => tl.to(w.m.st, { fall: -900, duration: 0.35, ease: "power2.in" }, t0 - 0.15 + i * 0.05));
  tl.set(pW.map((w) => w.m.o), { autoAlpha: 0 }, t0 + 0.3);
  cue("slide", t0 - 0.2);
  // The pot of soil, dried, is lowered onto the pan; the pan sinks; the weights go on again.
  tl.set(pPotM.st, { x: BAL.x - BAL.arm + 20, y: -700, s: 0.8 }, t0);
  tl.set(pLid.st, { x: BAL.x - BAL.arm + 20, y: -746, s: 0.8 }, t0);
  tl.to(pPotM.st, { y: BAL.y + BAL.hang - 392 * 0.8, duration: 0.45, ease: "power2.out" }, t0 + 0.1);
  tl.to(pLid.st, { y: BAL.y + BAL.hang - 438 * 0.8, duration: 0.45, ease: "power2.out" }, t0 + 0.1);
  tl.set(ride, { pot: 1 }, t0 + 0.55);
  cue("clunk", t0 + 0.55);
  tl.to(bal, { a: -8, duration: 0.2, ease: "power2.out" }, t0 + 0.55);
  [...pW2, pTiny].forEach((w, i) => {
    const at = t0 + 0.65 + i * 0.12;
    tl.set(w.m.o, { autoAlpha: 1 }, at);
    tl.fromTo(w.m.st, { fall: -360 }, { fall: 0, duration: 0.14, ease: "power2.in", immediateRender: false }, at);
    if (i < 3) cue("tick", at + 0.14);
  });
  tl.to(bal, { a: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" }, t0 + 1.12);
  flipTag(pTagW2, said("s05", "tanahnya") + 0.25);
  // What it lost: the smallest weight lifted off, and the beam does not move (57 g of 91 kg is under 0.1 %).
  const off = said("s05", "berkurang") - 0.05;
  tl.to(pTiny.off, { v: 1, duration: 0.5, ease: "power2.inOut" }, off);
  cue("tick", off);
  flipTag(pTagTiny, said("s05", "setengah") - 0.08, { sound: "stamp" });
  flipTag(pShare, said("s05", "ons") - 0.05);
  camTo(P, aim(505, 900, 1.05), t0 + 0.1, s.s05.end - t0 - 0.1, "none");
}

// ═══ s06: a sheet slides across; the tree pops up from the page; air and water come in ═══════════════════════════
{
  const t0 = s.s06.start - 0.06;
  wipe(t0, "left", {
    dur: 0.9,
    swap: (at) => {
      hideSet(P, at);
      showSet(T, at);
      camSet(T, aim(540, 700, 1.2), at);
      tl.set(grow, { k: 1 }, at);
      for (const el of [tCutting, tLevel, ...tPins, tTagSoil.g, tTagSoil.thread]) lift(el, at);
      tl.set(tLayersFlat(), { scaleY: 0.02, transformOrigin: "50% 100%" }, at);
    },
  });
  // Every layer stands up from the page as the sheet leaves, back to front.
  tLayersFlat().forEach((el, i) => {
    tl.to(el, { scaleY: 1, duration: 0.4, ease: "back.out(2.2)" }, t0 + 0.12 + i * 0.05);
  });
  cue("popbig", t0 + 0.25);
  camTo(T, aim(540, 680, 1.26), t0 + 0.4, said("s06", "air") - 0.45 - t0 - 0.4, "none");
  // Air: carbon dioxide slides in towards the leaves.
  const air = said("s06", "udara") - 0.2;
  tCO2.forEach((m, i) => {
    const [x0] = CO2_AT[i];
    tl.set(m.o, { autoAlpha: 1 }, air + i * 0.1);
    tl.fromTo(m.st, { x: x0 + (i === 2 ? 420 : -420) }, { x: x0, duration: 0.45, ease: "power3.out", immediateRender: false }, air + i * 0.1);
  });
  cue("slide", air);
  flipTag(tAirTag, air + 0.25);
  popUp(tAirArrow, air + 0.4, { origin: "0% 50%", axis: "scaleX", dur: 0.3, sound: "fold" });
  // A rostrum tilt down the trunk to the roots, for the water.
  const wat = said("s06", "air") - 0.1;
  camTo(T, aim(540, 1070, 1.2), wat - 0.45, 0.75, "power2.inOut");
  cue("air", wat - 0.45);
  tl.to(tSoil, { y: -16, duration: 0.12, ease: "power2.out" }, wat + 0.1);
  tl.to(tSoil, { y: 0, duration: 0.2, ease: "bounce.out" }, wat + 0.22);
  tH2O.forEach((m, i) => popM(m, wat + 0.16 + i * 0.08, { sound: i ? null : "pop" }));
  flipTag(tWaterTag, wat + 0.3);
  popUp(tWaterArrow, wat + 0.4, { origin: "50% 100%", dur: 0.32, sound: "fold" });
}

// ═══ s07: a rostrum push into one leaf, turned over to its underside; a push onto a pore; the CO₂ slips through ══
{
  const t0 = s.s07.start;
  const push = t0 - 0.12;
  camTo(T, focusCam(), push, 0.95, "power2.inOut");
  cue("air", push);
  const sw = push + 0.95;
  // A leaf bigger than the frame slides over as the camera reaches it; under it, the leaf on its own.
  wipe(sw, "left", {
    dur: 0.9,
    sheet: LEAF_SHEET,
    size: 1900,
    swap: (at) => {
      hideSet(T, at);
      for (const el of [...tCO2.map((m) => m.o), tAirArrow, tAirTag.g, tAirTag.thread, ...tH2O.map((m) => m.o), tWaterArrow, tWaterTag.g, tWaterTag.thread]) lift(el, at);
      showSet(Lf, at);
      camSet(Lf, aim(545, 790, 1, 540, 780), at);
    },
  });
  camTo(Lf, aim(545, 800, 1.05, 540, 780), sw, 1.3, "none");
  // Turned over around its midrib: the underside, paler, dotted with pores.
  const turn = sw + 0.32;
  tl.to(flip, { f: 1, duration: 0.48, ease: "power1.inOut" }, turn);
  cue("flipbig", turn);
  const come = said("s07", "masuk") + 0.05;
  lfCO2.forEach((m, i) => {
    const [x0, y0, x1, y1] = [[260, 1300, LPORE_AT[0] - 6, LPORE_AT[1] + 4], [760, 1320, ...leafPt(PORES[5])]][i];
    tl.set(m.o, { autoAlpha: 1 }, come + i * 0.1);
    tl.fromTo(m.st, { x: x0, y: y0 }, { x: x1, y: y1, duration: 0.6, ease: "power2.out", immediateRender: false }, come + i * 0.1);
  });
  flipTag(lfTag, come + 0.2);
  flipTag(lfPoreTag, said("s07", "pori") - 0.05);
  // Push onto that pore, with the back leaves sliding by slower.
  const p2 = said("s07", "kecil") - 0.3;
  dropTag(lfTag, p2);
  dropTag(lfPoreTag, p2 + 0.05);
  camTo(Lf, aim(LPORE_AT[0], LPORE_AT[1], 9.5, 540, 820), p2, 0.75, "power2.in");
  cue("air", p2);
  const sw2 = p2 + 0.75;
  showSet(Pr, sw2);
  hideSet(Lf, sw2);
  camSet(Pr, aim(540, 820, 0.45, 540, 820), sw2);
  camTo(Pr, aim(540, 820, 1, 540, 800), sw2, 0.4, "power3.out");
  camTo(Pr, aim(540, 820, 1.05, 540, 800), sw2 + 0.4, 0.8, "none");
  flipTag(prTag, sw2 + 0.12);
  slideIn(prFore.firstElementChild, sw2 + 0.2, { x: -260, dur: 0.35, sound: null });
  const mol = sw2 + 0.05;
  tl.set(prCO2.o, { autoAlpha: 1 }, mol);
  tl.fromTo(prCO2.st, { x: 1200, y: 380 }, { x: 860, y: 470, duration: 0.25, ease: "power2.out", immediateRender: false }, mol);
  flipTag(prTagC, mol + 0.08, { sound: null });
  tl.to(prCO2.st, { x: 560, y: 760, r: 70, duration: 0.28, ease: "power2.inOut" }, mol + 0.2);
  tl.to(prGuardL.st, { x: 520, duration: 0.26, ease: "power2.out" }, mol + 0.2);
  tl.to(prGuardR.st, { x: 560, duration: 0.26, ease: "power2.out" }, mol + 0.2);
  const sink = mol + 0.48;
  tl.set(prCO2.o, { autoAlpha: 0 }, sink);
  const ghost = mover(prSink, co2(30), 560, 760);
  hidden(ghost.o);
  tl.set(ghost.o, { autoAlpha: 1 }, sink);
  tl.fromTo(ghost.st, { x: 560, y: 760, r: 70, s: 1 }, { x: 540, y: 860, r: 90, s: 0.45, duration: 0.3, ease: "power2.in", immediateRender: false }, sink);
  tl.set(ghost.o, { autoAlpha: 0 }, sink + 0.3);
  dropTag(prTagC, sink - 0.05);
  cue("pff", sink + 0.05);
}

// ═══ s08: a sheet slides down; under it the tree tilted down to its roots; the soil flap folds; water climbs ═════
{
  const t0 = s.s08.start;
  wipe(t0 + 0.2, "down", {
    dur: 0.8,
    swap: (at) => {
      hideSet(Pr, at);
      showSet(T, at);
      camSet(T, aim(540, 1150, 1.3, 540, 760), at);
      tl.set([tSoil, tRoots], { scaleY: 0.02, transformOrigin: "50% 100%" }, at);
      tl.set([tSoil, tRoots], { autoAlpha: 0 }, at);
      put(tDeep, at);
      put(tXylem, at);
    },
  });
  camTo(T, aim(540, 1195, 1.38, 540, 760), t0 + 0.2, 0.8, "power2.out");
  cue("fold", t0 + 0.42);
  // A strip of bark is lifted aside: the cream channel inside the trunk.
  put(tBark, t0 + 0.44);
  tl.to(tBark, { scaleX: 0.02, transformOrigin: "0% 50%", duration: 0.24, ease: "power2.in" }, t0 + 0.44);
  lift(tBark, t0 + 0.68);
  tClimb.forEach((c, i) => {
    tl.set(c.m.o, { autoAlpha: 1 }, t0 + 0.5);
    tl.to(c.p, { v: 1, duration: 1.2, ease: "none" }, t0 + 0.55 + i * 0.12);
  });
  for (let k = 0; k < 5; k++) cue("tick", t0 + 0.65 + k * 0.22);
  flipTag(tClimbTag, said("s08", "naik") + 0.05);
  flipTag(tRootTag, said("s08", "akar") - 0.08);
  camTo(T, aim(540, 1170, 1.44, 540, 760), t0 + 1.0, 0.5, "none");
}

// ═══ s09: up the trunk into a leaf; its surface lifted: the leaf in cross-section, held; then into a chloroplast ══
{
  const t0 = s.s09.start;
  const up = t0 - 0.28;
  dropTag(tRootTag, up - 0.05);
  dropTag(tClimbTag, up);
  // Up the trunk first, then out along the low left branch into the leaf: the frame stays on the tree all the way.
  camTo(T, aim(540, 880, 1.7), up, 0.4, "power1.in");
  camTo(T, focusCam(), up + 0.4, 0.55, "power2.out");
  cue("air", up);
  const sw = up + 0.95;
  // The leaf slides up over the frame, and its surface is lifted away like a flap: the section is under it.
  wipe(sw, "up", {
    dur: 0.9,
    sheet: LEAF_SHEET,
    size: 2160,
    lift: 0.42,
    swap: (at) => {
      hideSet(T, at);
      showSet(Ce, at);
      camSet(Ce, aim(540, 808, 1.14, 540, 770), at);
    },
  });
  cue("peel", sw + 0.06);
  popUp(ceFore.firstElementChild, sw + 0.45, { origin: "0% 0%", dur: 0.35, sound: null });
  camTo(Ce, aim(540, 808, 1.2, 540, 770), sw + 0.1, said("s09", "matahari") - 0.3 - sw - 0.1, "none");
  flipTag(ceTag, said("s09", "ada") + 0.05);
  flipTag(ceTag2, said("s09", "zat") - 0.05);
  const sun = said("s09", "nangkep") - 0.1;
  ceBeams.forEach((b, i) => slideIn(b, sun + i * 0.1, { x: 420, y: -340, dur: 0.36, sound: i ? null : "slide" }));
  cue("chime", sun + 0.36);
  // A push into one palisade cell and its chloroplast; the section's layers slide by at their depths.
  const into = said("s09", "matahari") - 0.25;
  dropTag(ceTag, into - 0.1);
  dropTag(ceTag2, into - 0.05);
  camTo(Ce, aim(CHL_FOCUS[0], CHL_FOCUS[1], 9, 540, 800), into, 0.8, "power2.in");
  cue("air", into);
  const sw2 = into + 0.8;
  wipe(sw2, "right", {
    dur: 0.9,
    swap: (at) => {
      showSet(Ch, at);
      hideSet(Ce, at);
      camSet(Ch, aim(540, 820, 0.6, 540, 800), at);
    },
  });
  camTo(Ch, aim(540, 830, 1, 540, 790), sw2, 0.7, "power2.out");
  slideIn(chForeTL, sw2 + 0.5, { x: -320, y: -240, dur: 0.4, sound: null });
  slideIn(chForeBR, sw2 + 0.56, { x: 320, y: 300, dur: 0.4, sound: null });
  camTo(Ch, aim(560, 820, 1.06, 540, 790), sw2 + 0.7, s.s10.end - sw2 - 0.7, "none");
  // The coin stacks unfold up from flat, coin on coin.
  chStacks.forEach(({ coins }, k) => coins.forEach((c, i) => popUp(c, sw2 + 0.3 + k * 0.06 + i * 0.03, { dur: 0.22, sound: i === 0 && k === 0 ? "rustle" : null })));
}

// ═══ s10: the light is caught by the chlorophyll, and its energy splits water: snip ════════════════════════════
{
  const t0 = s.s10.start;
  for (const m of Object.values(chWater)) tl.set(m.o, { autoAlpha: 1 }, t0 + 0.25);
  tl.fromTo(water, { x: -200, y: 660 }, { x: WATER_SPOT[0], y: WATER_SPOT[1], duration: 0.6, ease: "power2.out", immediateRender: false }, t0 + 0.25);
  cue("slide", t0 + 0.25);
  flipTag(chTagW, t0 + 0.6);
  // The light lands on the stack: on its chlorophyll.
  const lt = said("s10", "cahayanya") - 0.05;
  slideIn(chBeam, lt, { x: 640, y: -500, dur: 0.38, sound: null });
  cue("chime", lt + 0.36);
  flipTag(chTag, lt + 0.4);
  // Its energy is passed on to the water: a zigzag of yellow from the stack to the molecule.
  const en = said("s10", "dipakai");
  put(chSpark.o, en);
  tl.fromTo(chSpark.st, { x: STACK_TOP[0] - 10, y: STACK_TOP[1] + 6, s: 0.3, r: 180 }, { s: 1, duration: 0.2, ease: "back.out(2)", immediateRender: false }, en);
  tl.to(chSpark.st, { x: WATER_SPOT[0] + 74, y: WATER_SPOT[1] + 8, duration: 0.5, ease: "power2.inOut" }, en + 0.2);
  cue("chime2", en);
  const snip = said("s10", "mecah");
  put(chCut, snip - 0.14);
  lift(chSpark.o, snip - 0.04);
  dropTag(chTag, snip - 0.2);
  tl.to(split, { k: 1, duration: 0.36, ease: "back.out(2.6)" }, snip + 0.02);
  lift(chCut, snip + 0.1);
  cue("snip", snip);
  tl.to(chTagW.g, { scaleY: 0.02, duration: 0.1, ease: "power2.in", svgOrigin: `${chTagW.g.dataset.ox} ${chTagW.g.dataset.oy}` }, snip + 0.3);
  tl.set([chTagW.g, chTagW.thread], { autoAlpha: 0 }, snip + 0.4);
  flipTag(chTagO, snip + 0.4, { dur: 0.22 });
  flipTag(chTagH, snip + 0.55);
}

// ═══ s11: the oxygen let out of the leaves, and breathed in ═════════════════════════════════════════════════════
{
  const t0 = s.s11.start;
  tl.to(OUT_O, { 0: 640, 1: -160, duration: 0.5, ease: "power2.in" }, t0 - 0.45);
  dropTag(chTagO, t0 - 0.5);
  dropTag(chTagH, t0 - 0.45);
  wipe(t0 + 0.05, "up", {
    dur: 0.9,
    swap: (at) => {
      hideSet(Ch, at);
      for (const el of [chBeam, ...Object.values(chWater).map((m) => m.o)]) lift(el, at);
      for (const el of [tDeep, tXylem, ...tClimb.map((c) => c.m.o)]) lift(el, at);
      tl.set([tSoil, tRoots], { autoAlpha: 1, scaleY: 1 }, at);
      showSet(T, at);
      camSet(T, aim(690, 1000, 1), at);
      put(tPerson.o, at);
    },
  });
  camTo(T, aim(690, 980, 1.06), t0 + 0.45, s.s11.end - t0 - 0.45, "none");
  const pair = said("s11", "oksigennya") + 0.15;
  tSingle.forEach((m) => tl.set(m.o, { autoAlpha: 1 }, t0 + 0.4));
  tl.fromTo(tSingle[0].st, { x: 560, y: 230 }, { x: 600, y: 540, duration: 0.4, ease: "power2.out", immediateRender: false }, t0 + 0.4);
  tl.to(tSingle[0].st, { x: 643, y: 560, duration: 0.2, ease: "power2.in" }, pair + 0.25);
  tl.to(tSingle[1].st, { x: 677, y: 560, duration: 0.2, ease: "power2.in" }, pair + 0.25);
  tl.set(tSingle.map((m) => m.o), { autoAlpha: 0 }, pair + 0.45);
  cue("click", pair + 0.45);
  const face = tPerson.face();
  const STARTS = [[660, 560], [730, 640], [600, 470], [700, 700]];
  tO2.forEach((m, i) => {
    const at = i ? pair + 0.5 + i * 0.34 : pair + 0.45;
    const [x0, y0] = STARTS[i];
    tl.set(m.o, { autoAlpha: 1 }, at);
    tl.fromTo(m.st, { x: x0, y: y0, s: i ? 0.4 : 1 }, { s: 1, duration: 0.2, ease: "back.out(2)", immediateRender: false }, at);
    tl.to(m.st, { x: face[0] - 56 + i * 6, y: face[1] + 30 + (i % 2) * 24, duration: 1.2 - i * 0.12, ease: "power1.inOut" }, at + 0.25);
    if (i) cue("pop", at);
  });
  flipTag(tO2Tag, said("s11", "dilepas"));
  const inhale = said("s11", "hirup") - 0.15;
  tl.to(tPerson.st, { breathe: 1, nod: -4, duration: 0.5, ease: "power1.inOut" }, inhale);
  cue("breath", inhale);
  tO2.forEach((m, i) => tl.to(m.st, { s: 0.3, x: face[0] - 18, y: face[1] + 24, duration: 0.3, ease: "power2.in" }, inhale + 0.05 + i * 0.05));
  tl.set(tO2.map((m) => m.o), { autoAlpha: 0 }, inhale + 0.42);
  dropTag(tO2Tag, inhale + 0.3);
}

// ═══ s12: a sheet slides across; in the chloroplast's fluid the hydrogens and carbon dioxide are pressed into sugar ══
{
  const t0 = s.s12.start;
  wipe(t0 - 0.02, "right", {
    dur: 0.9,
    swap: (at) => {
      hideSet(T, at);
      tl.set(tPerson.o, { autoAlpha: 0 }, at);
      tl.set(Ch.el, { y: 0 }, at);
      showSet(Ch, at);
      camSet(Ch, aim(690, 830, 1, 540, 790), at);
    },
  });
  camTo(Ch, aim(700, 830, 1.07, 540, 790), t0 + 0.4, s.s12.end - t0 - 0.4, "none");
  // The hydrogens come from the stacks, where the water was split.
  const h = said("s12", "hidrogennya");
  chH.forEach((m, i) => {
    const [x, y] = [[330, 700], [470, 760], [560, 1000], [430, 960]][i];
    tl.set(m.o, { autoAlpha: 1 }, h + i * 0.08);
    tl.fromTo(m.st, { x, y }, { x: SITE[0] - 150 + (i % 2) * 40, y: SITE[1] - 110 + i * 70, duration: 0.6, ease: "power3.out", immediateRender: false }, h + i * 0.08);
  });
  cue("slide", h);
  // Carbon dioxide comes in from outside the chloroplast, through its envelope.
  const c = said("s12", "karbon") - 0.1;
  chC.forEach((m, i) => {
    tl.set(m.o, { autoAlpha: 1 }, c + i * 0.1);
    tl.fromTo(m.st, { x: 1180, y: [700, 980][i] }, { x: SITE[0] + 120, y: [760, 960][i], duration: 0.55, ease: "power3.out", immediateRender: false }, c + i * 0.1);
  });
  cue("slide", c);
  const press = said("s12", "dioksida") + 0.5;
  [...chH, ...chC].forEach((m, i) => {
    tl.to(m.st, { x: SITE[0] + Math.cos(i * 1.1) * 70, y: SITE[1] + Math.sin(i * 1.1) * 70, duration: 0.3, ease: "power2.in" }, press + i * 0.03);
    tl.to(m.st, { s: 0.55, x: SITE[0], y: SITE[1], duration: 0.18, ease: "power2.in" }, press + 0.42);
  });
  for (let k = 0; k < 3; k++) cue("click", press + 0.18 + k * 0.1);
  const pop = said("s12", "gula") - 0.1;
  tl.set([...chH, ...chC].map((m) => m.o), { autoAlpha: 0 }, pop);
  tl.set(chSugar.o, { autoAlpha: 1 }, pop);
  tl.fromTo(chSugar.st, { s: 0.3 }, { s: 1, duration: 0.4, ease: "back.out(3)", immediateRender: false }, pop);
  cue("pluck", pop);
  flipTag(chSugarTag, pop + 0.28);
}

// ═══ s13: pulled back out of the leaf to the tree: the sugar is its food, sent all over it ═══════════════════════
{
  const t0 = s.s13.start;
  dropTag(chSugarTag, t0 - 0.3);
  tl.to(Ch.cam, { z: 0.8, duration: 0.6, ease: "power1.in" }, t0 - 0.4);
  slideOut(chForeTL, t0 - 0.4, { x: -420, y: -320, dur: 0.3, sound: null });
  slideOut(chForeBR, t0 - 0.4, { x: 420, y: 380, dur: 0.3, sound: null });
  cue("air", t0 - 0.4);
  const sw = t0 + 0.05;
  wipe(sw, "down", {
    dur: 0.9,
    swap: (at) => {
      hideSet(Ch, at);
      showSet(T, at);
      camSet(T, aim(400, 640, 2.4, 540, 760), at);
    },
  });
  camTo(T, aim(540, 760, 1.12), sw, 0.9, "power2.out");
  tSugar.forEach((c, i) => popM(c.m, sw + 0.45 + i * 0.06, { sound: i ? null : "pop" }));
  flipTag(tFoodTag, said("s13", "makanan") - 0.1);
  const go = said("s13", "makanan") + 0.1;
  tSugar.forEach((c, i) => {
    tl.to(c.p, { v: 1, duration: 1.15, ease: "power1.inOut" }, go + i * 0.08);
    cue("pluck", go + i * 0.16, { note: i });
  });
  // The camera follows the sugar down the trunk.
  camTo(T, aim(540, 1000, 1.12), go + 0.1, s.s13.end - go - 0.05, "power1.inOut");
  dropTag(tFoodTag, s.s13.end - 0.35);
}

// ═══ s14: a sheet slides across to a growing branch tip: sugar built into wood, a new leaf, a longer stem ════════
{
  const t0 = s.s14.start;
  wipe(t0 + 0.02, "left", {
    dur: 0.9,
    swap: (at) => {
      hideSet(T, at);
      lift([...tSugar.map((c) => c.m.o)], at);
      showSet(Tr, at);
      camSet(Tr, aim(540, 860, 1, 540, 800), at);
    },
  });
  camTo(Tr, aim(520, 880, 1.08, 540, 800), t0 + 0.3, s.s14.end - t0 - 0.3, "none");
  // The bark flap opens: under it the wood's cells, their walls laid as chains of sugar, one wall after another.
  const open = said("s14", "disusun");
  tl.to(trFlap, { scaleY: -0.3, transformOrigin: "50% 0%", duration: 0.4, ease: "power2.inOut" }, open);
  cue("peel", open);
  hidden(trWalls);
  trWalls.forEach((w, i) => {
    tl.set(w, { autoAlpha: 1 }, open + 0.3 + i * 0.035);
    if (i % 5 === 0) cue("click", open + 0.3 + i * 0.035);
  });
  flipTag(trTagWall, said("s14", "jadi"));
  // Sugar rides up the branch to the tip.
  trBeads.forEach((b) => {
    tl.set(b.m.o, { autoAlpha: 1 }, open + 0.1 + b.i * 0.16 + b.k * 0.05);
    tl.fromTo(b.p, { v: 0 }, { v: 1, duration: 0.8, ease: "power1.in", immediateRender: false }, open + 0.1 + b.i * 0.16 + b.k * 0.05);
    tl.set(b.m.o, { autoAlpha: 0 }, open + 0.9 + b.i * 0.16 + b.k * 0.05);
  });
  // A new leaf at the tip, on "daun"; the stem grows on, on "batang".
  popUp(trLeaf, said("s14", "daun") - 0.05, { origin: "100% 100%", axis: "scale", from: 0.1, dur: 0.4, sound: "pop" });
  flipTag(trTagLeaf, said("s14", "daun") + 0.2);
  popUp(trStem, said("s14", "batang") - 0.08, { origin: "0% 100%", axis: "scale", from: 0.1, dur: 0.4, sound: "pop" });
  popUp(trLeaf2, said("s14", "batang") + 0.25, { origin: "0% 100%", axis: "scale", from: 0.1, dur: 0.35, sound: null });
  flipTag(trTagWood, said("s14", "kayu") - 0.1, { sound: "knock" });
}

// ═══ s15: the recipe card, folded, laid over; it opens like a pop-up and fills: in, the leaf, out ═════════════
{
  const t0 = s.s15.start;
  tl.set(CARD_EL, { autoAlpha: 1 }, t0 - 0.05);
  tl.fromTo(CARD_EL, { x: -1180 }, { x: 0, duration: 0.45, ease: "power3.out", immediateRender: false }, t0 - 0.05);
  cue("slide", t0 - 0.05);
  hideSet(Tr, t0 + 0.4);
  tl.fromTo(cdSvg, { scale: 1, transformOrigin: "50% 45%" }, { scale: 1.03, duration: s.s16.start + 0.38 - t0, ease: "none", immediateRender: false }, t0);
  // The top half of the card opens up from the fold.
  gsap.set(cdTop, { scaleY: 0.02, transformOrigin: "50% 100%" });
  tl.to(cdTop, { scaleY: 1, duration: 0.42, ease: "back.out(1.6)" }, t0 + 0.12);
  cue("fold", t0 + 0.12);
  popUp(cdLeaf, t0 + 0.3, { dur: 0.36, origin: "50% 100%", sound: null });
  popUp(cdTree, said("s15", "tumbuhan") - 0.05, { dur: 0.4, sound: "pop" });
  put(cdOutLabels[1], said("s15", "tumbuhan") + 0.2);
  const food = said("s15", "makanannya") - 0.1;
  popUp(cdOut[0], food - 0.12, { axis: "scale", origin: "0% 0%", from: 0.2, dur: 0.25, sound: null });
  popM(cdSugar, food, { dur: 0.36, sound: "pluck" });
  put(cdOutLabels[0], food + 0.2);
  popUp(cdBuild, food + 0.35, { axis: "scaleX", origin: "0% 50%", from: 0.1, dur: 0.25, sound: null });
  const oxy = said("s15", "sendiri") - 0.05;
  popUp(cdOut[1], oxy - 0.12, { axis: "scale", origin: "100% 0%", from: 0.2, dur: 0.25, sound: null });
  popM(cdOxy, oxy, { dur: 0.36 });
  cue("chord", oxy + 0.05);
  put(cdOutLabels[2], oxy + 0.2);
  [["cahaya", cdSun], ["udara", cdAir], ["air", cdWater]].forEach(([w, m], i) => {
    const at = said("s15", w) - 0.08;
    popM(m, at, { dur: 0.36, sound: "tap" });
    tl.set(cdSlots[i], { autoAlpha: 0 }, at);
    put(cdLabels[i], at + 0.15);
    popUp(cdIn[i], at + 0.2, { origin: "50% 0%", dur: 0.26, sound: null });
  });
  slideIn(cdEq, said("s15", "dan") - 0.2, { x: 1100, dur: 0.4 });
  const stampAt = said("s15", "air") + 0.15;
  tl.set(cdStamp, { autoAlpha: 1 }, stampAt);
  tl.fromTo(cdStamp, { scale: 1.3, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.14, ease: "power2.in", immediateRender: false }, stampAt);
  cue("stamp", stampAt + 0.14);
  // Underneath, the opening tree is already back in its first pose, for when the card leaves.
  showSet(T, t0 + 0.45);
  camSet(T, BASE, t0 + 0.45);
  tl.set(T.el, { y: 0 }, t0 + 0.45);
  tl.set(grow, { k: 1 }, t0 + 0.45);
}

// ═══ s16: the card slides off; the opening picture under it, every layer where frame 0 has it ═══════════════════
{
  const off = s.s16.start + 0.38;
  tl.to(CARD_EL, { x: 1180, duration: 0.5, ease: "power3.in" }, off);
  tl.set(CARD_EL, { autoAlpha: 0 }, off + 0.5);
  cue("slide", off);
  CLUSTERS.forEach((_, i) => {
    tl.to(grow, { [`d${i}`]: 1.02, duration: 0.12, ease: "power2.out" }, off + 0.36 + 0.03 * i);
    tl.to(grow, { [`d${i}`]: 1, duration: 0.15, ease: "power2.inOut" }, off + 0.48 + 0.03 * i);
  });
}

// Placed last, after every job that works out where a moving piece is, so a frame never shows the last one's places.
film.each(writeMovers);
film.each(writeThreads);
window.__sets = sets;
ink.roughen(".cut", { amount: 1.2, step: 9, seed: 3 });
film.finish();
