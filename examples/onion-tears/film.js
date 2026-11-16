// "Why do onions make you cry?" The film is cut to one take of narration: storyboard.json holds the shot times the
// take gave, voice/voice.json the time of every word, and pictures arrive on their words (said()). Two layers draw
// the world: onion3d.js (the lit onion, board, knife and the gas molecule) and micro.js (everything flat: cells,
// juice, gas, face, eye, head, blades). Every value below is tweened on the one timeline.
import { createFilm } from "../../kit/engine/motion.js";
import { createKitchen } from "./onion3d.js";
import { COL, createMicro } from "./micro.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, $$, stage, shots: s, voiced } = film;
const D = storyboard.duration;
// When a word of a shot's line starts, in the film's time.
const norm = (w) => w.toLowerCase().replace(/[^a-z-]/g, "");
const said = (id, word, nth = 0) => {
  const hits = (voiced[id]?.words ?? []).filter(([, , text]) => norm(text) === norm(word));
  if (!hits[nth]) throw new Error(`the take has no "${word}" in ${id}`);
  return hits[nth][0];
};

// ── Captions: accent words take the colour of what they name ──────────────
film.captions();
const NAMED = { sulfur: COL.sulf, compounds: COL.sulf, enzyme: COL.alli, unstable: COL.acid, "acid.": COL.acid, "enzyme,": COL.lfs, "gas.": COL.gas, face: COL.gas, "face.": COL.gas, nerves: COL.nerve, tear: COL.tear, glands: COL.tear, washing: COL.tear, "syn-propanethial-s-oxide.": COL.gas, "itself.": "#fff4d6" };
for (const el of $$(".cw.key")) {
  const shot = el.closest(".caption").dataset.shot;
  const word = el.textContent.toLowerCase();
  let c = NAMED[word];
  if (shot === "s09" && word.startsWith("enzyme")) c = COL.lfs;
  if (shot === "s09" && word === "second") c = COL.lfs;
  if (c) {
    el.dataset.c = "1";
    el.style.setProperty("--c", c);
  }
}

// ── The layers ───────────────────────────────────────────────────────────
const kitchen = createKitchen($("#space"));
const micro = createMicro($("#micro"));
const BOARD_Y = -13.75; // the board's centre; its top is the onion's root (-11.7)
const K = {
  vis: 1,
  cam: { x: 0, y: 42, z: 100, tx: 0, ty: -4, tz: 0 },
  onion: { vis: 1, x: 19.5, y: 0, z: 0, s: 1.3, turn: -0.25 },
  front: 0,
  whole: 1,
  knife: { vis: 1, x: 28, y: 9, z: 0.4, rx: 0, ry: 0, rz: 0 },
  board: 1,
  boardPos: { x: 0, y: BOARD_Y, z: 0 },
  sun: 0,
  mol: { vis: 0, x: 0, y: 4, s: 1, turn: 0, tilt: 0.35, glow: 0 },
};
const M = {
  a: { sheet: 0, big: 0, juice: 0, react: 0, eye: 0, head: 0, face: 0, wisp: 0, knife: 0 },
  dy: { eye: 0, knife: 0 },
  link: 0,
  sheet: { z: 1, cx: 960, cy: 428, sulf: 0, alli: 0, cut: 0, blade: 0, bladeY: -200 },
  big: { z: 1, sulf: 0.2, alli: 0.2, barrier: 0, barrierRun: 0 },
  juice: { z: 1, cx: 960, cy: 540, walls: 1, mix: 0, crowd: 1, hero: 1, heroIn: 0, heroOut: 0, snip: 0, flash: 0, react: 0, acidX: 1060, acidY: 455 },
  react: { arrow: 0, arrowA: 1, flicker: 0, lfs: 0, lfsX: 2300, lfsRot: 0, acid: 0, acidX: 1220, acidY: 442, acidR: 45, shake: 1, gasList: [], gasA: 1, flash: 0, flashX: 1195 },
  wisp: { a: 0, x0: 1250, y0: 560, x1: 1290, y1: 60, bend: 60, life: 2.6, rate: 0, spread: 160, scale: 1, t0: 0.9 },
  face: { s: 1, ex: 1380, ey: 380, squint: 0, ring: 0, tear: 0 },
  eye: { z: 1, ox: 960, oy: 540, fire: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }, run: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }, wash: 0, mols: [], molA: 1 },
  head: { z: 1, inK: 0, inA: 1, stem: 0, outK: 0, gland: 0, tear: 0 },
  knife: { layerA: 1, bladeA: 1, dropA: 1, bars: 0, sharp: { x: 520, tipR: 5.5, tipY: -260, dent: 0, press: 0, broke: 0, spray: 0 }, blunt: { x: 1400, tipR: 80, tipY: -260, dent: 0, press: 0, broke: 0, spray: 0 } },
};
film.each((t) => {
  // while the sheet zooms into (or out of) its centre cell, the big cell is that same cell: it follows the zoom
  if (M.link > 0.5) M.big.z = M.sheet.z / 6.1;
  kitchen.render(K, t);
  micro.draw(M, t);
});
const blurSpace = film.motionBlur("#space");
const blurMicro = film.motionBlur("#micro");
const to = (target, vars, at, d = 0.6, ease = "power3.inOut") => tl.to(target, { ...vars, duration: d, ease }, at);
const set = (target, vars, at) => tl.set(target, vars, at);
const fade = (name, v, at, d = 0.35) => to(M.a, { [name]: v }, at, d, "power1.inOut");
const chip = (id, at, until) => {
  film.pop(id, at, { duration: 0.45 });
  if (until) film.hide(id, until, 0.25);
};
gsap.set(".scene .chip, .note, .card, .bigq, .tipl, .barl, .barcap, .formula, .pline", { opacity: 0 });
film.scene("#names", 0, D);

