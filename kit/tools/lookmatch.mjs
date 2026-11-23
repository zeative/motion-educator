// Does the film look like its template? Measures the film's frames and the template's golden stills
// (templates/KEY/golden/) the same way and compares them: the background, the ink, the palette, how light and how
// colourful the picture is, how much of it is line, its grain, and for a stepped template how often the picture
// really changes. Writes a side-by-side sheet to look at.
//
//   node kit/tools/lookmatch.mjs films/NAME                 the template the storyboard names
//   node kit/tools/lookmatch.mjs films/NAME --template clay against another template's stills
//   --strict exits 1 when a measure drifts (for CI); --frames 8 sets how many frames are sampled
//
// Reads out/picture.mp4 when it has been rendered, else the stills in out/stills/ (render.mjs --stills 1,4,7), which is
// how a look is checked before the full render. The numbers say where the film drifts; the sheet says how.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decode, decodeVideo, deltaE, hexToLab, listFrames, probeVideo } from "./analysis.mjs";
import { lookOf, motionOf, shoot, uri } from "./reference.mjs";

// How far a film may sit from its template before it is called a drift. The golden stills of a concept template are
// posters (a title and one picture), so the limits leave room for a different composition: they catch a wrong stage,
// a wrong palette, a missing texture, smooth motion where the template holds its drawings, and little else.
const LIMITS = { background: 10, ink: 18, coverage: 0.65, foreign: 0.25, lightness: 14, chroma: 10, edges: [0.45, 2.2], grain: 0.15, stepped: 2 };

const pct = (v) => `${Math.round(v * 100)}%`;
// The share of one palette (weighted by how much of the frame each colour covers) that the other has a near match
// for: 1 when every colour of `a` appears in `b`.
const covered = (a, b, limit = 15) => {
  const main = a.filter((c) => c.share >= 0.03);
  const total = main.reduce((s, c) => s + c.share, 0) || 1;
  return main.filter((c) => b.some((d) => deltaE(c.lab, d.lab) <= limit)).reduce((s, c) => s + c.share, 0) / total;
};

