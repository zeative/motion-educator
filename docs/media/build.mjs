// Builds the README's pictures from a finished film: the hero banner and the storyboard-beside-film strip.
//
//   node docs/media/build.mjs                 (needs examples/langit-biru/out/langit-biru.mp4: render and mix it first)
//
// Everything it writes is in docs/media/ and is committed, so the README works without rendering anything.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sketch } from "../../kit/tools/sketch.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const film = join(repo, "examples", "langit-biru");
const movie = join(film, "out", "langit-biru.mp4");
if (!existsSync(movie)) throw new Error(`no ${movie}: render and mix the example first`);
const sb = JSON.parse(readFileSync(join(film, "storyboard.json"), "utf8"));
const work = mkdtempSync(join(tmpdir(), "motion-educator-media-"));
const ffmpeg = (...args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);
const grab = (time, name, width = 1280) => {
  const file = join(work, `${name}.jpg`);
  ffmpeg("-ss", String(time), "-i", movie, "-frames:v", "1", "-vf", `scale=${width}:-2`, "-q:v", "2", file);
  return pathToFileURL(file).href;
};
const fonts = (name) => pathToFileURL(join(repo, "node_modules", name)).href;
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch();
async function shoot(html, width, height, out) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const file = join(work, `${out}.html`);
  writeFileSync(file, html);
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((img) => img.complete));
  await page.screenshot({ path: join(here, `${out}.jpg`), type: "jpeg", quality: 90, fullPage: true });
  await page.close();
  console.log(`docs/media/${out}.jpg`);
}
const FACE = `
  @font-face{font-family:"Sora";src:url("${fonts("@fontsource-variable/sora/files/sora-latin-wght-normal.woff2")}") format("woff2");font-weight:100 800}
  @font-face{font-family:"Inter";src:url("${fonts("@fontsource-variable/inter/files/inter-latin-wght-normal.woff2")}") format("woff2");font-weight:100 900}
  @font-face{font-family:"Mono";src:url("${fonts("@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2")}") format("woff2");font-weight:100 800}
  @font-face{font-family:"Hand";src:url("${fonts("@fontsource/patrick-hand/files/patrick-hand-latin-400-normal.woff2")}") format("woff2")}
  *{box-sizing:border-box;margin:0;padding:0}`;

