// The world of "Gimana sih luka bisa nutup sendiri?": a fingertip, and a cross-section of skin with a wound in it,
// drawn on one 2D canvas from a state the timeline holds. Nothing here reads a clock: every draw is a function of
// the state and the time it is given.
//
// The section is drawn in world pixels that equal screen pixels at rest: the surface at y 460, the base of the
// epidermis at y 600 (with its wavy ridges), a capillary at y 948..1052, and the wound cut from the surface
// (x 380..700) down into the capillary (x 470..610 at y 948). The camera maps world to screen:
//   screen = (world - cam) * z + (540, 960)
// Sizes: a red cell is 44 px across, a platelet 16 px, the white cell 84 px (f2, f4: 7.5, 2.5 and 13 µm, roughly).

export const SURF = 460;
export const EPI = 600;
export const VES_TOP = 948;
export const VES_BOT = 1052;
export const VES_Y = 1000;
export const RED = "#e8463d";
export const CYAN = "#7fe3da";

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, u) => a + (b - a) * u;
const smooth = (x) => {
  const u = clamp(x);
  return u * u * (3 - 2 * u);
};
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── The shape of the skin and the wound ─────────────────────────────────────
export const surf = (x) => SURF + 8 * Math.sin(x / 70);
export const ridge = (x) => EPI + 18 * Math.sin(x / 46) + 6 * Math.sin(x / 17 + 1.3);
// The wound's walls: x of the left and right wall at height y.
export const wallL = (y) => 380 + ((y - SURF) * 90) / (VES_TOP - SURF);
export const wallR = (y) => 700 - ((y - SURF) * 90) / (VES_TOP - SURF);
const GAP = [
  [372, SURF - 6],
  [wallL(VES_TOP), VES_TOP + 6],
  [wallR(VES_TOP), VES_TOP + 6],
  [708, SURF - 6],
];
function gapPath(g, top = SURF - 7, bottom = VES_TOP + 8) {
  g.beginPath();
  g.moveTo(wallL(top) - 2, top);
  g.lineTo(wallL(bottom), bottom);
  g.lineTo(wallR(bottom), bottom);
  g.lineTo(wallR(top) + 2, top);
  g.closePath();
}

// ── Sprites: each cell drawn once, lit, then placed many times ──────────────
function sprite(size, paint) {
  const c = Object.assign(document.createElement("canvas"), { width: size, height: size });
  paint(c.getContext("2d"), size / 2);
  return c;
}
// A red cell: a disc with a dimple, seen face on; tilting squashes it.
const RBC = sprite(128, (g, r) => {
  const R = r * 0.92;
  const body = g.createRadialGradient(r * 0.82, r * 0.78, R * 0.05, r, r, R);
  body.addColorStop(0, "#ff8a78");
  body.addColorStop(0.35, "#d8262c");
  body.addColorStop(0.62, "#a3141f");
  body.addColorStop(0.82, "#d32a30");
  body.addColorStop(0.95, "#ff6a5c");
  body.addColorStop(1, "rgba(120,10,20,0.9)");
  g.fillStyle = body;
  g.beginPath();
  g.arc(r, r, R, 0, TAU);
  g.fill();
  // The dimple: a darker hollow, lit on its far side.
  const dip = g.createRadialGradient(r * 1.06, r * 1.08, 0, r, r, R * 0.5);
  dip.addColorStop(0, "rgba(70,0,8,0.55)");
  dip.addColorStop(0.7, "rgba(90,0,12,0.25)");
  dip.addColorStop(1, "rgba(90,0,12,0)");
  g.fillStyle = dip;
  g.beginPath();
  g.arc(r, r, R * 0.55, 0, TAU);
  g.fill();
  // A wet highlight on the rim, upper left.
  g.strokeStyle = "rgba(255,220,210,0.55)";
  g.lineWidth = R * 0.07;
  g.beginPath();
  g.arc(r, r, R * 0.84, Math.PI * 1.05, Math.PI * 1.55);
  g.stroke();
});
const PLATELET = sprite(64, (g, r) => {
  const body = g.createRadialGradient(r * 0.8, r * 0.75, 1, r, r, r * 0.7);
  body.addColorStop(0, "#fff6dc");
  body.addColorStop(0.5, "#f2cf86");
  body.addColorStop(1, "#b98a3c");
  g.fillStyle = body;
  g.beginPath();
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * TAU;
    const rr = r * (0.62 + 0.08 * Math.sin(i * 2.7));
    g.lineTo(r + Math.cos(a) * rr, r + Math.sin(a) * rr * 0.8);
  }
  g.fill();
  g.fillStyle = "rgba(150,90,140,0.55)";
  for (const [x, y] of [[0.9, 0.95], [1.12, 1.05], [0.98, 1.15]]) {
    g.beginPath();
    g.arc(r * x, r * y, r * 0.07, 0, TAU);
    g.fill();
  }
});
// The same platelet, switched on: spiky arms that grab.
const SPIKY = sprite(64, (g, r) => {
  g.fillStyle = "#e8b964";
  g.strokeStyle = "#f6d993";
  g.lineWidth = 3;
  g.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.3;
    g.beginPath();
    g.moveTo(r, r);
    g.lineTo(r + Math.cos(a) * r * (0.82 + 0.12 * Math.sin(i * 3.1)), r + Math.sin(a) * r * (0.82 + 0.12 * Math.sin(i * 3.1)));
    g.stroke();
  }
  const body = g.createRadialGradient(r * 0.85, r * 0.8, 1, r, r, r * 0.5);
  body.addColorStop(0, "#fff3d0");
  body.addColorStop(0.6, "#efc370");
  body.addColorStop(1, "#a87a30");
  g.fillStyle = body;
  g.beginPath();
  g.arc(r, r, r * 0.46, 0, TAU);
  g.fill();
});
// A germ: a rod, sickly yellow-green, with a tail.
const BUG = sprite(96, (g, r) => {
  g.strokeStyle = "rgba(190,220,90,0.7)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(r + 26, r);
  g.bezierCurveTo(r + 36, r - 8, r + 40, r + 8, r + 47, r - 2);
  g.stroke();
  const body = g.createLinearGradient(0, r - 11, 0, r + 11);
  body.addColorStop(0, "#effc9a");
  body.addColorStop(0.4, "#b9d340");
  body.addColorStop(1, "#5d7d12");
  g.fillStyle = body;
  g.strokeStyle = "#3d5508";
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(r - 28, r - 11, 56, 22, 11);
  g.fill();
  g.stroke();
  g.fillStyle = "rgba(255,255,220,0.55)";
  g.beginPath();
  g.roundRect(r - 20, r - 8, 34, 5, 3);
  g.fill();
});
// A skin cell (keratinocyte) on the move: cream, tinted with the healing cyan.
const KERA = sprite(64, (g, r) => {
  const body = g.createRadialGradient(r * 0.8, r * 0.7, 2, r, r, r * 0.9);
  body.addColorStop(0, "#fffaf0");
  body.addColorStop(0.45, "#f6e2c8");
  body.addColorStop(1, "#d6a98c");
  g.fillStyle = body;
  g.strokeStyle = "rgba(120,70,50,0.6)";
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(r, r, r * 0.9, r * 0.62, 0, 0, TAU);
  g.fill();
  g.stroke();
  g.fillStyle = "rgba(70,60,130,0.55)";
  g.beginPath();
  g.ellipse(r * 1.05, r * 1.02, r * 0.26, r * 0.2, 0, 0, TAU);
  g.fill();
});

