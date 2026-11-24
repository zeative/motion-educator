// "Kenapa popcorn bisa meletus?" in the Comic template. Built from storyboard.json: every time below is a shot's
// start or end, or a word of the take (voice/voice.json, the "film" times). The picture advances on twelves
// (template.json "stepped": 12): the renderer seeks the timeline to the held time, so every move here is limited
// animation, held two frames at a time.
//
// The look: comic pages printed on warm paper, laid out as the template's concept page is: two to four panels
// filling the page from top to bottom, narration lettered in yellow caption boxes inside the panels, the kid's
// question in a speech bubble, one full-bleed splash for the POP. Every object is a colour plate (flat red, yellow,
// blue and halftone dots, a few pixels off register) under an ink plate (comic.js). The camera moves from panel to
// panel. Nothing the app draws over the frame covers a caption, a callout or a number (the portrait safe area);
// panel art runs under it.
// The numbers on the instruments are computed from the fact sheet (storyboard.build.py, p1, p4, p5): the
// thermometer's column stands at 180 on its 0 to 200 scale, the gauge's needle at 931 / 101.325 = 9.19 of 10.
import { createFilm } from "../../kit/engine/motion.js";
import { createInk } from "../../kit/engine/ink.js";
import { createFlatBackdrop } from "../../kit/engine/backdrops.js";
import * as K from "./comic.js";

const { C } = K;
const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, shots: s } = film;
const ink = createInk(film);
// Writers: the jobs that put a frame's state on the page (transforms, visibility, needles, cameras). They run after
// every job that sets state (a jiggle, a cycle, a tremble), so each frame is drawn from its own time, never from
// the frame before (a render segment starts on a frame of its own).
const writers = [];
const late = (fn) => writers.push(fn);
// (the narration is lettered in caption boxes in the panels, from the storyboard's voice lines: see cap() below)
const NS = "http://www.w3.org/2000/svg";
const $ = (sel) => document.querySelector(sel);

// ── The numbers (the fact sheet) ─────────────────────────────────────────────────────────────────────────────────
const POP_C = 180, THERMO_MAX = 200; // p4: about 180 °C, on a 0 to 200 °C thermometer
const POP_KPA = 931, ATM_KPA = 101.325, TIMES_AIR = POP_KPA / ATM_KPA; // p5: 9.19 times the air's pressure
const GAUGE_MAX = 10, MOISTURE = 14; // p1: about 14 % of the kernel's weight is water
const PSI = Math.round(POP_KPA / 6.895); // 135 psi

// Every sound-worthy thing the picture does is logged with its time (render.mjs --events writes events.json), so
// cues.build.py puts each sound on the frame its picture happens.
const LOG = (window.__events = []);
const ev = (kind, at, end = at, note = "") => LOG.push({ kind, at: +at.toFixed(3), end: +end.toFixed(3), note });

