// Studying a reference: the frames, colours, texture and timing of a video (or stills) you want a template to look
// like, and comparing what you built against it. The loop is reanimate's (https://github.com/NiazMorshed2007/reanimate,
// MIT, Copyright (c) 2026 Niaz Morshed): capture the reference, write down what it is made of, build, capture what you
// built, compare, and repeat until the numbers and your eye agree. references/templates.md walks through it.
//
//   node kit/tools/reference.mjs study   ref.mp4 --out templates/KEY/reference [--start 3 --end 9]
//        frames, contact sheet, palette, texture and timing in one pass; writes study.md and a template.json draft
//   node kit/tools/reference.mjs probe   ref.mp4                       duration, size, frame rate
//   node kit/tools/reference.mjs frames  ref.mp4 --out DIR [--fps 10] [--start 3] [--end 9] [--crop x,y,w,h] [--width 960]
//   node kit/tools/reference.mjs sheet   DIR [--out DIR] [--every 2] [--cols 6] [--per 24] [--width 240]
//   node kit/tools/reference.mjs sheet   --ref DIR --clone DIR [--diff DIR] --out DIR [--offset K]
//   node kit/tools/reference.mjs compare --ref DIR --clone DIR --out DIR [--offset K] [--blur 6] [--threshold 0.05]
//   node kit/tools/reference.mjs palette ref.mp4|DIR|a.png ... [--k 6]
//   node kit/tools/reference.mjs motion  ref.mp4|DIR [--fps 24]
//
// A reference is anything that shows the look: a clip, a screen recording, a GIF, a folder of stills, a page you
// captured. Only study what you may use as a reference; a template takes the look, never the footage.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { IMAGES, blur, decode, decodeVideo, deltaE, hexToLab, isVideo, lab, listFrames, looks, median, mismatch, palette, probeVideo, writeFrames } from "./analysis.mjs";

const argv = process.argv.slice(2);
const command = argv[0];
const flag = (name, fallback) => (argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback);
const num = (name, fallback) => (flag(name) === undefined ? fallback : Number(flag(name)));
const has = (name) => argv.includes(`--${name}`);
// The positional arguments: everything that is not a flag or a flag's value.
const SWITCHES = new Set(["--help", "--no-diffs"]);
const positional = argv.slice(1).filter((arg, i, all) => !arg.startsWith("--") && !(i > 0 && all[i - 1].startsWith("--") && !SWITCHES.has(all[i - 1])));
const time = (v) => {
  if (v === undefined) return undefined;
  const s = String(v);
  if (s.endsWith("ms")) return Number(s.slice(0, -2)) / 1000;
  if (s.includes(":")) return s.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
  return Number(s);
};
const rect = (v) => (v ? (([x, y, width, height]) => ({ x, y, width, height }))(String(v).split(",").map(Number)) : undefined);
const ensure = (dir) => (mkdirSync(dir, { recursive: true }), dir);
const clean = (dir) => { for (const f of readdirSync(dir)) if (IMAGES.test(f)) unlinkSync(join(dir, f)); };
const fpsOf = (dir, fallback = 10) => {
  for (const file of [join(dir, "frames.json"), join(dir, "..", "frames.json")]) if (existsSync(file)) return Number(JSON.parse(readFileSync(file, "utf8")).fps) || fallback;
  return fallback;
};
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const HELP = readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).slice(5, 17).map((l) => l.slice(3)).join("\n");

// Whatever was passed (a video, a folder of frames, images) as decoded frames.
function load(inputs, { fps = 2, width = 320, start, end } = {}) {
  const paths = inputs.map((p) => resolve(p));
  if (paths.length === 1 && isVideo(paths[0])) return { ...decodeVideo(paths[0], { fps, width, start, end }), source: paths[0] };
  const files = paths.flatMap((p) => (statSync(p).isDirectory() ? listFrames(p) : [p]));
  if (!files.length) throw new Error(`no frames in ${inputs.join(", ")}`);
  return { ...decode(files, width), fps: paths.length === 1 && statSync(paths[0]).isDirectory() ? fpsOf(paths[0]) : undefined, source: paths.join(", ") };
}

