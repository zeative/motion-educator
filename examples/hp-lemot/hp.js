// The things in "Kenapa HP makin lemot pas memorinya hampir penuh?", each drawn from plain state and the time it is
// given (no clock of its own):
//
// - createGrid: the flash chip's blocks and pages on one 2D canvas, with the photo, the pages being copied, the
//   erases and the controller. Page states come from a list of timed changes, so any frame can be drawn by seeking.
// - drawScreen: the phone's storage screen, a 2D canvas used as the 3D phone's screen texture.
// - createSpace: the 3D layer: a generic phone (no brand) and a flash chip on its board.
import { createStage3D } from "../../kit/engine/stage3d.js";

export const CYAN = "#2ee6ff";
export const RED = "#ff3d55";
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => {
  const u = clamp(x);
  return u * u * (3 - 2 * u);
};
const mix = (a, b, u) => a + (b - a) * u;
const easeOut = (x) => 1 - (1 - clamp(x)) ** 3;
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// ── Sprites, drawn once ───────────────────────────────────────────────────────
const SPR = 128; // a page sprite: the page is 128 px, with a margin for its glow
const MARGIN = 48;
function pageSprite(kind) {
  const c = Object.assign(document.createElement("canvas"), { width: SPR + 2 * MARGIN, height: SPR + 2 * MARGIN });
  const g = c.getContext("2d");
  const o = MARGIN;
  if (kind === "live" || kind === "red" || kind === "hot") {
    const col = kind === "red" ? RED : CYAN;
    g.shadowColor = col;
    g.shadowBlur = kind === "hot" ? 46 : 26;
    rr(g, o, o, SPR, SPR, 20);
    const fill = g.createLinearGradient(0, o, 0, o + SPR);
    if (kind === "red") {
      fill.addColorStop(0, "#ff9aa6");
      fill.addColorStop(0.5, RED);
      fill.addColorStop(1, "#a3142a");
    } else {
      fill.addColorStop(0, kind === "hot" ? "#ffffff" : "#b8fbff");
      fill.addColorStop(0.45, CYAN);
      fill.addColorStop(1, "#0b8fb3");
    }
    g.fillStyle = fill;
    g.fill();
    g.shadowBlur = 0;
    // A bright top edge, like a lit cell.
    rr(g, o + 6, o + 5, SPR - 12, 22, 11);
    g.fillStyle = "rgb(255 255 255 / 0.35)";
    g.fill();
  } else if (kind === "stale") {
    rr(g, o, o, SPR, SPR, 20);
    const fill = g.createLinearGradient(0, o, 0, o + SPR);
    fill.addColorStop(0, "#5d6670");
    fill.addColorStop(1, "#353b42");
    g.fillStyle = fill;
    g.fill();
    g.save();
    g.clip();
    g.strokeStyle = "rgb(0 0 0 / 0.28)";
    g.lineWidth = 9;
    for (let k = -SPR; k < SPR * 2; k += 30) {
      g.beginPath();
      g.moveTo(o + k, o);
      g.lineTo(o + k + SPR, o + SPR);
      g.stroke();
    }
    g.restore();
  } else {
    rr(g, o + 2, o + 2, SPR - 4, SPR - 4, 18);
    g.fillStyle = "rgb(255 255 255 / 0.035)";
    g.fill();
    g.strokeStyle = "rgb(150 220 235 / 0.22)";
    g.lineWidth = 4;
    g.stroke();
  }
  return c;
}

