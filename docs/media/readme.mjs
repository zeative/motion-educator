// Builds the README's banner and its template grid from the templates' golden stills, so both always show what the
// templates really render: frames of each template's sample films, or of its engine proof until it has one.
//
//   node docs/media/readme.mjs
//
// It writes docs/media/hero.jpg (the banner), docs/media/templates/KEY.jpg (one card per template) and rewrites the
// table between the templates markers in README.md. Everything it reads is committed (templates/*/golden/), so it
// needs no rendering. Run it again whenever a template gets a sample film (its golden/ gains SAMPLE-1..3.jpg).
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const work = mkdtempSync(join(tmpdir(), "motion-educator-readme-"));
const url = (file) => pathToFileURL(file).href;
const font = (name) => url(join(repo, "node_modules", name));
const FACE = `
  @font-face{font-family:"Sora";src:url("${font("@fontsource-variable/sora/files/sora-latin-wght-normal.woff2")}") format("woff2");font-weight:100 800}
  @font-face{font-family:"Inter";src:url("${font("@fontsource-variable/inter/files/inter-latin-wght-normal.woff2")}") format("woff2");font-weight:100 900}
  @font-face{font-family:"Mono";src:url("${font("@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2")}") format("woff2");font-weight:100 800}
  *{box-sizing:border-box;margin:0;padding:0}`;

// The order the grid shows them in: the ones with sample films first, then by medium.
const catalog = JSON.parse(readFileSync(join(repo, "templates", "catalog.json"), "utf8"));
const keys = (catalog.templates ?? catalog).map((t) => t.key);
const templates = keys.map((key) => {
  const t = JSON.parse(readFileSync(join(repo, "templates", key, "template.json"), "utf8"));
  const golden = join(repo, "templates", key, "golden");
  const files = readdirSync(golden).filter((f) => f.endsWith(".jpg"));
  const samples = (t.samples ?? []).filter((s) => files.some((f) => f.startsWith(`${s}-`)));
  return { key, name: t.name, mode: t.mode, status: samples.length ? "ready" : "proof", samples, golden, files };
});
templates.sort((a, b) => (a.status === b.status ? keys.indexOf(a.key) - keys.indexOf(b.key) : a.status === "ready" ? -1 : 1));

const size = async (file) => {
  const { execFileSync } = await import("node:child_process");
  const [w, h] = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", file]).toString().trim().split(",").map(Number);
  return { w, h, portrait: h > w };
};
// The frames a card shows: one from each of up to three sample films (the middle of each film's three golden
// stills), or all three stills of the one sample film, or the engine proof's two frames. Portrait frames are shown
// side by side; a card whose first frame is landscape shows that frame alone.
async function framesOf(t) {
  let picks;
  if (t.samples.length >= 2) picks = t.samples.map((s) => `${s}-2.jpg`);
  else if (t.samples.length === 1) picks = [1, 2, 3].map((n) => `${t.samples[0]}-${n}.jpg`);
  else picks = ["proof-1.jpg", "proof-2.jpg"];
  const all = [];
  for (const f of picks.filter((f) => t.files.includes(f))) all.push({ file: join(t.golden, f), ...(await size(join(t.golden, f))) });
  // Prefer the portrait ones, so a card is a strip of phone frames, unless every frame is landscape.
  const tall = all.filter((f) => f.portrait);
  return tall.length >= 2 ? tall.slice(0, 3) : [all.find((f) => !f.portrait) ?? all[0]];
}

const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch();
async function shoot(html, width, height, out) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const file = join(work, `${out.replaceAll("/", "-")}.html`);
  writeFileSync(file, html);
  await page.goto(url(file));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((img) => img.complete));
  await page.screenshot({ path: join(here, `${out}.jpg`), type: "jpeg", quality: 86 });
  await page.close();
  console.log(`docs/media/${out}.jpg`);
}

// ── One card per template ──────────────────────────────────────────────────
mkdirSync(join(here, "templates"), { recursive: true });
for (const t of templates) {
  const frames = await framesOf(t);
  t.frames = frames;
  const strip = frames[0].portrait;
  await shoot(
    `<!doctype html><meta charset="utf-8"><style>${FACE}
    body{width:640px;height:360px;overflow:hidden;background:#0b0c10;position:relative}
    .bg{position:absolute;inset:-40px;background:url("${url(frames[0].file)}") center/cover;filter:blur(28px) brightness(.55) saturate(1.2)}
    .row{position:absolute;inset:0;display:flex;gap:12px;align-items:center;justify-content:center}
    .row img{height:${strip ? 324 : 360}px;border-radius:${strip ? 10 : 0}px;box-shadow:0 14px 30px rgb(0 0 0/.45),0 0 0 1px rgb(255 255 255/.12)}
    .wide{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    </style>${strip ? `<div class="bg"></div><div class="row">${frames.map((f) => `<img src="${url(f.file)}">`).join("")}</div>` : `<img class="wide" src="${url(frames[0].file)}">`}`,
    640,
    360,
    `templates/${t.key}`,
  );
}

