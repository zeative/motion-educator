// "Gimana sih luka bisa nutup sendiri?" The film is cut to one take of narration: storyboard.json holds the shot
// times the take gave, voice/voice.json the time of every word. Pictures arrive on their words. The world is one
// cross-section of skin (tissue.js) and one lit 3D close-up inside the clot (clot3d.js); the time bar at the top is
// a log scale computed from the fact sheet (f8).
import { createFilm } from "../../kit/engine/motion.js";
import { createClot } from "./clot3d.js";
import { createTissue, wallL } from "./tissue.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, $$, stage, shots: s, voiced } = film;
const D = storyboard.duration;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const RED = "#e8463d";
const CYAN = "#7fe3da";
const PINK = "#f08aa6";
// When a word of a shot's line is said, in the film's time.
const said = (id, word) => {
  const hit = voiced[id]?.words?.find(([, , text]) => text.toLowerCase().replace(/[^a-z-]/g, "") === word);
  if (!hit) throw new Error(`the take has no "${word}" in ${id}: run kit/audio/voice.mjs with the take first`);
  return hit[0];
};

// ── The world's state ────────────────────────────────────────────────────────
// A framing: the world point (wx, wy) at the screen point (sx, sy), z times closer.
const frame = (wx, wy, sx, sy, z) => ({ x: wx - (sx - 540) / z, y: wy - (sy - 960) / z, z });
// At rest the section is 1.6 times the drawn frames: the skin's surface at y 470, the wound 512 px wide at the top,
// the capillary at y 1269..1435 (under the spoken words, with a scrim behind them).
const ZR = 1.6;
const REST = frame(540, 460, 540, 470, ZR);
const C = { ...REST };
const F = { a: 1, push: 1, z: 1, dx: 0, dy: 0, heal: 0, bead: 0.35, bx: 566, by: 626 };
const DIVE = { p: 0, on: 1 };
const S = {
  cam: C, finger: F, sec: 0, disc: 0, discX: 540, discY: 640, lx: 540, ly: 700,
  flow: 1, blood: 0, plug: 0, glowP: 0, clot: 0, fibrin: 0, scab: 0, scabOff: 0,
  bugs: 0, cleared: 0, neut: 0, nx: 600, ny: 1000, ndir: -1.4, reach: 0, eat: 0, squeeze: 1,
  gran: 0, pale: 0, comb: 0, kera: 0, mature: 0, scar: 0, walls: 0,
};
const REST_WOUND_Y = (700 - REST.y) * ZR + 960; // where the wound's middle sits at rest
const tissue = createTissue($("#tissue"));
const clot = createClot($("#space"));
const C3 = { vis: 0, net: 0, t0: s.s05.start, orbit: 0, catchTime: (v) => NET_A + v * (NET_B - NET_A) };
const NET_A = said("s05", "benang") - 0.15;
const NET_B = s.s06.start + 0.15;

// ── The time bar: a log scale from a minute to a year ────────────────────────
const YEAR = 365 * 24 * 60;
const tx = (minutes) => 64 + (860 * Math.log10(Math.max(1, minutes))) / Math.log10(YEAR);
const BAR_Y = 318;
const T = { lg: 0, legs: { 0: 0, 1: 0, 2: 0, 3: 0 } }; // lg: log10 of the minutes the marker is at
const LEGS = [
  [1, 10, RED],
  [10, 3 * 1440, CYAN],
  [3 * 1440, 21 * 1440, PINK],
  [21 * 1440, YEAR, "#f3d2c8"],
];
const svgNS = "http://www.w3.org/2000/svg";
for (const [name, m] of [["menit", 1], ["jam", 60], ["hari", 1440], ["minggu", 10080], ["tahun", YEAR]]) {
  const tick = document.createElementNS(svgNS, "line");
  Object.entries({ x1: tx(m), x2: tx(m), y1: BAR_Y - 13, y2: BAR_Y + 13, class: "tick" }).forEach(([k, v]) => tick.setAttribute(k, v));
  $("#ticks").append(tick);
  $("#tick-labels").insertAdjacentHTML("beforeend", `<span class="${name === "minggu" ? "low" : ""}" style="left:${tx(m).toFixed(1)}px">${name}</span>`);
}
const legEls = LEGS.map(([a, b, colour]) => {
  const make = (cls) => {
    const el = document.createElementNS(svgNS, "line");
    Object.entries({ x1: tx(a), x2: tx(a), y1: BAR_Y, y2: BAR_Y, class: cls, stroke: colour }).forEach(([k, v]) => el.setAttribute(k, v));
    $("#legs").append(el);
    return el;
  };
  return [make("leg-glow"), make("leg"), tx(a), tx(b)];
});
const whenChips = $$(".chip.when");
const whenWidth = new Map(whenChips.map((el) => [el, el.offsetWidth]));
gsap.set(whenChips, { xPercent: -50, yPercent: -100 });

