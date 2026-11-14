// "Kenapa petir terlihat dulu, baru guntur terdengar?" The film is cut to one take of narration: storyboard.json
// holds the shot times the take gave, voice/voice.json the time of every word. Pictures arrive on their words, and
// every strike time is worked back from the physics (sound takes 9.00 s to cross 3 087 m, 3.00 s to cross 1 029 m,
// 1.00 s to cross 343 m), so each thunder lands where the cut says it does.
import { createFilm } from "../../kit/engine/motion.js";
import { FOOT, FOOT1, FOOT3, G, LIGHT, SOUND, YOU, createSky, createWorld, makeBolt, strokeLight } from "./storm.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, $$, stage, shots: s, voiced } = film;
const D = storyboard.duration;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const VIOLET = "#a98bff";
const AMBER = "#ffb347";
// When a word of a shot's line is said, in the film's time.
const said = (id, word) => {
  const hit = voiced[id]?.words?.find(([, , text]) => text.toLowerCase().replace(/[^a-z-]/g, "") === word);
  if (!hit) throw new Error(`the take has no "${word}" in ${id}: run kit/audio/voice.mjs with the take first`);
  return hit[0];
};

// ── The five strikes ─────────────────────────────────────────────────────────
const K0 = 0.25; // the hook: seen now...
const THUNDER0 = voiced.s01.to + 0.24; // ...and heard only after the question, in the pause the take was opened for
const K1 = s.s02.start + 0.33; // close up: light and sound leave together
const ARR2 = s.s07.start + 0.1; // the race: the thunder reaches you in the silent shot...
const K2 = ARR2 - 9.0; // ...so the stroke was nine seconds earlier (3 087 m / 343 m/s)
const ARR3 = s.s11.start; // the count: the thunder lands on the cut to the silent shot...
const K3 = ARR3 - 3.0; // ...three seconds after its flash (1 029 m / 343 m/s)
const K4 = s.s13.start + 0.25; // the near one...
const ARR4 = K4 + 1.0; // ...is heard a second later (343 m / 343 m/s)
// The cut follows the voice, so check that the physics still lands on the words it belongs to.
const near = (t, id, word, slack) => Math.abs(t - said(id, word)) <= slack;
if (!near(K2, "s04", "ngebut", 0.45)) throw new Error(`the race's stroke (${K2.toFixed(2)} s) is no longer on "ngebut" (${said("s04", "ngebut").toFixed(2)} s): change the race's length`);
if (!near(K3, "s10", "kilat", 0.45)) throw new Error(`the counted stroke (${K3.toFixed(2)} s) is no longer on "kilat" (${said("s10", "kilat").toFixed(2)} s)`);

const strikes = [
  { t0: K0, lead: 0.5, bolt: makeBolt(7, [250, 300], undefined, { rough: 0.22 }), ghost: 0.16, front: 0, rays: 0, until: K1 },
  { t0: K1, lead: 0.26, bolt: makeBolt(11, [262, 240], undefined, { rough: 0.2 }), ghost: 0.24, sustain: 0.85, front: 1, rays: 1, until: K2 - 0.8 },
  { t0: K2, lead: 0.75, bolt: makeBolt(3, [252, 310], undefined, { rough: 0.2 }), ghost: 0.24, front: 1, rays: 0, until: D },
  { t0: K3, lead: 0.4, bolt: makeBolt(9, [FOOT3.x + 66, 300], [FOOT3.x, G], { rough: 0.21 }), far: makeBolt(5, [372, 500], [332, G - 8], { rough: 0.16, free: true, branches: 3, reach: 0.5 }), ghost: 0.26, front: 1, rays: 0, until: D },
  { t0: K4, lead: 0.22, bolt: makeBolt(13, [FOOT1.x + 52, 300], [FOOT1.x, G], { rough: 0.18, branches: 3 }), ghost: 0.26, front: 1, rays: 0, until: D },
];
const [k0, k1, k2, k3, k4] = strikes;
// The film loops: the leader that is half way down on frame 0 starts its way in the last quarter second.
const again = { ...k0, t0: D + K0, ghost: 0, until: D + 1 };
// A little light inside the clouds while a number or the poster is being read.
const FLICKS = [
  [s.s08.end - 0.9, 860, 250, 0.5],
  [s.s09.start + 0.5, 480, 620, 0.4],
  [s.s14.start + 1.3, 640, 180, 0.45],
  [s.s14.start + 2.1, 80, 240, 0.35],
];

