// Drawn looks: ink, chalk, marker, pencil, cut paper, watercolour, halftone and neon, for the 2D visual templates.
// Everything is SVG and CSS driven by the film's timeline, so any frame renders the same way twice.
//
//   import { createInk } from "../../kit/engine/ink.js";
//   const ink = createInk(film);
//   ink.roughen("#s02 svg .ln", { amount: 1.6, pencil: true });   // once, before drawing: no vector-perfect lines
//   ink.drawOn("#s02 svg .ln", s.s02.start + 0.2, { speed: 1600 });  // stroke by stroke, at pen speed
//   ink.boil("#s02 svg");                                            // the line lives: redrawn a little every step
//   ink.write("#s02 .label", s.s02.start + 1.4);                     // lettering written on, left to right
//   ink.marker("#s02 .key", s.s02.start + 2.0);                      // the one highlight, swiped behind the word
//
// The filters (url(#chalk), url(#marker), url(#pencil), url(#cut), url(#wash), url(#halftone)) are installed once
// into the page by createInk, so look.css and the film's own CSS can use them by name.
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const SVG = "http://www.w3.org/2000/svg";

// Three variants of each living filter, one per boil step: the same displacement with another seed.
const FILTERS = `
  ${[0, 1, 2].map((k) => `
  <filter id="boil-${k}" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${11 + k * 7}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G"/>
  </filter>`).join("")}
  <filter id="chalk" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="grain"/>
    <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.6" result="holes"/>
    <feComposite in="SourceGraphic" in2="holes" operator="in" result="dusty"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="1" seed="9" result="wob"/>
    <feDisplacementMap in="dusty" in2="wob" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="marker" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="1" seed="5" result="wob"/>
    <feDisplacementMap in="SourceGraphic" in2="wob" scale="1.6" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feGaussianBlur in="d" stdDeviation="0.35" result="soft"/>
    <feComponentTransfer in="soft"><feFuncA type="linear" slope="0.94"/></feComponentTransfer>
  </filter>
  <filter id="pencil" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="1" seed="4" result="grain"/>
    <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.25" result="holes"/>
    <feComposite in="SourceGraphic" in2="holes" operator="in"/>
  </filter>
  <filter id="cut" x="-10%" y="-10%" width="120%" height="130%">
    <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="2" result="fibre"/>
    <feColorMatrix in="fibre" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.08 0" result="flecks"/>
    <feComposite in="flecks" in2="SourceGraphic" operator="in" result="tex"/>
    <feMerge result="paper"><feMergeNode in="SourceGraphic"/><feMergeNode in="tex"/></feMerge>
    <feDropShadow in="paper" dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity="0.28"/>
  </filter>
  <filter id="wash" x="-15%" y="-15%" width="130%" height="130%">
    <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="6" result="low"/>
    <feDisplacementMap in="SourceGraphic" in2="low" scale="18" xChannelSelector="R" yChannelSelector="G" result="bleed"/>
    <feGaussianBlur in="bleed" stdDeviation="2.2" result="soft"/>
    <feMorphology in="soft" operator="erode" radius="3" result="inner"/>
    <feComposite in="soft" in2="inner" operator="out" result="rim"/>
    <feComponentTransfer in="soft" result="body"><feFuncA type="linear" slope="0.72"/></feComponentTransfer>
    <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="2" seed="8" result="gran"/>
    <feColorMatrix in="gran" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.2" result="granA"/>
    <feComposite in="body" in2="granA" operator="in" result="granulated"/>
    <feMerge><feMergeNode in="granulated"/><feMergeNode in="rim"/></feMerge>
  </filter>
  <pattern id="halftone" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
    <circle cx="5" cy="5" r="2.6" fill="currentColor"/>
  </pattern>`;

