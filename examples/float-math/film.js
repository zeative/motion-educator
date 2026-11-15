// "Why does 0.1 + 0.2 not equal 0.3?" A portrait short with captions and no voice. Every time comes from
// storyboard.json; a picture lands on the caption word it belongs to (read(), the same pacing film.captions() uses).
// Everything drawn for a number is computed from it: 0.1's bits are worked out here with integers, and the number
// lines are drawn in gaps between neighbouring doubles (see the fact sheet, f4 to f6).
import { createFilm } from "../../kit/engine/motion.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, $$, stage, shots: s } = film;
const D = storyboard.duration;
const AMBER = "#ffb02e";
const GREEN = "#4ee68f";
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// When a caption word is lit, in the film's time (kit/engine/motion.js paces words by length across the shot).
const key = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
const read = (id, word) => {
  const shot = s[id];
  const words = shot.caption.replaceAll("*", "").split(/\s+/).filter(Boolean);
  const weight = words.map((w) => w.length + 2);
  const total = weight.reduce((a, b) => a + b, 0);
  const from = shot.start + 0.12;
  const until = shot.end - 0.1;
  let run = 0;
  for (let i = 0; i < words.length; i++) {
    if (key(words[i]) === key(word)) return from + ((until - from) * run) / total;
    run += weight[i];
  }
  throw new Error(`no "${word}" in ${id}'s caption`);
};

// 0.1 and 0.2 in binary, worked out exactly: double the remainder, the integer part is the next bit.
const binary = (num, den, n) => {
  let r = num;
  let out = "";
  for (let i = 0; i < n; i++) {
    r *= 2;
    out += r >= den ? "1" : "0";
    if (r >= den) r -= den;
  }
  return out;
};
const BITS1 = binary(1, 10, 70); // 0001100110011...
const BITS2 = binary(2, 10, 70); // 001100110011...
const KEPT = BITS1.slice(3, 56); // 53 bits from the first 1
const AFTER = BITS1.slice(56, 63); // the first bits cut off: 1001100..., more than half, so round up
const STORED = (BigInt(`0b${KEPT}`) + 1n).toString(2);
if (KEPT.length !== 53 || STORED.length !== 53 || !AFTER.startsWith("1")) throw new Error("0.1's bits are not what the fact sheet says");

// ── Stage helpers ────────────────────────────────────────────────────────────
const lightAt = (x, y, glow, at, d = 0.6) => film.light({ lx: x / 1080, ly: 1 - y / 1920, glow }, at, d);
// A hit from a place in the frame: a soft flash there and a ring on the stage.
const hit = (at, x, y, strength, ring = 0.4) => {
  tl.set(stage, { lx: x / 1080, ly: 1 - y / 1920, pr: 0, ps: ring }, at);
  tl.to(stage, { pr: 1.7, ps: 0, duration: 1.1, ease: "power2.out" }, at + 0.02);
  tl.set("#flash", { "--fx": `${(x / 1080) * 100}%`, "--fy": `${(y / 1920) * 100}%`, opacity: strength * 0.5 }, at);
  tl.to("#flash", { opacity: 0, duration: 0.36, ease: "power2.out" }, at + 0.04);
};
const slam = (sel, at, from = 1.4) => {
  gsap.set(sel, { scale: from, opacity: 0, filter: "blur(14px)" });
  tl.to(sel, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.42, ease: "expo.out" }, at);
};
// A line of code typed in: revealed a character at a time (a mono character is 0.6 em wide).
const typeLine = (sel, at, d, em = 52, pad = 40) => {
  const el = $(sel);
  const st = { n: 0 };
  const chars = el.textContent.length;
  const cw = em * 0.6;
  gsap.set(el, { autoAlpha: 0 });
  tl.set(el, { autoAlpha: 1 }, at);
  film.each(() => {
    el.style.clipPath = `inset(-20px ${Math.max(0, el.offsetWidth - pad - Math.floor(st.n) * cw)}px -20px 0)`;
  });
  tl.to(st, { n: chars, duration: d, ease: "none" }, at);
};

