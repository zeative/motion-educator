// Builds the repository's social preview (Settings → General → Social preview): 1280×640, under 1 MB.
//
//   node docs/media/social.mjs        (needs the finished films below in examples/*/out/)
//
// It writes docs/media/social.jpg. GitHub does not read it from the repository: upload it by hand.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const work = mkdtempSync(join(tmpdir(), "motion-educator-social-"));
// The frames: a wide film behind, three shorts in front. [film, second]
const WIDE = ["langit-biru", 40];
const TALL = [["luka-sembuh", 22.9], ["hp-lemot", 24.6], ["hoaks-diulang", 33.9]];
const grab = ([name, time], height) => {
  const movie = join(repo, "examples", name, "out", `${name}.mp4`);
  if (!existsSync(movie)) throw new Error(`no ${movie}: render and mix ${name} first`);
  const file = join(work, `${name}.jpg`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(time), "-i", movie, "-frames:v", "1", "-vf", `scale=-2:${height}`, "-q:v", "2", file]);
  return pathToFileURL(file).href;
};
const fonts = (name) => pathToFileURL(join(repo, "node_modules", name)).href;
const html = `<!doctype html><meta charset="utf-8"><style>
  @font-face{font-family:"Sora";src:url("${fonts("@fontsource-variable/sora/files/sora-latin-wght-normal.woff2")}") format("woff2");font-weight:100 800}
  @font-face{font-family:"Inter";src:url("${fonts("@fontsource-variable/inter/files/inter-latin-wght-normal.woff2")}") format("woff2");font-weight:100 900}
  @font-face{font-family:"Mono";src:url("${fonts("@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2")}") format("woff2");font-weight:100 800}
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:1280px;height:640px;overflow:hidden;position:relative;background:#07080b;color:#f2f2f5;font-family:"Inter"}
  .glow{position:absolute;inset:0;background:radial-gradient(640px 420px at 80% 50%,rgb(77 163 255/.30),transparent 70%),radial-gradient(520px 360px at 0% 105%,rgb(255 178 26/.16),transparent 70%)}
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgb(255 255 255/.035) 1px,transparent 1px),linear-gradient(90deg,rgb(255 255 255/.035) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(700px 420px at 72% 50%,#000,transparent)}
  .copy{position:absolute;left:72px;top:0;bottom:0;width:580px;display:flex;flex-direction:column;justify-content:center}
  .kicker{align-self:flex-start;display:inline-flex;gap:10px;align-items:center;padding:8px 14px;border:1px solid rgb(255 255 255/.14);border-radius:99px;background:rgb(255 255 255/.05);color:#b9c7dc;font:500 14px/1 "Mono";letter-spacing:.14em;text-transform:uppercase}
  .kicker i{width:8px;height:8px;border-radius:50%;background:#4da3ff;box-shadow:0 0 12px #4da3ff}
  h1{margin-top:22px;font:650 84px/.98 "Sora";letter-spacing:-.045em;background:linear-gradient(180deg,#fff 30%,#aeb7c6);-webkit-background-clip:text;background-clip:text;color:transparent}
  h1 em{display:block;font-style:normal;background:linear-gradient(180deg,#d5e9ff 10%,#4da3ff 62%,#1f5fb0);-webkit-background-clip:text;background-clip:text;color:transparent}
  p{margin-top:22px;max-width:520px;color:#aab3c2;font:400 23px/1.4 "Inter"}
  p b{color:#e8edf4;font-weight:600}
  .chips{display:flex;flex-wrap:wrap;gap:9px;margin-top:26px}.chips span{padding:9px 13px;border-radius:11px;background:rgb(255 255 255/.06);box-shadow:inset 0 0 0 1px rgb(255 255 255/.1);color:#dfe5ee;font:500 14px/1 "Inter"}
  .card{position:absolute;border-radius:16px;overflow:hidden;box-shadow:0 34px 80px rgb(0 0 0/.65),0 0 0 1px rgb(255 255 255/.14)}
  .card img{display:block;width:100%;height:100%;object-fit:cover}
  .wide{left:648px;top:50px;width:560px;height:315px;transform:perspective(1600px) rotateY(-14deg) rotateZ(-2deg);filter:brightness(.8)}
  .tall{width:200px;height:356px;border-radius:22px}
  .t1{left:648px;top:230px;transform:rotate(-7deg)}
  .t2{left:836px;top:196px;transform:rotate(0deg);z-index:2;width:214px;height:380px}
  .t3{left:1034px;top:232px;transform:rotate(7deg)}
</style><div class="glow"></div><div class="grid"></div>
<div class="copy"><span class="kicker"><i></i>Agent skill · film engine</span><h1>Motion<em>Educator</em></h1>
<p>Educational films that look expensive, <b>made by an AI agent</b>, built in code, storyboard first.</p>
<div class="chips"><span>Explainers + shorts</span><span>One-take narration</span><span>Music + SFX</span><span>Open source</span></div></div>
<div class="card wide"><img src="${grab(WIDE, 720)}"></div>
${TALL.map((film, i) => `<div class="card tall t${i + 1}"><img src="${grab(film, 760)}"></div>`).join("")}`;

const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
const file = join(work, "social.html");
writeFileSync(file, html);
await page.goto(pathToFileURL(file).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => [...document.images].every((img) => img.complete));
const out = join(here, "social.jpg");
await page.screenshot({ path: out, type: "jpeg", quality: 90 });
await browser.close();
rmSync(work, { recursive: true, force: true });
console.log(`docs/media/social.jpg: 1280×640, ${Math.round(statSync(out).size / 1024)} KB (GitHub takes up to 1 MB)`);
