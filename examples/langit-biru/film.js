// "Kenapa langit berwarna biru?" Built from storyboard.json: every time below comes from a shot's start or end.
import { createFilm } from "../../kit/engine/motion.js";
import { createEarth } from "./earth.js";
import { createLab } from "./lab.js";
import { createSky } from "./sky.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, $$, stage, shots: s } = film;

// The three drawn layers and the state each is drawn from.
const earth = await createEarth($("#space"));
const sky = createSky($("#sky"));
const lab = createLab($("#lab"));
const L = lab.L;
$("#lab").style.opacity = 1;
const E = { vis: 1, x: 500, y: 0, size: 660, turn: 2.3, tilt: 0.28, air: 1, thick: 1.035 };
const K = { vis: 0, sunx: 0.16, suny: 0.8, dusk: 0, lit: 0 };
const ground = $("#ground");
film.each((t) => {
  lab.draw(t);
  earth.render(E, t);
  sky.render(K, t);
  ground.style.opacity = K.vis;
  ground.style.visibility = K.vis > 0.002 ? "visible" : "hidden";
});
const slam = (lines, at) => {
  gsap.set(lines, { scale: 1.5, opacity: 0, filter: "blur(18px)" });
  tl.to(lines, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.5, ease: "expo.out", stagger: 0.16 }, at);
};
const BLUE = "#4da3ff";
const WHITE = "#fff1dc";
const ORANGE = "#ff8a2a";

film.captions();
film.chapters({ from: s.s05.start, until: s.s20.end });

// ── s01: the question, over the Earth ──────────────────────────────────────
Object.assign(stage, { lx: 0.73, ly: 0.5, glow: 0.5, floor: 0, silk: 0.75 });
film.scene("#s01", 0, s.s02.start);
tl.to(E, { turn: 2.95, duration: s.s04.start, ease: "none" }, 0);
tl.to(stage, { glow: 0.85, duration: 1.4, ease: "power2.out" }, 0);
const title = film.split("#title");
film.typeIn(title, 0.12, { stagger: 0.024 });
film.sheen("#title", 1.3, 0.9);
film.typeOut(title, s.s01.end - 0.42);

// ── s02: the thin blue line ────────────────────────────────────────────────
film.scene("#s02", s.s02.start, s.s03.start);
// The pole tips away as the camera arrives, so the edge it lands on is ocean and land, not the ice cap.
tl.to(E, { x: 140, y: 1310, size: 2900, tilt: -0.85, duration: 1.75, ease: "power3.inOut" }, s.s02.start - 0.1);
film.light({ lx: 0.42, ly: 0.74, glow: 0.9 }, s.s02.start, 1.6);
film.draw("#lead-air", s.s02.start + 1.5, 0.35);
film.pop("#dot-air", s.s02.start + 1.45, { transformOrigin: "50% 50%" });
film.land("#chip-air", s.s02.start + 1.6);
tl.to(E, { air: 1.5, duration: 0.3, ease: "power2.out" }, s.s02.start + 1.7);
tl.to(E, { air: 1, duration: 0.7, ease: "power2.inOut" }, s.s02.start + 2.0);

// ── s03: sunlight is white ─────────────────────────────────────────────────
tl.to("#chip-air, #lead-air, #dot-air", { opacity: 0, duration: 0.22 }, s.s03.start - 0.26);
film.scene("#s03", s.s03.start, s.s04.start);
tl.to(E, { x: 570, y: 0, size: 460, tilt: 0.28, duration: 1.0, ease: "power3.inOut" }, s.s03.start - 0.1);
film.light({ lx: 0.06, ly: 0.5, glow: 1.0 }, s.s03.start, 1.0);
film.tintTo(WHITE, s.s03.start, 1.0);
tl.set(L.beam, { a: 1, x0: 0, x1: 0, y: 540, w: 96, soft: 180 }, s.s03.start + 0.6);
tl.to(L.beam, { x1: 1336, duration: 1.1, ease: "power2.out" }, s.s03.start + 0.65);
tl.to(L.beam, { soft: 64, duration: 0.5 }, s.s03.start + 1.2);
film.land("#chip-sun", s.s03.start + 1.0);
film.hit(s.s03.start + 1.75, 0.3, 0.3);
// Into the beam: it swells until the frame is light.
tl.to(L.beam, { w: 1500, x1: 1920, duration: 0.42, ease: "power3.in" }, s.s04.start - 0.42);
tl.to(E, { vis: 0, duration: 0.3, ease: "power1.in" }, s.s04.start - 0.34);