export async function lookmatch(filmDir, { template: key, frames: count = 8, sheet = true } = {}) {
  const film = resolve(filmDir);
  const plan = existsSync(join(film, "storyboard.json")) ? JSON.parse(readFileSync(join(film, "storyboard.json"), "utf8")) : {};
  key ??= plan.template;
  if (!key) return { key: null, lines: ["look: the storyboard names no template, so the film is in the house look and there are no golden stills to match"], drifts: 0 };
  let workspace = film;
  while (!existsSync(join(workspace, "templates", "catalog.json"))) {
    const up = dirname(workspace);
    if (up === workspace) throw new Error("no templates/ folder above the film: node kit/tools/new.mjs copies it into the workspace");
    workspace = up;
  }
  const folder = join(workspace, "templates", key);
  const template = JSON.parse(readFileSync(join(folder, "template.json"), "utf8"));
  const goldenFiles = listFrames(join(folder, "golden"));
  if (!goldenFiles.length) throw new Error(`templates/${key}/golden/ has no stills`);

  // The film's frames: evenly over the picture (skipping the first and last half second), or its stills.
  const picture = join(film, "out", "picture.mp4");
  let filmSet, source, filmFiles = [];
  if (existsSync(picture)) {
    const { duration } = probeVideo(picture);
    const start = Math.min(0.5, duration / 4), span = Math.max(0.1, duration - 2 * start);
    filmSet = decodeVideo(picture, { fps: count / span, width: 320, start, end: start + span });
    source = picture;
  } else {
    filmFiles = existsSync(join(film, "out", "stills")) ? listFrames(join(film, "out", "stills")) : [];
    if (!filmFiles.length) throw new Error(`nothing to measure: render the picture, or stills first (node kit/tools/render.mjs ${filmDir} --stills 1,4,7)`);
    filmSet = decode(filmFiles, 320);
    source = join(film, "out", "stills");
  }
  const golden = lookOf(decode(goldenFiles, 320));
  const mine = lookOf(filmSet);

  const results = [];
  const add = (name, ok, value, expected, hint) => results.push({ name, ok, value, expected, hint: ok ? undefined : hint });
  const bg = deltaE(mine.backgroundLab, golden.backgroundLab);
  add("background", bg <= LIMITS.background, `${mine.background} (ΔE ${bg.toFixed(1)})`, golden.background, `the stage is not the template's: the storyboard must say "template": "${key}" and film.js must pass it to createFilm({ storyboard }); a film-drawn background must use film.look.paper`);
  // A template that draws (its template.json has an "ink") is measured for its ink and how much of it is line; a
  // motion-graphics or 3D template has no ink, and its golden stills' darkest tone and edges say nothing about it.
  const drawn = Boolean(template.ink);
  const ink = deltaE(hexToLab(mine.ink), hexToLab(golden.ink));
  if (drawn) add("ink", ink <= LIMITS.ink, `${mine.ink} (ΔE ${ink.toFixed(1)})`, golden.ink, `lines and type are not in the template's ink: draw with film.look.ink (var(--ink) in CSS), not white or the house greys`);
  const cover = covered(golden.palette, mine.palette), foreign = 1 - covered(mine.palette, golden.palette);
  add("palette", cover >= LIMITS.coverage, `${pct(cover)} of the template's colours present`, `${pct(LIMITS.coverage)} or more`, `the film is missing the template's colours: use film.look.palette and the template's accent`);
  add("foreign colours", foreign <= LIMITS.foreign, `${pct(foreign)} of the picture`, `${pct(LIMITS.foreign)} or less`, `colours the template does not have cover much of the picture: the house look, a stock image or a 3D material has crept in`);
  const dl = mine.lightness - golden.lightness;
  add("lightness", Math.abs(dl) <= LIMITS.lightness, `${mine.lightness} (${dl > 0 ? "+" : ""}${dl.toFixed(1)})`, String(golden.lightness), dl < 0 ? "the picture is much darker than the template" : "the picture is much lighter than the template");
  const dc = mine.chroma - golden.chroma;
  add("colourfulness", Math.abs(dc) <= LIMITS.chroma, `${mine.chroma} (${dc > 0 ? "+" : ""}${dc.toFixed(1)})`, String(golden.chroma), dc < 0 ? "the picture is greyer than the template: its fills are its colours" : "the picture is more saturated than the template");
  const er = mine.edges / Math.max(1e-4, golden.edges);
  if (drawn) add("line", er >= LIMITS.edges[0] && er <= LIMITS.edges[1], `${pct(mine.edges)} of the frame (${er.toFixed(2)}x)`, pct(golden.edges), er < 1 ? "far less line than the template: a drawn template outlines its things (kit/engine/ink.js), and its type is its own" : "far more edge than the template: the frame is busy, or a texture is too strong");
  const dg = mine.grain - golden.grain;
  add("grain", Math.abs(dg) <= LIMITS.grain, `${mine.grain} (${dg > 0 ? "+" : ""}${dg.toFixed(2)})`, String(golden.grain), dg < 0 ? "flatter than the template: its paper, chalk or film grain is missing (the stage, finish.grain)" : "grainier than the template: lower finish.grain or the texture");

  // A stepped template holds each drawing: read four seconds of the picture at its full rate.
  let motion = null;
  if (existsSync(picture)) {
    const info = probeVideo(picture);
    const from = Math.max(0, Math.min(info.duration - 4, info.duration * 0.3));
    motion = motionOf(decodeVideo(picture, { fps: info.fps, width: 384, start: from, end: Math.min(info.duration, from + 4) }));
    if (template.stepped > 0) add("drawing rate", Math.abs(motion.rate - template.stepped) <= LIMITS.stepped, `${motion.rate} pictures a second`, `${template.stepped} (held)`, `the template holds each drawing for 1/${template.stepped} s: end film.js with film.finish() (the renderer seeks the held time through it), and draw each() jobs from the time they are given, never from a clock of their own`);
    else add("drawing rate", motion.rate >= Math.min(20, info.fps * 0.6), `${motion.rate} pictures a second`, "smooth", "the picture moves in steps but the template is smooth");
  }

  const drifts = results.filter((r) => !r.ok).length;
  const lines = [`look: ${basename(film)} against ${template.name} (templates/${key}/golden, ${goldenFiles.length} still(s)), from ${basename(source)}`];
  for (const r of results) lines.push(`  ${r.ok ? "ok   " : "DRIFT"}  ${r.name.padEnd(16)} ${r.value}  (template ${r.expected})${r.hint ? `\n          <- ${r.hint}` : ""}`);
  lines.push(drifts ? `  ${drifts} drift(s): fix them, render stills again and look at the sheet` : "  the look matches the template's numbers: now look at the sheet");

  const out = join(film, "out", "lookmatch");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "report.json"), JSON.stringify({ film, template: key, source, golden, measured: mine, motion: motion && { ...motion, activity: undefined }, results, drifts }, null, 2));
  if (sheet) {
    // The template's stills over the film's frames, each row with its palette.
    const frameFiles = filmFiles.length ? filmFiles : [];
    if (!frameFiles.length && existsSync(picture)) {
      const { writeFrames } = await import("./analysis.mjs");
      const dir = join(out, "frames");
      mkdirSync(dir, { recursive: true });
      const big = decodeVideo(picture, { fps: Math.min(6, count) / Math.max(0.1, probeVideo(picture).duration - 1), width: 480, start: 0.5 });
      writeFrames(big, dir);
      frameFiles.push(...listFrames(dir).slice(0, 6));
    }
    // Six frames spread over all of them, not the first six.
    const spread = (files) => (files.length <= 6 ? files : Array.from({ length: 6 }, (_, i) => files[Math.round((i * (files.length - 1)) / 5)]));
    const strip = (title, files, look) => `<p class="hdr">${title}</p><div class="sw">${look.palette.map((c) => `<div style="background:${c.hex};color:${c.lab[0] > 55 ? "#000" : "#fff"}">${c.hex} ${pct(c.share)}</div>`).join("")}</div><div class="grid" style="grid-template-columns:repeat(${Math.min(6, files.length)},max-content);margin-bottom:18px">${spread(files).map((f) => `<img src="${uri(f)}" style="width:250px">`).join("")}</div>`;
    const table = `<p class="hdr">measures</p><pre style="color:#ddd">${lines.slice(1).join("\n").replace(/</g, "&lt;")}</pre>`;
    await shoot([{ name: "lookmatch.png", html: strip(`${template.name} · golden`, goldenFiles, golden) + strip(`${basename(film)} · film`, frameFiles, mine) + table }], out);
    lines.push(`  sheet: ${join(out, "lookmatch.png")}`);
  }
  return { key, lines, drifts, results };
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  const args = process.argv.slice(2);
  const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const dir = args.find((a, i) => !a.startsWith("--") && !(i > 0 && ["--template", "--frames"].includes(args[i - 1])));
  if (!dir) {
    console.log("node kit/tools/lookmatch.mjs films/NAME [--template KEY] [--frames 8] [--strict]");
    process.exit(2);
  }
  const { lines, drifts } = await lookmatch(dir, { template: flag("--template"), frames: Number(flag("--frames") ?? 8) });
  console.log(lines.join("\n"));
  if (drifts && args.includes("--strict")) process.exitCode = 1;
}