// ── s01: the question, while a knife goes through an onion ────────────────
Object.assign(stage, { lx: 0.3, ly: 0.75, glow: 0.75, floor: 0, horizon: -0.32, r: 1, g: 0.7, b: 0.42 });
film.scene("#s01", 0, s.s02.start + 0.25);
film.split("#q"); // metal type: every character its own box, the accent word in lime
const qLines = $$("#q .ln");
gsap.set(qLines, { opacity: 0, y: 30 });
gsap.set(qLines[0], { opacity: 1, y: 0 });
[said("s01", "cutting"), said("s01", "make")].forEach((at, i) => tl.to(qLines[i + 1], { opacity: 1, y: 0, duration: 0.45, ease: "expo.out" }, at - 0.05));
film.sheen("#q", said("s01", "cry?") + 0.15, 1.0);
tl.to("#q", { x: -320, opacity: 0, duration: 0.3, ease: "power3.in" }, s.s02.start - 0.12);
// the knife: already moving at frame 0, through the onion on "onion", then lifted away
const CUT = said("s01", "onion");
to(K.knife, { y: -11.7 * 1.3 - 0.2 }, 0, CUT - 0.02, "power1.in");
to(K, { front: 1 }, CUT + 0.12, 0.62, "power2.in");
// it leaves from inside the cut, just behind the cut face, so it never crosses in front of the rings
set(K.knife, { z: -2.2 }, CUT + 0.3);
to(K.knife, { y: 26, x: 38, rz: 0.25 }, CUT + 0.35, 0.8, "power2.inOut");
to(K.cam, { z: 93, y: 39 }, 0, s.s02.start, "none");
set(M.a, { wisp: 1 }, 0);
set(M.wisp, { a: 1, t0: CUT + 0.1, x0: 1340, y0: 330, x1: 1330, y1: -120, bend: 70, life: 2.4, spread: 240, scale: 1 }, 0);
to(M.wisp, { rate: 0.7 }, CUT + 0.15, 1.2, "power1.in");
tl.set(stage, { pr: 0, ps: 0.25 }, CUT);
tl.to(stage, { pr: 1.7, ps: 0, duration: 1.1, ease: "power2.out" }, CUT + 0.02);