// ── s04: the question, stated ──────────────────────────────────────────────
film.scene("#s04", s.s04.start, s.s05.start);
film.hit(s.s04.start, 0.9, 0.35);
tl.to(L.beam, { w: 40, a: 0.4, duration: 0.5, ease: "expo.out" }, s.s04.start);
tl.to(stage, { floor: 0.7, horizon: -0.3, lx: 0.5, ly: 0.52, glow: 0.7, duration: 0.6 }, s.s04.start);
for (const line of $$("#ask .ln")) film.split(line);
slam("#ask .ln", s.s04.start + 0.04);
film.sheen("#ask", s.s04.start + 0.9, 0.8);
const blur4 = film.motionBlur("#s04");
tl.to("#s04", { y: -900, duration: 0.3, ease: "power3.in" }, s.s05.start - 0.3);
blur4(s.s05.start - 0.3, 0.34, 0, 50);
tl.to(stage, { camy: "+=3", duration: 0.6, ease: "power3.inOut" }, s.s05.start - 0.3);

// ── s05: white light is every colour ───────────────────────────────────────
tl.to(L.beam, { w: 64, a: 1, x1: 712, soft: 22, duration: 0.45, ease: "power3.out" }, s.s05.start - 0.1);
tl.fromTo(L.prism, { a: 0, y: 900 }, { a: 1, y: 540, duration: 0.7, ease: "expo.out", immediateRender: false }, s.s05.start);
film.light({ lx: 0.42, ly: 0.5, glow: 0.8 }, s.s05.start, 0.8);
tl.set(L.fan, { a: 1 }, s.s05.start + 0.8);
tl.to(L.fan, { open: 1, duration: 1.5, ease: "power2.out" }, s.s05.start + 0.85);
film.tintTo("#cfe0ff", s.s05.start + 1, 1.5);

// ── s06: every colour is a wave ────────────────────────────────────────────
tl.to(L.prism, { a: 0, duration: 0.4 }, s.s06.start - 0.1);
tl.to(L.beam, { a: 0, duration: 0.4 }, s.s06.start - 0.1);
tl.to(L.fan, { straight: 1, duration: 0.9, ease: "power3.inOut" }, s.s06.start - 0.1);
tl.to(L.fan, { wave: 1, duration: 0.9, ease: "power2.inOut" }, s.s06.start + 0.8);
film.light({ lx: 0.5, ly: 0.55, glow: 0.6 }, s.s06.start, 0.8);

// ── s07: red is long, blue is short ────────────────────────────────────────
tl.to(L.fan, { focus: 1, duration: 0.9, ease: "power3.inOut" }, s.s07.start - 0.45);
// The two lengths are stated, never counted up through values that are not true.
L.marks.redNm = 700;
L.marks.blueNm = 450;
tl.to(L.marks, { red: 1, duration: 0.5, ease: "power3.out" }, s.s07.start + 0.4);
tl.to(L.marks, { blue: 1, duration: 0.5, ease: "power3.out" }, s.s07.start + 0.8);
tl.to(L.fan, { a: 0, duration: 0.35, ease: "power1.in" }, s.s08.start - 0.4);
tl.to(L.marks, { red: 0, blue: 0, duration: 0.3 }, s.s08.start - 0.4);

