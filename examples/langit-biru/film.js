// "Kenapa langit berwarna biru?" Built from storyboard.json: every time below comes from a shot's start or end.
import { createFilm } from "../../kit/engine/motion.js";
import { createEarth } from "./earth.js";
import { createLab } from "./lab.js";
import { createSky } from "./sky.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, $$, stage, shots: s } = film;

// The three drawn layers and the state each is drawn from.
const earth = createEarth($("#space"));
const sky = createSky($("#sky"));
const lab = createLab($("#lab"));
const L = lab.L;
$("#lab").style.opacity = 1;
const E = { vis: 1, x: 500, y: 0, size: 660, turn: 0.5, tilt: 0.28, air: 1, thick: 1.035 };
const K = { vis: 0, sunx: 0.16, suny: 0.8, dusk: 0, lit: 0 };
film.each((t) => {
  lab.draw(t);
  earth.render(E, t);
  sky.render(K, t);
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
tl.to(E, { turn: 1.5, duration: s.s04.start, ease: "none" }, 0);
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
film.scene("#s03", s.s03.start, s.s04.start);
tl.to(E, { x: 570, y: 0, size: 460, tilt: 0.28, duration: 1.0, ease: "power3.inOut" }, s.s03.start - 0.1);
film.light({ lx: 0.06, ly: 0.5, glow: 1.0 }, s.s03.start, 1.0);
film.tintTo(WHITE, s.s03.start, 1.0);
tl.set(L.beam, { a: 1, x0: 0, x1: 0, y: 540, w: 96 }, s.s03.start + 0.6);
tl.to(L.beam, { x1: 1304, duration: 1.1, ease: "power2.out" }, s.s03.start + 0.65);
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
tl.to(L.beam, { w: 64, a: 1, x1: 724, duration: 0.45, ease: "power3.out" }, s.s05.start - 0.1);
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
tl.to(L.marks, { red: 1, duration: 0.5, ease: "power3.out" }, s.s07.start + 0.55);
tl.to(L.marks, { redNm: 700, duration: 0.7, ease: "power2.out" }, s.s07.start + 0.55);
tl.to(L.marks, { blue: 1, duration: 0.5, ease: "power3.out" }, s.s07.start + 1.0);
tl.to(L.marks, { blueNm: 450, duration: 0.7, ease: "power2.out" }, s.s07.start + 1.0);
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
tl.set(L.fan, { solo: 1, open: 0 }, s.s09.start - 0.02);
tl.set(L.mol, { cluster: 1, push: 0 }, s.s09.start);
tl.to(L.fan, { a: 1, duration: 0.2 }, s.s09.start);
tl.to(L.fan, { open: 1, duration: 0.9, ease: "power2.out" }, s.s09.start);
tl.to(L.marks, { blue: 1, duration: 0.5, ease: "power3.out" }, s.s09.start + 0.8);
tl.to(L.mag, { a: 1, duration: 0.3 }, s.s09.start + 0.95);
tl.to(L.mag, { s: 1, duration: 0.6, ease: "back.out(1.7)" }, s.s09.start + 0.95);
film.land("#chip-mol", s.s09.start + 1.25);
film.land("#times", s.s09.start + 1.4);
film.count("#times-n", 1, 1500, s.s09.start + 1.45, 0.9, (v) => Math.round(v).toLocaleString("id-ID"));
tl.to(L.fan, { a: 0, duration: 0.3 }, s.s10.start - 0.35);
tl.to(L.marks, { blue: 0, duration: 0.3 }, s.s10.start - 0.35);
tl.to(L.mag, { a: 0, duration: 0.3 }, s.s10.start - 0.35);
tl.to("#s09", { opacity: 0, duration: 0.3 }, s.s10.start - 0.32);

// ── s10: red slips through ─────────────────────────────────────────────────
film.scene("#s10", s.s10.start, s.s12.start);
gsap.set("#chip-blue", { autoAlpha: 0 });
tl.to(L.mol, { a: 1, duration: 0.5 }, s.s10.start - 0.15);
tl.set(L.ray, { blue: 0, pass: 0, scatter: 0 }, s.s10.start);
tl.to(L.ray, { a: 1, duration: 0.2 }, s.s10.start + 0.15);
tl.to(L.ray, { pass: 1, duration: 1.7, ease: "none" }, s.s10.start + 0.2);
tl.to(L.ray, { scatter: 0.2, duration: 0.6 }, s.s10.start + 0.85);
film.land("#chip-red", s.s10.start + 0.15);
film.land("#meter", s.s10.start + 0.5);
tl.to("#meter-fill", { scaleX: 0.13, duration: 0.8, ease: "power2.out" }, s.s10.start + 1.2);
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
tl.to("#meter-fill", { scaleX: 0.92, duration: 1.0, ease: "power2.out" }, s.s11.start + 0.8);
film.tintTo(BLUE, s.s11.start, 0.9);
film.light({ glow: 1.1 }, s.s11.start + 0.5, 1.0);
tl.to(L.ray, { a: 0, duration: 0.15 }, s.s12.start - 0.02);
tl.to(L.mol, { a: 0, duration: 0.15 }, s.s12.start - 0.02);

// ── s12: its name ──────────────────────────────────────────────────────────
film.scene("#s12", s.s12.start, s.s13.start);
film.hit(s.s12.start, 0.8, 0.45);
film.split("#name");
slam("#name", s.s12.start + 0.04);
film.land("#name-over", s.s12.start + 0.02, { from: -16 });
film.land("#name-micro", s.s12.start + 0.6);
film.sheen("#name", s.s12.start + 0.75, 0.8);
tl.to("#name", { scale: 0.26, x: -560, y: -330, opacity: 0, duration: 0.36, ease: "power3.in" }, s.s13.start - 0.36);
tl.to("#name-over, #name-micro", { opacity: 0, duration: 0.2 }, s.s13.start - 0.3);

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
film.scene("#s13", s.s13.start, s.s15.start);
gsap.set("#ticks, .axis-label", { opacity: 0 });
gsap.set("#strip", { scaleX: 0, transformOrigin: "0% 50%" });
gsap.set("#pt-red, #pt-blue", { scale: 0, transformOrigin: "50% 50%" });
gsap.set("#tag-red, #tag-blue, #calc, #formula", { opacity: 0 });
film.draw("#axis", s.s13.start + 0.05, 0.7);
tl.to("#strip", { scaleX: 1, duration: 0.7, ease: "power3.out" }, s.s13.start + 0.45);
tl.to("#ticks, .axis-label", { opacity: 1, duration: 0.5 }, s.s13.start + 0.6);
film.draw("#curve, #curve-glow", s.s13.start + 0.95, 1.2, "power2.inOut");
film.land("#formula", s.s13.start + 1.8);
film.light({ lx: 0.3, ly: 0.7, glow: 0.7 }, s.s13.start, 1.2);

// ── s14: the number ────────────────────────────────────────────────────────
film.draw("#guide-red", s.s14.start + 0.15, 0.3, "none");
tl.to("#pt-red", { scale: 1, duration: 0.45, ease: "back.out(2.4)" }, s.s14.start + 0.4);
film.land("#tag-red", s.s14.start + 0.5);
film.draw("#guide-blue", s.s14.start + 0.95, 0.5, "none");
tl.to("#pt-blue", { scale: 1, duration: 0.5, ease: "back.out(2.6)" }, s.s14.start + 1.4);
film.land("#tag-blue", s.s14.start + 1.35);
film.count("#blue-n", 1, 5.9, s.s14.start + 1.45, 1.0, (v) => v.toFixed(1).replace(".", ","));
film.land("#calc", s.s14.start + 2.4);
tl.to("#s13", { scale: 1.035, transformOrigin: "30% 45%", duration: s.s14.dur, ease: "sine.inOut" }, s.s14.start);
tl.to("#s13", { opacity: 0, duration: 0.25 }, s.s15.start - 0.25);

// ── s15: blue from every part of the sky ───────────────────────────────────
film.scene("#ground", s.s15.start, s.s16.start);
film.hit(s.s15.start, 0.6, 0.3);
tl.to(K, { vis: 1, duration: 0.25 }, s.s15.start - 0.1);
tl.to(K, { lit: 1, duration: 1.5, ease: "power2.out" }, s.s15.start);
tl.to(L.sky, { a: 1, duration: 0.3 }, s.s15.start + 0.85);
tl.to(L.sky, { p: 1, duration: 1.3, ease: "none" }, s.s15.start + 0.85);
tl.to(K, { vis: 0, duration: 0.3 }, s.s16.start - 0.3);
tl.to(L.sky, { a: 0, duration: 0.25 }, s.s16.start - 0.3);

// ── s16: why not violet? ───────────────────────────────────────────────────
film.scene("#s16", s.s16.start, s.s18.start);
gsap.set("#bar-violet, #bar-blue", { scaleY: 0 });
gsap.set("#qmark, #reasons, #seen", { opacity: 0 });
tl.fromTo("#band", { scaleY: 10, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.65, ease: "expo.out" }, s.s16.start - 0.05);
tl.to("#bar-blue", { scaleY: 1, duration: 0.6, ease: "back.out(1.4)" }, s.s16.start + 0.95);
tl.to("#bar-violet", { scaleY: 1, duration: 0.8, ease: "back.out(1.3)" }, s.s16.start + 1.5);
tl.fromTo("#qmark", { opacity: 0, y: 40, scale: 0.5 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(2.2)" }, s.s16.start + 2.35);
film.light({ lx: 0.18, ly: 0.62, glow: 0.8 }, s.s16.start, 1.0);
film.tintTo("#a67bff", s.s16.start + 1.0, 1.2);

// ── s17: three reasons ─────────────────────────────────────────────────────
tl.to("#bar-violet, #bar-blue, #qmark", { opacity: 0, duration: 0.25 }, s.s17.start - 0.1);
tl.to("#band", { y: -456, scaleX: 0.92, scaleY: 0.8, duration: 0.7, ease: "power3.inOut" }, s.s17.start - 0.1);
tl.fromTo("#reasons", { opacity: 0, y: 90, rotationX: -16, transformPerspective: 1400 }, { opacity: 1, y: 0, rotationX: 0, duration: 0.7, ease: "expo.out" }, s.s17.start + 0.2);
gsap.set("#reasons .prow", { opacity: 0, x: -24 });
tl.to("#reasons .prow", { opacity: 1, x: 0, duration: 0.45, stagger: 0.6 }, s.s17.start + 0.55);
gsap.set("#seen-fill", { scale: 0 });
tl.to("#seen", { opacity: 1, duration: 0.4 }, s.s17.start + 0.5);
tl.to("#seen-fill", { scale: 1, duration: 0.7, ease: "back.out(1.8)" }, s.s17.start + 2.2);
film.tintTo(BLUE, s.s17.start + 1.6, 1.2);
// The swatch of sky grows into the Earth.
tl.to("#reasons, #band, #seen span", { opacity: 0, duration: 0.25 }, s.s18.start - 0.4);
tl.to("#seen-fill", { x: -610, y: 308, scale: 2.9, duration: 0.42, ease: "power3.in" }, s.s18.start - 0.42);
tl.to("#seen-fill", { opacity: 0, duration: 0.15 }, s.s18.start - 0.12);

// ── s18: the long road at dusk ─────────────────────────────────────────────
film.scene("#s18", s.s18.start, s.s19.start);
tl.set(E, { x: 0, y: 280, size: 760, thick: 1.14, air: 1.25, turn: 2.2 }, s.s18.start - 0.3);
tl.to(E, { vis: 1, duration: 0.3 }, s.s18.start - 0.2);
tl.to(E, { size: 1000, duration: 0.9, ease: "expo.out" }, s.s18.start - 0.2);
tl.to(E, { turn: 2.6, duration: s.s18.dur, ease: "none" }, s.s18.start);
tl.to(stage, { floor: 0, duration: 0.4 }, s.s18.start - 0.2);
film.light({ lx: 0.03, ly: 0.5, glow: 1.0 }, s.s18.start, 1.0);
film.tintTo(WHITE, s.s18.start, 1.0);
gsap.set(".pin", { scale: 0, transformOrigin: "50% 50%" });
film.draw("#road-noon", s.s18.start + 0.5, 0.4, "none");
film.draw("#in-noon", s.s18.start + 0.85, 0.3, "none");
tl.to("#pin-noon", { scale: 1, duration: 0.4, ease: "back.out(2.4)" }, s.s18.start + 0.5);
film.land("#chip-noon", s.s18.start + 0.7);
film.draw("#road-dusk", s.s18.start + 1.35, 0.8, "none");
film.draw("#in-dusk", s.s18.start + 2.1, 0.6, "none");
tl.to("#pin-dusk", { scale: 1, duration: 0.4, ease: "back.out(2.4)" }, s.s18.start + 1.35);
film.land("#chip-dusk", s.s18.start + 1.65);
film.count("#dusk-n", 1, 38, s.s18.start + 2.1, 0.9, (v) => String(Math.round(v)));
film.land("#scale-note", s.s18.start + 2.4);
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

// ── s20: what is left ──────────────────────────────────────────────────────
film.scene("#ground", s.s20.start, s.s21.start);
tl.set(K, { dusk: 1, lit: 1, sunx: 0.4, suny: 0.44 }, s.s20.start - 0.3);
tl.to(K, { vis: 1, duration: 0.35 }, s.s20.start - 0.25);
tl.to(K, { suny: 0.29, duration: s.s20.dur + 0.2, ease: "none" }, s.s20.start - 0.2);
tl.to(K, { vis: 0, duration: 0.4 }, s.s21.start - 0.4);

// ── s21: the recap ─────────────────────────────────────────────────────────
film.scene("#s21", s.s21.start, s.s22.start);
film.tintTo(BLUE, s.s21.start - 0.2, 0.8);
tl.to(stage, { floor: 1, horizon: -0.3, lx: 0.5, ly: 0.56, glow: 0.8, duration: 0.6 }, s.s21.start - 0.2);
film.land("#recap-over", s.s21.start + 0.1);
gsap.set(".rc", { opacity: 0, y: 110, rotationX: -18 });
tl.to(".rc", { opacity: 1, y: 0, rotationX: 0, duration: 0.75, ease: "expo.out", stagger: 0.32 }, s.s21.start + 0.3);
tl.to(".rc", { y: -10, duration: 1.6, ease: "sine.inOut", stagger: 0.2, yoyo: true, repeat: 1 }, s.s21.start + 1.7);
tl.to(".rc", { scale: 0.1, x: (i) => (1 - i) * 570, y: -40, opacity: 0, duration: 0.4, ease: "power3.in" }, s.s22.start - 0.4);
tl.to("#recap-over", { opacity: 0, duration: 0.25 }, s.s22.start - 0.35);

// ── s22: the line to remember ──────────────────────────────────────────────
film.scene("#s22", s.s22.start, storyboard.duration);
film.hit(s.s22.start, 0.8, 0.4);
tl.set(E, { vis: 1, x: 0, y: -250, size: 980, thick: 1.035, air: 1, turn: 3.0 }, s.s22.start);
tl.to(E, { size: 330, duration: 0.95, ease: "expo.out" }, s.s22.start);
tl.to(E, { turn: 3.9, duration: s.s22.dur, ease: "none" }, s.s22.start);
tl.to(stage, { floor: 0.5, lx: 0.5, ly: 0.74, glow: 0.9, duration: 0.8 }, s.s22.start);
const last = $$("#last .ln").map((line) => film.split(line));
film.typeIn(last[0], s.s22.start + 0.3);
film.typeIn(last[1], s.s22.start + 0.62);
film.land("#last-micro", s.s22.start + 1.4);
film.sheen("#last", s.s22.start + 1.7, 1.0);
tl.to(stage, { glow: 1.05, duration: 1.3, ease: "sine.inOut", yoyo: true, repeat: 1 }, s.s22.start + 1.4);
tl.to("#s22", { scale: 1.02, transformOrigin: "50% 60%", duration: s.s22.dur - 0.5, ease: "sine.inOut" }, s.s22.start + 0.5);

film.finish();
