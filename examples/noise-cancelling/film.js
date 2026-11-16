// "How do noise-cancelling headphones erase sound?" Built from storyboard.json and the take: every time below is a
// shot's start or end, or the moment a word is said (voice/voice.json), so the pictures arrive with their words.
// Amber is the noise, cyan the flipped wave, white what you hear.
import { createFilm } from "../../kit/engine/motion.js";
import { createLab, crestX, AIR } from "./nc.js";
import { createPhones } from "./phones.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, $$, stage, shots: s, W, H } = film;
const said = film.voiced;
// When a word of a shot's line is said (its start, or its end with end = true).
const at = (id, word, end = false) => {
  const norm = (w) => w.toLowerCase().replace(/[^a-z'-]/g, "");
  const hit = said[id].words.find((w) => norm(w[2]) === norm(word));
  if (!hit) throw new Error(`"${word}" is not in ${id}`);
  return end ? hit[1] : hit[0];
};
const AMBERHEX = "#ffb547";
const CYANHEX = "#3fe0ff";

const lab = createLab($("#lab"), $("#over"));
const L = lab.L;
const phones = createPhones($("#space"));
// The headphones' pose: x, y in pixels from the frame's centre, size the pair's height in pixels.
const P = { vis: 1, x: 545, y: 30, size: 640, turn: -0.62, tilt: 0.16, glow: 0, glowColor: 0x3fe0ff, tint: 0.6, tintColor: 0xffb547, blur: 0 };
film.each((t) => {
  lab.draw(t);
  phones.render(P, t);
  // The chips that ride a band of the air or a crest in the chip's panel.
  rideAir(t);
  rideChip(t);
});

film.captions();

// ── Act 1: the question ────────────────────────────────────────────────────────────────────────────────────
Object.assign(stage, { lx: 0.72, ly: 0.56, glow: 0.75, floor: 0.6, r: 1, g: 0.71, b: 0.28 });
film.scene("#s01", 0, s.s02.start + 0.05);
Object.assign(L.rings, { vis: 1 });
const q = ["#q1", "#q2", "#q3"].map((sel) => film.split(sel));
film.typeIn(q[1], at("s01", "headphones") - 0.08);
film.typeIn(q[2], at("s01", "a") - 0.06);
film.sheen("#q3", at("s01", "disappear?", true) - 0.1);
tl.to(P, { turn: -0.28, duration: s.s02.start, ease: "none" }, 0);
tl.fromTo(P, { size: 640 }, { size: 690, duration: s.s02.start, ease: "none", immediateRender: false }, 0);
film.typeOut([...q[0], ...q[1], ...q[2]], s.s02.start - 0.32);

// ── s02: noise + more sound = ? ────────────────────────────────────────────────────────────────────────────
film.scene("#eq", s.s02.start - 0.05, s.s03.start + 0.3);
tl.to(P, { x: 0, y: 10, size: 760, turn: 0.1, blur: 7, duration: 0.8, ease: "power3.inOut" }, s.s02.start - 0.3);
tl.to(P, { vis: 0.32, tint: 0.2, duration: 0.6 }, s.s02.start - 0.1);
tl.to(L.rings, { vis: 0.25, duration: 0.6 }, s.s02.start);
const cardIn = (sel, when) => {
  gsap.set(sel, { opacity: 0, y: 40, scale: 0.94 });
  tl.to(sel, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "expo.out" }, when);
};
cardIn("#eq1", s.s02.start + 0.05);
tl.set(L.eq, { vis: 1 }, s.s02.start);
tl.fromTo(L.eq, { a: 0 }, { a: 1, duration: 0.5, immediateRender: false }, s.s02.start + 0.2);
film.pop("#eqplus", at("s02", "adding") - 0.15);
cardIn("#eq2", at("s02", "adding") - 0.05);
tl.fromTo(L.eq, { b: 0 }, { b: 1, duration: 0.5, immediateRender: false }, at("s02", "adding") + 0.1);
film.pop("#eqeq", at("s02", "sound.") - 0.25);
cardIn("#eq3", at("s02", "sound.") - 0.15);
// The dive into the noise card: it grows past the frame and becomes the air.
const DIVE = s.s03.start - 0.3;
tl.to("#eq2, #eq3, #eqplus, #eqeq", { opacity: 0, duration: 0.25, ease: "power2.in" }, DIVE);
tl.to("#eq1", { scale: 2.4, opacity: 0, x: 500, y: 80, duration: 0.3, ease: "power2.in" }, DIVE);
tl.to(L.eq, { vis: 0, duration: 0.3 }, DIVE);
tl.to(P, { vis: 0, duration: 0.4 }, DIVE);
tl.to(L.rings, { vis: 0, duration: 0.4 }, DIVE);

// ── Act 2: a wave of pressure ──────────────────────────────────────────────────────────────────────────────
film.scene("#air", s.s03.start, s.s05.start + 0.4);
Object.assign(L.air, { camz: 1.6, camx: 960, camy: 460 });
tl.to(L.air, { vis: 1, duration: 0.45, ease: "power1.out" }, DIVE + 0.05);
tl.fromTo(L.air, { amp: 0.15 }, { amp: 1, duration: 1.4, ease: "power2.out", immediateRender: false }, s.s03.start - 0.1);
tl.to(L.air, { camz: 1.08, duration: s.s04.start - s.s03.start + 0.6, ease: "power2.out" }, DIVE + 0.05);
film.light({ lx: 0.3, ly: 0.6, glow: 0.55 }, s.s03.start, 1.2);
film.pop("#chip-air", at("s03", "wave") - 0.1);
film.land("#note-air", s.s03.start + 0.3);
// s04: the pressure curve, then the two names riding their bands.
tl.fromTo(L.air, { curve: 0 }, { curve: 1, duration: 0.9, ease: "power2.inOut", immediateRender: false }, s.s04.start - 0.05);
film.land("#tag-pressure", s.s04.start + 0.1);
film.pop("#chip-sq", at("s04", "squeezed,") - 0.08);
film.pop("#chip-st", at("s04", "stretched,") - 0.08);
// Which bands they ride: the squeezed band nearest x 560 when "squeezed" is said, the stretched band next to it.
const SQ_T = at("s04", "squeezed,");
const nSq = Math.round((560 - crestX(SQ_T, 0)) / AIR.lambda);
function rideAir(t) {
  if (t < s.s04.start || t > s.s05.start + 0.5) return;
  const A = L.air;
  const toScreen = (x, y) => [(x - 960) * A.camz + A.camx, (y - 460) * A.camz + A.camy];
  const [x1, y1] = toScreen(crestX(t, nSq), 450 - 150);
  const [x2, y2] = toScreen(crestX(t, nSq + 0.5), 450 + 150);
  $("#chip-sq").style.left = `${(x1 - 92).toFixed(1)}px`;
  $("#chip-sq").style.top = `${(y1 - 104).toFixed(1)}px`;
  $("#chip-st").style.left = `${(x2 - 92).toFixed(1)}px`;
  $("#chip-st").style.top = `${(y2 + 34).toFixed(1)}px`;
}
// The pull back: the field becomes the air outside the cup.
const PULL = s.s05.start - 0.35;
tl.to(L.air, { camz: 1, camx: 960, camy: 460, duration: 0.5, ease: "power2.inOut" }, PULL - 0.2);
tl.to(L.air, { vis: 0, duration: 0.35 }, PULL + 0.35);
tl.to("#chip-sq, #chip-st, #tag-pressure, #chip-air, #note-air", { opacity: 0, duration: 0.25 }, PULL);

// ── Act 3: the flip ────────────────────────────────────────────────────────────────────────────────────────
// The cut-through cup: arrives from a little closer as the air pulls back into it.
film.scene("#cup", s.s05.start - 0.2, s.s06.start + 0.2);
const cupAt = (when, vars, d = 0.7, ease = "power3.inOut") => tl.to(L.cup, { ...vars, duration: d, ease }, when);
Object.assign(L.cup, { z: 1, fx: 960, fy: 460, sx: 960, sy: 460 });
tl.to(L.cup, { vis: 1, duration: 0.35 }, PULL + 0.35);
tl.to(L.cup, { z: 1.05, fx: 1000, sx: 1000, duration: s.s06.start - PULL - 0.6, ease: "none" }, PULL + 0.4);
film.land("#note-cup", s.s05.start + 0.2);
tl.to(L.cup, { mic: 1, duration: 0.3 }, at("s05", "microphone") - 0.05);
film.pop("#chip-mic", at("s05", "microphone"));
tl.fromTo(L.cup, { sig: 0 }, { sig: 1, duration: 0.8, ease: "power1.inOut", immediateRender: false }, at("s05", "coming") - 0.3);
tl.to(L.cup, { chip: 1, duration: 0.3 }, at("s05", "coming") + 0.45);
film.light({ lx: 0.58, ly: 0.58, glow: 0.65 }, s.s05.start, 1.0);
film.tintTo(CYANHEX, at("s05", "coming"), 1.2);
// The dive into the chip.
const INTO = s.s06.start - 0.2;
cupAt(INTO, { z: 6, fx: 1115, fy: 450, sx: 960, sy: 470 }, 0.55, "power3.in");
tl.to(L.cup, { vis: 0, duration: 0.25 }, INTO + 0.3);
tl.to("#chip-mic, #note-cup", { opacity: 0, duration: 0.2 }, INTO);

// s06, s07: inside the chip.
film.scene("#chip", INTO + 0.25, s.s08.start + 0.3);
film.scene("#chiptext", s.s06.start, s.s08.start);
gsap.set("#chippanel", { scale: 0.2, opacity: 0, transformOrigin: "50% 50%" });
tl.to("#chippanel", { scale: 1, opacity: 1, duration: 0.55, ease: "expo.out" }, INTO + 0.25);
tl.set(L.chipw, { vis: 1 }, INTO + 0.35);
tl.fromTo(L.chipw, { inDraw: 0 }, { inDraw: 1, duration: 0.9, ease: "power2.out", immediateRender: false }, INTO + 0.4);
film.land("#lane-in", s.s06.start + 0.15);
film.land("#lane-out", at("s06", "upside-down") - 0.1);
tl.fromTo(L.chipw, { outDraw: 0 }, { outDraw: 1, duration: 1.3, ease: "power1.inOut", immediateRender: false }, at("s06", "upside-down"));
// s07: crest meets trough; the chips ride the pair they name.
film.pop("#chip-squeeze", at("s07", "stretch") - 0.05);
film.pop("#chip-stretch", at("s07", "stretch") + 0.1);
film.pop("#chip-stretch2", at("s07", "squeeze"));
film.pop("#chip-squeeze2", at("s07", "squeeze") + 0.12);
tl.fromTo(L.chipw, { links: 0 }, { links: 0.35, duration: 0.5, immediateRender: false }, at("s07", "stretch"));
tl.to(L.chipw, { links: 1.2, duration: 1.0 }, at("s07", "stretches.") - 0.2);
const C1_T = at("s07", "stretch");
const nC = Math.round((560 - crestX(C1_T, 0, 420, 60)) / 420);
function rideChip(t) {
  if (t < s.s07.start - 0.2 || t > s.s08.start + 0.3) return;
  const x = crestX(t, nC, 420, 60);
  const fx = L.chipw.fly * 1900;
  // Each chip sits just inside the curve at the point it names: under a crest, over a trough.
  const place = (sel, cx, top) => {
    const el = $(sel);
    el.style.left = `${(cx - el.offsetWidth / 2).toFixed(1)}px`;
    el.style.top = `${top}px`;
  };
  place("#chip-squeeze", x, 292);
  place("#chip-stretch", x + fx, 672);
  place("#chip-stretch2", x + 210, 378);
  place("#chip-squeeze2", x + 210 + fx, 586);
}
// The flipped wave flies out to the speaker; the chip's panel shrinks back into the cup.
const OUT = s.s08.start - 0.3;
tl.to("#chip-squeeze, #chip-stretch2, #lane-in, #lane-out", { opacity: 0, duration: 0.2 }, OUT - 0.05);
tl.to(L.chipw, { fly: 1, duration: 0.45, ease: "power3.in" }, OUT);
tl.to("#chip-stretch, #chip-squeeze2", { opacity: 0, duration: 0.2 }, OUT + 0.1);
tl.to("#chippanel", { scale: 0.25, opacity: 0, duration: 0.32, ease: "power3.in" }, OUT + 0.05);
tl.to(L.chipw, { vis: 0, duration: 0.15 }, OUT + 0.25);

// s08: back at the cup: the speaker plays the flipped wave.
film.scene("#cup", s.s08.start - 0.1, s.s10.start + 0.2);
tl.set(L.cup, { z: 1.9, fx: 1240, fy: 450, sx: 960, sy: 470, mic: 0.4, chip: 1, sig: 0 }, OUT + 0.36);
tl.to(L.cup, { vis: 1, duration: 0.25 }, OUT + 0.38);
cupAt(OUT + 0.38, { z: 1, fx: 960, fy: 460, sx: 960, sy: 460 }, 0.7, "power3.out");
tl.fromTo(L.cup, { amberIn: 0 }, { amberIn: 1, duration: 0.5, immediateRender: false }, s.s08.start + 0.1);
tl.fromTo(L.cup, { sig2: 0 }, { sig2: 1, duration: 0.35, immediateRender: false }, at("s08", "plays") - 0.3);
tl.to(L.cup, { push: 1, duration: 0.12, ease: "power2.out" }, at("s08", "plays"));
tl.to(L.cup, { push: 0, duration: 0.5, ease: "power2.inOut" }, at("s08", "plays") + 0.12);
tl.fromTo(L.cup, { cyanDraw: 0 }, { cyanDraw: 1, duration: 1.2, ease: "power1.inOut", immediateRender: false }, at("s08", "flipped") - 0.1);
film.pop("#chip-speaker", at("s08", "speaker"));
tl.to("#chip-speaker", { opacity: 0, duration: 0.25 }, s.s09.start - 0.1);
// s09: closer on the ear: the two fold into almost nothing.
cupAt(s.s09.start - 0.15, { z: 1.65, fx: 1395, fy: 450, sx: 1000, sy: 450 }, 0.8);
tl.to(L.cup, { merge: 1, duration: 0.9, ease: "power2.inOut" }, at("s09", "add") - 0.1);
tl.to("#chip-silence", { autoAlpha: 1, duration: 0.01 }, at("s09", "nothing.") - 0.02);
film.pop("#chip-silence", at("s09", "nothing.") - 0.02);
film.light({ lx: 0.7, ly: 0.58, glow: 0.35 }, at("s09", "add"), 1.0);
film.tintTo("#dfefff", at("s09", "add"), 1.0);
film.hit(at("s09", "nothing.", true) + 0.12, 0.35, 0.25);

// s10, s11: three lanes, then the turn.
const LANES = s.s10.start - 0.15;
film.scene("#lanes", LANES, s.s12.start + 0.1);
tl.to("#chip-silence", { opacity: 0, duration: 0.2 }, LANES);
cupAt(LANES - 0.1, { z: 1.0, sy: 260 }, 0.5, "power3.in");
tl.to(L.cup, { vis: 0, duration: 0.3 }, LANES);
tl.fromTo(L.lanes, { vis: 0 }, { vis: 1, duration: 0.4, immediateRender: false }, LANES + 0.05);
film.land(["#l-noise", "#l-flip", "#l-sum"], LANES + 0.1, { stagger: 0.08 });
gsap.set("#name", { opacity: 1 });
const nameChars = film.split("#name");
film.typeIn(nameChars, at("s10", "destructive") - 0.12, { stagger: 0.016 });
film.sheen("#name", at("s10", "interference.", true));
film.light({ lx: 0.5, ly: 0.62, glow: 0.5 }, s.s10.start, 0.8);
film.tintTo(CYANHEX, s.s10.start, 0.8);
// The turn: a hit, the copy slips late and the sum ripples; then it is put back in step.
film.typeOut(nameChars, s.s11.start - 0.25);
film.hit(s.s11.start - 0.06, 0.45, 0.32);
film.tintTo(AMBERHEX, s.s11.start, 0.6);
tl.to(L.lanes, { lag: 0.12, duration: 0.6, ease: "power2.out" }, at("s11", "but") + 0.05);
film.pop("#chip-late", at("s11", "copy"));
tl.to("#chip-late", { opacity: 0, duration: 0.2 }, at("s11", "in") - 0.15);
tl.to(L.lanes, { lag: 0, duration: 0.45, ease: "power2.inOut" }, at("s11", "in") - 0.1);
film.pop("#chip-step", at("s11", "step."));

// ── Act 4: the catch, to scale ─────────────────────────────────────────────────────────────────────────────
const WHIP = s.s12.start;
const blurLanes = film.motionBlur("#lanes");
tl.to(L.lanes, { x0: -900, x1: 500, duration: 0.3, ease: "power3.in" }, WHIP - 0.3);
tl.to("#lanes", { x: -1100, duration: 0.3, ease: "power3.in" }, WHIP - 0.3);
blurLanes(WHIP - 0.28, 0.5, 60, 0);
tl.set(L.lanes, { vis: 0 }, WHIP);
tl.to(stage, { camx: "+=3.4", duration: 0.6, ease: "power3.inOut" }, WHIP - 0.3);
film.scene("#scale", WHIP, s.s18.start);
Object.assign(L.sc, { hum: 1, nacelle: 1 });
tl.fromTo(L.sc, { vis: 0, sx: 2400 }, { vis: 1, sx: 1590, duration: 0.55, ease: "expo.out", immediateRender: false }, WHIP);
film.land("#note-scale", WHIP + 0.15);
film.land("#t-you", WHIP + 0.3);
film.pop("#chip-hum", at("s12", "hum,") - 0.05);
tl.to(L.sc, { glow: 1, duration: 0.4 }, at("s12", "easy.") - 0.05);
film.light({ lx: 0.12, ly: 0.58, glow: 0.6 }, WHIP, 1.0);
// s13: one wave is 3.4 m; at your ear it is the same again and again.
tl.fromTo(L.sc, { ruler: 0 }, { ruler: 1, duration: 0.7, ease: "power2.inOut", immediateRender: false }, at("s13", "metres") - 0.25);
gsap.set("#m-hum", { left: 914 - 160, top: 612 });
film.land("#m-hum", at("s13", "metres") + 0.25);
film.land("#earpanel", at("s13", "keep") - 0.2);
tl.fromTo(L.sc, { inset: 0 }, { inset: 1, duration: 0.4, immediateRender: false }, at("s13", "keep"));
// s14: the meters: a copy a hair late still leaves only 2%.
const M1 = s.s14.start - 0.2;
film.scene("#meters", M1, s.s15.start + 0.35);
tl.to(L.sc, { vis: 0, inset: 0, ruler: 0, duration: 0.15 }, M1 - 0.05);
tl.to("#chip-hum, #m-hum, #note-scale, #t-you, #earpanel", { opacity: 0, duration: 0.15 }, M1 - 0.05);
gsap.set("#mpanel, #bpanel", { y: 60, opacity: 0 });
tl.to("#mpanel, #bpanel", { y: 0, opacity: 1, duration: 0.45, ease: "expo.out", stagger: 0.06 }, M1 + 0.05);
gsap.set("#mt-sq, #bar-hum", { opacity: 0 });
gsap.set("#v-left100", { opacity: 0 });
gsap.set(".lane-tag", { opacity: 0 });
tl.to(".lane-tag", { opacity: 1, duration: 0.3 }, M1 + 0.25);
tl.set(L.mw, { sq: 0, copy: 1, left: 0 }, M1);
tl.fromTo(L.mw, { vis: 0 }, { vis: 1, duration: 0.3, immediateRender: false }, M1 + 0.1);
tl.to(L.mw, { left: 1, duration: 0.35 }, at("s14", "match") - 0.2);
// The bars: 440 px is 100%. What is left of the hum: 2 sin(pi x 100 / 30,000) = 2.09% = 9.2 px.
const FULL = 440;
const LEFT_HUM = 2 * Math.sin((Math.PI * 100) / 30000);
const LEFT_SQ = 2 * Math.sin((Math.PI * 5000) / 30000);
gsap.set("#bar-noise, #bar-left, #bar-hum", { height: 0, opacity: 0 });
tl.to("#bar-noise", { height: FULL, opacity: 1, duration: 0.5, ease: "expo.out" }, at("s14", "chip") - 0.05);
tl.to("#bar-left", { height: FULL * LEFT_HUM, opacity: 1, duration: 0.4, ease: "expo.out" }, at("s14", "match"));
// Out: the meters drop, the to-scale view comes back with the squeak.
const M1OUT = s.s15.start - 0.05;
tl.to("#mpanel, #bpanel, #bar-noise, #bar-left, .lane-tag", { y: 60, opacity: 0, duration: 0.3, ease: "power3.in" }, M1OUT);
tl.to(L.mw, { vis: 0, duration: 0.25 }, M1OUT);
// s15: the squeak, at the same scale.
tl.set(L.sc, { hum: 0, nacelle: 0, glow: 0 }, M1OUT + 0.15);
tl.to(L.sc, { vis: 1, duration: 0.35 }, M1OUT + 0.15);
tl.fromTo(L.sc, { sq: 0, src: 0 }, { sq: 1, src: 1, duration: 0.5, immediateRender: false }, M1OUT + 0.2);
tl.to("#note-scale, #t-you", { opacity: 1, duration: 0.3 }, M1OUT + 0.25);
film.pop("#chip-squeak", at("s15", "squeak") - 0.05);
tl.to(L.sc, { glow: 0.8, duration: 0.12 }, at("s15", "harder.") - 0.05);
tl.to(L.sc, { glow: 0.15, duration: 0.12 }, at("s15", "harder.") + 0.1);
tl.to(L.sc, { glow: 0.7, duration: 0.12 }, at("s15", "harder.") + 0.25);
tl.to(L.sc, { glow: 0, duration: 0.3 }, at("s15", "harder.") + 0.4);
// s16: ten times closer: one wave is 7 cm, smaller than the cup.
const ZOOM = s.s16.start - 0.1;
tl.to("#chip-squeak, #note-scale, #t-you", { opacity: 0, duration: 0.2 }, ZOOM - 0.1);
tl.to(L.sc, { z: 10, sx: 1250, duration: 0.75, ease: "power3.inOut" }, ZOOM);
tl.to(L.sc, { src: 0, duration: 0.2 }, ZOOM);
film.land("#note-zoom", ZOOM + 0.5);
tl.fromTo(L.sc, { rulerSq: 0 }, { rulerSq: 1, duration: 0.5, ease: "power2.inOut", immediateRender: false }, at("s16", "centimetres") - 0.2);
gsap.set("#m-sq", { left: 467 - 135, top: 700 });
film.land("#m-sq", at("s16", "centimetres") + 0.1);
// s17: the same delay leaves all of the squeak.
const M2 = s.s17.start - 0.15;
tl.to(L.sc, { vis: 0, rulerSq: 0, duration: 0.15 }, M2 - 0.05);
tl.to("#m-sq, #note-zoom", { opacity: 0, duration: 0.15 }, M2 - 0.05);
tl.set("#mt-hum", { opacity: 0 }, M2);
tl.set("#mt-sq", { opacity: 1 }, M2);
tl.set("#m-note1", { opacity: 0 }, M2);
tl.set("#m-note2", { opacity: 1 }, M2);
film.scene("#meters", M2, s.s18.start + 0.3);
tl.to("#mpanel, #bpanel", { y: 0, opacity: 1, duration: 0.45, ease: "expo.out", stagger: 0.06 }, M2 + 0.05);
tl.set(L.mw, { sq: 1, copy: 0, left: 0 }, M2);
tl.to(L.mw, { vis: 1, duration: 0.3 }, M2 + 0.1);
tl.to(".lane-tag", { y: 0, opacity: 1, duration: 0.3 }, M2 + 0.25);
tl.to(L.mw, { copy: 1, duration: 0.6, ease: "power2.inOut" }, at("s17", "delay") - 0.1);
tl.set("#bar-left", { height: 0 }, M2);
tl.set("#v-left2", { opacity: 0 }, M2);
tl.set("#v-left100", { opacity: 1 }, M2);
tl.to("#bar-noise", { y: 0, height: FULL, opacity: 1, duration: 0.45, ease: "expo.out" }, M2 + 0.3);
tl.set("#bar-hum", { height: FULL * LEFT_HUM }, M2);
tl.to("#bar-hum", { opacity: 1, duration: 0.4 }, M2 + 0.5);
tl.to(L.mw, { left: 1, duration: 0.35 }, at("s17", "knocks") - 0.1);
tl.to("#bar-left", { y: 0, height: FULL * LEFT_SQ, opacity: 1, duration: 0.6, ease: "expo.out" }, at("s17", "out") - 0.15);

// s18, s18b: a sudden clatter, and a copy that is always too late.
const CL = s.s18.start;
tl.to("#mpanel, #bpanel, #bar-noise, #bar-left, #bar-hum, .lane-tag", { opacity: 0, duration: 0.12 }, CL - 0.12);
tl.to(L.mw, { vis: 0, duration: 0.12 }, CL - 0.12);
tl.set(L.sc, { vis: 0 }, CL);
film.scene("#lanes", CL, s.s19.start + 0.1);
tl.set("#lanes", { x: 0 }, CL);
tl.set("#l-flip", { opacity: 0 }, CL);
tl.to("#l-copy", { opacity: 1, duration: 0.3 }, s.s18b.start - 0.1);
tl.set(["#chip-late", "#chip-step", "#name"], { autoAlpha: 0 }, CL);
tl.set(L.lanes, { x0: 380, x1: 1790, lag: 0, clat: 1, copyVis: 0, vis: 1, t0: at("s18", "sudden") - 0.25 - 0.0 }, CL);
film.land("#t-clatter", CL + 0.05);
film.hit(CL, 0.3, 0.2);
tl.to(L.lanes, { copyVis: 1, duration: 0.4 }, s.s18b.start - 0.1);
film.pop("#chip-toolate", at("s18b", "faster"));
film.tintTo(AMBERHEX, CL, 0.3);

// ── Act 5: cushions ────────────────────────────────────────────────────────────────────────────────────────
const BACK = s.s19.start - 0.2;
tl.to(L.lanes, { vis: 0, duration: 0.2 }, BACK - 0.05);
tl.to("#t-clatter, #chip-toolate, #l-noise, #l-copy, #l-sum", { opacity: 0, duration: 0.2 }, BACK - 0.05);
film.scene("#cup", BACK, s.s21.start + 0.2);
tl.set(L.cup, { merge: 0, amberIn: 0, cyanDraw: 0, mic: 0, chip: 0, push: 0, sig: 0, sig2: 0, single: 0, twoLanes: 0, curve: 0, cushion: 0 }, BACK);
tl.set(["#chip-mic", "#chip-speaker", "#chip-silence", "#chip-highs", "#chip-lows"], { opacity: 0 }, BACK);
tl.set("#note-cup", { opacity: 1 }, BACK);
tl.fromTo(L.cup, { vis: 0, z: 0.86, fx: 960, fy: 460, sx: 960, sy: 460 }, { vis: 1, z: 1, duration: 0.7, ease: "power3.out", immediateRender: false }, BACK);
tl.to(L.cup, { cushion: 1, duration: 0.45, ease: "back.out(2)" }, at("s19", "cushions") - 0.1);
film.pop("#chip-cush", at("s19", "cushions"));
film.light({ lx: 0.77, ly: 0.6, glow: 0.6 }, s.s19.start, 0.8);
film.tintTo("#ffd08a", s.s19.start, 0.8);
// s20: the highs bounce, the lows are cancelled.
tl.to(L.cup, { cushion: 0.55, twoLanes: 1, air: 0.45, duration: 0.5 }, s.s20.start - 0.1);
tl.to("#chip-cush", { opacity: 0, duration: 0.2 }, s.s20.start - 0.1);
tl.to(L.cup, { highsIn: 1, duration: 0.4 }, at("s20", "high,") - 0.1);
film.pop("#chip-highs", at("s20", "high,"));
tl.to(L.cup, { lowsIn: 1, duration: 0.4 }, at("s20", "high,") + 0.2);
tl.to(L.cup, { lowsCyan: 1, duration: 0.7 }, at("s20", "chip") - 0.3);
tl.to(L.cup, { lowsMerge: 1, duration: 0.6 }, at("s20", "catch.") - 0.1);
film.pop("#chip-lows", at("s20", "catch."));
film.land("#note-illu", at("s20", "catch.") + 0.1);
film.tintTo(CYANHEX, at("s20", "chip"), 0.8);

// ── Act 6: recap and poster ────────────────────────────────────────────────────────────────────────────────
const RC = s.s21.start - 0.42;
tl.to(L.cup, { vis: 0, z: 0.85, duration: 0.25, ease: "power2.in" }, RC - 0.05);
tl.to("#chip-highs, #chip-lows, #note-illu, #note-cup", { opacity: 0, duration: 0.25 }, RC);
film.scene("#recap", RC, s.s22.start + 0.6);
const cards = ["#rc1", "#rc2", "#rc3", "#rc4"];
cards.forEach((sel, i) => {
  gsap.set(sel, { y: 140, opacity: 0 });
  tl.to(sel, { y: 0, opacity: 1, duration: 0.55, ease: "expo.out" }, RC + 0.2 + i * 0.14);
});
tl.set(L.recap, { vis: 1 }, RC + 0.1);
["c1", "c2", "c3", "c4"].forEach((c, i) => tl.fromTo(L.recap, { [c]: 0 }, { [c]: 1, duration: 0.4, immediateRender: false }, RC + 0.3 + i * 0.14));
// Each card brightens as the voice reaches it.
const light = (sel, when) => {
  tl.to(sel, { filter: "brightness(1.45)", duration: 0.25 }, when);
  tl.to(sel, { filter: "brightness(1)", duration: 0.5 }, when + 0.3);
};
light("#rc1", at("s21", "headphones"));
light("#rc2", at("s21", "own"));
light("#rc3", at("s21", "wave,"));
film.light({ lx: 0.5, ly: 0.6, glow: 0.6 }, s.s21.start, 0.8);
// s22: the cards part, the headphones come forward, the two rings close and vanish together.
const PART = s.s22.start - 0.1;
tl.to("#rc1, #rc2", { x: -1100, opacity: 0, duration: 0.55, ease: "power3.in", stagger: 0.04 }, PART);
tl.to("#rc3, #rc4", { x: 1100, opacity: 0, duration: 0.55, ease: "power3.in", stagger: 0.04 }, PART);
tl.to(L.recap, { vis: 0, duration: 0.45, ease: "power3.in" }, PART);
tl.set(P, { x: 0, y: -10, size: 520, turn: -0.9, blur: 0, tint: 0.5, tintColor: 0x3fe0ff }, PART);
tl.to(P, { vis: 1, size: 700, turn: -0.35, duration: 0.9, ease: "expo.out" }, PART + 0.15);
tl.to(P, { turn: 0.05, duration: s.s23.start - PART, ease: "none" }, PART + 1.0);
Object.assign(L.close, { cx: 960, cy: 530, r0: 980, r1: 420 });
tl.fromTo(L.close, { vis: 0, k: 0 }, { vis: 1, duration: 0.4, immediateRender: false }, at("s22", "flipped") - 0.1);
tl.to(L.close, { k: 1, duration: at("s22", "time.") - at("s22", "flipped") + 0.1, ease: "power2.in" }, at("s22", "flipped"));
tl.to(L.close, { vis: 0, duration: 0.15 }, at("s22", "time.") + 0.2);
film.hit(at("s22", "time.") + 0.2, 0.55, 0.4);
tl.to(P, { glow: 1, duration: 0.15 }, at("s22", "time.") + 0.2);
tl.to(P, { glow: 0.25, duration: 0.9 }, at("s22", "time.") + 0.35);
film.tintTo(CYANHEX, s.s22.start, 0.6);
// s23: the poster.
film.scene("#s23", s.s23.start - 0.1, storyboard.duration + 1);
tl.to(P, { x: 560, y: 20, size: 620, duration: 0.8, ease: "power3.inOut" }, s.s23.start - 0.3);
tl.to(P, { turn: 0.28, duration: storyboard.duration - s.s23.start + 0.3, ease: "none" }, s.s23.start - 0.3);
const poster = film.split("#poster");
film.typeIn(poster, s.s23.start, { stagger: 0.02 });
film.sheen("#poster", s.s23.start + 1.1, 1.0);
tl.fromTo(L.poster, { vis: 0 }, { vis: 1, duration: 0.5, immediateRender: false }, s.s23.start + 0.5);
tl.fromTo("#poster", { scale: 1 }, { scale: 1.035, duration: storyboard.duration - s.s23.start, ease: "none", transformOrigin: "0% 50%", immediateRender: false }, s.s23.start);
film.light({ lx: 0.75, ly: 0.58, glow: 0.7 }, s.s23.start - 0.3, 1.2);

film.finish();