// ── frames ────────────────────────────────────────────────────────────────
// Frame i of the folder is at the reference's time start + i / fps. frames.json records it.
function extract(input, out, { fps = 10, start = 0, end, crop, width } = {}) {
  const info = probeVideo(input);
  ensure(out);
  clean(out);
  const vf = [`fps=${fps}`];
  if (crop) vf.push(`crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`);
  if (width) vf.push(`scale=${width}:-2:flags=lanczos`);
  const args = ["-v", "error", "-y", "-ss", String(start), "-i", input];
  if (end !== undefined) args.push("-t", String(end - start));
  args.push("-vf", vf.join(","), "-fps_mode", "passthrough", "-start_number", "0", join(out, "%04d.png"));
  const run = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (run.status !== 0) throw new Error(`ffmpeg: ${run.stderr.trim()}`);
  const count = listFrames(out).length;
  const meta = { source: input, duration: info.duration, size: [info.width, info.height], sourceFps: info.fps, fps, start, end, crop, width, count, note: "frame i (NNNN.png, from 0) is at source time start + i / fps" };
  writeFileSync(join(out, "frames.json"), JSON.stringify(meta, null, 2));
  return meta;
}

// ── sheets ────────────────────────────────────────────────────────────────
// Rendered as HTML in Chromium, as reanimate does, so every frame carries a readable label.
const CSS = `body{margin:0;background:#111;color:#ddd;font:12px/1.3 ui-monospace,Menlo,monospace;padding:12px}
.hdr{margin:0 0 10px;color:#fff;font-weight:600}.grid{display:grid;gap:10px}.cell{display:flex;flex-direction:column;gap:3px}
img{display:block;background:#000;outline:1px solid #333}.cap{color:#9ad}.row{display:grid;gap:8px;margin-bottom:12px}
.cols{display:grid;gap:8px;color:#9ad;margin-bottom:4px}.sw{display:flex;gap:6px;margin:10px 0}.sw div{width:84px;height:44px;border-radius:6px;outline:1px solid #333;display:flex;align-items:end;padding:4px;box-sizing:border-box;font-size:10px}`;
const uri = (file) => `data:image/${/\.jpe?g$/i.test(file) ? "jpeg" : "png"};base64,${readFileSync(file).toString("base64")}`;
async function shoot(pages, out) {
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const written = [];
  for (const { name, html } of pages) {
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>${CSS}</style>${html}`, { waitUntil: "load" });
    await page.screenshot({ path: join(out, name), fullPage: true });
    written.push(join(out, name));
  }
  await browser.close();
  return written;
}
async function filmstrip(dir, out, { every = 1, cols = 6, per = 24, width = 240, title, swatches } = {}) {
  const fps = fpsOf(dir), start = (() => { try { return JSON.parse(readFileSync(join(dir, "frames.json"), "utf8")).start ?? 0; } catch { return 0; } })();
  const frames = listFrames(dir).map((file, i) => ({ file, i })).filter((f) => f.i % every === 0);
  const pages = [];
  for (let s = 0; s * per < frames.length; s++) {
    const chunk = frames.slice(s * per, (s + 1) * per);
    const cells = chunk.map((f) => `<div class="cell"><img src="${uri(f.file)}" style="width:${width}px"><div class="cap">#${f.i}  ${(start + f.i / fps).toFixed(2)} s</div></div>`).join("");
    const sw = swatches && s === 0 ? `<div class="sw">${swatches.map((c) => `<div style="background:${c.hex};color:${c.lab[0] > 55 ? "#000" : "#fff"}">${c.hex} ${pct(c.share)}</div>`).join("")}</div>` : "";
    pages.push({ name: `sheet-${String(s + 1).padStart(2, "0")}.png`, html: `<p class="hdr">${title ?? basename(dir)} · frames ${chunk[0].i}-${chunk.at(-1).i} · ${fps} fps</p>${sw}<div class="grid" style="grid-template-columns:repeat(${cols},max-content)">${cells}</div>` });
  }
  return shoot(pages, ensure(out));
}
async function compareSheet(refDir, cloneDir, out, { diffDir, offset = 0, every = 1, per = 8, width = 420 } = {}) {
  const fps = fpsOf(refDir), ref = listFrames(refDir), clone = listFrames(cloneDir);
  const report = diffDir && existsSync(join(diffDir, "..", "report.json")) ? JSON.parse(readFileSync(join(diffDir, "..", "report.json"), "utf8")) : null;
  const diffs = diffDir && existsSync(diffDir) ? listFrames(diffDir) : [];
  const cols = diffs.length ? 3 : 2, idx = [];
  for (let i = Math.max(0, -offset); i < ref.length && i + offset < clone.length; i += every) idx.push(i);
  const pages = [];
  for (let s = 0; s * per < idx.length; s++) {
    const rows = idx.slice(s * per, (s + 1) * per).map((i) => {
      const m = report?.frames?.[i]?.mismatch;
      const d = diffs.find((f) => basename(f) === `${String(i).padStart(4, "0")}.png`);
      return `<div class="cap">#${i}  ${(i / fps).toFixed(2)} s${m != null ? ` · mismatch ${pct(m)}` : ""}</div><div class="row" style="grid-template-columns:repeat(${cols},${width}px)"><img src="${uri(ref[i])}" style="width:${width}px"><img src="${uri(clone[i + offset])}" style="width:${width}px">${d ? `<img src="${uri(d)}" style="width:${width}px">` : ""}</div>`;
    }).join("");
    pages.push({ name: `compare-${String(s + 1).padStart(2, "0")}.png`, html: `<p class="hdr">reference / yours${cols === 3 ? " / difference (red)" : ""} · ${fps} fps · offset ${offset}</p><div class="cols" style="grid-template-columns:repeat(${cols},${width}px)"><div>reference</div><div>yours</div>${cols === 3 ? "<div>difference</div>" : ""}</div>${rows}` });
  }
  return shoot(pages, ensure(out));
}

