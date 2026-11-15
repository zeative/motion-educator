// "Kok uang bisa beranak? Gimana bunga majemuk bekerja?" A captions-only film: every time comes from storyboard.json.
// One coin is Rp1 juta and a slice a tenth of a coin is what a coin earns in a year at 10%; the chart's lines are
// 10 + t and 10 x 1,1^t, recomputed every frame on the axes of the moment; the ladder's corners sit on the curve
// at t = k x ln 2 / ln 1,1.
import { createFilm } from "../../kit/engine/motion.js";
import { createCoins } from "./coins.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, $$, stage, shots: s } = film;
const D = storyboard.duration;
const GOLD = "#f4b740";
const BLUE = "#6fb6ff";

film.captions();

const coins = await createCoins($("#c3d"));
const { S, child, blues, top2, slices } = coins;
film.each((t) => coins.render(t));

// ── Helpers ──────────────────────────────────────────────────────────────────
const on = (sel, at) => tl.set(sel, { autoAlpha: 1 }, at);
const off = (sel, at) => tl.set(sel, { autoAlpha: 0 }, at);
const popIn = (sel, at, d = 0.5) => {
  gsap.set(sel, { autoAlpha: 0, scale: 0.6 });
  tl.to(sel, { autoAlpha: 1, scale: 1, duration: d, ease: "back.out(2)" }, at);
};
const fadeOut = (sel, at, d = 0.3) => tl.to(sel, { autoAlpha: 0, duration: d, ease: "power1.in" }, at);
const landIn = (sel, at) => {
  gsap.set(sel, { autoAlpha: 0, y: 24 });
  tl.to(sel, { autoAlpha: 1, y: 0, duration: 0.55, ease: "expo.out" }, at);
};
// A year counter: one numeral per year, swapped on one frame.
const yearsShown = [];
const year = (n, at) => {
  for (let k = 1; k <= 5; k++) tl.set(`#y${k}`, { opacity: k === n ? 1 : 0 }, at);
  yearsShown.push(at);
};
gsap.set("#years b", { opacity: 0 });

// ── The coin world's camera: the hook frames the stack at (1400, 900), the lesson at (820, 860) ─────────────
Object.assign(S.view, { px: 494, py: 571, zoom: 1.35, orbit: -0.05 });
const REST = { px: 980, py: 580, zoom: 1.12, orbit: 0 }; // the lesson's framing: the stack at x 794, base at y 854
const coinsUI = $("#coinsUI");
film.each(() => {
  const v = S.view;
  coinsUI.style.transform = `translate(${(960 - v.px * v.zoom).toFixed(2)}px, ${(540 - v.py * v.zoom).toFixed(2)}px) scale(${v.zoom.toFixed(4)})`;
});

// ═════════════════════════ s01 · the question ═════════════════════════════
Object.assign(stage, { lx: 0.72, ly: 0.42, glow: 0.75, floor: 0.9, horizon: -0.22 });
film.scene("#coins", 0, D);
film.split("#ask");
// Frame 0 already holds the first line; the second types in as it is read.
film.typeIn($$("#ask .ln:last-child .ch"), 0.35);
film.sheen("#ask", 1.6, 1.0);
tl.to(S.view, { orbit: 0.05, duration: s.s01.end, ease: "none" }, 0);
// The child coin: born inside the top coin, rises out of the stack, arcs to the floor beside it.
Object.assign(child.s, { x: 820, base: 860, lift: 9, vis: 0, glow: 0.2 });
tl.set(child.s, { vis: 1 }, 0.55);
tl.to(child.s, { lift: 11.6, glow: 1.2, duration: 0.7, ease: "power2.out" }, 0.55);
tl.to(child.s, { x: 1020, duration: 0.8, ease: "power2.inOut" }, 1.2);
tl.to(child.s, { lift: 0, duration: 0.8, ease: "bounce.out" }, 1.2);
tl.to(child.s, { spin: Math.PI * 0.6, duration: 1.4, ease: "power2.out" }, 0.55);
tl.to(child.s, { glow: 0.45, duration: 0.8 }, 2.0);
tl.to(S, { bungaShadow: 0, duration: 0.01 }, 0);
film.light({ glow: 1.0, lx: 0.66, ly: 0.48 }, 0.55, 0.6);
film.light({ glow: 0.7 }, 1.4, 1.2);
film.hit(1.95, 0.35, 0.3);
gsap.set("#ring", { left: 1020, top: 868, scale: 0.4 });
tl.set("#ring", { opacity: 0.9, scale: 0.4 }, 1.95);
tl.to("#ring", { opacity: 0, scale: 1.4, duration: 0.9, ease: "power2.out" }, 1.95);

