// "Where does a phone battery keep its energy?" in the Whiteboard template. Built from storyboard.json: every time
// below is a shot's start or end, or a word of the take (voice/voice.json, the words in the film's own time).
//
// One long whiteboard, drawn section by section; the camera tracks along it, eased, and pushes in on what the voice
// names:
//   A  the two phones, full and empty (frame 0; the last shot flies back to it: the loop)
//   B  the question          C  the pouch, opened: the wound roll, its three layers, a slice turned on its side
//   D  the cell (graphite | separator, a porous wall in electrolyte | metal oxide), the wire with the charger or the
//      phone, and beside the graphite the hill
//   E  the two close-ups, drawn small up the board above the cell (the camera stays close)     F  the recap
// Each section's own coordinates are its storyboard frames' coordinates (1920 x 1080), placed at its offset.
// Lines are drawn on stroke by stroke; anything taken off the board goes with an eraser wipe. Lettering, the captions
// included, is written on the board as it is said, beside the drawing it belongs to.
// The only things that move without being drawn are the ones that show the change: the six lithium ions and their
// six electrons, and the ball on the hill. The six ions are the same six all film (f3).
import { createFilm } from "../../kit/engine/motion.js";
import { createInk } from "../../kit/engine/ink.js";

const storyboard = await (await fetch("storyboard.json")).json();
const take = await (await fetch("voice/voice.json")).json();
const film = await createFilm({ storyboard });
const { tl, gsap, $, shots: s } = film;
const ink = createInk(film);
const END = film.duration;
const NS = "http://www.w3.org/2000/svg";
film.scene("#board", 0, END);

// ── The take: when each word is said, in the film's time ───────────────────────────────────────────────────────────
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
const words = (id) => take.film[id].words;
const said = (id, w, n = 0) => {
  const hits = words(id).filter((x) => norm(x[2]) === norm(w));
  if (!hits[n]) throw new Error(`"${w}" is not said in ${id}`);
  return hits[n][0];
};

// ── Everything drawn, written, wiped or moved is logged (render.mjs --events), for cues.build.py ─────────────────────
const events = (window.__events = []);
const ev = (kind, at, end = at) => events.push({ kind, at: +at.toFixed(3), end: +end.toFixed(3) });
// Strokes are drawn on through a dash offset kept in a state object and written every frame: ink.drawOn tweens
// strokeDashoffset itself, and GSAP rounds that to whole pixels, so with pathLength="1" a stroke would pop on at half
// its time instead of being drawn (reported; worked around here).
const dash = new Map();
const stroke = (path, off = 1) => {
  let st = dash.get(path);
  if (!st) {
    st = { off, last: null };
    dash.set(path, st);
    path.setAttribute("pathLength", "1");
    path.style.strokeDasharray = "1 1.02";
  }
  return st;
};
film.each(() => {
  for (const [path, st] of dash) if (st.last !== st.off) { path.style.strokeDashoffset = st.off.toFixed(4); st.last = st.off; }
});
function inkOn(sel, at, { speed = 2400, duration, gap = 0.015, ease = "power1.inOut", min = 0.03 } = {}) {
  const list = ink.paths(sel), lengths = list.map((q) => q.getTotalLength()), n = list.length;
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  if (duration) {
    gap = Math.min(gap, (duration * 0.25) / Math.max(1, n - 1));
    min = Math.min(min, (duration * 0.5) / n);
  }
  const scale = duration ? Math.max(0.05, duration - gap * (n - 1)) / (total / speed) : 1;
  let t = at;
  list.forEach((path, i) => {
    const d = Math.max(min, (lengths[i] / speed) * scale);
    tl.fromTo(stroke(path), { off: 1 }, { off: 0, duration: d, ease, immediateRender: false }, t);
    t += d + gap;
  });
  return t;
}
const drawOn = (sel, at, o = {}) => {
  const end = inkOn(sel, at, o);
  ev(o.kind ?? "line", at, end);
  return end;
};
const write = (sel, at, o = {}) => {
  const end = ink.write(sel, at, { speed: 24, ...o });
  ev("write", at, end);
  return end;
};

// ── The board ──────────────────────────────────────────────────────────────────────────────────────────────────────
// [x, y, scale]: E is drawn at half size up the board, so the camera reaches it without pulling back.
const SEC = { A: [0, 0, 1], B: [2000, 0, 1], C: [3700, 0, 1], D: [6600, 0, 1], E: [6620, -720, 0.5], F: [8400, 0, 1] };
const svg = $("#world"), cam = $("#board .cam");
const defs = document.createElementNS(NS, "defs");
defs.innerHTML = '<linearGradient id="wipeEdge" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>';
svg.append(defs);
const ghosts = document.createElementNS(NS, "g");
ghosts.setAttribute("class", "ghost");
svg.append(ghosts);
const smudges = document.createElementNS(NS, "g");
smudges.setAttribute("class", "smudge");
svg.append(smudges);
const layer = {};
for (const [k, [x, y, sc]] of Object.entries(SEC)) {
  layer[k] = document.createElementNS(NS, "g");
  layer[k].setAttribute("transform", `translate(${x} ${y}) scale(${sc})`);
  // a pen drawing a half-size drawing is still the same pen
  if (sc !== 1) layer[k].style.setProperty("--s", String(1.3 / sc / 2.05 ** 0.35));
  svg.append(layer[k]);
}
function draw(sec, markup) {
  const g = document.createElementNS(NS, "g");
  g.innerHTML = markup;
  layer[sec].append(g);
  return g;
}
// Lettering: x, y is the baseline (as on the board pages); align "start" puts x at its left edge, "end" at its right.
function text(sec, x, y, str, size = 46, cls = "") {
  const [X, Y, S] = SEC[sec];
  const el = Object.assign(document.createElement("div"), { className: `t ${cls}`.trim(), innerHTML: str });
  Object.assign(el.style, { left: `${X + x * S}px`, top: `${Y + y * S}px`, fontSize: `${size * S}px` });
  cam.append(el);
  return el;
}
const rr = (x, y, w, h, r) => `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
const p = (d, w = 5, cls = "") => `<path d="${d}" style="--w:${w}"${cls ? ` class="${cls}"` : ""}/>`;
const circ = (x, y, r, w = 5, cls = "") => `<circle cx="${x}" cy="${y}" r="${r}" style="--w:${w}"${cls ? ` class="${cls}"` : ""}/>`;
const head = (x0, y0, x1, y1, h = 22, spread = 0.5) => {
  const a = Math.atan2(y1 - y0, x1 - x0);
  return `M${(x1 - Math.cos(a - spread) * h).toFixed(1)} ${(y1 - Math.sin(a - spread) * h).toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)} L${(x1 - Math.cos(a + spread) * h).toFixed(1)} ${(y1 - Math.sin(a + spread) * h).toFixed(1)}`;
};
const arrow = (x0, y0, x1, y1, w = 5, cls = "", h = 22) => p(`M${x0} ${y0} L${x1} ${y1}`, w, cls) + p(head(x0, y0, x1, y1, h), w, cls);
const poly = (pts) => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const at = (d) => {
    d = Math.max(0, Math.min(cum.at(-1), d));
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const f = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    const [a, b] = [pts[i - 1], pts[i]];
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, tx: (b[0] - a[0]) / (cum[i] - cum[i - 1] || 1), ty: (b[1] - a[1]) / (cum[i] - cum[i - 1] || 1) };
  };
  return { pts, cum, length: cum.at(-1), at, frac: (u) => at(u * cum.at(-1)) };
};
const dashes = (pts, dash = 18, gap = 13) => {
  const L = poly(pts);
  let d = "";
  for (let a = 0; a < L.length; a += dash + gap) {
    const b = Math.min(L.length, a + dash), q0 = L.at(a), q1 = L.at(b);
    d += `M${q0.x.toFixed(1)} ${q0.y.toFixed(1)} `;
    for (let i = 1; i < L.pts.length; i++) if (L.cum[i] > a && L.cum[i] < b) d += `L${L.pts[i][0].toFixed(1)} ${L.pts[i][1].toFixed(1)} `;
    d += `L${q1.x.toFixed(1)} ${q1.y.toFixed(1)} `;
  }
  return d.trim();
};
const bez = ([x0, y0], [x1, y1], [x2, y2], [x3, y3], n = 40) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return [u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3];
  });
const smooth = (wps, n = 14) => {
  const out = [];
  for (let i = 0; i < wps.length - 1; i++) {
    const p0 = wps[Math.max(0, i - 1)], p1 = wps[i], p2 = wps[i + 1], p3 = wps[Math.min(wps.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(wps.at(-1));
  return out;
};
const pathOf = (pts) => `M${pts.map((q) => q.map((v) => v.toFixed(1)).join(" ")).join(" L")}`;
// Points beside a curve: off > 0 on its left as it runs (outside a hill drawn from its top down).
const beside = (pts, off) => pts.map(([x, y], i, a) => {
  const j = Math.min(a.length - 1, i + 1), k = Math.max(0, i - 1), tx = a[j][0] - a[k][0], ty = a[j][1] - a[k][1], l = Math.hypot(tx, ty) || 1;
  return [x + (ty / l) * off, y - (tx / l) * off];
});
const dashedArrow = (pts, cls = "b", w = 5) => {
  const L = poly(pts), back = L.at(L.length - 40); // the head points along the last 40 px of the line
  return p(dashes(pts, 15, 11), w, cls) + p(head(back.x, back.y, ...pts.at(-1), 22), w, cls);
};

// ── The eraser: a soft-edged wipe across the thing, left to right, with a faint smear following it ───────────────────
const wipes = [];
let wipeN = 0;
function wipe(targets, at, { duration = 0.3, quiet = false } = {}) {
  for (const el of [].concat(targets)) {
    const st = { p: 0 };
    let box, apply, clear;
    if (el instanceof SVGElement) {
      const b = el.getBBox(), pad = 16, band = Math.max(30, Math.min(80, b.width * 0.25));
      box = { x: b.x - pad, y: b.y - pad, w: b.width + 2 * pad, h: b.height + 2 * pad, band };
      const id = `wipe${wipeN++}`, m = document.createElementNS(NS, "mask");
      m.id = id;
      m.setAttribute("maskUnits", "userSpaceOnUse");
      Object.entries({ x: box.x - band, y: box.y, width: box.w + 2 * band, height: box.h }).forEach(([k, v]) => m.setAttribute(k, v));
      m.innerHTML = `<rect class="keep" fill="#fff" y="${box.y}" height="${box.h}"/><rect class="edge" fill="url(#wipeEdge)" y="${box.y}" height="${box.h}" width="${band}"/>`;
      defs.append(m);
      const keep = m.querySelector(".keep"), edge = m.querySelector(".edge");
      apply = (q) => {
        const e = box.x - band + q * (box.w + band);
        edge.setAttribute("x", e.toFixed(1));
        keep.setAttribute("x", (e + band).toFixed(1));
        keep.setAttribute("width", Math.max(0, box.x + box.w - e - band).toFixed(1));
        if (el.getAttribute("mask") !== `url(#${id})`) el.setAttribute("mask", `url(#${id})`);
      };
      clear = () => el.hasAttribute("mask") && el.removeAttribute("mask");
      // the smear, in the same space as the thing (a drawing group has no transform of its own)
      const [X, Y, S] = SEC[Object.keys(layer).find((k) => layer[k].contains(el))];
      box.world = { x: X + box.x * S, y: Y + box.y * S, w: box.w * S, h: box.h * S, band: band * S };
    } else {
      const r = el.getBoundingClientRect(); // the camera is at rest while the film is built: these are board units
      box = { world: { x: r.left - 10, y: r.top - 6, w: r.width + 20, h: r.height + 12, band: Math.max(24, r.width * 0.25) } };
      apply = (q) => {
        const a = -30 + q * 130;
        el.style.webkitMaskImage = el.style.maskImage = `linear-gradient(90deg, transparent ${a.toFixed(1)}%, #000 ${(a + 28).toFixed(1)}%)`;
      };
      clear = () => { if (el.style.maskImage) el.style.webkitMaskImage = el.style.maskImage = ""; };
    }
    const w = box.world, smear = document.createElementNS(NS, "rect");
    Object.entries({ y: w.y + w.h * 0.1, height: w.h * 0.8, width: w.band * 1.4, rx: w.h * 0.2 }).forEach(([k, v]) => smear.setAttribute(k, v));
    smudges.append(smear);
    wipes.push({ at, st, apply, clear, smear, w });
    tl.fromTo(st, { p: 0 }, { p: 1, duration, ease: "power1.inOut", immediateRender: false }, at);
  }
  if (!quiet) ev("erase", at, at + duration);
  return at + duration;
}
film.each((t) => {
  for (const x of wipes) {
    if (t < x.at) { x.clear(); x.smear.style.opacity = 0; continue; }
    x.apply(x.st.p);
    const q = x.st.p;
    x.smear.setAttribute("x", (x.w.x - x.w.band + q * (x.w.w + x.w.band)).toFixed(1));
    x.smear.style.opacity = q > 0 && q < 1 ? (0.16 * Math.sin(Math.PI * q)).toFixed(3) : 0;
  }
});

