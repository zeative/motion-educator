// "Gimana lebah bikin madu?" in the Watercolour template: a natural-history sketchbook. Built from storyboard.json:
// every time below is a shot's start or end, or a word of the take (voice/voice.json). Every number drawn comes
// from the fact sheet (storyboard.build.py): the nectar column is 80 : 20 by height, the s12 columns are 7 px a gram
// (100 g of nectar: 80 g water over 20 g sugar; 25 g of honey: 5 g water over the same 20 g of sugar).
//
// The plates (paint.js draws every real thing): A the opening (spoon, honey, jar, kaliandra), Q the question, B the
// kaliandra plate, C one flower and a worker at bee scale (her anatomy in s05), D inside the honey stomach, E one
// sucrose and the enzyme, F the hand-over on the comb, G the comb face, H the cells cut through with fanning bees,
// I the two columns, J the capped comb, K the jar and comb, L the recap. Washes bloom in under a pooled-edge filter;
// ink draws on stroke by stroke; italic labels are written letter by letter on thin leaders.
import { createFilm } from "../../kit/engine/motion.js";
import { createInk } from "../../kit/engine/ink.js";
import { createFlatBackdrop } from "../../kit/engine/backdrops.js";
import { C, W, K, pt, ell, hex, poly, STAND, drop, beeSide, beeTop, beeFlap, raceme, flower, bud, stamenPaint, jar, spoon, ribbon, combFace, fragment, cellFill, cellAt, cellSection, sucrose, enzyme, GUT, lerpPath, folds, tube, rng } from "./paint.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, $, gsap, shots: s } = film;
const D = film.duration;
const ink = createInk(film);
const SVG = "http://www.w3.org/2000/svg";
film.captions();

// Every wash, line, word and flood is logged with its time (render.mjs --events), so cues.build.py can put a brush,
// a pen or water on each.
const log = (window.__events = []);
const note = (kind, at, end = at, extra = {}) => log.push({ kind, at: +at.toFixed(3), end: +end.toFixed(3), ...extra });

// ── Filters: the wash (pigment pooled at its edge, blotched, granulated in the paper's tooth), the wet edge of a
//    bloom, and the flood (a big wash crossing the page) ───────────────────────────────────────────────────────────
document.querySelector("#ink-defs defs").insertAdjacentHTML("beforeend", `
  <filter id="wc" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="low"/>
    <feDisplacementMap in="SourceGraphic" in2="low" scale="6" xChannelSelector="R" yChannelSelector="G" result="bleed"/>
    <feGaussianBlur in="bleed" stdDeviation="0.8" result="soft"/>
    <feMorphology in="soft" operator="erode" radius="2.5" result="inner"/>
    <feComposite in="soft" in2="inner" operator="out" result="rim"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="11" result="blot"/>
    <feColorMatrix in="blot" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.55 0 0 0 0.62" result="blotA"/>
    <feComposite in="soft" in2="blotA" operator="arithmetic" k1="1" k2="0" result="body"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="1" seed="8" result="gran"/>
    <feColorMatrix in="gran" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.45 1.15" result="granA"/>
    <feComposite in="body" in2="granA" operator="in" result="granulated"/>
    <feMerge><feMergeNode in="granulated"/><feMergeNode in="rim"/></feMerge>
  </filter>
  <!-- a looser wash for the big simple shapes: laid a little wide and pushed about by the water, so it bleeds past
       the ink here and stops short of it there, as a wash laid over a pen drawing does -->
  <filter id="wcb" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
    <feMorphology in="SourceGraphic" operator="dilate" radius="2.5" result="fat"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="17" result="low"/>
    <feDisplacementMap in="fat" in2="low" scale="16" xChannelSelector="R" yChannelSelector="G" result="bleed"/>
    <feGaussianBlur in="bleed" stdDeviation="1" result="soft"/>
    <feMorphology in="soft" operator="erode" radius="3" result="inner"/>
    <feComposite in="soft" in2="inner" operator="out" result="rim"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="11" result="blot"/>
    <feColorMatrix in="blot" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.55 0 0 0 0.62" result="blotA"/>
    <feComposite in="soft" in2="blotA" operator="arithmetic" k1="1" k2="0" result="body"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="1" seed="8" result="gran"/>
    <feColorMatrix in="gran" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.45 1.15" result="granA"/>
    <feComposite in="body" in2="granA" operator="in" result="granulated"/>
    <feMerge><feMergeNode in="granulated"/><feMergeNode in="rim"/></feMerge>
  </filter>
  <radialGradient id="soft"><stop offset="0.7" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
  <filter id="wet" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="3" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="80" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="flood" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.009" numOctaves="3" seed="21" result="low"/>
    <feDisplacementMap in="SourceGraphic" in2="low" scale="70" xChannelSelector="R" yChannelSelector="G" result="bleed"/>
    <feGaussianBlur in="bleed" stdDeviation="2" result="soft"/>
    <feMorphology in="soft" operator="erode" radius="7" result="inner"/>
    <feComposite in="soft" in2="inner" operator="out" result="rim"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" seed="5" result="gran"/>
    <feColorMatrix in="gran" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.6 1.2" result="granA"/>
    <feComposite in="soft" in2="granA" operator="in" result="granulated"/>
    <feMerge><feMergeNode in="granulated"/><feMergeNode in="rim"/></feMerge>
  </filter>`);

// ── The sheet's deckled edge, over every plate (under the captions) ──────────────────────────────────────────────
{
  const c = Object.assign(document.createElement("canvas"), { id: "deckle", width: 1080, height: 1920 });
  const g = c.getContext("2d"), r = rng(17);
  const edge = (n) => Array.from({ length: n + 1 }, (_, i) => 10 + Math.sin(i * 0.37) * 3 + Math.sin(i * 1.3 + 1) * 2 + r() * 4);
  const top = edge(270), bot = edge(270), lef = edge(480), rig = edge(480);
  g.beginPath();
  g.rect(0, 0, 1080, 1920);
  g.moveTo(0, top[0]);
  for (let i = 0; i <= 270; i++) g.lineTo(i * 4, top[i]);
  for (let i = 0; i <= 480; i++) g.lineTo(1080 - rig[i], i * 4);
  for (let i = 270; i >= 0; i--) g.lineTo(i * 4, 1920 - bot[i]);
  for (let i = 480; i >= 0; i--) g.lineTo(lef[i], i * 4);
  g.closePath();
  g.fillStyle = "#e6dcc8";
  g.fill("evenodd");
  $("#flash").before(c);
}