// ── s02: a whole onion does nothing ───────────────────────────────────────
const S2 = s.s02.start;
to(K.onion, { x: -70 }, S2 - 0.3, 0.3, "power3.in");
blurSpace(S2 - 0.28, 0.5, 60, 0);
to(M.wisp, { a: 0 }, S2 - 0.32, 0.22, "power1.in");
set(M.a, { wisp: 0 }, S2);
set(K, { front: 0, whole: 1 }, S2);
set(K.onion, { x: 70, s: 1.5, turn: 0.4 }, S2);
set(K.knife, { vis: 0 }, S2);
set(K.cam, { z: 100, y: 42 }, S2);
to(K.onion, { x: 0, turn: 0.1 }, S2, 0.6, "expo.out");
tl.to(stage, { camx: "+=3", duration: 0.6, ease: "power3.inOut" }, S2 - 0.3);
chip("#c-whole", S2 + 0.45, said("s02", "never") - 0.05);
// days pass: the key light swings across, three times, while "for weeks" is said
to(K, { sun: 3 }, said("s02", "for") - 0.1, 1.05, "power1.inOut");
to(stage, { lx: 0.75 }, said("s02", "for") - 0.1, 0.35, "sine.inOut");
to(stage, { lx: 0.25 }, said("s02", "for") + 0.25, 0.35, "sine.inOut");
to(stage, { lx: 0.75 }, said("s02", "for") + 0.6, 0.35, "sine.inOut");
to(stage, { lx: 0.4 }, said("s02", "for") + 0.95, 0.4, "sine.inOut");
chip("#c-nogas", said("s02", "never"), s.s03.start - 0.35);
to(K.onion, { turn: 0.5 }, S2 + 0.6, 3, "none");
// the dive into the flesh
const DIVE = s.s03.start - 0.35;
to(K.cam, { z: 30, y: 4, ty: 2 }, DIVE - 0.15, 0.55, "power3.in");
to(K, { vis: 0 }, DIVE + 0.25, 0.25, "power1.in");
set(K, { vis: 0 }, s.s03.start + 0.2);

// ── s03: its cells keep two things apart ──────────────────────────────────
film.tintTo("#9d84ff", DIVE, 0.6);
set(M.sheet, { z: 2.2 }, DIVE);
fade("sheet", 1, DIVE + 0.15, 0.35);
to(M.sheet, { z: 1 }, DIVE + 0.15, 0.75, "expo.out");
chip("#c-cells", s.s03.start + 0.4, s.s04.start - 0.3);
to(M.sheet, { sulf: 1 }, said("s03", "two") - 0.05, 0.3, "power2.out");
to(M.sheet, { alli: 1 }, said("s03", "things") - 0.05, 0.3, "power2.out");
// push into the centre cell; it becomes the big one
const INTO = s.s04.start - 0.35;
to(M.sheet, { z: 6.1 }, INTO - 0.25, 0.55, "power3.in");
set(M, { link: 1 }, INTO - 0.26);
set(M, { link: 0 }, INTO + 0.31);
fade("big", 1, INTO + 0.1, 0.18);
fade("sheet", 0, INTO + 0.22, 0.1);

// ── s04: sulfur compounds on one side, an enzyme on the other ─────────────
to(M.big, { sulf: 1 }, said("s04", "sulfur") - 0.05, 0.35, "power2.out");
chip("#c-sulf", said("s04", "sulfur"), s.s05.start - 0.4);
to(M.big, { alli: 1 }, said("s04", "enzyme") - 0.05, 0.35, "power2.out");
chip("#c-alli", said("s04", "enzyme"), s.s05.start - 0.4);
film.show("#n-simpl", s.s04.start + 0.3, 0.3);
film.hide("#n-simpl", s.s05.start - 0.4, 0.25);
to(M.big, { barrier: 1 }, said("s04", "other.") - 0.35, 0.2, "power1.out");
to(M.big, { barrierRun: 1 }, said("s04", "other.") - 0.35, 0.9, "none");
to(M.big, { z: 1.04 }, INTO + 0.3, s.s05.start - 0.3 - INTO - 0.3, "none");
// pull back to the sheet
const OUT = s.s05.start - 0.3;
set(M.sheet, { z: 6.1, sulf: 1, alli: 1 }, OUT);
set(M.sheet, { z: 6.1 * 1.04 }, OUT);
fade("sheet", 1, OUT, 0.08);
fade("big", 0, OUT + 0.06, 0.12);
to(M.sheet, { z: 1 }, OUT, 0.6, "expo.out");
set(M, { link: 1 }, OUT);
set(M, { link: 0 }, OUT + 0.62);

// ── s05: the knife goes in, the cells burst ───────────────────────────────
const BLADE = said("s05", "knife") - 0.1;
// the tip enters on "knife" and runs down the sheet; each row bursts as it passes, the last on "burst"
set(M.sheet, { cut: 1, blade: 1, bladeY: -40 }, BLADE);
to(M.sheet, { bladeY: 1250 }, BLADE, said("s05", "burst,") + 0.25 - BLADE, "power1.inOut");
film.tintTo("#ff9a5a", said("s05", "burst,") - 0.4, 0.8);
to(M.sheet, { blade: 0 }, said("s05", "burst,") + 0.15, 0.2, "power1.in");
// push into the seam: the juice
const SEAM = s.s06.start - 0.15;
// a hard cut at the peak of the push, not a crossfade
to(M.sheet, { z: 2.4 }, SEAM - 0.3, 0.4, "power3.in");
set(M.a, { juice: 1, sheet: 0 }, SEAM + 0.1);
set(M.juice, { z: 1.4 }, SEAM);
to(M.juice, { z: 1 }, SEAM, 0.6, "expo.out");

