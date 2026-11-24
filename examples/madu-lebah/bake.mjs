// Bakes this film's still washes once and keeps them in out/bake/ (a cache, never committed).
//
//   node examples/madu-lebah/bake.mjs
//
// Every wash in film.js is drawn through an SVG filter (bleed, pooled rim, blotch, granulation). Run each frame, that
// filter cost about 7 s a frame; film.js instead draws every still wash through it once when the page loads and keeps
// the result as an image, and it first looks in out/bake/ for that image (keyed by a hash of what the wash is made
// of). Without the cache a page load bakes in the page (60-80 s, under the renderer's 120 s limit on a quiet machine);
// with it, about 3 s. Run this after any change to paint.js or to a wash in film.js, before rendering: it loads the
// film once headless, writes the washes baked in that load, and drops the ones no longer used.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join, extname, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FILM = dirname(fileURLToPath(import.meta.url));
const WS = resolve(FILM, "..", "..");
const { chromium } = createRequire(join(WS, "package.json"))("playwright");
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  const p = join(WS, decodeURIComponent(req.url.split("?")[0].split("#")[0]));
  if (!p.startsWith(WS) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const browser = await chromium.launch({ args: ["--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=vulkan", "--enable-features=Vulkan,VulkanFromANGLE,DefaultANGLEVulkan", "--disable-vulkan-surface"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on("pageerror", (e) => console.error("page error:", e.message));
const t0 = Date.now();
await page.goto(`http://127.0.0.1:${server.address().port}/${FILM.slice(WS.length + 1)}/index.html`);
const until = Date.now() + 600000;
while (!(await page.evaluate(() => Boolean(window.__ready)))) {
  if (Date.now() > until) throw new Error("the film did not get ready in 10 minutes");
  await new Promise((r) => setTimeout(r, 250));
}
const dir = join(FILM, "out", "bake");
mkdirSync(dir, { recursive: true });
const bakes = await page.evaluate(() => window.__bakes ?? {});
const list = await page.evaluate(() => window.__bakeList ?? []);
for (const [k, url] of Object.entries(bakes)) writeFileSync(join(dir, `${k}.png`), Buffer.from(url.split(",")[1], "base64"));
let dropped = 0;
for (const f of readdirSync(dir)) if (f.endsWith(".png") && !list.includes(f.slice(0, -4))) { unlinkSync(join(dir, f)); dropped++; }
writeFileSync(join(dir, "index.json"), JSON.stringify(list));
console.log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)} s; bake cache: ${Object.keys(bakes).length} new, ${dropped} dropped, ${list.length} in use -> ${dir}`);
await browser.close();
server.close();