// ── compare ───────────────────────────────────────────────────────────────
// Frame by frame: how many pixels differ (after an optional blur), and whether the motion starts, peaks and ends at
// the same moments (the activity curve, which ignores colour and content). The clone is aligned to the reference by
// the offset that matches their first frames best, unless --offset says.
function compare(refDir, cloneDir, out, { offset, maxShift = 15, blurR = 0, threshold = 0.05, motionThreshold = 0.08, pixelThreshold = 0.1, width = 480, diffs = true } = {}) {
  const fps = fpsOf(refDir);
  const ref = decode(listFrames(refDir), width);
  const clone = decode(listFrames(cloneDir), ref.w);
  if (clone.h !== ref.h) console.error(`warning: the frames are different shapes (${ref.w}x${ref.h} against ${clone.w}x${clone.h}): capture both at the same size`);
  if (clone.h !== ref.h) clone.frames = clone.frames.map((f) => (f.length === ref.frames[0].length ? f : Buffer.alloc(ref.frames[0].length)));
  const soft = (set) => (blurR ? set.frames.map((f) => blur(f, set.w, set.h, blurR)) : set.frames);
  const R = soft(ref), C = soft(clone);
  const m = (a, b) => mismatch(a, b, pixelThreshold);
  const changes = (frames) => frames.map((f, i) => (i ? m(frames[i - 1], f) : 0));
  const refAct = changes(ref.frames), cloneAct = changes(clone.frames);
  const window = (act, floor = 0.002) => {
    let first = -1, last = -1;
    act.forEach((v, i) => { if (v > floor) { if (first < 0) first = i; last = i; } });
    return { first, last, peak: act.indexOf(Math.max(...act)), duration: first < 0 ? 0 : (last - first + 1) / fps };
  };
  let shift = offset ?? 0;
  if (offset === undefined) {
    let best = Infinity;
    const n = Math.min(10, R.length);
    for (let k = -maxShift; k <= maxShift; k++) {
      let sum = 0, count = 0;
      for (let i = 0; i < n; i++) if (i + k >= 0 && i + k < C.length) { sum += m(R[i], C[i + k]); count++; }
      if (count >= Math.min(5, n) && sum / count < best) { best = sum / count; shift = k; }
    }
  }
  ensure(out);
  const frames = [], red = [];
  for (let i = 0; i < R.length; i++) {
    const j = i + shift;
    if (j < 0 || j >= C.length) { frames.push({ i, t: +(i / fps).toFixed(3), clone: null, mismatch: null }); red.push(Buffer.alloc(R[i].length)); continue; }
    const value = m(R[i], C[j]);
    frames.push({ i, t: +(i / fps).toFixed(3), clone: j, mismatch: +value.toFixed(4), ...(blurR ? { sharp: +m(ref.frames[i], clone.frames[j]).toFixed(4) } : {}) });
    if (diffs) {
      // The reference faded to grey, with every differing pixel in red.
      const A = R[i], B = C[j], d = Buffer.alloc(A.length), t = pixelThreshold * 765;
      for (let p = 0; p < A.length; p += 3) {
        const differs = Math.abs(A[p] - B[p]) + Math.abs(A[p + 1] - B[p + 1]) + Math.abs(A[p + 2] - B[p + 2]) > t;
        const g = 180 + ((A[p] + A[p + 1] + A[p + 2]) / 3) * 0.29;
        d[p] = differs ? 230 : g; d[p + 1] = differs ? 40 : g; d[p + 2] = differs ? 40 : g;
      }
      red.push(d);
    }
  }
  if (diffs) {
    const dir = ensure(join(out, "diff"));
    clean(dir);
    writeFrames({ frames: red, w: ref.w, h: ref.h }, dir);
  }
  const compared = frames.filter((f) => f.mismatch !== null);
  const mean = compared.reduce((s, f) => s + f.mismatch, 0) / Math.max(1, compared.length);
  const worst = [...compared].sort((a, b) => b.mismatch - a.mismatch).slice(0, 5);
  // The clone's curve from its aligned first frame, which (like the reference's) counts no change before it.
  const aligned = cloneAct.slice(Math.max(0, shift));
  if (aligned.length) aligned[0] = 0;
  const rw = window(refAct), cw = window(aligned);
  const timing = { start: +((cw.first - rw.first) / fps).toFixed(3), end: +((cw.last - rw.last) / fps).toFixed(3), peak: +((cw.peak - rw.peak) / fps).toFixed(3), duration: +(cw.duration - rw.duration).toFixed(3) };
  const timingError = Math.max(Math.abs(timing.start), Math.abs(timing.end), Math.abs(timing.duration));
  const pass = { pixels: mean <= threshold, timing: timingError <= motionThreshold };
  const report = { reference: refDir, clone: cloneDir, fps, size: [ref.w, ref.h], offset: shift, blur: blurR || undefined, threshold, motionThreshold, compared: compared.length, meanMismatch: +mean.toFixed(4), worst, motion: { reference: rw, clone: cw, timing }, pass, activity: { reference: refAct.map((v) => +v.toFixed(4)), clone: cloneAct.map((v) => +v.toFixed(4)) }, frames };
  writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));
  const bar = (v) => "█".repeat(Math.min(40, Math.round((v ?? 0) * 400))) || "·";
  const md = [
    `# Compare: ${basename(refDir)} against ${basename(cloneDir)}`,
    "",
    `- ${compared.length} of ${frames.length} frames compared at ${fps} fps, yours shifted ${shift} frame(s)`,
    `- mean mismatch${blurR ? ` (blurred ${blurR} px)` : ""}: **${pct(mean)}** (limit ${pct(threshold)}) → ${pass.pixels ? "PASS" : "FAIL"}`,
    `- motion, reference: frames ${rw.first}-${rw.last} (${rw.duration.toFixed(2)} s, peak #${rw.peak}); yours: ${cw.first}-${cw.last} (${cw.duration.toFixed(2)} s, peak #${cw.peak})`,
    `- timing error (yours minus reference): start ${timing.start} s, end ${timing.end} s, length ${timing.duration} s, peak ${timing.peak} s → ${pass.timing ? "PASS" : "FAIL"} (limit ${motionThreshold} s)`,
    `- worst frames: ${worst.map((w) => `#${w.i} (${pct(w.mismatch)} at ${w.t} s)`).join(", ")}`,
    "",
    "## How much changes from frame to frame",
    "",
    "```",
    "frame    t (s)   reference                                 yours",
    ...frames.map((f) => `${String(f.i).padStart(5)} ${f.t.toFixed(2).padStart(7)}   ${bar(refAct[f.i]).padEnd(40)}  ${f.clone === null ? "" : bar(cloneAct[f.clone])}`),
    "```",
    "",
    "Look at the sheets (`reference.mjs sheet --ref ... --clone ... --diff .../diff`): the numbers say where, your eye says what.",
  ].join("\n");
  writeFileSync(join(out, "report.md"), `${md}\n`);
  return { report, md };
}

