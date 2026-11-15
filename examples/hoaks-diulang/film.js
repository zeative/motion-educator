// "Kenapa hoaks yang diulang-ulang lama-lama terasa benar?" The film is cut to one take of narration:
// storyboard.json holds the shot times the take gave, voice/voice.json the time of every word. Pictures arrive on
// their words. The meters are illustrations (the screen says so): "terasa benar" rises only when the claim is met
// again, "bukti" never leaves zero.
import { createFilm } from "../../kit/engine/motion.js";
import { FAR, createField, pathX } from "./field.js";

const storyboard = await (await fetch("storyboard.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, $$, stage, shots: s, voiced } = film;
const D = storyboard.duration;
const AMBER = "#ffb02e";
const BLUE = "#5aa9ff";
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
// When a word of a shot's line is said, in the film's time.
const said = (id, word) => {
  const hit = voiced[id]?.words?.find(([, , text]) => text.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, "") === word);
  if (!hit) throw new Error(`the take has no "${word}" in ${id}`);
  return hit[0];
};
const ended = (id) => voiced[id].to;
const lightAt = (x, y, glow, at, d = 0.6) => film.light({ lx: x / 1080, ly: 1 - y / 1920, glow }, at, d);
const slam = (lines, at, stagger = 0.16) => {
  gsap.set(lines, { scale: 1.45, opacity: 0, filter: "blur(16px)" });
  tl.to(lines, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.45, ease: "expo.out", stagger }, at);
};
// A soft flash and a ring from a place in the frame.
const hit = (at, x, y, strength, ring) => {
  tl.set(stage, { lx: x / 1080, ly: 1 - y / 1920, pr: 0, ps: ring }, at);
  tl.to(stage, { pr: 1.7, ps: 0, duration: 1.1, ease: "power2.out" }, at + 0.02);
  tl.set("#flash", { "--fx": `${(x / 1080) * 100}%`, "--fy": `${(y / 1920) * 100}%`, opacity: strength * 0.5 }, at);
  tl.to("#flash", { opacity: 0, duration: 0.36, ease: "power2.out" }, at + 0.04);
};
// One of a stack of labels in the same place: shown from `at` until the next one, swapped on one frame.
const swap = (sels, times, until) => {
  sels.forEach((sel, i) => {
    tl.set(sel, { autoAlpha: 1 }, times[i]);
    tl.fromTo(sel, { scale: 0.8 }, { scale: 1, duration: 0.25, ease: "back.out(2.6)", immediateRender: false }, times[i]);
    tl.set(sel, { autoAlpha: 0 }, i < sels.length - 1 ? times[i + 1] : until);
  });
};

