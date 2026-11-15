// "Kenapa HP makin lemot pas memorinya hampir penuh?" The film is cut to one take of narration: storyboard.json holds
// the shot times the take gave, voice/voice.json the time of every word, and pictures arrive on their words.
// grid.json (written by storyboard.build.py) holds the grid's layout and states, the same ones the board draws;
// its bars come from sim.py, a toy flash, not from the eye.
import { createFilm } from "../../kit/engine/motion.js";
import { CYAN, RED, REST, createGrid, createScreen, createSpace } from "./hp.js";

const storyboard = await (await fetch("storyboard.json")).json();
const G = await (await fetch("grid.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, $$, stage, shots: s, voiced } = film;
const D = storyboard.duration;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
// The stage's red: deep, so the warning reads without washing the frame pink.
const DRED = "#9e1f33";
// When a word of a shot's line is said, in the film's time.
const said = (id, word, nth = 0) => {
  const hits = (voiced[id]?.words ?? []).filter(([, , text]) => text.toLowerCase().replace(/[^a-z-]/g, "") === word);
  if (!hits[nth]) throw new Error(`the take has no "${word}" in ${id}`);
  return hits[nth][0];
};
await Promise.all(['600 40px "Sora Variable"', '700 40px "Sora Variable"', '500 30px "Inter Variable"', '600 30px "Inter Variable"'].map((f) => document.fonts.load(f)));

// ── The layers ───────────────────────────────────────────────────────────────
const gridCanvas = $("#grid");
const grid = createGrid(gridCanvas, G);
const screen = createScreen();
// The chip's face is the grid itself: the same pixels, cut from the grid canvas around the blocks.
const FACE = { x: 57, y: 369, size: 880 };
const face = Object.assign(document.createElement("canvas"), { width: 880, height: 880 });
const faceG = face.getContext("2d");
const space = await createSpace($("#space"), screen.canvas, face);

// The phone's screen state, the 3D state, the grid's camera, the storage strip.
const SCR = { used: 0.91, warn: 0, rows: 0, temp: 0, tiles: 0, full: 0, marker: 0, saving: 1, saved: 0, dim: 0 };
const PHONE = { x: 497, y: 800 };
const V = { phone: 1, px: PHONE.x, py: PHONE.y, pz: 0, prx: 0.05, pry: -0.3, prz: 0.02, ps: 1.08, chip: 0, cx: 497, cy: 809, crx: -1.05, cry: 0, crz: 0.42, board: 1, fill: 0, rimColour: CYAN };
const CAM = { ...REST, focus: 0, focusOn: 0 };
const L = { grid: 0, space: 1, hud: 0, fill: 0.55, red: 0 };
const CLOSE = { x: 219, y: 526, z: 3.2 }; // block 0 filling the frame
const hudFill = $("#hud-fill");
const nMoved = $("#n-moved");
const nErased = $("#n-erased");

// ── The grid's story, as timed changes ───────────────────────────────────────
const D2 = grid.D;
D2.bases.push({ t: -1, state: G.half });
const page = (b, p) => grid.centre(b, p);
const ev = (t, b, p, st) => D2.events.push({ t, b, p, s: st });
const PAGE = G.PAGE;

// s02: the chip lights up block by block as it turns to face us.
const REVEAL = said("s02", "dalam");
D2.reveal = { t0: REVEAL, step: 0.13 };
// s03: the pages of block 0 are counted, one after another.
D2.pings.push({ b: 0, t: said("s03", "banyak") - 0.1, step: 0.045 });
D2.spareLabel.push({ t0: s.s03.start, t1: said("s07", "mindahin") });
// s04: new data, one page.
const T4 = said("s04", "halaman") + 0.02;
{
  const [x, y] = page(0, 6);
  D2.flyers.push({ kind: "live", from: [x, y - 230], to: [x, y], t0: T4 - 0.42, t1: T4, s0: PAGE * 0.9, s1: PAGE, ease: "in" });
  ev(T4, 0, 6, 1);
}
// s04b: a changed copy of page 2 is refused, goes to page 7; page 2 is old now.
const HIT = said("s04b", "ditimpa") + 0.06;
const LAND7 = Math.min(HIT + 0.62, s.s05.start - 0.05);
D2.bounces.push({ b: 0, p: 2, t0: said("s04b", "terisi") - 0.05, hit: HIT, t1: HIT + 0.24, t2: HIT + 0.75 });
{
  const [x2, y2] = grid.at(0, 2);
  const [x7, y7] = page(0, 7);
  D2.flyers.push({ kind: "live", from: [x2 + PAGE / 2, y2 - 46 + PAGE / 2], to: [x7, y7], t0: HIT + 0.24, t1: LAND7, s0: PAGE * 0.86, s1: PAGE, arc: 40 });
  ev(LAND7, 0, 7, 1);
  ev(LAND7, 0, 2, 2);
}
// s05: block 2 (old data only) is erased in one go.
const ERASE2 = said("s05", "blok") + 0.02;
D2.frames.push({ b: 2, t0: said("s05", "dihapus"), t1: ERASE2 + 0.35, colour: RED });
D2.sweeps.push({ b: 2, t: ERASE2 });
for (let p = 0; p < 16; p++) ev(ERASE2, 2, p, 0);
// s06: the storage fills: every page that differs from the full state changes, in a ripple from the top left.
const FILL0 = said("s06", "nah") + 0.15;
const FILL1 = said("s06", "penuh") + 0.2;
{
  const after = G.afterErase;
  const changes = [];
  for (let b = 0; b < 6; b++) for (let p = 0; p < 16; p++) if (after[b][p] !== G.full[b][p]) changes.push([b, p]);
  const key = ([b, p]) => {
    const [x, y] = grid.at(b, p);
    return x * 0.6 + y + ((b * 37 + p * 11) % 13) * 9;
  };
  changes.sort((a, b2) => key(a) - key(b2));
  changes.forEach(([b, p], i) => ev(FILL0 + ((FILL1 - FILL0) * i) / Math.max(1, changes.length - 1), b, p, G.full[b][p]));
}
// s07: a photo arrives, finds no empty page; the controller copies block 4's pages in use to the spare block.
const PHOTO_AT = [800, 300];
const PHOTO_W = 180;
const FOTO = said("s07", "foto");
const COPY0 = said("s07", "mindahin") - 0.05;
const STEP = Math.min(0.17, (s.s08.start - 0.25 - COPY0) / G.moved.length);
const FLY = 0.36;
const arrivals = [];
G.moved.forEach((p, i) => {
  const t0 = COPY0 + i * STEP;
  D2.flyers.push({ kind: "live", from: page(G.victim, p), to: page(6, i), t0, t1: t0 + FLY, s0: PAGE, s1: PAGE, arc: 70 });
  ev(t0, G.victim, p, 2);
  ev(t0 + FLY, 6, i, 1);
  arrivals.push(t0 + FLY);
});
D2.scans.push({ t0: FOTO + 0.05, t1: said("s07", "hape") + 0.15 });
D2.frames.push({ b: G.victim, t0: said("s07", "harus") - 0.1, t1: said("s08", "dihapus") + 0.35, colour: RED });
// s08: block 4 is erased; only then does the photo go in.
const ERASE4 = said("s08", "dihapus") + 0.02;
D2.sweeps.push({ b: G.victim, t: ERASE4 });
for (let p = 0; p < 16; p++) ev(ERASE4, G.victim, p, 0);
const PHOTO_GO = said("s08", "fotonya") - 0.08;
const PHOTO_IN = said("s08", "masuk") + 0.02;
D2.flyers.push({ kind: "photo", from: [PHOTO_AT[0], PHOTO_AT[1] - 140], to: PHOTO_AT, t0: FOTO - 0.4, t1: FOTO, s0: PHOTO_W, s1: PHOTO_W, ease: "out", hold: PHOTO_GO - FOTO, spin: [FOTO + 0.2, PHOTO_GO] });
D2.flyers.push({ kind: "photo", from: PHOTO_AT, to: page(6, 11), t0: PHOTO_GO, t1: PHOTO_IN, s0: PHOTO_W, s1: PAGE * 1.25, arc: 30 });
ev(PHOTO_IN, 6, 11, 1);
D2.ctrl.push({ t0: s.s07.start + 0.15, t1: s.s09.start, busy: [said("s07", "hape") - 0.05, ERASE4 + 0.2] });
// s11: room to spare: the same photo lands at once.
D2.bases.push({ t: s.s11.start, state: G.roomy });
const [LB, LP] = G.landRoomy;
const DROP0 = said("s11", "langsung") - 0.12;
const DROP1 = said("s11", "masuk") + 0.02;
D2.flyers.push({ kind: "photo", from: [PHOTO_AT[0], PHOTO_AT[1] - 120], to: PHOTO_AT, t0: s.s11.start, t1: s.s11.start + 0.3, s0: PHOTO_W, s1: PHOTO_W, ease: "out", hold: DROP0 - s.s11.start - 0.3 });
D2.flyers.push({ kind: "photo", from: PHOTO_AT, to: page(LB, LP), t0: DROP0, t1: DROP1, s0: PHOTO_W, s1: PAGE * 1.25, ease: "in" });
ev(DROP1, LB, LP, 1);
D2.ctrl.push({ t0: s.s11.start, t1: s.s12.start });
D2.events.sort((a, b) => a.t - b.t);

// ── Every frame ──────────────────────────────────────────────────────────────
film.each((t) => {
  // The grid and the chip's face.
  grid.draw(t, CAM, 1);
  gridCanvas.style.opacity = L.grid.toFixed(3);
  if (V.chip > 0.001) {
    faceG.clearRect(0, 0, 880, 880);
    faceG.drawImage(gridCanvas, FACE.x, FACE.y, FACE.size, FACE.size, 0, 0, 880, 880);
  }
  // The phone's screen.
  if (V.phone > 0.001) screen.draw({ t, ...SCR, red: SCR.used >= 0.95 ? 1 : 0 });
  space.render(V);
  $("#space").style.opacity = L.space.toFixed(3);
  // The strip: its width is its value; red when nearly full.
  hudFill.style.width = `${(L.fill * 100).toFixed(2)}%`;
  hudFill.style.background = L.red > 0.5 ? `linear-gradient(90deg, #a3142a, ${RED})` : `linear-gradient(90deg, #0b8fb3, ${CYAN})`;
  hudFill.style.boxShadow = `0 0 18px ${L.red > 0.5 ? RED : CYAN}`;
  // The counter: what has really happened so far.
  const moved = t < s.s11.start ? arrivals.filter((a) => a <= t).length : 0;
  const erased = t < s.s11.start && t >= ERASE4 ? 1 : 0;
  if (nMoved.textContent !== `${moved}`) nMoved.textContent = `${moved}`;
  if (nErased.textContent !== `${erased}`) nErased.textContent = `${erased}`;
});

// ── Helpers ──────────────────────────────────────────────────────────────────
const lightAt = (x, y, glow, at, d = 0.6) => film.light({ lx: x / 1080, ly: 1 - y / 1920, glow }, at, d);
const hit = (at, x, y, strength, ring) => {
  tl.set(stage, { lx: x / 1080, ly: 1 - y / 1920, pr: 0, ps: ring }, at);
  tl.to(stage, { pr: 1.7, ps: 0, duration: 1.1, ease: "power2.out" }, at + 0.02);
  tl.set("#flash", { "--fx": `${(x / 1080) * 100}%`, "--fy": `${(y / 1920) * 100}%`, opacity: strength * 0.5 }, at);
  tl.to("#flash", { opacity: 0, duration: 0.36, ease: "power2.out" }, at + 0.04);
};
const slam = (lines, at, stagger = 0.16) => {
  gsap.set(lines, { scale: 1.4, opacity: 0, filter: "blur(16px)" });
  tl.to(lines, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.45, ease: "expo.out", stagger }, at);
};
const chipIn = (sel, at, out) => {
  gsap.set(sel, { autoAlpha: 0 });
  tl.set(sel, { autoAlpha: 1 }, at);
  tl.fromTo(sel, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.42, ease: "back.out(2)", immediateRender: false }, at);
  if (out) tl.to(sel, { autoAlpha: 0, y: -12, duration: 0.18, ease: "power2.in" }, out - 0.18);
};
// Hard cuts of the counter's figures: a small pulse each time one changes.
const bump = (sel, at) => {
  tl.fromTo(sel, { scale: 1.35, color: "#ffffff" }, { scale: 1, color: "#ededf0", duration: 0.3, ease: "power2.out", immediateRender: false }, at);
};