// ── motion ────────────────────────────────────────────────────────────────
// Cuts, holds, and how often the picture really changes: drawn animation and stop motion hold each drawing for two or
// three frames, which shows as a change on every second or third frame however smooth the playback rate is.
export function motionOf(set) {
  // The share of pixels that change by more than 4 % from one frame to the next: film grain that changes every frame
  // stays under that, a line being drawn or a thing moving does not.
  const act = set.frames.map((f, i) => (i ? mismatch(set.frames[i - 1], f, 0.04) : 0));
  const fps = set.fps;
  const moving = act.slice(1).filter((v) => v > 0);
  const top = median(moving.filter((v) => v >= median(moving)));
  // A frame counts as changed when a few pixels change: a chalk line drawn on at writing speed touches only a handful
  // a frame. Grain never gets past the 4 % threshold above, so this can be low.
  const floor = Math.max(4 / (set.w * set.h), top * 0.02);
  const changed = act.map((v, i) => i > 0 && v > floor);
  const cuts = act.map((v, i) => ({ i, v })).filter(({ v, i }) => i > 0 && v > 0.45 && v > 5 * median(act.slice(Math.max(1, i - 6), i + 6)));
  // Holds of half a second or more: where the picture stops.
  const holds = [];
  let run = 0;
  changed.forEach((c, i) => {
    if (!c && i > 0) run++;
    else { if (run / fps >= 0.5) holds.push({ from: +((i - run) / fps).toFixed(2), to: +(i / fps).toFixed(2) }); run = 0; }
  });
  if (run / fps >= 0.5) holds.push({ from: +((changed.length - run) / fps).toFixed(2), to: +(changed.length / fps).toFixed(2) });
  // The drawing rate, read where things move: the share of frames that change, times the frame rate.
  const inMotion = [];
  for (let i = 1; i < changed.length; i++) {
    const near = changed.slice(Math.max(1, i - 3), i + 4);
    if (near.some(Boolean) && !cuts.some((c) => Math.abs(c.i - i) <= 1)) inMotion.push(changed[i]);
  }
  const rate = inMotion.length ? (inMotion.filter(Boolean).length / inMotion.length) * fps : 0;
  // Each drawing held for `on` frames: 1 is smooth, 2 at 24 fps is drawn on twos (12 drawings a second).
  const on = rate > 0 ? Math.max(1, Math.round(fps / rate - 0.25)) : 1;
  const label = on === 1 ? "on ones (every frame a new picture)" : `each drawing held ${on} frames (${["", "", "on twos", "on threes"][on] ?? `on ${on}s`})`;
  return { fps, frames: act.length, floor: +floor.toFixed(4), rate: +rate.toFixed(1), on, label, stepped: on > 1 ? Math.round(fps / on) : 0, cuts: cuts.map((c) => +(c.i / fps).toFixed(2)), holds, activity: act.map((v) => +v.toFixed(4)) };
}