// ── Things that move: a group the timeline places (x, y, a = turn in degrees, on = shown) ──────────────────────────
const movers = [];
function mover(sec, markup, x, y, extra = {}) {
  const g = draw(sec, markup);
  const st = { x, y, a: 0, on: 1, g, ...extra };
  movers.push(st);
  return st;
}
const placeMovers = () => {
  for (const m of movers) {
    m.g.setAttribute("transform", `translate(${m.x.toFixed(2)} ${m.y.toFixed(2)}) rotate(${m.a.toFixed(1)})`);
    const v = m.on > 0.5 ? "visible" : "hidden";
    if (m.g.style.visibility !== v) m.g.style.visibility = v;
  }
};
// A lithium ion: a blue ring with a plus (f3). An electron: a small black dot.
const ionMark = (r = 18) => circ(0, 0, r, r > 30 ? 6 : 5, "b") + p(`M0 ${-r * 0.5} V${r * 0.5} M${-r * 0.5} 0 H${r * 0.5}`, r > 30 ? 5 : 4, "b");
const ion = (sec, x, y, r = 18) => mover(sec, ionMark(r), x, y);
const electron = (sec, x, y, on = 0) => mover(sec, '<circle class="dot" r="10"/>', x, y, { on });
// The ball on the hill: a marker ball with a shine and a little shading, not an ion.
const ballMark = (r) => circ(0, 0, r, 6) + p(`M${-r * 0.55} ${-r * 0.15} Q${-r * 0.5} ${-r * 0.5} ${-r * 0.15} ${-r * 0.58}`, 4) + p(`M${r * 0.2} ${r * 0.62} L${r * 0.62} ${r * 0.2} M${-r * 0.1} ${r * 0.8} L${r * 0.8} ${-r * 0.1}`, 3.5);

// ── The camera: a pure function of time ─────────────────────────────────────────────────────────────────────────────
// (x, y) is the board point at the centre of the frame, z the zoom. Every move is eased over 0.8 to 1.5 s; between
// moves the camera keeps a slow push. No motion blur: the board is read while it travels.
const A0 = { x: 960, y: 540, z: 1 };
const moves = [];
const move = (at, dur, to, ease = "power2.inOut", out = 0) => moves.push({ at, dur, to, ease: gsap.parseEase(ease), out });
const D = (x, y, z) => ({ x: SEC.D[0] + x, y: SEC.D[1] + y, z });
function camAt(t) {
  let c = { ...A0 };
  for (const m of moves) {
    if (t <= m.at) break;
    const to = { ...c, ...m.to };
    if (t >= m.at + m.dur) {
      c = to;
      continue;
    }
    const e = m.ease((t - m.at) / m.dur);
    const z = (c.z * Math.pow(to.z / c.z, e)) / (1 + m.out * Math.sin(Math.PI * e) ** 1.5);
    return { x: c.x + (to.x - c.x) * e, y: c.y + (to.y - c.y) * e, z };
  }
  return c;
}
film.each((t) => {
  const c = camAt(t);
  cam.style.transform = `translate(${(960 - c.x * c.z).toFixed(2)}px, ${(540 - c.y * c.z).toFixed(2)}px) scale(${c.z.toFixed(5)})`;
  // The marker stays (nearly) the same marker at any zoom: a close-up is drawn with the same pen.
  svg.style.setProperty("--k", ((c.z < 1 ? Math.sqrt(c.z) : Math.pow(c.z, 0.35)) / c.z).toFixed(4));
  film.stage.camx = (c.x - 960) / 1920;
  film.stage.camy = -(c.y - 540) / 1080;
});

// ── Ghost marks: old ink that never quite came off the board (they travel with it) ─────────────────────────────────
const ghost = (sec, pts, thin = false) => (ghosts.innerHTML += `<path${thin ? ' class="thin"' : ""} d="${pathOf(smooth(pts.map(([x, y]) => [SEC[sec][0] + x, SEC[sec][1] + y]), 8))}"/>`);
ghost("A", [[1300, 126], [1460, 116], [1620, 124], [1770, 140]]);
ghost("A", [[1830, 990], [1950, 970], [2040, 1000]], true);
ghost("B", [[1500, 160], [1620, 150], [1730, 172]]);
ghost("B", [[380, 990], [520, 1002], [640, 986]], true);
ghost("C", [[150, 300], [190, 420], [170, 540]], true);
ghost("C", [[1550, 1010], [1700, 1000], [1820, 1014]]);
ghost("D", [[1480, 1010], [1620, 996], [1780, 1012]], true);
ghost("D", [[1500, 110], [1660, 96], [1800, 114]]);
ghost("F", [[1600, 1000], [1750, 990], [1880, 1006]], true);
ghost("E", [[1500, 160], [1900, 128], [2300, 160]]);