// ── The banner ─────────────────────────────────────────────────────────────
// A wall of portrait frames from every template, tilted in perspective behind the title.
const tall = [];
for (const t of templates) for (const f of t.frames) if (f.portrait) tall.push(f.file);
// Interleave templates so neighbours differ: take one frame from each template in turn.
const byTemplate = templates.map((t) => t.frames.filter((f) => f.portrait).map((f) => f.file)).filter((list) => list.length);
const wall = [];
for (let round = 0; wall.length < 27 && round < 4; round++) for (const list of byTemplate) if (list[round] && wall.length < 27) wall.push(list[round]);
while (wall.length < 27) wall.push(tall[wall.length % tall.length]);
const rows = [0, 1, 2].map((r) => wall.filter((_, i) => i % 3 === r));
const ready = templates.filter((t) => t.status === "ready").length;
await shoot(
  `<!doctype html><meta charset="utf-8"><style>${FACE}
  body{width:1600px;height:640px;overflow:hidden;background:#07080b;color:#f2f2f5;font-family:"Inter";position:relative}
  .wall{position:absolute;left:560px;top:-150px;width:1500px;transform:perspective(1600px) rotateY(-20deg) rotateX(10deg) rotateZ(-8deg);transform-origin:left center}
  .r{display:flex;gap:18px;margin-bottom:18px}.r:nth-child(2){margin-left:-90px}.r:nth-child(3){margin-left:-40px}
  .r img{height:300px;border-radius:14px;box-shadow:0 22px 50px rgb(0 0 0/.55),0 0 0 1px rgb(255 255 255/.14)}
  .fade{position:absolute;inset:0;background:linear-gradient(90deg,#07080b 0%,#07080b 34%,rgb(7 8 11/.82) 46%,rgb(7 8 11/.15) 70%,rgb(7 8 11/.45) 100%),linear-gradient(0deg,rgb(7 8 11/.7),transparent 28%)}
  .copy{position:absolute;left:84px;top:150px;width:760px}
  .kicker{display:inline-flex;gap:10px;align-items:center;padding:9px 16px;border:1px solid rgb(255 255 255/.14);border-radius:99px;background:rgb(255 255 255/.05);color:#b9c7dc;font:500 15px/1 "Mono";letter-spacing:.14em;text-transform:uppercase}
  .kicker i{width:8px;height:8px;border-radius:50%;background:#ffb02e;box-shadow:0 0 12px #ffb02e}
  h1{margin-top:26px;font:650 92px/.98 "Sora";letter-spacing:-.045em;background:linear-gradient(180deg,#fff 30%,#aeb7c6);-webkit-background-clip:text;background-clip:text;color:transparent}
  p{margin-top:24px;max-width:560px;color:#aab3c2;font:400 24px/1.42 "Inter"}
  .chips{display:flex;gap:9px;margin-top:30px}.chips span{padding:10px 14px;border-radius:12px;background:rgb(255 255 255/.06);box-shadow:inset 0 0 0 1px rgb(255 255 255/.1);color:#dfe5ee;font:500 15px/1 "Inter";white-space:nowrap}
  </style>
  <div class="wall">${rows.map((row) => `<div class="r">${row.map((f) => `<img src="${url(f)}">`).join("")}</div>`).join("")}</div>
  <div class="fade"></div>
  <div class="copy"><span class="kicker"><i></i>Agent skill · film engine</span><h1>Motion Educator</h1><p>Educational films that look expensive, built in code, storyboard first.</p>
  <div class="chips"><span>${templates.length} visual templates</span><span>1080p60</span><span>Portrait + landscape</span><span>Voice · music · SFX</span></div></div>`,
  1600,
  640,
  "hero",
);
await browser.close();

// ── The table in README.md ─────────────────────────────────────────────────
const cell = (t) => {
  const status = t.status === "ready" ? `${t.samples.length} sample film${t.samples.length > 1 ? "s" : ""}` : "engine proof";
  return `<td align="center" valign="top" width="25%"><a href="templates/${t.key}"><img src="docs/media/templates/${t.key}.jpg" alt="${t.name}: frames it rendered" width="100%" /></a><br /><b>${t.name}</b><br /><sub>${t.mode} · ${status}</sub></td>`;
};
const rowsHtml = [];
for (let i = 0; i < templates.length; i += 4) rowsHtml.push(`<tr>\n${templates.slice(i, i + 4).map(cell).join("\n")}\n</tr>`);
const table = `<table>\n${rowsHtml.join("\n")}\n</table>\n\n<sub>Every card is real output: frames of the template's sample films, or of its engine proof (a few seconds made with the kit and matched to the template on every <code>lookmatch.mjs</code> measure) until its first sample film is done. ${ready} of ${templates.length} have sample films.</sub>`;
const readme = join(repo, "README.md");
const text = readFileSync(readme, "utf8");
const start = "<!-- templates:start -->", end = "<!-- templates:end -->";
if (!text.includes(start)) throw new Error("README.md has no templates markers");
writeFileSync(readme, `${text.slice(0, text.indexOf(start) + start.length)}\n${table}\n${text.slice(text.indexOf(end))}`);
console.log(`README.md: ${templates.length} templates, ${ready} with sample films`);
rmSync(work, { recursive: true, force: true });
