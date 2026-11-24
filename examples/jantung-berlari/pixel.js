// The game screen: a 270 x 480 framebuffer of palette indices, scaled up four times with hard edges by the page
// (image-rendering: pixelated). Everything in the film is drawn into it: sprites, the HUD, the dialogue box, the
// lettering. So there is one pixel size, every edge is hard, and no colour outside the sixteen can appear.
//
//   const fb = new FB();  fb.rect(x, y, w, h, C.red);  fb.blit(sprite, x, y);  fb.text("150", x, y, { font: BIG })
//   present(fb, canvas)                                   // indices to colours, once a frame
//
// Lettering is Press Start 2P rasterised at its own 8 px grid (one font pixel = one game pixel), and a 16 px face made
// from it with Scale2x (the classic pixel-art doubling that rounds the diagonals), so big type is drawn in the same
// size of pixel as everything else instead of being scaled up.

export const W = 270, H = 480;
// PICO-8, in its own order: index = colour.
export const PAL = ["#000000", "#1d2b53", "#7e2553", "#008751", "#ab5236", "#5f574f", "#c2c3c7", "#fff1e8", "#ff004d", "#ffa300", "#ffec27", "#00e436", "#29adff", "#83769c", "#ff77a8", "#ffccaa"];
export const C = { black: 0, navy: 1, plum: 2, green: 3, brown: 4, dark: 5, grey: 6, cream: 7, red: 8, orange: 9, yellow: 10, lime: 11, sky: 12, lav: 13, pink: 14, peach: 15 };
export const CLEAR = 255;