// ═══ A: two phones, full and empty, the same six lithium ions in each (s01; frame 0 is finished) ══════════════════
// A phone seen from the back with its cover off (about 1 : 2, as a phone is): the camera module, and the flat battery
// that fills most of it, with a window on its insides: the graphite band (sheets), the dashed separator and the
// oxide band (rings). The six ions sit in the graphite band of the full one and the oxide band of the empty one.
function phoneBack(x, y, full) {
  const w = 320, h = 640;
  let m = p(rr(x, y, w, h, 42), 7) + p(rr(x + 22, y + 22, 104, 104, 26), 5) + circ(x + 56, y + 56, 17, 4.5) + circ(x + 92, y + 92, 17, 4.5) + circ(x + 96, y + 50, 6, 4);
  m += p(rr(x + 30, y + 170, w - 60, h - 230, 18), 6) + p(`M${x + 125} ${y + 170} V${y + 146} H${x + 195} V${y + 170}`, 4.5);
  const band = 80, g0 = x + 46, o1 = x + w - 46, top = y + 200, bottom = y + h - 80;
  m += p(`M${g0} ${top - 10} V${bottom} M${g0 + band} ${top - 10} V${bottom}`, 4) + p(`M${o1 - band} ${top - 10} V${bottom} M${o1} ${top - 10} V${bottom}`, 4);
  m += p(dashes([[x + w / 2, top - 10], [x + w / 2, bottom]], 16, 12), 4);
  for (let k = 0; k < 7; k++) {
    const yy = top - 6 + k * 62;
    if (yy < bottom - 8) m += p(`M${g0 + 8} ${yy} H${g0 + band - 8}`, 3.5) + circ(o1 - band / 2 - 20, yy, 6, 3.5) + circ(o1 - band / 2 + 20, yy, 6, 3.5);
  }
  const cx = full ? g0 + band / 2 : o1 - band / 2;
  for (let k = 0; k < 6; k++) m += `<g transform="translate(${cx} ${top + 26 + k * 62})">${ionMark(17)}</g>`;
  m += p(rr(x + 60, y - 80, 84, 40, 8), 4.5) + p(`M${x + 144} ${y - 68} h8 v16 h-8`, 4.5);
  if (full) m += `<path d="${rr(x + 66, y - 74, 72, 28, 4)}" class="fill" style="--w:2"/>`;
  return m;
}
draw("A", phoneBack(330, 220, true) + phoneBack(1270, 220, false));
text("A", 570, 176, "100%", 54);
text("A", 1490, 176, "0%", 54);
text("A", 960, 600, "=", 220, "b");
text("A", 490, 920, "full", 50);
text("A", 1430, 920, "empty", 50);
const aTap = draw("A", p("M1080 520 C1080 450 1030 410 962 410 C890 410 838 456 838 524 C838 596 890 640 960 640 C1032 640 1084 594 1078 506", 6, "b"));

// ═══ B: the question (s02): the same flat pouch the film is about to open, with a '?' ═══════════════════════════════
const bBatt = draw("B", p(rr(150, 330, 500, 330, 22), 8) + p(`M${150 + 22} 334 V372 H${650 - 22} V334`, 5) + p(rr(250, 342, 34, 18, 4), 4) + p(rr(520, 342, 40, 18, 4), 4) +
  p("M380 334 V310 Q380 296 394 296 H470 Q484 296 484 282 V262", 5) + p(rr(462, 232, 46, 30, 6), 5));
const bQ = text("B", 400, 600, "?", 200);
const bWhere = text("B", 1220, 420, "Where's the", 120);
const bEnergy = text("B", 1220, 600, "energy?", 140);
// Boxes and underlines round lettering are drawn from where the lettering really is (measured once, the camera at rest).
const box = (el, sec) => { const r = el.getBoundingClientRect(); return { x: r.left - SEC[sec][0], y: r.top - SEC[sec][1], w: r.width, h: r.height }; };
const eb = box(bEnergy, "B");
const bBox = draw("B", p(rr(eb.x - 28, eb.y + 4, eb.w + 56, eb.h + 18, 18), 7, "b"));

// ═══ C: a phone's battery: a sealed flat pouch, opened: one wound roll, three layers, a slice turned on its side ═══
// The pouch (f2): sealed flanges down its sides and along the bottom, the two tabs coming out of the top seal under
// the protection board, the flex cable to the phone, and the printed label (the example cell of f7).
const cPouch = draw("C", p(rr(300, 220, 800, 540, 26), 8));
const cSeal = draw("C", p("M326 268 V734 H1074 V268", 4.5) + p(Array.from({ length: 11 }, (_, i) => `M${304 + (i % 2) * 2} ${300 + i * 40} h16`).join(" "), 3.5) + p(Array.from({ length: 11 }, (_, i) => `M${1080} ${300 + i * 40} h16`).join(" "), 3.5));
const cTabs = draw("C", p(rr(470, 196, 46, 30, 4), 5) + p(rr(884, 196, 46, 30, 4), 5));
const cBoard = draw("C", p("M330 222 V268 H1070 V222", 5) + p(rr(400, 234, 46, 24, 4), 4) + p(rr(560, 238, 30, 16, 3), 4) + p(rr(960, 234, 54, 24, 4), 4) +
  p("M690 222 V196 Q690 178 708 178 H850 Q868 178 868 160 V140", 5) + p("M712 222 V200 Q712 196 716 196 H866 Q890 196 890 172 V140", 5) + p(rr(846, 104, 66, 36, 6), 5));
const cLabel = draw("C", p(rr(450, 400, 500, 220, 16), 5));
const cPrint = [text("C", 700, 492, "Li-ion", 72), text("C", 700, 576, "3.87 V · 5000 mAh", 46)];
const cName = text("C", 1440, 300, "phone battery", 54);
const cLead = draw("C", p("M1262 316 Q1190 326 1106 372", 4));
// Opened: cut down the right seal, the front film peeled back on itself.
const cCut = draw("C", p(dashes([[1074, 268], [1074, 734]], 22, 14), 5));
const cPeel = draw("C", p("M1074 268 C 1006 360, 1006 640, 1074 734", 6) + p("M1074 268 C 1176 300, 1196 690, 1074 734", 6) + p("M1110 320 C 1150 420, 1150 580, 1112 690", 3.5));
// Inside: thin sheets wound into one flat roll: one marker line spiralling in from its free outer end, where the strip
// comes out, to a loose inner end.
const spiral = (off) => {
  const out = [];
  for (let phi = 0; phi <= Math.PI * 2 * 4.3; phi += 0.05) {
    const inset = (52 * phi) / (Math.PI * 2) + off, a = 330 - inset, b = 210 - inset;
    if (b < 30) break;
    const c = Math.cos(phi), sn = Math.sin(phi), e = 0.5;
    out.push([680 + a * Math.sign(c) * Math.abs(c) ** e, 490 - b * Math.sign(sn) * Math.abs(sn) ** e]);
  }
  return out;
};
const rollA = spiral(0);
const cRoll = draw("C", `<path d="${pathOf(rollA)}" style="--w:6"/>`);
// The strip pulled out of the roll through the opened side: graphite, separator, metal oxide, top to bottom.
const cStrip = [
  draw("C", p("M1010 486 C1090 486 1130 440 1210 440 H1640", 9)),
  draw("C", p(dashes([[1010, 497], [1060, 500], [1210, 500], [1640, 500]], 20, 13), 5)),
  draw("C", p("M1010 508 C1090 508 1130 560 1210 560 H1640", 9)),
];
const cLabels = [text("C", 1668, 455, "graphite", 44, "start"), text("C", 1668, 515, "separator", 44, "start"), text("C", 1668, 575, "metal oxide", 44, "start")];
// A slice of it, magnified and turned on its side: the cell the film draws next, in the same order left to right.
const cLens = draw("C", p("M1532 500 C1532 452 1500 424 1450 424 C1400 424 1368 454 1368 502 C1368 550 1402 578 1452 578 C1502 578 1534 548 1530 488", 5, "b"));
const cSlice = draw("C", p(rr(1300, 700, 330, 210, 10), 6) + Array.from({ length: 5 }, (_, i) => p(`M1312 ${730 + 36 * i} H1400`, 4)).join("") + p("M1452 708 V902", 5) + p("M1478 708 V902", 5) +
  Array.from({ length: 3 }, (_, i) => Array.from({ length: 3 }, (_, j) => circ(1530 + 34 * j, 740 + 62 * i, 8, 4)).join("")).join(""));
const cTurn = draw("C", dashedArrow(smooth([[1440, 590], [1400, 640], [1430, 690]], 10), "b"));
const lSlice = [text("C", 1356, 960, "graphite", 40), text("C", 1466, 960, "sep.", 40), text("C", 1566, 960, "oxide", 40)];