film.captions();
gsap.set(["#space"], { opacity: 1 });
Object.assign(stage, { lx: 0.46, ly: 0.62, glow: 0.55, floor: 1, silk: 0.7 });

// ── s01: the phone fills up ──────────────────────────────────────────────────
// Frame 0 is finished: the phone is there, its bar at 91% and climbing, the photo trying to save.
const LEMOT = said("s01", "lemot");
tl.to(SCR, { used: 0.97, duration: LEMOT - 0.05, ease: "power1.inOut" }, 0);
tl.to(SCR, { warn: 1, duration: 0.3, ease: "back.out(2)" }, LEMOT + 0.05);
tl.to(V, { pry: -0.12, prx: 0.02, ps: 1.11, duration: s.s02.start - 0.4, ease: "sine.inOut" }, 0);
film.tintTo(DRED, LEMOT, 0.5);
lightAt(497, 700, 0.7, 0, 0.01);
tl.to(stage, { glow: 0.85, duration: 0.3 }, LEMOT);
tl.to(stage, { glow: 0.6, duration: 0.8 }, LEMOT + 0.35);
// The dive: the phone rushes at the lens, a soft flash, and we are at the chip.
const DIVE = s.s02.start;
tl.to(V, { pz: 70, ps: 1.1, pry: 0, prx: 0, duration: 0.42, ease: "power3.in" }, DIVE - 0.42);
tl.to(V, { phone: 0, duration: 0.12, ease: "none" }, DIVE - 0.1);
hit(DIVE, 497, 800, 0.55, 0.3);