// ── The caption's key word sits on a swatch of the accent wash (the template: "the key word in the accent wash"):
//    a loose stroke of burnt sienna laid behind it, pooled at its edges, granulated ────────────────────────────────
{
  const c = Object.assign(document.createElement("canvas"), { width: 480, height: 150 });
  const g = c.getContext("2d"), r = rng(23);
  const blob = (cx, cy, rx, ry, n = 48) => {
    g.beginPath();
    const ph = [r() * 6, r() * 6, r() * 6];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2, k = 1 + 0.05 * Math.sin(a * 3 + ph[0]) + 0.04 * Math.sin(a * 7 + ph[1]) + 0.025 * Math.sin(a * 13 + ph[2]);
      // a squarish ellipse: a stroke of a flat brush
      const ca = Math.cos(a), sa = Math.sin(a), x = Math.sign(ca) * Math.abs(ca) ** 0.45, y = Math.sign(sa) * Math.abs(sa) ** 0.7;
      g[i ? "lineTo" : "moveTo"](cx + x * rx * k, cy + y * ry * k);
    }
    g.closePath();
  };
  blob(240, 78, 222, 54);
  g.fillStyle = "rgba(192,112,63,0.30)";
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = "rgba(160,84,40,0.28)";
  g.filter = "blur(1.5px)";
  g.stroke();
  g.filter = "none";
  blob(250, 84, 190, 40);
  g.fillStyle = "rgba(192,112,63,0.14)";
  g.fill();
  // the paper's tooth: a few pale specks where the pigment skipped
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${0.25 + r() * 0.4})`; g.fillRect(20 + r() * 440, 26 + r() * 100, 1.5 + r() * 2, 1.5 + r() * 2); }
  document.documentElement.style.setProperty("--swatch", `url(${c.toDataURL("image/png")})`);
}

// ── Plates: painted layers over the paper, moved by a camera, and a screen layer for labels ──────────────────────
const plates = {};
const sheetCanvas = Object.assign(document.createElement("canvas"), { width: 1080, height: 1920 });
createFlatBackdrop(sheetCanvas, film.look).render({});
const PAPER = sheetCanvas.toDataURL("image/jpeg", 0.93);
function plate(id, depths = [1], { tint = null, tintA = 0.3 } = {}) {
  const sec = Object.assign(document.createElement("section"), { className: "scene plate", id });
  sec.innerHTML = `<div class="sheet" style="background:url(${PAPER}) 0 0 / 1080px 1920px"></div>${tint ? `<div class="tint" style="background:${tint};opacity:${tintA}"></div>` : ""}`;
  const layers = depths.map((d) => {
    const div = Object.assign(document.createElement("div"), { className: "layer" });
    div.innerHTML = `<svg viewBox="0 0 1080 1920"><defs></defs></svg>`;
    sec.append(div);
    return { div, svg: div.querySelector("svg"), d };
  });
  const scr = Object.assign(document.createElement("div"), { className: "layer screen" });
  scr.innerHTML = `<svg viewBox="0 0 1080 1920"></svg>`;
  sec.append(scr);
  $("#deckle").before(sec);
  const cam = { x: 540, y: 960, z: 1 };
  const P = { id, sec, layers, cam, scr: { div: scr, svg: scr.querySelector("svg") }, live: [] };
  const zOf = (d) => 1 + (cam.z - 1) * d;
  P.toScreen = (x, y, d = 1) => {
    const z = zOf(d), cx = 540 + (cam.x - 540) * d, cy = 960 + (cam.y - 960) * d;
    return [540 + (x - cx) * z, 960 + (y - cy) * z];
  };
  film.each(() => {
    if (sec.style.visibility === "hidden") return;
    for (const L of layers) {
      const z = zOf(L.d), x = 540 + (cam.x - 540) * L.d, y = 960 + (cam.y - 960) * L.d;
      L.div.style.transform = `translate(${(540 - x * z).toFixed(2)}px, ${(960 - y * z).toFixed(2)}px) scale(${z.toFixed(4)})`;
      L.div.style.setProperty("--k", (1 / Math.sqrt(z)).toFixed(3));
    }
    for (const fn of P.live) fn();
  });
  plates[id] = P;
  return P;
}
const add = (parent, markup, cls = "") => {
  const g = document.createElementNS(SVG, "g");
  if (cls) g.setAttribute("class", cls);
  g.innerHTML = markup;
  parent.append(g);
  return g;
};
// The wet edge of a bloom: a unit blob with a ragged rim (a few shapes, seeded), scaled out from where the brush
// touched. No filter: it costs nothing a frame.
const BLOB = [1, 2, 3, 4].map((k) => {
  const r = rng(40 + k), ph = [r() * 6.3, r() * 6.3, r() * 6.3];
  const pts = Array.from({ length: 72 }, (_, i) => {
    const a = (i / 72) * Math.PI * 2;
    const rad = 1 + 0.09 * Math.sin(a * 3 + ph[0]) + 0.06 * Math.sin(a * 7 + ph[1]) + 0.04 * Math.sin(a * 13 + ph[2]) + (r() - 0.5) * 0.04;
    return [Math.cos(a) * rad, Math.sin(a) * rad];
  });
  return `M${pts.map(([x, y]) => `${x.toFixed(3)} ${y.toFixed(3)}`).join(" L")} Z`;
});
// Paint: washes under the wash filter. bloom: { at, from: [x, y] (layer coordinates), dur, reach } blooms it in.
let maskN = 0;
function paint(layer, markup, { bloom = null, filter = "wc" } = {}) {
  const g = add(layer.svg, markup, "paint");
  if (filter) g.setAttribute("filter", `url(#${filter})`);
  if (bloom) bloomIn(layer, g, bloom);
  return g;
}
function bloomIn(layer, g, { at, from = [540, 960], dur = 0.9, reach = 1400, ease = "power2.out", log: logIt = true }) {
  const id = `bm${maskN++}`;
  layer.svg.querySelector("defs").insertAdjacentHTML("beforeend", `<mask id="${id}" maskUnits="userSpaceOnUse" x="-3000" y="-3000" width="7080" height="7920"><path d="${BLOB[maskN % BLOB.length]}" fill="url(#soft)" transform="translate(${from[0]} ${from[1]}) scale(0)"/></mask>`);
  const circ = layer.svg.querySelector(`#${id} path`);
  const st = { r: 0 };
  film.each(() => {
    if (st.r >= reach - 0.5) {
      if (g.hasAttribute("mask")) g.removeAttribute("mask");
      if (g.style.visibility === "hidden") g.style.visibility = "";
      return;
    }
    if (g.getAttribute("mask") !== `url(#${id})`) g.setAttribute("mask", `url(#${id})`);
    const v = st.r <= 0.5 ? "hidden" : "";
    if (g.style.visibility !== v) g.style.visibility = v;
    circ.setAttribute("transform", `translate(${from[0]} ${from[1]}) scale(${st.r.toFixed(1)})`);
  });
  tl.fromTo(st, { r: 0 }, { r: reach, duration: dur, ease, immediateRender: true }, at);
  if (logIt) note("wash", at, at + dur);
  return g;
}
// A wash lifted off the paper, as a damp brush takes pigment back: it pales away.
const lift = (g, at, dur = 0.5, to = 0) => {
  tl.to(g, { opacity: to, duration: dur, ease: "power1.inOut" }, at);
  return at + dur;
};
const inkG = (layer, markup) => add(layer.svg, markup, "inks");
// A drawing of many strokes drawn in the time asked: each stroke its share, with a hair of a lift between them
// (the kit's default gives every stroke at least 0.12 s, which made a raceme of 70 buds take ten seconds).
// A stroke waiting to be drawn keeps a dash of no length at its start, and its round cap still prints a dot there
// (the stray ticks under the raceme). Each stroke drawOn sets up is hidden until its pen actually moves.
const undrawn = new Set();
film.each(() => {
  for (const p of undrawn) {
    const v = parseFloat(p.style.strokeDashoffset) > 0.995 ? "hidden" : "";
    if (p.style.visibility !== v) p.style.visibility = v;
  }
});
const drawOn = (sel, at, o = {}) => {
  const roots = (typeof sel === "string" ? [...document.querySelectorAll(sel)] : [sel].flat()).map((el) => (el.tagName === "g" || el.tagName === "svg" ? el : el.parentNode));
  const end = ink.drawOn(sel, at, { ease: "power1.inOut", ...(o.duration ? { min: 0.012, gap: 0.004 } : {}), ...o });
  for (const r of roots) for (const el of r.querySelectorAll('[pathLength="1"]')) if (el.style.strokeDasharray) undrawn.add(el);
  note("line", at, end);
  return end;
};
const write = (sel, at, o = {}) => {
  const end = ink.write(sel, at, { speed: 16, ...o });
  note("write", at, end);
  return end;
};
const erase = (sel, at, o = {}) => {
  const end = ink.erase(sel, at, o);
  note("erase", at, end);
  return end;
};
// A label: italic lettering, on a plate layer (moves with it) or on the screen layer (screen: true).
function label(P, x, y, html, cls = "", { screen = false, layer = 0 } = {}) {
  const d = Object.assign(document.createElement("div"), { className: `lab ${cls}`.trim(), innerHTML: html });
  Object.assign(d.style, { left: `${x}px`, top: `${y}px` });
  (screen ? P.scr.div : P.layers[layer].div).append(d);
  return d;
}
// A thin ink leader from (x0, y0) to a part. On the screen layer, `to` is a plate point the camera carries.
function leader(P, x0, y0, to, { screen = false, layer = 0, bend = 0.25 } = {}) {
  const parent = screen ? P.scr.svg : P.layers[layer].svg;
  const g = add(parent, '<path class="k1" d=""/><circle class="dot" r="3.4"/>', "inks");
  const path = g.querySelector("path"), dot = g.querySelector("circle");
  const set = () => {
    const [x1, y1] = screen ? P.toScreen(...to) : to;
    const mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend;
    path.setAttribute("d", `M${pt(x0, y0)} Q${pt(mx, my)} ${pt(x1, y1)}`);
    dot.setAttribute("cx", x1.toFixed(1));
    dot.setAttribute("cy", y1.toFixed(1));
  };
  set();
  if (screen) P.live.push(set);
  return g;
}
const leaderOn = (g, at, dur = 0.35) => {
  const dot = g.querySelector("circle");
  gsap.set(dot, { opacity: 0 });
  tl.to(dot, { opacity: 1, duration: 0.08 }, at + dur - 0.05);
  return drawOn(g.querySelector("path"), at, { duration: dur });
};
// A plate on screen from `from` (fading in over fadeIn) to `to`.
function onScreen(P, from, to, { fadeIn = 0, fadeOut = 0 } = {}) {
  gsap.set(P.sec, { autoAlpha: from <= 0 ? 1 : 0 });
  if (from > 0) {
    if (fadeIn) tl.fromTo(P.sec, { autoAlpha: 0 }, { autoAlpha: 1, duration: fadeIn, ease: "power1.inOut", immediateRender: false }, from);
    else tl.set(P.sec, { autoAlpha: 1 }, from);
  }
  if (to < D) {
    if (fadeOut) tl.to(P.sec, { autoAlpha: 0, duration: fadeOut, ease: "power1.inOut" }, to - fadeOut);
    else tl.set(P.sec, { autoAlpha: 0 }, to);
  }
}
const camTo = (P, to, at, dur = 0.8, ease = "power2.inOut") => tl.to(P.cam, { ...to, duration: dur, ease }, at);
// ── Cuts: the next plate floods in over the last as a wash spreading from a point (template: "cuts by a new wash
//    flooding the page"). Its edge is ragged and soft, pigment pooled along it; inside it the new sheet is opaque, so
//    nothing of the old plate shows through, and nothing pops: the old plate goes only once it is covered. ─────────
const WET = (() => {
  const N = 1024, c = Object.assign(document.createElement("canvas"), { width: N, height: N }), g = c.getContext("2d");
  const r = rng(77), ph = [0, 1, 2, 3].map(() => r() * 6.283);
  const R = (a) => 0.8 + 0.06 * Math.sin(3 * a + ph[0]) + 0.04 * Math.sin(5 * a + ph[1]) + 0.025 * Math.sin(11 * a + ph[2]) + 0.012 * Math.sin(23 * a + ph[3]);
  const trace = (k) => {
    g.beginPath();
    for (let i = 0; i <= 720; i++) {
      const a = (i / 720) * Math.PI * 2, rr = R(a) * k * (N / 2);
      i ? g.lineTo(N / 2 + Math.cos(a) * rr, N / 2 + Math.sin(a) * rr) : g.moveTo(N / 2 + Math.cos(a) * rr, N / 2 + Math.sin(a) * rr);
    }
    g.closePath();
  };
  g.filter = "blur(5px)";
  trace(1);
  g.fillStyle = "#fff";
  g.fill();
  const mask = c.toDataURL("image/png");
  const rims = {};
  const rim = (colour) => rims[colour] ??= (() => {
    g.clearRect(0, 0, N, N);
    g.filter = "blur(3px)";
    trace(0.995);
    g.lineWidth = 9;
    g.strokeStyle = colour;
    g.globalAlpha = 0.55;
    g.stroke();
    g.filter = "blur(10px)";
    trace(0.975);
    g.lineWidth = 22;
    g.globalAlpha = 0.16;
    g.stroke();
    g.globalAlpha = 1;
    return c.toDataURL("image/png");
  })();
  return { mask, rim, min: 0.66 };
})();
const RMAX = Math.hypot(1080, 1920) / WET.min + 60;
function reveal(P, at, dur, [fx, fy], { rim = "#9c8866", ease = "power1.out", rimFade = 0.6 } = {}) {
  const st = { r: 0 };
  const ring = Object.assign(document.createElement("img"), { className: "rim", src: WET.rim(rim) });
  P.sec.append(ring);
  const cover = RMAX * 0.999, id = `rv${at}`;
  film.each((t) => {
    if (t < at - 1e-6 || st.r >= cover || P.sec.style.visibility === "hidden") {
      if (P.sec.dataset.rv === id) {
        Object.assign(P.sec.style, { maskImage: "", webkitMaskImage: "" });
        delete P.sec.dataset.rv;
      }
      ring.style.display = "none";
      return;
    }
    P.sec.dataset.rv = id;
    const d = `${(2 * st.r).toFixed(1)}px`, pos = `${(fx - st.r).toFixed(1)}px ${(fy - st.r).toFixed(1)}px`;
    Object.assign(P.sec.style, { maskImage: `url(${WET.mask})`, webkitMaskImage: `url(${WET.mask})`, maskSize: `${d} ${d}`, webkitMaskSize: `${d} ${d}`, maskPosition: pos, webkitMaskPosition: pos, maskRepeat: "no-repeat", webkitMaskRepeat: "no-repeat" });
    Object.assign(ring.style, { display: st.r > 1 ? "block" : "none", left: `${(fx - st.r).toFixed(1)}px`, top: `${(fy - st.r).toFixed(1)}px`, width: d, height: d, opacity: Math.max(0, 1 - (st.r / RMAX) / rimFade).toFixed(3) });
  });
  tl.fromTo(st, { r: 0 }, { r: RMAX, duration: dur, ease, immediateRender: false }, at);
  note("reveal", at, at + dur);
}
// a whole move: the old plate gently pushed towards the point while the new one floods in from it and settles
function cut(Old, New, at, dur, from, { oldCam = null, rim, settle = 1.06, settleDur = 1.5 } = {}) {
  reveal(New, at, dur, from, { rim });
  if (oldCam) tl.to(Old.cam, { ...oldCam, duration: dur + 0.15, ease: "power1.inOut" }, at - 0.1);
  if (settle) tl.fromTo(New.cam, { z: settle }, { z: 1, duration: settleDur, ease: "power2.out", immediateRender: false }, at);
}
// A whole bee in profile placed in a group: far legs and raised wings, the abdomen, the body, hair, ink, folded wings.
function placeBee(parent, B, tr, { abdRot = 0 } = {}) {
  const wrap = (m) => `<g transform="${tr}">${m}</g>`;
  const waist = (m) => (abdRot ? `<g transform="rotate(${abdRot} -0.4 0.15)">${m}</g>` : m);
  const g = add(parent, "", "bee");
  const sub = (m, cls, filter = "wc") => {
    const e = add(g, wrap(m), cls);
    if (filter && cls === "paint") e.setAttribute("filter", `url(#${filter})`);
    return e;
  };
  return {
    g,
    far: sub(B.far + B.under, "paint"),
    farInk: sub(B.farInk + B.underInk, "inks"),
    abd: sub(waist(B.abdPaint), "paint"),
    body: sub(B.paint, "paint"),
    hair: sub(`<path class="hair" d="${B.hair}"/>` + waist(`<path class="hair" d="${B.abdHair}"/>`), ""),
    abdInk: sub(waist(B.abdInk), "inks"),
    ink: sub(B.ink, "inks"),
    over: sub(B.over, "paint"),
    overInk: sub(B.overInk, "inks"),
  };
}
// The dorsal bee (beeTop) placed the same way.
function placeTop(parent, B, tr) {
  const wrap = (m) => `<g transform="${tr}">${m}</g>`;
  const g = add(parent, "", "bee");
  add(g, wrap(B.under), "paint").setAttribute("filter", "url(#wc)");
  add(g, wrap(B.underInk), "inks");
  add(g, wrap(B.paint), "paint").setAttribute("filter", "url(#wc)");
  add(g, wrap(`<path class="hair" d="${B.hair}"/>`));
  add(g, wrap(B.ink), "inks");
  add(g, wrap(B.over), "paint").setAttribute("filter", "url(#wc)");
  add(g, wrap(B.overInk), "inks");
  return g;
}
// A flood: a new wash crossing the page from one side, its wet edge pooled; an opaque body a little behind the edge
// covers what was there. It can lift away again, as the next plate dries in under it.
const f1 = (n) => n.toFixed(1);
function flood(id, colour, body, at, dur, dir = "right", { lift: liftAt = null, liftDur = 0.8 } = {}) {
  const sec = Object.assign(document.createElement("section"), { className: "scene plate flood", id });
  // the shape with its wet edge at x = 0 (right) or y = 0 (up); the body runs back 2600 px behind it
  const wash = dir === "right" ? "M-2600 -300 L0 -300 C70 500 -60 1200 40 2220 C70 2900 -40 3300 20 3700 L-2600 3700 Z" : "M-300 2600 L-300 0 C300 -60 700 70 1380 -30 L1380 2600 Z";
  const base = dir === "right" ? "M-2600 -300 L-70 -300 C0 500 -130 1200 -30 2220 C0 2900 -110 3300 -50 3700 L-2600 3700 Z" : "M-300 2600 L-300 70 C300 10 700 140 1380 40 L1380 2600 Z";
  sec.innerHTML = `<svg viewBox="0 0 1080 1920"><g class="mv"><path d="${base}" fill="${body}"/><g class="paint" filter="url(#flood)"><path d="${wash}" fill="${colour}" fill-opacity=".24"/></g></g></svg>`;
  $("#deckle").before(sec);
  const mv = sec.querySelector(".mv"), st = { e: 0 };
  film.each(() => {
    if (sec.style.visibility === "hidden") return;
    mv.setAttribute("transform", dir === "right" ? `translate(${f1(-60 + st.e * 1500)} 0)` : `translate(0 ${f1(2000 - st.e * 2350)})`);
  });
  gsap.set(sec, { autoAlpha: 0 });
  tl.set(sec, { autoAlpha: 1 }, at);
  tl.fromTo(st, { e: 0 }, { e: 1, duration: dur, ease: "power2.inOut", immediateRender: false }, at);
  note("flood", at, at + dur);
  if (liftAt !== null) tl.to(sec, { autoAlpha: 0, duration: liftDur, ease: "power1.inOut" }, liftAt);
  return { sec, st };
}
// pale washes as one opaque colour over the paper (for a flood's body)
const over = (hex2, a) => {
  const p = [251, 248, 241], c = [1, 3, 5].map((i) => parseInt(hex2.slice(i, i + 2), 16));
  return `rgb(${p.map((v, i) => Math.round(v * (1 - a) + ((v * c[i]) / 255) * a)).join(",")})`;
};