// ═══ D: the cell, a slice through its sheets (schematic, not to scale), the wire, and the hill beside the graphite ══
const GX0 = 170, GX1 = 470, OX0 = 930, OX1 = 1230, TOP = 400, BOT = 840, SEP = 700;
const SHEETS = Array.from({ length: 8 }, (_, i) => 430 + 55 * i);
const RING_ROWS = [440, 520, 600, 680, 760];
const G_SLOTS = [[250, 457], [390, 512], [250, 567], [390, 622], [250, 677], [390, 732]]; // between graphite sheets
const O_SLOTS = [[1010, 480], [1150, 560], [1010, 640], [1150, 720], [1010, 800], [1150, 480]]; // between oxide rows
const E_G = G_SLOTS.map(([x, y]) => [x - 45, y]); // each ion's electron, beside it
const E_O = O_SLOTS.map(([x, y]) => [x + 46, y]);
// The separator: a thin porous wall; its pores (46 high) are where the ions go through, in electrolyte (f6).
const PORES = [430, 530, 630, 730, 830];
const WALLS = [[380, 407], [453, 507], [553, 607], [653, 707], [753, 807]];
const dGraphite = draw("D", p(`M${GX0} ${TOP} H${GX1} V${BOT} H${GX0} Z`, 8));
const dSheets = draw("D", SHEETS.map((y) => p(`M${GX0 + 14} ${y} H${GX1 - 14}`, 5)).join(""));
const dOxide = draw("D", p(`M${OX0} ${TOP} H${OX1} V${BOT} H${OX0} Z`, 8));
const dRings = draw("D", RING_ROWS.map((y) => Array.from({ length: 6 }, (_, j) => circ(955 + 50 * j, y, 10, 4)).join("")).join(""));
const dSep = draw("D", WALLS.map(([a, b]) => p(`M${SEP - 11} ${a + 2} V${b - 2} M${SEP + 11} ${a + 2} V${b - 2}`, 6)).join(""));
const TILDE = [[530, 770], [610, 570], [585, 838], [860, 520], [850, 700], [780, 812]];
const dTilde = TILDE.map(([x, y]) => text("D", x, y, "~", 46));
const lGraphite = text("D", 320, 890, "graphite", 46);
const lOxide = text("D", 1080, 890, "metal oxide", 46);
const lCobalt = text("D", 1080, 945, "(in phones: lithium cobalt oxide)", 44);
const lElectrolyte = text("D", 560, 890, "electrolyte", 44);
const dElecLead = draw("D", p("M590 852 Q600 830 610 806", 4));
const lSeparator = text("D", 812, 890, "separator", 44);
const dSepLead = draw("D", p("M780 852 Q742 846 716 812", 4));
const lSchematic = text("D", 330, 945, "(schematic, not to scale)", 44);
// The ions start at home, in the oxide, each with its electron (the battery is empty).
const ions = O_SLOTS.map(([x, y]) => ion("D", x, y));
const electrons = E_O.map(([x, y]) => electron("D", x, y, 0));
const dLiArrows = draw("D", arrow(880, 322, 520, 322, 5, "b") + arrow(520, 352, 880, 352, 5, "b"));
const lLithium = text("D", 700, 296, "lithium", 46, "b");
// The wire leaves the graphite and the metal oxide at the corners that face each other across the separator.
const WX_G = 440, WX_O = 960, WY = 170;
const dWire = draw("D", p(`M${WX_G} ${TOP} V${WY} H620`, 7) + p(`M${WX_O} ${TOP} V${WY} H780`, 7));
// The wall charger: the brick, its pins, its cable down to the plug in the gap of the wire.
const dCharger = draw("D", p(rr(640, -10, 120, 86, 14), 8) + p("M672 -10 V-44 M728 -10 V-44", 8) + p("M700 76 C700 110 718 122 700 152", 6) + p(rr(674, 152, 52, 36, 8), 6) + p(`M620 ${WY} H674 M726 ${WY} H780`, 7));
const lCharger = text("D", 790, 40, "charger", 46, "start");
const dChargeArrow = draw("D", arrow(590, 136, 470, 136, 6));
const lElectronsIn = text("D", 990, 300, "electrons", 46, "start");
// The phone in the circuit is the phone of the first picture, seen from the front: same proportions, a screen.
const dPhone = draw("D", p(`M620 ${WY} H650 M750 ${WY} H780`, 7) + p(rr(650, 50, 100, 200, 22), 7) + p(rr(661, 64, 78, 172, 12), 4.5) + circ(700, 76, 4, 3.5));
const lPhone = text("D", 790, 112, "phone", 46, "start");
const dRays = draw("D", p("M700 36 V6 M762 46 L788 20 M638 46 L612 20", 6, "b"));
const dGlow = draw("D", Array.from({ length: 5 }, (_, k) => p(`M666 ${120 + 28 * k} L734 ${94 + 28 * k}`, 4, "b")).join(""));
const lFlow = text("D", 440, 132, "electron flow = current", 34, "b");
const dUseArrows = draw("D", arrow(830, 136, 940, 136, 6) + arrow(466, 350, 466, 250, 6));
const lElectronsOut = text("D", 486, 300, "electrons", 46, "start");
const dEmpty = draw("D", p(rr(676, 190, 48, 22, 4), 4) + p("M724 196 h5 v10 h-5", 4));
const lZero = text("D", 700, 174, "0%", 42);
// The hill, beside the graphite: high on the right, next to the graphite (lithium in the graphite), falling away to
// the left, low (lithium in the metal oxide). An analogy (f5): gravity stands in for the bonding.
const HILL_TOP = 430, HILL_FOOT = 830;
const HILL = [[80, HILL_TOP], ...bez([-40, HILL_TOP], [-160, HILL_TOP], [-200, HILL_FOOT], [-420, HILL_FOOT], 60)];
const dHill = draw("D", p(`M80 ${HILL_TOP} H-40 C-160 ${HILL_TOP} -200 ${HILL_FOOT} -420 ${HILL_FOOT}`, 8));
const lInG = text("D", 20, 350, "in graphite", 46);
const lInO = text("D", -330, 890, "in metal oxide", 46);
// The ball rests on the line: u = 0 on the flat top, 1 at the foot; it turns as it rolls.
const hillRun = poly(HILL.filter(([x]) => x <= 20 && x >= -392));
const BALL_R = 26;
const ballAt = (u, off = BALL_R + 6) => {
  const q = hillRun.frac(u);
  return { x: q.x - q.ty * off, y: q.y + q.tx * off };
};
const ball = mover("D", ballMark(BALL_R), ballAt(1).x, ballAt(1).y);
const ballState = { u: 1 };
const along = (u0, u1, off, n = 30) => Array.from({ length: n + 1 }, (_, i) => { const q = ballAt(u0 + ((u1 - u0) * i) / n, off); return [q.x, q.y]; });
const dPushUp = draw("D", dashedArrow(along(0.88, 0.12, 80)));
const lPushUp = text("D", -440, 418, "pushed up", 46, "b start");
const dRollDown = draw("D", dashedArrow(along(0.12, 0.88, 80)));
const lRollDown = text("D", -440, 418, "rolls down", 46, "b start");
const dGround = draw("D", p(dashes([[100, HILL_FOOT], [-300, HILL_FOOT]], 16, 12), 4));
const dMeasure = draw("D", p(`M104 ${HILL_FOOT} V${HILL_TOP + 2}`, 6, "b") + p(`M89 ${HILL_FOOT} H119 M89 ${HILL_TOP + 2} H119`, 6, "b"));
const lStored = [text("D", -60, 680, "stored", 46, "b"), text("D", -60, 732, "energy", 46, "b")];
const dBracket = draw("D", p("M484 440 Q508 600 484 760", 6, "b"));
// The ions' way home, across the separator: it begins right of "electrons" (lettered on use beside the left wire), so
// the two labels are not read as one ("electrons home").
const dHome = draw("D", dashedArrow([[660, 335], [888, 335]]));
const lHome = text("D", 800, 305, "home", 46, "b");
const dCrossArrow = draw("D", dashedArrow([[860, 335], [552, 335]]));
// The separator, close: where the ion went through, where the electron was stopped. Lettered for the push-in.
const ZS = 1.9, ZC = 2.8;
const lThrough = text("D", 742, 588, "through a pore", 46 / ZS, "b start");
const dThroughLead = draw("D", p("M744 594 Q728 604 716 616", 3.5, "b"));
const BUMP_AT = [SEP - 22, 630];
const dCross = draw("D", p(`M${BUMP_AT[0] - 13} ${BUMP_AT[1] - 13} L${BUMP_AT[0] + 13} ${BUMP_AT[1] + 13} M${BUMP_AT[0] + 13} ${BUMP_AT[1] - 13} L${BUMP_AT[0] - 13} ${BUMP_AT[1] + 13}`, 6, "r"));
const dBack = draw("D", p(`M${BUMP_AT[0] - 18} ${BUMP_AT[1] + 14} Q600 690 520 660`, 5, "r") + p(head(560, 684, 520, 660, 14), 5, "r"));
const lCant = text("D", 600, 716, "electrons can't pass", 46 / ZC, "r");

// ═══ E: the two close-ups (s10), up the board above the cell, half size ═══════════════════════════════════════════
const eSheets = draw("E", [300, 440, 610, 750].map((y) => p(`M120 ${y} H860`, 7)).join(""));
const eIonG = ion("E", 490, 525, 42);
const eWobble = draw("E", p("M424 492 Q404 525 424 558 M556 492 Q576 525 556 558", 4.5) + p("M402 476 Q386 525 402 574 M578 476 Q594 525 578 574", 3.5));
const eRings = draw("E", [440, 610].map((y) => Array.from({ length: 9 }, (_, j) => circ(1100 + 85 * j, y, 30, 5)).join("")).join(""));
const eIonO = ion("E", 1440, 525, 42);
const eBonds = draw("E", p("M1410 495 L1378 463 M1470 495 L1502 463 M1410 555 L1378 587 M1470 555 L1502 587", 5));
const lInGraphite = text("E", 490, 220, "in graphite", 56);
const lInOxide = text("E", 1440, 220, "in metal oxide", 56);
const lLoose = text("E", 490, 872, "loose: doesn't like it here", 48);
const lTight = text("E", 1440, 872, "held tight: at home", 48);

