// "Why do we have seasons?" Built from storyboard.json: every time below is a shot's start or end, or the moment a
// word of its caption is read, so the pictures arrive with their words. The film has no voice; its words are read.
import { createFilm } from "../../kit/engine/motion.js";
import { createGlobe } from "./globe.js";
import { createLab, orb, SUN, TILT, LAT, HIGH, LOW, VIEW, PERI, GY, XL, F_HIGH, F_LOW, DAY_JUN, DAY_DEC, sunAlt } from "./lab.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, $$, stage, shots: s, W, H } = film;
// When a word of a shot's words has been read: the caption arrives with the shot, and a viewer reads it at about
// fifteen characters a second, starting a moment after it appears. The pictures follow that reading.
const READ = { from: 0.3, cps: 15 };
const words = (id) => (s[id].caption ?? s[id].script ?? "").replaceAll("*", "");
const said = (id, wanted) => {
  const text = words(id);
  const word = wanted.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const at = text.toLowerCase().split(/\s+/).reduce((found, w, i, all) => (found < 0 && w.replace(/[^a-z0-9-]/g, "") === word ? all.slice(0, i).join(" ").length + (i ? 1 : 0) : found), -1);
  if (at < 0) throw new Error(`"${word}" is not in ${id}'s words: "${text}"`);
  return s[id].start + READ.from + at / READ.cps;
};
const ends = (id) => Math.min(s[id].end - 0.25, s[id].start + READ.from + words(id).length / READ.cps);

const rad = (deg) => (deg * Math.PI) / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => x * x * (3 - 2 * x);
const AMBER = "#ffb43a";
const COOL = "#5fb0ff";
const WARM = "#ffdca8";
const SUNLX = SUN.x / W;
const SUNLY = 1 - SUN.y / H;

// ── The drawn layers and the state each is drawn from ──────────────────────
const globe = await createGlobe($("#space"));
const lab = createLab($("#under"), $("#diagram"));
const L = lab.L;
// E is what the globe is drawn from; C is its close-up pose (pixels from the frame's centre, diameter in pixels);
// G is where it is in the year and how the camera sees it (see globe.js). `orb` blends the close-up pose with the
// Earth's place on the drawn orbit, so a pull back or a push in is one number.
const E = { vis: 1, x: 0, y: 0, size: 600, turn: 0, tilt: 0, air: 1, thick: 1.035 };
const C = { x: 460, y: -30, size: 600 };
const G = { theta: -6, e: 10, eps: TILT, orb: 0, osize: 150, axis: 6, reach: 1.38, eq: 0, lat: 0, dot: 0, roll: 0 };
// The dive from the June Earth to the ground at 40 N: the camera closes on the noon mark and rolls until the ground
// there is level. Rolling by the Sun's height (73.44 degrees) is exactly what turns "sunlight from the right" into
// "sunlight from 73 degrees up", so the six rays seen at the globe become the beam of the ground diagram.
const D = { k: 0 };
const TURN = Number(new URLSearchParams(location.search).get("turn") ?? 4.25); // which face of the Earth the film opens on
const DOT = { x: Math.cos(rad(LAT - TILT)) * 1.008, y: -Math.sin(rad(LAT - TILT)) * 1.008 }; // noon at 40 N, in globe radii
const DIVE = { from: 580, to: 3000, x0: 760 + DOT.x * 290, y0: 450 + DOT.y * 290, x1: XL + F_HIGH / 2, y1: GY };
film.each((t) => {
  const p = orb(G.theta);
  let x = lerp(C.x, p.x - W / 2, G.orb);
  let y = lerp(C.y, p.y - H / 2, G.orb);
  let size = lerp(C.size, G.osize * (1 - 0.1 * Math.sin(rad(G.theta))), G.orb);
  let roll = 0;
  if (D.k > 0) {
    size = DIVE.from * (DIVE.to / DIVE.from) ** D.k;
    roll = HIGH * smooth(D.k);
    const tx = lerp(DIVE.x0, DIVE.x1, smooth(D.k)) - W / 2;
    const ty = lerp(DIVE.y0, DIVE.y1, smooth(D.k)) - H / 2;
    // Where the mark has to be before the roll, so that it is at (tx, ty) after it.
    const c = Math.cos(rad(roll));
    const sn = Math.sin(rad(roll));
    x = tx * c - ty * sn - (DOT.x * size) / 2;
    y = tx * sn + ty * c - (DOT.y * size) / 2;
  }
  Object.assign(E, { x, y, size });
  G.reach = lerp(1.38, 1.85, G.orb);
  G.roll = roll;
  lab.draw(t, { ex: x + W / 2, ey: y + H / 2, er: size / 2, eps: G.eps, roll });
  globe.render(E, G, t);
});