// ── Paper, pages, cameras ────────────────────────────────────────────────────────────────────────────────────────
// The template's paper (#fffdf6 with a fine seeded grain and a few fibres), as a pattern panels are printed on, so a
// panel slid over another is the same paper. Painted here rather than taken from the stage, whose paper has a soft
// vignette baked in (the template's Never line rules out soft gradients).
const sheet = Object.assign(document.createElement("canvas"), { width: 1080, height: 1920 });
{
  const ctx = sheet.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = film.look.paper ?? "#fffdf6";
  ctx.fillRect(0, 0, 1080, 1920);
  const R = K.rng(7), img = ctx.getImageData(0, 0, 1080, 1920), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 12; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = "rgba(28,28,30,0.05)";
  for (let i = 0; i < 230; i++) {
    const x = R() * 1080, y = R() * 1920, a = R() * Math.PI, l = 6 + R() * 18;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (R() - 0.5) * 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
}
const paperURL = sheet.toDataURL("image/png");
document.body.insertAdjacentHTML("afterbegin", `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><pattern id="paperPat" patternUnits="userSpaceOnUse" width="1080" height="1920"><image href="${paperURL}" width="1080" height="1920"/></pattern></defs></svg>`);
await new Promise((ok) => { const img = new Image(); img.onload = ok; img.onerror = ok; img.src = paperURL; });

const G = (parent, markup = "", cls = "") => {
  const g = document.createElementNS(NS, "g");
  if (cls) g.setAttribute("class", cls);
  g.innerHTML = markup;
  parent.append(g);
  return g;
};
const pages = {};
for (const sec of document.querySelectorAll(".page")) {
  const cam = sec.querySelector(".cam");
  // every page is a whole sheet of paper: its gutters never show the page underneath
  if (sec.id !== "pTurn") cam.insertAdjacentHTML("afterbegin", '<rect x="-24" y="-24" width="1128" height="1968" fill="url(#paperPat)"/>');
  // the caption layer: lettering that stays put on the screen while the camera moves over the panels
  const ov = G(sec.querySelector("svg"), "", "ov");
  const st = { x: 540, y: 960, z: 1, sx: 0, sy: 0, free: 0 };
  // the page itself as a sheet: slid, flipped, or cut back by a turning page (clip from the left or the right)
  const pt = { x: 0, y: 0, fx: 1, clipL: 0, clipR: 0 };
  pages[sec.id] = { sec, cam, ov, st, pt };
  gsap.set(sec, { autoAlpha: 0 });
  late(() => {
    // a camera closer than the whole page never shows past the sheet's edges (unless it is diving: st.free)
    let x = st.x, y = st.y;
    if (st.z >= 1 && !st.free) { x = Math.min(Math.max(x, 540 / st.z), 1080 - 540 / st.z); y = Math.min(Math.max(y, 960 / st.z), 1920 - 960 / st.z); }
    cam.setAttribute("transform", `translate(${(540 - x * st.z + st.sx).toFixed(2)} ${(960 - y * st.z + st.sy).toFixed(2)}) scale(${st.z.toFixed(4)})`);
    sec.style.transform = pt.x || pt.y || pt.fx !== 1 ? `translate(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px) scaleX(${pt.fx.toFixed(4)})` : "";
    sec.style.clipPath = pt.clipL || pt.clipR ? `inset(0 ${pt.clipR.toFixed(1)}px 0 ${pt.clipL.toFixed(1)}px)` : "";
  });
}
const page = (id) => pages[id];
const showPage = (id, from, to) => {
  if (from <= 0) gsap.set(page(id).sec, { autoAlpha: 1 });
  else tl.set(page(id).sec, { autoAlpha: 1 }, from);
  if (to != null && to < film.duration) tl.set(page(id).sec, { autoAlpha: 0 }, to);
};
// The camera of a page: (x, y) of the page shown at the frame's centre, at zoom z.
const camTo = (id, to, at, duration = 0.5, ease = "power2.inOut") => tl.to(page(id).st, { ...to, duration, ease }, at);
// A screen shake: four held frames of a hard jolt, settling.
const shake = (id, at, a = 10) => {
  const st = page(id).st;
  [[a, -0.7 * a], [-0.8 * a, 0.5 * a], [0.5 * a, 0.6 * a], [-0.3 * a, -0.3 * a], [0, 0]].forEach(([x, y], i) => tl.set(st, { sx: x, sy: y }, at + i / 12));
};

// An animated piece: its transform and visibility written every frame from a state the timeline tweens. (ox, oy)
// is the point it scales and turns about.
function A(el, opts = {}) {
  if (el.__st) return Object.assign(el.__st, opts);
  const st = (el.__st = { ox: 0, oy: 0, k: 1, x: 0, y: 0, r: 0, o: 1, sx: 1, ...opts });
  late(() => {
    el.setAttribute("transform", `translate(${(st.x + st.ox).toFixed(2)} ${(st.y + st.oy).toFixed(2)}) rotate(${st.r.toFixed(2)}) scale(${(st.k * st.sx).toFixed(4)} ${st.k.toFixed(4)}) translate(${-st.ox} ${-st.oy})`);
    const v = st.o > 0.001 && Math.abs(st.k * st.sx) > 0.001 ? "visible" : "hidden";
    if (el.style.visibility !== v) el.style.visibility = v;
  });
  return st;
}
// A piece that is not there until `at`, then pops in with an overshoot (a few held drawings) and settles.
function popIn(el, ox, oy, at, { from = 0.35, dur = 0.26, kind = "pop", note = "", ease = "back.out(2.6)" } = {}) {
  const st = A(el, { ox, oy, o: 0 });
  tl.set(st, { o: 1, k: from }, at);
  tl.to(st, { k: 1, duration: dur, ease }, at);
  if (kind) ev(kind, at, at + dur, note);
  return st;
}
const popOut = (el, at, dur = 0.12) => {
  const st = el.__st;
  tl.to(st, { k: 0.2, duration: dur, ease: "power2.in" }, at);
  tl.set(st, { o: 0 }, at + dur);
};
const hideUntil = (el, at) => { const st = A(el, { o: 0 }); tl.set(st, { o: 1 }, at); return st; };
const hideFrom = (el, at) => { const st = A(el); tl.set(st, { o: 0 }, at); return st; };
// Two or three drawings of one thing, shown in turn (`frames`: [[time, index], ...]).
function drawings(els, frames) {
  const sts = els.map((el) => A(el, { o: 0 }));
  // (a set at time 0 never fires on the first seek: the drawing shown from the start is set directly)
  for (const [at, i] of frames) sts.forEach((st, k) => (at <= 0 ? (st.o = k === i ? 1 : 0) : tl.set(st, { o: k === i ? 1 : 0 }, at)));
}
// A thing that alternates between drawings on twos while it is live (a throb, a flicker, a rattle).
function cycle(els, from, to, { rate = 6, phase = 0 } = {}) {
  for (const el of els) A(el, { o: 0 });
  film.each((t) => {
    if (t < from || t >= to) return;
    const i = (Math.floor(t * rate + 1e-6) + phase) % els.length;
    els.forEach((el, k) => (el.__st.o = k === i ? 1 : 0));
  });
}
const jiggle = (st, from, to, { a = 3, rate = 6, seed = 0 } = {}) => film.each((t) => {
  if (t < from || t >= to) return;
  const n = Math.floor(t * rate + 1e-6) + seed;
  st.x = (n % 2 ? 1 : -1) * a;
  st.y = (n % 2 ? -1 : 1) * a * 0.6;
});
// Ink drawn on, stroke by stroke, logged for the pen sound. (kit/engine/ink.js drawOn tweens the path's
// stroke-dashoffset through GSAP's CSS plugin, which rounds it to whole pixels: on a pathLength="1" path the line
// pops on whole halfway through. Here the offset lives in a state the timeline tweens, written every frame.)
function drawOn(el, at, { duration = 0.3, gap = 0.04, ease = "power1.inOut" } = {}) {
  const list = ink.paths(el);
  const lengths = list.map((p) => p.getTotalLength()), total = lengths.reduce((a, b) => a + b, 0) || 1;
  const span = duration - gap * (list.length - 1);
  let t = at;
  list.forEach((path, i) => {
    const d = Math.max(0.04, (span * lengths[i]) / total), st = { off: 1 };
    path.setAttribute("pathLength", "1");
    path.style.strokeDasharray = "1 1.02";
    film.each(() => (path.style.strokeDashoffset = st.off.toFixed(4)));
    tl.to(st, { off: 0, duration: d, ease }, t);
    t += d + gap;
  });
  ev("ink", at, t);
  return t;
}

// A panel: printed paper inside a thick ink border, a halftone tint run across it. Its rectangle lives in a state
// so a panel can grow, split or narrow; what is drawn in it (.c) is clipped to it.
function panel(parent, [x0, y0, x1, y1], { tint, r = 3.3, rx = 0, extent, border = 12, step = 18 } = {}) {
  const st = { x0, y0, x1, y1, rx };
  const id = K.nid("pn");
  const [e0, e1, e2, e3] = extent ?? [x0, y0, x1, y1];
  const g = G(parent, `<clipPath id="${id}"><rect/></clipPath><rect class="pf" fill="url(#paperPat)"/>${tint ? `<g clip-path="url(#${id})"><path class="tint" d="${K.tintDots(e0, e1, e2, e3, tint, { r, step })}" fill="${tint}" transform="translate(${K.MIS[0]} ${K.MIS[1]})"/></g>` : ""}<g class="c" clip-path="url(#${id})"></g><rect class="pb" fill="none" stroke="${C.ink}" stroke-width="${border}" stroke-linejoin="round"/>`, "panel");
  const rects = [...g.querySelectorAll("rect")];
  const set = () => {
    for (const r of rects) {
      r.setAttribute("x", st.x0.toFixed(1)); r.setAttribute("y", st.y0.toFixed(1));
      r.setAttribute("width", Math.max(0, st.x1 - st.x0).toFixed(1)); r.setAttribute("height", Math.max(0, st.y1 - st.y0).toFixed(1));
      r.setAttribute("rx", st.rx);
    }
  };
  set();
  film.each(set);
  return { g, id, c: g.querySelector(".c"), st, tint: g.querySelector(".tint"), border: g.querySelector(".pb") };
}
// Things slid in and out: whole panels or pages, with the stepped motion of limited animation.
const slide = (st, at, to, dur = 0.32, ease = "expo.out") => tl.to(st, { ...to, duration: dur, ease }, at);


// ── Lettering the narration ──────────────────────────────────────────────────────────────────────────────────────
// Each shot's line, from the storyboard, lettered in a yellow caption box in its panel (the template's caption
// style): the whole sentence at once, so it reads on mute, the key word in bold. It appears on the line's first
// word and stays until `until`. Key words take the colour of what they name: water is blue; "busa" names neither
// colour's meaning and is underlined in ink.
const KEYCOL = { s03: C.blue, s13: C.blue, s09b: C.ink };
const said = (id) => film.voiced?.[id]?.from ?? s[id].start;
function cap(id, pageId, x, y, w, until, { size = 44, from } = {}) {
  const box = K.captionBox(storyboard.shots.find((sh) => sh.id === id).voice.replace(/\[[^\]]*\]/g, ""), x, y, w, { size, keyColour: KEYCOL[id] ?? C.red });
  const el = G(page(pageId).ov, box.markup);
  const at = from ?? Math.min(said(id), s[id].start) - 0.03;
  popIn(el, x + w / 2, y + box.h / 2, at, { from: 0.85, dur: 0.16, kind: null, ease: "back.out(2)" });
  if (until != null) hideFrom(el, until);
  return { el, h: box.h };
}
// Panels of a page: three bands from the top of the frame to the bottom, as the concept page lays them.
const X0 = 28, X1 = 1052, Y0 = 40, Y1 = 1880;
// A page slid in from a side; `from` [dx, dy] where it starts.
const slideIn = (id, at, from, dur = 0.36) => { const pt = page(id).pt; Object.assign(pt, { x: from[0], y: from[1] }); tl.to(pt, { x: 0, y: 0, duration: dur, ease: "expo.out" }, at); };
const slideOut = (id, at, to, dur = 0.3) => tl.to(page(id).pt, { x: to[0], y: to[1], duration: dur, ease: "power3.in" }, at);

