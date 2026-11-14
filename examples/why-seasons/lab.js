// Every diagram of this film that is not the globe itself, drawn on two 2D canvases from plain state:
// "space" (under the globe: the orbit, the Sun, the rays of sunlight, the lines that measure the tilt) and
// "ground" (the beam landing on the ground at 40 N, and the Sun's path across the sky).
// Nothing here keeps time: draw(t, view) reads the state the timeline tweens and draws that frame.
// Every length that stands for a number is computed from that number, here, once.
const TAU = Math.PI * 2;
const rad = (deg) => (deg * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => {
  const c = clamp(x);
  return c * c * (3 - 2 * c);
};

// ── The numbers the pictures are made from (storyboard.json, facts f1 to f8) ─
export const TILT = 23.44;
export const LAT = 40;
export const HIGH = 90 - LAT + TILT; // 73.44: the noon Sun at 40 N on the June solstice
export const LOW = 90 - LAT - TILT; // 26.56: the same on the December solstice
// The orbit, a circle seen at an angle: centre, half-width, half-height on screen.
export const CX = 960;
export const CY = 455;
export const A = 640;
export const B = 250;
export const VIEW = deg(Math.asin(B / A)); // the camera's height above the orbit's plane
export const LEAN = deg(Math.atan(Math.tan(rad(TILT)) / Math.cos(rad(VIEW)))); // the axis as it looks from there
export const ECC = 0.0167;
export const PERI = 13; // degrees past the December solstice at which the Earth is closest (about 3 January)
export const orb = (d) => ({ x: CX + A * Math.cos(rad(d)), y: CY - B * Math.sin(rad(d)) });
// The Sun sits off the middle of the orbit by its eccentricity, toward the January side.
export const SUN = { x: CX + ECC * A * Math.cos(rad(PERI)), y: CY - ECC * B * Math.sin(rad(PERI)) };
// The ground diagram: the ground's height on screen, where the patch starts, the beam's width.
export const GY = 740;
export const XL = 900;
export const BEAMW = 250;
export const foot = (alt) => BEAMW / Math.sin(rad(alt)); // the ground one beam covers
export const F_HIGH = foot(HIGH); // 260.8 px
export const F_LOW = foot(LOW); // 559.1 px
// The Sun's path at 40 N: time of day left to right, height above the horizon up.
export const hourX = (h) => 240 + 60 * h;
export const altY = (alt) => GY - 6.2 * alt;
export const sunAlt = (decl, hour) =>
  deg(Math.asin(Math.sin(rad(LAT)) * Math.sin(rad(decl)) + Math.cos(rad(LAT)) * Math.cos(rad(decl)) * Math.cos(rad(15 * (hour - 12)))));
// Daylight at 40 N on the longest and the shortest day (U.S. Naval Observatory): 15 h 02 min and 9 h 20 min.
export const DAY_JUN = 15 + 2 / 60;
export const DAY_DEC = 9 + 20 / 60;

const AMBER = [255, 180, 58];
const WARM = [255, 226, 160];
const COOL = [140, 196, 255];
const WHITE = [240, 240, 244];
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = ([r, g, b], a) => `rgba(${r | 0},${g | 0},${b | 0},${clamp(a).toFixed(3)})`;

export function createLab(spaceCanvas, groundCanvas) {
  const sp = spaceCanvas.getContext("2d");
  const gr = groundCanvas.getContext("2d");
  const W = spaceCanvas.width;
  const H = spaceCanvas.height;
  const L = {
    orbit: { a: 0, draw: 0 },
    sun: { a: 0, s: 1 },
    dist: { a: 0, p: 0, solid: 0, far: 0 },
    mark: { dec: 0, mar: 0, jun: 0, sep: 0, glow: 0 },
    rays: { a: 0, side: -1, p: 0, beam: 0, rest: 1 },
    tilt: { a: 0, plane: 0, up: 0, arc: 0 },
    ground: { a: 0, tiles: 0 },
    beam: { a: 0, alt: HIGH, land: 0, cool: 0, patch: 0, ghost: 0, arc: 0, label: 0, brace: 0, at: 520, same: 0 },
    tile: { one: 0, two: 0 },
    chart: { a: 0, jun: 0, dec: 0, sunJun: 0, sunDec: 0 },
  };

  const line = (ctx, x0, y0, x1, y1) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };
  const head = (ctx, x, y, angle, size) => {
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(angle - 0.42) * size, y - Math.sin(angle - 0.42) * size);
    ctx.lineTo(x, y);
    ctx.lineTo(x - Math.cos(angle + 0.42) * size, y - Math.sin(angle + 0.42) * size);
    ctx.stroke();
  };
  const glowDisc = (ctx, x, y, r, colour, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(colour, a));
    g.addColorStop(1, rgba(colour, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  };

  // ── Space ────────────────────────────────────────────────────────────────
  // view: ex, ey, er (the globe's centre and radius on screen, before any roll), eps (the axis's lean now),
  // roll (degrees the camera has rolled: the picture turns anticlockwise about the frame's centre).
  function drawSpace(t, view) {
    sp.clearRect(0, 0, W, H);
    sp.lineCap = "round";
    sp.lineJoin = "round";
    const { ex, ey, er } = view;

    // The orbit: brighter on the near side, so it reads as a circle lying flat.
    if (L.orbit.a > 0.003 && L.orbit.draw > 0) {
      const shade = sp.createLinearGradient(0, CY - B, 0, CY + B);
      shade.addColorStop(0, rgba(WHITE, 0.3 * L.orbit.a));
      shade.addColorStop(1, rgba(WHITE, 0.7 * L.orbit.a));
      for (const pass of [0, 1]) {
        sp.strokeStyle = pass ? shade : rgba(AMBER, L.orbit.a * 0.09);
        sp.lineWidth = pass ? 2.4 : 10;
        sp.beginPath();
        // The orbit's own angle runs anticlockwise on screen, which is a negative angle on a canvas.
        sp.ellipse(CX, CY, A, B, 0, 0, -TAU * clamp(L.orbit.draw), true);
        sp.stroke();
      }
    }

    // The far point of the orbit, in early July: a ghost Earth on a dashed line.
    const jul = orb(180 + PERI);
    if (L.dist.far > 0.003) {
      const a = L.dist.far * L.dist.a;
      const ux = (jul.x - SUN.x) / Math.hypot(jul.x - SUN.x, jul.y - SUN.y);
      const uy = (jul.y - SUN.y) / Math.hypot(jul.x - SUN.x, jul.y - SUN.y);
      const x0 = SUN.x + ux * 82;
      const y0 = SUN.y + uy * 82;
      const x1 = jul.x - ux * 40;
      const y1 = jul.y - uy * 40;
      sp.setLineDash([16, 12]);
      sp.strokeStyle = rgba(COOL, 0.85 * a);
      sp.lineWidth = 3.5;
      line(sp, x0, y0, lerp(x0, x1, smooth(L.dist.far * 1.4)), lerp(y0, y1, smooth(L.dist.far * 1.4)));
      sp.setLineDash([6, 7]);
      sp.strokeStyle = rgba(WHITE, 0.8 * a);
      sp.lineWidth = 2.5;
      sp.beginPath();
      sp.arc(jul.x, jul.y, 30 * smooth(L.dist.far * 1.6), 0, TAU);
      sp.stroke();
      sp.setLineDash([]);
    }

    // The four places the Earth leaves a mark: a small disc, lit on the Sun's side, and the axis through it.
    const marks = [
      ["dec", orb(0)],
      ["mar", orb(90)],
      ["jun", orb(180)],
      ["sep", orb(270)],
    ];
    for (const [name, p] of marks) {
      const m = L.mark[name];
      if (m < 0.003) continue;
      const r = 22 * m;
      const toSun = Math.atan2(SUN.y - p.y, SUN.x - p.x);
      sp.fillStyle = rgba([20, 22, 28], Math.min(1, m));
      sp.beginPath();
      sp.arc(p.x, p.y, r, 0, TAU);
      sp.fill();
      sp.fillStyle = rgba(WARM, 0.9 * Math.min(1, m));
      sp.beginPath();
      sp.arc(p.x, p.y, r, toSun - Math.PI / 2, toSun + Math.PI / 2);
      sp.fill();
      sp.strokeStyle = rgba(WHITE, 0.75 * Math.min(1, m));
      sp.lineWidth = 2;
      sp.beginPath();
      sp.arc(p.x, p.y, r, 0, TAU);
      sp.stroke();
      const dx = Math.sin(rad(LEAN)) * 58 * m;
      const dy = Math.cos(rad(LEAN)) * 58 * m;
      sp.shadowColor = rgba(AMBER, 0.9);
      sp.shadowBlur = 8 + 22 * L.mark.glow;
      sp.strokeStyle = rgba(mix(AMBER, [255, 236, 190], L.mark.glow), Math.min(1, m));
      sp.lineWidth = 4 + 2 * L.mark.glow;
      line(sp, p.x - dx, p.y + dy, p.x + dx, p.y - dy);
      sp.shadowBlur = 0;
    }

    // The Sun.
    if (L.sun.a > 0.003) {
      const r = 62 * L.sun.s * (1 + 0.014 * Math.sin(t * 2.3));
      glowDisc(sp, SUN.x, SUN.y, r * 4.6, AMBER, 0.2 * L.sun.a);
      glowDisc(sp, SUN.x, SUN.y, r * 2.1, [255, 200, 110], 0.42 * L.sun.a);
      const g = sp.createRadialGradient(SUN.x - r * 0.18, SUN.y - r * 0.2, 0, SUN.x, SUN.y, r);
      g.addColorStop(0, rgba([255, 253, 240], L.sun.a));
      g.addColorStop(0.55, rgba([255, 232, 160], L.sun.a));
      g.addColorStop(1, rgba([255, 172, 48], L.sun.a));
      sp.fillStyle = g;
      sp.beginPath();
      sp.arc(SUN.x, SUN.y, r, 0, TAU);
      sp.fill();
    }

    // The line from the Sun to the Earth: dashed while it is only a guess, solid once it carries a measurement.
    if (L.dist.a > 0.003 && L.dist.p > 0) {
      const d = Math.hypot(ex - SUN.x, ey - SUN.y);
      const ux = (ex - SUN.x) / d;
      const uy = (ey - SUN.y) / d;
      const x0 = SUN.x + ux * 82;
      const y0 = SUN.y + uy * 82;
      const x1 = lerp(x0, ex - ux * (er + 14), smooth(L.dist.p));
      const y1 = lerp(y0, ey - uy * (er + 14), smooth(L.dist.p));
      if (L.dist.solid < 0.999) {
        sp.setLineDash([16, 12]);
        sp.lineDashOffset = -t * 26;
        sp.strokeStyle = rgba(AMBER, 0.9 * L.dist.a * (1 - L.dist.solid));
        sp.lineWidth = 3.5;
        line(sp, x0, y0, x1, y1);
        sp.setLineDash([]);
      }
      if (L.dist.solid > 0.003) {
        sp.shadowColor = rgba(AMBER, 0.9);
        sp.shadowBlur = 14;
        sp.strokeStyle = rgba(AMBER, L.dist.a * L.dist.solid);
        sp.lineWidth = 5;
        line(sp, x0, y0, lerp(x0, x1, smooth(L.dist.solid)), lerp(y0, y1, smooth(L.dist.solid)));
        sp.shadowBlur = 0;
        // End marks, across the line.
        sp.lineWidth = 3.5;
        line(sp, x0 - uy * 13, y0 + ux * 13, x0 + uy * 13, y0 - ux * 13);
        if (L.dist.solid > 0.98) line(sp, x1 - uy * 13, y1 + ux * 13, x1 + uy * 13, y1 - ux * 13);
      }
    }

    // The lines that measure the tilt: the orbit's plane, the upright through the globe, the arc to the axis.
    if (L.tilt.a > 0.003) {
      const a = L.tilt.a;
      if (L.tilt.plane > 0) {
        // It runs further to the left than to the right, where the number stands.
        const k = smooth(L.tilt.plane);
        const g = sp.createLinearGradient(ex - 600, 0, ex + 450, 0);
        g.addColorStop(0, rgba(WHITE, 0));
        g.addColorStop(0.2, rgba(WHITE, 0.55 * a));
        g.addColorStop(0.82, rgba(WHITE, 0.55 * a));
        g.addColorStop(1, rgba(WHITE, 0));
        sp.strokeStyle = g;
        sp.lineWidth = 2.5;
        line(sp, ex - 600 * k, ey, ex + 450 * k, ey);
      }
      if (L.tilt.up > 0) {
        const half = er * 1.45 * smooth(L.tilt.up);
        sp.setLineDash([14, 12]);
        sp.strokeStyle = rgba(WHITE, 0.8 * a);
        sp.lineWidth = 3;
        line(sp, ex, ey + half, ex, ey - half);
        sp.setLineDash([]);
      }
      if (L.tilt.arc > 0 && view.eps > 0.05) {
        const r = er * 1.24;
        sp.shadowColor = rgba(AMBER, 0.9);
        sp.shadowBlur = 16;
        sp.strokeStyle = rgba(AMBER, a * L.tilt.arc);
        sp.lineWidth = 6;
        sp.beginPath();
        sp.arc(ex, ey, r, -Math.PI / 2, -Math.PI / 2 + rad(view.eps));
        sp.stroke();
        sp.shadowBlur = 0;
      }
    }

    // Sunlight arriving at the globe as parallel rays, from the left (side -1) or the right (side 1). Their spacing
    // is a share of the globe's size, so they zoom with it. The six rays around noon at 40 N are "one beam": they
    // are the same six that land on the ground in the next shot (the beam is 250 px wide when the globe is 3000).
    if (L.rays.a > 0.003) {
      sp.save();
      sp.translate(W / 2, H / 2);
      sp.rotate(-rad(view.roll ?? 0));
      sp.translate(-W / 2, -H / 2);
      const side = L.rays.side;
      const dotY = -Math.sin(rad(LAT - TILT)) * er;
      const rays = [];
      for (let j = -4; j <= 4; j++) rays.push({ dy: j * 0.2 * er + 0.06 * er, k: L.rays.rest, beam: false });
      for (let k = 0; k < 6; k++) rays.push({ dy: dotY + (k - 2.5) * (BEAMW / 5 / 1500) * er, k: L.rays.beam, beam: true });
      rays.forEach((ray, i) => {
        if (ray.k < 0.003 || Math.abs(ray.dy) > er * 0.97) return;
        const edge = ex + side * Math.sqrt(er * er - ray.dy * ray.dy);
        const gap = ray.beam ? 2 : 16;
        const p = smooth(L.rays.p * 1.5 - (ray.beam ? 0.5 : (i % 4) * 0.1));
        if (p <= 0) return;
        const xEnd = lerp(side < 0 ? 0 : W, edge + side * gap, p);
        const y = ey + ray.dy;
        const a = L.rays.a * ray.k;
        const far = xEnd + side * 1100;
        const grad = sp.createLinearGradient(far, 0, xEnd, 0);
        grad.addColorStop(0, rgba(AMBER, 0));
        grad.addColorStop(1, rgba(ray.beam ? [255, 214, 130] : AMBER, (ray.beam ? 0.95 : 0.62) * a));
        sp.strokeStyle = grad;
        sp.lineWidth = ray.beam ? 2.6 : 3;
        line(sp, far, y, xEnd, y);
        // Light running along the ray.
        sp.setLineDash([46, 190]);
        sp.lineDashOffset = side * (t * 420 + i * 37);
        sp.strokeStyle = rgba([255, 240, 200], (ray.beam ? 0.45 : 0.7) * a);
        sp.lineWidth = ray.beam ? 2.6 : 3.4;
        line(sp, far, y, xEnd, y);
        sp.setLineDash([]);
        if (!ray.beam) {
          sp.strokeStyle = rgba([255, 226, 160], 0.9 * a * p);
          sp.lineWidth = 3.4;
          head(sp, xEnd, y, side < 0 ? 0 : Math.PI, 15);
        }
      });
      sp.restore();
    }
  }

  // ── The ground at 40 N ───────────────────────────────────────────────────
  const beamColour = () => mix(AMBER, COOL, L.beam.cool);
  // One beam at a given height above the horizon: its six rays, the light it lays on the ground.
  function drawBeam(t, alt, alpha, { ghost = false, land = 1, patch = 1 } = {}) {
    const c = ghost ? AMBER : beamColour();
    const ux = Math.cos(rad(alt));
    const uy = -Math.sin(rad(alt));
    const f = foot(alt);
    const far = (x) => Math.min((GY + 60) / -uy, (W + 60 - x) / ux);
    if (!ghost) {
      // The body of the beam, faint, so its width reads as one thing.
      const fl = far(XL);
      const fr = far(XL + f);
      const g = gr.createLinearGradient(XL + f / 2 + ux * 900, GY + uy * 900, XL + f / 2, GY);
      g.addColorStop(0, rgba(c, 0.02 * alpha));
      g.addColorStop(1, rgba(c, 0.17 * alpha * land));
      gr.fillStyle = g;
      gr.beginPath();
      gr.moveTo(XL, GY);
      gr.lineTo(XL + ux * fl, GY + uy * fl);
      gr.lineTo(XL + f + ux * fr, GY + uy * fr);
      gr.lineTo(XL + f, GY);
      gr.closePath();
      gr.fill();
    }
    for (let k = 0; k < 6; k++) {
      const x = XL + (f * k) / 5;
      const len = far(x);
      const x0 = x + ux * len;
      const y0 = GY + uy * len;
      if (ghost) {
        if (k !== 0 && k !== 5) continue;
        gr.setLineDash([14, 14]);
        gr.strokeStyle = rgba(c, 0.6 * alpha);
        gr.lineWidth = 2.5;
        line(gr, x0, y0, x, GY);
        gr.setLineDash([]);
        continue;
      }
      const p = smooth(land * 1.6 - k * 0.11);
      if (p <= 0) continue;
      const x1 = lerp(x0, x, p);
      const y1 = lerp(y0, GY, p);
      gr.strokeStyle = rgba(c, 0.62 * alpha);
      gr.lineWidth = 3;
      line(gr, x0, y0, x1, y1);
      gr.setLineDash([34, 96]);
      gr.lineDashOffset = -(t * 380 + k * 41);
      gr.strokeStyle = rgba(mix(c, [255, 255, 255], 0.55), 0.85 * alpha);
      gr.lineWidth = 3.4;
      line(gr, x0, y0, x1, y1);
      gr.setLineDash([]);
      gr.strokeStyle = rgba(mix(c, [255, 255, 255], 0.4), alpha);
      gr.lineWidth = 3.4;
      head(gr, x1, y1, Math.atan2(GY - y0, x - x0), 15);
    }
    // The patch of ground the beam lights. Its brightness is the light on each square metre: in proportion to
    // sin(height), which is also 1 / its width.
    const bright = Math.sin(rad(alt));
    if (ghost) {
      gr.setLineDash([12, 10]);
      gr.strokeStyle = rgba(AMBER, 0.8 * alpha);
      gr.lineWidth = 3;
      gr.strokeRect(XL, GY - 7, f, 14);
      gr.setLineDash([]);
    } else if (patch > 0.003) {
      const a = alpha * patch;
      const up = gr.createLinearGradient(0, GY - 90, 0, GY);
      up.addColorStop(0, rgba(c, 0));
      up.addColorStop(1, rgba(c, 0.42 * bright * a));
      gr.fillStyle = up;
      gr.fillRect(XL, GY - 90, f, 90);
      gr.shadowColor = rgba(c, bright * a);
      gr.shadowBlur = 30 * bright;
      gr.fillStyle = rgba(mix(c, [255, 255, 255], 0.5 * bright), (0.18 + 0.82 * bright) * a);
      gr.fillRect(XL, GY - 6, f, 12);
      gr.shadowBlur = 0;
    }
  }

  // The Sun's path for one day: the points where it is above the horizon.
  const pathOf = (decl) => {
    const half = deg(Math.acos(-Math.tan(rad(LAT)) * Math.tan(rad(decl)))) / 15;
    const pts = [];
    const n = 120;
    for (let i = 0; i <= n; i++) {
      const hour = 12 - half + (2 * half * i) / n;
      pts.push({ x: hourX(hour), y: altY(Math.max(0, sunAlt(decl, hour))) });
    }
    return pts;
  };
  const PATHS = { jun: pathOf(TILT), dec: pathOf(-TILT) };

  function drawGround(t) {
    gr.clearRect(0, 0, W, H);
    gr.lineCap = "round";
    gr.lineJoin = "round";
    if (L.ground.a < 0.003) return;
    const ga = L.ground.a;

    // Behind the ground: the Sun's two paths across the sky.
    if (L.chart.a > 0.003) {
      for (const [name, colour, prog, sunA, r] of [
        ["jun", AMBER, L.chart.jun, L.chart.sunJun, 22],
        ["dec", COOL, L.chart.dec, L.chart.sunDec, 18],
      ]) {
        if (prog <= 0) continue;
        const pts = PATHS[name];
        const upto = Math.max(1, Math.round((pts.length - 1) * clamp(prog)));
        gr.beginPath();
        gr.moveTo(pts[0].x, GY);
        for (let i = 0; i <= upto; i++) gr.lineTo(pts[i].x, pts[i].y);
        gr.lineTo(pts[upto].x, GY);
        gr.closePath();
        const fill = gr.createLinearGradient(0, altY(HIGH), 0, GY);
        fill.addColorStop(0, rgba(colour, 0.2 * L.chart.a));
        fill.addColorStop(1, rgba(colour, 0.03 * L.chart.a));
        gr.fillStyle = fill;
        gr.fill();
        gr.beginPath();
        for (let i = 0; i <= upto; i++) gr[i ? "lineTo" : "moveTo"](pts[i].x, pts[i].y);
        gr.shadowColor = rgba(colour, 0.9);
        gr.shadowBlur = 16;
        gr.strokeStyle = rgba(mix(colour, [255, 255, 255], 0.25), L.chart.a);
        gr.lineWidth = 5;
        gr.stroke();
        gr.shadowBlur = 0;
        if (sunA > 0.003) {
          const p = pts[upto];
          glowDisc(gr, p.x, p.y, r * 3.4, colour, 0.5 * sunA * L.chart.a);
          const g = gr.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          g.addColorStop(0, rgba([255, 255, 255], sunA * L.chart.a));
          g.addColorStop(1, rgba(mix(colour, [255, 255, 255], 0.3), sunA * L.chart.a));
          gr.fillStyle = g;
          gr.beginPath();
          gr.arc(p.x, p.y, r, 0, TAU);
          gr.fill();
        }
      }
    }

    // The beams (the ghost of June first, under the live one).
    if (L.beam.ghost > 0.003) drawBeam(t, HIGH, L.beam.ghost * ga, { ghost: true });
    if (L.beam.a > 0.003) drawBeam(t, L.beam.alt, L.beam.a * ga, { land: L.beam.land, patch: L.beam.patch });

    // The ground: a slab with a lit top edge.
    const slab = gr.createLinearGradient(0, GY, 0, GY + 118);
    slab.addColorStop(0, rgba([62, 62, 70], 0.97 * ga));
    slab.addColorStop(0.12, rgba([34, 34, 39], 0.97 * ga));
    slab.addColorStop(0.78, rgba([17, 17, 20], 0.96 * ga));
    slab.addColorStop(1, rgba([12, 12, 14], 0));
    gr.fillStyle = slab;
    gr.fillRect(0, GY, W, 118);
    gr.strokeStyle = rgba(WHITE, 0.62 * ga);
    gr.lineWidth = 2;
    line(gr, 0, GY, W, GY);
    // Tiles the width of the June patch, so "how much ground" can be counted.
    if (L.ground.tiles > 0.003) {
      gr.strokeStyle = rgba(WHITE, 0.3 * ga * L.ground.tiles);
      gr.lineWidth = 2;
      for (let n = -4; n <= 4; n++) {
        const x = XL + n * F_HIGH;
        if (x > 8 && x < W - 8) line(gr, x, GY, x, GY + 20);
      }
    }
    // The patch again, over the slab's edge, so it sits on the ground.
    if (L.beam.a > 0.003 && L.beam.patch > 0.003) {
      const c = beamColour();
      const bright = Math.sin(rad(L.beam.alt));
      gr.fillStyle = rgba(mix(c, [255, 255, 255], 0.5 * bright), (0.18 + 0.82 * bright) * L.beam.a * L.beam.patch * ga);
      gr.fillRect(XL, GY - 5, foot(L.beam.alt), 10);
    }

    if (L.beam.a > 0.003) {
      const a = L.beam.a * ga;
      const alt = L.beam.alt;
      const f = foot(alt);
      const c = beamColour();
      // The Sun's height: the angle between the ground and the beam, at the patch's far end.
      if (L.beam.arc > 0.003) {
        const cx = XL + f;
        gr.strokeStyle = rgba(WHITE, 0.5 * a * L.beam.arc);
        gr.lineWidth = 2;
        line(gr, cx, GY, cx + 190 * smooth(L.beam.arc), GY);
        gr.strokeStyle = rgba(WHITE, 0.92 * a * L.beam.arc);
        gr.lineWidth = 3;
        gr.beginPath();
        gr.arc(cx, GY, 118, 0, -rad(alt) * smooth(L.beam.arc), true);
        gr.stroke();
        if (L.beam.label > 0.003) {
          const mid = rad(alt) / 2;
          gr.font = '600 46px "Sora Variable", sans-serif';
          gr.textAlign = "center";
          gr.textBaseline = "middle";
          gr.fillStyle = rgba(mix(c, [255, 255, 255], 0.35), a * L.beam.label);
          gr.fillText(`${Math.round(alt)}°`, cx + Math.cos(mid) * 190, GY - Math.sin(mid) * 190 + 2);
        }
      }
      // A measure across the beam, to say that its width is the same in both pictures.
      if (L.beam.brace > 0.003) {
        const ux = Math.cos(rad(alt));
        const uy = -Math.sin(rad(alt));
        const nx = Math.sin(rad(alt));
        const ny = Math.cos(rad(alt));
        const x0 = XL + ux * L.beam.at;
        const y0 = GY + uy * L.beam.at;
        const x1 = x0 + nx * BEAMW * smooth(L.beam.brace);
        const y1 = y0 + ny * BEAMW * smooth(L.beam.brace);
        gr.strokeStyle = rgba(WHITE, 0.9 * a * L.beam.brace);
        gr.lineWidth = 2.5;
        line(gr, x0, y0, x1, y1);
        line(gr, x0 - ux * 12, y0 - uy * 12, x0 + ux * 12, y0 + uy * 12);
        line(gr, x1 - ux * 12, y1 - uy * 12, x1 + ux * 12, y1 + uy * 12);
        gr.font = '600 30px "Inter Variable", sans-serif';
        gr.textBaseline = "middle";
        // The words sit up and to the left of the measure's upper end, clear of the beam at any height.
        gr.textAlign = "right";
        gr.fillStyle = rgba(WHITE, a * L.beam.brace * (1 - L.beam.same));
        gr.fillText("one beam", x0 - 18, y0 - 30);
        gr.fillStyle = rgba(WHITE, a * L.beam.brace * L.beam.same);
        gr.fillText("the same beam", x0 - 18, y0 - 30);
      }
    }

    // How much ground: measured in the slab, in June patches.
    const measure = (x0, x1, y, text, colour, a) => {
      if (a < 0.003) return;
      gr.strokeStyle = rgba(colour, 0.95 * a * ga);
      gr.lineWidth = 3;
      const w = gr.measureText(text).width;
      const mid = (x0 + x1) / 2;
      line(gr, x0, y - 11, x0, y + 11);
      line(gr, x1, y - 11, x1, y + 11);
      line(gr, x0, y, mid - w / 2 - 14, y);
      line(gr, mid + w / 2 + 14, y, x1, y);
      gr.fillStyle = rgba(colour, a * ga);
      gr.textAlign = "center";
      gr.textBaseline = "middle";
      gr.fillText(text, mid, y + 1);
    };
    gr.font = '600 32px "Sora Variable", sans-serif';
    measure(XL, XL + F_HIGH, GY + 40, "1×", [255, 200, 110], L.tile.one);
    measure(XL, XL + F_LOW, GY + 82, "2.1×", [156, 204, 255], L.tile.two);

    // The clock along the horizon, and each day's length as a bar from sunrise to sunset.
    if (L.chart.a > 0.003) {
      const a = L.chart.a * ga;
      gr.font = '500 25px "JetBrains Mono Variable", monospace';
      gr.textAlign = "center";
      gr.textBaseline = "middle";
      for (const [hour, text] of [
        [0, ""],
        [6, "6:00"],
        [12, "noon"],
        [18, "18:00"],
        [24, ""],
      ]) {
        gr.strokeStyle = rgba(WHITE, 0.55 * a);
        gr.lineWidth = 2;
        line(gr, hourX(hour), GY, hourX(hour), GY + 13);
        if (text) {
          gr.fillStyle = rgba([186, 186, 194], a);
          gr.fillText(text, hourX(hour), GY + 92);
        }
      }
      for (const [day, colour, prog, y] of [
        [DAY_JUN, [255, 190, 80], L.chart.jun, GY + 34],
        [DAY_DEC, [130, 190, 255], L.chart.dec, GY + 58],
      ]) {
        if (prog <= 0) continue;
        const x0 = hourX(12 - day / 2);
        const x1 = lerp(x0, hourX(12 + day / 2), clamp(prog));
        gr.shadowColor = rgba(colour, 0.9);
        gr.shadowBlur = 12;
        gr.strokeStyle = rgba(colour, a);
        gr.lineWidth = 11;
        line(gr, x0, y, Math.max(x0 + 0.5, x1), y);
        gr.shadowBlur = 0;
      }
    }
  }

  return {
    L,
    draw(t, view) {
      drawSpace(t, view);
      drawGround(t);
    },
  };
}
