// "Kenapa troli penuh susah didorong?" in the Stickman template. Built from storyboard.json: every time below is a
// shot's start or end from the narration take. The picture advances on twelves (template.json "stepped": 12): the
// renderer seeks the timeline to the held time, so every tween here is drawn on twos without asking.
//
// The drawing: eight pages of one sketchbook (index.html). Static ink is roughened over a pencil sketch, drawn on
// stroke by stroke and boils (kit/engine/ink.js); the stick figure is posed by numbers and redrawn every frame.
// The trolley is a Wanzl ELT7/130's proportions (f1). Every distance in s09 and s12 is computed from the masses.
import { createFilm } from "../../kit/engine/motion.js";
import { createInk } from "../../kit/engine/ink.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, $, gsap, shots: s } = film;
const ink = createInk(film);
const SVG = "http://www.w3.org/2000/svg";
film.captions();

// ── The numbers (storyboard.build.py, f1, f4 to f6) ─────────────────────────────────────────────────────────────
const EMPTY = 21, FULL = 63, RATIO = FULL / EMPTY;
const LANE = 640, FULL_RUN = LANE / RATIO; // s09: same push, same time: distance = F t^2 / 2m
const STOP_EMPTY = 190, STOP_FULL = STOP_EMPTY * RATIO; // s12: same braking force: distance = m v^2 / 2F

// ── Pages, lettering, camera ─────────────────────────────────────────────────────────────────────────────────────
const page = (id) => $(`#${id}`);
const svg = (id) => $(`#${id} svg`);
function draw(id, markup, cls = "") {
  const g = document.createElementNS(SVG, "g");
  if (cls) g.setAttribute("class", cls);
  g.innerHTML = markup;
  svg(id).append(g);
  return g;
}
function text(id, x, y, str, cls = "") {
  const el = Object.assign(document.createElement("div"), { className: `t ${cls}`.trim(), innerHTML: str });
  Object.assign(el.style, { left: `${x}px`, top: `${y}px` });
  $(`#${id} .cam`).append(el);
  return el;
}
// Each page has a camera: the point (x, y) of the page shown at the frame's (540, 860), at zoom z.
const cams = {};
for (const id of ["pA", "pB", "pC", "pD", "pE", "pF", "pG", "pH"]) cams[id] = { x: 540, y: 860, z: 1 };
film.each(() => {
  for (const [id, c] of Object.entries(cams)) page(id).querySelector(".cam").style.transform = `translate(${540 - c.x * c.z}px, ${860 - c.y * c.z}px) scale(${c.z})`;
});
// Fresh paper slides in from the right; the old page slides out to the left.
const pages = [];
function show(id, from, to) {
  pages.push([id, from, to]);
}
function slide(out, into, at, dir = 1) {
  tl.fromTo(page(into), { x: 1080 * dir }, { x: 0, duration: 0.42, ease: "power2.inOut", immediateRender: false }, at - 0.2);
  tl.fromTo(page(out), { x: 0 }, { x: -1080 * dir, duration: 0.42, ease: "power2.inOut", immediateRender: false }, at - 0.2);
}

