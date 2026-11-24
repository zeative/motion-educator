// The Isometric template's miniature world, drawn on a 2D canvas: one fixed isometric projection (x to the lower right,
// y to the lower left, z up; the same Iso.p as storyboard.build.py, so a block drawn at (x, y, z) on the board is
// built at (x, y, z) here), matte blocks with rounded edges lit from the upper left (the top a step lighter, the
// left face the colour, the right face a step darker), soft contact shadows, and slabs floating over their own soft
// periwinkle shadow. The camera never turns: a View only pans and zooms the board's coordinates.
//
//   const V = new View(960, 560, 76);            // a diorama drawn on the board with Iso(960, 560, 76)
//   V.cam = { k: 1.2, fx: 718, fy: 258, sx: 960, sy: 540 };   // zoom 1.2 about the board's (718, 258), put at (960, 540)
//   const P = painter(ctx);  P.block(V, x, y, z, w, d, h, "#7b8cff");
export const C = Math.cos(Math.PI / 6);
export const PAL = {
  paper: "#eef1ff",
  peri: "#7b8cff",
  peach: "#ffb4a2",
  mint: "#9ee6c5",
  butter: "#ffe08a",
  ink: "#2d3047",
  accent: "#ff5d8f",
  white: "#ffffff",
  sea: "#c9d0ff",
  pale: "#dfe3ff",
  road: "#d6dbf2",
};