// ── The camera, and what is in front of it ───────────────────────────────────
// screen = (world - camera) * zoom + (540, 960)
const frame = (x, sx, groundY, z) => ({ x: x - (sx - 540) / z, y: G - (groundY - 960) / z, z });
const HERO = { x: 300, y: 1060, z: 1 }; // the bolt at x 430, the ground at y 1000: the floor is for the lettering
const MACRO = frame(FOOT.x, 497, 1180, 2.2); // the strike point at (497, 1180)
const REST = frame(540, 540, 1180, 1); // the whole race: bolt at x 190, you at x 828, ground at y 1180
const APPROACH = frame(YOU, 800, 1180, 1.45); // the last stretch, you at x 800
const CLOSE = frame(YOU, 560, 1180, 2); // you, twice the size
const SIDE = frame(YOU, 330, 1180, 2.8); // you from the side, at the left of the frame
const NEAR = frame(YOU, 560, 1180, 2); // the counted strike: its strike point at x 135, you at x 560
// The cloud base, in the world, that puts the deck where each framing wants it.
const cloudAt = (cam, screenY) => cam.y + (screenY - 960) / cam.z;
const C = { ...HERO };
const M = { pov: 0, dim: 1, cloud: cloudAt(HERO, 560), sky: 1 };
const you = { a: 0 };
const ray = { a: 1 };
const ruler = { p: 0, x0: FOOT.x, x1: YOU };
const eyeFrom = k2.bolt.main.reduce((best, p) => (Math.abs(p[1] - 800) < Math.abs(best[1] - 800) ? p : best));
const sx = (x) => (x - C.x) * C.z + 540;
const sy = (y) => (y - C.y) * C.z + 960;

