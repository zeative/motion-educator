// Builds the README's gallery from the finished example films: a grid of short previews that play by themselves,
// each linking to a compact copy of the whole film.
//
//   node docs/media/gallery.mjs                     every finished film
//   node docs/media/gallery.mjs --keep why-seasons  keep that film's media as committed (it is being remade)
//
// For every examples/NAME that has been rendered and mixed (out/NAME.mp4) it writes:
//   docs/media/previews/NAME.webp   a six-second loop, animated WebP: a few hundred kilobytes, plays in any browser
//   docs/media/films/NAME.mp4       the whole film at 720p and 30 fps, small enough to keep in the repository
//   docs/media/NAME.jpg             a still at the film's poster frame
// and rewrites the table between the gallery markers in README.md: landscape films two to a row, shorts three.
//
// A film can choose its preview with "preview": [start, seconds] and its still with "poster": seconds in its
// storyboard.json; otherwise both are taken around 40% of the way in.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const ffmpeg = (...args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);
const LANGUAGES = { id: "Bahasa Indonesia", en: "English" };
for (const folder of ["films", "previews"]) mkdirSync(join(here, folder), { recursive: true });
const kb = (file) => Math.round(statSync(file).size / 1024);
const argv = process.argv.slice(2);
const keep = new Set(argv.includes("--keep") ? argv[argv.indexOf("--keep") + 1].split(",") : []);
// Card sizes, chosen so a row fits GitHub's README column (about 880 px) with room to spare: landscape films two to
// a row, shorts three to a row. Previews are made at one and a half times these, so they stay sharp.
const CARD = { wide: 300, tall: 170 };

const films = [];
// Only films that are in the repository's last commit: a film still being made is not shown half done.
const committed = new Set(execFileSync("git", ["ls-tree", "--name-only", "HEAD", "examples/"], { cwd: repo }).toString().trim().split("\n").map((path) => path.replace("examples/", "")));
for (const name of readdirSync(join(repo, "examples")).sort()) {
  if (!committed.has(name)) continue;
  const film = join(repo, "examples", name);
  const movie = join(film, "out", `${name}.mp4`);
  if (keep.has(name)) {
    // Its committed storyboard and media stand as they are.
    const sb = JSON.parse(execFileSync("git", ["show", `HEAD:examples/${name}/storyboard.json`], { cwd: repo }).toString());
    const [W, H] = (sb.format ?? "1920x1080").split("x").map(Number);
    const narrated = sb.shots.some((shot) => shot.voice);
    films.push({ name, portrait: H > W, duration: sb.duration, title: sb.title, meta: [LANGUAGES[sb.language] ?? sb.language, `${Math.round(sb.duration)} s`, narrated ? `voice: ${sb.voice?.name ?? "narrated"}` : "captions"].join(" · ") });
    console.log(`${name}: kept as committed`);
    continue;
  }
  if (!existsSync(join(film, "storyboard.json")) || !existsSync(movie)) continue;
  const sb = JSON.parse(readFileSync(join(film, "storyboard.json"), "utf8"));
  const [W, H] = (sb.format ?? "1920x1080").split("x").map(Number);
  const portrait = H > W;
  const poster = sb.poster ?? sb.duration * 0.4;
  const [from, length] = sb.preview ?? [Math.max(0, Math.min(poster - 2.5, sb.duration - 6)), 6];

  // The preview: denoised first (the film's grain is what makes a loop heavy), 12 frames a second, at one and a
  // half times the size it is shown at so it stays sharp on a dense screen.
  const preview = join(here, "previews", `${name}.webp`);
  // Made already from this very film, at this size: kept, so a rebuild of the gallery costs seconds.
  const stamp = `${statSync(movie).mtimeMs}:${CARD.wide}:${CARD.tall}:${from}:${length}`;
  const stampFile = join(here, "previews", `.${name}.stamp`);
  const fresh = existsSync(preview) && existsSync(stampFile) && readFileSync(stampFile, "utf8") === stamp;
  if (!fresh) ffmpeg("-ss", String(from), "-t", String(length), "-i", movie, "-vf", `fps=12,hqdn3d=4:3:6:4,scale=${Math.round((portrait ? CARD.tall : CARD.wide) * 1.5 / 2) * 2}:-2:flags=lanczos`, "-c:v", "libwebp_anim", "-q:v", "80", "-compression_level", "6", "-loop", "0", "-an", preview);
  if (!fresh) ffmpeg("-ss", String(poster), "-i", movie, "-frames:v", "1", "-vf", `scale=${portrait ? 360 : 640}:-2`, "-q:v", "3", join(here, `${name}.jpg`));
  if (!fresh) ffmpeg("-i", movie, "-vf", `fps=30,scale=${portrait ? "720:1280" : "1280:720"}:flags=lanczos`, "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", join(here, "films", `${name}.mp4`));

  writeFileSync(stampFile, stamp);
  const narrated = sb.shots.some((shot) => shot.voice);
  films.push({
    name,
    portrait,
    duration: sb.duration,
    title: sb.title,
    meta: [LANGUAGES[sb.language] ?? sb.language, `${Math.round(sb.duration)} s`, narrated ? `voice: ${sb.voice?.name ?? "narrated"}` : "captions"].join(" · "),
  });
  console.log(`${name}: preview ${kb(preview)} KB, film ${kb(join(here, "films", `${name}.mp4`))} KB`);
}