// ═══ F: the answer in one frame (s18) ══════════════════════════════════════════════════════════════════════════════
const lHeading = text("F", 960, 190, "charging = pushing lithium <span class=\"hk\">up the hill</span>", 72);
const hk = box(lHeading.querySelector(".hk"), "F");
const fUnder = draw("F", p(`M${hk.x - 4} ${hk.y + hk.h + 2} Q${hk.x + hk.w / 2} ${hk.y + hk.h + 10} ${hk.x + hk.w + 6} ${hk.y + hk.h - 2}`, 7, "b"));
// The small hills run the same way as the big one: high on the right, where the lithium is in the graphite.
const fHill1 = draw("F", p("M620 400 H490 C370 400 340 760 120 760", 8));
const fBall1 = mover("F", ballMark(26), 530, 368);
const up1 = beside(bez([490, 400], [370, 400], [340, 760], [120, 760], 30).slice(5, 25), -58).reverse();
const fUp = draw("F", dashedArrow(up1));
const lUp = text("F", 220, 560, "up", 44, "b");
const fPlug = draw("F", p(rr(150, 230, 120, 84, 12), 7) + p("M180 230 V195 M240 230 V195", 7));
const lF1 = text("F", 370, 850, "charging: lithium goes up", 46);
const fHill2 = draw("F", p("M1200 400 H1070 C950 400 920 760 700 760", 8));
const fBall2 = mover("F", ballMark(26), 760, 730);
const dn2 = beside(bez([1070, 400], [950, 400], [920, 760], [700, 760], 30).slice(5, 25), -58);
const fDown = draw("F", dashedArrow(dn2));
const lDown = text("F", 800, 560, "down", 44, "b");
const fPhone = draw("F", p(rr(1100, 248, 76, 138, 16), 7) + p(rr(1109, 260, 58, 112, 9), 4.5));
const fElectron = draw("F", '<circle class="dot" cx="1000" cy="318" r="10"/>');
const fEArrow = draw("F", arrow(1022, 318, 1088, 318, 6));
const lF2 = text("F", 950, 850, "in use: lithium goes down", 46);
const fBatts = draw("F", p(rr(1300, 320, 210, 420, 16), 7) + p(rr(1600, 320, 210, 420, 16), 7) + p(dashes([[1405, 340], [1405, 720]], 14, 10), 4) + p(dashes([[1705, 340], [1705, 720]], 14, 10), 4));
const fIons = draw("F", Array.from({ length: 6 }, (_, k) => `<g transform="translate(1352 ${370 + 64 * k})">${ionMark(16)}</g><g transform="translate(1758 ${370 + 64 * k})">${ionMark(16)}</g>`).join(""));
const lEq = text("F", 1555, 572, "=", 110, "b");
const lFull = text("F", 1405, 298, "full", 44);
const lEmptyF = text("F", 1705, 298, "empty", 44);
const lF3 = text("F", 1555, 850, "same stuff, just moved", 46);

// Every line a hand's line: resampled and pushed sideways a little (no pencil under a marker).
ink.roughen("#world > g:not(.ghost):not(.smudge) path, #world > g:not(.ghost):not(.smudge) circle:not(.dot)", { amount: 1.1, step: 8, seed: 5 });
const hiddenLines = (els) => { for (const q of ink.paths([].concat(els))) stroke(q, 1); };

// ═══ The timeline, shot by shot ═══════════════════════════════════════════════════════════════════════════════════
// ── s01: frame 0 is the finished board; the camera pushes slowly toward the '='; the '=' is ringed on the words ────
move(0, 3.6, { x: 960, y: 548, z: 1.04 }, "sine.inOut");
hiddenLines(aTap);
drawOn(aTap, said("s01", "exactly"), { duration: 0.42, kind: "ring" });

// ── s02: the camera tracks right along the board; then the pouch, its '?', the question written as it is said ────
move(3.45, 1.25, { x: SEC.B[0] + 860, y: 540, z: 1 }, "sine.inOut");
move(4.7, 1.15, { x: SEC.B[0] + 880, z: 1.02 }, "sine.inOut");
let t = drawOn(bBatt, 4.72, { duration: 0.3 });
write(bQ, 4.74, { duration: 0.14 });
ev("tap", 4.88);
write(bWhere, Math.max(t, said("s02", "where's")), { duration: 0.3 });
write(bEnergy, said("s02", "energy?") + 0.02, { duration: 0.36 });
drawOn(bBox, said("s02", "energy?") + 0.36, { duration: 0.22 });
wipe(aTap, 5.4, { quiet: true }); // off camera: the first picture goes back to how it was

// ── s03: track right along the board to the pouch, then draw it: seals, tabs, board, flex, its label ──────────────
move(5.86, 1.1, { x: SEC.C[0] + 900, y: 500, z: 1 }, "sine.inOut");
move(6.96, 1.44, { x: SEC.C[0] + 920, z: 1.02 }, "sine.inOut");
t = drawOn(cPouch, 6.98, { duration: 0.18 });
drawOn(cSeal, t, { duration: 0.12 });
drawOn([cTabs, cBoard], t + 0.06, { duration: 0.2 });
drawOn(cLabel, t + 0.08, { duration: 0.1 });
write(cPrint[0], t + 0.14, { duration: 0.14 });
write(cPrint[1], t + 0.22, { duration: 0.16 });
write(cName, t + 0.12, { duration: 0.24 });
drawOn(cLead, t + 0.32, { duration: 0.08 });

// ── s04: "Inside": cut down the right seal, the film peeled back, label and name wiped; the roll; the strip ───────
t = drawOn(cCut, said("s04", "inside,"), { duration: 0.22, gap: 0.01, kind: "dash" });
t = drawOn(cPeel, t + 0.02, { duration: 0.26 });
wipe([cLabel, ...cPrint, cName, cLead], t, { duration: 0.3 });
t = drawOn(cRoll, t + 0.3, { duration: 0.75, kind: "spiral" });
drawOn(cStrip[0], said("s04", "sheets,") - 0.04, { duration: 0.32 });
drawOn(cStrip[1], said("s04", "sheets,") + 0.12, { duration: 0.32, gap: 0.004, kind: "dash" });
drawOn(cStrip[2], said("s04", "sheets,") + 0.28, { duration: 0.32 });
move(8.4, 1.0, { x: SEC.C[0] + 1090, z: 1.0 }, "sine.inOut");
write(cLabels[0], said("s04", "rolled") - 0.02, { duration: 0.18 });
write(cLabels[1], said("s04", "rolled") + 0.14, { duration: 0.18 });
write(cLabels[2], said("s04", "up") + 0.04, { duration: 0.2 });
drawOn(cLens, said("s04", "rolled") + 0.26, { duration: 0.16, kind: "ring" });
drawOn(cTurn, said("s04", "rolled") + 0.38, { duration: 0.12 });
drawOn(cSlice, said("s04", "up") + 0.2, { duration: 0.3, min: 0.008, gap: 0.004 });
write(lSlice, said("s04", "up") + 0.48, { duration: 0.16 });

// ── s05: track right along the board to the slice, large: graphite, then the oxide ────────────────────────────────
const AT_D = 10.9;
move(9.95, AT_D - 9.95, D(700, 590, 1.1), "sine.inOut");
move(AT_D, 3.6, D(700, 590, 1.13), "sine.inOut");
t = drawOn(dGraphite, AT_D + 0.02, { duration: 0.24 });
drawOn(dSheets, t, { duration: 0.42, kind: "sheets" });
write(lGraphite, t + 0.2, { duration: 0.26 });
t = drawOn(dOxide, said("s05", "metal") - 0.04, { duration: 0.24 });
drawOn(dRings, t, { duration: 0.6, min: 0.012, gap: 0.006, kind: "rings" });
write(lOxide, said("s05", "oxide") + 0.08, { duration: 0.3 });
write(lCobalt, said("s05", "other,") - 0.02, { duration: 0.5 });

// ── s06: the separator, a thin porous wall, down the middle; the electrolyte dotted in; the names ───────────────────
drawOn(dSep, said("s06", "thin") - 0.04, { duration: 0.42, gap: 0.006, kind: "dash" });
write(lSeparator, said("s06", "separator"), { duration: 0.3 });
drawOn(dSepLead, said("s06", "separator") + 0.32, { duration: 0.1 });
dTilde.forEach((el, i) => write(el, said("s06", "between,") - 0.18 + i * 0.05, { duration: 0.08 }));
write(lElectrolyte, said("s06", "between,") + 0.14, { duration: 0.28 });
drawOn(dElecLead, said("s06", "between,") + 0.44, { duration: 0.1 });
write(lSchematic, said("s06", "between,") + 0.3, { duration: 0.36 });

// ── s07: the six ions drawn in the oxide, each with its electron; 'lithium' moving across ────────────────────────
ions.forEach((q, i) => {
  hiddenLines(q.g);
  const at = said("s07", "lithium") + i * 0.085;
  drawOn(q.g, at, { duration: 0.08, kind: "ion" });
  tl.set(electrons[i], { on: 1 }, at + 0.1);
});
drawOn(dLiArrows, said("s07", "moving") - 0.04, { duration: 0.32 });
write(lLithium, said("s07", "moving") + 0.06, { duration: 0.22 });