// ── s06: the two spill together ───────────────────────────────────────────
to(M.juice, { mix: 1 }, s.s06.start, said("s06", "together.") + 0.3 - s.s06.start, "power1.inOut");
to(M.juice, { heroIn: 0.6 }, s.s06.start + 0.3, 1.4, "power1.inOut");
chip("#c-mixed", said("s06", "together."), s.s07.start + 0.1);

// ── s07: the enzyme snips them into an unstable acid ──────────────────────
const Z7 = 2.5;
to(M.juice, { z: Z7, cx: 900 - (820 - 960) / Z7, cy: 470 - (480 - 540) / Z7, walls: 0 }, s.s07.start - 0.05, 0.7, "power3.inOut");
to(M.juice, { crowd: 0.55 }, s.s07.start, 0.6);
to(M.juice, { heroIn: 1 }, s.s07.start + 0.1, said("s07", "snips") - s.s07.start - 0.15, "power2.inOut");
chip("#c-enz", s.s07.start + 0.45, said("s07", "unstable") - 0.1);
chip("#c-sc", s.s07.start + 0.6, said("s07", "snips") + 0.2);
const SNIP = said("s07", "snips") + 0.05;
to(M.juice, { flash: 1 }, SNIP, 0.06, "none");
to(M.juice, { flash: 0 }, SNIP + 0.06, 0.4, "power2.out");
to(M.juice, { snip: 1 }, SNIP, 0.25, "power2.out");
to(M.juice, { heroOut: 1 }, SNIP + 0.2, 0.7, "power3.out");
to(M.juice, { react: 1 }, SNIP + 0.4, 2.6, "none");
film.tintTo("#ff7a3a", SNIP, 0.8);
chip("#c-acid", said("s07", "unstable"), s.s08.start + 0.1);
// the acid carries into the next picture
const HAND = s.s08.start - 0.1;
set(M.react, { acid: 1, acidX: 1220, acidY: 442, acidR: 45 }, HAND);
fade("react", 1, HAND, 0.01);
set(M.juice, { hero: 0 }, HAND);
to(M.react, { acidX: 520, acidY: 520, acidR: 96 }, HAND + 0.05, 0.75, "power3.inOut");
// the juice stays behind, dim, so the frame is never an empty field
to(M.juice, { crowd: 0.3, z: 1.6, cx: 960, cy: 540 }, HAND, 0.8, "power2.inOut");
fade("juice", 0.55, HAND, 0.35);
film.scene("#ideas", s.s08.start - 0.1, s.s11.start);

// ── s08: the old idea, that the acid becomes the gas by itself ────────────
film.land("#oldcard", said("s08", "scientists") - 0.05);
to(M.react, { arrow: 1 }, said("s08", "became") - 0.1, 0.55, "power2.inOut");
film.pop("#byitself", said("s08", "by") - 0.05);
to(M.react, { flicker: 1 }, said("s08", "by"), 0.12, "none");
to(M.react, { flicker: 0 }, said("s08", "by") + 0.12, 0.12, "none");
to(M.react, { flicker: 1 }, said("s08", "by") + 0.3, 0.12, "none");
to(M.react, { flicker: 0 }, said("s08", "by") + 0.42, 0.3, "none");

// ── s09: a second enzyme (2002) ───────────────────────────────────────────
const THEN = said("s09", "then");
to(M.react, { arrowA: 0 }, THEN - 0.25, 0.25, "power1.in");
film.hide("#byitself", THEN - 0.25, 0.2);
tl.to("#oldcard", { rotationX: 90, autoAlpha: 0, duration: 0.3, ease: "power2.in" }, THEN - 0.2);
set(M.react, { lfs: 1 }, THEN - 0.05);
to(M.react, { lfsX: 1320 }, THEN - 0.05, 0.7, "expo.out");
blurMicro(THEN - 0.05, 0.4, 50, 0);
// a ring of light on the stage, no white flash over the picture
tl.set(stage, { pr: 0, ps: 0.45 }, THEN + 0.1);
tl.to(stage, { pr: 1.7, ps: 0, duration: 1.1, ease: "power2.out" }, THEN + 0.12);
film.tintTo(COL.lfs, THEN, 0.6);
film.land("#citecard", said("s09", "two") - 0.05);
chip("#c-second", said("s09", "second"), s.s10.start + 0.6);
to(M.react, { lfsRot: 0.18 }, THEN + 0.7, 3, "sine.inOut");