// ══ P1 · pA: the opening (s01, s02, and s14 into the loop) ══════════════════════════════════════════════════════
const pA = page("pA");
const A1 = panel(pA.cam, [X0, Y0, X1, 620], { tint: C.blue });
const A2 = panel(pA.cam, [X0, 640, X1, 1260], { tint: C.red });
const A3 = panel(pA.cam, [X0, 1280, X1, Y1], { tint: C.yellow });
{
  const KX = 590, KY = 360, KS = 330;
  const hand = K.pinch(KX, KY, KS, { mirror: true });
  G(A1.c, hand.back + K.kernel(KX, KY, KS, { rot: -8 }) + hand.front);
  G(A1.c, K.callout("KERAS", 300, 548, 452, 430, { size: 50 }));
}
const speedA = [G(A2.c, K.speedLines(540, 950, 270, 720, { n: 24, seed: 4, width: 16 })), G(A2.c, K.speedLines(540, 950, 290, 720, { n: 24, seed: 9, width: 16 }))];
const burstA = [G(A2.c, K.burst(540, 950, 190, 300, { seed: 3, n: 16 })), G(A2.c, K.burst(540, 950, 205, 328, { seed: 5, n: 16 }))];
const kickA = G(A2.c, K.burst(540, 950, 225, 370, { seed: 6, n: 16 }));
const flakeA = G(A2.c, K.flake(540, 975, 135, { seed: 7 }));
const popA = G(A2.c, K.soundWord("POP!", 560, 810, 180, { rot: -8 }));
const flakeAs = A(flakeA, { ox: 540, oy: 975 });
cycle(burstA, 0, film.duration + 1, { rate: 6 });
cycle(speedA, 0, film.duration + 1, { rate: 6, phase: 1 });
jiggle(flakeAs, 0, film.duration + 1, { a: 2.5, rate: 6, seed: 1 });
{ const st = A(kickA, { o: 0 }); tl.set(st, { o: 1 }, 1.75); tl.set(st, { o: 0 }, 1.75 + 3 / 12); ev("burst", 1.75, 2.0, "the burst kicks on 'meledak'"); }
// the kid in the bottom panel, the kernel held up to his eye
const KID = { x: 300, y: 1640, R: 150 };
const kidSquint = G(A3.c, K.kid(KID.x, KID.y, KID.R, "squint"));
const kidWow = G(A3.c, K.kid(KID.x, KID.y, KID.R, "wow"));
const BK = { x: 545, y: 1585, s: 112 };
G(A3.c, K.forearm(760, 1930, 790, 1700, 104));
const handB = K.pinch(BK.x, BK.y, BK.s, { mirror: true });
const heldB = G(A3.c, handB.back + K.kernel(BK.x, BK.y, BK.s) + handB.front);
const heldBs = A(heldB, { ox: BK.x + 1.6 * BK.s, oy: BK.y + 0.6 * BK.s });
const bubble = K.speech(storyboard.shots.find((sh) => sh.id === "s02").voice, 360, 1300, 570, 430, 1480);
const bubbleA = G(A3.c, bubble.markup);
drawings([kidSquint, kidWow], [[0, 0], [5.35, 1], [47.7, 0]]);
tl.set(heldBs, { r: -6 }, 4.1); tl.set(heldBs, { r: 3 }, 4.45); tl.set(heldBs, { r: -4 }, 4.8); tl.set(heldBs, { r: 0 }, 5.15);
popIn(bubbleA, 640, 1380, said("s02") - 0.02, { kind: "pop", note: "the kid asks: speech bubble", from: 0.6 });
hideFrom(bubbleA, 47.7);
cap("s01", "pA", 56, 240, 380, s.s02.start + 0.05);
showPage("pA", 0, 6.45);
// s02: the camera goes down to the kid as he asks, then dives into the kernel he holds
camTo("pA", { z: 1.03 }, 0, 3.3, "none");
camTo("pA", { x: 540, y: 1192, z: 1.32 }, 3.45, 0.5, "power2.inOut");
camTo("pA", { y: 1224, z: 1.38 }, 3.95, 1.9, "none");
camTo("pA", { x: BK.x, y: BK.y, z: 5.5 }, 5.88, 0.32, "power2.in");
ev("zoom", 5.88, 6.2, "the camera dives into the kernel");

// ══ P2 · pB: inside the kernel (s03, s04) ═══════════════════════════════════════════════════════════════════════
const pB = page("pB");
const B1 = panel(pB.cam, [X0, Y0, X1, 700], { tint: C.yellow });
const B2 = panel(pB.cam, [X0, 720, X1, Y1], { tint: C.blue, r: 2.8 });
// top: the whole kernel, a cut marked down its middle; below: the kernel cut open there
G(B1.c, K.kernel(790, 400, 330, { rot: 10 }) + `<g transform="rotate(10 790 400)">${K.ink("M790 210V590", 9, C.red, 'stroke-dasharray="26 18"')}</g>` + K.ink("M600 650q60 30 120 0", 6) + K.ink("M700 640l22 12l-14 18", 6));
const SC = { x: 540, y: 1300, s: 920 };
const secC = K.section(SC.s);
const secCg = G(B2.c, `<g transform="translate(${SC.x} ${SC.y})">${secC.base}${secC.layers}</g>`);
const inC = secCg.firstChild;
const dropsC = secC.drops.map((d) => G(inC, d));
const softMarkC = G(inC, secC.softMark).firstChild;
const hullMarkC = G(inC, secC.hullMark).firstChild;
const at = (p) => [SC.x + p[0], SC.y + p[1]];
const callC = {
  air: G(B2.c, K.callout(`AIR ±${MOISTURE}%`, 300, 905, ...at(secC.dropXY[0]), { size: 60, face: "Bangers", colour: C.blue })),
  kulit: G(B2.c, K.callout("KULIT", 830, 790, ...at([0.4 * SC.s, -0.2 * SC.s]), { size: 46 })),
  keras: G(B2.c, K.callout("PATI KERAS", 245, 1420, ...at(secC.at.glass), { size: 44 })),
  lembaga: G(B2.c, K.callout("LEMBAGA", 790, 1440, ...at([0.08 * SC.s, 0.22 * SC.s]), { size: 44 })),
  lembut: G(B2.c, K.callout("PATI LEMBUT", 700, 920, ...at([0.2 * SC.s, -0.12 * SC.s]), { size: 46, colour: C.red })),
};
showPage("pB", 6.17, 15.5);
// the page grows out of the kernel the camera dived into
tl.set(pB.st, { z: 0.62 }, 6.17);
tl.to(pB.st, { z: 1, duration: 0.28, ease: "power2.out" }, 6.17);
cap("s03", "pB", 56, 240, 540, s.s04.start);
cap("s04", "pB", 56, 240, 540, 15.4);
dropsC.forEach((d, i) => popIn(d, ...secC.dropXY[i], 8.07 + i * 0.13, { kind: "plip", note: `water drop ${i + 1}` }));
popIn(callC.kulit, 830, 790, 7.11, { kind: "knock", note: "KULIT" });
popIn(callC.air, 300, 905, 8.75, { kind: "knock", note: "AIR ±14%" });
popIn(callC.keras, 245, 1420, 9.4, { kind: "knock", note: "PATI KERAS" });
popIn(callC.lembaga, 790, 1440, 9.9, { kind: "knock", note: "LEMBAGA" });
camTo("pB", { z: 1.04, y: 980 }, 6.4, 4.5, "none");
// s04: the soft starch is inked round in red; then the camera pushes into the hull, and the hull is inked heavy
camTo("pB", { z: 1.09, y: 1010 }, 10.9, 2.15, "none");
drawOn(softMarkC, 12.11, { duration: 0.34 });
popIn(callC.lembut, 700, 920, 12.47, { kind: "knock", note: "PATI LEMBUT" });
for (const el of [callC.air, callC.keras, callC.lembaga]) popOut(el, 12.9);
popOut(callC.lembut, 13.08, 0.1);
popOut(callC.kulit, 13.08, 0.1);
const HULLPT = at([0.405 * SC.s, -0.05 * SC.s]);
camTo("pB", { x: HULLPT[0] - 120, y: HULLPT[1], z: 2.6 }, 13.08, 0.5, "power2.inOut");
ev("push", 13.08, 13.58, "the camera pushes into the hull");
drawOn(hullMarkC, 13.59, { duration: 0.42 });
const rapat = G(pB.ov, K.callout("KULIT KERAS & RAPAT", 480, 1330, 820, 990, { size: 48, colour: C.red }));
popIn(rapat, 480, 1330, 13.95, { kind: "knock", note: "KULIT KERAS & RAPAT" });
hideFrom(rapat, 15.4);
// s04 -> s05: the pan's page pushes in from the right
tl.to(pB.pt, { x: -1080, duration: 0.4, ease: "expo.out" }, 15.0);
ev("whoosh", 15.0, 15.4, "the pan's page pushes in");

