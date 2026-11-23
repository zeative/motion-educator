// Reading frames as numbers: the shared half of kit/tools/reference.mjs and kit/tools/lookmatch.mjs.
// Frames are decoded by FFmpeg into small RGB buffers (no image library to install), then measured: colour in CIELAB,
// a palette by k-means, the background at the frame's edge, edges, grain, and how much changes from one frame to the
// next. The methods follow reanimate's compare and capture scripts (https://github.com/NiazMorshed2007/reanimate, MIT).
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";

export const IMAGES = /\.(png|jpe?g|webp)$/i;
export const listFrames = (dir) => readdirSync(dir).filter((f) => IMAGES.test(f)).sort().map((f) => join(dir, f));

// One or many images, each scaled to `width` (height follows the first image's shape), as RGB buffers.
export function decode(files, width = 320) {
  if (!files.length) return { frames: [], w: 0, h: 0 };
  const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", files[0]], { encoding: "utf8" });
  const [iw, ih] = probe.stdout.trim().split(",").map(Number);
  if (!(iw > 0)) throw new Error(`cannot read ${files[0]}`);
  const w = Math.min(width, iw), h = Math.max(2, Math.round((ih / iw) * w / 2) * 2);
  const frames = [];
  // In batches through one FFmpeg each: decoding is the slow part, a process per image would be slower still.
  for (let i = 0; i < files.length; i += 64) {
    const batch = files.slice(i, i + 64);
    const inputs = batch.flatMap((f) => ["-i", f]);
    // Each image scaled to the same size, then joined into one stream in order (several outputs to one pipe would
    // interleave).
    const chains = batch.map((_, k) => `[${k}:v]scale=${w}:${h}:flags=area,setsar=1,format=rgb24[o${k}]`).join(";");
    const join = `${batch.map((_, k) => `[o${k}]`).join("")}concat=n=${batch.length}:v=1:a=0[all]`;
    const out = spawnSync("ffmpeg", ["-v", "error", ...inputs, "-filter_complex", `${chains};${join}`, "-map", "[all]", "-fps_mode", "passthrough", "-f", "rawvideo", "pipe:1"], { maxBuffer: 2 ** 30 });
    if (out.status !== 0) throw new Error(`ffmpeg could not decode frames: ${out.stderr}`);
    const size = w * h * 3;
    if (out.stdout.length !== size * batch.length) throw new Error(`ffmpeg returned ${out.stdout.length / size} frames for ${batch.length} images`);
    for (let k = 0; k < batch.length; k++) frames.push(out.stdout.subarray(k * size, (k + 1) * size));
  }
  return { frames, w, h };
}

