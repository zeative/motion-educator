// Everything drawn in 2D for "How do noise-cancelling headphones erase sound?", from one state object L that the
// timeline tweens. Two canvases: `lab` under the 3D headphones and the glass (the air, the cut-through cup, the lanes,
// the to-scale view, the rings), and `over` on top of the glass (the waves inside cards and panels).
// Amber is the noise, cyan the flipped wave, white what you hear. Every wave is a function of the time it is drawn at.
export const AMBER = "#ffb547";
export const CYAN = "#3fe0ff";
export const WHITE = "#f4f4f6";
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, k) => a + (b - a) * k;

// The air and the noise in it: lambda 420 px, travelling right at 150 px a second (slowed down, said on screen).
export const AIR = { lambda: 420, v: 150 };
// Pressure of the noise at x, time t, from -1 to 1: high where the air is squeezed.
export const pressure = (x, t, lambda = AIR.lambda, v = AIR.v) => -Math.cos((TAU / lambda) * (x - v * t));
// Where the n-th squeezed band (pressure 1) is at time t.
export const crestX = (t, n, lambda = AIR.lambda, v = AIR.v) => v * t + lambda / 2 + n * lambda;

// A seeded random, so the air dots are the same on every frame.
function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// The cut-through cup, in frame pixels at rest (storyboard.build.py draws the same shapes).
export const CUPG = { axis: 450, shellX0: 1060, shellX1: 1440, top: 170, bottom: 730, cavX0: 1170, cavTop: 250, cavBottom: 650, head: 1506, speaker: 1232, mic: [1050, 300], chip: [1115, 450] };