// ── s08: the camera rises to the top as the wire is drawn; the charger plugged into the gap; the electrons pushed
//    out of the cell's own oxide, round the wire through the charger, into the graphite ────────────────────────────
// (the wire is drawn at the end of s07, completing the cell before the camera rises)
drawOn(dWire, said("s07", "across.") + 0.08, { duration: 0.36 });
move(16.0, 1.0, D(640, 300, 1.2), "sine.inOut");
wipe([dLiArrows, lLithium], 17.02, { duration: 0.26 });
t = drawOn(dCharger, 17.02, { duration: 0.38 });
ev("plug", t);
write(lCharger, t - 0.1, { duration: 0.26 });
// The routes. On charge: out of the oxide at its corner, up and along the wire, through the charger, down into the
// graphite to its place. On use, out of the graphite at its corner facing the separator, the other way round.
const chargeRoute = (k) => poly([...smooth([E_O[k], [(E_O[k][0] + WX_O) / 2, (E_O[k][1] + TOP) / 2], [WX_O, TOP + 4]], 8), [WX_O, WY], [780, WY], [620, WY], [WX_G, WY], ...smooth([[WX_G, TOP + 4], [(E_G[k][0] + WX_G) / 2, (E_G[k][1] + TOP) / 2], E_G[k]], 8)]);
const EDGE_E = (k) => [GX1 - 60, G_SLOTS[k][1]], EDGE_I = (k) => [GX1 - 24, G_SLOTS[k][1]];
const upRoute = (k) => poly([...smooth([EDGE_E(k), [GX1 - 22, G_SLOTS[k][1] - 24], [GX1 - 22, TOP + 22], [WX_G, TOP + 4]], 8), [WX_G, WY], [650, WY], [750, WY], [WX_O, WY], ...smooth([[WX_O, TOP + 4], [(E_O[k][0] + WX_O) / 2, (E_O[k][1] + TOP) / 2], E_O[k]], 8)]);
const rides = [];
const rideTo = (e, route, at, dur, ease = "none", hide = false) => rides.push({ e, route, at, dur, ease: gsap.parseEase(ease), hide });
film.each((tt) => {
  for (const e of electrons) {
    const r = rides.filter((x) => x.e === e && x.at <= tt + 1e-6).at(-1);
    if (!r) continue;
    const q = Math.min(1, (tt - r.at) / r.dur), pt = r.route.at(r.ease(q) * r.route.length);
    e.x = pt.x;
    e.y = pt.y;
  }
});
const E_CHARGE_AT = t + 0.12, E_GAP = 0.28, E_DUR = 2.0;
electrons.forEach((e, k) => {
  rideTo(e, chargeRoute(k), E_CHARGE_AT + k * E_GAP, E_DUR, "sine.inOut");
  ev("emerge", E_CHARGE_AT + k * E_GAP);
});
write(lElectronsIn, E_CHARGE_AT + 0.3, { duration: 0.3 });
drawOn(dChargeArrow, said("s08", "into") - 0.1, { duration: 0.26 });

// ── s09 / s09b: the camera comes down to the cell; the ions cross, through the pores, and slip between the sheets ─
move(18.45, 1.0, D(700, 600, 1.1), "sine.inOut");
wipe(lElectronsIn, 19.45, { duration: 0.26 });
const nearPore = (y) => PORES.reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a));
const ionRoute = (from, to, pore) => {
  const [ox, oy] = from[0] > 900 ? from : to, [gx, gy] = from[0] > 900 ? to : from;
  const wps = [[ox, oy], [OX0 + 30, oy], [OX0 - 10, oy], [SEP + 70, (oy + pore) / 2], [SEP, pore], [SEP - 70, (gy + pore) / 2], [GX1 + 12, gy], [GX1 - 22, gy], [gx, gy]];
  return poly(smooth(from[0] > 900 ? wps : wps.reverse(), 12));
};
const ionRides = [];
const ionRide = (q, route, at, dur, ease = "sine.inOut", u0 = 0, u1 = 1) => ionRides.push({ q, route, at, dur, ease: gsap.parseEase(ease), u0, u1 });
film.each((tt) => {
  for (const q of ions) {
    const r = ionRides.filter((x) => x.q === q && x.at <= tt + 1e-6).at(-1);
    if (!r) continue;
    const f = Math.min(1, (tt - r.at) / r.dur), u = r.u0 + (r.u1 - r.u0) * r.ease(f), pt = r.route.frac(u);
    q.x = pt.x;
    q.y = pt.y;
  }
});
// When a ride really comes to rest (the eased ride creeps for its last moments): the time it is within a screen pixel.
const restsAt = (route, at, dur, ease = "sine.inOut") => {
  const e = gsap.parseEase(ease), end = route.frac(1);
  for (let k = 0; k <= 240; k++) {
    const q = route.frac(e(k / 240));
    if (Math.hypot(q.x - end.x, q.y - end.y) < 0.6) return at + (k / 240) * dur;
  }
  return at + dur;
};
const I_CHARGE_AT = said("s09", "lithium") - 0.04, I_GAP = 0.17, I_DUR = 1.86;
ions.forEach((q, k) => {
  const route = ionRoute(O_SLOTS[k], G_SLOTS[k], nearPore((O_SLOTS[k][1] + G_SLOTS[k][1]) / 2));
  ionRide(q, route, I_CHARGE_AT + k * I_GAP, I_DUR);
  ev("slide", I_CHARGE_AT + k * I_GAP + 0.5, I_CHARGE_AT + k * I_GAP + 1.3);
  ev("settle", restsAt(route, I_CHARGE_AT + k * I_GAP, I_DUR));
});
drawOn(dCrossArrow, said("s09", "cross") - 0.1, { duration: 0.34, gap: 0.004 });
// s09b: push in on the graphite on "slip".
move(20.15, 0.95, D(452, 574, 2.0), "sine.inOut");
wipe(dCrossArrow, 20.1, { duration: 0.24 });
move(21.1, 0.6, D(445, 574, 2.05), "sine.inOut");

// ── s10: up the board, staying close, to a clean stretch: the graphite close-up, then a beat ─────────────────────
const E_VIEW = { x: SEC.E[0] + 960 * SEC.E[2], y: SEC.E[1] + 540 * SEC.E[2], z: 2.05 };
move(21.7, 1.05, E_VIEW, "sine.inOut");
move(22.75, 2.65, { z: 2.12 }, "sine.inOut");
hiddenLines([eIonG.g, eIonO.g]);
t = drawOn(eSheets, 22.78, { duration: 0.36 });
write(lInGraphite, 22.86, { duration: 0.3 });
drawOn(eIonG.g, said("s10", "catch:") + 0.06, { duration: 0.22, kind: "ion" });

// ── s10b: the oxide close-up beside it: loose against held tight ─────────────────────────────────────────────────
t = drawOn(eRings, said("s10b", "lithium"), { duration: 0.6, min: 0.01, gap: 0.006, kind: "rings" });
write(lInOxide, said("s10b", "lithium") + 0.06, { duration: 0.36 });
drawOn(eIonO.g, t, { duration: 0.18, kind: "ion" });
drawOn(eBonds, t + 0.2, { duration: 0.22 });
drawOn(eWobble, said("s10b", "doesn't") - 0.02, { duration: 0.24 });
write(lLoose, said("s10b", "doesn't") + 0.04, { duration: 0.58 });
write(lTight, said("s10b", "it") - 0.04, { duration: 0.42 });
ink.boil(eWobble, { rate: 10, amount: 4, from: said("s10b", "doesn't"), to: said("s10b", "there.") + 0.5 });
// The loose ion jitters in its gap (stepped, 10 times a second); the one at home stays still.
const jitter = [[0, 0], [5, -3], [-4, 4], [3, 5], [-5, -2], [4, 2], [-2, -5], [6, 1], [-4, 3], [2, -4]];
film.each((tt) => {
  const k = tt > said("s10", "catch:") + 0.3 && tt < said("s10b", "there.") + 0.5 ? jitter[Math.floor(tt * 10) % jitter.length] : [0, 0];
  eIonG.x = 490 + k[0];
  eIonG.y = 525 + k[1];
});

// ── s11: back down the board to the charged cell; the hill beside the graphite; the ball pushed up to the top ────
const WIDE = D(470, 452, 0.98);
const AT_HILL = 26.42;
move(25.45, AT_HILL - 25.45, WIDE);
move(AT_HILL, 2.5, { z: 1.0 }, "sine.inOut");
hiddenLines(ball.g);
t = drawOn(dHill, AT_HILL + 0.02, { duration: 0.3 });
write(lInG, t - 0.06, { duration: 0.26 });
write(lInO, t + 0.04, { duration: 0.3 });
drawOn(ball.g, t + 0.02, { duration: 0.14, kind: "ball" });
const PUSH_AT = t + 0.18, PUSH_END = said("s11", "hill:") + 0.24;
tl.to(ballState, { u: 0, duration: PUSH_END - PUSH_AT, ease: "power1.inOut" }, PUSH_AT);
ev("push", PUSH_AT, PUSH_END);
drawOn(dPushUp, PUSH_AT + 0.06, { duration: 0.42, gap: 0.004 });
write(lPushUp, said("s11", "hill:") - 0.1, { duration: 0.3 });
ev("rest", PUSH_END);

// ── s12: the six ions in the graphite bracketed; the measure from the ground to the ball: 'stored energy'; then the
//    camera pushes in on the ball on "position" and holds through the beat ─────────────────────────────────────────
wipe([dPushUp, lPushUp], said("s12", "the") - 0.02, { duration: 0.26 });
drawOn(dBracket, said("s12", "energy") - 0.02, { duration: 0.26 });
drawOn(dGround, said("s12", "energy") + 0.18, { duration: 0.26, gap: 0.004, kind: "dash" });
t = drawOn(dMeasure, said("s12", "is") - 0.05, { duration: 0.42 });
ev("tap", t + 0.02);
write(lStored[0], t + 0.04, { duration: 0.18 });
write(lStored[1], t + 0.22, { duration: 0.2 });
move(29.0, 0.95, D(-30, 548, 1.55));