const slam = (lines, at) => {
  gsap.set(lines, { scale: 1.5, opacity: 0, filter: "blur(18px)" });
  tl.to(lines, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.5, ease: "expo.out", stagger: 0.16 }, at);
};
const blurSpace = film.motionBlur("#spaceview");
const blurGround = film.motionBlur("#groundview");
const blurBoth = (at, d, x, y) => {
  blurSpace(at, d, x, y);
  blurGround(at, d, x, y);
};

film.captions();
film.chapters({ from: s.s02.start, until: s.s14b.end });

// The Earth turns all film, about whatever its axis is.
// It turns at one steady rate; each time it comes back from behind something, it comes back showing land.
const SPIN = 0.2;
const spin = (turn, from, to) => {
  tl.set(E, { turn }, from);
  tl.to(E, { turn: turn + SPIN * (to - from), duration: to - from, ease: "none" }, from);
};
E.turn = TURN;
spin(TURN, 0, s.s05.start + 0.1); // the Atlantic, then the Americas
spin(TURN - 0.6, s.s05.start + 0.1, s.s16.start); // Africa and Europe for the tilt, the Americas for June
spin(TURN - 0.55, s.s16.start, storyboard.duration); // Africa and Europe again for the last frame

// ── s01: Why do we have seasons? ───────────────────────────────────────────
Object.assign(stage, { lx: 0.24, ly: 0.5, glow: 0.45, floor: 0, silk: 0.75 });
film.scene("#s01", 0, s.s02.start);
tl.to(stage, { glow: 0.8, duration: 1.4, ease: "power2.out" }, 0);
const title = film.split("#title");
film.typeIn(title, 0.1, { stagger: 0.02 });
film.sheen("#title", 1.05, 0.7);
film.typeOut(title, s.s01.end - 0.36);
// From just before the December solstice to the closest point, in early January: one slow piece of orbit.
tl.to(G, { theta: PERI, duration: s.s03.start + 0.4, ease: "sine.out" }, 0);

// ── s02: Is it because we're closer to the Sun in summer? ──────────────────
film.scene("#orbitnote", s.s02.start, s.s04.start);
film.scene("#s02", s.s02.start, s.s04.start);
tl.to(G, { orb: 1, e: VIEW, duration: 1.2, ease: "power3.inOut" }, s.s02.start - 0.3);
tl.to(L.sun, { a: 1, duration: 0.5 }, s.s02.start - 0.05);
tl.fromTo(L.sun, { s: 0.6 }, { s: 1, duration: 0.8, ease: "back.out(1.6)", immediateRender: false }, s.s02.start - 0.05);
tl.set(L.orbit, { a: 1 }, s.s02.start);
tl.to(L.orbit, { draw: 1, duration: 1.3, ease: "power2.inOut" }, s.s02.start + 0.05);
film.light({ lx: SUNLX, ly: SUNLY, glow: 1.0 }, s.s02.start - 0.2, 1.3);
film.land("#note-scale", s.s02.start + 0.9);
// The guess is drawn as it is said: the line from the Sun with "closer", the chip with "summer".
tl.set(L.dist, { a: 1 }, said("s02", "closer") - 0.1);
tl.to(L.dist, { p: 1, duration: 0.6, ease: "power2.out" }, said("s02", "closer") - 0.1);
film.pop("#chip-guess", ends("s02")); // once the question has been read // as "summer?" ends, so its pop sits between the words

// ── s03: But we're actually closest in early January, ──────────────────────
tl.to("#chip-guess", { opacity: 0, duration: 0.25 }, said("s03", "but") - 0.15);
film.scene("#s03", s.s03.start, s.s04.start);
tl.to(L.dist, { solid: 1, duration: 0.45, ease: "power2.out" }, said("s03", "but") - 0.1);
film.land("#d-near", said("s03", "closest") - 0.05);
film.land("#chip-near", said("s03", "early") - 0.05);
tl.to(L.dist, { far: 1, duration: 0.55, ease: "power2.out" }, said("s03", "january"));
film.land("#d-far", said("s03", "january") + 0.25);
film.land("#chip-far", said("s03", "january") + 0.45);
tl.to("#s03, #s02, #orbitnote", { opacity: 0, duration: 0.25 }, s.s04.start - 0.36);