// ═════════════════════════ s02 · Rp10 juta of pokok ═══════════════════════
const t2 = s.s02.start;
film.typeOut(film.split("#ask"), t2 - 0.3);
fadeOut("#kicker", t2 - 0.3);
tl.to(S.view, { ...REST, duration: 1.0, ease: "power3.inOut" }, t2 - 0.2);
tl.to(child.s, { vis: 0, duration: 0.35, ease: "power2.in" }, t2 - 0.2);
film.light({ lx: 0.44, ly: 0.5, glow: 0.75 }, t2 - 0.2, 1.0);
gsap.set("#bracket", { autoAlpha: 0, scaleY: 0 });
tl.to("#bracket", { autoAlpha: 1, scaleY: 1, duration: 0.6, ease: "power3.out" }, t2 + 0.7);
landIn("#pokokLabel", t2 + 0.8);
landIn("#pokokNum", t2 + 0.9);
landIn("#koinNote", t2 + 1.2);
tl.to(S.view, { zoom: 1.14, duration: 2.0, ease: "none" }, t2 + 0.8);

// ═════════════════════════ s03 · 10% a year: every coin grows a tenth ═════
const t3 = s.s03.start;
popIn("#chipRate", t3 + 0.05);
landIn("#note", t3 + 0.3);
slices.forEach((sl, k) => {
  Object.assign(sl.s, { k, out: 0, fly: 0, vis: 0, x: 1360, base: k * 0.1 });
  if (k < 10) {
    tl.set(sl.s, { vis: 1 }, t3 + 0.35 + k * 0.06);
    tl.to(sl.s, { out: 150, duration: 0.55, ease: "expo.out" }, t3 + 0.35 + k * 0.06);
  }
});
landIn("#sliceNote", t3 + 0.95);
film.light({ glow: 0.95, lx: 0.52 }, t3 + 0.3, 0.8);

// ═════════════════════════ s04 · year 1: ten tenths make one coin ═════════
const t4 = s.s04.start;
year(1, t4);
gsap.set("#years", { autoAlpha: 0 });
tl.fromTo("#years", { autoAlpha: 0, y: -14 }, { autoAlpha: 1, y: 0, duration: 0.4, immediateRender: false }, t4);
fadeOut("#sliceNote", t4);
slices.slice(0, 10).forEach((sl, k) => tl.to(sl.s, { fly: 1, duration: 0.6, ease: "power2.inOut" }, t4 + 0.2 + k * 0.05));
const born1 = t4 + 1.05;
slices.slice(0, 10).forEach((sl) => tl.set(sl.s, { vis: 0 }, born1));
tl.set(child.s, { x: 1360, base: 860, lift: 0, vis: 1, glow: 1.4, spin: 0, blue: 0 }, born1);
tl.to(child.s, { glow: 0.45, duration: 0.9, ease: "power2.out" }, born1 + 0.05);
tl.set(S, { bungaShadow: 1 }, born1);
popIn("#chipBunga1", born1 + 0.1);
film.hit(born1, 0.3, 0.2);
tl.to(S.view, { zoom: 1.17, duration: s.s04.dur, ease: "none" }, t4);