// ── s02: the chip ────────────────────────────────────────────────────────────
tl.set(V, { chip: 1 }, DIVE - 0.02);
film.tintTo(CYAN, DIVE, 0.4);
const FACED = said("s02", "blok-blok") + 0.35;
tl.fromTo(V, { crx: -1.05, crz: 0.42 }, { crx: 0, crz: 0, duration: FACED - DIVE, ease: "expo.out", immediateRender: false }, DIVE);
tl.fromTo(V, { fill: 0 }, { fill: 3, duration: 0.6, immediateRender: false }, DIVE);
lightAt(497, 809, 0.75, DIVE, 0.4);
// The hand-over: the face is the grid at the same pixels, so the flat grid comes in as the 3D layer leaves.
tl.to(V, { board: 0, duration: 0.5 }, s.s03.start - 0.6);
tl.set(L, { grid: 1 }, s.s03.start - 0.12);
tl.to(V, { chip: 0, duration: 0.12, ease: "none" }, s.s03.start - 0.12);
tl.set(V, { fill: 0 }, s.s03.start);

// ── s03: a block, and its pages ──────────────────────────────────────────────
film.scene("#s03", s.s03.start, s.s04.start + 0.1);
film.land("#br-blok", said("s03", "blok") - 0.05, { from: 14, duration: 0.4 });
chipIn("#chip-halaman", said("s03", "halaman") - 0.05);
film.draw("#lead-halaman path", said("s03", "halaman"), 0.3);
film.land("#note-ratusan", said("s03", "kecil"), { from: 12, duration: 0.45 });
tl.to(CAM, { z: 1.03, duration: s.s03.dur, ease: "none" }, s.s03.start);
lightAt(219, 560, 0.6, s.s03.start, 0.8);
tl.to("#s03", { opacity: 0, duration: 0.18 }, s.s04.start - 0.1);