// ── s13: back out; the charger wiped and the phone drawn in its place; the lithium heads home ────────────────────
move(30.0, 0.9, WIDE);
move(30.9, 1.6, { z: 1.0 }, "sine.inOut");
wipe([dCharger, lCharger, dChargeArrow], 30.92, { duration: 0.28 });
t = drawOn(dPhone, 31.2, { duration: 0.32 });
write(lPhone, t - 0.06, { duration: 0.22 });
wipe([dMeasure, ...lStored, dBracket], said("s13", "lithium") - 0.12, { duration: 0.3 });
// Each pair leaves its gap together, ion and electron, to the edge of the graphite facing the separator; there they
// part: the ion goes on through the separator, the electron can only go up the wire.
const homeRoute = ions.map((_, k) => ionRoute(G_SLOTS[k], O_SLOTS[k], nearPore((G_SLOTS[k][1] + O_SLOTS[k][1]) / 2)));
homeRoute[3] = ionRoute(G_SLOTS[3], O_SLOTS[3], 630);
const toEdgeIon = (k) => poly([G_SLOTS[k], EDGE_I(k)]), toEdgeE = (k) => poly([E_G[k], EDGE_E(k)]);
const edgeU = (k) => { const r = homeRoute[k]; let best = 0; for (let i = 0; i <= 400; i++) if (r.frac(i / 400).x <= EDGE_I(k)[0]) best = i / 400; return best; };
const pairLeaves = (k, at, crossDur) => {
  ionRide(ions[k], homeRoute[k], at, 0.5, "sine.inOut", 0, edgeU(k));
  rideTo(electrons[k], toEdgeE(k), at, 0.5, "sine.inOut");
  ionRide(ions[k], homeRoute[k], at + 0.62, crossDur, "sine.inOut", edgeU(k), 1);
  ev("part", at + 0.55);
  ev("slide", at + 1.1, at + 1.9);
  ev("home", at + 0.62 + crossDur);
};
const HOME_1 = said("s13", "lithium") + 0.02;
pairLeaves(1, HOME_1, 1.7);
const HOME_3 = said("s13", "heads") - 0.02;
const U_PORE3 = (() => { const r = homeRoute[3]; let best = 0, bd = 1e9; for (let i = 0; i <= 400; i++) { const d = Math.abs(r.frac(i / 400).x - SEP); if (d < bd) { bd = d; best = i / 400; } } return best; })();
const CROSS = said("s14", "cross");
ionRide(ions[3], homeRoute[3], HOME_3, 0.5, "sine.inOut", 0, edgeU(3));
rideTo(electrons[3], toEdgeE(3), HOME_3, 0.5, "sine.inOut");
ionRide(ions[3], homeRoute[3], HOME_3 + 0.62, CROSS - HOME_3 - 0.62, "sine.in", edgeU(3), U_PORE3);
ionRide(ions[3], homeRoute[3], CROSS, 1.3, "sine.out", U_PORE3, 1);
ev("part", HOME_3 + 0.55);
ev("pass", CROSS);
drawOn(dHome, said("s13", "home.") - 0.1, { duration: 0.3, gap: 0.004 });
write(lHome, said("s13", "home.") + 0.12, { duration: 0.2 });
drawOn(dRollDown, said("s13", "heads") - 0.06, { duration: 0.4, gap: 0.004 });
write(lRollDown, said("s13", "home.") - 0.04, { duration: 0.32 });
// The ball's height is the share of the lithium still up in the graphite: it rolls as the ions go home.
film.each((tt) => {
  let u = ballState.u;
  if (tt >= HOME_1) {
    let sum = 0;
    for (const [k, q] of ions.entries()) sum += Math.min(1, Math.hypot(q.x - G_SLOTS[k][0], q.y - G_SLOTS[k][1]) / Math.hypot(O_SLOTS[k][0] - G_SLOTS[k][0], O_SLOTS[k][1] - G_SLOTS[k][1]));
    u = Math.min(1, sum / 6);
  }
  const q = ballAt(u);
  ball.x = q.x;
  ball.y = q.y;
  ball.a = -u * Math.round(((hillRun.length / BALL_R) * (180 / Math.PI)) / 90) * 90;
});
ev("roll", said("s13", "heads"), said("s13", "home.") + 0.5);

// ── s14: push in on the separator: an ion goes through a pore; on "can't" in on the electron stopped at the same pore ─
move(32.55, 0.9, D(700, 630, ZS));
write(lThrough, CROSS + 0.16, { duration: 0.4 });
drawOn(dThroughLead, CROSS + 0.52, { duration: 0.12 });
const BUMP = said("s14", "electrons");
rideTo(electrons[3], poly([EDGE_E(3), [GX1 + 10, 626], BUMP_AT]), BUMP - 0.48, 0.48, "power2.in");
rideTo(electrons[3], poly([BUMP_AT, [BUMP_AT[0] - 12, 632]]), BUMP, 0.14, "power2.out");
rideTo(electrons[3], poly(smooth([[BUMP_AT[0] - 12, 632], [600, 660], [GX1 + 4, 630], EDGE_E(3)], 10)), BUMP + 0.5, 0.75, "power2.inOut");
ev("bump", BUMP);
drawOn(dCross, BUMP + 0.08, { duration: 0.18, kind: "cross" });
move(34.8, 1.0, D(650, 640, ZC));
drawOn(dBack, BUMP + 0.46, { duration: 0.28 });
write(lCant, said("s14", "can't.") - 0.06, { duration: 0.5 });

// ── s15: back out to the top of the circuit: the electrons go the long way round, through the phone ──────────────
move(35.95, 1.0, D(560, 380, 1.12));
move(36.95, 1.9, D(700, 380, 1.12), "sine.inOut");
wipe([dCross, dBack, dThroughLead, lThrough, lCant], 35.85, { duration: 0.3 });
// The electrons take to the wire one after another, 0.35 s apart, and all ride it at one steady speed (3.15 s from
// the top of the graphite to the top of the oxide): four to six are on the wire, evenly spaced, all through "That
// flow is the current" (39.1 to 41.8). Each starts up out of the graphite early enough to reach the wire on its turn.
// The four pairs still in the graphite leave together and part at the edge; the last ion reaches home on "home".
const ORDER = [1, 3, 4, 2, 5, 0], WIRE_IN = 38.0, DT_UP = 0.35, W_UP = 3.15;
const onWire = (route) => {
  let s0 = 0, s1 = route.length;
  for (let s = 0; s <= route.length; s += 2) if (route.at(s).y < TOP) { s0 = s; break; }
  for (let s = route.length; s >= 0; s -= 2) if (route.at(s).y < TOP) { s1 = s; break; }
  return [s0, s1];
};
let ALL_HOME = 0;
ORDER.forEach((k, i) => {
  const route = upRoute(k), [s0, s1] = onWire(route), v = (s1 - s0) / W_UP;
  const enter = WIRE_IN + i * DT_UP, go = enter - s0 / v;
  const leave = go - 0.6;
  if (i >= 2) pairLeaves(k, leave, i === ORDER.length - 1 ? said("s17", "home,") - leave - 0.62 : 2.1);
  rideTo(electrons[k], route, go, route.length / v, "none");
  ev("tick", enter);
  ALL_HOME = Math.max(ALL_HOME, go + route.length / v);
});
drawOn(dUseArrows, said("s15", "long") - 0.06, { duration: 0.36 });
write(lElectronsOut, said("s15", "long") + 0.1, { duration: 0.3 });

// ── s16: push in on the phone and the wire on "current": the screen lights; 'electron flow = current' ────────────
move(39.2, 1.0, D(560, 240, 1.5));
t = drawOn(dRays, said("s16", "current") - 0.04, { duration: 0.24, kind: "rays" });
ev("chime", said("s16", "current"));
drawOn(dGlow, said("s16", "current") + 0.1, { duration: 0.28 });
write(lFlow, said("s16", "current") + 0.2, { duration: 0.5 });

// ── s17: back out: all six home, the ball at the foot of the hill, the phone's screen dark at 0% ─────────────────
move(41.75, 1.0, WIDE);
move(42.75, 0.8, { z: 0.99 }, "sine.inOut");
// the arrows and labels of the flow wiped as the last electron goes down into the oxide
wipe([dRays, dGlow, dUseArrows, dHome, dRollDown, lFlow, lHome, lRollDown, lElectronsOut], Math.min(ALL_HOME - 0.3, said("s17", "the") + 0.1), { duration: 0.3 });
drawOn(dEmpty, said("s17", "battery's") - 0.1, { duration: 0.22 });
write(lZero, said("s17", "battery's") + 0.14, { duration: 0.18 });