// ═════════════════════════ s05 · taken out: Rp1 juta a year, forever ══════
const t5 = s.s05.start;
fadeOut("#chipBunga1", t5 + 0.1);
// Year 1's coin is taken: lifted, carried right into the blue pile, cooling on the way.
tl.to(child.s, { lift: 1.6, duration: 0.25, ease: "power2.out" }, t5 + 0.1);
tl.to(child.s, { x: 1660, duration: 0.5, ease: "power2.inOut" }, t5 + 0.25);
tl.to(child.s, { lift: 0, duration: 0.3, ease: "power2.in" }, t5 + 0.55);
tl.to(child.s, { blue: 1, glow: 0, duration: 0.5 }, t5 + 0.25);
tl.to(S, { blueShadow: 1, bungaShadow: 0, cool: 0.8, duration: 0.4 }, t5 + 0.3);
landIn("#diambil", t5 + 0.3);
popIn("#chipYear", t5 + 0.85);
film.tintTo("#a9c8ff", t5 + 0.2, 0.8);
// Years 2 to 5: the same ten slices, the same one coin, onto the blue pile.
const cycle = 0.78;
for (let y = 2; y <= 5; y++) {
  const a = t5 + 0.85 + (y - 2) * cycle;
  year(y, a);
  const b = blues[y - 2];
  slices.slice(0, 10).forEach((sl, k) => {
    tl.set(sl.s, { vis: 1, out: 0, fly: 0, x: 1360, base: k * 0.1 }, a);
    tl.to(sl.s, { out: 150, duration: 0.2, ease: "power2.out" }, a);
    tl.to(sl.s, { fly: 1, duration: 0.25, ease: "power2.inOut" }, a + 0.2);
    tl.set(sl.s, { vis: 0 }, a + 0.45);
  });
  tl.set(b.s, { x: 1360, base: 860, lift: 0, vis: 1, blue: 0, glow: 1.1 }, a + 0.45);
  tl.to(b.s, { x: 1660, lift: y - 1, blue: 1, glow: 0, duration: 0.3, ease: "power2.inOut" }, a + 0.47);
}
tl.to(S.view, { zoom: 1.04, px: 1060, duration: s.s05.dur, ease: "power1.inOut" }, t5);
fadeOut("#note", s.s06.start + 0.2);

// ═════════════════════════ s06 · the straight line ════════════════════════
const blur = film.motionBlur("#coins");
const blurC = film.motionBlur("#chart");
const t6 = s.s06.start;
film.whip("#coins", "#chart", t6, { blur: blurC });
tl.set(S, { vis: 0 }, t6);
tl.set("#years", { autoAlpha: 0 }, t6);

