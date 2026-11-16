// Why do traffic jams appear out of nowhere? Every time below comes from storyboard.json (cut to the take), every
// word time from voice/voice.json, and every car from sim.json (sim.py): the film only chooses the camera and the
// model time it shows.
import { createFilm } from "../../kit/engine/motion.js";
import { createWorld } from "./ring.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, stage, shots: s } = film;
const world = await createWorld($("#world"));
const { W, sim, L, N, R } = world;
const norm = (w) => w.toLowerCase().replace(/[^a-z-]/g, "");
const said = (id, word, nth = 0) => {
  const hits = (film.voiced[id]?.words ?? []).filter((w) => norm(w[2]) === norm(word));
  return hits[nth]?.[0] ?? s[id].start;
};
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const DEG = 180 / Math.PI;

film.captions();

// ── Helpers on the world ─────────────────────────────────────────────────
// Play the model from t0 to t1 over the film window [a, b] (straight line: the model's own time, at one rate).
const play = (src, t0, t1, a, b) => {
  tl.set(W, { src, simT: t0 }, a);
  tl.to(W, { simT: t1, duration: b - a, ease: "none" }, a);
};
const cam = (vars, at, d = 0, ease = "power2.inOut") => (d ? tl.to(W.cam, { ...vars, duration: d, ease }, at) : tl.set(W.cam, vars, at));
const set = (vars, at) => tl.set(W, vars, at);
const jam = (src, t) => world.jamAt(src, t);
const roadDeg = (u) => (u / R) * DEG; // the ring's angle at a place (k = 1)

// A tag that rides above a car: shown and hidden on the timeline, placed every frame.
const riders = [];
function ride(sel, car, { dy = -14, y = 2.4, num } = {}) {
  const el = $(sel);
  const r = { el, car: typeof car === "function" ? car : () => car, dy, y, num: num && $(num) };
  riders.push(r);
  return r;
}
const showTag = (sel, a, b) => {
  tl.fromTo(sel, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.25, ease: "back.out(2)", immediateRender: false }, a);
  tl.to(sel, { autoAlpha: 0, duration: 0.2 }, b - 0.2);
};
const strike = (sel, at) => tl.fromTo(sel, { scaleX: 0 }, { scaleX: 1, duration: 0.32, ease: "power2.out", immediateRender: false }, at);
const chipIn = (sel, at, vars = {}) => tl.fromTo(sel, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "back.out(1.8)", immediateRender: false, ...vars }, at);

// ── s01 to s03: a jam on an open road (the model's ring, opened out into a straight road) ──────────────────
// The queue's front sits 15 m ahead of the anchor; the camera starts low, behind the queue, looking along it.
const T_HOOK = 70;
const hook = jam(1, T_HOOK);
const HOOK_ANCHOR = hook.head - 15;
set({ k: 0, outer: 1, src: 1, anchor: HOOK_ANCHOR, follow: -1, followMix: 0, shiftX: 0, shiftY: 0, dim: 0 }, 0);
Object.assign(W, { k: 0, outer: 1, src: 1, simT: T_HOOK, anchor: HOOK_ANCHOR });
Object.assign(W.cam, { tx: -34, ty: 1.2, tz: R + 1.5, dist: 24, elev: 8, azim: -70, fov: 34 });
play(1, T_HOOK, T_HOOK + s.s03.end, 0, s.s03.end);
cam({ tx: -22, dist: 22, elev: 9, azim: -74 }, 0, s.s01.end, "none");
// s02: fly forward along the queue, past its front, out over the clear road
cam({ tx: 40, ty: 1.5, dist: 30, elev: 13, azim: -84 }, s.s02.start, s.s02.dur + 0.4, "power2.inOut");
// s03: rise above the front and look down the road ahead
cam({ tx: 78, dist: 46, elev: 24, azim: -88 }, s.s03.start + 0.3, s.s03.dur - 0.2, "power2.inOut");

film.scene("#s01", 0, s.s02.start + 0.35);
film.typeIn(film.split("#q"), 0.06, { stagger: 0.016, duration: 0.5 });
film.sheen("#q", 1.5, 1.0);
tl.to("#q", { y: -60, autoAlpha: 0, duration: 0.45, ease: "power3.in" }, s.s02.start - 0.05);

film.scene("#s03", s.s03.start, s.s04.start);
chipIn("#noCrash", said("s03", "no") - 0.05);
strike("#noCrash i", said("s03", "crash") + 0.15);
chipIn("#noWorks", said("s03", "no", 1) - 0.05);
strike("#noWorks i", said("s03", "roadworks") + 0.3);
tl.to("#s03 .chip", { autoAlpha: 0, y: -16, duration: 0.25 }, s.s04.start - 0.25);