// ═══ Plate A: the opening (s01, and again in s16 so the film loops) ══════════════════════════════════════════════
// Honey falls from a spoon into a jar and folds over itself; a kaliandra raceme holds a drop of nectar.
const A = plate("pA", [0.75, 1]);
const KS = 4.3, KX = 800, KY = 470; // the raceme: 4.3 px a mm, its ring of flowers at (800, 470)
const KR = raceme({ seed: 7, leaf: false, id: "kr" });
const kr = (m) => `<g transform="translate(${KX} ${KY}) scale(${KS})">${m}</g>`;
paint(A.layers[0], kr(KR.tuft));
add(A.layers[0].svg, kr(`<g class="stam">${KR.stam}</g><g class="tips">${KR.tips}</g>`));
paint(A.layers[0], kr(KR.budPaint + KR.calyx + KR.tube));
inkG(A.layers[0], kr(KR.budInk + KR.lobes + K(KR.stem, "k2")));
// the drop of nectar at the lip of a front flower
const DROP0 = [KX + 5.8 * KS, KY + 7 * KS], DROP_R = 15;
const dropA = drop(0, 0, DROP_R);
const dropG = add(A.layers[0].svg, `<g class="paint" filter="url(#wc)">${dropA.paint}</g>${dropA.ink}`, "inks");
const nectar = { y: 0, k: 1, streak: 0 };
const streak = add(A.layers[0].svg, `<path d="" fill="none" stroke="${C.ultra}" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>`);
film.each(() => {
  dropG.setAttribute("transform", `translate(${DROP0[0]} ${(DROP0[1] + nectar.y).toFixed(1)}) scale(${nectar.k.toFixed(3)})`);
  dropG.style.visibility = nectar.k < 0.02 ? "hidden" : "";
  streak.querySelector("path").setAttribute("d", nectar.streak > 0 ? `M${DROP0[0]} ${f1(DROP0[1] + nectar.y - nectar.streak)} L${DROP0[0]} ${f1(DROP0[1] + nectar.y - 30)}` : "");
});
// the spoon, the jar, the honey
const SP = spoon(70, 300, 470, 560, 124, 60);
paint(A.layers[1], SP.paint);
inkG(A.layers[1], SP.ink);
const JA = jar(270, 810, 870, 1290, 1020);
paint(A.layers[1], JA.glass, { filter: "wcb" });
paint(A.layers[1], JA.honey + JA.surface, { filter: "wcb" });
inkG(A.layers[1], JA.ink);
// the honey thread from the spoon's tip to the surface, folding: one fold every D/30 s, so it meets itself at the loop
const FOLD = D / 30, TIP = [574, 616], LAND = [548, 1024];
const rib = add(A.layers[1].svg, `<g class="paint live" filter="url(#wc)"><path class="th" fill="${C.sienna}" fill-opacity=".8"/><path class="th2" fill="${C.ochre}" fill-opacity=".35"/><path class="co" fill="none" stroke="${C.sienna}" stroke-opacity=".85" stroke-width="13" stroke-linecap="round"/></g><path class="k1 thi"/><path class="k1 coi"/><path class="hl" fill="none" stroke="#fff3d6" stroke-opacity=".75" stroke-width="2.4" stroke-linecap="round"/>`);
film.each((t) => {
  if (A.sec.style.visibility === "hidden") return;
  const ph = (t / FOLD) % 1, R = ribbon(TIP[0], TIP[1], LAND[0], LAND[1], ph);
  for (const [c, d] of [[".th", R.thread], [".th2", R.thread], [".co", R.coil], [".thi", R.thread], [".coi", R.coil]]) rib.querySelector(c).setAttribute("d", d);
  rib.querySelector(".hl").setAttribute("d", `M${TIP[0] - 4} ${TIP[1] + 20} Q${(TIP[0] + LAND[0]) / 2 - 3} ${(TIP[1] + LAND[1]) / 2} ${f1(LAND[0] + Math.sin(ph * 6.283) * 6 - 2)} ${LAND[1] - 30}`);
});
// labels: 'kental' by the honey, 'encer' by the nectar
const lKental = label(A, 250, 790, "kental", "l", { layer: 1 });
const ldKental = leader(A, 330, 800, [552, 830], { layer: 1, bend: -0.2 });
const lEncer = label(A, 840, 820, "encer", "l", { layer: 0 });
const ldEncer = leader(A, 845, 780, [DROP0[0] + 4, DROP0[1] + 20], { layer: 0, bend: 0.2 });
onScreen(A, 0, 4.85);
// s01: frame 0 is finished; 'kental' as it is said; the camera eases right to the flower on 'cairan bunga'; the
// drop lets go on 'encer' and falls fast past the slow honey; a new one starts to gather.
write(lKental, 0.55, { speed: 14 });
leaderOn(ldKental, 0.95, 0.3);
camTo(A, { x: 600, y: 930, z: 1.06 }, 2.0, 1.9);
tl.to(nectar, { y: 1500, duration: 0.62, ease: "power2.in" }, 3.27);
tl.fromTo(nectar, { streak: 0 }, { streak: 90, duration: 0.3, ease: "power1.in", immediateRender: false }, 3.32);
tl.set(nectar, { y: 0, k: 0, streak: 0 }, 3.95);
tl.to(nectar, { k: 0.55, duration: 0.6, ease: "power1.out" }, 3.96);
write(lEncer, 3.35, { speed: 14 });
leaderOn(ldEncer, 3.7, 0.3);
note("drip", 3.27, 3.9);

// ═══ Plate Q: the question (s02): a wash floods the page and the words are written on it ═════════════════════════
const Q = plate("pQ", [1], { tint: C.sienna, tintA: 0.32 });
paint(Q.layers[0], W(ell(540, 905, 290, 88, -2), C.sienna, 0.55) + W(ell(560, 915, 200, 60, -2), C.sienna, 0.3), { filter: "wcb", bloom: { at: 4.85, from: [380, 905], dur: 0.5, reach: 700 } });
const qT1 = Object.assign(document.createElement("div"), { className: "title", innerHTML: "Kok bisa" });
const qT2 = Object.assign(document.createElement("div"), { className: "title", innerHTML: "<em>berubah?</em>" });
Object.assign(qT1.style, { left: "540px", top: "760px" });
Object.assign(qT2.style, { left: "540px", top: "900px" });
Q.layers[0].div.append(qT1, qT2);
const qd1 = drop(0, 0, 30, C.ultra, 0.4), qd2 = drop(0, 0, 46, C.sienna, 0.62);
paint(Q.layers[0], `<g transform="translate(400 1120)">${qd1.paint}</g><g transform="translate(700 1110)">${qd2.paint}</g>`, { bloom: { at: 5.2, from: [550, 1110], dur: 0.45, reach: 500 } });
const qInk = inkG(Q.layers[0], `<g transform="translate(400 1120)">${qd1.ink}</g><g transform="translate(700 1110)">${qd2.ink}</g>` + K("M460 1110 L620 1110", "k2") + K("M598 1094 L622 1110 L598 1126", "k2"));
onScreen(Q, 4.2, 6.3);
reveal(Q, 4.2, 0.62, [-80, 960], { rim: C.sienna });
write(qT1, 4.4, { duration: 0.32 });
write(qT2, 4.86, { duration: 0.5 });
drawOn(qInk, 5.25, { duration: 0.35 });
// to s03: the camera drifts down the page: the question rises away with its wash, the botanical plate comes up
// to s03: the camera drifts down the page as the kaliandra plate floods up from below
const QB = s.s03.start - 0.22;

// ═══ Plate B: the kaliandra, a botanical plate (s03) ══════════════════════════════════════════════════════════════
const B = plate("pB", [0.8, 1]);
const BS = 5.4, BX = 390, BY = 700;
const KB = raceme({ seed: 11, leaf: true, flowers: 10, leafAngle: 205, id: "kb" });
const kb = (m) => `<g transform="translate(${BX} ${BY}) scale(${BS})">${m}</g>`;
paint(B.layers[0], kb(KB.leaves), { bloom: { at: 5.62, from: [200, 900], dur: 1.0 } });
const bLeafInk = inkG(B.layers[0], kb(KB.leafInk));
paint(B.layers[1], kb(KB.tuft), { bloom: { at: 5.58, from: [BX, BY + 60], dur: 0.9 } });
const bStam = add(B.layers[1].svg, kb(`<g class="stam">${KB.stam}</g><g class="tips">${KB.tips}</g>`));
bloomIn(B.layers[1], bStam, { at: 5.68, from: [BX, BY + 40], dur: 1.0, log: false });
paint(B.layers[1], kb(KB.budPaint + KB.calyx + KB.tube), { bloom: { at: 5.62, from: [BX, BY - 120], dur: 0.9 } });
const bInk = inkG(B.layers[1], kb(KB.budInk + KB.lobes + K(KB.stem, "k2")));
const bTitle = label(B, 540, 285, "Calliandra calothyrsus <span style='font-style:normal'>(kaliandra)</span>", "", { layer: 1 });
// the inset: one flower magnified, its corolla cut open: the nectar at the bottom of the tube
const IN = [330, 1085], IR = 160;
const fl = flower({ angle: -55, len: 30, n: 26, spread: 70, droop: 0.1, seed: 4, corolla: 1 });
const insTr = `translate(${IN[0] - 66} ${IN[1] + 96}) scale(29)`;
const ins = (m) => `<g clip-path="url(#inclip)"><g transform="${insTr}">${m}</g></g>`;
B.layers[1].svg.querySelector("defs").insertAdjacentHTML("beforeend", `<clipPath id="inclip"><circle cx="${IN[0]}" cy="${IN[1]}" r="${IR - 4}"/></clipPath>`);
paint(B.layers[1], ins(W(fl.calyx, "#86a94f", 0.6) + W(fl.tube, C.corolla, 0.55) + W(fl.lobes, C.corolla, 0.6)), { bloom: { at: 7.0, from: [IN[0], IN[1] + 60], dur: 0.6, reach: 400 } });
const bInsetStam = add(B.layers[1].svg, ins(`<defs>${stamenPaint("inst", fl.mouth, 9)}</defs><g class="stam"><path d="${fl.stamens}" style="stroke:url(#inst)"/></g><g class="tips"><path d="${fl.tips}"/></g>`));
bloomIn(B.layers[1], bInsetStam, { at: 7.1, from: [IN[0] + 40, IN[1] - 40], dur: 0.6, reach: 400, log: false });
// the nectar at the foot of the tube: a pale blue pool with a level top, its meniscus curving up the walls (the
// flower leans, the nectar's surface does not), laid opaque over the corolla so it stays blue
B.layers[1].svg.querySelector("defs").insertAdjacentHTML("beforeend", `<clipPath id="tubeclip"><path d="${fl.tube}" transform="${insTr}"/></clipPath>`);
const pool = `<g clip-path="url(#tubeclip)"><path d="M240 1088 C262 1088 270 1094 320 1095 C368 1094 376 1086 400 1086 L400 1210 L240 1210 Z" fill="#c7d7ef" fill-opacity=".95"/><path d="M240 1100 L400 1100 L400 1210 L240 1210 Z" fill="${C.ultra}" fill-opacity=".14"/></g>`;
const poolG = paint(B.layers[1], `<g clip-path="url(#inclip)">${pool}</g>`, { bloom: { at: 7.35, from: [IN[0] - 20, IN[1] + 50], dur: 0.5, reach: 200 } });
poolG.style.mixBlendMode = "normal";
const poolInk = inkG(B.layers[1], `<g clip-path="url(#tubeclip)"><path d="M240 1088 C262 1088 270 1094 320 1095 C368 1094 376 1086 400 1086" class="k0"/><path d="M286 1098 C300 1100 318 1101 336 1100" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2"/></g>`);
gsap.set(poolInk, { opacity: 0 });
tl.to(poolInk, { opacity: 1, duration: 0.3 }, 7.45);
const bInsetInk = inkG(B.layers[1], ins(K(fl.calyx, "k1") + K(fl.tube, "k1") + K(fl.lobes, "k1")) + `<circle cx="${IN[0]}" cy="${IN[1]}" r="${IR}" class="k2"/>` + K(`M${IN[0] + IR * 0.62} ${IN[1] - IR * 0.78} L${BX + 3.5 * BS} ${BY + 6 * BS}`, "k0"));
const bNektar = label(B, 590, 1230, "nektar", "l", { layer: 1 });
const ldNektar = leader(B, 520, 1222, [IN[0] - 2, IN[1] + 22], { layer: 1, bend: 0.25 });
// the swatch column: 80 % water over 20 % sugar by height (f1, f2): 512 px over 128 px
const COL = { x: 735, w: 160, top: 520, water: 512, sugar: 128 };
paint(B.layers[1], W(`M${COL.x} ${COL.top} H${COL.x + COL.w} V${COL.top + COL.water} H${COL.x} Z`, C.ultra, 0.42), { filter: "wcb", bloom: { at: 8.3, from: [COL.x + 80, COL.top + COL.water], dur: 0.8, reach: 700 } });
paint(B.layers[1], W(`M${COL.x} ${COL.top + COL.water} H${COL.x + COL.w} V${COL.top + COL.water + COL.sugar} H${COL.x} Z`, C.sienna, 0.62), { filter: "wcb", bloom: { at: 7.95, from: [COL.x + 80, COL.top + 640], dur: 0.5, reach: 300 } });
const colInk = inkG(B.layers[1], K(`M${COL.x} ${COL.top + 640} H${COL.x + COL.w} V${COL.top} H${COL.x} Z M${COL.x} ${COL.top + COL.water} H${COL.x + COL.w}`, "k2"));
const bIsi = label(B, COL.x + 80, 470, "isi nektar", "", { layer: 1 });
const bAir = label(B, COL.x + 80, 740, "air", "l", { layer: 1 });
const bAirN = label(B, COL.x + 80, 810, "<span class='num'>80 %</span>", "l", { layer: 1 });
const bGula = label(B, COL.x + 80, 1060, "gula", "s", { layer: 1 });
const bGulaN = label(B, COL.x + 80, 1106, "<span class='num'>20 %</span>", "s", { layer: 1 });
onScreen(B, QB, 10.35);
cut(Q, B, QB, 0.75, [390, 1250], { oldCam: { y: 1060 }, settle: 0 });
tl.fromTo(B.cam, { z: 1, y: 1000 }, { z: 1.03, y: 960, duration: s.s04.start - QB - 0.3, ease: "power1.out", immediateRender: false }, QB);
// the raceme blooms with the flood that brings its plate, so the page is never bare paper
drawOn(bInk, 5.95, { duration: 0.9 });
drawOn(bLeafInk, 6.1, { duration: 0.6 });
write(bTitle, 6.05, { speed: 30 });
drawOn(bInsetInk, 7.0, { duration: 0.45 });
write(bNektar, 7.2, { speed: 14 });
leaderOn(ldNektar, 7.55, 0.3);
drawOn(colInk, 7.9, { duration: 0.4 });
write(bIsi, 7.95, { speed: 22 });
write(bGula, 8.15, { speed: 16 });
write(bGulaN, 8.4, { speed: 14 });
write(bAir, 8.95, { speed: 12 });
write(bAirN, 9.12, { speed: 12 });

