// The film engine. One paused GSAP timeline is the only clock: the page, the stage's light and any 3D layer are all
// drawn from the time the timeline is at, so any frame can be rendered by seeking to it.
//
//   const film = await createFilm({ storyboard });      // storyboard.json is the source of every time
//   const s = film.shots;                               // s.s04.start, s.s04.end, s.s04.dur
//   film.scene("#s04", s.s04.start, s.s04.end);
//   film.typeIn(film.split("#title"), s.s04.start + 0.2);
//   film.finish();
//
// Rules that keep a film seekable:
// - never read the wall clock, never start a CSS animation or a requestAnimationFrame loop;
// - anything GSAP cannot tween exactly (canvas drawing, typed text, a dash offset, a counter) keeps its value in a
//   plain object the timeline tweens, and draws it in a function passed to film.each();
// - a fromTo() on state that an earlier tween also animates takes immediateRender: false.
import { createBackdrop } from "./stage.js";

const hex = (value) => {
  const n = Number.parseInt(value.replace("#", ""), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
};

export async function createFilm({ storyboard, duration = storyboard?.duration, tint = storyboard?.look?.accent ?? "#ffb90e" } = {}) {
  const gsap = window.gsap;
  const $ = (sel) => (typeof sel === "string" ? document.querySelector(sel) : sel);
  const $$ = (sel) => (typeof sel === "string" ? [...document.querySelectorAll(sel)] : [].concat(sel));
  await document.fonts.ready;

  // The parts every film has: the stage canvas behind the scenes, a flash and a vignette over them, filter defs.
  const root = $("#root");
  let canvas = $("#backdrop");
  if (!canvas) {
    canvas = Object.assign(document.createElement("canvas"), { id: "backdrop", width: 1920, height: 1080 });
    root.prepend(canvas);
  }
  for (const id of ["flash", "vignette"]) {
    if (!$(`#${id}`)) root.append(Object.assign(document.createElement("div"), { id }));
  }
  document.body.insertAdjacentHTML("beforeend", '<svg class="defs" width="0" height="0" aria-hidden="true"><defs id="filters"></defs></svg>');

  const backdrop = createBackdrop(canvas);
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
  const stage = { t: 0, lx: 0.5, ly: 0.6, glow: 0.6, ...hex(tint), floor: 1, horizon: -0.16, camx: 0, camy: 0, pr: 0, ps: 0, flash: 0, streak: 0, silk: 1 };
  const jobs = [];
  const each = (job) => jobs.push(job);

  // Shot times come from the storyboard, so the film and its plan cannot drift apart.
  const shots = {};
  for (const shot of storyboard?.shots ?? []) shots[shot.id] = { ...shot, dur: shot.end - shot.start };

  // ── Showing and hiding ───────────────────────────────────────────────────
  const show = (sel, at, d = 0.4) => tl.to(sel, { autoAlpha: 1, duration: d, ease: "power1.out" }, at);
  const hide = (sel, at, d = 0.35) => tl.to(sel, { autoAlpha: 0, duration: d, ease: "power1.in" }, at);
  // A scene is on screen from start to end and costs nothing outside that window.
  const scene = (sel, start, end, { fadeIn = 0, fadeOut = 0 } = {}) => {
    if (start <= 0) gsap.set(sel, { autoAlpha: 1 });
    else if (fadeIn) show(sel, start, fadeIn);
    else tl.set(sel, { autoAlpha: 1 }, start);
    if (end < duration) {
      if (fadeOut) hide(sel, end - fadeOut, fadeOut);
      else tl.set(sel, { autoAlpha: 0 }, end);
    }
  };
  // Things rise into place, one after another.
  const land = (sel, at, vars = {}) => {
    gsap.set(sel, { opacity: 0, y: vars.from ?? 26 });
    const { from: _from, ...rest } = vars;
    tl.to(sel, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", ...rest }, at);
  };
  const pop = (sel, at, vars = {}) => {
    gsap.set(sel, { opacity: 0, scale: 0.5 });
    tl.to(sel, { opacity: 1, scale: 1, duration: 0.55, ease: "back.out(1.9)", ...vars }, at);
  };

  // ── Type ─────────────────────────────────────────────────────────────────
  // Splits a heading into words and characters and records where each character sits on its line, so the metal fill
  // and the sheen (film.css: --cx, --sx) read as one surface across the whole line.
  const split = (sel) => {
    const el = $(sel);
    if (el.dataset.split) return [...el.querySelectorAll(".ch")];
    el.dataset.split = "1";
    const walk = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType !== 3) {
          walk(child);
          continue;
        }
        const frag = document.createDocumentFragment();
        for (const word of child.textContent.split(/(\s+)/)) {
          if (!word) continue;
          if (/^\s+$/.test(word)) {
            frag.append(document.createTextNode(" "));
            continue;
          }
          const w = Object.assign(document.createElement("span"), { className: "w" });
          for (const c of word) w.append(Object.assign(document.createElement("span"), { className: "ch", textContent: c }));
          frag.append(w);
        }
        child.replaceWith(frag);
      }
    };
    walk(el);
    const chars = [...el.querySelectorAll(".ch")];
    for (const ch of chars) {
      const line = ch.closest(".ln") || el;
      ch.style.setProperty("--cx", `${Math.round(ch.getBoundingClientRect().left - line.getBoundingClientRect().left)}px`);
    }
    return chars;
  };
  const typeIn = (chars, at, vars = {}) => {
    gsap.set(chars, { opacity: 0, yPercent: 55, filter: "blur(14px)" });
    tl.to(chars, { opacity: 1, yPercent: 0, filter: "blur(0px)", duration: 0.62, ease: "power3.out", stagger: 0.022, ...vars }, at);
  };
  const typeOut = (chars, at, vars = {}) =>
    tl.to(chars, { opacity: 0, yPercent: -45, filter: "blur(12px)", duration: 0.34, ease: "power2.in", stagger: 0.01, ...vars }, at);
  // A band of light crossing the letters.
  const sheen = (sel, at, d = 0.9) => tl.fromTo(sel, { "--sx": "-320px" }, { "--sx": `${$(sel).offsetWidth + 320}px`, duration: d, ease: "power2.inOut" }, at);

  // ── Fast moves ───────────────────────────────────────────────────────────
  // Motion blur for a whole scene: a directional blur the timeline drives. Returns blur(at, duration, x, y).
  const motionBlur = (sel) => {
    const id = `mb-${sel.replace(/\W/g, "")}`;
    $("#filters").insertAdjacentHTML(
      "beforeend",
      `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0 0"/></filter>`,
    );
    const node = $(`#${id} feGaussianBlur`);
    const el = $(sel);
    const state = { x: 0, y: 0 };
    each(() => {
      const on = state.x > 0.05 || state.y > 0.05;
      if (on) node.setAttribute("stdDeviation", `${state.x.toFixed(2)} ${state.y.toFixed(2)}`);
      el.style.filter = on ? `url(#${id})` : "";
    });
    return (at, d, x, y) => {
      tl.to(state, { x, y, duration: d * 0.5, ease: "power2.in" }, at);
      tl.to(state, { x: 0, y: 0, duration: d * 0.5, ease: "power2.out" }, at + d * 0.5);
    };
  };
  // A hit: a flash and a shock ring on the stage, for the moments the sound lands on.
  const hit = (at, strength = 0.9, ring = 0.4) => {
    tl.set("#flash", { opacity: strength * 0.5 }, at);
    tl.to("#flash", { opacity: 0, duration: 0.34, ease: "power2.out" }, at + 0.04);
    tl.set(stage, { flash: strength, pr: 0, ps: ring }, at);
    tl.to(stage, { flash: 0, duration: 0.4, ease: "power2.out" }, at + 0.03);
    tl.to(stage, { pr: 1.7, ps: 0, duration: 1.1, ease: "power2.out" }, at + 0.02);
  };
  // A whip pan between two scenes: the outgoing one leaves, the blur peaks on the cut, and the stage travels too.
  const whip = (from, to, at, { vertical = false, blur } = {}) => {
    tl.to(from, vertical ? { y: -900, duration: 0.3, ease: "power3.in" } : { x: -1100, duration: 0.3, ease: "power3.in" }, at - 0.3);
    tl.set(from, { autoAlpha: 0 }, at);
    tl.fromTo(to, vertical ? { y: 760 } : { x: 900 }, { x: 0, y: 0, duration: 0.5, ease: "expo.out", immediateRender: false }, at);
    tl.set(to, { autoAlpha: 1 }, at);
    blur?.(at - 0.26, 0.56, vertical ? 0 : 70, vertical ? 56 : 0);
    tl.to(stage, vertical ? { camy: "+=3.2", duration: 0.6, ease: "power3.inOut" } : { camx: "+=3.4", duration: 0.6, ease: "power3.inOut" }, at - 0.3);
  };

  // ── The stage's light ────────────────────────────────────────────────────
  const light = (vars, at, d = 0.8, ease = "power3.inOut") => tl.to(stage, { ...vars, duration: d, ease }, at);
  const tintTo = (colour, at, d = 1.2) => tl.to(stage, { ...hex(colour), duration: d, ease: "power2.inOut" }, at);

  // ── Values GSAP cannot hold exactly ──────────────────────────────────────
  // Draws an SVG path from its start: the path needs pathLength="1".
  const draw = (sel, at, d = 0.8, ease = "power2.inOut") => {
    for (const path of $$(sel)) {
      const state = { off: 1 };
      path.style.strokeDasharray = "1";
      each(() => {
        path.style.strokeDashoffset = state.off.toFixed(4);
        path.style.visibility = state.off >= 0.9999 ? "hidden" : "visible";
      });
      tl.to(state, { off: 0, duration: d, ease }, at);
    }
  };
  // Counts a number up or down in an element.
  const count = (sel, from, to, at, d = 1, format = (v) => v.toFixed(1)) => {
    const el = $(sel);
    const state = { v: from };
    each(() => {
      const text = format(state.v);
      if (el.textContent !== text) el.textContent = text;
    });
    tl.to(state, { v: to, duration: d, ease: "power2.out" }, at);
  };

  // ── Captions ─────────────────────────────────────────────────────────────
  // Every shot's caption from the storyboard, set at the bottom of the frame and read in by word. Words wrapped in
  // *stars* in the storyboard take the accent colour. One source of truth: change the storyboard, the film follows.
  const captions = ({ lead = 0.12, tail = 0.1 } = {}) => {
    let box = $("#captions");
    if (!box) {
      box = Object.assign(document.createElement("div"), { id: "captions" });
      $("#vignette").before(box);
    }
    for (const shot of storyboard.shots) {
      if (!shot.caption) continue;
      const line = Object.assign(document.createElement("p"), { className: "caption" });
      // A film can restyle one shot's caption: .caption[data-shot="s03"] .key { ... }
      line.dataset.shot = shot.id;
      for (const part of shot.caption.split(/(\*[^*]+\*)/)) {
        if (!part) continue;
        const strong = part.startsWith("*");
        for (const word of (strong ? part.slice(1, -1) : part).split(/\s+/).filter(Boolean)) {
          // Punctuation stays against the word before it, even when that word carries the accent.
          if (line.childNodes.length && !/^[.,;:!?)]/.test(word)) line.append(" ");
          line.append(Object.assign(document.createElement("span"), { className: strong ? "cw key" : "cw", textContent: word }));
        }
      }
      box.append(line);
      const words = [...line.querySelectorAll(".cw")];
      const start = shot.start + lead;
      const end = shot.end - tail;
      gsap.set(line, { autoAlpha: 0 });
      gsap.set(words, { opacity: 0, y: 14, filter: "blur(6px)" });
      // The pill arrives with its first word, never empty.
      tl.to(line, { autoAlpha: 1, duration: 0.16, ease: "power1.out" }, start);
      // The words take about a third of the shot to arrive, never slower than a calm reading pace.
      const step = Math.min(0.09, ((end - start) * 0.34) / words.length);
      tl.to(words, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.36, ease: "power3.out", stagger: step }, start);
      tl.to(line, { autoAlpha: 0, y: -10, duration: 0.2, ease: "power1.in" }, end - 0.2);
    }
  };

  // ── Chapters ─────────────────────────────────────────────────────────────
  // A rail of the storyboard's acts in the top left; the act on screen is lit and its line fills as it plays.
  const chapters = ({ from = 0, until = duration } = {}) => {
    const acts = (storyboard.acts ?? []).filter((act) => act.rail !== false);
    const rail = Object.assign(document.createElement("div"), { id: "rail", className: "rail" });
    const span = (act) => {
      const mine = storyboard.shots.filter((shot) => shot.act === act.id);
      return { start: mine[0].start, end: mine.at(-1).end };
    };
    acts.forEach((act, i) => {
      rail.insertAdjacentHTML("beforeend", `<span id="rail-${act.id}"><b>${String(i + 1).padStart(2, "0")}</b>${act.title}</span>${i < acts.length - 1 ? `<i><u id="rail-line-${act.id}"></u></i>` : ""}`);
    });
    $("#vignette").before(rail);
    gsap.set(rail, { autoAlpha: 0 });
    show(rail, from, 0.5);
    for (const [i, act] of acts.entries()) {
      const { start, end } = span(act);
      tl.to(`#rail-${act.id}`, { opacity: 1, duration: 0.3 }, Math.max(from, start));
      if (i < acts.length - 1) {
        tl.to(`#rail-line-${act.id}`, { scaleX: 1, duration: end - Math.max(from, start), ease: "none" }, Math.max(from, start));
        tl.to(`#rail-${act.id}`, { opacity: 0.55, duration: 0.3 }, end);
      }
    }
    if (until < duration) hide(rail, until, 0.3);
  };

  // ── Drawing a frame ──────────────────────────────────────────────────────
  function frame() {
    stage.t = tl.time();
    for (const job of jobs) job(stage.t);
    backdrop.render(stage);
  }
  const finish = () => {
    tl.set({}, {}, duration);
    window.__frame = frame;
    window.__timelines = { ...(window.__timelines ?? {}), root: tl };
    window.startRender = () => tl;
    frame();
    window.__ready = true;
    if (location.hash === "#play") {
      gsap.ticker.add(frame);
      tl.play(0);
    }
  };

  return { gsap, tl, $, $$, stage, shots, duration, each, show, hide, scene, land, pop, split, typeIn, typeOut, sheen, motionBlur, hit, whip, light, tintTo, draw, count, captions, chapters, finish };
}