// ── s04: written a page at a time ────────────────────────────────────────────
film.scene("#s04", s.s04.start, s.s06.start);
tl.to(CAM, { ...CLOSE, focus: 1, duration: 0.6, ease: "power3.inOut" }, s.s04.start - 0.1);
tl.to(CAM, { z: CLOSE.z * 1.03, duration: s.s05.start - s.s04.start - 0.8, ease: "none" }, s.s04.start + 0.5);
chipIn("#chip-tulis", T4 + 0.02, said("s04b", "terisi"));
lightAt(497, 760, 0.7, s.s04.start, 0.6);

// ── s04b: but never over a full page ─────────────────────────────────────────
chipIn("#chip-timpa", HIT, LAND7);
tl.set(stage, { flash: 0.4 }, HIT);
film.tintTo(DRED, HIT, 0.08);
film.tintTo(CYAN, HIT + 0.45, 0.4);
chipIn("#chip-lama", LAND7, said("s05", "dulu") + 0.2);

// ── s05: erased a block at a time ────────────────────────────────────────────
tl.to(CAM, { ...REST, focus: 0, duration: 0.55, ease: "power3.inOut" }, s.s05.start - 0.05);
chipIn("#chip-hapus", ERASE2 - 0.05, s.s06.start - 0.12);
lightAt(775, 526, 0.65, said("s05", "dihapus"), 0.6);
tl.to(stage, { glow: 1.0, duration: 0.06 }, ERASE2);
tl.to(stage, { glow: 0.6, duration: 0.7 }, ERASE2 + 0.1);