// ── s18: track right along the board to a clean stretch: the answer in one frame ──────────────────────────────────
const AT_F = 44.75;
move(43.6, AT_F - 43.6, { x: SEC.F[0] + 960, y: 540, z: 1 }, "sine.inOut");
move(AT_F, 3.25, { z: 1.025 }, "sine.inOut");
hiddenLines([fBall1.g, fBall2.g]);
write(lHeading, AT_F + 0.04, { duration: 0.8 });
t = drawOn(fHill1, 45.35, { duration: 0.24 });
drawOn(fBall1.g, t, { duration: 0.1, kind: "ball" });
drawOn(fPlug, t + 0.1, { duration: 0.22 });
drawOn(fUp, t + 0.32, { duration: 0.22, gap: 0.004 });
write(lUp, t + 0.4, { duration: 0.12 });
write(lF1, t + 0.5, { duration: 0.42 });
t = drawOn(fHill2, said("s18", "it") - 0.02, { duration: 0.24 });
drawOn(fBall2.g, t, { duration: 0.1, kind: "ball" });
drawOn(fPhone, t + 0.08, { duration: 0.22 });
tl.set(fElectron, { visibility: "hidden" }, 0);
tl.set(fElectron, { visibility: "visible" }, t + 0.3);
drawOn(fEArrow, t + 0.32, { duration: 0.12 });
drawOn(fDown, t + 0.42, { duration: 0.22, gap: 0.004 });
write(lDown, t + 0.5, { duration: 0.14 });
write(lF2, said("s18", "lithium") + 0.04, { duration: 0.42 });
t = drawOn(fBatts, said("s18", "back") - 0.1, { duration: 0.3 });
drawOn(fIons, t - 0.04, { duration: 0.24, min: 0.008, gap: 0.002, kind: "ions" });
write([lFull, lEmptyF], t - 0.1, { duration: 0.2 });
write(lF3, t + 0.16, { duration: 0.36 });
// the '=' goes down in the breath before "hill", and is tapped
const EQ = said("s18", "the") + 0.1;
write(lEq, EQ, { duration: 0.1 });
ev("tap", EQ + 0.03);
drawOn(fUnder, said("s18", "up") - 0.02, { duration: 0.26, kind: "under" });

// ── s19: the camera flies back along the whole board to the two phones: frame 0, a moment before the loop ───────
const FLY = 48.0, LAND = 49.05;
move(FLY, LAND - FLY, { x: 960, y: 540, z: 1 }, "power3.inOut", 3.0);
ev("track", FLY, LAND);

// ═══ Captions: short hand-written lines beside the drawing, on the board, written as they are said ════════════════
// Each shot's spoken words, in the lines given here, at a spot beside its drawing (board units of its section),
// sized to read at 46 px on screen at the camera's zoom there. A new caption on the same part of the board first
// wipes the one before. Lines marked skip are already lettered in the picture (s02's question, s14's red line).
const CAP = [
  { shot: "s01", sec: "A", x: 960, y: 250, align: "center", z: 1.02, lines: ["A full phone battery", "and an empty one hold", "exactly the same stuff."], gone: 5.4, quiet: true },
  { shot: "s03", sec: "C", x: 1300, y: 660, z: 1.0, lines: ["Let's open one."], after: 6.98 },
  { shot: "s04", sec: "C", x: 700, y: 836, align: "center", z: 1.0, lines: ["Inside, thin sheets,", "rolled up tight."], before: 9.95, gone: 11.5, quiet: true },
  { shot: "s05", sec: "D", x: -110, y: 175, z: 1.12, lines: ["Graphite on one side,", "metal oxide on the other,"] },
  { shot: "s06", sec: "D", x: -110, y: 175, z: 1.13, lines: ["a thin separator", "between,"] },
  { shot: "s07", sec: "D", x: -110, y: 175, z: 1.13, lines: ["and lithium", "moving across."] },
  { shot: "s08", sec: "D", x: -110, y: 175, z: 1.2, lines: ["Charging pushes", "electrons into", "the graphite,"] },
  { shot: "s09", sec: "D", x: -110, y: 175, z: 1.1, lines: ["and lithium ions", "cross over"], gone: 22.2, quiet: true },
  { shot: "s09b", sec: "D", x: 500, y: 352, z: 2.0, lines: ["and slip between", "its layers."], after: 21.1, gone: 22.3, quiet: true },
  { shot: "s10", sec: "E", x: 960, y: 115, align: "center", z: 1.03, lines: ["Here's the catch:"], after: 22.78 },
  { shot: "s10b", sec: "E", x: 960, y: 990, align: "center", z: 1.03, lines: ["lithium doesn't like it there."], gone: 28.0, quiet: true },
  { shot: "s11", sec: "D", x: -110, y: 175, z: 1.0, lines: ["It's a ball", "pushed up a hill:"], after: AT_HILL },
  { shot: "s12", sec: "D", x: -440, y: 252, z: 1.15, lines: ["the energy is", "in its position."] },
  { shot: "s13", sec: "D", x: -110, y: 175, z: 1.0, lines: ["Now use your phone,", "and the lithium", "heads home."], after: 30.92 },
  { shot: "s14", sec: "D", x: 482, y: 452, z: ZS, lines: ["Ions cross", "the separator.", { skip: "Electrons can't." }], after: 33.45, gone: 35.85 },
  { shot: "s15", sec: "D", x: -110, y: 175, z: 1.12, lines: ["So they go the", "long way round,", "through your phone."], after: 36.95 },
  { shot: "s16", sec: "D", x: -40, y: 175, z: 1.5, lines: ["That flow is", "the current that", "runs your phone."], gone: 41.68 },
  { shot: "s17", sec: "D", x: -110, y: 175, z: 1.0, lines: ["Once it's all home,", "the battery's empty."], after: 42.75, gone: 45.5, quiet: true },
  { shot: "s18", sec: "F", x: 960, y: 962, align: "center", z: 1.02, lines: ["Charging doesn't add electricity."], after: AT_F },
  { shot: "s18", sec: "F", x: 960, y: 962, align: "center", z: 1.02, lines: ["It pushes lithium back up the hill."], part: 1 },
];
(function captions() {
  const blocks = [];
  const used = new Map(); // shot -> how many of its words the blocks before have taken
  for (const c of CAP) {
    const shot = storyboard.shots.find((x) => x.id === c.shot);
    // the words with their key marks, from the storyboard's line
    const marks = [];
    for (const part of shot.voice.split(/(\*[^*]+\*)/)) {
      if (!part.trim()) continue;
      const key = part.startsWith("*");
      for (const w of (key ? part.slice(1, -1) : part).split(/\s+/).filter(Boolean)) {
        if (/^[.,;:!?]+$/.test(w) && marks.length) marks.at(-1).text += w;
        else marks.push({ text: w, key });
      }
    }
    let k = used.get(c.shot) ?? 0;
    const size = 46 / c.z, step = 56 / c.z;
    const lines = [];
    c.lines.forEach((line, li) => {
      const skip = typeof line === "object";
      const n = (skip ? line.skip : line).split(/\s+/).length;
      const toks = words(c.shot).slice(k, k + n).map((w, i) => ({ text: marks[k + i].text, key: marks[k + i].key, at: w[0], end: w[1] }));
      k += n;
      if (skip) return;
      const el = text(c.sec, c.x, c.y + li * step, "", size, `cap ${c.align === "center" ? "" : "start"}`.trim());
      let keyWrap = null;
      toks.forEach((tk, i) => {
        if (i) (keyWrap && tk.key ? keyWrap : el).append(" ");
        if (tk.key && !keyWrap) {
          keyWrap = Object.assign(document.createElement("span"), { className: "key" });
          keyWrap.append(Object.assign(document.createElement("i"), { className: "ul" }));
          el.append(keyWrap);
        } else if (!tk.key) keyWrap = null;
        tk.el = Object.assign(document.createElement("span"), { className: "cw", textContent: tk.text });
        (keyWrap ?? el).append(tk.el);
        tk.wrap = keyWrap;
      });
      lines.push({ el, toks });
    });
    used.set(c.shot, k);
    blocks.push({ ...c, lines });
  }
  blocks.forEach((b, i) => {
    let written = 0;
    const all = b.lines.flatMap((l) => l.toks);
    if (!all.length) return;
    // written as said, but never while the camera is still travelling to it (after), nor after it has left (before)
    let clock = b.after ?? 0;
    for (const tk of all) {
      const d = Math.min(Math.max(0.08, tk.text.length / 26), Math.max(0.1, tk.end - tk.at));
      let at = Math.max(tk.at, clock);
      if (b.before && at + d > b.before) at = Math.max(clock, b.before - d);
      ink.write(tk.el, at, { duration: d });
      tk.done = at + d;
      clock = at + d * 0.6;
      written = Math.max(written, at + d);
    }
    for (const l of b.lines) {
      const uls = [...l.el.querySelectorAll(".ul")];
      if (uls.length) gsap.set(uls, { scaleX: 0, rotation: -0.6, transformOrigin: "0% 50%" });
      for (const u of uls) {
        const last = l.toks.filter((tk) => tk.wrap === u.parentElement).at(-1);
        tl.to(u, { scaleX: 1, duration: 0.22, ease: "power2.out", immediateRender: false }, last.done);
      }
    }
    b.written = written;
    // the next caption on the same part of the board wipes this one first
    const next = blocks.slice(i + 1).find((x) => x.sec === b.sec && x.lines.some((l) => l.toks.length));
    const nextAt = next ? Math.max(next.after ?? 0, next.lines[0].toks[0].at) : Infinity;
    const gone = b.gone ?? (next ? Math.max(written + 0.15, nextAt - 0.36) : null);
    if (gone !== null) wipe(b.lines.map((l) => l.el), gone, { duration: Math.min(0.3, Math.max(0.16, nextAt - 0.04 - gone)), quiet: !!b.quiet });
  });
})();

// The camera's travels along the board, for the air of each move (cues.build.py).
for (const m of moves) {
  const c0 = camAt(m.at), c1 = camAt(m.at + m.dur);
  if (Math.hypot(c1.x - c0.x, c1.y - c0.y) > 600 || Math.abs(Math.log(c1.z / c0.z)) > 0.35) ev("move", m.at, m.at + m.dur);
}
film.each(placeMovers);
film.finish();