// ── s04, s05: the same road from high and side on, packed with cars; then the jam forms among them ─────────
// s04: the model before anything happens (all cruising at 30 km/h, 5.95 m apart); s05: the same run 16 s in,
// as the slowdown that started at 5 s reaches the cars that stop.
set({ src: 1, anchor: 0, k: 0, outer: 1 }, s.s04.start);
cam({ tx: 6, ty: 0, tz: R, dist: 44, elev: 26, azim: -38, fov: 30 }, s.s04.start);
cam({ dist: 38, elev: 24, azim: -32 }, s.s04.start, s.s04.dur, "power1.inOut");
play(1, 0.6, 0.6 + s.s04.dur, s.s04.start, s.s04.end);
// s05: frame the forming cluster: the car that will stop first (car 4) and those just ahead of it
const FORM_T = 15.6;
const formAnchor = world.sample(1, 6, FORM_T + 1).s;
set({ anchor: formAnchor }, s.s05.start);
cam({ tx: 0, tz: R, dist: 40, elev: 22, azim: -58 }, s.s05.start);
cam({ dist: 35, azim: -52 }, s.s05.start, s.s05.dur, "power1.inOut");
play(1, FORM_T, FORM_T + s.s05.dur, s.s05.start, s.s05.end);

// The 6 m gap: two cars side by side in the middle of the s04 picture, bracketed on "close together".
const gapCars = () => {
  // the two cars nearest the picture's middle (u nearest 0)
  let best = 0, bu = 1e9;
  for (let i = 0; i < N; i++) if (Math.abs(world.now[i].u - 3) < bu) [best, bu] = [i, Math.abs(world.now[i].u - 3)];
  return best;
};
const gapTag = ride("#tagGap", gapCars, { y: 3.2 });
gapTag.between = true;
showTag("#tagGap", said("s04", "close") - 0.05, s.s04.end);

// ── s06: the road curls into the test track ───────────────────────────────────────────────────────────────
set({ src: 0, anchor: 0 }, s.s06.start);
play(0, 0, s.s10.start - s.s06.start, s.s06.start, s.s10.start);
cam({ tx: 0, ty: 0, tz: R, dist: 110, elev: 30, azim: -6, fov: 30 }, s.s06.start);
tl.to(W, { k: 1, duration: 2.5, ease: "power2.inOut" }, s.s06.start + 0.15);
tl.to(W, { outer: 0, duration: 0.6, ease: "power1.in" }, s.s06.start + 0.1);
cam({ tz: 0, dist: 140, elev: 33, azim: 0 }, s.s06.start + 0.15, 2.6, "power2.inOut");
tl.to(W, { shiftY: -110, duration: 2.6, ease: "power2.inOut" }, s.s06.start + 0.15);
film.scene("#srcSugi", said("s06", "japanese") - 0.1, s.s10.start);
chipIn("#srcSugi .chip", said("s06", "japanese") - 0.1);

// s07: the setup in numbers; a slow orbit
const RING = { tx: 0, ty: 0, tz: 0, dist: 140, elev: 33, fov: 30 };
cam({ azim: 16 }, s.s07.start, s.s07.dur + s.s08.dur * 0, "power1.inOut");
film.scene("#setup", s.s07.start, s.s08.start);
chipIn("#c22", said("s07", "twenty-two") - 0.05);
chipIn("#c230", said("s07", "two") - 0.05);
// the lap: a dashed cyan line drawn round the outside of the lane as "two hundred and thirty metres" is said
const lap = { a: 0, on: 0 };
tl.set(lap, { on: 1 }, said("s07", "two") - 0.1);
tl.to(lap, { a: 1, duration: 1.5, ease: "power2.inOut" }, said("s07", "two") - 0.1);
tl.set(lap, { on: 0 }, s.s08.start);

// s08: low alongside the cars, at their speed: every one at 30 km/h
const FOLLOW8 = 3;
set({ follow: FOLLOW8, followMix: 1, lead: 4, azFollow: 1, shiftY: 0 }, s.s08.start);
cam({ ty: 0.8, dist: 21, elev: 9, azim: 8, fov: 32 }, s.s08.start);
cam({ dist: 19, azim: 2 }, s.s08.start, s.s08.dur, "none");
set({ follow: -1, followMix: 0, azFollow: 0, shiftY: -110 }, s.s09.start);
ride("#tagA", FOLLOW8, { num: "#tagA b" });
ride("#tagB", FOLLOW8 + 1, { num: "#tagB b" });
ride("#tagC", FOLLOW8 - 1, { num: "#tagC b" });
for (const [sel, k] of [["#tagA", 0], ["#tagB", 1], ["#tagC", 2]]) showTag(sel, said("s08", "thirty") - 0.1 + k * 0.08, s.s09.start);
film.scene("#rule", s.s08.start, s.s09.start);
chipIn("#rule .chip", said("s08", "everyone") - 0.05);