// ══ P3 · pC: heat makes steam (s05) ═════════════════════════════════════════════════════════════════════════════
const pC = page("pC");
const C1 = panel(pC.cam, [X0, Y0, X1, 900], { tint: C.red });
const C2 = panel(pC.cam, [X0, 920, X1, Y1], { tint: C.blue, r: 2.8 });
const pan = K.wajan(600, 600, 640, { kernels: 4, seed: 5 });
G(C1.c, pan.back + pan.contents + pan.front);
const heatC = [G(C1.c, K.heat(600, 468, 640, 0)), G(C1.c, K.heat(600, 468, 640, 1))];
const ssss = G(C1.c, K.soundWord("SSSS", 190, 800, 92, { rot: -8 }));
const [zx, zy] = pan.kernelXY[2];
const zoomRing = G(C1.c, K.obj("", K.ink(`M${zx - 46} ${zy}a46 42 0 1 0 92 0a46 42 0 1 0 -92 0`, 12) + K.ink(`M${zx - 46} ${zy}a46 42 0 1 0 92 0a46 42 0 1 0 -92 0`, 6, C.red) + K.ink(`M${zx - 40} ${zy + 30}L120 900M${zx + 40} ${zy + 30}L960 900`, 5, C.ink, 'stroke-dasharray="16 12"')));
const SD = { x: 540, y: 1420, s: 860 };
const secD = K.section(SD.s);
const secDg = G(C2.c, `<g transform="translate(${SD.x} ${SD.y})">${secD.base}</g>`).firstChild;
const dropsD = secD.drops.map((d) => G(secDg, d));
const wispsD = secD.wisps.map((d) => G(secDg, d));
G(secDg, secD.cover);
const airD = G(C2.c, K.callout("AIR", 230, 1000, SD.x + secD.dropXY[0][0], SD.y + secD.dropXY[0][1], { size: 56, face: "Bangers", colour: C.blue }));
const uapD = G(C2.c, K.callout("UAP", 820, 1000, SD.x + secD.wispXY[2][0], SD.y + secD.wispXY[2][1] - 40, { size: 56, face: "Bangers", colour: C.red }));
showPage("pC", 14.98, 18.3);
slideIn("pC", 15.0, [1080, 0], 0.4);
cycle(heatC, 15.0, 18.3, { rate: 6 });
cap("s05", "pC", 56, 240, 400, 18.3);
popIn(ssss, 190, 770, 15.4, { kind: "sizzle", note: "SSSS: the oil sizzles" });
popIn(zoomRing, zx, zy, 16.2, { kind: null, from: 0.6 });
popIn(airD, 230, 1000, 16.23, { kind: "knock", note: "AIR" });
// each drop of water turns to steam, on the twelves
dropsD.forEach((d, i) => { const t = 16.79 + i * 0.1; hideFrom(d, t); popIn(wispsD[i], ...secD.wispXY[i], t, { kind: "puff", note: `drop ${i + 1} turns to steam`, from: 0.4 }); });
popIn(wispsD[6], ...secD.wispXY[6], 17.39, { kind: null, from: 0.4 });
popIn(wispsD[7], ...secD.wispXY[7], 17.39, { kind: null, from: 0.4 });
popOut(airD, 16.79);
popIn(uapD, 820, 1000, 17.45, { kind: "knock", note: "UAP" });
camTo("pC", { y: 1048, z: 1.1 }, 16.2, 1.6, "power1.inOut");
// s05 -> s06: the camera dives into the steaming kernel
camTo("pC", { x: SD.x, y: SD.y - 60, z: 2.4 }, 17.86, 0.3, "power2.in");
ev("zoom", 17.86, 18.16, "dive into the steaming kernel");

// ══ P4 · pD: the hull holds the steam; like a pressure cooker (s06) ═════════════════════════════════════════════
const pD = page("pD");
const D1 = panel(pD.cam, [X0, Y0, 530, Y1], { tint: C.blue, r: 2.8 });
const D2 = panel(pD.cam, [550, Y0, X1, Y1], { tint: C.yellow });
const SE = { x: 279, y: 1000, s: 560 };
const secE = K.section(SE.s);
const secEg = G(D1.c, `<g transform="translate(${SE.x} ${SE.y})">${secE.base}${secE.wisps.join("")}</g>`).firstChild;
const arrowsE = [0.27, 0.33, 0.4].map((r1) => G(secEg, secE.arrows.map((a) => secE.arrowMark(a, 0.13 * SE.s, Math.min(a.reach, r1 * SE.s))).join("")));
G(secEg, secE.cover);
const secEs = A(secEg.parentNode, { ox: SE.x, oy: SE.y });
const naik = G(D1.c, K.callout("TEKANAN NAIK", 290, 655, SE.x + 20, SE.y - 0.47 * SE.s, { size: 44, colour: C.red }));
const pr = K.presto(780, 1040, 330);
G(D2.c, pr.body);
const weightD = G(D2.c, pr.weight);
const weightDs = A(weightD, { ox: 780, oy: 875 });
const prWisps = [G(D2.c, K.steamJet(775, 850, 190, { seed: 3, n: 3, w: 26, line: 5 })), G(D2.c, K.steamJet(775, 850, 240, { seed: 7, n: 3, w: 30, line: 5 }))];
const psst = G(D2.c, K.soundWord("PSST", 880, 640, 96, { rot: 9 }));
const sama = G(D2.c, K.callout("PRINSIPNYA SAMA", 760, 1420, null, null, { size: 40 }));
showPage("pD", 18.0, 22.62);
// it arrives already close on the kernel (the dive carries on), then the camera holds on it as the pressure rises
Object.assign(pD.st, { x: SE.x + 10, y: SE.y - 40, z: 2.2 });
tl.to(pD.st, { z: 1.55, duration: 0.4, ease: "power2.out" }, 18.0);
cap("s06", "pD", 56, 240, 450, 22.4);
drawings(arrowsE, [[18.51, 0], [19.75, 1], [20.39, 2]]);
tl.set(secEs, { k: 1.025 }, 19.75); tl.set(secEs, { k: 1.05 }, 20.39);
ev("press", 18.51, 18.6, "pressure arrows appear"); ev("press", 19.75, 19.85, "the arrows grow"); ev("press", 20.39, 20.5, "the arrows grow again");
camTo("pD", { y: SE.y - 120, z: 1.62 }, 18.5, 2.3, "none");
popIn(naik, 290, 655, 19.75, { kind: "knock", note: "TEKANAN NAIK" });
popOut(naik, 20.86, 0.08);
ev("hiss", 18.5, 21.0, "the steam's hiss rises with the pressure");
// the camera pans across to the cooker as the line names it
camTo("pD", { x: 790, y: 960, z: 1.45 }, 20.92, 0.5, "power2.inOut");
ev("whoosh", 20.92, 21.4, "the camera pans to the panci presto");
film.each((t) => { if (t >= 21.3 && t < 22.45) weightDs.y = Math.floor(t * 12 + 1e-6) % 2 ? -7 : 0; });
cycle(prWisps, 21.43, 22.7, { rate: 6 });
for (const el of prWisps) hideUntil(el, 21.43);
popIn(psst, 880, 610, 21.43, { kind: "psst", note: "PSST: the cooker lets steam out" });
ev("rattle", 21.3, 22.4, "the weight rattles");
popIn(sama, 760, 1420, 21.71, { kind: "knock", note: "PRINSIPNYA SAMA" });
camTo("pD", { x: 540, y: 960, z: 1 }, 21.95, 0.3, "power2.inOut");
// s06 -> s07: the page flips over
tl.to(pD.pt, { fx: 0, duration: 0.16, ease: "power2.in" }, 22.26);
ev("flip", 22.26, 22.6, "the page flips over");