// ── The trolley: a Wanzl ELT7/130 (131 litres) in outline, w = the basket's top width ───────────────────────────────
// Local origin: the basket's handle-side top corner projected to the ground. Its parts are separate paths so they
// draw on in order; the shopping is three groups that can drop in on their own.
function trolley(w, { full = false, cls = "" } = {}) {
  const top = -0.95 * w, bottom = -0.38 * w, r = 0.07 * w;
  const at = (k) => [k * w, top + (bottom - top) * 0];
  const wire = Array.from({ length: 7 }, (_, i) => {
    const x0 = ((i + 1) / 8) * w, x1 = 0.1 * w + (x0 / w) * 0.82 * w;
    return `<path class="hatch" d="M${x0} ${top + 8} L${x1} ${bottom - 6}"/>`;
  }).join("");
  const body = `<path class="fat" d="M0 ${top} H${w} L${0.92 * w} ${bottom} H${0.1 * w} Z"/>${wire}<path class="thin" d="M${0.04 * w} ${(top + bottom) / 2} H${0.955 * w}"/>
    <path class="fat" d="M0 ${top} L${-0.2 * w} ${top - 0.12 * w}"/><path class="fat" d="M${-0.25 * w} ${top - 0.15 * w} L${-0.15 * w} ${top - 0.09 * w}"/>
    <path d="M${0.1 * w} ${bottom} L${0.15 * w} ${-2 * r}"/><path d="M${0.92 * w} ${bottom} L${0.85 * w} ${-2 * r}"/><path d="M${0.06 * w} ${-2.2 * r} H${0.94 * w}"/>
    <path class="wheel" d="M${0.15 * w - r} ${-r} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0"/><path class="wheel" d="M${0.85 * w - r} ${-r} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0"/>`;
  void at;
  const box = `<g class="item i1"><path d="M${0.06 * w} ${top} v${-0.2 * w} h${0.3 * w} v${0.2 * w}"/><path class="thin" d="M${0.1 * w} ${top - 0.15 * w} h${0.16 * w} M${0.1 * w} ${top - 0.1 * w} h${0.2 * w}"/></g>`;
  const bottle = `<g class="item i2"><path d="M${0.42 * w} ${top} v${-0.24 * w} q0 ${-0.05 * w} ${0.05 * w} ${-0.06 * w} v${-0.06 * w} h${0.06 * w} v${0.06 * w} q${0.05 * w} ${0.01 * w} ${0.05 * w} ${0.06 * w} v${0.24 * w}"/><path class="thin" d="M${0.46 * w} ${top - 0.14 * w} h${0.08 * w}"/></g>`;
  const sack = `<g class="item i3"><path d="M${0.65 * w} ${top} q${-0.02 * w} ${-0.12 * w} ${0.02 * w} ${-0.18 * w} h${0.24 * w} q${0.04 * w} ${0.06 * w} ${0.02 * w} ${0.18 * w}"/><path class="thin" d="M${0.69 * w} ${top - 0.18 * w} l${0.04 * w} ${-0.04 * w} l${0.04 * w} ${0.04 * w} M${0.7 * w} ${top - 0.09 * w} h${0.16 * w}"/></g>`;
  return `<g class="trolley ${cls}">${body}<g class="load"${full ? "" : ' style="visibility:hidden"'}>${box}${bottle}${sack}</g></g>`;
}
// Where the trolley's grip is, in its local coordinates.
const gripOf = (w) => [-0.21 * w, -0.95 * w - 0.12 * w];

