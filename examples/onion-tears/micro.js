// Everything in this film that is drawn flat, on one 2D canvas: the onion's cells, the juice where the two
// reactions happen, the gas rising, a face, the eye's surface and its nerves, the head with the reflex, and the
// two blade tips. Every picture is drawn from the state M and the time it is given; nothing reads a clock.
//
// Each picture has an opacity in M.a (sheet, big, juice, react, wisp, face, eye, head, knife) and its own state.
// Coordinates are the frame's (1920 x 1080), the same as the storyboard's drawn frames.
export const COL = {
  sulf: "#ffb72e",
  alli: "#9d84ff",
  acid: "#ff7a3a",
  lfs: "#ff4fa6",
  gas: "#b6f03a",
  tear: "#4cb8ff",
  nerve: "#ff4d4d",
};
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, k) => a + (b - a) * k;
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const out3 = (x) => 1 - (1 - clamp(x)) ** 3;
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hexRgb = (h) => {
  const n = Number.parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (h, a) => {
  const [r, g, b] = hexRgb(h);
  return `rgba(${r},${g},${b},${a})`;
};
const lerpHex = (h1, h2, k) => {
  const a = hexRgb(h1);
  const b = hexRgb(h2);
  return `#${a.map((v, i) => Math.round(mix(v, b[i], k)).toString(16).padStart(2, "0")).join("")}`;
};

export function createMicro(canvas) {
  const g = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  // ── Sprites: a soft glow, cached per colour ─────────────────────────────
  const glows = new Map();
  const glowSprite = (col) => {
    if (glows.has(col)) return glows.get(col);
    const c = Object.assign(document.createElement("canvas"), { width: 256, height: 256 });
    const x = c.getContext("2d");
    const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, rgba(col, 0.9));
    gr.addColorStop(0.25, rgba(col, 0.45));
    gr.addColorStop(0.6, rgba(col, 0.12));
    gr.addColorStop(1, rgba(col, 0));
    x.fillStyle = gr;
    x.fillRect(0, 0, 256, 256);
    glows.set(col, c);
    return c;
  };
  const glow = (x, y, r, col, a = 1) => {
    if (a <= 0.003 || r <= 0) return;
    g.globalAlpha *= a;
    g.drawImage(glowSprite(col), x - r, y - r, 2 * r, 2 * r);
    g.globalAlpha /= a;
  };
  // A glossy bead: a lit sphere with a highlight, a dark limb and a coloured halo.
  const bead = (x, y, r, col, { halo = 0.5, a = 1, letter } = {}) => {
    if (a <= 0.003 || r <= 0.3) return;
    const keep = g.globalAlpha;
    g.globalAlpha = keep * a;
    if (halo > 0) glow(x, y, r * 2.6, col, halo * 0.6);
    const gr = g.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.05, x, y, r);
    gr.addColorStop(0, lerpHex(col, "#ffffff", 0.75));
    gr.addColorStop(0.35, col);
    gr.addColorStop(1, lerpHex(col, "#000000", 0.55));
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.75)";
    g.beginPath();
    g.ellipse(x - r * 0.36, y - r * 0.44, r * 0.26, r * 0.15, -0.6, 0, TAU);
    g.fill();
    if (letter && r > 18) {
      g.fillStyle = "rgba(20,12,4,0.72)";
      g.font = `700 ${Math.round(r * 0.8)}px "Sora Variable", sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(letter, x + r * 0.05, y + r * 0.08);
    }
    g.globalAlpha = keep;
  };
  // An enzyme: a lumpy glossy body with a pocket cut into one side (where the molecule it works on sits).
  // rot: which way the pocket faces; open: how wide; wob: a small breathing of the outline.
  const enzyme = (x, y, r, col, { rot = 0, open = 1, a = 1, t = 0, seed = 1, halo = 0.45 } = {}) => {
    if (a <= 0.003 || r <= 0.5) return;
    const keep = g.globalAlpha;
    g.globalAlpha = keep * a;
    if (halo > 0) glow(x, y, r * 2.2, col, halo * 0.5);
    const half = 0.42 * open;
    const n = 54;
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const ang = rot + half + ((TAU - 2 * half) * i) / n;
      const bump = 1 + 0.06 * Math.sin(ang * 5 + seed * 1.7 + t * 1.3) + 0.035 * Math.sin(ang * 9 + seed);
      const px = x + Math.cos(ang) * r * bump;
      const py = y + Math.sin(ang) * r * bump;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    // the pocket: a rounded notch cut in toward the middle, from the end of the outline back to its start
    const P = (ang, rr) => [x + Math.cos(ang) * rr, y + Math.sin(ang) * rr];
    const deep = P(rot, r * (1 - 0.5 * open));
    const c1 = P(rot - half * 0.9, r * 0.6);
    const c2 = P(rot + half * 0.9, r * 0.6);
    g.quadraticCurveTo(c1[0], c1[1], deep[0], deep[1]);
    const s0 = P(rot + half, r * (1 + 0.06 * Math.sin((rot + half) * 5 + seed * 1.7 + t * 1.3) + 0.035 * Math.sin((rot + half) * 9 + seed)));
    g.quadraticCurveTo(c2[0], c2[1], s0[0], s0[1]);
    g.closePath();
    const gr = g.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.08, x, y, r * 1.05);
    gr.addColorStop(0, lerpHex(col, "#ffffff", 0.6));
    gr.addColorStop(0.45, col);
    gr.addColorStop(1, lerpHex(col, "#000000", 0.6));
    g.fillStyle = gr;
    g.fill();
    g.lineWidth = Math.max(1.5, r * 0.03);
    g.strokeStyle = rgba(lerpHex(col, "#ffffff", 0.55), 0.7);
    g.stroke();
    g.fillStyle = "rgba(255,255,255,0.45)";
    g.beginPath();
    g.ellipse(x - r * 0.38, y - r * 0.5, r * 0.3, r * 0.13, -0.5, 0, TAU);
    g.fill();
    g.globalAlpha = keep;
  };
  const rrect = (x, y, w, h, r) => {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
  };

  // ── The cell sheet (s03, s05) and one cell (s04) ───────────────────────
  // Cells 300 x 124, rows offset by half a cell; each with a wall, a thin band of cytoplasm holding amber
  // sulfur compounds, and a large vacuole holding the violet enzyme (simplified: f2).
  const CW = 300;
  const CH = 124;
  const cells = [];
  {
    const rand = rng(11);
    for (let r = -6; r < 14; r++) {
      for (let c = -5; c < 12; c++) {
        const x = c * CW + (r % 2 ? CW / 2 : 0) - CW / 2 + 60;
        const y = r * CH - 6;
        // corners nudged a little, so the sheet reads as tissue and not as tiles
        const k = Array.from({ length: 8 }, () => (rand() - 0.5) * 12);
        cells.push({ x, y, j: rand(), k, dots: Array.from({ length: 8 }, () => rand()), enz: [rand(), rand(), rand()], spill: Array.from({ length: 12 }, () => [rand(), rand(), rand()]) });
      }
    }
  }
  const BLADE_X = 960;
  // The centre cell of the sheet (row 3, column 3) is the one drawn large in s04; its middle is at (960, 428).
  const CENTRE = { x: 960, y: 428 };
  const cellPath = (c, inset, radius) => {
    const x0 = c.x + inset;
    const y0 = c.y + inset;
    const x1 = c.x + CW - inset;
    const y1 = c.y + CH - inset;
    const k = c.k;
    const pts = [[x0 + k[0], y0 + k[1]], [x1 + k[2], y0 + k[3]], [x1 + k[4], y1 + k[5]], [x0 + k[6], y1 + k[7]]];
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = pts[(i + 3) % 4];
      const b = pts[i];
      const n = pts[(i + 1) % 4];
      const r = radius;
      const da = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const dn = Math.hypot(n[0] - b[0], n[1] - b[1]);
      const p = [b[0] + ((a[0] - b[0]) * r) / da, b[1] + ((a[1] - b[1]) * r) / da];
      const q = [b[0] + ((n[0] - b[0]) * r) / dn, b[1] + ((n[1] - b[1]) * r) / dn];
      i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
      g.quadraticCurveTo(b[0], b[1], q[0], q[1]);
    }
    g.closePath();
  };
  function drawCell(c, t, S, z) {
    const wallA = 0.75 + 0.15 * Math.sin(c.j * 9 + t * 0.6);
    cellPath(c, 6, 22);
    const fg = g.createLinearGradient(c.x, c.y, c.x, c.y + CH);
    fg.addColorStop(0, "rgba(58,22,66,0.95)");
    fg.addColorStop(0.5, "rgba(34,12,42,0.96)");
    fg.addColorStop(1, "rgba(48,18,56,0.96)");
    g.fillStyle = fg;
    g.fill();
    g.lineWidth = 8 / Math.sqrt(z);
    g.strokeStyle = "rgba(200,150,255,0.16)";
    g.stroke();
    g.lineWidth = 2.4 / Math.sqrt(z);
    g.strokeStyle = `rgba(246,228,255,${wallA})`;
    g.stroke();
    // the vacuole: a large sac holding the enzyme
    const va = S.alli;
    cellPath(c, 24, 16);
    g.fillStyle = rgba(COL.alli, 0.06 + 0.16 * va);
    g.fill();
    g.lineWidth = 1.8 / Math.sqrt(z);
    g.strokeStyle = rgba("#ddd4ff", 0.25 + 0.5 * va);
    g.stroke();
    for (let k = 0; k < 3; k++) {
      const ex = c.x + 70 + c.enz[k] * (CW - 140);
      const ey = c.y + CH / 2 + (k - 1) * 14 + Math.sin(t * 0.8 + c.j * 7 + k) * 5;
      enzyme(ex, ey, 12, COL.alli, { a: 0.35 + 0.65 * va, rot: c.j * 6 + k * 2, t, seed: k + c.j * 4, halo: 0.35 * va });
    }
    // the sulfur compounds in the thin band of cytoplasm around it
    for (let k = 0; k < 8; k++) {
      const top = k % 2 === 0;
      const dx = c.x + 26 + ((k >> 1) / 3.4 + c.dots[k] * 0.18) * (CW - 52);
      const dy = top ? c.y + 15 : c.y + CH - 15;
      bead(dx + Math.sin(t + k + c.j * 5) * 3, dy, 5.5, COL.sulf, { a: 0.3 + 0.7 * S.sulf, halo: 0.8 * S.sulf });
    }
  }
  function drawSheet(S, t) {
    const z = S.z;
    g.save();
    g.translate(CENTRE.x, CENTRE.y);
    g.scale(z, z);
    g.translate(-S.cx, -S.cy);
    const vx0 = S.cx - CENTRE.x / z - CW;
    const vx1 = S.cx + (W - CENTRE.x) / z + 10;
    const vy0 = S.cy - CENTRE.y / z - CH;
    const vy1 = S.cy + (H - CENTRE.y) / z + 10;
    const seam = [];
    for (const c of cells) {
      if (c.x > vx1 || c.y > vy1 || c.x < vx0 || c.y < vy0) continue;
      const cut = S.cut > 0 && Math.abs(c.x + CW / 2 - BLADE_X) < CW / 2 + 1;
      const b = cut ? clamp((S.bladeY - (c.y + CH / 2)) / 140) : 0;
      if (b < 0.01) {
        drawCell(c, t, S, z);
        continue;
      }
      // a burst cell: torn open along the blade, its two halves pulled apart, the sac gone, the contents out
      const gap = 30 * out3(b);
      for (const side of [-1, 1]) {
        g.save();
        g.beginPath();
        if (side < 0) g.rect(c.x - 20, c.y - 20, BLADE_X - gap - c.x + 20, CH + 40);
        else g.rect(BLADE_X + gap, c.y - 20, c.x + CW + 20 - BLADE_X - gap, CH + 40);
        g.clip();
        g.translate(side * gap * 0.4, 0);
        drawCell(c, t, { ...S, alli: S.alli * (1 - b) }, z);
        g.restore();
      }
      seam.push([c, b]);
    }
    // the seam: juice and the spilled contents, drawn over the torn cells
    for (const [c, b] of seam) {
      glow(BLADE_X, c.y + CH / 2, 170, COL.acid, 0.55 * b);
      glow(BLADE_X, c.y + CH / 2, 90, COL.sulf, 0.4 * b);
      for (const [u, v, s] of c.spill) {
        const k = out3(clamp(b * 1.3 - s * 0.3));
        const fromX = c.x + 40 + u * (CW - 80);
        const fromY = c.y + 24 + v * (CH - 48);
        const px = mix(fromX, BLADE_X + (u - 0.5) * 70, k) + Math.sin(t * 2 + s * 9) * 4;
        const py = fromY + k * (s - 0.2) * 70;
        if (s < 0.55) bead(px, py, 7.5, COL.sulf, { halo: 0.9 });
        else enzyme(px, py, 15, COL.alli, { rot: s * 9, t, seed: s * 10, halo: 0.6 });
      }
    }
    g.restore();
    // the blade, huge at this magnification, coming down the middle of the frame
    if (S.blade > 0.001) {
      const by = (S.bladeY - S.cy) * z + CENTRE.y;
      const bx = (BLADE_X - S.cx) * z + CENTRE.x;
      const hw = 30 * z;
      g.save();
      g.globalAlpha = S.blade;
      glow(bx, by - 200, 260, "#ffffff", 0.18);
      const sg = g.createLinearGradient(bx - hw, 0, bx + hw, 0);
      sg.addColorStop(0, "#4c5058");
      sg.addColorStop(0.32, "#dfe4ea");
      sg.addColorStop(0.5, "#ffffff");
      sg.addColorStop(0.6, "#a6acb6");
      sg.addColorStop(1, "#33363c");
      g.fillStyle = sg;
      g.beginPath();
      g.moveTo(bx - hw, -40);
      g.lineTo(bx + hw, -40);
      g.lineTo(bx + hw, by - hw * 2.2);
      g.lineTo(bx, by);
      g.lineTo(bx - hw, by - hw * 2.2);
      g.closePath();
      g.fill();
      g.strokeStyle = "rgba(255,255,255,0.9)";
      g.lineWidth = 2;
      g.stroke();
      glow(bx, by, 90, "#ffffff", 0.6);
      g.restore();
    }
  }
  // One cell filling the frame: the rect 80..1840 x 120..740 (s04).
  const bigRand = rng(5);
  const bigSulf = Array.from({ length: 28 }, (_, i) => ({ x: 150 + (i % 14) * 125 + bigRand() * 30, top: i < 14, ph: bigRand() * TAU }));
  const bigAlli = Array.from({ length: 6 }, (_, i) => ({ x: 360 + i * 245 + bigRand() * 40, y: 430 + (i % 2 ? 55 : -55), ph: bigRand() * TAU, rot: bigRand() * TAU }));
  function drawBig(S, t) {
    g.save();
    const z = S.z;
    g.translate(960, 430);
    g.scale(z, z);
    g.translate(-960, -430);
    rrect(80, 120, 1760, 620, 70);
    const fg = g.createLinearGradient(0, 120, 0, 740);
    fg.addColorStop(0, "rgba(78,30,86,0.97)");
    fg.addColorStop(1, "rgba(40,14,48,0.98)");
    g.fillStyle = fg;
    g.fill();
    g.lineWidth = 20;
    g.strokeStyle = "rgba(226,180,250,0.55)";
    g.stroke();
    g.lineWidth = 3;
    g.strokeStyle = "rgba(255,240,255,0.85)";
    g.stroke();
    // the vacuole
    rrect(190, 230, 1540, 400, 60);
    const vg = g.createLinearGradient(0, 230, 0, 630);
    vg.addColorStop(0, rgba(COL.alli, 0.34));
    vg.addColorStop(1, rgba(COL.alli, 0.16));
    g.fillStyle = vg;
    g.fill();
    g.lineWidth = 5;
    g.strokeStyle = "rgba(220,210,255,0.6)";
    g.stroke();
    // the barrier: a pulse of light running along the vacuole's skin
    if (S.barrier > 0.001) {
      g.save();
      g.lineWidth = 9;
      g.strokeStyle = `rgba(255,255,255,${0.85 * S.barrier})`;
      g.setLineDash([260, 3600]);
      g.lineDashOffset = -S.barrierRun * 3860;
      g.stroke();
      g.restore();
    }
    for (const e of bigAlli) enzyme(e.x + Math.sin(t * 0.5 + e.ph) * 14, e.y + Math.cos(t * 0.6 + e.ph) * 10, 44, COL.alli, { rot: e.rot + t * 0.15, t, seed: e.ph, halo: 0.25 + 0.5 * S.alli, a: 0.55 + 0.45 * S.alli });
    for (const s of bigSulf) bead(s.x + Math.sin(t * 0.7 + s.ph) * 8, (s.top ? 175 : 685) + Math.cos(t * 0.9 + s.ph) * 5, 17, COL.sulf, { halo: 0.3 + 0.7 * S.sulf, a: 0.5 + 0.5 * S.sulf, letter: "S" });
    g.restore();
  }

  // ── The juice (s06, s07): sulfur compounds and enzymes meet; the enzyme turns them into the acid ──────────
  // World coordinates; the camera (J.cx, J.cy, J.z) puts world (cx, cy) at the frame's centre.
  const jr = rng(23);
  const jSulf = Array.from({ length: 46 }, (_, i) => ({ x0: -160 + jr() * 520, y0: 40 + jr() * 900, x1: 480 + jr() * 960, y1: 90 + jr() * 820, ph: jr() * TAU, at: 0.25 + jr() * 0.7, d: jr() }));
  const jAlli = Array.from({ length: 15 }, (_, i) => ({ x0: 1500 + jr() * 500, y0: 60 + jr() * 900, x1: 520 + jr() * 900, y1: 110 + jr() * 760, ph: jr() * TAU, rot: jr() * TAU }));
  // the pair the camera closes on: the enzyme at world (900, 470), its pocket facing right
  const HERO = { x: 900, y: 470, r: 64 };
  function drawJuice(S, t) {
    const z = S.z;
    const P = (x, y) => [(x - S.cx) * z + 960, (y - S.cy) * z + 540];
    // broken walls at both edges of the seam
    g.save();
    g.globalAlpha *= S.walls;
    for (const side of [-1, 1]) {
      const x0 = 960 + side * 560;
      g.beginPath();
      for (let y = -600; y <= 1700; y += 40) {
        const x = x0 + side * (Math.sin(y * 0.031) * 26 + Math.sin(y * 0.11) * 10);
        const [px, py] = P(x, y);
        y === -600 ? g.moveTo(px, py) : g.lineTo(px, py);
      }
      g.lineTo(...P(x0 + side * 1400, 1700));
      g.lineTo(...P(x0 + side * 1400, -600));
      g.closePath();
      const fg = g.createLinearGradient(...P(x0, 0), ...P(x0 + side * 300, 0));
      fg.addColorStop(0, "rgba(90,36,96,0.95)");
      fg.addColorStop(1, "rgba(40,14,48,0.98)");
      g.fillStyle = fg;
      g.fill();
      g.lineWidth = 4;
      g.strokeStyle = "rgba(236,196,255,0.7)";
      g.stroke();
    }
    g.restore();
    const m = S.mix;
    for (const e of jAlli) {
      const k = ease(clamp(m * 1.15 - 0.05));
      const [x, y] = P(mix(e.x0, e.x1, k) + Math.sin(t * 0.7 + e.ph) * 12, mix(e.y0, e.y1, k) + Math.cos(t * 0.5 + e.ph) * 10);
      enzyme(x, y, 38 * z, COL.alli, { rot: e.rot + t * 0.2, t, seed: e.ph, a: S.crowd });
    }
    for (const s of jSulf) {
      const k = ease(clamp(m * 1.2 - s.d * 0.2));
      const conv = clamp((S.react - s.at) / 0.12);
      const col = lerpHex(COL.sulf, COL.acid, conv);
      const jit = conv * 4;
      const [x, y] = P(mix(s.x0, s.x1, k) + Math.sin(t * 0.9 + s.ph) * 10 + Math.sin(t * 37 + s.ph * 9) * jit, mix(s.y0, s.y1, k) + Math.cos(t * 0.7 + s.ph) * 8 + Math.cos(t * 41 + s.ph * 7) * jit);
      bead(x, y, 14 * z, col, { a: S.crowd, halo: 0.6 });
    }
    // the hero pair
    if (S.hero > 0.001) {
      const [hx, hy] = P(HERO.x, HERO.y);
      enzyme(hx, hy, HERO.r * z, COL.alli, { rot: 0, t, seed: 3, a: S.hero, open: 1 });
      // the sulfur compound: comes in from the left, sits in the pocket, leaves as the acid
      const pocket = [HERO.x + HERO.r * 0.62, HERO.y];
      const inK = ease(S.heroIn);
      const ox = S.heroOut;
      let bx = mix(pocket[0] - 200, pocket[0], inK);
      let by = mix(pocket[1] + 60, pocket[1], inK);
      bx = mix(bx, S.acidX, ease(ox));
      by = mix(by, S.acidY, ease(ox));
      const col = lerpHex(COL.sulf, COL.acid, S.snip);
      const jit = S.snip * 5;
      const [px, py] = P(bx + Math.sin(t * 40) * jit / z, by + Math.cos(t * 47) * jit / z);
      bead(px, py, 18 * z, col, { a: S.hero, halo: 0.7, letter: S.snip < 0.5 ? "S" : "" });
      if (S.flash > 0.001) glow(...P(pocket[0], pocket[1]), 70 * z, "#ffffff", S.flash);
    }
  }

  // ── The second reaction (s08 to s10) ───────────────────────────────────
  function drawReact(S, t) {
    const jit = 5;
    // the old idea: a dashed arrow to an empty outline
    if (S.arrow > 0.001) {
      g.save();
      g.globalAlpha *= S.arrowA;
      g.setLineDash([26, 18]);
      g.lineDashOffset = -t * 30;
      g.lineWidth = 6;
      g.strokeStyle = "rgba(237,237,240,0.75)";
      g.beginPath();
      g.moveTo(660, 520);
      g.lineTo(mix(660, 1250, S.arrow), 520);
      g.stroke();
      g.setLineDash([]);
      if (S.arrow > 0.98) {
        g.beginPath();
        g.moveTo(1222, 498);
        g.lineTo(1254, 520);
        g.lineTo(1222, 542);
        g.stroke();
      }
      g.setLineDash([18, 16]);
      g.lineWidth = 5;
      g.strokeStyle = rgba(COL.gas, 0.55 + 0.35 * S.flicker);
      g.beginPath();
      g.arc(1400, 520, 96, 0, TAU);
      g.stroke();
      g.restore();
    }
    // the magenta enzyme
    if (S.lfs > 0.001) {
      enzyme(S.lfsX, 520, 210, COL.lfs, { rot: Math.PI + S.lfsRot, t, seed: 7, a: S.lfs, halo: 0.55, open: 1 });
    }
    // the acid
    if (S.acid > 0.001) {
      const ax = S.acidX + Math.sin(t * 43) * jit * S.shake;
      const ay = S.acidY + Math.cos(t * 51) * jit * S.shake;
      bead(ax, ay, S.acidR, COL.acid, { a: S.acid, halo: 0.75 });
    }
    // the gas: lime molecules leaving the enzyme and rising
    for (const p of S.gasList) {
      const k = clamp((t - p.at) / p.dur);
      if (k <= 0 || p.a <= 0) continue;
      const x = mix(p.x0, p.x1, out3(k)) + Math.sin(t * 1.7 + p.ph) * 8 * k;
      const y = mix(p.y0, p.y1, out3(k)) + Math.cos(t * 1.3 + p.ph) * 6 * k;
      bead(x, y, p.r * (0.6 + 0.4 * clamp(k * 4)), COL.gas, { a: p.a * S.gasA * clamp(k * 6), halo: 1 });
    }
    if (S.flash > 0.001) glow(S.flashX, 520, 200, "#ffffff", S.flash);
  }

  // ── Rising gas over the kitchen (s01, s02, s12, s22) ───────────────────
  // Soft lime puffs along a curve from a source to a target, emitted steadily; each lives `life` seconds.
  const puffs = Array.from({ length: 90 }, (_, i) => { const r = rng(100 + i); return { off: r(), sx: r() - 0.5, sy: r() - 0.5, size: 0.6 + r() * 0.8, ph: r() * TAU }; });
  function drawWisp(S, t) {
    const { x0, y0, x1, y1, bend, life, rate, spread } = S;
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i];
      // the puff's age: emitted at regular steps, each one `life` long
      const period = life;
      const age = (((t - S.t0) / period + p.off) % 1 + 1) % 1;
      const born = t - S.t0 - age * period;
      if (born < 0 || i / puffs.length > rate) continue;
      const u = age;
      const cx = mix(x0, x1, u) + bend * Math.sin(Math.PI * u) + Math.sin(t * 1.1 + p.ph) * 26 * u;
      const cy = mix(y0, y1, u) - Math.abs(bend) * 0.4 * Math.sin(Math.PI * u);
      const r = (30 + 110 * u) * p.size * S.scale;
      const a = S.a * Math.sin(Math.PI * clamp(u * 1.1)) * clamp(u * 3) * 0.26;
      glow(cx + p.sx * spread * (0.3 + u), cy + p.sy * spread * 0.5 * (0.3 + u), r, COL.gas, a);
    }
  }

  // ── A face in profile, looking left (s12, s16) ─────────────────────────
  // The eye sits at (ex, ey); size scales the whole head.
  function drawFace(S, t) {
    const s = S.s;
    const ox = S.ex - 1380 * s;
    const oy = S.ey - 380 * s;
    g.save();
    g.translate(ox, oy);
    g.scale(s, s);
    const face = new Path2D("M2050 -40 L1560 -40 C1420 -10 1350 90 1336 200 C1328 262 1330 300 1318 330 L1250 452 C1238 476 1252 494 1282 498 L1308 502 C1300 540 1306 566 1322 586 C1304 602 1302 626 1318 646 C1330 662 1326 690 1334 712 C1350 760 1410 778 1470 786 L1512 1200 L2050 1200 Z");
    const fg = g.createLinearGradient(1250, 0, 1900, 0);
    fg.addColorStop(0, "#2a2129");
    fg.addColorStop(0.4, "#1c171d");
    fg.addColorStop(1, "#121014");
    g.fillStyle = fg;
    g.fill(face);
    // a warm rim along the profile, from the kitchen light
    g.lineWidth = 6;
    g.strokeStyle = "rgba(255,206,160,0.55)";
    g.stroke(face);
    g.lineWidth = 2;
    g.strokeStyle = "rgba(255,240,220,0.9)";
    g.stroke(face);
    // the eye: an almond, a white, an iris, a lid line
    const eye = new Path2D("M1330 380 Q1372 352 1418 372 Q1380 404 1330 380 Z");
    g.fillStyle = `rgba(240,236,232,${0.92 - 0.25 * S.squint})`;
    g.fill(eye);
    g.save();
    g.clip(eye);
    const ig = g.createRadialGradient(1366, 376, 2, 1366, 376, 16);
    ig.addColorStop(0, "#0b0b0d");
    ig.addColorStop(0.45, "#3b2a1c");
    ig.addColorStop(1, "#6b4a2c");
    g.fillStyle = ig;
    g.beginPath();
    g.arc(1364, 377, 15, 0, TAU);
    g.fill();
    g.restore();
    g.lineWidth = 4;
    g.strokeStyle = "#0d0b0e";
    g.beginPath();
    g.moveTo(1326, 380);
    g.quadraticCurveTo(1372 - 4 * S.squint, 346 + 18 * S.squint, 1420, 371);
    g.stroke();
    // an eyebrow
    g.lineWidth = 9;
    g.strokeStyle = "rgba(60,44,40,0.9)";
    g.beginPath();
    g.moveTo(1326, 326 + 6 * S.squint);
    g.quadraticCurveTo(1380, 306 + 10 * S.squint, 1440, 322);
    g.stroke();
    // the gas arriving: a lime ring at the eye
    if (S.ring > 0.001) {
      g.lineWidth = 6;
      g.strokeStyle = rgba(COL.gas, 0.8 * (1 - S.ring));
      g.beginPath();
      g.arc(1372, 376, 40 + 90 * S.ring, 0, TAU);
      g.stroke();
      glow(1372, 376, 120, COL.gas, 0.5 * (1 - S.ring * 0.6));
    }
    // tears: drops welling at the lower lid and running down the cheek
    for (const d of [0, 0.42]) {
      const k = clamp(S.tear - d);
      if (k <= 0) continue;
      const tx = 1352 - k * 14;
      const ty = 392 + k * 330;
      glow(tx, ty, 40, COL.tear, 0.6);
      const dg = g.createRadialGradient(tx - 4, ty - 6, 1, tx, ty, 16);
      dg.addColorStop(0, "#e8f6ff");
      dg.addColorStop(0.5, COL.tear);
      dg.addColorStop(1, "rgba(40,120,200,0.6)");
      g.fillStyle = dg;
      g.beginPath();
      g.moveTo(tx, ty - 26);
      g.quadraticCurveTo(tx + 14, ty - 2, tx + 12, ty + 6);
      g.arc(tx, ty + 6, 12, 0, Math.PI);
      g.quadraticCurveTo(tx - 14, ty - 2, tx, ty - 26);
      g.fill();
      // the wet trail it leaves
      g.lineWidth = 7;
      g.strokeStyle = rgba(COL.tear, 0.35);
      g.beginPath();
      g.moveTo(1352, 394);
      g.quadraticCurveTo(1346, 394 + k * 160, tx, ty - 20);
      g.stroke();
    }
    g.restore();
  }

  // ── The eye's surface (s13, s17) ───────────────────────────────────────
  // The cornea as a thick glassy band along a circle (centre 960, 2400; outer radius 2000, inner 1880), seen
  // in section, magnified. Nerve endings rise from below into it.
  const OC = { x: 960, y: 2400, R: 2000, r: 1880 };
  const surfY = (x, R = OC.R) => OC.y - Math.sqrt(R * R - (x - OC.x) ** 2);
  const nerveX = [180, 430, 690, 960, 1230, 1490, 1740];
  const nr = rng(31);
  const nerves = nerveX.map((x) => {
    const top = surfY(x) + 34;
    const pts = [];
    for (let k = 0; k <= 12; k++) {
      const u = k / 12;
      pts.push([x + Math.sin(u * 5 + x) * 26 * (1 - u), mix(1120, top, u)]);
    }
    // two small branches near the top
    const br = [0.72, 0.84].map((u, i) => {
      const [bx, by] = pts[Math.round(u * 12)];
      const dir = i ? 1 : -1;
      return [[bx, by], [bx + dir * (40 + nr() * 30), by - 40 - nr() * 20], [bx + dir * (70 + nr() * 30), surfY(bx + dir * 70) + 40]];
    });
    return { x, top, pts, br };
  });
  // gas molecules falling onto the surface: [x, landing time offset]
  function drawEye(S, t) {
    const z = S.z;
    g.save();
    g.translate(S.ox, S.oy);
    g.scale(z, z);
    g.translate(-S.ox, -S.oy);
    // tissue below
    const tg = g.createLinearGradient(0, 500, 0, 1100);
    tg.addColorStop(0, "#2a1420");
    tg.addColorStop(1, "#140a12");
    g.fillStyle = tg;
    g.beginPath();
    g.arc(OC.x, OC.y, OC.r, 0, TAU);
    g.fill();
    // nerves (under the glass)
    for (let i = 0; i < nerves.length; i++) {
      const n = nerves[i];
      const fire = S.fire[i] ?? 0;
      const line = (pts, w) => {
        g.beginPath();
        pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.lineWidth = w;
        g.stroke();
      };
      g.strokeStyle = `rgba(${Math.round(mix(205, 255, fire))},${Math.round(mix(160, 80, fire))},${Math.round(mix(150, 80, fire))},${0.55 + 0.45 * fire})`;
      line(n.pts, 6);
      for (const b of n.br) line(b, 3.5);
      // the ending, a small bulb
      bead(n.pts.at(-1)[0], n.pts.at(-1)[1], 7, fire > 0.05 ? COL.nerve : "#d8a9a0", { halo: fire, a: 1 });
      // the signal running down
      if (fire > 0.02) {
        const k = S.run[i] ?? 0;
        const idx = Math.min(11, Math.floor((1 - k) * 12));
        const f = (1 - k) * 12 - idx;
        const [x0, y0] = n.pts[12 - idx];
        const [x1, y1] = n.pts[Math.max(0, 11 - idx)];
        glow(mix(x0, x1, f), mix(y0, y1, f), 60, COL.nerve, fire);
        glow(n.pts.at(-1)[0], n.pts.at(-1)[1], 80, COL.nerve, fire * 0.8);
      }
    }
    // the cornea: a glassy band
    g.beginPath();
    g.arc(OC.x, OC.y, OC.R, Math.PI, 0);
    g.arc(OC.x, OC.y, OC.r, 0, Math.PI, true);
    g.closePath();
    const cg = g.createLinearGradient(0, 380, 0, 900);
    cg.addColorStop(0, "rgba(200,230,255,0.30)");
    cg.addColorStop(0.3, "rgba(150,200,240,0.16)");
    cg.addColorStop(1, "rgba(120,170,220,0.12)");
    g.fillStyle = cg;
    g.fill();
    // the surface layer of cells
    g.save();
    g.clip();
    g.strokeStyle = "rgba(210,236,255,0.14)";
    g.lineWidth = 2;
    for (let a = -1.2; a <= 1.2; a += 0.016) {
      const ang = -Math.PI / 2 + a;
      g.beginPath();
      g.moveTo(OC.x + Math.cos(ang) * OC.R, OC.y + Math.sin(ang) * OC.R);
      g.lineTo(OC.x + Math.cos(ang) * (OC.R - 34), OC.y + Math.sin(ang) * (OC.R - 34));
      g.stroke();
    }
    g.restore();
    g.lineWidth = 5;
    g.strokeStyle = "rgba(230,245,255,0.85)";
    g.beginPath();
    g.arc(OC.x, OC.y, OC.R, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
    glow(700, surfY(700) + 10, 260, "#bfe4ff", 0.12);
    // the tear film washing across
    if (S.wash > 0.001) {
      const front = mix(-300, 2300, S.wash);
      g.save();
      g.beginPath();
      const steps = 80;
      for (let k = 0; k <= steps; k++) {
        const x = (k / steps) * Math.min(front, 2000) - 40;
        const lift = 8 + 40 * clamp((front - x) / 260) + 26 * Math.exp(-(((x - front + 140) / 110) ** 2)) * clamp((front - x) / 60);
        const y = surfY(x) - lift - Math.sin(x * 0.02 + t * 3) * 5;
        k ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      for (let k = steps; k >= 0; k--) {
        const x = (k / steps) * Math.min(front, 2000) - 40;
        g.lineTo(x, surfY(x) + 2);
      }
      g.closePath();
      const wg = g.createLinearGradient(0, 300, 0, 800);
      wg.addColorStop(0, "rgba(120,200,255,0.62)");
      wg.addColorStop(1, "rgba(40,130,220,0.5)");
      g.fillStyle = wg;
      g.fill();
      g.lineWidth = 4;
      g.strokeStyle = "rgba(225,245,255,0.9)";
      g.stroke();
      g.restore();
    }
    // gas molecules: falling, landing, then washed off to the right
    for (const m of S.mols) {
      const k = clamp((t - m.at) / 0.7);
      const land = surfY(m.x) - 22;
      let x = m.x;
      let y = mix(-60, land, ease(k));
      if (S.wash > 0) {
        const front = mix(-300, 2300, S.wash);
        if (front > x - 40) {
          const carried = front - x + 40;
          x += carried * 0.9;
          y = surfY(Math.min(x, 1900)) - 70 - Math.min(80, carried * 0.1);
        }
      }
      bead(x, y, 16, COL.gas, { a: S.molA * clamp((t - m.at + 0.7) / 0.3), halo: 0.9 });
    }
    g.restore();
  }

  // ── The head, with the reflex (s14b) ──────────────────────────────────
  // Facing left, the eye at (620, 470). The red path carries the signal in, the blue one out to the tear gland.
  const IN = [[620, 470], [700, 500], [820, 540], [960, 590], [1100, 630], [1190, 640]];
  const OUTP = [[1190, 640], [1110, 600], [980, 530], [850, 460], [760, 420], [700, 404]];
  const along = (pts, k) => {
    const n = pts.length - 1;
    const f = clamp(k) * n;
    const i = Math.min(n - 1, Math.floor(f));
    const u = f - i;
    return [mix(pts[i][0], pts[i + 1][0], u), mix(pts[i][1], pts[i + 1][1], u)];
  };
  const pathPart = (pts, k) => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    const n = pts.length - 1;
    const f = clamp(k) * n;
    for (let i = 1; i <= n; i++) {
      if (i <= f) g.lineTo(pts[i][0], pts[i][1]);
      else {
        const [x, y] = along(pts, k);
        g.lineTo(x, y);
        break;
      }
    }
  };
  function drawHead(S, t) {
    g.save();
    const z = S.z;
    g.translate(620, 470);
    g.scale(z, z);
    g.translate(-620, -470);
    const head = new Path2D("M780 30 C1080 -30 1420 40 1580 300 C1690 480 1640 660 1540 760 L1500 1120 L840 1120 L820 930 C720 930 640 900 610 850 C590 810 600 780 610 760 C584 744 584 712 600 690 C584 670 590 646 604 630 L540 560 C522 538 530 522 556 516 L572 512 C566 440 560 380 572 300 C600 160 680 60 780 30 Z");
    const hg = g.createLinearGradient(500, 0, 1600, 0);
    hg.addColorStop(0, "rgba(60,56,66,0.75)");
    hg.addColorStop(1, "rgba(26,24,30,0.75)");
    g.fillStyle = hg;
    g.fill(head);
    g.lineWidth = 5;
    g.strokeStyle = "rgba(230,226,240,0.75)";
    g.stroke(head);
    // the brain
    const brain = new Path2D("M720 170 C800 90 1000 60 1180 90 C1380 120 1500 240 1490 400 C1480 520 1370 580 1230 590 C1210 640 1190 690 1180 720 L1150 720 C1150 680 1150 640 1140 600 C1020 600 900 560 820 500 C720 430 660 280 720 170 Z");
    const bg = g.createRadialGradient(1100, 330, 40, 1100, 330, 480);
    bg.addColorStop(0, "rgba(190,170,255,0.35)");
    bg.addColorStop(1, "rgba(120,100,200,0.18)");
    g.fillStyle = bg;
    g.fill(brain);
    g.lineWidth = 3;
    g.strokeStyle = "rgba(210,200,255,0.6)";
    g.stroke(brain);
    // folds
    g.strokeStyle = "rgba(210,200,255,0.25)";
    g.lineWidth = 3;
    for (const d of ["M800 230 C900 200 980 260 1060 220", "M860 340 C960 300 1060 380 1180 330", "M1100 170 C1180 210 1260 180 1340 230", "M1250 330 C1330 360 1400 330 1450 380", "M900 450 C1000 420 1100 480 1220 460"]) g.stroke(new Path2D(d));
    // the eye and the gland
    g.fillStyle = "rgba(240,236,232,0.95)";
    g.beginPath();
    g.ellipse(612, 470, 34, 16, 0, 0, TAU);
    g.fill();
    bead(606, 470, 10, "#3b2a1c", { halo: 0 });
    const gl = S.gland;
    g.fillStyle = rgba(COL.tear, 0.25 + 0.6 * gl);
    g.beginPath();
    g.ellipse(700, 404, 34, 18, -0.3, 0, TAU);
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = rgba("#bfe6ff", 0.5 + 0.5 * gl);
    g.stroke();
    glow(700, 404, 110, COL.tear, gl * 0.9);
    // the paths
    g.lineCap = "round";
    if (S.inK > 0.001) {
      pathPart(IN, S.inK);
      g.lineWidth = 16;
      g.strokeStyle = rgba(COL.nerve, 0.25 * S.inA);
      g.stroke();
      g.lineWidth = 6;
      g.strokeStyle = rgba(COL.nerve, 0.95 * S.inA);
      g.stroke();
      const [px, py] = along(IN, S.inK);
      glow(px, py, 70, COL.nerve, S.inA * (S.inK < 0.999 ? 1 : 0.4));
    }
    glow(1190, 640, 150, COL.nerve, S.stem);
    if (S.outK > 0.001) {
      pathPart(OUTP, S.outK);
      g.lineWidth = 16;
      g.strokeStyle = rgba(COL.tear, 0.25);
      g.stroke();
      g.lineWidth = 6;
      g.strokeStyle = rgba(COL.tear, 0.95);
      g.stroke();
      const [px, py] = along(OUTP, S.outK);
      glow(px, py, 70, COL.tear, S.outK < 0.999 ? 1 : 0.4);
    }
    // tears over the eye and down the cheek
    for (const d of [0, 0.35, 0.7]) {
      const k = clamp(S.tear - d);
      if (k <= 0) continue;
      const x = 598 - k * 6;
      const y = 488 + k * 260;
      glow(x, y, 36, COL.tear, 0.7);
      bead(x, y, 11, COL.tear, { halo: 0.3 });
    }
    g.restore();
  }

  // ── The knife test (s18 to s20) ────────────────────────────────────────
  // Two blade tips drawn to scale with each other at 6 px a micrometre (f8): sharp r = 5.5 px, blunt r = 80 px.
  // The onion's first layer: a tough skin at y 560 over soft cells. The onion is not to scale.
  const LY = 560;
  const kr = rng(41);
  const tissueCells = [];
  for (let row = 0; row < 4; row++) for (let c = -1; c < 24; c++) tissueCells.push({ x: c * 90 + (row % 2) * 45, y: LY + 40 + row * 70, j: kr() });
  // the droplets each blade throws: 3 and 120 (the measured ratio, 1 : 40)
  const dropsOf = (n, seed) => {
    const r = rng(seed);
    return Array.from({ length: n }, (_, i) => ({ a: -Math.PI / 2 + (i % 2 ? 1 : -1) * (0.42 + r() * 0.75), v: 420 + r() * 620, r: 5.5 + r() * 4, ph: r() }));
  };
  const DROPS = { sharp: dropsOf(3, 5), blunt: dropsOf(120, 6) };
  function drawKnife(S, t) {
    g.save();
    g.globalAlpha *= S.layerA;
    for (const side of ["sharp", "blunt"]) {
      const B = S[side];
      const cx = B.x;
      // the skin, dented under the blade
      const dent = B.dent;
      const yAt = (x) => LY + dent * Math.exp(-(((x - cx) / (40 + B.tipR * 1.6)) ** 2));
      // soft cells, squashed under the dent
      for (const c of tissueCells) {
        const x = c.x + (side === "blunt" ? 1400 - 520 : 0);
        if (Math.abs(x - cx) > 360) continue;
        const push = dent * Math.exp(-(((x - cx) / (60 + B.tipR * 1.6)) ** 2)) * Math.exp(-(c.y - LY - 40) / 160);
        const y = c.y + push * 0.7;
        const squash = 1 - clamp(push / 140) * 0.45;
        const press = clamp(push / 70) * B.press;
        g.fillStyle = `rgba(${Math.round(mix(240, 255, press))},${Math.round(mix(210, 120, press))},${Math.round(mix(232, 140, press))},0.85)`;
        g.beginPath();
        g.ellipse(x, y, 40 / Math.sqrt(squash), 30 * squash, 0, 0, TAU);
        g.fill();
        g.lineWidth = 2.5;
        g.strokeStyle = "rgba(180,80,150,0.6)";
        g.stroke();
      }
      if (B.press > 0.01) glow(cx, LY + dent + 40, 170, COL.nerve, 0.5 * B.press * clamp(dent / 60));
      // the skin itself
      g.lineWidth = 14;
      g.strokeStyle = "#8c2f6e";
      g.beginPath();
      const broke = B.broke;
      for (let x = cx - 360; x <= cx + 360; x += 6) {
        if (broke > 0 && Math.abs(x - cx) < B.tipR + 6) {
          g.stroke();
          g.beginPath();
          continue;
        }
        const y = yAt(x);
        x === cx - 360 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
      g.lineWidth = 3;
      g.strokeStyle = "rgba(255,200,240,0.6)";
      g.stroke();
    }
    g.restore();
    // the blades
    for (const side of ["sharp", "blunt"]) {
      const B = S[side];
      if (S.bladeA <= 0.001) continue;
      const cx = B.x;
      const r = B.tipR;
      const tip = B.tipY;
      const top = tip - 900;
      const k = Math.tan(0.13);
      const xl = cx - r - (tip - r - top) * k;
      const xr = cx + r + (tip - r - top) * k;
      g.save();
      g.globalAlpha *= S.bladeA;
      const sg = g.createLinearGradient(xl, 0, xr, 0);
      sg.addColorStop(0, "#4b4f57");
      sg.addColorStop(0.3, "#d9dee5");
      sg.addColorStop(0.47, "#ffffff");
      sg.addColorStop(0.55, "#b8bec7");
      sg.addColorStop(1, "#3a3d44");
      g.fillStyle = sg;
      g.beginPath();
      g.moveTo(xl, top);
      g.lineTo(cx - r, tip - r);
      g.arc(cx, tip - r, r, Math.PI, 0, true);
      g.lineTo(xr, top);
      g.closePath();
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = "rgba(255,255,255,0.8)";
      g.stroke();
      glow(cx, tip - r, 30 + r, "#ffffff", 0.35);
      g.restore();
    }
    // the droplets: thrown from the cut, then held in the air to be counted
    for (const side of ["sharp", "blunt"]) {
      const B = S[side];
      if (B.spray <= 0) continue;
      const list = DROPS[side];
      const tau = Math.min(B.spray, 0.55);
      for (const d of list) {
        const x = B.x + Math.cos(d.a) * d.v * tau * 0.8;
        const y = LY - 10 + Math.sin(d.a) * d.v * tau * 0.8 + 900 * tau * tau * 0.6;
        bead(x, y, d.r, COL.tear, { halo: 0.45, a: S.dropA });
      }
    }
    // the bars: the measured ratio, 1 : 40, on one baseline
    if (S.bars > 0.001) {
      const base = 870;
      for (const [x, h] of [[S.sharp.x, 14], [S.blunt.x, 560]]) {
        const hh = h * ease(S.bars);
        const bg = g.createLinearGradient(0, base - hh, 0, base);
        bg.addColorStop(0, "#9fdcff");
        bg.addColorStop(1, "#2a86d6");
        g.fillStyle = bg;
        g.beginPath();
        g.roundRect(x - 80, base - hh, 160, hh, 12);
        g.fill();
        glow(x, base - hh, 90, COL.tear, 0.4 * S.bars);
      }
      g.fillStyle = "rgba(237,237,240,0.5)";
      g.fillRect(S.sharp.x - 200, base, S.blunt.x - S.sharp.x + 400, 3);
    }
  }

  return {
    draw(M, t) {
      g.clearRect(0, 0, W, H);
      const A = M.a;
      const layer = (name, fn, S) => {
        if (A[name] <= 0.001) return;
        g.save();
        g.globalAlpha = A[name];
        fn(S, t);
        g.restore();
      };
      layer("sheet", drawSheet, M.sheet);
      layer("big", drawBig, M.big);
      layer("juice", drawJuice, M.juice);
      layer("react", drawReact, M.react);
      layer("eye", drawEye, M.eye);
      layer("head", drawHead, M.head);
      layer("face", drawFace, M.face);
      layer("wisp", drawWisp, M.wisp);
      layer("knife", drawKnife, M.knife);
    },
    surfY,
  };
}