// s09: low orbit over the infield
cam({ ...RING, dist: 110, elev: 17, azim: 40 }, s.s09.start);
cam({ azim: 62 }, s.s09.start, s.s09.dur, "none");
film.scene("#nobot", s.s09.start, s.s10.start);
chipIn("#nobot .chip", said("s09", "no") - 0.05);
strike("#nobot i", said("s09", "bottleneck") + 0.25);

// ── s10: minutes later, the jam ──────────────────────────────────────────────────────────────────────────────
const T10 = 62;
const j10 = jam(1, T10 + 1.5);
set({ anchor: j10.mid - 50, shiftY: -110 }, s.s10.start);
play(1, T10, T10 + s.s10.dur, s.s10.start, s.s10.end);
cam({ ...RING, dist: 146, elev: 34, azim: 0 }, s.s10.start);
cam({ dist: 128, elev: 32, azim: -6 }, s.s10.start, s.s10.dur, "power1.inOut");
film.hit(s.s10.start, 0.5, 0.2);
film.scene("#later", s.s10.start, s.s11.start);
chipIn("#later .chip", s.s10.start + 0.1);
const midStopped = () => jam(1, W.simT)?.headCar ?? 0;
const j10car = j10.headCar;
let midCar10 = j10car;
{
  const at = jam(1, T10 + 1.6);
  const ids = [];
  for (let i = 0; i < N; i++) if (world.sample(1, i, T10 + 1.6).v < 0.3 && world.sample(1, i, T10 + 2.6).v < 0.3) ids.push(i);
  midCar10 = ids[Math.floor(ids.length / 2)] ?? at.headCar;
}
showTag("#tagStop", said("s10", "stopping") - 0.05, s.s11.start);

// ── s11 to s13: why: one driver eases off, the slowdown grows car by car (model time × RATE) ─────────────────
// The model's time runs at one rate from s11 to the end of s13, so the driver easing off (5 s) lands on "One" and
// the first car to stop (the 19th driver, 19.7 s) on "stops".
const T_TAP = sim.tap[0];
const T_STOP = sim.measured.first_stop_s;
const RATE = (T_STOP - T_TAP) / (said("s13", "stops") - said("s11", "one"));
const t11 = T_TAP - (said("s11", "one") - s.s11.start) * RATE;
play(1, t11, t11 + (s.s13.end - s.s11.start) * RATE, s.s11.start, s.s13.end);
set({ anchor: world.sample(1, 0, 6).s - 12, shiftX: -420, shiftY: -90, mark: 0 }, s.s11.start);
cam({ ...RING, dist: 172, elev: 40, azim: -18 }, s.s11.start);
cam({ dist: 158, azim: -4 }, s.s11.start, s.s13.end - s.s11.start, "power1.inOut");
tl.fromTo(W, { markA: 0 }, { markA: 1, duration: 0.4, immediateRender: false }, s.s11.start + 0.2);
tl.to(W, { markA: 0, duration: 0.4 }, s.s12.start + 1.2);
set({ shiftX: 0, shiftY: 0, mark: -1 }, s.s14.start);
ride("#tagMark", 0, { num: "#markNum", live: true });
riders.at(-1).live = true;
showTag("#tagMark", said("s11", "one") - 0.3, s.s12.start + 1.4);
film.scene("#chain", said("s11", "little") - 0.25, s.s14.start);
tl.fromTo("#chainPanel", { autoAlpha: 0, x: 80 }, { autoAlpha: 1, x: 0, duration: 0.5, ease: "expo.out", immediateRender: false }, said("s11", "little") - 0.25);
tl.to("#chainPanel", { autoAlpha: 0, x: 120, duration: 0.35, ease: "power3.in" }, s.s14.start - 0.35);
// The bars: one per driver, as tall as that driver's lowest speed, landing as the model reaches its dip.
const BAR = { x: 92, base: 440, w: 640, h: 380 };
{
  const svg = $("#bars");
  const bw = BAR.w / sim.dips.length;
  let html = `<line class="ax" x1="${BAR.x}" y1="${BAR.base}" x2="${BAR.x + BAR.w}" y2="${BAR.base}"/>`;
  html += `<line class="ax" x1="${BAR.x}" y1="${BAR.base - BAR.h}" x2="${BAR.x + BAR.w}" y2="${BAR.base - BAR.h}" stroke-dasharray="6 10"/>`;
  html += `<text x="${BAR.x - 12}" y="${BAR.base - BAR.h + 10}" text-anchor="end">30</text><text x="${BAR.x - 12}" y="${BAR.base + 10}" text-anchor="end">0</text>`;
  html += `<text x="${BAR.x - 12}" y="${BAR.base - BAR.h / 2 + 10}" text-anchor="end" style="font-size:28px">km/h</text>`;
  html += `<text x="${BAR.x}" y="${BAR.base + 52}">1st driver</text><text x="${BAR.x + BAR.w}" y="${BAR.base + 52}" text-anchor="end">19th</text>`;
  sim.dips.forEach(([t, car, v], i) => {
    const h = (BAR.h * v) / 30;
    const colour = v < 20 ? "#ff5a48" : i === 0 ? "#4fd0ff" : "#e6e6ec";
    html += `<rect id="bar${i}" opacity="0" x="${(BAR.x + i * bw + 4).toFixed(1)}" y="${(BAR.base - h).toFixed(1)}" width="${(bw - 8).toFixed(1)}" height="${Math.max(3, h).toFixed(1)}" rx="5" fill="${colour}"/>`;
  });
  html += `<text id="barStop" opacity="0" x="${BAR.x + BAR.w - bw / 2}" y="${BAR.base - 22}" text-anchor="middle" fill="#ff7a6b" style="fill:#ff7a6b;font-weight:700">0</text>`;
  svg.innerHTML = html;
  sim.dips.forEach(([t], i) => {
    const at = s.s11.start + (t - t11) / RATE;
    tl.fromTo(`#bar${i}`, { opacity: 0, scaleY: 0.2, transformOrigin: "50% 100%" }, { opacity: 1, scaleY: 1, duration: 0.28, ease: "back.out(1.6)", immediateRender: false }, at);
  });
  tl.fromTo("#barStop", { opacity: 0 }, { opacity: 1, duration: 0.2, immediateRender: false }, s.s11.start + (T_STOP - t11) / RATE);
}
// the first car to stop, tagged on the ring
const firstStopper = sim.dips.at(-1)[1];
ride("#tagStopped", firstStopper);
showTag("#tagStopped", said("s13", "stops"), s.s14.start);