// A generic photo: a landscape at sunset, drawn by hand (no real image, no brand).
function photoSprite() {
  const w = 360;
  const h = 260;
  const c = Object.assign(document.createElement("canvas"), { width: w + 80, height: h + 80 });
  const g = c.getContext("2d");
  const o = 40;
  g.shadowColor = "rgb(0 0 0 / 0.6)";
  g.shadowBlur = 30;
  g.shadowOffsetY = 12;
  rr(g, o, o, w, h, 26);
  g.fillStyle = "#f3f3f5";
  g.fill();
  g.shadowColor = "transparent";
  g.save();
  rr(g, o + 12, o + 12, w - 24, h - 24, 16);
  g.clip();
  const sky = g.createLinearGradient(0, o, 0, o + h);
  sky.addColorStop(0, "#3f6fd8");
  sky.addColorStop(0.55, "#ff9d6c");
  sky.addColorStop(1, "#ffd27a");
  g.fillStyle = sky;
  g.fillRect(o, o, w, h);
  g.fillStyle = "#fff3c4";
  g.beginPath();
  g.arc(o + w * 0.7, o + h * 0.42, 30, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#2c3f63";
  g.beginPath();
  g.moveTo(o, o + h);
  g.lineTo(o, o + h * 0.66);
  g.lineTo(o + w * 0.3, o + h * 0.36);
  g.lineTo(o + w * 0.52, o + h * 0.62);
  g.lineTo(o + w * 0.68, o + h * 0.5);
  g.lineTo(o + w, o + h * 0.72);
  g.lineTo(o + w, o + h);
  g.fill();
  g.fillStyle = "#1c2943";
  g.beginPath();
  g.moveTo(o, o + h);
  g.lineTo(o, o + h * 0.84);
  g.lineTo(o + w * 0.45, o + h * 0.72);
  g.lineTo(o + w, o + h * 0.88);
  g.lineTo(o + w, o + h);
  g.fill();
  g.restore();
  return { c, w, h, o };
}

// ── The grid ──────────────────────────────────────────────────────────────────
// World coordinates are the frame's at rest (cam { x: 497, y: 809, z: 1 }); the camera zooms about that point.
export const REST = { x: 497, y: 809, z: 1 };
export function createGrid(canvas, G) {
  const g = canvas.getContext("2d");
  const spr = { live: pageSprite("live"), stale: pageSprite("stale"), empty: pageSprite("empty"), red: pageSprite("red"), hot: pageSprite("hot") };
  const photo = photoSprite();
  const P = G.PAGE;
  const at = (b, p) => {
    const [bx, by] = G.blocks[b];
    return [bx + G.PAD + (p % 4) * (P + G.PG), by + G.PAD + Math.floor(p / 4) * (P + G.PG)];
  };
  const centre = (b, p) => {
    const [x, y] = at(b, p);
    return [x + P / 2, y + P / 2];
  };
  // Timed state. bases: [{ t, state }] whole snapshots; events: [{ t, b, p, s }] single pages after the last base.
  const D = { bases: [], events: [], flyers: [], frames: [], sweeps: [], bounces: [], scans: [], pings: [], reveal: null, spareLabel: [], ctrl: [] };
  const stateAt = (t) => {
    let base = D.bases[0];
    for (const b of D.bases) if (b.t <= t) base = b;
    const st = base.state.map((row) => row.map((s) => ({ s, since: -99 })));
    for (const e of D.events) if (e.t >= base.t && e.t <= t) st[e.b][e.p] = { s: e.s, since: e.t };
    return st;
  };

  function draw(t, cam = REST, alpha = 1, only = null) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    if (alpha <= 0.001) return;
    g.globalAlpha = alpha;
    g.setTransform(cam.z, 0, 0, cam.z, (1 - cam.z) * 0 + 497 - cam.x * cam.z, 809 - cam.y * cam.z);
    const st = stateAt(t);
    // The controller, bottom left: lit while it is working.
    for (const c of D.ctrl) {
      const a = clamp((t - c.t0) / 0.3) * (1 - clamp((t - c.t1) / 0.3));
      if (a > 0) drawController(t, a, c);
    }
    G.blocks.forEach(([bx, by], b) => {
      if (only && !only.includes(b)) return;
      // Revealed block by block when the chip lights up (s02).
      let rv = D.reveal ? clamp((t - D.reveal.t0 - b * D.reveal.step) / 0.25) : 1;
      // Close on one block, the others step back so the words under them can be read.
      if (cam.focus && b !== cam.focusOn) rv *= 1 - 0.85 * cam.focus;
      if (rv <= 0) return;
      g.save();
      g.globalAlpha = alpha * rv;
      // The block: a dark glass tile.
      rr(g, bx, by, G.B, G.B, 22);
      const fill = g.createLinearGradient(0, by, 0, by + G.B);
      fill.addColorStop(0, "rgb(30 36 42 / 0.94)");
      fill.addColorStop(1, "rgb(12 14 17 / 0.96)");
      g.fillStyle = fill;
      g.fill();
      g.lineWidth = 2.5;
      g.strokeStyle = b === 6 ? "rgb(46 230 255 / 0.18)" : "rgb(46 230 255 / 0.32)";
      if (b === 6) g.setLineDash([12, 10]);
      g.stroke();
      g.setLineDash([]);
      // The spare block's name, faint, while it is empty.
      if (b === 6) {
        let la = 0;
        for (const s of D.spareLabel) la = Math.max(la, clamp((t - s.t0) / 0.3) * (1 - clamp((t - s.t1) / 0.3)));
        la *= 1 - (cam.focus ?? 0);
        if (la > 0) {
          g.globalAlpha = alpha * rv * la * 0.95;
          g.fillStyle = "#d8f6fb";
          g.font = '650 38px "Sora Variable"';
          g.textAlign = "center";
          g.shadowColor = "rgb(0 0 0 / 0.9)";
          g.shadowBlur = 10;
          g.fillText("cadangan", bx + G.B / 2, by + G.B / 2 + 13);
          g.shadowBlur = 0;
          g.globalAlpha = alpha * rv;
        }
      }
      for (let p = 0; p < 16; p++) {
        const [x, y] = at(b, p);
        const { s, since } = st[b][p];
        const age = t - since;
        const kind = s === 1 ? "live" : s === 2 ? "stale" : "empty";
        // A page lands with a small pop and a bright flash.
        const k = P / SPR;
        const grow = s !== 0 && age < 0.3 ? 1 + 0.25 * (1 - easeOut(age / 0.3)) : 1;
        drawPage(kind, x, y, k * grow);
        if (s === 1 && age < 0.5) {
          g.globalAlpha = alpha * rv * (1 - age / 0.5);
          drawPage("hot", x, y, k * grow);
          g.globalAlpha = alpha * rv;
        }
        // A ping: the page flashes to be counted (s03).
        for (const pg of D.pings) {
          if (pg.b !== b) continue;
          const tp = t - (pg.t + p * pg.step);
          if (tp > 0 && tp < 0.45) {
            g.globalAlpha = alpha * rv * (1 - tp / 0.45) * 0.9;
            drawPage(s === 0 ? "live" : "hot", x, y, k);
            g.globalAlpha = alpha * rv;
          }
        }
      }
      // An erase: a bright band sweeps the block and every page empties on the same frame.
      for (const sw of D.sweeps) {
        if (sw.b !== b) continue;
        const u = (t - sw.t + 0.12) / 0.36;
        if (u > 0 && u < 1) {
          g.save();
          rr(g, bx, by, G.B, G.B, 22);
          g.clip();
          const yy = by - 60 + u * (G.B + 120);
          const band = g.createLinearGradient(0, yy - 70, 0, yy + 70);
          band.addColorStop(0, "rgb(46 230 255 / 0)");
          band.addColorStop(0.5, "rgb(220 252 255 / 0.85)");
          band.addColorStop(1, "rgb(46 230 255 / 0)");
          g.fillStyle = band;
          g.fillRect(bx, yy - 70, G.B, 140);
          g.restore();
        }
        const f = t - sw.t;
        if (f > 0 && f < 0.6) {
          g.globalAlpha = alpha * rv * (1 - f / 0.6) * 0.5;
          rr(g, bx, by, G.B, G.B, 22);
          g.fillStyle = "#c8faff";
          g.fill();
          g.globalAlpha = alpha * rv;
        }
      }
      g.restore();
    });
    // Frames around blocks (red: the one being cleaned; cyan: the one being named).
    for (const fr of D.frames) {
      const a = clamp((t - fr.t0) / 0.25) * (1 - clamp((t - fr.t1) / 0.25));
      if (a <= 0) continue;
      const [bx, by] = G.blocks[fr.b];
      const grow = 1 + 0.08 * (1 - easeOut((t - fr.t0) / 0.35));
      const cx = bx + G.B / 2;
      const cy = by + G.B / 2;
      const s = (G.B + 22) * grow;
      g.save();
      g.globalAlpha = alpha * a;
      g.shadowColor = fr.colour;
      g.shadowBlur = 24;
      g.strokeStyle = fr.colour;
      g.lineWidth = 6;
      rr(g, cx - s / 2, cy - s / 2, s, s, 28);
      g.stroke();
      g.restore();
    }
    // The red scan: the photo looks for an empty page and finds none.
    for (const sc of D.scans) {
      const u = (t - sc.t0) / (sc.t1 - sc.t0);
      if (u < 0 || u > 1.15) continue;
      const n = 96;
      for (let k = 0; k < 6; k++) {
        const i = Math.floor(u * n) - k * 3;
        if (i < 0 || i >= n) continue;
        const b = Math.floor(i / 16);
        const p = i % 16;
        const [x, y] = at(b, p);
        g.save();
        g.globalAlpha = alpha * (1 - k / 6) * 0.9 * (1 - clamp((u - 1) / 0.15));
        g.strokeStyle = RED;
        g.shadowColor = RED;
        g.shadowBlur = 16;
        g.lineWidth = 4;
        rr(g, x - 3, y - 3, P + 6, P + 6, 9);
        g.stroke();
        g.restore();
      }
    }
    // Bounces: a packet comes down at a full page, is refused (a red cross), and goes back up.
    for (const bo of D.bounces) {
      const [x, y] = at(bo.b, bo.p);
      const fall = t - bo.t0;
      const hit = bo.hit;
      if (t < bo.t0 || t > bo.t2) continue;
      let py;
      if (t < hit) py = mix(y - 180, y - 2, easeIn((t - bo.t0) / (hit - bo.t0)));
      else py = mix(y - 2, y - 46, easeOut((t - hit) / 0.22));
      if (t < bo.t1) {
        g.save();
        g.globalAlpha = alpha;
        drawPage(t >= hit ? "red" : "live", x + (t >= hit ? Math.sin((t - hit) * 70) * 4 * (1 - clamp((t - hit) / 0.3)) : 0), py, (P / SPR) * 0.86);
        g.restore();
      }
      if (t >= hit && fall >= 0) {
        const a = clamp((t - hit) / 0.06) * (1 - clamp((t - bo.t2 + 0.25) / 0.25));
        g.save();
        g.globalAlpha = alpha * a;
        g.strokeStyle = RED;
        g.shadowColor = RED;
        g.shadowBlur = 20;
        g.lineWidth = 6;
        g.lineCap = "round";
        const cx = x + P / 2;
        const cy = y + P / 2;
        const r = P * 0.32;
        g.beginPath();
        g.moveTo(cx - r, cy - r);
        g.lineTo(cx + r, cy + r);
        g.moveTo(cx + r, cy - r);
        g.lineTo(cx - r, cy + r);
        g.stroke();
        g.restore();
      }
    }
    // Things in flight: copied pages, a new packet, the photo.
    for (const f of D.flyers) {
      if (t < f.t0 || t > f.t1 + (f.hold ?? 0)) continue;
      const u = clamp((t - f.t0) / (f.t1 - f.t0));
      const e = f.ease === "in" ? easeIn(u) : f.ease === "out" ? easeOut(u) : smooth(u);
      const [x0, y0] = f.from;
      const [x1, y1] = f.to;
      const arc = f.arc ?? 0;
      const x = mix(x0, x1, e);
      const y = mix(y0, y1, e) - arc * Math.sin(Math.PI * e);
      const size = mix(f.s0, f.s1, e);
      g.save();
      g.globalAlpha = alpha * (f.fade ? 1 - clamp((t - f.t1) / (f.hold || 1e-6)) : 1);
      if (f.kind === "photo") {
        const w = size;
        const k = w / photo.w;
        g.drawImage(photo.c, x - (photo.o + photo.w / 2) * k, y - (photo.o + photo.h / 2) * k, photo.c.width * k, photo.c.height * k);
        // While it waits, a spinner on it: it cannot be saved yet.
        if (f.spin && t >= f.spin[0] && t <= f.spin[1]) {
          const a = clamp((t - f.spin[0]) / 0.2) * (1 - clamp((t - f.spin[1] + 0.15) / 0.15));
          g.globalAlpha = alpha * a;
          g.strokeStyle = "rgb(255 255 255 / 0.95)";
          g.lineWidth = 6;
          g.lineCap = "round";
          g.beginPath();
          const r = w * 0.15;
          const a0 = t * 7;
          g.arc(x, y, r, a0, a0 + Math.PI * 1.3);
          g.stroke();
        }
      } else {
        drawPage(f.kind === "red" ? "red" : "live", x - size / 2, y - size / 2, size / SPR);
      }
      g.restore();
    }
  }
  function easeIn(x) {
    return clamp(x) ** 2.4;
  }
  function drawPage(kind, x, y, k) {
    const im = spr[kind];
    g.drawImage(im, x - MARGIN * k, y - MARGIN * k, im.width * k, im.height * k);
  }
  function drawController(t, a, c) {
    const x = 110;
    const y = 1000;
    const w = 218;
    const h = 182;
    g.save();
    g.globalAlpha *= a;
    // Pins.
    g.fillStyle = "#b08a3c";
    for (let i = 0; i < 6; i++) {
      g.fillRect(x + 30 + i * 30, y - 12, 12, 14);
      g.fillRect(x + 30 + i * 30, y + h - 2, 12, 14);
    }
    rr(g, x, y, w, h, 16);
    const body = g.createLinearGradient(0, y, 0, y + h);
    body.addColorStop(0, "#2c2f35");
    body.addColorStop(1, "#14161a");
    g.fillStyle = body;
    g.fill();
    g.strokeStyle = "rgb(255 255 255 / 0.12)";
    g.lineWidth = 2;
    g.stroke();
    // Its light: a soft pulse while it works.
    const busy = c.busy ? clamp((t - c.busy[0]) / 0.2) * (1 - clamp((t - c.busy[1]) / 0.3)) : 0;
    const glow = 0.25 + busy * (0.6 + 0.4 * Math.sin(t * 18));
    const col = busy > 0.01 ? RED : CYAN;
    g.shadowColor = col;
    g.shadowBlur = 30 * glow;
    rr(g, x + w / 2 - 34, y + 38, 68, 68, 12);
    g.fillStyle = busy > 0.01 ? `rgb(255 61 85 / ${0.3 + 0.6 * glow})` : `rgb(46 230 255 / ${0.25 + 0.5 * glow})`;
    g.fill();
    g.shadowBlur = 0;
    g.fillStyle = "#d8d8de";
    g.font = '600 34px "Sora Variable"';
    g.textAlign = "center";
    g.fillText("pengendali", x + w / 2, y + 156);
    g.restore();
  }
  return { draw, D, at, centre, photo };
}