// ── Colour ───────────────────────────────────────────────────────────────────────────────────────────────────────
const cache = new Map();
export function rgb(hex) {
  if (cache.has(hex)) return cache.get(hex);
  const n = Number.parseInt(hex.slice(1), 16);
  const v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  cache.set(hex, v);
  return v;
}
const toHex = (v) => `#${v.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("")}`;
export const mix = (a, b, t) => {
  const A = rgb(a), B = rgb(b);
  return toHex(A.map((c, i) => c + (B[i] - c) * t));
};
export const rgba = (hex, a) => {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};
function hsl(hex) {
  const [r, g, b] = rgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function fromHsl([h, s, l]) {
  const f = (n) => {
    const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return toHex([f(0), f(8), f(4)]);
}
// The three faces of a block of this colour, lit from the upper left, as the template's golden stills shade them:
// the top a step lighter, the left face the colour itself, the right face a step darker and a little richer.
const shades = new Map();
export function shade(hex) {
  if (shades.has(hex)) return shades.get(hex);
  const [h, s, l] = hsl(hex);
  const out = {
    top: mix(hex, "#ffffff", 0.24),
    left: hex,
    right: fromHsl([h, Math.min(1, s * 1.04 + 0.04), Math.max(0, l - 0.085)]),
    edge: mix(hex, "#ffffff", 0.55),
    deep: fromHsl([h, Math.min(1, s + 0.06), Math.max(0, l - 0.17)]),
  };
  shades.set(hex, out);
  return out;
}

// The slabs: a white top, sides a step and two steps into periwinkle (the golden stills' slab).
export const SLAB = { top: "#fbfcff", left: "#e7eafc", right: "#cfd5f7", edge: "#ffffff", deep: "#bcc4f2" };

// ── The camera ───────────────────────────────────────────────────────────────────────────────────────────────────
// A diorama's place on the board (its origin and units) and the camera over it: zoom k about the board point
// (fx, fy), which is shown at the frame's (sx, sy). The identity camera shows the board as drawn.
export class View {
  constructor(ox, oy, U, cam) {
    this.ox = ox;
    this.oy = oy;
    this.U = U;
    this.cam = cam ?? { k: 1, fx: 960, fy: 540, sx: 960, sy: 540 };
    this.alpha = 1;
  }
  s(bx, by) {
    const c = this.cam;
    return [(bx - c.fx) * c.k + c.sx, (by - c.fy) * c.k + c.sy];
  }
  // A ground point (x, y) at height z: where the board drew it, then through the camera.
  b(x, y, z = 0) {
    return [this.ox + (x - y) * C * this.U, this.oy + (x + y) * 0.5 * this.U - z * this.U];
  }
  p(x, y, z = 0) {
    const [bx, by] = this.b(x, y, z);
    return this.s(bx, by);
  }
  get k() {
    return this.cam.k;
  }
  get u() {
    return this.U * this.cam.k;
  }
  // Another origin on the same board and the same camera (an island of a district).
  at(ox, oy, U = this.U) {
    const v = new View(ox, oy, U, this.cam);
    v.alpha = this.alpha;
    return v;
  }
  // A smaller world set into this one: (x, y, z) of the child is (cx + x * f, cy + y * f, cz + z * f) here.
  nest(cx, cy, cz, f) {
    const [bx, by] = this.b(cx, cy, cz);
    const v = new View(bx, by, this.U * f, this.cam);
    v.alpha = this.alpha;
    return v;
  }
}

// ── Drawing ──────────────────────────────────────────────────────────────────────────────────────────────────────
export function painter(g) {
  const P = { g };
  const path = (pts) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
  };
  // A polygon with rounded corners (radius r, clipped to a third of each edge).
  const roundPath = (pts, r) => {
    g.beginPath();
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[(i + n - 1) % n], b = pts[i], c = pts[(i + 1) % n];
      const la = Math.hypot(a[0] - b[0], a[1] - b[1]), lc = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const rr = Math.max(0, Math.min(r, la / 3, lc / 3));
      const p0 = [b[0] + ((a[0] - b[0]) * rr) / (la || 1), b[1] + ((a[1] - b[1]) * rr) / (la || 1)];
      const p1 = [b[0] + ((c[0] - b[0]) * rr) / (lc || 1), b[1] + ((c[1] - b[1]) * rr) / (lc || 1)];
      if (i === 0) g.moveTo(...p0);
      else g.lineTo(...p0);
      g.quadraticCurveTo(b[0], b[1], ...p1);
    }
    g.closePath();
  };
  P.path = path;
  P.roundPath = roundPath;

  // A soft shadow on the ground under something: an iso ellipse (the footprint's shape), dark in the middle.
  P.softShadow = (V, cx, cy, z, rx, alpha, colour = PAL.ink, spread = 1) => {
    if (alpha <= 0.002) return;
    const [x, y] = V.p(cx, cy, z);
    const R = rx * V.u * C * spread;
    if (R < 1) return;
    g.save();
    g.translate(x, y);
    g.scale(1, 0.58);
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, R);
    grad.addColorStop(0, rgba(colour, alpha * V.alpha));
    grad.addColorStop(0.55, rgba(colour, alpha * 0.45 * V.alpha));
    grad.addColorStop(1, rgba(colour, 0));
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, R, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };

  // A matte block with rounded edges. o: { alpha, lit (0..1: the top glows a step brighter), r (corner radius in
  // units), contact (the soft shadow where it meets the ground, 0 for none), faces: draw details on its faces }.
  P.block = (V, x, y, z, w, d, h, colour, o = {}) => {
    if (h <= 0.0005 || w <= 0 || d <= 0) return;
    const a = (o.alpha ?? 1) * V.alpha;
    if (a <= 0.002) return;
    const sh = o.shades ?? shade(colour);
    const x1 = x + w, y1 = y + d, z1 = z + h;
    const A = V.p(x, y, z1), B = V.p(x1, y, z1), Cc = V.p(x1, y1, z1), D = V.p(x, y1, z1);
    const Br = V.p(x1, y, z), Cb = V.p(x1, y1, z), Db = V.p(x, y1, z);
    if (o.contact !== 0 && z <= 0.02 && !o.noShadow) {
      P.softShadow(V, x + w / 2 + 0.12 * Math.min(w, d), y + d / 2 + 0.06 * Math.min(w, d), z, Math.hypot(w, d) * 0.62, 0.16 * (o.contact ?? 1) * (o.alpha ?? 1));
    }
    g.save();
    g.globalAlpha = a;
    const r = Math.min(9 * V.k, (o.r ?? 0.07) * V.u);
    roundPath([A, B, Br, Cb, Db, D], r);
    g.clip();
    // The left face (facing the lower left): the colour, a touch lighter at its top.
    let grad = g.createLinearGradient(D[0], D[1], Db[0], Db[1]);
    grad.addColorStop(0, mix(sh.left, "#ffffff", 0.06));
    grad.addColorStop(1, mix(sh.left, sh.right, 0.18));
    g.fillStyle = grad;
    path([Db, Cb, Cc, D]);
    g.fill();
    // The right face (facing the lower right): a step darker.
    grad = g.createLinearGradient(B[0], B[1], Br[0], Br[1]);
    grad.addColorStop(0, mix(sh.right, sh.left, 0.12));
    grad.addColorStop(1, mix(sh.right, sh.deep, 0.22));
    g.fillStyle = grad;
    path([Cb, Br, B, Cc]);
    g.fill();
    // The top: the lightest, a little brighter at the back corner, brighter still when lit.
    const top = o.lit ? mix(sh.top, "#ffffff", 0.45 * o.lit) : sh.top;
    grad = g.createLinearGradient(A[0], A[1], Cc[0], Cc[1]);
    grad.addColorStop(0, mix(top, "#ffffff", 0.12));
    grad.addColorStop(1, top);
    g.fillStyle = grad;
    path([A, B, Cc, D]);
    g.fill();
    if (o.faces) o.faces({ A, B, Cc, D, Br, Cb, Db, sh, x, y, z, w, d, h, x1, y1, z1 });
    // The rounded edges catch the light: a soft highlight along the top's two front edges and the front corner.
    const ew = Math.max(1, Math.min(3.2, 0.022 * V.u));
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = rgba(sh.edge, 0.85);
    g.lineWidth = ew;
    g.beginPath();
    g.moveTo(...D);
    g.lineTo(...Cc);
    g.lineTo(...B);
    g.stroke();
    g.strokeStyle = rgba(mix(sh.left, "#ffffff", 0.3), 0.55);
    g.lineWidth = ew * 0.8;
    g.beginPath();
    g.moveTo(...Cc);
    g.lineTo(...Cb);
    g.stroke();
    g.restore();
  };

  // A slab: the floating white ground of a diorama, over its own soft periwinkle shadow.
  P.slab = (V, x, y, w, d, t = 0.4, o = {}) => {
    const a = o.alpha ?? 1;
    if (a * V.alpha <= 0.002) return;
    if (o.shadow !== false) {
      const drop = o.drop ?? Math.max(1.6, Math.min(w, d) * 0.34);
      P.softShadow(V, x + w / 2 + 0.4, y + d / 2 + 0.4, -t - drop, Math.hypot(w, d) * 0.58, 0.34 * a * (o.shadow ?? 1), "#8f9cf0", 1);
    }
    P.block(V, x, y, -t, w, d, t, o.colour ?? "#f7f8ff", { alpha: a, contact: 0, r: o.r ?? 0.12, faces: o.faces, shades: o.colour ? undefined : SLAB });
  };

  // A flat shape lying on the ground (or any plane): points in (x, y, z).
  P.poly = (V, pts, fill, alpha = 1) => {
    if (alpha * V.alpha <= 0.002) return;
    g.save();
    g.globalAlpha = alpha * V.alpha;
    g.fillStyle = fill;
    path(pts.map((q) => V.p(...q)));
    g.fill();
    g.restore();
  };
  P.line = (V, pts, colour, width, o = {}) => {
    const a = (o.alpha ?? 1) * V.alpha;
    if (a <= 0.002) return;
    g.save();
    g.globalAlpha = a;
    g.strokeStyle = colour;
    g.lineWidth = width * (o.screen ? 1 : V.k);
    g.lineCap = o.cap ?? "round";
    g.lineJoin = "round";
    if (o.dash) {
      g.setLineDash(o.dash.map((v) => v * V.k));
      g.lineDashOffset = (o.offset ?? 0) * V.k;
    }
    g.beginPath();
    pts.forEach((q, i) => {
      const [X, Y] = q.length === 2 && o.screenPts ? q : V.p(...q);
      i ? g.lineTo(X, Y) : g.moveTo(X, Y);
    });
    g.stroke();
    g.restore();
  };

  // A road on the ground from (x0, y0) to (x1, y1): a soft lavender strip with a dashed white centre line.
  P.road = (V, x0, y0, x1, y1, wid = 0.46, o = {}) => {
    const a = o.alpha ?? 1;
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = (-(y1 - y0) / len) * wid * 0.5, ny = ((x1 - x0) / len) * wid * 0.5;
    const z = o.z ?? 0.004;
    const f = o.upto ?? 1;
    const ex = x0 + (x1 - x0) * f, ey = y0 + (y1 - y0) * f;
    P.poly(V, [[x0 + nx, y0 + ny, z], [ex + nx, ey + ny, z], [ex - nx, ey - ny, z], [x0 - nx, y0 - ny, z]], o.colour ?? PAL.road, a);
    if (o.dashes !== false) P.line(V, [[x0, y0, z], [ex, ey, z]], "#ffffff", Math.max(1.5, 0.05 * V.U), { alpha: a * 0.9, dash: [0.16 * V.U, 0.16 * V.U] });
  };

  // ── Type ───────────────────────────────────────────────────────────────────────────────────────────────────────
  P.font = (size, weight = 700, family = "Manrope") => `${weight} ${size}px ${family}`;
  P.textWidth = (text, size, weight = 700) => {
    g.font = P.font(size, weight);
    return g.measureText(text).width;
  };
  // A white pill with a thin line down to the part it names (screen coordinates; sizes already in screen pixels).
  // lift > 0: the pill floats above the anchor; lift < 0: it hangs below.
  P.pill = (ax, ay, text, o = {}) => {
    const k = o.k ?? 1;
    const size = (o.size ?? 34) * k;
    const pop = o.pop ?? 1;
    const a = o.alpha ?? 1;
    if (a <= 0.002 || pop <= 0.001) return null;
    const lift = (o.lift ?? 60) * k;
    const weight = o.weight ?? 700;
    g.save();
    g.font = P.font(size, weight);
    const tw = o.width ? o.width * k : g.measureText(text).width;
    const w = tw + size * 1.15, h = size * 1.62;
    const cx = ax + (o.dx ?? 0) * k;
    const cy = lift >= 0 ? ay - lift - h / 2 : ay - lift + h / 2;
    g.globalAlpha = a;
    // The line from the part to the pill, drawn first so the pill sits over its end.
    if (o.line !== false && Math.abs(lift) > 1) {
      const end = lift >= 0 ? cy + h / 2 : cy - h / 2;
      const grow = o.lineGrow ?? 1;
      g.strokeStyle = o.lineColour ?? PAL.ink;
      g.lineWidth = Math.max(1.5, 2.6 * k);
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(ax + (cx - ax) * 0, ay + (end - ay) * grow);
      g.stroke();
      g.fillStyle = o.lineColour ?? PAL.ink;
      g.beginPath();
      g.arc(ax, ay, Math.max(2, 4.2 * k), 0, Math.PI * 2);
      g.fill();
    }
    g.translate(cx, cy);
    g.scale(pop, pop);
    g.shadowColor = "rgba(45,48,71,0.16)";
    g.shadowBlur = 18 * k;
    g.shadowOffsetY = 7 * k;
    g.fillStyle = o.fill ?? "#ffffff";
    g.beginPath();
    g.roundRect(-w / 2, -h / 2, w, h, h / 2);
    g.fill();
    g.shadowColor = "transparent";
    g.fillStyle = o.colour ?? PAL.ink;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 0, size * 0.04);
    if (o.caret) {
      // A text cursor after the last letter.
      const cx2 = tw / 2 + size * 0.12;
      g.fillStyle = PAL.ink;
      g.fillRect(cx2, -size * 0.55, Math.max(2, size * 0.07), size * 1.1);
    }
    g.restore();
    return { cx, cy, w, h };
  };
  // A tag on a part of a diorama: the anchor is (x, y, z) in the diorama; sizes are the board's, scaled by the camera.
  P.tag = (V, x, y, z, text, o = {}) => {
    const [ax, ay] = V.p(x, y, z);
    return P.pill(ax, ay, text, { ...o, k: (o.k ?? 1) * V.k, alpha: (o.alpha ?? 1) * V.alpha });
  };

  // A white card floating in the air (an answer, a contact, a packet's label): board coordinates, through the camera.
  // rows: [{ text, colour, size, weight, typed (letters shown), under (0..1: the accent line under the row) }]
  P.card = (V, bx, by, w, rows, o = {}) => {
    const a = (o.alpha ?? 1) * V.alpha;
    const pop = o.pop ?? 1;
    if (a <= 0.002 || pop <= 0.001) return null;
    const k = V.k * (o.scale ?? 1);
    const rowH = o.row ?? 84;
    const h = rowH * rows.length + 24;
    const [X, Y] = V.s(bx, by);
    g.save();
    g.globalAlpha = a;
    // Pop from its own centre (or the point it rises from).
    const ox = X + (w * k) / 2, oy = Y + (h * k) / 2;
    g.translate(ox, oy);
    g.scale(pop * (o.sx ?? 1), pop * (o.sy ?? 1));
    g.translate(-ox, -oy);
    g.shadowColor = "rgba(45,48,71,0.18)";
    g.shadowBlur = 28 * k;
    g.shadowOffsetY = 12 * k;
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.roundRect(X, Y, w * k, h * k, 26 * k);
    g.fill();
    g.shadowColor = "transparent";
    rows.forEach((row, i) => {
      const yy = Y + (12 + rowH * i) * k;
      if (i > 0 && o.rules !== false) {
        g.strokeStyle = "rgba(45,48,71,0.12)";
        g.lineWidth = 2 * k;
        g.setLineDash([8 * k, 8 * k]);
        g.beginPath();
        g.moveTo(X + 34 * k, yy);
        g.lineTo(X + (w - 34) * k, yy);
        g.stroke();
        g.setLineDash([]);
      }
      if (row.tint) {
        g.fillStyle = rgba(row.tintColour ?? PAL.accent, 0.12 * row.tint);
        g.beginPath();
        g.roundRect(X + 16 * k, yy + 6 * k, (w - 32) * k, (rowH - 12) * k, 16 * k);
        g.fill();
      }
      const size = (row.size ?? 44) * k;
      g.font = P.font(size, row.weight ?? 700);
      g.textAlign = "left";
      g.textBaseline = "middle";
      // A row is one or more runs of text, each in its own colour ("to: " in ink, the number in the accent).
      const parts = row.parts ?? [{ text: row.text, colour: row.colour }];
      const full = parts.map((p) => p.text).join("");
      const total = g.measureText(full).width;
      let tx = row.align === "center" ? X + (w * k) / 2 - total / 2 : X + (o.pad ?? 40) * k;
      let left = row.typed != null ? row.typed : full.length;
      const ty = yy + (rowH * k) / 2 + size * 0.04;
      const spans = [];
      for (const part of parts) {
        const shown = part.text.slice(0, Math.max(0, left));
        left -= part.text.length;
        const pw = g.measureText(part.text).width;
        spans.push([tx, pw]);
        g.fillStyle = part.colour ?? row.colour ?? PAL.ink;
        if (shown) g.fillText(shown, tx, ty);
        tx += pw;
      }
      if (row.under > 0) {
        // The accent line under the row, or under one run of it (the number).
        const [ux, uw] = row.underPart != null ? spans[row.underPart] : [spans[0][0], total];
        g.strokeStyle = PAL.accent;
        g.lineCap = "round";
        g.lineWidth = 7 * k;
        g.beginPath();
        g.moveTo(ux, yy + rowH * k - 10 * k);
        g.lineTo(ux + uw * Math.min(1, row.under), yy + rowH * k - 10 * k);
        g.stroke();
      }
    });
    g.restore();
    return { X, Y, w: w * k, h: h * k };
  };
  // Lettering on the board (screen-aligned), through the camera.
  P.text = (V, bx, by, text, o = {}) => {
    const a = (o.alpha ?? 1) * V.alpha;
    if (a <= 0.002) return;
    const [X, Y] = V.s(bx, by);
    const size = (o.size ?? 44) * V.k * (o.scale ?? 1);
    g.save();
    g.globalAlpha = a;
    g.font = P.font(size, o.weight ?? 700);
    g.fillStyle = o.colour ?? PAL.ink;
    g.textAlign = o.align ?? "center";
    g.textBaseline = o.base ?? "alphabetic";
    g.fillText(text, X, Y);
    g.restore();
  };
  // Lettering lying in a plane of the world, foreshortened as the plane is: "left" (a front-left face, y constant,
  // reading along x), "right" (a front-right face, x constant, reading along -y) or "ground" (z constant, reading
  // along x). at = (x, y, z) of the text's anchor (o.align: left, center or right on the baseline); size in units.
  P.faceText = (V, plane, at, text, o = {}) => {
    const a = (o.alpha ?? 1) * V.alpha;
    if (a <= 0.002 || !text) return 0;
    const F = 100, u = V.u, size = o.size ?? 0.5;
    const [ox, oy] = V.p(...at);
    const U = plane === "right" ? [C * u, -0.5 * u] : [C * u, 0.5 * u];
    const D = plane === "ground" ? [-C * u, 0.5 * u] : [0, u];
    g.save();
    g.globalAlpha = a;
    g.setTransform((U[0] * size) / F, (U[1] * size) / F, (D[0] * size) / F, (D[1] * size) / F, ox, oy);
    g.font = P.font(F, o.weight ?? 800);
    g.fillStyle = o.colour ?? PAL.ink;
    g.textAlign = o.align ?? "left";
    g.textBaseline = o.base ?? "alphabetic";
    g.fillText(text, 0, 0);
    const w = (g.measureText(text).width * size) / F;
    g.restore();
    return w; // in units
  };
  P.faceTextWidth = (text, size, weight = 800) => {
    g.font = P.font(100, weight);
    return (g.measureText(text).width * size) / 100;
  };
  // A thin ink line in screen space (a leader from a card to a part).
  P.leader = (a, b, o = {}) => {
    const al = o.alpha ?? 1;
    if (al <= 0.002) return;
    g.save();
    g.globalAlpha = al;
    g.strokeStyle = o.colour ?? PAL.ink;
    g.lineWidth = o.width ?? 2.6;
    g.lineCap = "round";
    if (o.dash) g.setLineDash(o.dash);
    const f = o.grow ?? 1;
    g.beginPath();
    g.moveTo(...a);
    g.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
    g.stroke();
    if (o.dot !== false && f >= 0.999) {
      g.fillStyle = o.colour ?? PAL.ink;
      g.beginPath();
      g.arc(b[0], b[1], o.dotR ?? 4.2, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  };
  return P;
}

// ── Easing: every value is a function of the film's time ─────────────────────────────────────────────────────────
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const ramp = (t, a, b) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const lerp = (a, b, f) => a + (b - a) * f;
export const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
export const out3 = (x) => 1 - (1 - x) ** 3;
export const in3 = (x) => x * x * x;
export const outExpo = (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x));
export const back = (x, s = 1.7) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2);
// A thing that pops up with a slight overshoot, starting at t0, settling in d seconds.
export const pop = (t, t0, d = 0.42, s = 1.9) => back(ramp(t, t0, t0 + d), s);
export const rise = (t, t0, d = 0.5) => back(ramp(t, t0, t0 + d), 1.4);