// The reel at the top of the README: two seconds from each landscape film, cut together, in the same light format.
const wide = films.filter((f) => !f.portrait);
if (wide.length) {
  const inputs = [];
  const parts = [];
  wide.forEach((f, i) => {
    const sb = JSON.parse(readFileSync(join(repo, "examples", f.name, "storyboard.json"), "utf8"));
    const moments = sb.reel ?? [(sb.preview?.[0] ?? Math.max(0, (sb.poster ?? sb.duration * 0.4) - 2.5)) + 1.5];
    for (const at of moments) {
      inputs.push("-ss", String(at), "-t", "2.4", "-i", join(repo, "examples", f.name, "out", `${f.name}.mp4`));
      parts.push(`[${inputs.filter((x) => x === "-i").length - 1}:v]fps=12,hqdn3d=4:3:6:4,scale=960:-2:flags=lanczos,setsar=1[v${parts.length}]`);
    }
  });
  const chain = `${parts.join(";")};${parts.map((_, i) => `[v${i}]`).join("")}concat=n=${parts.length}:v=1:a=0`;
  ffmpeg(...inputs, "-filter_complex", chain, "-c:v", "libwebp_anim", "-q:v", "78", "-compression_level", "6", "-loop", "0", "-an", join(here, "demo.webp"));
  console.log(`reel: ${parts.length} moments, ${kb(join(here, "demo.webp"))} KB`);
}

// Landscape films first, then the shorts; longest first in each.
films.sort((a, b) => Number(a.portrait) - Number(b.portrait) || b.duration - a.duration);
// GitHub keeps a width attribute but drops style, so every picture has a fixed width that fits the README column
// (about 880 px): two landscape films a row, three shorts a row, each in its own table.
const cell = (f) =>
  `<td valign="top" align="center" width="${f.portrait ? CARD.tall : CARD.wide}"><a href="docs/media/films/${f.name}.mp4"><img src="docs/media/previews/${f.name}.webp" alt="${f.title}" width="${f.portrait ? CARD.tall : CARD.wide}" /></a><br /><sub><a href="examples/${f.name}"><b>${f.title}</b></a><br />${f.meta} · <a href="docs/media/films/${f.name}.mp4">▶ watch</a> · <a href="examples/${f.name}/storyboard">board</a></sub></td>`;
const rows = (list, perRow) => {
  const out = [];
  for (let i = 0; i < list.length; i += perRow) {
    const row = list.slice(i, i + perRow);
    out.push(`<tr>\n${row.map((f) => cell(f)).join("\n")}\n</tr>`);
  }
  return out;
};
const wideFilms = films.filter((f) => !f.portrait);
const shortFilms = films.filter((f) => f.portrait);
const table = [
  ...(wideFilms.length ? ["**Explainers** (16:9)", "", "<table>", ...rows(wideFilms, 2), "</table>", ""] : []),
  ...(shortFilms.length ? ["**Shorts** (9:16)", "", "<table>", ...rows(shortFilms, 3), "</table>", ""] : []),
  `<sub>Every preview is a few seconds of the finished film, looping. Click one for the whole film (720p, sound on). ${films.length} films, each made by an agent following this skill from the brief to the mix.</sub>`,
].join("\n");

const readme = join(repo, "README.md");
const text = readFileSync(readme, "utf8");
const start = "<!-- gallery:start -->";
const end = "<!-- gallery:end -->";
if (!text.includes(start) || !text.includes(end)) throw new Error("README.md has no gallery markers");
writeFileSync(readme, `${text.slice(0, text.indexOf(start) + start.length)}\n${table}\n${text.slice(text.indexOf(end))}`);
console.log(`README gallery: ${films.length} film(s)`);