// ── s08: air is full of molecules ──────────────────────────────────────────
film.scene("#s08", s.s08.start, s.s09.start);
tl.to(L.mol, { a: 1, duration: 0.6, ease: "power2.out" }, s.s08.start - 0.2);
tl.fromTo(L.mol, { push: -0.3 }, { push: 0.55, duration: s.s08.dur + 0.4, ease: "none", immediateRender: false }, s.s08.start - 0.2);
film.light({ lx: 0.6, ly: 0.6, glow: 0.7 }, s.s08.start, 1);
film.tintTo(BLUE, s.s08.start, 1.2);
film.land("#chip-n2", s.s08.start + 0.75);
film.land("#chip-o2", s.s08.start + 1.0);
tl.to(L.mol, { a: 0, duration: 0.35 }, s.s09.start - 0.35);
tl.to("#chip-n2, #chip-o2", { opacity: 0, duration: 0.25 }, s.s09.start - 0.3);

// ── s09: far smaller than a wave of light ──────────────────────────────────
film.scene("#s09", s.s09.start, s.s10.start);
// The wave is already arriving as the molecules clear, so the frame is never empty between the two.
tl.set(L.fan, { solo: 1, open: 0 }, s.s09.start - 0.34);
tl.set(L.mol, { cluster: 1, push: 0 }, s.s09.start);
tl.to(L.fan, { a: 1, duration: 0.2 }, s.s09.start - 0.32);
tl.to(L.fan, { open: 1, duration: 1.0, ease: "power2.out" }, s.s09.start - 0.32);
tl.to(L.marks, { blue: 1, duration: 0.5, ease: "power3.out" }, s.s09.start + 0.4);
tl.to(L.mag, { a: 1, duration: 0.3 }, s.s09.start + 0.55);
tl.to(L.mag, { s: 1, duration: 0.6, ease: "back.out(1.7)" }, s.s09.start + 0.55);
film.land("#chip-mol", s.s09.start + 0.8);
film.land("#times", s.s09.start + 0.9);
tl.to(L.fan, { a: 0, duration: 0.3 }, s.s10.start - 0.35);
tl.to(L.marks, { blue: 0, duration: 0.3 }, s.s10.start - 0.35);
tl.to(L.mag, { a: 0, duration: 0.3 }, s.s10.start - 0.35);
tl.to("#s09", { opacity: 0, duration: 0.3 }, s.s10.start - 0.32);

// ── s10: red slips through ─────────────────────────────────────────────────
film.scene("#s10", s.s10.start, s.s12.start);
gsap.set("#chip-blue", { autoAlpha: 0 });
tl.to(L.mol, { a: 1, duration: 0.45 }, s.s10.start - 0.4);
tl.set(L.ray, { blue: 0, pass: 0, scatter: 0 }, s.s10.start);
tl.to(L.ray, { a: 1, duration: 0.2 }, s.s10.start + 0.15);
tl.to(L.ray, { pass: 1, duration: 1.7, ease: "none" }, s.s10.start + 0.2);
tl.to(L.ray, { scatter: 0.2, duration: 0.6 }, s.s10.start + 0.85);
film.land("#chip-red", s.s10.start + 0.15);
film.land("#meter", s.s10.start + 0.5);
// The meter's two readings stand in the ratio the film states: 1 to 5.9.
tl.to("#meter-fill", { scaleX: 0.155, duration: 0.7, ease: "power2.out" }, s.s10.start + 1.1);
film.land("#meter-red", s.s10.start + 1.25, { from: 10 });
film.tintTo("#ff7a5c", s.s10.start, 1.0);
film.light({ lx: 0.5, ly: 0.52, glow: 0.6 }, s.s10.start, 0.8);
tl.to(L.ray, { a: 0, duration: 0.22 }, s.s11.start - 0.25);
tl.to("#chip-red", { autoAlpha: 0, duration: 0.2 }, s.s11.start - 0.2);