// ── The stick figure, posed by numbers and redrawn every frame ──────────────────────────────────────────────────
// p: { x, y: feet on the ground, s: height, lean: degrees (forward +), back, front: feet x offsets, hands: [[x, y],
// [x, y]] in page coordinates (or null: arms down), face: "strain" | "calm" | "worried" | "happy" }
function figure(id) {
  const g = draw(id, '<circle class="head"/><path class="limbs"/><path class="face thin"/>', "figure");
  const head = g.querySelector(".head"), limbs = g.querySelector(".limbs"), face = g.querySelector(".face");
  const pose = { x: 0, y: 0, s: 430, lean: 0, back: -0.14, front: 0.14, kneeB: 0, kneeF: 0, hands: null, hx0: 0, hy0: 0, hx1: 0, hy1: 0, face: "calm", tilt: 0, visible: 1 };
  film.each(() => {
    g.style.visibility = pose.visible > 0.5 ? "visible" : "hidden";
    const { x, y, s: S } = pose, a = (pose.lean * Math.PI) / 180;
    const hip = [x + Math.sin(a) * S * 0.2, y - S * 0.42];
    const dir = [Math.sin(a), -Math.cos(a)];
    const sh = [hip[0] + dir[0] * S * 0.34, hip[1] + dir[1] * S * 0.34];
    const hc = [hip[0] + dir[0] * S * 0.5, hip[1] + dir[1] * S * 0.5], r = S * 0.1;
    const leg = (fx, knee) => {
      const foot = [x + fx * S, y], mid = [(hip[0] + foot[0]) / 2, (hip[1] + foot[1]) / 2];
      return `M${hip[0]} ${hip[1]} Q${mid[0] + knee * S} ${mid[1]} ${foot[0]} ${foot[1]} l${S * 0.05} 0`;
    };
    const grip = pose.hands === "grip" && pose.gripAt ? pose.gripAt() : null;
    const hands = grip ? [grip, [grip[0] + 6, grip[1] + 8]] : [[sh[0] - S * 0.12, sh[1] + S * 0.28], [sh[0] + S * 0.12, sh[1] + S * 0.28]];
    const arm = ([hx, hy], bend) => `M${sh[0]} ${sh[1]} Q${(sh[0] + hx) / 2} ${(sh[1] + hy) / 2 + bend * S} ${hx} ${hy}`;
    limbs.setAttribute("d", `M${hip[0]} ${hip[1]} L${sh[0]} ${sh[1]} ${leg(pose.back, pose.kneeB)} ${leg(pose.front, pose.kneeF)} ${arm(hands[0], 0.04)} ${arm(hands[1], 0.08)}`);
    head.setAttribute("cx", hc[0]);
    head.setAttribute("cy", hc[1]);
    head.setAttribute("r", r);
    // The face turns with the head: eyes and mouth placed on the side the figure faces.
    const e = (dx, dy) => [hc[0] + dx * r, hc[1] + dy * r];
    const [l, rr] = [e(0.05, -0.15), e(0.5, -0.15)];
    const faces = {
      calm: `M${l[0]} ${l[1]} v1 M${rr[0]} ${rr[1]} v1 M${e(0.05, 0.35)[0]} ${e(0.05, 0.35)[1]} Q${e(0.3, 0.5)[0]} ${e(0.3, 0.5)[1]} ${e(0.55, 0.35)[0]} ${e(0.55, 0.35)[1]}`,
      happy: `M${l[0]} ${l[1]} v1 M${rr[0]} ${rr[1]} v1 M${e(0, 0.25)[0]} ${e(0, 0.25)[1]} Q${e(0.3, 0.65)[0]} ${e(0.3, 0.65)[1]} ${e(0.6, 0.25)[0]} ${e(0.6, 0.25)[1]}`,
      strain: `M${l[0] - 8} ${l[1] - 4} l14 6 M${rr[0] + 8} ${rr[1] - 4} l-14 6 M${e(0, 0.4)[0]} ${e(0, 0.4)[1]} l${r * 0.15} ${-r * 0.1} l${r * 0.15} ${r * 0.1} l${r * 0.15} ${-r * 0.1} l${r * 0.15} ${r * 0.1}`,
      worried: `M${l[0]} ${l[1]} v1 M${rr[0]} ${rr[1]} v1 M${e(0.05, 0.45)[0]} ${e(0.05, 0.45)[1]} Q${e(0.3, 0.25)[0]} ${e(0.3, 0.25)[1]} ${e(0.55, 0.45)[0]} ${e(0.55, 0.45)[1]}`,
    };
    face.setAttribute("d", faces[pose.face] ?? faces.calm);
  });
  pose.el = g;
  return pose;
}
// A trolley placed on a page with a state the timeline moves: x (the basket's handle-side corner), y (the ground).
function placed(id, w, opts = {}) {
  const g = draw(id, trolley(w, opts));
  const st = { x: 0, y: 0, w };
  // st.at, when set, gives the position from the timeline's own numbers, read at the moment it is drawn.
  film.each(() => {
    const [x, y] = st.at ? st.at() : [st.x, st.y];
    g.firstElementChild.setAttribute("transform", `translate(${x} ${y})`);
  });
  return { g, st, load: g.querySelector(".load"), items: [...g.querySelectorAll(".item")] };
}
const ground = (id, y = 1150) => draw(id, `<path d="M40 ${y} C 300 ${y - 12}, 700 ${y + 8}, 1040 ${y - 6}"/>`);
const arrow = (x0, y0, x1, y1, cls = "red") => {
  const a = Math.atan2(y1 - y0, x1 - x0), h = 30;
  return `<path class="${cls} fat" d="M${x0} ${y0} L${x1} ${y1}"/><path class="${cls} fat" d="M${x1 - Math.cos(a - 0.45) * h} ${y1 - Math.sin(a - 0.45) * h} L${x1} ${y1} L${x1 - Math.cos(a + 0.45) * h} ${y1 - Math.sin(a + 0.45) * h}"/>`;
};

// ═══ Page A: someone pushing a loaded trolley (s01, s02, s05, s14) ═══════════════════════════════════════════════
const GROUND = 1150;
ground("pA");
const tA = placed("pA", 380, { full: true });
Object.assign(tA.st, { x: 520, y: GROUND });
const man = figure("pA");
const gripA = () => [tA.st.x + gripOf(380)[0], tA.st.y + gripOf(380)[1]];
const pushPose = { x: 300, y: GROUND, s: 440, lean: 22, back: -0.22, front: 0.12, kneeB: 0, kneeF: 0.05, hands: "grip", face: "strain" };
Object.assign(man, pushPose);
man.gripAt = gripA;
const sweat = draw("pA", '<path class="thin" d="M210 590 q-20 20 -6 44"/><path class="thin" d="M190 650 h-50"/><path class="thin" d="M200 700 h-62"/>');
const noLift = draw("pA", `${arrow(710, 690, 710, 500)}<path class="red fat" d="M660 540 L760 640 M760 540 L660 640"/>`);
const qmark = draw("pA", '<path class="fat" d="M560 540 q0 -80 70 -80 q70 0 70 70 q0 50 -60 70 v50"/><path class="fat" d="M640 760 v4"/>');
const diam = text("pA", 730, 640, "diam", "mid");
const tetap = text("pA", 730, 560, "maunya tetap diam", "mid");
ink.roughen("#pA svg > g:not(.figure)", { amount: 1.6, pencil: true, seed: 3 });
ink.boil("#pA svg");