// ── s14 to s15: the jam slides backwards while the cars drive forwards (real model time) ─────────────────────
const T14 = 100;
const j14 = jam(1, T14 + 3.5);
set({ anchor: j14.mid - 40, k: 1, outer: 0, shiftY: -110 }, s.s14.start);
play(1, T14, T14 + (s.s16.start - s.s14.start), s.s14.start, s.s16.start);
cam({ ...RING, dist: 142, elev: 40, azim: 0 }, s.s14.start);
cam({ dist: 130, azim: -6 }, s.s14.start, s.s16.start - s.s14.start, "power1.inOut");
tl.fromTo(W, { jamArc: 0 }, { jamArc: 1, duration: 0.5, immediateRender: false }, said("s15", "jam") - 0.1);
tl.to(W, { jamArc: 0, duration: 0.4 }, s.s16.start + 0.4);
const fwd = { on: 0 };
tl.to(fwd, { on: 1, duration: 0.4 }, said("s14", "forwards") - 0.3);
tl.to(fwd, { on: 0, duration: 0.3 }, s.s16.start);
const back = { on: 0, len: 0 };
tl.to(back, { on: 1, duration: 0.2 }, said("s15", "slides") - 0.1);
tl.to(back, { len: 1, duration: 0.8, ease: "power2.out" }, said("s15", "slides") - 0.1);
tl.to(back, { on: 0, duration: 0.3 }, s.s16.start);
film.scene("#jamSpeed", said("s15", "twenty") - 0.3, s.s16.start + 0.2);
chipIn("#jamChip", said("s15", "twenty") - 0.3);