film.captions();

// ── s01: the question ────────────────────────────────────────────────────────
Object.assign(stage, { lx: 0.5, ly: 1 - 620 / 1920, glow: 0.85, floor: 0.7 });
film.scene("#s01", 0, s.s02.start + 0.05);
for (const line of $$("#q .ln")) film.split(line);
tl.fromTo("#q", { scale: 1 }, { scale: 1.04, duration: s.s02.start, ease: "none", transformOrigin: "50% 50%" }, 0);
film.sheen("#q2", 0.25, 0.8);
film.sheen("#q3", 1.25, 0.7);
hit(1.3, 700, 860, 0.25, 0.3);
lightAt(700, 860, 0.9, 1.1, 0.5);
film.land("#q-tag", 0.7, { from: 14 });
// The question leaves upward; the hero line goes toward the terminal's prompt.
tl.to(["#q1", "#q3", "#q-tag"], { y: -70, opacity: 0, filter: "blur(10px)", duration: 0.28, ease: "power2.in", stagger: 0.03 }, s.s02.start - 0.5);
tl.to("#q2", { y: -300, scale: 0.4, filter: "blur(8px)", duration: 0.34, ease: "power3.in" }, s.s02.start - 0.5);
tl.to("#q2", { opacity: 0, duration: 0.24, ease: "none" }, s.s02.start - 0.5);

// ── s02: what it prints ──────────────────────────────────────────────────────
film.scene("#s02", s.s02.start - 0.2, s.s03.start + 0.2);
film.land("#term", s.s02.start - 0.2, { from: 60, duration: 0.5 });
lightAt(497, 640, 0.75, s.s02.start - 0.2, 0.5);
const caret = $("#caret");
film.each((t) => (caret.style.opacity = Math.floor((t - s.s02.start) * 2.4) % 2 ? "0.15" : "1"));
const RES = read("s02", "0.3,") - 0.05;
slam("#res-a", RES);
hit(RES, 497, 700, 0.3, 0.35);
gsap.set("#res-b", { opacity: 0 });
film.draw("#zeros-br", read("s02", "fifteen") - 0.05, 0.4);
film.land("#zeros-l", read("s02", "fifteen") + 0.1, { from: 12, duration: 0.4 });
film.land("#term2", read("s02", "zeros,") - 0.05, { from: 40, duration: 0.45 });
film.pop("#false", read("s02", "and") + 0.05);
// The 4 is the error: it turns amber with a ring, and the stage's light goes to it.
const FOUR = read("s02", "a") - 0.05; // as "a" is read, so the amber 4 holds for most of a second
tl.to("#res-b", { opacity: 1, duration: 0.12 }, FOUR);
tl.fromTo("#res-b", { scale: 1.25 }, { scale: 1, duration: 0.4, ease: "back.out(2.4)", transformOrigin: "95% 50%", immediateRender: false }, FOUR);
film.draw("#four-ring", FOUR + 0.04, 0.32);
hit(FOUR, 902, 702, 0.45, 0.42);
film.tintTo(AMBER, FOUR, 0.2);