// ══ P5 · pE: 180 °C in the oil, nine times the air's pressure in the kernel (s07, s07b) ═════════════════════════
const pE = page("pE");
const E1 = panel(pE.cam, [X0, Y0, X1, 860], { tint: C.red });
const E2 = panel(pE.cam, [X0, 880, X1, Y1], { tint: C.yellow });
const panE = K.wajan(560, 640, 600, { kernels: 1, seed: 9, ks: 0.15 });
const TH = K.thermometer(706, 230, 600, THERMO_MAX, { r: 26 });
G(E1.c, panE.back + TH.glass);
const column = G(E1.c, `<path fill="${C.red}" stroke="${C.ink}" stroke-width="5"/>`).firstChild;
G(E1.c, TH.bulb + panE.contents + panE.front);
const heatE = [G(E1.c, K.heat(560, 560, 420, 0)), G(E1.c, K.heat(560, 560, 420, 1))];
const temp = { v: 60 };
late(() => column.setAttribute("d", TH.columnD(temp.v)));
const tempE = G(E1.c, K.soundWord(`±${POP_C} °C`, 380, 440, 92, { rot: -3 }) + K.ink(`M552 408L${706 - 30} ${TH.yOf(POP_C)}`, 7) + `<circle cx="${706 - 30}" cy="${TH.yOf(POP_C)}" r="9" fill="${C.ink}"/>`);
// the gauge, its stem pushed into the kernel it measures
const GA = { x: 380, y: 1300, r: 220 };
const gE = K.gauge(GA.x, GA.y, GA.r, { max: GAUGE_MAX });
const KE = { x: 380, y: 1760, s: 280 };
G(E2.c, K.pipe(GA.x, GA.y + GA.r * 1.08, KE.x, KE.y - KE.s * 0.44, 24));
const kernE = [G(E2.c, K.kernel(KE.x, KE.y, KE.s)), G(E2.c, K.kernel(KE.x, KE.y, KE.s, { strain: true }))];
G(E2.c, gE.body);
const needleE = G(E2.c, K.needle(GA.x, GA.y, GA.r));
const pressure = { v: 1 };
late(() => needleE.setAttribute("transform", `rotate(${(150 + (240 * pressure.v) / GAUGE_MAX).toFixed(2)} ${GA.x} ${GA.y})`));
const nine = G(E2.c, K.approx(668, 1146, 70) + K.soundWord("9", 790, 1180, 120, { rot: 0, skew: -4 }) + K.times(866, 1140, 26) + K.letter("TEKANAN", 790, 1252, 58, { face: "bang", colour: C.red }) + K.letter("UDARA", 790, 1316, 58, { face: "bang", colour: C.red }));
const kpa = G(E2.c, K.letter(`${POP_KPA} kPa`, 790, 1392, 40) + K.letter(`${PSI} psi`, 790, 1440, 40));
const kernEs = kernE.map((el) => A(el, { ox: KE.x, oy: KE.y }));
showPage("pE", 22.42, 27.72);
Object.assign(pE.pt, { fx: 0 });
tl.to(pE.pt, { fx: 1, duration: 0.18, ease: "power2.out" }, 22.42);
cycle(heatE, 22.4, 25, { rate: 6 });
cap("s07", "pE", 56, 240, 400, s.s07b.start - 0.03);
// the column climbs in three held drawings and stops at the value; the number appears only when it gets there
tl.set(temp, { v: 100 }, 22.95); tl.set(temp, { v: 140 }, 23.35); tl.set(temp, { v: POP_C }, 23.67);
ev("whistle", 22.55, 23.67, "a rising whistle that stops on the value");
popIn(tempE, 380, 410, 23.75, { kind: "knock", note: "±180 °C" });
camTo("pE", { x: 600, y: 470, z: 1.22 }, 22.6, 1.1, "power2.inOut");
// s07b: the camera draws back to the whole page: the oil's heat above, the kernel's pressure below
camTo("pE", { x: 540, y: 960, z: 1 }, 24.42, 0.5, "power2.inOut");
ev("whoosh", 24.42, 24.9, "the camera draws back to the gauge");
cap("s07b", "pE", 56, 900, 870, 27.72);
tl.set(pressure, { v: 3.5 }, 24.75); tl.set(pressure, { v: 6.5 }, 25.15); tl.set(pressure, { v: TIMES_AIR }, 25.67);
ev("needle", 24.75, 24.8, "needle step"); ev("needle", 25.15, 25.2, "needle step"); ev("needle", 25.67, 25.72, "needle stops at 9.2");
film.each((t) => { if (t >= 25.84 && t < 27.72) pressure.v = TIMES_AIR + (Math.floor(t * 6 + 1e-6) % 2 ? 0.09 : -0.09); });
popIn(nine, 790, 1240, 25.75, { kind: null });
popIn(kpa, 790, 1415, 26.55, { kind: "knock", note: "931 kPa · 135 psi" });
// the kernel strains: shake marks, trembling, harder and harder
drawings(kernE, [[0, 0], [25.67, 1]]);
film.each((t) => {
  if (t < 25.67 || t >= 27.72) return;
  const n = Math.floor(t * 12 + 1e-6), a = 1.5 + 3 * (t - 25.67) / 2;
  for (const st of kernEs) { st.x = (n % 2 ? 1 : -1) * a; st.r = (n % 2 ? 1 : -1) * 1.2; }
});
ev("roll", 25.8, 27.65, "a tense drum roll under the strain");
ev("creak", 26.3, 27.2, "the hull creaks");
// s07b -> s08: the camera dives at the straining kernel: the page breaks
camTo("pE", { x: KE.x, y: KE.y, z: 3.6 }, 27.38, 0.32, "power2.in");
ev("zoom", 27.38, 27.7, "dive into the kernel");

// ══ P6 · pG: the splash (s08) ═══════════════════════════════════════════════════════════════════════════════════
const pG = page("pG");
const tornD = "M28 40H1052V1880H28Z";
G(pG.cam, `<path d="${tornD}" fill="url(#paperPat)"/><path d="${K.dotPath(K.dots(28, 40, 1052, 1880, { step: 18, r0: 3, r1: 3, min: 0 }), [{ d: tornD }])}" fill="${C.red}" transform="translate(${K.MIS[0]} ${K.MIS[1]})"/><path d="${tornD}" fill="none" stroke="${C.ink}" stroke-width="12" stroke-linejoin="round"/>`);
const KG = { x: 540, y: 960, s: 640 };
const kernG = [0, 1, 2].map((c) => G(pG.cam, K.kernel(KG.x, KG.y, KG.s, { crack: c, strain: true })));
const kernGs = kernG.map((el) => A(el, { ox: KG.x, oy: KG.y, o: 0 }));
// the splash: full bleed, past every edge of the page; the hull torn open, steam bursting out of the split
const splash = G(pG.cam, `<rect x="-40" y="-40" width="1160" height="2000" fill="url(#paperPat)"/><path d="${K.dotPath(K.dots(-40, -40, 1120, 1960, { step: 18, r0: 2.6, r1: 6.6, from: [540, 960], to: [1120, 1960] }))}" fill="${C.red}" transform="translate(${K.MIS[0]} ${K.MIS[1]})"/>${K.speedLines(540, 960, 600, 1500, { n: 30, seed: 12, width: 28 })}`);
const splashBurst = G(pG.cam, K.burst(540, 960, 380, 760, { seed: 11, n: 18, w: 13, inner: 0.55 }));
const splitG = K.openKernel(540, 1010, 560, { open: 0.32 });
const splashKernel = G(pG.cam, splitG.flaps + K.steamJet(540, 800, 330, { seed: 21, n: 5, w: 58, line: 8, spread: 34 }) + splitG.base);
const popG = G(pG.cam, K.soundWord("POP!", 560, 720, 300, { rot: -7 }));
hideUntil(splash, 29.59);
const splashBurstS = A(splashBurst, { ox: 540, oy: 960, o: 0 }), splashKernelS = A(splashKernel, { ox: 540, oy: 1010, o: 0 });
showPage("pG", 27.69, 30.17);
cap("s08", "pG", 56, 240, 560, 30.17);
drawings(kernG, [[27.69, 0], [28.11, 1], [28.67, 2], [29.59, -1]]);
ev("crack", 28.11, 28.2, "the first crack"); ev("crack", 28.67, 28.75, "the crack spreads");
film.each((t) => {
  if (t < 27.69 || t >= 29.59) return;
  const n = Math.floor(t * 12 + 1e-6), a = 2 + 6 * Math.max(0, (t - 27.69) / (29.59 - 27.69));
  for (const st of kernGs) { st.x = (n % 2 ? 1 : -1) * a; st.y = (n % 2 ? -1 : 1) * a * 0.4; }
});
tl.set(splashBurstS, { o: 1, k: 1.35 }, 29.59);
tl.to(splashBurstS, { k: 1, duration: 0.3, ease: "back.out(2)" }, 29.59);
tl.set(splashKernelS, { o: 1, k: 0.92 }, 29.59);
tl.to(splashKernelS, { k: 1.06, duration: 0.5, ease: "power2.out" }, 29.59);
popIn(popG, 560, 630, 29.67, { from: 1.7, dur: 0.3, ease: "back.out(1.8)", kind: null });
ev("POP", 29.59, 30.0, "THE POP: the hull gives way");
shake("pG", 29.59, 12);
// s08 -> s09: a cut to the first panel of the next page, close on the same kernel, torn open, at the same angle