export function createInk(film) {
  const { tl, gsap } = film;
  const $$ = (sel) => (typeof sel === "string" ? [...document.querySelectorAll(sel)] : sel instanceof Element ? [sel] : [...sel]);
  if (!document.getElementById("ink-defs")) {
    const holder = document.createElementNS(SVG, "svg");
    holder.id = "ink-defs";
    holder.setAttribute("width", "0");
    holder.setAttribute("height", "0");
    holder.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    holder.innerHTML = `<defs>${FILTERS}</defs>`;
    document.body.prepend(holder);
  }

  // Shapes become paths, so every stroke can be drawn on and roughened the same way.
  function asPath(el) {
    if (el.tagName === "path") return el;
    const n = (a) => Number(el.getAttribute(a) ?? 0);
    let d;
    if (el.tagName === "line") d = `M${n("x1")} ${n("y1")} L${n("x2")} ${n("y2")}`;
    else if (el.tagName === "circle") d = `M${n("cx") - n("r")} ${n("cy")} a${n("r")} ${n("r")} 0 1 0 ${2 * n("r")} 0 a${n("r")} ${n("r")} 0 1 0 ${-2 * n("r")} 0`;
    else if (el.tagName === "ellipse") d = `M${n("cx") - n("rx")} ${n("cy")} a${n("rx")} ${n("ry")} 0 1 0 ${2 * n("rx")} 0 a${n("rx")} ${n("ry")} 0 1 0 ${-2 * n("rx")} 0`;
    else if (el.tagName === "rect") d = `M${n("x")} ${n("y")} h${n("width")} v${n("height")} h${-n("width")} Z`;
    else if (el.tagName === "polyline" || el.tagName === "polygon") d = `M${el.getAttribute("points").trim().split(/[\s,]+/).reduce((acc, v, i) => acc + (i % 2 ? `,${v}` : `${i ? " L" : ""}${v}`), "")}${el.tagName === "polygon" ? " Z" : ""}`;
    else return null;
    const path = document.createElementNS(SVG, "path");
    for (const { name, value } of [...el.attributes]) if (!["x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "x", "y", "width", "height", "points"].includes(name)) path.setAttribute(name, value);
    path.setAttribute("d", d);
    el.replaceWith(path);
    return path;
  }
  // A path of several strokes (each starting with an absolute M) becomes one path per stroke, so each is drawn on
  // and roughened on its own instead of being joined to the next by a line.
  function split(path) {
    const parts = (path.getAttribute("d") ?? "").trim().split(/(?=M)/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return [path];
    const pieces = [path];
    path.setAttribute("d", parts[0]);
    let last = path;
    for (const d of parts.slice(1)) {
      const piece = path.cloneNode();
      piece.removeAttribute("id");
      piece.setAttribute("d", d);
      last.after(piece);
      last = piece;
      pieces.push(piece);
    }
    return pieces;
  }
  const paths = (sel) => $$(sel)
    .flatMap((el) => (["svg", "g"].includes(el.tagName) ? [...el.querySelectorAll("path,line,circle,ellipse,rect,polyline,polygon")] : [el]))
    .map(asPath)
    .filter(Boolean)
    .flatMap((p) => (p.classList.contains("ink-pencil") ? [] : split(p)));

  // A hand's line: the path resampled every `step` px, each point pushed sideways by smooth seeded noise, and drawn
  // back as curves. `pencil` lays a faint second pass under it, a little off, like the sketch under the ink.
  function roughen(sel, { amount = 1.6, step = 7, seed = 1, pencil = false } = {}) {
    const out = [];
    for (const [k, path] of paths(sel).entries()) {
      const rand = rng(seed * 997 + k * 31);
      const make = (amp, r) => {
        const length = path.getTotalLength();
        const n = Math.max(4, Math.round(length / step));
        const closed = /z\s*$/i.test(path.getAttribute("d")) || path.getPointAtLength(0).x === path.getPointAtLength(length).x && path.getPointAtLength(0).y === path.getPointAtLength(length).y;
        // Noise that wanders: a sum of two slow waves with random phases, not white jitter.
        const p1 = r() * 6.28, p2 = r() * 6.28, f1 = 0.6 + r() * 0.8, f2 = 2 + r() * 2;
        const pts = [];
        for (let i = 0; i <= n; i++) {
          const s = (i / n) * length;
          const a = path.getPointAtLength(s), b = path.getPointAtLength(Math.min(length, s + 0.5));
          const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
          const off = amp * (Math.sin((i / n) * 6.28 * f1 + p1) * 0.7 + Math.sin((i / n) * 6.28 * f2 + p2) * 0.3);
          pts.push([a.x + Math.cos(ang) * off, a.y + Math.sin(ang) * off]);
        }
        if (closed) pts[pts.length - 1] = pts[0];
        let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
        for (let i = 1; i < pts.length - 1; i++) d += ` Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${((pts[i][0] + pts[i + 1][0]) / 2).toFixed(1)} ${((pts[i][1] + pts[i + 1][1]) / 2).toFixed(1)}`;
        d += ` L${pts.at(-1)[0].toFixed(1)} ${pts.at(-1)[1].toFixed(1)}`;
        return d;
      };
      if (pencil) {
        const under = path.cloneNode();
        under.removeAttribute("id");
        under.setAttribute("d", make(amount * 2.2, rng(seed * 577 + k * 13)));
        under.setAttribute("class", "ink-pencil");
        under.style.cssText = "stroke:var(--pencil,rgba(40,36,30,.28));stroke-width:1.6px;fill:none;filter:url(#pencil)";
        path.before(under);
        path.__pencil = under;
        out.push(under);
      }
      path.setAttribute("d", make(amount, rand));
      out.push(path);
    }
    return out;
  }

  // Each stroke drawn on in order at pen speed (px a second), one after the other with a small lift between.
  // Returns when the last stroke ends, so the next thing can follow it.
  function drawOn(sel, at, { speed = 1400, duration, gap = 0.04, ease = "power1.inOut", min = 0.12 } = {}) {
    const list = paths(sel);
    const lengths = list.map((p) => p.getTotalLength());
    const total = lengths.reduce((a, b) => a + b, 0) || 1;
    const scale = duration ? (duration - gap * (list.length - 1)) / (total / speed) : 1;
    const hide = (el) => {
      el.setAttribute("pathLength", "1");
      gsap.set(el, { strokeDasharray: "1 1.02", strokeDashoffset: 1 });
    };
    let t = at;
    for (const [i, path] of list.entries()) {
      const d = Math.max(min, (lengths[i] / speed) * scale);
      hide(path);
      tl.fromTo(path, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: d, ease, immediateRender: false }, t);
      // Its pencil sketch is laid down a moment ahead of the ink, quickly, as the hand roughs it in.
      if (path.__pencil) {
        hide(path.__pencil);
        tl.fromTo(path.__pencil, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: d * 0.6, ease: "power1.out", immediateRender: false }, Math.max(0, t - 0.12));
      }
      t += d + gap;
    }
    return t;
  }
  // The lines live: every `rate`th of a second the filter changes to another of three seeded variants, so each
  // line wobbles a little in place. On a group or a whole svg it costs one filter a frame.
  function boil(sel, { rate = 8, amount = 3, from = 0, to = Infinity } = {}) {
    const els = $$(sel);
    for (const map of document.querySelectorAll("#ink-defs [id^=boil-] feDisplacementMap")) map.setAttribute("scale", String(amount));
    film.each((t) => {
      const k = t >= from && t < to ? `url(#boil-${Math.floor(t * rate + 1e-6) % 3})` : "";
      for (const el of els) if (el.style.filter !== k) el.style.filter = k;
    });
  }
  // Lettering written on, left to right, as a hand writes it: a clip that opens over the words.
  function write(sel, at, { speed = 9, duration, ease = "none" } = {}) {
    let end = at;
    for (const el of $$(sel)) {
      const d = duration ?? Math.max(0.3, (el.textContent ?? "").trim().length / speed);
      tl.fromTo(el, { clipPath: "inset(-20% 100% -20% -2%)" }, { clipPath: "inset(-20% -2% -20% -2%)", duration: d, ease, immediateRender: true }, at);
      end = Math.max(end, at + d);
    }
    return end;
  }
  // The one highlight: a flat marker swipe behind a word or a part, left to right, slightly tilted.
  function marker(sel, at, { colour = "var(--accent)", duration = 0.45, tilt = -1.5, pad = 0.12, height = 0.62 } = {}) {
    for (const el of $$(sel)) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      const swipe = document.createElement("span");
      swipe.className = "ink-marker";
      swipe.style.cssText = `position:absolute;left:${-pad}em;right:${-pad}em;bottom:0.02em;height:${height}em;background:${colour};z-index:-1;border-radius:0.12em 0.3em 0.18em 0.26em;transform-origin:0 50%;transform:rotate(${tilt}deg) scaleX(0);filter:url(#marker);mix-blend-mode:multiply`;
      el.style.isolation = "isolate";
      el.prepend(swipe);
      tl.to(swipe, { scaleX: 1, rotate: tilt, duration, ease: "power2.out" }, at);
    }
  }
  // A watercolour wash that blooms in from a point: the shape under url(#wash), revealed by a growing soft mask.
  function wash(sel, at, { duration = 1.1, origin = "50% 60%" } = {}) {
    for (const el of $$(sel)) {
      el.style.filter = "url(#wash)";
      el.style.mixBlendMode = "multiply";
      tl.fromTo(el, { "--r": "0%" }, { "--r": "140%", duration, ease: "power2.out", immediateRender: true }, at);
      el.style.maskImage = el.style.webkitMaskImage = `radial-gradient(circle at ${origin}, #000 calc(var(--r) - 18%), transparent var(--r))`;
    }
  }
  // Dot shading, as printed: an SVG shape filled with the halftone pattern, or an HTML block with a dot background.
  function halftone(sel, { colour = "var(--ink)", size = 10, dot = 0.26 } = {}) {
    for (const el of $$(sel)) {
      if (el instanceof SVGElement) {
        el.style.color = colour;
        el.setAttribute("fill", "url(#halftone)");
      } else {
        el.style.backgroundImage = `radial-gradient(circle, ${colour} ${dot * 100}%, transparent ${dot * 100 + 4}%)`;
        el.style.backgroundSize = `${size}px ${size}px`;
      }
    }
  }
  // Neon: a bright core and two soft halos in the line's own colour, flickering on at `at`.
  function glow(sel, at, { colour = "currentColor", strength = 1, flicker = true } = {}) {
    for (const el of $$(sel)) {
      el.style.filter = `drop-shadow(0 0 ${2 * strength}px ${colour}) drop-shadow(0 0 ${10 * strength}px ${colour}) drop-shadow(0 0 ${26 * strength}px ${colour})`;
      if (at === undefined) continue;
      if (flicker) tl.fromTo(el, { opacity: 0 }, { keyframes: [{ opacity: 0.8, duration: 0.04 }, { opacity: 0.1, duration: 0.05 }, { opacity: 1, duration: 0.04 }, { opacity: 0.5, duration: 0.06 }, { opacity: 1, duration: 0.08 }], immediateRender: true }, at);
      else tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3, immediateRender: true }, at);
    }
  }
  // Cut paper: the layer gets paper fibres and a soft shadow below, as if laid on the page.
  const paper = (sel) => { for (const el of $$(sel)) el.style.filter = "url(#cut)"; };

  return { roughen, drawOn, boil, write, marker, wash, halftone, glow, paper, paths };
}
