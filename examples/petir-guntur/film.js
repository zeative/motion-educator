// "Kenapa petir terlihat dulu, baru guntur terdengar?" Built from storyboard.json: every time below comes from a
// shot's start or end, and every strike time from the physics (sound takes 6.00 s to cross 2 058 m, 3.00 s to
// cross 1 029 m), so the thunder lands where the storyboard says it does.
import { createFilm } from "../../kit/engine/motion.js";
import { CLOUD, FOOT, G, LIGHT, SOUND, YOU1, YOU2, createSky, createWorld, makeBolt, strokeLight } from "./storm.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, $$, stage, shots: s, voiced } = film;
const D = storyboard.duration;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const VIOLET = "#a98bff";
const AMBER = "#ffb347";

// ── The four strikes ─────────────────────────────────────────────────────────
const K0 = 0.25; // the hook: seen, and heard only on the cut
const K1 = s.s02.start + 0.45; // close up: light and sound leave together
const ARR2 = s.s05.start + 0.2; // the race: the thunder reaches you here...
const K2 = ARR2 - 6.0; // ...so the stroke was six seconds earlier (2 058 m / 343 m/s)
const ARR3 = s.s08.start; // the count: the thunder lands on the cut...
const K3 = ARR3 - 3.0; // ...three seconds after its flash (1 029 m / 343 m/s)
if (K2 < s.s03.start + 0.3 || K3 < s.s07.start + 0.1) throw new Error("the storyboard leaves no room for the sound to travel: lengthen s03/s04 or s07");

const strikes = [
  { t0: K0, lead: 0.5, bolt: makeBolt(7, [250, 300], undefined, { rough: 0.22 }), ghost: 0.16, front: 0, rays: 0, until: K1 },
  { t0: K1, lead: 0.28, bolt: makeBolt(11, [262, 240], undefined, { rough: 0.2 }), ghost: 0.24, sustain: 0.85, front: 1, rays: 1, until: s.s03.start + 0.4 },
  { t0: K2, lead: 0.75, bolt: makeBolt(3, [252, 310], undefined, { rough: 0.2 }), ghost: 0.24, front: 1, rays: 0, until: s.s07.start },
  { t0: K3, lead: 0.4, bolt: makeBolt(9, [262, 300], undefined, { rough: 0.21 }), far: makeBolt(5, [372, 500], [332, G - 8], { rough: 0.16, free: true, branches: 3, reach: 0.5 }), ghost: 0.26, front: 1, rays: 0, until: D },
];
const [k0, k1, k2, k3] = strikes;
// The film loops: the leader that is half way down on frame 0 starts its way in the last quarter second.
const again = { ...k0, t0: D + K0, ghost: 0, until: D + 1 };
// A little light inside the clouds while a number or the poster is being read.
const FLICKS = [
  [s.s06.start + 1.75, 860, 250, 0.5],
  [s.s09.start + 1.35, 640, 180, 0.45],
  [s.s09.start + 2.2, 80, 240, 0.35],
];

// ── The camera, and what is in front of it ───────────────────────────────────
const HERO = { x: 300, y: 1060, z: 1 }; // the bolt at x 430, the ground at y 1000
const MACRO = { x: FOOT.x - (497 - 540) / 2.2, y: G - (1180 - 960) / 2.2, z: 2.2 }; // the strike point at (497, 1180)
const REST = { x: 540, y: 960, z: 1 }; // the world's own coordinates
const CLOSE = { x: YOU2 - (560 - 540) / 2, y: G - (1180 - 960) / 2, z: 2 }; // you at (560, 1180), twice the size
const NEAR = { x: FOOT.x + (540 - 150) / 1.3, y: G - (1100 - 960) / 1.3, z: 1.3 }; // the strike point at x 150, you at x 565
const C = { ...HERO };
const HERO_CLOUD = 660; // the hook's deck hangs lower, so the bolt comes out of lit cloud in the middle of the frame
const M = { pov: 0, dim: 1, cloud: HERO_CLOUD, sky: 1 };
const you2 = { a: 0 };
const you1 = { a: 0 };
const ray = { a: 1 };
const ruler = { p: 0, x0: FOOT.x, x1: YOU1 };
const eyeFrom = k2.bolt.main.reduce((best, p) => (Math.abs(p[1] - 800) < Math.abs(best[1] - 800) ? p : best));
const sx = (x) => (x - C.x) * C.z + 540;
const sy = (y) => (y - C.y) * C.z + 960;