const sky = createSky($("#sky"));
const world = createWorld($("#world"));
const worldCanvas = $("#world");
const skyCanvas = $("#sky");
const boltFlash = $("#bolt-flash");
const tSound = $("#t-sound");
const place = (el, x, y) => (el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`);
const pins = [
  [$("#pin-kamu"), () => [sx(YOU), sy(G - 150) - 16]],
  [$("#pin-kamu2"), () => [sx(YOU), sy(G - 150) - 16]],
  [$("#pin-sound"), (t) => [clamp(sx(FOOT.x + SOUND * (t - K2)) - 20, 64 + 392, 930), sy(G - 205)]],
  [$("#pin-sound2"), (t) => [clamp(sx(FOOT.x + SOUND * (t - K1)) - 18, 64 + 392, 930), 896]],
  [$("#pin-km3"), () => [sx((FOOT.x + YOU) / 2), sy(G) - 22]],
  [$("#pin-9"), () => [sx(FOOT.x) + 46, sy(G) - 26]],
  [$("#pin-3"), () => [sx(FOOT3.x) - 44, sy(G) - 26]],
  [$("#pin-1"), () => [sx(FOOT1.x) - 40, sy(G) - 26]],
];
// Tenths that have passed, never rounded up: the clock must not read 9,0 before the thunder is there.
const seconds = (v) => `${(Math.floor(v * 10 + 1e-6) / 10).toFixed(1).replace(".", ",")} detik`;
const heard = (t, at) => (t >= at ? Math.exp(-(t - at) / 0.45) : 0);

film.each((t) => {
  // Light: every stroke's own flicker; the brightest one lights the sky.
  let flash = 0;
  let lit = k0;
  for (const k of strikes) {
    const light = strokeLight(t - k.t0);
    if (light > flash) {
      lit = k;
      flash = light;
    }
  }
  const seen = M.pov && lit.far ? lit.far : lit.bolt;
  let flick = [0, 0, 0];
  for (const [at, x, y, amp] of FLICKS) {
    const tau = t - at;
    if (tau < 0 || tau > 0.6) continue;
    flick = [x, y, amp * (Math.exp(-tau / 0.08) + (tau > 0.14 ? 0.6 * Math.exp(-(tau - 0.14) / 0.06) : 0))];
  }
  sky.render({ t, cam: C, ground: G, cloud: M.cloud, flash, bolt: [seen.foot[0] + 20, seen.top[1], seen.foot[1]], flick, dim: M.dim, loop: D });
  // The stage's floor is the ground: its horizon follows the camera.
  stage.horizon = 0.5 - sy(G) / 1920;
  boltFlash.style.opacity = (Math.max(0, flash - 0.22) * 0.5).toFixed(3);
  boltFlash.style.setProperty("--bx", `${(clamp(sx(seen.foot[0] + 30) / 1080) * 100).toFixed(1)}%`);
  boltFlash.style.setProperty("--by", `${(clamp(sy((seen.top[1] + seen.foot[1]) / 2) / 1920) * 100).toFixed(1)}%`);

  const tau2 = t - K2;
  world.draw(
    {
      cam: C,
      pov: M.pov,
      flash,
      cloud: M.cloud,
      strikes: [...strikes, again]
        .filter((k) => t >= k.t0 - k.lead && t <= k.until)
        .map((k) => ({ bolt: k.bolt, far: k.far, tau: t - k.t0, lead: k.lead, ghost: k.ghost, sustain: k.sustain, front: k.front, rays: k.rays * (t - k.t0 < 0.5 ? 1 : Math.max(0.25, 1 - (t - k.t0 - 0.5) * 0.6)) })),
      ray: { a: tau2 < 0 ? 0 : ray.a * (tau2 < 0.5 ? 1 : Math.max(0.4, 1 - (tau2 - 0.5) * 1.2)), p: clamp((tau2 * LIGHT) / (YOU - eyeFrom[0])), from: eyeFrom, to: [YOU - 8, G - 133] },
      you: { a: you.a, rim: Math.max(strokeLight(tau2), strokeLight(t - K4)), hear: Math.max(heard(t, ARR2), heard(t, ARR3), 0.8 * heard(t, ARR4)) },
      ruler,
    },
    t,
  );
  worldCanvas.style.opacity = (0.3 + 0.7 * M.dim).toFixed(3);
  skyCanvas.style.opacity = M.sky.toFixed(3);

  // The chips that ride on things.
  for (const [el, where] of pins) place(el, ...where(t));
  // The clock of the sound: real seconds since the flash, stopped when the thunder arrives.
  const text = tau2 < 0 ? "…" : seconds(Math.min(9, tau2));
  if (tSound.textContent !== text) tSound.textContent = text;
});

const slam = (lines, at, stagger = 0.16) => {
  gsap.set(lines, { scale: 1.45, opacity: 0, filter: "blur(16px)" });
  tl.to(lines, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.45, ease: "expo.out", stagger }, at);
};
// The stage's light, as a place in the frame.
const lightAt = (x, y, glow, at, d = 0.6) => film.light({ lx: x / 1080, ly: 1 - y / 1920, glow }, at, d);
// A hit: a soft flash over the whole frame and a ring on the floor, from a place in the frame. (Not film.hit: its
// flash is the stage's, and the stage is only seen below the horizon here, so it would light the floor as a slab.)
const hit = (at, x, y, strength, ring) => {
  tl.set(stage, { lx: x / 1080, ly: 1 - y / 1920, pr: 0, ps: ring }, at);
  tl.to(stage, { pr: 1.7, ps: 0, duration: 1.1, ease: "power2.out" }, at + 0.02);
  tl.set("#flash", { "--fx": `${(x / 1080) * 100}%`, "--fy": `${(y / 1920) * 100}%`, opacity: strength * 0.5 }, at);
  tl.to("#flash", { opacity: 0, duration: 0.36, ease: "power2.out" }, at + 0.04);
};
// A thunder landing: the same, from where the listener stands, and the stage takes the colour of sound for a moment.
const thunder = (at, x, y, strength, ring) => {
  hit(at, x, y, strength, ring);
  film.tintTo(AMBER, at, 0.12);
  film.tintTo(VIOLET, at + 0.7, 0.7);
};
// A stroke lights the stage where the bolt is.
const strokeGlow = (at, peak, rest) => {
  tl.to(stage, { glow: peak, duration: 0.06, ease: "none" }, at);
  tl.to(stage, { glow: rest, duration: 0.9, ease: "power2.out" }, at + 0.08);
};
const cut = (cam, cloudY, at) => {
  tl.set(C, { ...cam }, at);
  tl.set(M, { cloud: cloudAt(cam, cloudY) }, at);
};
const move = (cam, cloudY, at, d = 0.7, ease = "power3.inOut") => {
  tl.to(C, { ...cam, duration: d, ease }, at);
  tl.to(M, { cloud: cloudAt(cam, cloudY), duration: d, ease }, at);
};

film.captions();

// ── s01: the question, while it happens ──────────────────────────────────────
Object.assign(stage, { lx: 0.42, ly: 0.52, glow: 0.45, floor: 1, silk: 0.8 });
film.scene("#s01", 0, s.s02.start);
tl.to(C, { z: 1.04, duration: s.s02.start - 0.35, ease: "none" }, 0);
strokeGlow(K0, 1.1, 0.55);
// The lettering is the spoken line: each line lands as its first word is said. Frame 0 already holds the first.
const lines = $$("#q .ln");
for (const line of lines) film.split(line);
slam(lines[1], said("s01", "selalu") - 0.05, 0);
slam(lines[2], said("s01", "duluan") - 0.05, 0);
slam(lines[3], said("s01", "gunturnya") - 0.05, 0);
film.sheen("#q", K0 + 0.02, 0.5);
// The question is asked; in the pause after it, the thunder of the flash that opened the film.
hit(THUNDER0, 430, 960, 0.4, 0.4);
film.tintTo(AMBER, THUNDER0, 0.12);
film.tintTo(VIOLET, THUNDER0 + 0.3, 0.3); // back before the next picture arrives
for (const line of lines) film.typeOut([...line.querySelectorAll(".ch")], s.s02.start - 0.38, { stagger: 0.005 });

// ── s02: light and sound are born together ───────────────────────────────────
film.scene("#s02", s.s02.start, s.s03.start);
move(MACRO, 500, s.s02.start - 0.35);
tl.to(C, { z: 2.27, duration: s.s02.dur - 0.7, ease: "none" }, s.s02.start + 0.35);
tl.to(k0, { ghost: 0.05, duration: 0.3 }, K1 - 0.3);
lightAt(497, 760, 0.7, s.s02.start - 0.3, 0.3);
strokeGlow(K1, 1.15, 0.7);
film.pop("#chip-light", K1 + 0.12);
film.land("#chip-heat", K1 + 0.4, { from: 18 });
film.pop("#chip-sound2", K1 + 0.7, { transformOrigin: "100% 50%" });
tl.to("#s02", { opacity: 0, duration: 0.2 }, s.s03.start - 0.24);
tl.to(k1, { front: 0, rays: 0, ghost: 0.2, sustain: 0, duration: 0.4 }, s.s03.start - 0.3);

// ── s03: the race is set ─────────────────────────────────────────────────────
film.scene("#s03", s.s03.start, s.s08.start + 0.12);
move(REST, 480, s.s03.start - 0.3);
tl.to(you, { a: 1, duration: 0.3 }, s.s03.start - 0.2);
lightAt(FOOT.x + 30, 840, 0.5, s.s03.start - 0.3, 0.7);
film.pop("#chip-kamu", s.s03.start + 0.35, { transformOrigin: "50% 100%" });
film.land("#board", s.s03.start + 0.5, { from: 30 });
gsap.set("#t-light", { autoAlpha: 0 });
gsap.set("#chip-v, #chip-n", { autoAlpha: 0 });
// The distance, drawn along the floor as the voice says where the difference lies.
tl.to(ruler, { p: 1, duration: 0.7, ease: "power2.inOut" }, s.s03.start + 0.75);
film.pop("#km3", said("s03", "kecepatan") + 0.05);

// ── s04: the light is there at once ──────────────────────────────────────────
// The stroke: a shell of light sweeps the scene, the ray is at your eye, and the board's first row is filled.
strokeGlow(K2, 1.15, 0.6);
const SEEN = K2 + (YOU - FOOT.x) / LIGHT; // when the drawn shell of light is at your eye
tl.set("#t-light", { autoAlpha: 1 }, SEEN);
tl.fromTo("#t-light", { scale: 1.08 }, { scale: 1, duration: 0.3, ease: "power2.out", transformOrigin: "100% 50%", immediateRender: false }, SEEN);
film.land("#chip-c", SEEN + 0.1, { from: 16, duration: 0.4 });
// The stage's light travels with the sound, from the strike point to you.
tl.to(stage, { lx: (YOU - 30) / 1080, ly: 1 - 1120 / 1920, duration: ARR2 - K2 - 0.4, ease: "none" }, K2 + 0.3);
tl.to(C, { z: 1.03, duration: s.s04.dur, ease: "none" }, s.s04.start);

// ── s05: the sound, meanwhile ────────────────────────────────────────────────
tl.to("#chip-c", { autoAlpha: 0, y: -14, duration: 0.25, ease: "power2.in" }, s.s05.start - 0.22);
tl.to(ray, { a: 0, duration: 0.35 }, s.s05.start - 0.22);
const pinIn = (sel, at) => {
  tl.set(sel, { autoAlpha: 1 }, at);
  tl.fromTo(sel, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.9)", transformOrigin: "100% 50%", immediateRender: false }, at);
};
pinIn("#chip-n", said("s05", "suara") + 0.04);
tl.to(C, { z: 1.07, x: REST.x + 30, duration: s.s05.dur, ease: "sine.in" }, s.s05.start);

// ── s06: how slow ────────────────────────────────────────────────────────────
move(APPROACH, 380, s.s06.start - 0.08, 0.8);
tl.to("#chip-kamu, #km3", { autoAlpha: 0, duration: 0.2 }, s.s06.start - 0.1);
tl.to(ruler, { p: 0, duration: 0.3 }, s.s06.start - 0.1);
// The name on the front becomes its speed, on one frame, as the figure is said.
const FIGURE = said("s06", "tiga") - 0.04;
tl.set("#chip-n", { autoAlpha: 0 }, FIGURE);
pinIn("#chip-v", FIGURE);
tl.to(C, { z: 1.5, duration: s.s06.end - s.s06.start - 0.72, ease: "none" }, s.s06.start + 0.72);

// ── s07: and only now is it heard ────────────────────────────────────────────
cut(CLOSE, 240, s.s07.start);
tl.to(C, { z: 2.07, duration: s.s07.dur, ease: "none" }, s.s07.start);
tl.set("#chip-v", { autoAlpha: 0 }, s.s07.start);
thunder(ARR2, 560, 1010, 0.75, 0.5);
tl.to("#t-sound", { color: AMBER, scale: 1.2, duration: 0.12, ease: "power2.out" }, ARR2);
tl.to("#t-sound", { scale: 1, duration: 0.4, ease: "back.out(2.4)" }, ARR2 + 0.12);
tl.to("#row-sound", { backgroundColor: "rgba(255,179,71,0.14)", duration: 0.2 }, ARR2);

// ── s08: how much faster ─────────────────────────────────────────────────────
film.scene("#s08", s.s08.start, s.s09.start);
move(REST, 480, s.s08.start, 0.5, "power3.out");
tl.to(C, { z: 1.04, duration: s.s08.dur - 0.5, ease: "none" }, s.s08.start + 0.5);
// The board is gone before the fraction is there: the two never share the frame.
tl.to("#board", { autoAlpha: 0, duration: 0.12, ease: "power1.in" }, s.s08.start - 0.1);
// The scene steps back and the stage's own light comes through the sky, behind the figure.
tl.to(M, { dim: 0.55, sky: 0.6, duration: 0.45, ease: "power2.out" }, s.s08.start);
tl.to(k2, { front: 0, ghost: 0.1, duration: 0.6 }, s.s08.start + 0.1);
lightAt(497, 880, 0.55, s.s08.start, 0.5);
film.land("#fr-a", said("s08", "artinya") + 0.05, { from: -30, duration: 0.42 });
gsap.set("#fr-rule", { scaleX: 0 });
tl.to("#fr-rule", { scaleX: 1, duration: 0.3, ease: "power2.out" }, said("s08", "artinya") + 0.3);
film.land("#fr-b", said("s08", "cahaya") - 0.1, { from: 30, duration: 0.42 });
// The result lands as the voice says it, at its value, and stays.
const RES = said("s08", "sejuta") - 0.04;
film.split("#res");
slam("#res .ln", RES, 0);
hit(RES, 497, 880, 0.4, 0.42);
film.land("#res-sub", said("s08", "lebih") - 0.05, { from: 18 });
film.sheen("#res", RES + 0.7, 0.7);
tl.to("#s08", { y: -520, opacity: 0, duration: 0.22, ease: "power3.in" }, s.s09.start - 0.22);

// ── s09: something you can use ───────────────────────────────────────────────
film.scene("#s09", s.s09.start, s.s14.start + 0.2); // it holds the count, which stays to the recap
cut(SIDE, 420, s.s09.start);
tl.set(M, { dim: 1, sky: 1 }, s.s09.start);
tl.set(k2, { ghost: 0 }, s.s09.start);
tl.to(C, { z: 2.9, duration: s.s09.dur, ease: "none" }, s.s09.start);
tl.set(stage, { lx: 0.3, ly: 1 - 900 / 1920, glow: 0.45 }, s.s09.start);
film.pop("#chip-kamu2", said("s09", "nah") + 0.05, { transformOrigin: "50% 100%" });
for (const digit of ["#d0", "#d1", "#d2", "#d3"]) {
  film.split(digit);
  gsap.set(digit, { autoAlpha: 0 });
}
const TOOL = said("s09", "bisa") - 0.05;
film.land("#count-label", TOOL, { from: 14 });
tl.set("#d0", { autoAlpha: 1 }, TOOL + 0.1);
tl.fromTo("#d0", { scale: 0.62 }, { scale: 1, duration: 0.34, ease: "back.out(2.6)", immediateRender: false }, TOOL + 0.1);

// ── s10: see the flash, count the seconds ────────────────────────────────────
tl.set("#chip-kamu2", { autoAlpha: 0 }, s.s10.start);
tl.set(M, { pov: 1 }, s.s10.start);
cut(REST, 640, s.s10.start);
tl.set(you, { a: 0 }, s.s10.start);
tl.to(C, { z: 1.05, y: REST.y - 10, duration: s.s10.dur, ease: "none" }, s.s10.start);
tl.set(stage, { lx: 0.31, ly: 0.5, glow: 0.4 }, s.s10.start);
strokeGlow(K3, 1.0, 0.5);
// One figure a second from the flash, each replacing the last on one frame.
[
  ["#d0", TOOL + 0.1],
  ["#d1", K3 + 1],
  ["#d2", K3 + 2],
  ["#d3", K3 + 3],
].forEach(([digit, at], i, all) => {
  if (i) {
    tl.set(digit, { autoAlpha: 1 }, at);
    tl.fromTo(digit, { scale: 0.62 }, { scale: 1, duration: 0.34, ease: "back.out(2.6)", immediateRender: false }, at);
  }
  if (all[i + 1]) tl.set(digit, { autoAlpha: 0 }, all[i + 1][1]);
});

// ── s11: three, and the thunder ──────────────────────────────────────────────
film.scene("#s11", s.s11.start, s.s14.start + 0.2);
tl.set(M, { pov: 0 }, s.s11.start);
cut(NEAR, 300, s.s11.start);
tl.set(you, { a: 1 }, s.s11.start);
tl.set(ruler, { x0: FOOT3.x, x1: YOU, p: 0 }, s.s11.start);
tl.to(C, { z: 2.06, duration: s.s13.start - s.s11.start, ease: "none" }, s.s11.start);
tl.set("#count-label", { autoAlpha: 0 }, s.s11.start);
thunder(ARR3, 560, 1010, 0.6, 0.45);
film.land("#detik", s.s11.start + 0.18, { from: 12 });

// ── s12: three seconds, about a kilometre ────────────────────────────────────
gsap.set("#sum", { autoAlpha: 0 });
tl.to("#sum", { autoAlpha: 1, duration: 0.2 }, said("s12", "tiap") - 0.02);
film.land("#sum-a", said("s12", "tiap"), { from: 16, duration: 0.4 });
film.land("#sum-b", said("s12", "detik") + 0.1, { from: 16, duration: 0.4 });
// The distance, measured along the floor from the strike point to you.
tl.to(ruler, { p: 1, duration: 0.55, ease: "power2.inOut" }, said("s12", "kira-kira") - 0.1);
film.pop("#km", said("s12", "satu") - 0.05);
lightAt(347, 1120, 0.6, s.s12.start + 0.4, 0.7);

// ── s13: the sooner the thunder, the nearer the strike ───────────────────────
film.scene("#s13", s.s13.start, s.s14.start + 0.2);
tl.to("#s09 .digit, #detik, #sum, #km", { autoAlpha: 0, duration: 0.2 }, s.s13.start - 0.22);
tl.to(ruler, { p: 0, duration: 0.2 }, s.s13.start - 0.22);
tl.to(k3, { front: 0, duration: 0.25 }, s.s13.start - 0.25);
move(REST, 480, s.s13.start - 0.25, 0.6);
tl.to(C, { z: 1.035, x: REST.x + 14, duration: s.s13.dur - 0.35, ease: "none" }, s.s13.start + 0.35);
tl.to(k2, { ghost: 0.26, duration: 0.4 }, s.s13.start - 0.2);
lightAt(FOOT.x + 60, 900, 0.5, s.s13.start - 0.2, 0.4);
film.land("#steps", s.s13.start + 0.02, { from: 24, duration: 0.4 });
film.pop("#tag-9", s.s13.start + 0.1);
film.pop("#tag-3", s.s13.start + 0.2);
gsap.set("#step-1", { opacity: 0.25 });
strokeGlow(K4, 1.1, 0.6);
// A second after its flash the near strike's thunder is on you, and its row is lit.
tl.to(stage, { lx: YOU / 1080, ly: 1 - 1090 / 1920, duration: 0.9, ease: "power2.inOut" }, K4 + 0.1);
thunder(ARR4, YOU, 1090, 0.4, 0.4);
tl.to("#step-1", { opacity: 1, duration: 0.2 }, ARR4);
film.pop("#tag-1", ARR4);

// ── s14: the recap, and the line to remember ─────────────────────────────────
film.scene("#s14", s.s14.start, D);
tl.to("#s13", { opacity: 0, y: 60, duration: 0.3, ease: "power2.in" }, s.s14.start - 0.26);
tl.to([k2, k3, k4], { front: 0, ghost: 0, duration: 0.35 }, s.s14.start - 0.3);
tl.to(you, { a: 0, duration: 0.3 }, s.s14.start - 0.3);
tl.to(C, { ...HERO, z: 0.972, duration: 0.8, ease: "power3.inOut" }, s.s14.start - 0.3);
tl.to(C, { z: 1, duration: D - s.s14.start - 0.5, ease: "none" }, s.s14.start + 0.5);
tl.to(M, { dim: 0.75, sky: 0.8, cloud: cloudAt(HERO, 560), duration: 0.8, ease: "power3.inOut" }, s.s14.start - 0.3);
lightAt(497, 1160, 0.75, s.s14.start - 0.2, 0.7);
["#rc1", "#rc2", "#rc3"].forEach((card, i) => film.land(card, s.s14.start + 0.02 + i * 0.13, { from: 70, duration: 0.5 }));
for (const line of $$("#poster .ln")) film.split(line);
slam("#poster .ln", s.s14.start + 0.3, 0.2);
hit(s.s14.start + 0.3, 497, 1160, 0.26, 0.3);
film.sheen("#poster", s.s14.start + 1.05, 0.8);
// The last frame hands back to the first: the sky is as light again as it is on frame 0.
tl.to(M, { dim: 1, sky: 1, duration: 0.5, ease: "power1.in" }, D - 0.5);

film.finish();