// ═══ Plate C: one kaliandra flower at bee scale, and a worker drinking from it (s04), then inside her (s05) ═══════
// 34 px a mm: the worker is 13.8 mm long, the flower's corolla 7 mm, its filaments 5 cm (they leave the frame).
const Cp = plate("pC", [0.7, 1]);
const CS = 34, BO = [470, 880], TILT = -16;
const btr = `translate(${BO[0]} ${BO[1]}) rotate(${TILT}) scale(${CS})`;
// far: filaments of the neighbouring flowers, out of focus
const nb = flower({ angle: -10, len: 52, n: 10, spread: 110, droop: 0.12, seed: 21, corolla: 1 });
add(Cp.layers[0].svg, `<g transform="translate(980 640) rotate(-30) scale(${CS * 0.8})"><defs>${stamenPaint("nbg", nb.mouth, 52)}</defs><g class="stam" style="stroke-opacity:.22"><path d="${nb.stamens}" style="stroke:url(#nbg)"/></g></g>`);
// the flower she stands on: its pedicel, calyx and corolla in her frame, under her feet
const FL = flower({ angle: 0, len: 50, n: 20, spread: 110, droop: 0.12, seed: 5, corolla: 1 });
const flTr = `${btr} translate(-0.6 5.7)`;
const LEAFG = "#86a94f";
const cFlower = paint(Cp.layers[1], `<g transform="${flTr}">${W("M-6 -0.42 C-3 -0.45 -1 -0.42 0.6 -0.42 L0.6 0.42 C-1 0.45 -3 0.5 -6 0.52 Z", LEAFG, 0.6)}${W(FL.calyx, LEAFG, 0.62)}${W(FL.tube, C.corolla, 0.6)}${W(FL.tube, "#b8c46a", 0.2)}${W(FL.lobes, C.corolla, 0.62)}${W(FL.column, "#f1c9cf", 0.7)}${W(ell(4.2, -0.45, 1.6, 0.22), C.paper, 0.45)}</g>`);
const cStam = add(Cp.layers[1].svg, `<g transform="${flTr}"><defs>${stamenPaint("cflg", FL.mouth, 50)}</defs><g class="stam"><path d="${FL.stamens}" style="stroke:url(#cflg)"/></g><g class="tips"><path d="${FL.tips}"/></g></g>`);
const cFlInk = inkG(Cp.layers[1], `<g transform="${flTr}">${K(FL.calyx, "k1")}${K(FL.tube, "k1")}${K(FL.lobes, "k1")}${K(FL.column, "k0")}${K(FL.teeth, "k0")}${K(FL.veins, "k0")}${K("M-6 -0.42 C-3 -0.45 -1 -0.42 0.6 -0.42 M-6 0.52 C-3 0.5 -1 0.45 0.6 0.42", "k1")}</g>`);
// the rest of the raceme behind her, at 27 px a mm: its axis, the cone of buds above, the ring of open flowers
const KC = raceme({ seed: 31, flowers: 9, leaf: false, len: 50, id: "kc" });
const kc = (m) => `<g transform="translate(205 1080) scale(17)">${m}</g>`;
paint(Cp.layers[0], kc(KC.tuft));
add(Cp.layers[0].svg, kc(`<g class="stam" style="stroke-opacity:.5">${KC.stam}</g>`));
paint(Cp.layers[0], kc(KC.budPaint + KC.calyx + KC.tube));
inkG(Cp.layers[0], kc(KC.budInk + KC.lobes + K(KC.stem, "k2")));
paint(Cp.layers[0], W("M184 2000 C186 1700 190 1400 194 1100 L218 1100 C220 1400 224 1700 228 2000 Z", "#86a94f", 0.55));
inkG(Cp.layers[0], K("M184 2000 C186 1700 190 1400 194 1100 M228 2000 C224 1700 220 1400 218 1100", "k0"));
// her flower's pedicel, curving back to the axis
const cStalk = paint(Cp.layers[1], W("M332 1139 C290 1160 240 1230 200 1330 L218 1338 C258 1240 300 1172 336 1156 Z", "#86a94f", 0.6));
const cStalkInk = inkG(Cp.layers[1], K("M332 1139 C290 1160 240 1230 200 1330 M336 1156 C300 1172 258 1240 218 1338", "k1"));
// nectar welling at the mouth of the corolla, where her tongue goes
const cNectar = add(Cp.layers[1].svg, `<g class="paint live" filter="url(#wc)"><g transform="${flTr}"><path class="nd" d="${ell(7.3, -0.3, 0.55, 0.48)}" fill="${C.ultra}" fill-opacity=".42"/></g></g>`);
// the worker, gripping the corolla, wings raised (just landed)
const LEGC = {
  fore: [[3.55, 1.2], [3.7, 1.75], [3.85, 2.0], [4.85, 2.7], [5.4, 3.75], [5.82, 4.05], [6.04, 4.18], [6.2, 4.27], [6.34, 4.33], [6.48, 4.38]],
  mid: [[2.12, 1.66], [2.2, 2.15], [2.3, 2.4], [2.95, 3.15], [2.6, 4.1], [2.05, 4.3], [1.82, 4.36], [1.64, 4.4], [1.48, 4.42], [1.3, 4.45]],
  hind: [[0.82, 1.5], [0.7, 2.0], [0.55, 2.25], [-0.25, 3.05], [-1.0, 4.0], [-1.7, 4.4], [-1.9, 4.45], [-2.1, 4.48], [-2.26, 4.5], [-2.44, 4.52]],
};
const BEE_C = beeSide({ wings: "raised", tongue: 2.1, tongueAngle: 56, legs: LEGC, id: "c1", seed: 3 });
const bee = add(Cp.layers[1].svg, "", "flyer");
const beeParts = placeBee(bee, BEE_C, btr);
const flap = beeFlap(0, 1);
const cFlap = add(bee, `<g transform="${btr}"><g class="paint" filter="url(#wc)">${flap.paint}</g>${flap.ink}</g>`);
const tongueEl = beeParts.ink.querySelector('[data-part="tongue"]');
// her insides (s05): the gut in her frame, hidden until her abdomen clears
// after Snodgrass: the oesophagus from the mouth back through head and thorax; the honey stomach (crop) just past
// the waist; the proventriculus, its valve; the thick, ring-folded midgut (ventriculus); the Malpighian tubules,
// the small intestine and the rectum
const VEN = tube(GUT.ventriculus, 0.9, [0.9, 1.05]), INT = tube(GUT.intestine, 0.34), OES = tube(GUT.oesophagus, 0.2, [1, 1.4]);
const NECK = tube("M-2.1 0.16 C-2.5 0.16 -2.9 0.16 -3.3 0.16", 0.3);
const gutPaint = paint(Cp.layers[1], `<g transform="${btr}">${W(VEN.fill, "#d9a06a", 0.5)}${W(VEN.fill, C.sienna, 0.16)}${W(INT.fill, "#c99a6a", 0.42)}${W(GUT.rectum, "#c99a6a", 0.4)}${W(NECK.fill, "#e3cfa8", 0.5)}${W(GUT.valve, "#b07a4a", 0.6)}${W(OES.fill, "#e3cfa8", 0.45)}</g>`);
const gutInk = inkG(Cp.layers[1], `<g transform="${btr}">${K(OES.walls, "k0")}${K(NECK.walls, "k0")}${K(GUT.valve, "k1")}${K(GUT.valveLips, "k0")}${K(VEN.walls, "k1")}${K(folds(GUT.ventriculus, 0.82, 0.26), "k0", ' style="stroke-opacity:.55"')}${K(INT.walls, "k0")}${K(GUT.rectum, "k1")}${K(GUT.malpighian, "k0")}</g>`);
const gutNectar = add(Cp.layers[1].svg, `<g transform="${btr}"><path d="${GUT.oesophagus}" fill="none" stroke="${C.ultra}" stroke-opacity=".6" stroke-width="${(5 / CS).toFixed(3)}" stroke-linecap="round" pathLength="1" class="flow"/></g>`);
// the honey stomach, live: folded and pale while empty, swelling blue as she drinks
const cropFill = add(Cp.layers[1].svg, `<g class="paint live" filter="url(#wc)"><g transform="${btr}"><path class="e" fill="#e9dfc9" fill-opacity=".55"/><path class="n" fill="${C.ultra}" fill-opacity="0"/><path class="h" d="${ell(-1.9, -0.75, 0.6, 0.2, -20)}" fill="${C.paper}" fill-opacity="0"/></g></g>`);
const cropInk = inkG(Cp.layers[1], `<g transform="${btr}"><path class="k1 ci" d="${GUT.crop}" pathLength="1"/></g>`);
const crop = { k: 0 };
{
  const e = cropFill.querySelector(".e"), n = cropFill.querySelector(".n"), h = cropFill.querySelector(".h"), ci = cropInk.querySelector(".ci");
  let last = -1;
  film.each(() => {
    if (Math.abs(crop.k - last) < 0.002) return;
    last = crop.k;
    const d = lerpPath(GUT.crop, GUT.cropFull, crop.k);
    e.setAttribute("d", d); n.setAttribute("d", d); ci.setAttribute("d", d);
    n.setAttribute("fill-opacity", (Math.min(1, crop.k * 1.6) * 0.48).toFixed(3));
    h.setAttribute("fill-opacity", (Math.max(0, crop.k - 0.5) * 0.9).toFixed(3));
  });
}
const toBee = (x, y) => { // a point of her frame (mm) on the plate
  const a = (TILT * Math.PI) / 180;
  return [BO[0] + (x * Math.cos(a) - y * Math.sin(a)) * CS, BO[1] + (x * Math.sin(a) + y * Math.cos(a)) * CS];
};
const cApis = label(Cp, 470, 1235, "Apis mellifera", "l", { screen: true });
const ldApis = leader(Cp, 420, 1195, toBee(-3, 1.5), { screen: true, bend: -0.2 });
const cKantong = label(Cp, 90, 360, "kantong madu", "l left", { screen: true });
const cCuma = label(Cp, 92, 425, "cuma disimpan, nggak dicerna", "s left", { screen: true });
const cKatup = label(Cp, 120, 1262, "katup", "l left", { screen: true });
const ldKantong = leader(Cp, 260, 460, toBee(-1.9, -0.5), { screen: true, bend: 0.15 });
const ldKatup = leader(Cp, 215, 1212, toBee(-3.6, 0.2), { screen: true, bend: -0.15 });
// s03 -> s04: the camera dives into one flower of the raceme; the macro plate comes up under it
const DIVE = s.s04.start - 0.2;
onScreen(Cp, DIVE, 15.85);
cut(B, Cp, DIVE, 0.72, [470, 880], { oldCam: { x: 360, y: 780, z: 1.12 }, settle: 1.05, settleDur: 1.3 });
// s04: she flies in on a curve, lands on the corolla, stops her wings, reaches her tongue into the nectar
const fly = { x: -560, y: -360, flap: 1 };
film.each(() => {
  bee.setAttribute("transform", `translate(${f1(fly.x)} ${f1(fly.y)})`);
  cFlap.style.opacity = fly.flap.toFixed(3);
});
tl.to(fly, { x: 0, duration: 0.65, ease: "power2.out" }, s.s04.start - 0.1);
tl.to(fly, { y: 0, duration: 0.65, ease: "back.out(1.4)" }, s.s04.start - 0.1);
tl.to(fly, { flap: 0, duration: 0.25, ease: "power1.in" }, s.s04.start + 0.5);
note("buzz", s.s04.start - 0.1, s.s04.start + 0.6);
note("land", s.s04.start + 0.55, s.s04.start + 0.6);
gsap.set(tongueEl, { attr: { pathLength: 1 }, strokeDasharray: "1 1.02", strokeDashoffset: 1.01 });
tl.to(tongueEl, { strokeDashoffset: 0, duration: 0.35, ease: "power2.out" }, 10.2);
note("sip", 10.45, 10.8);
tl.to(cNectar.querySelector(".nd"), { scale: 0.2, transformOrigin: "50% 50%", duration: 0.9, ease: "power1.in" }, 10.5);
write(cApis, 10.0, { duration: 0.45 });
leaderOn(ldApis, 10.35, 0.3);
// s05: the camera pushes in on her; her abdomen clears like glass; the gut is drawn; nectar runs down the
// oesophagus and fills the honey stomach
const IN5 = s.s05.start;
erase([cApis], IN5 + 0.15, { duration: 0.22 });
tl.to(ldApis, { opacity: 0, duration: 0.2 }, IN5 + 0.15);
camTo(Cp, { x: 480, y: 850, z: 1.72 }, IN5, 1.7, "power2.inOut");
tl.to([cFlower, cStam, cFlInk, cStalk, cStalkInk], { opacity: 0.3, duration: 0.8 }, IN5 + 0.1);
tl.to(Cp.layers[0].div, { opacity: 0.22, duration: 0.8 }, IN5 + 0.1);
lift(beeParts.abd, IN5 + 0.25, 0.7, 0.06);
tl.to([beeParts.abdInk, beeParts.far, beeParts.farInk], { opacity: 0.2, duration: 0.6 }, IN5 + 0.3);
gsap.set([gutPaint, gutInk, cropFill, cropInk], { opacity: 0 });
tl.to(gutPaint, { opacity: 1, duration: 0.6 }, IN5 + 0.55);
tl.set(gutInk, { opacity: 1 }, IN5 + 0.6);
drawOn(gutInk, IN5 + 0.6, { duration: 0.9 });
const flowEl = gutNectar.querySelector(".flow");
gsap.set(flowEl, { strokeDasharray: "1 1.02", strokeDashoffset: 1.01 });
tl.to(flowEl, { strokeDashoffset: 0, duration: 0.7, ease: "power1.inOut" }, 12.05);
note("swallow", 12.6, 13.3);
tl.to(cropFill, { opacity: 1, duration: 0.6 }, IN5 + 0.55);
tl.set(cropInk, { opacity: 1 }, IN5 + 0.6);
drawOn(cropInk, IN5 + 0.7, { duration: 0.5 });
tl.to(crop, { k: 1, duration: 1.1, ease: "power1.out" }, 12.55);
// every label here is whole for a second or more before the dive clears them (f3)
write(cKatup, 12.85, { speed: 14 });
leaderOn(ldKatup, 13.1, 0.3);
write(cKantong, 13.25, { duration: 0.45 });
leaderOn(ldKantong, 13.55, 0.3);
write(cCuma, 13.45, { duration: 0.5 });