// s01: frame 0 is finished. The shove: back, then into it; the trolley gives a few pixels and stops.
show("pA", 0, s.s03.start + 0.25);
gsap.set([noLift, qmark, diam, tetap], { opacity: 0 });
tl.to(man, { lean: 14, duration: 0.5, ease: "power2.out" }, 0.4);
tl.to(man, { lean: 28, x: 312, duration: 0.25, ease: "power3.in" }, 0.9);
tl.to(tA.st, { x: 532, duration: 0.3, ease: "power2.out" }, 1.1);
tl.to(man, { lean: 22, x: 306, duration: 0.6, ease: "back.out(2)" }, 1.4);
tl.to(sweat, { y: -10, duration: 0.35, repeat: 3, yoyo: true }, 1.2);
tl.set(noLift, { opacity: 1 }, s.s01.end - 1.6);
ink.drawOn(noLift, s.s01.end - 1.6, { duration: 0.6 });
// s02: push in on the face; a big question mark is drawn beside it.
tl.to(cams.pA, { x: 470, y: 700, z: 2.0, duration: 0.6, ease: "power2.inOut" }, s.s02.start - 0.1);
tl.set(noLift, { opacity: 0 }, s.s02.start);
tl.set(qmark, { opacity: 1 }, s.s02.start + 0.1);
ink.drawOn(qmark, s.s02.start + 0.1, { duration: 0.45 });
tl.set(man, { face: "worried" }, s.s02.start);

// ═══ Page B: where the weight goes, and its name (s03, s04) ═══════════════════════════════════════════════════════
ground("pB");
const tB = placed("pB", 470, { full: true });
Object.assign(tB.st, { x: 350, y: GROUND });
const down = draw("pB", arrow(420, 760, 420, 1090) + arrow(790, 760, 790, 1090));
const up = draw("pB", arrow(420, 1250, 420, 1172, "blue") + arrow(790, 1250, 790, 1172, "blue"));
const lBerat = text("pB", 605, 700, "berat", "mid red");
const lLantai = text("pB", 605, 1275, "lantai yang menahan", "mid blue");
const lKel = text("pB", 540, 470, '<span class="mk">Kelembaman</span>', "big");
ink.roughen("#pB svg > g", { amount: 1.5, pencil: true, seed: 5 });
ink.boil("#pB svg");
show("pB", s.s03.start - 0.2, s.s05.start + 0.25);
slide("pA", "pB", s.s03.start);
tl.set(cams.pA, { x: 540, y: 860, z: 1 }, s.s03.start + 0.3);
ink.drawOn(down, s.s03.start + 0.4, { duration: 0.7 });
ink.write(lBerat, s.s03.start + 0.6, { duration: 0.35 });
ink.drawOn(up, s.s03.start + 1.4, { duration: 0.6 });
ink.write(lLantai, s.s03.start + 1.7, { speed: 22 });
// s04: the arrows go; the word is written big, a marker swipe under it; the trolley steps back.
tl.to([down, up, lBerat, lLantai], { opacity: 0, duration: 0.25 }, s.s04.start);
tl.to(tB.g, { scale: 0.68, transformOrigin: "580px 1150px", duration: 0.4, ease: "power2.inOut" }, s.s04.start);
ink.write(lKel, s.s04.start + 0.3, { speed: 14 });
ink.marker(lKel.querySelector(".mk"), s.s04.start + 1.4, { colour: "#f2c14e", duration: 0.5 });

// ═══ Page A again: at rest it wants to stay at rest (s05) ═════════════════════════════════════════════════════════
show("pA", s.s05.start - 0.2, s.s06.start + 0.25);
slide("pB", "pA", s.s05.start, -1);
tl.set([qmark, noLift], { opacity: 0 }, s.s05.start - 0.2);
tl.set(man, { ...pushPose, lean: 6, face: "calm" }, s.s05.start - 0.2);
tl.set(tA.st, { x: 520 }, s.s05.start - 0.2);
tl.set(diam, { opacity: 1 }, s.s05.start + 0.2);
ink.write(diam, s.s05.start + 0.2, { duration: 0.3 });
tl.to(man, { lean: 28, x: 314, face: "strain", duration: 0.3, ease: "power3.in" }, s.s05.start + 0.7);
tl.to(tA.st, { x: 528, duration: 0.25, ease: "power2.out" }, s.s05.start + 0.9);
tl.to(diam, { opacity: 0, duration: 0.15 }, s.s05.start + 1.2);
tl.set(tetap, { opacity: 1 }, s.s05.start + 1.25);
ink.write(tetap, s.s05.start + 1.25, { speed: 22 });