// ── s06: nearly full, no empty page left ─────────────────────────────────────
film.scene("#s06", s.s06.start, s.s09.start);
film.scene("#hud", s.s06.start, s.s09.start);
gsap.set("#hud", { opacity: 0 });
tl.to("#hud", { opacity: 1, duration: 0.3 }, s.s06.start);
gsap.set("#hud-full, #hud-roomy", { autoAlpha: 0 });
tl.set(L, { fill: 0.55, red: 0 }, s.s06.start - 0.05);
tl.to(L, { fill: 0.97, duration: FILL1 - FILL0, ease: "power1.in" }, FILL0);
const PENUH = said("s06", "penuh");
tl.set(L, { red: 1 }, PENUH);
tl.set("#hud-full", { autoAlpha: 1 }, PENUH);
tl.fromTo("#hud-full", { scale: 1.3 }, { scale: 1, duration: 0.35, ease: "back.out(2)", transformOrigin: "0% 50%", immediateRender: false }, PENUH);
film.tintTo(DRED, PENUH, 0.5);
tl.to(stage, { glow: 0.5, duration: 0.6 }, PENUH + 0.3);
lightAt(497, 660, 0.75, FILL0, 1.0);
chipIn("#chip-nol", said("s06", "habis") - 0.05, s.s07.start + 0.5);

// ── s07: the photo, and the extra work ───────────────────────────────────────
gsap.set("#counter", { autoAlpha: 0 });
tl.set("#counter", { visibility: "visible" }, s.s07.start + 0.5);
film.land("#counter", s.s07.start + 0.5, { from: 24, duration: 0.45 });
lightAt(497, 1080, 0.6, said("s07", "hape"), 0.5);
arrivals.forEach((a) => bump("#n-moved", a));
tl.to(stage, { lx: 0.46, ly: 1 - 1090 / 1920, glow: 0.7, duration: 1.6, ease: "none" }, COPY0);

// ── s08: erase, then the photo goes in ───────────────────────────────────────
lightAt(497, 804, 0.8, ERASE4 - 0.15, 0.25);
tl.to(stage, { glow: 1.05, duration: 0.06 }, ERASE4);
tl.to(stage, { glow: 0.6, duration: 0.7 }, ERASE4 + 0.1);
bump("#n-erased", ERASE4);
chipIn("#chip-masuk", PHOTO_IN + 0.05, s.s09.start);
tl.to(stage, { lx: 0.46, ly: 1 - 1090 / 1920, duration: 0.4 }, PHOTO_IN - 0.2);
hit(PHOTO_IN, 497, 1090, 0.25, 0.25);