// The chart's state: the axes of the moment, how far each line is drawn (in years), the ladder and the dash.
const C = { xmax: 30, ymax: 180, tb: 0, tg: 0, blueA: 1, ladder: 0, dash: 0, gridA: 1, xlabA: 1 };
const X0 = 300, X1 = 1480, Y0 = 840, Y1 = 170;
const DOUBLE = Math.log(2) / Math.log(1.1);
const px = (t, v) => [X0 + ((X1 - X0) * t) / C.xmax, Y0 - ((Y0 - Y1) * v) / C.ymax];
const simple = (t) => 10 + t;
const compound = (t) => 10 * 1.1 ** t;
const pathOf = (f, t1) => {
  if (t1 <= 0) return "";
  const n = Math.max(2, Math.ceil(t1 * 6));
  let d = "";
  for (let i = 0; i <= n; i++) {
    const t = (t1 * i) / n;
    const [x, y] = px(t, f(t));
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
};
// The ladder: across from Rp10·2^k to the curve, up to Rp10·2^(k+1); progress in steps (0..4).
const ladderPath = (p) => {
  let d = "";
  for (let k = 0; k < 4 && p > k; k++) {
    const a = k * DOUBLE;
    const b = (k + 1) * DOUBLE;
    const lo = 10 * 2 ** k;
    const hi = 10 * 2 ** (k + 1);
    const u = Math.min(1, p - k);
    const across = Math.min(1, u / 0.6);
    const up = Math.max(0, (u - 0.6) / 0.4);
    const [xa, ya] = px(a, lo);
    const [xb] = px(a + (b - a) * across, lo);
    d += `${k ? "L" : "M"}${xa.toFixed(1)} ${ya.toFixed(1)} L${xb.toFixed(1)} ${ya.toFixed(1)}`;
    if (up > 0) {
      const [, yu] = px(b, lo + (hi - lo) * up);
      d += ` L${xb.toFixed(1)} ${yu.toFixed(1)}`;
    }
  }
  return d;
};
const grid = $("#grid");
const niceStep = (max, n) => [1, 2, 5, 10, 20, 50].find((st) => max / st <= n) ?? 50;
const fmt = (v) => String(+v.toFixed(1)).replace(".", ",");
const pinsAt = [];
const pin = (sel, t, v, dx = 0, dy = 0) => pinsAt.push([$(sel), t, v, dx, dy]);
film.each(() => {
  // Grid and axes, for the axes of the moment.
  const xs = niceStep(C.xmax, 7);
  const ys = niceStep(C.ymax, 9);
  let g = "";
  for (let t = xs; t <= C.xmax + 1e-6; t += xs) {
    const [x] = px(t, 0);
    g += `<line class="gridline" x1="${x.toFixed(1)}" y1="${Y0}" x2="${x.toFixed(1)}" y2="${Y1}" opacity="${C.gridA}"/><text x="${x.toFixed(1)}" y="${Y0 + 42}" text-anchor="middle" opacity="${C.xlabA}">${t}</text>`;
  }
  for (let v = ys; v <= C.ymax + 1e-6; v += ys) {
    const [, y] = px(0, v);
    g += `<line class="gridline" x1="${X0}" y1="${y.toFixed(1)}" x2="${X1}" y2="${y.toFixed(1)}" opacity="${C.gridA}"/><text x="${X0 - 18}" y="${(y + 9).toFixed(1)}" text-anchor="end" opacity="${C.gridA}">${fmt(v)}</text>`;
  }
  g += `<text x="${X0 - 18}" y="${Y0 + 9}" text-anchor="end" opacity="${C.gridA}">0</text>`;
  g += `<line class="axis" x1="${X0}" y1="${Y0}" x2="${X1 + 20}" y2="${Y0}"/><line class="axis" x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y1 - 30}"/>`;
  g += `<text class="axt" x="${X1 + 44}" y="${Y0 + 42}" text-anchor="start">tahun</text><text class="axt" x="${X0 - 18}" y="${Y1 - 52}" text-anchor="end">Rp juta</text>`;
  grid.innerHTML = g;
  $("#blueLine").setAttribute("d", pathOf(simple, Math.min(C.tb, C.xmax)));
  $("#goldLine").setAttribute("d", pathOf(compound, Math.min(C.tg, C.xmax)));
  $("#blueLine").style.opacity = C.blueA;
  const [bx, by] = px(Math.min(C.tb, C.xmax), simple(Math.min(C.tb, C.xmax)));
  const [gx, gy] = px(Math.min(C.tg, C.xmax), compound(Math.min(C.tg, C.xmax)));
  $("#blueHead").setAttribute("cx", bx.toFixed(1));
  $("#blueHead").setAttribute("cy", by.toFixed(1));
  $("#blueHead").style.opacity = C.tb > 0 ? C.blueA : 0;
  $("#goldHead").setAttribute("cx", gx.toFixed(1));
  $("#goldHead").setAttribute("cy", gy.toFixed(1));
  $("#goldHead").style.opacity = C.tg > 0 ? 1 : 0;
  $("#ladder").setAttribute("d", ladderPath(C.ladder));
  const [x20, y20] = px(0, 20);
  const [xe] = px(DOUBLE * C.dash, 20);
  $("#dash20").setAttribute("d", C.dash > 0 ? `M${x20} ${y20.toFixed(1)} L${xe.toFixed(1)} ${y20.toFixed(1)}` : "");
  for (const [el, t, v, dx, dy] of pinsAt) {
    const [x, y] = px(t, v);
    el.style.left = `${(x + dx).toFixed(1)}px`;
    el.style.top = `${(y + dy).toFixed(1)}px`;
  }
});
pin("#tag40", 30, 40, 150, 0);
pin("#tag175", 30, 174.5, 170, 0);
pin("#perYear", 15, 25, -10, -60);
pin("#gap", 5, 15.5, 150, 30);
[1, 1.1, 1.21, 1.331, 1.4641].forEach((iv, k) => pin(`#i${k + 1}`, k + 1, compound(k + 1), -6, -58 - k * 4));
pin("#ring20", DOUBLE, 20);
pin("#twice", DOUBLE, 20, 0, -78);
for (let k = 1; k <= 4; k++) {
  pin(`#x2${"abcd"[k - 1]}`, k * DOUBLE, 10 * 2 ** (k - 0.5), 46, 0);
  pin(`#m${k}`, k * DOUBLE, 0, 0, 33);
}
const ratioBar = $("#ratioBar");
film.each(() => {
  const [x, ya] = px(30, 160);
  const [, yb] = px(30, 52);
  Object.assign(ratioBar.style, { left: `${x + 36}px`, top: `${ya}px`, height: `${yb - ya}px` });
});
pin("#ratio", 30, 105, 140, 0);

film.light({ lx: 0.25, ly: 0.35, glow: 0.6 }, t6, 0.6);
film.tintTo(BLUE, t6, 0.6);
tl.to(C, { tb: 30, duration: 1.6, ease: "power1.inOut" }, t6 + 0.35);
landIn("#perYear", t6 + 0.9);
fadeOut("#perYear", s.s06.end - 0.35);
popIn("#tag40", t6 + 1.95);
tl.to(stage, { lx: 0.78, ly: 0.48, duration: 1.6, ease: "power1.inOut" }, t6 + 0.35);

// ═════════════════════════ s07 · kept: the bunga joins the pokok ══════════
const t7 = s.s07.start;
film.whip("#chart", "#coins", t7, { blur });
tl.set(S, { vis: 1, blueShadow: 0, cool: 0, bungaShadow: 1 }, t7);
tl.set(S.view, { ...REST }, t7);
blues.forEach((b) => tl.set(b.s, { vis: 0 }, t7));
tl.set(child.s, { x: 1360, base: 860, lift: 0, blue: 0, glow: 0.45, spin: 0, vis: 1 }, t7);
for (const sel of ["#diambil", "#chipYear", "#chipRate"]) off(sel, t7);
year(1, t7);
tl.set("#years", { autoAlpha: 1 }, t7);
film.tintTo(GOLD, t7, 0.5);
film.light({ lx: 0.5, ly: 0.5, glow: 0.8 }, t7, 0.5);
// On 'dibiarkan' the coin hops onto the stack.
const hop = t7 + 1.0;
tl.to(child.s, { x: 820, duration: 0.7, ease: "power2.inOut" }, hop);
tl.to(child.s, { lift: 12.2, duration: 0.38, ease: "power2.out" }, hop);
tl.to(child.s, { lift: 10, duration: 0.32, ease: "power2.in" }, hop + 0.38);
tl.to(S, { bungaShadow: 0, duration: 0.4 }, hop);
film.hit(hop + 0.7, 0.3, 0.2);
tl.to("#bracket", { scaleY: 288 / 262, duration: 0.3, ease: "power2.out" }, hop + 0.7);
tl.set("#pokokLabel, #pokokNum", { autoAlpha: 0 }, hop + 0.72);
tl.set("#pokokLabel2, #pokokNum2", { autoAlpha: 1 }, hop + 0.72);
tl.to(S.view, { zoom: 1.15, duration: s.s07.dur, ease: "none" }, t7);

// ═════════════════════════ s08 · year 2: every coin earns, the bunga too ══
const t8 = s.s08.start;
year(2, t8);
tl.to(S.view, { zoom: 1.28, px: 1050, py: 650, duration: 1.0, ease: "power2.inOut" }, t8);
for (const sel of ["#koinNote", "#pokokLabel2", "#pokokNum2", "#bracket"]) fadeOut(sel, t8, 0.3);
slices.forEach((sl, k) => {
  tl.set(sl.s, { k, vis: 1, out: 0, fly: 0, x: 1360, base: k * 0.1, hot: 0 }, t8 + 0.3 + k * 0.05);
  tl.to(sl.s, { out: 150, duration: 0.5, ease: "expo.out" }, t8 + 0.3 + k * 0.05);
});
// The slice from last year's bunga (the top coin) burns white-gold: interest earning interest.
tl.to(slices[10].s, { hot: 1, duration: 0.3, ease: "power2.out" }, t8 + 1.2);
landIn("#dariBunga", t8 + 1.25);
gsap.set("#dariBunga", { left: 1100, top: 588 });
film.light({ lx: 0.52, ly: 0.62, glow: 1.0 }, t8 + 1.1, 0.5);
fadeOut("#dariBunga", t8 + 2.3, 0.25);
slices.forEach((sl, k) => tl.to(sl.s, { fly: 1, duration: 0.6, ease: "power2.inOut" }, t8 + 2.35 + k * 0.04));
tl.set(S, { bungaShadow: 1 }, t8 + 2.6);

// ═════════════════════════ s09 · the child's child ════════════════════════
const t9 = s.s09.start;
slices.slice(0, 10).forEach((sl) => tl.set(sl.s, { vis: 0 }, t9));
tl.set(top2.s, { x: 1360, base: 860, lift: 0, vis: 1, glow: 1.2, blue: 0, spin: 0 }, t9);
tl.to(top2.s, { glow: 0.45, duration: 0.8 }, t9 + 0.05);
film.hit(t9, 0.3, 0.2);
tl.to(slices[10].s, { hot: 0.35, duration: 0.25 }, t9 + 0.35);
tl.to(slices[10].s, { hot: 1, duration: 0.25 }, t9 + 0.6);
tl.to(slices[10].s, { hot: 0.7, duration: 0.6 }, t9 + 1.0);
tl.set("#ring", { left: 1360, top: 825, opacity: 0.95, scale: 0.35 }, t9 + 0.6);
tl.to("#ring", { opacity: 0, scale: 1.2, duration: 0.9, ease: "power2.out" }, t9 + 0.6);
popIn("#chipBunga2", t9 + 0.3);
gsap.set("#chipBunga2", { top: 700 });
tl.to(S.view, { zoom: 1.32, duration: s.s09.dur, ease: "none" }, t9);

// ═════════════════════════ s10 · at first, a hair apart ═══════════════════
const t10 = s.s10.start;
film.whip("#coins", "#chart", t10, { vertical: true, blur: blurC });
tl.set(S, { vis: 0 }, t10);
tl.set("#years", { autoAlpha: 0 }, t10);
off("#tag40", t10);
tl.set(C, { xmax: 5, ymax: 20, tb: 5, tg: 0 }, t10);
film.light({ lx: 0.3, ly: 0.55, glow: 0.8 }, t10, 0.5);
film.tintTo(GOLD, t10, 0.4);
tl.to(C, { tg: 5, duration: 1.7, ease: "none" }, t10 + 0.35);
for (let k = 1; k <= 5; k++) popIn(`#i${k}`, t10 + 0.35 + (1.7 * k) / 5, 0.4);
landIn("#gap", t10 + 2.15);
// 'makin besar': each chip grows with its value.
for (let k = 1; k <= 5; k++) tl.to(`#i${k} .ichip`, { scale: 1 + (1.1 ** (k - 1) - 1) * 2.2, duration: 0.4, ease: "back.out(2)" }, t10 + 2.4 + k * 0.06);

// ═════════════════════════ s11 · the curve bends away ═════════════════════
const t11 = s.s11.start;
for (let k = 1; k <= 5; k++) fadeOut(`#i${k}`, t11 - 0.3, 0.25);
fadeOut("#gap", t11 - 0.3, 0.25);
tl.to(C, { xmax: 30, ymax: 180, tb: 30, duration: 1.0, ease: "power3.inOut" }, t11 - 0.25);
tl.to(C, { tg: 30, duration: 2.0, ease: "power1.in" }, t11 + 0.5);
tl.to(stage, { lx: 0.78, ly: 0.82, glow: 1.0, duration: 2.0, ease: "power1.in" }, t11 + 0.5);

// ═════════════════════════ s12 · Rp174,5 juta against Rp40 juta ═══════════
const t12 = s.s12.start;
film.hit(t12 + 0.05, 0.45, 0.35);
popIn("#tag175", t12 + 0.05);
popIn("#tag40", t12 + 0.3);
gsap.set("#ratioBar", { autoAlpha: 0, scaleY: 0 });
tl.to("#ratioBar", { autoAlpha: 1, scaleY: 1, duration: 0.5, ease: "power2.out" }, t12 + 0.6);
landIn("#ratio", t12 + 0.9);
tl.to("#chart", { scale: 1.03, transformOrigin: "50% 50%", duration: s.s12.dur, ease: "none" }, t12);

// ═════════════════════════ s13 · when does it double? ═════════════════════
const t13 = s.s13.start;
tl.to("#chart", { scale: 1, duration: 0.5, ease: "power2.inOut" }, t13);
tl.to(C, { blueA: 0.18, duration: 0.4 }, t13);
for (const sel of ["#tag40", "#tag175", "#ratio", "#ratioBar"]) fadeOut(sel, t13, 0.3);
film.light({ lx: 0.28, ly: 0.32, glow: 0.8 }, t13, 0.6);
tl.to(C, { dash: 1, duration: 0.9, ease: "power2.inOut" }, t13 + 0.3);
gsap.set("#ring20", { scale: 0.3 });
tl.to("#ring20", { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2.5)" }, t13 + 1.2);
tl.set("#ring20", { visibility: "visible" }, t13 + 1.2);
popIn("#twice", t13 + 1.3);

// ═════════════════════════ s14 · the rule of 72, as a ladder ══════════════
const t14 = s.s14.start;
fadeOut("#twice", t14, 0.2);
tl.to("#ring20", { opacity: 0, duration: 0.3 }, t14 + 0.8);
tl.to(C, { dash: 0, duration: 0.3 }, t14 + 0.8);
film.split("#rule");
film.typeIn($$("#rule .ln:first-child .ch"), t14 + 0.05);
const ruleB = $$("#rule .ln:last-child .ch");
gsap.set(ruleB, { opacity: 0, scale: 1.5, filter: "blur(10px)" });
tl.to(ruleB, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.4, ease: "expo.out", stagger: 0.01 }, t14 + 1.0);
film.sheen("#rule", t14 + 1.6);
for (let k = 0; k < 4; k++) {
  tl.to(C, { ladder: k + 1, duration: 0.5, ease: "power1.inOut" }, t14 + 0.9 + k * 0.55);
  popIn(`#x2${"abcd"[k]}`, t14 + 1.25 + k * 0.55, 0.35);
  landIn(`#m${k + 1}`, t14 + 1.1 + k * 0.55);
}
tl.to(C, { xlabA: 0, duration: 0.4 }, t14 + 0.7);
tl.to(stage, { lx: 0.7, ly: 0.82, duration: 2.2, ease: "power1.inOut" }, t14 + 0.9);

// ═════════════════════════ s15 · the chart becomes coins ══════════════════
const t15 = s.s15.start;
// The chart stays a moment, fading, while the columns rise under it: the curve becomes coins.
tl.to("#chart", { autoAlpha: 0, duration: 1.1, ease: "power1.in" }, t15 - 0.2);
fadeOut("#rule", t15 - 0.3, 0.3);
tl.set(S, { vis: 1, stack: 0, sky: 1, grow: 0, bungaShadow: 0, blueShadow: 0, near: 0.6 }, t15 - 0.2);
tl.set([child.s, top2.s], { vis: 0 }, t15 - 0.2);
slices.forEach((sl) => tl.set(sl.s, { vis: 0 }, t15 - 0.2));
for (const sel of ["#chipBunga2", "#years"]) off(sel, t15 - 0.2);
tl.set("#coins", { x: 0, y: 0, autoAlpha: 1 }, t15 - 0.2);
tl.set(S.view, { px: 900, py: 560, zoom: 0.94, orbit: -0.06 }, t15 - 0.2);
tl.to(S, { grow: 31, duration: 2.3, ease: "power1.out" }, t15 - 0.2);
tl.to(S, { blueLine: 1, duration: 0.6 }, t15 + 1.6);
tl.to(S.view, { orbit: 0.02, zoom: 1.0, px: 960, py: 540, duration: s.s15.dur, ease: "power1.inOut" }, t15 - 0.2);
film.light({ lx: 0.35, ly: 0.7, glow: 0.9 }, t15, 0.6);
tl.to(stage, { lx: 0.8, ly: 0.85, duration: 2.6, ease: "power1.inOut" }, t15 + 0.4);

// ═════════════════════════ s16 · asal dikasih waktu ═══════════════════════
const t16 = s.s16.start;
tl.to(S, { blueLine: 0.4, duration: 0.5 }, t16);
tl.to(S.view, { px: 1240, py: 580, zoom: 1.05, orbit: 0.08, duration: s.s16.dur, ease: "power2.inOut" }, t16);
popIn("#tag30", t16 + 0.9);
gsap.set("#tag30", { left: 900, top: 150 });

// ═════════════════════════ s17 · the poster ═══════════════════════════════
const t17 = s.s17.start;
fadeOut("#tag30", t17 - 0.1, 0.2);
tl.to(S, { near: 0.25, duration: 0.6 }, t17);
tl.to("#c3d", { filter: "brightness(0.45) blur(3px)", duration: 0.6 }, t17);
film.light({ lx: 0.5, ly: 0.75, glow: 0.85 }, t17, 0.8);
on("#poster", t17);
film.split("#last");
film.typeIn($$("#last .ln:first-child .ch"), t17 + 0.05);
const lastB = $$("#last .ln:last-child .ch");
gsap.set(lastB, { opacity: 0, scale: 1.5, filter: "blur(12px)" });
tl.to(lastB, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.45, ease: "expo.out", stagger: 0.015 }, t17 + 0.35);
film.hit(t17 + 0.4, 0.35, 0.3);
film.sheen("#last", t17 + 1.1, 1.0);
["#card1", "#card2", "#card3"].forEach((sel, i) => landIn(sel, t17 + 0.35 + i * 0.12));
landIn("#note2", t17 + 0.7);
tl.to("#poster", { scale: 1.03, transformOrigin: "50% 45%", duration: s.s17.dur, ease: "none" }, t17);
tl.to(S.view, { zoom: 1.1, duration: s.s17.dur, ease: "none" }, t17);
// The poster's small chart: the same two functions, drawn small.
const mini = (f) => {
  let d = "";
  for (let i = 0; i <= 30; i++) d += `${i ? "L" : "M"}${(20 + (170 * i) / 30).toFixed(1)} ${(104 - (94 * f(i)) / 180).toFixed(1)}`;
  return d;
};
$("#miniBlue").setAttribute("d", mini(simple));
$("#miniGold").setAttribute("d", mini(compound));

film.finish();