// ═══ Page C: more mass, harder to change its motion (s06) ════════════════════════════════════════════════════════
ground("pC");
const tC1 = placed("pC", 300, { full: false });
const tC2 = placed("pC", 300, { full: true });
Object.assign(tC1.st, { x: 130, y: GROUND });
Object.assign(tC2.st, { x: 610, y: GROUND });
const lKecil = text("pC", 280, 1230, "massa kecil", "small");
const lBesar = text("pC", 760, 1230, "massa besar", "small");
const lSusah = text("pC", 540, 470, "susah diubah geraknya:", "small");
const bars = draw("pC", '<path d="M220 540 h120 v70 h-120 Z"/><path class="red fat" d="M600 540 h360 v70 h-360 Z"/><path class="hatch red" d="M630 540 l-30 70 M690 540 l-30 70 M750 540 l-30 70 M810 540 l-30 70 M870 540 l-30 70 M930 540 l-30 70"/>');
ink.roughen("#pC svg > g", { amount: 1.5, pencil: true, seed: 7 });
ink.boil("#pC svg");
show("pC", s.s06.start - 0.2, s.s07.start + 0.25);
slide("pA", "pC", s.s06.start);
ink.write([lKecil, lBesar], s.s06.start + 0.5, { speed: 20 });
ink.write(lSusah, s.s06.start + 1.4, { speed: 24 });
ink.drawOn(bars, s.s06.start + 1.9, { duration: 0.9 });

// ═══ Page D: a real trolley on the scale, and the shopping (s07, s08, s08b) ═════════════════════════════════════
ground("pD");
const scale = draw("pD", '<path class="fat" d="M380 1146 H820 V1216 H380 Z"/><path d="M530 1164 H670 V1202 H530 Z"/>');
const tD = placed("pD", 340, { full: false });
Object.assign(tD.st, { x: -360, y: GROUND - 4 });
const reading = text("pD", 600, 1184, "", "small");
const big21 = text("pD", 600, 560, "21 kg", "huge");
const model = text("pD", 600, 680, "Wanzl ELT7/130, 131 liter", "small");
const plus = text("pD", 600, 560, "+ 42 kg", "big");
const sum = text("pD", 600, 470, "21 + 42 = 63 kg", "mid");
const three = text("pD", 600, 640, '<span class="mk">3×</span>', "huge");
ink.roughen("#pD svg > g", { amount: 1.5, pencil: true, seed: 9 });
ink.boil("#pD svg");
show("pD", s.s07.start - 0.2, s.s09.start + 0.25);
slide("pC", "pD", s.s07.start);
gsap.set([plus, sum, three], { opacity: 0 });
tl.to(tD.st, { x: 430, duration: 1.0, ease: "power2.out" }, s.s07.start + 0.2);
film.each((t) => (reading.textContent = t >= s.s08b.start + 0.1 ? "63 kg" : t >= s.s07.start + 1.3 ? "21 kg" : ""));
ink.write(big21, s.s07.start + 1.4, { duration: 0.5 });
ink.write(model, s.s07.start + 1.9, { speed: 30 });
// s08: the shopping drops in, one item at a time, and squashes as it lands.
tl.to([big21, model], { opacity: 0, duration: 0.2 }, s.s08.start);
tl.set(tD.load, { visibility: "visible" }, s.s08.start);
tD.items.forEach((item, i) => {
  const at = s.s08.start + 0.15 + i * 0.4;
  tl.fromTo(item, { y: -700 }, { y: 0, duration: 0.3, ease: "power2.in", immediateRender: true }, at);
  tl.fromTo(item, { scaleY: 0.82, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.2, ease: "back.out(3)", immediateRender: false }, at + 0.3);
});
tl.set(plus, { opacity: 1 }, s.s08.start + 1.2);
ink.write(plus, s.s08.start + 1.2, { duration: 0.4 });
// s08b: the reading changes once; the sum; 3x with the marker.
tl.to(plus, { opacity: 0, duration: 0.15 }, s.s08b.start);
tl.set([sum, three], { opacity: 1 }, s.s08b.start + 0.2);
ink.write(sum, s.s08b.start + 0.2, { speed: 24 });
ink.write(three, s.s08b.start + 0.9, { duration: 0.3 });
ink.marker(three.querySelector(".mk"), s.s08b.start + 1.3, { colour: "#f2c14e", duration: 0.4, height: 0.4 });