// ── s10: whose whole job is making that gas ───────────────────────────────
const IN10 = said("s10", "whole");
to(M.react, { acidX: 1188, acidY: 520, acidR: 62, shake: 0.4 }, IN10 - 0.1, 0.65, "power2.inOut");
chip("#c-lfs", s.s10.start + 0.65, s.s11.start - 0.15);
film.hide("#citecard", s.s11.start - 0.4, 0.3);
const MAKE = said("s10", "making") - 0.05;
to(M.react, { flash: 1 }, MAKE, 0.06, "none");
to(M.react, { flash: 0 }, MAKE + 0.06, 0.45, "power2.out");
set(M.react, { acid: 0 }, MAKE + 0.03);
{
  const list = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const at = MAKE + 0.05 + i * 0.32;
    list.push({ at, dur: 1.2 + i * 0.05, x0: 1500, y0: 430, x1: i === 0 ? 1640 : 1560 + Math.cos(i * 2.1) * 220, y1: i === 0 ? 250 : 200 + Math.sin(i * 1.7) * 120, r: i === 0 ? 44 : 26, ph: i, a: 1 });
  }
  M.react.gasList = list;
}
chip("#c-gas", said("s10", "gas."), s.s11.start - 0.15);
film.tintTo(COL.gas, said("s10", "gas.") - 0.2, 0.6);

// ── s11: the gas, named ───────────────────────────────────────────────────
const MOL = s.s11.start - 0.2;
to(M.react, { lfs: 0 }, MOL - 0.15, 0.25, "power1.in");
to(M.react, { gasA: 0 }, MOL + 0.1, 0.2, "power1.in");
fade("juice", 0, MOL - 0.15, 0.3);
set(M.a, { react: 0 }, MOL + 0.32);
set(K, { vis: 1, board: 0 }, MOL);
set(K.onion, { vis: 0 }, MOL);
set(K.cam, { x: 0, y: 0, z: 100, tx: 0, ty: 0, tz: 0 }, MOL);
set(K.mol, { vis: 1, x: 33.8, y: 14.4, s: 0.08, glow: 1, turn: -0.5 }, MOL);
to(K.mol, { x: 0, y: 11, s: 0.56 }, MOL + 0.05, 0.75, "expo.out");
to(K.mol, { turn: 0.9 }, MOL, s.s11.dur + 0.4, "sine.inOut");
to(K.cam, { x: 10 }, MOL, s.s11.dur + 0.2, "sine.inOut");
film.scene("#molname", s.s11.start, s.s12.start);
film.typeIn(film.split("#mname"), said("s11", "called") - 0.05, { stagger: 0.03 });
film.show("#formula", said("s11", "syn-propanethial-s-oxide") + 0.6, 0.4);
film.sheen("#mname", said("s11", "quite") - 0.1, 1.0);
// pull out to the kitchen: the molecule shrinks into the onion's gas
const PULL = s.s12.start - 0.2;
to(K.mol, { s: 0.05, x: -24, y: -6 }, PULL - 0.1, 0.35, "power3.in");
tl.to("#mname, #formula", { opacity: 0, y: 40, duration: 0.25, ease: "power2.in" }, PULL - 0.1);
set(K.mol, { vis: 0 }, PULL + 0.25);