// ── s16: every car's trace, time across, place up: the stopped stretches line up into a band sloping down ───
const TS = { t0: 70, t1: 130, x0: 120, x1: 1600, y0: 640, y1: 40 };
const tsCtx = $("#tsCanvas").getContext("2d");
const tsState = { cursor: 0, ref: 0 };
film.scene("#ts", s.s16.start - 0.15, s.s17.start);
tl.fromTo("#tsPanel", { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "expo.out", immediateRender: false }, s.s16.start - 0.15);
tl.to(W, { dim: 1, duration: 0.4 }, s.s16.start - 0.15);
tl.to(W, { dim: 0, duration: 0.3 }, s.s17.start);
tl.to(tsState, { cursor: 1, duration: said("s16", "real") - s.s16.start, ease: "power1.inOut" }, s.s16.start);
tl.to(tsState, { ref: 1, duration: 0.7, ease: "power2.out" }, said("s16", "real") - 0.05);
chipIn("#tsWave", said("s16", "stop-and-go"));
chipIn("#tsRef", said("s16", "real"));
// The jam's band: the slope through the middle of the stopped stretches (the model's own -18.5 km/h).
const tsX = (t) => TS.x0 + ((t - TS.t0) / (TS.t1 - TS.t0)) * (TS.x1 - TS.x0);
const tsY = (p) => TS.y0 + (p / L) * (TS.y1 - TS.y0);
const refPlace = jam(1, (TS.t0 + TS.t1) / 2).mid % L;
function drawTS() {
  const g = tsCtx;
  g.clearRect(0, 0, 1640, 700);
  // axes
  g.strokeStyle = "rgba(255,255,255,0.25)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(TS.x0, TS.y1);
  g.lineTo(TS.x0, TS.y0);
  g.lineTo(TS.x1, TS.y0);
  g.stroke();
  g.fillStyle = "#b9b9c1";
  g.font = "600 28px Inter Variable";
  g.textAlign = "right";
  g.fillText("0 m", TS.x0 - 14, TS.y0 + 8);
  g.fillText("230 m", TS.x0 - 14, TS.y1 + 22);
  g.textAlign = "center";
  for (let k = 0; k <= 60; k += 20) g.fillText(`${k} s`, tsX(TS.t0 + k), TS.y0 + 44);
  const tEnd = TS.t0 + (TS.t1 - TS.t0) * tsState.cursor;
  const run = sim.jam;
  const k0 = Math.round(TS.t0 / sim.rec), k1 = Math.round(tEnd / sim.rec);
  g.lineCap = "round";
  for (let i = 0; i < N; i++) {
    let prev = null;
    for (let k = k0; k <= k1; k++) {
      const p = ((run.x[k][i] % L) + L) % L;
      const stopped = run.v[k][i] < 2.5;
      const pt = [tsX(k * sim.rec), tsY(p)];
      if (prev && Math.abs(p - prev.p) < L / 2) {
        g.strokeStyle = stopped ? "#ff5a48" : i === 0 ? "rgba(255,255,255,0.95)" : "rgba(230,230,236,0.55)";
        g.lineWidth = stopped ? 7 : i === 0 ? 4 : 2.5;
        g.beginPath();
        g.moveTo(prev.pt[0], prev.pt[1]);
        g.lineTo(pt[0], pt[1]);
        g.stroke();
      }
      prev = { p, pt };
    }
  }
  // the dashed 20 km/h line, through the middle of the jam, wrapping round the ring
  if (tsState.ref > 0) {
    const tm = (TS.t0 + TS.t1) / 2;
    const v = -20 / 3.6;
    g.setLineDash([16, 14]);
    g.strokeStyle = "rgba(255,255,255,0.95)";
    g.lineWidth = 4;
    const tA = TS.t0, tB = TS.t0 + (TS.t1 - TS.t0) * tsState.ref;
    let last = null;
    g.beginPath();
    for (let t = tA; t <= tB + 1e-6; t += 0.25) {
      const p = (((refPlace + v * (t - tm)) % L) + L) % L;
      if (last !== null && Math.abs(p - last) > L / 2) {
        g.stroke();
        g.beginPath();
        g.moveTo(tsX(t), tsY(p));
      } else if (last === null) g.moveTo(tsX(t), tsY(p));
      else g.lineTo(tsX(t), tsY(p));
      last = p;
    }
    g.stroke();
    g.setLineDash([]);
  }
}

// ── s17: tailgating, close and side on: the car in front brakes hard, the one right behind copies it ─────────
const T17 = 96.6;
const LEAD17 = 17, TAIL17 = 16;
set({ anchor: world.sample(1, TAIL17, T17).s, follow: TAIL17, followMix: 1, lead: 5, azFollow: 1, k: 1, shiftY: 0 }, s.s17.start);
play(1, T17, T17 + s.s17.dur, s.s17.start, s.s17.end);
cam({ ty: 1.0, dist: 26, elev: 10, azim: 4, fov: 32 }, s.s17.start);
cam({ dist: 24, azim: 0 }, s.s17.start, s.s17.dur, "none");
ride("#tagTail", TAIL17);
showTag("#tagTail", s.s17.start + 0.4, s.s18.start);
film.scene("#tail", s.s17.start, s.s18.start);
chipIn("#tailChip", said("s17", "don't") - 0.05);
strike("#tailChip i", said("s17", "tailgate") + 0.3);

// ── s18, s19: you, with a big gap and a steady speed (the "absorb" run, model time × 3) ───────────────────
const YOU = sim.absorber;
const AHEAD = (YOU + 1) % N;
const T18 = 145;
const RATE18 = 3;
play(2, T18, T18 + (s.s20.start - s.s18.start) * RATE18, s.s18.start, s.s20.start);
set({ you: YOU, youA: 1, follow: YOU, followMix: 1, lead: 22, azFollow: 1, anchor: world.sample(2, YOU, T18).s }, s.s18.start);
cam({ ty: 1, dist: 70, elev: 22, azim: 8, fov: 32 }, s.s18.start);
cam({ dist: 78, elev: 24, azim: 2 }, s.s18.start, s.s20.start - s.s18.start, "power1.inOut");
ride("#tagYou", YOU, { num: "#youNum" });
riders.at(-1).live = true;
showTag("#tagYou", s.s18.start + 0.2, s.s20.start);
const gapOn = { on: 0 };
tl.to(gapOn, { on: 1, duration: 0.3 }, said("s18", "gap") - 0.1);
tl.to(gapOn, { on: 0, duration: 0.3 }, s.s20.start - 0.3);
showTag("#tagGapYou", said("s18", "gap") - 0.1, s.s20.start);
film.scene("#advice", s.s18.start, s.s19.start + 0.6);
chipIn("#adv1", said("s18", "big") - 0.1);
chipIn("#adv2", said("s18", "steady") - 0.1);
tl.to("#advice .chip", { autoAlpha: 0, duration: 0.3 }, s.s19.start + 0.3);
ride("#tagStop", () => (W.src === 2 ? AHEAD : midCar10));
showTag("#tagStop", said("s19", "brakes") - 0.4, said("s19", "shrink"));

