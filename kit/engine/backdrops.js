// Stages for templates that are not graphite: paper, a chalkboard, a whiteboard, a blueprint sheet, a flat colour, a
// neon grid. Each is painted once into a texture larger than the frame (seeded, so every render is the same) and
// drawn each frame with the camera's travel (state.camx, state.camy) as a slow parallax, so whips still move the set.
// The graphite shader stays in stage.js; "none" leaves the canvas clear for a 3D or pixel layer that draws it all.
//
//   const backdrop = createFlatBackdrop(canvas, look);   // look = template.json (stage, paper, ink, palette)
//   backdrop.render(state);                              // same state object as stage.js
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rgb = (hex) => {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Fine grain and fibres over a flat colour: the paper every hand-made look sits on.
function grain(ctx, w, h, rand, { amount = 10, fibres = 0, ink = [0, 0, 0] } = {}) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = `rgba(${ink.join(",")},0.05)`;
  ctx.lineWidth = 1;
  for (let i = 0; i < fibres; i++) {
    const x = rand() * w, y = rand() * h, a = rand() * Math.PI, l = 6 + rand() * 18;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (rand() - 0.5) * 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
}
function vignette(ctx, w, h, strength, colour = [0, 0, 0]) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.62);
  g.addColorStop(0, `rgba(${colour.join(",")},0)`);
  g.addColorStop(1, `rgba(${colour.join(",")},${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
function smudges(ctx, w, h, rand, n, colour, alpha) {
  ctx.save();
  ctx.filter = "blur(40px)";
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(${colour.join(",")},${alpha * (0.5 + rand())})`;
    ctx.beginPath();
    ctx.ellipse(rand() * w, rand() * h, 120 + rand() * 360, 40 + rand() * 120, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

const PAINT = {
  paper(ctx, w, h, look, rand) {
    ctx.fillStyle = look.paper ?? "#f6f1e7";
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, rand, { amount: 12, fibres: Math.round((w * h) / 9000), ink: rgb(look.ink ?? "#1b1b1b") });
  },
  board(ctx, w, h, look, rand) {
    ctx.fillStyle = look.paper ?? "#1f3b2d";
    ctx.fillRect(0, 0, w, h);
    smudges(ctx, w, h, rand, 14, [255, 255, 255], 0.035);
    grain(ctx, w, h, rand, { amount: 9, fibres: Math.round((w * h) / 30000), ink: [255, 255, 255] });
  },
  whiteboard(ctx, w, h, look, rand) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.6, look.paper ?? "#fbfbf8");
    g.addColorStop(1, "#efefea");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    smudges(ctx, w, h, rand, 6, [150, 170, 200], 0.05);
    grain(ctx, w, h, rand, { amount: 3 });
  },
  blueprint(ctx, w, h, look, rand) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, look.paper ?? "#0d3b66");
    g.addColorStop(1, look.palette?.[1] ?? "#134e8a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const line = rgb(look.ink ?? "#e8f1ff");
    for (const [step, alpha, width] of [[20, 0.08, 1], [200, 0.16, 1.5]]) {
      ctx.strokeStyle = `rgba(${line.join(",")},${alpha})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let x = 0; x <= w; x += step) ctx.moveTo(x + 0.5, 0), ctx.lineTo(x + 0.5, h);
      for (let y = 0; y <= h; y += step) ctx.moveTo(0, y + 0.5), ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }
    grain(ctx, w, h, rand, { amount: 6 });
  },
  flat(ctx, w, h, look) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, look.paper ?? "#eef1ff");
    g.addColorStop(1, look.palette?.[0] ?? look.paper ?? "#eef1ff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  },
  neon(ctx, w, h, look) {
    ctx.fillStyle = look.paper ?? "#07070c";
    ctx.fillRect(0, 0, w, h);
    // A perspective grid toward a horizon at 62 % of the height, fading as it recedes.
    const hy = h * 0.62, line = rgb(look.palette?.[2] ?? "#f15bb5");
    ctx.lineWidth = 2;
    for (let i = -24; i <= 24; i++) {
      ctx.strokeStyle = `rgba(${line.join(",")},0.22)`;
      ctx.beginPath();
      ctx.moveTo(w / 2 + i * 8, hy);
      ctx.lineTo(w / 2 + i * w * 0.09, h);
      ctx.stroke();
    }
    for (let k = 1; k < 14; k++) {
      const y = hy + (h - hy) * (k / 14) ** 2;
      ctx.strokeStyle = `rgba(${line.join(",")},${0.08 + 0.2 * (k / 14)})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    const fade = ctx.createLinearGradient(0, hy - 40, 0, hy + 160);
    fade.addColorStop(0, look.paper ?? "#07070c");
    fade.addColorStop(1, "rgba(7,7,12,0)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, hy - 40, w, 200);
  },
};

export function createFlatBackdrop(canvas, look) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const kind = look.stage ?? "paper";
  if (kind === "none") return { kind, render() { ctx.clearRect(0, 0, W, H); } };
  const paint = PAINT[kind];
  if (!paint) throw new Error(`no stage called "${kind}": use graphite, paper, board, whiteboard, blueprint, flat, neon or none`);
  // A margin on every side, so a camera move never shows the texture's edge.
  const M = Math.round(Math.max(W, H) * 0.12);
  const tex = Object.assign(document.createElement("canvas"), { width: W + 2 * M, height: H + 2 * M });
  const tctx = tex.getContext("2d", { willReadFrequently: true });
  paint(tctx, tex.width, tex.height, look, rng(look.seed ?? 7));
  if (kind !== "flat" && kind !== "neon") vignette(tctx, tex.width, tex.height, kind === "board" ? 0.35 : 0.12);
  const glow = rgb(look.palette?.[1] ?? "#00f5d4");
  return {
    kind,
    render(state) {
      // The set moves a fifth of the camera's travel: enough to feel the move, never enough to lose the page.
      const dx = Math.max(-M, Math.min(M, -(state.camx ?? 0) * M * 0.2));
      const dy = Math.max(-M, Math.min(M, (state.camy ?? 0) * M * 0.2));
      ctx.drawImage(tex, -M + dx, -M + dy);
      if (kind === "neon" && state.glow > 0) {
        // Neon is the one flat stage with a light: a soft halo where the stage light sits.
        const x = (state.lx ?? 0.5) * W, y = (1 - (state.ly ?? 0.6)) * H;
        const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(W, H) * 0.45);
        g.addColorStop(0, `rgba(${glow.join(",")},${0.16 * state.glow})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      if (state.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, state.flash) * 0.6})`;
        ctx.fillRect(0, 0, W, H);
      }
    },
  };
}