export function createLab(under, over) {
  const W = under.width;
  const H = under.height;
  const g = under.getContext("2d");
  const o = over.getContext("2d");

  // ── State ──────────────────────────────────────────────────────────────
  const L = {
    rings: { vis: 0, cx: -320, cy: 470, lambda: 300, v: 210, colour: AMBER },
    close: { vis: 0, k: 0, cx: 960, cy: 470, r0: 900, r1: 360 },
    eq: { vis: 0, a: 0, b: 0 },
    air: { vis: 0, amp: 0, curve: 0, x0: 60, x1: 1860, y0: 120, y1: 800, cy: 450, camz: 1, camx: 960, camy: 460 },
    cup: { vis: 0, z: 1, fx: 960, fy: 540, sx: 960, sy: 540, mic: 0, chip: 0, sig: 0, sig2: 0, push: 0, amberIn: 0, cyanDraw: 0, merge: 0, cushion: 0, air: 1, curve: 1, twoLanes: 0, highsIn: 0, lowsIn: 0, lowsCyan: 0, lowsMerge: 0, single: 1 },
    chipw: { vis: 0, inDraw: 0, outDraw: 0, links: 0, fly: 0 },
    lanes: { vis: 0, lag: 0, flipVis: 1, sumVis: 1, clat: 0, copyVis: 0, x0: 380, x1: 1790 },
    sc: { vis: 0, z: 1, px: 1590, py: 470, sx: 1590, sy: 470, hum: 0, sq: 0, ruler: 0, rulerSq: 0, glow: 0, nacelle: 1, src: 0, inset: 0 },
    mw: { vis: 0, sq: 0, copy: 0, left: 0 },
    recap: { vis: 0, c1: 0, c2: 0, c3: 0, c4: 0 },
    poster: { vis: 0 },
  };

  // ── Drawing helpers ────────────────────────────────────────────────────
  // A wave as a glowing line: fn(x) gives y. Drawn twice: a wide soft pass and a bright core.
  function line(ctx, fn, x0, x1, colour, { width = 5, alpha = 1, glow = 0.35, step = 2 } = {}) {
    if (alpha <= 0.004 || x1 <= x0) return;
    ctx.save();
    ctx.beginPath();
    for (let x = x0; x <= x1 + 0.01; x += step) {
      const y = fn(Math.min(x, x1));
      if (x === x0) ctx.moveTo(x, y);
      else ctx.lineTo(Math.min(x, x1), y);
    }
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = colour;
    ctx.globalAlpha = alpha * glow;
    ctx.lineWidth = width * 3.4;
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = Math.max(1, width * 0.3);
    ctx.stroke();
    ctx.restore();
  }
  function text(ctx, str, x, y, { size = 32, colour = WHITE, align = "left", weight = 600, alpha = 1, font = "Inter Variable" } = {}) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${weight} ${size}px "${font}"`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillStyle = colour;
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 8;
    ctx.fillText(str, x, y);
    ctx.restore();
  }
  // A measure: a ruler between x0 and x1 at y with its value over it.
  function ruler(ctx, x0, x1, y, k, alpha) {
    if (alpha <= 0.004 || k <= 0.001) return;
    const xe = mix(x0, x1, k);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y - 22);
    ctx.lineTo(x0, y + 22);
    ctx.moveTo(x0, y);
    ctx.lineTo(xe, y);
    if (k > 0.98) {
      ctx.moveTo(x1, y - 22);
      ctx.lineTo(x1, y + 22);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ── The air: a field of dots that rock back and forth as the pressure wave travels ──────────────────────
  const rand = seeded(7);
  const dots = [];
  for (let y = 40; y < H - 40; y += 21) for (let x = -40; x < W + 40; x += 21) dots.push([x + (rand() - 0.5) * 8, y + (rand() - 0.5) * 8, 1.7 + rand() * 1.3]);
  function airField(ctx, t, { x0, x1, y0, y1, amp, alpha, clip }) {
    if (alpha <= 0.004) return;
    ctx.save();
    if (clip) clip(ctx);
    const A = 9.5 * amp;
    const k = TAU / AIR.lambda;
    for (const [x, y, r] of dots) {
      if (x < x0 - 20 || x > x1 + 20 || y < y0 || y > y1) continue;
      const th = k * (x - AIR.v * t);
      const dx = A * Math.sin(th);
      const P = -Math.cos(th) * amp; // squeezed where the dots bunch
      const edge = clamp((x - x0) / 80) * clamp((x1 - x) / 80) * clamp((y - y0) / 50) * clamp((y1 - y) / 50);
      const a = (0.12 + 0.72 * ((P + 1) * 0.5) ** 1.4) * edge * alpha;
      const warm = clamp(P);
      ctx.fillStyle = `rgba(${Math.round(mix(190, 255, warm))},${Math.round(mix(196, 190, warm))},${Math.round(mix(210, 110, warm))},${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x + dx, y, r * (1 + 0.25 * warm), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── The cut-through cup ────────────────────────────────────────────────
  function shellPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(1440, 170);
    ctx.lineTo(1170, 170);
    ctx.quadraticCurveTo(1060, 170, 1060, 280);
    ctx.lineTo(1060, 620);
    ctx.quadraticCurveTo(1060, 730, 1170, 730);
    ctx.lineTo(1440, 730);
    ctx.lineTo(1440, 650);
    ctx.lineTo(1205, 650);
    ctx.quadraticCurveTo(1170, 650, 1170, 615);
    ctx.lineTo(1170, 285);
    ctx.quadraticCurveTo(1170, 250, 1205, 250);
    ctx.lineTo(1440, 250);
    ctx.closePath();
  }
  function headPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(1506, -200);
    ctx.quadraticCurveTo(1546, 450, 1506, 1280);
    ctx.lineTo(2200, 1280);
    ctx.lineTo(2200, -200);
    ctx.closePath();
  }
  function cup(ctx, t) {
    const C = L.cup;
    if (C.vis <= 0.004) return;
    ctx.save();
    ctx.globalAlpha = C.vis;
    ctx.translate(C.sx, C.sy);
    ctx.scale(C.z, C.z);
    ctx.translate(-C.fx, -C.fy);
    const Y = CUPG.axis;

    // The air outside, and the noise's pressure curve rolling into the shell.
    const outside = (c) => {
      c.beginPath();
      c.rect(-400, -200, 1452, 1480);
    };
    airField(ctx, t, { x0: -400, x1: 1048, y0: 60, y1: 880, amp: 1, alpha: C.air * 0.85, clip: outside });
    if (C.single > 0.004) line(ctx, (x) => Y - 150 * pressure(x, t), -400, 1050, AMBER, { width: 6, alpha: C.curve * C.single });
    if (C.twoLanes > 0.004) {
      line(ctx, (x) => 300 - 42 * pressure(x, t, 64, 150), -400, 1050, AMBER, { width: 4, alpha: C.twoLanes, step: 1.5 });
      line(ctx, (x) => 600 - 95 * pressure(x, t), -400, 1050, AMBER, { width: 6, alpha: C.twoLanes });
    }

    // The head: skin, the ear canal.
    headPath(ctx);
    const skin = ctx.createLinearGradient(1500, 0, 1920, 0);
    skin.addColorStop(0, "#c98a6a");
    skin.addColorStop(0.08, "#a86a50");
    skin.addColorStop(1, "#4a2a20");
    ctx.fillStyle = skin;
    ctx.fill();
    ctx.save();
    ctx.clip();
    const shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, "rgba(0,0,0,0.55)");
    shade.addColorStop(0.45, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = shade;
    ctx.fillRect(1400, -200, 900, 1500);
    // The ear canal: a dark tube into the head, its far end the eardrum.
    const canal = ctx.createLinearGradient(1510, 0, 1800, 0);
    canal.addColorStop(0, "#3a1d16");
    canal.addColorStop(1, "#140807");
    ctx.fillStyle = canal;
    ctx.beginPath();
    ctx.moveTo(1500, 418);
    ctx.bezierCurveTo(1600, 412, 1700, 424, 1770, 430);
    ctx.quadraticCurveTo(1790, 450, 1770, 470);
    ctx.bezierCurveTo(1700, 476, 1600, 488, 1500, 482);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,200,170,0.35)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = "rgba(255,210,180,0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(1506, -200);
    ctx.quadraticCurveTo(1546, 450, 1506, 1280);
    ctx.stroke();

    // The cavity's air: a few dots that rock with whatever sound is left in it.
    const left = (1 - C.merge * 0.96) * C.amberIn;
    ctx.save();
    ctx.beginPath();
    ctx.rect(1290, 262, 214, 376);
    ctx.clip();
    for (const [x, y, r] of dots) {
      if (x < 1280 || x > 1510 || y < 255 || y > 645) continue;
      const th = (TAU / AIR.lambda) * (x - AIR.v * t);
      const P = -Math.cos(th) * left;
      ctx.fillStyle = `rgba(220,226,236,${(0.22 + 0.3 * (P + 1) * 0.5) * C.vis})`;
      ctx.beginPath();
      ctx.arc(x + 8 * left * Math.sin(th), y, r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // Inside the cup: the noise that got in (amber), the flipped wave from the speaker (cyan), and their sum (white).
    const x0 = 1290;
    const x1 = 1500;
    if (C.single > 0.004) {
      const fade = 1 - 0.72 * C.merge;
      line(ctx, (x) => Y - 70 * pressure(x, t), x0, x1, AMBER, { width: 5, alpha: C.amberIn * fade * C.single });
      line(ctx, (x) => Y + 70 * pressure(x, t), x0, mix(x0, x1, C.cyanDraw), CYAN, { width: 5, alpha: Math.min(1, C.cyanDraw * 4) * fade * C.single });
      // The sum: what is really left (the copy is a hair late: 3% of the noise).
      line(ctx, (x) => Y - 70 * (pressure(x, t) - pressure(x - 2, t)) * 2.2, x0, x1 + 260, WHITE, { width: 5, alpha: C.merge * C.single });
    }
    if (C.twoLanes > 0.004) {
      line(ctx, (x) => 300 - 9 * pressure(x, t, 64, 150), x0, x1, AMBER, { width: 3, alpha: C.highsIn * C.twoLanes, step: 1.5 });
      line(ctx, (x) => 600 - 60 * pressure(x, t), x0, x1, AMBER, { width: 5, alpha: C.lowsIn * (1 - 0.72 * C.lowsMerge) * C.twoLanes });
      line(ctx, (x) => 600 + 60 * pressure(x, t), x0, mix(x0, x1, C.lowsCyan), CYAN, { width: 5, alpha: Math.min(1, C.lowsCyan * 4) * (1 - 0.72 * C.lowsMerge) * C.twoLanes });
      line(ctx, () => 600, x0, x1 + 260, WHITE, { width: 5, alpha: C.lowsMerge * C.twoLanes });
    }

    // The shell, cut through: graphite with a lit cut face.
    shellPath(ctx);
    const sg = ctx.createLinearGradient(1060, 170, 1300, 730);
    sg.addColorStop(0, "#3a3a42");
    sg.addColorStop(0.5, "#24242a");
    sg.addColorStop(1, "#141418");
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // Hatching on the cut face, the way a cutaway drawing marks a section.
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 2;
    for (let k = -800; k < 800; k += 18) {
      ctx.beginPath();
      ctx.moveTo(1000 + k, 140);
      ctx.lineTo(1000 + k + 600, 760);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(200,206,220,0.65)";
    ctx.lineWidth = 3;
    shellPath(ctx);
    ctx.stroke();
    // A rim light along the outer top-left edge.
    ctx.strokeStyle = `rgba(160,240,255,${0.35 + 0.4 * C.chip})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(1300, 171);
    ctx.lineTo(1170, 171);
    ctx.quadraticCurveTo(1061, 171, 1061, 280);
    ctx.lineTo(1061, 450);
    ctx.stroke();

    // The cushions: soft foam, top and bottom, against the head.
    for (const cy of [210, 690]) {
      const swell = 1 + 0.06 * C.cushion;
      ctx.save();
      ctx.translate(1472, cy);
      ctx.scale(swell, swell);
      const fg = ctx.createRadialGradient(-10, -20, 4, 0, 0, 70);
      fg.addColorStop(0, `rgb(${Math.round(mix(92, 140, C.cushion))},${Math.round(mix(88, 128, C.cushion))},${Math.round(mix(96, 100, C.cushion))})`);
      fg.addColorStop(0.7, "#2b2a30");
      fg.addColorStop(1, "#18181c");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(0, 0, 36, 64, 0, 0, TAU);
      ctx.fill();
      // Foam texture: small pores.
      const pr = seeded(cy);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      for (let i = 0; i < 70; i++) {
        const a = pr() * TAU;
        const rr = Math.sqrt(pr());
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rr * 30, Math.sin(a) * rr * 56, 1.3 + pr() * 1.6, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = `rgba(255,214,150,${0.25 + 0.6 * C.cushion})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 36, 64, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // The speaker: a magnet block and a cone that pushes.
    const push = C.push * 7;
    ctx.fillStyle = "#3c3c44";
    ctx.fillRect(1196, 400, 36, 100);
    ctx.save();
    ctx.translate(push, 0);
    const cg = ctx.createLinearGradient(1232, 0, 1284, 0);
    cg.addColorStop(0, "#8d9099");
    cg.addColorStop(1, "#d9dce4");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(1232, 400);
    ctx.lineTo(1232, 500);
    ctx.lineTo(1282, 575);
    ctx.lineTo(1290, 575);
    ctx.lineTo(1290, 325);
    ctx.lineTo(1282, 325);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(63,224,255,${0.25 + 0.75 * clamp(C.cyanDraw * 3 + C.lowsCyan * 3)})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // The traces: microphone to chip to speaker.
    ctx.strokeStyle = `rgba(63,224,255,${0.28 + 0.4 * C.chip})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(1050, 320);
    ctx.lineTo(1076, 346);
    ctx.lineTo(1076, 423);
    ctx.moveTo(1142, 450);
    ctx.lineTo(1196, 450);
    ctx.stroke();
    // The signal running along them: amber from the microphone, cyan from the chip.
    const blip = (x, y, colour, a) => {
      if (a <= 0.01) return;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, 26);
      rg.addColorStop(0, colour);
      rg.addColorStop(1, "transparent");
      ctx.globalAlpha = C.vis * a;
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = C.vis;
    };
    if (C.sig > 0 && C.sig < 1) {
      const u = C.sig;
      const p = u < 0.3 ? [mix(1050, 1076, u / 0.3), mix(320, 346, u / 0.3)] : [1076, mix(346, 423, (u - 0.3) / 0.7)];
      blip(p[0], p[1], AMBER, 1);
    }
    if (C.sig2 > 0 && C.sig2 < 1) blip(mix(1142, 1196, C.sig2), 450, CYAN, 1);

    // The microphone: a small capsule on the outside, with its grille.
    ctx.save();
    ctx.translate(1048, 300);
    if (C.mic > 0.01) {
      const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 70);
      rg.addColorStop(0, `rgba(63,224,255,${0.55 * C.mic})`);
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(0, 0, 70, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "#4a4a52";
    ctx.beginPath();
    ctx.roundRect(-14, -24, 26, 48, 10);
    ctx.fill();
    ctx.strokeStyle = C.mic > 0.05 ? CYAN : "#9a9aa4";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = "#111";
    for (let r = -2; r <= 2; r++) for (let c = 0; c < 2; c++) ctx.fillRect(-8 + c * 9, r * 8 - 2, 4, 4);
    ctx.restore();

    // The chip, in the shell's back wall.
    ctx.save();
    ctx.translate(1115, 450);
    if (C.chip > 0.01) {
      const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 90);
      rg.addColorStop(0, `rgba(63,224,255,${0.6 * C.chip})`);
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(0, 0, 90, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "#101014";
    ctx.fillRect(-27, -27, 54, 54);
    ctx.strokeStyle = C.chip > 0.05 ? CYAN : "#7c7c86";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-27, -27, 54, 54);
    ctx.fillStyle = "#a8acb6";
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(i * 10 - 2, -33, 4, 6);
      ctx.fillRect(i * 10 - 2, 27, 4, 6);
    }
    ctx.restore();
    ctx.restore();
  }

  // ── Lanes: the noise, its flipped copy, and their sum ─────────────────
  // The clatter: bursts in time, travelling right at 520 px a second.
  const BURSTS = [];
  {
    const r = seeded(31);
    for (let i = 0; i < 9; i++) BURSTS.push({ at: i * 0.62 + r() * 0.25, f: [26 + r() * 14, 41 + r() * 20, 63 + r() * 30], p: [r() * 6, r() * 6, r() * 6], a: 0.8 + r() * 0.4 });
  }
  const clatter = (tau) => {
    let y = 0;
    for (const b of BURSTS) {
      const d = tau - b.at;
      if (d < 0 || d > 0.4) continue;
      const env = Math.exp(-d / 0.09) * clamp(d / 0.01);
      y += b.a * env * (0.6 * Math.sin(TAU * b.f[0] * d + b.p[0]) + 0.3 * Math.sin(TAU * b.f[1] * d + b.p[1]) + 0.25 * Math.sin(TAU * b.f[2] * d + b.p[2]));
    }
    return y * 1.05;
  };
  function lanes(ctx, t) {
    const N = L.lanes;
    if (N.vis <= 0.004) return;
    const { x0, x1 } = N;
    const A = 80;
    const k = TAU / AIR.lambda;
    const noise = (x) => -Math.cos(k * (x - AIR.v * t));
    const flip = (x) => Math.cos(k * (x - AIR.v * t) - TAU * N.lag);
    // The clatter, as if heard at the left edge: the trace at x is what arrived (x - x0) / 520 seconds ago.
    const T0 = L.lanes.t0 ?? 0;
    const cl = (x) => clatter(t - T0 - (x - x0) / 380);
    const LAG = 0.09;
    const clCopy = (x) => -clatter(t - T0 - LAG - (x - x0) / 380);
    const n = (x) => mix(noise(x), cl(x), N.clat);
    const f = (x) => mix(flip(x), clCopy(x) * N.copyVis, N.clat);
    ctx.save();
    ctx.globalAlpha = N.vis;
    // Baselines, faint.
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    for (const y of [300, 500, 700]) {
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
    }
    line(ctx, (x) => 300 - A * n(x), x0, x1, AMBER, { width: 6, alpha: N.vis });
    line(ctx, (x) => 500 - A * f(x), x0, x1, CYAN, { width: 6, alpha: N.vis * mix(N.flipVis, N.copyVis, N.clat) });
    line(ctx, (x) => 700 - A * (n(x) + f(x)), x0, x1, WHITE, { width: 6, alpha: N.vis * N.sumVis });
    ctx.restore();
  }

  // ── The to-scale view: 400 px a metre, the listener at x 1640 ─────────
  // World coordinates are frame pixels at z = 1; the camera zooms about (px, py), which lands at (sx, sy).
  const HEAD = { x: 1640, y: 470, r: 31 };
  function scale(ctx, t) {
    const S = L.sc;
    if (S.vis <= 0.004) return;
    const toS = (wx) => (wx - S.px) * S.z + S.sx;
    const toW = (sx) => (sx - S.sx) / S.z + S.px;
    const ys = (wy) => (wy - S.py) * S.z + S.sy;
    ctx.save();
    ctx.globalAlpha = S.vis;
    // The waves, drawn in screen space so their lines stay crisp at any zoom. Pressure height is not a length:
    // it stays the same size on screen.
    const headLeft = toS(HEAD.x - HEAD.r - 8);
    const srcX = toS(180);
    const lamHum = 1372;
    const lamSq = 27.44;
    const yAxis = ys(HEAD.y);
    if (S.hum > 0.004) line(ctx, (sx) => yAxis - 180 * pressure(toW(sx), t, lamHum, 90), Math.max(0, srcX), Math.min(W, headLeft), AMBER, { width: 6, alpha: S.hum });
    if (S.sq > 0.004) {
      const step = Math.max(0.8, Math.min(2, lamSq * S.z / 14));
      line(ctx, (sx) => yAxis - mix(120, 170, clamp((S.z - 1) / 9)) * pressure(toW(sx), t, lamSq, 90), Math.max(0, srcX), Math.min(W, headLeft), AMBER, { width: mix(3, 6, clamp((S.z - 1) / 9)), alpha: S.sq, step });
    }
    // The engine: a generic nacelle, dark, its intake lit by the rim.
    if (S.nacelle > 0.004) {
      ctx.save();
      ctx.globalAlpha = S.vis * S.nacelle;
      ctx.translate(toS(0), ys(470));
      ctx.scale(S.z, S.z);
      const ng = ctx.createLinearGradient(0, -150, 0, 150);
      ng.addColorStop(0, "#4a4a52");
      ng.addColorStop(0.5, "#1e1e23");
      ng.addColorStop(1, "#0e0e11");
      ctx.fillStyle = ng;
      ctx.beginPath();
      ctx.moveTo(-200, -150);
      ctx.lineTo(150, -135);
      ctx.quadraticCurveTo(185, -130, 185, -100);
      ctx.lineTo(185, 100);
      ctx.quadraticCurveTo(185, 130, 150, 135);
      ctx.lineTo(-200, 150);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,190,110,0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(185, 0, 14, 116, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    // The squeak's source: a small pulsing point.
    if (S.src > 0.004) {
      const r = 10 + 4 * Math.sin(t * 40);
      const rg = ctx.createRadialGradient(srcX, yAxis, 0, srcX, yAxis, r * 4);
      rg.addColorStop(0, `rgba(255,200,120,${S.src})`);
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(srcX, yAxis, r * 4, 0, TAU);
      ctx.fill();
    }
    // The listener from above, nose up: a head 15 cm wide (62 px), hair on top, ears with cups over them.
    ctx.save();
    ctx.translate(toS(HEAD.x), ys(HEAD.y));
    ctx.scale(S.z, S.z);
    if (S.glow > 0.004) {
      const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 90);
      rg.addColorStop(0, `rgba(63,224,255,${0.5 * S.glow})`);
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(0, 0, 90, 0, TAU);
      ctx.fill();
    }
    const hg = ctx.createRadialGradient(-8, -10, 2, 0, 0, HEAD.r * 1.1);
    hg.addColorStop(0, "#5a4032");
    hg.addColorStop(0.75, "#2e1f18");
    hg.addColorStop(1, "#1a110d");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(0, 0, HEAD.r, HEAD.r * 1.18, 0, 0, TAU);
    ctx.fill();
    // The band over the top of the head, and the two cups (9 cm tall, 3 cm deep).
    ctx.strokeStyle = "#9aa0aa";
    ctx.lineWidth = Math.max(1.2, 3.2 / Math.sqrt(S.z));
    ctx.beginPath();
    ctx.moveTo(-HEAD.r - 6, 0);
    ctx.lineTo(HEAD.r + 6, 0);
    ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#26262c";
      ctx.strokeStyle = S.glow > 0.05 ? `rgba(63,224,255,${0.5 + 0.5 * S.glow})` : "#8a8a94";
      ctx.lineWidth = Math.max(0.6, 1.6 / Math.sqrt(S.z));
      ctx.beginPath();
      ctx.roundRect(side > 0 ? HEAD.r - 1 : -HEAD.r - 11, -18, 12, 36, 5);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  // ── Rings: pressure fronts spreading from a source (the hook), and the closing rings of the payoff ──────
  function rings(ctx, t) {
    const R = L.rings;
    if (R.vis > 0.004) {
      ctx.save();
      const off = (t * R.v) % R.lambda;
      for (let i = 0; i < 12; i++) {
        const r = off + i * R.lambda;
        const a = R.vis * clamp(r / 300) * clamp((2900 - r) / 900);
        if (a <= 0.01) continue;
        ctx.strokeStyle = R.colour;
        ctx.globalAlpha = a * 0.16;
        ctx.lineWidth = 26;
        ctx.beginPath();
        ctx.arc(R.cx, R.cy, r, -1.1, 1.1);
        ctx.stroke();
        ctx.globalAlpha = a * 0.55;
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.restore();
    }
    const Cl = L.close;
    if (Cl.vis > 0.004) {
      ctx.save();
      const ra = mix(Cl.r0, Cl.r1, Cl.k);
      const rc = mix(Cl.r1 * 0.55, Cl.r1, Cl.k);
      for (const [r, col] of [[ra, AMBER], [rc, CYAN]]) {
        ctx.strokeStyle = col;
        ctx.globalAlpha = Cl.vis * 0.2;
        ctx.lineWidth = 30;
        ctx.beginPath();
        ctx.arc(Cl.cx, Cl.cy, r, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = Cl.vis * 0.8;
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ── Over the glass ─────────────────────────────────────────────────────
  function overlays(ctx, t) {
    // The sum cards (s02): noise, and the same wave flipped.
    const E = L.eq;
    if (E.vis > 0.004) {
      const card = (x, sign, colour, a) => line(ctx, (xx) => 450 - sign * 80 * pressure(xx, t, 200, 60), x + 40, x + 440, colour, { width: 6, alpha: a * E.vis });
      card(110, 1, AMBER, E.a);
      card(720, -1, CYAN, E.b);
    }
    // Inside the chip (s06, s07).
    const Cw = L.chipw;
    if (Cw.vis > 0.004) {
      const lam = 420;
      const v = 60;
      const yin = 360;
      const yout = 650;
      const amp = 90;
      line(ctx, (x) => yin - amp * pressure(x, t, lam, v), 200, mix(200, 1720, Cw.inDraw), AMBER, { width: 6, alpha: Cw.vis });
      const fx = Cw.fly * 1900;
      ctx.save();
      ctx.translate(fx, 0);
      line(ctx, (x) => yout + amp * pressure(x, t, lam, v), 200, mix(200, 1720, Cw.outDraw), CYAN, { width: 6, alpha: Cw.vis * (1 - Cw.fly * 0.6) });
      ctx.restore();
      // The links: from each squeeze of the noise to the stretch under it, and the other way round.
      if (Cw.links > 0.004) {
        ctx.save();
        ctx.setLineDash([14, 12]);
        ctx.lineWidth = 3;
        for (let n = -3; n < 8; n++) {
          for (const half of [0, 0.5]) {
            const x = crestX(t, n + half, lam, v);
            if (x < 230 || x > 1690) continue;
            const order = (x - 230) / 1460;
            const a = clamp((Cw.links - order) * 6) * Cw.vis * (1 - Cw.fly);
            if (a <= 0.01) continue;
            ctx.strokeStyle = `rgba(255,255,255,${0.7 * a})`;
            ctx.beginPath();
            ctx.moveTo(x, half ? yin + amp + 10 : yin - amp - 10);
            ctx.lineTo(x, half ? yout - amp - 10 : yout + amp + 10);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
    // The meters' panel (s14, s17): the sound against time, its copy a little late, and what is left over.
    const M = L.mw;
    if (M.vis > 0.004) {
      const lamP = 355;
      const v = 60;
      // The copy is late by the example delay: 1/300 of a cycle for the hum (1.2 px), 1/6 for the squeak (59 px).
      const shift = mix(lamP / 300, lamP / 6, M.sq) * M.copy;
      const n = (x) => pressure(x, t, lamP, v);
      const c = (x) => -pressure(x - shift, t, lamP, v);
      line(ctx, (x) => 320 - 70 * n(x), 360, 1070, AMBER, { width: 5, alpha: M.vis });
      line(ctx, (x) => 500 - 70 * c(x), 360, 1070, CYAN, { width: 5, alpha: M.vis });
      line(ctx, (x) => 680 - 70 * (n(x) + c(x)), 360, 1070, WHITE, { width: 5, alpha: M.vis * M.left });
      text(ctx, "left over", 150, 680, { size: 30, colour: WHITE, alpha: M.vis * M.left });
    }
    // The recap's small pictures.
    const Rc = L.recap;
    if (Rc.vis > 0.004) {
      ctx.save();
      ctx.translate(0, 70);
      // 1: the microphone, hearing the noise.
      if (Rc.c1 > 0.01) {
        ctx.save();
        ctx.globalAlpha = Rc.vis * Rc.c1;
        line(ctx, (x) => 330 - 40 * pressure(x, t, 120, 60), 150, 260, AMBER, { width: 5, alpha: Rc.vis * Rc.c1 });
        ctx.fillStyle = "#4a4a52";
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(290, 290, 46, 84, 18);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#111";
        for (let r = 0; r < 5; r++) for (let c2 = 0; c2 < 2; c2++) ctx.fillRect(302 + c2 * 14, 302 + r * 13, 7, 7);
        ctx.fillStyle = "#8a8a94";
        ctx.fillRect(310, 374, 6, 50);
        ctx.restore();
      }
      if (Rc.c2 > 0.01) {
        line(ctx, (x) => 290 - 55 * pressure(x, t, 160, 60), 600, 920, AMBER, { width: 5, alpha: Rc.vis * Rc.c2 });
        line(ctx, (x) => 430 + 55 * pressure(x, t, 160, 60), 600, 920, CYAN, { width: 5, alpha: Rc.vis * Rc.c2 });
      }
      if (Rc.c3 > 0.01) {
        line(ctx, (x) => 360 - 55 * pressure(x, t, 160, 60), 1050, 1370, AMBER, { width: 3, alpha: Rc.vis * Rc.c3 * 0.3 });
        line(ctx, (x) => 360 + 55 * pressure(x, t, 160, 60), 1050, 1370, CYAN, { width: 3, alpha: Rc.vis * Rc.c3 * 0.3 });
        line(ctx, () => 360, 1050, 1370, WHITE, { width: 6, alpha: Rc.vis * Rc.c3 });
      }
      if (Rc.c4 > 0.01) {
        ctx.save();
        ctx.globalAlpha = Rc.vis * Rc.c4;
        const fg = ctx.createRadialGradient(1625, 300, 6, 1635, 330, 90);
        fg.addColorStop(0, "#8c8070");
        fg.addColorStop(0.7, "#2b2a30");
        fg.addColorStop(1, "#18181c");
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.ellipse(1635, 330, 46, 84, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,214,150,0.8)";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
        line(ctx, (x) => 330 - 22 * pressure(x, t, 30, 60), 1490, 1585, AMBER, { width: 3, alpha: Rc.vis * Rc.c4, step: 1 });
      }
      ctx.restore();
    }
    // The poster's small sum: noise + its flip = a flat line.
    const P = L.poster;
    if (P.vis > 0.004) {
      line(ctx, (x) => 760 - 42 * pressure(x, t, 150, 50), 120, 380, AMBER, { width: 5, alpha: P.vis });
      text(ctx, "+", 425, 760, { size: 52, alpha: P.vis, align: "center" });
      line(ctx, (x) => 760 + 42 * pressure(x, t, 150, 50), 470, 730, CYAN, { width: 5, alpha: P.vis });
      text(ctx, "=", 775, 760, { size: 52, alpha: P.vis, align: "center" });
      line(ctx, () => 760, 820, 1040, WHITE, { width: 6, alpha: P.vis });
    }
    // The inset at your ear (s13): the hum's pressure against time, the same cycle again and again.
    const S = L.sc;
    if (S.inset > 0.004) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(1170, 778, 630, 70);
      ctx.clip();
      line(ctx, (x) => 813 - 26 * pressure(x, t, 110, -150), 1185, 1785, AMBER, { width: 4, alpha: S.inset });
      ctx.restore();
    }
    // The to-scale rulers: one wave of the hum (1,372 px) and, ten times closer, of the squeak (274 px).
    if (S.vis > 0.004) {
      ruler(ctx, 228, 1600, 682, S.ruler, S.vis);
      ruler(ctx, 330, 604, 770, S.rulerSq, S.vis);
    }
  }

  return {
    L,
    clatter,
    draw(t) {
      g.clearRect(0, 0, W, H);
      o.clearRect(0, 0, W, H);
      rings(g, t);
      const A = L.air;
      if (A.vis > 0.004) {
        g.save();
        g.translate(A.camx, A.camy);
        g.scale(A.camz, A.camz);
        g.translate(-960, -460);
        airField(g, t, { x0: A.x0, x1: A.x1, y0: A.y0, y1: A.y1, amp: A.amp, alpha: A.vis });
        if (A.curve > 0.004) line(g, (x) => A.cy - 150 * pressure(x, t) * A.amp, A.x0, mix(A.x0, A.x1, A.curve), AMBER, { width: 6, alpha: A.vis });
        g.restore();
      }
      cup(g, t);
      lanes(g, t);
      scale(g, t);
      overlays(o, t);
    },
  };
}