// ── s20: three speeds in a row: the car ahead dives to zero and back, you and the car behind run flat ───────
const SP = { t0: 140, t1: 200, x0: 110, x1: 1520, y0: 500, y1: 40, vmax: 50 };
const spCtx = $("#spCanvas").getContext("2d");
const spState = { cursor: 0 };
film.scene("#speeds", s.s20.start - 0.15, s.s21.start);
tl.fromTo("#spPanel", { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "expo.out", immediateRender: false }, s.s20.start - 0.15);
tl.to(W, { dim: 1, duration: 0.4 }, s.s20.start - 0.15);
tl.to(W, { dim: 0, duration: 0.4 }, s.s21.start);
tl.to(spState, { cursor: 1, duration: s.s20.dur - 0.5, ease: "power1.inOut" }, s.s20.start);
function drawSP() {
  const g = spCtx;
  g.clearRect(0, 0, 1560, 560);
  const X = (t) => SP.x0 + ((t - SP.t0) / (SP.t1 - SP.t0)) * (SP.x1 - SP.x0);
  const Y = (v) => SP.y0 + (v / SP.vmax) * (SP.y1 - SP.y0);
  g.strokeStyle = "rgba(255,255,255,0.25)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(SP.x0, SP.y1);
  g.lineTo(SP.x0, SP.y0);
  g.lineTo(SP.x1, SP.y0);
  g.stroke();
  g.fillStyle = "#b9b9c1";
  g.font = "600 28px Inter Variable";
  g.textAlign = "right";
  for (const v of [0, 25, 50]) g.fillText(`${v}`, SP.x0 - 14, Y(v) + 9);
  g.save();
  g.translate(40, (SP.y0 + SP.y1) / 2);
  g.rotate(-Math.PI / 2);
  g.textAlign = "center";
  g.fillText("km/h", 0, 0);
  g.restore();
  g.textAlign = "center";
  for (let k = 0; k <= 60; k += 20) g.fillText(`${k} s`, X(SP.t0 + k), SP.y0 + 42);
  const run = sim.absorb;
  const tEnd = SP.t0 + (SP.t1 - SP.t0) * spState.cursor;
  const k0 = Math.round((SP.t0 - run.from) / sim.rec), k1 = Math.round((tEnd - run.from) / sim.rec);
  for (const [car, colour, width] of [[AHEAD, "rgba(236,236,242,0.95)", 5], [(YOU + N - 1) % N, "#8b8b95", 6], [YOU, "#4fd0ff", 6]]) {
    g.strokeStyle = colour;
    g.lineWidth = width;
    g.lineJoin = "round";
    g.beginPath();
    for (let k = k0; k <= k1; k++) {
      const t = run.from + k * sim.rec;
      const y = Y(run.v[k][car] * 3.6) + (car === YOU ? -3 : car === AHEAD ? 0 : 4);
      if (k === k0) g.moveTo(X(t), y);
      else g.lineTo(X(t), y);
    }
    g.stroke();
  }
}

// ── s21 to s23: one car with a computer on the pedals, and the ring calms (model time × 8) ────────────────────
const T21 = 141;
const RATE21 = 8;
play(2, T21, T21 + (s.s24.start - s.s21.start) * RATE21, s.s21.start, s.s24.start);
set({ follow: -1, followMix: 0, azFollow: 0, anchor: world.sample(2, YOU, T21).s - 40, mark: YOU, you: YOU, youA: 1 }, s.s21.start);
set({ shiftY: -110 }, s.s21.start);
cam({ ...RING, dist: 142, elev: 38, azim: -10 }, s.s21.start);
cam({ dist: 132, azim: 14 }, s.s21.start, s.s24.start - s.s21.start, "power1.inOut");
tl.fromTo(W, { markA: 0 }, { markA: 1, duration: 0.4, immediateRender: false }, s.s21.start + 0.1);
tl.to(W, { markA: 0, duration: 0.4 }, s.s23.start);
ride("#tagAuto", YOU);
showTag("#tagAuto", said("s21", "computer") - 0.1, s.s22.end);
film.scene("#srcStern", s.s21.start, s.s23.start);
chipIn("#srcStern .chip", s.s21.start + 0.1);