// ── s11: blue is scattered everywhere ──────────────────────────────────────
tl.set(L.ray, { blue: 1, pass: 0, scatter: 0 }, s.s11.start - 0.02);
tl.to(L.ray, { a: 1, duration: 0.2 }, s.s11.start);
tl.to(L.ray, { pass: 1, duration: 1.5, ease: "none" }, s.s11.start + 0.1);
tl.to(L.ray, { scatter: 1, duration: 1.0, ease: "power2.out" }, s.s11.start + 0.6);
tl.set("#chip-blue", { autoAlpha: 1 }, s.s11.start);
film.land("#chip-blue", s.s11.start);
tl.to("#meter-red", { opacity: 0, duration: 0.2 }, s.s11.start + 0.6);
tl.to("#meter-fill", { scaleX: 0.915, duration: 0.8, ease: "power2.out" }, s.s11.start + 0.75);
film.land("#meter-blue", s.s11.start + 1.1, { from: 10 });
film.tintTo(BLUE, s.s11.start, 0.9);
film.light({ glow: 1.1 }, s.s11.start + 0.5, 1.0);
tl.to(L.ray, { a: 0, duration: 0.15 }, s.s12.start - 0.02);
tl.to(L.mol, { a: 0, duration: 0.15 }, s.s12.start - 0.02);

// ── s12: its name ──────────────────────────────────────────────────────────
const NAME = { scale: 0.3, x: 520, y: -358 };
// The scene outlives its shot: the name stays on as the title of the chart in s13 and s14.
film.scene("#s12", s.s12.start, s.s15.start);
film.hit(s.s12.start, 0.8, 0.45);
film.split("#name");
slam("#name", s.s12.start + 0.04);
film.land("#name-over", s.s12.start + 0.02, { from: -16 });
film.land("#name-micro", s.s12.start + 0.6);
film.sheen("#name", s.s12.start + 0.75, 0.8);
// The name shrinks into the top right corner and stays there as the chart's title.
tl.to("#name", { scale: NAME.scale, x: NAME.x, y: NAME.y, duration: 0.44, ease: "power3.inOut" }, s.s13.start - 0.44);
tl.to("#name-over, #name-micro", { opacity: 0, duration: 0.2 }, s.s13.start - 0.42);

// ── s13: the curve ─────────────────────────────────────────────────────────
// The chart's own coordinates: x from 400 nm to 700 nm, y the strength against red, which is (700 / λ)⁴.
const cx = (nm) => 320 + ((nm - 400) / 300) * 1320;
const cy = (nm) => 770 - ((700 / nm) ** 4 / 9.6) * 560;
let d = "";
for (let nm = 700; nm >= 400; nm -= 4) d += `${nm === 700 ? "M" : "L"}${cx(nm).toFixed(1)} ${cy(nm).toFixed(1)}`;
$("#curve").setAttribute("d", d);
$("#curve-glow").setAttribute("d", d);
for (let nm = 400; nm <= 700; nm += 50) {
  $("#ticks").insertAdjacentHTML("beforeend", `<path class="tick" d="M${cx(nm)} 770 v14" /><text x="${cx(nm)}" y="856">${nm}</text>`);
}
// The chart starts drawing while the name is still travelling to its corner, so the stage is never bare.
film.scene("#s13", s.s13.start - 0.3, s.s15.start);
gsap.set("#ticks, .axis-label", { opacity: 0 });
gsap.set("#strip", { scaleX: 0, transformOrigin: "0% 50%" });
gsap.set("#pt-red, #pt-blue", { scale: 0, transformOrigin: "50% 50%" });
gsap.set("#tag-red, #tag-blue, #calc, #formula", { opacity: 0 });
film.draw("#axis", s.s13.start - 0.3, 0.55);
tl.to("#strip", { scaleX: 1, duration: 0.6, ease: "power3.out" }, s.s13.start - 0.1);
tl.to("#ticks, .axis-label", { opacity: 1, duration: 0.4 }, s.s13.start + 0.05);
film.draw("#curve, #curve-glow", s.s13.start + 0.4, 1.2, "power2.inOut");
film.land("#formula", s.s13.start + 1.3);
film.light({ lx: 0.3, ly: 0.7, glow: 0.7 }, s.s13.start, 1.2);