// ═══ Page E: the same push, a third of the acceleration (s09) ════════════════════════════════════════════════════
const LANES = [700, 1120];
draw("pE", `<path d="M60 ${LANES[0]} H1020"/><path d="M60 ${LANES[1]} H1020"/><path class="thin" d="M120 ${LANES[0] - 300} V${LANES[1] + 30}" stroke-dasharray="14 12"/>`);
const tE1 = placed("pE", 220, { full: false });
const tE2 = placed("pE", 220, { full: true });
Object.assign(tE1.st, { x: 120, y: LANES[0] });
Object.assign(tE2.st, { x: 120, y: LANES[1] });
const fE = draw("pE", arrow(-10, 0, 66, 0));
const fE1 = draw("pE", arrow(-10, 0, 66, 0));
const lF1 = text("pE", 40, LANES[0] - 270, "F", "mid red");
const lF2 = text("pE", 40, LANES[1] - 270, "F", "mid red");
const lK = text("pE", 340, LANES[0] - 330, "troli kosong", "small");
const lP = text("pE", 340, LANES[1] - 330, "troli penuh (3×)", "small");
const brE = draw("pE", `<path class="blue" d="M120 ${LANES[0] + 70} H${120 + LANE} M120 ${LANES[0] + 50} v40 M${120 + LANE} ${LANES[0] + 50} v40"/><path class="blue" d="M120 ${LANES[1] + 70} H${120 + FULL_RUN} M120 ${LANES[1] + 50} v40 M${120 + FULL_RUN} ${LANES[1] + 50} v40"/>`);
const lD1 = text("pE", 120 + LANE / 2, LANES[0] + 130, "jauh", "small blue");
const lD2 = text("pE", 120 + FULL_RUN / 2 + 40, LANES[1] + 130, "cuma ⅓", "small blue");
ink.roughen("#pE svg > g", { amount: 1.3, pencil: true, seed: 11 });
ink.boil("#pE svg");
show("pE", s.s09.start - 0.2, s.s10.start + 0.25);
slide("pD", "pE", s.s09.start);
// The push arrows ride on each trolley's handle.
const race = { u: 0 };
// distance = a t^2 / 2, with a in the ratio 3 : 1 (u is the time, 0 to 1)
tE1.st.at = () => [120 + LANE * race.u * race.u, LANES[0]];
tE2.st.at = () => [120 + FULL_RUN * race.u * race.u, LANES[1]];
film.each(() => {
  fE1.setAttribute("transform", `translate(${tE1.st.at()[0] - 130} ${LANES[0] - 250})`);
  fE.setAttribute("transform", `translate(${tE2.st.at()[0] - 130} ${LANES[1] - 250})`);
  lF1.style.left = `${tE1.st.at()[0] - 150}px`;
  lF2.style.left = `${tE2.st.at()[0] - 150}px`;
});
ink.write([lK, lP], s.s09.start + 0.3, { speed: 26 });
ink.write([lF1, lF2], s.s09.start + 0.5, { duration: 0.2 });
tl.to(race, { u: 1, duration: 2.1, ease: "none" }, s.s09.start + 0.9);
ink.drawOn(brE, s.s09.start + 3.0, { duration: 0.5 });
ink.write([lD1, lD2], s.s09.start + 3.3, { duration: 0.3 });

// ═══ Page F: rolling, and it will not stop (s10, s11) ════════════════════════════════════════════════════════════
ground("pF");
const tF = placed("pF", 360, { full: true });
Object.assign(tF.st, { x: 380, y: GROUND });
const speed = draw("pF", '<path d="M0 -60 h-120 M-20 20 h-140 M10 100 h-100"/>');
film.each(() => speed.setAttribute("transform", `translate(${tF.st.x - 40} ${GROUND - 280})`));
const runner = figure("pF");
Object.assign(runner, { x: 170, y: GROUND, s: 420, lean: 8, back: -0.16, front: 0.16, face: "calm", hands: null });
const lJalan = text("pF", 560, 560, "maunya tetap jalan", "mid");
const skid = draw("pF", '<path class="thin" d="M0 0 h-90 M10 12 h-110"/>');
ink.roughen("#pF svg > g:not(.figure)", { amount: 1.5, pencil: true, seed: 13 });
ink.boil("#pF svg");
show("pF", s.s10.start - 0.2, s.s12.start + 0.25);
slide("pE", "pF", s.s10.start);
gsap.set([skid], { opacity: 0 });
// s10: rolling with speed lines; the walker steps after it (two-frame walk on twos).
tl.to(tF.st, { x: 520, duration: s.s10.end - s.s10.start + 0.3, ease: "none" }, s.s10.start);
tl.to(runner, { x: 300, duration: s.s10.end - s.s10.start + 0.3, ease: "none" }, s.s10.start);
film.each((t) => {
  if (t < s.s10.start || t > s.s11.start + 0.2) return;
  const k = Math.floor(t * 6) % 2;
  runner.back = k ? -0.16 : -0.06;
  runner.front = k ? 0.16 : 0.08;
});
// s11: grab the handle and lean back, heels digging in; it drags on and slows.
runner.gripAt = () => [tF.st.x + gripOf(360)[0], tF.st.y + gripOf(360)[1]];
tl.set(runner, { hands: "grip", face: "strain" }, s.s11.start + 0.15);
tl.to(runner, { lean: -20, back: -0.3, front: -0.02, duration: 0.35, ease: "power2.out" }, s.s11.start + 0.15);
tl.to(tF.st, { x: 640, duration: s.s11.end - s.s11.start, ease: "power2.out" }, s.s11.start);
tl.to(runner, { x: 410, duration: s.s11.end - s.s11.start, ease: "power2.out" }, s.s11.start);
tl.set(skid, { opacity: 1 }, s.s11.start + 0.5);
film.each(() => skid.setAttribute("transform", `translate(${runner.x - 120} ${GROUND - 4})`));
tl.to(speed, { opacity: 0, duration: 0.3 }, s.s11.start + 1.4);
ink.write(lJalan, s.s11.start + 0.9, { speed: 22 });