// s23: the recap, over the calm ring
film.scene("#recap", s.s23.start, s.s24.start + 0.2);
tl.to(W, { dim: 0.8, duration: 0.4 }, s.s23.start);
tl.to(W, { dim: 0.15, duration: 0.4 }, s.s24.start);
["#r1", "#r2", "#r3"].forEach((sel, i) => {
  tl.fromTo(sel, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: "expo.out", immediateRender: false }, s.s23.start + 0.05 + i * 0.35);
  tl.to(sel, { autoAlpha: 0, y: -40, duration: 0.3, ease: "power3.in" }, s.s24.start - 0.1 + i * 0.05);
});
{
  // 1: the same bars, small
  const bw = 360 / sim.dips.length;
  let a = `<line x1="40" y1="230" x2="420" y2="230" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>`;
  sim.dips.forEach(([, , v], i) => {
    const h = (200 * v) / 30;
    a += `<rect x="${(50 + i * bw).toFixed(1)}" y="${(230 - h).toFixed(1)}" width="${(bw - 5).toFixed(1)}" height="${Math.max(3, h).toFixed(1)}" rx="3" fill="${v < 20 ? "#ff5a48" : i === 0 ? "#4fd0ff" : "#e6e6ec"}"/>`;
  });
  $("#r1svg").innerHTML = a;
  // 2: the ring, a red band of stopped cars and an arrow going back against the cars' cyan arrow
  let b = `<ellipse cx="220" cy="130" rx="170" ry="92" fill="none" stroke="#55565e" stroke-width="22"/>`;
  b += `<path d="M120 58 A170 92 0 0 1 300 50" fill="none" stroke="#ff5a48" stroke-width="22" stroke-linecap="round"/>`;
  b += `<path d="M290 214 A170 92 0 0 0 384 150" fill="none" stroke="#4fd0ff" stroke-width="6" marker-end="url(#ahc)"/>`;
  b += `<path d="M150 24 A190 106 0 0 0 64 62" fill="none" stroke="#ff5a48" stroke-width="8" marker-end="url(#ahr)"/>`;
  $("#r2svg").innerHTML = b;
  // 3: the cyan car with its gap, the car ahead braking
  let c = `<rect x="30" y="140" width="110" height="46" rx="14" fill="#4fd0ff"/><rect x="300" y="140" width="110" height="46" rx="14" fill="#e6e6ec"/>`;
  c += `<circle cx="300" cy="163" r="18" fill="#ff5a48" opacity="0.9"/>`;
  c += `<path d="M150 110 V130 M150 120 H290 M290 110 V130" stroke="#4fd0ff" stroke-width="5" fill="none"/><text x="220" y="96" text-anchor="middle" fill="#8fe4ff" style="font:600 30px Inter Variable">gap</text>`;
  $("#r3svg").innerHTML = c;
}

// ── s24, s25: the line to remember, over the calm ring ───────────────────────────────────────────────────────
const T24 = T21 + (s.s24.start - s.s21.start) * RATE21;
play(2, T24, T24 + (film.duration - s.s24.start), s.s24.start, film.duration);
cam({ ...RING, dist: 150, elev: 36, azim: 18 }, s.s24.start);
cam({ dist: 140, azim: 24 }, s.s24.start, film.duration - s.s24.start, "none");
set({ mark: YOU }, s.s24.start);
tl.to(W, { markA: 0.8, duration: 0.5 }, s.s24.start + 0.2);
film.scene("#poster", s.s24.start, film.duration);
film.typeIn(film.split("#line"), said("s24", "and") - 0.05, { stagger: 0.02 });
film.sheen("#line", said("s24", "you") + 0.3, 1.1);
film.hit(said("s24", "end") - 0.05, 0.4, 0.3);

// The model tag: on wherever cars are on screen without a source chip in its place.
tl.set("#model", { autoAlpha: 1 }, 0.4);
tl.set("#model", { autoAlpha: 0 }, s.s16.start - 0.15);
tl.set("#model", { autoAlpha: 1 }, s.s17.start);
tl.set("#model", { autoAlpha: 0 }, s.s20.start - 0.15);
tl.set("#model", { autoAlpha: 1 }, s.s21.start);
tl.set("#model", { autoAlpha: 0 }, s.s23.start);
// in the s11 to s13 stretch the model runs faster than real time: say by how much
gsap.set("#sped", { autoAlpha: 1 });
gsap.set("#spedChip", { autoAlpha: 0 });
tl.set("#spedChip", { autoAlpha: 1 }, s.s11.start);
tl.set("#spedChip", { autoAlpha: 0 }, s.s14.start);
tl.set("#spedChip", { autoAlpha: 1 }, s.s18.start);
tl.set("#spedChip", { autoAlpha: 0 }, s.s20.start);
tl.set("#spedChip", { autoAlpha: 1 }, s.s21.start);
tl.set("#spedChip", { autoAlpha: 0 }, s.s24.start);