// ── The hero ───────────────────────────────────────────────────────────────
const shot = (id) => sb.shots.find((s) => s.id === id);
const mid = (id, at = 0.6) => shot(id).start + (shot(id).end - shot(id).start) * at;
const board = sketch(shot("s15").frames.at(-1), "hero", { lang: sb.language });
await shoot(
  `<!doctype html><meta charset="utf-8"><style>${FACE}
  body{width:1600px;height:640px;overflow:hidden;background:#07080b;color:#f2f2f5;font-family:"Inter"}
  .glow{position:absolute;inset:0;background:radial-gradient(900px 520px at 78% 46%,rgb(77 163 255/.34),transparent 70%),radial-gradient(700px 420px at 8% 110%,rgb(255 178 26/.16),transparent 70%)}
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgb(255 255 255/.035) 1px,transparent 1px),linear-gradient(90deg,rgb(255 255 255/.035) 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(900px 500px at 70% 50%,#000,transparent)}
  .copy{position:absolute;left:84px;top:150px;width:640px}
  .kicker{display:inline-flex;gap:10px;align-items:center;padding:9px 16px;border:1px solid rgb(255 255 255/.14);border-radius:99px;background:rgb(255 255 255/.05);color:#b9c7dc;font:500 15px/1 "Mono";letter-spacing:.14em;text-transform:uppercase}
  .kicker i{width:8px;height:8px;border-radius:50%;background:#4da3ff;box-shadow:0 0 12px #4da3ff}
  h1{margin-top:26px;font:650 92px/.98 "Sora";letter-spacing:-.045em;background:linear-gradient(180deg,#fff 30%,#aeb7c6);-webkit-background-clip:text;background-clip:text;color:transparent}
  h1 em{font-style:normal;background:linear-gradient(180deg,#d5e9ff 10%,#4da3ff 62%,#1f5fb0);-webkit-background-clip:text;background-clip:text;color:transparent}
  p{margin-top:24px;max-width:560px;color:#aab3c2;font:400 24px/1.42 "Inter"}
  .chips{display:flex;gap:10px;margin-top:30px}.chips span{padding:10px 16px;border-radius:12px;background:rgb(255 255 255/.06);box-shadow:inset 0 0 0 1px rgb(255 255 255/.1);color:#dfe5ee;font:500 16px/1 "Inter"}
  .stack{position:absolute;right:-30px;top:0;width:900px;height:640px;perspective:1800px}
  .card{position:absolute;border-radius:18px;overflow:hidden;box-shadow:0 40px 90px rgb(0 0 0/.6),0 0 0 1px rgb(255 255 255/.14);transform-style:preserve-3d}
  .card img,.card svg{display:block;width:100%}
  .c1{left:150px;top:150px;width:640px;transform:rotateY(-16deg) rotateX(4deg) rotateZ(1.5deg);z-index:3}
  .c2{left:20px;top:56px;width:440px;transform:rotateY(-16deg) rotateX(4deg) rotateZ(-3deg);z-index:2;filter:brightness(.92)}
  .c3{left:470px;top:400px;width:400px;transform:rotateY(-16deg) rotateX(4deg) rotateZ(3deg);z-index:4}
  .c0{left:400px;top:28px;width:380px;transform:rotateY(-16deg) rotateX(4deg) rotateZ(5deg);z-index:1;filter:brightness(.9)}
  .sketch .hand{font-family:"Hand"}
  </style><div class="glow"></div><div class="grid"></div>
  <div class="copy"><span class="kicker"><i></i>Agent skill · film engine</span><h1>Motion <em>Educator</em></h1><p>Educational films that look expensive, built in code, storyboard first.</p>
  <div class="chips"><span>1080p60</span><span>Landscape + portrait</span><span>Narration</span><span>Music + SFX</span></div></div>
  <div class="stack"><div class="card c0">${board}</div><div class="card c2"><img src="${grab(mid("s02", 0.7), "h2")}"></div><div class="card c1"><img src="${grab(mid("s15", 0.75), "h1")}"></div><div class="card c3"><img src="${grab(mid("s05", 0.8), "h3")}"></div></div>`,
  1600,
  640,
  "hero",
);

// ── Storyboard beside film ─────────────────────────────────────────────────
const pairs = [["s02", 1], ["s05", 2], ["s11", 2], ["s14", 2], ["s15", 2]].map(([id, k]) => {
  const s = shot(id);
  const frame = s.frames[Math.min(k, s.frames.length - 1)];
  const time = Math.min(s.end - 0.35, s.start + (s.end - s.start) * frame.at);
  return `<figure><div>${sketch(frame, `p-${id}`, { lang: sb.language })}</div><img src="${grab(time, `p-${id}`, 640)}"><figcaption><b>${id}</b>${s.caption ? s.caption.replaceAll("*", "") : ""}</figcaption></figure>`;
});
await shoot(
  `<!doctype html><meta charset="utf-8"><style>${FACE}
  body{width:1600px;padding:28px;background:#0b0c10;font-family:"Inter"}.row{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}
  figure{min-width:0}figure div,figure img{display:block;width:100%;border-radius:12px;overflow:hidden}figure img{margin-top:12px;box-shadow:0 0 0 1px rgb(255 255 255/.12)}
  figcaption{margin-top:10px;color:#aab3c2;font:400 15px/1.35 "Inter"}figcaption b{margin-right:8px;color:#4da3ff;font:600 13px/1 "Mono"}.sketch .hand{font-family:"Hand"}svg{display:block}
  </style><div class="row">${pairs.join("")}</div>`,
  1600,
  100,
  "board-to-film",
);
await browser.close();

ffmpeg("-ss", String(mid("s15", 0.8)), "-i", movie, "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "3", join(here, "langit-biru.jpg"));
console.log("docs/media/langit-biru.jpg");
// The animated reel at the top of the README is made by gallery.mjs, from every finished landscape film.
rmSync(work, { recursive: true, force: true });