// ═══ Page G: the same braking, three times the distance (s12) ══════════════════════════════════════════════════
const BRAKE = 300;
draw("pG", `<path d="M40 ${LANES[0]} H1040"/><path d="M40 ${LANES[1]} H1040"/>`);
const brakeLine = draw("pG", `<path class="red" d="M${BRAKE} ${LANES[0] - 300} V${LANES[1] + 40}" stroke-dasharray="18 14"/>`);
const lRem = text("pG", BRAKE, LANES[0] - 340, "mulai ngerem", "small red");
const tG1 = placed("pG", 220, { full: false });
const tG2 = placed("pG", 220, { full: true });
const marks = draw("pG", `<path class="red fat" d="M${BRAKE} ${LANES[0] + 14} H${BRAKE + STOP_EMPTY}"/><path class="red fat" d="M${BRAKE} ${LANES[1] + 14} H${BRAKE + STOP_FULL}"/>`);
const brG = draw("pG", `<path class="blue" d="M${BRAKE} ${LANES[0] + 70} H${BRAKE + STOP_EMPTY} M${BRAKE} ${LANES[0] + 50} v40 M${BRAKE + STOP_EMPTY} ${LANES[0] + 50} v40"/><path class="blue" d="M${BRAKE} ${LANES[1] + 70} H${BRAKE + STOP_FULL} M${BRAKE} ${LANES[1] + 50} v40 M${BRAKE + STOP_FULL} ${LANES[1] + 50} v40"/>`);
const lOne = text("pG", BRAKE + STOP_EMPTY / 2, LANES[0] + 130, "1", "mid blue");
const lThree = text("pG", BRAKE + STOP_FULL / 2, LANES[1] + 130, '<span class="mk">× 3</span>', "mid blue");
ink.roughen("#pG svg > g", { amount: 1.3, pencil: true, seed: 17 });
ink.boil("#pG svg");
show("pG", s.s12.start - 0.2, s.s13.start + 0.25);
slide("pF", "pG", s.s12.start);
// Both reach the line at the same speed V; the same force stops the full one at a third of the deceleration.
// Distance after braking for time tau: V tau - a tau^2 / 2, until it stops at V^2 / 2a.
const [markE, markF] = [...marks.querySelectorAll("path:not(.ink-pencil)")];
for (const m of [markE, markF]) { m.setAttribute("pathLength", "1"); m.style.strokeDasharray = "1 1.02"; }
const V = 480, T_FULL = (2 * STOP_FULL) / V, T_EMPTY = (2 * STOP_EMPTY) / V;
const run = { t: -0.7 };
const pos = (stop, T) => (run.t <= 0 ? V * run.t : run.t >= T ? stop : V * run.t - (V / T / 2) * run.t * run.t);
tG1.st.at = () => [BRAKE - 220 + pos(STOP_EMPTY, T_EMPTY), LANES[0]];
tG2.st.at = () => [BRAKE - 220 + pos(STOP_FULL, T_FULL), LANES[1]];
film.each(() => {
  const shown = (stop, T) => Math.max(0, Math.min(1, pos(stop, T) / stop));
  markE.style.strokeDashoffset = 1 - shown(STOP_EMPTY, T_EMPTY);
  markF.style.strokeDashoffset = 1 - shown(STOP_FULL, T_FULL);
});
ink.write(lRem, s.s12.start + 0.2, { speed: 24 });
tl.to(run, { t: T_FULL + 0.05, duration: T_FULL + 0.75, ease: "none" }, s.s12.start + 0.3);
ink.drawOn(brG, s.s12.start + 0.3 + T_FULL + 0.8, { duration: 0.45 });
ink.write(lOne, s.s12.start + 0.3 + T_FULL + 1.0, { duration: 0.15 });
ink.write(lThree, s.s12.start + 0.3 + T_FULL + 1.1, { duration: 0.3 });
ink.marker(lThree.querySelector(".mk"), s.s12.start + 0.3 + T_FULL + 1.4, { colour: "#f2c14e", duration: 0.35 });