// ── s12: it evaporates and drifts to your face ────────────────────────────
// The kitchen from the side: the cut onion small at lower left (its face toward the camera), a face at the right.
const S12 = s.s12.start;
set(K, { front: 1, whole: 0, board: 1, sun: 0 }, PULL + 0.2);
set(K.onion, { vis: 1, x: -25, y: -4, s: 0.55, turn: 0.35 }, PULL + 0.2);
set(K.boardPos, { x: -30, y: -4 - 11.7 * 0.55 - 2, z: -10 }, PULL + 0.2);
set(K.cam, { x: 0, y: 6, z: 100, tx: 0, ty: 0, tz: 0 }, PULL + 0.2);
film.tintTo("#ffb36b", PULL, 0.6);
set(M.face, { s: 1, ex: 1380, ey: 380, squint: 0, ring: 0, tear: 0 }, PULL);
fade("face", 1, PULL + 0.1, 0.35);
set(M.wisp, { a: 1, x0: 470, y0: 660, x1: 1330, y1: 372, bend: 140, life: 2.2, rate: 0.15, spread: 120, scale: 0.85, t0: S12 - 1.4 }, PULL + 0.2);
set(M.a, { wisp: 1 }, PULL + 0.2);
to(M.wisp, { rate: 1 }, said("s12", "evaporates"), 1.2, "power1.in");
to(M.face, { ring: 1 }, said("s12", "face.") - 0.1, 0.9, "power2.out");
to(M.face, { squint: 1 }, said("s12", "face.") - 0.05, 0.4, "power2.out");
to(K.cam, { z: 96 }, S12, s.s12.dur, "none");
// the dive into the eye
const EYEIN = s.s13.start - 0.12;
to(M.face, { s: 5, ex: 960, ey: 480 }, EYEIN - 0.4, 0.4, "power3.in");
blurMicro(EYEIN - 0.25, 0.5, 0, 0.01);
to(M.wisp, { a: 0 }, EYEIN - 0.4, 0.3);
to(K, { vis: 0 }, EYEIN - 0.4, 0.25);
set(M.a, { face: 0, wisp: 0 }, EYEIN);

// ── s13: on your eye, it sets off the nerves that sense pain ──────────────
film.tintTo("#7cc4ff", EYEIN, 0.6);
set(M.eye, { z: 1.8, ox: 960, oy: 420 }, EYEIN);
set(M.a, { eye: 1 }, EYEIN);
to(M.eye, { z: 1 }, EYEIN, 0.75, "expo.out");
chip("#c-surface", s.s13.start + 0.25, s.s14b.start - 0.5);
{
  // gas molecules land on the nerve endings one after another, from "sets off"
  const order = [3, 2, 4, 1, 5, 0, 6];
  const nx = [180, 430, 690, 960, 1230, 1490, 1740];
  const first = said("s13", "sets") - 0.02;
  M.eye.mols = order.map((i, k) => ({ x: nx[i], at: first + k * 0.3 - 0.7 }));
  order.forEach((i, k) => {
    const land = first + k * 0.3;
    set(M.eye.fire, { [i]: 1 }, land);
    to(M.eye.run, { [i]: 1 }, land, 0.9, "power1.in");
    set(M.eye.run, { [i]: 0 }, land + 0.95);
    to(M.eye.run, { [i]: 1 }, land + 0.95, 0.9, "power1.in");
  });
}
chip("#c-pain", said("s13", "pain."), s.s14b.start - 0.45);
film.tintTo(COL.nerve, said("s13", "sets"), 0.8);

// ── s14b: the signal in to the brain, and out to the tear gland ───────────
const HEAD = s.s14b.start - 0.1;
to(M.eye, { z: 0.35, ox: 620, oy: 470 }, HEAD - 0.3, 0.3, "power3.in");
set(M.a, { eye: 0, head: 1 }, HEAD);
set(M.head, { z: 2.6 }, HEAD);
to(M.head, { z: 1 }, HEAD, 0.7, "expo.out");
to(M.head, { inK: 1 }, said("s14b", "they") + 0.05, said("s14b", "brain,") + 0.05 - said("s14b", "they"), "power1.inOut");
to(M.head, { stem: 1 }, said("s14b", "brain,"), 0.3, "power2.out");
chip("#c-brain", said("s14b", "brain,"), s.s16.start - 0.45);
to(M.head, { inA: 0.45, stem: 0.4 }, said("s14b", "tells") - 0.1, 0.4);
to(M.head, { outK: 1 }, said("s14b", "tells") - 0.05, said("s14b", "glands") - said("s14b", "tells") + 0.05, "power1.inOut");
to(M.head, { gland: 1 }, said("s14b", "glands"), 0.3, "power2.out");
chip("#c-gland", said("s14b", "glands"), s.s16.start - 0.45);
film.tintTo(COL.tear, said("s14b", "tells"), 0.8);
to(M.head, { tear: 1.7 }, said("s14b", "flush") - 0.1, s.s16.start - said("s14b", "flush") + 0.1, "power1.in");