// ── The phone's screen ────────────────────────────────────────────────────────
// Drawn in the screen's own pixels (476 x 1006) at 1.5 times, on a canvas used as the 3D screen's texture.
export const SCREEN = { w: 476, h: 1006, k: 1.5 };
export function createScreen() {
  const c = Object.assign(document.createElement("canvas"), { width: SCREEN.w * SCREEN.k, height: SCREEN.h * SCREEN.k });
  const g = c.getContext("2d");
  const photo = photoSprite();
  // A gallery of the phone's photos (generic gradients and hills), drawn once: the storage is full of these.
  const gallery = Object.assign(document.createElement("canvas"), { width: 416 * SCREEN.k, height: 330 * SCREEN.k });
  {
    const q = gallery.getContext("2d");
    q.scale(SCREEN.k, SCREEN.k);
    const skies = [
      ["#3f6fd8", "#ffb07a"],
      ["#1d2b5a", "#6a4fd8"],
      ["#2a8fb8", "#c8f1ff"],
      ["#ff8a5c", "#ffd98a"],
      ["#14403a", "#5cc486"],
      ["#5a2a6a", "#ff7aa8"],
    ];
    let seed = 3;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 12; i++) {
      const x = (i % 4) * 106;
      const y = Math.floor(i / 4) * 112;
      q.save();
      rr(q, x, y, 98, 102, 12);
      q.clip();
      const [a1, a2] = skies[Math.floor(rnd() * skies.length)];
      const sky = q.createLinearGradient(0, y, 0, y + 102);
      sky.addColorStop(0, a1);
      sky.addColorStop(1, a2);
      q.fillStyle = sky;
      q.fillRect(x, y, 98, 102);
      q.fillStyle = "rgb(10 14 24 / 0.65)";
      q.beginPath();
      q.moveTo(x, y + 102);
      q.lineTo(x, y + 60 + rnd() * 20);
      q.lineTo(x + 30 + rnd() * 30, y + 40 + rnd() * 20);
      q.lineTo(x + 98, y + 66 + rnd() * 20);
      q.lineTo(x + 98, y + 102);
      q.fill();
      q.restore();
    }
  }
  const text = (s, x, y, font, colour, align = "left") => {
    g.font = font;
    g.fillStyle = colour;
    g.textAlign = align;
    g.fillText(s, x, y);
  };
  // S: { t, used, red (0..1), warn, rows, temp, tiles, full, marker, saving, saved, dim }
  function draw(S) {
    const { t } = S;
    g.setTransform(SCREEN.k, 0, 0, SCREEN.k, 0, 0);
    const W = SCREEN.w;
    // The wallpaper of a plain settings page: near black, a faint glow from the top.
    const bg = g.createLinearGradient(0, 0, 0, SCREEN.h);
    bg.addColorStop(0, "#14181d");
    bg.addColorStop(1, "#090a0c");
    g.fillStyle = bg;
    g.fillRect(0, 0, W, SCREEN.h);
    const col = S.red > 0.5 ? RED : CYAN;
    const halo = g.createRadialGradient(W / 2, 260, 10, W / 2, 260, 420);
    halo.addColorStop(0, S.red > 0.5 ? "rgb(255 61 85 / 0.16)" : "rgb(46 230 255 / 0.13)");
    halo.addColorStop(1, "rgb(0 0 0 / 0)");
    g.fillStyle = halo;
    g.fillRect(0, 0, W, SCREEN.h);
    // Status bar (generic).
    text("10.24", 34, 50, '600 24px "Inter Variable"', "#e6e6ea");
    rr(g, W - 78, 32, 42, 21, 6);
    g.strokeStyle = "#e6e6ea";
    g.lineWidth = 2.5;
    g.stroke();
    g.fillStyle = "#e6e6ea";
    g.fillRect(W - 74, 36, 26, 13);
    // Title.
    text("Penyimpanan", 30, 132, '650 42px "Sora Variable"', "#f2f2f5");
    // The figure, at the bar's value.
    const pct = Math.round(S.used * 100);
    text(`${pct}%`, 30, 254, '700 104px "Sora Variable"', col);
    text("terpakai", 30 + g.measureText(`${pct}%`).width + 16, 250, '500 28px "Inter Variable"', "#a9a9b0");
    // The bar.
    const bx = 30;
    const by = 290;
    const bw = W - 60;
    const bh = 40;
    rr(g, bx, by, bw, bh, 20);
    g.fillStyle = "rgb(255 255 255 / 0.08)";
    g.fill();
    g.save();
    rr(g, bx, by, bw, bh, 20);
    g.clip();
    const used = bw * S.used;
    if (S.rows > 0) {
      // The breakdown: photos, apps, system, and what is left for temporary files.
      const parts = [
        [0.46, "#2ee6ff"],
        [0.3, "#7a8cff"],
        [0.18, "#c0c4cc"],
      ];
      let x = bx;
      const total = parts.reduce((a, [f]) => a + f, 0);
      for (const [f, c2] of parts) {
        const w = (used * f) / total;
        g.fillStyle = c2;
        g.fillRect(x, by, w + 0.5, bh);
        x += w;
      }
    } else {
      const fill = g.createLinearGradient(bx, 0, bx + used, 0);
      fill.addColorStop(0, S.red > 0.5 ? "#c21d36" : "#0b9fc4");
      fill.addColorStop(1, col);
      g.fillStyle = fill;
      g.fillRect(bx, by, used, bh);
    }
    g.restore();
    // The marker at 90% and the last tenth outlined.
    if (S.marker > 0) {
      g.save();
      g.globalAlpha = S.marker;
      const mx = bx + bw * 0.9;
      g.strokeStyle = CYAN;
      g.shadowColor = CYAN;
      g.shadowBlur = 14;
      g.lineWidth = 4;
      g.setLineDash([10, 8]);
      rr(g, mx, by - 8, bw * 0.1 + 6, bh + 16, 12);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = "#ffffff";
      g.fillRect(mx - 2, by - 16, 4, bh + 32);
      g.shadowBlur = 0;
      text("≥ 10% kosong", bx + bw, by + bh + 52, '700 32px "Sora Variable"', CYAN, "right");
      g.restore();
    }
    // The warning.
    if (S.warn > 0) {
      g.save();
      g.globalAlpha = S.warn;
      const y = 370 - 16 * (1 - S.warn);
      rr(g, 30, y, 238, 54, 27);
      g.fillStyle = "rgb(255 61 85 / 0.18)";
      g.fill();
      g.strokeStyle = RED;
      g.lineWidth = 2.5;
      g.stroke();
      g.fillStyle = RED;
      g.beginPath();
      g.arc(58, y + 27, 9, 0, Math.PI * 2);
      g.fill();
      text("Hampir penuh", 78, y + 37, '650 27px "Inter Variable"', "#ffd5db");
      g.restore();
    }
    // The breakdown rows (s10).
    if (S.rows > 0) {
      const rows = [
        ["Foto", "#2ee6ff"],
        ["Aplikasi", "#7a8cff"],
        ["Sistem", "#c0c4cc"],
      ];
      rows.forEach(([name, c2], i) => {
        const a = clamp(S.rows * 4 - i);
        if (a <= 0) return;
        g.save();
        g.globalAlpha = a;
        const y = 470 + i * 78;
        g.fillStyle = c2;
        g.beginPath();
        g.arc(44, y - 11, 11, 0, Math.PI * 2);
        g.fill();
        text(name, 68, y, '550 34px "Inter Variable"', "#ececf0");
        g.restore();
      });
      // File sementara: a slot that should be free, squeezed by everything else.
      const a = clamp(S.rows * 4 - 3);
      if (a > 0) {
        g.save();
        g.globalAlpha = a;
        const y = 470 + 3 * 78;
        g.strokeStyle = "#ffffff";
        g.lineWidth = 3;
        g.setLineDash([6, 6]);
        g.beginPath();
        g.arc(44, y - 11, 10, 0, Math.PI * 2);
        g.stroke();
        g.setLineDash([]);
        text("File sementara", 68, y, '550 34px "Inter Variable"', "#ececf0");
        // Its room: a box under the row whose width is what the bar leaves free, and the files that need it.
        const room = mix(380, 14, S.temp);
        const ry = y + 30;
        rr(g, 40, ry, 400, 92, 16);
        g.fillStyle = "rgb(255 255 255 / 0.04)";
        g.fill();
        rr(g, 40, ry, room, 92, 16);
        g.strokeStyle = S.temp > 0.6 ? RED : "rgb(255 255 255 / 0.5)";
        g.lineWidth = 3;
        g.stroke();
        // Small files trying to get in: they bump against the wall and pile up.
        for (let i = 0; i < 5; i++) {
          const ti = S.tiles - i * 0.12;
          if (ti <= 0) continue;
          const want = 52 + i * 70;
          const wall = 40 + room + 10 + i * 66;
          const x = Math.max(want, wall);
          const blocked = x > want + 1;
          const bump = blocked ? Math.sin(clamp(ti) * Math.PI * 3) * 6 * (1 - clamp(ti)) : 0;
          g.save();
          g.globalAlpha = clamp(ti * 3);
          rr(g, x + bump, ry + 18 - (1 - easeOut(clamp(ti * 2))) * 60, 54, 58, 8);
          g.fillStyle = blocked && S.temp > 0.6 ? "rgb(255 61 85 / 0.85)" : "#e8e8ee";
          g.fill();
          g.fillStyle = "rgb(0 0 0 / 0.35)";
          g.fillRect(x + bump + 10, ry + 36 - (1 - easeOut(clamp(ti * 2))) * 60, 34, 4);
          g.fillRect(x + bump + 10, ry + 48 - (1 - easeOut(clamp(ti * 2))) * 60, 24, 4);
          g.restore();
        }
        if (S.full > 0) {
          g.save();
          g.globalAlpha = S.full;
          rr(g, 40, ry + 116, 196, 50, 25);
          g.fillStyle = RED;
          g.fill();
          text("nggak muat", 138, ry + 150, '700 27px "Inter Variable"', "#ffffff", "center");
          g.restore();
        }
        g.restore();
      }
    }
    // The photo being saved: a thumbnail, a spinner while it waits, a check once it is in.
    if (S.saving > 0 || S.saved > 0) {
      const y = 470;
      g.save();
      g.globalAlpha = Math.max(S.saving, S.saved);
      const w = 210;
      const k = w / photo.w;
      g.drawImage(photo.c, 30 - photo.o * k, y - photo.o * k, photo.c.width * k, photo.c.height * k);
      const cx = 30 + w / 2;
      const cy = y + (photo.h * k) / 2;
      if (S.saved < 0.5) {
        g.fillStyle = "rgb(0 0 0 / 0.42)";
        rr(g, 30, y, w, photo.h * k, 18);
        g.fill();
        g.strokeStyle = "#ffffff";
        g.lineWidth = 7;
        g.lineCap = "round";
        g.beginPath();
        g.arc(cx, cy, 30, t * 6.5, t * 6.5 + Math.PI * 1.35);
        g.stroke();
        text("Menyimpan", 262, y + 64, '600 32px "Inter Variable"', "#ececf0");
        text("foto…", 262, y + 104, '600 32px "Inter Variable"', "#a9a9b0");
      } else {
        g.fillStyle = CYAN;
        g.beginPath();
        g.arc(30 + w - 6, y + 8, 26, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#04232a";
        g.lineWidth = 7;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(30 + w - 18, y + 8);
        g.lineTo(30 + w - 9, y + 18);
        g.lineTo(30 + w + 8, y - 2);
        g.stroke();
        text("Tersimpan", 262, y + 64, '650 32px "Inter Variable"', CYAN);
        text("langsung", 262, y + 104, '600 32px "Inter Variable"', "#a9a9b0");
      }
      g.restore();
    }
    // The gallery under the photo being saved.
    if (S.rows <= 0 && (S.saving > 0 || S.saved > 0)) {
      text("Galeri", 30, 682, '600 30px "Inter Variable"', "#a9a9b0");
      g.drawImage(gallery, 30, 704, 416, 330);
    }
    // A soft reflection across the glass.
    const glare = g.createLinearGradient(0, 0, W, SCREEN.h);
    glare.addColorStop(0, "rgb(255 255 255 / 0.07)");
    glare.addColorStop(0.35, "rgb(255 255 255 / 0)");
    glare.addColorStop(1, "rgb(255 255 255 / 0)");
    g.fillStyle = glare;
    g.fillRect(0, 0, W, SCREEN.h);
    if (S.dim > 0) {
      g.fillStyle = `rgb(0 0 0 / ${S.dim})`;
      g.fillRect(0, 0, W, SCREEN.h);
    }
  }
  return { canvas: c, draw };
}