// ── what a look is made of ────────────────────────────────────────────────
function lookOf(set, k = 6) {
  const colours = palette(set, k);
  const each = looks(set);
  const avg = (key) => each.reduce((s, x) => s + x[key], 0) / Math.max(1, each.length);
  const bgs = each.map((x) => x.background);
  const background = bgs.sort((a, b) => bgs.filter((v) => v === a).length - bgs.filter((v) => v === b).length).at(-1);
  const bgLab = each.find((x) => x.background === background)?.backgroundLab ?? colours[0].lab;
  // The ink: the palette colour furthest in lightness from the background that covers at least 2 % of the frame.
  // The ink: the colour of the 0.5 % of pixels furthest in lightness from the background (lines are thin, so a palette
  // of the whole frame often misses them).
  const sample = [];
  for (const f of set.frames) for (let p = 0; p < f.length; p += 3 * 7) sample.push([f[p], f[p + 1], f[p + 2], lab(f[p], f[p + 1], f[p + 2])[0]]);
  sample.sort((a, b) => Math.abs(b[3] - bgLab[0]) - Math.abs(a[3] - bgLab[0]));
  const far = sample.slice(0, Math.max(1, Math.round(sample.length * 0.005)));
  const ink = `#${[0, 1, 2].map((c) => Math.round(median(far.map((px) => px[c]))).toString(16).padStart(2, "0")).join("")}`;
  const accent = [...colours].filter((c) => deltaE(c.lab, bgLab) > 12 && deltaE(c.lab, hexToLab(ink)) > 12).sort((a, b) => Math.hypot(b.lab[1], b.lab[2]) - Math.hypot(a.lab[1], a.lab[2]))[0];
  return { palette: colours, background, backgroundLab: bgLab, ink, accent: accent?.hex, lightness: +avg("lightness").toFixed(1), chroma: +avg("chroma").toFixed(1), edges: +avg("edges").toFixed(4), grain: +avg("grain").toFixed(2) };
}
// A first guess at the template's engine settings. A guess: you read the sheet and correct it.
function draft(look, motion, key) {
  // Read from the background: its lightness, how coloured it is and its hue. Neon, a 3D or pixel layer ("none") and
  // the house's graphite are told apart by eye, not by these numbers.
  const [L, a, b] = look.backgroundLab, C = Math.hypot(a, b), hue = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  const dark = L < 35;
  const stage = dark
    ? C > 15 && hue > 200 && hue < 300 ? "blueprint" : C > 8 && hue > 100 && hue < 200 ? "board" : "graphite"
    : C > 14 ? "flat" : look.grain >= 0.15 ? "paper" : L > 94 && C < 4 ? "whiteboard" : "flat";
  return {
    key, name: key.replace(/(^|-)(\w)/g, (_, s, c) => `${s ? " " : ""}${c.toUpperCase()}`), medium: "2D", mode: "", status: "concept", version: 1,
    summary: "", worksFor: "", example: "",
    defaults: { format: "1920x1080", narration: "voice", accent: look.accent ?? look.ink },
    stage, paper: look.background, ink: look.ink, palette: look.palette.map((c) => c.hex),
    stepped: motion?.stepped ?? 0,
    finish: { bloom: dark ? 0.2 : 0, grain: Math.min(8, Math.round(look.grain * 2)) },
    type: { display: "", body: "", mono: "JetBrains Mono Variable" }, captions: "", samples: [], golden: [],
  };
}