// ═══ Plate D: inside the honey stomach (s06): sugars in the nectar; the bee's enzyme comes in with it ═════════════
const Dp = plate("pD", [0.8, 1]);
const sacD = "M90 700 C120 380 420 330 620 360 C880 400 1010 600 990 860 C970 1130 780 1250 540 1240 C300 1230 110 1090 100 900 C95 820 92 760 90 700 Z";
paint(Dp.layers[0], W(sacD, C.ultra, 0.28) + W(ell(560, 860, 340, 280), C.ultra, 0.14), { filter: "wcb", bloom: { at: s.s06.start + 0.47, from: [140, 720], dur: 0.8 } });
inkG(Dp.layers[0], K(sacD, "k2") + K("M110 690 C160 450 420 395 620 420 C850 450 960 620 950 860", "k0") + K("M180 1000 C260 1150 420 1205 560 1200", "k0"));
paint(Dp.layers[0], W("M-40 640 L95 662 L98 752 L-40 772 Z", "#e9dfc9", 0.6));
inkG(Dp.layers[0], K("M-40 640 L95 662 M-40 772 L98 752", "k2"));
const SUG = [[330, 600, 8], [690, 560, -12], [460, 860, 20], [760, 860, -4], [600, 1080, 10], [300, 1010, -18]];
const sugG = SUG.map(([x, y, r]) => {
  const m = sucrose(0, 0, 0.3);
  const g = add(Dp.layers[1].svg, `<g class="paint" filter="url(#wc)">${W(m.glucose, C.sienna, 0.55)}${W(m.fructose, C.sienna, 0.55)}</g>${K(m.glucose, "k1")}${K(m.fructose, "k1")}${K(m.bond, "k1")}<circle cx="${m.bridgeO[0]}" cy="${m.bridgeO[1]}" r="4.5" class="dot"/>`);
  return { g, x, y, r };
});
film.each((t) => {
  if (Dp.sec.style.visibility === "hidden") return;
  for (const [i, m] of sugG.entries()) m.g.setAttribute("transform", `translate(${f1(m.x + Math.sin(t * 0.7 + i) * 10)} ${f1(m.y + Math.cos(t * 0.6 + i * 2) * 8)}) rotate(${f1(m.r + Math.sin(t * 0.5 + i) * 6)})`);
});
// enzyme molecules (invertase) entering with the nectar
const ENZ = [[200, 720, 15.35], [260, 800, 15.6], [300, 690, 15.85], [370, 900, 16.05], [520, 720, 16.25]];
ENZ.forEach(([x, y, at2], i) => {
  const e = enzyme(0, 0, 26, 1);
  const g = add(Dp.layers[1].svg, `<g class="paint" filter="url(#wc)">${e.paint}</g>${e.ink}`);
  const st = { x: -20, y: 705, s: 0.4 };
  film.each((t) => {
    g.setAttribute("transform", `translate(${f1(st.x + Math.sin(t * 1.3 + i) * 5)} ${f1(st.y + Math.cos(t * 1.1 + i) * 5)}) scale(${st.s.toFixed(3)}) rotate(${i * 40})`);
    g.style.visibility = st.x < 0 ? "hidden" : "";
  });
  tl.fromTo(st, { x: -20, y: 705, s: 0.4 }, { x, y, s: 1, duration: 0.9, ease: "power2.out", immediateRender: false }, at2);
  note("enzyme", at2, at2 + 0.3);
});
// on the paper above the sac, clear of its rim
const dEnz = label(Dp, 300, 292, "enzim <span style='font-style:normal'>(invertase)</span>", "l", { screen: true });
const ldEnz = leader(Dp, 250, 330, [200, 720], { screen: true, bend: 0.2 });
const dNote = label(Dp, 540, 200, "skema · nggak sesuai skala", "s", { screen: true });
// s05 -> s06: the camera keeps pushing, into the honey stomach
const IN6 = s.s06.start;
const cropOnPlate = toBee(-2.0, 0.1);
const C5 = { x: 480, y: 850, z: 1.72 };
const cropScr = [540 + (cropOnPlate[0] - C5.x) * C5.z, 960 + (cropOnPlate[1] - C5.y) * C5.z];
erase([cKantong, cCuma, cKatup], IN6 + 0.18, { duration: 0.2 });
tl.to([ldKantong, ldKatup], { opacity: 0, duration: 0.2 }, IN6 + 0.18);
onScreen(Dp, IN6 + 0.42, 17.35);
cut(Cp, Dp, IN6 + 0.42, 0.72, cropScr, { oldCam: { x: cropOnPlate[0] * 0.4 + C5.x * 0.6, y: cropOnPlate[1] * 0.4 + C5.y * 0.6, z: 1.95 }, settle: 1.05, settleDur: 1.0 });
write(dNote, IN6 + 0.75, { speed: 40 });
write(dEnz, 15.5, { speed: 24 });
leaderOn(ldEnz, 15.9, 0.3);

// ═══ Plate E: one sucrose cut in two by the enzyme (s07) ════════════════════════════════════════════════════════
const Ep = plate("pE", [1]);
const SU = sucrose(540, 600, 1.15);
const ringO = (x, y) => `<circle cx="${x}" cy="${y}" r="30" fill="${C.paper}"/><text x="${x}" y="${y + 16}" text-anchor="middle" font-family="Cormorant Garamond" font-style="italic" font-weight="500" font-size="54" fill="${C.ink}">O</text>`;
const eGlu = add(Ep.layers[0].svg, `<g class="paint" filter="url(#wc)">${W(SU.glucose, C.sienna, 0.55)}${W(ell(SU.gO[0] - 120, SU.gO[1] + 60, 60, 34), C.paper, 0.3)}</g>${K(SU.glucose, "k3")}${ringO(...SU.gO)}`);
const eFru = add(Ep.layers[0].svg, `<g class="paint" filter="url(#wc)">${W(SU.fructose, C.sienna, 0.55)}</g>${K(SU.fructose, "k3")}${ringO(...SU.fO)}`);
const eBond = inkG(Ep.layers[0], K(SU.bond, "k3"));
const eO = add(Ep.layers[0].svg, ringO(...SU.bridgeO));
const eSuk = label(Ep, 540, 330, "sukrosa", "l");
const eStrike = inkG(Ep.layers[0], K("M420 336 L660 322", "k2"));
const eGlk = label(Ep, 290, 1215, "glukosa", "l");
const eFrk = label(Ep, 800, 1215, "fruktosa", "l");
const eEnzLab = label(Ep, 880, 1010, "enzim", "m");
const eLdEnz = leader(Ep, 860, 975, [640, 880], { bend: 0.2 });
const ENZ_R = 130;
const eEnz = add(Ep.layers[0].svg, "");
// the enzyme comes in from the side and leaves the same way, clear of the caption at the foot of the frame
const enzSt = { x: 1320, y: 860, open: 1 };
film.each(() => {
  if (Ep.sec.style.visibility === "hidden") return;
  const e = enzyme(0, 0, ENZ_R, enzSt.open);
  eEnz.innerHTML = `<g transform="translate(${f1(enzSt.x)} ${f1(enzSt.y)})"><g class="paint" filter="url(#wc)">${e.paint}</g>${e.ink}</g>`;
});
const halves = { d: 0 };
film.each(() => {
  if (Ep.sec.style.visibility === "hidden") return;
  const k = halves.d;
  eGlu.setAttribute("transform", `translate(${f1(-55 * k)} ${f1(400 * k)}) rotate(${f1(-10 * k)} ${SU.gC1[0]} ${SU.gC1[1]})`);
  eFru.setAttribute("transform", `translate(${f1(60 * k)} ${f1(400 * k)}) rotate(${f1(12 * k)} ${SU.fC2[0]} ${SU.fC2[1]})`);
});
const IN7 = s.s07.start;
erase([dEnz, dNote], IN7 - 0.33, { duration: 0.22 });
tl.to(ldEnz, { opacity: 0, duration: 0.2 }, IN7 - 0.33);
onScreen(Ep, IN7 - 0.08, 20.6);
cut(Dp, Ep, IN7 - 0.08, 0.72, [540 + (460 - 540) * 1.04, 960 + (860 - 960) * 1.04], { oldCam: { x: 480, y: 880, z: 1.18 }, settle: 1.05, settleDur: 1.2 });
write(eSuk, IN7 + 0.15, { speed: 16 });
tl.to(enzSt, { x: 540, duration: 0.85, ease: "power2.out" }, 16.95);
write(eEnzLab, 17.3, { speed: 16 });
leaderOn(eLdEnz, 17.55, 0.25);
tl.to(enzSt, { y: SU.bridgeO[1] + ENZ_R * 0.86, duration: 0.45, ease: "power2.inOut" }, 17.75);
// the jaws close and the bond snaps on "dua" (18.31): the halves spring apart at once, the pluck on the snap
tl.to(enzSt, { open: 0, duration: 0.18, ease: "power3.in" }, 18.12);
note("cut", 18.3, 18.4);
tl.to([eBond, eO], { opacity: 0, duration: 0.05 }, 18.29);
tl.to(enzSt, { open: 1, duration: 0.3 }, 18.34);
tl.to(halves, { d: 1, duration: 1.0, ease: "power3.out" }, 18.3);
tl.to(enzSt, { x: 1340, y: 560, duration: 0.9, ease: "power2.in" }, 18.55);
tl.to([eEnzLab, eLdEnz], { opacity: 0, duration: 0.25 }, 18.4);
drawOn(eStrike, 18.45, { duration: 0.25 });
write(eGlk, 18.9, { speed: 16 });
write(eFrk, 19.15, { speed: 16 });