// ── The section's still parts, painted once at 1.6 x ─────────────────────────
const BASE = { x0: -170, y0: 300, x1: 1250, y1: 2010, s: 1.6 };
function paintSection(healed) {
  const w = Math.round((BASE.x1 - BASE.x0) * BASE.s);
  const h = Math.round((BASE.y1 - BASE.y0) * BASE.s);
  const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const g = c.getContext("2d");
  g.setTransform(BASE.s, 0, 0, BASE.s, -BASE.x0 * BASE.s, -BASE.y0 * BASE.s);
  const rand = rng(healed ? 7 : 7);
  const X0 = BASE.x0;
  const X1 = BASE.x1;

  // Dermis: warm pink near the top, deep wine below, almost black at the bottom so the spoken words read.
  const dermis = g.createLinearGradient(0, EPI - 20, 0, BASE.y1);
  dermis.addColorStop(0, "#e88a80");
  dermis.addColorStop(0.12, "#cf6467");
  dermis.addColorStop(0.32, "#9a3443");
  dermis.addColorStop(0.55, "#5a1724");
  dermis.addColorStop(0.75, "#2a0a12");
  dermis.addColorStop(1, "#12050a");
  g.fillStyle = dermis;
  g.beginPath();
  g.moveTo(X0, ridge(X0));
  for (let x = X0; x <= X1; x += 6) g.lineTo(x, ridge(x));
  g.lineTo(X1, BASE.y1);
  g.lineTo(X0, BASE.y1);
  g.fill();
  // Collagen: a basket weave of soft fibres, brighter near the top.
  g.lineCap = "round";
  for (let i = 0; i < 900; i++) {
    const x = X0 + rand() * (X1 - X0);
    const y = EPI + 10 + Math.pow(rand(), 1.3) * 1150;
    const a = (rand() - 0.5) * 1.4 + (rand() < 0.5 ? 0 : Math.PI / 2) * 0.4;
    const L = 30 + rand() * 90;
    const depth = clamp(1 - (y - EPI) / 1100);
    g.strokeStyle = `rgba(255,${Math.round(200 + 40 * depth)},${Math.round(190 + 30 * depth)},${(0.05 + 0.14 * depth * rand()).toFixed(3)})`;
    g.lineWidth = 1.5 + rand() * 4.5;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + (rand() - 0.5) * 20, y + Math.sin(a) * L * 0.5 + (rand() - 0.5) * 20, x + Math.cos(a) * L, y + Math.sin(a) * L);
    g.stroke();
  }
  // Fibroblast nuclei, a few.
  for (let i = 0; i < 70; i++) {
    const x = X0 + rand() * (X1 - X0);
    const y = EPI + 40 + rand() * 700;
    g.fillStyle = `rgba(80,20,60,${(0.25 + rand() * 0.25).toFixed(2)})`;
    g.beginPath();
    g.ellipse(x, y, 7 + rand() * 4, 2.5, (rand() - 0.5) * 0.8, 0, TAU);
    g.fill();
  }
  // Small capillary loops up into the ridges.
  g.strokeStyle = "rgba(200,20,40,0.32)";
  g.lineWidth = 3;
  for (let x = X0 + 30; x < X1; x += 92) {
    const top = ridge(x) + 26;
    g.beginPath();
    g.moveTo(x - 8, top + 70);
    g.bezierCurveTo(x - 10, top, x + 10, top, x + 8, top + 70);
    g.stroke();
  }
  // A hair follicle on the left and a sweat gland on the right: what the scar will not have.
  const follicle = (x) => {
    const sheath = g.createLinearGradient(x - 26, 0, x + 26, 0);
    sheath.addColorStop(0, "rgba(120,40,40,0.7)");
    sheath.addColorStop(0.5, "rgba(240,190,170,0.85)");
    sheath.addColorStop(1, "rgba(120,40,40,0.7)");
    g.fillStyle = sheath;
    g.beginPath();
    g.moveTo(x - 20, SURF);
    g.bezierCurveTo(x - 24, 800, x - 40, 1080, x - 46, 1180);
    g.bezierCurveTo(x - 50, 1250, x + 44, 1250, x + 36, 1180);
    g.bezierCurveTo(x + 30, 1080, x + 20, 800, x + 20, SURF);
    g.fill();
    g.strokeStyle = "#3a1a14";
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(x, 1190);
    g.bezierCurveTo(x - 4, 900, x - 2, 600, x + 10, SURF - 4);
    g.lineTo(x + 70, SURF - 170);
    g.stroke();
  };
  follicle(250);
  const gland = (x) => {
    g.strokeStyle = "rgba(255,210,200,0.5)";
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(x, SURF);
    for (let y = SURF; y < 1120; y += 20) g.lineTo(x + 10 * Math.sin(y / 30), y);
    g.stroke();
    for (let k = 0; k < 16; k++) {
      g.beginPath();
      g.arc(x + 20 * Math.cos(k * 1.7), 1170 + 30 * Math.sin(k * 2.3), 18, 0, TAU);
      g.stroke();
    }
  };
  gland(842);

  // Epidermis: packed cells, columnar and darker at the base, flat and pale near the top.
  g.save();
  g.beginPath();
  g.moveTo(X0, surf(X0));
  for (let x = X0; x <= X1; x += 6) g.lineTo(x, surf(x));
  for (let x = X1; x >= X0; x -= 6) g.lineTo(x, ridge(x));
  g.closePath();
  const epi = g.createLinearGradient(0, SURF, 0, EPI + 20);
  epi.addColorStop(0, "#f7dccb");
  epi.addColorStop(1, "#dc9d92");
  g.fillStyle = epi;
  g.fill();
  g.clip();
  for (let row = 0; row < 12; row++) {
    const hgt = 25 - row * 1.1;
    const wid = 30 + row * 2.4;
    for (let x = X0 + (row % 2) * wid * 0.5; x < X1; x += wid) {
      const yBase = ridge(x) - 12 - row * (hgt - 2);
      if (yBase < surf(x) + 14) continue;
      const u = row / 11;
      const cell = g.createRadialGradient(x - wid * 0.15, yBase - hgt * 0.2, 1, x, yBase, wid * 0.6);
      cell.addColorStop(0, `rgb(${Math.round(mix(244, 252, u))},${Math.round(mix(196, 230, u))},${Math.round(mix(184, 214, u))})`);
      cell.addColorStop(1, `rgb(${Math.round(mix(196, 226, u))},${Math.round(mix(120, 170, u))},${Math.round(mix(118, 150, u))})`);
      g.fillStyle = cell;
      g.strokeStyle = "rgba(120,60,60,0.35)";
      g.lineWidth = 1.5;
      g.beginPath();
      g.ellipse(x + (rand() - 0.5) * 3, yBase, wid / 2 - 1.5, hgt / 2 - 1.2, (rand() - 0.5) * 0.15, 0, TAU);
      g.fill();
      g.stroke();
      if (row < 8) {
        g.fillStyle = `rgba(110,50,110,${(0.5 - row * 0.05).toFixed(2)})`;
        g.beginPath();
        g.ellipse(x, yBase, wid * 0.14, hgt * 0.2, 0, 0, TAU);
        g.fill();
      }
    }
  }
  g.restore();
  // The horny top layer: thin, pale, flaking, with a wet sheen on its edge.
  g.fillStyle = "rgba(250,236,222,0.92)";
  g.beginPath();
  g.moveTo(X0, surf(X0) - 4);
  for (let x = X0; x <= X1; x += 6) g.lineTo(x, surf(x) - 4);
  for (let x = X1; x >= X0; x -= 6) g.lineTo(x, surf(x) + 13);
  g.fill();
  g.strokeStyle = "rgba(200,160,150,0.6)";
  g.lineWidth = 1.2;
  for (let k = 1; k < 4; k++) {
    g.beginPath();
    for (let x = X0; x <= X1; x += 8) g.lineTo(x, surf(x) - 4 + k * 4 + Math.sin(x / 13 + k) * 0.8);
    g.stroke();
  }
  g.strokeStyle = "rgba(255,255,255,0.75)";
  g.lineWidth = 2;
  g.beginPath();
  for (let x = X0; x <= X1; x += 6) g.lineTo(x, surf(x) - 4);
  g.stroke();

  // The capillary: a tube with a translucent wall and dark red inside.
  const lumen = g.createLinearGradient(0, VES_TOP, 0, VES_BOT);
  lumen.addColorStop(0, "#5a0710");
  lumen.addColorStop(0.5, "#8c0f1c");
  lumen.addColorStop(1, "#3e0409");
  g.fillStyle = lumen;
  g.fillRect(X0, VES_TOP, X1 - X0, VES_BOT - VES_TOP);
  for (const [y, dir] of [
    [VES_TOP, -1],
    [VES_BOT, 1],
  ]) {
    const wall = g.createLinearGradient(0, y, 0, y + dir * 12);
    wall.addColorStop(0, "rgba(255,190,190,0.9)");
    wall.addColorStop(1, "rgba(200,90,100,0.2)");
    g.fillStyle = wall;
    g.fillRect(X0, Math.min(y, y + dir * 12), X1 - X0, 12);
    for (let x = X0 + 20; x < X1; x += 70 + rand() * 40) {
      g.fillStyle = "rgba(120,40,90,0.5)";
      g.beginPath();
      g.ellipse(x, y + dir * 6, 14, 3.5, 0, 0, TAU);
      g.fill();
    }
  }

  if (!healed) {
    // The wound: cut out, then a wet dark back wall and raw edges.
    g.save();
    gapPath(g);
    g.clip();
    const back = g.createLinearGradient(0, SURF, 0, VES_TOP);
    back.addColorStop(0, "#2a0a0c");
    back.addColorStop(1, "#4a0d14");
    g.fillStyle = back;
    g.fillRect(300, SURF - 40, 480, VES_TOP - SURF + 60);
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(255,140,130,${(0.04 + rand() * 0.08).toFixed(3)})`;
      g.lineWidth = 2 + rand() * 6;
      const y = SURF + rand() * 480;
      g.beginPath();
      g.moveTo(wallL(y), y);
      g.quadraticCurveTo(540, y + (rand() - 0.5) * 60, wallR(y), y + (rand() - 0.5) * 40);
      g.stroke();
    }
    g.restore();
    for (const side of [-1, 1]) {
      const wx = side < 0 ? wallL : wallR;
      g.lineCap = "round";
      for (const [wd, col] of [
        [16, "rgba(150,10,20,0.9)"],
        [7, "rgba(230,60,60,0.95)"],
        [2.5, "rgba(255,190,170,0.8)"],
      ]) {
        g.strokeStyle = col;
        g.lineWidth = wd;
        g.beginPath();
        for (let y = SURF - 6; y <= VES_TOP + 4; y += 8) g.lineTo(wx(y) + side * (wd / 3) + Math.sin(y / 9) * 1.6, y);
        g.stroke();
      }
    }
  }
  return c;
}

// ── The fingertip ───────────────────────────────────────────────────────────
// Drawn in screen pixels; its own transform scales it about the scrape for the dive.
export const SCRAPE = { x: 540, y: 640 };
function fingerShape(g) {
  g.beginPath();
  g.moveTo(296, 2000);
  g.lineTo(296, 660);
  g.bezierCurveTo(296, 420, 400, 318, 540, 316);
  g.bezierCurveTo(680, 318, 784, 420, 784, 660);
  g.lineTo(784, 2000);
  g.closePath();
}
function paintFinger() {
  const c = Object.assign(document.createElement("canvas"), { width: 1080, height: 1920 });
  const g = c.getContext("2d");
  // A soft shadow on the dark behind it.
  g.save();
  g.filter = "blur(40px)";
  g.fillStyle = "rgba(0,0,0,0.6)";
  g.translate(40, 50);
  fingerShape(g);
  g.fill();
  g.restore();
  g.save();
  fingerShape(g);
  g.clip();
  const across = g.createLinearGradient(296, 0, 784, 0);
  across.addColorStop(0, "#7a3a2c");
  across.addColorStop(0.12, "#c27a5e");
  across.addColorStop(0.42, "#eab494");
  across.addColorStop(0.7, "#d9997a");
  across.addColorStop(0.92, "#a85a46");
  across.addColorStop(1, "#e7967e");
  g.fillStyle = across;
  g.fillRect(0, 0, 1080, 1920);
  // Key light from the upper left, warm; blood under the skin at the edges.
  const key = g.createRadialGradient(440, 500, 20, 470, 560, 520);
  key.addColorStop(0, "rgba(255,236,220,0.55)");
  key.addColorStop(0.5, "rgba(255,210,180,0.15)");
  key.addColorStop(1, "rgba(255,210,180,0)");
  g.fillStyle = key;
  g.fillRect(0, 0, 1080, 1920);
  const tip = g.createRadialGradient(540, 360, 10, 540, 400, 160);
  tip.addColorStop(0, "rgba(255,120,110,0.25)");
  tip.addColorStop(1, "rgba(255,120,110,0)");
  g.fillStyle = tip;
  g.fillRect(0, 0, 1080, 1920);
  // Fingerprint: a whorl of fine ridges.
  g.lineWidth = 2.2;
  for (let k = 0; k < 34; k++) {
    const r = 24 + k * 17;
    g.strokeStyle = `rgba(110,50,35,${(0.2 - k * 0.003).toFixed(3)})`;
    g.beginPath();
    g.ellipse(548, 760, r * 0.78, r, 0.08, Math.PI * 1.02, Math.PI * 1.98 + (k % 3) * 0.3);
    g.stroke();
    g.strokeStyle = `rgba(255,230,210,${(0.1 - k * 0.0015).toFixed(3)})`;
    g.beginPath();
    g.ellipse(548, 762, r * 0.78, r, 0.08, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
  }
  // Darker toward the bottom, where the lettering sits.
  const fade = g.createLinearGradient(0, 860, 0, 1300);
  fade.addColorStop(0, "rgba(10,4,4,0)");
  fade.addColorStop(1, "rgba(10,4,4,0.86)");
  g.fillStyle = fade;
  g.fillRect(0, 0, 1080, 1920);
  g.restore();
  // Rim light on the right edge.
  g.save();
  g.strokeStyle = "rgba(255,190,170,0.5)";
  g.lineWidth = 5;
  g.filter = "blur(3px)";
  g.beginPath();
  g.moveTo(560, 318);
  g.bezierCurveTo(690, 324, 782, 420, 780, 660);
  g.lineTo(780, 980);
  g.stroke();
  g.restore();
  return c;
}
function paintScrape() {
  const c = Object.assign(document.createElement("canvas"), { width: 1080, height: 1920 });
  const g = c.getContext("2d");
  const rand = rng(31);
  // A ragged outline: an uneven blob, wider on one side, its edge torn.
  const outline = (grow, jag, seed) => {
    const r2 = rng(seed);
    const pts = [];
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * TAU;
      const k = 1 + 0.22 * Math.sin(a * 2 + 0.6) + 0.1 * Math.sin(a * 5 + 1.7) + (r2() - 0.5) * jag;
      pts.push([544 + Math.cos(a) * (128 + grow) * k, 642 + Math.sin(a) * (58 + grow * 0.6) * k * (Math.cos(a) > 0.3 ? 1.12 : 1)]);
    }
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
  };
  // Torn, lifted skin around the rim: pale and whitish, ragged.
  outline(16, 0.3, 5);
  g.fillStyle = "rgba(255,226,210,0.75)";
  g.fill();
  outline(4, 0.26, 9);
  g.fillStyle = "rgba(214,120,104,0.9)";
  g.fill();
  // The raw bed: blotches of pink, red and dark red, no stripes.
  g.save();
  outline(0, 0.24, 13);
  g.clip();
  const raw = g.createRadialGradient(530, 636, 6, 544, 642, 150);
  raw.addColorStop(0, "#c8323a");
  raw.addColorStop(0.55, "#d9535a");
  raw.addColorStop(1, "#ef8f86");
  g.fillStyle = raw;
  g.fillRect(380, 540, 330, 210);
  for (let i = 0; i < 90; i++) {
    const x = 420 + rand() * 250;
    const y = 590 + rand() * 110;
    const r = 4 + rand() * 18;
    const col = [
      [150, 18, 30],
      [215, 70, 76],
      [240, 150, 140],
      [110, 6, 18],
    ][Math.floor(rand() * 4)];
    const blot = g.createRadialGradient(x, y, 0, x, y, r);
    blot.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${(0.35 + rand() * 0.4).toFixed(2)})`);
    blot.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
    g.fillStyle = blot;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // A few short, uneven scratches, mostly along the drag, some broken.
  for (let i = 0; i < 26; i++) {
    const x = 430 + rand() * 210;
    const y = 600 + rand() * 90;
    const L = 14 + rand() * 50;
    g.strokeStyle = `rgba(120,8,20,${(0.25 + rand() * 0.35).toFixed(2)})`;
    g.lineWidth = 1 + rand() * 2.5;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + L * 0.5, y + (rand() - 0.5) * 8, x + L, y + 2 + rand() * 6);
    g.stroke();
  }
  // Pinpoint bleeding: dark dots with a wet glint.
  for (let i = 0; i < 40; i++) {
    const x = 440 + rand() * 200;
    const y = 600 + rand() * 90;
    const r = 1.5 + rand() * 3.5;
    g.fillStyle = "#8a0614";
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
    g.fillStyle = "rgba(255,220,220,0.75)";
    g.beginPath();
    g.arc(x - r * 0.3, y - r * 0.35, r * 0.3, 0, TAU);
    g.fill();
  }
  // A wet sheen across the bed, from the key light.
  const wet = g.createLinearGradient(440, 590, 600, 690);
  wet.addColorStop(0, "rgba(255,240,235,0.32)");
  wet.addColorStop(0.4, "rgba(255,240,235,0)");
  g.fillStyle = wet;
  g.fillRect(380, 540, 330, 210);
  g.restore();
  // Shreds of skin curling off the upper rim.
  g.strokeStyle = "rgba(255,240,228,0.9)";
  g.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (1.08 + i * 0.1);
    const x = 544 + Math.cos(a) * 150;
    const y = 642 + Math.sin(a) * 74;
    g.lineWidth = 2 + rand() * 2;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + (rand() - 0.5) * 14, y - 8 - rand() * 8, x + (rand() - 0.5) * 20, y - 3);
    g.stroke();
  }
  return c;
}
function paintScar() {
  const c = Object.assign(document.createElement("canvas"), { width: 1080, height: 1920 });
  const g = c.getContext("2d");
  g.filter = "blur(4px)";
  g.fillStyle = "rgba(246,196,188,0.9)";
  g.beginPath();
  g.moveTo(440, 640);
  g.bezierCurveTo(500, 612, 590, 616, 646, 640);
  g.bezierCurveTo(590, 660, 500, 664, 440, 640);
  g.fill();
  g.filter = "none";
  return c;
}