const sky = createSky($("#sky"));
const world = createWorld($("#world"));
const worldCanvas = $("#world");
const skyCanvas = $("#sky");
const boltFlash = $("#bolt-flash");
const pinKamu = $("#pin-kamu");
const pinSound = $("#pin-sound");
const pinSound2 = $("#pin-sound2");
const tSound = $("#t-sound");
const place = (el, x, y) => (el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`);
const seconds = (v) => `${v.toFixed(1).replace(".", ",")} detik`;

film.each((t) => {
  // Light: every stroke's own flicker; the brightest one lights the sky.
  let flash = 0;
  let lit = k0;
  for (const k of strikes) {
    const light = t <= k.until + 2 ? strokeLight(t - k.t0) : 0;
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
      ray: { a: tau2 < 0 ? 0 : ray.a * (tau2 < 0.5 ? 1 : Math.max(0.4, 1 - (tau2 - 0.5) * 1.2)), p: clamp((tau2 * LIGHT) / (YOU2 - eyeFrom[0])), from: eyeFrom, to: [YOU2 - 8, G - 133] },
      you2: { a: you2.a, rim: strokeLight(tau2), hear: t >= ARR2 ? Math.exp(-(t - ARR2) / 0.45) : 0 },
      you1: { a: you1.a, rim: 0, hear: t >= ARR3 ? Math.exp(-(t - ARR3) / 0.45) : 0 },
      ruler,
    },
    t,
  );
  worldCanvas.style.opacity = (0.3 + 0.7 * M.dim).toFixed(3);
  skyCanvas.style.opacity = M.sky.toFixed(3);

  // The chips that ride on things.
  place(pinKamu, sx(YOU2), sy(G - 150) - 16);
  place(pinSound, clamp(sx(FOOT.x + SOUND * tau2) - 20, 64 + 392, 930), 858);
  place(pinSound2, clamp(sx(FOOT.x + SOUND * (t - K1)) - 18, 64 + 392, 930), 896);
  // The clock of the sound: real seconds since the flash, stopped when the thunder arrives.
  const text = tau2 < 0 ? "…" : seconds(Math.min(6, tau2));
  if (tSound.textContent !== text) tSound.textContent = text;
});

const slam = (lines, at, stagger = 0.16) => {
  gsap.set(lines, { scale: 1.45, opacity: 0, filter: "blur(16px)" });
  tl.to(lines, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.45, ease: "expo.out", stagger }, at);
};
// The stage's light, as a place in the frame.
const lightAt = (x, y, glow, at, d = 0.6) => film.light({ lx: x / 1080, ly: 1 - y / 1920, glow }, at, d);
// A thunder landing: a soft flash over the whole frame and a ring on the floor, from where the listener stands, in
// the colour of sound. (Not film.hit: its flash is the stage's, and the stage is only seen below the horizon here,
// so it would light the floor as a hard-edged slab.)
const thunder = (at, x, y, strength, ring) => {
  tl.set(stage, { lx: x / 1080, ly: 1 - y / 1920, pr: 0, ps: ring }, at);
  tl.to(stage, { pr: 1.7, ps: 0, duration: 1.1, ease: "power2.out" }, at + 0.02);
  tl.set("#flash", { "--fx": `${(x / 1080) * 100}%`, "--fy": `${(y / 1920) * 100}%`, opacity: strength * 0.55 }, at);
  tl.to("#flash", { opacity: 0, duration: 0.4, ease: "power2.out" }, at + 0.04);
  film.tintTo(AMBER, at, 0.12);
  film.tintTo(VIOLET, at + 0.7, 0.7);
};
// The same for a figure or a line landing: no slab of light on the floor.
const hit = (at, x, y, strength, ring) => {
  tl.set(stage, { lx: x / 1080, ly: 1 - y / 1920, pr: 0, ps: ring }, at);
  tl.to(stage, { pr: 1.7, ps: 0, duration: 1.1, ease: "power2.out" }, at + 0.02);
  tl.set("#flash", { "--fx": `${(x / 1080) * 100}%`, "--fy": `${(y / 1920) * 100}%`, opacity: strength * 0.5 }, at);
  tl.to("#flash", { opacity: 0, duration: 0.34, ease: "power2.out" }, at + 0.04);
};

film.captions();

// ── s01: the question, while it happens ──────────────────────────────────────
Object.assign(stage, { lx: 0.42, ly: 0.52, glow: 0.45, floor: 1, silk: 0.8 });
film.scene("#s01", 0, s.s02.start);
tl.to(C, { z: 1.04, duration: s.s02.start - 0.35, ease: "none" }, 0);
tl.to(stage, { glow: 1.1, duration: 0.06, ease: "none" }, K0);
tl.to(stage, { glow: 0.55, duration: 0.9, ease: "power2.out" }, K0 + 0.08);
// The lines land with the voice: each starts when its first word is said.
const lines = $$("#q .ln");
for (const line of lines) film.split(line);
{
  const words = s.s01.voice.split(/\s+/).map((w) => w.length + 2);
  const total = words.reduce((a, b) => a + b, 0);
  const said = (n) => 0.15 + ((voiced.s01?.speech ?? 3.5) * words.slice(0, n).reduce((a, b) => a + b, 0)) / total;
  // Frame 0 is a finished picture: the first line is already there.
  [2, 4, 6].forEach((n, i) => slam(lines[i + 1], said(n) - 0.06, 0));
  film.sheen("#q", K0 + 0.02, 0.5);
  for (const line of lines) film.typeOut([...line.querySelectorAll(".ch")], s.s02.start - 0.42, { stagger: 0.006 });
}

// ── s02: light and sound are born together ───────────────────────────────────
film.scene("#s02", s.s02.start, s.s03.start);
tl.to(C, { ...MACRO, duration: 0.7, ease: "power3.inOut" }, s.s02.start - 0.35);
tl.to(C, { z: 2.27, duration: s.s02.dur - 0.7, ease: "none" }, s.s02.start + 0.35);
tl.to(k0, { ghost: 0.05, duration: 0.3 }, K1 - 0.3);
lightAt(497, 760, 0.7, s.s02.start - 0.3, 0.3);
hit(s.s02.start, 497, 900, 0.3, 0.32); // the hook's thunder arrives, seconds after its flash
tl.to(stage, { glow: 1.15, duration: 0.06, ease: "none" }, K1);
tl.to(stage, { glow: 0.7, duration: 0.9, ease: "power2.out" }, K1 + 0.08);
film.pop("#chip-light", K1 + 0.12);
film.land("#chip-heat", K1 + 0.4, { from: 18 });
film.pop("#chip-sound2", K1 + 0.72, { transformOrigin: "100% 50%" });
tl.to("#s02", { opacity: 0, duration: 0.22 }, s.s03.start - 0.26);
tl.to(k1, { front: 0, ghost: 0, rays: 0, duration: 0.4 }, s.s03.start - 0.3);

// ── s03: the light is there at once ──────────────────────────────────────────
film.scene("#s03", s.s03.start, s.s06.start + 0.25);
tl.to(C, { ...REST, duration: 0.7, ease: "power3.inOut" }, s.s03.start - 0.32);
tl.to(M, { cloud: CLOUD + 40, duration: 0.7, ease: "power3.inOut" }, s.s03.start - 0.32);
tl.to(you2, { a: 1, duration: 0.3 }, s.s03.start - 0.2);
film.tintTo(VIOLET, s.s03.start - 0.3, 0.4);
lightAt(FOOT.x + 30, 760, 0.5, s.s03.start - 0.3, 0.7);
film.land("#board", s.s03.start + 0.12, { from: 30 });
gsap.set("#t-light", { autoAlpha: 0 });
film.pop("#chip-kamu", s.s03.start + 0.3, { transformOrigin: "50% 100%" });
gsap.set("#chip-v", { autoAlpha: 0 });
// The stroke: the ray is at the eye in six frames, and the board's first row is filled at its value.
tl.to(stage, { glow: 1.15, duration: 0.06, ease: "none" }, K2);
tl.to(stage, { glow: 0.6, duration: 0.9, ease: "power2.out" }, K2 + 0.08);
const SEEN = K2 + (YOU2 - FOOT.x) / LIGHT; // when the drawn shell of light is at your eye
tl.set("#t-light", { autoAlpha: 1 }, SEEN);
tl.fromTo("#t-light", { scale: 1.25 }, { scale: 1, duration: 0.3, ease: "back.out(2)", transformOrigin: "100% 50%", immediateRender: false }, SEEN);
film.land("#chip-c", SEEN + 0.1, { from: 16, duration: 0.4 });
// The stage's light travels with the sound, from the strike point to you.
tl.to(stage, { lx: (YOU2 - 30) / 1080, ly: 1 - 1040 / 1920, duration: ARR2 - K2 - 0.4, ease: "none" }, K2 + 0.3);

// ── s04: the sound is on its way ─────────────────────────────────────────────
tl.to("#chip-c", { autoAlpha: 0, y: -14, duration: 0.25, ease: "power2.in" }, s.s04.start - 0.2);
tl.to(ray, { a: 0, duration: 0.35 }, s.s04.start - 0.2);
tl.set("#chip-v", { autoAlpha: 1 }, s.s04.start + 0.05);
tl.fromTo("#chip-v", { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.9)", transformOrigin: "100% 50%", immediateRender: false }, s.s04.start + 0.05);
tl.to(C, { x: 566, y: 966, z: 1.05, duration: s.s04.dur, ease: "sine.inOut" }, s.s04.start);
// "kamu" leaves before the speed chip, riding the front, would run into it.
tl.to("#chip-kamu", { autoAlpha: 0, duration: 0.25 }, ARR2 - 1.1);

// ── s05: and only now is it heard ────────────────────────────────────────────
tl.set(C, { ...CLOSE }, s.s05.start);
tl.to(C, { z: 2.07, duration: s.s05.dur, ease: "none" }, s.s05.start);
tl.set("#chip-v", { autoAlpha: 0 }, s.s05.start);
thunder(ARR2, 560, 1010, 0.75, 0.5);
tl.to("#t-sound", { color: AMBER, scale: 1.2, duration: 0.12, ease: "power2.out" }, ARR2);
tl.to("#t-sound", { scale: 1, duration: 0.4, ease: "back.out(2.4)" }, ARR2 + 0.12);
tl.to("#row-sound", { backgroundColor: "rgba(255,179,71,0.14)", duration: 0.2 }, ARR2);

// ── s06: how much faster ─────────────────────────────────────────────────────
film.scene("#s06", s.s06.start, s.s07.start);
tl.to(C, { ...REST, duration: 0.5, ease: "power3.out" }, s.s06.start);
tl.to(C, { z: 1.035, duration: s.s06.dur - 0.5, ease: "none" }, s.s06.start + 0.5);
// The board is gone before the fraction is there: the two never share the frame.
tl.to("#board", { autoAlpha: 0, duration: 0.12, ease: "power1.in" }, s.s06.start - 0.1);
// The scene steps back and the stage's own light comes through the sky, behind the figure.
tl.to(M, { dim: 0.55, sky: 0.6, duration: 0.45, ease: "power2.out" }, s.s06.start);
tl.to(k2, { front: 0, ghost: 0.1, duration: 0.6 }, s.s06.start + 0.1);
lightAt(497, 800, 0.55, s.s06.start, 0.5);
film.land("#fr-a", s.s06.start + 0.1, { from: -30, duration: 0.42 });
gsap.set("#fr-rule", { scaleX: 0 });
tl.to("#fr-rule", { scaleX: 1, duration: 0.3, ease: "power2.out" }, s.s06.start + 0.28);
film.land("#fr-b", s.s06.start + 0.34, { from: 30, duration: 0.42 });
// The result lands on the beat, at its value, and stays.
const RES = s.s06.start + 2 * storyboard.music.beat;
film.split("#res");
slam("#res .ln", RES, 0);
hit(RES, 497, 820, 0.4, 0.42);
film.land("#res-sub", RES + 0.22, { from: 18 });
film.sheen("#res", RES + 0.75, 0.7);
tl.to("#s06", { y: -520, opacity: 0, duration: 0.24, ease: "power3.in" }, s.s07.start - 0.24);

// ── s07: so count the seconds ────────────────────────────────────────────────
film.scene("#s07", s.s07.start, s.s09.start + 0.2);
tl.set(M, { pov: 1, dim: 1, sky: 1, cloud: 560 }, s.s07.start);
tl.set(C, { ...REST }, s.s07.start);
tl.set(you2, { a: 0 }, s.s07.start);
tl.to(C, { z: 1.05, y: 950, duration: s.s07.dur, ease: "none" }, s.s07.start);
tl.set(stage, { lx: 0.31, ly: 0.58, glow: 0.4 }, s.s07.start);
tl.to(stage, { glow: 1.0, duration: 0.06, ease: "none" }, K3);
tl.to(stage, { glow: 0.5, duration: 0.9, ease: "power2.out" }, K3 + 0.08);
film.land("#count-label", K3 + 0.3, { from: 14 });
for (const digit of ["#d1", "#d2", "#d3"]) {
  film.split(digit);
  gsap.set(digit, { autoAlpha: 0 });
}
// One figure a second, each replacing the last on one frame.
[
  ["#d1", K3 + 1],
  ["#d2", K3 + 2],
  ["#d3", K3 + 3],
].forEach(([digit, at], i, all) => {
  tl.set(digit, { autoAlpha: 1 }, at);
  tl.fromTo(digit, { scale: 0.62 }, { scale: 1, duration: 0.34, ease: "back.out(2.6)", immediateRender: false }, at);
  if (all[i + 1]) tl.set(digit, { autoAlpha: 0 }, all[i + 1][1]);
});

// ── s08: three seconds, about a kilometre ────────────────────────────────────
film.scene("#s08", s.s08.start, s.s09.start + 0.2);
tl.set(M, { pov: 0, cloud: 580 }, s.s08.start);
tl.set(C, { ...NEAR }, s.s08.start);
tl.to(C, { z: 1.335, duration: s.s08.dur, ease: "none" }, s.s08.start);
tl.set(you1, { a: 1 }, s.s08.start);
tl.set("#count-label", { autoAlpha: 0 }, s.s08.start);
thunder(ARR3, 565, 1010, 0.6, 0.45);
film.land("#detik", s.s08.start + 0.18, { from: 12 });
gsap.set("#sum", { autoAlpha: 0 });
tl.to("#sum", { autoAlpha: 1, duration: 0.2 }, s.s08.start + 0.75);
film.land("#sum-a", s.s08.start + 0.78, { from: 16, duration: 0.4 });
film.land("#sum-b", s.s08.start + 1.2, { from: 16, duration: 0.4 });
// The distance, measured along the ground from the strike point to you.
tl.to(ruler, { p: 1, duration: 0.55, ease: "power2.inOut" }, s.s08.start + 1.65);
film.pop("#km", s.s08.start + 2.05);
lightAt(357, 1040, 0.6, s.s08.start + 1.5, 0.7);

// ── s09: the recap, and the line to remember ─────────────────────────────────
film.scene("#s09", s.s09.start, D);
tl.to("#s07, #s08", { opacity: 0, y: 60, duration: 0.3, ease: "power2.in" }, s.s09.start - 0.26);
tl.to(k3, { front: 0, ghost: 0, duration: 0.35 }, s.s09.start - 0.3);
tl.to(you1, { a: 0, duration: 0.3 }, s.s09.start - 0.3);
tl.to(ruler, { p: 0, duration: 0.25 }, s.s09.start - 0.3);
tl.to(C, { ...HERO, z: 0.972, duration: 0.8, ease: "power3.inOut" }, s.s09.start - 0.3);
tl.to(C, { z: 1, duration: D - s.s09.start - 0.5, ease: "none" }, s.s09.start + 0.5);
tl.to(M, { dim: 0.75, sky: 0.8, cloud: HERO_CLOUD, duration: 0.8, ease: "power3.inOut" }, s.s09.start - 0.3);
lightAt(497, 1160, 0.75, s.s09.start - 0.2, 0.7);
["#rc1", "#rc2", "#rc3"].forEach((card, i) => film.land(card, s.s09.start + 0.02 + i * 0.13, { from: 70, duration: 0.5 }));
for (const line of $$("#poster .ln")) film.split(line);
slam("#poster .ln", s.s09.start + 0.3, 0.2);
hit(s.s09.start + 0.3, 497, 1160, 0.26, 0.3);
film.sheen("#poster", s.s09.start + 1.05, 0.8);
// The last frame hands back to the first: the sky is as light again as it is on frame 0.
tl.to(M, { dim: 1, sky: 1, duration: 0.5, ease: "power1.in" }, D - 0.5);

film.finish();