// ── s14: the number ────────────────────────────────────────────────────────
film.draw("#guide-red", s.s14.start + 0.15, 0.3, "none");
tl.to("#pt-red", { scale: 1, duration: 0.45, ease: "back.out(2.4)" }, s.s14.start + 0.4);
film.land("#tag-red", s.s14.start + 0.5);
film.draw("#guide-blue", s.s14.start + 0.95, 0.5, "none");
tl.to("#pt-blue", { scale: 1, duration: 0.5, ease: "back.out(2.6)" }, s.s14.start + 1.4);
film.land("#tag-blue", s.s14.start + 1.35);
film.land("#calc", s.s14.start + 2.4);
tl.to("#s13", { scale: 1.035, transformOrigin: "30% 45%", duration: s.s14.dur, ease: "sine.inOut" }, s.s14.start);
tl.to("#s13, #name", { opacity: 0, duration: 0.25 }, s.s15.start - 0.25);

// ── s15: blue from every part of the sky ───────────────────────────────────
// Sunlight crosses the air; each molecule it meets throws blue every way; some of it comes down to the eye.
film.hit(s.s15.start, 0.5, 0.3);
tl.set(K, { lit: 0.34 }, s.s15.start - 0.3);
tl.to(K, { vis: 1, duration: 0.3 }, s.s15.start - 0.26);
tl.to(K, { lit: 1, duration: 1.2, ease: "power2.out" }, s.s15.start - 0.1);
tl.to(L.sky, { a: 1, duration: 0.3 }, s.s15.start + 0.25);
tl.to(L.sky, { p: 1, duration: 1.75, ease: "none" }, s.s15.start + 0.3);
tl.to(K, { vis: 0, duration: 0.3 }, s.s16.start - 0.3);
tl.to(L.sky, { a: 0, duration: 0.25 }, s.s16.start - 0.3);

