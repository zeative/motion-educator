// "Kenapa troli penuh susah didorong?" in the Stickman template. Built from storyboard.json: every time below is a
// shot's start or end, or a word of the take (voice/words.json). The picture advances on twelves (template.json
// "stepped": 12): the renderer seeks the timeline to the held time, so every tween here is drawn on twos.
//
// The drawing: eight sheets of one sketchbook (index.html), each a sheet of the template's paper. Static ink is
// roughened over a pencil sketch that runs on past it, drawn on stroke by stroke and boils (kit/engine/ink.js);
// lettering is written letter by letter and rubbed out, never faded. Ink is black; the one marker colour is yellow.
// The figure is posed by numbers and redrawn every frame, 1.8 basket widths tall, so the trolley's handle comes to
// his hips as a real one does. Every distance in s09 and s12 is computed from the masses (f4, f6).
import { createFilm } from "../../kit/engine/motion.js";
import { createInk } from "../../kit/engine/ink.js";
import { createFlatBackdrop } from "../../kit/engine/backdrops.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, $, gsap, shots: s } = film;
const ink = createInk(film);
const SVG = "http://www.w3.org/2000/svg";
const MARK = "#f2c14e";
film.captions();

// Every line drawn, written or rubbed out is logged with its time (render.mjs --events writes them to events.json),
// so cues.build.py can put a pen on each.
const inkLog = (window.__events = []);
const logged = (kind, fn) => (sel, at, o = {}) => {
  const end = fn(sel, at, o);
  inkLog.push({ kind, at: +at.toFixed(3), end: +(end ?? at).toFixed(3) });
  return end;
};
const drawOn = logged("line", ink.drawOn), write = logged("write", ink.write), erase = logged("erase", ink.erase);

// ── The numbers (storyboard.build.py, f1, f4 to f6) ─────────────────────────────────────────────────────────────
const EMPTY = 21, FULL = 63, RATIO = FULL / EMPTY;
const LANE = 560, FULL_RUN = LANE / RATIO; // s09: same push, same time: distance = F t^2 / 2m
const STOP_EMPTY = 180, STOP_FULL = STOP_EMPTY * RATIO; // s12: same braking force: distance = m v^2 / 2F
const GROUND = 1150, TALL = 1.8; // a figure is TALL basket widths high

// ── Sheets, lettering, camera ───────────────────────────────────────────────────────────────────────────────────
const PAGES = ["pA", "pB", "pC", "pD", "pE", "pF", "pG", "pH"];
const page = (id) => $(`#${id}`);
const svg = (id) => $(`#${id} svg`);
// Each sheet is a piece of the template's own paper, so a fresh one can be laid over the last.
const sheet = Object.assign(document.createElement("canvas"), { width: 1080, height: 1920 });
createFlatBackdrop(sheet, film.look).render({});
const paperURL = sheet.toDataURL("image/jpeg", 0.92);
for (const id of PAGES) page(id).style.background = `url(${paperURL}) 0 0 / 1080px 1920px`;

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
// A camera per sheet: the sheet's point (x, y) is shown at the frame's (540, 860), at zoom z. fit() frames a box
// of the sheet inside the part of the frame that is free: above the captions, inside the side margins.
const fit = ([x0, y0, x1, y1], [fx0, fy0, fx1, fy1] = [60, 300, 1020, 1290], zmax = 1.6) => {
  const z = Math.min(zmax, (fx1 - fx0) / (x1 - x0), (fy1 - fy0) / (y1 - y0));
  return { x: (x0 + x1) / 2 - ((fx0 + fx1) / 2 - 540) / z, y: (y0 + y1) / 2 - ((fy0 + fy1) / 2 - 860) / z, z };
};
const cams = {};
for (const id of PAGES) cams[id] = { x: 540, y: 860, z: 1 };
film.each(() => {
  for (const [id, c0] of Object.entries(cams)) {
    const c = c0.at ? { ...c0, ...c0.at() } : c0;
    page(id).querySelector(".cam").style.transform = `translate(${540 - c.x * c.z}px, ${860 - c.y * c.z}px) scale(${c.z})`;
  }
});
const camTo = (id, to, at, duration = 0.6) => tl.to(cams[id], { ...to, duration, ease: "power2.inOut" }, at);

// Curved leader from a label to what it names, and a straight force arrow.
function leader(id, x0, y0, x1, y1, bend = 0.3) {
  const cx = (x0 + x1) / 2 - (y1 - y0) * bend, cy = (y0 + y1) / 2 + (x1 - x0) * bend;
  const a = Math.atan2(y1 - cy, x1 - cx), h = 22;
  return draw(id, `<path class="thin" d="M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}"/><path class="thin" d="M${x1 - Math.cos(a - 0.5) * h} ${y1 - Math.sin(a - 0.5) * h} L${x1} ${y1} L${x1 - Math.cos(a + 0.5) * h} ${y1 - Math.sin(a + 0.5) * h}"/>`);
}
const arrow = (x0, y0, x1, y1) => {
  const a = Math.atan2(y1 - y0, x1 - x0), h = 30;
  return `<path class="fat" d="M${x0} ${y0} L${x1} ${y1}"/><path class="fat" d="M${x1 - Math.cos(a - 0.45) * h} ${y1 - Math.sin(a - 0.45) * h} L${x1} ${y1} L${x1 - Math.cos(a + 0.45) * h} ${y1 - Math.sin(a + 0.45) * h}"/>`;
};