// ═══ Plate F: at the hive, mouth to mouth (s08) ═══════════════════════════════════════════════════════════════════
const Fp = plate("pF", [0.6, 1]);
const FS = 27;
const fragF = fragment(540, 640, 430, 330, 2, 0.08);
const combF = combFace(-120, 120, 8, 6, 100, { seed: 2, outline: (x, y) => y < 880 && fragF(x, y) });
paint(Fp.layers[0], `<g opacity=".5">${combF.wax}${combF.edge}${combF.inner}</g>`);
add(Fp.layers[0].svg, `<g opacity=".55">${combF.ink.replaceAll('class="k1"', 'class="k0" style="stroke:#a89170"')}</g>`);
// the comb's edge they stand on: a row of cell rims seen from the side
const RIM = 945;
const rimRow = Array.from({ length: 8 }, (_, i) => cellSection(140 + i * 100, RIM, 86, 120));
paint(Fp.layers[1], rimRow.map((c) => c.wax).join(""));
inkG(Fp.layers[1], rimRow.map((c) => c.ink).join(""));
const FO = [540 - 6.6 * FS, RIM - 4.4 * FS], RO = [540 + 6.9 * FS, RIM - 4.4 * FS];
const forager = add(Fp.layers[1].svg, "", "flyer");
placeBee(forager, beeSide({ wings: "raised", id: "f1", seed: 4 }), `translate(${FO[0]} ${FO[1]}) scale(${FS})`);
const fp0 = beeFlap(0.3, 1);
const fFlap = add(forager, `<g transform="translate(${FO[0]} ${FO[1]}) scale(${FS})"><g class="paint" filter="url(#wc)">${fp0.paint}</g>${fp0.ink}</g>`);
const receiver = add(Fp.layers[1].svg, "");
const rBee = placeBee(receiver, beeSide({ wings: "rest", tongue: 1.7, tongueAngle: 18, id: "f2", seed: 6 }), `translate(${RO[0]} ${RO[1]}) scale(${-FS} ${FS})`);
const rTongue = rBee.ink.querySelector('[data-part="tongue"]');
// the drop: from between the forager's mandibles, along the receiver's tongue
const fd = drop(0, 0, 13, C.ultra, 0.42);
const fDrop = add(Fp.layers[1].svg, `<g class="paint" filter="url(#wc)">${fd.paint}</g>${fd.ink}`);
const dropSt = { x: FO[0] + 6.3 * FS, y: FO[1] + 2.5 * FS, k: 0 };
film.each(() => {
  fDrop.setAttribute("transform", `translate(${f1(dropSt.x)} ${f1(dropSt.y)}) rotate(90) scale(${dropSt.k.toFixed(3)})`);
  fDrop.style.visibility = dropSt.k < 0.02 ? "hidden" : "";
});
const fLab = label(Fp, 540, 560, "dari mulut ke mulut", "l");
const fLd = leader(Fp, 540, 600, [548, FO[1] + 2.4 * FS], { bend: 0.15 });
const IN8 = s.s08.start;
onScreen(Fp, IN8 - 0.18, 24.7);
cut(Ep, Fp, IN8 - 0.18, 0.75, [540, 900], { oldCam: { z: 1.06 }, rim: "#b08a44", settle: 0 });
const fly2 = { x: -620, y: -420, flap: 1 };
film.each(() => {
  forager.setAttribute("transform", `translate(${f1(fly2.x)} ${f1(fly2.y)})`);
  fFlap.style.opacity = fly2.flap.toFixed(3);
});
tl.to(fly2, { x: 0, duration: 0.8, ease: "power2.out" }, IN8);
tl.to(fly2, { y: 0, duration: 0.8, ease: "back.out(1.3)" }, IN8);
tl.to(fly2, { flap: 0, duration: 0.25 }, IN8 + 0.65);
note("buzz", IN8, IN8 + 0.7);
note("land", IN8 + 0.75, IN8 + 0.8);
tl.fromTo(Fp.cam, { x: 500 }, { x: 560, duration: s.s09.start - IN8, ease: "none", immediateRender: false }, IN8);
tl.to(dropSt, { k: 1, duration: 0.35, ease: "back.out(2)" }, 21.15);
gsap.set(rTongue, { attr: { pathLength: 1 }, strokeDasharray: "1 1.02", strokeDashoffset: 1.01 });
tl.to(rTongue, { strokeDashoffset: 0, duration: 0.35 }, 21.45);
tl.to(dropSt, { x: RO[0] - 6.0 * FS, y: RO[1] + 2.3 * FS, duration: 1.0, ease: "power1.inOut" }, 21.95);
note("pass", 21.95, 22.95);
write(fLab, 22.1, { speed: 22 });
leaderOn(fLd, 22.5, 0.3);
tl.to(fly2, { flap: 1, duration: 0.15 }, 23.25);
tl.to(fly2, { x: -700, y: -900, duration: 0.8, ease: "power2.in" }, 23.35);
note("buzz", 23.25, 23.9);

// ═══ Plate G: the comb face, close; then pulled back over the comb (s09, s10) ═══════════════════════════════════════
const Gp = plate("pG", [1]);
const GR = 100, G0 = [-390, -360];
const NECT = ["3,5", "4,6", "6,7", "2,8", "5,9", "1,10", "7,11", "3,12", "6,4", "0,7", "8,9", "4,13", "2,4", "7,6", "5,12", "1,6", "6,11", "3,9"];
const TARGET = [4, 8]; // the cell she fills
const combG = combFace(G0[0], G0[1], 11, 20, GR, { seed: 5, outline: fragment(540, 780, 440, 495, 7, 0.07) });
const keptG = new Set(combG.kept.map(([c, r]) => `${c},${r}`));
paint(Gp.layers[0], combG.wax + combG.edge);
paint(Gp.layers[0], combG.inner);
inkG(Gp.layers[0], combG.ink);
paint(Gp.layers[0], NECT.filter((k) => keptG.has(k)).map((k) => { const [c, r] = k.split(",").map(Number); return cellFill(...cellAt(G0[0], G0[1], GR, c, r), GR, "nectar", 0.62 + ((c * 7 + r * 3) % 5) * 0.08); }).join(""));
const tgt = cellAt(G0[0], G0[1], GR, ...TARGET);
paint(Gp.layers[0], cellFill(...tgt, GR, "nectar", 0.85), { bloom: { at: 25.2, from: [tgt[0] - 20, tgt[1]], dur: 0.6, reach: 140 } });
// the receiver, from above, walking in from the right; her head goes into the cell (four poses of her legs)
const topBees = [0, 1, 2, 3].map((k) => beeTop({ id: `g${k}`, step: k / 4, seed: 5 + k }));
const gBee = add(Gp.layers[0].svg, "");
const gPoses = topBees.map((Bt) => placeTop(gBee, Bt, "scale(-32 32)"));
const walk = { x: 1150, y: tgt[1] + 6, step: 0 };
film.each(() => {
  if (Gp.sec.style.visibility === "hidden") return;
  gBee.setAttribute("transform", `translate(${f1(walk.x)} ${f1(walk.y)})`);
  const k = Math.floor(walk.step * 4) % 4;
  gPoses.forEach((g, i) => (g.style.display = i === k ? "" : "none"));
});
inkG(Gp.layers[0], K(hex(...tgt, GR * 0.88), "k2")); // the cell's rim over her head as she reaches in
// small workers about the comb, seen in the pull back
// (each either wholly in the close frame of s09 or wholly outside it, so none is cut by the frame's edge)
const crowd = [[700, 500, 200], [420, 1150, -25]].map(([x, y, r], i) => {
  const g = add(Gp.layers[0].svg, "");
  placeTop(g, topBees[i % 4], `translate(${x} ${y}) rotate(${r}) scale(32)`);
  return { g, r };
});
film.each((t) => {
  if (Gp.sec.style.visibility === "hidden") return;
  crowd.forEach((c, i) => {
    const a = (c.r * Math.PI) / 180, v = 22 * Math.max(0, t - 24) * (i % 2 ? 1 : 0.6);
    c.g.setAttribute("transform", `translate(${f1(Math.cos(a) * v)} ${f1(Math.sin(a) * v)})`);
  });
});
// labels on the paper above the comb
const gSel = label(Gp, 250, 175, "sel lilin", "l", { screen: true });
const ldSel = leader(Gp, 260, 215, [tgt[0] - GR * 0.9, tgt[1] - GR * 0.5], { screen: true, bend: 0.25 });
const gNote = label(Gp, 540, 230, "nektar di sel masih encer", "l", { screen: true });
const nc = cellAt(G0[0], G0[1], GR, 6, 7);
const ldNote = leader(Gp, 600, 270, nc, { screen: true, bend: -0.15 });
const IN9 = s.s09.start;
onScreen(Gp, IN9 - 0.18, 28.4);
// s08 -> s09: her cell floods in from where she is, as the camera follows her
erase(fLab, IN9 - 0.5, { duration: 0.25 });
tl.to(fLd, { opacity: 0, duration: 0.2 }, IN9 - 0.5);
cut(Fp, Gp, IN9 - 0.18, 0.75, [760, 830], { oldCam: { x: 640 }, rim: "#b08a44", settle: 1.04, settleDur: 1.2 });
tl.to(walk, { x: tgt[0] + 9.5 * 32, step: 3, duration: 0.9, ease: "power1.out" }, IN9);
tl.to(walk, { x: tgt[0] + 5.4 * 32, step: 4.5, duration: 0.4, ease: "power1.inOut" }, 24.95);
note("dab", 25.3, 25.4);
write(gSel, 25.5, { speed: 16 });
leaderOn(ldSel, 25.85, 0.3);
// s10: she backs out; the camera pulls back over the whole comb: many cells hold thin nectar
tl.to(walk, { x: tgt[0] + 9.5 * 32, step: 7, duration: 0.8, ease: "power1.inOut" }, 26.0);
camTo(Gp, { z: 0.74, x: 540, y: 820 }, 26.05, 1.4, "power2.inOut");
erase(gSel, 26.1, { duration: 0.25 });
tl.to(ldSel, { opacity: 0, duration: 0.2 }, 26.1);
write(gNote, 26.15, { duration: 0.5 });
leaderOn(ldNote, 26.6, 0.3);

// ═══ Plate H: cells cut through, three workers fanning (s10b), then close on the nectar (s11) ═══════════════════
// A diagram: the workers stand on the comb's edge above; the air they drive runs in a band over the open cells, and
// the water rising off the nectar is carried away in it, round the bees, not through them.
const Hp = plate("pH", [1]);
const CUPY = 1060, LEDGE = 690;
const CUPS = [0, 1, 2].map((i) => cellSection(180 + i * 250, CUPY, 210, 200));
paint(Hp.layers[0], CUPS.map((c) => c.wax).join(""), { filter: "wcb" });
inkG(Hp.layers[0], CUPS.map((c) => c.ink).join(""));
// the edge of the comb above them: wax, cut through, the cell bases in it
const ledge = `M120 ${LEDGE + 4} C140 ${LEDGE - 2} 400 ${LEDGE - 4} 700 ${LEDGE + 3} C840 ${LEDGE + 1} 930 ${LEDGE - 3} 960 ${LEDGE + 2} C972 ${LEDGE + 10} 968 ${LEDGE + 22} 955 ${LEDGE + 27} C700 ${LEDGE + 30} 300 ${LEDGE + 24} 128 ${LEDGE + 28} C114 ${LEDGE + 22} 112 ${LEDGE + 10} 120 ${LEDGE + 4} Z`;
paint(Hp.layers[0], W(ledge, C.wax, 0.9) + W(`M126 ${LEDGE + 15} C400 ${LEDGE + 12} 700 ${LEDGE + 18} 962 ${LEDGE + 14} L955 ${LEDGE + 27} C700 ${LEDGE + 30} 300 ${LEDGE + 24} 128 ${LEDGE + 28} Z`, "#c99a4c", 0.3), { filter: "wcb" });
inkG(Hp.layers[0], K(ledge, "k1") + Array.from({ length: 7 }, (_, i) => K(`M${175 + i * 115} ${LEDGE + 27} L${187 + i * 115} ${LEDGE + 2}`, "k0", ' style="stroke-opacity:.4"')).join(""));
const liq = { level: 0.8, amber: 0 };
const hLiq = add(Hp.layers[0].svg, `<g class="paint live" filter="url(#wc)">${CUPS.map(() => `<path class="lb" fill="${C.ultra}" fill-opacity=".38"/><path class="la" fill="#d0892f" fill-opacity="0"/>`).join("")}</g>${CUPS.map(() => '<path class="k1 ll"/>').join("")}`);
film.each(() => {
  if (Hp.sec.style.visibility === "hidden") return;
  const lb = hLiq.querySelectorAll(".lb"), la = hLiq.querySelectorAll(".la"), ll = hLiq.querySelectorAll(".ll");
  CUPS.forEach((c, i) => {
    const d = c.liquid(liq.level);
    lb[i].setAttribute("d", d);
    la[i].setAttribute("d", d);
    // blue gives way fast and amber comes in early, so the mix passes through warm, not grey
    la[i].setAttribute("fill-opacity", (0.72 * liq.amber ** 0.6).toFixed(3));
    lb[i].setAttribute("fill-opacity", (0.38 * (1 - liq.amber) ** 3.5).toFixed(3));
    ll[i].setAttribute("d", d.split(" L")[0]);
  });
});
// three workers, not one drawn three times: each her own size, stance (legs braced wide, square, or drawn in), the
// lift of her abdomen and her beat
const legShift = (dx) => Object.fromEntries(Object.entries(dx).map(([k, d]) => [k, STAND[k].map(([x, y], j) => [j >= 3 ? x + d * (j >= 5 ? 1 : 0.6) : x, y])]));
const FAN = [
  [272, 17.5, -2, 7, 7, { fore: 0.45, mid: -0.25, hind: -0.5 }],
  [542, 16.5, 1.5, 8, 0, {}],
  [803, 18.2, -1, 9, 15, { fore: -0.3, mid: 0.3, hind: 0.35 }],
];
const fanners = FAN.map(([x, hs, rot, seed, abdRot, legs], i) => {
  const g = add(Hp.layers[0].svg, "");
  const tr = `translate(${x} ${LEDGE + 2}) rotate(${rot}) translate(${-0.4 * hs} ${-4.4 * hs}) scale(${-hs} ${hs})`;
  placeBee(g, beeSide({ wings: "none", id: `h${i}`, seed, legs: legShift(legs) }), tr, { abdRot });
  const phases = Array.from({ length: 6 }, (_, k) => {
    const fp = beeFlap(k / 6, 1);
    return add(g, `<g transform="${tr}"><g class="paint" filter="url(#wc)">${fp.paint}</g>${fp.ink}</g>`);
  });
  return { x, phases, rate: [3, 3.5, 2.7][i] };
});
film.each((t) => {
  if (Hp.sec.style.visibility === "hidden") return;
  fanners.forEach((b, i) => {
    const k = Math.floor(((t * b.rate + i * 0.37) % 1) * 6);
    b.phases.forEach((p, j) => (p.style.display = j === k ? "" : "none"));
  });
});
// the air they drive, in a band between the comb edge and the cells, left to right
const hAir = [[790, 0], [850, 14], [905, -8], [960, 5]].map(([y, w]) => inkG(Hp.layers[0], K(`M130 ${y} C330 ${y - 18 + w} 600 ${y + 20} 820 ${y - 6}`, "k1") + K(`M798 ${y - 20} L828 ${y - 6} L800 ${y + 10}`, "k1")));
// vapour: wisps rising off each cell into the band, where the air carries them right
const hVap = add(Hp.layers[0].svg, CUPS.map((c, i) => `<path class="vp" d="M${285 + i * 250} 1110 c-10 -40 14 -70 2 -110 c-8 -30 46 -48 110 -52" fill="none" stroke="${C.ultra}" stroke-opacity=".75" stroke-width="3" stroke-linecap="round" pathLength="1"/>`).join(""));
const hKipas = label(Hp, 540, 380, "kipas sayap", "l", { screen: true });
const hSkema = label(Hp, 540, 215, "irisan sel · skema<br>(di sarang, sel tidur mendatar)", "c", { screen: true });
// where the air carries it: at the end of the band, clear of the bees and the comb edge
const hUap = label(Hp, 868, 885, "uap air", "m left", { screen: true });
const ldUap = leader(Hp, 872, 905, [890, 950], { screen: true, bend: 0.2 });
const IN10b = s.s10b.start;
onScreen(Hp, IN10b - 0.04, 31.95);
// s10 -> s10b: the camera drifts down to the comb's edge as the cells cut through flood up from below
erase(gNote, IN10b - 0.26, { duration: 0.2 });
tl.to(ldNote, { opacity: 0, duration: 0.2 }, IN10b - 0.26);
cut(Gp, Hp, IN10b - 0.04, 0.75, [540, 1300], { oldCam: { y: 1150 }, settle: 1.04, settleDur: 1.2 });
hAir.forEach((g, i) => drawOn(g, 28.2 + i * 0.3, { duration: 0.6 }));
note("fan", IN10b, s.s11.end);
write(hKipas, 28.3, { speed: 18 });
write(hSkema, 28.45, { duration: 0.7 });
// s11: push in on the cells; vapour rises and drifts; the level sinks to a quarter and the nectar warms to honey
camTo(Hp, { x: 540, y: 980, z: 1.08 }, s.s11.start - 0.25, 1.3);
tl.to(hKipas, { opacity: 0, duration: 0.25 }, s.s11.start - 0.2);
erase(hSkema, 30.95, { duration: 0.2 });
const vps = [...hVap.querySelectorAll(".vp")];
gsap.set(vps, { strokeDasharray: "1 1.02", strokeDashoffset: 1.01 });
vps.forEach((p, i) => {
  tl.to(p, { strokeDashoffset: 0, duration: 0.7, ease: "power1.out" }, 29.9 + i * 0.12);
  tl.to(p, { x: 140, opacity: 0, duration: 0.9, ease: "power1.in" }, 30.55 + i * 0.12);
});
note("vapour", 30.15, 31.2);
tl.to(liq, { level: 0.2, duration: 1.6, ease: "power1.inOut" }, 29.5);
tl.to(liq, { amber: 1, duration: 1.1, ease: "power2.out" }, 29.55);
write(hUap, 30.1, { speed: 16 });
leaderOn(ldUap, 30.35, 0.3);