// ── State the timeline tweens; drawn every frame ────────────────────────────
const M = { feel: 0.18, proof: 0, grey: 0, scroll: 0, warm: 0, reader: 0 };
const feelBar = $("#feel");
const proofBar = $("#proof");
const scroll = $("#scroll");
const field = await createField($("#field"));
const F = field.F;
const pinSign = $("#pin-sign");
const place = (el, x, y) => (el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`);

// ── Layout read once (fonts are loaded): where every copy sits in the thread ─
const BODY = 616; // the thread's body, under its header
const bubbles = $$(".bub.claim");
const box = bubbles.map((b) => ({ top: b.offsetTop, h: b.offsetHeight }));
const showLast = (k) => box[k].top + box[k].h + 26 - BODY; // the k-th copy sits at the bottom
const TOPS = box.map((b) => b.top);
const S14 = TOPS[4] - 22; // in s14 the loudest copy sits at the top of the thread
const LOUD = { x: 94, y: 240 + 104 + TOPS[4] - S14, w: 770, h: box[4].h };

// The sentence inside the head, word by word, in the head's own frame (it is not scaled when this is read).
const words = $$("#sent .sw").map((w) => {
  const r = w.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
});
const reader = $("#reader");
const sentEl = $("#sent");
// Five readings of the same sentence: each starts on a word of the take and runs faster than the one before.
const PASSES = [
  { t0: s.s05.start + 0.12, dur: 1.15, weights: [1.4, 0.8, 1.0, 2.0, 1.6, 1.2] },
  { t0: said("s05", "kalimat") + 0.1, dur: 0.72, weights: [1.2, 0.9, 1.0, 1.4, 1.2, 1.0] },
  { t0: s.s06.start + 0.1, dur: 0.48, weights: [1, 1, 1, 1, 1, 1] },
  { t0: said("s06", "gampang") - 0.06, dur: 0.33, weights: [1, 1, 1, 1, 1, 1] },
  { t0: said("s06", "memprosesnya") + 0.05, dur: 0.22, weights: [1, 1, 1, 1, 1, 1] },
];
const EFFORT = [1, 0.74, 0.54, 0.37, 0.24, 0.12];

film.each((t) => {
  // The meters.
  feelBar.style.transform = `scaleX(${M.feel.toFixed(4)})`;
  feelBar.style.filter = M.grey > 0.001 ? `grayscale(${M.grey.toFixed(3)}) brightness(${(1 - 0.35 * M.grey).toFixed(3)})` : "";
  proofBar.style.transform = `scaleX(${M.proof.toFixed(4)})`;
  scroll.style.transform = `translateY(${(-M.scroll).toFixed(2)}px)`;
  // The reading light: on the word being read, in the pass that is running.
  let on = 0;
  for (const p of PASSES) {
    const u = (t - p.t0) / p.dur;
    if (u < 0 || u > 1.12) continue;
    const total = p.weights.reduce((a, b) => a + b, 0);
    let run = 0;
    let i = 0;
    for (; i < words.length - 1; i++) {
      if (clamp(u) * total < run + p.weights[i]) break;
      run += p.weights[i];
    }
    const w = words[i];
    reader.style.transform = `translate(${(w.x - 12).toFixed(1)}px, ${(w.y + w.h / 2 - 38).toFixed(1)}px)`;
    reader.style.width = `${(w.w + 24).toFixed(1)}px`;
    on = u <= 1 ? 1 : clamp((1.12 - u) / 0.12);
  }
  reader.style.opacity = (on * M.reader).toFixed(3);
  // The sentence warms with every reading.
  const k = M.warm;
  sentEl.style.color = `rgb(${Math.round(233 + (255 - 233) * k)}, ${Math.round(233 + (200 - 233) * k)}, ${Math.round(238 + (110 - 238) * k)})`;
  sentEl.style.textShadow = k > 0.01 ? `0 0 ${Math.round(30 * k)}px rgba(255,176,46,${(0.7 * k).toFixed(3)})` : "";
  // The field, and the sign at the end of its path.
  field.render(t);
  const [sx, sy] = field.project(pathX(FAR + 3), 0, FAR + 3);
  place(pinSign, sx, sy);
});

film.captions();

// ═════════════ s01 and s02: the same claim, again and again ═══════════════════
Object.assign(stage, { lx: 0.45, ly: 0.45, glow: 0.45, floor: 0.6, silk: 0.8 });
film.scene("#chat", 0, s.s03.start + 0.1);
gsap.set("#meters", { autoAlpha: 1 });
gsap.set(".proof", { opacity: 0 });
gsap.set(bubbles.slice(2), { opacity: 0 });
gsap.set("#neq, #btns, #result", { autoAlpha: 0 });
const ARRIVE = [null, 0, said("s01", "diulang-ulang") - 0.04, said("s01", "keluarga") - 0.04, said("s02", "lama-lama") - 0.04];
const FEEL = [0.18, 0.34, 0.48, 0.6, 0.7, 0.78];
tl.fromTo("#chat", { scale: 1 }, { scale: 1.035, duration: s.s02.end, ease: "none", transformOrigin: "50% 60%", immediateRender: false }, 0);
// The second copy is already sliding in on frame 0.
tl.fromTo(bubbles[1], { opacity: 0.35, y: 26 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out", immediateRender: false }, 0);
tl.fromTo(bubbles[1], { "--ring": 0.8 }, { "--ring": 0, duration: 0.7, ease: "power2.out", immediateRender: false }, 0);
tl.to(M, { feel: FEEL[1], duration: 0.35, ease: "back.out(2)" }, 0.12);
M.scroll = showLast(1);
for (const k of [2, 3, 4]) {
  const at = ARRIVE[k];
  tl.to(M, { scroll: showLast(k), duration: 0.42, ease: "expo.out" }, at);
  tl.fromTo(bubbles[k], { opacity: 0, y: 60, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: "expo.out", transformOrigin: "0% 100%", immediateRender: false }, at);
  tl.fromTo(bubbles[k], { "--ring": 1 }, { "--ring": 0, duration: 0.8, ease: "power2.out", immediateRender: false }, at + 0.05);
  tl.to(M, { feel: FEEL[k], duration: 0.35, ease: "back.out(2)" }, at + 0.12);
  // The thread warms with every copy, and so does the light.
  tl.to("#chat .th-body", { "--warm": 0.06 * k, duration: 0.4 }, at);
  tl.to(stage, { glow: 0.45 + 0.1 * k, duration: 0.4 }, at);
}
lightAt(500, 1000, 0.5, 0, 0.1);
tl.to(stage, { lx: 0.46, ly: 1 - 820 / 1920, duration: 1.2, ease: "power2.inOut" }, ARRIVE[4]);
// "terasa benar": the meter's label lights.
const TERASA = said("s02", "terasa");
tl.fromTo(".feel .mlab", { textShadow: "0 0 0px rgba(255,176,46,0)" }, { textShadow: "0 0 26px rgba(255,176,46,0.9)", duration: 0.25, yoyo: true, repeat: 1, immediateRender: false }, TERASA);
tl.fromTo(".feel .track", { scale: 1 }, { scale: 1.04, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out", transformOrigin: "0% 50%", immediateRender: false }, TERASA);

// ═════════════ s03: the same words, every time; and no evidence ═══════════════
tl.to("#chat", { scale: 0.88, opacity: 0, duration: 0.22, ease: "power2.in" }, s.s03.start - 0.2);
film.scene("#stack", s.s03.start, s.s04.start + 0.3);
const minis = $$(".mini");
gsap.set(minis, { opacity: 0, scale: 1.12 });
tl.to(minis, { opacity: 1, scale: 1, duration: 0.45, ease: "expo.out", stagger: 0.05 }, s.s03.start);
tl.to("#stack", { scale: 1.03, duration: s.s03.dur, ease: "none" }, s.s03.start);
const eqs = $$(".eq");
gsap.set(eqs, { opacity: 0, scale: 0.4 });
tl.to(eqs, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2.6)", stagger: 0.09 }, said("s03", "sama"));
const BUKTI = said("s03", "bukti");
tl.to(".proof", { opacity: 1, duration: 0.25 }, BUKTI - 0.15);
tl.fromTo("#zero", { scale: 0.3 }, { scale: 1, duration: 0.4, ease: "back.out(3)", immediateRender: false }, BUKTI);
tl.fromTo(".proof .track", { boxShadow: "inset 0 2px 6px rgb(0 0 0 / 0.7), 0 0 0 2px rgb(90 169 255 / 0.45)" }, { boxShadow: "inset 0 2px 6px rgb(0 0 0 / 0.7), 0 0 30px 6px rgb(90 169 255 / 0.8)", duration: 0.3, yoyo: true, repeat: 1, immediateRender: false }, BUKTI);
lightAt(400, 1110, 0.5, BUKTI - 0.1, 0.4);
film.tintTo(BLUE, BUKTI - 0.1, 0.3);
film.tintTo(AMBER, s.s04.start - 0.2, 0.5);

// ═════════════ s04 to s06: the head, and the same sentence read again ═════════
// The copies fold into one sentence that flies into the head.
minis.forEach((mini, i) => tl.to(mini, { y: 690 - (262 + i * 148) - 60, scale: 0.55, opacity: 0, duration: 0.38, ease: "power3.in" }, s.s04.start - 0.28 + i * 0.02));
tl.to(eqs, { opacity: 0, duration: 0.15 }, s.s04.start - 0.3);
tl.to("#meters", { autoAlpha: 0, duration: 0.25 }, s.s04.start - 0.3);
film.scene("#head", s.s04.start - 0.12, s.s07.start + 0.25);
film.draw("#head-line", s.s04.start - 0.12, 0.75, "power2.out");
gsap.set("#head-fill", { opacity: 0 });
tl.to("#head-fill", { opacity: 1, duration: 0.6 }, s.s04.start);
gsap.set("#sent", { opacity: 0, x: 420 });
tl.to("#sent", { opacity: 1, x: 0, duration: 0.55, ease: "expo.out" }, s.s04.start + 0.08);
const OTAK = said("s04", "otak");
tl.to("#head-glow", { opacity: 1, scale: 1.05, duration: 0.55, ease: "power2.out" }, OTAK - 0.05);
lightAt(500, 700, 0.85, OTAK - 0.05, 0.5);
tl.to("#headcam", { scale: 1.03, duration: s.s05.end - s.s04.start, ease: "none" }, s.s04.start);
// The readings.
gsap.set(".readout .effort, #head-note", { opacity: 0 });
tl.to(".readout .effort, #head-note", { opacity: 1, duration: 0.3 }, PASSES[0].t0 - 0.1);
swap(["#c1", "#c2", "#c3", "#c4", "#c5"], PASSES.map((p) => p.t0), s.s07.start - 0.3);
tl.to(M, { reader: 1, duration: 0.15 }, PASSES[0].t0 - 0.05);
PASSES.forEach((p, i) => {
  tl.to("#effort", { scaleX: EFFORT[i + 1], duration: 0.2, ease: "power2.out" }, p.t0 + p.dur);
  tl.to(M, { warm: (i + 1) / 5, duration: 0.25 }, p.t0 + p.dur * 0.6);
});
// Closer on the sentence, then a dive along the reading line into the field.
tl.to("#headcam", { scale: 1.34, duration: s.s06.dur - 0.25, ease: "power2.inOut" }, s.s06.start - 0.1);
const DIVE = s.s07.start - 0.3;
tl.to("#headcam", { scale: 4.2, opacity: 0, filter: "blur(10px)", duration: 0.45, ease: "power3.in" }, DIVE);
tl.to(".readout", { opacity: 0, duration: 0.25 }, DIVE);

// ═════════════ s07 to s09: the path through the grass ════════════════════════
Object.assign(F, { cx: 0.6, cy: 2.6, cz: 14.2, lx: 0, ly: 0, lz: 1.6 });
tl.to(F, { vis: 1, duration: 0.45, ease: "power2.out" }, DIVE + 0.1);
tl.fromTo(F, { cz: 14.2, cy: 2.4, lz: 1.6 }, { cz: 11.0, cy: 2.9, lz: -2.0, duration: s.s07.end - DIVE, ease: "power1.out", immediateRender: false }, DIVE + 0.05);
film.scene("#path", s.s07.start, s.s10.start + 0.3);
film.land("#pic-note", s.s07.start + 0.15, { from: -16 });
lightAt(540, 1100, 0.7, s.s07.start, 0.6);
const WALKS = [];
{
  let t0 = said("s07", "jalan") - 0.05;
  for (const dur of [0.9, 0.62, 0.46, 0.34, 0.26, 0.2]) {
    WALKS.push({ t0, dur });
    t0 += dur + 0.08;
  }
}
const WEAR = [0.2, 0.38, 0.55, 0.7, 0.82, 0.92];
WALKS.forEach(({ t0, dur }, i) => {
  tl.set(F, { next: WEAR[i], head: 0 }, t0);
  tl.to(F, { head: 1, duration: dur, ease: "none" }, t0);
  tl.set(F, { wear: WEAR[i] }, t0 + dur);
});
tl.to(F, { walk: 1, duration: 0.15 }, WALKS[0].t0 - 0.1);
tl.to(F, { walk: 0, duration: 0.25 }, WALKS.at(-1).t0 + WALKS.at(-1).dur);
swap(["#w1", "#w2", "#w3", "#w4", "#w5", "#w6"], WALKS.map((w) => w.t0), s.s08.start + 0.4);
// s08: the camera rises along the path to where it leads.
tl.to(F, { cy: 11, cz: 7, cx: 0.4, ly: 0, lz: -16, duration: 1.5, ease: "power2.inOut" }, s.s08.start - 0.1);
tl.to("#pic-note", { autoAlpha: 0, duration: 0.25 }, s.s08.start);
gsap.set("#sign", { scale: 0, transformOrigin: "50% 100%" });
tl.to("#sign", { scale: 1, duration: 0.55, ease: "back.out(1.8)" }, s.s08.start + 0.75);
lightAt(540, 600, 0.8, s.s08.start + 0.4, 1.0);
film.pop("#wrong", said("s08", "salah") - 0.04, { transformOrigin: "0% 100%" });
// s09: easy and familiar, taken for true.
tl.to(F, { dim: 0.5, duration: 0.6 }, s.s09.start);
film.pop("#ch-easy", said("s09", "gampang") - 0.04);
film.pop("#ch-fam", said("s09", "akrab") - 0.04);
tl.set("#meters", { y: 0 }, s.s09.start);
tl.to("#meters", { autoAlpha: 1, duration: 0.35 }, s.s09.start + 0.1);
const EQ = said("s09", "dianggap");
tl.to("#ch-easy", { x: 140, y: 190, scale: 0.6, opacity: 0, duration: 0.35, ease: "power3.in" }, EQ - 0.3);
tl.to("#ch-fam", { x: -120, y: 110, scale: 0.6, opacity: 0, duration: 0.35, ease: "power3.in" }, EQ - 0.25);
const eqLines = $$("#eqn .ln");
for (const line of eqLines) film.split(line);
slam(eqLines[0], EQ - 0.05, 0);
const BENAR = said("s09", "benar");
slam(eqLines[1], BENAR - 0.08, 0);
tl.to(M, { feel: FEEL[5], duration: 0.4, ease: "back.out(2)" }, BENAR);
hit(BENAR, 540, 880, 0.3, 0.35);
film.sheen("#eqn", BENAR + 0.4, 0.6);
tl.to("#sign, #wrong", { opacity: 0, duration: 0.3 }, EQ - 0.2);

// ═════════════ s10: the name ═════════════════════════════════════════════════
tl.to("#eqn", { y: -120, opacity: 0, duration: 0.3, ease: "power3.in" }, s.s10.start - 0.15);
tl.to("#meters", { autoAlpha: 0, duration: 0.25 }, s.s10.start - 0.15);
tl.to(F, { dim: 0.3, vis: 0.55, cy: 12.5, duration: 1.0, ease: "power2.inOut" }, s.s10.start - 0.1);
film.scene("#name", s.s10.start - 0.05, s.s11.start + 0.2);
const nmLines = $$("#nm .ln");
for (const line of nmLines) film.split(line);
slam(nmLines[0], said("s10", "efek") - 0.06, 0);
slam(nmLines[1], said("s10", "kebenaran") - 0.06, 0);
slam(nmLines[2], said("s10", "ilusif") - 0.06, 0);
hit(said("s10", "ilusif"), 540, 760, 0.25, 0.3);
film.land("#nm-en", said("s10", "kebenaran") + 0.2, { from: 16 });
film.land("#nm-src", said("s10", "kebenaran") + 0.35, { from: 16 });
film.sheen("#nm", said("s10", "ilusif") + 0.3, 0.8);
tl.to("#nm, #nm-en, #nm-src", { y: -160, opacity: 0, duration: 0.25, ease: "power3.in", stagger: 0.02 }, s.s11.start - 0.12);
tl.to(F, { vis: 0, duration: 0.35 }, s.s11.start - 0.2);
tl.to(stage, { glow: 0.5, duration: 0.5 }, s.s11.start - 0.2);

// ═════════════ s11 and s12: a headline seen once, then met again ═════════════
film.scene("#news", s.s11.start - 0.1, s.s13.start);
gsap.set("#n1", { y: 420, opacity: 0 });
tl.to("#n1", { y: 0, opacity: 1, duration: 0.55, ease: "expo.out" }, s.s11.start + 0.1);
film.land("#ex1", s.s11.start + 0.3, { from: 14 });
tl.to("#n1", { scale: 1.025, duration: s.s11.dur - 0.5, ease: "none" }, s.s11.start + 0.4);
const SEKALI = said("s11", "sekali");
tl.set("#sweep1", { opacity: 1 }, SEKALI);
tl.fromTo("#sweep1", { x: -160 }, { x: 900, duration: 0.5, ease: "power1.inOut", immediateRender: false }, SEKALI);
tl.set("#sweep1", { opacity: 0 }, SEKALI + 0.5);
const LIHAT = said("s11", "lihat");
tl.set("#k-new", { opacity: 0 }, LIHAT + 0.1);
tl.set("#k-seen", { opacity: 1 }, LIHAT + 0.1);
film.pop("#seen1", LIHAT + 0.1, { transformOrigin: "0% 50%" });
lightAt(540, 600, 0.55, s.s11.start, 0.5);
const AJA = said("s11", "aja");
tl.to("#n1", { y: 980, rotation: 5, opacity: 0, duration: 0.5, ease: "power3.in" }, AJA - 0.1);
tl.to("#seen1, #ex1", { opacity: 0, duration: 0.2 }, AJA - 0.1);
// Met again, beside a headline never seen.
film.land("#n2", said("s11", "aja") + 0.35, { from: -60, duration: 0.5 });
film.land("#n3", said("s12", "ketemu") - 0.02, { from: 70, duration: 0.5 });
film.land("#src-p", said("s12", "lagi"), { from: 12 });
const FILL = said("s12", "terasa");
const SEEN = 0.56;
const NEW = 0.44;
gsap.set("#mm1, #mm2", { scaleX: 0 });
tl.to("#mm1", { scaleX: SEEN, duration: 0.55, ease: "power2.out" }, FILL - 0.05);
tl.to("#mm2", { scaleX: NEW, duration: 0.5, ease: "power2.out" }, FILL - 0.05);
// The gap between the two, marked where the new headline's meter stops.
const mmTrack = $("#mm1").parentElement.getBoundingClientRect();
const n2top = 262;
const n2r = $("#n2").getBoundingClientRect();
// The part of the seen headline's meter beyond where the new one stopped, bracketed under it.
const gx = mmTrack.left + 4 + (mmTrack.width - 8) * NEW;
const gy0 = mmTrack.bottom - n2r.top + n2top + 6;
gsap.set("#gap", { x: gx, y: gy0 });
const gw = (mmTrack.width - 8) * (SEEN - NEW);
gsap.set("#gap i", { width: gw });
gsap.set("#gap span", { x: Math.min(0, 930 - gx - $("#gap span").offsetWidth) });
tl.to("#gap", { opacity: 1, duration: 0.3 }, FILL + 0.55);
tl.to("#n2", { scale: 1.02, duration: s.s12.dur, ease: "none", transformOrigin: "50% 100%" }, s.s12.start);
tl.to(stage, { lx: 0.5, ly: 1 - 520 / 1920, duration: 0.6 }, FILL);

// ═════════════ s13: someone who knows ════════════════════════════════════════
film.scene("#know", s.s13.start, s.s14.start);
tl.fromTo(".person", { scale: 1 }, { scale: 1.04, duration: s.s13.dur, ease: "none", transformOrigin: "30% 70%", immediateRender: false }, s.s13.start);
gsap.set(".think, #bd1, #bd2", { opacity: 0 });
tl.to("#bd2", { opacity: 1, duration: 0.2 }, s.s13.start + 0.15);
tl.to("#bd1", { opacity: 1, duration: 0.2 }, s.s13.start + 0.25);
film.pop(".think", s.s13.start + 0.35, { transformOrigin: "20% 100%" });
const TAHU = said("s13", "tahu");
tl.fromTo(".think b", { scale: 1 }, { scale: 1.12, duration: 0.22, yoyo: true, repeat: 1, ease: "power2.out", immediateRender: false }, TAHU);
lightAt(700, 360, 0.6, s.s13.start, 0.3);
tl.set(stage, { r: 0.35, g: 0.66, b: 1 }, s.s13.start);
film.land("#mm3w", s.s13.start + 0.45, { from: 14 });
film.land("#src-f", s.s13.start + 0.6, { from: 10 });
gsap.set("#mm3", { scaleX: 0 });
tl.to("#mm3", { scaleX: 0.15, duration: 0.4, ease: "power2.out" }, s.s13.start + 0.7);
const A1 = said("s13", "jawabannya");
const A2 = said("s13", "juga");
gsap.set("#atl1, #atl2", { opacity: 0, x: 260 });
tl.to("#atl1", { opacity: 1, x: 0, duration: 0.45, ease: "expo.out" }, A1 - 0.05);
tl.to("#atl2", { opacity: 1, x: 0, duration: 0.45, ease: "expo.out" }, A2 - 0.05);
tl.to("#mm3", { scaleX: 0.22, duration: 0.35, ease: "back.out(2)" }, A1 + 0.2);
tl.to("#mm3", { scaleX: 0.29, duration: 0.35, ease: "back.out(2)" }, A2 + 0.2);
tl.fromTo("#mm3w i", { boxShadow: "0 0 0 2px rgb(255 255 255 / 0.12)" }, { boxShadow: "0 0 26px 4px rgb(255 176 46 / 0.75)", duration: 0.25, yoyo: true, repeat: 1, immediateRender: false }, said("s13", "kena"));
film.tintTo(AMBER, s.s13.end - 0.4, 0.4);

// ═════════════ s14: hearing it often is not evidence ═════════════════════════
film.scene("#chat", s.s14.start, s.s17.start + 0.3);
tl.set("#chat", { opacity: 1, scale: 1.06 }, s.s14.start);
tl.to("#chat", { scale: 1, duration: 0.7, ease: "power3.out" }, s.s14.start);
tl.set(M, { scroll: S14, feel: FEEL[5] }, s.s14.start);
tl.set("#meters", { autoAlpha: 1 }, s.s14.start);
lightAt(500, 560, 0.75, s.s14.start, 0.3);
const neq = $$("#neq .ln");
for (const line of neq) film.split(line);
tl.set("#neq", { autoAlpha: 1 }, s.s14.start);
slam(neq, said("s14", "sering") - 0.04, 0);
const TURN = ended("s14") + 0.08; // in the pause the take was opened for
tl.fromTo("#neq .key", { scale: 1 }, { scale: 1.45, duration: 0.12, ease: "power2.out", immediateRender: false }, TURN);
tl.to("#neq .key", { scale: 1, duration: 0.5, ease: "back.out(2.4)" }, TURN + 0.12);
tl.fromTo("#zero", { scale: 1 }, { scale: 1.5, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out", immediateRender: false }, TURN);
tl.fromTo(".proof .track", { boxShadow: "inset 0 2px 6px rgb(0 0 0 / 0.7), 0 0 0 2px rgb(90 169 255 / 0.45)" }, { boxShadow: "inset 0 2px 6px rgb(0 0 0 / 0.7), 0 0 34px 8px rgb(90 169 255 / 0.85)", duration: 0.2, yoyo: true, repeat: 1, immediateRender: false }, TURN);
hit(TURN, 500, 830, 0.55, 0.5);
film.sheen("#neq", TURN + 0.3, 0.6);

// ═════════════ s15 and s16: check the source ═════════════════════════════════
tl.to("#neq", { y: -40, autoAlpha: 0, duration: 0.25, ease: "power2.in" }, s.s15.start);
gsap.set("#btns", { y: 50 });
tl.to("#btns", { autoAlpha: 1, y: 0, duration: 0.45, ease: "expo.out" }, said("s15", "makanya") + 0.05);
// The finger: its tip is at (100, 22) of its own box.
const finger = $("#finger");
const tip = { x: 1180, y: 1060 };
const FWD = { x: 94 + 165, y: 790 + 62 };
const CHK = { x: 94 + 330 + 26 + 225, y: 790 + 62 };
film.each(() => (finger.style.transform = `translate(${(tip.x - 100).toFixed(1)}px, ${(tip.y - 22).toFixed(1)}px) rotate(-38deg)`));
tl.set(finger, { autoAlpha: 1 }, said("s15", "sebelum") - 0.1);
tl.to(tip, { x: FWD.x + 20, y: FWD.y + 18, duration: 0.55, ease: "power3.out" }, said("s15", "sebelum") - 0.1);
tl.to(tip, { x: FWD.x, y: FWD.y + 8, duration: 0.3, ease: "sine.inOut" }, said("s15", "terusin") - 0.05);
tl.to(tip, { x: CHK.x, y: CHK.y + 10, duration: 0.42, ease: "power2.inOut" }, said("s15", "terusin") + 0.35);
const CEK = said("s16", "cek");
tl.to(tip, { y: CHK.y + 22, duration: 0.07, ease: "power2.in" }, CEK - 0.02);
tl.to(tip, { y: CHK.y + 4, duration: 0.25, ease: "power2.out" }, CEK + 0.06);
tl.set("#tap", { x: CHK.x, y: CHK.y, opacity: 1, scale: 0.3 }, CEK + 0.04);
tl.to("#tap", { scale: 1.5, opacity: 0, duration: 0.6, ease: "power2.out" }, CEK + 0.04);
tl.fromTo("#btn-chk", { filter: "brightness(1)" }, { filter: "brightness(1.6)", duration: 0.1, yoyo: true, repeat: 1, immediateRender: false }, CEK + 0.04);
film.tintTo(BLUE, CEK, 0.5);
lightAt(500, 560, 0.85, CEK, 0.5);
tl.to(tip, { x: 1220, y: 1050, duration: 0.5, ease: "power3.in" }, CEK + 0.4);
tl.set(finger, { autoAlpha: 0 }, CEK + 0.9);
// The scan, down the loudest copy.
tl.set("#scan", { y: LOUD.y - 60, opacity: 1 }, CEK + 0.1);
tl.to("#scan", { y: LOUD.y + LOUD.h - 60, duration: 0.45, ease: "power1.inOut" }, CEK + 0.1);
tl.set("#scan", { opacity: 0 }, CEK + 0.55);
// The crack runs across it, then it falls apart in two.
const CR = [[0.5, -0.02], [0.44, 0.18], [0.56, 0.34], [0.47, 0.52], [0.6, 0.7], [0.52, 0.86], [0.57, 1.02]].map(([u, v]) => [LOUD.x + u * LOUD.w, LOUD.y + v * LOUD.h]);
$("#crack-line").setAttribute("d", CR.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" "));
const SUMBER = said("s16", "sumbernya");
film.draw("#crack-line", SUMBER - 0.02, 0.2, "power2.out");
const BREAK = SUMBER + 0.4;
const local = CR.map(([x, y]) => `${(x - LOUD.x).toFixed(1)}px ${(y - LOUD.y).toFixed(1)}px`);
for (const [sel, poly] of [
  ["#pc-a", `polygon(-40px -40px, ${local.join(", ")}, -40px ${LOUD.h + 40}px)`],
  ["#pc-b", `polygon(${LOUD.w + 40}px -40px, ${local.join(", ")}, ${LOUD.w + 40}px ${LOUD.h + 40}px)`],
]) {
  const el = $(sel);
  const copy = bubbles[4].cloneNode(true);
  copy.removeAttribute("id");
  copy.style.margin = "0";
  copy.style.opacity = "1";
  copy.style.transform = "none";
  copy.style.setProperty("--ring", "0");
  el.append(copy);
  Object.assign(el.style, { left: `${LOUD.x}px`, top: `${LOUD.y}px`, width: `${LOUD.w}px`, height: `${LOUD.h}px`, clipPath: poly });
}
tl.set("#pc-a, #pc-b", { autoAlpha: 1 }, BREAK);
tl.set(bubbles[4], { opacity: 0 }, BREAK);
tl.set("#crack-line", { opacity: 0 }, BREAK + 0.04);
tl.to("#pc-a", { x: -90, y: 760, rotation: -14, duration: 0.8, ease: "power2.in", transformOrigin: "30% 50%" }, BREAK);
tl.to("#pc-b", { x: 110, y: 820, rotation: 12, duration: 0.85, ease: "power2.in", transformOrigin: "70% 50%" }, BREAK + 0.04);
tl.to("#pc-a, #pc-b", { opacity: 0, duration: 0.42, ease: "power1.in" }, BREAK + 0.1);
tl.to(bubbles[3], { opacity: 0.25, duration: 0.3 }, BREAK);
tl.to("#btns", { autoAlpha: 0, y: 30, duration: 0.3 }, BREAK + 0.1);
// What checking found.
gsap.set("#result", { x: 0, y: LOUD.y });
tl.set("#result", { autoAlpha: 1 }, BREAK + 0.5);
tl.fromTo("#result", { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.45, ease: "expo.out", immediateRender: false }, BREAK + 0.5);
const STAMP = Math.max(ended("s16") + 0.08, BREAK + 0.8);
tl.fromTo("#stamp", { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1, duration: 0.3, ease: "power4.in", immediateRender: false }, STAMP - 0.3);
hit(STAMP, 700, LOUD.y + 330, 0.5, 0.45);
tl.to(M, { feel: 0.2, grey: 1, duration: 0.8, ease: "power2.inOut" }, BREAK);
tl.to("#checked", { opacity: 1, duration: 0.3 }, BREAK + 0.5);

// ═════════════ s17: the recap, and the line to remember ══════════════════════
tl.to("#chat, #meters", { y: 80, opacity: 0, duration: 0.22, ease: "power2.in" }, s.s17.start - 0.27);
film.scene("#recap", s.s17.start - 0.04, D);
["#rc1", "#rc2", "#rc3"].forEach((card, i) => film.land(card, s.s17.start - 0.04 + i * 0.13, { from: 70, duration: 0.5 }));
for (const line of $$("#poster .ln")) film.split(line);
slam($$("#poster .ln"), s.s17.start + 0.45, 0.2);
hit(s.s17.start + 0.45, 500, 1060, 0.3, 0.35);
film.land("#tagline", s.s17.start + 0.95, { from: 18 });
film.sheen("#poster", s.s17.start + 1.2, 0.8);
tl.to("#recap", { scale: 1.03, duration: D - s.s17.start, ease: "none", transformOrigin: "50% 50%" }, s.s17.start);
lightAt(500, 1060, 0.7, s.s17.start, 0.6);

film.finish();