// ── s03: binary is halves ────────────────────────────────────────────────────
const blur02 = film.motionBlur("#s02");
const blur03 = film.motionBlur("#s03");
const WHIP = s.s03.start + 0.18; // the 4 stays to the cut's last moment; the binary scene lands just after it
film.whip("#s02", "#s03", WHIP, { vertical: true, blur: blur02 });
blur03(WHIP - 0.02, 0.4, 0, 40);
film.scene("#s03", WHIP, s.s04.start + 0.3);
lightAt(497, 760, 0.7, WHIP, 0.6);
film.tintTo(GREEN, WHIP + 0.1, 0.8);
film.split("#d075 .ln");
film.land("#b-head", WHIP + 0.15, { from: 12 });
film.draw("#b-arrow", WHIP + 0.4, 0.3);
slam("#b011", s.s03.start + 0.75);
film.pop("#pv1", s.s03.start + 1.1);
film.pop("#pv2", s.s03.start + 1.25);
film.land("#b-sum", s.s03.start + 1.6, { from: 18, duration: 0.4 });
tl.to("#s03", { scale: 1.03, duration: s.s03.dur, ease: "none", transformOrigin: "50% 40%" }, s.s03.start);
// 0.11 carries over: it shrinks to where row one starts, and row one writes on from its "0.".
tl.to(["#b-head", "#d075", "#b-arrow", "#pv1", "#pv2", "#b-sum"], { opacity: 0, y: 40, duration: 0.25, ease: "power2.in", stagger: 0.02 }, s.s04.start - 0.3);
tl.to("#b011", { x: 64 - 257, y: 424 - 656 + 4, scale: 0.35, duration: 0.42, ease: "power3.inOut", transformOrigin: "0% 0%" }, s.s04.start - 0.32);
tl.to("#s03", { scale: 1, duration: 0.3 }, s.s04.start - 0.32);
tl.set("#b011", { opacity: 0 }, s.s04.start + 0.1);

// ── s04, s05: digits that never end ──────────────────────────────────────────
film.scene("#s04", s.s04.start + 0.08, s.s06.start + 0.35);
const rows = [
  { el: $("#r1"), text: `0.${BITS1}`, at: s.s04.start + 0.08, group: (k) => (k >= 1 ? Math.floor((k - 1) / 4) : -1) },
  { el: $("#r2"), text: `0.${BITS2}`, at: read("s04", "0.2") - 0.15, group: (k) => Math.floor(k / 4) },
  { el: $("#r3"), text: "0.33333333333333333333333333333333333333", at: read("s05", "1/3") - 0.15, group: () => -1 },
];
for (const row of rows) {
  row.el.innerHTML = [...row.text].map((c) => `<span>${c}</span>`).join("");
  row.spans = [...row.el.children];
}
const STEP = 0.042; // a digit every 42 ms: the rows outrun the frame within about a second
film.each((t) => {
  for (const row of rows) {
    const n = t < row.at ? 0 : 2 + Math.floor((t - row.at) / STEP);
    const hot = Math.floor((t - row.at) * 6) % 6; // a glow sweeps along the repeating groups
    row.spans.forEach((span, i) => {
      const on = i < n ? "1" : "0";
      if (span.style.opacity !== on) span.style.opacity = on;
      const g = row.group(i - 2);
      const lit = g >= 0 && g % 6 === hot;
      if (span.classList.contains("hot") !== lit) span.classList.toggle("hot", lit);
    });
  }
});
film.land("#l1", s.s04.start, { from: 10, duration: 0.35 });
film.land("#l2", read("s04", "0.2") - 0.3, { from: 10, duration: 0.35 });
film.land("#l3", read("s05", "1/3") - 0.3, { from: 10, duration: 0.35 });
film.land("#why1", read("s04", "never") - 0.1, { from: 20, duration: 0.45 });
tl.to("#why1", { opacity: 0, y: -16, duration: 0.2, ease: "power2.in" }, read("s05", "1/3") - 0.25);
film.land("#why2", read("s05", "1/3") - 0.05, { from: 20, duration: 0.45 });
tl.to(["#r1", "#r2", "#l1", "#l2"], { opacity: 0.5, duration: 0.3 }, read("s05", "1/3") - 0.2);
tl.to(["#r1", "#l1"], { opacity: 1, duration: 0.3 }, s.s06.start - 0.45);
lightAt(900, 640, 0.6, s.s04.start + 0.2, 1.2);
lightAt(700, 880, 0.6, read("s05", "1/3"), 0.6);
film.tintTo("#e9e6dc", read("s05", "1/3"), 0.4);
film.tintTo(GREEN, s.s06.start - 0.4, 0.4);
// Row one folds into the grid: the other rows and labels leave, row one rises to the grid's head.
tl.to(["#r2", "#r3", "#l2", "#l3", "#why2"], { opacity: 0, y: 30, duration: 0.25, ease: "power2.in" }, s.s06.start - 0.3);
tl.to(["#r1", "#l1"], { y: -90, opacity: 0, duration: 0.35, ease: "power2.in" }, s.s06.start - 0.15);