// ═══ Plate I: 100 g of nectar dries to 25 g of honey (s12) ════════════════════════════════════════════════════════
// 7 px a gram on one base line (f8): nectar 700 px (560 water over 140 sugar); honey 175 px (35 water over 140).
const Ip = plate("pI", [1]);
const PX = 7, BASE = 1180, SUGAR = 20 * PX, WATER_N = 80 * PX, WATER_H = 5 * PX;
const C1 = { x: 175, w: 220 }, C2 = { x: 640, w: 220 };
const iBase = inkG(Ip.layers[0], K(`M110 ${BASE} H970`, "k3"));
paint(Ip.layers[0], W(`M${C1.x} ${BASE - SUGAR} H${C1.x + C1.w} V${BASE} H${C1.x} Z`, C.sienna, 0.62) + W(`M${C1.x} ${BASE - SUGAR - WATER_N} H${C1.x + C1.w} V${BASE - SUGAR} H${C1.x} Z`, C.ultra, 0.42), { filter: "wcb", bloom: { at: s.s12.start - 0.12, from: [C1.x + 110, 830], dur: 0.65, reach: 900 } });
const colNInk = inkG(Ip.layers[0], K(`M${C1.x} ${BASE} V${BASE - SUGAR - WATER_N} H${C1.x + C1.w} V${BASE} M${C1.x} ${BASE - SUGAR} H${C1.x + C1.w}`, "k2"));
// the copy that dries: its water band drains from the top, its sugar band stays where it is
const dry = { x: C1.x, water: WATER_N };
const colH = add(Ip.layers[0].svg, `<g class="paint live" filter="url(#wcb)"><path class="s" fill="${C.sienna}" fill-opacity=".62"/><path class="w" fill="${C.ultra}" fill-opacity=".42"/></g><path class="k2 o"/>`);
film.each(() => {
  if (Ip.sec.style.visibility === "hidden") return;
  const x = dry.x, w = C2.w, top = BASE - SUGAR - dry.water;
  colH.querySelector(".s").setAttribute("d", `M${f1(x)} ${BASE - SUGAR} H${f1(x + w)} V${BASE} H${f1(x)} Z`);
  colH.querySelector(".w").setAttribute("d", `M${f1(x)} ${f1(top)} H${f1(x + w)} V${BASE - SUGAR} H${f1(x)} Z`);
  colH.querySelector(".o").setAttribute("d", `M${f1(x)} ${BASE} V${f1(top)} H${f1(x + w)} V${BASE} M${f1(x)} ${BASE - SUGAR} H${f1(x + w)}`);
});
const iNek = label(Ip, C1.x + 110, 405, "nektar <span class='num'>100 g</span>", "l");
const iAirN = label(Ip, C1.x + 110, 760, "air <span class='num'>80 %</span>", "l");
const iGulaN = label(Ip, C1.x + 110, BASE - 70, "gula", "m");
const iMadu = label(Ip, C2.x + 110, 960, "madu <span class='num'>25 g</span>", "m");
const iAirH = label(Ip, C2.x + 110, 790, "air <span class='num'>±20 %</span>", "l big");
const iAirH2 = label(Ip, C2.x + 110, 866, "dari madu", "m");
const iGulaH = label(Ip, C2.x + 110, BASE - 70, "gula", "m");
const iSame = label(Ip, 540, 1250, "gula tetap sama", "m");
const iSameInk = inkG(Ip.layers[0], `<path class="k1" d="M${C1.x + C1.w + 12} ${BASE - SUGAR} H${C2.x - 12}" stroke-dasharray="10 9"/>`);
// the water leaves: an arrow up and away from the nectar's water, clear of the honey's numbers below it
const iArrow = inkG(Ip.layers[0], K("M405 610 C470 560 540 480 625 450", "k2") + K("M605 470 L625 450 L597 447", "k2"));
const iEvap = label(Ip, 810, 440, "<span class='num'>75 g</span> air menguap", "m");
const IN12 = s.s12.start;
onScreen(Ip, IN12 - 0.2, 36.1);
erase(hUap, IN12 - 0.42, { duration: 0.2 });
tl.to(ldUap, { opacity: 0, duration: 0.18 }, IN12 - 0.42);
cut(Hp, Ip, IN12 - 0.2, 0.72, [285, 830], { settle: 0 });
drawOn([iBase, colNInk], IN12 - 0.15, { duration: 0.45 });
write(iNek, IN12 + 0.1, { speed: 26 });
write(iAirN, IN12 + 0.45, { speed: 22 });
write(iGulaN, IN12 + 0.7, { speed: 18 });
gsap.set(colH, { opacity: 0 });
tl.set(colH, { opacity: 1 }, 32.0);
tl.to(dry, { x: C2.x, duration: 0.6, ease: "power2.inOut" }, 32.0);
note("slide", 32.0, 32.6);
tl.to(dry, { water: WATER_H, duration: 1.5, ease: "power1.inOut" }, 32.6);
note("drain", 32.6, 34.1);
drawOn(iArrow, 33.05, { duration: 0.4 });
write(iEvap, 33.25, { speed: 26 });
drawOn(iSameInk, 33.5, { duration: 0.3 });
write(iSame, 33.6, { speed: 30 });
write(iGulaH, 33.9, { speed: 18 });
write(iAirH, 34.1, { duration: 0.4 });
write(iAirH2, 34.35, { duration: 0.3 });
write(iMadu, 34.55, { speed: 26 });

// ═══ Plate J: the comb full of ripe honey, capped with wax (s13) ═══════════════════════════════════════════════════
const Jp = plate("pJ", [1]);
const JR = 104, J0 = [110, 330];
const combJ = combFace(J0[0], J0[1], 6, 9, JR, { seed: 9, outline: fragment(545, 790, 390, 500, 4, 0.08) });
const keptJ = new Set(combJ.kept.map(([c, r]) => `${c},${r}`));
paint(Jp.layers[0], combJ.wax + combJ.edge);
paint(Jp.layers[0], combJ.inner);
inkG(Jp.layers[0], combJ.ink);
const honeyCells = combJ.kept.map(([col, row]) => cellAt(J0[0], J0[1], JR, col, row));
paint(Jp.layers[0], honeyCells.map((c) => cellFill(...c, JR, "honey")).join(""), { filter: "wcb" });
// caps, column by column from the left: matte, opaque, cream-white wax, each with a fine rim
// (the four leftmost columns of the piece that have three cells or more)
const capCols = [0, 1, 2, 3, 4, 5].filter((col) => combJ.kept.filter(([c]) => c === col).length >= 3).slice(0, 4);
capCols.forEach((col, k) => {
  const cells = Array.from({ length: 9 }, (_, row) => row).filter((row) => keptJ.has(`${col},${row}`)).map((row) => cellAt(J0[0], J0[1], JR, col, row));
  if (!cells.length) return;
  paint(Jp.layers[0], cells.map((c) => cellFill(...c, JR, "cap")).join(""), { bloom: { at: 36.1 + k * 0.45, from: cells[Math.floor(cells.length / 2)], dur: 0.7, reach: 900 } }).style.mixBlendMode = "normal";
  const gi = inkG(Jp.layers[0], cells.map((c) => K(hex(...c, JR * 0.84), "k0", ' style="stroke:#a88f62;stroke-opacity:.7"')).join(""));
  drawOn(gi, 36.15 + k * 0.45, { duration: 0.4 });
  note("cap", 36.2 + k * 0.45, 36.6 + k * 0.45);
});
const jBee = add(Jp.layers[0].svg, "");
const jPoses = [0, 1, 2, 3].map((i) => placeTop(jBee, beeTop({ id: `j${i}`, step: i / 4, seed: 9 + i }), "scale(30)"));
const jw = { x: -260, step: 0 };
const JROW = cellAt(J0[0], J0[1], JR, 0, 4)[1];
film.each(() => {
  if (Jp.sec.style.visibility === "hidden") return;
  jBee.setAttribute("transform", `translate(${f1(jw.x)} ${JROW})`);
  const k = Math.floor(jw.step * 4) % 4;
  jPoses.forEach((g, i) => (g.style.display = i === k ? "" : "none"));
});
const jLab = label(Jp, 760, 190, "tutup lilin", "l");
const jcRow = Array.from({ length: 9 }, (_, row) => row).filter((row) => keptJ.has(`${capCols[0]},${row}`))[1];
const jc = cellAt(J0[0], J0[1], JR, capCols[0], jcRow);
const ldJ = leader(Jp, 735, 228, [jc[0] + 30, jc[1]], { bend: 0.2 });
const IN13 = s.s13.start;
onScreen(Jp, 35.35, 38.75);
cut(Ip, Jp, 35.35, 0.72, [750, 1100], { rim: C.sienna, settle: 1.04, settleDur: 2.5 });
tl.to(jw, { x: cellAt(J0[0], J0[1], JR, capCols[3] ?? 3, 4)[0] - 120, step: 10, duration: 2.3, ease: "none" }, 35.6);
write(jLab, 37.2, { speed: 18 });
leaderOn(ldJ, 37.5, 0.25);
erase(jLab, 37.85, { duration: 0.2 });
tl.to(ldJ, { opacity: 0, duration: 0.15 }, 37.85);