// ══ P7 · pH: one kernel, three moments: the steam jets out, the starch foams, the foam sets (s09, s09b, s10) ════
const pH = page("pH");
const H = [[X0, Y0, X1, 640], [X0, 660, X1, 1260], [X0, 1280, X1, Y1]];
const H1 = panel(pH.cam, H[0], { tint: C.blue, r: 2.8 });
const H2 = panel(pH.cam, H[1], { tint: C.red });
const H3 = panel(pH.cam, H[2], { tint: C.red });
const KS9 = 300;
// panel 1: the hull split, its flaps peeling back, steam jetting from the split
const op1 = K.openKernel(540, 450, KS9, { open: 0.55 });
const jets9 = [
  op1.flaps + K.steamJet(540, 380, 160, { seed: 31, n: 3, w: 36, line: 6 }) + op1.base,
  op1.flaps + K.steamJet(540, 380, 250, { seed: 33, n: 4, w: 40, line: 6, spread: 30 }) + op1.base + K.motionLines([[400, 170], [430, 250], [650, 170], [680, 250]], 110, 7),
];
const jet9 = jets9.map((m) => G(H1.c, m));
const fwoosh = G(H1.c, K.soundWord("FWOOSH", 700, 250, 92, { rot: -10 }));
// panel 2: the soft starch swelling out through the open flaps as foam
const op2 = K.openKernel(540, 1070, KS9, { open: 0.9 });
const foamH = [0.35, 0.6, 0.85].map((g, i) => G(H2.c, op2.flaps + K.foam(540, 1000 - 70 * g, 230, { seed: 3, bubbles: 4 + i * 3, grow: g }) + op2.base));
const lembut = G(H2.c, K.callout("PATI LEMBEK", 400, 740, 480, 930, { size: 44 }));
const busaH = G(H2.c, K.callout("BUSA", 730, 760, 660, 880, { size: 62, face: "Bangers", colour: C.red }));
// panel 3: the foam set hard: popcorn, the hull curled at its base; the panel cools from red to blue
const flakeH = G(H3.c, K.flake(540, 1610, 240, { seed: 3 }));
const flakeHs = A(flakeH, { ox: 540, oy: 1600 });
const blueH = document.createElementNS(NS, "path");
const halfD = "M-100 1280L1300 1280L-100 2680Z"; // the upper left half of panel 3 (x + y < 1180 + 1280)
const screenH = (tests) => K.dotPath(K.dots(X0, 1280, X1, Y1, { step: 18, r0: 3.3, r1: 3.3, min: 0 }), tests);
const redHalf = screenH([{ d: halfD, out: true }]), blueHalf = screenH([{ d: halfD }]), blueAll = screenH([]);
Object.entries({ fill: C.blue, transform: `translate(${K.MIS[0]} ${K.MIS[1]})`, d: "M0 0Z" }).forEach(([k, v]) => blueH.setAttribute(k, v));
H3.tint.after(blueH);
const keras = G(H3.c, K.callout("BUSANYA MENGERAS", 640, 1318, 600, 1400, { size: 40 }));
const sisa = G(H3.c, K.callout("SISA KULIT", 300, 1484, 500, 1760, { size: 40 }));
const inset = G(H3.c, `<rect x="186" y="1296" width="236" height="120" fill="url(#paperPat)" stroke="${C.ink}" stroke-width="7"/>` + K.kernel(226, 1356, 74, { rot: -10 }) + K.letter("ukuran tidak", 336, 1338, 26) + K.letter("sebenarnya", 336, 1372, 26));
const frost = G(H3.c, K.obj("", K.ink("M884 1560l-26 26M898 1600l-34 6M900 1700l-32 -10M870 1800l-30 -14M160 1760l30 -14M190 1830l26 -24", 8, C.blue)));
const kres = G(H3.c, K.soundWord("KRES!", 760, 1470, 96, { rot: 9 }));
showPage("pH", 30.17, 36.0);
// the strip arrives with the camera close on its first panel, still settling from the blast
Object.assign(pH.st, { x: 540, y: 340, z: 1.6 });
tl.to(pH.st, { z: 1.3, duration: 0.25, ease: "power2.out" }, 30.17);
cap("s09", "pH", 56, 240, 300, s.s09b.start);
drawings(jet9, [[0, 0], [30.42, 1]]);
popIn(fwoosh, 700, 220, 30.59, { kind: "fwoosh", note: "FWOOSH" });
ev("steam", 30.17, 30.9, "the steam jets out");
// s09b: the camera goes down a panel: the starch foams up through the flaps
camTo("pH", { y: 960, z: 1.3 }, 31.2, 0.4, "power2.inOut");
ev("whoosh", 31.2, 31.6, "down to the next panel");
cap("s09b", "pH", 56, 240, 420, s.s10.start);
drawings(foamH, [[0, 0], [32.03, 1], [32.42, 2]]);
ev("blub", 32.03, 32.2, "the foam swells"); ev("blub", 32.42, 32.55, "and swells");
popIn(lembut, 400, 740, 31.67, { kind: "knock", note: "PATI LEMBEK" });
popIn(busaH, 730, 760, 32.91, { kind: "knock", note: "BUSA" });
// s10: down again: the foam set hard; the dots cool from red to blue in two steps; the second as the band stops
camTo("pH", { y: 1560, z: 1.3 }, 33.3, 0.4, "power2.inOut");
ev("whoosh", 33.3, 33.7, "down to the last panel");
cap("s10", "pH", 56, 240, 430, 35.8);
jiggle(flakeHs, 33.3, 34.9, { a: 2.5, rate: 6 });
tl.set(flakeHs, { x: 0, y: 0 }, 34.9);
tl.set(H3.tint, { attr: { d: redHalf } }, 33.63); tl.set(blueH, { attr: { d: blueHalf } }, 33.63);
ev("cool", 33.63, 33.7, "the dots turn blue: half");
popOut(lembut, 33.3, 0.08);
popOut(busaH, 33.3, 0.08);
popIn(keras, 640, 1318, 33.75, { kind: "knock", note: "BUSANYA MENGERAS" });
popIn(sisa, 300, 1484, 34.2, { kind: "knock", note: "SISA KULIT" });
popIn(inset, 304, 1356, 34.42, { kind: "knock", note: "the kernel before, not to its size" });
tl.set(H3.tint, { attr: { d: "M0 0Z" } }, 34.9); tl.set(blueH, { attr: { d: blueAll } }, 34.9);
popIn(frost, 540, 1600, 34.9, { kind: null, from: 0.9, dur: 0.1 });
// in the band's rest the camera draws back over all three panels: one kernel, three moments; it crunches
camTo("pH", { x: 540, y: 960, z: 1 }, 34.9, 0.45, "power2.inOut");
popIn(kres, 760, 1440, 35.45, { kind: "crunch", note: "KRES! the set foam crunches, in the band's rest" });