// ── s04: in the middle of northern winter. ─────────────────────────────────
tl.set(C, { x: 220, y: -90, size: 580 }, s.s04.start - 0.4);
tl.to(G, { orb: 0, e: 0, duration: 0.9, ease: "power3.inOut" }, s.s04.start - 0.38);
tl.to([L.orbit, L.sun], { a: 0, duration: 0.4 }, s.s04.start - 0.38);
tl.to(L.dist, { a: 0, duration: 0.3 }, s.s04.start - 0.38);
tl.to(G, { eq: 0.5, duration: 0.5 }, s.s04.start + 0.2);
tl.set(L.rays, { side: -1, p: 0, beam: 0, rest: 1 }, s.s04.start - 0.3);
tl.to(L.rays, { a: 1, duration: 0.3 }, s.s04.start - 0.28);
tl.to(L.rays, { p: 1, duration: 0.9, ease: "power2.out" }, s.s04.start - 0.28);
film.light({ lx: 0.03, ly: 0.58, glow: 0.95 }, s.s04.start - 0.3, 0.9);
film.tintTo(COOL, s.s04.start - 0.2, 0.9);
film.scene("#s04", s.s04.start, s.s05.start);
film.land("#chip-jan", s.s04.start + 0.08);
film.draw("#lead-nw", said("s04", "northern") - 0.05, 0.3);
film.pop("#chip-nwinter", said("s04", "northern"));

// ── s05, s05b: Not the distance. It's the tilt. ────────────────────────────
tl.to(E, { vis: 0, duration: 0.3, ease: "power1.in" }, s.s05.start - 0.24);
tl.to(L.rays, { a: 0, duration: 0.25 }, s.s05.start - 0.24);
tl.to("#s04", { opacity: 0, duration: 0.2 }, s.s05.start - 0.24);
film.scene("#s05", s.s05.start, s.s06.start); // both shots: the second line lands under the first
film.hit(s.s05.start, 0.8, 0.4);
tl.to(stage, { floor: 0.7, horizon: -0.3, lx: 0.5, ly: 0.52, glow: 0.75, duration: 0.6 }, s.s05.start);
film.tintTo(AMBER, s.s05.start, 0.5);
const causeLines = $$("#cause .ln");
for (const line of causeLines) film.split(line);
// Each line is its own shot.
slam(causeLines[0], s.s05.start + 0.04);
tl.to("#s05", { scale: 1.02, transformOrigin: "50% 45%", duration: s.s05.dur, ease: "sine.inOut" }, s.s05.start);
slam(causeLines[1], s.s05b.start + 0.04);
// The word leans by the angle it names.
tl.fromTo("#tiltword", { rotation: 0 }, { rotation: TILT, duration: 0.7, ease: "back.out(2.2)", immediateRender: false }, s.s05b.start + 0.45);
film.sheen("#cause", s.s05b.start + 1.1, 0.7);
const blur5 = film.motionBlur("#s05");
tl.to("#s05", { y: -900, duration: 0.3, ease: "power3.in" }, s.s06.start - 0.3);
// It has faded before the Earth has to be read: no blurred heading lies over the incoming globe.
tl.to("#s05", { opacity: 0, duration: 0.18, ease: "power1.in" }, s.s06.start - 0.3);
blur5(s.s06.start - 0.3, 0.34, 0, 50);
tl.to(stage, { camy: "+=3", duration: 0.6, ease: "power3.inOut" }, s.s06.start - 0.3);

// ── s06: Earth's axis leans 23.4 degrees, ───────────────────────────────────
// Seen exactly from the side (e = 0), so the angle drawn on screen is the angle itself. The globe arrives upright;
// the axis swings out to 23.44 degrees with "leans" and the arc opens with it. The number appears once, at its value.
tl.set(G, { theta: 52, e: 0, eps: 0, orb: 0, eq: 0.55 }, s.s06.start - 0.4);
tl.set(C, { x: -260, y: -70, size: 740 }, s.s06.start - 0.4);
tl.to(E, { vis: 1, duration: 0.3 }, s.s06.start - 0.14);
tl.to(C, { size: 540, duration: 0.9, ease: "expo.out" }, s.s06.start - 0.14);
tl.to(stage, { floor: 0, lx: 0.74, ly: 0.7, glow: 0.85, duration: 0.8 }, s.s06.start - 0.2);
film.tintTo(WARM, s.s06.start - 0.2, 0.8);
tl.set(L.tilt, { a: 1, plane: 0, up: 0, arc: 1 }, s.s06.start - 0.1);
tl.to(L.tilt, { plane: 1, duration: 0.6, ease: "power2.out" }, s.s06.start);
tl.to(L.tilt, { up: 1, duration: 0.5, ease: "power2.out" }, s.s06.start + 0.15);
film.scene("#s06", s.s06.start, s.s07.start);
film.land("#chip-plane", s.s06.start + 0.3);
film.land("#chip-axis", said("s06", "axis"));
tl.to(G, { eps: TILT, duration: 0.95, ease: "power2.inOut" }, said("s06", "leans") - 0.05);
film.land("#tiltnum", said("s06", "leans") + 0.85); // once the axis has swung to its value
tl.to("#s06", { opacity: 0, duration: 0.25 }, s.s07.start - 0.36);
tl.to(L.tilt, { a: 0, duration: 0.3 }, s.s07.start - 0.36);

