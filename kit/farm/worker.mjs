// A render worker: a small HTTP service that renders films sent to it, on a bigger machine than the one you write
// them on. kit/tools/farm.mjs is its client. It runs in the container kit/farm/compose.yml describes.
//
//   POST /jobs?key=NAME&film=films/NAME&args=[...]   body: a .tar.gz of the workspace (kit/, package.json, the film)
//   GET  /jobs/ID                                     state, the log's last lines
//   GET  /jobs/ID/picture                             the rendered picture (out/picture.mp4)
//   GET  /health
// Every request but /health carries the header x-farm-token: FARM_TOKEN. One job runs at a time; the rest queue.
// A film's out/ folder is kept between jobs (by key), so a later --only render reuses the segments already made.
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { availableParallelism } from "node:os";
import { join, normalize } from "node:path";

const TOKEN = process.env.FARM_TOKEN;
if (!TOKEN || TOKEN.length < 24) throw new Error("set FARM_TOKEN (24 characters or more)");
const ROOT = process.env.FARM_DIR ?? "/work";
const JOBS = process.env.FARM_JOBS ?? "4";
const PORT = Number(process.env.PORT ?? 8080);
mkdirSync(join(ROOT, "films"), { recursive: true });
mkdirSync(join(ROOT, "modules"), { recursive: true });

const jobs = new Map();
const queue = [];
let busy = false;
const safe = (s) => /^[a-z0-9][a-z0-9._-]{0,60}$/i.test(s ?? "");

function run(cmd, args, opts, job) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { ...opts, stdio: ["ignore", "pipe", "pipe"] });
    const take = (data) => {
      for (const line of data.toString().split("\n").filter(Boolean)) job.log.push(line.slice(0, 400));
      if (job.log.length > 400) job.log.splice(0, job.log.length - 400);
    };
    child.stdout.on("data", take);
    child.stderr.on("data", take);
    child.on("close", resolve);
  });
}

async function work(job) {
  job.state = "running";
  job.started = Date.now();
  const home = join(ROOT, "films", job.key);
  const ws = join(home, "ws");
  // The workspace is replaced by what was sent; the film's out/ (its segments) lives outside it and is linked in.
  rmSync(ws, { recursive: true, force: true });
  mkdirSync(ws, { recursive: true });
  const untar = spawnSync("tar", ["-xzf", job.archive, "-C", ws]);
  rmSync(job.archive, { force: true });
  if (untar.status !== 0) return fail(job, `could not unpack: ${untar.stderr}`);
  const filmDir = normalize(join(ws, job.film));
  if (!filmDir.startsWith(ws) || !existsSync(join(filmDir, "index.html"))) return fail(job, `no index.html in ${job.film}`);
  const out = join(home, "out");
  mkdirSync(out, { recursive: true });
  // node_modules, cached by package.json.
  const pkg = readFileSync(join(ws, "package.json"));
  const mods = join(ROOT, "modules", createHash("sha256").update(pkg).digest("hex").slice(0, 16));
  if (!existsSync(join(mods, "node_modules"))) {
    mkdirSync(mods, { recursive: true });
    writeFileSync(join(mods, "package.json"), pkg);
    job.log.push("installing the workspace's packages (once per package.json)");
    const code = await run("npm", ["install", "--omit=dev", "--no-audit", "--no-fund"], { cwd: mods }, job);
    if (code !== 0) return fail(job, "npm install failed");
  }
  symlinkSync(join(mods, "node_modules"), join(ws, "node_modules"));
  const args = [join(ws, "kit", "tools", "render.mjs"), filmDir, "--dir", out, "--jobs", JOBS, ...job.args];
  job.log.push(`render ${job.film} ${job.args.join(" ")} (jobs ${JOBS}, ${availableParallelism()} cpus seen)`);
  const code = await run("node", args, { cwd: ws, env: { ...process.env } }, job);
  if (code !== 0) return fail(job, `render exited with ${code}`);
  job.picture = join(out, "picture.mp4");
  job.state = "done";
  job.seconds = Math.round((Date.now() - job.started) / 1000);
}
function fail(job, why) {
  job.state = "failed";
  job.log.push(why);
}
async function next() {
  if (busy || !queue.length) return;
  busy = true;
  const job = queue.shift();
  try {
    await work(job);
  } catch (error) {
    fail(job, String(error));
  }
  busy = false;
  next();
}

createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const send = (code, body) => res.writeHead(code, { "content-type": "application/json" }).end(JSON.stringify(body));
  if (url.pathname === "/health") return send(200, { ok: true, cpus: availableParallelism(), jobs: JOBS, queued: queue.length, busy });
  if (req.headers["x-farm-token"] !== TOKEN) return send(401, { error: "bad token" });
  if (req.method === "POST" && url.pathname === "/jobs") {
    const key = url.searchParams.get("key");
    const film = url.searchParams.get("film");
    let args;
    try {
      args = JSON.parse(url.searchParams.get("args") ?? "[]");
    } catch {
      return send(400, { error: "args must be a JSON array" });
    }
    if (!safe(key) || !film || film.includes("..") || !Array.isArray(args) || args.some((a) => typeof a !== "string" || a.startsWith("--dir"))) return send(400, { error: "bad key, film or args" });
    const id = randomUUID();
    const archive = join(ROOT, `${id}.tar.gz`);
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      writeFileSync(archive, Buffer.concat(chunks));
      const job = { id, key, film, args, archive, state: "queued", log: [] };
      jobs.set(id, job);
      queue.push(job);
      send(202, { id, position: queue.length });
      next();
    });
    return;
  }
  const m = url.pathname.match(/^\/jobs\/([0-9a-f-]{36})(\/picture)?$/);
  const job = m && jobs.get(m[1]);
  if (!job) return send(404, { error: "no such job" });
  if (!m[2]) return send(200, { id: job.id, state: job.state, seconds: job.seconds ?? (job.started ? Math.round((Date.now() - job.started) / 1000) : 0), log: job.log.slice(-Number(url.searchParams.get("lines") ?? 30)) });
  if (job.state !== "done" || !existsSync(job.picture)) return send(409, { error: `job is ${job.state}` });
  res.writeHead(200, { "content-type": "video/mp4", "content-length": statSync(job.picture).size });
  createReadStream(job.picture).pipe(res);
}).listen(PORT, () => console.log(`render worker on :${PORT}, ${availableParallelism()} cpus, ${JOBS} render jobs`));