// ══ P8 · pJ: what makes the sound (s11, s11b) ═══════════════════════════════════════════════════════════════════
const pJ = page("pJ");
const J1 = panel(pJ.cam, [X0, Y0, 530, Y1], { tint: C.yellow });
const J2 = panel(pJ.cam, [550, Y0, X1, Y1], { tint: C.blue, r: 2.8 });
G(J1.c, K.kernel(279, 1020, 360, { crack: 2, rot: -14 }));
const xMark = G(J1.c, K.ink("M110 600L450 790", 24, C.red) + K.ink("M450 600L110 790", 24, C.red));
const krak = G(J1.c, K.soundWord("KRAK?", 279, 740, 118, { colour: C.ink, shadow: C.white, rot: -6 }));
const opJ = K.openKernel(801, 1150, 330, { open: 0.3 });
const jetJ = [
  `<g transform="rotate(8 801 1150)">${opJ.flaps + K.steamJet(801, 1030, 90, { seed: 41, n: 2, w: 26, line: 5 }) + opJ.base}</g>`,
  `<g transform="rotate(8 801 1150)">${opJ.flaps + K.steamJet(801, 1030, 330, { seed: 43, n: 4, w: 40, line: 6, spread: 26 }) + opJ.base}</g>` + K.motionLines([[650, 640], [680, 760], [930, 650], [905, 760]], 150, 7),
].map((m) => G(J2.c, m));
const popJ = G(J2.c, K.soundWord("POP!", 790, 690, 124, { rot: -6 }));
const popJs = A(popJ, { ox: 790, oy: 650, o: 0 });
const tick = G(J2.c, K.ink("M620 1440L662 1490L750 1380", 34, C.ink) + K.ink("M620 1440L662 1490L750 1380", 20, C.blue));
const uapJ = G(J2.c, K.callout("UAP!", 860, 1300, 812, 980, { size: 58, face: "Bangers", colour: C.red }));
showPage("pJ", 35.77, 40.1);
// the two panels close in from both sides, landing as the band comes back (35.9 s)
{ const L = A(J1.g, { x: -560 }), R = A(J2.g, { x: 560 }); tl.to(L, { x: 0, duration: 0.14, ease: "power2.out" }, 35.77); tl.to(R, { x: 0, duration: 0.14, ease: "power2.out" }, 35.77); }
ev("split", 35.77, 35.92, "two panels close in");
Object.assign(pJ.st, { x: 279, y: 900, z: 1.25 });
cap("s11", "pJ", 56, 240, 440, 40.1);
popIn(krak, 279, 700, 35.95, { kind: "krak", note: "KRAK? (a dry crack)" });
drawOn(xMark, 36.71, { duration: 0.3, gap: 0.12 });
ev("nope", 37.05, 37.4, "the X: no");
// s11b: the camera crosses to the right panel: the steam jets out and the POP rides out on it
camTo("pJ", { x: 801, y: 900, z: 1.25 }, 37.9, 0.4, "power2.inOut");
cap("s11b", "pJ", 580, 240, 350, 40.1);
drawings(jetJ, [[0, 0], [38.39, 1]]);
tl.set(popJs, { o: 1, y: 300, k: 0.6 }, 38.39);
tl.to(popJs, { y: 0, k: 1, duration: 0.25, ease: "back.out(1.6)" }, 38.39);
ev("steampop", 38.39, 38.6, "the clean pop: steam escaping");
drawOn(tick, 38.83, { duration: 0.2 });
ev("ding", 38.9, 39.3, "the tick");
popIn(uapJ, 860, 1300, 39.19, { kind: "knock", note: "UAP!" });
camTo("pJ", { x: 540, y: 960, z: 1 }, 39.35, 0.35, "power2.inOut");
// s11b -> s12: the next page pushes in from below
tl.to(pJ.pt, { y: -1920, duration: 0.36, ease: "expo.out" }, 39.74);

// ══ P9 · pK: the one that did not pop (s12, s12b) ═══════════════════════════════════════════════════════════════
const pK = page("pK");
const K1 = panel(pK.cam, [X0, Y0, X1, 860], { tint: C.red });
const K2 = panel(pK.cam, [X0, 880, 530, Y1], { tint: C.yellow });
const K3 = panel(pK.cam, [550, 880, X1, Y1], { tint: C.blue, r: 2.8 });
const panK = K.wajan(540, 700, 900, { kernels: 0, flames: false, seed: 4 });
const panKg = G(K1.c, panK.back);
const heap = [[220, 600, 112, 21, -20], [840, 590, 118, 22, 15], [380, 700, 110, 23, 30], [700, 700, 114, 24, -35], [160, 730, 90, 25, 50], [920, 720, 92, 26, -10], [560, 520, 98, 27, 70], [330, 520, 86, 28, -60], [760, 470, 90, 29, 25]];
const flakesK = heap.map(([x, y, r, sd, rot]) => G(panKg, `<g transform="rotate(${rot} ${x} ${y})">${K.flake(x, y, r, { seed: sd })}</g>`));
flakesK.forEach((el, i) => jiggle(A(el), 39.7, 41.7, { a: 2.5, rate: 6, seed: i }));
const KK = { x: 540, y: 640, s: 170 };
const kernK = G(K1.c, K.kernel(KK.x, KK.y, KK.s, { rot: 24 }));
const crackK = G(kernK, `<g transform="rotate(24 ${KK.x} ${KK.y})">${K.obj("", K.ink(K.crackPath(KK.x, KK.y, KK.s, 0), 7))}</g>`);
G(panKg, panK.front);
const retakK = G(K1.c, K.callout("RETAK", 760, 330, KK.x + 10, KK.y - 0.42 * KK.s, { size: 56, face: "Bangers" }));
// the two below: the same heat, the same scale; only the hull differs
const GL = { r: 130, y: 1462 };
G(K2.c, K.letter("UTUH", 279, 928, 62, { face: "bang" }));
const kernL = G(K2.c, K.kernel(279, 1135, 180, { rot: -10 }));
G(K2.c, K.gauge(279, GL.y, GL.r, { small: true, unit: false, labelSize: 38 }).body);
const needleL = G(K2.c, K.needle(279, GL.y, GL.r));
const meletus = G(K2.c, K.letter("MELETUS", 279, 1290, 40));
const popL = G(K2.c, K.burst(279, 1130, 74, 118, { seed: 21, n: 14 }) + K.flake(279, 1138, 70, { seed: 30 }) + K.soundWord("POP!", 320, 1075, 78, { rot: -8 }));
G(K3.c, K.letter("RETAK", 801, 928, 62, { face: "bang", colour: C.red }));
G(K3.c, K.kernel(801, 1150, 180, { rot: 12 }) + `<g transform="rotate(12 801 1150)">${K.obj("", K.ink(K.crackPath(801, 1150, 180, 0), 7))}</g>`);
G(K3.c, K.gauge(801, GL.y, GL.r, { small: true, unit: false, labelSize: 38 }).body);
const needleR = G(K3.c, K.needle(801, GL.y, GL.r));
const wisps = [0, 1].map((i) => G(K3.c, K.wisp(800 + i * 8, 1062, 80, { seed: 51 + i, w: 16, line: 4, curl: 1.4, angle: -70 }) + K.wisp(818, 1068, 64, { seed: 61 + i, w: 12, line: 4, angle: -50 })));
const fsss = G(K3.c, K.letter("fsss...", 880, 1030, 40, { extra: `transform="rotate(12 880 1030)"` }));
const nggak = G(K3.c, K.letter("NGGAK MELETUS", 778, 1290, 34, { colour: C.red }));
const pL = { v: 0.6 }, pR = { v: 0.6 };
late(() => {
  needleL.setAttribute("transform", `rotate(${(150 + (240 * pL.v) / GAUGE_MAX).toFixed(2)} 279 ${GL.y})`);
  needleR.setAttribute("transform", `rotate(${(150 + (240 * pR.v) / GAUGE_MAX).toFixed(2)} 801 ${GL.y})`);
});
showPage("pK", 39.72, 44.75);
slideIn("pK", 39.74, [0, 1920], 0.36);
ev("whoosh", 39.72, 40.1, "the pan of popcorn pushes in from below");
Object.assign(pK.st, { x: 540, y: 520, z: 1.3 });
cap("s12", "pK", 56, 240, 420, s.s12b.start);
drawOn(crackK, 41.39, { duration: 0.18 });
popIn(retakK, 760, 330, 41.45, { kind: "hmm", note: "RETAK (a doubtful trumpet slide)" });
// s12b: the camera draws back down the page to the two below
camTo("pK", { x: 540, y: 960, z: 1 }, 41.62, 0.4, "power2.inOut");
ev("split", 41.66, 42.0, "down to the two panels side by side");
cap("s12b", "pK", 56, 240, 420, 44.75);
// Both are heated; both needles rise together. The cracked one leaks at its crack and its needle sinks back;
// the whole one's climbs to 9.19 and it pops. (The right needle is an illustration, not a measurement: p5.)
for (const [t, l, r] of [[42.1, 2.5, 2.5], [42.35, 4, 4], [42.67, 6, 3.4], [43.07, 8, 2.2], [43.43, TIMES_AIR, 2.0]]) tl.set(pL, { v: l }, t), tl.set(pR, { v: r }, t);
ev("needle", 42.1, 42.15, "both needles rise"); ev("needle", 42.35, 42.4, "both needles rise");
cycle(wisps, 42.67, 44.8, { rate: 6 });
for (const el of wisps) hideUntil(el, 42.67);
ev("leak", 42.67, 43.9, "the steam leaks out of the crack");
popIn(fsss, 880, 1030, 43.07, { kind: null, from: 0.6 });
hideFrom(kernL, 43.45);
popIn(popL, 279, 1130, 43.45, { kind: "smallpop", note: "the whole kernel pops", from: 0.3 });
popIn(meletus, 279, 1290, 43.62, { kind: null });
popIn(nggak, 778, 1290, 43.62, { kind: "sad", note: "NGGAK MELETUS (a sad trombone)" });