// ── s07: and points the same way all year. ─────────────────────────────────
// The Earth runs at a steady rate from late winter to June; each mark is left as it passes.
const T7 = { from: s.s07.start - 0.3, to: s.s08.start - 0.2 };
const at7 = (theta) => T7.from + ((theta - 52) / (180 - 52)) * (T7.to - T7.from);
tl.to(G, { orb: 1, e: VIEW, eq: 0, duration: 1.0, ease: "power3.inOut" }, T7.from);
tl.to(G, { theta: 180, duration: T7.to - T7.from, ease: "none" }, T7.from);
tl.set(L.orbit, { draw: 1 }, T7.from);
tl.set(L.sun, { s: 1 }, T7.from);
tl.to(L.orbit, { a: 1, duration: 0.5 }, s.s07.start - 0.2);
// The Sun is drawn under the globe, and the globe crosses its place on the way out to the far side of the orbit:
// the Sun comes up only once the Earth has cleared it, so it is never seen behind an Earth that is beyond it.
tl.to(L.sun, { a: 1, duration: 0.4 }, s.s07.start + 0.36);
film.light({ lx: SUNLX, ly: SUNLY, glow: 1.0 }, T7.from, 1.0);
film.tintTo(AMBER, T7.from, 0.8);
const mark = (name, at) => tl.to(L.mark, { [name]: 1, duration: 0.45, ease: "back.out(2.4)" }, at);
film.scene("#s07", s.s07.start, s.s08.start);
tl.set("#orbitnote", { autoAlpha: 1, opacity: 1 }, s.s07.start);
mark("dec", s.s07.start + 0.25);
film.land("#m-dec", s.s07.start + 0.35);
mark("mar", at7(90) + 0.14);
film.land("#m-mar", at7(90) + 0.26);
mark("sep", said("s07", "same") - 0.25);
film.land("#m-sep", said("s07", "same") - 0.15);
// Every axis glows at once with "same way": four marks, one direction.
film.land("#same", said("s07", "same") - 0.05);
tl.to(L.mark, { glow: 1, duration: 0.4, ease: "sine.inOut", yoyo: true, repeat: 1 }, said("s07", "same"));
film.land("#m-jun", s.s08.start - 0.65);
tl.to("#s07, #orbitnote", { opacity: 0, duration: 0.25 }, s.s08.start - 0.38);
tl.set("#orbitnote", { autoAlpha: 0 }, s.s08.start - 0.1);

// ── s08: So in June, the north leans toward the Sun. ───────────────────────
tl.set(C, { x: -200, y: -90, size: 580 }, s.s08.start - 0.4);
tl.to(G, { orb: 0, e: 0, duration: 0.95, ease: "power3.inOut" }, s.s08.start - 0.38);
tl.to([L.orbit, L.sun], { a: 0, duration: 0.4 }, s.s08.start - 0.38);
tl.to(L.mark, { dec: 0, mar: 0, sep: 0, duration: 0.3 }, s.s08.start - 0.38);
tl.set(L.rays, { side: 1, p: 0, beam: 0, rest: 1 }, s.s08.start - 0.3);
tl.to(L.rays, { a: 1, duration: 0.3 }, s.s08.start - 0.28);
tl.to(L.rays, { p: 1, duration: 0.9, ease: "power2.out" }, s.s08.start - 0.28);
tl.to(G, { eq: 0.5, duration: 0.5 }, s.s08.start + 0.2);
film.light({ lx: 0.97, ly: 0.58, glow: 1.0 }, s.s08.start - 0.3, 0.9);
film.scene("#s08", s.s08.start, s.s09.start);
film.land("#chip-jun", said("s08", "june") - 0.05);
film.pop("#chip-nsummer", said("s08", "north"));
film.pop("#chip-swinter", said("s08", "toward"));
tl.to(G, { lat: 0.9, duration: 0.5 }, said("s08", "sun") - 0.2);
// The noon mark pops once the line has been read.
tl.to(G, { dot: 1, duration: 0.45, ease: "back.out(2.6)" }, ends("s08"));
film.draw("#lead-40", ends("s08") + 0.08, 0.25);
film.land("#chip-40", ends("s08") + 0.08);
tl.to(L.rays, { beam: 1, duration: 0.3 }, ends("s08") + 0.05);