// ═══ Page H: the answer in one frame (s13) ═══════════════════════════════════════════════════════════════════════
const lMassa = text("pH", 330, 430, '<span class="mk">massa ✓</span>', "big");
const lBer = text("pH", 790, 430, "berat", "big");
const cross = draw("pH", '<path class="red fat" d="M670 420 L910 470"/>');
const tH1 = placed("pH", 210, { full: true });
const tH2 = placed("pH", 210, { full: true });
Object.assign(tH1.st, { x: 400, y: 840 });
Object.assign(tH2.st, { x: 640, y: 1200 });
draw("pH", '<path d="M120 840 H760"/><path d="M360 1200 H1000"/>');
const pushH = figure("pH");
Object.assign(pushH, { x: 270, y: 840, s: 270, lean: 24, back: -0.22, front: 0.12, face: "strain", hands: "grip" });
const brakeH = figure("pH");
Object.assign(brakeH, { x: 490, y: 1200, s: 270, lean: -20, back: -0.3, front: -0.02, face: "strain", hands: "grip" });
pushH.gripAt = () => [tH1.st.x + gripOf(210)[0], tH1.st.y + gripOf(210)[1]];
brakeH.gripAt = () => [tH2.st.x + gripOf(210)[0], tH2.st.y + gripOf(210)[1]];
const lMulai = text("pH", 440, 905, "susah mulai", "small");
const lStop = text("pH", 700, 1265, "susah berhenti", "small");
ink.roughen("#pH svg > g:not(.figure)", { amount: 1.5, pencil: true, seed: 19 });
ink.boil("#pH svg");
show("pH", s.s13.start - 0.2, s.s14.start + 0.25);
slide("pG", "pH", s.s13.start);
gsap.set([cross], { opacity: 0 });
ink.write(lMassa, s.s13.start + 0.2, { duration: 0.45 });
ink.marker(lMassa.querySelector(".mk"), s.s13.start + 0.7, { colour: "#f2c14e", duration: 0.4 });
ink.write(lBer, s.s13.start + 0.9, { duration: 0.3 });
tl.from([tH1.g, pushH.el], { opacity: 0, duration: 0.2 }, s.s13.start + 0.9);
ink.write(lMulai, s.s13.start + 1.2, { speed: 26 });
tl.from([tH2.g, brakeH.el], { opacity: 0, duration: 0.2 }, s.s13.start + 1.5);
ink.write(lStop, s.s13.start + 1.7, { speed: 26 });
tl.set(cross, { opacity: 1 }, s.s13.start + 2.2);
ink.drawOn(cross, s.s13.start + 2.2, { duration: 0.3 });

// ═══ s14: back to the opening picture, exactly as frame 0, a moment before the loop ═════════════════════════════
show("pA", s.s14.start - 0.2, film.duration);
slide("pH", "pA", s.s14.start, -1);
tl.set([diam, tetap, qmark, noLift], { opacity: 0 }, s.s14.start - 0.2);
tl.set(cams.pA, { x: 540, y: 860, z: 1 }, s.s14.start - 0.2);
tl.set(tA.st, { x: 520 }, s.s14.start - 0.2);
tl.set(man, { ...pushPose, lean: 12 }, s.s14.start - 0.2);
tl.to(man, { lean: 22, duration: Math.min(0.8, film.duration - s.s14.start - 0.65), ease: "power2.inOut" }, s.s14.start + 0.6);

// ── Pages on and off ────────────────────────────────────────────────────────────────────────────────────────────
for (const id of ["pA", "pB", "pC", "pD", "pE", "pF", "pG", "pH"]) gsap.set(page(id), { autoAlpha: 0 });
for (const [id, from, to] of pages) {
  tl.set(page(id), { autoAlpha: 1 }, Math.max(0, from));
  tl.set(page(id), { autoAlpha: 0 }, to);
}
gsap.set(page("pA"), { autoAlpha: 1 });
film.finish();