// ── The trolley: a Wanzl ELT7/130 (131 litres) in outline, w = the basket's top width ───────────────────────────────
// Local origin: the basket's handle-side top corner projected to the ground. The shopping is drawn first and filled
// with paper, so the basket's front wires cross it: it stands inside the basket, its tops above the rim.
function trolley(w, { full = false } = {}) {
  const top = -0.95 * w, bottom = -0.38 * w, r = 0.07 * w, floor = top + 0.3 * w;
  const X = (k) => k * w;
  const wire = Array.from({ length: 7 }, (_, i) => {
    const x0 = ((i + 1) / 8) * w, x1 = 0.1 * w + (x0 / w) * 0.82 * w;
    return `<path class="hatch" d="M${x0} ${top + 8} L${x1} ${bottom - 6}"/>`;
  }).join("");
  // A big week's shop (f5): a 19-litre water jug, a 10 kg sack of rice, a box of detergent, a bottle of oil.
  const galon = `<g class="item i1"><path class="pf" d="M${X(0.06)} ${floor} V${top - 0.12 * w} Q${X(0.06)} ${top - 0.2 * w} ${X(0.12)} ${top - 0.21 * w} H${X(0.26)} Q${X(0.32)} ${top - 0.2 * w} ${X(0.32)} ${top - 0.12 * w} V${floor} Z"/><path class="pf" d="M${X(0.16)} ${top - 0.21 * w} v${-0.05 * w} h${X(0.06)} v${0.05 * w}"/><path class="thin" d="M${X(0.08)} ${top - 0.05 * w} H${X(0.3)}"/></g>`;
  const sack = `<g class="item i2"><path class="pf" d="M${X(0.34)} ${floor} V${top - 0.06 * w} Q${X(0.36)} ${top - 0.15 * w} ${X(0.44)} ${top - 0.13 * w} L${X(0.47)} ${top - 0.2 * w} L${X(0.5)} ${top - 0.13 * w} Q${X(0.58)} ${top - 0.15 * w} ${X(0.6)} ${top - 0.06 * w} V${floor} Z"/><path class="thin" d="M${X(0.38)} ${top + 0.02 * w} H${X(0.56)}"/></g>`;
  const box = `<g class="item i3"><path class="pf" d="M${X(0.62)} ${floor} V${top - 0.12 * w} H${X(0.82)} V${floor} Z"/><path class="thin" d="M${X(0.64)} ${top - 0.02 * w} L${X(0.8)} ${top - 0.1 * w}"/></g>`;
  const oil = `<g class="item i4"><path class="pf" d="M${X(0.84)} ${floor} V${top - 0.1 * w} Q${X(0.84)} ${top - 0.14 * w} ${X(0.865)} ${top - 0.16 * w} V${top - 0.21 * w} H${X(0.895)} V${top - 0.16 * w} Q${X(0.92)} ${top - 0.14 * w} ${X(0.92)} ${top - 0.1 * w} V${floor} Z"/></g>`;
  const load = `<g class="load"${full ? "" : ' style="visibility:hidden"'}>${galon}${sack}${box}${oil}</g>`;
  const body = `<path class="fat" d="M0 ${top} H${w} L${0.92 * w} ${bottom} H${0.1 * w} Z"/>${wire}<path class="thin" d="M${0.04 * w} ${(top + bottom) / 2} H${0.955 * w}"/>
    <path class="fat" d="M0 ${top} L${-0.2 * w} ${top - 0.12 * w}"/><path class="fat" d="M${-0.25 * w} ${top - 0.15 * w} L${-0.15 * w} ${top - 0.09 * w}"/>
    <path d="M${0.1 * w} ${bottom} L${0.15 * w} ${-2 * r}"/><path d="M${0.92 * w} ${bottom} L${0.85 * w} ${-2 * r}"/><path d="M${0.06 * w} ${-2.2 * r} H${0.94 * w}"/>
    <path class="wheel" d="M${0.15 * w - r} ${-r} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0"/><path class="wheel" d="M${0.85 * w - r} ${-r} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0"/>`;
  // A few hatch strokes of shadow on the floor under it.
  const shade = Array.from({ length: 6 }, (_, i) => `<path class="hatch" d="M${X(0.22 + i * 0.1)} ${6} l${-0.05 * w} ${0.07 * w}"/>`).join("");
  return `<g class="trolley">${load}${body}${shade}</g>`;
}
// Where the trolley's grip is, in its local coordinates.
const gripOf = (w) => [-0.21 * w, -1.07 * w];