// ── 3D: the phone and the chip ────────────────────────────────────────────────
export async function createSpace(canvas, screenCanvas, faceCanvas) {
  const space = createStage3D(canvas, { environment: 0.55, exposure: 1.0 });
  const { THREE, scene, UNIT } = space;
  const { RoundedBoxGeometry } = await import("three/addons/geometries/RoundedBoxGeometry.js");
  const px = (v) => v / UNIT;
  space.key.position.set(-60, 70, 80);
  space.key.intensity = 2.2;
  space.rim.color.set(CYAN);
  space.rim.intensity = 2.4;
  space.rim.position.set(80, 30, -40);
  const fill = new THREE.PointLight(CYAN, 0, 0, 2);
  fill.position.set(-14, 16, 22);
  // A warm key close to the chip, so its package shows a falloff and its edges catch light.
  const lamp = new THREE.PointLight(0xfff1dc, 0, 0, 2);
  lamp.position.set(-22, 22, 26);
  scene.add(lamp);
  scene.add(fill);

  // The phone: 520 x 1050 px, a graphite frame and a glass front. No brand, no logo.
  const phone = new THREE.Group();
  const PW = px(520);
  const PH = px(1050);
  const PD = px(40);
  const body = new THREE.Mesh(new RoundedBoxGeometry(PW, PH, PD, 8, px(64)), new THREE.MeshPhysicalMaterial({ color: 0x24272d, metalness: 0.85, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 }));
  phone.add(body);
  // The black glass front.
  const glassShape = (w, h, r) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const geo = new THREE.ShapeGeometry(s, 12);
    const uv = geo.attributes.uv;
    const pos = geo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
    return geo;
  };
  const front = new THREE.Mesh(glassShape(px(508), px(1038), px(58)), new THREE.MeshPhysicalMaterial({ color: 0x050607, metalness: 0, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04 }));
  front.position.z = PD / 2 + 0.002;
  phone.add(front);
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = 4;
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false, transparent: true });
  const screen = new THREE.Mesh(glassShape(px(476), px(1006), px(44)), screenMat);
  screen.position.z = PD / 2 + 0.01;
  phone.add(screen);
  // A gloss layer over the screen, which catches the studio's light as the phone turns.
  const gloss = new THREE.Mesh(glassShape(px(508), px(1038), px(58)), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.05, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.18 }));
  gloss.position.z = PD / 2 + 0.02;
  phone.add(gloss);
  // A camera hole and the side buttons: generic.
  const hole = new THREE.Mesh(new THREE.CircleGeometry(px(13), 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  hole.position.set(0, PH / 2 - px(40), PD / 2 + 0.03);
  phone.add(hole);
  for (const [y, h] of [
    [px(230), px(120)],
    [px(60), px(70)],
  ]) {
    const btn = new THREE.Mesh(new RoundedBoxGeometry(px(10), h, px(18), 3, px(4)), body.material);
    btn.position.set(PW / 2 + px(3), y, 0);
    phone.add(btn);
  }
  scene.add(phone);

  // The chip on its board: a graphite package 880 px square whose face is the grid, gold leads on two sides.
  const chip = new THREE.Group();
  const CS = px(880);
  const CD = px(46);
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  // The package: moulded epoxy, matte with a fine grain, and a bevel that catches the light.
  const grain = Object.assign(document.createElement("canvas"), { width: 512, height: 512 });
  {
    const q = grain.getContext("2d");
    const img = q.createImageData(512, 512);
    let seed = 11;
    for (let i = 0; i < img.data.length; i += 4) {
      seed = (seed * 16807) % 2147483647;
      const v = 150 + ((seed / 2147483647) * 105) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    q.putImageData(img, 0, 0);
  }
  const grainTex = new THREE.CanvasTexture(grain);
  grainTex.wrapS = grainTex.wrapT = THREE.RepeatWrapping;
  grainTex.repeat.set(4, 4);
  const graphite = new THREE.MeshPhysicalMaterial({ color: 0x15171b, metalness: 0.1, roughness: 0.8, roughnessMap: grainTex, clearcoat: 0.3, clearcoatRoughness: 0.5, envMapIntensity: 0.3 });
  const faceMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0e, roughness: 0.92, metalness: 0, envMapIntensity: 0.15, emissive: 0xffffff, emissiveMap: faceTex, emissiveIntensity: 1, toneMapped: false });
  const box = new THREE.Mesh(new RoundedBoxGeometry(CS, CS, CD, 4, px(12)), [graphite, graphite, graphite, graphite, faceMat, graphite]);
  box.position.z = -CD / 2;
  chip.add(box);
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xd9a540, metalness: 1, roughness: 0.28, clearcoat: 0.5 });
  for (let i = 0; i < 22; i++) {
    const y = -CS / 2 + CS * ((i + 0.5) / 22);
    for (const side of [-1, 1]) {
      const lead = new THREE.Mesh(new THREE.BoxGeometry(px(40), px(16), px(8)), gold);
      lead.position.set(side * (CS / 2 + px(14)), y, -CD + px(4));
      chip.add(lead);
    }
  }
  // The board: dark, with faint traces.
  const boardCanvas = Object.assign(document.createElement("canvas"), { width: 1024, height: 1024 });
  {
    const b = boardCanvas.getContext("2d");
    b.fillStyle = "#0b1012";
    b.fillRect(0, 0, 1024, 1024);
    b.strokeStyle = "rgb(46 230 255 / 0.22)";
    b.lineWidth = 3;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      let x = rnd() * 1024;
      let y = rnd() * 1024;
      b.beginPath();
      b.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        if (rnd() < 0.5) x += (rnd() - 0.5) * 300;
        else y += (rnd() - 0.5) * 300;
        b.lineTo(x, y);
      }
      b.stroke();
      b.fillStyle = "rgb(46 230 255 / 0.35)";
      b.beginPath();
      b.arc(x, y, 5, 0, Math.PI * 2);
      b.fill();
    }
  }
  const boardTex = new THREE.CanvasTexture(boardCanvas);
  boardTex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(px(3200), px(3200)), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.7, metalness: 0.2, transparent: true }));
  board.position.z = -CD - px(6);
  chip.add(board);
  scene.add(chip);

  // Places are given in frame pixels (the centre of the thing), sizes as a scale.
  function render(S) {
    phone.visible = S.phone > 0.001;
    chip.visible = S.chip > 0.001;
    if (phone.visible) {
      phone.position.copy(space.at(S.px - 540, S.py - 960, S.pz ?? 0));
      phone.rotation.set(S.prx ?? 0, S.pry ?? 0, S.prz ?? 0);
      phone.scale.setScalar(S.ps ?? 1);
      screenTex.needsUpdate = true;
      for (const m of [body.material, front.material, gloss.material, screenMat]) {
        m.transparent = true;
        m.opacity = m === gloss.material ? 0.18 * S.phone : S.phone;
      }
    }
    if (chip.visible) {
      chip.position.copy(space.at(S.cx - 540, S.cy - 960, 0));
      chip.rotation.set(S.crx ?? 0, S.cry ?? 0, S.crz ?? 0);
      faceTex.needsUpdate = true;
      for (const m of [graphite, faceMat, gold, board.material]) {
        m.transparent = true;
        m.opacity = m === board.material ? S.chip * S.board : S.chip;
      }
    }
    fill.intensity = S.fill ?? 0;
    lamp.intensity = S.lamp ?? 0;
    space.rim.color.set(S.rimColour ?? CYAN);
    space.render(Math.max(S.phone, S.chip) > 0.001 ? 1 : 0);
  }
  return { render, space };
}
