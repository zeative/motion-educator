// "Kenapa es malah ngapung di air?" No narration: the script is the captions, and every shot is as long as its
// caption takes to read (storyboard.json). Pictures arrive with the caption words they belong to. Everything that stands
// for a number is computed in lab.js from the densities (the waterline, the box heights, the bars).
import { createFilm } from "../../kit/engine/motion.js";
import { GROW, ICE, RHO_ICE, UNDER, WATER, createLab } from "./lab.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, $$, stage, shots: s } = film;
const D = storyboard.duration;
const lab = createLab($("#lab"));
const { L, out } = lab;

// When a word of a shot's caption lights up, in the film's time: the same pacing film.captions() gives the words
// (spread across the shot by their length, from 0.12 s after its start to 0.1 s before its end).
const said = (id, word) => {
  const shot = s[id];
  const words = shot.caption.replaceAll("*", "").split(/\s+/).filter(Boolean);
  const weight = words.map((w) => w.length + 2);
  const total = weight.reduce((a, b) => a + b, 0);
  const from = shot.start + 0.12;
  const until = shot.end - 0.1;
  let run = 0;
  for (const [i, w] of words.entries()) {
    if (w.toLowerCase().replace(/[^\p{L}\p{N}%/-]/gu, "") === word) return from + ((until - from) * run) / total;
    run += weight[i];
  }
  throw new Error(`the caption of ${id} has no "${word}"`);
};
const hex = (c) => {
  const n = Number.parseInt(c.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
};
// The stage's light, as a place in the frame.
const lightAt = (x, y, glow, at, d = 0.6) => film.light({ lx: x / 1080, ly: 1 - y / 1920, glow }, at, d);
const floorAt = (y) => 0.5 - y / 1920;
const slam = (lines, at, stagger = 0.16) => {
  gsap.set(lines, { scale: 1.4, opacity: 0, filter: "blur(16px)" });
  tl.to(lines, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.45, ease: "expo.out", stagger }, at);
};
// A soft flash and a ring from a place in the frame (the canvas covers the stage, so the flash is placed by hand).
const hit = (at, x, y, strength, ring) => {
  tl.set(stage, { pr: 0, ps: ring }, at);
  tl.to(stage, { pr: 1.7, ps: 0, duration: 1.1, ease: "power2.out" }, at + 0.02);
  tl.set("#flash", { "--fx": `${(x / 1080) * 100}%`, "--fy": `${(y / 1920) * 100}%`, opacity: strength * 0.5 }, at);
  tl.to("#flash", { opacity: 0, duration: 0.36, ease: "power2.out" }, at + 0.04);
};
const place = (el, x, y) => (el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`);

// ── Every frame: the canvas, and what rides on it ────────────────────────────
const pinFour = $("#pin-four");
const pinGap = $("#pin-gap");
const pin92 = $("#pin-92");
const dash = $("#dash");
const mbar = $("#mbar");
const M = { dash: 0, bar: 0 };
film.each((t) => {
  lab.draw(t);
  place(pinFour, out.hi[0] + (out.hi[2] ?? 20) + 18, out.hi[1]);
  place(pinGap, out.gap[0] + 40, out.gap[1]);
  if (out.measure) place(pin92, out.measure[0] + 4, out.measure[1]);
  // The liquid's top carried across to the ice column, and the measure of the difference (s08).
  if (out.twinBox && out.box) {
    const yL = out.twinBox[4][1];
    const yI = out.box[4][1];
    const x0 = out.twinBox[4][0];
    const x1 = out.box[5][0] + 14;
    const xm = out.box[4][0] - 14;
    dash.style.transform = `translate(${x0.toFixed(1)}px, ${(yL - 2).toFixed(1)}px)`;
    dash.style.width = `${((x1 - x0) * M.dash).toFixed(1)}px`;
    mbar.style.transform = `translate(${(xm - 4).toFixed(1)}px, ${(yL - (yL - yI) * M.bar).toFixed(1)}px)`;
    mbar.style.height = `${((yL - yI) * M.bar).toFixed(1)}px`;
  }
});

film.captions();

// ── s01: the question, while the ice comes up ────────────────────────────────
Object.assign(stage, { lx: 0.46, ly: 1 - 820 / 1920, glow: 0.55, floor: 1, horizon: floorAt(1150), silk: 0.7, ...hex(WATER) });
film.scene("#s01", 0, s.s02.start);
tl.to(L.cam, { z: 1.04, duration: s.s02.start, ease: "none" }, 0);
const lines = $$("#q .ln");
for (const line of lines) film.split(line);
slam(lines[1], said("s01", "malah"), 0);
slam(lines[2], said("s01", "di"), 0);
film.sheen("#q", said("s01", "ngapung"), 0.6);
const BREAK = lab.breakTime(L.hero);
hit(BREAK, 497, 540, 0.25, 0.3);
// The light follows the cube up to the surface.
lightAt(497, 600, 0.7, 0.1, BREAK);
for (const line of lines) film.typeOut([...line.querySelectorAll(".ch")], s.s02.start - 0.32, { stagger: 0.004 });

// ── s02: wax sinks in its own melt; ice does not ─────────────────────────────
film.scene("#s02", s.s02.start, s.s03.start);
tl.to(L.hero, { a: 0, duration: 0.3, ease: "power1.in" }, s.s02.start - 0.25);
tl.set(L.cam, { z: 1.0 }, s.s02.start);
tl.to(L.cam, { z: 1.035, duration: s.s02.dur, ease: "none" }, s.s02.start);
tl.to(L.pair, { a: 1, duration: 0.3, ease: "power1.out" }, s.s02.start - 0.1);
tl.set(L.pair, { waxT0: s.s02.start + 0.15 }, 0);
L.pair.waxT0 = s.s02.start + 0.15;
lightAt(497, 760, 0.5, s.s02.start - 0.1, 0.5);
film.land("#pair-head", s.s02.start + 0.05, { from: 14 });
film.pop("#c-wax", s.s02.start + 0.15);
film.pop("#c-ice", s.s02.start + 0.3);
film.pop("#f-wax", said("s02", "tenggelam") - 0.04);
film.pop("#f-ice", said("s02", "sendiri") - 0.04);
tl.to("#s02", { opacity: 0, duration: 0.2 }, s.s03.start - 0.2);
tl.to(L.pair, { a: 0, duration: 0.25 }, s.s03.start - 0.22);

// ── s03: a dive into the water, and the liquid ───────────────────────────────
// The cut is a dive: the hero glass is back for a moment, a lens opens over its water and grows over the frame,
// with the liquid already inside it.
const DIVE = s.s03.start;
tl.set(L.hero, { t0: DIVE - 6, rest: 1, dim: 0 }, DIVE - 0.25);
tl.to(L.hero, { a: 1, duration: 0.2 }, DIVE - 0.22);
tl.set(L.cam, { z: 1, x: 560, y: 960 }, DIVE - 0.25);
tl.to(L.cam, { z: 1.08, duration: 1.0, ease: "power1.in" }, DIVE - 0.25);
Object.assign(L.mol, { a: 0, box: 0, freeze: 0, jiggle: 1 });
tl.set(L.lens, { a: 1, r: 0 }, DIVE - 0.05);
tl.to(L.lens, { r: 130, duration: 0.3, ease: "back.out(1.6)" }, DIVE - 0.05);
tl.to(L.lens, { r: 1400, x: 520, y: 900, duration: 0.7, ease: "power3.in" }, DIVE + 0.25);
tl.to(L.hero, { dim: 1, duration: 0.5, ease: "power1.inOut" }, DIVE + 0.3);
tl.set(L.mol, { a: 1 }, DIVE + 0.95);
tl.set(L.lens, { a: 0 }, DIVE + 0.95);
tl.set(L.hero, { a: 0 }, DIVE + 0.95);
lightAt(560, 960, 0.6, DIVE - 0.1, 0.4);
film.scene("#mol", DIVE + 0.9, s.s08.start + 0.3);
tl.set(L.cam, { z: 1, x: 497, y: 760 }, DIVE + 0.95);
tl.to(L.cam, { z: 1.03, duration: s.s03.end - DIVE - 0.95, ease: "none" }, DIVE + 0.95);
tl.to(L.mol, { box: 1, duration: 0.5, ease: "power1.out" }, DIVE + 0.9);
tl.to(L.mol, { phi: -0.22, duration: s.s04.end - DIVE, ease: "sine.inOut" }, DIVE);
film.land("#c-liq", DIVE + 1.05, { from: 16 });
lightAt(497, 1000, 0.55, DIVE + 0.9, 0.6);
tl.to(stage, { horizon: floorAt(1150), duration: 0.5 }, DIVE + 0.9);

// ── s04: freezing: each molecule takes four neighbours ───────────────────────
const FREEZE = said("s04", "membeku") - 0.05;
film.tintTo(ICE, FREEZE, 0.6);
tl.to(L.mol, { freeze: 1, duration: 1.15, ease: "power1.inOut" }, FREEZE);
tl.to(L.mol, { bonds: 1, duration: 0.8, ease: "power1.out" }, FREEZE + 0.5);
tl.to("#c-liq", { autoAlpha: 0, y: -12, duration: 0.2 }, FREEZE);
film.land("#c-frz", FREEZE + 0.1, { from: 16 });
tl.to(L.cam, { z: 1.16, duration: s.s04.end - FREEZE - 0.3, ease: "power1.inOut" }, FREEZE + 0.3);
tl.to(L.mol, { hi: 1, duration: 0.35, ease: "power2.out" }, said("s04", "menggandeng") - 0.05);
tl.to(L.mol, { hiBonds: 1, duration: 0.8, ease: "none" }, said("s04", "4") - 0.05);
film.pop("#c-four", said("s04", "tetangga") - 0.05, { transformOrigin: "0% 50%" });
lightAt(497, 760, 0.7, FREEZE, 0.8);

// ── s05: the rings and the room inside them ──────────────────────────────────
const TURN = s.s05.start - 0.15;
tl.to("#c-four", { autoAlpha: 0, duration: 0.2 }, TURN);
tl.to("#c-frz", { autoAlpha: 0, y: -12, duration: 0.2 }, TURN);
tl.to(L.mol, { hi: 0, hiBonds: 0, duration: 0.3 }, TURN);
tl.to(L.mol, { tilt: 0, phi: 0, duration: 0.75, ease: "power3.inOut" }, TURN);
tl.to(L.cam, { z: 1.02, duration: 0.75, ease: "power3.inOut" }, TURN);
tl.to(L.cam, { z: 1.06, duration: s.s06.start - TURN - 0.75, ease: "none" }, TURN + 0.75);
film.land("#c-hex", said("s05", "segi") - 0.1, { from: 16 });
tl.to(L.mol, { ring: 1, duration: 0.55, ease: "power1.inOut" }, said("s05", "segi") - 0.05);
tl.to(L.mol, { chan: 1, duration: 0.5, ease: "power2.out" }, said("s05", "berongga") - 0.05);
film.pop("#c-gap", said("s05", "berongga") + 0.05, { transformOrigin: "0% 50%" });
lightAt(497, 760, 0.85, said("s05", "berongga") - 0.05, 0.4);

// ── s06: the same molecules, as liquid and as ice ────────────────────────────
const SHRINK = s.s06.start - 0.12;
tl.to("#c-hex, #c-gap", { autoAlpha: 0, duration: 0.2 }, SHRINK);
tl.to(L.mol, { ring: 0, chan: 0, duration: 0.25 }, SHRINK);
// The columns: both at 0.75 times the size, a little tilted so every molecule shows, both boxes on one floor.
const COL = { s: 64, tilt: 0.3, phi: -0.12 };
const col = (cx) => ({ cx, cy: 1130 - (lab.ice.H / 2) * COL.s * Math.cos(COL.tilt) - 26 });
tl.to(L.cam, { z: 1, x: 497, y: 760, duration: 0.55, ease: "power3.inOut" }, SHRINK);
tl.to(L.mol, { ...COL, ...col(718), duration: 0.6, ease: "power3.inOut" }, SHRINK);
Object.assign(L.twin, { ...COL, ...col(278) });
tl.set(L.twin, { cx: 40 }, 0);
L.twin.cx = 40;
tl.to(L.twin, { a: 1, cx: col(278).cx, duration: 0.55, ease: "power3.out" }, SHRINK + 0.1);
const SAMA = said("s06", "sama") - 0.05;
film.land("#c-col1", SAMA - 0.35, { from: 16 });
film.land("#c-col2", SAMA - 0.35, { from: 16 });
for (const sel of ["#c-col1 .num", "#c-col2 .num"]) {
  tl.fromTo(sel, { scale: 1.5, color: "#ffffff" }, { scale: 1, color: ICE, duration: 0.4, ease: "back.out(2.4)", immediateRender: false }, SAMA);
}
lightAt(497, 900, 0.6, SHRINK, 0.6);

// ── s07: but it takes 9 % more room ──────────────────────────────────────────
tl.to(M, { dash: 1, duration: 0.6, ease: "power2.inOut" }, said("s07", "tapi") - 0.05);
gsap.set(["#dash", "#mbar"], { autoAlpha: 0 });
tl.set("#dash", { autoAlpha: 1 }, said("s07", "tapi") - 0.05);
const NINE = said("s07", "9%") - 0.05;
tl.set("#mbar", { autoAlpha: 1 }, NINE - 0.25);
tl.to(M, { bar: 1, duration: 0.3, ease: "power2.out" }, NINE - 0.25);
film.split("#p9");
slam("#p9 .ln", NINE, 0);
film.land("#p9-sub", NINE + 0.25, { from: 12 });
hit(NINE, 720, 520, 0.22, 0.3);
film.sheen("#p9", NINE + 0.5, 0.6);
tl.to(L.cam, { z: 1.05, x: 720, y: 560, duration: s.s07.end - NINE, ease: "none" }, NINE);
lightAt(720, 560, 0.8, NINE - 0.1, 0.4);

// ── s08: the same mass in more room: lighter ─────────────────────────────────
const BARS = s.s08.start - 0.15;
tl.to("#mol", { opacity: 0, duration: 0.25 }, BARS);
tl.to([L.mol, L.twin], { a: 0, duration: 0.3 }, BARS);
tl.to(L.cam, { z: 1, x: 497, y: 760, duration: 0.5, ease: "power3.inOut" }, BARS);
film.scene("#bars", s.s08.start, s.s09.start);
tl.set(L.bars, { a: 1 }, BARS);
tl.to(L.bars, { fill: 1, duration: 0.35 }, BARS);
tl.to(L.bars, { morph: 1, duration: 0.7, ease: "power3.inOut" }, BARS + 0.1);
film.land("#c-unit", s.s08.start + 0.2, { from: 16 });
film.land("#l-w", s.s08.start + 0.5, { from: 12 });
film.land("#l-i", s.s08.start + 0.6, { from: 12 });
const LIGHT = said("s08", "ringan") - 0.05;
film.pop("#v-w", LIGHT - 0.12);
film.pop("#v-i", LIGHT + 0.05);
hit(LIGHT + 0.05, 680, 520, 0.18, 0.25);
tl.to(L.cam, { z: 1.03, duration: s.s08.dur - 0.6, ease: "none" }, s.s08.start + 0.6);
const UP = said("s08", "ngapung") - 0.1;
tl.to(L.bars, { lift: 1100, duration: 0.75, ease: "power2.in" }, UP);
tl.to("#v-i, #l-i", { y: -1100, duration: 0.75, ease: "power2.in" }, UP);
lightAt(680, 700, 0.7, s.s08.start, 0.6);
tl.to(stage, { horizon: floorAt(1100), duration: 0.5 }, s.s08.start);

// ── s09: how much is under ───────────────────────────────────────────────────
film.scene("#macro", s.s09.start, s.s10.start);
tl.set(L.bars, { a: 0 }, s.s09.start);
tl.set(L.macro, { a: 1, t0: s.s09.start }, s.s09.start);
L.macro.t0 = s.s09.start;
tl.set(L.cam, { z: 1, x: 497, y: 760 }, s.s09.start);
tl.to(L.cam, { z: 1.04, duration: s.s09.dur, ease: "none" }, s.s09.start);
tl.set(stage, { horizon: floorAt(1290) }, s.s09.start);
lightAt(497, 700, 0.75, s.s09.start, 0.3);
tl.to(L.macro, { ticks: 1, duration: 1.0, ease: "power1.inOut" }, said("s09", "9/10-nya") - 0.1);
tl.to(L.macro, { measure: 1, duration: 0.5, ease: "power2.out" }, said("s09", "9/10-nya") + 0.25);
gsap.set("#pin-92", { autoAlpha: 0 });
tl.set("#pin-92", { autoAlpha: 1 }, said("s09", "9/10-nya") + 0.7);
slam("#v92", said("s09", "9/10-nya") + 0.7, 0);
film.land("#v92-sub", said("s09", "di") + 0.1, { from: 12 });
film.land("#c-div", said("s09", "bawah") - 0.35, { from: 16 });

// ── s10: the recap, and the line to remember ─────────────────────────────────
film.scene("#recap", s.s10.start, D);
tl.to("#macro", { opacity: 0, duration: 0.25 }, s.s10.start - 0.2);
tl.to(L.macro, { a: 0.28, duration: 0.5 }, s.s10.start - 0.2);
lightAt(497, 980, 0.8, s.s10.start - 0.1, 0.6);
["#rc1", "#rc2", "#rc3"].forEach((card, i) => film.land(card, s.s10.start + i * 0.12, { from: 70, duration: 0.5 }));
for (const line of $$("#poster .ln")) film.split(line);
slam("#poster .ln", s.s10.start + 0.3, 0.18);
hit(s.s10.start + 0.3, 497, 1000, 0.22, 0.3);
film.sheen("#poster", s.s10.start + 1.0, 0.8);
tl.to(L.cam, { z: 1.03, duration: D - s.s10.start, ease: "none" }, s.s10.start);

film.finish();