// ── The stick figure, posed by numbers and redrawn every frame ──────────────────────────────────────────────────
// x, y: feet on the ground; s: height; lean: degrees (forward +); back, front: feet x offsets (in heights); reach:
// 0 arms at rest, 1 the near hand on gripAt() (the far arm hides behind the body, so a grip is one clear arm);
// swing: arm swing while walking; face: "strain" | "calm" | "worried" | "happy"; follow(): x from the timeline.
function figure(id, size) {
  const g = draw(id, '<circle class="head"/><path class="limbs"/><path class="face thin"/>', "figure");
  const head = g.querySelector(".head"), limbs = g.querySelector(".limbs"), face = g.querySelector(".face");
  const pose = { x: 0, y: 0, s: size, lean: 0, back: -0.14, front: 0.14, kneeB: 0, kneeF: 0, reach: 0, swing: 0, bend: 0.07, face: "calm", gripAt: null, follow: null };
  const P = ([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`;
  film.each((t) => {
    pose.step?.(t);
    const S = pose.s, y = pose.y, x = pose.follow ? pose.follow() : pose.x, a = (pose.lean * Math.PI) / 180;
    const hip = [x + Math.sin(a) * S * 0.2, y - S * 0.44];
    const up = (k) => [hip[0] + Math.sin(a) * S * k, hip[1] - Math.cos(a) * S * k];
    const sh = up(0.31), neck = up(0.37), hc = up(0.46), r = S * 0.09;
    const leg = (fx, knee) => {
      const foot = [x + fx * S, y], mid = [(hip[0] + foot[0]) / 2 + knee * S, (hip[1] + foot[1]) / 2];
      return `M${P(hip)} Q${P(mid)} ${P(foot)} l${(S * 0.05).toFixed(1)} 0`;
    };
    const rest = (k) => [sh[0] + (0.05 * k + pose.swing * k * 0.12) * S, sh[1] + S * 0.29];
    const arm = (from, to, bend) => `M${P(from)} Q${P([(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + bend * S])} ${P(to)}`;
    let arms;
    if (pose.gripAt && pose.reach > 0) {
      const grip = pose.gripAt(), h0 = rest(1), k = Math.min(1, pose.reach);
      arms = arm(sh, [h0[0] + (grip[0] - h0[0]) * k, h0[1] + (grip[1] - h0[1]) * k], pose.bend) + (k < 0.6 ? arm(sh, rest(-1), 0.04) : "");
    } else arms = arm(sh, rest(1), 0.04) + arm(sh, rest(-1), 0.04);
    limbs.setAttribute("d", `M${P(hip)} L${P(neck)} ${leg(pose.back, pose.kneeB)} ${leg(pose.front, pose.kneeF)} ${arms}`);
    head.setAttribute("cx", hc[0]);
    head.setAttribute("cy", hc[1]);
    head.setAttribute("r", r);
    // The face is on the side the figure faces (right): two dot eyes and a mouth that change with the moment.
    const e = (dx, dy) => [hc[0] + dx * r, hc[1] + dy * r];
    const [l, rr] = [e(0.15, -0.15), e(0.6, -0.15)];
    const faces = {
      calm: `M${P(l)} v1 M${P(rr)} v1 M${P(e(0.15, 0.35))} Q${P(e(0.4, 0.5))} ${P(e(0.65, 0.35))}`,
      happy: `M${P(l)} v1 M${P(rr)} v1 M${P(e(0.1, 0.25))} Q${P(e(0.4, 0.7))} ${P(e(0.7, 0.25))}`,
      strain: `M${l[0] - 8} ${l[1] - 5} l12 6 M${rr[0] + 6} ${rr[1] - 5} l-12 6 M${P(e(0.1, 0.42))} l${r * 0.14} ${-r * 0.1} l${r * 0.14} ${r * 0.1} l${r * 0.14} ${-r * 0.1} l${r * 0.14} ${r * 0.1}`,
      worried: `M${P(l)} v1 M${P(rr)} v1 M${P(e(0.15, 0.5))} Q${P(e(0.4, 0.28))} ${P(e(0.65, 0.5))}`,
    };
    face.setAttribute("d", faces[pose.face] ?? faces.calm);
  });
  pose.el = g;
  return pose;
}
// A trolley placed on a sheet; st.at, when set, gives its position from the timeline's own numbers at draw time.
function placed(id, w, opts = {}) {
  const g = draw(id, trolley(w, opts));
  const st = { x: 0, y: 0, w };
  film.each(() => {
    const [x, y] = st.at ? st.at() : [st.x, st.y];
    g.firstElementChild.setAttribute("transform", `translate(${x} ${y})`);
  });
  return { g, st, load: g.querySelector(".load"), items: [...g.querySelectorAll(".item")] };
}
const ground = (id, y = GROUND, x0 = 40, x1 = 1040) => draw(id, `<path d="M${x0} ${y} C ${x0 + (x1 - x0) * 0.26} ${y - 12}, ${x0 + (x1 - x0) * 0.64} ${y + 8}, ${x1} ${y - 6}"/>`);
const look = (sel, seed) => {
  ink.roughen(sel, { amount: 1.5, pencil: true, seed });
};

// ═══ Sheet A: someone pushing a loaded trolley (s01, s02, s05, s14) ══════════════════════════════════════════════
const WA = 300, SA = WA * TALL, XA = 560;
ground("pA", GROUND, 60, 1000);
const tA = placed("pA", WA, { full: true });
const man = figure("pA", SA);
const ride = { x: XA }; // the trolley's x; the man keeps his hands on it
tA.st.at = () => [ride.x, GROUND];
const gripA = () => [ride.x + gripOf(WA)[0], GROUND + gripOf(WA)[1]];
const PUSH = { lean: 22, back: -0.22, front: 0.12, kneeB: 0, kneeF: 0.04, reach: 1, bend: 0.07, face: "strain" };
Object.assign(man, PUSH, { y: GROUND, gripAt: gripA, follow: () => ride.x - XA + man.x });
man.x = 242;
const sweat = draw("pA", '<path class="thin" d="M318 606 q-14 16 -3 34"/><path class="thin" d="M296 650 q-12 14 -2 28"/>');
const push = draw("pA", arrow(470, 742, 650, 742));
const lDorong = text("pA", 560, 690, "dorong", "small");
const lift = draw("pA", `${arrow(800, 800, 800, 600)}<path class="fat" d="M752 650 L848 748 M848 650 L752 748"/>`);
const lAngkat = text("pA", 800, 556, "angkat", "small");
const qmark = draw("pA", '<path class="fat" d="M520 520 q0 -72 62 -72 q62 0 62 62 q0 46 -54 62 v46"/><path class="fat" d="M590 690 v4"/>');
const lDiam = text("pA", 760, 600, "diam", "mid");
const toDiam = leader("pA", 720, 634, 650, 790, -0.25);
const lTetap = text("pA", 640, 512, "maunya tetap diam", "mid");
look("#pA svg > g:not(.figure)", 3);
ink.boil("#pA svg");
cams.pA = fit([100, 450, 900, 1180]);
const CAM_A = { ...cams.pA };

// s01: frame 0 is finished. The shove: a wind-back, then into it with a step; the trolley starts to creep and keeps
// creeping, slowly gaining speed (it is not stuck: it is heavy to get going).
tl.to(man, { lean: 12, kneeB: 0.03, duration: 0.4, ease: "power2.out" }, 0.35);
tl.to(man, { lean: 32, front: 0.18, kneeF: 0.08, duration: 0.25, ease: "power3.in" }, 0.8);
tl.to(man, { lean: 24, front: 0.12, kneeF: 0.04, duration: 0.5, ease: "back.out(2)" }, 1.05);
tl.to(ride, { x: XA + 46, duration: s.s02.start - 0.9, ease: "power2.in" }, 0.9);
// he steps after it while the trolley creeps
man.step = (t) => { if (t >= 1.2 && t < s.s02.start) man.back = Math.floor(t * 4) % 2 ? -0.22 : -0.16; };
tl.to(sweat, { y: -10, duration: 0.35, repeat: 3, yoyo: true }, 1.2);
drawOn(push, 1.0, { duration: 0.35 });
write(lDorong, 1.3, { speed: 18 });
drawOn(lift, 3.3, { duration: 0.5 });
write(lAngkat, 3.5, { speed: 18 });
// s02: push in on his face; a question mark is drawn beside it; the arrows are rubbed out.
erase([push, lift], s.s02.start - 0.1, { duration: 0.25 });
erase([lDorong, lAngkat], s.s02.start - 0.1, { duration: 0.25 });
camTo("pA", fit([300, 430, 660, 760], [60, 300, 1020, 1150], 2.0), s.s02.start - 0.1, 0.55);
tl.set(man, { face: "worried" }, s.s02.start);
drawOn(qmark, s.s02.start + 0.1, { duration: 0.45 });

// ═══ Sheet B: where the weight goes, and its name (s03, s04) ═════════════════════════════════════════════════════
const WB = 420, XB = 330;
ground("pB", GROUND, 120, 960);
const tB = placed("pB", WB, { full: true });
Object.assign(tB.st, { x: XB, y: GROUND });
const wheelX = [XB + 0.15 * WB, XB + 0.85 * WB];
// The weight goes down through the wheels; the floor pushes up as hard: equal arrows (f2).
const down = draw("pB", wheelX.map((x) => arrow(x, 975, x, 1086)).join(""));
const up = draw("pB", wheelX.map((x) => arrow(x, 1268, x, 1156)).join(""));
const lBerat = text("pB", 215, 1035, "berat", "mid");
const toBerat = leader("pB", 262, 1000, wheelX[0] - 16, 1010, -0.3);
const lLantai = text("pB", 540, 1322, "lantai yang menahan", "small");
const lKel = text("pB", 540, 480, '<span class="mk">Kelembaman</span>', "big");
look("#pB svg > g", 5);
ink.boil("#pB svg");
cams.pB = fit([150, 640, 800, 1350]);
drawOn(down, s.s03.start + 0.35, { duration: 0.5 });
write(lBerat, s.s03.start + 0.45, { speed: 16 });
drawOn(toBerat, s.s03.start + 0.75, { duration: 0.2 });
drawOn(up, s.s03.start + 1.3, { duration: 0.5 });
write(lLantai, s.s03.start + 1.55, { speed: 26 });
// s04: the force arrows are rubbed out, the camera pulls back over the whole trolley, and the word is written big.
erase([down, up, toBerat], s.s04.start - 0.05, { duration: 0.3 });
erase([lBerat, lLantai], s.s04.start - 0.05, { duration: 0.3 });
camTo("pB", fit([150, 400, 930, 1200]), s.s04.start + 0.15, 0.6);
write(lKel, 9.85, { speed: 10 });
ink.marker(lKel.querySelector(".mk"), 10.95, { colour: MARK, duration: 0.45 });

// ═══ Sheet A again: at rest it wants to stay at rest (s05) ═══════════════════════════════════════════════════════
// The same shove as s01: the trolley only creeps. Its labels: "diam", then "maunya tetap diam".
tl.set(qmark, { opacity: 0 }, s.s05.start - 0.35);
tl.set(cams.pA, { ...CAM_A }, s.s05.start - 0.35);
tl.set(ride, { x: XA }, s.s05.start - 0.35);
tl.set(man, { ...PUSH, lean: 8, face: "calm" }, s.s05.start - 0.35);
write(lDiam, 12.1, { speed: 12 });
drawOn(toDiam, 12.3, { duration: 0.25 });
tl.to(man, { lean: 32, front: 0.18, face: "strain", duration: 0.3, ease: "power3.in" }, 12.55);
tl.to(man, { lean: 24, front: 0.12, duration: 0.4, ease: "back.out(2)" }, 12.85);
tl.to(ride, { x: XA + 22, duration: s.s06.start - 12.7, ease: "power2.in" }, 12.7);
write(lTetap, 12.6, { speed: 20 });

// ═══ Sheet C: more mass, harder to change its motion (s06) ═══════════════════════════════════════════════════════
const WC = 270;
ground("pC", GROUND, 80, 980);
const tC1 = placed("pC", WC, { full: false });
const tC2 = placed("pC", WC, { full: true });
Object.assign(tC1.st, { x: 150, y: GROUND });
Object.assign(tC2.st, { x: 600, y: GROUND });
const lKecil = text("pC", 285, 760, "massa kecil", "mid");
const lBesar = text("pC", 735, 700, "massa besar", "mid");
const lSusah = text("pC", 540, 1222, "susah diubah geraknya:", "small");
// One bar under each trolley, in proportion to its mass (1 : 3).
const barS = draw("pC", '<path class="fat" d="M235 1262 h100 v50 h-100 Z"/>');
const barB = draw("pC", '<path class="fat" d="M585 1262 h300 v50 h-300 Z"/><path class="hatch" d="M615 1262 l-26 50 M665 1262 l-26 50 M715 1262 l-26 50 M765 1262 l-26 50 M815 1262 l-26 50 M865 1262 l-26 50"/>');
look("#pC svg > g", 7);
ink.boil("#pC svg");
cams.pC = fit([120, 650, 920, 1330]);
write(lKecil, 14.0, { speed: 20 });
write(lBesar, 14.35, { speed: 20 });
write(lSusah, 15.1, { speed: 26 });
drawOn(barS, 15.6, { duration: 0.2 });
drawOn(barB, 15.85, { duration: 0.55 });

// ═══ Sheet D: a real trolley on the scale, and the shopping (s07, s08, s08b) ═════════════════════════════════════
const WD = 330, XD = 395;
ground("pD", GROUND, 60, 1020);
const scale = draw("pD", '<path class="fat" d="M330 1150 V1210 H790 V1150"/><path d="M455 1160 H665 V1202 H455 Z"/>');
const tD = placed("pD", WD, { full: false });
Object.assign(tD.st, { x: -520, y: GROUND });
const reading = text("pD", 560, 1180, "", "small");
const big21 = text("pD", 560, 520, "21 kg", "huge");
const model = text("pD", 560, 655, "Wanzl ELT7/130 · 131 liter", "small");
const plus = text("pD", 560, 540, "+ 42 kg", "big");
const sum = text("pD", 560, 425, "21 + 42 = 63 kg", "mid");
const three = text("pD", 560, 600, '<span class="mk">3×</span>', "huge");
look("#pD svg > g", 9);
ink.boil("#pD svg");
cams.pD = fit([200, 370, 900, 1215]);
tl.to(tD.st, { x: XD, duration: 1.0, ease: "power2.out" }, s.s07.start + 0.15);
film.each((t) => (reading.textContent = t >= s.s08b.start + 0.6 ? "63 kg" : t >= s.s07.start + 1.2 ? "21 kg" : ""));
write(big21, 18.5, { speed: 9 });
write(model, 19.0, { speed: 34 });
// s08: the shopping drops into the basket, one thing at a time, and squashes as it lands.
erase([big21, model], s.s08.start - 0.05, { duration: 0.25 });
tl.set(tD.load, { visibility: "visible" }, s.s08.start);
tD.items.forEach((item, i) => {
  const at = s.s08.start + 0.1 + i * 0.32;
  tl.fromTo(item, { y: -300 }, { y: 0, duration: 0.25, ease: "power2.in", immediateRender: true }, at);
  tl.fromTo(item, { scaleY: 0.84, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.2, ease: "back.out(3)", immediateRender: false }, at + 0.25);
});
write(plus, 20.75, { speed: 12 });
// s08b: the reading changes once; the sum; 3× with the marker.
erase(plus, s.s08b.start - 0.05, { duration: 0.2 });
write(sum, 22.1, { speed: 26 });
write(three, 22.9, { duration: 0.3 });
ink.marker(three.querySelector(".mk"), 23.25, { colour: MARK, duration: 0.4, height: 0.4 });

// ═══ Sheet E: the same push, a third of the acceleration (s09) ═══════════════════════════════════════════════════
const WE = 240, LANES = [650, 1150], X0 = 240;
draw("pE", `<path d="M40 ${LANES[0]} H1040"/><path d="M40 ${LANES[1]} H1040"/><path class="thin" d="M${X0} ${LANES[0] - 300} V${LANES[1] + 30}" stroke-dasharray="14 12"/>`);
const tE1 = placed("pE", WE, { full: false });
const tE2 = placed("pE", WE, { full: true });
const lK = text("pE", 860, 345, "troli kosong", "small");
const lP = text("pE", 700, 812, "troli penuh (3×)", "small");
// The same push on both: equal arrows on the handles, while the push lasts.
const fE = [draw("pE", arrow(-130, 0, -15, 0)), draw("pE", arrow(-130, 0, -15, 0))];
const lF = [text("pE", 0, 0, "F", "mid"), text("pE", 0, 0, "F", "mid")];
const race = { u: 0 }; // time over the push's length: 0 to 1 while pushed, then they roll on at the speed they have
const along = (L) => (race.u <= 1 ? L * race.u * race.u : L + 2 * L * (race.u - 1)); // a t^2 / 2, then v t
tE1.st.at = () => [X0 + along(LANE), LANES[0]];
tE2.st.at = () => [X0 + along(FULL_RUN), LANES[1]];
film.each(() => {
  [tE1, tE2].forEach((tr, i) => {
    const [x, y] = tr.st.at(), g = [x + gripOf(WE)[0], y + gripOf(WE)[1]];
    fE[i].setAttribute("transform", `translate(${g[0]} ${g[1]})`);
    Object.assign(lF[i].style, { left: `${g[0] - 72}px`, top: `${g[1] - 52}px` });
  });
});
const brE = draw("pE", `<path d="M${X0} ${LANES[0] + 40} H${X0 + LANE} M${X0} ${LANES[0] + 22} v36 M${X0 + LANE} ${LANES[0] + 22} v36"/><path d="M${X0} ${LANES[1] + 40} H${X0 + FULL_RUN} M${X0} ${LANES[1] + 22} v36 M${X0 + FULL_RUN} ${LANES[1] + 22} v36"/>`);
const lD1 = text("pE", X0 + LANE / 2, LANES[0] + 88, "jauh", "small");
const lD2 = text("pE", X0 + FULL_RUN / 2 + 30, LANES[1] + 88, "cuma ⅓", "small");
look("#pE svg > g", 11);
ink.boil("#pE svg");
write([lK, lP], s.s09.start + 0.2, { speed: 26 });
drawOn(fE, 24.75, { duration: 0.2 });
write(lF, 24.8, { duration: 0.15 });
const PUSH_AT = 25.0, PUSH_FOR = 1.5;
tl.to(race, { u: 1, duration: PUSH_FOR, ease: "none" }, PUSH_AT);
tl.to(race, { u: 1 + (s.s10.start + 0.2 - PUSH_AT - PUSH_FOR) / PUSH_FOR, duration: s.s10.start + 0.2 - PUSH_AT - PUSH_FOR, ease: "none" }, PUSH_AT + PUSH_FOR);
erase(fE, PUSH_AT + PUSH_FOR, { duration: 0.15 });
erase(lF, PUSH_AT + PUSH_FOR, { duration: 0.15 });
drawOn(brE, PUSH_AT + PUSH_FOR + 0.05, { duration: 0.35 });
write(lD1, 26.65, { duration: 0.25 });
write(lD2, 26.96, { duration: 0.35 });

// ═══ Sheet F: rolling, and it will not stop (s10, s11): the camera travels with it ════════════════════════════════
const WF = 300, SF = WF * TALL;
draw("pF", `<path d="M-900 ${GROUND} C -300 ${GROUND - 10}, 300 ${GROUND + 8}, 900 ${GROUND - 4}"/><path d="M880 ${GROUND - 4} C 1400 ${GROUND - 12}, 2000 ${GROUND + 6}, 2600 ${GROUND}"/>`);
draw("pF", Array.from({ length: 22 }, (_, i) => `<path class="thin" d="M${-880 + i * 160} ${GROUND + 6} l-18 30"/>`).join(""));
const tF = placed("pF", WF, { full: true });
const roll = { x: 300 };
tF.st.at = () => [roll.x, GROUND];
const speed = draw("pF", `<path class="thin" d="M-20 ${-0.86 * WF} h-90 M-28 ${-0.72 * WF} h-110 M-20 ${-0.58 * WF} h-80"/>`);
film.each(() => speed.setAttribute("transform", `translate(${roll.x} ${GROUND})`));
const runner = figure("pF", SF);
Object.assign(runner, { x: -300, y: GROUND, lean: 14, back: -0.18, front: 0.18, face: "worried", holding: 0 });
const gripF = () => [roll.x + gripOf(WF)[0], GROUND + gripOf(WF)[1]];
runner.gripAt = gripF;
const HOLD = -0.16 * SF; // leaning back on a straight arm, his feet are this far behind the grip
const skid = draw("pF", '<path class="thin" d="M0 0 H1"/><path class="thin" d="M0 12 H1"/>', "live");
const lJalan = text("pF", 0, 520, "maunya tetap jalan", "mid");
look("#pF svg > g:not(.figure):not(.live)", 13);
ink.boil("#pF svg");
cams.pF = { x: 0, y: 0, z: 1.2, at: () => ({ x: roll.x - 20, y: 884 }) };
// s10: it rolls on its own at a steady speed; he runs after it (on twos).
const GRAB = s.s11.start;
tl.to(roll, { x: 300 + 260 * (GRAB - (s.s10.start - 0.3)), duration: GRAB - (s.s10.start - 0.3), ease: "none" }, s.s10.start - 0.3);
const ROLL_AT_GRAB = 300 + 260 * (GRAB - (s.s10.start - 0.3));
tl.to(runner, { x: ROLL_AT_GRAB + gripOf(WF)[0] + HOLD, duration: GRAB - (s.s10.start - 0.3), ease: "none" }, s.s10.start - 0.3);
runner.step = (t) => {
  if (t < s.s10.start - 0.3 || t >= GRAB) return;
  const k = Math.floor(t * 6) % 2;
  Object.assign(runner, { back: k ? -0.2 : -0.06, front: k ? 0.2 : 0.07, kneeF: k ? 0.04 : 0.08, swing: k ? 1 : -1 });
};
erase(speed, GRAB - 0.3, { duration: 0.2 });
// s11: he grabs the handle (his arm reaches over four drawings) and leans back, heels dug in; it drags him on and
// slows, but it is still rolling when the page turns.
// (a flag, not a function: the timeline would call a function to get a value)
runner.follow = () => (runner.holding ? roll.x + gripOf(WF)[0] + HOLD : runner.x);
tl.set(runner, { holding: 1, swing: 0, face: "strain" }, GRAB);
tl.to(runner, { reach: 1, bend: 0.02, duration: 0.3, ease: "power2.out" }, GRAB - 0.1);
tl.to(runner, { lean: -18, back: -0.3, front: 0.02, kneeB: 0.02, kneeF: -0.03, duration: 0.35, ease: "back.out(1.6)" }, GRAB + 0.1);
tl.to(roll, { x: ROLL_AT_GRAB + 130 * 4.0, duration: 4.0, ease: "power1.out" }, GRAB);
const heel0 = ROLL_AT_GRAB + gripOf(WF)[0] + HOLD + 0.02 * SF;
film.each((t) => {
  const on = t >= GRAB + 0.3;
  skid.style.visibility = on ? "visible" : "hidden";
  if (!on) return;
  const now = roll.x + gripOf(WF)[0] + HOLD + 0.02 * SF;
  const [a, b] = skid.querySelectorAll("path");
  a.setAttribute("d", `M${heel0} ${GROUND - 2} H${now}`);
  b.setAttribute("d", `M${heel0 + 14} ${GROUND + 10} H${now + 4}`);
});
film.each(() => (lJalan.style.left = `${roll.x + 120}px`));
write(lJalan, 30.75, { speed: 18 });

// ═══ Sheet G: braking as hard as you pushed, three times the distance (s12) ═══════════════════════════════════════
const WG = 240, BRAKE = 300;
draw("pG", `<path d="M40 ${LANES[0]} H1040"/><path d="M40 ${LANES[1]} H1040"/>`);
const brakeLine = draw("pG", `<path class="thin" d="M${BRAKE} ${LANES[0] - 290} V${LANES[1] + 30}" stroke-dasharray="18 14"/>`);
const lRem = text("pG", BRAKE + 20, LANES[0] - 320, "mulai ngerem", "small");
const tG1 = placed("pG", WG, { full: false });
const tG2 = placed("pG", WG, { full: true });
// Skid marks and the distance brackets grow with each trolley as it brakes.
const marks = draw("pG", [0, 1].map((i) => `<path class="fat" d="M${BRAKE} ${LANES[i] + 12} H${BRAKE + [STOP_EMPTY, STOP_FULL][i]}"/>`).join(""));
const brG = draw("pG", [0, 1].map((i) => `<path d="M${BRAKE} ${LANES[i] + 46} H${BRAKE + [STOP_EMPTY, STOP_FULL][i]}"/>`).join(""));
const ticks = draw("pG", [0, 1].map((i) => `<path d="M${BRAKE} ${LANES[i] + 28} v36 M${BRAKE + [STOP_EMPTY, STOP_FULL][i]} ${LANES[i] + 28} v36"/>`).join(""));
const lOne = text("pG", BRAKE + STOP_EMPTY / 2, LANES[0] + 110, "1", "big");
const lThree = text("pG", BRAKE + STOP_FULL / 2, LANES[1] + 100, '<span class="mk">× 3</span>', "big");
// The braking force: the same arrow as the push in s09, turned round, on each handle while it brakes.
const fG = [draw("pG", arrow(-15, 0, -130, 0)), draw("pG", arrow(-15, 0, -130, 0))];
const lFG = [text("pG", 0, 0, "F", "mid"), text("pG", 0, 0, "F", "mid")];
look("#pG svg > g", 17);
ink.boil("#pG svg");
// Both reach the line at the same speed V; the same force stops the full one at a third of the deceleration.
// Distance after braking for time tau: V tau - a tau^2 / 2, until it stops at V^2 / 2a.
const V = 600, T = [(2 * STOP_EMPTY) / V, (2 * STOP_FULL) / V];
const run = { t: -0.5 };
const pos = (i) => {
  const stop = [STOP_EMPTY, STOP_FULL][i];
  return run.t <= 0 ? V * run.t : run.t >= T[i] ? stop : V * run.t - (V / T[i] / 2) * run.t * run.t;
};
tG1.st.at = () => [BRAKE - WG + pos(0), LANES[0]];
tG2.st.at = () => [BRAKE - WG + pos(1), LANES[1]];
const dash = (g) => [...g.querySelectorAll("path:not(.ink-pencil)")].map((p) => {
  const both = [p, p.__pencil].filter(Boolean);
  for (const q of both) { q.setAttribute("pathLength", "1"); q.style.strokeDasharray = "1 1.02"; }
  return both;
});
const [markE, markF] = dash(marks), [brE1, brE3] = dash(brG);
film.each(() => {
  [0, 1].forEach((i) => {
    const shown = Math.max(0, Math.min(1, pos(i) / [STOP_EMPTY, STOP_FULL][i]));
    for (const q of [...[markE, markF][i], ...[brE1, brE3][i]]) q.style.strokeDashoffset = 1 - shown;
    const braking = run.t > 0 && run.t < T[i];
    const [x, y] = [tG1, tG2][i].st.at(), g = [x + gripOf(WG)[0], y + gripOf(WG)[1]];
    fG[i].setAttribute("transform", `translate(${g[0]} ${g[1]})`);
    fG[i].style.visibility = braking ? "visible" : "hidden";
    Object.assign(lFG[i].style, { left: `${g[0] - 72}px`, top: `${g[1] - 52}px`, visibility: braking ? "visible" : "hidden" });
  });
});
const RUN_AT = 32.6;
tl.to(run, { t: T[1] + 0.05, duration: T[1] + 0.55, ease: "none" }, RUN_AT);
write(lRem, s.s12.start + 0.15, { speed: 24 });
drawOn(ticks, RUN_AT + 0.5, { duration: 0.2 });
write(lOne, RUN_AT + 0.5 + T[0] + 0.05, { duration: 0.15 });
write(lThree, RUN_AT + 0.5 + T[1] + 0.05, { duration: 0.3 });
ink.marker(lThree.querySelector(".mk"), RUN_AT + 0.5 + T[1] + 0.4, { colour: MARK, duration: 0.35 });

// ═══ Sheet H: the answer in one frame (s13) ═══════════════════════════════════════════════════════════════════════
const lMassa = text("pH", 330, 410, '<span class="mk">massa ✓</span>', "big");
const lBer = text("pH", 790, 410, "berat", "big");
const cross = draw("pH", '<path class="fat" d="M680 400 L900 446"/>');
const lHedge = text("pH", 560, 500, "(terutama saat mulai &amp; berhenti)", "small");
const WH = 200, SH = WH * TALL;
draw("pH", `<path d="M50 860 H640"/><path d="M50 1240 H700"/>`);
const tH1 = placed("pH", WH, { full: true });
const tH2 = placed("pH", WH, { full: true });
Object.assign(tH1.st, { x: 360, y: 860 });
Object.assign(tH2.st, { x: 420, y: 1240 });
const pushH = figure("pH", SH);
Object.assign(pushH, { x: 138, y: 860, ...PUSH, gripAt: () => [360 + gripOf(WH)[0], 860 + gripOf(WH)[1]] });
const brakeH = figure("pH", SH);
Object.assign(brakeH, { x: 420 + gripOf(WH)[0] - 0.155 * SH, y: 1240, lean: -22, back: -0.3, front: 0.02, kneeF: -0.03, reach: 1, bend: 0.02, face: "strain", gripAt: () => [420 + gripOf(WH)[0], 1240 + gripOf(WH)[1]] });
const goH = draw("pH", arrow(585, 760, 690, 760));
const stopH = draw("pH", `${arrow(440, 940, 330, 940)}<path class="thin" d="M120 1236 h70 M128 1248 h66"/>`);
const lMulai = text("pH", 870, 680, "susah mulai", "mid");
const lStop = text("pH", 840, 1000, "susah berhenti", "mid");
look("#pH svg > g:not(.figure)", 19);
ink.boil("#pH svg");
cams.pH = fit([50, 350, 1000, 1262]);
write(lMassa, s.s13.start + 0.2, { speed: 14 });
write(lHedge, 37.0, { speed: 45 });
tl.from([tH1.g, pushH.el], { opacity: 0, duration: 0.15 }, 37.2);
drawOn(goH, 37.3, { duration: 0.2 });
write(lMulai, 37.35, { speed: 22 });
tl.from([tH2.g, brakeH.el], { opacity: 0, duration: 0.15 }, 37.65);
drawOn(stopH, 37.75, { duration: 0.3 });
write(lStop, 37.85, { speed: 22 });
ink.marker(lMassa.querySelector(".mk"), 37.95, { colour: MARK, duration: 0.4 });
write(lBer, 38.3, { speed: 14 });
drawOn(cross, 38.96, { duration: 0.25 });

// ═══ s14: back to the opening picture, exactly as frame 0, a moment before the loop ═════════════════════════════
tl.set([lDiam, toDiam, lTetap, qmark, push, lift, lDorong, lAngkat], { opacity: 0 }, s.s14.start - 0.35);
tl.set(cams.pA, { ...CAM_A }, s.s14.start - 0.35);
tl.set(ride, { x: XA }, s.s14.start - 0.35);
tl.set(man, { ...PUSH, lean: 12, back: -0.22, face: "strain" }, s.s14.start - 0.35);
tl.to(man, { lean: 22, duration: Math.min(0.8, film.duration - s.s14.start - 0.5), ease: "power2.inOut" }, s.s14.start + 0.3);

// ── Turning to a fresh sheet: laid over the last from the side, landing square, with its shadow on the page below ──
const turns = [["pA", 0], ["pB", s.s03.start, 1], ["pA", s.s05.start, -1], ["pC", s.s06.start, 1], ["pD", s.s07.start, 1], ["pE", s.s09.start, 1], ["pF", s.s10.start, 1], ["pG", s.s12.start, 1], ["pH", s.s13.start, 1], ["pA", s.s14.start, -1]];
for (const id of PAGES) gsap.set(page(id), { autoAlpha: 0 });
turns.forEach(([id, at, dir], i) => {
  const from = i ? at - 0.3 : 0, next = turns[i + 1];
  tl.set(page(id), { autoAlpha: 1 }, from);
  if (next) tl.set(page(id), { autoAlpha: 0 }, next[1] + 0.25);
  if (i) tl.fromTo(page(id), { x: 1100 * dir, rotation: 2.5 * dir, transformOrigin: "50% 100%" }, { x: 0, rotation: 0, duration: 0.5, ease: "power3.out", immediateRender: false }, from);
});
// The sheet turned in last lies on top: keep the pages' order in the document in step with the turns.
film.each((t) => {
  const i = turns.findLastIndex(([, at], k) => (k ? at - 0.3 : 0) <= t + 1e-6);
  if (i < 1) return;
  const top = page(turns[i][0]), under = page(turns[i - 1][0]);
  if (under.compareDocumentPosition(top) & Node.DOCUMENT_POSITION_PRECEDING) under.after(top);
});
gsap.set(page("pA"), { autoAlpha: 1 });
film.finish();
