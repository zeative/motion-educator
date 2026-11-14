// The light lab: every diagram of light in this film, drawn on one 2D canvas from plain state.
// Nothing here keeps time. draw(t) reads the state the timeline tweens and the film time, and draws that frame.
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => {
  const c = clamp(x);
  return c * c * (3 - 2 * c);
};
// A small seeded generator, so the same molecules are in the same places on every render.
const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

// The seven bands a prism shows, with the wavelength each stands for.
export const BANDS = [
  { nm: 700, colour: [255, 64, 52] },
  { nm: 620, colour: [255, 146, 20] },
  { nm: 580, colour: [255, 214, 30] },
  { nm: 530, colour: [60, 210, 100] },
  { nm: 450, colour: [70, 150, 255] },
  { nm: 425, colour: [98, 96, 230] },
  { nm: 400, colour: [168, 84, 255] },
];
const RED = 0;
const BLUE = 4;
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

export function createLab(canvas) {
  const ctx = canvas.getContext("2d");
  const L = {
    beam: { a: 0, x0: 0, x1: 0, y: 540, w: 90 },
    prism: { a: 0, x: 800, y: 540 },
    fan: { a: 0, open: 0, straight: 0, wave: 0, focus: 0, solo: 0 },
    marks: { red: 0, blue: 0, redNm: 0, blueNm: 0 },
    mol: { a: 0, push: 0, cluster: 0 },
    mag: { a: 0, s: 0 },
    ray: { a: 0, blue: 0, pass: 0, scatter: 0 },
    path: { a: 0, p: 0 },
    sky: { a: 0, p: 0 },
  };

  const rand = seeded(11);
  const molecules = Array.from({ length: 46 }, (_, i) => ({
    x: 120 + rand() * 1680,
    y: 150 + rand() * 660,
    z: 0.45 + rand() * 1.25,
    angle: rand() * TAU,
    spin: (rand() - 0.5) * 0.7,
    phase: rand() * TAU,
    oxygen: i % 5 === 4,
    // Where the first fourteen gather for the scattering experiment.
    cx: 760 + ((i * 7) % 5) * 100 + (rand() - 0.5) * 50,
    cy: 300 + Math.floor((i % 15) / 5) * 150 + (rand() - 0.5) * 60 + (i % 2) * 40,
  }));
  const CLUSTER = 14;
  const row = Array.from({ length: 17 }, (_, i) => ({ x: 190 + i * 96, y: 500 + (i % 2 ? 46 : -46) + (rand() - 0.5) * 16, angle: rand() * TAU }));
  const skyPoints = Array.from({ length: 9 }, (_, i) => ({ x: 170 + i * 198 + (rand() - 0.5) * 60, y: 150 + Math.abs(i - 4) * 46 + rand() * 60 }));

  // A line of light: three strokes, wide and faint to narrow and bright, read as a glow once the film blooms.
  const glowStroke = (colour, alpha, width) => {
    for (const [w, a] of [
      [width * 4.2, 0.1],
      [width * 2.1, 0.26],
      [width, 1],
    ]) {
      ctx.lineWidth = w;
      ctx.strokeStyle = rgba(colour, a * alpha);
      ctx.stroke();
    }
  };
  const molecule = (x, y, r, angle, oxygen, alpha, lit = 0) => {
    const dx = Math.cos(angle) * r * 0.78;
    const dy = Math.sin(angle) * r * 0.78;
    for (const side of [-1, 1]) {
      const cx = x + dx * side;
      const cy = y + dy * side;
      const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
      const base = oxygen ? [255, 140, 150] : [150, 185, 255];
      g.addColorStop(0, rgba([255, 255, 255], alpha));
      g.addColorStop(0.35, rgba(base, alpha));
      g.addColorStop(1, rgba(oxygen ? [110, 30, 46] : [30, 52, 120], alpha));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
    }
    if (lit > 0.01) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
      g.addColorStop(0, rgba([120, 180, 255], 0.5 * lit * alpha));
      g.addColorStop(1, rgba([120, 180, 255], 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 4, 0, TAU);
      ctx.fill();
    }
  };
  const arrow = (x0, y0, x1, y1, colour, alpha, width = 4) => {
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    glowStroke(colour, alpha, width);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - Math.cos(a - 0.5) * width * 3.4, y1 - Math.sin(a - 0.5) * width * 3.4);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - Math.cos(a + 0.5) * width * 3.4, y1 - Math.sin(a + 0.5) * width * 3.4);
    ctx.lineWidth = width;
    ctx.strokeStyle = rgba(colour, alpha);
    ctx.stroke();
  };
  // Where molecule i is at film time t: adrift in the air, or gathered for the experiment.
  const where = (m, i, t) => {
    const fx = m.x + Math.sin(t * 0.32 + m.phase) * 34 * m.z;
    const fy = m.y + Math.cos(t * 0.27 + m.phase * 1.7) * 24 * m.z;
    const push = 1 + L.mol.push * m.z * 0.5;
    const x = 960 + (fx - 960) * push;
    const y = 480 + (fy - 480) * push;
    if (i >= CLUSTER) return { x, y, r: 15 * m.z * push, a: (0.35 + 0.65 * (1 - Math.abs(m.z - 1))) * (1 - L.mol.cluster) };
    const k = smooth(L.mol.cluster);
    return { x: lerp(x, m.cx, k), y: lerp(y, m.cy, k), r: lerp(15 * m.z * push, 17, k), a: lerp(0.35 + 0.65 * (1 - Math.abs(m.z - 1)), 1, k) };
  };

  function draw(t) {
    ctx.clearRect(0, 0, 1920, 1080);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const travel = t * 86;

    // The white beam from the Sun, with light running along it.
    if (L.beam.a > 0.005 && L.beam.x1 > L.beam.x0) {
      const { x0, x1, y, w, a } = L.beam;
      const g = ctx.createLinearGradient(0, y - w, 0, y + w);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.32, `rgba(255,250,240,${0.16 * a})`);
      g.addColorStop(0.5, `rgba(255,255,255,${0.95 * a})`);
      g.addColorStop(0.68, `rgba(255,250,240,${0.16 * a})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x0, y - w, x1 - x0, w * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.75 * a})`;
      for (let i = 0; i < 26; i++) {
        const px = x0 + ((i * 131 + travel * (1.4 + (i % 5) * 0.25)) % Math.max(1, x1 - x0));
        const py = y + Math.sin(i * 2.4) * w * 0.26;
        ctx.fillRect(px, py, 14 + (i % 4) * 9, 2);
      }
    }

    // The prism: a glass wedge, bright along its edges.
    if (L.prism.a > 0.005) {
      const { x, y, a } = L.prism;
      ctx.beginPath();
      ctx.moveTo(x, y - 190);
      ctx.lineTo(x + 170, y + 150);
      ctx.lineTo(x - 170, y + 150);
      ctx.closePath();
      const g = ctx.createLinearGradient(x - 170, y - 190, x + 170, y + 150);
      g.addColorStop(0, `rgba(210,225,255,${0.3 * a})`);
      g.addColorStop(0.5, `rgba(120,140,180,${0.1 * a})`);
      g.addColorStop(1, `rgba(220,235,255,${0.24 * a})`);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * a})`;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 20, y - 130);
      ctx.lineTo(x - 120, y + 70);
      ctx.lineWidth = 9;
      ctx.strokeStyle = `rgba(255,255,255,${0.16 * a})`;
      ctx.stroke();
    }

    // The bands: a fan out of the prism, then straight lines, then waves, then only red and blue.
    if (L.fan.a > 0.005) {
      const { open, straight, wave, focus, solo } = L.fan;
      const s = smooth(straight);
      const f = smooth(focus);
      const so = smooth(solo);
      BANDS.forEach((band, i) => {
        const shown = clamp(open * BANDS.length - i);
        const keep = i === RED || i === BLUE;
        const alpha = L.fan.a * shown * (keep ? 1 : 1 - f) * (i === RED ? 1 - so : 1);
        if (alpha < 0.01) return;
        let yLine = 190 + i * 100;
        if (i === RED) yLine = lerp(yLine, 320, f);
        if (i === BLUE) yLine = lerp(lerp(yLine, 650, f), 400, so);
        const x0 = lerp(L.prism.x + 78, 150, s);
        const y0 = lerp(L.prism.y - 20 + i * 6, yLine, s);
        const x1 = lerp(1790, 1770, s);
        const y1 = lerp(280 + i * 84, yLine, s);
        const amp = wave * lerp(lerp(26, 84, f), 112, i === BLUE ? so : 0);
        const scale = lerp(lerp(0.42, 0.9, f), 1.38, i === BLUE ? so : 0);
        const lambda = band.nm * scale;
        const end = x0 + (x1 - x0) * shown;
        ctx.beginPath();
        for (let x = x0; x <= end; x += 6) {
          const u = (x - x0) / (x1 - x0);
          const y = lerp(y0, y1, u) + amp * Math.sin(((x - travel) / lambda) * TAU);
          if (x === x0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        glowStroke(band.colour, alpha, lerp(lerp(5, 7, f), 8, so));
      });

      // A bracket over one wavelength, riding the wave, with its length in nanometres.
      const mark = (i, yLine, amp, scale, show, value, below) => {
        if (show < 0.01) return;
        const lambda = BANDS[i].nm * scale;
        const k = Math.round((720 - travel) / lambda - 0.25);
        const xa = travel + lambda * (k + 0.25);
        const xb = xa + lambda * smooth(show);
        const y = yLine + (below ? amp + 46 : -amp - 46);
        ctx.beginPath();
        ctx.moveTo(xa, y - 14);
        ctx.lineTo(xa, y + 14);
        ctx.moveTo(xa, y);
        ctx.lineTo(xb, y);
        ctx.moveTo(xb, y - 14);
        ctx.lineTo(xb, y + 14);
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(237,237,240,${0.9 * show})`;
        ctx.stroke();
        ctx.font = '600 54px "Sora Variable", sans-serif';
        ctx.textAlign = "center";
        ctx.fillStyle = rgba(BANDS[i].colour, show);
        ctx.fillText(`${Math.round(value)} nm`, (xa + xa + lambda) / 2, below ? y + 70 : y - 28);
      };
      mark(RED, 320, 84, 0.9, L.marks.red * (1 - so), L.marks.redNm, false);
      mark(BLUE, lerp(650, 400, so), lerp(84, 112, so), lerp(0.9, 1.38, so), L.marks.blue, L.marks.blueNm, so < 0.5);
    }

    // Air: molecules adrift at different depths, or gathered into the cluster the rays pass through.
    if (L.mol.a > 0.005) {
      const head = L.ray.a > 0.01 ? 80 + L.ray.pass * 1760 : -1;
      molecules.forEach((m, i) => {
        const p = where(m, i, t);
        const alpha = L.mol.a * p.a;
        if (alpha < 0.01) return;
        const lit = i < CLUSTER && head > m.cx ? L.ray.scatter * L.mol.cluster : 0;
        molecule(p.x, p.y, p.r, m.angle + t * m.spin, m.oxygen, alpha, lit);
      });
    }

    // One ray through the cluster: what passes, and what each molecule throws out sideways.
    if (L.ray.a > 0.005) {
      const colour = L.ray.blue > 0.5 ? BANDS[BLUE].colour : BANDS[RED].colour;
      const lambda = L.ray.blue > 0.5 ? 190 : 300;
      const head = 80 + L.ray.pass * 1760;
      ctx.beginPath();
      for (let x = 80; x <= head; x += 5) {
        // Past the cluster the ray has lost what was scattered out of it.
        const lost = smooth((x - 760) / 460) * L.ray.scatter * 0.72;
        const y = 520 + 38 * (1 - lost) * Math.sin(((x - travel * 1.6) / lambda) * TAU);
        if (x === 80) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      glowStroke(colour, L.ray.a * (1 - 0.35 * L.ray.scatter * smooth((head - 900) / 500)), 7);
      const rays = L.ray.blue > 0.5 ? 10 : 3;
      molecules.slice(0, CLUSTER).forEach((m, i) => {
        if (head < m.cx) return;
        for (let k = 0; k < rays; k++) {
          const a = (k / rays) * TAU + i * 0.7;
          const pulse = (t * 0.85 + k * 0.37 + i * 0.21) % 1;
          const d0 = 26 + pulse * (60 + 150 * L.ray.scatter);
          const d1 = d0 + 20 + 46 * L.ray.scatter;
          const alpha = L.ray.a * L.ray.scatter * (1 - pulse) * (L.ray.blue > 0.5 ? 0.95 : 0.5);
          if (alpha > 0.02) arrow(m.cx + Math.cos(a) * d0, m.cy + Math.sin(a) * d0, m.cx + Math.cos(a) * d1, m.cy + Math.sin(a) * d1, colour, alpha, 3);
        }
      });
    }

    // The magnifier: the molecule a wave would never notice, made large enough to see.
    if (L.mag.a > 0.005) {
      const r = 150 * L.mag.s;
      const a = L.mag.a;
      ctx.beginPath();
      ctx.moveTo(960, 512);
      ctx.lineTo(960, 690 - r);
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(237,237,240,${0.7 * a})`;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(960, 512, 5, 0, TAU);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(960, 690, r, 0, TAU);
      const g = ctx.createRadialGradient(900, 620, 10, 960, 690, r);
      g.addColorStop(0, `rgba(60,70,90,${0.9 * a})`);
      g.addColorStop(1, `rgba(12,13,16,${0.95 * a})`);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = `rgba(255,255,255,${0.85 * a})`;
      ctx.stroke();
      if (r > 40) molecule(960, 690, r * 0.3, 0.5 + t * 0.4, false, a);
    }

    // The long road at dusk: the beam loses its blue to the air and arrives orange, then red.
    if (L.path.a > 0.005) {
      const head = 80 + L.path.p * 1760;
      const a = L.path.a;
      const g = ctx.createLinearGradient(80, 0, 1840, 0);
      for (const [stop, colour] of [
        [0, [255, 255, 255]],
        [0.3, [255, 244, 186]],
        [0.55, [255, 186, 84]],
        [0.8, [255, 112, 48]],
        [1, [255, 62, 36]],
      ]) g.addColorStop(stop, rgba(colour, a));
      for (const [w, alpha] of [
        [120, 0.07],
        [64, 0.2],
        [26, 1],
      ]) {
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(80, 500);
        ctx.lineTo(head, 500);
        ctx.lineWidth = w;
        ctx.strokeStyle = g;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      row.forEach((m, i) => {
        if (m.x > head + 60) return;
        molecule(m.x, m.y, 15, m.angle + t * 0.4, i % 5 === 4, a, m.x < head ? 0.6 : 0);
        if (m.x > head) return;
        // The further along, the less blue is left to throw out.
        const left = Math.exp(-3.2 * ((m.x - 80) / 1760));
        for (let k = 0; k < 3; k++) {
          const pulse = (t * 0.8 + k * 0.33 + i * 0.17) % 1;
          const dir = m.y < 500 ? -1 : 1;
          const ang = dir * (Math.PI / 2) + (k - 1) * 0.5;
          const d0 = 30 + pulse * 150;
          const alpha = a * left * (1 - pulse) * 0.95;
          if (alpha > 0.03) arrow(m.x + Math.cos(ang) * d0, m.y + Math.sin(ang) * d0, m.x + Math.cos(ang) * (d0 + 50), m.y + Math.sin(ang) * (d0 + 50), BANDS[BLUE].colour, alpha, 3);
        }
      });
    }

    // Blue arriving from everywhere in the sky, toward the person looking up.
    if (L.sky.a > 0.005) {
      skyPoints.forEach((p, i) => {
        const grow = smooth(L.sky.p * skyPoints.length - i * 0.8);
        if (grow < 0.02) return;
        const tx = 960 + (p.x - 960) * 0.12;
        const ty = 742;
        arrow(p.x, p.y, lerp(p.x, tx, grow * 0.82), lerp(p.y, ty, grow * 0.82), [190, 225, 255], L.sky.a * 0.9, 4);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 46);
        g.addColorStop(0, `rgba(255,255,255,${0.85 * L.sky.a * grow})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 46, 0, TAU);
        ctx.fill();
      });
    }
  }

  return { L, draw };
}
