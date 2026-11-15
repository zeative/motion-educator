// "How does your phone know where you are?" A captions-only film: every time comes from storyboard.json (shot
// lengths set by reading, on the beat), every position from geometry.json (written by storyboard.build.py): the
// satellites on the GPS orbit, each sphere's radius the true range to you, the circles and points solved by
// trilateration every frame (gps.js). Pictures arrive with their words: events sit at fractions of each shot.
import { createFilm } from "../../kit/engine/motion.js";
import { createSpace, lerp } from "./gps.js";

const storyboard = await (await fetch("storyboard.json")).json();
const G = await (await fetch("geometry.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, $$, stage, shots: s } = film;
const D = storyboard.duration;
const at = (id, f) => s[id].start + s[id].dur * f; // a moment inside a shot
const AMBER = "#ffb547";
const CYAN = "#38e1ff";

// ── Stars: drawn once, seeded ────────────────────────────────────────────────
{
  const c = $("#stars");
  const g = c.getContext("2d");
  let seed = 7;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 1100; i++) {
    const x = rand() * 1920;
    const y = rand() * 1080;
    const r = 0.4 + rand() ** 3 * 1.5;
    const a = 0.15 + rand() ** 2 * 0.7;
    g.fillStyle = `rgba(${200 + rand() * 55 | 0}, ${215 + rand() * 40 | 0}, 255, ${a.toFixed(2)})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}

// ── The world ────────────────────────────────────────────────────────────────
const space = await createSpace($("#space"), G);
const F = Object.fromEntries(Object.entries(G.framings).map(([k, v]) => [k, { x: v.c[0] - 960, y: v.c[1] - 540, size: 2 * v.r }]));
// The globe turned so 8 degrees east faces the camera and tilted so 48 degrees north sits where you are.
const E = { vis: 1, ...F.HOOK, turn: 4.573, tilt: -0.419, air: 1, thick: 1.035 };
const M = {
  satPx: 80, fleet: 0, orbits: 0, orbitTurn: 0, shell: 0, bias: 0, sphereAll: 1, circleW: 3.6,
  measure: { p: 0 }, alt: { p: 0 }, you: { a: 1, px: 7 }, other: { a: 0 },
  hero: G.sats.map(() => ({ a: 0, size: 1 })),
  sph: G.sats.map(() => ({ a: 0, g: 1 })),
  circ: [0, 1, 2, 3, 4, 5].map(() => ({ a: 0, d: 0 })),
  wrong: G.wrong.map(() => ({ a: 0 })),
  wrongPx: 12,
  thread: G.sats.map(() => ({ p: 0 })),
  threadPulse: -1,
  close: { a: 0, x: -120, y: -60, size: 150, turn: -0.6 },
  flyby: { a: 0, x: -95, y: 26, z: 150, turn: 0.4, size: 60 },
};
// Signals that travel: [satellite, start, seconds to reach you]. The shell reaches you at start + seconds.
const SIGNALS = [];
const signal = (sat, t0, dur, linger = 0.5) => SIGNALS.push({ sat, t0, dur, linger });
const pulseState = (t) =>
  SIGNALS.map(({ sat, t0, dur, linger }) => {
    const f = (t - t0) / dur;
    if (f <= 0) return null;
    const after = t - (t0 + dur);
    const a = Math.min(1, f * 6) * (after > 0 ? Math.max(0, 1 - after / linger) : 1);
    return a > 0.002 ? [sat, Math.min(f, 1 + Math.max(0, after) * 0.06), a * 0.9] : null;
  })
    .filter(Boolean)
    .slice(0, 12);
// The close-up satellite's shells: one every 0.7 s.
const closeShells = (t) => {
  const out = [];
  for (let k = 0; k < 4; k++) {
    const t0 = s.s03.start + 0.25 + k * 0.7;
    const f = (t - t0) / 2.2;
    if (f > 0 && f < 1) out.push([80 + 1500 * f, 0.8 * (1 - f)]);
  }
  return out;
};
const W = { delay: null };

const place = (el, x, y) => (el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`);
const pin = (id) => $(`#pin-${id}`);
const sphereDot = (i, dir) => {
  const S = G.sats[i];
  const r = G.ranges[i] + M.bias;
  const n = Math.hypot(...dir);
  return S.map((x, k) => x + (dir[k] / n) * r);
};
const delayEl = $("#delay");
const corrEl = $("#corr");
const usEl = $("#us");
const distEl = $("#dist");
const clockEl = $("#clock");
const pulseEl = $("#pulse");
const trailEl = $("#trailbar");
const ruler = { f: 0 };
const qAngle = { a: 0 };
const corrFmt = (b) => {
  const ms = (b * G.RE) / G.C_KM * 1000;
  return (Math.abs(ms) < 0.05 ? "0.0" : ms.toFixed(1)).replace("-", "−");
};

// The ruler's ticks, every 50 m
{
  let html = "";
  for (let m = 0; m <= 300; m += 50) {
    const x = 210 + (1500 * m) / 300;
    html += `<line class="tick" x1="${x}" y1="${m % 100 ? 645 : 640}" x2="${x}" y2="${m % 100 ? 662 : 672}"/><text class="tick-label" x="${x}" y="708">${m} m</text>`;
  }
  $("#ticks").innerHTML = html;
}

film.each((t) => {
  space.render(
    E,
    {
      satPx: M.satPx,
      fleet: M.fleet,
      orbits: M.orbits,
      orbitTurn: M.orbitTurn,
      shell: M.shell,
      hero: M.hero.map((h) => h.a),
      heroSize: M.hero.map((h) => h.size),
      bias: M.bias,
      grow: M.sph.map((o) => o.g),
      sphere: M.sph.map((o) => o.a),
      sphereAll: M.sphereAll,
      pulses: pulseState(t),
      circle: M.circ.map((o) => o.a),
      draw: M.circ.map((o) => o.d),
      circleW: M.circleW,
      measure: M.measure.p,
      alt: M.alt.p,
      thread: M.thread.map((o) => o.p),
      threadPulse: M.threadPulse,
      you: M.you.a,
      youPx: M.you.px,
      other: M.other.a,
      wrong: M.wrong.map((o) => o.a),
      wrongPx: M.wrongPx,
      close: M.close.a,
      closeX: M.close.x,
      closeY: M.close.y,
      closeSize: M.close.size,
      closeTurn: M.close.turn,
      closeShells: closeShells(t),
      flyby: M.flyby.a,
      flybyAt: [M.flyby.x, M.flyby.y, M.flyby.z],
      flybyTurn: M.flyby.turn,
      flybySize: M.flyby.size,
    },
    t,
  );
  const P = space.toScreen(G.P);
  place(pin("you"), ...P);
  place(pin("lock"), ...P);
  place(pin("here"), ...P);
  G.sats.forEach((S, i) => {
    const p = space.toScreen(S);
    place(pin(`s${i + 1}`), ...p);
    place(pin(`c${i + 1}`), ...p);
  });
  place(pin("other"), ...space.toScreen(G.other));
  const S1 = space.toScreen(G.sats[0]);
  place(pin("meas"), (S1[0] + P[0]) / 2, (S1[1] + P[1]) / 2);
  const a0 = [0.62, 0.785, 0];
  const n0 = Math.hypot(...a0);
  place(pin("alt"), ...space.toScreen(a0.map((x) => (x / n0) * (1 + (G.A - 1) * 0.55))));
  if (space.wrongNow) place(pin("wrong"), ...space.toScreen(space.wrongNow[0]));
  // Question marks riding sphere 1
  const qa = qAngle.a;
  [[-1, 0.1 * Math.sin(qa), 0.3], [1, 0.05 - 0.1 * Math.sin(qa), 0.3], [0.45 + 0.1 * Math.sin(qa), -0.75, 0.5]].forEach((d, k) => place(pin(`q${k + 1}`), ...space.toScreen(sphereDot(0, d))));
  // The stopwatch: the signal's travel time, read from its shell
  const sig = SIGNALS[W.delay];
  if (sig) {
    const f = Math.max(0, Math.min(1, (t - sig.t0) / sig.dur));
    const text = (f * 0.0674).toFixed(3);
    if (delayEl.textContent !== text) delayEl.textContent = text;
  }
  // The close-up clock runs in real time
  const clock = `10:24:${(31 + Math.max(0, t - s.s03.start)).toFixed(4).padStart(7, "0")}`;
  if (clockEl.textContent !== clock) clockEl.textContent = clock;
  // The light pulse on the ruler: 300 m in 1 µs
  const x = 210 + 1500 * ruler.f;
  pulseEl.setAttribute("cx", x.toFixed(1));
  trailEl.setAttribute("width", Math.max(0, x - 210).toFixed(1));
  const us = (ruler.f * 1).toFixed(2);
  if (usEl.textContent !== us) usEl.textContent = us;
  const dist = `${Math.round(ruler.f * 299.79)} m`;
  if (distEl.textContent !== dist) distEl.textContent = dist;
  distEl.style.left = `${x.toFixed(1)}px`;
  const corr = corrFmt(M.bias);
  if (corrEl.textContent !== corr) corrEl.textContent = corr;
});

// ── Helpers ──────────────────────────────────────────────────────────────────
const go = (frame, t0, d = 0.8, ease = "power3.inOut", more = {}) => tl.to(E, { ...F[frame], ...more, duration: d, ease }, t0);
const fadeIn = (sel, t0, d = 0.3) => tl.fromTo(sel, { autoAlpha: 0 }, { autoAlpha: 1, duration: d, ease: "power1.out", immediateRender: false }, t0);
const fadeOut = (sel, t0, d = 0.3) => tl.to(sel, { autoAlpha: 0, duration: d, ease: "power1.in" }, t0);
const popIn = (sel, t0) => {
  gsap.set(sel, { autoAlpha: 0 });
  tl.fromTo(sel, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2)", immediateRender: false }, t0);
};
// A point of light on the stage where something happens (the stage's flash and ring).
const hitAt = (t0, [x, y], strength = 0.6, ring = 0.35, colour = AMBER) => {
  tl.set(stage, { lx: x / 1920, ly: 1 - y / 1080 }, t0);
  tl.set("#flash", { "--fx": `${(x / 1920) * 100}%`, "--fy": `${(y / 1080) * 100}%` }, t0);
  film.tintTo(colour, t0, 0.1);
  film.hit(t0, strength, ring);
};
const P_AT = (frame) => {
  const f = G.framings[frame];
  return [f.c[0] + G.P[0] * f.r, f.c[1] - G.P[1] * f.r];
};

film.captions();
film.chapters({ from: s.s03.start, until: s.s17.start });
gsap.set("#pins .pin", { autoAlpha: 0 });
Object.assign(stage, { lx: 0.62, ly: 0.62, glow: 0.35, floor: 0, silk: 0.45, horizon: -0.6 });
film.tintTo(CYAN, 0, 0.01);

// ── s01: the question, over the real Earth ───────────────────────────────────
film.scene("#s01", 0, s.s02.start);
tl.to(E, { size: F.HOOK.size * 1.05, y: F.HOOK.y + 20, duration: s.s01.dur - 0.5, ease: "none" }, 0);
tl.set(M.you, { a: 1, px: 11 }, 0);
tl.set("#pin-you", { autoAlpha: 0 }, 0);
// Shells from the four satellites (all far above the frame) sweep down over the globe to you.
signal(0, -0.6, 1.5, 0.6);
signal(1, 0.1, 1.7, 0.6);
signal(2, 0.9, 1.6, 0.6);
signal(3, 1.6, 1.6, 0.6);
// A satellite glides across the top, close to the camera.
tl.set(M.flyby, { a: 1 }, 0);
tl.to(M.flyby, { x: -20, turn: 1.2, duration: s.s01.dur, ease: "none" }, 0);
tl.to(M.flyby, { a: 0, duration: 0.3 }, s.s01.end - 0.4);
const q1 = film.split("#q1");
const q2 = film.split("#q2");
film.typeIn(q2, 0.55, { stagger: 0.03 });
film.sheen("#q", 1.6, 1.0);
film.typeOut([...q1, ...q2], s.s01.end - 0.45, { stagger: 0.006 });
film.light({ lx: 0.7, ly: 0.7, glow: 0.55 }, 0, 2.5);
// The dive: down into the dot.
go("DIVE", s.s01.end - 0.4, 1.0, "power3.inOut");
tl.to(M.you, { a: 0, duration: 0.3 }, s.s02.start + 0.2);

// ── s02: the phone only listens ──────────────────────────────────────────────
film.scene("#phone-scene", s.s02.start, s.s03.start);
tl.fromTo("#phone", { y: 60, scale: 0.92, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.6, ease: "expo.out", immediateRender: false }, s.s02.start + 0.1);
gsap.set("#me .ring", { scale: 0.3, opacity: 0 });
film.draw("#up .up", at("s02", 0.18), 0.5);
gsap.set("#up .up-head, #up-label", { autoAlpha: 0 });
tl.to("#up .up-head", { autoAlpha: 1, duration: 0.1 }, at("s02", 0.18) + 0.45);
film.draw("#up .strike", at("s02", 0.36), 0.22, "power2.out");
fadeIn("#up-label", at("s02", 0.38), 0.25);
tl.to("#up .up, #up .up-head, #up .strike, #up-label", { opacity: 0.25, duration: 0.4 }, at("s02", 0.62));
// Signals come down into the phone; it glints with each.
for (const [k, f] of [[0, 0.5], [1, 0.66], [3, 0.82]].entries()) {
  const [sat, frac] = f;
  const arrive = at("s02", frac);
  signal(sat, arrive - 0.9, 0.9, 0.35);
  tl.fromTo("#me .ring", { scale: 0.3, opacity: 0.9 }, { scale: 1.4, opacity: 0, duration: 0.7, ease: "power2.out", immediateRender: false }, arrive);
  tl.fromTo("#phone", { "--glint": 1 }, { "--glint": 0, duration: 0.5, immediateRender: false }, arrive);
  if (k === 0) hitAt(arrive, [960, 450], 0.25, 0.25, CYAN);
}
tl.to("#phone", { y: -40, opacity: 0, duration: 0.3, ease: "power2.in" }, s.s03.start - 0.3);
tl.set("#phone", { y: 0 }, s.s03.start);

// ── s03: what it hears is the time ───────────────────────────────────────────
film.scene("#s03", s.s03.start, s.s04.start);
// The camera has followed a signal up: the Earth's curve below, one satellite close.
tl.set(E, { x: 0, y: 2700, size: 4800 }, s.s03.start);
tl.to(E, { y: 2620, duration: s.s03.dur, ease: "none" }, s.s03.start);
tl.set(M.close, { a: 1 }, s.s03.start);
tl.fromTo(M.close, { y: 220, size: 120 }, { y: -60, size: 150, duration: 0.6, ease: "expo.out", immediateRender: false }, s.s03.start);
tl.to(M.close, { turn: -0.25, duration: s.s03.dur, ease: "none" }, s.s03.start);
film.land("#timechip", s.s03.start + 0.25, { from: 20 });
film.land("#atomic", at("s03", 0.45), { from: 14 });
film.light({ lx: 0.4, ly: 0.6, glow: 0.7 }, s.s03.start, 0.5);
tl.to(M.close, { size: 40, y: 0, a: 0, duration: 0.45, ease: "power3.in" }, s.s04.start - 0.35);
fadeOut("#timechip, #atomic", s.s04.start - 0.3, 0.25);

// ── s04: over thirty satellites ──────────────────────────────────────────────
film.scene("#s04", s.s04.start, s.s05.start + 0.4);
tl.set(E, { ...F.WIDE, size: F.WIDE.size * 1.6 }, s.s04.start);
tl.to(E, { ...F.WIDE, duration: 1.0, ease: "expo.out" }, s.s04.start);
tl.set(M, { satPx: 30 }, s.s04.start);
tl.fromTo(M, { fleet: 0, orbits: 0 }, { fleet: 1, orbits: 1, duration: 0.5, immediateRender: false }, s.s04.start);
tl.fromTo(M, { orbitTurn: 0 }, { orbitTurn: 0.55, duration: s.s04.dur + s.s05.dur, ease: "none", immediateRender: false }, s.s04.start);
popIn("#count", at("s04", 0.35));
film.land("#orbits", at("s04", 0.45), { from: 12 });
fadeIn("#note", at("s04", 0.3), 0.4);
film.light({ lx: 0.5, ly: 0.55, glow: 0.45 }, s.s04.start, 0.6);
fadeOut("#count, #orbits, #note", s.s05.start + 0.05, 0.3);

// ── s05: 20,200 km up ────────────────────────────────────────────────────────
go("ALTV", s.s05.start - 0.1, 0.8);
tl.to(M, { fleet: 0, orbits: 0, duration: 0.5 }, s.s05.start + 0.1);
tl.to(M, { shell: 1, duration: 0.5 }, s.s05.start + 0.15);
tl.to(M.alt, { p: 1, duration: 0.6, ease: "power2.inOut" }, s.s05.start + 0.3);
fadeIn("#pin-alt", s.s05.start + 0.8, 0.25);
tl.set(M.you, { a: 1, px: 6 }, s.s05.start);
fadeIn("#pin-you", s.s05.start + 0.3, 0.3);
M.hero.forEach((h, i) => tl.to(h, { a: 1, duration: 0.3 }, at("s05", 0.55) + i * 0.06));
tl.set(M, { satPx: 80 }, s.s05.start + 0.65); // after the fleet has faded: only the four are drawn this large

// ── s06: a fifteenth of a second ─────────────────────────────────────────────
film.scene("#mech", s.s06.start, s.s09.start + 0.3);
go("MECH", s.s06.start - 0.05, 0.8);
tl.to(M, { shell: 0, duration: 0.4 }, s.s06.start);
tl.to(M.alt, { p: 0, duration: 0.3 }, s.s06.start);
fadeOut("#pin-alt", s.s06.start, 0.2);
["s1", "s2", "s3", "s4"].forEach((id, i) => popIn(`#pin-${id}`, s.s06.start + 0.4 + i * 0.07));
film.land("#watch", s.s06.start + 0.35, { from: 20 });
const T_SIG = at("s06", 0.28);
const T_ARR = at("s06", 0.86);
W.delay = SIGNALS.length;
signal(0, T_SIG, T_ARR - T_SIG, 0.5);
hitAt(T_ARR, P_AT("MECH"), 0.4, 0.3, AMBER);
tl.fromTo(M.you, { px: 6 }, { px: 9, duration: 0.25, yoyo: true, repeat: 1, immediateRender: false }, T_ARR);
film.light({ lx: 0.5, ly: 0.75, glow: 0.5 }, T_SIG, T_ARR - T_SIG, "none");
film.tintTo(CYAN, T_ARR + 0.3, 0.5);

// ── s07, s08: the sum, the distance ──────────────────────────────────────────
tl.to("#watch", { autoAlpha: 0, x: 40, y: -60, scale: 0.8, duration: 0.35, ease: "power2.in" }, s.s07.start);
film.land("#sum", s.s07.start + 0.1, { from: 20 });
gsap.set("#sum-b, #sum-c", { autoAlpha: 0 });
popIn("#sum-b", at("s07", 0.3));
popIn("#sum-c", s.s08.start + 0.05);
tl.to(M.measure, { p: 1, duration: 0.7, ease: "power2.inOut" }, s.s08.start + 0.15);
fadeIn("#pin-meas", s.s08.start + 0.75, 0.25);
film.sheen("#sum", s.s08.start + 0.3, 0.8);

// ── s09: one distance is a sphere ────────────────────────────────────────────
fadeOut("#sum", s.s09.start, 0.3);
fadeOut("#pin-meas", s.s09.start, 0.2);
tl.to(M.measure, { p: 0, duration: 0.35, ease: "power2.in" }, s.s09.start + 0.3);
tl.fromTo(M.sph[0], { a: 0, g: 0.96 }, { a: 1, g: 1, duration: 0.7, ease: "power2.out", immediateRender: false }, s.s09.start + 0.15);
["q1", "q2", "q3"].forEach((id, k) => popIn(`#pin-${id}`, at("s09", 0.45) + k * 0.12));
tl.to(qAngle, { a: 2.4, duration: s.s09.dur, ease: "sine.inOut" }, s.s09.start);
fadeOut("#pin-q1, #pin-q2, #pin-q3", s.s10.start + 0.1, 0.25);
fadeOut("#pin-you", s.s09.start + 0.4, 0.2);
fadeIn("#pin-you", s.s10.start, 0.2);

// ── s10: two spheres cross in a circle ───────────────────────────────────────
tl.fromTo(M.sph[1], { a: 1, g: 0 }, { g: 1, duration: 1.1, ease: "power2.inOut", immediateRender: false }, s.s10.start + 0.05);
tl.set(M.circ[0], { a: 1 }, at("s10", 0.5));
tl.to(M.circ[0], { d: 1, duration: 0.9, ease: "power2.inOut" }, at("s10", 0.5));
tl.to(M.sph[0], { a: 0.75, duration: 0.6 }, s.s10.start);

// ── s11: a third leaves two points ───────────────────────────────────────────
tl.fromTo(M.sph[2], { a: 1, g: 0 }, { g: 1, duration: 1.0, ease: "power2.inOut", immediateRender: false }, s.s11.start + 0.05);
tl.to([M.sph[0], M.sph[1]], { a: 0.6, duration: 0.6 }, s.s11.start);
tl.to(M.circ[0], { a: 0, duration: 0.4 }, at("s11", 0.48));
tl.fromTo(M.other, { a: 0 }, { a: 1, duration: 0.2, immediateRender: false }, at("s11", 0.46));
popIn("#pin-other", at("s11", 0.5));
hitAt(at("s11", 0.46), P_AT("MECH"), 0.3, 0.25);

// ── s12: light covers 300 m in a millionth of a second ───────────────────────
film.scene("#s12", s.s12.start, s.s13.start);
tl.to(E, { vis: 0.16, duration: 0.25 }, s.s12.start - 0.15);
tl.to(M.sph, { a: 0, duration: 0.2 }, s.s12.start - 0.15);
fadeOut("#pin-other, #pin-you, #pin-s1, #pin-s2, #pin-s3, #pin-s4", s.s12.start - 0.15, 0.2);
fadeOut("#mech", s.s12.start - 0.15, 0.15);
tl.fromTo("#s12 .ink, #lightwatch", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "expo.out", immediateRender: false }, s.s12.start);
tl.fromTo(ruler, { f: 0 }, { f: 1, duration: at("s12", 0.82) - at("s12", 0.3), ease: "none", immediateRender: false }, at("s12", 0.3));
fadeIn("#dist", at("s12", 0.3), 0.2);
hitAt(at("s12", 0.82), [1710, 621], 0.35, 0.3, CYAN);
film.light({ lx: 0.5, ly: 0.45, glow: 0.6 }, s.s12.start, 0.4);

// ── s13: the phone's clock is off ────────────────────────────────────────────
tl.set(M.other, { a: 0 }, s.s13.start);
tl.set(E, { vis: 1, ...F.MECH }, s.s13.start - 0.01);
go("ZOOM", s.s13.start, 0.8, "power3.out");
// A slow push on you while the clock is worked out; you stay at the same place on screen.
const PUSH = 1.06;
tl.to(E, { size: F.ZOOM.size * PUSH, y: F.ZOOM.y + (G.P[1] * F.ZOOM.size * (PUSH - 1)) / 2, duration: s.s17.start - 0.25 - (s.s13.start + 0.8), ease: "none" }, s.s13.start + 0.8);
tl.set([M.sph[0], M.sph[1], M.sph[2]], { a: 0.5 }, s.s13.start);
tl.set(M, { circleW: 4.2 }, s.s13.start);
for (const k of [0, 1, 2]) tl.set(M.circ[k], { a: 1, d: 1 }, s.s13.start);
tl.set(M.you, { a: 1, px: 4.5 }, s.s13.start);
fadeIn("#pin-you", s.s13.start + 0.6, 0.3);
film.scene("#clockscene", s.s13.start, s.s17.start);
gsap.set("#fast, #short, #dial", { autoAlpha: 0 });
popIn("#fast", at("s13", 0.3));
film.land("#short", at("s13", 0.38), { from: 12 });
tl.to(M, { bias: G.bias, duration: at("s13", 0.88) - at("s13", 0.42), ease: "power2.inOut" }, at("s13", 0.42));
tl.fromTo(M.wrong[0], { a: 0 }, { a: 1, duration: 0.2, immediateRender: false }, at("s13", 0.42));
fadeIn("#pin-wrong", at("s13", 0.75), 0.25);
tl.to(M.you, { a: 0.85, duration: 0.4 }, at("s13", 0.6));

// ── s14: a fourth sphere ─────────────────────────────────────────────────────
fadeOut("#pin-wrong", s.s14.start, 0.2);
tl.fromTo(M.sph[3], { a: 0.5, g: 0.85 }, { g: 1, duration: 0.8, ease: "power2.out", immediateRender: false }, s.s14.start + 0.05);
[3, 4, 5].forEach((k, j) => {
  tl.set(M.circ[k], { a: 1 }, s.s14.start + 0.1 + j * 0.15);
  tl.to(M.circ[k], { d: 1, duration: 0.7, ease: "power2.inOut" }, s.s14.start + 0.1 + j * 0.15);
});
[1, 2, 3].forEach((k, j) => tl.fromTo(M.wrong[k], { a: 0 }, { a: 1, duration: 0.15, immediateRender: false }, at("s14", 0.5) + j * 0.18));

// ── s15, s16: one correction fits all four ───────────────────────────────────
fadeOut("#fast, #short", s.s15.start, 0.25);
popIn("#dial", s.s15.start + 0.1);
tl.to(M, { bias: G.bias * 0.04, duration: s.s15.dur - 0.35, ease: "power2.inOut" }, s.s15.start + 0.3);
tl.set(M, { bias: 0 }, s.s16.start);
tl.to(M.wrong, { a: 0, duration: 0.15 }, s.s16.start);
tl.to(M.you, { a: 1, px: 7, duration: 0.25, ease: "back.out(2)" }, s.s16.start);
tl.fromTo("#pin-lock", { autoAlpha: 0, scale: 1.8 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "expo.out", immediateRender: false }, s.s16.start);
popIn("#pin-here", s.s16.start + 0.25);
tl.to("#fixed", { opacity: 1, duration: 0.2 }, s.s16.start + 0.05);
hitAt(s.s16.start, P_AT("ZOOM"), 0.75, 0.45, AMBER);
fadeOut("#pin-you", s.s16.start, 0.15);

// ── s17: that's how your phone finds you ─────────────────────────────────────
fadeOut("#pin-lock, #pin-here, #dial", s.s17.start - 0.2, 0.2);
for (const k of [0, 1, 2, 3, 4, 5]) tl.to(M.circ[k], { a: 0, duration: 0.25 }, s.s17.start - 0.2);
tl.to(M.sph, { a: 0, duration: 0.25 }, s.s17.start - 0.2);
go("DIVE", s.s17.start - 0.25, 0.7);
film.scene("#phone-scene", s.s17.start, s.s18.start + 0.3);
tl.set("#up", { autoAlpha: 0 }, s.s17.start);
tl.set("#up-label", { autoAlpha: 0 }, s.s17.start);
tl.fromTo("#phone", { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "expo.out", immediateRender: false }, s.s17.start);
tl.fromTo("#me .ring", { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)", immediateRender: false }, at("s17", 0.45));
M.thread.forEach((o, i) => tl.fromTo(o, { p: 0 }, { p: 1, duration: 0.6, ease: "power2.out", immediateRender: false }, at("s17", 0.3) + i * 0.1));
hitAt(at("s17", 0.45), [960, 450], 0.3, 0.3, AMBER);

// ── s18: four clocks in the sky ──────────────────────────────────────────────
tl.to("#phone", { y: 80, opacity: 0, duration: 0.3, ease: "power2.in" }, s.s18.start - 0.05);
go("MECH", s.s18.start - 0.05, 0.9);
tl.set(M.you, { a: 1, px: 7 }, s.s18.start);
fadeIn("#pin-you", s.s18.start + 0.6, 0.3);
tl.fromTo(M, { threadPulse: 0 }, { threadPulse: 3, duration: s.s18.dur + s.s19.dur, ease: "none", immediateRender: false }, s.s18.start);
["c1", "c2", "c3", "c4"].forEach((id, i) => popIn(`#pin-${id}`, at("s18", 0.35) + i * 0.15));

// ── s19: the recap and the line to remember ──────────────────────────────────
film.scene("#s19", s.s19.start, D + 1);
fadeOut("#pin-you, #pin-c1, #pin-c2, #pin-c3, #pin-c4", s.s19.start - 0.1, 0.25);
tl.to(M.hero, { a: 0, duration: 0.4 }, s.s19.start);
tl.to(M.thread, { p: 0, duration: 0.4 }, s.s19.start);
tl.to(E, { x: 0, y: 1230, size: 1900, duration: 1.0, ease: "power3.inOut" }, s.s19.start - 0.1);
tl.to(E, { y: 1200, duration: s.s19.dur - 0.9, ease: "none" }, s.s19.start + 0.9);
["#card1", "#card2", "#card3"].forEach((c, i) => film.land(c, s.s19.start + 0.05 + i * 0.12, { from: 60 }));
const p1 = film.split("#p1");
const p2 = film.split("#p2");
film.typeIn(p1, s.s19.start + 0.45, { stagger: 0.015 });
film.typeIn(p2, s.s19.start + 0.8, { stagger: 0.015 });
film.sheen("#poster", s.s19.start + 1.6, 1.1);
tl.to("#s19 .cards", { scale: 1.02, duration: s.s19.dur, ease: "none", transformOrigin: "50% 0%" }, s.s19.start);
film.light({ lx: 0.5, ly: 0.35, glow: 0.6 }, s.s19.start, 1.0);
film.tintTo(AMBER, s.s19.start + 0.8, 1.0);

film.finish();