// ── s09: Its sunlight comes in steep, ──────────────────────────────────────
// The dive to the ground at that mark: it starts with "sunlight" and the ground is level, with the rays coming
// down at 73 degrees, on "steep".
const DIVE_END = said("s09", "steep") + 0.08;
const DIVE_AT = Math.max(s.s09.start + 0.05, said("s09", "sunlight") - 0.1);
tl.to("#s08", { opacity: 0, duration: 0.2 }, DIVE_AT - 0.1);
tl.to(D, { k: 1, duration: DIVE_END - DIVE_AT, ease: "power2.in" }, DIVE_AT);
tl.to(G, { lat: 0, eq: 0, duration: 0.3 }, DIVE_AT);
tl.to(L.rays, { rest: 0, duration: 0.35 }, DIVE_AT);
tl.to(stage, { lx: 0.66, ly: 0.97, glow: 0.95, duration: DIVE_END - DIVE_AT, ease: "power2.in" }, DIVE_AT);
tl.to(E, { vis: 0, duration: 0.3 }, DIVE_END + 0.06);
tl.to(L.rays, { a: 0, duration: 0.26 }, DIVE_END + 0.08);
tl.set(D, { k: 0 }, DIVE_END + 0.5);
tl.set(G, { dot: 0 }, DIVE_END + 0.5);
tl.set("#groundview", { autoAlpha: 1 }, DIVE_END - 0.3);
tl.set(L.beam, { a: 1, alt: HIGH, land: 1, cool: 0, patch: 0, ghost: 0, arc: 0, label: 0, brace: 0, at: 520, same: 0 }, DIVE_END - 0.3);
tl.to(L.ground, { a: 1, duration: 0.32, ease: "power1.inOut" }, DIVE_END + 0.02);
film.tintTo(AMBER, DIVE_END - 0.3, 0.6);

// ── s10: packed onto a small patch of ground. ──────────────────────────────
tl.to(L.beam, { patch: 1, duration: 0.45, ease: "power2.out" }, said("s10", "packed") - 0.05);
tl.to(L.ground, { tiles: 1, duration: 0.4 }, said("s10", "small") - 0.2);
tl.to(L.tile, { one: 1, duration: 0.4 }, said("s10", "small"));
tl.to(L.beam, { brace: 1, duration: 0.5, ease: "power2.out" }, said("s10", "packed") + 0.2);
tl.to(L.beam, { arc: 1, duration: 0.5, ease: "power2.out" }, said("s10", "patch"));
tl.to(L.beam, { label: 1, duration: 0.3 }, said("s10", "patch") + 0.3);
// The panel belongs to the ground view and stays with it through s13.
film.scene("#s10", s.s10.start, s.s14.start);
gsap.set("#gauge-fill", { scaleX: 0 });
gsap.set("#panel .prow", { opacity: 0, x: -24 });
tl.fromTo("#panel", { opacity: 0, y: 70, rotationX: -14, transformPerspective: 1400 }, { opacity: 1, y: 0, rotationX: 0, duration: 0.6, ease: "expo.out" }, s.s10.start - 0.1);
tl.to("#row-h", { opacity: 1, x: 0, duration: 0.4 }, s.s10.start + 0.15);
tl.to("#row-g", { opacity: 1, x: 0, duration: 0.4 }, said("s10", "small"));
tl.to("#row-l", { opacity: 1, x: 0, duration: 0.4 }, said("s10", "ground") - 0.1);
// The gauge shows the light on each square metre against June's: full now, F_HIGH / F_LOW of it in December.
tl.to("#gauge-fill", { scaleX: 1, duration: 0.5, ease: "power2.out" }, said("s10", "ground"));
tl.to("#groundview", { scale: 1.03, transformOrigin: "1030px 740px", duration: s.s11.start - DIVE_END, ease: "sine.inOut" }, DIVE_END);

// ── s11: But six months later, it leans away. ──────────────────────────────
film.whip(["#groundview", "#s10"], ["#spaceview", "#s11"], s.s11.start, { vertical: true, blur: blurBoth });
tl.set(["#groundview", "#s10"], { x: 0, y: 0, scale: 1 }, s.s11.start + 0.02);
tl.set(G, { orb: 1, e: VIEW, theta: 180, eps: TILT, eq: 0, lat: 0, dot: 0, osize: 150 }, s.s11.start);
tl.set(L.orbit, { a: 1, draw: 1 }, s.s11.start);
tl.set(L.sun, { a: 1, s: 1 }, s.s11.start);
tl.set(L.mark, { jun: 1, mar: 1, sep: 1, dec: 0, glow: 0 }, s.s11.start);
tl.set(E, { vis: 1 }, s.s11.start);
tl.set(stage, { lx: SUNLX, ly: SUNLY, glow: 1.0 }, s.s11.start);
film.scene("#s11", s.s11.start, s.s12.start);
tl.set("#orbitnote", { autoAlpha: 1, opacity: 1 }, s.s11.start + 0.25);
tl.fromTo("#orbitnote", { opacity: 0 }, { opacity: 1, duration: 0.3, immediateRender: false }, s.s11.start + 0.25);
gsap.set("#m10-jun", { opacity: 1 });
// Half a year with "six months later": the Earth runs the near side of the orbit, and its axis never turns.
const SWEEP = said("s11", "six") - 0.1;
const LANDED = said("s11", "away");
tl.to(G, { theta: 360, duration: LANDED - SWEEP, ease: "power2.inOut" }, SWEEP);
film.land("#m10-dec", LANDED - 0.1);
tl.to(G, { osize: 186, duration: 0.6, ease: "power2.out" }, LANDED - 0.1);
film.pop("#chip-nw2", ends("s11")); // once "away." has been read
film.tintTo(COOL, LANDED - 0.3, 0.9);