// A video (or a stretch of one) straight to RGB buffers, `fps` frames a second, without writing files.
export function probeVideo(file) {
  const out = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,avg_frame_rate:format=duration", "-of", "json", file], { encoding: "utf8" });
  if (out.status !== 0) throw new Error(`cannot read ${file}: ${out.stderr.trim()}`);
  const info = JSON.parse(out.stdout), s = info.streams?.[0] ?? {};
  const rate = (r) => { const [a, b] = String(r ?? "0/1").split("/").map(Number); return b ? a / b : a; };
  return { file, width: s.width, height: s.height, fps: +(rate(s.avg_frame_rate) || rate(s.r_frame_rate)).toFixed(3), duration: Number(info.format?.duration ?? 0) };
}
export function decodeVideo(file, { fps = 10, width = 320, start = 0, end } = {}) {
  const info = probeVideo(file);
  const w = Math.min(width, info.width), h = Math.max(2, Math.round((info.height / info.width) * w / 2) * 2);
  const args = ["-v", "error", "-ss", String(start), "-i", file];
  if (end !== undefined) args.push("-t", String(end - start));
  args.push("-vf", `fps=${fps},scale=${w}:${h}:flags=area,format=rgb24`, "-f", "rawvideo", "pipe:1");
  const out = spawnSync("ffmpeg", args, { maxBuffer: 2 ** 31 });
  if (out.status !== 0) throw new Error(`ffmpeg could not decode ${file}: ${out.stderr}`);
  const size = w * h * 3, frames = [];
  for (let p = 0; p + size <= out.stdout.length; p += size) frames.push(out.stdout.subarray(p, p + size));
  return { frames, w, h, fps, start };
}
// Writes RGB buffers as numbered PNGs (0000.png, 0001.png ...) through one FFmpeg.
export function writeFrames({ frames, w, h }, dir) {
  const out = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${w}x${h}`, "-i", "pipe:0", "-start_number", "0", join(dir, "%04d.png")], { input: Buffer.concat(frames), maxBuffer: 2 ** 30 });
  if (out.status !== 0) throw new Error(`ffmpeg could not write frames: ${out.stderr}`);
}
// A box blur run twice (close to a gaussian): grain and particles placed differently but alike in density stop
// counting as a difference.
export function blur(frame, w, h, r) {
  if (!(r > 0)) return frame;
  let a = Float32Array.from(frame), b = new Float32Array(a.length);
  const pass = (from, to, horizontal) => {
    const n = horizontal ? w : h, m = horizontal ? h : w;
    for (let j = 0; j < m; j++) for (let c = 0; c < 3; c++) {
      const idx = (i) => (horizontal ? j * w + i : i * w + j) * 3 + c;
      let acc = 0, cnt = 0;
      for (let i = 0; i <= Math.min(r, n - 1); i++) { acc += from[idx(i)]; cnt++; }
      for (let i = 0; i < n; i++) {
        to[idx(i)] = acc / cnt;
        if (i + r + 1 < n) { acc += from[idx(i + r + 1)]; cnt++; }
        if (i - r >= 0) { acc -= from[idx(i - r)]; cnt--; }
      }
    }
  };
  for (let k = 0; k < 2; k++) { pass(a, b, true); pass(b, a, false); }
  return Uint8Array.from(a, (v) => Math.round(v));
}

// ── Colour ────────────────────────────────────────────────────────────────
const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export function lab(r, g, b) {
  const R = lin(r), G = lin(g), B = lin(b);
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047), y = f(R * 0.2126 + G * 0.7152 + B * 0.0722), z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
export const hexToLab = (hex) => {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return lab((n >> 16) & 255, (n >> 8) & 255, n & 255);
};
const toHex = ([r, g, b]) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
// CIEDE2000: how different two colours look, about 1 = just noticeable, under 10 = the same family.
export function deltaE([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180, C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G), C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h1 = (Math.atan2(b1, a1p) / rad + 360) % 360, h2 = (Math.atan2(b2, a2p) / rad + 360) % 360;
  const dL = L2 - L1, dC = C2p - C1p;
  let dh = h2 - h1;
  if (C1p * C2p === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh * rad) / 2);
  const Lm = (L1 + L2) / 2, Cmp = (C1p + C2p) / 2;
  let hm = h1 + h2;
  if (C1p * C2p !== 0) hm = Math.abs(h1 - h2) > 180 ? (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2 : (h1 + h2) / 2;
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const SL = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2), SC = 1 + 0.045 * Cmp, SH = 1 + 0.015 * Cmp * T;
  const RT = -2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}

// The colours a set of frames is made of: k-means in CIELAB over a seeded sample of pixels.
export function palette({ frames, w, h }, k = 6, sample = 24000) {
  let seed = 7;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const px = [];
  const per = Math.max(1, Math.floor(sample / Math.max(1, frames.length)));
  for (const f of frames) for (let i = 0; i < per; i++) {
    const p = Math.floor(rand() * w * h) * 3;
    px.push([f[p], f[p + 1], f[p + 2]]);
  }
  const L = px.map(([r, g, b]) => lab(r, g, b));
  const centres = [L[Math.floor(rand() * L.length)]];
  while (centres.length < k) {
    const d = L.map((p) => Math.min(...centres.map((c) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2)));
    let r = rand() * d.reduce((a, b) => a + b, 0), i = 0;
    while (r > d[i] && i < d.length - 1) r -= d[i++];
    centres.push(L[i]);
  }
  let assign = new Array(L.length).fill(0);
  for (let it = 0; it < 14; it++) {
    assign = L.map((p) => centres.reduce((best, c, j) => ((p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2 < best[1] ? [j, (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2] : best), [0, Infinity])[0]);
    for (let j = 0; j < k; j++) {
      const mine = L.filter((_, i) => assign[i] === j);
      if (mine.length) centres[j] = [0, 1, 2].map((c) => mine.reduce((s, p) => s + p[c], 0) / mine.length);
    }
  }
  return centres.map((c, j) => {
    const members = px.filter((_, i) => assign[i] === j);
    const rgb = [0, 1, 2].map((c2) => members.reduce((s, p) => s + p[c2], 0) / Math.max(1, members.length));
    return { hex: toHex(rgb), lab: c, share: members.length / px.length };
  }).filter((c) => c.share > 0).sort((a, b) => b.share - a.share);
}

// What a frame looks like, as numbers: lightness and colourfulness, the background at its edge, how much of it is
// edges, and how grainy its flat parts are.
export function looks({ frames, w, h }) {
  const out = frames.map((f) => {
    let Ls = 0, Cs = 0, n = 0;
    const gray = new Float32Array(w * h);
    for (let i = 0, p = 0; i < w * h; i++, p += 3) {
      const [L, a, b] = lab(f[p], f[p + 1], f[p + 2]);
      gray[i] = L;
      if (i % 3 === 0) { Ls += L; Cs += Math.hypot(a, b); n++; }
    }
    const edge = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < w * 0.06 || x > w * 0.94 || y < h * 0.06 || y > h * 0.94) if ((x + y) % 2 === 0) edge.push(f.subarray((y * w + x) * 3, (y * w + x) * 3 + 3));
    let edges = 0, grain = 0, flat = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = gray[i + 1] - gray[i - 1], gy = gray[i + w] - gray[i - w];
      const g = Math.hypot(gx, gy);
      if (g > 12) edges++;
      else if (g < 4) { grain += Math.abs(gray[i] - (gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w]) / 4); flat++; }
    }
    const bg = [0, 1, 2].map((c) => edge.map((p) => p[c]).sort((a, b) => a - b)[Math.floor(edge.length / 2)] ?? 0);
    return { lightness: Ls / n, chroma: Cs / n, background: toHex(bg), backgroundLab: lab(...bg), edges: edges / ((w - 2) * (h - 2)), grain: flat ? grain / flat : 0 };
  });
  return out;
}

// How much the picture changes from each frame to the next (0 = identical): reads cuts, holds and stepped motion
// without caring about colours or content, which is how reanimate compares timing.
export function activity({ frames, w, h }) {
  const a = [0];
  for (let k = 1; k < frames.length; k++) {
    const A = frames[k - 1], B = frames[k];
    let s = 0;
    for (let p = 0; p < A.length; p += 3) s += Math.abs(A[p] - B[p]) + Math.abs(A[p + 1] - B[p + 1]) + Math.abs(A[p + 2] - B[p + 2]);
    a.push(s / (w * h * 3 * 255));
  }
  return a;
}
// Pixel mismatch between two frames of the same size: the share of pixels that differ by more than `threshold`.
export function mismatch(A, B, threshold = 0.1) {
  let diff = 0;
  const t = threshold * 255 * 3;
  for (let p = 0; p < A.length; p += 3) if (Math.abs(A[p] - B[p]) + Math.abs(A[p + 1] - B[p + 1]) + Math.abs(A[p + 2] - B[p + 2]) > t) diff++;
  return diff / (A.length / 3);
}
export const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
export const isVideo = (file) => existsSync(file) && !IMAGES.test(file) && /\.(mp4|mov|webm|mkv|gif|avi|m4v)$/i.test(extname(file));