// ── s09: the fuller, the more is written ─────────────────────────────────────
// The grid steps back as the chart comes up in front of it.
tl.to(CAM, { z: 0.86, duration: 0.3, ease: "power2.in" }, s.s09.start - 0.32);
tl.to(L, { grid: 0, duration: 0.25 }, s.s09.start - 0.3);
tl.to("#hud", { opacity: 0, duration: 0.2 }, s.s09.start - 0.3);
tl.to("#s06", { opacity: 0, duration: 0.2 }, s.s09.start - 0.3);
film.scene("#s09", s.s09.start - 0.15, s.s10.start);
film.land("#chart", s.s09.start - 0.15, { from: 60, duration: 0.45 });
{
  // Each bar is its value times 150 px: the toy flash's pages written for one page asked for.
  const KEYS = ["60", "80", "90", "97"];
  const PX = 175;
  const BASE = 760; // the baseline inside .bars
  const bars = $("#bars");
  $("#ref").style.top = `${BASE - PX * 1}px`;
  const lands = [said("s09", "makin") - 0.05, said("s09", "penuh") + 0.1, said("s09", "makin", 1) - 0.05, said("s09", "sering") + 0.05];
  KEYS.forEach((k, i) => {
    const v = G.sim.wa[k];
    const h = v * PX;
    const red = i >= 2;
    const el = document.createElement("div");
    el.className = "bar";
    el.style.left = `${i * 195}px`;
    el.style.height = `${h}px`;
    el.style.bottom = `${760 - BASE}px`;
    el.innerHTML = `<div class="col" style="height:${h}px;background:linear-gradient(180deg, ${red ? "#ff8a99" : "#b8fbff"}, ${red ? RED : CYAN} 40%, ${red ? "#7a1020" : "#0b6f8c"});box-shadow:0 0 30px -4px ${red ? RED : CYAN}"></div><b class="val" style="bottom:${h + 18}px">${G.sim.text[k]}</b><span class="pct">${k}%</span>`;
    bars.append(el);
    gsap.set(el, { scaleY: 0, opacity: 0 });
    const val = el.querySelector(".val");
    gsap.set(val, { opacity: 0 });
    tl.set(el, { opacity: 1 }, lands[i]);
    tl.to(el, { scaleY: 1, duration: 0.42, ease: "expo.out" }, lands[i]);
    tl.to(val, { opacity: 1, duration: 0.2 }, lands[i] + 0.25);
  });
  const LEMOT2 = said("s09", "lemot");
  const last = bars.lastElementChild;
  tl.to(last, { scale: 1.06, duration: 0.14, ease: "power2.out", transformOrigin: "50% 100%" }, LEMOT2);
  tl.to(last, { scale: 1, duration: 0.4, ease: "power2.inOut" }, LEMOT2 + 0.14);
  hit(LEMOT2, 64 + 60 + 3 * 195 + 75, 300 + BASE - G.sim.wa["97"] * PX, 0.3, 0.3);
}
lightAt(700, 760, 0.65, s.s09.start, 0.8);

// ── s10: no room for temporary files ─────────────────────────────────────────
tl.set(V, { phone: 1, chip: 0, pz: 0, ps: 1.08, prx: 0.04, pry: 0.2, prz: -0.02 }, s.s10.start);
tl.set(SCR, { used: 0.97, warn: 0, saving: 0, saved: 0, rows: 0 }, s.s10.start);
tl.to(V, { pry: 0.1, duration: s.s10.dur, ease: "sine.out" }, s.s10.start);
tl.to(SCR, { rows: 1, duration: 0.7, ease: "none" }, s.s10.start + 0.05);
tl.to(SCR, { temp: 1, duration: 0.9, ease: "power2.inOut" }, said("s10", "file") - 0.3);
tl.to(SCR, { tiles: 1.6, duration: 1.3, ease: "none" }, said("s10", "ruang") - 0.1);
tl.to(SCR, { full: 1, duration: 0.25, ease: "back.out(2)" }, said("s10", "sempit") - 0.05);
tl.to("#chart", { opacity: 0, y: -40, duration: 0.2, ease: "power2.in" }, s.s10.start - 0.2);
lightAt(497, 760, 0.6, s.s10.start, 0.01);