// ── s12: Now the same light comes in low, ──────────────────────────────────
film.whip(["#spaceview", "#s11", "#orbitnote"], ["#groundview", "#s10"], s.s12.start, { blur: blurBoth });
tl.set("#orbitnote", { x: 0 }, s.s12.start + 0.02);
tl.set(E, { vis: 0 }, s.s12.start);
tl.set([L.orbit, L.sun], { a: 0 }, s.s12.start);
tl.set(L.mark, { jun: 0, mar: 0, sep: 0, dec: 0 }, s.s12.start);
tl.set("#spaceview", { x: 0, y: 0, autoAlpha: 1 }, s.s12.start + 0.02);
tl.to(L.beam, { ghost: 1, duration: 0.3 }, s.s12.start + 0.2);
tl.to(L.beam, { label: 0, duration: 0.2 }, s.s12.start + 0.2);
// The swing, from "same light" to "low": the patch is the beam's width over the sine of its height at every
// moment of it, and the gauge (light on each square metre) follows the same sine.
const SWING = said("s12", "same") - 0.05;
const SWUNG = said("s12", "low") + 0.15;
tl.to(L.beam, { alt: LOW, cool: 1, at: 700, duration: SWUNG - SWING, ease: "power2.inOut" }, SWING);
tl.to(L.beam, { same: 1, duration: 0.3 }, SWING);
tl.to("#gauge-fill", { scaleX: F_HIGH / F_LOW, duration: SWUNG - SWING, ease: "power2.inOut" }, SWING);
tl.set("#gauge-fill", { background: "linear-gradient(90deg, #2f6fb5, #a9d4ff)", boxShadow: "0 0 16px #5fb0ff" }, (SWING + SWUNG) / 2);
// No reading stands on screen while the beam is between its two heights.
tl.to("#panel .swap.a", { opacity: 0, duration: 0.2 }, SWING - 0.05);
tl.to(L.beam, { label: 1, duration: 0.3 }, SWUNG);
film.light({ lx: 0.98, ly: 0.64, glow: 0.9 }, s.s12.start + 0.2, 1.3);
film.tintTo(COOL, s.s12.start + 0.3, 1.2);

// ── s13: and spreads over twice the ground, ────────────────────────────────
tl.to(L.tile, { two: 1, duration: 0.4 }, said("s13", "twice") - 0.05);
tl.to("#panel .swap.b", { opacity: 1, duration: 0.25 }, said("s13", "twice") + 0.1);
tl.to("#groundview", { scale: 1.03, transformOrigin: "1030px 740px", duration: s.s13b.start - s.s12.start - 0.5, ease: "sine.inOut" }, s.s12.start + 0.5);

// ── s13b: so each bit gets less. ───────────────────────────────────────────
// A push in on the panel: the gauge, already at the value the angle gives (261 / 559 of June's), with June's level
// ghosted behind it so the drop reads as a drop.
tl.to("#panel", { scale: 1.45, x: 20, y: 70, transformOrigin: "0% 0%", duration: 0.55, ease: "power3.inOut" }, s.s13b.start - 0.15);
tl.to("#diagram", { opacity: 0.32, duration: 0.45 }, s.s13b.start - 0.1);
tl.to("#gauge-june", { opacity: 1, duration: 0.35 }, s.s13b.start + 0.35);
tl.to("#row-n", { opacity: 1, x: 0, duration: 0.4 }, s.s13b.start + 0.45);
tl.to("#row-l", { backgroundColor: "rgba(95,176,255,0.16)", duration: 0.25, yoyo: true, repeat: 1 }, said("s13b", "less.") - 0.05);
tl.to("#diagram", { opacity: 1, duration: 0.3 }, s.s14.start - 0.2);

