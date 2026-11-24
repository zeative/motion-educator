// A drafting table for the Blueprint template: sheets with a camera, parts drawn on stroke by stroke at a steady pen
// speed, lettering written on letter by letter, everything redrawn from the timeline's state on every frame.
//
// Lines are drawn in screen space from the sheet's geometry, so a line keeps its weight and its dash pattern however
// close the camera is (a 0.35 mm pen is a 0.35 mm pen in a detail view too), and a gear can turn or a part slide
// without anything being re-laid out. kit/engine/ink.js writes the lettering; every line drawn, word written and
// line rubbed out is logged in window.__events for the sound (render.mjs --events).
import { THICK } from "./parts.js";
const SVG = "http://www.w3.org/2000/svg";
const DASH = { dash: (w) => `${w * 5} ${w * 3.4}`, chain: (w) => `${w * 12} ${w * 3.5} ${w * 1.6} ${w * 3.5}` };

export function createDraft(film, ink, { paperURL } = {}) {
  const { tl, gsap } = film;
  const events = (window.__events = window.__events ?? []);
  const log = (kind, at, end, note) => events.push({ kind, at: +at.toFixed(3), end: +end.toFixed(3), ...(note ? { note } : {}) });
  const sheets = [];

  function sheet(id, { paper = false } = {}) {
    const el = document.createElement("section");
    el.className = "scene sheet";
    el.id = id;
    el.innerHTML = `<svg class="lines" viewBox="0 0 1920 1080" width="1920" height="1080"><defs><linearGradient id="paper-${id}" gradientUnits="userSpaceOnUse" x1="-230" y1="-230" x2="2150" y2="1310"><stop offset="0" stop-color="#0d3b66"/><stop offset="1" stop-color="#134e8a"/></linearGradient></defs></svg><div class="labs"></div>`;
    // under the flash, the captions and the vignette the kit puts over everything
    document.getElementById("root").insertBefore(el, document.getElementById("flash"));
    if (paper && paperURL) el.style.background = `url(${paperURL}) 0 0 / 1920px 1080px`;
    gsap.set(el, { autoAlpha: 0 });
    const sh = { id, el, svg: el.querySelector("svg"), labs: el.querySelector(".labs"), cam: { x: 960, y: 540, z: 1 }, parts: [], labels: [] };
    // A point of the sheet on screen (before the sheet itself slides).
    sh.toScreen = (p) => [(p[0] - sh.cam.x) * sh.cam.z + 960, (p[1] - sh.cam.y) * sh.cam.z + 540];
    sh.part = (strokes, o) => part(sh, strokes, o);
    sh.label = (text, x, y, o) => label(sh, text, x, y, o);
    // The camera: the sheet's point (x, y) at the middle of the frame, z times closer. fit() frames a box.
    sh.camTo = (to, at, duration = 0.8, ease = "power2.inOut") => tl.to(sh.cam, { ...to, duration, ease }, at);
    // (a set at time 0 is not rendered by a paused timeline that is already at 0: set it now)
    sh.show = (at) => (at <= 0 ? gsap.set(el, { autoAlpha: 1 }) : tl.set(el, { autoAlpha: 1 }, at));
    sh.hide = (at) => tl.set(el, { autoAlpha: 0 }, at);
    sheets.push(sh);
    return sh;
  }
  // The camera that puts sheet point p at screen point q at zoom z.
  const aim = (p, q, z) => ({ x: p[0] - (q[0] - 960) / z, y: p[1] - (q[1] - 540) / z, z });

  // ── Parts: strokes in their own coordinates, placed on the sheet by { x, y, r, s } (all tweenable) ──────────────
  // k: a constant weight on the part's opacity, for secondary thin lines (spokes) drawn fainter than the outlines
  function part(sh, strokes, { x = 0, y = 0, r = 0, s = 1, fixed = false, drawn = false, alpha = 1, k = 1, name } = {}) {
    const g = document.createElementNS(SVG, "g");
    if (name) g.dataset.name = name;
    sh.svg.append(g);
    const list = strokes.map((k) => {
      const path = document.createElementNS(SVG, "path");
      path.setAttribute("fill", "none");
      // a filled shape (an arrowhead, a leader's dot) fills with its line's colour; "paper" knocks out what is behind
      if (k.fill) k.fillWith = k.fill === "paper" ? `url(#paper-${sh.id})` : k.col === "acc" ? "var(--accent)" : "var(--ink)";
      path.setAttribute("stroke", k.col === "acc" ? "var(--accent)" : "var(--ink)");
      path.setAttribute("stroke-width", k.w);
      path.setAttribute("stroke-linecap", k.dash ? "butt" : "round");
      path.setAttribute("stroke-linejoin", "round");
      if (k.dash) path.setAttribute("stroke-dasharray", DASH[k.dash](k.w));
      g.append(path);
      const cum = [0];
      const pts = k.closed ? [...k.pts, k.pts[0]] : k.pts;
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      return { ...k, pts, cum, len: cum.at(-1) * s, path };
    });
    // Where each stroke starts along the pen's run, with a short lift between strokes.
    let run = 0;
    const lift = 14;
    for (const k of list) {
      k.off = run;
      run += k.len + lift;
    }
    const st = { p: drawn ? Infinity : 0, e: 0, a: alpha, x, y, r, s, sy: 1, clipX: null, total: Math.max(1, run - lift) };
    g.style.opacity = alpha;
    const P = { sh, g, list, st, fixed, k, sig: "" };
    sh.parts.push(P);
    // Drawn on at a steady pen speed (sheet px a second), or in a set time; returns when the pen lifts.
    P.drawOn = (at, { speed = 2600, duration, kind, ease = "none" } = {}) => {
      const d = duration ?? st.total / speed;
      // A set, then a tween from it: seeking back before `at` restores whatever was there (a part drawn at frame 0 and
      // drawn again later is still drawn at frame 0).
      tl.set(st, { p: 0, e: 0 }, at);
      tl.to(st, { p: st.total + 1, duration: d, ease }, at);
      log(kind ?? list[0]?.tool ?? "pen", at, at + d);
      return at + d;
    };
    // Rubbed out: every line taken back from its end to its start.
    P.erase = (at, duration = 0.3, quiet = false) => {
      tl.to(st, { e: 1, duration, ease: "power1.in" }, at);
      if (!quiet) log("erase", at, at + duration);
      return at + duration;
    };
    P.fade = (at, to, duration = 0.4) => tl.to(st, { a: to, duration, ease: "power1.inOut" }, at);
    P.set = (vars, at) => tl.set(st, vars, at);
    P.to = (vars, at) => tl.to(st, vars, at);
    return P;
  }

  function render(P) {
    const { st, sh } = P;
    const cam = sh.cam;
    const sig = `${st.p},${st.e},${st.a},${st.x},${st.y},${st.r},${st.s},${st.sy},${st.clipX},${P.fixed ? "" : `${cam.x},${cam.y},${cam.z}`}`;
    if (sig === P.sig) return;
    P.sig = sig;
    P.g.style.opacity = st.a * P.k;
    if (st.a <= 0.002 || st.p <= 0 || st.e >= 1) {
      P.g.style.display = "none";
      return;
    }
    P.g.style.display = "";
    const c = Math.cos((st.r * Math.PI) / 180), n = Math.sin((st.r * Math.PI) / 180);
    const z = P.fixed ? 1 : cam.z, ox = P.fixed ? 0 : 960 - cam.x * z, oy = P.fixed ? 0 : 540 - cam.y * z;
    const sx = st.s, sy = st.s * st.sy;
    const X = (q) => (st.x + c * sx * q[0] - n * sy * q[1]) * z + ox;
    const Y = (q) => (st.y + n * sx * q[0] + c * sy * q[1]) * z + oy;
    for (const k of P.list) {
      const f = Math.max(0, Math.min(1, (st.p - k.off) / k.len)) * (1 - st.e);
      if (k.fillWith) {
        const fill = f >= 1 ? k.fillWith : "none";
        if (k.filled !== fill) k.path.setAttribute("fill", (k.filled = fill));
      }
      if (f <= 0) {
        if (k.shown !== "") k.path.setAttribute("d", (k.shown = ""));
        continue;
      }
      if (st.clipX != null && k.pts.length === 2) {
        // a straight line (a hatch stroke) shown only right of the sweeping cutting line
        const [a0, b0] = k.pts, lo = a0[0] < b0[0] ? a0 : b0, hi = a0[0] < b0[0] ? b0 : a0;
        if (hi[0] <= st.clipX) {
          if (k.shown !== "") k.path.setAttribute("d", (k.shown = ""));
          continue;
        }
        const u = lo[0] >= st.clipX ? 0 : (st.clipX - lo[0]) / (hi[0] - lo[0]);
        const q0 = [lo[0] + (hi[0] - lo[0]) * u, lo[1] + (hi[1] - lo[1]) * u];
        const d = `M${X(q0).toFixed(1)} ${Y(q0).toFixed(1)}L${X(hi).toFixed(1)} ${Y(hi).toFixed(1)}`;
        if (k.shown !== d) k.path.setAttribute("d", (k.shown = d));
        continue;
      }
      const target = f * k.cum.at(-1);
      let d = `M${X(k.pts[0]).toFixed(1)} ${Y(k.pts[0]).toFixed(1)}`;
      let i = 1;
      for (; i < k.pts.length && k.cum[i] <= target; i++) d += `L${X(k.pts[i]).toFixed(1)} ${Y(k.pts[i]).toFixed(1)}`;
      if (i < k.pts.length && target > k.cum[i - 1]) {
        const u = (target - k.cum[i - 1]) / (k.cum[i] - k.cum[i - 1]);
        const q = [k.pts[i - 1][0] + (k.pts[i][0] - k.pts[i - 1][0]) * u, k.pts[i - 1][1] + (k.pts[i][1] - k.pts[i - 1][1]) * u];
        d += `L${X(q).toFixed(1)} ${Y(q).toFixed(1)}`;
      }
      if (f >= 1 && k.closed) d += "Z";
      if (k.shown !== d) k.path.setAttribute("d", (k.shown = d));
    }
  }

  // ── Lettering: technical capitals, written letter by letter ──────────────────────────────────────────────────
  // (x, y) is the middle of the line of text, on the sheet (it moves and scales with the camera) or, with
  // fixed: true, on the frame. `part`: ride on a part (a number on a turning tooth), in that part's coordinates.
  function label(sh, text, x, y, { size = 30, align = "start", col = "ink", fixed = false, part: on, zoom = true, cls = "" } = {}) {
    const el = document.createElement("div");
    el.className = `lab ${cls}`.trim();
    el.innerHTML = text.replace(/→/g, '<svg class="arr" viewBox="0 0 44 20"><path d="M3 10 H39 M30 3.5 L39.5 10 L30 16.5"/></svg>');
    el.style.fontSize = `${size}px`;
    if (col === "acc") el.classList.add("acc");
    sh.labs.append(el);
    // letters set straight (a technical hand), and hidden until they are written
    for (const span of ink.letters(el)) span.style.transform = "none";
    const ax = align === "start" ? 0 : align === "end" ? 100 : 50;
    const L = { el, sh, x, y, ax, fixed, on, zoom, st: { x, y, a: 1 }, sig: "" };
    for (const svg of el.querySelectorAll("svg")) gsap.set(svg, { autoAlpha: 0 });
    gsap.set(el.querySelectorAll(".ink-ch"), { clipPath: "inset(-40% 115% -40% -15%)" });
    sh.labels.push(L);
    L.write = (at, { speed = 30, duration } = {}) => {
      const end = ink.write(el, at, { speed, duration });
      for (const svg of el.querySelectorAll("svg")) tl.set(svg, { autoAlpha: 1 }, at + (end - at) * 0.5);
      log("write", at, end);
      return end;
    };
    L.erase = (at, duration = 0.25, quiet = false) => {
      ink.erase(el, at, { duration });
      for (const svg of el.querySelectorAll("svg")) tl.set(svg, { autoAlpha: 0 }, at + duration * 0.5);
      if (!quiet) log("erase", at, at + duration);
      return at + duration;
    };
    // shown whole at once (frame 0 of the film is a finished drawing)
    L.done = () => gsap.set(el.querySelectorAll(".ink-ch, svg"), { clipPath: "inset(-40% -15% -40% -15%)", autoAlpha: 1 });
    L.fade = (at, to, duration = 0.4) => tl.to(L.st, { a: to, duration, ease: "power1.inOut" }, at);
    return L;
  }
  function place(L) {
    const { sh, st } = L;
    let p = [st.x, st.y];
    if (L.on) {
      const s = L.on.st, c = Math.cos((s.r * Math.PI) / 180), n = Math.sin((s.r * Math.PI) / 180);
      p = [s.x + s.s * (c * st.x - n * st.y), s.y + s.s * (n * st.x + c * st.y)];
    }
    const z = L.fixed ? 1 : sh.cam.z;
    const q = L.fixed ? p : sh.toScreen(p);
    const k = L.zoom ? z : 1;
    const sig = `${q[0].toFixed(1)},${q[1].toFixed(1)},${k},${st.a}`;
    if (sig === L.sig) return;
    L.sig = sig;
    L.el.style.transform = `translate(${q[0].toFixed(1)}px, ${q[1].toFixed(1)}px) translate(-${L.ax}%, -50%) scale(${k})`;
    L.el.style.transformOrigin = `${L.ax}% 50%`;
    L.el.style.opacity = st.a;
  }

  // ── The title block, bottom right of every sheet: the title; scale and sheet; units and revision ───────────────
  const TB = { x0: 1440, x1: 1840, y0: 872, y1: 1008, r1: 917, r2: 962, xm: 1640 };
  function titleBlock(sh, at, { title, units = "UNITS: mm", scale, no, rev = "REV B", lines = "drawn", write = ["title", "no"] }) {
    const { x0, x1, y0, y1, r1, r2, xm } = TB;
    const P = sh.part([
      { pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], closed: true, w: THICK - 1, col: "ink", tool: "ruler" },
      { pts: [[x0, r1], [x1, r1]], w: 2, col: "ink", tool: "ruler" },
      { pts: [[x0, r2], [x1, r2]], w: 2, col: "ink", tool: "ruler" },
      { pts: [[xm, r1], [xm, y1]], w: 2, col: "ink", tool: "ruler" },
    ], { fixed: true, drawn: lines === "drawn" });
    const cell = (text, x, y) => sh.label(text, x + 16, y, { size: 28, fixed: true, zoom: false, cls: "tb" });
    const L = {
      title: cell(title, x0, (y0 + r1) / 2 + 1),
      scale: cell(`SCALE ${scale}`, x0, (r1 + r2) / 2 + 1),
      no: cell(`SHEET ${no}`, xm, (r1 + r2) / 2 + 1),
      units: cell(units, x0, (r2 + y1) / 2 + 1),
      rev: cell(rev, xm, (r2 + y1) / 2 + 1),
    };
    let t = lines === "drawn" ? at : P.drawOn(at, { duration: 0.35, kind: "ruler" });
    for (const [k, lab] of Object.entries(L)) {
      if (at === 0 || !write.includes(k)) lab.done();
      else t = lab.write(Math.max(at, t - 0.15), { speed: 80 });
    }
    return { P, ...L };
  }
  // The texts of a title block changed at a cut (a new sheet): the old ones go and the new ones are there at once,
  // so the block is never blank.
  function retitle(sh, at, old, { title, scale, no, units }) {
    const { x0, y0, r1, r2, y1, xm } = TB;
    const mk = (text, x, y) => { const L = sh.label(text, x + 16, y, { size: 28, fixed: true, zoom: false, cls: "tb" }); gsap.set(L.el, { autoAlpha: 0 }); tl.set(L.el, { autoAlpha: 1 }, at); L.done(); return L; };
    const n = {};
    if (title) { n.title = mk(title, x0, (y0 + r1) / 2 + 1); if (old.title) tl.set(old.title.el, { autoAlpha: 0 }, at); }
    if (scale) { n.scale = mk(`SCALE ${scale}`, x0, (r1 + r2) / 2 + 1); if (old.scale) tl.set(old.scale.el, { autoAlpha: 0 }, at); }
    if (no) { n.no = mk(`SHEET ${no}`, xm, (r1 + r2) / 2 + 1); if (old.no) tl.set(old.no.el, { autoAlpha: 0 }, at); }
    if (units) { n.units = mk(units, x0, (r2 + y1) / 2 + 1); if (old.units) tl.set(old.units.el, { autoAlpha: 0 }, at); }
    return { ...old, ...n };
  }

  // Jobs that set the parts' state from the timeline's own numbers (a gear's angle, the bike's ride) run first.
  const before = [];
  film.each((t) => {
    for (const job of before) job(t);
    for (const sh of sheets) {
      if (sh.el.style.visibility === "hidden") continue;
      for (const P of sh.parts) render(P);
      for (const L of sh.labels) place(L);
    }
  });

  return { sheet, aim, titleBlock, retitle, log, TB, before: (job) => before.push(job) };
}