// ── s11: with room, the same photo goes straight in ──────────────────────────
tl.set(V, { phone: 0 }, s.s11.start);
tl.set(CAM, { ...REST, focus: 0 }, s.s11.start);
tl.set(L, { grid: 1, fill: 0.55, red: 0 }, s.s11.start);
film.scene("#s06", s.s11.start, s.s12.start);
film.scene("#hud", s.s11.start, s.s12.start);
tl.set("#hud", { opacity: 1 }, s.s11.start);
tl.set("#s06", { opacity: 1 }, s.s11.start);
tl.set("#hud-full", { autoAlpha: 0 }, s.s11.start);
tl.set("#hud-roomy", { autoAlpha: 1 }, s.s11.start);
tl.set("#chip-nol, #chip-masuk", { autoAlpha: 0 }, s.s11.start);
tl.set("#counter", { autoAlpha: 1, y: 0, opacity: 1 }, s.s11.start);
film.tintTo(CYAN, s.s11.start, 0.3);
tl.to(CAM, { z: 1.03, duration: s.s11.dur, ease: "none" }, s.s11.start);
chipIn("#chip-langsung", DROP1 + 0.04);
hit(DROP1, 219, 526, 0.35, 0.3);
lightAt(219, 560, 0.7, DROP0, 0.3);

// ── s12: keep some room ──────────────────────────────────────────────────────
tl.set(L, { grid: 0 }, s.s12.start);
tl.set(V, { phone: 1, pz: 0, ps: 1.08, prx: 0.03, pry: -0.22, prz: 0.02 }, s.s12.start);
tl.set(SCR, { used: 0.97, warn: 1, rows: 0, temp: 0, tiles: 0, full: 0, saving: 1, saved: 0 }, s.s12.start);
tl.to(V, { pry: -0.08, ps: 1.11, duration: s.s12.dur, ease: "sine.inOut" }, s.s12.start);
const SISA = said("s12", "sisakan");
tl.to(SCR, { used: 0.8, duration: 1.0, ease: "power2.inOut" }, SISA - 0.05);
tl.to(SCR, { warn: 0, duration: 0.25 }, SISA + 0.5);
tl.to(SCR, { marker: 1, duration: 0.35, ease: "power2.out" }, said("s12", "sepuluh") - 0.1);
tl.set(SCR, { saving: 0, saved: 1 }, said("s12", "ngebut") - 0.05);
lightAt(497, 700, 0.75, s.s12.start, 0.01);
tl.to(stage, { glow: 0.95, duration: 0.2 }, said("s12", "ngebut"));
tl.to(stage, { glow: 0.65, duration: 0.8 }, said("s12", "ngebut") + 0.25);

// ── s13: the recap, and the line to remember ─────────────────────────────────
{
  const g = $("#rc1-pages");
  let html = "";
  for (let i = 0; i < 16; i++) {
    const x = 38 + (i % 4) * 32;
    const y = 38 + Math.floor(i / 4) * 32;
    html += `<rect x="${x}" y="${y}" width="26" height="26" rx="5" fill="${i === 5 ? CYAN : i < 9 ? "#1f7f93" : "rgb(150 220 235 / 0.16)"}" />`;
  }
  g.innerHTML = html;
}
film.scene("#s13", s.s13.start - 0.14, D);
tl.to(V, { phone: 0, pz: -20, duration: 0.3, ease: "power2.in" }, s.s13.start - 0.36);
tl.to(SCR, { dim: 0.4, duration: 0.3 }, s.s13.start - 0.36);
["#rc1", "#rc2", "#rc3"].forEach((card, i) => film.land(card, s.s13.start - 0.14 + i * 0.12, { from: 70, duration: 0.45 }));
for (const line of $$("#poster .ln")) film.split(line);
slam("#poster .ln", s.s13.start + 0.4, 0.2);
hit(s.s13.start + 0.4, 497, 1080, 0.25, 0.3);
film.sheen("#poster", s.s13.start + 1.1, 0.8);
lightAt(497, 1060, 0.7, s.s13.start - 0.2, 0.6);

film.finish();