// ── s16: those tears aren't sadness ───────────────────────────────────────
const S16 = s.s16.start;
to(M.head, { z: 1.25 }, S16 - 0.3, 0.25, "power3.in");
set(M.a, { head: 0, face: 1 }, S16 - 0.06);
set(M.face, { s: 1.75, ex: 1180, ey: 400, squint: 0.6, ring: 0, tear: 0.15 }, S16 - 0.06);
to(M.face, { tear: 1.45, s: 1.85 }, S16 - 0.1, s.s16.dur + 0.1, "none");
film.scene("#sad", S16, s.s17.start - 0.4);
film.pop("#sadword", S16 + 0.1);
tl.to("#strike", { scaleX: 1, duration: 0.3, ease: "power2.out" }, said("s16", "aren't"));
tl.to("#sadword", { opacity: 0.45, duration: 0.4 }, said("s16", "sadness.") + 0.2);

// ── s17: your eye washing itself ──────────────────────────────────────────
const WASH = s.s17.start - 0.15;
to(M.face, { s: 5, ex: 960, ey: 480 }, WASH - 0.3, 0.3, "power3.in");
blurMicro(WASH - 0.2, 0.4, 0, 0.01);
set(M.a, { face: 0 }, WASH);
// the same surface: every molecule landed, the nerves still firing
set(M.eye, { z: 1.6, ox: 960, oy: 420, wash: 0, molA: 1 }, WASH);
set(M.eye.fire, { 0: 0.8, 1: 0.8, 2: 0.8, 3: 0.8, 4: 0.8, 5: 0.8, 6: 0.8 }, WASH);
set(M.eye.run, { 0: 0.2, 1: 0.5, 2: 0.8, 3: 0.35, 4: 0.6, 5: 0.1, 6: 0.7 }, WASH);
set(M.a, { eye: 1 }, WASH);
to(M.eye, { z: 1 }, WASH, 0.6, "expo.out");
to(M.eye.run, { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 }, WASH, 0.9, "none");
to(M.eye, { wash: 1 }, said("s17", "washing") - 0.25, 1.3, "power1.inOut");
to(M.eye.fire, { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }, said("s17", "washing"), 1.0, "power1.inOut");
chip("#c-washed", said("s17", "itself.") - 0.1, s.s18.start - 0.5);

// ── s18: and that's where your knife comes in ─────────────────────────────
const KN = s.s18.start - 0.12;
to(M.dy, { eye: -900 }, KN - 0.3, 0.3, "power3.in");
set(M.a, { eye: 0, knife: 1 }, KN);
set(M.dy, { knife: 760 }, KN);
to(M.dy, { knife: 0 }, KN, 0.5, "expo.out");
blurMicro(KN - 0.26, 0.56, 0, 50);
tl.to(stage, { camy: "+=3", duration: 0.6, ease: "power3.inOut" }, KN - 0.3);
film.tintTo("#d8e4ff", KN, 0.6);
film.scene("#knifetest", KN, s.s21.start + 0.3);
set(M.knife.sharp, { tipY: 380 }, KN);
set(M.knife.blunt, { tipY: 380 }, KN);
chip("#c-sharp", s.s18.start + 0.2, s.s20.start + 0.4);
chip("#c-blunt", s.s18.start + 0.3, s.s20.start + 0.4);
film.show("#n-scale", s.s18.start + 0.5, 0.35);
film.hide("#n-scale", s.s20.start + 0.3, 0.25);
film.land("#t-sharp", said("s18", "knife") - 0.05);
film.land("#t-blunt", said("s18", "knife") + 0.1);
film.hide("#t-sharp, #t-blunt", s.s20.start + 0.3, 0.25);

// ── s19: a blunt blade squashes the onion before it splits ────────────────
const PRESS = s.s19.start + 0.05;
const SPLIT = said("s19", "splits.") - 0.04;
// same push for both: the sharp tip goes through at once, the blunt one dents the skin until it gives
to(M.knife.sharp, { tipY: 566 }, PRESS, 0.35, "power1.in");
to(M.knife.sharp, { dent: 6 }, PRESS + 0.3, 0.06, "none");
set(M.knife.sharp, { broke: 1, dent: 0 }, PRESS + 0.37);
to(M.knife.sharp, { spray: 0.55 }, PRESS + 0.37, 0.55, "none");
to(M.knife.sharp, { tipY: 760 }, PRESS + 0.37, 1.6, "power1.out");
to(M.knife.blunt, { tipY: 560 }, PRESS, 0.35, "power1.in");
to(M.knife.blunt, { tipY: 650, dent: 90, press: 1 }, PRESS + 0.35, SPLIT - PRESS - 0.35, "power1.in");
chip("#c-squash", said("s19", "squashes"), s.s20.start);
set(M.knife.blunt, { broke: 1 }, SPLIT);
to(M.knife.blunt, { dent: 0, press: 0 }, SPLIT, 0.16, "power2.out");
to(M.knife.blunt, { tipY: 760 }, SPLIT, 0.5, "power2.out");
to(M.knife.blunt, { spray: 0.55 }, SPLIT, 0.55, "none");
tl.set(stage, { pr: 0, ps: 0.3 }, SPLIT);
tl.to(stage, { pr: 1.7, ps: 0, duration: 1.1, ease: "power2.out" }, SPLIT + 0.02);