// ── The world ───────────────────────────────────────────────────────────────
export function createTissue(canvas) {
  const g = canvas.getContext("2d");
  const section = paintSection(false);
  const healedSection = paintSection(true);
  const finger = paintFinger();
  const scrape = paintScrape();
  const scar = paintScar();
  const rand = rng(5);

  // Red cells flowing in the capillary.
  const flow = Array.from({ length: 30 }, (_, i) => ({ x: i * 52 + rand() * 20, y: VES_Y + (rand() - 0.5) * 50, tilt: rand() * TAU, spin: 0.6 + rand() }));
  // Red cells that rise into the wound: each has a place, and comes up from the break as the blood rises.
  const spill = [];
  while (spill.length < 34) {
    const y = SURF + 20 + rand() * (VES_TOP - SURF - 30);
    const x = wallL(y) + 22 + rand() * (wallR(y) - wallL(y) - 44);
    spill.push({ x, y, tilt: rand() * TAU, from: [500 + rand() * 80, VES_Y + (rand() - 0.5) * 30], at: clamp((VES_TOP - y) / (VES_TOP - SURF)) * 0.82 + rand() * 0.06 });
  }
  // Platelets: afloat in the blood, then stuck to the walls and the break.
  const plates = [];
  for (let i = 0; i < 26; i++) {
    const y = SURF + 60 + rand() * (VES_TOP - SURF - 70);
    const x = wallL(y) + 26 + rand() * (wallR(y) - wallL(y) - 52);
    let to;
    if (i < 9) to = [wallL(VES_TOP) + 8 + i * 15, VES_TOP - 4 - rand() * 10];
    else {
      const ty = SURF + 120 + rand() * 440;
      to = i % 2 ? [wallL(ty) + 9, ty] : [wallR(ty) - 9, ty];
    }
    plates.push({ x, y, to, tilt: rand() * TAU, at: rand() * 0.6, from: [520 + rand() * 40, VES_Y] });
  }
  // Fibrin: strands from wall to wall, and short ones between them.
  const strands = [];
  for (let i = 0; i < 22; i++) {
    const y0 = SURF + 30 + rand() * 470;
    const y1 = Math.min(VES_TOP - 6, Math.max(SURF + 30, y0 + (rand() - 0.5) * 380));
    const ltr = rand() < 0.5;
    const a = [wallL(ltr ? y0 : y1) + 4, ltr ? y0 : y1];
    const b = [wallR(ltr ? y1 : y0) - 4, ltr ? y1 : y0];
    strands.push({ a, b, c: [540 + (rand() - 0.5) * 120, (a[1] + b[1]) / 2 + (rand() - 0.5) * 80], at: (i / 22) * 0.7 + rand() * 0.05, w: 1.6 + rand() * 1.8 });
  }
  // Germs: from the air into the edges of the clot.
  const bugs = [
    { from: [310, 330], to: [404, 540], spin: 2.2, at: 0 },
    { from: [760, 300], to: [672, 548], spin: -1.7, at: 0.12 },
    { from: [840, 380], to: [690, 590], spin: 1.3, at: 0.3 },
  ];
  // The new tissue's fibres: tangled, then combed.
  const fibres = Array.from({ length: 70 }, () => {
    const y = 600 + rand() * 330;
    return { x: wallL(y) + 20 + rand() * (wallR(y) - wallL(y) - 40), y, a: (rand() - 0.5) * Math.PI, L: 40 + rand() * 60, row: Math.round((y - 600) / 22) * 22 + 604 };
  });
  // The tongues of moving skin cells: rows from each edge.
  const tongueCells = [];
  for (const side of [-1, 1]) {
    for (let row = 0; row < 5; row++) {
      for (let k = 0; k < 14; k++) {
        tongueCells.push({ side, row, k, j: (rand() - 0.5) * 4 });
      }
    }
  }


  function plateAt(p, S, t) {
    const level = clamp(S.blood);
    const q = smooth((level - p.at * 0.6) / 0.25);
    const stick = smooth((S.plug - p.at) / 0.4);
    const fx = mix(p.from[0], p.x, q) + 4 * Math.sin(t * 1.7 + p.tilt) * (1 - stick);
    const fy = mix(p.from[1], p.y, q) + 4 * Math.cos(t * 1.4 + p.tilt) * (1 - stick);
    return { x: mix(fx, p.to[0], stick), y: mix(fy, p.to[1], stick), q, stick };
  }
  function bugAt(i, S, t) {
    const b = bugs[i];
    const e = smooth((S.bugs - b.at) / 0.6);
    return { x: mix(b.from[0], b.to[0], e) + 6 * Math.sin(t * 3 + i) * (1 - e * 0.5), y: mix(b.from[1], b.to[1], e), e };
  }
  const toScreen = (cam, x, y) => [(x - cam.x) * cam.z + 540, (y - cam.y) * cam.z + 960];

  function drawRbc(x, y, tilt, size = 44, alpha = 1) {
    const sq = 0.35 + 0.65 * Math.abs(Math.cos(tilt));
    g.save();
    g.globalAlpha = alpha;
    g.translate(x, y);
    g.rotate(tilt * 0.6);
    g.scale(1, sq);
    g.drawImage(RBC, -size / 2, -size / 2, size, size);
    g.restore();
  }

  function drawSection(S, t) {
    g.drawImage(section, BASE.x0, BASE.y0, BASE.x1 - BASE.x0, BASE.y1 - BASE.y0);
    // Red cells in the capillary.
    g.save();
    g.beginPath();
    g.rect(BASE.x0, VES_TOP + 6, BASE.x1 - BASE.x0, VES_BOT - VES_TOP - 12);
    g.clip();
    const run = t * 70 * S.flow;
    for (const c of flow) {
      const x = ((((c.x + run) % 1560) + 1560) % 1560) - 220;
      drawRbc(x, c.y + 4 * Math.sin(t * 1.3 + c.tilt), c.tilt + t * c.spin * 0.6, 44, 0.95);
    }
    g.restore();

    // Inside the wound.
    g.save();
    gapPath(g, SURF - 7, VES_TOP + 10);
    g.clip();
    const level = clamp(S.blood);
    const top = mix(VES_TOP + 10, SURF + 2, level);
    if (level > 0) {
      const plasma = g.createLinearGradient(0, top, 0, VES_TOP);
      plasma.addColorStop(0, "rgba(170,20,30,0.55)");
      plasma.addColorStop(1, "rgba(120,10,20,0.75)");
      g.fillStyle = plasma;
      g.fillRect(300, top, 480, VES_TOP + 20 - top);
      // A wet meniscus on top while it is still liquid.
      g.strokeStyle = `rgba(255,170,160,${(0.5 * (1 - S.scab)).toFixed(3)})`;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(wallL(top), top + 2);
      g.quadraticCurveTo(540, top - 8, wallR(top), top + 2);
      g.stroke();
    }
    for (const c of spill) {
      const q = smooth((level - c.at) / 0.2);
      if (q <= 0) continue;
      const x = mix(c.from[0], c.x, q) + 3 * Math.sin(t * 1.1 + c.tilt) * (1 - S.clot);
      const y = mix(c.from[1], c.y, q) + 3 * Math.cos(t * 0.9 + c.tilt) * (1 - S.clot);
      drawRbc(x, y, c.tilt + t * 0.5 * (1 - S.clot), 44, q);
    }
    // Platelets, afloat, then stuck to the walls and switched on.
    for (const p of plates) {
      const { x, y, q, stick } = plateAt(p, S, t);
      if (q <= 0) continue;
      if (S.glowP > 0) {
        const halo = g.createRadialGradient(x, y, 2, x, y, 30);
        halo.addColorStop(0, `rgba(255,230,160,${(0.55 * S.glowP).toFixed(3)})`);
        halo.addColorStop(1, "rgba(255,230,160,0)");
        g.fillStyle = halo;
        g.fillRect(x - 30, y - 30, 60, 60);
      }
      g.save();
      g.translate(x, y);
      g.rotate(p.tilt + t * 0.8 * (1 - stick));
      g.globalAlpha = q * (1 - stick);
      g.drawImage(PLATELET, -12, -12, 24, 24);
      g.globalAlpha = q * stick;
      const sz = 22 + 6 * stick;
      g.drawImage(SPIKY, -sz / 2, -sz / 2, sz, sz);
      g.restore();
    }
    // The clot setting: the blood darkens and goes matte.
    if (S.clot > 0) {
      g.fillStyle = `rgba(60,4,10,${(0.5 * S.clot).toFixed(3)})`;
      g.fillRect(300, top, 480, VES_TOP + 20 - top);
    }
    // Fibrin: pale strands spinning across, glowing faintly.
    if (S.fibrin > 0) {
      g.lineCap = "round";
      for (const s of strands) {
        const u = smooth((S.fibrin - s.at) / 0.3);
        if (u <= 0) continue;
        const pts = [];
        for (let k = 0; k <= 24 * u; k++) {
          const v = k / 24;
          pts.push([(1 - v) * (1 - v) * s.a[0] + 2 * (1 - v) * v * s.c[0] + v * v * s.b[0], (1 - v) * (1 - v) * s.a[1] + 2 * (1 - v) * v * s.c[1] + v * v * s.b[1]]);
        }
        for (const [wd, col] of [
          [s.w * 4, "rgba(255,220,190,0.12)"],
          [s.w, `rgba(255,244,228,${(0.85 - 0.35 * S.clot).toFixed(3)})`],
        ]) {
          g.strokeStyle = col;
          g.lineWidth = wd;
          g.beginPath();
          pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
          g.stroke();
        }
      }
    }
    // New tissue rising from the base: healing pink, bumpy, with new capillary loops.
    if (S.gran > 0) {
      const gt = mix(VES_TOP + 6, 582, S.gran);
      g.save();
      g.beginPath();
      g.moveTo(wallL(gt) - 4, gt);
      for (let x = wallL(gt); x <= wallR(gt); x += 8) g.lineTo(x, gt - 10 * Math.abs(Math.sin(x / 22 + 0.4)) - 4 * Math.sin(x / 9));
      g.lineTo(wallR(gt) + 4, gt);
      g.lineTo(wallR(VES_TOP) + 6, VES_TOP + 10);
      g.lineTo(wallL(VES_TOP) - 6, VES_TOP + 10);
      g.closePath();
      const pinkTop = mix(1, 0, S.pale);
      const tissue = g.createLinearGradient(0, gt - 12, 0, VES_TOP);
      tissue.addColorStop(0, `rgb(${Math.round(mix(236, 226, S.pale))},${Math.round(mix(128, 168, S.pale))},${Math.round(mix(150, 160, S.pale))})`);
      tissue.addColorStop(1, `rgb(${Math.round(mix(176, 196, S.pale))},${Math.round(mix(60, 128, S.pale))},${Math.round(mix(88, 126, S.pale))})`);
      g.fillStyle = tissue;
      g.fill();
      g.clip();
      // Granules: the bumpy, wet surface of new tissue.
      const gr = rng(77);
      for (let i = 0; i < 160; i++) {
        const y = 580 + gr() * 380;
        const x = wallL(y) + gr() * (wallR(y) - wallL(y));
        const r = 5 + gr() * 9;
        const blob = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.5, x, y, r);
        blob.addColorStop(0, `rgba(255,220,220,${(0.45 * pinkTop).toFixed(3)})`);
        blob.addColorStop(1, "rgba(255,150,170,0)");
        g.fillStyle = blob;
        g.beginPath();
        g.arc(x, y, r, 0, TAU);
        g.fill();
      }
      // New capillary loops grow up into it.
      g.lineCap = "round";
      for (const [x, k, reach, lean] of [
        [494, 0, 0.62, -30],
        [548, 0.12, 0.9, 24],
        [596, 0.25, 0.5, 40],
      ]) {
        const h = clamp((S.gran - k) / 0.7) * (VES_TOP - 620) * reach;
        if (h <= 4) continue;
        g.strokeStyle = `rgba(205,24,44,${(0.6 * (1 - S.comb)).toFixed(3)})`;
        g.lineWidth = 3.5;
        g.beginPath();
        g.moveTo(x - 10, VES_TOP);
        g.bezierCurveTo(x - 30 + lean * 0.3, VES_TOP - h * 0.6, x - 26 + lean, VES_TOP - h * 1.25, x + lean * 0.5, VES_TOP - h);
        g.bezierCurveTo(x + 26 + lean, VES_TOP - h * 0.8, x + 30, VES_TOP - h * 0.4, x + 10, VES_TOP);
        g.stroke();
      }
      // Collagen in the new tissue: a tangle, combed straight as it is remodelled.
      for (const f of fibres) {
        if (f.y < gt + 8) continue;
        const a = mix(f.a, 0, smooth(S.comb));
        const y = mix(f.y, f.row, smooth(S.comb));
        const L = mix(f.L, f.L * 1.8, smooth(S.comb));
        g.strokeStyle = `rgba(255,${Math.round(mix(214, 238, S.pale))},${Math.round(mix(214, 230, S.pale))},${(0.35 + 0.3 * S.comb).toFixed(3)})`;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(f.x - Math.cos(a) * L * 0.5, y - Math.sin(a) * L * 0.5);
        g.quadraticCurveTo(f.x + (1 - S.comb) * 10, y + (1 - S.comb) * 12, f.x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5);
        g.stroke();
      }
      g.restore();
    }
    g.restore();

    // Healing over: the dermis closes over the wound's raw walls.
    if (S.walls > 0) {
      g.save();
      g.globalAlpha = clamp(S.walls);
      g.beginPath();
      for (const side of [-1, 1]) {
        const w = side < 0 ? wallL : wallR;
        g.moveTo(w(SURF - 8) + side * 24, SURF - 8);
        g.lineTo(w(VES_TOP) + side * 24, VES_TOP + 2);
        g.lineTo(w(VES_TOP) - side * 14, VES_TOP + 2);
        g.lineTo(w(SURF - 8) - side * 14, SURF - 8);
        g.closePath();
      }
      g.clip();
      g.drawImage(healedSection, BASE.x0, BASE.y0, BASE.x1 - BASE.x0, BASE.y1 - BASE.y0);
      g.restore();
    }
    // Germs (drawn over the wound's edge, so they can come out of the air).
    for (let i = 0; i < bugs.length; i++) {
      const b = bugs[i];
      let { x, y, e } = bugAt(i, S, t);
      if (e <= 0) continue;
      let a = 1 - smooth((S.cleared - 0.2 * i) / 0.5);
      if (i === 1 && S.eat > 0.45) {
        // Taken in: it rides inside the white cell, dimming.
        const k = smooth((S.eat - 0.45) / 0.4);
        x = mix(x, S.nx + 4, k);
        y = mix(y, S.ny - 8, k);
        a *= 1 - 0.65 * smooth((S.eat - 0.75) / 0.25);
      }
      if (a <= 0) continue;
      g.save();
      g.globalAlpha = a;
      g.translate(x, y);
      const halo = g.createRadialGradient(0, 0, 1, 0, 0, 16);
      halo.addColorStop(0, "rgba(214,240,110,0.45)");
      halo.addColorStop(1, "rgba(214,240,110,0)");
      g.fillStyle = halo;
      g.fillRect(-16, -16, 32, 32);
      g.rotate(b.spin * (1 - e) * 2 + 0.3 * Math.sin(t * 2.4 + i));
      g.drawImage(BUG, -14, -14, 28, 28);
      g.restore();
    }
    if (S.neut > 0) drawNeutrophil(S, t);

    // The scab: the clot's top, dried to a glossy brown crust.
    if (S.scab > 0) drawScab(S);

    // The tongues of skin cells crawling in from the edges, under the scab.
    if (S.kera > 0) {
      for (const c of tongueCells) {
        const lead = mix(0, 141, smooth(S.kera)); // how far each tongue has come from its edge
        const depth = c.k * 13 + Math.abs(c.row - 2) * 10;
        const along = lead - depth;
        if (along < -30) continue;
        const y = 530 + c.row * 13 + c.j;
        const edge = c.side < 0 ? wallL(y) - 30 : wallR(y) + 30;
        const x = edge - c.side * (along + 30) + (c.side < 0 ? 0 : 0);
        const lim = c.side < 0 ? Math.min(x, 538) : Math.max(x, 542);
        const leading = c.k === 0 ? 1 : 0;
        g.save();
        g.globalAlpha = clamp((along + 30) / 30) * (1 - S.mature);
        g.translate(lim, y);
        g.scale(1 + 0.4 * leading, 1 - 0.25 * leading);
        g.drawImage(KERA, -20, -14, 40, 28);
        g.restore();
      }
    }
    // The new skin grows thicker and matures where the wound was.
    if (S.mature > 0) {
      g.save();
      g.globalAlpha = S.mature;
      const top = SURF - 2;
      const skin = g.createLinearGradient(0, top, 0, 600);
      skin.addColorStop(0, "#f9e6d8");
      skin.addColorStop(0.15, "#f1cfc0");
      skin.addColorStop(1, "#dca29a");
      g.fillStyle = skin;
      g.beginPath();
      g.moveTo(wallL(top) - 8, surf(wallL(top)) - 4);
      g.lineTo(wallR(top) + 8, surf(wallR(top)) - 4);
      g.lineTo(wallR(592) + 6, 592);
      g.lineTo(wallL(592) - 6, 592);
      g.closePath();
      g.fill();
      // Its cells, in flat rows: no ridges underneath (f9).
      const kr = rng(9);
      for (let row = 0; row < 6; row++) {
        for (let x = 384 + (row % 2) * 16; x < 698; x += 32) {
          const y = 576 - row * 19;
          g.fillStyle = `rgba(${Math.round(mix(220, 250, row / 5))},${Math.round(mix(150, 222, row / 5))},${Math.round(mix(146, 206, row / 5))},0.9)`;
          g.strokeStyle = "rgba(120,60,60,0.3)";
          g.beginPath();
          g.ellipse(x + (kr() - 0.5) * 3, y, 15, 8, 0, 0, TAU);
          g.fill();
          g.stroke();
        }
      }
      g.fillStyle = "rgba(250,236,222,0.95)";
      g.fillRect(wallL(top) - 8, surf(540) - 6, wallR(top) - wallL(top) + 16, 14);
      g.restore();
    }
    // The scar: a band of tissue paler and denser than the dermis, its fibres packed in parallel rows (f9). Matte.
    if (S.scar > 0) {
      g.save();
      g.globalAlpha = S.scar;
      const top = 596;
      const bot = VES_TOP - 10;
      g.beginPath();
      for (let y = top; y <= bot; y += 8) g.lineTo(wallL(y) + 4 + 3 * Math.sin(y / 13), y);
      for (let y = bot; y >= top; y -= 8) g.lineTo(wallR(y) - 4 + 3 * Math.sin(y / 11 + 2), y);
      g.closePath();
      const band = g.createLinearGradient(0, top, 0, bot);
      band.addColorStop(0, "#e2aaa2");
      band.addColorStop(1, "#c4847f");
      g.fillStyle = band;
      g.fill();
      g.clip();
      const fr = rng(19);
      g.lineCap = "round";
      for (let y = top + 3; y < bot; y += 4.5 + fr() * 1.5) {
        let x = wallL(y) + 4 - fr() * 20;
        const end = wallR(y) + 4;
        while (x < end) {
          const L = 30 + fr() * 70;
          g.strokeStyle = `rgba(${Math.round(240 + 12 * fr())},${Math.round(196 + 22 * fr())},${Math.round(188 + 20 * fr())},${(0.18 + 0.16 * fr()).toFixed(3)})`;
          g.lineWidth = 1.3 + fr() * 1.2;
          g.beginPath();
          g.moveTo(x, y + (fr() - 0.5) * 1.5);
          g.lineTo(x + L, y + (fr() - 0.5) * 1.5);
          g.stroke();
          x += L + 2 + fr() * 6;
        }
      }
      g.restore();
    }
  }

  function drawScab(S) {
    const off = smooth(S.scabOff);
    g.save();
    g.globalAlpha = clamp(S.scab) * (1 - smooth((S.scabOff - 0.55) / 0.45));
    g.translate(372 - off * 460, SURF - 10 - off * 60);
    g.rotate(-0.22 * off);
    const thick = mix(16, 70, smooth(S.scab));
    g.beginPath();
    g.moveTo(-4, 4);
    g.bezierCurveTo(80, -30, 260, -30, 340, 4);
    g.lineTo(326, thick * 0.85);
    g.bezierCurveTo(250, thick * 1.05, 90, thick * 1.05, 14, thick * 0.85);
    g.closePath();
    const crust = g.createLinearGradient(0, -24, 0, thick);
    crust.addColorStop(0, "#7a3a24");
    crust.addColorStop(0.35, "#4a160f");
    crust.addColorStop(1, "#2a0607");
    g.fillStyle = crust;
    g.fill();
    g.clip();
    // Cracks and a glossy sheen.
    g.strokeStyle = "rgba(20,4,2,0.6)";
    g.lineWidth = 2;
    const cr = rng(4);
    for (let i = 0; i < 14; i++) {
      const x = 20 + cr() * 300;
      g.beginPath();
      g.moveTo(x, -20);
      g.lineTo(x + (cr() - 0.5) * 40, thick * 0.5);
      g.stroke();
    }
    const sheen = g.createLinearGradient(0, -26, 0, 10);
    sheen.addColorStop(0, "rgba(255,200,170,0.4)");
    sheen.addColorStop(1, "rgba(255,200,170,0)");
    g.fillStyle = sheen;
    g.fillRect(-10, -30, 360, 40);
    g.restore();
  }

  function drawNeutrophil(S, t) {
    const R = 38;
    const x = S.nx;
    const y = S.ny;
    const dir = S.ndir;
    g.save();
    g.globalAlpha = clamp(S.neut);
    // Its outline: a soft wobble, a bulge where it reaches, and two arms that cup and close around the germ.
    const cup = clamp(S.eat / 0.5);
    const close = smooth((S.eat - 0.4) / 0.5);
    const squeeze = S.squeeze;
    g.beginPath();
    for (let i = 0; i <= 72; i++) {
      const th = (i / 72) * TAU;
      const d = Math.atan2(Math.sin(th - dir), Math.cos(th - dir));
      let r = R * (1 + 0.06 * Math.sin(3 * th + t * 2.1) + 0.05 * Math.sin(5 * th - t * 2.9));
      r += R * 0.55 * S.reach * Math.pow(Math.max(0, Math.cos(d)), 6);
      r += R * 0.9 * cup * (1 - close) * (Math.exp(-((d - 0.6) ** 2) / 0.05) + Math.exp(-((d + 0.6) ** 2) / 0.05));
      r += R * 0.75 * close * Math.exp(-(d ** 2) / 0.35);
      r -= R * 0.25 * cup * (1 - close) * Math.exp(-(d ** 2) / 0.03);
      const sx = 1 - 0.45 * squeeze;
      const sy = 1 + 0.35 * squeeze;
      const px = x + Math.cos(th) * r * sx;
      const py = y + Math.sin(th) * r * sy;
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.closePath();
    const body = g.createRadialGradient(x - R * 0.35, y - R * 0.4, 2, x, y, R * 1.6);
    body.addColorStop(0, "rgba(246,255,253,0.95)");
    body.addColorStop(0.45, "rgba(176,238,230,0.82)");
    body.addColorStop(1, "rgba(90,190,182,0.7)");
    g.fillStyle = body;
    g.shadowColor = "rgba(127,227,218,0.7)";
    g.shadowBlur = 26;
    g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = "rgba(230,255,252,0.9)";
    g.lineWidth = 2.5;
    g.stroke();
    g.clip();
    // Granules inside.
    const gr = rng(12);
    for (let i = 0; i < 40; i++) {
      const a = gr() * TAU;
      const rr = gr() * R * 0.95;
      g.fillStyle = "rgba(255,255,255,0.5)";
      g.beginPath();
      g.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 1.5 + gr() * 1.5, 0, TAU);
      g.fill();
    }
    // The lobed nucleus: three joined lobes.
    g.fillStyle = "rgba(96,70,170,0.75)";
    for (const [dx, dy, r] of [
      [-14, 5, 11.5],
      [0, -7, 12.5],
      [15, 5, 11],
    ]) {
      g.beginPath();
      g.arc(x + dx * (1 - 0.3 * squeeze), y + dy, r, 0, TAU);
      g.fill();
    }
    g.strokeStyle = "rgba(96,70,170,0.75)";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(x - 14, y + 5);
    g.lineTo(x, y - 7);
    g.lineTo(x + 15, y + 5);
    g.stroke();
    g.restore();
  }

  function drawFinger(F) {
    g.save();
    g.globalAlpha = F.a;
    g.translate(SCRAPE.x + F.dx, SCRAPE.y + F.dy);
    g.scale(F.z, F.z);
    g.translate(-SCRAPE.x, -SCRAPE.y);
    g.drawImage(finger, 0, 0);
    g.globalAlpha = F.a * (1 - F.heal);
    g.drawImage(scrape, 0, 0);
    if (F.bead > 0) {
      // The bead of blood: a dome with a window highlight.
      const bx = F.bx;
      const by = F.by;
      const r = 6 + 16 * F.bead;
      const dome = g.createRadialGradient(bx - r * 0.35, by - r * 0.4, 1, bx, by, r);
      dome.addColorStop(0, "#ff9a8a");
      dome.addColorStop(0.35, "#c3101d");
      dome.addColorStop(1, "#5a0007");
      g.fillStyle = dome;
      g.beginPath();
      g.arc(bx, by, r, 0, TAU);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.85)";
      g.beginPath();
      g.ellipse(bx - r * 0.38, by - r * 0.42, r * 0.22, r * 0.14, -0.6, 0, TAU);
      g.fill();
    }
    g.globalAlpha = F.a * F.heal;
    g.drawImage(scar, 0, 0);
    g.restore();
  }

  return {
    toScreen,
    plate: (i, S, t) => plateAt(plates[i], S, t),
    bug: (i, S, t) => bugAt(i, S, t),
    draw(S, t) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, 1080, 1920);
      const { cam } = S;
      if (S.finger.a > 0.001) drawFinger(S.finger);
      // The section, through the camera; during a dive it is seen through a growing disc in the scrape.
      if (S.sec > 0.001) {
        g.save();
        g.globalAlpha = clamp(S.sec);
        if (S.disc < 1) {
          g.beginPath();
          g.arc(S.discX, S.discY, Math.min(mix(50, 1500, smooth(S.disc)), 690 * cam.z), 0, TAU);
          g.clip();
        }
        g.setTransform(cam.z, 0, 0, cam.z, 540 - cam.x * cam.z, 960 - cam.y * cam.z);
        drawSection(S, t);
        g.restore();
        // Light: a warm key where the work is, and the frame's edges falling off.
        g.save();
        g.globalAlpha = clamp(S.sec);
        g.globalCompositeOperation = "soft-light";
        const key = g.createRadialGradient(S.lx, S.ly, 20, S.lx, S.ly, 700);
        key.addColorStop(0, "rgba(255,240,225,0.75)");
        key.addColorStop(1, "rgba(0,0,0,0.5)");
        g.fillStyle = key;
        g.fillRect(0, 0, 1080, 1920);
        g.restore();
        // The air over the skin stays dark, so the time bar reads.
        g.save();
        const air = g.createLinearGradient(0, 200, 0, 470);
        air.addColorStop(0, `rgba(8,4,6,${(0.55 * S.sec).toFixed(3)})`);
        air.addColorStop(1, "rgba(8,4,6,0)");
        g.fillStyle = air;
        g.fillRect(0, 0, 1080, 470);
        g.restore();
      }
    },
  };
}