// ── s16: why not violet? ───────────────────────────────────────────────────
// The same law as the chart, drawn over the spectrum itself: a bar is 46 px for each "times stronger than red".
const bx = (nm) => 200 + ((nm - 400) / 300) * 1520;
const by = (nm) => 586 - 46 * (700 / nm) ** 4;
let again = "";
for (let nm = 700; nm >= 400; nm -= 4) again += `${nm === 700 ? "M" : "L"}${bx(nm).toFixed(1)} ${by(nm).toFixed(1)}`;
$("#again-curve").setAttribute("d", again);
$("#again-glow").setAttribute("d", again);
// The spectrum opens as the sky closes: the two cross, so the frame is never empty.
film.scene("#s16", s.s16.start - 0.3, s.s18.start);
gsap.set("#bar-violet, #bar-blue, #bar-red", { scaleY: 0 });
gsap.set("#qmark, #reasons, #seen", { opacity: 0 });
gsap.set("#band", { scaleY: 6, opacity: 0 });
tl.to("#band", { scaleY: 1, opacity: 1, duration: 0.6, ease: "power3.out" }, s.s16.start - 0.3);
tl.to("#bar-red", { scaleY: 1, duration: 0.4, ease: "back.out(1.4)" }, s.s16.start + 0.25);
film.draw("#again-curve, #again-glow", s.s16.start + 0.35, 1.2, "power2.in");
tl.to("#bar-blue", { scaleY: 1, duration: 0.55, ease: "back.out(1.4)" }, s.s16.start + 0.95);
tl.to("#bar-violet", { scaleY: 1, duration: 0.7, ease: "back.out(1.3)" }, s.s16.start + 1.3);
film.land("#formula2", s.s16.start + 1.5);
tl.fromTo("#qmark", { opacity: 0, y: 40, scale: 0.5 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(2.2)" }, s.s16.start + 2.15);
film.light({ lx: 0.18, ly: 0.62, glow: 0.8 }, s.s16.start, 1.0);
film.tintTo("#a67bff", s.s16.start + 1.0, 1.2);

// ── s17: three reasons ─────────────────────────────────────────────────────
tl.to("#bar-violet, #bar-blue, #bar-red, #qmark, #again, #formula2", { opacity: 0, duration: 0.25 }, s.s17.start - 0.3);
tl.to("#band", { y: -456, scaleX: 0.92, scaleY: 0.8, duration: 0.6, ease: "power3.inOut" }, s.s17.start - 0.3);
tl.fromTo("#reasons", { opacity: 0, y: 90, rotationX: -16, transformPerspective: 1400 }, { opacity: 1, y: 0, rotationX: 0, duration: 0.6, ease: "expo.out" }, s.s17.start + 0.15);
gsap.set("#reasons .prow", { opacity: 0, x: -24 });
tl.to("#reasons .prow", { opacity: 1, x: 0, duration: 0.4, stagger: 0.42 }, s.s17.start + 0.4);
// Each reason takes some of the violet away from what reaches the eye.
[0.4, 0.72, 1].forEach((dim, i) => tl.to("#band-dim", { opacity: dim, duration: 0.35, ease: "power2.out" }, s.s17.start + 0.5 + i * 0.42));
gsap.set("#seen-fill", { scale: 0 });
tl.to("#seen", { opacity: 1, duration: 0.3 }, s.s17.start + 1.55);
tl.to("#seen-fill", { scale: 1, duration: 0.6, ease: "back.out(1.8)" }, s.s17.start + 1.6);
film.tintTo(BLUE, s.s17.start + 1.4, 1.2);
// The swatch of sky travels to where the Earth will be, at the Earth's size, and the Earth dissolves in under it.
tl.to("#reasons, #band, #seen span", { opacity: 0, duration: 0.25 }, s.s18.start - 0.6);
tl.to("#seen-fill", { x: -610, y: 308, scale: 2.9, duration: 0.4, ease: "power3.inOut" }, s.s18.start - 0.54);
tl.to("#seen-fill", { opacity: 0, duration: 0.14 }, s.s18.start - 0.14);

// ── s18: the long road at dusk ─────────────────────────────────────────────
film.scene("#s18", s.s18.start, s.s19.start);
tl.set(E, { x: 0, y: 280, size: 986, thick: 1.14, air: 1.25, turn: 2.2 }, s.s18.start - 0.3);
tl.to(E, { vis: 1, duration: 0.12 }, s.s18.start - 0.16);
tl.to(E, { size: 1000, duration: 0.9, ease: "power2.out" }, s.s18.start);
tl.to(E, { turn: 2.6, duration: s.s18.dur, ease: "none" }, s.s18.start);
tl.to(stage, { floor: 0, duration: 0.4 }, s.s18.start - 0.2);
film.light({ lx: 0.03, ly: 0.5, glow: 1.0 }, s.s18.start, 1.0);
film.tintTo(WHITE, s.s18.start, 1.0);
gsap.set(".pin", { scale: 0, transformOrigin: "50% 50%" });
film.draw("#road-noon", s.s18.start + 0.5, 0.4, "none");
film.draw("#in-noon", s.s18.start + 0.85, 0.3, "none");
tl.to("#pin-noon", { scale: 1, duration: 0.4, ease: "back.out(2.4)" }, s.s18.start + 0.5);
film.land("#chip-noon", s.s18.start + 0.7);
film.draw("#road-dusk", s.s18.start + 1.1, 0.55, "none");
film.draw("#in-dusk", s.s18.start + 1.6, 0.4, "none");
tl.to("#pin-dusk", { scale: 1, duration: 0.4, ease: "back.out(2.4)" }, s.s18.start + 1.1);
film.land("#chip-dusk", s.s18.start + 1.3);
film.land("#scale-note", s.s18.start + 1.7);
tl.to(E, { vis: 0, duration: 0.3 }, s.s19.start - 0.32);
tl.to("#s18", { opacity: 0, duration: 0.25 }, s.s19.start - 0.3);

// ── s19: the blue is lost on the way ───────────────────────────────────────
film.scene("#s19", s.s19.start, s.s20.start);
tl.to(stage, { floor: 0.7, duration: 0.4 }, s.s19.start);
tl.to(L.path, { a: 1, duration: 0.3 }, s.s19.start - 0.05);
tl.to(L.path, { p: 1, duration: 2.05, ease: "power1.inOut" }, s.s19.start + 0.1);
gsap.set("#left-fill", { scaleX: 1 });
film.land("#left", s.s19.start + 0.25);
tl.to("#left-fill", { scaleX: 0.05, duration: 2.0, ease: "power2.out" }, s.s19.start + 0.3);
film.tintTo(BLUE, s.s19.start - 0.1, 0.3);
film.tintTo(ORANGE, s.s19.start + 0.5, 1.8);
film.light({ lx: 0.9, ly: 0.54, glow: 0.9 }, s.s19.start + 0.3, 2.0);
tl.to(L.path, { a: 0, duration: 0.25 }, s.s20.start - 0.28);
tl.to("#left", { opacity: 0, duration: 0.22 }, s.s20.start - 0.3);

// ── s20: what is left ──────────────────────────────────────────────────────
tl.set(K, { dusk: 1, lit: 1, sunx: 0.4, suny: 0.44 }, s.s20.start - 0.3);
tl.to(K, { vis: 1, duration: 0.35 }, s.s20.start - 0.25);
tl.to(K, { suny: 0.29, duration: s.s20.dur + 0.2, ease: "none" }, s.s20.start - 0.2);
tl.to(K, { vis: 0, duration: 0.4 }, s.s21.start - 0.4);

// ── s21: the recap ─────────────────────────────────────────────────────────
film.scene("#s21", s.s21.start - 0.3, s.s22.start);
film.tintTo(BLUE, s.s21.start - 0.2, 0.8);
tl.to(stage, { floor: 1, horizon: -0.3, lx: 0.5, ly: 0.56, glow: 0.8, duration: 0.6 }, s.s21.start - 0.2);
film.land("#recap-over", s.s21.start - 0.28);
gsap.set(".rc", { opacity: 0, y: 110, rotationX: -18 });
tl.to(".rc", { opacity: 1, y: 0, rotationX: 0, duration: 0.75, ease: "expo.out", stagger: 0.32 }, s.s21.start + 0.02);
tl.to(".rc", { y: -10, duration: 1.6, ease: "sine.inOut", stagger: 0.2, yoyo: true, repeat: 1 }, s.s21.start + 1.7);
tl.to(".rc", { scale: 0.1, x: (i) => (1 - i) * 570, y: -40, opacity: 0, duration: 0.4, ease: "power3.in" }, s.s22.start - 0.4);
tl.to("#recap-over", { opacity: 0, duration: 0.25 }, s.s22.start - 0.35);

// ── s22: the line to remember ──────────────────────────────────────────────
film.scene("#s22", s.s22.start, storyboard.duration);
film.hit(s.s22.start, 0.8, 0.4);
tl.set(E, { vis: 1, x: 0, y: -250, size: 980, thick: 1.035, air: 1, turn: 2.3 }, s.s22.start);
tl.to(E, { size: 330, duration: 0.95, ease: "expo.out" }, s.s22.start);
tl.to(E, { turn: 2.75, duration: s.s22.dur, ease: "none" }, s.s22.start);
tl.to(stage, { floor: 0.5, lx: 0.5, ly: 0.74, glow: 0.9, duration: 0.8 }, s.s22.start);
const last = $$("#last .ln").map((line) => film.split(line));
film.typeIn(last[0], s.s22.start + 0.3);
film.typeIn(last[1], s.s22.start + 0.62);
film.land("#last-micro", s.s22.start + 1.4);
film.sheen("#last", s.s22.start + 1.7, 1.0);
tl.to(stage, { glow: 1.05, duration: 1.3, ease: "sine.inOut", yoyo: true, repeat: 1 }, s.s22.start + 1.4);
tl.to("#s22", { scale: 1.02, transformOrigin: "50% 60%", duration: s.s22.dur - 0.5, ease: "sine.inOut" }, s.s22.start + 0.5);

film.finish();