// ── s14: The days get shorter, too: ────────────────────────────────────────
tl.to(L.beam, { a: 0, ghost: 0, duration: 0.4 }, s.s14.start - 0.12);
tl.to(L.tile, { one: 0, two: 0, duration: 0.3 }, s.s14.start - 0.2);
tl.to(L.ground, { tiles: 0, duration: 0.3 }, s.s14.start - 0.2);
tl.to("#s10", { opacity: 0, duration: 0.25 }, s.s14.start - 0.28);
tl.to("#groundview", { scale: 1, duration: 1.1, ease: "power2.inOut" }, s.s14.start - 0.15);
tl.to(L.chart, { a: 1, duration: 0.35 }, s.s14.start - 0.3);
film.scene("#s14", s.s14.start, s.s15.start); // both shots
film.land("#chart-title", s.s14.start + 0.15);
// June's long day first, then December's short one with "shorter".
tl.set(L.chart, { sunJun: 1 }, s.s14.start - 0.15);
tl.to(L.chart, { jun: 1, duration: 1.0, ease: "power1.inOut" }, s.s14.start - 0.15);
tl.to(L.chart, { sunJun: 0, duration: 0.3 }, s.s14.start + 0.9);
const DEC = said("s14", "shorter") - 0.1;
tl.set(L.chart, { sunDec: 1 }, DEC);
tl.to(L.chart, { dec: 1, duration: 0.9, ease: "power1.inOut" }, DEC);
tl.to(L.chart, { sunDec: 0, duration: 0.3 }, DEC + 1.0);

// ── s14b: about 9 hours of daylight, not 15. ───────────────────────────────
film.land("#chip-dec", said("s14b", "9") - 0.1);
// The June chip names its path as it completes: landed with "15" it would be gone before it was read.
film.land("#chip-june", s.s14.start + 1.0);
tl.to("#groundview, #s14", { scale: 1.025, transformOrigin: "960px 740px", duration: s.s15.start - DEC - 0.2, ease: "sine.inOut" }, DEC + 0.2);
film.light({ lx: 0.5, ly: 0.74, glow: 0.9 }, s.s14.start - 0.1, 1.0);
film.tintTo(AMBER, s.s14.start - 0.1, 0.8);