// ── Seeded noise: the same picture every render ───────────────────────────────────────────────────────────────
export const hash = (a, b = 0, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
// The 4 x 4 ordered-dither threshold: a tone between two colours as a pattern of whole pixels, never a gradient.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const dither = (x, y, level) => level > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

export class FB {
  constructor(w = W, h = H) {
    this.w = w;
    this.h = h;
    this.d = new Uint8Array(w * h);
    this.ox = 0; // a camera offset applied to everything drawn (a screen shake, a slide), in whole pixels
    this.oy = 0;
    this.clip = null; // [x0, y0, x1, y1]: nothing is drawn outside it (an inset window's contents)
  }
  clear(c) {
    this.d.fill(c);
    return this;
  }
  px(x, y, c) {
    x = Math.round(x + this.ox);
    y = Math.round(y + this.oy);
    const k = this.clip;
    if (k && (x < k[0] || y < k[1] || x >= k[2] || y >= k[3])) return;
    if (c !== CLEAR && x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
  }
  get(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : CLEAR;
  }
  rect(x, y, w, h, c) {
    x = Math.round(x + this.ox);
    y = Math.round(y + this.oy);
    const k = this.clip ?? [0, 0, this.w, this.h];
    const x0 = Math.max(0, k[0], x), y0 = Math.max(0, k[1], y), x1 = Math.min(this.w, k[2], x + Math.round(w)), y1 = Math.min(this.h, k[3], y + Math.round(h));
    for (let j = y0; j < y1; j++) this.d.fill(c, j * this.w + x0, j * this.w + Math.max(x0, x1));
  }
  // A rectangle in a tone between two colours (an ordered dither).
  tone(x, y, w, h, a, b, level) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, dither(x + i, y + j, level) ? b : a);
  }
  // Every second pixel in a checkerboard: the pause dims the screen with this, never with a translucent layer.
  checker(x, y, w, h, c, phase = 0) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (((x + i + y + j + phase) & 1) === 0) this.px(x + i, y + j, c);
  }
  frame(x, y, w, h, c) {
    this.rect(x, y, w, 1, c);
    this.rect(x, y + h - 1, w, 1, c);
    this.rect(x, y, 1, h, c);
    this.rect(x + w - 1, y, 1, h, c);
  }
  // A game window: a dark edge, a cream line, a navy field, its corners cut as game windows' are.
  window(x, y, w, h, { fill = C.navy, line = C.cream, edge = C.navy } = {}) {
    this.rect(x + 1, y, w - 2, 1, edge);
    this.rect(x + 1, y + h - 1, w - 2, 1, edge);
    this.rect(x, y + 1, 1, h - 2, edge);
    this.rect(x + w - 1, y + 1, 1, h - 2, edge);
    this.rect(x + 1, y + 1, w - 2, h - 2, line);
    this.rect(x + 2, y + 2, w - 4, h - 4, fill);
  }
  line(x0, y0, x1, y1, c, { dash = 0, gap = 0, phase = 0 } = {}) {
    // Bresenham: a line of whole pixels; a dashed line keeps `dash` pixels and skips `gap`.
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, k = phase;
    for (;;) {
      if (!dash || k % (dash + gap) < dash) this.px(x0, y0, c);
      k++;
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  blit(spr, x, y, { flip = false, map = null, only = null } = {}) {
    if (!spr) return;
    x = Math.round(x);
    y = Math.round(y);
    for (let j = 0; j < spr.h; j++) {
      for (let i = 0; i < spr.w; i++) {
        let c = spr.d[j * spr.w + (flip ? spr.w - 1 - i : i)];
        if (c === CLEAR) continue;
        if (only && !only(i, j)) continue;
        if (map) c = map[c] ?? c;
        this.px(x + i, y + j, c);
      }
    }
  }
  text(str, x, y, opts = {}) {
    return drawText(this, str, x, y, opts);
  }
  copy(other) {
    this.d.set(other.d);
    return this;
  }
}

// A sprite: { w, h, d } with CLEAR for nothing. From strings of letters and a key ("." is clear).
export function sprite(rows, key) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const d = new Uint8Array(w * h).fill(CLEAR);
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== "." && ch !== " ") d[j * w + i] = key[ch];
  }));
  return { w, h, d };
}
// A mask from a test of each pixel's centre: inside(x + 0.5, y + 0.5).
export function mask(w, h, inside) {
  const m = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) m[j * w + i] = inside(i + 0.5, j + 0.5) ? 1 : 0;
  return m;
}
// The pixels of a mask that touch the outside (4-neighbours): its one-pixel outline, inside the shape.
export function edge(m, w, h) {
  const e = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (!m[j * w + i]) continue;
      if (i === 0 || j === 0 || i === w - 1 || j === h - 1 || !m[j * w + i - 1] || !m[j * w + i + 1] || !m[(j - 1) * w + i] || !m[(j + 1) * w + i]) e[j * w + i] = 1;
    }
  }
  return e;
}
export const blank = (w, h) => ({ w, h, d: new Uint8Array(w * h).fill(CLEAR) });
// Paint a mask into a sprite with a colour chosen per pixel: colour(i, j) or a fixed index.
export function paint(spr, m, colour) {
  for (let j = 0; j < spr.h; j++) {
    for (let i = 0; i < spr.w; i++) {
      if (!m[j * spr.w + i]) continue;
      const c = typeof colour === "function" ? colour(i, j) : colour;
      if (c !== CLEAR && c !== undefined) spr.d[j * spr.w + i] = c;
    }
  }
  return spr;
}
// Shapes, as tests of a point.
export const ellipse = (cx, cy, a, b, deg = 0) => {
  const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180);
  return (x, y) => (((x - cx) * c + (y - cy) * s) / a) ** 2 + ((-(x - cx) * s + (y - cy) * c) / b) ** 2 <= 1;
};
export const capsule = (x0, y0, x1, y1, r0, r1 = r0) => (x, y) => {
  const dx = x1 - x0, dy = y1 - y0;
  const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy)) <= r0 + (r1 - r0) * t;
};
export const box = (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
export const union = (...fs) => (x, y) => fs.some((f) => f(x, y));
export const minus = (a, b) => (x, y) => a(x, y) && !b(x, y);
export const and = (a, b) => (x, y) => a(x, y) && b(x, y);

// ── Lettering ────────────────────────────────────────────────────────────────────────────────────────────────
// Glyphs the font lacks, drawn on its 8 x 8 grid.
const EXTRA = {
  "→": ["........", "....#...", "....##..", "#######.", "....##..", "....#...", "........", "........"],
  "≈": ["........", ".##..#..", "#..##...", "........", ".##..#..", "#..##...", "........", "........"],
  "▼": ["........", "#######.", ".#####..", "..###...", "...#....", "........", "........", "........"],
  "·": ["........", "........", "........", "...##...", "...##...", "........", "........", "........"],
};
export const fonts = {};
function scale2x(src, w, h) {
  const out = new Uint8Array(w * 2 * h * 2);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[y * w + x]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), Cc = at(x - 1, y), D = at(x, y + 1);
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (Cc === A && Cc !== D && A !== B) e0 = A;
      if (A === B && A !== Cc && B !== D) e1 = B;
      if (D === Cc && D !== B && Cc !== A) e2 = Cc;
      if (B === D && B !== A && D !== Cc) e3 = D;
      const o = y * 2 * w * 2 + x * 2;
      out[o] = e0;
      out[o + 1] = e1;
      out[o + w * 2] = e2;
      out[o + w * 2 + 1] = e3;
    }
  }
  return out;
}
// AdvMAME3x: the same idea at three times, for the one title big enough to need it.
function scale3x(src, w, h) {
  const W3 = w * 3, out = new Uint8Array(W3 * h * 3);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[y * w + x]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const A = at(x - 1, y - 1), B = at(x, y - 1), Cc = at(x + 1, y - 1), D = at(x - 1, y), E = at(x, y), F = at(x + 1, y), G = at(x - 1, y + 1), Hh = at(x, y + 1), I = at(x + 1, y + 1);
      const e = [E, E, E, E, E, E, E, E, E];
      if (D === B && D !== Hh && B !== F) e[0] = D;
      if ((D === B && D !== Hh && B !== F && E !== Cc) || (B === F && B !== D && F !== Hh && E !== A)) e[1] = B;
      if (B === F && B !== D && F !== Hh) e[2] = F;
      if ((D === B && D !== Hh && B !== F && E !== G) || (D === Hh && D !== B && Hh !== F && E !== A)) e[3] = D;
      if ((B === F && B !== D && F !== Hh && E !== I) || (Hh === F && Hh !== D && F !== B && E !== Cc)) e[5] = F;
      if (D === Hh && D !== B && Hh !== F) e[6] = D;
      if ((D === Hh && D !== B && Hh !== F && E !== I) || (Hh === F && Hh !== D && F !== B && E !== G)) e[7] = Hh;
      if (Hh === F && Hh !== D && F !== B) e[8] = F;
      for (let k = 0; k < 9; k++) out[(y * 3 + Math.floor(k / 3)) * W3 + x * 3 + (k % 3)] = e[k];
    }
  }
  return out;
}
export async function loadFonts() {
  await document.fonts.load('8px "Press Start 2P"');
  const cv = Object.assign(document.createElement("canvas"), { width: 16, height: 16 });
  const g = cv.getContext("2d", { willReadFrequently: true });
  const small = { cell: 8, h: 8, glyphs: {} };
  const chars = " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;!?'\"()-+=/×%*<>[]_#";
  for (const ch of chars) {
    g.clearRect(0, 0, 16, 16);
    g.font = '8px "Press Start 2P"';
    g.textBaseline = "alphabetic";
    g.fillStyle = "#fff";
    g.fillText(ch, 0, 8); // the baseline 8: a capital fills rows 0 to 6, a comma or a g reaches row 7
    const d = g.getImageData(0, 0, 8, 8).data;
    const bits = new Uint8Array(64);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits[y * 8 + x] = d[(y * 8 + x) * 4 + 3] > 127 ? 1 : 0;
    small.glyphs[ch] = bits;
  }
  for (const [ch, rows] of Object.entries(EXTRA)) small.glyphs[ch] = Uint8Array.from(rows.join(""), (c) => (c === "#" ? 1 : 0));
  const big = { cell: 16, h: 16, glyphs: {} };
  for (const [ch, bits] of Object.entries(small.glyphs)) big.glyphs[ch] = scale2x(bits, 8, 8);
  const huge = { cell: 24, h: 24, glyphs: {} };
  for (const [ch, bits] of Object.entries(small.glyphs)) huge.glyphs[ch] = scale3x(bits, 8, 8);
  fonts.small = small;
  fonts.big = big;
  fonts.huge = huge;
  return fonts;
}
// Width in game pixels of a string in a font (each character one cell, a space one cell; `tight` trims the gap
// after the last character).
export const textWidth = (str, font = fonts.small, tracking = 0) => (str.length ? str.length * (font.cell + tracking) - (font.cell / 8) - tracking : 0);
// Draws a string; `colours` may give a colour per character; `count` draws only the first n characters (typing).
function drawText(fb, str, x, y, { font = fonts.small, colour = C.cream, colours = null, count = Infinity, shadow = null, tracking = 0, align = "left" } = {}) {
  const f = font;
  if (align === "center") x -= Math.floor(textWidth(str, f, tracking) / 2);
  if (align === "right") x -= textWidth(str, f, tracking);
  x = Math.round(x);
  y = Math.round(y);
  const n = Math.min(count, str.length);
  for (let k = 0; k < n; k++) {
    const ch = str[k];
    const bits = f.glyphs[ch] ?? f.glyphs[ch.toUpperCase()] ?? f.glyphs["?"];
    const col = colours ? colours[k] : colour;
    const gx = x + k * (f.cell + tracking);
    for (let j = 0; j < f.cell; j++) {
      for (let i = 0; i < f.cell; i++) {
        if (!bits[j * f.cell + i]) continue;
        if (shadow !== null) fb.px(gx + i + 1, y + j + 1, shadow);
        fb.px(gx + i, y + j, col);
      }
    }
  }
  return x + textWidth(str, f, tracking);
}

// ── Showing it ───────────────────────────────────────────────────────────────────────────────────────────────
const RGBA = PAL.map((hex) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return (255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255);
});
let image = null;
export function present(fb, canvas) {
  const g = canvas.getContext("2d");
  image ??= g.createImageData(fb.w, fb.h);
  const out = new Uint32Array(image.data.buffer);
  for (let i = 0; i < fb.d.length; i++) out[i] = RGBA[fb.d[i] === CLEAR ? 0 : fb.d[i]];
  g.putImageData(image, 0, 0);
}