// ── The stage light follows the story: cool on the open road, red over the jam, cyan as it calms ─────────────
Object.assign(stage, { lx: 0.5, ly: 0.62, glow: 0.35, floor: 0.4, silk: 0.5 });
film.tintTo("#ff5a48", 0, 0.1);
film.tintTo("#7a8cff", s.s06.start, 1.0);
film.tintTo("#ff5a48", s.s10.start, 0.6);
film.tintTo("#ff5a48", s.s12.start, 0.6);
film.tintTo("#4fd0ff", s.s18.start, 1.0);
film.tintTo("#ff5a48", s.s21.start, 0.8);
film.tintTo("#4fd0ff", s.s22.start, 1.2);

// ── Every frame: the world, then the things that ride on it ─────────────────────────────────────────────────
const fwdG = $("#fwd");
const backPath = $("#back");
const gapPath = $("#gapPath");
const lapPath = $("#lapArc");
film.each(() => {
  // the camera turns with the followed car when asked (side on, all the way round the ring)
  world.render();
  // riders
  for (const r of riders) {
    if (r.el.style.visibility === "hidden" && +r.el.style.opacity === 0) continue;
    const car = r.car();
    if (r.between) {
      // the bracket between this car and the one ahead: placed at the middle of the gap
      const c = world.now[car];
      const ahead = world.now[(car + 1) % N];
      const mid = (c.u + 2.2 + ahead.u - 2.2) / 2;
      const p = world.roadScreen(mid, r.y);
      r.el.style.left = `${p.x}px`;
      r.el.style.top = `${p.y + r.dy}px`;
      continue;
    }
    const p = world.carScreen(car, r.y);
    r.el.style.left = `${p.x}px`;
    r.el.style.top = `${p.y + r.dy}px`;
    if (r.num) {
      const v = Math.round(world.now[car].v * 3.6);
      const text = String(v);
      if (r.num.textContent !== text) r.num.textContent = text;
    }
  }
  // forward arrows on the moving cars (s14 on)
  if (fwd.on > 0.01) {
    let html = "";
    for (let i = 0; i < N; i += 1) {
      const c = world.now[i];
      if (c.v < 6) continue;
      const a = world.roadScreen(c.u + 3, 0.4, 0), b = world.roadScreen(c.u + 12, 0.4, 0);
      html += `<path d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}" stroke="#4fd0ff" stroke-width="7" stroke-linecap="round" marker-end="url(#ahc)" opacity="${fwd.on.toFixed(3)}"/>`;
    }
    fwdG.innerHTML = html;
  } else if (fwdG.innerHTML) fwdG.innerHTML = "";
  // the backward arrow: from the jam's tail, back along the road (outside the lane)
  if (back.on > 0.01 && W.jamTail !== undefined) {
    let d = "";
    const len = 34 * back.len;
    for (let k = 0; k <= 24; k++) {
      const p = world.roadScreen(W.jamTail - 2 - (len * k) / 24, 0.6, 7.5);
      d += `${k ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
    backPath.setAttribute("d", d);
    backPath.style.opacity = back.on.toFixed(3);
  } else backPath.style.opacity = 0;
  // your gap: a cyan line from your front bumper to the back of the car ahead
  if (gapOn.on > 0.01) {
    const me = world.now[YOU], ahead = world.now[AHEAD];
    let u1 = ahead.u - 2.3;
    if (u1 < me.u) u1 += L;
    let d = "";
    for (let k = 0; k <= 20; k++) {
      const p = world.roadScreen(me.u + 2.3 + ((u1 - me.u - 2.3) * k) / 20, 0.3, -3.6);
      d += `${k ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
    gapPath.setAttribute("d", d);
    gapPath.style.opacity = gapOn.on.toFixed(3);
    const mid = world.roadScreen((me.u + u1) / 2, 0.3, -3.6);
    const tag = $("#tagGapYou");
    tag.style.left = `${mid.x}px`;
    tag.style.top = `${mid.y + 70}px`;
  } else gapPath.style.opacity = 0;
  // the lap: drawn round the outside of the lane
  if (lap.on) {
    let d = "";
    const n = 120;
    for (let k = 0; k <= n * lap.a; k++) {
      const p = world.roadScreen(-L / 2 + (L * k) / n, 0.2, 5.5);
      d += `${k ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
    lapPath.setAttribute("d", d);
    lapPath.style.opacity = 1;
  } else lapPath.style.opacity = 0;
  // the model's speed against real time, where it is not one
  const now = tl.time();
  const rate = now < s.s14.start ? RATE : now < s.s20.start ? RATE18 : RATE21;
  const rateText = `× ${rate.toFixed(rate % 1 ? 2 : 0).replace(/0$/, "")}`;
  const rateEl = $("#spedChip b");
  if (rateEl.textContent !== rateText) rateEl.textContent = rateText;
  if (tl.time() >= s.s16.start - 0.2 && tl.time() <= s.s17.start) drawTS();
  if (tl.time() >= s.s20.start - 0.2 && tl.time() <= s.s21.start) drawSP();
});

film.finish();