// ── Things that ride on things ───────────────────────────────────────────────
const place = (el, x, y) => (el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`);
const scr = (x, y) => tissue.toScreen(C, x, y);
const pins = [
  [$("#pin-epi"), () => scr(250, 520)],
  [$("#pin-der"), () => scr(250, 800)],
  [$("#pin-plate"), (t) => { const p = tissue.plate(14, S, t); const [x, y] = scr(p.x, p.y); return [x + 18, y - 20]; }],
  [$("#pin-plug"), () => { const [x, y] = scr(610, 905); return [x + 10, y]; }],
  [$("#pin-bug"), (t) => { const b = tissue.bug(1, S, t); const [x, y] = scr(b.x, b.y); return [x + 34, y - 30]; }],
  [$("#pin-neut"), () => { const [x, y] = scr(S.nx, S.ny); return [Math.min(x + 60, 640), y + 110]; }],
  [$("#pin-gran"), () => scr(600, 860)],
  [$("#pin-kera"), () => { const [x, y] = scr(wallL(545) + 70, 560); return [x - 40, y + 130]; }],
  [$("#pin-comb"), () => scr(560, 840)],
  [$("#pin-scar"), () => scr(560, 760)],
];

const pinWidth = new Map(pins.map(([el]) => [el, el.firstElementChild.offsetWidth]));
film.each((t) => {
  // The dive: the finger grows about its scrape while the section opens out of it (and the reverse at the end).
  const zf = F.push * Math.pow(7, DIVE.p);
  F.z = zf;
  F.dy = (REST_WOUND_Y - 640) * DIVE.p;
  if (DIVE.on) {
    C.z = (ZR * zf) / (7 * F.push);
    C.x = 540;
    C.y = 700 - (640 + F.dy - 960) / C.z;
    S.disc = clamp((DIVE.p - 0.08) / 0.85);
    S.discX = 540;
    S.discY = 640 + F.dy;
    S.sec = clamp((DIVE.p - 0.05) / 0.25);
    F.a = 1 - clamp((DIVE.p - 0.75) / 0.25);
  }
  tissue.draw(S, t);
  clot.render(C3, t);
  for (const [el, where] of pins) {
    const [x, y] = where(t);
    const w = pinWidth.get(el);
    place(el, clamp(x, 64, 930 - w), Math.max(y, 236));
  }
  // The time bar's marker and the chip over it.
  const mx = 64 + (860 * T.lg) / Math.log10(YEAR);
  place($("#pin-mark"), mx, BAR_Y);
  for (const el of whenChips) {
    const half = whenWidth.get(el) / 2;
    place(el.parentElement, clamp(mx, 64 + half, 930 - half), BAR_Y);
  }
  legEls.forEach(([glow, line, a, b], i) => {
    const x2 = (a + (b - a) * T.legs[i]).toFixed(1);
    glow.setAttribute("x2", x2);
    line.setAttribute("x2", x2);
    const on = T.legs[i] > 0.001 ? "visible" : "hidden";
    glow.style.visibility = on;
    line.style.visibility = on;
  });
});
// The chips over the marker are placed one by one (each has its own width), so the pin itself stays at 0, 0.
for (const el of whenChips) gsap.set(el, { autoAlpha: 0 });

const slam = (lines, at, stagger = 0.16) => {
  gsap.set(lines, { scale: 1.4, opacity: 0, filter: "blur(14px)" });
  tl.to(lines, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.42, ease: "expo.out", stagger }, at);
};
const go = (cam, at, d = 0.7, ease = "power3.inOut") => tl.to(C, { ...cam, duration: d, ease }, at);
const key = (x, y, at, d = 0.6) => tl.to(S, { lx: x, ly: y, duration: d, ease: "power2.inOut" }, at);
const lightAt = (x, y, glow, at, d = 0.6) => film.light({ lx: x / 1080, ly: 1 - y / 1920, glow }, at, d);
const marker = (minutes, at, d, ease = "power2.inOut") => tl.to(T, { lg: Math.log10(minutes), duration: d, ease }, at);
const leg = (i, at, d = 0.7) => tl.to(T.legs, { [i]: 1, duration: d, ease: "power2.out" }, at);
// A chip over the marker, alone: the one before it leaves on the same frame.
let lastWhen = null;
const when = (sel, at) => {
  if (lastWhen) tl.set(lastWhen, { autoAlpha: 0 }, at);
  tl.set(sel, { autoAlpha: 1 }, at);
  tl.fromTo(sel, { scale: 0.6 }, { scale: 1, duration: 0.4, ease: "back.out(2)", immediateRender: false }, at);
  lastWhen = sel;
};
const popPin = (sel, at, origin = "0% 100%") => {
  gsap.set(sel, { autoAlpha: 0 });
  tl.set(sel, { autoAlpha: 1 }, at);
  tl.fromTo(sel, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.42, ease: "back.out(1.9)", transformOrigin: origin, immediateRender: false }, at);
};
const unpin = (sel, at) => tl.to(sel, { autoAlpha: 0, duration: 0.2, ease: "power1.in" }, at);

film.captions();
film.scene("#capscrim", s.s02.start + 0.4, s.s14.start - 0.2, { fadeIn: 0.4, fadeOut: 0.3 });

// ── s01: the question, over the scraped finger ───────────────────────────────
Object.assign(stage, { lx: 0.44, ly: 0.68, glow: 0.5, floor: 0, silk: 0.7 });
film.scene("#s01", 0, s.s02.start);
tl.to(F, { bead: 1, duration: 2.4, ease: "power1.out" }, 0);
tl.to(F, { bx: 606, by: 676, duration: 2.5, ease: "sine.inOut" }, 0);
tl.to(F, { push: 1.1, duration: s.s02.start - 0.45, ease: "none" }, 0);
const lines = $$("#q .ln");
for (const line of lines) film.split(line);
slam(lines[1], said("s01", "luka") - 0.06, 0);
slam(lines[2], said("s01", "nutup") - 0.06, 0);
film.sheen("#q", said("s01", "sendiri") + 0.25, 0.6);
for (const line of lines) film.typeOut([...line.querySelectorAll(".ch")], s.s02.start - 0.5, { stagger: 0.004 });
// The dive into the scrape.
const DIVE_AT = s.s02.start - 0.4;
tl.to(DIVE, { p: 1, duration: 1.0, ease: "power2.inOut" }, DIVE_AT);
tl.set(DIVE, { on: 0 }, DIVE_AT + 1.0);
tl.set(C, { ...REST }, DIVE_AT + 1.0);
tl.set(F, { a: 0 }, DIVE_AT + 1.0);
tl.set(S, { sec: 1, disc: 1 }, DIVE_AT + 1.0);
lightAt(540, 700, 0.6, DIVE_AT, 0.8);

// ── s02: inside the skin; the relay is set ───────────────────────────────────
film.scene("#names", s.s02.start, s.s14.start);
popPin("#tag-epi", s.s02.start + 0.75);
popPin("#tag-der", s.s02.start + 0.95);
tl.to(C, { z: ZR * 1.03, duration: s.s02.dur - 0.5, ease: "none" }, s.s02.start + 0.6);
film.scene("#bar", said("s02", "estafet") - 0.12, s.s13.start, { fadeOut: 0.25 });
film.land("#bar-svg", said("s02", "estafet") - 0.12, { from: -30, duration: 0.5 });
film.land("#tick-labels", said("s02", "estafet") - 0.02, { from: -16, duration: 0.45 });
film.pop("#pin-mark .mark", said("s02", "estafet") + 0.15);

// ── s03, s04: platelets, then the plug ───────────────────────────────────────
unpin("#tag-epi, #tag-der", s.s03.start + 0.6);
tl.to(S, { blood: 1, duration: s.s04.end - s.s03.start - 0.6, ease: "power1.out" }, s.s03.start - 0.1);
tl.to(C, { z: ZR, duration: 0.5, ease: "power2.out" }, s.s03.start - 0.1);
marker(5, s.s03.start, s.s06.end - s.s03.start - 0.3, "none");
tl.to(S, { glowP: 1, duration: 0.3 }, said("s03", "trombosit") - 0.05);
popPin("#chip-plate", said("s03", "trombosit"));
tl.to(S, { plug: 1, duration: s.s04.end - s.s04.start - 0.3, ease: "power1.inOut" }, s.s04.start - 0.25);
unpin("#chip-plate", said("s04", "nyumbat") - 0.25);
tl.to(S, { glowP: 0, duration: 0.6 }, said("s04", "nyumbat"));
popPin("#chip-plug", said("s04", "nyumbat"));
tl.to(S, { flow: 0.55, duration: 1.2 }, said("s04", "nyumbat"));
key(540, 860, s.s04.start, 0.8);
// The dive into the clot.
unpin("#chip-plug", s.s05.start - 0.5);
go({ x: 540, y: 770, z: 4.4 }, s.s05.start - 0.5, 0.55, "power3.in");
tl.to(S, { sec: 0, duration: 0.25, ease: "power1.in" }, s.s05.start - 0.18);

// ── s05: the net, close up in 3D ─────────────────────────────────────────────
film.scene("#plasma", s.s05.start - 0.2, s.s06.start - 0.02, { fadeIn: 0.25, fadeOut: 0.3 });
film.scene("#s05", s.s05.start, s.s06.start - 0.2, { fadeOut: 0.2 });
tl.fromTo(C3, { vis: 0 }, { vis: 1, duration: 0.3, ease: "power1.out", immediateRender: false }, s.s05.start - 0.2);
tl.to(C3, { orbit: 0.55, duration: s.s05.dur + 0.6, ease: "none" }, s.s05.start - 0.2);
tl.to(C3, { net: 1, duration: NET_B - NET_A, ease: "none" }, NET_A);
tl.to(C3, { vis: 0, duration: 0.28, ease: "power1.in" }, s.s06.start - 0.32);
tl.set(C3, { vis: 0 }, s.s06.start - 0.02);
tl.to(".b1, .b3", { x: 40, y: -60, duration: s.s05.dur + 0.5, ease: "none" }, s.s05.start - 0.2);
tl.to(".b2, .b4, .b5", { x: -30, y: -90, duration: s.s05.dur + 0.5, ease: "none" }, s.s05.start - 0.2);
film.land("#chip-fib", said("s05", "fibrin") + 0.05, { from: 16, duration: 0.4 });
tl.set(S, { fibrin: 0.75, clot: 0.15 }, s.s06.start - 0.36);
lightAt(540, 860, 0.8, s.s05.start - 0.2, 0.4);
film.tintTo("#ff5a48", s.s05.start - 0.2, 0.4);

// ── s06: the clot sets ───────────────────────────────────────────────────────
tl.set(C, { x: 540, y: 770, z: 4.4 }, s.s06.start - 0.34);
tl.to(S, { sec: 1, duration: 0.3, ease: "power1.out" }, s.s06.start - 0.34);
go(REST, s.s06.start - 0.34, 0.8, "power3.out");
film.tintTo(RED, s.s06.start, 0.6);
tl.to(S, { fibrin: 1, duration: 0.6 }, s.s06.start);
tl.to(S, { clot: 1, duration: 1.4, ease: "power1.inOut" }, said("s06", "darahnya") - 0.1);
tl.to(S, { scab: 1, duration: 1.3, ease: "power2.out" }, said("s06", "menggumpal") - 0.2);
tl.to(S, { flow: 1, duration: 1 }, s.s06.start);
when("#w-min", said("s06", "menit"));
leg(0, said("s06", "menggumpal") + 0.1, 0.6);
key(540, 620, s.s06.start + 0.6, 0.8);

// ── s07: germs get in ────────────────────────────────────────────────────────
const TOP = frame(540, 540, 540, 760, 2.2);
go(TOP, s.s07.start - 0.15, 0.7);
marker(40, s.s07.start, s.s07.dur, "none");
tl.to(S, { bugs: 1, duration: said("s07", "masuk") + 0.4 - s.s07.start, ease: "power1.inOut" }, s.s07.start);
popPin("#chip-bug", said("s07", "kuman") + 0.05);
key(560, 640, s.s07.start, 0.6);
film.tintTo("#c9d36a", s.s07.start, 0.8);
lightAt(540, 520, 0.45, s.s07.start, 0.6);

// ── s08, s09: a white cell comes, and eats ───────────────────────────────────
unpin("#chip-bug", s.s08.start + 0.3);
const CRAWL = said("s08", "sel") + 0.15;
go(frame(610, 760, 540, 860, 1.6), s.s08.start - 0.15, 0.7);
tl.to(C, { ...frame(650, 620, 540, 820, 2.2), duration: CRAWL + 1.1 - s.s08.start - 0.6, ease: "sine.inOut" }, s.s08.start + 0.6);
tl.set(S, { nx: 590, ny: 1010, squeeze: 1, ndir: -1.45 }, s.s08.start);
tl.to(S, { neut: 1, duration: 0.4 }, s.s08.start + 0.1);
// Through the vessel's wall at the break: narrow, then round again.
tl.to(S, { ny: 930, duration: 0.9, ease: "power1.inOut" }, s.s08.start + 0.3);
tl.to(S, { squeeze: 0, duration: 0.6, ease: "power2.out" }, s.s08.start + 0.9);
// Then it crawls up the wall toward the germ, reaching ahead.
tl.to(S, { reach: 1, duration: 0.5 }, s.s08.start + 1.0);
tl.to(S, { nx: 652, ny: 618, duration: CRAWL + 1.0 - (s.s08.start + 1.1), ease: "power1.inOut" }, s.s08.start + 1.1);
tl.to(S, { ndir: Math.atan2(548 - 618, 672 - 652), duration: 0.8 }, CRAWL);
popPin("#chip-neut", said("s08", "sel") - 0.05);
marker(360, s.s08.start, said("s08", "jam") - s.s08.start + 0.1, "power1.inOut");
when("#w-6h", said("s08", "jam"));
film.tintTo(CYAN, s.s08.start, 0.8);
const EAT = said("s09", "menelan") - 0.25;
tl.to(S, { eat: 1, duration: 1.2, ease: "power1.inOut" }, EAT);
tl.to(S, { reach: 0, duration: 0.6 }, EAT);
tl.to(S, { nx: 662, ny: 590, duration: 1.0, ease: "power1.inOut" }, EAT + 0.3);
tl.to(C, { ...frame(660, 590, 540, 820, 2.4), duration: s.s10.start - EAT, ease: "sine.inOut" }, EAT);
marker(900, s.s09.start, s.s09.dur, "none");
leg(1, said("s09", "kumannya") + 0.2, 0.7);
film.hit(EAT + 0.75, 0.25, 0.3);

// ── s10: new tissue grows up from the base ───────────────────────────────────
unpin("#chip-neut", s.s10.start - 0.2);
go(REST, s.s10.start - 0.15, 0.8);
tl.to(S, { cleared: 1, neut: 0, duration: 0.5 }, s.s10.start + 0.1);
tl.to(S, { gran: 1, duration: said("s10", "lukanya") + 0.4 - (s.s10.start + 0.2), ease: "power1.inOut" }, s.s10.start + 0.2);
marker(3 * 1440, s.s10.start, said("s10", "hari") - s.s10.start + 0.2);
when("#w-day", said("s10", "hari"));
leg(2, said("s10", "hari") + 0.2, s.s11.end - said("s10", "hari") - 0.4);
marker(16 * 1440, said("s10", "hari") + 0.3, s.s11.end - said("s10", "hari") - 0.4, "none");
popPin("#chip-gran", said("s10", "jaringan"));
film.tintTo(PINK, s.s10.start, 0.8);
key(540, 820, s.s10.start, 0.8);

// ── s11: skin cells crawl in from the edges ──────────────────────────────────
unpin("#chip-gran", s.s11.start - 0.2);
go(frame(540, 560, 540, 760, 2.2), s.s11.start - 0.15, 0.7);
tl.to(S, { kera: 1, duration: said("s11", "tertutup") + 0.06 - (s.s11.start + 0.2), ease: "none" }, s.s11.start + 0.2);
popPin("#chip-kera", said("s11", "sel") + 0.05);
key(540, 700, s.s11.start, 0.6);
film.tintTo(CYAN, s.s11.start, 0.8);

// ── s12, s12b: the scab comes off; the new skin is remodelled ───────────────
unpin("#chip-kera", s.s12.start - 0.2);
go(frame(540, 600, 540, 800, 1.8), s.s12.start - 0.15, 0.7);
tl.to(S, { scabOff: 1, duration: 1.5, ease: "power2.in" }, said("s12", "beres") - 0.35);
tl.to(S, { mature: 1, duration: 2.2, ease: "power1.inOut" }, said("s12", "beres"));
marker(21 * 1440, s.s12.start, s.s12.dur);
go(frame(540, 680, 540, 830, 1.75), s.s12b.start - 0.1, 0.8);
const COMB = said("s12b", "dirapikan") - 0.1;
tl.to(S, { comb: 1, pale: 0.8, duration: s.s12b.end - 0.2 - COMB, ease: "sine.inOut" }, COMB);
popPin("#chip-comb", said("s12b", "dirapikan"));
leg(3, said("s12b", "berminggu-minggu"), s.s12b.end - said("s12b", "berminggu-minggu") - 0.2);
marker(180 * 1440, said("s12b", "berminggu-minggu"), s.s12b.end - said("s12b", "berminggu-minggu") - 0.2, "power1.inOut");
when("#w-wk", said("s12b", "berminggu-minggu"));
when("#w-mon", said("s12b", "berbulan-bulan"));
film.tintTo("#f3d2c8", s.s12.start, 0.8);
key(420, 720, s.s12b.start, 0.8);

// ── s13: weaker than before ──────────────────────────────────────────────────
unpin("#chip-comb", s.s13.start - 0.2);
go(REST, s.s13.start - 0.15, 0.8);
tl.to(S, { walls: 1, duration: 1.2, ease: "power1.inOut" }, COMB + 0.2);
tl.to(S, { scar: 1, duration: 1.4, ease: "power1.inOut" }, s.s12b.end - 1.6);
film.scene("#s13", s.s13.start, s.s14.start - 0.1, { fadeOut: 0.2 });
film.land("#strength", s.s13.start + 0.1, { from: -30 });
gsap.set("#bar-a, #bar-b", { scaleX: 0 });
tl.to("#bar-a", { scaleX: 1, duration: 0.5, ease: "power2.out" }, s.s13.start + 0.35);
// The scar's bar draws to its value (80% of the track, f7) as the voice says how strong it is.
tl.to("#bar-b", { scaleX: 1, duration: 0.5, ease: "power2.out" }, said("s13", "sekuat") - 0.05);
popPin("#chip-scar", said("s13", "bekas") - 0.05);
key(300, 620, s.s13.start, 0.6);
film.tintTo(RED, s.s13.start, 0.8);

// ── s14: back to the finger, healed ──────────────────────────────────────────
unpin("#chip-scar", s.s14.start - 0.3);
const OUT = s.s14.start - 0.3;
tl.set(F, { heal: 1, bead: 0, push: 1, a: 1 }, OUT);
tl.set(DIVE, { on: 1 }, OUT);
tl.to(DIVE, { p: 0, duration: 0.9, ease: "power2.inOut" }, OUT);
tl.to(F, { push: 1.04, duration: D - OUT - 0.9, ease: "none" }, OUT + 0.9);
lightAt(470, 600, 0.55, OUT, 0.8);
film.tintTo("#ff8a7a", OUT, 0.8);

// ── s15, s16: the relay in one frame, and the line to remember ──────────────
film.scene("#s15", s.s15.start - 0.05, D);
tl.to("#tissue", { opacity: 0.42, duration: 0.5 }, s.s15.start - 0.1);
["#rc1", "#rc2", "#rc3", "#rc4"].forEach((card, i) => film.land(card, s.s15.start + i * 0.16, { from: 60, duration: 0.5 }));
film.scene("#s16", s.s16.start, D);
for (const line of $$("#poster .ln")) film.split(line);
slam($$("#poster .ln"), s.s16.start + 0.08, 0.22);
film.sheen("#poster", s.s16.start + 0.9, 0.8);

film.finish();