// ═══ Plate K: honey in the jar, the lid on, beside capped comb (s14) ════════════════════════════════════════════
const Kp = plate("pK", [1]);
const JK = jar(200, 700, 830, 1250, 900);
paint(Kp.layers[0], JK.glass, { filter: "wcb" });
paint(Kp.layers[0], JK.honey + JK.surface, { filter: "wcb" });
inkG(Kp.layers[0], JK.ink);
const lid = add(Kp.layers[0].svg, `<g class="paint" filter="url(#wc)">${JK.lid}</g>${JK.lidInk}`);
const combK = combFace(790, 700, 2, 6, 62);
paint(Kp.layers[0], combK.wax);
paint(Kp.layers[0], Array.from({ length: 12 }, (_, i) => cellFill(...cellAt(790, 700, 62, i % 2, Math.floor(i / 2)), 62, "cap")).join("")).style.mixBlendMode = "normal";
inkG(Kp.layers[0], combK.ink);
const kN1 = label(Kp, 540, 420, "awet, asal tertutup rapat", "l");
const kN2 = label(Kp, 285, 580, "air sedikit:<br>ragi &amp; mikroba susah tumbuh", "m left");
// awet, shown: a drop of the honey under the lens, a few yeast cells in it. With so little free water they lose
// water instead of taking it in (their walls crimp), and the bud each starts never grows.
const YC = [180, 575], YR = 78;
const crimp = (x, y, rx, ry, rot, seed) => {
  const r = rng(seed), a0 = (rot * Math.PI) / 180;
  return poly(Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2, k = 1 + (i % 2 ? -0.1 : 0.06) + (r() - 0.5) * 0.06;
    const ex = Math.cos(a) * rx * k, ey = Math.sin(a) * ry * k;
    return [x + ex * Math.cos(a0) - ey * Math.sin(a0), y + ex * Math.sin(a0) + ey * Math.cos(a0)];
  }));
};
const YEAST = [[-28, -20, 25, 1], [24, -24, -30, 2], [-10, 24, 60, 3], [34, 18, 5, 4]];
const yCells = YEAST.map(([dx, dy, rot, sd]) => crimp(YC[0] + dx, YC[1] + dy, 15, 11, rot, sd)).join(" ");
const yLens = paint(Kp.layers[0], W(`M${YC[0] - YR} ${YC[1]} a${YR} ${YR} 0 1 0 ${2 * YR} 0 a${YR} ${YR} 0 1 0 ${-2 * YR} 0 Z`, C.ochre, 0.42) + W(ell(YC[0] + 10, YC[1] + 14, YR * 0.8, YR * 0.7), C.sienna, 0.18) + W(yCells, "#f3e6c4", 0.85), { bloom: { at: 39.95, from: YC, dur: 0.5, reach: 200 } });
const yInk = inkG(Kp.layers[0], K(`M${YC[0] - YR} ${YC[1]} a${YR} ${YR} 0 1 0 ${2 * YR} 0 a${YR} ${YR} 0 1 0 ${-2 * YR} 0 Z`, "k2") + K(yCells, "k0"));
const yBuds = YEAST.map(([dx, dy, rot]) => {
  const a = (rot * Math.PI) / 180, bx = YC[0] + dx + Math.cos(a) * 16, by = YC[1] + dy + Math.sin(a) * 16;
  return add(Kp.layers[0].svg, `<g transform="translate(${f1(bx)} ${f1(by)})"><g class="yb"><circle r="5.5" fill="#f3e6c4" stroke="${C.ink}" stroke-width="1.2" stroke-opacity=".7"/></g></g>`).querySelector(".yb");
});
const IN14 = s.s14.start;
onScreen(Kp, IN14 - 0.06, 41.95);
cut(Jp, Kp, IN14 - 0.06, 0.72, [880, 980], { oldCam: { z: 1.0 }, settle: 1.06, settleDur: 3.0 });
gsap.set(lid, { y: -380 });
tl.to(lid, { y: 0, duration: 0.75, ease: "power2.inOut" }, 37.95);
note("lid", 38.7, 38.75);
write(kN1, 39.4, { speed: 26 });
write(kN2, 39.95, { duration: 0.7 });
drawOn(yInk, 40.0, { duration: 0.4 });
gsap.set(yBuds, { scale: 0, transformOrigin: "50% 50%" });
tl.to(yBuds, { scale: 1, duration: 0.25, ease: "power1.out", stagger: 0.05 }, 40.3);
tl.to(yBuds, { scale: 0.35, duration: 0.4, ease: "power1.in", stagger: 0.05 }, 40.6);

// ═══ Plate L: the answer on one plate (s15) ════════════════════════════════════════════════════════════════════
const Lp = plate("pL", [1]);
const vg = Lp.layers[0];
// 1: kaliandra and its nectar
const KL = raceme({ seed: 3, leaf: false, flowers: 10, id: "kl" });
const dl = drop(215, 560, 14);
paint(vg, `<g transform="translate(215 430) scale(2.3)">${KL.tuft}${KL.budPaint}${KL.calyx}${KL.tube}</g>` + dl.paint, { bloom: { at: 41.22, from: [215, 460], dur: 0.7, reach: 300 } });
bloomIn(vg, add(vg.svg, `<g transform="translate(215 430) scale(2.3)"><g class="stam">${KL.stam}</g></g>`), { at: 41.27, from: [215, 460], dur: 0.7, reach: 300, log: false });
const v1i = inkG(vg, `<g transform="translate(215 430) scale(2.3)">${KL.budInk}${K(KL.stem, "k1")}</g>` + dl.ink);
const l1 = label(Lp, 640, 420, "nektar<br><span class='num'>air ±80 %</span>", "l c");
// 2: the worker, the enzyme at her mouth
const v2 = add(vg.svg, "");
placeBee(v2, beeSide({ wings: "rest", id: "l2", seed: 12 }), "translate(190 690) scale(17)");
bloomIn(vg, v2, { at: 42.85, from: [200, 690], dur: 0.6, reach: 300 });
paint(vg, enzyme(320, 745, 16, 0.8).paint, { bloom: { at: 43.2, from: [320, 745], dur: 0.4, reach: 60 } });
const l2 = label(Lp, 640, 680, "enzim:<br>gula dipotong", "l c");
// 3: two workers fanning over open cells
const v3 = add(vg.svg, "");
const smallCups = [0, 1, 2, 3].map((i) => cellSection(78 + i * 74, 990, 60, 70));
add(v3, `<g class="paint" filter="url(#wc)">${smallCups.map((c) => c.wax + `<path d="${c.liquid(0.6)}" fill="${C.ultra}" fill-opacity=".35"/>`).join("")}</g>${smallCups.map((c) => c.ink).join("")}`);
[150, 290].forEach((x, i) => {
  const g = add(v3, "");
  placeBee(g, beeSide({ wings: "none", id: `l3${i}`, seed: 14 + i }), `translate(${x} ${990 - 4.4 * 10}) scale(-10 10)`);
  const fp = beeFlap(i * 0.3, 1);
  add(g, `<g transform="translate(${x} ${990 - 4.4 * 10}) scale(-10 10)"><g class="paint" filter="url(#wc)">${fp.paint}</g>${fp.ink}</g>`);
});
bloomIn(vg, v3, { at: 43.95, from: [210, 960], dur: 0.6, reach: 300 });
const l3 = label(Lp, 640, 940, "kipas sayap:<br>air menguap", "l c");
// 4: the jar of honey
const JL = jar(140, 290, 1130, 1270, 1165);
paint(vg, JL.glass + JL.honey, { bloom: { at: 45.0, from: [215, 1250], dur: 0.5, reach: 300 } });
const v4i = inkG(vg, JL.ink);
const l4 = label(Lp, 640, 1190, "madu<br><span class='num'>air ±20 %</span>", "l c");
l4.style.color = C.sienna;
const arrows = [[575, 625], [800, 860], [1060, 1110]].map(([a, b]) => inkG(vg, K(`M215 ${a} V${b}`, "k1") + K(`M203 ${b - 14} L215 ${b} L227 ${b - 14}`, "k1")));
const IN15 = s.s15.start;
// the jar holds until the line ends ("banget." 40.47-41.0), then the recap floods in round its first drawing
onScreen(Lp, 41.12, 48.05);
cut(Kp, Lp, 41.12, 0.72, [215, 430], { settle: 0 });
tl.fromTo(Lp.cam, { z: 1 }, { z: 1.03, y: 920, duration: 47.1 - 41.12, ease: "none", immediateRender: false }, 41.12);
drawOn(v1i, 41.45, { duration: 0.4 });
write(l1, 42.25, { speed: 24 });
drawOn(arrows[0], 42.7, { duration: 0.2 });
write(l2, 43.3, { speed: 24 });
drawOn(arrows[1], 43.8, { duration: 0.2 });
write(l3, 44.35, { speed: 26 });
drawOn(arrows[2], 44.85, { duration: 0.2 });
drawOn(v4i, 45.05, { duration: 0.35 });
write(l4, 45.15, { speed: 26 });

// ═══ s16: a sienna wash floods the page; the opening comes up under it as it settles ═══════════════════════════════
const IN16 = s.s16.start;
const BACK = 47.1;
tl.set([lKental, lEncer, ldKental, ldEncer], { opacity: 0 }, BACK - 0.05);
tl.set(A.cam, { x: 540, y: 960, z: 1 }, BACK - 0.05);
tl.set(nectar, { y: 0, k: 0.6, streak: 0 }, BACK - 0.05);
tl.to(nectar, { k: 1, duration: D - BACK - 0.6, ease: "power1.out" }, BACK);
tl.set(A.sec, { autoAlpha: 1 }, BACK);
reveal(A, BACK, 0.85, [548, 1000], { rim: C.sienna });
// the wash it came in on dries back to paper
const aTint = Object.assign(document.createElement("div"), { className: "tint" });
Object.assign(aTint.style, { background: C.sienna, opacity: 0 });
A.sec.querySelector(".sheet").after(aTint);
tl.set(aTint, { opacity: 0.3 }, BACK);
tl.to(aTint, { opacity: 0, duration: 1.0, ease: "power1.inOut" }, BACK + 0.6);
film.each((t) => (A.sec.style.zIndex = t >= BACK - 1e-6 ? "10" : ""));

// ── Before the first frame: ink widths for scaled drawings, then every still wash baked to a picture once ─────────
// A wash's filter (bleed, pooled rim, blotch, granulation) is the costly part of a frame; a wash whose own shape never
// changes is drawn through it once, here, at the largest size the camera will show it, and kept as an image.
for (const el of document.querySelectorAll('.plate svg [class^="k"], .plate svg .hair, .plate svg .stam, .plate svg .tips')) {
  const m = el.getCTM?.();
  if (!m) continue;
  const sc = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
  if (Math.abs(sc - 1) > 0.01) el.style.setProperty("--s", sc.toFixed(4));
}
const FILTERS = document.querySelector("#ink-defs defs").outerHTML.replace(/^<defs[^>]*>|<\/defs>$/g, "");
const ZOOM = { pA: 1.1, pQ: 1, pB: 1.3, pC: 2, pD: 1.1, pE: 1.1, pF: 1, pG: 1, pH: 1.5, pI: 1, pJ: 1.05, pK: 1.15, pL: 1 };
// Baked washes are kept in out/bake/ (written by the probe that first bakes them), keyed by what they are made of;
// a render loads them instead of running the filters again. A wash not in the cache is baked here.
const cache = await fetch("out/bake/index.json").then((r) => (r.ok ? r.json() : [])).catch(() => []);
const known = new Set(cache);
window.__bakes = {};
const used = new Set();
const hashOf = (str) => {
  let h1 = 0x811c9dc5, h2 = 0x1234567;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519) + (h2 >>> 13);
  }
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0") + str.length.toString(16);
};
const loaded = (url) => new Promise((ok) => { const i2 = new Image(); i2.onload = ok; i2.onerror = ok; i2.src = url; });
async function bake(g, scale) {
  const bb = g.getBBox();
  if (!bb.width || !bb.height) return;
  const pad = 14 + 0.07 * Math.max(bb.width, bb.height);
  const x = bb.x - pad, y = bb.y - pad, w = bb.width + 2 * pad, h = bb.height + 2 * pad;
  const k = Math.min(scale, Math.sqrt(6e6 / (w * h)));
  const W2 = Math.ceil(w * k), H2 = Math.ceil(h * k);
  const defs = g.ownerSVGElement.querySelector("defs")?.innerHTML ?? "";
  const filt = g.getAttribute("filter");
  const src2 = `<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${H2}" viewBox="${x} ${y} ${w} ${h}"><defs>${FILTERS}${defs}</defs><g${filt ? ` filter="${filt}"` : ""}>${g.innerHTML}</g></svg>`;
  const key = hashOf(src2);
  used.add(key);
  let url;
  if (known.has(key)) url = `out/bake/${key}.png`;
  else {
    const img = new Image();
    img.src = URL.createObjectURL(new Blob([src2], { type: "image/svg+xml" }));
    await img.decode();
    const cv = Object.assign(document.createElement("canvas"), { width: W2, height: H2 });
    cv.getContext("2d").drawImage(img, 0, 0, W2, H2);
    window.__bakes[key] = cv.toDataURL("image/png");
    url = URL.createObjectURL(await new Promise((ok) => cv.toBlob(ok)));
  }
  g.innerHTML = `<image href="${url}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"/>`;
  g.removeAttribute("filter");
  await loaded(url);
}
const jobs = [];
for (const g of document.querySelectorAll(".plate svg g.paint")) {
  if (g.closest(".live")) continue;
  const sec = g.closest("section");
  jobs.push(() => bake(g, sec?.classList.contains("flood") ? 0.5 : ZOOM[sec?.id] ?? 1));
}
for (let i = 0; i < jobs.length; i += 8) await Promise.all(jobs.slice(i, i + 8).map((j) => j()));
window.__bakeList = [...used];

film.finish();