// ── s20: up to forty times more droplets ──────────────────────────────────
to(M.knife, { bladeA: 0, layerA: 0.35 }, said("s20", "test,") - 0.1, 0.5, "power1.inOut");
to(M.knife, { bars: 1 }, said("s20", "sprayed") - 0.05, 0.75, "power2.out");
to(M.knife, { dropA: 0.25 }, said("s20", "sprayed"), 0.6);
film.show("#b-cap", said("s20", "in") + 0.05, 0.35);
film.show("#n-source", said("s20", "in") + 0.2, 0.35);
film.pop("#b-one", said("s20", "sprayed") + 0.5);
film.pop("#b-forty", said("s20", "forty") - 0.03);
tl.to("#knifetest", { scale: 1.03, duration: s.s20.dur, ease: "none", transformOrigin: "50% 50%" }, s.s20.start);

// ── s21: the recap ────────────────────────────────────────────────────────
const RC = s.s21.start - 0.1;
to(M.dy, { knife: 900 }, RC - 0.3, 0.35, "power3.in");
tl.to("#knifetest", { y: 1150, duration: 0.35, ease: "power3.in" }, RC - 0.3);
set(M.a, { knife: 0 }, RC + 0.06);
blurMicro(RC - 0.25, 0.5, 0, 40);
film.tintTo(COL.gas, RC, 0.8);
film.scene("#recap", RC, s.s22.start + 0.4);
const cards = $$(".rcard");
gsap.set(cards, { opacity: 0, y: 120, scale: 0.92 });
tl.to(cards, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "expo.out", stagger: 0.18 }, RC + 0.02);
tl.to("#recap", { scale: 1.03, duration: s.s21.dur + 0.4, ease: "none" }, RC);
tl.to(cards, { y: -700, duration: 0.3, ease: "power3.in", stagger: 0.03 }, s.s22.start - 0.32);

// ── s22, s23: the poster ──────────────────────────────────────────────────
const PO = s.s22.start - 0.05;
set(K, { vis: 0, front: 1, whole: 0, board: 1, sun: 3 }, PO);
set(K.onion, { vis: 1, x: 25, y: 0, z: 0, s: 1.05, turn: 0.32 }, PO);
set(K.boardPos, { x: 52, y: BOARD_Y - 0.6, z: 0 }, PO);
set(K.cam, { x: 0, y: 14, z: 104, tx: 2, ty: -2, tz: 0 }, PO);
set(K.knife, { vis: 1, x: 30, y: -12.1, z: 18, rx: -Math.PI / 2, ry: Math.PI + 0.18, rz: 0 }, PO);
to(K.cam, { z: 98 }, PO, D - PO, "none");
tl.fromTo(K, { vis: 0 }, { vis: 1, duration: 0.3, ease: "power1.out", immediateRender: false }, PO + 0.05);
film.tintTo("#ffb36b", PO, 0.8);
set(M.wisp, { a: 0.7, x0: 1350, y0: 560, x1: 1380, y1: 80, bend: 50, life: 2.6, rate: 0.5, spread: 140, scale: 0.9, t0: PO - 2 }, PO);
set(M.a, { wisp: 1 }, PO);
to(M.wisp, { a: 0 }, s.s23.start - 0.8, 1.2, "power1.inOut");
film.scene("#poster", PO, D);
film.typeIn(film.split("#p1"), PO + 0.1, { stagger: 0.018 });
film.land("#p2", said("s22", "sharp:") - 0.05);
film.sheen("#p1", said("s22", "tears.") + 0.3, 1.1);
tl.to(stage, { glow: 0.9, duration: 1.5, ease: "sine.inOut" }, s.s23.start);

film.finish();