// ── s06: 53 bits, and the cut ────────────────────────────────────────────────
film.scene("#s06", s.s06.start - 0.05, s.s07.start + 0.3);
const GX = 67;
const GY = 400;
const grid = $("#grid");
const cells = [];
for (let i = 0; i < 60; i++) {
  const bit = i < 53 ? KEPT[i] : AFTER[i - 53];
  const flips = i < 53 && STORED[i] !== KEPT[i];
  const cell = Object.assign(document.createElement("div"), { className: `cell${i >= 53 ? " cut" : ""}` });
  cell.style.left = `${GX + (i % 10) * 86}px`;
  cell.style.top = `${GY + Math.floor(i / 10) * 86}px`;
  cell.innerHTML = flips ? `<b class="old">${bit}</b><b class="new">${STORED[i]}</b>` : `<b>${bit}</b>`;
  grid.append(cell);
  cells.push(cell);
}
film.land("#g-head", s.s06.start, { from: 10, duration: 0.35 });
// The bits arrive in order, a row at a time, as if poured from row one.
gsap.set(cells, { opacity: 0, scale: 0.6 });
tl.to(cells, { opacity: 1, scale: 1, duration: 0.22, ease: "back.out(2)", stagger: 0.016 }, s.s06.start + 0.05);
// The blade comes down after bit 53, and what is past it falls away.
const CUT = read("s06", "cut") - 0.05;
gsap.set("#blade", { scaleY: 0, opacity: 0 });
tl.to("#blade", { scaleY: 1, opacity: 1, duration: 0.14, ease: "power4.in" }, CUT);
hit(CUT + 0.14, 324, 866, 0.35, 0.3);
film.tintTo(AMBER, CUT + 0.14, 0.15);
cells.slice(53).forEach((cell, k) => {
  tl.to(cell, { y: 260 + k * 18, rotation: (k % 2 ? 1 : -1) * (14 + k * 5), opacity: 0, duration: 0.7, ease: "power2.in" }, CUT + 0.2 + k * 0.035);
});
film.land("#g-kept", CUT + 0.25, { from: 12, duration: 0.35 });
film.land("#g-cut", CUT + 0.4, { from: 12, duration: 0.35 });
// The last kept bits are rounded: ...001 becomes ...010, because what was cut is more than half a bit.
const ROUND = read("s06", "53") + 0.05;
for (const cell of cells.slice(0, 53).filter((c) => c.querySelector(".new"))) {
  tl.to(cell.querySelector(".old"), { opacity: 0, y: -26, duration: 0.2, ease: "power2.in" }, ROUND);
  tl.fromTo(cell.querySelector(".new"), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(2)", immediateRender: false }, ROUND + 0.08);
}
film.land("#g-round", ROUND + 0.15, { from: 16, duration: 0.4 });
lightAt(240, 860, 0.8, CUT, 0.3);
// The 53 cells collapse into one dot: the stored 0.1, on a number line.
const DOT0 = { x: 64 + (0.1 / 0.4) * 866, y: 700 };
tl.to(grid, { scale: 0.02, opacity: 0, duration: 0.42, ease: "power3.in", transformOrigin: `${DOT0.x}px ${DOT0.y}px` }, s.s07.start - 0.3);
tl.to(["#g-head", "#g-kept", "#g-cut", "#g-round", "#blade"], { opacity: 0, duration: 0.25 }, s.s07.start - 0.3);

// ── s07: the stored 0.1, zoomed far in ───────────────────────────────────────
film.scene("#s07", s.s07.start - 0.12, s.s08.start + 0.02);
const ULP1 = 2 ** -56; // the gap between doubles at 0.1
const S0 = (866 / 0.4) * ULP1; // px per gap, zoomed out
const S1 = 560; // px per gap, zoomed in
const Z = { p: 0, a: 0, dot: 0, gap: 0 };
const ctx1 = $("#line1").getContext("2d");
const MONO = "'JetBrains Mono Variable', monospace";
const zoomN = $("#zoom-n");
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const smooth = (x) => x * x * (3 - 2 * x);
function tick(c, x, y0, y1, colour, width, alpha, dash) {
  c.save();
  c.globalAlpha = alpha;
  c.strokeStyle = colour;
  c.lineWidth = width;
  if (dash) c.setLineDash(dash);
  c.beginPath();
  c.moveTo(x, y0);
  c.lineTo(x, y1);
  c.stroke();
  c.restore();
}
function text(c, str, x, y, size, colour, alpha = 1, align = "center", weight = 600) {
  if (alpha <= 0.001) return;
  c.save();
  c.globalAlpha = alpha;
  c.font = `${weight} ${size}px ${MONO}`;
  c.fillStyle = colour;
  c.textAlign = align;
  c.shadowColor = "rgba(0,0,0,0.85)";
  c.shadowBlur = 12;
  c.fillText(str, x, y);
  c.restore();
}
function dot(c, x, y, r, colour, alpha = 1, ring = false) {
  if (alpha <= 0.001) return;
  c.save();
  c.globalAlpha = alpha;
  c.shadowColor = colour;
  c.shadowBlur = 26;
  c.fillStyle = colour;
  c.strokeStyle = colour;
  c.lineWidth = 5;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  if (ring) c.stroke();
  else c.fill();
  c.restore();
}
function baseLine(c, y) {
  const g = c.createLinearGradient(0, 0, 1080, 0);
  g.addColorStop(0, "rgba(237,237,240,0)");
  g.addColorStop(0.06, "rgba(237,237,240,0.85)");
  g.addColorStop(0.94, "rgba(237,237,240,0.85)");
  g.addColorStop(1, "rgba(237,237,240,0)");
  c.save();
  c.strokeStyle = g;
  c.lineWidth = 5;
  c.shadowColor = "rgba(255,255,255,0.35)";
  c.shadowBlur = 10;
  c.beginPath();
  c.moveTo(0, y);
  c.lineTo(1080, y);
  c.stroke();
  c.restore();
}
film.each((t) => {
  if (t < s.s07.start - 0.2 || t > s.s08.start + 0.1) return;
  const c = ctx1;
  c.clearRect(0, 0, 1080, 1920);
  const sc = S0 * (S1 / S0) ** Z.p;
  const ax = DOT0.x + (740 - DOT0.x) * smooth(Z.p);
  const X = (u) => ax + (u - 1) * sc; // u: position in gaps from the double below 0.1 (stored 0.1 is u = 1)
  const U = (v) => (v - 0.1) / ULP1 + 0.6; // an ordinary number, zoomed out (0.1 itself is u = 0.6)
  baseLine(c, 700);
  const out = 1 - clamp((Z.p - 0.04) / 0.12);
  for (const v of [0, 0.1, 0.2, 0.3, 0.4]) {
    const x = X(U(v));
    if (x < -100 || x > 1180) continue;
    tick(c, x, 676, 724, "#ededf0", 4, out);
    text(c, String(v), x, 790, 44, "#ededf0", out);
  }
  // The doubles themselves, once they are far enough apart to see.
  const near = clamp((Math.log10(sc) - 1.6) / 0.6);
  for (let k = -2; k <= 4; k++) tick(c, X(k), 664, 736, "#a9a9b0", 5, near);
  text(c, "a double", X(0), 790, 32, "#a9a9b0", near * Z.a, "center", 500);
  // 0.1 itself, between two doubles; the stored value on the one above it.
  tick(c, X(0.6), 590, 790, "#ededf0", 4, Z.a, [14, 12]);
  text(c, "0.1", X(0.6), 572, 50, "#ededf0", Z.a);
  text(c, "stored", X(1), 572, 40, AMBER, Z.a, "center", 600);
  if (Z.gap > 0) {
    c.save();
    c.strokeStyle = AMBER;
    c.lineWidth = 10;
    c.shadowColor = AMBER;
    c.shadowBlur = 16;
    c.beginPath();
    c.moveTo(X(0.6), 700);
    c.lineTo(X(0.6) + (X(1) - X(0.6)) * Z.gap, 700);
    c.stroke();
    c.restore();
  }
  dot(c, X(1), 700, 17, AMBER, Z.dot);
  // How far in we are, as it happens: the scale against where we started.
  const n = Math.floor(Math.log10(sc / S0) + 1e-9);
  const label = n < 1 ? "zoom ×1" : `zoom ×10${[...String(n)].map((d) => SUP[d]).join("")}`;
  if (zoomN.textContent !== label) zoomN.textContent = label;
});
tl.set(Z, { dot: 1 }, s.s07.start - 0.12);
film.land("#zoom", s.s07.start + 0.05, { from: 12, duration: 0.35 });
const DIVE = s.s07.start + 0.25;
tl.to(Z, { p: 1, duration: 1.45, ease: "expo.inOut" }, DIVE);
tl.to(Z, { a: 1, duration: 0.35 }, DIVE + 1.15);
tl.to(Z, { gap: 1, duration: 0.4, ease: "power2.out" }, read("s07", "tiny") - 0.1);
lightAt(DOT0.x, 700, 0.75, s.s07.start - 0.2, 0.3);
tl.to(stage, { lx: 740 / 1080, duration: 1.45, ease: "expo.inOut" }, DIVE);
film.tintTo(AMBER, s.s07.start, 0.3);
// The stored value, written out.
const stVal = $("#st-val");
const ST = ["0.10000000000000000", "55511…"];
stVal.innerHTML = `<span id="st-a"></span><em id="st-b"></em>`;
const stA = $("#st-a");
const stB = $("#st-b");
const typed = { n: 0 };
film.each(() => {
  const n = Math.floor(typed.n);
  const a = ST[0].slice(0, n);
  const b = ST[1].slice(0, Math.max(0, n - ST[0].length));
  if (stA.textContent !== a) stA.textContent = a;
  if (stB.textContent !== b) stB.textContent = b;
});
film.land("#st-head", read("s07", "stored") - 0.05, { from: 10, duration: 0.3 });
tl.to(typed, { n: ST[0].length + ST[1].length, duration: 0.65, ease: "none" }, read("s07", "stored"));
film.land("#st-off", read("s07", "off") - 0.05, { from: 18, duration: 0.4 });

// ── s08: the sum, at 0.3 ─────────────────────────────────────────────────────
const blur07 = film.motionBlur("#s07");
film.whip("#s07", "#s08", s.s08.start, { blur: blur07 });
film.scene("#s08", s.s08.start, s.s09.start);
// 600 px a gap near 0.3 (2^-54): the double nearest 0.3 at 200, 0.3 at 320 (0.2 gap above it), 0.1's error
// 60 px (0.1 gap) and 0.2's 120 px (0.2 gap) stacked from 0.3, the exact sum at 500, the next double at 800.
const P = { lo: 200, exact: 320, e1: 380, sum: 500, hi: 800 };
const L = { seg1: 0, seg2: 0, sum: 0, hop: 0, ans: 0, lead: 0 };
const ctx3 = $("#line3").getContext("2d");
film.each((t) => {
  if (t < s.s08.start - 0.4 || t > s.s09.start + 0.1) return;
  const c = ctx3;
  c.clearRect(0, 0, 1080, 1920);
  baseLine(c, 700);
  for (const x of [P.lo - 600, P.lo, P.hi, P.hi + 600]) tick(c, x, 664, 736, "#a9a9b0", 5, 1);
  text(c, "0.29999999999999998", P.lo, 822, 28, "#a9a9b0", 1, "center", 500);
  tick(c, P.exact, 600, 730, "#ededf0", 4, 1, [14, 12]);
  text(c, "0.3", P.exact, 572, 50, "#ededf0");
  const seg = (x0, x1, p, colour) => {
    if (p <= 0) return;
    c.save();
    c.strokeStyle = colour;
    c.lineWidth = 14;
    c.lineCap = "round";
    c.shadowColor = colour;
    c.shadowBlur = 14;
    c.beginPath();
    c.moveTo(x0, 700);
    c.lineTo(x0 + (x1 - x0) * p, 700);
    c.stroke();
    c.restore();
  };
  seg(P.exact, P.e1, L.seg1, "#ffd27a");
  seg(P.e1, P.sum, L.seg2, AMBER);
  // The two errors, named once over the pair: 0.1's (pale) then 0.2's (amber).
  text(c, "0.1 + 0.2 errors", 420, 772, 30, AMBER, clamp(L.seg2 * 2), "center", 600);
  dot(c, P.sum, 700, 14, AMBER, L.sum, true);
  text(c, "exact sum", 540, 822, 28, AMBER, L.sum, "center", 500);
  // The hop: the exact sum is not a double, so it is rounded to one.
  if (L.hop > 0) {
    c.save();
    c.strokeStyle = AMBER;
    c.lineWidth = 6;
    c.setLineDash([16, 12]);
    c.beginPath();
    const steps = 40;
    for (let i = 0; i <= steps * L.hop; i++) {
      const u = i / steps;
      const x = P.sum + (P.hi - P.sum) * u;
      const y = 690 - Math.sin(Math.PI * u) * 120;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
    c.restore();
    text(c, "rounded", (P.sum + P.hi) / 2, 548, 30, AMBER, clamp(L.hop * 1.5), "center", 600);
  }
  dot(c, P.hi, 700, 19, AMBER, L.ans);
  if (L.lead > 0) {
    c.save();
    c.globalAlpha = L.lead;
    c.strokeStyle = AMBER;
    c.lineWidth = 3;
    c.setLineDash([8, 10]);
    c.beginPath();
    c.moveTo(P.hi + 10, 722);
    c.lineTo(902, 852);
    c.stroke();
    c.restore();
  }
});
lightAt(P.exact, 700, 0.7, s.s08.start, 0.4);
// How far in this line is: 600 px for a gap of 2^-54, against the zoomed-out line's 866 px for 0.4.
const Z3 = Math.floor(Math.log10((600 / 2 ** -54) / (866 / 0.4)));
$("#zoom3-n").textContent = `zoom ×10${[...String(Z3)].map((d) => SUP[d]).join("")}`;
film.land("#zoom3", s.s08.start + 0.1, { from: 12, duration: 0.35 });
tl.to(L, { seg1: 1, duration: 0.35, ease: "power2.out" }, read("s08", "them,") - 0.05);
tl.to(L, { seg2: 1, duration: 0.45, ease: "power2.out" }, read("s08", "them,") + 0.32);
tl.to(L, { sum: 1, duration: 0.2 }, read("s08", "them,") + 0.75);
tl.to(stage, { lx: P.sum / 1080, duration: 0.6, ease: "power2.inOut" }, read("s08", "them,"));
const HOP = read("s08", "error") + 0.05;
tl.to(L, { hop: 1, duration: 0.5, ease: "power2.inOut" }, HOP);
tl.to(L, { ans: 1, duration: 0.15 }, HOP + 0.45);
hit(HOP + 0.5, P.hi, 700, 0.3, 0.3);
film.land("#sum-note", HOP + 0.3, { from: 16, duration: 0.4 });
const ANS = read("s08", "that") - 0.05;
slam("#res3-a", ANS);
tl.to(L, { lead: 1, duration: 0.3 }, ANS + 0.2);
gsap.set("#res3-b", { opacity: 0 });
const FOUR3 = read("s08", "4") - 0.12;
tl.to("#res3-b", { opacity: 1, duration: 0.12 }, FOUR3);
tl.fromTo("#res3-b", { scale: 1.25 }, { scale: 1, duration: 0.4, ease: "back.out(2.4)", transformOrigin: "95% 50%", immediateRender: false }, FOUR3);
hit(FOUR3, 902, 898, 0.4, 0.4);

// ── s09, s10: the fix ────────────────────────────────────────────────────────
film.scene("#s09", s.s09.start, s.s11.start + 0.1);
hit(s.s09.start, 497, 700, 0.5, 0.35);
film.tintTo(GREEN, s.s09.start, 0.25);
lightAt(497, 560, 0.7, s.s09.start, 0.3);
film.land("#fix", s.s09.start, { from: 40, duration: 0.45 });
tl.fromTo("#s09", { scale: 1 }, { scale: 1.03, duration: s.s11.start - s.s09.start, ease: "none", transformOrigin: "50% 40%", immediateRender: false }, s.s09.start);
typeLine("#c1", read("s09", "compare") - 0.2, 0.55);
const TOL = read("s09", "tolerance") - 0.05;
film.draw("#tol-br", TOL, 0.3);
film.land("#tol-l", TOL + 0.1, { from: 10, duration: 0.35 });
film.pop("#o1", TOL + 0.2, { transformOrigin: "0% 50%" });
typeLine("#c2", read("s10", "use") - 0.15, 0.6);
film.pop("#o2", read("s10", "integers") + 0.25, { transformOrigin: "0% 50%" });
lightAt(497, 800, 0.7, read("s10", "use"), 0.5);
film.land("#dec", read("s10", "decimals") - 0.05, { from: 18, duration: 0.4 });
// The panel sinks away as the recap rises.
tl.to("#s09", { opacity: 0, y: 160, scale: 0.85, duration: 0.24, ease: "power2.in" }, s.s11.start - 0.42);

// ── s11: the recap, and the line to remember ─────────────────────────────────
film.scene("#s11", s.s11.start - 0.16, D);
film.tintTo(AMBER, s.s11.start, 0.6);
["#rc1", "#rc2", "#rc3"].forEach((card, i) => film.land(card, s.s11.start - 0.14 + i * 0.12, { from: 70, duration: 0.5 }));
for (const line of $$("#poster .ln")) film.split(line);
const POSTER = s.s11.start + 0.35;
gsap.set("#poster .ln", { scale: 1.4, opacity: 0, filter: "blur(16px)" });
tl.to("#poster .ln", { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.45, ease: "expo.out", stagger: 0.18 }, POSTER);
hit(POSTER + 0.18, 497, 1100, 0.3, 0.35);
film.sheen("#poster", POSTER + 0.75, 0.8);
lightAt(497, 1080, 0.8, s.s11.start, 0.5);
film.land("#end-tag", POSTER + 0.6, { from: 14, duration: 0.45 });
tl.fromTo("#s11", { scale: 1 }, { scale: 1.03, duration: D - s.s11.start, ease: "none", transformOrigin: "50% 50%", immediateRender: false }, s.s11.start);
// The last frame hands back to the first: the light settles where frame 0 has it.
lightAt(497, 620, 0.85, D - 0.9, 0.9);

await document.fonts.load(`600 40px ${MONO}`);
film.finish();