// ══ P10 · pM: the answer on one page (s13) ══════════════════════════════════════════════════════════════════════
const pM = page("pM");
const M1 = panel(pM.cam, [X0, Y0, 530, 600], { tint: C.blue, r: 2.8 });
const M2 = panel(pM.cam, [550, Y0, X1, 600], { tint: C.yellow });
const M3 = panel(pM.cam, [X0, 620, 530, 1180], { tint: C.red });
const M4 = panel(pM.cam, [550, 620, X1, 1180], { tint: C.blue, r: 2.8 });
const M5 = panel(pM.cam, [X0, 1200, X1, Y1], { tint: C.red, r: 2.6 });
M5.g.querySelector(".pf").setAttribute("fill", C.yellow);
const plate = (text, x, y, size, colour) => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" class="bang" fill="${colour}" stroke="${C.white}" stroke-width="${size * 0.16}" paint-order="stroke" stroke-linejoin="round">${text}</text>`;
{
  const s1 = K.section(300);
  G(M1.c, `<g transform="translate(279 360)">${s1.base}${s1.drops.join("")}</g>` + plate("1 · AIR", 279, 572, 54, C.blue));
  const s2 = K.section(220);
  G(M2.c, `<g transform="translate(662 380)">${s2.base}${s2.wisps.join("")}${s2.arrows.map((a) => s2.arrowMark(a, 0.13 * 220, Math.min(a.reach, 0.4 * 220))).join("")}${s2.cover}</g>`);
  G(M2.c, plate("2 · UAP", 850, 280, 50, C.red) + plate(`±${POP_C} °C`, 850, 380, 48, C.ink) + K.approx(784, 444, 30) + plate("9", 846, 462, 52, C.ink) + K.times(884, 444, 13, C.ink) + plate("TEKANAN", 850, 516, 32, C.ink) + plate("UDARA", 850, 552, 32, C.ink));
  const o3 = K.openKernel(279, 940, 240, { open: 0.6 });
  G(M3.c, K.burst(279, 880, 115, 210, { seed: 31, n: 14 }) + o3.flaps + K.steamJet(279, 850, 150, { seed: 71, n: 3, w: 30, line: 5 }) + o3.base + plate("3 · POP!", 279, 1158, 58, C.red));
  G(M4.c, K.flake(801, 850, 160, { seed: 3 }) + plate("4 · BUSA", 801, 1100, 46, C.ink) + plate("MENGERAS", 801, 1152, 46, C.ink));
}
const eqA = (() => {
  const size = 64, parts = [["AIR", C.blue], [" + KULIT KERAS", C.ink], [" = POP!", C.red]];
  const ws = parts.map(([t]) => K.measure(t, size, "Bangers", 400) * 1.02), x0 = 540 - ws.reduce((a, b) => a + b, 0) / 2;
  let x = x0;
  return parts.map(([t, col], i) => { const el = G(M5.c, `<text x="${x}" y="1424" font-size="${size}" class="bang" fill="${col}" stroke="${C.white}" stroke-width="10" paint-order="stroke" style="white-space:pre">${t}</text>`); x += ws[i]; return el; });
})();
G(M5.c, K.burst(540, 1660, 120, 215, { seed: 77, n: 16 }) + K.flake(540, 1668, 96, { seed: 7 }));
showPage("pM", 44.0, 48.5);
cap("s13", "pM", 56, 1216, 870, 48.5, { size: 40 });
// The page turns: the page of the cracked kernel lifts from its right edge and folds back, its underside showing;
// the summary is already printed underneath. Each panel is then marked as the line passes it.
const TURN1 = [44.0, 0.62], TURN2 = [47.8, 0.62];
const turn1 = { e: 1080 };
tl.to(turn1, { e: 0, duration: TURN1[1], ease: "power1.inOut" }, TURN1[0]);
// (the summary page lies above the old one in the page order: it shows only right of the turning edge)
Object.assign(pM.pt, { clipL: 1080 });
tl.to(pM.pt, { clipL: 0, duration: TURN1[1], ease: "power1.inOut" }, TURN1[0]);
ev("turn", TURN1[0], TURN1[0] + TURN1[1], "the page turns to the summary");
[[44.62, M1], [44.95, M2], [45.28, M3], [45.61, M4]].forEach(([t, m], i) => {
  const st = A(m.g, { ox: (m.st.x0 + m.st.x1) / 2, oy: (m.st.y0 + m.st.y1) / 2 });
  tl.set(st, { k: 1.05 }, t);
  tl.to(st, { k: 1, duration: 0.25, ease: "power2.out" }, t + 1 / 12);
  ev("flick", t, t + 0.25, `summary panel ${i + 1}`);
});
// a slow push that keeps the equation's line where it is on screen (y 1374), clear of the caption above it
camTo("pM", { z: 1.04, y: 1374 - 414 / 1.04 }, 44.62, 3.1, "none");
hideUntil(eqA[0], 45.83); ev("stamp", 45.83, 46.05, "AIR stamps in");
hideUntil(eqA[1], 46.87); ev("stamp2", 46.87, 47.0, "+ KULIT KERAS stamps in");
popIn(eqA[2], 880, 1402, 47.5, { kind: "stinger", note: "= POP!", from: 1.5, dur: 0.24, ease: "back.out(1.8)" });
// s13 -> s14: this page in turn lifts away from its right edge; the opening page is under it
const turn2 = { e: 1080 };
tl.to(turn2, { e: 0, duration: TURN2[1], ease: "power1.inOut" }, TURN2[0]);
tl.to(pM.pt, { clipR: 1080, duration: TURN2[1], ease: "power1.inOut" }, TURN2[0]);
ev("turn", TURN2[0], TURN2[0] + TURN2[1], "the page turns back to the first page");

// ── The turning page: its underside folded back over the page still lying flat (opaque paper, ink edge, the
// printed side's dots showing faintly through), and a hard shadow on the page it uncovers ───────────────────────
const pT = page("pTurn");
const flap = G(pT.cam, `<path class="fs" fill="${C.ink}"/><path class="fl" fill="url(#paperPat)" stroke="${C.ink}" stroke-width="10" stroke-linejoin="round"/><path class="fd" fill="${C.ink}" opacity="0.5"/>`);
const flapD = flap.querySelector(".fl"), flapS = flap.querySelector(".fs"), flapDots = flap.querySelector(".fd");
film.each((t) => {
  const st = t >= TURN1[0] && t < TURN1[0] + TURN1[1] ? turn1 : t >= TURN2[0] && t < TURN2[0] + TURN2[1] ? turn2 : null;
  pT.sec.style.visibility = st ? "visible" : "hidden";
  pT.sec.style.opacity = st ? 1 : 0;
  if (!st) return;
  const e = st.e, w = Math.max(0, Math.min(1080 - e, e) * 0.62 + Math.min(80, 1080 - e));
  const fl = `M${e} -20L${e - w * 0.72} -20Q${e - w * 1.1} 960 ${e - w * 1.18} 1940L${e} 1940Z`;
  flapD.setAttribute("d", fl);
  flapDots.setAttribute("d", K.dotPath(K.dots(e - w * 1.2, -20, e, 1940, { step: 16, r0: 1.6, r1: 1.6, min: 0 }), [{ d: fl }]));
  const band = `M${e} -20L${e + 30 + w * 0.12} -20L${e + 40 + w * 0.18} 1940L${e} 1940Z`;
  flapS.setAttribute("d", K.dotPath(K.dots(e - 10, -20, e + 70 + w * 0.2, 1940, { step: 12, r0: 3, r1: 3, min: 0 }), [{ d: band }]));
});

// ══ s14: back to the opening page, exactly as frame 0, a moment before the loop ═══════════════════════════════════
showPage("pA", TURN2[0] - 0.02);
tl.set(pA.st, { x: 540, y: 960, z: 1.02 }, TURN2[0] - 0.02);
camTo("pA", { z: 1 }, 48.5, film.duration - 48.5 - 0.05, "power1.inOut");
cap("s14", "pA", 56, 240, 380, 49.55, { from: TURN2[0] + TURN2[1] });

// The lines live: the ink boils a little on every held drawing, 12 a second (kit/engine/ink.js). Off at the loop's
// seam so the last frame is the first.
for (const id of Object.keys(pages)) ink.boil(`#${id} .cam`, { rate: 12, amount: 1.1, from: 0.25, to: film.duration - 0.3 });
film.each((t) => { for (const w of writers) w(t); });
film.finish();