// ── commands ──────────────────────────────────────────────────────────────
async function main() {
  if (!command || has("help") || command === "help") return console.log(HELP);
  if (command === "probe") return console.log(JSON.stringify(probeVideo(resolve(positional[0])), null, 2));
  if (command === "frames") {
    if (!positional[0] || !flag("out")) throw new Error("frames needs a video and --out DIR");
    return console.log(JSON.stringify(extract(resolve(positional[0]), resolve(flag("out")), { fps: num("fps", 10), start: time(flag("start")) ?? 0, end: time(flag("end")), crop: rect(flag("crop")), width: num("width", 0) || undefined }), null, 2));
  }
  if (command === "sheet") {
    if (flag("ref") && flag("clone")) {
      const written = await compareSheet(resolve(flag("ref")), resolve(flag("clone")), resolve(flag("out") ?? "compare-sheets"), { diffDir: flag("diff") && resolve(flag("diff")), offset: num("offset", 0), every: num("every", 1), per: num("per", 8), width: num("width", 420) });
      return console.log(written.join("\n"));
    }
    const dir = resolve(positional[0] ?? ".");
    const written = await filmstrip(dir, resolve(flag("out") ?? join(dir, "..", "sheets")), { every: num("every", 1), cols: num("cols", 6), per: num("per", 24), width: num("width", 240) });
    return console.log(written.join("\n"));
  }
  if (command === "compare") {
    if (!flag("ref") || !flag("clone") || !flag("out")) throw new Error("compare needs --ref DIR --clone DIR --out DIR");
    const { md, report } = compare(resolve(flag("ref")), resolve(flag("clone")), resolve(flag("out")), { offset: flag("offset") === undefined ? undefined : num("offset"), maxShift: num("max-shift", 15), blurR: num("blur", 0), threshold: num("threshold", 0.05), motionThreshold: num("motion-threshold", 0.08), pixelThreshold: num("pixel-threshold", 0.1), diffs: !has("no-diffs") });
    console.log(md);
    process.exitCode = report.pass.pixels && report.pass.timing ? 0 : 1;
    return;
  }
  if (command === "palette") {
    const look = lookOf(load(positional, { fps: num("fps", 1), width: 240, start: time(flag("start")), end: time(flag("end")) }), num("k", 6));
    for (const c of look.palette) console.log(`${c.hex}  ${pct(c.share).padStart(6)}  L ${c.lab[0].toFixed(0)}`);
    console.log(`background ${look.background}, ink ${look.ink}, accent ${look.accent ?? "none"}; lightness ${look.lightness}, colourfulness ${look.chroma}, edges ${pct(look.edges)}, grain ${look.grain}`);
    return;
  }
  if (command === "motion") {
    const input = resolve(positional[0]);
    const set = isVideo(input) ? decodeVideo(input, { fps: num("fps", Math.min(60, probeVideo(input).fps || 24)), width: 384, start: time(flag("start")), end: time(flag("end")) }) : { ...decode(listFrames(input), 384), fps: num("fps", fpsOf(input)) };
    const m = motionOf(set);
    console.log(`${m.frames} frames at ${m.fps} fps: the picture changes ${m.rate} times a second, ${m.label}${m.stepped ? ` (stepped ${m.stepped})` : ""}`);
    console.log(`cuts at ${m.cuts.join(", ") || "none"} s; holds of half a second or more: ${m.holds.map((h) => `${h.from}-${h.to}`).join(", ") || "none"}`);
    return;
  }
  if (command === "study") {
    const input = resolve(positional[0] ?? "");
    if (!positional[0] || !existsSync(input)) throw new Error("study needs a video, an image or a folder of frames");
    const out = ensure(resolve(flag("out") ?? "reference"));
    const key = flag("key") ?? basename(resolve(out, "..")).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const start = time(flag("start")) ?? 0;
    let end = time(flag("end"));
    let look, motion, sheets = [];
    if (isVideo(input)) {
      const info = probeVideo(input);
      end ??= info.duration;
      // The look from a still every half second over the whole stretch; the timing from six seconds at full rate.
      const still = extract(input, join(out, "frames"), { fps: num("fps", 2), start, end, width: 960 });
      look = lookOf(decode(listFrames(join(out, "frames")), 320));
      const rate = Math.min(60, Math.round(info.fps || 24));
      motion = motionOf(decodeVideo(input, { fps: rate, width: 384, start, end: Math.min(end, start + 6) }));
      sheets = await filmstrip(join(out, "frames"), out, { every: Math.max(1, Math.ceil(still.count / 24)), title: `${basename(input)} · ${start}-${end.toFixed(1)} s`, swatches: look.palette });
    } else {
      const files = statSync(input).isDirectory() ? listFrames(input) : [input];
      look = lookOf(decode(files, 320));
      motion = files.length > 8 ? motionOf({ ...decode(files, 192), fps: num("fps", fpsOf(statSync(input).isDirectory() ? input : resolve(input, ".."))) }) : null;
      const dir = statSync(input).isDirectory() ? input : resolve(input, "..");
      sheets = await filmstrip(dir, out, { every: Math.max(1, Math.ceil(files.length / 24)), title: basename(input), swatches: look.palette });
    }
    const spec = draft(look, motion, key);
    writeFileSync(join(out, "study.json"), JSON.stringify({ source: input, start, end, look, motion: motion && { ...motion, activity: undefined }, template: spec }, null, 2));
    const md = [
      `# Study: ${basename(input)}`,
      "",
      `Source: ${input}${end !== undefined ? `, ${start} to ${end.toFixed(2)} s` : ""}.`,
      `Sheets: ${sheets.map((s) => basename(s)).join(", ")} (look at them before you read the numbers).`,
      "",
      "## The look in numbers",
      "",
      "| Colour | Share | Lightness |",
      "| --- | --- | --- |",
      ...look.palette.map((c) => `| ${c.hex} | ${pct(c.share)} | ${c.lab[0].toFixed(0)} |`),
      "",
      `- **Background**: ${look.background} (lightness ${look.backgroundLab[0].toFixed(0)})`,
      `- **Ink**: ${look.ink}; **accent**: ${look.accent ?? "none found"}`,
      `- **Lightness** ${look.lightness}, **colourfulness** ${look.chroma} (0 is grey, 30 is strong)`,
      `- **Edges**: ${pct(look.edges)} of the frame is line or contour (soft clay and watercolour about 3-4 %, line art and type 4-13 %, halftone print 30 % or more)`,
      `- **Grain** in the flat parts: ${look.grain} (under 0.1 is clean vector or pixel art, 0.2-0.3 is film grain or paper, more is chalk or heavy texture)`,
      motion ? `- **Timing**: the picture changes ${motion.rate} times a second at ${motion.fps} fps, ${motion.label}; cuts at ${motion.cuts.join(", ") || "none"} s; holds: ${motion.holds.map((h) => `${h.from}-${h.to} s`).join(", ") || "none"}` : "- **Timing**: stills only, nothing to time",
      "",
      "## A first draft of template.json",
      "",
      "A guess from the numbers. Correct it by eye against the sheet, then write the template's lines (template.md).",
      "",
      "```json",
      JSON.stringify(spec, null, 2),
      "```",
    ].join("\n");
    writeFileSync(join(out, "study.md"), `${md}\n`);
    console.log(md);
    console.log(`\nwritten: ${join(out, "study.md")}, ${join(out, "study.json")}, ${sheets.length} sheet(s)`);
    return;
  }
  throw new Error(`no command "${command}"\n${HELP}`);
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) await main();
export { compare, extract, filmstrip, compareSheet, lookOf, shoot, uri };