// ── s15: the recap ─────────────────────────────────────────────────────────
// The three small pictures are computed from the same numbers as the large ones.
{
  const sin = Math.sin(rad(TILT));
  const cos = Math.cos(rad(TILT));
  let arc = "";
  for (let a = 0; a <= TILT + 0.01; a += TILT / 12) arc += `${a ? "L" : "M"}${(200 + 104 * Math.sin(rad(a))).toFixed(1)} ${(124 - 104 * Math.cos(rad(a))).toFixed(1)}`;
  $("#rc-tilt").innerHTML = `
    <defs><radialGradient id="rcg" cx="34%" cy="32%" r="80%"><stop offset="0" stop-color="#7fc0ff"/><stop offset=".5" stop-color="#2b6fd6"/><stop offset="1" stop-color="#0b2256"/></radialGradient></defs>
    <path d="M40 124 H360" stroke="rgb(255 255 255 / .35)" stroke-width="2.5"/>
    <circle cx="200" cy="124" r="76" fill="url(#rcg)"/>
    <path d="M${200 - 76 * cos} ${124 - 76 * sin} L${200 + 76 * cos} ${124 + 76 * sin}" stroke="rgb(255 255 255 / .6)" stroke-width="2.5"/>
    <path d="M200 8 V240" stroke="rgb(255 255 255 / .75)" stroke-width="2.5" stroke-dasharray="9 8"/>
    <path d="M${200 - 116 * sin} ${124 + 116 * cos} L${200 + 116 * sin} ${124 - 116 * cos}" stroke="#ffb43a" stroke-width="6" stroke-linecap="round"/>
    <path d="${arc}" fill="none" stroke="#ffb43a" stroke-width="4"/>`;

  // One beam 60 px wide, steep and then low: the patches are 60 / sin(height).
  const beam = (x0, alt, colour, alpha) => {
    const f = 60 / Math.sin(rad(alt));
    let out = `<path d="M${x0} 198 h${f.toFixed(1)}" stroke="${colour}" stroke-width="9" stroke-linecap="round" opacity="${alpha}"/>`;
    for (let k = 0; k < 4; k++) {
      const x = x0 + (f * k) / 3;
      out += `<path d="M${(x + 128 * Math.cos(rad(alt))).toFixed(1)} ${(198 - 128 * Math.sin(rad(alt))).toFixed(1)} L${x.toFixed(1)} 190" stroke="${colour}" stroke-width="3.5" stroke-linecap="round" opacity=".9"/>`;
    }
    return out;
  };
  $("#rc-beam").innerHTML = `<path d="M10 206 H390" stroke="rgb(255 255 255 / .5)" stroke-width="2.5"/>${beam(36, HIGH, "#ffb43a", 1)}${beam(176, LOW, "#7fbcff", (Math.sin(rad(LOW)) / Math.sin(rad(HIGH))).toFixed(2))}`;

  // The two paths of the Sun, on the same scales: 13.33 px an hour, 2.2 px a degree.
  const path = (decl) => {
    let d = "";
    for (let h = 0; h <= 24; h += 0.1) {
      const alt = sunAlt(decl, h);
      if (alt >= 0) d += `${d ? "L" : "M"}${(40 + 13.333 * h).toFixed(1)} ${(196 - 2.2 * alt).toFixed(1)}`;
    }
    return d;
  };
  const bar = (day, y, colour) => `<path d="M${(40 + 13.333 * (12 - day / 2)).toFixed(1)} ${y} H${(40 + 13.333 * (12 + day / 2)).toFixed(1)}" stroke="${colour}" stroke-width="7" stroke-linecap="round"/>`;
  $("#rc-days").innerHTML = `
    <path d="${path(TILT)}" fill="none" stroke="#ffb43a" stroke-width="5" stroke-linecap="round"/>
    <path d="${path(-TILT)}" fill="none" stroke="#7fbcff" stroke-width="5" stroke-linecap="round"/>
    <path d="M24 196 H376" stroke="rgb(255 255 255 / .6)" stroke-width="2.5"/>
    ${bar(DAY_JUN, 212, "#ffb43a")}${bar(DAY_DEC, 226, "#7fbcff")}`;
}
// The chart has left before the recap's heading arrives: the two never share the frame as text over text.
tl.to(L.ground, { a: 0, duration: 0.35 }, s.s15.start - 0.45);
tl.to("#s14", { opacity: 0, duration: 0.22 }, s.s15.start - 0.5);
tl.set("#groundview", { autoAlpha: 0 }, s.s15.start + 0.1);
film.scene("#s15", s.s15.start - 0.25, s.s16.start);
tl.to(stage, { floor: 1, horizon: -0.3, lx: 0.5, ly: 0.56, glow: 0.8, duration: 0.6 }, s.s15.start - 0.2);
film.land("#recap-over", s.s15.start - 0.14);
// The tilt first, then each card with its own words: "steep light", "long days".
gsap.set(".rc", { opacity: 0, y: 110, rotationX: -18 });
const card = (sel, at) => tl.to(sel, { opacity: 1, y: 0, rotationX: 0, duration: 0.7, ease: "expo.out" }, at);
card("#rc1", s.s15.start - 0.22);
card("#rc2", said("s15", "steep") - 0.12);
card("#rc3", said("s15", "long") - 0.12);
tl.to(".rc", { y: -10, duration: 0.7, ease: "sine.inOut", stagger: 0.12, yoyo: true, repeat: 1 }, said("s15", "thats") + 0.1);
tl.to(".rc", { scale: 0.1, x: (i) => (1 - i) * 580, y: -40, opacity: 0, duration: 0.3, ease: "power3.in" }, s.s16.start - 0.3);
tl.to("#recap-over", { opacity: 0, duration: 0.2 }, s.s16.start - 0.22);

// ── s16: It's the tilt, not the distance. ──────────────────────────────────
film.scene("#s16", s.s16.start, storyboard.duration);
film.hit(s.s16.start, 0.8, 0.4);
tl.set(G, { theta: 52, e: 0, eps: TILT, orb: 0, eq: 0.5, lat: 0, dot: 0, osize: 150 }, s.s16.start);
tl.set(C, { x: 0, y: -240, size: 960 }, s.s16.start);
tl.set(E, { vis: 1 }, s.s16.start);
tl.to(C, { size: 380, duration: 0.95, ease: "expo.out" }, s.s16.start);
tl.to(stage, { floor: 0.5, lx: 0.5, ly: 0.3, glow: 0.9, duration: 0.8 }, s.s16.start);
const last = $$("#last .ln").map((line) => film.split(line));
film.typeIn(last[0], s.s16.start + 0.3);
film.typeIn(last[1], s.s16.start + 0.62);
film.land("#last-micro", s.s16.start + 1.4);
film.sheen("#last", s.s16.start + 1.7, 1.0);
tl.to(stage, { glow: 1.05, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: 1 }, s.s16.start + 1.4);
tl.to("#s16", { scale: 1.02, transformOrigin: "50% 60%", duration: s.s16.dur - 0.5, ease: "sine.inOut" }, s.s16.start + 0.5);
tl.to(C, { size: 388, duration: s.s16.dur - 1.0, ease: "sine.inOut" }, s.s16.start + 1.0);

film.finish();
